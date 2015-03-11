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

function intTobitArray(integer,integerSizeInBit)
{
    var bitArray = [];
    for(var i = 0; i<integerSizeInBit ; i++){
        bitArray.push((integer&Math.pow(2,i))>0);
    }
    return bitArray;
}

Dash.dependencies.FragmentExtensions = function () {
    "use strict";

var TFHD_BASE_DATA_OFFSET_PRESENT_FLAG_INDEX =0,
    TFHD_SAMPLE_DESCRIPTION_INDEX_PRESENT_FLAG_INDEX=1,
    TFHD_DEFAULT_SAMPLE_DURATION_PRESENT_FLAG_INDEX=3,
    TFHD_DEFAULT_SAMPLE_SIZE_PRESENT_FLAG_INDEX=4,
    TFHD_DEFAULT_SAMPLE_FLAGS_PRESENT_FLAG_INDEX=5,
    TRUN_DATA_OFFSET_PRESENT_FLAG_INDEX=0,
    TRUN_FIRST_SAMPLE_FLAGS_PRESENT_FLAG_INDEX=2,
    TRUN_SAMPLE_DURATION_PRESENT_FLAG_INDEX=8,
    TRUN_SAMPLE_SIZE_PRESENT_FLAG_INDEX=9,
    TRUN_SAMPLE_FLAGS_PRESENT_FLAG_INDEX=10,
    TRUN_SAMPLE_COMPOSITION_TIME_OFFSET_PRESENT_FLAG_INDEX=11;

    var parseTFDT = function (ab) {
            var d = new DataView(ab),
                pos = 0,
                base_media_decode_time,
                version,
                size,
                type,
                i,
                c;

            while (type !== "tfdt" && pos < d.byteLength) {
                size = d.getUint32(pos); // subtract 8 for including the size and type
                pos += 4;

                type = "";
                for (i = 0; i < 4; i += 1) {
                    c = d.getInt8(pos);
                    type += String.fromCharCode(c);
                    pos += 1;
                }

                if (type !== "moof" && type !== "traf" && type !== "tfdt") {
                    pos += size - 8;
                }
            }

            if (pos === d.byteLength) {
                throw "Error finding live offset.";
            }

            version = d.getUint8(pos);

            if (version === 0) {
                pos += 4;
                base_media_decode_time = d.getUint32(pos, false);
            } else {
                pos += size - 16;
                base_media_decode_time = utils.Math.to64BitNumber(d.getUint32(pos + 4, false), d.getUint32(pos, false));
            }

            return {
                'version' : version,
                'base_media_decode_time' : base_media_decode_time
            };
        },

        parseSIDX = function (ab) {
            var d = new DataView(ab),
                pos = 0,
                version,
                timescale,
                earliest_presentation_time,
                i,
                type,
                size,
                charCode;

            while (type !== "sidx" && pos < d.byteLength) {
                size = d.getUint32(pos); // subtract 8 for including the size and type
                pos += 4;

                type = "";
                for (i = 0; i < 4; i += 1) {
                    charCode = d.getInt8(pos);
                    type += String.fromCharCode(charCode);
                    pos += 1;
                }

                if (type !== "moof" && type !== "traf" && type !== "sidx") {
                    pos += size - 8;
                } else if (type === "sidx") {
                    // reset the position to the beginning of the box...
                    // if we do not reset the position, the evaluation
                    // of sidxEnd to ab.byteLength will fail.
                    pos -= 8;
                }
            }

            version = d.getUint8(pos + 8);
            pos += 12;

            // skipped reference_ID(32)
            timescale = d.getUint32(pos + 4, false);
            pos += 8;

            if (version === 0) {
                earliest_presentation_time = d.getUint32(pos, false);
            } else {
                earliest_presentation_time = utils.Math.to64BitNumber(d.getUint32(pos + 4, false), d.getUint32(pos, false));
            }

            return {
                'earliestPresentationTime' : earliest_presentation_time,
                'timescale' : timescale
            };
        },

        parseTFHD = function (ab) {
            var d = new DataView(ab),
                pos = 0,
                size,
                type,
                flags,
                flagsBits,
                tfhd,
                i,
                c;

            while (type !== "tfhd" && pos < d.byteLength) {
                size = d.getUint32(pos); // subtract 8 for including the size and type
                pos += 4;

                type = "";
                for (i = 0; i < 4; i += 1) {
                    c = d.getInt8(pos);
                    type += String.fromCharCode(c);
                    pos += 1;
                }

                if (type !== "moof" && type !== "traf" &&type !== "tfhd") {
                    pos += size - 8;
                }
            }

            if (pos === d.byteLength) {
                throw "Error finding live offset.";
            }

            tfhd = {
            baseDataOffset:0,
            descriptionIndex:0,
            sampleDuration:0,
            sampleSize:0,
            defaultSampleFlags:0,
            };
            pos += 1; //version
            pos += 2; //2 useless flag bytes
            flags=d.getUint8(pos);
            pos += 1;
            flagsBits=intTobitArray(flags,8);
            pos += 4;//track Id
            if(flagsBits[TFHD_BASE_DATA_OFFSET_PRESENT_FLAG_INDEX]){
                tfhd.baseDataOffset=utils.Math.to64BitNumber(d.getUint32(pos + 4, false), d.getUint32(pos, false));
                pos += 8;
            }
            if(flagsBits[TFHD_SAMPLE_DESCRIPTION_INDEX_PRESENT_FLAG_INDEX]){
                tfhd.descriptionIndex=d.getUint32(pos);
                pos += 4;
            }
            if(flagsBits[TFHD_DEFAULT_SAMPLE_DURATION_PRESENT_FLAG_INDEX]){
                tfhd.sampleDuration=d.getUint32(pos);
                pos += 4;
            }
            if(flagsBits[TFHD_DEFAULT_SAMPLE_SIZE_PRESENT_FLAG_INDEX]){
                tfhd.sampleSize=d.getUint32(pos);
                pos += 4;
            }
            if(flagsBits[TFHD_DEFAULT_SAMPLE_FLAGS_PRESENT_FLAG_INDEX]){
                tfhd.defaultSampleFlags=d.getUint32(pos);
                pos += 4;
            }

            return tfhd;
        },
        getMediaTimescaleFromMoov = function (ab) {
            var d = new DataView(ab),
                pos = 0,
                version,
                size,
                type,
                i,
                c;

            while (type !== "mdhd" && pos < d.byteLength) {
                size = d.getUint32(pos); // subtract 8 for including the size and type
                pos += 4;

                type = "";
                for (i = 0; i < 4; i += 1) {
                    c = d.getInt8(pos);
                    type += String.fromCharCode(c);
                    pos += 1;
                }

                if (type !== "moov" && type !== "trak" && type !== "mdia" && type !== "mdhd") {
                    pos += size - 8;
                }
            }

            if (pos === d.byteLength) {
                throw "Error finding live offset.";
            }
            version = d.getUint8(pos);
            pos += 12;
            if(version==1){
                pos += 8;
            }

            return d.getUint32(pos, false);
        },

        getSamplesInfo = function (ab) {

            var d = new DataView(ab),
                pos = 0,
                size,
                type,
                sampleDuration,
                sampleCompostionTimeOffset,
                sampleCount,
                sampleSize,
                sampleDts,
                sampleList,
                flags,
                flagsBits,
                i,
                c,moofPosition,
                tfhd,
                tfdt,
                dataOffset;
                
            tfhd= parseTFHD(ab);
            tfdt= parseTFDT(ab);


            while (type !== "trun" && pos < d.byteLength) {
                size = d.getUint32(pos); // subtract 8 for including the size and type
                pos += 4;

                type = "";
                for (i = 0; i < 4; i += 1) {
                    c = d.getInt8(pos);
                    type += String.fromCharCode(c);
                    pos += 1;
                }

                if (type !== "moof" && type !== "traf" && type !== "trun") {
                    pos += size - 8;
                }
                
                if(type == "moof"){
                    moofPosition=pos-8;
                }
            }

            if (pos === d.byteLength) {
                throw "Error finding live offset.";
            }
    
            pos += 1; //version
            pos += 1; // useless flag byte
            flags=d.getUint16(pos); //flag
            pos += 2;
            flagsBits=intTobitArray(flags,16);
            sampleCount = d.getUint32(pos);
            pos += 4;
            
            sampleDts= tfdt.base_media_decode_time;
            
            if(flagsBits[TRUN_DATA_OFFSET_PRESENT_FLAG_INDEX]){
                dataOffset=d.getUint32(pos)+tfhd.baseDataOffset;
                pos += 4;
            }
            else{
                dataOffset=tfhd.baseDataOffset;
            }
            if(flagsBits[TRUN_FIRST_SAMPLE_FLAGS_PRESENT_FLAG_INDEX]){
                pos += 4;
            }

            
            sampleList=[];
            for(i=0;i<sampleCount;i++){
                if(flagsBits[TRUN_SAMPLE_DURATION_PRESENT_FLAG_INDEX]){
                    sampleDuration=d.getUint32(pos);
                    pos += 4;
                }
                else{
                    sampleDuration=tfhd.sampleDuration;
                }

                if(flagsBits[TRUN_SAMPLE_SIZE_PRESENT_FLAG_INDEX]){
                    sampleSize=d.getUint32(pos);
                    pos += 4;
                }
                else{
                    sampleSize=tfhd.sampleSize;
                }
                if(flagsBits[TRUN_SAMPLE_FLAGS_PRESENT_FLAG_INDEX]){
                    pos += 4;
                }

                if(flagsBits[TRUN_SAMPLE_COMPOSITION_TIME_OFFSET_PRESENT_FLAG_INDEX]){
                    sampleCompostionTimeOffset=d.getUint32(pos);
                    pos += 4;
                }
                else{
                    sampleCompostionTimeOffset=0;
                }
                sampleList.push({'dts' : sampleDts,
                                 'cts' : (sampleDts+sampleCompostionTimeOffset),
                                 'duration' :sampleDuration,
                                 'offset':moofPosition+dataOffset,
                                 'size' :sampleSize});
                dataOffset+=sampleSize;
                sampleDts+=sampleDuration;
            }
            return sampleList;
        },
        

        loadFragment = function (media) {
            var self = this,
                request = new XMLHttpRequest(),
                url = media,
                loaded = false,
                errorStr = "Error loading fragment: " + url,
                error = new MediaPlayer.vo.Error(null, errorStr, null),
                parsed;

            request.onloadend = function () {
                if (!loaded) {
                    errorStr = "Error loading fragment: " + url;
                    self.notify(Dash.dependencies.FragmentExtensions.eventList.ENAME_FRAGMENT_LOADING_COMPLETED, {fragment: null}, error);
                }
            };

            request.onload = function () {
                loaded = true;
                parsed = parseTFDT(request.response);
                self.notify(Dash.dependencies.FragmentExtensions.eventList.ENAME_FRAGMENT_LOADING_COMPLETED, {fragment: parsed});
            };

            request.onerror = function () {
                errorStr = "Error loading fragment: " + url;
                self.notify(Dash.dependencies.FragmentExtensions.eventList.ENAME_FRAGMENT_LOADING_COMPLETED, {fragment: null}, error);
            };

            request.responseType = "arraybuffer";
            request.open("GET", url);
            request.send(null);
        };

    return {
        log : undefined,
        notify: undefined,
        subscribe: undefined,
        unsubscribe: undefined,

        loadFragment : loadFragment,
        parseTFDT : parseTFDT,
        parseSIDX : parseSIDX,
        getSamplesInfo:getSamplesInfo,
        getMediaTimescaleFromMoov:getMediaTimescaleFromMoov
    };
};

Dash.dependencies.FragmentExtensions.prototype = {
    constructor: Dash.dependencies.FragmentExtensions
};

Dash.dependencies.FragmentExtensions.eventList = {
    ENAME_FRAGMENT_LOADING_COMPLETED: "fragmentLoadingCompleted"
};