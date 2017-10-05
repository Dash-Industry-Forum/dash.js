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
//import EventBus from '../../core/EventBus';
import FactoryMaker from '../../core/FactoryMaker';

const THUMBNAIL_CONTROLLER_TYPE = 'ThumbnailController';
function ThumbnailController(config) {

    //const context = this.context;
    //const eventBus = EventBus(context).getInstance();

    const errHandler = config.errHandler;   /* jshint ignore:line */
    const dashManifestModel = config.dashManifestModel; /* jshint ignore:line */
    const manifestModel = config.manifestModel; /* jshint ignore:line */

    let instance,
        initialized,
        mediaController,
        streamController;

    function setup() {
        initialized = false;
        mediaController = null;
        streamController = null;
    }


    function initialize() {
    }

    /**
     * Return the thumbnail of quality idx at time position
     * @param {number} time - A relative time, in seconds, based on the return value of the {@link module:MediaPlayer#duration duration()} method is expected
     * @param {number} idx - Index of track based on the order of the order the tracks are added
     * @memberof module:MediaPlayer
     * @instance
     */
    function getThumbnail(time, idx) {
        console.log('getThumbnail - Time: ', time, ', Index: ', idx);
        return null;
    }

    function reset() {
    }

    instance = {
        initialize: initialize,
        getThumbnail: getThumbnail,
        reset: reset
    };

    setup();

    return instance;
}

ThumbnailController.__dashjs_factory_name = THUMBNAIL_CONTROLLER_TYPE;
export default FactoryMaker.getSingletonFactory(ThumbnailController);
