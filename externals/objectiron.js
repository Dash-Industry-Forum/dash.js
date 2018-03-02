/*
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * author Digital Primates
 * copyright dash-if 2012
 */

export default class ObjectIron{

    constructor(mappers) {
        this.mappers = mappers;
    }

    mergeValues(parentItem, childItem) {
        for (let name in parentItem) {
            if (!childItem.hasOwnProperty(name)) {
                childItem[name] = parentItem[name];
            }
        }
    }

    mapProperties(properties, parent, child) {
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
                            this.mergeValues(parentValue, childValue);
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

    mapItem(item, node) {
        for (let i = 0, len = item.children.length; i < len; ++i) {
            const childItem = item.children[i];

            const array = node[childItem.name + '_asArray'];
            if (array) {
                for (let v = 0, len2 = array.length; v < len2; ++v) {
                    const childNode = array[v];
                    this.mapProperties(item.properties, node, childNode);
                    this.mapItem(childItem, childNode);
                }
            }
        }
    }

    run(source) {

        if (source === null || typeof source !== 'object') {
            return source;
        }

        const mappers = this.mappers;
        if ('period' in mappers) {
            const periodMapper = mappers.period;
            const periods = source.Period_asArray;
            for (let i = 0, len = periods.length; i < len; ++i) {
                const period = periods[i];
                this.mapItem(periodMapper, period);

                if ('adaptationset' in mappers) {
                    const adaptationSets = period.AdaptationSet_asArray;
                    if (adaptationSets) {
                        const adaptationSetMapper = mappers.adaptationset;
                        for (let i = 0, len = adaptationSets.length; i < len; ++i) {
                            this.mapItem(adaptationSetMapper, adaptationSets[i]);
                        }
                    }
                }
            }
        }

        return source;
    }
}
