import SourceBufferController from '../../src/streaming/controllers/SourceBufferController';
import Events from '../../src/core/events/Events';
import EventBus from '../../src/core/EventBus';

import TextBufferMock from './mocks/TextBufferMock';
import TextControllerMock from './mocks/TextControllerMock';
import MediaSourceBufferMock from './mocks/MediaSourceBufferMock';
import MediaSourceMock from './mocks/MediaSourceMock';

const expect = require('chai').expect;
const context = {};

const eventBus = EventBus(context).getInstance();

describe('SourceBufferController', function () {

    let sourceBufferController;
    let textControllerMock;

    beforeEach(function () {

        textControllerMock = new TextControllerMock();
        sourceBufferController = SourceBufferController(context).getInstance({
            textController: textControllerMock
        });
    });

    afterEach(function () {
        sourceBufferController = null;
    });

    describe('Method createSourceBuffer', function () {
        it('should create and return a buffer', function () {
            let mediaInfo = {
                codec: 'video/webm; codecs="vp8, vorbis"'
            };

            let mediaSource = new MediaSourceMock();

            let buffer = sourceBufferController.createSourceBuffer(mediaSource, mediaInfo);
            expect(buffer).to.be.instanceOf(MediaSourceBufferMock);
        });

        it('should create and return a text buffer if codec is of type application/mp4;codecs="stpp"', function () {
            let mediaInfo = {
                codec: 'application/mp4;codecs="stpp"'
            };

            let mediaSource = new MediaSourceMock();

            let buffer = sourceBufferController.createSourceBuffer(mediaSource, mediaInfo);
            expect(buffer).to.be.instanceOf(TextBufferMock);
        });

        it('should create and return a text buffer if codec is of type application/mp4;codecs="wvtt"', function () {
            let mediaInfo = {
                codec: 'application/mp4;codecs="wvtt"'
            };

            let mediaSource = new MediaSourceMock();

            let buffer = sourceBufferController.createSourceBuffer(mediaSource, mediaInfo);
            expect(buffer).to.be.instanceOf(TextBufferMock);
        });

        it('should create and return a text buffer if codec is of type text', function () {
            let mediaInfo = {
                codec: 'text',
                isText: true
            };

            let mediaSource = new MediaSourceMock();

            let buffer = sourceBufferController.createSourceBuffer(mediaSource, mediaInfo);
            expect(buffer).to.be.instanceOf(TextBufferMock);
        });

        it('should throw an error if codec is unknonw', function () {
            let mediaInfo = {
                codec: 'unknown'
            };

            let mediaSource = new MediaSourceMock();
            // http://chaijs.com/api/bdd/#method_throw
            expect(function () {
                sourceBufferController.createSourceBuffer(mediaSource, mediaInfo);
            }).to.throw(Error, 'unknown');
        });
    });

    describe('Method removeSourceBuffer', function () {
        it('should remove a created buffer', function () {
            let mediaInfo = {
                codec: 'video/webm; codecs="vp8, vorbis"'
            };

            let mediaSource = new MediaSourceMock();

            let buffer = sourceBufferController.createSourceBuffer(mediaSource, mediaInfo);
            expect(mediaSource.buffers).to.have.lengthOf(1);

            sourceBufferController.removeSourceBuffer(mediaSource, buffer);
            expect(mediaSource.buffers).to.have.lengthOf(0);

        });
    });

    describe('Method getBufferRange', function () {
        let buffer;
        beforeEach(function () {
            let mediaInfo = {
                codec: 'video/webm; codecs="vp8, vorbis"'
            };

            let mediaSource = new MediaSourceMock();
            buffer = sourceBufferController.createSourceBuffer(mediaSource, mediaInfo);
            expect(mediaSource.buffers).to.have.lengthOf(1);
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
            let range = sourceBufferController.getBufferRange(buffer, 10);
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
            let range = sourceBufferController.getBufferRange(buffer, 10);
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
            let range = sourceBufferController.getBufferRange(buffer, 10);
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
            let range = sourceBufferController.getBufferRange(buffer, 10);
            expect(range.start).to.equal(10.1);
            expect(range.end).to.equal(11);
        });
    });

    describe('Method getAllRanges', function () {
        let buffer;
        beforeEach(function () {
            let mediaInfo = {
                codec: 'video/webm; codecs="vp8, vorbis"'
            };

            let mediaSource = new MediaSourceMock();
            buffer = sourceBufferController.createSourceBuffer(mediaSource, mediaInfo);
            expect(mediaSource.buffers).to.have.lengthOf(1);
        });

        it('should return all range of buffered data', function () {
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
            let ranges = sourceBufferController.getAllRanges(buffer);
            expect(ranges.length).to.equal(3);
            expect(ranges.start(0)).to.equal(2);
            expect(ranges.end(0)).to.equal(5);
            expect(ranges.start(1)).to.equal(8);
            expect(ranges.end(1)).to.equal(9);
            expect(ranges.start(2)).to.equal(9);
            expect(ranges.end(2)).to.equal(11);
        });
    });

    describe('Method getTotalBufferedTime', function () {
        let buffer;
        beforeEach(function () {
            let mediaInfo = {
                codec: 'video/webm; codecs="vp8, vorbis"'
            };

            let mediaSource = new MediaSourceMock();
            buffer = sourceBufferController.createSourceBuffer(mediaSource, mediaInfo);
            expect(mediaSource.buffers).to.have.lengthOf(1);
        });

        it('should return 0 if no buffer', function () {

            let totalBufferedTime = sourceBufferController.getTotalBufferedTime(buffer);
            expect(totalBufferedTime).to.equal(0);
        });

        it('should return totalBufferedTime ', function () {

            buffer.addRange({
                start: 2,
                end: 5
            });
            buffer.addRange({
                start: 8,
                end: 9
            });
            let totalBufferedTime = sourceBufferController.getTotalBufferedTime(buffer);
            expect(totalBufferedTime).to.equal(4);
        });
    });

    describe('Method getBufferLength', function () {
        let buffer;
        beforeEach(function () {
            let mediaInfo = {
                codec: 'video/webm; codecs="vp8, vorbis"'
            };

            let mediaSource = new MediaSourceMock();
            buffer = sourceBufferController.createSourceBuffer(mediaSource, mediaInfo);
            expect(mediaSource.buffers).to.have.lengthOf(1);
        });

        it('should return 0 if no buffer', function () {

            let totalBufferedLength = sourceBufferController.getBufferLength(buffer, 10);
            expect(totalBufferedLength).to.equal(0);
        });

        it('should return 0 if no data buffered in time', function () {

            buffer.addRange({
                start: 2,
                end: 5
            });
            let totalBufferedLength = sourceBufferController.getBufferLength(buffer, 10);
            expect(totalBufferedLength).to.equal(0);
        });

        it('should return buffer length ', function () {

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
            let totalBufferedLength = sourceBufferController.getBufferLength(buffer, 10);
            expect(totalBufferedLength).to.equal(1);
        });
    });

    describe('Method append', function () {

        it('should not throw an error when append data to not defined buffer', function (done) {

            function onAppend(e) {
                eventBus.off(Events.SOURCEBUFFER_APPEND_COMPLETED, onAppend, this);
                expect(e.error.code).to.equal(1);
                done();
            }

            eventBus.on(Events.SOURCEBUFFER_APPEND_COMPLETED, onAppend, this);

            sourceBufferController.append(null, {bytes: 'toto'});
        });

        it('should not throw an error when append not defined chunk to defined buffer', function (done) {
            let mediaInfo = {
                codec: 'video/webm; codecs="vp8, vorbis"'
            };

            let mediaSource = new MediaSourceMock();
            let buffer = sourceBufferController.createSourceBuffer(mediaSource, mediaInfo);

            function onAppend(e) {
                eventBus.off(Events.SOURCEBUFFER_APPEND_COMPLETED, onAppend, this);
                expect(e.error.code).to.equal(1);
                done();
            }

            eventBus.on(Events.SOURCEBUFFER_APPEND_COMPLETED, onAppend, this);

            sourceBufferController.append(buffer, null);
        });

        it('should append data to buffer', function (done) {

            let mediaInfo = {
                codec: 'video/webm; codecs="vp8, vorbis"'
            };

            let mediaSource = new MediaSourceMock();
            let buffer = sourceBufferController.createSourceBuffer(mediaSource, mediaInfo);
            expect(mediaSource.buffers).to.have.lengthOf(1);

            function onAppend(/*e*/) {
                eventBus.off(Events.SOURCEBUFFER_APPEND_COMPLETED, onAppend, this);
                expect(buffer.chunk).to.equal('toto');
                done();
            }
            eventBus.on(Events.SOURCEBUFFER_APPEND_COMPLETED, onAppend, this);

            sourceBufferController.append(buffer, {bytes: 'toto'});
        });

        it('should append data to text buffer', function (done) {

            let mediaInfo = {
                codec: 'text',
                isText: true
            };

            let mediaSource = new MediaSourceMock();

            let buffer = sourceBufferController.createSourceBuffer(mediaSource, mediaInfo);
            expect(buffer).to.be.instanceOf(TextBufferMock);

            function onAppend(/*e*/) {
                eventBus.off(Events.SOURCEBUFFER_APPEND_COMPLETED, onAppend, this);
                expect(buffer.chunk).to.equal('toto');
                done();
            }
            eventBus.on(Events.SOURCEBUFFER_APPEND_COMPLETED, onAppend, this);

            sourceBufferController.append(buffer, {bytes: 'toto'});
        });
    });

    describe('Method remove', function () {

        it('should not throw an error when remove data to not defined buffer', function (done) {
            function onRemoved(e) {
                eventBus.off(Events.SOURCEBUFFER_REMOVE_COMPLETED, onRemoved, this);
                expect(e.error.code).to.equal(2);
                done();
            }

            eventBus.on(Events.SOURCEBUFFER_REMOVE_COMPLETED, onRemoved, this);
            sourceBufferController.remove(null);
        });

        it('should remove data from buffer', function (done) {

            let mediaInfo = {
                codec: 'video/webm; codecs="vp8, vorbis"'
            };

            let mediaSource = new MediaSourceMock();
            let buffer = sourceBufferController.createSourceBuffer(mediaSource, mediaInfo);
            expect(mediaSource.buffers).to.have.lengthOf(1);

            function onAppend(/*e*/) {
                eventBus.off(Events.SOURCEBUFFER_APPEND_COMPLETED, onAppend, this);

                // remove data
                sourceBufferController.remove(buffer, 0, 1, mediaSource);
            }

            function onRemoved(/*e*/) {
                eventBus.off(Events.SOURCEBUFFER_REMOVE_COMPLETED, onAppend, this);
                expect(buffer.chunk).to.be.null; // jshint ignore:line
                done();
            }
            eventBus.on(Events.SOURCEBUFFER_APPEND_COMPLETED, onAppend, this);
            eventBus.on(Events.SOURCEBUFFER_REMOVE_COMPLETED, onRemoved, this);

            sourceBufferController.append(buffer, {bytes: 'toto'});
        });
    });

    describe('Method abort', function () {

        it('should abort', function () {

            let mediaInfo = {
                codec: 'video/webm; codecs="vp8, vorbis"'
            };

            let mediaSource = new MediaSourceMock();
            let buffer = sourceBufferController.createSourceBuffer(mediaSource, mediaInfo);
            expect(mediaSource.buffers).to.have.lengthOf(1);

            expect(buffer.aborted).to.be.false; // jshint ignore:line
            sourceBufferController.abort(mediaSource, buffer);
            expect(buffer.aborted).to.be.true; // jshint ignore:line
        });

        it('should not abort if media source is not opened', function () {

            let mediaInfo = {
                codec: 'video/webm; codecs="vp8, vorbis"'
            };

            let mediaSource = new MediaSourceMock();
            mediaSource.readyState = 'closed';
            let buffer = sourceBufferController.createSourceBuffer(mediaSource, mediaInfo);
            expect(mediaSource.buffers).to.have.lengthOf(1);

            expect(buffer.aborted).to.be.false; // jshint ignore:line
            sourceBufferController.abort(mediaSource, buffer);
            expect(buffer.aborted).to.be.false; // jshint ignore:line
        });
    });

});
