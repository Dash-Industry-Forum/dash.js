import ManifestLoaderMock from './ManifestLoaderMock.js';

class ManifestUpdaterMock {
    constructor() {
        this.manifestLoader = new ManifestLoaderMock();
    }

    getManifestLoader() {
        return this.manifestLoader;
    }
}

export default ManifestUpdaterMock;
