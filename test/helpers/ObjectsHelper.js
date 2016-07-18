class ObjectsHelper {
    constructor() {
        this.defaultStreamType = 'video';
    }

    getDummyStreamProcessor(type) {
        type = type || this.defaultStreamType;

        return {
            getType: () => type,
            getCurrentTrack: () => {},
            getStreamInfo: () => { return { id: 'some_id' }; },
            getMediaInfo: () => { return { bitrateList: [] }; },
            getIndexHandler: () => this.getDummyIndexHandler(),
            isDynamic: () => true
        };
    }

    getDummyLogger() {
        return (message) => { console.log(message); };
    }

    getDummyIndexHandler() {
        return {
            updateRepresentation: () => {}
        };
    }

    getDummyTimelineConverter() {
        return {
            calcAvailabilityStartTimeFromPresentationTime: () => 0,
            calcAvailabilityEndTimeFromPresentationTime: () => 0
        };
    }

    getDummyBaseURLController() {
        return {
            resolve: () => {}
        };
    }

    getDummyBlacklistController() {
        return {
            contains: () => {}
        };
    }
}

export default ObjectsHelper;
