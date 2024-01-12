/**
 * The copyright in this software is being made available under the BSD License,
 * included below. This software may be subject to other third party and contributor
 * rights, including patent rights, and no such rights are granted under this license.
 *
 * Copyright (c) 2024, BBC.
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without modification,
 * are permitted provided that the following conditions are met:
 *  * Redistributions of source code must retain the above copyright notice, this
 *  list of conditions and the following disclaimer.
 *  * Redistributions in binary form must reproduce the above copyright notice,
 *  this list of conditions and the following disclaimer in the documentation and/or
 *  other materials provided with the distribution.
 *  * Neither the name of BBC nor the names of its
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
import MediaPlayerEvents from '../MediaPlayerEvents';
import Debug from '../../core/Debug';

function DVBFonts(config) {

    let context = this.context;
    const eventBus = EventBus(context).getInstance();
    const urlUtils = URLUtils(context).getInstance();
    const adapter = config.adapter;
    const baseURLController = config.baseURLController;

    const FONT_DOWNLOAD_STATUS = {
        ERROR: 'error',
        LOADED: 'loaded',
        UNLOADED: 'unloaded'
    };

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
     * @private
     */
    function _addFontFromTrack(track, streamId) {
        let asBaseUrl;
        let isEssential = false;
        let dvbFontProps;

        // If there is a baseurl in the manifest resolve against a representation inside the current adaptation set
        if (baseURLController.resolve()) {
            const reps = adapter.getVoRepresentations(track);
            asBaseUrl = baseURLController.resolve(reps[0].path).url
        }

        const essentialTags = track.essentialPropertiesAsArray.filter(tag => 
            (tag.schemeIdUri && tag.schemeIdUri === Constants.FONT_DOWNLOAD_DVB_SCHEME)
        );
        const supplementalTags = track.supplementalPropertiesAsArray.filter(tag => 
            (tag.schemeIdUri && tag.schemeIdUri === Constants.FONT_DOWNLOAD_DVB_SCHEME)
        );

        // When it comes to the property descriptors it's Essential OR Supplementary, with Essential taking preference
        if (essentialTags.length > 0) {
            isEssential = true;
            dvbFontProps = essentialTags;
        } else {
            dvbFontProps = supplementalTags;
        }

        dvbFontProps.forEach(attrs => {
            if (_hasMandatoryDvbFontAttributes(attrs)) {
                let resolvedUrl = _resolveFontUrl(attrs.dvb_url, asBaseUrl);
                dvbFontList.push({
                    fontFamily: attrs.dvb_fontFamily,
                    url: resolvedUrl,
                    mimeType: attrs.dvb_mimeType,
                    trackId: track.id,
                    streamId,
                    isEssential,
                    status: FONT_DOWNLOAD_STATUS.UNLOADED,
                    fontFace: new FontFace(
                        attrs.dvb_fontFamily,
                        `url(${resolvedUrl})`, 
                        { display: 'swap' }
                    )
                });
            }
        });
    }

    /** 
     * Clean up dvb font downloads 
     * @private
     */
    function _cleanUpDvbCustomFonts() {
        for (const font of dvbFontList) {
            let deleted = document.fonts.delete(font.fontFace);
            logger.debug(`Removal of fontFamily: ${font.fontFamily} was ${deleted ? 'successful' : 'unsuccessful'}`);
        }
    }

    /**
     * Check the attributes of a supplemental or essential property descriptor to establish if 
     * it has the mandatory values for a dvb font download
     * @param {object} attrs - property descriptor attributes
     * @returns {boolean} true if mandatory attributes present
     * @private
     */
    function _hasMandatoryDvbFontAttributes(attrs) {
        return !!((attrs.value && attrs.value === '1') &&
        (attrs.dvb_url && attrs.dvb_url.length > 0) &&
        (attrs.dvb_fontFamily && attrs.dvb_fontFamily.length > 0) &&
        (attrs.dvb_mimeType && (attrs.dvb_mimeType === Constants.OFF_MIMETYPE || attrs.dvb_mimeType === Constants.WOFF_MIMETYPE)));
    }

    /**
     * Resolves a given font download URL.
     * @param {string} fontUrl - URL as in the 'dvb:url' property
     * @param {string} baseUrl - BaseURL for Adaptation Set 
     * @returns {string} resolved URL
     * @private
     */
    function _resolveFontUrl(fontUrl, baseUrl) {
        if (urlUtils.isPathAbsolute(fontUrl)) {
            return fontUrl;
        } else if (urlUtils.isRelative(fontUrl)) {
            if (baseUrl) {
                return urlUtils.resolve(fontUrl, baseUrl);
            } else {
                return urlUtils.resolve(fontUrl);
            }
        } else {
            return fontUrl; 
        }
    }

    /**
     * Updates the status of a given dvb font relative to whether it is loaded in the browser
     * or if the download has failed
     * @param {number} index - Index of font in dvbFontList
     * @param {string} newStatus - Status value to update. Property of FONT_DOWNLOAD_STATUS
     * @private
     */
    function _updateFontStatus(index, newStatus) {
        const font = dvbFontList[index];
        dvbFontList[index] = {...font, status: newStatus};
    }

    /**
     * Adds all fonts to the dvb font list from all tracks
     * @param {array} tracks - All text tracks
     * @param {string} streamId - Id of the stream
     */
    function addFontsFromTracks(tracks, streamId) {
        if (tracks && Array.isArray(tracks) && streamId) {
            for (let i = 0; i < tracks.length; i++) {
                let track = tracks[i];
                _addFontFromTrack(track, streamId);
            };
        }
    }

    /**
     * Initiate the download of a dvb custom font.
     * The browser will neatly handle duplicate fonts
     */
    function downloadFonts() {
        for (let i = 0; i < dvbFontList.length; i++) {
            let font = dvbFontList[i];

            document.fonts.add(font.fontFace);
            eventBus.trigger(MediaPlayerEvents.DVB_FONT_DOWNLOAD_ADDED, font);

            font.fontFace.load().then(
                () => {
                    _updateFontStatus(i, FONT_DOWNLOAD_STATUS.LOADED);
                    eventBus.trigger(MediaPlayerEvents.DVB_FONT_DOWNLOAD_COMPLETE, font);
                },
                (err) => {
                    _updateFontStatus(i, FONT_DOWNLOAD_STATUS.ERROR);
                    logger.debug('Font download error: ', err);
                    eventBus.trigger(MediaPlayerEvents.DVB_FONT_DOWNLOAD_FAILED, font);
                }
            );
        }
    }

    /**
     * Returns current list of all known DVB Fonts
     * @returns {array} dvbFontList
     */
    function getFonts() {
        return dvbFontList;
    }

    /**
     * Returns dvbFonts relative to a track given a trackId
     * @param {number} - TrackId
     * @returns {array} filtered DVBFontList
     */
    function getFontsForTrackId(trackId) {
        return dvbFontList.filter(font => 
            (font.trackId && font.trackId === trackId)
        );
    }

    function resetInitialSettings() {
        dvbFontList = [];
    }

    /** Reset DVBFonts instance */
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
