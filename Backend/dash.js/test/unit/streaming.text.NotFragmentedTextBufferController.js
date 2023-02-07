import NotFragmentedTextBufferController from '../../src/streaming/text/NotFragmentedTextBufferController';
import ObjectUtils from '../../src/streaming/utils/ObjectUtils';
import EventBus from '../../src/core/EventBus';
import Events from '../../src/core/events/Events';
import Settings from '../../src/core/Settings';

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

describe('NotFragmentedTextBufferController', function () {

    let settings = Settings(context).getInstance();
    let streamProcessorMock = new StreamProcessorMock(testType, streamInfo);
    let errorHandlerMock = new ErrorHandlerMock();
    let mediaSourceMock;
    let notFragmentedTextBufferController;
    let mockMediaInfo = { isFragmented: false, codec: '' };

    beforeEach(function () {
        mediaSourceMock = new MediaSourceMock();
        notFragmentedTextBufferController = NotFragmentedTextBufferController(context).create({
            streamInfo: streamInfo,
            type: testType,
            errHandler: errorHandlerMock,
            streamProcessor: streamProcessorMock,
            settings
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
            it('should create a sourceBuffer and initialize it', function (done) {
                notFragmentedTextBufferController.createBufferSink(mockMediaInfo)
                    .then(() => {
                        const buffer = notFragmentedTextBufferController.getBuffer();
                        expect(buffer).to.exist; // jshint ignore:line
                        done();
                    })
                    .catch((e) => {
                        done(e);
                    });
            });

        });

        describe('Method getType', function () {
            it('should return type', function () {
                let type = notFragmentedTextBufferController.getType();
                expect(type).to.equal(testType);
            });
        });

        describe('Method getBuffer', function () {
            it('should return created buffer', function (done) {
                notFragmentedTextBufferController.createBufferSink(mockMediaInfo)
                    .then(() => {
                        let buffer = notFragmentedTextBufferController.getBuffer().getBuffer();
                        expect(objectUtils.areEqual(buffer, mediaSourceMock.buffers[0])).to.be.true; // jshint ignore:line
                        done();
                    })
                    .catch((e) => {
                        done(e);
                    });
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
            beforeEach(function (done) {
                notFragmentedTextBufferController.createBufferSink(mockMediaInfo)
                    .then(() => {
                        done();
                    })
                    .catch((e) => {
                        done(e);
                    });
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


        describe('Event INIT_FRAGMENT_LOADED Handler', function () {

            it('should not append data to buffer - no bytes', function (done) {

                notFragmentedTextBufferController.createBufferSink(mockMediaInfo)
                    .then(() => {
                        const buffer = notFragmentedTextBufferController.getBuffer().getBuffer();

                        let event = {
                            chunk: {
                                streamId: 'id',
                                mediaInfo: {
                                    type: testType
                                }
                            }
                        };

                        let onEvent = function () {
                            eventBus.off(Events.INIT_FRAGMENT_LOADED, onEvent);
                            expect(buffer.chunk).to.not.exist; // jshint ignore:line
                            done();
                        };
                        eventBus.on(Events.INIT_FRAGMENT_LOADED, onEvent, this);
                        eventBus.trigger(Events.INIT_FRAGMENT_LOADED, event);
                    })
                    .catch((e) => {
                        done(e);
                    });
            });

            it('should append data to buffer', function (done) {
                notFragmentedTextBufferController.createBufferSink(mockMediaInfo)
                    .then(() => {
                        const buffer = notFragmentedTextBufferController.getBuffer().getBuffer();
                        let event = {
                            chunk: {
                                streamId: 'id',
                                mediaInfo: {
                                    type: testType
                                },
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
                    })
                    .catch((e) => {
                        done(e);
                    });

            });
        });
    });
});
