import MssFragmentProcessor from '../../src/mss/MssFragmentProcessor';
import MetricsModel from '../../src/streaming/models/MetricsModel';
import PlaybackController from '../../src/streaming/controllers/PlaybackController';
import EventBus from '../../src/core/EventBus';
import ISOBoxer from 'codem-isoboxer';

const expect = require('chai').expect;

const context = {};
const metricsModel = MetricsModel(context).getInstance();
const playbackController = PlaybackController(context).getInstance();
const eventBus = EventBus(context).getInstance();
const mssFragmentProcessor = MssFragmentProcessor(context).create({metricsModel: metricsModel, playbackController: playbackController, eventBus: eventBus, ISOBoxer: ISOBoxer});

describe('MssFragmentProcessor', function () {


    it('should throw an exception when attempting to call processFragment and e is undefined', () => {
        expect(mssFragmentProcessor.processFragment.bind(mssFragmentProcessor)).to.throw('e parameter is missing or malformed');
    });

    it('should throw an exception when attempting to call processFragment and e.request is undefined', () => {
        expect(mssFragmentProcessor.processFragment.bind(mssFragmentProcessor, {})).to.throw('e parameter is missing or malformed');
    });

    it('should throw an exception when attempting to call processFragment and e.response is undefined', () => {
        expect(mssFragmentProcessor.processFragment.bind(mssFragmentProcessor, {request: {type: 'MediaSegment'}})).to.throw('e parameter is missing or malformed');
    });

    });
});