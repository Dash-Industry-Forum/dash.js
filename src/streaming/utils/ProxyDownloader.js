/**
 * @namespace MediaPlayer.utils.ProxyDownloader
 *
 */
MediaPlayer.utils.ProxyDownloader = function () {
    "use strict";
  
  var serverUrls = null;
  var access_token = null;
  
  return {
    setup: function(urls) {
      serverUrls = urls;
    },
    inUse: function() {
      return serverUrls !== null;
    },
    loadManifestMap: function(manifest, callback) {
      var req = new XMLHttpRequest();
      req.open("GET", serverUrls.map, true);
      req.onload = function() {
        if (this.status != 200) {
          return;
        }
        
        var data = JSON.parse(req.responseText);
        access_token = data.access_token;
        
        var adaptationSets = manifest.Period.AdaptationSet;
        var mappedObj = null;
        for (var i = 0; i < adaptationSets.length; i++) {
          var representation = adaptationSets[i].Representation;
          if (Object.prototype.toString.call(representation) === '[object Array]') {
            for (var j = 0; j < representation.length; j++) {
              representation[j].BaseURL = representation[j].BaseURL.replace(adaptationSets[i].BaseURL, '');
              mappedObj = data.mapping.filter(function(obj) {
                return obj.originalFilename === representation[j].BaseURL;
              })[0];
              representation[j].BaseURL = mappedObj.downloadUrl;
            }
          } else {
            representation.BaseURL = representation.BaseURL.replace(adaptationSets[i].BaseURL, '');
            mappedObj = data.mapping.filter(function(obj) {
              return obj.originalFilename === representation.BaseURL;
            })[0];
            representation.BaseURL = mappedObj.downloadUrl;
          }
        }
        callback(manifest);
      };
      
      req.send(null);
    },
    getAccessToken: function() {
      return access_token;
    },
    refreshAccessToken: function(callback) {
      var req = new XMLHttpRequest();
      req.open("GET", serverUrls.token, true);
      req.onload = function() {
        if (this.status != 200) {
          return;
        }
        var data = JSON.parse(req.responseText);
        access_token = data.access_token;
        callback(access_token);
      };
      req.send(null);
    }
  };
};
