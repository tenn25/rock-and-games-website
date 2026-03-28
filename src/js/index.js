/**
 * Index Page JavaScript
 * Handles activity loading, character randomization, and mobile interactions
 */

// ============================================
// Constants
// ============================================
const CONFIG = {
    CHARACTER: {
        DEFAULT_FILES: ['anubis.png', 'bastet.png', 'horus.png', 'kunum.png', 'seto.png'],
        MANIFEST_URL: './contents/character-files.json',
        DIRECTORY_URL: './images/character/',
        IMAGE_EXTENSIONS: /\.(png|jpe?g|webp|gif|svg)$/i,
        MIN_FILES: 2
    },
    ANIMATION: {
        SLIDE_OUT_DURATION: 160,
        JIGGLE_DURATION: 400,
        NAVBAR_SCROLL_THRESHOLD: 50
    },
    ACTIVITY: {
        JSON_URL: './contents/activity.json',
        DISPLAY_COUNT: 3
    }
};

// ============================================
// State
// ============================================
const state = {
    characterFiles: [...CONFIG.CHARACTER.DEFAULT_FILES],
    previousCharacters: []
};

// ============================================
// Utility Functions
// ============================================

/**
 * Fisher-Yates shuffle algorithm for better randomization
 */
function shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

/**
 * Remove file extension from filename
 */
function removeExtension(filename) {
    return filename.replace(/\.[^.]+$/, '').toLowerCase();
}

/**
 * Check if device supports touch
 */
function isTouchDevice() {
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
}

// ============================================
// UI Update Functions
// ============================================

/**
 * Update footer year
 */
function updateFooterYear() {
    const yearElement = document.getElementById('current-year');
    if (yearElement) {
        yearElement.textContent = new Date().getFullYear();
    }
}

/**
 * Setup navbar scroll effect
 */
function setupNavbarScroll() {
    const navbar = document.getElementById('navbar');
    if (!navbar) return;

    window.addEventListener('scroll', () => {
        if (window.pageYOffset > CONFIG.ANIMATION.NAVBAR_SCROLL_THRESHOLD) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    });
}

/**
 * Update logo hint text based on device type
 */
function updateLogoHint() {
    const logoHint = document.getElementById('hero-logo-hint');
    if (logoHint) {
        logoHint.textContent = isTouchDevice() ? '＼ロゴをタップ／' : '＼ロゴをクリック／';
    }
}

// ============================================
// Activity Functions
// ============================================

/**
 * Create activity item element
 */
function createActivityElement(activity) {
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

    return activityElement;
}

/**
 * Fetch and display activity history
 */
async function fetchActivityHistory() {
    const activityContainer = document.getElementById('activity-list');
    if (!activityContainer) return;

    try {
        const response = await fetch(CONFIG.ACTIVITY.JSON_URL);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();

        if (data?.activities?.length > 0) {
            activityContainer.innerHTML = '';
            const recentActivities = data.activities.slice(0, CONFIG.ACTIVITY.DISPLAY_COUNT);
            recentActivities.forEach(activity => {
                activityContainer.appendChild(createActivityElement(activity));
            });
        } else {
            activityContainer.innerHTML = '<p class="activity-content">活動履歴はありません。</p>';
        }
    } catch (error) {
        console.error('活動履歴の読み込みに失敗しました:', error);
        activityContainer.innerHTML = '<p class="activity-content">活動履歴の読み込みに失敗しました。</p>';
    }
}

// ============================================
// Character Functions
// ============================================

/**
 * Validate and filter image filenames
 */
function filterImageFiles(files) {
    return files
        .filter(name => typeof name === 'string')
        .map(name => name.trim())
        .filter(name => CONFIG.CHARACTER.IMAGE_EXTENSIONS.test(name));
}

/**
 * Try loading character files from manifest
 */
async function loadFromManifest() {
    try {
        const response = await fetch(CONFIG.CHARACTER.MANIFEST_URL, { cache: 'no-cache' });
        if (response.ok) {
            const manifest = await response.json();
            if (manifest?.files && Array.isArray(manifest.files)) {
                const filtered = filterImageFiles(manifest.files);
                const unique = [...new Set(filtered)];
                if (unique.length >= CONFIG.CHARACTER.MIN_FILES) {
                    return unique;
                }
            }
        }
    } catch (error) {
        // Silent fail, try directory listing
    }
    return null;
}

/**
 * Try loading character files from directory listing
 */
