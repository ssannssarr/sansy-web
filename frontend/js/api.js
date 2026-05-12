/**
 * api.js
 * Responsibility: All HTTP calls to the Sansy backend API.
 * Single place to change API URL, handle errors, and make requests.
 */

const API = 'http://localhost:8765';

const SansyAPI = {
    /**
     * Search YouTube for tracks.
     * @param {string} query - Search term
     * @param {number} limit - Max results (default 5)
     * @returns {Promise<object>} - { query, results: [{id, title, artist, duration, thumbnail}], cached }
     */
    search(query, limit = 5) {
        return fetch(`${API}/search?q=${encodeURIComponent(query)}&limit=${limit}`)
            .then(res => {
                if (!res.ok) throw new Error('Search failed');
                return res.json();
            });
    },

    /**
     * Get proxy URL for audio streaming.
     * @param {string} videoId - YouTube video ID
     * @returns {string} - Full proxy URL
     */
    getProxyUrl(videoId) {
        return `${API}/proxy/${videoId}`;
    },

    /**
     * Start download for a track.
     * @param {string} query - Search query for the track
     * @param {string} format - 'mp3' or 'mp4'
     * @param {string} quality - '320k', '128k', '1080p', '720p'
     * @returns {Promise<object>}
     */
    download(query, format = 'mp3', quality = '320k') {
        return fetch(`${API}/download?q=${encodeURIComponent(query)}&fmt=${format}&quality=${quality}`)
            .then(res => res.json());
    }
};
