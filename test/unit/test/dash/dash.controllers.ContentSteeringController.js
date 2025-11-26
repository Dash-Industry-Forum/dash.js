import ContentSteeringController from '../../../../src/dash/controllers/ContentSteeringController.js';
import EventBus from '../../../../src/core/EventBus.js';
import MediaPlayerEvents from '../../../../src/streaming/MediaPlayerEvents.js';
import DashConstants from '../../../../src/dash/constants/DashConstants.js';
import SchemeLoaderFactory from '../../../../src/streaming/net/SchemeLoaderFactory.js';

import AdapterMock from '../../mocks/AdapterMock.js';
import DashMetricsMock from '../../mocks/DashMetricsMock.js';
import ErrorHandlerMock from '../../mocks/ErrorHandlerMock.js';
import MediaPlayerModelMock from '../../mocks/MediaPlayerModelMock.js';
import ManifestModelMock from '../../mocks/ManifestModelMock.js';
import ServiceDescriptionControllerMock from '../../mocks/ServiceDescriptionControllerMock.js';
import ThroughputControllerMock from '../../mocks/ThroughputControllerMock.js';

import chai from 'chai';
import sinon from 'sinon';

const expect = chai.expect;

const context = {};
const eventBus = EventBus(context).getInstance();

describe('ContentSteeringController', function () {
    let contentSteeringController;
    let adapterMock;
    let dashMetricsMock;
    let errorHandlerMock;
    let mediaPlayerModelMock;
    let manifestModelMock;
    let serviceDescriptionControllerMock;
    let throughputControllerMock;

    beforeEach(function () {
        adapterMock = new AdapterMock();
        dashMetricsMock = new DashMetricsMock();
        errorHandlerMock = new ErrorHandlerMock();
        mediaPlayerModelMock = new MediaPlayerModelMock();
        manifestModelMock = new ManifestModelMock();
        serviceDescriptionControllerMock = new ServiceDescriptionControllerMock();
        throughputControllerMock = new ThroughputControllerMock();

        contentSteeringController = ContentSteeringController(context).getInstance();
        contentSteeringController.setConfig({
            adapter: adapterMock,
            errHandler: errorHandlerMock,
            dashMetrics: dashMetricsMock,
            mediaPlayerModel: mediaPlayerModelMock,
            manifestModel: manifestModelMock,
            serviceDescriptionController: serviceDescriptionControllerMock,
            throughputController: throughputControllerMock,
            eventBus: eventBus
        });
    });

    afterEach(function () {
        contentSteeringController.reset();
        contentSteeringController = null;
    });

    describe('Method initialize', function () {
        it('should initialize the controller', function () {
            contentSteeringController.initialize();
        });
    });

    describe('Method setConfig', function () {
        it('should update config with provided settings', function () {
            const newAdapter = new AdapterMock();
            contentSteeringController.setConfig({
                adapter: newAdapter
            });
        });

        it('should handle null config', function () {
            contentSteeringController.setConfig(null);
        });

        it('should handle empty config', function () {
            contentSteeringController.setConfig({});
        });
    });

    describe('Method reset', function () {
        it('should reset the controller', function () {
            contentSteeringController.initialize();
            contentSteeringController.reset();
        });
    });

    describe('Method getSteeringDataFromManifest', function () {
        it('should return steering data from adapter', function () {
            const steeringData = {
                serverUrl: 'https://steering.example.com',
                queryBeforeStart: true
            };
            manifestModelMock.getValue = sinon.stub().returns({});
            adapterMock.getContentSteering = sinon.stub().returns(steeringData);

            const result = contentSteeringController.getSteeringDataFromManifest();

            expect(result).to.deep.equal(steeringData);
        });

        it('should return steering data from service description when adapter returns null', function () {
            const steeringData = {
                serverUrl: 'https://steering.example.com',
                queryBeforeStart: false
            };
            manifestModelMock.getValue = sinon.stub().returns({});
            adapterMock.getContentSteering = sinon.stub().returns(null);
            serviceDescriptionControllerMock.getServiceDescriptionSettings = sinon.stub().returns({
                contentSteering: steeringData
            });

            const result = contentSteeringController.getSteeringDataFromManifest();

            expect(result).to.deep.equal(steeringData);
        });
    });

    describe('Method shouldQueryBeforeStart', function () {
        it('should return true when queryBeforeStart is true', function () {
            const steeringData = {
                serverUrl: 'https://steering.example.com',
                queryBeforeStart: true
            };
            manifestModelMock.getValue = sinon.stub().returns({});
            adapterMock.getContentSteering = sinon.stub().returns(steeringData);

            const result = contentSteeringController.shouldQueryBeforeStart();

            expect(result).to.be.true;
        });

        it('should return false when queryBeforeStart is false', function () {
            const steeringData = {
                serverUrl: 'https://steering.example.com',
                queryBeforeStart: false
            };
            manifestModelMock.getValue = sinon.stub().returns({});
            adapterMock.getContentSteering = sinon.stub().returns(steeringData);

            const result = contentSteeringController.shouldQueryBeforeStart();

            expect(result).to.be.false;
        });

        it('should return false when no steering data exists', function () {
            manifestModelMock.getValue = sinon.stub().returns({});
            adapterMock.getContentSteering = sinon.stub().returns(null);
            serviceDescriptionControllerMock.getServiceDescriptionSettings = sinon.stub().returns({});

            const result = contentSteeringController.shouldQueryBeforeStart();

            expect(result).to.be.false;
        });
    });

    describe('Method getCurrentSteeringResponseData', function () {
        it('should return null initially', function () {
            const result = contentSteeringController.getCurrentSteeringResponseData();

            expect(result).to.be.null;
        });
    });

    describe('Method stopSteeringRequestTimer', function () {
        it('should stop the steering request timer', function () {
            contentSteeringController.stopSteeringRequestTimer();
        });
    });

    describe('Method getSynthesizedBaseUrlElements', function () {
        it('should return empty array when no reference elements', function () {
            const result = contentSteeringController.getSynthesizedBaseUrlElements([]);

            expect(result).to.be.an('array').that.is.empty;
        });

        it('should return empty array when no steering response data', function () {
            const referenceElements = [
                { url: 'https://example.com/path', serviceLocation: 'cdn1' }
            ];

            const result = contentSteeringController.getSynthesizedBaseUrlElements(referenceElements);

            expect(result).to.be.an('array').that.is.empty;
        });

        it('should return synthesized elements when steering response data is present', async function () {
            const referenceElements = [
                {
                    url: 'https://example.com/path',
                    serviceLocation: 'cdn1',
                    dvbPriority: 1,
                    dvbWeight: 2,
                    availabilityTimeOffset: 0,
                    availabilityTimeComplete: true
                }
            ];

            const mockLoaderInstance = {
                load: ({ success, complete }) => {
                    const responseData = {};
                    responseData[DashConstants.CONTENT_STEERING_RESPONSE.VERSION] = '1';
                    responseData[DashConstants.CONTENT_STEERING_RESPONSE.PATHWAY_CLONES] = [
                        {
                            [DashConstants.CONTENT_STEERING_RESPONSE.BASE_ID]: 'cdn1',
                            [DashConstants.CONTENT_STEERING_RESPONSE.ID]: 'clone1',
                            [DashConstants.CONTENT_STEERING_RESPONSE.URI_REPLACEMENT]: {
                                [DashConstants.CONTENT_STEERING_RESPONSE.HOST]: 'clone.example.com',
                                [DashConstants.CONTENT_STEERING_RESPONSE.PARAMS]: { foo: 'bar' }
                            }
                        }
                    ];

                    success(responseData);
                    if (typeof complete === 'function') {
                        complete();
                    }
                },
                abort: () => {},
                reset: () => {},
                resetInitialSettings: () => {}
            };

            function MockLoader() {
                return {
                    create: () => mockLoaderInstance
                };
            }

            const schemeLoaderFactory = SchemeLoaderFactory(context).getInstance();

            schemeLoaderFactory.registerLoader('https://', MockLoader);

            manifestModelMock.getValue = sinon.stub().returns({});
            adapterMock.getContentSteering = sinon.stub().returns({
                serverUrl: 'https://steering.example.com',
                queryBeforeStart: true
            });

            contentSteeringController.initialize();

            try {
                await contentSteeringController.loadSteeringData();
                const result = contentSteeringController.getSynthesizedBaseUrlElements(referenceElements);

                expect(result).to.be.an('array').that.is.not.empty;
                const synthesized = result[0];

                expect(synthesized.url).to.equal('https://clone.example.com/path');
                expect(synthesized.serviceLocation).to.equal('clone1');
                expect(synthesized.queryParams).to.deep.equal({ foo: 'bar' });
                expect(synthesized.dvbPriority).to.equal(1);
                expect(synthesized.dvbWeight).to.equal(2);
                expect(synthesized.availabilityTimeOffset).to.equal(0);
                expect(synthesized.availabilityTimeComplete).to.be.true;
            } finally {
                schemeLoaderFactory.unregisterLoader('https://');
            }
        });
    });

    describe('Method getSynthesizedLocationElements', function () {
        it('should return empty array when no reference elements', function () {
            const result = contentSteeringController.getSynthesizedLocationElements([]);

            expect(result).to.be.an('array').that.is.empty;
        });

        it('should return empty array when no steering response data', function () {
            const referenceElements = [
                { url: 'https://example.com/manifest.mpd', serviceLocation: 'cdn1' }
            ];

            const result = contentSteeringController.getSynthesizedLocationElements(referenceElements);

            expect(result).to.be.an('array').that.is.empty;
        });
    });

    describe('Event handling', function () {
        beforeEach(function () {
            contentSteeringController.initialize();
        });

        it('should handle FRAGMENT_LOADING_STARTED event', function () {
            eventBus.trigger(MediaPlayerEvents.FRAGMENT_LOADING_STARTED, {
                request: {
                    serviceLocation: 'cdn1'
                }
            });
        });

        it('should handle MANIFEST_LOADING_STARTED event', function () {
            eventBus.trigger(MediaPlayerEvents.MANIFEST_LOADING_STARTED, {
                request: {
                    serviceLocation: 'cdn1'
                }
            });
        });

        it('should handle THROUGHPUT_MEASUREMENT_STORED event', function () {
            eventBus.trigger(MediaPlayerEvents.THROUGHPUT_MEASUREMENT_STORED, {
                throughputValues: {
                    serviceLocation: 'cdn1',
                    value: 5000
                }
            });
        });

        it('should ignore THROUGHPUT_MEASUREMENT_STORED event without serviceLocation', function () {
            eventBus.trigger(MediaPlayerEvents.THROUGHPUT_MEASUREMENT_STORED, {
                throughputValues: {
                    value: 5000
                }
            });
        });

        it('should ignore THROUGHPUT_MEASUREMENT_STORED event without throughputValues', function () {
            eventBus.trigger(MediaPlayerEvents.THROUGHPUT_MEASUREMENT_STORED, {});
        });

        it('should handle FRAGMENT_LOADING_STARTED event without request', function () {
            eventBus.trigger(MediaPlayerEvents.FRAGMENT_LOADING_STARTED, {});
        });

        it('should handle MANIFEST_LOADING_STARTED event without request', function () {
            eventBus.trigger(MediaPlayerEvents.MANIFEST_LOADING_STARTED, {});
        });
    });

    describe('Method loadSteeringData', function () {
        it('should resolve immediately when no steering data in manifest', async function () {
            manifestModelMock.getValue = sinon.stub().returns({});
            adapterMock.getContentSteering = sinon.stub().returns(null);
            serviceDescriptionControllerMock.getServiceDescriptionSettings = sinon.stub().returns({});

            contentSteeringController.initialize();
            await contentSteeringController.loadSteeringData();
        });

        it('should resolve immediately when no server URL', async function () {
            manifestModelMock.getValue = sinon.stub().returns({});
            adapterMock.getContentSteering = sinon.stub().returns({
                queryBeforeStart: true
            });

            contentSteeringController.initialize();
            await contentSteeringController.loadSteeringData();
        });
    });

    describe('Service location tracking', function () {
        beforeEach(function () {
            contentSteeringController.initialize();
        });

        it('should track service locations from fragment loading', function () {
            eventBus.trigger(MediaPlayerEvents.FRAGMENT_LOADING_STARTED, {
                request: {
                    serviceLocation: 'cdn1'
                }
            });

            eventBus.trigger(MediaPlayerEvents.FRAGMENT_LOADING_STARTED, {
                request: {
                    serviceLocation: 'cdn2'
                }
            });
        });

        it('should track service locations from manifest loading', function () {
            eventBus.trigger(MediaPlayerEvents.MANIFEST_LOADING_STARTED, {
                request: {
                    serviceLocation: 'cdn1'
                }
            });

            eventBus.trigger(MediaPlayerEvents.MANIFEST_LOADING_STARTED, {
                request: {
                    serviceLocation: 'cdn2'
                }
            });
        });

        it('should not duplicate service locations', function () {
            eventBus.trigger(MediaPlayerEvents.FRAGMENT_LOADING_STARTED, {
                request: {
                    serviceLocation: 'cdn1'
                }
            });

            eventBus.trigger(MediaPlayerEvents.FRAGMENT_LOADING_STARTED, {
                request: {
                    serviceLocation: 'cdn1'
                }
            });
        });
    });

    describe('Throughput tracking', function () {
        beforeEach(function () {
            contentSteeringController.initialize();
        });

        it('should store throughput measurements for service locations', function () {
            eventBus.trigger(MediaPlayerEvents.THROUGHPUT_MEASUREMENT_STORED, {
                throughputValues: {
                    serviceLocation: 'cdn1',
                    value: 5000
                }
            });

            eventBus.trigger(MediaPlayerEvents.THROUGHPUT_MEASUREMENT_STORED, {
                throughputValues: {
                    serviceLocation: 'cdn1',
                    value: 6000
                }
            });
        });

        it('should store throughput for multiple service locations', function () {
            eventBus.trigger(MediaPlayerEvents.THROUGHPUT_MEASUREMENT_STORED, {
                throughputValues: {
                    serviceLocation: 'cdn1',
                    value: 5000
                }
            });

            eventBus.trigger(MediaPlayerEvents.THROUGHPUT_MEASUREMENT_STORED, {
                throughputValues: {
                    serviceLocation: 'cdn2',
                    value: 7000
                }
            });
        });
    });
});
