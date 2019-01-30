define([
    'intern',
    'test/functional/config/streams',
    'test/functional/tests/setup',
    'test/functional/tests/play',
    'test/functional/tests/pause',
    'test/functional/tests/seek'
], function(intern,
            streams,
            setup,
            play,
            pause,
            seek) {

    var registerSuites = function (stream) {
        var suites = intern.config.suites || ['play', 'pause', 'seek'];

        setup.register(stream);

        if (suites.indexOf('play') !== -1) play.register(stream);
        if (suites.indexOf('pause') !== -1) pause.register(stream);
        if (suites.indexOf('seek') !== -1) seek.register(stream);
    };

    for (var i = 0; i < streams.items.length; i++) {
        var stream = streams.items[i];
        registerSuites(stream);
    }
});
