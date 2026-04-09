import CommonEncryption from '../../../../src/streaming/protection/CommonEncryption.js';
import Base64 from '../../../../externals/base64.js';

import {expect} from 'chai';

let cpData;

describe('CommonEncryption', () => {

    beforeEach(() => {
        cpData = {
            'pssh': {
                '__text': 'AAAANHBzc2gAAAAA7e+LqXnWSs6jyCfc1R0h7QAAABQIARABGgZlbHV2aW8iBmVsdXZpbw=='
            },
            'value': 'Widevine',
            'schemeIdUri': 'urn:uuid:edef8ba9-79d6-4ace-a3c8-27dcd51d21ed',
            'KID': null
        };
    });

    describe('parseInitDataFromContentProtection', () => {

        it('should return null if no init data is available in the ContentProtection element', () => {
            cpData = {};
            const result = CommonEncryption.parseInitDataFromContentProtection(cpData, Base64);

            expect(result).to.be.null; // jshint ignore:line
        });

        it('should return base64 decoded string if init data is available in the ContentProtection element', () => {
            const result = CommonEncryption.parseInitDataFromContentProtection(cpData, Base64);
            const expectedByteLength = Base64.decodeArray(cpData.pssh.__text).buffer.byteLength;

            expect(result.byteLength).to.equal(expectedByteLength);
        });

        it('should remove newlines and return base64 decoded string if init data is available in the ContentProtection element', () => {
            const expectedByteLength = Base64.decodeArray(cpData.pssh.__text).buffer.byteLength;
            cpData.pssh.__text = '\nAAAANHBzc2gAAAAA7e+LqXnWSs6jyCfc1R0h7QAAABQIARABGgZlbHV2aW8iBmVsdXZpbw==\n';
            const originalByteLength = Base64.decodeArray(cpData.pssh.__text).buffer.byteLength;
            const result = CommonEncryption.parseInitDataFromContentProtection(cpData, Base64);

            expect(originalByteLength).to.not.equal(result.byteLength);
            expect(result.byteLength).to.equal(expectedByteLength);
        });

        it('should remove whitespaces and return base64 decoded string if init data is available in the ContentProtection element', () => {
            const expectedByteLength = Base64.decodeArray(cpData.pssh.__text).buffer.byteLength;
            cpData.pssh.__text = 'AAAANHBzc2gAAAAA7e+LqXnWSs6jy          Cfc1R0h7QAAABQIARABGgZlbHV2aW8iBmVsdXZpbw==';
            const originalByteLength = Base64.decodeArray(cpData.pssh.__text).buffer.byteLength;
            const result = CommonEncryption.parseInitDataFromContentProtection(cpData, Base64);

            expect(originalByteLength).to.not.equal(result.byteLength);
            expect(result.byteLength).to.equal(expectedByteLength);
        });

        it('should remove whitespaces and newlines and return base64 decoded string if init data is available in the ContentProtection element', () => {
            const expectedByteLength = Base64.decodeArray(cpData.pssh.__text).buffer.byteLength;
            cpData.pssh.__text = '\n\n\nAAAANHBzc2gAAAAA7e+LqXnWSs6jy          Cfc1R0h7QAAABQIARABGgZlbHV2aW8iBmVsdXZpbw==\n\n';
            const originalByteLength = Base64.decodeArray(cpData.pssh.__text).buffer.byteLength;
            const result = CommonEncryption.parseInitDataFromContentProtection(cpData, Base64);

            expect(originalByteLength).to.not.equal(result.byteLength);
            expect(result.byteLength).to.equal(expectedByteLength);
        });

    });

    describe('getLicenseServerUrlFromMediaInfo', () => {
        let mediaInfo;
        let schemeIdUri = 'abcd-efgh';

        beforeEach(() => {
            mediaInfo = [{
                contentProtection: [
                    {
                        schemeIdUri: schemeIdUri,
                        laUrl: {
                            __prefix: 'dashif',
                            __text: 'license-server-url'
                        }
                    }
                ]
            }]
        });

        afterEach(() => {
            mediaInfo = null;
        })

        it('should return null in case the schemeIdUri does not match', () => {
            const result = CommonEncryption.getLicenseServerUrlFromMediaInfo(mediaInfo, 'nomatch');

            expect(result).to.be.null;
        });

        it('should return null if license server url is empty', () => {
            mediaInfo[0].contentProtection[0].laUrl.__text = '';
            const result = CommonEncryption.getLicenseServerUrlFromMediaInfo(mediaInfo, schemeIdUri);

            expect(result).to.be.null;
        })

        it('should return null if wrong prefix', () => {
            mediaInfo[0].contentProtection[0].laUrl.__prefix = 'wrongprefix';
            const result = CommonEncryption.getLicenseServerUrlFromMediaInfo(mediaInfo, schemeIdUri);

            expect(result).to.be.null;
        })

        it('should return null if wrong attribute', () => {
            delete mediaInfo[0].contentProtection[0].laUrl;
            const result = CommonEncryption.getLicenseServerUrlFromMediaInfo(mediaInfo, schemeIdUri);

            expect(result).to.be.null;
        })

        it('should return valid license server for dashif:laurl', () => {
            const result = CommonEncryption.getLicenseServerUrlFromMediaInfo(mediaInfo, schemeIdUri);

            expect(result).to.be.equal('license-server-url');
        })

        it('should return valid license server for clearkey:laurl', () => {
            mediaInfo[0].contentProtection[0].__prefix = 'clearkey'
            const result = CommonEncryption.getLicenseServerUrlFromMediaInfo(mediaInfo, schemeIdUri);

            expect(result).to.be.equal('license-server-url');
        })

        it('should return valid license server for ck:laurl', () => {
            mediaInfo[0].contentProtection[0].__prefix = 'ck'
            const result = CommonEncryption.getLicenseServerUrlFromMediaInfo(mediaInfo, schemeIdUri);

            expect(result).to.be.equal('license-server-url');
        })

    });

    describe('extractKeyIdsFromPssh', () => {

        it('should return empty array for null input', () => {
            expect(CommonEncryption.extractKeyIdsFromPssh(null)).to.be.empty;
        });

        it('should return empty array for undefined input', () => {
            expect(CommonEncryption.extractKeyIdsFromPssh(undefined)).to.be.empty;
        });

        it('should return empty array for version 0 PSSH (no KIDs)', () => {
            // Build a minimal version 0 PSSH box: size(4) + 'pssh'(4) + version(1) + flags(3) + systemID(16) + dataSize(4) = 32 bytes
            const buffer = new ArrayBuffer(32);
            const dv = new DataView(buffer);
            dv.setUint32(0, 32); // box size
            dv.setUint32(4, 0x70737368); // 'pssh'
            dv.setUint8(8, 0); // version 0
            // flags (3 bytes) = 0, systemID (16 bytes) = 0, dataSize (4 bytes) = 0
            dv.setUint32(28, 0); // data size

            const result = CommonEncryption.extractKeyIdsFromPssh(buffer);
            expect(result).to.be.an('array').that.is.empty;
        });

        it('should extract a single KID from a version 1 PSSH box', () => {
            // version 1 PSSH: size(4) + 'pssh'(4) + version(1) + flags(3) + systemID(16) + kidCount(4) + KID(16) + dataSize(4) = 48 bytes
            const buffer = new ArrayBuffer(52);
            const dv = new DataView(buffer);
            dv.setUint32(0, 52); // box size
            dv.setUint32(4, 0x70737368); // 'pssh'
            dv.setUint8(8, 1); // version 1
            // flags = 0 (bytes 9-11)
            // systemID (bytes 12-27) = 0
            dv.setUint32(28, 1); // kidCount = 1
            // KID at offset 32, 16 bytes: 01020304-0506-0708-090a-0b0c0d0e0f10
            const kid = [0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08,
                0x09, 0x0a, 0x0b, 0x0c, 0x0d, 0x0e, 0x0f, 0x10];
            kid.forEach((b, i) => { dv.setUint8(32 + i, b); });
            dv.setUint32(48, 0); // data size

            const result = CommonEncryption.extractKeyIdsFromPssh(buffer);
            expect(result).to.have.lengthOf(1);
            expect(result[0]).to.equal('0102030405060708090a0b0c0d0e0f10');
        });

        it('should extract multiple KIDs from a version 1 PSSH box', () => {
            // 2 KIDs: size(4) + 'pssh'(4) + version(1) + flags(3) + systemID(16) + kidCount(4) + 2*KID(32) + dataSize(4) = 68 bytes
            const buffer = new ArrayBuffer(68);
            const dv = new DataView(buffer);
            dv.setUint32(0, 68); // box size
            dv.setUint32(4, 0x70737368); // 'pssh'
            dv.setUint8(8, 1); // version 1
            dv.setUint32(28, 2); // kidCount = 2
            // KID 1
            for (let i = 0; i < 16; i++) { dv.setUint8(32 + i, 0xAA); }
            // KID 2
            for (let i = 0; i < 16; i++) { dv.setUint8(48 + i, 0xBB); }
            dv.setUint32(64, 0); // data size

            const result = CommonEncryption.extractKeyIdsFromPssh(buffer);
            expect(result).to.have.lengthOf(2);
            expect(result[0]).to.equal('aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa');
            expect(result[1]).to.equal('bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb');
        });

        it('should skip non-PSSH boxes and still extract KIDs', () => {
            // First box: non-PSSH (8 bytes), second box: version 1 PSSH with 1 KID (52 bytes)
            const buffer = new ArrayBuffer(60);
            const dv = new DataView(buffer);
            // Non-PSSH box
            dv.setUint32(0, 8); // size
            dv.setUint32(4, 0x66726565); // 'free'
            // PSSH box
            dv.setUint32(8, 52); // size
            dv.setUint32(12, 0x70737368); // 'pssh'
            dv.setUint8(16, 1); // version 1
            dv.setUint32(36, 1); // kidCount = 1
            for (let i = 0; i < 16; i++) { dv.setUint8(40 + i, 0xCC); }
            dv.setUint32(56, 0); // data size

            const result = CommonEncryption.extractKeyIdsFromPssh(buffer);
            expect(result).to.have.lengthOf(1);
            expect(result[0]).to.equal('cccccccccccccccccccccccccccccccc');
        });
    });
})
