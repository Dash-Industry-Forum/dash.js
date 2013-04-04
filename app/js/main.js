var player,
    playing = false,
    time = -1,
    timer,
    videoMetricsTreeView,
    audioMetricsTreeView,
    bufferChart,
    streams,
    videoSeries,
    audioSeries,
    maxGraphPoints = 50,
    graphUpdateInterval = 333;

function buildBufferGraph() {
    "use strict";
    videoSeries = {
        data: [],
        label: "Video",
        color: "#2980B9"
    };

    audioSeries = {
        data: [],
        label: "Audio",
        color: "#E74C3C"
    };

    bufferChart = $.plot("#buffer-placeholder", [audioSeries, videoSeries], {
        series: {
            shadowSize: 0
        },
        yaxis: {
            min: 0,
            max: 15
        },
        xaxis: {
            show: false
        }
    });

    bufferChart.draw();
}

function abrUpClicked(type) {
    "use strict";
    var newQuality,
        metricsExt = player.getMetricsExt(),
        max = metricsExt.getMaxIndexForBufferType(type);

    newQuality = player.getQualityFor(type) + 1;

    // zero based
    if (newQuality >= max) {
        newQuality = max - 1;
    }

    player.setQualityFor(type, newQuality);
}

function abrDownClicked(type) {
    "use strict";
    var newQuality = player.getQualityFor(type) - 1;

    if (newQuality < 0) {
        newQuality = 0;
    }

    player.setQualityFor(type, newQuality);
}

function abrAutoChanged() {
    "use strict";
    var value = !player.getAutoSwitchQuality();
    player.setAutoSwitchQuality(value);
}

function init() {
    "use strict";
    $(document).ready(
        function () {
            $("#video-abr-up")
                .click(
                    function (event) {
                        abrUpClicked("video");
                    }
                );

            $("#video-abr-down")
                .button()
                .click(
                    function (event) {
                        abrDownClicked("video");
                    }
                );

            $("#audio-abr-up")
                .click(
                    function (event) {
                        abrUpClicked("audio");
                    }
                );

            $("#audio-abr-down")
                .button()
                .click(
                    function (event) {
                        abrDownClicked("audio");
                    }
                );

            $("#abr-auto-on")
                .click(
                    function (event) {
                        abrAutoChanged();
                    }
                );

            $("#abr-auto-off")
                .click(
                    function (event) {
                        abrAutoChanged();
                    }
                );
        }
    );

    buildBufferGraph();

    Q.longStackJumpLimit = 0;
}

