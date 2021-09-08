import TimelineConverter from '../../src/dash/utils/TimelineConverter';
import SegmentBaseGetter from '../../src/dash/utils/SegmentBaseGetter';
import Constants from '../../src/streaming/constants/Constants';
import VoHelper from './helpers/VOHelper';

const expect = require('chai').expect;

function createRepresentationMock() {
    const voHelper = new VoHelper();
    const representation = voHelper.getDummyRepresentation(Constants.VIDEO);
    representation.segments = [];

    for (let i = 0; i < 5; i++) {
        representation.segments.push({
            index: i,
            duration: 5,
            mediaStartTime: i * 5,
            presentationStartTime: i * 5,
            replacementNumber: i + 1,
            replacementTime: 1001,
            representation: i * 5
        });
    }

    return representation;
}

describe('SegmentBaseGetter', () => {
    const context = {};
    const timelineConverter = TimelineConverter(context).getInstance();
    timelineConverter.initialize();

    const segmentBaseGetter = SegmentBaseGetter(context).create({
        timelineConverter: timelineConverter
    });

    it('should expose segments getter interface', () => {
        expect(segmentBaseGetter.getSegmentByIndex).to.exist; // jshint ignore:line
        expect(segmentBaseGetter.getSegmentByTime).to.exist; // jshint ignore:line
    });

    describe('initialization', () => {
        it('should throw an error if config object is not defined', function () {
            const getter = SegmentBaseGetter(context).create();
            expect(getter.getSegmentByIndex.bind(getter)).to.be.throw(Constants.MISSING_CONFIG_ERROR);
        });

        it('should throw an error if config object has not been properly passed', function () {
            const getter = SegmentBaseGetter(context).create({});
            expect(getter.getSegmentByIndex.bind(getter)).to.be.throw(Constants.MISSING_CONFIG_ERROR);
        });

        it('should throw an error if representation parameter has not been properly set', function () {
            const getter = SegmentBaseGetter(context).create({ timelineConverter: timelineConverter });
            const segment = getter.getSegmentByIndex();

            expect(segment).to.be.null; // jshint ignore:line
        });
    });

    describe('getSegmentByIndex', () => {
        it('should return segment given an index', () => {
            const representation = createRepresentationMock();

            let seg = segmentBaseGetter.getSegmentByIndex(representation, 0);
            expect(seg.index).to.equal(0);
            expect(seg.presentationStartTime).to.equal(0);
            expect(seg.duration).to.equal(5);

            seg = segmentBaseGetter.getSegmentByIndex(representation, 1);
            expect(seg.index).to.equal(1);
            expect(seg.presentationStartTime).to.equal(5);
            expect(seg.duration).to.equal(5);

            seg = segmentBaseGetter.getSegmentByIndex(representation, 2);
            expect(seg.index).to.equal(2);
            expect(seg.presentationStartTime).to.equal(10);
            expect(seg.duration).to.equal(5);
        });

        it('should return null if segment is out of range', () => {
            const representation = createRepresentationMock();

            let seg = segmentBaseGetter.getSegmentByIndex(representation, 10);
            expect(seg).to.be.null; // jshint ignore:line
        });
    });

    describe('getSegmentByTime', () => {
        it('should return segment by time', () => {
            const representation = createRepresentationMock();

            let seg = segmentBaseGetter.getSegmentByTime(representation, 0);
            expect(seg.index).to.equal(0);
            expect(seg.presentationStartTime).to.equal(0);
            expect(seg.duration).to.equal(5);

            seg = segmentBaseGetter.getSegmentByTime(representation, 6);
            expect(seg.index).to.equal(0);
            expect(seg.presentationStartTime).to.equal(0);
            expect(seg.duration).to.equal(5);

            seg = segmentBaseGetter.getSegmentByTime(representation, 12);
            expect(seg.index).to.equal(1);
            expect(seg.presentationStartTime).to.equal(5);
            expect(seg.duration).to.equal(5);
        });

        it('should return null if segment is out of range', () => {
            const representation = createRepresentationMock();

            let seg = segmentBaseGetter.getSegmentByTime(representation, 110);
            expect(seg).to.be.null; // jshint ignore:line
        });
    });
});
