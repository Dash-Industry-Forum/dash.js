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
let EventBus = (function () {
    "use strict";

    var registrations;
    var handlers = {};

    var getListeners = function(type, useCapture) {
        var captype = (useCapture ? '1' : '0') + type;

        if (!(captype in registrations)) {
            registrations[captype] = [];
        }

        return registrations[captype];
    };

    var getHandlerIdx = function(type, listener, scope) {
        var handlersForType = handlers[type];
        var result = -1;

        if (!handlersForType || handlersForType.length === 0) return result;

        for (var i = 0; i < handlersForType.length; i += 1) {
            if (handlersForType[i].callback === listener && (!scope || scope === handlersForType[i].scope)) return i;
        }

        return result;
    };

    var init = function () {
        registrations = {};
    };

    init();

    return {
        addEventListener: function (type, listener, useCapture) {
            var listeners = getListeners(type, useCapture);
            var idx = listeners.indexOf(listener);
            if (idx === -1) {
                listeners.push(listener);
            }
        },

        removeEventListener: function (type, listener, useCapture) {
            var listeners = getListeners(type, useCapture);
            var idx= listeners.indexOf(listener);
            if (idx !== -1) {
                listeners.splice(idx, 1);
            }
        },

        dispatchEvent: function (evt) {
            var listeners = getListeners(evt.type, false).slice();
            for (var i= 0; i < listeners.length; i++) {
                listeners[i].call(this, evt);
            }
            return !evt.defaultPrevented;
        },

        on: function(type, listener, scope) {
            if (!type) {
                throw new Error("event type cannot be null or undefined");
            }

            if (!listener || typeof(listener) !== "function") {
                throw new Error("listener must be a function: " + listener);
            }

            if (getHandlerIdx.call(this, type, listener, scope) >= 0) return;

            var handler = {
                callback: listener,
                scope: scope
            };

            handlers[type] = handlers[type] || [];
            handlers[type].push(handler);
        },

        off: function(type, listener, scope) {
            if (!type || !listener || !handlers[type]) return;

            var idx = getHandlerIdx.call(this, type, listener, scope);

            if (idx < 0) return;

            handlers[type].splice(idx, 1);
        },

        trigger: function(type, args) {
            if (!type || !handlers[type]) return;

            args = args || {};

            if (args.hasOwnProperty("type")) {
                throw new Error("'type' is a reserved word for event dispatching");
            }

            args.type = type;

            handlers[type].forEach(function(handler) {
                handler.callback.call(handler.scope, args);
            });
        },

        reset: function() {
            handlers = {};
        }
    };
}());

export default EventBus;