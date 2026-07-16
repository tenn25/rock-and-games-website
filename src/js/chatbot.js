/**
 * Rule Chatbot Widget
 * ルール質問AIチャットボット（フローティングウィジェット）
 */

(() => {
'use strict';

// ============================================
// Feature Flag
// ============================================
// チャットボット機能のON/OFF。false にするとボタンごと一切表示されない。
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
    GAMES: [
        { slug: 'haiena', name: 'ハイエナ勇者はサボリたい（通常版＋拡張版）' },
        { slug: 'navirabi', name: 'ナビラビ（通常版）' },
        { slug: 'navirabi_ex', name: 'ナビラビ（拡張版）4〜5人用新ルール' },
        { slug: 'kamisama', name: 'カミサマーケット' },
        { slug: 'goat', name: 'GOAT' }
    ],
    QUESTION_MAX_LENGTH: 200,
    MESSAGES: {
        DISCLAIMER_DEFAULT: '回答はAIが自動生成しています。誤りを含む場合があります。',
        CONTACT_NOTE: '不明な点はお問い合わせください。',
        WELCOME: 'こんにちは！ゲームの概要やルールについて質問できます。対象のゲームを選んで、気になることを聞いてください。',
        SELECT_GAME_REQUIRED: '質問する前に、対象のゲームを選んでください。',
        GAME_CHANGED: '対象ゲームを「{name}」に変更しました。',
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

    /**
     * Turnstile を実行して新しいトークンを得る。
     * トークンは使い捨てのため、2回目以降は reset で再取得する。
     */
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

        // セッション失効・IP変化 → Turnstile から取り直して1回だけ再送
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

        const gameOptions = CHATBOT_CONFIG.GAMES
            .map(g => `<option value="${g.slug}">${g.name}</option>`)
            .join('');

        root.innerHTML = `
            <button type="button" class="rbot-fab" aria-expanded="false" aria-controls="rbot-panel">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2C6.5 2 2 5.9 2 10.7c0 2.8 1.5 5.2 3.9 6.8-.2 1.4-.8 2.7-1.8 3.7-.2.2 0 .6.3.6 2.1-.2 4-1 5.4-2.1.7.1 1.4.2 2.2.2 5.5 0 10-3.9 10-8.7S17.5 2 12 2zm-4.5 9.9c-.7 0-1.2-.5-1.2-1.2s.5-1.2 1.2-1.2 1.2.5 1.2 1.2-.5 1.2-1.2 1.2zm4.5 0c-.7 0-1.2-.5-1.2-1.2s.5-1.2 1.2-1.2 1.2.5 1.2 1.2-.5 1.2-1.2 1.2zm4.5 0c-.7 0-1.2-.5-1.2-1.2s.5-1.2 1.2-1.2 1.2.5 1.2 1.2-.5 1.2-1.2 1.2z"/></svg>
                <span>ゲームについて質問</span>
            </button>
            <div class="rbot-panel" id="rbot-panel" role="dialog" aria-label="ゲーム質問チャット" hidden>
                <div class="rbot-head">
                    <div class="rbot-head-titles">
                        <span class="rbot-eyebrow-row">
                            <span class="rbot-eyebrow">ゲームについて質問</span>
                            <button type="button" class="rbot-info" aria-expanded="false" aria-controls="rbot-disclaimer" aria-label="回答についての注意事項">?</button>
                        </span>
                        <select id="rbot-game-select" class="rbot-game" aria-label="質問対象のゲーム">
                            <option value="" disabled selected hidden>ゲームを選択</option>
                            ${gameOptions}
                        </select>
                    </div>
                    <button type="button" class="rbot-close" aria-label="チャットを閉じる">✕</button>
                </div>
                <div class="rbot-disclaimer" id="rbot-disclaimer" hidden></div>
                <div class="rbot-messages" aria-live="polite"></div>
                <div class="rbot-ts"></div>
                <form class="rbot-form">
                    <textarea class="rbot-input" rows="2" maxlength="${CHATBOT_CONFIG.QUESTION_MAX_LENGTH}"
                        placeholder="例: 何人から遊べますか?" aria-label="質問を入力"></textarea>
                    <div class="rbot-form-foot">
                        <span class="rbot-count">0/${CHATBOT_CONFIG.QUESTION_MAX_LENGTH}</span>
                        <button type="submit" class="rbot-send">送信</button>
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
            info: root.querySelector('.rbot-info'),
            gameSelect: root.querySelector('.rbot-game'),
            disclaimer: root.querySelector('.rbot-disclaimer'),
            messages: root.querySelector('.rbot-messages'),
            tsContainer: root.querySelector('.rbot-ts'),
            form: root.querySelector('.rbot-form'),
            input: root.querySelector('.rbot-input'),
            count: root.querySelector('.rbot-count'),
            send: root.querySelector('.rbot-send')
        };

        this.setDisclaimer(CHATBOT_CONFIG.MESSAGES.DISCLAIMER_DEFAULT);
    },

    setDisclaimer(text) {
        this.elements.disclaimer.textContent =
            `⚠ ${text}${CHATBOT_CONFIG.MESSAGES.CONTACT_NOTE}`;
    },

    // 「?」ボタンで免責事項ポップオーバーの開閉を切り替える。show を省略すると現在の逆に。
    toggleDisclaimer(show) {
        const expand = show ?? this.elements.disclaimer.hidden;
        this.elements.disclaimer.hidden = !expand;
        this.elements.info.setAttribute('aria-expanded', String(expand));
    },

    addMessage(type, text) {
        const message = document.createElement('div');
        message.className = `rbot-msg rbot-msg-${type}`;
        message.textContent = text;
        this.elements.messages.appendChild(message);
        this.scrollToBottom();
        return message;
    },

    addBotAnswer(answer, source) {
        const message = this.addMessage('bot', answer);
        if (source) {
            const sourceElement = document.createElement('span');
            sourceElement.className = 'rbot-source';
            sourceElement.textContent = `出典: ${source}`;
            message.appendChild(sourceElement);
            this.scrollToBottom();
        }
    },

    addTypingIndicator() {
        const message = document.createElement('div');
        message.className = 'rbot-msg rbot-msg-bot';
        message.setAttribute('aria-label', CHATBOT_CONFIG.MESSAGES.THINKING);
        message.innerHTML = '<span class="rbot-typing"><span></span><span></span><span></span></span>';
        this.elements.messages.appendChild(message);
        this.scrollToBottom();
        return message;
    },

    scrollToBottom() {
        this.elements.messages.scrollTop = this.elements.messages.scrollHeight;
    },

    updateCount() {
        const length = this.elements.input.value.length;
        this.elements.count.textContent = `${length}/${CHATBOT_CONFIG.QUESTION_MAX_LENGTH}`;
    },

    setSending(isSending) {
        state.isSending = isSending;
        this.elements.send.disabled = isSending;
        this.elements.input.disabled = isSending;
    },

    // タッチ主体の端末か（キーボードが画面を覆う環境）
    isCoarsePointer() {
        return window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
    },

    open() {
        state.isOpen = true;
        this.elements.root.classList.add('is-open');
        this.elements.panel.hidden = false;
        this.elements.fab.setAttribute('aria-expanded', 'true');

        if (this.elements.messages.childElementCount === 0) {
            this.addMessage('bot', CHATBOT_CONFIG.MESSAGES.WELCOME);
        }

        // Turnstile を裏で先読みしておく（初回質問を速くする）
        Turnstile.loadScript().catch(() => {});

        Viewport.attach();

        // タッチ端末では自動フォーカスしない（キーボードが即開いてパネルが隠れるのを防ぐ）
        if (!this.isCoarsePointer()) this.elements.input.focus();
    },

    close() {
        state.isOpen = false;
        this.toggleDisclaimer(false);
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

    // モーダル表示中は背景ページのスクロールを固定（モバイルのみ）。
    // iOS でも確実に効くよう body を position:fixed にして現在位置を退避する。
    lockScroll() {
        if (this.locked || !this.isMobile()) return;
        this.scrollY = window.scrollY;
        const b = document.body.style;
        b.position = 'fixed';
        b.top = `-${this.scrollY}px`;
        b.left = '0';
        b.right = '0';
        b.width = '100%';
        // body が position:fixed になるとスクロール基準が html に移る。
        // html 側も overflow:hidden にして、キーボード開閉時の横パン（左右のズレ）を封じる。
        document.documentElement.style.overflow = 'hidden';
        this.locked = true;
    },

    unlockScroll() {
        if (!this.locked) return;
        const b = document.body.style;
        b.position = ''; b.top = ''; b.left = ''; b.right = ''; b.width = '';
        document.documentElement.style.overflow = '';
        // scroll-behavior:smooth（common.css）だと復元がアニメ化し、一瞬トップに戻ってから
        // スクロールし直す動きになる。instant で即時復元してその見た目のジャンプを防ぐ。
        window.scrollTo({ top: this.scrollY, left: 0, behavior: 'instant' });
        this.locked = false;
    },

    // visualViewport の高さ・オフセットからパネルの実寸と下端位置を算出。
    // キーボードが出ると visualViewport が縮むので、その可視領域にパネルを収める。
    update() {
        const vv = window.visualViewport;
        const panel = ChatUI.elements.panel;
        if (!panel) return;

        if (!this.isMobile() || !vv) {
            panel.style.height = '';
            panel.style.bottom = '';
            return;
        }
        const margin = 12;
        // レイアウトビューポート下端からキーボード上端までの距離
        const bottomInset = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
        panel.style.height = (vv.height - margin * 2) + 'px';
        panel.style.bottom = (bottomInset + margin) + 'px';
    },

    // resize/scroll は入力中に連続発火するため rAF で1フレームにまとめ、パネルの揺れを防ぐ。
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
        // キーボード表示/非表示（resize）は即時反映。入力中に多発する scroll だけ rAF でまとめる。
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
        if (question.length > CHATBOT_CONFIG.QUESTION_MAX_LENGTH) {
            ChatUI.addMessage('error', CHATBOT_CONFIG.MESSAGES.ERROR_TOO_LONG);
            return;
        }

        ChatUI.addMessage('user', question);
        ChatUI.elements.input.value = '';
        ChatUI.updateCount();

        if (!state.game) {
            ChatUI.addMessage('bot', CHATBOT_CONFIG.MESSAGES.SELECT_GAME_REQUIRED);
            return;
        }
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

        el.info.addEventListener('click', (e) => {
            e.stopPropagation();
            ChatUI.toggleDisclaimer();
        });

        // ポップオーバーの外側をクリックしたら閉じる
        document.addEventListener('click', (e) => {
            if (el.disclaimer.hidden) return;
            if (e.target.closest('.rbot-disclaimer') || e.target.closest('.rbot-info')) return;
            ChatUI.toggleDisclaimer(false);
        });

        document.addEventListener('keydown', (e) => {
            if (e.key !== 'Escape') return;
            if (!el.disclaimer.hidden) { ChatUI.toggleDisclaimer(false); return; }
            if (state.isOpen) ChatUI.close();
        });

        el.gameSelect.addEventListener('change', () => {
            state.game = el.gameSelect.value;
            const game = CHATBOT_CONFIG.GAMES.find(g => g.slug === state.game);
            ChatUI.addMessage('system',
                CHATBOT_CONFIG.MESSAGES.GAME_CHANGED.replace('{name}', game ? game.name : state.game));
        });

        el.input.addEventListener('input', () => ChatUI.updateCount());

        // Enterで送信（Shift+Enterで改行）。IME変換確定のEnterは無視する
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

        // 送信ボタンのタップで入力欄のフォーカスが外れる（＝キーボードが閉じてパネルが再配置し、
        // ボタンが指の下から逃げる）のを防ぐ。pointerdown の既定動作を止めてフォーカスを保持する。
        // click（submit）は通常どおり発火するので、キーボードを保ったまま1タップで送信できる。
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

// DOM 構築後に初期化。読み込み済みなら即実行（スクリプトが遅延読込された場合も動く）。
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initChatbot);
} else {
    initChatbot();
}

})();
