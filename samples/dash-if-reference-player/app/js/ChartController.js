/**
 * ChartController.js - Chart.js integration for real-time metrics plotting
 */

import {$, formatTime} from './UIHelpers.js';

// Chart is loaded globally via UMD script tag in index.html
const { Chart } = window;

const MAX_DATA_POINTS = 30;
const MAX_SERIES = 5;

// Color palette for chart series
const COLORS = [
    '#0d6efd', // blue
    '#dc3545', // red
    '#198754', // green
    '#ffc107', // yellow
    '#0dcaf0', // cyan
    '#6f42c1', // purple
    '#fd7e14', // orange
    '#20c997', // teal
    '#d63384', // pink
    '#6ea8fe', // light blue
];

// Unit metadata per metric — used for dual Y-axis assignment
const METRIC_UNITS = {
    buffer: { unit: 's', label: 'Seconds' },
    liveLatency: { unit: 's', label: 'Seconds' },
    bitrate: { unit: 'kbps', label: 'kbps' },
    throughput: { unit: 'kbps', label: 'kbit/s' },
    pendingIndex: { unit: 'idx', label: 'Index' },
    currentIndex: { unit: 'idx', label: 'Index' },
    droppedFrames: { unit: 'count', label: 'Count' },
    latency: { unit: 'ms', label: 'ms' },
    download: { unit: 'ms', label: 'ms' },
    ratio: { unit: 'ratio', label: 'Ratio' },
    playbackRate: { unit: 'ratio', label: 'Ratio' },
    mtp: { unit: 'Mbps', label: 'Mbps' },
    etp: { unit: 'Mbps', label: 'Mbps' },
};

export class ChartController {
    constructor() {
        this.chart = null;
        this._enabled = true;
        this._series = {};     // key -> { label, colorIdx, data: [{x, y}] }
        this._colorIdx = 0;
    }

    /**
     * Initialize Chart.js
     */
    init() {
        const canvas = $('#metrics-chart');
        if (!canvas) {
            return;
        }

        this.chart = new Chart(canvas.getContext('2d'), {
            type: 'line',
            data: {
                datasets: []
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: {
                    duration: 300
                },
                interaction: {
                    intersect: false,
                    mode: 'index'
                },
                plugins: {
                    legend: {
                        display: true,
                        position: 'top',
                        labels: {
                            color: '#8a8aa0',
                            font: { size: 11 },
                            boxWidth: 12,
                            padding: 15
                        },
                        onClick: (e, legendItem) => {
                            // Toggle visibility
                            const idx = legendItem.datasetIndex;
                            const meta = this.chart.getDatasetMeta(idx);
                            meta.hidden = !meta.hidden;
                            this.chart.update();
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(20, 20, 40, 0.9)',
                        titleColor: '#e0e0e0',
                        bodyColor: '#e0e0e0',
                        borderColor: '#2d2d50',
                        borderWidth: 1,
                        padding: 10,
                        cornerRadius: 6
                    }
                },
                scales: {
                    x: {
                        type: 'linear',
                        title: {
                            display: true,
                            text: 'Time',
                            color: '#8a8aa0',
                            font: { size: 11 }
                        },
                        ticks: {
                            color: '#8a8aa0',
                            font: { size: 10 },
                            callback: (value) => formatTime(value)
                        },
                        grid: {
                            color: 'rgba(255, 255, 255, 0.05)'
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'Value',
                            color: '#8a8aa0',
                            font: { size: 11 }
                        },
                        ticks: {
                            color: '#8a8aa0',
                            font: { size: 10 }
                        },
                        grid: {
                            color: 'rgba(255, 255, 255, 0.05)'
                        },
                        beginAtZero: true
                    }
                }
            }
        });

        // Apply theme-aware colors
        this.updateTheme();

        // Bind chart control buttons
        const clearBtn = $('#btn-chart-clear');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => this.clearAllData());
        }

