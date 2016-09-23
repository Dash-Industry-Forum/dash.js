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
import ThroughputRule from './ThroughputRule';
import InsufficientBufferRule from './InsufficientBufferRule';
import AbandonRequestsRule from './AbandonRequestsRule';
import DroppedFramesRule from './DroppedFramesRule.js';
import SwitchHistoryRule from './SwitchHistoryRule.js';
import BolaRule from './BolaRule';
import BolaAbandonRule from './BolaAbandonRule';
import MediaPlayerModel from '../../models/MediaPlayerModel';
import MetricsModel from '../../models/MetricsModel';
import DashMetrics from '../../../dash/DashMetrics';
import FactoryMaker from '../../../core/FactoryMaker';

const QUALITY_SWITCH_RULES = 'qualitySwitchRules';
const ABANDON_FRAGMENT_RULES = 'abandonFragmentRules';

function ABRRulesCollection() {

    let context = this.context;

    let instance,
        qualitySwitchRules,
        abandonFragmentRules;

    function initialize() {
        qualitySwitchRules = [];
        abandonFragmentRules = [];

        let metricsModel = MetricsModel(context).getInstance();
        let dashMetrics = DashMetrics(context).getInstance();
        let mediaPlayerModel = MediaPlayerModel(context).getInstance();

        if (mediaPlayerModel.getBufferOccupancyABREnabled()) {
            qualitySwitchRules.push(
                BolaRule(context).create({
                    metricsModel: metricsModel,
                    dashMetrics: DashMetrics(context).getInstance()
                })
            );
            abandonFragmentRules.push(
                BolaAbandonRule(context).create({
                    metricsModel: metricsModel,
                    dashMetrics: DashMetrics(context).getInstance()
                })
            );
        } else {
            qualitySwitchRules.push(
                ThroughputRule(context).create({
                    metricsModel: metricsModel,
                    dashMetrics: dashMetrics
                })
            );

            qualitySwitchRules.push(InsufficientBufferRule(context).create({metricsModel: metricsModel}));
            qualitySwitchRules.push(SwitchHistoryRule(context).create());
            qualitySwitchRules.push(DroppedFramesRule(context).create());
            abandonFragmentRules.push(AbandonRequestsRule(context).create());
        }
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

    function getMaxQuality(rulesContext) {
        let maxQualityArray = qualitySwitchRules.map((rule) => { return rule.getMaxIndex(rulesContext) });
        let active = maxQualityArray.filter((quality) => {return quality >= 0;});

        return active.length > 0 ? Math.min(...active) : -1;
    }

    function shouldAbandonFragment(streamProcessor, e, playbackQuality) {
        //TODO Sketchy, replace by simple yes/no.
        return abandonFragmentRules.reduce(function (a, bRule) {
            let b = bRule.shouldAbandon(streamProcessor, e, playbackQuality);
            if (a.priority > b.priority) {
                return a;
            } else if (b.priority > a.priority) {
                return b;
            } else {
                if (a.value < b.value) {
                    return a;
                } else {
                    return b;
                }
            }
        });
    }

    instance = {
        initialize: initialize,
        getRules: getRules,
        getMaxQuality: getMaxQuality,
        shouldAbandonFragment: shouldAbandonFragment
    };

    return instance;
}

ABRRulesCollection.__dashjs_factory_name = 'ABRRulesCollection';
//TODO make not singleton
let factory =  FactoryMaker.getSingletonFactory(ABRRulesCollection);
factory.QUALITY_SWITCH_RULES = QUALITY_SWITCH_RULES;
factory.ABANDON_FRAGMENT_RULES = ABANDON_FRAGMENT_RULES;
export default factory;
