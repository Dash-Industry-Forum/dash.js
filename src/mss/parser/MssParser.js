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

import FactoryMaker from '../../core/FactoryMaker';
import Debug from '../../core/Debug';
import ErrorHandler from '../../streaming/utils/ErrorHandler';
import BASE64 from '../../../externals/base64';

function MssParser(config) {

    const context = this.context;
    const log = Debug(context).getInstance().log;
    const errorHandler = ErrorHandler(context).getInstance();

    const TIME_SCALE_100_NANOSECOND_UNIT = 10000000.0;
    const SUPPORTED_CODECS = ['AAC', 'AACL', 'AVC1', 'H264', 'TTML', 'DFXP'];
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
        mediaPlayerModel;


    function setup() {
        mediaPlayerModel = config.mediaPlayerModel;
    }

    function mapPeriod(smoothStreamingMedia) {
        let period = {};
        let streams,
            adaptation;

        period.duration = (parseFloat(smoothStreamingMedia.getAttribute('Duration')) === 0) ? Infinity : parseFloat(smoothStreamingMedia.getAttribute('Duration')) / TIME_SCALE_100_NANOSECOND_UNIT;

        // For each StreamIndex node, create an AdaptationSet element
        period.AdaptationSet_asArray = [];
        streams = smoothStreamingMedia.getElementsByTagName('StreamIndex');
        for (let i = 0; i < streams.length; i++) {
            adaptation = mapAdaptationSet(streams[i]);
            if (adaptation !== null) {
                period.AdaptationSet_asArray.push(adaptation);
            }
        }

        if (period.AdaptationSet_asArray.length > 0) {
            period.AdaptationSet = (period.AdaptationSet_asArray.length > 1) ? period.AdaptationSet_asArray : period.AdaptationSet_asArray[0];
        }

        return period;
    }

    function mapAdaptationSet(streamIndex) {

        let adaptationSet = {};
        let representations = [];
        let segmentTemplate = {};
        let qualityLevels,
            representation,
            segments,
            range,
            i;

        adaptationSet.id = streamIndex.getAttribute('Name');
        adaptationSet.contentType = streamIndex.getAttribute('Type');
        adaptationSet.lang = streamIndex.getAttribute('Language') || 'und';
        adaptationSet.mimeType = mimeTypeMap[adaptationSet.contentType];
        adaptationSet.subType = streamIndex.getAttribute('Subtype');
        adaptationSet.maxWidth = streamIndex.getAttribute('MaxWidth');
        adaptationSet.maxHeight = streamIndex.getAttribute('MaxHeight');

        // Create a SegmentTemplate with a SegmentTimeline
        segmentTemplate = mapSegmentTemplate(streamIndex);

        qualityLevels = streamIndex.getElementsByTagName('QualityLevel');
        // For each QualityLevel node, create a Representation element
        for (i = 0; i < qualityLevels.length; i++) {
            // Propagate BaseURL and mimeType
            qualityLevels[i].BaseURL = adaptationSet.BaseURL;
            qualityLevels[i].mimeType = adaptationSet.mimeType;

            // Set quality level id
            qualityLevels[i].Id = adaptationSet.id + '_' + qualityLevels[i].getAttribute('Index');

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

        segments = segmentTemplate.SegmentTimeline.S_asArray;

        range = {
            start: segments[0].t / segmentTemplate.timescale,
            end: (segments[segments.length - 1].t + segments[segments.length - 1].d) / segmentTemplate.timescale
        };

        return adaptationSet;
    }

    function mapRepresentation(qualityLevel, streamIndex) {

        let representation = {};
        let fourCCValue = null;

        representation.id = qualityLevel.Id;
        representation.bandwidth = parseInt(qualityLevel.getAttribute('Bitrate'), 10);
        representation.mimeType = qualityLevel.mimeType;
        representation.width = parseInt(qualityLevel.getAttribute('MaxWidth'), 10);
        representation.height = parseInt(qualityLevel.getAttribute('MaxHeight'), 10);

        fourCCValue = qualityLevel.getAttribute('FourCC');

        // If FourCC not defined at QualityLevel level, then get it from StreamIndex level
        if (fourCCValue === null) {
            fourCCValue = streamIndex.getAttribute('FourCC');
        }

        // If still not defined (optionnal for audio stream, see https://msdn.microsoft.com/en-us/library/ff728116%28v=vs.95%29.aspx),
        // then we consider the stream is an audio AAC stream
        if (fourCCValue === null) {
            fourCCValue = 'AAC';
        }

        // Check if codec is supported
        if (SUPPORTED_CODECS.indexOf(fourCCValue.toUpperCase()) === -1) {
            // Do not send warning
            //this.errHandler.sendWarning(MediaPlayer.dependencies.ErrorHandler.prototype.MEDIA_ERR_CODEC_UNSUPPORTED, "Codec not supported", {codec: fourCCValue});
            log('[MssParser] Codec not supported: ' + fourCCValue);
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
            representation.codecs = 'stpp';
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
        let objectType = 0;
        let codecPrivateData = qualityLevel.getAttribute('CodecPrivateData').toString();
        let samplingRate = parseInt(qualityLevel.getAttribute('SamplingRate'), 10);
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

    function mapSegmentTemplate(streamIndex) {

        let segmentTemplate = {};
        let mediaUrl;

        mediaUrl = streamIndex.getAttribute('Url').replace('{bitrate}', '$Bandwidth$');
        mediaUrl = mediaUrl.replace('{start time}', '$Time$');

        segmentTemplate.media = mediaUrl;
        segmentTemplate.timescale = TIME_SCALE_100_NANOSECOND_UNIT;

        segmentTemplate.SegmentTimeline = mapSegmentTimeline(streamIndex);

        return segmentTemplate;
    }

    function mapSegmentTimeline(streamIndex) {

        let segmentTimeline = {};
        let chunks = streamIndex.getElementsByTagName('c');
        let segments = [];
        let i,
            t, d;

        for (i = 0; i < chunks.length; i++) {
            // Get time and duration attributes
            t = parseFloat(chunks[i].getAttribute('t'));
            d = parseFloat(chunks[i].getAttribute('d'));

            if ((i === 0) && !t) {
                t = 0;
            }

            if (i > 0) {
                // Update previous segment duration if not defined
                if (!segments[segments.length - 1].d) {
                    segments[segments.length - 1].d = t - segments[segments.length - 1].t;
                }
                // Set segment absolute timestamp if not set
                if (!t) {
                    t = segments[segments.length - 1].t + segments[segments.length - 1].d;
                }
            }

            // Create new segment
            segments.push({
                d: d,
                t: t
            });

        }

        segmentTimeline.S = segments;
        segmentTimeline.S_asArray = segments;

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
        length = (prHeader[i + 3] << 24) + (prHeader[i + 2] << 16) + (prHeader[i + 1] << 8) + prHeader[i];
        i += 4;

        // Record count - 16 bits (LE format)
        recordCount = (prHeader[i + 1] << 8) + prHeader[i];
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
        let temp = bytes[pos1];
        bytes[pos1] = bytes[pos2];
        bytes[pos2] = temp;
    }


    function createPRContentProtection(protectionHeader) {

        let contentProtection = {};
        let pro;

        pro = {
            __text: protectionHeader.firstChild.data,
            __prefix: 'mspr'
        };

        contentProtection.schemeIdUri = 'urn:uuid:9a04f079-9840-4286-ab92-e65be0885f95';
        contentProtection.value = 'com.microsoft.playready';
        contentProtection.pro = pro;
        contentProtection.pro_asArray = pro;

        return contentProtection;
    }

    function processManifest(xmlDoc, manifestLoadedTime) {
        let manifest = {};
        let contentProtections = [];
        let smoothStreamingMedia = xmlDoc.getElementsByTagName('SmoothStreamingMedia')[0];
        let protection = xmlDoc.getElementsByTagName('Protection')[0];
        let protectionHeader = null;
        let period,
            adaptations,
            contentProtection,
            KID,
            realDuration,
            firstSegment,
            lastSegment,
            adaptationTimeOffset,
            i;

        // Set manifest node properties
        manifest.protocol = 'MSS';
        manifest.profiles = 'urn:mpeg:dash:profile:isoff-live:2011';
        manifest.type = smoothStreamingMedia.getAttribute('IsLive') === 'TRUE' ? 'dynamic' : 'static';
        manifest.timeShiftBufferDepth = parseFloat(smoothStreamingMedia.getAttribute('DVRWindowLength')) / TIME_SCALE_100_NANOSECOND_UNIT;
        manifest.mediaPresentationDuration = (parseFloat(smoothStreamingMedia.getAttribute('Duration')) === 0) ? Infinity : parseFloat(smoothStreamingMedia.getAttribute('Duration')) / TIME_SCALE_100_NANOSECOND_UNIT;
        manifest.minBufferTime = mediaPlayerModel.getStableBufferTime();

        // In case of live streams, set availabilityStartTime property according to DVRWindowLength
        if (manifest.type === 'dynamic') {
            manifest.availabilityStartTime = new Date(manifestLoadedTime.getTime() - (manifest.timeShiftBufferDepth * 1000));
        }

        // Map period node to manifest root node
        manifest.Period = mapPeriod(smoothStreamingMedia);
        manifest.Period_asArray = [manifest.Period];

        // Initialize period start time
        period = manifest.Period;
        period.start = 0;

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

            manifest.ContentProtection = contentProtections;
            manifest.ContentProtection_asArray = contentProtections;
        }

        adaptations = period.AdaptationSet_asArray;
        for (i = 0; i < adaptations.length; i += 1) {
            // In case of VOD streams, check if start time is greater than 0.
            // Therefore, set period start time to the higher adaptation start time
            if (manifest.type === 'static' && adaptations[i].contentType !== 'text') {
                firstSegment = adaptations[i].SegmentTemplate.SegmentTimeline.S_asArray[0];
                lastSegment = adaptations[i].SegmentTemplate.SegmentTimeline.S_asArray[adaptations[i].SegmentTemplate.SegmentTimeline.S_asArray.length - 1];
                adaptations[i].SegmentTemplate.initialization = '$Bandwidth$';
                adaptationTimeOffset = parseFloat(firstSegment.t) / TIME_SCALE_100_NANOSECOND_UNIT;
                period.start = (period.start === 0) ? adaptationTimeOffset : Math.max(period.start, adaptationTimeOffset);
                //get last segment start time, add the duration of this last segment
                realDuration = parseFloat(((lastSegment.t + lastSegment.d) / TIME_SCALE_100_NANOSECOND_UNIT).toFixed(3));
                //detect difference between announced duration (in MSS manifest) and real duration => in any case, we want that the video element sends the ended event.
                //set the smallest value between all the adaptations
                if (!isNaN(realDuration) && realDuration < manifest.mediaPresentationDuration) {
                    manifest.mediaPresentationDuration = realDuration;
                    period.duration = realDuration;
                }
            } else {
                adaptations[i].SegmentTemplate.initialization = '$Bandwidth$';
            }

            // Propagate content protection information into each adaptation
            if (manifest.ContentProtection !== undefined) {
                adaptations[i].ContentProtection = manifest.ContentProtection;
                adaptations[i].ContentProtection_asArray = manifest.ContentProtection_asArray;
            }
        }

        // Delete Content Protection under root manifest node
        delete manifest.ContentProtection;
        delete manifest.ContentProtection_asArray;

        return manifest;
    }

    function parseDOM(data) {

        let xmlDoc = null;

        if (window.DOMParser) {
            try {
                let parser = new window.DOMParser();

                xmlDoc = parser.parseFromString(data, 'text/xml');
                if (xmlDoc.getElementsByTagName('parsererror').length > 0) {
                    throw new Error('Error parsing XML');
                }
            } catch (e) {
                errorHandler.manifestError('parsing the manifest failed', 'parse', data, e);
                xmlDoc = null;
            }
        }

        return xmlDoc;
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

        log('Parsing complete: (xmlParsing: ' + (xmlParseTime - startTime).toPrecision(3) + 'ms, mss2dash: ' + (mss2dashTime - xmlParseTime).toPrecision(3) + 'ms, total: ' + ((mss2dashTime - startTime) / 1000).toPrecision(3) + 's)');

        return manifest;
    }

    instance = {
        parse: internalParse
    };

    setup();

    return instance;
}

MssParser.__dashjs_factory_name = 'MssParser';
export default FactoryMaker.getClassFactory(MssParser);