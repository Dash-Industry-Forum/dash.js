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
import Constants from '../../constants/Constants';

const QUALITY_SWITCH_RULES = 'qualitySwitchRules';
const ABANDON_FRAGMENT_RULES = 'abandonFragmentRules';


function ABRRulesCollection(config) {

    config = config || {};
    const context = this.context;

    const mediaPlayerModel = config.mediaPlayerModel;
    const customParametersModel = config.customParametersModel;
    const dashMetrics = config.dashMetrics;
    const settings = config.settings;
    const abrController = config.abrController;

    let instance,
        qualitySwitchRules,
        abandonFragmentRules;

    function initialize() {
        qualitySwitchRules = [];
        abandonFragmentRules = [];

        if (settings.get().streaming.abr.useDefaultABRRules) {

            // If L2A is used we only need this one rule
            if (settings.get().streaming.abr.ABRStrategy === Constants.ABR_STRATEGY_L2A) {
                qualitySwitchRules.push(
                    L2ARule(context).create({
                        dashMetrics: dashMetrics,
                        settings: settings
                    })
                );
            }
            // If LoLP is used we only need this one rule
            else if (settings.get().streaming.abr.ABRStrategy === Constants.ABR_STRATEGY_LoLP) {
                qualitySwitchRules.push(
                    LoLPRule(context).create({
                        dashMetrics: dashMetrics
                    })
                );
            } else {
                // Only one of BolaRule and ThroughputRule will give a switchRequest.quality !== SwitchRequest.NO_CHANGE.
                // This is controlled by useBufferOccupancyABR mechanism in AbrController.
                qualitySwitchRules.push(
                    BolaRule(context).create({
                        dashMetrics: dashMetrics,
                        mediaPlayerModel: mediaPlayerModel,
                        abrController,
                        settings: settings
                    })
                );

                qualitySwitchRules.push(
                    ThroughputRule(context).create({
                        dashMetrics: dashMetrics
                    })
                );

                if (settings.get().streaming.abr.additionalAbrRules.insufficientBufferRule) {
                    qualitySwitchRules.push(
                        InsufficientBufferRule(context).create({
                            dashMetrics: dashMetrics,
                            settings
                        })
                    );
                }

                if (settings.get().streaming.abr.additionalAbrRules.switchHistoryRule) {
                    qualitySwitchRules.push(
                        SwitchHistoryRule(context).create()
                    );
                }

                if (settings.get().streaming.abr.additionalAbrRules.droppedFramesRule) {
                    qualitySwitchRules.push(
                        DroppedFramesRule(context).create()
                    );
                }

                if (settings.get().streaming.abr.additionalAbrRules.abandonRequestsRule) {
                    abandonFragmentRules.push(
                        AbandonRequestsRule(context).create({
                            dashMetrics: dashMetrics,
                            mediaPlayerModel: mediaPlayerModel,
                            settings: settings
                        })
                    );
                }
            }
        }

        // add custom ABR rules if any
        const customRules = customParametersModel.getAbrCustomRules();
        customRules.forEach(function (rule) {
            if (rule.type === QUALITY_SWITCH_RULES) {
                qualitySwitchRules.push(rule.rule(context).create());
            }

            if (rule.type === ABANDON_FRAGMENT_RULES) {
                abandonFragmentRules.push(rule.rule(context).create());
            }
        });
    }

    /**
     * For switch requests to be applied they need to define a bitrateInfo and a reason
     * @param {SwitchRequest[]} srArray
     * @returns {SwitchRequest[]}
     * @private
     */
    function _getRulesWithChange(srArray) {
        return srArray.filter((sr) => {
            return sr.bitrateInfo && sr.reason
        });
    }

    /**
     *
     * @param {SwitchRequest[]} srArray
     * @return {object} SwitchRequest
     */
    function _selectOptimalSwitchRequest(srArray) {
        const values = {};
        let newSwitchReq = null;
        let i,
            len,
            switchRequest

        if (srArray.length === 0) {
            return;
        }

        values[SwitchRequest.PRIORITY.STRONG] = {};
        values[SwitchRequest.PRIORITY.WEAK] = {};
        values[SwitchRequest.PRIORITY.DEFAULT] = {};

        for (i = 0, len = srArray.length; i < len; i += 1) {
            switchRequest = srArray[i];

            if (switchRequest.bitrateInfo && switchRequest.reason && !isNaN(switchRequest.priority)) {
                // We only use the new quality in case it is lower than the already saved one or if no new quality has been selected for the respective priority
                if (Object.keys(values[switchRequest.priority]).length === 0 || _shouldReplaceExistingSwitchRequest(values[switchRequest.priority], switchRequest)) {
                    values[switchRequest.priority] = switchRequest;
                }
            }
        }

        if (Object.keys(values[SwitchRequest.PRIORITY.WEAK]).length) {
            newSwitchReq = values[SwitchRequest.PRIORITY.WEAK];
        }

        if (Object.keys(values[SwitchRequest.PRIORITY.DEFAULT]).length) {
            newSwitchReq = values[SwitchRequest.PRIORITY.DEFAULT];
        }

        if (Object.keys(values[SwitchRequest.PRIORITY.STRONG]).length) {
            newSwitchReq = values[SwitchRequest.PRIORITY.STRONG];
        }

        if (newSwitchReq) {
            return newSwitchReq
        }

        return SwitchRequest(context).create();
    }

    /**
     * Check if we should replace the current selected switch request with the new one. We should add more logic here, for instance compare the codecs and the resolutions
     * @param existingSwitchRequest
     * @param currentSwitchRequest
     * @returns {boolean}
     * @private
     */
    function _shouldReplaceExistingSwitchRequest(existingSwitchRequest, currentSwitchRequest) {
        try {
            if (!currentSwitchRequest || !currentSwitchRequest.bitrateInfo || isNaN(currentSwitchRequest.bitrateInfo.bitrate)) {
                return false;
            }

            return currentSwitchRequest.bitrateInfo.bitrate < existingSwitchRequest.bitrateInfo.bitrate
        } catch (e) {
            return false;
        }
    }

    function getBestPossibleSwitchRequest(rulesContext) {
        const switchRequestArray = qualitySwitchRules.map(rule => rule.getSwitchRequest(rulesContext));
        const activeSwitchRequests = _getRulesWithChange(switchRequestArray);

        return _selectOptimalSwitchRequest(activeSwitchRequests);
    }

    function shouldAbandonFragment(rulesContext, streamId) {
        const abandonRequestArray = abandonFragmentRules.map(rule => rule.shouldAbandon(rulesContext, streamId));
        const activeRules = _getRulesWithChange(abandonRequestArray);
        const shouldAbandon = _selectOptimalSwitchRequest(activeRules);

        if (shouldAbandon) {
            shouldAbandon.reason.forceAbandon = true
        }

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
    }

    function getQualitySwitchRules() {
        return qualitySwitchRules;
    }

    instance = {
        initialize,
        reset,
        getBestPossibleSwitchRequest,
        shouldAbandonFragment,
        getQualitySwitchRules
    };

    return instance;
}

ABRRulesCollection.__dashjs_factory_name = 'ABRRulesCollection';
const factory = FactoryMaker.getClassFactory(ABRRulesCollection);
factory.QUALITY_SWITCH_RULES = QUALITY_SWITCH_RULES;
factory.ABANDON_FRAGMENT_RULES = ABANDON_FRAGMENT_RULES;
FactoryMaker.updateSingletonFactory(ABRRulesCollection.__dashjs_factory_name, factory);

export default factory;
