import {
    C2PA_METHOD_AUTO,
    C2PA_METHOD_MANIFEST_BOX,
    C2PA_METHOD_VSI,
    C2PA_METHODS,
    DEFAULT_C2PA_MEDIA_TYPES,
    isValidC2paMethod,
    getDefaultC2paOptions,
    normalizeC2paOptions
} from '../../../../src/streaming/c2pa/C2paOptions.js';
import {expect} from 'chai';

describe('C2paOptions', function () {

    describe('constants', function () {
        it('should expose the C2PA method identifiers', () => {
            expect(C2PA_METHOD_AUTO).to.equal('auto');
            expect(C2PA_METHOD_MANIFEST_BOX).to.equal('19.3');
            expect(C2PA_METHOD_VSI).to.equal('19.4');
        });

        it('should list every accepted method', () => {
            expect(C2PA_METHODS).to.deep.equal(['auto', '19.3', '19.4']);
        });

        it('should default media types to video and audio', () => {
            expect(DEFAULT_C2PA_MEDIA_TYPES).to.deep.equal(['video', 'audio']);
        });
    });

    describe('getDefaultC2paOptions', function () {
        it('should default to scanning disabled with auto detection', () => {
            const defaults = getDefaultC2paOptions();

            expect(defaults.enabled).to.equal(false);
            expect(defaults.method).to.equal('auto');
            expect(defaults.mediaTypes).to.deep.equal(['video', 'audio']);
        });

        it('should return a fresh mediaTypes array on each call', () => {
            const first = getDefaultC2paOptions();
            const second = getDefaultC2paOptions();

            expect(first.mediaTypes).to.not.equal(second.mediaTypes);
            expect(first.mediaTypes).to.not.equal(DEFAULT_C2PA_MEDIA_TYPES);
        });
    });

    describe('isValidC2paMethod', function () {
        it('should accept the three known methods', () => {
            expect(isValidC2paMethod('auto')).to.equal(true);
            expect(isValidC2paMethod('19.3')).to.equal(true);
            expect(isValidC2paMethod('19.4')).to.equal(true);
        });

        it('should reject unknown or malformed values', () => {
            expect(isValidC2paMethod('20.0')).to.equal(false);
            expect(isValidC2paMethod('')).to.equal(false);
            expect(isValidC2paMethod(undefined)).to.equal(false);
            expect(isValidC2paMethod(null)).to.equal(false);
        });
    });

    describe('normalizeC2paOptions', function () {
        it('should return the defaults when no options are provided', () => {
            expect(normalizeC2paOptions()).to.deep.equal(getDefaultC2paOptions());
            expect(normalizeC2paOptions(null)).to.deep.equal(getDefaultC2paOptions());
        });

        it('should preserve a valid forced method', () => {
            const normalized = normalizeC2paOptions({enabled: true, method: '19.4'});

            expect(normalized.enabled).to.equal(true);
            expect(normalized.method).to.equal('19.4');
        });

        it('should fall back to auto for an unrecognized method', () => {
            const normalized = normalizeC2paOptions({method: 'invalid'});

            expect(normalized.method).to.equal('auto');
        });

        it('should ignore a non-boolean enabled flag', () => {
            const normalized = normalizeC2paOptions({enabled: 'yes'});

            expect(normalized.enabled).to.equal(false);
        });

        it('should copy a provided mediaTypes array and fall back when it is not an array', () => {
            const provided = ['video'];
            const normalized = normalizeC2paOptions({mediaTypes: provided});

            expect(normalized.mediaTypes).to.deep.equal(['video']);
            expect(normalized.mediaTypes).to.not.equal(provided);
            expect(normalizeC2paOptions({mediaTypes: 'video'}).mediaTypes).to.deep.equal(['video', 'audio']);
        });
    });
});
