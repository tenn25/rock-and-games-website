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
        let isAnimating = false; // キャラクター切り替えアニメーション中フラグ
        const heroLogo = document.querySelector('.hero-logo');
        const heroMainRow = document.querySelector('.hero-main-row');

        if (heroMainRow && heroLogo) {
            // クリック/タップ時の処理
            heroMainRow.addEventListener('click', function(e) {
                if (e.target.closest('a') || e.target.closest('button')) {
                    return;
                }

                // キャラクター切り替え中は何もしない
                if (isAnimating) {
                    return;
                }

                isAnimating = true;

                // 1. 押し込みとブルブル震えを同時に開始
                heroLogo.classList.remove('is-jiggle');
                void heroLogo.offsetWidth;
                heroLogo.classList.add('is-jiggle');

                // 2. 即座にキャラクタースライドアウト開始
                heroSection.classList.remove('show-characters');
                heroSection.classList.add('hide-characters');

                // 3. スライドアウト完了後に新キャラクター準備
                setTimeout(() => {
                    // 新しいキャラクターをランダムに選択
                    randomizeCharacters();

                    // hide状態をリセット
                    heroSection.classList.remove('hide-characters');

                    // 即座にスライドイン開始
                    requestAnimationFrame(() => {
                        heroSection.classList.add('show-characters');
                    });
                }, 160); // キャラクタースライドアウト完了(160ms)

                // 4. キャラクター完全表示後にブルブル終了
                setTimeout(() => {
                    heroLogo.classList.remove('is-jiggle');
                    isAnimating = false;
                }, 400); // ブルブルアニメーション完了(400ms)
            });
        }
    }
});