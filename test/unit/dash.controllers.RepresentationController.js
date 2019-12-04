import ObjectsHelper from './helpers/ObjectsHelper';
import VoHelper from './helpers/VOHelper';
import MpdHelper from './helpers/MPDHelper';
import EventBus from '../../src/core/EventBus';
import RepresentationController from '../../src/dash/controllers/RepresentationController';
import ManifestModel from '../../src/streaming/models/ManifestModel';
import Events from '../../src/core/events/Events';
import MediaPlayerEvents from '../../src/streaming/MediaPlayerEvents';
import Constants from '../../src/streaming/constants/Constants';

import SpecHelper from './helpers/SpecHelper';

import AbrControllerMock from './mocks/AbrControllerMock';
import PlaybackControllerMock from './mocks/PlaybackControllerMock';
import DashMetricsMock from './mocks/DashMetricsMock';

const chai = require('chai');
const spies = require('chai-spies');

chai.use(spies);

const expect = chai.expect;
const voHelper = new VoHelper();
const objectsHelper = new ObjectsHelper();

describe('RepresentationController', function () {
    // Arrange
    const context = {};
    const testType = 'video';
    const specHelper = new SpecHelper();
    const mpdHelper = new MpdHelper();
    const mpd = mpdHelper.getMpd('static');
    const data = mpd.Period_asArray[0].AdaptationSet_asArray[0];
    const voRepresentations = [];
    voRepresentations.push(voHelper.getDummyRepresentation(testType, 0), voHelper.getDummyRepresentation(testType, 1), voHelper.getDummyRepresentation(testType, 2));
    const streamProcessor = objectsHelper.getDummyStreamProcessor(testType);
    const eventBus = EventBus(context).getInstance();
    const manifestModel = ManifestModel(context).getInstance();
    const timelineConverter = objectsHelper.getDummyTimelineConverter();

    Events.extend(MediaPlayerEvents);

    manifestModel.setValue(mpd);

    const abrControllerMock = new AbrControllerMock();
    const playbackControllerMock = new PlaybackControllerMock();
    const dashMetricsMock = new DashMetricsMock();

    abrControllerMock.registerStreamType();

    const representationController = RepresentationController(context).create();

    describe('SetConfig not previously called', function () {
        it('should not contain data before it is set', function () {
            // Act
            const data = representationController.getData();

            // Assert
            expect(data).not.exist; // jshint ignore:line
        });

        it('should throw an exception when attempting to call updateData while setConfig has not been called properly', function () {
            expect(representationController.updateData.bind(representationController)).to.throw(Constants.MISSING_CONFIG_ERROR);
        });
    });

    describe('SetConfig previously called', function () {
        beforeEach(function () {
            representationController.setConfig({
                abrController: abrControllerMock,
                manifestModel: manifestModel,
                timelineConverter: timelineConverter,
                playbackController: playbackControllerMock,
                dashMetrics: dashMetricsMock,
                type: testType,
                streamId: streamProcessor.getStreamInfo().id
            });
        });

        describe('when data update started', function () {
            let spy;

            beforeEach(function () {
                spy = chai.spy();
                eventBus.on(Events.DATA_UPDATE_STARTED, spy);
            });

            afterEach(function () {
                eventBus.off(Events.DATA_UPDATE_STARTED, spy);
            });

            it('should fire dataUpdateStarted event when new data is set', function () {
                // Act
                representationController.updateData(data, voRepresentations, testType, 0);

                // Assert
                expect(spy).to.have.been.called.exactly(1);
            });
        });

        describe('when data update completed', function () {
            beforeEach(function (done) {
                representationController.updateData(data, voRepresentations, testType, 0);
                setTimeout(function () {
                    done();
                }, specHelper.getExecutionDelay());
            });

            it('should return the data that was set', function () {
                expect(representationController.getData()).to.equal(data);
            });

            it('should return correct representation for quality', function () {
                const quality = 0;
                const expectedValue = 0;

                expect(representationController.getRepresentationForQuality(quality).index).to.equal(expectedValue);
            });

            it('should return null if quality is undefined', function () {
                expect(representationController.getRepresentationForQuality()).to.equal(null);
            });

            it('should return null if quality is greater than voAvailableRepresentations.length - 1', function () {
                expect(representationController.getRepresentationForQuality(150)).to.equal(null);
            });

            it('when a MANIFEST_VALIDITY_CHANGED event occurs, should update current representation', function () {
                let currentRepresentation = representationController.getCurrentRepresentation();
                expect(currentRepresentation.adaptation.period.duration).to.equal(100); // jshint ignore:line
                eventBus.trigger(Events.MANIFEST_VALIDITY_CHANGED, { sender: {}, newDuration: 150 });

                expect(currentRepresentation.adaptation.period.duration).to.equal(150); // jshint ignore:line
            });

            it('when a WALLCLOCK_TIME_UPDATED event occurs, should update availability window for dynamic content', function () {
                const firstRepresentation = representationController.getRepresentationForQuality(0);

                expect(firstRepresentation.segmentAvailabilityRange.start).to.equal(undefined); // jshint ignore:line
                expect(firstRepresentation.segmentAvailabilityRange.end).to.equal(undefined); // jshint ignore:line

                timelineConverter.setRange({start: 0, end: 4});

                eventBus.trigger(Events.WALLCLOCK_TIME_UPDATED, {
                    isDynamic: true,
                    time: new Date()
                });

                expect(firstRepresentation.segmentAvailabilityRange.start).to.equal(0); // jshint ignore:line
                expect(firstRepresentation.segmentAvailabilityRange.end).to.equal(4); // jshint ignore:line
            });

            it('when a QUALITY_CHANGE_REQUESTED event occurs, should update current representation', function () {
                let currentRepresentation = representationController.getCurrentRepresentation();
                expect(currentRepresentation.index).to.equal(0); // jshint ignore:line

                eventBus.trigger(Events.QUALITY_CHANGE_REQUESTED, {mediaType: testType, streamInfo: streamProcessor.getStreamInfo(), oldQuality: 0, newQuality: 1});

                currentRepresentation = representationController.getCurrentRepresentation();
                expect(currentRepresentation.index).to.equal(1); // jshint ignore:line
            });

            it('when a REPRESENTATION_UPDATE_COMPLETED event occurs, should notify data update completed', function () {
                let spy = chai.spy();
                eventBus.on(Events.DATA_UPDATE_COMPLETED, spy);

                eventBus.trigger(Events.REPRESENTATION_UPDATE_COMPLETED, {sender: { getType() { return testType;}, getStreamInfo() { return streamProcessor.getStreamInfo(); }}, representation: voRepresentations[1]});
                expect(spy).to.have.been.called.exactly(1);
            });
        });

        describe('when a call to reset is done', function () {
            it('should not contain data after a call to reset', function () {
                representationController.reset();
                // Act
                const data = representationController.getData();

                // Assert
                expect(data).not.exist; // jshint ignore:line
            });
        });
    });
});
