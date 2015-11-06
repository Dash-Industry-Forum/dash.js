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
import CustomTimeRanges from './utils/CustomTimeRanges.js';
import VirtualBuffer from './utils/VirtualBuffer.js';
import IsoFile from './utils/IsoFile.js';
import BoxParser from './utils/BoxParser.js';

import VTTParser from './VTTParser.js';
import TTMLParser from './TTMLParser.js';

import VideoModel from './models/VideoModel.js';
import ManifestModel from './models/ManifestModel.js';
import MetricsModel from './models/MetricsModel.js';
import URIQueryAndFragmentModel from './models/URIQueryAndFragmentModel.js';

import KeySystem_PlayReady from './protection/drm/KeySystem_PlayReady.js';
import KeySystem_Widevine from './protection/drm/KeySystem_Widevine.js';
import KeySystem_ClearKey from './protection/drm/KeySystem_ClearKey.js';


import ClearKey from './protection/servers/ClearKey.js';
import DRMToday from './protection/servers/DRMToday.js';
import PlayReady from './protection/servers/PlayReady.js';
import Widevine from './protection/servers/Widevine.js';

import RequestModifierExtensions from './extensions/RequestModifierExtensions.js';
import TextSourceBuffer from './TextSourceBuffer.js';
import MediaSourceExtensions from './extensions/MediaSourceExtensions.js';
import SourceBufferExtensions from './extensions/SourceBufferExtensions.js';
import AbrController from './controllers/AbrController.js';
import ErrorHandler from './ErrorHandler.js';
import VideoModelExtensions from './extensions/VideoModelExtensions.js';
import ProtectionExtensions from './extensions/ProtectionExtensions.js';
import ProtectionController from './controllers/ProtectionController.js';
import PlaybackController from './controllers/PlaybackController.js';

import LiveEdgeFinder from './LiveEdgeFinder.js';

import MetricsList from './vo/MetricsList.js';
import InsufficientBufferRule from './rules/ABRRules/InsufficientBufferRule.js';
import BufferOccupancyRule from './rules/ABRRules/BufferOccupancyRule.js';
import ThroughputRule from './rules/ABRRules/ThroughputRule.js';
import ABRRulesCollection from './rules/ABRRules/ABRRulesCollection.js';
import AbandonRequestsRule from './rules/ABRRules/AbandonRequestsRule.js';

import RulesController from './rules/RulesController.js';
import BufferLevelRule from './rules/SchedulingRules/BufferLevelRule.js';
import PlaybackTimeRule from './rules/SchedulingRules/PlaybackTimeRule.js';
import ScheduleRulesCollection from './rules/SchedulingRules/ScheduleRulesCollection.js';

import LiveEdgeBinarySearchRule from './rules/SynchronizationRules/LiveEdgeBinarySearchRule.js';
import LiveEdgeWithTimeSynchronizationRule from './rules/SynchronizationRules/LiveEdgeWithTimeSynchronizationRule.js';
import SynchronizationRulesCollection from './rules/SynchronizationRules/SynchronizationRulesCollection.js';

