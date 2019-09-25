import DashHandler from '../../src/dash/DashHandler';
import Constants from '../../src/streaming/constants/Constants';
import DashConstants from '../../src/dash/constants/DashConstants';
import Events from '../../src/core/events/Events';
import Errors from '../../src/core/errors/Errors';
import EventBus from '../../src/core/EventBus';

import ObjectsHelper from './helpers/ObjectsHelper';
import VoHelper from './helpers/VOHelper';
import MediaPlayerModelMock from './mocks/MediaPlayerModelMock';
import DashMetricsMock from './mocks/DashMetricsMock';

const expect = require('chai').expect;

describe('DashHandler', function () {
    const objectsHelper = new ObjectsHelper();
    const voHelper = new VoHelper();

    // Arrange
    const context = {};
    const eventBus = EventBus(context).getInstance();
    const testType = Constants.VIDEO;

    const timelineConverter = objectsHelper.getDummyTimelineConverter();
    const streamProcessor = objectsHelper.getDummyStreamProcessor(testType);
    const baseURLController = objectsHelper.getDummyBaseURLController();
    const mediaPlayerModel = new MediaPlayerModelMock();
    const dashMetricsMock = new DashMetricsMock();

    const config = {
        mimeType: streamProcessor.getMediaInfo().mimeType,
        timelineConverter: timelineConverter,
        baseURLController: baseURLController,
        mediaPlayerModel: mediaPlayerModel,
        dashMetrics: dashMetricsMock
    };

    const dashHandler = DashHandler(context).create(config);
    dashHandler.initialize(streamProcessor);

    it('should generate an init segment for a representation', () => {
        const representation = voHelper.getDummyRepresentation(testType);

        // Act
        const initRequest = dashHandler.getInitRequest(streamProcessor.getMediaInfo(), representation);

        // Assert
        expect(initRequest).to.exist; // jshint ignore:line
    });

    it('should return null when trying to get an init request with no representation', () => {
        // Act
        const initRequest = dashHandler.getInitRequest();

        // Assert
        expect(initRequest).to.be.null; // jshint ignore:line
    });

    it('should return null when trying to get a media segment with no representation', () => {
        const mediaSegment = dashHandler.getSegmentRequestForTime();

        expect(mediaSegment).to.be.null; // jshint ignore:line
    });

    it('should return null when trying to get a media segment with an empty representation parameter', () => {
        const mediaSegment = dashHandler.getSegmentRequestForTime({});

        expect(mediaSegment).to.be.null; // jshint ignore:line
    });

    it('should return ??? when trying to get a media segment with conform representation parameter', () => {
        const mediaSegment = dashHandler.getSegmentRequestForTime({segmentInfoType: DashConstants.SEGMENT_BASE});

        expect(mediaSegment).to.be.null; // jshint ignore:line
    });

    it('should return null when trying to get next a media segment with no representation', () => {
        const mediaSegment = dashHandler.getNextSegmentRequest();

        expect(mediaSegment).to.be.null; // jshint ignore:line
    });

    it('should not throw an exception when trying to call updateRepresentation with no parameters', () => {
        expect(dashHandler.updateRepresentation.bind(dashHandler)).not.to.throw();
    });

    it('should trigger REPRESENTATION_UPDATED event with error when segmentAvailabilityRange is not conform', function (done) {
        function onRepresentationUpdated(e) {
            eventBus.off(Events.REPRESENTATION_UPDATED, onRepresentationUpdated, this);
            expect(e.error.message).equals(Errors.SEGMENTS_UNAVAILABLE_ERROR_MESSAGE); // jshint ignore:line
            done();
        }
        eventBus.on(Events.REPRESENTATION_UPDATED, onRepresentationUpdated, this);
        dashHandler.updateRepresentation({start: 10, end: 5, useCalculatedLiveEdgeTime: false});
    });

    it('should trigger REPRESENTATION_UPDATED event without error when segmentAvailabilityRange is conform', function (done) {
        function onRepresentationUpdated(e) {
            eventBus.off(Events.REPRESENTATION_UPDATED, onRepresentationUpdated, this);
            expect(e.error).to.be.undefined; // jshint ignore:line
            done();
        }
        eventBus.on(Events.REPRESENTATION_UPDATED, onRepresentationUpdated, this);
        dashHandler.updateRepresentation({start: 5, end: 10, useCalculatedLiveEdgeTime: false});
    });

    it('should trigger REPRESENTATION_UPDATED event without error when INITIALIZATION_LOADED is triggered', function (done) {
        function onRepresentationUpdated(e) {
            eventBus.off(Events.REPRESENTATION_UPDATED, onRepresentationUpdated, this);
            expect(e.error).to.be.undefined; // jshint ignore:line
            done();
        }
        eventBus.on(Events.REPRESENTATION_UPDATED, onRepresentationUpdated, this);
        eventBus.trigger(Events.INITIALIZATION_LOADED, { representation: {segments: [] } });
    });

    it('should trigger REPRESENTATION_UPDATED event without error when SEGMENTS_LOADED is triggered', function (done) {
        function onRepresentationUpdated(e) {
            eventBus.off(Events.REPRESENTATION_UPDATED, onRepresentationUpdated, this);
            expect(e.error).to.be.undefined; // jshint ignore:line
            done();
        }
        eventBus.on(Events.REPRESENTATION_UPDATED, onRepresentationUpdated, this);
        eventBus.trigger(Events.SEGMENTS_LOADED, { mediaType: 'video', representation: {segments: [] } });
    });
});
