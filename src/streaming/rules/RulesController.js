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
import RulesContext from './RulesContext.js';
import SwitchRequest from './SwitchRequest.js';
import ABRRulesCollection from './abr/ABRRulesCollection.js';
import ScheduleRulesCollection from './scheduling/ScheduleRulesCollection.js';
import SynchronizationRulesCollection from './synchronization/SynchronizationRulesCollection.js';
import FactoryMaker from '../../core/FactoryMaker.js';

const SCHEDULING_RULE = 0;
const ABR_RULE = 1;
const SYNC_RULE = 2;

function RulesController() {

    let context = this.context;

    let instance,
        rules,
        ruleMandatoryProperties;

    function initialize() {
        rules = {};
        ruleMandatoryProperties = ['execute'];
    }

    function setConfig(config) {
        if (!config) return;

        if (config.abrRulesCollection) {
            rules[ABR_RULE] = config.abrRulesCollection;
        }

        if (config.scheduleRulesCollection) {
            rules[SCHEDULING_RULE] = config.scheduleRulesCollection;
        }

        if (config.synchronizationRulesCollection) {
            rules[SYNC_RULE] = config.synchronizationRulesCollection;
        }
    }

    function setRules(ruleType, rulesCollection) {
        if (!isRuleTypeSupported(ruleType) || !rulesCollection) return;

        updateRules(rules[ruleType], rulesCollection, true);
    }

    function addRules(ruleType, rulesCollection) {
        if (!isRuleTypeSupported(ruleType) || !rulesCollection) return;

        updateRules(rules[ruleType], rulesCollection, false);
    }

    function applyRules(rulesArr, streamProcessor, callback, current, overrideFunc) {
        var values = {};
        var rule,
            i;

        var rulesCount = rulesArr.length;
        var ln = rulesCount;
        var rulesContext = getRulesContext(streamProcessor, current);

        var callbackFunc = function (result) {
            var value,
                confidence;

            if (result.value !== SwitchRequest.NO_CHANGE) {
                values[result.priority] = overrideFunc(values[result.priority], result.value);
            }

            if (--rulesCount) return;

            if (values[SwitchRequest.WEAK] !== SwitchRequest.NO_CHANGE) {
                confidence = SwitchRequest.WEAK;
                value = values[SwitchRequest.WEAK];

            }

            if (values[SwitchRequest.DEFAULT] !== SwitchRequest.NO_CHANGE) {
                confidence = SwitchRequest.DEFAULT;
                value = values[SwitchRequest.DEFAULT];
            }

            if (values[SwitchRequest.STRONG] !== SwitchRequest.NO_CHANGE) {
                confidence = SwitchRequest.STRONG;
                value = values[SwitchRequest.STRONG];
            }

            if (confidence != SwitchRequest.STRONG &&
                confidence != SwitchRequest.WEAK) {
                confidence = SwitchRequest.DEFAULT;
            }


            callback({ value: (value !== undefined) ? value : current, confidence: confidence });

        };

        values[SwitchRequest.STRONG] = SwitchRequest.NO_CHANGE;
        values[SwitchRequest.WEAK] = SwitchRequest.NO_CHANGE;
        values[SwitchRequest.DEFAULT] = SwitchRequest.NO_CHANGE;

        for (i = 0; i < ln; i++) {
            rule = rulesArr[i];

            if (!isRule(rule)) {
                rulesCount--;
                continue;
            }

            rule.execute(rulesContext, callbackFunc);
        }
    }

    function reset() {
        var abrRules = rules[ABR_RULE];
        var schedulingRules = rules[SCHEDULING_RULE];
        var synchronizationRules = rules[SYNC_RULE];
        var allRules = (abrRules.getRules(ABRRulesCollection.QUALITY_SWITCH_RULES) || []).
            concat(abrRules.getRules(ABRRulesCollection.ABANDON_FRAGMENT_RULES) || []).
            concat(schedulingRules.getRules(ScheduleRulesCollection.NEXT_FRAGMENT_RULES) || []).
            concat(schedulingRules.getRules(ScheduleRulesCollection.FRAGMENTS_TO_SCHEDULE_RULES) || []).
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

    function isRuleTypeSupported(ruleType) {
        return ((ruleType === ABRRulesCollection.SCHEDULING_RULE) || (ruleType === ABRRulesCollection.ABR_RULE));
    }

    function isRule(obj) {
        var ln = ruleMandatoryProperties.length;
        var i = 0;

        for (i; i < ln; i++) {
            if (!obj.hasOwnProperty(ruleMandatoryProperties[i])) return false;
        }

        return true;
    }

    function getRulesContext(streamProcessor, currentValue) {
        return RulesContext(context).create({streamProcessor: streamProcessor, currentValue: currentValue});
    }

    function normalizeRule(rule) {
        var exec = rule.execute.bind(rule);

        rule.execute = function (context, callback) {
            var normalizedCallback = function (result) {
                callback.call(rule, SwitchRequest(context).create(result.value, result.priority));
            };

            exec(context, normalizedCallback);
        };

        if (typeof (rule.reset) !== 'function') {
            rule.reset = function () {
                //TODO do some default clearing
            };
        }

        return rule;
    }

    function updateRules(currentRulesCollection, newRulesCollection, override) {
        var rule,
            ruleSubType,
            subTypeRuleSet,
            ruleArr,
            ln,
            i;

        for (ruleSubType in newRulesCollection) {
            ruleArr = newRulesCollection[ruleSubType];
            ln = ruleArr.length;

            if (!ln) continue;

            for (i = 0; i < ln; i++) {
                rule = ruleArr[i];

                if (!isRule(rule)) continue;

                rule = normalizeRule(rule);

                subTypeRuleSet = currentRulesCollection.getRules(ruleSubType);

                if (override) {
                    override = false;
                    subTypeRuleSet.length = 0;
                }

                subTypeRuleSet.push(rule);
            }
        }
    }

    instance = {
        initialize: initialize,
        setConfig: setConfig,
        setRules: setRules,
        addRules: addRules,
        applyRules: applyRules,
        reset: reset
    };

    return instance;
}

RulesController.__dashjs_factory_name = 'RulesController';
let factory =  FactoryMaker.getSingletonFactory(RulesController);
factory.SCHEDULING_RULE = SCHEDULING_RULE;
factory.ABR_RULE = ABR_RULE;
factory.SYNC_RULE = SYNC_RULE;
export default factory;