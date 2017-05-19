define(function () {

    var PLAY_TESTS = [
        'test/functional/tests/play/play',
        'test/functional/tests/play/zappingVod',
        'test/functional/tests/play/seek',
        'test/functional/tests/play/pause'
    ];

    var ALL = PLAY_TESTS;
    var PLAY = PLAY_TESTS;

    return {
        all: ALL,

        play: PLAY,
    };
});
