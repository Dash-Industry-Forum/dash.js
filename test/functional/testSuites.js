
const intern = require('intern').default;
const streams = require('./streams');

const setup = require('./tests/setup');
const play = require('./tests/play');
const playFromTime = require('./tests/playFromTime');
const pause = require('./tests/pause');
const seek = require('./tests/seek');
const seekPeriods = require('./tests/seekPeriods');
const audioSwitch = require('./tests/audioSwitch');
const textSwitch = require('./tests/textSwitch');
const initialAudio = require('./tests/initialAudio');
const ended = require('./tests/ended');

let registerSuites = function (stream) {
    let suites = intern.config.testSuites || ['playFromTime', 'pause', 'seek', 'seekPeriods', 'audioSwitch', 'textSwitch','initialAudio' , 'ended'];

    setup.register(stream);
    play.register(stream);

    if (suites.indexOf('playFromTime') !== -1) playFromTime.register(stream);
    if (suites.indexOf('pause') !== -1) pause.register(stream);
    if (suites.indexOf('seek') !== -1) seek.register(stream);
    if (suites.indexOf('seekPeriods') !== -1) seekPeriods.register(stream);
    if (suites.indexOf('audioSwitch') !== -1) audioSwitch.register(stream);
    if (suites.indexOf('textSwitch') !== -1) textSwitch.register(stream);
    if (suites.indexOf('initialAudio') !== -1) initialAudio.register(stream);
    if (suites.indexOf('ended') !== -1) ended.register(stream);
};

let streamsArray = streams.getStreams();

for (let i = 0; i < streamsArray.length; i++) {
    let stream = streamsArray[i];
    registerSuites(stream);
}

