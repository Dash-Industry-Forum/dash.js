import SourceBufferSink from '../../src/streaming/SourceBufferSink';
import FactoryMaker from '../../src/core/FactoryMaker.js';
import Errors from '../../src/core/errors/Errors';

import TextSourceBufferMock from './mocks/TextSourceBufferMock';
import TextControllerMock from './mocks/TextControllerMock';
import MediaSourceBufferMock from './mocks/MediaSourceBufferMock';
import MediaSourceMock from './mocks/MediaSourceMock';

const expect = require('chai').expect;
const context = {};


describe('SourceBufferSink', function () {

    let sink;
    let textControllerMock;
    let streamInfo = {
        id: '1'
    };
    let mediaSource;

    beforeEach(function () {
        textControllerMock = new TextControllerMock();
        mediaSource = new MediaSourceMock();
        sink = SourceBufferSink(context).create({ textController: textControllerMock, mediaSource });
        FactoryMaker.setSingletonInstance(context, 'TextController', textControllerMock);
    });

    afterEach(function () {
        if (sink) {
            sink.reset();
        }
        sink = null;
    });

    describe('Method createSourceBuffer', function () {
        it('should create and return a buffer', function (done) {
            let mediaInfo = {
                codec: 'video/webm; codecs="vp8, vorbis"'
            };

            sink.initializeForFirstUse(streamInfo, mediaInfo)
                .then(() => {
                    expect(sink.getBuffer()).to.be.instanceOf(MediaSourceBufferMock); // jshint ignore:line
                    done();
                })
                .catch((e) => {
                    done(e);
                });
        });

        it('should create and return a text buffer if codec is of type application/mp4;codecs="stpp"', function (done) {
            let mediaInfo = {
                codec: 'application/mp4;codecs="stpp"'
            };

            sink.initializeForFirstUse(streamInfo, mediaInfo)
                .then(() => {
                    expect(sink.getBuffer()).to.be.instanceOf(TextSourceBufferMock); // jshint ignore:line
                    done();
                })
                .catch((e) => {
                    done(e);
                });
        });

        it('should create and return a text buffer if codec is of type application/mp4;codecs="wvtt"', function (done) {
            let mediaInfo = {
                codec: 'application/mp4;codecs="wvtt"'
            };

            sink.initializeForFirstUse(streamInfo, mediaInfo)
                .then(() => {
                    expect(sink.getBuffer()).to.be.instanceOf(TextSourceBufferMock); // jshint ignore:line
                    done();
                })
                .catch((e) => {
                    done(e);
                });
        });

        it('should create and return a text buffer if of type text and not fragmented', function (done) {
            let mediaInfo = {
                type: 'text',
                isFragmented: false
            };

            sink.initializeForFirstUse(streamInfo, mediaInfo)
                .then(() => {
                    expect(sink.getBuffer()).to.be.instanceOf(TextSourceBufferMock); // jshint ignore:line
                    done();
                })
                .catch((e) => {
                    done(e);
                });
        });

        it('should throw an error if codec is unknown', function (done) {
            let mediaInfo = {
                codec: 'unknown'
            };

            sink.initializeForFirstUse(streamInfo, mediaInfo)
                .then(() => {
                    done(new Error('Should reject creation'));
                })
                .catch(() => {
                    done();
                });
        });
    });

    describe('Method removeSourceBuffer', function () {
        it('should remove a created buffer', function (done) {
            let mediaInfo = {
                codec: 'video/webm; codecs="vp8, vorbis"'
            };

            sink.initializeForFirstUse(streamInfo, mediaInfo)
                .then(() => {
                    expect(mediaSource.buffers).to.have.lengthOf(1);
                    sink.reset();
                    expect(mediaSource.buffers).to.have.lengthOf(0);
                    done();
                })
                .catch((e) => {
                    done(e);
                });
        });
    });

    describe('Method getAllBufferRanges', function () {
        let buffer;

        beforeEach(function (done) {
            let mediaInfo = {
                codec: 'video/webm; codecs="vp8, vorbis"'
            };

            sink.initializeForFirstUse(streamInfo, mediaInfo)
                .then(() => {
                    expect(mediaSource.buffers).to.have.lengthOf(1);
                    buffer = mediaSource.buffers[0];
                    done();
                })
                .catch((e) => {
                    done(e);
                });
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

        beforeEach(function (done) {
            let mediaInfo = {
                codec: 'video/webm; codecs="vp8, vorbis"'
            };

            sink.initializeForFirstUse(streamInfo, mediaInfo)
                .then(() => {
                    expect(mediaSource.buffers).to.have.lengthOf(1);
                    done();
                })
                .catch((e) => {
                    done(e);
                });
        });

        it('should append data to buffer', function (done) {
            sink.append({ bytes: 'toto' })
                .then(() => {
                    expect(mediaSource.buffers[0].chunk).to.equal('toto');
                    done();
                })
                .catch((e) => {
                    done(e);
                });
        });

        it('should return an error if data to append is null or undefined', function (done) {
            sink.append()
                .then(() => {
                    done(new Error('Should reject append'));
                })
                .catch((e) => {
                    expect(e.error.code).to.equal(Errors.APPEND_ERROR_CODE);
                    expect(e.error.message).to.equal('chunk is not defined');
                    done();
                });

        });

    });

    describe('Method remove', function () {

        beforeEach(function (done) {
            let mediaInfo = {
                codec: 'video/webm; codecs="vp8, vorbis"'
            };

            sink.initializeForFirstUse(streamInfo, mediaInfo)
                .then(() => {
                    expect(mediaSource.buffers).to.have.lengthOf(1);
                    done();
                })
                .catch((e) => {
                    done(e);
                });
        });

        it('should remove data from buffer', function (done) {
            sink.append({ bytes: 'toto' })
                .then(() => {
                    expect(mediaSource.buffers[0].chunk).to.equal('toto');
                    return sink.remove({ start: 0, end: 1 });
                })
                .then(() => {
                    expect(mediaSource.buffers[0].chunk).to.be.null; // jshint ignore:line
                    done();
                })
                .catch((e) => {
                    done(e);
                });
        });
    });

    describe('Method abort', function () {

        beforeEach(function (done) {
            let mediaInfo = {
                codec: 'video/webm; codecs="vp8, vorbis"'
            };

            sink.initializeForFirstUse(streamInfo, mediaInfo)
                .then(() => {
                    expect(mediaSource.buffers).to.have.lengthOf(1);
                    done();
                })
                .catch((e) => {
                    done(e);
                });
        });

        it('should abort', function (done) {
            let buffer = mediaSource.buffers[0];

            expect(buffer.aborted).to.be.false; // jshint ignore:line
            sink.abort()
                .then(() => {
                    expect(buffer.aborted).to.be.true; // jshint ignore:line
                    done();
                })
                .catch((e) => {
                    done(e);
                });
        });

        it('should not abort if media source is not opened', function (done) {
            mediaSource.readyState = 'closed';
            let buffer = mediaSource.buffers[0];

            expect(buffer.aborted).to.be.false; // jshint ignore:line
            sink.abort()
                .then(() => {
                    expect(buffer.aborted).to.be.false; // jshint ignore:line
                    done();
                })
                .catch((e) => {
                    done(e);
                });
        });
    });

});
