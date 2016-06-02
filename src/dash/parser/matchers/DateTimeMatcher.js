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
 * @classdesc matches and converts xs:datetime to Date
 */
import BaseMatcher from './BaseMatcher';

const SECONDS_IN_MIN = 60;
const MINUTES_IN_HOUR = 60;
const MILLISECONDS_IN_SECONDS = 1000;

const datetimeRegex = /^([0-9]{4})-([0-9]{2})-([0-9]{2})T([0-9]{2}):([0-9]{2})(?::([0-9]*)(\.[0-9]*)?)?(?:([+-])([0-9]{2})(?::?)([0-9]{2}))?/;

class DateTimeMatcher extends BaseMatcher {
    constructor() {
        super(
            attr => datetimeRegex.test(attr.value),
            str => {
                const match = datetimeRegex.exec(str);
                let utcDate;

                // If the string does not contain a timezone offset different browsers can interpret it either
                // as UTC or as a local time so we have to parse the string manually to normalize the given date value for
                // all browsers
                utcDate = Date.UTC(
                    parseInt(match[1], 10),
                    parseInt(match[2], 10) - 1, // months start from zero
                    parseInt(match[3], 10),
                    parseInt(match[4], 10),
                    parseInt(match[5], 10),
                    (match[6] && parseInt(match[6], 10) || 0),
                    (match[7] && parseFloat(match[7]) * MILLISECONDS_IN_SECONDS) || 0);

                // If the date has timezone offset take it into account as well
                if (match[9] && match[10]) {
                    const timezoneOffset = parseInt(match[9], 10) * MINUTES_IN_HOUR + parseInt(match[10], 10);
                    utcDate += (match[8] === '+' ? -1 : +1) * timezoneOffset * SECONDS_IN_MIN * MILLISECONDS_IN_SECONDS;
                }

                return new Date(utcDate);
            }
        );
    }
}

export default DateTimeMatcher;
