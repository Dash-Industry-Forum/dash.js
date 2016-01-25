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
import FactoryMaker from '../../../core/FactoryMaker.js';
import BufferLevelRule from './BufferLevelRule.js';
import NextFragmentRequestRule from './NextFragmentRequestRule.js';
import TextSourceBuffer from '../../TextSourceBuffer.js';
import MetricsModel from '../../models/MetricsModel.js';
import DashAdapter from '../../../dash/DashAdapter.js';
import DashMetricsExtensions from '../../../dash/extensions/DashMetricsExtensions.js';
import SourceBufferExtensions from '../../extensions/SourceBufferExtensions.js';
import VirtualBuffer from '../../utils/VirtualBuffer.js';

const FRAGMENTS_TO_SCHEDULE_RULES = 'fragmentsToScheduleRules';
const NEXT_FRAGMENT_RULES = 'nextFragmentRules';

function ScheduleRulesCollection() {

    let context = this.context;

    let instance,
        fragmentsToScheduleRules,
        nextFragmentRules;

    function initialize() {
        fragmentsToScheduleRules = [];
        nextFragmentRules = [];

        fragmentsToScheduleRules.push(BufferLevelRule(context).create({
            metricsExt: DashMetricsExtensions(context).getInstance(),
            metricsModel: MetricsModel(context).getInstance(),
            textSourceBuffer: TextSourceBuffer(context).getInstance()
        }));
        nextFragmentRules.push(NextFragmentRequestRule(context).create({
            adapter: DashAdapter(context).getInstance(),
            sourceBufferExt: SourceBufferExtensions(context).getInstance(),
            virtualBuffer: VirtualBuffer(context).getInstance(),
            textSourceBuffer: TextSourceBuffer(context).getInstance()

        }));
    }

    function getRules(type) {
        switch (type) {
            case FRAGMENTS_TO_SCHEDULE_RULES:
                return fragmentsToScheduleRules;
            case NEXT_FRAGMENT_RULES:
                return nextFragmentRules;
            default:
                return null;
        }
    }

    instance = {
        initialize: initialize,
        getRules: getRules
    };

    return instance;
}

ScheduleRulesCollection.__dashjs_factory_name = 'ScheduleRulesCollection';
let factory = FactoryMaker.getSingletonFactory(ScheduleRulesCollection);
factory.FRAGMENTS_TO_SCHEDULE_RULES = FRAGMENTS_TO_SCHEDULE_RULES;
factory.NEXT_FRAGMENT_RULES = NEXT_FRAGMENT_RULES;
export default factory;