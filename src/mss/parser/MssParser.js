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
 * @module MssParser
 * @ignore
 * @param {Object} config object
 */

import BigInt from '../../../externals/BigInteger';

function MssParser(config) {
    config = config || {};
    const BASE64 = config.BASE64;
    const debug = config.debug;
    const constants = config.constants;
    const manifestModel = config.manifestModel;
    const mediaPlayerModel = config.mediaPlayerModel;
    const settings = config.settings;

    const DEFAULT_TIME_SCALE = 10000000.0;
    const SUPPORTED_CODECS = ['AAC', 'AACL', 'AVC1', 'H264', 'TTML', 'DFXP'];
    // MPEG-DASH Role and accessibility mapping for text tracks according to ETSI TS 103 285 v1.1.1 (section 7.1.2)
    const ROLE = {
        'CAPT': 'main',
        'SUBT': 'alternate',
        'DESC': 'main'
    };
    const ACCESSIBILITY = {
        'DESC': '2'
    };
    const samplingFrequencyIndex = {
        96000: 0x0,
        88200: 0x1,
        64000: 0x2,
        48000: 0x3,
        44100: 0x4,
        32000: 0x5,
        24000: 0x6,
        22050: 0x7,
        16000: 0x8,
        12000: 0x9,
        11025: 0xA,
        8000: 0xB,
        7350: 0xC
    };
    const mimeTypeMap = {
        'video': 'video/mp4',
        'audio': 'audio/mp4',
        'text': 'application/mp4'
    };

    let instance,
        logger,
        initialBufferSettings;


    function setup() {
        logger = debug.getLogger(instance);
    }

    function getAttributeAsBoolean(node, attrName) {
        const value = node.getAttribute(attrName);
        if (!value) return false;
        return value.toLowerCase() === 'true';
    }

    function mapPeriod(smoothStreamingMedia, timescale) {
        const period = {};
        let streams,
            adaptation;

        // For each StreamIndex node, create an AdaptationSet element
        period.AdaptationSet_asArray = [];
        streams = smoothStreamingMedia.getElementsByTagName('StreamIndex');
        for (let i = 0; i < streams.length; i++) {
            adaptation = mapAdaptationSet(streams[i], timescale);
            if (adaptation !== null) {
                period.AdaptationSet_asArray.push(adaptation);
            }
        }

        if (period.AdaptationSet_asArray.length > 0) {
            period.AdaptationSet = (period.AdaptationSet_asArray.length > 1) ? period.AdaptationSet_asArray : period.AdaptationSet_asArray[0];
        }

        return period;
    }

    function mapAdaptationSet(streamIndex, timescale) {
        const adaptationSet = {};
        const representations = [];
        let segmentTemplate;
        let qualityLevels,
            representation,
            i,
            index;

        const name = streamIndex.getAttribute('Name');
        const type = streamIndex.getAttribute('Type');
        const lang = streamIndex.getAttribute('Language');
        const fallBackId = lang ? type + '_' + lang : type;

        adaptationSet.id = name || fallBackId;
        adaptationSet.contentType = type;
        adaptationSet.lang = lang || 'und';
        adaptationSet.mimeType = mimeTypeMap[type];
        adaptationSet.subType = streamIndex.getAttribute('Subtype');
        adaptationSet.maxWidth = streamIndex.getAttribute('MaxWidth');
        adaptationSet.maxHeight = streamIndex.getAttribute('MaxHeight');

        // Map text tracks subTypes to MPEG-DASH AdaptationSet role and accessibility (see ETSI TS 103 285 v1.1.1, section 7.1.2)
        if (adaptationSet.subType) {
            if (ROLE[adaptationSet.subType]) {
                let role = {
                    schemeIdUri: 'urn:mpeg:dash:role:2011',
                    value: ROLE[adaptationSet.subType]
                };
                adaptationSet.Role = role;
                adaptationSet.Role_asArray = [role];
            }
            if (ACCESSIBILITY[adaptationSet.subType]) {
                let accessibility = {
                    schemeIdUri: 'urn:tva:metadata:cs:AudioPurposeCS:2007',
                    value: ACCESSIBILITY[adaptationSet.subType]
                };
                adaptationSet.Accessibility = accessibility;
                adaptationSet.Accessibility_asArray = [accessibility];
            }
        }

        // Create a SegmentTemplate with a SegmentTimeline
        segmentTemplate = mapSegmentTemplate(streamIndex, timescale);

        qualityLevels = streamIndex.getElementsByTagName('QualityLevel');
        // For each QualityLevel node, create a Representation element
        for (i = 0; i < qualityLevels.length; i++) {
            // Propagate BaseURL and mimeType
            qualityLevels[i].BaseURL = adaptationSet.BaseURL;
            qualityLevels[i].mimeType = adaptationSet.mimeType;

            // Set quality level id
            index = qualityLevels[i].getAttribute('Index');
            qualityLevels[i].Id = adaptationSet.id + ((index !== null) ? ('_' + index) : '');

            // Map Representation to QualityLevel
            representation = mapRepresentation(qualityLevels[i], streamIndex);

            if (representation !== null) {
                // Copy SegmentTemplate into Representation
                representation.SegmentTemplate = segmentTemplate;

                representations.push(representation);
            }
        }

        if (representations.length === 0) {
            return null;
        }

        adaptationSet.Representation = (representations.length > 1) ? representations : representations[0];
        adaptationSet.Representation_asArray = representations;

        // Set SegmentTemplate
        adaptationSet.SegmentTemplate = segmentTemplate;

        return adaptationSet;
    }

    function mapRepresentation(qualityLevel, streamIndex) {
        const representation = {};
        const type = streamIndex.getAttribute('Type');
        let fourCCValue = null;
        let width = null;
        let height = null;

        representation.id = qualityLevel.Id;
        representation.bandwidth = parseInt(qualityLevel.getAttribute('Bitrate'), 10);
        representation.mimeType = qualityLevel.mimeType;

        width = parseInt(qualityLevel.getAttribute('MaxWidth'), 10);
        height = parseInt(qualityLevel.getAttribute('MaxHeight'), 10);
        if (!isNaN(width)) representation.width = width;
        if (!isNaN(height)) representation.height = height;


        fourCCValue = qualityLevel.getAttribute('FourCC');

        // If FourCC not defined at QualityLevel level, then get it from StreamIndex level
        if (fourCCValue === null || fourCCValue === '') {
            fourCCValue = streamIndex.getAttribute('FourCC');
        }

        // If still not defined (optionnal for audio stream, see https://msdn.microsoft.com/en-us/library/ff728116%28v=vs.95%29.aspx),
        // then we consider the stream is an audio AAC stream
        if (fourCCValue === null || fourCCValue === '') {
            if (type === constants.AUDIO) {
                fourCCValue = 'AAC';
            } else if (type === constants.VIDEO) {
                logger.debug('FourCC is not defined whereas it is required for a QualityLevel element for a StreamIndex of type "video"');
                return null;
            }
        }

        // Check if codec is supported
        if (SUPPORTED_CODECS.indexOf(fourCCValue.toUpperCase()) === -1) {
            // Do not send warning
            logger.warn('Codec not supported: ' + fourCCValue);
            return null;
        }

        // Get codecs value according to FourCC field
        if (fourCCValue === 'H264' || fourCCValue === 'AVC1') {
            representation.codecs = getH264Codec(qualityLevel);
        } else if (fourCCValue.indexOf('AAC') >= 0) {
            representation.codecs = getAACCodec(qualityLevel, fourCCValue);
            representation.audioSamplingRate = parseInt(qualityLevel.getAttribute('SamplingRate'), 10);
            representation.audioChannels = parseInt(qualityLevel.getAttribute('Channels'), 10);
        } else if (fourCCValue.indexOf('TTML') || fourCCValue.indexOf('DFXP')) {
            representation.codecs = constants.STPP;
        }

        representation.codecPrivateData = '' + qualityLevel.getAttribute('CodecPrivateData');
        representation.BaseURL = qualityLevel.BaseURL;

        return representation;
    }

    function getH264Codec(qualityLevel) {
        let codecPrivateData = qualityLevel.getAttribute('CodecPrivateData').toString();
        let nalHeader,
            avcoti;


        // Extract from the CodecPrivateData field the hexadecimal representation of the following
        // three bytes in the sequence parameter set NAL unit.
        // => Find the SPS nal header
        nalHeader = /00000001[0-9]7/.exec(codecPrivateData);
        // => Find the 6 characters after the SPS nalHeader (if it exists)
        avcoti = nalHeader && nalHeader[0] ? (codecPrivateData.substr(codecPrivateData.indexOf(nalHeader[0]) + 10, 6)) : undefined;

        return 'avc1.' + avcoti;
    }

    function getAACCodec(qualityLevel, fourCCValue) {
        const samplingRate = parseInt(qualityLevel.getAttribute('SamplingRate'), 10);
        let codecPrivateData = qualityLevel.getAttribute('CodecPrivateData').toString();
        let objectType = 0;
        let codecPrivateDataHex,
            arr16,
            indexFreq,
            extensionSamplingFrequencyIndex;

        //chrome problem, in implicit AAC HE definition, so when AACH is detected in FourCC
        //set objectType to 5 => strange, it should be 2
        if (fourCCValue === 'AACH') {
            objectType = 0x05;
        }
        //if codecPrivateData is empty, build it :
        if (codecPrivateData === undefined || codecPrivateData === '') {
            objectType = 0x02; //AAC Main Low Complexity => object Type = 2
            indexFreq = samplingFrequencyIndex[samplingRate];
            if (fourCCValue === 'AACH') {
                // 4 bytes :     XXXXX         XXXX          XXXX             XXXX                  XXXXX      XXX   XXXXXXX
                //           ' ObjectType' 'Freq Index' 'Channels value'   'Extens Sampl Freq'  'ObjectType'  'GAS' 'alignment = 0'
                objectType = 0x05; // High Efficiency AAC Profile = object Type = 5 SBR
                codecPrivateData = new Uint8Array(4);
                extensionSamplingFrequencyIndex = samplingFrequencyIndex[samplingRate * 2]; // in HE AAC Extension Sampling frequence
                // equals to SamplingRate*2
                //Freq Index is present for 3 bits in the first byte, last bit is in the second
                codecPrivateData[0] = (objectType << 3) | (indexFreq >> 1);
                codecPrivateData[1] = (indexFreq << 7) | (qualityLevel.Channels << 3) | (extensionSamplingFrequencyIndex >> 1);
                codecPrivateData[2] = (extensionSamplingFrequencyIndex << 7) | (0x02 << 2); // origin object type equals to 2 => AAC Main Low Complexity
                codecPrivateData[3] = 0x0; //alignment bits

                arr16 = new Uint16Array(2);
                arr16[0] = (codecPrivateData[0] << 8) + codecPrivateData[1];
                arr16[1] = (codecPrivateData[2] << 8) + codecPrivateData[3];
                //convert decimal to hex value
                codecPrivateDataHex = arr16[0].toString(16);
                codecPrivateDataHex = arr16[0].toString(16) + arr16[1].toString(16);

            } else {
                // 2 bytes :     XXXXX         XXXX          XXXX              XXX
                //           ' ObjectType' 'Freq Index' 'Channels value'   'GAS = 000'
                codecPrivateData = new Uint8Array(2);
                //Freq Index is present for 3 bits in the first byte, last bit is in the second
                codecPrivateData[0] = (objectType << 3) | (indexFreq >> 1);
                codecPrivateData[1] = (indexFreq << 7) | (parseInt(qualityLevel.getAttribute('Channels'), 10) << 3);
                // put the 2 bytes in an 16 bits array
                arr16 = new Uint16Array(1);
                arr16[0] = (codecPrivateData[0] << 8) + codecPrivateData[1];
                //convert decimal to hex value
                codecPrivateDataHex = arr16[0].toString(16);
            }

            codecPrivateData = '' + codecPrivateDataHex;
            codecPrivateData = codecPrivateData.toUpperCase();
            qualityLevel.setAttribute('CodecPrivateData', codecPrivateData);
        } else if (objectType === 0) {
            objectType = (parseInt(codecPrivateData.substr(0, 2), 16) & 0xF8) >> 3;
        }

        return 'mp4a.40.' + objectType;
    }

    function mapSegmentTemplate(streamIndex, timescale) {
        const segmentTemplate = {};
        let mediaUrl,
            streamIndexTimeScale,
            url;

        url = streamIndex.getAttribute('Url');
        mediaUrl = url ? url.replace('{bitrate}', '$Bandwidth$') : null;
        mediaUrl = mediaUrl ? mediaUrl.replace('{start time}', '$Time$') : null;

        streamIndexTimeScale = streamIndex.getAttribute('TimeScale');
        streamIndexTimeScale = streamIndexTimeScale ? parseFloat(streamIndexTimeScale) : timescale;

        segmentTemplate.media = mediaUrl;
        segmentTemplate.timescale = streamIndexTimeScale;

        segmentTemplate.SegmentTimeline = mapSegmentTimeline(streamIndex, segmentTemplate.timescale);

        return segmentTemplate;
    }

    function mapSegmentTimeline(streamIndex, timescale) {
        const segmentTimeline = {};
        const chunks = streamIndex.getElementsByTagName('c');
        const segments = [];
        let segment,
            prevSegment,
            tManifest,
            i, j, r;
        let duration = 0;

        for (i = 0; i < chunks.length; i++) {
            segment = {};

            // Get time 't' attribute value
            tManifest = chunks[i].getAttribute('t');

            // => segment.tManifest = original timestamp value as a string (for constructing the fragment request url, see DashHandler)
            // => segment.t = number value of timestamp (maybe rounded value, but only for 0.1 microsecond)
            if (tManifest && BigInt(tManifest).greater(BigInt(Number.MAX_SAFE_INTEGER))) {
                segment.tManifest = tManifest;
            }
            segment.t = parseFloat(tManifest);

            // Get duration 'd' attribute value
            segment.d = parseFloat(chunks[i].getAttribute('d'));

            // If 't' not defined for first segment then t=0
            if ((i === 0) && !segment.t) {
                segment.t = 0;
            }

            if (i > 0) {
                prevSegment = segments[segments.length - 1];
                // Update previous segment duration if not defined
                if (!prevSegment.d) {
                    if (prevSegment.tManifest) {
                        prevSegment.d = BigInt(tManifest).subtract(BigInt(prevSegment.tManifest)).toJSNumber();
                    } else {
                        prevSegment.d = segment.t - prevSegment.t;
                    }
                    duration += prevSegment.d;
                }
                // Set segment absolute timestamp if not set in manifest
                if (!segment.t) {
                    if (prevSegment.tManifest) {
                        segment.tManifest = BigInt(prevSegment.tManifest).add(BigInt(prevSegment.d)).toString();
                        segment.t = parseFloat(segment.tManifest);
                    } else {
                        segment.t = prevSegment.t + prevSegment.d;
                    }
                }
            }

            if (segment.d) {
                duration += segment.d;
            }

            // Create new segment
            segments.push(segment);

            // Support for 'r' attribute (i.e. "repeat" as in MPEG-DASH)
            r = parseFloat(chunks[i].getAttribute('r'));
            if (r) {

                for (j = 0; j < (r - 1); j++) {
                    prevSegment = segments[segments.length - 1];
                    segment = {};
                    segment.t = prevSegment.t + prevSegment.d;
                    segment.d = prevSegment.d;
                    if (prevSegment.tManifest) {
                        segment.tManifest = BigInt(prevSegment.tManifest).add(BigInt(prevSegment.d)).toString();
                    }
                    duration += segment.d;
                    segments.push(segment);
                }
            }
        }

        segmentTimeline.S = segments;
        segmentTimeline.S_asArray = segments;
        segmentTimeline.duration = duration / timescale;

        return segmentTimeline;
    }

    function getKIDFromProtectionHeader(protectionHeader) {
        let prHeader,
            wrmHeader,
            xmlReader,
            KID;

        // Get PlayReady header as byte array (base64 decoded)
        prHeader = BASE64.decodeArray(protectionHeader.firstChild.data);

        // Get Right Management header (WRMHEADER) from PlayReady header
        wrmHeader = getWRMHeaderFromPRHeader(prHeader);

        if (wrmHeader) {
            // Convert from multi-byte to unicode
            wrmHeader = new Uint16Array(wrmHeader.buffer);

            // Convert to string
            wrmHeader = String.fromCharCode.apply(null, wrmHeader);

            // Parse <WRMHeader> to get KID field value
            xmlReader = (new DOMParser()).parseFromString(wrmHeader, 'application/xml');
            KID = xmlReader.querySelector('KID').textContent;

            // Get KID (base64 decoded) as byte array
            KID = BASE64.decodeArray(KID);

            // Convert UUID from little-endian to big-endian
            convertUuidEndianness(KID);
        }

        return KID;
    }

    function getWRMHeaderFromPRHeader(prHeader) {
        let length,
            recordCount,
            recordType,
            recordLength,
            recordValue;
        let i = 0;

        // Parse PlayReady header

        // Length - 32 bits (LE format)
        length = (prHeader[i + 3] << 24) + (prHeader[i + 2] << 16) + (prHeader[i + 1] << 8) + prHeader[i]; // eslint-disable-line
        i += 4;

        // Record count - 16 bits (LE format)
        recordCount = (prHeader[i + 1] << 8) + prHeader[i]; // eslint-disable-line
        i += 2;

        // Parse records
        while (i < prHeader.length) {
            // Record type - 16 bits (LE format)
            recordType = (prHeader[i + 1] << 8) + prHeader[i];
            i += 2;

            // Check if Rights Management header (record type = 0x01)
            if (recordType === 0x01) {

                // Record length - 16 bits (LE format)
                recordLength = (prHeader[i + 1] << 8) + prHeader[i];
                i += 2;

                // Record value => contains <WRMHEADER>
                recordValue = new Uint8Array(recordLength);
                recordValue.set(prHeader.subarray(i, i + recordLength));
                return recordValue;
            }
        }

        return null;
    }

    function convertUuidEndianness(uuid) {
        swapBytes(uuid, 0, 3);
        swapBytes(uuid, 1, 2);
        swapBytes(uuid, 4, 5);
        swapBytes(uuid, 6, 7);
    }

    function swapBytes(bytes, pos1, pos2) {
        const temp = bytes[pos1];
        bytes[pos1] = bytes[pos2];
        bytes[pos2] = temp;
    }


    function createPRContentProtection(protectionHeader) {
        let pro = {
            __text: protectionHeader.firstChild.data,
            __prefix: 'mspr'
        };
        return {
            schemeIdUri: 'urn:uuid:9a04f079-9840-4286-ab92-e65be0885f95',
            value: 'com.microsoft.playready',
            pro: pro,
            pro_asArray: pro
        };
    }

    function createWidevineContentProtection(KID) {
        let widevineCP = {
            schemeIdUri: 'urn:uuid:edef8ba9-79d6-4ace-a3c8-27dcd51d21ed',
            value: 'com.widevine.alpha'
        };
        if (!KID)
            return widevineCP;
        // Create Widevine CENC header (Protocol Buffer) with KID value
        const wvCencHeader = new Uint8Array(2 + KID.length);
        wvCencHeader[0] = 0x12;
        wvCencHeader[1] = 0x10;
        wvCencHeader.set(KID, 2);

        // Create a pssh box
        const length = 12 /* box length, type, version and flags */ + 16 /* SystemID */ + 4 /* data length */ + wvCencHeader.length;
        let pssh = new Uint8Array(length);
        let i = 0;

        // Set box length value
        pssh[i++] = (length & 0xFF000000) >> 24;
        pssh[i++] = (length & 0x00FF0000) >> 16;
        pssh[i++] = (length & 0x0000FF00) >> 8;
        pssh[i++] = (length & 0x000000FF);

        // Set type ('pssh'), version (0) and flags (0)
        pssh.set([0x70, 0x73, 0x73, 0x68, 0x00, 0x00, 0x00, 0x00], i);
        i += 8;

        // Set SystemID ('edef8ba9-79d6-4ace-a3c8-27dcd51d21ed')
        pssh.set([0xed, 0xef, 0x8b, 0xa9, 0x79, 0xd6, 0x4a, 0xce, 0xa3, 0xc8, 0x27, 0xdc, 0xd5, 0x1d, 0x21, 0xed], i);
        i += 16;

        // Set data length value
        pssh[i++] = (wvCencHeader.length & 0xFF000000) >> 24;
        pssh[i++] = (wvCencHeader.length & 0x00FF0000) >> 16;
        pssh[i++] = (wvCencHeader.length & 0x0000FF00) >> 8;
        pssh[i++] = (wvCencHeader.length & 0x000000FF);

        // Copy Widevine CENC header
        pssh.set(wvCencHeader, i);

        // Convert to BASE64 string
        pssh = String.fromCharCode.apply(null, pssh);
        pssh = BASE64.encodeASCII(pssh);

        widevineCP.pssh = { __text: pssh };

        return widevineCP;
    }

    function processManifest(xmlDoc) {
        const manifest = {};
        const contentProtections = [];
        const smoothStreamingMedia = xmlDoc.getElementsByTagName('SmoothStreamingMedia')[0];
        const protection = xmlDoc.getElementsByTagName('Protection')[0];
        let protectionHeader = null;
        let period,
            adaptations,
            contentProtection,
            KID,
            timestampOffset,
            startTime,
            segments,
            timescale,
            segmentDuration,
            i, j;

        // Set manifest node properties
        manifest.protocol = 'MSS';
        manifest.profiles = 'urn:mpeg:dash:profile:isoff-live:2011';
        manifest.type = getAttributeAsBoolean(smoothStreamingMedia, 'IsLive') ? 'dynamic' : 'static';
        timescale = smoothStreamingMedia.getAttribute('TimeScale');
        manifest.timescale = timescale ? parseFloat(timescale) : DEFAULT_TIME_SCALE;
        let dvrWindowLength = parseFloat(smoothStreamingMedia.getAttribute('DVRWindowLength'));
        // If the DVRWindowLength field is omitted for a live presentation or set to 0, the DVR window is effectively infinite
        if (manifest.type === 'dynamic' && (dvrWindowLength === 0 || isNaN(dvrWindowLength))) {
            dvrWindowLength = Infinity;
        }
        // Star-over
        if (dvrWindowLength === 0 && getAttributeAsBoolean(smoothStreamingMedia, 'CanSeek')) {
            dvrWindowLength = Infinity;
        }

        if (dvrWindowLength > 0) {
            manifest.timeShiftBufferDepth = dvrWindowLength / manifest.timescale;
        }

        let duration = parseFloat(smoothStreamingMedia.getAttribute('Duration'));
        manifest.mediaPresentationDuration = (duration === 0) ? Infinity : duration / manifest.timescale;
        // By default, set minBufferTime to 2 sec. (but set below according to video segment duration)
        manifest.minBufferTime = 2;
        manifest.ttmlTimeIsRelative = true;

        // Live manifest with Duration = start-over
        if (manifest.type === 'dynamic' && duration > 0) {
            manifest.type = 'static';
            // We set timeShiftBufferDepth to initial duration, to be used by MssFragmentController to update segment timeline
            manifest.timeShiftBufferDepth = duration / manifest.timescale;
            // Duration will be set according to current segment timeline duration (see below)
        }

        if (manifest.type === 'dynamic') {
            manifest.refreshManifestOnSwitchTrack = true; // Refresh manifest when switching tracks
            manifest.doNotUpdateDVRWindowOnBufferUpdated = true; // DVRWindow is update by MssFragmentMoofPocessor based on tfrf boxes
            manifest.ignorePostponeTimePeriod = true; // Never update manifest
            manifest.availabilityStartTime = new Date(null); // Returns 1970
        }

        // Map period node to manifest root node
        manifest.Period = mapPeriod(smoothStreamingMedia, manifest.timescale);
        manifest.Period_asArray = [manifest.Period];

        // Initialize period start time
        period = manifest.Period;
        period.start = 0;

        // Uncomment to test live to static manifests
        // if (manifest.type !== 'static') {
        //     manifest.type = 'static';
        //     manifest.mediaPresentationDuration = manifest.timeShiftBufferDepth;
        //     manifest.timeShiftBufferDepth = null;
        // }

        // ContentProtection node
        if (protection !== undefined) {
            protectionHeader = xmlDoc.getElementsByTagName('ProtectionHeader')[0];

            // Some packagers put newlines into the ProtectionHeader base64 string, which is not good
            // because this cannot be correctly parsed. Let's just filter out any newlines found in there.
            protectionHeader.firstChild.data = protectionHeader.firstChild.data.replace(/\n|\r/g, '');

            // Get KID (in CENC format) from protection header
            KID = getKIDFromProtectionHeader(protectionHeader);

            // Create ContentProtection for PlayReady
            contentProtection = createPRContentProtection(protectionHeader);
            contentProtection['cenc:default_KID'] = KID;
            contentProtections.push(contentProtection);

            // Create ContentProtection for Widevine (as a CENC protection)
            contentProtection = createWidevineContentProtection(KID);
            contentProtection['cenc:default_KID'] = KID;
            contentProtections.push(contentProtection);

            manifest.ContentProtection = contentProtections;
            manifest.ContentProtection_asArray = contentProtections;
        }

        adaptations = period.AdaptationSet_asArray;

        for (i = 0; i < adaptations.length; i += 1) {
            adaptations[i].SegmentTemplate.initialization = '$Bandwidth$';
            // Propagate content protection information into each adaptation
            if (manifest.ContentProtection !== undefined) {
                adaptations[i].ContentProtection = manifest.ContentProtection;
                adaptations[i].ContentProtection_asArray = manifest.ContentProtection_asArray;
            }

            if (adaptations[i].contentType === 'video') {
                // Get video segment duration
                segmentDuration = adaptations[i].SegmentTemplate.SegmentTimeline.S_asArray[0].d / adaptations[i].SegmentTemplate.timescale;
                // Set minBufferTime to one segment duration
                manifest.minBufferTime = segmentDuration;

                if (manifest.type === 'dynamic') {
                    // Match timeShiftBufferDepth to video segment timeline duration
                    if (manifest.timeShiftBufferDepth > 0 &&
                        manifest.timeShiftBufferDepth !== Infinity &&
                        manifest.timeShiftBufferDepth > adaptations[i].SegmentTemplate.SegmentTimeline.duration) {
                        manifest.timeShiftBufferDepth = adaptations[i].SegmentTemplate.SegmentTimeline.duration;
                    }
                }
            }
        }

        // Cap minBufferTime to timeShiftBufferDepth
        manifest.minBufferTime = Math.min(manifest.minBufferTime, (manifest.timeShiftBufferDepth ? manifest.timeShiftBufferDepth : Infinity));

        // In case of live streams:
        // 1- configure player buffering properties according to target live delay
        // 2- adapt live delay and then buffers length in case timeShiftBufferDepth is too small compared to target live delay (see PlaybackController.computeLiveDelay())
        // 3- Set retry attempts and intervals for FragmentInfo requests
        if (manifest.type === 'dynamic') {
            let targetLiveDelay = mediaPlayerModel.getLiveDelay();
            if (!targetLiveDelay) {
                const liveDelayFragmentCount = settings.get().streaming.delay.liveDelayFragmentCount !== null && !isNaN(settings.get().streaming.delay.liveDelayFragmentCount) ? settings.get().streaming.delay.liveDelayFragmentCount : 4;
                targetLiveDelay = segmentDuration * liveDelayFragmentCount;
            }
            let targetDelayCapping = Math.max(manifest.timeShiftBufferDepth - 10/*END_OF_PLAYLIST_PADDING*/, manifest.timeShiftBufferDepth / 2);
            let liveDelay = Math.min(targetDelayCapping, targetLiveDelay);
            // Consider a margin of more than one segment in order to avoid Precondition Failed errors (412), for example if audio and video are not correctly synchronized
            let bufferTime = liveDelay - (segmentDuration * 1.5);

            // Store initial buffer settings
            initialBufferSettings = {
                'streaming': {
                    'buffer': {
                        'stableBufferTime': settings.get().streaming.buffer.stableBufferTime,
                        'bufferTimeAtTopQuality': settings.get().streaming.buffer.bufferTimeAtTopQuality,
                        'bufferTimeAtTopQualityLongForm': settings.get().streaming.buffer.bufferTimeAtTopQualityLongForm
                    },
                    'timeShiftBuffer': {
                        calcFromSegmentTimeline: settings.get().streaming.timeShiftBuffer.calcFromSegmentTimeline
                    },
                    'delay': {
                        'liveDelay': settings.get().streaming.delay.liveDelay
                    }
                }
            };

            settings.update({
                'streaming': {
                    'buffer': {
                        'stableBufferTime': bufferTime,
                        'bufferTimeAtTopQuality': bufferTime,
                        'bufferTimeAtTopQualityLongForm': bufferTime
                    },
                    'timeShiftBuffer': {
                        calcFromSegmentTimeline: true
                    },
                    'delay': {
                        'liveDelay': liveDelay
                    }
                }
            });
        }

        // Delete Content Protection under root manifest node
        delete manifest.ContentProtection;
        delete manifest.ContentProtection_asArray;

        // In case of VOD streams, check if start time is greater than 0
        // Then determine timestamp offset according to higher audio/video start time
        // (use case = live stream delinearization)
        if (manifest.type === 'static') {
            // In case of start-over stream and manifest reloading (due to track switch)
            // we consider previous timestampOffset to keep timelines synchronized
            var prevManifest = manifestModel.getValue();
            if (prevManifest && prevManifest.timestampOffset) {
                timestampOffset = prevManifest.timestampOffset;
            } else {
                for (i = 0; i < adaptations.length; i++) {
                    if (adaptations[i].contentType === constants.AUDIO || adaptations[i].contentType === constants.VIDEO) {
                        segments = adaptations[i].SegmentTemplate.SegmentTimeline.S_asArray;
                        startTime = segments[0].t;
                        if (timestampOffset === undefined) {
                            timestampOffset = startTime;
                        }
                        timestampOffset = Math.min(timestampOffset, startTime);
                        // Correct content duration according to minimum adaptation's segment timeline duration
                        // in order to force <video> element sending 'ended' event
                        manifest.mediaPresentationDuration = Math.min(manifest.mediaPresentationDuration, adaptations[i].SegmentTemplate.SegmentTimeline.duration);
                    }
                }
            }
            if (timestampOffset > 0) {
                // Patch segment templates timestamps and determine period start time (since audio/video should not be aligned to 0)
                manifest.timestampOffset = timestampOffset;
                for (i = 0; i < adaptations.length; i++) {
                    segments = adaptations[i].SegmentTemplate.SegmentTimeline.S_asArray;
                    for (j = 0; j < segments.length; j++) {
                        if (!segments[j].tManifest) {
                            segments[j].tManifest = segments[j].t.toString();
                        }
                        segments[j].t -= timestampOffset;
                    }
                    if (adaptations[i].contentType === constants.AUDIO || adaptations[i].contentType === constants.VIDEO) {
                        period.start = Math.max(segments[0].t, period.start);
                        adaptations[i].SegmentTemplate.presentationTimeOffset = period.start;
                    }
                }
                period.start /= manifest.timescale;
            }
        }

        // Floor the duration to get around precision differences between segments timestamps and MSE buffer timestamps
        // and then avoid 'ended' event not being raised
        manifest.mediaPresentationDuration = Math.floor(manifest.mediaPresentationDuration * 1000) / 1000;
        period.duration = manifest.mediaPresentationDuration;

        return manifest;
    }

    function parseDOM(data) {
        let xmlDoc = null;

        if (window.DOMParser) {
            const parser = new window.DOMParser();

            xmlDoc = parser.parseFromString(data, 'text/xml');
            if (xmlDoc.getElementsByTagName('parsererror').length > 0) {
                throw new Error('parsing the manifest failed');
            }
        }

        return xmlDoc;
    }

    function getMatchers() {
        return null;
    }

    function getIron() {
        return null;
    }

    function internalParse(data) {
        let xmlDoc = null;
        let manifest = null;

        const startTime = window.performance.now();

        // Parse the MSS XML manifest
        xmlDoc = parseDOM(data);

        const xmlParseTime = window.performance.now();

        if (xmlDoc === null) {
            return null;
        }

        // Convert MSS manifest into DASH manifest
        manifest = processManifest(xmlDoc, new Date());

        const mss2dashTime = window.performance.now();

        logger.info('Parsing complete: (xmlParsing: ' + (xmlParseTime - startTime).toPrecision(3) + 'ms, mss2dash: ' + (mss2dashTime - xmlParseTime).toPrecision(3) + 'ms, total: ' + ((mss2dashTime - startTime) / 1000).toPrecision(3) + 's)');

        return manifest;
    }

    function reset() {
        // Restore initial buffer settings
        if (initialBufferSettings) {
            settings.update(initialBufferSettings);
        }
    }

    instance = {
        parse: internalParse,
        getMatchers: getMatchers,
        getIron: getIron,
        reset: reset
    };

    setup();

    return instance;
}

MssParser.__dashjs_factory_name = 'MssParser';
export default dashjs.FactoryMaker.getClassFactory(MssParser); /* jshint ignore:line */
