import { applyRequestPadding } from '../../../../src/dodge/utils/RequestPadding.js';
import DodgeFetchLoaderOverride from '../../../../src/dodge/overrides/DodgeFetchLoaderOverride.js';
import DodgeXHRLoaderOverride from '../../../../src/dodge/overrides/DodgeXHRLoaderOverride.js';
import Debug from '../../../../src/core/Debug.js';
import Settings from '../../../../src/core/Settings.js';

import sinon from 'sinon';
import { expect } from 'chai';

function makeRequest(url, headers) {
    return {
        url,
        headers: headers || {},
    };
}

function makeSettings(paddingLengthBase, queryParam, paddingLengthRandom) {
    return {
        get: () => ({
            dodge: {
                paddingLengthBase: paddingLengthBase !== undefined ? paddingLengthBase : 0,
                paddingLengthRandom: paddingLengthRandom || 0,
                queryParam: queryParam || 'padding'
            }
        })
    };
}

function makeLogger() {
    return { warn: sinon.spy() };
}

// Compute the approximate wire size that applyRequestPadding measures.
function wireSize(req) {
    let size = req.url.length;
    const headers = req.headers;
    if (headers) {
        for (const key in headers) {
            const value = headers[key];
            if (value) {
                size += key.length + String(value).length + 4;
            }
        }
    }
    return size;
}

// ************************************************************************
// TESTS
// ************************************************************************

describe('applyRequestPadding', function () {

    // paddingLengthBase disabled

    it('paddingLengthBase = 0: URL is not modified', function () {
        const url = 'https://example.com/seg.m4s?padding=abc';
        const req = makeRequest(url, {});
        applyRequestPadding(req, makeSettings(0), makeLogger());
        expect(req.url).to.equal(url);
    });

    it('paddingLengthBase < 0: URL is not modified', function () {
        const url = 'https://example.com/seg.m4s?padding=abc';
        const req = makeRequest(url, {});
        applyRequestPadding(req, makeSettings(-1), makeLogger());
        expect(req.url).to.equal(url);
    });

    // Padding applied

    it('request with pad > 0: URL is extended by exactly pad bytes', function () {
        const url = 'https://example.com/seg.m4s?padding=abc';
        const req = makeRequest(url, {});
        const paddingLength = url.length + 50;
        applyRequestPadding(req, makeSettings(paddingLength), makeLogger());
        expect(req.url.length).to.equal(url.length + 50);
    });

    it('after padding, wire size equals paddingLengthBase (paddingLengthRandom = 0)', function () {
        const url = 'https://example.com/seg.m4s?padding=abc';
        const req = makeRequest(url, { Range: 'bytes=0-999' });
        const paddingLengthBase = wireSize(req) + 30;
        applyRequestPadding(req, makeSettings(paddingLengthBase), makeLogger());
        expect(wireSize(req)).to.equal(paddingLengthBase);
    });

    it('headers contribute to the measured size', function () {
        const url = 'https://example.com/seg.m4s?padding=abc';
        const reqNoHeaders = makeRequest(url, {});
        const reqWithHeader = makeRequest(url, { Range: 'bytes=0-999' });
        const paddingLengthBase = wireSize(reqWithHeader) + 10;

        applyRequestPadding(reqNoHeaders, makeSettings(paddingLengthBase), makeLogger());
        applyRequestPadding(reqWithHeader, makeSettings(paddingLengthBase), makeLogger());

        // Both should reach the same paddingLengthBase wire size
        expect(wireSize(reqNoHeaders)).to.equal(paddingLengthBase);
        expect(wireSize(reqWithHeader)).to.equal(paddingLengthBase);

        // The one without headers needs more zeros
        expect(reqNoHeaders.url.length).to.be.greaterThan(reqWithHeader.url.length);
    });

    it('existing padding value is preserved as prefix of the extended value', function () {
        const url = 'https://example.com/seg.m4s?padding=abc';
        const req = makeRequest(url, {});
        applyRequestPadding(req, makeSettings(url.length + 10), makeLogger());
        const padValue = new URL(req.url).searchParams.get('padding');
        expect(padValue.startsWith('abc')).to.be.true;
        expect(padValue).to.match(/^abc0+$/);
    });

    it('with paddingLengthRandom > 0, wire size is in [paddingLengthBase, paddingLengthBase + paddingLengthRandom]', function () {
        const base = 300;
        const random = 100;
        const results = new Set();
        for (let i = 0; i < 50; i++) {
            const url = 'https://example.com/seg.m4s?padding=abc';
            const req = makeRequest(url, {});
            applyRequestPadding(req, makeSettings(base, undefined, random), makeLogger());
            const size = wireSize(req);
            expect(size).to.be.at.least(base);
            expect(size).to.be.at.most(base + random);
            results.add(size);
        }
        // With 50 trials and a range of 100, we should see more than one distinct size
        expect(results.size).to.be.greaterThan(1);
    });

    it('with paddingLengthRandom = 0, wire size is deterministically paddingLengthBase', function () {
        const url = 'https://example.com/seg.m4s?padding=abc';
        const req = makeRequest(url, { Range: 'bytes=0-999' });
        const base = wireSize(req) + 30;
        applyRequestPadding(req, makeSettings(base, undefined, 0), makeLogger());
        expect(wireSize(req)).to.equal(base);
    });

    it('pad = 0 (already at paddingLengthBase): URL is not modified', function () {
        const url = 'https://example.com/seg.m4s?padding=abc';
        const req = makeRequest(url, {});
        const paddingLengthBase = wireSize(req); // exactly at target
        applyRequestPadding(req, makeSettings(paddingLengthBase), makeLogger());
        expect(req.url).to.equal(url);
    });

    // Oversize warning

    it('request already exceeds paddingLengthBase: warns and does not modify URL', function () {
        const url = 'https://example.com/seg.m4s?padding=abc';
        const req = makeRequest(url, { 'X-Big': 'a'.repeat(500) });
        const logger = makeLogger();
        applyRequestPadding(req, makeSettings(50), logger);
        expect(logger.warn.calledOnce).to.be.true; // jshint ignore:line
        expect(req.url).to.equal(url);
    });

    // Custom query parameter name

    it('custom queryParam name: padding applied to the correct parameter', function () {
        const url = 'https://example.com/seg.m4s?pad=abc';
        const req = makeRequest(url, {});
        const paddingLength = url.length + 20;
        const logger = makeLogger();
        applyRequestPadding(req, makeSettings(paddingLength, 'pad'), logger);
        expect(logger.warn.called).to.be.false; // jshint ignore:line
        const padValue = new URL(req.url).searchParams.get('pad');
        expect(padValue.startsWith('abc')).to.be.true;
        expect(padValue.length).to.be.greaterThan(3);
    });

    it('custom queryParam: padding uses the configured param name, not the default', function () {
        const url = 'https://example.com/seg.m4s?pad=abc';
        const req = makeRequest(url, {});
        const targetSize = url.length + 50;
        applyRequestPadding(req, makeSettings(targetSize, 'pad'), makeLogger());
        const padValue = new URL(req.url).searchParams.get('pad');
        expect(padValue.startsWith('abc')).to.be.true; // jshint ignore:line
        expect(wireSize(req)).to.equal(targetSize);
    });

    // Invalid URL

    it('invalid URL: warns and does not throw', function () {
        const req = makeRequest('not-a-valid-url', {});
        const logger = makeLogger();
        expect(() => applyRequestPadding(req, makeSettings(1000), logger)).to.not.throw();
        expect(logger.warn.calledOnce).to.be.true; // jshint ignore:line
    });
});

