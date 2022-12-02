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
/**
 * @class
 * @ignore
 */
class DVBErrors {
    constructor() {
        this.mpdurl = null;
        // String - Absolute URL from which the MPD was originally
        // retrieved (MPD updates will not change this value).

        this.errorcode = null;
        // String - The value of errorcode depends upon the type
        // of error being reported. For an error listed in the
        // ErrorType column below the value is as described in the
        // Value column.
        //
        // ErrorType                                            Value
        // ---------                                            -----
        // HTTP error status code                               HTTP status code
        // Unknown HTTP status code                             HTTP status code
        // SSL connection failed                                "SSL" followed by SSL alert value
        // DNS resolution failed                                "C00"
        // Host unreachable                                     "C01"
        // Connection refused                                   "C02"
        // Connection error – Not otherwise specified           "C03"
        // Corrupt media – ISO BMFF container cannot be parsed  "M00"
        // Corrupt media – Not otherwise specified              "M01"
        // Changing Base URL in use due to errors               "F00"
        // Becoming an error reporting Player                   "S00"

        this.terror = null;
        // Real-Time - Date and time at which error occurred in UTC,
        // formatted as a combined date and time according to ISO 8601.

        this.url = null;
        // String - Absolute URL from which data was being requested
        // when this error occurred. If the error report is in relation
        // to corrupt media or changing BaseURL, this may be a null
        // string if the URL from which the media was obtained or
        // which led to the change of BaseURL is no longer known.

        this.ipaddress = null;
        // String - IP Address which the host name in "url" resolved to.
        // If the error report is in relation to corrupt media or
        // changing BaseURL, this may be a null string if the URL
        // from which the media was obtained or which led to the
        // change of BaseURL is no longer known.

        this.servicelocation = null;
        // String - The value of the serviceLocation field in the
        // BaseURL being used. In the event of this report indicating
        // a change of BaseURL this is the value from the BaseURL
        // being moved from.
    }
}

DVBErrors.SSL_CONNECTION_FAILED_PREFIX = 'SSL';
DVBErrors.DNS_RESOLUTION_FAILED =        'C00';
DVBErrors.HOST_UNREACHABLE =             'C01';
DVBErrors.CONNECTION_REFUSED =           'C02';
DVBErrors.CONNECTION_ERROR =             'C03';
DVBErrors.CORRUPT_MEDIA_ISOBMFF =        'M00';
DVBErrors.CORRUPT_MEDIA_OTHER =          'M01';
DVBErrors.BASE_URL_CHANGED =             'F00';
DVBErrors.BECAME_REPORTER =              'S00';

export default DVBErrors;
