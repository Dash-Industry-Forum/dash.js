/* global angular, dashjs */
/* global player:true */

angular.module('DashPlayer').
service('DownloadService', function () {

    player = undefined;
    let offlineController = undefined;
    let records = [];

    this.getRecord = function (id) {
        let element = records.find((record) => {
            return record.id === id;
        });

        return element;
    };

    this.getDownloads = function () {
        return records;
    };

    this.init = function (playerInstance) {
        player = playerInstance;
        offlineController = player.getOfflineController();

        player.on(dashjs.MediaPlayer.events.OFFLINE_RECORD_STARTED, (e) => {
            let record = this.getRecord(e.id);
            if (record) {
                record.status = 'started';
            }
        }, this);

        player.on(dashjs.MediaPlayer.events.OFFLINE_RECORD_FINISHED, (e) => {
            let record = this.getRecord(e.id);
            if (record) {
                record.status = 'finished';
            }
        }, this);

        player.on(dashjs.MediaPlayer.events.OFFLINE_RECORD_STOPPED, (e) => {
            let record = this.getRecord(e.id);
            if (record) {
                record.status = 'stopped';
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

        offlineController.loadRecordsFromStorage().then(() => {
            this.getAllRecords();
        });
    };

    this.getAllRecords = function () {
        records.splice(0, records.length);
        offlineController.getAllRecords().forEach(element => {
            records.push(element);
        });
    };

    this.doDownload = function (url) {
        offlineController.createRecord(url).then((id) => {
            id = id;
            // new record has been created, let's refresh record list
            this.getAllRecords();
        });
    };

    this.doDeleteRecord = function (id) {
        offlineController.deleteRecord(id).then(() => {
            this.getAllRecords();
        });
    };

    this.doStopRecord = function (id) {
        offlineController.stopRecord(id);
    };

    this.doResumeRecord = function (id) {
        offlineController.resumeRecord(id);
    };

    this.getDownloadProgression = function (id) {
        return offlineController.getRecordProgression(id);
    };

    this.onError = function (error) {
        let record = this.getRecord(error.data.id);
        if (record) {
            record.status = `error - ${error.message}`;
        }
    };

    return this;
});
