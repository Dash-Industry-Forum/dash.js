import MediaSourceController from '../../src/streaming/controllers/MediaSourceController';

import VideoModelMock from './mocks/VideoModelMock';

const expect = require('chai').expect;
const context = {};

describe('MediaSourceController', function () {

    let mediaSourceController;

    beforeEach(function () {
        if (typeof window === 'undefined') {
            global.window = {
                URL: {
                    createObjectURL: function (source) {
                        return source;
                    }
                }
            };
        }

        if (typeof MediaSource === 'undefined') {
            global.MediaSource = function () {};
        }

        if (typeof WebKitMediaSource === 'undefined') {
            global.WebKitMediaSource = function () {};
        }
    });

    afterEach(function () {
        delete global.window;
        delete global.MediaSourc;
        delete global.WebKitMediaSource;
    });

    beforeEach(function () {
        mediaSourceController = MediaSourceController(context).getInstance();
    });

    afterEach(function () {
        // mediaSourceController.reset();
        mediaSourceController = null;
    });

    describe('Method createMediaSource', function () {
        it('should return null if MediaSource is undefined', function () {
            expect(mediaSourceController.createMediaSource()).to.not.exist; // jshint ignore:line
        });

        it('should return null if MediaSource API is MediaSource', function () {

            window.MediaSource = 'MediaSource';
            expect(mediaSourceController.createMediaSource()).to.be.instanceOf(MediaSource);
        });

        it('should return null if MediaSource API is WebkitMediaSource', function () {

            window.WebKitMediaSource = 'WebKitMediaSource';
            expect(mediaSourceController.createMediaSource()).to.be.instanceOf(WebKitMediaSource);
        });

    });

    describe('Source management', function () {
        it('should attach source to video model', function () {

            let videoModel = new VideoModelMock();
            expect(videoModel.getSource()).to.not.exist; // jshint ignore:line

            mediaSourceController.attachMediaSource('source', videoModel);
            expect(videoModel.getSource()).to.equal('source');
        });

        it('should detach source from video model', function () {

            let videoModel = new VideoModelMock();
            expect(videoModel.getSource()).to.not.exist; // jshint ignore:line
            videoModel.setSource('source');
            expect(videoModel.getSource()).to.equal('source');

            mediaSourceController.detachMediaSource(videoModel);
            expect(videoModel.getSource()).to.not.exist; // jshint ignore:line
        });

        it('should update source duration', function () {

            let source = {};
            let duration = mediaSourceController.setDuration(source, 'duration');
            expect(duration).to.equal('duration');

        });

        it('should update source seekable range', function () {

            class FakeSource {
                constructor() {
                    this.clearLiveSeekableRange();
                    this.readyState = 'open';
                }

                clearLiveSeekableRange() {
                    this.start = 0;
                    this.end = 0;
                }

                setLiveSeekableRange(start, end) {
                    this.start = start;
                    this.end = end;
                }
            }

            let source = new FakeSource();
            mediaSourceController.setSeekable(source, 1, 2);
            expect(source.start).to.equal(1);
            expect(source.end).to.equal(2);

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
