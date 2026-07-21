import CmcdController from '../../../../src/streaming/controllers/CmcdController.js';
import Settings from '../../../../src/core/Settings.js';
import {HTTPRequest} from '../../../../src/streaming/vo/metrics/HTTPRequest.js';
import EventBus from '../../../../src/core/EventBus.js';
import MediaPlayerEvents from '../../../../src/streaming/MediaPlayerEvents.js';
import AbrControllerMock from '../../mocks/AbrControllerMock.js';
import DashMetricsMock from '../../mocks/DashMetricsMock.js';
import PlaybackControllerMock from '../../mocks/PlaybackControllerMock.js';
import ThroughputControllerMock from '../../mocks/ThroughputControllerMock.js';
import ServiceDescriptionControllerMock from '../../mocks/ServiceDescriptionControllerMock.js';
import {decodeCmcd} from '@svta/cml-cmcd';
import StreamMock from '../../mocks/StreamMock.js';
import {expect} from 'chai';
import sinon from 'sinon';

const context = {};

const eventBus = EventBus(context).getInstance();

describe('CmcdController', function () {
    let cmcdController;

    let abrControllerMock;
    let dashMetricsMock = new DashMetricsMock();
    let playbackControllerMock = new PlaybackControllerMock();
    const throughputControllerMock = new ThroughputControllerMock();
    let serviceDescriptionControllerMock = new ServiceDescriptionControllerMock();

    let settings = Settings(context).getInstance();

    beforeEach(function () {
        abrControllerMock = new AbrControllerMock();
        playbackControllerMock = new PlaybackControllerMock(); // Ensure fresh instance for each test
        cmcdController = CmcdController(context).getInstance();
        cmcdController.initialize();
        settings.update({ streaming: { cmcd: { enabled: true, cid: null } } });
    });

    afterEach(function () {
        cmcdController.reset();
        cmcdController = null;
        settings.reset();
        serviceDescriptionControllerMock.reset();
    });

    describe('if configured', function () {
        beforeEach(function () {
            cmcdController.setConfig({
                abrController: abrControllerMock,
                dashMetrics: dashMetricsMock,
                playbackController: playbackControllerMock,
                throughputController: throughputControllerMock,
                serviceDescriptionController: serviceDescriptionControllerMock
            });
        });
    });


    describe('Event Mode', () => {
        let urlLoaderMock;

        beforeEach(() => {
            urlLoaderMock = {
                load: sinon.spy()
            };

            cmcdController.reset();
            cmcdController.setConfig({
                abrController: abrControllerMock,
                dashMetrics: dashMetricsMock,
                playbackController: playbackControllerMock,
                throughputController: throughputControllerMock,
                serviceDescriptionController: serviceDescriptionControllerMock,
                urlLoader: urlLoaderMock
            });
        });

        it('should send a report when a configured event is triggered', () => {
            settings.update({
                streaming: {
                    cmcd: {
                        version: 2,
                        eventTargets: [{
                            url: 'https://cmcd.event.collector/api',
                            enabled: true,
                            enabledKeys: ['e', 'sta'],
                            events: ['ps'],
                            interval: 0
                        }]
                    }
                }
            });
            cmcdController.initialize();

            eventBus.trigger(MediaPlayerEvents.PLAYBACK_PLAYING);

            expect(urlLoaderMock.load.calledOnce).to.be.true;
            const requestSent = urlLoaderMock.load.firstCall.args[0].request;
            expect(requestSent.url).to.equal('https://cmcd.event.collector/api');
            expect(requestSent.method).to.equal(HTTPRequest.POST);
            expect(requestSent.body).to.be.a('string');

            const metrics = decodeCmcd(decodeURIComponent(requestSent.body));
            expect(metrics).to.have.property('e', 'ps');
        });

        it('should send event reports for a target with an empty sendResponseReceivedForRequestTypes list', () => {
            settings.update({
                streaming: {
                    cmcd: {
                        version: 2,
                        eventTargets: [{
                            url: 'https://cmcd.event.collector/api',
                            enabled: true,
                            enabledKeys: ['e', 'sta'],
                            events: ['ps'],
                            sendResponseReceivedForRequestTypes: [],
                            interval: 0
                        }]
                    }
                }
            });
            cmcdController.initialize();

            eventBus.trigger(MediaPlayerEvents.PLAYBACK_PLAYING);

            expect(urlLoaderMock.load.calledOnce).to.be.true;
            const requestSent = urlLoaderMock.load.firstCall.args[0].request;
            expect(requestSent.url).to.equal('https://cmcd.event.collector/api');

            const metrics = decodeCmcd(decodeURIComponent(requestSent.body));
            expect(metrics).to.have.property('e', 'ps');
        });

        it('should not send any event if they are undefined', () => {
            settings.update({
                streaming: {
                    cmcd: {
                        version: 2,
                        eventTargets: [{
                            url: 'https://cmcd.event.collector/api',
                            enabled: true,
                            interval: 0
                        }]
                    }
                }
            });
            cmcdController.initialize();

            eventBus.trigger(MediaPlayerEvents.PLAYBACK_PLAYING);

            expect(urlLoaderMock.load.called).to.be.false;
        });

        it('should send a report with event mode available keys', () => {
            settings.update({
                streaming: {
                    cmcd: {
                        version: 2,
                        eventTargets: [{
                            url: 'https://cmcd.event.collector/api',
                            enabled: true,
                            enabledKeys: ['e', 'sta', 'ttfb'],
                            events: ['ps'],
                            interval: 0
                        }]
                    }
                }
            });
            cmcdController.initialize();

            eventBus.trigger(MediaPlayerEvents.PLAYBACK_PLAYING);

            expect(urlLoaderMock.load.calledOnce).to.be.true;
            const requestSent = urlLoaderMock.load.firstCall.args[0].request;
            expect(requestSent.url).to.equal('https://cmcd.event.collector/api');
            expect(requestSent.method).to.equal(HTTPRequest.POST);
            expect(requestSent.body).to.be.a('string');

            const metrics = decodeCmcd(decodeURIComponent(requestSent.body));
            expect(metrics).to.have.property('e', 'ps');
            expect(metrics).to.have.property('sta', 'p');
            expect(metrics).to.not.have.property('ttfb');
        });

        it('should send a report when the ERROR event is triggered', () => {
            settings.update({
                streaming: {
                    cmcd: {
                        version: 2,
                        eventTargets: [{
                            url: 'https://cmcd.event.collector/api',
                            enabled: true,
                            enabledKeys: ['e'],
                            events: ['e'],
                            interval: 0
                        }]
                    }
                }
            });
            cmcdController.initialize();

            const errorPayload = {
                error: {
                    code: 123,
                    message: 'Test Error Message',
                    data: {
                        request: {
                            type: 'someOtherRequestType' // Ensure it's not CMCD_EVENT
                        }
                    }
                }
            };

            eventBus.trigger(MediaPlayerEvents.ERROR, errorPayload);
            expect(urlLoaderMock.load.calledOnce).to.be.true;
            const requestSent = urlLoaderMock.load.firstCall.args[0].request;
            expect(requestSent.url).to.equal('https://cmcd.event.collector/api');
            expect(requestSent.method).to.equal(HTTPRequest.POST);
            expect(requestSent.body).to.be.a('string');

            const metrics = decodeCmcd(decodeURIComponent(requestSent.body));
            expect(metrics).to.have.property('e', 'e');
        });

        it('should not send a report when the ERROR event is triggered by a CMCD_EVENT', () => {
            settings.update({
                streaming: {
                    cmcd: {
                        version: 2,
                        eventTargets: [{
                            url: 'https://cmcd.event.collector/api',
                            enabled: true,
                            enabledKeys: ['e'],
                            events: ['e'],
                            interval: 0
                        }]
                    }
                }
            });
            cmcdController.initialize();

            const errorPayload = {
                error: {
                    code: 456,
                    message: 'CMCD Event Error',
                    data: {
                        request: {
                            type: HTTPRequest.CMCD_EVENT // This should prevent the report
                        }
                    }
                }
            };

            eventBus.trigger(MediaPlayerEvents.ERROR, errorPayload);
            expect(urlLoaderMock.load.called).to.be.false;
        });

        it('should not send a report when version is 1', () => {
            settings.update({
                streaming: {
                    cmcd: {
                        version: 1,
                        eventTargets: [{
                            url: 'https://cmcd.event.collector/api',
                            enabled: true,
                            interval: 0
                        }]
                    }
                }
            });
            cmcdController.initialize();

            eventBus.trigger(MediaPlayerEvents.PLAYBACK_PLAYING);
            expect(urlLoaderMock.load.called).to.be.false;
        });

        it('should increment the sn key for each event report', () => {
            settings.update({
                streaming: {
                    cmcd: {
                        version: 2,
                        eventTargets: [{
                            url: 'https://cmcd.event.collector/api',
                            enabled: true,
                            enabledKeys: ['sn'],
                            events: ['ps']
                        }]
                    }
                }
            });
            cmcdController.initialize();

            eventBus.trigger(MediaPlayerEvents.PLAYBACK_PLAYING);

            expect(urlLoaderMock.load.calledOnce).to.be.true;
            const request1 = urlLoaderMock.load.firstCall.args[0].request;
            expect(request1.method).to.equal(HTTPRequest.POST);
            const metrics1 = decodeCmcd(decodeURIComponent(request1.body));
            expect(metrics1).to.have.property('sn', 0);

            eventBus.trigger(MediaPlayerEvents.PLAYBACK_PAUSED);
            const request2 = urlLoaderMock.load.secondCall.args[0].request;
            expect(request2.method).to.equal(HTTPRequest.POST);
            const metrics2 = decodeCmcd(decodeURIComponent(request2.body));
            expect(metrics2).to.have.property('sn', 1);
        });

        it('should send mandatory keys if enabled keys is not defined', () => {
            settings.update({
                streaming: {
                    cmcd: {
                        version: 2,
                        sid: 'session-id',
                        eventTargets: [{
                            url: 'https://cmcd.event.collector/api',
                            enabled: true,
                            enabledKeys: [],
                            events: ['rr'],
                            sendResponseReceivedForRequestTypes: ['segment'],
                            interval: 0
                        }]
                    }
                }
            });
            cmcdController.initialize();

            const mockResponse = {
                status: 200,
                request: {
                    url: 'http://test.url/video.m4s',
                    customData: {
                        request: {
                            type: HTTPRequest.MEDIA_SEGMENT_TYPE,
                            url: 'http://test.url/video.m4s'
                        }
                    },
                    cmcd: { sid: 'session-id' }
                }
            };

            const interceptor = cmcdController.getCmcdResponseReceivedInterceptors()[0];
            interceptor(mockResponse);

            expect(urlLoaderMock.load.called).to.be.true;
            const requestSent = urlLoaderMock.load.firstCall.args[0].request;
            expect(requestSent.method).to.equal(HTTPRequest.POST);
            expect(requestSent.body).to.be.a('string');

            const metrics = decodeCmcd(decodeURIComponent(requestSent.body));
            expect(metrics).to.have.property('ts');
            expect(metrics).to.have.property('v');
        });

        it('should only send reports for configured events and ignore non-configured ones', () => {
            settings.update({
                streaming: {
                    cmcd: {
                        version: 2,
                        eventTargets: [{
                            url: 'https://cmcd.event.collector/api',
                            enabled: true,
                            enabledKeys: ['e', 'sta'],
                            events: ['ps'],
                            interval: 0
                        }]
                    }
                }
            });
            cmcdController.initialize();

            // Trigger a non-configured event (ERROR) - should NOT send a report
            eventBus.trigger(MediaPlayerEvents.ERROR, {
                error: { code: 100, message: 'test error', data: {} }
            });
            expect(urlLoaderMock.load.called).to.be.false;

            // Trigger the configured event (PLAY_STATE via PLAYBACK_PLAYING) - should send a report
            eventBus.trigger(MediaPlayerEvents.PLAYBACK_PLAYING);
            expect(urlLoaderMock.load.calledOnce).to.be.true;

            const requestSent = urlLoaderMock.load.firstCall.args[0].request;
            const metrics = decodeCmcd(decodeURIComponent(requestSent.body));
            expect(metrics).to.have.property('e', 'ps');
        });
    });

    describe('Event Mode player state events', () => {
        let urlLoaderMock;

        beforeEach(() => {
            urlLoaderMock = {
                load: sinon.spy()
            };

            cmcdController.reset();
            settings.update({
                streaming: {
                    cmcd: {
                        version: 2,
                        eventTargets: [{
                            url: 'https://cmcd.event.collector/api',
                            enabled: true,
                            enabledKeys: ['e', 'sta'],
                            events: ['ps'],
                        }]
                    }
                }
            });

            cmcdController.setConfig({
                abrController: abrControllerMock,
                dashMetrics: dashMetricsMock,
                playbackController: playbackControllerMock,
                throughputController: throughputControllerMock,
                serviceDescriptionController: serviceDescriptionControllerMock,
                urlLoader: urlLoaderMock
            });

            cmcdController.initialize();
        });

        it('should send a report when the STARTING event is triggered', () => {
            eventBus.trigger(MediaPlayerEvents.PLAYBACK_INITIALIZED);
            expect(urlLoaderMock.load.called).to.be.true;
            const requestSent = urlLoaderMock.load.firstCall.args[0].request;
            expect(requestSent.url).to.equal('https://cmcd.event.collector/api');
            expect(requestSent.method).to.equal(HTTPRequest.POST);

            const metrics = decodeCmcd(decodeURIComponent(requestSent.body));
            expect(metrics).to.have.property('e', 'ps');
            expect(metrics).to.have.property('sta', 's');
        });

        it('should send a report when the PLAYING event is triggered', () => {
            eventBus.trigger(MediaPlayerEvents.PLAYBACK_PLAYING);
            expect(urlLoaderMock.load.calledOnce).to.be.true;
            const requestSent = urlLoaderMock.load.firstCall.args[0].request;
            expect(requestSent.url).to.equal('https://cmcd.event.collector/api');
            expect(requestSent.method).to.equal(HTTPRequest.POST);

            const metrics = decodeCmcd(decodeURIComponent(requestSent.body));
            expect(metrics).to.have.property('e', 'ps');
            expect(metrics).to.have.property('sta', 'p');
        });

        it('should send a report when the REBUFFERING event is triggered', () => {
            eventBus.trigger(MediaPlayerEvents.PLAYBACK_STARTED);
            eventBus.trigger(MediaPlayerEvents.PLAYBACK_WAITING);
            expect(urlLoaderMock.load.called).to.be.true;
            const requestSent = urlLoaderMock.load.firstCall.args[0].request;
            expect(requestSent.url).to.equal('https://cmcd.event.collector/api');
            expect(requestSent.method).to.equal(HTTPRequest.POST);

            const metrics = decodeCmcd(decodeURIComponent(requestSent.body));
            expect(metrics).to.have.property('e', 'ps');
            expect(metrics).to.have.property('sta', 'r');
        });

        it('should send a report when the PAUSED event is triggered', () => {
            eventBus.trigger(MediaPlayerEvents.PLAYBACK_PAUSED);
            expect(urlLoaderMock.load.called).to.be.true;
            const requestSent = urlLoaderMock.load.firstCall.args[0].request;
            expect(requestSent.url).to.equal('https://cmcd.event.collector/api');
            expect(requestSent.method).to.equal(HTTPRequest.POST);

            const metrics = decodeCmcd(decodeURIComponent(requestSent.body));
            expect(metrics).to.have.property('e', 'ps');
            expect(metrics).to.have.property('sta', 'a');
        });

        it('should send a report when the SEEKING event is triggered', () => {
            eventBus.trigger(MediaPlayerEvents.PLAYBACK_SEEKING);
            expect(urlLoaderMock.load.calledOnce).to.be.true;
            const requestSent = urlLoaderMock.load.firstCall.args[0].request;
            expect(requestSent.url).to.equal('https://cmcd.event.collector/api');
            expect(requestSent.method).to.equal(HTTPRequest.POST);

            const metrics = decodeCmcd(decodeURIComponent(requestSent.body));
            expect(metrics).to.have.property('e', 'ps');
            expect(metrics).to.have.property('sta', 'k');
        });

        it('should send a report when the WAITING event is triggered', () => {
            eventBus.trigger(MediaPlayerEvents.PLAYBACK_WAITING);
            expect(urlLoaderMock.load.calledOnce).to.be.true;
            const requestSent = urlLoaderMock.load.firstCall.args[0].request;
            expect(requestSent.url).to.equal('https://cmcd.event.collector/api');
            expect(requestSent.method).to.equal(HTTPRequest.POST);

            const metrics = decodeCmcd(decodeURIComponent(requestSent.body));
            expect(metrics).to.have.property('e', 'ps');
            expect(metrics).to.have.property('sta', 'w');
        });

        it('should send a report when the ENDED event is triggered', () => {
            eventBus.trigger(MediaPlayerEvents.PLAYBACK_ENDED);
            expect(urlLoaderMock.load.called).to.be.true;
            const requestSent = urlLoaderMock.load.firstCall.args[0].request;
            expect(requestSent.url).to.equal('https://cmcd.event.collector/api');
            expect(requestSent.method).to.equal(HTTPRequest.POST);

            const metrics = decodeCmcd(decodeURIComponent(requestSent.body));
            expect(metrics).to.have.property('e', 'ps');
            expect(metrics).to.have.property('sta', 'e');
        });
    });

    describe('Event Mode - time interval', () => {
        let urlLoaderMock;
        let clock;

        beforeEach(() => {
            clock = sinon.useFakeTimers();
            urlLoaderMock = {
                load: sinon.spy()
            };

            cmcdController.reset();
            settings.update({
                streaming: {
                    cmcd: {
                        version: 2,
                        eventTargets: [{
                            url: 'https://cmcd.event.collector/api',
                            enabled: true,
                            enabledKeys: ['e'],
                            events: ['ps', 't'],
                            interval: 1
                        }]
                    }
                }
            });
            cmcdController.setConfig({
                abrController: abrControllerMock,
                dashMetrics: dashMetricsMock,
                playbackController: playbackControllerMock,
                throughputController: throughputControllerMock,
                serviceDescriptionController: serviceDescriptionControllerMock,
                urlLoader: urlLoaderMock
            });
            cmcdController.initialize();
        });

        afterEach(function() {
            clock.restore();
        });

        it('should send reports periodically according to the interval', () => {
            // CmcdReporter fires the first TIME_INTERVAL event immediately on start()
            expect(urlLoaderMock.load.calledOnce).to.be.true;
            let requestSent = urlLoaderMock.load.firstCall.args[0].request;
            expect(requestSent.method).to.equal(HTTPRequest.POST);
            let metrics = decodeCmcd(decodeURIComponent(requestSent.body));
            expect(metrics).to.have.property('e', 't');
            clock.tick(1000);
            expect(urlLoaderMock.load.calledTwice).to.be.true;
            clock.tick(1000);
            expect(urlLoaderMock.load.calledThrice).to.be.true;
        });
    })

    describe('Event Mode - data validation', () => {
        let urlLoaderMock;
        let internalPlaybackControllerMock;

        beforeEach(() => {
            urlLoaderMock = {
                load: sinon.spy()
            };
            cmcdController.reset();
            internalPlaybackControllerMock = new PlaybackControllerMock();

            settings.update({
                streaming: {
                    cmcd: {
                        version: 2,
                        eventTargets: [{
                            url: 'https://cmcd.event.collector/api',
                            enabled: true,
                            enabledKeys: ['ab', 'tab', 'lab'],
                            events: ['ps'],
                            interval: 0
                        }]
                    }
                }
            });
            cmcdController.setConfig({
                abrController: abrControllerMock,
                dashMetrics: dashMetricsMock,
                playbackController: internalPlaybackControllerMock,
                throughputController: throughputControllerMock,
                serviceDescriptionController: serviceDescriptionControllerMock,
                urlLoader: urlLoaderMock
            });
            cmcdController.initialize();
        });

        it('aggregated bitrate values ab, tab, lab should not be present on no active stream', () => {
            eventBus.trigger(MediaPlayerEvents.PLAYBACK_PLAYING);
            expect(urlLoaderMock.load.calledOnce).to.be.true;
            const requestSent = urlLoaderMock.load.firstCall.args[0].request;
            expect(requestSent.url).to.equal('https://cmcd.event.collector/api');
            expect(requestSent.method).to.equal(HTTPRequest.POST);

            const metrics = decodeCmcd(decodeURIComponent(requestSent.body));
            expect(metrics).to.not.have.property('ab');
            expect(metrics).to.not.have.property('tab');
            expect(metrics).to.not.have.property('lab');
        });

        it('aggregated bitrate values ab, tab, lab should be present on active stream as inner lists', () => {
            // mocking active stream
            const streamMock = new StreamMock();
            streamMock.getRepresentationsByType = function() {
                return [{ bitrateInKbit: 1000 }, { bitrateInKbit: 2000 }, { bitrateInKbit: 3000 }];
            }
            streamMock.getCurrentRepresentationForType = function() {
                return { bitrateInKbit: 2000 };
            }

            internalPlaybackControllerMock.streamController.activeStream = streamMock;

            eventBus.trigger(MediaPlayerEvents.PLAYBACK_PLAYING);
            expect(urlLoaderMock.load.calledOnce).to.be.true;
            const requestSent = urlLoaderMock.load.firstCall.args[0].request;
            expect(requestSent.url).to.equal('https://cmcd.event.collector/api');
            expect(requestSent.method).to.equal(HTTPRequest.POST);

            const metrics = decodeCmcd(decodeURIComponent(requestSent.body));
            expect(metrics).to.have.property('lab');
            expect(metrics.lab).to.be.an('array').with.lengthOf(2);
            expect(metrics.lab[0].value).to.equal(1000);
            expect(metrics.lab[1].value).to.equal(1000);
            expect(metrics).to.have.property('ab');
            expect(metrics.ab).to.be.an('array').with.lengthOf(2);
            expect(metrics.ab[0].value).to.equal(2000);
            expect(metrics.ab[1].value).to.equal(2000);
            expect(metrics).to.have.property('tab');
            expect(metrics.tab).to.be.an('array').with.lengthOf(2);
            expect(metrics.tab[0].value).to.equal(3000);
            expect(metrics.tab[1].value).to.equal(3000);
        });
    });

    describe('Response Mode', () => {
        let urlLoaderMock;

        beforeEach(() => {
            urlLoaderMock = {
                load: sinon.spy()
            };

            cmcdController.reset();
            cmcdController.setConfig({
                abrController: abrControllerMock,
                dashMetrics: dashMetricsMock,
                playbackController: playbackControllerMock,
                throughputController: throughputControllerMock,
                serviceDescriptionController: serviceDescriptionControllerMock,
                urlLoader: urlLoaderMock
            });
        });

        it('should send a response report when a media segment response is received', () => {
            settings.update({
                streaming: {
                    cmcd: {
                        version: 2,
                        sid: 'session-id',
                        eventTargets: [{
                            url: 'https://cmcd.response.collector/api',
                            enabled: true,
                            sendResponseReceivedForRequestTypes: ['segment'],
                            enabledKeys: ['rc', 'ttfb', 'ttlb', 'url', 'sid'],
                            events: ['rr']
                        }]
                    }
                }
            });
            cmcdController.initialize();

            let currentTime = new Date(Date.now());
            const mockResponse = {
                status: 200,
                request: {
                    url: 'http://test.url/video.m4s',
                    customData: {
                        request: {
                            type: HTTPRequest.MEDIA_SEGMENT_TYPE,
                            url: 'http://test.url/video.m4s',
                            startDate: currentTime - 1000,
                            firstByteDate: currentTime - 500,
                            endDate: new Date()
                        }
                    },
                    cmcd: { sid: 'session-id' },
                },
                resourceTiming: {
                    startTime: currentTime - 1000,
                    responseStart: currentTime - 500,
                    duration: 1000
                }
            };

            const interceptor = cmcdController.getCmcdResponseReceivedInterceptors()[0];
            interceptor(mockResponse);

            expect(urlLoaderMock.load.calledOnce).to.be.true;
            const requestSent = urlLoaderMock.load.firstCall.args[0].request;
            expect(requestSent.url).to.equal('https://cmcd.response.collector/api');
            expect(requestSent.method).to.equal(HTTPRequest.POST);

            const metrics = decodeCmcd(decodeURIComponent(requestSent.body));
            expect(metrics).to.have.property('rc');
            expect(metrics).to.have.property('sid', 'session-id');
            expect(metrics).to.have.property('url', 'http://test.url/video.m4s');
            expect(metrics).to.have.property('ttfb');
            expect(metrics).to.have.property('ttlb');
        });

        it('should only send response reports to targets matching the response request type', () => {
            settings.update({
                streaming: {
                    cmcd: {
                        version: 2,
                        eventTargets: [{
                            url: 'https://cmcd.segment.collector/api',
                            enabled: true,
                            sendResponseReceivedForRequestTypes: ['segment'],
                            events: ['rr']
                        }, {
                            url: 'https://cmcd.mpd.collector/api',
                            enabled: true,
                            sendResponseReceivedForRequestTypes: ['mpd'],
                            events: ['rr']
                        }]
                    }
                }
            });
            cmcdController.initialize();

            const interceptor = cmcdController.getCmcdResponseReceivedInterceptors()[0];
            interceptor({
                status: 200,
                request: {
                    url: 'http://test.url/manifest.mpd',
                    customData: {
                        request: {
                            type: HTTPRequest.MPD_TYPE,
                            url: 'http://test.url/manifest.mpd'
                        }
                    },
                    cmcd: {}
                }
            });
            interceptor({
                status: 200,
                request: {
                    url: 'http://test.url/video.m4s',
                    customData: {
                        request: {
                            type: HTTPRequest.MEDIA_SEGMENT_TYPE,
                            url: 'http://test.url/video.m4s'
                        }
                    },
                    cmcd: {}
                }
            });

            expect(urlLoaderMock.load.calledTwice).to.be.true;
            expect(urlLoaderMock.load.firstCall.args[0].request.url).to.equal('https://cmcd.mpd.collector/api');
            expect(urlLoaderMock.load.secondCall.args[0].request.url).to.equal('https://cmcd.segment.collector/api');
        });

        it('should increment sequence numbers across response and other target events', () => {
            settings.update({
                streaming: {
                    cmcd: {
                        version: 2,
                        eventTargets: [{
                            url: 'https://cmcd.response.collector/api',
                            enabled: true,
                            sendResponseReceivedForRequestTypes: ['segment'],
                            enabledKeys: ['sn'],
                            events: ['ps', 'rr']
                        }]
                    }
                }
            });
            cmcdController.initialize();

            eventBus.trigger(MediaPlayerEvents.PLAYBACK_INITIALIZED);
            const interceptor = cmcdController.getCmcdResponseReceivedInterceptors()[0];
            interceptor({
                status: 200,
                request: {
                    url: 'http://test.url/video.m4s',
                    customData: {
                        request: {
                            type: HTTPRequest.MEDIA_SEGMENT_TYPE,
                            url: 'http://test.url/video.m4s'
                        }
                    },
                    cmcd: {}
                }
            });

            expect(urlLoaderMock.load.calledTwice).to.be.true;
            expect(decodeCmcd(decodeURIComponent(urlLoaderMock.load.firstCall.args[0].request.body))).to.have.property('sn', 0);
            expect(decodeCmcd(decodeURIComponent(urlLoaderMock.load.secondCall.args[0].request.body))).to.have.property('sn', 1);
        });

        it('should send a response report with cmsdd and cmsds keys when CMSD headers are present', () => {
            settings.update({
                streaming: {
                    cmcd: {
                        version: 2,
                        sid: 'session-id',
                        eventTargets: [{
                            url: 'https://cmcd.response.collector/api',
                            enabled: true,
                            sendResponseReceivedForRequestTypes: ['segment'],
                            enabledKeys: ['cmsdd', 'cmsds'],
                            events: ['rr']
                        }]
                    }
                }
            });
            cmcdController.initialize();

            const cmsdStaticHeaderValue = 'sf=d,st=v,sid="test-sid"';
            const cmsdDynamicHeaderValue = 'br=3200,d=4004,ot=v,tb=60000';

            const mockResponse = {
                status: 200,
                headers: {
                    'cmsd-static': cmsdStaticHeaderValue,
                    'cmsd-dynamic': cmsdDynamicHeaderValue
                },
                request: {
                    url: 'http://test.url/video.m4s',
                    customData: {
                        request: {
                            type: HTTPRequest.MEDIA_SEGMENT_TYPE,
                            url: 'http://test.url/video.m4s'
                        }
                    },
                    cmcd: { sid: 'session-id' }
                }
            };

            const interceptor = cmcdController.getCmcdResponseReceivedInterceptors()[0];
            interceptor(mockResponse);

            expect(urlLoaderMock.load.calledOnce).to.be.true;
            const requestSent = urlLoaderMock.load.firstCall.args[0].request;
            expect(requestSent.method).to.equal(HTTPRequest.POST);

            const metrics = decodeCmcd(decodeURIComponent(requestSent.body));

            expect(metrics).to.have.property('cmsds', btoa(cmsdStaticHeaderValue));
            expect(metrics).to.have.property('cmsdd', btoa(cmsdDynamicHeaderValue));
        });

        it('should not send a report if the target is disabled', () => {
            settings.update({
                streaming: {
                    cmcd: {
                        version: 2,
                        eventTargets: [{
                            url: 'https://cmcd.response.collector/api',
                            enabled: false,
                            sendResponseReceivedForRequestTypes: ['segment'],
                            events: ['rr']
                        }]
                    }
                }
            });

            const mockResponse = {
                status: 200,
                request: {
                    url: 'http://test.url/video.m4s',
                    customData: {
                        request: {
                            type: HTTPRequest.MEDIA_SEGMENT_TYPE,
                            url: 'http://test.url/video.m4s'
                        }
                    },
                    cmcd: { sid: 'session-id' }
                }
            };

            const interceptor = cmcdController.getCmcdResponseReceivedInterceptors()[0];
            interceptor(mockResponse);

            expect(urlLoaderMock.load.called).to.be.false;
        });

        it('should not send a report if version is 1', () => {
            settings.update({
                streaming: {
                    cmcd: {
                        version: 1,
                        eventTargets: [{
                            url: 'https://cmcd.response.collector/api',
                            enabled: true,
                            sendResponseReceivedForRequestTypes: ['segment'],
                            events: ['rr']
                        }]
                    }
                }
            });

            const mockResponse = {
                status: 200,
                request: {
                    customData: {
                        request: {
                            type: HTTPRequest.MEDIA_SEGMENT_TYPE,
                            url: 'http://test.url/video.m4s'
                        }
                    },
                    cmcd: { sid: 'session-id' }
                }
            };

            const interceptor = cmcdController.getCmcdResponseReceivedInterceptors()[0];
            interceptor(mockResponse);

            expect(urlLoaderMock.load.called).to.be.false;
        });

        it('should send a response report with response mode available keys', () => {
            settings.update({
                streaming: {
                    cmcd: {
                        version: 2,
                        sid: 'session-id',
                        eventTargets: [{
                            url: 'https://cmcd.response.collector/api',
                            enabled: true,
                            sendResponseReceivedForRequestTypes: ['segment'],
                            enabledKeys: ['rc', 'e', 'd'],
                            events: ['rr']
                        }]
                    }
                }
            });
            cmcdController.initialize();

            let currentTime = new Date(Date.now());
            const mockResponse = {
                status: 200,
                request: {
                    url: 'http://test.url/video.m4s',
                    customData: {
                        request: {
                            type: HTTPRequest.MEDIA_SEGMENT_TYPE,
                            url: 'http://test.url/video.m4s',
                            startDate: currentTime - 1000,
                            firstByteDate: currentTime - 500,
                            endDate: new Date()
                        }
                    },
                    cmcd: { sid: 'session-id' },
                },
                resourceTiming: {
                    startTime: currentTime - 1000,
                    responseStart: currentTime - 500,
                    duration: 1000
                }
            };

            const interceptor = cmcdController.getCmcdResponseReceivedInterceptors()[0];
            interceptor(mockResponse);

            expect(urlLoaderMock.load.calledOnce).to.be.true;
            const requestSent = urlLoaderMock.load.firstCall.args[0].request;
            expect(requestSent.url).to.equal('https://cmcd.response.collector/api');
            expect(requestSent.method).to.equal(HTTPRequest.POST);

            const metrics = decodeCmcd(decodeURIComponent(requestSent.body));
            expect(metrics).to.have.property('rc');
            expect(metrics).to.have.property('e');
            expect(metrics).to.not.have.property('d');
        });

        it('should increment the sn key for each response report', () => {
            settings.update({
                streaming: {
                    cmcd: {
                        version: 2,
                        eventTargets: [{
                            url: 'https://cmcd.response.collector/api',
                            enabled: true,
                            sendResponseReceivedForRequestTypes: ['segment'],
                            enabledKeys: ['sn'],
                            events: ['rr']
                        }]
                    }
                }
            });
            cmcdController.initialize();

            const mockResponse = {
                status: 200,
                request: {
                    url: 'http://test.url/video.m4s',
                    customData: {
                        request: {
                            type: HTTPRequest.MEDIA_SEGMENT_TYPE,
                            url: 'http://test.url/video.m4s'
                        }
                    },
                    cmcd: {}
                }
            };

            const interceptor = cmcdController.getCmcdResponseReceivedInterceptors()[0];
            interceptor(mockResponse);
            interceptor(mockResponse);

            expect(urlLoaderMock.load.calledTwice).to.be.true;

            const request1 = urlLoaderMock.load.firstCall.args[0].request;
            expect(request1.method).to.equal(HTTPRequest.POST);
            const metrics1 = decodeCmcd(decodeURIComponent(request1.body));
            expect(metrics1).to.have.property('sn', 0);

            const request2 = urlLoaderMock.load.secondCall.args[0].request;
            expect(request2.method).to.equal(HTTPRequest.POST);
            const metrics2 = decodeCmcd(decodeURIComponent(request2.body));
            expect(metrics2).to.have.property('sn', 1);
        });
    });

    describe('Request Mode', () => {
        beforeEach(function () {
            cmcdController.setConfig({
                abrController: abrControllerMock,
                dashMetrics: dashMetricsMock,
                playbackController: playbackControllerMock,
                throughputController: throughputControllerMock,
                serviceDescriptionController: serviceDescriptionControllerMock
            });
        });

        function createCommonMediaRequest(request) {
            return {
                url: request.url,
                headers: request.headers || {},
                customData: { request }
            };
        }

        function getCmcdFromUrl(url) {
            const parsed = new URL(url);
            const cmcdParam = parsed.searchParams.get('CMCD');
            return cmcdParam ? decodeCmcd(cmcdParam) : {};
        }

        it('should decorate a v1 request with CMCD query parameters', function () {
            settings.update({ streaming: { cmcd: { enabled: true, version: 1 } } });
            cmcdController.reset();
            cmcdController.initialize();
            cmcdController.setConfig({
                abrController: abrControllerMock,
                dashMetrics: dashMetricsMock,
                playbackController: playbackControllerMock,
                throughputController: throughputControllerMock,
                serviceDescriptionController: serviceDescriptionControllerMock
            });

            const interceptor = cmcdController.getCmcdRequestInterceptors()[0];
            const result = interceptor(createCommonMediaRequest({
                url: 'http://example.com/segment.m4s',
                type: HTTPRequest.MEDIA_SEGMENT_TYPE,
                mediaType: 'video',
                quality: 0,
                representation: { mediaInfo: { bitrateList: [{ bandwidth: 10000 }] } },
                duration: 4
            }));

            expect(result.url).to.include('CMCD=');
            const metrics = getCmcdFromUrl(result.url);
            expect(metrics).to.have.property('ot', 'v');
            expect(metrics).to.have.property('sid');
            expect(metrics).to.not.have.property('v');
        });

        it('should decorate a v2 request with CMCD query parameters', function () {
            settings.update({ streaming: { cmcd: { enabled: true, version: 2 } } });
            cmcdController.reset();
            cmcdController.initialize();
            cmcdController.setConfig({
                abrController: abrControllerMock,
                dashMetrics: dashMetricsMock,
                playbackController: playbackControllerMock,
                throughputController: throughputControllerMock,
                serviceDescriptionController: serviceDescriptionControllerMock
            });

            const interceptor = cmcdController.getCmcdRequestInterceptors()[0];
            const result = interceptor(createCommonMediaRequest({
                url: 'http://example.com/segment.m4s',
                type: HTTPRequest.MEDIA_SEGMENT_TYPE,
                mediaType: 'video',
                quality: 0,
                representation: { mediaInfo: { bitrateList: [{ bandwidth: 10000 }] } },
                duration: 4
            }));

            expect(result.url).to.include('CMCD=');
            const metrics = getCmcdFromUrl(result.url);
            expect(metrics).to.have.property('ot', 'v');
            expect(metrics).to.have.property('v', 2);
        });

        it('should decorate a v1 request with CMCD headers when mode is headers', function () {
            settings.update({ streaming: { cmcd: { enabled: true, version: 1, mode: 'headers' } } });
            cmcdController.reset();
            cmcdController.initialize();
            cmcdController.setConfig({
                abrController: abrControllerMock,
                dashMetrics: dashMetricsMock,
                playbackController: playbackControllerMock,
                throughputController: throughputControllerMock,
                serviceDescriptionController: serviceDescriptionControllerMock
            });

            const interceptor = cmcdController.getCmcdRequestInterceptors()[0];
            const result = interceptor(createCommonMediaRequest({
                url: 'http://example.com/segment.m4s',
                type: HTTPRequest.MEDIA_SEGMENT_TYPE,
                mediaType: 'video',
                quality: 0,
                representation: { mediaInfo: { bitrateList: [{ bandwidth: 10000 }] } },
                duration: 4
            }));

            expect(result.url).to.not.include('CMCD=');
            expect(result.headers).to.have.property('CMCD-Object');
        });

        it('should decorate a v2 request with CMCD headers when mode is headers', function () {
            settings.update({ streaming: { cmcd: { enabled: true, version: 2, mode: 'headers' } } });
            cmcdController.reset();
            cmcdController.initialize();
            cmcdController.setConfig({
                abrController: abrControllerMock,
                dashMetrics: dashMetricsMock,
                playbackController: playbackControllerMock,
                throughputController: throughputControllerMock,
                serviceDescriptionController: serviceDescriptionControllerMock
            });

            const interceptor = cmcdController.getCmcdRequestInterceptors()[0];
            const result = interceptor(createCommonMediaRequest({
                url: 'http://example.com/segment.m4s',
                type: HTTPRequest.MEDIA_SEGMENT_TYPE,
                mediaType: 'video',
                quality: 0,
                representation: { mediaInfo: { bitrateList: [{ bandwidth: 10000 }] } },
                duration: 4
            }));

            expect(result.url).to.not.include('CMCD=');
            expect(result.headers).to.have.property('CMCD-Object');
        });

        it('should filter keys based on enabledKeys configuration', function () {
            settings.update({ streaming: { cmcd: { enabled: true, version: 2, enabledKeys: ['ot', 'br'] } } });
            cmcdController.reset();
            cmcdController.initialize();
            cmcdController.setConfig({
                abrController: abrControllerMock,
                dashMetrics: dashMetricsMock,
                playbackController: playbackControllerMock,
                throughputController: throughputControllerMock,
                serviceDescriptionController: serviceDescriptionControllerMock
            });

            const interceptor = cmcdController.getCmcdRequestInterceptors()[0];
            const result = interceptor(createCommonMediaRequest({
                url: 'http://example.com/segment.m4s',
                type: HTTPRequest.MEDIA_SEGMENT_TYPE,
                mediaType: 'video',
                quality: 0,
                bandwidth: 10000,
                representation: { mediaInfo: { bitrateList: [{ bandwidth: 10000 }] } },
                duration: 4
            }));

            const metrics = getCmcdFromUrl(result.url);
            expect(metrics).to.have.property('ot');
            expect(metrics).to.have.property('br');
            expect(metrics).to.not.have.property('sid');
            expect(metrics).to.not.have.property('d');
        });

        it('should not decorate request when type is not in request filter', function () {
            const interceptor = cmcdController.getCmcdRequestInterceptors()[0];
            const result = interceptor(createCommonMediaRequest({
                url: 'http://example.com/other',
                type: HTTPRequest.OTHER_TYPE,
                mediaType: 'video'
            }));

            expect(result.url).to.not.include('CMCD=');
        });

        it('should increment sn for each request in v2', function () {
            settings.update({ streaming: { cmcd: { enabled: true, version: 2 } } });
            cmcdController.reset();
            cmcdController.initialize();
            cmcdController.setConfig({
                abrController: abrControllerMock,
                dashMetrics: dashMetricsMock,
                playbackController: playbackControllerMock,
                throughputController: throughputControllerMock,
                serviceDescriptionController: serviceDescriptionControllerMock
            });

            const interceptor = cmcdController.getCmcdRequestInterceptors()[0];
            const makeRequest = () => createCommonMediaRequest({
                url: 'http://example.com/segment.m4s',
                type: HTTPRequest.MEDIA_SEGMENT_TYPE,
                mediaType: 'video',
                quality: 0,
                representation: { mediaInfo: { bitrateList: [{ bandwidth: 10000 }] } },
                duration: 4
            });

            const result1 = interceptor(makeRequest());
            const metrics1 = getCmcdFromUrl(result1.url);
            expect(metrics1).to.have.property('sn', 0);

            const result2 = interceptor(makeRequest());
            const metrics2 = getCmcdFromUrl(result2.url);
            expect(metrics2).to.have.property('sn', 1);
        });

        it('should reflect playback rate change in CMCD data', function () {
            eventBus.trigger(MediaPlayerEvents.PLAYBACK_RATE_CHANGED, { playbackRate: 2.4 });

            const interceptor = cmcdController.getCmcdRequestInterceptors()[0];
            const result = interceptor(createCommonMediaRequest({
                url: 'http://example.com/segment.m4s',
                type: HTTPRequest.MEDIA_SEGMENT_TYPE,
                mediaType: 'video',
                quality: 0,
                representation: { mediaInfo: { bitrateList: [{ bandwidth: 10000 }] } },
                duration: 4
            }));

            const metrics = getCmcdFromUrl(result.url);
            expect(metrics).to.have.property('pr', 2.4);
        });

        it('should reflect manifest load data (st, sf) in CMCD data', function () {
            eventBus.trigger(MediaPlayerEvents.MANIFEST_LOADED, {
                protocol: 'MSS',
                data: { type: 'dynamic' }
            });

            const interceptor = cmcdController.getCmcdRequestInterceptors()[0];
            const result = interceptor(createCommonMediaRequest({
                url: 'http://example.com/segment.m4s',
                type: HTTPRequest.MEDIA_SEGMENT_TYPE,
                mediaType: 'video',
                quality: 0,
                representation: { mediaInfo: { bitrateList: [{ bandwidth: 10000 }] } },
                duration: 4
            }));

            const metrics = getCmcdFromUrl(result.url);
            expect(metrics).to.have.property('st', 'l');
            expect(metrics).to.have.property('sf', 's');
        });

        it('should reflect buffer starvation in CMCD data', function () {
            const interceptor = cmcdController.getCmcdRequestInterceptors()[0];
            const makeRequest = () => createCommonMediaRequest({
                url: 'http://example.com/segment.m4s',
                type: HTTPRequest.MEDIA_SEGMENT_TYPE,
                mediaType: 'video',
                quality: 0,
                representation: { mediaInfo: { bitrateList: [{ bandwidth: 10000 }] } },
                duration: 4
            });

            // First request consumes startup flag
            interceptor(makeRequest());

            eventBus.trigger(MediaPlayerEvents.BUFFER_LEVEL_STATE_CHANGED, {
                state: MediaPlayerEvents.BUFFER_EMPTY,
                mediaType: 'video'
            });

            const result = interceptor(makeRequest());
            const metrics = getCmcdFromUrl(result.url);
            expect(metrics).to.have.property('bs', true);
            expect(metrics).to.have.property('su', true);
        });

        it('should reflect playback seek in CMCD data', function () {
            const interceptor = cmcdController.getCmcdRequestInterceptors()[0];
            const makeRequest = () => createCommonMediaRequest({
                url: 'http://example.com/segment.m4s',
                type: HTTPRequest.MEDIA_SEGMENT_TYPE,
                mediaType: 'video',
                quality: 0,
                representation: { mediaInfo: { bitrateList: [{ bandwidth: 10000 }] } },
                duration: 4
            });

            // First request consumes startup flag
            interceptor(makeRequest());

            eventBus.trigger(MediaPlayerEvents.PLAYBACK_SEEKED);

            const result = interceptor(makeRequest());
            const metrics = getCmcdFromUrl(result.url);
            expect(metrics).to.have.property('bs', true);
            expect(metrics).to.have.property('su', true);
        });

        it('should include CID when explicitly configured', function () {
            settings.update({ streaming: { cmcd: { enabled: true, cid: 'my-content-id' } } });
            cmcdController.reset();
            cmcdController.initialize();
            cmcdController.setConfig({
                abrController: abrControllerMock,
                dashMetrics: dashMetricsMock,
                playbackController: playbackControllerMock,
                throughputController: throughputControllerMock,
                serviceDescriptionController: serviceDescriptionControllerMock
            });

            const interceptor = cmcdController.getCmcdRequestInterceptors()[0];
            const result = interceptor(createCommonMediaRequest({
                url: 'http://example.com/manifest.mpd',
                type: HTTPRequest.MPD_TYPE,
                mediaType: 'video'
            }));

            const metrics = getCmcdFromUrl(result.url);
            expect(metrics).to.have.property('cid', 'my-content-id');
        });

        it('should include SID when explicitly configured', function () {
            settings.update({ streaming: { cmcd: { enabled: true, sid: 'my-session-id' } } });
            cmcdController.reset();
            cmcdController.initialize();
            cmcdController.setConfig({
                abrController: abrControllerMock,
                dashMetrics: dashMetricsMock,
                playbackController: playbackControllerMock,
                throughputController: throughputControllerMock,
                serviceDescriptionController: serviceDescriptionControllerMock
            });

            const interceptor = cmcdController.getCmcdRequestInterceptors()[0];
            const result = interceptor(createCommonMediaRequest({
                url: 'http://example.com/manifest.mpd',
                type: HTTPRequest.MPD_TYPE,
                mediaType: 'video'
            }));

            const metrics = getCmcdFromUrl(result.url);
            expect(metrics).to.have.property('sid', 'my-session-id');
        });

        it('should not decorate request when CMCD is disabled', function () {
            settings.update({ streaming: { cmcd: { enabled: false } } });
            cmcdController.reset();
            cmcdController.initialize();
            cmcdController.setConfig({
                abrController: abrControllerMock,
                dashMetrics: dashMetricsMock,
                playbackController: playbackControllerMock,
                throughputController: throughputControllerMock,
                serviceDescriptionController: serviceDescriptionControllerMock
            });

            const interceptor = cmcdController.getCmcdRequestInterceptors()[0];
            const result = interceptor(createCommonMediaRequest({
                url: 'http://example.com/manifest.mpd',
                type: HTTPRequest.MPD_TYPE,
                mediaType: 'video'
            }));

            expect(result.url).to.not.include('CMCD=');
        });
    });

    describe('Request Mode with CMCDParameters from manifest (v1)', () => {
        let internalServiceDescriptionControllerMock;

        beforeEach(function () {
            internalServiceDescriptionControllerMock = new ServiceDescriptionControllerMock();

            // Simulate CMCDParameters from manifest (as in cmcdv1.mpd)
            internalServiceDescriptionControllerMock.applyServiceDescription({
                clientDataReporting: {
                    cmcdParameters: {
                        version: '1',
                        keys: 'br sid cid',
                        contentID: 'content-id-1',
                        sessionID: 'session-id-1',
                        includeInRequests: 'segment'
                    }
                }
            });

            cmcdController.reset();
            settings.update({ streaming: { cmcd: { enabled: true } } });
            cmcdController.setConfig({
                abrController: abrControllerMock,
                dashMetrics: dashMetricsMock,
                playbackController: playbackControllerMock,
                throughputController: throughputControllerMock,
                serviceDescriptionController: internalServiceDescriptionControllerMock
            });
            cmcdController.initialize();

            // Trigger manifest loaded to pick up CMCDParameters
            eventBus.trigger(MediaPlayerEvents.MANIFEST_LOADED, {
                protocol: 'DASH',
                data: { type: 'static' }
            });
        });

        function createCommonMediaRequest(request) {
            return {
                url: request.url,
                headers: request.headers || {},
                customData: { request }
            };
        }

        function getCmcdFromUrl(url) {
            const parsed = new URL(url);
            const cmcdParam = parsed.searchParams.get('CMCD');
            return cmcdParam ? decodeCmcd(cmcdParam) : {};
        }

        it('should use sid and cid from manifest CMCDParameters', function () {
            const interceptor = cmcdController.getCmcdRequestInterceptors()[0];
            const result = interceptor(createCommonMediaRequest({
                url: 'http://example.com/segment.m4s',
                type: HTTPRequest.MEDIA_SEGMENT_TYPE,
                mediaType: 'video',
                quality: 0,
                bandwidth: 10000,
                representation: { mediaInfo: { bitrateList: [{ bandwidth: 10000 }] } },
                duration: 4
            }));

            expect(result.url).to.include('CMCD=');
            const metrics = getCmcdFromUrl(result.url);
            expect(metrics).to.have.property('sid', 'session-id-1');
            expect(metrics).to.have.property('cid', 'content-id-1');
        });

        it('should only include keys specified in manifest CMCDParameters', function () {
            const interceptor = cmcdController.getCmcdRequestInterceptors()[0];
            const result = interceptor(createCommonMediaRequest({
                url: 'http://example.com/segment.m4s',
                type: HTTPRequest.MEDIA_SEGMENT_TYPE,
                mediaType: 'video',
                quality: 0,
                bandwidth: 10000,
                representation: { mediaInfo: { bitrateList: [{ bandwidth: 10000 }] } },
                duration: 4
            }));

            const metrics = getCmcdFromUrl(result.url);
            expect(metrics).to.have.property('br');
            expect(metrics).to.have.property('sid');
            expect(metrics).to.have.property('cid');
            expect(metrics).to.not.have.property('d');
            expect(metrics).to.not.have.property('ot');
            expect(metrics).to.not.have.property('mtp');
        });

        it('should not include CMCD on non-segment requests when includeRequestTypes is segment', function () {
            const interceptor = cmcdController.getCmcdRequestInterceptors()[0];
            const result = interceptor(createCommonMediaRequest({
                url: 'http://example.com/manifest.mpd',
                type: HTTPRequest.MPD_TYPE,
                mediaType: 'video'
            }));

            expect(result.url).to.not.include('CMCD=');
        });

        it('should send CMCD using manifest config even when enabled is false in player settings', function () {
            settings.update({ streaming: { cmcd: { enabled: false } } });
            cmcdController.reset();
            cmcdController.initialize();
            cmcdController.setConfig({
                abrController: abrControllerMock,
                dashMetrics: dashMetricsMock,
                playbackController: playbackControllerMock,
                throughputController: throughputControllerMock,
                serviceDescriptionController: internalServiceDescriptionControllerMock
            });

            eventBus.trigger(MediaPlayerEvents.MANIFEST_LOADED, {
                protocol: 'DASH',
                data: { type: 'static' }
            });

            const interceptor = cmcdController.getCmcdRequestInterceptors()[0];
            const result = interceptor(createCommonMediaRequest({
                url: 'http://example.com/segment.m4s',
                type: HTTPRequest.MEDIA_SEGMENT_TYPE,
                mediaType: 'video',
                quality: 0,
                representation: { mediaInfo: { bitrateList: [{ bandwidth: 10000 }] } },
                duration: 4
            }));

            expect(result.url).to.include('CMCD=');
        });

        it('should not send CMCD when enabled is false and applyParametersFromMpd is false', function () {
            settings.update({ streaming: { cmcd: { enabled: false, applyParametersFromMpd: false } } });
            cmcdController.reset();
            cmcdController.initialize();
            cmcdController.setConfig({
                abrController: abrControllerMock,
                dashMetrics: dashMetricsMock,
                playbackController: playbackControllerMock,
                throughputController: throughputControllerMock,
                serviceDescriptionController: internalServiceDescriptionControllerMock
            });

            eventBus.trigger(MediaPlayerEvents.MANIFEST_LOADED, {
                protocol: 'DASH',
                data: { type: 'static' }
            });

            const interceptor = cmcdController.getCmcdRequestInterceptors()[0];
            const result = interceptor(createCommonMediaRequest({
                url: 'http://example.com/segment.m4s',
                type: HTTPRequest.MEDIA_SEGMENT_TYPE,
                mediaType: 'video',
                quality: 0,
                representation: { mediaInfo: { bitrateList: [{ bandwidth: 10000 }] } },
                duration: 4
            }));

            expect(result.url).to.not.include('CMCD=');
        });
    });
});
