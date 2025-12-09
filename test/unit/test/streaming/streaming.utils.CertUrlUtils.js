import { expect } from 'chai';
import CertUrlUtils from '../../../../src/streaming/utils/CertUrlUtils.js';

describe('CertUrlUtils', () => {
    describe('normalizeCertUrls', () => {
        it('should normalize strings, xml-like objects and pre-normalized entries', () => {
            const input = [
                ' https://a ',
                { __text: 'https://b', '@certType': 'primary' },
                { url: 'https://c', certType: '' },
                null
            ];
            const out = CertUrlUtils.normalizeCertUrls(input);
            expect(out).to.deep.equal([
                { url: 'https://a', certType: null },
                { url: 'https://b', certType: 'primary' },
                { url: 'https://c', certType: null }
            ]);
        });

        it('should filter invalid or empty entries', () => {
            const input = ['', '   ', { __text: '   ' }, undefined];
            const out = CertUrlUtils.normalizeCertUrls(input);
            expect(out).to.deep.equal([]);
        });

        it('should trim certType and ignore non-string values', () => {
            const input = [
                { __text: 'https://a', '@certType': ' type ' },
                { __text: 'https://b', '@certType': 42 },
                { __text: 'https://c', certType: ' ' }
            ];
            const out = CertUrlUtils.normalizeCertUrls(input);
            expect(out).to.deep.equal([
                { url: 'https://a', certType: 'type' },
                { url: 'https://b', certType: null },
                { url: 'https://c', certType: null }
            ]);
        });
    });

    describe('dedupeCertUrls', () => {
        it('should dedupe by url+certType while preserving first occurrence order', () => {
            const input = [
                { url: 'u1', certType: null },
                { url: 'u1', certType: null },
                { url: 'u1', certType: 'x' },
                { url: 'u2', certType: null }
            ];
            const out = CertUrlUtils.dedupeCertUrls(input);
            expect(out).to.deep.equal([
                { url: 'u1', certType: null },
                { url: 'u1', certType: 'x' },
                { url: 'u2', certType: null }
            ]);
        });

        it('should drop falsy or missing url entries', () => {
            const input = [
                null,
                { url: '', certType: 'x' },
                { url: 'u1', certType: null },
                { certType: 'x' }
            ];
            const out = CertUrlUtils.dedupeCertUrls(input);
            expect(out).to.deep.equal([{ url: 'u1', certType: null }]);
        });

        it('should retain normalized ordering across mixed shapes after normalize+dedupe', () => {
            const normalized = CertUrlUtils.normalizeCertUrls([
                ' https://a ',
                { __text: 'https://a', '@certType': 'primary' },
                { __text: 'https://b', certType: null }
            ]);
            const out = CertUrlUtils.dedupeCertUrls(normalized);
            expect(out).to.deep.equal([
                { url: 'https://a', certType: null },
                { url: 'https://a', certType: 'primary' },
                { url: 'https://b', certType: null }
            ]);
        });
    });

    describe('sanitizeProtectionDataCertUrls', () => {
        it('should sanitize certUrls in-place per key system and ignore other fields', () => {
            const protData = {
                widevine: {
                    certUrls: [' https://a ', { __text: 'https://a', '@certType': 'x' }],
                    serverCertificate: 'buf'
                },
                playready: {
                    certUrls: null
                }
            };
            const res = CertUrlUtils.sanitizeProtectionDataCertUrls(protData);
            expect(res).to.equal(protData);
            expect(res.widevine.serverCertificate).to.equal('buf');
            expect(res.widevine.certUrls).to.deep.equal([
                { url: 'https://a', certType: null },
                { url: 'https://a', certType: 'x' }
            ]);
            expect(res.playready.certUrls).to.equal(null);
        });

        it('should safely handle missing or non-object key system entries', () => {
            const protData = {
                widevine: undefined,
                clearkey: [],
                playready: { serverCertificate: 'buf' }
            };
            const res = CertUrlUtils.sanitizeProtectionDataCertUrls(protData);
            expect(res.playready.serverCertificate).to.equal('buf');
            expect(res.playready.certUrls).to.equal(undefined);
        });
    });
});
