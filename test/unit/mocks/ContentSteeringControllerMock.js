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
}

export default ContentSteeringControllerMock;
