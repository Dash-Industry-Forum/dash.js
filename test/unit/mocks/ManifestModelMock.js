class ManifestModelMock {
    constructor() {
        this.manifestValue = 0;
    }

    getValue() {
        return this.manifestValue;
    }

    setValue(value) {
        this.manifestValue = value;
    }
}

export default ManifestModelMock;