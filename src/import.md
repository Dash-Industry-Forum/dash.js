/**
 * @copyright The copyright in this software is being made available under the BSD License, included below. This software may be subject to other third party and contributor rights, including patent rights, and no such rights are granted under this license.
 *
 * Copyright (c) 2013, Digital Primates
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met:
 * •  Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer.
 * •  Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or other materials provided with the distribution.
 * •  Neither the name of the Digital Primates nor the names of its contributors may be used to endorse or promote products derived from this software without specific prior written permission.
 *
 * @license THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS “AS IS” AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A  * *		PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED *		TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING *		NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 * @class MediaPlayer
 * @param aContext - New instance of a dijon.js context (i.e. new Dash.di.DashContext()).  You can pass a custom context that extends Dash.di.DashContext to override item(s) in the DashContext.
 */
 
 
#Please update this list as well as the dash-if-reference-player located in samples/dash-if-reference-player/index.html upon submission of new files that are required

<!--3rd Party Libs Dash.js-->
<script src="lib/dijon.js"></script>
<script src="lib/base64.js"></script>
<script src="lib/xml2json.js"></script>
<script src="lib/objectiron.js"></script>
<script src="lib/long.js"></script>
<script src="lib/Math.js"></script>

<script src="streaming/MediaPlayer.js"></script>
<script src="streaming/Context.js"></script>
<script src="streaming/ErrorHandler.js"></script>
<script src="streaming/Capabilities.js"></script>
<script src="streaming/EventBus.js"></script>
<script src="streaming/Debug.js"></script>
<script src="streaming/RequestModifierExtensions.js"></script>
<script src="streaming/VideoModel.js"></script>
<script src="streaming/vo/FragmentRequest.js"></script>
<script src="streaming/vo/BitrateInfo.js"></script>
<script src="streaming/vo/TrackInfo.js"></script>
<script src="streaming/vo/MediaInfo.js"></script>
<script src="streaming/vo/StreamInfo.js"></script>
<script src="streaming/vo/ManifestInfo.js"></script>
<script src="streaming/vo/Event.js"></script>
<script src="streaming/vo/Error.js"></script>
<script src="streaming/ManifestLoader.js"></script>
<script src="streaming/ManifestUpdater.js"></script>
<script src="streaming/ManifestModel.js"></script>
<script src="streaming/MediaSourceExtensions.js"></script>
<script src="streaming/SourceBufferExtensions.js"></script>
<script src="streaming/VideoModelExtensions.js"></script>
<script src="streaming/PlaybackController.js"></script>
<script src="streaming/FragmentController.js"></script>
<script src="streaming/AbrController.js"></script>
<script src="streaming/FragmentLoader.js"></script>
<script src="streaming/FragmentModel.js"></script>
<script src="streaming/StreamController.js"></script>
<script src="streaming/StreamProcessor.js"></script>
<script src="streaming/ScheduleController.js"></script>
<script src="streaming/TimeSyncController.js"></script>
<script src="streaming/Stream.js"></script>
<script src="streaming/BufferController.js"></script>
<script src="streaming/LiveEdgeFinder.js"></script>
<script src="streaming/Notifier.js"></script>
<script src="streaming/EventController.js"></script>
<script src="streaming/URIQueryAndFragmentModel.js"></script>
<script src="streaming/vo/URIFragmentData.js"></script>

<!--Rules -->
<script src="streaming/rules/SwitchRequest.js"></script>
<script src="streaming/rules/RulesContext.js"></script>
<script src="streaming/rules/ABRRules/InsufficientBufferRule.js"></script>
<script src="streaming/rules/ABRRules/LimitSwitchesRule.js"></script>
<script src="streaming/rules/ABRRules/BufferOccupancyRule.js"></script>
<script src="streaming/rules/ABRRules/ThroughputRule.js"></script>
<script src="streaming/rules/ABRRules/ABRRulesCollection.js"></script>

