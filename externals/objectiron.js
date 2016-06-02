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

/*
 * var parent,
 *     child,
 *     properties = [
                    {
                        name: 'profiles',
                        merge: false
                    }
                ];
 *
 * parent = {};
 * parent.name = "ParentNode";
 * parent.isRoor = false;
 * parent.isArray = false;
 * parent.children = [];
 * parent.properties = properties;
 *
 * child = {};
 * child.name = "ChildNode";
 * child.isRoor = false;
 * child.isArray = true;
 * child.children = null;
 * child.properties = properties;
 * parent.children.push(child);
 *
 */

function ObjectIron(map) {

    var lookup,
        len,
        i;

    // create a list of top level items to search for
    lookup = [];
    for (i = 0, len = map.length; i < len; i += 1) {
        if (map[i].isRoot) {
            lookup.push("root");
        } else {
            lookup.push(map[i].name);
        }
    }

    var mergeValues = function (parentItem, childItem) {
            var name,
                parentValue,
                childValue;

            if (parentItem === null || childItem === null) {
                return;
            }

            for (name in parentItem) {
                if (parentItem.hasOwnProperty(name)) {
                    if (!childItem.hasOwnProperty(name)) {
                        childItem[name] = parentItem[name];
                    }
                }
            }
        },

        mapProperties = function (properties, parent, child) {
            var i,
                len,
                property,
                parentValue,
                childValue;

            if (properties === null || properties.length === 0) {
                return;
            }

            for (i = 0, len = properties.length; i < len; i += 1) {
                property = properties[i];

                if (parent.hasOwnProperty(property.name)) {
                    if (child.hasOwnProperty(property.name)) {
                        // check to see if we should merge
                        if (property.merge) {
                           parentValue = parent[property.name];
                           childValue = child[property.name];

                            // complex objects; merge properties
                            if (typeof parentValue === 'object' && typeof childValue === 'object') {
                                mergeValues(parentValue, childValue);
                            }
                            // simple objects; merge them together
                            else {
                                if (property.mergeFunction != null) {
                                    child[property.name] = property.mergeFunction(parentValue, childValue);
                                } else {
                                    child[property.name] = parentValue + childValue;
                                }
                            }
                        }
                    } else {
                        // just add the property
                        child[property.name] = parent[property.name];
                    }
                }
            }
        },

        mapItem = function (obj, node) {
            var item = obj,
                i,
                len,
                v,
                len2,
                array,
                childItem,
                childNode,
                property;

            if (item.children === null || item.children.length === 0) {
                return;
            }

            for (i = 0, len = item.children.length; i < len; i += 1) {
                childItem = item.children[i];

                if (node.hasOwnProperty(childItem.name)) {
                    if (childItem.isArray) {
                        array = node[childItem.name + "_asArray"];
                        for (v = 0, len2 = array.length; v < len2; v += 1) {
                            childNode = array[v];
                            mapProperties(item.properties, node, childNode);
                            mapItem(childItem, childNode);
                        }
                    } else {
                        childNode = node[childItem.name];
                        mapProperties(item.properties, node, childNode);
                        mapItem(childItem, childNode);
                    }
                }
            }
        },

        performMapping = function (source) {
            var i,
                len,
                pi,
                pp,
                item,
                node,
                array;

            if (source === null) {
                return source;
            }

            if (typeof source !== 'object') {
                return source;
            }

            // first look to see if anything cares about the root node
            for (i = 0, len = lookup.length; i < len; i += 1) {
                if (lookup[i] === "root") {
                    item = map[i];
                    node = source;
                    mapItem(item, node);
                }
            }

            // iterate over the objects and look for any of the items we care about
            for (pp in source) {
                if (source.hasOwnProperty(pp) && pp != "__children") {
                    pi = lookup.indexOf(pp);
                    if (pi !== -1) {
                        item = map[pi];

                        if (item.isArray) {
                            array = source[pp + "_asArray"];
                            for (i = 0, len = array.length; i < len; i += 1) {
                                node = array[i];
                                mapItem(item, node);
                            }
                        } else {
                            node = source[pp];
                            mapItem(item, node);
                        }
                    }
                    // now check this to see if he has any of the properties we care about
                    performMapping(source[pp]);
                }
            }

            return source;
        };

    return {
        run: performMapping
    };
}

export default ObjectIron;
