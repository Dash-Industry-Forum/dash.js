class DOMStorageHelper {
    constructor() {
        this.savedBitrate = NaN;
    }

    getSavedBitrateSettings(/*type*/) {
        return this.savedBitrate;
    }
}

export default DOMStorageHelper;
