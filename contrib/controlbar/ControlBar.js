/**
 * ControlBar.js - Reusable dash.js video control bar
 *
 * A self-contained, self-generating control bar component for dash.js.
 * Generates its own DOM structure inside a consumer-provided container element.
 *
 * Features: play/pause, seekbar (div-based with buffer + played overlay),
 * volume, mute, fullscreen, bitrate/track/caption menus, thumbnail preview,
 * playback rate controls, auto-hide on hover with configurable timeout.
 *
 * Requirements:
 * - dash.js MediaPlayer instance (global `dashjs` must be available)
 * - Bootstrap Icons CSS loaded in the page
 * - controlbar.css loaded in the page
 *
 * Usage:
 *   import { ControlBar } from './ControlBar.js';
 *   const cb = new ControlBar(player, videoElement);
 *   cb.init(document.getElementById('my-container'));
 *   cb.enable();
 */

const HIDE_DELAY = 3000;

// ---- Inline helpers (replaces UIHelpers.js dependency) ----

function formatTime(seconds) {
    if (isNaN(seconds) || !isFinite(seconds)) {
        return '00:00';
    }
    const negative = seconds < 0;
    seconds = Math.abs(Math.floor(seconds));
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    const pad = (n) => String(n).padStart(2, '0');
    const prefix = negative ? '- ' : '';
    if (h > 0) {
        return `${prefix}${pad(h)}:${pad(m)}:${pad(s)}`;
    }
    return `${prefix}${pad(m)}:${pad(s)}`;
}

function createElement(tag, attrs = {}, ...children) {
    const el = document.createElement(tag);
    for (const [key, value] of Object.entries(attrs)) {
        if (key === 'className') {
            el.className = value;
        } else if (key === 'textContent') {
            el.textContent = value;
        } else if (key === 'innerHTML') {
            el.innerHTML = value;
        } else if (key.startsWith('on') && typeof value === 'function') {
            el.addEventListener(key.slice(2).toLowerCase(), value);
        } else {
            el.setAttribute(key, value);
        }
    }
    for (const child of children) {
        if (typeof child === 'string') {
            el.appendChild(document.createTextNode(child));
        } else if (child) {
            el.appendChild(child);
        }
    }
    return el;
}

export class ControlBar {

    /**
     * @param {object} player - A dash.js MediaPlayer instance
     * @param {HTMLVideoElement} videoElement - The video element managed by the player
     */
    constructor(player, videoElement) {
        this.player = player;
        this.video = videoElement;

        // DOM references (populated by _buildDOM)
        this.container = null;      // the controlbar root element we create
        this.wrapper = null;        // the consumer-provided wrapper / container parent
        this.playPauseBtn = null;
        this.playPauseIcon = null;
        this.timeDisplay = null;
        this.durationDisplay = null;
        this.seekbarContainer = null;
        this.seekbarPlayed = null;
        this.seekbarBuffer = null;
        this.volumeSlider = null;
        this.muteBtn = null;
        this.muteIcon = null;
        this.fullscreenBtn = null;
        this.fullscreenIcon = null;
        this.bitrateBtn = null;
        this.bitrateMenu = null;
        this.trackBtn = null;
        this.trackMenu = null;
        this.captionBtn = null;
        this.captionMenu = null;
        this.timeSeparator = null;
        this.rateDownBtn = null;
        this.rateUpBtn = null;
        this.rateDisplay = null;
        this.thumbnailContainer = null;
        this.thumbnailElem = null;
        this.thumbnailTimeLabel = null;

        // State
        this._seeking = false;
        this._hideTimer = null;
        this._enabled = false;
        this._duration = 0;
        this._isDynamic = false;
        this._lastVolume = 1;
        this._isFullscreen = false;
        this._activeMenu = null;

        // Bound handlers for cleanup
        this._onMouseMove = this._onMouseMoveBound.bind(this);
        this._onMouseLeave = this._onMouseLeaveBound.bind(this);
        this._onFullscreenChange = this._onFullscreenChangeBound.bind(this);
    }

    /**
     * Initialize the control bar: build DOM, inject into container, register events.
     *
     * @param {HTMLElement|string} wrapperElement - The wrapper element (or CSS selector)
     *   that contains the video element. The controlbar will be appended inside this
     *   wrapper. It should have `position: relative` so the controlbar overlays correctly.
     */
    init(wrapperElement) {
        if (typeof wrapperElement === 'string') {
            this.wrapper = document.querySelector(wrapperElement);
        } else {
            this.wrapper = wrapperElement;
        }

        if (!this.wrapper) {
            throw new Error('ControlBar: wrapper element not found');
        }

        this._buildDOM();
        this.wrapper.appendChild(this.container);

        this._attachDOMEvents();
        this._attachPlayerEvents();

        // Initial state
        this.volumeSlider.value = 1;
        this._updatePlayPauseIcon();
    }

