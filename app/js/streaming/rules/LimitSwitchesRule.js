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
 * author Digital Primates
 * copyright dash-if 2012
 */
MediaPlayer.rules.LimitSwitchesRule = function () {
    "use strict";

    /*
     * This rule is intended to limit the number of switches that can happen.
     * We might get into a situation where there quality is bouncing around a ton.
     * This can create an unpleasant experience, so let the stream settle down.
     */

    var MAX_SWITCHES = 10,
        VALIDATION_TIME = 20000,
        WAIT_COUNT = 5,
        waiting = 0;

    return {
        debug: undefined,

        checkIndex: function (current, metrics, data) {
            if (waiting > 0) {
                waiting -= 1;
                return Q.when(new MediaPlayer.rules.SwitchRequest(current, MediaPlayer.rules.SwitchRequest.prototype.STRONG));
            }

            var self = this,
                panic = false,
                rs,
                now = new Date().getTime(),
                delay,
                i,
                numSwitches = metrics.RepSwitchList.length;

            self.debug.log("Checking limit switches rule...");

            for (i = numSwitches - 1; i >= 0; i -= 1) {
                rs = metrics.RepSwitchList[i];
                delay = now - rs.t.getTime();

                if (delay >= VALIDATION_TIME) {
                    self.debug.log("Reached time limit, bailing.");
                    break;
                }

                if (i >= MAX_SWITCHES) {
                    self.debug.log("Found too many switches within validation time, force the stream to not change.");
                    panic = true;
                    break;
                }
            }

            if (panic) {
                self.debug.log("Wait some time before allowing another switch.");
                waiting = WAIT_COUNT;
                return Q.when(new MediaPlayer.rules.SwitchRequest(current, MediaPlayer.rules.SwitchRequest.prototype.STRONG));
            } else {
                return Q.when(new MediaPlayer.rules.SwitchRequest(MediaPlayer.rules.SwitchRequest.prototype.NO_CHANGE, MediaPlayer.rules.SwitchRequest.prototype.STRONG));
            }
        }
    };
};

MediaPlayer.rules.LimitSwitchesRule.prototype = {
    constructor: MediaPlayer.rules.LimitSwitchesRule
};