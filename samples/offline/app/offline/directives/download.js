/* global angular */

angular.module('DashPlayer').
    directive('dashDownload', function ($timeout, DownloadService) {
        return {
            scope: {
                download: '=',
                onLoad: '=',
                onCreated: '='
            },
            templateUrl: 'app/offline/templates/download.html',
            link: function (scope) {

                scope.progressTimer = null;
                scope.downloadProgression = DownloadService.getDownloadProgression(scope.download.id);
                scope.isEnabled = true;

                scope.$watch('download.status', function (newValue) {
                    if (newValue === 'created') {
                      scope.onCreated(scope);
                    }
                    if (newValue === 'started') {
                        scope.updateDownloadProgression();
                    } else {
                        $timeout.cancel(scope.progressTimer);
                    }
                });

                scope.getDownloadProgression = function () {
                    return scope.downloadProgression;
                };

                scope.doPlay = function () {
                    scope.onLoad(scope.download);
                };

                scope.doStop = function () {
                    DownloadService.doStopRecord(scope.download.id);
                };

                scope.doResume = function () {
                    DownloadService.doResumeRecord(scope.download.id);
                };

                scope.doDelete = function () {
                    scope.isEnabled = false;
                    DownloadService.doDeleteRecord(scope.download.id);
                };

                scope.updateDownloadProgression = function () {
                    scope.progressTimer = $timeout(function () {
                        scope.downloadProgression = DownloadService.getDownloadProgression(scope.download.id);
                        scope.updateDownloadProgression();
                    }, 200);
                };

                scope.isDownloadEnabled = function () {
                  return scope.isEnabled;
                };

                scope.canPlay = function () {
                    return scope.download.status === 'stopped' ||
                            scope.download.status === 'finished' ||
                            scope.downloadProgression > 5;
                };

                scope.canStop = function () {
                    return (scope.download.status === 'started');
                };

                scope.canResume = function () {
                    return (scope.download.status === 'stopped');
                };

            }
        };
    });
