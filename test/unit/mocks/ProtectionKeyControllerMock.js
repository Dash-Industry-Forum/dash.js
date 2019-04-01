function ProtectionKeyControllerMock () {

    this.getSupportedKeySystemsFromContentProtection = function (/*cps*/) {
        return [{}];
    };

    this.getSupportedKeySystems = function () {
        return [];
    };

    this.getLicenseServer = function () {
        return null;
    };
}

export default ProtectionKeyControllerMock;