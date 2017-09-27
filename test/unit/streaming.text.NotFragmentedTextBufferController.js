import NotFragmentedTextBufferController from '../../src/streaming/text/NotFragmentedTextBufferController';
import ObjectUtils from '../../src/streaming/utils/ObjectUtils';
import EventBus from '../../src/core/EventBus';
import Events from '../../src/core/events/Events';
import InitCache from '../../src/streaming/utils/InitCache';

import SourceBufferControllerMock from './mocks/SourceBufferControllerMock';
import ErrorHandlerMock from './mocks/ErrorHandlerMock';
import StreamProcessorMock from './mocks/StreamProcessorMock';

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
    let sourceBufferMock = new SourceBufferControllerMock(testType);
    let errorHandlerMock = new ErrorHandlerMock();
    let notFragmentedTextBufferController;

    beforeEach(function () {
        notFragmentedTextBufferController = NotFragmentedTextBufferController(context).create({
            type: testType,
            errHandler: errorHandlerMock,
            sourceBufferController: sourceBufferMock,
            streamProcessor: streamProcessorMock
        });
    });

    afterEach(function () {
        streamProcessorMock.reset();
        sourceBufferMock.reset(testType);
    });

    describe('when not initialized', function () {
        it('should initialize', function () {

            let source = notFragmentedTextBufferController.getMediaSource();
            expect(source).to.not.exist; // jshint ignore:line
            notFragmentedTextBufferController.initialize('source');

            source = notFragmentedTextBufferController.getMediaSource();
            expect(source).to.equal('source');
        });
    });

    describe('when initialized', function () {
        beforeEach(function () {
            notFragmentedTextBufferController.initialize('source');
        });

        describe('Method createSourceBuffer', function () {
            it('should notify error handler if an error occurs', function () {

                sourceBufferMock.createError = true;
                let buffer = notFragmentedTextBufferController.createBuffer('text');
                expect(buffer).to.not.exist; // jshint ignore:line
                expect(errorHandlerMock.error).to.equal('Error creating ' + testType + ' source buffer.');

            });

            it('should create a sourceBuffer and initialize it', function () {
                let buffer = notFragmentedTextBufferController.createBuffer('text');
                expect(buffer).to.exist; // jshint ignore:line
                expect(buffer.initialized).to.be.true; // jshint ignore:line
            });
        });

        describe('Method getType', function () {
            it('should return type', function () {
                let type = notFragmentedTextBufferController.getType();
                expect(type).to.equal(testType);
            });
        });

        describe('Method set/getBuffer', function () {
            it('should return created buffer', function () {
                let buffer = notFragmentedTextBufferController.createBuffer('text');
                let bufferToTest = notFragmentedTextBufferController.getBuffer();
                expect(objectUtils.areEqual(buffer, bufferToTest)).to.be.true; // jshint ignore:line
            });

            it('should return set buffer', function () {
                let buffer = 'test';
                notFragmentedTextBufferController.setBuffer(buffer);
                let bufferToTest = notFragmentedTextBufferController.getBuffer();
                expect(objectUtils.areEqual(buffer, bufferToTest)).to.be.true; // jshint ignore:line
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

        describe('Method set/getSeekStartTime', function () {
            it('should updated SeekStartTime', function () {

                let seekstartTime = notFragmentedTextBufferController.getSeekStartTime();
                expect(seekstartTime).to.not.exist; // jshint ignore:line

                notFragmentedTextBufferController.setSeekStartTime(10);

                seekstartTime = notFragmentedTextBufferController.getSeekStartTime();
                expect(seekstartTime).to.equal(10);
            });
        });

        describe('Method reset', function () {

            it('should not abort buffer if there is an error', function () {
                notFragmentedTextBufferController.reset('error');
                expect(sourceBufferMock.aborted).to.be.false; // jshint ignore:line
            });

            it('should abort buffer', function () {
                notFragmentedTextBufferController.reset();
                expect(sourceBufferMock.aborted).to.be.true; // jshint ignore:line
            });
            it('should remove buffer if there is an error', function () {
                notFragmentedTextBufferController.reset('error');
                expect(sourceBufferMock.aborted).to.be.false; // jshint ignore:line
            });

            it('should remove buffer', function () {
                notFragmentedTextBufferController.reset();
                expect(sourceBufferMock.sourceBufferRemoved).to.be.true; // jshint ignore:line
            });
        });

        describe('Method switchInitData', function () {
            it('should append init data to source buffer if data have been cached', function () {
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
                let buffer = notFragmentedTextBufferController.createBuffer('text');
                notFragmentedTextBufferController.switchInitData(chunk.streamId, chunk.representationId);
                expect(buffer.bytes).to.equal(chunk.bytes);
            });

            it('should trigger INIT_REQUESTED if no init data is cached', function (done) {

                // reset cache
                initCache.reset();

                let onInitRequest = function () {
                    eventBus.off(Events.INIT_REQUESTED, onInitRequest);
                    done();
                };
                eventBus.on(Events.INIT_REQUESTED, onInitRequest, this);

                notFragmentedTextBufferController.switchInitData('streamId', 'representationId');
            });
        });

        describe('Event DATA_UPDATE_COMPLETED Handler', function () {

            it('should trigger TIMED_TEXT_REQUESTED', function (done) {

                let event = {
                    sender: {
                        getStreamProcessor: function () { return streamProcessorMock; }
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

                let buffer = notFragmentedTextBufferController.createBuffer('text');

                let event = {
                    fragmentModel: 'wrongFragmentModel',
                    chunk: {
                        bytes: 'data'
                    }
                };

                let onEvent = function () {
                    eventBus.off(Events.INIT_FRAGMENT_LOADED, onEvent);
                    expect(buffer.bytes).to.not.exist; // jshint ignore:line

                    done();
                };
                eventBus.on(Events.INIT_FRAGMENT_LOADED, onEvent, this);
                eventBus.trigger(Events.INIT_FRAGMENT_LOADED, event);
            });

            it('should not append data to buffer - no bytes', function (done) {

                let buffer = notFragmentedTextBufferController.createBuffer('text');

                let event = {
                    fragmentModel: streamProcessorMock.getFragmentModel(),
                    chunk: {
                    }
                };

                let onEvent = function () {
                    eventBus.off(Events.INIT_FRAGMENT_LOADED, onEvent);
                    expect(buffer.bytes).to.not.exist; // jshint ignore:line

                    done();
                };
                eventBus.on(Events.INIT_FRAGMENT_LOADED, onEvent, this);
                eventBus.trigger(Events.INIT_FRAGMENT_LOADED, event);
            });

            it('should append data to buffer', function (done) {

                let buffer = notFragmentedTextBufferController.createBuffer('text');

                let event = {
                    fragmentModel: streamProcessorMock.getFragmentModel(),
                    chunk: {
                        bytes: 'data'
                    }
                };

                let onEvent = function () {
                    eventBus.off(Events.INIT_FRAGMENT_LOADED, onEvent);
                    expect(buffer.bytes).to.equal(event.chunk.bytes);

                    done();
                };
                eventBus.on(Events.INIT_FRAGMENT_LOADED, onEvent, this);
                eventBus.trigger(Events.INIT_FRAGMENT_LOADED, event);
            });
        });
    });
});
