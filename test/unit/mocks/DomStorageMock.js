function DomStorageMock () {
    this.mediaSettings = {};

    this.getSavedMediaSettings = function (type) {
        if (this.mediaSettings[type]) {
            return this.mediaSettings[type];
        }
        return null;
    };

    this.getSavedBitrateSettings = function (/*type*/) {
        return 0;
    };

    this.setSavedMediaSettings = function (type, settings) {

        if (!settings) {
            return;
        }
        if (!this.mediaSettings[type]) {
            this.mediaSettings[type] = {};
        }

        this.mediaSettings[type] = settings;
    };
}

export default DomStorageMock;