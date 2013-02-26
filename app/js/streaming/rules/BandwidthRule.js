

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
MediaPlayer.rules.BandwidthRule = function () {
    "use strict";
    
    var rules;
    
    return {
        debug: undefined,
        
        checkIndex: function (metrics) {
            if (!metrics) {
                return -1;
            }
            
            var newIdx = -1,
                downloadRatio = metrics.lastFragmentDuration / metrics.lastFragmentDownloadTime,
                switchRatio;

            this.debug.log("Check bandwidth rule.");
            this.debug.log("Current quality index: " + metrics.bitrateIndex);
            this.debug.log("Download ratio: " + downloadRatio);

            if (isNaN(downloadRatio)) {
                this.debug.log("Invalid ratio, bail!");
                newIdx = -1;
            } else if (downloadRatio < 1.0) {
                this.debug.log("Download ratio is poor.");
                if (metrics.bitrateIndex > 0) {
                    this.debug.log("We are not at the lowest bitrate, so switch down.");
                    
                    switchRatio = metrics.getBitrateForIndex(metrics.bitrateIndex - 1) / metrics.getBitrateForIndex(metrics.bitrateIndex);
                    this.debug.log("Switch ratio: " + switchRatio);
                    
                    if (downloadRatio < switchRatio) {
                        this.debug.log("Things must be going pretty bad, switch all the way down.");
                        newIdx = 0;
                    } else {
                        this.debug.log("Things could be better, so just switch down one index.");
                        newIdx = metrics.bitrateIndex - 1;
                    }
                }
            } else {
                this.debug.log("Download ratio is good.");
                if (metrics.bitrateIndex < metrics.maxBitrateIndex) {
                    this.debug.log("We are not at the highest bitrate, so switch up.");
                    
                    switchRatio = metrics.getBitrateForIndex(metrics.bitrateIndex + 1) / metrics.getBitrateForIndex(metrics.bitrateIndex);
                    this.debug.log("Switch ratio: " + switchRatio);
                    
                    if (downloadRatio >= switchRatio) {
                        if (downloadRatio > 1000.0) {
                            this.debug.log("Tons of bandwidth available, go all the way up.");
                            newIdx = metrics.maxBitrateIndex - 1;
                        }
                        else if (downloadRatio > 100.0) {
                            this.debug.log("Just enough bandwidth available, switch up one.");
                            newIdx = metrics.bitrateIndex + 1;
                        }
                        else {
                            this.debug.log("Not exactly sure where to go, so do some math.");
                            while ((newIdx += 1) < metrics.maxBitrateIndex + 1) {
                                switchRatio = metrics.getBitrateForIndex(newIdx) / metrics.getBitrateForIndex(metrics.bitrateIndex);
                                if (downloadRatio < switchRatio) {
                                    break;
                                }
                            }
                            this.debug.log("Calculated ideal new quality index is: " + newIdx);
                            newIdx -= 1;
                        }
                    } else {
                        this.debug.log("Not enough bandwidth to switch up.");
                    }
                }
            }

            this.debug.log("Proposed index: " + newIdx);
            return newIdx;
        }
    };
};

MediaPlayer.rules.BandwidthRule.prototype = {
    constructor: MediaPlayer.rules.BandwidthRule
};