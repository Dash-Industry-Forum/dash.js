import TimeSyncController from '../../src/streaming/controllers/TimeSyncController';
import Events from '../../src/core/events/Events';
import EventBus from '../../src/core/EventBus';

const context = {};
const eventBus = EventBus(context).getInstance();

const sinon = require('sinon');

describe('TimeSyncController', function () {
    let timeSyncController;

    beforeEach(function () {

        global.XMLHttpRequest = sinon.useFakeXMLHttpRequest();

        this.requests = [];
        global.XMLHttpRequest.onCreate = function (xhr) {
            this.requests.push(xhr);
        }.bind(this);
    });

    beforeEach(function () {
        timeSyncController = TimeSyncController(context).getInstance();
    });

    afterEach(function () {
        global.XMLHttpRequest.restore();
    });

    afterEach(function () {
        timeSyncController.reset();
        timeSyncController = null;
    });

    it('should synchronize time when time source is not defined', function (done) {
        function onCompleted() {
            eventBus.off(Events.TIME_SYNCHRONIZATION_COMPLETED, onCompleted, this);
            done();
        }
        eventBus.on(Events.TIME_SYNCHRONIZATION_COMPLETED, onCompleted, this);

        timeSyncController.initialize([]);

    });


    it('should synchronize time when time source is defined', function (done) {
        let self = this;
        let date = new Date();

        function onCompleted() {
            eventBus.off(Events.TIME_SYNCHRONIZATION_COMPLETED, onCompleted, this);
            done();
        }
        eventBus.on(Events.TIME_SYNCHRONIZATION_COMPLETED, onCompleted, this);
        timeSyncController.initialize([{
            schemeIdUri: 'urn:mpeg:dash:utc:http-xsdate:2014',
            value: 'https://time.akamai.com/?iso'
        }]);

        // simulate a response
        self.requests[0].respond(200, {
            'Content-Type': 'text/plain; charset=ISO-8859-1'
        }, date.toString());
    });

});
