let CACHE_NAME = 'static-cache';
let urlsToCache = [
    'index.html',
    'manifest.json',
    'app/css/main.css',
    'app/img/icons/48x48.png',
    'app/img/icons/64x64.png',
    'app/img/icons/96x96.png',
    'app/img/icons/256x256.png',
    'app/img/akamai.png',
    'app/img/brightcove.png',
    'app/img/cablelabs.png',
    'app/img/dp.png',
    'app/img/edgeware.png',
    'app/img/epiclabs.png',
    'app/img/fh_fokus.png',
    'app/img/if.jpg',
    'app/img/if.png',
    'app/img/minus.png',
    'app/img/MSOpenTech.jpg',
    'app/img/pause.png',
    'app/img/play.png',
    'app/img/plus.png',
    'app/img/youtube.png',
    'app/img/icons/48x48.png',
    'app/img/icons/64x64.png',
    'app/img/icons/96x96.png',
    'app/img/icons/256x256.png',
    'app/lib/angular/angular-flot.js',
    'app/lib/angular/angular-resource.min.js',
    'app/lib/angular/angular.min.js',
    'app/lib/bootstrap/css/bootstrap-glyphicons.css',
    'app/lib/bootstrap/css/bootstrap-theme.css',
    'app/lib/bootstrap/css/bootstrap-theme.min.css',
    'app/lib/bootstrap/css/bootstrap.min.css',
    'app/lib/bootstrap/fonts/glyphicons-halflings-regular.eot',
    'app/lib/bootstrap/fonts/glyphicons-halflings-regular.svg',
    'app/lib/bootstrap/fonts/glyphicons-halflings-regular.ttf',
    'app/lib/bootstrap/fonts/glyphicons-halflings-regular.woff',
    'app/lib/bootstrap/js/bootstrap.min.js',
    'app/lib/flot/jquery.flot.axislabels.js',
    'app/lib/flot/jquery.flot.min.js',
    'app/lib/flot/jquery.flot.resize.min.js',
    'app/lib/jquery/jquery-3.1.1.min.js',
    'app/lib/jquery/jquery-3.1.1.min.map',
    'app/rules/DownloadRatioRule.js',
    'app/rules/ThroughputRule.js',
    'app/contributors.json',
    'app/main.js',
    '../dash-if-reference-player/app/sources.json',
    '../../contrib/akamai/controlbar/controlbar.css',
    '../../contrib/akamai/controlbar/ControlBar.js',
    '../../contrib/akamai/controlbar/icomoon.ttf',
    'http://dashif.org/wp-content/uploads/2014/12/dashif.ico',
    '../../dist/dash.all.debug.js',
    '../../dist/dash.mss.debug.js'
]

self.addEventListener('install',
    function (event) {
        event.waitUntil(
            caches.open(CACHE_NAME).then(function (cache) {
                return cache.addAll(urlsToCache);
            }).then(function () {
                console.log('cache.addAll successfull !');
            }).catch (function (err) {
                console.log('err : ' + err);
            })
        );
    });

self.addEventListener('fetch',
function (event) {
    event.respondWith(
        caches.match(event.request).then(function (response) {
            return response || fetch(event.request);
        }).catch(function (err) {
            console.log('err : ' + err);
        })
    );
});