<script src="streaming/rules/SchedulingRules/RulesController.js"></script>
<script src="streaming/rules/SchedulingRules/ScheduleRulesCollection.js"></script>
<script src="streaming/rules/SchedulingRules/BufferLevelRule.js"></script>
<script src="streaming/rules/SchedulingRules/PendingRequestsRule.js"></script>
<script src="streaming/rules/SchedulingRules/SameTimeRequestRule.js"></script>
<script src="streaming/rules/SchedulingRules/PlaybackTimeRule.js"></script>

<script src="streaming/rules/SyncronisationRules/LiveEdgeBinarySearchRule.js"></script>
<script src="streaming/rules/SyncronisationRules/LiveEdgeWithTimeSyncronisationRule.js"></script>
<script src="streaming/rules/SyncronisationRules/SyncronisationRulesCollection.js"></script>


<!--protection-->
<script src="streaming/protection/eme/ProtectionModel.js"></script>
<script src="streaming/protection/eme/ProtectionModel_3Feb2014.js"></script>
<script src="streaming/protection/eme/ProtectionModel_01b.js"></script>
<script src="streaming/protection/ProtectionController.js"></script>
<script src="streaming/protection/ProtectionExtensions.js"></script>

<script src="streaming/protection/eme/SessionToken.js"></script>
<script src="streaming/protection/CommonEncryption.js"></script>
<script src="streaming/protection/drm/KeySystem.js"></script>
<script src="streaming/protection/drm/KeySystem_Access.js"></script>
<script src="streaming/protection/drm/KeySystem_ClearKey.js"></script>
<script src="streaming/protection/drm/KeySystem_PlayReady.js"></script>
<script src="streaming/protection/drm/KeySystem_Widevine.js"></script>
<script src="streaming/protection/drm/KeySystem.js"></script>

<script src="streaming/vo/protection/KeyError.js"></script>
<script src="streaming/vo/protection/KeyMessage.js"></script>
<script src="streaming/vo/protection/LicenseRequestComplete.js"></script>
<script src="streaming/vo/protection/NeedKey.js"></script>
<script src="streaming/vo/protection/ProtectionData.js"></script>

<!--Captioning-->
<script src="streaming/captioning/VTTParser.js"></script>
<script src="streaming/captioning/TTMLParser.js"></script>
<script src="streaming/captioning/TextTrackExtensions.js"></script>
<script src="streaming/captioning/TextSourceBuffer.js"></script>
<script src="streaming/captioning/TextController.js"></script>

<!-- Metrics-->
<script src="streaming/vo/MetricsList.js"></script>
<script src="streaming/MetricsModel.js"></script>
<script src="streaming/vo/metrics/BufferLevel.js"></script>
<script src="streaming/vo/metrics/BufferState.js"></script>
<script src="streaming/vo/metrics/HTTPRequest.js"></script>
<script src="streaming/vo/metrics/PlayList.js"></script>
<script src="streaming/vo/metrics/RepresentationSwitch.js"></script>
<script src="streaming/vo/metrics/TCPConnection.js"></script>
<script src="streaming/vo/metrics/DroppedFrames.js"></script>
<script src="streaming/vo/metrics/SchedulingInfo.js"></script>
<script src="streaming/vo/metrics/ManifestUpdate.js"></script>
<script src="streaming/vo/metrics/DVRInfo.js"></script>

<!-- Dash -->
<script src="dash/Dash.js"></script>
<script src="dash/DashContext.js"></script>

<script src="dash/vo/Mpd.js"></script>
<script src="dash/vo/Period.js"></script>
<script src="dash/vo/AdaptationSet.js"></script>
<script src="dash/vo/Representation.js"></script>
<script src="dash/vo/Segment.js"></script>
<script src="dash/vo/Event.js"></script>
<script src="dash/vo/EventStream.js"></script>
<script src="dash/vo/UTCTiming.js"></script>
<script src="dash/DashParser.js"></script>
<script src="dash/DashHandler.js"></script>
<script src="dash/RepresentationController.js"></script>
<script src="dash/BaseURLExtensions.js"></script>
<script src="dash/FragmentExtensions.js"></script>
<script src="dash/DashManifestExtensions.js"></script>
<script src="dash/DashMetricsExtensions.js"></script>
<script src="dash/TimelineConverter.js"></script>
<script src="dash/DashAdapter.js"></script>