import ObjectUtils from '../../src/streaming/utils/ObjectUtils';
import BufferController from '../../src/streaming/controllers/BufferController';
import MetricsModel from '../../src/streaming/models/MetricsModel';
import ErrorHandler from '../../src/streaming/utils/ErrorHandler';
import StreamController from '../../src/streaming/controllers/StreamController';
import MediaController from '../../src/streaming/controllers/MediaController';
import TextController from '../../src/streaming/text/TextController';
import SourceBufferController from '../../src/streaming/controllers/SourceBufferController';
import AbrController from '../../src/streaming/controllers/AbrController';
import EventBus from '../../src/core/EventBus';
import Events from '../../src/core/events/Events';
import InitCache from '../../src/streaming/utils/InitCache';
import Debug from '../../src/core/Debug';

import SourceBufferControllerMock from './mocks/SourceBufferControllerMock';
import MetricsModelMock from './mocks/MetricsModelMock';
const chai = require('chai');
const expect = chai.expect;

const context = {};
const testType = 'video';
const eventBus = EventBus(context).getInstance();
const objectUtils = ObjectUtils(context).getInstance();
const initCache = InitCache(context).getInstance();


class StreamControllerMock {
    getActiveStreamInfo() {
        return {
            id: 'some_id'
        };
    }
}

class StreamProcessorMock {
    constructor() {
        this.type = testType;
    }

    getType() {
        return this.type;
    }

    getCurrentTrack() {}

    getStreamInfo() {
        return {
            id: 'some_id'
        };
    }

    getMediaInfo() {
        return {
            bitrateList: [],
            mimeType: "video/mp4"
        };
    }

    getIndexHandler() {
        return {
            updateRepresentation: () => {}
        };
    }

    getScheduleController() {
        return {
            getBufferTarget() {
                return 20;
            }
        };
    }

    getFragmentModel() {
        return 'fragmentModel';
    }
    isDynamic() {
        return true;
    }

    getRepresentationInfoForQuality(quality) {
        let offest = quality ? 2 : 1;
        return {
            MSETimeOffset: offest
        }
    }

    reset() {}
}

class AdapterMock {
    constructor() {
        this.metricsList = {
            BUFFER_STATE: 'BUFFER_STATE'
        };
    }
    getEventsFor() {
        return null;
    }
}

class PlaybackControllerMock {
    constructor() {
        this.time = 10;
    }

    getTime() {
        return this.time;
    }


}

