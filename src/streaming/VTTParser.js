/*
 * The copyright in this software is being made available under the BSD License, included below. This software may be subject to other third party and contributor rights, including patent rights, and no such rights are granted under this license.
 *
 * Copyright (c) 2013, Akamai Technologies
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met:
 * •  Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer.
 * •  Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or other materials provided with the distribution.
 * •  Neither the name of the Akamai Technologies nor the names of its contributors may be used to endorse or promote products derived from this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS “AS IS” AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */
MediaPlayer.utils.VTTParser = function () {
    "use strict";

    /**
     *
     * @type {RegExp}
     */
    var regExNewLine = /(?:\r\n|\r|\n)/gm,
        regExToken = /-->/,
        regExWhiteSpace = /(^[\s]+|[\s]+$)/g,
        regExWhiteSpaceWordBoundry = /\s\b/g,


        convertCuePointTimes = function(time) {
            var timeArray = time.split( ":"),
                len = timeArray.length - 1;

            time = parseInt( timeArray[len-1], 10 ) * 60 + parseFloat( timeArray[len]);

            if ( len === 2 ) {
                time += parseInt( timeArray[0], 10 ) * 3600;
            }

            return time;
        },

        parseItemAttributes = function (data) {
            var vttCuePoints = data.split(regExToken);
            var arr = vttCuePoints[1].split(regExWhiteSpaceWordBoundry);
            arr.shift(); //remove first array index it is empty...
            vttCuePoints[1] = arr[0];
            arr.shift();
            return {cuePoints:vttCuePoints, styles:getCaptionStyles(arr)};
        },

        getCaptionStyles = function (arr) {

            var styleObject = {};
            arr.forEach(function (element) {
                if (element.match(/align/) || element.match(/A/)){
                    styleObject.align = element.split(/:/)[1];
                }
                if (element.match(/line/) || element.match(/L/) ){
                    styleObject.line = element.split(/:/)[1].replace(/%/, "");
                }
                if (element.match(/position/) || element.match(/P/) ){
                    styleObject.position = element.split(/:/)[1].replace(/%/, "");
                }
                if (element.match(/size/) || element.match(/S/)){
                    styleObject.size = element.split(/:/)[1].replace(/%/, "");
                }
            });

            return styleObject;
        },

        /**
         * VTT can have multiple lines to display per cuepoint.
         * */
        getSublines = function(data, idx){
            var lineCount,
                i = idx,
                subline = "";

            while(data[i] !== "" && i < data.length) {
                i++;
            }

            lineCount = i - idx;
            if (lineCount > 1){
                for(var j = 0; j < lineCount; j++){
                    subline += data[(idx + j)];
                    if (j !== lineCount-1) {
                        subline += "\n";
                    }
                }
            } else {
                subline = data[idx];
            }

            return decodeURI(subline);
        };



    return {

        parse: function (data)
        {
            var captionArray = [],
                len;

            data = data.split( regExNewLine );
            len = data.length;

            for (var i = 0 ; i < len; i++)
            {
                var item = data[i];

                if (item.length > 0 && item !== "WEBVTT")
                {
                    if (item.match(regExToken))
                    {
                        var attributes = parseItemAttributes(item),
                            cuePoints = attributes.cuePoints,
                            styles = attributes.styles,
                            text = getSublines(data, i+1);

                        //TODO Make VO external so other parsers can use.
                        captionArray.push({
                            start:convertCuePointTimes(cuePoints[0].replace(regExWhiteSpace, '')),
                            end:convertCuePointTimes(cuePoints[1].replace(regExWhiteSpace, '')),
                            data:text,
                            styles:styles
                        });
                    }
                }
            }

            return captionArray;
        }
    };
};
