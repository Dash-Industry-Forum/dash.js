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
import DroppedFramesRule from './DroppedFramesRule';
import SwitchHistoryRule from './SwitchHistoryRule';
import BolaRule from './BolaRule';
import L2ARule from './L2ARule.js';
import LoLPRule from './lolp/LoLpRule.js';
import FactoryMaker from '../../../core/FactoryMaker';
import SwitchRequest from '../SwitchRequest';
import EventBus from '../../../core/EventBus';
import Events from '../../../core/events/Events';
import Constants from '../../constants/Constants';


function ABRRulesCollection(config) {

    config = config || {};
    const context = this.context;

    const mediaPlayerModel = config.mediaPlayerModel;
    const customParametersModel = config.customParametersModel;
    const dashMetrics = config.dashMetrics;
    const settings = config.settings;
    const eventBus = EventBus(context).getInstance();

    let instance,
        qualitySwitchRules,
        abandonFragmentRules,
        shouldUseBolaRuleByMediaType;

    function initialize() {
        qualitySwitchRules = [];
        abandonFragmentRules = [];
        shouldUseBolaRuleByMediaType = {};
        _updateRules();

        eventBus.on(Events.SETTING_UPDATED_ABR_ACTIVE_RULES, _onAbrSettingsActiveRulesUpdated, instance);
    }

    /**
     * Adds and removes rules to/from the respective rules arrays
     * @private
     */
    function _updateRules() {
        let qualitySwitchRulesList = Object.values(Constants.QUALITY_SWITCH_RULES)
        qualitySwitchRulesList.forEach((ruleName) => {
            qualitySwitchRules = _handleRuleUpdate(ruleName, qualitySwitchRules)
        })

        let abandonFragmentRulesList = Object.values(Constants.ABANDON_FRAGMENT_RULES)
        abandonFragmentRulesList.forEach((ruleName) => {
            abandonFragmentRules = _handleRuleUpdate(ruleName, abandonFragmentRules)
        })

        // add custom ABR rules if any
        const customRules = customParametersModel.getAbrCustomRules();
        customRules.forEach(function (rule) {
            if (rule.type === Constants.RULES_TYPES.QUALITY_SWITCH_RULES) {
                qualitySwitchRules.push(rule.rule(context).create());
            }

            if (rule.type === Constants.RULES_TYPES.ABANDON_FRAGMENT_RULES) {
                abandonFragmentRulesList.push(rule.rule(context).create());
            }
        });

        // If we still got no rule for quality switch use Throughput and Bola
        if (qualitySwitchRules.length === 0) {
            qualitySwitchRules.push(
                BolaRule(context).create({
                    dashMetrics: dashMetrics,
                    mediaPlayerModel: mediaPlayerModel,
                    settings: settings
                })
            );
            qualitySwitchRules.push(
                ThroughputRule(context).create({
                    dashMetrics: dashMetrics
                })
            );
        }
    }

    function _handleRuleUpdate(ruleName, rulesCollection) {
        // we use camel case in the settings while the rules start with a capital latter. Not ideal but convert between these formats
        const attribute = ruleName.charAt(0).toLowerCase() + ruleName.slice(1);
        if (settings.get().streaming.abr.activeRules[attribute] && !_arrayContainsRule(rulesCollection, ruleName)) {
            rulesCollection.push(
                _createRuleInstance(ruleName)
            );

            return rulesCollection
        } else if (!settings.get().streaming.abr.activeRules[attribute]) {
            return _removeRuleFromArray(rulesCollection, ruleName)
        }

        return rulesCollection
    }

    function _createRuleInstance(rule) {
        switch (rule) {
            case Constants.QUALITY_SWITCH_RULES.BOLA_RULE:
                return BolaRule(context).create({
                    dashMetrics: dashMetrics,
                    mediaPlayerModel: mediaPlayerModel,
                    settings: settings
                })
            case Constants.QUALITY_SWITCH_RULES.THROUGHPUT_RULE:
                return ThroughputRule(context).create({
                    dashMetrics: dashMetrics
                })
            case Constants.QUALITY_SWITCH_RULES.INSUFFICIENT_BUFFER_RULE:
                return InsufficientBufferRule(context).create({
                    dashMetrics: dashMetrics,
                    settings
                })
            case Constants.QUALITY_SWITCH_RULES.SWITCH_HISTORY_RULE:
                return SwitchHistoryRule(context).create()
            case Constants.QUALITY_SWITCH_RULES.DROPPED_FRAMES_RULE:
                return DroppedFramesRule(context).create()
            case Constants.QUALITY_SWITCH_RULES.LEARN_TO_ADAPT_RULE:
                return L2ARule(context).create({
                    dashMetrics: dashMetrics,
                    settings: settings
                })
            case Constants.QUALITY_SWITCH_RULES.LOL_PLUS_RULE:
                return LoLPRule(context).create({
                    dashMetrics: dashMetrics
                })
            case Constants.ABANDON_FRAGMENT_RULES.ABANDON_REQUEST_RULE:
                return AbandonRequestsRule(context).create({
                    dashMetrics: dashMetrics,
                    mediaPlayerModel: mediaPlayerModel,
                    settings: settings
                })

        }
    }

    function _arrayContainsRule(arr, ruleName) {
        return arr.filter((rule) => {
            return rule.getClassName() === ruleName
        }).length > 0
    }

    function _removeRuleFromArray(arr, ruleName) {
        return arr.filter((rule) => {
            return rule.getClassName() !== ruleName
        })
    }

    function _getRulesWithChange(srArray) {
        return srArray.filter(sr => sr.quality > SwitchRequest.NO_CHANGE);
    }

    /**
     *
     * @param {array} srArray
     * @return {object} SwitchRequest
     */
    function getMinSwitchRequest(srArray) {
        const values = {};
        let newSwitchReq = null;
        let i,
            len,
            req,
            quality,
            reason;

        if (srArray.length === 0) {
            return;
        }

        values[SwitchRequest.PRIORITY.STRONG] = { quality: SwitchRequest.NO_CHANGE, reason: null };
        values[SwitchRequest.PRIORITY.WEAK] = { quality: SwitchRequest.NO_CHANGE, reason: null };
        values[SwitchRequest.PRIORITY.DEFAULT] = { quality: SwitchRequest.NO_CHANGE, reason: null };

        for (i = 0, len = srArray.length; i < len; i += 1) {
            req = srArray[i];
            if (req.quality !== SwitchRequest.NO_CHANGE) {
                // We only use the new quality in case it is lower than the already saved one or if no new quality has been selected for the respective priority
                if (values[req.priority].quality === SwitchRequest.NO_CHANGE || values[req.priority].quality > req.quality) {
                    values[req.priority].quality = req.quality;
                    values[req.priority].reason = req.reason || null;
                }
            }
        }

        if (values[SwitchRequest.PRIORITY.WEAK].quality !== SwitchRequest.NO_CHANGE) {
            newSwitchReq = values[SwitchRequest.PRIORITY.WEAK];
        }

        if (values[SwitchRequest.PRIORITY.DEFAULT].quality !== SwitchRequest.NO_CHANGE) {
            newSwitchReq = values[SwitchRequest.PRIORITY.DEFAULT];
        }

        if (values[SwitchRequest.PRIORITY.STRONG].quality !== SwitchRequest.NO_CHANGE) {
            newSwitchReq = values[SwitchRequest.PRIORITY.STRONG];
        }

        if (newSwitchReq) {
            quality = newSwitchReq.quality;
            reason = newSwitchReq.reason;
        }

        return SwitchRequest(context).create(quality, reason);
    }

    function getMaxQuality(rulesContext) {
        if (!rulesContext) {
            return SwitchRequest(context).create()
        }
        // Only Throughput or Bola are active at the same time.
        const activeQualitySwitchRules = qualitySwitchRules.filter((rule) => {
            const ruleName = rule.getClassName();

            if (ruleName !== Constants.QUALITY_SWITCH_RULES.BOLA_RULE && ruleName !== Constants.QUALITY_SWITCH_RULES.THROUGHPUT_RULE) {
                return true
            }
            const mediaType = rulesContext.getMediaType();

            return (shouldUseBolaRuleByMediaType[mediaType] && ruleName === Constants.QUALITY_SWITCH_RULES.BOLA_RULE) || (!shouldUseBolaRuleByMediaType[mediaType] && ruleName === Constants.QUALITY_SWITCH_RULES.THROUGHPUT_RULE)
        })
        const switchRequestArray = activeQualitySwitchRules.map(rule => rule.getMaxIndex(rulesContext));
        const activeRules = _getRulesWithChange(switchRequestArray);
        const maxQuality = getMinSwitchRequest(activeRules);

        return maxQuality || SwitchRequest(context).create();
    }

    function shouldAbandonFragment(rulesContext, streamId) {
        const abandonRequestArray = abandonFragmentRules.map(rule => rule.shouldAbandon(rulesContext, streamId));
        const activeRules = _getRulesWithChange(abandonRequestArray);
        const shouldAbandon = getMinSwitchRequest(activeRules);

        return shouldAbandon || SwitchRequest(context).create();
    }

    function reset() {
        [qualitySwitchRules, abandonFragmentRules].forEach(rules => {
            if (rules && rules.length) {
                rules.forEach(rule => rule.reset && rule.reset());
            }
        });
        qualitySwitchRules = [];
        abandonFragmentRules = [];
        shouldUseBolaRuleByMediaType = {}
        eventBus.off(Events.SETTING_UPDATED_ABR_ACTIVE_RULES, _onAbrSettingsActiveRulesUpdated, instance);
    }

    function getQualitySwitchRules() {
        return qualitySwitchRules;
    }

    function getAbandonFragmentRules() {
        return abandonFragmentRules
    }

    function setBolaState(mediaType, value) {
        shouldUseBolaRuleByMediaType[mediaType] = value
    }

    function getBolaState(mediaType) {
        return shouldUseBolaRuleByMediaType[mediaType]
    }

    function _onAbrSettingsActiveRulesUpdated() {
        _updateRules()
    }

    instance = {
        initialize,
        reset,
        getMaxQuality,
        getMinSwitchRequest,
        shouldAbandonFragment,
        getQualitySwitchRules,
        getAbandonFragmentRules,
        setBolaState,
        getBolaState
    };

    return instance;
}

ABRRulesCollection.__dashjs_factory_name = 'ABRRulesCollection';
const factory = FactoryMaker.getClassFactory(ABRRulesCollection);
FactoryMaker.updateSingletonFactory(ABRRulesCollection.__dashjs_factory_name, factory);

export default factory;
