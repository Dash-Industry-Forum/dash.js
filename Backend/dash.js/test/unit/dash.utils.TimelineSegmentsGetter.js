import TimelineConverter from '../../src/dash/utils/TimelineConverter';
import TimelineSegmentsGetter from '../../src/dash/utils/TimelineSegmentsGetter';
import Constants from '../../src/streaming/constants/Constants';
import VoHelper from './helpers/VOHelper';

const expect = require('chai').expect;

const segments = [
    {
        't': 0,
        'd': 360360,
        'r': 24
    },
    {
        'd': 90000
    }
];

const segmentTemplate = {
    'timescale': 90000,
    'initialization': 'test-$RepresentationID$.dash',
    'SegmentTimeline': {
        'S': segments,
        'S_asArray': segments
    },
    'SegmentTimeline_asArray': [
        {
            'S': segments,
            'S_asArray': segments
        }
    ],
    'media': 'test-$RepresentationID$-$Time$.dash'
};

function createRepresentationMock() {
    const voHelper = new VoHelper();
    const representation = voHelper.getDummyRepresentation(Constants.VIDEO);
    representation.timescale = 90000;
    representation.SegmentTemplate = segmentTemplate;
    representation.adaptation.period.mpd.manifest.Period_asArray[0].AdaptationSet_asArray[0].Representation_asArray[0] = representation;
    representation.adaptation.period.mpd.maxSegmentDuration = 5;
    representation.adaptation.period.duration = 101.1;
    representation.presentationTimeOffset = 0;

    return representation;
}

describe('TimelineSegmentsGetter', () => {
    const context = {};

    const timelineConverter = TimelineConverter(context).getInstance();
    timelineConverter.initialize();

    const timelineSegmentsGetter = TimelineSegmentsGetter(context).create({
        timelineConverter: timelineConverter
    }, false);

    it('should expose segments getter interface', () => {
        expect(timelineSegmentsGetter.getSegmentByIndex).to.exist; // jshint ignore:line
        expect(timelineSegmentsGetter.getSegmentByTime).to.exist; // jshint ignore:line
    });

    describe('Initialization', () => {
        it('should throw an error if config object is not defined', () => {
            const getter = TimelineSegmentsGetter(context).create();
            expect(getter.getSegmentByIndex.bind(getter)).to.be.throw(Constants.MISSING_CONFIG_ERROR);
        });

        it('should throw an error if config object has not been properly passed', function () {
            const getter = TimelineSegmentsGetter(context).create();
            expect(getter.getSegmentByIndex.bind(getter)).to.be.throw(Constants.MISSING_CONFIG_ERROR);
        });

        it('should throw an error if representation parameter has not been properly set', function () {
            const getter = TimelineSegmentsGetter(context).create({ timelineConverter: timelineConverter });
            const segment = getter.getSegmentByIndex();

            expect(segment).to.be.null; // jshint ignore:line
        });
    });

    describe('availableSegmentsNumber calculation', () => {
        it('should calculate the number of available segments correctly', () => {
            const representation = createRepresentationMock();

            const mediaFinishedInformation = timelineSegmentsGetter.getMediaFinishedInformation(representation);
            expect(mediaFinishedInformation.numberOfSegments).to.equal(26);
        });
        it('should calculate the media time of the last segment correctly', () => {
            const representation = createRepresentationMock();

            const mediaFinishedInformation = timelineSegmentsGetter.getMediaFinishedInformation(representation);
            expect(mediaFinishedInformation.mediaTimeOfLastSignaledSegment).to.equal(101.1);
        });
    });

    describe('getSegmentByIndex', () => {
        it('should return segment given an index', () => {
            const representation = createRepresentationMock();

            let seg = timelineSegmentsGetter.getSegmentByIndex(representation, 0, -1);
            expect(seg.index).to.equal(0);
            expect(seg.presentationStartTime).to.equal(0);
            expect(seg.duration).to.equal(4.004);

            seg = timelineSegmentsGetter.getSegmentByIndex(representation, 1, 0);
            expect(seg.index).to.equal(1);
            expect(seg.presentationStartTime).to.equal(4.004);
            expect(seg.duration).to.equal(4.004);

            seg = timelineSegmentsGetter.getSegmentByIndex(representation, 2, 4.004);
            expect(seg.index).to.equal(2);
            expect(seg.presentationStartTime).to.equal(8.008);
            expect(seg.duration).to.equal(4.004);
        });

        it('should return null if segment is out of range', () => {
            const representation = createRepresentationMock();

            let seg = timelineSegmentsGetter.getSegmentByIndex(representation, 10000, 1000);
            expect(seg).to.be.null; // jshint ignore:line
        });

        it('should return null if last media time is not provided', () => {
            const representation = createRepresentationMock();

            let seg = timelineSegmentsGetter.getSegmentByIndex(representation, 1);
            expect(seg).to.be.null; // jshint ignore:line
        });
    });

    describe('getSegmentByTime', () => {
        it('should return segment by time', () => {
            const representation = createRepresentationMock();

            let seg = timelineSegmentsGetter.getSegmentByTime(representation, 0);
            expect(seg.presentationStartTime).to.equal(0);
            expect(seg.duration).to.equal(4.004);

            seg = timelineSegmentsGetter.getSegmentByTime(representation, 3);
            expect(seg.index).to.equal(0);
            expect(seg.presentationStartTime).to.equal(0);
            expect(seg.duration).to.equal(4.004);

            seg = timelineSegmentsGetter.getSegmentByTime(representation, 5);
            expect(seg.index).to.equal(1);
            expect(seg.presentationStartTime).to.equal(4.004);
            expect(seg.duration).to.equal(4.004);

            seg = timelineSegmentsGetter.getSegmentByTime(representation, 22);
            expect(seg.index).to.equal(5);
            expect(seg.presentationStartTime).to.equal(20.02);
            expect(seg.duration).to.equal(4.004);

            seg = timelineSegmentsGetter.getSegmentByTime(representation, 53);
            expect(seg.index).to.equal(13);
            expect(seg.presentationStartTime).to.equal(52.052);
            expect(seg.duration).to.equal(4.004);

            seg = timelineSegmentsGetter.getSegmentByTime(representation, 4.004);
            expect(seg.index).to.equal(1);
            expect(seg.presentationStartTime).to.equal(4.004);
            expect(seg.duration).to.equal(4.004);

            seg = timelineSegmentsGetter.getSegmentByTime(representation, 100.2);
            expect(seg.index).to.equal(25);
            expect(seg.presentationStartTime).to.equal(100.1);
            expect(seg.duration).to.equal(1);
        });

        it('should return null if segment is out of range', () => {
            const representation = createRepresentationMock();

            let seg = timelineSegmentsGetter.getSegmentByTime(representation, 102);
            expect(seg).to.be.null; // jshint ignore:line
        });
    });
});
