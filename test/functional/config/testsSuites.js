define(function () {

    var PLAY_TESTS = [
        'test/functional/tests/play/play',
    ];

    var PAUSE_TESTS = [
        'test/functional/tests/play/pause'
    ];

    var SEEK_TESTS = [
        'test/functional/tests/play/seek'
    ];

    var ALL_TESTS = PLAY_TESTS.concat(PAUSE_TESTS, SEEK_TESTS);

    return {
        all: ALL_TESTS,
        play: PLAY_TESTS,
        pause: PAUSE_TESTS,
        seek: SEEK_TESTS
    };
});
