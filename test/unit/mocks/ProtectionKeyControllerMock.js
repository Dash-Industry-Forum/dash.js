function ProtectionKeyControllerMock () {

    this.getSupportedKeySystemsFromContentProtection = function (/*cps*/) {
        return [];
    };

    this.getLicenseServer = function () {
        return null;
    };
}

export default ProtectionKeyControllerMock;