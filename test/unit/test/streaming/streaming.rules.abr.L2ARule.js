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
import {expect} from 'chai';
import EventBus from '../../../../src/core/EventBus.js';
import Events from '../../../../src/core/events/Events.js';
import MediaPlayerEvents from '../../../../src/streaming/MediaPlayerEvents.js';
import MetricsConstants from '../../../../src/streaming/constants/MetricsConstants.js';
import {HTTPRequest} from '../../../../src/streaming/vo/metrics/HTTPRequest.js';
import L2ARule from '../../../../src/streaming/rules/abr/L2ARule.js';
import DashMetricsMock from '../../mocks/DashMetricsMock.js';
import ThroughputControllerMock from '../../mocks/ThroughputControllerMock.js';

describe('L2ARule', function () {
    const STARTUP = 'L2A_STATE_STARTUP';
    const STEADY = 'L2A_STATE_STEADY';
    let eventBus, rule, rulesContext, throughputController, representations, currentRequest;

    beforeEach(function () {
        const context = {};
        currentRequest = null;
        Events.extend(MediaPlayerEvents);
        eventBus = EventBus(context).getInstance();
        const mediaInfo = {type: 'video'};
        representations = [500, 1000, 2000].map((bitrateInKbit, absoluteIndex) => ({
            id: String(bitrateInKbit), bandwidth: bitrateInKbit * 1000, bitrateInKbit, absoluteIndex, mediaInfo
        }));
        const abrController = {
            getPossibleVoRepresentationsFilteredBySettings: () => representations,
            getOptimalRepresentationForBitrate: (info, throughput) => [...representations].reverse().find(rep => rep.bitrateInKbit <= throughput) || representations[0],
            getRepresentationByAbsoluteIndex: index => representations[index]
        };
        throughputController = new ThroughputControllerMock();
        throughputController.setAverageThroughput(1200);
        const dashMetrics = new DashMetricsMock();
        dashMetrics.setCurrentBufferLevel(3);
        dashMetrics.getCurrentHttpRequest = () => currentRequest;
        rulesContext = {
            getMediaInfo: () => mediaInfo,
            getMediaType: () => mediaInfo.type,
            getAbrController: () => abrController,
            getThroughputController: () => throughputController,
            getScheduleController: () => ({setTimeToLoadDelay: () => {}}),
            getVideoModel: () => ({getPlaybackRate: () => 1})
        };
        rule = L2ARule(context).create({dashMetrics});
    });

    afterEach(function () {
        rule.reset();
        eventBus.reset();
    });

    function expectDecision(bitrate, state) {
        const decision = rule.getSwitchRequest(rulesContext);
        expect(decision.representation.bitrateInKbit).to.equal(bitrate);
        expect(decision.reason.state).to.equal(state);
    }

    function loadFragment(start, representation, metricOrder = 'absent') {
        currentRequest = {
            url: `segment-${start}`, type: HTTPRequest.MEDIA_SEGMENT_TYPE,
            trequest: new Date(start * 1000), _tfinish: new Date(start * 1000 + 500), trace: [{b: [1000]}]
        };
        const addMetric = () => eventBus.trigger(Events.METRIC_ADDED, {
            metric: MetricsConstants.HTTP_REQUEST, mediaType: 'video', value: currentRequest
        });
        if (metricOrder === 'before') {
            addMetric();
        }
        eventBus.trigger(Events.MEDIA_FRAGMENT_LOADED, {chunk: {start, duration: 4, representation}});
        if (metricOrder === 'after') {
            addMetric();
        }
    }

    ['absent', 'before', 'after'].forEach(metricOrder => {
        it(`should keep startup and steady decisions unchanged (HTTP metrics: ${metricOrder})`, function () {
            expectDecision(1000, STARTUP);
            loadFragment(0, representations[1], metricOrder);
            expectDecision(1000, STARTUP);
            throughputController.setAverageThroughput(700);
            loadFragment(4, representations[1], metricOrder);
            expectDecision(500, STEADY);
            throughputController.setAverageThroughput(2500);
            loadFragment(8, representations[0], metricOrder);
            expectDecision(1000, STEADY);
            // A repeated fragment still updates the loaded representation.
            loadFragment(8, representations[0], metricOrder);
            expectDecision(500, STEADY);
        });
    });

    it('should return to startup after seeking until a new fragment is loaded', function () {
        expectDecision(1000, STARTUP);
        loadFragment(0, representations[1]);
        expectDecision(1000, STARTUP);
        expectDecision(1000, STEADY);
        eventBus.trigger(Events.PLAYBACK_SEEKING);
        throughputController.setAverageThroughput(700);
        expectDecision(500, STARTUP);
        expectDecision(500, STARTUP);
        loadFragment(20, representations[0], 'after');
        expectDecision(500, STARTUP);
        expectDecision(500, STEADY);
    });

    it('should clear learned state and stop processing fragment events after reset', function () {
        expectDecision(1000, STARTUP);
        loadFragment(0, representations[1]);
        expectDecision(1000, STARTUP);
        expectDecision(1000, STEADY);
        rule.reset();
        throughputController.setAverageThroughput(700);
        expectDecision(500, STARTUP);
        loadFragment(4, representations[1], 'after');
        expectDecision(500, STARTUP);
        expectDecision(500, STARTUP);
    });
});
