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
MediaPlayer.rules.RulesController = function () {
    "use strict";

    var rules = {},

        ruleMandatoryProperties = ["execute"],

        isRuleTypeSupported = function(ruleType) {
            return ((ruleType === this.SCHEDULING_RULE) || (ruleType === this.ABR_RULE));
        },

        isRule = function(obj) {
            var ln = ruleMandatoryProperties.length,
                i = 0;

            for (i; i < ln; i += 1) {
                if (!obj.hasOwnProperty(ruleMandatoryProperties[i])) return false;
            }

            return true;
        },

        getRulesContext = function(streamProcessor, currentValue) {
            return new MediaPlayer.rules.RulesContext(streamProcessor, currentValue);
        },

        normalizeRule = function(rule) {
            var exec = rule.execute.bind(rule);

            rule.execute = function(context, callback) {
                var normalizedCallback = function(result) {
                    callback.call(rule, new MediaPlayer.rules.SwitchRequest(result.value, result.priority));
                };

                exec(context, normalizedCallback);
            };

            if (typeof(rule.reset) !== "function") {
                rule.reset = function(){
                    //TODO do some default clearing
                };
            }

            return rule;
        },

        updateRules = function(currentRulesCollection, newRulesCollection, override) {
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

                for (i = 0; i < ln; i += 1) {
                    rule = ruleArr[i];

                    if (!isRule.call(this, rule)) continue;

                    rule = normalizeRule.call(this, rule);

                    subTypeRuleSet = currentRulesCollection.getRules(ruleSubType);

                    if (override) {
                        override = false;
                        subTypeRuleSet.length = 0;
                    }

                    this.system.injectInto(rule);
                    subTypeRuleSet.push(rule);
                }
            }
        };

    return {
        system: undefined,
        log: undefined,

        SCHEDULING_RULE: 0,
        ABR_RULE: 1,
        SYNC_RULE: 2,

        initialize: function() {
            rules[this.ABR_RULE] = this.system.getObject("abrRulesCollection");
            rules[this.SCHEDULING_RULE] = this.system.getObject("scheduleRulesCollection");
            rules[this.SYNC_RULE] = this.system.getObject("synchronizationRulesCollection");
        },

        setRules: function(ruleType, rulesCollection) {
            if (!isRuleTypeSupported.call(this, ruleType) || !rulesCollection) return;

            updateRules.call(this, rules[ruleType], rulesCollection, true);
        },

        addRules: function(ruleType, rulesCollection) {
            if (!isRuleTypeSupported.call(this, ruleType) || !rulesCollection) return;

            updateRules.call(this, rules[ruleType], rulesCollection, false);
        },

        applyRules: function(rulesArr, streamProcessor, callback, current, overrideFunc) {
            var rulesCount = rulesArr.length,
                ln = rulesCount,
                values = {},
                rulesContext = getRulesContext.call(this, streamProcessor, current),
                rule,
                i,

                callbackFunc = function(result) {
                    var value,
                        confidence;

                    if (result.value !== MediaPlayer.rules.SwitchRequest.prototype.NO_CHANGE) {
                        values[result.priority] = overrideFunc(values[result.priority], result.value);
                    }

                    if (--rulesCount) return;

                    if (values[MediaPlayer.rules.SwitchRequest.prototype.WEAK] !== MediaPlayer.rules.SwitchRequest.prototype.NO_CHANGE) {
                        confidence = MediaPlayer.rules.SwitchRequest.prototype.WEAK;
                        value = values[MediaPlayer.rules.SwitchRequest.prototype.WEAK];
                    }

                    if (values[MediaPlayer.rules.SwitchRequest.prototype.DEFAULT] !== MediaPlayer.rules.SwitchRequest.prototype.NO_CHANGE) {
                        confidence = MediaPlayer.rules.SwitchRequest.prototype.DEFAULT;
                        value = values[MediaPlayer.rules.SwitchRequest.prototype.DEFAULT];
                    }

                    if (values[MediaPlayer.rules.SwitchRequest.prototype.STRONG] !== MediaPlayer.rules.SwitchRequest.prototype.NO_CHANGE) {
                        confidence = MediaPlayer.rules.SwitchRequest.prototype.STRONG;
                        value = values[MediaPlayer.rules.SwitchRequest.prototype.STRONG];
                    }

                    if (confidence != MediaPlayer.rules.SwitchRequest.prototype.STRONG &&
                        confidence != MediaPlayer.rules.SwitchRequest.prototype.WEAK) {
                        confidence = MediaPlayer.rules.SwitchRequest.prototype.DEFAULT;
                    }

                    callback({value: (value !== undefined) ? value : current, confidence: confidence});

                };

            values[MediaPlayer.rules.SwitchRequest.prototype.STRONG] = MediaPlayer.rules.SwitchRequest.prototype.NO_CHANGE;
            values[MediaPlayer.rules.SwitchRequest.prototype.WEAK] = MediaPlayer.rules.SwitchRequest.prototype.NO_CHANGE;
            values[MediaPlayer.rules.SwitchRequest.prototype.DEFAULT] = MediaPlayer.rules.SwitchRequest.prototype.NO_CHANGE;

            for (i = 0; i < ln; i += 1) {
                rule = rulesArr[i];

                if (!isRule.call(this, rule)) {
                    rulesCount--;
                    continue;
                }

                rule.execute(rulesContext, callbackFunc);
            }
        },

        reset: function() {
            var abrRules = rules[this.ABR_RULE],
                schedulingRules = rules[this.SCHEDULING_RULE],
                synchronizationRules = rules[this.SYNC_RULE],
                allRules = (abrRules.getRules(MediaPlayer.rules.ABRRulesCollection.prototype.QUALITY_SWITCH_RULES)|| []).
                    concat(schedulingRules.getRules(MediaPlayer.rules.ScheduleRulesCollection.prototype.NEXT_FRAGMENT_RULES) || []).
                    concat(schedulingRules.getRules(MediaPlayer.rules.ScheduleRulesCollection.prototype.FRAGMENTS_TO_SCHEDULE_RULES) || []).
                    concat(schedulingRules.getRules(MediaPlayer.rules.ScheduleRulesCollection.prototype.FRAGMENTS_TO_EXECUTE_RULES) || []).
                    concat(synchronizationRules.getRules(MediaPlayer.rules.SynchronizationRulesCollection.prototype.TIME_SYNCHRONIZED_RULES) || []).
                    concat(synchronizationRules.getRules(MediaPlayer.rules.SynchronizationRulesCollection.prototype.BEST_GUESS_RULES) || []),
                ln = allRules.length,
                rule,
                i;

            for (i = 0; i < ln; i += 1) {
                rule = allRules[i];

                if (typeof (rule.reset) !== "function") continue;

                rule.reset();
            }

            rules = {};
        }
    };
};

MediaPlayer.rules.RulesController.prototype = {
    constructor: MediaPlayer.rules.RulesController
};
