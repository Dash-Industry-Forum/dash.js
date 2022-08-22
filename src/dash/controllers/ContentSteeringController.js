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
import FactoryMaker from '../../core/FactoryMaker';
import Debug from '../../core/Debug';
import URLLoader from '../../streaming/net/URLLoader';
import Errors from '../../core/errors/Errors';
import ContentSteeringRequest from '../vo/ContentSteeringRequest';
import ContentSteeringResponse from '../vo/ContentSteeringResponse';
import DashConstants from '../constants/DashConstants';
import manifestModel from '../../streaming/models/ManifestModel';

function ContentSteeringController() {
    const context = this.context;

    let instance,
        logger,
        currentSteeringResponseData,
        urlLoader,
        errHandler,
        dashMetrics,
        mediaPlayerModel,
        manifestModel,
        requestModifier,
        adapter;

    function setup() {
        logger = Debug(context).getInstance().getLogger(instance);
        _resetInitialSettings();
    }

    function setConfig(config) {
        if (!config) return;

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
        if (config.requestModifier) {
            requestModifier = config.requestModifier;
        }
        if(config.manifestModel) {
            manifestModel = config.manifestModel;
        }

        urlLoader = URLLoader(context).create({
            errHandler,
            dashMetrics,
            mediaPlayerModel,
            requestModifier,
            errors: Errors
        });
    }


    function loadSteeringData(beforePlaybackStart = false) {
        return new Promise((resolve, reject) => {
            try {
                const manifest = manifestModel.getValue()
                const steeringDataFromManifest = adapter.getContentSteering(manifest);
                if (!steeringDataFromManifest || !steeringDataFromManifest.serverUrl || (beforePlaybackStart && !steeringDataFromManifest.queryBeforeStart)) {
                    resolve();
                    return;
                }
                const request = new ContentSteeringRequest(steeringDataFromManifest.serverUrl);
                urlLoader.load({
                    request: request,
                    success: (data) => {
                        _handleSteeringResponse(data);
                        resolve();
                    },
                    error: (e) => {
                        _handleSteeringResponseError(e);
                        reject(e);
                    }
                });
            } catch (e) {
                reject(e);
            }
        })
    }


    function _handleSteeringResponse(data) {
        if (!data || !data[DashConstants.CONTENT_STEERING_RESPONSE.VERSION] || parseInt(data[DashConstants.CONTENT_STEERING_RESPONSE.VERSION]) !== 1) {
            return;
        }

        currentSteeringResponseData = new ContentSteeringResponse();
        currentSteeringResponseData.version = data[DashConstants.CONTENT_STEERING_RESPONSE.VERSION];

        if (data[DashConstants.CONTENT_STEERING_RESPONSE.TTL] && !isNaN(data[DashConstants.CONTENT_STEERING_RESPONSE.TTL])) {
            currentSteeringResponseData.ttl = data[DashConstants.CONTENT_STEERING_RESPONSE.TTL];
        }
        if (data[DashConstants.CONTENT_STEERING_RESPONSE.RELOAD_URI]) {
            currentSteeringResponseData.reloadUri = data[DashConstants.CONTENT_STEERING_RESPONSE.RELOAD_URI]
        }
        if (data[DashConstants.CONTENT_STEERING_RESPONSE.SERVICE_LOCATION_PRIORITY]) {
            currentSteeringResponseData.serviceLocationPriority = data[DashConstants.CONTENT_STEERING_RESPONSE.SERVICE_LOCATION_PRIORITY]
        }
    }

    function _handleSteeringResponseError(e) {
        logger.warn(`Error fetching data from content steering server`, e);
    }

    function reset() {
        _resetInitialSettings();
    }

    function _resetInitialSettings() {
        currentSteeringResponseData = null;
    }


    instance = {
        reset,
        setConfig,
        loadSteeringData
    };

    setup();

    return instance;
}

ContentSteeringController.__dashjs_factory_name = 'ContentSteeringController';
export default FactoryMaker.getSingletonFactory(ContentSteeringController);
