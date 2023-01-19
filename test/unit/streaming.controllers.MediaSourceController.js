import MediaSourceController from '../../src/streaming/controllers/MediaSourceController';

import VideoModelMock from './mocks/VideoModelMock';

const expect = require('chai').expect;
const context = {};

describe('MediaSourceController', function () {

    let mediaSourceController;

    beforeEach(function () {
        mediaSourceController = MediaSourceController(context).getInstance();
    });

    afterEach(function () {
        mediaSourceController = null;
    });

    describe('Method createMediaSource', function () {

        it('should create MediaSource', function () {
            expect(mediaSourceController.createMediaSource()).to.exist; // jshint ignore:line
        });

    });

    describe('Source management', function () {

        it('should attach source to video model', function () {
            let videoModel = new VideoModelMock();
            expect(videoModel.getSource()).to.not.exist; // jshint ignore:line

            mediaSourceController.attachMediaSource(videoModel);
            expect(videoModel.getSource()).to.not.be.null; // jshint ignore:line
        });

        it('should detach source from video model', function () {
            let videoModel = new VideoModelMock();
            expect(videoModel.getSource()).to.not.exist; // jshint ignore:line
            videoModel.setSource('source');
            expect(videoModel.getSource()).to.equal('source');

            mediaSourceController.detachMediaSource(videoModel);
            expect(videoModel.getSource()).to.not.exist; // jshint ignore:line
        });

        it('should not update source duration if not in readyState open', function () {
            let source = mediaSourceController.createMediaSource();

            mediaSourceController.setDuration(8);
            expect(source.duration).to.be.NaN; // jshint ignore:line
        });

        it('should update source duration', function (done) {
            function _onSourceOpen() {
                mediaSourceController.setDuration(8);
                expect(source.duration).to.equal(8);
                done();
            }

            let source = mediaSourceController.createMediaSource();
            let video = document.createElement('video');

            source.addEventListener('sourceopen', _onSourceOpen)
            video.src = window.URL.createObjectURL(source);
        });

        it('should not update source seekable range if not in readystate open', function () {
            let source = mediaSourceController.createMediaSource();

            source.start = 0;
            source.end = 0;

            source.clearLiveSeekableRange = function () {
                this.start = 0;
                this.end = 0;
            };
            source.setLiveSeekableRange = function (start, end) {
                this.start = start;
                this.end = end;
            };

            mediaSourceController.setSeekable(1, 2);
            expect(source.start).to.equal(0);
            expect(source.end).to.equal(0);
        });

        it('should update source seekable range', function (done) {
            let video = document.createElement('video');
            function _onSourceOpen() {
                mediaSourceController.setSeekable(1, 5);
                done();
            }

            let source = mediaSourceController.createMediaSource();
            source.addEventListener('sourceopen', _onSourceOpen)
            video.src = window.URL.createObjectURL(source);
        });
    });

    describe('Method signalEndOfStream', function () {

        it('should not signal end of stream - source is undefined', function () {
            expect(mediaSourceController.signalEndOfStream.bind(mediaSourceController)).not.to.throw();
        });

        it('should not signal end of stream - readyState is not opened', function () {

            class FakeSource {
                constructor() {
                    this.isEndOfStream = false;
                    this.sourceBuffers = [{
                        updating: false,
                        buffered: [1, 2]
                    }];
                    this.readyState = 'closed';
                }

                endOfStream() {
                    this.isEndOfStream = true;
                }
            }

            let source = new FakeSource();

            mediaSourceController.signalEndOfStream(source);
            expect(source.isEndOfStream).to.be.false; // jshint ignore:line
        });

        it('should not signal end of stream - one buffer updating', function () {

            class FakeSource {
                constructor() {
                    this.isEndOfStream = false;
                    this.sourceBuffers = [{
                        updating: true,
                        buffered: [1, 2]
                    }];
                    this.readyState = 'opened';
                }

                endOfStream() {
                    this.isEndOfStream = true;
                }
            }

            let source = new FakeSource();

            mediaSourceController.signalEndOfStream(source);
            expect(source.isEndOfStream).to.be.false; // jshint ignore:line
        });

        it('should not signal end of stream - nothing buffered updating', function () {

            class FakeSource {
                constructor() {
                    this.isEndOfStream = false;
                    this.sourceBuffers = [{
                        updating: false,
                        buffered: []
                    }];
                    this.readyState = 'opened';
                }

                endOfStream() {
                    this.isEndOfStream = true;
                }
            }

            let source = new FakeSource();

            mediaSourceController.signalEndOfStream(source);
            expect(source.isEndOfStream).to.be.false; // jshint ignore:line
        });

        it('should signal end of stream', function () {

            class FakeSource {
                constructor() {
                    this.isEndOfStream = false;
                    this.sourceBuffers = [{
                        updating: false,
                        buffered: [1, 2]
                    }];
                    this.readyState = 'open';
                }

                endOfStream() {
                    this.isEndOfStream = true;
                }
            }

            let source = new FakeSource();

            mediaSourceController.signalEndOfStream(source);
            expect(source.isEndOfStream).to.be.true; // jshint ignore:line

        });
    });

});