describe('DodgeFetchLoaderOverride', function () {
    let context, settings;

    beforeEach(function () {
        context = {};
        Debug(context).getInstance();
        settings = Settings(context).getInstance();
        settings.update({ dodge: { paddingLengthBase: 0, paddingLengthRandom: 0, queryParam: 'padding' } });
    });

    it('delegates to parent.load()', function () {
        const parentLoad = sinon.stub();
        const override = DodgeFetchLoaderOverride.call({ context, parent: { load: parentLoad }, factory: {} });
        override.load({ url: 'https://example.com/seg.m4s', headers: {} }, {});
        expect(parentLoad.calledOnce).to.be.true; // jshint ignore:line
    });

    it('extends URL before calling parent.load() when paddingLengthBase is set', function () {
        settings.update({ dodge: { paddingLengthBase: 1000, paddingLengthRandom: 0, queryParam: 'padding' } });
        const parentLoad = sinon.stub();
        const override = DodgeFetchLoaderOverride.call({ context, parent: { load: parentLoad }, factory: {} });
        const url = 'https://example.com/seg.m4s?padding=abc';
        const req = { url, headers: {} };
        override.load(req, {});
        expect(parentLoad.calledOnce).to.be.true; // jshint ignore:line
        expect(req.url.length).to.be.greaterThan(url.length);
    });
});

describe('DodgeXHRLoaderOverride', function () {
    let context, settings;

    beforeEach(function () {
        context = {};
        Debug(context).getInstance();
        settings = Settings(context).getInstance();
        settings.update({ dodge: { paddingLengthBase: 0, paddingLengthRandom: 0, queryParam: 'padding' } });
    });

    it('delegates to parent.load()', function () {
        const parentLoad = sinon.stub();
        const override = DodgeXHRLoaderOverride.call({ context, parent: { load: parentLoad }, factory: {} });
        override.load({ url: 'https://example.com/seg.m4s', headers: {} }, {});
        expect(parentLoad.calledOnce).to.be.true; // jshint ignore:line
    });

    it('extends URL before calling parent.load() when paddingLengthBase is set', function () {
        settings.update({ dodge: { paddingLengthBase: 1000, paddingLengthRandom: 0, queryParam: 'padding' } });
        const parentLoad = sinon.stub();
        const override = DodgeXHRLoaderOverride.call({ context, parent: { load: parentLoad }, factory: {} });
        const url = 'https://example.com/seg.m4s?padding=abc';
        const req = { url, headers: {} };
        override.load(req, {});
        expect(parentLoad.calledOnce).to.be.true; // jshint ignore:line
        expect(req.url.length).to.be.greaterThan(url.length);
    });
});
