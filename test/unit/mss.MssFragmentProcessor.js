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

    it('should return undefined when generateMoov is called and representation is undefined', () => {
        const moov = mssFragmentProcessor.generateMoov();

        expect(moov).to.be.undefined;  // jshint ignore:line
    });

    it('should return undefined when processFragment is called and e.request is undefined', () => {
        const moof = mssFragmentProcessor.processFragment({});

        expect(moof).to.be.undefined;  // jshint ignore:line
    });

    it('should return undefined when processFragment is called and e.response is undefined', () => {
        const e = {request: {type: 'MediaSegment'}};
        const moof = mssFragmentProcessor.processFragment(e);

        expect(moof).to.be.undefined;  // jshint ignore:line
    });
});