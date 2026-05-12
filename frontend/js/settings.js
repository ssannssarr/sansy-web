/**
 * settings.js
 * Responsibility: Settings page rendering and state management.
 * Handles toggles, sleep timer, storage info, and cache clearing.
 */

const SettingsPage = {
    /**
     * Render the settings view.
     * @param {HTMLElement} container
     */
    render(container) {
        const s = App.state.settings;

        container.innerHTML = `
            <h2 class="text-4xl font-black tracking-tighter mb-8 italic">SETTINGS</h2>
            <div class="space-y-6 pb-20">
                <!-- Playback -->
                <div class="space-y-3">
                    <p class="text-[10px] uppercase tracking-widest text-zinc-600 font-black px-1">Playback</p>
                    <div class="glass-pill p-5 rounded-[2rem] flex justify-between items-center">
                        <div>
                            <p class="font-bold">High Quality Audio</p>
                            <p class="text-xs text-zinc-500">320kbps</p>
                        </div>
                        <label class="switch">
                            <input type="checkbox" ${s.highQuality ? 'checked' : ''}
                                onchange="SettingsPage.update('highQuality', this.checked)">
                            <span class="slider"></span>
                        </label>
                    </div>
                    <div class="glass-pill p-5 rounded-[2rem] flex justify-between items-center">
                        <div>
                            <p class="font-bold">Data Saver</p>
                            <p class="text-xs text-zinc-500">Optimize for mobile data</p>
                        </div>
                        <label class="switch">
                            <input type="checkbox" ${s.dataSaver ? 'checked' : ''}
                                onchange="SettingsPage.update('dataSaver', this.checked)">
                            <span class="slider"></span>
                        </label>
                    </div>
                </div>

                <!-- Sleep Timer -->
                <div class="space-y-3">
                    <p class="text-[10px] uppercase tracking-widest text-zinc-600 font-black px-1">Sleep Timer</p>
                    <div class="glass-pill p-5 rounded-[2rem]">
                        <div class="flex gap-2">
                            ${['Off', '15m', '30m', '60m'].map((label, i) => `
                                <button onclick="SettingsPage.update('sleepTimer', ${i})"
                                    class="flex-1 py-3 rounded-2xl text-[10px] font-black uppercase transition-all ${s.sleepTimer === i ? 'bg-white text-black' : 'bg-white/5 text-zinc-400'}">
                                    ${label}
                                </button>`).join('')}
                        </div>
                    </div>
                </div>

                <!-- Storage -->
                <div class="space-y-3">
                    <p class="text-[10px] uppercase tracking-widest text-zinc-600 font-black px-1">Storage</p>
                    <div class="glass-pill p-5 rounded-[2rem] flex justify-between items-center">
                        <div>
                            <p class="font-bold">Download Location</p>
                            <p class="text-xs text-zinc-500">~/sansy/sansy_downloads/</p>
                        </div>
                        <i data-lucide="chevron-right" class="w-5 h-5 text-zinc-600"></i>
                    </div>
                    <div class="glass-pill p-5 rounded-[2rem] flex justify-between items-center text-red-500"
                         onclick="localStorage.clear(); location.reload();">
                        <div>
                            <p class="font-bold">Clear Library Cache</p>
                            <p class="text-xs opacity-50">Removes liked songs</p>
                        </div>
                        <i data-lucide="trash-2" class="w-5 h-5"></i>
                    </div>
                </div>

                <!-- About -->
                <div class="space-y-3">
                    <p class="text-[10px] uppercase tracking-widest text-zinc-600 font-black px-1">About</p>
                    <div class="glass-pill p-6 rounded-[2rem] text-center space-y-2">
                        <p class="text-xl font-black italic tracking-tighter text-white">SANSY v3.0.0</p>
                        <p class="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Built for audiophiles</p>
                    </div>
                </div>
            </div>`;

        lucide.createIcons();
    },

    /**
     * Update a setting value and re-render.
     * @param {string} key - Setting name
     * @param {*} value - New value
     */
    update(key, value) {
        App.state.settings[key] = value;
        Gestures.showFeedback('check');
        this.render(document.getElementById('view-container'));
    }
};
