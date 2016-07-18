function ReceiverController($scope) {
    'use strict';

    $scope.showSpinner = true;
    $scope.showVideo = false;
    $scope.showStats = false;

    $scope.videoBitrate = 0;
    $scope.videoIndex = 0;
    $scope.videoPendingIndex = "";
    $scope.videoMaxIndex = 0;
    $scope.videoBufferLength = 0;
    $scope.videoDroppedFrames = 0;

    $scope.audioBitrate = 0;
    $scope.audioIndex = 0;
    $scope.audioPendingIndex = "";
    $scope.audioMaxIndex = 0;
    $scope.audioBufferLength = 0;
    $scope.audioDroppedFrames = 0;

    var context,
        player,
        graphUpdateInterval = 999,

        getMetricsFor = function (type) {
            var video = document.querySelector(".dash-video-player video"),
                metrics = player.getMetricsFor(type),
                dashMetrics = player.getDashMetrics(),
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

            if (metrics && dashMetrics) {
                repSwitch = dashMetrics.getCurrentRepresentationSwitch(metrics);
                bufferLevel = dashMetrics.getCurrentBufferLevel(metrics);
                httpRequest = dashMetrics.getCurrentHttpRequest(metrics);
                droppedFramesMetrics = dashMetrics.getCurrentDroppedFrames(metrics);

                if (repSwitch !== null) {
                    bitrateIndexValue = dashMetrics.getIndexForRepresentation(repSwitch.to);
                    bandwidthValue = dashMetrics.getBandwidthForRepresentation(repSwitch.to);
                    bandwidthValue = bandwidthValue / 1000;
                    bandwidthValue = Math.round(bandwidthValue);
                }

                numBitratesValue = dashMetrics.getMaxIndexForBufferType(type);

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

                pendingValue = player.getQualityFor(type);

                return {
                    bandwidthValue: bandwidthValue + 1,
                    bitrateIndexValue: bitrateIndexValue,
                    pendingIndex: (pendingValue !== bitrateIndexValue) ? "(-> " + (pendingValue + 1) + ")" : "",
                    numBitratesValue: numBitratesValue,
                    bufferLengthValue: bufferLengthValue,
                    droppedFramesValue: droppedFramesValue
                }
            }
            else {
                return null;
            }
        },

        update = function () {
            var video = document.querySelector(".dash-video-player video"),
                metrics;

            metrics = getMetricsFor("video");
            if (metrics) {
                $scope.videoBitrate = metrics.bandwidthValue;
                $scope.videoIndex = metrics.bitrateIndexValue;
                $scope.videoPendingIndex = metrics.pendingIndex;
                $scope.videoMaxIndex = metrics.numBitratesValue;
                $scope.videoBufferLength = metrics.bufferLengthValue;
                $scope.videoDroppedFrames = metrics.droppedFramesValue;
            }

            metrics = getMetricsFor("audio");
            if (metrics) {
                $scope.audioBitrate = metrics.bandwidthValue;
                $scope.audioIndex = metrics.bitrateIndexValue;
                $scope.audioPendingIndex = metrics.pendingIndex;
                $scope.audioMaxIndex = metrics.numBitratesValue;
                $scope.audioBufferLength = metrics.bufferLengthValue;
                $scope.audioDroppedFrames = metrics.droppedFramesValue;
            }

            $scope.$apply();

            setTimeout(update, graphUpdateInterval);
        };

    (function() {
        'use strict';

        // Set up namespace.
        DashCast.PROTOCOL = "org.dashif.dashjs";
        DashCast.CHANNEL = "org.dashif.dashjs.channel";

        // Application code.
        function DashCast() {
            this.manifest = null;

            var startVideo = function(url, isLive) {
                    console.log("Loading video: " + url, " | is live: " + isLive);

                    var video = document.querySelector(".dash-video-player video");

                    player = dashjs.MediaPlayer().create();
                    player.initialize(video, url, true)
                    //player.setIsLive(isLive);
                    $scope.showSpinner = false;
                    $scope.showVideo = true;
                    $scope.showStats = true;

                    setTimeout(update, graphUpdateInterval);

                    $scope.$apply();
                },

                endVideo = function () {
                    $scope.showSpinner = true;
                    $scope.showVideo = false;
                    $scope.showStats = false;
                    $scope.$apply();
                },

                onVideoTime = function (e) {
                    var video = document.querySelector(".dash-video-player video"),
                        scrubber = document.querySelector("scrubber");

                    var w = $("#scrubber").width(),
                        p = (video.currentTime / video.duration) * 100;
                    $("#scrubber-content").width(p + "%");
                    console.log("Set current progress: " + video.currentTime + " / " + video.duration + "(" + p + "%)");

                    console.log("Dispatching time updated: " + video.currentTime);
                    broadcast.call(this, {
                        event: 'timeupdate',
                        value: video.currentTime
                    });

                    // TODO : Dash.JS doesn't properly dispatch an end event, so fake it.
                    var t = video.currentTime,
                        d = video.duration;
                    if (t === d) {
                        onVideoEnded.call(this);
                    }
                },

                onVideoDuration = function (e) {
                    var video = document.querySelector(".dash-video-player video");
                    console.log("Dispatching duration changed: " + video.duration);
                    broadcast.call(this, {
                        event: 'durationchange',
                        value: video.duration
                    });
                },

                onVideoEnded = function (e) {
                    endVideo.call(this);
                    console.log("Dispatching video ended.");
                    broadcast.call(this, {
                        event: 'ended'
                    });
                },

                onDashMessage = function (e) {
                    var message = e.message,
                        channel = e.target,
                        video = document.querySelector(".dash-video-player video");

                    console.debug('Message received', JSON.stringify(message));

                    switch (message.command) {
                        case "load":
                            startVideo.call(this, message.manifest, message.isLive);
                            video.addEventListener("timeupdate", onVideoTime.bind(this));
                            video.addEventListener("durationchange", onVideoDuration.bind(this));
                            video.addEventListener("ended", onVideoEnded.bind(this));
                            break;

                        case "play":
                            video.play();
                            break;

                        case "pause":
                            video.pause();
                            break;

                        case "seek":
                            video.currentTime = message.time;
                            break;

                        case "setVolume":
                            video.volume = message.volume;
                            break;

                        case "setMuted":
                            video.muted = message.muted;
                            break;

                        case "toggleStats":
                            $scope.showStats = !$scope.showStats;
                            $scope.$apply();
                            break;
                    }
                },

                onDashOpen = function (e) {
                    console.log("Dash channel opened.");
                },

                onDashClose = function (e) {
                    console.log("Dash channel closed.");
                },

                broadcast = function (message) {
                    message.timestamp = new Date();
                    this.dashHandler.getChannels().forEach(function (channel) {
                        channel.send(message);
                    });
                };

            this.setDashHandler = function (dh) {
                this.dashHandler = dh;

                this.dashHandler.addEventListener(cast.receiver.Channel.EventType.MESSAGE, onDashMessage.bind(this));
                this.dashHandler.addEventListener(cast.receiver.Channel.EventType.OPEN, onDashOpen.bind(this));
                this.dashHandler.addEventListener(cast.receiver.Channel.EventType.CLOSE, onDashClose.bind(this));
            }
        }

        // Expose to public.
        cast.DashCast = DashCast;
    })();

    window.onload = function onLoad() {
        var APP_ID = "75215b49-c8b8-45ae-b0fb-afb39599204e",
            receiver = new cast.receiver.Receiver(APP_ID, [cast.DashCast.PROTOCOL], "", 5);

        var dashCast = new cast.DashCast();

        var dashHandler = new cast.receiver.ChannelHandler(cast.DashCast.PROTOCOL);
        dashHandler.addChannelFactory(receiver.createChannelFactory(cast.DashCast.PROTOCOL));
        dashCast.setDashHandler(dashHandler);

        receiver.start();
    }
}
