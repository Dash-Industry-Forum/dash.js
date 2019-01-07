function AdapterMock () {
    this.metricsList = {
        BUFFER_STATE: 'BUFFER_STATE'
    };

    this.getEventsFor = function () {
        return null;
    };

    this.getAllMediaInfoForType = function () {
        return [{codec: 'audio/mp4;codecs="mp4a.40.2"', id: undefined, index: 0, isText: false, lang: 'eng',mimeType: 'audio/mp4', roles: ['main']},
                {codec: 'audio/mp4;codecs="mp4a.40.2"', id: undefined, index: 1, isText: false, lang: 'deu',mimeType: 'audio/mp4', roles: ['main']}];
    };

    this.getDataForMedia = function () {
        return {};
    };

    this.getMediaInfoForType = function () {
        return {};
    };

    this.getStreamsInfo = function () {
        return [];
    };

    this.setRepresentation = function (res) {
        this.representation = res;
    };

    this.getVoRepresentations = function () {
        if (this.representation) {
            return [this.representation];
        } else {
            return [];
        }
    };

    this.getAdaptationForType = function () {
        return {
            Representation: [
                {
                    width: 500
                },
                {
                    width: 750
                },
                {
                    width: 900
                }
            ]
        };
    };

    this.getIsTextTrack = function () {
        return false;
    };

    this.getBaseURLsFromElement = function () {
        return [];
    };

    this.getRepresentationSortFunction = function () {
        return [];
    };
}

export default AdapterMock;