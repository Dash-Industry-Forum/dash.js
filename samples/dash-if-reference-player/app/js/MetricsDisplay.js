/**
 * MetricsDisplay.js - Stats panel tab updates and metric display
 */

import {$} from './UIHelpers.js';

export class MetricsDisplay {
    constructor(playerController, chartController) {
        this.playerController = playerController;
        this.chartController = chartController;
        this._isDynamic = false;
        this._cmsdEnabled = false;
    }

    /**
     * Initialize metric display and bind chart toggle buttons
     */
    init() {
        // Bind chart toggle buttons
        const toggleButtons = document.querySelectorAll('.metric-chart-toggle');
        for (const btn of toggleButtons) {
            btn.addEventListener('click', () => {
                const metric = btn.dataset.metric;
                const type = btn.dataset.type;
                const key = `${type}-${metric}`;
                const isActive = btn.classList.toggle('active');
                if (this.chartController) {
                    this.chartController.toggleSeries(key, isActive, `${type} ${metric}`);
                }
            });
        }

        // Enable buffer and bitrate for video by default
        const defaultMetrics = [
            { metric: 'buffer', type: 'video' },
            { metric: 'bitrate', type: 'video' }
        ];
        for (const { metric, type } of defaultMetrics) {
            const btn = document.querySelector(
                `.metric-chart-toggle[data-metric="${metric}"][data-type="${type}"]`
            );
            if (btn) {
                btn.classList.add('active');
                const key = `${type}-${metric}`;
                if (this.chartController) {
                    this.chartController.toggleSeries(key, true, `${type} ${metric}`);
                }
            }
        }

        // Listen for metrics updates from PlayerController
        this.playerController.on('metricsUpdate', (data) => this._onMetricsUpdate(data));
        this.playerController.on('manifestLoaded', (data) => this._onManifestLoaded(data));
        this.playerController.on('representationSwitch', (data) => this._onRepresentationSwitch(data));
        this.playerController.on('periodSwitchCompleted', (data) => this._onPeriodSwitchCompleted(data));
        this.playerController.on('qualityChangeRendered', (data) => this._onQualityChangeRendered(data));
        this.playerController.on('sessionReset', () => this._onSessionReset());
        this.playerController.on('stopped', () => this._onSessionReset());
    }

    /**
     * Set whether CMSD metrics should be shown
     * @param {boolean} enabled
     */
    setCmsdEnabled(enabled) {
        this._cmsdEnabled = enabled;
        this._toggleCmsdMetrics('video', enabled);
    }

    // ---- Private ----

    _onManifestLoaded(data) {
        this._isDynamic = data.isDynamic;

        // Show/hide live metrics
        this._toggleLiveMetrics('video', data.isDynamic);
        this._toggleLiveMetrics('audio', data.isDynamic);

        // Update MPD tab
        this._setText('ms-mpd-type', data.isDynamic ? 'dynamic' : 'static');
        this._setText('ms-period-count', String(data.periodCount));
    }

    _onRepresentationSwitch(data) {
        if (!data) {
            return;
        }
        const type = data.mediaType;
        const prefix = type === 'video' ? 'mv' : 'ma';

        if (data.currentRepresentation) {
            const bitrate = Math.round(data.currentRepresentation.bandwidth / 1000);
            this._setText(`${prefix}-bitrate`, `${bitrate} kbps`);
        }

        // Update buffering period
        if (data.streamId) {
            this._setText('ms-buffering-period', data.streamId);
        }
    }

    _onPeriodSwitchCompleted(data) {
        this._setText('ms-active-period', data.activePeriodId || '-');
    }

    _onQualityChangeRendered(data) {
        if (!data) {
            return;
        }
        // This event is emitted when quality change is actually rendered
    }

