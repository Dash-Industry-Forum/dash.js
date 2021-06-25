import TimeSyncController from '../../src/streaming/controllers/TimeSyncController';
import Events from '../../src/core/events/Events';
import EventBus from '../../src/core/EventBus';
import Settings from '../../src/core/Settings';
import ErrorHandlerMock from './mocks/ErrorHandlerMock';

const expect = require('chai').expect;
const context = {};
const eventBus = EventBus(context).getInstance();
const errHandlerMock = new ErrorHandlerMock();

const sinon = require('sinon');

describe('TimeSyncController', function () {
    let timeSyncController;
    let settings = Settings(context).getInstance();

    beforeEach(function () {
        global.XMLHttpRequest = sinon.useFakeXMLHttpRequest();

        this.requests = [];
        global.XMLHttpRequest.onCreate = function (xhr) {
            this.requests.push(xhr);
        }.bind(this);

        timeSyncController = TimeSyncController(context).getInstance();
        timeSyncController.setConfig({
            settings,
            errHandler: errHandlerMock
        });
    });


    afterEach(function () {
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

});

function check(done, f) {
    try {
        f();
        done();
    } catch (e) {
        done(e);
    }
}
