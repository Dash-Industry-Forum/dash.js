import StreamProcessor from '../../../../src/streaming/StreamProcessor.js';
import Events from '../../../../src/core/events/Events.js';
import MediaPlayerEvents from '../../../../src/streaming/MediaPlayerEvents.js';
import EventBus from '../../../../src/core/EventBus.js';
import Settings from '../../../../src/core/Settings.js';
import Errors from '../../../../src/core/errors/Errors.js';
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

    describe('SegmentBase segment lists', function () {
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
        let requestQueries;
        let fastSwitchEnabled;
        let playbackController;
        let errHandler;
        let abrController;
        let executedRequests;
        let representations;
        let mediaInfo;

        beforeEach(function () {
            segmentListRequestedFor = [];
            ongoingRequests = [];
            requestQueries = [];
            fastSwitchEnabled = false;
            playbackController = new PlaybackControllerMock();
            errHandler = new ErrorHandlerMock();
            // Representation aware, so this stays local to the suite.
            abrController = Object.assign(new AbrControllerMock(), {
                getOptimalRepresentationForBitrate: function () {
                    return representations[0];
                },
                getPossibleVoRepresentations: function () {
                    return representations;
                }
            });
            executedRequests = [];
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
                abrController,
                adapter: new AdapterMock(),
                baseURLController: objectsHelper.getDummyBaseURLController(),
                boxParser: BoxParser(context).getInstance(),
                capabilities: new CapabilitiesMock(),
                dashMetrics: new DashMetricsMock(),
                errHandler,
                fragmentModel: {
                    getRequests: function (filter) {
                        requestQueries.push(filter);
                        return ongoingRequests;
                    },
                    executeRequest: function (request) {
                        executedRequests.push(request);
                    },
                    syncExecutedRequestsWithBufferedRange: function () {
                    }
                },
                manifestModel: new ManifestModelMock(),
                mediaController: new MediaControllerMock(),
                mediaPlayerModel: Object.assign(new MediaPlayerModelMock(), {
                    getFastSwitchEnabled: function () {
                        return fastSwitchEnabled;
                    },
                    getScheduleTimeout: function () {
                        return 500;
                    }
                }),
                playbackController,
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

        it('should switch right away and start loading the segment list of the new Representation', function () {
            switchQuality(representations[1], representations[0]);

            // Not awaited, the segment list loads in parallel to the init segment
            expect(streamProcessor.getRepresentationController().getCurrentRepresentation()).to.equal(representations[1]);
            expect(segmentListRequestedFor).to.deep.equal([representations[0].id, representations[1].id]);
        });

        [NaN, null].forEach(function (fragmentDuration) {
            it(`should use the duration of the old Representation for a fast switch if the new one is ${fragmentDuration}`, function () {
                fastSwitchEnabled = true;
                playbackController.setTime(10);
                representations[0].fragmentDuration = 2;
                representations[1].fragmentDuration = fragmentDuration;
                requestQueries = [];

                switchQuality(representations[1], representations[0]);

                expect(requestQueries[0].time).to.equal(13);
            });
        });

        it('should not request a media segment while the segment list is missing and resume scheduling once it is loaded', function () {
            // Hold the segment list request, so the quality switch preparation can settle first
            let releaseSegmentList;
            segmentBaseControllerMock.getSegmentList = function (e) {
                segmentListRequestedFor.push(e.representation.id);
                return new Promise(function (resolve) {
                    releaseSegmentList = function () {
                        resolve(segmentList);
                    };
                });
            };
            switchQuality(representations[1], representations[0]);
            const load = streamProcessor.getRepresentationController().loadSegmentList(representations[1]);

            return new Promise(function (resolve) {
                setTimeout(resolve, 0);
            }).then(function () {
                startScheduleTimerCalls = 0;
                eventBus.trigger(Events.MEDIA_FRAGMENT_NEEDED, {}, { streamId: 'streamId', mediaType: testType });
                eventBus.trigger(Events.MEDIA_FRAGMENT_NEEDED, {}, { streamId: 'streamId', mediaType: testType });

                expect(segmentListRequestedFor).to.deep.equal([representations[0].id, representations[1].id]);
                expect(executedRequests).to.be.empty;
                // No polling while the segment list loads
                expect(startScheduleTimerCalls).to.equal(0);

                releaseSegmentList();
                return load;
            }).then(function () {
                return Promise.resolve();
            }).then(function () {
                expect(startScheduleTimerCalls).to.equal(1);
                expect(errHandler.errorCode).to.be.undefined;
            }).finally(function () {
                segmentBaseControllerMock.getSegmentList = function (e) {
                    segmentListRequestedFor.push(e.representation.id);
                    return Promise.resolve(segmentList);
                };
            });
        });

        it('should not restart scheduling once the segment list is loaded while a quality switch is prepared', function () {
            let releaseSegmentList;
            segmentBaseControllerMock.getSegmentList = function (e) {
                segmentListRequestedFor.push(e.representation.id);
                return new Promise(function (resolve) {
                    releaseSegmentList = function () {
                        resolve(segmentList);
                    };
                });
            };
            switchQuality(representations[1], representations[0]);
            const load = streamProcessor.getRepresentationController().loadSegmentList(representations[1]);

            return new Promise(function (resolve) {
                setTimeout(resolve, 0);
            }).then(function () {
                eventBus.trigger(Events.MEDIA_FRAGMENT_NEEDED, {}, { streamId: 'streamId', mediaType: testType });

                // A segment is still loading, so this switch waits and stays in progress
                ongoingRequests = [{}];
                switchQuality(representations[0], representations[1]);
                startScheduleTimerCalls = 0;

                releaseSegmentList();
                return load;
            }).then(function () {
                return Promise.resolve();
            }).then(function () {
                expect(startScheduleTimerCalls).to.equal(0);
            }).finally(function () {
                segmentBaseControllerMock.getSegmentList = function (e) {
                    segmentListRequestedFor.push(e.representation.id);
                    return Promise.resolve(segmentList);
                };
            });
        });

        it('should not restart scheduling once the segment list is loaded while the buffer is pruned', function () {
            let releaseSegmentList;
            segmentBaseControllerMock.getSegmentList = function (e) {
                segmentListRequestedFor.push(e.representation.id);
                return new Promise(function (resolve) {
                    releaseSegmentList = function () {
                        resolve(segmentList);
                    };
                });
            };
            switchQuality(representations[1], representations[0]);
            const load = streamProcessor.getRepresentationController().loadSegmentList(representations[1]);
            const bufferController = streamProcessor.getBufferController();

            return new Promise(function (resolve) {
                setTimeout(resolve, 0);
            }).then(function () {
                eventBus.trigger(Events.MEDIA_FRAGMENT_NEEDED, {}, { streamId: 'streamId', mediaType: testType });
                // Pruning starts after the request was put on hold, e.g. after a QuotaExceededError
                bufferController.getIsPruningInProgress = () => true;
                startScheduleTimerCalls = 0;

                releaseSegmentList();
                return load;
            }).then(function () {
                return Promise.resolve();
            }).then(function () {
                expect(startScheduleTimerCalls).to.equal(0);
            }).finally(function () {
                segmentBaseControllerMock.getSegmentList = function (e) {
                    segmentListRequestedFor.push(e.representation.id);
                    return Promise.resolve(segmentList);
                };
            });
        });

        it('should report an error if the segment list failed to load and there is no other Representation to switch to', function () {
            segmentBaseControllerMock.getSegmentList = function (e) {
                segmentListRequestedFor.push(e.representation.id);
                return Promise.resolve({ error: 'sidx request failed' });
            };
            let excluded;
            abrController.excludeRepresentation = function (rep) {
                excluded = rep.id;
            };

            let errorCount = 0;
            const reportError = errHandler.error;
            errHandler.error = function (error) {
                errorCount++;
                reportError.call(errHandler, error);
            };

            // The load is started by the quality switch and fails before scheduling waits for it
            switchQuality(representations[1], representations[0]);
            const load = streamProcessor.getRepresentationController().loadSegmentList(representations[1]);

            return load.then(function () {
                eventBus.trigger(Events.MEDIA_FRAGMENT_NEEDED, {}, { streamId: 'streamId', mediaType: testType });
                eventBus.trigger(Events.MEDIA_FRAGMENT_NEEDED, {}, { streamId: 'streamId', mediaType: testType });

                expect(excluded).to.equal(representations[1].id);
                expect(errHandler.errorCode).to.equal(Errors.SEGMENT_BASE_LOADER_ERROR_CODE);
                expect(errorCount).to.equal(1);
                expect(executedRequests).to.be.empty;
                // Buffering is not completed without a segment list
                expect(streamProcessor.checkAndHandleCompletedBuffering()).to.be.false;
            }).finally(function () {
                segmentBaseControllerMock.getSegmentList = function (e) {
                    segmentListRequestedFor.push(e.representation.id);
                    return Promise.resolve(segmentList);
                };
            });
        });

        it('should not report buffering as completed while the segment list is missing', function () {
            switchQuality(representations[1], representations[0]);

            expect(streamProcessor.checkAndHandleCompletedBuffering()).to.be.false;
        });

        it('should not start loading a segment list when checking whether buffering is completed', function () {
            const representationController = streamProcessor.getRepresentationController();
            representationController.prepareQualityChange = function (rep) {
                // Switch without the early start of the segment list load
                this.getCurrentRepresentation = () => this.getRepresentationById(rep.id);
            };
            switchQuality(representations[1], representations[0]);

            expect(streamProcessor.checkAndHandleCompletedBuffering()).to.be.false;
            expect(segmentListRequestedFor).to.deep.equal([representations[0].id]);
        });

        it('should use the duration of the new Representation for a fast switch once its segment list is loaded', function () {
            const representationController = streamProcessor.getRepresentationController();
            return representationController.loadSegmentList(representations[1]).then(function () {
                fastSwitchEnabled = true;
                playbackController.setTime(10);
                requestQueries = [];
                representationController.getRepresentationById(representations[0].id).fragmentDuration = 4;

                // The Representations of ABR carry no duration
                switchQuality(Object.assign({}, representations[1], { fragmentDuration: null }), representations[0]);

                // 10 + 1.5 * 1 (segmentDuration of the new Representation) instead of 1.5 * 4 (old Representation)
                expect(requestQueries[0].time).to.equal(11.5);
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
