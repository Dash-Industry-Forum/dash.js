MediaPlayer.utils.CaptionFileLoader = function () {
    "use strict";

    var ERROR_TEXT = "Error loading caption file";

    return {
        load: function(url) {

            var deferred = Q.defer(),
                request = new XMLHttpRequest();

            request.onload = function () {
                if (this.status != 200) {
                    deferred.reject(ERROR_TEXT);
                } else {
                    deferred.resolve(request.response);
                }
            };

            request.onerror = function () {
                deferred.reject(ERROR_TEXT);
            };

            request.open("GET", url, true);
            request.send(null);

            return deferred.promise;
        }
    };
};

MediaPlayer.utils.CaptionFileLoader.prototype.constructor = MediaPlayer.utils.CaptionFileLoader;
