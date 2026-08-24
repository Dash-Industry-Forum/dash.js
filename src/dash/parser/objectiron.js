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

function ObjectIron(mappers) {

    function _mergeValues(parentItem, childItem) {
        if (typeof parentItem === 'object') {
            for (let name in parentItem) {
                if (!childItem.hasOwnProperty(name)) {
                    childItem[name] = parentItem[name];
                }
            }
        }
    }
    
    function _mappingAllowed (element, exception) {
        let allowMapping = true;
        if (exception) {
            for (const [key, values] of Object.entries(exception)) {
                let attr = element[key];
                if (attr && values.some(v => attr.match(v))) {
                    allowMapping = false;
                }
            }
        }

        return allowMapping;
    }

    function _conditionallyMapProperty(exception, propertyName, propertyIsArray, propertyElementFromParent, childNode) {
        if (_mappingAllowed(propertyElementFromParent, exception)) {
            if (childNode[propertyName]) {
                // property already exists
                if (propertyIsArray) {
                    childNode[propertyName].push(propertyElementFromParent);
                } else {
                    // non-Array Properties can be:
                    // - certain elements (e.g. SegmentList, see ISO 23009-1 (6th ed), clause 5.3.9.1) or
                    // - attributes (e.g. codecs)
                    _mergeValues(propertyElementFromParent, childNode[propertyName]);
                }
            } else {
                // just add the property
                if (propertyIsArray) {
                    childNode[propertyName] = [propertyElementFromParent];
                } else {
                    childNode[propertyName] = propertyElementFromParent;
                }
            }
        }
    }

    function mapProperties(properties, exceptions, parentNode, childNode) {
        for (let i = 0, len = properties.length; i < len; ++i) {
            const propertyName = properties[i];

            if (parentNode[propertyName]) {
                const propertyFromParentElement = parentNode[propertyName];

                if (Array.isArray(propertyFromParentElement)) {
                    propertyFromParentElement.forEach(propParentEl => {
                        _conditionallyMapProperty(exceptions[propertyName], propertyName, true, propParentEl, childNode);
                    });
                } else {
                    _conditionallyMapProperty(exceptions[propertyName], propertyName, false, propertyFromParentElement, childNode);
                }
            }
        }
    }

    function mapItem(item, node) {
        for (let i = 0, len = item.children.length; i < len; ++i) {
            const childItem = item.children[i];

            const array = node[childItem.name];
            if (array) {
                for (let v = 0, len2 = array.length; v < len2; ++v) {
                    const childNode = array[v];
                    mapProperties(item.properties, item.exceptions, node, childNode);
                    mapItem(childItem, childNode);
                }
            }
        }
    }

    function run(source) {

        if (source === null || typeof source !== 'object') {
            return source;
        }

        if (source.Period && 'period' in mappers) {
            const periodMapper = mappers.period;
            const periods = source.Period;
            for (let i = 0, len = periods.length; i < len; ++i) {
                const period = periods[i];
                mapItem(periodMapper, period);

                if ('adaptationset' in mappers) {
                    const adaptationSets = period.AdaptationSet;
                    if (adaptationSets) {
                        const adaptationSetMapper = mappers.adaptationset;
                        for (let i = 0, len = adaptationSets.length; i < len; ++i) {
                            mapItem(adaptationSetMapper, adaptationSets[i]);
                        }
                    }
                }
            }
        }

        return source;
    }

    return {
        run: run
    };
}


ObjectIron.__dashjs_factory_name = 'ObjectIron';
const factory = FactoryMaker.getClassFactory(ObjectIron);
export default factory;
