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
import Debug from '../../core/Debug.js';
import URLLoader from '../../streaming/net/URLLoader.js';
import Errors from '../../core/errors/Errors.js';
import ContentSteeringRequest from '../vo/ContentSteeringRequest.js';
import ContentSteeringResponse from '../vo/ContentSteeringResponse.js';
import DashConstants from '../constants/DashConstants.js';
import MediaPlayerEvents from '../../streaming/MediaPlayerEvents.js';
import URLUtils from '../../streaming/utils/URLUtils.js';
import BaseURL from '../vo/BaseURL.js';
import MpdLocation from '../vo/MpdLocation.js';
import Utils from '../../core/Utils.js';

const QUERY_PARAMETER_KEYS = {
    THROUGHPUT: '_DASH_throughput',
    PATHWAY: '_DASH_pathway',
    URL: 'url'
};

const THROUGHPUT_SAMPLES = 4;

function ContentSteeringController() {
    const context = this.context;
    const urlUtils = URLUtils(context).getInstance();

    let instance,
        logger,
        currentSteeringResponseData,
        serviceLocationList,
        throughputList,
        nextRequestTimer,
        urlLoader,
        errHandler,
        dashMetrics,
        mediaPlayerModel,
        manifestModel,
        serviceDescriptionController,
        throughputController,
        eventBus,
        adapter;

    function setup() {
        logger = Debug(context).getInstance().getLogger(instance);
        _resetInitialSettings();
    }

    function setConfig(config) {
        if (!config) {
            return;
        }

        if (config.adapter) {
            adapter = config.adapter;
        }
        if (config.errHandler) {
            errHandler = config.errHandler;
        }
        if (config.dashMetrics) {
            dashMetrics = config.dashMetrics;
        }
        if (config.mediaPlayerModel) {
            mediaPlayerModel = config.mediaPlayerModel;
        }
        if (config.manifestModel) {
            manifestModel = config.manifestModel;
        }
        if (config.serviceDescriptionController) {
            serviceDescriptionController = config.serviceDescriptionController;
        }
        if (config.throughputController) {
            throughputController = config.throughputController;
        }
        if (config.eventBus) {
            eventBus = config.eventBus;
        }
    }

    /**
     * Initialize the steering controller by instantiating classes and registering observer callback
     */
    function initialize() {
        urlLoader = URLLoader(context).create({
            errHandler,
            dashMetrics,
            mediaPlayerModel,
            errors: Errors
        });
        eventBus.on(MediaPlayerEvents.FRAGMENT_LOADING_STARTED, _onFragmentLoadingStarted, instance);
        eventBus.on(MediaPlayerEvents.MANIFEST_LOADING_STARTED, _onManifestLoadingStarted, instance);
        eventBus.on(MediaPlayerEvents.THROUGHPUT_MEASUREMENT_STORED, _onThroughputMeasurementStored, instance);

    }

    /**
     * When loading of a fragment starts we store its serviceLocation in our list
     * @param {object} e
     * @private
     */
    function _onFragmentLoadingStarted(e) {
        _addToServiceLocationList(e, 'baseUrl');
    }

    /**
     * When loading of a manifest starts we store its serviceLocation in our list
     * @param {object} e
     * @private
     */
    function _onManifestLoadingStarted(e) {
        _addToServiceLocationList(e, 'location')
    }

    /**
     * When a throughput measurement  was stored in ThroughputModel we save it
     * @param {object} e
     * @private
     */
    function _onThroughputMeasurementStored(e) {
        if (!e || !e.throughputValues || !e.throughputValues.serviceLocation) {
            return;
        }

        _storeThroughputForServiceLocation(e.throughputValues.serviceLocation, e.throughputValues);
    }

    /**
     * Helper function to store a throughput value from the corresponding serviceLocation
     * @param {string} serviceLocation
     * @param {number} throughput
     * @private
     */
    function _storeThroughputForServiceLocation(serviceLocation, throughput) {
        if (!throughputList[serviceLocation]) {
            throughputList[serviceLocation] = [];
        }
        throughputList[serviceLocation].push(throughput)
        if (throughputList[serviceLocation].length > THROUGHPUT_SAMPLES) {
            throughputList[serviceLocation].shift();
        }
    }

    /**
     * Adds a new service location entry to our list
     * @param {object} e
     * @param {string} type
     * @private
     */
    function _addToServiceLocationList(e, type) {
        if (e && e.request && e.request.serviceLocation) {
            const serviceLocation = e.request.serviceLocation;
            if (serviceLocationList[type].all.indexOf(serviceLocation) === -1) {
                serviceLocationList[type].all.push(serviceLocation)
            }
            serviceLocationList[type].current = serviceLocation;
        }
    }

    /**
     * Query DashAdapter and Service Description Controller to get the steering information defined in the manifest
     * @returns {object}
     */
    function getSteeringDataFromManifest() {
        const manifest = manifestModel.getValue()
        let contentSteeringData = adapter.getContentSteering(manifest);

        if (!contentSteeringData) {
            contentSteeringData = serviceDescriptionController.getServiceDescriptionSettings().contentSteering;
        }

        return contentSteeringData;
    }

    /**
     * Should query steering server prior to playback start
     * @returns {boolean}
     */
    function shouldQueryBeforeStart() {
        const steeringDataFromManifest = getSteeringDataFromManifest();
        return !!steeringDataFromManifest && steeringDataFromManifest.queryBeforeStart;
    }

    /**
     * Load the steering data from the steering server
     * @returns {Promise}
     */
    function loadSteeringData() {
        return new Promise((resolve) => {
            try {
                const steeringDataFromManifest = getSteeringDataFromManifest();
                if (!steeringDataFromManifest || !steeringDataFromManifest.serverUrl) {
                    resolve();
                    return;
                }

                const url = _getSteeringServerUrl(steeringDataFromManifest);
                const request = new ContentSteeringRequest(url);
                urlLoader.load({
                    request: request,
                    success: (data) => {
                        _handleSteeringResponse(data);
                        eventBus.trigger(MediaPlayerEvents.CONTENT_STEERING_REQUEST_COMPLETED, {
                            currentSteeringResponseData,
                            url
                        });
                        resolve();
                    },
                    error: (e, error, statusText, response) => {
                        _handleSteeringResponseError(e, response);
                        resolve(e);
                    },
                    complete: () => {
                        // Clear everything except for the current entry
                        serviceLocationList.baseUrl.all = _getClearedServiceLocationListAfterSteeringRequest(serviceLocationList.baseUrl);
                        serviceLocationList.location.all = _getClearedServiceLocationListAfterSteeringRequest(serviceLocationList.location);
                    }
                });
            } catch (e) {
                resolve(e);
            }
        })
    }

    /**
     * Return the cleared data of our serviceLocationList after the steering request was completed
     * @param {object} data
     * @returns {Object[]}
     * @private
     */
    function _getClearedServiceLocationListAfterSteeringRequest(data) {
        if (!data.all || data.all.length === 0 || !data.current) {
            return [];
        }
        return data.all.filter((entry) => {
            return entry === data.current;
        })
    }

    /**
     * Returns the adjusted steering server url enhanced by pathway and throughput parameter
     * @param {object} steeringDataFromManifest
     * @returns {string}
     * @private
     */
    function _getSteeringServerUrl(steeringDataFromManifest) {
        let url = steeringDataFromManifest.serverUrl;
        if (currentSteeringResponseData && currentSteeringResponseData.reloadUri) {
            if (urlUtils.isRelative(currentSteeringResponseData.reloadUri)) {
                url = urlUtils.resolve(currentSteeringResponseData.reloadUri, steeringDataFromManifest.serverUrl);
            } else {
                url = currentSteeringResponseData.reloadUri;
            }
        }

        const additionalQueryParameter = [];

        const serviceLocations = serviceLocationList.baseUrl.all.concat(serviceLocationList.location.all);
        if (serviceLocations.length > 0) {

            // Derive throughput for each service Location
            const data = serviceLocations.map((serviceLocation) => {
                const throughput = _calculateThroughputForServiceLocation(serviceLocation);
                return {
                    serviceLocation,
                    throughput
                }
            })

            let pathwayString = '';
            let throughputString = '';

            data.forEach((entry, index) => {
                if (index !== 0) {
                    pathwayString += ',';
                    throughputString += ',';
                }

                pathwayString += entry.serviceLocation;
                throughputString += entry.throughput > -1 ? entry.throughput : '';
            });

            additionalQueryParameter.push({
                key: QUERY_PARAMETER_KEYS.PATHWAY,
                value: `"${pathwayString}"`
            });
            additionalQueryParameter.push({
                key: QUERY_PARAMETER_KEYS.THROUGHPUT,
                value: throughputString
            });
        }

        url = Utils.addAdditionalQueryParameterToUrl(url, additionalQueryParameter);
        return url;
    }

    /**
     * Calculate the arithmetic mean of the last throughput samples
     * @param {string} serviceLocation
     * @returns {number}
     * @private
     */
    function _calculateThroughputForServiceLocation(serviceLocation) {
        if (!serviceLocation || !throughputList[serviceLocation] || throughputList[serviceLocation].length === 0) {
            return -1;
        }
        const throughput = throughputController.getArithmeticMean(throughputList[serviceLocation], throughputList[serviceLocation].length, true);

        return parseInt(throughput * 1000);
    }


    /**
     * Parse the steering response and create instance of model ContentSteeringResponse
     * @param {object} data
     * @private
     */
    function _handleSteeringResponse(data) {
        if (!data || !data[DashConstants.CONTENT_STEERING_RESPONSE.VERSION] || parseInt(data[DashConstants.CONTENT_STEERING_RESPONSE.VERSION]) !== 1) {
            return;
        }

        // Update the data for other classes to use
        currentSteeringResponseData = new ContentSteeringResponse();
        currentSteeringResponseData.version = data[DashConstants.CONTENT_STEERING_RESPONSE.VERSION];

        if (data[DashConstants.CONTENT_STEERING_RESPONSE.TTL] && !isNaN(data[DashConstants.CONTENT_STEERING_RESPONSE.TTL])) {
            currentSteeringResponseData.ttl = data[DashConstants.CONTENT_STEERING_RESPONSE.TTL];
        }
        if (data[DashConstants.CONTENT_STEERING_RESPONSE.RELOAD_URI]) {
            currentSteeringResponseData.reloadUri = data[DashConstants.CONTENT_STEERING_RESPONSE.RELOAD_URI]
        }
        if (data[DashConstants.CONTENT_STEERING_RESPONSE.PATHWAY_PRIORITY]) {
            currentSteeringResponseData.pathwayPriority = data[DashConstants.CONTENT_STEERING_RESPONSE.PATHWAY_PRIORITY]
        }
        if (data[DashConstants.CONTENT_STEERING_RESPONSE.PATHWAY_CLONES]) {
            currentSteeringResponseData.pathwayClones = data[DashConstants.CONTENT_STEERING_RESPONSE.PATHWAY_CLONES]
            currentSteeringResponseData.pathwayClones = currentSteeringResponseData.pathwayClones.filter((pathwayClone) => {
                return _isValidPathwayClone(pathwayClone);
            })
        }

        _startSteeringRequestTimer();
    }

    /**
     * Checks if object is a valid PathwayClone
     * @param {object} pathwayClone
     * @returns {boolean}
     * @private
     */
    function _isValidPathwayClone(pathwayClone) {
        return pathwayClone[DashConstants.CONTENT_STEERING_RESPONSE.BASE_ID]
            && pathwayClone[DashConstants.CONTENT_STEERING_RESPONSE.ID]
            && pathwayClone[DashConstants.CONTENT_STEERING_RESPONSE.URI_REPLACEMENT]
            && pathwayClone[DashConstants.CONTENT_STEERING_RESPONSE.URI_REPLACEMENT][DashConstants.CONTENT_STEERING_RESPONSE.HOST]
    }

    /**
     * Returns synthesized BaseURL elements based on Pathway Cloning
     * @param {BaseURL[]}referenceElements
     * @returns {BaseURL[]}
     */
    function getSynthesizedBaseUrlElements(referenceElements) {
        try {
            const synthesizedElements = _getSynthesizedElements(referenceElements);

            return synthesizedElements.map((element) => {
                const synthesizedBaseUrl = new BaseURL(element.synthesizedUrl, element.serviceLocation)
                synthesizedBaseUrl.queryParams = element.queryParams;
                synthesizedBaseUrl.dvbPriority = element.reference.dvbPriority;
                synthesizedBaseUrl.dvbWeight = element.reference.dvbWeight;
                synthesizedBaseUrl.availabilityTimeOffset = element.reference.availabilityTimeOffset;
                synthesizedBaseUrl.availabilityTimeComplete = element.reference.availabilityTimeComplete;

                return synthesizedBaseUrl;
            })

        } catch (e) {
            logger.error(e);
            return [];
        }
    }

    /**
     * Returns synthesized Location elements based on Pathway Cloning
     * @param {MpdLocation[]} referenceElements
     * @returns {MpdLocation[]}
     */
    function getSynthesizedLocationElements(referenceElements) {
        try {
            const synthesizedElements = _getSynthesizedElements(referenceElements);

            return synthesizedElements.map((element) => {
                const synthesizedLocation = new MpdLocation(element.synthesizedUrl, element.serviceLocation)
                synthesizedLocation.queryParams = element.queryParams;

                return synthesizedLocation;
            })

        } catch (e) {
            logger.error(e);
            return [];
        }
    }

    /**
     * Helper function to synthesize elements
     * @param {array} referenceElements
     * @returns {array}
     * @private
     */
    function _getSynthesizedElements(referenceElements) {
        try {
            const synthesizedElements = [];

            if (!referenceElements || referenceElements.length === 0 || !currentSteeringResponseData || !currentSteeringResponseData.pathwayClones || currentSteeringResponseData.pathwayClones.length === 0) {
                return synthesizedElements;
            }

            currentSteeringResponseData.pathwayClones.forEach((pathwayClone) => {
                let baseElements = referenceElements.filter((source) => {
                    return pathwayClone[DashConstants.CONTENT_STEERING_RESPONSE.BASE_ID] === source.serviceLocation;
                })
                let reference = null;
                if (baseElements && baseElements.length > 0) {
                    reference = baseElements[0];
                }
                if (reference) {
                    const referenceUrl = new URL(reference.url);
                    let host = pathwayClone[DashConstants.CONTENT_STEERING_RESPONSE.URI_REPLACEMENT][DashConstants.CONTENT_STEERING_RESPONSE.HOST];
                    host = Utils.stringHasProtocol(host) ? host : `${referenceUrl.protocol}//${host}`;
                    const synthesizedElement =
                        {
                            synthesizedUrl: `${host}${referenceUrl.pathname}`,
                            serviceLocation: pathwayClone[DashConstants.CONTENT_STEERING_RESPONSE.ID],
                            queryParams: pathwayClone[DashConstants.CONTENT_STEERING_RESPONSE.URI_REPLACEMENT][DashConstants.CONTENT_STEERING_RESPONSE.PARAMS],
                            reference
                        };

                    synthesizedElements.push(synthesizedElement);
                }
            });

            return synthesizedElements;
        } catch (e) {
            logger.error(e);
            return [];
        }
    }

    /**
     * Start timeout for next steering request
     * @private
     */
    function _startSteeringRequestTimer() {
        // Start timer for next request
        if (currentSteeringResponseData && currentSteeringResponseData.ttl && !isNaN(currentSteeringResponseData.ttl)) {
            if (nextRequestTimer) {
                clearTimeout(nextRequestTimer);
            }
            nextRequestTimer = setTimeout(() => {
                loadSteeringData();
            }, currentSteeringResponseData.ttl * 1000);
        }
    }

    /**
     * Stop timeout for next steering request
     */
    function stopSteeringRequestTimer() {
        if (nextRequestTimer) {
            clearTimeout(nextRequestTimer);
        }
        nextRequestTimer = null;
    }

    /**
     * Handle errors that occured when querying the steering server
     * @param {object} e
     * @param {object} response
     * @private
     */
    function _handleSteeringResponseError(e, response) {
        try {
            logger.warn(`Error fetching data from content steering server`, e);
            const statusCode = response.status;

            switch (statusCode) {
                // 410 response code. Stop steering
                case 410:
                    break;
                // 429 Too Many Requests. Replace existing TTL value with Retry-After header if present
                case 429:
                    const retryAfter = response && response.getResponseHeader ? response.getResponseHeader('retry-after') : null;
                    if (retryAfter !== null) {
                        if (!currentSteeringResponseData) {
                            currentSteeringResponseData = {};
                        }
                        currentSteeringResponseData.ttl = parseInt(retryAfter);
                    }
                    _startSteeringRequestTimer();
                    break;
                default:
                    _startSteeringRequestTimer();
                    break;
            }
        } catch (e) {
            logger.error(e);
        }
    }

    /**
     * Returns the currentSteeringResponseData
     * @returns {ContentSteeringResponse}
     */
    function getCurrentSteeringResponseData() {
        return currentSteeringResponseData;
    }

    function reset() {
        _resetInitialSettings();
        eventBus.off(MediaPlayerEvents.FRAGMENT_LOADING_STARTED, _onFragmentLoadingStarted, instance);
        eventBus.off(MediaPlayerEvents.MANIFEST_LOADING_STARTED, _onManifestLoadingStarted, instance);
        eventBus.off(MediaPlayerEvents.THROUGHPUT_MEASUREMENT_STORED, _onThroughputMeasurementStored, instance);
    }

    function _resetInitialSettings() {
        currentSteeringResponseData = null;
        throughputList = {};
        serviceLocationList = {
            baseUrl: {
                current: null,
                all: []
            },
            location: {
                current: null,
                all: []
            }
        };
        stopSteeringRequestTimer()
    }


    instance = {
        reset,
        setConfig,
        loadSteeringData,
        getCurrentSteeringResponseData,
        shouldQueryBeforeStart,
        getSteeringDataFromManifest,
        stopSteeringRequestTimer,
        getSynthesizedBaseUrlElements,
        getSynthesizedLocationElements,
        initialize
    };

    setup();

    return instance;
}

ContentSteeringController.__dashjs_factory_name = 'ContentSteeringController';
export default FactoryMaker.getSingletonFactory(ContentSteeringController);
