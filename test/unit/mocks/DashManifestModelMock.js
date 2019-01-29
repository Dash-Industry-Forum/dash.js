function DashManifestModelMock () {

    this.getIsTextTrack = function () {
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

    this.setRepresentation = function (res) {
        this.representation = res;
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
}

export default DashManifestModelMock;
