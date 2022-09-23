import AdapterMock from './mocks/AdapterMock';

const ServiceDescriptionController = require('../../src/dash/controllers/ServiceDescriptionController');
const expect = require('chai').expect;

describe('ServiceDescriptionController', () => {

    let serviceDescriptionController,
        dummyStreamsInfo,
        dummyVoRep,
        dummyManifestInfo,
        adapterMock;

    before(() => {
        const context = {};
        dummyStreamsInfo = [{
            index: 0,
            start: 0
        }]
        dummyVoRep = {
            adaptation: {},
            presentationTimeOffset: 3,
            segmentDuration: 3.84,
            segmentInfoType: 'SegmentTemplate',
            timescale: 1000,
        };

        adapterMock = new AdapterMock();
        adapterMock.setRepresentation(dummyVoRep);
        serviceDescriptionController = ServiceDescriptionController(context).getInstance();

        serviceDescriptionController.setConfig({
            adapter: adapterMock
        });
    })

    beforeEach(() => {
        dummyManifestInfo = {
            serviceDescriptions: [{
                schemeIdUri: 'urn:dvb:dash:lowlatency:scope:2019',
                latency: {
                    target: 5000,
                    max: 8000,
                    min: 3000,
                    referenceId: 7 // Matches PRFT in AdapterMock
                },
                playbackRate: {
                    max: 1.4,
                    min: 0.5
                },
                operatingBandwidth: {
                    mediaType: 'video',
                    max: 9000000,
                    min: 1000000,
                    target: 5000000
                }
            }]
        }
        serviceDescriptionController.reset();
    })

    describe('calculateProducerReferenceTimeOffsets()', () => {
        it('Should not throw an error if no streamsInfo provided', () => {
            serviceDescriptionController.calculateProducerReferenceTimeOffsets([]);
            const prftTimeOffsets = serviceDescriptionController.getProducerReferenceTimeOffsets();
            expect(prftTimeOffsets).to.be.an('array').that.is.empty;
        });

        it('Should calculate expected prtf time offsets', () => {
            // Inner workings mostly covered in adapter tests
            serviceDescriptionController.calculateProducerReferenceTimeOffsets(dummyStreamsInfo);
            const prftTimeOffsets = serviceDescriptionController.getProducerReferenceTimeOffsets();
            expect(prftTimeOffsets).to.be.an('array');
            expect(prftTimeOffsets[0].id).to.equal(7);
            expect(prftTimeOffsets[0].to).to.equal(3);
        });
    });

    describe('applyServiceDescription()', () => {

        it('Should not throw an error if no manifestInfo provided', () => {
            serviceDescriptionController.applyServiceDescription({});
        })

        it('Should ignore all values if unsupported schemeIdUri is used', () => {
            dummyManifestInfo.serviceDescriptions[0].schemeIdUri = 'wrong_id';
            serviceDescriptionController.applyServiceDescription(dummyManifestInfo);

            const currentSettings = serviceDescriptionController.getServiceDescriptionSettings();
            expect(currentSettings.liveDelay).to.be.NaN;
            expect(currentSettings.liveCatchup.maxDrift).to.be.NaN;
            expect(currentSettings.liveCatchup.playbackRate).to.be.NaN;
            expect(currentSettings.minBitrate).to.be.empty;
            expect(currentSettings.maxBitrate).to.be.empty;
            expect(currentSettings.initialBitrate).to.be.empty;
        })

        it('Should use SD if no provided schemeIdUri', () => {
            delete dummyManifestInfo.serviceDescriptions[0].schemeIdUri;
            dummyManifestInfo.serviceDescriptions[0].latency.target = 8000;
            serviceDescriptionController.applyServiceDescription(dummyManifestInfo);
            const currentSettings = serviceDescriptionController.getServiceDescriptionSettings();
            expect(currentSettings.liveDelay).to.be.equal(8);
        })

        it('Should use supported scheme in preference if no provided schemeIdUri', () => {
            dummyManifestInfo.serviceDescriptions.push({
                latency: {
                    target: 10000,
                }
            });
            serviceDescriptionController.applyServiceDescription(dummyManifestInfo);
            const currentSettings = serviceDescriptionController.getServiceDescriptionSettings();
            expect(currentSettings.liveDelay).to.be.equal(5);
        })

        it('Should use ServiceDescription that appears last if multiple applicable ServiceDescriptions', () => {
            // Also ensures only parameters from a single ServiceDescription element are used
            dummyManifestInfo.serviceDescriptions.push({
                schemeIdUri: 'urn:dvb:dash:lowlatency:scope:2019',
                latency: {
                    target: 10000,
                }
            });
            serviceDescriptionController.applyServiceDescription(dummyManifestInfo);
            const currentSettings = serviceDescriptionController.getServiceDescriptionSettings();
            expect(currentSettings.liveDelay).to.be.equal(10);
            expect(currentSettings.liveCatchup.maxDrift).to.be.NaN;
            expect(currentSettings.liveCatchup.playbackRate).to.be.NaN;
            expect(currentSettings.minBitrate).to.be.empty;
            expect(currentSettings.maxBitrate).to.be.empty;
            expect(currentSettings.initialBitrate).to.be.empty;
        });

        it('Should not update the latency if target latency is equal to 0', () => {
            dummyManifestInfo.serviceDescriptions[0].latency.target = 0;
            delete dummyManifestInfo.serviceDescriptions[0].playbackRate;
            delete dummyManifestInfo.serviceDescriptions[0].operatingBandwidth;
            serviceDescriptionController.applyServiceDescription(dummyManifestInfo);

            const currentSettings = serviceDescriptionController.getServiceDescriptionSettings();
            expect(currentSettings.liveDelay).to.be.NaN;
            expect(currentSettings.liveCatchup.maxDrift).to.be.NaN;
        })

        it('Should update latency parameters using default mechanism when no schemeIdUri defined', () => {
            delete dummyManifestInfo.serviceDescriptions[0].schemeIdUri;
            delete dummyManifestInfo.serviceDescriptions[0].playbackRate;
            delete dummyManifestInfo.serviceDescriptions[0].operatingBandwidth;
            serviceDescriptionController.applyServiceDescription(dummyManifestInfo);

            const currentSettings = serviceDescriptionController.getServiceDescriptionSettings();
            expect(currentSettings.liveDelay).to.be.equal(5);
            expect(currentSettings.liveCatchup.maxDrift).to.be.equal(3.5);
        })

        it('Should update latency parameters using DVB mechanism when corresponding schemeIdUri set', () => {
            delete dummyManifestInfo.serviceDescriptions[0].playbackRate;
            delete dummyManifestInfo.serviceDescriptions[0].operatingBandwidth;
            serviceDescriptionController.applyServiceDescription(dummyManifestInfo);

            const currentSettings = serviceDescriptionController.getServiceDescriptionSettings();
            expect(currentSettings.liveDelay).to.be.equal(5);
            expect(currentSettings.liveCatchup.maxDrift).to.be.equal(3.5);
        })

        it('Should use default maxDrift if no max value is defined in the ServiceDescription', () => {
            delete dummyManifestInfo.serviceDescriptions[0].playbackRate;
            delete dummyManifestInfo.serviceDescriptions[0].operatingBandwidth;
            delete dummyManifestInfo.serviceDescriptions[0].latency.max;
            serviceDescriptionController.applyServiceDescription(dummyManifestInfo);

            const currentSettings = serviceDescriptionController.getServiceDescriptionSettings();
            expect(currentSettings.liveDelay).to.be.equal(5);
            expect(currentSettings.liveCatchup.maxDrift).to.be.NaN;
        })

        it('Should apply ProducerReferenceTime offsets to latency parameters defined in the ServiceDescription', () => {
            // N.B latency@min is not used
            serviceDescriptionController.calculateProducerReferenceTimeOffsets(dummyStreamsInfo);
            serviceDescriptionController.applyServiceDescription(dummyManifestInfo);
            const currentSettings = serviceDescriptionController.getServiceDescriptionSettings();
            expect(currentSettings.liveDelay).to.be.equal(2);
            expect(currentSettings.liveCatchup.maxDrift).to.be.equal(3.5);
        });

        it('Should update playback rates', () => {
            delete dummyManifestInfo.serviceDescriptions[0].latency;
            delete dummyManifestInfo.serviceDescriptions[0].operatingBandwidth;
            serviceDescriptionController.applyServiceDescription(dummyManifestInfo);

            const currentSettings = serviceDescriptionController.getServiceDescriptionSettings();
            expect(currentSettings.liveCatchup.playbackRate.max).to.be.equal(0.4);
            expect(currentSettings.liveCatchup.playbackRate.min).to.be.equal(-0.5);
        })

        it('Should set min playback rate to NaN if only max playback rate is provided', () => {
            delete dummyManifestInfo.serviceDescriptions[0].latency;
            delete dummyManifestInfo.serviceDescriptions[0].operatingBandwidth;
            delete dummyManifestInfo.serviceDescriptions[0].playbackRate.min;
            serviceDescriptionController.applyServiceDescription(dummyManifestInfo);

            const currentSettings = serviceDescriptionController.getServiceDescriptionSettings();
            expect(currentSettings.liveCatchup.playbackRate.max).to.be.equal(0.4);
            expect(currentSettings.liveCatchup.playbackRate.min).to.be.NaN;
        })

        it('Should set max playback rate to NaN if only min playback rate is provided', () => {
            delete dummyManifestInfo.serviceDescriptions[0].latency;
            delete dummyManifestInfo.serviceDescriptions[0].operatingBandwidth;
            delete dummyManifestInfo.serviceDescriptions[0].playbackRate.max;
            serviceDescriptionController.applyServiceDescription(dummyManifestInfo);

            const currentSettings = serviceDescriptionController.getServiceDescriptionSettings();
            expect(currentSettings.liveCatchup.playbackRate.max).to.be.NaN;
            expect(currentSettings.liveCatchup.playbackRate.min).to.be.equal(-0.5);
        })

        it('Should not update bandwidth parameters if unsupported mediaType is provided', () => {
            delete dummyManifestInfo.serviceDescriptions[0].playbackRate;
            delete dummyManifestInfo.serviceDescriptions[0].latency;
            dummyManifestInfo.serviceDescriptions[0].operatingBandwidth.mediaType = 'unsupported';
            serviceDescriptionController.applyServiceDescription(dummyManifestInfo);

            const currentSettings = serviceDescriptionController.getServiceDescriptionSettings();
            expect(currentSettings.minBitrate).to.be.empty;
            expect(currentSettings.maxBitrate).to.be.empty;
            expect(currentSettings.initialBitrate).to.be.empty;
        })

        it('Should update bandwidth parameters for video', () => {
            delete dummyManifestInfo.serviceDescriptions[0].playbackRate;
            delete dummyManifestInfo.serviceDescriptions[0].latency;
            serviceDescriptionController.applyServiceDescription(dummyManifestInfo);

            const currentSettings = serviceDescriptionController.getServiceDescriptionSettings();
            expect(currentSettings.minBitrate.video).to.be.equal(1000);
            expect(currentSettings.maxBitrate.video).to.be.equal(9000);
            expect(currentSettings.initialBitrate.video).to.be.equal(5000);
            expect(currentSettings.minBitrate.audio).to.be.undefined;
            expect(currentSettings.maxBitrate.audio).to.be.undefined;
            expect(currentSettings.initialBitrate.audio).to.be.undefined;
        })

        it('Should update bandwidth parameters for audio', () => {
            delete dummyManifestInfo.serviceDescriptions[0].playbackRate;
            delete dummyManifestInfo.serviceDescriptions[0].latency;
            dummyManifestInfo.serviceDescriptions[0].operatingBandwidth.mediaType = 'audio';
            serviceDescriptionController.applyServiceDescription(dummyManifestInfo);

            const currentSettings = serviceDescriptionController.getServiceDescriptionSettings();
            expect(currentSettings.minBitrate.video).to.be.undefined;
            expect(currentSettings.maxBitrate.video).to.be.undefined;
            expect(currentSettings.initialBitrate.video).to.be.undefined;
            expect(currentSettings.minBitrate.audio).to.be.equal(1000);
            expect(currentSettings.maxBitrate.audio).to.be.equal(9000);
            expect(currentSettings.initialBitrate.audio).to.be.equal(5000);
        })

        it('Should update bandwidth parameters for any', () => {
            delete dummyManifestInfo.serviceDescriptions[0].playbackRate;
            delete dummyManifestInfo.serviceDescriptions[0].latency;
            dummyManifestInfo.serviceDescriptions[0].operatingBandwidth.mediaType = 'any';
            serviceDescriptionController.applyServiceDescription(dummyManifestInfo);

            const currentSettings = serviceDescriptionController.getServiceDescriptionSettings();
            expect(currentSettings.minBitrate.video).to.be.equal(1000);
            expect(currentSettings.maxBitrate.video).to.be.equal(9000);
            expect(currentSettings.initialBitrate.video).to.be.equal(5000);
            expect(currentSettings.minBitrate.audio).to.be.equal(1000);
            expect(currentSettings.maxBitrate.audio).to.be.equal(9000);
            expect(currentSettings.initialBitrate.audio).to.be.equal(5000);
        })



        it('Should update all values if multiple elements are included in the ServiceDescription element', () => {
            dummyManifestInfo.serviceDescriptions[0].operatingBandwidth.mediaType = 'any';
            serviceDescriptionController.applyServiceDescription(dummyManifestInfo);

            const currentSettings = serviceDescriptionController.getServiceDescriptionSettings();
            expect(currentSettings.minBitrate.video).to.be.equal(1000);
            expect(currentSettings.maxBitrate.video).to.be.equal(9000);
            expect(currentSettings.initialBitrate.video).to.be.equal(5000);
            expect(currentSettings.minBitrate.audio).to.be.equal(1000);
            expect(currentSettings.maxBitrate.audio).to.be.equal(9000);
            expect(currentSettings.initialBitrate.audio).to.be.equal(5000);
            expect(currentSettings.liveDelay).to.be.equal(5);
            expect(currentSettings.liveCatchup.maxDrift).to.be.equal(3.5);
            expect(currentSettings.liveCatchup.playbackRate.max).to.be.equal(0.4);
            expect(currentSettings.liveCatchup.playbackRate.min).to.be.equal(-0.5);
        })


    })
})
