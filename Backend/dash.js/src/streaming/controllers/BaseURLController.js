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

import BaseURLTreeModel from '../models/BaseURLTreeModel';
import BaseURLSelector from '../utils/BaseURLSelector';
import URLUtils from '../utils/URLUtils';
import BaseURL from '../../dash/vo/BaseURL';
import FactoryMaker from '../../core/FactoryMaker';
import EventBus from '../../core/EventBus';
import Events from '../../core/events/Events';

function BaseURLController() {

    let instance,
        adapter;

    const context = this.context;
    const eventBus = EventBus(context).getInstance();
    const urlUtils = URLUtils(context).getInstance();

    let baseURLTreeModel,
        baseURLSelector;

    function onBlackListChanged(e) {
        baseURLTreeModel.invalidateSelectedIndexes(e.entry);
    }

    function setup() {
        baseURLTreeModel = BaseURLTreeModel(context).create();
        baseURLSelector = BaseURLSelector(context).create();

        eventBus.on(Events.SERVICE_LOCATION_BLACKLIST_CHANGED, onBlackListChanged, instance);
    }

    function setConfig(config) {
        if (config.baseURLTreeModel) {
            baseURLTreeModel = config.baseURLTreeModel;
        }

        if (config.baseURLSelector) {
            baseURLSelector = config.baseURLSelector;
        }

        if (config.adapter) {
            adapter = config.adapter;
        }
    }

    function update(manifest) {
        baseURLTreeModel.update(manifest);
        baseURLSelector.chooseSelector(adapter.getIsDVB(manifest));
    }

    function resolve(path) {
        const baseUrls = baseURLTreeModel.getForPath(path);

        const baseUrl = baseUrls.reduce((p, c) => {
            const b = baseURLSelector.select(c);

            if (b) {
                if (!urlUtils.isRelative(b.url)) {
                    p.url = b.url;
                    p.serviceLocation = b.serviceLocation;
                } else {
                    p.url = urlUtils.resolve(b.url, p.url);
                }
                p.availabilityTimeOffset = b.availabilityTimeOffset;
                p.availabilityTimeComplete = b.availabilityTimeComplete;
            } else {
                return new BaseURL();
            }

            return p;
        }, new BaseURL());

        if (!urlUtils.isRelative(baseUrl.url)) {
            return baseUrl;
        }
    }

    function reset() {
        baseURLTreeModel.reset();
        baseURLSelector.reset();
    }

    function initialize(data) {

        // report config to baseURLTreeModel and baseURLSelector
        baseURLTreeModel.setConfig({
            adapter: adapter
        });

        update(data);
    }

    instance = {
        reset: reset,
        initialize: initialize,
        resolve: resolve,
        setConfig: setConfig
    };

    setup();

    return instance;
}

BaseURLController.__dashjs_factory_name = 'BaseURLController';
export default FactoryMaker.getClassFactory(BaseURLController);
