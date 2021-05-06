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
import ErrorsBase from './ErrorsBase';
/**
 * Errors declaration
 * @class
 */
class Errors extends ErrorsBase {
    constructor () {
        super();

        /**
         * Error code returned when a manifest parsing error occurs
         */
        this.MANIFEST_LOADER_PARSING_FAILURE_ERROR_CODE = 10;

        /**
         * Error code returned when a manifest loading error occurs
         */
        this.MANIFEST_LOADER_LOADING_FAILURE_ERROR_CODE = 11;

        /**
         * Error code returned when a xlink loading error occurs
         */
        this.XLINK_LOADER_LOADING_FAILURE_ERROR_CODE = 12;

        /**
         * Error code returned when no segment ranges could be determined from the sidx box
         */
        this.SEGMENT_BASE_LOADER_ERROR_CODE = 15;

        /**
         * Error code returned when the time synchronization failed
         */
        this.TIME_SYNC_FAILED_ERROR_CODE = 16;

        /**
         * Error code returned when loading a fragment failed
         */
        this.FRAGMENT_LOADER_LOADING_FAILURE_ERROR_CODE = 17;

        /**
         * Error code returned when the FragmentLoader did not receive a request object
         */
        this.FRAGMENT_LOADER_NULL_REQUEST_ERROR_CODE = 18;

        /**
         * Error code returned when the BaseUrl resolution failed
         */
        this.URL_RESOLUTION_FAILED_GENERIC_ERROR_CODE = 19;

        /**
         * Error code returned when the append operation in the SourceBuffer failed
         */
        this.APPEND_ERROR_CODE = 20;

        /**
         * Error code returned when the remove operation in the SourceBuffer failed
         */
        this.REMOVE_ERROR_CODE = 21;

        /**
         * Error code returned when updating the internal objects after loading an MPD failed
         */
        this.DATA_UPDATE_FAILED_ERROR_CODE = 22;

        /**
         * Error code returned when MediaSource is not supported by the browser
         */
        this.CAPABILITY_MEDIASOURCE_ERROR_CODE = 23;

        /**
         * Error code returned when Protected contents are not supported
         */
        this.CAPABILITY_MEDIAKEYS_ERROR_CODE   = 24;

        /**
         * Error code returned when loading the manifest failed
         */
        this.DOWNLOAD_ERROR_ID_MANIFEST_CODE   = 25;

        /**
         * Error code returned when loading the sidx failed
         */
        this.DOWNLOAD_ERROR_ID_SIDX_CODE            = 26;

        /**
         * Error code returned when loading the media content failed
         */
        this.DOWNLOAD_ERROR_ID_CONTENT_CODE         = 27;

        /**
         * Error code returned when loading the init segment failed
         */
        this.DOWNLOAD_ERROR_ID_INITIALIZATION_CODE  = 28;

        /**
         * Error code returned when loading the XLink content failed
         */
        this.DOWNLOAD_ERROR_ID_XLINK_CODE           = 29;

        /**
         * Error code returned when parsing the MPD resulted in a logical error
         */
        this.MANIFEST_ERROR_ID_PARSE_CODE           = 31;

        /**
         * Error code returned when no stream (period) has been detected in the manifest
         */
        this.MANIFEST_ERROR_ID_NOSTREAMS_CODE       = 32;

        /**
         * Error code returned when something wrong has happened during parsing and appending subtitles (TTML or VTT)
         */
        this.TIMED_TEXT_ERROR_ID_PARSE_CODE         = 33;

        /**
         * Error code returned when a 'muxed' media type has been detected in the manifest. This type is not supported
         */

        this.MANIFEST_ERROR_ID_MULTIPLEXED_CODE     = 34;

        /**
         * Error code returned when a media source type is not supported
         */
        this.MEDIASOURCE_TYPE_UNSUPPORTED_CODE = 35;

        this.MANIFEST_LOADER_PARSING_FAILURE_ERROR_MESSAGE = 'parsing failed for ';
        this.MANIFEST_LOADER_LOADING_FAILURE_ERROR_MESSAGE = 'Failed loading manifest: ';
        this.XLINK_LOADER_LOADING_FAILURE_ERROR_MESSAGE = 'Failed loading Xlink element: ';
        this.SEGMENTS_UPDATE_FAILED_ERROR_MESSAGE = 'Segments update failed';
        this.SEGMENTS_UNAVAILABLE_ERROR_MESSAGE = 'no segments are available yet';
        this.SEGMENT_BASE_LOADER_ERROR_MESSAGE = 'error loading segment ranges from sidx';
        this.TIME_SYNC_FAILED_ERROR_MESSAGE = 'Failed to synchronize client and server time';
        this.FRAGMENT_LOADER_NULL_REQUEST_ERROR_MESSAGE = 'request is null';
        this.URL_RESOLUTION_FAILED_GENERIC_ERROR_MESSAGE = 'Failed to resolve a valid URL';
        this.APPEND_ERROR_MESSAGE = 'chunk is not defined';
        this.REMOVE_ERROR_MESSAGE = 'Removing data from the SourceBuffer';
        this.DATA_UPDATE_FAILED_ERROR_MESSAGE = 'Data update failed';
        this.CAPABILITY_MEDIASOURCE_ERROR_MESSAGE = 'mediasource is not supported';
        this.CAPABILITY_MEDIAKEYS_ERROR_MESSAGE = 'mediakeys is not supported';
        this.TIMED_TEXT_ERROR_MESSAGE_PARSE = 'parsing error :';
        this.MEDIASOURCE_TYPE_UNSUPPORTED_MESSAGE = 'Error creating source buffer of type : ';
    }
}

let errors = new Errors();
export default errors;
