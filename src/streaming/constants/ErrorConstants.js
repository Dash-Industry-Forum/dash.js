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
 * ErrorConstants declaration
 * @class
 * @ignore
 */
class ErrorConstants {

    init () {
        this.MANIFEST_LOADER_PARSING_FAILURE_ERROR_CODE = 1;
        this.MANIFEST_LOADER_PARSING_FAILURE_ERROR_MESSAGE = 'parsing failed for ';
        this.MANIFEST_LOADER_LOADING_FAILURE_ERROR_CODE = 2;
        this.MANIFEST_LOADER_LOADING_FAILURE_ERROR_MESSAGE = `Failed loading manifest: `;
        this.XLINK_LOADER_LOADING_FAILURE_ERROR_CODE = 1;
        this.XLINK_LOADER_LOADING_FAILURE_ERROR_MESSAGE = 'Failed loading Xlink element: ';
        this.SEGMENTS_UPDATE_FAILED_ERROR_CODE = 1;
        this.SEGMENTS_UPDATE_FAILED_ERROR_MESSAGE = 'Segments update failed';
        this.SEGMENTS_UNAVAILABLE_ERROR_CODE = 1;
        this.SEGMENTS_UNAVAILABLE_ERROR_MESSAGE = 'no segments are available yet';
        this.SEGMENT_BASE_LOADER_ERROR_CODE = 1;
        this.SEGMENT_BASE_LOADER_ERROR_MESSAGE = 'error loading segments';
        this.TIME_SYNC_FAILED_ERROR_CODE = 1;
        this.TIME_SYNC_FAILED_ERROR_MESSAGE = 'Failed to synchronize time';
        this.FRAGMENT_LOADER_LOADING_FAILURE_ERROR_CODE = 1;

        this.FRAGMENT_LOADER_NULL_REQUEST_ERROR_CODE = 2;
        this.FRAGMENT_LOADER_NULL_REQUEST_ERROR_MESSAGE = 'request is null';
        this.URL_RESOLUTION_FAILED_GENERIC_ERROR_CODE = 1;
        this.URL_RESOLUTION_FAILED_GENERIC_ERROR_MESSAGE = 'Failed to resolve a valid URL';

        this.APPEND_ERROR_CODE = 1;
        this.APPEND_ERROR_MESSAGE = 'buffer or chunk is not defined';
        this.REMOVE_ERROR_CODE = 2;
        this.REMOVE_ERROR_MESSAGE = 'buffer is not defined';
    }

    constructor () {
        this.init();
    }
}

let errorConstants = new ErrorConstants();
export default errorConstants;
