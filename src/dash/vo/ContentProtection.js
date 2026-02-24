/**
 * The copyright in this software is being made available under the BSD License,
 * included below. This software may be subject to other third party and contributor
 * rights, including patent rights, and no such rights are granted under this license.
 *
 * Copyright (c) 2023, Dash Industry Forum.
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
import CertUrlUtils from '../../streaming/utils/CertUrlUtils.js';
import DescriptorType from './DescriptorType.js'
import DashConstants from '../constants/DashConstants.js';

/**
 * @class
 * @ignore
 */
class ContentProtection extends DescriptorType {

    constructor() {
        super();
        this.ref = null;
        this.refId = null;
        this.robustness = null;
        this.keyId = null;
        this.cencDefaultKid = null;
        this.pssh = null;
        this.pro = null;
        this.laUrl = null;
        this.certUrls = []; // Array of certificate URL descriptors: [{url: string, certType: string|null}]. dash.js treats certType as an opaque label.
    }

    init(data) {
        super.init(data);

        if (data) {
            this.ref = data.hasOwnProperty(DashConstants.REF) ? data[DashConstants.REF] : null;
            this.refId = data.hasOwnProperty(DashConstants.REF_ID) ? data[DashConstants.REF_ID] : null;
            this.robustness = data.hasOwnProperty(DashConstants.ROBUSTNESS) ? data[DashConstants.ROBUSTNESS] : null;
            this.cencDefaultKid = data.hasOwnProperty(DashConstants.CENC_DEFAULT_KID) ? data[DashConstants.CENC_DEFAULT_KID] : null;
            this.pssh = data.hasOwnProperty(DashConstants.PSSH) ? data[DashConstants.PSSH] : null;
            this.pro = data.hasOwnProperty(DashConstants.PRO) ? data[DashConstants.PRO] : null;
            this.laUrl = data.hasOwnProperty(DashConstants.LA_URL) ? data[DashConstants.LA_URL] : data.hasOwnProperty(DashConstants.LA_URL_LOWER_CASE) ? data[DashConstants.LA_URL_LOWER_CASE] : null;
            const rawCert = data.hasOwnProperty(DashConstants.CERT_URL) ? data[DashConstants.CERT_URL] : data.hasOwnProperty(DashConstants.CERT_URL_LOWER_CASE) ? data[DashConstants.CERT_URL_LOWER_CASE] : null;
            this.certUrls = CertUrlUtils.normalizeCertUrls(rawCert);
        }
    }

    mergeAttributesFromReference(reference) {
        let attributesToBeMerged = ['schemeIdUri', 'value', 'id', 'robustness', 'cencDefaultKid', 'pro', 'pssh', 'laUrl']
        attributesToBeMerged.forEach((attribute) => {
            if (this[attribute] === null) {
                this[attribute] = reference[attribute]
            }
        })
        // Merge certUrls: append any from reference that we don't already have (by URL + certType)
        if (reference.certUrls && reference.certUrls.length) {
            const existing = new Set(this.certUrls.map(c => `${c.url}||${c.certType || ''}`));
            reference.certUrls.forEach(c => {
                const key = `${c.url}||${c.certType || ''}`;
                if (!existing.has(key)) {
                    this.certUrls.push({ url: c.url, certType: c.certType || null });
                }
            });
        }
    }
}

export default ContentProtection;
