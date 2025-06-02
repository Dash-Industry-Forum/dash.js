function ManifestLoaderMock(responseMock) {
    this.loadManifest = false;
    this.url = null;
    this.serviceLocation = null;
    this.queryParams = null;
    this.linkedPeriod = null;
    this.responseMock = responseMock;

    this.load = function (url, serviceLocation, queryParams, linkedPeriod) {
        return new Promise((resolve, reject) => {
            this.url = url;
            this.serviceLocation = serviceLocation;
            this.queryParams = queryParams;
            this.linkedPeriod = linkedPeriod;
            this.loadManifest = true;
            if (this.responseMock === 'fail') {
                reject(this.responseMock)
            }
            resolve(this.responseMock);
        });
    };

    this.reset = function () {
    };
}

export default ManifestLoaderMock;
