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

/**
 * @ignore
 */
const Entities = require('html-entities').XmlEntities;
const OFFLINE_BASE_URL = 'offline_indexeddb://';

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
     * @param {object} representation
     * @returns {Promise} a promise that will be resolved or rejected at the end of encoding process
     * @instance
    */
    function parse(XMLDoc, representation) {
        return new Promise(function (resolve, reject) {

            DOM = new DOMParser().parseFromString(XMLDoc, 'application/xml');
            let mpd = DOM.getElementsByTagName(dashConstants.MPD) ? DOM.getElementsByTagName(dashConstants.MPD) : null;

            for (let i = 0; i < mpd.length; i++) {
                if (mpd[i] !== null) {
                    editBaseURLAttribute(mpd[i]);
                    browsePeriods(mpd[i], representation);
                }
            }

            let manifestEncoded = encodeManifest(DOM);
            if (manifestEncoded !== '') {
                resolve(manifestEncoded);
            } else {
                reject('Encoded error');
            }
        });
    }

    /**
     * URL encode parsed manifest
     * @param {string} DOM
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
     * @param {Object} representation
     * @instance
    */
    function browsePeriods(currentMPD, representation) {
        let periods = currentMPD.getElementsByTagName(dashConstants.PERIOD);
        for (let j = 0; j < periods.length; j++) {
            browseAdaptationsSet(periods[j], representation);
        }
    }

    /**
     * Browse adapatation set to update data (delete those taht are not choosen by user ...)
     * @param {XML} currentPeriod
     * @param {Array} representationsToUpdate
     * @instance
    */
    function browseAdaptationsSet(currentPeriod, representationsToUpdate) {
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

                deleteSegmentBase(currentAdaptationSet);

                if (representations.length === 0) {
                    currentPeriod.removeChild(currentAdaptationSet);
                } else {
                    //detect Segment list use case
                    for (let i = 0; i < representations.length; i++) {
                        let rep = representations[i];
                        let segmentList = getSegmentList(rep);
                        if (segmentList.length >= 1) {
                            editSegmentListAttributes(segmentList, rep);
                        }
                    }

                    let segmentTemplate = getSegmentTemplate(currentAdaptationSet);
                    // segmentTemplate is defined, update attributes in order to be correctly played offline
                    if (segmentTemplate.length >= 1) {
                        editSegmentTemplateAttributes(segmentTemplate);
                    }

                    // detect SegmentBase use case => transfrom manifest to SegmentList in SegmentTemplate
                    if (representationsToUpdate && representationsToUpdate.length > 0 ) {
                        let selectedRep;
                        for (let i = 0; i < representations.length; i++) {
                            let rep = representations[i];
                            for (let j = 0; representationsToUpdate && j < representationsToUpdate.length; j++) {
                                if (representationsToUpdate[j].id === rep.id) {
                                    selectedRep = representationsToUpdate[j];
                                    break;
                                }
                            }
                        }
                        addSegmentTemplateAttributes(currentAdaptationSet, selectedRep);
                    }
                }
            }
        }
    }

    /**
     * Returns type of adapation set
     * @param {XML} currentAdaptationSet
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
        } else if (getIsText(currentAdaptationSet)) {
            return constants.TEXT;
        } else if (getIsImage(currentAdaptationSet)) {
            return constants.IMAGE;
        }

        return null;
    }

    function getIsAudio(adaptation) {
        return getIsTypeOf(adaptation, constants.AUDIO);
    }

    function getIsVideo(adaptation) {
        return getIsTypeOf(adaptation, constants.VIDEO);
    }

    function getIsText(adaptation) {
        return getIsTypeOf(adaptation, constants.TEXT);
    }

    function getIsMuxed(adaptation) {
        return getIsTypeOf(adaptation, constants.MUXED);
    }

    function getIsImage(adaptation) {
        return getIsTypeOf(adaptation, constants.IMAGE);
    }

    // based upon DashManifestModel, but using DomParser
    function getIsTypeOf(adaptation, type) {

        if (!adaptation) {
            throw new Error('adaptation is not defined');
        }

        if (!type) {
            throw new Error('type is not defined');
        }

        return testMimeType(adaptation, type);
    }

    function testMimeType(adaptation, type) {
        let mimeTypeRegEx = (type !== constants.TEXT) ? new RegExp(type) : new RegExp('(vtt|ttml)');

        let mimeType = findMimeType(adaptation);
        if (mimeType) {
            return mimeTypeRegEx.test(mimeType);
        }

        // no mime type in adaptation, search in representation
        let representations = findRepresentations(adaptation);
        if (representations) {
            for (let i = 0; i < representations.length; i++) {
                let representation = representations[i];
                mimeType = findMimeType(representation);
                if (mimeType) {
                    return mimeTypeRegEx.test(mimeType);
                }
            }
        }
        return false;
    }

    /**
     * Returns mime-type of xml tag
     * @param {Object} tag
     * @returns {string|null} mimeType
     * @instance
    */
    function findMimeType(tag) {
        return tag.getAttribute(dashConstants.MIME_TYPE);
    }

    /**
     * Returns representations of adaptation set
     * @param {XML} adaptation
     * @returns {XML} representations
     * @instance
    */
    function findRepresentations(adaptation) {
        return adaptation.getElementsByTagName(dashConstants.REPRESENTATION);
    }

    /**
     * Return segment template list of adaptations set
     * @param {XML} currentAdaptationSet
     * @returns {XML} representations
     * @instance
    */
    function getSegmentTemplate(currentAdaptationSet) {
        return currentAdaptationSet.getElementsByTagName(dashConstants.SEGMENT_TEMPLATE);
    }

    /**
     * Return segment list tags of adaptations set
     * @param {XML} tag
     * @returns {XML} representations
     * @instance
    */
    function getSegmentList(tag) {
        return tag.getElementsByTagName(dashConstants.SEGMENT_LIST);
    }

    function deleteSegmentBase(tag) {
        let elements = tag.getElementsByTagName(dashConstants.SEGMENT_BASE);
        for (let i = 0; i < elements.length; i++) {
            let segmentBase = elements[i];
            segmentBase.parentNode.removeChild(segmentBase);
        }
    }

    /**
     * @param {XML} segmentTemplate
     * @param {object} rep
     * @instance
    */
    function addSegmentTimelineElements(segmentTemplate, rep) {
        let S = DOM.createElement('S');
        if (rep && rep.segments) {
            let segmentTimelineElement = DOM.createElement(dashConstants.SEGMENT_TIMELINE);
            let changedDuration = getDurationChangeArray(rep);
            for (let i = 0; i < changedDuration.length; i++) {
                let repeatValue = i + 1 < changedDuration.length ? (changedDuration[i + 1] - changedDuration[i]) - 1 : 0;
                if (repeatValue > 1) {
                    S.setAttribute('r', repeatValue);
                }
                S.setAttribute('d', rep.segments[changedDuration[i]].duration);
                segmentTimelineElement.appendChild(S);
                S = DOM.createElement('S');
            }
            segmentTemplate.appendChild(segmentTimelineElement);
        }
    }

    function getDurationChangeArray(rep) {
        let array = [];
        array.push(0);
        for (let i = 1; i < rep.segments.length; i++) {
            if (rep.segments[i - 1].duration !== rep.segments[i].duration) {
                array.push(i);
            }
        }
        return array;
    }

    /**
     * Update attributes of segment templates to match offline urls
     * @param {Array} segmentsTemplates
     * @instance
    */
    function editSegmentTemplateAttributes(segmentsTemplates) {
        for (let i = 0; i < segmentsTemplates.length; i++) {
            let media = segmentsTemplates[i].getAttribute(dashConstants.MEDIA);
            media = '$RepresentationID$_$Number$' + media.substring(media.indexOf('.'), media.length); //id + extension
            segmentsTemplates[i].setAttribute(dashConstants.START_NUMBER, '0');
            segmentsTemplates[i].setAttribute(dashConstants.MEDIA, media);
            segmentsTemplates[i].setAttribute(dashConstants.INITIALIZATION_MINUS,'$RepresentationID$_init');
        }
    }

    /**
     * Update attributes of segment list to match offline urls
     * @param {Array} segmentLists
     * @param {Object} representation
     * @instance
    */
    function editSegmentListAttributes(segmentLists, representation) {
        let repId = representation.getAttribute(dashConstants.ID);
        for (let i = 0; i < segmentLists.length; i++) {

            let segmentList = segmentLists[i];
            let initialisation = segmentList.getElementsByTagName(dashConstants.INITIALIZATION);
            if (initialisation) {
                let sourceURL = initialisation[0].getAttribute(dashConstants.SOURCE_URL);
                sourceURL = `${repId}_init`;
                initialisation[0].setAttribute(dashConstants.SOURCE_URL, sourceURL);
            }
            let segmentURLs = segmentList.getElementsByTagName(dashConstants.SEGMENT_URL);

            if (segmentURLs) {
                for (let j = 0; j < segmentURLs.length; j++) {
                    let segmentUrl = segmentURLs[j];
                    let media = segmentUrl.getAttribute(dashConstants.MEDIA);
                    media = `${repId}_${j}`;
                    segmentUrl.setAttribute(dashConstants.MEDIA, media);
                }
            }
        }
    }

    /**
     * @param {XML} adaptationSet
     * @param {object} rep
     * @instance
    */
    function addSegmentTemplateAttributes(adaptationSet, rep) {
        let segmentTemplateElement = DOM.createElement(dashConstants.SEGMENT_TEMPLATE);
        segmentTemplateElement.setAttribute(dashConstants.START_NUMBER, '0');
        segmentTemplateElement.setAttribute(dashConstants.MEDIA, '$RepresentationID$-$Time$');
        segmentTemplateElement.setAttribute(dashConstants.INITIALIZATION_MINUS,'$RepresentationID$_init');
        addSegmentTimelineElements(segmentTemplateElement, rep);
        adaptationSet.appendChild(segmentTemplateElement);
    }

    /**
     * Delete all representations except the one choosed by user
     * @param {XML} currentAdaptationSet
     * @param {XML} representations
     * @param {string} adaptationType
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
     * Get id of first representation of adaptation set
     * @param {XMl} currentAdaptationSet
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