    /**
     * Enable the control bar (interactive).
     */
    enable() {
        this._enabled = true;
        this.container.classList.remove('cb-disabled');
    }

    /**
     * Disable the control bar (non-interactive, dimmed).
     */
    disable() {
        this._enabled = false;
        this.container.classList.add('cb-disabled');
        this._closeAllMenus();
    }

    /**
     * Reset control bar state (call on new stream load).
     */
    reset() {
        this._seeking = false;
        this._duration = 0;
        this._isDynamic = false;
        this.seekbarPlayed.style.width = '0%';
        this.seekbarBuffer.style.width = '0%';
        this.timeDisplay.textContent = '00:00';
        this.durationDisplay.textContent = '00:00';
        this.durationDisplay.classList.remove('cb-live-indicator', 'cb-at-live-edge');
        if (this.timeSeparator) {
            this.timeSeparator.classList.remove('cb-hidden-element');
        }
        this._updateRateDisplay(1);
        this._closeAllMenus();
        this._destroyMenus();
    }

    /**
     * Programmatically set the control bar to muted or unmuted state.
     * Updates slider and icon without touching the player (use syncMuteState for that).
     * @param {boolean} muted
     */
    setMuted(muted) {
        if (muted) {
            this._lastVolume = parseFloat(this.volumeSlider.value) || 1;
            this.volumeSlider.value = 0;
        } else {
            this.volumeSlider.value = this._lastVolume || 1;
        }
        this.muteIcon.className = muted ? 'bi bi-volume-mute-fill' : 'bi bi-volume-up-fill';
    }

    /**
     * Re-apply the control bar's current volume/mute state to the player.
     * Call after a new source is attached to keep mute state in sync.
     */
    syncMuteState() {
        try {
            const vol = parseFloat(this.volumeSlider.value);
            const isMuted = vol === 0 || this.muteIcon.className === 'bi bi-volume-mute-fill';
            this.player.setVolume(isMuted ? 0 : vol);
            this.player.setMute(isMuted);
        } catch (e) {
            // Player not ready
        }
    }

    /**
     * Destroy the control bar: remove all event listeners and remove DOM.
     */
    destroy() {
        this._detachDOMEvents();
        this._detachPlayerEvents();
        this._closeAllMenus();
        this._destroyMenus();
        clearTimeout(this._hideTimer);
        if (this.container && this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }
    }

    // ================================================================
    // DOM generation
    // ================================================================

