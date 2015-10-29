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
import RepresentationController from '../../dash/controllers/RepresentationController.js';
import FragmentController from './FragmentController.js';
import EventBus from '../utils/EventBus.js';
import Events from '../Events.js';

let TextController = function () {

     var initialized = false,
         mediaSource = null,
         buffer = null,
         type = null,

         onDataUpdateCompleted = function(e) {
             if (e.sender.streamProcessor !== this.streamProcessor) return;

             EventBus.trigger(Events.CLOSED_CAPTIONING_REQUESTED, {sender: this, CCIndex: 0});
         },

         onInitFragmentLoaded = function (e) {
             var self = this;

             if (e.fragmentModel !== self.streamProcessor.getFragmentModel() || (!e.chunk.bytes)) return;

             self.sourceBufferExt.append(buffer, e.chunk);
         };

    return {
        sourceBufferExt: undefined,
        log: undefined,
        system: undefined,
        errHandler: undefined,
        videoModel: undefined,
        notify: undefined,
        subscribe: undefined,
        unsubscribe: undefined,

        setup: function() {
            EventBus.on(Events.DATA_UPDATE_COMPLETED, onDataUpdateCompleted, this);
            EventBus.on(Events.INIT_FRAGMENT_LOADED, onInitFragmentLoaded, this);
        },

        initialize: function (typeValue, source, streamProcessor) {
            var self = this;

            type = typeValue;
            self.setMediaSource(source);
            self.representationController = streamProcessor.representationController;
            self.streamProcessor = streamProcessor;
        },

        /**
         * @param mediaInfo object
         * @returns SourceBuffer object
         * @memberof BufferController#
         */
        createBuffer: function(mediaInfo) {
            try{
                buffer = this.sourceBufferExt.createSourceBuffer(mediaSource, mediaInfo);

                if (!initialized) {
                    if (buffer.hasOwnProperty('initialize')) {
                        buffer.initialize(type, this);
                    }
                    initialized = true;
                }
            } catch (e) {
                this.errHandler.mediaSourceError("Error creating " + type +" source buffer.");
            }

            return buffer;
        },

        getBuffer: function () {
            return buffer;
        },

        setBuffer: function (value) {
            buffer = value;
        },

        setMediaSource: function(value) {
            mediaSource = value;
        },

        reset: function (errored) {
            EventBus.off(Events.DATA_UPDATE_COMPLETED, onDataUpdateCompleted, this);
            EventBus.off(Events.INIT_FRAGMENT_LOADED, onInitFragmentLoaded, this);
            if (!errored) {
                this.sourceBufferExt.abort(mediaSource, buffer);
                this.sourceBufferExt.removeSourceBuffer(mediaSource, buffer);
            }
        }
    };
};

TextController.prototype = {
    constructor: TextController
};

export default TextController;