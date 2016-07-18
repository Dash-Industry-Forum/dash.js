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

function VTTParser() {
    let context = this.context;
    let log = Debug(context).getInstance().log;

    let instance,
        regExNewLine,
        regExToken,
        regExWhiteSpace,
        regExWhiteSpaceWordBoundary;

    function setup() {
        regExNewLine = /(?:\r\n|\r|\n)/gm;
        regExToken = /-->/;
        regExWhiteSpace = /(^[\s]+|[\s]+$)/g;
        regExWhiteSpaceWordBoundary = /\s\b/g;
    }

    function parse(data) {
        var captionArray = [];
        var len,
            lastStartTime;

        data = data.split( regExNewLine );
        len = data.length;
        lastStartTime = -1;

        for (var i = 0 ; i < len; i++)
        {
            var item = data[i];

            if (item.length > 0 && item !== 'WEBVTT')
            {
                if (item.match(regExToken))
                {
                    var attributes = parseItemAttributes(item);
                    var cuePoints = attributes.cuePoints;
                    var styles = attributes.styles;
                    var text = getSublines(data, i + 1);
                    var startTime = convertCuePointTimes(cuePoints[0].replace(regExWhiteSpace, ''));
                    var endTime = convertCuePointTimes(cuePoints[1].replace(regExWhiteSpace, ''));

                    if ((!isNaN(startTime) && !isNaN(endTime)) && startTime >= lastStartTime && endTime > startTime) {
                        if (text !== '') {
                            lastStartTime = startTime;
                            //TODO Make VO external so other parsers can use.
                            captionArray.push({
                                start: startTime,
                                end: endTime,
                                data: text,
                                styles: styles
                            });
                        }
                        else {
                            log('Skipping cue due to empty/malformed cue text');
                        }
                    }
                    else {
                        log('Skipping cue due to incorrect cue timing');
                    }
                }
            }
        }

        return captionArray;
    }

    function convertCuePointTimes(time) {
        var timeArray = time.split(':');
        var len = timeArray.length - 1;

        time = parseInt( timeArray[len - 1], 10 ) * 60 + parseFloat( timeArray[len]);

        if ( len === 2 ) {
            time += parseInt( timeArray[0], 10 ) * 3600;
        }

        return time;
    }

    function parseItemAttributes(data) {
        var vttCuePoints = data.split(regExToken);
        var arr = vttCuePoints[1].split(regExWhiteSpaceWordBoundary);
        arr.shift(); //remove first array index it is empty...
        vttCuePoints[1] = arr[0];
        arr.shift();
        return {cuePoints: vttCuePoints, styles: getCaptionStyles(arr)};
    }

    function getCaptionStyles(arr) {
        var styleObject = {};
        arr.forEach(function (element) {
            if (element.split(/:/).length > 1) {
                var val = element.split(/:/)[1];
                if (val && val.search(/%/) != -1) {
                    val = parseInt(val.replace(/%/, ''), 10);
                }
                if (element.match(/align/) || element.match(/A/)) {
                    styleObject.align = val;
                }
                if (element.match(/line/) || element.match(/L/) ) {
                    styleObject.line = val;
                }
                if (element.match(/position/) || element.match(/P/) ) {
                    styleObject.position = val;
                }
                if (element.match(/size/) || element.match(/S/)) {
                    styleObject.size = val;
                }
            }
        });

        return styleObject;
    }

    /*
    * VTT can have multiple lines to display per cuepoint.
    */
    function getSublines(data, idx) {
        var i = idx;

        var subline = '';
        var lineData = '';
        var lineCount;

        while (data[i] !== '' && i < data.length) {
            i++;
        }

        lineCount = i - idx;
        if (lineCount > 1) {
            for (var j = 0; j < lineCount; j++) {
                lineData = data[(idx + j)];
                if (!lineData.match(regExToken)) {
                    subline += lineData;
                    if (j !== lineCount - 1) {
                        subline += '\n';
                    }
                }
                else {
                    // caption text should not have '-->' in it
                    subline = '';
                    break;
                }
            }
        } else {
            lineData = data[idx];
            if (!lineData.match(regExToken))
                subline = lineData;
        }
        return decodeURI(subline);
    }

    instance = {
        parse: parse
    };

    setup();
    return instance;
}
VTTParser.__dashjs_factory_name = 'VTTParser';
export default FactoryMaker.getSingletonFactory(VTTParser);
