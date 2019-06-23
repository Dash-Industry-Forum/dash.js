import ObjectUtils from '../../src/streaming/utils/ObjectUtils';
import BufferController from '../../src/streaming/controllers/BufferController';
import EventBus from '../../src/core/EventBus';
import Events from '../../src/core/events/Events';
import InitCache from '../../src/streaming/utils/InitCache';
import Settings from '../../src/core/Settings';

import StreamControllerMock from './mocks/StreamControllerMock';
import PlaybackControllerMock from './mocks/PlaybackControllerMock';
import StreamProcessorMock from './mocks/StreamProcessorMock';
import DashMetricsMock from './mocks/DashMetricsMock';
import AdapterMock from './mocks/AdapterMock';
import MediaSourceMock from './mocks/MediaSourceMock';
import MediaPlayerModelMock from './mocks/MediaPlayerModelMock';
import ErrorHandlerMock from './mocks/ErrorHandlerMock';
import MediaControllerMock from './mocks/MediaControllerMock';
import AbrControllerMock from './mocks/AbrControllerMock';
import TextControllerMock from './mocks/TextControllerMock';

const chai = require('chai');
const expect = chai.expect;

const context = {};
const testType = 'video';
const streamInfo = {
    id: 'id'
};
const eventBus = EventBus(context).getInstance();
const objectUtils = ObjectUtils(context).getInstance();
const initCache = InitCache(context).getInstance();

