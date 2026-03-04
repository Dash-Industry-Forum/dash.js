class SegmentsControllerMock {

    updateInitData() {
        return Promise.resolve();
    }

    updateSegmentData() {
        return Promise.resolve();
    }

    getMediaFinishedInformation() {
        return { numberOfSegments: 0, mediaTimeOfLastSignaledSegment: NaN };
    }
}

export default SegmentsControllerMock;
