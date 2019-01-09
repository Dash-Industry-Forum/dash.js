angular.module('DashPlayer').
  directive('dashDownload', function($timeout, DownloadService) {
   return {
      scope: {
        download: '=',
        onLoad: '=',
      },
      templateUrl: 'app/offline/templates/download.html',
      link: function (scope) {

        scope.progressTimer;
        scope.downloadProgression = 0;

        scope.$watch('download.status', function(newValue, oldValue) {
          if (newValue === 'started') {
            scope.updateDownloadProgression()
          } else {
            $timeout.cancel(scope.progressTimer);
          }
        });

        scope.getDownloadProgression = function () {
          return scope.downloadProgression;
        }

        scope.doPlay =  function(){
          scope.onLoad(scope.download);
        }

        scope.doStop = function () {
          DownloadService.doStopDownload(scope.download.manifestId)
        }

        scope.doResume = function () {
          DownloadService.doResumeDownload(scope.download.manifestId)
        }

        scope.doDelete =  function(){
          DownloadService.doDeleteDownload(scope.download.manifestId);
        }

        scope.updateDownloadProgression = function () {
          scope.progressTimer = $timeout(function () {
            scope.downloadProgression = DownloadService.getDownloadProgression(scope.download.manifestId);
            scope.updateDownloadProgression();
          }, 200);
        }

        scope.canPlay = function () {
          return (scope.download.status === 'stopped') || (scope.download.status === 'finished');
        }

        scope.canStop = function () {
          return (scope.download.status === 'started');
        }

        scope.canResume = function () {
          return (scope.download.status === 'stopped');
        }

      }
    };
});
