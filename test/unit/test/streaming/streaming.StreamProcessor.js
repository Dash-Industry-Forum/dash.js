import StreamProcessor from '../../../../src/streaming/StreamProcessor.js';
import Events from '../../../../src/core/events/Events.js';
import MediaPlayerEvents from '../../../../src/streaming/MediaPlayerEvents.js';
import EventBus from '../../../../src/core/EventBus.js';
import Settings from '../../../../src/core/Settings.js';
import BoxParser from '../../../../src/streaming/utils/BoxParser.js';
import MediaInfoSelectionInput from '../../../../src/streaming/vo/MediaInfoSelectionInput.js';
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
import SpecHelper from '../../helpers/SpecHelper.js';
import VoHelper from '../../helpers/VOHelper.js';
import {expect} from 'chai';

const context = {};
const eventBus = EventBus(context).getInstance();
const objectsHelper = new ObjectsHelper();
const specHelper = new SpecHelper();
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

        // While held, getSegmentList() never settles, which is what a slow SegmentBase sidx load
        // looks like on a constrained device. Releasing lets a held preparation finish, so a test
        // can observe what happens after the segment list finally arrives.
        let holdSegmentList;
        let pendingSegmentListResolvers;
        let segmentListRequestedFor;

        const segmentBaseControllerMock = {
            getSegmentBaseInitSegment: function () {
                return Promise.resolve();
            },
            getSegmentList: function (e) {
                segmentListRequestedFor.push(e.representation.id);
                if (!holdSegmentList) {
                    return Promise.resolve({ segments: [] });
                }
                return new Promise(function (resolve) {
                    pendingSegmentListResolvers.push(function () {
                        resolve({ segments: [] });
                    });
                });
            }
        };

        function releaseHeldSegmentLists() {
            const resolvers = pendingSegmentListResolvers;
            pendingSegmentListResolvers = [];
            resolvers.forEach(function (resolve) {
                resolve();
            });
        }

        let streamProcessor;
        let scheduleController;
        let startScheduleTimerCalls;
        let getRequestsCalls;
        let representations;
        let mediaInfo;

        function createSegmentBaseRepresentation(index) {
            const representation = voHelper.createRepresentation(testType, index);
            representation.segmentInfoType = DashConstants.SEGMENT_BASE;
            representation.segments = null;
            return representation;
        }

        beforeEach(function () {
            holdSegmentList = false;
            pendingSegmentListResolvers = [];
            segmentListRequestedFor = [];
            getRequestsCalls = 0;
            representations = [createSegmentBaseRepresentation(0), createSegmentBaseRepresentation(1)];

            // One AdaptationSet, so every Representation shares the MediaInfo. segmentAlignment
            // decides which branch _defaultQualitySwitchPreparationDone() takes; pin it so the
            // tests do not depend on the default.
            mediaInfo = representations[0].mediaInfo;
            mediaInfo.isFragmented = true;
            mediaInfo.segmentAlignment = true;
            representations.forEach(function (representation) {
                representation.mediaInfo = mediaInfo;
            });

            streamProcessor = StreamProcessor(context).create({
                type: testType,
                mimeType: 'video/mp4',
                streamInfo: { id: 'streamId', manifestInfo: { isDynamic: false }, duration: 100 },
                abrController: Object.assign(new AbrControllerMock(), {
                    registerStreamType: function () {
                    },
                    handleNewMediaInfo: function () {
                    },
                    getOptimalRepresentationForBitrate: function () {
                        return representations[0];
                    },
                    getPossibleVoRepresentations: function () {
                        return representations;
                    }
                }),
                adapter: new AdapterMock(),
                baseURLController: objectsHelper.getDummyBaseURLController(),
                boxParser: BoxParser(context).getInstance(),
                capabilities: new CapabilitiesMock(),
                dashMetrics: new DashMetricsMock(),
                errHandler: new ErrorHandlerMock(),
                fragmentModel: {
                    getRequests: function () {
                        getRequestsCalls++;
                        return [];
                    },
                    syncExecutedRequestsWithBufferedRange: function () {
                    }
                },
                manifestModel: new ManifestModelMock(),
                mediaController: new MediaControllerMock(),
                mediaPlayerModel: Object.assign(new MediaPlayerModelMock(), {
                    getFastSwitchEnabled: function () {
                        return false;
                    }
                }),
                playbackController: new PlaybackControllerMock(),
                segmentBaseController: segmentBaseControllerMock,
                segmentBlacklistController: objectsHelper.getDummyBlacklistController(),
                settings: Settings(context).getInstance(),
                textController: new TextControllerMock(),
                timelineConverter: objectsHelper.getDummyTimelineConverter()
            });

            streamProcessor.initialize(new MediaSourceMock(), true, true);

            // MediaSourceMock does not produce a real SourceBuffer, and _onBufferCleared() reads
            // the buffered ranges off it before deciding whether to restart scheduling.
            streamProcessor.getBufferController().getBuffer = function () {
                return {
                    getAllBufferRanges: function () {
                        return [];
                    }
                };
            };

            scheduleController = streamProcessor.getScheduleController();
            startScheduleTimerCalls = 0;
            scheduleController.startScheduleTimer = function () {
                startScheduleTimerCalls++;
            };

            // Seed the processor the way playback does, rather than poking the
            // RepresentationController directly. This is what leaves currentMediaInfo set, which
            // the quality switch preparation needs in order to complete.
            return streamProcessor.selectMediaInfo(new MediaInfoSelectionInput({ newMediaInfo: mediaInfo }))
                .then(function () {
                    startScheduleTimerCalls = 0;
                });
        });

        afterEach(function () {
            releaseHeldSegmentLists();
            // reset() is not idempotent, so a test that resets the processor itself clears this.
            if (streamProcessor) {
                streamProcessor.reset();
                streamProcessor = null;
            }
        });

        it('should seed with only the selected Representation having fetched its segment list', function () {
            const representationController = streamProcessor.getRepresentationController();

            expect(representationController.getCurrentRepresentation().id).to.equal(representations[0].id);
            expect(segmentListRequestedFor).to.deep.equal([representations[0].id]);
        });

        it('should not restart scheduling when an earlier fragment finishes appending while the switch is still being prepared', function () {
            // Switch to a Representation whose segment list still has to be loaded. The mock
            // leaves that load pending, so preparation cannot complete.
            holdSegmentList = true;
            streamProcessor.prepareQualityChange({
                newRepresentation: representations[1],
                oldRepresentation: representations[0]
            });

            // A fragment that was already in flight finishes appending.
            eventBus.trigger(Events.BYTES_APPENDED_END_FRAGMENT, {
                streamId: 'streamId',
                mediaType: testType,
                representationId: representations[0].id
            }, { streamId: 'streamId', mediaType: testType });

            // Scheduling must stay paused: the current Representation has already changed but its
            // segments are not available yet, which would otherwise look like end of stream.
            expect(startScheduleTimerCalls).to.equal(0);
        });

        it('should ignore a segment list that arrives after the processor was reset', function () {
            // Only MediaPlayer.reset() aborts the SegmentBase loader. Stream.deactivate(), on a
            // period or stream switch, resets the processors while the request stays in flight, so
            // the segment list can still arrive after everything has been torn down.
            holdSegmentList = true;
            streamProcessor.prepareQualityChange({
                newRepresentation: representations[1],
                oldRepresentation: representations[0]
            });

            streamProcessor.reset();
            streamProcessor = null;

            // The preparation reaches fragmentModel.getRequests() just before it would touch the
            // controllers reset() has cleared, so no call here means the continuation stopped.
            getRequestsCalls = 0;
            holdSegmentList = false;
            releaseHeldSegmentLists();

            return new Promise(function (resolve) {
                setTimeout(resolve, specHelper.getExecutionDelay());
            }).then(function () {
                expect(getRequestsCalls, 'obsolete preparation must not continue after reset').to.equal(0);
            });
        });

        it('should not restart scheduling on quota recovery while the switch is still being prepared', function () {
            holdSegmentList = true;
            streamProcessor.prepareQualityChange({
                newRepresentation: representations[1],
                oldRepresentation: representations[0]
            });

            // Buffer pruning after a QuotaExceededError reports it has room again.
            eventBus.trigger(Events.BUFFER_CLEARED, {
                streamId: 'streamId',
                mediaType: testType,
                from: 0,
                to: 10,
                hasEnoughSpaceToAppend: true,
                quotaExceeded: true
            }, { streamId: 'streamId', mediaType: testType });

            expect(startScheduleTimerCalls).to.equal(0);
        });

        it('should resume scheduling once the segment list has been resolved', function () {
            holdSegmentList = true;
            streamProcessor.prepareQualityChange({
                newRepresentation: representations[1],
                oldRepresentation: representations[0]
            });

            expect(startScheduleTimerCalls).to.equal(0);

            holdSegmentList = false;
            releaseHeldSegmentLists();

            return new Promise(function (resolve, reject) {
                const deadline = Date.now() + 2000;
                (function poll() {
                    if (startScheduleTimerCalls > 0) {
                        resolve();
                    } else if (Date.now() > deadline) {
                        reject(new Error('scheduling did not resume after the segment list resolved'));
                    } else {
                        setTimeout(poll, 10);
                    }
                })();
            });
        });
    });

});
