import ObjectsHelper from './helpers/ObjectsHelper.js';
import VoHelper from './helpers/VOHelper.js';
import DashHandler from '../src/dash/DashHandler.js';

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

        const config = {
            timelineConverter: timelineConverter,
            baseURLController: baseURLController
        };
        const dashHandler = DashHandler(context).create(config);
        dashHandler.initialize(streamProcessor);

        // Act
        const initRequest = dashHandler.getInitRequest(representation);

        // Assert
        expect(initRequest).to.exist; // jshint ignore:line
    });
});
