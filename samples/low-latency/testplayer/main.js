var METRIC_INTERVAL = 200;
var CHART_INTERVAL = 200;
var NUMBER_OF_CHART_ENTRIES = 300;

var App = function () {
    this.player = null;
    this.video = null;
    this.chart = null;
};

App.prototype.init = function () {
    this._registerEventHandler();
    this._startIntervalHandler();
    this._setupLineChart();
}

App.prototype._load = function () {
    var url;

    if (this.player) {
        this.player.reset();
        this._unregisterDashEventHandler();
    }

    url = document.getElementById('manifest').value;

    this.video = document.querySelector('video');
    this.player = dashjs.MediaPlayer().create();
    this.player.updateSettings({ 'streaming': { 'lowLatencyEnabled': true } });
    this.player.initialize(this.video, url, true);
    this._registerDashEventHandler();
    this._applyParameters();
}

App.prototype._applyParameters = function () {

    if (!this.player) {
        return;
    }

    var targetLatency = parseFloat(document.getElementById('target-latency').value, 10);
    var minDrift = parseFloat(document.getElementById('min-drift').value, 10);
    var maxDrift = parseFloat(document.getElementById('max-drift').value, 10);
    var catchupPlaybackRate = parseFloat(document.getElementById('catchup-playback-rate').value, 10);
    var liveCatchupLatencyThreshold = parseFloat(document.getElementById('catchup-threshold').value, 10);
    var abrGeneral = document.querySelector('input[name="abr-general"]:checked').value;
    var abrAdditionalInsufficientBufferRule = document.getElementById('abr-additional-insufficient').checked;
    var abrAdditionalDroppedFramesRule = document.getElementById('abr-additional-dropped').checked;
    var abrAdditionalAbandonRequestRule = document.getElementById('abr-additional-abandon').checked;
    var abrAdditionalSwitchHistoryRule = document.getElementById('abr-additional-switch').checked;
    var catchupMechanism = document.querySelector('input[name="catchup"]:checked').value;
    var throughputCalculation = document.querySelector('input[name="throughput-calc"]:checked').value;


    this.player.updateSettings({
        streaming: {
            delay: {
                liveDelay: targetLatency
            },
            liveCatchup: {
                minDrift: minDrift,
                maxDrift: maxDrift,
                playbackRate: catchupPlaybackRate,
                latencyThreshold: liveCatchupLatencyThreshold,
                mode: catchupMechanism
            },
            abr: {
                ABRStrategy: abrGeneral,
                additionalAbrRules: {
                    insufficientBufferRule: abrAdditionalInsufficientBufferRule,
                    switchHistoryRule: abrAdditionalSwitchHistoryRule,
                    droppedFramesRule: abrAdditionalDroppedFramesRule,
                    abandonRequestsRule: abrAdditionalAbandonRequestRule
                },
                fetchThroughputCalculationMode: throughputCalculation
            }
        }
    });
}

App.prototype._setupLineChart = function () {
    var data = {
        datasets: [
            {
                label: 'Live delay',
                borderColor: '#3944bc',
                backgroundColor: '#3944bc',
            },
            {
                label: 'Buffer level',
                borderColor: '#d0312d',
                backgroundColor: '#d0312d',
            },
            {
                label: 'Playback rate',
                borderColor: '#3cb043',
                backgroundColor: '#3cb043',
            }]
    };
    var config = {
        type: 'line',
        data: data,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    min: 0,
                    ticks: {
                        stepSize: 0.5
                    },
                    title: {
                        display: true,
                        text: 'Value in Seconds'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Value in Seconds'
                    }
                }
            },
            plugins: {
                legend: {
                    position: 'top',
                },
                title: {
                    display: true,
                    text: 'Live data',
                    y: {
                        text: 'y-axis'
                    }
                }
            }
        },
    };
    var playbackTime = 0,
        lastTimeStamp = null;
    var self = this;

    // eslint-disable-next-line no-undef
    this.chart = new Chart(
        document.getElementById('metric-chart'),
        config
    );

    setInterval(function () {
        if (self.player && self.player.isReady()) {
            const data = self.chart.data;
            if (data.datasets.length > 0) {

                if (data.labels.length > NUMBER_OF_CHART_ENTRIES) {
                    data.labels.shift();
                }

                if (lastTimeStamp) {
                    playbackTime += Date.now() - lastTimeStamp;
                }

                data.labels.push(parseFloat(playbackTime / 1000).toFixed(3));

                lastTimeStamp = Date.now();

                for (var i = 0; i < data.datasets.length; i++) {
                    if (data.datasets[i].data.length > NUMBER_OF_CHART_ENTRIES) {
                        data.datasets[i].data.shift();
                    }
                }
                data.datasets[0].data.push(parseFloat(self.player.getCurrentLiveLatency()).toFixed(2));

                var dashMetrics = self.player.getDashMetrics();
                data.datasets[1].data.push(parseFloat(dashMetrics.getCurrentBufferLevel('video')).toFixed(2));

                data.datasets[2].data.push(parseFloat(self.player.getPlaybackRate()).toFixed(2));

                self.chart.update();
            }
        }
    }, CHART_INTERVAL)
}

App.prototype._startIntervalHandler = function () {
    var self = this;
    setInterval(function () {
        if (self.player && self.player.isReady()) {
            var dashMetrics = self.player.getDashMetrics();
            var settings = self.player.getSettings();

            var currentLatency = parseFloat(self.player.getCurrentLiveLatency(), 10);
            document.getElementById('latency-tag').innerHTML = currentLatency + ' secs';

            document.getElementById('mindrift-tag').innerHTML = settings.streaming.liveCatchup.minDrift + ' secs';

            var currentPlaybackRate = self.player.getPlaybackRate();
            document.getElementById('playbackrate-tag').innerHTML = Math.round(currentPlaybackRate * 100) / 100;

            var currentBuffer = dashMetrics.getCurrentBufferLevel('video');
            document.getElementById('buffer-tag').innerHTML = currentBuffer + ' secs';

            document.getElementById('catchup-threshold-tag').innerHTML = settings.streaming.liveCatchup.latencyThreshold + ' secs';

            var d = new Date();
            var seconds = d.getSeconds();
            document.querySelector('#sec').innerHTML = (seconds < 10 ? '0' : '') + seconds;
            var minutes = d.getMinutes();
            document.querySelector('#min').innerHTML = (minutes < 10 ? '0' : '') + minutes + ':';
        }

    }, METRIC_INTERVAL);

}

App.prototype._registerEventHandler = function () {
    var self = this;

    document.getElementById('apply-settings-button').addEventListener('click', function (){
        self._applyParameters();
    })
    document.getElementById('load-button').addEventListener('click', function (){
        self._load();
    })
}

App.prototype._registerDashEventHandler = function () {
    this.player.on(dashjs.MediaPlayer.events.REPRESENTATION_SWITCH, this._onRepresentationSwitch, this);
}

App.prototype._unregisterDashEventHandler = function () {
    this.player.on(dashjs.MediaPlayer.events.REPRESENTATION_SWITCH, this._onRepresentationSwitch, this);
}

App.prototype._onRepresentationSwitch = function (e) {
    try {
        if (e.mediaType === 'video') {
            document.getElementById('video-max-index').innerHTML = e.numberOfRepresentations
            document.getElementById('video-index').innerHTML = e.currentRepresentation.index + 1;
            var bitrate = Math.round(e.currentRepresentation.bandwidth / 1000);
            document.getElementById('video-bitrate').innerHTML = bitrate;
        }
    }
    catch(e) {

    }
}



