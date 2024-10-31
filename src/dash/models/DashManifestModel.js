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
import AdaptationSet from '../vo/AdaptationSet.js';
import BaseURL from '../vo/BaseURL.js';
import CMCDParameters from '../vo/CMCDParameters.js';
import ClientDataReporting from '../vo/ClientDataReporting.js';
import Constants from '../../streaming/constants/Constants.js';
import ContentProtection from '../vo/ContentProtection.js';
import ContentSteering from '../vo/ContentSteering.js';
import DashConstants from '../constants/DashConstants.js';
import DashJSError from '../../streaming/vo/DashJSError.js';
import Debug from '../../core/Debug.js';
import DescriptorType from '../vo/DescriptorType.js';
import Errors from '../../core/errors/Errors.js';
import Event from '../vo/Event.js';
import EventStream from '../vo/EventStream.js';
import FactoryMaker from '../../core/FactoryMaker.js';
import Mpd from '../vo/Mpd.js';
import MpdLocation from '../vo/MpdLocation.js';
import ObjectUtils from '../../streaming/utils/ObjectUtils.js';
import PatchLocation from '../vo/PatchLocation.js';
import Period from '../vo/Period.js';
import ProducerReferenceTime from '../vo/ProducerReferenceTime.js';
import Representation from '../vo/Representation.js';
import URLUtils from '../../streaming/utils/URLUtils.js';
import UTCTiming from '../vo/UTCTiming.js';
import Utils from '../../core/Utils.js';

