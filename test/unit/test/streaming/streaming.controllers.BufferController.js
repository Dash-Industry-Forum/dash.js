import BufferController from '../../../../src/streaming/controllers/BufferController.js';
import EventBus from '../../../../src/core/EventBus.js';
import Events from '../../../../src/core/events/Events.js';
import InitCache from '../../../../src/streaming/utils/InitCache.js';
import Settings from '../../../../src/core/Settings.js';

import StreamControllerMock from '../../mocks/StreamControllerMock.js';
import PlaybackControllerMock from '../../mocks/PlaybackControllerMock.js';
import DashMetricsMock from '../../mocks/DashMetricsMock.js';
import AdapterMock from '../../mocks/AdapterMock.js';
import MediaSourceMock from '../../mocks/MediaSourceMock.js';
import MediaPlayerModelMock from '../../mocks/MediaPlayerModelMock.js';
import ErrorHandlerMock from '../../mocks/ErrorHandlerMock.js';
import MediaControllerMock from '../../mocks/MediaControllerMock.js';
import AbrControllerMock from '../../mocks/AbrControllerMock.js';
import TextControllerMock from '../../mocks/TextControllerMock.js';
import RepresentationControllerMock from '../../mocks/RepresentationControllerMock.js';

import chai from 'chai';

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
                    expect(sink).to.be.null;
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
                streamId: streamInfo.id,
                representation: {
                    id: 'representationId',
                    mediaInfo: {
                        type: 'video'
                    },
                }
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
                    expect(buffer).to.exist;

                    bufferController.reset(false, false);
                    expect(buffer.aborted).to.be.true;
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
                    bytes: 'initData',
                    quality: 2,
                    representation: {
                        id: 'representationId',
                        mediaInfo: {
                            type: 'video'
                        },
                    }
                }
            };
            const onInitDataLoaded = function () {
                eventBus.off(Events.INIT_FRAGMENT_LOADED, onInitDataLoaded);
                expect(mediaSourceMock.buffers[0].chunk).to.equal(event.chunk.bytes);
                done();
            };
            eventBus.on(Events.INIT_FRAGMENT_LOADED, onInitDataLoaded, this);

            expect(mediaSourceMock.buffers[0].chunk).to.be.null;
            // send event
            eventBus.trigger(Events.INIT_FRAGMENT_LOADED, event);
        });

        it('should save init data into cache', function (done) {
            const chunk = {
                streamId: streamInfo.id,
                bytes: 'initData',
                quality: 2,
                representation: {
                    id: 'representationId',
                    mediaInfo: {
                        type: 'video'
                    },
                }
            };
            const event = {
                chunk: chunk
            };

            settings.update({ streaming: { cacheInitSegments: true } });

            initCache.reset();
            let cache = initCache.extract(chunk.streamId, chunk.representation.id);
            const onInitDataLoaded = function () {
                eventBus.off(Events.INIT_FRAGMENT_LOADED, onInitDataLoaded);

                // check initCache
                cache = initCache.extract(chunk.streamId, chunk.representation.id);
                expect(cache.bytes).to.equal(chunk.bytes);
                done();
            };
            eventBus.on(Events.INIT_FRAGMENT_LOADED, onInitDataLoaded, this);

            expect(cache).to.not.exist;
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
                    bytes: 'data',
                    quality: 2,
                    representation: {
                        id: 'representationId',
                        mediaInfo: {
                            type: 'video'
                        },
                    }
                }
            };
            const onMediaFragmentLoaded = function () {
                eventBus.off(Events.MEDIA_FRAGMENT_LOADED, onMediaFragmentLoaded);
                expect(mediaSourceMock.buffers[0].chunk).to.equal(event.chunk.bytes);
                done();
            };
            eventBus.on(Events.MEDIA_FRAGMENT_LOADED, onMediaFragmentLoaded, this);

            expect(mediaSourceMock.buffers[0].chunk).to.be.null;
            // send event
            eventBus.trigger(Events.MEDIA_FRAGMENT_LOADED, event);
        });

        it('should trigger VIDEO_CHUNK_RECEIVED if event is video', function (done) {
            const event = {
                chunk: {
                    streamId: streamInfo.id,
                    bytes: 'data',
                    quality: 2,
                    representation: {
                        id: 'representationId',
                        mediaInfo: {
                            type: 'video'
                        },
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

        it('should not update buffer timestamp offset if no voRepresentation is provided', function (done) {
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

        it('should  update buffer timestamp offset if  voRepresentation is provided', function (done) {
            expect(mediaSourceMock.buffers[0].timestampOffset).to.equal(1);

            const representation = { mseTimeOffset: 2 };
            // send event
            bufferController.updateBufferTimestampOffset(representation)
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
            expect(range).to.be.null;
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
