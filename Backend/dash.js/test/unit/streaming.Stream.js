import Stream from '../../src/streaming/Stream';
import Events from '../../src/core/events/Events';
import ProtectionEvents from '../../src/streaming/protection/ProtectionEvents';
import EventBus from '../../src/core/EventBus';
import DashJSError from '../../src/streaming/vo/DashJSError';
import ProtectionErrors from '../../src/streaming/protection/errors/ProtectionErrors';
import Constants from '../../src/streaming/constants/Constants';
import Errors from '../../src/core/errors/Errors';
import Settings from '../../src/core/Settings';

import AdapterMock from './mocks/AdapterMock';
import ManifestModelMock from './mocks/ManifestModelMock';
import ErrorHandlerMock from './mocks/ErrorHandlerMock';
import AbrControllerMock from './mocks/AbrControllerMock';
import StreamMock from './mocks/StreamMock';
import ManifestUpdaterMock from './mocks/ManifestUpdaterMock';
import PlaybackControllerMock from './mocks/PlaybackControllerMock';
import CapabilitiesMock from './mocks/CapabilitiesMock';
import MediaControllerMock from './mocks/MediaControllerMock';
import DashMetricsMock from './mocks/DashMetricsMock';
import TextControllerMock from './mocks/TextControllerMock';
import VideoModelMock from './mocks/VideoModelMock';
import ProtectionControllerMock from './mocks/ProtectionControllerMock';

import ObjectsHelper from './helpers/ObjectsHelper';

const expect = require('chai').expect;

const context = {};
const eventBus = EventBus(context).getInstance();
let stream;

