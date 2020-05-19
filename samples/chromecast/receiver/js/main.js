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
        castPlayer,
        graphUpdateInterval = 999,

        getMetricsFor = function (type) {
            var video = document.querySelector(".dash-video-player video"),
                dashMetrics = player.getDashMetrics(),
                dashAdapter = player.getDashAdapter(),
                repSwitch,
                bufferLevel,
                httpRequest,
                droppedFramesMetrics,
                bitrateIndexValue,
                bandwidthValue,
                pendingValue,
                numBitratesValue,
                bufferLengthValue = 0,
                lastFragmentDuration,
                lastFragmentDownloadTime,
                droppedFramesValue = 0;

            if (dashMetrics) {
                repSwitch = dashMetrics.getCurrentRepresentationSwitch(type, true);
                bufferLengthValue = dashMetrics.getCurrentBufferLevel(type, true);
                httpRequest = dashMetrics.getCurrentHttpRequest(type, true);
                droppedFramesMetrics = dashMetrics.getCurrentDroppedFrames();

                if (repSwitch !== null) {
                    bitrateIndexValue = dashAdapter.getIndexForRepresentation(repSwitch.to);
                    bandwidthValue = dashAdapter.getBandwidthForRepresentation(repSwitch.to);
                    bandwidthValue = bandwidthValue / 1000;
                    bandwidthValue = Math.round(bandwidthValue);
                }

                numBitratesValue = dashAdapter.getMaxIndexForBufferType(type);

                if (httpRequest !== null) {
                    lastFragmentDuration = httpRequest._mediaduration;
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

                if (isNaN(numBitratesValue) || numBitratesValue === undefined || numBitratesValue === -1) {
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
        // DashService.PROTOCOL = "org.dashif.dashjs";
        // DashService.CHANNEL = "org.dashif.dashjs.channel";

        // Application code.
        class DashService {

            constructor () {
                this.video = document.querySelector(".dash-video-player video");
            }

            startVideo (url, isLive) {
                console.log("Loading video: " + url, " | is live: " + isLive);

                player = dashjs.MediaPlayer().create();
                player.initialize(this.video, url, true)
                //player.setIsLive(isLive);
                $scope.showSpinner = false;
                $scope.showVideo = true;
                $scope.showStats = true;

                setTimeout(update, graphUpdateInterval);

                this.video.addEventListener("loadedmetadata", this.onLoadedMetadata.bind(this));
                this.video.addEventListener("timeupdate", this.onVideoTime.bind(this));
                this.video.addEventListener("durationchange", this.onVideoDuration.bind(this));
                this.video.addEventListener("ended", this.onVideoEnded.bind(this));

                $scope.$apply();
            }

            endVideo () {
                $scope.showSpinner = true;
                $scope.showVideo = false;
                $scope.showStats = false;
                $scope.$apply();
            }

            onLoadedMetadata (e) {
                if (e.currentTarget) {
                    let mediaInfo = castPlayer.getMediaInformation();
                    mediaInfo.duration = e.currentTarget.duration;
                    castPlayer.setMediaInformation(mediaInfo);
                }
            }

            onVideoTime (e) {
                var video = document.querySelector(".dash-video-player video"),
                    scrubber = document.querySelector("scrubber");

                var w = $("#scrubber").width(),
                    p = (video.currentTime / video.duration) * 100;
                $("#scrubber-content").width(p + "%");
                console.log("Set current progress: " + video.currentTime + " / " + video.duration + "(" + p + "%)");

                console.log("Dispatching time updated: " + video.currentTime);
                /* broadcast.call(this, {
                    event: 'timeupdate',
                    value: video.currentTime
                }); */

                // TODO : Dash.JS doesn't properly dispatch an end event, so fake it.
                var t = video.currentTime,
                    d = video.duration;
                if (t === d) {
                    onVideoEnded.call(this);
                }
            }

            onVideoDuration (e) {
                var video = document.querySelector(".dash-video-player video");
                console.log("Dispatching duration changed: " + video.duration);

                /*broadcast.call(this, {
                    event: 'durationchange',
                    value: video.duration
                });*/
            }

            onVideoEnded (e) {
                endVideo.call(this);
                console.log("Dispatching video ended.");
                /* broadcast.call(this, {
                    event: 'ended'
                });
                */
            }

            play () {
                this.video.play();
            }

            pause () {
                this.video.pause();
            }

            reset () {
                player.reset();
            }

            seek (time) {
                player.seek(time);
            }

            getCurrentTime () {
                return this.video.currentTime;
            }

            getDuration () {
                return player.duration();
            }

            onDashMessage (e) {
                var message = e.message,
                    channel = e.target,
                    video = document.querySelector(".dash-video-player video");

                console.debug('Message received', JSON.stringify(message));

                switch (message.command) {

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
            }

            onDashOpen  (e) {
                console.log("Dash channel opened.");
            }

            onDashClose (e) {
                console.log("Dash channel closed.");
            }

            broadcast (message) {
                message.timestamp = new Date();
                this.dashHandler.getChannels().forEach(function (channel) {
                    channel.send(message);
                });
            }
        }
        // Expose to public.
        cast.DashService = DashService;
    })();

    window.onload = function onLoad() {
        window.mediaElement = document.getElementById('media');
        window.mediaManager = new cast.receiver.MediaManager(window.mediaElement);
        window.castReceiverManager = cast.receiver.CastReceiverManager.getInstance();
        var dashService = new cast.DashService();
        var dashCastPlayer = new DashCastPlayer(dashService);
        castPlayer = new cast.receiver.MediaManager(dashCastPlayer);
        window.castReceiverManager.start();
    }
}
