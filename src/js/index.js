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
        SLIDE_OUT_DURATION: 120,      // Character slide out animation duration (ms)
        SLIDE_IN_DELAY: 30,            // Delay before character slide in (ms)
        RENDER_DELAY: 10,              // Delay for ensuring DOM render (ms)
        JIGGLE_DURATION: 400,          // Logo jiggle animation duration (ms)
        NAVBAR_SCROLL_THRESHOLD: 50    // Scroll distance to trigger navbar style (px)
    },
    ACTIVITY: {
        JSON_URL: './contents/activity.json',
        DISPLAY_COUNT: 3,
        ERROR_MESSAGE: '活動履歴の読み込みに失敗しました。',
        EMPTY_MESSAGE: '活動履歴はありません。'
    },
    SELECTORS: {
        NAVBAR: '#navbar',
        HERO_SECTION: '.hero-section',
        HERO_LOGO: '.hero-logo',
        HERO_MAIN_ROW: '.hero-main-row',
        HERO_LOGO_HINT: '#hero-logo-hint',
        CHARACTER_LEFT: '.character-peek-left',
        CHARACTER_RIGHT: '.character-peek-right',
        ACTIVITY_LIST: '#activity-list',
        CURRENT_YEAR: '#current-year'
    }
};

// ============================================
// State Management
// ============================================
const state = {
    characterFiles: [...CONFIG.CHARACTER.DEFAULT_FILES],
    previousCharacters: [],
    isAnimating: false
};

// ============================================
// DOM Utilities
// ============================================
const DOM = {
    /**
     * Get element by selector with null check
     */
    get(selector) {
        return document.querySelector(selector);
    },

    /**
     * Get element by ID with null check
     */
    getById(id) {
        return document.getElementById(id);
    },

    /**
     * Create element with optional className
     */
    create(tag, className = '') {
        const element = document.createElement(tag);
        if (className) element.className = className;
        return element;
    },

    /**
     * Set text content safely
     */
    setText(element, text) {
        if (element) element.textContent = text;
    },

    /**
     * Force reflow for animation restart
     */
    forceReflow(element) {
        void element.offsetWidth;
    }
};

// ============================================
// Utility Functions
// ============================================
const Utils = {
    /**
     * Fisher-Yates shuffle algorithm
     */
    shuffleArray(array) {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    },

    /**
     * Remove file extension from filename
     */
    removeExtension(filename) {
        return filename.replace(/\.[^.]+$/, '').toLowerCase();
    },

    /**
     * Check if device supports touch
     */
    isTouchDevice() {
        return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    },

    /**
     * Validate and filter image filenames
     */
    filterImageFiles(files) {
        return files
            .filter(name => typeof name === 'string')
            .map(name => name.trim())
            .filter(name => CONFIG.CHARACTER.IMAGE_EXTENSIONS.test(name));
    },

    /**
     * Get unique array items
     */
    unique(array) {
        return [...new Set(array)];
    }
};

