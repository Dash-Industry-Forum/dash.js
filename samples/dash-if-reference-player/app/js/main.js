/**
 * main.js - Application entry point and orchestrator
 *
 * Initializes all modules, wires them together, handles the load/stop lifecycle.
 */

import {$, fetchJSON, show} from './UIHelpers.js';
import {PlayerController} from './PlayerController.js';
import {ControlBar} from '../../../../contrib/controlbar/ControlBar.js';
import {StreamCatalog} from './StreamCatalog.js';
import {SettingsController} from './SettingsController.js';
import {DrmController} from './DrmController.js';
import {MetricsDisplay} from './MetricsDisplay.js';
import {ChartController} from './ChartController.js';
import {NotificationPanel} from './NotificationPanel.js';

// ---- State ----
let playerController;
let controlBar;
let streamCatalog;
let settingsController;
let drmController;
let metricsDisplay;
let chartController;
let notificationPanel;

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

    // 3. Display version + build commit
    const version = playerController.getVersion();
    $('#version-info').textContent = `v${version}`;
    const commitInfo = $('#commit-info');
    const buildCommit = typeof __DASHJS_BUILD_COMMIT__ !== 'undefined'
        ? __DASHJS_BUILD_COMMIT__
        : 'unknown';
    if (commitInfo && buildCommit && buildCommit !== 'unknown') {
        const commitUrl = `https://github.com/Dash-Industry-Forum/dash.js/commit/${buildCommit}`;
        commitInfo.innerHTML = `commit <a href="${commitUrl}" target="_blank" rel="noopener">${buildCommit}</a>`;
    }

    // 4. Initialize all modules
    controlBar = new ControlBar(playerController.player, videoElement);
    controlBar.init($('#video-wrapper'));
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

    notificationPanel = new NotificationPanel(playerController);
    notificationPanel.init();

    // 5. Wire up button handlers
    $('#btn-load').addEventListener('click', doLoad);
    $('#btn-stop').addEventListener('click', doStop);

    // Copy URL (includes DRM protData from the DRM controller or the selected stream)
    $('#btn-copy-url').addEventListener('click', () => {
        const selectedItem = streamCatalog.getSelectedItem();
        const protData = drmController.buildProtectionData() || selectedItem?.protData || null;
        settingsController.copySettingsUrl(protData);
    });

    // Allow Enter key in URL field to trigger load
    $('#stream-url').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            doLoad();
        }
    });

    // 6. Register player events for UI
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

    // 8b. Apply restored DRM protection data from URL
    if (settingsController.restoredProtData) {
        drmController.setFromProtData(settingsController.restoredProtData);
    }

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

    // Set auto-play
    playerController.player.setAutoPlay(settingsController.autoPlay);

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

    // If mute option is checked, apply to control bar before load
    if ($('#opt-muted')?.checked) {
        controlBar.setMuted(true);
    }

    // Load stream
    playerController.load(url, protData);

    // Re-apply control bar volume/mute state to the new source
    controlBar.syncMuteState();
}

function doStop() {
    controlBar.disable();
    controlBar.reset();
    playerController.stop();
    chartController.clearAllData();
}

// ---- Playback ended (loop) ----
function onPlaybackEnded() {
    if (settingsController.loop && !playerController.isDynamic) {
        playerController.player.seek(0);
        playerController.player.play();
    }
}

// ---- Theme toggle ----
function initThemeToggle() {
    const select = $('#theme-select');
    if (!select) {
        return;
    }

    const STORAGE_KEY = 'rp-theme';
    const THEMES = ['light', 'dark', 'latte', 'frappe', 'macchiato', 'mocha'];

    function applyTheme(theme) {
        document.documentElement.setAttribute('data-bs-theme', theme);
        select.value = theme;

        // Update chart colors for new theme
        if (chartController) {
            chartController.updateTheme();
        }
    }

    // Load saved preference (fall back to 'light')
    const saved = localStorage.getItem(STORAGE_KEY);
    const initialTheme = THEMES.includes(saved) ? saved : 'light';
    applyTheme(initialTheme);

    select.addEventListener('change', () => {
        const selectedTheme = select.value;
        const nextTheme = THEMES.includes(selectedTheme) ? selectedTheme : 'light';
        localStorage.setItem(STORAGE_KEY, nextTheme);
        applyTheme(nextTheme);
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
                img.src = contrib.logo;
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
