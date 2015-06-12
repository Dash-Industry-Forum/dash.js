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
MediaPlayer.dependencies.XlinkController = function () {
    "use strict";

    var matchers,
        iron,
        manifest,
        converter,
        RESOLVE_TYPE_ONLOAD = 'onLoad',
        RESOLVE_TYPE_ONACTUATE = 'onActuate',
        ELEMENT_TYPE_PERIOD = 'Period',
        ELEMENT_TYPE_ADAPTATIONSET = 'AdaptationSet',
        ELEMENT_TYPE_EVENTSTREAM = 'EventStream',
        RESOLVE_TO_ZERO = 'urn:mpeg:dash:resolve-to-zero:2013',

        resolveManifestOnLoad = function (mpd) {
            var self = this,
                elements;
            // First resolve all periods, so unnecessary requests inside onLoad Periods with Default content are avoided
            converter = new X2JS(matchers, '', true);
            manifest = mpd;
            elements = getElementsToResolve(manifest.Period_asArray, manifest, ELEMENT_TYPE_PERIOD, RESOLVE_TYPE_ONLOAD);
            resolve.call(self, elements, ELEMENT_TYPE_PERIOD, RESOLVE_TYPE_ONLOAD);
        },

        resolve = function (elements, type, resolveType) {
            var self = this,
                element,
                url,
                resolveObject = {},
                i;

            resolveObject.elements = elements;
            resolveObject.type = type;
            resolveObject.resolveType = resolveType;
            // If nothing to resolve, directly call allElementsLoaded
            if (resolveObject.elements.length === 0) {
                onXlinkAllElementsLoaded.call(self, resolveObject);
            }
            for (i = 0; i < resolveObject.elements.length; i += 1) {
                element = resolveObject.elements[i];
                if (element.url.indexOf("http://") !== -1) {
                    url = element.url;
                } else {
                    url = element.originalContent.BaseURL + element.url;
                }
                self.xlinkLoader.load(url, element, resolveObject);
            }
        },

        onXlinkElementLoaded = function (event) {
            var element,
                resolveObject,
                index,
                openingTag = '<response>',
                closingTag = '</response>',
                mergedContent = '';

            element = event.data.element;
            resolveObject = event.data.resolveObject;
            // if the element resolved into content parse the content
            if (element.resolvedContent) {
                // we add a parent elements so the converter is able to parse multiple elements of the same type which are not wrapped inside a container
                index = element.resolvedContent.indexOf('>') + 1; //find the closing position of the xml tag
                mergedContent = element.resolvedContent.substr(0,index) + openingTag + element.resolvedContent.substr(index) + closingTag;
                element.resolvedContent = converter.xml_str2json(mergedContent);
            }
            if (isResolvingFinished.call(this, resolveObject)) {
                onXlinkAllElementsLoaded.call(this, resolveObject);
            }
        },
    // We got to wait till all elements of the current queue are resolved before merging back
        onXlinkAllElementsLoaded = function (resolveObject) {
            var elements = [],
                i,
                obj;

            mergeElementsBack.call(this, resolveObject);
            if (resolveObject.resolveType === RESOLVE_TYPE_ONACTUATE) {
                this.notify(MediaPlayer.dependencies.XlinkController.eventList.ENAME_XLINK_READY, {manifest: manifest});
            }
            if (resolveObject.resolveType === RESOLVE_TYPE_ONLOAD) {
                switch (resolveObject.type) {
                    // Start resolving the other elements. We can do Adaptation Set and EventStream in parallel
                    case ELEMENT_TYPE_PERIOD:
                        for (i = 0; i < manifest[ELEMENT_TYPE_PERIOD + '_asArray'].length; i++) {
                            obj = manifest[ELEMENT_TYPE_PERIOD + '_asArray'][i];
                            if (obj.hasOwnProperty(ELEMENT_TYPE_ADAPTATIONSET + '_asArray')) {
                                elements = elements.concat(getElementsToResolve.call(this, obj[ELEMENT_TYPE_ADAPTATIONSET + '_asArray'], obj, ELEMENT_TYPE_ADAPTATIONSET, RESOLVE_TYPE_ONLOAD));
                            }
                            if (obj.hasOwnProperty(ELEMENT_TYPE_EVENTSTREAM + '_asArray')) {
                                elements = elements.concat(getElementsToResolve.call(this, obj[ELEMENT_TYPE_EVENTSTREAM + '_asArray'], obj, ELEMENT_TYPE_EVENTSTREAM, RESOLVE_TYPE_ONLOAD));
                            }
                        }
                        resolve.call(this, elements, ELEMENT_TYPE_ADAPTATIONSET, RESOLVE_TYPE_ONLOAD);
                        break;
                    case ELEMENT_TYPE_ADAPTATIONSET:
                        // TODO: Resolve SegmentList here
                        this.notify(MediaPlayer.dependencies.XlinkController.eventList.ENAME_XLINK_READY, {manifest: manifest});
                        break;
                }
            }
        },
    // Returns the elements with the specific resolve Type
        getElementsToResolve = function (elements, parentElement, type, resolveType) {
            var toResolve = [],
                element,
                i,
                xlinkObject;
            // first remove all the resolve-to-zero elements
            for (i = elements.length - 1; i >= 0; i -= 1) {
                element = elements[i];
                if (element.hasOwnProperty("xlink:href") && element["xlink:href"] === RESOLVE_TO_ZERO) {
                    elements.splice(i, 1);
                }
            }
            // now get the elements with the right resolve type
            for (i = 0; i < elements.length; i++) {
                element = elements[i];
                if (element.hasOwnProperty("xlink:href") && element.hasOwnProperty("xlink:actuate") && element["xlink:actuate"] === resolveType) {
                    xlinkObject = createXlinkObject(element["xlink:href"], parentElement, type, i, resolveType, element);
                    toResolve.push(xlinkObject);
                }
            }
            return toResolve;
        },


        mergeElementsBack = function (resolveObject) {
            var element,
                type,
                resolvedElements = [],
                obj,
                i,
                j,
                k;
            // Start merging back from the end because of index shifting. Note that the elements with the same parent have to be ordered by index ascending
            for (i = resolveObject.elements.length - 1; i >= 0; i --) {
                element = resolveObject.elements[i];
                type = element.type + '_asArray';

                // Element couldnt be resolved or is TODO Inappropriate target: Remove all Xlink attributes
                if (!element.resolvedContent || isInappropriateTarget()) {
                    delete element.originalContent['xlink:actuate'];
                    delete element.originalContent['xlink:href'];
                    resolvedElements.push(element.originalContent);
                }
                // Element was successfully resolved
                else if (element.resolvedContent) {
                    for (j = 0; j < element.resolvedContent[type].length; j++) {
                        //TODO Contains another Xlink attribute with xlink:actuate set to onload. Remove all xLink attributes
                        obj = element.resolvedContent[type][j];
                        resolvedElements.push(obj);
                    }
                }
                // Replace the old elements in the parent with the resolved ones
                element.parentElement[type].splice(element.index, 1);
                for (k = 0; k < resolvedElements.length; k++) {
                    element.parentElement[type].splice(element.index + k, 0, resolvedElements[k]);
                }
                resolvedElements = [];
            }
            if (resolveObject.elements.length > 0) {
                iron.run(manifest);
            }
        },

        createXlinkObject = function (url, parentElement, type, index, resolveType, originalContent) {
            return {
                url: url,
                parentElement: parentElement,
                type: type,
                index: index,
                resolveType: resolveType,
                originalContent: originalContent,
                resolvedContent: null,
                resolved: false
            };
        },
    // Check if all pending requests are finished
        isResolvingFinished = function (elementsToResolve) {
            var i,
                obj;
            for (i = 0; i < elementsToResolve.elements.length; i++) {
                obj = elementsToResolve.elements[i];
                if (obj.resolved === false) {
                    return false;
                }
            }
            return true;
        },
    // TODO : Do some syntax check here if the target is valid or not
        isInappropriateTarget = function () {
            return false;
        };

    return {
        xlinkLoader: undefined,
        notify: undefined,
        subscribe: undefined,
        unsubscribe: undefined,

        setup: function () {
            onXlinkElementLoaded = onXlinkElementLoaded.bind(this);
            this.xlinkLoader.subscribe(MediaPlayer.dependencies.XlinkLoader.eventList.ENAME_XLINKELEMENT_LOADED, this, onXlinkElementLoaded);
        },
        /**
         * <p>Triggers the resolution of the xlink.onLoad attributes in the manifest file </p>
         * @param manifest
         */
        resolveManifestOnLoad: function (manifest) {
            resolveManifestOnLoad.call(this, manifest);
        },
        /**
         *
         * @param value
         */
        setMatchers: function (value) {
            matchers = value;
        },
        /**
         *
         * @param value
         */
        setIron: function (value) {
            iron = value;
        }
    };
};

MediaPlayer.dependencies.XlinkController.prototype = {
    constructor: MediaPlayer.dependencies.XlinkController
};

MediaPlayer.dependencies.XlinkController.eventList = {
    ENAME_XLINK_ALLELEMENTSLOADED: "xlinkAllElementsLoaded",
    ENAME_XLINK_READY: "xlinkReady"
};