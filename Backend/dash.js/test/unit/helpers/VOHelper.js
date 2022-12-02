import StreamInfo from '../../../src/dash/vo/StreamInfo';
import MediaInfo from '../../../src/dash/vo/MediaInfo';
import MpdHelper from './MPDHelper';
import SpecHelper from './SpecHelper';
import Representation from '../../../src/dash/vo/Representation';
import FragmentRequest from '../../../src/streaming/vo/FragmentRequest';
import {HTTPRequest} from '../../../src/streaming/vo/metrics/HTTPRequest';
import DashConstants from '../../../src/dash/constants/DashConstants';

class VoHelper {
    constructor() {
        this.mpdHelper = new MpdHelper();
        this.specHelper = new SpecHelper();
        this.voRep = undefined;
        this.voTimelineRep = undefined;
        this.voAdaptation = undefined;
        this.unixTime = this.specHelper.getUnixTime();
        this.adaptation = undefined;
        this.defaultMpdType = 'static';
    }

    createMpd(type, segInfoType) {
        var mpd = {};

        mpd.manifest = this.mpdHelper.getMpd(type || this.defaultMpdType, segInfoType);
        mpd.suggestedPresentationDelay = 0;
        mpd.availabilityStartTime = this.unixTime;
        mpd.availabilityEndTime = Number.POSITIVE_INFINITY;
        mpd.timeShiftBufferDepth = 50;
        mpd.maxSegmentDuration = 1;

        return mpd;
    }

    createPeriod(segInfoType) {
        var period = {};

        period.mpd = this.createMpd(this.defaultMpdType, segInfoType);
        period.start = 0;

        period.id = 'id1';
        period.index = 0;
        period.duration = 100;
        period.liveEdge = 50;
        period.isClientServerTimeSyncCompleted = false;
        period.clientServerTimeShift = 0;

        return period;
    }

    createAdaptation(type, segInfoType) {
        var adaptation = {};
        adaptation.period = this.createPeriod(segInfoType);
        adaptation.index = 0;
        adaptation.type = type;

        return adaptation;
    }

    createRepresentation(type, index) {
        var rep = new Representation();

        rep.id = null;
        rep.index = index || 0;
        rep.adaptation = this.createAdaptation(type);
        rep.fragmentInfoType = null;
        rep.initialization = 'https://dash.akamaized.net/envivio/dashpr/clear/video4/Header.m4s';
        rep.segmentDuration = 1;
        rep.timescale = 1;
        rep.startNumber = 1;
        rep.indexRange = null;
        rep.range = null;
        rep.presentationTimeOffset = 10;
        rep.segmentInfoType = DashConstants.SEGMENT_TEMPLATE;
        // Set the source buffer timeOffset to this
        rep.MSETimeOffset = NaN;
        rep.segmentAvailabilityWindow = null;
        rep.availableSegmentsNumber = 0;

        return rep;
    }

    createTimelineRepresentation(type, index) {
        var rep = new Representation();

        rep.id = null;
        rep.index = index || 0;
        rep.adaptation = this.createAdaptation(type, 1);
        rep.fragmentInfoType = null;
        rep.initialization = 'https://dash.akamaized.net/envivio/dashpr/clear/video4/Header.m4s';
        rep.segmentDuration = 1;
        rep.timescale = 1;
        rep.startNumber = 1;
        rep.indexRange = null;
        rep.range = null;
        rep.presentationTimeOffset = 10;
        rep.segmentInfoType = DashConstants.SEGMENT_TIMELINE;
        // Set the source buffer timeOffset to this
        rep.MSETimeOffset = NaN;
        rep.segmentAvailabilityWindow = null;
        rep.availableSegmentsNumber = 0;

        return rep;
    }

    createRequest(type, state) {
        var req = {};
        req.action = FragmentRequest.ACTION_DOWNLOAD;
        req.quality = 0;
        req.mediaType = 'video';
        req.type = type;
        req.url = 'https://dash.akamaized.net/envivio/dashpr/clear/video4/Header.m4s';
        req.startTime = NaN;
        req.duration = NaN;
        req.mediaInfo = {
            streamInfo: {
                id: 'streamId'
            }
        }

        if (type === HTTPRequest.MEDIA_SEGMENT_TYPE) {
            req.url = 'https://dash.akamaized.net/envivio/dashpr/clear/video4/0.m4s';
            req.startTime = 0;
            req.duration = 4;
            req.index = 0;
        }

        if (state === FragmentRequest.ACTION_COMPLETE) {
            req.action = FragmentRequest.ACTION_COMPLETE;
            req.url = undefined;
            req.quality = NaN;
        }

        return req;
    }

    getDummyRepresentation(type, index) {
        return this.voRep || this.createRepresentation(type, index);
    }

    getDummyTimelineRepresentation(type, index) {
        return this.voTimelineRep || this.createTimelineRepresentation(type, index);
    }

    getDummyMpd(type) {
        return this.createMpd(type);
    }

    getDummyPeriod() {
        return this.createPeriod();
    }

    getMediaRequest() {
        return this.createRequest(HTTPRequest.MEDIA_SEGMENT_TYPE);
    }

    getInitRequest() {
        return this.createRequest(HTTPRequest.INIT_SEGMENT_TYPE);
    }

    getCompleteRequest(type) {
        return this.createRequest(type, FragmentRequest.ACTION_COMPLETE);
    }

    getDummyStreamInfo() {
        const streamInfo = new StreamInfo();

        streamInfo.id = 'DUMMY_STREAM-01';

        return streamInfo;
    }

    getDummyMediaInfo(type) {
        const mediaInfo = new MediaInfo();

        mediaInfo.id = 'DUMMY_MEDIA-01';
        mediaInfo.type = type;
        mediaInfo.bitrateList = [
            {
                bandwidth: 1000,
                width: 480,
                height: 360
            },
            {
                bandwidth: 2000,
                width: 640,
                height: 480
            },
            {
                bandwidth: 3000,
                width: 1280,
                height: 720
            }
        ];
        mediaInfo.representationCount = 3;
        mediaInfo.streamInfo = this.getDummyStreamInfo();

        return mediaInfo;
    }
}

export default VoHelper;
