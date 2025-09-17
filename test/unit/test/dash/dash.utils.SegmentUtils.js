import {expect} from 'chai';
import {
    processUriTemplate,
    getIndexBasedSegment,
    getTimeBasedSegment,
    getTotalNumberOfPartialSegments
} from '../../../../src/dash/utils/SegmentsUtils.js';
import TimelineConverter from '../../../../src/dash/utils/TimelineConverter.js';

// Real timeline converter instance with stubbed dashManifestModel
const context = {};
const timelineConverter = TimelineConverter(context).getInstance();
// Inject stub for dashManifestModel (not used by tested methods but required by interface when other internal funcs might rely on it)
timelineConverter.setConfig({
    dashManifestModel: {
        // Minimal stub: only method referenced in some TimelineConverter internals we are not exercising directly
        getRepresentationFor: () => null
    }
});

timelineConverter.initialize();

// Helper to build a minimal representation structure used by SegmentsUtils (augmented for real TimelineConverter)
function createRepresentation(overrides = {}) {
    const mpd = {
        availabilityStartTime: new Date(0),
        timeShiftBufferDepth: Number.POSITIVE_INFINITY,
        suggestedPresentationDelay: 0
    };
    const period = {
        start: 10,
        duration: 60, // seconds
        mpd,
        index: 0
    };
    const adaptation = { period, index: 0 };
    return Object.assign({
        id: 'video_1',
        bandwidth: 1000000,
        startNumber: 1,
        segmentDuration: 4, // seconds
        adaptation,
        availabilityTimeOffset: 0,
        presentationTimeOffset: 0
    }, overrides);
}

