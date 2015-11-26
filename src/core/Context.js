import VideoModel from '../streaming/models/VideoModel.js';
import PlaybackController from '../streaming/controllers/PlaybackController.js';
import RulesController from '../streaming/rules/RulesController.js';
import MediaController from '../streaming/controllers/MediaController.js';
import VirtualBuffer from '../streaming/utils/VirtualBuffer.js';
import SourceBufferExtensions from '../streaming/extensions/SourceBufferExtensions.js';
import ScheduleRulesCollection from '../streaming/rules/SchedulingRules/ScheduleRulesCollection.js';
import ABRRulesCollection from '../streaming/rules/ABRRules/ABRRulesCollection.js';
import SynchronizationRulesCollection from '../streaming/rules/SynchronizationRules/SynchronizationRulesCollection.js';
import StreamController from '../streaming/controllers/StreamController.js';
import AbrController from '../streaming/controllers/AbrController.js';
import ManifestModel from '../streaming/models/ManifestModel.js';
import ManifestUpdater from '../streaming/ManifestUpdater.js';
import VideoModelExtensions from '../streaming/extensions/VideoModelExtensions.js';
import LiveEdgeFinder from '../streaming/LiveEdgeFinder.js';
import MediaSourceExtensions from '../streaming/extensions/MediaSourceExtensions.js';
import TimeSyncController from '../streaming/TimeSyncController.js';
import TextSourceBuffer from '../streaming/TextSourceBuffer.js';
import DOMStorage from '../streaming/utils/DOMStorage.js';
import MetricsModel from '../streaming/models/MetricsModel.js';
import MediaPlayerModel from '../streaming/models/MediaPlayerModel.js';
import ErrorHandler from '../streaming/ErrorHandler.js';
import Capabilities from '../streaming/utils/Capabilities.js';
import Debug from "../streaming/utils/Debug.js";
import BoxParser from "../streaming/utils/BoxParser.js";
import URIQueryAndFragmentModel from '../streaming/models/URIQueryAndFragmentModel.js';
import RequestModifierExtensions from '../streaming/extensions/RequestModifierExtensions.js';
import TextTrackExtensions from '../streaming/extensions/TextTrackExtensions.js';
import TTMLParser from '../streaming/TTMLParser.js';
import VTTParser from '../streaming/VTTParser.js';
import EventController from '../streaming/controllers/EventController.js';

//dash
import DashAdapter from '../dash/DashAdapter.js';
import TimelineConverter from '../dash/TimelineConverter.js';
import DashManifestExtensions from "../dash/extensions/DashManifestExtensions.js";
import DashMetricsExtensions from '../dash/extensions/DashMetricsExtensions.js';
import BaseURLExtensions from '../dash/extensions/BaseURLExtensions.js';
import FragmentExtensions from '../dash/extensions/FragmentExtensions.js';

//protection
import ProtectionExtensions from '../streaming/extensions/ProtectionExtensions.js';
import ClearKey from '../streaming/protection/servers/ClearKey.js';
import DRMToday from '../streaming/protection/servers/DRMToday.js';
import PlayReady from '../streaming/protection/servers/PlayReady.js';
import Widevine from '../streaming/protection/servers/Widevine.js';
import KeySystemAdobeAccess from '../streaming/protection/drm/KeySystemAdobeAccess.js';
import KeySystemWidevine from '../streaming/protection/drm/KeySystemWidevine.js';
import KeySystemPlayReady from '../streaming/protection/drm/KeySystemPlayReady.js';
import KeySystemClearKey from '../streaming/protection/drm/KeySystemClearKey.js';

import EventBus from '../streaming/utils/EventBus.js';

class Context {
    constructor(){
        this.debug = new Debug().getInstance();
        this.abrController = new AbrController().getInstance();
        this.videoModel = new VideoModel().getInstance();
        this.abrRulesCollection = new ABRRulesCollection().getInstance();
        this.baseURLExt = new BaseURLExtensions().getInstance();
        this.boxParser = new BoxParser().getInstance();
        this.capabilities = new Capabilities().getInstance();
        this.DOMStorage = new DOMStorage().getInstance();
        this.errorHandler = new ErrorHandler().getInstance();
        this.liveEdgeFinder = new LiveEdgeFinder().getInstance();
        this.manifestModel = new ManifestModel().getInstance();
        this.manifestUpdater = new ManifestUpdater().getInstance();
        this.mediaController = new MediaController().getInstance();
        this.mediaPlayerModel = new MediaPlayerModel().getInstance();
        this.mediaSourceExt = new MediaSourceExtensions().getInstance();
        this.metricsModel = new MetricsModel().getInstance();
        this.playbackController = new PlaybackController().getInstance();
        this.requestModifierExt = new RequestModifierExtensions().getInstance();
        this.rulesController = new RulesController().getInstance();
        this.scheduleRulesCollection = new ScheduleRulesCollection().getInstance();
        this.sourceBufferExt = new SourceBufferExtensions().getInstance();
        this.streamController = new StreamController().getInstance();
        this.synchronizationRulesCollection = new SynchronizationRulesCollection().getInstance();
        this.timeSyncController = new TimeSyncController().getInstance();
        this.URIQueryAndFragmentModel = new URIQueryAndFragmentModel().getInstance();
        this.videoModelExt = new VideoModelExtensions().getInstance();
        this.virtualBuffer = new VirtualBuffer().getInstance();


        //Dash Based Modules
        this.adapter = new DashAdapter().getInstance();
        this.manifestExt = new DashManifestExtensions().getInstance();
        this.metricsExt = new DashMetricsExtensions().getInstance();
        this.timelineConverter = new TimelineConverter().getInstance();


        //TODO break out into protection context?
        this.ClearKey = new ClearKey().getInstance();
        this.DRMToday = new DRMToday().getInstance();
        this.keySystemAdobeAccess = new KeySystemAdobeAccess().getInstance();
        this.keySystemClearKey = new KeySystemClearKey().getInstance();
        this.keySystemPlayReady = new KeySystemPlayReady().getInstance();
        this.keySystemWidevine = new KeySystemWidevine().getInstance();
        this.PlayReady = new PlayReady().getInstance();
        this.protectionExt = new ProtectionExtensions().getInstance();
        this.Widevine = new Widevine().getInstance();


        //TODO break out into protection context?
        this.eventController = new EventController().getInstance();
        this.fragmentExt = new FragmentExtensions().getInstance();
        this.textSourceBuffer = new TextSourceBuffer().getInstance();
        this.textTrackExt = new TextTrackExtensions().getInstance();
        this.TTMLParser = new TTMLParser().getInstance();
        this.VTTParser = new VTTParser().getInstance();
        this.EventBus = new EventBus().getInstance();

    }
}

export default Context;