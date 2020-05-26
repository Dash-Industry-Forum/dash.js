var app = angular.module('DashCastReceiverApp.controllers',[]);

app.controller('CastReceiverController', ['$scope', 'dashPlayer', function($scope, dashPlayer) {
    // Set up namespace.
    const NAMESPACE = "urn:x-cast:org.dashif.dashjs";

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

    var castPlayer,
        video,
        graphUpdateInterval = 999,

        update = function () {
            var metrics;

            metrics = dashPlayer.getMetricsFor("video");
            if (metrics) {
                $scope.videoBitrate = metrics.bandwidthValue;
                $scope.videoIndex = metrics.bitrateIndexValue;
                $scope.videoPendingIndex = metrics.pendingIndex;
                $scope.videoMaxIndex = metrics.numBitratesValue;
                $scope.videoBufferLength = metrics.bufferLengthValue;
                $scope.videoDroppedFrames = metrics.droppedFramesValue;
            }

            metrics = dashPlayer.getMetricsFor("audio");
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

    this.$onInit = function() {
        var castReceiverManager = cast.receiver.CastReceiverManager.getInstance();
        if (dashPlayer) {
            video = document.querySelector(".dash-video-player video");
            dashPlayer.initialize(this, video);
            castPlayer = new cast.receiver.MediaManager(dashPlayer);
        }
        var customMessageBus = castReceiverManager.getCastMessageBus(NAMESPACE);
        customMessageBus.onMessage = this.onDashMessage;
        castReceiverManager.start();
    }
    
    // -----------------------------------
    // CastReceiver Delegate Methods
    // -----------------------------------

    this.startVideo = function (url, isLive) {
        console.log("Loading video: " + url, " | is live: " + isLive);

        $scope.showSpinner = false;
        $scope.showVideo = true;
        $scope.showStats = true;

        setTimeout(update, graphUpdateInterval);

        $scope.$apply();
    };

    this.endVideo = function () {
        $scope.showSpinner = true;
        $scope.showVideo = false;
        $scope.showStats = false;
        $scope.$apply();
    };

    this.onLoadedMetadata = function (e) {
        if (e.currentTarget) {
            let mediaInfo = castPlayer.getMediaInformation();
            mediaInfo.duration = e.currentTarget.duration;
            castPlayer.setMediaInformation(mediaInfo);
        }
    };

    this.onVideoTime = function (e) {

        var p = (video.currentTime / video.duration) * 100;
        $("#scrubber-content").width(p + "%");
        console.log("Set current progress: " + video.currentTime + " / " + video.duration + "(" + p + "%)");

        console.log("Dispatching time updated: " + video.currentTime);

        // TODO : Dash.JS doesn't properly dispatch an end event, so fake it.
        var t = video.currentTime,
            d = video.duration;
        if (t === d) {
            onVideoEnded.call(this);
        }
    };

    this.onVideoDuration = function (e) {
        console.log("Dispatching duration changed: " + video.duration);
    };

    this.onVideoEnded = function (e) {
        endVideo.call(this);
        console.log("Dispatching video ended.");
    };

    this.getCurrentTime = function () {
        return video.currentTime;
    }

    this.onDashMessage = function (e) {
        var message = e.data && JSON.parse(e.data);

        console.debug('Message received', message);

        if (message) {

            switch (message.type) {
                case "TOGGLE_STATS":
                    $scope.showStats = !$scope.showStats;
                    $scope.$apply();
                    break;
                // here we can implement some other custom messages
            }
        }
    };

}]);
