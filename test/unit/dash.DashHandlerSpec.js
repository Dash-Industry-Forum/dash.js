import ObjectsHelper from './helpers/ObjectsHelper';
import VoHelper from './helpers/VOHelper';
import DashHandler from '../../src/dash/DashHandler';
import MediaPlayerModelMock from './mocks/MediaPlayerModelMock';

const expect = require('chai').expect;

describe('DashHandler', function () {
    const objectsHelper = new ObjectsHelper();
    const voHelper = new VoHelper();

    it('should generate an init segment for a representation', () => {
        // Arrange
        const context = {};
        const testType = 'video';

        const representation = voHelper.getDummyRepresentation(testType);
        const timelineConverter = objectsHelper.getDummyTimelineConverter();
        const streamProcessor = objectsHelper.getDummyStreamProcessor(testType);
        const baseURLController = objectsHelper.getDummyBaseURLController();
        const mediaPlayerModel = new MediaPlayerModelMock();

        const config = {
            mimeType: streamProcessor.getMediaInfo().mimeType,
            timelineConverter: timelineConverter,
            baseURLController: baseURLController,
            mediaPlayerModel: mediaPlayerModel
        };

        const dashHandler = DashHandler(context).create(config);
        dashHandler.initialize(streamProcessor);

        // Act
        const initRequest = dashHandler.getInitRequest(representation);

        // Assert
        expect(initRequest).to.exist; // jshint ignore:line
    });
});
