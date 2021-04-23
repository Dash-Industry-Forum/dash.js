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
            global.MediaSource = function () {
                return {};
            };
        }

        if (typeof WebKitMediaSource === 'undefined') {
            global.WebKitMediaSource = function () {
                return {};
            };
        }
    });

    afterEach(function () {
        delete global.window;
        delete global.MediaSource;
        delete global.WebKitMediaSource;
    });

    beforeEach(function () {
        mediaSourceController = MediaSourceController(context).getInstance();
    });

    afterEach(function () {
        mediaSourceController = null;
    });

    describe('Method createMediaSource', function () {

        it('should return null if MediaSource is undefined', function () {
            expect(mediaSourceController.createMediaSource()).to.not.exist; // jshint ignore:line
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
            window.MediaSource = 'MediaSource';
            let source = mediaSourceController.createMediaSource();

            source.readyState = 'closed';
            source.sourceBuffers = [];

            mediaSourceController.setDuration(8);
            expect(source.duration).to.be.undefined; // jshint ignore:line
        });

        it('should update source duration', function () {
            window.MediaSource = 'MediaSource';
            let source = mediaSourceController.createMediaSource();

            source.readyState = 'open';
            source.sourceBuffers = [];

            mediaSourceController.setDuration(8);
            expect(source.duration).to.equal(8);
        });

        it('should not update source seekable range if not in readystate open', function () {
            let source = mediaSourceController.createMediaSource();

            source.readyState = 'closed';
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

        it('should update source seekable range', function () {
            let source = mediaSourceController.createMediaSource();

            source.readyState = 'open';
            source.clearLiveSeekableRange = function () {
                this.start = 0;
                this.end = 0;
            };
            source.setLiveSeekableRange = function (start, end) {
                this.start = start;
                this.end = end;
            };

            mediaSourceController.setSeekable(1, 2);
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
