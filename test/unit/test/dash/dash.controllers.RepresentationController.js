import ObjectsHelper from '../../helpers/ObjectsHelper.js';
import VoHelper from '../../helpers/VOHelper.js';
import EventBus from '../../../../src/core/EventBus.js';
import RepresentationController from '../../../../src/dash/controllers/RepresentationController.js';
import Events from '../../../../src/core/events/Events.js';
import MediaPlayerEvents from '../../../../src/streaming/MediaPlayerEvents.js';
import DashConstants from '../../../../src/dash/constants/DashConstants.js';
import SpecHelper from '../../helpers/SpecHelper.js';
import AbrControllerMock from '../../mocks/AbrControllerMock.js';
import PlaybackControllerMock from '../../mocks/PlaybackControllerMock.js';
import DashMetricsMock from '../../mocks/DashMetricsMock.js';
import AdapterMock from '../../mocks/AdapterMock.js';
import SegmentsControllerMock from '../../mocks/SegmentsControllerMock.js';

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
    const enhancementType = 'enhancement';
    const specHelper = new SpecHelper();
    const voRepresentations = [];
    voRepresentations.push(voHelper.getDummyRepresentation(testType, 0), voHelper.getDummyRepresentation(testType, 1), voHelper.getDummyRepresentation(testType, 2), voHelper.getDummyRepresentation(enhancementType, 3));
    const streamProcessor = objectsHelper.getDummyStreamProcessor(testType);
    const eventBus = EventBus(context).getInstance();
    const timelineConverter = objectsHelper.getDummyTimelineConverter();

    // Representation 3 is an enhancement representation that has a dependent representation 1.
    voRepresentations[3].dependentRepresentation = voRepresentations[1];

    Events.extend(MediaPlayerEvents);

    const abrControllerMock = new AbrControllerMock();
    const playbackControllerMock = new PlaybackControllerMock();
    const dashMetricsMock = new DashMetricsMock();
    const adapterMock = new AdapterMock();
    const segmentsController = new SegmentsControllerMock();

    let representationController;


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
                representationController.updateData(voRepresentations, true, voRepresentations[0].id);
                setTimeout(function () {
                    done();
                }, specHelper.getExecutionDelay());
            });


            it('should return current selected representation', function () {
                const expectedValue = voRepresentations[0].id;

                expect(representationController.getCurrentRepresentation().id).to.equal(expectedValue);
            });

            it('should return null if id is undefined', function () {
                expect(representationController.getRepresentationById()).to.equal(null);
            });


            it('should update current representation when preparing a quality change', function () {
                let currentRepresentation = representationController.getCurrentRepresentation();
                expect(currentRepresentation.id).to.equal(voRepresentations[0].id); // jshint ignore:line

                representationController.prepareQualityChange(voRepresentations[1]);

                currentRepresentation = representationController.getCurrentRepresentation();
                expect(currentRepresentation.id).to.equal(voRepresentations[1].id); // jshint ignore:line
            });

            it('when a MANIFEST_VALIDITY_CHANGED event occurs, should update current representation', function () {
                let currentRepresentation = representationController.getCurrentRepresentation();
                expect(currentRepresentation.adaptation.period.duration).to.equal(100); // jshint ignore:line
                eventBus.trigger(Events.MANIFEST_VALIDITY_CHANGED, { sender: {}, newDuration: 150 });

                expect(currentRepresentation.adaptation.period.duration).to.equal(150); // jshint ignore:line
            });

            it('should switch correctly when prepareQualityChange is called with an enhancement representation', function () {
                let representation = representationController.getCurrentRepresentation();

                expect(representation.id).to.equal(voRepresentations[0].id)
                
                // switch to an enchancement representation 3 with dependentRepresentation 1.
                representationController.prepareQualityChange(voRepresentations[3]);
                representation = representationController.getCurrentRepresentation();

                expect(representation.id).to.equal(voRepresentations[1].id);
            });

        });

        describe('when a call to reset is done', function () {
            it('should not contain representation after a call to reset', function () {
                representationController.reset();
                // Act
                const data = representationController.getCurrentRepresentation();

                // Assert
                expect(data).not.exist; // jshint ignore:line
            });
        });
    });
});
