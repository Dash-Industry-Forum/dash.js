import CommonEncryption from '../../src/streaming/protection/CommonEncryption';
import Base64 from '../../externals/base64';

const expect = require('chai').expect;
let cpData;

describe('CommonEncryption',  () => {

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
            const result = CommonEncryption.parseInitDataFromContentProtection(cpData,Base64);

            expect(result).to.be.null; // jshint ignore:line
        });

        it('should return base64 decoded string if init data is available in the ContentProtection element', () => {
            const result = CommonEncryption.parseInitDataFromContentProtection(cpData,Base64);
            const expectedByteLength = Base64.decodeArray(cpData.pssh.__text).buffer.byteLength;

            expect(result.byteLength).to.equal(expectedByteLength);
        });

        it('should remove newlines and return base64 decoded string if init data is available in the ContentProtection element', () => {
            const expectedByteLength = Base64.decodeArray(cpData.pssh.__text).buffer.byteLength;
            cpData.pssh.__text = '\nAAAANHBzc2gAAAAA7e+LqXnWSs6jyCfc1R0h7QAAABQIARABGgZlbHV2aW8iBmVsdXZpbw==\n';
            const originalByteLength = Base64.decodeArray(cpData.pssh.__text).buffer.byteLength;
            const result = CommonEncryption.parseInitDataFromContentProtection(cpData,Base64);

            expect(originalByteLength).to.not.equal(result.byteLength);
            expect(result.byteLength).to.equal(expectedByteLength);
        });

        it('should remove whitespaces and return base64 decoded string if init data is available in the ContentProtection element', () => {
            const expectedByteLength = Base64.decodeArray(cpData.pssh.__text).buffer.byteLength;
            cpData.pssh.__text = 'AAAANHBzc2gAAAAA7e+LqXnWSs6jy          Cfc1R0h7QAAABQIARABGgZlbHV2aW8iBmVsdXZpbw==';
            const originalByteLength = Base64.decodeArray(cpData.pssh.__text).buffer.byteLength;
            const result = CommonEncryption.parseInitDataFromContentProtection(cpData,Base64);

            expect(originalByteLength).to.not.equal(result.byteLength);
            expect(result.byteLength).to.equal(expectedByteLength);
        });

        it('should remove whitespaces and newlines and return base64 decoded string if init data is available in the ContentProtection element', () => {
            const expectedByteLength = Base64.decodeArray(cpData.pssh.__text).buffer.byteLength;
            cpData.pssh.__text = '\n\n\nAAAANHBzc2gAAAAA7e+LqXnWSs6jy          Cfc1R0h7QAAABQIARABGgZlbHV2aW8iBmVsdXZpbw==\n\n';
            const originalByteLength = Base64.decodeArray(cpData.pssh.__text).buffer.byteLength;
            const result = CommonEncryption.parseInitDataFromContentProtection(cpData,Base64);

            expect(originalByteLength).to.not.equal(result.byteLength);
            expect(result.byteLength).to.equal(expectedByteLength);
        });

    });

});
