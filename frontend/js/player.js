/**
 * player.js
 * Responsibility: Audio playback, progress tracking, seeking, skip logic.
 * Manages the HTML5 Audio element and updates the UI progress bar.
 */

const Player = {
    _audio: null,
    _queue: [],
    _queueIndex: 0,
    _ticker: null,
    _seekBound: false,

    /**
     * Initialize the audio element once.
     */
    init() {
        if (!this._audio) {
            this._audio = new Audio();
            this._audio.preload = 'auto';
            this._audio.addEventListener('ended', () => this.skip(1));
        }
    },

    /**
     * Play a track by video ID.
     * @param {string} id - YouTube video ID
     * @param {string} title - Track title
     * @param {string} artist - Artist name
     * @param {string} thumbnail - Thumbnail URL (optional)
     */
    play(id, title, artist, thumbnail = '') {
        // Update app state
        App.state.currentTrack = { id, title, artist, thumbnail };
        App.state.isPlaying = true;

        // Update UI elements
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
            diskImg.src = 'https://placehold.co/100x100/111/ffffff?text=%E2%99%AB';
        }

        this.init();

        // Build proxy URL using video ID
        const proxyUrl = SansyAPI.getProxyUrl(id);

        // Only reload if different track
        if (this._audio.dataset.src !== proxyUrl) {
            this._audio.dataset.src = proxyUrl;
            this._audio.src = proxyUrl;
            this._audio.play().catch(e => console.warn('Playback blocked:', e));
            this.startTracking();
        }

        // Open full player if not already open
        if (!App.state.isFullPlayerOpen) {
            App.toggleFullPlayer();
        } else {
            App.updateUI();
        }
    },

    /**
     * Toggle play/pause.
     */
    toggle() {
        if (!this._audio) return;

        App.state.isPlaying = !App.state.isPlaying;

        if (App.state.isPlaying) {
            this._audio.play();
            this.startTracking();
        } else {
            this._audio.pause();
            this.stopTracking();
        }

        App.updateUI();
    },

    /**
     * Skip forward (+1) or backward (-1).
     * If queue has multiple tracks, moves through queue.
     * Otherwise seeks ±10 seconds.
     */
    skip(dir) {
        if (!this._audio) return;

        if (this._queue.length > 1) {
            this._queueIndex = (this._queueIndex + dir + this._queue.length) % this._queue.length;
            const t = this._queue[this._queueIndex];
            this.play(t.id, t.title, t.artist, t.thumbnail || '');
        } else {
            // No queue — seek ±10s
            if (this._audio.duration) {
                this._audio.currentTime = Math.max(0, Math.min(
                    this._audio.duration,
                    this._audio.currentTime + dir * 10
                ));
            }
        }
    },

    /**
     * Set a queue of tracks to play through.
     * @param {Array} tracks - Array of {id, title, artist, thumbnail}
     * @param {number} index - Starting index (default 0)
     */
    setQueue(tracks, index = 0) {
        this._queue = tracks;
        this._queueIndex = index;
    },

    /**
     * Format seconds to m:ss display.
     */
    formatTime(s) {
        if (!s || isNaN(s)) return '0:00';
        const m = Math.floor(s / 60);
        const sec = Math.floor(s % 60).toString().padStart(2, '0');
        return `${m}:${sec}`;
    },

    /**
     * Initialize seek bar click/drag handling.
     * Called once on app init.
     */
    initSeek() {
        const wrap = document.getElementById('progress-bar-wrap');
        if (!wrap) return;

        const doSeek = (clientX) => {
            if (!this._audio || !this._audio.duration) return;
            const rect = wrap.getBoundingClientRect();
            const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
            this._audio.currentTime = pct * this._audio.duration;
        };

        wrap.addEventListener('click', (e) => {
            e.stopPropagation();
            doSeek(e.clientX);
        }, true);

        wrap.addEventListener('touchend', (e) => {
            e.stopPropagation();
            doSeek(e.changedTouches[0].clientX);
        }, true);
    },

    /**
     * Start progress bar tracking interval.
     */
    startTracking() {
        this.stopTracking();
        this._ticker = setInterval(() => {
            if (!this._audio || !this._audio.duration) return;

            const pct = (this._audio.currentTime / this._audio.duration) * 100;
            const fill = document.getElementById('progress-fill');
            const cur = document.getElementById('time-current');
            const tot = document.getElementById('time-total');

            if (fill) fill.style.width = pct + '%';
            if (cur) cur.innerText = this.formatTime(this._audio.currentTime);
            if (tot) tot.innerText = this.formatTime(this._audio.duration);
        }, 500);
    },

    /**
     * Stop progress bar tracking interval.
     */
    stopTracking() {
        if (this._ticker) {
            clearInterval(this._ticker);
            this._ticker = null;
        }
    }
};
