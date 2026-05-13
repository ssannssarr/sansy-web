/**
 * search.js
 * Responsibility: Search page rendering and logic.
 * Handles the /search endpoint, displays results, and triggers playback.
 */

const SearchPage = {
    _lastResults: [],

    /**
     * Render the search page into the given container.
     * @param {HTMLElement} container
     */
    render(container) {
        container.innerHTML = `
            <h2 class="text-4xl font-black tracking-tighter mb-6 italic">SEARCH</h2>
            <div class="relative mb-6">
                <i data-lucide="search" class="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500"></i>
                <input type="text" placeholder="Search songs, artists…"
                    class="w-full bg-zinc-900 border border-white/10 rounded-2xl py-4 pl-12 text-white outline-none focus:border-white"
                    onkeypress="if(event.key==='Enter') SearchPage.run(this.value)">
            </div>
            <div id="search-results"></div>`;
        lucide.createIcons();
    },

    /**
     * Execute search query and display results.
     * @param {string} q - Search query
     */
    run(q) {
        const r = document.getElementById('search-results');
        r.innerHTML = `<div class="flex justify-center p-10"><i data-lucide="loader-2" class="animate-spin text-white"></i></div>`;
        lucide.createIcons();

        SansyAPI.search(q)
            .then(data => {
                if (data.error) {
                    r.innerHTML = `<p class="text-red-400 text-center">${data.error}</p>`;
                    return;
                }

                if (!data.results || data.results.length === 0) {
                    r.innerHTML = `<p class="text-center text-zinc-500 mt-10">No results found</p>`;
                    return;
                }

                this._lastResults = data.results;

                let html = '<div class="space-y-3">';
                data.results.forEach(track => {
                    const thumb = track.thumbnail
                        ? `<img src="${track.thumbnail}" class="w-12 h-12 rounded-xl object-cover shrink-0">`
                        : `<div class="w-12 h-12 bg-zinc-800 rounded-xl flex items-center justify-center shrink-0"><i data-lucide="music" class="w-4 h-4"></i></div>`;

                    html += `
                        <div class="glass-pill p-4 rounded-2xl flex items-center gap-4 active:scale-95 transition-transform"
                             onclick="SearchPage.playResult('${track.id}', '${this._escape(track.title)}', '${this._escape(track.artist)}', '${track.thumbnail || ''}')">
                            ${thumb}
                            <div class="min-w-0 flex-1">
                                <p class="font-bold text-sm truncate">${track.title}</p>
                                <p class="text-xs text-zinc-500 truncate">${track.artist}</p>
                            </div>
                            <i data-lucide="play" class="w-5 h-5 text-white shrink-0"></i>
                        </div>`;
                });
                html += '</div>';
                r.innerHTML = html;
                lucide.createIcons();
            })
            .catch(() => {
                r.innerHTML = `<p class="text-red-400 text-center">Backend offline</p>`;
            });
    },

    /**
     * Play a track from search results.
     */
    playResult(id, title, artist, thumbnail) {
        Player.play(id, title, artist, thumbnail);
    },

    /**
     * Escape single quotes for inline onclick handlers.
     */
    _escape(str) {
        return str.replace(/'/g, "\\'").replace(/"/g, '&quot;');
    }
};
