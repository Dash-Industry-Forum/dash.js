'use strict';

$(document).ready(function () {
    $('[data-toggle="tooltip"]').tooltip();
});

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

app.directive('chart', function() {
    return {
        restrict: 'E',
        link: function ($scope, elem, attrs) {

            if (!$scope.chart) {

                $scope.options = {
                    legend: {
                        noColumns: 3,
                        placement: 'outsideGrid',
                        container: $('#legend-wrapper')
                        //labelFormatter: function(label, series) {
                        //    return '<a href="#" ng-click="onChartLegendClick">'+label+'</a>';
                        //}
                    },
                    series: { shadowSize: 3 },
                    xaxis: {
                        show: true,
                        tickDecimals:0
                    },
                    yaxis: {
                        show: true,
                        ticks: 5,
                        position: 'right',
                        min:0,
                        tickDecimals:0
                    },
                };

                $scope.chart = $.plot(elem, [], $scope.options);
                $scope.invalidateDisplay(true);
            }

            $scope.chartLegendClick = function(label) {
                alert(label)
            }

            $scope.$watch('invalidateChartDisplay', function(v) {
                if (v && $scope.chart) {
                    var data = $scope[attrs.ngModel];
                    $scope.chart.setData(data);
                    $scope.drawChart = true;
                    $scope.invalidateDisplay(false);
                }
            });

            $scope.$watch('drawChart', function (v) {
                if (v && $scope.chart) {
                    $scope.chart.setupGrid();
                    $scope.chart.draw();
                    $scope.drawChart = false;
                }
            });

            $(window).resize(function () {
                $scope.chart.resize();
                $scope.drawChart = true;
                $scope.safeApply();
            });
        }
    };
});