    _onMetricsUpdate(data) {
        const { type, metrics, sessionTime, shouldPlot } = data;
        const prefix = type === 'video' ? 'mv' : 'ma';

        // Buffer level
        if (metrics.bufferLevel !== undefined) {
            const bufferVal = parseFloat(metrics.bufferLevel).toFixed(2);
            this._setText(`${prefix}-buffer`, `${bufferVal} s`);

            // Update buffer bar (assume max ~30s for visual scale)
            const barPct = Math.min((metrics.bufferLevel / 30) * 100, 100);
            const barEl = $(`#${prefix}-buffer-bar`);
            if (barEl) {
                barEl.style.width = `${barPct}%`;
            }
        }

        // Bitrate
        if (metrics.bitrate !== undefined) {
            this._setText(`${prefix}-bitrate`, `${metrics.bitrate} kbps`);
        }

        // Indices
        if (metrics.pendingIndex !== undefined) {
            this._setText(`${prefix}-index-pending`, `${metrics.pendingIndex} / ${metrics.maxIndex}`);
        }
        if (metrics.currentIndex !== undefined) {
            this._setText(`${prefix}-index-current`, `${metrics.currentIndex} / ${metrics.maxIndex}`);
        }

        // Dropped frames
        if (metrics.droppedFrames !== undefined) {
            this._setText(`${prefix}-dropped`, String(metrics.droppedFrames));
        }

        // HTTP metrics
        if (metrics.latencyAvg) {
            this._setText(`${prefix}-latency`, `${metrics.latencyMin} | ${metrics.latencyAvg} | ${metrics.latencyMax}`);
        }
        if (metrics.downloadAvg) {
            this._setText(`${prefix}-download`, `${metrics.downloadMin} | ${metrics.downloadAvg} | ${metrics.downloadMax}`);
        }
        if (metrics.ratioAvg) {
            this._setText(`${prefix}-ratio`, `${metrics.ratioMin} | ${metrics.ratioAvg} | ${metrics.ratioMax}`);
        }

        // CMSD metrics
        if (this._cmsdEnabled) {
            if (metrics.mtp) {
                this._setText(`${prefix}-mtp`, (metrics.mtp / 1000).toFixed(1));
            }
            if (metrics.etp) {
                this._setText(`${prefix}-etp`, (metrics.etp / 1000).toFixed(1));
            }
        }

        // Average throughput
        if (metrics.throughput !== undefined) {
            this._setText(`${prefix}-throughput`, `${metrics.throughput} kbit/s`);
        }

        // Resolution (video only)
        if (type === 'video' && metrics.resolution) {
            this._setText(`${prefix}-resolution`, metrics.resolution);
        }

        // Framerate (video only)
        if (type === 'video' && metrics.framerate) {
            this._setText(`${prefix}-framerate`, `${metrics.framerate} fps`);
        }

        // Codec
        if (metrics.codec) {
            this._setText(`${prefix}-codec`, metrics.codec);
        }

        // Segment duration
        if (metrics.segmentDuration !== undefined) {
            this._setText(`${prefix}-segment-duration`, `${parseFloat(metrics.segmentDuration).toFixed(2)} s`);
        }

        // Buffer state
        if (metrics.bufferState) {
            this._setText(`${prefix}-buffer-state`,
                metrics.bufferState === 'bufferLoaded' ? 'Loaded' : 'Stalled');
        }

        // Playback rate (applicable to both VoD and live)
        if (metrics.playbackRate !== undefined) {
            this._setText(`${prefix}-playback-rate`, `${parseFloat(metrics.playbackRate).toFixed(2)}x`);
        }

        // Live-only metrics
        if (this._isDynamic) {
            if (metrics.liveLatency !== undefined) {
                this._setText(`${prefix}-live-latency`, `${parseFloat(metrics.liveLatency).toFixed(2)} s`);
            }
            if (metrics.targetDelay !== undefined) {
                this._setText(`${prefix}-target-delay`, `${parseFloat(metrics.targetDelay).toFixed(2)} s`);
            }
            if (metrics.dvrWindowSize !== undefined) {
                this._setText('ms-dvr-window', `${Math.round(metrics.dvrWindowSize)} s`);
            }
        }

        // Plot to chart
        if (shouldPlot && this.chartController) {
            this._plotMetrics(type, metrics, sessionTime);
        }
    }

