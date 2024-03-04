
const intern = require('intern').default;
const streams = require('./streams.cjs');

const setup = require('./tests/setup.cjs');
const play = require('./tests/play.cjs');
const playFromTime = require('./tests/playFromTime.cjs');
const pause = require('./tests/pause.cjs');
const seek = require('./tests/seek.cjs');
const seekPeriods = require('./tests/seekPeriods.cjs');
const audioSwitch = require('./tests/audioSwitch.cjs');
const textSwitch = require('./tests/textSwitch.cjs');
const initialAudio = require('./tests/initialAudio.cjs');
const initialText = require('./tests/initialText.cjs');
const liveDelay = require('./tests/liveDelay.cjs');
const ended = require('./tests/ended.cjs');

var registerSuites = function (stream) {
    var suites = intern.config.testSuites || ['playFromTime', 'pause', 'seek', 'seekPeriods', 'audioSwitch', 'textSwitch','initialAudio' , 'initialText', 'liveDelay','ended'];
  
    setup.register(stream);
    play.register(stream);

    if (suites.indexOf('playFromTime') !== -1) playFromTime.register(stream);
    if (suites.indexOf('pause') !== -1) pause.register(stream);
    if (suites.indexOf('seek') !== -1) seek.register(stream);
    if (suites.indexOf('seekPeriods') !== -1) seekPeriods.register(stream);
    if (suites.indexOf('audioSwitch') !== -1) audioSwitch.register(stream);
    if (suites.indexOf('textSwitch') !== -1) textSwitch.register(stream);
    if (suites.indexOf('initialAudio') !== -1) initialAudio.register(stream);
    if (suites.indexOf('initialText') !== -1) initialText.register(stream);
    if (suites.indexOf('liveDelay') !== -1) liveDelay.register(stream);
    if (suites.indexOf('ended') !== -1) ended.register(stream);
};

var streamsArray = streams.getStreams();

for (var i = 0; i < streamsArray.length; i++) {
    var stream = streamsArray[i];
    registerSuites(stream);
}

