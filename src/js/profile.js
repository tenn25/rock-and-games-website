/**
 * Profile Page JavaScript
 * Handles loading and displaying activity data
 */

// Load activity data
async function loadActivities() {
    const container = document.getElementById('activity-container');

    try {
        const response = await fetch('contents/activity.json');
        const data = await response.json();

        if (data && data.activities && data.activities.length > 0) {
            container.innerHTML = '';

            data.activities.forEach(activity => {
                const card = document.createElement('div');
                card.className = 'activity-card';

                let contentHtml = '';
                if (activity.content && activity.content.length > 0) {
                    contentHtml = activity.content.map(item => {
                        return `
                            <div class="activity-content-item">
                                <p>${item}</p>
                            </div>
                        `;
                    }).join('');
                }

                card.innerHTML = `
                    <p class="activity-date">${activity.date}</p>
                    ${contentHtml}
                `;

                container.appendChild(card);
            });
        } else {
            container.innerHTML = '<div class="activity-card"><p class="activity-description">活動履歴はありません。</p></div>';
        }
    } catch (error) {
        console.error('活動履歴の読み込みに失敗しました:', error);
        container.innerHTML = '<div class="activity-card"><p class="activity-description">活動履歴の読み込みに失敗しました。</p></div>';
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', loadActivities);

// Smooth scroll for anchor links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        document.querySelector(this.getAttribute('href')).scrollIntoView({
            behavior: 'smooth'
        });
    });
});
