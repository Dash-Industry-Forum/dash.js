/*
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * copyright Digital Primates 2012
 */
Stream.modules.MbrManager = (function () {
    "use strict";

    var Constr;
    Constr = function () {
        this.rules = this.createRules();
    };

    Constr.prototype = {
        constructor: Stream.modules.MbrManager,

        createRules: function () {
            return [new Stream.rules.BandwidthRule()];
        },

        checkRules: function (metrics, items) {
            var idx = 999,
                i,
                max,
                r,
                newIdx;

            for (i = 0, max = this.rules.length; i < max; i += 1) {
                r = this.rules[i];
                newIdx = r.checkIndex(metrics, items);
                if (newIdx !== -1) {
                    idx = Math.min(idx, newIdx);
                }
            }

            if (idx === 999 || idx === -1) {
                idx = metrics.bitrateIndex;
            }

            return idx;
        }
    };

    return Constr;
}());