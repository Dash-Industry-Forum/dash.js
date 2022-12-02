function DomStorageMock () {
    this.mediaSettings = {};
    this.bitrateSettings = {audio: NaN, video: NaN};

    this.getSavedMediaSettings = function (type) {
        if (this.mediaSettings[type]) {
            return this.mediaSettings[type];
        }
        return null;
    };

    this.setSavedBitrateSettings = function (type, bitrate) {
        this.bitrateSettings[type] = bitrate;
    };

    this.getSavedBitrateSettings = function (type) {
        return this.bitrateSettings[type];
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