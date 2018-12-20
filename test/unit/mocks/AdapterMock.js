class AdapterMock {
    constructor() {
        this.metricsList = {
            BUFFER_STATE: 'BUFFER_STATE'
        };
    }

    getEventsFor() {
        return null;
    }

    getAllMediaInfoForType() {
        return [{codec: 'audio/mp4;codecs="mp4a.40.2"', id: undefined, index: 0, isText: false, lang: 'eng',mimeType: 'audio/mp4', roles: ['main']},
                {codec: 'audio/mp4;codecs="mp4a.40.2"', id: undefined, index: 1, isText: false, lang: 'deu',mimeType: 'audio/mp4', roles: ['main']}];
    }

    getDataForMedia() {
        return {};
    }

    getMediaInfoForType() {
        return {};
    }

    getStreamsInfo() {
        return [];
    }

    getAdaptationForType() {
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
    }
    
    setRepresentation (res) {
        this.representation = res;
    }

    getVoRepresentations() {
        if (this.representation) {
            return [this.representation];
        } else {
            return [];
        }
    }

    getAdaptationForType() {
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
    }

    getIsTextTrack () {
        return false;
    }
}

export default AdapterMock;