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
import FactoryMaker from './FactoryMaker';

const EVENT_PRIORITY_LOW = 0;
const EVENT_PRIORITY_HIGH = 5000;

function EventBus() {

    let handlers = {};

    function on(type, listener, scope, priority = EVENT_PRIORITY_LOW) {

        if (!type) {
            throw new Error('event type cannot be null or undefined');
        }
        if (!listener || typeof (listener) !== 'function') {
            throw new Error('listener must be a function: ' + listener);
        }

        if (getHandlerIdx(type, listener, scope) >= 0) return;

        handlers[type] = handlers[type] || [];

        const handler = {
            callback: listener,
            scope: scope,
            priority: priority
        };

        const inserted = handlers[type].some((item , idx) => {
            if (priority > item.priority ) {
                handlers[type].splice(idx, 0, handler);
                return true;
            }
        });

        if (!inserted) {
            handlers[type].push(handler);
        }
    }

    function off(type, listener, scope) {
        if (!type || !listener || !handlers[type]) return;
        const idx = getHandlerIdx(type, listener, scope);
        if (idx < 0) return;
        handlers[type].splice(idx, 1);
    }

    function trigger(type, payload) {
        if (!type || !handlers[type]) return;

        payload = payload || {};

        if (payload.hasOwnProperty('type')) throw new Error('\'type\' is a reserved word for event dispatching');

        payload.type = type;

        handlers[type].forEach( handler => handler.callback.call(handler.scope, payload) );
    }

    function getHandlerIdx(type, listener, scope) {

        let idx = -1;

        if (!handlers[type]) return idx;

        handlers[type].some( (item, index) => {
            if (item.callback === listener && (!scope || scope === item.scope)) {
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
        on: on,
        off: off,
        trigger: trigger,
        reset: reset
    };

    return instance;
}

EventBus.__dashjs_factory_name = 'EventBus';
const factory = FactoryMaker.getSingletonFactory(EventBus);
factory.EVENT_PRIORITY_LOW = EVENT_PRIORITY_LOW;
factory.EVENT_PRIORITY_HIGH = EVENT_PRIORITY_HIGH;
export default factory;