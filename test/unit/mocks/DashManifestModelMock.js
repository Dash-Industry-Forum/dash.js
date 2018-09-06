function DashManifestModelMock () {

    this.getIsTextTrack = function () {
        return false;
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
                }
            ]
        };
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
}

export default DashManifestModelMock;
