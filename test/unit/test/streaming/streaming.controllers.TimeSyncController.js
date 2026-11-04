import TimeSyncController from '../../../../src/streaming/controllers/TimeSyncController.js';
import Events from '../../../../src/core/events/Events.js';
import EventBus from '../../../../src/core/EventBus.js';
import Settings from '../../../../src/core/Settings.js';
import ErrorHandlerMock from '../../mocks/ErrorHandlerMock.js';
import DashParser from '../../../../src/dash/parser/DashParser.js';
import DashManifestModel from '../../../../src/dash/models/DashManifestModel.js';
import DebugMock from '../../mocks/DebugMock.js';
import sinon from 'sinon';

import {expect} from 'chai';
const context = {};
const eventBus = EventBus(context).getInstance();
const errHandlerMock = new ErrorHandlerMock();

import {fakeXhr} from 'nise';

describe('TimeSyncController', function () {
    let timeSyncController;
    let settings = Settings(context).getInstance();

    beforeEach(function () {
        window.XMLHttpRequest = fakeXhr.useFakeXMLHttpRequest();

        this.requests = [];
        window.XMLHttpRequest.onCreate = function (xhr) {
            this.requests.push(xhr);
        }.bind(this);

        timeSyncController = TimeSyncController(context).getInstance();
        timeSyncController.setConfig({
            settings,
            errHandler: errHandlerMock
        });
    });


    afterEach(function () {
        window.XMLHttpRequest.restore();
        timeSyncController.reset();
        timeSyncController = null;
        settings.reset();
    });

    it('should trigger TIME_SYNCHRONIZATION_COMPLETED when time source is not defined and no date header is used', function (done) {
        function onCompleted() {
            eventBus.off(Events.TIME_SYNCHRONIZATION_COMPLETED, onCompleted, this);
            done();
        }

        eventBus.on(Events.TIME_SYNCHRONIZATION_COMPLETED, onCompleted, this);
        settings.update({ streaming: { utcSynchronization: {useManifestDateHeaderTimeSource: false }} });
        timeSyncController.initialize();
        timeSyncController.attemptSync([]);
    });

    it('should trigger UPDATE_TIME_SYNC_OFFSET when time source is not defined and no date header is used', function (done) {
        function onCompleted(e) {
            eventBus.off(Events.UPDATE_TIME_SYNC_OFFSET, onCompleted, this);
            check(done, function () {
                expect(e.offset).to.be.NaN
            });
        }

        eventBus.on(Events.UPDATE_TIME_SYNC_OFFSET, onCompleted, this);
        settings.update({ streaming: { utcSynchronization: {useManifestDateHeaderTimeSource: false }} });
        timeSyncController.initialize();
        timeSyncController.attemptSync([], true);
    });


    it('should synchronize time when time source is defined', function (done) {
        let self = this;
        let date = new Date();

        function onCompleted() {
            eventBus.off(Events.TIME_SYNCHRONIZATION_COMPLETED, onCompleted, this);
            done();
        }

        eventBus.on(Events.TIME_SYNCHRONIZATION_COMPLETED, onCompleted, this);
        timeSyncController.initialize();
        timeSyncController.attemptSync([{
            schemeIdUri: 'urn:mpeg:dash:utc:http-xsdate:2014',
            value: 'https://time.akamai.com/?iso'
        }], true);

        // simulate a response
        self.requests[0].respond(200, {
            'Content-Type': 'text/plain; charset=ISO-8859-1'
        }, date.toString());
    });

    it('should calculate offset when time source is defined', function (done) {
        let self = this;
        let date = new Date();

        function onCompleted(e) {
            eventBus.off(Events.UPDATE_TIME_SYNC_OFFSET, onCompleted, this);
            check(done, function () {
                expect(e.offset).to.be.a('number');
            });
        }

        eventBus.on(Events.UPDATE_TIME_SYNC_OFFSET, onCompleted, this);
        timeSyncController.initialize();
        timeSyncController.attemptSync([{
            schemeIdUri: 'urn:mpeg:dash:utc:http-xsdate:2014',
            value: 'https://time.akamai.com/?iso'
        }], true);

        // simulate a response
        self.requests[0].respond(200, {
            'Content-Type': 'text/plain; charset=ISO-8859-1'
        }, date.toString());
    });

    [
        ['without a timezone', '2026-09-13T12:34:56.789', '2014', 789],
        ['without seconds or a timezone', '2026-09-13T12:34', '2014', -56000],
        ['with UTC', '2026-09-13T12:34:56.789Z', '2014', 789],
        ['with a timezone offset', '2026-09-13T14:34:56.789+02:00', '2014', 789],
        ['with an empty fraction and a timezone offset', '2026-09-13T14:34:56.+02:00', '2014', 0],
        ['with the legacy scheme', '2026-09-13T12:34:56.789', '2012', 789],
        ['with an RFC date', 'Sun, 13 Sep 2026 12:34:56 GMT', '2014', 0]
    ].forEach(([description, value, version, expectedOffset]) => {
        it(`should synchronize a parsed direct UTC source ${description}`, function () {
            const clock = sinon.useFakeTimers({ now: Date.UTC(2026, 8, 13, 12, 34, 56), toFake: ['Date'] });
            let offset;
            const onOffset = event => { offset = event.offset; };
            eventBus.on(Events.UPDATE_TIME_SYNC_OFFSET, onOffset, this);

            try {
                const parser = DashParser(context).create({ debug: new DebugMock() });
                const manifest = parser.parse(`<MPD type="dynamic">
                    <UTCTiming schemeIdUri="urn:mpeg:dash:utc:direct:${version}" value="${value}"/>
                </MPD>`);
                const sources = DashManifestModel(context).getInstance().getUTCTimingSources(manifest);
                settings.update({ streaming: { utcSynchronization: { backgroundAttempts: 0 } } });
                timeSyncController.initialize();
                timeSyncController.attemptSync(sources, true);

                expect(offset).to.equal(expectedOffset);
            } finally {
                eventBus.off(Events.UPDATE_TIME_SYNC_OFFSET, onOffset, this);
                clock.restore();
            }
        });
    });

    it('should parse an http-iso UTC source without a timezone as UTC', function () {
        const clock = sinon.useFakeTimers({ now: Date.UTC(2026, 8, 13, 12, 34, 56), toFake: ['Date'] });
        let offset;
        const onOffset = event => { offset = event.offset; };
        eventBus.on(Events.UPDATE_TIME_SYNC_OFFSET, onOffset, this);

        try {
            settings.update({ streaming: { utcSynchronization: { backgroundAttempts: 0 } } });
            timeSyncController.initialize();
            timeSyncController.attemptSync([{
                schemeIdUri: 'urn:mpeg:dash:utc:http-iso:2014',
                value: 'https://time.akamai.com/?iso&ms'
            }], true);
            this.requests[0].respond(200, { 'Content-Type': 'text/plain' }, '2026-09-13T12:34:56.789');

            expect(offset).to.equal(789);
        } finally {
            eventBus.off(Events.UPDATE_TIME_SYNC_OFFSET, onOffset, this);
            clock.restore();
        }
    });

});

function check(done, f) {
    try {
        f();
        done();
    } catch (e) {
        done(e);
    }
}
