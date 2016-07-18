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

import DashManifestModel from '../../dash/models/DashManifestModel';
import ObjectUtils from '../utils/ObjectUtils';
import FactoryMaker from '../../core/FactoryMaker';

const DEFAULT_INDEX = NaN;

class Node {
    constructor(_baseUrls, _selectedIdx) {
        this.data = {
            baseUrls: _baseUrls || null,
            selectedIdx: _selectedIdx || DEFAULT_INDEX
        };
        this.children = [];
    }
}

function BaseURLTreeModel() {

    let instance;
    let root;

    const context = this.context;
    const dashManifestModel = DashManifestModel(context).getInstance();
    const objectUtils = ObjectUtils(context).getInstance();

    function setup() {
        root = new Node();
    }

    function updateChildData(node, index, element) {
        let baseUrls = dashManifestModel.getBaseURLsFromElement(element);

        if (!node[index]) {
            node[index] = new Node(baseUrls);
        } else {
            if (!objectUtils.areSimpleEquivalent(baseUrls, node[index].data.baseUrls)) {
                node[index].data.baseUrls = baseUrls;
                node[index].data.selectedIdx = DEFAULT_INDEX;
            }
        }
    }

    function getBaseURLCollectionsFromManifest(manifest) {
        let baseUrls = dashManifestModel.getBaseURLsFromElement(manifest);

        if (!objectUtils.areSimpleEquivalent(baseUrls, root.data.baseUrls)) {
            root.data.baseUrls = baseUrls;
            root.data.selectedIdx = DEFAULT_INDEX;
        }

        if (manifest.Period_asArray) {
            manifest.Period_asArray.forEach((p, pi) => {
                updateChildData(root.children, pi, p);

                if (p.AdaptationSet_asArray) {
                    p.AdaptationSet_asArray.forEach((a, ai) => {
                        updateChildData(root.children[pi].children, ai, a);

                        if (a.Representation_asArray) {
                            a.Representation_asArray.sort(
                                dashManifestModel.getRepresentationSortFunction()
                            ).forEach((r, ri) => {
                                updateChildData(
                                    root.children[pi].children[ai].children,
                                    ri,
                                    r
                                );
                            });
                        }
                    });
                }
            });
        }
    }

    function walk(callback, node) {
        var target = node || root;

        callback(target.data);

        if (target.children) {
            target.children.forEach(child => walk(callback, child));
        }
    }

    function invalidateSelectedIndexes(serviceLocation) {
        walk((data) => {
            if (!isNaN(data.selectedIdx)) {
                if (serviceLocation === data.baseUrls[data.selectedIdx].serviceLocation) {
                    data.selectedIdx = DEFAULT_INDEX;
                }
            }
        });
    }

    function update(manifest) {
        getBaseURLCollectionsFromManifest(manifest);
    }

    function reset() {
        root = new Node();
    }

    function getForPath(path) {
        var target = root;
        var nodes = [target.data];

        path.forEach(p => {
            target = target.children[p];

            if (target) {
                nodes.push(target.data);
            }
        });

        return nodes.filter(n => n.baseUrls.length);
    }

    instance = {
        reset: reset,
        update: update,
        getForPath: getForPath,
        invalidateSelectedIndexes: invalidateSelectedIndexes
    };

    setup();

    return instance;
}

BaseURLTreeModel.__dashjs_factory_name = 'BaseURLTreeModel';
export default FactoryMaker.getClassFactory(BaseURLTreeModel);
