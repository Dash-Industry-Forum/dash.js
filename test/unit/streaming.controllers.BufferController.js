import BufferController from '../../src/streaming/controllers/BufferController';
import EventBus from '../../src/core/EventBus';
import Events from '../../src/core/events/Events';
import InitCache from '../../src/streaming/utils/InitCache';
import Settings from '../../src/core/Settings';

import StreamControllerMock from './mocks/StreamControllerMock';
import PlaybackControllerMock from './mocks/PlaybackControllerMock';
import DashMetricsMock from './mocks/DashMetricsMock';
import AdapterMock from './mocks/AdapterMock';
import MediaSourceMock from './mocks/MediaSourceMock';
import MediaPlayerModelMock from './mocks/MediaPlayerModelMock';
import ErrorHandlerMock from './mocks/ErrorHandlerMock';
import MediaControllerMock from './mocks/MediaControllerMock';
import AbrControllerMock from './mocks/AbrControllerMock';
import TextControllerMock from './mocks/TextControllerMock';
import RepresentationControllerMock from './mocks/RepresentationControllerMock';

const chai = require('chai');
const sinon = require('sinon');
const expect = chai.expect;

const context = {};
const testType = 'video';
const streamInfo = {
    id: 'DUMMY_STREAM-01'
};
const eventBus = EventBus(context).getInstance();
// const objectUtils = ObjectUtils(context).getInstance();
const initCache = InitCache(context).getInstance();

