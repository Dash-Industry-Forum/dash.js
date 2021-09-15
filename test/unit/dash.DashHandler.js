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

const expect = require('chai').expect;

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

    describe('getValidSeekTimeCloseToTargetTime()', () => {
        let dummyRepresentation;
        let dummyMediaInfo

        beforeEach(() => {
            dummyRepresentation = {
                index: 0,
                adaptation: {
                    index: 0,
                    period: {
                        start: 0,
                        duration: 30,
                        index: 0,
                        mpd: {
                            manifest: {
                                Period_asArray: [
                                    {
                                        AdaptationSet_asArray: [{
                                            Representation_asArray: [
                                                {
                                                    SegmentTemplate: {
                                                        SegmentTimeline: {
                                                            S_asArray: [{
                                                                t: 0,
                                                                r: 14,
                                                                d: 2
                                                            }]
                                                        }
                                                    }
                                                }
                                            ]
                                        }]
                                    }
                                ]
                            }
                        }
                    }
                },
                segmentInfoType: 'SegmentTimeline',
                timescale: 1,
                segmentDuration: 4
            };
            dummyMediaInfo = {};
        })

        it('should return NaN if no parameters are passed', () => {
            const result = dashHandler.getValidSeekTimeCloseToTargetTime()

            expect(result).to.be.NaN;
        })

        it('should return NaN if time is not a valid number', () => {
            const result = dashHandler.getValidSeekTimeCloseToTargetTime('a', {}, {}, 0.5)

            expect(result).to.be.NaN;
        })

        it('should return NaN if time if invalid mediainfo is passed', () => {
            const result = dashHandler.getValidSeekTimeCloseToTargetTime(3, null, {}, 0.5)

            expect(result).to.be.NaN;
        })

        it('should return NaN if time if invalid representation is passed', () => {
            const result = dashHandler.getValidSeekTimeCloseToTargetTime(3, {}, null, 0.5)

            expect(result).to.be.NaN;
        })

        it('should return valid time if request can be found', () => {
            const result = dashHandler.getValidSeekTimeCloseToTargetTime(3, dummyMediaInfo, dummyRepresentation, 0.5)

            expect(result).to.be.NaN;
        })
    })
})
;
