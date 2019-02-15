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
import EventBus from '../../core/EventBus';
import Events from '../../core/events/Events';
import { fromXML, generateISD } from 'imsc';

function TTMLParser() {

    const context = this.context;
    const eventBus = EventBus(context).getInstance();

    /*
     * This TTML parser follows "EBU-TT-D SUBTITLING DISTRIBUTION FORMAT - tech3380" spec - https://tech.ebu.ch/docs/tech/tech3380.pdf.
     * */
    let instance,
        logger;

    let cueCounter = 0; // Used to give every cue a unique ID.

    function setup() {
        logger = Debug(context).getInstance().getLogger(instance);
    }

    function getCueID() {
        const id = 'cue_TTML_' + cueCounter;
        cueCounter++;
        return id;
    }

    /**
     * Parse the raw data and process it to return the HTML element representing the cue.
     * Return the region to be processed and controlled (hide/show) by the caption controller.
     * @param {string} data - raw data received from the TextSourceBuffer
     * @param {number} offsetTime - offset time to apply to cue time
     * @param {integer} startTimeSegment - startTime for the current segment
     * @param {integer} endTimeSegment - endTime for the current segment
     * @param {Array} images - images array referenced by subs MP4 box
     */
    function parse(data, offsetTime, startTimeSegment, endTimeSegment, images) {
        let errorMsg = '';
        const captionArray = [];
        let startTime,
            endTime,
            i;

        const content = {};

        const embeddedImages = {};
        let currentImageId = '';
        let accumulated_image_data = '';
        let metadataHandler = {

            onOpenTag: function (ns, name, attrs) {
                if (name === 'image' && ns === 'http://www.smpte-ra.org/schemas/2052-1/2010/smpte-tt') {
                    if (!attrs[' imagetype'] || attrs[' imagetype'].value !== 'PNG') {
                        logger.warn('smpte-tt imagetype != PNG. Discarded');
                        return;
                    }
                    currentImageId = attrs['http://www.w3.org/XML/1998/namespace id'].value;
                }
            },

            onCloseTag: function () {
                if (currentImageId) {
                    embeddedImages[currentImageId] = accumulated_image_data.trim();
                }
                accumulated_image_data = '';
                currentImageId = '';
            },

            onText: function (contents) {
                if (currentImageId) {
                    accumulated_image_data = accumulated_image_data + contents;
                }
            }
        };

        if (!data) {
            errorMsg = 'no ttml data to parse';
            throw new Error(errorMsg);
        }

        content.data = data;

        eventBus.trigger(Events.TTML_TO_PARSE, content);

        const imsc1doc = fromXML(content.data, function (msg) {
            errorMsg = msg;
        }, metadataHandler);

        eventBus.trigger(Events.TTML_PARSED, {ttmlString: content.data, ttmlDoc: imsc1doc});

        const mediaTimeEvents = imsc1doc.getMediaTimeEvents();

        for (i = 0; i < mediaTimeEvents.length; i++) {
            let isd = generateISD(imsc1doc, mediaTimeEvents[i], function (error) {
                errorMsg = error;
            });

            if (isd.contents.some(topLevelContents => topLevelContents.contents.length)) {
                //be sure that mediaTimeEvents values are in the mp4 segment time ranges.
                startTime = (mediaTimeEvents[i] + offsetTime) < startTimeSegment ? startTimeSegment : (mediaTimeEvents[i] + offsetTime);
                endTime = (mediaTimeEvents[i + 1] + offsetTime) > endTimeSegment ? endTimeSegment : (mediaTimeEvents[i + 1] + offsetTime);

                if (startTime < endTime) {
                    captionArray.push({
                        start: startTime,
                        end: endTime,
                        type: 'html',
                        cueID: getCueID(),
                        isd: isd,
                        images: images,
                        embeddedImages: embeddedImages
                    });
                }
            }
        }

        if (errorMsg !== '') {
            logger.error(errorMsg);
            throw new Error(errorMsg);
        }

        return captionArray;
    }

    instance = {
        parse: parse
    };

    setup();
    return instance;
}
TTMLParser.__dashjs_factory_name = 'TTMLParser';
export default FactoryMaker.getSingletonFactory(TTMLParser);
