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
import SynchronizationRulesCollection from '../rules/synchronization/SynchronizationRulesCollection';
import Error from '../vo/Error';
import EventBus from '../../core/EventBus';
import Events from '../../core/events/Events';
import RulesController from '../rules/RulesController';
import FactoryMaker from '../../core/FactoryMaker';

const LIVE_EDGE_NOT_FOUND_ERROR_CODE = 1;

function LiveEdgeFinder() {

    let context = this.context;
    let eventBus = EventBus(context).getInstance();

    let instance,
        timelineConverter,
        streamProcessor,
        rulesController,
        isSearchStarted,
        searchStartTime,
        rules,
        liveEdge,
        ruleSet;

    function initialize(TimelineConverter, StreamProcessor) {
        timelineConverter = TimelineConverter;
        streamProcessor = StreamProcessor;
        isSearchStarted = false;
        searchStartTime = NaN;
        liveEdge = null;
        rulesController = RulesController(context).getInstance();
        ruleSet = SynchronizationRulesCollection.BEST_GUESS_RULES;
        eventBus.on(Events.STREAM_INITIALIZED, onStreamInitialized, this);
    }

    function abortSearch() {
        isSearchStarted = false;
        searchStartTime = NaN;
    }

    function getLiveEdge() {
        return liveEdge;
    }

    function reset() {
        eventBus.off(Events.STREAM_INITIALIZED, onStreamInitialized, this);
        abortSearch();
        liveEdge = null;
        timelineConverter = null;
        streamProcessor = null;
        isSearchStarted = false;
        searchStartTime = NaN;
        ruleSet = null;
        rulesController = null;
    }

    function onSearchCompleted(req) {
        var searchTime = (new Date().getTime() - searchStartTime) / 1000;
        liveEdge = req.value;
        eventBus.trigger(Events.LIVE_EDGE_SEARCH_COMPLETED, {liveEdge: liveEdge, searchTime: searchTime, error: liveEdge === null ? new Error(LIVE_EDGE_NOT_FOUND_ERROR_CODE, 'live edge has not been found', null) : null});
    }

    function onStreamInitialized(e) {

        if (!streamProcessor.isDynamic() || isSearchStarted || e.error) {
            return;
        }

        ruleSet = timelineConverter.isTimeSyncCompleted() ? SynchronizationRulesCollection.TIME_SYNCHRONIZED_RULES : SynchronizationRulesCollection.BEST_GUESS_RULES;

        rules = SynchronizationRulesCollection(context).getInstance().getRules(ruleSet);
        isSearchStarted = true;
        searchStartTime = new Date().getTime();

        rulesController.applyRules(rules, streamProcessor, onSearchCompleted, null, function (currentValue, newValue) {
            return newValue;
        });
    }

    instance = {
        initialize: initialize,
        abortSearch: abortSearch,
        getLiveEdge: getLiveEdge,
        reset: reset
    };

    return instance;
}
LiveEdgeFinder.__dashjs_factory_name = 'LiveEdgeFinder';
let factory = FactoryMaker.getSingletonFactory(LiveEdgeFinder);
factory.LIVE_EDGE_NOT_FOUND_ERROR_CODE = LIVE_EDGE_NOT_FOUND_ERROR_CODE;
export default factory;