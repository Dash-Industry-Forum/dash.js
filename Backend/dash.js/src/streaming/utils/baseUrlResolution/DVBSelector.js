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
import FactoryMaker from '../../../core/FactoryMaker';

function DVBSelector(config) {

    config = config || {};
    let instance;

    const blacklistController = config.blacklistController;

    function getNonBlacklistedBaseUrls(urls) {
        let removedPriorities = [];

        const samePrioritiesFilter = function (el) {
            if (removedPriorities.length) {
                if ((el.dvb_priority) &&
                        (removedPriorities.indexOf(el.dvb_priority) !== -1)) {
                    return false;
                }
            }

            return true;
        };

        const serviceLocationFilter = function (baseUrl) {
            if (blacklistController.contains(baseUrl.serviceLocation)) {
                // whenever a BaseURL is removed from the available list of
                // BaseURLs, any other BaseURL with the same @priority
                // value as the BaseURL being removed shall also be removed
                if (baseUrl.dvb_priority) {
                    removedPriorities.push(baseUrl.dvb_priority);
                }

                // all URLs in the list which have a @serviceLocation
                // attribute matching an entry in the blacklist shall be
                // removed from the available list of BaseURLs
                return false;
            }

            return true;
        };

        return urls.filter(serviceLocationFilter).filter(samePrioritiesFilter);
    }

    function selectByWeight(availableUrls) {
        const prioritySorter = function (a, b) {
            let diff = a.dvb_priority - b.dvb_priority;
            return isNaN(diff) ? 0 : diff;
        };

        const topPriorityFilter = function (baseUrl, idx, arr) {
            return !idx || (
                (arr[0].dvb_priority && baseUrl.dvb_priority) &&
                (arr[0].dvb_priority === baseUrl.dvb_priority)
            );
        };

        let totalWeight = 0;
        let cumulWeights = [];
        let idx = 0;
        let rn,
            urls;

        // It shall begin by taking the set of resolved BaseURLs present or inherited at the current
        // position in the MPD, resolved and filtered as described in 10.8.2.1, that have the lowest
        // @priority attribute value.
        urls = availableUrls.sort(prioritySorter).filter(topPriorityFilter);

        if (urls.length) {
            if (urls.length > 1) {
                // If there is more than one BaseURL with this lowest @priority attribute value then the Player
                // shall select one of them at random such that the probability of each BaseURL being chosen
                // is proportional to the value of its @weight attribute. The method described in RFC 2782
                // [26] or picking from a number of weighted entries is suitable for this, but there may be other
                // algorithms which achieve the same effect.

                // add all the weights together, storing the accumulated weight per entry
                urls.forEach(baseUrl => {
                    totalWeight += baseUrl.dvb_weight;
                    cumulWeights.push(totalWeight);
                });

                // pick a random number between zero and totalWeight
                rn = Math.floor(Math.random() * (totalWeight - 1));

                // select the index for the range rn falls within
                cumulWeights.every((limit, index) => {
                    idx = index;

                    if (rn < limit) {
                        return false;
                    }

                    return true;
                });
            }

            return urls[idx];
        }
    }

    function select(baseUrls) {
        return baseUrls && selectByWeight(
            getNonBlacklistedBaseUrls(
                baseUrls
            )
        );
    }

    instance = {
        select: select
    };

    return instance;
}

DVBSelector.__dashjs_factory_name = 'DVBSelector';
export default FactoryMaker.getClassFactory(DVBSelector);