describe('Stream', function () {
    let settings = Settings(context).getInstance();
    const objectsHelper = new ObjectsHelper();

    const adapterMock = new AdapterMock();
    const manifestModelMock = new ManifestModelMock();
    const errHandlerMock = new ErrorHandlerMock();
    const abrControllerMock = new AbrControllerMock();
    const manifestUpdaterMock = new ManifestUpdaterMock();
    const playbackControllerMock = new PlaybackControllerMock();
    const capabilitiesMock = new CapabilitiesMock();
    const mediaControllerMock = new MediaControllerMock();
    const dashMetricsMock = new DashMetricsMock();
    const textControllerMock = new TextControllerMock();
    const videoModelMock = new VideoModelMock();
    const protectionControllerMock = new ProtectionControllerMock();
    const timelineConverter = objectsHelper.getDummyTimelineConverter();
    const streamInfo = {
        id: 'id',
        index: 'index',
        manifestInfo: {
            isDynamic: false
        }
    };
    Events.extend(ProtectionEvents);

    describe('Well initialized', function () {
        beforeEach(function () {
            stream = Stream(context).create({
                streamInfo: streamInfo,
                errHandler: errHandlerMock,
                manifestModel: manifestModelMock,
                adapter: adapterMock,
                abrController: abrControllerMock,
                manifestUpdater: manifestUpdaterMock,
                playbackController: playbackControllerMock,
                capabilities: capabilitiesMock,
                mediaController: mediaControllerMock,
                timelineConverter: timelineConverter,
                dashMetrics: dashMetricsMock,
                textController: textControllerMock,
                protectionController: protectionControllerMock,
                videoModel: videoModelMock,
                settings: settings
            });
        });

        afterEach(function () {
            stream.reset();
        });

        it('should return false when isActive is called', () => {
            const isActive = stream.getIsActive();

            expect(isActive).to.be.false; // jshint ignore:line
        });

        it('should return an empty array when getProcessors is called but streamProcessors attribute is an empty array', () => {
            const processors = stream.getProcessors();

            expect(processors).to.be.instanceOf(Array); // jshint ignore:line
            expect(processors).to.be.empty; // jshint ignore:line
        });

        it('should trigger MANIFEST_ERROR_ID_NOSTREAMS_CODE error when setMediaSource is called but streamProcessors array is empty', () => {
            stream.setMediaSource();
            expect(errHandlerMock.errorCode).to.be.equal(Errors.MANIFEST_ERROR_ID_NOSTREAMS_CODE); // jshint ignore:line
        });

        it('should return an null when getId is called but streamInfo attribute is null or undefined', () => {
            stream.reset();
            const id = stream.getId();
            expect(id).to.be.null; // jshint ignore:line
        });

        it('should return an NaN when getStartTime is called but streamInfo attribute is null or undefined', () => {
            stream.reset();
            const startTime = stream.getStartTime();
            expect(startTime).to.be.NaN; // jshint ignore:line
        });

        it('should return an NaN when getDuration is called but streamInfo attribute is null or undefined', () => {
            stream.reset();
            const duration = stream.getDuration();
            expect(duration).to.be.NaN; // jshint ignore:line
        });

        it('should return null false isMediaCodecCompatible is called but stream attribute is undefined', () => {
            stream.reset();
            const isCompatible = stream.isMediaCodecCompatible();
            expect(isCompatible).to.be.false; // jshint ignore:line
        });

        it('should return false when isMediaCodecCompatible is called but stream attribute is an empty object', () => {
            stream.reset();
            const isCompatible = stream.isMediaCodecCompatible({});
            expect(isCompatible).to.be.false; // jshint ignore:line
        });

        it('should return false when isMediaCodecCompatible is called with a correct stream attribute', () => {
            stream.reset();
            const isCompatible = stream.isMediaCodecCompatible(new StreamMock());
            expect(isCompatible).to.be.false; // jshint ignore:line
        });

        it('should return true when isProtectionCompatible is called but new stream attribute is undefined', () => {
            stream.reset();
            const isCompatible = stream.isProtectionCompatible();
            expect(isCompatible).to.be.true; // jshint ignore:line
        });

        it('should return an empty array when getBitrateListFor is called but no stream processor is defined', () => {
            stream.reset();
            const bitrateList = stream.getBitrateListFor('');
            expect(bitrateList).to.be.instanceOf(Array); // jshint ignore:line
            expect(bitrateList).to.be.empty; // jshint ignore:line
        });

        it('should return an empty array when getBitrateListFor, for image type, is called but thumbnailController is not defined', () => {
            stream.reset();
            const bitrateList = stream.getBitrateListFor(Constants.IMAGE);
            expect(bitrateList).to.be.instanceOf(Array); // jshint ignore:line
            expect(bitrateList).to.be.empty; // jshint ignore:line
        });

        it('License expired behavior', function () {
            stream.initialize();

            eventBus.trigger(Events.KEY_STATUSES_CHANGED, {
                data: null,
                error: new DashJSError(ProtectionErrors.KEY_STATUS_CHANGED_EXPIRED_ERROR_CODE, ProtectionErrors.KEY_STATUS_CHANGED_EXPIRED_ERROR_MESSAGE)
            });

            expect(errHandlerMock.errorCode).to.be.equal(ProtectionErrors.KEY_STATUS_CHANGED_EXPIRED_ERROR_CODE); // jshint ignore:line
            expect(errHandlerMock.errorValue).to.be.equal(ProtectionErrors.KEY_STATUS_CHANGED_EXPIRED_ERROR_MESSAGE); // jshint ignore:line
        });

        it('No Licenser server url defined behavior', function () {
            stream.initialize();

            eventBus.trigger(Events.LICENSE_REQUEST_COMPLETE, {
                data: null,
                error: new DashJSError(ProtectionErrors.MEDIA_KEY_MESSAGE_NO_LICENSE_SERVER_URL_ERROR_CODE, ProtectionErrors.MEDIA_KEY_MESSAGE_NO_LICENSE_SERVER_URL_ERROR_MESSAGE)
            });

            expect(errHandlerMock.errorCode).to.be.equal(ProtectionErrors.MEDIA_KEY_MESSAGE_NO_LICENSE_SERVER_URL_ERROR_CODE); // jshint ignore:line
            expect(errHandlerMock.errorValue).to.be.equal(ProtectionErrors.MEDIA_KEY_MESSAGE_NO_LICENSE_SERVER_URL_ERROR_MESSAGE); // jshint ignore:line
        });

        it('Licenser request error behavior', function () {
            stream.initialize();

            eventBus.trigger(Events.LICENSE_REQUEST_COMPLETE, {
                data: null,
                error: new DashJSError(ProtectionErrors.MEDIA_KEY_MESSAGE_LICENSER_ERROR_CODE, ProtectionErrors.MEDIA_KEY_MESSAGE_LICENSER_ERROR_MESSAGE)
            });

            expect(errHandlerMock.errorCode).to.be.equal(ProtectionErrors.MEDIA_KEY_MESSAGE_LICENSER_ERROR_CODE); // jshint ignore:line
            expect(errHandlerMock.errorValue).to.be.equal(ProtectionErrors.MEDIA_KEY_MESSAGE_LICENSER_ERROR_MESSAGE); // jshint ignore:line
        });

        it('CDM Access denied behavior', function () {
            stream.initialize();

            eventBus.trigger(Events.KEY_SYSTEM_SELECTED, {
                data: null,
                error: new DashJSError(ProtectionErrors.KEY_SYSTEM_ACCESS_DENIED_ERROR_CODE, ProtectionErrors.KEY_SYSTEM_ACCESS_DENIED_ERROR_MESSAGE)
            });

            expect(errHandlerMock.errorCode).to.be.equal(ProtectionErrors.KEY_SYSTEM_ACCESS_DENIED_ERROR_CODE); // jshint ignore:line
            expect(errHandlerMock.errorValue).to.be.equal(ProtectionErrors.KEY_SYSTEM_ACCESS_DENIED_ERROR_MESSAGE); // jshint ignore:line
        });

        it('Unable to create key session behavior', function () {
            stream.initialize();

            eventBus.trigger(Events.KEY_SESSION_CREATED, {
                data: null,
                error: new DashJSError(ProtectionErrors.KEY_SESSION_CREATED_ERROR_CODE, ProtectionErrors.KEY_SESSION_CREATED_ERROR_MESSAGE)
            });

            expect(errHandlerMock.errorCode).to.be.equal(ProtectionErrors.KEY_SESSION_CREATED_ERROR_CODE); // jshint ignore:line
            expect(errHandlerMock.errorValue).to.be.equal(ProtectionErrors.KEY_SESSION_CREATED_ERROR_MESSAGE); // jshint ignore:line
        });

        it('should return preloaded to true after a call to preload without parameters', (done) => {
            stream.initialize();

            let isPreloaded = stream.getPreloaded();

            expect(isPreloaded).to.be.false; // jshint ignore:line

            stream.startPreloading()
                .then(() => {
                    isPreloaded = stream.getPreloaded();
                    expect(isPreloaded).to.be.true; // jshint ignore:line
                    done();
                })
                .catch((e) => {
                    done(e);
                });
        });

        it('should return undefined when getThumbnailController is called without a call to initializeMediaForType', () => {
            stream.initialize();

            const thumbnailController = stream.getThumbnailController();

            expect(thumbnailController).to.be.undefined; // jshint ignore:line
        });
    });
});
