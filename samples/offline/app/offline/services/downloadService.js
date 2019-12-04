/* global angular, dashjs */
/* global player:true */

angular.module('DashPlayer').
service('DownloadService', function ($q) {

    player = undefined;
    var downloads = [];

    this.getDownload = function (manifestId) {
        let element = downloads.find((download) => {
            return download.manifestId === manifestId;
        });

        return element;
    };

    this.getDownloads = function () {
        return downloads;
    };

    this.init = function (playerInstance) {
        player = playerInstance;

        player.on(dashjs.MediaPlayer.events.DOWNLOADING_STARTED, (e) => {
            let download = this.getDownload(e.id);
            if (download) {
                download.status = 'started';
            }
        }, this);

        player.on(dashjs.MediaPlayer.events.DOWNLOADING_FINISHED, (e) => {
            let download = this.getDownload(e.id);
            if (download) {
                download.status = 'finished';
            }
        }, this);

        player.on(dashjs.MediaPlayer.events.DOWNLOADING_STOPPED, (e) => {
            let download = this.getDownload(e.id);
            if (download) {
                download.status = 'stopped';
            }
        }, this);


        player.on(dashjs.MediaPlayer.events.ERROR, function (e) { /* jshint ignore:line */
            switch (e.error.code) {
                // offline errors
                case dashjs.MediaPlayer.errors.OFFLINE_ERROR:
                    this.onError(e.error);
                    break;
                case dashjs.MediaPlayer.errors.INDEXEDDB_QUOTA_EXCEED_ERROR:
                case dashjs.MediaPlayer.errors.INDEXEDDB_INVALID_STATE_ERROR:
                case dashjs.MediaPlayer.errors.INDEXEDDB_NOT_READABLE_ERROR:
                case dashjs.MediaPlayer.errors.INDEXEDDB_NOT_FOUND_ERROR:
                case dashjs.MediaPlayer.errors.INDEXEDDB_NETWORK_ERROR:
                case dashjs.MediaPlayer.errors.INDEXEDDB_DATA_ERROR:
                case dashjs.MediaPlayer.errors.INDEXEDDB_TRANSACTION_INACTIVE_ERROR:
                case dashjs.MediaPlayer.errors.INDEXEDDB_NOT_ALLOWED_ERROR:
                case dashjs.MediaPlayer.errors.INDEXEDDB_NOT_SUPPORTED_ERROR:
                case dashjs.MediaPlayer.errors.INDEXEDDB_VERSION_ERROR:
                case dashjs.MediaPlayer.errors.INDEXEDDB_TIMEOUT_ERROR:
                case dashjs.MediaPlayer.errors.INDEXEDDB_ABORT_ERROR:
                case dashjs.MediaPlayer.errors.INDEXEDDB_UNKNOWN_ERROR:
                    console.log(e.message);
                    break;
            }
        }, this);

        this.getAllDownloads();
    };

    this.getAllDownloads = function () {
        let deferred = $q.defer();

        player.getAllDownloads().then(function (items) {
            downloads.splice(0, downloads.length);
            items.manifests.forEach(element => {
                downloads.push(element);
            });
            deferred.resolve(downloads);
        }, function (err) {
            deferred.reject(err);
        });

        return deferred.promise;
    };

    this.doDownload = function (url) {
        let id;
        player.createDownload(url).then((manifestId) => {
            id = manifestId;
            // new download has been created, let's refresh download list
            return this.getAllDownloads();
        }).then(() => {
            // init download
            player.initDownload(id);
        });
    };

    this.doDeleteDownload = function (manifestId) {
        player.deleteDownload(manifestId).then(() => {
            this.getAllDownloads();
        });
    };

    this.doStopDownload = function (manifestId) {
        player.stopDownload(manifestId);
    };

    this.doResumeDownload = function (manifestId) {
        player.resumeDownload(manifestId);
    };

    this.getDownloadProgression = function (manifestId) {
        return player.getDownloadProgression(manifestId);
    };

    this.onError = function (error) {
        let download = this.getDownload(error.data.id);
        if (download) {
            download.status = `error - ${error.message}`;
        }
    };

    return this;
});
