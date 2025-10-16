import ProtectionErrors from '../../../src/streaming/protection/errors/ProtectionErrors.js';
import DashJSError from '../../../src/streaming/vo/DashJSError.js';

function ProtectionModelMock (config) {

    let sessions = [];
    let nextId = 0;

    this.setServerCertificate = function (/*elt*/) {
        config.eventBus.trigger(config.events.SERVER_CERTIFICATE_UPDATED, {error: new DashJSError(ProtectionErrors.SERVER_CERTIFICATE_UPDATED_ERROR_CODE, ProtectionErrors.SERVER_CERTIFICATE_UPDATED_ERROR_MESSAGE)});
    };

    this.setMediaElement = function () {
    };

    this.reset = function () {
        sessions = []; 
        nextId = 0;
    };

    this.requestKeySystemAccess = function () {
        return Promise.resolve();
    };

    this.getSessionTokens = function () { return sessions; };
    this.createKeySession = function (keySystemMetadata) {
        const keyId = keySystemMetadata && keySystemMetadata.keyId !== undefined ? keySystemMetadata.keyId : nextId;
        const sessionType = keySystemMetadata && keySystemMetadata.sessionType ? keySystemMetadata.sessionType : 'temporary';
        const sessionId = keySystemMetadata && keySystemMetadata.sessionId ? keySystemMetadata.sessionId : null;
        const session = {
            id: nextId++,
            keyId: keyId,
            initData: keySystemMetadata.initData,
            sessionType: sessionType,
            sessionId: sessionId,
            hasTriggeredKeyStatusMapUpdate: false,
            getKeyId: function() { return this.keyId; },
            getSessionId: function() { return this.sessionId; },
            getSessionType: function() { return this.sessionType; }
        };
        sessions.push(session);
    };
    this.closeKeySession = function (session) {
        const idx = sessions.findIndex(s => s.id === session.id);
        if (idx !== -1) {
            sessions.splice(idx, 1);
        }
    };
}

export default ProtectionModelMock;
