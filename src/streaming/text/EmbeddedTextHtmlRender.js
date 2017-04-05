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

function EmbeddedTextHtmlRender() {

    let captionId = 0;
    let instance;

    /* HTML Rendering functions */
    function checkIndent(chars) {
        var line = '';

        for (var c = 0; c < chars.length; ++c) {
            var uc = chars[c];
            line += uc.uchar;
        }

        var l = line.length;
        var ll = line.replace(/^\s+/,'').length;
        return l - ll;
    }

    function getRegionProperties(region) {
        return 'left: ' + (region.x * 3.125) + '%; top: ' + (region.y1 * 6.66) + '%; width: ' + (100 - (region.x * 3.125)) + '%; height: ' + (Math.max((region.y2 - 1) - region.y1, 1) * 6.66) + '%; align-items: flex-start; overflow: visible; -webkit-writing-mode: horizontal-tb;';
    }

    function createRGB(color) {
        if (color === 'red') {
            return 'rgb(255, 0, 0)';
        } else if (color === 'green') {
            return 'rgb(0, 255, 0)';
        } else if (color === 'blue') {
            return 'rgb(0, 0, 255)';
        } else if (color === 'cyan') {
            return 'rgb(0, 255, 255)';
        } else if (color === 'magenta') {
            return 'rgb(255, 0, 255)';
        } else if (color === 'yellow') {
            return 'rgb(255, 255, 0)';
        } else if (color === 'white') {
            return 'rgb(255, 255, 255)';
        } else if (color === 'black') {
            return 'rgb(0, 0, 0)';
        }
        return color;
    }

    function getStyle(videoElement, style) {
        var fontSize = videoElement.videoHeight / 15.0;
        if (style) {
            return 'font-size: ' + fontSize + 'px; font-family: Menlo, Consolas, \'Cutive Mono\', monospace; color: ' + ((style.foreground) ? createRGB(style.foreground) : 'rgb(255, 255, 255)') + '; font-style: ' + (style.italics ? 'italic' : 'normal') + '; text-decoration: ' + (style.underline ? 'underline' : 'none') + '; white-space: pre; background-color: ' + ((style.background) ? createRGB(style.background) : 'transparent') + ';';
        } else {
            return 'font-size: ' + fontSize + 'px; font-family: Menlo, Consolas, \'Cutive Mono\', monospace; justify-content: flex-start; text-align: left; color: rgb(255, 255, 255); font-style: normal; white-space: pre; line-height: normal; font-weight: normal; text-decoration: none; width: 100%; display: flex;';
        }
    }

    function ltrim(s) {
        var trimmed = s.replace(/^\s+/g, '');
        return trimmed;
    }
    function rtrim(s) {
        var trimmed = s.replace(/\s+$/g, '');
        return trimmed;
    }


    function createHTMLCaptionsFromScreen(videoElement, startTime, endTime, captionScreen) {

        let currRegion = null;
        let existingRegion = null;
        let lastRowHasText = false;
        let lastRowIndentL = -1;
        let currP = { start: startTime, end: endTime, spans: [] };
        let currentStyle = 'style_cea608_white_black';
        let seenRegions = { };
        let styleStates = { };
        let regions = [];
        let r, s;

        for (r = 0; r < 15; ++r) {
            let row = captionScreen.rows[r];
            let line = '';
            let prevPenState = null;

            if (false === row.isEmpty()) {
                /* Row is not empty */

                /* Get indentation of this row */
                let rowIndent = checkIndent(row.chars);

                /* Create a new region is there is none */
                if (currRegion === null) {
                    currRegion = { x: rowIndent, y1: r, y2: (r + 1), p: [] };
                }

                /* Check if indentation has changed and we had text of last row */
                if ((rowIndent !== lastRowIndentL) && lastRowHasText) {
                    currRegion.p.push(currP);
                    currP = { start: startTime, end: endTime, spans: [] };
                    currRegion.y2 = r;
                    currRegion.name = 'region_' + currRegion.x + '_' + currRegion.y1 + '_' + currRegion.y2;
                    if (false === seenRegions.hasOwnProperty(currRegion.name)) {
                        regions.push(currRegion);
                        seenRegions[currRegion.name] = currRegion;
                    } else {
                        existingRegion = seenRegions[currRegion.name];
                        existingRegion.p.contat(currRegion.p);
                    }

                    currRegion = { x: rowIndent, y1: r, y2: (r + 1), p: [] };
                }

                for (let c = 0; c < row.chars.length; ++c) {
                    let uc = row.chars[c];
                    let currPenState = uc.penState;
                    if ((prevPenState === null) || (!currPenState.equals(prevPenState))) {
                        if (line.trim().length > 0) {
                            currP.spans.push({ name: currentStyle, line: line, row: r });
                            line = '';
                        }

                        let currPenStateString = 'style_cea608_' + currPenState.foreground + '_' + currPenState.background;
                        if (currPenState.underline) {
                            currPenStateString += '_underline';
                        }
                        if (currPenState.italics) {
                            currPenStateString += '_italics';
                        }

                        if (!styleStates.hasOwnProperty(currPenStateString)) {
                            styleStates[currPenStateString] = JSON.parse(JSON.stringify(currPenState));
                        }

                        prevPenState = currPenState;

                        currentStyle = currPenStateString;
                    }

                    line += uc.uchar;
                }

                if (line.trim().length > 0) {
                    currP.spans.push({ name: currentStyle, line: line, row: r });
                }

                lastRowHasText = true;
                lastRowIndentL = rowIndent;
            } else {
                /* Row is empty */
                lastRowHasText = false;
                lastRowIndentL = -1;

                if (currRegion) {
                    currRegion.p.push(currP);
                    currP = { start: startTime, end: endTime, spans: [] };
                    currRegion.y2 = r;
                    currRegion.name = 'region_' + currRegion.x + '_' + currRegion.y1 + '_' + currRegion.y2;
                    if (false === seenRegions.hasOwnProperty(currRegion.name)) {
                        regions.push(currRegion);
                        seenRegions[currRegion.name] = currRegion;
                    } else {
                        existingRegion = seenRegions[currRegion.name];
                        existingRegion.p.contat(currRegion.p);
                    }

                    currRegion = null;
                }

            }
        }

        if (currRegion) {
            currRegion.p.push(currP);
            currRegion.y2 = r + 1;
            currRegion.name = 'region_' + currRegion.x + '_' + currRegion.y1 + '_' + currRegion.y2;
            if (false === seenRegions.hasOwnProperty(currRegion.name)) {
                regions.push(currRegion);
                seenRegions[currRegion.name] = currRegion;
            } else {
                existingRegion = seenRegions[currRegion.name];
                existingRegion.p.contat(currRegion.p);
            }

            currRegion = null;
        }

        //log(styleStates);
        //log(regions);

        let captionsArray = [];

        /* Loop thru regions */
        for (r = 0; r < regions.length; ++r) {
            let region = regions[r];

            let cueID = 'sub_cea608_' + (captionId++);
            let finalDiv = document.createElement('div');
            finalDiv.id = cueID;
            let cueRegionProperties = getRegionProperties(region);
            finalDiv.style.cssText = 'position: absolute; margin: 0; display: flex; box-sizing: border-box; pointer-events: none;' + cueRegionProperties;

            let bodyDiv = document.createElement('div');
            bodyDiv.className = 'paragraph bodyStyle';
            bodyDiv.style.cssText = getStyle(videoElement);

            let cueUniWrapper = document.createElement('div');
            cueUniWrapper.className = 'cueUniWrapper';
            cueUniWrapper.style.cssText = 'unicode-bidi: normal; direction: ltr;';

            for (let p = 0; p < region.p.length; ++p) {
                let ptag = region.p[p];
                let lastSpanRow = 0;
                for (s = 0; s < ptag.spans.length; ++s) {
                    let span = ptag.spans[s];
                    if (span.line.length > 0) {
                        if ((s !== 0) && lastSpanRow != span.row) {
                            let brElement = document.createElement('br');
                            brElement.className = 'lineBreak';
                            cueUniWrapper.appendChild(brElement);
                        }
                        let sameRow = false;
                        if (lastSpanRow === span.row) {
                            sameRow = true;
                        }
                        lastSpanRow = span.row;
                        let spanStyle = styleStates[span.name];
                        let spanElement = document.createElement('span');
                        spanElement.className = 'spanPadding ' + span.name + ' customSpanColor';
                        spanElement.style.cssText = getStyle(videoElement, spanStyle);
                        if ((s !== 0) && sameRow) {
                            if (s === ptag.spans.length - 1) {
                                spanElement.textContent = rtrim(span.line);
                            } else {
                                spanElement.textContent = span.line;
                            }
                        } else {
                            if (s === 0) {
                                if (ptag.spans.length > 1) {
                                    /* Check if next text is on same row */
                                    if (span.row === ptag.spans[1].row) {
                                        /* Next element on same row, trim start */
                                        spanElement.textContent = ltrim(span.line);
                                    } else {
                                        /* Different rows, trim */
                                        spanElement.textContent = span.line.trim();
                                    }
                                } else {
                                    spanElement.textContent = span.line.trim();
                                }
                            } else {
                                spanElement.textContent = span.line.trim();
                            }
                        }
                        cueUniWrapper.appendChild(spanElement);
                    }
                }
            }

            bodyDiv.appendChild(cueUniWrapper);

            finalDiv.appendChild(bodyDiv);

            let fontSize = { 'bodyStyle': ['%', 90] };
            for (s in styleStates) {
                if (styleStates.hasOwnProperty(s)) {
                    fontSize[s] = ['%', 90];
                }
            }

            captionsArray.push({ type: 'html',
                                start: startTime,
                                end: endTime,
                                cueHTMLElement: finalDiv,
                                cueID: cueID,
                                cellResolution: [32, 15],
                                isFromCEA608: true,
                                regions: regions,
                                regionID: region.name,
                                videoHeight: videoElement.videoHeight,
                                videoWidth: videoElement.videoWidth,
                                fontSize: fontSize,
                                lineHeight: {},
                                linePadding: {}
                               });
        }
        return captionsArray;
    }

    instance = {
        createHTMLCaptionsFromScreen: createHTMLCaptionsFromScreen
    };
    return instance;
}

EmbeddedTextHtmlRender.__dashjs_factory_name = 'EmbeddedTextHtmlRender';
export default FactoryMaker.getSingletonFactory(EmbeddedTextHtmlRender);
