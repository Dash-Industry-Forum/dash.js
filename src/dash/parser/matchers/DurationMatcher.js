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
 * @classdesc matches and converts xs:duration to seconds
 */
import BaseMatcher from './BaseMatcher';
import Constants from '../../../streaming/constants/Constants';
import DashConstants from '../../constants/DashConstants';
import moment from 'moment';

class DurationMatcher extends BaseMatcher {
    constructor() {
        super(
            attr => {
                const attributeList = [
                    DashConstants.MIN_BUFFER_TIME, DashConstants.MEDIA_PRESENTATION_DURATION,
                    DashConstants.MINIMUM_UPDATE_PERIOD, DashConstants.TIMESHIFT_BUFFER_DEPTH, DashConstants.MAX_SEGMENT_DURATION,
                    DashConstants.MAX_SUBSEGMENT_DURATION, Constants.SUGGESTED_PRESENTATION_DELAY, DashConstants.START,
                    Constants.START_TIME, DashConstants.DURATION
                ];
                const len = attributeList.length;

                for (let i = 0; i < len; i++) {
                    if (attr.nodeName === attributeList[i]) {
                        return moment.duration(attr.value, moment.ISO_8601).isValid();
                    }
                }

                return false;
            },
            str => {
                var t = moment.unix(0).utc();
                t.add(moment.duration(str, moment.ISO_8601));
                return t.unix();
            }
        );
    }
}

export default DurationMatcher;
