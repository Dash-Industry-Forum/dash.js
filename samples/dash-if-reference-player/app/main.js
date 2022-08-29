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
            download: { data: [], selected: false, color: '#44c248', label: 'Audio Download Time (sec)' },
            latency: { data: [], selected: false, color: '#326e88', label: 'Audio Latency (ms)' },
            droppedFPS: { data: [], selected: false, color: '#004E64', label: 'Audio Dropped FPS' },
            liveLatency: { data: [], selected: false, color: '#65080c', label: 'Live Latency' },
            playbackRate: { data: [], selected: false, color: '#65080c', label: 'Playback Rate' }
        },
        video: {
            buffer: { data: [], selected: true, color: '#00589d', label: 'Video Buffer Level' },
            bitrate: { data: [], selected: true, color: '#ff7900', label: 'Video Bitrate (kbps)' },
            index: { data: [], selected: false, color: '#326e88', label: 'Video Current Quality' },
            pendingIndex: { data: [], selected: false, color: '#44c248', label: 'Video Pending Index' },
            ratio: { data: [], selected: false, color: '#00CCBE', label: 'Video Ratio' },
            download: { data: [], selected: false, color: '#FF6700', label: 'Video Download Time (sec)' },
            latency: { data: [], selected: false, color: '#329d61', label: 'Video Latency (ms)' },
            droppedFPS: { data: [], selected: false, color: '#65080c', label: 'Video Dropped FPS' },
            liveLatency: { data: [], selected: false, color: '#65080c', label: 'Live Latency' },
            playbackRate: { data: [], selected: false, color: '#65080c', label: 'Playback Rate' }
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
        inputMode: 'kidKey',
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

    var defaultExternalSettings = {
        mpd: encodeURIComponent('https://dash.akamaized.net/akamai/bbb_30fps/bbb_30fps.mpd'),
        loop: true,
        autoPlay: true,
        drmToday: false,
        forceQualitySwitchSelected: false,
        drmPrioritiesEnabled: false,
        languageAudio: null,
        roleVideo: null,
        languageText: null,
        roleText: undefined,
        forceTextStreaming: false
    }

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
    $scope.videoPlaybackRate = 1.00;

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
    $scope.audioPlaybackRate = 1.00;

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
    $scope.applyContentSteering = true;
    $scope.useSuggestedPresentationDelay = true;
    $scope.videoAutoSwitchSelected = true;
    $scope.forceQualitySwitchSelected = false;
    $scope.videoQualities = [];
    $scope.ABRStrategy = 'abrDynamic';

    $scope.liveCatchupMode = 'liveCatchupModeDefault';
    $scope.abrThroughputCalculationMode = 'abrFetchThroughputCalculationMoofParsing';
    $scope.videoTrackSwitchMode = 'alwaysReplace';
    $scope.audioTrackSwitchMode = 'neverReplace';
    $scope.currentLogLevel = 'info';
    $scope.cmcdMode = 'query';
    $scope.cmcdAllKeys = ['br', 'd', 'ot', 'tb', 'bl', 'dl', 'mtp', 'nor', 'nrr', 'su', 'bs', 'rtp', 'cid', 'pr', 'sf', 'sid', 'st', 'v']

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

    const defaultSettings = JSON.parse(JSON.stringify($scope.player.getSettings()));

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
                $scope.persistentSessionId[$scope.selectedItem.url] = session.getSessionId();
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
                applyServiceDescription: $scope.applyServiceDescription
            }
        });
    };

    $scope.toggleApplyContentSteering = function () {
        $scope.player.updateSettings({
            streaming: {
                applyContentSteering: $scope.applyContentSteering
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

    $scope.toggleLiveCatchupEnabled = function () {
        $scope.player.updateSettings({
            streaming: {
                liveCatchup: {
                    enabled: $scope.liveCatchupEnabled
                }
            }
        });
    };

    $scope.updateInitialLiveDelay = function () {
        $scope.player.updateSettings({
            streaming: {
                delay: {
                    liveDelay: parseInt($scope.initialLiveDelay)
                }
            }
        });
    };

    $scope.updateLiveDelayFragmentCount = function () {
        $scope.player.updateSettings({
            streaming: {
                delay: {
                    liveDelayFragmentCount: parseInt($scope.liveDelayFragmentCount)
                }
            }
        });
    };

    $scope.updateInitialBitrateVideo = function () {
        $scope.player.updateSettings({
            streaming: {
                abr: {
                    initialBitrate: {
                        video: parseInt($scope.initialVideoBitrate)
                    }
                }
            }
        });
    };

    $scope.updateMinimumBitrateVideo = function () {
        $scope.player.updateSettings({
            streaming: {
                abr: {
                    minBitrate: {
                        video: parseInt($scope.minVideoBitrate)
                    }
                }
            }
        });
    };

    $scope.updateMaximumBitrateVideo = function () {
        $scope.player.updateSettings({
            streaming: {
                abr: {
                    maxBitrate: {
                        video: parseInt($scope.maxVideoBitrate)
                    }
                }
            }
        });
    };

    $scope.updateInitialLanguageAudio = function () {
        $scope.player.setInitialMediaSettingsFor('audio', {
            lang: $scope.initialSettings.audio
        });
    };

    $scope.updateInitialRoleVideo = function () {
        $scope.player.setInitialMediaSettingsFor('video', {
            role: $scope.initialSettings.video
        });
    };

    $scope.updateInitialLanguageText = function () {
        $scope.player.setInitialMediaSettingsFor('text', {
            lang: $scope.initialSettings.text
        });
    };

    $scope.updateInitialRoleText = function () {
        $scope.player.setInitialMediaSettingsFor('text', {
            role: $scope.initialSettings.textRole
        });
    };

    $scope.toggleText = function () {
        $scope.player.updateSettings({ streaming: { text: { defaultEnabled: $scope.initialSettings.textEnabled } } });
    }

    $scope.toggleForcedTextStreaming = function () {
        $scope.player.enableForcedTextStreaming($scope.initialSettings.forceTextStreaming);
    }

    $scope.updateCmcdSessionId = function () {
        $scope.player.updateSettings({
            streaming: {
                cmcd: {
                    sid: $scope.cmcdSessionId
                }
            }
        });
    }

    $scope.updateCmcdContentId = function () {
        $scope.player.updateSettings({
            streaming: {
                cmcd: {
                    cid: $scope.cmcdContentId
                }
            }
        });
    }

    $scope.updateCmcdRtp = function () {
        $scope.player.updateSettings({
            streaming: {
                cmcd: {
                    rtp: $scope.cmcdRtp
                }
            }
        });
    }

    $scope.updateCmcdRtpSafetyFactor = function () {
        $scope.player.updateSettings({
            streaming: {
                cmcd: {
                    rtpSafetyFactor: $scope.cmcdRtpSafetyFactor
                }
            }
        });
    }

    $scope._getFormatedCmcdEnabledKeys = function () {
        let formatedKeys;
        if (!Array.isArray($scope.cmcdEnabledKeys)) {
            let cmcdEnabledKeys = $scope.cmcdEnabledKeys.split(',');
            formatedKeys = $scope.cmcdAllKeys.map(key => {
                let mappedKey = key;
                if (!cmcdEnabledKeys.includes(key)) mappedKey = '';

                return mappedKey;
            });
        } else {
            formatedKeys = $scope.cmcdEnabledKeys;
        }

        return formatedKeys
    }

    $scope.updateCmcdEnabledKeys = function () {
        let cmcdEnabledKeys = $scope._getFormatedCmcdEnabledKeys();

        $scope.player.updateSettings({
            streaming: {
                cmcd: {
                    enabledKeys: cmcdEnabledKeys
                }
            }
        });
    }

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
            streaming: {
                buffer: {
                    stableBufferTime: $scope.defaultStableBufferDelay,
                    bufferTimeAtTopQuality: $scope.defaultBufferTimeAtTopQuality,
                    bufferTimeAtTopQualityLongForm: $scope.defaultBufferTimeAtTopQualityLongForm,
                },
                delay: {
                    liveDelay: $scope.defaultLiveDelay
                },
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
        config.streaming.cmcd.enabledKeys = $scope.cmcdEnabledKeys ? $scope._getFormatedCmcdEnabledKeys() : [];

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

    /** Handle form input */
    $scope.setDrm = function () {

        let drmInputs = [$scope.drmPlayready, $scope.drmWidevine, $scope.drmClearkey];
        let protectionData = {};

        $scope.handleRequestHeaders();
        $scope.handleClearkeys();

        for (let input of drmInputs) {
            if (input.isActive) {

                // Check if the provided DRM is Clearkey and whether KID=KEY or LicenseServer + Header is selected; Default is KID=KEY
                if (input.hasOwnProperty('inputMode') && input.inputMode === 'kidKey') {
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
                        alert('Kid and Key must be specified!');
                    }

                } else {
                    // Check if DRM-Priorisation is enabled
                    if (this.prioritiesEnabled) {
                        protectionData[input.drmKeySystem] = {
                            'serverURL': input.licenseServerUrl,
                            'priority': parseInt(input.priority)
                        }
                        if (!angular.equals(input.httpRequestHeaders, {}))
                            protectionData[input.drmKeySystem]['httpRequestHeaders'] = input.httpRequestHeaders;

                    } else {
                        protectionData[input.drmKeySystem] = {
                            'serverURL': input.licenseServerUrl,
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
                case 'playready':
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

                case 'widevine':
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

                case 'clearkey':
                case 'org.w3.clearkey':
                    // Set DRM to active
                    $scope.drmClearkey.isActive = true;
                    //TODO : Check if any examples are not kid=key method!
                    if (!protectionData[data].hasOwnProperty('inputMode')) {
                        protectionData[data]['inputMode'] = 'kidKey';
                    }
                    $scope.drmClearkey.inputMode = protectionData[data]['inputMode'];
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
                            $scope.drmClearkey[parameter] = protectionData[data][parameter];
                        }
                    }
                    break;
            }
        }
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

    $scope.copyNotificationShow = function () {
        document.getElementById('copyNotificationPopup').style.display = 'block';
        setTimeout($scope.copyNotificationHide, 3000);
    }

    $scope.copyNotificationHide = function () {
        document.getElementById('copyNotificationPopup').style.display = 'none';
    }

    window.onclick = function (event) {
        if (event.target == document.getElementById('playreadyRequestHeaderDialogue') ||
            event.target == document.getElementById('widevineRequestHeaderDialogue') ||
            event.target == document.getElementById('clearkeyRequestHeaderDialogue') ||
            event.target == document.getElementById('additionalClearkeysDialogue')) {
            event.target.style.display = 'none';
        }
    }

    /** Copy a URL containing the current settings as query Parameters to the Clipboard */
    $scope.copyQueryUrl = function () {
        var currentExternalSettings = {
            mpd: encodeURIComponent(decodeURIComponent($scope.selectedItem.url)),
            loop: $scope.loopSelected,
            autoPlay: $scope.autoPlaySelected,
            drmToday: $scope.drmToday,
            forceQualitySwitchSelected: $scope.forceQualitySwitchSelected,
            drmPrioritiesEnabled: $scope.prioritiesEnabled,
            languageAudio: $scope.initialSettings.audio,
            roleVideo: $scope.initialSettings.video,
            languageText: $scope.initialSettings.text,
            roleText: $scope.initialSettings.textRole,
            forceTextStreaming: $scope.initialSettings.forceTextStreaming
        }

        var externalSettingsString = $scope.toQueryString($scope.makeSettingDifferencesObject(currentExternalSettings, defaultExternalSettings));

        $scope.handleRequestHeaders();
        $scope.handleClearkeys();
        var drmList = [$scope.drmPlayready, $scope.drmWidevine, $scope.drmClearkey];
        var currentDrm;
        for (var drm of drmList) {
            if (drm.isActive) {
                switch (drm.drmKeySystem) {
                    case 'com.microsoft.playready':
                        currentDrm = { 'playready': drm };
                        externalSettingsString += '&' + $scope.toQueryString(currentDrm);
                        break;
                    case 'com.widevine.alpha':
                        currentDrm = { 'widevine': drm };
                        externalSettingsString += '&' + $scope.toQueryString(currentDrm);
                        break;
                    case 'org.w3.clearkey':
                        currentDrm = { 'clearkey': drm };
                        externalSettingsString += '&' + $scope.toQueryString(currentDrm);
                        break;
                }
            }
        }
        var currentSetting = $scope.player.getSettings();
        currentSetting = $scope.makeSettingDifferencesObject(currentSetting, defaultSettings);

        var url = window.location.protocol + '//' + window.location.host + window.location.pathname + '?';
        var queryString = externalSettingsString + '+&' + $scope.toQueryString(currentSetting);

        var urlString = url + queryString;

        if (urlString.slice(-1) === '&') urlString = urlString.slice(0, -1);

        $scope.checkQueryLength(urlString);

        const element = document.createElement('textarea');
        element.value = urlString;
        document.body.appendChild(element);
        element.select();
        document.execCommand('copy');
        document.body.removeChild(element);
    }

    $scope.makeSettingDifferencesObject = function (settings, defaultSettings) {
        var settingDifferencesObject = {};

        if (Array.isArray(settings)) {
            return _arraysEqual(settings, defaultSettings) ? {} : settings;
        }

        for (var setting in settings) {
            if (typeof defaultSettings[setting] === 'object' && defaultSettings[setting] !== null && !(defaultSettings[setting] instanceof Array)) {
                settingDifferencesObject[setting] = this.makeSettingDifferencesObject(settings[setting], defaultSettings[setting], false);
            }
            else if(settings[setting] !== defaultSettings[setting]){
                if(Array.isArray(settings[setting])){
                    settingDifferencesObject[setting] = _arraysEqual(settings[setting], defaultSettings[setting]) ? {} : settings[setting];
                }
                else {
                    settingDifferencesObject[setting] = settings[setting];
                }

            }
        }

        return settingDifferencesObject;
    }

    function _arraysEqual(a, b) {
        if (a === b) {
            return true;
        }
        if (a == null || b == null) {
            return false;
        }
        if (a.length !== b.length) {
            return false;
        }

        // If you don't care about the order of the elements inside
        // the array, you should sort both arrays here.
        // Please note that calling sort on an array will modify that array.
        // you might want to clone your array first.

        for (var i = 0; i < a.length; ++i) {
            if (a[i] !== b[i]) {
                return false;
            }
        }

        return true;
    }

    /** Transform the current Settings into a nested query-string format */
    $scope.toQueryString = function (settings, prefix) {
        var urlString = [];
        for (var setting in settings) {
            if (settings.hasOwnProperty(setting)) {
                var k = prefix ? prefix + '.' + setting : setting,
                    v = settings[setting];
                urlString.push((v != null && typeof v === 'object') ?
                    this.toQueryString(v, k) :
                    encodeURIComponent(decodeURIComponent(k)) + '=' + encodeURIComponent(decodeURIComponent(v)));
            }
        }
        // Make the string, then remove all cases of && caused by empty settings
        return urlString.join('&').split(/&&*/).join('&');
    }

    /** Resolve nested query parameters */
    $scope.resolveQueryNesting = function (base, nestedKey, value) {
        var keyList = nestedKey.split('.');
        var lastProperty = value !== null ? keyList.pop() : false;
        var obj = base;

        for (var key = 0; key < keyList.length; key++) {
            base = base[keyList[key]] = base [keyList[key]] || {};
        }


        value = $scope.handleQueryParameters(value);

        if (lastProperty) base = base [lastProperty] = value;

        return obj;
    }

    $scope.activeDrms = {};

    /** Transform query-string into Object  */
    $scope.toSettingsObject = function (queryString) {
        //Remove double & in case of empty settings field
        var querySegments = queryString.split('&&').join('&');
        querySegments = queryString.split('&');
        var settingsObject = {};
        var drmObject = {};
        var prioritiesEnabled = false;
        var key, value;
        var i = 1;

        for (var segment in querySegments) {
            [key, value] = querySegments[segment].split('=');
            value = decodeURIComponent(value);

            $scope.resolveQueryNesting(settingsObject, key, value);
        }

        for (var settingCategory of Object.keys(settingsObject)) {
            if (settingsObject !== {} &&
                (settingCategory === 'playready' ||
                    settingCategory === 'widevine' ||
                    settingCategory === 'clearkey') &&
                settingsObject[settingCategory].isActive) {
                drmObject[settingCategory] = settingsObject[settingCategory];
                $scope.activeDrms[settingCategory] = settingsObject[settingCategory];
                delete settingsObject.settingCategory;

            }
        }
        prioritiesEnabled = settingsObject.drmPrioritiesEnabled;
        if (prioritiesEnabled !== undefined) {
            drmObject = $scope.makeProtectionData(drmObject, prioritiesEnabled);
        }
        return [settingsObject, drmObject];
    }

    $scope.makeProtectionData = function (drmObject, prioritiesEnabled) {
        var queryProtectionData = {};

        for (var drm in drmObject) {
            if (drmObject[drm].hasOwnProperty('inputMode') && drmObject[drm].inputMode === 'kidKey') {
                if (drmObject[drm].clearkeys !== {}) {
                    queryProtectionData[drmObject[drm].drmKeySystem] = {
                        'clearkeys': {},
                        'priority': 0
                    };
                    if (prioritiesEnabled) {
                        for (var key in drmObject[drm].clearkeys) {
                            queryProtectionData[drmObject[drm].drmKeySystem]['clearkeys'][key] = drmObject[drm].clearkeys[key];
                        }
                        queryProtectionData[drmObject[drm].drmKeySystem]['priority'] = parseInt(drmObject[drm].priority);
                    } else {
                        for (var key in drmObject[drm].clearkeys) {
                            queryProtectionData[drmObject[drm].drmKeySystem]['clearkeys'][key] = drmObject[drm].clearkeys[key];
                        }
                    }

                    for (var key in drmObject[drm]) {
                        if (key !== 'isActive' &&
                            key !== 'drmKeySystem' &&
                            key !== 'licenseServerUrl' &&
                            key !== 'httpRequestHeaders' &&
                            key !== 'priority' &&
                            key !== 'kid' &&
                            key !== 'key' &&
                            key !== 'inputMode') {
                            queryProtectionData[drmObject[drm].drmKeySystem][key] = drmObject[drm][key];
                        }
                    }

                    if (drmObject[drm].httpRequestHeaders !== {}) {
                        queryProtectionData[drmObject[drm].drmKeySystem]['httpRequestHeaders'] = drmObject[drm].httpRequestHeaders;
                    }
                } else {
                    alert('Kid and Key must be specified!');
                }

            } else {
                //check if priority is enabled
                if (prioritiesEnabled) {
                    queryProtectionData[drmObject[drm].drmKeySystem] = {
                        'serverURL': decodeURIComponent(drmObject[drm].licenseServerUrl),
                        'priority': parseInt(drmObject[drm].priority)
                    }
                    if (drmObject[drm].httpRequestHeaders !== {})
                        queryProtectionData[drmObject[drm].drmKeySystem]['httpRequestHeaders'] = drmObject[drm].httpRequestHeaders;

                } else {
                    queryProtectionData[drmObject[drm].drmKeySystem] = {
                        'serverURL': decodeURIComponent(drmObject[drm].licenseServerUrl),
                    }
                }

                for (var key in drmObject[drm]) {
                    if (key !== 'isActive' &&
                        key !== 'drmKeySystem' &&
                        key !== 'licenseServerUrl' &&
                        key !== 'httpRequestHeaders' &&
                        key !== 'priority') {
                        queryProtectionData[drmObject[drm].drmKeySystem][key] = drmObject[drm][key];
                    }
                }

                // Only set request header if any have been specified
                if (drmObject[drm].httpRequestHeaders !== {}) {
                    queryProtectionData[drmObject[drm].drmKeySystem]['httpRequestHeaders'] = drmObject[drm].httpRequestHeaders;
                }
            }
        }
        return queryProtectionData;
    }

    $scope.setExternalSettings = function (currentQuery) {
        var handleExternalSettings = currentQuery.split('+').join('').split('&');
        for (var index = 0; index < handleExternalSettings.length; index++) {
            var [key, value] = handleExternalSettings[index].split('=') || '';
            switch (key) {
                case 'mpd':
                    $scope.selectedItem.url = decodeURIComponent(value);
                    break;
                case 'loop':
                    $scope.loopSelected = this.parseBoolean(value);
                    break;
                case 'autoPlay':
                    $scope.autoPlaySelected = this.parseBoolean(value);
                    $scope.toggleAutoPlay();
                    break;
                case 'drmToday':
                    $scope.drmToday = this.parseBoolean(value);
                    break;
                case 'forceQualitySwitchSelected':
                    $scope.forceQualitySwitchSelected = this.parseBoolean(value);
                    $scope.toggleForceQualitySwitch($scope.forceQualitySwitchSelected);
                    break;
                case 'drmPrioritiesEnabled':
                    $scope.prioritiesEnabled = this.parseBoolean(value);
                    break;
                case 'languageAudio':
                    $scope.player.setInitialMediaSettingsFor('audio', {
                        lang: $scope.handleQueryParameters(value)
                    });
                    break;
                case 'roleVideo':
                    $scope.player.setInitialMediaSettingsFor('video', {
                        role: $scope.handleQueryParameters(value)
                    });
                    break;
                case 'languageText':
                    $scope.initialSettings.text = $scope.handleQueryParameters(value)
                    $scope.player.setInitialMediaSettingsFor('text', {
                        lang: $scope.handleQueryParameters(value)
                    });
                    break;
                case 'roleText':
                    $scope.player.setInitialMediaSettingsFor('text', {
                        lang: $scope.handleQueryParameters($scope.initialSettings.text),
                        role: $scope.handleQueryParameters(value)
                    });
                    break;
                case 'forceTextStreaming':
                    $scope.initialSettings.forceTextStreaming = this.parseBoolean(value);
                    $scope.player.enableForcedTextStreaming($scope.initialSettings.forceTextStreaming);
                    break;
            }
        }
    }

    $scope.setQueryData = function (currentQuery) {
        if (!currentQuery.includes('&')) {
            return;
        }
        var passedSettings = currentQuery.slice(currentQuery.indexOf('+')).substring(1);
        passedSettings = $scope.toSettingsObject(passedSettings)[0];
        $scope.protectionData = $scope.toSettingsObject(currentQuery.split('+').join(''))[1];
        $scope.player.updateSettings(passedSettings);
        $scope.handleProtectionData($scope.protectionData);
        $scope.player.setProtectionData($scope.protectionData);
    }

    $scope.parseBoolean = function (value) {
        return value === true || value === 'true';
    }

    /** Takes a string value extracted from the query-string and transforms it into the appropriate type */
    $scope.handleQueryParameters = function (value) {
        var typedValue;
        var integerRegEx = /^-?\d+$/;
        var floatRegEx = /^-?\d+.\d+$/;
        if (value === 'true' || value === 'false') {
            typedValue = this.parseBoolean(value);
        } else if (value === 'NaN') typedValue = NaN;
        else if (value === 'null') typedValue = null;
        else if (value === 'undefined') typedValue = undefined;
        else integerRegEx.test(value) ? typedValue = parseInt(value) :
                (floatRegEx.test(value) ? typedValue = parseFloat(value) :
                    typedValue = value);

        return typedValue;
    }

    $scope.checkQueryLength = function (string) {
        var maxUrlLength = 30000;
        if (window.document.documentMode) {
            maxUrlLength = 2083;
            //Alt: "Due to the low url character limit on IE, please use the config file method instead."
            //Alt2: If IE detected, copy settings-file content instead of creating a url, alert userto the change.
        }
        if (string.length > maxUrlLength) {
            alert('The length of the URL may exceed the Browser url character limit.')
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
            var playbackRate = 1.00
            if ($scope.isDynamic) {
                liveLatency = $scope.player.getCurrentLiveLatency();
                playbackRate = parseFloat($scope.player.getPlaybackRate().toFixed(2));
            }

            $scope[type + 'BufferLength'] = bufferLevel;
            $scope[type + 'MaxIndex'] = maxIndex;
            $scope[type + 'DroppedFrames'] = droppedFPS;
            $scope[type + 'LiveLatency'] = liveLatency;
            $scope[type + 'PlaybackRate'] = playbackRate;

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
                $scope.plotPoint('playbackRate', type, playbackRate, time);

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
        $scope.liveCatchupEnabled = currentConfig.streaming.liveCatchup.enabled;
        $scope.liveCatchupMode = currentConfig.streaming.liveCatchup.mode;
    }

    function setAbrRules() {
        var currentConfig = $scope.player.getSettings();
        $scope.additionalAbrRules.insufficientBufferRule = currentConfig.streaming.abr.additionalAbrRules.insufficientBufferRule;
        $scope.additionalAbrRules.switchHistoryRule = currentConfig.streaming.abr.additionalAbrRules.switchHistoryRule;
        $scope.additionalAbrRules.droppedFramesRule = currentConfig.streaming.abr.additionalAbrRules.droppedFramesRule;
        $scope.additionalAbrRules.abandonRequestsRule = currentConfig.streaming.abr.additionalAbrRules.abandonRequestsRule;
        $scope.ABRStrategy = currentConfig.streaming.abr.ABRStrategy;
        $scope.abrThroughputCalculationMode = currentConfig.streaming.abr.fetchThroughputCalculationMode;
    }

    function setAdditionalPlaybackOptions() {
        var currentConfig = $scope.player.getSettings();
        $scope.applyServiceDescription = currentConfig.streaming.applyServiceDescription;
        $scope.applyContentSteering = currentConfig.streaming.applyContentSteering;
        $scope.scheduleWhilePausedSelected = currentConfig.streaming.scheduling.scheduleWhilePaused;
        $scope.calcSegmentAvailabilityRangeFromTimelineSelected = currentConfig.streaming.timeShiftBuffer.calcFromSegmentTimeline;
        $scope.reuseExistingSourceBuffersSelected = currentConfig.streaming.buffer.reuseExistingSourceBuffers;
        $scope.localStorageSelected = currentConfig.streaming.lastBitrateCachingInfo.enabled;
        $scope.jumpGapsSelected = currentConfig.streaming.gaps.jumpGaps;
    }

    function setAdditionalAbrOptions() {
        var currentConfig = $scope.player.getSettings();
        $scope.fastSwitchSelected = currentConfig.streaming.buffer.fastSwitchEnabled;
        $scope.videoAutoSwitchSelected = currentConfig.streaming.abr.autoSwitchBitrate.video;
        $scope.customABRRulesSelected = !currentConfig.streaming.abr.useDefaultABRRules;
    }

    function setDrmOptions() {
        var currentConfig = $scope.player.getSettings();
        $scope.drmPlayready.priority = $scope.drmPlayready.priority.toString();
        $scope.drmWidevine.priority = $scope.drmWidevine.priority.toString();
        $scope.drmClearkey.priority = $scope.drmClearkey.priority.toString();
    }

    function setLiveDelayOptions() {
        var currentConfig = $scope.player.getSettings();
        $scope.initialLiveDelay = currentConfig.streaming.delay.liveDelay;
        $scope.liveDelayFragmentCount = currentConfig.streaming.delay.liveDelayFragmentCount;
        $scope.useSuggestedPresentationDelay = currentConfig.streaming.delay.useSuggestedPresentationDelay;
    }

    function setInitialSettings() {
        var currentConfig = $scope.player.getSettings();
        if (currentConfig.streaming.abr.initialBitrate.video !== -1) {
            $scope.initialVideoBitrate = currentConfig.streaming.abr.initialBitrate.video;
        }
        if (currentConfig.streaming.abr.minBitrate.video !== -1) {
            $scope.minVideoBitrate = currentConfig.streaming.abr.minBitrate.video;
        }
        if (currentConfig.streaming.abr.maxBitrate.video !== -1) {
            $scope.maxVideoBitrate = currentConfig.streaming.abr.maxBitrate.video;
        }

        if ($scope.player.getInitialMediaSettingsFor('audio')) {
            $scope.initialSettings.audio = $scope.player.getInitialMediaSettingsFor('audio').lang;
        }
        if ($scope.player.getInitialMediaSettingsFor('video')) {
            $scope.initialSettings.video = $scope.player.getInitialMediaSettingsFor('video').role;
        }
        if ($scope.player.getInitialMediaSettingsFor('text')) {
            $scope.initialSettings.text = $scope.player.getInitialMediaSettingsFor('text').lang;
        }
        if ($scope.player.getInitialMediaSettingsFor('text')) {
            $scope.initialSettings.textRole = $scope.player.getInitialMediaSettingsFor('text').role;
        }

        $scope.initialSettings.textEnabled = currentConfig.streaming.text.defaultEnabled;
    }

    function setTrackSwitchModeSettings() {
        currentConfig = $scope.player.getSettings();
        initAudioTrackSwitchMode = currentConfig.streaming.trackSwitchMode.audio;
        $scope.audioTrackSwitchMode = currentConfig.streaming.trackSwitchMode.audio;
        initVideoTrackSwitchMode = currentConfig.streaming.trackSwitchMode.video;
        $scope.videoTrackSwitchMode = currentConfig.streaming.trackSwitchMode.video;
    }

    function setInitialLogLevel() {
        var initialLogLevel = $scope.player.getSettings().debug.logLevel;
        switch (initialLogLevel) {
            case 0:
                $scope.currentLogLevel = 'none';
                break;
            case 1:
                $scope.currentLogLevel = 'fatal';
                break;
            case 2:
                $scope.currentLogLevel = 'error';
                break;
            case 3:
                $scope.currentLogLevel = 'warning';
                break;
            case 4:
                $scope.currentLogLevel = 'info';
                break;
            case 5:
                $scope.currentLogLevel = 'debug';
                break;
        }
    }

    function setCMCDSettings() {
        var currentConfig = $scope.player.getSettings();
        $scope.cmcdEnabled = currentConfig.streaming.cmcd.enabled;
        if (currentConfig.streaming.cmcd.sid) {
            $scope.cmcdSessionId = currentConfig.streaming.cmcd.sid;
        }
        if (currentConfig.streaming.cmcd.cid) {
            $scope.cmcdContentId = currentConfig.streaming.cmcd.cid;
        }
        if (currentConfig.streaming.cmcd.rtp) {
            $scope.cmcdRtp = currentConfig.streaming.cmcd.rtp;
        }
        if (currentConfig.streaming.cmcd.rtpSafetyFactor) {
            $scope.cmcdRtpSafetyFactor = currentConfig.streaming.cmcd.rtpSafetyFactor;
        }

        $scope.cmcdMode = currentConfig.streaming.cmcd.mode;

        if (currentConfig.streaming.cmcd.enabledKeys) {
            $scope.cmcdEnabledKeys = currentConfig.streaming.cmcd.enabledKeys;
        }
    }

    function getUrlVars() {
        var vars = {};
        window.location.href.replace(/[?&]+([^=&]+)=([^&]*)/gi, function (m, key, value) {
            vars[key] = value;
        });
        return vars;
    }


    (function init() {

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

            /** Fetch query string and pass it to handling function */
            var currentQuery = window.location.search;
            if (currentQuery !== '') {
                currentQuery = currentQuery.substring(1);
                $scope.checkQueryLength(window.location.href);
                $scope.setExternalSettings(currentQuery);
                $scope.setQueryData(currentQuery);
            }

            setLatencyAttributes();
            setAbrRules();
            setAdditionalPlaybackOptions();
            setAdditionalAbrOptions();
            setDrmOptions();
            setLiveDelayOptions();
            setInitialSettings();
            setTrackSwitchModeSettings();
            setInitialLogLevel();
            setCMCDSettings();

            checkLocationProtocol();

            var vars = getUrlVars();
            var item = {};

            if (vars && vars.hasOwnProperty('url')) {
                item.url = vars.url;
            }

            // if (vars && vars.hasOwnProperty('mpd')) {
            //     item.url = vars.mpd;
            // }

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
        }

        reqConfig.open('GET', 'dashjs_config.json', true);
        reqConfig.setRequestHeader('Content-type', 'application/json');
        reqConfig.send();

        $scope.initChartingByMediaType('video');
        $scope.initChartingByMediaType('audio');
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

    function checkLocationProtocol() {
        if (location.protocol === 'http:' && location.hostname !== 'localhost') {
            var out = 'This page has been loaded under http. This can result in the EME APIs not being available to the player and <b>any DRM-protected content will fail to play</b>. ' +
                'If you wish to test manifest URLs that require EME support, then <a href=\'https:' + window.location.href.substring(window.location.protocol.length) + '\'>reload this page under https</a>.'
            var divContainer = document.getElementById('http-warning-container');
            var spanText = document.getElementById('http-warning-text');
            spanText.innerHTML = out;
            divContainer.style.display = ''
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
