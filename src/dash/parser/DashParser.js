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
import ObjectIron from './objectiron';
import StringMatcher from './matchers/StringMatcher';
import DurationMatcher from './matchers/DurationMatcher';
import DateTimeMatcher from './matchers/DateTimeMatcher';
import NumericMatcher from './matchers/NumericMatcher';
import RepresentationBaseValuesMap from './maps/RepresentationBaseValuesMap';
import SegmentValuesMap from './maps/SegmentValuesMap';
import tXml from '../../../externals/txml';

// List of node that shall be represented as arrays
const arrayNodes = [
    'Period',
    'BaseURL',
    'AdaptationSet',
    'Representation',
    'ContentProtection',
    'Role',
    'Accessibility',
    'AudioChannelConfiguration',
    'ContentComponent',
    'EssentialProperty',
    'S',
    'SegmentURL',
    'Event',
    'EventStream',
    'Location',
    'ServiceDescription',
    'SupplementalProperty',
    'Metrics'
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
            new StringMatcher()   // last in list to take precedence over NumericMatcher
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

        objectIron.run(manifest);

        const parsedTime = window.performance.now();
        logger.info('Parsing complete: ' + (parsedTime - startTime).toPrecision(3) + 'ms');

        manifest.protocol = 'DASH';

        return manifest;
    }


    function parseXml(data) {
        let root = tXml(data);
        root = root[0].tagName === '?xml' ? root[0].children[0] : root[0];
        return processXml(root);
    }

    function processAttr(tagName, attrName, value) {
        let attrValue = value;
        matchers.forEach(matcher => {
            if (matcher.test(tagName, attrName, value)) {
                attrValue = matcher.converter(value);
            }
        });
        return attrValue;
    }

    function processXml(xmlNode) {
        let tag = {};

        // Process attributes with matchers
        for (let key in xmlNode.attributes) {
            tag[key] = processAttr(xmlNode.tagName, key, xmlNode.attributes[key]);
        }

        // Process children
        xmlNode.children.forEach(child => {
            if (typeof child === 'string') {
                // Tag with text as body
                if (Object.keys(xmlNode.attributes).length === 0) {
                    // Set tag value with text if no attribute
                    tag = child;
                } else {
                    // Or add an attribute '__text'
                    tag.__text = child;
                }
            } else {
                let name = child.tagName;
                let childTag = processXml(child);
                // Set child as an array according to DASH spec
                if (arrayNodes.indexOf(name) !== -1) {
                    if (!tag[name]) {
                        tag[name] = [];
                    }
                    tag[name].push(childTag);
                } else {
                    tag[name] = childTag;
                }
            }
        });

        return tag;
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