describe('BufferController', function () {
    // disable log
    let settings = Settings(context).getInstance();
    // const streamProcessor = new StreamProcessorMock(testType, streamInfo);
    const streamControllerMock = new StreamControllerMock();
    const adapterMock = new AdapterMock();
    const dashMetricsMock = new DashMetricsMock();
    const playbackControllerMock = new PlaybackControllerMock();
    const mediaPlayerModelMock = new MediaPlayerModelMock();
    const errorHandlerMock = new ErrorHandlerMock();
    const mediaControllerMock = new MediaControllerMock();
    const abrControllerMock = new AbrControllerMock();
    const textControllerMock = new TextControllerMock();
    const representationControllerMock = new RepresentationControllerMock();
    let bufferController;
    let mediaSourceMock;
    const mediaInfo = { codec: 'video/webm; codecs="vp8, vorbis"' };

    beforeEach(function () {
        global.navigator = {
            userAgent: 'node.js'
        };

        mediaSourceMock = new MediaSourceMock();
        bufferController = BufferController(context).create({
            streamInfo: streamInfo,
            type: testType,
            dashMetrics: dashMetricsMock,
            errHandler: errorHandlerMock,
            streamController: streamControllerMock,
            mediaController: mediaControllerMock,
            adapter: adapterMock,
            textController: textControllerMock,
            abrController: abrControllerMock,
            representationController: representationControllerMock,
            playbackController: playbackControllerMock,
            mediaPlayerModel: mediaPlayerModelMock,
            settings: settings
        });
    });

    afterEach(function () {
        delete global.navigator;

        bufferController.reset();
        bufferController = null;

        settings.reset();
    });

    describe('Method initialize', function () {
        it('should initialize the controller', function () {
            expect(bufferController.getType()).to.equal(testType);
            bufferController.initialize({});
        });
    });

    describe('Method createBuffer/getBuffer', function () {
        it('should not create a preBufferSink if mediaInfo is undefined', function (done) {
            bufferController.createBufferSink()
                .then((sink) => {
                    expect(sink).to.be.null;  // jshint ignore:line
                    done();
                })
                .catch((e) => {
                    done(e);
                });
        });

        it('should create a sourceBufferSink and initialize it when given a mediaSource', function (done) {
            bufferController.initialize(mediaSourceMock);
            bufferController.createBufferSink(mediaInfo)
                .then((sink) => {
                    expect(sink.getBuffer).to.be.a('function'); //Is of type SourceBufferSink
                    expect(sink.getBuffer()).to.equal(mediaSourceMock.buffers[0]);
                    done();
                })
                .catch((e) => {
                    done(e);
                });

        });
    });

    describe('Methods get/set Media Source', function () {
        it('should update media source', function () {
            bufferController.setMediaSource(mediaSourceMock);
            expect(bufferController.getMediaSource()).to.equal(mediaSourceMock);
        });
    });

    describe('Method appendInitSegment', function () {
        beforeEach(function (done) {
            bufferController.initialize(mediaSourceMock);
            bufferController.createBufferSink(mediaInfo)
                .then(() => {
                    done();
                })
                .catch((e) => {
                    done(e);
                });
        });

        it('should append init data to source buffer if data have been cached', function () {
            const chunk = {
                bytes: 'initData',
                quality: 2,
                mediaInfo: {
                    type: 'video'
                },
                streamId: streamInfo.id,
                representationId: 'representationId'
            };

            initCache.save(chunk);

            bufferController.appendInitSegmentFromCache('representationId');
            expect(mediaSourceMock.buffers[0].chunk).to.equal(chunk.bytes);
        });

        it('should return false if no init data is cached', function () {
            // reset cache
            initCache.reset();
            expect(bufferController.appendInitSegmentFromCache('representationId')).to.equal(false);
        });
    });

    describe('Method reset', function () {
        it('should reset buffer controller', function (done) {
            bufferController.initialize(mediaSourceMock);
            bufferController.createBufferSink(mediaInfo)
                .then(() => {
                    const buffer = mediaSourceMock.buffers[0];
                    expect(buffer).to.exist; // jshint ignore:line

                    bufferController.reset(false, false);
                    expect(buffer.aborted).to.be.true; // jshint ignore:line
                    done();
                })
                .catch((e) => {
                    done(e);
                });
        });
    });

    describe('Event INIT_FRAGMENT_LOADED handler', function () {
        beforeEach(function (done) {
            bufferController.initialize(mediaSourceMock);
            bufferController.createBufferSink(mediaInfo)
                .then(() => {
                    done();
                })
                .catch((e) => {
                    done(e);
                });
        });

        it('should append data to source buffer ', function (done) {
            const event = {
                chunk: {
                    streamId: streamInfo.id,
                    mediaInfo: {
                        type: 'video'
                    },
                    bytes: 'initData',
                    quality: 2,
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
                streamId: streamInfo.id,
                mediaInfo: {
                    type: 'video'
                },
                bytes: 'initData',
                quality: 2,
                representationId: 'representationId'
            };
            const event = {
                chunk: chunk
            };

            settings.update({ streaming: { cacheInitSegments: true } });

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
        beforeEach(function (done) {
            bufferController.initialize(mediaSourceMock);
            bufferController.createBufferSink(mediaInfo)
                .then(() => {
                    done();
                })
                .catch((e) => {
                    done(e);
                });
        });

        it('should append data to source buffer ', function (done) {
            const event = {
                chunk: {
                    streamId: streamInfo.id,
                    mediaInfo: {
                        type: 'video'
                    },
                    bytes: 'data',
                    quality: 2
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
                chunk: {
                    streamId: streamInfo.id,
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

    describe('Method updateBufferTimestampOffset', function () {
        let adapterStub;

        beforeEach(function (done) {
            bufferController.initialize(mediaSourceMock);
            bufferController.createBufferSink(mediaInfo)
                .then(() => {
                    done();
                })
                .catch((e) => {
                    done(e);
                });

            adapterStub = sinon.stub(adapterMock, 'convertRepresentationToRepresentationInfo');
        });

        afterEach(function () {
            adapterStub.restore();
            adapterStub = null;
        });

        it('should not update buffer timestamp offset if no representationInfo is provided', function (done) {
            expect(mediaSourceMock.buffers[0].timestampOffset).to.equal(1);

            // send event
            bufferController.updateBufferTimestampOffset()
                .then(() => {
                    expect(mediaSourceMock.buffers[0].timestampOffset).to.equal(1);
                    done();
                })
                .catch((e) => {
                    done(e);
                });

        });

        it('should  update buffer timestamp offset if  representationInfo is provided', function (done) {
            expect(mediaSourceMock.buffers[0].timestampOffset).to.equal(1);

            const representationInfo = { MSETimeOffset: 2 };
            // send event
            bufferController.updateBufferTimestampOffset(representationInfo)
                .then(() => {
                    expect(mediaSourceMock.buffers[0].timestampOffset).to.equal(2);
                    done();
                })
                .catch((e) => {
                    done(e);
                });

        });
    });

    describe('Method getBufferRange', function () {
        let buffer;
        beforeEach(function (done) {
            bufferController.initialize(mediaSourceMock);
            bufferController.createBufferSink(mediaInfo)
                .then(() => {
                    const sink = bufferController.getBuffer();
                    buffer = sink.getBuffer();
                    expect(mediaSourceMock.buffers).to.have.lengthOf(1);
                    done();
                })
                .catch((e) => {
                    done(e);
                });
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
