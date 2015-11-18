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
import Events from './Events.js';
import CoreEvents from '../core/events/CoreEvents.js';
import PublicEvents from './PublicEvents';
import ProtectionEvents from './protection/ProtectionEvents.js';
import IsoFile from './utils/IsoFile.js';




import KeySystem_PlayReady from './protection/drm/KeySystem_PlayReady.js';
import KeySystem_Widevine from './protection/drm/KeySystem_Widevine.js';
import KeySystem_ClearKey from './protection/drm/KeySystem_ClearKey.js';
import ClearKey from './protection/servers/ClearKey.js';
import DRMToday from './protection/servers/DRMToday.js';
import PlayReady from './protection/servers/PlayReady.js';
import Widevine from './protection/servers/Widevine.js';

import VideoModelExtensions from './extensions/VideoModelExtensions.js';
import MetricsList from './vo/MetricsList.js';



let Context = function () {


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

            this.system.mapSingleton('events', Events);


            this.system.mapSingleton('ksPlayReady', KeySystem_PlayReady);
            this.system.mapSingleton('ksWidevine', KeySystem_Widevine);
            this.system.mapSingleton('ksClearKey', KeySystem_ClearKey);
            this.system.mapSingleton('serverPlayReady', PlayReady);
            this.system.mapSingleton('serverWidevine', Widevine);
            this.system.mapSingleton('serverClearKey', ClearKey);
            this.system.mapSingleton('serverDRMToday', DRMToday);

            this.system.mapSingleton('videoExt', VideoModelExtensions);

            this.system.mapClass('metrics', MetricsList);
        }
    };
};

export default Context;