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

function TTMLParser() {

    let context = this.context;
    let log = Debug(context).getInstance().log;

    /*
     * This TTML parser follows "EBU-TT-D SUBTITLING DISTRIBUTION FORMAT - tech3380" spec - https://tech.ebu.ch/docs/tech/tech3380.pdf.
     * */
    let instance,
        imsc1Parser;

    let cueCounter = 0; // Used to give every cue a unique ID.

    function getCueID() {
        let id = 'cue_TTML_' + cueCounter;
        cueCounter++;
        return id;
    }

    /**
     * Parse the raw data and process it to return the HTML element representing the cue.
     * Return the region to be processed and controlled (hide/show) by the caption controller.
     * @param {string} data - raw data received from the TextSourceBuffer
     */

    function parse(data) {
        let i,
            j;

        var errorMsg = '';
        var captionArray = [];
        
        var imsc1doc = imsc1Parser.fromXML(data, function (msg) {
            errorMsg = msg;
        });
        var mediaTimeEvents = imsc1doc.getMediaTimeEvents();

        for (i = 0; i < mediaTimeEvents.length; i++) {
            var isd = imsc1Parser.generateISD(imsc1doc, mediaTimeEvents[i], function (error) {
                errorMsg = error;
            });
            for (j = 0; j < isd.contents.length; j++) {
                if (isd.contents[j].contents.length >= 1) {
                    captionArray.push({
                        start: mediaTimeEvents[i],
                        end: mediaTimeEvents[i + 1],
                        type: 'html',
                        cueID: getCueID(),
                        isd: isd
                    });
                }
            }
        }

        if (errorMsg !== '') {
            log(errorMsg);
        }

        if (captionArray.length > 0) {
            return captionArray;
        } else { // This seems too strong given that there are segments with no TTML subtitles
            throw new Error(errorMsg);
        }
    }

    function setup() {
        imsc1Parser = require('imsc');
    }

    instance = {
        parse: parse
    };

    setup();
    return instance;
}
TTMLParser.__dashjs_factory_name = 'TTMLParser';
export
default FactoryMaker.getSingletonFactory(TTMLParser);
