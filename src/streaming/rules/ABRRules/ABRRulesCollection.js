/*
 * The copyright in this software is being made available under the BSD License, included below. This software may be subject to other third party and contributor rights, including patent rights, and no such rights are granted under this license.
 * 
 * Copyright (c) 2013, Digital Primates
 * All rights reserved.
 * 
 * Redistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met:
 * •  Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer.
 * •  Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or other materials provided with the distribution.
 * •  Neither the name of the Digital Primates nor the names of its contributors may be used to endorse or promote products derived from this software without specific prior written permission.
 * 
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS “AS IS” AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */
MediaPlayer.rules.ABRRulesCollection = function () {
    "use strict";

    var qualitySwitchRules = [];

    return {
        insufficientBufferRule: undefined,
        limitSwitchesRule: undefined,
        bufferOccupancyRule:undefined,
        throughputRule:undefined,

        getRules: function (type) {
            switch (type) {
                case MediaPlayer.rules.ABRRulesCollection.prototype.QUALITY_SWITCH_RULES:
                    return qualitySwitchRules;
                default:
                    return null;
            }
        },

        setup: function () {
            qualitySwitchRules.push(this.insufficientBufferRule);
            qualitySwitchRules.push(this.throughputRule);
            qualitySwitchRules.push(this.bufferOccupancyRule); // rule in progress needs more work.
            qualitySwitchRules.push(this.limitSwitchesRule);
        }
    };
};

MediaPlayer.rules.ABRRulesCollection.prototype = {
    constructor: MediaPlayer.rules.ABRRulesCollection,
    QUALITY_SWITCH_RULES: "qualitySwitchRules"
};