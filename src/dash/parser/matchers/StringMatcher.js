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
 * @classdesc Matches and converts xs:string to string, but only for specific attributes on specific nodes
 */
import BaseMatcher from './BaseMatcher';
import DashConstants from '../../constants/DashConstants';

class StringMatcher extends BaseMatcher {
    constructor() {
        super(
            (attr, nodeName) => {
                const stringAttrsInElements = {
                    'MPD':                        [ DashConstants.ID, DashConstants.PROFILES ],
                    'Period':                     [ DashConstants.ID ],
                    'BaseURL':                    [ DashConstants.SERVICE_LOCATION, DashConstants.BYTE_RANGE ],
                    'SegmentBase':                [ DashConstants.INDEX_RANGE ],
                    'Initialization':             [ DashConstants.RANGE ],
                    'RepresentationIndex':        [ DashConstants.RANGE ],
                    'SegmentList':                [ DashConstants.INDEX_RANGE ],
                    'BitstreamSwitching':         [ DashConstants.RANGE ],
                    'SegmentURL':                 [ DashConstants.MEDIA_RANGE, DashConstants.INDEX_RANGE ],
                    'SegmentTemplate':            [ DashConstants.INDEX_RANGE, DashConstants.MEDIA, DashConstants.INDEX, DashConstants.INITIALIZATION_MINUS, DashConstants.BITSTREAM_SWITCHING ],
                    'AssetIdentifier':            [ DashConstants.VALUE, DashConstants.ID ],
                    'EventStream':                [ DashConstants.VALUE ],
                    'AdaptationSet':              [ DashConstants.PROFILES, DashConstants.MIME_TYPE, DashConstants.SEGMENT_PROFILES, DashConstants.CODECS, DashConstants.CONTENT_TYPE ],
                    'FramePacking':               [ DashConstants.VALUE, DashConstants.ID ],
                    'AudioChannelConfiguration':  [ DashConstants.VALUE, DashConstants.ID ],
                    'ContentProtection':          [ DashConstants.VALUE, DashConstants.ID ],
                    'EssentialProperty':          [ DashConstants.VALUE, DashConstants.ID ],
                    'SupplementalProperty':       [ DashConstants.VALUE, DashConstants.ID ],
                    'InbandEventStream':          [ DashConstants.VALUE, DashConstants.ID ],
                    'Accessibility':              [ DashConstants.VALUE, DashConstants.ID ],
                    'Role':                       [ DashConstants.VALUE, DashConstants.ID ],
                    'Rating':                     [ DashConstants.VALUE, DashConstants.ID ],
                    'Viewpoint':                  [ DashConstants.VALUE, DashConstants.ID ],
                    'ContentComponent':           [ DashConstants.CONTENT_TYPE ],
                    'Representation':             [ DashConstants.ID, DashConstants.DEPENDENCY_ID, DashConstants.MEDIA_STREAM_STRUCTURE_ID ],
                    'Subset':                     [ DashConstants.ID ],
                    'Metrics':                    [ DashConstants.METRICS ],
                    'Reporting':                  [ DashConstants.VALUE, DashConstants.ID ]
                };
                if (stringAttrsInElements.hasOwnProperty(nodeName)) {
                    let attrNames = stringAttrsInElements[nodeName];
                    if (attrNames !== undefined) {
                        return attrNames.indexOf(attr.name) >= 0;
                    } else {
                        return false;
                    }
                }
                return false;
            },
            str => String(str)
        );
    }
}

export default StringMatcher;
