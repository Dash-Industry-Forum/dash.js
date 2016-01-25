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
import FactoryMaker from '../core/FactoryMaker.js';
import X2JS from '../../externals/xml2json.js';

const SECONDS_IN_HOUR = 60 * 60; // Expression of an hour in seconds
const SECONDS_IN_MIN = 60; // Expression of a minute in seconds

function TTMLParser() {

    //let context = this.context;

    /*
     * This TTML parser follows "EBU-TT-D SUBTITLING DISTRIBUTION FORMAT - tech3380" spec - https://tech.ebu.ch/docs/tech/tech3380.pdf.
     * */
    let instance,
        timingRegex,
        ttml, // contains the whole ttml document received
        ttmlStyling, // contains the styling information from the document
        ttmlLayout, // contains the positioning information from the document
        fontSize,
        lineHeight,
        linePadding,
        defaultLayoutProperties,
        defaultStyleProperties,
        fontFamilies,
        textAlign,
        multiRowAlign,
        wrapOption,
        unicodeBidi,
        displayAlign,
        writingMode,
        videoModel;

    function setConfig(config) {
        if (!config) return;

        if (config.videoModel) {
            videoModel = config.videoModel;
        }
    }

    /**
     * Parse the raw data and process it to return the HTML element representing the cue.
     * Return the region to be processed and controlled (hide/show) by the caption controller.
     * @param data: raw data received from the TextSourceBuffer
     **/

    function parse(data) {
        var type;
        var converter = new X2JS([], '', false);

        // Parse the TTML in a JSON object.
        ttml = converter.xml_str2json(data);

        if (!ttml) {
            throw 'TTML document could not be parsed';
        }

        if (videoModel.getTTMLRenderingDiv()) {
            type = 'html';
        }

        // Get the namespace if there is one defined in the JSON object.
        var ttNS = getNamespacePrefix(ttml, 'http://www.w3.org/ns/ttml');

        // Remove the namespace before each node if it exists:
        if (ttNS) {
            removeNamespacePrefix(ttml, ttNS);
        }

        // Extract styling and layout from the document.
        ttmlLayout = ttml.tt.head.layout.region_asArray;
        ttmlStyling = ttml.tt.head.styling.style_asArray;

        // Check if the document is conform to the specification.
        if (!passStructuralConstraints()) {
            var errorMsg = 'TTML document has incorrect structure';
            throw errorMsg;
        }

        // Extract the cellResolution information
        var cellResolution = getCellResolution();

        // Recover the video width and height displayed by the player.
        var videoWidth = videoModel.getElement().clientWidth;
        var videoHeight = videoModel.getElement().clientHeight;

        // Compute the CellResolution unit in order to process properties using sizing (fontSize, linePadding, etc).
        var cellUnit = [videoWidth / cellResolution[0], videoHeight / cellResolution[1]];
        defaultStyleProperties['font-size'] = cellUnit[1] + 'px;';

        var regions = [];
        for (var i = 0; i < ttmlLayout.length; i++) {
            regions.push(processRegion(JSON.parse(JSON.stringify(ttmlLayout[i])), cellUnit));
        }

        // Get the namespace prefixe.
        var nsttp = getNamespacePrefix(ttml.tt, 'http://www.w3.org/ns/ttml#parameter');

        // Set the framerate.
        if (ttml.tt.hasOwnProperty(nsttp + ':frameRate')) {
            ttml.tt.frameRate = parseInt(ttml.tt[nsttp + ':frameRate'], 10);
        }
        var captionArray = [];
        // Extract the div
        var divs = ttml.tt.body_asArray[0].__children;

        divs.forEach(function (div) {
            var cues = div.div.p_asArray;

            // Check if cues is not empty or undefined.
            if (!cues || cues.length === 0) {
                var errorMsg = 'TTML document does not contain any cues';
                throw errorMsg;
            }

            /*** Parsing of every cue.
             *
             * cues: List of the cues found in the ttml parsing.
             *       We iterate on this list.
             * cue: Every cue is parsed individually and creates an HTML element with its style and children.
             *
             * pElements: all the nodes that can be found in the paragraph.
             *
             * ***/

            // Caption array is the final result return containing all the cues' information.
            var pStartTime;
            var pEndTime;
            var spanStartTime;
            var spanEndTime;
            cues.forEach(function (cue) {

                // Obtain the start and end time of the cue.
                if (cue.hasOwnProperty('begin') && cue.hasOwnProperty('end')) {
                    pStartTime = parseTimings(cue.begin);
                    pEndTime   = parseTimings(cue.end);
                } else if (cue.span.hasOwnProperty('begin') && cue.span.hasOwnProperty('end')) {
                    spanStartTime = parseTimings(cue.span.begin);
                    spanEndTime   = parseTimings(cue.span.end);
                } else {
                    errorMsg = 'TTML document has incorrect timing value';
                    throw errorMsg;
                }

                if (cue['smpte:backgroundImage'] !== undefined) {
                    var images = ttml.tt.head.metadata.image_asArray;
                    for (var j = 0; j < images.length; j++) {
                        if (('#' + images[j]['xml:id']) == cue['smpte:backgroundImage']) {
                            captionArray.push({
                                start: spanStartTime || pStartTime,
                                end: spanEndTime || pEndTime,
                                id: images[j]['xml:id'],
                                data: 'data:image/' + images[j].imagetype.toLowerCase() + ';base64, ' + images[j].__text,
                                type: 'image'
                            });
                        }
                    }
                } else if (type === 'html') {
                    lineHeight  = {};
                    linePadding = {};
                    fontSize    = {};
                    var cueID = '';
                    if (cue.hasOwnProperty('id') || cue.hasOwnProperty('xml:id')) {
                        cueID = cue['xml:id'] || cue.id;
                    }
                    // Error if timing is not specified.
                    // TODO: check with the specification what is allowed.
                    if ((isNaN(pStartTime) || isNaN(pEndTime)) && (isNaN(spanStartTime) || isNaN(spanEndTime))) {
                        errorMsg = 'TTML document has incorrect timing value';
                        throw errorMsg;
                    }

                    /**
                     * Find the region defined for the cue.
                     */
                    // properties to be put in the "captionRegion" HTML element.
                    var cueRegionProperties = constructCueRegion(cue, div.div, cellUnit);

                    /**
                     * Find the style defined for the cue.
                     */
                    // properties to be put in the "paragraph" HTML element.
                    var cueStyleProperties = constructCueStyle(cue, cellUnit);

                    /**
                     * /!\ Create the cue HTML Element containing the whole cue.
                     */
                    var styleIDs       = cueStyleProperties[1];
                    cueStyleProperties = cueStyleProperties[0];

                    // Final cue HTML element.
                    var cueParagraph       = document.createElement('div');
                    cueParagraph.className = styleIDs;

                    // Stock the element in the subtitle (in p) in an array (in case there are only one value).
                    var pElements = cue.__children;

                    // Create an wrapper containing the cue information about unicodeBidi and direction
                    // as they need to be defined on at this level.
                    // We append to the wrapper the cue itself.
                    var cueDirUniWrapper       = constructCue(pElements, cellUnit);
                    cueDirUniWrapper.className = 'cueDirUniWrapper';

                    // If the style defines these two properties, we place them in cueContainer
                    // and delete them from the cue style so it is not added afterwards to the final cue.
                    if (arrayContains('unicode-bidi', cueStyleProperties)) {
                        cueDirUniWrapper.style.cssText += getPropertyFromArray('unicode-bidi', cueStyleProperties);
                        deletePropertyFromArray('unicode-bidi', cueStyleProperties);
                    }
                    if (arrayContains('direction', cueStyleProperties)) {
                        cueDirUniWrapper.style.cssText += getPropertyFromArray('direction', cueStyleProperties);
                        deletePropertyFromArray('direction', cueStyleProperties);
                    }

                    // Apply the linePadding property if it is specifyied in the cue style.
                    if (arrayContains('padding-left', cueStyleProperties) && arrayContains('padding-right', cueStyleProperties)) {
                        cueDirUniWrapper.innerHTML = applyLinePadding(cueDirUniWrapper, cueStyleProperties);
                    }

                    /**
                     * Clean and set the style and region for the cue to be returned.
                     */

                    // Remove the line padding property from being added at the "paragraph" element level.
                    if (arrayContains('padding-left', cueStyleProperties) && arrayContains('padding-right', cueStyleProperties)) {
                        deletePropertyFromArray('padding-left', cueStyleProperties);
                        deletePropertyFromArray('padding-right', cueStyleProperties);
                    }

                    // Remove the ID of the region from being added at the "paragraph" element level.
                    var regionID = '';
                    if (arrayContains('regionID', cueRegionProperties)) {
                        var wholeRegionID = getPropertyFromArray('regionID', cueRegionProperties);
                        regionID          = wholeRegionID.slice(wholeRegionID.indexOf(':') + 1, wholeRegionID.length - 1);
                    }

                    // We link the p style to the finale cueParagraph element.
                    if (cueStyleProperties) {
                        cueParagraph.style.cssText = cueStyleProperties.join(' ') + 'display:flex;';
                    }
                    // We define the CSS style for the cue region.
                    if (cueRegionProperties) {
                        cueRegionProperties = cueRegionProperties.join(' ');
                    }

                    // We then place the cue wrapper inside the paragraph element.
                    cueParagraph.appendChild(cueDirUniWrapper);

                    // Final cue.
                    var finalCue = document.createElement('div');
                    finalCue.appendChild(cueParagraph);
                    finalCue.id = 'subtitle_' + cueID;
                    finalCue.style.cssText = 'position: absolute; margin: 0; display: flex; box-sizing: border-box; pointer-events: none;' + cueRegionProperties;

                    if (Object.keys(fontSize).length === 0) {
                        fontSize.defaultFontSize = '100';
                    }

                    // We add all the cue information in captionArray.
                    captionArray.push({
                        start: spanStartTime || pStartTime,
                        end: spanEndTime || pEndTime,
                        type: 'html',
                        cueHTMLElement: finalCue,
                        regions: regions,
                        regionID: regionID,
                        cueID: cueID,
                        videoHeight: videoHeight,
                        videoWidth: videoWidth,
                        cellResolution: cellResolution,
                        fontSize: fontSize || {
                            defaultFontSize: '100'
                        },
                        lineHeight: lineHeight,
                        linePadding: linePadding
                    });

                } else {
                    var text = '';
                    var textElements = cue.__children;
                    if (textElements.length) {
                        textElements.forEach(function (el) {
                            if (el.hasOwnProperty('span')) {
                                var spanElements = el.span.__children;
                                spanElements.forEach(function (spanEl) {
                                    // If metadata is present, do not process.
                                    if (spanElements.hasOwnProperty('metadata')) {
                                        return;
                                    }
                                    // If the element is a string
                                    if (spanEl.hasOwnProperty('#text')) {
                                        text += spanEl['#text'].replace(/[\r\n]+/gm, ' ').trim();
                                        // If the element is a 'br' tag
                                    } else if ('br' in spanEl) {
                                        // Create a br element.
                                        text += '\n';
                                    }
                                });
                            } else if (el.hasOwnProperty('br')) {
                                text += '\n';
                            } else {
                                text += el['#text'].replace(/[\r\n]+/gm, ' ').trim();
                            }
                        });
                    }

                    captionArray.push({
                        start: spanStartTime || pStartTime,
                        end: spanEndTime || pEndTime,
                        data:   text,
                        type:   'text'
                    });

                }
            });
        });

        return captionArray;
    }

    function setup() {
        /*
         * This TTML parser follows "EBU-TT-D SUBTITLING DISTRIBUTION FORMAT - tech3380" spec - https://tech.ebu.ch/docs/tech/tech3380.pdf.
         * */
        timingRegex = /^([0-9][0-9]+):([0-5][0-9]):([0-5][0-9])|(60)(\.([0-9])+)?$/; // Regex defining the time
        fontSize = {};
        lineHeight = {};
        linePadding = {};
        defaultLayoutProperties = {
            'top': '85%;',
            'left': '5%;',
            'width': '90%;',
            'height': '10%;',
            'align-items': 'flex-start;',
            'overflow': 'visible;',
            '-ms-writing-mode': 'lr-tb, horizontal-tb;;',
            '-webkit-writing-mode': 'horizontal-tb;',
            '-moz-writing-mode': 'horizontal-tb;',
            'writing-mode': 'horizontal-tb;'
        };
        defaultStyleProperties = {
            'color': 'rgb(255,255,255);',
            'direction': 'ltr;',
            'font-family': 'monospace, sans-serif;',
            'font-style': 'normal;',
            'line-height': 'normal;',
            'font-weight': 'normal;',
            'text-align': 'start;',
            'justify-content': 'flex-start;',
            'text-decoration': 'none;',
            'unicode-bidi': 'normal;',
            'white-space': 'normal;',
            'width': '100%;'
        };
        fontFamilies = {
            monospace: 'font-family: monospace;',
            sansSerif: 'font-family: sans-serif;',
            serif: 'font-family: serif;',
            monospaceSansSerif: 'font-family: monospace, sans-serif;',
            monospaceSerif: 'font-family: monospace, serif;',
            proportionalSansSerif: 'font-family: Arial;',
            proportionalSerif: 'font-family: Times New Roman;',
            'default': 'font-family: monospace, sans-serif;'
        };
        textAlign = {
            right: ['justify-content: flex-end;', 'text-align: right;'],
            start: ['justify-content: flex-start;', 'text-align: start;'],
            center: ['justify-content: center;', 'text-align: center;'],
            end: ['justify-content: flex-end;', 'text-align: end;'],
            left: ['justify-content: flex-start;', 'text-align: left;']
        };
        multiRowAlign = {
            start: 'text-align: start;',
            center: 'text-align: center;',
            end: 'text-align: end;',
            auto: ''
        };
        wrapOption = {
            wrap: 'white-space: normal;',
            noWrap: 'white-space: nowrap;'
        };
        unicodeBidi = {
            normal: 'unicode-bidi: normal;',
            embed: 'unicode-bidi: embed;',
            bidiOverride: 'unicode-bidi: bidi-override;'
        };
        displayAlign = {
            before: 'align-items: flex-start;',
            center: 'align-items: center;',
            after: 'align-items: flex-end;'
        };
        writingMode = {
            lrtb: '-webkit-writing-mode: horizontal-tb;' +
            'writing-mode: horizontal-tb;',
            rltb: '-webkit-writing-mode: horizontal-tb;' +
            'writing-mode: horizontal-tb;' +
            'direction: rtl;' +
            'unicode-bidi: bidi-override;',
            tbrl: '-webkit-writing-mode: vertical-rl;' +
            'writing-mode: vertical-rl;' +
            '-webkit-text-orientation: upright;' +
            'text-orientation: upright;',
            tblr: '-webkit-writing-mode: vertical-lr;' +
            'writing-mode: vertical-lr;' +
            '-webkit-text-orientation: upright;' +
            'text-orientation: upright;',
            lr: '-webkit-writing-mode: horizontal-tb;' +
            'writing-mode: horizontal-tb;',
            rl: '-webkit-writing-mode: horizontal-tb;' +
            'writing-mode: horizontal-tb;' +
            'direction: rtl;',
            tb: '-webkit-writing-mode: vertical-rl;' +
            'writing-mode: vertical-rl;' +
            '-webkit-text-orientation: upright;' +
            'text-orientation: upright;'
        };
    }

    function parseTimings(timingStr) {
        // Test if the time provided by the caption is valid.
        var test = timingRegex.test(timingStr);
        var timeParts,
            parsedTime,
            frameRate;

        if (!test) {
            // Return NaN so it will throw an exception at internalParse if the time is incorrect.
            return NaN;
        }

        timeParts = timingStr.split(':');

        // Process the timings by decomposing it and converting it in numbers.
        parsedTime = (parseFloat(timeParts[0]) * SECONDS_IN_HOUR +
        parseFloat(timeParts[1]) * SECONDS_IN_MIN +
        parseFloat(timeParts[2]));

        // In case a frameRate is provided, we adjust the parsed time.
        if (timeParts[3]) {
            frameRate = ttml.tt.frameRate;
            if (frameRate && !isNaN(frameRate)) {
                parsedTime += parseFloat(timeParts[3]) / frameRate;
            } else {
                return NaN;
            }
        }
        return parsedTime;
    }

    function passStructuralConstraints() {
        // Check if the ttml document provide all the necessary elements.
        var hasTt = ttml.hasOwnProperty('tt');
        var hasHead = hasTt ? ttml.tt.hasOwnProperty('head') : false;
        var hasLayout = hasHead ? ttml.tt.head.hasOwnProperty('layout') : false;
        var hasStyling = hasHead ? ttml.tt.head.hasOwnProperty('styling') : false;
        var hasBody = hasTt ? ttml.tt.hasOwnProperty('body') : false;

        // Check if the document contains all the nececessary information
        return (hasTt && hasHead && hasLayout && hasStyling && hasBody);
    }

    function getNamespacePrefix(json, ns) {
        // Obtain the namespace prefix.
        var r = Object.keys(json)
            .filter(function (k) {
                return (k.split(':')[0] === 'xmlns' || k.split(':')[1] === 'xmlns') && json[k] === ns;
            }).map(function (k) {
                return k.split(':')[2] || k.split(':')[1];
            });
        if (r.length != 1) {
            return null;
        }
        return r[0];
    }

    function removeNamespacePrefix(json, nsPrefix) {
        for (var key in json) {
            if (json.hasOwnProperty(key)) {
                if ((typeof json[key] === 'object' || json[key] instanceof Object) && !Array.isArray(json[key])) {
                    removeNamespacePrefix(json[key], nsPrefix);
                } else if (Array.isArray(json[key])) {
                    for (var i = 0; i < json[key].length; i++) {
                        removeNamespacePrefix(json[key][i], nsPrefix);
                    }
                }
                var newKey = key.slice(key.indexOf(nsPrefix) + nsPrefix.length + 1);
                json[newKey] = json[key];
                delete json[key];
            }
        }
    }

    // backgroundColor = background-color, convert from camelCase to dash.
    function camelCaseToDash(key) {
        return key.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
    }

    // Convert an RGBA value written in Hex to rgba(v,v,v,a).
    function convertHexToRGBA(rgba) {
        // Get the hexadecimal value without the #.
        var hex = rgba.slice(1);
        // Separate the values in pairs.
        var hexMatrice = hex.match(/.{2}/g);
        // Convert the alpha value in decimal between 0 and 1.
        var alpha = parseFloat(parseInt((parseInt(hexMatrice[3], 16) / 255) * 1000, 10) / 1000);
        // Get the standard RGB value.
        var rgb = hexMatrice.slice(0, 3).map(function (i) {
            return parseInt(i, 16);
        });
        // Return the RGBA value for CSS.
        return 'rgba(' + rgb.join(',') + ',' + alpha + ');';
    }

    // Return whether or not an array contains a certain text
    function arrayContains(text, array) {
        for (var i = 0; i < array.length; i++) {
            if (array[i].indexOf(text) > -1) {
                return true;
            }
        }
        return false;
    }

    // Return the whole value that contains "text"
    function getPropertyFromArray(text, array) {
        for (var i = 0; i < array.length; i++) {
            if (array[i].indexOf(text) > -1) {
                return array[i];
            }
        }
        return null;
    }

    // Delete a a property from an array.
    function deletePropertyFromArray(property, array) {
        array.splice(array.indexOf(getPropertyFromArray(property, array)), 1);
    }

    function mergeArrays(primeArray, arrayToAdd) {
        for (var i = 0; i < primeArray.length; i++) {
            for (var j = 0; j < arrayToAdd.length; j++) {
                // Take only the name of the property
                if (primeArray[i]) {
                    if (primeArray[i].split(':')[0].indexOf(arrayToAdd[j].split(':')[0]) > -1) {
                        primeArray.splice(i, 1);
                    }
                }
            }
        }
        return primeArray.concat(arrayToAdd);
    }

    /**
     * Processing of styling information:
     * - processStyle: return an array of strings with the cue style under a CSS style form.
     * - findStyleFromID: Return the unprocessed style from TTMLStyling corresponding to the ID researched.
     * - getProcessedStyle: Return the processed style(s) from the ID(s) received in entry.
     * **/


    // Compute the style properties to return an array with the cleaned properties.
    function processStyle(cueStyle, cellUnit) {
        var properties = [];

        // Clean up from the xml2json parsing:
        for (var key in cueStyle) {
            if (cueStyle.hasOwnProperty(key)) {
                //Clean the properties from the parsing.
                var newKey = key.replace('ebutts:', '');
                newKey = newKey.replace('xml:', '');
                newKey = newKey.replace('tts:', '');

                // Clean the properties' names.
                newKey = camelCaseToDash(newKey);
                cueStyle[newKey] = cueStyle[key];
                delete cueStyle[key];
            }
        }

        // Line padding is computed from the cellResolution.
        if ('line-padding' in cueStyle) {
            var valuePadding = parseFloat(cueStyle['line-padding'].slice(cueStyle['line-padding'].indexOf(':') + 1,
                cueStyle['line-padding'].indexOf('c')));
            if ('id' in cueStyle) {
                linePadding[cueStyle.id] = valuePadding;
            }
            var valuePaddingInPx = valuePadding * cellUnit[0] + 'px;';
            properties.push('padding-left:' + valuePaddingInPx);
            properties.push('padding-right:' + valuePaddingInPx);
        }
        // Font size is computed from the cellResolution.
        if ('font-size' in cueStyle) {
            var valueFtSize = parseFloat(cueStyle['font-size'].slice(cueStyle['font-size'].indexOf(':') + 1,
                cueStyle['font-size'].indexOf('%')));
            if ('id' in cueStyle) {
                fontSize[cueStyle.id] = valueFtSize;
            }
            var valueFtSizeInPx = valueFtSize / 100 * cellUnit[1] + 'px;';
            properties.push('font-size:' + valueFtSizeInPx);
        }
        // Line height is computed from the cellResolution.
        if ('line-heigt' in cueStyle) {
            if (cueStyle['line-height'] === 'normal') {
                properties.push('line-heigth: normal;');
            } else {
                var valueLHSize = parseFloat(cueStyle['line-heigt'].slice(cueStyle['line-heigt'].indexOf(':') + 1,
                    cueStyle['line-heigt'].indexOf('%')));
                if ('id' in cueStyle) {
                    lineHeight[cueStyle.id] = valueLHSize;
                }
                var valueLHSizeInPx = valueLHSize / 100 * cellUnit[1] + 'px;';
                properties.push(key + ':' + valueLHSizeInPx);
            }
        }
        // Font-family can be specified by a generic family name or a custom family name.
        if ('font-family' in cueStyle) {
            if (cueStyle['font-family'] in fontFamilies) {
                properties.push(fontFamilies[cueStyle['font-family']]);
            } else {
                properties.push('font-family:' + cueStyle['font-family'] + ';');
            }
        }
        // Text align needs to be set from two properties:
        // The standard text-align CSS property.
        // The justify-content property as we use flex boxes.
        if ('text-align' in cueStyle) {
            if (cueStyle['text-align'] in textAlign) {
                properties.push(textAlign[cueStyle['text-align']][0]);
                properties.push(textAlign[cueStyle['text-align']][1]);
            }
        }
        // Multi Row align is set only by the text-align property.
        // TODO: TO CHECK
        if ('multi-row-align' in cueStyle) {
            if (arrayContains('text-align', properties) && cueStyle['multi-row-align'] != 'auto') {
                deletePropertyFromArray('text-align', properties);
            }
            if (cueStyle['multi-row-align'] in multiRowAlign) {
                properties.push(multiRowAlign[cueStyle['multi-row-align']]);
            }
        }
        // Background color can be specified from hexadecimal (RGB or RGBA) value.
        var rgbaValue;
        if ('background-color' in cueStyle) {
            if (cueStyle['background-color'].indexOf('#') > -1 && (cueStyle['background-color'].length - 1) === 8) {
                rgbaValue = convertHexToRGBA(cueStyle['background-color']);
                properties.push('background-color: ' + rgbaValue);
            } else {
                properties.push('background-color:' + cueStyle['background-color'] + ';');
            }
        }
        // Color can be specified from hexadecimal (RGB or RGBA) value.
        if ('color' in cueStyle) {
            if (cueStyle.color.indexOf('#') > -1 && (cueStyle.color.length - 1) === 8) {
                rgbaValue = convertHexToRGBA(cueStyle.color);
                properties.push('color: ' + rgbaValue);
            } else {
                properties.push('color:' + cueStyle.color + ';');
            }
        }
        // Wrap option is determined by the white-space CSS property.
        if ('wrap-option' in cueStyle) {
            if (cueStyle['wrap-option'] in wrapOption) {
                properties.push(wrapOption[cueStyle['wrap-option']]);
            } else {
                properties.push('white-space:' + cueStyle['wrap-option']);
            }
        }
        // Unicode bidi is determined by the unicode-bidi CSS property.
        if ('unicode-bidi' in cueStyle) {
            if (cueStyle['unicode-bidi'] in unicodeBidi) {
                properties.push(unicodeBidi[cueStyle['unicode-bidi']]);
            } else {
                properties.push('unicode-bidi:' + cueStyle['unicode-bidi']);
            }
        }

        // Standard properties identical to CSS.

        if ('font-style' in cueStyle) {
            properties.push('font-style:' + cueStyle['font-style'] + ';');
        }
        if ('font-weight' in cueStyle) {
            properties.push('font-weight:' + cueStyle['font-weight'] + ';');
        }
        if ('direction' in cueStyle) {
            properties.push('direction:' + cueStyle.direction + ';');
        }
        if ('text-decoration' in cueStyle) {
            properties.push('text-decoration:' + cueStyle['text-decoration'] + ';');
        }

        // Handle white-space preserve
        if (ttml.tt.hasOwnProperty('xml:space')) {
            if (ttml.tt['xml:space'] === 'preserve') {
                properties.push('white-space: pre;');
            }
        }

        return properties;
    }

    // Find the style set by comparing the style IDs available.
    // Return null if no style is found
    function findStyleFromID(ttmlStyling, cueStyleID) {
        // For every styles available, search the corresponding style in ttmlStyling.
        for (var j = 0; j < ttmlStyling.length; j++) {
            var currStyle = ttmlStyling[j];
            if (currStyle['xml:id'] === cueStyleID || currStyle.id === cueStyleID) {
                // Return the style corresponding to the ID in parameter.
                return currStyle;
            }
        }
        return null;
    }
    // Return the computed style from a certain ID.
    function getProcessedStyle(reference, cellUnit) {
        var styles = [];
        var ids = reference.match(/\S+/g);
        ids.forEach(function (id) {
            // Find the style for each id received.
            var cueStyle = findStyleFromID(ttmlStyling, id);
            if (cueStyle) {
                // Process the style for the cue in CSS form.
                // Send a copy of the style object, so it does not modify the original by cleaning it.
                var stylesFromId = processStyle(JSON.parse(JSON.stringify(cueStyle)), cellUnit);
                styles = styles.concat(stylesFromId);
            }
        });
        return styles;
    }

    /**
     * Processing of layout information:
     * - processRegion: return an array of strings with the cue region under a CSS style form.
     * - findRegionFromID: Return the unprocessed region from TTMLLayout corresponding to the ID researched.
     * - getProcessedRegion: Return the processed region(s) from the ID(s) received in entry.
     ***/

    // Compute the region properties to return an array with the cleaned properties.
    function processRegion(cueRegion, cellUnit) {
        var properties = [];

        // Clean up from the xml2json parsing:
        for (var key in cueRegion) {
            //Clean the properties from the parsing.
            var newKey = key.replace('tts:', '');
            newKey = newKey.replace('xml:', '');

            // Clean the properties' names.
            newKey = camelCaseToDash(newKey);
            cueRegion[newKey] = cueRegion[key];
            if (newKey !== key) {
                delete cueRegion[key];
            }
        }
        // Extent property corresponds to width and height
        if ('extent' in cueRegion) {
            var coordsExtent = cueRegion.extent.split(/\s/);
            properties.push('width: ' + coordsExtent[0] + ';');
            properties.push('height: ' + coordsExtent[1] + ';');
        }
        // Origin property corresponds to top and left
        if ('origin' in cueRegion) {
            var coordsOrigin = cueRegion.origin.split(/\s/);
            properties.push('left: ' + coordsOrigin[0] + ';');
            properties.push('top: ' + coordsOrigin[1] + ';');
        }
        // DisplayAlign property corresponds to vertical-align
        if ('display-align' in cueRegion) {
            properties.push(displayAlign[cueRegion['display-align']]);
        }
        // WritingMode is not yet implemented (for CSS3, to come)
        if ('writing-mode' in cueRegion) {
            properties.push(writingMode[cueRegion['writing-mode']]);
        }
        // Style will give to the region the style properties from the style selected
        if ('style' in cueRegion) {
            var styleFromID = getProcessedStyle(cueRegion.style, cellUnit);
            properties = properties.concat(styleFromID);
        }

        // Standard properties identical to CSS.

        if ('padding' in cueRegion) {
            properties.push('padding:' + cueRegion.padding + ';');
        }
        if ('overflow' in cueRegion) {
            properties.push('overflow:' + cueRegion.overflow + ';');
        }
        if ('show-background' in cueRegion) {
            properties.push('show-background:' + cueRegion['show-background'] + ';');
        }
        if ('id' in cueRegion) {
            properties.push('regionID:' + cueRegion.id + ';');
        }

        return properties;
    }

    // Find the region set by comparing the region IDs available.
    // Return null if no region is found
    function findRegionFromID(ttmlLayout, cueRegionID) {
        // For every region available, search the corresponding style in ttmlLayout.
        for (var j = 0; j < ttmlLayout.length; j++) {
            var currReg = ttmlLayout[j];
            if (currReg['xml:id'] === cueRegionID || currReg.id === cueRegionID) {
                // Return the region corresponding to the ID in parameter.
                return currReg;
            }
        }
        return null;
    }

    // Return the computed region from a certain ID.
    function getProcessedRegion(reference, cellUnit) {
        var regions = [];
        var ids = reference.match(/\S+/g);
        ids.forEach(function (id) {
            // Find the region for each id received.
            var cueRegion = findRegionFromID(ttmlLayout, id);
            if (cueRegion) {
                // Process the region for the cue in CSS form.
                // Send a copy of the style object, so it does not modify the original by cleaning it.
                var regionsFromId = processRegion(JSON.parse(JSON.stringify(cueRegion)), cellUnit);
                regions = regions.concat(regionsFromId);
            }
        });
        return regions;
    }

    //Return the cellResolution defined by the TTML document.
    function getCellResolution() {
        var defaultCellResolution = [32, 15]; // Default cellResolution.
        if (ttml.tt.hasOwnProperty('ttp:cellResolution')) {
            return ttml.tt['ttp:cellResolution'].split(' ').map(parseFloat);
        } else {
            return defaultCellResolution;
        }
    }

    // Return the cue wrapped into a span specifying its linePadding.
    function applyLinePadding(cueHTML, cueStyle) {
        // Extract the linePadding property from cueStyleProperties.
        var linePaddingLeft = getPropertyFromArray('padding-left', cueStyle);
        var linePaddingRight = getPropertyFromArray('padding-right', cueStyle);
        var linePadding = linePaddingLeft.concat(' ' + linePaddingRight);

        // Declaration of the HTML elements to be used in the cue innerHTML construction.
        var outerHTMLBeforeBr = '';
        var outerHTMLAfterBr = '';
        var cueInnerHTML = '';

        // List all the nodes of the subtitle.
        var nodeList = Array.prototype.slice.call(cueHTML.children);
        // Take a br element as reference.
        var brElement = cueHTML.getElementsByClassName('lineBreak')[0];
        // First index of the first br element.
        var idx = nodeList.indexOf(brElement);
        // array of all the br element indices
        var indices = [];
        // Find all the indices of the br elements.
        while (idx != -1) {
            indices.push(idx);
            idx = nodeList.indexOf(brElement, idx + 1);
        }

        // Strings for the cue innerHTML construction.
        var spanStringEnd = '<\/span>';
        var br = '<br>';
        var clonePropertyString = '<span' + ' class="spanPadding" ' + 'style="-webkit-box-decoration-break: clone; ';

        // If br elements are found:
        if (indices.length) {
            // For each index of a br element we compute the HTML coming before and/or after it.
            indices.forEach(function (i, index) {
                // If this is the first line break, we compute the HTML of the element coming before.
                if (index === 0) {
                    var styleBefore = '';
                    // for each element coming before the line break, we add its HTML.
                    for (var j = 0; j < i; j++) {
                        outerHTMLBeforeBr += nodeList[j].outerHTML;
                        // If this is the first element, we add its style to the wrapper.
                        if (j === 0) {
                            styleBefore = linePadding.concat(nodeList[j].style.cssText);
                        }
                    }
                    // The before element will comprises the clone property (for line wrapping), the style that
                    // need to be applied (ex: background-color) and the rest og the HTML.
                    outerHTMLBeforeBr = clonePropertyString + styleBefore + '">' + outerHTMLBeforeBr;
                }
                // For every element of the list, we compute the element coming after the line break.s
                var styleAfter = '';
                // for each element coming after the line break, we add its HTML.
                for (var k = i + 1; k < nodeList.length; k++) {
                    outerHTMLAfterBr += nodeList[k].outerHTML;
                    // If this is the last element, we add its style to the wrapper.
                    if (k === nodeList.length - 1) {
                        styleAfter += linePadding.concat(nodeList[k].style.cssText);
                    }
                }

                // The before element will comprises the clone property (for line wrapping), the style that
                // need to be applied (ex: background-color) and the rest og the HTML.
                outerHTMLAfterBr = clonePropertyString + styleAfter + '">' + outerHTMLAfterBr;

                // For each line break we must add the before and/or after element to the final cue as well as
                // the line break when needed.
                if (outerHTMLBeforeBr && outerHTMLAfterBr && index === (indices.length - 1)) {
                    cueInnerHTML += outerHTMLBeforeBr + spanStringEnd + br + outerHTMLAfterBr + spanStringEnd;
                } else if (outerHTMLBeforeBr && outerHTMLAfterBr && index !== (indices.length - 1)) {
                    cueInnerHTML += outerHTMLBeforeBr + spanStringEnd + br + outerHTMLAfterBr + spanStringEnd + br;
                } else if (outerHTMLBeforeBr && !outerHTMLAfterBr) {
                    cueInnerHTML += outerHTMLBeforeBr + spanStringEnd;
                } else if (!outerHTMLBeforeBr && outerHTMLAfterBr && index === (indices.length - 1)) {
                    cueInnerHTML += outerHTMLAfterBr + spanStringEnd;
                } else if (!outerHTMLBeforeBr && outerHTMLAfterBr && index !== (indices.length - 1)) {
                    cueInnerHTML += outerHTMLAfterBr + spanStringEnd + br;
                }
            });
        } else {
            // If there is no line break in the subtitle, we simply wrap cue in a span indicating the linePadding.
            var style = '';
            for (var k = 0; k < nodeList.length; k++) {
                style += nodeList[k].style.cssText;
            }
            cueInnerHTML = clonePropertyString + linePadding + style + '">' + cueHTML.innerHTML + spanStringEnd;
        }
        return cueInnerHTML;
    }

    /*** Create the cue element
     * I. The cues are text only:
     *      i) The cue contains a 'br' element
     *      ii) The cue contains a span element
     *      iii) The cue contains text
     * ***/

    function constructCue(cueElements, cellUnit) {
        var cue = document.createElement('div');
        cueElements.forEach(function (el) {
            // If metadata is present, do not process.
            if (el.hasOwnProperty('metadata')) {
                return;
            }

            /**
             * If the p element contains spans: create the span elements.
             */
            if (el.hasOwnProperty('span')) {

                // Stock the span subtitles in an array (in case there are only one value).
                var spanElements = el.span.__children;

                // Create the span element.
                var spanHTMLElement = document.createElement('span');
                // Extract the style of the span.
                if (el.span.hasOwnProperty('style')) {
                    var spanStyle = getProcessedStyle(el.span.style, cellUnit);
                    spanHTMLElement.className = 'spanPadding ' + el.span.style;
                    spanHTMLElement.style.cssText = spanStyle.join(' ');
                }


                // if the span has more than one element, we check for each of them their nature (br or text).
                spanElements.forEach(function (spanEl) {
                    // If metadata is present, do not process.
                    if (spanElements.hasOwnProperty('metadata')) {
                        return;
                    }
                    // If the element is a string
                    if (spanEl.hasOwnProperty('#text')) {
                        var textNode = document.createTextNode(spanEl['#text']);
                        spanHTMLElement.appendChild(textNode);
                        // If the element is a 'br' tag
                    } else if ('br' in spanEl) {
                        // To handle br inside span we need to add the current span
                        // to the cue and then create a br and add that the cue
                        // then create a new span that we use for the next line of
                        // text, that is a copy of the current span

                        // Add the current span to the cue, only if it has childNodes (text)
                        if (spanHTMLElement.hasChildNodes()) {
                            cue.appendChild(spanHTMLElement);
                        }

                        // Create a br and add that to the cue
                        var brEl = document.createElement('br');
                        brEl.className = 'lineBreak';
                        cue.appendChild(brEl);

                        // Create an replacement span and copy the style and classname from the old one
                        var newSpanHTMLElement = document.createElement('span');
                        newSpanHTMLElement.className = spanHTMLElement.className;
                        newSpanHTMLElement.style.cssText = spanHTMLElement.style.cssText;

                        // Replace the current span with the one we just created
                        spanHTMLElement = newSpanHTMLElement;
                    }
                });
                // We append the element to the cue container.
                cue.appendChild(spanHTMLElement);
            }

            /**
             * Create a br element if there is one in the cue.
             */
            else if (el.hasOwnProperty('br')) {
                // We append the line break to the cue container.
                var brEl = document.createElement('br');
                brEl.className = 'lineBreak';
                cue.appendChild(brEl);
            }

            /**
             * Add the text that is not in any inline element
             */
            else if (el.hasOwnProperty('#text')) {
                // Add the text to an individual span element (to add line padding if it is defined).
                var textNode = document.createElement('span');
                textNode.textContent = el['#text'];

                // We append the element to the cue container.
                cue.appendChild(textNode);
            }
        });
        return cue;
    }

    function constructCueRegion(cue, div, cellUnit) {
        var cueRegionProperties = []; // properties to be put in the "captionRegion" HTML element
        // Obtain the region ID(s) assigned to the cue.
        var pRegionID = cue.region;
        // If div has a region.
        var divRegionID = div.region;

        var divRegion;
        var pRegion;

        // If the div element reference a region.
        if (divRegionID) {
            divRegion = getProcessedRegion(divRegionID, cellUnit);
        }
        // If the p element reference a region.
        if (pRegionID) {
            pRegion = cueRegionProperties.concat(getProcessedRegion(pRegionID, cellUnit));
            if (divRegion) {
                cueRegionProperties = mergeArrays(divRegion, pRegion);
            } else {
                cueRegionProperties = pRegion;
            }
        } else if (divRegion) {
            cueRegionProperties = divRegion;
        }

        // Add initial/default values to what's not defined in the layout:
        applyDefaultProperties(cueRegionProperties, defaultLayoutProperties);

        return cueRegionProperties;
    }

    function constructCueStyle(cue, cellUnit) {
        var cueStyleProperties = []; // properties to be put in the "paragraph" HTML element
        // Obtain the style ID(s) assigned to the cue.
        var pStyleID = cue.style;
        // If body has a style.
        var bodyStyleID = ttml.tt.body.style;
        // If div has a style.
        var divStyleID = ttml.tt.body.div.style;

        var bodyStyle;
        var divStyle;
        var pStyle;
        var styleIDs = '';

        // If the body element reference a style.
        if (bodyStyleID) {
            bodyStyle = getProcessedStyle(bodyStyleID, cellUnit);
            styleIDs = 'paragraph ' + bodyStyleID;
        }

        // If the div element reference a style.
        if (divStyleID) {
            divStyle = getProcessedStyle(divStyleID, cellUnit);
            if (bodyStyle) {
                divStyle = mergeArrays(bodyStyle, divStyle);
                styleIDs += ' ' + divStyleID;
            } else {
                styleIDs = 'paragraph ' + divStyleID;
            }
        }

        // If the p element reference a style.
        if (pStyleID) {
            pStyle = getProcessedStyle(pStyleID, cellUnit);
            if (bodyStyle && divStyle) {
                cueStyleProperties = mergeArrays(divStyle, pStyle);
                styleIDs += ' ' + pStyleID;
            } else if (bodyStyle) {
                cueStyleProperties = mergeArrays(bodyStyle, pStyle);
                styleIDs += ' ' + pStyleID;
            } else if (divStyle) {
                cueStyleProperties = mergeArrays(divStyle, pStyle);
                styleIDs += ' ' + pStyleID;
            } else {
                cueStyleProperties = pStyle;
                styleIDs = 'paragraph ' + pStyleID;
            }
        } else if (bodyStyle && !divStyle) {
            cueStyleProperties = bodyStyle;
        } else if (!bodyStyle && divStyle) {
            cueStyleProperties = divStyle;
        }


        // Add initial/default values to what's not defined in the styling:
        applyDefaultProperties(cueStyleProperties, defaultStyleProperties);

        return [cueStyleProperties, styleIDs];
    }

    function applyDefaultProperties(array, defaultProperties) {
        for (var key in defaultProperties) {
            if (defaultProperties.hasOwnProperty(key)) {
                if (!arrayContains(key, array)) {
                    array.push(key + ':' + defaultProperties[key]);
                }
            }
        }
    }

    instance = {
        parse: parse,
        setConfig: setConfig
    };

    setup();
    return instance;
}
TTMLParser.__dashjs_factory_name = 'TTMLParser';
export default FactoryMaker.getSingletonFactory(TTMLParser);