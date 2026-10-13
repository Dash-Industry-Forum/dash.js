import StreamProcessor from '../../../../src/streaming/StreamProcessor.js';
import Events from '../../../../src/core/events/Events.js';
import MediaPlayerEvents from '../../../../src/streaming/MediaPlayerEvents.js';
import EventBus from '../../../../src/core/EventBus.js';
import Settings from '../../../../src/core/Settings.js';
import BoxParser from '../../../../src/streaming/utils/BoxParser.js';
import MediaInfoSelectionInput from '../../../../src/streaming/vo/MediaInfoSelectionInput.js';
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

        let segmentListRequestedFor;

        // RepresentationController only stores a non-empty segment list on the Representation.
        const segmentList = { segments: [{ duration: 2, timescale: 1, startTime: 0, media: 'segment.mp4', mediaRange: '0-999' }] };

        const segmentBaseControllerMock = {
            getSegmentBaseInitSegment: function () {
                return Promise.resolve();
            },
            getSegmentList: function (e) {
                segmentListRequestedFor.push(e.representation.id);
                return Promise.resolve(segmentList);
            }
        };

        function switchQuality(newRepresentation, oldRepresentation) {
            streamProcessor.prepareQualityChange({ newRepresentation, oldRepresentation });
        }

        // Buffer pruning after a QuotaExceededError reports it has room again.
        function recoverFromQuotaExceeded() {
            eventBus.trigger(Events.BUFFER_CLEARED, {
                streamId: 'streamId',
                mediaType: testType,
                from: 0,
                to: 10,
                hasEnoughSpaceToAppend: true,
                quotaExceeded: true
            }, { streamId: 'streamId', mediaType: testType });
        }

        let streamProcessor;
        let scheduleController;
        let startScheduleTimerCalls;
        let ongoingRequests;
        let representations;
        let mediaInfo;

        beforeEach(function () {
            segmentListRequestedFor = [];
            ongoingRequests = [];
            representations = [0, 1].map(function (index) {
                return voHelper.createSegmentBaseRepresentation(testType, index);
            });

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
                    // Representation aware, so this stays local to the suite.
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
                        return ongoingRequests;
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
                timelineConverter: Object.assign(objectsHelper.getDummyTimelineConverter(), {
                    // Turns the segment list into segments, see segmentList.
                    calcPresentationTimeFromMediaTime: function (mediaTime) {
                        return mediaTime;
                    }
                })
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

        it('should switch right away even if the segment list of the new Representation is not loaded yet', function () {
            switchQuality(representations[1], representations[0]);

            // Loading the segment list is left to the ScheduleController
            expect(streamProcessor.getRepresentationController().getCurrentRepresentation()).to.equal(representations[1]);
            expect(segmentListRequestedFor).to.deep.equal([representations[0].id]);
        });

        it('should restart scheduling on quota recovery while a default switch waits for an ongoing request', function () {
            // Switch to a Representation whose segment list is already there. A segment is still
            // loading, so the switch is queued until that segment has been appended.
            ongoingRequests = [{}];
            switchQuality(representations[0], representations[1]);

            // The append of that segment failed with a QuotaExceededError, so BYTES_APPENDED never
            // fires. Quota recovery is the only thing left to restart scheduling.
            recoverFromQuotaExceeded();

            expect(startScheduleTimerCalls).to.equal(1);
        });
    });

});
