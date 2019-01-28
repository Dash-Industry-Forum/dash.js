define([
    'test/functional/config/streams',
    'test/functional/tests/setup',
    'test/functional/tests/play',
    'test/functional/tests/pause',
    'test/functional/tests/seek'
], function(streams,
            setup,
            play,
            pause,
            seek) {

    var registerSuites = function (stream) {
        setup.register(stream);
        play.register(stream);    
        // pause.register(stream);    
        seek.register(stream);    
    };

    for (var i = 0; i < streams.items.length; i++) {
        var stream = streams.items[i];
        registerSuites(stream);
    }
});
