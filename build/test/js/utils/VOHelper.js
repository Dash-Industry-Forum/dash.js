(function(global){
    var mpdHelper = window.Helpers.getMpdHelper(),
        specHelper = window.Helpers.getSpecHelper(),
        voRep,
        voAdaptation,
        unixTime = specHelper.getUnixTime(),
        adaptation,
        defaultMpdType = "static",

        createMpd = function(type) {
            var mpd = {};

            mpd.manifest = mpdHelper.getMpd(type || defaultMpdType);
            mpd.suggestedPresentationDelay = 0;
            mpd.availabilityStartTime = unixTime;
            mpd.availabilityEndTime = Number.POSITIVE_INFINITY;
            mpd.timeShiftBufferDepth = 50;
            mpd.maxSegmentDuration = 1;
            mpd.checkTime = 10;

            return mpd;
        },

        createPeriod = function() {
            var period = {};

            period.mpd = createMpd();
            period.start = 0;

            period.id = "id1";
            period.index = 0;
            period.duration = 100;
            period.liveEdge = 50;
            period.isClientServerTimeSyncCompleted = false;
            period.clientServerTimeShift = 0;

            return period;
        },

        createAdaptation = function(type) {
            var adaptation = {};
            adaptation.period = createPeriod();
            adaptation.index = 0;
            adaptation.type = type;

            return adaptation;
        },

        createRepresentation = function(type) {
            var rep = new Dash.vo.Representation(),
                data = adaptation || mpdHelper.getAdaptationWithSegmentTemplate(type);

            rep.id = null;
            rep.index = 0;
            rep.adaptation = createAdaptation(type);
            rep.fragmentInfoType = null;
            rep.initialization = "http://dash.edgesuite.net/envivio/dashpr/clear/video4/Header.m4s";
            rep.segmentDuration = 1;
            rep.timescale = 1;
            rep.startNumber = 1;
            rep.indexRange = null;
            rep.range = null;
            rep.presentationTimeOffset = 10;
            // Set the source buffer timeOffset to this
            rep.MSETimeOffset = NaN;
            rep.segmentAvailabilityRange = null;
            rep.availableSegmentsNumber = 0;

            return rep;
        },

        createRequest = function(type) {
            var req = {};
            req.action = "download";
            req.quality = 0;
            req.mediaType = "video";
            req.type = type;
            req.url = "http://dash.edgesuite.net/envivio/dashpr/clear/video4/Header.m4s";
            req.startTime = NaN;
            req.duration = NaN;

            if (type === "Media Segment") {
                req.url = "http://dash.edgesuite.net/envivio/dashpr/clear/video4/0.m4s";
                req.startTime = 0;
                req.duration = 4;
                req.index = 0;
            } else if (type === "complete") {
                req.action = type;
                req.url = undefined;
                req.quality = NaN;
            }

            return req;
        },

    voHelper =  {
        getDummyRepresentation: function(type){
            return voRep || createRepresentation(type);
        },

        getDummyMpd: function(type){
            return createMpd(type);
        },

        getDummyPeriod: function() {
            return createPeriod();
        },

        getMediaRequest: function() {
            return createRequest("Media Segment");
        },

        getInitRequest: function() {
            return createRequest("Initialization Segment");
        },

        getCompleteRequest: function() {
            return createRequest("complete");
        },

        getDummyMediaInfo: function(type) {
            return {
                type: type,
                bitrateList: [1000, 2000, 3000],
                trackCount: 3
            }
        }
    };

    global.Helpers.setVOHelper(voHelper);
}(window));