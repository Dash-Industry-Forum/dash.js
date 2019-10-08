import NotFragmentedTextBufferController from '../../src/streaming/text/NotFragmentedTextBufferController';
import ObjectUtils from '../../src/streaming/utils/ObjectUtils';
import EventBus from '../../src/core/EventBus';
import Events from '../../src/core/events/Events';
import InitCache from '../../src/streaming/utils/InitCache';

import ErrorHandlerMock from './mocks/ErrorHandlerMock';
import StreamProcessorMock from './mocks/StreamProcessorMock';
import MediaSourceMock from './mocks/MediaSourceMock';

const chai = require('chai');
const expect = chai.expect;

const context = {};
const testType = 'text';
const streamInfo = {
    id: 'id'
};
const eventBus = EventBus(context).getInstance();
const objectUtils = ObjectUtils(context).getInstance();
const initCache = InitCache(context).getInstance();

describe('NotFragmentedTextBufferController', function () {

    let streamProcessorMock = new StreamProcessorMock(testType, streamInfo);
    let errorHandlerMock = new ErrorHandlerMock();
    let mediaSourceMock;
    let notFragmentedTextBufferController;
    let mockMediaInfo = { isText: false, codec: '' };

    beforeEach(function () {
        mediaSourceMock = new MediaSourceMock();
        notFragmentedTextBufferController = NotFragmentedTextBufferController(context).create({
            type: testType,
            errHandler: errorHandlerMock,
            streamProcessor: streamProcessorMock
        });
        notFragmentedTextBufferController.initialize(mediaSourceMock);
    });

    afterEach(function () {
        notFragmentedTextBufferController.reset();
        streamProcessorMock.reset();
    });

    describe('when not initialized', function () {
        it('should initialize', function () {
            let source = notFragmentedTextBufferController.getMediaSource();
            expect(source).to.equal(mediaSourceMock);
        });
    });

    describe('when initialized', function () {
        describe('Method createSourceBuffer', function () {
            it('should create a sourceBuffer and initialize it', function () {
                notFragmentedTextBufferController.createBuffer(mockMediaInfo);
                const buffer = notFragmentedTextBufferController.getBuffer();
                expect(buffer).to.exist; // jshint ignore:line
            });

            it('should notify error handler if an error occurs', function () {
                mediaSourceMock.forceError = true;
                notFragmentedTextBufferController.createBuffer(mockMediaInfo);
                const buffer = notFragmentedTextBufferController.getBuffer();
                expect(buffer).to.not.exist; // jshint ignore:line
                expect(errorHandlerMock.errorValue).to.equal('Error creating source buffer of type : ' + testType);
            });
        });

        describe('Method getType', function () {
            it('should return type', function () {
                let type = notFragmentedTextBufferController.getType();
                expect(type).to.equal(testType);
            });
        });

        describe('Method getBuffer', function () {
            it('should return created buffer', function () {
                notFragmentedTextBufferController.createBuffer(mockMediaInfo);
                let buffer = notFragmentedTextBufferController.getBuffer().getBuffer();
                expect(objectUtils.areEqual(buffer, mediaSourceMock.buffers[0])).to.be.true; // jshint ignore:line
            });
        });

        describe('Method getStreamProcessor', function () {
            it('should return streamProcessor', function () {
                let sp = notFragmentedTextBufferController.getStreamProcessor();
                expect(objectUtils.areEqual(sp, streamProcessorMock)).to.be.true; // jshint ignore:line
            });
        });

        describe('Method getBufferLevel', function () {
            it('should return 0', function () {
                let bufferLevel = notFragmentedTextBufferController.getBufferLevel();
                expect(bufferLevel).to.equal(0);
            });
        });

        describe('Method getIsBufferingCompleted', function () {
            it('should return false', function () {
                let isBufferingCompleted = notFragmentedTextBufferController.getIsBufferingCompleted();
                expect(isBufferingCompleted).to.be.false; // jshint ignore:line
            });
        });

        describe('Method reset', function () {
            beforeEach(function () {
                notFragmentedTextBufferController.createBuffer(mockMediaInfo);
            });

            it('should not abort buffer if there is an error', function () {
                const buffer = mediaSourceMock.buffers[0];
                notFragmentedTextBufferController.reset('error');
                expect(buffer.aborted).to.be.false; // jshint ignore:line
            });

            it('should abort buffer', function () {
                const buffer = mediaSourceMock.buffers[0];
                notFragmentedTextBufferController.reset();
                expect(buffer.aborted).to.be.true; // jshint ignore:line
            });

            it('should remove buffer if there is an error', function () {
                const buffer = mediaSourceMock.buffers[0];
                notFragmentedTextBufferController.reset('error');
                expect(buffer.aborted).to.be.false; // jshint ignore:line
            });

            it('should remove buffer', function () {
                notFragmentedTextBufferController.reset();
                expect(mediaSourceMock.buffers[0]).to.not.exist; // jshint ignore:line
            });
        });

        describe('Method switchInitData', function () {
            it('should not append init data to source buffer if data have already been cached', function () {
                let chunk = {
                    bytes: 'initData',
                    quality: 2,
                    mediaInfo: {
                        type: testType
                    },
                    streamId: 'streamId',
                    representationId: 'representationId'
                };

                initCache.save(chunk);
                notFragmentedTextBufferController.createBuffer(mockMediaInfo);
                const buffer = notFragmentedTextBufferController.getBuffer().getBuffer();
                notFragmentedTextBufferController.switchInitData(chunk.streamId, chunk.representationId);
                expect(buffer.chunk).to.equal(null);
            });

            it('should trigger TIMED_TEXT_REQUESTED if no init data is cached', function (done) {

                // reset cache
                initCache.reset();

                let onInitRequest = function () {
                    eventBus.off(Events.TIMED_TEXT_REQUESTED, onInitRequest);
                    done();
                };
                eventBus.on(Events.TIMED_TEXT_REQUESTED, onInitRequest, this);

                notFragmentedTextBufferController.switchInitData('streamId', 'representationId');
            });
        });

        describe('Event DATA_UPDATE_COMPLETED Handler', function () {

            it('should trigger TIMED_TEXT_REQUESTED', function (done) {

                let event = {
                    sender: {
                        getType: function () { return testType; },
                        getStreamId: function () { return streamInfo.id; },
                        getCurrentRepresentation: function () { return { id: 0}; }
                    }
                };

                let onEvent = function () {
                    eventBus.off(Events.TIMED_TEXT_REQUESTED, onEvent);
                    done();
                };
                eventBus.on(Events.TIMED_TEXT_REQUESTED, onEvent, this);
                eventBus.trigger(Events.DATA_UPDATE_COMPLETED, event);
            });
        });

        describe('Event INIT_FRAGMENT_LOADED Handler', function () {

            it('should not append data to buffer - wrong fragment model', function (done) {

                notFragmentedTextBufferController.createBuffer(mockMediaInfo);
                const buffer = notFragmentedTextBufferController.getBuffer().getBuffer();

                let event = {
                    fragmentModel: 'wrongFragmentModel',
                    chunk: {
                        bytes: 'data'
                    }
                };

                let onEvent = function () {
                    eventBus.off(Events.INIT_FRAGMENT_LOADED, onEvent);
                    expect(buffer.chunk).to.not.exist; // jshint ignore:line

                    done();
                };
                eventBus.on(Events.INIT_FRAGMENT_LOADED, onEvent, this);
                eventBus.trigger(Events.INIT_FRAGMENT_LOADED, event);
            });

            it('should not append data to buffer - no bytes', function (done) {

                notFragmentedTextBufferController.createBuffer(mockMediaInfo);
                const buffer = notFragmentedTextBufferController.getBuffer().getBuffer();

                let event = {
                    fragmentModel: streamProcessorMock.getFragmentModel(),
                    chunk: {
                    }
                };

                let onEvent = function () {
                    eventBus.off(Events.INIT_FRAGMENT_LOADED, onEvent);
                    expect(buffer.chunk).to.not.exist; // jshint ignore:line

                    done();
                };
                eventBus.on(Events.INIT_FRAGMENT_LOADED, onEvent, this);
                eventBus.trigger(Events.INIT_FRAGMENT_LOADED, event);
            });

            it('should append data to buffer', function (done) {
                notFragmentedTextBufferController.createBuffer(mockMediaInfo);
                const buffer = notFragmentedTextBufferController.getBuffer().getBuffer();
                let event = {
                    fragmentModel: streamProcessorMock.getFragmentModel(),
                    chunk: {
                        bytes: 'data'
                    }
                };

                let onEvent = function () {
                    eventBus.off(Events.INIT_FRAGMENT_LOADED, onEvent);
                    expect(buffer.chunk).to.equal(event.chunk.bytes);

                    done();
                };
                eventBus.on(Events.INIT_FRAGMENT_LOADED, onEvent, this);
                eventBus.trigger(Events.INIT_FRAGMENT_LOADED, event);
            });
        });
    });
});
