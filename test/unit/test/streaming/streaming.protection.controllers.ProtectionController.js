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
import CustomParametersModel from '../../../../src/streaming/models/CustomParametersModel.js';
import {HTTPRequest} from '../../../../src/streaming/vo/metrics/HTTPRequest.js';
import NeedKey from '../../../../src/streaming/protection/vo/NeedKey.js';

import {expect} from 'chai';
import sinon from 'sinon';
import {fakeXhr} from 'nise';

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
        let protectionModelMock, settingsMock, protectionKeyControllerMock;

        beforeEach(function () {
            protectionKeyControllerMock = new ProtectionKeyControllerMock();
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

        it('should normalize and dedupe string-form certUrls when setProtectionData is called', function () {
            protectionController.setProtectionData({
                'com.apple.fps': {
                    certUrls: [
                        'https://example.com/cert.cer',
                        'https://example.com/cert.cer',
                        { url: 'https://example.com/other.cer', certType: 'primary' }
                    ]
                }
            });

            const protData = protectionController.getProtectionData();
            expect(protData['com.apple.fps'].certUrls).to.deep.equal([
                { url: 'https://example.com/cert.cer', certType: null },
                { url: 'https://example.com/other.cer', certType: 'primary' }
            ]);
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

        describe('NEED_KEY handling', function () {
            const widevineSchemeIdUri = 'urn:uuid:edef8ba9-79d6-4ace-a3c8-27dcd51d21ed';
            const keyIdBytes = new Uint8Array(16).fill(0xab);
            let webmSpy, psshSpy, sinfSpy;

            beforeEach(function () {
                webmSpy = sinon.spy(protectionKeyControllerMock, 'getSupportedKeySystemMetadataForWebm');
                psshSpy = sinon.spy(protectionKeyControllerMock, 'getSupportedKeySystemMetadataFromSegmentPssh');
                sinfSpy = sinon.spy(protectionKeyControllerMock, 'getSupportedKeySystemMetadataForSinf');
                protectionController.setMediaElement({});
                protectionController.initializeForMedia({
                    type: 'video',
                    contentProtection: [{ schemeIdUri: widevineSchemeIdUri }]
                });
            });

            afterEach(function () {
                protectionController.setMediaElement(null);
            });

            it('should forward webm initData to getSupportedKeySystemMetadataForWebm together with the manifest ContentProtection elements', function () {
                eventBus.trigger(ProtectionEvents.NEED_KEY, { key: new NeedKey(keyIdBytes.buffer, 'webm') });

                expect(webmSpy.calledOnce).to.be.true;
                expect(webmSpy.firstCall.args[0]).to.equal(keyIdBytes.buffer);
                expect(webmSpy.firstCall.args[1]).to.deep.equal([{ schemeIdUri: widevineSchemeIdUri }]);
                expect(psshSpy.called).to.be.false;
                expect(sinfSpy.called).to.be.false;
            });

            it('should forward cenc initData to getSupportedKeySystemMetadataFromSegmentPssh', function () {
                eventBus.trigger(ProtectionEvents.NEED_KEY, { key: new NeedKey(keyIdBytes.buffer, 'cenc') });

                expect(psshSpy.calledOnce).to.be.true;
                expect(webmSpy.called).to.be.false;
            });

            it('should ignore webm initData when a usable key for its keyId is already available', function () {
                protectionController.updateKeyStatusesMap({
                    sessionToken: {},
                    parsedKeyStatuses: [{ keyId: keyIdBytes.buffer, status: 'usable' }]
                });

                eventBus.trigger(ProtectionEvents.NEED_KEY, { key: new NeedKey(keyIdBytes.buffer, 'webm') });

                expect(webmSpy.called).to.be.false;
            });

            it('should not ignore webm initData when the key for its keyId is no longer usable', function () {
                for (const status of ['released', 'expired', 'status-pending', 'internal-error']) {
                    webmSpy.resetHistory();
                    protectionController.updateKeyStatusesMap({
                        sessionToken: {},
                        parsedKeyStatuses: [{ keyId: keyIdBytes.buffer, status }]
                    });

                    eventBus.trigger(ProtectionEvents.NEED_KEY, { key: new NeedKey(keyIdBytes.buffer, 'webm') });

                    expect(webmSpy.calledOnce, `key status ${status} should not suppress the license request`).to.be.true;
                }
            });

            it('should ignore initData of unsupported types', function () {
                eventBus.trigger(ProtectionEvents.NEED_KEY, { key: new NeedKey(keyIdBytes.buffer, 'keyids') });

                expect(webmSpy.called).to.be.false;
                expect(psshSpy.called).to.be.false;
                expect(sinfSpy.called).to.be.false;
            });

            it('should still handle encrypted events when ignoreInitDataFromManifest is enabled', function () {
                settingsMock.get = () => ({ streaming: { protection: { ignoreInitDataFromManifest: true } } });

                eventBus.trigger(ProtectionEvents.NEED_KEY, { key: new NeedKey(keyIdBytes.buffer, 'webm') });

                expect(webmSpy.calledOnce).to.be.true;
            });
        });

        describe('handleKeySystemFromManifest', function () {
            const keySystem = { systemString: 'com.widevine.alpha' };
            let createKeySessionSpy;

            beforeEach(function () {
                createKeySessionSpy = sinon.spy(protectionModelMock, 'createKeySession');
                protectionKeyControllerMock.getSupportedKeySystemMetadataFromContentProtection = () => [{
                    ks: keySystem,
                    keyId: '800aacaa-5229-58ae-8880-62b5695db6bf',
                    // A valid box header (size 8, unknown type) so that CommonEncryption.parsePSSHList can parse it and returns no PSSH
                    initData: new Uint8Array([0x00, 0x00, 0x00, 0x08, 0x00, 0x00, 0x00, 0x00]).buffer
                }];
                protectionModelMock.requestKeySystemAccess = () => Promise.resolve({ data: { keySystem } });
                protectionController.initializeForMedia({
                    type: 'video',
                    codec: 'video/mp4;codecs="avc1.4d401f"',
                    contentProtection: [{ schemeIdUri: 'urn:uuid:edef8ba9-79d6-4ace-a3c8-27dcd51d21ed' }]
                });
            });

            it('should create a key session from manifest init data by default', async function () {
                protectionController.handleKeySystemFromManifest();
                await new Promise((resolve) => setTimeout(resolve, 0));

                expect(createKeySessionSpy.calledOnce).to.be.true;
            });

            it('should not create a key session from manifest init data when ignoreInitDataFromManifest is enabled', async function () {
                settingsMock.get = () => ({ streaming: { protection: { ignoreInitDataFromManifest: true } } });

                protectionController.handleKeySystemFromManifest();
                await new Promise((resolve) => setTimeout(resolve, 0));

                expect(createKeySessionSpy.called).to.be.false;
            });
        });

        describe('createKeySession', function () {
            const keyId = '800aacaa-5229-58ae-8880-62b5695db6bf';
            const keyIdBytes = new Uint8Array([
                0x80, 0x0a, 0xac, 0xaa, 0x52, 0x29, 0x58, 0xae,
                0x88, 0x80, 0x62, 0xb5, 0x69, 0x5d, 0xb6, 0xbf
            ]);
            const initData = new Uint8Array([0x00, 0x00, 0x00, 0x08, 0x00, 0x00, 0x00, 0x00]).buffer;

            function _setKeyStatus(status, sessionIndex = 0) {
                protectionController.updateKeyStatusesMap({
                    sessionToken: protectionModelMock.getSessionTokens()[sessionIndex],
                    parsedKeyStatuses: [{ keyId: keyIdBytes.buffer, status }]
                });
            }

            beforeEach(function () {
                protectionController.createKeySession({ keyId, initData });
                expect(protectionModelMock.getSessionTokens()).to.have.lengthOf(1);
            });

            it('should not create a second session while no key status is known yet', function () {
                protectionController.createKeySession({ keyId, initData });

                expect(protectionModelMock.getSessionTokens()).to.have.lengthOf(1);
            });

            it('should not create a second session for a usable key', function () {
                _setKeyStatus('usable');

                protectionController.createKeySession({ keyId, initData });

                expect(protectionModelMock.getSessionTokens()).to.have.lengthOf(1);
            });

            it('should create a new session for a key that is expired or released', function () {
                _setKeyStatus('expired', 0);
                protectionController.createKeySession({ keyId, initData });
                expect(protectionModelMock.getSessionTokens()).to.have.lengthOf(2);

                _setKeyStatus('released', 1);
                protectionController.createKeySession({ keyId, initData });
                expect(protectionModelMock.getSessionTokens()).to.have.lengthOf(3);
            });

            it('should not create more sessions while the replacement session has not reported key statuses yet', function () {
                _setKeyStatus('expired', 0);
                protectionController.createKeySession({ keyId, initData });
                expect(protectionModelMock.getSessionTokens()).to.have.lengthOf(2);

                // The key status map still reports the key as expired, but the replacement session is still acquiring its license
                protectionController.createKeySession({ keyId, initData });
                protectionController.createKeySession({ keyId, initData });

                expect(protectionModelMock.getSessionTokens()).to.have.lengthOf(2);
            });

            it('should match key ids signaled as dashed UUID and as plain hex', function () {
                protectionController.createKeySession({ keyId: '800AACAA522958AE888062B5695DB6BF', initData });

                expect(protectionModelMock.getSessionTokens()).to.have.lengthOf(1);
            });
        });

        describe('webm key renewal', function () {
            const keySystem = { systemString: 'com.widevine.alpha' };
            const webmKeyIdBytes = new Uint8Array(16).fill(0xab);
            let webmSpy;

            beforeEach(async function () {
                webmSpy = sinon.spy(() => [{
                    ks: keySystem,
                    keyId: 'abababab-abab-abab-abab-abababababab',
                    initData: webmKeyIdBytes.buffer,
                    initDataType: 'webm'
                }]);
                protectionKeyControllerMock.getSupportedKeySystemMetadataForWebm = webmSpy;
                protectionKeyControllerMock.getSupportedKeySystemMetadataFromContentProtection = () => [{
                    ks: keySystem,
                    keyId: '800aacaa-5229-58ae-8880-62b5695db6bf',
                    initData: new Uint8Array([0x00, 0x00, 0x00, 0x08, 0x00, 0x00, 0x00, 0x00]).buffer
                }];
                protectionModelMock.requestKeySystemAccess = () => Promise.resolve({ data: { keySystem } });

                protectionController.setMediaElement({});
                protectionController.initializeForMedia({
                    type: 'video',
                    codec: 'video/webm;codecs="vp09.00.10.08"',
                    contentProtection: [{ schemeIdUri: 'urn:uuid:edef8ba9-79d6-4ace-a3c8-27dcd51d21ed' }]
                });
                protectionController.handleKeySystemFromManifest();
                await new Promise((resolve) => setTimeout(resolve, 0));
                // Session from the manifest init data plus the session created by the first webm encrypted event
                eventBus.trigger(ProtectionEvents.NEED_KEY, { key: new NeedKey(webmKeyIdBytes.buffer, 'webm') });
                expect(protectionModelMock.getSessionTokens()).to.have.lengthOf(2);
            });

            afterEach(function () {
                protectionController.setMediaElement(null);
            });

            it('should create a new session for a repeated webm encrypted event once the key is expired', function () {
                protectionController.updateKeyStatusesMap({
                    sessionToken: protectionModelMock.getSessionTokens()[1],
                    parsedKeyStatuses: [{ keyId: webmKeyIdBytes.buffer, status: 'expired' }]
                });

                eventBus.trigger(ProtectionEvents.NEED_KEY, { key: new NeedKey(webmKeyIdBytes.buffer, 'webm') });

                expect(webmSpy.calledTwice).to.be.true;
                expect(protectionModelMock.getSessionTokens()).to.have.lengthOf(3);
            });

            it('should not create a new session for a repeated webm encrypted event while the key is usable', function () {
                protectionController.updateKeyStatusesMap({
                    sessionToken: protectionModelMock.getSessionTokens()[1],
                    parsedKeyStatuses: [{ keyId: webmKeyIdBytes.buffer, status: 'usable' }]
                });

                eventBus.trigger(ProtectionEvents.NEED_KEY, { key: new NeedKey(webmKeyIdBytes.buffer, 'webm') });

                expect(webmSpy.calledOnce).to.be.true;
                expect(protectionModelMock.getSessionTokens()).to.have.lengthOf(2);
            });

            it('should not create a new session for a repeated webm encrypted event while the first session is acquiring its license', function () {
                eventBus.trigger(ProtectionEvents.NEED_KEY, { key: new NeedKey(webmKeyIdBytes.buffer, 'webm') });

                expect(protectionModelMock.getSessionTokens()).to.have.lengthOf(2);
            });
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
        let protectionModelMock, settingsMock, cmcdControllerMock, customParametersModelMock, protectionKeyControllerMock;
        let xhrMock, requests;

        beforeEach(function () {
            requests = [];
            xhrMock = fakeXhr.useFakeXMLHttpRequest();
            xhrMock.onCreate = function (xhr) {
                requests.push(xhr);
            };

            protectionKeyControllerMock = new ProtectionKeyControllerMock();
            settingsMock = Settings(context).getInstance();
            protectionModelMock = new ProtectionModelMock({ events: ProtectionEvents, eventBus: eventBus });
            cmcdControllerMock = CmcdController(context).getInstance();
            customParametersModelMock = CustomParametersModel(context).getInstance();

            protectionKeyControllerMock.getLicenseServerModelInstance = () => ({
                getHTTPMethod: () => 'POST',
                getResponseType: () => 'arraybuffer',
                getLicenseMessage: (data) => data,
                getServerURLFromMessage: (url) => url
            });

            protectionKeyControllerMock.isClearKey = () => false;
            protectionKeyControllerMock.setProtectionData = () => {};

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

        it('should have applyCmcdToRequest available for license request integration', function () {
            // ProtectionController calls cmcdController.applyCmcdToRequest in _doLicenseRequest
            // to apply CMCD data to license requests. Verify the integration contract:
            // applyCmcdToRequest exists and can be called with a license-type request.
            expect(cmcdControllerMock.applyCmcdToRequest).to.be.a('function');

            const request = {
                url: 'http://license-server.com',
                type: HTTPRequest.LICENSE,
                method: 'POST',
                headers: {}
            };

            // Should not throw when called with a license request
            expect(() => cmcdControllerMock.applyCmcdToRequest(request)).to.not.throw();
        });

    });
});
