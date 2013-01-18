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
 */
Stream.vo.SegmentRequest = (function () {
    "use strict";
    var Constr;
    Constr = function () {
        this.action = "download";
        this.startTime = NaN;
        this.duration = NaN;
        this.endRange = null;
        this.startRange = null;
        this.url = null;
        this.requestStartDate = null;
        this.requestEndDate = null;
    };
    Constr.prototype = {
        constructor: Stream.vo.SegmentRequest
    };
    return Constr;
}());

Stream.vo.StreamMetrics = (function () {
    "use strict";
    var Constr;
    Constr = function () {
        this.bitrateValue = NaN;
        this.bitrateIndex = NaN;
        this.maxBitrateIndex = NaN;
        this.bufferLength = NaN;
        this.lastFragmentDuration = NaN;
        this.lastFragmentDownloadTime = NaN;
    };
    Constr.prototype = {
        constructor: Stream.vo.StreamMetrics
    };
    return Constr;
}());

Stream.vo.StreamItem = (function () {
    "use strict";
    var Constr;
    Constr = function () {
        this.id = null;
        this.bandwidth = 0;
    };
    Constr.prototype = {
        constructor: Stream.vo.StreamItem
    };
    return Constr;
}());