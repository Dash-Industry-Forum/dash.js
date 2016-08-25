'use strict';

angular.module('DashSourcesService', ['ngResource'])
    .factory('sources', function($resource){
        return $resource('app/sources.json', {}, {
            query: {method:'GET', isArray:false}
        });
    });

angular.module('DashContributorsService', ['ngResource'])
    .factory('contributors', function($resource){
        return $resource('app/contributors.json', {}, {
            query: {method:'GET', isArray:false}
        });
    });

var app = angular.module('DashPlayer', ['DashSourcesService', 'DashContributorsService']);
var lastUpdateTime = 0;

app.directive('chart', function() {
    return {
        restrict: 'E',
        link: function (scope, elem, attrs) {
            var chart = null,
                options = {
                    series: {
                        shadowSize: 0
                    },
                    yaxis: {
                        autoscaleMargin:1.5
                    },
                    xaxis: {

                    }
                };

            // If the data changes somehow, update it in the chart
            scope.$watch('bufferData', function(v) {
                if (v === null || v === undefined) {
                    return;
                }

                if (!chart) {
                    chart = $.plot(elem, v , options);
                    elem.show();
                }
                else {
                    chart.setData(v);
                    chart.setupGrid();
                    chart.draw();
                }
            });

            scope.$watch('invalidateChartDisplay', function(v) {
                if (v && chart) {
                    var data = scope[attrs.ngModel];
                    chart.setData(data);
                    chart.setupGrid();
                    chart.draw();
                    chart.resize();
                    scope.invalidateDisplay(false);

                }
            });
        }
    };
});

