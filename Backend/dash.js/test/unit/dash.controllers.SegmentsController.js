import SegmentsController from '../../src/dash/controllers/SegmentsController';
import DashConstants from '../../src/dash/constants/DashConstants';
import Debug from '../../src/core/Debug';
import Settings from '../../src/core/Settings';
import EventBus from '../../src/core/EventBus';
import Events from '../../src/core/events/Events';
import Errors from '../../src/core/errors/Errors';

import ObjectsHelper from './helpers/ObjectsHelper';
import DashMetricsMock from './mocks/DashMetricsMock';
import MediaPlayerModelMock from './mocks/MediaPlayerModelMock';
import ErrorHandlerMock from './mocks/ErrorHandlerMock';

const chai = require('chai');
const expect = chai.expect;



describe('SegmentsController', function () {
    // Arrange
    const context = {};
    const objectsHelper = new ObjectsHelper();
    const baseURLController = objectsHelper.getDummyBaseURLController();
    const mediaPlayerModel = new MediaPlayerModelMock();
    const dashMetricsMock = new DashMetricsMock();
    const errHandler = new ErrorHandlerMock();
    const settings = Settings(context).getInstance();
    const debug = Debug(context).getInstance({settings: settings});
    const eventBus = EventBus(context).getInstance();

    const segmentsController = SegmentsController(context).create({
        streamInfo: {streamId: 'streamId'},
        dashMetrics: dashMetricsMock,
        mediaPlayerModel: mediaPlayerModel,
        errHandler: errHandler,
        baseURLController: baseURLController,
        dashConstants: DashConstants,
        debug: debug,
        eventBus: eventBus,
        events: Events,
        errors: Errors
    }, false);

    segmentsController.initialize();

    it('getSegmentByIndex should return null if representation type is unknown', function () {
        // Act
        const representation = {
            'segmentInfoType': 'unknown'
        };

        let s = segmentsController.getSegmentByIndex(representation, 0, 0);

        // Assert
        expect(s).to.be.null; // jshint ignore:line
    });

    it('getSegmentByTime should return null if representation type is unknown', function () {
        // Act
        const representation = {
            'segmentInfoType': 'unknown'
        };

        let s = segmentsController.getSegmentByTime(representation, 0, 0);

        // Assert
        expect(s).to.be.null; // jshint ignore:line
    });

});
