function ProtectionKeyControllerMock () {

    this.getSupportedKeySystemMetadataFromContentProtection = function (/*cps*/) {
        return [{}];
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
}

export default ProtectionKeyControllerMock;
