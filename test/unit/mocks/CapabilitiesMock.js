class CapabilitiesMock {

    constructor() {
        this.setup();
    }

    setup() {
        this.encryptedMediaSupported = true;
        this.mediaSourceSupported = true;
    }

    setMediaSourceSupported(value) {
        this.mediaSourceSupported = value;
    }

    supportsMediaSource() {
        return this.mediaSourceSupported;
    }

    supportsEncryptedMedia() {
        return this.encryptedMediaSupported;
    }

    setEncryptedMediaSupported(value) {
        this.encryptedMediaSupported = value;
    }

    supportsCodec() {
        return 'probably';
    }

    runCodecSupportCheck() {
        return Promise.resolve();
    }

    isCodecSupportedBasedOnTestedConfigurations() {
        return true;
    }
}

export default CapabilitiesMock;
