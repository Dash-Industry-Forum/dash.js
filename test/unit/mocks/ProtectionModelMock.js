import ProtectionErrors from '../../../src/streaming/protection/errors/ProtectionErrors.js';
import DashJSError from '../../../src/streaming/vo/DashJSError.js';

function ProtectionModelMock (config) {

    this.setServerCertificate = function (/*elt*/) {
        config.eventBus.trigger(config.events.SERVER_CERTIFICATE_UPDATED, {error: new DashJSError(ProtectionErrors.SERVER_CERTIFICATE_UPDATED_ERROR_CODE, ProtectionErrors.SERVER_CERTIFICATE_UPDATED_ERROR_MESSAGE)});
    };

    this.setMediaElement = function () {
    };

    this.reset = function () {
    };

    this.requestKeySystemAccess = function () {
        return Promise.resolve();
    };
}

export default ProtectionModelMock;
