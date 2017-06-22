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
 * @classdesc a RepresentationBaseValuesMap type for input to objectiron
 */
import MapNode from './MapNode';
import DashConstants from '../../constants/DashConstants';

class RepresentationBaseValuesMap extends MapNode {
    constructor() {
        const commonProperties = [
            DashConstants.PROFILES, DashConstants.WIDTH, DashConstants.HEIGHT, DashConstants.SAR, DashConstants.FRAMERATE, DashConstants.AUDIO_SAMPLING_RATE, DashConstants.MIME_TYPE, DashConstants.SEGMENT_PROFILES, DashConstants.CODECS, DashConstants.MAXIMUM_SAP_PERIOD, DashConstants.START_WITH_SAP, DashConstants.MAX_PLAYOUT_RATE, DashConstants.CODING_DEPENDENCY, DashConstants.SCAN_TYPE, DashConstants.FRAME_PACKING, DashConstants.AUDIO_CHANNEL_CONFIGURATION, DashConstants.CONTENT_PROTECTION, DashConstants.ESSENTIAL_PROPERTY, DashConstants.SUPPLEMENTAL_PROPERTY, DashConstants.INBAND_EVENT_STREAM
        ];

        super(DashConstants.ADAPTATION_SET, commonProperties, [
            new MapNode(DashConstants.REPRESENTATION, commonProperties, [
                new MapNode(DashConstants.SUB_REPRESENTATION, commonProperties)
            ])
        ]);
    }
}

export default RepresentationBaseValuesMap;
