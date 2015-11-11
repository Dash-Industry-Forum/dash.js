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
import SynchronizationRulesCollection from './rules/SynchronizationRules/SynchronizationRulesCollection.js';
import Error from './vo/Error.js';
import Stream from './Stream.js';
import TimeSyncController from './TimeSyncController.js';
import EventBus from './utils/EventBus.js';
import Events from "./Events.js";
import RulesController from './rules/RulesController.js';

let LiveEdgeFinder = function () {

    "use strict";

    var isSearchStarted = false,
        searchStartTime = NaN,
        rules,
        liveEdge = null,
        ruleSet = SynchronizationRulesCollection.prototype.BEST_GUESS_RULES,

        onSearchCompleted = function(req) {
            var searchTime = (new Date().getTime() - searchStartTime) / 1000;
            liveEdge = req.value;
            EventBus.trigger(Events.LIVE_EDGE_SEARCH_COMPLETED, {liveEdge: liveEdge, searchTime: searchTime, error:liveEdge === null ? new Error(LiveEdgeFinder.LIVE_EDGE_NOT_FOUND_ERROR_CODE, "live edge has not been found", null) : null});
        },

        onStreamInitialized = function(e) {
            var self = this;

            if (!self.streamProcessor.isDynamic() || isSearchStarted || e.error) {
                return;
            }

            rules = self.synchronizationRulesCollection.getRules(ruleSet);
            isSearchStarted = true;
            searchStartTime = new Date().getTime();

            RulesController.getInstance().applyRules(rules, self.streamProcessor, onSearchCompleted.bind(self), null, function(currentValue, newValue) {
                return newValue;
            });
        },

        onTimeSyncComplete = function (e) {
            if (e.error) {
                ruleSet = SynchronizationRulesCollection.prototype.BEST_GUESS_RULES;
            } else {
                ruleSet = SynchronizationRulesCollection.prototype.TIME_SYNCHRONIZED_RULES;
            }
        };

    return {
        system: undefined,
        synchronizationRulesCollection: undefined,

        setup: function() {
            EventBus.on(Events.TIME_SYNCHRONIZATION_COMPLETED, onTimeSyncComplete, this);
        },

        initialize: function(streamProcessor) {
            this.streamProcessor = streamProcessor;
            this.fragmentLoader = streamProcessor.fragmentLoader;
            EventBus.on(Events.STREAM_INITIALIZED, onStreamInitialized, this);
        },

        abortSearch: function() {
            isSearchStarted = false;
            searchStartTime = NaN;
        },

        getLiveEdge: function(){
            return liveEdge;
        },

        reset: function(){
            EventBus.off(Events.STREAM_INITIALIZED, onStreamInitialized, this);
            EventBus.off(Events.TIME_SYNCHRONIZATION_COMPLETED, onTimeSyncComplete, this);
            this.abortSearch();
            liveEdge = null;
        }
    };
};

LiveEdgeFinder.prototype = {
    constructor: LiveEdgeFinder
};

LiveEdgeFinder.LIVE_EDGE_NOT_FOUND_ERROR_CODE = 1;

export default LiveEdgeFinder;