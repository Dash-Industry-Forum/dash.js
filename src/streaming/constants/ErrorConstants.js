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

import FactoryMaker from '../../core/FactoryMaker';

const MANIFEST_LOADER_PARSING_FAILURE_ERROR_CODE = 1;
const MANIFEST_LOADER_LOADING_FAILURE_ERROR_CODE = 2;
const XLINK_LOADER_LOADING_FAILURE_ERROR_CODE = 3;
const SEGMENTS_UPDATE_FAILED_ERROR_CODE = 4;
const SEGMENTS_UNAVAILABLE_ERROR_CODE = 5;
const SEGMENT_BASE_LOADER_ERROR_CODE = 6;
const TIME_SYNC_FAILED_ERROR_CODE = 7;
const FRAGMENT_LOADER_LOADING_FAILURE_ERROR_CODE = 8;
const FRAGMENT_LOADER_NULL_REQUEST_ERROR_CODE = 9;
const URL_RESOLUTION_FAILED_GENERIC_ERROR_CODE = 10;
const APPEND_ERROR_CODE = 11;
const REMOVE_ERROR_CODE = 12;
const DATA_UPDATE_FAILED_ERROR_CODE = 13;

/**
 * ErrorConstants declaration
 * @class
 * @ignore
 */
function ErrorConstants () {

    const MANIFEST_LOADER_PARSING_FAILURE_ERROR_MESSAGE = 'parsing failed for ';
    const MANIFEST_LOADER_LOADING_FAILURE_ERROR_MESSAGE = 'Failed loading manifest: ';
    const XLINK_LOADER_LOADING_FAILURE_ERROR_MESSAGE = 'Failed loading Xlink element: ';
    const SEGMENTS_UPDATE_FAILED_ERROR_MESSAGE = 'Segments update failed';
    const SEGMENTS_UNAVAILABLE_ERROR_MESSAGE = 'no segments are available yet';
    const SEGMENT_BASE_LOADER_ERROR_MESSAGE = 'error loading segments';
    const TIME_SYNC_FAILED_ERROR_MESSAGE = 'Failed to synchronize time';
    const FRAGMENT_LOADER_NULL_REQUEST_ERROR_MESSAGE = 'request is null';
    const URL_RESOLUTION_FAILED_GENERIC_ERROR_MESSAGE = 'Failed to resolve a valid URL';
    const APPEND_ERROR_MESSAGE = 'buffer or chunk is not defined';
    const REMOVE_ERROR_MESSAGE = 'buffer is not defined';
    const DATA_UPDATE_FAILED_ERROR_MESSAGE = 'Data update failed';
    let instance;

    function setup() {
    }

    function getErrorMessage(errorCode) {
        let msg;
        switch (errorCode) {
            case MANIFEST_LOADER_PARSING_FAILURE_ERROR_CODE:
                msg = MANIFEST_LOADER_PARSING_FAILURE_ERROR_MESSAGE;
                break;
            case MANIFEST_LOADER_LOADING_FAILURE_ERROR_CODE:
                msg = MANIFEST_LOADER_LOADING_FAILURE_ERROR_MESSAGE;
                break;
            case XLINK_LOADER_LOADING_FAILURE_ERROR_CODE:
                msg = XLINK_LOADER_LOADING_FAILURE_ERROR_MESSAGE;
                break;
            case SEGMENTS_UPDATE_FAILED_ERROR_CODE:
                msg = SEGMENTS_UPDATE_FAILED_ERROR_MESSAGE;
                break;
            case SEGMENTS_UNAVAILABLE_ERROR_CODE:
                msg = SEGMENTS_UNAVAILABLE_ERROR_MESSAGE;
                break;
            case SEGMENT_BASE_LOADER_ERROR_CODE:
                msg = SEGMENT_BASE_LOADER_ERROR_MESSAGE;
                break;
            case TIME_SYNC_FAILED_ERROR_CODE:
                msg = TIME_SYNC_FAILED_ERROR_MESSAGE;
                break;
            case FRAGMENT_LOADER_LOADING_FAILURE_ERROR_CODE:
                msg = '';
                break;
            case FRAGMENT_LOADER_NULL_REQUEST_ERROR_CODE:
                msg = FRAGMENT_LOADER_NULL_REQUEST_ERROR_MESSAGE;
                break;
            case URL_RESOLUTION_FAILED_GENERIC_ERROR_CODE:
                msg = URL_RESOLUTION_FAILED_GENERIC_ERROR_MESSAGE;
                break;
            case APPEND_ERROR_CODE:
                msg = APPEND_ERROR_MESSAGE;
                break;
            case REMOVE_ERROR_CODE:
                msg = REMOVE_ERROR_MESSAGE;
                break;
            case DATA_UPDATE_FAILED_ERROR_CODE:
                msg = DATA_UPDATE_FAILED_ERROR_MESSAGE;
                break;
            default:
                msg = '';
        }
        return msg;
    }

    instance = {
        getErrorMessage: getErrorMessage
    };

    setup();

    return instance;
}

ErrorConstants.__dashjs_factory_name = 'ErrorConstants';
const factory = FactoryMaker.getSingletonFactory(ErrorConstants);
factory.MANIFEST_LOADER_PARSING_FAILURE_ERROR_CODE = MANIFEST_LOADER_PARSING_FAILURE_ERROR_CODE;
factory.MANIFEST_LOADER_LOADING_FAILURE_ERROR_CODE = MANIFEST_LOADER_LOADING_FAILURE_ERROR_CODE;
factory.XLINK_LOADER_LOADING_FAILURE_ERROR_CODE = XLINK_LOADER_LOADING_FAILURE_ERROR_CODE;
factory.SEGMENTS_UPDATE_FAILED_ERROR_CODE = SEGMENTS_UPDATE_FAILED_ERROR_CODE;
factory.SEGMENTS_UNAVAILABLE_ERROR_CODE = SEGMENTS_UNAVAILABLE_ERROR_CODE;
factory.SEGMENT_BASE_LOADER_ERROR_CODE = SEGMENT_BASE_LOADER_ERROR_CODE;
factory.TIME_SYNC_FAILED_ERROR_CODE = TIME_SYNC_FAILED_ERROR_CODE;
factory.FRAGMENT_LOADER_LOADING_FAILURE_ERROR_CODE = FRAGMENT_LOADER_LOADING_FAILURE_ERROR_CODE;
factory.FRAGMENT_LOADER_NULL_REQUEST_ERROR_CODE = FRAGMENT_LOADER_NULL_REQUEST_ERROR_CODE;
factory.URL_RESOLUTION_FAILED_GENERIC_ERROR_CODE = URL_RESOLUTION_FAILED_GENERIC_ERROR_CODE;
factory.APPEND_ERROR_CODE = APPEND_ERROR_CODE;
factory.REMOVE_ERROR_CODE = REMOVE_ERROR_CODE;
factory.DATA_UPDATE_FAILED_ERROR_CODE = DATA_UPDATE_FAILED_ERROR_CODE;
FactoryMaker.updateSingletonFactory(ErrorConstants.__dashjs_factory_name, factory);
export default factory;