    _plotMetrics(type, metrics, sessionTime) {
        const chart = this.chartController;
        const keys = {
            buffer: metrics.bufferLevel,
            bitrate: metrics.bitrate,
            pendingIndex: metrics.pendingIndex,
            currentIndex: metrics.currentIndex,
            droppedFrames: metrics.droppedFrames,
            throughput: metrics.throughput,
            latency: metrics.latencyAvg,
            download: metrics.downloadAvg,
            ratio: parseFloat(metrics.ratioAvg),
            mtp: metrics.mtp ? metrics.mtp / 1000 : null,
            etp: metrics.etp ? metrics.etp / 1000 : null,
            liveLatency: metrics.liveLatency,
            playbackRate: metrics.playbackRate
        };

        for (const [metric, value] of Object.entries(keys)) {
            if (value !== null && value !== undefined && !isNaN(value)) {
                chart.addDataPoint(`${type}-${metric}`, sessionTime, value);
            }
        }
    }

    _onSessionReset() {
        // Reset all displayed values
        for (const prefix of ['mv', 'ma']) {
            this._setText(`${prefix}-buffer`, '0.00 s');
            this._setText(`${prefix}-bitrate`, '0 kbps');
            this._setText(`${prefix}-index-pending`, '0 / 0');
            this._setText(`${prefix}-index-current`, '0 / 0');
            this._setText(`${prefix}-dropped`, '0');
            this._setText(`${prefix}-throughput`, '0 kbit/s');
            this._setText(`${prefix}-codec`, '-');
            this._setText(`${prefix}-segment-duration`, '-');
            this._setText(`${prefix}-buffer-state`, '-');
            this._setText(`${prefix}-latency`, '-');
            this._setText(`${prefix}-download`, '-');
            this._setText(`${prefix}-ratio`, '-');
            this._setText(`${prefix}-mtp`, '-');
            this._setText(`${prefix}-etp`, '-');
            this._setText(`${prefix}-live-latency`, '-');
            this._setText(`${prefix}-playback-rate`, '1.0x');
            this._setText(`${prefix}-target-delay`, '-');

            const bar = $(`#${prefix}-buffer-bar`);
            if (bar) {
                bar.style.width = '0%';
            }
        }

        this._setText('mv-resolution', '-');
        this._setText('mv-framerate', '-');
        this._setText('ms-active-period', '-');
        this._setText('ms-buffering-period', '-');
        this._setText('ms-dvr-window', '-');
        this._setText('ms-mpd-type', '-');
        this._setText('ms-period-count', '-');

        this._toggleLiveMetrics('video', false);
        this._toggleLiveMetrics('audio', false);
    }

    _toggleLiveMetrics(type, show) {
        const prefix = type === 'video' ? 'mv' : 'ma';
        const elements = [
            `${prefix}-live-section`, `${prefix}-live-latency-row`
        ];

        // Target delay row is video-only
        if (type === 'video') {
            elements.push(`${prefix}-target-delay-row`);
        }

        for (const id of elements) {
            const el = $(`#${id}`);
            if (el) {
                el.classList.toggle('d-none', !show);
            }
        }

        // DVR window in stream tab (toggle once from video)
        if (type === 'video') {
            const dvrEl = $('#ms-dvr-window-row');
            if (dvrEl) {
                dvrEl.classList.toggle('d-none', !show);
            }
        }
    }

    _toggleCmsdMetrics(type, show) {
        const prefix = type === 'video' ? 'mv' : 'ma';
        const elements = [`${prefix}-cmsd-section`, `${prefix}-mtp-row`, `${prefix}-etp-row`];
        for (const id of elements) {
            const el = $(`#${id}`);
            if (el) {
                el.classList.toggle('d-none', !show);
            }
        }
    }

    _setText(id, text) {
        const el = $(`#${id}`);
        if (el) {
            el.textContent = text;
        }
    }
}
