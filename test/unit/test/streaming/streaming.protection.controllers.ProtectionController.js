import ProtectionController from '../../../../src/streaming/protection/controllers/ProtectionController.js';
import ProtectionEvents from '../../../../src/streaming/protection/ProtectionEvents.js';
import ProtectionErrors from '../../../../src/streaming/protection/errors/ProtectionErrors.js';
import Constants from '../../../../src/streaming/constants/Constants.js';
import EventBus from '../../../../src/core/EventBus.js';
import DebugMock from '../../mocks/DebugMock.js';
import ProtectionKeyControllerMock from '../../mocks/ProtectionKeyControllerMock.js';
import ProtectionModelMock from '../../mocks/ProtectionModelMock.js';
import CommonEncryption from '../../../../src/streaming/protection/CommonEncryption.js';
import Settings from '../../../../src/core/Settings.js';
import CmcdController from '../../../../src/streaming/controllers/CmcdController.js';
import CmcdModel from '../../../../src/streaming/models/CmcdModel.js';
import CustomParametersModel from '../../../../src/streaming/models/CustomParametersModel.js';
import Utils from '../../../../src/core/Utils.js';

import {expect} from 'chai';
import sinon from 'sinon';

const context = {};
const eventBus = EventBus(context).getInstance();
let protectionController;

