import ProtectionErrors from '../../src/streaming/protection/errors/ProtectionErrors';

const expect = require('chai').expect;

describe('ProtectionErrors', function () {
    it('ProtectionErrors code should exist', () => {
        expect(ProtectionErrors).to.exist; // jshint ignore:line
        expect(ProtectionErrors.MEDIA_KEYERR_CODE).to.equal(100);
        expect(ProtectionErrors.MEDIA_KEYERR_UNKNOWN_CODE).to.equal(101);
        expect(ProtectionErrors.MEDIA_KEYERR_CLIENT_CODE).to.equal(102);
        expect(ProtectionErrors.MEDIA_KEYERR_SERVICE_CODE).to.equal(103);
        expect(ProtectionErrors.MEDIA_KEYERR_OUTPUT_CODE).to.equal(104);
        expect(ProtectionErrors.MEDIA_KEYERR_HARDWARECHANGE_CODE).to.equal(105);
        expect(ProtectionErrors.MEDIA_KEYERR_DOMAIN_CODE).to.equal(106);
        expect(ProtectionErrors.MEDIA_KEY_MESSAGE_ERROR_CODE).to.equal(107);
        expect(ProtectionErrors.MEDIA_KEY_MESSAGE_NO_CHALLENGE_ERROR_CODE).to.equal(108);
        expect(ProtectionErrors.SERVER_CERTIFICATE_UPDATED_ERROR_CODE).to.equal(109);
        expect(ProtectionErrors.KEY_STATUS_CHANGED_EXPIRED_ERROR_CODE).to.equal(110);
        expect(ProtectionErrors.MEDIA_KEY_MESSAGE_NO_LICENSE_SERVER_URL_ERROR_CODE).to.equal(111);
        expect(ProtectionErrors.KEY_SYSTEM_ACCESS_DENIED_ERROR_CODE).to.equal(112);
        expect(ProtectionErrors.KEY_SESSION_CREATED_ERROR_CODE).to.equal(113);
    });

    it('ProtectionErrors should return the correct error message', () => {
        expect(ProtectionErrors).to.exist; // jshint ignore:line
        expect(ProtectionErrors.MEDIA_KEYERR_UNKNOWN_MESSAGE).to.equal('An unspecified error occurred. This value is used for errors that don\'t match any of the other codes.');
        expect(ProtectionErrors.MEDIA_KEYERR_CLIENT_MESSAGE).to.equal('The Key System could not be installed or updated.');
        expect(ProtectionErrors.MEDIA_KEYERR_SERVICE_MESSAGE).to.equal('The message passed into update indicated an error from the license service.');
        expect(ProtectionErrors.MEDIA_KEYERR_OUTPUT_MESSAGE).to.equal('There is no available output device with the required characteristics for the content protection system.');
        expect(ProtectionErrors.MEDIA_KEYERR_HARDWARECHANGE_MESSAGE).to.equal('A hardware configuration change caused a content protection error.');
        expect(ProtectionErrors.MEDIA_KEYERR_DOMAIN_MESSAGE).to.equal('An error occurred in a multi-device domain licensing configuration. The most common error is a failure to join the domain.');
        expect(ProtectionErrors.MEDIA_KEY_MESSAGE_ERROR_MESSAGE).to.equal('Multiple key sessions were creates with a user-agent that does not support sessionIDs!! Unpredictable behavior ahead!');
        expect(ProtectionErrors.MEDIA_KEY_MESSAGE_NO_CHALLENGE_ERROR_MESSAGE).to.equal('DRM: Empty key message from CDM');
        expect(ProtectionErrors.SERVER_CERTIFICATE_UPDATED_ERROR_MESSAGE).to.equal('Error updating server certificate -- ');
        expect(ProtectionErrors.KEY_STATUS_CHANGED_EXPIRED_ERROR_MESSAGE).to.equal('DRM: KeyStatusChange error! -- License has expired');
        expect(ProtectionErrors.MEDIA_KEY_MESSAGE_NO_LICENSE_SERVER_URL_ERROR_MESSAGE).to.equal('DRM: No license server URL specified!');
        expect(ProtectionErrors.KEY_SYSTEM_ACCESS_DENIED_ERROR_MESSAGE).to.equal('DRM: KeySystem Access Denied! -- ');
        expect(ProtectionErrors.KEY_SESSION_CREATED_ERROR_MESSAGE).to.equal('DRM: unable to create session! --');
    });
});