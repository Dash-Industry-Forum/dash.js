import ProtectionKeyController from '../../../../src/streaming/protection/controllers/ProtectionKeyController.js';
import ProtectionConstants from '../../../../src/streaming/constants/ProtectionConstants.js';
import BASE64 from '../../../../externals/base64.js';
import DebugMock from '../../mocks/DebugMock.js';

import {expect} from 'chai';

const context = {};

const WIDEVINE_SCHEME_ID_URI = 'urn:uuid:edef8ba9-79d6-4ace-a3c8-27dcd51d21ed';
const PLAYREADY_SCHEME_ID_URI = 'urn:uuid:9a04f079-9840-4286-ab92-e65be0885f95';

describe('ProtectionKeyController', function () {
    let protectionKeyController;

    beforeEach(function () {
        protectionKeyController = ProtectionKeyController(context).getInstance();
        protectionKeyController.setConfig({ debug: new DebugMock(), BASE64 });
        protectionKeyController.initialize();
    });

    describe('getSupportedKeySystemMetadataForWebm', function () {
        const keyIdBytes = new Uint8Array([
            0x80, 0x0a, 0xac, 0xaa, 0x52, 0x29, 0x58, 0xae,
            0x88, 0x80, 0x62, 0xb5, 0x69, 0x5d, 0xb6, 0xbf
        ]);
        const keyIdHex = '800aacaa522958ae888062b5695db6bf';

        it('should return an empty array when no ContentProtection elements are provided', function () {
            expect(protectionKeyController.getSupportedKeySystemMetadataForWebm(keyIdBytes.buffer, [], null, 'temporary')).to.be.empty;
            expect(protectionKeyController.getSupportedKeySystemMetadataForWebm(keyIdBytes.buffer, null, null, 'temporary')).to.be.empty;
        });

        it('should match the key system signaled in the ContentProtection elements and derive the key id from the initData', function () {
            const contentProtectionElements = [
                { schemeIdUri: WIDEVINE_SCHEME_ID_URI }
            ];

            const supportedKS = protectionKeyController.getSupportedKeySystemMetadataForWebm(keyIdBytes.buffer, contentProtectionElements, null, 'temporary');

            expect(supportedKS).to.have.lengthOf(1);
            expect(supportedKS[0].ks.systemString).to.equal(ProtectionConstants.WIDEVINE_KEYSTEM_STRING);
            expect(supportedKS[0].keyId).to.equal(keyIdHex);
            expect(supportedKS[0].initData).to.equal(keyIdBytes.buffer);
            expect(supportedKS[0].initDataType).to.equal(ProtectionConstants.INITIALIZATION_DATA_TYPE_WEBM);
            expect(supportedKS[0].sessionType).to.equal('temporary');
        });

        it('should return one entry per signaled key system', function () {
            const contentProtectionElements = [
                { schemeIdUri: WIDEVINE_SCHEME_ID_URI },
                { schemeIdUri: PLAYREADY_SCHEME_ID_URI },
                { schemeIdUri: 'urn:mpeg:dash:mp4protection:2011', value: 'cenc' }
            ];

            const supportedKS = protectionKeyController.getSupportedKeySystemMetadataForWebm(keyIdBytes.buffer, contentProtectionElements, null, 'temporary');

            expect(supportedKS).to.have.lengthOf(2);
            const systemStrings = supportedKS.map((entry) => entry.ks.systemString);
            expect(systemStrings).to.include(ProtectionConstants.WIDEVINE_KEYSTEM_STRING);
            expect(systemStrings).to.include(ProtectionConstants.PLAYREADY_KEYSTEM_STRING);
        });

        it('should not derive a key id from initData that is not 16 bytes long', function () {
            const contentProtectionElements = [
                { schemeIdUri: WIDEVINE_SCHEME_ID_URI }
            ];
            const initData = new Uint8Array([0x01, 0x02, 0x03]).buffer;

            const supportedKS = protectionKeyController.getSupportedKeySystemMetadataForWebm(initData, contentProtectionElements, null, 'temporary');

            expect(supportedKS).to.have.lengthOf(1);
            expect(supportedKS[0].keyId).to.be.null;
            expect(supportedKS[0].initData).to.equal(initData);
        });

        it('should attach the application provided protection data for the matching key system', function () {
            const contentProtectionElements = [
                { schemeIdUri: WIDEVINE_SCHEME_ID_URI }
            ];
            const protDataSet = {
                [ProtectionConstants.WIDEVINE_KEYSTEM_STRING]: { serverURL: 'https://license.example.com' }
            };

            const supportedKS = protectionKeyController.getSupportedKeySystemMetadataForWebm(keyIdBytes.buffer, contentProtectionElements, protDataSet, 'temporary');

            expect(supportedKS).to.have.lengthOf(1);
            expect(supportedKS[0].protData).to.deep.equal(protDataSet[ProtectionConstants.WIDEVINE_KEYSTEM_STRING]);
        });
    });
});