// ============================================
// UI Components
// ============================================
const UI = {
    /**
     * Update footer year to current year
     */
    updateFooterYear() {
        const yearElement = DOM.getById('current-year');
        DOM.setText(yearElement, new Date().getFullYear());
    },

    /**
     * Update logo hint based on device type
     */
    updateLogoHint() {
        const logoHint = DOM.getById('hero-logo-hint');
        const hintText = Utils.isTouchDevice() ? '＼ロゴをタップ／' : '＼ロゴをクリック／';
        DOM.setText(logoHint, hintText);
    },

    /**
     * Setup navbar scroll effect
     */
    setupNavbarScroll() {
        const navbar = DOM.getById('navbar');
        if (!navbar) return;

        const handleScroll = () => {
            const shouldAddClass = window.pageYOffset > CONFIG.ANIMATION.NAVBAR_SCROLL_THRESHOLD;
            navbar.classList.toggle('scrolled', shouldAddClass);
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
    }
};

// ============================================
// Activity Management
// ============================================
const Activity = {
    /**
     * Create activity item DOM element
     */
    createActivityElement(activity) {
        const activityElement = DOM.create('div', 'activity-item');

        const dateElement = DOM.create('div', 'activity-date');
        dateElement.textContent = activity.date;
        activityElement.appendChild(dateElement);

        const contentWrapper = DOM.create('div', 'activity-content');
        activity.content.forEach(line => {
            const contentElement = DOM.create('p');
            contentElement.textContent = line;
            contentWrapper.appendChild(contentElement);
        });
        activityElement.appendChild(contentWrapper);

        return activityElement;
    },

    /**
     * Display activities in container
     */
    displayActivities(container, activities) {
        container.innerHTML = '';
        const recentActivities = activities.slice(0, CONFIG.ACTIVITY.DISPLAY_COUNT);
        recentActivities.forEach(activity => {
            container.appendChild(this.createActivityElement(activity));
        });
    },

    /**
     * Display error or empty message
     */
    displayMessage(container, message) {
        container.innerHTML = `<p class="activity-content">${message}</p>`;
    },

    /**
     * Fetch and display activity history
     */
    async fetch() {
        const container = DOM.getById('activity-list');
        if (!container) return;

        try {
            const response = await fetch(CONFIG.ACTIVITY.JSON_URL);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            if (data?.activities?.length > 0) {
                this.displayActivities(container, data.activities);
            } else {
                this.displayMessage(container, CONFIG.ACTIVITY.EMPTY_MESSAGE);
            }
        } catch (error) {
            console.error('活動履歴の読み込みに失敗しました:', error);
            this.displayMessage(container, CONFIG.ACTIVITY.ERROR_MESSAGE);
        }
    }
};

// ============================================
// Character Management
// ============================================
const CharacterLoader = {
    /**
     * Try loading character files from manifest
     */
    async loadFromManifest() {
        try {
            const response = await fetch(CONFIG.CHARACTER.MANIFEST_URL, { cache: 'no-cache' });
            if (!response.ok) return null;

            const manifest = await response.json();
            if (!manifest?.files || !Array.isArray(manifest.files)) return null;

            const filtered = Utils.filterImageFiles(manifest.files);
            const unique = Utils.unique(filtered);

            return unique.length >= CONFIG.CHARACTER.MIN_FILES ? unique : null;
        } catch (error) {
            return null;
        }
    },

    /**
     * Try loading character files from directory listing
     */
    async loadFromDirectory() {
        try {
            const response = await fetch(CONFIG.CHARACTER.DIRECTORY_URL);
            if (!response.ok) {
                return response.status === 403 || response.status === 404 ? null : null;
            }

            const html = await response.text();
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');

            const files = Array.from(doc.querySelectorAll('a[href]'))
                .map(link => link.getAttribute('href') || '')
                .map(href => href.split('/').pop() || '')
                .filter(name => CONFIG.CHARACTER.IMAGE_EXTENSIONS.test(name));

            const unique = Utils.unique(files);
            return unique.length >= CONFIG.CHARACTER.MIN_FILES ? unique : null;
        } catch (error) {
            console.warn('キャラクター画像一覧の取得に失敗したため、既定値を使用します。', error);
            return null;
        }
    },

    /**
     * Load character files with fallback strategy
     */
    async load() {
        const fromManifest = await this.loadFromManifest();
        if (fromManifest) {
            state.characterFiles = fromManifest;
            return;
        }

        const fromDirectory = await this.loadFromDirectory();
        if (fromDirectory) {
            state.characterFiles = fromDirectory;
            return;
        }

        state.characterFiles = [...CONFIG.CHARACTER.DEFAULT_FILES];
    }
};

const Character = {
    /**
     * Preload image to ensure it's cached
     */
    preloadImage(filename) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(filename);
            img.onerror = () => resolve(filename); // Resolve anyway to not block
            img.src = `${CONFIG.CHARACTER.DIRECTORY_URL}${filename}`;
        });
    },

    /**
     * Find character different from previous ones
     */
    findDifferentCharacter(shuffled, excludeList) {
        return shuffled.find(char => !excludeList.includes(char));
    },

    /**
     * Select two different random characters, avoiding previous selection
     */
    selectRandomPair() {
        const characters = state.characterFiles.length >= CONFIG.CHARACTER.MIN_FILES
            ? state.characterFiles
            : CONFIG.CHARACTER.DEFAULT_FILES;

        const shuffled = Utils.shuffleArray(characters);
        let [left, right] = shuffled;

        // Avoid repeating the same pair
        if (state.previousCharacters.length === 2) {
            const [prevLeft, prevRight] = state.previousCharacters;
            const isSamePair = (left === prevLeft && right === prevRight) ||
                               (left === prevRight && right === prevLeft);

            if (isSamePair && shuffled.length > 2) {
                left = this.findDifferentCharacter(shuffled, [prevLeft, prevRight]) || left;
                right = this.findDifferentCharacter(shuffled, [left, prevLeft, prevRight]) || right;
            }
        }

        state.previousCharacters = [left, right];
        return [left, right];
    },

    /**
     * Update character images in DOM
     */
    async updateImages() {
        const leftChar = DOM.get(CONFIG.SELECTORS.CHARACTER_LEFT);
        const rightChar = DOM.get(CONFIG.SELECTORS.CHARACTER_RIGHT);

        if (!leftChar || !rightChar) return;

        const [left, right] = this.selectRandomPair();

        // Preload images before updating src
        await Promise.all([
            this.preloadImage(left),
            this.preloadImage(right)
        ]);

        leftChar.src = `${CONFIG.CHARACTER.DIRECTORY_URL}${left}`;
        leftChar.setAttribute('data-character', Utils.removeExtension(left));

        rightChar.src = `${CONFIG.CHARACTER.DIRECTORY_URL}${right}`;
        rightChar.setAttribute('data-character', Utils.removeExtension(right));
    },

    /**
     * Preload all character images for smoother transitions
     */
    async preloadAllImages() {
        const imagesToPreload = state.characterFiles.length >= CONFIG.CHARACTER.MIN_FILES
            ? state.characterFiles
            : CONFIG.CHARACTER.DEFAULT_FILES;

        await Promise.all(imagesToPreload.map(file => this.preloadImage(file)));
    }
};

