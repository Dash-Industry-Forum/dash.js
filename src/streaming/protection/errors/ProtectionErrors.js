/**
 * The copyright in this software is being made available under the BSD License,
 * included below. This software may be subject to other third party and contributor
 * rights, including patent rights, and no such rights are granted under this license.
 *
 * Copyright (c) 2013, Dash Industry Forum.
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without modification,
 * are permitted provided that the following conditions are met:
 *  * Redistributions of source code must retain the above copyright notice, this
 *  list of conditions and the following disclaimer.
 *  * Redistributions in binary form must reproduce the above copyright notice,
 *  this list of conditions and the following disclaimer in the documentation and/or
 *  other materials provided with the distribution.
 *  * Neither the name of Dash Industry Forum nor the names of its
 *  contributors may be used to endorse or promote products derived from this software
 *  without specific prior written permission.
 *
 *  THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS AS IS AND ANY
 *  EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 *  WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED.
 *  IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT,
 *  INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT
 *  NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
 *  PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY,
 *  WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
 *  ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
 *  POSSIBILITY OF SUCH DAMAGE.
 */
import ErrorsBase from '../../../core/errors/ErrorsBase';
/**
 * @class
 */
class ProtectionErrors extends ErrorsBase {
	constructor () {
        super();

        /**
         *  Generid key Error code
         */
        this.MEDIA_KEYERR_CODE = 100;
        /**
         *  Error code returned by keyerror api for ProtectionModel_01b
         */
        this.MEDIA_KEYERR_UNKNOWN_CODE = 101;
        /**
         *  Error code returned by keyerror api for ProtectionModel_01b
         */
        this.MEDIA_KEYERR_CLIENT_CODE = 102;
        /**
         *  Error code returned by keyerror api for ProtectionModel_01b
         */
        this.MEDIA_KEYERR_SERVICE_CODE = 103;
        /**
         *  Error code returned by keyerror api for ProtectionModel_01b
         */
        this.MEDIA_KEYERR_OUTPUT_CODE = 104;
        /**
         *  Error code returned by keyerror api for ProtectionModel_01b
         */
        this.MEDIA_KEYERR_HARDWARECHANGE_CODE = 105;
        /**
         *  Error code returned by keyerror api for ProtectionModel_01b
         */
        this.MEDIA_KEYERR_DOMAIN_CODE = 106;

        /**
         *  Error code returned when an error occured in keymessage event for ProtectionModel_01b
         */
        this.MEDIA_KEY_MESSAGE_ERROR_CODE = 107;
        /**
         *  Error code returned when challenge is invalid in keymessage event (event triggered by CDM)
         */
        this.MEDIA_KEY_MESSAGE_NO_CHALLENGE_ERROR_CODE = 108;
        /**
         *  Error code returned when License server certificate has not been successfully updated
         */
        this.SERVER_CERTIFICATE_UPDATED_ERROR_CODE = 109;
        /**
         *  Error code returned when license validity has expired
         */
        this.KEY_STATUS_CHANGED_EXPIRED_ERROR_CODE = 110;
        /**
         *  Error code returned when no licenser url is defined
         */
        this.MEDIA_KEY_MESSAGE_NO_LICENSE_SERVER_URL_ERROR_CODE = 111;
        /**
         *  Error code returned when key system access is denied
         */
        this.KEY_SYSTEM_ACCESS_DENIED_ERROR_CODE = 112;
        /**
         *  Error code returned when key session has not been successfully created
         */
        this.KEY_SESSION_CREATED_ERROR_CODE = 113;
        /**
         *  Error code returned when license request failed after a keymessage event has been triggered
         */
        this.MEDIA_KEY_MESSAGE_LICENSER_ERROR_CODE = 114;

        this.MEDIA_KEYERR_UNKNOWN_MESSAGE = 'An unspecified error occurred. This value is used for errors that don\'t match any of the other codes.';
        this.MEDIA_KEYERR_CLIENT_MESSAGE = 'The Key System could not be installed or updated.';
        this.MEDIA_KEYERR_SERVICE_MESSAGE = 'The message passed into update indicated an error from the license service.';
        this.MEDIA_KEYERR_OUTPUT_MESSAGE = 'There is no available output device with the required characteristics for the content protection system.';
        this.MEDIA_KEYERR_HARDWARECHANGE_MESSAGE = 'A hardware configuration change caused a content protection error.';
        this.MEDIA_KEYERR_DOMAIN_MESSAGE = 'An error occurred in a multi-device domain licensing configuration. The most common error is a failure to join the domain.';
        this.MEDIA_KEY_MESSAGE_ERROR_MESSAGE = 'Multiple key sessions were creates with a user-agent that does not support sessionIDs!! Unpredictable behavior ahead!';
        this.MEDIA_KEY_MESSAGE_NO_CHALLENGE_ERROR_MESSAGE = 'DRM: Empty key message from CDM';
        this.SERVER_CERTIFICATE_UPDATED_ERROR_MESSAGE = 'Error updating server certificate -- ';
        this.KEY_STATUS_CHANGED_EXPIRED_ERROR_MESSAGE = 'DRM: KeyStatusChange error! -- License has expired';
        this.MEDIA_KEY_MESSAGE_NO_LICENSE_SERVER_URL_ERROR_MESSAGE = 'DRM: No license server URL specified!';
        this.KEY_SYSTEM_ACCESS_DENIED_ERROR_MESSAGE = 'DRM: KeySystem Access Denied! -- ';
        this.KEY_SESSION_CREATED_ERROR_MESSAGE = 'DRM: unable to create session! --';
        this.MEDIA_KEY_MESSAGE_LICENSER_ERROR_MESSAGE = 'DRM: licenser error! --';
    }
}

let protectionErrors = new ProtectionErrors();
export default protectionErrors;