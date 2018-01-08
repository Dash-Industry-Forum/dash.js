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
 */
class Constants {

    init () {
        this.STREAM = 'stream';
        this.VIDEO = 'video';
        this.AUDIO = 'audio';
        this.TEXT = 'text';
        this.FRAGMENTED_TEXT = 'fragmentedText';
        this.EMBEDDED_TEXT = 'embeddedText';
        this.MUXED = 'muxed';
        this.IMAGE = 'image';
        this.LOCATION = 'Location';
        this.INITIALIZE = 'initialize';
        this.TEXT_SHOWING = 'showing';
        this.TEXT_HIDDEN = 'hidden';
        this.CC1 = 'CC1';
        this.CC3 = 'CC3';
        this.STPP = 'stpp';
        this.TTML = 'ttml';
        this.VTT = 'vtt';
        this.WVTT = 'wvtt';
        this.UTF8 = 'utf-8';
        this.SUGGESTED_PRESENTATION_DELAY = 'suggestedPresentationDelay';
        this.SCHEME_ID_URI = 'schemeIdUri';
        this.START_TIME = 'starttime';
        this.ABR_STRATEGY_DYNAMIC = 'abrDynamic';
        this.ABR_STRATEGY_BOLA = 'abrBola';
        this.ABR_STRATEGY_THROUGHPUT = 'abrThroughput';
        this.MOVING_AVERAGE_SLIDING_WINDOW = 'slidingWindow';
        this.MOVING_AVERAGE_EWMA = 'ewma';
    }

    constructor () {
        this.init();
    }
}

let constants = new Constants();
export default constants;
