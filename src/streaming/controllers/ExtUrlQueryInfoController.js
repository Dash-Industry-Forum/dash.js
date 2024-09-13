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
import Constants from '../constants/Constants.js';

function ExtUrlQueryInfoController() {
    let instance,
        mpd;


    function generateQueryParams(resultObject, manifestObejc, propertyString, mpdUrlQuery, defaultInitialString) {
        const property = manifestObejc[propertyString]?.find((property) => property.schemeIdUri === Constants.URL_QUERY_INFO_SCHEME);
        generateInitialQueryString(property, defaultInitialString, resultObject, mpdUrlQuery);
        resultObject.finalQueryString = generateFinalQueryString(resultObject.initialQueryString, property);
        resultObject.sameOriginOnly = property?.ExtUrlQueryInfo?.sameOriginOnly;
        resultObject.includeInRequests = property?.ExtUrlQueryInfo?.includeInRequests ? property?.ExtUrlQueryInfo?.includeInRequests?.split(' ') : ['segment'];
        resultObject.queryParams = parseQueryParams(resultObject?.initialQueryString);
    }

    function createFinalQueryStrings(manifest) {
        mpd = {};
        const manifestUrl = new URL(manifest.url);
        mpd.origin = manifestUrl.origin;
        mpd.period = [];
        mpd.finalQueryString = '';
        const mpdUrlQuery = manifest.url.split('?')[1];

        generateQueryParams(mpd, manifest, 'SupplementalProperty', mpdUrlQuery, '');

        manifest.Period.forEach((period) => {
            const periodObject = {};
            periodObject.adaptation = [];
            periodObject.finalQueryString = '';

            generateQueryParams(periodObject, period, 'SupplementalProperty', mpdUrlQuery, mpd.initialQueryString);

            period.AdaptationSet.forEach((adaptationSet) => {
                const adaptationObject = {};
                adaptationObject.representation = [];
                adaptationObject.finalQueryString = '';

                generateQueryParams(adaptationObject, adaptationSet, 'EssentialProperty', mpdUrlQuery, periodObject.initialQueryString);

                adaptationSet.Representation.forEach((representation) => {
                    const representationObject = {};
                    representationObject.finalQueryString = '';

                    generateQueryParams(representationObject, representation, 'EssentialProperty', mpdUrlQuery, adaptationObject.initialQueryString);

                    adaptationObject.representation.push(representationObject);
                });
                periodObject.adaptation.push(adaptationObject);
            });
            mpd.period.push(periodObject);
        });
    }

    function parseQueryParams(queryParamString) {
        const params = [];
        if (queryParamString){
            const pairs = queryParamString.split('&');
            for (const pair of pairs) {
                const [key, value] = pair.split('=');
                const object = {};
                object.key = decodeURIComponent(key);
                object.value = decodeURIComponent(value);
                params.push(object);
            }
        }
        return params;
    }

    function generateInitialQueryString(essentialProperty, defaultInitialString, dst, mpdUrlQuery) {
        dst.initialQueryString = '';
        let initialQueryString = '';

        const queryInfo = essentialProperty?.ExtUrlQueryInfo || essentialProperty?.UrlQueryInfo;
        
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

    function buildInitialQueryParams(initialQueryString) {
        const params = {};
        const pairs = initialQueryString.split('&');
        for (const pair of pairs) {
            const [key, value] = pair.split('=');
            params[decodeURIComponent(key)] = decodeURIComponent(value);
        }
        return params;
    }

    function generateFinalQueryString(initialQueryString, essentialProperty) {
        if (essentialProperty) {

            const queryTemplate = essentialProperty?.ExtUrlQueryInfo?.queryTemplate || essentialProperty?.UrlQueryInfo?.queryTemplate || '';

            const initialQueryParams = buildInitialQueryParams(initialQueryString);
            if (queryTemplate === '$querypart$') {
                return Object.entries(initialQueryParams)
                    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
                    .join('&');
            } else {
                return queryTemplate?.replace(/(\$\$)|\$query:([^$]+)\$|(\$querypart\$)/g, (match, escape, paramName, querypart) => {
                    if (escape) {
                        return '$';
                    } else if (paramName) {
                        return initialQueryParams[paramName] || '';
                    } else if (querypart) {
                        return Object.entries(initialQueryParams)
                            .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
                            .join('&');
                    }
                });
            }
        }
    }

    function getFinalQueryString(request) {
        if (request.type == 'MediaSegment' || request.type == 'InitializationSegment') {
            if (mpd) {
                const representation = request.representation;
                const adaptation = representation.adaptation;
                const period = adaptation.period;
                const queryInfo = mpd
                    .period[period.index]
                    .adaptation[adaptation.index]
                    .representation[representation.index];
                const requestUrl = new URL(request.url);
                const canSendToOrigin = !queryInfo.sameOriginOnly || mpd.origin == requestUrl.origin;
                const inRequest = queryInfo.includeInRequests.includes('segment');
                if (inRequest && canSendToOrigin) {
                    return queryInfo.queryParams;
                }
            }
        }
        else if (request.type == 'MPD') {
            if (mpd) {
                const inRequest = ['mpd', 'mpdpatch'].some(r => mpd.includeInRequests.includes(r));
                if (inRequest) {
                    return mpd.queryParams;
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
