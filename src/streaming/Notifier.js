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
MediaPlayer.dependencies.Notifier = function () {
    "use strict";

    var OBSERVABLE_ID_PROP = "observableId",
        system,
        id = 0,

        getId = function() {
            if (!this[OBSERVABLE_ID_PROP]) {
                id += 1;
                this[OBSERVABLE_ID_PROP] = "_id_" + id;
            }

            return this[OBSERVABLE_ID_PROP];
        };

    return {
        system : undefined,

        setup: function() {
            system = this.system;
            system.mapValue('notify', this.notify);
            system.mapValue('subscribe', this.subscribe);
            system.mapValue('unsubscribe', this.unsubscribe);
        },

        notify: function (/*eventName[, args]*/) {
            var eventId = arguments[0] + getId.call(this),
                event = new MediaPlayer.vo.Event();

            event.sender =  this;
            event.type = arguments[0];
            event.data = arguments[1];
            event.error = arguments[2];
            event.timestamp = new Date().getTime();

            system.notify.call(system, eventId, event);
        },

        subscribe: function(eventName, observer, handler, oneShot) {
            if (!handler && observer[eventName]) {
                handler = observer[eventName] = observer[eventName].bind(observer);
            }

            if(!observer) throw "observer object cannot be null or undefined";

            if(!handler) throw "event handler cannot be null or undefined";

            eventName += getId.call(this);

            system.mapHandler(eventName, undefined, handler, oneShot);
        },

        unsubscribe: function(eventName, observer, handler) {
            handler = handler || observer[eventName];
            eventName += getId.call(this);

            system.unmapHandler(eventName, undefined, handler);
        }
    };
};

MediaPlayer.dependencies.Notifier.prototype = {
    constructor: MediaPlayer.dependencies.Notifier
};