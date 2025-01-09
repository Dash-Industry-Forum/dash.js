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
// import XlinkLoader from '../XlinkLoader.js';
import EventBus from '../../core/EventBus.js';
import Events from '../../core/events/Events.js';
import MediaPlayerEvents from '../MediaPlayerEvents.js';
import FactoryMaker from '../../core/FactoryMaker.js';
import ManifestLoader from '../ManifestLoader.js';
import DashConstants from '../../dash/constants/DashConstants.js';


function ListMpdController() {

    let context = this.context;
    let eventBus = EventBus(context).getInstance();

    let instance,
        linkedPeriodList,
        dashAdapter,
        currentManifest,
        manifestLoader,
        mpdHasDuration

    function setConfig(config) {
        if (!config) {
            return;
        }

        if (config.dashAdapter) {
            dashAdapter = config.dashAdapter;
        }
    }

    function initialize() {
        eventBus.on(Events.IMPORTED_MPDS_LOADED, _onLinkedPeriodsLoaded, instance);
        eventBus.on(MediaPlayerEvents.PLAYBACK_TIME_UPDATED, _triggerLoadImportMpd, instance);
        manifestLoader = ManifestLoader(context).getInstance();
    }

    function loadListMpdManifest(time) {
        linkedPeriodList.forEach(linkedPeriod => {
            if (_shouldLoadLinkedPeriod(linkedPeriod, time)) {
                loadLinkedPeriod(currentManifest, linkedPeriod);
            }
        });
    }

    function _onLinkedPeriodsLoaded({ manifest, linkedPeriods }) {
        currentManifest = manifest;
        linkedPeriodList = linkedPeriods;

        if (manifest.Period[0].start) {
            throw new Error('The first period in a list MPD must have start time equal to 0');
        } 
        
        manifest.Period[0].start = 0;

        mpdHasDuration = manifest.hasOwnProperty(DashConstants.MEDIA_PRESENTATION_DURATION);
        if (!mpdHasDuration) {
            manifest.mediaPresentationDuration = 0;
            for (let i = manifest.Period.length - 1; i >= 0; i--) {
                manifest.mediaPresentationDuration += manifest.Period[i].duration;
                if (manifest.Period[i].start) {
                    manifest.mediaPresentationDuration += manifest.Period[i].start;
                    break;
                }
            }
        }

        const startPeriod = linkedPeriodList.find(period => period.start === 0);
        if (startPeriod) {
            loadLinkedPeriod(manifest, startPeriod);
        } else {
            eventBus.trigger(Events.MANIFEST_UPDATED, { manifest: manifest });
        }
    }

    function loadLinkedPeriod(manifest, period) {
        const baseUri = manifest.BaseURL[0] ? manifest.BaseURL[0].__text + period.ImportedMPD.uri : period.ImportedMPD.uri;
        const updatedManifest = new Promise(resolve => {
            manifestLoader.load(baseUri, null, null, true)
                .then((importedManifest) => {
                    dashAdapter.mergeManifests(manifest, importedManifest, period.id, mpdHasDuration);
                }, () => {
                    dashAdapter.mergeManifests(manifest, null, period.id, mpdHasDuration);
                })
                .then(() => {
                    eventBus.trigger(Events.MANIFEST_UPDATED, { manifest });
                    linkedPeriodList = linkedPeriodList.filter((element) => element.id !== period.id);
                    resolve(manifest);
                });
        });
        return updatedManifest;
    }

    function _triggerLoadImportMpd(e) {
        if (!linkedPeriodList || linkedPeriodList.lenght) {
            return;
        }

        loadListMpdManifest(e.time);
    }

    function _shouldLoadLinkedPeriod(linkedPeriod, time) {
        if (!linkedPeriod.ImportedMPD) {
            return false
        }
        return time >= linkedPeriod.start - linkedPeriod.ImportedMPD.earliestResolutionTimeOffset;
    }

    function reset() {
        linkedPeriodList = [];
    }

    instance = {
        initialize,
        loadListMpdManifest,
        loadLinkedPeriod,
        reset,
        setConfig
    };

    return instance;
}

ListMpdController.__dashjs_factory_name = 'ListMpdController';
const factory = FactoryMaker.getSingletonFactory(ListMpdController);
FactoryMaker.updateSingletonFactory(ListMpdController.__dashjs_factory_name, factory);
export default factory;