    _buildDOM() {
        // Thumbnail preview
        this.thumbnailElem = createElement('div', { className: 'cb-thumbnail-elem' });
        this.thumbnailTimeLabel = createElement('div', { className: 'cb-thumbnail-time' });
        this.thumbnailContainer = createElement('div', { className: 'cb-thumbnail-container cb-hidden-element' },
            this.thumbnailElem,
            this.thumbnailTimeLabel
        );

        // Seekbar
        this.seekbarBuffer = createElement('div', { className: 'cb-seekbar-buffer', style: 'width: 0%' });
        this.seekbarPlayed = createElement('div', { className: 'cb-seekbar-played', style: 'width: 0%' });
        this.seekbarContainer = createElement('div', { className: 'cb-seekbar' },
            this.seekbarBuffer,
            this.seekbarPlayed
        );
        const seekbarRow = createElement('div', { className: 'cb-seekbar-row' }, this.seekbarContainer);

        // Play / Pause
        this.playPauseIcon = createElement('i', { className: 'bi bi-play-fill' });
        this.playPauseBtn = createElement('button', { className: 'cb-btn', title: 'Play/Pause' }, this.playPauseIcon);

        // Time display
        this.timeDisplay = createElement('span', { className: 'cb-time', textContent: '00:00' });
        this.timeSeparator = createElement('span', { className: 'cb-time cb-time-separator', textContent: '/' });
        this.durationDisplay = createElement('span', { className: 'cb-time', textContent: '00:00' });

        // Spacer
        const spacer = createElement('div', { className: 'cb-spacer' });

        // Volume / Mute
        this.muteIcon = createElement('i', { className: 'bi bi-volume-up-fill' });
        this.muteBtn = createElement('button', { className: 'cb-btn', title: 'Mute/Unmute' }, this.muteIcon);
        this.volumeSlider = createElement('input', {
            type: 'range',
            className: 'cb-volume-slider',
            min: '0',
            max: '1',
            step: '0.05',
            value: '1'
        });
        const volumeGroup = createElement('div', { className: 'cb-volume-group' },
            this.muteBtn,
            this.volumeSlider
        );

        // Playback rate
        this.rateDownBtn = createElement('button', { className: 'cb-btn cb-btn-sm', title: 'Decrease speed' },
            createElement('i', { className: 'bi bi-dash' })
        );
        this.rateDisplay = createElement('span', { className: 'cb-rate-display', title: 'Reset to 1x', textContent: '1.00x' });
        this.rateUpBtn = createElement('button', { className: 'cb-btn cb-btn-sm', title: 'Increase speed' },
            createElement('i', { className: 'bi bi-plus' })
        );
        const rateGroup = createElement('div', { className: 'cb-rate-group' },
            this.rateDownBtn,
            this.rateDisplay,
            this.rateUpBtn
        );

        // Bitrate menu
        this.bitrateMenu = createElement('div', { className: 'cb-menu cb-hidden-element' });
        this.bitrateBtn = createElement('button', { className: 'cb-btn cb-hidden-element', title: 'Quality' },
            createElement('i', { className: 'bi bi-sliders' })
        );
        const bitrateAnchor = createElement('div', { className: 'cb-menu-anchor' },
            this.bitrateBtn,
            this.bitrateMenu
        );

        // Track menu
        this.trackMenu = createElement('div', { className: 'cb-menu cb-hidden-element' });
        this.trackBtn = createElement('button', { className: 'cb-btn cb-hidden-element', title: 'Tracks' },
            createElement('i', { className: 'bi bi-music-note-list' })
        );
        const trackAnchor = createElement('div', { className: 'cb-menu-anchor' },
            this.trackBtn,
            this.trackMenu
        );

        // Caption menu
        this.captionMenu = createElement('div', { className: 'cb-menu cb-hidden-element' });
        this.captionBtn = createElement('button', { className: 'cb-btn cb-hidden-element', title: 'Captions' },
            createElement('i', { className: 'bi bi-badge-cc' })
        );
        const captionAnchor = createElement('div', { className: 'cb-menu-anchor' },
            this.captionBtn,
            this.captionMenu
        );

        // Fullscreen
        this.fullscreenIcon = createElement('i', { className: 'bi bi-fullscreen' });
        this.fullscreenBtn = createElement('button', { className: 'cb-btn', title: 'Fullscreen' }, this.fullscreenIcon);

        // Controls row
        const controlsRow = createElement('div', { className: 'cb-controls-row' },
            this.playPauseBtn,
            this.timeDisplay,
            this.timeSeparator,
            this.durationDisplay,
            spacer,
            volumeGroup,
            rateGroup,
            bitrateAnchor,
            trackAnchor,
            captionAnchor,
            this.fullscreenBtn
        );

        // Root container
        this.container = createElement('div', { className: 'cb-controlbar cb-disabled' },
            this.thumbnailContainer,
            seekbarRow,
            controlsRow
        );
    }

    // ================================================================
    // DOM event handlers
    // ================================================================

