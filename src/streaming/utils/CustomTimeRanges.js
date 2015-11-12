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
import FactoryMaker from '../../core/FactoryMaker.js';

export default FactoryMaker.getClassFactory(CustomTimeRanges);

function CustomTimeRanges(/*config*/) {

    let instance = {
        customTimeRangeArray: customTimeRangeArray,
        length: length,
        add: add,
        clear: clear,
        remove: remove,
        mergeRanges: mergeRanges,
        start: start,
        end: end
    };

    setup();

    return instance;

    let customTimeRangeArray,
        length;

    function setup(){
        customTimeRangeArray = [];
        length = 0;
    }

    function add(start,end){
        var i=0;

        for(i = 0; (i < customTimeRangeArray.length) && (start > customTimeRangeArray[i].start); i++);

        customTimeRangeArray.splice(i, 0, {start:start, end:end});

        for(i = 0; i < customTimeRangeArray.length - 1; i++ ){
            if(mergeRanges(i,i+1)){
                i--;
            }
        }
        length = customTimeRangeArray.length;
    }

    function clear(){
        customTimeRangeArray = [];
        length = 0;
    }

    function remove(start,end){
        for(var i = 0; i < customTimeRangeArray.length; i++){
            if(start <= customTimeRangeArray[i].start && end >= customTimeRangeArray[i].end) {
                //      |--------------Range i-------|
                //|---------------Range to remove ---------------|
                //    or
                //|--------------Range i-------|
                //|--------------Range to remove ---------------|
                //    or
                //                 |--------------Range i-------|
                //|--------------Range to remove ---------------|
                customTimeRangeArray.splice(i,1);
                i--;

            }else if(start > customTimeRangeArray[i].start && end < customTimeRangeArray[i].end) {
                //|-----------------Range i----------------|
                //        |-------Range to remove -----|
                customTimeRangeArray.splice(i+1, 0, {start:end, end:customTimeRangeArray[i].end});
                customTimeRangeArray[i].end=start;
                break;
            }else if( start > customTimeRangeArray[i].start && start<customTimeRangeArray[i].end) {
                //|-----------Range i----------|
                //                    |---------Range to remove --------|
                //    or
                //|-----------------Range i----------------|
                //            |-------Range to remove -----|
                customTimeRangeArray[i].end=start;
            }else if( end > customTimeRangeArray[i].start && end<customTimeRangeArray[i].end) {
                //                     |-----------Range i----------|
                //|---------Range to remove --------|
                //            or
                //|-----------------Range i----------------|
                //|-------Range to remove -----|
                customTimeRangeArray[i].start = end;
            }
        }

        length = customTimeRangeArray.length;
    }

    function mergeRanges(rangeIndex1,rangeIndex2) {
        var range1=customTimeRangeArray[rangeIndex1];
        var range2=customTimeRangeArray[rangeIndex2];

        if (range1.start <=  range2.start && range2.start <= range1.end && range1.end <= range2.end) {
            //|-----------Range1----------|
            //                    |-----------Range2----------|
            range1.end=range2.end;
            customTimeRangeArray.splice(rangeIndex2,1);
            return true;

        } else if (range2.start <= range1.start && range1.start <= range2.end && range2.end <= range1.end) {
            //                |-----------Range1----------|
            //|-----------Range2----------|
            range1.start=range2.start;
            customTimeRangeArray.splice(rangeIndex2,1);
            return true;
        } else if (range2.start <= range1.start && range1.start <= range2.end && range1.end <= range2.end) {
            //      |--------Range1-------|
            //|---------------Range2--------------|
            customTimeRangeArray.splice(rangeIndex1,1);
            return true;
        } else if (range1.start <= range2.start && range2.start <= range1.end && range2.end <= range1.end) {
            //|-----------------Range1--------------|
            //        |-----------Range2----------|
            customTimeRangeArray.splice(rangeIndex2,1);
            return true;
        }
        return false;
    }

    function start(index) {
        return customTimeRangeArray[index].start;
    }

    function end(index) {
        return customTimeRangeArray[index].end;
    }
}