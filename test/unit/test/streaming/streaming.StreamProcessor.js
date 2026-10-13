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

        // RepresentationController only stores a non-empty segment list on the Representation.
        const segmentList = { segments: [{ duration: 2, timescale: 1, startTime: 0, media: 'segment.mp4', mediaRange: '0-999' }] };
        let segmentListResponse;

        const segmentBaseControllerMock = {
            getSegmentBaseInitSegment: function () {
                return Promise.resolve();
            },
            getSegmentList: function (e) {
                segmentListRequestedFor.push(e.representation.id);
                const response = segmentListResponse;
                if (!holdSegmentList) {
                    return Promise.resolve(response);
                }
                return new Promise(function (resolve) {
                    pendingSegmentListResolvers.push(function () {
                        resolve(response);
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

        function wait() {
            return new Promise(function (resolve) {
                setTimeout(resolve, specHelper.getExecutionDelay());
            });
        }

        function switchQuality(newRepresentation, oldRepresentation) {
            streamProcessor.prepareQualityChange({ newRepresentation, oldRepresentation });
        }

        function appendFragment() {
            eventBus.trigger(Events.BYTES_APPENDED_END_FRAGMENT, {
                streamId: 'streamId',
                mediaType: testType,
                representationId: representations[0].id
            }, { streamId: 'streamId', mediaType: testType });
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
        // Current Representation each time scheduling was (re)started
        let scheduledOn;
        let getRequestsCalls;
        let ongoingRequests;
        let representations;
        let mediaInfo;

        beforeEach(function () {
            holdSegmentList = false;
            segmentListResponse = segmentList;
            pendingSegmentListResolvers = [];
            segmentListRequestedFor = [];
            getRequestsCalls = 0;
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
                        getRequestsCalls++;
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
            scheduledOn = [];
            scheduleController.startScheduleTimer = function () {
                startScheduleTimerCalls++;
                scheduledOn.push(streamProcessor.getRepresentationController().getCurrentRepresentation());
            };

            // Seed the processor the way playback does, rather than poking the
            // RepresentationController directly. This is what leaves currentMediaInfo set, which
            // the quality switch preparation needs in order to complete.
            return streamProcessor.selectMediaInfo(new MediaInfoSelectionInput({ newMediaInfo: mediaInfo }))
                .then(function () {
                    startScheduleTimerCalls = 0;
                    scheduledOn = [];
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

        it('should keep scheduling the current Representation while the segment list of the new one loads', function () {
            holdSegmentList = true;
            switchQuality(representations[1], representations[0]);

            expect(streamProcessor.getRepresentationController().getCurrentRepresentation()).to.equal(representations[0]);

            appendFragment();
            recoverFromQuotaExceeded();

            expect(startScheduleTimerCalls).to.equal(2);
            expect(scheduledOn).to.deep.equal([representations[0], representations[0]]);
        });

        it('should switch once the segment list of the new Representation has been loaded', function () {
            holdSegmentList = true;
            switchQuality(representations[1], representations[0]);
            releaseHeldSegmentLists();

            return wait().then(function () {
                expect(streamProcessor.getRepresentationController().getCurrentRepresentation()).to.equal(representations[1]);
                expect(scheduledOn).to.deep.equal([representations[1]]);
            });
        });

        it('should ignore a segment list that arrives after a newer switch', function () {
            holdSegmentList = true;
            switchQuality(representations[1], representations[0]);
            // The newer switch targets a Representation whose segment list is already there.
            switchQuality(representations[0], representations[0]);
            releaseHeldSegmentLists();

            return wait().then(function () {
                expect(streamProcessor.getRepresentationController().getCurrentRepresentation()).to.equal(representations[0]);
            });
        });

        it('should ignore a segment list that arrives after the processor was reset', function () {
            // Only MediaPlayer.reset() aborts the SegmentBase loader. Stream.deactivate(), on a
            // period or stream switch, resets the processors while the request stays in flight, so
            // the segment list can still arrive after everything has been torn down.
            holdSegmentList = true;
            switchQuality(representations[1], representations[0]);

            streamProcessor.reset();
            streamProcessor = null;

            // The switch reaches fragmentModel.getRequests() just before it would touch the
            // controllers reset() has cleared, so no call here means the continuation stopped.
            getRequestsCalls = 0;
            releaseHeldSegmentLists();

            return wait().then(function () {
                expect(getRequestsCalls, 'obsolete switch must not continue after reset').to.equal(0);
            });
        });

        it('should switch to the replaced Representation when an MPD update arrives while loading', function () {
            holdSegmentList = true;
            switchQuality(representations[1], representations[0]);
            const staleLoad = pendingSegmentListResolvers.shift();

            // An MPD update installs new Representation instances with the same ids while the
            // segment list of the old instance is still loading.
            representations = [0, 1].map(function (index) {
                const representation = voHelper.createSegmentBaseRepresentation(testType, index);
                representation.mediaInfo = mediaInfo;
                return representation;
            });
            streamProcessor.selectMediaInfo(new MediaInfoSelectionInput({ newMediaInfo: mediaInfo }));

            // Only the load for the old instance completes.
            holdSegmentList = false;
            staleLoad();

            return wait().then(function () {
                const current = streamProcessor.getRepresentationController().getCurrentRepresentation();
                expect(current).to.equal(representations[1]);
                expect(current.segments).to.not.be.empty;
                scheduledOn.forEach(function (representation) {
                    expect(representation.segments, 'scheduled on a Representation without segments').to.not.be.empty;
                });
            });
        });

        it('should apply a queued switch and then a newer switch once its segment list has been loaded', function () {
            // Switch to a Representation whose segment list is already there. A segment is still
            // loading, so the switch is queued until that segment has been appended.
            ongoingRequests = [{}];
            switchQuality(representations[0], representations[1]);

            // A newer switch to a Representation whose segment list still has to be loaded.
            holdSegmentList = true;
            switchQuality(representations[1], representations[0]);

            // The segment the first switch was waiting for finishes appending.
            ongoingRequests = [];
            appendFragment();

            return wait()
                .then(function () {
                    expect(scheduledOn).to.deep.equal([representations[0]]);
                    releaseHeldSegmentLists();
                    return wait();
                })
                .then(function () {
                    expect(streamProcessor.getRepresentationController().getCurrentRepresentation()).to.equal(representations[1]);
                    expect(scheduledOn).to.deep.equal([representations[0], representations[1]]);
                });
        });

        it('should stay on the current Representation when the segment list cannot be loaded', function () {
            segmentListResponse = { error: 'sidx request failed' };
            switchQuality(representations[1], representations[0]);

            return wait().then(function () {
                expect(streamProcessor.getRepresentationController().getCurrentRepresentation()).to.equal(representations[0]);
                expect(scheduledOn).to.be.empty;
            });
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
