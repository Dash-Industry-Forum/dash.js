
const intern = require('intern').default;
const streams = require('./streams');

const setup = require('./tests/setup');
const play = require('./tests/play');
const playFromTime = require('./tests/playFromTime');
const pause = require('./tests/pause');
const seek = require('./tests/seek');
const seekPeriods = require('./tests/seekPeriods');
const ended = require('./tests/ended');

var registerSuites = function (stream) {
    var suites = intern.config.testSuites || ['playFromTime', 'pause', 'seek', 'seekPeriods', 'ended'];

    setup.register(stream);
    play.register(stream);

    if (suites.indexOf('playFromTime') !== -1) playFromTime.register(stream);
    if (suites.indexOf('pause') !== -1) pause.register(stream);
    if (suites.indexOf('seek') !== -1) seek.register(stream);
    if (suites.indexOf('seek') !== -1) seekPeriods.register(stream);
    if (suites.indexOf('ended') !== -1) ended.register(stream);
};

var streamsArray = streams.getStreams();

for (var i = 0; i < streamsArray.length; i++) {
    var stream = streamsArray[i];
    registerSuites(stream);
}

