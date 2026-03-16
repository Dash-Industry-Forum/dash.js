/**
 * PlayerController.js - dash.js player lifecycle, event handling, metrics polling
 */

import {EventEmitter} from './UIHelpers.js';

export class PlayerController extends EventEmitter {
    constructor() {
        super();
        this.player = null;
        this.video = null;
        this.isDynamic = false;
        this.periodCount = 0;
        this.activePeriodId = '';
        this.bufferingPeriodId = '';
        this.selectedKeySystem = '';
        this.persistentSessionId = '';
        this.conformanceViolations = [];
        this._metricsInterval = null;
        this._metricsTickCount = 0;
        this._sessionStartTime = 0;
        this._currentRenderedRep = { video: null, audio: null };
    }

    /**
     * Initialize the dash.js player
     * @param {HTMLVideoElement} videoElement
     * @param {boolean} autoPlay
     */
    init(videoElement, autoPlay = true) {
        this.video = videoElement;

        /* global dashjs */
        this.player = dashjs.MediaPlayer().create();
        this.player.initialize(this.video, null, autoPlay);

        // Store on window for console debugging
        window.player = this.player;

        this._registerEvents();
    }

    /**
     * Get the player version string
     * @returns {string}
     */
    getVersion() {
        return this.player ? this.player.getVersion() : '';
    }

    /**
     * Apply a configuration object to the player
     * @param {Object} config
     */
    updateSettings(config) {
        if (this.player) {
            this.player.updateSettings(config);
        }
    }

    /**
     * Get current player settings
     * @returns {Object}
     */
    getSettings() {
        return this.player ? this.player.getSettings() : {};
    }

    /**
     * Load a stream
     * @param {string} url - MPD URL
     * @param {Object} [protectionData] - DRM protection data
     */
    load(url, protectionData) {
        if (!this.player || !url) {
            return;
        }

        this._resetSession();

        if (protectionData && Object.keys(protectionData).length > 0) {
            this.player.setProtectionData(protectionData);
        }

        this.player.attachSource(url);
        this.emit('loaded', { url });
    }

    /**
     * Stop playback and detach source
     */
    stop() {
        if (!this.player) {
            return;
        }

        this._stopMetricsPolling();
        this.player.attachSource(null);
        this.isDynamic = false;
        this.periodCount = 0;
        this.activePeriodId = '';
        this.bufferingPeriodId = '';
        this._currentRenderedRep = { video: null, audio: null };
        this.conformanceViolations = [];
        this.emit('stopped');
    }

    /**
     * Set initial media settings for a type
     * @param {string} type - 'audio', 'video', or 'text'
     * @param {Object} settings
     */
    setInitialMediaSettings(type, settings) {
        if (this.player) {
            this.player.setInitialMediaSettingsFor(type, settings);
        }
    }

    /**
     * Enable forced text streaming
     * @param {boolean} enabled
     */
    enableForcedTextStreaming(enabled) {
        if (this.player) {
            this.player.enableForcedTextStreaming(enabled);
        }
    }

    /**
     * Attach TTML rendering div
     * @param {HTMLElement} div
     */
    attachTTMLRenderingDiv(div) {
        if (this.player) {
            this.player.attachTTMLRenderingDiv(div);
        }
    }

    /**
     * Get elapsed time since session start
     * @returns {number} seconds
     */
    getSessionTime() {
        if (!this._sessionStartTime) {
            return 0;
        }
        return (Date.now() - this._sessionStartTime) / 1000;
    }

    /**
     * Destroy the player
     */
    destroy() {
        this._stopMetricsPolling();
        if (this.player) {
            this.player.destroy();
            this.player = null;
        }
    }

    // --- Private methods ---

    _resetSession() {
        this._sessionStartTime = Date.now();
        this._metricsTickCount = 0;
        this._currentRenderedRep = { video: null, audio: null };
        this.conformanceViolations = [];
        this.emit('sessionReset');
    }

    _registerEvents() {
        const events = dashjs.MediaPlayer.events;

        this.player.on(events.ERROR, (e) => this._onError(e));
        this.player.on(events.MANIFEST_LOADED, (e) => this._onManifestLoaded(e));
        this.player.on(events.REPRESENTATION_SWITCH, (e) => this._onRepresentationSwitch(e));
        this.player.on(events.PERIOD_SWITCH_COMPLETED, (e) => this._onPeriodSwitchCompleted(e));
        this.player.on(events.QUALITY_CHANGE_RENDERED, (e) => this._onQualityChangeRendered(e));
        this.player.on(events.STREAM_INITIALIZED, (e) => this._onStreamInitialized(e));
        this.player.on(events.PLAYBACK_ENDED, (e) => this._onPlaybackEnded(e));
        this.player.on(events.KEY_SYSTEM_SELECTED, (e) => this._onKeySystemSelected(e));
        this.player.on(events.KEY_SESSION_CREATED, (e) => this._onKeySessionCreated(e));
        this.player.on(events.CONFORMANCE_VIOLATION, (e) => this._onConformanceViolation(e));
        this.player.on(events.LOG, (e) => this._onLog(e));
    }

