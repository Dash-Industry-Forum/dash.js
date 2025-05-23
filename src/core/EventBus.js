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
import FactoryMaker from './FactoryMaker.js';
import MediaPlayerEvents from '../streaming/MediaPlayerEvents.js';

const EVENT_PRIORITY_LOW = 0;
const EVENT_PRIORITY_HIGH = 5000;

function EventBus() {

    let handlers = {};

    function _commonOn(type, listener, scope, options = {}, executeOnlyOnce = false) {

        if (!type) {
            throw new Error('event type cannot be null or undefined');
        }
        if (!listener || typeof (listener) !== 'function') {
            throw new Error('listener must be a function: ' + listener);
        }

        let priority = options.priority || EVENT_PRIORITY_LOW;

        if (getHandlerIdx(type, listener, scope) >= 0) {
            return;
        }

        handlers[type] = handlers[type] || [];

        const handler = {
            callback: listener,
            scope,
            priority,
            executeOnlyOnce
        };

        if (scope && scope.getStreamId) {
            handler.streamId = scope.getStreamId();
        }
        if (scope && scope.getType) {
            handler.mediaType = scope.getType();
        }
        if (options && options.mode) {
            handler.mode = options.mode;
        }

        const inserted = handlers[type].some((item, idx) => {
            if (item && priority > item.priority) {
                handlers[type].splice(idx, 0, handler);
                return true;
            }
        });

        if (!inserted) {
            handlers[type].push(handler);
        }
    }

    function on(type, listener, scope, options = {}) {
        _commonOn(type, listener, scope, options);
    }

    function once(type, listener, scope, options = {}) {
        _commonOn(type, listener, scope, options, true)
    }

    function off(type, listener, scope) {
        if (!type || !listener || !handlers[type]) {
            return;
        }
        const idx = getHandlerIdx(type, listener, scope);
        if (idx < 0) {
            return;
        }
        handlers[type][idx] = null;
    }

    function trigger(type, payload = {}, filters = {}) {
        if (!type || !handlers[type]) {
            return;
        }

        payload = payload || {};

        if (payload.hasOwnProperty('type')) {
            throw new Error('\'type\' is a reserved word for event dispatching');
        }

        payload.type = type;

        if (filters.streamId) {
            payload.streamId = filters.streamId;
        }
        if (filters.mediaType) {
            payload.mediaType = filters.mediaType;
        }

        const handlersToRemove = [];
        handlers[type]
            .filter((handler) => {
                if (!handler) {
                    return false;
                }
                if (filters.streamId && handler.streamId && handler.streamId !== filters.streamId) {
                    return false;
                }
                if (filters.mediaType && handler.mediaType && handler.mediaType !== filters.mediaType) {
                    return false;
                }
                // This is used for dispatching DASH events. By default we use the onStart mode. Consequently we filter everything that has a non matching mode and the onReceive events for handlers that did not specify a mode.
                if ((filters.mode && handler.mode && handler.mode !== filters.mode) || (!handler.mode && filters.mode && filters.mode === MediaPlayerEvents.EVENT_MODE_ON_RECEIVE)) {
                    return false;
                }
                return true;
            })
            .forEach((handler) => {
                handler && handler.callback.call(handler.scope, payload);
                if (handler.executeOnlyOnce) {
                    handlersToRemove.push(handler);
                }
            });

        handlersToRemove.forEach((handler) => {
            off(type, handler.callback, handler.scope);
        })
    }

    function getHandlerIdx(type, listener, scope) {

        let idx = -1;

        if (!handlers[type]) {
            return idx;
        }

        handlers[type].some((item, index) => {
            if (item && item.callback === listener && (!scope || scope === item.scope)) {
                idx = index;
                return true;
            }
        });
        return idx;
    }

    function reset() {
        handlers = {};
    }

    const instance = {
        on,
        once,
        off,
        trigger,
        reset
    };

    return instance;
}

EventBus.__dashjs_factory_name = 'EventBus';
const factory = FactoryMaker.getSingletonFactory(EventBus);
factory.EVENT_PRIORITY_LOW = EVENT_PRIORITY_LOW;
factory.EVENT_PRIORITY_HIGH = EVENT_PRIORITY_HIGH;
FactoryMaker.updateSingletonFactory(EventBus.__dashjs_factory_name, factory);
export default factory;