describe("BufferController", function () {

    // disbale log

    let debug = Debug(context).getInstance();
    debug.setLogToBrowserConsole(false);
    let streamProcessor = new StreamProcessorMock();
    let sourceBufferMock = new SourceBufferControllerMock(testType);
    let streamControllerMock = new StreamControllerMock();
    let adapterMock = new AdapterMock();
    let metricsModelMock = new MetricsModelMock();
    let playbackControllerMock = new PlaybackControllerMock();

    let bufferController;

    beforeEach(function () {

        bufferController = BufferController(context).create({
            metricsModel: metricsModelMock,
            sourceBufferController: sourceBufferMock,
            errHandler: ErrorHandler(context).getInstance(),
            streamController: streamControllerMock,
            mediaController: MediaController(context).getInstance(),
            adapter: adapterMock,
            textController: TextController(context).getInstance(),
            abrController: AbrController(context).getInstance(),
            streamProcessor: streamProcessor,
            type: testType,
            playbackController: playbackControllerMock
        });
    });

    afterEach(function () {
        bufferController = null;
        streamProcessor.reset();
        sourceBufferMock.reset(testType);
    });

    describe('Method initialize', function () {
        it('should initialize the controller', function () {

            expect(bufferController.getType()).to.equal(testType);
            bufferController.initialize({});

        });
    })

    describe('Method createBuffer', function () {
        it('should not create a sourceBuffer if controller is not initialized', function () {

            let buffer = bufferController.createBuffer('mediaInfos');
            expect(buffer).to.not.exist;
        });

        it('should not create a sourceBuffer if controller is initialized with incorrect mediaSource', function () {
            bufferController.initialize(null);
            let buffer = bufferController.createBuffer('mediaInfos');
            expect(buffer).to.not.exist;
        });

        it('should create a sourceBuffer and initialize it', function () {
            bufferController.initialize({});
            let buffer = bufferController.createBuffer('mediaInfos');
            expect(buffer).to.exist;
            expect(buffer.timestampOffset).to.equal(1);
        });
    });

    describe('Method getStreamProcessor', function () {
        it('should return configured stream processor', function () {
            let configuredSP = bufferController.getStreamProcessor();
            expect(objectUtils.areEqual(configuredSP, streamProcessor)).to.be.true;
        });
    });

    describe('Methods get/set Buffer', function () {
        it('should update buffer', function () {
            let buffer = 'testBuffer';
            bufferController.setBuffer(buffer);
            expect(bufferController.getBuffer()).to.equal(buffer);
        });
    });

    describe('Methods get/set Media Source', function () {
        it('should update media source', function () {
            let mediaSource = 'test';
            bufferController.setMediaSource(mediaSource);
            expect(bufferController.getMediaSource()).to.equal(mediaSource);
        });
    });

    describe('Method switchInitData', function () {
        it('should append init data to source buffer if data have been cached', function () {
            let chunk = {
                bytes: 'initData',
                quality: 2,
                mediaInfo: {
                    type: 'video'
                },
                streamId: 'streamId',
                representationId: 'representationId'
            };

            initCache.save(chunk);

            bufferController.initialize({});
            bufferController.switchInitData('streamId', 'representationId');
            expect(sourceBufferMock.buffer.bytes).to.equal(chunk.bytes);
        });

        it('should trigger INIT_REQUESTED if no init data is cached', function (done) {

            // reset cache
            initCache.reset();

            bufferController.initialize({});
            let onInitRequest = function () {
                eventBus.off(Events.INIT_REQUESTED, onInitRequest);
                done();
            }
            eventBus.on(Events.INIT_REQUESTED, onInitRequest, this);

            bufferController.switchInitData('streamId', 'representationId');
        });
    });

    describe('Method reset', function () {
        it('should reset buffer controller', function () {
            let buffer = 'testBuffer';
            bufferController.setBuffer(buffer);
            expect(bufferController.getBuffer()).to.equal(buffer);

            bufferController.reset();
            expect(sourceBufferMock.aborted).to.be.true;
            expect(sourceBufferMock.sourceBufferRemoved).to.be.true;
            expect(bufferController.getBuffer()).to.not.exist;
        });
    });

    describe('Event INIT_FRAGMENT_LOADED handler', function () {
        it('should not append data to source buffer if wrong fragment model', function (done) {

            let event = {
                fragmentModel: 'wrongFragmentModel',
                chunk: {
                    bytes: 'initData',
                    quality: 2,
                    mediaInfo: {
                        type: 'video'
                    },
                    streamId: 'streamId',
                    representationId: 'representationId'
                }
            }
            let onInitDataLoaded = function () {
                eventBus.off(Events.INIT_FRAGMENT_LOADED, onInitDataLoaded);
                expect(sourceBufferMock.buffer.bytes).to.be.undefined;
                done();
            }
            eventBus.on(Events.INIT_FRAGMENT_LOADED, onInitDataLoaded, this);

            expect(sourceBufferMock.buffer.bytes).to.be.undefined;
            // send event
            eventBus.trigger(Events.INIT_FRAGMENT_LOADED, event)
        });

        it('should append data to source buffer ', function (done) {

            let event = {
                fragmentModel: 'fragmentModel',
                chunk: {
                    bytes: 'initData',
                    quality: 2,
                    mediaInfo: {
                        type: 'video'
                    },
                    streamId: 'streamId',
                    representationId: 'representationId'
                }
            }
            let onInitDataLoaded = function () {
                eventBus.off(Events.INIT_FRAGMENT_LOADED, onInitDataLoaded);
                expect(sourceBufferMock.buffer.bytes).to.equal(event.chunk.bytes);
                done();
            }
            eventBus.on(Events.INIT_FRAGMENT_LOADED, onInitDataLoaded, this);

            expect(sourceBufferMock.buffer.bytes).to.be.undefined;
            // send event
            eventBus.trigger(Events.INIT_FRAGMENT_LOADED, event)
        });

        it('should save init data into cache', function (done) {

            let chunk = {
                bytes: 'initData',
                quality: 2,
                mediaInfo: {
                    type: 'video'
                },
                streamId: 'streamId',
                representationId: 'representationId'
            }
            let event = {
                fragmentModel: 'fragmentModel',
                chunk: chunk
            }

            initCache.reset();
            let cache = initCache.extract(chunk.streamId, chunk.representationId);
            let onInitDataLoaded = function () {
                eventBus.off(Events.INIT_FRAGMENT_LOADED, onInitDataLoaded);

                // check initCache
                cache = initCache.extract(chunk.streamId, chunk.representationId);
                expect(cache.bytes).to.equal(chunk.bytes);
                done();
            }
            eventBus.on(Events.INIT_FRAGMENT_LOADED, onInitDataLoaded, this);

            expect(cache).to.not.exist;
            // send event
            eventBus.trigger(Events.INIT_FRAGMENT_LOADED, event)
        });
    });
    describe('Event MEDIA_FRAGMENT_LOADED handler', function () {
        it('should not append data to source buffer if wrong fragment model', function (done) {

            let event = {
                fragmentModel: 'wrongFragmentModel',
                chunk: {
                    bytes: 'data',
                    quality: 2,
                    mediaInfo: {
                        type: 'video'
                    },
                    streamId: 'streamId',
                    representationId: 'representationId'
                }
            }
            let onMediaFragmentLoaded = function () {
                eventBus.off(Events.MEDIA_FRAGMENT_LOADED, onMediaFragmentLoaded);
                expect(sourceBufferMock.buffer.bytes).to.be.undefined;
                done();
            }
            eventBus.on(Events.MEDIA_FRAGMENT_LOADED, onMediaFragmentLoaded, this);

            expect(sourceBufferMock.buffer.bytes).to.be.undefined;
            // send event
            eventBus.trigger(Events.MEDIA_FRAGMENT_LOADED, event)
        });

        it('should append data to source buffer ', function (done) {

            let event = {
                fragmentModel: 'fragmentModel',
                chunk: {
                    bytes: 'data',
                    quality: 2,
                    mediaInfo: 'video'
                }
            }
            let onMediaFragmentLoaded = function () {
                eventBus.off(Events.MEDIA_FRAGMENT_LOADED, onMediaFragmentLoaded);
                expect(sourceBufferMock.buffer.bytes).to.equal(event.chunk.bytes);
                done();
            }
            eventBus.on(Events.MEDIA_FRAGMENT_LOADED, onMediaFragmentLoaded, this);

            expect(sourceBufferMock.buffer.bytes).to.be.undefined
            // send event
            eventBus.trigger(Events.MEDIA_FRAGMENT_LOADED, event)
        });

        it('should trigger VIDEO_CHUNK_RECEIVED if event is video', function (done) {

            let event = {
                fragmentModel: 'fragmentModel',
                chunk: {
                    bytes: 'data',
                    quality: 2,
                    mediaInfo: {
                        type: 'video'
                    }
                }
            }
            let onVideoChunk = function () {
                eventBus.off(Events.VIDEO_CHUNK_RECEIVED, onVideoChunk);
                done();
            }
            eventBus.on(Events.VIDEO_CHUNK_RECEIVED, onVideoChunk, this);

            // send event
            eventBus.trigger(Events.MEDIA_FRAGMENT_LOADED, event)
        });
    });

    describe('Event MEDIA_FRAGMENT_LOADED handler', function () {
        it('should not update buffer timestamp offset - wrong stream processor id', function (done) {

            // init test
            bufferController.initialize({});
            let buffer = bufferController.createBuffer('mediaInfos');
            expect(buffer).to.exist;
            expect(buffer.timestampOffset).to.equal(1);

            let event = {
                newQuality : 2,
                mediaType : testType,
                streamInfo: {
                    id : 'wrongid'
                }
            }
            let onQualityChanged = function () {
                eventBus.off(Events.QUALITY_CHANGE_REQUESTED, onQualityChanged, this);

                expect(buffer.timestampOffset).to.equal(1);
                done();
            }
            eventBus.on(Events.QUALITY_CHANGE_REQUESTED, onQualityChanged, this);

            // send event
            eventBus.trigger(Events.QUALITY_CHANGE_REQUESTED, event)
        });

        it('should not update buffer timestamp offset - wrong media type', function (done) {

            // init test
            bufferController.initialize({});
            let buffer = bufferController.createBuffer('mediaInfos');
            expect(buffer).to.exist;
            expect(buffer.timestampOffset).to.equal(1);

            let event = {
                newQuality : 2,
                mediaType : 'wrongMediaType',
                streamInfo: {
                    id : streamProcessor.getStreamInfo().id
                }
            }
            let onQualityChanged = function () {
                eventBus.off(Events.QUALITY_CHANGE_REQUESTED, onQualityChanged, this);

                expect(buffer.timestampOffset).to.equal(1);
                done();
            }
            eventBus.on(Events.QUALITY_CHANGE_REQUESTED, onQualityChanged, this);

            // send event
            eventBus.trigger(Events.QUALITY_CHANGE_REQUESTED, event)
        });

        it('should not update buffer timestamp offset - wrong quality', function (done) {
            // init test
            bufferController.initialize({});
            let buffer = bufferController.createBuffer('mediaInfos');
            expect(buffer).to.exist;
            expect(buffer.timestampOffset).to.equal(1);

            let event = {
                newQuality : 0,
                mediaType : testType,
                streamInfo: {
                    id : streamProcessor.getStreamInfo().id
                }
            }
            let onQualityChanged = function () {
                eventBus.off(Events.QUALITY_CHANGE_REQUESTED, onQualityChanged, this);

                expect(buffer.timestampOffset).to.equal(1);
                done();
            }
            eventBus.on(Events.QUALITY_CHANGE_REQUESTED, onQualityChanged, this);

            // send event
            eventBus.trigger(Events.QUALITY_CHANGE_REQUESTED, event)
        });

        it('should update buffer timestamp offset', function (done) {

            // init test
            bufferController.initialize({});
            let buffer = bufferController.createBuffer('mediaInfos');
            expect(buffer).to.exist;
            expect(buffer.timestampOffset).to.equal(1);

            let event = {
                newQuality : 2,
                mediaType : testType,
                streamInfo: {
                    id : streamProcessor.getStreamInfo().id
                }
            }
            let onQualityChanged = function () {
                eventBus.off(Events.QUALITY_CHANGE_REQUESTED, onQualityChanged, this);

                expect(buffer.timestampOffset).to.equal(2);
                done();
            }
            eventBus.on(Events.QUALITY_CHANGE_REQUESTED, onQualityChanged, this);

            // send event
            eventBus.trigger(Events.QUALITY_CHANGE_REQUESTED, event)
        });
    });

    describe('Event PLAYBACK_SEEKING handler', function () {
        it('should trigger BUFFER_LEVEL_UPDATED event', function (done) {

            // init test
            bufferController.initialize({});
            let buffer = bufferController.createBuffer('mediaInfos');
            expect(buffer).to.exist;

            let onBufferLevelUpdated = function (e) {
                eventBus.off(Events.BUFFER_LEVEL_UPDATED, onBufferLevelUpdated, this);
                expect(e.bufferLevel).to.equal(sourceBufferMock.getBufferLength());

                done();
            }
            eventBus.on(Events.BUFFER_LEVEL_UPDATED, onBufferLevelUpdated, this);

            // send event
            eventBus.trigger(Events.PLAYBACK_SEEKING)
        });

        it('should trigger BUFFER_LEVEL_STATE_CHANGED event', function (done) {

            // init test
            bufferController.initialize({});
            let buffer = bufferController.createBuffer('mediaInfos');
            expect(buffer).to.exist;

            let onBufferStateChanged = function (e) {
                eventBus.off(Events.BUFFER_LEVEL_STATE_CHANGED, onBufferStateChanged, this);
                expect(e.state).to.equal('bufferLoaded');

                done();
            }
            eventBus.on(Events.BUFFER_LEVEL_STATE_CHANGED, onBufferStateChanged, this);

            // send event
            eventBus.trigger(Events.PLAYBACK_SEEKING)
        });

        it('should trigger BUFFER_LOADED event if enough buffer', function (done) {

            // init test
            bufferController.initialize({});
            let buffer = bufferController.createBuffer('mediaInfos');
            expect(buffer).to.exist;

            let onBufferLoaded = function (e) {
                eventBus.off(Events.BUFFER_LOADED, onBufferLoaded, this);
                done();
            }
            eventBus.on(Events.BUFFER_LOADED, onBufferLoaded, this);

            // send event
            eventBus.trigger(Events.PLAYBACK_SEEKING)
        });
    });

});
