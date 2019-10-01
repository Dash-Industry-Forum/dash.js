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
import UTCTiming from '../../dash/vo/UTCTiming';
import FactoryMaker from '../../core/FactoryMaker';
import Constants from '../constants/Constants';
import ABRRulesCollection from '../rules/abr/ABRRulesCollection';
import Settings from '../../core/Settings';
import { checkParameterType} from '../utils/SupervisorTools';


const DEFAULT_MIN_BUFFER_TIME = 12;
const DEFAULT_MIN_BUFFER_TIME_FAST_SWITCH = 20;

const DEFAULT_LOW_LATENCY_LIVE_DELAY = 3.0;
const LOW_LATENCY_REDUCTION_FACTOR = 10;
const LOW_LATENCY_MULTIPLY_FACTOR = 5;

const DEFAULT_XHR_WITH_CREDENTIALS = false;

function MediaPlayerModel() {

    let instance,
        UTCTimingSources,
        xhrWithCredentials,
        customABRRule;

    const DEFAULT_UTC_TIMING_SOURCE = {
            scheme: 'urn:mpeg:dash:utc:http-xsdate:2014',
            value: 'http://time.akamai.com/?iso&ms'
        };
    const context = this.context;
    const settings = Settings(context).getInstance();

    function setup() {
        UTCTimingSources = [];
        xhrWithCredentials = {
            default: DEFAULT_XHR_WITH_CREDENTIALS
        };
        customABRRule = [];
    }

    //TODO Should we use Object.define to have setters/getters? makes more readable code on other side.
    function findABRCustomRuleIndex(rulename) {
        let i;
        for (i = 0; i < customABRRule.length; i++) {
            if (customABRRule[i].rulename === rulename) {
                return i;
            }
        }
        return -1;
    }

    function getABRCustomRules() {
        return customABRRule;
    }

    function addABRCustomRule(type, rulename, rule) {
        if (typeof type !== 'string' || (type !== ABRRulesCollection.ABANDON_FRAGMENT_RULES && type !== ABRRulesCollection.QUALITY_SWITCH_RULES) ||
            typeof rulename !== 'string') {
            throw Constants.BAD_ARGUMENT_ERROR;
        }
        let index = findABRCustomRuleIndex(rulename);
        if (index === -1) {
            // add rule
            customABRRule.push({
                type: type,
                rulename: rulename,
                rule: rule
            });
        } else {
            // update rule
            customABRRule[index].type = type;
            customABRRule[index].rule = rule;
        }
    }

    function removeABRCustomRule(rulename) {
        if (rulename) {
            let index = findABRCustomRuleIndex(rulename);
            //if no rulename custom rule has been found, do nothing
            if (index !== -1) {
                // remove rule
                customABRRule.splice(index, 1);
            }
        } else {
            //if no rulename is defined, remove all ABR custome rules
            customABRRule = [];
        }
    }

    function getStableBufferTime() {
        if (settings.get().streaming.lowLatencyEnabled) {
            return getLiveDelay() * 0.6;
        }

        const stableBufferTime = settings.get().streaming.stableBufferTime;
        return stableBufferTime > -1 ? stableBufferTime : settings.get().streaming.fastSwitchEnabled ? DEFAULT_MIN_BUFFER_TIME_FAST_SWITCH : DEFAULT_MIN_BUFFER_TIME;
    }

    function getRetryAttemptsForType(type) {
        return settings.get().streaming.lowLatencyEnabled ? settings.get().streaming.retryAttempts[type] * LOW_LATENCY_MULTIPLY_FACTOR : settings.get().streaming.retryAttempts[type];
    }

    function getRetryIntervalsForType(type) {
        return settings.get().streaming.lowLatencyEnabled ? settings.get().streaming.retryIntervals[type] / LOW_LATENCY_REDUCTION_FACTOR : settings.get().streaming.retryIntervals[type];
    }

    function getLiveDelay() {
        if (settings.get().streaming.lowLatencyEnabled) {
            return settings.get().streaming.liveDelay || DEFAULT_LOW_LATENCY_LIVE_DELAY;
        }
        return settings.get().streaming.liveDelay;
    }

    function addUTCTimingSource(schemeIdUri, value) {
        removeUTCTimingSource(schemeIdUri, value); //check if it already exists and remove if so.
        let vo = new UTCTiming();
        vo.schemeIdUri = schemeIdUri;
        vo.value = value;
        UTCTimingSources.push(vo);
    }

    function getUTCTimingSources() {
        return UTCTimingSources;
    }

    function removeUTCTimingSource(schemeIdUri, value) {
        checkParameterType(schemeIdUri, 'string');
        checkParameterType(value, 'string');
        UTCTimingSources.forEach(function (obj, idx) {
            if (obj.schemeIdUri === schemeIdUri && obj.value === value) {
                UTCTimingSources.splice(idx, 1);
            }
        });
    }

    function clearDefaultUTCTimingSources() {
        UTCTimingSources = [];
    }

    function restoreDefaultUTCTimingSources() {
        addUTCTimingSource(DEFAULT_UTC_TIMING_SOURCE.scheme, DEFAULT_UTC_TIMING_SOURCE.value);
    }

    function setXHRWithCredentialsForType(type, value) {
        if (!type) {
            Object.keys(xhrWithCredentials).forEach(key => {
                setXHRWithCredentialsForType(key, value);
            });
        } else {
            xhrWithCredentials[type] = !!value;
        }
    }

    function getXHRWithCredentialsForType(type) {
        const useCreds = xhrWithCredentials[type];

        return useCreds === undefined ? xhrWithCredentials.default : useCreds;
    }

    function getDefaultUtcTimingSource() {
        return DEFAULT_UTC_TIMING_SOURCE;
    }

    function reset() {
        //TODO need to figure out what props to persist across sessions and which to reset if any.
        //setup();
    }

    instance = {
        getABRCustomRules: getABRCustomRules,
        addABRCustomRule: addABRCustomRule,
        removeABRCustomRule: removeABRCustomRule,
        getStableBufferTime: getStableBufferTime,
        getRetryAttemptsForType: getRetryAttemptsForType,
        getRetryIntervalsForType: getRetryIntervalsForType,
        getLiveDelay: getLiveDelay,
        addUTCTimingSource: addUTCTimingSource,
        removeUTCTimingSource: removeUTCTimingSource,
        getUTCTimingSources: getUTCTimingSources,
        clearDefaultUTCTimingSources: clearDefaultUTCTimingSources,
        restoreDefaultUTCTimingSources: restoreDefaultUTCTimingSources,
        setXHRWithCredentialsForType: setXHRWithCredentialsForType,
        getXHRWithCredentialsForType: getXHRWithCredentialsForType,
        getDefaultUtcTimingSource: getDefaultUtcTimingSource,
        reset: reset
    };

    setup();

    return instance;
}

//TODO see if you can move this and not export and just getter to get default value.
MediaPlayerModel.__dashjs_factory_name = 'MediaPlayerModel';
export default FactoryMaker.getSingletonFactory(MediaPlayerModel);