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
import Constants from '../constants/Constants';
import FactoryMaker from '../../core/FactoryMaker';
import URLUtils from '../utils/URLUtils';
import EventBus from '../../core/EventBus';
import Events from '../../core/events/Events';
import Debug from '../../core/Debug';

function DVBFonts(config) {

    let context = this.context;
    const eventBus = EventBus(context).getInstance();
    const urlUtils = URLUtils(context).getInstance();
    const adapter = config.adapter;
    const baseURLController = config.baseURLController;
    // const settings = config.settings;

    let instance,
        logger,
        dvbFontList;

    function setup() {
        logger = Debug(context).getInstance().getLogger(instance);
        resetInitialSettings();
    }

    /**
     * Add any dvb fonts from a single track to the dvbFontList
     * @param {object} track - A text track
     * @param {string} streamId - Id of current stream
     */
    function _addFontFromTrack(track, streamId) {
        let asBaseUrl;
        let essentialProperty = false;
        let dvbFontProps;

        // If there is a baseurl in the manifest resolve against a representation inside the current adaptation set
        if (baseURLController.resolve()) {
            const reps = adapter.getVoRepresentations(track);
            asBaseUrl = baseURLController.resolve(reps[0].path).url
        }

        // TODO: Filter is better? Filter is definitely better.
        const essentialTags = track.essentialPropertiesAsArray.filter(tag => 
            (tag.schemeIdUri && tag.schemeIdUri === Constants.FONT_DOWNLOAD_DVB_SCHEME)
        );
        const supplementalTags = track.supplementalPropertiesAsArray.filter(tag => 
            (tag.schemeIdUri && tag.schemeIdUri === Constants.FONT_DOWNLOAD_DVB_SCHEME)
        );

        // When it comes to the property descriptors it's Essential OR Supplementary, with Essential taking preference
        if (essentialTags.length > 0) {
            essentialProperty = true;
            dvbFontProps = essentialTags;
        } else {
            dvbFontProps = supplementalTags;
        }

        dvbFontProps.forEach(attrs => {
            if (_hasMandatoryDvbFontAttributes(attrs)) {
                dvbFontList.push({
                    fontFamily: _prefixDvbCustomFont(attrs.dvb_fontFamily),
                    url: _resolveFontUrl(attrs.dvb_url, asBaseUrl),
                    mimeType: attrs.dvb_mimeType,
                    trackId: track.id,
                    streamId,
                    isEssential: essentialProperty,
                    status: 'unloaded'
                });
            }
        });
    }

    /**
     * Clean up dvb font downloads
     */
    function _cleanUpDvbCustomFonts() {
        for (const font in dvbFontList) {
            const customFont = new FontFace(
                font.fontFamily,
                `url(${font.url})`, 
                { display: 'swap' }
            );
            document.fonts.delete(customFont);
        }
    };

    /**
     * Check the attributes of a supplemental or essential property descriptor to establish if 
     * it has the mandatory values for a dvb font download
     * @param {object} attrs 
     * @returns {boolean} true if mandatory attributes present
     */
    function _hasMandatoryDvbFontAttributes(attrs) {
        // TODO: Can we check if a url is a valid url (even if its relative to a BASE URL) or does that come later?
        if (
            (attrs.value && attrs.value === '1') &&
            (attrs.dvb_url && attrs.dvb_url.length > 0) && 
            (attrs.dvb_fontFamily && attrs.dvb_fontFamily.length > 0) &&
            (attrs.dvb_mimeType && (attrs.dvb_mimeType === Constants.OFF_MIMETYPE || attrs.dvb_mimeType === Constants.WOFF_MIMETYPE))
        ) {
            return true;
        }
        return false;
    }

    /**
     * Prefix the fontFamily name of a dvb custom font download so the font does
     * not clash with any fonts of the same name in the browser/locally.
     * @param {string} fontFamily - font family name
     * @returns {string} - Prefixed font name
     */
    function _prefixDvbCustomFont(fontFamily) {
        // Trim any white space - imsc will do the same when processing TTML/parsing HTML
        let prefixedFontFamily = fontFamily.trim();
        // Handle names with white space within them, hence wrapped in quotes
        if (fontFamily.charAt(0) === `"` || fontFamily.charAt(0) === `'`) {
            prefixedFontFamily = `${prefixedFontFamily.slice(0,1)}${Constants.DASHJS_DVB_FONT_PREFIX}${prefixedFontFamily.slice(1)}`;
        } else {
            prefixedFontFamily = `${Constants.DASHJS_DVB_FONT_PREFIX}${prefixedFontFamily}`;
        }

        return prefixedFontFamily;
    };

    /**
     * Resolves a given font download URL.
     * TODO: Still need to check bits of URL resolution
     * @param {string} fontUrl - URL as in the 'dvb:url' property
     * @param {string} baseUrl - BaseURL for Adapatation Set 
     * @returns {string} resolved URL
     */
    function _resolveFontUrl(fontUrl, baseUrl) {
        if (urlUtils.isPathAbsolute(fontUrl)) {
            return fontUrl;
        } else if (urlUtils.isRelative(fontUrl)) {
            if (baseUrl) {
                return urlUtils.resolve(fontUrl, baseUrl);
            } else {
                // TODO: Should this be against MPD location or current page location?
                return urlUtils.resolve(fontUrl);
            }
        } else {
            return fontUrl; 
        }
    };

    /**
     * Updates the status of a given dvb font relative to whether it is loaded in the browser
     * or if the download has failed
     * @param {number} index - Index of font in dvbFontList
     * @param {string} newStatus - Status value to update: 'unloaded'|'loaded'|'failed' 
     */
    function _updateFontStatus(index, newStatus) {
        const font = dvbFontList[index];
        dvbFontList[index] = {...font, status: newStatus};
    };

    /**
     * Adds all fonts to the dvb font list from all tracks
     * @param {array} tracks - All text tracks
     * @param {string} streamId - Id of the stream
     */
    function addFontsFromTracks(tracks, streamId) {
        for (let i = 0; i < tracks.length; i++) {
            let track = tracks[i];
            _addFontFromTrack(track, streamId);
        };
    }

    /**
     * Initiate the download of a dvb custom font.
     * The browser will neatly handle duplicate fonts
     * TODO: Does the mimetype need to be specified somewhere?
     * @param {FontInfo} font - Font properties - TODO: break these down
     * @param {Object} track - Track information
     * @param {Number} streamId - StreamId
     * @
     */
    function downloadFonts() {
        for (let i = 0; i < dvbFontList.length; i++) {
            let font = dvbFontList[i];

            const customFont = new FontFace(
                font.fontFamily,
                `url(${font.url})`, 
                { display: 'swap' }
            );

            // TODO: Add status strings to some kind of object/enum
            
            // Add to the list of processed fonts to stop repeat downloads
            document.fonts.add(customFont);
            eventBus.trigger(Events.DVB_FONT_DOWNLOAD_ADDED, font);

            customFont.load();
            customFont.loaded.then(
                () => {
                    _updateFontStatus(i, 'loaded');
                    eventBus.trigger(Events.DVB_FONT_DOWNLOAD_COMPLETE, font);
                },
                (err) => {
                    _updateFontStatus(i, 'failed')
                    eventBus.trigger(Events.DVB_FONT_DOWNLOAD_FAILED, font);
                    logger.debug(err);
                }
            )
        };
    }

    /**
     * Returns current list of all known DVB Fonts
     * @returns {array}
     */
    function getFonts() {
        return dvbFontList;
    }

    /**
     * Returns dvbFonts relative to a track given a trackId
     * @param {number} - TrackId
     * @returns {array} - DVB Fonts
     */
    function getFontsForTrackId(trackId) {
        return dvbFontList.filter(font => 
            (font.trackId && font.trackId === trackId)
        );
    }

    function resetInitialSettings() {
        dvbFontList = [];
    }

    function reset() {
        _cleanUpDvbCustomFonts();
        resetInitialSettings();
    }

    instance = {
        addFontsFromTracks,
        downloadFonts,
        getFonts,
        getFontsForTrackId,
        reset
    };
    setup();
    return instance;
}

DVBFonts.__dashjs_factory_name = 'DVBFonts';
export default FactoryMaker.getClassFactory(DVBFonts);