        const toggleBtn = $('#btn-chart-toggle');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', () => this.toggleEnabled());
        }
    }

    /**
     * Toggle a metric series on/off
     * @param {string} key - e.g. "video-buffer"
     * @param {boolean} active
     * @param {string} label - display name
     */
    toggleSeries(key, active, label) {
        if (active) {
            // Check max series limit
            const activeCount = Object.keys(this._series).length;
            if (activeCount >= MAX_SERIES) {
                // Deactivate - we've hit the limit
                // Find the toggle button and deactivate it
                const btn = document.querySelector(`.metric-chart-toggle[data-metric="${key.split('-')[1]}"][data-type="${key.split('-')[0]}"]`);
                if (btn) {
                    btn.classList.remove('active');
                }
                return;
            }

            // Extract metric name from key (e.g. "video-buffer" -> "buffer")
            const metricName = key.split('-').slice(1).join('-');
            const unitInfo = METRIC_UNITS[metricName] || { unit: 'value', label: 'Value' };

            this._series[key] = {
                label,
                colorIdx: this._colorIdx % COLORS.length,
                unit: unitInfo.unit,
                unitLabel: unitInfo.label,
                data: []
            };
            this._colorIdx++;
            this._rebuildDatasets();
        } else {
            delete this._series[key];
            this._rebuildDatasets();
        }
    }

    /**
     * Add a data point to a series (only if the series is active)
     * @param {string} key
     * @param {number} time
     * @param {number} value
     */
    addDataPoint(key, time, value) {
        if (!this._enabled || !this._series[key]) {
            return;
        }

        const series = this._series[key];
        series.data.push({ x: time, y: value });

        // Trim to max data points
        if (series.data.length > MAX_DATA_POINTS) {
            series.data.shift();
        }

        this._updateChart();
    }

    /**
     * Clear all chart data but keep series active
     */
    clearAllData() {
        for (const key of Object.keys(this._series)) {
            this._series[key].data = [];
        }
        this._updateChart();
    }

    /**
     * Toggle chart enabled/disabled
     */
    toggleEnabled() {
        this._enabled = !this._enabled;
        const panel = $('#chart-panel');
        const btn = $('#btn-chart-toggle');

        if (panel) {
            panel.classList.toggle('chart-disabled', !this._enabled);
        }
        if (btn) {
            btn.innerHTML = this._enabled
                ? '<i class="bi bi-eye"></i> Enabled'
                : '<i class="bi bi-eye-slash"></i> Disabled';
        }
    }

    /**
     * Update chart colors to match the current theme (reads CSS custom properties)
     */
    updateTheme() {
        if (!this.chart) {
            return;
        }

        const style = getComputedStyle(document.documentElement);
        const grid = style.getPropertyValue('--rp-chart-grid').trim();
        const tick = style.getPropertyValue('--rp-chart-tick').trim();
        const tooltipBg = style.getPropertyValue('--rp-chart-tooltip-bg').trim();
        const tooltipText = style.getPropertyValue('--rp-chart-tooltip-text').trim();
        const tooltipBorder = style.getPropertyValue('--rp-chart-tooltip-border').trim();

        const opts = this.chart.options;
        opts.scales.x.grid.color = grid;
        opts.scales.x.ticks.color = tick;
        opts.scales.x.title.color = tick;
        opts.scales.y.grid.color = grid;
        opts.scales.y.ticks.color = tick;
        opts.scales.y.title.color = tick;

        // Style right axis if it exists
        if (opts.scales.y1) {
            opts.scales.y1.grid.color = grid;
            opts.scales.y1.ticks.color = tick;
            opts.scales.y1.title.color = tick;
        }

        opts.plugins.legend.labels.color = tick;
        opts.plugins.tooltip.backgroundColor = tooltipBg;
        opts.plugins.tooltip.titleColor = tooltipText;
        opts.plugins.tooltip.bodyColor = tooltipText;
        opts.plugins.tooltip.borderColor = tooltipBorder;

        this.chart.update('none');
    }

    /**
     * Full reset (on session reset)
     */
    reset() {
        this._series = {};
        this._colorIdx = 0;
        if (this.chart) {
            this.chart.data.datasets = [];
            // Remove right axis and reset left axis label
            delete this.chart.options.scales.y1;
            this.chart.options.scales.y.title.text = 'Value';
            this.chart.update('none');
        }

        // Deactivate all toggle buttons
        const buttons = document.querySelectorAll('.metric-chart-toggle.active');
        for (const btn of buttons) {
            btn.classList.remove('active');
        }
    }

    // ---- Private ----

    /**
     * Determine axis assignment for each active series based on unit.
     * Returns a map: unit -> 'y' | 'y1', plus metadata for axis labels.
     */
    _assignAxes() {
        const unitOrder = [];  // ordered list of distinct units
        for (const series of Object.values(this._series)) {
            if (!unitOrder.includes(series.unit)) {
                unitOrder.push(series.unit);
            }
        }

        // First unit -> left axis (y), second unit -> right axis (y1)
        // Third+ units fall back to left axis
        const unitToAxis = {};
        for (let i = 0; i < unitOrder.length; i++) {
            unitToAxis[unitOrder[i]] = i === 1 ? 'y1' : 'y';
        }

        // Build label for each axis
        const axisLabels = { y: null, y1: null };
        for (const series of Object.values(this._series)) {
            const axisId = unitToAxis[series.unit];
            if (!axisLabels[axisId]) {
                axisLabels[axisId] = series.unitLabel;
            } else if (!axisLabels[axisId].includes(series.unitLabel)) {
                axisLabels[axisId] += ' / ' + series.unitLabel;
            }
        }

        return { unitToAxis, axisLabels, hasRightAxis: unitOrder.length >= 2 };
    }

    _rebuildDatasets() {
        if (!this.chart) {
            return;
        }

        const { unitToAxis, axisLabels, hasRightAxis } = this._assignAxes();

        // Build datasets with axis assignment
        this.chart.data.datasets = Object.entries(this._series).map(([key, series]) => ({
            label: series.label,
            data: [...series.data],
            borderColor: COLORS[series.colorIdx],
            backgroundColor: COLORS[series.colorIdx] + '20',
            borderWidth: 2,
            pointRadius: 2,
            pointHoverRadius: 4,
            tension: 0.3,
            fill: false,
            yAxisID: unitToAxis[series.unit]
        }));

        // Update left axis label
        const opts = this.chart.options;
        opts.scales.y.title.text = axisLabels.y || 'Value';

        // Manage right axis
        if (hasRightAxis) {
            const style = getComputedStyle(document.documentElement);
            const grid = style.getPropertyValue('--rp-chart-grid').trim();
            const tick = style.getPropertyValue('--rp-chart-tick').trim();

            opts.scales.y1 = {
                position: 'right',
                title: {
                    display: true,
                    text: axisLabels.y1,
                    color: tick,
                    font: { size: 11 }
                },
                ticks: {
                    color: tick,
                    font: { size: 10 }
                },
                grid: {
                    drawOnChartArea: false,
                    color: grid
                },
                beginAtZero: true
            };
        } else {
            // Remove right axis when not needed
            delete opts.scales.y1;
        }

        this.chart.update('none');
    }

    _updateChart() {
        if (!this.chart) {
            return;
        }

        // Update datasets in place
        const entries = Object.entries(this._series);
        for (let i = 0; i < entries.length; i++) {
            const [, series] = entries[i];
            if (this.chart.data.datasets[i]) {
                this.chart.data.datasets[i].data = [...series.data];
            }
        }

        this.chart.update('none');
    }
}
