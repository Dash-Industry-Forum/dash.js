function ManifestLoaderMock() {
    this.loadManifest = false;

    this.load = function () {
        this.loadManifest = true;
    };
}

export default ManifestLoaderMock;