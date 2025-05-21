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
import Debug from '../../core/Debug.js';

const WEBVTT = 'WEBVTT';

function VTTParser() {
    const context = this.context;

    let instance,
        logger,
        regExNewLine,
        regExToken,
        regExWhiteSpace,
        regExWhiteSpaceWordBoundary;

    function setup() {
        logger = Debug(context).getInstance().getLogger(instance);
        regExNewLine = /(?:\r\n|\r|\n)/gm;
        regExToken = /-->/;
        regExWhiteSpace = /(^[\s]+|[\s]+$)/g;
        regExWhiteSpaceWordBoundary = /\s\b/g;
    }

    function parse(data) {
        const captionArray = [];
        let len,
            lastStartTime;

        if (!data) {
            return captionArray;
        }

        data = data.split(regExNewLine);
        len = data.length;
        lastStartTime = -1;

        for (let i = 0; i < len; i++) {
            let item = data[i];

            if (item.length > 0 && item !== WEBVTT) {
                if (item.match(regExToken)) {
                    const attributes = parseItemAttributes(item);
                    const cuePoints = attributes.cuePoints;
                    const styles = attributes.styles;
                    const text = getSublines(data, i + 1);
                    const startTime = convertCuePointTimes(cuePoints[0].replace(regExWhiteSpace, ''));
                    const endTime = convertCuePointTimes(cuePoints[1].replace(regExWhiteSpace, ''));

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
                        } else {
                            logger.error('Skipping cue due to empty/malformed cue text');
                        }
                    } else {
                        logger.error('Skipping cue due to incorrect cue timing');
                    }
                }
            }
        }

        return captionArray;
    }

    function convertCuePointTimes(time) {
        const timeArray = time.split(':');
        const len = timeArray.length - 1;

        time = parseInt(timeArray[len - 1], 10) * 60 + parseFloat(timeArray[len]);

        if (len === 2) {
            time += parseInt(timeArray[0], 10) * 3600;
        }

        return time;
    }

    function parseItemAttributes(data) {
        const vttCuePoints = data.split(regExToken);
        const arr = vttCuePoints[1].split(regExWhiteSpaceWordBoundary);
        arr.shift(); //remove first array index it is empty...
        vttCuePoints[1] = arr[0];
        arr.shift();
        return { cuePoints: vttCuePoints, styles: getCaptionStyles(arr) };
    }

    function getCaptionStyles(arr) {
        const styleObject = {};
        arr.forEach(function (element) {
            const parts = element.split(':');

            if (parts.length > 1) {
                const [settingName, settingValue] = parts;

                switch (settingName) {
                    case 'align':
                    case 'A':
                        styleObject.align = settingValue;
                        break;
                    case 'line':
                    case 'L':
                        const [line, lineAlign] = settingValue.split(',');
                        const isPercentage = line.endsWith('%');

                        styleObject.line = line === 'auto' ? line : parseInt(line, 10);
                        if (isPercentage) {
                            styleObject.snapToLines = false;
                        }
                        if (lineAlign) {
                            styleObject.lineAlign = lineAlign;
                        }
                        break;
                    case 'position':
                    case 'P':
                        const [position, positionAlign] = settingValue.split(',');
                        styleObject.position = parseInt(position, 10);
                        if (positionAlign) {
                            styleObject.positionAlign = positionAlign;
                        }
                        break;
                    case 'size':
                    case 'S':
                        styleObject.size = settingValue;
                        break;
                }
            }
        });

        return styleObject;
    }

    /*
    * VTT can have multiple lines to display per cuepoint.
    */
    function getSublines(data, idx) {
        let i = idx;

        let subline = '';
        let lineData = '';
        let lineCount;

        while (data[i] !== '' && i < data.length) {
            i++;
        }

        lineCount = i - idx;
        if (lineCount > 1) {
            for (let j = 0; j < lineCount; j++) {
                lineData = data[(idx + j)];
                if (!lineData.match(regExToken)) {
                    subline += lineData;
                    if (j !== lineCount - 1) {
                        subline += '\n';
                    }
                } else {
                    // caption text should not have '-->' in it
                    subline = '';
                    break;
                }
            }
        } else {
            lineData = data[idx];
            if (!lineData.match(regExToken)) {
                subline = lineData;
            }
        }
        return subline;
    }

    instance = {
        parse: parse,
        getCaptionStyles
    };

    setup();
    return instance;
}

VTTParser.__dashjs_factory_name = 'VTTParser';
export default FactoryMaker.getSingletonFactory(VTTParser);
