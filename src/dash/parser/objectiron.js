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

function ObjectIron(mappers) {

    function mergeValues(parentItem, childItem) {
        for (let name in parentItem) {
            if (!childItem.hasOwnProperty(name)) {
                childItem[name] = parentItem[name];
            }
        }
    }

    function mapProperties(properties, parent, child) {
        for (let i = 0, len = properties.length; i < len; ++i) {
            const property = properties[i];

            if (parent[property.name]) {
                if (child[property.name]) {
                    // check to see if we should merge
                    if (property.merge) {
                        const parentValue = parent[property.name];
                        const childValue = child[property.name];

                        // complex objects; merge properties
                        if (typeof parentValue === 'object' && typeof childValue === 'object') {
                            mergeValues(parentValue, childValue);
                        }
                        // simple objects; merge them together
                        else {
                            child[property.name] = parentValue + childValue;
                        }
                    }
                } else {
                    // just add the property
                    child[property.name] = parent[property.name];
                }
            }
        }
    }

    function mapItem(item, node) {
        for (let i = 0, len = item.children.length; i < len; ++i) {
            const childItem = item.children[i];

            const array = node[childItem.name + '_asArray'];
            if (array) {
                for (let v = 0, len2 = array.length; v < len2; ++v) {
                    const childNode = array[v];
                    mapProperties(item.properties, node, childNode);
                    mapItem(childItem, childNode);
                }
            }
        }
    }

    function run(source) {

        if (source === null || typeof source !== 'object') {
            return source;
        }

        if ('period' in mappers) {
            const periodMapper = mappers.period;
            const periods = source.Period_asArray;
            for (let i = 0, len = periods.length; i < len; ++i) {
                const period = periods[i];
                mapItem(periodMapper, period);

                if ('adaptationset' in mappers) {
                    const adaptationSets = period.AdaptationSet_asArray;
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
