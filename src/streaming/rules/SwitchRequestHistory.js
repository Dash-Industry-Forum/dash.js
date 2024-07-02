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

import FactoryMaker from '../../core/FactoryMaker.js';
import Settings from '../../core/Settings.js';

function SwitchRequestHistory() {
    let switchRequests = {};
    let switchRequestHistory = {};
    const context = this.context;
    const settings = Settings(context).getInstance();

    function push(switchRequest) {
        const currentRepresentation = switchRequest.currentRepresentation;
        const newRepresentation = switchRequest.newRepresentation;

        // Don`t compare quality switches between different periods or different AdaptationSets
        if (currentRepresentation.mediaInfo.streamInfo.id !== newRepresentation.mediaInfo.streamInfo.id || newRepresentation.mediaInfo.id !== currentRepresentation.mediaInfo.id) {
            return;
        }

        const streamId = currentRepresentation.mediaInfo.streamInfo.id;
        if (!switchRequests[streamId]) {
            _initializeForStream(streamId)
        }

        const mediaType = currentRepresentation.mediaInfo.type;
        if (!switchRequests[streamId][mediaType]) {
            _initializeForMediaType(streamId, mediaType);
        }

        const currentRepresentationId = switchRequest.currentRepresentation.id
        if (!switchRequests[streamId][mediaType][currentRepresentationId]) {
            _initializeForRepresentation(streamId, mediaType, currentRepresentationId);
        }

        // Set switch details
        let indexDiff = switchRequest.newRepresentation.absoluteIndex - switchRequest.currentRepresentation.absoluteIndex;
        let drop = (indexDiff < 0) ? 1 : 0;
        let dropSize = drop ? -indexDiff : 0;
        let noDrop = drop ? 0 : 1;

        // Update running totals
        switchRequests[streamId][mediaType][switchRequest.currentRepresentation.id].drops += drop;
        switchRequests[streamId][mediaType][switchRequest.currentRepresentation.id].dropSize += dropSize;
        switchRequests[streamId][mediaType][switchRequest.currentRepresentation.id].noDrops += noDrop;

        // Save to history
        switchRequestHistory[streamId][mediaType].push({
            id: switchRequest.currentRepresentation.id,
            noDrop: noDrop,
            drop: drop,
            dropSize: dropSize
        });

        // Remove outdated entries from history
        const removedHistorySample = _adjustSwitchRequestHistory(streamId, mediaType);

        // Adjust current values based on the removed sample
        if (removedHistorySample) {
            _adjustSwitchRequestDrops(streamId, mediaType, removedHistorySample)
        }

    }

    function _initializeForStream(streamId) {
        switchRequests[streamId] = {};
        switchRequestHistory[streamId] = {};
    }

    function _initializeForMediaType(streamId, mediaType) {
        switchRequests[streamId][mediaType] = {};
        switchRequestHistory[streamId][mediaType] = [];
    }

    function _initializeForRepresentation(streamId, mediaType, representationId) {
        switchRequests[streamId][mediaType][representationId] = {
            noDrops: 0,
            drops: 0,
            dropSize: 0
        };
    }

    function _adjustSwitchRequestHistory(streamId, mediaType) {
        // Shift the earliest switch off srHistory and readjust to keep depth of running totals constant
        if (switchRequestHistory[streamId][mediaType].length > settings.get().streaming.abr.rules.switchHistoryRule.parameters.sampleSize) {
            return switchRequestHistory[streamId][mediaType].shift();
        }

        return null
    }

    function _adjustSwitchRequestDrops(streamId, mediaType, removedHistorySample) {
        switchRequests[streamId][mediaType][removedHistorySample.id].drops -= removedHistorySample.drop;
        switchRequests[streamId][mediaType][removedHistorySample.id].dropSize -= removedHistorySample.dropSize;
        switchRequests[streamId][mediaType][removedHistorySample.id].noDrops -= removedHistorySample.noDrop;
    }

    function getSwitchRequests(streamId, mediaType) {
        if (streamId === null || typeof streamId === 'undefined'
            || mediaType === null || typeof mediaType === 'undefined'
            || !switchRequests[streamId] || !switchRequests[streamId][mediaType]) {
            return {}
        }

        return switchRequests[streamId][mediaType];
    }

    function clearForStream(streamId) {
        delete switchRequests[streamId];
        delete switchRequestHistory[streamId];
    }

    function reset() {
        switchRequests = {};
        switchRequestHistory = {};
    }

    return {
        clearForStream,
        getSwitchRequests,
        push,
        reset
    };
}

SwitchRequestHistory.__dashjs_factory_name = 'SwitchRequestHistory';
const factory = FactoryMaker.getClassFactory(SwitchRequestHistory);
export default factory;
