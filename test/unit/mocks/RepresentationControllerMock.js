function RepresentationControllerMock () {
    this.getCurrentRepresentation = function () {
        return {adaptation: {period: {mpd: {manifest: {type: 'dynamic', Period_asArray: [{AdaptationSet_asArray: [{SegmentTemplate: {timescale: 10000000, SegmentTimeline: {S: [{tManifest: 0}]}}}]}]}}, index: 0}, index: 0}};
    };

    this.getRepresentationForQuality = function () {};

    this.updateRepresentation = function () {};
}

export default RepresentationControllerMock;