import XlinkController from './controllers/XlinkController.js';
import XlinkLoader from './XlinkLoader.js';
import StreamProcessor from './StreamProcessor.js';
import EventController from './controllers/EventController.js';
import TextController from './controllers/TextController.js';
import BufferController from './controllers/BufferController.js';
import ManifestLoader from './ManifestLoader.js';
import ManifestUpdater from './ManifestUpdater.js';
import FragmentController from './controllers/FragmentController.js';
import FragmentLoader from './FragmentLoader.js';
import FragmentModel from './models/FragmentModel.js';
import StreamController from './controllers/StreamController.js';
import Stream from './Stream.js';
import ScheduleController from './controllers/ScheduleController.js';
import MediaController from './controllers/MediaController.js';
import TimeSyncController from './TimeSyncController.js';

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
            this.system.mapClass('customTimeRanges', CustomTimeRanges);
            this.system.mapSingleton('virtualBuffer', VirtualBuffer);
            this.system.mapClass('isoFile', IsoFile);

            //this.system.mapSingleton('textTrackExtensions', TextTrackExtensions);
            this.system.mapSingleton('vttParser', VTTParser);
            this.system.mapSingleton('ttmlParser', TTMLParser);
            this.system.mapSingleton('boxParser', BoxParser);

            this.system.mapSingleton('videoModel', VideoModel);
            this.system.mapSingleton('manifestModel', ManifestModel);
            this.system.mapSingleton('metricsModel', MetricsModel);
            this.system.mapSingleton('uriQueryFragModel', URIQueryAndFragmentModel);

            this.system.mapSingleton('ksPlayReady', KeySystem_PlayReady);
            this.system.mapSingleton('ksWidevine', KeySystem_Widevine);
            this.system.mapSingleton('ksClearKey', KeySystem_ClearKey);

            this.system.mapSingleton('serverPlayReady', PlayReady);
            this.system.mapSingleton('serverWidevine', Widevine);
            this.system.mapSingleton('serverClearKey', ClearKey);
            this.system.mapSingleton('serverDRMToday', DRMToday);

            this.system.mapSingleton('requestModifierExt', RequestModifierExtensions);
            this.system.mapSingleton('textSourceBuffer', TextSourceBuffer);
            this.system.mapSingleton('mediaSourceExt', MediaSourceExtensions);
            this.system.mapSingleton('sourceBufferExt', SourceBufferExtensions);
            this.system.mapSingleton('abrController', AbrController);
            this.system.mapSingleton('errHandler', ErrorHandler);
            this.system.mapSingleton('videoExt', VideoModelExtensions);
            this.system.mapSingleton('protectionExt', ProtectionExtensions);
            this.system.mapClass('protectionController', ProtectionController);
            this.system.mapSingleton('playbackController', PlaybackController);

            mapProtectionModel.call(this); // Determines EME API support and version

            this.system.mapSingleton('liveEdgeFinder', LiveEdgeFinder);

            this.system.mapClass('metrics', MetricsList);

            this.system.mapClass('insufficientBufferRule', InsufficientBufferRule);
            this.system.mapClass('bufferOccupancyRule', BufferOccupancyRule);
            this.system.mapClass('throughputRule', ThroughputRule);
            this.system.mapClass('abandonRequestRule', AbandonRequestsRule);
            this.system.mapSingleton('abrRulesCollection', ABRRulesCollection);

            this.system.mapSingleton('rulesController', RulesController);

            this.system.mapClass('bufferLevelRule', BufferLevelRule);
            this.system.mapClass('playbackTimeRule', PlaybackTimeRule);
            this.system.mapSingleton('scheduleRulesCollection', ScheduleRulesCollection);

            this.system.mapClass('liveEdgeBinarySearchRule', LiveEdgeBinarySearchRule);
            this.system.mapClass('liveEdgeWithTimeSynchronizationRule', LiveEdgeWithTimeSynchronizationRule);
            this.system.mapSingleton('synchronizationRulesCollection', SynchronizationRulesCollection);

            this.system.mapClass('xlinkController', XlinkController);
            this.system.mapClass('xlinkLoader', XlinkLoader);
            this.system.mapClass('streamProcessor', StreamProcessor);
            this.system.mapClass('eventController', EventController);
            this.system.mapClass('textController', TextController);
            this.system.mapClass('bufferController', BufferController);
            this.system.mapClass('manifestLoader', ManifestLoader);
            this.system.mapSingleton('manifestUpdater', ManifestUpdater);
            this.system.mapClass('fragmentController', FragmentController);
            this.system.mapClass('fragmentLoader', FragmentLoader);
            this.system.mapClass('fragmentModel', FragmentModel);
            this.system.mapSingleton('streamController', StreamController);
            this.system.mapSingleton('mediaController', MediaController);
            this.system.mapClass('stream', Stream);
            this.system.mapClass('scheduleController', ScheduleController);
            this.system.mapSingleton('timeSyncController', TimeSyncController);
        }
    };
};

export default Context;