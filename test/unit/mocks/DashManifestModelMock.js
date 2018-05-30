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
}

export default DashManifestModelMock;
