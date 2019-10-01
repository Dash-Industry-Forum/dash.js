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
import XlinkLoader from '../XlinkLoader';
import EventBus from '../../core/EventBus';
import Events from '../../core/events/Events';
import FactoryMaker from '../../core/FactoryMaker';
import X2JS from '../../../externals/xml2json';
import URLUtils from '../utils/URLUtils';
import DashConstants from '../../dash/constants/DashConstants';

const RESOLVE_TYPE_ONLOAD = 'onLoad';
const RESOLVE_TYPE_ONACTUATE = 'onActuate';
const RESOLVE_TO_ZERO = 'urn:mpeg:dash:resolve-to-zero:2013';

function XlinkController(config) {

    config = config || {};
    let context = this.context;
    let eventBus = EventBus(context).getInstance();
    const urlUtils = URLUtils(context).getInstance();

    let instance,
        matchers,
        iron,
        manifest,
        converter,
        xlinkLoader;

    function setup() {
        eventBus.on(Events.XLINK_ELEMENT_LOADED, onXlinkElementLoaded, instance);

        xlinkLoader = XlinkLoader(context).create({
            errHandler: config.errHandler,
            dashMetrics: config.dashMetrics,
            mediaPlayerModel: config.mediaPlayerModel,
            requestModifier: config.requestModifier
        });
    }

    function setMatchers(value) {
        if (value) {
            matchers = value;
        }
    }

    function setIron(value) {
        if (value) {
            iron = value;
        }
    }

    /**
     * <p>Triggers the resolution of the xlink.onLoad attributes in the manifest file </p>
     * @param {Object} mpd - the manifest
     */
    function resolveManifestOnLoad(mpd) {
        let elements;
        // First resolve all periods, so unnecessary requests inside onLoad Periods with Default content are avoided
        converter = new X2JS({
            escapeMode:         false,
            attributePrefix:    '',
            arrayAccessForm:    'property',
            emptyNodeForm:      'object',
            stripWhitespaces:   false,
            enableToStringFunc: false,
            ignoreRoot:         true,
            matchers:           matchers
        });

        manifest = mpd;
        elements = getElementsToResolve(manifest.Period_asArray, manifest, DashConstants.PERIOD, RESOLVE_TYPE_ONLOAD);
        resolve(elements, DashConstants.PERIOD, RESOLVE_TYPE_ONLOAD);
    }

    function reset() {
        eventBus.off(Events.XLINK_ELEMENT_LOADED, onXlinkElementLoaded, instance);

        if (xlinkLoader) {
            xlinkLoader.reset();
            xlinkLoader = null;
        }
    }

    function resolve(elements, type, resolveType) {
        let resolveObject = {};
        let element,
            url;

        resolveObject.elements = elements;
        resolveObject.type = type;
        resolveObject.resolveType = resolveType;
        // If nothing to resolve, directly call allElementsLoaded
        if (resolveObject.elements.length === 0) {
            onXlinkAllElementsLoaded(resolveObject);
        }
        for (let i = 0; i < resolveObject.elements.length; i++) {
            element = resolveObject.elements[i];
            if (urlUtils.isHTTPURL(element.url)) {
                url = element.url;
            } else {
                url = element.originalContent.BaseURL + element.url;
            }
            xlinkLoader.load(url, element, resolveObject);
        }
    }

    function onXlinkElementLoaded(event) {
        let element,
            resolveObject;

        const openingTag = '<response>';
        const closingTag = '</response>';
        let mergedContent = '';

        element = event.element;
        resolveObject = event.resolveObject;
        // if the element resolved into content parse the content
        if (element.resolvedContent) {
            let index = 0;
            // we add a parent elements so the converter is able to parse multiple elements of the same type which are not wrapped inside a container
            if (element.resolvedContent.indexOf('<?xml') === 0) {
                index = element.resolvedContent.indexOf('?>') + 2; //find the closing position of the xml declaration, if it exists.
            }
            mergedContent = element.resolvedContent.substr(0,index) + openingTag + element.resolvedContent.substr(index) + closingTag;
            element.resolvedContent = converter.xml_str2json(mergedContent);
        }
        if (isResolvingFinished(resolveObject)) {
            onXlinkAllElementsLoaded(resolveObject);
        }
    }

    // We got to wait till all elements of the current queue are resolved before merging back
    function onXlinkAllElementsLoaded (resolveObject) {
        let elements = [];
        let i,
            obj;

        mergeElementsBack(resolveObject);
        if (resolveObject.resolveType === RESOLVE_TYPE_ONACTUATE) {
            eventBus.trigger(Events.XLINK_READY, {manifest: manifest});
        }
        if (resolveObject.resolveType === RESOLVE_TYPE_ONLOAD) {
            switch (resolveObject.type) {
                // Start resolving the other elements. We can do Adaptation Set and EventStream in parallel
                case DashConstants.PERIOD:
                    for (i = 0; i < manifest[DashConstants.PERIOD + '_asArray'].length; i++) {
                        obj = manifest[DashConstants.PERIOD + '_asArray'][i];
                        if (obj.hasOwnProperty(DashConstants.ADAPTATION_SET + '_asArray')) {
                            elements = elements.concat(getElementsToResolve(obj[DashConstants.ADAPTATION_SET + '_asArray'], obj, DashConstants.ADAPTATION_SET, RESOLVE_TYPE_ONLOAD));
                        }
                        if (obj.hasOwnProperty(DashConstants.EVENT_STREAM + '_asArray')) {
                            elements = elements.concat(getElementsToResolve(obj[DashConstants.EVENT_STREAM + '_asArray'], obj, DashConstants.EVENT_STREAM, RESOLVE_TYPE_ONLOAD));
                        }
                    }
                    resolve(elements, DashConstants.ADAPTATION_SET, RESOLVE_TYPE_ONLOAD);
                    break;
                case DashConstants.ADAPTATION_SET:
                    // TODO: Resolve SegmentList here
                    eventBus.trigger(Events.XLINK_READY, {manifest: manifest});
                    break;
            }
        }
    }

    // Returns the elements with the specific resolve Type
    function getElementsToResolve(elements, parentElement, type, resolveType) {
        let toResolve = [];
        let element,
            i,
            xlinkObject;
        // first remove all the resolve-to-zero elements
        for (i = elements.length - 1; i >= 0; i--) {
            element = elements[i];
            if (element.hasOwnProperty('xlink:href') && element['xlink:href'] === RESOLVE_TO_ZERO) {
                elements.splice(i, 1);
            }
        }
        // now get the elements with the right resolve type
        for (i = 0; i < elements.length; i++) {
            element = elements[i];
            if (element.hasOwnProperty('xlink:href') && element.hasOwnProperty('xlink:actuate') && element['xlink:actuate'] === resolveType) {
                xlinkObject = createXlinkObject(element['xlink:href'], parentElement, type, i, resolveType, element);
                toResolve.push(xlinkObject);
            }
        }
        return toResolve;
    }

    function mergeElementsBack(resolveObject) {
        let resolvedElements = [];
        let element,
            type,
            obj,
            i,
            j,
            k;
        // Start merging back from the end because of index shifting. Note that the elements with the same parent have to be ordered by index ascending
        for (i = resolveObject.elements.length - 1; i >= 0; i --) {
            element = resolveObject.elements[i];
            type = element.type + '_asArray';

            // Element couldn't be resolved or is TODO Inappropriate target: Remove all Xlink attributes
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
    }

    function createXlinkObject(url, parentElement, type, index, resolveType, originalContent) {
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
    }

    // Check if all pending requests are finished
    function isResolvingFinished(elementsToResolve) {
        let i,
            obj;
        for (i = 0; i < elementsToResolve.elements.length; i++) {
            obj = elementsToResolve.elements[i];
            if (obj.resolved === false) {
                return false;
            }
        }
        return true;
    }

    // TODO : Do some syntax check here if the target is valid or not
    function isInappropriateTarget() {
        return false;
    }

    instance = {
        resolveManifestOnLoad: resolveManifestOnLoad,
        setMatchers: setMatchers,
        setIron: setIron,
        reset: reset
    };

    setup();
    return instance;
}

XlinkController.__dashjs_factory_name = 'XlinkController';
export default FactoryMaker.getClassFactory(XlinkController);
