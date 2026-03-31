function DefenseRegistryMock() {
    this.streamInfo = null;

    this.setStreamInfo = function (streamInfo) {
        this.streamInfo = streamInfo;
    };

    this.addExtendedManifest = function () {
        return true;
    };

    this.getDefendedStreamInfo = function () {
        return this.streamInfo;
    };

    this.getCycleIndexBySegmentIndex = function (stream, segmentIndex) {
        if (!stream || !stream.data) {
            return -1;
        }

        for (let i = 0; i < stream.data.length; i++) {
            if (stream.data[i].index === segmentIndex && !stream.data[i].padding) {
                return i;
            }
        }

        // Fallback: return first non-padding cycle (handles undefined index)
        for (let i = 0; i < stream.data.length; i++) {
            if (!stream.data[i].padding) {
                return i;
            }
        }
        
        return -1;
    };

    this.getCycleIndexByPlaybackTime = function (stream, playbackTime, segmentDuration) {
        const segmentIndex = Math.floor(playbackTime / segmentDuration);
        return this.getCycleIndexBySegmentIndex(stream, segmentIndex);
    };

    this.reset = function () {};

    this.setup = function () {};
}

export default DefenseRegistryMock;
