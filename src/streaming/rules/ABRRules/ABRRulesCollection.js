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
import ThroughputRule from './ThroughputRule.js'
import BufferOccupancyRule from './BufferOccupancyRule.js'
import InsufficientBufferRule from './InsufficientBufferRule.js'
import FactoryMaker from '../../../core/FactoryMaker.js';

export default FactoryMaker.getSingletonFactory(ABRRulesCollection);

function ABRRulesCollection(config) {
    "use strict";

    const QUALITY_SWITCH_RULES = "qualitySwitchRules";
    const ABANDON_FRAGMENT_RULES = "abandonFragmentRules";

    //TODO Temp until dijon is removed no setConfig due to being temp.
    let system = config.system,
        playbackController = config ? config.playbackController : null;

    let instance = {
        QUALITY_SWITCH_RULES    :QUALITY_SWITCH_RULES,
        ABANDON_FRAGMENT_RULES  :ABANDON_FRAGMENT_RULES,
        getRules                :getRules
    };

    setup();

    return instance;

    let qualitySwitchRules,
        abandonFragmentRules;

    function setup() {
        qualitySwitchRules = [];
        abandonFragmentRules = [];

        qualitySwitchRules.push(ThroughputRule.create({
                log:system.getObject("log"),
                metricsExt:system.getObject("metricsExt"),
                metricsModel:system.getObject("metricsModel"),
                manifestExt:system.getObject("manifestExt"),
                manifestModel:system.getObject("manifestModel")
            })
        );

        qualitySwitchRules.push(BufferOccupancyRule.create({
                log:system.getObject("log"),
                metricsModel:system.getObject("metricsModel")
            })
        );

        qualitySwitchRules.push(InsufficientBufferRule.create({
                log:system.getObject("log"),
                metricsModel:system.getObject("metricsModel"),
                playbackController: playbackController
            })
        );

        //adandonFragmentRules.push(this.abandonRequestRule);
    }

    function getRules (type) {
        switch (type) {
            case QUALITY_SWITCH_RULES:
                return qualitySwitchRules;
            case ABANDON_FRAGMENT_RULES:
                return abandonFragmentRules;
            default:
                return null;
        }
    }
};
