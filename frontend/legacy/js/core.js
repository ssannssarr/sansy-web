const API = `${window.location.origin}/api`;

function escAttr(str) {
    return str.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/"/g, '&quot;').replace(/`/g, '\\`');
}

const App = {
    state: {
        isSidebarOpen: false,
        isFullPlayerOpen: false,
        isPlaying: false,
        currentView: 'home',
        isOptionsMenuOpen: false,
        isFullscreen: false,
        menuView: 'main',
        currentTrack: { id: '', title: '', artist: '', thumbnail: '' },
        discClickCount: 0,
        discClickTimer: null,
        settings: { highQuality: true, dataSaver: false, sleepTimer: 0 }
    },

    _audio: null,
    _sleepTimerId: null,

    init() {
        // Load settings
        const saved = localStorage.getItem('s_settings');
        if (saved) {
            try { Object.assign(this.state.settings, JSON.parse(saved)); } catch(e) {}
        }

        this.Library.init();
        this.Gestures.init();
        this.Player.initSeek();
        this.checkBackendStatus();

        window.addEventListener('click', (e) => {
            if (this.state.isOptionsMenuOpen &&
                !e.target.closest('#options-menu') &&
                !e.target.closest('[onclick*="toggleOptionsMenu"]')) {
                this.state.isOptionsMenuOpen = false;
                this.updateUI();
            }
        });

        lucide.createIcons();
    },

    async checkBackendStatus() {
        try {
            const resp = await fetch(`${API}/health`);
            if (!resp.ok) throw new Error();
        } catch (err) {
            this.toast("Backend is waking up, please wait...");
        }
    },

    navigate(path) {
        window.location.href = path;
    },

    toast(msg, duration = 2500) {
        const t = document.getElementById('toast');
        t.innerText = msg;
        t.classList.remove('opacity-0');
        clearTimeout(this._toastTimer);
        this._toastTimer = setTimeout(() => t.classList.add('opacity-0'), duration);
    },

    handleDiscClick(event) {
        if (event) event.stopPropagation();
        this.state.discClickCount++;
        if (this.state.discClickCount === 1) {
            this.state.discClickTimer = setTimeout(() => {
                this.toggleFullPlayer();
                this.state.discClickCount = 0;
            }, 250);
        } else if (this.state.discClickCount === 2) {
            clearTimeout(this.state.discClickTimer);
            this.togglePlay(event);
            this.state.discClickCount = 0;
        }
    },

    toggleSidebar() {
        this.state.isSidebarOpen = !this.state.isSidebarOpen;
        document.getElementById('sidebar').classList.toggle('-translate-x-full', !this.state.isSidebarOpen);
        const overlay = document.getElementById('sidebar-overlay');
        overlay.classList.toggle('opacity-0', !this.state.isSidebarOpen);
        overlay.classList.toggle('pointer-events-none', !this.state.isSidebarOpen);
    },

    toggleFullPlayer() {
        this.state.isFullPlayerOpen = !this.state.isFullPlayerOpen;
        const player = document.getElementById('full-player');
        player.style.transform = '';
        if (this.state.isFullPlayerOpen) {
            player.classList.remove('translate-y-full');
            player.classList.add('translate-y-0');
        } else {
            player.classList.add('translate-y-full');
            player.classList.remove('translate-y-0');
            this.state.isOptionsMenuOpen = false;
            if (this.state.isFullscreen) this.toggleFullscreen();
        }
        this.updateUI();
    },

    playTrack(id, title, artist, streamUrl = null, thumbnail = '') {
        this.state.currentTrack = { id, title, artist, thumbnail };
        document.getElementById('player-title').innerText = title;
        document.getElementById('player-artist').innerText = artist;

        const thumb = document.getElementById('player-thumb');
        const ph = document.getElementById('player-placeholder');
        const diskImg = document.getElementById('disk-img');
        if (thumbnail) {
            thumb.src = thumbnail;
            thumb.classList.remove('hidden');
            ph.classList.add('hidden');
            diskImg.src = thumbnail;
        } else {
            thumb.classList.add('hidden');
            ph.classList.remove('hidden');
        }

        this.state.isPlaying = true;

        if (!this._audio) {
            this._audio = new Audio();
            this._audio.preload = 'auto';
            this._audio.addEventListener('ended', () => App.Player.skip(1));
            this._audio.addEventListener('error', (e) => {
                const err = this._audio.error;
                console.error("Audio error details:", err);
                let msg = "Playback failed: blocked by browser or backend unresponsive";
                if (err) {
                    switch (err.code) {
                        case 1: msg = "Playback aborted by user"; break;
                        case 2: msg = "Network error: check your connection"; break;
                        case 3: msg = "Audio decoding failed"; break;
                        case 4: msg = "Audio source not supported or backend error"; break;
                    }
                }
                this.toast(msg);
                this.state.isPlaying = false;
                this.updateUI();
            });
        }

        const url = streamUrl || `${API}/proxy/${id}`;
        if (this._audio.dataset.src !== url) {
            this._audio.dataset.src = url;
            this._audio.src = url;
            this._audio.play().catch(e => {
                console.error('Playback failed:', e);
                this.toast("Playback failed: blocked by browser or backend unresponsive");
                this.state.isPlaying = false;
                this.updateUI();
            });
            this.Player.startTracking();
        }

        if (!this.state.isFullPlayerOpen) this.toggleFullPlayer();
        else this.updateUI();
    },

    togglePlay(event) {
        if (event) event.stopPropagation();
        this.state.isPlaying = !this.state.isPlaying;
        if (this._audio) {
            if (this.state.isPlaying) {
                this._audio.play().catch(e => {
                    console.error('Playback failed:', e);
                    this.toast("Playback failed: blocked by browser or unresponsive");
                    this.state.isPlaying = false;
                    this.updateUI();
                });
                this.Player.startTracking();
            } else {
                this._audio.pause();
                this.Player.stopTracking();
            }
        }
        this.updateUI();
    },

    toggleOptionsMenu(event) {
        if (event) event.stopPropagation();
        this.state.isOptionsMenuOpen = !this.state.isOptionsMenuOpen;
        this.state.menuView = 'main';
        this.updateUI();
    },

    setMenuView(view, event) {
        if (event) { event.preventDefault(); event.stopPropagation(); }
        this.state.menuView = view;
        this.renderOptionsMenu();
    },

    renderOptionsMenu() {
        const container = document.getElementById('menu-content');
        if (!container) return;
        const backBtn = `<button onclick="App.setMenuView('main',event)" ontouchstart="App.setMenuView('main',event)" class="w-full flex items-center gap-2 p-2 text-[10px] font-bold text-zinc-500"><i data-lucide="chevron-left" class="w-3 h-3"></i> BACK</button><div class="h-px bg-white/10 mb-1"></div>`;
        const ic = "w-full flex items-center gap-3 p-3 text-sm font-semibold hover:bg-white/10 rounded-xl transition-colors tap-highlight-none";
        let html = '';
        if (this.state.menuView === 'audio') {
            html = backBtn +
                `<button class="${ic}" onclick="App.selectQuality('320k',event)" ontouchstart="App.selectQuality('320k',event)">320kbps <span class="text-[9px] text-zinc-500 ml-auto">HIGH</span></button>
                 <button class="${ic}" onclick="App.selectQuality('128k',event)" ontouchstart="App.selectQuality('128k',event)">128kbps</button>`;
        } else if (this.state.menuView === 'video') {
            html = backBtn +
                `<button class="${ic}" onclick="App.selectQuality('1080p',event)" ontouchstart="App.selectQuality('1080p',event)">1080p <span class="text-[9px] ml-auto">HD</span></button>
                 <button class="${ic}" onclick="App.selectQuality('720p',event)" ontouchstart="App.selectQuality('720p',event)">720p</button>
                 <button class="${ic}" onclick="App.selectQuality('480p',event)" ontouchstart="App.selectQuality('480p',event)">480p</button>`;
        } else if (this.state.menuView === 'download') {
            html = backBtn +
                `<p class="text-[9px] text-zinc-600 px-3 font-black uppercase tracking-widest py-1">Audio</p>
                 <button class="${ic}" onclick="App.selectQuality('DL-320k',event)" ontouchstart="App.selectQuality('DL-320k',event)">MP3 – 320kbps</button>
                 <button class="${ic}" onclick="App.selectQuality('DL-128k',event)" ontouchstart="App.selectQuality('DL-128k',event)">MP3 – 128kbps</button>
                 <p class="text-[9px] text-zinc-600 px-3 font-black uppercase tracking-widest py-1 mt-1">Video</p>
                 <button class="${ic}" onclick="App.selectQuality('DL-1080p',event)" ontouchstart="App.selectQuality('DL-1080p',event)">MP4 – 1080p</button>
                 <button class="${ic}" onclick="App.selectQuality('DL-720p',event)" ontouchstart="App.selectQuality('DL-720p',event)">MP4 – 720p</button>`;
        } else {
            html =
                `<button onclick="App.setMenuView('audio',event)" ontouchstart="App.setMenuView('audio',event)" class="${ic}"><i data-lucide="music" class="w-4 h-4"></i> Audio Only <i data-lucide="chevron-right" class="w-3 h-3 ml-auto opacity-30"></i></button>
                 <button onclick="App.setMenuView('video',event)" ontouchstart="App.setMenuView('video',event)" class="${ic}"><i data-lucide="video" class="w-4 h-4"></i> Watch Video <i data-lucide="chevron-right" class="w-3 h-3 ml-auto opacity-30"></i></button>
                 <div class="h-px bg-white/10 my-1"></div>`;
        }
        container.innerHTML = html;
        lucide.createIcons();
    },

    selectQuality(q, event) {
        if (event) { event.preventDefault(); event.stopPropagation(); }
        const track = this.state.currentTrack;
        if (!track?.title) { this.toast('No track loaded'); return; }
        this.state.isOptionsMenuOpen = false;
        this.updateUI();
        this.toast('Quality: ' + q);
    },

    toggleFullscreen(event) {
        if (event) event.stopPropagation();
        this.state.isFullscreen = !this.state.isFullscreen;
        document.getElementById('video-frame').classList.toggle('fullscreen-active', this.state.isFullscreen);
        document.getElementById('fs-icon').setAttribute('data-lucide', this.state.isFullscreen ? 'minimize' : 'maximize');
        lucide.createIcons();
    },

    saveSettings() {
        localStorage.setItem('s_settings', JSON.stringify(this.state.settings));
    },

    startSleepTimer(minutes) {
        this.stopSleepTimer();
        if (minutes <= 0) return;
        this._sleepTimerId = setTimeout(() => {
            if (this._audio) {
                this._audio.pause();
                this.state.isPlaying = false;
                this.updateUI();
                this.toast('Sleep timer ended');
            }
        }, minutes * 60 * 1000);
    },

    stopSleepTimer() {
        if (this._sleepTimerId) {
            clearTimeout(this._sleepTimerId);
            this._sleepTimerId = null;
        }
    },

    updateUI() {
        const disk = document.getElementById('disk-art');
        if (this.state.isPlaying) disk.classList.remove('paused');
        else disk.classList.add('paused');
        document.getElementById('full-play-icon').setAttribute('data-lucide', this.state.isPlaying ? 'pause' : 'play');
        const menu = document.getElementById('options-menu');
        menu.classList.toggle('opacity-0', !this.state.isOptionsMenuOpen);
        menu.classList.toggle('pointer-events-none', !this.state.isOptionsMenuOpen);
        menu.classList.toggle('scale-95', !this.state.isOptionsMenuOpen);
        if (this.state.isOptionsMenuOpen) this.renderOptionsMenu();
        this.Library.updateLikeButton();
        lucide.createIcons();
    },

    Player: {
        _queue: [],
        _queueIndex: 0,
        _ticker: null,

        setQueue(tracks, index = 0) {
            this._queue = tracks;
            this._queueIndex = index;
        },

        skip(dir) {
            const audio = App._audio;
            if (!audio) return;
            if (this._queue.length > 1) {
                this._queueIndex = (this._queueIndex + dir + this._queue.length) % this._queue.length;
                const t = this._queue[this._queueIndex];
                const proxyUrl = `${API}/proxy/${t.id}`;
                App.playTrack(t.id, t.title, t.artist, proxyUrl, t.thumbnail || '');
            } else {
                if (audio.duration) {
                    audio.currentTime = Math.max(0, Math.min(audio.duration, audio.currentTime + dir * 10));
                }
            }
        },

        formatTime(s) {
            if (!s || isNaN(s)) return '0:00';
            const m = Math.floor(s / 60);
            const sec = Math.floor(s % 60).toString().padStart(2, '0');
            return `${m}:${sec}`;
        },

        initSeek() {
            const wrap = document.getElementById('progress-bar-wrap');
            let isScrubbing = false;
            const seekTo = (clientX, commit = true) => {
                const audio = App._audio;
                if (!audio || !audio.duration) return;
                const rect = wrap.getBoundingClientRect();
                const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
                const time = pct * audio.duration;
                const fill = document.getElementById('progress-fill');
                const cur = document.getElementById('time-current');
                if (fill) fill.style.width = (pct * 100) + '%';
                if (cur) cur.innerText = this.formatTime(time);
                if (commit) audio.currentTime = time;
            };
            wrap.addEventListener('pointerdown', (e) => {
                isScrubbing = true;
                wrap.setPointerCapture(e.pointerId);
                e.preventDefault();
                e.stopPropagation();
                seekTo(e.clientX, false);
            }, true);
            wrap.addEventListener('pointermove', (e) => {
                if (!isScrubbing) return;
                e.preventDefault();
                e.stopPropagation();
                seekTo(e.clientX, false);
            }, true);
            wrap.addEventListener('pointerup', (e) => {
                if (!isScrubbing) return;
                isScrubbing = false;
                e.preventDefault();
                e.stopPropagation();
                seekTo(e.clientX, true);
            }, true);
        },

        startTracking() {
            if (this._ticker) clearInterval(this._ticker);
            this._ticker = setInterval(() => {
                const audio = App._audio;
                if (!audio || !audio.duration) return;
                const pct = (audio.currentTime / audio.duration) * 100;
                const fill = document.getElementById('progress-fill');
                const cur  = document.getElementById('time-current');
                const tot  = document.getElementById('time-total');
                if (fill) fill.style.width = pct + '%';
                if (cur)  cur.innerText = this.formatTime(audio.currentTime);
                if (tot)  tot.innerText = this.formatTime(audio.duration);
            }, 500);
        },

        stopTracking() {
            if (this._ticker) clearInterval(this._ticker);
        }
    },

    Library: {
        songs: [],
        init() {
            const s = localStorage.getItem('s_lib');
            if (s) this.songs = JSON.parse(s);
        },
        toggleLike(event) {
            if (event) event.stopPropagation();
            const t = App.state.currentTrack;
            const i = this.songs.findIndex(s => s.id === t.id);
            if (i > -1) this.songs.splice(i, 1); else this.songs.push(t);
            localStorage.setItem('s_lib', JSON.stringify(this.songs));
            App.updateUI();
        },
        updateLikeButton() {
            const icon = document.getElementById('like-icon');
            const isLiked = this.songs.some(s => s.id === App.state.currentTrack.id);
            icon.setAttribute('data-lucide', isLiked ? 'heart' : 'plus');
            icon.className = isLiked ? 'w-5 h-5 text-white fill-current' : 'w-5 h-5 text-zinc-300';
        }
    },

    Gestures: {
        startY: 0, isDragging: false,
        init() {
            const p = document.getElementById('full-player');
            p.addEventListener('touchstart', (e) => {
                if (e.target.closest('#options-menu') || e.target.closest('button') ||
                    e.target.closest('input') || e.target.closest('#progress-bar-wrap')) return;
                this.startY = e.touches[0].clientY;
                this.isDragging = true;
                p.style.transition = 'none';
            }, {passive: true});
            p.addEventListener('touchmove', (e) => {
                if (!this.isDragging) return;
                const d = e.touches[0].clientY - this.startY;
                if (d > 0) p.style.transform = `translateY(${d}px)`;
            }, {passive: true});
            p.addEventListener('touchend', (e) => {
                if (!this.isDragging) return;
                this.isDragging = false;
                p.style.transition = '';
                const d = e.changedTouches[0].clientY - this.startY;
                if (d > 150) App.toggleFullPlayer(); else p.style.transform = '';
            }, {passive: true});
        },
        showFeedback(icon) {
            const f = document.getElementById('gesture-feedback');
            document.getElementById('gesture-icon').setAttribute('data-lucide', icon);
            lucide.createIcons();
            f.classList.remove('opacity-0');
            setTimeout(() => f.classList.add('opacity-0'), 600);
        }
    }
};

window.addEventListener('DOMContentLoaded', () => App.init());
