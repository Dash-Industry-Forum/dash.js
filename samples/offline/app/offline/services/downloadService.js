angular.module('DashPlayer').
service('DownloadService', function ($q) {

    player = undefined;
    var downloads = [];

    this.getDownload = function (manifestId) {
        let element = downloads.find((download) => {
            return download.manifestId === manifestId;
        });

        return element;
    }

    this.getDownloads = function () {
        return downloads;
    }

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

        this.getAllRecords();
    }

    this.getAllRecords = function () {
        let deferred = $q.defer();

        player.getAllRecords().then(function (items) {
            downloads.splice(0, downloads.length);
            items.manifests.forEach(element => {
                downloads.push(element);
            });
            deferred.resolve(downloads);
        });

        return deferred.promise;
    };

    this.doDownload = function (url) {
        player.record(url).then(() => {
            this.getAllRecords();
        });
    }

    this.doDeleteDownload = function (manifestId) {
        player.deleteDownload(manifestId).then(() => {
            this.getAllRecords();
        });
    }

    this.doStopDownload = function (manifestId) {
        player.stopDownload(manifestId)
    }

    this.doResumeDownload = function (manifestId) {
        player.resumeDownload(manifestId)
    }

    this.getDownloadProgression = function (manifestId) {
        return player.getDownloadProgression(manifestId)
    }

    return this;
});
