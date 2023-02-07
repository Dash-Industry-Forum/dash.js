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
import ErrorsBase from '../../core/errors/ErrorsBase';
/**
 * Offline Errors declaration
 * @class
 */
class OfflineErrors extends ErrorsBase {
    constructor () {

        super();

        /**
         * Error code returned when an error occurs in offline module
         */
        this.OFFLINE_ERROR = 11000;

        // Based upon https://developer.mozilla.org/fr/docs/Web/API/DOMException
        this.INDEXEDDB_QUOTA_EXCEED_ERROR = 11001;
        this.INDEXEDDB_INVALID_STATE_ERROR = 11002;
        this.INDEXEDDB_NOT_READABLE_ERROR = 11003;
        this.INDEXEDDB_NOT_FOUND_ERROR = 11004;
        this.INDEXEDDB_NETWORK_ERROR = 11005;
        this.INDEXEDDB_DATA_ERROR = 11006;
        this.INDEXEDDB_TRANSACTION_INACTIVE_ERROR = 11007;
        this.INDEXEDDB_NOT_ALLOWED_ERROR = 11008;
        this.INDEXEDDB_NOT_SUPPORTED_ERROR = 11009;
        this.INDEXEDDB_VERSION_ERROR = 11010;
        this.INDEXEDDB_TIMEOUT_ERROR = 11011;
        this.INDEXEDDB_ABORT_ERROR = 11012;
        this.INDEXEDDB_UNKNOWN_ERROR = 11013;
    }
}

let offlineErrors = new OfflineErrors();
export default offlineErrors;
