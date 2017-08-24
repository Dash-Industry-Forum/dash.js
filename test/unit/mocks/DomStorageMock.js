class DomStorageMock {
    constructor() {
        this.mediaSettings = {};
    }

    getSavedMediaSettings(type) {
        if (this.mediaSettings[type]) {
            return this.mediaSettings[type];
        }
        return null;
    }

    setSavedMediaSettings(type, settings) {

        if (!settings) {
            return;
        }
        if (!this.mediaSettings[type]) {
            this.mediaSettings[type] = {};
        }

        this.mediaSettings[type] = settings;
    }
}

export default DomStorageMock;