    _onError(e) {
        this.emit('error', e);
    }

    _onManifestLoaded(e) {
        if (e.data) {
            this.isDynamic = e.data.type === 'dynamic';
            this.periodCount = e.data.Period ? e.data.Period.length : 0;
        }
        this.emit('manifestLoaded', {
            isDynamic: this.isDynamic,
            periodCount: this.periodCount
        });
    }

    _onRepresentationSwitch(e) {
        this.emit('representationSwitch', e);
    }

    _onPeriodSwitchCompleted(e) {
        if (e.toStreamInfo) {
            this.activePeriodId = e.toStreamInfo.id || '';
        }
        this.emit('periodSwitchCompleted', {
            activePeriodId: this.activePeriodId
        });
    }

    _onQualityChangeRendered(e) {
        if (e && e.mediaType && e.newRepresentation) {
            this._currentRenderedRep[e.mediaType] = e.newRepresentation;
        }
        this.emit('qualityChangeRendered', e);
    }

    _onStreamInitialized() {
        this._startMetricsPolling();
        this.emit('streamInitialized');
    }

    _onPlaybackEnded() {
        this.emit('playbackEnded');
    }

    _onKeySystemSelected(e) {
        if (e.data) {
            this.selectedKeySystem = e.data.keySystem
                ? e.data.keySystem.systemString
                : '';
        }
        this.emit('keySystemSelected', {
            keySystem: this.selectedKeySystem
        });
    }

    _onKeySessionCreated(e) {
        if (e.data) {
            this.persistentSessionId = e.data.sessionID || '';
        }
    }

    _onConformanceViolation(e) {
        if (e && e.event) {
            const key = e.event.key;
            const exists = this.conformanceViolations.some(v => v.event && v.event.key === key);
            if (!exists) {
                this.conformanceViolations.push(e);
                this.emit('conformanceViolation', e);
            }
        }
    }

    _onLog(e) {
        // Only forward warning (3), error (2), and fatal (1) log messages
        if (e && e.level <= 3) {
            this.emit('log', { level: e.level, message: e.message });
        }
    }

    _startMetricsPolling() {
        this._stopMetricsPolling();
        this._metricsInterval = setInterval(() => this._pollMetrics(), 1000);
    }

    _stopMetricsPolling() {
        if (this._metricsInterval) {
            clearInterval(this._metricsInterval);
            this._metricsInterval = null;
        }
    }

    _pollMetrics() {
        if (!this.player) {
            return;
        }

        this._metricsTickCount++;
        const dashMetrics = this.player.getDashMetrics();

        if (!dashMetrics) {
            return;
        }

        const sessionTime = this.getSessionTime();
        const plotEveryOtherTick = this._metricsTickCount % 2 === 0;

        for (const type of ['video', 'audio']) {
            const metrics = this._gatherMetrics(type, dashMetrics);
            this.emit('metricsUpdate', {
                type,
                metrics,
                sessionTime,
                shouldPlot: plotEveryOtherTick
            });
        }
    }

