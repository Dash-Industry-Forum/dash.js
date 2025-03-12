function ManifestLoaderMock(responseMock) {
    this.loadManifest = false;
    this.url = null;
    this.serviceLocation = null;
    this.queryParams = null;
    this.linkPeriod = null;
    this.responseMock = responseMock;

    this.load = function (url, serviceLocation, queryParams, linkPeriod) {
        return new Promise((resolve, reject) => {
            this.url = url;
            this.serviceLocation = serviceLocation;
            this.queryParams = queryParams;
            this.linkPeriod = linkPeriod;
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
