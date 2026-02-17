/**
 * main.js - Application entry point and orchestrator
 *
 * Initializes all modules, wires them together, handles the load/stop lifecycle.
 */

import { $, fetchJSON, show } from './UIHelpers.js';
import { PlayerController } from './PlayerController.js';
import { ControlBar } from './ControlBar.js';
import { StreamCatalog } from './StreamCatalog.js';
import { SettingsController } from './SettingsController.js';
import { DrmController } from './DrmController.js';
import { MetricsDisplay } from './MetricsDisplay.js';
import { ChartController } from './ChartController.js';
import { ConformancePanel } from './ConformancePanel.js';

// ---- State ----
let playerController;
let controlBar;
let streamCatalog;
let settingsController;
let drmController;
let metricsDisplay;
let chartController;
let conformancePanel;

// ---- Initialization ----
async function init() {
    // Verify dash.js is loaded (UMD script from dist/ must be available)
    if (typeof dashjs === 'undefined') {
        const msg = 'dash.js library not found. Make sure to run "npm run start" or "npm run build" first ' +
            'so that dist/modern/umd/dash.all.debug.js is available.';
        console.error(msg);
        const body = document.body;
        const alert = document.createElement('div');
        alert.className = 'alert alert-danger m-4';
        alert.innerHTML = `<strong>Error:</strong> ${msg}`;
        body.prepend(alert);
        return;
    }

    const videoElement = $('#video-element');

    // 1. Create PlayerController and initialize dash.js
    playerController = new PlayerController();
    playerController.init(videoElement, true);

    // Attach TTML rendering div
    playerController.attachTTMLRenderingDiv($('#video-caption'));

    // 2. Load default config
    await loadDefaultConfig();

    // 3. Display version
    const version = playerController.getVersion();
    $('#version-info').textContent = `v${version}`;

    // 4. Initialize all modules
    controlBar = new ControlBar(playerController);
    controlBar.init();
    controlBar.disable();

    settingsController = new SettingsController(playerController);
    settingsController.init();

    drmController = new DrmController();
    drmController.init();

    streamCatalog = new StreamCatalog();
    streamCatalog.onStreamSelected = onStreamSelected;
    await streamCatalog.init('app/data/sources.json');

    chartController = new ChartController();
    chartController.init();

    metricsDisplay = new MetricsDisplay(playerController, chartController);
    metricsDisplay.init();

    conformancePanel = new ConformancePanel(playerController);
    conformancePanel.init();

    // 5. Wire up button handlers
    $('#btn-load').addEventListener('click', doLoad);
    $('#btn-stop').addEventListener('click', doStop);

    // Allow Enter key in URL field to trigger load
    $('#stream-url').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            doLoad();
        }
    });

    // 6. Register player events for UI
    playerController.on('error', onPlayerError);
    playerController.on('playbackEnded', onPlaybackEnded);
    playerController.on('streamInitialized', () => {
        controlBar.enable();
    });
    playerController.on('manifestLoaded', (data) => {
        // Show/hide CMSD metrics if enabled
        const cmsdEnabled = $('#opt-cmsd-enabled')?.checked || false;
        metricsDisplay.setCmsdEnabled(cmsdEnabled);
    });

    // 7. Check HTTP warning
    if (window.location.protocol === 'http:' && window.location.hostname !== 'localhost') {
        show('#http-warning');
    }

    // 8. Apply URL parameters
    const shouldAutoLoad = settingsController.applyFromUrl();

    // 9. Handle stream URL from query param
    const params = new URLSearchParams(window.location.search);
    const streamParam = params.get('stream');
    if (streamParam) {
        streamCatalog.setUrl(streamParam);
    }

    // 10. Auto-load if requested
    if (shouldAutoLoad || params.get('autoLoad') === 'true') {
        doLoad();
    }

    // 11. Theme toggle (light/dark)
    initThemeToggle();

    // 12. Load contributors
    loadContributors();

    // 13. Initialize Bootstrap tooltips
    const tooltipElements = document.querySelectorAll('[data-bs-toggle="tooltip"]');
    for (const el of tooltipElements) {
        new bootstrap.Tooltip(el);
    }
}

