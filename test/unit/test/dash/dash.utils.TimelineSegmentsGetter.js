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

function createTimelineRepresentation({
    timescale,
    S,
    duration = NaN,
    start = 0,
    presentationTimeOffset = 0,
    initialization = 'init.m4s',
    media = 'seg-$Time$.m4s'
}) {
    const voHelper = new VoHelper();
    const representation = voHelper.getDummyRepresentation(Constants.VIDEO);
    representation.timescale = timescale;
    representation.presentationTimeOffset = presentationTimeOffset;
    representation.adaptation.period.start = start;
    representation.adaptation.period.duration = duration;
    representation.SegmentTemplate = {
        timescale,
        initialization,
        SegmentTimeline: { S },
        media
    };
    representation.adaptation.period.mpd.manifest.Period[0].AdaptationSet[0].Representation[0] = representation;

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
            // S[0] repeats until start time of next S (t=5000 units => 50 seconds) with d=100 (1 second)
            const representation = createTimelineRepresentation({
                timescale: 100,
                duration: 50, // seconds
                initialization: 'init-$RepresentationID$.m4s',
                S: [
                    { t: 0, d: 100, r: -1 },
                    { t: 5000, d: 100 } // next fragment defines end of negative repeat range
                ],
                media: 'seg-$Time$.m4s'
            });

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

        it('should resolve segment indexes correctly across repeated S blocks', () => {
            const representation = createTimelineRepresentation({
                timescale: 10,
                duration: 11,
                initialization: 'init-$RepresentationID$.m4s',
                S: [
                    { t: 0, d: 10, r: 4 },
                    { t: 50, d: 20, r: 2 }
                ],
                media: 'seg-$Time$.m4s'
            });

            let seg = timelineSegmentsGetter.getSegmentByTime(representation, 3.1);
            expect(seg).to.exist;
            expect(seg.index).to.equal(3);
            expect(seg.presentationStartTime).to.equal(3);
            expect(seg.duration).to.equal(1);

            seg = timelineSegmentsGetter.getSegmentByTime(representation, 5.1);
            expect(seg).to.exist;
            expect(seg.index).to.equal(5);
            expect(seg.presentationStartTime).to.equal(5);
            expect(seg.duration).to.equal(2);

            seg = timelineSegmentsGetter.getSegmentByTime(representation, 8.5);
            expect(seg).to.exist;
            expect(seg.index).to.equal(6);
            expect(seg.presentationStartTime).to.equal(7);
            expect(seg.duration).to.equal(2);

            seg = timelineSegmentsGetter.getSegmentByTime(representation, 10.5);
            expect(seg).to.exist;
            expect(seg.index).to.equal(7);
            expect(seg.presentationStartTime).to.equal(9);
            expect(seg.duration).to.equal(2);
        });

        it('should resolve non-monotonic timelines with the linear fallback', () => {
            const representation = createTimelineRepresentation({
                timescale: 1,
                S: [
                    { t: 20, d: 10 },
                    { t: 0, d: 10 }
                ]
            });

            const seg = timelineSegmentsGetter.getSegmentByTime(representation, 5);
            expect(seg).to.exist; // jshint ignore:line
            expect(seg.index).to.equal(1);
            expect(seg.presentationStartTime).to.equal(0);
        });

        it('should fall back to full segment (not partial) when time is exactly at end boundary of a segment with partials', () => {
            const representation = createTimelineRepresentation({
                timescale: 3,
                initialization: 'init.m4s',
                S: [{ t: 0, d: 3, k: 3 }], // segment duration = 1s (3/3)
                media: 's-$Time$-$SubNumber$.m4s'
            });
            // Request time exactly at end (1.0s) -> outside first and only segment -> null
            const seg = timelineSegmentsGetter.getSegmentByTime(representation, 1.0);
            expect(seg).to.be.null; // jshint ignore:line
        });
    });

    describe('cache invalidation and edge cases', () => {
        it('should not cache open-ended negative @r counts so the advancing DVR window is tracked', () => {
            const dvr = { end: 50 };
            const getter = TimelineSegmentsGetter(context).create({
                timelineConverter: timelineConverter,
                dashMetrics: { getCurrentDVRInfo: () => dvr }
            }, false);
            const representation = createTimelineRepresentation({
                timescale: 100,
                duration: NaN, // force the DVR-window branch
                initialization: 'init-$RepresentationID$.m4s',
                S: [{ t: 0, d: 100, r: -1 }], // 1s segments, open-ended
                media: 'seg-$Time$.m4s'
            });

            expect(getter.getMediaFinishedInformation(representation).numberOfSegments).to.equal(50);
            expect(getter.getSegmentByTime(representation, 60)).to.be.null; // jshint ignore:line

            dvr.end = 70; // the live DVR window advances
            expect(getter.getMediaFinishedInformation(representation).numberOfSegments).to.equal(70);
            const seg = getter.getSegmentByTime(representation, 60);
            expect(seg).to.exist; // jshint ignore:line
            expect(seg.index).to.equal(60);
        });

        it('should invalidate the cache when the S array is updated in place with the same length', () => {
            const S = [{ t: 0, d: 10 }, { t: 10, d: 10 }, { t: 20, d: 10 }];
            const representation = createTimelineRepresentation({
                timescale: 1,
                S
            });

            expect(timelineSegmentsGetter.getMediaFinishedInformation(representation).mediaTimeOfLastSignaledSegment).to.equal(30);
            // slide the window: drop the oldest, append the newest, length unchanged
            S.shift();
            S.push({ t: 30, d: 10 });
            expect(timelineSegmentsGetter.getMediaFinishedInformation(representation).mediaTimeOfLastSignaledSegment).to.equal(40);
            const seg = timelineSegmentsGetter.getSegmentByTime(representation, 35);
            expect(seg).to.exist; // jshint ignore:line
            expect(seg.presentationStartTime).to.equal(30);
        });

        it('should invalidate the cache when boundary S timing is mutated in place', () => {
            const S = [{ t: 0, d: 10 }, { t: 10, d: 10 }];
            const representation = createTimelineRepresentation({
                timescale: 1,
                S
            });

            expect(timelineSegmentsGetter.getSegmentByTime(representation, 15).duration).to.equal(10);
            S[1].d = 20;

            expect(timelineSegmentsGetter.getMediaFinishedInformation(representation).mediaTimeOfLastSignaledSegment).to.equal(30);
            const seg = timelineSegmentsGetter.getSegmentByTime(representation, 25);
            expect(seg).to.exist; // jshint ignore:line
            expect(seg.presentationStartTime).to.equal(10);
            expect(seg.duration).to.equal(20);
        });

        it('should return null when the requested time resolves to NaN', () => {
            const representation = createRepresentationMock();
            const seg = timelineSegmentsGetter.getSegmentByIndex(representation, {
                presentationStartTime: 8.008,
                mediaStartTime: 8.008,
                duration: NaN
            });
            expect(seg).to.be.null; // jshint ignore:line
        });
    });
});