// ============================================
// Animation System
// ============================================
const Animation = {
    /**
     * Trigger logo jiggle animation
     */
    triggerLogoJiggle(logoElement) {
        logoElement.classList.remove('is-jiggle');
        DOM.forceReflow(logoElement);
        logoElement.classList.add('is-jiggle');
    },

    /**
     * Hide characters with slide out animation
     */
    hideCharacters(sectionElement) {
        sectionElement.classList.remove('show-characters');
        sectionElement.classList.add('hide-characters');
    },

    /**
     * Show characters with slide in animation
     */
    showCharacters(sectionElement) {
        sectionElement.classList.remove('hide-characters');
        DOM.forceReflow(sectionElement);

        setTimeout(() => {
            sectionElement.classList.add('show-characters');
        }, CONFIG.ANIMATION.RENDER_DELAY);
    },

    /**
     * Perform complete character swap animation sequence
     */
    async performCharacterSwap(heroSection, heroLogo) {
        // Start animations
        this.triggerLogoJiggle(heroLogo);
        this.hideCharacters(heroSection);

        // Wait for slide out to complete
        await new Promise(resolve => setTimeout(resolve, CONFIG.ANIMATION.SLIDE_OUT_DURATION));

        // Update images and wait for preload
        await Character.updateImages();

        // Wait brief delay before showing
        await new Promise(resolve => setTimeout(resolve, CONFIG.ANIMATION.SLIDE_IN_DELAY));

        // Show characters
        this.showCharacters(heroSection);

        // Wait for jiggle to complete
        await new Promise(resolve => setTimeout(resolve, CONFIG.ANIMATION.JIGGLE_DURATION - CONFIG.ANIMATION.SLIDE_OUT_DURATION - CONFIG.ANIMATION.SLIDE_IN_DELAY));

        // Clean up
        heroLogo.classList.remove('is-jiggle');
    },

    /**
     * Setup hero section click animation handler
     */
    setupHeroAnimation() {
        const heroSection = DOM.get(CONFIG.SELECTORS.HERO_SECTION);
        const heroLogo = DOM.get(CONFIG.SELECTORS.HERO_LOGO);
        const heroMainRow = DOM.get(CONFIG.SELECTORS.HERO_MAIN_ROW);

        if (!heroSection || !heroLogo || !heroMainRow) return;

        const handleClick = async (e) => {
            // Ignore clicks on interactive elements
            if (e.target.closest('a') || e.target.closest('button')) return;

            // Prevent animation overlap
            if (state.isAnimating) return;

            state.isAnimating = true;

            try {
                await this.performCharacterSwap(heroSection, heroLogo);
            } finally {
                state.isAnimating = false;
            }
        };

        heroMainRow.addEventListener('click', handleClick);
    }
};

// ============================================
// Application Initialization
// ============================================
const App = {
    /**
     * Initialize all application components
     */
    async init() {
        // UI setup
        UI.updateFooterYear();
        UI.setupNavbarScroll();
        UI.updateLogoHint();

        // Load content
        Activity.fetch();
        await CharacterLoader.load();

        // Preload all character images
        await Character.preloadAllImages();

        // Display initial characters
        await Character.updateImages();

        // Setup interactions
        Animation.setupHeroAnimation();
    }
};

// Start application when DOM is ready
document.addEventListener('DOMContentLoaded', () => App.init());
