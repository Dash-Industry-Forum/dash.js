import TimelineConverter from '../../../../src/dash/utils/TimelineConverter.js';
import TimelineSegmentsGetter from '../../../../src/dash/utils/TimelineSegmentsGetter.js';
import Constants from '../../../../src/streaming/constants/Constants.js';
import VoHelper from '../../helpers/VOHelper.js';
import {expect} from 'chai';

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
        'S': segments
    },
    'media': 'test-$RepresentationID$-$Time$.dash'
};

function createRepresentationMock() {
    const voHelper = new VoHelper();
    const representation = voHelper.getDummyRepresentation(Constants.VIDEO);
    representation.timescale = 90000;
    representation.SegmentTemplate = segmentTemplate;
    representation.adaptation.period.mpd.manifest.Period[0].AdaptationSet[0].Representation[0] = representation;
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
        it('should return null if representation parameter has not been properly set', function () {
            const getter = TimelineSegmentsGetter(context).create({ timelineConverter: timelineConverter });
            const segment = getter.getSegmentByIndex();

            expect(segment).to.be.null; // jshint ignore:line
        });
    });

    describe('SegmentList with SegmentTimeline', () => {

        function createSegmentListRepresentationMock() {
            const voHelper = new VoHelper();
            const representation = voHelper.getDummyRepresentation(Constants.VIDEO);
            representation.timescale = 90000;
            representation.SegmentList = {
                'timescale': 90000,
                'SegmentTimeline': {
                    'S': [{ 't': 0, 'd': 90000, 'r': 2 }, { 'd': 90000 }]
                },
                'SegmentURL': [
                    { 'media': 'seg1.m4s', 'mediaRange': '0-999' },
                    { 'media': 'seg2.m4s', 'mediaRange': '1000-1999' },
                    { 'media': 'seg3.m4s', 'mediaRange': '2000-2999' },
                    { 'media': 'seg4.m4s', 'mediaRange': '3000-3999' }
                ]
            };
            representation.adaptation.period.mpd.manifest.Period[0].AdaptationSet[0].Representation[0] = representation;
            representation.adaptation.period.mpd.maxSegmentDuration = 5;
            representation.adaptation.period.duration = 4;
            representation.presentationTimeOffset = 0;

            return representation;
        }

        it('should use a separate SegmentURL for each repeated segment', () => {
            const representation = createSegmentListRepresentationMock();
            const media = [0, 1, 2, 3].map((time) => {
                return timelineSegmentsGetter.getSegmentByTime(representation, time).media;
            });

            expect(media).to.deep.equal(['seg1.m4s', 'seg2.m4s', 'seg3.m4s', 'seg4.m4s']);
        });

        it('should use the mediaRange of the matching SegmentURL', () => {
            const representation = createSegmentListRepresentationMock();
            const ranges = [0, 1, 2, 3].map((time) => {
                return timelineSegmentsGetter.getSegmentByTime(representation, time).mediaRange;
            });

            expect(ranges).to.deep.equal(['0-999', '1000-1999', '2000-2999', '3000-3999']);
        });

        it('should walk the SegmentURL list when requesting consecutive segments', () => {
            const representation = createSegmentListRepresentationMock();
            const media = [];
            let segment = null;

            for (let i = 0; i < 4; i++) {
                segment = timelineSegmentsGetter.getSegmentByIndex(representation, segment);
                media.push(segment.media);
            }

            expect(media).to.deep.equal(['seg1.m4s', 'seg2.m4s', 'seg3.m4s', 'seg4.m4s']);
        });
    });

    describe('getMediaFinishedInformation', () => {
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

        it('should return 0 from getMediaFinishedInformation when representation is undefined', () => {
            expect(timelineSegmentsGetter.getMediaFinishedInformation(undefined)).to.equal(0);
        });

        it('should handle negative repeat count using next S element (r = -1)', () => {
            const voHelper = new VoHelper();
            const representation = voHelper.getDummyRepresentation(Constants.VIDEO);
            representation.timescale = 100; // 100 units per second
            representation.adaptation.period.duration = 50; // seconds
            // S[0] repeats until start time of next S (t=5000 units => 50 seconds) with d=100 (1 second)
            representation.SegmentTemplate = {
                timescale: 100,
                initialization: 'init-$RepresentationID$.m4s',
                SegmentTimeline: {
                    S: [
                        { t: 0, d: 100, r: -1 },
                        { t: 5000, d: 100 } // next fragment defines end of negative repeat range
                    ]
                },
                media: 'seg-$Time$.m4s'
            };
            representation.adaptation.period.mpd.manifest.Period[0].AdaptationSet[0].Representation[0] = representation;

            const info = timelineSegmentsGetter.getMediaFinishedInformation(representation);
            // From 0 to <50s with 1s duration -> 50 segments (first S produces 50 segments), plus the final S element yields 1 more
            expect(info.numberOfSegments).to.equal(51);
            // mediaTimeOfLastSignaledSegment should be 51 seconds (since last S adds another second)
            expect(info.mediaTimeOfLastSignaledSegment).to.equal(51);
        });


    });

    describe('getSegmentByIndex', () => {
        it('should return segment given an index', () => {
            const representation = createRepresentationMock();

            let seg = timelineSegmentsGetter.getSegmentByIndex(representation);
            expect(seg.index).to.equal(0);
            expect(seg.presentationStartTime).to.equal(0);
            expect(seg.duration).to.equal(4.004);

            seg = timelineSegmentsGetter.getSegmentByIndex(representation, {
                presentationStartTime: 0,
                mediaStartTime: 0,
                duration: 4.004
            });
            expect(seg.index).to.equal(1);
            expect(seg.presentationStartTime).to.equal(4.004);
            expect(seg.duration).to.equal(4.004);

            seg = timelineSegmentsGetter.getSegmentByIndex(representation, {
                presentationStartTime: 4.004,
                mediaStartTime: 4.004,
                duration: 4.004
            });
            expect(seg.index).to.equal(2);
            expect(seg.presentationStartTime).to.equal(8.008);
            expect(seg.duration).to.equal(4.004);
        });

        it('should return null if no representation given', () => {
            let seg = timelineSegmentsGetter.getSegmentByIndex();
            expect(seg).to.be.null;
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

        it('should create partial segments when k attribute is present and select correct subNumber by time', () => {
            const mpd = {
                manifest: {
                    Period: [{
                        AdaptationSet: [{
                            Representation: [{
                                SegmentTemplate: {
                                    timescale: 40000,
                                    initialization: 'init-$RepresentationID$.m4s',
                                    SegmentTimeline: {
                                        S: [
                                            { t: 80000, d: 120000, k: 3 },
                                            { d: 240000, k: 3 }
                                        ]
                                    },
                                    media: 'video-$Time$-$SubNumber$.m4s'
                                }
                            }]
                        }]
                    }
                    ]
                }
            }
            const period = {
                start: 0,
                index: 0,
                mpd
            }
            const adaptation = { period, index: 0 }
            const representation = {
                adaptation,
                presentationTimeOffset: 2,
                index: 0
            }
            representation.timescale = 40000;
            // Time inside first partial
            let seg = timelineSegmentsGetter.getSegmentByTime(representation, 0.1);
            expect(seg).to.exist;
            expect(seg.isPartialSegment).to.be.true;
            expect(seg.replacementTime).to.be.equal(80000);
            expect(seg.replacementSubNumber).to.equal(0);
            expect(seg.totalNumberOfPartialSegments).to.equal(3);

            seg = timelineSegmentsGetter.getSegmentByTime(representation, 1.1);
            expect(seg).to.exist;
            expect(seg.isPartialSegment).to.be.true;
            expect(seg.replacementTime).to.be.equal(80000);
            expect(seg.replacementSubNumber).to.equal(1);

            seg = timelineSegmentsGetter.getSegmentByTime(representation, 2.1);
            expect(seg).to.exist;
            expect(seg.isPartialSegment).to.be.true;
            expect(seg.replacementTime).to.be.equal(80000);
            expect(seg.replacementSubNumber).to.equal(2);

            seg = timelineSegmentsGetter.getSegmentByTime(representation, 3.1);
            expect(seg).to.exist;
            expect(seg.isPartialSegment).to.be.true;
            expect(seg.replacementTime).to.be.equal(200000);
            expect(seg.replacementSubNumber).to.equal(0);

            seg = timelineSegmentsGetter.getSegmentByTime(representation, 4.1);
            expect(seg).to.exist;
            expect(seg.isPartialSegment).to.be.true;
            expect(seg.replacementTime).to.be.equal(200000);
            expect(seg.replacementSubNumber).to.equal(0);

            seg = timelineSegmentsGetter.getSegmentByTime(representation, 5.1);
            expect(seg).to.exist;
            expect(seg.isPartialSegment).to.be.true;
            expect(seg.replacementTime).to.be.equal(200000);
            expect(seg.replacementSubNumber).to.equal(1);
        });

        it('should fall back to full segment (not partial) when time is exactly at end boundary of a segment with partials', () => {
            const voHelper = new VoHelper();
            const representation = voHelper.getDummyRepresentation(Constants.VIDEO);
            representation.timescale = 3; // simple timescale
            representation.SegmentTemplate = {
                timescale: 3,
                initialization: 'init.m4s',
                SegmentTimeline: { S: [{ t: 0, d: 3, k: 3 }] }, // segment duration = 1s (3/3)
                media: 's-$Time$-$SubNumber$.m4s'
            };
            representation.adaptation.period.mpd.manifest.Period[0].AdaptationSet[0].Representation[0] = representation;
            // Request time exactly at end (1.0s) -> outside first and only segment -> null
            const seg = timelineSegmentsGetter.getSegmentByTime(representation, 1.0);
            expect(seg).to.be.null; // jshint ignore:line
        });
    });
});
