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

app.controller('DashController', ['$scope', '$window', 'sources', 'contributors', 'dashifTestVectors', function ($scope, $window, sources, contributors, dashifTestVectors) {
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
        dashifTestVectors.query(function (data) {
            $scope.availableStreams.splice(7, 0, {
                name: 'DASH Industry Forum Test Vectors',
                submenu: data.items
            });
        });

        // Add provider to beginning of each Vector
        var provider = data.provider;
        $scope.availableStreams.forEach(function (item) {
            if (item && item.submenu && item.submenu.length > 0) {
                item.submenu.forEach(function (subitem) {
                    if (subitem && subitem.name && subitem.provider && provider[subitem.provider] && provider[subitem.provider].acronym) {
                        subitem.name = '[' + provider[subitem.provider].acronym + '] ' + subitem.name;
                    }
                });
            }
        });
    });

    contributors.query(function (data) {
        $scope.contributors = data.items;
    });


    /* ======= Chart related stuff ======= */
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
        audio: {
            buffer: { data: [], selected: false, color: '#65080c', label: 'Audio Buffer Level' },
            bitrate: { data: [], selected: false, color: '#00CCBE', label: 'Audio Bitrate (kbps)' },
            index: { data: [], selected: false, color: '#ffd446', label: 'Audio Current Index' },
            pendingIndex: { data: [], selected: false, color: '#FF6700', label: 'AudioPending Index' },
            ratio: { data: [], selected: false, color: '#329d61', label: 'Audio Ratio' },
            download: { data: [], selected: false, color: '#44c248', label: 'Audio Download Rate (Mbps)' },
            latency: { data: [], selected: false, color: '#326e88', label: 'Audio Latency (ms)' },
            droppedFPS: { data: [], selected: false, color: '#004E64', label: 'Audio Dropped FPS' },
            liveLatency: { data: [], selected: false, color: '#65080c', label: 'Live Latency' }
        },
        video: {
            buffer: { data: [], selected: true, color: '#00589d', label: 'Video Buffer Level' },
            bitrate: { data: [], selected: true, color: '#ff7900', label: 'Video Bitrate (kbps)' },
            index: { data: [], selected: false, color: '#326e88', label: 'Video Current Quality' },
            pendingIndex: { data: [], selected: false, color: '#44c248', label: 'Video Pending Index' },
            ratio: { data: [], selected: false, color: '#00CCBE', label: 'Video Ratio' },
            download: { data: [], selected: false, color: '#FF6700', label: 'Video Download Rate (Mbps)' },
            latency: { data: [], selected: false, color: '#329d61', label: 'Video Latency (ms)' },
            droppedFPS: { data: [], selected: false, color: '#65080c', label: 'Video Dropped FPS' },
            liveLatency: { data: [], selected: false, color: '#65080c', label: 'Live Latency' }
        }
    };

    /* ======= General ======= */
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
    $scope.additionalAbrRules = {};
    $scope.mediaSettingsCacheEnabled = true;
    $scope.metricsTimer = null;
    $scope.updateMetricsInterval = 1000;
    $scope.drmKeySystems = ['com.widevine.alpha', 'com.microsoft.playready', 'org.w3.clearkey'];
    $scope.drmKeySystem = '';
    $scope.drmLicenseURL = '';
    $scope.drmRequestHeader = '';


    $scope.protectionData = {};
    $scope.prioritiesEnabled = false;

    $scope.drmPlayready = {
        isActive: false,
        drmKeySystem: 'com.microsoft.playready',
        licenseServerUrl: '',
        httpRequestHeaders: {},
        priority: 1
    }

    $scope.drmWidevine = {
        isActive: false,
        drmKeySystem: 'com.widevine.alpha',
        licenseServerUrl: '',
        httpRequestHeaders: {},
        priority: 0
    }

    $scope.drmClearkey = {
        isActive: false,
        drmKeySystem: 'org.w3.clearkey',
        licenseServerUrl: '',
        httpRequestHeaders: {},
        kid: '',
        key: '',
        clearkeys: {},
        inputMode: false,
        priority: 2
    }

    $scope.playreadyRequestHeaders = [];

    $scope.widevineRequestHeaders = [];

    $scope.clearkeyRequestHeaders = [];

    $scope.additionalClearkeyPairs = [];

    $scope.protData = {};

    $scope.drmToday = false;


    $scope.isDynamic = false;

    $scope.conformanceViolations = [];

    // metrics
    $scope.videoBitrate = 0;
    $scope.videoIndex = 0;
    $scope.videoPendingIndex = 0;
    $scope.videoPendingMaxIndex = 0;
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
    $scope.audioPendingIndex = 0;
    $scope.audioPendingMaxIndex = 0;
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
    $scope.cmcdEnabled = false;
    $scope.loopSelected = true;
    $scope.scheduleWhilePausedSelected = true;
    $scope.calcSegmentAvailabilityRangeFromTimelineSelected = false;
    $scope.reuseExistingSourceBuffersSelected = true;
    $scope.localStorageSelected = true;
    $scope.jumpGapsSelected = true;
    $scope.fastSwitchSelected = true;
    $scope.applyServiceDescription = true;
    $scope.useSuggestedPresentationDelay = true;
    $scope.videoAutoSwitchSelected = true;
    $scope.forceQualitySwitchSelected = false;
    $scope.videoQualities = [];
    $scope.ABRStrategy = 'abrDynamic';

    // Persistent license
    $scope.persistentSessionId = {};
    $scope.selectedKeySystem = null;

    // Error management
    $scope.error = '';
    $scope.errorType = '';

    // Cast
    $scope.isCasting = false;
    $scope.castPlayerState = 'IDLE';

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
    reqConfig.onload = function () {
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
                    'buffer': {
                        'fastSwitchEnabled': $scope.fastSwitchSelected,
                    },
                    'jumpGaps': true,
                    'abr': {
                        'autoSwitchBitrate': {
                            'video': $scope.videoAutoSwitchSelected
                        }
                    }
                }
            };
            $scope.player.updateSettings(initialConfig);
        }
        setLatencyAttributes();
        setAbrRules();
    };

    reqConfig.open('GET', 'dashjs_config.json', true);
    reqConfig.setRequestHeader('Content-type', 'application/json');
    reqConfig.send();

    $scope.player.on(dashjs.MediaPlayer.events.ERROR, function (e) { /* jshint ignore:line */
        console.log(e);
        if (!e.event) {
            $scope.$apply(function () {
                $scope.error = e.error.message;
                $scope.errorType = 'Dash.js :' + e.error.code;
                switch (e.error.code) {
                    case dashjs.MediaPlayer.errors.MANIFEST_LOADER_PARSING_FAILURE_ERROR_CODE:
                    case dashjs.MediaPlayer.errors.MANIFEST_LOADER_LOADING_FAILURE_ERROR_CODE:
                    case dashjs.MediaPlayer.errors.XLINK_LOADER_LOADING_FAILURE_ERROR_CODE:
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
            $('#errorModal').modal('show');
        }
    }, $scope);


    $scope.player.initialize($scope.video, null, $scope.autoPlaySelected);
    $scope.player.attachTTMLRenderingDiv($('#video-caption')[0]);


    var currentConfig = $scope.player.getSettings();

    var initVideoTrackSwitchMode = currentConfig.streaming.trackSwitchMode.video;
    var initAudioTrackSwitchMode = currentConfig.streaming.trackSwitchMode.audio;

    //get default track switch mode
    if (initVideoTrackSwitchMode === 'alwaysReplace') {
        document.getElementById('always-replace-video').checked = true;
    } else {
        document.getElementById('never-replace-video').checked = true;
    }

    if (initAudioTrackSwitchMode === 'alwaysReplace') {
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


    $scope.player.on(dashjs.MediaPlayer.events.REPRESENTATION_SWITCH, function (e) {
        var bitrate = Math.round(e.currentRepresentation.bandwidth / 1000);

        $scope[e.mediaType + 'PendingIndex'] = e.currentRepresentation.index + 1;
        $scope[e.mediaType + 'PendingMaxIndex'] = e.numberOfRepresentations;
        $scope[e.mediaType + 'Bitrate'] = bitrate;
        $scope.plotPoint('pendingIndex', e.mediaType, e.newQuality + 1, getTimeForPlot());
        $scope.safeApply();
    }, $scope);


    $scope.player.on(dashjs.MediaPlayer.events.PERIOD_SWITCH_COMPLETED, function (e) { /* jshint ignore:line */
        $scope.currentStreamInfo = e.toStreamInfo;
    }, $scope);

    $scope.player.on(dashjs.MediaPlayer.events.QUALITY_CHANGE_RENDERED, function (e) { /* jshint ignore:line */
        $scope[e.mediaType + 'Index'] = e.newQuality + 1;
        $scope.plotPoint('index', e.mediaType, e.newQuality + 1, getTimeForPlot());
        $scope.safeApply();
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
            e && e.isLast) {
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

    $scope.player.on(dashjs.MediaPlayer.events.CONFORMANCE_VIOLATION, function (e) { /* jshint ignore:line */
        if (e && e.event && e.event.key && !$scope.conformanceViolations[e.event.key]) {
            var existingViolation = $scope.conformanceViolations.filter(function (violation) {
                return violation.event.key === e.event.key;
            })

            if (!existingViolation || existingViolation.length === 0) {
                $scope.conformanceViolations.push(e);
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

    $scope.changeFetchThroughputCalculation = function (mode) {
        $scope.player.updateSettings({
            streaming: {
                abr: {
                    fetchThroughputCalculationMode: mode
                }
            }
        });
    };

    $scope.changeLiveCatchupMode = function (mode) {
        $scope.player.updateSettings({
            streaming: {
                liveCatchup: {
                    mode: mode
                }
            }
        });

    };

    $scope.changeABRStrategy = function (strategy) {
        $scope.player.updateSettings({
            streaming: {
                buffer: {
                    stallThreshold: 0.5
                },
                abr: {
                    ABRStrategy: strategy
                }
            }
        });

        if (strategy === 'abrLoLP') {
            $scope.player.updateSettings({
                streaming: {
                    buffer: {
                        stallThreshold: 0.05
                    }
                }
            });
            $scope.changeFetchThroughputCalculation('abrFetchThroughputCalculationMoofParsing');
            document.getElementById('abrFetchThroughputCalculationMoofParsing').checked = true;

            $scope.changeLiveCatchupMode('liveCatchupModeLoLP');
            document.getElementById('liveCatchupModeLoLP').checked = true;
        }
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
                'buffer': {
                    'fastSwitchEnabled': $scope.fastSwitchSelected
                }
            }
        });
    };

    $scope.toggleApplyServiceDescription = function () {
        $scope.player.updateSettings({
            streaming: {
                delay: {
                    applyServiceDescription: $scope.applyServiceDescription
                }
            }
        });
    };

    $scope.toggleUseSuggestedPresentationDelay = function () {
        $scope.player.updateSettings({
            streaming: {
                delay: {
                    useSuggestedPresentationDelay: $scope.useSuggestedPresentationDelay
                }
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

    $scope.toggleForceQualitySwitch = function () {
        $scope.controlbar.forceQualitySwitch($scope.forceQualitySwitchSelected);
    };

    $scope.toggleBufferRule = function () {
        $scope.player.updateSettings({
            streaming: {
                abr: {
                    additionalAbrRules: {
                        insufficientBufferRule: $scope.additionalAbrRules.insufficientBufferRule,
                        switchHistoryRule: $scope.additionalAbrRules.switchHistoryRule,
                        droppedFramesRule: $scope.additionalAbrRules.droppedFramesRule,
                        abandonRequestsRule: $scope.additionalAbrRules.abandonRequestsRule,
                    }
                }
            }
        });
    };

    $scope.toggleScheduleWhilePaused = function () {
        $scope.player.updateSettings({
            'streaming': {
                'scheduling': {
                    'scheduleWhilePaused': $scope.scheduleWhilePausedSelected
                }
            }
        });
    };

    $scope.toggleCalcSegmentAvailabilityRangeFromTimeline = function () {
        $scope.player.updateSettings({
            streaming: {
                timeShiftBuffer: {
                    calcFromSegmentTimeline: $scope.calcSegmentAvailabilityRangeFromTimelineSelected
                }
            }
        });
    };

    $scope.toggleReuseExistingSourceBuffers = function () {
        $scope.player.updateSettings({
            streaming: {
                buffer: {
                    reuseExistingSourceBuffers: $scope.reuseExistingSourceBuffersSelected
                }
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
                'gaps': {
                    'jumpGaps': $scope.jumpGapsSelected
                }
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

    $scope.toggleLiveCatchupEnabled = function () {
        $scope.player.updateSettings({
            streaming: {
                liveCatchup: {
                    enabled: $scope.liveCatchupEnabled
                }
            }
        });
    };

    $scope.setStream = function (item) {
        $scope.selectedItem = JSON.parse(JSON.stringify(item));
        $scope.protData = {};
        //Reset previous data
        $scope.clearDRM();
        // Execute if the loaded video already has preset DRM data
        if ($scope.selectedItem.hasOwnProperty('protData')) {
            $scope.protData = $scope.selectedItem.protData;
            // Handle preset protection data to be reflected in the UI and work with setDrm()
            $scope.handleProtectionData($scope.protData);
        }
    };

    $scope.clearDRM = function () {
        //Reset previous data
        let drmList = [$scope.drmPlayready, $scope.drmWidevine, $scope.drmClearkey];
        for (let drm of drmList) {
            drm.isActive = false;
            drm.licenseServerUrl = '';
            drm.kid = '';
            drm.key = '';
        }
        $scope.playreadyRequestHeaders = [];
        $scope.widevineRequestHeaders = [];
        $scope.clearkeyRequestHeaders = [];
        $scope.clearkeys = [];
        $scope.additionalClearkeyPairs = [];
    }

    $scope.toggleOptionsGutter = function (bool) {
        $scope.optionsGutter = bool;
    };

    $scope.toggleCmcdEnabled = function () {
        $scope.player.updateSettings({
            'streaming': {
                'cmcd': {
                    'enabled': $scope.cmcdEnabled
                }
            }
        });
    };

    $scope.doLoad = function () {
        $scope.initSession();

        // Execute if the loaded video already has preset DRM data
        if ($scope.selectedItem.hasOwnProperty('protData')) {

            // Set DRM options
            $scope.setDrm();
            $scope.protData = $scope.protectionData;
        }
        // Execute if setDrm() has been called with manually entered values
        else if ($scope.protectionData !== {}) {
            $scope.setDrm();
            $scope.protData = $scope.protectionData;
        } else if ($scope.drmLicenseURL !== '' && $scope.drmKeySystem !== '') {
            $scope.protData[$scope.drmKeySystem] = {
                serverURL: $scope.drmLicenseURL
            };
        } else {
            $scope.protData = null;
        }

        // Check if persistent license session ID is stored for current stream
        var sessionId = $scope.persistentSessionId[$scope.selectedItem.url];
        if (sessionId) {
            if (!$scope.protData) {
                $scope.protData = {};
            }
            if (!$scope.protData[$scope.selectedKeySystem]) {
                $scope.protData[$scope.selectedKeySystem] = {};
            }
            $scope.protData[$scope.selectedKeySystem].sessionId = sessionId;
        }

        var config = {
            'streaming': {
                'buffer': {
                    'stableBufferTime': $scope.defaultStableBufferDelay,
                    'bufferTimeAtTopQuality': $scope.defaultBufferTimeAtTopQuality,
                    'bufferTimeAtTopQualityLongForm': $scope.defaultBufferTimeAtTopQualityLongForm,
                },
                'delay': {
                    'liveDelay': $scope.defaultLiveDelay
                },
                'lowLatencyEnabled': $scope.lowLatencyModeSelected,
                abr: {},
                cmcd: {}
            }
        };

        if ($scope.selectedItem.hasOwnProperty('bufferConfig')) {
            var selectedConfig = $scope.selectedItem.bufferConfig;

            if (selectedConfig.liveDelay) {
                config.streaming.delay.liveDelay = selectedConfig.liveDelay;
            }

            if (selectedConfig.stableBufferTime) {
                config.streaming.buffer.stableBufferTime = selectedConfig.stableBufferTime;
            }

            if (selectedConfig.bufferTimeAtTopQuality) {
                config.streaming.buffer.bufferTimeAtTopQuality = selectedConfig.bufferTimeAtTopQuality;
            }

            if (selectedConfig.bufferTimeAtTopQualityLongForm) {
                config.streaming.buffer.bufferTimeAtTopQualityLongForm = selectedConfig.bufferTimeAtTopQualityLongForm;
            }

            if (selectedConfig.lowLatencyMode !== undefined) {
                config.streaming.lowLatencyEnabled = selectedConfig.lowLatencyMode;
            }
        }

        const liveDelayFragmentCount = parseInt($scope.liveDelayFragmentCount);
        if (!isNaN(liveDelayFragmentCount)) {
            config.streaming.delay.liveDelayFragmentCount = liveDelayFragmentCount;
        }

        const initialLiveDelay = parseFloat($scope.initialLiveDelay);
        if (!isNaN(initialLiveDelay)) {
            config.streaming.delay.liveDelay = initialLiveDelay;
        }

        const initBitrate = parseInt($scope.initialVideoBitrate);
        if (!isNaN(initBitrate)) {
            config.streaming.abr.initialBitrate = { 'video': initBitrate };
        }

        const minBitrate = parseInt($scope.minVideoBitrate);
        if (!isNaN(minBitrate)) {
            config.streaming.abr.minBitrate = { 'video': minBitrate };
        }

        const maxBitrate = parseInt($scope.maxVideoBitrate);
        if (!isNaN(maxBitrate)) {
            config.streaming.abr.maxBitrate = { 'video': maxBitrate };
        }

        config.streaming.cmcd.sid = $scope.cmcdSessionId ? $scope.cmcdSessionId : null;
        config.streaming.cmcd.cid = $scope.cmcdContentId ? $scope.cmcdContentId : null;
        config.streaming.cmcd.rtp = $scope.cmcdRtp ? $scope.cmcdRtp : null;
        config.streaming.cmcd.rtpSafetyFactor = $scope.cmcdRtpSafetyFactor ? $scope.cmcdRtpSafetyFactor : null;

        $scope.player.updateSettings(config);

        $scope.controlbar.reset();
        $scope.conformanceViolations = [];
        if ($scope.isCasting) {
            loadCastMedia($scope.selectedItem.url, $scope.protData);
        } else {
            $scope.player.setProtectionData($scope.protData);
            $scope.player.attachSource($scope.selectedItem.url);
        }
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
            if ($scope.initialSettings.textRole) {
                $scope.player.setInitialMediaSettingsFor('text', {
                    role: $scope.initialSettings.textRole,
                    lang: $scope.initialSettings.text
                });
            } else {
                $scope.player.setInitialMediaSettingsFor('text', {
                    lang: $scope.initialSettings.text
                });
            }
        }
        $scope.player.updateSettings({ streaming: { text: { defaultEnabled: $scope.initialSettings.textEnabled } } });
        $scope.player.enableForcedTextStreaming($scope.initialSettings.forceTextStreaming);
        $scope.controlbar.enable();
    };

    $scope.doStop = function () {
        $scope.player.attachSource(null);
        $scope.controlbar.reset();
        $scope.conformanceViolations = [];
        stopMetricsInterval();
    };

    $scope.changeTrackSwitchMode = function (mode, type) {
        var switchMode = {};
        switchMode[type] = mode;
        $scope.player.updateSettings({ 'streaming': { 'trackSwitchMode': switchMode } });
    };

    $scope.setLogLevel = function () {
        var level = $('input[name=\'log-level\']:checked').val();
        switch (level) {
            case 'none':
                $scope.player.updateSettings({ 'debug': { 'logLevel': dashjs.Debug.LOG_LEVEL_NONE } });
                break;

            case 'fatal':
                $scope.player.updateSettings({ 'debug': { 'logLevel': dashjs.Debug.LOG_LEVEL_FATAL } });
                break;

            case 'error':
                $scope.player.updateSettings({ 'debug': { 'logLevel': dashjs.Debug.LOG_LEVEL_ERROR } });
                break;

            case 'warning':
                $scope.player.updateSettings({ 'debug': { 'logLevel': dashjs.Debug.LOG_LEVEL_WARNING } });
                break;

            case 'info':
                $scope.player.updateSettings({ 'debug': { 'logLevel': dashjs.Debug.LOG_LEVEL_INFO } });
                break;

            default:
                $scope.player.updateSettings({ 'debug': { 'logLevel': dashjs.Debug.LOG_LEVEL_DEBUG } });
        }
    };

    $scope.setCmcdMode = function () {
        var mode = $('input[name=\'cmcd-mode\']:checked').val();
        switch (mode) {
            case 'query':
                $scope.player.updateSettings({ streaming: { cmcd: { mode: 'query' } } });
                break;

            case 'header':
                $scope.player.updateSettings({ streaming: { cmcd: { mode: 'header' } } });
                break;

            default:
                $scope.player.updateSettings({ streaming: { cmcd: { mode: 'query' } } });
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

    $scope.doLog = function () {
        console.log($scope.drmPlayready.priority);
    }

    /** Handle form input */
    $scope.setDrm = function () {

        let drmInputs = [$scope.drmPlayready, $scope.drmWidevine, $scope.drmClearkey];
        let protectionData = {};

        $scope.handleRequestHeaders();
        $scope.handleClearkeys();

        for (let input of drmInputs) {
            if (input.isActive) {

                // Check if the provided DRM is Clearkey and whether KID=KEY or LicenseServer + Header is selected; Default is KID=KEY
                if (input.hasOwnProperty('inputMode') && input.inputMode === false) {
                    //Check clearkeys has at least one entry
                    if (input.clearkeys !== {}) {
                        // Check if priority is enabled
                        protectionData[input.drmKeySystem] = {
                            'clearkeys': {},
                            'priority': 0
                        };
                        if (this.prioritiesEnabled) {
                            for (let key in input.clearkeys) {
                                protectionData[input.drmKeySystem]['clearkeys'][key] = input.clearkeys[key];
                            }
                            protectionData[input.drmKeySystem]['priority'] = parseInt(input.priority);
                        } else {
                            for (let key in input.clearkeys) {
                                protectionData[input.drmKeySystem]['clearkeys'][key] = input.clearkeys[key];
                            }
                        }

                        for (let key in input) {
                            if (key !== 'isActive' &&
                                key !== 'drmKeySystem' &&
                                key !== 'licenseServerUrl' &&
                                key !== 'httpRequestHeaders' &&
                                key !== 'priority' &&
                                key !== 'kid' &&
                                key !== 'key' &&
                                key !== 'inputMode') {
                                protectionData[input.drmKeySystem][key] = input[key];
                            }
                        }

                        if (!angular.equals(input.httpRequestHeaders, {})) {
                            protectionData[input.drmKeySystem]['httpRequestHeaders'] = input.httpRequestHeaders;
                        }
                    } else {
                        alert("Kid and Key must be specified!");
                    }

                } else {
                    // Validate URL. If the provided information is not a valid url, the DRM is skipped.
                    if (this.isValidURL(input.licenseServerUrl)) {

                        // Check if DRM-Priorisation is enabled
                        if (this.prioritiesEnabled) {
                            protectionData[input.drmKeySystem] = {
                                "serverURL": input.licenseServerUrl,
                                "priority": parseInt(input.priority)
                            }
                            if (!angular.equals(input.httpRequestHeaders, {}))
                                protectionData[input.drmKeySystem]['httpRequestHeaders'] = input.httpRequestHeaders;

                        } else {
                            protectionData[input.drmKeySystem] = {
                                "serverURL": input.licenseServerUrl,
                            }
                        }


                        // Enable DRM Today
                        if ($scope.drmToday) {
                            protectionData[input.drmKeySystem].drmtoday = true;
                        }

                        for (let key in input) {
                            if (key !== 'isActive' &&
                                key !== 'drmKeySystem' &&
                                key !== 'licenseServerUrl' &&
                                key !== 'httpRequestHeaders' &&
                                key !== 'priority') {
                                protectionData[input.drmKeySystem][key] = input[key];
                            }
                        }

                        // Only set request header if any have been specified
                        if (!angular.equals(input.httpRequestHeaders, {})) {
                            protectionData[input.drmKeySystem]['httpRequestHeaders'] = input.httpRequestHeaders;
                        }

                    } else {
                        console.log(input.licenseServerUrl, "is not a valid url!")
                    }

                }
            }
        }

        $scope.protectionData = protectionData;
        $scope.player.setProtectionData(protectionData);
    }

    $scope.addPopupInput = function (keySystem) {

        switch (keySystem) {
            case 'playready':
                $scope.playreadyRequestHeaders.push({
                    id: $scope.playreadyRequestHeaders.length + 1,
                    key: '',
                    value: ''
                })
                break;
            case 'widevine':
                $scope.widevineRequestHeaders.push({
                    id: $scope.widevineRequestHeaders.length + 1,
                    key: '',
                    value: ''
                })
                break;
            case 'clearkey':
                $scope.clearkeyRequestHeaders.push({
                    id: $scope.clearkeyRequestHeaders.length + 1,
                    key: '',
                    value: ''
                })
                break;
            case 'additionalClearkeys':
                $scope.additionalClearkeyPairs.push({
                    id: $scope.additionalClearkeyPairs.length + 1,
                    kid: '',
                    key: ''
                })
        }
    }

    $scope.removePopupInput = function (keySystem, index) {
        switch (keySystem) {
            case 'playready':
                $scope.playreadyRequestHeaders.splice(index, 1);
                break;
            case 'widevine':
                $scope.widevineRequestHeaders.splice(index, 1);
                break;
            case 'clearkey':
                $scope.clearkeyRequestHeaders.splice(index, 1);
                break;
            case 'additionalClearkeys':
                $scope.additionalClearkeyPairs.splice(index, 1);
                break;
        }

    }

    $scope.handleRequestHeaders = function () {
        // Initialize with current headers as empty
        $scope.drmPlayready.httpRequestHeaders = {};
        $scope.drmWidevine.httpRequestHeaders = {};
        $scope.drmClearkey.httpRequestHeaders = {};

        // fill headers with current inputs
        for (let header of $scope.playreadyRequestHeaders) {
            $scope.drmPlayready.httpRequestHeaders[header.key] = header.value;
        }
        for (let header of $scope.widevineRequestHeaders) {
            $scope.drmWidevine.httpRequestHeaders[header.key] = header.value;
        }
        for (let header of $scope.clearkeyRequestHeaders) {
            $scope.drmClearkey.httpRequestHeaders[header.key] = header.value;
        }
    }

    /** Handle multiple clearkeys */
    $scope.handleClearkeys = function () {
        // Initialize with empty
        $scope.drmClearkey.clearkeys = {}

        // Set default KID=KEY pair
        if ($scope.drmClearkey.kid !== '' && $scope.drmClearkey.key !== '') {
            $scope.drmClearkey.clearkeys[$scope.drmClearkey.kid] = $scope.drmClearkey.key;
        }
        // fill drmClearkey objects "clearkeys" property
        for (let clearkey of $scope.additionalClearkeyPairs) {
            $scope.drmClearkey.clearkeys[clearkey.kid] = clearkey.key;
        }
        // if clearkey property is empty, alert
        if ($scope.additionalClearkeyPairs === {}) {
            alert('You must specify at least one KID=KEY pair!');
        }
    }

    /** Handle inherent protection data passed by selectedItem */
    $scope.handleProtectionData = function (protectionData) {
        for (let data in protectionData) {

            switch (data) {
                case 'com.microsoft.playready':
                    // Set DRM to active
                    $scope.drmPlayready.isActive = true;
                    // Fill the drmPlayready object with data to be used by setDRM() later.
                    $scope.drmPlayready.licenseServerUrl = protectionData[data]['serverURL'];
                    for (let header in protectionData[data]['httpRequestHeaders']) {
                        $scope.playreadyRequestHeaders.push({
                            id: $scope.playreadyRequestHeaders.length + 1,
                            key: header,
                            value: protectionData[data]['httpRequestHeaders'][header]
                        });
                    }
                    // Add any additional parameters
                    for (let parameter in protectionData[data]) {
                        if (parameter !== 'serverURL' &&
                            parameter !== 'httpRequestHeaders') {
                            $scope.drmPlayready[parameter] = protectionData[data][parameter];
                        }
                    }
                    break;

                case 'com.widevine.alpha':
                    // Set DRM to active
                    $scope.drmWidevine.isActive = true;
                    // Fill the drmWidevine object with data to be used by setDRM() later
                    $scope.drmWidevine.licenseServerUrl = protectionData[data]['serverURL'];
                    for (let header in protectionData[data]['httpRequestHeaders']) {
                        $scope.widevineRequestHeaders.push({
                            id: $scope.widevineRequestHeaders.length + 1,
                            key: header,
                            value: protectionData[data]['httpRequestHeaders'][header]
                        });
                    }
                    // Add any additional parameters
                    for (let parameter in protectionData[data]) {
                        if (parameter !== 'serverURL' &&
                            parameter !== 'httpRequestHeaders') {
                            $scope.drmWidevine[parameter] = protectionData[data][parameter];
                        }
                    }
                    break;

                case 'org.w3.clearkey':
                    // Set DRM to active
                    $scope.drmClearkey.isActive = true;
                    // Handle clearkey data if specified using a license server
                    if (protectionData[data]['serverURL'] !== undefined) {
                        $scope.drmClearkey.licenseServerUrl = protectionData[data]['serverURL'];
                        for (let header in protectionData[data]['httpRequestHeaders']) {
                            $scope.clearkeyRequestHeaders.push({
                                id: $scope.clearkeyRequestHeaders.length + 1,
                                key: header,
                                value: protectionData[data]['httpRequestHeaders'][header]
                            });
                        }
                    }
                    // Handle clearkey data if specified using KID=KEY.
                    else {
                        let first = true;
                        if (protectionData[data]['clearkeys'] !== {}) {
                            for (let kid in protectionData[data]['clearkeys']) {
                                // For the first KID=Key pair, set drmClearkey properties so that it shows in the main text boxes
                                if (first === true) {
                                    $scope.drmClearkey.kid = kid;
                                    $scope.drmClearkey.key = protectionData[data]['clearkeys'][kid];
                                    delete protectionData[data]['clearkeys'][kid];
                                    first = false;
                                } else if (protectionData[data]['clearkeys'] !== {}) {
                                    $scope.additionalClearkeyPairs.push({
                                        id: $scope.additionalClearkeyPairs.length + 1,
                                        kid: kid,
                                        key: protectionData[data]['clearkeys'][kid]
                                    });
                                }
                            }
                        }
                    }
                    // Add any additional parameters
                    for (let parameter in protectionData[data]) {
                        if (parameter !== 'serverURL' &&
                            parameter !== 'httpRequestHeaders' &&
                            parameter !== 'clearkeys') {
                            $scope.drmWidevine[parameter] = protectionData[data][parameter];
                        }
                    }
                    break;
            }
        }
    }

    /** Test if provided string is a URL */
    $scope.isValidURL = function (str) {
        let res = str.match(/(http(s)?:\/\/.)?(www\.)?[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)/g);
        return (res !== null)
    };

    /** Toggle between KID=KEY and Licenseserver Clearkey specification */
    $scope.toggleInputMode = function () {
        $scope.drmClearkey.inputMode = !$scope.drmClearkey.inputMode;
    }

    // from: https://gist.github.com/siongui/4969449
    $scope.safeApply = function (fn) {
        var phase = this.$root.$$phase;
        if (phase == '$apply' || phase == '$digest')
            this.$eval(fn);
        else
            this.$apply(fn);
    };

    $scope.openDialogue = function (keySystem) {
        switch (keySystem) {
            case 'playready':
                document.getElementById('playreadyRequestHeaderDialogue').style.display = 'inline-block';
                break;
            case 'widevine':
                document.getElementById('widevineRequestHeaderDialogue').style.display = 'block';
                break;
            case 'clearkey':
                document.getElementById('clearkeyRequestHeaderDialogue').style.display = 'block';
                break;
            case 'additionalClearkeys':
                document.getElementById('additionalClearkeysDialogue').style.display = 'block';
                break;
        }
    }

    $scope.closeDialogue = function (keySystem) {
        switch (keySystem) {
            case 'playready':
                document.getElementById('playreadyRequestHeaderDialogue').style.display = 'none';
                break;
            case 'widevine':
                document.getElementById('widevineRequestHeaderDialogue').style.display = 'none';
                break;
            case 'clearkey':
                document.getElementById('clearkeyRequestHeaderDialogue').style.display = 'none';
                break;
            case 'additionalClearkeys':
                document.getElementById('additionalClearkeysDialogue').style.display = 'none';
        }
    }

    window.onclick = function (event) {
        if (event.target == document.getElementById('playreadyRequestHeaderDialogue') ||
            event.target == document.getElementById('widevineRequestHeaderDialogue') ||
            event.target == document.getElementById('clearkeyRequestHeaderDialogue') ||
            event.target == document.getElementById('additionalClearkeysDialogue')) {
            event.target.style.display = 'none';
        }
    }

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

        if (dashMetrics && $scope.currentStreamInfo) {
            var period = dashAdapter.getPeriodById($scope.currentStreamInfo.id);
            var periodIdx = period ? period.index : $scope.currentStreamInfo.index;

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

    function setLatencyAttributes() {
        // get buffer default value
        var currentConfig = $scope.player.getSettings();
        $scope.defaultLiveDelay = currentConfig.streaming.delay.liveDelay;
        $scope.defaultStableBufferDelay = currentConfig.streaming.buffer.stableBufferTime;
        $scope.defaultBufferTimeAtTopQuality = currentConfig.streaming.buffer.bufferTimeAtTopQuality;
        $scope.defaultBufferTimeAtTopQualityLongForm = currentConfig.streaming.buffer.bufferTimeAtTopQualityLongForm;
        $scope.lowLatencyModeSelected = currentConfig.streaming.lowLatencyEnabled;
        $scope.liveCatchupEnabled = currentConfig.streaming.liveCatchup.enabled;
    }

    function setAbrRules() {
        var currentConfig = $scope.player.getSettings();
        $scope.additionalAbrRules.insufficientBufferRule = currentConfig.streaming.abr.additionalAbrRules.insufficientBufferRule;
        $scope.additionalAbrRules.switchHistoryRule = currentConfig.streaming.abr.additionalAbrRules.switchHistoryRule;
        $scope.additionalAbrRules.droppedFramesRule = currentConfig.streaming.abr.additionalAbrRules.droppedFramesRule;
        $scope.additionalAbrRules.abandonRequestsRule = currentConfig.streaming.abr.additionalAbrRules.abandonRequestsRule;
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
            } catch (e) {
            }
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

    ////////////////////////////////////////
    //
    // Google Cast management
    //
    ////////////////////////////////////////

    const CAST_APP_ID = '9210B4FF';
    let castContext;
    let castSession;
    let remotePlayer;
    let remotePlayerController;

    let castPlayer;

    $window['__onGCastApiAvailable'] = function (isAvailable) {
        if (isAvailable) {
            castContext = cast.framework.CastContext.getInstance();
            castContext.setOptions({
                receiverApplicationId: CAST_APP_ID,
                autoJoinPolicy: chrome.cast.AutoJoinPolicy.ORIGIN_SCOPED
            });
            castContext.addEventListener(cast.framework.CastContextEventType.CAST_STATE_CHANGED, function (e) {
                console.log('[Cast]', e);
                if (e.castState === cast.framework.CastState.CONNECTED) {
                    onCastReady();
                } else if (e.castState === cast.framework.CastState.NOT_CONNECTED) {
                    onCastEnd();
                }
            });
            remotePlayer = new cast.framework.RemotePlayer();
            remotePlayerController = new cast.framework.RemotePlayerController(remotePlayer);
            remotePlayerController.addEventListener(cast.framework.RemotePlayerEventType.PLAYER_STATE_CHANGED, function () {
                if (remotePlayer) {
                    $scope.castPlayerState = remotePlayer.playerState;
                    $scope.safeApply();
                }
            });
            castPlayer = new CastPlayer(remotePlayer, remotePlayerController);
        }
    };

    function onCastReady() {
        $scope.isCasting = true;
        castSession = castContext.getCurrentSession();
        castPlayer.setCastSession(castSession);
        $scope.controlbar.setPlayer(castPlayer);
        $scope.controlbar.enable();
        $scope.safeApply();
    }

    function onCastEnd() {
        $scope.isCasting = false;
        $scope.controlbar.setPlayer($scope.player);
        $scope.safeApply();
    }

    function loadCastMedia(url, protData) {
        var mediaInfo = new chrome.cast.media.MediaInfo(url);
        if (protData) {
            mediaInfo.customData = {
                protData: protData
            }
        }
        var request = new chrome.cast.media.LoadRequest(mediaInfo);
        if (castSession) {
            castPlayer.reset();
            castSession.loadMedia(request).then(
                function () {
                    let media = castSession.getMediaSession();
                    if (media) {
                        console.info('cast media: ', media);
                    }
                },
                function (errorCode) {
                    console.log('Error code: ' + errorCode);
                }
            );
        }
    }
}]);

function legendLabelClickHandler(obj) { /* jshint ignore:line */
    var scope = angular.element($('body')).scope(); /* jshint ignore:line */
    var id = obj.id.split('.');
    var target = scope.chartState[id[0]][id[1]];
    target.selected = !target.selected;
    scope.enableChartByName(id[1], id[0]);
    scope.safeApply();
}
