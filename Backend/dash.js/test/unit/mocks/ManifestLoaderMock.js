function ManifestLoaderMock() {
    this.loadManifest = false;

    this.load = function () {
        this.loadManifest = true;
    };

    this.reset = function () {
    };
}

export default ManifestLoaderMock;