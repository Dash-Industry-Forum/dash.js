import MssFragmentProcessor from '../../src/mss/MssFragmentProcessor';
import MetricsModel from '../../src/streaming/models/MetricsModel';
import PlaybackController from '../../src/streaming/controllers/PlaybackController';
import EventBus from '../../src/core/EventBus';
import ErrorHandlerMock from './mocks/ErrorHandlerMock';
import StreamProcessorMock from './mocks/StreamProcessorMock';
import DebugMock from './mocks/DebugMock';
import ISOBoxer from 'codem-isoboxer';

const expect = require('chai').expect;
const fs = require('fs');

const context = {};
const metricsModel = MetricsModel(context).getInstance();
const playbackController = PlaybackController(context).getInstance();
const eventBus = EventBus(context).getInstance();
const errorHandlerMock = new ErrorHandlerMock();
const mssFragmentProcessor = MssFragmentProcessor(context).create({metricsModel: metricsModel,
    playbackController: playbackController, eventBus: eventBus, ISOBoxer: ISOBoxer,
    errHandler: errorHandlerMock, debug: new DebugMock()});

describe('MssFragmentProcessor', function () {
    const testType = 'video';
    const streamInfo = {
        id: 'id'
    };
    const streamProcessorMock = new StreamProcessorMock(testType, streamInfo);

    it('should throw an exception when attempting to call processFragment and e is undefined', () => {
        expect(mssFragmentProcessor.processFragment.bind(mssFragmentProcessor)).to.throw('e parameter is missing or malformed');
    });

    it('should throw an exception when attempting to call processFragment and e.request is undefined', () => {
        expect(mssFragmentProcessor.processFragment.bind(mssFragmentProcessor, {})).to.throw('e parameter is missing or malformed');
    });

    it('should throw an exception when attempting to call processFragment and e.response is undefined', () => {
        expect(mssFragmentProcessor.processFragment.bind(mssFragmentProcessor, {request: {type: 'MediaSegment'}})).to.throw('e parameter is missing or malformed');
    });

    it('should throw an error when attempting to call processFragment for mp4 media live segment without tfrf box', () => {
        const file = fs.readFileSync(__dirname + '/data/mss/mss_moof_tfdt.mp4');
        const arrayBuffer = new Uint8Array(file).buffer;
        const e = {request: {type: 'MediaSegment', mediaInfo: {index: 0}}, response: arrayBuffer};
        mssFragmentProcessor.processFragment(e, streamProcessorMock);
        expect(errorHandlerMock.error).to.equal('MSS_NO_TFRF : Missing tfrf in live media segment');
    });
});