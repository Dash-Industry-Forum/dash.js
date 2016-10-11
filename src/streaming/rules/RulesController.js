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
import RulesContext from './RulesContext';
import SwitchRequest from './SwitchRequest';
import ABRRulesCollection from './abr/ABRRulesCollection';
import SynchronizationRulesCollection from './synchronization/SynchronizationRulesCollection';
import FactoryMaker from '../../core/FactoryMaker';

const ABR_RULE = 0;
const SYNC_RULE = 1;

function RulesController() {

    let context = this.context;

    let instance,
        rules;

    function initialize() {
        rules = {};
    }

    function setConfig(config) {
        if (!config) return;

        if (config.abrRulesCollection) {
            rules[ABR_RULE] = config.abrRulesCollection;
        }

        if (config.synchronizationRulesCollection) {
            rules[SYNC_RULE] = config.synchronizationRulesCollection;
        }
    }

    function applyRules(rulesArr, streamProcessor, callback, current, overrideFunc) {
        var values = {};
        var reasons = {};
        var rule,
            i;

        var rulesCount = rulesArr.length;
        var ln = rulesCount;
        var rulesContext = getRulesContext(streamProcessor, current);

        var callbackFunc = function (result) {
            var value,
                reason,
                confidence;

            if (result.value !== SwitchRequest.NO_CHANGE) {
                var newValue = overrideFunc(values[result.priority], result.value);
                if (newValue !== values[result.priority]) {
                    // change in value
                    values[result.priority] = newValue; // === result.value
                    reasons[result.priority] = result.reason;
                }
            }

            if (--rulesCount) return;

            if (values[SwitchRequest.WEAK] !== SwitchRequest.NO_CHANGE) {
                confidence = SwitchRequest.WEAK;
                value = values[SwitchRequest.WEAK];
                reason = reasons[SwitchRequest.WEAK];
            }

            if (values[SwitchRequest.DEFAULT] !== SwitchRequest.NO_CHANGE) {
                confidence = SwitchRequest.DEFAULT;
                value = values[SwitchRequest.DEFAULT];
                reason = reasons[SwitchRequest.DEFAULT];
            }

            if (values[SwitchRequest.STRONG] !== SwitchRequest.NO_CHANGE) {
                confidence = SwitchRequest.STRONG;
                value = values[SwitchRequest.STRONG];
                reason = reasons[SwitchRequest.STRONG];
            }

            if (confidence != SwitchRequest.STRONG &&
                confidence != SwitchRequest.WEAK) {
                confidence = SwitchRequest.DEFAULT;
            }

            if (value !== undefined) {
                callback({ value: value, confidence: confidence, reason: reason});
            } else {
                callback({ value: current, confidence: confidence, reason: {name: 'NO_CHANGE'}});
            }

        };

        values[SwitchRequest.STRONG] = SwitchRequest.NO_CHANGE;
        values[SwitchRequest.WEAK] = SwitchRequest.NO_CHANGE;
        values[SwitchRequest.DEFAULT] = SwitchRequest.NO_CHANGE;

        for (i = 0; i < ln; i++) {
            rule = rulesArr[i];
            rule.execute(rulesContext, callbackFunc);
        }
    }

    function reset() {
        var abrRules = rules[ABR_RULE];
        var synchronizationRules = rules[SYNC_RULE];
        var allRules = (abrRules.getRules(ABRRulesCollection.QUALITY_SWITCH_RULES) || []).
            concat(abrRules.getRules(ABRRulesCollection.ABANDON_FRAGMENT_RULES) || []).
            concat(synchronizationRules.getRules(SynchronizationRulesCollection.TIME_SYNCHRONIZED_RULES) || []).
            concat(synchronizationRules.getRules(SynchronizationRulesCollection.BEST_GUESS_RULES) || []);
        var ln = allRules.length;

        var rule,
            i;

        for (i = 0; i < ln; i++) {
            rule = allRules[i];

            if (typeof (rule.reset) !== 'function') continue;

            rule.reset();
        }

        rules = {};
    }

    function getRulesContext(streamProcessor, currentValue) {
        return RulesContext(context).create({streamProcessor: streamProcessor, currentValue: currentValue});
    }

    instance = {
        initialize: initialize,
        setConfig: setConfig,
        applyRules: applyRules,
        reset: reset
    };

    return instance;
}

RulesController.__dashjs_factory_name = 'RulesController';
let factory =  FactoryMaker.getSingletonFactory(RulesController);
factory.ABR_RULE = ABR_RULE;
factory.SYNC_RULE = SYNC_RULE;
export default factory;
