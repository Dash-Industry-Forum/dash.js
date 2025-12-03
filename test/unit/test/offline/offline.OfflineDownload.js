import OfflineDownload from '../../../../src/offline/OfflineDownload.js';
import OfflineConstants from '../../../../src/offline/constants/OfflineConstants.js';
import OfflineErrors from '../../../../src/offline/errors/OfflineErrors.js';
import Events from '../../../../src/core/events/Events.js';
import OfflineEvents from '../../../../src/offline/events/OfflineEvents.js';

import {expect} from 'chai';
import sinon from 'sinon';

describe('OfflineDownload', function () {
    const context = {};
    let offlineDownload;
    let manifestLoaderMock;
    let mediaPlayerModelMock;
    let abrControllerMock;
    let playbackControllerMock;
    let adapterMock;
    let dashMetricsMock;
    let timelineConverterMock;
    let offlineStoreControllerMock;
    let eventBusMock;
    let errHandlerMock;
    let settingsMock;
    let debugMock;
    let manifestUpdaterMock;
    let baseURLControllerMock;
    let segmentBaseControllerMock;
    let urlUtilsMock;

    const testManifestId = 'test-manifest-id';
    const testUrl = 'http://example.com/manifest.mpd';

    beforeEach(function () {
        // Create mocks
        manifestLoaderMock = {
            load: sinon.stub()
        };

        mediaPlayerModelMock = {};
        abrControllerMock = {};
        playbackControllerMock = {};
        adapterMock = {};
        dashMetricsMock = {};
        timelineConverterMock = {};

        offlineStoreControllerMock = {
            setDownloadingStatus: sinon.stub().resolves(),
            saveManifest: sinon.stub().resolves(),
            deleteFragmentStore: sinon.stub().resolves(),
            createOfflineManifest: sinon.stub().resolves(),
            getManifestById: sinon.stub().resolves({ progress: 0, status: 'created' })
        };

        eventBusMock = {
            on: sinon.stub(),
            off: sinon.stub(),
            trigger: sinon.stub()
        };

        errHandlerMock = {
            error: sinon.stub()
        };

        settingsMock = {
            get: sinon.stub()
        };

        debugMock = {
            getLogger: sinon.stub().returns({
                debug: sinon.stub(),
                info: sinon.stub(),
                warn: sinon.stub(),
                error: sinon.stub()
            })
        };

        manifestUpdaterMock = {
            initialize: sinon.stub(),
            reset: sinon.stub()
        };

        baseURLControllerMock = {
            reset: sinon.stub()
        };
        segmentBaseControllerMock = {};
        urlUtilsMock = {};

        const config = {
            manifestLoader: manifestLoaderMock,
            mediaPlayerModel: mediaPlayerModelMock,
            abrController: abrControllerMock,
            playbackController: playbackControllerMock,
            adapter: adapterMock,
            dashMetrics: dashMetricsMock,
            timelineConverter: timelineConverterMock,
            offlineStoreController: offlineStoreControllerMock,
            id: testManifestId,
            eventBus: eventBusMock,
            errHandler: errHandlerMock,
            events: Events,
            errors: {},
            settings: settingsMock,
            debug: debugMock,
            manifestUpdater: manifestUpdaterMock,
            baseURLController: baseURLControllerMock,
            segmentBaseController: segmentBaseControllerMock,
            constants: {},
            dashConstants: {},
            urlUtils: urlUtilsMock
        };

        offlineDownload = OfflineDownload(context).create(config);
    });

    afterEach(function () {
        offlineDownload.reset();
        offlineDownload = null;
    });

    describe('initialization', function () {
        it('should initialize with correct manifest ID', function () {
            expect(offlineDownload.getId()).to.equal(testManifestId);
        });

        it('should call manifestUpdater.initialize on setup', function () {
            expect(manifestUpdaterMock.initialize.calledOnce).to.be.true;
        });

        it('should return undefined status initially', function () {
            expect(offlineDownload.getStatus()).to.be.undefined;
        });

        it('should not be downloading initially', function () {
            expect(offlineDownload.isDownloading()).to.be.false;
        });
    });

    describe('downloadFromUrl', function () {
        it('should set manifest URL when downloadFromUrl is called', function () {
            offlineDownload.downloadFromUrl(testUrl);
            expect(offlineDownload.getManifestUrl()).to.equal(testUrl);
        });

        it('should generate offline URL with correct scheme', function () {
            offlineDownload.downloadFromUrl(testUrl);
            const offlineUrl = offlineDownload.getOfflineUrl();
            expect(offlineUrl).to.equal(`${OfflineConstants.OFFLINE_SCHEME}://${testManifestId}`);
        });

        it('should set status to CREATED when download starts', function () {
            offlineDownload.downloadFromUrl(testUrl);
            expect(offlineDownload.getStatus()).to.equal(OfflineConstants.OFFLINE_STATUS_CREATED);
        });

        it('should setup event listeners when downloadFromUrl is called', function () {
            offlineDownload.downloadFromUrl(testUrl);
            expect(eventBusMock.on.called).to.be.true;
        });

        it('should return a promise when downloadFromUrl is called', function () {
            const result = offlineDownload.downloadFromUrl(testUrl);
            expect(result).to.be.an.instanceof(Promise);
        });
    });

    describe('initDownload', function () {
        beforeEach(function () {
            offlineDownload.downloadFromUrl(testUrl);
        });

        it('should call manifestLoader.load with correct URL', function () {
            offlineDownload.initDownload();
            expect(manifestLoaderMock.load.calledWith(testUrl)).to.be.true;
        });

        it('should set downloading status to true', function () {
            offlineDownload.initDownload();
            expect(offlineDownload.isDownloading()).to.be.true;
        });
    });

    describe('setInitialState', function () {
        it('should restore state from saved data', function () {
            const savedState = {
                url: 'offline_indexeddb://saved-id',
                progress: 0.5,
                originalUrl: 'http://example.com/saved.mpd',
                status: OfflineConstants.OFFLINE_STATUS_STARTED
            };

            offlineDownload.setInitialState(savedState);

            expect(offlineDownload.getOfflineUrl()).to.equal(savedState.url);
            expect(offlineDownload.getManifestUrl()).to.equal(savedState.originalUrl);
            expect(offlineDownload.getStatus()).to.equal(savedState.status);
        });
    });

    describe('status management', function () {
        it('should return current status', function () {
            offlineDownload.downloadFromUrl(testUrl);
            const status = offlineDownload.getStatus();
            expect(status).to.be.a('string');
        });

        it('should handle CREATED status', function () {
            offlineDownload.downloadFromUrl(testUrl);
            expect(offlineDownload.getStatus()).to.equal(OfflineConstants.OFFLINE_STATUS_CREATED);
        });
    });

    describe('error handling', function () {
        it('should have error handler available', function () {
            expect(errHandlerMock.error).to.exist;
        });
    });

    describe('reset', function () {
        it('should not throw error when reset is called', function () {
            offlineDownload.downloadFromUrl(testUrl);
            
            expect(() => {
                offlineDownload.reset();
            }).to.not.throw();
        });

        it('should set downloading status to false after reset', function () {
            offlineDownload.downloadFromUrl(testUrl);
            offlineDownload.initDownload();
            offlineDownload.reset();
            
            expect(offlineDownload.isDownloading()).to.be.false;
        });
    });

    describe('getters', function () {
        it('should return manifest ID via getId', function () {
            expect(offlineDownload.getId()).to.equal(testManifestId);
        });

        it('should return offline URL via getOfflineUrl', function () {
            offlineDownload.downloadFromUrl(testUrl);
            const url = offlineDownload.getOfflineUrl();
            expect(url).to.include(OfflineConstants.OFFLINE_SCHEME);
        });

        it('should return manifest URL via getManifestUrl', function () {
            offlineDownload.downloadFromUrl(testUrl);
            expect(offlineDownload.getManifestUrl()).to.equal(testUrl);
        });
    });
});
