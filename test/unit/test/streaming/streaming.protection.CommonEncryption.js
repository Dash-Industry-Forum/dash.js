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

    describe('parsePSSHList / getPSSHForKeySystem / getKeyIdsForKeySystem', () => {
        const WIDEVINE_SYSTEM_ID = 'edef8ba9-79d6-4ace-a3c8-27dcd51d21ed';
        const PLAYREADY_SYSTEM_ID = '9a04f079-9840-4286-ab92-e65be0885f95';
        const KID_1 = '00112233445566778899aabbccddeeff';
        const KID_2 = 'ffeeddccbbaa00998877665544332211';
        const widevineKeySystem = { uuid: WIDEVINE_SYSTEM_ID };
        const playreadyKeySystem = { uuid: PLAYREADY_SYSTEM_ID };

        function hexToBytes(hex) {
            const bytes = [];
            for (let i = 0; i < hex.length; i += 2) {
                bytes.push(parseInt(hex.substr(i, 2), 16));
            }
            return bytes;
        }

        // Builds a single PSSH box per ISO/IEC 23001-7, optionally with a version 1+ key ID list
        function buildPsshBox({ systemId, version = 0, keyIds = [], data = [] }) {
            const systemIdBytes = hexToBytes(systemId.replace(/-/g, ''));
            const keyIdBytes = keyIds.map((keyId) => hexToBytes(keyId));
            const dataBytes = new Uint8Array(data);

            let size = 4 + 4 + 1 + 3 + 16;
            if (version >= 1) {
                size += 4 + keyIdBytes.length * 16;
            }
            size += 4 + dataBytes.length;

            const buffer = new ArrayBuffer(size);
            const dv = new DataView(buffer);
            let offset = 0;
            dv.setUint32(offset, size);
            offset += 4;
            dv.setUint32(offset, 0x70737368); // 'pssh'
            offset += 4;
            dv.setUint8(offset, version);
            offset += 1;
            offset += 3; // flags, always 0
            systemIdBytes.forEach((b) => {
                dv.setUint8(offset, b);
                offset++;
            });
            if (version >= 1) {
                dv.setUint32(offset, keyIdBytes.length);
                offset += 4;
                keyIdBytes.forEach((kid) => {
                    kid.forEach((b) => {
                        dv.setUint8(offset, b);
                        offset++;
                    });
                });
            }
            dv.setUint32(offset, dataBytes.length);
            offset += 4;
            dataBytes.forEach((b) => {
                dv.setUint8(offset, b);
                offset++;
            });

            return buffer;
        }

        function concatBoxes(boxes) {
            const total = boxes.reduce((sum, box) => sum + box.byteLength, 0);
            const result = new Uint8Array(total);
            let offset = 0;
            boxes.forEach((box) => {
                result.set(new Uint8Array(box), offset);
                offset += box.byteLength;
            });
            return result.buffer;
        }

        it('should return an empty object for null or undefined init data', () => {
            expect(CommonEncryption.parsePSSHList(null)).to.deep.equal([]);
            expect(CommonEncryption.parsePSSHList(undefined)).to.deep.equal([]);
        })

        it('should return an empty object for an empty buffer', () => {
            expect(CommonEncryption.parsePSSHList(new ArrayBuffer(0))).to.deep.equal({});
        })

        it('should parse a version 0 box with no key IDs', () => {
            const initData = buildPsshBox({ systemId: WIDEVINE_SYSTEM_ID, version: 0 });

            const psshList = CommonEncryption.parsePSSHList(initData);

            expect(psshList[WIDEVINE_SYSTEM_ID].version).to.equal(0);
            expect(psshList[WIDEVINE_SYSTEM_ID].keyIds).to.deep.equal([]);
            expect(psshList[WIDEVINE_SYSTEM_ID].box.byteLength).to.equal(initData.byteLength);
        })

        it('should return an empty key ID array for a version 0 box', () => {
            const initData = buildPsshBox({ systemId: WIDEVINE_SYSTEM_ID, version: 0 });

            expect(CommonEncryption.getKeyIdsForKeySystem(widevineKeySystem, initData)).to.deep.equal([]);
        })

        it('should parse a version 1 box with a single key ID', () => {
            const initData = buildPsshBox({ systemId: WIDEVINE_SYSTEM_ID, version: 1, keyIds: [KID_1] });

            expect(CommonEncryption.getKeyIdsForKeySystem(widevineKeySystem, initData)).to.deep.equal([KID_1]);
        })

        it('should parse a version 1 box with multiple key IDs, preserving order', () => {
            const initData = buildPsshBox({ systemId: WIDEVINE_SYSTEM_ID, version: 1, keyIds: [KID_1, KID_2] });

            expect(CommonEncryption.getKeyIdsForKeySystem(widevineKeySystem, initData)).to.deep.equal([KID_1, KID_2]);
        })

        it('should preserve duplicate key IDs within a version 1 box', () => {
            const initData = buildPsshBox({ systemId: WIDEVINE_SYSTEM_ID, version: 1, keyIds: [KID_1, KID_1] });

            expect(CommonEncryption.getKeyIdsForKeySystem(widevineKeySystem, initData)).to.deep.equal([KID_1, KID_1]);
        })

        it('should parse concatenated version 0 and version 1 boxes for different DRM systems', () => {
            const initData = concatBoxes([
                buildPsshBox({ systemId: PLAYREADY_SYSTEM_ID, version: 0 }),
                buildPsshBox({ systemId: WIDEVINE_SYSTEM_ID, version: 1, keyIds: [KID_1, KID_2] })
            ]);

            expect(CommonEncryption.getKeyIdsForKeySystem(playreadyKeySystem, initData)).to.deep.equal([]);
            expect(CommonEncryption.getKeyIdsForKeySystem(widevineKeySystem, initData)).to.deep.equal([KID_1, KID_2]);
            expect(CommonEncryption.getPSSHForKeySystem(widevineKeySystem, initData)).to.not.be.null;
        })

        it('should return null from getPSSHForKeySystem and getKeyIdsForKeySystem when the key system is not present', () => {
            const initData = buildPsshBox({ systemId: WIDEVINE_SYSTEM_ID, version: 1, keyIds: [KID_1] });

            expect(CommonEncryption.getPSSHForKeySystem(playreadyKeySystem, initData)).to.be.null;
            expect(CommonEncryption.getKeyIdsForKeySystem(playreadyKeySystem, initData)).to.be.null;
        })

        it('should skip a version 1 box whose key ID list overflows the box boundary', () => {
            const initData = buildPsshBox({ systemId: WIDEVINE_SYSTEM_ID, version: 1, keyIds: [KID_1] });
            // Box only has room for 1 key ID; claim there are 5 so the list overruns the box
            new DataView(initData).setUint32(28, 5);

            expect(CommonEncryption.parsePSSHList(initData)).to.deep.equal({});
            expect(CommonEncryption.getPSSHForKeySystem(widevineKeySystem, initData)).to.be.null;
            expect(CommonEncryption.getKeyIdsForKeySystem(widevineKeySystem, initData)).to.be.null;
        })

        it('should skip a truncated version 1 box that cannot even hold the key ID count', () => {
            const fullBox = buildPsshBox({ systemId: WIDEVINE_SYSTEM_ID, version: 1, keyIds: [KID_1] });
            const truncated = fullBox.slice(0, 29); // cuts into the KID_count field

            expect(CommonEncryption.parsePSSHList(truncated)).to.deep.equal({});
        })

    });
})
