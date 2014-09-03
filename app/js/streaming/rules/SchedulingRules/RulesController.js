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

        normalizeRule = function(rule) {
            var exec = rule.execute.bind(rule);

            rule.execute = function(streamType, callback, current) {
                var normalizedCallback = function(result) {
                    callback.call(rule, new MediaPlayer.rules.SwitchRequest(result.value, result.priority));
                };

                exec(streamType, normalizedCallback, current);
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
                        subTypeRuleSet.length = 0;
                    }

                    subTypeRuleSet.push(rule);
                }
            }
        };

    return {
        system: undefined,
        debug: undefined,

        SCHEDULING_RULE: 0,
        ABR_RULE: 1,

        initialize: function() {
            rules[this.ABR_RULE] = this.system.getObject("abrRulesCollection");
            rules[this.SCHEDULING_RULE] = this.system.getObject("scheduleRulesCollection");
        },

        setRules: function(ruleType, rulesCollection) {
            if (!isRuleTypeSupported.call(this, ruleType) || !rulesCollection) return;

            updateRules.call(this, rules[ruleType], rulesCollection, true);
        },

        addRules: function(ruleType, rulesCollection) {
            if (!isRuleTypeSupported.call(this, ruleType) || !rulesCollection) return;

            updateRules.call(this, rules[ruleType], rulesCollection, false);
        },

        applyRules: function(rulesArr, streamType, periodId, callback, current, overrideFunc) {
            var rulesCount = rulesArr.length,
                ln = rulesCount,
                values = {},
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

                    callback({value: value || current, confidence: confidence});
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

                rule.execute(streamType, periodId, callbackFunc, current);
            }
        },

        reset: function() {
            rules = {};
        }
    };
};

MediaPlayer.rules.RulesController.prototype = {
    constructor: MediaPlayer.rules.RulesController
};