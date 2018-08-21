import Stream from '../../src/streaming/Stream';
import Events from '../../src/core/events/Events';
import EventBus from '../../src/core/EventBus';

import DashManifestModelMock from './mocks/DashManifestModelMock';
import ManifestModelMock from './mocks/ManifestModelMock';

const expect = require('chai').expect;
const sinon = require('sinon');

const context = {};
const eventBus = EventBus(context).getInstance();

describe('Stream', function () {
    const dashManifestModelMock = new DashManifestModelMock();
    const manifestModelMock = new ManifestModelMock();
    const streamInfo = {
        index: 'id'
    };

    it('should return an empty array when getProcessors is called but streamProcessors attribute is an empty array', () => {
        const stream = Stream(context).create({});

        const processors = stream.getProcessors();

        expect(processors).to.be.instanceOf(Array); // jshint ignore:line
        expect(processors).to.be.empty;            // jshint ignore:line
    });

    it('should return an NaN when getId is called but streamInfo attribute is null or undefined', () => {
        const stream = Stream(context).create({});
        const id = stream.getId();

        expect(id).to.be.NaN; // jshint ignore:line
    });

    it('should return an NaN when getStartTime is called but streamInfo attribute is null or undefined', () => {
        const stream = Stream(context).create({});
        const startTime = stream.getStartTime();

        expect(startTime).to.be.NaN;                // jshint ignore:line
    });

    it('should return an NaN when getDuration is called but streamInfo attribute is null or undefined', () => {
        const stream = Stream(context).create({});
        const duration = stream.getDuration();

        expect(duration).to.be.NaN;                // jshint ignore:line
    });

    it('should throw an error when getBitrateListFor is called and config object is not defined', function () {
        const stream = Stream(context).create();
        expect(stream.getBitrateListFor.bind(stream)).to.be.throw('Missing config parameter(s)');
    });

    it('should throw an error when getBitrateListFor is called and config object has not been set properly', function () {
        const stream = Stream(context).create({});
        expect(stream.getBitrateListFor.bind(stream)).to.be.throw('Missing config parameter(s)');
    });

    it('should throw an error when activate is called and config object has not been set properly', function () {
        const stream = Stream(context).create({});
        expect(stream.activate.bind(stream)).to.be.throw('Missing config parameter(s)');
    });

    it('should return null when isCompatibleWithStream is called but stream attribute is undefined', () => {
        const stream = Stream(context).create({});
        const isCompatible = stream.isCompatibleWithStream();

        expect(isCompatible).to.be.false;                // jshint ignore:line
    });

    it('should not call STREAM_INITIALIZED event if initializeMedia has not been called when updateData is called', () => {
        const spy = sinon.spy();

        eventBus.on(Events.STREAM_INITIALIZED, spy);

        const stream = Stream(context).create({dashManifestModel: dashManifestModelMock,
                                               manifestModel: manifestModelMock});
        stream.updateData(streamInfo);

        expect(spy.notCalled).to.be.true;                // jshint ignore:line

        eventBus.off(Events.STREAM_INITIALIZED, spy);
    });
});