class ObjectsHelper {
    constructor() {
        this.defaultStreamType = 'video';
    }

    getDummyStreamProcessor(type) {
        type = type || this.defaultStreamType;

        return {
            getType: () => type,
            getCurrentTrack: () => {},
            getStreamInfo: () => { return { id: 'DUMMY_STREAM-01', manifestInfo: {isDynamic: true} }; },
            getMediaInfo: () => { return { bitrateList: [
                                                { bandwidth: 1000000 },
                                                { bandwidth: 2000000 },
                                                { bandwidth: 3000000 },
                                           ],
                                           mimeType: "video/mp4" }},
            getIndexHandler: () => this.getDummyIndexHandler()
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
            initialize: () => {},
            reset: () => {},
            getClientTimeOffset: () => {},
            calcAvailabilityStartTimeFromPresentationTime: () => 0,
            calcAvailabilityEndTimeFromPresentationTime: () => 0,
            calcPeriodRelativeTimeFromMpdRelativeTime: () => NaN,
            calcMediaTimeFromPresentationTime: () => undefined,
            calcSegmentAvailabilityRange: () =>  { return {start: undefined, end: undefined};},
            isTimeSyncCompleted: () => {return true;}
        };
    }

    getDummyBaseURLController() {
        return {
            resolve: () => {
                return  {
                    url: '',
                    serviceLocation: ''
                };
            }
        };
    }

    getDummyBlacklistController() {
        return {
            contains: () => {}
        };
    }
}

export default ObjectsHelper;
