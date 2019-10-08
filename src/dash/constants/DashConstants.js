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
 * Dash constants declaration
 * @class
 * @ignore
 */
class DashConstants {

    init() {
        this.BASE_URL = 'BaseURL';
        this.SEGMENT_BASE = 'SegmentBase';
        this.SEGMENT_TEMPLATE = 'SegmentTemplate';
        this.SEGMENT_LIST = 'SegmentList';
        this.SEGMENT_URL = 'SegmentURL';
        this.SEGMENT_TIMELINE = 'SegmentTimeline';
        this.SEGMENT_PROFILES = 'segmentProfiles';
        this.ADAPTATION_SET = 'AdaptationSet';
        this.REPRESENTATION = 'Representation';
        this.REPRESENTATION_INDEX = 'RepresentationIndex';
        this.SUB_REPRESENTATION = 'SubRepresentation';
        this.INITIALIZATION = 'Initialization';
        this.INITIALIZATION_MINUS = 'initialization';
        this.MPD = 'MPD';
        this.PERIOD = 'Period';
        this.ASSET_IDENTIFIER = 'AssetIdentifier';
        this.EVENT_STREAM = 'EventStream';
        this.ID = 'id';
        this.PROFILES = 'profiles';
        this.SERVICE_LOCATION = 'serviceLocation';
        this.RANGE = 'range';
        this.INDEX = 'index';
        this.MEDIA = 'media';
        this.BYTE_RANGE = 'byteRange';
        this.INDEX_RANGE = 'indexRange';
        this.MEDIA_RANGE = 'mediaRange';
        this.VALUE = 'value';
        this.CONTENT_TYPE = 'contentType';
        this.MIME_TYPE = 'mimeType';
        this.BITSTREAM_SWITCHING = 'BitstreamSwitching';
        this.BITSTREAM_SWITCHING_MINUS = 'bitstreamSwitching';
        this.CODECS = 'codecs';
        this.DEPENDENCY_ID = 'dependencyId';
        this.MEDIA_STREAM_STRUCTURE_ID = 'mediaStreamStructureId';
        this.METRICS = 'Metrics';
        this.METRICS_MINUS = 'metrics';
        this.REPORTING = 'Reporting';
        this.WIDTH = 'width';
        this.HEIGHT = 'height';
        this.SAR = 'sar';
        this.FRAMERATE = 'frameRate';
        this.AUDIO_SAMPLING_RATE = 'audioSamplingRate';
        this.MAXIMUM_SAP_PERIOD = 'maximumSAPPeriod';
        this.START_WITH_SAP = 'startWithSAP';
        this.MAX_PLAYOUT_RATE = 'maxPlayoutRate';
        this.CODING_DEPENDENCY = 'codingDependency';
        this.SCAN_TYPE = 'scanType';
        this.FRAME_PACKING = 'FramePacking';
        this.AUDIO_CHANNEL_CONFIGURATION = 'AudioChannelConfiguration';
        this.CONTENT_PROTECTION = 'ContentProtection';
        this.ESSENTIAL_PROPERTY = 'EssentialProperty';
        this.SUPPLEMENTAL_PROPERTY = 'SupplementalProperty';
        this.INBAND_EVENT_STREAM = 'InbandEventStream';
        this.ACCESSIBILITY = 'Accessibility';
        this.ROLE = 'Role';
        this.RATING = 'Rating';
        this.CONTENT_COMPONENT = 'ContentComponent';
        this.SUBSET = 'Subset';
        this.LANG = 'lang';
        this.VIEWPOINT = 'Viewpoint';
        this.ROLE_ASARRAY = 'Role_asArray';
        this.ACCESSIBILITY_ASARRAY = 'Accessibility_asArray';
        this.AUDIOCHANNELCONFIGURATION_ASARRAY = 'AudioChannelConfiguration_asArray';
        this.CONTENTPROTECTION_ASARRAY = 'ContentProtection_asArray';
        this.MAIN = 'main';
        this.DYNAMIC = 'dynamic';
        this.MEDIA_PRESENTATION_DURATION = 'mediaPresentationDuration';
        this.MINIMUM_UPDATE_PERIOD = 'minimumUpdatePeriod';
        this.CODEC_PRIVATE_DATA = 'codecPrivateData';
        this.BANDWITH = 'bandwidth';
        this.SOURCE_URL = 'sourceURL';
        this.TIMESCALE = 'timescale';
        this.DURATION = 'duration';
        this.START_NUMBER = 'startNumber';
        this.PRESENTATION_TIME_OFFSET = 'presentationTimeOffset';
        this.AVAILABILITY_START_TIME = 'availabilityStartTime';
        this.AVAILABILITY_END_TIME = 'availabilityEndTime';
        this.TIMESHIFT_BUFFER_DEPTH = 'timeShiftBufferDepth';
        this.MAX_SEGMENT_DURATION = 'maxSegmentDuration';
        this.PRESENTATION_TIME = 'presentationTime';
        this.MIN_BUFFER_TIME = 'minBufferTime';
        this.MAX_SUBSEGMENT_DURATION = 'maxSubsegmentDuration';
        this.START = 'start';
        this.AVAILABILITY_TIME_OFFSET = 'availabilityTimeOffset';
        this.AVAILABILITY_TIME_COMPLETE = 'availabilityTimeComplete';
        this.CENC_DEFAULT_KID = 'cenc:default_KID';
        this.DVB_PRIORITY = 'dvb:priority';
        this.DVB_WEIGHT = 'dvb:weight';
        this.SUGGESTED_PRESENTATION_DELAY = 'suggestedPresentationDelay';
        this.SERVICE_DESCRIPTION = 'ServiceDescription';
        this.SERVICE_DESCRIPTION_SCOPE = 'Scope';
        this.SERVICE_DESCRIPTION_LATENCY = 'Latency';
        this.SERVICE_DESCRIPTION_PLAYBACK_RATE = 'PlaybackRate';
    }

    constructor () {
        this.init();
    }
}

let constants = new DashConstants();
export default constants;
