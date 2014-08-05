/*
 * The copyright in this software is being made available under the BSD License, included below. This software may be subject to other third party and contributor rights, including patent rights, and no such rights are granted under this license.
 *
 * Copyright (c) 2014, Akamai Technologies
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met:
 * •  Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer.
 * •  Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or other materials provided with the distribution.
 * •  Neither the name of the Digital Primates nor the names of its contributors may be used to endorse or promote products derived from this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS “AS IS” AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */
MediaPlayer.models.URIQueryAndFragmentModel = function () {
    "use strict";

    var URIFragmentDataVO = new MediaPlayer.vo.URIFragmentData(),
        URIQueryData = [],

        parseURI = function (uri) {

            var URIFragmentData = [],
                testQuery = new RegExp(/[?]/),
                testFragment = new RegExp(/[#]/),
                isQuery = testQuery.test(uri),
                isFragment = testFragment.test(uri),
                mappedArr;

            function reduceArray(previousValue, currentValue, index, array) {
                var arr =  array[0].split(/[=]/);
                array.push({key:arr[0], value:arr[1]});
                array.shift();
                return array;
            }

            function mapArray(currentValue, index, array) {
                if (index > 0)
                {
                    if (isQuery && URIQueryData.length === 0) {
                        URIQueryData = array[index].split(/[&]/);
                    } else if (isFragment) {
                        URIFragmentData = array[index].split(/[&]/);
                    }
                }

                return array;
            }

            mappedArr = uri.split(/[?#]/).map(mapArray);

            if (URIQueryData.length > 0) {
                URIQueryData = URIQueryData.reduce(reduceArray, null);
            }

            if (URIFragmentData.length > 0) {
                URIFragmentData = URIFragmentData.reduce(reduceArray, null);
                URIFragmentData.forEach(function (object) {
                    URIFragmentDataVO[object.key] = object.value;
                });
            }

            return uri;
        };

    return {
        parseURI:parseURI,
        getURIFragmentData:URIFragmentDataVO,
        getURIQueryData:URIQueryData
    };
};

MediaPlayer.models.URIQueryAndFragmentModel.prototype = {
    constructor: MediaPlayer.models.URIQueryAndFragmentModel
};
