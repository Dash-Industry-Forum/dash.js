class DashManifestModelMock {

    constructor() {}

    getIsTextTrack() {
        return false;
    }

    getAdaptationForType() {
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
    }

    setRepresentation(res) {
        this.representation = res;
    }

    getRepresentationsForAdaptation() {
        if (this.representation) {
            return [this.representation];
        } else {
            return [];
        }
    }
}

export default DashManifestModelMock;
