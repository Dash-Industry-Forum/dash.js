import WebmSegmentBaseLoader from '../../../../src/dash/WebmSegmentBaseLoader.js';
import Constants from '../../../../src/streaming/constants/Constants.js';
import EventBus from '../../../../src/core/EventBus.js';
import Events from '../../../../src/core/events/Events.js';
import Errors from '../../../../src/core/errors/Errors.js';
import ErrorHandlerMock from '../../mocks/ErrorHandlerMock.js';
import MediaPlayerModelMock from '../../mocks/MediaPlayerModelMock.js';
import DashMetricsMock from '../../mocks/DashMetricsMock.js';
import BaseURLControllerMock from '../../mocks/BaseURLControllerMock.js';
import DebugMock from '../../mocks/DebugMock.js';

import {expect} from 'chai';
import {fakeXhr} from 'nise';

const context = {};
let webmSegmentBaseLoader;
const eventBus = EventBus(context).getInstance();

describe('WebmSegmentBaseLoader', function () {
    beforeEach(function () {

        XMLHttpRequest = fakeXhr.useFakeXMLHttpRequest();

        this.requests = [];
        XMLHttpRequest.onCreate = function (xhr) {
            this.requests.push(xhr);
        }.bind(this);
    });

    afterEach(function () {
        XMLHttpRequest.restore();
    });
    describe('Not well initialized', function () {
        beforeEach(function () {
            webmSegmentBaseLoader = WebmSegmentBaseLoader(context).getInstance();
            webmSegmentBaseLoader.initialize();
        });

        afterEach(function () {
            webmSegmentBaseLoader.reset();
        });

        it('should throw an exception when attempting to call setConfig with an empty config parameter or malformed', function () {
            expect(webmSegmentBaseLoader.setConfig.bind(webmSegmentBaseLoader, {})).to.throw(Constants.MISSING_CONFIG_ERROR);
        });
    });

    describe('Well initialized', function () {
        beforeEach(function () {
            webmSegmentBaseLoader = WebmSegmentBaseLoader(context).getInstance();
            webmSegmentBaseLoader.setConfig({
                baseURLController: new BaseURLControllerMock(),
                dashMetrics: new DashMetricsMock(),
                mediaPlayerModel: new MediaPlayerModelMock(),
                errHandler: new ErrorHandlerMock(),
                debug: new DebugMock(),
                eventBus: eventBus,
                events: Events,
                errors: Errors
            });
            webmSegmentBaseLoader.initialize();
        });

        afterEach(function () {
            webmSegmentBaseLoader.reset();
        });

        it('should trigger INITIALIZATION_LOADED event when loadInitialization function is called without representation parameter', function (done) {
            const self = this.test.ctx;
            webmSegmentBaseLoader.loadInitialization()
                .then(() => {
                    done();
                })
                .catch((e) => {
                    done(e);
                });
            setTimeout(() => self.requests[0].respond(200), 1)
        });

        it('should trigger SEGMENTS_LOADED event with an error when loadSegments function is called without representation parameter', function (done) {
            const self = this.test.ctx;

            webmSegmentBaseLoader.loadSegments()
                .then((e) => {
                    expect(e.error).not.to.equal(undefined);
                    expect(e.error.code).to.equal(Errors.SEGMENT_BASE_LOADER_ERROR_CODE);
                    expect(e.error.message).to.equal(Errors.SEGMENT_BASE_LOADER_ERROR_MESSAGE);
                    done();
                })
                .catch((e) => {
                    done(e);
                });

            setTimeout(() => self.requests[0].respond(200), 1)
        });
    });

    describe('loadSegments', function () {
        // Two cue points, so the test covers both the duration taken from the following cue and
        // the final cue, whose duration and range run to the end of the segment.
        const DURATION = 5000;
        const CUES = [
            { time: 0, clusterPosition: 20 },
            { time: 2000, clusterPosition: 35 }
        ];

        let segmentStart;
        let segmentEnd;
        let cuesStart;
        let cuesEnd;

        // EBML variable length integer, as read back by EBMLParser.getMatroskaCodedNum()
        function vint(value, width) {
            const bytes = new Uint8Array(width);
            let remaining = value;
            for (let i = width - 1; i >= 0; i--) {
                bytes[i] = remaining & 0xff;
                remaining = Math.floor(remaining / 256);
            }
            bytes[0] |= 0x80 >> (width - 1);
            return bytes;
        }

        function tagBytes(tag) {
            const width = tag > 0xFFFFFF ? 4 : tag > 0xFFFF ? 3 : tag > 0xFF ? 2 : 1;
            const bytes = new Uint8Array(width);
            let remaining = tag;
            for (let i = width - 1; i >= 0; i--) {
                bytes[i] = remaining & 0xff;
                remaining = Math.floor(remaining / 256);
            }
            return bytes;
        }

        function concat(chunks) {
            const total = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
            const out = new Uint8Array(total);
            let offset = 0;
            chunks.forEach((chunk) => {
                out.set(chunk, offset);
                offset += chunk.length;
            });
            return out;
        }

        function element(tag, payload, sizeWidth) {
            return concat([tagBytes(tag), vint(payload.length, sizeWidth || 1), payload]);
        }

        function uintBytes(value, width) {
            const bytes = new Uint8Array(width);
            let remaining = value;
            for (let i = width - 1; i >= 0; i--) {
                bytes[i] = remaining & 0xff;
                remaining = Math.floor(remaining / 256);
            }
            return bytes;
        }

        function float64Bytes(value) {
            const bytes = new Uint8Array(8);
            new DataView(bytes.buffer).setFloat64(0, value);
            return bytes;
        }

        // EBML header (skipped), then a Segment holding Info with a Duration, then the Cues.
        function buildWebmFile() {
            const ebml = element(0x1A45DFA3, new Uint8Array([0x01]));
            const info = element(0x1549A966, element(0x4489, float64Bytes(DURATION)));
            const cuePoints = CUES.map((cue) => element(0xBB, concat([
                element(0xB3, uintBytes(cue.time, 2)),
                element(0xB7, concat([
                    element(0xF7, uintBytes(1, 1)),
                    element(0xF1, uintBytes(cue.clusterPosition, 2))
                ]))
            ])));
            const cues = element(0x1C53BB6B, concat(cuePoints));
            const segmentPayload = concat([info, cues]);
            // Four byte size field, so the offsets below do not shift with the payload length
            const segment = element(0x18538067, segmentPayload, 4);

            segmentStart = ebml.length + tagBytes(0x18538067).length + 4;
            segmentEnd = segmentStart + segmentPayload.length;
            cuesStart = segmentStart + info.length;
            cuesEnd = cuesStart + cues.length - 1;

            return concat([ebml, segment]);
        }

        beforeEach(function () {
            webmSegmentBaseLoader = WebmSegmentBaseLoader(context).getInstance();
            webmSegmentBaseLoader.setConfig({
                // resolve() must hand back an object carrying a url, the loader reads baseUrl.url
                baseURLController: {
                    resolve: function () {
                        return { url: 'http://example.com/media.webm', serviceLocation: '' };
                    }
                },
                dashMetrics: new DashMetricsMock(),
                mediaPlayerModel: new MediaPlayerModelMock(),
                errHandler: new ErrorHandlerMock(),
                debug: new DebugMock(),
                eventBus: eventBus,
                events: Events,
                errors: Errors
            });
            webmSegmentBaseLoader.initialize();
        });

        afterEach(function () {
            webmSegmentBaseLoader.reset();
        });

        it('should turn the cue points into index records carrying the fields their consumers read', function (done) {
            const self = this.test.ctx;
            const file = buildWebmFile();

            const headers = { 'Content-Type': 'application/octet-stream' };

            webmSegmentBaseLoader.loadSegments({ path: 'http://example.com/media.webm' }, 'video', `${cuesStart}-${cuesEnd}`)
                .then((result) => {
                    expect(result.error).to.equal(undefined);
                    expect(result.segments).to.be.an('array').with.lengthOf(2);

                    const [first, second] = result.segments;

                    // Cluster positions are relative to the start of the Segment element.
                    expect(first.duration).to.equal(CUES[1].time - CUES[0].time);
                    expect(first.startTime).to.equal(CUES[0].time);
                    expect(first.timescale).to.equal(1000);
                    expect(first.mediaRange).to.equal(`${CUES[0].clusterPosition + segmentStart}-${CUES[1].clusterPosition + segmentStart - 1}`);
                    expect(first.media).to.equal(null);

                    // The final cue runs to the end of the segment, for both duration and range.
                    expect(second.duration).to.equal(DURATION - CUES[1].time);
                    expect(second.startTime).to.equal(CUES[1].time);
                    expect(second.timescale).to.equal(1000);
                    expect(second.mediaRange).to.equal(`${CUES[1].clusterPosition + segmentStart}-${segmentEnd - 1}`);
                    expect(second.media).to.equal(null);

                    done();
                })
                .catch(done);

            // The loader reads the header first, then comes back for the cues once that response
            // has been handled. The cues response carries only the requested range, which is what
            // parseCues() expects to find at offset zero.
            setTimeout(() => self.requests[0].respond(200, headers, file.buffer), 1);
            setTimeout(() => self.requests[1].respond(200, headers, file.slice(cuesStart, cuesEnd + 1).buffer), 20);
        });
    });
});
