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

import DashParser from './DashParser.js';
import DashHandler from './DashHandler.js';
import BaseURLExtensions from './extensions/BaseURLExtensions.js';
import FragmentExtensions from './extensions/FragmentExtensions.js';
import RepresentationController from './controllers/RepresentationController.js';
import DashManifestExtensions from './extensions/DashManifestExtensions.js';
import DashMetricsExtensions from './extensions/DashMetricsExtensions.js';
import TimelineConverter from './TimelineConverter.js';
import DashAdapter from './DashAdapter.js';

let DashContext = function () {
    "use strict";

    return {
        system : undefined,
        setup : function () {
            DashContext.prototype.setup.call(this);

            this.system.mapClass('parser', DashParser);
            this.system.mapClass('indexHandler', DashHandler);
            this.system.mapSingleton('baseURLExt', BaseURLExtensions);
            this.system.mapClass('fragmentExt', FragmentExtensions);
            this.system.mapClass('trackController', RepresentationController);
            this.system.mapSingleton('manifestExt', DashManifestExtensions);
            this.system.mapSingleton('metricsExt', DashMetricsExtensions);
            this.system.mapSingleton('timelineConverter', TimelineConverter);
            this.system.mapSingleton('adapter', DashAdapter);
        }
    };
};

import MediaContext from '../Context.js';

DashContext.prototype = new MediaContext();
DashContext.prototype.constructor = MediaContext;

export default DashContext;
