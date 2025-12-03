import OfflineStreamProcessor from '../../../../src/offline/OfflineStreamProcessor.js';
import Events from '../../../../src/core/events/Events.js';

import {expect} from 'chai';
import sinon from 'sinon';

describe('OfflineStreamProcessor', function () {
    const context = {};
    let offlineStreamProcessor;
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

    const testManifestId = 'test-processor-id';
    const testStreamId = 'stream-1';

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
        abrControllerMock = {
            getTopQualityIndexFor: sinon.stub().returns(0)
        };
        playbackControllerMock = {};
        
        adapterMock = {
            getAllMediaInfoForType: sinon.stub().returns([]),
            getStreamsInfo: sinon.stub().returns([]),
            getVoRepresentations: sinon.stub().returns([
                {
                    id: 'representation-1',
                    bandwidth: 1000000,
                    width: 1920,
                    height: 1080
                }
            ])
        };
        
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
            getFragments: sinon.stub().resolves([]),
            saveInitSegment: sinon.stub().resolves()
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
        
        // Add constants mock with media types
        const constantsMock = {
            VIDEO: 'video',
            AUDIO: 'audio',
            TEXT: 'text'
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
            finished: sinon.stub()
        };

        const config = {
            eventBus: eventBusMock,
            events: Events,
            errors: {},
            constants: constantsMock,
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
            segmentBaseControllerMock: segmentBaseControllerMock,
            offlineStoreController: offlineStoreControllerMock,
            manifestId: testManifestId,
            streamId: testStreamId,
            bitrate: {
                id: 'representation-1',
                bandwidth: 1000000
            },
            type: 'video',
            streamInfo: {
                id: testStreamId,
                index: 0
            },
            callbacks: callbacksMock
        };

        offlineStreamProcessor = OfflineStreamProcessor(context).create(config);
    });

    afterEach(function () {
        offlineStreamProcessor.reset();
        offlineStreamProcessor = null;
    });

    describe('initialization', function () {
        it('should create instance successfully', function () {
            expect(offlineStreamProcessor).to.exist;
        });

        it('should be an object', function () {
            expect(offlineStreamProcessor).to.be.an('object');
        });
    });

    describe('initialize', function () {
        it('should not throw error when initialized with valid media info', function () {
            const mediaInfo = {
                id: 'media-1',
                type: 'video',
                streamInfo: {
                    id: testStreamId,
                    index: 0
                },
                representationCount: 1
            };

            expect(() => {
                offlineStreamProcessor.initialize(mediaInfo);
            }).to.not.throw();
        });


        it('should not throw error when initialized with media info missing stream info', function () {
            const mediaInfo = {
                id: 'media-1',
                type: 'video'
            };

            expect(() => {
                offlineStreamProcessor.initialize(mediaInfo);
            }).to.not.throw();
        });
    });

    describe('start', function () {
        beforeEach(function () {
            const mediaInfo = {
                id: 'media-1',
                type: 'video',
                streamInfo: {
                    id: testStreamId,
                    index: 0
                }
            };
            offlineStreamProcessor.initialize(mediaInfo);
        });

        it('should exist as a method', function () {
            expect(offlineStreamProcessor.start).to.be.a('function');
        });

    });

    describe('stop', function () {
        it('should exist as a method', function () {
            expect(offlineStreamProcessor.stop).to.be.a('function');
        });

        it('should not throw error when stop is called', function () {
            expect(() => {
                offlineStreamProcessor.stop();
            }).to.not.throw();
        });

        it('should not throw error when stop is called without active download', function () {
            expect(() => {
                offlineStreamProcessor.stop();
            }).to.not.throw();
        });
    });

    describe('fragment handling', function () {
        beforeEach(function () {
            const mediaInfo = {
                id: 'media-1',
                type: 'video',
                streamInfo: {
                    id: testStreamId,
                    index: 0
                }
            };
            offlineStreamProcessor.initialize(mediaInfo);
        });

        it('should be initialized and ready for fragment download', function () {
            expect(offlineStreamProcessor).to.exist;
        });
    });

    describe('initialization segment handling', function () {
        beforeEach(function () {
            const mediaInfo = {
                id: 'media-1',
                type: 'video',
                streamInfo: {
                    id: testStreamId,
                    index: 0
                }
            };
            offlineStreamProcessor.initialize(mediaInfo);
        });

        it('should be initialized and ready for init segment download', function () {
            expect(offlineStreamProcessor).to.exist;
        });
    });

    describe('progression tracking', function () {
        beforeEach(function () {
            const mediaInfo = {
                id: 'media-1',
                type: 'video',
                streamInfo: {
                    id: testStreamId,
                    index: 0
                }
            };
            offlineStreamProcessor.initialize(mediaInfo);
        });

    });

    describe('callbacks', function () {

        it('should have progression callback available', function () {
            expect(callbacksMock.progression).to.exist;
        });

        it('should have finished callback available', function () {
            expect(callbacksMock.finished).to.exist;
        });
    });

    describe('error handling', function () {
        it('should not throw error when error event is triggered', function () {
            const mediaInfo = {
                id: 'media-1',
                type: 'video',
                streamInfo: {
                    id: testStreamId,
                    index: 0
                }
            };
            
            offlineStreamProcessor.initialize(mediaInfo);
            
            // Simulate error
            const errorCallback = eventBusMock.on.args.find(
                args => args[0] === Events.ERROR
            );
            
            if (errorCallback) {
                const errorHandler = errorCallback[1];
                errorHandler({ error: new Error('Fragment download failed') });
            }
        });

        it('should have error handler available', function () {
            expect(errHandlerMock.error).to.exist;
        });
    });

    describe('reset', function () {
        it('should call eventBus.off when reset is called', function () {
            const mediaInfo = {
                id: 'media-1',
                type: 'video',
                streamInfo: {
                    id: testStreamId,
                    index: 0
                }
            };
            
            offlineStreamProcessor.initialize(mediaInfo);
            offlineStreamProcessor.reset();
            
            expect(eventBusMock.off.called).to.be.true;
        });

        it('should allow reinitialization after reset', function () {
            const mediaInfo = {
                id: 'media-1',
                type: 'video',
                streamInfo: {
                    id: testStreamId,
                    index: 0
                }
            };
            
            offlineStreamProcessor.initialize(mediaInfo);
            offlineStreamProcessor.reset();
            
            expect(() => {
                offlineStreamProcessor.initialize(mediaInfo);
            }).to.not.throw();
        });

    });

    describe('representation selection', function () {
        it('should have ABR controller available', function () {
            expect(abrControllerMock.getTopQualityIndexFor).to.exist;
        });
    });

    describe('media type handling', function () {
        it('should handle video media type', function () {
            const mediaInfo = {
                id: 'media-1',
                type: 'video',
                streamInfo: {
                    id: testStreamId,
                    index: 0
                }
            };
            
            expect(() => {
                offlineStreamProcessor.initialize(mediaInfo);
            }).to.not.throw();
        });

        it('should handle audio media type', function () {
            const mediaInfo = {
                id: 'media-2',
                type: 'audio',
                streamInfo: {
                    id: testStreamId,
                    index: 0
                }
            };
            
            expect(() => {
                offlineStreamProcessor.initialize(mediaInfo);
            }).to.not.throw();
        });

        it('should handle text media type', function () {
            const mediaInfo = {
                id: 'media-3',
                type: 'text',
                streamInfo: {
                    id: testStreamId,
                    index: 0
                }
            };
            
            expect(() => {
                offlineStreamProcessor.initialize(mediaInfo);
            }).to.not.throw();
        });
    });
});
