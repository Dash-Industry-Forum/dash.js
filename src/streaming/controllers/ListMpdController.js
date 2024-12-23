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


function ListMpdController() {

    let context = this.context;
    let eventBus = EventBus(context).getInstance();

    let instance,
        linkedPeriodList,
        dashAdapter,
        currentManifest,
        manifestLoader

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
                const baseUri = currentManifest.baseUri + linkedPeriod.ImportedMPD.uri;
                manifestLoader.load(baseUri, null, null, true)
                    .then((importedManifest) =>{
                        dashAdapter.mergeManifests(currentManifest, importedManifest, linkedPeriod.id);
                        eventBus.trigger(Events.MANIFEST_UPDATED, { manifest: currentManifest });
                        linkedPeriodList = linkedPeriodList.filter((element) => element.id !== linkedPeriod.id)
                    }, () => {
                        dashAdapter.mergeManifests(currentManifest, null, linkedPeriod.id);
                        eventBus.trigger(Events.MANIFEST_UPDATED, { manifest: currentManifest });
                        linkedPeriodList = linkedPeriodList.filter((element) => element.id !== linkedPeriod.id)
                    });
            }
        });
    }

    function _onLinkedPeriodsLoaded({ manifest, linkedPeriods}) {
        currentManifest = manifest;
        linkedPeriodList = linkedPeriods;
        const startPeriod = linkedPeriodList.find(period => period.start === 0);
        if (startPeriod) {
            const baseUri = manifest.baseUri + startPeriod.ImportedMPD.uri
            manifestLoader.load(baseUri, null, null, true)
                .then((importedManifest) => {
                    dashAdapter.mergeManifests(manifest, importedManifest, startPeriod.id);
                    eventBus.trigger(Events.MANIFEST_UPDATED, { manifest: manifest });
                }, () => {
                    dashAdapter.mergeManifests(manifest, null, startPeriod.id);
                    eventBus.trigger(Events.MANIFEST_UPDATED, { manifest: manifest });
                });
        } else {
            eventBus.trigger(Events.MANIFEST_UPDATED, { manifest: manifest });
        }
    }

    function _triggerLoadImportMpd(e) {
        if (!linkedPeriodList || linkedPeriodList.lenght) {
            return
        }

        loadListMpdManifest(e.time)
    }

    function _shouldLoadLinkedPeriod(linkedPeriod, time) {
        return time >= linkedPeriod.start - linkedPeriod.ImportedMPD.earliestResolutionTimeOffset;
    }

    function reset() {
        linkedPeriodList = []
    }

    instance = {
        initialize,
        loadListMpdManifest,
        reset,
        setConfig
    };

    return instance;
}

ListMpdController.__dashjs_factory_name = 'ListMpdController';
const factory = FactoryMaker.getSingletonFactory(ListMpdController);
FactoryMaker.updateSingletonFactory(ListMpdController.__dashjs_factory_name, factory);
export default factory;
