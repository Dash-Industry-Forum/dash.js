import StreamProcessor from '../../../../src/streaming/StreamProcessor.js';
import Events from '../../../../src/core/events/Events.js';
import MediaPlayerEvents from '../../../../src/streaming/MediaPlayerEvents.js';
import EventBus from '../../../../src/core/EventBus.js';
import Settings from '../../../../src/core/Settings.js';
import BoxParser from '../../../../src/streaming/utils/BoxParser.js';
import DashConstants from '../../../../src/dash/constants/DashConstants.js';
import AbrControllerMock from '../../mocks/AbrControllerMock.js';
import AdapterMock from '../../mocks/AdapterMock.js';
import CapabilitiesMock from '../../mocks/CapabilitiesMock.js';
import DashMetricsMock from '../../mocks/DashMetricsMock.js';
import ErrorHandlerMock from '../../mocks/ErrorHandlerMock.js';
import ManifestModelMock from '../../mocks/ManifestModelMock.js';
import MediaControllerMock from '../../mocks/MediaControllerMock.js';
import MediaPlayerModelMock from '../../mocks/MediaPlayerModelMock.js';
import MediaSourceMock from '../../mocks/MediaSourceMock.js';
import PlaybackControllerMock from '../../mocks/PlaybackControllerMock.js';
import TextControllerMock from '../../mocks/TextControllerMock.js';
import ObjectsHelper from '../../helpers/ObjectsHelper.js';
import VoHelper from '../../helpers/VOHelper.js';
import {expect} from 'chai';

const context = {};
const eventBus = EventBus(context).getInstance();
const objectsHelper = new ObjectsHelper();
const voHelper = new VoHelper();

Events.extend(MediaPlayerEvents);

const streamInfo = {
    id: 'streamId',
    manifestInfo: {
        isDynamic: true
    }
};

describe('StreamProcessor', function () {
    describe('StreamProcessor not initialized', function () {
        let streamProcessor = null;

        beforeEach(function () {
            streamProcessor = StreamProcessor(context).create({streamInfo: streamInfo});
        });

        afterEach(function () {
            streamProcessor.reset();
        });

        it('setExplicitBufferingTime should not throw an error', function () {
            expect(streamProcessor.setExplicitBufferingTime.bind(streamProcessor)).to.not.throw();
        });

        it('setEnhancementStreamProcessor should exist', function () {
            expect(streamProcessor.setEnhancementStreamProcessor).to.be.a('function');
        });

        it('setEnhancementStreamProcessor should not throw an error', function () {
            expect(streamProcessor.setEnhancementStreamProcessor.bind(streamProcessor, {})).to.not.throw();
        });

    });

    describe('Scheduling while a quality switch is being prepared', function () {
        const testType = 'video';

        // Held open so the quality switch stays mid-preparation for the duration of the test,
        // which is what a slow SegmentBase sidx load looks like on a constrained device.
        let resolvePendingSegmentList;

        const segmentBaseControllerMock = {
            getSegmentBaseInitSegment: function () {
                return Promise.resolve();
            },
            getSegmentList: function () {
                return new Promise(function (resolve) {
                    resolvePendingSegmentList = function () {
                        resolve({ segments: [] });
                    };
                });
            }
        };

        let streamProcessor;
        let scheduleController;
        let startScheduleTimerCalls;
        let representations;

        function createSegmentBaseRepresentation(index) {
            const representation = voHelper.createRepresentation(testType, index);
            representation.segmentInfoType = DashConstants.SEGMENT_BASE;
            representation.segments = null;
            return representation;
        }

        beforeEach(function () {
            resolvePendingSegmentList = null;
            representations = [createSegmentBaseRepresentation(0), createSegmentBaseRepresentation(1)];

            streamProcessor = StreamProcessor(context).create({
                type: testType,
                mimeType: 'video/mp4',
                streamInfo: { id: 'streamId', manifestInfo: { isDynamic: false }, duration: 100 },
                abrController: Object.assign(new AbrControllerMock(), {
                    registerStreamType: function () {
                    },
                    unRegisterStreamType: function () {
                    },
                    setPlaybackQuality: function () {
                    }
                }),
                adapter: new AdapterMock(),
                baseURLController: objectsHelper.getDummyBaseURLController(),
                boxParser: BoxParser(context).getInstance(),
                capabilities: new CapabilitiesMock(),
                dashMetrics: new DashMetricsMock(),
                errHandler: new ErrorHandlerMock(),
                manifestModel: new ManifestModelMock(),
                mediaController: new MediaControllerMock(),
                mediaPlayerModel: new MediaPlayerModelMock(),
                playbackController: new PlaybackControllerMock(),
                segmentBaseController: segmentBaseControllerMock,
                segmentBlacklistController: objectsHelper.getDummyBlacklistController(),
                settings: Settings(context).getInstance(),
                textController: new TextControllerMock(),
                timelineConverter: objectsHelper.getDummyTimelineConverter()
            });

            streamProcessor.initialize(new MediaSourceMock(), true, true);

            scheduleController = streamProcessor.getScheduleController();
            startScheduleTimerCalls = 0;
            scheduleController.startScheduleTimer = function () {
                startScheduleTimerCalls++;
            };

            // Seed the RepresentationController the way startup would, with representation 0
            // selected and its segment list resolved.
            const representationController = streamProcessor.getRepresentationController();
            const updated = representationController.updateData(representations, true, representations[0].id);
            if (resolvePendingSegmentList) {
                resolvePendingSegmentList();
            }
            return updated;
        });

        afterEach(function () {
            streamProcessor.reset();
            streamProcessor = null;
        });

        it('should not restart scheduling when an earlier fragment finishes appending while the switch is still being prepared', function () {
            // Switch to a representation whose segment list still has to be loaded. The mock
            // leaves that load pending, so preparation cannot complete.
            streamProcessor.prepareQualityChange({
                newRepresentation: representations[1],
                oldRepresentation: representations[0]
            });

            startScheduleTimerCalls = 0;

            // A fragment that was already in flight finishes appending.
            eventBus.trigger(Events.BYTES_APPENDED_END_FRAGMENT, {
                streamId: 'streamId',
                mediaType: testType,
                representationId: representations[0].id
            }, { streamId: 'streamId', mediaType: testType });

            // Scheduling must stay paused: the current representation has already changed but
            // its segments are not available yet, which would otherwise look like end of stream.
            expect(startScheduleTimerCalls).to.equal(0);
        });
    });

});
