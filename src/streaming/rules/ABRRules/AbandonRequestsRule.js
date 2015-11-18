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
import SwitchRequest from '../SwitchRequest.js';
import AbrController from '../../controllers/AbrController.js';
import FactoryMaker from '../../../core/FactoryMaker.js';

const GRACE_TIME_THRESHOLD = 500;
const ABANDON_MULTIPLIER = 1.5;

export default FactoryMaker.getClassFactory(AbandonRequestsRule);

function AbandonRequestsRule(config) {

    let log = config.log;

    let instance = {
        execute: execute,
        reset: reset
    };

    setup();

    return instance;

    let fragmentDict;
    let abandonDict;

    function setup() {
        fragmentDict = {};
        abandonDict = {};
    }

    function setFragmentRequestDict(type, id) {
        fragmentDict[type] = fragmentDict[type] || {};
        fragmentDict[type][id] = fragmentDict[type][id] || {};
    }

    //function getAggragateBandwidth(mediaType, concurrentCount){
    //    var tbl = 0,
    //        tet = 0;
    //    for (var key in fragmentDict[mediaType]) {
    //        var obj = fragmentDict[mediaType][key];
    //        if (obj.bytesLoaded < obj.bytesTotal && obj.elapsedTime >= GRACE_TIME_THRESHOLD) { //check if obj is complete or not
    //            tbl += obj.bytesLoaded;
    //            tet += obj.elapsedTime;
    //        }else{
    //            delete fragmentDict[mediaType][key];//delete entries that are complete.
    //        }
    //    }
    //    var measuredBandwidthInKbps = Math.round((tbl*8/tet) * concurrentCount);
    //    return measuredBandwidthInKbps;
    //}

    function execute(context, callback) {
        var now = new Date().getTime();
        var mediaInfo = context.getMediaInfo();
        var mediaType = mediaInfo.type;
        var progressEvent = context.getCurrentValue();
        var representationInfo = context.getTrackInfo();
        var req = progressEvent.data.request;
        var abrController = context.getStreamProcessor().getABRController();
        var fragmentInfo;
        var switchRequest = SwitchRequest.create(SwitchRequest.NO_CHANGE, SwitchRequest.WEAK);

        if (!isNaN(req.index)) {
            setFragmentRequestDict(mediaType, req.index);
            fragmentInfo = fragmentDict[mediaType][req.index];

            if (fragmentInfo === null || req.firstByteDate === null || abandonDict.hasOwnProperty(fragmentInfo.id)) {
                callback(switchRequest);
                return;
            }

            //setup some init info based on first progress event
            if (fragmentInfo.firstByteTime === undefined) {
                fragmentInfo.firstByteTime = req.firstByteDate.getTime();
                fragmentInfo.segmentDuration = req.duration;
                fragmentInfo.bytesTotal = req.bytesTotal;
                fragmentInfo.id = req.index;
                //log("XXX FRAG ID : " ,fragmentInfo.id, " *****************");
            }
            //update info base on subsequent progress events until completed.
            fragmentInfo.bytesLoaded = req.bytesLoaded;
            fragmentInfo.elapsedTime = now - fragmentInfo.firstByteTime;

            if (fragmentInfo.bytesLoaded < fragmentInfo.bytesTotal &&
                fragmentInfo.elapsedTime >= GRACE_TIME_THRESHOLD) {

                fragmentInfo.measuredBandwidthInKbps = Math.round(fragmentInfo.bytesLoaded*8/fragmentInfo.elapsedTime);
                //fragmentInfo.measuredBandwidthInKbps = (concurrentCount > 1) ? getAggragateBandwidth(mediaType, concurrentCount) :  Math.round(fragmentInfo.bytesLoaded*8/fragmentInfo.elapsedTime);
                fragmentInfo.estimatedTimeOfDownload = (fragmentInfo.bytesTotal*8*0.001/fragmentInfo.measuredBandwidthInKbps).toFixed(2);
                //log("XXX","id: ",fragmentInfo.id,  "kbps: ", fragmentInfo.measuredBandwidthInKbps, "etd: ",fragmentInfo.estimatedTimeOfDownload, "et: ", fragmentInfo.elapsedTime/1000);

                if (fragmentInfo.estimatedTimeOfDownload < (fragmentInfo.segmentDuration * ABANDON_MULTIPLIER) || representationInfo.quality === 0) {
                    callback(switchRequest);
                    return;
                }else if (!abandonDict.hasOwnProperty(fragmentInfo.id)) {
                    var newQuality = abrController.getQualityForBitrate(mediaInfo, fragmentInfo.measuredBandwidthInKbps * AbrController.BANDWIDTH_SAFETY);
                    switchRequest = SwitchRequest.create(newQuality, SwitchRequest.STRONG);
                    abandonDict[fragmentInfo.id] = fragmentInfo;
                    log("AbandonRequestsRule ( ", mediaType, "frag id",fragmentInfo.id,") is asking to abandon and switch to quality to ", newQuality, " measured bandwidth was", fragmentInfo.measuredBandwidthInKbps);
                    delete fragmentDict[mediaType][fragmentInfo.id];
                }
            }else if (fragmentInfo.bytesLoaded === fragmentInfo.bytesTotal) {
                delete fragmentDict[mediaType][fragmentInfo.id];
            }
        }

        callback(switchRequest);
    }

    function reset() {
        fragmentDict = {};
        abandonDict = {};
    }
}