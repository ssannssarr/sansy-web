/**
 * gestures.js
 * Responsibility: Touch gesture handling for the full player.
 * Swipe down to close, visual feedback for actions.
 */

const Gestures = {
    startY: 0,
    isDragging: false,

    /**
     * Initialize gesture listeners on the full player.
     */
    init() {
        const player = document.getElementById('full-player');
        if (!player) return;

        player.addEventListener('touchstart', (e) => {
            // Don't capture gestures on interactive elements
            if (e.target.closest('#options-menu') ||
                e.target.closest('button') ||
                e.target.closest('input') ||
                e.target.closest('#progress-bar-wrap')) {
                return;
            }
            this.startY = e.touches[0].clientY;
            this.isDragging = true;
            player.style.transition = 'none';
        }, { passive: true });

        player.addEventListener('touchmove', (e) => {
            if (!this.isDragging) return;
            const delta = e.touches[0].clientY - this.startY;
            if (delta > 0) {
                player.style.transform = `translateY(${delta}px)`;
            }
        }, { passive: true });

        player.addEventListener('touchend', (e) => {
            if (!this.isDragging) return;
            this.isDragging = false;
            player.style.transition = '';

            const delta = e.changedTouches[0].clientY - this.startY;
            if (delta > 150) {
                // Swiped down far enough — close player
                App.toggleFullPlayer();
            } else {
                // Snap back
                player.style.transform = '';
            }
        }, { passive: true });
    },

    /**
     * Show a brief feedback icon overlay.
     * @param {string} icon - Lucide icon name (e.g., 'check', 'heart')
     */
    showFeedback(icon) {
        const overlay = document.getElementById('gesture-feedback');
        const iconEl = document.getElementById('gesture-icon');

        if (!overlay || !iconEl) return;

        iconEl.setAttribute('data-lucide', icon);
        lucide.createIcons();

        overlay.classList.remove('opacity-0');
        setTimeout(() => overlay.classList.add('opacity-0'), 600);
    }
};
