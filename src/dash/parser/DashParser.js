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
import DashConstants from '../constants/DashConstants.js';
import ObjectIron from './objectiron.js';
import DurationMatcher from './matchers/DurationMatcher.js';
import DateTimeMatcher from './matchers/DateTimeMatcher.js';
import NumericMatcher from './matchers/NumericMatcher.js';
import LangMatcher from './matchers/LangMatcher.js';
import RepresentationBaseValuesMap from './maps/RepresentationBaseValuesMap.js';
import SegmentValuesMap from './maps/SegmentValuesMap.js';
import * as tXml from '../../../externals/tXml.js';

// List of node that shall be represented as arrays
const arrayNodes = [
    DashConstants.PERIOD,
    DashConstants.BASE_URL,
    DashConstants.ADAPTATION_SET,
    DashConstants.REPRESENTATION,
    DashConstants.CONTENT_PROTECTION,
    DashConstants.ROLE,
    DashConstants.ACCESSIBILITY,
    DashConstants.AUDIO_CHANNEL_CONFIGURATION,
    DashConstants.CONTENT_COMPONENT,
    DashConstants.ESSENTIAL_PROPERTY,
    DashConstants.LABEL,
    DashConstants.S,
    DashConstants.SEGMENT_URL,
    DashConstants.EVENT,
    DashConstants.EVENT_STREAM,
    DashConstants.LOCATION,
    DashConstants.SERVICE_DESCRIPTION,
    DashConstants.SUPPLEMENTAL_PROPERTY,
    DashConstants.METRICS,
    DashConstants.REPORTING,
    DashConstants.PATCH_LOCATION,
    DashConstants.REPLACE,
    DashConstants.ADD,
    DashConstants.REMOVE,
    DashConstants.UTC_TIMING,
    DashConstants.INBAND_EVENT_STREAM,
    DashConstants.PRODUCER_REFERENCE_TIME,
    DashConstants.CONTENT_STEERING
];

function DashParser(config) {

    config = config || {};
    const context = this.context;
    const debug = config.debug;

    let instance,
        logger,
        matchers,
        objectIron;

    function setup() {
        logger = debug.getLogger(instance);
        matchers = [
            new DurationMatcher(),
            new DateTimeMatcher(),
            new NumericMatcher(),
            new LangMatcher()
        ];

        objectIron = ObjectIron(context).create({
            adaptationset: new RepresentationBaseValuesMap(),
            period: new SegmentValuesMap()
        });
    }

    function getIron() {
        return objectIron;
    }

    function parse(data) {
        let manifest;
        const startTime = window.performance.now();

        manifest = parseXml(data);

        if (!manifest) {
            throw new Error('failed to parse the manifest');
        }

        // handle full MPD and Patch ironing separately
        if (manifest.Patch) {
            manifest = manifest.Patch; // drop root reference
            // apply iron to patch operations individually
            if (manifest.add) {
                manifest.add.forEach((operand) => objectIron.run(operand));
            }
            if (manifest.replace) {
                manifest.replace.forEach((operand) => objectIron.run(operand));
            }
            // note that we don't need to iron remove as they contain no children
        } else {
            manifest = manifest.MPD; // drop root reference
            objectIron.run(manifest);
        }

        const parsedTime = window.performance.now();
        logger.info('Parsing complete: ' + (parsedTime - startTime).toPrecision(3) + 'ms');

        manifest.protocol = 'DASH';

        return manifest;
    }


    function parseXml(data) {
        try {
            let root = tXml.parse(data, {
                parseNode: true,
                attrMatchers: matchers,
                nodesAsArray: arrayNodes
            });
            let ret = {};
            // If root element is xml node, then get first child node as root
            if (root.tagName.toLowerCase().indexOf('xml') !== -1) {
                for (let key in root) {
                    if (Array.isArray(root[key])) {
                        ret[key] = root[key][0];
                        break;
                    } else if (typeof root[key] === 'object') {
                        ret[key] = root[key];
                        break;
                    }
                }
            } else {
                ret[root.tagName] = root;
                delete root.tagName;
            }
            return ret;
        } catch (e) {
            return null;
        }
    }

    instance = {
        getIron: getIron,
        parseXml: parseXml,
        parse: parse
    };

    setup();

    return instance;
}

DashParser.__dashjs_factory_name = 'DashParser';
export default FactoryMaker.getClassFactory(DashParser);
