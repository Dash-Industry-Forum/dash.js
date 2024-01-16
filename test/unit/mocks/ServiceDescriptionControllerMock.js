class ServiceDescriptionControllerMock {

    constructor() {
        this.setup();
    }

    setup() {
        this.serviceDescriptionSettings = {
            liveDelay: NaN,
            liveCatchup: {
                maxDrift: NaN,
                playbackRate: {
                    min: NaN,
                    max: NaN
                },
            },
            minBitrate: {},
            maxBitrate: {},
            initialBitrate: {},
            contentSteering: null,
            clientDataReporting: null,
        };
    }

    getServiceDescriptionSettings() {
        return this.serviceDescriptionSettings;
    }

    getProducerReferenceTimeOffsets() {
    }

    calculateProducerReferenceTimeOffsets() {
    }

    applyServiceDescription() {
    }

    reset() {
    }

    setConfig() {
    }
}

export default ServiceDescriptionControllerMock;
