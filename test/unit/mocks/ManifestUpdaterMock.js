
import ManifestLoaderMock from './ManifestLoaderMock';

class ManifestUpdaterMock {
    constructor() {
        this.manifestLoader = new ManifestLoaderMock();
    }

    getManifestLoader() {
        return this.manifestLoader;
    }
}

export default ManifestUpdaterMock;