app.controller('DashController', function($scope, sources, contributors) {

    $scope.selectedItem = {url:"http://dash.edgesuite.net/akamai/bbb_30fps/bbb_30fps.mpd"};
    $scope.abrEnabled = true;
    $scope.toggleCCBubble = false;
    $scope.debugEnabled = false;
    $scope.htmlLogging = false;
    $scope.videotoggle = false;
    $scope.audiotoggle = false;
    $scope.optionsGutter = false;
    $scope.drmData = [];
    $scope.initialSettings = {audio: null, video: null};
    $scope.mediaSettingsCacheEnabled = true;
    $scope.invalidateChartDisplay = false;
    $scope.chartEnabled = true;
    $scope.metricsTimer = null;
    $scope.maxGraphPoints = 50;
    $scope.updateMetricsInterval = 1000;
    $scope.audioGraphColor = "#E74C3C"
    $scope.videoGraphColor = "#2980B9"
    //metrics
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

    ////////////////////////////////////////
    //
    // Player Setup
    //
    ////////////////////////////////////////

    $scope.video = document.querySelector(".dash-video-player video");
    $scope.player = dashjs.MediaPlayer().create();
    $scope.player.initialize($scope.video, null, true);
    $scope.player.setFastSwitchEnabled(true);
    $scope.player.attachVideoContainer(document.getElementById("videoContainer"));
    // Add HTML-rendered TTML subtitles except for Firefox (issue #1164)
    if (typeof navigator !== 'undefined' && !navigator.userAgent.match(/Firefox/)) {
        $scope.player.attachTTMLRenderingDiv($("#video-caption")[0]);
    }

    $scope.controlbar = new ControlBar($scope.player);
    $scope.controlbar.initialize();
    $scope.controlbar.disable();

    ////////////////////////////////////////
    //
    // Page Setup
    //
    ////////////////////////////////////////
    $scope.version = $scope.player.getVersion();

    sources.query(function (data) {
        $scope.availableStreams = data.items;
    });

    contributors.query(function (data) {
        $scope.contributors = data.items;
    });
    ////////////////////////////////////////
    //
    // Player Events
    //
    ////////////////////////////////////////

    $scope.player.on(dashjs.MediaPlayer.events.ERROR, function (e) {}, $scope);

    $scope.player.on(dashjs.MediaPlayer.events.QUALITY_CHANGE_REQUESTED, function (e) {
        $scope[e.mediaType + "Index"] = e.oldQuality + 1 ;
        $scope[e.mediaType+ "PendingIndex"] = e.newQuality + 1;
    }, $scope);

    $scope.player.on(dashjs.MediaPlayer.events.QUALITY_CHANGE_RENDERED, function (e) {
        $scope[e.mediaType + "Index"] = e.newQuality + 1;
        $scope[e.mediaType + "PendingIndex"] = e.newQuality + 1;
    }, $scope);

    $scope.player.on(dashjs.MediaPlayer.events.PERIOD_SWITCH_COMPLETED, function (e) {
        $scope.streamInfo = e.toStreamInfo;
    }, $scope);

    $scope.player.on(dashjs.MediaPlayer.events.STREAM_INITIALIZED, function (e) {
        clearInterval($scope.metricsTimer);
        $scope.metricsTimer = setInterval(function () {
            updateMetrics("video");
            updateMetrics("audio");
            //updateMetrics("text");
        }, $scope.updateMetricsInterval)
    }, $scope);

    $scope.player.on(dashjs.MediaPlayer.events.PLAYBACK_ENDED, function(e) {
        if ($('#loop-cb').is(':checked') &&
            $scope.player.getActiveStream().getStreamInfo().isLast) {
            $scope.doLoad();
        }
    }, $scope);

    ////////////////////////////////////////
    //
    // DRM Events  //TODO Implement what is in eme-main and eme-index into this $scope.player to unify.  Add dialog in tab section for DRM license info.  Reinstate the DRM Options panel
    //
    ////////////////////////////////////////

    // Listen for protection system creation/destruction by the $scope.player itself.  This will
    // only happen in the case where we do not not provide a ProtectionController
    // to the $scope.player via dashjs.MediaPlayer.attachSource()

    //$scope.player.on(dashjs.MediaPlayer.events.PROTECTION_CREATED, function (e) {
    //    var data = addDRMData(e.manifest, e.controller);
    //    data.isPlaying = true;
    //    for (var i = 0; i < $scope.drmData.length; i++) {
    //        if ($scope.drmData[i] !== data) {
    //            $scope.drmData[i].isPlaying = false;
    //        }
    //    }
    //    $scope.safeApply();
    //}, $scope);
    //
    //$scope.player.on(dashjs.MediaPlayer.events.PROTECTION_DESTROYED, function (e) {
    //    for (var i = 0; i < $scope.drmData.length; i++) {
    //        if ($scope.drmData[i].manifest.url === e.data) {
    //            $scope.drmData.splice(i, 1);
    //            break;
    //        }
    //    }
    //    $scope.safeApply();
    //}, $scope);


    //var addDRMData = function(manifest, protCtrl) {
    //
    //    // Assign the session type to be used for this controller
    //    protCtrl.setSessionType($("#session-type").find(".active").children().attr("id"));
    //
    //    var data = {
    //        manifest: manifest,
    //        protCtrl: protCtrl,
    //        licenseReceived: false,
    //        sessions: []
    //    };
    //    var findSession = function(sessionID) {
    //        for (var i = 0; i < data.sessions.length; i++) {
    //            if (data.sessions[i].sessionID === sessionID)
    //                return data.sessions[i];
    //        }
    //        return null;
    //    };
    //    $scope.drmData.push(data);
    //    $scope.safeApply();
    //
    //    $scope.player.on(dashjs.MediaPlayer.events.KEY_SYSTEM_SELECTED, function(e) {
    //        if (!e.error) {
    //            data.ksconfig = e.data.ksConfiguration;
    //        } else {
    //            data.error = e.error;
    //        }
    //        $scope.safeApply();
    //    }, $scope);
    //
    //
    //    $scope.player.on(dashjs.MediaPlayer.events.KEY_SESSION_CREATED, function(e) {
    //        if (!e.error) {
    //            var persistedSession = findSession(e.data.getSessionID());
    //            if (persistedSession) {
    //                persistedSession.isLoaded = true;
    //                persistedSession.sessionToken = e.data;
    //            } else {
    //                var sessionToken = e.data;
    //                data.sessions.push({
    //                    sessionToken: sessionToken,
    //                    sessionID: e.data.getSessionID(),
    //                    isLoaded: true
    //                });
    //            }
    //        } else {
    //            data.error = e.error;
    //        }
    //        $scope.safeApply();
    //    }, $scope);
    //
    //
    //    $scope.player.on(dashjs.MediaPlayer.events.KEY_SESSION_REMOVED, function(e) {
    //        if (!e.error) {
    //            var session = findSession(e.data);
    //            if (session) {
    //                session.isLoaded = false;
    //                session.sessionToken = null;
    //            }
    //        } else {
    //            data.error = e.error;
    //        }
    //        $scope.safeApply();
    //    }, $scope);
    //
    //
    //    $scope.player.on(dashjs.MediaPlayer.events.KEY_SESSION_CLOSED, function(e) {
    //        if (!e.error) {
    //            for (var i = 0; i < data.sessions.length; i++) {
    //                if (data.sessions[i].sessionID === e.data) {
    //                    data.sessions.splice(i, 1);
    //                    break;
    //                }
    //            }
    //        } else {
    //            data.error = e.error;
    //        }
    //        $scope.safeApply();
    //    }, $scope);
    //
    //    $scope.player.on(dashjs.MediaPlayer.events.KEY_STATUSES_CHANGED, function(e) {
    //        var session = findSession(e.data.getSessionID());
    //        if (session) {
    //            var toGUID = function(uakey) {
    //                var keyIdx = 0, retVal = "", i, zeroPad = function(str) {
    //                    return (str.length === 1) ? "0" + str : str;
    //                };
    //                for (i = 0; i < 4; i++, keyIdx++)
    //                    retVal += zeroPad(uakey[keyIdx].toString(16));
    //                retVal += "-";
    //                for (i = 0; i < 2; i++, keyIdx++)
    //                    retVal += zeroPad(uakey[keyIdx].toString(16));
    //                retVal += "-";
    //                for (i = 0; i < 2; i++, keyIdx++)
    //                    retVal += zeroPad(uakey[keyIdx].toString(16));
    //                retVal += "-";
    //                for (i = 0; i < 2; i++, keyIdx++)
    //                    retVal += zeroPad(uakey[keyIdx].toString(16));
    //                retVal += "-";
    //                for (i = 0; i < 6; i++, keyIdx++)
    //                    retVal += zeroPad(uakey[keyIdx].toString(16));
    //                return retVal;
    //            };
    //            session.keystatus = [];
    //            e.data.getKeyStatuses().forEach(function(status, key){
    //                session.keystatus.push({
    //                    key: toGUID(new Uint8Array(key)),
    //                    status: status
    //                });
    //            });
    //            $scope.safeApply();
    //        }
    //    }, $scope);
    //
    //    $scope.player.on(dashjs.MediaPlayer.events.KEY_MESSAGE, function(e) {
    //        var session = findSession(e.data.sessionToken.getSessionID());
    //        if (session) {
    //            session.lastMessage = "Last Message: " + e.data.message.byteLength + " bytes";
    //            if (e.data.messageType) {
    //                session.lastMessage += " (" + e.data.messageType + "). ";
    //            } else {
    //                session.lastMessage += ". ";
    //            }
    //            session.lastMessage += "Waiting for response from license server...";
    //            $scope.safeApply();
    //        }
    //    }, $scope);
    //
    //    $scope.player.on(dashjs.MediaPlayer.events.LICENSE_REQUEST_COMPLETE, function(e) {
    //        if (!e.error) {
    //            var session = findSession(e.data.sessionToken.getSessionID());
    //            if (session) {
    //                session.lastMessage = "Successful response received from license server for message type '" + e.data.messageType + "'!";
    //                data.licenseReceived = true;
    //            }
    //        } else {
    //            data.error = "License request failed for message type '" + e.data.messageType + "'! " + e.error;
    //        }
    //        $scope.safeApply();
    //    }, $scope);
    //
    //    return data;
    //};
    //
    //$scope.delete = function(data) {
    //    for (var i = 0; i < $scope.drmData.length; i++) {
    //        if ($scope.drmData[i] === data) {
    //            $scope.drmData.splice(i,1);
    //            data.protCtrl.reset();
    //            $scope.safeApply();
    //        }
    //    }
    //};

    //$scope.play = function (data) {
    //    $scope.player.attachSource(data.manifest, data.protCtrl);
    //    for (var i = 0; i < $scope.drmData.length; i++) {
    //        var drmData = $scope.drmData[i];
    //        drmData.isPlaying = !!(drmData === data);
    //    }
    //};

    //$scope.doLicenseFetch = function () {
    //    $scope.player.retrieveManifest($scope.selectedItem.url, function (manifest) {
    //        if (manifest) {
    //            var found = false;
    //            for (var i = 0; i < $scope.drmData.length; i++) {
    //                if (manifest.url === $scope.drmData[i].manifest.url) {
    //                    found = true;
    //                    break;
    //                }
    //            }
    //            if (!found) {
    //                var protCtrl = $scope.player.getProtectionController();
    //                if ($scope.selectedItem.hasOwnProperty("protData")) {
    //                    protCtrl.setProtectionData($scope.selectedItem.protData);
    //                }
    //                addDRMData(manifest, protCtrl);
    //                protCtrl.initialize(manifest);
    //            }
    //        } else {
    //            // Log error here
    //        }
    //    });
    //};

    ////////////////////////////////////////
    //
    // General Player Methods
    //
    ////////////////////////////////////////

    $scope.toggleAutoPlay = function () {
        $scope.player.setAutoPlay($scope.autoPlaySelected);
    }

    $scope.toggleBufferOccupancyABR = function () {
        $scope.player.enableBufferOccupancyABR($scope.bolaSelected);
    }

    $scope.toggleFastSwitch = function () {
        $scope.player.setFastSwitchEnabled($scope.fastSwitchSelected);
    }

    $scope.toggleLocalStorage = function () {
        $scope.player.enableLastBitrateCaching($scope.localStorageSelected);
        $scope.player.enableLastMediaSettingsCaching($scope.localStorageSelected);
    }

    $scope.setStream = function (item) {
        $scope.selectedItem = item;
    }

    $scope.toggleOptionsGutter = function (bool) {
        $scope.optionsGutter = bool;
    }

    $scope.doLoad = function () {

        var protData = null;
        if ($scope.selectedItem.hasOwnProperty("protData")) {
            protData = $scope.selectedItem.protData;
        }



        $scope.setChartInfo();

        $scope.controlbar.reset();
        $scope.player.setProtectionData(protData);
        $scope.player.attachSource($scope.selectedItem.url);
        if ($scope.initialSettings.audio) {
            $scope.player.setInitialMediaSettingsFor("audio", {lang: $scope.initialSettings.audio});
        }
        if ($scope.initialSettings.video) {
            $scope.player.setInitialMediaSettingsFor("video", {role: $scope.initialSettings.video});
        }
        $scope.controlbar.enable();
    }

    $scope.changeTrackSwitchMode = function(mode, type) {
        $scope.player.setTrackSwitchModeFor(type, mode);
    }

    $scope.hasLogo = function (item) {
        return (item.hasOwnProperty("logo") && item.logo !== null && item.logo !== undefined && item.logo !== "");
    }

    $scope.getChartButtonLabel = function () {
        return $scope.chartEnabled ? "Disable" : "Enable";
    }

    $scope.getOptionsButtonLabel = function () {
        return $scope.optionsGutter ? "Hide Options" : "Show Options";
    }

    // from: https://gist.github.com/siongui/4969449
    $scope.safeApply = function (fn) {
        var phase = this.$root.$$phase;
        if (phase == '$apply' || phase == '$digest')
            this.$eval(fn);
        else
            this.$apply(fn);
    };

    $scope.invalidateDisplay = function (value) {
        $scope.invalidateChartDisplay = value;
        $scope.safeApply();
    }

    $scope.setChartInfo = function () {
        $scope.sessionStartTime = new Date().getTime()/1000;

        clearInterval($scope.metricsTimer);
        $scope.graphPoints = {video: [], audio: [], text: []};
        $scope.chartData = [
            {
                data: $scope.graphPoints.video,
                label: "Video Buffer Level",
                color: $scope.videoGraphColor,
            },
            {
                data: $scope.graphPoints.audio,
                label: "Audio Buffer Level",
                color: $scope.audioGraphColor,
            }
            //,
            //{
            //    data: $scope.graphPoints.text,
            //    label: "Text",
            //    color: "#888"
            //}
        ];
    }

    ////////////////////////////////////////
    //
    // Metrics
    //
    ////////////////////////////////////////
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

        var metrics = $scope.player.getMetricsFor(type);
        var dashMetrics = $scope.player.getDashMetrics();

        if (metrics && dashMetrics && $scope.streamInfo) {

            var periodIdx = $scope.streamInfo.index;
            var repSwitch = dashMetrics.getCurrentRepresentationSwitch(metrics);
            var bufferLevel = dashMetrics.getCurrentBufferLevel(metrics);

            $scope[type + "BufferLength"] = bufferLevel;
            $scope[type + "MaxIndex"] = dashMetrics.getMaxIndexForBufferType(type, periodIdx);
            $scope[type + "Bitrate"] = Math.round(dashMetrics.getBandwidthForRepresentation(repSwitch.to, periodIdx) / 1000);
            $scope[type + "DroppedFrames"] = dashMetrics.getCurrentDroppedFrames(metrics) ? dashMetrics.getCurrentDroppedFrames(metrics).droppedFrames : 0;

            var httpMetrics = calculateHTTPMetrics(type, dashMetrics.getHttpRequests(metrics));
            if (httpMetrics) {
                $scope[type + "Download"] = httpMetrics.download[type].low.toFixed(2) + " | " + httpMetrics.download[type].average.toFixed(2) + " | " + httpMetrics.download[type].high.toFixed(2);
                $scope[type + "Latency"] = httpMetrics.latency[type].low.toFixed(2) + " | " + httpMetrics.latency[type].average.toFixed(2) + " | " + httpMetrics.latency[type].high.toFixed(2);
                $scope[type + "Ratio"] = httpMetrics.ratio[type].low.toFixed(2) + " | " + httpMetrics.ratio[type].average.toFixed(2) + " | " + httpMetrics.ratio[type].high.toFixed(2);
            }

            if ($scope.chartEnabled) {
                var chartTime = (new Date().getTime() / 1000 ) -  $scope.sessionStartTime;
                var point = [parseInt(chartTime).toFixed(1), Math.round(parseFloat(bufferLevel))];
                $scope.graphPoints[type].push(point);
                if ($scope.graphPoints[type].length > $scope.maxGraphPoints) {
                    $scope.graphPoints[type].splice(0, 1);
                }
            }
        }

        $scope.invalidateDisplay(true);
    }


    ////////////////////////////////////////
    //
    // Init
    //
    ////////////////////////////////////////
    (function init() {
        $scope.setChartInfo();
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

        if (vars && vars.hasOwnProperty("source")) {
            paramUrl = vars.source;
        }

        if (paramUrl !== null) {
            var startPlayback = false;

            $scope.selectedItem = {};
            $scope.selectedItem.url = paramUrl;

            if (vars.hasOwnProperty("autoplay")) {
                startPlayback = (vars.autoplay === 'true');
            }

            if (startPlayback) {
                $scope.doLoad();
            }
        }
    })();
});
