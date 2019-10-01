import ProtectionErrors from '../../../src/streaming/protection/errors/ProtectionErrors';
import DashJSError from '../../../src/streaming/vo/DashJSError';

function ProtectionModelMock (config) {

    this.setServerCertificate = function (/*elt*/) {
        config.eventBus.trigger(config.events.SERVER_CERTIFICATE_UPDATED, {error: new DashJSError(ProtectionErrors.SERVER_CERTIFICATE_UPDATED_ERROR_CODE, ProtectionErrors.SERVER_CERTIFICATE_UPDATED_ERROR_MESSAGE)});
    };

    this.setMediaElement = function () {
    };

    this.reset = function () {
    };

    this.requestKeySystemAccess = function () {
    };
}

export default ProtectionModelMock;