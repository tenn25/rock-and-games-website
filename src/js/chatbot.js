/**
 * Rule Chatbot Widget
 * ルール質問AIチャットボット（LINE風フローティングチャット）
 */

(() => {
'use strict';

// ============================================
// Feature Flag
// ============================================
const CHATBOT_ENABLED = true;

// ============================================
// Constants
// ============================================
const CHATBOT_CONFIG = {
    API: {
        BASE_URL: 'https://boardgame-rule-chatbot.tenn25.workers.dev',
        TURNSTILE_SITEKEY: '0x4AAAAAADzriBzqj7ySrZNG',
        TURNSTILE_SCRIPT: 'https://challenges.cloudflare.com/turnstile/v0/api.js'
    },
    // サムネイル付きカードで選ぶ。id=カード識別(一意) / slug=バックエンド問い合わせ先 / short=表示名 / img=箱絵
    // ※ ハイエナは通常/拡張でカードを分けるが、バックエンドは 'haiena' 1つ（通常＋拡張の統合データ）のため
    //    両方とも slug:'haiena' に問い合わせる。拡張専用スラグができたら 'haiena_ex' 等に差し替える。
    GAMES: [
        { id: 'haiena',      slug: 'haiena',      short: 'ハイエナ勇者はサボリたい',        name: 'ハイエナ勇者はサボリたい',        img: 'images/haiena_top.png' },
        { id: 'haiena_ex',   slug: 'haiena',      short: 'ハイエナ勇者はサボリたい(拡張版)', name: 'ハイエナ勇者はサボリたい（拡張版）', img: 'images/haiena2_top.jpg' },
        { id: 'navirabi',    slug: 'navirabi',    short: 'ナビラビ',                       name: 'ナビラビ',                       img: 'images/navirabi_top.png' },
        { id: 'navirabi_ex', slug: 'navirabi_ex', short: 'ナビラビ(拡張キット)',            name: 'ナビラビ（拡張キット）',          img: 'images/navirabi2_top.png' },
        { id: 'kamisama',    slug: 'kamisama',    short: 'カミサマーケット',                name: 'カミサマーケット',                img: 'images/kamima_top.png' },
        { id: 'goat',        slug: 'goat',        short: 'GOAT',                          name: 'GOAT',                          img: 'images/goat_top.png' }
    ],
    AVATAR: 'images/apple-touch-icon.png',
    QUESTION_MAX_LENGTH: 200,
    MESSAGES: {
        DISCLAIMER_DEFAULT: 'AIが自動生成した回答です。誤りを含む場合があります。',
        WELCOME: 'こんにちは！ゲームのルールや遊び方にお答えします。まず、どのゲームについて知りたいですか？',
        PICK_AGAIN: 'どのゲームについて質問しますか？',
        GAME_SET: '「{name}」ですね。気になることを送ってください！',
        PLACEHOLDER: 'メッセージを入力',
        PLACEHOLDER_LOCKED: 'まず上でゲームを選んでください',
        THINKING: '考え中...',
        ERROR_GENERIC: '回答の取得に失敗しました。時間をおいて再度お試しください。',
        ERROR_TURNSTILE: '認証（Turnstile）に失敗しました。ページを再読み込みしてお試しください。',
        ERROR_RATE_LIMITED: '質問が集中しています。少し時間をおいてから再度お試しください。',
        ERROR_PAUSED: '現在サービスを一時停止しています。時間をおいて再度お試しください。',
        ERROR_EMPTY: '質問を入力してください。',
        ERROR_TOO_LONG: '質問は200文字以内で入力してください。'
    }
};

// ============================================
// State
// ============================================
const state = {
    isOpen: false,
    isSending: false,
    session: null,
    game: null,
    turnstile: {
        scriptPromise: null,
        widgetId: null,
        pending: null
    }
};

// ============================================
// Turnstile（初回オープン時に遅延読み込み）
// ============================================
const Turnstile = {
    loadScript() {
        if (state.turnstile.scriptPromise) return state.turnstile.scriptPromise;

        state.turnstile.scriptPromise = new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = CHATBOT_CONFIG.API.TURNSTILE_SCRIPT;
            script.async = true;
            script.defer = true;
            script.onload = () => resolve();
            script.onerror = () => {
                state.turnstile.scriptPromise = null;
                reject(new Error('turnstile_script_failed'));
            };
            document.head.appendChild(script);
        });

        return state.turnstile.scriptPromise;
    },

    async getToken(container) {
        await this.loadScript();

        return new Promise((resolve, reject) => {
            state.turnstile.pending = { resolve, reject };

            const settle = (fn, value) => {
                const pending = state.turnstile.pending;
                state.turnstile.pending = null;
                if (pending) pending[fn](value);
            };

            if (state.turnstile.widgetId === null) {
                state.turnstile.widgetId = window.turnstile.render(container, {
                    sitekey: CHATBOT_CONFIG.API.TURNSTILE_SITEKEY,
                    appearance: 'interaction-only',
                    callback: (token) => settle('resolve', token),
                    'error-callback': () => settle('reject', new Error('turnstile_error')),
                    'timeout-callback': () => settle('reject', new Error('turnstile_timeout'))
                });
            } else {
                window.turnstile.reset(state.turnstile.widgetId);
            }
        });
    }
};

