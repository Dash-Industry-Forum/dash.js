/*
 * The copyright in this software is being made available under the BSD License, included below. This software may be subject to other third party and contributor rights, including patent rights, and no such rights are granted under this license.
 *
 * Copyright (c) 2013, Digital Primates
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met:
 * •  Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer.
 * •  Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or other materials provided with the distribution.
 * •  Neither the name of the Digital Primates nor the names of its contributors may be used to endorse or promote products derived from this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS “AS IS” AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */
MediaPlayer.di.Context = function () {
    "use strict";

    return {
        system : undefined,
        setup : function () {
            this.system.autoMapOutlets = true;

            this.system.mapSingleton('debug', MediaPlayer.utils.Debug);
            this.system.mapSingleton('eventBus', MediaPlayer.utils.EventBus);
            this.system.mapSingleton('capabilities', MediaPlayer.utils.Capabilities);
            this.system.mapSingleton('textTrackExtensions', MediaPlayer.utils.TextTrackExtensions);
            this.system.mapSingleton('vttParser', MediaPlayer.utils.VTTParser);
            this.system.mapSingleton('ttmlParser', MediaPlayer.utils.TTMLParser);

            this.system.mapClass('videoModel', MediaPlayer.models.VideoModel);
            this.system.mapSingleton('manifestModel', MediaPlayer.models.ManifestModel);
            this.system.mapSingleton('metricsModel', MediaPlayer.models.MetricsModel);
            this.system.mapSingleton('uriQueryFragModel', MediaPlayer.models.URIQueryAndFragmentModel);
            this.system.mapClass('protectionModel', MediaPlayer.models.ProtectionModel);

            this.system.mapSingleton('requestModifierExt', MediaPlayer.dependencies.RequestModifierExtensions);
            this.system.mapSingleton('textSourceBuffer', MediaPlayer.dependencies.TextSourceBuffer);
            this.system.mapSingleton('mediaSourceExt', MediaPlayer.dependencies.MediaSourceExtensions);
            this.system.mapSingleton('sourceBufferExt', MediaPlayer.dependencies.SourceBufferExtensions);
            this.system.mapSingleton('abrController', MediaPlayer.dependencies.AbrController);
            this.system.mapSingleton('errHandler', MediaPlayer.dependencies.ErrorHandler);
            this.system.mapSingleton('protectionExt', MediaPlayer.dependencies.ProtectionExtensions);
            this.system.mapSingleton('videoExt', MediaPlayer.dependencies.VideoModelExtensions);
            this.system.mapSingleton('protectionController', MediaPlayer.dependencies.ProtectionController);
            this.system.mapClass('playbackController', MediaPlayer.dependencies.PlaybackController);

            this.system.mapSingleton('liveEdgeFinder', MediaPlayer.dependencies.LiveEdgeFinder);

            this.system.mapClass('metrics', MediaPlayer.models.MetricsList);
            this.system.mapClass('downloadRatioRule', MediaPlayer.rules.DownloadRatioRule);
            this.system.mapClass('insufficientBufferRule', MediaPlayer.rules.InsufficientBufferRule);
            this.system.mapClass('limitSwitchesRule', MediaPlayer.rules.LimitSwitchesRule);
            this.system.mapSingleton('abrRulesCollection', MediaPlayer.rules.ABRRulesCollection);

            this.system.mapSingleton('rulesController', MediaPlayer.rules.RulesController);
            this.system.mapClass('liveEdgeBinarySearchRule', MediaPlayer.rules.LiveEdgeBinarySearchRule);
            this.system.mapClass('bufferLevelRule', MediaPlayer.rules.BufferLevelRule);
            this.system.mapClass('pendingRequestsRule', MediaPlayer.rules.PendingRequestsRule);
            this.system.mapClass('playbackTimeRule', MediaPlayer.rules.PlaybackTimeRule);
            this.system.mapClass('sameTimeRequestRule', MediaPlayer.rules.SameTimeRequestRule);
            this.system.mapSingleton('scheduleRulesCollection', MediaPlayer.rules.ScheduleRulesCollection);

            this.system.mapClass('streamProcessor', MediaPlayer.dependencies.StreamProcessor);
			this.system.mapClass('eventController', MediaPlayer.dependencies.EventController);
            this.system.mapClass('textController', MediaPlayer.dependencies.TextController);
            this.system.mapClass('bufferController', MediaPlayer.dependencies.BufferController);
            this.system.mapSingleton('manifestLoader', MediaPlayer.dependencies.ManifestLoader);
            this.system.mapSingleton('manifestUpdater', MediaPlayer.dependencies.ManifestUpdater);
            this.system.mapClass('fragmentController', MediaPlayer.dependencies.FragmentController);
            this.system.mapClass('fragmentLoader', MediaPlayer.dependencies.FragmentLoader);
            this.system.mapClass('fragmentModel', MediaPlayer.dependencies.FragmentModel);
            this.system.mapSingleton('streamController', MediaPlayer.dependencies.StreamController);
            this.system.mapClass('stream', MediaPlayer.dependencies.Stream);
            this.system.mapClass('scheduleController', MediaPlayer.dependencies.ScheduleController);

            this.system.mapSingleton('notifier', MediaPlayer.dependencies.Notifier);
        }
    };
};
