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

/**
 * @class
 * @ignore
 */

import path from 'path-browserify'
import {UAParser} from 'ua-parser-js'
import Constants from '../streaming/constants/Constants.js';

class Utils {
    static mixin(dest, source, copy) {
        let s;
        let empty = {};
        if (dest) {
            for (let name in source) {
                if (source.hasOwnProperty(name)) {
                    s = source[name];
                    if (!(name in dest) || (dest[name] !== s && (!(name in empty) || empty[name] !== s))) {
                        if (typeof dest[name] === 'object' && dest[name] !== null) {
                            dest[name] = Utils.mixin(dest[name], s, copy);
                        } else {
                            dest[name] = copy(s);
                        }
                    }
                }
            }
        }
        return dest;
    }

    static clone(src) {
        if (!src || typeof src !== 'object') {
            return src; // anything
        }
        if (src instanceof RegExp) {
            return new RegExp(src);
        }
        let r;
        if (src instanceof Array) {
            // array
            r = [];
            for (let i = 0, l = src.length; i < l; ++i) {
                if (i in src) {
                    r.push(Utils.clone(src[i]));
                }
            }
        } else {
            r = {};
        }
        return Utils.mixin(r, src, Utils.clone);
    }

    static addAdditionalQueryParameterToUrl(url, params) {
        try {
            if (!params || params.length === 0) {
                return url;
            }

            let updatedUrl = url;
            params.forEach(({ key, value }) => {
                const separator = updatedUrl.includes('?') ? '&' : '?';
                updatedUrl += `${separator}${(encodeURIComponent(key))}=${(encodeURIComponent(value))}`;
            });
            return updatedUrl;
        } catch (e) {
            return url;
        }
    }

    static parseHttpHeaders(headerStr) {
        let headers = {};
        if (!headerStr) {
            return headers;
        }

        // Trim headerStr to fix a MS Edge bug with xhr.getAllResponseHeaders method
        // which send a string starting with a "\n" character
        let headerPairs = headerStr.trim().split('\u000d\u000a');
        for (let i = 0, ilen = headerPairs.length; i < ilen; i++) {
            let headerPair = headerPairs[i];
            let index = headerPair.indexOf('\u003a\u0020');
            if (index > 0) {
                headers[headerPair.substring(0, index)] = headerPair.substring(index + 2);
            }
        }
        return headers;
    }

    static generateUuid() {
        let dt = new Date().getTime();
        const uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            const r = (dt + Math.random() * 16) % 16 | 0;
            dt = Math.floor(dt / 16);
            return (c == 'x' ? r : (r & 0x3 | 0x8)).toString(16);
        });
        return uuid;
    }

    static generateHashCode(string) {
        let hash = 0;

        if (string.length === 0) {
            return hash;
        }

        for (let i = 0; i < string.length; i++) {
            const chr = string.charCodeAt(i);
            hash = ((hash << 5) - hash) + chr;
            hash |= 0;
        }
        return hash;
    }

    /**
     * Compares both urls and returns a relative url (target relative to original)
     * @param {string} originalUrl
     * @param {string} targetUrl
     * @return {string|*}
     */
    static getRelativeUrl(originalUrl, targetUrl) {
        try {
            const original = new URL(originalUrl);
            const target = new URL(targetUrl);

            // Unify the protocol to compare the origins
            original.protocol = target.protocol;
            if (original.origin !== target.origin) {
                return targetUrl;
            }

            // Use the relative path implementation of the path library. We need to cut off the actual filename in the end to get the relative path
            let relativePath = path.relative(original.pathname.substr(0, original.pathname.lastIndexOf('/')), target.pathname.substr(0, target.pathname.lastIndexOf('/')));

            // In case the relative path is empty (both path are equal) return the filename only. Otherwise add a slash in front of the filename
            const startIndexOffset = relativePath.length === 0 ? 1 : 0;
            relativePath += target.pathname.substr(target.pathname.lastIndexOf('/') + startIndexOffset, target.pathname.length - 1);

            // Build the other candidate, e.g. the 'host relative' path that starts with "/", and return the shortest of the two candidates.
            if (target.pathname.length < relativePath.length) {
                return target.pathname;
            }
            return relativePath;
        } catch (e) {
            return targetUrl
        }
    }

    static getHostFromUrl(urlString) {
        try {
            const url = new URL(urlString);

            return url.host
        } catch (e) {
            return null
        }
    }

    static parseUserAgent(ua = null) {
        try {
            const uaString = ua === null ? typeof navigator !== 'undefined' ? navigator.userAgent.toLowerCase() : '' : '';

            return UAParser(uaString);
        } catch (e) {
            return {};
        }
    }

    /**
     * Checks for existence of "http" or "https" in a string
     * @param string
     * @returns {boolean}
     */
    static stringHasProtocol(string) {
        return (/(http(s?)):\/\//i.test(string))
    }

    static bufferSourceToDataView(bufferSource) {
        return Utils.toDataView(bufferSource, DataView);
    }

    static bufferSourceToInt8(bufferSource) {
        return Utils.toDataView(bufferSource, Uint8Array)
    }

    static bufferSourceToHex(data) {
        const arr = Utils.bufferSourceToInt8(data)
        let hex = '';
        for (let value of arr) {
            value = value.toString(16);
            if (value.length === 1) {
                value = '0' + value;
            }
            hex += value;
        }
        return hex;
    }

    static toDataView(bufferSource, Type) {
        const buffer = Utils.getArrayBuffer(bufferSource);
        let bytesPerElement = 1;
        if ('BYTES_PER_ELEMENT' in DataView) {
            bytesPerElement = DataView.BYTES_PER_ELEMENT;
        }

        const dataEnd = ((bufferSource.byteOffset || 0) + bufferSource.byteLength) /
            bytesPerElement;
        const rawStart = ((bufferSource.byteOffset || 0)) / bytesPerElement;
        const start = Math.floor(Math.max(0, Math.min(rawStart, dataEnd)));
        const end = Math.floor(Math.min(start + Math.max(Infinity, 0), dataEnd));
        return new Type(buffer, start, end - start);
    }

    static getArrayBuffer(view) {
        if (view instanceof ArrayBuffer) {
            return view;
        } else {
            return view.buffer;
        }
    }

    static getCodecFamily(codecString) {
        const { base, profile } = Utils._getCodecParts(codecString)

        switch (base) {
            case 'mp4a':
                switch (profile) {
                    case '69':
                    case '6b':
                    case '40.34':
                        return Constants.CODEC_FAMILIES.MP3
                    case '66':
                    case '67':
                    case '68':
                    case '40.2':
                    case '40.02':
                    case '40.5':
                    case '40.05':
                    case '40.29':
                    case '40.42':
                        return Constants.CODEC_FAMILIES.AAC
                    case 'a5':
                        return Constants.CODEC_FAMILIES.AC3
                    case 'e6':
                        return Constants.CODEC_FAMILIES.EC3
                    case 'b2':
                        return Constants.CODEC_FAMILIES.DTSX
                    case 'a9':
                        return Constants.CODEC_FAMILIES.DTSC
                }
                break;
            case 'avc1':
            case 'avc3':
                return Constants.CODEC_FAMILIES.AVC
            case 'hvc1':
            case 'hvc3':
                return Constants.CODEC_FAMILIES.HEVC
            default:
                return base
        }

        return base;
    }

    static _getCodecParts(codecString) {
        const [base, ...rest] = codecString.split('.');
        const profile = rest.join('.');
        return { base, profile };
    }

}

export default Utils;
