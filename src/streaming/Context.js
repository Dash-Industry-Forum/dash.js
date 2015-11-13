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
 * Dijon Context Object
 *
 * @class
 */
import Debug from './utils/Debug.js';
import EventBus from './utils/EventBus.js';
import Events from './Events.js';
import CoreEvents from '../core/events/CoreEvents.js';
import PublicEvents from './PublicEvents';
import ProtectionEvents from './protection/ProtectionEvents.js';
import Capabilities from './utils/Capabilities.js';
import DOMStorage from './utils/DOMStorage.js';
import VirtualBuffer from './utils/VirtualBuffer.js';
import IsoFile from './utils/IsoFile.js';

import ManifestModel from './models/ManifestModel.js';
import MetricsModel from './models/MetricsModel.js';

import KeySystem_PlayReady from './protection/drm/KeySystem_PlayReady.js';
import KeySystem_Widevine from './protection/drm/KeySystem_Widevine.js';
import KeySystem_ClearKey from './protection/drm/KeySystem_ClearKey.js';


import ClearKey from './protection/servers/ClearKey.js';
import DRMToday from './protection/servers/DRMToday.js';
import PlayReady from './protection/servers/PlayReady.js';
import Widevine from './protection/servers/Widevine.js';

import SourceBufferExtensions from './extensions/SourceBufferExtensions.js';
import ErrorHandler from './ErrorHandler.js';
import VideoModelExtensions from './extensions/VideoModelExtensions.js';
import ProtectionExtensions from './extensions/ProtectionExtensions.js';


import MetricsList from './vo/MetricsList.js';


import XlinkLoader from './XlinkLoader.js';
import StreamProcessor from './StreamProcessor.js';

import ManifestLoader from './ManifestLoader.js';
import ManifestUpdater from './ManifestUpdater.js';

import FragmentModel from './models/FragmentModel.js';
import Stream from './Stream.js';


import ProtectionModel_21Jan2015 from './models/ProtectionModel_21Jan2015.js';
import ProtectionModel_3Feb2014 from './models/ProtectionModel_3Feb2014.js';
import ProtectionModel_01b from './models/ProtectionModel_01b.js';


let Context = function () {
    "use strict";

    var mapProtectionModel = function() {
        var videoElement = document.createElement("video");

        // Detect EME APIs.  Look for newest API versions first
        if (ProtectionModel_21Jan2015.detect(videoElement)) {
            this.system.mapClass('protectionModel', ProtectionModel_21Jan2015);
        } else if (ProtectionModel_3Feb2014.detect(videoElement)) {
            this.system.mapClass('protectionModel', ProtectionModel_3Feb2014);
        } else if (ProtectionModel_01b.detect(videoElement)) {
            this.system.mapClass('protectionModel', ProtectionModel_01b);
        } else {
            this.debug.log("No supported version of EME detected on this user agent!");
            this.debug.log("Attempts to play encrypted content will fail!");
        }
    };

    return {
        system : undefined,
        setup : function () {
            var coreEvents,
                protectionEvents;

            if (CoreEvents) {
                coreEvents = new CoreEvents();
                Events.extend(coreEvents);
            } else {
                throw new Error("CoreEvents are mandatory");
            }

            if (ProtectionEvents) {
                protectionEvents = new ProtectionEvents();
                Events.extend(protectionEvents);
                PublicEvents.extend(protectionEvents, {publicOnly:true})
            }

            if (PublicEvents) {
                Events.extend(PublicEvents);
            }

            this.system.autoMapOutlets = true;

            this.system.mapSingleton('capabilities', Capabilities);
            this.system.mapSingleton('eventBus', EventBus);
            this.system.mapSingleton('events', Events);
            this.system.mapSingleton('DOMStorage', DOMStorage);
            this.system.mapSingleton('virtualBuffer', VirtualBuffer);
            this.system.mapSingleton('manifestModel', ManifestModel);
            this.system.mapSingleton('metricsModel', MetricsModel);

            this.system.mapSingleton('ksPlayReady', KeySystem_PlayReady);
            this.system.mapSingleton('ksWidevine', KeySystem_Widevine);
            this.system.mapSingleton('ksClearKey', KeySystem_ClearKey);

            this.system.mapSingleton('serverPlayReady', PlayReady);
            this.system.mapSingleton('serverWidevine', Widevine);
            this.system.mapSingleton('serverClearKey', ClearKey);
            this.system.mapSingleton('serverDRMToday', DRMToday);

            this.system.mapSingleton('sourceBufferExt', SourceBufferExtensions);
            this.system.mapSingleton('errHandler', ErrorHandler);
            this.system.mapSingleton('videoExt', VideoModelExtensions);
            this.system.mapSingleton('protectionExt', ProtectionExtensions);


            mapProtectionModel.call(this); // Determines EME API support and version

            this.system.mapClass('metrics', MetricsList);


            this.system.mapClass('xlinkLoader', XlinkLoader);
            this.system.mapClass('streamProcessor', StreamProcessor);
            this.system.mapClass('manifestLoader', ManifestLoader);
            this.system.mapSingleton('manifestUpdater', ManifestUpdater);

            this.system.mapClass('fragmentModel', FragmentModel);
            this.system.mapClass('stream', Stream);
        }
    };
};

export default Context;