    _attachDOMEvents() {
        this.playPauseBtn.addEventListener('click', () => this._togglePlayPause());
        this.muteBtn.addEventListener('click', () => this._toggleMute());
        this.fullscreenBtn.addEventListener('click', () => this._toggleFullscreen());
        this.volumeSlider.addEventListener('input', () => this._onVolumeInput());

        // Live indicator click — seek to live edge
        this.durationDisplay.addEventListener('click', () => this._seekToLiveEdge());

        // Playback rate controls
        this.rateDownBtn.addEventListener('click', () => this._changeRate(-0.25));
        this.rateUpBtn.addEventListener('click', () => this._changeRate(0.25));
        this.rateDisplay.addEventListener('click', () => this._resetRate());

        // Seekbar mouse events
        this.seekbarContainer.addEventListener('mousedown', (e) => this._onSeekMouseDown(e));
        this.seekbarContainer.addEventListener('mousemove', (e) => this._onSeekMouseMove(e));
        this.seekbarContainer.addEventListener('mouseleave', () => this._onSeekMouseLeave());
        document.addEventListener('mousemove', (e) => this._onDocumentMouseMove(e));
        document.addEventListener('mouseup', (e) => this._onDocumentMouseUp(e));

        // Touch events for seekbar
        this.seekbarContainer.addEventListener('touchstart', (e) => this._onSeekTouchStart(e), { passive: false });
        this.seekbarContainer.addEventListener('touchmove', (e) => this._onSeekTouchMove(e), { passive: false });
        this.seekbarContainer.addEventListener('touchend', (e) => this._onSeekTouchEnd(e));

        // Auto-hide: show on mouse move over wrapper, hide after delay
        this.wrapper.addEventListener('mousemove', this._onMouseMove);
        this.wrapper.addEventListener('mouseleave', this._onMouseLeave);
        this.wrapper.addEventListener('touchstart', this._onMouseMove, { passive: true });

        // Fullscreen change
        document.addEventListener('fullscreenchange', this._onFullscreenChange);
        document.addEventListener('webkitfullscreenchange', this._onFullscreenChange);

        // Bitrate / track / caption buttons
        this.bitrateBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this._toggleMenu('bitrate');
        });
        this.trackBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this._toggleMenu('track');
        });
        this.captionBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this._toggleMenu('caption');
        });

        // Close menus on click outside
        document.addEventListener('click', () => this._closeAllMenus());

        // Prevent control bar clicks from closing menus
        this.container.addEventListener('click', (e) => e.stopPropagation());
    }

    _detachDOMEvents() {
        this.wrapper.removeEventListener('mousemove', this._onMouseMove);
        this.wrapper.removeEventListener('mouseleave', this._onMouseLeave);
        document.removeEventListener('fullscreenchange', this._onFullscreenChange);
        document.removeEventListener('webkitfullscreenchange', this._onFullscreenChange);
    }

    _attachPlayerEvents() {
        const events = dashjs.MediaPlayer.events;

        this.player.on(events.PLAYBACK_STARTED, () => this._onPlaybackStarted());
        this.player.on(events.PLAYBACK_PAUSED, () => this._onPlaybackPaused());
        this.player.on(events.PLAYBACK_TIME_UPDATED, (e) => this._onTimeUpdate(e));
        this.player.on(events.STREAM_ACTIVATED, () => this._onStreamActivated());
        this.player.on(events.STREAM_TEARDOWN_COMPLETE, () => this._onStreamTeardown());
        this.player.on(events.BUFFER_LEVEL_UPDATED, (e) => this._onBufferLevelUpdated(e));
        this.player.on(events.TEXT_TRACKS_ADDED, (e) => this._onTextTracksAdded(e));

        if (dashjs.Protection && dashjs.Protection.events) {
            this.player.on(dashjs.Protection.events.KEY_STATUSES_MAP_UPDATED, () => this._rebuildBitrateMenu());
        }
    }

    _detachPlayerEvents() {
        // Player cleanup happens via player.destroy()
    }

    // ================================================================
    // Play / Pause
    // ================================================================

    _togglePlayPause() {
        if (!this._enabled) {
            return;
        }
        if (this.player.isPaused()) {
            this.player.play();
        } else {
            this.player.pause();
        }
    }

    _updatePlayPauseIcon() {
        if (!this.playPauseIcon) {
            return;
        }
        try {
            const isPaused = this.player.isPaused();
            this.playPauseIcon.className = isPaused ? 'bi bi-play-fill' : 'bi bi-pause-fill';
        } catch (e) {
            // Player not ready yet — default to play icon
            this.playPauseIcon.className = 'bi bi-play-fill';
        }
    }

    _onPlaybackStarted() {
        this._updatePlayPauseIcon();
        this._startHideTimer();
    }

    _onPlaybackPaused() {
        this._updatePlayPauseIcon();
        this._showControlBar();
        this._clearHideTimer();
    }

    // ================================================================
    // Time / Duration
    // ================================================================

    _onTimeUpdate() {
        if (this._seeking) {
            return;
        }

        try {
            const time = this.player.timeInDvrWindow();
            const duration = this.player.duration();
            this._duration = duration;
            this._isDynamic = this.player.isDynamic();

            if (this._isDynamic) {
                // Show negative latency (e.g. -00:20) instead of DVR position
                const liveLatency = this.player.getCurrentLiveLatency() || 0;
                this.timeDisplay.textContent = `-${formatTime(Math.round(liveLatency))}`;

                this.durationDisplay.innerHTML = '<i class="bi bi-circle-fill"></i> LIVE';
                this.durationDisplay.classList.add('cb-live-indicator');

                // Hide separator for live
                if (this.timeSeparator) {
                    this.timeSeparator.classList.add('cb-hidden-element');
                }

                // Check if at live edge
                const targetDelay = this.player.getTargetLiveDelay() || 0;
                const atLiveEdge = liveLatency <= targetDelay + 1;
                this.durationDisplay.classList.toggle('cb-at-live-edge', atLiveEdge);
            } else {
                this.timeDisplay.textContent = formatTime(time);
                this.durationDisplay.textContent = formatTime(duration);
                this.durationDisplay.classList.remove('cb-live-indicator', 'cb-at-live-edge');

                // Show separator for VoD
                if (this.timeSeparator) {
                    this.timeSeparator.classList.remove('cb-hidden-element');
                }
            }

            // Update seekbar progress
            if (duration > 0) {
                const pct = (time / duration) * 100;
                this.seekbarPlayed.style.width = `${Math.min(pct, 100)}%`;
            }

            // Sync rate display with actual playback rate
            const actualRate = this.player.getPlaybackRate();
            if (actualRate !== undefined && actualRate !== null) {
                this._updateRateDisplay(actualRate);
            }
        } catch (err) {
            // Player may not be ready
        }
    }

    _seekToLiveEdge() {
        if (!this._enabled || !this._isDynamic) {
            return;
        }
        try {
            this.player.seekToOriginalLive();
        } catch (e) {
            // Fallback: seek to duration (end of DVR window)
            try {
                this.player.seek(this.player.duration());
            } catch (e2) {
                // Player not ready
            }
        }
    }

    // ================================================================
    // Playback Rate
    // ================================================================

    _changeRate(delta) {
        if (!this._enabled) {
            return;
        }
        try {
            const current = this.player.getPlaybackRate() || 1;
            const next = Math.min(4, Math.max(0.25, Math.round((current + delta) * 4) / 4));
            this.player.setPlaybackRate(next);
            this._updateRateDisplay(next);
        } catch (e) {
            // Player not ready
        }
    }

    _resetRate() {
        if (!this._enabled) {
            return;
        }
        try {
            this.player.setPlaybackRate(1);
            this._updateRateDisplay(1);
        } catch (e) {
            // Player not ready
        }
    }

    _updateRateDisplay(rate) {
        if (this.rateDisplay) {
            this.rateDisplay.textContent = `${rate.toFixed(2)}x`;
        }
    }

    // ================================================================
    // Seekbar
    // ================================================================

    _getSeekTime(clientX) {
        const rect = this.seekbarContainer.getBoundingClientRect();
        let pct = (clientX - rect.left) / rect.width;
        pct = Math.max(0, Math.min(1, pct));
        return pct * (this._duration || 0);
    }

    _onSeekMouseDown(e) {
        if (!this._enabled) {
            return;
        }
        this._seeking = true;
        e.preventDefault();
    }

    _onDocumentMouseMove(e) {
        if (!this._seeking) {
            return;
        }
        const time = this._getSeekTime(e.clientX);
        const pct = (this._duration > 0) ? (time / this._duration) * 100 : 0;
        this.seekbarPlayed.style.width = `${pct}%`;
        this.timeDisplay.textContent = formatTime(time);
    }

    _onDocumentMouseUp(e) {
        if (!this._seeking) {
            return;
        }
        this._seeking = false;
        const time = this._getSeekTime(e.clientX);
        this.player.seek(time);
    }

    _onSeekMouseMove(e) {
        if (!this._enabled || !this._duration) {
            return;
        }
        const time = this._getSeekTime(e.clientX);
        this._showThumbnail(e.clientX, time);
    }

    _onSeekMouseLeave() {
        this._hideThumbnail();
    }

    _onSeekTouchStart(e) {
        if (!this._enabled) {
            return;
        }
        this._seeking = true;
        e.preventDefault();
    }

    _onSeekTouchMove(e) {
        if (!this._seeking || !e.touches[0]) {
            return;
        }
        e.preventDefault();
        const time = this._getSeekTime(e.touches[0].clientX);
        const pct = (this._duration > 0) ? (time / this._duration) * 100 : 0;
        this.seekbarPlayed.style.width = `${pct}%`;
        this.timeDisplay.textContent = formatTime(time);
    }

    _onSeekTouchEnd(e) {
        if (!this._seeking) {
            return;
        }
        this._seeking = false;
        if (e.changedTouches && e.changedTouches[0]) {
            const time = this._getSeekTime(e.changedTouches[0].clientX);
            this.player.seek(time);
        }
    }

    // ================================================================
    // Thumbnails
    // ================================================================

    _showThumbnail(clientX, time) {
        if (!this.player.provideThumbnail) {
            return;
        }

        this.player.provideThumbnail(time, (thumbnail) => {
            if (!thumbnail || !thumbnail.url) {
                this._hideThumbnail();
                return;
            }

            const containerRect = this.seekbarContainer.getBoundingClientRect();
            const wrapperRect = this.wrapper.getBoundingClientRect();

            // Scale thumbnail
            const maxHeight = wrapperRect.height * 0.15;
            const scale = Math.min(maxHeight / thumbnail.height, 2);
            const width = thumbnail.width * scale;
            const height = thumbnail.height * scale;

            this.thumbnailElem.style.width = `${thumbnail.width}px`;
            this.thumbnailElem.style.height = `${thumbnail.height}px`;
            this.thumbnailElem.style.background = `url("${thumbnail.url}") -${thumbnail.x}px -${thumbnail.y}px`;
            this.thumbnailElem.style.backgroundSize = '';
            this.thumbnailElem.style.transform = `scale(${scale})`;

            // Position horizontally centered on mouse
            let left = clientX - containerRect.left - width / 2;
            left = Math.max(0, Math.min(left, containerRect.width - width));

            this.thumbnailContainer.style.left = `${left}px`;
            this.thumbnailContainer.style.bottom = `${containerRect.height + 10}px`;
            this.thumbnailTimeLabel.textContent = formatTime(time);
            this.thumbnailContainer.classList.remove('cb-hidden-element');
        });
    }

    _hideThumbnail() {
        if (this.thumbnailContainer) {
            this.thumbnailContainer.classList.add('cb-hidden-element');
        }
    }

    // ================================================================
    // Buffer
    // ================================================================

    _onBufferLevelUpdated(e) {
        if (!e || e.mediaType !== 'video' || !this._duration || this._isDynamic) {
            return;
        }
        try {
            const dashMetrics = this.player.getDashMetrics();
            const bufferLevel = dashMetrics.getCurrentBufferLevel('video', true) || 0;
            const time = this.player.timeInDvrWindow() || 0;
            const bufferEnd = time + bufferLevel;
            const pct = (bufferEnd / this._duration) * 100;
            this.seekbarBuffer.style.width = `${Math.min(pct, 100)}%`;
        } catch (err) {
            // ignore
        }
    }

    // ================================================================
    // Volume / Mute
    // ================================================================

    _onVolumeInput() {
        const val = parseFloat(this.volumeSlider.value);
        try {
            this.player.setVolume(val);
            this.player.setMute(val === 0);
        } catch (e) {
            // Player not ready
        }
        this._updateMuteIcon();
    }

    _toggleMute() {
        try {
            if (this.player.isMuted()) {
                this.player.setMute(false);
                this.player.setVolume(this._lastVolume || 1);
                this.volumeSlider.value = this._lastVolume || 1;
            } else {
                this._lastVolume = this.player.getVolume();
                this.player.setMute(true);
                this.volumeSlider.value = 0;
            }
        } catch (e) {
            // Player not ready
        }
        this._updateMuteIcon();
    }

    _updateMuteIcon() {
        try {
            const muted = this.player.isMuted() || parseFloat(this.volumeSlider.value) === 0;
            this.muteIcon.className = muted ? 'bi bi-volume-mute-fill' : 'bi bi-volume-up-fill';
        } catch (e) {
            // Player not ready — default to unmuted icon
            this.muteIcon.className = 'bi bi-volume-up-fill';
        }
    }

    // ================================================================
    // Fullscreen
    // ================================================================

    _toggleFullscreen() {
        if (!document.fullscreenElement && !document.webkitFullscreenElement) {
            if (this.wrapper.requestFullscreen) {
                this.wrapper.requestFullscreen();
            } else if (this.wrapper.webkitRequestFullscreen) {
                this.wrapper.webkitRequestFullscreen();
            }
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            } else if (document.webkitExitFullscreen) {
                document.webkitExitFullscreen();
            }
        }
    }

    _onFullscreenChangeBound() {
        this._isFullscreen = !!(document.fullscreenElement || document.webkitFullscreenElement);
        this.fullscreenIcon.className = this._isFullscreen
            ? 'bi bi-fullscreen-exit'
            : 'bi bi-fullscreen';
        this.wrapper.classList.toggle('cb-fullscreen', this._isFullscreen);
    }

    // ================================================================
    // Auto-hide
    // ================================================================

    _onMouseMoveBound() {
        this._showControlBar();
        this._startHideTimer();
    }

    _onMouseLeaveBound() {
        try {
            if (!this.player.isPaused()) {
                this._startHideTimer();
            }
        } catch (e) {
            // Player not ready
        }
    }

    _showControlBar() {
        this.container.classList.remove('cb-hidden');
        this.wrapper.style.cursor = '';
    }

    _hideControlBar() {
        try {
            if (this.player.isPaused() || this._seeking || this._activeMenu) {
                return;
            }
        } catch (e) {
            return;
        }
        this.container.classList.add('cb-hidden');
        this.wrapper.style.cursor = 'none';
    }

    _startHideTimer() {
        this._clearHideTimer();
        try {
            if (this.player.isPaused()) {
                return;
            }
        } catch (e) {
            return;
        }
        this._hideTimer = setTimeout(() => this._hideControlBar(), HIDE_DELAY);
    }

    _clearHideTimer() {
        if (this._hideTimer) {
            clearTimeout(this._hideTimer);
            this._hideTimer = null;
        }
    }

    // ================================================================
    // Stream events
    // ================================================================

    _onStreamActivated() {
        this._rebuildBitrateMenu();
        this._rebuildTrackMenu();
        this._rebuildCaptionMenu();

        // Update duration
        try {
            this._duration = this.player.duration();
            this._isDynamic = this.player.isDynamic();
        } catch (err) {
            // ignore
        }
    }

    _onStreamTeardown() {
        this.reset();
    }

    _onTextTracksAdded() {
        this._rebuildCaptionMenu();
    }

    // ================================================================
    // Menus
    // ================================================================

    _toggleMenu(menuName) {
        const menuEl = this._getMenuElement(menuName);
        if (!menuEl) {
            return;
        }

        if (this._activeMenu === menuName) {
            this._closeAllMenus();
        } else {
            this._closeAllMenus();
            menuEl.classList.remove('cb-hidden-element');
            this._activeMenu = menuName;
        }
    }

    _closeAllMenus() {
        for (const name of ['bitrate', 'track', 'caption']) {
            const menuEl = this._getMenuElement(name);
            if (menuEl) {
                menuEl.classList.add('cb-hidden-element');
            }
        }
        this._activeMenu = null;
    }

    _getMenuElement(name) {
        switch (name) {
        case 'bitrate':
            return this.bitrateMenu;
        case 'track':
            return this.trackMenu;
        case 'caption':
            return this.captionMenu;
        }
        return null;
    }

    _destroyMenus() {
        if (this.bitrateMenu) {
            this.bitrateMenu.innerHTML = '';
        }
        if (this.trackMenu) {
            this.trackMenu.innerHTML = '';
        }
        if (this.captionMenu) {
            this.captionMenu.innerHTML = '';
        }
    }

    _rebuildBitrateMenu() {
        if (!this.bitrateMenu) {
            return;
        }
        this.bitrateMenu.innerHTML = '';

        let hasItems = false;

        for (const type of ['video', 'audio']) {
            try {
                const reps = this.player.getRepresentationsByType(type);
                if (!reps || reps.length < 1) {
                    continue;
                }

                hasItems = true;
                const title = createElement('div', { className: 'cb-menu-title' }, type.charAt(0).toUpperCase() + type.slice(1));
                this.bitrateMenu.appendChild(title);

                // Auto switch option
                const autoItem = createElement('div', {
                    className: 'cb-menu-item cb-menu-item-selected',
                    textContent: 'Auto',
                    onClick: () => {
                        this.player.updateSettings({
                            streaming: { abr: { autoSwitchBitrate: { [type]: true } } }
                        });
                        this._rebuildBitrateMenu();
                    }
                });
                this.bitrateMenu.appendChild(autoItem);

                const settings = this.player.getSettings();
                const autoSwitch = settings?.streaming?.abr?.autoSwitchBitrate?.[type] !== false;
                const currentRep = this.player.getCurrentRepresentationForType(type);

                reps.forEach((rep, idx) => {
                    const bitrate = Math.round(rep.bandwidth / 1000);
                    let label = `${bitrate} kbps`;
                    if (rep.width && rep.height) {
                        label += ` (${rep.width}x${rep.height})`;
                    }

                    const isCurrent = !autoSwitch && currentRep && currentRep.id === rep.id;
                    const item = createElement('div', {
                        className: `cb-menu-item ${isCurrent ? 'cb-menu-item-selected' : ''}`,
                        textContent: label,
                        onClick: () => {
                            this.player.updateSettings({
                                streaming: { abr: { autoSwitchBitrate: { [type]: false } } }
                            });
                            this.player.setRepresentationForTypeByIndex(type, idx, false);
                            this._rebuildBitrateMenu();
                        }
                    });
                    this.bitrateMenu.appendChild(item);
                });

                // Update auto item class
                if (!autoSwitch) {
                    autoItem.classList.remove('cb-menu-item-selected');
                }

            } catch (err) {
                // ignore
            }
        }

        // Show/hide button
        if (this.bitrateBtn) {
            this.bitrateBtn.classList.toggle('cb-hidden-element', !hasItems);
        }
    }

    _rebuildTrackMenu() {
        if (!this.trackMenu) {
            return;
        }
        this.trackMenu.innerHTML = '';

        let hasItems = false;

        for (const type of ['audio', 'video']) {
            try {
                const tracks = this.player.getTracksFor(type);
                if (!tracks || tracks.length < 1) {
                    continue;
                }

                hasItems = true;
                const title = createElement('div', { className: 'cb-menu-title' }, type.charAt(0).toUpperCase() + type.slice(1));
                this.trackMenu.appendChild(title);

                const currentTrack = this.player.getCurrentTrackFor(type);

                tracks.forEach((track) => {
                    let label = '';

                    // Prefer explicit label if available
                    if (track.labels && track.labels.length > 0) {
                        const textLabel = track.labels.find(l => l.text) || track.labels[0];
                        if (textLabel && textLabel.text) {
                            label = textLabel.text;
                        }
                    }

                    // Fall back to language, then to media type name
                    if (!label) {
                        label = track.lang || type.charAt(0).toUpperCase() + type.slice(1);
                    }

                    // Build descriptive details (role, channels, codec)
                    const details = [];
                    if (track.roles && track.roles.length > 0) {
                        const roleValues = track.roles.map(r => r.value).filter(Boolean);
                        if (roleValues.length > 0) {
                            details.push(roleValues.join(', '));
                        }
                    }
                    const channels = this._formatChannels(track);
                    if (channels) {
                        details.push(channels);
                    }
                    if (track.codec) {
                        details.push(track.codec);
                    }
                    if (details.length > 0) {
                        label += ` (${details.join(', ')})`;
                    }

                    const isCurrent = currentTrack && this._isTracksEqual(currentTrack, track);
                    const item = createElement('div', {
                        className: `cb-menu-item ${isCurrent ? 'cb-menu-item-selected' : ''}`,
                        textContent: label,
                        onClick: () => {
                            this.player.setCurrentTrack(track);
                            this._rebuildTrackMenu();
                        }
                    });
                    this.trackMenu.appendChild(item);
                });
            } catch (err) {
                // ignore
            }
        }

        if (this.trackBtn) {
            this.trackBtn.classList.toggle('cb-hidden-element', !hasItems);
        }
    }

    _isTracksEqual(t1, t2) {
        try {
            if (!t1 || !t2) {
                return false;
            }
            return t1.id === t2.id
                && t1.lang === t2.lang
                && t1.viewpoint === t2.viewpoint
                && String(t1.roles || '') === String(t2.roles || '')
                && String(t1.accessibility || '') === String(t2.accessibility || '')
                && String(t1.audioChannelConfiguration || '') === String(t2.audioChannelConfiguration || '');
        } catch (e) {
            return false;
        }
    }

    _formatChannels(track) {
        if (!track.audioChannelConfiguration || !track.audioChannelConfiguration.length) {
            return null;
        }
        const value = track.audioChannelConfiguration[0].value;
        switch (value) {
        case '1':
            return 'mono';
        case '2':
            return 'stereo';
        case '6':
            return '5.1';
        case '8':
            return '7.1';
        default:
            return value ? `${value}ch` : null;
        }
    }

    _rebuildCaptionMenu() {
        if (!this.captionMenu) {
            return;
        }
        this.captionMenu.innerHTML = '';

        try {
            // Use dash.js track info for reliable lang/labels instead of native textTracks
            const tracks = this.player.getTracksFor('text');
            if (!tracks || tracks.length === 0) {
                if (this.captionBtn) {
                    this.captionBtn.classList.add('cb-hidden-element');
                }
                return;
            }

            const currentIdx = this.player.getCurrentTextTrackIndex();

            // OFF option
            const offItem = createElement('div', {
                className: `cb-menu-item ${currentIdx === -1 ? 'cb-menu-item-selected' : ''}`,
                textContent: 'Off',
                onClick: () => {
                    this.player.setTextTrack(-1);
                    this._rebuildCaptionMenu();
                }
            });
            this.captionMenu.appendChild(offItem);

            for (let i = 0; i < tracks.length; i++) {
                const track = tracks[i];

                // Build label: prefer Label element text, fall back to lang
                let label = '';
                if (track.labels && track.labels.length > 0) {
                    const textLabel = track.labels.find(l => l.text);
                    if (textLabel) {
                        label = textLabel.text;
                    }
                }
                if (!label) {
                    label = track.lang || 'Und';
                }

                // Append kind from roles or track kind
                const kind = (track.roles && track.roles.length > 0)
                    ? track.roles[0].value || track.roles[0]
                    : 'subtitle';
                label += ` (${kind})`;

                const isCurrent = currentIdx === i;
                const item = createElement('div', {
                    className: `cb-menu-item ${isCurrent ? 'cb-menu-item-selected' : ''}`,
                    textContent: label,
                    onClick: () => {
                        this.player.setTextTrack(i);
                        this._rebuildCaptionMenu();
                    }
                });
                this.captionMenu.appendChild(item);
            }

            if (this.captionBtn) {
                this.captionBtn.classList.toggle('cb-hidden-element', tracks.length === 0);
            }
        } catch (err) {
            if (this.captionBtn) {
                this.captionBtn.classList.add('cb-hidden-element');
            }
        }
    }
}
