/**
 * home.js
 * Responsibility: Home page with quick-play suggestions and inline search.
 */

const HomePage = {
    _suggestions: [
        'Midnight City M83',
        'Starboy The Weeknd',
        'Blinding Lights',
        'As It Was Harry Styles',
        'Levitating Dua Lipa',
        'Heat Waves Glass Animals'
    ],

    /**
     * Render the home page.
     * @param {HTMLElement} container
     */
    render(container) {
        container.innerHTML = `
            <h2 class="text-4xl font-black tracking-tighter mb-6 italic">FOR YOU</h2>
            <div class="relative mb-6">
                <i data-lucide="search" class="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500"></i>
                <input type="text" id="home-input" placeholder="What do you want to play?"
                    class="w-full bg-zinc-900 border border-white/10 rounded-2xl py-4 pl-12 text-white outline-none focus:border-white"
                    onkeypress="if(event.key==='Enter') HomePage.search(this.value)">
            </div>
            <div id="home-results">
                <p class="text-[10px] uppercase tracking-widest text-zinc-600 font-black mb-3">Quick Play</p>
                <div class="space-y-3">
                    ${this._suggestions.map(q => `
                        <div class="glass-pill p-4 rounded-2xl flex items-center gap-4 active:scale-95 transition-transform"
                             onclick="HomePage.search('${q}')">
                            <div class="w-10 h-10 bg-zinc-800 rounded-full flex items-center justify-center shrink-0">
                                <i data-lucide="music" class="w-4 h-4 text-zinc-400"></i>
                            </div>
                            <p class="font-semibold text-sm">${q}</p>
                            <i data-lucide="play" class="w-4 h-4 ml-auto text-zinc-500"></i>
                        </div>`).join('')}
                </div>
            </div>`;
        lucide.createIcons();
    },

    /**
     * Search from home page and show results inline.
     * @param {string} q - Search query
     */
    search(q) {
        const r = document.getElementById('home-results');
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

                let html = '<div class="space-y-3">';
                data.results.forEach(track => {
                    const thumb = track.thumbnail
                        ? `<img src="${track.thumbnail}" class="w-12 h-12 rounded-xl object-cover shrink-0">`
                        : `<div class="w-12 h-12 bg-zinc-800 rounded-xl flex items-center justify-center shrink-0"><i data-lucide="music" class="w-4 h-4"></i></div>`;

                    const escapedTitle = track.title.replace(/'/g, "\\'");
                    const escapedArtist = track.artist.replace(/'/g, "\\'");

                    html += `
                        <div class="glass-pill p-4 rounded-2xl flex items-center gap-4 active:scale-95 transition-transform"
                             onclick="Player.play('${track.id}', '${escapedTitle}', '${escapedArtist}', '${track.thumbnail || ''}')">
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
    }
};