// ============================================
// API Client（Turnstile→/session→/ask、401なら取り直し）
// ============================================
const Api = {
    async postJson(path, body) {
        const response = await fetch(`${CHATBOT_CONFIG.API.BASE_URL}${path}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        const data = await response.json().catch(() => ({}));
        return { status: response.status, ok: response.ok, data };
    },

    async newSession(tsContainer) {
        const token = await Turnstile.getToken(tsContainer);
        const { ok, data } = await this.postJson('/session', { token });
        if (!ok) {
            const error = new Error(data.message || data.error || 'session_failed');
            error.code = data.error;
            throw error;
        }
        state.session = data.session;
    },

    async ask(question, tsContainer) {
        if (!state.session) await this.newSession(tsContainer);

        const send = () => this.postJson('/ask', {
            session: state.session,
            question,
            game: state.game
        });

        let result = await send();

        if (result.status === 401) {
            state.session = null;
            await this.newSession(tsContainer);
            result = await send();
        }

        if (!result.ok) {
            const error = new Error(result.data.message || result.data.error || 'ask_failed');
            error.code = result.data.error;
            error.status = result.status;
            throw error;
        }

        return result.data; // { answer, source, disclaimer }
    }
};

// ============================================
// UI
// ============================================
const ChatUI = {
    elements: {},

    build() {
        const root = document.createElement('div');
        root.className = 'rbot';
        root.id = 'rule-chatbot';

        root.innerHTML = `
            <button type="button" class="rbot-fab" aria-expanded="false" aria-controls="rbot-panel" aria-label="ゲームについて質問する">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2C6.5 2 2 5.9 2 10.7c0 2.8 1.5 5.2 3.9 6.8-.2 1.4-.8 2.7-1.8 3.7-.2.2 0 .6.3.6 2.1-.2 4-1 5.4-2.1.7.1 1.4.2 2.2.2 5.5 0 10-3.9 10-8.7S17.5 2 12 2zm-4.5 9.9c-.7 0-1.2-.5-1.2-1.2s.5-1.2 1.2-1.2 1.2.5 1.2 1.2-.5 1.2-1.2 1.2zm4.5 0c-.7 0-1.2-.5-1.2-1.2s.5-1.2 1.2-1.2 1.2.5 1.2 1.2-.5 1.2-1.2 1.2zm4.5 0c-.7 0-1.2-.5-1.2-1.2s.5-1.2 1.2-1.2 1.2.5 1.2 1.2-.5 1.2-1.2 1.2z"/></svg>
                <span class="rbot-fab-full">ゲームについて質問</span>
                <span class="rbot-fab-short">質問</span>
            </button>
            <div class="rbot-panel" id="rbot-panel" role="dialog" aria-label="ゲーム質問チャット" hidden>
                <header class="rbot-head">
                    <img class="rbot-avatar" src="${CHATBOT_CONFIG.AVATAR}" alt="" width="38" height="38">
                    <div class="rbot-head-titles">
                        <span class="rbot-name">ルール質問AI</span>
                        <span class="rbot-status"><i class="rbot-dot"></i>ゲームのルールにすぐ回答</span>
                    </div>
                    <button type="button" class="rbot-close" aria-label="チャットを閉じる">
                        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
                    </button>
                </header>

                <div class="rbot-messages" aria-live="polite"></div>
                <div class="rbot-ts"></div>

                <div class="rbot-context" hidden>
                    <span class="rbot-context-label"><svg viewBox="0 0 24 24" aria-hidden="true" class="rbot-context-ic"><use href="#i-meeple"></use></svg><b class="rbot-context-game"></b></span>
                    <button type="button" class="rbot-context-change">変更</button>
                </div>

                <form class="rbot-form">
                    <div class="rbot-input-row">
                        <textarea class="rbot-input" rows="1" maxlength="${CHATBOT_CONFIG.QUESTION_MAX_LENGTH}"
                            placeholder="${CHATBOT_CONFIG.MESSAGES.PLACEHOLDER_LOCKED}" aria-label="質問を入力" disabled></textarea>
                        <button type="submit" class="rbot-send" aria-label="送信" disabled>
                            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4.4 19.6l15.3-7.1a.6.6 0 0 0 0-1.1L4.4 4.4a.6.6 0 0 0-.83.7L5 11l8 1-8 1-1.43 5.9a.6.6 0 0 0 .83.7z"/></svg>
                        </button>
                    </div>
                    <div class="rbot-foot">
                        <span class="rbot-note"></span>
                        <span class="rbot-count">0/${CHATBOT_CONFIG.QUESTION_MAX_LENGTH}</span>
                    </div>
                </form>
            </div>
        `;
        document.body.appendChild(root);

        this.elements = {
            root,
            fab: root.querySelector('.rbot-fab'),
            panel: root.querySelector('.rbot-panel'),
            close: root.querySelector('.rbot-close'),
            messages: root.querySelector('.rbot-messages'),
            tsContainer: root.querySelector('.rbot-ts'),
            context: root.querySelector('.rbot-context'),
            contextGame: root.querySelector('.rbot-context-game'),
            contextChange: root.querySelector('.rbot-context-change'),
            form: root.querySelector('.rbot-form'),
            input: root.querySelector('.rbot-input'),
            send: root.querySelector('.rbot-send'),
            count: root.querySelector('.rbot-count'),
            note: root.querySelector('.rbot-note')
        };

        this.setDisclaimer(CHATBOT_CONFIG.MESSAGES.DISCLAIMER_DEFAULT);
    },

    setDisclaimer(text) {
        this.elements.note.textContent = text;
    },

    timeNow() {
        const d = new Date();
        return d.getHours() + ':' + String(d.getMinutes()).padStart(2, '0');
    },

    // LINE風の1行（bot: アバター＋吹き出し＋時刻 / user: 時刻＋吹き出し）を作る
    appendLine(side, fillBubble) {
        const line = document.createElement('div');
        line.className = `rbot-line rbot-line-${side}`;

        const bubble = document.createElement('div');
        bubble.className = 'rbot-bubble';
        fillBubble(bubble);

        const time = document.createElement('time');
        time.className = 'rbot-time';
        time.textContent = this.timeNow();

        if (side === 'user') {
            line.append(time, bubble);
        } else {
            const avatar = document.createElement('img');
            avatar.className = 'rbot-msg-avatar';
            avatar.src = CHATBOT_CONFIG.AVATAR;
            avatar.alt = '';
            line.append(avatar, bubble, time);
        }

        this.elements.messages.appendChild(line);
        this.scrollToBottom();
        return { line, bubble };
    },

    addMessage(type, text) {
        const side = type === 'user' ? 'user' : 'bot';
        const { bubble } = this.appendLine(side, (b) => { b.textContent = text; });
        if (type === 'error') bubble.classList.add('rbot-bubble-error');
        return bubble;
    },

    addBotAnswer(answer, source) {
        const bubble = this.addMessage('bot', answer);
        if (source) {
            const sourceElement = document.createElement('span');
            sourceElement.className = 'rbot-source';
            sourceElement.textContent = `出典: ${source}`;
            bubble.appendChild(sourceElement);
            this.scrollToBottom();
        }
    },

    // ゲーム選択：サムネイル付きカード（プルダウンの代替）
    renderPicker(promptText) {
        this.addMessage('bot', promptText);

        const cards = document.createElement('div');
        cards.className = 'rbot-cards';
        CHATBOT_CONFIG.GAMES.forEach(g => {
            const card = document.createElement('button');
            card.type = 'button';
            card.className = 'rbot-card';
            card.dataset.id = g.id;
            card.innerHTML =
                `<img class="rbot-card-thumb" src="${g.img}" alt="" loading="lazy">` +
                `<span class="rbot-card-name">${g.short}</span>`;
            cards.appendChild(card);
        });
        this.elements.messages.appendChild(cards);
        this.scrollToBottom();
    },

    selectGame(id) {
        const game = CHATBOT_CONFIG.GAMES.find(g => g.id === id);
        if (!game) return;
        state.game = game.slug;

        // 直近までのカードは選択済みに（誤タップ防止）＋選んだカードを強調
        this.elements.messages.querySelectorAll('.rbot-cards').forEach(list => {
            list.classList.add('is-done');
            list.querySelectorAll('.rbot-card').forEach(c => {
                c.classList.toggle('is-active', c.dataset.id === id);
            });
        });

        this.elements.contextGame.textContent = game.short;
        this.elements.context.hidden = false;

        this.setInputEnabled(true);
        this.addMessage('bot', CHATBOT_CONFIG.MESSAGES.GAME_SET.replace('{name}', game.name));

        if (!this.isCoarsePointer()) this.elements.input.focus();
    },

    setInputEnabled(enabled) {
        this.elements.input.disabled = !enabled;
        this.elements.send.disabled = !enabled;
        this.elements.input.placeholder = enabled
            ? CHATBOT_CONFIG.MESSAGES.PLACEHOLDER
            : CHATBOT_CONFIG.MESSAGES.PLACEHOLDER_LOCKED;
    },

    autoGrow() {
        const ta = this.elements.input;
        ta.style.height = 'auto';
        ta.style.height = Math.min(ta.scrollHeight, 120) + 'px';
    },

    addTypingIndicator() {
        const { line } = this.appendLine('bot', (b) => {
            b.classList.add('rbot-bubble-typing');
            b.innerHTML = '<span class="rbot-typing"><span></span><span></span><span></span></span>';
        });
        line.setAttribute('aria-label', CHATBOT_CONFIG.MESSAGES.THINKING);
        return line;
    },

    scrollToBottom() {
        const m = this.elements.messages;
        // レイアウト確定後に最下部へ
        requestAnimationFrame(() => { m.scrollTop = m.scrollHeight; });
    },

    updateCount() {
        const length = this.elements.input.value.length;
        this.elements.count.textContent = `${length}/${CHATBOT_CONFIG.QUESTION_MAX_LENGTH}`;
    },

    setSending(isSending) {
        state.isSending = isSending;
        this.elements.send.disabled = isSending || !state.game;
        this.elements.input.disabled = isSending || !state.game;
    },

    isCoarsePointer() {
        return window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
    },

    open() {
        state.isOpen = true;
        this.elements.root.classList.add('is-open');
        this.elements.panel.hidden = false;
        this.elements.fab.setAttribute('aria-expanded', 'true');

        if (this.elements.messages.childElementCount === 0) {
            this.renderPicker(CHATBOT_CONFIG.MESSAGES.WELCOME);
        }

        Turnstile.loadScript().catch(() => {});
        Viewport.attach();

        if (!this.isCoarsePointer() && state.game) this.elements.input.focus();
    },

    close() {
        state.isOpen = false;
        this.elements.root.classList.remove('is-open');
        this.elements.panel.hidden = true;
        this.elements.fab.setAttribute('aria-expanded', 'false');
        this.elements.input.blur();
        Viewport.detach();
        this.elements.fab.focus();
    }
};

// ============================================
// Viewport（モバイル: キーボード表示に追従してパネルを可視領域に収める）
// ============================================
const Viewport = {
    onResize: null,
    onScroll: null,
    rafId: 0,
    scrollY: 0,
    locked: false,

    isMobile() {
        return window.matchMedia && window.matchMedia('(max-width: 640px)').matches;
    },

    lockScroll() {
        if (this.locked || !this.isMobile()) return;
        this.scrollY = window.scrollY;
        const b = document.body.style;
        b.position = 'fixed';
        b.top = `-${this.scrollY}px`;
        b.left = '0';
        b.right = '0';
        b.width = '100%';
        document.documentElement.style.overflow = 'hidden';
        this.locked = true;
    },

    unlockScroll() {
        if (!this.locked) return;
        const b = document.body.style;
        b.position = ''; b.top = ''; b.left = ''; b.right = ''; b.width = '';
        document.documentElement.style.overflow = '';
        window.scrollTo({ top: this.scrollY, left: 0, behavior: 'instant' });
        this.locked = false;
    },

    update() {
        const vv = window.visualViewport;
        const panel = ChatUI.elements.panel;
        if (!panel) return;

        if (!this.isMobile() || !vv) {
            panel.style.height = '';
            panel.style.bottom = '';
            return;
        }
        const margin = 10;
        const bottomInset = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
        panel.style.height = (vv.height - margin * 2) + 'px';
        panel.style.bottom = (bottomInset + margin) + 'px';
    },

    scheduleUpdate() {
        if (this.rafId) return;
        this.rafId = requestAnimationFrame(() => {
            this.rafId = 0;
            this.update();
        });
    },

    attach() {
        this.lockScroll();
        this.update();
        if (!window.visualViewport || this.onResize) return;
        this.onResize = () => this.update();
        this.onScroll = () => this.scheduleUpdate();
        window.visualViewport.addEventListener('resize', this.onResize);
        window.visualViewport.addEventListener('scroll', this.onScroll);
    },

    detach() {
        if (this.rafId) { cancelAnimationFrame(this.rafId); this.rafId = 0; }
        if (window.visualViewport && this.onResize) {
            window.visualViewport.removeEventListener('resize', this.onResize);
            window.visualViewport.removeEventListener('scroll', this.onScroll);
        }
        this.onResize = null;
        this.onScroll = null;
        const panel = ChatUI.elements.panel;
        if (panel) { panel.style.height = ''; panel.style.bottom = ''; }
        this.unlockScroll();
    }
};

// ============================================
// Handlers
// ============================================
const Handlers = {
    errorMessage(error) {
        const M = CHATBOT_CONFIG.MESSAGES;
        switch (error.code) {
            case 'rate_limited': return error.message || M.ERROR_RATE_LIMITED;
            case 'service_paused': return M.ERROR_PAUSED;
            case 'empty_question': return M.ERROR_EMPTY;
            case 'too_long': return M.ERROR_TOO_LONG;
            case 'turnstile_required':
            case 'turnstile_failed': return M.ERROR_TURNSTILE;
            default:
                if (/^turnstile_/.test(error.message)) return M.ERROR_TURNSTILE;
                return error.message && error.code ? error.message : M.ERROR_GENERIC;
        }
    },

    async submitQuestion() {
        const question = ChatUI.elements.input.value.trim();
        if (!question || state.isSending) return;

        if (!state.game) {
            ChatUI.renderPicker(CHATBOT_CONFIG.MESSAGES.PICK_AGAIN);
            return;
        }
        if (question.length > CHATBOT_CONFIG.QUESTION_MAX_LENGTH) {
            ChatUI.addMessage('error', CHATBOT_CONFIG.MESSAGES.ERROR_TOO_LONG);
            return;
        }

        ChatUI.addMessage('user', question);
        ChatUI.elements.input.value = '';
        ChatUI.autoGrow();
        ChatUI.updateCount();

        ChatUI.setSending(true);
        const typing = ChatUI.addTypingIndicator();

        try {
            const data = await Api.ask(question, ChatUI.elements.tsContainer);
            typing.remove();
            if (data.disclaimer) ChatUI.setDisclaimer(data.disclaimer);
            ChatUI.addBotAnswer(data.answer, data.source);
        } catch (error) {
            console.error('ルールボットへの質問に失敗しました:', error);
            typing.remove();
            ChatUI.addMessage('error', this.errorMessage(error));
        } finally {
            ChatUI.setSending(false);
            if (state.isOpen) ChatUI.elements.input.focus();
        }
    },

    setup() {
        const el = ChatUI.elements;

        el.fab.addEventListener('click', () => ChatUI.open());
        el.close.addEventListener('click', () => ChatUI.close());

        // ゲームカードのクリックで選択（イベント委譲）
        el.messages.addEventListener('click', (e) => {
            const card = e.target.closest('.rbot-card');
            if (!card || card.closest('.rbot-cards.is-done')) return;
            ChatUI.selectGame(card.dataset.id);
        });

        el.contextChange.addEventListener('click', () => {
            ChatUI.renderPicker(CHATBOT_CONFIG.MESSAGES.PICK_AGAIN);
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && state.isOpen) ChatUI.close();
        });

        el.input.addEventListener('input', () => { ChatUI.updateCount(); ChatUI.autoGrow(); });

        el.input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
                e.preventDefault();
                this.submitQuestion();
            }
        });

        el.form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.submitQuestion();
        });

        el.send.addEventListener('pointerdown', (e) => e.preventDefault());
    }
};

// ============================================
// Init
// ============================================
function initChatbot() {
    if (!CHATBOT_ENABLED) return;
    ChatUI.build();
    Handlers.setup();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initChatbot);
} else {
    initChatbot();
}

})();
