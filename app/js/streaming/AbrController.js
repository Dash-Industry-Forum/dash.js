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
MediaPlayer.dependencies.AbrController = function () {
    "use strict";
    
    var autoSwitchBitrate = false,
        quality = 0;
    
    return {
        debug: undefined,
        abrRulesCollection: undefined,
        
        getAutoSwitchBitrate: function () {
            return autoSwitchBitrate;
        },
        
        getPlaybackQuality: function (metrics, data) {
            var newQuality = 999,
                ruleQuality,
                rules,
                i,
                len;
            
            this.debug.log("ABR enabled? (" + autoSwitchBitrate + ")");
            if (autoSwitchBitrate) {
                this.debug.log("Check ABR rules.");
                rules = this.abrRulesCollection.getRules();
                
                for (i = 0, len = rules.length; i < len; i += 1) {
                    ruleQuality = rules[i].checkIndex(metrics);
                    newQuality = Math.min(newQuality, ruleQuality);
                }
                
                quality = newQuality;
            }
            
            this.debug.log("Returning quality of " + newQuality);
            return Q.when(quality);
        }
    };
};

MediaPlayer.dependencies.AbrController.prototype = {
    constructor: MediaPlayer.dependencies.AbrController
};