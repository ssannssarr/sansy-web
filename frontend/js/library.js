/**
 * library.js
 * Responsibility: Liked songs management (localStorage-based).
 * Handles like/unlike toggle, rendering the library view, and persistence.
 */

const Library = {
    songs: [],

    /**
     * Load liked songs from localStorage on app init.
     */
    init() {
        const stored = localStorage.getItem('s_lib');
        if (stored) {
            try {
                this.songs = JSON.parse(stored);
            } catch (e) {
                this.songs = [];
            }
        }
    },

    /**
     * Toggle like status for current track.
     * @param {Event} event - Click event
     */
    toggleLike(event) {
        if (event) event.stopPropagation();

        const t = App.state.currentTrack;
        if (!t || !t.id) return;

        const index = this.songs.findIndex(s => s.id === t.id);
        if (index > -1) {
            this.songs.splice(index, 1);
        } else {
            this.songs.push({ ...t });
        }

        this._save();
        App.updateUI();
    },

    /**
     * Check if current track is liked and update heart icon.
     */
    updateLikeButton() {
        const icon = document.getElementById('like-icon');
        if (!icon) return;

        const t = App.state.currentTrack;
        const isLiked = t && t.id && this.songs.some(s => s.id === t.id);

        icon.setAttribute('data-lucide', isLiked ? 'heart' : 'plus');
        icon.className = isLiked
            ? 'w-5 h-5 text-white fill-current'
            : 'w-5 h-5 text-zinc-300';
    },

    /**
     * Render the library view.
     * @param {HTMLElement} container
     */
    render(container) {
        let html = `<h2 class="text-4xl font-black tracking-tighter mb-8 italic">LIBRARY</h2>`;

        if (this.songs.length === 0) {
            html += `<p class="text-center mt-20 opacity-40">No liked tracks</p>`;
        } else {
            this.songs.forEach(s => {
                const thumb = s.thumbnail
                    ? `<img src="${s.thumbnail}" class="w-10 h-10 rounded-full object-cover shrink-0">`
                    : `<div class="w-10 h-10 bg-zinc-800 rounded-full flex items-center justify-center shrink-0"><i data-lucide="music" class="w-4 h-4"></i></div>`;

                const escapedTitle = s.title.replace(/'/g, "\\'");
                const escapedArtist = s.artist.replace(/'/g, "\\'");

                html += `
                    <div class="glass-pill p-4 rounded-2xl flex items-center gap-4 mb-3 active:scale-95 transition-transform"
                         onclick="Player.play('${s.id}', '${escapedTitle}', '${escapedArtist}', '${s.thumbnail || ''}')">
                        ${thumb}
                        <div class="min-w-0">
                            <p class="font-bold text-sm truncate">${s.title}</p>
                            <p class="text-xs text-zinc-500 truncate">${s.artist}</p>
                        </div>
                        <i data-lucide="play" class="w-4 h-4 ml-auto shrink-0 text-zinc-500"></i>
                    </div>`;
            });
        }

        container.innerHTML = html;
        lucide.createIcons();
    },

    /**
     * Save songs to localStorage.
     */
    _save() {
        localStorage.setItem('s_lib', JSON.stringify(this.songs));
    }
};
