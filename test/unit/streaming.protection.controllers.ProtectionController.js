import ProtectionController from '../../src/streaming/protection/controllers/ProtectionController';
import ProtectionEvents from '../../src/streaming/protection/ProtectionEvents';
import EventBus from '../../src/core/EventBus';
import DebugMock from './mocks/DebugMock';

import ProtectionKeyControllerMock from './mocks/ProtectionKeyControllerMock';

const expect = require('chai').expect;
const context = {};
const eventBus = EventBus(context).getInstance();

describe('ProtectionController', function () {
    describe('Not well initialized', function () {
        let protectionController = ProtectionController(context).create({debug: new DebugMock()});

        it('should throw an exception when attempting to call initializeForMedia function without mediaInfo parameter', function () {
            expect(protectionController.initializeForMedia.bind(protectionController)).to.throw('mediaInfo can not be null or undefined');
        });

        it('should throw an error when initializeForMedia is called and config object has not been set properly', function () {
            expect(protectionController.initializeForMedia.bind(protectionController, {})).to.throw('Missing config parameter(s)');
        });
    });

    describe('onKeyMessage behavior', function () {
        it('', function (done) {
            const protectionKeyControllerMock = new ProtectionKeyControllerMock();
            let protectionController = ProtectionController(context).create({protectionKeyController: protectionKeyControllerMock,
                                                                             events: ProtectionEvents,
                                                                             debug: new DebugMock(),
                                                                             eventBus: eventBus});

            let onDRMError = function (data) {
                eventBus.off(ProtectionEvents.LICENSE_REQUEST_COMPLETE, onDRMError);
                expect(data.error).to.be.equal('DRM: Empty key message from CDM'); // jshint ignore:line
                done();
            };

            eventBus.on(ProtectionEvents.LICENSE_REQUEST_COMPLETE, onDRMError, this);

            protectionController.initializeForMedia({});

            eventBus.trigger(ProtectionEvents.INTERNAL_KEY_MESSAGE, {data: {}});
        });
    });
});