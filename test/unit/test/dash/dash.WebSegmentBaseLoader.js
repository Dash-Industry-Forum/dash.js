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

        const duration = [0x44, 0x89, 0x84, 0x47, 0x1c, 0x40, 0x00]; // 40000 ticks
        const timecodeScale = [0x2a, 0xd7, 0xb1, 0x83, 0x01, 0x86, 0xa0]; // 100000 ns
        [
            { name: 'omitted', info: duration, timescale: 1000 },
            { name: 'before Duration', info: [...timecodeScale, ...duration], timescale: 10000 },
            { name: 'after Duration', info: [...duration, ...timecodeScale], timescale: 10000 },
            { name: 'before truncated metadata', info: [...timecodeScale, ...duration, 0x7b], timescale: 10000, truncated: true }
        ].forEach(({ name, info, timescale, truncated }) => {
            it(`should use the TimecodeScale ${name} in Info for cue timestamps and durations`, async function () {
                const responses = [
                    new Uint8Array([
                        0x1a, 0x45, 0xdf, 0xa3, 0x80, // EBML header
                        0x18, 0x53, 0x80, 0x67, 0x44, 0x00, // Segment: 1024 bytes, starting at byte 11
                        0x15, 0x49, 0xa9, 0x66, 0x80 | (info.length + (truncated ? 8 : 0)), ...info,
                        ...(truncated ? [] : [0x16, 0x54, 0xae, 0x6b, 0x80]) // Tracks, outside Info
                    ]).buffer,
                    new Uint8Array([
                        0x1c, 0x53, 0xbb, 0x6b, 0x9c, // Cues
                        0xbb, 0x8c, 0xb3, 0x82, 0x00, 0x00, 0xb7, 0x86, 0xf7, 0x81, 0x01, 0xf1, 0x81, 0x64,
                        0xbb, 0x8c, 0xb3, 0x82, 0x4e, 0x20, 0xb7, 0x86, 0xf7, 0x81, 0x01, 0xf1, 0x81, 0xc8
                    ]).buffer
                ];
                XMLHttpRequest.onCreate = (xhr) => {
                    setTimeout(() => xhr.respond(200, {}, responses.shift()), 0);
                };

                const result = await webmSegmentBaseLoader.loadSegments({ path: { url: '/video.webm' } }, 'video', '900-932');

                expect(result.error).to.equal(undefined);
                expect(result.segments).to.have.lengthOf(2);
                result.segments.forEach((segment, index) => {
                    expect(segment.timescale).to.equal(timescale);
                    expect(segment.startTime).to.equal(index * 20000);
                    expect(segment.duration).to.equal(20000);
                    expect(segment.mediaRange).to.equal(index === 0 ? '111-210' : '211-1034');
                });
            });
        });
    });
});
