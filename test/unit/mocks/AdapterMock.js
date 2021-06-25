function AdapterMock () {
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

    this.getEventsFor = function () {
        return [];
    };

    this.getAllMediaInfoForType = function () {
        return [{codec: 'audio/mp4;codecs="mp4a.40.2"', id: undefined, index: 0, lang: 'eng',mimeType: 'audio/mp4', roles: ['main']},
                {codec: 'audio/mp4;codecs="mp4a.40.2"', id: undefined, index: 1, lang: 'deu',mimeType: 'audio/mp4', roles: ['main']}];
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
        return function () { return 0; };
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

    this.applyPatchToManifest = function () {};

    this.convertRepresentationToRepresentationInfo = function () {
        return null;
    };

    this.getIsTypeOf = function () {
        return true;
    };

    this.getCodec = function (adaptation, representationId, addResolutionInfo) {
        let codec = null;

        if (adaptation && adaptation.Representation_asArray && adaptation.Representation_asArray.length > 0) {
            const representation = adaptation.Representation_asArray[representationId];
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

    this.getEssentialPropertiesForRepresentation = function (realRepresentation) {
        if (!realRepresentation || !realRepresentation.EssentialProperty_asArray || !realRepresentation.EssentialProperty_asArray.length) return null;

        return realRepresentation.EssentialProperty_asArray.map((prop) => {
            return {
                schemeIdUri: prop.schemeIdUri,
                value: prop.value
            };
        });
    };


    this.getLocation = function () {
        return null;
    };

    this.getPatchLocation = function () {
        return null;
    };

    this.getRegularPeriods = function () {
        return this.regularPeriods || [];
    };

    this.setRegularPeriods = function (periods) {
        this.regularPeriods = periods;
    };


}

export default AdapterMock;
