function DashManifestModelMock () {

    this.getIsText = function () {
        return false;
    };

    this.getAdaptationsForType = function (manifest, periodIndex, type) {
        let adaptationsArray;

        if (type === 'video') {
            adaptationsArray = [{ id: 0, mimeType: 'video' }, { id: 1, mimeType: 'video' }];
        } else {
            adaptationsArray = [{ id: undefined, mimeType: 'audio', lang: 'eng', Role_asArray: [{ value: 'main' }] }, { id: undefined, mimeType: 'audio', lang: 'deu', Role_asArray: [{ value: 'main' }]}];
        }

        return adaptationsArray;
    };

    this.getRepresentationsForAdaptation = function () {
        if (this.representation) {
            return [this.representation];
        } else {
            return [];
        }
    };

    this.getBaseURLsFromElement = function () {
        const baseUrls = [];
        return baseUrls;
    };

    this.getRepresentationSortFunction = function () {
    };

    this.getIndexForAdaptation = function () {
        return 0;
    };

    this.getRolesForAdaptation = function () {
        return [];
    };

    this.getMpd = function (manifest) {
        let mpd = {};
        if (manifest) {
            mpd.manifest = manifest;
        }

        return mpd;
    };

    this.getRegularPeriods = function (mpd) {
        const voPeriods = [];
        if (mpd && mpd.manifest && mpd.manifest.Period_asArray) {
            voPeriods.push({mpd: mpd});
        }

        return voPeriods;
    };

    this.getAdaptationsForPeriod = function (voPeriod) {
        let voAdaptations = [];

        if (voPeriod) {
            voAdaptations.push(voPeriod.mpd.manifest.Period_asArray[0]);
        }

        return voAdaptations;
    };
}

export default DashManifestModelMock;
