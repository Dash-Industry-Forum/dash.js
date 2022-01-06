const ServiceDescriptionController = require('../../src/streaming/controllers/ServiceDescriptionController');
const Settings = require('../../src/core/Settings');
const expect = require('chai').expect;

describe('ServiceDescriptionController', () => {

    let serviceDescriptionController;
    let settings;
    let dummyManifestInfo;
    let referenceSettings;

    before(() => {
        const context = {};

        serviceDescriptionController = ServiceDescriptionController(context).getInstance();
        settings = Settings(context).getInstance();
        serviceDescriptionController.setConfig({ settings });
        const currentSettings = settings.get();
        referenceSettings = {
            liveDelay: currentSettings.streaming.delay.liveDelay,
            playbackRate: currentSettings.streaming.liveCatchup.playbackRate,
            minBitrate: currentSettings.streaming.abr.minBitrate,
            maxBitrate: currentSettings.streaming.abr.maxBitrate,
            initialBitrate: currentSettings.streaming.abr.initialBitrate,
            minDrift: currentSettings.streaming.liveCatchup.minDrift,
            maxDrift: currentSettings.streaming.liveCatchup.maxDrift
        }
    })

    beforeEach(() => {
        settings.reset();
        dummyManifestInfo = {
            serviceDescriptions: [{
                schemeIdUri: 'urn:dvb:dash:lowlatency:scope:2019',
                latency: {
                    target: 5000,
                    max: 8000,
                    min: 3000
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
    })

    describe('applyServiceDescription()', () => {

        it('Should not throw an error if no manifestInfo provided', () => {
            serviceDescriptionController.applyServiceDescription({});
        })

        it('Should ignore all values if unsupported schemeIdUri is used', () => {
            dummyManifestInfo.serviceDescriptions[0].schemeIdUri = 'wrong_id';
            serviceDescriptionController.applyServiceDescription(dummyManifestInfo);

            const currentSettings = settings.get();
            expect(currentSettings.streaming.delay.liveDelay).to.be.NaN;
            expect(currentSettings.streaming.liveCatchup.minDrift).to.be.equal(referenceSettings.minDrift);
            expect(currentSettings.streaming.liveCatchup.maxDrift).to.be.equal(referenceSettings.maxDrift);
            expect(currentSettings.streaming.liveCatchup.playbackRate).to.be.equal(referenceSettings.playbackRate);
            expect(currentSettings.streaming.abr.minBitrate.video).to.be.equal(referenceSettings.minBitrate.video);
            expect(currentSettings.streaming.abr.maxBitrate.video).to.be.equal(referenceSettings.maxBitrate.video);
            expect(currentSettings.streaming.abr.initialBitrate.video).to.be.equal(referenceSettings.initialBitrate.video);
        })

        it('Should not update the latency if target latency is equal to 0', () => {
            dummyManifestInfo.serviceDescriptions[0].latency.target = 0;
            delete dummyManifestInfo.serviceDescriptions[0].playbackRate;
            delete dummyManifestInfo.serviceDescriptions[0].operatingBandwidth;
            serviceDescriptionController.applyServiceDescription(dummyManifestInfo);

            const currentSettings = settings.get();
            expect(currentSettings.streaming.delay.liveDelay).to.be.NaN;
            expect(currentSettings.streaming.liveCatchup.minDrift).to.be.equal(referenceSettings.minDrift);
            expect(currentSettings.streaming.liveCatchup.maxDrift).to.be.equal(referenceSettings.maxDrift);
        })

        it('Should update latency parameters using default mechanism when no schemeIdUri defined', () => {
            delete dummyManifestInfo.serviceDescriptions[0].schemeIdUri;
            delete dummyManifestInfo.serviceDescriptions[0].playbackRate;
            delete dummyManifestInfo.serviceDescriptions[0].operatingBandwidth;
            serviceDescriptionController.applyServiceDescription(dummyManifestInfo);

            const currentSettings = settings.get();
            expect(currentSettings.streaming.delay.liveDelay).to.be.equal(5);
            expect(currentSettings.streaming.liveCatchup.minDrift).to.be.equal(3);
            expect(currentSettings.streaming.liveCatchup.maxDrift).to.be.equal(3.5);
        })

        it('Should update latency parameters using DVB mechanism when corresponding schemeIdUri set', () => {
            delete dummyManifestInfo.serviceDescriptions[0].playbackRate;
            delete dummyManifestInfo.serviceDescriptions[0].operatingBandwidth;
            serviceDescriptionController.applyServiceDescription(dummyManifestInfo);

            const currentSettings = settings.get();
            expect(currentSettings.streaming.delay.liveDelay).to.be.equal(5);
            expect(currentSettings.streaming.liveCatchup.minDrift).to.be.equal(0.5);
            expect(currentSettings.streaming.liveCatchup.maxDrift).to.be.equal(3.5);
        })

        it('Should not update playback rate if max value is below 1', () => {
            delete dummyManifestInfo.serviceDescriptions[0].latency;
            delete dummyManifestInfo.serviceDescriptions[0].operatingBandwidth;
            dummyManifestInfo.serviceDescriptions[0].playbackRate.max = 0.5;
            serviceDescriptionController.applyServiceDescription(dummyManifestInfo);

            const currentSettings = settings.get();
            expect(currentSettings.streaming.liveCatchup.playbackRate).to.be.equal(referenceSettings.playbackRate);
        })

        it('Should update playback rate', () => {
            delete dummyManifestInfo.serviceDescriptions[0].latency;
            delete dummyManifestInfo.serviceDescriptions[0].operatingBandwidth;
            serviceDescriptionController.applyServiceDescription(dummyManifestInfo);

            const currentSettings = settings.get();
            expect(currentSettings.streaming.liveCatchup.playbackRate).to.be.equal(0.4);
        })

        it('Should not update bandwidth parameters if unsupported mediaType is provided', () => {
            delete dummyManifestInfo.serviceDescriptions[0].playbackRate;
            delete dummyManifestInfo.serviceDescriptions[0].latency;
            dummyManifestInfo.serviceDescriptions[0].operatingBandwidth.mediaType = 'unsupported';
            serviceDescriptionController.applyServiceDescription(dummyManifestInfo);

            const currentSettings = settings.get();
            expect(currentSettings.streaming.abr.minBitrate.video).to.be.equal(referenceSettings.minBitrate.video);
            expect(currentSettings.streaming.abr.maxBitrate.video).to.be.equal(referenceSettings.maxBitrate.video);
            expect(currentSettings.streaming.abr.initialBitrate.video).to.be.equal(referenceSettings.initialBitrate.video);
            expect(currentSettings.streaming.abr.minBitrate.audio).to.be.equal(referenceSettings.minBitrate.audio);
            expect(currentSettings.streaming.abr.maxBitrate.audio).to.be.equal(referenceSettings.maxBitrate.audio);
            expect(currentSettings.streaming.abr.initialBitrate.audio).to.be.equal(referenceSettings.initialBitrate.audio);
        })

        it('Should update bandwidth parameters for video', () => {
            delete dummyManifestInfo.serviceDescriptions[0].playbackRate;
            delete dummyManifestInfo.serviceDescriptions[0].latency;
            serviceDescriptionController.applyServiceDescription(dummyManifestInfo);

            const currentSettings = settings.get();
            expect(currentSettings.streaming.abr.minBitrate.video).to.be.equal(1000);
            expect(currentSettings.streaming.abr.maxBitrate.video).to.be.equal(9000);
            expect(currentSettings.streaming.abr.initialBitrate.video).to.be.equal(5000);
            expect(currentSettings.streaming.abr.minBitrate.audio).to.be.equal(referenceSettings.minBitrate.audio);
            expect(currentSettings.streaming.abr.maxBitrate.audio).to.be.equal(referenceSettings.maxBitrate.audio);
            expect(currentSettings.streaming.abr.initialBitrate.audio).to.be.equal(referenceSettings.initialBitrate.audio);
        })

        it('Should update bandwidth parameters for audio', () => {
            delete dummyManifestInfo.serviceDescriptions[0].playbackRate;
            delete dummyManifestInfo.serviceDescriptions[0].latency;
            dummyManifestInfo.serviceDescriptions[0].operatingBandwidth.mediaType = 'audio';
            serviceDescriptionController.applyServiceDescription(dummyManifestInfo);

            const currentSettings = settings.get();
            expect(currentSettings.streaming.abr.minBitrate.video).to.be.equal(referenceSettings.minBitrate.video);
            expect(currentSettings.streaming.abr.maxBitrate.video).to.be.equal(referenceSettings.maxBitrate.video);
            expect(currentSettings.streaming.abr.initialBitrate.video).to.be.equal(referenceSettings.initialBitrate.video);
            expect(currentSettings.streaming.abr.minBitrate.audio).to.be.equal(1000);
            expect(currentSettings.streaming.abr.maxBitrate.audio).to.be.equal(9000);
            expect(currentSettings.streaming.abr.initialBitrate.audio).to.be.equal(5000);
        })

        it('Should update bandwidth parameters for any', () => {
            delete dummyManifestInfo.serviceDescriptions[0].playbackRate;
            delete dummyManifestInfo.serviceDescriptions[0].latency;
            dummyManifestInfo.serviceDescriptions[0].operatingBandwidth.mediaType = 'any';
            serviceDescriptionController.applyServiceDescription(dummyManifestInfo);

            const currentSettings = settings.get();
            expect(currentSettings.streaming.abr.minBitrate.video).to.be.equal(1000);
            expect(currentSettings.streaming.abr.maxBitrate.video).to.be.equal(9000);
            expect(currentSettings.streaming.abr.initialBitrate.video).to.be.equal(5000);
            expect(currentSettings.streaming.abr.minBitrate.audio).to.be.equal(1000);
            expect(currentSettings.streaming.abr.maxBitrate.audio).to.be.equal(9000);
            expect(currentSettings.streaming.abr.initialBitrate.audio).to.be.equal(5000);
        })

    })
})
