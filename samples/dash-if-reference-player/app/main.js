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
        textEnabled: true,
        forceTextStreaming: false
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
    $scope.videoAutoSwitchSelected = true;
    $scope.videoQualities = [];
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
    // store a ref in window.player to provide an easy way to play with dash.js API
    window.player = $scope.player = dashjs.MediaPlayer().create(); /* jshint ignore:line */

    ////////////////////////////////////////
    //
    // Configuration file
    //
    ////////////////////////////////////////
    let reqConfig = new XMLHttpRequest();
    reqConfig.onload = function() {
        if (reqConfig.status === 200) {
            let config = JSON.parse(reqConfig.responseText);
            if ($scope.player) {
                $scope.player.updateSettings(config);
            }
        } else {
            // Set default initial configuration
            var initialConfig = {
                'debug': {
                    'logLevel': dashjs.Debug.LOG_LEVEL_INFO
                },
                'streaming': {
                    'fastSwitchEnabled': $scope.fastSwitchSelected,
                    'jumpGaps': true,
                    'abr': {
                        'autoSwitchBitrate': {
                            'video': $scope.videoAutoSwitchSelected
                        }
                    }
                }
            }
            $scope.player.updateSettings(initialConfig);
        }
    };

    reqConfig.open("GET", "dashjs_config.json", true);
    reqConfig.setRequestHeader("Content-type", "application/json");
    reqConfig.send();

    $scope.player.on(dashjs.MediaPlayer.events.ERROR, function (e) { /* jshint ignore:line */
        if (!e.event) {
            $scope.$apply(function () {
                $scope.error = e.error.message;
                $scope.errorType = 'Dash.js :' + e.error.code;
                switch (e.error.code) {
                    case dashjs.MediaPlayer.errors.MANIFEST_LOADER_PARSING_FAILURE_ERROR_CODE:
                    case dashjs.MediaPlayer.errors.MANIFEST_LOADER_LOADING_FAILURE_ERROR_CODE:
                    case dashjs.MediaPlayer.errors.XLINK_LOADER_LOADING_FAILURE_ERROR_CODE:
                    case dashjs.MediaPlayer.errors.SEGMENTS_UPDATE_FAILED_ERROR_CODE:
                    case dashjs.MediaPlayer.errors.SEGMENTS_UNAVAILABLE_ERROR_CODE:
                    case dashjs.MediaPlayer.errors.SEGMENT_BASE_LOADER_ERROR_CODE:
                    case dashjs.MediaPlayer.errors.TIME_SYNC_FAILED_ERROR_CODE:
                    case dashjs.MediaPlayer.errors.FRAGMENT_LOADER_LOADING_FAILURE_ERROR_CODE:
                    case dashjs.MediaPlayer.errors.FRAGMENT_LOADER_NULL_REQUEST_ERROR_CODE:
                    case dashjs.MediaPlayer.errors.URL_RESOLUTION_FAILED_GENERIC_ERROR_CODE:
                    case dashjs.MediaPlayer.errors.APPEND_ERROR_CODE:
                    case dashjs.MediaPlayer.errors.REMOVE_ERROR_CODE:
                    case dashjs.MediaPlayer.errors.DATA_UPDATE_FAILED_ERROR_CODE:
                    case dashjs.MediaPlayer.errors.CAPABILITY_MEDIASOURCE_ERROR_CODE:
                    case dashjs.MediaPlayer.errors.CAPABILITY_MEDIAKEYS_ERROR_CODE:
                    case dashjs.MediaPlayer.errors.DOWNLOAD_ERROR_ID_SIDX:
                    case dashjs.MediaPlayer.errors.MANIFEST_ERROR_ID_CODEC:
                    case dashjs.MediaPlayer.errors.MANIFEST_ERROR_ID_PARSE:
                    case dashjs.MediaPlayer.errors.MANIFEST_ERROR_ID_NOSTREAMS:
                    case dashjs.MediaPlayer.errors.TIMED_TEXT_ERROR_ID_PARSE:
                    // mss errors
                    case dashjs.MediaPlayer.errors.MSS_NO_TFRF_CODE:
                    // protection errors
                    case dashjs.MediaPlayer.errors.MEDIA_KEYERR_CODE:
                    case dashjs.MediaPlayer.errors.MEDIA_KEYERR_UNKNOWN_CODE:
                    case dashjs.MediaPlayer.errors.MEDIA_KEYERR_CLIENT_CODE:
                    case dashjs.MediaPlayer.errors.MEDIA_KEYERR_SERVICE_CODE:
                    case dashjs.MediaPlayer.errors.MEDIA_KEYERR_OUTPUT_CODE:
                    case dashjs.MediaPlayer.errors.MEDIA_KEYERR_HARDWARECHANGE_CODE:
                    case dashjs.MediaPlayer.errors.MEDIA_KEYERR_DOMAIN_CODE:
                        break;
                }
            });
            $("#errorModal").modal('show');
        }
    }, $scope);


    $scope.player.initialize($scope.video, null, $scope.autoPlaySelected);

    // Add HTML-rendered TTML subtitles except for Firefox < v49 (issue #1164)
    if (doesTimeMarchesOn()) {
        $scope.player.attachTTMLRenderingDiv($('#video-caption')[0]);
    }

    // get buffer default value
    var currentConfig = $scope.player.getSettings();
    $scope.defaultLiveDelay = currentConfig.streaming.liveDelay;
    $scope.defaultStableBufferDelay = currentConfig.streaming.stableBufferTime;
    $scope.defaultBufferTimeAtTopQuality = currentConfig.streaming.bufferTimeAtTopQuality;
    $scope.defaultBufferTimeAtTopQualityLongForm = currentConfig.streaming.bufferTimeAtTopQualityLongForm;
    $scope.lowLatencyModeSelected = currentConfig.streaming.lowLatencyEnabled;

    var initVideoTrackSwitchMode = $scope.player.getTrackSwitchModeFor('video');
    var initAudioTrackSwitchMode = $scope.player.getTrackSwitchModeFor('audio');

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
        $scope.plotPoint('pendingIndex', e.mediaType, e.newQuality + 1, getTimeForPlot());
        $scope.safeApply();
    }, $scope);

    $scope.player.on(dashjs.MediaPlayer.events.QUALITY_CHANGE_RENDERED, function (e) { /* jshint ignore:line */
        $scope[e.mediaType + 'Index'] = e.newQuality + 1;
        $scope.plotPoint('index', e.mediaType, e.newQuality + 1, getTimeForPlot());
        $scope.safeApply();
    }, $scope);

    $scope.player.on(dashjs.MediaPlayer.events.PERIOD_SWITCH_COMPLETED, function (e) { /* jshint ignore:line */
        $scope.streamInfo = e.toStreamInfo;
    }, $scope);

    $scope.player.on(dashjs.MediaPlayer.events.STREAM_INITIALIZED, function (e) { /* jshint ignore:line */
        stopMetricsInterval();

        $scope.videoQualities = $scope.player.getBitrateInfoListFor('video');
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
        $scope.player.updateSettings({
            'streaming': {
                'abr': {
                    'ABRStrategy': strategy
                }
            }
        });
    };

    $scope.toggleUseCustomABRRules = function () {
        $scope.player.updateSettings({
            'streaming': {
                'abr': {
                    'useDefaultABRRules': !$scope.customABRRulesSelected
                }
            }
        });

        if ($scope.customABRRulesSelected) {
            $scope.player.addABRCustomRule('qualitySwitchRules', 'DownloadRatioRule', DownloadRatioRule); /* jshint ignore:line */
            $scope.player.addABRCustomRule('qualitySwitchRules', 'ThroughputRule', CustomThroughputRule); /* jshint ignore:line */
        } else {
            $scope.player.removeABRCustomRule('DownloadRatioRule');
            $scope.player.removeABRCustomRule('ThroughputRule');
        }
    };

    $scope.toggleFastSwitch = function () {
        $scope.player.updateSettings({
            'streaming': {
                'fastSwitchEnabled': $scope.fastSwitchSelected
            }
        });
    };

    $scope.toggleVideoAutoSwitch = function () {
        $scope.player.updateSettings({
            'streaming': {
                'abr': {
                    'autoSwitchBitrate': {
                        'video': $scope.videoAutoSwitchSelected
                    }
                }
            }
        });
    };

    $scope.toggleScheduleWhilePaused = function () {
        $scope.player.updateSettings({
            'streaming': {
                'scheduleWhilePaused': $scope.scheduleWhilePausedSelected
            }
        });
    };

    $scope.toggleLocalStorage = function () {
        $scope.player.updateSettings({
            'streaming': {
                'lastBitrateCachingInfo': {
                    'enabled': $scope.localStorageSelected
                },
                'lastMediaSettingsCachingInfo': {
                    'enabled': $scope.localStorageSelected
                }
            }
        });
    };

    $scope.toggleJumpGaps = function () {
        $scope.player.updateSettings({
            'streaming': {
                'jumpGaps': $scope.jumpGapsSelected
            }
        });
    };

    $scope.togglelowLatencyMode = function () {
        $scope.player.updateSettings({
            'streaming': {
                'lowLatencyEnabled': $scope.lowLatencyModeSelected
            }
        });
    };

    $scope.setStream = function (item) {
        $scope.selectedItem = JSON.parse(JSON.stringify(item));
    };

    $scope.toggleOptionsGutter = function (bool) {
        $scope.optionsGutter = bool;
    };

    $scope.selectVideoQuality = function (quality) {
        $scope.player.setQualityFor('video', quality);
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
            if (!protData) {
                protData = {};
            }
            if (!protData[$scope.selectedKeySystem]) {
                protData[$scope.selectedKeySystem] = {};
            }
            protData[$scope.selectedKeySystem].sessionId = sessionId;
        }

        var config = {
            'streaming': {
                'liveDelay': $scope.defaultLiveDelay,
                'stableBufferTime': $scope.defaultStableBufferDelay,
                'bufferTimeAtTopQuality': $scope.defaultBufferTimeAtTopQuality,
                'bufferTimeAtTopQualityLongForm': $scope.defaultBufferTimeAtTopQualityLongForm,
                'lowLatencyEnabled': $scope.lowLatencyModeSelected
            }
        };

        if ($scope.selectedItem.hasOwnProperty('bufferConfig')) {
            var selectedConfig = $scope.selectedItem.bufferConfig;

            if (selectedConfig.liveDelay) {
                config.streaming.liveDelay = selectedConfig.liveDelay;
            }

            if (selectedConfig.stableBufferTime) {
                config.streaming.stableBufferTime = selectedConfig.stableBufferTime;
            }

            if (selectedConfig.bufferTimeAtTopQuality) {
                config.streaming.bufferTimeAtTopQuality = selectedConfig.bufferTimeAtTopQuality;
            }

            if (selectedConfig.bufferTimeAtTopQualityLongForm) {
                config.streaming.bufferTimeAtTopQualityLongForm = selectedConfig.bufferTimeAtTopQualityLongForm;
            }

            if (selectedConfig.lowLatencyMode !== undefined) {
                config.streaming.lowLatencyEnabled = selectedConfig.lowLatencyMode;
            }
        }

        const initBitrate = parseInt($scope.initialVideoBitrate);
        if (!isNaN(initBitrate)) {
            config.streaming.abr = {
                'initialBitrate': {
                    'video': initBitrate
                }
            }
        }

        const minBitrate = parseInt($scope.minVideoBitrate);
        if (!isNaN(minBitrate)) {
            config.streaming.abr = {
                'minBitrate': {
                    'video': minBitrate
                }
            }
        }

        const maxBitrate = parseInt($scope.maxVideoBitrate);
        if (!isNaN(maxBitrate)) {
            config.streaming.abr = {
                'maxBitrate': {
                    'video': maxBitrate
                }
            }
        }        
        $scope.player.updateSettings(config);

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
        $scope.player.enableForcedTextStreaming($scope.initialSettings.forceTextStreaming);
        $scope.controlbar.enable();
    };

    $scope.doStop = function () {
        $scope.player.attachSource(null);
        $scope.controlbar.reset();
        stopMetricsInterval();
    };

    $scope.changeTrackSwitchMode = function (mode, type) {
        $scope.player.setTrackSwitchModeFor(type, mode);
    };

    $scope.setLogLevel = function () {
        var level = $("input[name='log-level']:checked").val();
        switch(level) {
            case 'none':
            $scope.player.updateSettings({ 'debug': { 'logLevel': dashjs.Debug.LOG_LEVEL_NONE }});
            break;

            case 'fatal':
            $scope.player.updateSettings({ 'debug': { 'logLevel': dashjs.Debug.LOG_LEVEL_FATAL }});
            break;

            case 'error':
            $scope.player.updateSettings({ 'debug': { 'logLevel': dashjs.Debug.LOG_LEVEL_ERROR }});
            break;

            case 'warning':
            $scope.player.updateSettings({ 'debug': { 'logLevel': dashjs.Debug.LOG_LEVEL_WARNING }});
            break;

            case 'info':
            $scope.player.updateSettings({ 'debug': { 'logLevel': dashjs.Debug.LOG_LEVEL_INFO }});
            break;

            default:
            $scope.player.updateSettings({ 'debug': { 'logLevel': dashjs.Debug.LOG_LEVEL_DEBUG }});
        }
    };

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

    $scope.plotPoint = function (name, type, value, time) {
        if ($scope.chartEnabled) {
            var specificChart = $scope.chartState[type];
            if (specificChart) {
                var data = specificChart[name].data;
                data.push([time, value]);
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

    function getTimeForPlot() {
        var now = new Date().getTime() / 1000;
        return Math.max(now - $scope.sessionStartTime, 0);
    }

    function updateMetrics(type) {
        var dashMetrics = $scope.player.getDashMetrics();
        var dashAdapter = $scope.player.getDashAdapter();

        if (dashMetrics && $scope.streamInfo) {
            var periodIdx = $scope.streamInfo.index;

            var maxIndex = dashAdapter.getMaxIndexForBufferType(type, periodIdx);
            var repSwitch = dashMetrics.getCurrentRepresentationSwitch(type, true);
            var bufferLevel = dashMetrics.getCurrentBufferLevel(type, true);
            var index = $scope.player.getQualityFor(type);

            var bitrate = repSwitch ? Math.round(dashAdapter.getBandwidthForRepresentation(repSwitch.to, periodIdx) / 1000) : NaN;
            var droppedFramesMetrics = dashMetrics.getCurrentDroppedFrames();
            var droppedFPS = droppedFramesMetrics ? droppedFramesMetrics.droppedFrames : 0;
            var liveLatency = 0;
            if ($scope.isDynamic) {
                liveLatency = $scope.player.getCurrentLiveLatency();
            }

            $scope[type + 'BufferLength'] = bufferLevel;
            $scope[type + 'MaxIndex'] = maxIndex;
            $scope[type + 'Bitrate'] = bitrate;
            $scope[type + 'DroppedFrames'] = droppedFPS;
            $scope[type + 'LiveLatency'] = liveLatency;

            var httpMetrics = calculateHTTPMetrics(type, dashMetrics.getHttpRequests(type));
            if (httpMetrics) {
                $scope[type + 'Download'] = httpMetrics.download[type].low.toFixed(2) + ' | ' + httpMetrics.download[type].average.toFixed(2) + ' | ' + httpMetrics.download[type].high.toFixed(2);
                $scope[type + 'Latency'] = httpMetrics.latency[type].low.toFixed(2) + ' | ' + httpMetrics.latency[type].average.toFixed(2) + ' | ' + httpMetrics.latency[type].high.toFixed(2);
                $scope[type + 'Ratio'] = httpMetrics.ratio[type].low.toFixed(2) + ' | ' + httpMetrics.ratio[type].average.toFixed(2) + ' | ' + httpMetrics.ratio[type].high.toFixed(2);
            }

            if ($scope.chartCount % 2 === 0) {
                var time = getTimeForPlot();
                $scope.plotPoint('buffer', type, bufferLevel, time);
                $scope.plotPoint('index', type, index, time);
                $scope.plotPoint('bitrate', type, bitrate, time);
                $scope.plotPoint('droppedFPS', type, droppedFPS, time);
                $scope.plotPoint('liveLatency', type, liveLatency, time);

                if (httpMetrics) {
                    $scope.plotPoint('download', type, httpMetrics.download[type].average.toFixed(2), time);
                    $scope.plotPoint('latency', type, httpMetrics.latency[type].average.toFixed(2), time);
                    $scope.plotPoint('ratio', type, httpMetrics.ratio[type].average.toFixed(2), time);
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


        if (vars && vars.hasOwnProperty('targetLatency')) {
            let targetLatency = parseInt(vars.targetLatency, 10);
            if (!isNaN(targetLatency)) {
                item.bufferConfig = {
                    lowLatencyMode: true,
                    liveDelay: targetLatency / 1000
                };

                $scope.lowLatencyModeSelected = true;
            }
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