import EBMLParser from '../streaming/utils/EBMLParser';
import Constants from '../streaming/constants/Constants';
import FactoryMaker from '../core/FactoryMaker';
import Segment from './vo/Segment';
import FragmentRequest from '../streaming/vo/FragmentRequest';
import URLLoader from '../streaming/net/URLLoader';
import DashJSError from '../streaming/vo/DashJSError';

function WebmSegmentBaseLoader() {

    const context = this.context;

    let instance,
        logger,
        WebM,
        errHandler,
        requestModifier,
        dashMetrics,
        mediaPlayerModel,
        urlLoader,
        errors,
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
        urlLoader = URLLoader(context).create({
            errHandler: errHandler,
            dashMetrics: dashMetrics,
            mediaPlayerModel: mediaPlayerModel,
            requestModifier: requestModifier,
            errors: errors
        });
    }

    function setConfig(config) {
        if (!config.baseURLController || !config.dashMetrics || !config.mediaPlayerModel || !config.errHandler) {
            throw new Error(Constants.MISSING_CONFIG_ERROR);
        }
        baseURLController = config.baseURLController;
        dashMetrics = config.dashMetrics;
        mediaPlayerModel = config.mediaPlayerModel;
        errHandler = config.errHandler;
        errors = config.errors;
        logger = config.debug.getLogger(instance);
        requestModifier = config.requestModifier;
    }

    function parseCues(ab) {
        let cues = [];
        let ebmlParser = EBMLParser(context).create({
            data: ab
        });
        let cue,
            cueTrack;

        ebmlParser.consumeTagAndSize(WebM.Segment.Cues);

        while (ebmlParser.moreData() &&
        ebmlParser.consumeTagAndSize(WebM.Segment.Cues.CuePoint, true)) {
            cue = {};

            cue.CueTime = ebmlParser.parseTag(WebM.Segment.Cues.CuePoint.CueTime);

            cue.CueTracks = [];
            while (ebmlParser.moreData() &&
            ebmlParser.consumeTag(WebM.Segment.Cues.CuePoint.CueTrackPositions, true)) {
                const cueTrackPositionSize = ebmlParser.getMatroskaCodedNum();
                const startPos = ebmlParser.getPos();
                cueTrack = {};

                cueTrack.Track = ebmlParser.parseTag(WebM.Segment.Cues.CuePoint.CueTrackPositions.CueTrack);
                if (cueTrack.Track === 0) {
                    throw new Error('Cue track cannot be 0');
                }

                cueTrack.ClusterPosition =
                    ebmlParser.parseTag(WebM.Segment.Cues.CuePoint.CueTrackPositions.CueClusterPosition);

                cue.CueTracks.push(cueTrack);

                // we're not interested any other elements - skip remaining bytes
                ebmlParser.setPos(startPos + cueTrackPositionSize);
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

    function parseSegments(data, segmentStart, segmentEnd, segmentDuration) {
        let duration,
            parsed,
            segments,
            segment,
            i,
            len,
            start,
            end;

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

            // note that we don't explicitly set segment.media as this will be
            // computed when all BaseURLs are resolved later
            segment.duration = duration;
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

        logger.debug('Parsed cues: ' + segments.length + ' cues.');

        return segments;
    }

    function parseEbmlHeader(data, media, theRange, callback) {
        if (!data || data.byteLength === 0) {
            callback(null);
            return;
        }
        let ebmlParser = EBMLParser(context).create({
            data: data
        });
        let duration,
            segments,
            segmentEnd,
            segmentStart;
        let parts = theRange ? theRange.split('-') : null;
        let request = null;
        let info = {
            url: media,
            range: {
                start: parts ? parseFloat(parts[0]) : null,
                end: parts ? parseFloat(parts[1]) : null
            },
            request: request
        };

        logger.debug('Parse EBML header: ' + info.url);

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

        request = _getFragmentRequest(info);

        const onload = function (response) {
            segments = parseSegments(response, segmentStart, segmentEnd, duration);
            callback(segments);
        };

        const onloadend = function () {
            logger.error('Download Error: Cues ' + info.url);
            callback(null);
        };

        urlLoader.load({
            request: request,
            success: onload,
            error: onloadend
        });

        logger.debug('Perform cues load: ' + info.url + ' bytes=' + info.range.start + '-' + info.range.end);
    }

    function loadInitialization(representation, mediaType) {
        return new Promise((resolve) => {
            let request = null;
            let baseUrl = representation ? baseURLController.resolve(representation.path) : null;
            let initRange = representation ? representation.range.split('-') : null;
            let info = {
                range: {
                    start: initRange ? parseFloat(initRange[0]) : null,
                    end: initRange ? parseFloat(initRange[1]) : null
                },
                request: request,
                url: baseUrl ? baseUrl.url : undefined,
                init: true,
                mediaType: mediaType
            };

            logger.info('Start loading initialization.');

            request = _getFragmentRequest(info);

            const onload = function () {
                // note that we don't explicitly set rep.initialization as this
                // will be computed when all BaseURLs are resolved later
                resolve(representation);
            };

            const onloadend = function () {
                resolve(representation);
            };

            urlLoader.load({
                request: request,
                success: onload,
                error: onloadend
            });

            logger.debug('Perform init load: ' + info.url);
        });
    }

    function loadSegments(representation, mediaType, theRange) {
        return new Promise((resolve) => {
            let request = null;
            let baseUrl = representation ? baseURLController.resolve(representation.path) : null;
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
                url: media,
                init: false,
                mediaType: mediaType
            };

            request = _getFragmentRequest(info);

            // first load the header, but preserve the manifest range so we can
            // load the cues after parsing the header
            // NOTE: we expect segment info to appear in the first 8192 bytes
            logger.debug('Parsing ebml header');

            const onload = function (response) {
                parseEbmlHeader(response, media, theRange, function (segments) {
                    resolve({
                        segments: segments,
                        representation: representation,
                        error: segments ? undefined : new DashJSError(errors.SEGMENT_BASE_LOADER_ERROR_CODE, errors.SEGMENT_BASE_LOADER_ERROR_MESSAGE)
                    });
                });
            };

            const onloadend = function () {
                resolve({
                    representation: representation,
                    error: new DashJSError(errors.SEGMENT_BASE_LOADER_ERROR_CODE, errors.SEGMENT_BASE_LOADER_ERROR_MESSAGE)
                });
            };

            urlLoader.load({
                request: request,
                success: onload,
                error: onloadend
            });
        });

    }


    function _getFragmentRequest(info) {
        const request = new FragmentRequest();
        request.setInfo(info);
        return request;
    }

    function reset() {
        if (urlLoader) {
            urlLoader.abort();
            urlLoader = null;
        }
    }

    instance = {
        setConfig,
        initialize,
        loadInitialization,
        loadSegments,
        reset
    };

    setup();

    return instance;
}

WebmSegmentBaseLoader.__dashjs_factory_name = 'WebmSegmentBaseLoader';
export default FactoryMaker.getSingletonFactory(WebmSegmentBaseLoader);
