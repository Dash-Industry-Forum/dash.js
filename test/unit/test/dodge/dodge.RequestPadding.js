import { applyRequestPadding } from '../../../../src/dodge/utils/RequestPadding.js';
import DodgeFetchLoaderOverride from '../../../../src/dodge/overrides/DodgeFetchLoaderOverride.js';
import DodgeXHRLoaderOverride from '../../../../src/dodge/overrides/DodgeXHRLoaderOverride.js';
import Debug from '../../../../src/core/Debug.js';
import Settings from '../../../../src/core/Settings.js';
import { setDodgeSettings } from '../../../../src/dodge/utils/DodgeSettings.js';
import { createDodgeContext, releaseDodgeContexts } from '../../helpers/DodgeContexts.js';

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
    return { warn: sinon.spy(), error: sinon.spy() };
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

    // A value that is not a usable number reaches the arithmetic as NaN, and
    // every NaN comparison is false, so each guard in applyRequestPadding falls
    // through and the request goes out unpadded. This is the first test in the
    // file to pass an unusable base, so it owns the module-scoped warn-once
    // flag for paddingLengthBase.
    it('non-numeric paddingLengthBase: URL is not modified and warns exactly once', function () {
        const url = 'https://example.com/seg.m4s?padding=abc';
        const logger = makeLogger();
        for (let i = 0; i < 5; i++) {
            const req = makeRequest(url, {});
            applyRequestPadding(req, makeSettings('abc'), logger);
            expect(req.url).to.equal(url);
        }
        const warnings = logger.warn.getCalls().filter(
            c => c.args[0] && c.args[0].indexOf('paddingLengthBase') !== -1
        );
        expect(warnings.length).to.equal(1);
    });

    it('NaN paddingLengthBase: URL is not modified', function () {
        const url = 'https://example.com/seg.m4s?padding=abc';
        const req = makeRequest(url, {});
        applyRequestPadding(req, makeSettings(NaN), makeLogger());
        expect(req.url).to.equal(url);
    });

    // A quoted number is the misconfiguration most likely to look correct in a
    // config file. It must disable padding loudly rather than be coerced.
    it('numeric string paddingLengthBase: URL is not modified', function () {
        const url = 'https://example.com/seg.m4s?padding=abc';
        const req = makeRequest(url, {});
        applyRequestPadding(req, makeSettings('4096'), makeLogger());
        expect(req.url).to.equal(url);
    });

    it('paddingLengthBase < 0: URL is not modified', function () {
        const url = 'https://example.com/seg.m4s?padding=abc';
        const req = makeRequest(url, {});
        applyRequestPadding(req, makeSettings(-1), makeLogger());
        expect(req.url).to.equal(url);
    });

    // Relative request URLs

    // A page may hand attachSource a relative manifest URL, and that request
    // reaches the loader written the way the page wrote it. It has to be
    // normalized like any other, and to the same wire size as the absolute form
    // of the same request: the size model counts the whole URL string, so a
    // relative URL measured as written would omit the host and go out short.

    it('relative URL: padded to the target size', function () {
        const relative = '/media/manifest.mpd';
        const absolute = new URL(relative, window.location.href).toString();
        const req = makeRequest(relative, {});
        const target = absolute.length + 50;

        applyRequestPadding(req, makeSettings(target), makeLogger());

        expect(wireSize(req)).to.equal(target);
    });

    it('a relative URL and its absolute equivalent reach the same wire size', function () {
        const relative = '/media/manifest.mpd';
        const absolute = new URL(relative, window.location.href).toString();
        const target = absolute.length + 80;

        const fromRelative = makeRequest(relative, { Range: 'bytes=0-999' });
        const fromAbsolute = makeRequest(absolute, { Range: 'bytes=0-999' });
        applyRequestPadding(fromRelative, makeSettings(target), makeLogger());
        applyRequestPadding(fromAbsolute, makeSettings(target), makeLogger());

        expect(wireSize(fromRelative)).to.equal(wireSize(fromAbsolute));
    });

    it('a URL that cannot be parsed at all is reported as an error naming it', function () {
        // An unpadded request is a defense failure rather than a cosmetic
        // problem, so it is reported at error level and says which request.
        const url = 'http://';
        const logger = makeLogger();
        const req = makeRequest(url, {});

        applyRequestPadding(req, makeSettings(1024), logger);

        expect(req.url).to.equal(url);
        const named = logger.error.getCalls().filter(c => String(c.args[0]).indexOf(url) !== -1);
        expect(named.length).to.equal(1);
    });

    // Non-network sources

    it('a blob: URL is not padded: it never reaches the wire and cannot carry a query string', function () {
        const url = 'blob:https://example.com/2d6e1a3c-0b8f-4a6e-9c1d-1234567890ab';
        const req = makeRequest(url, {});
        const logger = makeLogger();
        applyRequestPadding(req, makeSettings(500), logger);
        expect(req.url).to.equal(url);
        expect(logger.warn.called).to.be.false;
        expect(logger.error.called).to.be.false;
    });

    it('a data: URL is not padded', function () {
        const url = 'data:application/json,{"start":{}}';
        const req = makeRequest(url, {});
        applyRequestPadding(req, makeSettings(500), makeLogger());
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

    it('with paddingLengthRandom < 0, clamps to 0 and warns exactly once across calls', function () {
        const base = 300;
        const logger = makeLogger();
        // First call with a negative random value, should warn once and clamp.
        for (let i = 0; i < 20; i++) {
            const url = 'https://example.com/seg.m4s?padding=abc';
            const req = makeRequest(url, {});
            applyRequestPadding(req, makeSettings(base, undefined, -500), logger);
            // Clamped: wire size must be exactly base (no downward jitter).
            expect(wireSize(req)).to.equal(base);
        }
        // Warn once flag is module-scoped, so across repeated calls we expect
        // at most one warning about the negative value. (Prior tests in this
        // file never pass a negative random, so this is the first trip.)
        const negativeWarnings = logger.warn.getCalls().filter(
            c => c.args[0] && c.args[0].indexOf('paddingLengthRandom is not a non-negative number') !== -1
        );
        expect(negativeWarnings.length).to.equal(1);
    });

    // The module-scoped warn-once flag for paddingLengthRandom was already
    // spent by the negative-value test above, so this pins the clamp only.
    it('with a non-numeric paddingLengthRandom, wire size is deterministically paddingLengthBase', function () {
        const base = 300;
        for (let i = 0; i < 10; i++) {
            const url = 'https://example.com/seg.m4s?padding=abc';
            const req = makeRequest(url, {});
            applyRequestPadding(req, makeSettings(base, undefined, 'abc'), makeLogger());
            expect(wireSize(req)).to.equal(base);
        }
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

    // Retried requests

    // HTTPLoader._addPathwayCloningParameters() appends request.queryParams to
    // request.url on every attempt, and unlike _addExtUrlQueryParameters() above
    // it is not guarded by retryAttempts === 0. A retried request thus arrives
    // here carrying one copy of the cache-busting parameter per attempt.
    const RETRIED_URL = 'https://example.com/seg.m4s?padding=t3fyjwc8' +
        '&padding=t3fyjwc8'.repeat(3); // initial attempt plus three retries

    it('duplicate copies of the query parameter left by a retry are collapsed to one', function () {
        const req = makeRequest(RETRIED_URL, {});
        const logger = makeLogger();

        applyRequestPadding(req, makeSettings(200), logger);

        expect(req.url.match(/padding=/g)).to.have.lengthOf(1);
        expect(logger.warn.called).to.be.false; // jshint ignore:line
    });

    it('a retried request is padded to the same wire size as its first attempt', function () {
        const first = makeRequest('https://example.com/seg.m4s?padding=t3fyjwc8', {});
        const retried = makeRequest(RETRIED_URL, {});

        applyRequestPadding(first, makeSettings(200), makeLogger());
        applyRequestPadding(retried, makeSettings(200), makeLogger());

        expect(wireSize(retried)).to.equal(200);
        expect(wireSize(retried)).to.equal(wireSize(first));
    });

    // The duplicates are measured before they are collapsed, so they inflate
    // the size the pad < 0 branch tests. Past that threshold the request goes out
    // completely unpadded, which is the one failure the padding length is sized
    // to avoid, and it gets likelier with every retry.
    it('duplicates do not push a request under paddingLengthBase past the oversize branch', function () {
        const req = makeRequest(RETRIED_URL, {});
        const logger = makeLogger();

        // 60 is comfortably above the collapsed URL (44 bytes) and below the
        // four-copy one (95 bytes).
        applyRequestPadding(req, makeSettings(60), logger);

        expect(logger.warn.called).to.be.false; // jshint ignore:line
        expect(wireSize(req)).to.equal(60);
    });

    it('the cache-busting value survives the collapse as the prefix', function () {
        const req = makeRequest(RETRIED_URL, {});

        applyRequestPadding(req, makeSettings(200), makeLogger());

        expect(new URL(req.url).searchParams.get('padding').startsWith('t3fyjwc8'))
            .to.be.true; // jshint ignore:line
    });

    // Invalid URL

    // This used to be read as an invalid URL and skipped. It is a relative one,
    // which is what the manifest request looks like when a page hands
    // attachSource a path, and it has to be padded like anything else.
    it('a path with no scheme is resolved and padded, not treated as invalid', function () {
        const req = makeRequest('not-a-valid-url', {});
        const logger = makeLogger();
        const target = new URL('not-a-valid-url', window.location.href).toString().length + 40;

        expect(() => applyRequestPadding(req, makeSettings(target), logger)).to.not.throw();

        expect(wireSize(req)).to.equal(target);
        expect(logger.error.called).to.be.false; // jshint ignore:line
    });
});

describe('DodgeFetchLoaderOverride', function () {
    let context, settings;

    beforeEach(function () {
        context = createDodgeContext();
        Debug(context).getInstance();
        settings = Settings(context).getInstance();
        settings.update({ dodge: { paddingLengthBase: 0, paddingLengthRandom: 0, queryParam: 'padding' } });
    });

    afterEach(function () {
        releaseDodgeContexts();
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

    it('preserves original request headers after padding', function () {
        settings.update({ dodge: { paddingLengthBase: 1000, paddingLengthRandom: 0, queryParam: 'padding' } });
        const parentLoad = sinon.stub();
        const override = DodgeFetchLoaderOverride.call({ context, parent: { load: parentLoad }, factory: {} });
        const req = { url: 'https://example.com/seg.m4s?padding=abc', headers: { 'Range': 'bytes=0-1000', 'X-Custom': 'value' } };
        override.load(req, {});
        expect(req.headers['Range']).to.equal('bytes=0-1000');
        expect(req.headers['X-Custom']).to.equal('value');
    });

    it('passes through config argument to parent.load()', function () {
        const parentLoad = sinon.stub();
        const override = DodgeFetchLoaderOverride.call({ context, parent: { load: parentLoad }, factory: {} });
        const config = { timeout: 5000 };
        override.load({ url: 'https://example.com/seg.m4s', headers: {} }, config);
        expect(parentLoad.firstCall.args[1]).to.equal(config);
    });
});

describe('Loader overrides read the injected Settings', function () {
    let context, contextSettings, playerSettings;

    beforeEach(function () {
        context = createDodgeContext();
        Debug(context).getInstance();
        contextSettings = Settings(context).getInstance();
        contextSettings.update({ dodge: { paddingLengthBase: 0, paddingLengthRandom: 0, queryParam: 'padding' } });
        playerSettings = Settings(createDodgeContext()).getInstance();
        playerSettings.update({ dodge: { paddingLengthBase: 900, paddingLengthRandom: 0, queryParam: 'padding' } });
    });

    afterEach(function () {
        contextSettings.reset();
        playerSettings.reset();
        releaseDodgeContexts();
    });

    [['DodgeXHRLoaderOverride', DodgeXHRLoaderOverride], ['DodgeFetchLoaderOverride', DodgeFetchLoaderOverride]].forEach(([name, Override]) => {
        it(name + ' pads to the injected paddingLengthBase, not the one it would resolve', function () {
            setDodgeSettings(context, playerSettings);
            const parentLoad = sinon.stub();
            const override = Override.call({ context, parent: { load: parentLoad }, factory: {} });
            const req = { url: 'https://example.com/seg.m4s?padding=abc', headers: {} };

            override.load(req, {});

            // The context instance says 0, which disables padding entirely.
            expect(req.url.length).to.equal(900);
        });
    });
});

describe('DodgeXHRLoaderOverride', function () {
    let context, settings;

    beforeEach(function () {
        context = createDodgeContext();
        Debug(context).getInstance();
        settings = Settings(context).getInstance();
        settings.update({ dodge: { paddingLengthBase: 0, paddingLengthRandom: 0, queryParam: 'padding' } });
    });

    afterEach(function () {
        releaseDodgeContexts();
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

    it('preserves original request headers after padding', function () {
        settings.update({ dodge: { paddingLengthBase: 1000, paddingLengthRandom: 0, queryParam: 'padding' } });
        const parentLoad = sinon.stub();
        const override = DodgeXHRLoaderOverride.call({ context, parent: { load: parentLoad }, factory: {} });
        const req = { url: 'https://example.com/seg.m4s?padding=abc', headers: { 'Range': 'bytes=0-1000', 'X-Custom': 'value' } };
        override.load(req, {});
        expect(req.headers['Range']).to.equal('bytes=0-1000');
        expect(req.headers['X-Custom']).to.equal('value');
    });

    it('passes through config argument to parent.load()', function () {
        const parentLoad = sinon.stub();
        const override = DodgeXHRLoaderOverride.call({ context, parent: { load: parentLoad }, factory: {} });
        const config = { timeout: 5000 };
        override.load({ url: 'https://example.com/seg.m4s', headers: {} }, config);
        expect(parentLoad.firstCall.args[1]).to.equal(config);
    });
});
