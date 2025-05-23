import DashConstants from '../../../src/dash/constants/DashConstants.js';

function AdapterMock() {
    this.metricsList = {
        BUFFER_STATE: 'BUFFER_STATE'
    };

    this.getSuggestedPresentationDelay = function () {
        return null;
    };

    this.getAvailabilityStartTime = function () {
        return null;
    };

    this.getRealAdaptation = function () {
        return null;
    };

    this.getFramerate = function (rep) {
        if (rep && rep.frameRate) {
            return rep.frameRate
        }

        return null
    }

    this.getEventsFor = function () {
        return [];
    };

    this.getAllMediaInfoForType = function () {
        return [{
            codec: 'audio/mp4;codecs="mp4a.40.2"',
            id: undefined,
            index: 0,
            lang: 'eng',
            mimeType: 'audio/mp4',
            roles: ['main']
        }, {
            codec: 'audio/mp4;codecs="mp4a.40.2"',
            id: undefined,
            index: 1,
            lang: 'deu',
            mimeType: 'audio/mp4',
            roles: ['main']
        }];
    };

    this.getAdaptationForMediaInfo = function () {
        return {};
    };

    this.getMediaInfoForType = function () {
        return {};
    };

    this.getStreamsInfo = function () {
        return [];
    };

    this.setRepresentation = function (res) {
        this.representation = res;
    };

    this.getVoRepresentations = function () {
        if (this.representation) {
            return [this.representation];
        } else {
            return [];
        }
    };

    this.getAdaptationForType = function () {
        return {
            Representation: [
                {
                    width: 500
                },
                {
                    width: 750
                },
                {
                    width: 900
                },
                {
                    width: 900
                },
                {
                    width: 900
                }
            ]
        };
    };

    this.getIsText = function () {
        return false;
    };

    this.getBaseURLsFromElement = function () {
        return [];
    };

    this.getRepresentationSortFunction = function () {
        // Return a silly sort function
        return function () {
            return 0;
        };
    };

    this.getManifestUpdatePeriod = function () {
        return 0;
    };

    this.getPublishTime = function () {
        return null;
    };

    this.updatePeriods = function () {
    };

    this.getUseCalculatedLiveEdgeTimeForMediaInfo = function () {
        return false;
    };

    this.getUTCTimingSources = function () {
        return [];
    };

    this.getIsDynamic = function () {
        return false;
    };

    this.getIsDVB = function () {
        return false;
    };

    this.getIsPatch = function () {
        return false;
    };

    this.isPatchValid = function () {
        return false;
    };

    this.applyPatchToManifest = function () {
    };

    this.getIsTypeOf = function () {
        return true;
    };

    this.getCodec = function (adaptation, representationId, addResolutionInfo) {
        let codec = null;

        if (adaptation && adaptation.Representation && adaptation.Representation.length > 0) {
            const representation = adaptation.Representation[representationId];
            if (representation) {
                codec = representation.mimeType + ';codecs="' + representation.codecs + '"';
                if (addResolutionInfo && representation.width !== undefined && representation.height !== undefined) {
                    codec += ';width="' + representation.width + '";height="' + representation.height + '"';
                }
            }
        }

        // If the codec contains a profiles parameter we remove it. Otherwise it will cause problems when checking for codec capabilities of the platform
        if (codec) {
            codec = codec.replace(/\sprofiles=[^;]*/g, '');
        }

        return codec;
    };

    this.getSupplementalCodecs = function (representation) {
        const supplementalCodecs = representation[DashConstants.SUPPLEMENTAL_CODECS];
        if (!supplementalCodecs) {
            return [];
        }
        return supplementalCodecs.split(' ').map((codec) => representation.mimeType + ';codecs="' + codec + '"');
    }

    this.getEssentialPropertiesForRepresentation = function (realRepresentation) {
        if (!realRepresentation || !realRepresentation.EssentialProperty || !realRepresentation.EssentialProperty.length) {
            return null;
        }

        return realRepresentation.EssentialProperty.map((prop) => {
            return {
                schemeIdUri: prop.schemeIdUri,
                value: prop.value
            };
        });
    };

    this.getEssentialPropertiesForAdaptationSet = function (adaptationSet) {
        if (!adaptationSet || !adaptationSet.EssentialProperty || !adaptationSet.EssentialProperty.length) {
            return null;
        }

        return adaptationSet.EssentialProperty.map((prop) => {
            return {
                schemeIdUri: prop.schemeIdUri,
                value: prop.value
            };
        });
    };


    this.getLocation = function () {
        return [];
    };

    this.getPatchLocation = function () {
        return [];
    };

    this.getRegularPeriods = function () {
        return this.regularPeriods || [];
    };

    this.setRegularPeriods = function (periods) {
        this.regularPeriods = periods;
    };

    this.getProducerReferenceTimes = function () {
        return [{
            UTCTiming: null,
            applicationScheme: null,
            id: 7,
            inband: false,
            presentationTime: 10000,
            type: 'encoder',
            wallClockTime: '1970-01-01T00:00:04Z'
        }];
    };

}

export default AdapterMock;
