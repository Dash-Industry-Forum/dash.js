/**
 * The copyright in this software is being made available under the BSD License,
 * included below. This software may be subject to other third party and contributor
 * rights, including patent rights, and no such rights are granted under this license.
 *
 * Copyright (c) 2014-2015, Cable Television Laboratories, Inc.
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without modification,
 * are permitted provided that the following conditions are met:
 *  * Redistributions of source code must retain the above copyright notice, this
 *  list of conditions and the following disclaimer.
 *  * Redistributions in binary form must reproduce the above copyright notice,
 *  this list of conditions and the following disclaimer in the documentation and/or
 *  other materials provided with the distribution.
 *  * Neither the name of Cable Television Laboratories, Inc. nor the names of its
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

MediaPlayer.dependencies.protection.KeySystem = {

    /**
     * Key system name string (e.g. 'org.w3.clearkey')
     *
     * {DOMString}
     *
     systemString: undefined,
     */

    /**
     * Key system UUID in the form '01234567-89ab-cdef-0123-456789abcdef'
     *
     * {DOMString}
     *
     uuid: undefined,
     */

    /**
     * The scheme ID URI for this key system in the form
     * 'urn:uuid:01234567-89ab-cdef-0123-456789abcdef' as used
     * in DASH ContentProtection elements
     *
     * {DOMString}
     *
     schemeIdURI: undefined,
     */

    /**
     * Request a content key/license from a remote server
     *
     * @param msg the request message from the CDM
     * @param laURL default URL provided by the CDM
     * @param requestData object that will be returned in the
     * ENAME_LICENSE_REQUEST_COMPLETE event
     *
     doLicenseRequest: function(msg, laURL, requestData) {},
     */

    /**
     * Parse DRM-specific init data from the ContentProtection
     * element.
     *
     * @param contentProtection the ContentProtection element
     * @returns {Uint8Array} initialization data
     *
     getInitData: function(contentProtection) { return null; },
     */

    /**
     * Checks for equality of initialization data.  CDMs may send "needkey"
     * events multiple times for the same initialization data, and players may
     * wish to avoid creating new sessions for each needkey event if the init
     * data is the same.
     *
     * @param initData1
     * @param initData2
     *
     initDataEquals: function(initData1, initData2) {},
     */

    eventList: {
        ENAME_LICENSE_REQUEST_COMPLETE: "licenseRequestComplete"
    }
};

