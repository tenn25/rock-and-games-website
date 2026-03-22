/**
 * Index Page JavaScript
 * Handles activity loading, character randomization, and mobile interactions
 */

// Set current year in footer
document.getElementById('current-year').textContent = new Date().getFullYear();

// Navbar scroll effect
window.addEventListener('scroll', () => {
    const navbar = document.getElementById('navbar');
    if (window.pageYOffset > 50) {
        navbar.classList.add('scrolled');
    } else {
        navbar.classList.remove('scrolled');
    }
});

// Fetch activity history
async function fetchActivityHistory() {
    const activityContainer = document.getElementById('activity-list');

    try {
        const response = await fetch('./contents/activity.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();

        if (data && data.activities && data.activities.length > 0) {
            activityContainer.innerHTML = '';

            // Display latest 3 activities
            const recentActivities = data.activities.slice(0, 3);

            recentActivities.forEach((activity) => {
                const activityElement = document.createElement('div');
                activityElement.className = 'activity-item';

                const dateElement = document.createElement('div');
                dateElement.className = 'activity-date';
                dateElement.textContent = activity.date;
                activityElement.appendChild(dateElement);

                const contentWrapper = document.createElement('div');
                contentWrapper.className = 'activity-content';
                activity.content.forEach(line => {
                    const contentElement = document.createElement('p');
                    contentElement.textContent = line;
                    contentWrapper.appendChild(contentElement);
                });
                activityElement.appendChild(contentWrapper);

                activityContainer.appendChild(activityElement);
            });
        } else {
            activityContainer.innerHTML = '<p class="activity-content">活動履歴はありません。</p>';
        }
    } catch (error) {
        console.error('活動履歴の読み込みに失敗しました:', error);
        activityContainer.innerHTML = '<p class="activity-content">活動履歴の読み込みに失敗しました。</p>';
    }
}

const DEFAULT_CHARACTER_FILES = ['anubis.png', 'bastet.png', 'horus.png', 'kunum.png', 'seto.png'];
const CHARACTER_MANIFEST_URL = './contents/character-files.json';
const LOGO_VIBRATION_MS = 180;
let characterFiles = [...DEFAULT_CHARACTER_FILES];

// Load character image files from images/character directory.
async function loadCharacterFiles() {
    const directoryUrl = './images/character/';

    // 1) Prefer explicit manifest for static hosting (S3/CloudFront etc.).
    try {
        const manifestResponse = await fetch(CHARACTER_MANIFEST_URL, { cache: 'no-cache' });
        if (manifestResponse.ok) {
            const manifest = await manifestResponse.json();
            if (manifest && Array.isArray(manifest.files)) {
                const fromManifest = manifest.files
                    .filter(name => typeof name === 'string')
                    .map(name => name.trim())
                    .filter(name => /\.(png|jpe?g|webp|gif|svg)$/i.test(name));

                const uniqueManifestFiles = [...new Set(fromManifest)];
                if (uniqueManifestFiles.length >= 2) {
                    characterFiles = uniqueManifestFiles;
                    return;
                }
            }
        }
    } catch (error) {
        // Continue to directory listing fallback.
    }

    try {
        const response = await fetch(directoryUrl);
        if (!response.ok) {
            // Static hosts usually deny directory listing; fallback quietly.
            if (response.status === 403 || response.status === 404) {
                characterFiles = [...DEFAULT_CHARACTER_FILES];
                return;
            }
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const html = await response.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');

        const files = Array.from(doc.querySelectorAll('a[href]'))
            .map(link => link.getAttribute('href') || '')
            .map(href => href.split('/').pop() || '')
            .filter(name => /\.(png|jpe?g|webp|gif|svg)$/i.test(name));

        const uniqueFiles = [...new Set(files)];
        if (uniqueFiles.length >= 2) {
            characterFiles = uniqueFiles;
            return;
        }

        characterFiles = [...DEFAULT_CHARACTER_FILES];
    } catch (error) {
        console.warn('キャラクター画像一覧の取得に失敗したため、既定値を使用します。', error);
        characterFiles = [...DEFAULT_CHARACTER_FILES];
    }
}

// Function to randomize characters
function randomizeCharacters() {
    const characters = characterFiles.length >= 2 ? characterFiles : DEFAULT_CHARACTER_FILES;
    const leftChar = document.querySelector('.character-peek-left');
    const rightChar = document.querySelector('.character-peek-right');

    // Shuffle and pick 2 different characters
    const shuffled = characters.sort(() => 0.5 - Math.random());
    if (leftChar) {
        leftChar.src = `images/character/${shuffled[0]}`;
        leftChar.setAttribute('data-character', shuffled[0].replace(/\.[^.]+$/, '').toLowerCase());
    }
    if (rightChar) {
        rightChar.src = `images/character/${shuffled[1]}`;
        rightChar.setAttribute('data-character', shuffled[1].replace(/\.[^.]+$/, '').toLowerCase());
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', async() => {
    fetchActivityHistory();

    await loadCharacterFiles();

    // Initial character setup
    randomizeCharacters();

    // Character display logic
    const heroSection = document.querySelector('.hero-section');
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    const logoHint = document.getElementById('hero-logo-hint');

    if (logoHint) {
        logoHint.textContent = isTouchDevice ? '＼ロゴをタップ／' : '＼ロゴをクリック／';
    }

    if (heroSection) {
        let isShown = false;
        let isAnimating = false; // アニメーション中フラグ
        const heroLogo = document.querySelector('.hero-logo');

        const triggerLogoFeedback = () => {
            if (!heroLogo) {
                return;
            }

            heroLogo.classList.remove('is-jiggle');
            void heroLogo.offsetWidth;
            heroLogo.classList.add('is-jiggle');
        };

        const stopLogoFeedback = (delayMs = 0) => {
            if (!heroLogo) {
                return;
            }

            setTimeout(() => {
                heroLogo.classList.remove('is-jiggle');
            }, delayMs);
        };

        // Function to show characters (初回表示用)
        const showCharacters = () => {
            if (!isShown && !isAnimating) {
                randomizeCharacters();
                heroSection.classList.add('show-characters');
                // 初回は表示後も少し震えを残す
                stopLogoFeedback(LOGO_VIBRATION_MS);
                isShown = true;
            }
        };

        // Function to switch characters (切り替え用)
        const switchCharacters = () => {
            if (isShown && !isAnimating) {
                isAnimating = true;

                // 1. 現在のキャラクターを外にスライドアウト
                heroSection.classList.remove('show-characters');
                heroSection.classList.add('hide-characters');

                // 2. アニメーション完了を待つ（CSSのtransitionが完全に終わるまで待機）
                setTimeout(() => {
                    // 3. 新しいキャラクターをランダムに選択
                    randomizeCharacters();

                    // 4. hide状態をリセットして新しいキャラクターをスライドイン準備
                    heroSection.classList.remove('hide-characters');

                    // 5. DOMが更新されるのを待ってからスライドイン
                    // requestAnimationFrameを2回呼ぶことで、確実にDOM更新後にアニメーション開始
                    requestAnimationFrame(() => {
                        requestAnimationFrame(() => {
                            heroSection.classList.add('show-characters');
                            stopLogoFeedback();
                            isAnimating = false;
                        });
                    });
                }, 200); // CSSのtransition(0.16s)より少し長めに設定
            }
        };

        // キャラクター表示/切り替え: ロゴエリアのクリック/タップ
        const heroMainRow = document.querySelector('.hero-main-row');

        if (heroMainRow) {
            heroMainRow.addEventListener('pointerdown', function(e) {
                if (e.target.closest('a') || e.target.closest('button')) {
                    return;
                }

                triggerLogoFeedback();

                // 初回は表示、2回目以降は切り替え（即時開始）
                if (isShown && !isAnimating) {
                    switchCharacters();
                } else if (!isShown) {
                    showCharacters();
                }
            });
        }
    }
});