import SegmentsController from '../../src/dash/controllers/SegmentsController';
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

    const segmentsController = SegmentsController(context).create({
        dashMetrics: dashMetricsMock,
        mediaPlayerModel: mediaPlayerModel,
        errHandler: errHandler,
        baseURLController: baseURLController
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

    it('update should not throw an error even if no parameter is defined', function () {
        expect(segmentsController.update.bind(segmentsController)).not.to.throw();
    });
});
