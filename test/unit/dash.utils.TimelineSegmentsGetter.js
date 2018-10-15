import TimelineSegmentsGetter from '../../src/dash/utils/TimelineSegmentsGetter';
import Constants from '../../src/streaming/constants/Constants';

import ObjectsHelper from './helpers/ObjectsHelper';

const expect = require('chai').expect;

describe('TimelineSegmentsGetter', function () {
    const context = {};
    let timelineSegmentsGetter;
    const objectsHelper = new ObjectsHelper();

    it('should throw an error if config object is not defined', function () {
        timelineSegmentsGetter = TimelineSegmentsGetter(context).create();
        expect(timelineSegmentsGetter.getSegments.bind(timelineSegmentsGetter)).to.be.throw(Constants.MISSING_CONFIG_ERROR);
    });

    it('should throw an error if config object has not been properly passed', function () {
        timelineSegmentsGetter = TimelineSegmentsGetter(context).create({});
        expect(timelineSegmentsGetter.getSegments.bind(timelineSegmentsGetter)).to.be.throw(Constants.MISSING_CONFIG_ERROR);
    });

    it('should throw an error if representation parameter has not been properly set', function () {
        const timelineConverter = objectsHelper.getDummyTimelineConverter();
        timelineSegmentsGetter = TimelineSegmentsGetter(context).create({timelineConverter: timelineConverter});

        expect(timelineSegmentsGetter.getSegments.bind(timelineSegmentsGetter)).to.be.throw('no representation');
    });
});