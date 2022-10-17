import DashHandler from '../../src/dash/DashHandler';
import Constants from '../../src/streaming/constants/Constants';
import DashConstants from '../../src/dash/constants/DashConstants';
import Events from '../../src/core/events/Events';
import EventBus from '../../src/core/EventBus';
import Debug from '../../src/core/Debug';
import URLUtils from '../../src/streaming/utils/URLUtils';
import MediaPlayerEvents from '../../src/streaming/MediaPlayerEvents';

import ObjectsHelper from './helpers/ObjectsHelper';
import VoHelper from './helpers/VOHelper';
import DashMetricsMock from './mocks/DashMetricsMock';

const sinon = require('sinon');
const expect = require('chai').expect;

const SEGMENT_START_TIME_DELTA = 0.001;

describe('DashHandler', function () {
    const objectsHelper = new ObjectsHelper();
    const voHelper = new VoHelper();

    // Arrange
    const context = {};
    const testType = Constants.VIDEO;
    const eventBus = EventBus(context).getInstance();
    const debug = Debug(context).getInstance();

    Events.extend(MediaPlayerEvents);

    const timelineConverter = objectsHelper.getDummyTimelineConverter();
    const streamProcessor = objectsHelper.getDummyStreamProcessor(testType);
    const baseURLController = objectsHelper.getDummyBaseURLController();
    const segmentsController = objectsHelper.getDummySegmentsController();
    const dashMetrics = new DashMetricsMock();


    const config = {
        eventBus,
        events: Events,
        debug,
        urlUtils: URLUtils(context).getInstance(),
        type: 'video',
        streamInfo: { id: 'id' },
        segmentsController,
        timelineConverter,
        baseURLController,
        dashMetrics
    };

    const dashHandler = DashHandler(context).create(config);
    dashHandler.initialize(streamProcessor);

    it('should generate an init segment for a representation', () => {
        const representation = voHelper.getDummyRepresentation(testType);

        // Act
        const initRequest = dashHandler.getInitRequest(streamProcessor.getMediaInfo(), representation);

        // Assert
        expect(initRequest).to.exist; // jshint ignore:line
    });

    it('should return null when trying to get an init request with no representation', () => {
        // Act
        const initRequest = dashHandler.getInitRequest();

        // Assert
        expect(initRequest).to.be.null; // jshint ignore:line
    });

    it('should return null when trying to get a media segment with no representation', () => {
        const mediaSegment = dashHandler.getSegmentRequestForTime();

        expect(mediaSegment).to.be.null; // jshint ignore:line
    });

    it('should return null when trying to get a media segment with an empty representation parameter', () => {
        const mediaSegment = dashHandler.getSegmentRequestForTime({});

        expect(mediaSegment).to.be.null; // jshint ignore:line
    });

    it('should return ??? when trying to get a media segment with conform representation parameter', () => {
        const mediaSegment = dashHandler.getSegmentRequestForTime({ segmentInfoType: DashConstants.SEGMENT_BASE });

        expect(mediaSegment).to.be.null; // jshint ignore:line
    });

    it('should return null when trying to get next a media segment with no representation', () => {
        const mediaSegment = dashHandler.getNextSegmentRequest();

        expect(mediaSegment).to.be.null; // jshint ignore:line
    });

    describe('getValidTimeCloseToTargetTime()', () => {
        let dummyRepresentation;
        let dummyMediaInfo;
        let segRequestStub;

        beforeEach(() => {
            segRequestStub = sinon.stub(segmentsController, 'getSegmentByTime').callsFake((representation, time) => {
                if (time < representation.adaptation.period.start || time > representation.adaptation.period.start + representation.adaptation.period.duration) {
                    return null;
                }
                const segNumber = Math.floor(time / representation.segmentDuration);
                return {
                    presentationStartTime: segNumber * representation.segmentDuration,
                    duration: representation.segmentDuration,
                    representation,
                    media: 'http://someurl'
                }
            });
        })

        afterEach(() => {
            segRequestStub.restore();
        });

        beforeEach(() => {
            dummyRepresentation = {
                index: 0,
                adaptation: {
                    index: 0,
                    period: {
                        mpd: {
                            manifest: {
                                Period_asArray: [
                                    {
                                        AdaptationSet_asArray: [
                                            {
                                                Representation_asArray: [
                                                    {
                                                        bandwidth: 3000
                                                    }
                                                ]
                                            }
                                        ]
                                    }
                                ]
                            }
                        },
                        start: 0,
                        duration: 30,
                        index: 0
                    }
                },
                segmentInfoType: 'SegmentTimeline',
                timescale: 1,
                segmentDuration: 2
            };
            dummyMediaInfo = {};
        })

        it('should return NaN if no parameters are passed', () => {
            const result = dashHandler.getValidTimeCloseToTargetTime()

            expect(result).to.be.NaN;
        })

        it('should return NaN if time is not a valid number', () => {
            const result = dashHandler.getValidTimeCloseToTargetTime('a', {}, {}, 0.5)

            expect(result).to.be.NaN;
        })

        it('should return NaN if time if invalid mediainfo is passed', () => {
            const result = dashHandler.getValidTimeCloseToTargetTime(3, null, {}, 0.5)

            expect(result).to.be.NaN;
        })

        it('should return NaN if time if invalid representation is passed', () => {
            const result = dashHandler.getValidTimeCloseToTargetTime(3, {}, null, 0.5)

            expect(result).to.be.NaN;
        })

        it('should return valid time if request can be found and segment durations cover whole period', () => {
            const result = dashHandler.getValidTimeCloseToTargetTime(3, dummyMediaInfo, dummyRepresentation, 0.5)

            expect(result).to.be.equal(3);
        })

        it('should return valid time if requested time is larger than period end', () => {
            const result = dashHandler.getValidTimeCloseToTargetTime(32, dummyMediaInfo, dummyRepresentation, 0.5)

            expect(result).to.be.equal(30);
        })

        it('should return valid time if requested time is smaller than period start', () => {
            const result = dashHandler.getValidTimeCloseToTargetTime(-0.5, dummyMediaInfo, dummyRepresentation, 0.5)

            expect(result).to.be.equal(0);
        })

        it('should return valid time if no valid segment for time and gap is right period end of period', () => {
            segRequestStub.restore();
            segRequestStub = sinon.stub(segmentsController, 'getSegmentByTime').callsFake((representation, time) => {
                if (time >= 28) {
                    return null;
                }
                const segNumber = Math.floor(time / representation.segmentDuration);
                return {
                    presentationStartTime: segNumber * representation.segmentDuration,
                    duration: representation.segmentDuration,
                    representation,
                    media: 'http://someurl'
                }
            });
            const result = dashHandler.getValidTimeCloseToTargetTime(29, dummyMediaInfo, dummyRepresentation, 0.5)

            expect(result).to.be.equal(27.5);
        })

        it('should return valid time if no valid segment for time and time is closer to end of period than the target threshold', () => {
            segRequestStub.restore();
            segRequestStub = sinon.stub(segmentsController, 'getSegmentByTime').callsFake((representation, time) => {
                if (time >= 28) {
                    return null;
                }
                const segNumber = Math.floor(time / representation.segmentDuration);
                return {
                    presentationStartTime: segNumber * representation.segmentDuration,
                    duration: representation.segmentDuration,
                    representation,
                    media: 'http://someurl'
                }
            });
            const result = dashHandler.getValidTimeCloseToTargetTime(29.8, dummyMediaInfo, dummyRepresentation, 0.5)

            expect(result).to.be.equal(27.5);
        })

        it('should return valid time if gap is in the middle and target time is close to left side of the buffer', () => {
            segRequestStub.restore();
            segRequestStub = sinon.stub(segmentsController, 'getSegmentByTime').callsFake((representation, time) => {
                if (time >= 10 && time < 20) {
                    return null;
                }
                const segNumber = Math.floor(time / representation.segmentDuration);
                return {
                    presentationStartTime: segNumber * representation.segmentDuration,
                    duration: representation.segmentDuration,
                    representation,
                    media: 'http://someurl'
                }
            });
            const result = dashHandler.getValidTimeCloseToTargetTime(12, dummyMediaInfo, dummyRepresentation, 0.5)

            expect(result).to.be.equal(9.5);
        })

        it('should return valid time if gap is in the middle and target time is close to right side of the buffer', () => {
            segRequestStub.restore();
            segRequestStub = sinon.stub(segmentsController, 'getSegmentByTime').callsFake((representation, time) => {
                if (time >= 10 && time < 20) {
                    return null;
                }
                const segNumber = Math.floor(time / representation.segmentDuration);
                return {
                    presentationStartTime: segNumber * representation.segmentDuration,
                    duration: representation.segmentDuration,
                    representation,
                    media: 'http://someurl'
                }
            });
            const result = dashHandler.getValidTimeCloseToTargetTime(18, dummyMediaInfo, dummyRepresentation, 0.5)

            expect(result).to.be.equal(20 + SEGMENT_START_TIME_DELTA);
        })

        it('should return valid time if seek is right after the start of a gap', () => {
            segRequestStub.restore();
            segRequestStub = sinon.stub(segmentsController, 'getSegmentByTime').callsFake((representation, time) => {
                if (time >= 28) {
                    return null;
                }
                const segNumber = Math.floor(time / representation.segmentDuration);
                return {
                    presentationStartTime: segNumber * representation.segmentDuration,
                    duration: representation.segmentDuration,
                    representation,
                    media: 'http://someurl'
                }
            });
            const result = dashHandler.getValidTimeCloseToTargetTime(28.0001, dummyMediaInfo, dummyRepresentation, 0.5)

            expect(result).to.be.equal(27.5);
        })

        it('should return valid time if only one valid segment after target time', () => {
            segRequestStub.restore();
            segRequestStub = sinon.stub(segmentsController, 'getSegmentByTime').callsFake((representation, time) => {
                if (time < 28) {
                    return null;
                }
                const segNumber = Math.floor(time / representation.segmentDuration);
                return {
                    presentationStartTime: segNumber * representation.segmentDuration,
                    duration: representation.segmentDuration,
                    representation,
                    media: 'http://someurl'
                }
            });
            const result = dashHandler.getValidTimeCloseToTargetTime(27, dummyMediaInfo, dummyRepresentation, 0.5)

            expect(result).to.be.equal(28 + SEGMENT_START_TIME_DELTA);
        })

        it('should return valid time if only one valid segment before target time', () => {
            segRequestStub.restore();
            segRequestStub = sinon.stub(segmentsController, 'getSegmentByTime').callsFake((representation, time) => {
                if (time >= 2) {
                    return null;
                }
                const segNumber = Math.floor(time / representation.segmentDuration);
                return {
                    presentationStartTime: segNumber * representation.segmentDuration,
                    duration: representation.segmentDuration,
                    representation,
                    media: 'http://someurl'
                }
            });
            const result = dashHandler.getValidTimeCloseToTargetTime(27, dummyMediaInfo, dummyRepresentation, 0.5)

            expect(result).to.be.equal(1.5);
        })

        it('should return valid time for floating point numbers', () => {
            segRequestStub.restore();
            segRequestStub = sinon.stub(segmentsController, 'getSegmentByTime').callsFake((representation, time) => {
                if (time >= 30) {
                    return null;
                }
                const segNumber = Math.floor(time / representation.segmentDuration);
                return {
                    presentationStartTime: segNumber * representation.segmentDuration,
                    duration: representation.segmentDuration,
                    representation,
                    media: 'http://someurl'
                }
            });
            const result = dashHandler.getValidTimeCloseToTargetTime(30.05, dummyMediaInfo, dummyRepresentation, 0.5)

            expect(result).to.be.equal(29.5);
        })
    })

    describe('getValidTimeAheadOfTargetTime()', () => {
        let dummyRepresentation;
        let dummyMediaInfo;
        let segRequestStub;

        beforeEach(() => {
            segRequestStub = sinon.stub(segmentsController, 'getSegmentByTime').callsFake((representation, time) => {
                if (time < representation.adaptation.period.start || time > representation.adaptation.period.start + representation.adaptation.period.duration) {
                    return null;
                }
                const segNumber = Math.floor(time / representation.segmentDuration);
                return {
                    presentationStartTime: segNumber * representation.segmentDuration,
                    duration: representation.segmentDuration,
                    representation,
                    media: 'http://someurl'
                }
            });
        })

        afterEach(() => {
            segRequestStub.restore();
        });

        beforeEach(() => {
            dummyRepresentation = {
                index: 0,
                adaptation: {
                    index: 0,
                    period: {
                        mpd: {
                            manifest: {
                                Period_asArray: [
                                    {
                                        AdaptationSet_asArray: [
                                            {
                                                Representation_asArray: [
                                                    {
                                                        bandwidth: 3000
                                                    }
                                                ]
                                            }
                                        ]
                                    }
                                ]
                            }
                        },
                        start: 0,
                        duration: 30,
                        index: 0
                    }
                },
                segmentInfoType: 'SegmentTimeline',
                timescale: 1,
                segmentDuration: 2
            };
            dummyMediaInfo = {};
        })

        it('should return NaN if no parameters are passed', () => {
            const result = dashHandler.getValidTimeAheadOfTargetTime()

            expect(result).to.be.NaN;
        })

        it('should return NaN if time is not a valid number', () => {
            const result = dashHandler.getValidTimeAheadOfTargetTime('a', {}, {}, 0.5)

            expect(result).to.be.NaN;
        })

        it('should return NaN if time if invalid mediainfo is passed', () => {
            const result = dashHandler.getValidTimeAheadOfTargetTime(3, null, {}, 0.5)

            expect(result).to.be.NaN;
        })

        it('should return NaN if time if invalid representation is passed', () => {
            const result = dashHandler.getValidTimeAheadOfTargetTime(3, {}, null, 0.5)

            expect(result).to.be.NaN;
        })

        it('should return valid time if request can be found and segment durations cover whole period', () => {
            const result = dashHandler.getValidTimeAheadOfTargetTime(3, dummyMediaInfo, dummyRepresentation, 0.5)

            expect(result).to.be.equal(3);
        })

        it('should return NaN if requested time is larger than period end', () => {
            const result = dashHandler.getValidTimeAheadOfTargetTime(32, dummyMediaInfo, dummyRepresentation, 0.5)

            expect(result).to.be.NaN;
        })

        it('should return valid time if requested time is smaller than period start', () => {
            const result = dashHandler.getValidTimeAheadOfTargetTime(-0.5, dummyMediaInfo, dummyRepresentation, 0.5)

            expect(result).to.be.equal(0);
        })

        it('should return NaN if no valid segment is found for time and gap is right period end of period', () => {
            segRequestStub.restore();
            segRequestStub = sinon.stub(segmentsController, 'getSegmentByTime').callsFake((representation, time) => {
                if (time >= 28) {
                    return null;
                }
                const segNumber = Math.floor(time / representation.segmentDuration);
                return {
                    presentationStartTime: segNumber * representation.segmentDuration,
                    duration: representation.segmentDuration,
                    representation,
                    media: 'http://someurl'
                }
            });
            const result = dashHandler.getValidTimeAheadOfTargetTime(29, dummyMediaInfo, dummyRepresentation, 0.5)

            expect(result).to.be.NaN;
        })

        it('should return valid time period duration is set to infinite', () => {
            dummyRepresentation.adaptation.period.duration = Infinity;
            segRequestStub.restore();
            segRequestStub = sinon.stub(segmentsController, 'getSegmentByTime').callsFake((representation, time) => {
                if (time < 28) {
                    return null;
                }
                const segNumber = Math.floor(time / representation.segmentDuration);
                return {
                    presentationStartTime: segNumber * representation.segmentDuration,
                    duration: representation.segmentDuration,
                    representation,
                    media: 'http://someurl'
                }
            });
            const result = dashHandler.getValidTimeAheadOfTargetTime(26.8, dummyMediaInfo, dummyRepresentation, 0.5)

            expect(result).to.be.equal(28 + SEGMENT_START_TIME_DELTA);
        })

        it('should return valid time on the right side of the timeline if gap is in the middle and target time is close to left side of the timeline', () => {
            segRequestStub.restore();
            segRequestStub = sinon.stub(segmentsController, 'getSegmentByTime').callsFake((representation, time) => {
                if (time >= 10 && time < 20) {
                    return null;
                }
                const segNumber = Math.floor(time / representation.segmentDuration);
                return {
                    presentationStartTime: segNumber * representation.segmentDuration,
                    duration: representation.segmentDuration,
                    representation,
                    media: 'http://someurl'
                }
            });
            const result = dashHandler.getValidTimeAheadOfTargetTime(12, dummyMediaInfo, dummyRepresentation, 0.5)

            expect(result).to.be.equal(20);
        })

        it('should return valid time if gap is in the middle and target time is close to right side of the buffer', () => {
            segRequestStub.restore();
            segRequestStub = sinon.stub(segmentsController, 'getSegmentByTime').callsFake((representation, time) => {
                if (time >= 10 && time < 20) {
                    return null;
                }
                const segNumber = Math.floor(time / representation.segmentDuration);
                return {
                    presentationStartTime: segNumber * representation.segmentDuration,
                    duration: representation.segmentDuration,
                    representation,
                    media: 'http://someurl'
                }
            });
            const result = dashHandler.getValidTimeAheadOfTargetTime(18, dummyMediaInfo, dummyRepresentation, 0.5)

            expect(result).to.be.equal(20);
        })

        it('should return NaN if there is only a valid seek time on the left side of the timeline', () => {
            segRequestStub.restore();
            segRequestStub = sinon.stub(segmentsController, 'getSegmentByTime').callsFake((representation, time) => {
                if (time >= 28) {
                    return null;
                }
                const segNumber = Math.floor(time / representation.segmentDuration);
                return {
                    presentationStartTime: segNumber * representation.segmentDuration,
                    duration: representation.segmentDuration,
                    representation,
                    media: 'http://someurl'
                }
            });
            const result = dashHandler.getValidTimeAheadOfTargetTime(28.0001, dummyMediaInfo, dummyRepresentation, 0.5)

            expect(result).to.be.NaN;
        })

        it('should return valid time if only one valid segment after target time', () => {
            segRequestStub.restore();
            segRequestStub = sinon.stub(segmentsController, 'getSegmentByTime').callsFake((representation, time) => {
                if (time < 28) {
                    return null;
                }
                const segNumber = Math.floor(time / representation.segmentDuration);
                return {
                    presentationStartTime: segNumber * representation.segmentDuration,
                    duration: representation.segmentDuration,
                    representation,
                    media: 'http://someurl'
                }
            });
            const result = dashHandler.getValidTimeAheadOfTargetTime(27, dummyMediaInfo, dummyRepresentation, 0.5)

            expect(result).to.be.equal(28);
        })

        it('should return valid time for floating point numbers', () => {
            segRequestStub.restore();
            segRequestStub = sinon.stub(segmentsController, 'getSegmentByTime').callsFake((representation, time) => {
                if (time < 26) {
                    return null;
                }
                const segNumber = Math.floor(time / representation.segmentDuration);
                return {
                    presentationStartTime: segNumber * representation.segmentDuration,
                    duration: representation.segmentDuration,
                    representation,
                    media: 'http://someurl'
                }
            });
            const result = dashHandler.getValidTimeAheadOfTargetTime(25.5, dummyMediaInfo, dummyRepresentation, 0.5)

            expect(result).to.be.equal(26);
        })

        it('buffering time is outside of period values for some reason. Return original buffering time', () => {
            const result = dashHandler.getValidTimeAheadOfTargetTime(50, dummyMediaInfo, dummyRepresentation, 0.3)

            expect(result).to.be.NaN;
        })
    })
});