// ---- Config loading ----
async function loadDefaultConfig() {
    try {
        const config = await fetchJSON('app/data/dashjs_config.json');
        playerController.updateSettings(config);
    } catch (err) {
        // Apply sensible defaults
        playerController.updateSettings({
            debug: { logLevel: 3 }  // WARNING
        });
    }
}

// ---- Stream selection callback ----
function onStreamSelected(item) {
    // If stream has embedded DRM protData, load it into DRM controller
    if (item.protData) {
        drmController.setFromProtData(item.protData);
    } else {
        drmController.clearAll();
    }
}

// ---- Load / Stop ----
function doLoad() {
    const url = streamCatalog.getUrl();
    if (!url) {
        return;
    }

    // Build config from settings UI
    const config = settingsController.buildConfig();
    playerController.updateSettings(config);

    // Set auto-play and mute
    playerController.player.setAutoPlay(settingsController.autoPlay);
    const muted = $('#opt-muted')?.checked || false;
    playerController.player.setMute(muted);

    // Build DRM protection data
    const selectedItem = streamCatalog.getSelectedItem();
    let protData = drmController.buildProtectionData();

    // If stream item has embedded protData and user hasn't overridden, use stream's
    if (!protData && selectedItem?.protData) {
        protData = selectedItem.protData;
    }

    // Apply initial media settings
    settingsController.applyInitialMediaSettings();

    // Reset chart
    chartController.clearAllData();

    // Reset control bar
    controlBar.reset();
    controlBar.disable();

    // Load stream
    playerController.load(url, protData);
}

function doStop() {
    controlBar.disable();
    controlBar.reset();
    playerController.stop();
    chartController.clearAllData();
}

// ---- Error handling ----
function onPlayerError(e) {
    let message = 'An error occurred during playback.';

    if (e && e.error) {
        const err = e.error;
        if (err.message) {
            message = err.message;
        }
        if (err.code) {
            message = `[Error ${err.code}] ${message}`;
        }
    }

    const errorMsg = $('#error-message');
    if (errorMsg) {
        errorMsg.textContent = message;
    }

    const modal = new bootstrap.Modal($('#errorModal'));
    modal.show();
}

// ---- Playback ended (loop) ----
function onPlaybackEnded() {
    if (settingsController.loop) {
        playerController.player.seek(0);
        playerController.player.play();
    }
}

// ---- Theme toggle ----
function initThemeToggle() {
    const btn = $('#btn-theme-toggle');
    if (!btn) {
        return;
    }

    const STORAGE_KEY = 'rp-theme';

    function applyTheme(theme) {
        document.documentElement.setAttribute('data-bs-theme', theme);
        const icon = btn.querySelector('i');
        if (icon) {
            icon.className = theme === 'dark' ? 'bi bi-sun-fill' : 'bi bi-moon-fill';
        }
        btn.title = theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode';

        // Update chart colors for new theme
        if (chartController) {
            chartController.updateTheme();
        }
    }

    // Load saved preference (fall back to 'light')
    const saved = localStorage.getItem(STORAGE_KEY) || 'light';
    applyTheme(saved);

    btn.addEventListener('click', () => {
        const current = document.documentElement.getAttribute('data-bs-theme');
        const next = current === 'dark' ? 'light' : 'dark';
        localStorage.setItem(STORAGE_KEY, next);
        applyTheme(next);
    });
}

// ---- Contributors ----
async function loadContributors() {
    try {
        const data = await fetchJSON('app/data/contributors.json');
        const container = $('#contributor-logos');
        if (!container || !data.items) {
            return;
        }

        for (const contrib of data.items) {
            const a = document.createElement('a');
            a.href = contrib.link || '#';
            a.target = '_blank';
            a.title = contrib.name || '';
            a.rel = 'noopener';

            if (contrib.logo) {
                const img = document.createElement('img');
                // Logo paths in contributors.json are relative to the old player dir
                img.src = `../dash-if-reference-player/${contrib.logo}`;
                img.alt = contrib.name || '';
                a.appendChild(img);
            } else {
                a.textContent = contrib.name || '';
            }

            container.appendChild(a);
        }
    } catch (err) {
        // Non-critical
    }
}

// ---- Start the app ----
init().catch(err => {
    console.error('Failed to initialize reference player:', err);
});
