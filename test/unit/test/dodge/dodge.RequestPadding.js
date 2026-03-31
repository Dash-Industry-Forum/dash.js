import { applyRequestPadding } from '../../../../src/dodge/utils/RequestPadding.js';
import DodgeFetchLoaderOverride from '../../../../src/dodge/overrides/DodgeFetchLoaderOverride.js';
import DodgeXHRLoaderOverride from '../../../../src/dodge/overrides/DodgeXHRLoaderOverride.js';
import Debug from '../../../../src/core/Debug.js';
import Settings from '../../../../src/core/Settings.js';

import sinon from 'sinon';
import { expect } from 'chai';

function makeRequest(url, headers, dodgeQueryParamPresent) {
    return {
        url,
        headers: headers || {},
        customData: {
            request: {
                queryParams: dodgeQueryParamPresent !== false ? { padding: 'abc' } : {}
            }
        }
    };
}

function makeSettings(paddingLength, queryParam) {
    return {
        get: () => ({
            dodge: {
                paddingLength: paddingLength !== undefined ? paddingLength : 0,
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

    // paddingLength disabled

    it('paddingLength = 0: URL is not modified', function () {
        const url = 'https://example.com/seg.m4s?padding=abc';
        const req = makeRequest(url, {});
        applyRequestPadding(req, makeSettings(0), makeLogger());
        expect(req.url).to.equal(url);
    });

    it('paddingLength < 0: URL is not modified', function () {
        const url = 'https://example.com/seg.m4s?padding=abc';
        const req = makeRequest(url, {});
        applyRequestPadding(req, makeSettings(-1), makeLogger());
        expect(req.url).to.equal(url);
    });

    // Non-Dodge requests

    it('non-Dodge request (queryParams[queryParam] absent): URL is not modified', function () {
        const url = 'https://example.com/seg.m4s';
        const req = makeRequest(url, {}, false); // no padding key
        applyRequestPadding(req, makeSettings(500), makeLogger());
        expect(req.url).to.equal(url);
    });

    it('no customData on request: URL is not modified', function () {
        const url = 'https://example.com/seg.m4s';
        const req = { url, headers: {}, customData: null };
        applyRequestPadding(req, makeSettings(500), makeLogger());
        expect(req.url).to.equal(url);
    });

    // Padding applied

    it('Dodge request with pad > 0: URL is extended by exactly pad bytes', function () {
        const url = 'https://example.com/seg.m4s?padding=abc';
        const req = makeRequest(url, {});
        const paddingLength = url.length + 50;
        applyRequestPadding(req, makeSettings(paddingLength), makeLogger());
        expect(req.url.length).to.equal(url.length + 50);
    });

    it('after padding, wire size equals paddingLength', function () {
        const url = 'https://example.com/seg.m4s?padding=abc';
        const req = makeRequest(url, { Range: 'bytes=0-999' });
        const paddingLength = wireSize(req) + 30;
        applyRequestPadding(req, makeSettings(paddingLength), makeLogger());
        expect(wireSize(req)).to.equal(paddingLength);
    });

    it('headers contribute to the measured size', function () {
        const url = 'https://example.com/seg.m4s?padding=abc';
        const reqNoHeaders = makeRequest(url, {});
        const reqWithHeader = makeRequest(url, { Range: 'bytes=0-999' });
        const paddingLength = wireSize(reqWithHeader) + 10;

        applyRequestPadding(reqNoHeaders, makeSettings(paddingLength), makeLogger());
        applyRequestPadding(reqWithHeader, makeSettings(paddingLength), makeLogger());

        // Both should reach the same paddingLength wire size
        expect(wireSize(reqNoHeaders)).to.equal(paddingLength);
        expect(wireSize(reqWithHeader)).to.equal(paddingLength);

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

    it('pad = 0 (already at paddingLength): URL is not modified', function () {
        const url = 'https://example.com/seg.m4s?padding=abc';
        const req = makeRequest(url, {});
        const paddingLength = wireSize(req); // exactly at target
        applyRequestPadding(req, makeSettings(paddingLength), makeLogger());
        expect(req.url).to.equal(url);
    });

    // Oversize warning

    it('request already exceeds paddingLength: warns and does not modify URL', function () {
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
        const req = {
            url,
            headers: {},
            customData: { request: { queryParams: { pad: 'abc' } } }
        };
        const paddingLength = url.length + 20;
        const logger = makeLogger();
        applyRequestPadding(req, makeSettings(paddingLength, 'pad'), logger);
        expect(logger.warn.called).to.be.false; // jshint ignore:line
        const padValue = new URL(req.url).searchParams.get('pad');
        expect(padValue.startsWith('abc')).to.be.true;
        expect(padValue.length).to.be.greaterThan(3);
    });

    it('custom queryParam: non-matching param on request is treated as non-Dodge', function () {
        const url = 'https://example.com/seg.m4s?padding=abc';
        const req = makeRequest(url, {}); // has queryParams.padding, not queryParams.pad
        applyRequestPadding(req, makeSettings(url.length + 50, 'pad'), makeLogger());
        expect(req.url).to.equal(url); // not modified
    });

    // Invalid URL

    it('invalid URL: warns and does not throw', function () {
        const req = {
            url: 'not-a-valid-url',
            headers: {},
            customData: { request: { queryParams: { padding: 'abc' } } }
        };
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
        settings.update({ dodge: { paddingLength: 0, queryParam: 'padding' } });
    });

    it('delegates to parent.load()', function () {
        const parentLoad = sinon.stub();
        const override = DodgeFetchLoaderOverride.call({ context, parent: { load: parentLoad }, factory: {} });
        override.load({ url: 'https://example.com/seg.m4s', headers: {}, customData: { request: { queryParams: {} } } }, {});
        expect(parentLoad.calledOnce).to.be.true; // jshint ignore:line
    });

    it('extends URL before calling parent.load() when paddingLength is set', function () {
        settings.update({ dodge: { paddingLength: 1000, queryParam: 'padding' } });
        const parentLoad = sinon.stub();
        const override = DodgeFetchLoaderOverride.call({ context, parent: { load: parentLoad }, factory: {} });
        const url = 'https://example.com/seg.m4s?padding=abc';
        const req = { url, headers: {}, customData: { request: { queryParams: { padding: 'abc' } } } };
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
        settings.update({ dodge: { paddingLength: 0, queryParam: 'padding' } });
    });

    it('delegates to parent.load()', function () {
        const parentLoad = sinon.stub();
        const override = DodgeXHRLoaderOverride.call({ context, parent: { load: parentLoad }, factory: {} });
        override.load({ url: 'https://example.com/seg.m4s', headers: {}, customData: { request: { queryParams: {} } } }, {});
        expect(parentLoad.calledOnce).to.be.true; // jshint ignore:line
    });

    it('extends URL before calling parent.load() when paddingLength is set', function () {
        settings.update({ dodge: { paddingLength: 1000, queryParam: 'padding' } });
        const parentLoad = sinon.stub();
        const override = DodgeXHRLoaderOverride.call({ context, parent: { load: parentLoad }, factory: {} });
        const url = 'https://example.com/seg.m4s?padding=abc';
        const req = { url, headers: {}, customData: { request: { queryParams: { padding: 'abc' } } } };
        override.load(req, {});
        expect(parentLoad.calledOnce).to.be.true; // jshint ignore:line
        expect(req.url.length).to.be.greaterThan(url.length);
    });
});