function populateMetricsFor(type, bitrateValue, bitrateIndex, pendingIndex, numBitrates, bufferLength, droppedFrames, series) {
    "use strict";
    var video = document.querySelector(".dash-video-player video"),
        metrics = player.getMetricsFor(type),
        metricsExt = player.getMetricsExt(),
        repSwitch,
        bufferLevel,
        httpRequest,
        droppedFramesMetrics,
        bitrateIndexValue,
        bandwidthValue,
        pendingValue,
        numBitratesValue,
        bufferLengthValue = 0,
        point,
        lastFragmentDuration,
        lastFragmentDownloadTime,
        droppedFramesValue = 0;

    if (metrics && metricsExt) {
        repSwitch = metricsExt.getCurrentRepresentationSwitch(metrics);
        bufferLevel = metricsExt.getCurrentBufferLevel(metrics);
        httpRequest = metricsExt.getCurrentHttpRequest(metrics);
        droppedFramesMetrics = metricsExt.getCurrentDroppedFrames(metrics);

        if (repSwitch !== null) {
            bitrateIndexValue = metricsExt.getIndexForRepresentation(repSwitch.to);
            bandwidthValue = metricsExt.getBandwidthForRepresentation(repSwitch.to);
            bandwidthValue = bandwidthValue / 1000;
            bandwidthValue = Math.round(bandwidthValue);
        }

        numBitratesValue = metricsExt.getMaxIndexForBufferType(type);

        if (bufferLevel !== null) {
            bufferLengthValue = bufferLevel.level.toPrecision(5);
        }

        if (httpRequest !== null) {
            lastFragmentDuration = httpRequest.mediaduration;
            lastFragmentDownloadTime = httpRequest.tresponse.getTime() - httpRequest.trequest.getTime();

            // convert milliseconds to seconds
            lastFragmentDownloadTime = lastFragmentDownloadTime / 1000;
            lastFragmentDuration = lastFragmentDuration.toPrecision(4);
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

        bitrateValue.innerHTML = bandwidthValue + " kbps";
        bitrateIndex.innerHTML = bitrateIndexValue + 1;

        pendingValue = player.getQualityFor(type);
        if (pendingValue !== bitrateIndexValue) {
            pendingIndex.innerHTML = "(-> " + (pendingValue + 1) + ")";
        } else {
            pendingIndex.innerHTML = "";
        }

        numBitrates.innerHTML = numBitratesValue;
        bufferLength.innerHTML = bufferLengthValue;
        droppedFrames.innerHTML = droppedFramesValue;
        //fragDuration.innerHTML = lastFragmentDuration;
        //fragTime.innerHTML = lastFragmentDownloadTime;

        point = [parseFloat(video.currentTime), Math.round(parseFloat(bufferLengthValue))];
        series.data.push(point);

        if (series.data.length > maxGraphPoints) {
            series.data = series.data.slice(series.data.length - maxGraphPoints);
        }
    }
}

function update() {
    "use strict";
    if (playing) {
        var video = document.querySelector(".dash-video-player video"),
            newTime = video.currentTime;

        if (newTime !== time) {
            populateMetricsFor(
                "video",
                document.getElementById("video-value"),
                document.getElementById("video-index"),
                document.getElementById("video-pending-index"),
                document.getElementById("num-video-bitrates"),
                document.getElementById("video-buffer"),
                document.getElementById("video-dropped-frames"),
                videoSeries
            );

            populateMetricsFor(
                "audio",
                document.getElementById("audio-value"),
                document.getElementById("audio-index"),
                document.getElementById("audio-pending-index"),
                document.getElementById("num-audio-bitrates"),
                document.getElementById("audio-buffer"),
                document.getElementById("audio-dropped-frames"),
                audioSeries
            );
        }

        bufferChart.setData([audioSeries, videoSeries]);
        bufferChart.setupGrid();
        bufferChart.draw();
    }

    setTimeout(update, graphUpdateInterval);
}

function handleVideoMetricsUpdate() {
    "use strict";
    var metrics = player.getMetricsFor("video"),
        metricsConverter = player.getMetricsConverter(),
        videoTreeDataSource;

    videoTreeDataSource = metricsConverter.toTreeViewDataSource(metrics);
    videoMetricsTreeView.data("kendoTreeView").setDataSource(videoTreeDataSource);
}

function handleAudioMetricsUpdate() {
    "use strict";
    var metrics = player.getMetricsFor("audio"),
        metricsConverter = player.getMetricsConverter(),
        audioTreeDataSource;

    audioTreeDataSource = metricsConverter.toTreeViewDataSource(metrics);
    audioMetricsTreeView.data("kendoTreeView").setDataSource(audioTreeDataSource);
}

function handleSourcesChange() {
    "use strict";
    var custom = $("#custom-source"),
        select = $("#sources"),
        streamObject,
        streamSource;

    streamObject = streams[select.val()];
    streamSource = streamObject.url;
    custom.val(streamSource);
}

function initStreamData() {
    "use strict";
    streams = {};

    streams.ipvidnet = {url: "http://pixie.path1.com/dash/manifest.txt", isLive: true};

    streams.archive = {url: "http://dash.edgesuite.net/dash264/TestCases/1b/thomson-networks/manifest.mpd", isLive: false};
    streams.live = {url: "http://dashdemo.edgesuite.net/mediaexcel/live/ch1/dash.mpd", isLive: true}; //"http://venus.mediaexcel.com/hera/videos/ch1/dash.mpd";
    streams.list = {url: "http://www.digitalprimates.net/dash/streams/gpac/mp4-main-multi-mpd-AV-NBS.mpd", isLive: false};
    streams.template = {url: "http://www.digitalprimates.net/dash/streams/mp4-live-template/mp4-live-mpd-AV-BS.mpd", isLive: false};
    streams.timeline = {url: "http://demo.unified-streaming.com/video/ateam/ateam.ism/ateam.mpd", isLive: false};
    streams.base = {url: "http://www.digitalprimates.net/dash/streams/mp4-onDemand/mp4-onDemand-mpd-AV.mpd", isLive: false};
    streams.youtube = {url: "http://yt-dash-mse-test.commondatastorage.googleapis.com/car-20120827-manifest.mpd", isLive: false};
    streams.bunny = {url: "http://dash.edgesuite.net/adobe/bbb/bbb.mpd", isLive: false};
    streams.envivio = {url: "http://dashdemo.edgesuite.net/envivio/dashpr/clear/Manifest.mpd", isLive: false};

    streams["1a-netflix"] = {url: "http://dash.edgesuite.net/dash264/TestCases/1a/netflix/exMPD_BIP_TC1.mpd", isLive: false};
    streams["1a-sony"] = {url: "http://dash.edgesuite.net/dash264/TestCases/1a/sony/SNE_DASH_SD_CASE1A_REVISED.mpd", isLive: false};
    streams["1b-envivio"] = {url: "http://dash.edgesuite.net/dash264/TestCases/1b/envivio/manifest.mpd", isLive: false};
    streams["1b-thomson"] = {url: "http://dash.edgesuite.net/dash264/TestCases/1b/thomson-networks/manifest.mpd", isLive: false};
    streams["1c-envivio"] = {url: "http://dash.edgesuite.net/dash264/TestCases/1c/envivio/manifest.mpd", isLive: false};
    streams["2a-envivio"] = {url: "http://dash.edgesuite.net/dash264/TestCases/2a/envivio/manifest.mpd", isLive: false};
    streams["2a-sony"] = {url: "http://dash.edgesuite.net/dash264/TestCases/2a/sony/SNE_DASH_CASE_2A_SD_REVISED.mpd", isLive: false};
    streams["2a-thomson"] = {url: "http://dash.edgesuite.net/dash264/TestCases/2a/thomson-networks/manifest.mpd", isLive: false};
    streams["3a-fraunhofer"] = {url: "http://dash.edgesuite.net/dash264/TestCases/3a/fraunhofer/ed.mpd", isLive: false};
    streams["3b-fraunhofer"] = {url: "http://dash.edgesuite.net/dash264/TestCases/3b/fraunhofer/elephants_dream_heaac2_0.mpd", isLive: false};
    streams["3b-sony"] = {url: "http://dash.edgesuite.net/dash264/TestCases/3b/sony/SNE_DASH_CASE3B_SD_REVISED.mpd", isLive: false};
    streams["4b-sony"] = {url: "http://dash.edgesuite.net/dash264/TestCases/4b/sony/SNE_DASH_CASE4B_SD_REVISED.mpd", isLive: false};
    streams["5a-thomson/envivio"] = {url: "http://dash.edgesuite.net/dash264/TestCases/5a/1/manifest.mpd", isLive: false};
    streams["5b-thomson/envivio"] = {url: "http://dash.edgesuite.net/dash264/TestCases/5b/1/manifest.mpd", isLive: false};
    streams["6c-envivio1"] = {url: "http://dash.edgesuite.net/dash264/TestCases/6c/envivio/manifest.mpd", isLive: false};
    streams["6c-envivio2"] = {url: "http://dash.edgesuite.net/dash264/TestCases/6c/envivio/manifest2.mpd", isLive: false};
}

function initDebugControls() {
    "use strict";
    var debug;

    $("#debug-enabled-toggle").change(
        function() {
            debug = player.getDebug();
            debug.setLogToHtmlConsole($("#debug-enabled-toggle").attr("checked"));
        }
    );

    $("#debug-clear").click(
        function() {
            debug = player.getDebug();
            debug.clear();
        }
    );

    $("#filter-source").on("input",
        function() {
            debug = player.getDebug();
            debug.setFilter($("#filter-source").attr("value"));
        }
        );
}

function load() {
    "use strict";
    var select = $("#sources"),
        debug = player.getDebug(),
        streamObject;

    streamObject = streams[select.val()];
    player.attachSource(streamObject);
    debug.log("manifest | " + streamObject);

    playing = true;

    if (bufferChart) {
        audioSeries.data = [];
        videoSeries.data = [];
        bufferChart.setData([audioSeries, videoSeries]);
        bufferChart.setupGrid();
        bufferChart.draw();
    }
}

$(document).ready(function() {
    "use strict";
    var defaultDataSource,
        video = document.querySelector(".dash-video-player video"),
        context = new Dash.di.DashContext(),
        console = document.getElementById("debug_log"),
        debug,
        lastChild = $("#debug-log-tab");

    initDebugControls();
    initStreamData();
    handleSourcesChange();

    // JS input/textarea placeholder
    $("input, textarea").placeholder();

    $(".btn-group a").click(function() {
        $(this).siblings().removeClass("active");
        $(this).addClass("active");
    });

    // Disable link click not scroll top
    $("a[href='#']").click(function() {
        return false;
    });

    $("#debug-log-tab").show();
    $("#video-metrics-tree-tab").hide();
    $("#audio-metrics-tree-tab").hide();
    $("#release-notes-tab").hide();

    $("#debug-log-btn").click(function () {
        lastChild.hide();
        lastChild = $("#debug-log-tab");
        lastChild.show();
    });

    $("#video-metrics-btn").click(function () {
        lastChild.hide();
        lastChild = $("#video-metrics-tree-tab");
        lastChild.show();
    });

    $("#audio-metrics-btn").click(function () {
        lastChild.hide();
        lastChild = $("#audio-metrics-tree-tab");
        lastChild.show();
    });

    $("#release-notes-btn").click(function () {
        lastChild.hide();
        lastChild = $("#release-notes-tab");
        lastChild.show();
    });

    $("#informationTabs").tabs();
    $("#videoMetricsUpdateButton").button().click(handleVideoMetricsUpdate);
    $("#audioMetricsUpdateButton").button().click(handleAudioMetricsUpdate);

    defaultDataSource = new kendo.data.HierarchicalDataSource({
        data: [ {text: "No Data"} ]
    });

    videoMetricsTreeView = $("#videoMetricsTree").kendoTreeView({
        dataSource: defaultDataSource
    });

    audioMetricsTreeView = $("#audioMetricsTree").kendoTreeView({
        dataSource: defaultDataSource
    });

    $("#sources").dropkick({
        change: handleSourcesChange
    });

    setTimeout(update, graphUpdateInterval);

    player = new MediaPlayer(context);

    player.startup();

    debug = player.debug;
    debug.init(console);

    player.autoPlay = true;
    player.attachView(video);
});