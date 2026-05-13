/**
 * app.js
 * Responsibility: Core application state, navigation, sidebar, full player
 * toggle, options menu, toast notifications, and UI updates.
 * This is the central coordinator that wires all modules together.
 */

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
        settings: {
            highQuality: true,
            dataSaver: false,
            sleepTimer: 0
        }
    },

    _toastTimer: null,

    /**
     * Initialize the entire application.
     * Called on window.onload.
     */
    init() {
        Library.init();
        Gestures.init();
        Player.initSeek();
        this.setView('home');

        // Close options menu when clicking outside
        window.addEventListener('click', (e) => {
            if (this.state.isOptionsMenuOpen &&
                !e.target.closest('#options-menu') &&
                !e.target.closest('[onclick*="toggleOptionsMenu"]')) {
                this.state.isOptionsMenuOpen = false;
                this.updateUI();
            }
        });
    },

    /**
     * Show a toast notification.
     * @param {string} msg - Message to display
     * @param {number} duration - Duration in ms (default 2500)
     */
    toast(msg, duration = 2500) {
        const t = document.getElementById('toast');
        if (!t) return;
        t.innerText = msg;
        t.classList.remove('opacity-0');
        clearTimeout(this._toastTimer);
        this._toastTimer = setTimeout(() => t.classList.add('opacity-0'), duration);
    },

    /**
     * Handle disc button click (single = open player, double = play/pause).
     */
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
            Player.toggle();
            this.state.discClickCount = 0;
        }
    },

    /**
     * Toggle the sidebar open/closed.
     */
    toggleSidebar() {
        this.state.isSidebarOpen = !this.state.isSidebarOpen;

        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('sidebar-overlay');

        if (sidebar) {
            sidebar.classList.toggle('-translate-x-full', !this.state.isSidebarOpen);
        }
        if (overlay) {
            overlay.classList.toggle('opacity-0', !this.state.isSidebarOpen);
            overlay.classList.toggle('pointer-events-none', !this.state.isSidebarOpen);
        }
    },

    /**
     * Toggle the full player view.
     */
    toggleFullPlayer() {
        this.state.isFullPlayerOpen = !this.state.isFullPlayerOpen;
        const player = document.getElementById('full-player');
        if (!player) return;

        player.style.transform = '';

        if (this.state.isFullPlayerOpen) {
            player.classList.remove('translate-y-full');
            player.classList.add('translate-y-0');
        } else {
            player.classList.add('translate-y-full');
            player.classList.remove('translate-y-0');
            this.state.isOptionsMenuOpen = false;
            if (this.state.isFullscreen) {
                this.toggleFullscreen();
            }
        }

        this.updateUI();
    },

    /**
     * Toggle the options menu (quality, download, etc.).
     */
    toggleOptionsMenu(event) {
        if (event) event.stopPropagation();
        this.state.isOptionsMenuOpen = !this.state.isOptionsMenuOpen;
        this.state.menuView = 'main';
        this.updateUI();
    },

    /**
     * Navigate between sub-menus in the options panel.
     */
    setMenuView(view, event) {
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }
        this.state.menuView = view;
        this._renderOptionsMenu();
    },

    /**
     * Render the options menu content based on current menuView.
     */
    _renderOptionsMenu() {
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
                 <div class="h-px bg-white/10 my-1"></div>
                 <button onclick="App.setMenuView('download',event)" ontouchstart="App.setMenuView('download',event)" class="${ic}"><i data-lucide="download" class="w-4 h-4"></i> Download <i data-lucide="chevron-right" class="w-3 h-3 ml-auto opacity-30"></i></button>`;
        }

        container.innerHTML = html;
        lucide.createIcons();
    },

    /**
     * Handle quality selection from options menu.
     */
    selectQuality(q, event) {
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }

        const track = this.state.currentTrack;
        if (!track || !track.title) {
            this.toast('No track loaded');
            return;
        }

        this.state.isOptionsMenuOpen = false;
        this.updateUI();

        // Streaming quality change — feedback only for now
        if (!q.startsWith('DL-')) {
            this.toast('Quality: ' + q);
            return;
        }

        // Download
        let fmt = 'mp3', quality = '320k';
        if (q === 'DL-128k')  { fmt = 'mp3'; quality = '128k'; }
        else if (q === 'DL-320k')  { fmt = 'mp3'; quality = '320k'; }
        else if (q === 'DL-1080p') { fmt = 'mp4'; quality = '1080p'; }
        else if (q === 'DL-720p')  { fmt = 'mp4'; quality = '720p'; }

        this.toast('Downloading…');
        SansyAPI.download(track.title, fmt, quality)
            .then(data => {
                if (data.error) {
                    this.toast('Error: ' + data.error.slice(0, 60));
                    return;
                }
                this.toast('Saved: ' + (data.filename || data.path.split('/').pop()));
                Gestures.showFeedback('check');
            })
            .catch(() => this.toast('Backend offline'));
    },

    /**
     * Toggle fullscreen for the video/art container.
     */
    toggleFullscreen(event) {
        if (event) event.stopPropagation();
        this.state.isFullscreen = !this.state.isFullscreen;

        const frame = document.getElementById('video-frame');
        const icon = document.getElementById('fs-icon');

        if (frame) frame.classList.toggle('fullscreen-active', this.state.isFullscreen);
        if (icon) icon.setAttribute('data-lucide', this.state.isFullscreen ? 'minimize' : 'maximize');
        lucide.createIcons();
    },

    /**
     * Switch between views (home, search, library, settings).
     */
    setView(view) {
        this.state.currentView = view;
        const container = document.getElementById('view-container');
        if (!container) return;

        if (view === 'home')      HomePage.render(container);
        else if (view === 'search')   SearchPage.render(container);
        else if (view === 'library')  Library.render(container);
        else if (view === 'settings') SettingsPage.render(container);

        this.updateUI();
    },

    /**
     * Update all dynamic UI elements: play/pause icon, nav highlights,
     * disc animation, like button, options menu visibility.
     */
    updateUI() {
        // Disc animation
        const disk = document.getElementById('disk-art');
        if (disk) {
            if (this.state.isPlaying) disk.classList.remove('paused');
            else disk.classList.add('paused');
        }

        // Play/pause icon in full player
        const playIcon = document.getElementById('full-play-icon');
        if (playIcon) {
            playIcon.setAttribute('data-lucide', this.state.isPlaying ? 'pause' : 'play');
        }

        // Bottom nav active states
        ['home', 'search', 'library'].forEach(v => {
            const el = document.getElementById('nav-' + v);
            if (el) {
                el.className = (v === this.state.currentView)
                    ? 'flex-1 flex flex-col items-center justify-center gap-0.5 active-nav-item tap-highlight-none'
                    : 'flex-1 flex flex-col items-center justify-center gap-0.5 inactive-nav-item tap-highlight-none';
            }
        });

        // Options menu
        const menu = document.getElementById('options-menu');
        if (menu) {
            menu.classList.toggle('opacity-0', !this.state.isOptionsMenuOpen);
            menu.classList.toggle('pointer-events-none', !this.state.isOptionsMenuOpen);
            menu.classList.toggle('scale-95', !this.state.isOptionsMenuOpen);
        }

        if (this.state.isOptionsMenuOpen) {
            this._renderOptionsMenu();
        }

        // Like button
        Library.updateLikeButton();

        // Refresh all icons
        lucide.createIcons();
    }
};

// ── Initialize on page load ────────────────────────────────────────────
window.onload = () => App.init();