function DashManifestModel() {
    let instance,
        logger,
        errHandler,
        BASE64;

    const context = this.context;
    const urlUtils = URLUtils(context).getInstance();

    const isInteger = Number.isInteger || function (value) {
        return typeof value === 'number' &&
            isFinite(value) &&
            Math.floor(value) === value;
    };

    function setup() {
        logger = Debug(context).getInstance().getLogger(instance);
    }

    function getIsTypeOf(adaptation, type) {
        if (!adaptation) {
            throw new Error('adaptation is not defined');
        }

        if (!type) {
            throw new Error('type is not defined');
        }

        // Check for thumbnail images
        if (adaptation.Representation && adaptation.Representation.length) {
            const essentialProperties = getEssentialPropertiesForRepresentation(adaptation.Representation[0]);
            if (essentialProperties && essentialProperties.some(essentialProperty => Constants.THUMBNAILS_SCHEME_ID_URIS.indexOf(essentialProperty.schemeIdUri) >= 0)) {
                return (type === Constants.IMAGE);
            }
        }

        // Check ContentComponent.contentType
        if (adaptation.ContentComponent && adaptation.ContentComponent.length > 0) {
            if (adaptation.ContentComponent.length > 1) {
                return (type === Constants.MUXED);
            } else if (adaptation.ContentComponent[0].contentType === type) {
                return true;
            }
        }

        const mimeTypeRegEx = (type === Constants.TEXT) ? new RegExp('(ttml|vtt|wvtt|stpp)') : new RegExp(type);

        // Check codecs
        if (adaptation.Representation && adaptation.Representation.length) {
            const codecs = adaptation.Representation[0].codecs;
            if (mimeTypeRegEx.test(codecs)) {
                return true;
            }
        }

        // Check Adaptation's mimeType
        if (adaptation.hasOwnProperty(DashConstants.MIME_TYPE)) {
            return mimeTypeRegEx.test(adaptation.mimeType);
        }

        // Check Representation's mimeType
        if (adaptation.Representation) {
            let representation;
            for (let i = 0; i < adaptation.Representation.length; i++) {
                representation = adaptation.Representation[i];
                if (representation.hasOwnProperty(DashConstants.MIME_TYPE)) {
                    return mimeTypeRegEx.test(representation.mimeType);
                }
            }
        }

        return false;
    }

    function getIsFragmented(adaptation) {
        if (!adaptation) {
            throw new Error('adaptation is not defined');
        }
        if (adaptation.hasOwnProperty(DashConstants.SEGMENT_TEMPLATE) ||
            adaptation.hasOwnProperty(DashConstants.SEGMENT_TIMELINE) ||
            adaptation.hasOwnProperty(DashConstants.SEGMENT_LIST) ||
            adaptation.hasOwnProperty(DashConstants.SEGMENT_BASE)) {
            return true;
        }
        if (adaptation.Representation && adaptation.Representation.length > 0) {
            const representation = adaptation.Representation[0];
            if (representation.hasOwnProperty(DashConstants.SEGMENT_TEMPLATE) ||
                representation.hasOwnProperty(DashConstants.SEGMENT_TIMELINE) ||
                representation.hasOwnProperty(DashConstants.SEGMENT_LIST) ||
                representation.hasOwnProperty(DashConstants.SEGMENT_BASE)) {
                return true;
            }
        }
        return false;
    }

    function getIsAudio(adaptation) {
        return getIsTypeOf(adaptation, Constants.AUDIO);
    }

    function getIsVideo(adaptation) {
        return getIsTypeOf(adaptation, Constants.VIDEO);
    }

    function getIsText(adaptation) {
        return getIsTypeOf(adaptation, Constants.TEXT);
    }

    function getIsMuxed(adaptation) {
        return getIsTypeOf(adaptation, Constants.MUXED);
    }

    function getIsImage(adaptation) {
        return getIsTypeOf(adaptation, Constants.IMAGE);
    }

    function getProducerReferenceTimesForAdaptation(adaptation) {
        const prtArray = adaptation && adaptation.hasOwnProperty(DashConstants.PRODUCER_REFERENCE_TIME) ? adaptation[DashConstants.PRODUCER_REFERENCE_TIME] : [];

        // ProducerReferenceTime elements can also be contained in Representations
        const representationsArray = adaptation && adaptation.hasOwnProperty(DashConstants.REPRESENTATION) ? adaptation[DashConstants.REPRESENTATION] : [];

        representationsArray.forEach((rep) => {
            if (rep.hasOwnProperty(DashConstants.PRODUCER_REFERENCE_TIME)) {
                prtArray.push(...rep[DashConstants.PRODUCER_REFERENCE_TIME]);
            }
        });

        const prtsForAdaptation = [];

        // Unlikely to have multiple ProducerReferenceTimes.
        prtArray.forEach((prt) => {
            const entry = new ProducerReferenceTime();

            if (prt.hasOwnProperty(DashConstants.ID)) {
                entry[DashConstants.ID] = prt[DashConstants.ID];
            } else {
                // Ignore. Missing mandatory attribute
                return;
            }

            if (prt.hasOwnProperty(DashConstants.WALL_CLOCK_TIME)) {
                entry[DashConstants.WALL_CLOCK_TIME] = prt[DashConstants.WALL_CLOCK_TIME];
            } else {
                // Ignore. Missing mandatory attribute
                return;
            }

            if (prt.hasOwnProperty(DashConstants.PRESENTATION_TIME)) {
                entry[DashConstants.PRESENTATION_TIME] = prt[DashConstants.PRESENTATION_TIME];
            } else {
                // Ignore. Missing mandatory attribute
                return;
            }

            if (prt.hasOwnProperty(DashConstants.INBAND)) {
                entry[DashConstants.INBAND] = prt[DashConstants.INBAND] !== 'false';
            }

            if (prt.hasOwnProperty(DashConstants.TYPE)) {
                entry[DashConstants.TYPE] = prt[DashConstants.TYPE];
            }

            // Not interested in other attributes for now
            // UTC element contained must be same as that in the MPD
            prtsForAdaptation.push(entry);
        })

        return prtsForAdaptation;
    }

    function getLanguageForAdaptation(adaptation) {
        let lang = '';

        if (adaptation && adaptation.hasOwnProperty(DashConstants.LANG)) {
            lang = adaptation.lang;
        }

        return lang;
    }

    function getViewpointForAdaptation(adaptation) {
        if (!adaptation || !adaptation.hasOwnProperty(DashConstants.VIEWPOINT) || !adaptation[DashConstants.VIEWPOINT].length) {
            return [];
        }
        return adaptation[DashConstants.VIEWPOINT].map(viewpoint => {
            const vp = new DescriptorType();
            vp.init(viewpoint);
            return vp
        });
    }

    function getRolesForAdaptation(adaptation) {
        if (!adaptation || !adaptation.hasOwnProperty(DashConstants.ROLE) || !adaptation[DashConstants.ROLE].length) {
            return [];
        }
        return adaptation[DashConstants.ROLE].map(role => {
            const r = new DescriptorType();
            r.init(role);
            return r
        });
    }

    function getAccessibilityForAdaptation(adaptation) {
        if (!adaptation || !adaptation.hasOwnProperty(DashConstants.ACCESSIBILITY) || !adaptation[DashConstants.ACCESSIBILITY].length) {
            return [];
        }
        return adaptation[DashConstants.ACCESSIBILITY].map(accessibility => {
            const a = new DescriptorType();
            a.init(accessibility);
            return a
        });
    }

    function getAudioChannelConfigurationForAdaptation(adaptation) {
        if (!adaptation || !adaptation.hasOwnProperty(DashConstants.AUDIO_CHANNEL_CONFIGURATION) || !adaptation[DashConstants.AUDIO_CHANNEL_CONFIGURATION].length) {
            return [];
        }
        return adaptation[DashConstants.AUDIO_CHANNEL_CONFIGURATION].map(audioChanCfg => {
            const acc = new DescriptorType();
            acc.init(audioChanCfg);
            return acc
        });
    }

    function getAudioChannelConfigurationForRepresentation(representation) {
        if (!representation || !representation.hasOwnProperty(DashConstants.AUDIO_CHANNEL_CONFIGURATION) || !representation[DashConstants.AUDIO_CHANNEL_CONFIGURATION].length) {
            return [];
        }
        return representation[DashConstants.AUDIO_CHANNEL_CONFIGURATION].map(audioChanCfg => {
            const acc = new DescriptorType();
            acc.init(audioChanCfg);
            return acc
        });
    }

    function getRepresentationSortFunction() {
        return (a, b) => a.bandwidth - b.bandwidth;
    }

    function processAdaptation(realAdaptation) {
        if (realAdaptation && realAdaptation.Representation) {
            realAdaptation.Representation.sort(getRepresentationSortFunction());
        }

        return realAdaptation;
    }

    function getRealAdaptations(manifest, periodIndex) {
        return manifest && manifest.Period && isInteger(periodIndex) ? manifest.Period[periodIndex] ? manifest.Period[periodIndex].AdaptationSet : [] : [];
    }

    function getRealPeriods(manifest) {
        return manifest && manifest.Period ? manifest.Period : [];
    }

    function getRealPeriodForIndex(index, manifest) {
        const realPeriods = getRealPeriods(manifest);
        if (realPeriods.length > 0 && isInteger(index)) {
            return realPeriods[index];
        } else {
            return null;
        }
    }

    function getAdaptationForId(id, manifest, periodIndex) {
        const realAdaptations = getRealAdaptations(manifest, periodIndex);
        let i,
            len;

        for (i = 0, len = realAdaptations.length; i < len; i++) {
            if (realAdaptations[i].hasOwnProperty(DashConstants.ID) && realAdaptations[i].id === id) {
                return realAdaptations[i];
            }
        }

        return null;
    }

    function getAdaptationForIndex(index, manifest, periodIndex) {
        const realAdaptations = getRealAdaptations(manifest, periodIndex);
        if (realAdaptations.length > 0 && isInteger(index)) {
            return realAdaptations[index];
        } else {
            return null;
        }
    }

    function getIndexForAdaptation(realAdaptation, manifest, periodIndex) {
        if (!realAdaptation) {
            return -1;
        }

        const realAdaptations = getRealAdaptations(manifest, periodIndex);

        for (let i = 0; i < realAdaptations.length; i++) {
            let objectUtils = ObjectUtils(context).getInstance();
            if (objectUtils.areEqual(realAdaptations[i], realAdaptation)) {
                return i;
            }
        }

        return -1;
    }

    function getAdaptationsForType(manifest, periodIndex, type) {
        const realAdaptations = getRealAdaptations(manifest, periodIndex);
        let i,
            len;
        const adaptations = [];

        for (i = 0, len = realAdaptations.length; i < len; i++) {
            if (getIsTypeOf(realAdaptations[i], type)) {
                adaptations.push(processAdaptation(realAdaptations[i]));
            }
        }

        return adaptations;
    }

    function getCodec(adaptation, representationIndex, addResolutionInfo) {
        let codec = null;

        if (adaptation && adaptation.Representation && adaptation.Representation.length > 0) {
            const representation = isInteger(representationIndex) && representationIndex >= 0 && representationIndex < adaptation.Representation.length ?
                adaptation.Representation[representationIndex] : adaptation.Representation[0];
            if (representation) {
                codec = representation.mimeType + ';codecs="' + representation.codecs + '"';
                if (addResolutionInfo && representation.width !== undefined) {
                    codec += ';width="' + representation.width + '";height="' + representation.height + '"';
                }
            }
        }

        // If the codec contains a profiles parameter we remove it. Otherwise, it will cause problems when checking for codec capabilities of the platform
        if (codec) {
            codec = codec.replace(/\sprofiles=[^;]*/g, '');
        }

        return codec;
    }

    function getMimeType(adaptation) {
        return adaptation && adaptation.Representation && adaptation.Representation.length > 0 ? adaptation.Representation[0].mimeType : null;
    }

    function getSegmentAlignment(adaptation) {
        if (adaptation && adaptation.hasOwnProperty(DashConstants.SEGMENT_ALIGNMENT)) {
            return adaptation[DashConstants.SEGMENT_ALIGNMENT] === 'true'
        }

        return false
    }

    function getSubSegmentAlignment(adaptation) {
        if (adaptation && adaptation.hasOwnProperty(DashConstants.SUB_SEGMENT_ALIGNMENT)) {
            return adaptation[DashConstants.SUB_SEGMENT_ALIGNMENT] === 'true'
        }

        return false
    }

    function getLabelsForAdaptation(adaptation) {
        if (!adaptation || !adaptation.Label) {
            return [];
        }

        const labelArray = [];

        for (let i = 0; i < adaptation.Label.length; i++) {
            labelArray.push({
                lang: adaptation.Label[i].lang,
                text: adaptation.Label[i].__text || adaptation.Label[i]
            });
        }

        return labelArray;
    }

    function isPeriodEncrypted(period) {
        const contentProtectionElements = getContentProtectionByPeriod(period);

        return contentProtectionElements && contentProtectionElements.length > 0;
    }

    function getContentProtectionByManifest(manifest) {
        let protectionElements = [];

        if (!manifest) {
            return protectionElements
        }

        const mpdElements = _getContentProtectionFromElement(manifest);
        protectionElements = protectionElements.concat(mpdElements);

        if (manifest.hasOwnProperty(DashConstants.PERIOD) && manifest[DashConstants.PERIOD].length > 0) {
            manifest[DashConstants.PERIOD].forEach((period) => {
                const curr = getContentProtectionByPeriod(period)
                protectionElements = protectionElements.concat(curr);
            })
        }

        return protectionElements
    }

    function getContentProtectionByPeriod(period) {
        let protectionElements = [];

        if (!period) {
            return protectionElements
        }

        const periodProtectionElements = _getContentProtectionFromElement(period);
        protectionElements = protectionElements.concat(periodProtectionElements);

        if (period.hasOwnProperty(DashConstants.ADAPTATION_SET) && period[DashConstants.ADAPTATION_SET].length > 0) {
            period[DashConstants.ADAPTATION_SET].forEach((as) => {
                const curr = _getContentProtectionFromElement(as);
                protectionElements = protectionElements.concat(curr);
            })
        }

        return protectionElements
    }

    function getContentProtectionByAdaptation(adaptation) {
        return _getContentProtectionFromElement(adaptation);
    }

    function _getContentProtectionFromElement(element) {
        if (!element || !element.hasOwnProperty(DashConstants.CONTENT_PROTECTION) || element.ContentProtection.length === 0) {
            return [];
        }

        return element[DashConstants.CONTENT_PROTECTION].map(contentProtectionData => {
            const contentProtection = new ContentProtection();
            contentProtection.init(contentProtectionData);

            return contentProtection
        });
    }

    function getIsDynamic(manifest) {
        let isDynamic = false;
        if (manifest && manifest.hasOwnProperty('type')) {
            isDynamic = (manifest.type === DashConstants.DYNAMIC);
        }
        return isDynamic;
    }

    function getId(manifest) {
        return (manifest && manifest[DashConstants.ID]) || null;
    }

    function hasProfile(manifest, profile) {
        let has = false;

        if (manifest && manifest.profiles && manifest.profiles.length > 0) {
            has = (manifest.profiles.indexOf(profile) !== -1);
        }

        return has;
    }

    function getDuration(manifest) {
        let mpdDuration;
        //@mediaPresentationDuration specifies the duration of the entire Media Presentation.
        //If the attribute is not present, the duration of the Media Presentation is unknown.
        if (manifest && manifest.hasOwnProperty(DashConstants.MEDIA_PRESENTATION_DURATION)) {
            mpdDuration = manifest.mediaPresentationDuration;
        } else if (manifest && manifest.type == 'dynamic') {
            mpdDuration = Number.POSITIVE_INFINITY;
        } else {
            mpdDuration = Number.MAX_SAFE_INTEGER || Number.MAX_VALUE;
        }

        return mpdDuration;
    }

    function getBandwidth(representation) {
        return representation && representation.bandwidth ? representation.bandwidth : NaN;
    }

    function getManifestUpdatePeriod(manifest, latencyOfLastUpdate = 0) {
        let delay = NaN;
        if (manifest && manifest.hasOwnProperty(DashConstants.MINIMUM_UPDATE_PERIOD)) {
            delay = manifest.minimumUpdatePeriod;
        }
        return isNaN(delay) ? delay : Math.max(delay - latencyOfLastUpdate, 1);
    }

    function getPublishTime(manifest) {
        return manifest && manifest.hasOwnProperty(DashConstants.PUBLISH_TIME) ? new Date(manifest[DashConstants.PUBLISH_TIME]) : null;
    }

    function getRepresentationCount(adaptation) {
        return adaptation && adaptation.Representation ? adaptation.Representation.length : 0;
    }

    function getBitrateListForAdaptation(realAdaptation) {
        const processedRealAdaptation = processAdaptation(realAdaptation);
        const realRepresentations = processedRealAdaptation && processedRealAdaptation.Representation ? processedRealAdaptation.Representation : [];

        return realRepresentations.map((realRepresentation) => {
            return {
                bandwidth: realRepresentation.bandwidth,
                width: realRepresentation.width || 0,
                height: realRepresentation.height || 0,
                scanType: realRepresentation.scanType || null,
                id: realRepresentation.id || null
            };
        });
    }

    function getSelectionPriority(realAdaption) {
        try {
            const priority = realAdaption && typeof realAdaption.selectionPriority !== 'undefined' ? parseInt(realAdaption.selectionPriority) : 1;

            return isNaN(priority) ? 1 : priority;
        } catch (e) {
            return 1;
        }
    }

    function getEssentialPropertiesForAdaptationSet(adaptation) {
        if (!adaptation || !adaptation.hasOwnProperty(DashConstants.ESSENTIAL_PROPERTY) || !adaptation[DashConstants.ESSENTIAL_PROPERTY].length) {
            return [];
        }
        return adaptation[DashConstants.ESSENTIAL_PROPERTY].map(essentialProperty => {
            const s = new DescriptorType();
            s.init(essentialProperty);
            return s
        });
    }

    function getEssentialPropertiesForRepresentation(realRepresentation) {
        if (!realRepresentation || !realRepresentation.hasOwnProperty(DashConstants.ESSENTIAL_PROPERTY) || !realRepresentation[DashConstants.ESSENTIAL_PROPERTY].length) {
            return [];
        }

        return realRepresentation[DashConstants.ESSENTIAL_PROPERTY].map((essentialProperty) => {
            const s = new DescriptorType();
            s.init(essentialProperty);
            return s
        });
    }

    function getRepresentationFor(index, adaptation) {
        return adaptation && adaptation.Representation && adaptation.Representation.length > 0 &&
        isInteger(index) ? adaptation.Representation[index] : null;
    }

    function getRealAdaptationFor(voAdaptation) {
        if (voAdaptation && voAdaptation.period && isInteger(voAdaptation.period.index)) {
            const periodArray = voAdaptation.period.mpd.manifest.Period[voAdaptation.period.index];
            if (periodArray && periodArray.AdaptationSet && isInteger(voAdaptation.index)) {
                return processAdaptation(periodArray.AdaptationSet[voAdaptation.index]);
            }
        }
    }

    function getRepresentationsForAdaptation(voAdaptation, mediaInfo) {
        const voRepresentations = [];
        const processedRealAdaptation = getRealAdaptationFor(voAdaptation);
        let segmentInfo,
            baseUrl;

        if (processedRealAdaptation && processedRealAdaptation.Representation) {
            // TODO: TO BE REMOVED. We should get just the baseUrl elements that affects to the representations
            // that we are processing. Making it works properly will require much further changes and given
            // parsing base Urls parameters is needed for our ultra low latency examples, we will
            // keep this "tricky" code until the real (and good) solution comes
            if (voAdaptation && voAdaptation.period && isInteger(voAdaptation.period.index)) {
                const baseUrls = getBaseURLsFromElement(voAdaptation.period.mpd.manifest);
                if (baseUrls) {
                    baseUrl = baseUrls[0];
                }
            }
            for (let i = 0, len = processedRealAdaptation.Representation.length; i < len; ++i) {
                const realRepresentation = processedRealAdaptation.Representation[i];
                const voRepresentation = new Representation();
                voRepresentation.index = i;
                voRepresentation.adaptation = voAdaptation;
                voRepresentation.mediaInfo = mediaInfo;

                if (realRepresentation.hasOwnProperty(DashConstants.ID)) {
                    voRepresentation.id = realRepresentation.id;
                }
                if (realRepresentation.hasOwnProperty(DashConstants.CODECS)) {
                    voRepresentation.codecs = realRepresentation.codecs;
                    voRepresentation.codecFamily = Utils.getCodecFamily(voRepresentation.codecs);
                }
                if (realRepresentation.hasOwnProperty(DashConstants.MIME_TYPE)) {
                    voRepresentation.mimeType = realRepresentation[DashConstants.MIME_TYPE];
                }
                if (realRepresentation.hasOwnProperty(DashConstants.CODEC_PRIVATE_DATA)) {
                    voRepresentation.codecPrivateData = realRepresentation.codecPrivateData;
                }
                if (realRepresentation.hasOwnProperty(DashConstants.BANDWITH)) {
                    voRepresentation.bandwidth = realRepresentation.bandwidth;
                    voRepresentation.bitrateInKbit = realRepresentation.bandwidth / 1000;
                }
                if (realRepresentation.hasOwnProperty(DashConstants.WIDTH)) {
                    voRepresentation.width = realRepresentation.width;
                }
                if (realRepresentation.hasOwnProperty(DashConstants.HEIGHT)) {
                    voRepresentation.height = realRepresentation.height;
                }
                if (realRepresentation.hasOwnProperty(DashConstants.SCAN_TYPE)) {
                    voRepresentation.scanType = realRepresentation.scanType;
                }
                if (realRepresentation.hasOwnProperty(DashConstants.FRAMERATE)) {
                    const frameRate = realRepresentation[DashConstants.FRAMERATE];
                    if (isNaN(frameRate) && frameRate.includes('/')) {
                        const parts = frameRate.split('/');
                        if (parts.length === 2) {
                            const numerator = parseFloat(parts[0]);
                            const denominator = parseFloat(parts[1]);

                            if (!isNaN(numerator) && !isNaN(denominator) && denominator !== 0) {
                                voRepresentation.frameRate = numerator / denominator;
                            }
                        }
                    } else {
                        voRepresentation.frameRate = frameRate
                    }
                }
                if (realRepresentation.hasOwnProperty(DashConstants.QUALITY_RANKING)) {
                    voRepresentation.qualityRanking = realRepresentation[DashConstants.QUALITY_RANKING];
                }
                if (realRepresentation.hasOwnProperty(DashConstants.MAX_PLAYOUT_RATE)) {
                    voRepresentation.maxPlayoutRate = realRepresentation.maxPlayoutRate;
                }

                if (realRepresentation.hasOwnProperty(DashConstants.SEGMENT_BASE)) {
                    segmentInfo = realRepresentation.SegmentBase;
                    voRepresentation.segmentInfoType = DashConstants.SEGMENT_BASE;
                } else if (realRepresentation.hasOwnProperty(DashConstants.SEGMENT_LIST)) {
                    segmentInfo = realRepresentation.SegmentList;

                    if (segmentInfo.hasOwnProperty(DashConstants.SEGMENT_TIMELINE)) {
                        voRepresentation.segmentInfoType = DashConstants.SEGMENT_TIMELINE;
                    } else {
                        voRepresentation.segmentInfoType = DashConstants.SEGMENT_LIST;
                    }
                } else if (realRepresentation.hasOwnProperty(DashConstants.SEGMENT_TEMPLATE)) {
                    segmentInfo = realRepresentation.SegmentTemplate;

                    if (segmentInfo.hasOwnProperty(DashConstants.SEGMENT_TIMELINE)) {
                        voRepresentation.segmentInfoType = DashConstants.SEGMENT_TIMELINE;
                    } else {
                        voRepresentation.segmentInfoType = DashConstants.SEGMENT_TEMPLATE;
                    }

                    if (segmentInfo.hasOwnProperty(DashConstants.INITIALIZATION_MINUS)) {
                        voRepresentation.initialization = segmentInfo.initialization.split('$Bandwidth$')
                            .join(realRepresentation.bandwidth).split('$RepresentationID$').join(realRepresentation.id);
                    }
                } else {
                    voRepresentation.segmentInfoType = DashConstants.BASE_URL;
                }

                voRepresentation.essentialProperties = getEssentialPropertiesForRepresentation(realRepresentation);
                voRepresentation.supplementalProperties = getSupplementalPropertiesForRepresentation(realRepresentation);

                if (segmentInfo) {
                    if (segmentInfo.hasOwnProperty(DashConstants.INITIALIZATION)) {
                        const initialization = segmentInfo.Initialization;

                        if (initialization.hasOwnProperty(DashConstants.SOURCE_URL)) {
                            voRepresentation.initialization = initialization.sourceURL;
                        }

                        if (initialization.hasOwnProperty(DashConstants.RANGE)) {
                            voRepresentation.range = initialization.range;
                            // initialization source url will be determined from
                            // BaseURL when resolved at load time.
                        }
                    } else if (getIsText(processedRealAdaptation) &&
                        getIsFragmented(processedRealAdaptation) &&
                        processedRealAdaptation.mimeType &&
                        processedRealAdaptation.mimeType.indexOf('application/mp4') === -1) {
                        voRepresentation.range = 0;
                    }

                    if (segmentInfo.hasOwnProperty(DashConstants.TIMESCALE)) {
                        voRepresentation.timescale = segmentInfo.timescale;
                    }
                    if (segmentInfo.hasOwnProperty(DashConstants.DURATION)) {
                        // TODO according to the spec @maxSegmentDuration specifies the maximum duration of any Segment in any Representation in the Media Presentation
                        // It is also said that for a SegmentTimeline any @d value shall not exceed the value of MPD@maxSegmentDuration, but nothing is said about
                        // SegmentTemplate @duration attribute. We need to find out if @maxSegmentDuration should be used instead of calculated duration if the the duration
                        // exceeds @maxSegmentDuration
                        voRepresentation.segmentDuration = segmentInfo.duration / voRepresentation.timescale;
                    } else if (realRepresentation.hasOwnProperty(DashConstants.SEGMENT_TEMPLATE)) {
                        segmentInfo = realRepresentation.SegmentTemplate;

                        if (segmentInfo.hasOwnProperty(DashConstants.SEGMENT_TIMELINE)) {
                            voRepresentation.segmentDuration = calcSegmentDuration(segmentInfo.SegmentTimeline) / voRepresentation.timescale;
                        }
                    }
                    if (segmentInfo.hasOwnProperty(DashConstants.MEDIA)) {
                        voRepresentation.media = segmentInfo.media;
                    }
                    if (segmentInfo.hasOwnProperty(DashConstants.START_NUMBER)) {
                        voRepresentation.startNumber = parseInt(segmentInfo.startNumber);
                    }
                    if (segmentInfo.hasOwnProperty(DashConstants.INDEX_RANGE)) {
                        voRepresentation.indexRange = segmentInfo.indexRange;
                    }
                    if (segmentInfo.hasOwnProperty(DashConstants.PRESENTATION_TIME_OFFSET)) {
                        voRepresentation.presentationTimeOffset = segmentInfo.presentationTimeOffset / voRepresentation.timescale;
                    }
                    if (segmentInfo.hasOwnProperty(DashConstants.AVAILABILITY_TIME_OFFSET)) {
                        voRepresentation.availabilityTimeOffset = segmentInfo.availabilityTimeOffset;
                    } else if (baseUrl && baseUrl.availabilityTimeOffset !== undefined) {
                        voRepresentation.availabilityTimeOffset = baseUrl.availabilityTimeOffset;
                    }
                    if (segmentInfo.hasOwnProperty(DashConstants.AVAILABILITY_TIME_COMPLETE)) {
                        voRepresentation.availabilityTimeComplete = segmentInfo.availabilityTimeComplete !== 'false';
                    } else if (baseUrl && baseUrl.availabilityTimeComplete !== undefined) {
                        voRepresentation.availabilityTimeComplete = baseUrl.availabilityTimeComplete;
                    }
                }

                voRepresentation.mseTimeOffset = calcMseTimeOffset(voRepresentation);
                voRepresentation.path = [voAdaptation.period.index, voAdaptation.index, i];

                if (!isNaN(voRepresentation.width) && !isNaN(voRepresentation.height) && !isNaN(voRepresentation.frameRate)) {
                    voRepresentation.pixelsPerSecond = Math.max(1, voRepresentation.width * voRepresentation.height * voRepresentation.frameRate)
                    if (!isNaN(voRepresentation.bandwidth)) {
                        voRepresentation.bitsPerPixel = voRepresentation.bandwidth / voRepresentation.pixelsPerSecond
                    }
                }

                voRepresentations.push(voRepresentation);
            }
        }

        return voRepresentations;
    }

    function calcSegmentDuration(segmentTimeline) {
        if (!segmentTimeline || !segmentTimeline.S) {
            return NaN;
        }
        let s0 = segmentTimeline.S[0];
        let s1 = segmentTimeline.S[1];
        return s0.hasOwnProperty('d') ? s0.d : (s1.t - s0.t);
    }

    function calcMseTimeOffset(representation) {
        // The MSEOffset is offset from AST for media. It is Period@start - presentationTimeOffset
        const presentationOffset = representation.presentationTimeOffset;
        const periodStart = representation.adaptation.period.start;
        return (periodStart - presentationOffset);
    }

    function getAdaptationsForPeriod(voPeriod) {
        const realPeriod = voPeriod && isInteger(voPeriod.index) ? voPeriod.mpd.manifest.Period[voPeriod.index] : null;
        const voAdaptations = [];
        let voAdaptationSet,
            realAdaptationSet,
            i;

        if (realPeriod && realPeriod.AdaptationSet) {
            for (i = 0; i < realPeriod.AdaptationSet.length; i++) {
                realAdaptationSet = realPeriod.AdaptationSet[i];
                voAdaptationSet = new AdaptationSet();
                if (realAdaptationSet.hasOwnProperty(DashConstants.ID)) {
                    voAdaptationSet.id = realAdaptationSet.id;
                }
                voAdaptationSet.index = i;
                voAdaptationSet.period = voPeriod;

                if (getIsMuxed(realAdaptationSet)) {
                    voAdaptationSet.type = Constants.MUXED;
                } else if (getIsAudio(realAdaptationSet)) {
                    voAdaptationSet.type = Constants.AUDIO;
                } else if (getIsVideo(realAdaptationSet)) {
                    voAdaptationSet.type = Constants.VIDEO;
                } else if (getIsText(realAdaptationSet)) {
                    voAdaptationSet.type = Constants.TEXT;
                } else if (getIsImage(realAdaptationSet)) {
                    voAdaptationSet.type = Constants.IMAGE;
                } else {
                    logger.warn('Unknown Adaptation stream type');
                }
                voAdaptations.push(voAdaptationSet);
            }
        }

        return voAdaptations;
    }

    function getRegularPeriods(mpd) {
        const isDynamic = mpd ? getIsDynamic(mpd.manifest) : false;
        const voPeriods = [];
        let realPreviousPeriod = null;
        let realPeriod = null;
        let voPreviousPeriod = null;
        let voPeriod = null;
        let len,
            i;

        for (i = 0, len = mpd && mpd.manifest && mpd.manifest.Period ? mpd.manifest.Period.length : 0; i < len; i++) {
            realPeriod = mpd.manifest.Period[i];

            // If the attribute @start is present in the Period, then the
            // Period is a regular Period and the PeriodStart is equal
            // to the value of this attribute.
            if (realPeriod.hasOwnProperty(DashConstants.START)) {
                voPeriod = new Period();
                voPeriod.start = realPeriod.start;
            }
            // If the @start attribute is absent, but the previous Period element contains a @duration attribute then this new Period is also a regular Period. The start time of the new Period PeriodStart is the sum of the start time of the previous Period PeriodStart and the value of the attribute @duration of the previous Period.
            else if (realPreviousPeriod !== null && realPreviousPeriod.hasOwnProperty(DashConstants.DURATION) && voPreviousPeriod !== null) {
                voPeriod = new Period();
                voPeriod.start = parseFloat((voPreviousPeriod.start + voPreviousPeriod.duration).toFixed(5));
            }
            // If (i) @start attribute is absent, and (ii) the Period element is the first in the MPD, and (iii) the MPD@type is 'static', then the PeriodStart time shall be set to zero.
            else if (i === 0 && !isDynamic) {
                voPeriod = new Period();
                voPeriod.start = 0;
            }

            // The Period extends until the PeriodStart of the next Period.
            // The difference between the PeriodStart time of a Period and
            // the PeriodStart time of the following Period.
            if (voPreviousPeriod !== null && isNaN(voPreviousPeriod.duration)) {
                if (voPeriod !== null) {
                    voPreviousPeriod.duration = parseFloat((voPeriod.start - voPreviousPeriod.start).toFixed(5));
                } else {
                    logger.warn('First period duration could not be calculated because lack of start and duration period properties. This will cause timing issues during playback');
                }
            }

            if (voPeriod !== null) {
                voPeriod.id = getPeriodId(realPeriod, i);
                voPeriod.index = i;
                voPeriod.mpd = mpd;
                voPeriod.isEncrypted = isPeriodEncrypted(realPeriod);

                if (realPeriod.hasOwnProperty(DashConstants.DURATION)) {
                    voPeriod.duration = realPeriod.duration;
                }

                if (voPreviousPeriod) {
                    voPreviousPeriod.nextPeriodId = voPeriod.id;
                }

                voPeriods.push(voPeriod);
                realPreviousPeriod = realPeriod;
                voPreviousPeriod = voPeriod;
            }

            realPeriod = null;
            voPeriod = null;
        }

        if (voPeriods.length === 0) {
            return voPeriods;
        }

        // The last Period extends until the end of the Media Presentation.
        // The difference between the PeriodStart time of the last Period
        // and the mpd duration
        if (voPreviousPeriod !== null && isNaN(voPreviousPeriod.duration)) {
            voPreviousPeriod.duration = parseFloat((getEndTimeForLastPeriod(voPreviousPeriod) - voPreviousPeriod.start).toFixed(5));
        }

        return voPeriods;
    }

    function getPeriodId(realPeriod, i) {
        if (!realPeriod) {
            throw new Error('Period cannot be null or undefined');
        }

        let id = Period.DEFAULT_ID + '_' + i;

        if (realPeriod.hasOwnProperty(DashConstants.ID) && realPeriod.id.toString().length > 0 && realPeriod.id !== '__proto__') {
            id = realPeriod.id.toString();
        }

        return id;
    }

    function getMpd(manifest) {
        const mpd = new Mpd();

        if (manifest) {
            mpd.manifest = manifest;

            if (manifest.hasOwnProperty(DashConstants.AVAILABILITY_START_TIME)) {
                mpd.availabilityStartTime = new Date(manifest.availabilityStartTime.getTime());
            } else {
                if (manifest.loadedTime) {
                    mpd.availabilityStartTime = new Date(manifest.loadedTime.getTime());
                }
            }

            if (manifest.hasOwnProperty(DashConstants.AVAILABILITY_END_TIME)) {
                mpd.availabilityEndTime = new Date(manifest.availabilityEndTime.getTime());
            }

            if (manifest.hasOwnProperty(DashConstants.MINIMUM_UPDATE_PERIOD)) {
                mpd.minimumUpdatePeriod = manifest.minimumUpdatePeriod;
            }

            if (manifest.hasOwnProperty(DashConstants.MEDIA_PRESENTATION_DURATION)) {
                mpd.mediaPresentationDuration = manifest.mediaPresentationDuration;
            }

            if (manifest.hasOwnProperty(DashConstants.SUGGESTED_PRESENTATION_DELAY)) {
                mpd.suggestedPresentationDelay = manifest.suggestedPresentationDelay;
            }

            if (manifest.hasOwnProperty(DashConstants.TIMESHIFT_BUFFER_DEPTH)) {
                mpd.timeShiftBufferDepth = manifest.timeShiftBufferDepth;
            }

            if (manifest.hasOwnProperty(DashConstants.MAX_SEGMENT_DURATION)) {
                mpd.maxSegmentDuration = manifest.maxSegmentDuration;
            }

            if (manifest.hasOwnProperty(DashConstants.PUBLISH_TIME)) {
                mpd.publishTime = new Date(manifest.publishTime);
            }
        }

        return mpd;
    }

    function checkConfig() {
        if (!errHandler || !errHandler.hasOwnProperty('error')) {
            throw new Error(Constants.MISSING_CONFIG_ERROR);
        }
    }

    function getEndTimeForLastPeriod(voPeriod) {
        checkConfig();
        const isDynamic = getIsDynamic(voPeriod.mpd.manifest);

        let periodEnd;
        if (voPeriod.mpd.manifest.mediaPresentationDuration) {
            periodEnd = voPeriod.mpd.manifest.mediaPresentationDuration;
        } else if (voPeriod.duration) {
            periodEnd = voPeriod.duration;
        } else if (isDynamic) {
            periodEnd = Number.POSITIVE_INFINITY;
        } else {
            errHandler.error(new DashJSError(Errors.MANIFEST_ERROR_ID_PARSE_CODE, 'Must have @mediaPresentationDuration on MPD or an explicit @duration on the last period.', voPeriod));
        }

        return periodEnd;
    }

    function getEventsForPeriod(period) {
        const manifest = period && period.mpd && period.mpd.manifest ? period.mpd.manifest : null;
        const periodArray = manifest ? manifest.Period : null;
        const eventStreams = periodArray && period && isInteger(period.index) ? periodArray[period.index].EventStream : null;
        const events = [];
        let i,
            j;

        if (eventStreams) {
            for (i = 0; i < eventStreams.length; i++) {
                const eventStream = new EventStream();
                eventStream.period = period;
                eventStream.timescale = 1;

                if (eventStreams[i].hasOwnProperty(Constants.SCHEME_ID_URI)) {
                    eventStream.schemeIdUri = eventStreams[i][Constants.SCHEME_ID_URI];
                } else {
                    throw new Error('Invalid EventStream. SchemeIdUri has to be set');
                }
                if (eventStreams[i].hasOwnProperty(DashConstants.TIMESCALE)) {
                    eventStream.timescale = eventStreams[i][DashConstants.TIMESCALE];
                }
                if (eventStreams[i].hasOwnProperty(DashConstants.VALUE)) {
                    eventStream.value = eventStreams[i][DashConstants.VALUE];
                }
                if (eventStreams[i].hasOwnProperty(DashConstants.PRESENTATION_TIME_OFFSET)) {
                    eventStream.presentationTimeOffset = eventStreams[i][DashConstants.PRESENTATION_TIME_OFFSET];
                }
                for (j = 0; eventStreams[i].Event && j < eventStreams[i].Event.length; j++) {
                    const currentMpdEvent = eventStreams[i].Event[j];
                    const event = new Event();
                    event.presentationTime = 0;
                    event.eventStream = eventStream;

                    if (currentMpdEvent.hasOwnProperty(DashConstants.PRESENTATION_TIME)) {
                        event.presentationTime = currentMpdEvent.presentationTime;
                    }
                    const presentationTimeOffset = eventStream.presentationTimeOffset ? eventStream.presentationTimeOffset / eventStream.timescale : 0;
                    event.calculatedPresentationTime = event.presentationTime / eventStream.timescale + period.start - presentationTimeOffset;

                    if (currentMpdEvent.hasOwnProperty(DashConstants.DURATION)) {
                        event.duration = currentMpdEvent.duration / eventStream.timescale;
                    }
                    if (currentMpdEvent.hasOwnProperty(DashConstants.ID)) {
                        event.id = currentMpdEvent.id;
                    } else {
                        event.id = null;
                    }

                    if (currentMpdEvent.Signal && currentMpdEvent.Signal.Binary) {
                        // toString is used to manage both regular and namespaced tags
                        event.messageData = BASE64.decodeArray(currentMpdEvent.Signal.Binary.toString());
                    } else {
                        // From Cor.1: 'NOTE: this attribute is an alternative
                        // to specifying a complete XML element(s) in the Event.
                        // It is useful when an event leans itself to a compact
                        // string representation'.
                        event.messageData =
                            currentMpdEvent.messageData ||
                            currentMpdEvent.__cdata ||
                            currentMpdEvent.__text;
                    }

                    events.push(event);
                }
            }
        }

        return events;
    }

    function getEventStreams(inbandStreams, representation, period) {
        const eventStreams = [];
        let i;

        if (!inbandStreams) {
            return eventStreams;
        }

        for (i = 0; i < inbandStreams.length; i++) {
            const eventStream = new EventStream();
            eventStream.timescale = 1;
            eventStream.representation = representation;

            if (inbandStreams[i].hasOwnProperty(Constants.SCHEME_ID_URI)) {
                eventStream.schemeIdUri = inbandStreams[i].schemeIdUri;
            } else {
                throw new Error('Invalid EventStream. SchemeIdUri has to be set');
            }
            if (inbandStreams[i].hasOwnProperty(DashConstants.TIMESCALE)) {
                eventStream.timescale = inbandStreams[i].timescale;
            }
            if (inbandStreams[i].hasOwnProperty(DashConstants.VALUE)) {
                eventStream.value = inbandStreams[i].value;
            }
            eventStreams.push(eventStream);
            eventStream.period = period;
        }

        return eventStreams;
    }

    function getEventStreamForAdaptationSet(manifest, adaptation, period) {
        let inbandStreams,
            periodArray,
            adaptationArray;

        if (manifest && manifest.Period && adaptation && adaptation.period && isInteger(adaptation.period.index)) {
            periodArray = manifest.Period[adaptation.period.index];
            if (periodArray && periodArray.AdaptationSet && isInteger(adaptation.index)) {
                adaptationArray = periodArray.AdaptationSet[adaptation.index];
                if (adaptationArray) {
                    inbandStreams = adaptationArray.InbandEventStream;
                }
            }
        }

        return getEventStreams(inbandStreams, null, period);
    }

    function getEventStreamForRepresentation(manifest, representation, period) {
        let inbandStreams,
            periodArray,
            adaptationArray,
            representationArray;

        if (manifest && manifest.Period && representation && representation.adaptation && representation.adaptation.period && isInteger(representation.adaptation.period.index)) {
            periodArray = manifest.Period[representation.adaptation.period.index];
            if (periodArray && periodArray.AdaptationSet && isInteger(representation.adaptation.index)) {
                adaptationArray = periodArray.AdaptationSet[representation.adaptation.index];
                if (adaptationArray && adaptationArray.Representation && isInteger(representation.index)) {
                    representationArray = adaptationArray.Representation[representation.index];
                    if (representationArray) {
                        inbandStreams = representationArray.InbandEventStream;
                    }
                }
            }
        }

        return getEventStreams(inbandStreams, representation, period);
    }

    function getUTCTimingSources(manifest) {
        const isDynamic = getIsDynamic(manifest);
        const hasAST = manifest ? manifest.hasOwnProperty(DashConstants.AVAILABILITY_START_TIME) : false;
        const utcTimingsArray = manifest ? manifest.UTCTiming : null;
        const utcTimingEntries = [];

        // do not bother synchronizing the clock unless MPD is live,
        // or it is static and has availabilityStartTime attribute
        if ((isDynamic || hasAST)) {
            if (utcTimingsArray) {
                // the order is important here - 23009-1 states that the order
                // in the manifest "indicates relative preference, first having
                // the highest, and the last the lowest priority".
                utcTimingsArray.forEach(function (utcTiming) {
                    const entry = new UTCTiming();

                    if (utcTiming.hasOwnProperty(Constants.SCHEME_ID_URI)) {
                        entry.schemeIdUri = utcTiming.schemeIdUri;
                    } else {
                        // entries of type DescriptorType with no schemeIdUri
                        // are meaningless. let's just ignore this entry and
                        // move on.
                        return;
                    }

                    // this is (incorrectly) interpreted as a number - schema
                    // defines it as a string
                    if (utcTiming.hasOwnProperty(DashConstants.VALUE)) {
                        entry.value = utcTiming.value.toString();
                    } else {
                        // without a value, there's not a lot we can do with
                        // this entry. let's just ignore this one and move on
                        return;
                    }

                    // we're not interested in the optional id or any other
                    // attributes which might be attached to the entry

                    utcTimingEntries.push(entry);
                });
            }
        }

        return utcTimingEntries;
    }

    function getBaseURLsFromElement(node) {
        const baseUrls = [];
        // if node.BaseURL and node.baseUri are undefined entries
        // will be [undefined] which entries.some will just skip
        const entries = node.BaseURL || [node.baseUri];
        let earlyReturn = false;

        entries.some(entry => {
            if (entry) {
                const baseUrl = new BaseURL();
                let text = entry.__text || entry;

                if (urlUtils.isRelative(text)) {
                    // it doesn't really make sense to have relative and
                    // absolute URLs at the same level, or multiple
                    // relative URLs at the same level, so assume we are
                    // done from this level of the MPD
                    earlyReturn = true;

                    // deal with the specific case where the MPD@BaseURL
                    // is specified and is relative. when no MPD@BaseURL
                    // entries exist, that case is handled by the
                    // [node.baseUri] in the entries definition.
                    if (node.baseUri) {
                        text = urlUtils.resolve(text, node.baseUri);
                    }
                }

                baseUrl.url = text;

                // serviceLocation is optional, but we need it in order
                // to blacklist correctly. if it's not available, use
                // anything unique since there's no relationship to any
                // other BaseURL and, in theory, the url should be
                // unique so use this instead.
                if (entry.hasOwnProperty(DashConstants.SERVICE_LOCATION) &&
                    entry.serviceLocation.length) {
                    baseUrl.serviceLocation = entry.serviceLocation;
                } else {
                    baseUrl.serviceLocation = text;
                }

                if (entry.hasOwnProperty(DashConstants.DVB_PRIORITY)) {
                    baseUrl.dvbPriority = entry[DashConstants.DVB_PRIORITY];
                }

                if (entry.hasOwnProperty(DashConstants.DVB_WEIGHT)) {
                    baseUrl.dvbWeight = entry[DashConstants.DVB_WEIGHT];
                }

                if (entry.hasOwnProperty(DashConstants.AVAILABILITY_TIME_OFFSET)) {
                    baseUrl.availabilityTimeOffset = entry[DashConstants.AVAILABILITY_TIME_OFFSET];
                }

                if (entry.hasOwnProperty(DashConstants.AVAILABILITY_TIME_COMPLETE)) {
                    baseUrl.availabilityTimeComplete = entry[DashConstants.AVAILABILITY_TIME_COMPLETE] !== 'false';
                }
                /* NOTE: byteRange currently unused
                 */

                baseUrls.push(baseUrl);

                return earlyReturn;
            }
        });

        return baseUrls;
    }

    function getContentSteering(manifest) {
        if (manifest && manifest.hasOwnProperty(DashConstants.CONTENT_STEERING)) {
            // Only one ContentSteering element is supported on MPD level
            const element = manifest[DashConstants.CONTENT_STEERING][0];
            return _createContentSteeringInstance(element);
        }

        return undefined;
    }

    function _createContentSteeringInstance(element) {
        const entry = new ContentSteering();

        entry.serverUrl = element.__text;

        if (element.hasOwnProperty(DashConstants.DEFAULT_SERVICE_LOCATION)) {
            entry.defaultServiceLocation = element[DashConstants.DEFAULT_SERVICE_LOCATION];
            entry.defaultServiceLocationArray = entry.defaultServiceLocation.split(' ');
        }

        if (element.hasOwnProperty(DashConstants.QUERY_BEFORE_START)) {
            entry.queryBeforeStart = element[DashConstants.QUERY_BEFORE_START].toLowerCase() === 'true';
        }

        if (element.hasOwnProperty(DashConstants.CLIENT_REQUIREMENT)) {
            entry.clientRequirement = element[DashConstants.CLIENT_REQUIREMENT].toLowerCase() !== 'false';
        }

        return entry;
    }

    function _createClientDataReportingInstance(element) {
        const entry = new ClientDataReporting();

        if (element.hasOwnProperty(DashConstants.CMCD_PARAMETERS) && element[DashConstants.CMCD_PARAMETERS].schemeIdUri === Constants.CTA_5004_2023_SCHEME) {
            entry.cmcdParameters = new CMCDParameters();
            entry.cmcdParameters.init(element[DashConstants.CMCD_PARAMETERS]);
        }

        if (element.hasOwnProperty(DashConstants.SERVICE_LOCATIONS) && element[DashConstants.SERVICE_LOCATIONS] !== '') {
            entry.serviceLocations = element[DashConstants.SERVICE_LOCATIONS];
            entry.serviceLocationsArray = entry.serviceLocations.toString().split(' ');
        }

        if (element.hasOwnProperty(DashConstants.ADAPTATION_SETS) && element[DashConstants.ADAPTATION_SETS] !== '') {
            entry.adaptationSets = element[DashConstants.ADAPTATION_SETS];
            entry.adaptationSetsArray = entry.adaptationSets.toString().split(' ');
        }

        return entry;
    }

    function getLocation(manifest) {
        if (manifest && manifest.hasOwnProperty(DashConstants.LOCATION)) {
            return manifest[DashConstants.LOCATION].map((entry) => {
                const text = entry.__text || entry;
                const serviceLocation = entry.hasOwnProperty(DashConstants.SERVICE_LOCATION) ? entry[DashConstants.SERVICE_LOCATION] : null;

                return new MpdLocation(text, serviceLocation)
            })
        }

        return [];
    }

    function getPatchLocation(manifest) {
        if (manifest && manifest.hasOwnProperty(DashConstants.PATCH_LOCATION)) {
            return manifest[DashConstants.PATCH_LOCATION].map((entry) => {
                const text = entry.__text || entry;
                const serviceLocation = entry.hasOwnProperty(DashConstants.SERVICE_LOCATION) ? entry[DashConstants.SERVICE_LOCATION] : null;
                let ttl = entry.hasOwnProperty(DashConstants.TTL) ? parseFloat(entry[DashConstants.TTL]) * 1000 : NaN;

                return new PatchLocation(text, serviceLocation, ttl)
            })
        }

        return [];
    }

    function getSuggestedPresentationDelay(mpd) {
        return mpd && mpd.hasOwnProperty(DashConstants.SUGGESTED_PRESENTATION_DELAY) ? mpd.suggestedPresentationDelay : null;
    }

    function getAvailabilityStartTime(mpd) {
        return mpd && mpd.hasOwnProperty(DashConstants.AVAILABILITY_START_TIME) && mpd.availabilityStartTime !== null ? mpd.availabilityStartTime.getTime() : null;
    }

    function getServiceDescriptions(manifest) {
        const serviceDescriptions = [];
        if (manifest && manifest.hasOwnProperty(DashConstants.SERVICE_DESCRIPTION)) {
            for (const sd of manifest.ServiceDescription) {
                // Convert each of the properties defined in
                let id = null,
                    schemeIdUri = null,
                    latency = null,
                    playbackRate = null,
                    operatingQuality = null,
                    operatingBandwidth = null,
                    contentSteering = null,
                    clientDataReporting = null;

                for (const prop in sd) {
                    if (sd.hasOwnProperty(prop)) {
                        if (prop === DashConstants.ID) {
                            id = sd[prop];
                        } else if (prop === DashConstants.SERVICE_DESCRIPTION_SCOPE) {
                            schemeIdUri = sd[prop].schemeIdUri;
                        } else if (prop === DashConstants.SERVICE_DESCRIPTION_LATENCY) {
                            latency = {
                                target: parseInt(sd[prop].target),
                                max: parseInt(sd[prop].max),
                                min: parseInt(sd[prop].min),
                                referenceId: parseInt(sd[prop].referenceId)
                            };
                        } else if (prop === DashConstants.SERVICE_DESCRIPTION_PLAYBACK_RATE) {
                            playbackRate = {
                                max: parseFloat(sd[prop].max),
                                min: parseFloat(sd[prop].min)
                            };
                        } else if (prop === DashConstants.SERVICE_DESCRIPTION_OPERATING_QUALITY) {
                            operatingQuality = {
                                mediaType: sd[prop].mediaType,
                                max: parseInt(sd[prop].max),
                                min: parseInt(sd[prop].min),
                                target: parseInt(sd[prop].target),
                                type: sd[prop].type,
                                maxQualityDifference: parseInt(sd[prop].maxQualityDifference)
                            }
                        } else if (prop === DashConstants.SERVICE_DESCRIPTION_OPERATING_BANDWIDTH) {
                            operatingBandwidth = {
                                mediaType: sd[prop].mediaType,
                                max: parseInt(sd[prop].max),
                                min: parseInt(sd[prop].min),
                                target: parseInt(sd[prop].target)
                            }
                        } else if (prop === DashConstants.CONTENT_STEERING) {
                            let element = sd[prop];
                            element = Array.isArray(element) ? element.at(element.length - 1) : element;
                            contentSteering = _createContentSteeringInstance(element);
                        } else if (prop === DashConstants.CLIENT_DATA_REPORTING) {
                            clientDataReporting = _createClientDataReportingInstance(sd[prop]);
                        }
                    }
                }

                serviceDescriptions.push({
                    id,
                    schemeIdUri,
                    latency,
                    playbackRate,
                    operatingQuality,
                    operatingBandwidth,
                    contentSteering,
                    clientDataReporting
                });
            }
        }

        return serviceDescriptions;
    }

    function getSupplementalPropertiesForAdaptation(adaptation) {
        if (!adaptation || !adaptation.hasOwnProperty(DashConstants.SUPPLEMENTAL_PROPERTY) || !adaptation[DashConstants.SUPPLEMENTAL_PROPERTY].length) {
            return [];
        }
        return adaptation[DashConstants.SUPPLEMENTAL_PROPERTY].map(supp => {
            const s = new DescriptorType();
            s.init(supp);
            return s
        });
    }

    function getSupplementalPropertiesForRepresentation(representation) {
        if (!representation || !representation.hasOwnProperty(DashConstants.SUPPLEMENTAL_PROPERTY) || !representation[DashConstants.SUPPLEMENTAL_PROPERTY].length) {
            return [];
        }
        return representation[DashConstants.SUPPLEMENTAL_PROPERTY].map(supp => {
            const s = new DescriptorType();
            s.init(supp);
            return s
        });
    }

    function setConfig(config) {
        if (!config) {
            return;
        }

        if (config.errHandler) {
            errHandler = config.errHandler;
        }

        if (config.BASE64) {
            BASE64 = config.BASE64;
        }
    }

    instance = {
        getAccessibilityForAdaptation,
        getAdaptationForId,
        getAdaptationForIndex,
        getAdaptationsForPeriod,
        getAdaptationsForType,
        getAudioChannelConfigurationForAdaptation,
        getAudioChannelConfigurationForRepresentation,
        getAvailabilityStartTime,
        getBandwidth,
        getBaseURLsFromElement,
        getBitrateListForAdaptation,
        getCodec,
        getContentProtectionByAdaptation,
        getContentProtectionByManifest,
        getContentProtectionByPeriod,
        getContentSteering,
        getDuration,
        getEssentialPropertiesForAdaptationSet,
        getEssentialPropertiesForRepresentation,
        getEventStreamForAdaptationSet,
        getEventStreamForRepresentation,
        getEventsForPeriod,
        getId,
        getIndexForAdaptation,
        getIsDynamic,
        getIsFragmented,
        getIsText,
        getIsTypeOf,
        getLabelsForAdaptation,
        getLanguageForAdaptation,
        getLocation,
        getManifestUpdatePeriod,
        getMimeType,
        getMpd,
        getPatchLocation,
        getProducerReferenceTimesForAdaptation,
        getPublishTime,
        getRealPeriodForIndex,
        getRealPeriods,
        getRegularPeriods,
        getRepresentationCount,
        getRepresentationFor,
        getRepresentationSortFunction,
        getRepresentationsForAdaptation,
        getRolesForAdaptation,
        getSegmentAlignment,
        getSelectionPriority,
        getServiceDescriptions,
        getSubSegmentAlignment,
        getSuggestedPresentationDelay,
        getSupplementalPropertiesForAdaptation,
        getSupplementalPropertiesForRepresentation,
        getUTCTimingSources,
        getViewpointForAdaptation,
        hasProfile,
        isPeriodEncrypted,
        setConfig
    };

    setup();

    return instance;
}

DashManifestModel.__dashjs_factory_name = 'DashManifestModel';
export default FactoryMaker.getSingletonFactory(DashManifestModel);