async function loadFromDirectory() {
    try {
        const response = await fetch(CONFIG.CHARACTER.DIRECTORY_URL);
        if (!response.ok) {
            if (response.status === 403 || response.status === 404) {
                return null;
            }
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const html = await response.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');

        const files = Array.from(doc.querySelectorAll('a[href]'))
            .map(link => link.getAttribute('href') || '')
            .map(href => href.split('/').pop() || '')
            .filter(name => CONFIG.CHARACTER.IMAGE_EXTENSIONS.test(name));

        const unique = [...new Set(files)];
        if (unique.length >= CONFIG.CHARACTER.MIN_FILES) {
            return unique;
        }
    } catch (error) {
        console.warn('キャラクター画像一覧の取得に失敗したため、既定値を使用します。', error);
    }
    return null;
}

/**
 * Load character image files
 */
async function loadCharacterFiles() {
    const fromManifest = await loadFromManifest();
    if (fromManifest) {
        state.characterFiles = fromManifest;
        return;
    }

    const fromDirectory = await loadFromDirectory();
    if (fromDirectory) {
        state.characterFiles = fromDirectory;
        return;
    }

    state.characterFiles = [...CONFIG.CHARACTER.DEFAULT_FILES];
}

/**
 * Select two different random characters, avoiding previous selection if possible
 */
function selectRandomCharacters() {
    const characters = state.characterFiles.length >= CONFIG.CHARACTER.MIN_FILES
        ? state.characterFiles
        : CONFIG.CHARACTER.DEFAULT_FILES;

    const shuffled = shuffleArray(characters);

    // Try to avoid repeating the same characters
    let [left, right] = shuffled;

    if (state.previousCharacters.length === 2) {
        const [prevLeft, prevRight] = state.previousCharacters;

        // If both characters are the same as before, try to find different ones
        if ((left === prevLeft && right === prevRight) || (left === prevRight && right === prevLeft)) {
            // Find a character that wasn't shown before
            for (let i = 0; i < shuffled.length; i++) {
                if (shuffled[i] !== prevLeft && shuffled[i] !== prevRight) {
                    left = shuffled[i];
                    break;
                }
            }
            // Find another different character
            for (let i = 0; i < shuffled.length; i++) {
                if (shuffled[i] !== left && shuffled[i] !== prevLeft && shuffled[i] !== prevRight) {
                    right = shuffled[i];
                    break;
                }
            }
        }
    }

    state.previousCharacters = [left, right];
    return [left, right];
}

/**
 * Update character images
 */
function randomizeCharacters() {
    const leftChar = document.querySelector('.character-peek-left');
    const rightChar = document.querySelector('.character-peek-right');

    if (!leftChar || !rightChar) return;

    const [left, right] = selectRandomCharacters();

    leftChar.src = `${CONFIG.CHARACTER.DIRECTORY_URL}${left}`;
    leftChar.setAttribute('data-character', removeExtension(left));

    rightChar.src = `${CONFIG.CHARACTER.DIRECTORY_URL}${right}`;
    rightChar.setAttribute('data-character', removeExtension(right));
}

// ============================================
// Hero Animation
// ============================================

/**
 * Setup hero section click animation
 */
function setupHeroAnimation() {
    const heroSection = document.querySelector('.hero-section');
    const heroLogo = document.querySelector('.hero-logo');
    const heroMainRow = document.querySelector('.hero-main-row');

    if (!heroSection || !heroLogo || !heroMainRow) return;

    let isAnimating = false;

    heroMainRow.addEventListener('click', (e) => {
        // Ignore clicks on links and buttons
        if (e.target.closest('a') || e.target.closest('button')) return;

        // Prevent animation overlap
        if (isAnimating) return;

        isAnimating = true;

        // Start logo jiggle animation
        heroLogo.classList.remove('is-jiggle');
        void heroLogo.offsetWidth; // Force reflow
        heroLogo.classList.add('is-jiggle');

        // Start character slide out
        heroSection.classList.remove('show-characters');
        heroSection.classList.add('hide-characters');

        // Replace characters after slide out
        setTimeout(() => {
            randomizeCharacters();
            heroSection.classList.remove('hide-characters');

            requestAnimationFrame(() => {
                heroSection.classList.add('show-characters');
            });
        }, CONFIG.ANIMATION.SLIDE_OUT_DURATION);

        // End animation
        setTimeout(() => {
            heroLogo.classList.remove('is-jiggle');
            isAnimating = false;
        }, CONFIG.ANIMATION.JIGGLE_DURATION);
    });
}

// ============================================
// Initialization
// ============================================

/**
 * Initialize all components
 */
async function init() {
    updateFooterYear();
    setupNavbarScroll();
    updateLogoHint();

    fetchActivityHistory();

    await loadCharacterFiles();
    randomizeCharacters();

    setupHeroAnimation();
}

// Start when DOM is ready
document.addEventListener('DOMContentLoaded', init);