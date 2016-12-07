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

import FactoryMaker from '../../../core/FactoryMaker';

function MetricSerialiser() {

    // For each entry in the top level list within the metric (in the case
    // of the DVBErrors metric each entry corresponds to an "error event"
    // described in clause 10.8.4) the Player shall:
    function serialise(metric) {
        var pairs = [];
        var obj = [];
        var key,
            value;

        // Take each (key, value) pair from the metric entry and create a
        // string consisting of the name of the key, followed by an equals
        // ('=') character, followed by the string representation of the
        // value. The string representation of the value is created based
        // on the type of the value following the instructions in Table 22.
        for (key in metric) {
            if (metric.hasOwnProperty(key) && (key.indexOf('_') !== 0)) {
                value = metric[key];

                // we want to ensure that keys still end up in the report
                // even if there is no value
                if ((value === undefined) || (value === null)) {
                    value = '';
                }

                // DVB A168 10.12.4 Table 22
                if (Array.isArray(value)) {
                    // if trace or similar is null, do not include in output
                    if (!value.length) {
                        continue;
                    }

                    obj = [];

                    value.forEach(function (v) {
                        var isBuiltIn = Object.prototype.toString.call(v).slice(8, -1) !== 'Object';

                        obj.push(isBuiltIn ? v : serialise(v));
                    });

                    value = obj.map(encodeURIComponent).join(',');
                } else if (typeof value === 'string') {
                    value = encodeURIComponent(value);
                } else if (value instanceof Date) {
                    value = value.toISOString();
                } else if (typeof value === 'number') {
                    value = Math.round(value);
                }

                pairs.push(key + '=' + value);
            }
        }

        // Concatenate the strings created in the previous step with an
        // ampersand ('&') character between each one.
        return pairs.join('&');
    }

    return {
        serialise: serialise
    };
}

MetricSerialiser.__dashjs_factory_name = 'MetricSerialiser';
export default FactoryMaker.getSingletonFactory(MetricSerialiser);
