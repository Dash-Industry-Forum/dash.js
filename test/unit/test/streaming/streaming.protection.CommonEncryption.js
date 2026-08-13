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

    describe('parsePSSHList', () => {

        it('should return an empty result for data that does not contain any PSSH box', () => {
            const initData = new Uint8Array([0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08]).buffer;

            expect(CommonEncryption.parsePSSHList(initData)).to.be.empty;
        });

        it('should terminate for data starting with a box size of zero, for instance a webm key id', () => {
            // A box size of zero must not reset the parsing cursor, otherwise the parsing loop never terminates
            const initData = new Uint8Array([
                0x00, 0x00, 0x00, 0x00, 0x11, 0x22, 0x33, 0x44,
                0x55, 0x66, 0x77, 0x88, 0x99, 0xaa, 0xbb, 0xcc
            ]).buffer;

            expect(CommonEncryption.parsePSSHList(initData)).to.be.empty;
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
})