describe('BufferController', function () {
    // disable log
    let settings = Settings(context).getInstance();
    const streamProcessor = new StreamProcessorMock(testType, streamInfo);
    const streamControllerMock = new StreamControllerMock();
    const adapterMock = new AdapterMock();
    const dashMetricsMock = new DashMetricsMock();
    const playbackControllerMock = new PlaybackControllerMock();
    const mediaPlayerModelMock = new MediaPlayerModelMock();
    const errorHandlerMock = new ErrorHandlerMock();
    const mediaControllerMock = new MediaControllerMock();
    const abrControllerMock = new AbrControllerMock();
    const textControllerMock = new TextControllerMock();
    let bufferController;
    let mediaSourceMock;
    const mediaInfo = { codec: 'video/webm; codecs="vp8, vorbis"' };

    beforeEach(function () {
        global.navigator = {
            userAgent: 'node.js'
        };

        mediaSourceMock = new MediaSourceMock();
        bufferController = BufferController(context).create({
            dashMetrics: dashMetricsMock,
            errHandler: errorHandlerMock,
            streamController: streamControllerMock,
            mediaController: mediaControllerMock,
            adapter: adapterMock,
            textController: textControllerMock,
            abrController: abrControllerMock,
            streamProcessor: streamProcessor,
            type: testType,
            playbackController: playbackControllerMock,
            mediaPlayerModel: mediaPlayerModelMock,
            settings: settings
        });
    });

    afterEach(function () {
        delete global.navigator;

        bufferController.reset();
        bufferController = null;
        streamProcessor.reset();
    });

    describe('Method initialize', function () {
        it('should initialize the controller', function () {
            expect(bufferController.getType()).to.equal(testType);
            bufferController.initialize({});

        });
    });

    describe('Method createBuffer/getBuffer', function () {
        it('should not create a preBufferSink if mediaInfo is undefined', function () {
            expect(bufferController.createBuffer()).to.be.null;  // jshint ignore:line
        });

        it('should create a preBufferSink if controller is initialized without a mediaSource', function () {
            bufferController.initialize(null);
            bufferController.createBuffer(mediaInfo);
            expect(bufferController.getBuffer().discharge).to.be.a('function'); //Is of type PreBufferSink.
        });

        it('should create a sourceBufferSink and initialize it when given a mediaSource', function () {
            bufferController.initialize(mediaSourceMock);
            bufferController.createBuffer(mediaInfo);
            const sink = bufferController.getBuffer();
            expect(sink.getBuffer).to.be.a('function'); //Is of type SourceBufferSink
            expect(sink.getBuffer()).to.equal(mediaSourceMock.buffers[0]);
        });
    });

    describe('Method getStreamProcessor', function () {
        it('should return configured stream processor', function () {
            const configuredSP = bufferController.getStreamProcessor();
            expect(objectUtils.areEqual(configuredSP, streamProcessor)).to.be.true; // jshint ignore:line
        });
    });

    describe('Methods get/set Media Source', function () {
        it('should update media source', function () {
            bufferController.setMediaSource(mediaSourceMock);
            expect(bufferController.getMediaSource()).to.equal(mediaSourceMock);
        });
    });

    describe('Method switchInitData', function () {
        beforeEach(function () {
            bufferController.initialize(mediaSourceMock);
            bufferController.createBuffer(mediaInfo);
        });

        it('should append init data to source buffer if data have been cached', function () {
            const chunk = {
                bytes: 'initData',
                quality: 2,
                mediaInfo: {
                    type: 'video'
                },
                streamId: 'streamId',
                representationId: 'representationId'
            };

            initCache.save(chunk);

            bufferController.switchInitData('streamId', 'representationId');
            expect(mediaSourceMock.buffers[0].chunk).to.equal(chunk.bytes);
        });

        it('should trigger INIT_REQUESTED if no init data is cached', function (done) {
            // reset cache
            initCache.reset();

            const onInitRequest = function () {
                eventBus.off(Events.INIT_REQUESTED, onInitRequest);
                done();
            };
            eventBus.on(Events.INIT_REQUESTED, onInitRequest, this);

            bufferController.switchInitData('streamId', 'representationId');
        });
    });

    describe('Method reset', function () {
        it('should reset buffer controller', function () {
            bufferController.initialize(mediaSourceMock);
            bufferController.createBuffer(mediaInfo);
            const buffer = mediaSourceMock.buffers[0];
            expect(buffer).to.exist; // jshint ignore:line

            bufferController.reset();
            expect(buffer.aborted).to.be.true; // jshint ignore:line
            expect(mediaSourceMock.buffers[0]).to.not.exist; // jshint ignore:line
            expect(bufferController.getBuffer()).to.not.exist; // jshint ignore:line
        });
    });

    describe('Event INIT_FRAGMENT_LOADED handler', function () {
        beforeEach(function () {
            bufferController.initialize(mediaSourceMock);
            bufferController.createBuffer(mediaInfo);
        });

        it('should not append data to source buffer if wrong fragment model', function (done) {
            const event = {
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
            };
            const onInitDataLoaded = function () {
                eventBus.off(Events.INIT_FRAGMENT_LOADED, onInitDataLoaded);
                expect(mediaSourceMock.buffers[0].chunk).to.be.null; // jshint ignore:line
                done();
            };
            eventBus.on(Events.INIT_FRAGMENT_LOADED, onInitDataLoaded, this);

            expect(mediaSourceMock.buffers[0].chunk).to.be.null; // jshint ignore:line
            // send event
            eventBus.trigger(Events.INIT_FRAGMENT_LOADED, event);
        });

        it('should append data to source buffer ', function (done) {
            const event = {
                fragmentModel: streamProcessor.getFragmentModel(),
                chunk: {
                    bytes: 'initData',
                    quality: 2,
                    mediaInfo: {
                        type: 'video'
                    },
                    streamId: 'streamId',
                    representationId: 'representationId'
                }
            };
            const onInitDataLoaded = function () {
                eventBus.off(Events.INIT_FRAGMENT_LOADED, onInitDataLoaded);
                expect(mediaSourceMock.buffers[0].chunk).to.equal(event.chunk.bytes);
                done();
            };
            eventBus.on(Events.INIT_FRAGMENT_LOADED, onInitDataLoaded, this);

            expect(mediaSourceMock.buffers[0].chunk).to.be.null; // jshint ignore:line
            // send event
            eventBus.trigger(Events.INIT_FRAGMENT_LOADED, event);
        });

        it('should save init data into cache', function (done) {
            const chunk = {
                bytes: 'initData',
                quality: 2,
                mediaInfo: {
                    type: 'video'
                },
                streamId: 'streamId',
                representationId: 'representationId'
            };
            const event = {
                fragmentModel: streamProcessor.getFragmentModel(),
                chunk: chunk
            };

            initCache.reset();
            let cache = initCache.extract(chunk.streamId, chunk.representationId);
            const onInitDataLoaded = function () {
                eventBus.off(Events.INIT_FRAGMENT_LOADED, onInitDataLoaded);

                // check initCache
                cache = initCache.extract(chunk.streamId, chunk.representationId);
                expect(cache.bytes).to.equal(chunk.bytes);
                done();
            };
            eventBus.on(Events.INIT_FRAGMENT_LOADED, onInitDataLoaded, this);

            expect(cache).to.not.exist; // jshint ignore:line
            // send event
            eventBus.trigger(Events.INIT_FRAGMENT_LOADED, event);
        });
    });
    describe('Event MEDIA_FRAGMENT_LOADED handler', function () {
        beforeEach(function () {
            bufferController.initialize(mediaSourceMock);
            bufferController.createBuffer(mediaInfo);
        });

        it('should not append data to source buffer if wrong fragment model', function (done) {
            const event = {
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
            };
            const onMediaFragmentLoaded = function () {
                eventBus.off(Events.MEDIA_FRAGMENT_LOADED, onMediaFragmentLoaded);
                expect(mediaSourceMock.buffers[0].chunk).to.be.null; // jshint ignore:line
                done();
            };
            eventBus.on(Events.MEDIA_FRAGMENT_LOADED, onMediaFragmentLoaded, this);

            expect(mediaSourceMock.buffers[0].chunk).to.be.null; // jshint ignore:line
            // send event
            eventBus.trigger(Events.MEDIA_FRAGMENT_LOADED, event);
        });

        it('should append data to source buffer ', function (done) {
            const event = {
                fragmentModel: streamProcessor.getFragmentModel(),
                chunk: {
                    bytes: 'data',
                    quality: 2,
                    mediaInfo: 'video'
                }
            };
            const onMediaFragmentLoaded = function () {
                eventBus.off(Events.MEDIA_FRAGMENT_LOADED, onMediaFragmentLoaded);
                expect(mediaSourceMock.buffers[0].chunk).to.equal(event.chunk.bytes);
                done();
            };
            eventBus.on(Events.MEDIA_FRAGMENT_LOADED, onMediaFragmentLoaded, this);

            expect(mediaSourceMock.buffers[0].chunk).to.be.null; // jshint ignore:line
            // send event
            eventBus.trigger(Events.MEDIA_FRAGMENT_LOADED, event);
        });

        it('should trigger VIDEO_CHUNK_RECEIVED if event is video', function (done) {
            const event = {
                fragmentModel: streamProcessor.getFragmentModel(),
                chunk: {
                    bytes: 'data',
                    quality: 2,
                    mediaInfo: {
                        type: 'video'
                    }
                }
            };
            const onVideoChunk = function () {
                eventBus.off(Events.VIDEO_CHUNK_RECEIVED, onVideoChunk);
                done();
            };
            eventBus.on(Events.VIDEO_CHUNK_RECEIVED, onVideoChunk, this);

            // send event
            eventBus.trigger(Events.MEDIA_FRAGMENT_LOADED, event);
        });
    });

    describe('Event MEDIA_FRAGMENT_LOADED handler', function () {
        beforeEach(function () {
            bufferController.initialize(mediaSourceMock);
            bufferController.createBuffer(mediaInfo);
        });

        it('should not update buffer timestamp offset - wrong stream processor id', function () {
            expect(mediaSourceMock.buffers[0].timestampOffset).to.equal(1);

            const event = {
                newQuality: 2,
                mediaType: testType,
                streamInfo: {
                    id: 'wrongid'
                }
            };

            // send event
            eventBus.trigger(Events.QUALITY_CHANGE_REQUESTED, event);
            expect(mediaSourceMock.buffers[0].timestampOffset).to.equal(1);
        });

        it('should not update buffer timestamp offset - wrong media type', function () {
            expect(mediaSourceMock.buffers[0].timestampOffset).to.equal(1);

            const event = {
                newQuality: 2,
                mediaType: 'wrongMediaType',
                streamInfo: {
                    id: streamProcessor.getStreamInfo().id
                }
            };

            // send event
            eventBus.trigger(Events.QUALITY_CHANGE_REQUESTED, event);
            expect(mediaSourceMock.buffers[0].timestampOffset).to.equal(1);
        });

        it('should not update buffer timestamp offset - wrong quality', function () {
            expect(mediaSourceMock.buffers[0].timestampOffset).to.equal(1);

            const event = {
                newQuality: 0,
                mediaType: testType,
                streamInfo: {
                    id: streamProcessor.getStreamInfo().id
                }
            };

            // send event
            eventBus.trigger(Events.QUALITY_CHANGE_REQUESTED, event);
            expect(mediaSourceMock.buffers[0].timestampOffset).to.equal(1);
        });

        it('should update buffer timestamp offset', function () {
            expect(mediaSourceMock.buffers[0].timestampOffset).to.equal(1);

            const event = {
                newQuality: 2,
                mediaType: testType,
                streamInfo: {
                    id: streamProcessor.getStreamInfo().id
                }
            };

            // send event
            eventBus.trigger(Events.QUALITY_CHANGE_REQUESTED, event);
            expect(mediaSourceMock.buffers[0].timestampOffset).to.equal(2);
        });
    });

    describe('Event PLAYBACK_SEEKING handler', function () {
        beforeEach(function () {
            bufferController.initialize(mediaSourceMock);
            bufferController.createBuffer(mediaInfo);
        });

        it('should trigger BUFFER_LEVEL_UPDATED event', function (done) {
            const buffer = mediaSourceMock.buffers[0];
            const onBufferLevelUpdated = function (e) {
                eventBus.off(Events.BUFFER_LEVEL_UPDATED, onBufferLevelUpdated, this);
                expect(e.bufferLevel).to.equal(buffer.buffered.end(0) - buffer.buffered.start(0));

                done();
            };
            eventBus.on(Events.BUFFER_LEVEL_UPDATED, onBufferLevelUpdated, this);

            // send event
            eventBus.trigger(Events.PLAYBACK_SEEKING);
        });

        /*
        it('should trigger BUFFER_LEVEL_STATE_CHANGED event', function (done) {
            const buffer = mediaSourceMock.buffers[0];
            const onBufferStateChanged = function (e) {
                eventBus.off(Events.BUFFER_LEVEL_STATE_CHANGED, onBufferStateChanged, this);
                expect(e.state).to.equal('bufferLoaded');

                done();
            };
            eventBus.on(Events.BUFFER_LEVEL_STATE_CHANGED, onBufferStateChanged, this);

            // send event
            eventBus.trigger(Events.PLAYBACK_SEEKING);
        });

        it('should trigger BUFFER_LOADED event if enough buffer', function (done) {
            const buffer = mediaSourceMock.buffers[0];
            const onBufferLoaded = function () {
                eventBus.off(Events.BUFFER_LOADED, onBufferLoaded, this);

                done();
            };
            eventBus.on(Events.BUFFER_LOADED, onBufferLoaded, this);

            // send event
            eventBus.trigger(Events.PLAYBACK_SEEKING);
        });*/
    });

    describe('Method getBufferRange', function () {
        let buffer;
        beforeEach(function () {
            let mediaInfo = {
                codec: 'video/webm; codecs="vp8, vorbis"'
            };

            bufferController.initialize(mediaSourceMock);
            bufferController.createBuffer(mediaInfo);
            const sink = bufferController.getBuffer();
            buffer = sink.getBuffer();
            expect(mediaSourceMock.buffers).to.have.lengthOf(1);
        });

        it('should return range of buffered data', function () {
            buffer.addRange({
                start: 2,
                end: 5
            });
            buffer.addRange({
                start: 8,
                end: 9
            });
            buffer.addRange({
                start: 9,
                end: 11
            });
            let range = bufferController.getRangeAt(10);
            expect(range.start).to.equal(9);
            expect(range.end).to.equal(11);
        });

        it('should return range of buffered data - small discontinuity', function () {
            buffer.addRange({
                start: 2,
                end: 5
            });
            buffer.addRange({
                start: 8,
                end: 9
            });
            buffer.addRange({
                start: 9,
                end: 10.05
            });
            buffer.addRange({
                start: 10.1,
                end: 11
            });
            let range = bufferController.getRangeAt(10);
            expect(range.start).to.equal(9);
            expect(range.end).to.equal(11);
        });

        it('should return null - time not in range', function () {
            buffer.addRange({
                start: 2,
                end: 5
            });
            buffer.addRange({
                start: 8,
                end: 9
            });
            buffer.addRange({
                start: 9,
                end: 9.5
            });
            buffer.addRange({
                start: 10.5,
                end: 11
            });
            let range = bufferController.getRangeAt(10);
            expect(range).to.be.null; // jshint ignore:line
        });

        it('should return range of buffered data - time not in range (little gap)', function () {
            buffer.addRange({
                start: 2,
                end: 5
            });
            buffer.addRange({
                start: 8,
                end: 9
            });
            buffer.addRange({
                start: 9,
                end: 9.9
            });
            buffer.addRange({
                start: 10.1,
                end: 11
            });
            let range = bufferController.getRangeAt(10);
            expect(range.start).to.equal(10.1);
            expect(range.end).to.equal(11);
        });
    });

});
