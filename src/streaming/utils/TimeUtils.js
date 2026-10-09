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

import FactoryMaker from '../../core/FactoryMaker.js';

/**
 * @module TimeUtils
 * @ignore
 * @description Provides utility functions for time manipulation/conversion
 */
function TimeUtils() {

    let instance;

    /**
     * Convert NTP timestamp into an UTC timestamp
     * @return {number}
     * @param {number} ntpTimestamp
     * @memberof module:TimeUtils
     * @instance
     */
    function ntpToUTC(ntpTimeStamp) {
        const start = new Date(Date.UTC(1900, 0, 1, 0, 0, 0));
        return new Date(start.getTime() + ntpTimeStamp).getTime();
    }

    /**
     * Format a UTC time (in seconds) as a locale time string, optionally with the date appended.
     * @param {number} time - UTC time in seconds
     * @param {string} locales - locale string(s) passed to Date#toLocaleTimeString
     * @param {boolean} hour12 - 12 vs 24 hour formatting
     * @param {boolean} withDate - append the date
     * @return {string}
     * @memberof module:TimeUtils
     * @instance
     */
    function formatUTC(time, locales, hour12, withDate = false) {
        const dt = new Date(time * 1000);
        const d = dt.toLocaleDateString(locales);
        const t = dt.toLocaleTimeString(locales, {
            hour12: hour12
        });
        return withDate ? t + ' ' + d : t;
    }

    /**
     * Convert seconds into a time code string (i.e. 300 --> 05:00).
     * @param {number} value - seconds
     * @return {string}
     * @memberof module:TimeUtils
     * @instance
     */
    function convertToTimeCode(value) {
        value = Math.max(value, 0);

        let h = Math.floor(value / 3600);
        let m = Math.floor((value % 3600) / 60);
        let s = Math.floor((value % 3600) % 60);
        return (h === 0 ? '' : (h < 10 ? '0' + h.toString() + ':' : h.toString() + ':')) + (m < 10 ? '0' + m.toString() : m.toString()) + ':' + (s < 10 ? '0' + s.toString() : s.toString());
    }

    instance = {
        convertToTimeCode,
        formatUTC,
        ntpToUTC
    };

    return instance;
}

TimeUtils.__dashjs_factory_name = 'TimeUtils';
export default FactoryMaker.getSingletonFactory(TimeUtils);
