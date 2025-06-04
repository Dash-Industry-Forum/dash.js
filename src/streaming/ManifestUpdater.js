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
import Constants from './constants/Constants.js';
import CustomParametersModel from '../streaming/models/CustomParametersModel.js';
import DashConstants from '../dash/constants/DashConstants.js';
import Debug from '../core/Debug.js';
import Errors from '../core/errors/Errors.js';
import EventBus from '../core/EventBus.js';
import Events from '../core/events/Events.js';
import FactoryMaker from '../core/FactoryMaker.js';
import LocationSelector from './utils/LocationSelector.js';
import MediaPlayerEvents from '../streaming/MediaPlayerEvents.js';
import URLUtils from './utils/URLUtils.js';
import Utils from '../core/Utils.js';

function ManifestUpdater() {

    const context = this.context;
    const eventBus = EventBus(context).getInstance();
    const urlUtils = URLUtils(context).getInstance();

    let adapter,
        contentSteeringController,
        customParametersModel,
        errHandler,
        instance,
        isPaused,
        isStopped,
        isUpdating,
        locationSelector,
        logger,
        manifestLoader,
        manifestModel,
        refreshDelay,
        refreshTimer,
        settings;


    function setup() {
        logger = Debug(context).getInstance().getLogger(instance);
        locationSelector = LocationSelector(context).create();
        customParametersModel = CustomParametersModel(context).getInstance();
    }

    function setConfig(config) {
        if (!config) {
            return;
        }

        if (config.manifestModel) {
            manifestModel = config.manifestModel;
        }
        if (config.adapter) {
            adapter = config.adapter;
        }
        if (config.manifestLoader) {
            manifestLoader = config.manifestLoader;
        }
        if (config.errHandler) {
            errHandler = config.errHandler;
        }
        if (config.locationSelector) {
            locationSelector = config.locationSelector;
        }
        if (config.settings) {
            settings = config.settings;
        }
        if (config.contentSteeringController) {
            contentSteeringController = config.contentSteeringController;
        }
        if (config.customParametersModel) {
            customParametersModel = config.customParametersModel;
        }
    }

    function initialize() {
        resetInitialSettings();

        eventBus.on(Events.STREAMS_COMPOSED, _onStreamsComposed, this);
        eventBus.on(MediaPlayerEvents.PLAYBACK_STARTED, _onPlaybackStarted, this);
        eventBus.on(MediaPlayerEvents.PLAYBACK_PAUSED, _onPlaybackPaused, this);
        eventBus.on(Events.INTERNAL_MANIFEST_LOADED, _onManifestLoaded, this);
    }

    function setManifest(manifest) {
        _update(manifest);
    }

    function resetInitialSettings() {
        refreshDelay = NaN;
        isUpdating = false;
        isPaused = true;
        isStopped = false;
        _stopManifestRefreshTimer();
    }

    function reset() {

        eventBus.off(MediaPlayerEvents.PLAYBACK_STARTED, _onPlaybackStarted, this);
        eventBus.off(MediaPlayerEvents.PLAYBACK_PAUSED, _onPlaybackPaused, this);
        eventBus.off(Events.STREAMS_COMPOSED, _onStreamsComposed, this);
        eventBus.off(Events.INTERNAL_MANIFEST_LOADED, _onManifestLoaded, this);

        resetInitialSettings();
    }

    function _stopManifestRefreshTimer() {
        if (refreshTimer !== null) {
            clearTimeout(refreshTimer);
            refreshTimer = null;
        }
    }

    function startManifestRefreshTimer(delay) {
        _stopManifestRefreshTimer();

        if (isStopped) {
            return;
        }

        if (isNaN(delay) && !isNaN(refreshDelay)) {
            delay = refreshDelay * 1000;
        }

        if (!isNaN(delay)) {
            logger.debug('Refresh manifest in ' + delay + ' milliseconds.');
            refreshTimer = setTimeout(_onRefreshTimer, delay);
        }
    }

    function refreshManifest(ignorePatch = false) {
        isUpdating = true;
        const manifest = manifestModel.getValue();

        // default to the original url in the manifest
        let url = manifest.url;

        // Remove previous CMCD parameters from URL
        if (url) {
            url = Utils.removeQueryParameterFromUrl(url, Constants.CMCD_QUERY_KEY);
        }

        // Check for PatchLocation and Location alternatives
        let serviceLocation = null;
        const availablePatchLocations = adapter.getPatchLocation(manifest);
        const patchLocation = locationSelector.select(availablePatchLocations);
        let queryParams = null;
        if (patchLocation && !ignorePatch) {
            url = patchLocation.url;
            serviceLocation = patchLocation.serviceLocation;
            queryParams = patchLocation.queryParams;
        } else {
            const availableMpdLocations = _getAvailableMpdLocations(manifest);
            const mpdLocation = locationSelector.select(availableMpdLocations);
            if (mpdLocation) {
                url = mpdLocation.url;
                serviceLocation = mpdLocation.serviceLocation;
                queryParams = mpdLocation.queryParams;
            }
        }

        // if one of the alternatives was relative, convert to absolute
        if (urlUtils.isRelative(url)) {
            url = urlUtils.resolve(url, manifest.url);
        }

        manifestLoader.load(url, serviceLocation, queryParams);
    }

    function _getAvailableMpdLocations(manifest) {
        const manifestLocations = adapter.getLocation(manifest);
        const synthesizedElements = contentSteeringController.getSynthesizedLocationElements(manifestLocations);

        return manifestLocations.concat(synthesizedElements);
    }

    function _update(manifest) {
        if (!manifest) {
            // successful update with no content implies existing manifest remains valid
            manifest = manifestModel.getValue();

            // override load time to avoid invalid latency tracking and ensure update cadence
            manifest.loadedTime = new Date();
        } else if (adapter.getIsPatch(manifest)) {
            // with patches the in-memory manifest is our base
            let patch = manifest;
            manifest = manifestModel.getValue();

            // check for patch validity
            let isPatchValid = adapter.isPatchValid(manifest, patch);
            let patchSuccessful = isPatchValid;

            if (isPatchValid) {
                // grab publish time before update
                let publishTime = adapter.getPublishTime(manifest);

                // apply validated patch to manifest
                adapter.applyPatchToManifest(manifest, patch);

                // get the updated publish time
                let updatedPublishTime = adapter.getPublishTime(manifest);

                // ensure the patch properly updated the in-memory publish time
                patchSuccessful = publishTime.getTime() !== updatedPublishTime.getTime();
            }

            // if the patch failed to apply, force a full manifest refresh
            if (!patchSuccessful) {
                logger.debug('Patch provided is invalid, performing full manifest refresh');
                refreshManifest(true);
                return;
            }

            // override load time to avoid invalid latency tracking and ensure update cadence
            manifest.loadedTime = new Date();
        }

        // See DASH-IF IOP v4.3 section 4.6.4 "Transition Phase between Live and On-Demand"
        // Stop manifest update, ignore static manifest and signal end of dynamic stream to detect end of stream
        if (manifestModel.getValue() && manifestModel.getValue().type === DashConstants.DYNAMIC && manifest.type === DashConstants.STATIC) {
            eventBus.trigger(Events.DYNAMIC_TO_STATIC);
            isUpdating = false;
            isStopped = true;
            return;
        }

        manifestModel.setValue(manifest);

        const date = new Date();
        const latencyOfLastUpdate = (date.getTime() - manifest.loadedTime.getTime()) / 1000;
        refreshDelay = adapter.getManifestUpdatePeriod(manifest, latencyOfLastUpdate);
        // setTimeout uses a 32 bit number to store the delay. Any number greater than it
        // will cause event associated with setTimeout to trigger immediately
        if (refreshDelay * 1000 > 0x7FFFFFFF) {
            refreshDelay = 0x7FFFFFFF / 1000;
        }

        const manifestProfiles = manifest.profiles ? manifest.profiles.split(',') : [];
        if (manifestProfiles.includes(DashConstants.LIST_PROFILE_SCHEME)) {
            const linkedPeriods = adapter.getLinkedPeriods(manifest)
            eventBus.trigger(Events.IMPORTED_MPDS_LOADED, { manifest, linkedPeriods } )
        } else {
            eventBus.trigger(Events.MANIFEST_UPDATED, { manifest: manifest });
            logger.info('Manifest has been refreshed at ' + date + '[' + date.getTime() / 1000 + '] ');
        }

        if (!isPaused) {
            startManifestRefreshTimer();
        }
    }

    function _onRefreshTimer() {
        if (isPaused) {
            return;
        }
        if (isUpdating) {
            startManifestRefreshTimer(settings.get().streaming.manifestUpdateRetryInterval);
            return;
        }
        refreshManifest();
    }

    function _onManifestLoaded(e) {
        if (!e.error) {
            const manifest = e.manifest;
            _addExternalElements(manifest);
            _update(manifest);
        } else if (e.error.code === Errors.MANIFEST_LOADER_PARSING_FAILURE_ERROR_CODE) {
            errHandler.error(e.error);
        }
    }

    function _addExternalElements(manifest) {
        _addExternalSubtitles(manifest)
    }

    function _addExternalSubtitles(manifest) {
        const externalSubtitles = customParametersModel.getExternalSubtitles();
        if (!externalSubtitles || externalSubtitles.length === 0) {
            return;
        }
        const numberOfPeriods = manifest && manifest.Period ? manifest.Period.length : 0;
        externalSubtitles.forEach((externalSubtitle) => {
            if (externalSubtitle.periodId === null && numberOfPeriods > 1) {
                logger.warn(`External subtitle with id ${externalSubtitle.id} has no periodId and the MPD contains more than one period. Unable to add the external subtitle as it is not clear which period shall be used.`);
            } else if (numberOfPeriods === 1) {
                _spliceExternalSubtitleInPeriod(manifest.Period[0], externalSubtitle);
            } else {
                const targetPeriod = manifest.Period.find((period) => {
                    return period.id === externalSubtitle.periodId;
                });
                if (targetPeriod) {
                    _spliceExternalSubtitleInPeriod(targetPeriod, externalSubtitle);
                } else {
                    logger.warn(`External subtitle with id ${externalSubtitle.id} has periodId ${externalSubtitle.periodId} but the MPD does not contain a period with that id. Unable to add the external subtitle.`);
                }
            }
        })
    }

    function _spliceExternalSubtitleInPeriod(period, externalSubtitle) {
        if (!period || !period.AdaptationSet) {
            return period
        }
        period.AdaptationSet.push(externalSubtitle.serializeToMpdParserFormat());
    }

    function _onPlaybackStarted(/*e*/) {
        isPaused = false;
        startManifestRefreshTimer();
    }

    function _onPlaybackPaused(/*e*/) {
        isPaused = !settings.get().streaming.scheduling.scheduleWhilePaused;

        if (isPaused) {
            _stopManifestRefreshTimer();
        }
    }

    function _onStreamsComposed(/*e*/) {
        // When streams are ready we can consider manifest update completed. Resolve the update promise.
        isUpdating = false;
    }

    function getIsUpdating() {
        return isUpdating;
    }

    instance = {
        getIsUpdating,
        initialize,
        refreshManifest,
        reset,
        setConfig,
        setManifest
    };

    setup();
    return instance;
}

ManifestUpdater.__dashjs_factory_name = 'ManifestUpdater';
export default FactoryMaker.getClassFactory(ManifestUpdater);
