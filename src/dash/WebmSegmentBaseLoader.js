import Events from '../core/events/Events';
import EventBus from '../core/EventBus';
import EBMLParser from '../streaming/utils/EBMLParser';
import FactoryMaker from '../core/FactoryMaker';
import Debug from '../core/Debug';
import ErrorHandler from '../streaming/utils/ErrorHandler';
import RequestModifier from '../streaming/utils/RequestModifier';
import Segment from './vo/Segment';

function WebmSegmentBaseLoader() {

    let context = this.context;
    let log = Debug(context).getInstance().log;
    let eventBus = EventBus(context).getInstance();

    let instance,
        WebM,
        errHandler,
        requestModifier,
        baseURLController;

    function setup() {
        WebM = {
            EBML: {
                tag: 0x1A45DFA3,
                required: true
            },
            Segment: {
                tag: 0x18538067,
                required: true,
                SeekHead: {
                    tag: 0x114D9B74,
                    required: true
                },
                Info: {
                    tag: 0x1549A966,
                    required: true,
                    TimecodeScale: {
                        tag: 0x2AD7B1,
                        required: true,
                        parse: 'getMatroskaUint'
                    },
                    Duration: {
                        tag: 0x4489,
                        required: true,
                        parse: 'getMatroskaFloat'
                    }
                },
                Tracks: {
                    tag: 0x1654AE6B,
                    required: true
                },
                Cues: {
                    tag: 0x1C53BB6B,
                    required: true,
                    CuePoint: {
                        tag: 0xBB,
                        required: true,
                        CueTime: {
                            tag: 0xB3,
                            required: true,
                            parse: 'getMatroskaUint'
                        },
                        CueTrackPositions: {
                            tag: 0xB7,
                            required: true,
                            CueTrack: {
                                tag: 0xF7,
                                required: true,
                                parse: 'getMatroskaUint'
                            },
                            CueClusterPosition: {
                                tag: 0xF1,
                                required: true,
                                parse: 'getMatroskaUint'
                            },
                            CueBlockNumber: {
                                tag: 0x5378
                            }
                        }
                    }
                }
            },
            Void: {
                tag: 0xEC,
                required: true
            }
        };
    }

    function initialize() {
        errHandler = ErrorHandler(context).getInstance();
        requestModifier = RequestModifier(context).getInstance();
    }

    function setConfig(config) {
        if (config.baseURLController) {
            baseURLController = config.baseURLController;
        }
    }

    function parseCues(ab) {
        let cues = [];
        let cue;
        let cueSize;
        let cueTrack;
        let ebmlParser = EBMLParser(context).create({data: ab});
        let numSize;

        ebmlParser.consumeTag(WebM.Segment.Cues);
        cueSize = ebmlParser.getMatroskaCodedNum();

        while (ebmlParser.moreData() &&
                ebmlParser.consumeTagAndSize(WebM.Segment.Cues.CuePoint, true)) {
            cue = {};

            cue.CueTime = ebmlParser.parseTag(WebM.Segment.Cues.CuePoint.CueTime);

            cue.CueTracks = [];
            while (ebmlParser.moreData() &&
                    ebmlParser.consumeTagAndSize(WebM.Segment.Cues.CuePoint.CueTrackPositions, true)) {
                cueTrack = {};

                cueTrack.Track = ebmlParser.parseTag(WebM.Segment.Cues.CuePoint.CueTrackPositions.CueTrack);
                if (cueTrack.Track === 0) {
                    throw new Error('Cue track cannot be 0');
                }

                cueTrack.ClusterPosition =
                    ebmlParser.parseTag(WebM.Segment.Cues.CuePoint.CueTrackPositions.CueClusterPosition);

                // block number is strictly optional.
                // we also have to make sure we don't go beyond the end
                // of the cues
                if (ebmlParser.getPos() + 4 > cueSize ||
                        !ebmlParser.consumeTag(WebM.Segment.Cues.CuePoint.CueTrackPositions.CueBlockNumber, true)) {
                    cue.CueTracks.push(cueTrack);
                } else {
                    // since we have already consumed the tag, get the size of
                    // the tag's payload, and manually parse an unsigned int
                    // from the bit stream
                    numSize = ebmlParser.getMatroskaCodedNum();
                    cueTrack.BlockNumber = ebmlParser.getMatroskaUint(numSize);

                    cue.CueTracks.push(cueTrack);
                }
            }

            if (cue.CueTracks.length === 0) {
                throw new Error('Mandatory cuetrack not found');
            }
            cues.push(cue);
        }

        if (cues.length === 0) {
            throw new Error('mandatory cuepoint not found');
        }
        return cues;
    }

    function parseSegments(data, media, segmentStart, segmentEnd, segmentDuration) {
        let duration;
        let parsed;
        let segments;
        let segment;
        let i;
        let len;
        let start;
        let end;

        parsed = parseCues(data);
        segments = [];

        // we are assuming one cue track per cue point
        // both duration and media range require the i + 1 segment
        // the final segment has to use global segment parameters
        for (i = 0, len = parsed.length; i < len; i += 1) {
            segment = new Segment();
            duration = 0;

            if (i < parsed.length - 1) {
                duration = parsed[i + 1].CueTime - parsed[i].CueTime;
            } else {
                duration = segmentDuration - parsed[i].CueTime;
            }

            segment.duration = duration;
            segment.media = media;
            segment.startTime = parsed[i].CueTime;
            segment.timescale = 1000; // hardcoded for ms
            start = parsed[i].CueTracks[0].ClusterPosition + segmentStart;

            if (i < parsed.length - 1) {
                end = parsed[i + 1].CueTracks[0].ClusterPosition + segmentStart - 1;
            } else {
                end = segmentEnd - 1;
            }

            segment.mediaRange = start + '-' + end;
            segments.push(segment);
        }

        log('Parsed cues: ' + segments.length + ' cues.');

        return segments;
    }

    function parseEbmlHeader(data, media, theRange, callback) {
        let ebmlParser = EBMLParser(context).create({data: data});
        let duration;
        let segments;
        let parts = theRange.split('-');
        let request = new XMLHttpRequest();
        let needFailureReport = true;
        let info = {
                url: media,
                range: {
                    start: parseFloat(parts[0]),
                    end: parseFloat(parts[1])
                },
                request: request
            };
        let segmentEnd;
        let segmentStart;

        // skip over the header itself
        ebmlParser.skipOverElement(WebM.EBML);
        ebmlParser.consumeTag(WebM.Segment);

        // segments start here
        segmentEnd = ebmlParser.getMatroskaCodedNum();
        segmentEnd += ebmlParser.getPos();
        segmentStart = ebmlParser.getPos();

        // skip over any top level elements to get to the segment info
        while (ebmlParser.moreData() &&
            !ebmlParser.consumeTagAndSize(WebM.Segment.Info, true)) {
            if (!(ebmlParser.skipOverElement(WebM.Segment.SeekHead, true) ||
                ebmlParser.skipOverElement(WebM.Segment.Tracks, true) ||
                ebmlParser.skipOverElement(WebM.Segment.Cues, true) ||
                ebmlParser.skipOverElement(WebM.Void, true))) {
                throw new Error('no valid top level element found');
            }
        }

        // we only need one thing in segment info, duration
        while (duration === undefined) {
            let infoTag = ebmlParser.getMatroskaCodedNum(true);
            let infoElementSize = ebmlParser.getMatroskaCodedNum();

            switch (infoTag) {
            case WebM.Segment.Info.Duration.tag:
                duration = ebmlParser[WebM.Segment.Info.Duration.parse](infoElementSize);
                break;
            default:
                ebmlParser.setPos(ebmlParser.getPos() + infoElementSize);
                break;
            }
        }

        // once we have what we need from segment info, we jump right to the
        // cues
        request.onload = function () {
            if (request.status < 200 || request.status > 299) {
                return;
            }
            needFailureReport = false;
            segments = parseSegments(request.response, info.url, segmentStart, segmentEnd, duration);
            callback(segments);
        };

        request.onloadend = request.onerror = function () {
            if (!needFailureReport) {
                return;
            }
            needFailureReport = false;

            errHandler.downloadError('Cues ', info.url, request);
            callback(null);
        };


        sendRequest(request, info);

        log('Perform cues load: ' + info.url + ' bytes=' + info.range.start + '-' + info.range.end);
    }

    function loadInitialization(representation, loadingInfo) {
        let request = new XMLHttpRequest();
        let needFailureReport = true;
        let baseUrl = baseURLController.resolve(representation.path);
        let media = baseUrl ? baseUrl.url : undefined;
        let initRange = representation.range.split('-');
        let info = loadingInfo || {
                range: {
                    start: parseFloat(initRange[0]),
                    end: parseFloat(initRange[1])
                },
                request: request,
                url: media
            };

        log('Start loading initialization.');

        request.onload = function () {
            log('Initialization loaded.');
            if (request.status < 200 || request.status > 299) return;

            needFailureReport = false;
            representation.initialization = info.url;
            eventBus.trigger(Events.INITIALIZATION_LOADED, {representation: representation});
        };

        request.onloadend = request.onerror = function () {
            if (!needFailureReport) return;
            needFailureReport = false;

            errHandler.downloadError('initialization', info.url, request);
            eventBus.trigger(Events.INITIALIZATION_LOADED, {representation: representation});
        };

        sendRequest(request, info);
        log('Perform init load: ' + info.url);
    }

    function loadSegments(representation, type, theRange, callback) {
        let request = new XMLHttpRequest();
        let needFailureReport = true;
        let baseUrl = baseURLController.resolve(representation.path);
        let media = baseUrl ? baseUrl.url : undefined;
        let bytesToLoad = 8192;
        let info = {
                bytesLoaded: 0,
                bytesToLoad: bytesToLoad,
                range: {
                    start: 0,
                    end: bytesToLoad
                },
                request: request,
                url: media
            };

        callback = !callback ? onLoaded : callback;

        // first load the header, but preserve the manifest range so we can
        // load the cues after parsing the header
        // NOTE: we expect segment info to appear in the first 8192 bytes
        log('Parsing ebml header');
        request.onload = function () {
            if (request.status < 200 || request.status > 299) {
                return;
            }
            needFailureReport = false;
            parseEbmlHeader(request.response, media, theRange, function (segments) {
                callback(segments, representation, type);
            });
        };

        request.onloadend = request.onerror = function () {
            if (!needFailureReport) {
                return;
            }
            needFailureReport = false;

            errHandler.downloadError('EBML Header', info.url, request);
            callback(null, representation, type);
        };

        sendRequest(request, info);
        log('Parse EBML header: ' + info.url);
    }

    function onLoaded(segments, representation, type) {
        if (segments) {
            eventBus.trigger(Events.SEGMENTS_LOADED, {segments: segments, representation: representation, mediaType: type});
        } else {
            eventBus.trigger(Events.SEGMENTS_LOADED, {segments: null, representation: representation, mediaType: type, error: new Error(null, 'error loading segments', null)});
        }
    }

    function sendRequest(request, info) {
        if (!info.url) {
            return;
        }

        request.open('GET', requestModifier.modifyRequestURL(info.url));
        request.responseType = 'arraybuffer';
        request.setRequestHeader('Range', 'bytes=' + info.range.start + '-' + info.range.end);
        request = requestModifier.modifyRequestHeader(request);
        request.send(null);
    }

    function reset() {
        errHandler = null;
        requestModifier = null;
        log = null;
    }

    instance = {
        setConfig: setConfig,
        initialize: initialize,
        loadInitialization: loadInitialization,
        loadSegments: loadSegments,
        reset: reset
    };

    setup();

    return instance;
}

WebmSegmentBaseLoader.__dashjs_factory_name = 'WebmSegmentBaseLoader';
export default FactoryMaker.getSingletonFactory(WebmSegmentBaseLoader);