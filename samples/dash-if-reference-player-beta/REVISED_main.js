'use strict';

angular.module('DashSourcesService', ['ngResource']).
    factory('Sources', function($resource){
        return $resource('app/sources.json', {}, {
            query: {method:'GET', isArray:false}
        });
    });

angular.module('DashTaxonomySourcesService', ['ngResource']).
    factory('TaxonomySources', function($resource){
        return $resource('app/sources_taxonomy.json', {}, {
            query: {method:'GET', isArray:false}
        });
    });

angular.module('DashNotesService', ['ngResource']).
    factory('Notes', function($resource){
        return $resource('app/notes.json', {}, {
            query: {method:'GET', isArray:false}
        });
    });

angular.module('DashContributorsService', ['ngResource']).
    factory('Contributors', function($resource){
        return $resource('app/contributors.json', {}, {
            query: {method:'GET', isArray:false}
        });
    });

angular.module('DashPlayerLibrariesService', ['ngResource']).
    factory('PlayerLibraries', function($resource){
        return $resource('app/player_libraries.json', {}, {
            query: {method:'GET', isArray:false}
        });
    });

angular.module('DashShowcaseLibrariesService', ['ngResource']).
    factory('ShowcaseLibraries', function($resource){
        return $resource('app/showcase_libraries.json', {}, {
            query: {method:'GET', isArray:false}
        });
    });

var app = angular.module('DashPlayer', [
    'DashSourcesService',
    'DashTaxonomySourcesService',
    'DashNotesService',
    'DashContributorsService',
    'DashPlayerLibrariesService',
    'DashShowcaseLibrariesService',
    'angularTreeview'
]);
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
                    scope.invalidateDisplay(false);
                }
            });
        }
    };
});

