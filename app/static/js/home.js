const HomePage = {
    _results: [],
    _currentIndex: 0,
    _observer: null,
    _batchSize: 10,

    search(q) {
        const r = document.getElementById('home-results');
        if (this._observer) {
            this._observer.disconnect();
            this._observer = null;
        }
        this._results = [];
        this._currentIndex = 0;
        r.innerHTML = `<div class="flex justify-center p-10"><i data-lucide="loader-2" class="animate-spin text-white"></i></div>`;
        lucide.createIcons();

        fetch(`${API}/search?q=${encodeURIComponent(q)}&limit=50`)
            .then(res => res.json())
            .then(data => {
                if (data.error) {
                    r.innerHTML = `<p class="text-red-400 text-center">${data.error}</p>`;
                    return;
                }
                this._results = data.results || [];
                if (!this._results.length) {
                    r.innerHTML = `<p class="text-center mt-10 opacity-40">No results</p>`;
                    return;
                }
                r.innerHTML = '';
                this.renderNextBatch();
            })
            .catch(() => {
                r.innerHTML = `<p class="text-red-400 text-center">Backend offline</p>`;
            });
    },

    renderNextBatch() {
        const r = document.getElementById('home-results');
        if (!r) return;
        const sentinel = document.getElementById('home-scroll-sentinel');
        if (sentinel) sentinel.remove();

        const batch = this._results.slice(this._currentIndex, this._currentIndex + this._batchSize);
        this._currentIndex += batch.length;
        r.insertAdjacentHTML('beforeend', batch.map(track => this.resultRow(track)).join(''));

        if (this._currentIndex < this._results.length) {
            r.insertAdjacentHTML('beforeend', '<div id="home-scroll-sentinel" class="h-12 flex items-center justify-center"><i data-lucide="loader-2" class="w-4 h-4 animate-spin text-zinc-500"></i></div>');
            this.observeSentinel();
        }
        lucide.createIcons();
    },

    observeSentinel() {
        const sentinel = document.getElementById('home-scroll-sentinel');
        if (!sentinel) return;
        if (this._observer) this._observer.disconnect();
        this._observer = new IntersectionObserver((entries) => {
            if (entries.some(entry => entry.isIntersecting)) {
                this.renderNextBatch();
            }
        }, {
            root: document.getElementById('content-area') || null,
            rootMargin: '240px 0px',
            threshold: 0.01
        });
        this._observer.observe(sentinel);
    },

    resultRow(track) {
        const safeTitle = escAttr(track.title);
        const safeArtist = escAttr(track.artist);
        return `
            <div class="glass-pill p-4 rounded-2xl flex items-center gap-4 mb-3 active:scale-95 transition-transform"
                 onclick="HomePage.playTrack('${track.id}','${safeTitle}','${safeArtist}','${track.thumbnail}')">
                <img src="${track.thumbnail}" class="w-12 h-12 rounded-xl object-cover shrink-0">
                <div class="min-w-0">
                    <p class="font-bold text-sm truncate">${track.title}</p>
                    <p class="text-xs text-zinc-500 truncate">${track.artist}</p>
                </div>
                <i data-lucide="play" class="w-5 h-5 ml-auto text-white shrink-0"></i>
            </div>`;
    },

    playTrack(id, title, artist, thumbnail) {
        const proxyUrl = `${API}/proxy/${id}`;
        App.playTrack(id, title, artist, proxyUrl, thumbnail);
    }
};
