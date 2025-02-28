/**
 * The copyright in this software is being made available under the BSD License,
 * included below. This software may be subject to other third party and contributor
 * rights, including patent rights, and no such rights are granted under this license.
 *
 * Copyright (c) 2025, Dash Industry Forum.
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
 *  NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES, LOSS OF USE, DATA, OR
 *  PROFITS, OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY,
 *  WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
 *  ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
 *  POSSIBILITY OF SUCH DAMAGE.
 */



// derived from ISO/IEC 23091-3
const _mapping_CICP = {
    '0': undefined,
    '1': 1,
    '2': 2,
    '3': 3,
    '4': 4,
    '5': 5,
    '6': 5,
    '7': 7,
    '8': 2,
    '9': 3,
    '10': 4,
    '11': 6,
    '12': 7,
    '13': 22,
    '14': 7,
    '15': 10,
    '16': 9,
    '17': 11,
    '18': 13,
    '19': 11,
    '20': 13
};

function _countBits(n) {
    return n == 0 ? 0 : n.toString(2).match(/1/g).length;
}

function _getNChanFromBitMask(value, masks) {
    let nChan = undefined;
    let intVal = parseInt('0x' + value, 16);

    let singleChannels = intVal & masks[0];
    let ChannelPairs = intVal & masks[1];
    nChan = _countBits(singleChannels) + 2 * _countBits(ChannelPairs);

    return nChan;
}

function _getNChanDolby2011(value) {
    if ( value.length !== 4 ) {
        return undefined;
    }

    // see ETSI TS 103190-1, table F.1:
    // 0b1111100110001000: single channel flags
    // 0b0000011001110000: channel pair flags
    return _getNChanFromBitMask(value, [0b1111100110001000, 0b0000011001110000]);
}

function _getNChanDolby2015(value) {
    if ( value.length !== 6 ) {
        return undefined;
    }

    if ( value === '800000' ) {
        // object audio
        return 24;
    }

    // see ETSI TS 103190-2, table A.27
    // 0b001101111000000010: single channel flags
    // 0b110010000110111101: channel pair flags
    return _getNChanFromBitMask(value, [0b001101111000000010, 0b110010000110111101]);
}

function _getNChanDTSUHD(value) {
    if ( value.length > 8 ) {
        return undefined;
    }

    // see ETSI TS 103491, table B-5
    // LFE to exclude: 0x00010000 + 0x00000020
    return _getNChanFromBitMask(value, [0xFFFEFFDF, 0x00000000]);
}

function getNChanFromAudioChannelConfig(audioChannelConfiguration) {
    let nChan = undefined;

    if ( !audioChannelConfiguration || !audioChannelConfiguration.schemeIdUri || !audioChannelConfiguration.value ) {
        return undefined;
    }

    const scheme = audioChannelConfiguration['schemeIdUri'];
    const value = audioChannelConfiguration['value'];

    if (scheme === 'urn:mpeg:dash:23003:3:audio_channel_configuration:2011' || scheme === 'urn:mpeg:mpegB:cicp:ChannelConfiguration') {
        // see ISO/IEC 23091-3
        nChan = _mapping_CICP[value];
    } else if (scheme === 'tag:dolby.com,2014:dash:audio_channel_configuration:2011') {
        nChan = _getNChanDolby2011(value);
    } else if (scheme === 'tag:dolby.com,2015:dash:audio_channel_configuration:2015') {
        nChan = _getNChanDolby2015(value);
    } else if (scheme === 'tag:dts.com,2014:dash:audio_channel_configuration:2012') {
        nChan = parseInt(value); // per ETSI TS 102 114,table G.2, this includes LFE
    } else if (scheme === 'tag:dts.com,2018:uhd:audio_channel_configuration') {
        nChan = _getNChanDTSUHD(value);
    }
    return nChan;
}

export default getNChanFromAudioChannelConfig;