app.controller('DashController', function($scope, sources, contributors) {
    var player,
        controlbar,
        video,
        maxGraphPoints = 50;


    $scope.graphPoints = {video: [], audio: [], text: []},
    $scope.abrEnabled = true;
    $scope.toggleCCBubble = false;
    $scope.logbucket = [];
    $scope.debugEnabled = false;
    $scope.htmlLogging = false;
    $scope.videotoggle = false;
    $scope.audiotoggle = false;
    $scope.optionsGutter = false;
    $scope.drmData = [];
    $scope.initialSettings = {audio: null, video: null};
    $scope.mediaSettingsCacheEnabled = true;
    $scope.invalidateChartDisplay = false;
    $scope.showCharts = true;
    $scope.showBufferLevel = true;
    $scope.showDebug = false;

    $scope.toggleVideoMenu = function() {
        $scope.videotoggle = !$scope.videotoggle;
    }

    $scope.toggleAudioMenu = function() {
        $scope.audiotoggle = !$scope.audiotoggle;
    }

    // from: https://gist.github.com/siongui/4969449
    $scope.safeApply = function(fn) {
      var phase = this.$root.$$phase;
      if(phase == '$apply' || phase == '$digest')
        this.$eval(fn);
      else
        this.$apply(fn);
    };

    $scope.invalidateDisplay = function (value) {
        $scope.invalidateChartDisplay = value;
        $scope.safeApply();
    }

    $scope.setCharts = function (show) {
        $scope.showCharts = show;
    }

    $scope.setBufferLevelChart = function(show) {
        $scope.showBufferLevel = show;
    }

    $scope.setDebug = function (show) {
        $scope.showDebug = show;
    }

    ////////////////////////////////////////
    //
    // Player Setup
    //
    ////////////////////////////////////////

    video = document.querySelector(".dash-video-player video");
    player = dashjs.MediaPlayer().create();

    $scope.version = player.getVersion();

    player.initialize();
    player.attachView(video);
    player.attachVideoContainer(document.getElementById("videoContainer"));
    player.attachTTMLRenderingDiv(document.querySelector("#video-caption"));
    player.setAutoPlay(true);

    controlbar = new ControlBar(player);
    controlbar.initialize();
    controlbar.disable();


    ////////////////////////////////////////
    //
    // Page Setup
    //
    ////////////////////////////////////////

    sources.query(function (data) {
        $scope.availableTaxonomyStreams = data.items;
    });

    contributors.query(function (data) {
        $scope.contributors = data.items;
    });

    $scope.debugEnabledLabel = function() {
        if( $scope.debugEnabled ) {
            return "Disable";
        } else {
            return "Enable";
        }
    }

    $scope.chartEnabledLabel = function() {
        if( $scope.showBufferLevel ) {
            return "Disable";
        } else {
            return "Enable";
        }
    }

    $scope.initDebugConsole = function () {

        var debug;

        //console.log('XXX', $scope.logbucket);

        debug = player.getDebug();
        debug.setLogTimestampVisible(true);
        debug.setLogToBrowserConsole(true);

        var date            = new Date(),
            logStreamEpoch  = date.getTime();

        player.on(dashjs.MediaPlayer.events.LOG, function(event)
        {
            var currentTime = (new Date()).getTime() - logStreamEpoch,
                timestamp = '[' + currentTime + ']';

            if($scope.htmlLogging)
            {
                $scope.logbucket.push(timestamp + ' ' + event.message);
            }
        }, false);
    }

    $scope.shutdownDebugConsole = function() {
        debug.setLogTimestampVisible(false);
        debug.setLogToBrowserConsole(false);
    }

    $scope.setHtmlLogging = function(bool) {
        $scope.debugEnabled = bool;
        $scope.htmlLogging = bool;
        console.log('DEBUGGER LOG OBJECT', player.getDebug());
        console.log('html logging set to: ', bool);
    }

    $scope.clearHtmlLogging = function() {
        $scope.debugEnabled = false;
        $scope.htmlLogging = false;
        $scope.logbucket = [];
    }


    ////////////////////////////////////////
    //
    // Metrics
    //
    ////////////////////////////////////////
    $scope.metricsTimer = null;
    $scope.updateMetricsInterval = 500;

    $scope.videoBitrate = 0;
    $scope.videoIndex = 0;
    $scope.videoPendingIndex = 0;
    $scope.videoMaxIndex = 0;
    $scope.videoBufferLength = 0;
    $scope.videoDroppedFrames = 0;
    $scope.videoLatencyCount = 0;
    $scope.videoLatency = "";
    $scope.videoDownloadCount = 0;
    $scope.videoDownload = "";
    $scope.videoRatioCount = 0;
    $scope.videoRatio = "";

    $scope.audioBitrate = 0;
    $scope.audioIndex = 0;
    $scope.audioPendingIndex = "";
    $scope.audioMaxIndex = 0;
    $scope.audioBufferLength = 0;
    $scope.audioDroppedFrames = 0;
    $scope.audioLatencyCount = 0;
    $scope.audioLatency = "";
    $scope.audioDownloadCount = 0;
    $scope.audioDownload = "";
    $scope.audioRatioCount = 0;
    $scope.audioRatio = "";


    function calculateHTTPMetrics(type, requests) {

        var latency = {},
            download = {},
            ratio = {};

        var requestWindow = requests.slice(-20).filter(function (req) {
            return req.responsecode >= 200 && req.responsecode < 300 && req.type === "MediaSegment" && req._stream === type && !!req._mediaduration;
        }).slice(-4);

        if (requestWindow.length > 0) {

            var latencyTimes = requestWindow.map(function (req){ return Math.abs(req.tresponse.getTime() - req.trequest.getTime()) / 1000;});

            latency[type] = {
                average: latencyTimes.reduce(function(l, r) {return l + r;}) / latencyTimes.length,
                high: latencyTimes.reduce(function(l, r) {return l < r ? r : l;}),
                low: latencyTimes.reduce(function(l, r) {return l < r ? l : r;}),
                count: latencyTimes.length
            };

            var downloadTimes = requestWindow.map(function (req){return Math.abs(req._tfinish.getTime() - req.tresponse.getTime()) / 1000;});

            download[type] = {
                average: downloadTimes.reduce(function(l, r) {return l + r;}) / downloadTimes.length,
                high: downloadTimes.reduce(function(l, r) {return l < r ? r : l;}),
                low: downloadTimes.reduce(function(l, r) {return l < r ? l : r;}),
                count: downloadTimes.length
            };

            var durationTimes = requestWindow.map(function (req){ return req._mediaduration;});

            ratio[type] = {
                average: (durationTimes.reduce(function(l, r) {return l + r;}) / downloadTimes.length) / download[type].average,
                high: durationTimes.reduce(function(l, r) {return l < r ? r : l;}) / download[type].low,
                low: durationTimes.reduce(function(l, r) {return l < r ? l : r;}) / download[type].high,
                count: durationTimes.length
            };

            return {latency: latency, download: download, ratio: ratio}

        }
        return null;
    };

    function updateMetrics(type) {

        var metrics = player.getMetricsFor(type);
        var dashMetrics = player.getDashMetrics();

        if (metrics && dashMetrics && $scope.streamInfo) {

            var periodIdx = $scope.streamInfo.index;
            var repSwitch = dashMetrics.getCurrentRepresentationSwitch(metrics);
            var bufferLevel = dashMetrics.getCurrentBufferLevel(metrics);

            $scope[type + "BufferLength"] = bufferLevel;
            $scope[type + "MaxIndex"] = dashMetrics.getMaxIndexForBufferType(type, periodIdx) - 1;
            $scope[type + "Bitrate"] = Math.round(dashMetrics.getBandwidthForRepresentation(repSwitch.to, periodIdx) / 1000);
            $scope[type + "DroppedFrames"] = dashMetrics.getCurrentDroppedFrames(metrics) ? dashMetrics.getCurrentDroppedFrames(metrics).droppedFrames : 0;

            var httpMetrics = calculateHTTPMetrics(type, dashMetrics.getHttpRequests(metrics));
            if (httpMetrics) {
                $scope[type + "Download"] = httpMetrics.download[type].low.toFixed(3) + " | " + httpMetrics.download[type].average.toFixed(3) + " | " + httpMetrics.download[type].high.toFixed(3);
                $scope[type + "Latency"] = httpMetrics.latency[type].low.toFixed(3) + " | " + httpMetrics.latency[type].average.toFixed(3) + " | " + httpMetrics.latency[type].high.toFixed(3);
                $scope[type + "Ratio"] = httpMetrics.ratio[type].low.toFixed(3) + " | " + httpMetrics.ratio[type].average.toFixed(3) + " | " + httpMetrics.ratio[type].high.toFixed(3);
            }


            var point = [parseFloat(video.currentTime), Math.round(parseFloat(bufferLevel))];
            $scope.graphPoints[type].push(point);
            if ($scope.graphPoints[type].length > maxGraphPoints) {
                $scope.graphPoints[type].splice(0, 1);
            }

        }

        $scope.invalidateDisplay(true);
    }

    ////////////////////////////////////////
    //
    // Player Events
    //
    ////////////////////////////////////////

    player.on(dashjs.MediaPlayer.events.ERROR, function (e) {}, $scope);

    player.on(dashjs.MediaPlayer.events.QUALITY_CHANGE_REQUESTED, function (e) {
        $scope[e.mediaType + "Index"] = e.oldQuality;
        $scope[e.mediaType+ "PendingIndex"] = e.newQuality;
    }, $scope);

    player.on(dashjs.MediaPlayer.events.QUALITY_CHANGE_RENDERED, function (e) {
        $scope[e.mediaType + "Index"] = e.newQuality;
        $scope[e.mediaType + "PendingIndex"] = e.newQuality;
    }, $scope);

    player.on(dashjs.MediaPlayer.events.PERIOD_SWITCH_COMPLETED, function (e) {
        $scope.streamInfo = e.toStreamInfo;
    }, $scope);

    player.on(dashjs.MediaPlayer.events.STREAM_INITIALIZED, function (e) {
        var availableTracks = {};
        availableTracks.audio = player.getTracksFor("audio");
        availableTracks.video = player.getTracksFor("video");
        $scope.availableTracks = availableTracks;
        $scope.metricsTimer = setInterval(function () {
            updateMetrics("video");
            updateMetrics("audio");
            updateMetrics("text");
        }, $scope.updateMetricsInterval)

    }, $scope);

    player.on(dashjs.MediaPlayer.events.PLAYBACK_ENDED, function onStreamComplete(e) {
        if ($('#loopCB').is(':checked')) {
            $scope.doLoad();
        }
    }, $scope);

    ////////////////////////////////////////
    //
    // DRM Events
    //
    ////////////////////////////////////////

    // Listen for protection system creation/destruction by the player itself.  This will
    // only happen in the case where we do not not provide a ProtectionController
    // to the player via dashjs.MediaPlayer.attachSource()

    player.on(dashjs.MediaPlayer.events.PROTECTION_CREATED, function (e) {
        var data = addDRMData(e.manifest, e.controller);
        data.isPlaying = true;
        for (var i = 0; i < $scope.drmData.length; i++) {
            if ($scope.drmData[i] !== data) {
                $scope.drmData[i].isPlaying = false;
            }
        }
        $scope.safeApply();
    }, $scope);
    player.on(dashjs.MediaPlayer.events.PROTECTION_DESTROYED, function (e) {
        for (var i = 0; i < $scope.drmData.length; i++) {
            if ($scope.drmData[i].manifest.url === e.data) {
                $scope.drmData.splice(i, 1);
                break;
            }
        }
        $scope.safeApply();
    }, $scope);

    
    var addDRMData = function(manifest, protCtrl) {

        // Assign the session type to be used for this controller
        protCtrl.setSessionType($("#session-type").find(".active").children().attr("id"));

        var data = {
            manifest: manifest,
            protCtrl: protCtrl,
            licenseReceived: false,
            sessions: []
        };
        var findSession = function(sessionID) {
            for (var i = 0; i < data.sessions.length; i++) {
                if (data.sessions[i].sessionID === sessionID)
                    return data.sessions[i];
            }
            return null;
        };
        $scope.drmData.push(data);
        $scope.safeApply();

        player.on(dashjs.MediaPlayer.events.KEY_SYSTEM_SELECTED, function(e) {
            if (!e.error) {
                data.ksconfig = e.data.ksConfiguration;
            } else {
                data.error = e.error;
            }
            $scope.safeApply();
        }, $scope);


        player.on(dashjs.MediaPlayer.events.KEY_SESSION_CREATED, function(e) {
            if (!e.error) {
                var persistedSession = findSession(e.data.getSessionID());
                if (persistedSession) {
                    persistedSession.isLoaded = true;
                    persistedSession.sessionToken = e.data;
                } else {
                    var sessionToken = e.data;
                    data.sessions.push({
                        sessionToken: sessionToken,
                        sessionID: e.data.getSessionID(),
                        isLoaded: true
                    });
                }
            } else {
                data.error = e.error;
            }
            $scope.safeApply();
        }, $scope);


        player.on(dashjs.MediaPlayer.events.KEY_SESSION_REMOVED, function(e) {
            if (!e.error) {
                var session = findSession(e.data);
                if (session) {
                    session.isLoaded = false;
                    session.sessionToken = null;
                }
            } else {
                data.error = e.error;
            }
            $scope.safeApply();
        }, $scope);


        player.on(dashjs.MediaPlayer.events.KEY_SESSION_CLOSED, function(e) {
            if (!e.error) {
                for (var i = 0; i < data.sessions.length; i++) {
                    if (data.sessions[i].sessionID === e.data) {
                        data.sessions.splice(i, 1);
                        break;
                    }
                }
            } else {
                data.error = e.error;
            }
            $scope.safeApply();
        }, $scope);

        player.on(dashjs.MediaPlayer.events.KEY_STATUSES_CHANGED, function(e) {
            var session = findSession(e.data.getSessionID());
            if (session) {
                var toGUID = function(uakey) {
                    var keyIdx = 0, retVal = "", i, zeroPad = function(str) {
                        return (str.length === 1) ? "0" + str : str;
                    };
                    for (i = 0; i < 4; i++, keyIdx++)
                        retVal += zeroPad(uakey[keyIdx].toString(16));
                    retVal += "-";
                    for (i = 0; i < 2; i++, keyIdx++)
                        retVal += zeroPad(uakey[keyIdx].toString(16));
                    retVal += "-";
                    for (i = 0; i < 2; i++, keyIdx++)
                        retVal += zeroPad(uakey[keyIdx].toString(16));
                    retVal += "-";
                    for (i = 0; i < 2; i++, keyIdx++)
                        retVal += zeroPad(uakey[keyIdx].toString(16));
                    retVal += "-";
                    for (i = 0; i < 6; i++, keyIdx++)
                        retVal += zeroPad(uakey[keyIdx].toString(16));
                    return retVal;
                };
                session.keystatus = [];
                e.data.getKeyStatuses().forEach(function(status, key){
                    session.keystatus.push({
                        key: toGUID(new Uint8Array(key)),
                        status: status
                    });
                });
                $scope.safeApply();
            }
        }, $scope);

        player.on(dashjs.MediaPlayer.events.KEY_MESSAGE, function(e) {
            var session = findSession(e.data.sessionToken.getSessionID());
            if (session) {
                session.lastMessage = "Last Message: " + e.data.message.byteLength + " bytes";
                if (e.data.messageType) {
                    session.lastMessage += " (" + e.data.messageType + "). ";
                } else {
                    session.lastMessage += ". ";
                }
                session.lastMessage += "Waiting for response from license server...";
                $scope.safeApply();
            }
        }, $scope);

        player.on(dashjs.MediaPlayer.events.LICENSE_REQUEST_COMPLETE, function(e) {
            if (!e.error) {
                var session = findSession(e.data.sessionToken.getSessionID());
                if (session) {
                    session.lastMessage = "Successful response received from license server for message type '" + e.data.messageType + "'!";
                    data.licenseReceived = true;
                }
            } else {
                data.error = "License request failed for message type '" + e.data.messageType + "'! " + e.error;
            }
            $scope.safeApply();
        }, $scope);

        return data;
    };

    $scope.delete = function(data) {
        for (var i = 0; i < $scope.drmData.length; i++) {
            if ($scope.drmData[i] === data) {
                $scope.drmData.splice(i,1);
                data.protCtrl.reset();
                $scope.safeApply();
            }
        }
    };

    ////////////////////////////////////////
    //
    // General Player Methods
    //
    ////////////////////////////////////////

    $scope.setAbrEnabled = function (enabled) {
        $scope.abrEnabled = enabled;
        player.setAutoSwitchQuality(enabled);
    }

    $scope.abrUp = function (type) {
        var newQuality,
            metricsExt = player.getDashMetrics(),
            max = metricsExt.getMaxIndexForBufferType(type, $scope.streamInfo.index);

        newQuality = player.getQualityFor(type) + 1;
        // zero based
        if (newQuality >= max) {
            newQuality = max - 1;
        }
        player.setQualityFor(type, newQuality);
    }

    $scope.abrDown = function (type) {
        var newQuality = player.getQualityFor(type) - 1;
        if (newQuality < 0) {
            newQuality = 0;
        }
        player.setQualityFor(type, newQuality);
    }

    $scope.play = function (data) {
        player.attachSource(data.manifest, data.protCtrl);
        for (var i = 0; i < $scope.drmData.length; i++) {
            var drmData = $scope.drmData[i];
            drmData.isPlaying = !!(drmData === data);
        }
    };

    $scope.doLicenseFetch = function () {
        player.retrieveManifest($scope.selectedItem.url, function (manifest) {
            if (manifest) {
                var found = false;
                for (var i = 0; i < $scope.drmData.length; i++) {
                    if (manifest.url === $scope.drmData[i].manifest.url) {
                        found = true;
                        break;
                    }
                }
                if (!found) {
                    var protCtrl = player.getProtectionController();
                    if ($scope.selectedItem.hasOwnProperty("protData")) {
                        protCtrl.setProtectionData($scope.selectedItem.protData);
                    }
                    addDRMData(manifest, protCtrl);
                    protCtrl.initialize(manifest);
                }
            } else {
                // Log error here
            }
        });
    };

    $scope.setStream = function (item) {
        $scope.selectedItem = item;
    }

    $scope.toggleOptionsGutter = function (bool) {
        $scope.optionsGutter = bool;
    }

    $scope.doLoad = function () {

        clearInterval($scope.metricsTimer);
        $scope.graphPoints = {video: [], audio: [], text: []};
        $scope.bufferData = [
            {
                data: $scope.graphPoints.video,
                label: "Video",
                color: "#2980B9"
            },
            {
                data: $scope.graphPoints.audio,
                label: "Audio",
                color: "#E74C3C"
            },
            {
                data: $scope.graphPoints.text,
                label: "Text",
                color: "#888"
            }
        ];


        var protData = null;
        if ($scope.selectedItem.hasOwnProperty("protData")) {
            protData = $scope.selectedItem.protData;
        }

        player.attachSource($scope.selectedItem.url, null, protData);
        player.setAutoSwitchQuality($scope.abrEnabled);
        controlbar.reset();
        controlbar.enable();

        if ($scope.initialSettings.audio) {
            player.setInitialMediaSettingsFor("audio", {lang: $scope.initialSettings.audio});
        }
        if ($scope.initialSettings.video) {
            player.setInitialMediaSettingsFor("video", {role: $scope.initialSettings.video});
        }

        $scope.manifestUpdateInfo = null;

        // initDebugConsole();
    }

    $scope.switchTrack = function(track, type) {
        if (!track || (track === player.getCurrentTrackFor(type))) return;

        player.setCurrentTrack(track);
    }

    $scope.changeTrackSwitchMode = function(mode, type) {
        player.setTrackSwitchModeFor(type, mode);
    }


    $scope.setMediaSettingsCacheEnabled = function(enabled) {
        $scope.mediaSettingsCacheEnabled = enabled;
        player.enableLastMediaSettingsCaching(enabled);
    }

    $scope.hasLogo = function (item) {
        return (item.hasOwnProperty("logo") && item.logo !== null && item.logo !== undefined && item.logo !== "");
    }


    function getUrlVars() {
        var vars = {};
        var parts = window.location.href.replace(/[?&]+([^=&]+)=([^&]*)/gi, function (m, key, value) {
            vars[key] = value;
        });
        return vars;
    }

    var vars = getUrlVars();
	var paramUrl = null;

    if (vars && vars.hasOwnProperty("url")) {
    	paramUrl = vars.url;
    }

    if (vars && vars.hasOwnProperty("mpd")) {
    	paramUrl = vars.mpd;
    }

    if (paramUrl !== null) {
    	var startPlayback = true;
    
    	$scope.selectedItem = {};
        $scope.selectedItem.url = paramUrl;

        if (vars.hasOwnProperty("autoplay")) {
        	startPlayback = (vars.autoplay === 'true');
        }

    	if (startPlayback) {
	    	$scope.doLoad();
		}
    }
});
