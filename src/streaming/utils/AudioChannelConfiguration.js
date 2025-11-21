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
    '1': { channels: 1, lfe: 0 },
    '2': { channels: 2, lfe: 0 },
    '3': { channels: 3, lfe: 0 },
    '4': { channels: 4, lfe: 0 },
    '5': { channels: 5, lfe: 0 },
    '6': { channels: 5, lfe: 1 },
    '7': { channels: 7, lfe: 1 },
    '8': { channels: 2, lfe: 0 },
    '9': { channels: 3, lfe: 0 },
    '10': { channels: 4, lfe: 0 },
    '11': { channels: 6, lfe: 1 },
    '12': { channels: 7, lfe: 1 },
    '13': { channels: 22, lfe: 2 },
    '14': { channels: 7, lfe: 1 },
    '15': { channels: 10, lfe: 2 },
    '16': { channels: 9, lfe: 1 },
    '17': { channels: 11, lfe: 1 },
    '18': { channels: 13, lfe: 1 },
    '19': { channels: 11, lfe: 1 },
    '20': { channels: 13, lfe: 1 },
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

function _getNChanDolby2011(value, includeLFE) {
    if ( value.length !== 4 ) {
        return undefined;
    }

    // see ETSI TS 103190-1, table F.1:
    // 0b1111100110001000: single channel flags
    // 0b0000011001110000: channel pair flags
    // 0b0000000000000110: LFE channels
    const single_channel_flags = 0b1111100110001000 + (includeLFE ? 0b0000000000000110 : 0);
    const channel_pair_flags = 0b0000011001110000;
    return _getNChanFromBitMask(value, [single_channel_flags, channel_pair_flags]);
}

function _getNChanDolby2015(value, includeLFE) {
    if ( value.length !== 6 ) {
        return undefined;
    }

    if ( value === '800000' ) {
        // object audio
        return 24;
    }

    // see ETSI TS 103190-2, table A.27
    // 0b001100111000000010: single channel flags
    // 0b110010000110111101: channel pair flags
    // 0b000001000001000000: LFE channels
    const single_channel_flags = 0b001101111000000010 + (includeLFE ? 0b000001000001000000 : 0);
    const channel_pair_flags = 0b110010000110111101;
    return _getNChanFromBitMask(value, [single_channel_flags, channel_pair_flags]);
}

function _getNChanDTSUHD(value, includeLFE) {
    if ( value.length > 8 ) {
        return undefined;
    }

    // see ETSI TS 103491, table B-5
    // LFE: 0x00010000 + 0x00000020
    const mask = 0xFFFEFFDF + (includeLFE ? 0x00010020 : 0)
    return _getNChanFromBitMask(value, [mask, 0x00000000]);
}

function getNChanFromAudioChannelConfig(audioChannelConfiguration, includeLFE = false) {
    let nChan = undefined;

    if ( !audioChannelConfiguration || !audioChannelConfiguration.schemeIdUri || !audioChannelConfiguration.value ) {
        return undefined;
    }

    const scheme = audioChannelConfiguration['schemeIdUri'];
    const value = audioChannelConfiguration['value'];

    if (scheme === 'urn:mpeg:dash:23003:3:audio_channel_configuration:2011' || scheme === 'urn:mpeg:mpegB:cicp:ChannelConfiguration') {
        // see ISO/IEC 23091-3
        nChan = _mapping_CICP[value] && (_mapping_CICP[value].channels + (includeLFE ? _mapping_CICP[value].lfe : 0));
    } else if (scheme === 'tag:dolby.com,2014:dash:audio_channel_configuration:2011') {
        nChan = _getNChanDolby2011(value, includeLFE);
    } else if (scheme === 'tag:dolby.com,2015:dash:audio_channel_configuration:2015') {
        nChan = _getNChanDolby2015(value, includeLFE);
    } else if (scheme === 'tag:dts.com,2014:dash:audio_channel_configuration:2012') {
        nChan = parseInt(value); // per ETSI TS 102 114,table G.2, this includes LFE
    } else if (scheme === 'tag:dts.com,2018:uhd:audio_channel_configuration') {
        nChan = _getNChanDTSUHD(value, includeLFE);
    }
    return nChan;
}

export default getNChanFromAudioChannelConfig;
