import MediaSourceController from '../../../../src/streaming/controllers/MediaSourceController.js';
import VideoModelMock from '../../mocks/VideoModelMock.js';

import {expect} from 'chai';
const context = {};

describe('MediaSourceController', function () {

    let mediaSourceController;

    // WebKit uses ManagedMediaSource, which never fires 'sourceopen' when attached via a
    // bare object URL (it requires disableRemotePlayback and a connected element), so
    // tests waiting for the event would hang until the runner timeout. Probe once with a
    // source created the same way the tests create it and skip those tests if the event
    // never fires.
    let sourceOpenSupported = false;

    before(function (done) {
        this.timeout(5000);
        const mediaSource = MediaSourceController(context).getInstance().createMediaSource();
        const video = document.createElement('video');
        const timeout = setTimeout(function () {
            done();
        }, 2000);
        mediaSource.addEventListener('sourceopen', function () {
            sourceOpenSupported = true;
            clearTimeout(timeout);
            done();
        });
        video.src = window.URL.createObjectURL(mediaSource);
    });

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
            if (!sourceOpenSupported) {
                this.skip();
            }

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

        it('should clamp the duration to the highest buffered end time to avoid setting it below buffered coded frames', function (done) {
            if (!sourceOpenSupported) {
                this.skip();
            }

            function _onSourceOpen() {
                // An exception here would otherwise be swallowed by the event dispatch
                // and the test would hang until the runner timeout instead of failing.
                try {
                    Object.defineProperty(source, 'sourceBuffers', {
                        get: function () {
                            return [{
                                updating: false,
                                buffered: {
                                    length: 1,
                                    start: function () {
                                        return 0;
                                    },
                                    end: function () {
                                        return 26.5;
                                    }
                                }
                            }];
                        }
                    });
                    mediaSourceController.setDuration(26);
                    expect(source.duration).to.equal(26.5);
                    done();
                } catch (e) {
                    done(e);
                }
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
            if (!sourceOpenSupported) {
                this.skip();
            }

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
