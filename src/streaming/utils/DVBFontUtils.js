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
import Constants from '../constants/Constants';
import URLUtils from './URLUtils';

/**
 * @typedef {Object} FontInfo
 * @property {String} fontFamily - Font family name prefixed with 'dashjs-'
 * @property {String} url - Resolved download URL of font
 * @property {String} mimeType - Mimetype of font to download
 * @property {Boolean} isEssential - True if font was described in EssentialProperty descriptor tag
 */

/**
 * @module DVBFontUtils
 * @ignore
 * @description Provides utility functions for DVB font downloads
 */
function DVBFontUtils() {

    let instance;
    let urlUtils;
    const context = this.context;

    function setup() {
        urlUtils = URLUtils(context).getInstance();
    }

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
     * Returns true if objects are equal
     * @return {array} array of FontInfo objects
     * @param {object} track - Track information
     * @param {object} baseUrl - BaseURL of AdaptationSet track is relative to
     * @memberof module:ObjectUtils
     * @instance
     */
    function getFontInfo(track, baseUrl) {
        let essentialProperty = false;
        let dvbFontProps;
        let fonts = [];

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
                fonts.push({
                    fontFamily: _prefixDvbCustomFont(attrs.dvb_fontFamily),
                    url: _resolveFontUrl(attrs.dvb_url, baseUrl),
                    mimeType: attrs.dvb_mimeType,
                    isEssential: essentialProperty
                });
            }
        });

        return fonts;
    }

    setup();
    instance = {
        getFontInfo: getFontInfo
    };

    return instance;
}

DVBFontUtils.__dashjs_factory_name = 'DVBFontUtils';
export default FactoryMaker.getSingletonFactory(DVBFontUtils);
