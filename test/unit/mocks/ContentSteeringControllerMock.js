class ContentSteeringControllerMock {

    shouldQueryBeforeStart() {
        return false;
    }

    getCurrentSteeringResponseData() {
        return null;
    }

    getSteeringDataFromManifest() {
        return null;
    }

    getSynthesizedBaseUrlElements() {
        return [];
    }

    getSynthesizedLocationElements() {
        return [];
    }
}

export default ContentSteeringControllerMock;
