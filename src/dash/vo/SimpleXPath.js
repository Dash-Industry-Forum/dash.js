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
 * @class
 * @ignore
 */
class SimpleXPath {
    constructor(selector) {
        // establish validation of the path, to catch unsupported cases
        this.valid = selector[0] == '/'; // first check, we only support absolute addressing

        // establish parsed path, example:
        // /MPD/Period[@id="foobar"]/AdaptationSet[@id="2"]/SegmentTemplate/SegmentTimeline
        this.path = selector.split('/')
            .filter((component) => component.length !== 0) // remove excess empty components
            .map((component) => {
                let parsed = {
                    name: component
                };

                let qualifierPoint = component.indexOf('[');
                if (qualifierPoint != -1) {
                    parsed.name = component.substring(0, qualifierPoint);

                    let qualifier = component.substring(qualifierPoint + 1, component.length - 1);

                    // quick sanity check are there additional qualifiers making this invalid
                    this.valid = this.valid && qualifier.indexOf('[') == -1;

                    let equalityPoint = qualifier.indexOf('=');
                    if (equalityPoint != -1) {
                        parsed.attribute = {
                            name: qualifier.substring(1, equalityPoint), // skip the @
                            value: qualifier.substring(equalityPoint + 1)
                        };

                        // check for single and double quoted attribute values
                        if (['\'', '"'].indexOf(parsed.attribute.value[0]) != -1) {
                            parsed.attribute.value = parsed.attribute.value.substring(1, parsed.attribute.value.length - 1);
                        }
                    } else {
                        // positional access in xpath is 1-based index
                        // internal processes will assume 0-based so we normalize that here
                        parsed.position = parseInt(qualifier, 10) - 1;
                    }
                }

                return parsed;
            });
    }

    isValid() {
        return this.valid;
    }

    findsElement() {
        return !this.findsAttribute();
    }

    findsAttribute() {
        return this.path[this.path.length - 1].name.startsWith('@');
    }

    getMpdTarget(root, isSiblingOperation) {
        let parent = null;
        let leaf = root;
        // assume root is MPD and we start at next level match
        let level = 1;
        let name = 'MPD';

        while ( level < this.path.length && leaf !== null) {
            // set parent to current
            parent = leaf;

            // select next leaf based on component
            let component = this.path[level];
            name = component.name;

            // stop one early if this is the last element and an attribute
            if (level !== this.path.length - 1 || !name.startsWith('@')) {
                let children = parent[name + '_asArray'] || [];
                if (children.length === 0 && parent[name]) {
                    children.push(parent[name]);
                }

                if (component.position) {
                    leaf = children[component.position] || null;
                } else if (component.attribute) {
                    let attr = component.attribute;
                    leaf = children.filter((elm) => elm[attr.name] == attr.value)[0] || null;
                } else {
                    // default case, select first
                    leaf = children[0] || null;
                }
            }

            level++;
        }

        if (leaf === null) {
            // given path not found in root
            return null;
        }

        // attributes the target is the leaf node, the name is the attribute
        if (name.startsWith('@')) {
            return {
                name: name.substring(1),
                leaf: leaf,
                target: leaf
            };
        }

        // otherwise we target the parent for sibling operations and leaf for child operations
        return {
            name: name,
            leaf: leaf,
            target: isSiblingOperation ? parent : leaf
        };
    }
}

export default SimpleXPath;
