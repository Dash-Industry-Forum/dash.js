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

const durationRegex = /^([-])?P(([\d.]*)Y)?(([\d.]*)M)?(([\d.]*)D)?T?(([\d.]*)H)?(([\d.]*)M)?(([\d.]*)S)?/;

const SECONDS_IN_YEAR = 365 * 24 * 60 * 60;
const SECONDS_IN_MONTH = 30 * 24 * 60 * 60;
const SECONDS_IN_DAY = 24 * 60 * 60;
const SECONDS_IN_HOUR = 60 * 60;
const SECONDS_IN_MIN = 60;

class DurationMatcher extends BaseMatcher {
    constructor() {
        super(
            attr => {
                const attributeList = [
                    'minBufferTime', 'mediaPresentationDuration',
                    'minimumUpdatePeriod', 'timeShiftBufferDepth', 'maxSegmentDuration',
                    'maxSubsegmentDuration', 'suggestedPresentationDelay', 'start',
                    'starttime', 'duration'
                ];
                const len = attributeList.length;

                for (let i = 0; i < len; i++) {
                    if (attr.nodeName === attributeList[i]) {
                        return durationRegex.test(attr.value);
                    }
                }

                return false;
            },
            str => {
                //str = "P10Y10M10DT10H10M10.1S";
                const match = durationRegex.exec(str);
                let result = (parseFloat(match[2] || 0) * SECONDS_IN_YEAR +
                    parseFloat(match[4] || 0) * SECONDS_IN_MONTH +
                    parseFloat(match[6] || 0) * SECONDS_IN_DAY +
                    parseFloat(match[8] || 0) * SECONDS_IN_HOUR +
                    parseFloat(match[10] || 0) * SECONDS_IN_MIN +
                    parseFloat(match[12] || 0));

                if (match[1] !== undefined) {
                    result = -result;
                }

                return result;
            }
        );
    }
}

export default DurationMatcher;
