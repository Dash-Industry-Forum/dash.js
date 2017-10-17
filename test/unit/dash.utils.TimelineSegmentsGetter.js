import TimelineSegmentsGetter from '../../src/dash/utils/TimelineSegmentsGetter';
import TimelineConverter from '../../src/dash/utils/TimelineConverter';

const expect = require('chai').expect;

describe('TimelineSegmentsGetter', function () {
    const context = {};
    let timelineSegmentsGetter = TimelineSegmentsGetter(context).create({});

    it('should throw an error if config object has not been properly passed', function () {
        expect(timelineSegmentsGetter.getSegments.bind(timelineSegmentsGetter)).to.be.throw('Missing config parameter(s)');
    });

    it('should throw an error if representation parameter has not been properly set', function () {
        let timelineConverter = TimelineConverter(context).getInstance();
        timelineSegmentsGetter = TimelineSegmentsGetter(context).create({timelineConverter: timelineConverter});

        expect(timelineSegmentsGetter.getSegments.bind(timelineSegmentsGetter)).to.be.throw('no representation');
    });
});