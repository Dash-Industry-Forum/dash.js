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
import { HTTPRequest } from '../vo/metrics/HTTPRequest.js';

function ExtUrlQueryInfoController() {
    let instance,
        mpdQueryStringInformation;


    function _generateQueryParams(resultObject, manifestObject, mpdUrlQuery, parentLevelInfo, level) {
        let properties = [];
        if (level === DashConstants.PERIOD) {
            properties = manifestObject[DashConstants.SUPPLEMENTAL_PROPERTY] || [];
        } else {
            properties = [
                ...(manifestObject[DashConstants.ESSENTIAL_PROPERTY] || []),
                ...(manifestObject[DashConstants.SUPPLEMENTAL_PROPERTY] || [])
            ];
        }
        const property = properties.filter((prop) => (
            (prop.schemeIdUri === Constants.URL_QUERY_INFO_SCHEME && prop.UrlQueryInfo) ||
            (prop.schemeIdUri === Constants.EXT_URL_QUERY_INFO_SCHEME && prop.ExtUrlQueryInfo)
        ))[0];
        _generateInitialQueryString(property, parentLevelInfo.initialQueryString, resultObject, mpdUrlQuery);
        resultObject.sameOriginOnly = property?.ExtUrlQueryInfo?.sameOriginOnly;
        resultObject.queryParams = Utils.parseQueryParams(resultObject?.initialQueryString);
        if (property) {
            if (property.ExtUrlQueryInfo?.includeInRequests) {
              resultObject.includeInRequests = property.ExtUrlQueryInfo.includeInRequests.split(' ');
            } else {
              resultObject.includeInRequests = [DashConstants.SEGMENT_TYPE];
            }
        } else {
            resultObject.includeInRequests = parentLevelInfo.includeInRequests;
        }
    }

    function createFinalQueryStrings(manifest) {
        mpdQueryStringInformation = {};
        const manifestUrl = new URL(manifest.url);
        mpdQueryStringInformation.origin = manifestUrl.origin;
        mpdQueryStringInformation.period = [];
        mpdQueryStringInformation.finalQueryString = '';
        const mpdUrlQuery = manifest.url.split('?')[1];
        const initialMpdObject = {initialQueryString: '', includeInRequests: []};

        _generateQueryParams(mpdQueryStringInformation, manifest, mpdUrlQuery, initialMpdObject, DashConstants.MPD);

        manifest.Period.forEach((period) => {
            const periodObject = {};
            periodObject.adaptation = [];
            periodObject.finalQueryString = '';

            _generateQueryParams(periodObject, period, mpdUrlQuery, mpdQueryStringInformation, DashConstants.PERIOD);

            period.AdaptationSet.forEach((adaptationSet) => {
                const adaptationObject = {};
                adaptationObject.representation = [];
                adaptationObject.finalQueryString = '';

                _generateQueryParams(adaptationObject, adaptationSet, mpdUrlQuery, periodObject, DashConstants.ADAPTATION_SET);

                adaptationSet.Representation.forEach((representation) => {
                    const representationObject = {};
                    representationObject.finalQueryString = '';

                    _generateQueryParams(representationObject, representation, mpdUrlQuery, adaptationObject, DashConstants.REPRESENTATION);

                    adaptationObject.representation.push(representationObject);
                });
                periodObject.adaptation.push(adaptationObject);
            });
            mpdQueryStringInformation.period.push(periodObject);
        });
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

    function getFinalQueryString(request) {
        if (request.type === HTTPRequest.MEDIA_SEGMENT_TYPE || request.type === HTTPRequest.INIT_SEGMENT_TYPE) {
            if (mpdQueryStringInformation) {
                const representation = request.representation;
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
            }
        }
        else if (request.type === HTTPRequest.MPD_TYPE) {
            if (mpdQueryStringInformation) {
                const inRequest = [DashConstants.MPD_TYPE, DashConstants.MPD_PATCH_TYPE].some(r => mpdQueryStringInformation.includeInRequests.includes(r));
                if (inRequest) {
                    return mpdQueryStringInformation.queryParams;
                }
            }
        }
        else if (request.type === HTTPRequest.CONTENT_STEERING_TYPE) {
            if (mpdQueryStringInformation) {
                const inRequest = mpdQueryStringInformation.includeInRequests.includes(DashConstants.STEERING_TYPE);
                if (inRequest) {
                    return mpdQueryStringInformation.queryParams;
                }
            }
        }
    }

    instance = {
        getFinalQueryString,
        createFinalQueryStrings
    };
    return instance;
}

ExtUrlQueryInfoController.__dashjs_factory_name = 'ExtUrlQueryInfoController';
export default FactoryMaker.getSingletonFactory(ExtUrlQueryInfoController);
