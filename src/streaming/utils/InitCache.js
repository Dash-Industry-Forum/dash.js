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

/**
 * Represents data structure to keep and drive {DataChunk}
 */

import FactoryMaker from '../../core/FactoryMaker.js';
import Settings from '../../core/Settings.js';

function InitCache() {

    const context = this.context;
    const settings = Settings(context).getInstance();

    let data = {};
    let accessOrder = [];

    function save (chunk) {
        const id = chunk.streamId;
        const representationId = chunk.representation.id;

        data[id] = data[id] || {};

        const isNewEntry = !data[id][representationId];
        data[id][representationId] = chunk;

        if (isNewEntry) {
            accessOrder.push({ streamId: id, representationId: representationId });
            _enforceCacheLimit();
        }
    }

    function _enforceCacheLimit() {
        const maxCacheSize = settings.get().streaming.cacheInitSegmentsLimit;
        while (accessOrder.length > maxCacheSize) {
            const oldest = accessOrder.shift();
            if (data[oldest.streamId] && data[oldest.streamId][oldest.representationId]) {
                delete data[oldest.streamId][oldest.representationId];
                if (Object.keys(data[oldest.streamId]).length === 0) {
                    delete data[oldest.streamId];
                }
            }
        }
    }

    function extract (streamId, representationId) {
        if (data && data[streamId] && data[streamId][representationId]) {
            return data[streamId][representationId];
        } else {
            return null;
        }
    }

    function reset () {
        data = {};
        accessOrder = [];
    }

    /**
     * Get cache statistics for debugging/testing
     * @returns {object} Cache stats including entry count and stream count
     */
    function getStats() {
        const streamCount = Object.keys(data).length;
        let entryCount = 0;
        for (const streamId in data) {
            entryCount += Object.keys(data[streamId]).length;
        }
        return {
            entryCount: entryCount,
            streamCount: streamCount,
            maxSize: settings.get().streaming.cacheInitSegmentsLimit,
            accessOrderLength: accessOrder.length
        };
    }

    const instance = {
        save: save,
        extract: extract,
        reset: reset,
        getStats: getStats
    };

    return instance;
}

InitCache.__dashjs_factory_name = 'InitCache';
export default FactoryMaker.getSingletonFactory(InitCache);
