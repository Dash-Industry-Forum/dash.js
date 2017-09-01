class ManifestLoaderMock {
    constructor() {
        this.loadManifest = false;
    }

    getLoadManifest() {
        return false;
    }
    
    load() {
        this.loadManifest = true;
    }
}

class ManifestUpdaterMock {
    constructor() {
        this.manifestLoader = new ManifestLoaderMock();
    }

    getManifestLoader() {
        return this.manifestLoader;
    }
}

export default ManifestUpdaterMock;