class URIFragmentModelMock {
    constructor() {
        this.uriFragmentData = null;
    }

    getURIFragmentData() {
        return this.uriFragmentData;
    }

    setURIFragmentData(uri) {
        this.uriFragmentData = uri;
    }

    reset() {
        this.uriFragmentData = null;
    }
}

export default URIFragmentModelMock;