app.controller('DashController', function($scope, Sources, TaxonomySources, Notes, Contributors, PlayerLibraries, ShowcaseLibraries) {
    var player,
        controlbar,
        video,
        ttmlDiv,
        context,
        videoSeries = [],
        audioSeries = [],
        textSeries = [],
        maxGraphPoints = 50;

    ////////////////////////////////////////
    //
    // Metrics
    //
    ////////////////////////////////////////

    $scope.videoBitrate = 0;
    $scope.videoIndex = 0;
    $scope.videoPendingIndex = "";
    $scope.videoMaxIndex = 0;
    $scope.videoBufferLength = 0;
    $scope.videoDroppedFrames = 0;
    $scope.videoLatencyCount = 0;
    $scope.videoLatency = "";
    $scope.videoDownloadCount = 0;
    $scope.videoDownload = "";
    $scope.videoRatioCount = 0;
    $scope.videoRatio = "";
    $scope.videotoggle = false;

    $scope.audioBitrate = 0;
    $scope.audioIndex = 0;
    $scope.audioPendingIndex = "";
    $scope.audioMaxIndex = 0;
    $scope.audioBufferLength = 0;
    $scope.audioDroppedFrames = 0;
    $scope.videoLatencyCount = 0;
    $scope.audioLatency = "";
    $scope.audioDownloadCount = 0;
    $scope.audioDownload = "";
    $scope.audioRatioCount = 0;
    $scope.audioRatio = "";
    $scope.audiotoggle = false;

    $scope.optionsGutter = false;
    $scope.drmData = [];

    var converter = new MetricsTreeConverter();
    $scope.videoMetrics = null;
    $scope.audioMetrics = null;
    $scope.streamMetrics = null;


    $scope.getVideoTreeMetrics = function () {
        var metrics = player.getMetricsFor("video");
        $scope.videoMetrics = converter.toTreeViewDataSource(metrics);
    }

    $scope.getAudioTreeMetrics = function () {
        var metrics = player.getMetricsFor("audio");
        $scope.audioMetrics = converter.toTreeViewDataSource(metrics);
    }

    $scope.getStreamTreeMetrics = function () {
        var metrics = player.getMetricsFor("stream");
        $scope.streamMetrics = converter.toTreeViewDataSource(metrics);
    }

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

    function getCribbedMetricsFor(type) {
        var metrics = player.getMetricsFor(type),
            metricsExt = player.getMetricsExt(),
            repSwitch,
            bufferLevel,
            httpRequests,
            droppedFramesMetrics,
            bitrateIndexValue,
            bandwidthValue,
            pendingValue,
            numBitratesValue,
            bufferLengthValue = 0,
            point,
            movingLatency = {},
            movingDownload = {},
            movingRatio = {},
            droppedFramesValue = 0,
            requestsQueue,
            fillmoving = function(type, Requests){
                var requestWindow,
                    downloadTimes,
                    latencyTimes,
                    durationTimes;

                requestWindow = Requests
                    .slice(-20)
                    .filter(function(req){return req.responsecode >= 200 && req.responsecode < 300 && !!req.mediaduration && req.type === "Media Segment" && req.stream === type;})
                    .slice(-4);
                if (requestWindow.length > 0) {

                    latencyTimes = requestWindow.map(function (req){ return Math.abs(req.tresponse.getTime() - req.trequest.getTime()) / 1000;});

                    movingLatency[type] = {
                        average: latencyTimes.reduce(function(l, r) {return l + r;}) / latencyTimes.length, 
                        high: latencyTimes.reduce(function(l, r) {return l < r ? r : l;}), 
                        low: latencyTimes.reduce(function(l, r) {return l < r ? l : r;}), 
                        count: latencyTimes.length
                    };

                    downloadTimes = requestWindow.map(function (req){ return Math.abs(req.tfinish.getTime() - req.tresponse.getTime()) / 1000;});

                    movingDownload[type] = {
                        average: downloadTimes.reduce(function(l, r) {return l + r;}) / downloadTimes.length, 
                        high: downloadTimes.reduce(function(l, r) {return l < r ? r : l;}), 
                        low: downloadTimes.reduce(function(l, r) {return l < r ? l : r;}), 
                        count: downloadTimes.length
                    };

                    durationTimes = requestWindow.map(function (req){ return req.mediaduration;});

                    movingRatio[type] = {
                        average: (durationTimes.reduce(function(l, r) {return l + r;}) / downloadTimes.length) / movingDownload[type].average, 
                        high: durationTimes.reduce(function(l, r) {return l < r ? r : l;}) / movingDownload[type].low, 
                        low: durationTimes.reduce(function(l, r) {return l < r ? l : r;}) / movingDownload[type].high, 
                        count: durationTimes.length
                    };
                }
            };

        if (metrics && metricsExt) {
            repSwitch = metricsExt.getCurrentRepresentationSwitch(metrics);
            bufferLevel = metricsExt.getCurrentBufferLevel(metrics);
            httpRequests = metricsExt.getHttpRequests(metrics);
            droppedFramesMetrics = metricsExt.getCurrentDroppedFrames(metrics);
            requestsQueue = metricsExt.getRequestsQueue(metrics);

            fillmoving("video", httpRequests);
            fillmoving("audio", httpRequests);

            var streamIdx = $scope.streamInfo.index;

            if (repSwitch !== null) {
                bitrateIndexValue = metricsExt.getIndexForRepresentation(repSwitch.to, streamIdx);
                bandwidthValue = metricsExt.getBandwidthForRepresentation(repSwitch.to, streamIdx);
                bandwidthValue = bandwidthValue / 1000;
                bandwidthValue = Math.round(bandwidthValue);
            }

            numBitratesValue = metricsExt.getMaxIndexForBufferType(type, streamIdx);

            if (bufferLevel !== null) {
                bufferLengthValue = bufferLevel.level.toPrecision(5);
            }

            if (droppedFramesMetrics !== null) {
                droppedFramesValue = droppedFramesMetrics.droppedFrames;
            }

            if (isNaN(bandwidthValue) || bandwidthValue === undefined) {
                bandwidthValue = 0;
            }

            if (isNaN(bitrateIndexValue) || bitrateIndexValue === undefined) {
                bitrateIndexValue = 0;
            }

            if (isNaN(numBitratesValue) || numBitratesValue === undefined) {
                numBitratesValue = 0;
            }

            if (isNaN(bufferLengthValue) || bufferLengthValue === undefined) {
                bufferLengthValue = 0;
            }

            pendingValue = player.getQualityFor(type);

            return {
                bandwidthValue: bandwidthValue,
                bitrateIndexValue: bitrateIndexValue + 1,
                pendingIndex: (pendingValue !== bitrateIndexValue) ? "(-> " + (pendingValue + 1) + ")" : "",
                numBitratesValue: numBitratesValue,
                bufferLengthValue: bufferLengthValue,
                droppedFramesValue: droppedFramesValue,
                movingLatency: movingLatency,
                movingDownload: movingDownload,
                movingRatio: movingRatio,
                requestsQueue: requestsQueue
            }
        }
        else {
            return null;
        }
    }

    function processManifestUpdateMetrics(metrics) {
        var data = $scope.manifestUpdateInfo || [],
            manifestInfo = metrics.ManifestUpdate,
            propsWithDelta = ["requestTime", "fetchTime", "availabilityStartTime", "presentationStartTime", "clientTimeOffset", "currentTime", "latency"],
            ln = manifestInfo.length,
            hasValue,
            info,
            prop,
            value,
            item,
            delta,
            k,
            ranges,
            range,
            rangeLn,
            prevInfo,
            stream,
            track,
            prevStream,
            prevTrack,
            isUpdate = (data.length === ln),
            i = Math.max(ln - 1, 0);

        if (ln === 0) return null;

        for (i; i < ln; i++) {
            info = manifestInfo[i];
            item = {};

            for (prop in info) {
                prevInfo = data[i - 1];

                if (isUpdate) {
                    item = data[i];
                }

                value = info[prop];
                hasValue = (value !== null) && (value !== undefined);

                if (typeof value === "number") {
                    value = value.toFixed(2);
                }

                item[prop] = hasValue ? value : " - ";

                if (propsWithDelta.indexOf(prop) === -1 || !hasValue || !prevInfo) continue;

                delta = value - prevInfo[prop];

                if (value instanceof(Date)) {
                    delta /= 1000;
                }

                item[prop + "Delta"] = "(" + delta.toFixed(2) + ")";
            }

            ranges = item.buffered;

            if (ranges && ranges.length > 0) {
                rangeLn = ranges.length;
                item.buffered = [];
                for (k = 0; k < rangeLn; k++) {
                    range = {};
                    range.start = ranges.start(k).toFixed(2);
                    range.end = ranges.end(k).toFixed(2);
                    range.size = (range.end - range.start).toFixed(2);
                    item.buffered.push(range);
                }
            } else {
                item.buffered = [{start: "-", end: "-", size: "-"}];
            }

            for (k = 0; k < info.streamInfo.length; k++) {
                stream = item.streamInfo[k];

                if (!prevInfo) break;

                prevStream = prevInfo.streamInfo[k];

                if (!prevStream) continue;

                stream.startDelta = "(" + (stream.start - prevStream.start).toFixed(2) + ")";
                stream.durationDelta = "(" + (stream.duration - prevStream.duration).toFixed(2) + ")";
            }

            for (k = 0; k < info.trackInfo.length; k++) {
                track = item.trackInfo[k];

                if (!prevInfo) break;

                prevTrack = prevInfo.trackInfo[k];

                if (!prevTrack) continue;

                track.startNumberDelta = "(" + (track.startNumber - prevTrack.startNumber) + ")";
                track.presentationTimeOffsetDelta = "(" + (track.presentationTimeOffset - prevTrack.presentationTimeOffset).toFixed(2) + ")";
            }

            if (isUpdate) continue;

            data.push(item);
        }

        return data;
    }

    function metricChanged(e) {
        console.log("*** metric changed");
        var metrics,
            point,
            treeData,
            bufferedRanges = [],
            now  = new Date().getTime();
        console.log("*** now "+ now + " " + lastUpdateTime);
        if (now  - lastUpdateTime > 1000) {
            console.log("*** charting");
            // get current buffered ranges of video element and keep them up to date
            for (var i = 0; i < video.buffered.length; i++) {
                bufferedRanges.push(video.buffered.start(i) + ' - ' + video.buffered.end(i));
            }
            $scope.bufferedRanges = bufferedRanges;

            if (e.mediaType == "video") {
                metrics = getCribbedMetricsFor("video");
                if (metrics) {
                    $scope.videoBitrate = metrics.bandwidthValue;
                    $scope.videoIndex = metrics.bitrateIndexValue;
                    $scope.videoPendingIndex = metrics.pendingIndex;
                    $scope.videoMaxIndex = metrics.numBitratesValue;
                    $scope.videoBufferLength = metrics.bufferLengthValue;
                    $scope.videoDroppedFrames = metrics.droppedFramesValue;
                    $scope.videoRequestsQueue = metrics.requestsQueue;
                    if (metrics.movingLatency["video"]) {
                        $scope.videoLatencyCount = metrics.movingLatency["video"].count;
                        $scope.videoLatency = metrics.movingLatency["video"].low.toFixed(3) + " < " + metrics.movingLatency["video"].average.toFixed(3) + " < " + metrics.movingLatency["video"].high.toFixed(3);
                    }
                    if (metrics.movingDownload["video"]) {
                        $scope.videoDownloadCount = metrics.movingDownload["video"].count;
                        $scope.videoDownload = metrics.movingDownload["video"].low.toFixed(3) + " < " + metrics.movingDownload["video"].average.toFixed(3) + " < " + metrics.movingDownload["video"].high.toFixed(3);
                    }
                    if (metrics.movingRatio["video"]) {
                        $scope.videoRatioCount = metrics.movingRatio["video"].count;
                        $scope.videoRatio = metrics.movingRatio["video"].low.toFixed(3) + " < " + metrics.movingRatio["video"].average.toFixed(3) + " < " + metrics.movingRatio["video"].high.toFixed(3);
                    }

                    point = [parseFloat(video.currentTime), Math.round(parseFloat(metrics.bufferLengthValue))];
                    videoSeries.push(point);

                    if (videoSeries.length > maxGraphPoints) {
                        videoSeries.splice(0, 1);
                    }
                }
            }

            if (e.mediaType == "audio") {
                metrics = getCribbedMetricsFor("audio");
                if (metrics) {
                    $scope.audioBitrate = metrics.bandwidthValue;
                    $scope.audioIndex = metrics.bitrateIndexValue;
                    $scope.audioPendingIndex = metrics.pendingIndex;
                    $scope.audioMaxIndex = metrics.numBitratesValue;
                    $scope.audioBufferLength = metrics.bufferLengthValue;
                    $scope.audioDroppedFrames = metrics.droppedFramesValue;
                    $scope.audioRequestsQueue = metrics.requestsQueue;
                    if (metrics.movingLatency["audio"]) {
                        $scope.audioLatencyCount = metrics.movingLatency["audio"].count;
                        $scope.audioLatency = metrics.movingLatency["audio"].low.toFixed(3) + " < " + metrics.movingLatency["audio"].average.toFixed(3) + " < " + metrics.movingLatency["audio"].high.toFixed(3);
                    }
                    if (metrics.movingDownload["audio"]) {
                        $scope.audioDownloadCount = metrics.movingDownload["audio"].count;
                        $scope.audioDownload = metrics.movingDownload["audio"].low.toFixed(3) + " < " + metrics.movingDownload["audio"].average.toFixed(3) + " < " + metrics.movingDownload["audio"].high.toFixed(3);
                    }
                    if (metrics.movingRatio["audio"]) {
                        $scope.audioRatioCount = metrics.movingRatio["audio"].count;
                        $scope.audioRatio = metrics.movingRatio["audio"].low.toFixed(3) + " < " + metrics.movingRatio["audio"].average.toFixed(3) + " < " + metrics.movingRatio["audio"].high.toFixed(3);
                    }

                    point = [parseFloat(video.currentTime), Math.round(parseFloat(metrics.bufferLengthValue))];
                    audioSeries.push(point);

                    if (audioSeries.length > maxGraphPoints) {
                        audioSeries.splice(0, 1);
                    }
                }
            }

            if (e.mediaType == "fragmentedText") {
                metrics = getCribbedMetricsFor("fragmentedText");
                
                if (metrics) {
                    $scope.textBitrate = metrics.bandwidthValue;
                    $scope.textIndex = metrics.bitrateIndexValue;
                    $scope.textPendingIndex = metrics.pendingIndex;
                    $scope.textMaxIndex = metrics.numBitratesValue;
                    $scope.textBufferLength = metrics.bufferLengthValue;
                    $scope.textDroppedFrames = metrics.droppedFramesValue;
                    $scope.textRequestsQueue = metrics.requestsQueue;

                    // console.log('CHECKERS', metrics.movingLatency);

                    if (metrics.movingLatency["fragmentedText"]) {
                        $scope.textLatencyCount = metrics.movingLatency["fragmentedText"].count;
                        $scope.textLatency = metrics.movingLatency["fragmentedText"].low.toFixed(3) + " < " + metrics.movingLatency["fragmentedText"].average.toFixed(3) + " < " + metrics.movingLatency["fragmentedText"].high.toFixed(3);
                    }
                    if (metrics.movingDownload["fragmentedText"]) {
                        $scope.textDownloadCount = metrics.movingDownload["fragmentedText"].count;
                        $scope.textDownload = metrics.movingDownload["fragmentedText"].low.toFixed(3) + " < " + metrics.movingDownload["fragmentedText"].average.toFixed(3) + " < " + metrics.movingDownload["fragmentedText"].high.toFixed(3);
                    }
                    if (metrics.movingRatio["fragmentedText"]) {
                        $scope.textRatioCount = metrics.movingRatio["fragmentedText"].count;
                        $scope.textRatio = metrics.movingRatio["fragmentedText"].low.toFixed(3) + " < " + metrics.movingRatio["fragmentedText"].average.toFixed(3) + " < " + metrics.movingRatio["fragmentedText"].high.toFixed(3);
                    }

                    point = [parseFloat(video.currentTime), Math.round(parseFloat(metrics.bufferLengthValue))];
                    textSeries.push(point);

                    if (textSeries.length > maxGraphPoints) {
                        textSeries.splice(0, 1);
                    }
                }
            }

            $scope.invalidateDisplay(true);
            $scope.safeApply();
            lastUpdateTime = now;
        }
    }

    function metricUpdated(e) {
        var metrics = player.getMetricsFor("stream"),
            data;

        if (!e.metric || e.metric.indexOf("ManifestUpdate") === -1 || !metrics) return;

        data = processManifestUpdateMetrics(metrics);

        if (!data) return;

        $scope.manifestUpdateInfo = data;
        $scope.invalidateDisplay(true);
        $scope.safeApply();
    }

    function streamSwitch(e) {
        $scope.streamInfo = e.toStreamInfo;
    }

    function streamInitialized(e) {
        var availableTracks = {};
        availableTracks.audio = player.getTracksFor("audio");
        availableTracks.video = player.getTracksFor("video");
        $scope.availableTracks = availableTracks;
    }

    ////////////////////////////////////////
    //
    // Error Handling
    //
    ////////////////////////////////////////

    function onError(e) {

    }

    ////////////////////////////////////////
    //
    // Debugging
    //
    ////////////////////////////////////////

    $scope.invalidateChartDisplay = false;

    $scope.invalidateDisplay = function (value) {
        $scope.invalidateChartDisplay = value;
    }

    $scope.bufferData = [
        {
            data: videoSeries,
            label: "Video",
            color: "#2980B9"
        },
        {
            data: audioSeries,
            label: "Audio",
            color: "#E74C3C"
        },
        {
            data: textSeries,
            label: "Text",
            color: "#888"
        }
    ];

    $scope.showCharts = true;
    $scope.setCharts = function (show) {
        $scope.showCharts = show;
    }

    $scope.showBufferLevel = true;
    $scope.setBufferLevelChart = function(show) {
        $scope.showBufferLevel = show;
    }

    $scope.showDebug = false;
    $scope.setDebug = function (show) {
        $scope.showDebug = show;
    }


    ////////////////////////////////////////
    //
    // Player Setup
    //
    ////////////////////////////////////////

    video = document.querySelector(".dash-video-player video");
    player = MediaPlayer().create();

    $scope.version = player.getVersion();

    player.initialize();
    player.on(MediaPlayer.events.ERROR, onError.bind(this));
    player.on(MediaPlayer.events.METRIC_CHANGED, metricChanged.bind(this));
    player.on(MediaPlayer.events.METRIC_UPDATED, metricUpdated.bind(this));
    player.on(MediaPlayer.events.PERIOD_SWITCH_COMPLETED, streamSwitch.bind(this));
    player.on(MediaPlayer.events.STREAM_INITIALIZED, streamInitialized.bind(this));

    player.attachView(video);
    player.attachVideoContainer(document.getElementById("videoContainer"));

    // Add HTML-rendered TTML subtitles
    ttmlDiv = document.querySelector("#video-caption");
    player.attachTTMLRenderingDiv(ttmlDiv);

    player.setAutoPlay(true);
    controlbar = new ControlBar(player);
    controlbar.initialize();
    controlbar.disable() //controlbar.hide() // other option

    ////////////////////////////////////////
    //
    // Player Methods
    //
    ////////////////////////////////////////

    $scope.abrEnabled = true;

    $scope.setAbrEnabled = function (enabled) {
        $scope.abrEnabled = enabled;
        player.setAutoSwitchQuality(enabled);
    }

    $scope.toggleCCBubble = false;

    $scope.abrUp = function (type) {
        var newQuality,
            metricsExt = player.getMetricsExt(),
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

    ////////////////////////////////////////
    //
    // Page Setup
    //
    ////////////////////////////////////////

    function getUrlVars() {
        var vars = {};
        var parts = window.location.href.replace(/[?&]+([^=&]+)=([^&]*)/gi, function(m,key,value) {
            vars[key] = value;
        });
        return vars;
    }

    // Get url params...
    var vars = getUrlVars();

    Sources.query(function (data) {
        $scope.availableStreams = data.items;
    });

    TaxonomySources.query(function (data) {
        $scope.availableTaxonomyStreams = data.items;
    });

    Notes.query(function (data) {
        $scope.releaseNotes = data.notes;
    });

    Contributors.query(function (data) {
        $scope.contributors = data.items;
    });

    function onStreamComplete(e) {
        if ($('#loopCB').is(':checked'))
        {
           $scope.doLoad();
        }
    }

    $("#videoContainer video")[0].addEventListener("ended", onStreamComplete);

    $scope.logbucket = [];
    $scope.debugEnabled = false;
    $scope.htmlLogging = false;

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

    // $scope.initGraphing = function() {
    //     graphManager = new GraphManager(MAXGRAPHPOINTS);
    //     graphManager.pushGraph(new GraphVO(GRAPH_COLORS[0], 2), 0);
    //     graphManager.pushGraph(new GraphVO(GRAPH_COLORS[1], 3), 1);
    //     graphManager.pushGraph(new GraphVO(GRAPH_COLORS[2], 4), 2);
    //     graphManager.pushGraph(new GraphVO(GRAPH_COLORS[3], 5), 3);

    //     graph = $.plot($("#buffer-placeholder"), [],
    //     {
    //         xaxes: [{position: 'bottom'}],
    //         yaxes: [ 
    //             {show: true, ticks: false, position: 'right'},
    //             {color: GRAPH_COLORS[0], position: 'right', min: 0}, 
    //             {color: GRAPH_COLORS[1], position: 'right', min: 0}, 
    //             {color: GRAPH_COLORS[2], position: 'right', min: 0}, 
    //             {color: GRAPH_COLORS[3], position: 'right', min: 0}
    //                 ],
    //         legend: {container: $('#graphLegend'), noColumns: 4}
    //     });

    //     graph.setData(graphManager.getGraphs());
    //     graph.setupGrid();
    //     graph.draw();
    // }


    $scope.initDebugConsole = function () {

        var debug;

        console.log('forever', $scope.logbucket);
        debug = player.getDebug();
        debug.setLogTimestampVisible(true);
        debug.setLogToBrowserConsole(true);

        var date            = new Date(),
            logStreamEpoch  = date.getTime();

        player.on(MediaPlayer.events.LOG, function(event)
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

    PlayerLibraries.query(function (data) {
        $scope.playerLibraries = data.items;
    });

    ShowcaseLibraries.query(function (data) {
        $scope.showcaseLibraries = data.items;
    });

    var manifestLoaded = function (manifest) {
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

    };




    ////////////////////////////////////////
    //
    // DRM Setup
    //
    ////////////////////////////////////////
    // Listen for protection system creation/destruction by the player itself.  This will
    // only happen in the case where we do not not provide a ProtectionController
    // to the player via MediaPlayer.attachSource()
    player.on(MediaPlayer.events.PROTECTION_CREATED, function (e) {
        var data = addDRMData(e.manifest, e.controller);
        data.isPlaying = true;
        for (var i = 0; i < $scope.drmData.length; i++) {
            if ($scope.drmData[i] !== data) {
                $scope.drmData[i].isPlaying = false;
            }
        }
        $scope.safeApply();
    }, $scope);
    player.on(MediaPlayer.events.PROTECTION_DESTROYED, function (e) {
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

        player.on(MediaPlayer.events.KEY_SYSTEM_SELECTED, function(e) {
            if (!e.error) {
                data.ksconfig = e.data.ksConfiguration;
            } else {
                data.error = e.error;
            }
            $scope.safeApply();
        }, $scope);


        player.on(MediaPlayer.events.KEY_SESSION_CREATED, function(e) {
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


        player.on(MediaPlayer.events.KEY_SESSION_REMOVED, function(e) {
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


        player.on(MediaPlayer.events.KEY_SESSION_CLOSED, function(e) {
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

        player.on(MediaPlayer.events.KEY_STATUSES_CHANGED, function(e) {
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

        player.on(MediaPlayer.events.KEY_MESSAGE, function(e) {
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

        player.on(MediaPlayer.events.LICENSE_REQUEST_COMPLETE, function(e) {
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

    $scope.play = function(data) {
        player.attachSource(data.manifest, data.protCtrl);
        for (var i = 0; i < $scope.drmData.length; i++) {
            var drmData = $scope.drmData[i];
            drmData.isPlaying = !!(drmData === data);
        }
    };

    

    $scope.doLicenseFetch = function () {
        player.retrieveManifest($scope.selectedItem.url, manifestLoaded);
    };

    $scope.setStream = function (item) {
        $scope.selectedItem = item;
    }

    $scope.toggleOptionsGutter = function (bool) {
        $scope.optionsGutter = bool;
    }

    $scope.doLoad = function () {
        var protData = null,
            initialSettings;
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

    $scope.initialSettings = {audio: null, video: null};
    $scope.mediaSettingsCacheEnabled = true;

    $scope.setMediaSettingsCacheEnabled = function(enabled) {
        $scope.mediaSettingsCacheEnabled = enabled;
        player.enableLastMediaSettingsCaching(enabled);
    }

    $scope.hasLogo = function (item) {
        return (item.hasOwnProperty("logo")
                && item.logo !== null
                && item.logo !== undefined
                && item.logo !== "");
    }

    // Get initial stream if it was passed in.
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
