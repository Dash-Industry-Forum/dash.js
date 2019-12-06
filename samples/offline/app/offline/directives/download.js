/* global angular */

angular.module('DashPlayer').
    directive('dashDownload', function ($timeout, DownloadService) {
        return {
            scope: {
                download: '=',
                onLoad: '='
            },
            templateUrl: 'app/offline/templates/download.html',
            link: function (scope) {

                scope.progressTimer = null;
                scope.downloadProgression = DownloadService.getDownloadProgression(scope.download.id);

                scope.$watch('download.status', function (newValue) {
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
                    DownloadService.doStopDownload(scope.download.id);
                };

                scope.doResume = function () {
                    DownloadService.doResumeDownload(scope.download.id);
                };

                scope.doDelete = function () {
                    DownloadService.doDeleteDownload(scope.download.id);
                };

                scope.updateDownloadProgression = function () {
                    scope.progressTimer = $timeout(function () {
                        scope.downloadProgression = DownloadService.getDownloadProgression(scope.download.id);
                        scope.updateDownloadProgression();
                    }, 200);
                };

                scope.canPlay = function () {
                    return (scope.download.status === 'stopped') || (scope.download.status === 'finished');
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
