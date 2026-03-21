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

// Function to randomize characters
function randomizeCharacters() {
    const characters = ['anubis.png', 'Bastet.png', 'Horus.png', 'kunum.png', 'seto.png'];
    const leftChar = document.querySelector('.character-peek-left');
    const rightChar = document.querySelector('.character-peek-right');

    // Shuffle and pick 2 different characters
    const shuffled = characters.sort(() => 0.5 - Math.random());
    if (leftChar) {
        leftChar.src = `images/character/${shuffled[0]}`;
        leftChar.setAttribute('data-character', shuffled[0].replace('.png', '').toLowerCase());
    }
    if (rightChar) {
        rightChar.src = `images/character/${shuffled[1]}`;
        rightChar.setAttribute('data-character', shuffled[1].replace('.png', '').toLowerCase());
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    fetchActivityHistory();

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

        // モバイル用: 初回タップで表示
        let firstTouch = true;
        heroSection.addEventListener('touchstart', function(e) {
            e.preventDefault();
            if (firstTouch) {
                showCharacters();
                firstTouch = false;
            } else if (isShown && !isAnimating) {
                // 2回目以降のタップで切り替え
                switchCharacters();
            }
        });

        // クリックイベント（キャラクター切り替え用）
        heroSection.addEventListener('click', function(e) {
            // リンクやボタンのクリックは除外
            if (e.target.closest('a') || e.target.closest('button')) {
                return;
            }

            if (!isShown) {
                showCharacters();
            } else {
                switchCharacters();
            }
        });
    }
});
