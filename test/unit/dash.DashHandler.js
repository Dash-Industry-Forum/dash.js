import DashHandler from '../../src/dash/DashHandler';
import Constants from '../../src/streaming/constants/Constants';
import DashConstants from '../../src/dash/constants/DashConstants';

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
});
