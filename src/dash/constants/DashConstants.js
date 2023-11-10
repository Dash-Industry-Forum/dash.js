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
 *  NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES, LOSS OF USE, DATA, OR
 *  PROFITS, OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY,
 *  WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
 *  ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
 *  POSSIBILITY OF SUCH DAMAGE.
 */

/**
 * Dash constants declaration
 * @ignore
 */
export default {
    ACCESSIBILITY: 'Accessibility',
    ADAPTATION_SET: 'AdaptationSet',
    ADAPTATION_SET_SWITCHING_SCHEME_ID_URI: 'urn:mpeg:dash:adaptation-set-switching:2016',
    ADD: 'add',
    ASSET_IDENTIFIER: 'AssetIdentifier',
    AUDIO_CHANNEL_CONFIGURATION: 'AudioChannelConfiguration',
    AUDIO_SAMPLING_RATE: 'audioSamplingRate',
    AVAILABILITY_END_TIME: 'availabilityEndTime',
    AVAILABILITY_START_TIME: 'availabilityStartTime',
    AVAILABILITY_TIME_COMPLETE: 'availabilityTimeComplete',
    AVAILABILITY_TIME_OFFSET: 'availabilityTimeOffset',
    BANDWITH: 'bandwidth',
    BASE_URL: 'BaseURL',
    BITSTREAM_SWITCHING: 'BitstreamSwitching',
    BITSTREAM_SWITCHING_MINUS: 'bitstreamSwitching',
    BYTE_RANGE: 'byteRange',
    CENC_DEFAULT_KID: 'cenc:default_KID',
    CLIENT_REQUIREMENT: 'clientRequirement',
    CODECS: 'codecs',
    CODEC_PRIVATE_DATA: 'codecPrivateData',
    CODING_DEPENDENCY: 'codingDependency',
    CONTENT_COMPONENT: 'ContentComponent',
    CONTENT_PROTECTION: 'ContentProtection',
    CONTENT_STEERING: 'ContentSteering',
    CONTENT_STEERING_RESPONSE: {
        VERSION: 'VERSION',
        TTL: 'TTL',
        RELOAD_URI: 'RELOAD-URI',
        PATHWAY_PRIORITY: 'PATHWAY-PRIORITY',
        PATHWAY_CLONES: 'PATHWAY-CLONES',
        BASE_ID: 'BASE-ID',
        ID: 'ID',
        URI_REPLACEMENT: 'URI-REPLACEMENT',
        HOST: 'HOST',
        PARAMS: 'PARAMS'
    },
    CONTENT_TYPE: 'contentType',
    DEFAULT_SERVICE_LOCATION: 'defaultServiceLocation',
    DEPENDENCY_ID: 'dependencyId',
    DURATION: 'duration',
    DVB_PRIORITY: 'dvb:priority',
    DVB_WEIGHT: 'dvb:weight',
    DYNAMIC: 'dynamic',
    ESSENTIAL_PROPERTY: 'EssentialProperty',
    EVENT: 'Event',
    EVENT_STREAM: 'EventStream',
    FRAMERATE: 'frameRate',
    FRAME_PACKING: 'FramePacking',
    GROUP_LABEL: 'GroupLabel',
    HEIGHT: 'height',
    ID: 'id',
    INBAND: 'inband',
    INBAND_EVENT_STREAM: 'InbandEventStream',
    INDEX: 'index',
    INDEX_RANGE: 'indexRange',
    INITIALIZATION: 'Initialization',
    INITIALIZATION_MINUS: 'initialization',
    LABEL: 'Label',
    LANG: 'lang',
    LOCATION: 'Location',
    MAIN: 'main',
    MAXIMUM_SAP_PERIOD: 'maximumSAPPeriod',
    MAX_PLAYOUT_RATE: 'maxPlayoutRate',
    MAX_SEGMENT_DURATION: 'maxSegmentDuration',
    MAX_SUBSEGMENT_DURATION: 'maxSubsegmentDuration',
    MEDIA: 'media',
    MEDIA_PRESENTATION_DURATION: 'mediaPresentationDuration',
    MEDIA_RANGE: 'mediaRange',
    MEDIA_STREAM_STRUCTURE_ID: 'mediaStreamStructureId',
    METRICS: 'Metrics',
    METRICS_MINUS: 'metrics',
    MIME_TYPE: 'mimeType',
    MINIMUM_UPDATE_PERIOD: 'minimumUpdatePeriod',
    MIN_BUFFER_TIME: 'minBufferTime',
    MPD: 'MPD',
    ORIGINAL_MPD_ID: 'mpdId',
    ORIGINAL_PUBLISH_TIME: 'originalPublishTime',
    PATCH_LOCATION: 'PatchLocation',
    PERIOD: 'Period',
    PRESENTATION_TIME: 'presentationTime',
    PRESENTATION_TIME_OFFSET: 'presentationTimeOffset',
    PRODUCER_REFERENCE_TIME: 'ProducerReferenceTime',
    PRODUCER_REFERENCE_TIME_TYPE: {
        ENCODER: 'encoder',
        CAPTURED: 'captured',
        APPLICATION: 'application'
    },
    PROFILES: 'profiles',
    PUBLISH_TIME: 'publishTime',
    QUALITY_RANKING : 'qualityRanking',
    QUERY_BEFORE_START: 'queryBeforeStart',
    RANGE: 'range',
    RATING: 'Rating',
    REMOVE: 'remove',
    REPLACE: 'replace',
    REPORTING: 'Reporting',
    REPRESENTATION: 'Representation',
    REPRESENTATION_INDEX: 'RepresentationIndex',
    ROLE: 'Role',
    S: 'S',
    SAR: 'sar',
    SCAN_TYPE: 'scanType',
    SEGMENT_ALIGNMENT: 'segmentAlignment',
    SEGMENT_BASE: 'SegmentBase',
    SEGMENT_LIST: 'SegmentList',
    SEGMENT_PROFILES: 'segmentProfiles',
    SEGMENT_TEMPLATE: 'SegmentTemplate',
    SEGMENT_TIMELINE: 'SegmentTimeline',
    SEGMENT_URL: 'SegmentURL',
    SERVICE_DESCRIPTION: 'ServiceDescription',
    SERVICE_DESCRIPTION_LATENCY: 'Latency',
    SERVICE_DESCRIPTION_OPERATING_BANDWIDTH: 'OperatingBandwidth',
    SERVICE_DESCRIPTION_OPERATING_QUALITY: 'OperatingQuality',
    SERVICE_DESCRIPTION_PLAYBACK_RATE: 'PlaybackRate',
    SERVICE_DESCRIPTION_SCOPE: 'Scope',
    SERVICE_LOCATION: 'serviceLocation',
    SOURCE_URL: 'sourceURL',
    START: 'start',
    START_NUMBER: 'startNumber',
    START_WITH_SAP: 'startWithSAP',
    STATIC: 'static',
    SUBSET: 'Subset',
    SUB_REPRESENTATION: 'SubRepresentation',
    SUB_SEGMENT_ALIGNMENT: 'subsegmentAlignment',
    SUGGESTED_PRESENTATION_DELAY: 'suggestedPresentationDelay',
    SUPPLEMENTAL_PROPERTY: 'SupplementalProperty',
    TIMESCALE: 'timescale',
    TIMESHIFT_BUFFER_DEPTH: 'timeShiftBufferDepth',
    TTL: 'ttl',
    TYPE: 'type',
    UTC_TIMING: 'UTCTiming',
    VALUE: 'value',
    VIEWPOINT: 'Viewpoint',
    WALL_CLOCK_TIME: 'wallClockTime',
    WIDTH: 'width',
}