describe('SegmentsUtils', function () {

    describe('processUriTemplate', function () {
        it('should return the original value when url is falsy', function () {
            expect(processUriTemplate(null)).to.equal(null);
            expect(processUriTemplate(undefined)).to.equal(undefined);
        });

        it('should replace template variables', function () {
            const url = 'media_$RepresentationID$_$Number$_$SubNumber$_$Bandwidth$_$Time$.m4s';
            const result = processUriTemplate(url, 'vid', 10, 5, 500000, 12345);
            expect(result).to.include('vid');
            expect(result).to.include('10');
            expect(result).to.include('5');
            expect(result).to.include('500000');
            expect(result).to.match(/12345/);
            expect(result).to.be.equal('media_vid_10_5_500000_12345.m4s')
        });
    });

    describe('getIndexBasedSegment', function () {

        describe('isDynamic = false', function () {
            it('should create a FullSegment when no partials specified', function () {
                const representation = createRepresentation();
                const segment = getIndexBasedSegment({
                    index: 2,
                    isDynamic: false,
                    mediaTime: 8,
                    mediaUrl: 'media_$RepresentationID$_$Number$.m4s',
                    representation,
                    timelineConverter,
                });
                expect(segment).to.exist;
                expect(segment.availabilityEndTime).to.be.undefined;
                expect(segment.availabilityStartTime).to.be.equal(representation.adaptation.period.mpd.availabilityStartTime);
                expect(segment.duration).to.be.equal(representation.segmentDuration);
                expect(segment.index).to.be.equal(2);
                expect(segment.isPartialSegment).to.be.undefined;
                expect(segment.mediaStartTime).to.be.equal(8);
                expect(segment.presentationStartTime).to.be.equal(18.0),
                expect(segment.replacementNumber).to.equal(representation.startNumber + 2);
                expect(segment.media).to.be.a('string');
                expect(segment.media).to.be.equal(`media_video_1_${representation.startNumber + 2}.m4s`);
                expect(segment.duration).to.equal(representation.segmentDuration);
            });

            it('should return null when segment exceeds period boundary', function () {
                const representation = createRepresentation({
                    segmentDuration: 10,
                    adaptation: {
                        period: {
                            start: 0,
                            duration: 30,
                            mpd: {
                                availabilityStartTime: new Date(0),
                                availabilityEndTime: new Date(0),
                                timeShiftBufferDepth: Number.POSITIVE_INFINITY,
                                suggestedPresentationDelay: 0
                            },
                            index: 0
                        }, index: 0
                    }
                });
                const segment = getIndexBasedSegment({
                    timelineConverter,
                    isDynamic: false,
                    representation,
                    index: 3,
                    mediaUrl: 'media_$RepresentationID$_$Number$.m4s',
                    mediaTime: 0
                });
                expect(segment).to.be.null;
            });

            it('should create a partial segment chain starting at provided partial index', function () {
                const representation = createRepresentation();
                const numberOfPartialSegments = 3;
                const indexOfPartialSegmentToRequest = 1;
                const baseIndex = 0;
                const segment = getIndexBasedSegment({
                    timelineConverter,
                    isDynamic: false,
                    representation,
                    index: baseIndex,
                    numberOfPartialSegments,
                    indexOfPartialSegmentToRequest,
                    mediaUrl: 'media_$RepresentationID$_$Number$_$SubNumber$.m4s',
                    mediaTime: 0
                });
                expect(segment).to.exist;
                expect(segment.isPartialSegment).to.be.true;
                expect(segment.replacementSubNumber).to.equal(indexOfPartialSegmentToRequest);
                const expectedPartialDuration = representation.segmentDuration / numberOfPartialSegments;
                expect(segment.duration).to.equal(expectedPartialDuration);
                let count = 0;
                let current = segment;
                const subNumbers = [];
                while (current) {
                    count++;
                    subNumbers.push(current.replacementSubNumber);
                    current = current.nextPartialSegment;
                }
                expect(count).to.equal(numberOfPartialSegments - indexOfPartialSegmentToRequest);
                expect(subNumbers).to.deep.equal([1, 2]);
            });
        })

        describe('isDynamic = true', function () {
            function createDynamicRepresentation(overrides = {}) {
                const now = Date.now();
                const mpd = {
                    availabilityStartTime: new Date(now - 20000), // 20s ago
                    availabilityEndTime: new Date(now + 3600000), // +1h
                    timeShiftBufferDepth: 30, // seconds
                    suggestedPresentationDelay: 5
                };
                const period = { start: 0, duration: 120, mpd, index: 0 };
                const adaptation = { period, index: 0 };
                return Object.assign({
                    id: 'video_dyn',
                    bandwidth: 500000,
                    startNumber: 1,
                    segmentDuration: 4,
                    adaptation,
                    availabilityTimeOffset: 0,
                    presentationTimeOffset: 0
                }, overrides);
            }

            it('should create dynamic index-based segment with correct availability times and wallStartTime', function () {
                const representation = createDynamicRepresentation();
                const segment = getIndexBasedSegment({
                    timelineConverter,
                    isDynamic: true,
                    representation,
                    index: 0,
                    mediaUrl: 'media_$RepresentationID$_$Number$.m4s',
                    mediaTime: 0
                });
                expect(segment).to.exist;
                // availabilityStartTime should exist and be >= mpd.availabilityStartTime
                expect(segment.availabilityStartTime).to.be.instanceOf(Date);
                expect(segment.availabilityEndTime).to.be.instanceOf(Date);
                const diff = segment.availabilityEndTime.getTime() - segment.availabilityStartTime.getTime();
                // timeShiftBufferDepth (30) + segmentDuration (4) = 34s tolerance 20ms
                expect(Math.abs(diff - 34000)).to.be.lessThan(25);
                // wallStartTime = availabilityStartTime + (presentationStartTime + suggestedPresentationDelay)*1000
                const expectedWall = segment.availabilityStartTime.getTime() + (segment.presentationStartTime + representation.adaptation.period.mpd.suggestedPresentationDelay) * 1000;
                expect(Math.abs(segment.wallStartTime.getTime() - expectedWall)).to.be.lessThan(20);
            });

            it('should create dynamic time-based segment with correct availability delta', function () {
                const representation = createDynamicRepresentation();
                const segment = getTimeBasedSegment({
                    timelineConverter,
                    isDynamic: true,
                    representation,
                    mediaTime: 8,
                    durationInTimescale: 4,
                    fTimescale: 1,
                    mediaUrl: 'media_$RepresentationID$_$Time$.m4s',
                    mediaRange: '0-100',
                    index: 2
                });
                expect(segment).to.exist;
                const diff = segment.availabilityEndTime.getTime() - segment.availabilityStartTime.getTime();
                expect(Math.abs(diff - (30 + 4) * 1000)).to.be.lessThan(25);
            });

            it('should create dynamic partial segment chain', function () {
                const representation = createDynamicRepresentation();
                const segment = getTimeBasedSegment({
                    timelineConverter,
                    isDynamic: true,
                    representation,
                    mediaTime: 12,
                    durationInTimescale: 6,
                    fTimescale: 1,
                    mediaUrl: 'media_$RepresentationID$_$Number$_$SubNumber$.m4s',
                    mediaRange: '0-100',
                    index: 3,
                    numberOfPartialSegments: 3,
                    indexOfPartialSegmentToRequest: 0
                });
                expect(segment).to.exist;
                expect(segment.isPartialSegment).to.be.true;
                // chain length should be 3
                let count = 0; let cur = segment; while (cur) { count++; cur = cur.nextPartialSegment; }
                expect(count).to.equal(3);
            });

            it('should return null for dynamic segment not yet available (future availabilityStartTime)', function () {
                const futureRep = createDynamicRepresentation({
                    adaptation: {
                        period: {
                            start: 0,
                            duration: 120,
                            mpd: {
                                availabilityStartTime: new Date(Date.now() + 60000), // 60s in future
                                availabilityEndTime: new Date(Date.now() + 7200000),
                                timeShiftBufferDepth: 30,
                                suggestedPresentationDelay: 5
                            },
                            index: 0
                        }, index: 0
                    }
                });
                const seg = getIndexBasedSegment({
                    timelineConverter,
                    isDynamic: true,
                    representation: futureRep,
                    index: 0,
                    mediaUrl: 'media_$RepresentationID$_$Number$.m4s',
                    mediaTime: 0
                });
                expect(seg).to.be.null; // jshint ignore:line
            });
        })

    });

    describe('getTimeBasedSegment', function () {
        it('should create a time-based FullSegment', function () {
            const representation = createRepresentation();
            const segment = getTimeBasedSegment({
                timelineConverter,
                isDynamic: false,
                representation,
                mediaTime: 8,
                durationInTimescale: 4,
                fTimescale: 1,
                mediaUrl: 'media_$RepresentationID$_$Time$.m4s',
                mediaRange: '0-100',
                index: 2
            });
            expect(segment).to.exist;
            expect(segment.isPartialSegment).to.be.undefined;
            expect(segment.duration).to.equal(4);
            expect(segment.mediaRange).to.equal('0-100');
        });

        it('should create partial time-based segment chain', function () {
            const representation = createRepresentation();
            const segment = getTimeBasedSegment({
                timelineConverter,
                isDynamic: false,
                representation,
                mediaTime: 12,
                durationInTimescale: 6,
                fTimescale: 1,
                mediaUrl: 'media_$RepresentationID$_$Number$_$SubNumber$.m4s',
                mediaRange: '0-100',
                index: 3,
                numberOfPartialSegments: 2,
                indexOfPartialSegmentToRequest: 0
            });
            expect(segment).to.exist;
            expect(segment.isPartialSegment).to.be.true;
            expect(segment.duration).to.equal(3);
            expect(segment.nextPartialSegment).to.exist;
            expect(segment.nextPartialSegment.replacementSubNumber).to.equal(1);
        });
    });

    describe('getTotalNumberOfPartialSegments', function () {
        it('should return the k attribute', function () {
            const el = { k: 5 };
            expect(getTotalNumberOfPartialSegments(el)).to.equal(5);
        });
    });
});