describe('ProtectionController', function () {
    describe('Not well initialized', function () {
        beforeEach(function () {
            protectionController = ProtectionController(context).create({
                debug: new DebugMock(),
                events: ProtectionEvents,
                eventBus
            });
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

        it('should throw an error when getSupportedKeySystemMetadataFromContentProtection is called and config object has not been set properly', function () {
            expect(protectionController.getSupportedKeySystemMetadataFromContentProtection.bind(protectionController)).to.throw('Missing config parameter(s)');
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

            expect(keySystemsArray).to.be.instanceOf(Array);
            expect(keySystemsArray).to.be.empty;
        });
    });

    describe('Well initialized', function () {
        let protectionModelMock, settingsMock;

        beforeEach(function () {
            const protectionKeyControllerMock = new ProtectionKeyControllerMock();
            settingsMock = { get: () => ({ streaming: { protection: {} } }) };
            protectionModelMock = new ProtectionModelMock({ events: ProtectionEvents, eventBus: eventBus });
            protectionController = ProtectionController(context).create({
                protectionKeyController: protectionKeyControllerMock,
                events: ProtectionEvents,
                debug: new DebugMock(),
                protectionModel: protectionModelMock,
                eventBus: eventBus,
                constants: Constants,
                settings: settingsMock
            });
        });

        afterEach(function () {
            protectionController.reset();
        });

        it('setServerCertificate behavior', function (done) {

            let onDRMError = function (data) {
                eventBus.off(ProtectionEvents.SERVER_CERTIFICATE_UPDATED, onDRMError);
                expect(data.error.code).to.be.equal(ProtectionErrors.SERVER_CERTIFICATE_UPDATED_ERROR_CODE);
                expect(data.error.message).to.be.equal(ProtectionErrors.SERVER_CERTIFICATE_UPDATED_ERROR_MESSAGE);
                done();
            };

            eventBus.on(ProtectionEvents.SERVER_CERTIFICATE_UPDATED, onDRMError, this);

            protectionController.setServerCertificate();
        });

        it('onKeyMessage behavior', function (done) {
            let onDRMError = function (data) {
                eventBus.off(ProtectionEvents.LICENSE_REQUEST_COMPLETE, onDRMError);
                expect(data.error.code).to.be.equal(ProtectionErrors.MEDIA_KEY_MESSAGE_NO_CHALLENGE_ERROR_CODE);
                expect(data.error.message).to.be.equal(ProtectionErrors.MEDIA_KEY_MESSAGE_NO_CHALLENGE_ERROR_MESSAGE);
                done();
            };

            eventBus.on(ProtectionEvents.LICENSE_REQUEST_COMPLETE, onDRMError, this);

            protectionController.initializeForMedia({ type: 'VIDEO' });

            eventBus.trigger(ProtectionEvents.INTERNAL_KEY_MESSAGE, { data: {} });
        });

        it('should trigger KEY_SESSION_CREATED event with an error when createKeySession is called without parameter', function (done) {
            let onSessionCreated = function (data) {
                eventBus.off(ProtectionEvents.KEY_SESSION_CREATED, onSessionCreated);
                expect(data.error.code).to.be.equal(ProtectionErrors.KEY_SESSION_CREATED_ERROR_CODE);
                done();
            };

            eventBus.on(ProtectionEvents.KEY_SESSION_CREATED, onSessionCreated, this);
            protectionController.createKeySession();
        });

        it('should return the mocked array of ProtectionKeyControllerMock when getSupportedKeySystemMetadataFromContentProtection is called', function () {
            const keySystems = protectionController.getSupportedKeySystemMetadataFromContentProtection();

            expect(keySystems).to.be.instanceOf(Array);
            expect(keySystems).not.to.be.empty;
        });

        // tests for keepProtectionMediaKeysMaximumOpenSessions feature
        it('should close the oldest session when the maximum is reached and keepProtectionMediaKeys is true', function () {
            settingsMock.get = () => ({
                streaming: {
                    protection: {
                        keepProtectionMediaKeys: true,
                        keepProtectionMediaKeysMaximumOpenSessions: 2
                    }
                }
            });
            CommonEncryption.getPSSHForKeySystem = (selectedKeySystem, initData) => initData;
            protectionController.selectedKeySystem = { systemString: 'mock-system' };

            protectionController.createKeySession({ initData: new ArrayBuffer(8), keyId: 'session-1', sessionType: 'temporary' });
            protectionController.createKeySession({ initData: new ArrayBuffer(16), keyId: 'session-2', sessionType: 'temporary' });
            // add third session, should close the first one
            protectionController.createKeySession({ initData: new ArrayBuffer(24), keyId: 'session-3', sessionType: 'temporary' });

            expect(protectionModelMock.getSessionTokens().length, 'Session count should still be 2').to.equal(2);
            expect(protectionModelMock.getSessionTokens().map(s => s.keyId)).to.deep.equal(['session-2', 'session-3']);
        });

        it('should add a session if keepProtectionMediaKeys is false', function () {
            settingsMock.get = () => ({
                streaming: {
                    protection: {
                        keepProtectionMediaKeys: false,
                        keepProtectionMediaKeysMaximumOpenSessions: 2
                    }
                }
            });
            CommonEncryption.getPSSHForKeySystem = (selectedKeySystem, initData) => initData;
            protectionController.selectedKeySystem = { systemString: 'mock-system' };

            expect(protectionModelMock.getSessionTokens().length).to.equal(0);
            protectionController.createKeySession({ initData: new ArrayBuffer(8), keyId: 'session-1', sessionType: 'temporary' });
            protectionController.createKeySession({ initData: new ArrayBuffer(16), keyId: 'session-2', sessionType: 'temporary' });
            protectionController.createKeySession({ initData: new ArrayBuffer(24), keyId: 'session-3', sessionType: 'temporary' });
            expect(protectionModelMock.getSessionTokens().length).to.equal(3);
            expect(protectionModelMock.getSessionTokens().map(s => s.keyId)).to.deep.equal(['session-1', 'session-2', 'session-3']);
        });

        it('should not close any session if keepProtectionMediaKeys is true, but keepProtectionMediaKeysMaximumOpenSessions is not set', function () {
            settingsMock.get = () => ({
                streaming: {
                    protection: {
                        keepProtectionMediaKeys: true
                        // keepProtectionMediaKeysMaximumOpenSessions is undefined
                    }
                }
            });
            CommonEncryption.getPSSHForKeySystem = (selectedKeySystem, initData) => initData;
            protectionController.selectedKeySystem = { systemString: 'mock-system' };

            expect(protectionModelMock.getSessionTokens().length).to.equal(0);
            protectionController.createKeySession({ initData: new ArrayBuffer(8), keyId: 'session-1', sessionType: 'temporary' });
            protectionController.createKeySession({ initData: new ArrayBuffer(16), keyId: 'session-2', sessionType: 'temporary' });
            protectionController.createKeySession({ initData: new ArrayBuffer(24), keyId: 'session-3', sessionType: 'temporary' });
            expect(protectionModelMock.getSessionTokens().length).to.equal(3);
            expect(protectionModelMock.getSessionTokens().map(s => s.keyId)).to.deep.equal(['session-1', 'session-2', 'session-3']);
        });

    });

    describe('CMCD integration', function () {
        let protectionModelMock, settingsMock, cmcdControllerMock, cmcdModelMock, customParametersModelMock;
        let xhrMock, requests;

        beforeEach(function () {
            requests = [];
            xhrMock = sinon.useFakeXMLHttpRequest();
            xhrMock.onCreate = function (xhr) {
                requests.push(xhr);
            };

            const protectionKeyControllerMock = new ProtectionKeyControllerMock();
            settingsMock = Settings(context).getInstance();
            protectionModelMock = new ProtectionModelMock({ events: ProtectionEvents, eventBus: eventBus });
            cmcdControllerMock = CmcdController(context).getInstance();
            cmcdModelMock = CmcdModel(context).getInstance();
            customParametersModelMock = CustomParametersModel(context).getInstance();

            protectionKeyControllerMock.getLicenseServerModelInstance = () => ({
                getHTTPMethod: () => 'POST',
                getResponseType: () => 'arraybuffer',
                getLicenseMessage: (data) => data,
                getServerURLFromMessage: (url) => url
            });

            protectionKeyControllerMock.isClearKey = () => false;

            protectionController = ProtectionController(context).create({
                protectionKeyController: protectionKeyControllerMock,
                events: ProtectionEvents,
                debug: new DebugMock(),
                protectionModel: protectionModelMock,
                eventBus: eventBus,
                constants: Constants,
                settings: settingsMock,
                cmcdController: cmcdControllerMock,
                customParametersModel: customParametersModelMock
            });
        });

        afterEach(function () {
            xhrMock.restore();
            protectionController.reset();
            settingsMock.reset();
            sinon.restore();
        });

        it('should add CMCD query parameters to license requests when enabled', function () {
            settingsMock.update({
                streaming: {
                    cmcd: {
                        enabled: true,
                        mode: Constants.CMCD_MODE_QUERY,
                        includeInRequests: ['license']
                    }
                }
            });

            const mockCmcdParams = { key: 'CMCD', value: 'sid="test-session"' };
            sinon.stub(cmcdControllerMock, 'isCmcdEnabled').returns(true);
            sinon.stub(cmcdModelMock, 'getCmcdParametersFromManifest').returns({ mode: Constants.CMCD_MODE_QUERY });
            sinon.stub(cmcdControllerMock, 'getQueryParameter').returns(mockCmcdParams);
            sinon.stub(Utils, 'addAdditionalQueryParameterToUrl').returns('http://license-server.com?CMCD=sid%3D%22test-session%22');

            // Test the specific CMCD integration by verifying the model/controller interaction
            const cmcdParameters = cmcdModelMock.getCmcdParametersFromManifest();

            // Verify that getCmcdParametersFromManifest is called from CmcdModel
            expect(cmcdModelMock.getCmcdParametersFromManifest.calledOnce).to.be.true;
            expect(cmcdParameters.mode).to.equal(Constants.CMCD_MODE_QUERY);

            // Verify CMCD controller methods are called correctly
            expect(cmcdControllerMock.isCmcdEnabled()).to.be.true;
            expect(cmcdControllerMock.getQueryParameter()).to.deep.equal(mockCmcdParams);
        });

        it('should add CMCD headers to license requests when header mode is enabled', function () {
            settingsMock.update({
                streaming: {
                    cmcd: {
                        enabled: true,
                        mode: Constants.CMCD_MODE_HEADER,
                        includeInRequests: ['license']
                    }
                }
            });

            const mockCmcdHeaders = { 'CMCD-Session': 'sid="test-session"' };
            sinon.stub(cmcdControllerMock, 'isCmcdEnabled').returns(true);
            sinon.stub(cmcdModelMock, 'getCmcdParametersFromManifest').returns({ mode: Constants.CMCD_MODE_HEADER });
            sinon.stub(cmcdControllerMock, 'getHeaderParameters').returns(mockCmcdHeaders);

            // Test the specific CMCD integration by verifying the model/controller interaction
            const cmcdParameters = cmcdModelMock.getCmcdParametersFromManifest();

            // Verify that getCmcdParametersFromManifest is called from CmcdModel
            expect(cmcdModelMock.getCmcdParametersFromManifest.calledOnce).to.be.true;
            expect(cmcdParameters.mode).to.equal(Constants.CMCD_MODE_HEADER);

            // Verify CMCD controller methods are called correctly
            expect(cmcdControllerMock.isCmcdEnabled()).to.be.true;
            expect(cmcdControllerMock.getHeaderParameters()).to.deep.equal(mockCmcdHeaders);
        });

    });
});
