'use strict';

var app = angular.module('DashPlayer', ['DashSourcesService', 'DashContributorsService', 'DashIFTestVectorsService', 'angular-flot']); /* jshint ignore:line */

$(document).ready(function () {
    $('[data-toggle="tooltip"]').tooltip();
});

angular.module('DashSourcesService', ['ngResource']).factory('sources', function ($resource) { /* jshint ignore:line */
    return $resource('app/sources.json', {}, {
        query: {
            method: 'GET',
            isArray: false
        }
    });
});

angular.module('DashContributorsService', ['ngResource']).factory('contributors', function ($resource) { /* jshint ignore:line */
    return $resource('app/contributors.json', {}, {
        query: {
            method: 'GET',
            isArray: false
        }
    });
});

angular.module('DashIFTestVectorsService', ['ngResource']).factory('dashifTestVectors', function ($resource) { /* jshint ignore:line */
    return $resource('https://testassets.dashif.org/dashjs.json', {}, {
        query: {
            method: 'GET',
            isArray: false
        }
    });
});

app.controller('DashController', function ($scope, sources, contributors, dashifTestVectors) {
    $scope.selectedItem = {
        url: 'https://dash.akamaized.net/akamai/bbb_30fps/bbb_30fps.mpd'
    };

    sources.query(function (data) {
        $scope.availableStreams = data.items;
        // if no mss package, remove mss samples.
        var MssHandler = dashjs.MssHandler; /* jshint ignore:line */
        if (typeof MssHandler !== 'function') {
            for (var i = $scope.availableStreams.length - 1; i >= 0; i--) {
                if ($scope.availableStreams[i].name === 'Smooth Streaming') {
                    $scope.availableStreams.splice(i, 1);
                }
            }
        }

        // DASH Industry Forum Test Vectors
        dashifTestVectors.query(function(data) {
            $scope.availableStreams.splice(7, 0, {
                name: 'DASH Industry Forum Test Vectors',
                submenu: data.items
            });
        });
    });

    contributors.query(function (data) {
        $scope.contributors = data.items;
    });

    $scope.chartOptions = {
        legend: {
            labelBoxBorderColor: '#ffffff',
            placement: 'outsideGrid',
            container: '#legend-wrapper',
            labelFormatter: function (label, series) {
                return '<div  style="cursor: pointer;" id="' + series.type + '.' + series.id + '" onclick="legendLabelClickHandler(this)">' + label + '</div>';
            }
        },
        series: {
            lines: {
                show: true,
                lineWidth: 2,
                shadowSize: 1,
                steps: false,
                fill: false,
            },
            points: {
                radius: 4,
                fill: true,
                show: true
            }
        },
        grid: {
            clickable: false,
            hoverable: false,
            autoHighlight: true,
            color: '#136bfb',
            backgroundColor: '#ffffff'
        },
        axisLabels: {
            position: 'left'
        },
        xaxis: {
            tickFormatter: function tickFormatter(value) {
                return $scope.player.convertToTimeCode(value);
            },
            tickDecimals: 0,
            color: '#136bfb',
            alignTicksWithAxis: 1
        },
        yaxis: {
            min: 0,
            tickLength: 0,
            tickDecimals: 0,
            color: '#136bfb',
            position: 'right',
            axisLabelPadding: 20,
        },
        yaxes: []
    };

    $scope.chartEnabled = true;
    $scope.maxPointsToChart = 30;
    $scope.maxChartableItems = 5;
    $scope.chartCount = 0;
    $scope.chartData = [];

    $scope.chartState = {
        audio:{
            buffer:         {data: [], selected: false, color: '#65080c', label: 'Audio Buffer Level'},
            bitrate:        {data: [], selected: false, color: '#00CCBE', label: 'Audio Bitrate (kbps)'},
            index:          {data: [], selected: false, color: '#ffd446', label: 'Audio Current Index'},
            pendingIndex:   {data: [], selected: false, color: '#FF6700', label: 'AudioPending Index'},
            ratio:          {data: [], selected: false, color: '#329d61', label: 'Audio Ratio'},
            download:       {data: [], selected: false, color: '#44c248', label: 'Audio Download Rate (Mbps)'},
            latency:        {data: [], selected: false, color: '#326e88', label: 'Audio Latency (ms)'},
            droppedFPS:     {data: [], selected: false, color: '#004E64', label: 'Audio Dropped FPS'},
            liveLatency:     {data: [], selected: false, color: '#65080c', label: 'Live Latency'}
        },
        video:{
            buffer:         {data: [], selected: true, color: '#00589d', label: 'Video Buffer Level'},
            bitrate:        {data: [], selected: true, color: '#ff7900', label: 'Video Bitrate (kbps)'},
            index:          {data: [], selected: false, color: '#326e88', label: 'Video Current Quality'},
            pendingIndex:   {data: [], selected: false, color: '#44c248', label: 'Video Pending Index'},
            ratio:          {data: [], selected: false, color: '#00CCBE', label: 'Video Ratio'},
            download:       {data: [], selected: false, color: '#FF6700', label: 'Video Download Rate (Mbps)'},
            latency:        {data: [], selected: false, color: '#329d61', label: 'Video Latency (ms)'},
            droppedFPS:     {data: [], selected: false, color: '#65080c', label: 'Video Dropped FPS'},
            liveLatency:     {data: [], selected: false, color: '#65080c', label: 'Live Latency'}
        }
    };

    $scope.abrEnabled = true;
    $scope.toggleCCBubble = false;
    $scope.debugEnabled = false;
    $scope.htmlLogging = false;
    $scope.videotoggle = false;
    $scope.audiotoggle = false;
    $scope.optionsGutter = false;
    $scope.drmData = [];
    $scope.initialSettings = {
        audio: null,
        video: null,
        text: null,
        textEnabled: true
    };
    $scope.mediaSettingsCacheEnabled = true;
    $scope.metricsTimer = null;
    $scope.updateMetricsInterval = 1000;
    $scope.drmKeySystems = ['com.widevine.alpha', 'com.microsoft.playready'];
    $scope.drmKeySystem = '';
    $scope.drmLicenseURL = '';

    $scope.isDynamic = false;

    // metrics
    $scope.videoBitrate = 0;
    $scope.videoIndex = 0;
    $scope.videoPendingIndex = 0;
    $scope.videoMaxIndex = 0;
    $scope.videoBufferLength = 0;
    $scope.videoDroppedFrames = 0;
    $scope.videoLatencyCount = 0;
    $scope.videoLatency = '';
    $scope.videoDownloadCount = 0;
    $scope.videoDownload = '';
    $scope.videoRatioCount = 0;
    $scope.videoRatio = '';
    $scope.videoLiveLatency = 0;

    $scope.audioBitrate = 0;
    $scope.audioIndex = 0;
    $scope.audioPendingIndex = '';
    $scope.audioMaxIndex = 0;
    $scope.audioBufferLength = 0;
    $scope.audioDroppedFrames = 0;
    $scope.audioLatencyCount = 0;
    $scope.audioLatency = '';
    $scope.audioDownloadCount = 0;
    $scope.audioDownload = '';
    $scope.audioRatioCount = 0;
    $scope.audioRatio = '';
    $scope.audioLiveLatency = 0;

    // Starting Options
    $scope.autoPlaySelected = true;
    $scope.loopSelected = true;
    $scope.scheduleWhilePausedSelected = true;
    $scope.localStorageSelected = true;
    $scope.jumpGapsSelected = true;
    $scope.fastSwitchSelected = true;
    $scope.ABRStrategy = 'abrDynamic';

    // Persistent license
    $scope.persistentSessionId = {};
    $scope.selectedKeySystem = null;

    // Error management
    $scope.error = '';
    $scope.errorType = '';

    ////////////////////////////////////////
    //
    // Player Setup
    //
    ////////////////////////////////////////

    $scope.video = document.querySelector('.dash-video-player video');
    $scope.player = dashjs.MediaPlayer().create(); /* jshint ignore:line */

    $scope.player.on(dashjs.MediaPlayer.events.ERROR, function (e) { /* jshint ignore:line */
        var message = e.event.message ? e.event.message : typeof e.event === 'string' ? e.event: e.event.url ? e.event.url : '';
        $scope.$apply(function () {
            $scope.error = message;
            $scope.errorType = e.error;
        });
        $("#errorModal").modal('show');
    }, $scope);

    $scope.player.getDebug().setLogLevel(dashjs.Debug.LOG_LEVEL_INFO);
    $scope.player.initialize($scope.video, null, $scope.autoPlaySelected);
    $scope.player.setFastSwitchEnabled($scope.fastSwitchSelected);
    $scope.player.setJumpGaps($scope.jumpGapsSelected);
    $scope.player.attachVideoContainer(document.getElementById('videoContainer'));
    // Add HTML-rendered TTML subtitles except for Firefox < v49 (issue #1164)
    if (doesTimeMarchesOn()) {
        $scope.player.attachTTMLRenderingDiv($('#video-caption')[0]);
    }

    // get buffer default value
    $scope.defaultLiveDelay = $scope.player.getLiveDelay();
    $scope.defaultStableBufferDelay = $scope.player.getStableBufferTime();
    $scope.defaultBufferTimeAtTopQuality = $scope.player.getBufferTimeAtTopQuality();
    $scope.defaultBufferTimeAtTopQualityLongForm = $scope.player.getBufferTimeAtTopQualityLongForm();
    $scope.lowLatencyModeSelected = $scope.player.getLowLatencyEnabled();

    const initVideoTrackSwitchMode = $scope.player.getTrackSwitchModeFor('video');
    const initAudioTrackSwitchMode = $scope.player.getTrackSwitchModeFor('audio');

    //get default track switch mode
    if(initVideoTrackSwitchMode === 'alwaysReplace') {
        document.getElementById('always-replace-video').checked = true;
    } else {
        document.getElementById('never-replace-video').checked = true;
    }

    if(initAudioTrackSwitchMode === 'alwaysReplace') {
        document.getElementById('always-replace-audio').checked = true;
    } else {
        document.getElementById('never-replace-audio').checked = true;
    }

    $scope.controlbar = new ControlBar($scope.player); /* jshint ignore:line */
    $scope.controlbar.initialize();
    $scope.controlbar.disable();
    $scope.version = $scope.player.getVersion();

    $scope.player.on(dashjs.MediaPlayer.events.MANIFEST_LOADED, function (e) { /* jshint ignore:line */
        $scope.isDynamic = e.data.type === 'dynamic';
    }, $scope);

    $scope.player.on(dashjs.MediaPlayer.events.QUALITY_CHANGE_REQUESTED, function (e) { /* jshint ignore:line */
        $scope[e.mediaType + 'Index'] = e.oldQuality + 1;
        $scope[e.mediaType + 'PendingIndex'] = e.newQuality + 1;
        $scope.plotPoint('pendingIndex', e.mediaType, e.newQuality + 1);
        $scope.safeApply();
    }, $scope);

    $scope.player.on(dashjs.MediaPlayer.events.QUALITY_CHANGE_RENDERED, function (e) { /* jshint ignore:line */
        $scope[e.mediaType + 'Index'] = e.newQuality + 1;
        $scope[e.mediaType + 'PendingIndex'] = e.newQuality + 1;
        $scope.plotPoint('index', e.mediaType, e.newQuality + 1);
        $scope.safeApply();
    }, $scope);

    $scope.player.on(dashjs.MediaPlayer.events.PERIOD_SWITCH_COMPLETED, function (e) { /* jshint ignore:line */
        $scope.streamInfo = e.toStreamInfo;
    }, $scope);

    $scope.player.on(dashjs.MediaPlayer.events.STREAM_INITIALIZED, function (e) { /* jshint ignore:line */
        stopMetricsInterval();

        $scope.chartCount = 0;
        $scope.metricsTimer = setInterval(function () {
            updateMetrics('video');
            updateMetrics('audio');
            $scope.chartCount++;
        }, $scope.updateMetricsInterval);
    }, $scope);

    $scope.player.on(dashjs.MediaPlayer.events.PLAYBACK_ENDED, function (e) { /* jshint ignore:line */
        if ($('#loop-cb').is(':checked') &&
            $scope.player.getActiveStream().getStreamInfo().isLast) {
            $scope.doLoad();
        }
    }, $scope);

    $scope.player.on(dashjs.MediaPlayer.events.KEY_SYSTEM_SELECTED, function (e) { /* jshint ignore:line */
        if (e.data) {
            $scope.selectedKeySystem = e.data.keySystem.systemString;
        }
    }, $scope);

    $scope.player.on(dashjs.MediaPlayer.events.KEY_SESSION_CREATED, function (e) { /* jshint ignore:line */
        if (e.data) {
            var session = e.data;
            if (session.getSessionType() === 'persistent-license') {
                $scope.persistentSessionId[$scope.selectedItem.url] = session.getSessionID();
            }
        }
    }, $scope);

    ////////////////////////////////////////
    //
    // General Player Methods
    //
    ////////////////////////////////////////

    $scope.onChartEnableButtonClick = function () {
        $scope.chartEnabled = !$scope.chartEnabled;
        $('#chart-wrapper').fadeTo(500, $scope.chartEnabled ? 1 : 0.3);
    };

    $scope.toggleAutoPlay = function () {
        $scope.player.setAutoPlay($scope.autoPlaySelected);
    };

    $scope.changeABRStrategy = function (strategy) {
        $scope.player.setABRStrategy(strategy);
    };

    $scope.toggleUseCustomABRRules = function () {
        $scope.player.getThumbnail($scope.player.time());
        if ($scope.customABRRulesSelected) {
            $scope.player.useDefaultABRRules(false);
            $scope.player.addABRCustomRule('qualitySwitchRules', 'DownloadRatioRule', DownloadRatioRule); /* jshint ignore:line */
            $scope.player.addABRCustomRule('qualitySwitchRules', 'ThroughputRule', CustomThroughputRule); /* jshint ignore:line */
        } else {
            $scope.player.useDefaultABRRules(true);
            $scope.player.removeABRCustomRule('DownloadRatioRule');
            $scope.player.removeABRCustomRule('ThroughputRule');
        }
    };

    $scope.toggleFastSwitch = function () {
        $scope.player.setFastSwitchEnabled($scope.fastSwitchSelected);
    };

    $scope.toggleScheduleWhilePaused = function () {
        $scope.player.setScheduleWhilePaused($scope.scheduleWhilePausedSelected);
    };

    $scope.toggleLocalStorage = function () {
        $scope.player.enableLastBitrateCaching($scope.localStorageSelected);
        $scope.player.enableLastMediaSettingsCaching($scope.localStorageSelected);
    };

    $scope.toggleJumpGaps = function () {
        $scope.player.setJumpGaps($scope.jumpGapsSelected);
    };

    $scope.togglelowLatencyMode = function () {
        $scope.player.setLowLatencyEnabled($scope.lowLatencyModeSelected);
    };

    $scope.setStream = function (item) {
        $scope.selectedItem = JSON.parse(JSON.stringify(item));
    };

    $scope.toggleOptionsGutter = function (bool) {
        $scope.optionsGutter = bool;
    };

    $scope.doLoad = function () {
        $scope.initSession();

        var protData = {};
        if ($scope.selectedItem.hasOwnProperty('protData')) {
            protData = $scope.selectedItem.protData;
        } else if ($scope.drmLicenseURL !== '' && $scope.drmKeySystem !== '') {
            protData[$scope.drmKeySystem] = {
                serverURL: $scope.drmLicenseURL
            };
        } else {
            protData = null;
        }

        // Check if persistent license session ID is stored for current stream
        var sessionId = $scope.persistentSessionId[$scope.selectedItem.url];
        if (sessionId) {
            protData[$scope.selectedKeySystem].sessionId = sessionId;
        }

        var bufferConfig = {
            liveDelay: $scope.defaultLiveDelay,
            stableBufferTime: $scope.defaultStableBufferDelay,
            bufferTimeAtTopQuality: $scope.defaultBufferTimeAtTopQuality,
            bufferTimeAtTopQualityLongForm: $scope.defaultBufferTimeAtTopQualityLongForm,
            lowLatencyMode: $scope.lowLatencyMode
        };
        if ($scope.selectedItem.hasOwnProperty('bufferConfig')) {
            var selectedConfig = $scope.selectedItem.bufferConfig;

            if (selectedConfig.liveDelay) {
                bufferConfig.liveDelay = selectedConfig.liveDelay;
            }

            if (selectedConfig.stableBufferTime) {
                bufferConfig.stableBufferTime = selectedConfig.stableBufferTime;
            }

            if (selectedConfig.bufferTimeAtTopQuality) {
                bufferConfig.bufferTimeAtTopQuality = selectedConfig.bufferTimeAtTopQuality;
            }

            if (selectedConfig.bufferTimeAtTopQualityLongForm) {
                bufferConfig.bufferTimeAtTopQualityLongForm = selectedConfig.bufferTimeAtTopQualityLongForm;
            }

            if (selectedConfig.lowLatencyMode) {
                bufferConfig.lowLatencyMode = selectedConfig.lowLatencyMode;
            }
        }

        $scope.player.setLiveDelay(bufferConfig.liveDelay);
        $scope.player.setStableBufferTime(bufferConfig.stableBufferTime);
        $scope.player.setBufferTimeAtTopQuality(bufferConfig.bufferTimeAtTopQuality);
        $scope.player.setBufferTimeAtTopQualityLongForm(bufferConfig.bufferTimeAtTopQualityLongForm);
        $scope.player.setLowLatencyEnabled($scope.lowLatencyModeSelected || bufferConfig.lowLatencyMode);

        $scope.controlbar.reset();
        $scope.player.setProtectionData(protData);
        $scope.player.attachSource($scope.selectedItem.url);
        if ($scope.initialSettings.audio) {
            $scope.player.setInitialMediaSettingsFor('audio', {
                lang: $scope.initialSettings.audio
            });
        }
        if ($scope.initialSettings.video) {
            $scope.player.setInitialMediaSettingsFor('video', {
                role: $scope.initialSettings.video
            });
        }
        if ($scope.initialSettings.text) {
            $scope.player.setTextDefaultLanguage($scope.initialSettings.text);
        }
        $scope.player.setTextDefaultEnabled($scope.initialSettings.textEnabled);
        $scope.controlbar.enable();
    };

    $scope.doStop = function () {
        $scope.player.attachSource(null);
        $scope.controlbar.reset();
        stopMetricsInterval();
    }

    $scope.changeTrackSwitchMode = function (mode, type) {
        $scope.player.setTrackSwitchModeFor(type, mode);
    };

    $scope.setLogLevel = function (mode) {
        var level = $("input[name='log-level']:checked").val();
        switch(level) {
            case 'none':
            $scope.player.getDebug().setLogLevel(dashjs.Debug.LOG_LEVEL_NONE);
            break;

            case 'fatal':
            $scope.player.getDebug().setLogLevel(dashjs.Debug.LOG_LEVEL_FATAL);
            break;

            case 'error':
            $scope.player.getDebug().setLogLevel(dashjs.Debug.LOG_LEVEL_ERROR);
            break;

            case 'warning':
            $scope.player.getDebug().setLogLevel(dashjs.Debug.LOG_LEVEL_WARNING);
            break;

            case 'info':
            $scope.player.getDebug().setLogLevel(dashjs.Debug.LOG_LEVEL_INFO);
            break;

            default:
            $scope.player.getDebug().setLogLevel(dashjs.Debug.LOG_LEVEL_DEBUG);
        }

    }

    $scope.hasLogo = function (item) {
        return (item.hasOwnProperty('logo') && item.logo);
    };

    $scope.getChartButtonLabel = function () {
        return $scope.chartEnabled ? 'Disable' : 'Enable';
    };

    $scope.getOptionsButtonLabel = function () {
        return $scope.optionsGutter ? 'Hide Options' : 'Show Options';
    };

    $scope.setDrmKeySystem = function (item) {
        $scope.drmKeySystem = item;
    };

    // from: https://gist.github.com/siongui/4969449
    $scope.safeApply = function (fn) {
        var phase = this.$root.$$phase;
        if (phase == '$apply' || phase == '$digest')
            this.$eval(fn);
        else
            this.$apply(fn);
    };

    ////////////////////////////////////////
    //
    // Metrics
    //
    ////////////////////////////////////////
    $scope.initSession = function () {
        $scope.clearChartData();
        $scope.sessionStartTime = new Date().getTime() / 1000;
    };

    function calculateHTTPMetrics(type, requests) {
        var latency = {},
            download = {},
            ratio = {};

        var requestWindow = requests.slice(-20).filter(function (req) {
            return req.responsecode >= 200 && req.responsecode < 300 && req.type === 'MediaSegment' && req._stream === type && !!req._mediaduration;
        }).slice(-4);

        if (requestWindow.length > 0) {
            var latencyTimes = requestWindow.map(function (req) {
                return Math.abs(req.tresponse.getTime() - req.trequest.getTime()) / 1000;
            });

            latency[type] = {
                average: latencyTimes.reduce(function (l, r) {
                    return l + r;
                }) / latencyTimes.length,
                high: latencyTimes.reduce(function (l, r) {
                    return l < r ? r : l;
                }),
                low: latencyTimes.reduce(function (l, r) {
                    return l < r ? l : r;
                }),
                count: latencyTimes.length
            };

            var downloadTimes = requestWindow.map(function (req) {
                return Math.abs(req._tfinish.getTime() - req.tresponse.getTime()) / 1000;
            });

            download[type] = {
                average: downloadTimes.reduce(function (l, r) {
                    return l + r;
                }) / downloadTimes.length,
                high: downloadTimes.reduce(function (l, r) {
                    return l < r ? r : l;
                }),
                low: downloadTimes.reduce(function (l, r) {
                    return l < r ? l : r;
                }),
                count: downloadTimes.length
            };

            var durationTimes = requestWindow.map(function (req) {
                return req._mediaduration;
            });

            ratio[type] = {
                average: (durationTimes.reduce(function (l, r) {
                    return l + r;
                }) / downloadTimes.length) / download[type].average,
                high: durationTimes.reduce(function (l, r) {
                    return l < r ? r : l;
                }) / download[type].low,
                low: durationTimes.reduce(function (l, r) {
                    return l < r ? l : r;
                }) / download[type].high,
                count: durationTimes.length
            };

            return {
                latency: latency,
                download: download,
                ratio: ratio
            };

        }
        return null;
    }

    $scope.clearChartData = function () {
        for (var key in $scope.chartState) {
            for (var i in $scope.chartState[key]) {
                $scope.chartState[key][i].data.length = 0;
            }
        }
    };

    $scope.plotPoint = function (name, type, value) {
        if ($scope.chartEnabled) {
            var specificChart = $scope.chartState[type];
            if (specificChart) {
                var data = specificChart[name].data;
                data.push([$scope.video.currentTime, value]);
                if (data.length > $scope.maxPointsToChart) {
                    data.splice(0, 1);
                }
            }
        }
    };

    $scope.enableChartByName = function (id, type) {
        // enable stat item
        if ($scope.chartState[type][id].selected) {
            // block stat item if too many already.
            if ($scope.chartData.length === $scope.maxChartableItems) {
                alert('You have selected too many items to chart simultaneously. Max allowd is ' + $scope.maxChartableItems + '. Please unselect another item first, then reselected ' + $scope.chartState[type][id].label);
                $scope.chartState[type][id].selected = false;
                return;
            }

            var data = {
                id: id,
                data: $scope.chartState[type][id].data,
                label: $scope.chartState[type][id].label,
                color: $scope.chartState[type][id].color,
                yaxis: $scope.chartData.length + 1,
                type: type
            };
            $scope.chartData.push(data);
            $scope.chartOptions.yaxes.push({
                axisLabel: data.label
            });
        } else { //remove stat item from charts
            for (var i = 0; i < $scope.chartData.length; i++) {
                if ($scope.chartData[i].id === id && $scope.chartData[i].type === type) {
                    $scope.chartData.splice(i, 1);
                    $scope.chartOptions.yaxes.splice(i, 1);
                }
                if ($scope.chartData.length > i) {
                    $scope.chartData[i].yaxis = i + 1;
                }
            }
        }

        $scope.chartOptions.legend.noColumns = Math.min($scope.chartData.length, 5);
    };

    function updateMetrics(type) {
        var metrics = $scope.player.getMetricsFor(type);
        var dashMetrics = $scope.player.getDashMetrics();

        if (metrics && dashMetrics && $scope.streamInfo) {
            var periodIdx = $scope.streamInfo.index;
            var repSwitch = dashMetrics.getCurrentRepresentationSwitch(metrics);
            var bufferLevel = dashMetrics.getCurrentBufferLevel(metrics);
            var maxIndex = dashMetrics.getMaxIndexForBufferType(type, periodIdx);
            var index = $scope.player.getQualityFor(type);
            var bitrate = repSwitch ? Math.round(dashMetrics.getBandwidthForRepresentation(repSwitch.to, periodIdx) / 1000) : NaN;
            var droppedFPS = dashMetrics.getCurrentDroppedFrames(metrics) ? dashMetrics.getCurrentDroppedFrames(metrics).droppedFrames : 0;
            var liveLatency = 0;
            if ($scope.isDynamic) {
                liveLatency = $scope.player.getCurrentLiveLatency();
            }

            $scope[type + 'BufferLength'] = bufferLevel;
            $scope[type + 'MaxIndex'] = maxIndex;
            $scope[type + 'Bitrate'] = bitrate;
            $scope[type + 'DroppedFrames'] = droppedFPS;
            $scope[type + 'LiveLatency'] = liveLatency;

            var httpMetrics = calculateHTTPMetrics(type, dashMetrics.getHttpRequests(metrics));
            if (httpMetrics) {
                $scope[type + 'Download'] = httpMetrics.download[type].low.toFixed(2) + ' | ' + httpMetrics.download[type].average.toFixed(2) + ' | ' + httpMetrics.download[type].high.toFixed(2);
                $scope[type + 'Latency'] = httpMetrics.latency[type].low.toFixed(2) + ' | ' + httpMetrics.latency[type].average.toFixed(2) + ' | ' + httpMetrics.latency[type].high.toFixed(2);
                $scope[type + 'Ratio'] = httpMetrics.ratio[type].low.toFixed(2) + ' | ' + httpMetrics.ratio[type].average.toFixed(2) + ' | ' + httpMetrics.ratio[type].high.toFixed(2);
            }

            if ($scope.chartCount % 2 === 0) {
                $scope.plotPoint('buffer', type, bufferLevel);
                $scope.plotPoint('index', type, index);
                $scope.plotPoint('bitrate', type, bitrate);
                $scope.plotPoint('droppedFPS', type, droppedFPS);
                $scope.plotPoint('liveLatency', type, liveLatency);

                if (httpMetrics) {
                    $scope.plotPoint('download', type, httpMetrics.download[type].average.toFixed(2));
                    $scope.plotPoint('latency', type, httpMetrics.latency[type].average.toFixed(2));
                    $scope.plotPoint('ratio', type, httpMetrics.ratio[type].average.toFixed(2));
                }
                $scope.safeApply();
            }
        }
    }

    function stopMetricsInterval() {
        if ($scope.metricsTimer) {
            clearInterval($scope.metricsTimer);
            $scope.metricsTimer = null;
        }
    }

    $scope.initChartingByMediaType = function (type) {
        var arr = $scope.chartState[type];
        for (var key in arr) {
            var obj = arr[key];
            if (obj.selected) {
                $scope.enableChartByName(key, type);
            }
        }
    };


    ////////////////////////////////////////
    //
    // Init
    //
    ////////////////////////////////////////

    function doesTimeMarchesOn() {
        var version;
        var REQUIRED_VERSION = 49.0;

        if (typeof navigator !== 'undefined') {
            if (!navigator.userAgent.match(/Firefox/)) {
                return true;
            }

            version = parseFloat(navigator.userAgent.match(/rv:([0-9.]+)/)[1]);

            if (!isNaN(version) && version >= REQUIRED_VERSION) {
                return true;
            }
        }
    }


    (function init() {
        $scope.initChartingByMediaType('video');
        $scope.initChartingByMediaType('audio');

        function getUrlVars() {
            var vars = {};
            window.location.href.replace(/[?&]+([^=&]+)=([^&]*)/gi, function (m, key, value) {
                vars[key] = value;
            });
            return vars;
        }

        var vars = getUrlVars();
        var item = {};

        if (vars && vars.hasOwnProperty('url')) {
            item.url = vars.url;
        }

        if (vars && vars.hasOwnProperty('mpd')) {
            item.url = vars.mpd;
        }

        if (vars && vars.hasOwnProperty('source')) {
            item.url = vars.source;
        }

        if (vars && vars.hasOwnProperty('stream')) {
            try {
                item = JSON.parse(atob(vars.stream));
            } catch (e) {}
        }

        if (item.url) {
            var startPlayback = false;

            $scope.selectedItem = item;

            if (vars.hasOwnProperty('autoplay')) {
                startPlayback = (vars.autoplay === 'true');
            }

            if (startPlayback) {
                $scope.doLoad();
            }
        }
    })();
});

function legendLabelClickHandler(obj) { /* jshint ignore:line */
    var scope = angular.element($('body')).scope(); /* jshint ignore:line */
    var id = obj.id.split('.');
    var target = scope.chartState[id[0]][id[1]];
    target.selected = !target.selected;
    scope.enableChartByName(id[1], id[0]);
    scope.safeApply();
}
