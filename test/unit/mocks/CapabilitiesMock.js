class CapabilitiesMock {

    constructor() {
        this.setup();
    }

    setup() {
        this.encryptedMediaSupported = true;
        this.mediaSourceSupported = true;
        this.protectionController = null;
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

    areKeyIdsUsable() {
        return true;
    }

    setProtectionController(data) {
        this.protectionController = data;
    }

    runCodecSupportCheck() {
        return Promise.resolve();
    }

    isCodecSupportedBasedOnTestedConfigurations() {
        return true;
    }

    supportsEssentialProperty() {
        return true;
    }
}

export default CapabilitiesMock;
