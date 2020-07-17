import ProtectionController from '../../src/streaming/protection/controllers/ProtectionController';
import ProtectionEvents from '../../src/streaming/protection/ProtectionEvents';
import ProtectionErrors from '../../src/streaming/protection/errors/ProtectionErrors';
import Constants from '../../src/streaming/constants/Constants';

import EventBus from '../../src/core/EventBus';
import DebugMock from './mocks/DebugMock';

import ProtectionKeyControllerMock from './mocks/ProtectionKeyControllerMock';
import ProtectionModelMock from './mocks/ProtectionModelMock';

const expect = require('chai').expect;
const context = {};
const eventBus = EventBus(context).getInstance();
let protectionController;
const protectionKeyControllerMock = new ProtectionKeyControllerMock();

describe('ProtectionController', function () {
    describe('Not well initialized', function () {
        beforeEach(function () {
            protectionController = ProtectionController(context).create({debug: new DebugMock()});
        });

        afterEach(function () {
            expect(protectionController.reset.bind(protectionController)).to.throw('Missing config parameter(s)');
        });
        it('should throw an exception when attempting to call initializeForMedia function without mediaInfo parameter', function () {
            expect(protectionController.initializeForMedia.bind(protectionController)).to.throw('mediaInfo can not be null or undefined');
        });

        it('should throw an error when initializeForMedia is called and config object has not been set properly', function () {
            expect(protectionController.initializeForMedia.bind(protectionController, {})).to.throw('Missing config parameter(s)');
        });

        it('should throw an error when getSupportedKeySystemsFromContentProtection is called and config object has not been set properly', function () {
            expect(protectionController.getSupportedKeySystemsFromContentProtection.bind(protectionController)).to.throw('Missing config parameter(s)');
        });

        it('should throw an error when loadKeySession is called and config object has not been set properly', function () {
            expect(protectionController.loadKeySession.bind(protectionController)).to.throw('Missing config parameter(s)');
        });

        it('should throw an error when removeKeySession is called and config object has not been set properly', function () {
            expect(protectionController.removeKeySession.bind(protectionController)).to.throw('Missing config parameter(s)');
        });

        it('should throw an error when closeKeySession is called and config object has not been set properly', function () {
            expect(protectionController.closeKeySession.bind(protectionController)).to.throw('Missing config parameter(s)');
        });

        it('should throw an error when setServerCertificate is called and config object has not been set properly', function () {
            expect(protectionController.setServerCertificate.bind(protectionController)).to.throw('Missing config parameter(s)');
        });

        it('should throw an error when setMediaElement is called and config object has not been set properly', function () {
            expect(protectionController.setMediaElement.bind(protectionController)).to.throw('Missing config parameter(s)');
        });

        it('should return empty array when getKeySystems is called and config object has not been set properly', function () {
            const keySystemsArray = protectionController.getKeySystems();

            expect(keySystemsArray).to.be.instanceOf(Array); // jshint ignore:line
            expect(keySystemsArray).to.be.empty;            // jshint ignore:line
        });
    });

    describe('Well initialized', function () {
        beforeEach(function () {
            protectionController = ProtectionController(context).create({protectionKeyController: protectionKeyControllerMock,
                events: ProtectionEvents,
                debug: new DebugMock(),
                protectionModel: new ProtectionModelMock({events: ProtectionEvents, eventBus: eventBus}),
                eventBus: eventBus,
                constants: Constants});
        });

        afterEach(function () {
            protectionController.reset();
        });

        it('onKeyMessage behavior', function (done) {
            let onDRMError = function (data) {
                eventBus.off(ProtectionEvents.LICENSE_REQUEST_COMPLETE, onDRMError);
                expect(data.error.code).to.be.equal(ProtectionErrors.MEDIA_KEY_MESSAGE_NO_CHALLENGE_ERROR_CODE); // jshint ignore:line
                expect(data.error.message).to.be.equal(ProtectionErrors.MEDIA_KEY_MESSAGE_NO_CHALLENGE_ERROR_MESSAGE); // jshint ignore:line
                done();
            };

            eventBus.on(ProtectionEvents.LICENSE_REQUEST_COMPLETE, onDRMError, this);

            protectionController.initializeForMedia({type: 'VIDEO'});

            eventBus.trigger(ProtectionEvents.INTERNAL_KEY_MESSAGE, {data: {}});
        });

        it('setServerCertificate behavior', function (done) {

            let onDRMError = function (data) {
                eventBus.off(ProtectionEvents.SERVER_CERTIFICATE_UPDATED, onDRMError);
                expect(data.error.code).to.be.equal(ProtectionErrors.SERVER_CERTIFICATE_UPDATED_ERROR_CODE); // jshint ignore:line
                expect(data.error.message).to.be.equal(ProtectionErrors.SERVER_CERTIFICATE_UPDATED_ERROR_MESSAGE); // jshint ignore:line
                done();
            };

            eventBus.on(ProtectionEvents.SERVER_CERTIFICATE_UPDATED, onDRMError, this);

            protectionController.setServerCertificate();
        });

        it('should trigger KEY_SESSION_CREATED event with an error when createKeySession is called without parameter', function (done) {
            let onSessionCreated = function (data) {
                eventBus.off(ProtectionEvents.KEY_SESSION_CREATED, onSessionCreated);
                expect(data.error.code).to.be.equal(ProtectionErrors.KEY_SESSION_CREATED_ERROR_CODE); // jshint ignore:line
                done();
            };

            eventBus.on(ProtectionEvents.KEY_SESSION_CREATED, onSessionCreated, this);
            protectionController.createKeySession();
        });

        it('should return the mocked array of ProtectionKeyControllerMock when getSupportedKeySystemsFromContentProtection is called', function () {
            const keySystems = protectionController.getSupportedKeySystemsFromContentProtection();

            expect(keySystems).to.be.instanceOf(Array); // jshint ignore:line
            expect(keySystems).not.to.be.empty;         // jshint ignore:line
        });

        it('should ????? when setMediaElement is called', function () {
            protectionController.initializeForMedia({type: 'VIDEO'});

            protectionController.setMediaElement({});

            expect(eventBus.trigger.bind(eventBus, ProtectionEvents.NEED_KEY, {key: {initDataType: 'cenc'}})).not.to.throw();
        });
    });
});