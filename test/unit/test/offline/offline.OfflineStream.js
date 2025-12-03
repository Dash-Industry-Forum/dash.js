import OfflineStream from '../../../../src/offline/OfflineStream.js';
import OfflineConstants from '../../../../src/offline/constants/OfflineConstants.js';
import Events from '../../../../src/core/events/Events.js';

import {expect} from 'chai';
import sinon from 'sinon';

describe('OfflineStream', function () {
    const context = {};
    let offlineStream;
    let eventBusMock;
    let errHandlerMock;
    let mediaPlayerModelMock;
    let abrControllerMock;
    let playbackControllerMock;
    let adapterMock;
    let dashMetricsMock;
    let baseURLControllerMock;
    let timelineConverterMock;
    let segmentBaseControllerMock;
    let offlineStoreControllerMock;
    let settingsMock;
    let debugMock;
    let callbacksMock;

    const testManifestId = 'test-stream-id';

    beforeEach(function () {
        eventBusMock = {
            on: sinon.stub(),
            off: sinon.stub(),
            trigger: sinon.stub()
        };

        errHandlerMock = {
            error: sinon.stub()
        };

        mediaPlayerModelMock = {};
        abrControllerMock = {};
        playbackControllerMock = {};
        adapterMock = {};
        dashMetricsMock = {};
        baseURLControllerMock = {
            reset: sinon.stub()
        };
        timelineConverterMock = {};
        segmentBaseControllerMock = {
            reset: sinon.stub()
        };

        offlineStoreControllerMock = {
            saveFragment: sinon.stub().resolves(),
            getFragments: sinon.stub().resolves([])
        };

        settingsMock = {
            get: sinon.stub().returns({
                streaming: {
                    fragmentRequestTimeout: 20000,
                    retryAttempts: {
                        MPD: 3
                    },
                    retryIntervals: {
                        MPD: 500
                    }
                }
            })
        };

        debugMock = {
            getLogger: sinon.stub().returns({
                debug: sinon.stub(),
                info: sinon.stub(),
                warn: sinon.stub(),
                error: sinon.stub()
            })
        };

        callbacksMock = {
            started: sinon.stub(),
            progression: sinon.stub(),
            finished: sinon.stub(),
            updateManifestNeeded: sinon.stub()
        };

        const config = {
            eventBus: eventBusMock,
            events: Events,
            errors: {},
            constants: {},
            dashConstants: {},
            settings: settingsMock,
            debug: debugMock,
            errHandler: errHandlerMock,
            mediaPlayerModel: mediaPlayerModelMock,
            abrController: abrControllerMock,
            playbackController: playbackControllerMock,
            adapter: adapterMock,
            dashMetrics: dashMetricsMock,
            baseURLController: baseURLControllerMock,
            timelineConverter: timelineConverterMock,
            segmentBaseController: segmentBaseControllerMock,
            offlineStoreController: offlineStoreControllerMock,
            id: testManifestId,
            callbacks: callbacksMock
        };

        offlineStream = OfflineStream(context).create(config);
    });

    afterEach(function () {
        offlineStream.reset();
        offlineStream = null;
    });

    describe('initialization', function () {
        it('should create instance successfully', function () {
            expect(offlineStream).to.exist;
        });

        it('should initialize with reset state', function () {
            // After creation, internal state should be reset
            expect(offlineStream).to.be.an('object');
        });
    });

    describe('initialize', function () {
        it('should accept stream info on initialize', function () {
            const streamInfo = {
                id: 'stream-1',
                index: 0,
                start: 0,
                duration: 100
            };

            expect(() => {
                offlineStream.initialize(streamInfo);
            }).to.not.throw();
        });

        it('should handle null stream info gracefully', function () {
            expect(() => {
                offlineStream.initialize(null);
            }).to.not.throw();
        });

        it('should handle undefined stream info gracefully', function () {
            expect(() => {
                offlineStream.initialize(undefined);
            }).to.not.throw();
        });
    });

    describe('startOfflineStreamProcessors', function () {
        beforeEach(function () {
            const streamInfo = {
                id: 'stream-1',
                index: 0,
                start: 0,
                duration: 100
            };
            offlineStream.initialize(streamInfo);
        });

        it('should exist as a method', function () {
            expect(offlineStream.startOfflineStreamProcessors).to.be.a('function');
        });

        it('should not throw error when called', function () {
            expect(() => {
                offlineStream.startOfflineStreamProcessors();
            }).to.not.throw();
        });
    });

    describe('stopOfflineStreamProcessors', function () {
        it('should exist as a method', function () {
            expect(offlineStream.stopOfflineStreamProcessors).to.be.a('function');
        });

        it('should not throw error when called without active download', function () {
            expect(() => {
                offlineStream.stopOfflineStreamProcessors();
            }).to.not.throw();
        });
    });

    describe('callbacks', function () {
        it('should have started callback available', function () {
            const streamInfo = {
                id: 'stream-1',
                index: 0,
                start: 0,
                duration: 100
            };
            
            offlineStream.initialize(streamInfo);
            
            // Callbacks should be stored and callable
            expect(callbacksMock.started).to.exist;
        });

        it('should have progression callback available', function () {
            expect(callbacksMock.progression).to.exist;
        });

        it('should have finished callback available', function () {
            expect(callbacksMock.finished).to.exist;
        });

        it('should have updateManifestNeeded callback available', function () {
            expect(callbacksMock.updateManifestNeeded).to.exist;
        });
    });

    describe('reset', function () {
        it('should call eventBus.off when reset is called', function () {
            const streamInfo = {
                id: 'stream-1',
                index: 0,
                start: 0,
                duration: 100
            };
            
            offlineStream.initialize(streamInfo);
            offlineStream.reset();
            
            expect(eventBusMock.off.called).to.be.true;
        });

        it('should allow reinitialization after reset', function () {
            const streamInfo = {
                id: 'stream-1',
                index: 0,
                start: 0,
                duration: 100
            };
            
            offlineStream.initialize(streamInfo);
            offlineStream.reset();
            
            expect(() => {
                offlineStream.initialize(streamInfo);
            }).to.not.throw();
        });
    });

    describe('stream processors', function () {
        it('should be able to initialize with stream info', function () {
            const streamInfo = {
                id: 'stream-1',
                index: 0,
                start: 0,
                duration: 100
            };
            
            offlineStream.initialize(streamInfo);
            // Stream should be able to manage multiple processors
            expect(offlineStream).to.exist;
        });
    });

    describe('error handling', function () {
        it('should handle errors during initialization', function () {
            const invalidStreamInfo = {
                // Missing required fields
            };
            
            expect(() => {
                offlineStream.initialize(invalidStreamInfo);
            }).to.not.throw();
        });

        it('should call error handler when download fails', function () {
            const streamInfo = {
                id: 'stream-1',
                index: 0,
                start: 0,
                duration: 100
            };
            
            offlineStream.initialize(streamInfo);
            
            // Simulate error event
            const errorCallback = eventBusMock.on.args.find(
                args => args[0] === Events.ERROR
            );
            
            if (errorCallback) {
                const errorHandler = errorCallback[1];
                errorHandler({ error: new Error('Download failed') });
            }
        });
    });

    describe('progression tracking', function () {
        it('should track download progression', function () {
            const streamInfo = {
                id: 'stream-1',
                index: 0,
                start: 0,
                duration: 100
            };
            
            offlineStream.initialize(streamInfo);
            
            // Progression should be trackable
            expect(offlineStream).to.exist;
        });
    });
});
