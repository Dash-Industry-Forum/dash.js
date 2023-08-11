import ObjectsHelper from './helpers/ObjectsHelper.js';
import VoHelper from './helpers/VOHelper.js';
import MpdHelper from './helpers/MPDHelper.js';
import EventBus from '../../src/core/EventBus.js';
import RepresentationController from '../../src/dash/controllers/RepresentationController.js';
import Events from '../../src/core/events/Events.js';
import MediaPlayerEvents from '../../src/streaming/MediaPlayerEvents.js';
import DashConstants from '../../src/dash/constants/DashConstants.js';
import SpecHelper from './helpers/SpecHelper.js';
import AbrControllerMock from './mocks/AbrControllerMock.js';
import PlaybackControllerMock from './mocks/PlaybackControllerMock.js';
import DashMetricsMock from './mocks/DashMetricsMock.js';
import AdapterMock from './mocks/AdapterMock.js';
import SegmentsControllerMock from './mocks/SegmentsControllerMock.js';

import chai from 'chai';
import spies from 'chai-spies';

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
    const data = mpd.Period[0].AdaptationSet[0];
    const voRepresentations = [];
    voRepresentations.push(voHelper.getDummyRepresentation(testType, 0), voHelper.getDummyRepresentation(testType, 1), voHelper.getDummyRepresentation(testType, 2));
    const streamProcessor = objectsHelper.getDummyStreamProcessor(testType);
    const eventBus = EventBus(context).getInstance();
    const timelineConverter = objectsHelper.getDummyTimelineConverter();

    Events.extend(MediaPlayerEvents);

    const abrControllerMock = new AbrControllerMock();
    const playbackControllerMock = new PlaybackControllerMock();
    const dashMetricsMock = new DashMetricsMock();
    const adapterMock = new AdapterMock();
    const segmentsController = new SegmentsControllerMock();

    let representationController;

    describe('Config not correctly passed', function () {
        beforeEach(function () {
            representationController = RepresentationController(context).create({
                streamInfo: streamProcessor.getStreamInfo(),
                events: Events,
                eventBus: eventBus
            });
        });

        afterEach(function () {
            representationController.reset();
            representationController = null;
        });
        it('should not contain data before it is set', function () {
            // Act
            const data = representationController.getData();

            // Assert
            expect(data).not.exist; // jshint ignore:line
        });

    });

    describe('Config correctly passed', function () {
        beforeEach(function () {
            representationController = RepresentationController(context).create({
                streamInfo: streamProcessor.getStreamInfo(),
                abrController: abrControllerMock,
                segmentsController,
                timelineConverter: timelineConverter,
                playbackController: playbackControllerMock,
                dashMetrics: dashMetricsMock,
                type: testType,
                events: Events,
                eventBus: eventBus,
                dashConstants: DashConstants,
                adapter: adapterMock
            });
        });

        afterEach(function () {
            representationController.reset();
            representationController = null;
        });


        describe('when data update completed', function () {
            beforeEach(function (done) {
                representationController.updateData(data, voRepresentations, testType, true, 0);
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

            it('should update current representation when preparing a quality change', function () {
                let currentRepresentation = representationController.getCurrentRepresentation();
                expect(currentRepresentation.index).to.equal(0); // jshint ignore:line

                representationController.prepareQualityChange(1);

                currentRepresentation = representationController.getCurrentRepresentation();
                expect(currentRepresentation.index).to.equal(1); // jshint ignore:line
            });

            it('when a MANIFEST_VALIDITY_CHANGED event occurs, should update current representation', function () {
                let currentRepresentation = representationController.getCurrentRepresentation();
                expect(currentRepresentation.adaptation.period.duration).to.equal(100); // jshint ignore:line
                eventBus.trigger(Events.MANIFEST_VALIDITY_CHANGED, { sender: {}, newDuration: 150 });

                expect(currentRepresentation.adaptation.period.duration).to.equal(150); // jshint ignore:line
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