    _gatherMetrics(type, dashMetrics) {
        const metrics = {};

        try {
            // Buffer level
            metrics.bufferLevel = dashMetrics.getCurrentBufferLevel(type, true) || 0;

            // Representations (display as 1-based: 1/N instead of 0/N)
            const reps = this.player.getRepresentationsByType(type);
            metrics.maxIndex = reps ? reps.length : 0;

            // Index (downloading) — from representation switch metric
            const repSwitch = dashMetrics.getCurrentRepresentationSwitch(type, true);
            if (repSwitch) {
                const pendingIdx = reps
                    ? reps.findIndex(r => r.id === repSwitch.to)
                    : -1;
                metrics.pendingIndex = pendingIdx + 1;
            }

            // Index (playing) — from QUALITY_CHANGE_RENDERED event
            const renderedRep = this._currentRenderedRep[type];
            if (renderedRep) {
                const currentIdx = reps
                    ? reps.findIndex(r => r.id === renderedRep.id)
                    : -1;
                metrics.currentIndex = currentIdx + 1;
                metrics.bitrate = Math.round(renderedRep.bandwidth / 1000);

                // Resolution (video only)
                if (type === 'video' && renderedRep.width && renderedRep.height) {
                    metrics.resolution = `${renderedRep.width}x${renderedRep.height}`;
                }

                // Framerate (video only)
                if (type === 'video' && renderedRep.frameRate) {
                    metrics.framerate = renderedRep.frameRate;
                }

                // Segment duration
                if (renderedRep.fragmentDuration && !isNaN(renderedRep.fragmentDuration)) {
                    metrics.segmentDuration = renderedRep.fragmentDuration;
                }
            }

            // Dropped frames
            const droppedFrames = dashMetrics.getCurrentDroppedFrames();
            metrics.droppedFrames = droppedFrames ? droppedFrames.droppedFrames : 0;

            // Average throughput
            metrics.throughput = Math.round(this.player.getAverageThroughput(type) || 0);

            // Codec
            try {
                const currentTrack = this.player.getCurrentTrackFor(type);
                if (currentTrack && currentTrack.codec) {
                    metrics.codec = currentTrack.codec;
                }
            } catch (e) {
                // Track may not be available yet
            }

            // Buffer state
            const bufferState = dashMetrics.getCurrentBufferState(type);
            if (bufferState) {
                metrics.bufferState = bufferState.state;
            }

            // HTTP metrics
            const httpMetrics = this._calculateHTTPMetrics(type, dashMetrics);
            Object.assign(metrics, httpMetrics);

            // Playback rate (applicable to all content types)
            metrics.playbackRate = this.player.getPlaybackRate() || 1;

            // Live-specific metrics
            if (this.isDynamic) {
                metrics.liveLatency = this.player.getCurrentLiveLatency() || 0;

                // Target live delay and DVR window (video only to avoid duplicates)
                if (type === 'video') {
                    metrics.targetDelay = this.player.getTargetLiveDelay() || 0;
                    const dvrWindow = this.player.getDvrWindow();
                    if (dvrWindow && dvrWindow.size) {
                        metrics.dvrWindowSize = dvrWindow.size;
                    }
                }
            }

            // Throughput (legacy field — kept for chart plotting)
            metrics.averageThroughput = this.player.getAverageThroughput(type) || 0;

        } catch (err) {
            // Metrics may not be available yet
        }

        return metrics;
    }

    _calculateHTTPMetrics(type, dashMetrics) {
        const result = {
            latencyMin: 0, latencyAvg: 0, latencyMax: 0,
            downloadMin: 0, downloadAvg: 0, downloadMax: 0,
            ratioMin: 0, ratioAvg: 0, ratioMax: 0,
            mtp: 0, etp: 0
        };

        try {
            const httpRequests = dashMetrics.getHttpRequests(type);
            if (!httpRequests || httpRequests.length === 0) {
                return result;
            }

            // Take last 4 completed requests
            const completed = httpRequests.filter(r =>
                r.responsecode >= 200 && r.responsecode < 300 &&
                r.type === 'MediaSegment' &&
                r.tresponse && r.trequest &&
                r.tfinish && r.tresponse
            ).slice(-4);

            if (completed.length === 0) {
                return result;
            }

            const latencies = [];
            const downloads = [];
            const ratios = [];

            for (const req of completed) {
                const latency = req.tresponse.getTime() - req.trequest.getTime();
                const download = req.tfinish.getTime() - req.tresponse.getTime();
                latencies.push(latency);
                downloads.push(download);

                // Calculate ratio (download / segment duration)
                if (req.mediaduration && req.mediaduration > 0) {
                    const ratio = download / (req.mediaduration * 1000);
                    ratios.push(ratio);
                }

                // CMSD metrics
                if (req.cmsd) {
                    if (req.cmsd.dynamic && req.cmsd.dynamic.mtp) {
                        result.mtp = req.cmsd.dynamic.mtp;
                    }
                    if (req.cmsd.dynamic && req.cmsd.dynamic.etp) {
                        result.etp = req.cmsd.dynamic.etp;
                    }
                }
            }

            if (latencies.length > 0) {
                result.latencyMin = Math.min(...latencies);
                result.latencyMax = Math.max(...latencies);
                result.latencyAvg = Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length);
            }
            if (downloads.length > 0) {
                result.downloadMin = Math.min(...downloads);
                result.downloadMax = Math.max(...downloads);
                result.downloadAvg = Math.round(downloads.reduce((a, b) => a + b, 0) / downloads.length);
            }
            if (ratios.length > 0) {
                result.ratioMin = Math.min(...ratios).toFixed(2);
                result.ratioMax = Math.max(...ratios).toFixed(2);
                result.ratioAvg = (ratios.reduce((a, b) => a + b, 0) / ratios.length).toFixed(2);
            }
        } catch (err) {
            // Metrics may not be available yet
        }

        return result;
    }
}
