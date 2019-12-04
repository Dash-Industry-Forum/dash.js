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
 * Constants declaration
 * @class
 * @ignore
 * @hideconstructor
 */
class Constants {

    init () {
        /**
         *  @constant {string} STREAM Stream media type. Mainly used to report metrics relative to the full stream
         *  @memberof Constants#
         *  @static
         */
        this.STREAM = 'stream';

        /**
         *  @constant {string} VIDEO Video media type
         *  @memberof Constants#
         *  @static
         */
        this.VIDEO = 'video';

        /**
         *  @constant {string} AUDIO Audio media type
         *  @memberof Constants#
         *  @static
         */
        this.AUDIO = 'audio';

        /**
         *  @constant {string} TEXT Text media type
         *  @memberof Constants#
         *  @static
         */
        this.TEXT = 'text';

        /**
         *  @constant {string} FRAGMENTED_TEXT Fragmented text media type
         *  @memberof Constants#
         *  @static
         */
        this.FRAGMENTED_TEXT = 'fragmentedText';

        /**
         *  @constant {string} EMBEDDED_TEXT Embedded text media type
         *  @memberof Constants#
         *  @static
         */
        this.EMBEDDED_TEXT = 'embeddedText';

        /**
         *  @constant {string} MUXED Muxed (video/audio in the same chunk) media type
         *  @memberof Constants#
         *  @static
         */
        this.MUXED = 'muxed';

        /**
         *  @constant {string} IMAGE Image media type
         *  @memberof Constants#
         *  @static
         */
        this.IMAGE = 'image';

        /**
         *  @constant {string} STPP STTP Subtitles format
         *  @memberof Constants#
         *  @static
         */
        this.STPP = 'stpp';

        /**
         *  @constant {string} TTML STTP Subtitles format
         *  @memberof Constants#
         *  @static
         */
        this.TTML = 'ttml';

        /**
         *  @constant {string} VTT STTP Subtitles format
         *  @memberof Constants#
         *  @static
         */
        this.VTT = 'vtt';

        /**
         *  @constant {string} WVTT STTP Subtitles format
         *  @memberof Constants#
         *  @static
         */
        this.WVTT = 'wvtt';

        /**
         *  @constant {string} ABR_STRATEGY_DYNAMIC Dynamic Adaptive bitrate algorithm
         *  @memberof Constants#
         *  @static
         */
        this.ABR_STRATEGY_DYNAMIC = 'abrDynamic';

        /**
         *  @constant {string} ABR_STRATEGY_BOLA Adaptive bitrate algorithm based on Bola (buffer level)
         *  @memberof Constants#
         *  @static
         */
        this.ABR_STRATEGY_BOLA = 'abrBola';

        /**
         *  @constant {string} ABR_STRATEGY_THROUGHPUT Adaptive bitrate algorithm based on throughput
         *  @memberof Constants#
         *  @static
         */
        this.ABR_STRATEGY_THROUGHPUT = 'abrThroughput';

        /**
         *  @constant {string} MOVING_AVERAGE_SLIDING_WINDOW Moving average sliding window
         *  @memberof Constants#
         *  @static
         */
        this.MOVING_AVERAGE_SLIDING_WINDOW = 'slidingWindow';

        /**
         *  @constant {string} EWMA Exponential moving average
         *  @memberof Constants#
         *  @static
         */
        this.MOVING_AVERAGE_EWMA = 'ewma';

        /**
         *  @constant {string} BAD_ARGUMENT_ERROR Invalid Arguments type of error
         *  @memberof Constants#
         *  @static
         */
        this.BAD_ARGUMENT_ERROR = 'Invalid Arguments';

        /**
         *  @constant {string} MISSING_CONFIG_ERROR Missing ocnfiguration parameters type of error
         *  @memberof Constants#
         *  @static
         */
        this.MISSING_CONFIG_ERROR = 'Missing config parameter(s)';

        this.LOCATION = 'Location';
        this.INITIALIZE = 'initialize';
        this.TEXT_SHOWING = 'showing';
        this.TEXT_HIDDEN = 'hidden';
        this.CC1 = 'CC1';
        this.CC3 = 'CC3';
        this.UTF8 = 'utf-8';
        this.SCHEME_ID_URI = 'schemeIdUri';
        this.START_TIME = 'starttime';

        this.SERVICE_DESCRIPTION_LL_SCHEME = 'urn:dvb:dash:lowlatency:scope:2019';
        this.SUPPLEMENTAL_PROPERTY_LL_SCHEME = 'urn:dvb:dash:lowlatency:critical:2019';
    }

    constructor () {
        this.init();
    }
}

const constants = new Constants();
export default constants;
