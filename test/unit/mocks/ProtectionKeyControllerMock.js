function ProtectionKeyControllerMock () {

    this.getSupportedKeySystemMetadataFromContentProtection = function (/*cps*/) {
        return [{}];
    };

    this.getSupportedKeySystemMetadataFromSegmentPssh = function (/*initData, protDataSet, sessionType*/) {
        return [];
    };

    this.getSupportedKeySystemMetadataForSinf = function (/*initData, protDataSet, sessionType*/) {
        return [];
    };

    this.getSupportedKeySystemMetadataForWebm = function (/*initData, contentProtectionElements, protDataSet, sessionType*/) {
        return [];
    };

    this.getSupportedKeySystems = function () {
        return [];
    };

    this.getLicenseServer = function () {
        return null;
    };

    this.getLicenseServerModelInstance = function () {
        return {};
    }

    this.setProtectionData = function (/*protectionData*/) {
    };
}

export default ProtectionKeyControllerMock;
