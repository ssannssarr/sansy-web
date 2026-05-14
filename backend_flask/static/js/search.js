const SearchPage = {
    _lastResult: null,

    run(q) {
        const r = document.getElementById('search-results');
        r.innerHTML = `<div class="flex justify-center p-10"><i data-lucide="loader-2" class="animate-spin text-white"></i></div>`;
        lucide.createIcons();

        fetch(`${API}/search?q=${encodeURIComponent(q)}&limit=5`)
            .then(res => res.json())
            .then(data => {
                if (data.error) {
                    r.innerHTML = `<p class="text-red-400 text-center">${data.error}</p>`;
                    return;
                }
                if (!data.results || data.results.length === 0) {
                    r.innerHTML = `<p class="text-center mt-10 opacity-40">No results</p>`;
                    return;
                }
                let html = '';
                data.results.forEach(track => {
                    const safeTitle = escAttr(track.title);
                    const safeArtist = escAttr(track.artist);
                    html += `
                        <div class="glass-pill p-4 rounded-2xl flex items-center gap-4 mb-3 active:scale-95 transition-transform"
                             onclick="SearchPage.play('${track.id}','${safeTitle}','${safeArtist}','${track.thumbnail}')">
                            <img src="${track.thumbnail}" class="w-12 h-12 rounded-xl object-cover shrink-0">
                            <div class="min-w-0">
                                <p class="font-bold text-sm truncate">${track.title}</p>
                                <p class="text-xs text-zinc-500 truncate">${track.artist}</p>
                            </div>
                            <i data-lucide="play" class="w-5 h-5 ml-auto text-white shrink-0"></i>
                        </div>`;
                });
                r.innerHTML = html;
                lucide.createIcons();
            })
            .catch(() => {
                r.innerHTML = `<p class="text-red-400 text-center">Backend offline</p>`;
            });
    },

    play(id, title, artist, thumbnail) {
        const proxyUrl = `${API}/proxy/${id}`;
        App.playTrack(id, title, artist, proxyUrl, thumbnail);
    }
};
