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

    if (heroSection) {
        let isShown = false;
        let isAnimating = false; // アニメーション中フラグ

        // Function to show characters (初回表示用)
        const showCharacters = () => {
            if (!isShown && !isAnimating) {
                randomizeCharacters();
                heroSection.classList.add('show-characters');
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

                // 2. アニメーション完了を待つ（0.25秒）
                setTimeout(() => {
                    // 3. 新しいキャラクターをランダムに選択
                    randomizeCharacters();

                    // 4. hide状態をリセット
                    heroSection.classList.remove('hide-characters');

                    // 5. 即座に新しいキャラクターをスライドイン
                    setTimeout(() => {
                        heroSection.classList.add('show-characters');
                        isAnimating = false;
                    }, 20);
                }, 250);
            }
        };

        // PC用: mouseenterで初回表示
        heroSection.addEventListener('mouseenter', function() {
            showCharacters();
        });

        // モバイル用: 画面タッチ（スクロール開始）で初回表示
        let touchTriggered = false;

        // タッチデバイスの判定
        const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

        if (isTouchDevice) {
            // 初回タッチで自動的にキャラクター表示（スクロール操作の一環として）
            document.addEventListener('touchstart', function handleFirstTouch() {
                if (!touchTriggered && !isShown) {
                    showCharacters();
                    touchTriggered = true;
                    // 初回のみなので、リスナーを削除
                    document.removeEventListener('touchstart', handleFirstTouch);
                }
            }, { passive: true, once: true });

            // スクロールでも表示（タッチを逃した場合のバックアップ）
            window.addEventListener('scroll', function handleFirstScroll() {
                if (!touchTriggered && !isShown && window.scrollY > 10) {
                    showCharacters();
                    touchTriggered = true;
                    window.removeEventListener('scroll', handleFirstScroll);
                }
            }, { passive: true, once: true });
        }

        // キャラクター切り替え用: ロゴエリアのクリック/タップ
        const heroMainRow = document.querySelector('.hero-main-row');

        if (heroMainRow) {
            heroMainRow.addEventListener('click', function(e) {
                // リンクやボタンのクリックは除外
                if (e.target.closest('a') || e.target.closest('button')) {
                    return;
                }

                // 既にキャラクターが表示されている場合のみ切り替え
                if (isShown && !isAnimating) {
                    switchCharacters();
                } else if (!isShown && !isTouchDevice) {
                    // PCの場合は初回クリックでも表示
                    showCharacters();
                }
            });
        }
    }
});