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

const Entities = require('html-entities').XmlEntities;
const OFFLINE_BASE_URL = 'offline_indexdb://';

/**
 * @module OfflineIndexDBManifestParser
 * @description  Parse online manifest to offline manifest
 * @param {Object} config - dependances
*/
function OfflineIndexDBManifestParser(config) {

    const manifestId = config.manifestId;
    const allMediaInfos = config.allMediaInfos;
    const urlUtils = config.urlUtils;
    const debug = config.debug;
    const dashConstants = config.dashConstants;
    const constants = config.constants;

    let instance,
        DOM,
        logger;


    function setup() {
        logger = debug.getLogger(instance);
    }

    /**
     * Parse XML manifest
     * @param {string} XMLDoc - xml manifest
     * @returns {string} parsed XML
     * @memberof module:OfflineIndexDBManifestParser
     * @instance
    */
    function parse(XMLDoc) {
        DOM = new DOMParser().parseFromString(XMLDoc, 'application/xml');
        let mpd = DOM.getElementsByTagName(dashConstants.MPD) ? DOM.getElementsByTagName(dashConstants.MPD) : null;

        for (let i = 0; i < mpd.length; i++) {
            if (mpd[i] !== null) {
                editBaseURLAttribute(mpd[i]);
                browsePeriods(mpd[i]);
            }
        }
        //TODO : remove promise timeOut
        return wait(1000).then(function () {
            return encodeManifest(DOM);
        });
    }

    /**
     * URL encode parsed manifest
     * @param {string} DOM
     * @memberof module:OfflineIndexDBManifestParser
     * @returns {string} Url encoded XML
     * @instance
    */
    function encodeManifest(DOM) {
        logger.info('encodedManifest ' + new XMLSerializer().serializeToString(DOM));
        return new Entities().encode(new XMLSerializer().serializeToString(DOM));
    }

    /**
     * Update baseURL to point to local stored data P
     * @param {XML} currentMPD
     * @memberof module:OfflineIndexDBManifestParser
     * @instance
    */
    function editBaseURLAttribute(currentMPD) {
        let basesURL,
            fragmentId,
            representationId;

        let url = `${OFFLINE_BASE_URL}${manifestId}/`;

        basesURL = currentMPD.getElementsByTagName(dashConstants.BASE_URL);

        if (basesURL.length === 0) {
            // add baseURL
            let element = DOM.createElement(dashConstants.BASE_URL);
            element.innerHTML = url;
            currentMPD.appendChild(element);
        }
        basesURL = currentMPD.getElementsByTagName(dashConstants.BASE_URL);
        for (let i = 0; i < basesURL.length; i++) {
            let parent = basesURL[i].parentNode;

            if (parent.nodeName === dashConstants.MPD) {
                basesURL[i].innerHTML = url;
            } else if (parent.nodeName === dashConstants.REPRESENTATION) {
                let adaptationsSet = parent.parentNode;
                if (adaptationsSet.nodeName == dashConstants.ADAPTATION_SET) {

                    if (urlUtils.isHTTPS(basesURL[i].innerHTML) || urlUtils.isHTTPURL(basesURL[i].innerHTML)) {
                        fragmentId = getFragmentId(basesURL[i].innerHTML);
                        representationId = getBestRepresentationId(adaptationsSet);
                        basesURL[i].innerHTML = url + representationId + '_' + fragmentId;
                    } else if (basesURL[i].innerHTML === './') {
                        basesURL[i].innerHTML = url;
                    } else {
                        fragmentId = getFragmentId(basesURL[i].innerHTML);
                        representationId = getBestRepresentationId(adaptationsSet);
                        basesURL[i].innerHTML = representationId + '_' + fragmentId;
                    }
                }
            } else {
                basesURL[i].innerHTML = url;
            }
        }
    }

    /**
     * Browse periods
     * @param {XML} currentMPD
     * @memberof module:OfflineIndexDBManifestParser
     * @instance
    */
    function browsePeriods(currentMPD) {
        let periods = currentMPD.getElementsByTagName(dashConstants.PERIOD);
        for (let j = 0; j < periods.length; j++) {
            browseAdaptationsSet(periods[j]);
        }
    }

    /**
     * Browse adapatation set to update data (delete those taht are not choosen by user ...)
     * @param {XML} currentPeriod
     * @memberof module:offline
     * @instance
    */
    function browseAdaptationsSet(currentPeriod) {
        let adaptationsSet,
            currentAdaptationSet,
            currentAdaptationType,
            representations;

        adaptationsSet = currentPeriod.getElementsByTagName(dashConstants.ADAPTATION_SET);

        for (let i = adaptationsSet.length - 1; i >= 0; i--) {
            currentAdaptationSet = adaptationsSet[i];
            if (currentAdaptationSet) {
                currentAdaptationType = findAdaptationType(currentAdaptationSet);
                representations = findRepresentations(currentAdaptationSet);

                findAndKeepOnlySelectedRepresentations(currentAdaptationSet, representations, currentAdaptationType);

                representations = findRepresentations(currentAdaptationSet);
                if (representations.length === 0) {
                    currentPeriod.removeChild(currentAdaptationSet);
                } else {
                    let segmentTemplate = getSegmentTemplate(currentAdaptationSet);
                    if (segmentTemplate.length >= 1) {
                        editSegmentTemplateAttributes(segmentTemplate);
                    }
                }
            }
        }
    }

    /**
     * Returns type of adapation set
     * @param {XML} currentAdaptationSet
     * @memberof module:offline
     * @returns {string|null} type
     * @instance
    */
    function findAdaptationType(currentAdaptationSet) {
        if (getIsMuxed(currentAdaptationSet)) {
            return constants.MUXED;
        } else if (getIsAudio(currentAdaptationSet)) {
            return constants.AUDIO;
        } else if (getIsVideo(currentAdaptationSet)) {
            return constants.VIDEO;
        } else if (getIsFragmentedText(currentAdaptationSet)) {
            return constants.FRAGMENTED_TEXT;
        } else if (getIsImage(currentAdaptationSet)) {
            return constants.IMAGE;
        }

        return constants.TEXT;
    }

    function getIsAudio(adaptation) {
        return getIsTypeOf(adaptation, constants.AUDIO);
    }

    function getIsVideo(adaptation) {
        return getIsTypeOf(adaptation, constants.VIDEO);
    }

    function getIsFragmentedText(adaptation) {
        return getIsTypeOf(adaptation, constants.FRAGMENTED_TEXT);
    }

    function getIsMuxed(adaptation) {
        return getIsTypeOf(adaptation, constants.MUXED);
    }

    function getIsImage(adaptation) {
        return getIsTypeOf(adaptation, constants.IMAGE);
    }

    // based upon DashManifestModel, but using DomParser
    function getIsTypeOf(adaptation, type) {

        let representation,
            mimeTypeRegEx;
        let result = false;
        let found = false;

        if (!adaptation) {
            throw new Error('adaptation is not defined');
        }

        if (!type) {
            throw new Error('type is not defined');
        }

        mimeTypeRegEx = (type !== constants.TEXT) ? new RegExp(type) : new RegExp('(vtt|ttml)');

        let representations = findRepresentations(adaptation);
        if (representations && representations.length > 0) {

            let codecs = representations[0].getAttribute(dashConstants.CODECS);
            if (codecs) {
                if (codecs.search(constants.STPP) === 0 || codecs.search(constants.WVTT) === 0) {
                    return type === constants.FRAGMENTED_TEXT;
                }
            }
        }

        let mimeType = findAdaptationSetMimeType(adaptation);
        if (mimeType) {
            result = mimeTypeRegEx.test(mimeType);
            found = true;
        }

        // couldn't find on adaptationset, so check a representation
        if (!found && representations) {
            for (let i = 0; i < representations.length; i++) {
                representation = representations[i];
                mimeType = findAdaptationSetMimeType(representation);

                if (mimeType) {
                    result = mimeTypeRegEx.test(mimeType);
                    break;
                }
            }
        }

        return result;
    }
    /**
     * Returns mime-type of adaptation set
     * @param {XML} currentAdaptationSet
     * @memberof module:offline
     * @returns {string|null} mimeType
     * @instance
    */
    function findAdaptationSetMimeType(currentAdaptationSet) {
        return currentAdaptationSet.getAttribute('mimeType');
    }

    /**
     * Returns representations of adaptation set
     * @param {XML} currentAdaptationSet
     * @memberof module:offline
     * @returns {XML} representations
     * @instance
    */
    function findRepresentations(currentAdaptationSet) {
        return currentAdaptationSet.getElementsByTagName(dashConstants.REPRESENTATION);
    }

    /**
     * Return segment template list of adaptations set
     * @param {XML} currentAdaptationSet
     * @memberof module:offline
     * @returns {XML} representations
     * @instance
    */
    function getSegmentTemplate(currentAdaptationSet) {
        return currentAdaptationSet.getElementsByTagName(dashConstants.SEGMENT_TEMPLATE);
    }

    /**
     * Update attributes of segment templates to match offline urls
     * @param {Array} segmentsTemplates
     * @memberof module:offline
     * @instance
    */
    function editSegmentTemplateAttributes(segmentsTemplates) {
        for (let i = 0; i < segmentsTemplates.length; i++) {
            let media = segmentsTemplates[i].getAttribute('media');
            media = '$RepresentationID$_$Number$' + media.substring(media.indexOf('.'), media.length); //id + extension
            segmentsTemplates[i].setAttribute('startNumber', '1');
            segmentsTemplates[i].setAttribute('media', media);
            segmentsTemplates[i].setAttribute('initialization','$RepresentationID$_0.m4v');
        }
    }

    /**
     * Delete all representations except the one choosed by user
     * @param {XML} currentAdaptationSet
     * @param {XML} representations
     * @param {string} adaptationType
     * @memberof module:offline
     * @instance
    */
    function findAndKeepOnlySelectedRepresentations(currentAdaptationSet, representations, adaptationType) {
        for ( var i = representations.length - 1; i >= 0; i--) {
            let representation = representations[i];
            let repId = representation.getAttribute(dashConstants.ID);
            if (allMediaInfos[adaptationType] && allMediaInfos[adaptationType].indexOf(repId) === -1) {
                // representation is not selected, remove it
                currentAdaptationSet.removeChild(representation);
            }
        }
    }

    //  UTILS

    /**
     * Timeout to perform operations on manifest --> TODO to be replaced by a promise
     * @param {number} delay
     * @memberof module:offline
     * @instance
    */
    function wait(delay) {
        return new Promise(function (resolve) {
            setTimeout(resolve, delay);
        });
    }

    /**
     * Get id of first representation of adaptation set
     * @param {XMl} currentAdaptationSet
     * @memberof module:offline
     * @returns {string} id
     * @instance
    */
    function getBestRepresentationId(currentAdaptationSet) {
        let bestRepresentation = currentAdaptationSet.getElementsByTagName(dashConstants.REPRESENTATION)[0];
        console.log(bestRepresentation.getAttribute(dashConstants.ID));
        return bestRepresentation.getAttribute(dashConstants.ID);
    }

    /**
     * Parse and returns fragments of offline url => xxxx://xxxx/fragmentId/
     * @param {string} url
     * @memberof module:offline
     * @returns {string} fragmentId
     * @instance
    */
    function getFragmentId(url) {
        let idxFragId = url.lastIndexOf('/');
        //logger.warn('fragId : ' + url.substring(idxFragId + 1, url.length));
        return url.substring(idxFragId,url.length);
    }

    setup();

    instance = {
        parse: parse
    };

    return instance;
}
OfflineIndexDBManifestParser.__dashjs_factory_name = 'OfflineIndexDBManifestParser';
export default dashjs.FactoryMaker.getClassFactory(OfflineIndexDBManifestParser); /* jshint ignore:line */
