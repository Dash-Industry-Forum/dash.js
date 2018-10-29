import SourceBufferSink from '../../src/streaming/SourceBufferSink';
import Events from '../../src/core/events/Events';
import EventBus from '../../src/core/EventBus';
import FactoryMaker from '../../src/core/FactoryMaker.js';
import Errors from '../../src/core/errors/Errors';

import TextSourceBufferMock from './mocks/TextSourceBufferMock';
import TextControllerMock from './mocks/TextControllerMock';
import MediaSourceBufferMock from './mocks/MediaSourceBufferMock';
import MediaSourceMock from './mocks/MediaSourceMock';

const expect = require('chai').expect;
const context = {};

const eventBus = EventBus(context).getInstance();

describe('SourceBufferSink', function () {

    let sink;
    let textControllerMock;

    beforeEach(function () {
        textControllerMock = new TextControllerMock();
        FactoryMaker.setSingletonInstance(context, 'TextController', textControllerMock);
    });

    afterEach(function () {
        if (sink) {
            sink.reset();
        }
        sink = null;
    });

    describe('Method createSourceBuffer', function () {
        it('should create and return a buffer', function () {
            let mediaInfo = {
                codec: 'video/webm; codecs="vp8, vorbis"'
            };

            let mediaSource = new MediaSourceMock();

            sink = SourceBufferSink(context).create(mediaSource, mediaInfo);
            expect(sink.getBuffer()).to.be.instanceOf(MediaSourceBufferMock); // jshint ignore:line
        });

        it('should create and return a text buffer if codec is of type application/mp4;codecs="stpp"', function () {
            let mediaInfo = {
                codec: 'application/mp4;codecs="stpp"'
            };

            let mediaSource = new MediaSourceMock();

            sink = SourceBufferSink(context).create(mediaSource, mediaInfo);
            expect(sink.getBuffer()).to.be.instanceOf(TextSourceBufferMock); // jshint ignore:line
        });

        it('should create and return a text buffer if codec is of type application/mp4;codecs="wvtt"', function () {
            let mediaInfo = {
                codec: 'application/mp4;codecs="wvtt"'
            };

            let mediaSource = new MediaSourceMock();

            sink = SourceBufferSink(context).create(mediaSource, mediaInfo);
            expect(sink.getBuffer()).to.be.instanceOf(TextSourceBufferMock); // jshint ignore:line
        });

        it('should create and return a text buffer if codec is of type text', function () {
            let mediaInfo = {
                codec: 'text',
                isText: true
            };

            let mediaSource = new MediaSourceMock();

            sink = SourceBufferSink(context).create(mediaSource, mediaInfo);
            expect(sink.getBuffer()).to.be.instanceOf(TextSourceBufferMock); // jshint ignore:line
        });

        it('should throw an error if codec is unknonw', function () {
            let mediaInfo = {
                codec: 'unknown'
            };

            let mediaSource = new MediaSourceMock();
            // http://chaijs.com/api/bdd/#method_throw
            expect(function () {
                SourceBufferSink(context).create(mediaSource, mediaInfo);
            }).to.throw(Error, 'unknown');
        });
    });

    describe('Method removeSourceBuffer', function () {
        it('should remove a created buffer', function () {
            let mediaInfo = {
                codec: 'video/webm; codecs="vp8, vorbis"'
            };

            let mediaSource = new MediaSourceMock();

            sink = SourceBufferSink(context).create(mediaSource, mediaInfo);
            expect(mediaSource.buffers).to.have.lengthOf(1);

            sink.reset();
            expect(mediaSource.buffers).to.have.lengthOf(0);

        });
    });

    describe('Method getAllBufferRanges', function () {
        let sink;
        let buffer;
        beforeEach(function () {
            let mediaInfo = {
                codec: 'video/webm; codecs="vp8, vorbis"'
            };

            let mediaSource = new MediaSourceMock();
            sink = SourceBufferSink(context).create(mediaSource, mediaInfo);
            expect(mediaSource.buffers).to.have.lengthOf(1);
            buffer = mediaSource.buffers[0];
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
            let ranges = sink.getAllBufferRanges();
            expect(ranges.length).to.equal(3);
            expect(ranges.start(0)).to.equal(2);
            expect(ranges.end(0)).to.equal(5);
            expect(ranges.start(1)).to.equal(8);
            expect(ranges.end(1)).to.equal(9);
            expect(ranges.start(2)).to.equal(9);
            expect(ranges.end(2)).to.equal(11);
        });
    });

    describe('Method append', function () {

        it('should append data to buffer', function (done) {

            let mediaInfo = {
                codec: 'video/webm; codecs="vp8, vorbis"'
            };
            let mediaSource = new MediaSourceMock();

            function onAppend() {
                expect(mediaSource.buffers[0].chunk).to.equal('toto');
                done();
            }

            sink = SourceBufferSink(context).create(mediaSource, mediaInfo, onAppend);
            expect(mediaSource.buffers).to.have.lengthOf(1);

            sink.append({bytes: 'toto'});
        });

        it('should append data to text buffer', function (done) {

            let mediaInfo = {
                codec: 'text',
                isText: true
            };

            let mediaSource = new MediaSourceMock();
            function onAppend() {
                expect(sink.getBuffer().chunk).to.equal('toto');
                done();
            }

            sink = SourceBufferSink(context).create(mediaSource, mediaInfo, onAppend);
            expect(sink.getBuffer()).to.be.instanceOf(TextSourceBufferMock);

            sink.append({bytes: 'toto'});
        });

        it('should return an error if data to append is null or undefined', function (done) {

            let mediaInfo = {
                codec: 'video/webm; codecs="vp8, vorbis"'
            };
            let mediaSource = new MediaSourceMock();
            function onAppend(e) {
                expect(e.error.code).to.equal(Errors.APPEND_ERROR_CODE);
                expect(e.error.message).to.equal('chunk is not defined');
                done();
            }

            sink = SourceBufferSink(context).create(mediaSource, mediaInfo, onAppend);
            expect(mediaSource.buffers).to.have.lengthOf(1);

            sink.append();
        });

    });

    describe('Method remove', function () {

        it('should remove data from buffer', function (done) {

            let mediaInfo = {
                codec: 'video/webm; codecs="vp8, vorbis"'
            };

            function onAppend() {
                // remove data
                sink.remove(0, 1);
            }

            let mediaSource = new MediaSourceMock();
            sink = SourceBufferSink(context).create(mediaSource, mediaInfo, onAppend);
            expect(mediaSource.buffers).to.have.lengthOf(1);

            function onRemoved() {
                eventBus.off(Events.SOURCEBUFFER_REMOVE_COMPLETED, onAppend, this);
                expect(mediaSource.buffers[0].chunk).to.be.null; // jshint ignore:line
                done();
            }
            eventBus.on(Events.SOURCEBUFFER_REMOVE_COMPLETED, onRemoved, this);

            sink.append({bytes: 'toto'});
        });
    });

    describe('Method abort', function () {

        it('should abort', function () {

            let mediaInfo = {
                codec: 'video/webm; codecs="vp8, vorbis"'
            };

            let mediaSource = new MediaSourceMock();
            sink = SourceBufferSink(context).create(mediaSource, mediaInfo);
            expect(mediaSource.buffers).to.have.lengthOf(1);
            let buffer = mediaSource.buffers[0];

            expect(buffer.aborted).to.be.false; // jshint ignore:line
            sink.abort();
            expect(buffer.aborted).to.be.true; // jshint ignore:line
        });

        it('should not abort if media source is not opened', function () {

            let mediaInfo = {
                codec: 'video/webm; codecs="vp8, vorbis"'
            };

            let mediaSource = new MediaSourceMock();
            mediaSource.readyState = 'closed';
            sink = SourceBufferSink(context).create(mediaSource, mediaInfo);
            expect(mediaSource.buffers).to.have.lengthOf(1);
            let buffer = mediaSource.buffers[0];

            expect(buffer.aborted).to.be.false; // jshint ignore:line
            sink.abort();
            expect(buffer.aborted).to.be.false; // jshint ignore:line
        });
    });

});
