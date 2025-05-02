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
import Utils from '../../core/Utils.js';
import DashConstants from '../../dash/constants/DashConstants.js';
import Constants from '../constants/Constants.js';
import {HTTPRequest} from '../vo/metrics/HTTPRequest.js';
import Debug from '../../core/Debug.js';

function ExtUrlQueryInfoController() {
    let instance,
        logger,
        mpdQueryStringInformation;
    const context = this.context;

    function setup() {
        logger = Debug(context).getInstance().getLogger(instance);
    }

    function _generateQueryParams(resultObject, manifestObject, mpdUrlQuery, parentLevelInfo, mpdElement) {
        const property = _getDescriptorTypeFromManifestObject(manifestObject, mpdElement);

        _generateInitialQueryString(property, parentLevelInfo.initialQueryString, resultObject, mpdUrlQuery);
        _generateFinalQueryString(property, resultObject, parentLevelInfo.finalQueryString);

        resultObject.sameOriginOnly = property?.ExtUrlQueryInfo?.sameOriginOnly;
        resultObject.queryParams = Utils.parseQueryParams(resultObject?.finalQueryString);
        resultObject.includeInRequests = _getIncludeInRequestFromProperty(property, parentLevelInfo.includeInRequests);
    }

    function _getDescriptorTypeFromManifestObject(manifestObject, mpdElement) {
        let properties = [];
        if (mpdElement === DashConstants.PERIOD) {
            properties = manifestObject[DashConstants.SUPPLEMENTAL_PROPERTY] || [];
        } else {
            properties = [
                ...(manifestObject[DashConstants.ESSENTIAL_PROPERTY] || []),
                ...(manifestObject[DashConstants.SUPPLEMENTAL_PROPERTY] || [])
            ];
        }
        return properties.find((prop) => (
            (prop.schemeIdUri === Constants.URL_QUERY_INFO_SCHEME && prop.UrlQueryInfo) ||
            (prop.schemeIdUri === Constants.EXT_URL_QUERY_INFO_SCHEME && prop.ExtUrlQueryInfo)
        ));
    }

    function _generateInitialQueryString(property, defaultInitialString, dst, mpdUrlQuery) {
        dst.initialQueryString = '';
        let initialQueryString = '';

        const queryInfo = property?.ExtUrlQueryInfo || property?.UrlQueryInfo;

        if (queryInfo && queryInfo.queryString) {
            if (defaultInitialString && defaultInitialString.length > 0) {
                initialQueryString = defaultInitialString + '&' + queryInfo.queryString;
            } else {
                initialQueryString = queryInfo.queryString;
            }
        } else {
            initialQueryString = defaultInitialString;
        }
        if (queryInfo?.useMPDUrlQuery === 'true' && mpdUrlQuery) {
            initialQueryString = initialQueryString ? initialQueryString + '&' + mpdUrlQuery : mpdUrlQuery;
        }
        dst.initialQueryString = initialQueryString;
    }

    // The logic for supporting templates with queryTemplate=$query:<param>$ is not in place yet, this only support queryTemplate="$querypart$".
    function _generateFinalQueryString(property, resultObject, parentQueryString) {
        if (!property) {
            resultObject.finalQueryString = parentQueryString;
            return;
        }
        const queryTemplate = property?.ExtUrlQueryInfo?.queryTemplate || property?.UrlQueryInfo?.queryTemplate || '';
        resultObject.finalQueryString = queryTemplate === DashConstants.QUERY_PART ? resultObject?.initialQueryString : '';
    }

    function _getIncludeInRequestFromProperty(property, parentIncludeInRequests) {
        if (!property) {
            return parentIncludeInRequests;
        }

        if (property.ExtUrlQueryInfo?.includeInRequests) {
            return property.ExtUrlQueryInfo.includeInRequests.split(' ');
        } else {
            return [DashConstants.SEGMENT_TYPE];
        }
    }

    function createFinalQueryStrings(manifest) {
        mpdQueryStringInformation = {
            origin: new URL(manifest.url).origin,
            period: []
        };

        const mpdUrlQuery = manifest.url.split('?')[1];
        const initialMpdObject = { initialQueryString: '', includeInRequests: [] };

        _generateQueryParams(mpdQueryStringInformation, manifest, mpdUrlQuery, initialMpdObject, DashConstants.MPD);

        manifest.Period.forEach((period) => {
            const periodObject = {
                adaptation: []
            };
            _generateQueryParams(periodObject, period, mpdUrlQuery, mpdQueryStringInformation, DashConstants.PERIOD);

            if (!period.ImportedMPD) {
                period.AdaptationSet.forEach((adaptationSet) => {
                    const adaptationObject = {
                        representation: []
                    };
                    _generateQueryParams(adaptationObject, adaptationSet, mpdUrlQuery, periodObject, DashConstants.ADAPTATION_SET);

                    adaptationSet.Representation.forEach((representation) => {
                        const representationObject = {};
                        _generateQueryParams(representationObject, representation, mpdUrlQuery, adaptationObject, DashConstants.REPRESENTATION);

                        adaptationObject.representation.push(representationObject);
                    });
                    periodObject.adaptation.push(adaptationObject);
                });
            }
            mpdQueryStringInformation.period.push(periodObject);
        });
    }

    function getFinalQueryString(request) {
        try {
            if (!mpdQueryStringInformation) {
                return null;
            }
            if (request.type === HTTPRequest.MEDIA_SEGMENT_TYPE || request.type === HTTPRequest.INIT_SEGMENT_TYPE) {
                const representation = request.representation;

                if (!representation) {
                    return null;
                }
                const adaptation = representation.adaptation;
                const period = adaptation.period;
                const queryInfo = mpdQueryStringInformation
                    .period[period.index]
                    .adaptation[adaptation.index]
                    .representation[representation.index];
                const requestUrl = new URL(request.url);
                const canSendToOrigin = !queryInfo.sameOriginOnly || mpdQueryStringInformation.origin === requestUrl.origin;
                const inRequest = queryInfo.includeInRequests.includes(DashConstants.SEGMENT_TYPE);
                if (inRequest && canSendToOrigin) {
                    return queryInfo.queryParams;
                }
            } else if (request.type === HTTPRequest.MPD_TYPE) {
                const inRequest = [DashConstants.MPD_TYPE, DashConstants.MPD_PATCH_TYPE].some(r => mpdQueryStringInformation.includeInRequests.includes(r));
                if (inRequest) {
                    return mpdQueryStringInformation.queryParams;
                }
            } else if (request.type === HTTPRequest.CONTENT_STEERING_TYPE) {
                const inRequest = mpdQueryStringInformation.includeInRequests.includes(DashConstants.STEERING_TYPE);
                if (inRequest) {
                    return mpdQueryStringInformation.queryParams;
                }
            }
        } catch (e) {
            logger.error(e);
            return null
        }
    }

    setup();

    instance = {
        getFinalQueryString,
        createFinalQueryStrings
    };
    return instance;
}

ExtUrlQueryInfoController.__dashjs_factory_name = 'ExtUrlQueryInfoController';
export default FactoryMaker.getSingletonFactory(ExtUrlQueryInfoController);
