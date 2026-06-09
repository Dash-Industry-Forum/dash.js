import DodgeDashHandlerOverride from '../../../../src/dodge/overrides/DodgeDashHandlerOverride.js';
import DefenseRegistry from '../../../../src/dodge/DefenseRegistry.js';
import Debug from '../../../../src/core/Debug.js';
import Settings from '../../../../src/core/Settings.js';
import URLUtils from '../../../../src/streaming/utils/URLUtils.js';
import ObjectsHelper from '../../helpers/ObjectsHelper.js';

import sinon from 'sinon';
import { expect } from 'chai';

function makeManifest() {
    return {
        start: { mpd: '<MPD/>', base_uri: 'https://example.com/' },
        streams: [{
            label: 'rep0',
            init: [{ range: '0-855' }, { range: '856-1711', buffer: true }],
            data: [
                { index: 0, buffer: false }, // cycle 0, non-padding
                { index: 1, buffer: true }, // cycle 1, last non-padding, maxNoPad = 1
                { index: 2, padding: true }, // cycle 2, trailing padding
            ]
        }]
    };
}

function makeRepresentation() {
    return {
        id: 'rep0',
        index: 0,
        bandwidth: 1000000,
        initialization: 'https://example.com/init.m4s',
        segmentInfoType: 'SegmentTemplate',
        segmentDuration: 4,
        timescale: 1,
        range: null,
        path: '',
        mediaInfo: { type: 'video', streamInfo: { id: 'stream-1' } },
        adaptation: {
            index: 0,
            period: { index: 0, start: 0, duration: 100 }
        }
    };
}

function makeSegment(rep, index) {
    return {
        index,
        media: 'https://example.com/seg.m4s',
        presentationStartTime: index * 4,
        duration: 4,
        representation: rep,
        replacementNumber: index,
        replacementTime: 0,
        mediaRange: null,
        availabilityStartTime: 0,
        availabilityEndTime: Infinity,
        wallStartTime: 0,
        mediaStartTime: 0,
        replacements: null
    };
}

// ************************************************************************
// TESTS
// ************************************************************************

describe('DodgeDashHandlerOverride', function () {
    const objectsHelper = new ObjectsHelper();

    let context, defenseController, override, mockParent, segmentsController, adapter, rep;

    beforeEach(function () {
        context = {};
        defenseController = DefenseRegistry(context).getInstance();
        defenseController.reset();

        rep = makeRepresentation();

        mockParent = {
            getInitRequest: sinon.stub().returns({ parentInit: true }),
            getNextSegmentRequest: sinon.stub().returns({ parentNext: true }),
            getNextSegmentRequestIdempotent: sinon.stub().returns({ idempotent: true }),
            getSegmentRequestForTime: sinon.stub().returns({ parentForTime: true }),
            isLastSegmentRequested: sinon.stub().returns(false),
            resetInitialSettings: sinon.stub(),
            initialize: sinon.stub(),
            getStreamInfo: sinon.stub().returns({ manifestInfo: { isDynamic: false } }),
            getType: sinon.stub().returns('video'),
        };

        segmentsController = {
            getSegmentByIndex: sinon.stub().callsFake((r, idx) => makeSegment(r, idx)),
            getSegmentByTime: sinon.stub().returns(null),
        };

        adapter = {
            getVoRepresentations: sinon.stub().returns([]),
        };

        override = DodgeDashHandlerOverride.call(
            { context, parent: mockParent, factory: {} },
            {
                adapter,
                debug: Debug(context).getInstance(),
                urlUtils: URLUtils(context).getInstance(),
                segmentsController,
                baseURLController: objectsHelper.getDummyBaseURLController(),
                timelineConverter: objectsHelper.getDummyTimelineConverter(),
                playbackController: {
                    getTimeSinceStreamEnd: sinon.stub().returns(0),
                    getStreamEndTime: sinon.stub().returns(100),
                },
            }
        );
    });

    // Fallback with no extended manifest

    describe('Fallback with no extended manifest', function () {

        it('getInitRequest() with null representation, delegates to parent', function () {
            override.getInitRequest(null, null);
            expect(mockParent.getInitRequest.calledOnce).to.be.true; // jshint ignore:line
        });

        it('getInitRequest() with representation but no defended stream info, calls parent and returns its result', function () {
            const result = override.getInitRequest({}, rep);
            expect(mockParent.getInitRequest.calledOnce).to.be.true; // jshint ignore:line
            expect(result).to.deep.equal({ parentInit: true });
        });

        it('getNextSegmentRequest() with no defended stream info, calls parent and returns its result', function () {
            const result = override.getNextSegmentRequest({}, rep);
            expect(mockParent.getNextSegmentRequest.calledOnce).to.be.true; // jshint ignore:line
            expect(result).to.deep.equal({ parentNext: true });
        });

        it('getSegmentRequestForTime() with no defended stream info, calls parent and returns its result', function () {
            const result = override.getSegmentRequestForTime({}, rep, 5);
            expect(mockParent.getSegmentRequestForTime.calledOnce).to.be.true; // jshint ignore:line
            expect(result).to.deep.equal({ parentForTime: true });
        });

        it('isLastSegmentRequested() with no defended stream info, calls parent and returns its result', function () {
            const result = override.isLastSegmentRequested(rep, NaN);
            expect(mockParent.isLastSegmentRequested.calledOnce).to.be.true; // jshint ignore:line
            expect(result).to.be.false; // jshint ignore:line
        });

        it('getIsTrailing() with no defended stream info, returns false', function () {
            expect(override.getIsTrailing()).to.be.false; // jshint ignore:line
        });
    });

    // Progressive manifests

    describe('Progressive manifests', function () {

        function addProgressive(data) {
            defenseController.addExtendedManifest({
                start: { mpd: '<MPD/>', base_uri: 'https://example.com/' },
                streams: [{ label: 'rep0', progressive: true, init: [{ range: '0-855', buffer: true }], data }]
            });
            override.updateDefendedStreamInfo(rep);
        }

        it('getNextSegmentRequest stalls (returns null, no parent call) when running off the end while progressive', function () {
            addProgressive([{ index: 0, buffer: true }]);
            const first = override.getNextSegmentRequest({}, rep); // cycle 0
            expect(first).to.exist; // jshint ignore:line
            const second = override.getNextSegmentRequest({}, rep); // off end, progressive -> stall
            expect(second).to.be.null; // jshint ignore:line
            expect(mockParent.getNextSegmentRequest.called).to.be.false; // jshint ignore:line
        });

        it('isLastSegmentRequested returns false while progressive, even at the last generated cycle', function () {
            addProgressive([{ index: 0, buffer: true }]);
            override.getNextSegmentRequest({}, rep); // consume the only cycle
            expect(override.isLastSegmentRequested(rep, NaN)).to.be.false; // jshint ignore:line
        });

        it('getNextSegmentRequest with empty progressive data stalls instead of finishing', function () {
            addProgressive([]);
            expect(override.getNextSegmentRequest({}, rep)).to.be.null; // jshint ignore:line
            // not finished: a later append can still serve cycles
            expect(override.isLastSegmentRequested(rep, NaN)).to.be.false; // jshint ignore:line
        });

        it('appended cycles become available to getNextSegmentRequest via the stream reference', function () {
            addProgressive([{ index: 0, buffer: true }]);
            override.getNextSegmentRequest({}, rep); // cycle 0
            override.getNextSegmentRequest({}, rep); // stall (off end)
            defenseController.appendDataCycles('rep0', 0, [{ index: 1, buffer: true }]);
            const next = override.getNextSegmentRequest({}, rep); // now cycle 1 exists
            expect(next).to.exist; // jshint ignore:line
            expect(next.index).to.equal(1);
        });

        it('after finalizeStream, getNextSegmentRequest finishes when running off the end', function () {
            addProgressive([{ index: 0, buffer: true }]);
            override.getNextSegmentRequest({}, rep); // cycle 0
            defenseController.finalizeStream('rep0', 0); // no trailing padding
            const off = override.getNextSegmentRequest({}, rep); // off end, not progressive -> finish
            expect(off).to.be.null; // jshint ignore:line
            expect(override.isLastSegmentRequested(rep, NaN)).to.be.true; // jshint ignore:line
        });

        it('after finalizeStream with trailing padding, the padding cycles are downloaded then the stream finishes', function () {
            addProgressive([{ index: 0, buffer: true }]);
            override.getNextSegmentRequest({}, rep); // cycle 0
            defenseController.finalizeStream('rep0', 0, [{ index: 1, padding: true }]);
            const pad = override.getNextSegmentRequest({}, rep); // trailing padding cycle
            expect(pad).to.exist; // jshint ignore:line
            expect(pad.padding).to.be.true; // jshint ignore:line
            const off = override.getNextSegmentRequest({}, rep); // off end -> finish
            expect(off).to.be.null; // jshint ignore:line
            expect(override.isLastSegmentRequested(rep, NaN)).to.be.true; // jshint ignore:line
        });
    });

    // Defended behavior with extended manifest

    describe('Defended behavior with extended manifest', function () {

        beforeEach(function () {
            defenseController.addExtendedManifest(makeManifest());
            override.updateDefendedStreamInfo(rep);
        });

        it('updateDefendedStreamInfo() returns true when stream is found', function () {
            // Re-add a fresh manifest and re-query to get a clean true result
            defenseController.addExtendedManifest(makeManifest());
            expect(override.updateDefendedStreamInfo(rep)).to.be.true; // jshint ignore:line
        });

        it('getInitRequest() does not call parent, returns a request object', function () {
            const request = override.getInitRequest({}, rep);
            expect(mockParent.getInitRequest.called).to.be.false; // jshint ignore:line
            expect(request).to.exist; // jshint ignore:line
            expect(request.url).to.exist; // jshint ignore:line
        });

        it('getInitRequest() sets full = false and buffer = false when more init cycles remain', function () {
            const request = override.getInitRequest({}, rep); // init[0], init[1] still remains
            expect(request.full).to.be.false; // jshint ignore:line
            expect(request.buffer).to.be.false; // jshint ignore:line
        });

        it('getInitRequest() sets full = true and buffer = true on the last init cycle', function () {
            override.getInitRequest({}, rep); // init[0]
            const request = override.getInitRequest({}, rep); // init[1], last
            expect(request.full).to.be.true; // jshint ignore:line
            expect(request.buffer).to.be.true; // jshint ignore:line
        });

        it('getNextSegmentRequest() does not call parent, returns a request for cycle 0 segment', function () {
            const request = override.getNextSegmentRequest({}, rep);
            expect(mockParent.getNextSegmentRequest.called).to.be.false; // jshint ignore:line
            expect(request).to.exist; // jshint ignore:line
            expect(request.index).to.equal(0);
        });

        it('getNextSegmentRequest() at a cycle without buffer, sets buffer = false on the request', function () {
            const request = override.getNextSegmentRequest({}, rep); // cycle 0 { index: 0, buffer: false }
            expect(request.buffer).to.be.false; // jshint ignore:line
            expect(request.padding).to.be.false; // jshint ignore:line
        });

        it('getNextSegmentRequest() at a cycle with buffer flag, sets buffer = true on the request', function () {
            override.getNextSegmentRequest({}, rep); // cycle 0
            const request = override.getNextSegmentRequest({}, rep); // cycle 1 { index: 1, buffer: true }
            expect(request.buffer).to.be.true; // jshint ignore:line
            expect(request.padding).to.be.false; // jshint ignore:line
        });

        it('getNextSegmentRequest() at a cycle with padding flag, sets padding = true on the request', function () {
            override.getNextSegmentRequest({}, rep); // cycle 0
            override.getNextSegmentRequest({}, rep); // cycle 1
            const request = override.getNextSegmentRequest({}, rep); // cycle 2 { index: 2, padding: true }
            expect(request.buffer).to.be.false; // jshint ignore:line
            expect(request.padding).to.be.true; // jshint ignore:line
        });

        it('getNextSegmentRequest() at a trailing padding cycle sets trail = true', function () {
            // maxNoPad = 1; cycle 2 is at index 2 > maxNoPad=1, so trail must be true
            override.getNextSegmentRequest({}, rep); // cycle 0
            override.getNextSegmentRequest({}, rep); // cycle 1
            const request = override.getNextSegmentRequest({}, rep); // cycle 2 (padding, trailing)
            expect(request.trail).to.be.true; // jshint ignore:line
        });

        it('getSegmentRequestForTime() in non-trailing state returns cycle request', function () {
            segmentsController.getSegmentByTime.callsFake((r, time) => makeSegment(r, Math.floor(time / 4)));
            // time = 4, segment index 1, first cycle with index 1 is cycle 1
            const request = override.getSegmentRequestForTime({}, rep, 4);
            expect(mockParent.getSegmentRequestForTime.called).to.be.false; // jshint ignore:line
            expect(request).to.exist; // jshint ignore:line
            expect(request.index).to.equal(1);
        });

        it('getSegmentRequestForTime() returns null when no segment exists for the requested time', function () {
            segmentsController.getSegmentByTime.returns(null);
            const request = override.getSegmentRequestForTime({}, rep, 999);
            expect(mockParent.getSegmentRequestForTime.called).to.be.false; // jshint ignore:line
            expect(request).to.be.null; // jshint ignore:line
        });

        it('getIsTrailing() returns false before any cycles are consumed', function () {
            // lastCycleIndex = -1, maxNoPad = 1, -1 >= 1 is false
            expect(override.getIsTrailing()).to.be.false; // jshint ignore:line
        });

        it('getIsTrailing() returns true when lastCycleIndex == maxNoPad and trailing cycles remain', function () {
            // maxNoPad = 1, data.length - 1 = 2
            // After cycle 0: lastCycleIndex = 0, 0 >= 1 = false
            // After cycle 1: lastCycleIndex = 1, 1 >= 1 && 1 < 2 = true
            override.getNextSegmentRequest({}, rep); // cycle 0
            override.getNextSegmentRequest({}, rep); // cycle 1
            expect(override.getIsTrailing()).to.be.true; // jshint ignore:line
        });

        it('isLastSegmentRequested() returns false when cycles remain', function () {
            override.getNextSegmentRequest({}, rep);
            // lastCycleIndex(0) < data.length - 1 (2)
            expect(override.isLastSegmentRequested(rep, NaN)).to.be.false; // jshint ignore:line
        });

        it('isLastSegmentRequested() returns true when lastCycleIndex reaches the last cycle', function () {
            override.getNextSegmentRequest({}, rep); // cycle 0
            override.getNextSegmentRequest({}, rep); // cycle 1
            override.getNextSegmentRequest({}, rep); // cycle 2, lastCycleIndex = 2 = data.length-1
            expect(override.isLastSegmentRequested(rep, NaN)).to.be.true; // jshint ignore:line
        });

        it('resetInitialSettings() clears state; with strictMode = false, subsequent getInitRequest() falls back to parent', function () {
            // Explicitly disable strict mode so fallback behavior is exercised.
            // (With the default strictMode='representation' and a loaded manifest, the
            // override would block instead of falling back.)
            const settings = Settings(context).getInstance();
            settings.update({ dodge: { strictMode: false } });

            override.resetInitialSettings();
            expect(mockParent.resetInitialSettings.calledOnce).to.be.true; // jshint ignore:line
            // defendedStreamInfo = null after reset, delegates to parent
            override.getInitRequest({}, rep);
            expect(mockParent.getInitRequest.calledOnce).to.be.true; // jshint ignore:line

            settings.update({ dodge: { strictMode: 'representation' } });
        });

        it('updateDefendedStreamInfo() returns false for unknown label', function () {
            const unknownRep = makeRepresentation();
            unknownRep.id = 'nonexistent_label';
            expect(override.updateDefendedStreamInfo(unknownRep)).to.be.false; // jshint ignore:line
        });

        it('updateDefendedStreamInfo() with same label across multiple calls preserves defense', function () {
            override.getNextSegmentRequest({}, rep); // cycle 0
            override.updateDefendedStreamInfo(rep); // re-query same label
            const r = override.getNextSegmentRequest({}, rep); // should be cycle 1, not cycle 0
            expect(r).to.exist; // jshint ignore:line
            expect(r.index).to.equal(1);
        });

        it('getIsDefended() returns true when defended stream info is set', function () {
            expect(override.getIsDefended()).to.be.true; // jshint ignore:line
        });

        it('getIsDefended() returns false after reset with strictMode false', function () {
            const settings = Settings(context).getInstance();
            settings.update({ dodge: { strictMode: false } });
            override.resetInitialSettings();
            expect(override.getIsDefended()).to.be.false; // jshint ignore:line
            settings.update({ dodge: { strictMode: 'representation' } });
        });
    });

    // Selective buffer (array buffer on data cycles)

    describe('Selective buffer (array buffer on data cycles)', function () {

        function makeSelectiveManifest() {
            return {
                start: { mpd: '<MPD/>', base_uri: 'https://example.com/' },
                streams: [{
                    label: 'rep0',
                    init: [{ range: '0-855' }, { range: '856-1711', buffer: true }],
                    data: [
                        { index: 0 }, // cycle 0
                        { index: 1, buffer: [0] }, // cycle 1, selective buffer
                        { index: 2, buffer: [] }, // cycle 2, empty array
                    ]
                }]
            };
        }

        beforeEach(function () {
            defenseController.addExtendedManifest(makeSelectiveManifest());
            override.updateDefendedStreamInfo(rep);
        });

        it('getNextSegmentRequest() at a cycle with buffer = [0], sets buffer = [0] on the request', function () {
            override.getNextSegmentRequest({}, rep); // cycle 0
            const request = override.getNextSegmentRequest({}, rep); // cycle 1 { index: 1, buffer: [0] }
            expect(request.buffer).to.deep.equal([0]);
        });

        it('getNextSegmentRequest() at a cycle with buffer = [], sets buffer = [] on the request', function () {
            override.getNextSegmentRequest({}, rep); // cycle 0
            override.getNextSegmentRequest({}, rep); // cycle 1
            const request = override.getNextSegmentRequest({}, rep); // cycle 2 { index: 2, buffer: [] }
            expect(request.buffer).to.deep.equal([]);
        });
    });

    // Per-cycle quality override (data cycles)

    describe('Per-cycle quality override', function () {

        // Build siblings list and wire it to the adapter stub so the override's
        // _resolveCycleRepresentation can find them via adapter.getVoRepresentations().
        // The list includes currentRep itself at the end, so an integer index of 2
        // resolves to currentRep.
        function makeSiblings(currentRep) {
            const altLow = {
                id: 'rep_low',
                index: 0,
                bandwidth: 250000,
                initialization: 'https://example.com/init_low.m4s',
                segmentInfoType: 'SegmentTemplate',
                segmentDuration: 4,
                timescale: 1,
                range: null,
                path: '',
                mediaInfo: currentRep.mediaInfo,
                adaptation: currentRep.adaptation,
            };
            const altMid = {
                id: 'rep_mid',
                index: 1,
                bandwidth: 500000,
                initialization: 'https://example.com/init_mid.m4s',
                segmentInfoType: 'SegmentTemplate',
                segmentDuration: 4,
                timescale: 1,
                range: null,
                path: '',
                mediaInfo: currentRep.mediaInfo,
                adaptation: currentRep.adaptation,
            };
            adapter.getVoRepresentations.withArgs(currentRep.mediaInfo).returns([altLow, altMid, currentRep]);
            return { altLow, altMid };
        }

        function makeQualityManifest() {
            return {
                start: { mpd: '<MPD/>', base_uri: 'https://example.com/' },
                streams: [{
                    label: 'rep0',
                    init: [{ range: '0-855', buffer: true }],
                    data: [
                        { index: 0 }, // cycle 0, no override
                        { index: 1, quality: 'rep_low' }, // cycle 1, string override
                        { index: 2, quality: 1 }, // cycle 2, integer override -> rep_mid
                    ]
                }]
            };
        }

        it('cycle without quality uses the current representation', function () {
            makeSiblings(rep);
            defenseController.addExtendedManifest(makeQualityManifest());
            override.updateDefendedStreamInfo(rep);

            const request = override.getNextSegmentRequest({}, rep); // cycle 0
            expect(request.representation.id).to.equal('rep0');
            expect(request.bandwidth).to.equal(1000000);
            // segmentsController should have been called with the current rep
            expect(segmentsController.getSegmentByIndex.lastCall.args[0].id).to.equal('rep0');
        });

        it('cycle with string quality resolves to the matching sibling representation', function () {
            const { altLow } = makeSiblings(rep);
            defenseController.addExtendedManifest(makeQualityManifest());
            override.updateDefendedStreamInfo(rep);

            override.getNextSegmentRequest({}, rep); // cycle 0
            const request = override.getNextSegmentRequest({}, rep); // cycle 1, quality: 'rep_low'
            expect(request.representation.id).to.equal('rep_low');
            expect(request.bandwidth).to.equal(altLow.bandwidth);
            expect(segmentsController.getSegmentByIndex.lastCall.args[0].id).to.equal('rep_low');
        });

        it('cycle with integer quality resolves to the representation at that index', function () {
            const { altMid } = makeSiblings(rep);
            defenseController.addExtendedManifest(makeQualityManifest());
            override.updateDefendedStreamInfo(rep);

            override.getNextSegmentRequest({}, rep); // cycle 0
            override.getNextSegmentRequest({}, rep); // cycle 1
            const request = override.getNextSegmentRequest({}, rep); // cycle 2, quality: 1 -> rep_mid
            expect(request.representation.id).to.equal('rep_mid');
            expect(request.bandwidth).to.equal(altMid.bandwidth);
        });

        it('cycle with out-of-range integer quality stalls (returns null, does not fall back)', function () {
            makeSiblings(rep);
            defenseController.addExtendedManifest({
                start: { mpd: '<MPD/>', base_uri: 'https://example.com/' },
                streams: [{
                    label: 'rep0',
                    init: [{ range: '0-855', buffer: true }],
                    data: [{ index: 0, quality: 99 }]
                }]
            });
            override.updateDefendedStreamInfo(rep);

            const request = override.getNextSegmentRequest({}, rep);
            expect(request).to.be.null; // jshint ignore:line
        });

        it('cycle with unknown string quality stalls (returns null, does not fall back)', function () {
            makeSiblings(rep);
            defenseController.addExtendedManifest({
                start: { mpd: '<MPD/>', base_uri: 'https://example.com/' },
                streams: [{
                    label: 'rep0',
                    init: [{ range: '0-855', buffer: true }],
                    data: [{ index: 0, quality: 'rep_nonexistent' }]
                }]
            });
            override.updateDefendedStreamInfo(rep);

            const request = override.getNextSegmentRequest({}, rep);
            expect(request).to.be.null; // jshint ignore:line
        });

        it('cycle with quality override whose alt rep has no segment for the index stalls', function () {
            makeSiblings(rep);
            defenseController.addExtendedManifest({
                start: { mpd: '<MPD/>', base_uri: 'https://example.com/' },
                streams: [{
                    label: 'rep0',
                    init: [{ range: '0-855', buffer: true }],
                    data: [{ index: 0, quality: 'rep_low' }]
                }]
            });
            override.updateDefendedStreamInfo(rep);

            // Force the alt rep lookup to miss.
            segmentsController.getSegmentByIndex.callsFake((r) => {
                return r.id === 'rep_low' ? null : makeSegment(r, 0);
            });

            const request = override.getNextSegmentRequest({}, rep);
            expect(request).to.be.null; // jshint ignore:line
        });

        it('failed quality override does not advance lastCycleIndex', function () {
            makeSiblings(rep);
            defenseController.addExtendedManifest({
                start: { mpd: '<MPD/>', base_uri: 'https://example.com/' },
                streams: [{
                    label: 'rep0',
                    init: [{ range: '0-855', buffer: true }],
                    data: [
                        { index: 0, quality: 'rep_nonexistent' },
                        { index: 1 },
                    ]
                }]
            });
            override.updateDefendedStreamInfo(rep);

            expect(override.getNextSegmentRequest({}, rep)).to.be.null; // jshint ignore:line
            // Next call re-attempts the same (failing) cycle; lastCycleIndex was not advanced.
            expect(override.getNextSegmentRequest({}, rep)).to.be.null; // jshint ignore:line
            // getLastSegment reflects that no segment has been consumed yet.
            expect(override.getLastSegment()).to.be.null; // jshint ignore:line
        });

        it('quality override does not poison lastSegment cache for a subsequent same-index cycle', function () {
            makeSiblings(rep);
            // Cycle 0: index 0, quality 'rep_low' (overridden).
            // Cycle 1: index 0, no override. Must not reuse lastSegment from cycle 0
            // (which carries rep_low); must re-lookup against current rep.
            defenseController.addExtendedManifest({
                start: { mpd: '<MPD/>', base_uri: 'https://example.com/' },
                streams: [{
                    label: 'rep0',
                    init: [{ range: '0-855', buffer: true }],
                    data: [
                        { index: 0, range: '0-999', quality: 'rep_low' },
                        { index: 0, range: '1000-' },
                    ]
                }]
            });
            override.updateDefendedStreamInfo(rep);

            const r0 = override.getNextSegmentRequest({}, rep); // cycle 0, override
            expect(r0.representation.id).to.equal('rep_low');

            const r1 = override.getNextSegmentRequest({}, rep); // cycle 1, no override
            expect(r1.representation.id).to.equal('rep0');
            expect(r1.bandwidth).to.equal(1000000);
        });

        it('getSegmentRequestForTime with unresolvable quality override stalls (returns null)', function () {
            makeSiblings(rep);
            defenseController.addExtendedManifest({
                start: { mpd: '<MPD/>', base_uri: 'https://example.com/' },
                streams: [{
                    label: 'rep0',
                    init: [{ range: '0-855', buffer: true }],
                    data: [{ index: 0, quality: 'rep_nonexistent' }]
                }]
            });
            override.updateDefendedStreamInfo(rep);
            segmentsController.getSegmentByTime.callsFake((r, time) => makeSegment(r, Math.floor(time / 4)));

            const request = override.getSegmentRequestForTime({}, rep, 0);
            expect(request).to.be.null; // jshint ignore:line
        });

        it('getSegmentRequestForTime honors quality override via re-lookup', function () {
            const { altLow } = makeSiblings(rep);
            defenseController.addExtendedManifest({
                start: { mpd: '<MPD/>', base_uri: 'https://example.com/' },
                streams: [{
                    label: 'rep0',
                    init: [{ range: '0-855', buffer: true }],
                    data: [
                        { index: 0 },
                        { index: 1, quality: 'rep_low' },
                    ]
                }]
            });
            override.updateDefendedStreamInfo(rep);
            segmentsController.getSegmentByTime.callsFake((r, time) => makeSegment(r, Math.floor(time / 4)));

            // time = 4, segment index 1, cycle 1 has quality 'rep_low'
            const request = override.getSegmentRequestForTime({}, rep, 4);
            expect(request.representation.id).to.equal('rep_low');
            expect(request.bandwidth).to.equal(altLow.bandwidth);
        });

        it('getNextSegmentRequest sets homeRepresentationId when quality override resolves to a different representation', function () {
            makeSiblings(rep);
            defenseController.addExtendedManifest(makeQualityManifest());
            override.updateDefendedStreamInfo(rep);

            override.getNextSegmentRequest({}, rep); // cycle 0, no override
            const request = override.getNextSegmentRequest({}, rep); // cycle 1, quality: 'rep_low'
            expect(request.homeRepresentationId).to.equal('rep0');
        });

        it('getNextSegmentRequest does not set homeRepresentationId when no quality override', function () {
            makeSiblings(rep);
            defenseController.addExtendedManifest(makeQualityManifest());
            override.updateDefendedStreamInfo(rep);

            const request = override.getNextSegmentRequest({}, rep); // cycle 0, no override
            expect(request.homeRepresentationId).to.be.undefined; // jshint ignore:line
        });

        it('getNextSegmentRequest does not set homeRepresentationId when quality matches home rep', function () {
            makeSiblings(rep);
            defenseController.addExtendedManifest({
                start: { mpd: '<MPD/>', base_uri: 'https://example.com/' },
                streams: [{
                    label: 'rep0',
                    init: [{ range: '0-855', buffer: true }],
                    data: [{ index: 0, quality: 'rep0', buffer: true }]
                }]
            });
            override.updateDefendedStreamInfo(rep);

            const request = override.getNextSegmentRequest({}, rep);
            expect(request).to.exist; // jshint ignore:line
            expect(request.homeRepresentationId).to.be.undefined; // jshint ignore:line
            expect(request.representation.id).to.equal('rep0');
        });

        it('getSegmentRequestForTime sets homeRepresentationId when quality override is active', function () {
            makeSiblings(rep);
            defenseController.addExtendedManifest({
                start: { mpd: '<MPD/>', base_uri: 'https://example.com/' },
                streams: [{
                    label: 'rep0',
                    init: [{ range: '0-855', buffer: true }],
                    data: [
                        { index: 0 },
                        { index: 1, quality: 'rep_low' },
                    ]
                }]
            });
            override.updateDefendedStreamInfo(rep);
            segmentsController.getSegmentByTime.callsFake((r, time) => makeSegment(r, Math.floor(time / 4)));

            const request = override.getSegmentRequestForTime({}, rep, 4); // segment 1, quality override
            expect(request.homeRepresentationId).to.equal('rep0');
        });

        it('getSegmentRequestForTime does not set homeRepresentationId when no quality override', function () {
            makeSiblings(rep);
            defenseController.addExtendedManifest({
                start: { mpd: '<MPD/>', base_uri: 'https://example.com/' },
                streams: [{
                    label: 'rep0',
                    init: [{ range: '0-855', buffer: true }],
                    data: [
                        { index: 0 },
                        { index: 1, quality: 'rep_low' },
                    ]
                }]
            });
            override.updateDefendedStreamInfo(rep);
            segmentsController.getSegmentByTime.callsFake((r, time) => makeSegment(r, Math.floor(time / 4)));

            const request = override.getSegmentRequestForTime({}, rep, 0); // segment 0, no override
            expect(request.homeRepresentationId).to.be.undefined; // jshint ignore:line
        });

        it('cycle quality override with no siblings available stalls (returns null)', function () {
            adapter.getVoRepresentations.returns(null);
            defenseController.addExtendedManifest({
                start: { mpd: '<MPD/>', base_uri: 'https://example.com/' },
                streams: [{
                    label: 'rep0',
                    init: [{ range: '0-855', buffer: true }],
                    data: [{ index: 0, quality: 'rep_low' }]
                }]
            });
            override.updateDefendedStreamInfo(rep);

            const request = override.getNextSegmentRequest({}, rep);
            expect(request).to.be.null; // jshint ignore:line
        });

        it('cycle with quality: null uses the current representation (no override)', function () {
            makeSiblings(rep);
            defenseController.addExtendedManifest({
                start: { mpd: '<MPD/>', base_uri: 'https://example.com/' },
                streams: [{
                    label: 'rep0',
                    init: [{ range: '0-855', buffer: true }],
                    data: [{ index: 0, quality: null, buffer: true }]
                }]
            });
            override.updateDefendedStreamInfo(rep);

            const request = override.getNextSegmentRequest({}, rep);
            expect(request).to.exist; // jshint ignore:line
            expect(request.representation.id).to.equal('rep0');
        });
    });

    // URL padding

    describe('URL padding', function () {
        let paddingContext, paddingRegistry, paddingRep, paddingParent, paddingOverride;

        beforeEach(function () {
            paddingContext = {};
            Debug(paddingContext).getInstance();
            paddingRegistry = DefenseRegistry(paddingContext).getInstance();
            paddingRegistry.reset();

            paddingRep = makeRepresentation();

            paddingParent = {
                getInitRequest: sinon.stub().returns(null),
                getNextSegmentRequest: sinon.stub().returns(null),
                resetInitialSettings: sinon.stub(),
                initialize: sinon.stub(),
                getStreamInfo: sinon.stub().returns({ manifestInfo: { isDynamic: false } }),
                getType: sinon.stub().returns('video'),
            };

            // baseURLController returns a real base URL so the padding branch is entered
            const realBaseURLController = {
                resolve: () => ({ url: 'https://example.com/', serviceLocation: 'example.com', queryParams: {} })
            };

            // Segments use a relative $Number$ template URL
            const templateSegmentsController = {
                getSegmentByIndex: sinon.stub().callsFake((r, idx) => ({
                    index: idx,
                    media: 'seg_$Number$.m4s',
                    presentationStartTime: idx * 4,
                    duration: 4,
                    representation: r,
                    replacementNumber: idx,
                    replacementTime: 0,
                    mediaRange: null,
                    availabilityStartTime: 0,
                    availabilityEndTime: Infinity,
                    wallStartTime: 0,
                    mediaStartTime: 0,
                    replacements: null,
                })),
                getSegmentByTime: sinon.stub().returns(null),
            };

            paddingOverride = DodgeDashHandlerOverride.call(
                { context: paddingContext, parent: paddingParent, factory: {} },
                {
                    adapter: { getVoRepresentations: sinon.stub().returns([]) },
                    debug: Debug(paddingContext).getInstance(),
                    urlUtils: URLUtils(paddingContext).getInstance(),
                    segmentsController: templateSegmentsController,
                    baseURLController: realBaseURLController,
                    timelineConverter: objectsHelper.getDummyTimelineConverter(),
                    playbackController: {
                        getTimeSinceStreamEnd: sinon.stub().returns(0),
                        getStreamEndTime: sinon.stub().returns(100),
                    },
                }
            );

            paddingRegistry.addExtendedManifest({
                start: { mpd: '<MPD/>', base_uri: 'https://example.com/' },
                streams: [{
                    label: 'rep0',
                    init: [{}],
                    data: [
                        { index: 0, buffer: true }, // cycle 0, 1-digit segment index
                        { index: 10, buffer: true }, // cycle 1, 2-digit segment index
                    ]
                }]
            });
            paddingOverride.updateDefendedStreamInfo(paddingRep);
        });

        it('relative template URL, queryParams.padding is set on the request', function () {
            const request = paddingOverride.getNextSegmentRequest({}, paddingRep); // cycle 0, index 0
            expect(request.queryParams).to.exist; // jshint ignore:line
            expect(request.queryParams.padding).to.be.a('string');
            expect(request.queryParams.padding.length).to.be.greaterThan(0);
        });

        it('$Number$ padding is longer for a 1-digit index than for a 2-digit index', function () {
            const r0 = paddingOverride.getNextSegmentRequest({}, paddingRep); // index 0, 1 digit
            const r10 = paddingOverride.getNextSegmentRequest({}, paddingRep); // index 10, 2 digits
            // A shorter numeric string needs more zero-padding to reach max length.
            expect(r0.queryParams.padding.length).to.be.greaterThan(r10.queryParams.padding.length);
        });

        it('absolute URL (no template expansion), queryParams has no padding key', function () {
            // `override` uses makeSegment which has an absolute URL
            defenseController.addExtendedManifest(makeManifest());
            override.updateDefendedStreamInfo(rep);
            const request = override.getNextSegmentRequest({}, rep);
            expect(request.queryParams.padding).to.be.undefined; // jshint ignore:line
        });

        // BaseURL.queryParams isolation: each generated request must own its
        // queryParams object. Aliasing the BaseURL's object causes padding values
        // to be silently overwritten when another request is generated against the
        // same BaseURL, which (combined with HTTPLoader's retry path appending
        // request.queryParams to request.url) produces duplicate
        // `?padding=X&padding=Y` query parameters on the wire.

        it('request.queryParams is not the BaseURL.queryParams object (cloned, not aliased)', function () {
            // Use a baseURLController whose resolve() returns the same baseURL
            // object on every call so we can detect aliasing.
            const sharedBaseURL = { url: 'https://example.com/', serviceLocation: 'example.com', queryParams: {} };
            const stableBaseURLController = { resolve: () => sharedBaseURL };

            const ctx = {};
            Debug(ctx).getInstance();
            const registry = DefenseRegistry(ctx).getInstance();
            registry.reset();

            const localRep = makeRepresentation();
            const localParent = {
                getInitRequest: sinon.stub().returns(null),
                getNextSegmentRequest: sinon.stub().returns(null),
                resetInitialSettings: sinon.stub(),
                initialize: sinon.stub(),
                getStreamInfo: sinon.stub().returns({ manifestInfo: { isDynamic: false } }),
                getType: sinon.stub().returns('video'),
            };
            const localSegmentsController = {
                getSegmentByIndex: sinon.stub().callsFake((r, idx) => ({
                    index: idx,
                    media: 'seg_$Number$.m4s',
                    presentationStartTime: idx * 4,
                    duration: 4,
                    representation: r,
                    replacementNumber: idx,
                    replacementTime: 0,
                    mediaRange: null,
                    availabilityStartTime: 0,
                    availabilityEndTime: Infinity,
                    wallStartTime: 0,
                    mediaStartTime: 0,
                    replacements: null,
                })),
                getSegmentByTime: sinon.stub().returns(null),
            };
            const localOverride = DodgeDashHandlerOverride.call(
                { context: ctx, parent: localParent, factory: {} },
                {
                    adapter: { getVoRepresentations: sinon.stub().returns([]) },
                    debug: Debug(ctx).getInstance(),
                    urlUtils: URLUtils(ctx).getInstance(),
                    segmentsController: localSegmentsController,
                    baseURLController: stableBaseURLController,
                    timelineConverter: objectsHelper.getDummyTimelineConverter(),
                    playbackController: {
                        getTimeSinceStreamEnd: sinon.stub().returns(0),
                        getStreamEndTime: sinon.stub().returns(100),
                    },
                }
            );
            registry.addExtendedManifest({
                start: { mpd: '<MPD/>', base_uri: 'https://example.com/' },
                streams: [{
                    label: 'rep0',
                    init: [{}],
                    data: [{ index: 0, buffer: true }, { index: 1, buffer: true }]
                }]
            });
            localOverride.updateDefendedStreamInfo(localRep);

            const request = localOverride.getNextSegmentRequest({}, localRep);

            expect(request.queryParams).to.exist; // jshint ignore:line
            expect(request.queryParams).to.not.equal(sharedBaseURL.queryParams);
        });

        it('baseURL.queryParams is not mutated by request generation', function () {
            const sharedBaseURL = { url: 'https://example.com/', serviceLocation: 'example.com', queryParams: {} };
            const stableBaseURLController = { resolve: () => sharedBaseURL };

            const ctx = {};
            Debug(ctx).getInstance();
            const registry = DefenseRegistry(ctx).getInstance();
            registry.reset();

            const localRep = makeRepresentation();
            const localParent = {
                getInitRequest: sinon.stub().returns(null),
                getNextSegmentRequest: sinon.stub().returns(null),
                resetInitialSettings: sinon.stub(),
                initialize: sinon.stub(),
                getStreamInfo: sinon.stub().returns({ manifestInfo: { isDynamic: false } }),
                getType: sinon.stub().returns('video'),
            };
            const localSegmentsController = {
                getSegmentByIndex: sinon.stub().callsFake((r, idx) => ({
                    index: idx,
                    media: 'seg_$Number$.m4s',
                    presentationStartTime: idx * 4,
                    duration: 4,
                    representation: r,
                    replacementNumber: idx,
                    replacementTime: 0,
                    mediaRange: null,
                    availabilityStartTime: 0,
                    availabilityEndTime: Infinity,
                    wallStartTime: 0,
                    mediaStartTime: 0,
                    replacements: null,
                })),
                getSegmentByTime: sinon.stub().returns(null),
            };
            const localOverride = DodgeDashHandlerOverride.call(
                { context: ctx, parent: localParent, factory: {} },
                {
                    adapter: { getVoRepresentations: sinon.stub().returns([]) },
                    debug: Debug(ctx).getInstance(),
                    urlUtils: URLUtils(ctx).getInstance(),
                    segmentsController: localSegmentsController,
                    baseURLController: stableBaseURLController,
                    timelineConverter: objectsHelper.getDummyTimelineConverter(),
                    playbackController: {
                        getTimeSinceStreamEnd: sinon.stub().returns(0),
                        getStreamEndTime: sinon.stub().returns(100),
                    },
                }
            );
            registry.addExtendedManifest({
                start: { mpd: '<MPD/>', base_uri: 'https://example.com/' },
                streams: [{
                    label: 'rep0',
                    init: [{}],
                    data: [{ index: 0, buffer: true }, { index: 1, buffer: true }]
                }]
            });
            localOverride.updateDefendedStreamInfo(localRep);

            localOverride.getNextSegmentRequest({}, localRep);
            localOverride.getNextSegmentRequest({}, localRep);

            // The BaseURL's queryParams object must not have been written to.
            expect(sharedBaseURL.queryParams).to.deep.equal({});
        });

        it('request.queryParams.padding is stable across subsequent generated requests against the same BaseURL', function () {
            const sharedBaseURL = { url: 'https://example.com/', serviceLocation: 'example.com', queryParams: {} };
            const stableBaseURLController = { resolve: () => sharedBaseURL };

            const ctx = {};
            Debug(ctx).getInstance();
            const registry = DefenseRegistry(ctx).getInstance();
            registry.reset();

            const localRep = makeRepresentation();
            const localParent = {
                getInitRequest: sinon.stub().returns(null),
                getNextSegmentRequest: sinon.stub().returns(null),
                resetInitialSettings: sinon.stub(),
                initialize: sinon.stub(),
                getStreamInfo: sinon.stub().returns({ manifestInfo: { isDynamic: false } }),
                getType: sinon.stub().returns('video'),
            };
            const localSegmentsController = {
                getSegmentByIndex: sinon.stub().callsFake((r, idx) => ({
                    index: idx,
                    media: 'seg_$Number$.m4s',
                    presentationStartTime: idx * 4,
                    duration: 4,
                    representation: r,
                    replacementNumber: idx,
                    replacementTime: 0,
                    mediaRange: null,
                    availabilityStartTime: 0,
                    availabilityEndTime: Infinity,
                    wallStartTime: 0,
                    mediaStartTime: 0,
                    replacements: null,
                })),
                getSegmentByTime: sinon.stub().returns(null),
            };
            const localOverride = DodgeDashHandlerOverride.call(
                { context: ctx, parent: localParent, factory: {} },
                {
                    adapter: { getVoRepresentations: sinon.stub().returns([]) },
                    debug: Debug(ctx).getInstance(),
                    urlUtils: URLUtils(ctx).getInstance(),
                    segmentsController: localSegmentsController,
                    baseURLController: stableBaseURLController,
                    timelineConverter: objectsHelper.getDummyTimelineConverter(),
                    playbackController: {
                        getTimeSinceStreamEnd: sinon.stub().returns(0),
                        getStreamEndTime: sinon.stub().returns(100),
                    },
                }
            );
            registry.addExtendedManifest({
                start: { mpd: '<MPD/>', base_uri: 'https://example.com/' },
                streams: [{
                    label: 'rep0',
                    init: [{}],
                    data: [{ index: 0, buffer: true }, { index: 1, buffer: true }]
                }]
            });
            localOverride.updateDefendedStreamInfo(localRep);

            const requestA = localOverride.getNextSegmentRequest({}, localRep);
            const paddingA = requestA.queryParams.padding;

            const requestB = localOverride.getNextSegmentRequest({}, localRep);

            // Two distinct queryParams objects (no aliasing).
            expect(requestA.queryParams).to.not.equal(requestB.queryParams);
            // requestA's padding value must not have been overwritten by
            // requestB's generation.
            expect(requestA.queryParams.padding).to.equal(paddingA);
            expect(requestA.queryParams.padding).to.not.equal(requestB.queryParams.padding);
        });

        it('maxIdLength invalid (negative): falls back to max loaded label length and warns exactly once across requests', function () {
            const ctx = {};
            const loggerSpy = { fatal: sinon.spy(), error: sinon.spy(), warn: sinon.spy(), info: sinon.spy(), debug: sinon.spy() };
            sinon.stub(Debug(ctx).getInstance(), 'getLogger').returns(loggerSpy);

            const registry = DefenseRegistry(ctx).getInstance();
            registry.reset();

            const localSettings = Settings(ctx).getInstance();
            localSettings.update({ dodge: { maxIdLength: -5 } });

            const localRep = makeRepresentation(); // id = 'rep0' (4 chars)

            const localParent = {
                getInitRequest: sinon.stub().returns(null),
                getNextSegmentRequest: sinon.stub().returns(null),
                resetInitialSettings: sinon.stub(),
                initialize: sinon.stub(),
                getStreamInfo: sinon.stub().returns({ manifestInfo: { isDynamic: false } }),
                getType: sinon.stub().returns('video'),
            };

            const localBaseURLController = {
                resolve: () => ({ url: 'https://example.com/', serviceLocation: 'example.com', queryParams: {} })
            };

            // Template contains $RepresentationID$ so the ID branch fires.
            const localSegmentsController = {
                getSegmentByIndex: sinon.stub().callsFake((r, idx) => ({
                    index: idx,
                    media: 'seg_$RepresentationID$.m4s',
                    presentationStartTime: idx * 4,
                    duration: 4,
                    representation: r,
                    replacementNumber: idx,
                    replacementTime: 0,
                    mediaRange: null,
                    availabilityStartTime: 0,
                    availabilityEndTime: Infinity,
                    wallStartTime: 0,
                    mediaStartTime: 0,
                    replacements: null,
                })),
                getSegmentByTime: sinon.stub().returns(null),
            };

            const localOverride = DodgeDashHandlerOverride.call(
                { context: ctx, parent: localParent, factory: {} },
                {
                    adapter: { getVoRepresentations: sinon.stub().returns([]) },
                    debug: Debug(ctx).getInstance(),
                    urlUtils: URLUtils(ctx).getInstance(),
                    segmentsController: localSegmentsController,
                    baseURLController: localBaseURLController,
                    timelineConverter: objectsHelper.getDummyTimelineConverter(),
                    playbackController: {
                        getTimeSinceStreamEnd: sinon.stub().returns(0),
                        getStreamEndTime: sinon.stub().returns(100),
                    },
                }
            );

            // Two streams so the fallback resolves to a non-trivial max label
            // length. `rep0` is 4 chars; `rep_longer` is 10 chars.
            registry.addExtendedManifest({
                start: { mpd: '<MPD/>', base_uri: 'https://example.com/' },
                streams: [
                    {
                        label: 'rep0',
                        init: [{}],
                        // Ten data cycles so 10 sequential getNextSegmentRequest calls resolve.
                        data: [
                            { index: 0, buffer: true }, { index: 1, buffer: true },
                            { index: 2, buffer: true }, { index: 3, buffer: true },
                            { index: 4, buffer: true }, { index: 5, buffer: true },
                            { index: 6, buffer: true }, { index: 7, buffer: true },
                            { index: 8, buffer: true }, { index: 9, buffer: true },
                        ]
                    },
                    {
                        label: 'rep_longer',
                        init: [{}],
                        data: [{ index: 0, buffer: true }]
                    }
                ]
            });
            localOverride.updateDefendedStreamInfo(localRep);

            for (let i = 0; i < 10; i++) {
                const req = localOverride.getNextSegmentRequest({}, localRep);
                expect(req).to.exist; // jshint ignore:line
                expect(req.queryParams.padding).to.be.a('string');
                // Fallback maxId = 10 ('rep_longer'), chars = 4 ('rep0'), pad = 6,
                // the padding string contains at least 6 zeros from the ID branch
                // (one $RepresentationID$ in the template). Total length is the
                // cache-busting prefix + at least 6 zeros.
                expect(req.queryParams.padding.length).to.be.at.least(6);
            }

            // Warn once: exactly one warning despite 10 requests, and the warning
            // text carries the dynamically computed fallback value (10).
            const invalidWarnings = loggerSpy.warn.getCalls().filter(
                c => c.args[0] && c.args[0].indexOf('maxIdLength is invalid') !== -1
            );
            expect(invalidWarnings.length).to.equal(1);
            expect(invalidWarnings[0].args[0]).to.include('treating as 10');
        });
    });

    // Strict mode

    describe('strictMode = representation', function () {
        let settings;

        beforeEach(function () {
            settings = Settings(context).getInstance();
            settings.update({ dodge: { strictMode: 'representation' } });
        });

        afterEach(function () {
            settings.update({ dodge: { strictMode: false } });
        });

        it('with no extended manifest loaded, falls back to parent (hasContent() = false)', function () {
            // Registry is empty, we should fall back
            const result = override.getInitRequest({}, rep);
            expect(mockParent.getInitRequest.calledOnce).to.be.true; // jshint ignore:line
            expect(result).to.deep.equal({ parentInit: true });
        });

        it('with no extended manifest loaded, getNextSegmentRequestIdempotent falls back to parent (hasContent() = false)', function () {
            const result = override.getNextSegmentRequestIdempotent({}, rep);
            expect(mockParent.getNextSegmentRequestIdempotent.calledOnce).to.be.true; // jshint ignore:line
            expect(result).to.deep.equal({ idempotent: true });
        });

        it('with extended manifest loaded but unknown label, getInitRequest returns null', function () {
            defenseController.addExtendedManifest(makeManifest());
            const unknownRep = Object.assign({}, rep, { id: 'unknown_label' });
            override.updateDefendedStreamInfo(unknownRep);
            const result = override.getInitRequest({}, unknownRep);
            expect(mockParent.getInitRequest.called).to.be.false; // jshint ignore:line
            expect(result).to.be.null; // jshint ignore:line
        });

        it('with extended manifest loaded but unknown label, getNextSegmentRequest returns null', function () {
            defenseController.addExtendedManifest(makeManifest());
            const unknownRep = Object.assign({}, rep, { id: 'unknown_label', segmentInfoType: 'SegmentTemplate' });
            override.updateDefendedStreamInfo(unknownRep);
            const result = override.getNextSegmentRequest({}, unknownRep);
            expect(mockParent.getNextSegmentRequest.called).to.be.false; // jshint ignore:line
            expect(result).to.be.null; // jshint ignore:line
        });

        it('with extended manifest loaded but unknown label, getSegmentRequestForTime returns null', function () {
            defenseController.addExtendedManifest(makeManifest());
            const unknownRep = Object.assign({}, rep, { id: 'unknown_label', segmentInfoType: 'SegmentTemplate' });
            override.updateDefendedStreamInfo(unknownRep);
            const result = override.getSegmentRequestForTime({}, unknownRep, 0);
            expect(mockParent.getSegmentRequestForTime.called).to.be.false; // jshint ignore:line
            expect(result).to.be.null; // jshint ignore:line
        });

        it('with extended manifest loaded but unknown label, isLastSegmentRequested returns false without calling parent', function () {
            defenseController.addExtendedManifest(makeManifest());
            const unknownRep = Object.assign({}, rep, { id: 'unknown_label' });
            override.updateDefendedStreamInfo(unknownRep);
            const result = override.isLastSegmentRequested(unknownRep, NaN);
            expect(mockParent.isLastSegmentRequested.called).to.be.false; // jshint ignore:line
            expect(result).to.be.false; // jshint ignore:line
        });

        it('with extended manifest loaded but unknown label, getNextSegmentRequestIdempotent returns null', function () {
            defenseController.addExtendedManifest(makeManifest());
            const unknownRep = Object.assign({}, rep, { id: 'unknown_label', segmentInfoType: 'SegmentTemplate' });
            override.updateDefendedStreamInfo(unknownRep);
            const result = override.getNextSegmentRequestIdempotent({}, unknownRep);
            expect(mockParent.getNextSegmentRequestIdempotent.called).to.be.false; // jshint ignore:line
            expect(result).to.be.null; // jshint ignore:line
        });

        it('with extended manifest loaded and known label, defense still works normally', function () {
            defenseController.addExtendedManifest(makeManifest());
            override.updateDefendedStreamInfo(rep);
            const request = override.getInitRequest({}, rep);
            expect(mockParent.getInitRequest.called).to.be.false; // jshint ignore:line
            expect(request).to.exist; // jshint ignore:line
        });
    });

    describe('strictMode = manifest', function () {
        let settings;

        beforeEach(function () {
            settings = Settings(context).getInstance();
            settings.update({ dodge: { strictMode: 'manifest' } });
        });

        afterEach(function () {
            settings.update({ dodge: { strictMode: false } });
        });

        it('with extended manifest loaded but unknown label, getInitRequest returns null', function () {
            defenseController.addExtendedManifest(makeManifest());
            const unknownRep = Object.assign({}, rep, { id: 'unknown_label' });
            override.updateDefendedStreamInfo(unknownRep);
            const result = override.getInitRequest({}, unknownRep);
            expect(mockParent.getInitRequest.called).to.be.false; // jshint ignore:line
            expect(result).to.be.null; // jshint ignore:line
        });

        it('with extended manifest loaded but unknown label, getNextSegmentRequest returns null', function () {
            defenseController.addExtendedManifest(makeManifest());
            const unknownRep = Object.assign({}, rep, { id: 'unknown_label', segmentInfoType: 'SegmentTemplate' });
            override.updateDefendedStreamInfo(unknownRep);
            const result = override.getNextSegmentRequest({}, unknownRep);
            expect(mockParent.getNextSegmentRequest.called).to.be.false; // jshint ignore:line
            expect(result).to.be.null; // jshint ignore:line
        });

        it('with extended manifest loaded but unknown label, getSegmentRequestForTime returns null', function () {
            defenseController.addExtendedManifest(makeManifest());
            const unknownRep = Object.assign({}, rep, { id: 'unknown_label', segmentInfoType: 'SegmentTemplate' });
            override.updateDefendedStreamInfo(unknownRep);
            const result = override.getSegmentRequestForTime({}, unknownRep, 0);
            expect(mockParent.getSegmentRequestForTime.called).to.be.false; // jshint ignore:line
            expect(result).to.be.null; // jshint ignore:line
        });

        it('with extended manifest loaded but unknown label, isLastSegmentRequested returns false without calling parent', function () {
            defenseController.addExtendedManifest(makeManifest());
            const unknownRep = Object.assign({}, rep, { id: 'unknown_label' });
            override.updateDefendedStreamInfo(unknownRep);
            const result = override.isLastSegmentRequested(unknownRep, NaN);
            expect(mockParent.isLastSegmentRequested.called).to.be.false; // jshint ignore:line
            expect(result).to.be.false; // jshint ignore:line
        });

        it('with extended manifest loaded but unknown label, getNextSegmentRequestIdempotent returns null', function () {
            defenseController.addExtendedManifest(makeManifest());
            const unknownRep = Object.assign({}, rep, { id: 'unknown_label', segmentInfoType: 'SegmentTemplate' });
            override.updateDefendedStreamInfo(unknownRep);
            const result = override.getNextSegmentRequestIdempotent({}, unknownRep);
            expect(mockParent.getNextSegmentRequestIdempotent.called).to.be.false; // jshint ignore:line
            expect(result).to.be.null; // jshint ignore:line
        });

        it('with extended manifest loaded and known label, defense still works normally', function () {
            defenseController.addExtendedManifest(makeManifest());
            override.updateDefendedStreamInfo(rep);
            const request = override.getInitRequest({}, rep);
            expect(mockParent.getInitRequest.called).to.be.false; // jshint ignore:line
            expect(request).to.exist; // jshint ignore:line
        });
    });

    describe('strictMode = max', function () {
        let settings;

        beforeEach(function () {
            settings = Settings(context).getInstance();
            settings.update({ dodge: { strictMode: 'max' } });
        });

        afterEach(function () {
            settings.update({ dodge: { strictMode: false } });
        });

        it('with no extended manifest loaded, falls back to parent (hasContent() = false)', function () {
            const result = override.getInitRequest({}, rep);
            expect(mockParent.getInitRequest.calledOnce).to.be.true; // jshint ignore:line
            expect(result).to.deep.equal({ parentInit: true });
        });

        it('with extended manifest loaded but unknown label, getInitRequest returns null', function () {
            defenseController.addExtendedManifest(makeManifest());
            const unknownRep = Object.assign({}, rep, { id: 'unknown_label' });
            override.updateDefendedStreamInfo(unknownRep);
            const result = override.getInitRequest({}, unknownRep);
            expect(mockParent.getInitRequest.called).to.be.false; // jshint ignore:line
            expect(result).to.be.null; // jshint ignore:line
        });

        it('with extended manifest loaded but unknown label, getNextSegmentRequest returns null', function () {
            defenseController.addExtendedManifest(makeManifest());
            const unknownRep = Object.assign({}, rep, { id: 'unknown_label', segmentInfoType: 'SegmentTemplate' });
            override.updateDefendedStreamInfo(unknownRep);
            const result = override.getNextSegmentRequest({}, unknownRep);
            expect(mockParent.getNextSegmentRequest.called).to.be.false; // jshint ignore:line
            expect(result).to.be.null; // jshint ignore:line
        });

        it('with extended manifest loaded but unknown label, isLastSegmentRequested returns false without calling parent', function () {
            defenseController.addExtendedManifest(makeManifest());
            const unknownRep = Object.assign({}, rep, { id: 'unknown_label' });
            override.updateDefendedStreamInfo(unknownRep);
            const result = override.isLastSegmentRequested(unknownRep, NaN);
            expect(mockParent.isLastSegmentRequested.called).to.be.false; // jshint ignore:line
            expect(result).to.be.false; // jshint ignore:line
        });

        it('with extended manifest loaded and known label, defense still works normally', function () {
            defenseController.addExtendedManifest(makeManifest());
            override.updateDefendedStreamInfo(rep);
            const request = override.getInitRequest({}, rep);
            expect(mockParent.getInitRequest.called).to.be.false; // jshint ignore:line
            expect(request).to.exist; // jshint ignore:line
        });
    });

    // Data-only streams (self-initialized)

    describe('Data-only streams (self-initialized)', function () {
        const dataOnlyManifest = {
            start: { mpd: '<MPD/>', base_uri: 'https://example.com/' },
            streams: [{
                label: 'rep0',
                data: [
                    { index: 0, buffer: false }, // cycle 0, non-padding
                    { index: 1, buffer: true }, // cycle 1, last non-padding, maxNoPad = 1
                    { index: 2, padding: true }, // cycle 2, trailing padding
                ]
            }]
        };

        beforeEach(function () {
            defenseController.addExtendedManifest(dataOnlyManifest);
            override.updateDefendedStreamInfo(rep);
        });

        it('getRemainingInitCycles() returns 0', function () {
            expect(override.getRemainingInitCycles()).to.equal(0);
        });

        it('getInitRequest() returns null without calling parent', function () {
            const result = override.getInitRequest({}, rep);
            expect(mockParent.getInitRequest.called).to.be.false; // jshint ignore:line
            expect(result).to.be.null; // jshint ignore:line
        });

        it('getNextSegmentRequest() returns a request object normally', function () {
            const result = override.getNextSegmentRequest({}, rep);
            expect(mockParent.getNextSegmentRequest.called).to.be.false; // jshint ignore:line
            expect(result).to.exist; // jshint ignore:line
        });

        it('isLastSegmentRequested() returns false while cycles remain', function () {
            override.getNextSegmentRequest({}, rep); // cycle 0
            expect(override.isLastSegmentRequested(rep, NaN)).to.be.false; // jshint ignore:line
        });

        it('isLastSegmentRequested() returns true after all cycles consumed', function () {
            override.getNextSegmentRequest({}, rep); // cycle 0
            override.getNextSegmentRequest({}, rep); // cycle 1
            override.getNextSegmentRequest({}, rep); // cycle 2 (padding)
            expect(override.isLastSegmentRequested(rep, NaN)).to.be.true; // jshint ignore:line
        });
    });

    // Init-only streams (non-fragmented text)

    describe('Init-only streams (non-fragmented text)', function () {
        const initOnlyManifest = {
            start: { mpd: '<MPD/>', base_uri: 'https://example.com/' },
            streams: [{
                label: 'rep0',
                init: [{ range: '0-499' }, { range: '500-999', buffer: true }],
                data: []
            }]
        };

        beforeEach(function () {
            defenseController.addExtendedManifest(initOnlyManifest);
            override.updateDefendedStreamInfo(rep);
        });

        it('getInitRequest() advances through init cycles normally', function () {
            const r1 = override.getInitRequest({}, rep);
            expect(r1).to.exist; // jshint ignore:line
            expect(r1.full).to.be.false; // jshint ignore:line
            const r2 = override.getInitRequest({}, rep);
            expect(r2).to.exist; // jshint ignore:line
            expect(r2.full).to.be.true; // jshint ignore:line
        });

        it('getNextSegmentRequest() returns null without calling parent', function () {
            const result = override.getNextSegmentRequest({}, rep);
            expect(mockParent.getNextSegmentRequest.called).to.be.false; // jshint ignore:line
            expect(result).to.be.null; // jshint ignore:line
        });

        it('isLastSegmentRequested() returns false before getNextSegmentRequest() is called', function () {
            const result = override.isLastSegmentRequested(rep, NaN);
            expect(result).to.be.false; // jshint ignore:line
        });

        it('isLastSegmentRequested() returns true after getNextSegmentRequest() sets mediaHasFinished', function () {
            override.getNextSegmentRequest({}, rep);
            const result = override.isLastSegmentRequested(rep, NaN);
            expect(result).to.be.true; // jshint ignore:line
        });
    });

    // Audio streams

    describe('Audio streams', function () {
        function makeAudioRep() {
            return Object.assign({}, makeRepresentation(), {
                mediaInfo: { type: 'audio', streamInfo: { id: 'stream-1' } }
            });
        }

        it('defended audio stream: getNextSegmentRequest() returns cycle request without calling parent', function () {
            defenseController.addExtendedManifest(makeManifest());
            const audioRep = makeAudioRep();
            override.updateDefendedStreamInfo(audioRep);
            const request = override.getNextSegmentRequest({}, audioRep);
            expect(mockParent.getNextSegmentRequest.called).to.be.false; // jshint ignore:line
            expect(request).to.exist; // jshint ignore:line
            expect(request.index).to.equal(0);
        });

        it('defended audio stream: isLastSegmentRequested() returns false while cycles remain', function () {
            defenseController.addExtendedManifest(makeManifest());
            const audioRep = makeAudioRep();
            override.updateDefendedStreamInfo(audioRep);
            override.getNextSegmentRequest({}, audioRep); // cycle 0
            expect(override.isLastSegmentRequested(audioRep, NaN)).to.be.false; // jshint ignore:line
        });

        it('defended audio stream: isLastSegmentRequested() returns true after all cycles consumed', function () {
            defenseController.addExtendedManifest(makeManifest());
            const audioRep = makeAudioRep();
            override.updateDefendedStreamInfo(audioRep);
            override.getNextSegmentRequest({}, audioRep); // cycle 0
            override.getNextSegmentRequest({}, audioRep); // cycle 1
            override.getNextSegmentRequest({}, audioRep); // cycle 2 (padding)
            expect(override.isLastSegmentRequested(audioRep, NaN)).to.be.true; // jshint ignore:line
        });

        it('defended audio stream: getInitRequest() returns cycle request without calling parent', function () {
            defenseController.addExtendedManifest(makeManifest());
            const audioRep = makeAudioRep();
            override.updateDefendedStreamInfo(audioRep);
            const request = override.getInitRequest({}, audioRep);
            expect(mockParent.getInitRequest.called).to.be.false; // jshint ignore:line
            expect(request).to.exist; // jshint ignore:line
        });

        it('defended audio stream: getSegmentRequestForTime() returns cycle request without calling parent', function () {
            defenseController.addExtendedManifest(makeManifest());
            const audioRep = makeAudioRep();
            override.updateDefendedStreamInfo(audioRep);
            segmentsController.getSegmentByTime.callsFake((r, time) => makeSegment(r, Math.floor(time / 4)));
            const request = override.getSegmentRequestForTime({}, audioRep, 4);
            expect(mockParent.getSegmentRequestForTime.called).to.be.false; // jshint ignore:line
            expect(request).to.exist; // jshint ignore:line
            expect(request.index).to.equal(1);
        });

        it('audio stream with no defended stream info (no extended manifest loaded): getNextSegmentRequest() delegates to parent', function () {
            // No manifest in defenseController, updateDefendedStreamInfo returns false, fallback
            const settings = Settings(context).getInstance();
            settings.update({ dodge: { strictMode: false } });
            const audioRep = makeAudioRep();
            override.updateDefendedStreamInfo(audioRep);
            const result = override.getNextSegmentRequest({}, audioRep);
            expect(mockParent.getNextSegmentRequest.calledOnce).to.be.true; // jshint ignore:line
            expect(result).to.deep.equal({ parentNext: true });
            settings.update({ dodge: { strictMode: 'representation' } });
        });

        it('audio stream with no defended stream info (no extended manifest loaded): getInitRequest() delegates to parent', function () {
            const settings = Settings(context).getInstance();
            settings.update({ dodge: { strictMode: false } });
            const audioRep = makeAudioRep();
            override.updateDefendedStreamInfo(audioRep);
            const result = override.getInitRequest({}, audioRep);
            expect(mockParent.getInitRequest.calledOnce).to.be.true; // jshint ignore:line
            expect(result).to.deep.equal({ parentInit: true });
            settings.update({ dodge: { strictMode: 'representation' } });
        });
    });

    // Fragmented text streams

    describe('Fragmented text streams', function () {
        function makeFragmentedTextRep() {
            return Object.assign({}, makeRepresentation(), {
                mediaInfo: { type: 'text', streamInfo: { id: 'stream-1' } }
            });
        }

        const fragmentedTextManifest = {
            start: { mpd: '<MPD/>', base_uri: 'https://example.com/' },
            streams: [{
                label: 'rep0',
                init: [{ range: '0-855' }, { range: '856-1711', buffer: true }],
                data: [
                    { index: 0, buffer: false },
                    { index: 1, buffer: true },
                    { index: 2, padding: true },
                ]
            }]
        };

        it('defended fragmented text stream: getNextSegmentRequest() returns cycle request without calling parent', function () {
            defenseController.addExtendedManifest(fragmentedTextManifest);
            const textRep = makeFragmentedTextRep();
            override.updateDefendedStreamInfo(textRep);
            const request = override.getNextSegmentRequest({}, textRep);
            expect(mockParent.getNextSegmentRequest.called).to.be.false; // jshint ignore:line
            expect(request).to.exist; // jshint ignore:line
        });

        it('defended fragmented text stream: isLastSegmentRequested() returns false while cycles remain', function () {
            defenseController.addExtendedManifest(fragmentedTextManifest);
            const textRep = makeFragmentedTextRep();
            override.updateDefendedStreamInfo(textRep);
            override.getNextSegmentRequest({}, textRep); // cycle 0
            expect(override.isLastSegmentRequested(textRep, NaN)).to.be.false; // jshint ignore:line
        });

        it('defended fragmented text stream: isLastSegmentRequested() returns true after all cycles consumed', function () {
            defenseController.addExtendedManifest(fragmentedTextManifest);
            const textRep = makeFragmentedTextRep();
            override.updateDefendedStreamInfo(textRep);
            override.getNextSegmentRequest({}, textRep); // cycle 0
            override.getNextSegmentRequest({}, textRep); // cycle 1
            override.getNextSegmentRequest({}, textRep); // cycle 2 (padding)
            expect(override.isLastSegmentRequested(textRep, NaN)).to.be.true; // jshint ignore:line
        });

        it('defended fragmented text stream: getInitRequest() returns cycle request without calling parent', function () {
            defenseController.addExtendedManifest(fragmentedTextManifest);
            const textRep = makeFragmentedTextRep();
            override.updateDefendedStreamInfo(textRep);
            const request = override.getInitRequest({}, textRep);
            expect(mockParent.getInitRequest.called).to.be.false; // jshint ignore:line
            expect(request).to.exist; // jshint ignore:line
        });

        it('defended fragmented text stream: getSegmentRequestForTime() returns cycle request without calling parent', function () {
            defenseController.addExtendedManifest(fragmentedTextManifest);
            const textRep = makeFragmentedTextRep();
            override.updateDefendedStreamInfo(textRep);
            segmentsController.getSegmentByTime.callsFake((r, time) => makeSegment(r, Math.floor(time / 4)));
            const request = override.getSegmentRequestForTime({}, textRep, 4);
            expect(mockParent.getSegmentRequestForTime.called).to.be.false; // jshint ignore:line
            expect(request).to.exist; // jshint ignore:line
            expect(request.index).to.equal(1);
        });

        it('fragmented text stream with no defended stream info (no extended manifest): getNextSegmentRequest() delegates to parent', function () {
            const settings = Settings(context).getInstance();
            settings.update({ dodge: { strictMode: false } });
            const textRep = makeFragmentedTextRep();
            override.updateDefendedStreamInfo(textRep);
            const result = override.getNextSegmentRequest({}, textRep);
            expect(mockParent.getNextSegmentRequest.calledOnce).to.be.true; // jshint ignore:line
            expect(result).to.deep.equal({ parentNext: true });
            settings.update({ dodge: { strictMode: 'representation' } });
        });

        it('fragmented text stream with no defended stream info (no extended manifest): getInitRequest() delegates to parent', function () {
            const settings = Settings(context).getInstance();
            settings.update({ dodge: { strictMode: false } });
            const textRep = makeFragmentedTextRep();
            override.updateDefendedStreamInfo(textRep);
            const result = override.getInitRequest({}, textRep);
            expect(mockParent.getInitRequest.calledOnce).to.be.true; // jshint ignore:line
            expect(result).to.deep.equal({ parentInit: true });
            settings.update({ dodge: { strictMode: 'representation' } });
        });
    });

    // Muxed audio/video streams

    describe('Muxed audio/video streams', function () {
        function makeMuxedRep() {
            return Object.assign({}, makeRepresentation(), {
                mediaInfo: { type: 'muxed', streamInfo: { id: 'stream-1' } }
            });
        }

        it('defended muxed stream: getNextSegmentRequest() returns cycle request without calling parent', function () {
            defenseController.addExtendedManifest(makeManifest());
            const muxedRep = makeMuxedRep();
            override.updateDefendedStreamInfo(muxedRep);
            const request = override.getNextSegmentRequest({}, muxedRep);
            expect(mockParent.getNextSegmentRequest.called).to.be.false; // jshint ignore:line
            expect(request).to.exist; // jshint ignore:line
            expect(request.index).to.equal(0);
        });

        it('defended muxed stream: getInitRequest() returns cycle request without calling parent', function () {
            defenseController.addExtendedManifest(makeManifest());
            const muxedRep = makeMuxedRep();
            override.updateDefendedStreamInfo(muxedRep);
            const request = override.getInitRequest({}, muxedRep);
            expect(mockParent.getInitRequest.called).to.be.false; // jshint ignore:line
            expect(request).to.exist; // jshint ignore:line
        });
    });

    // getNextSegmentRequestIdempotent during defended playback

    describe('getNextSegmentRequestIdempotent during defended playback', function () {

        // mockParent.getNextSegmentRequestIdempotent is set up in the outer beforeEach.

        it('with no defended stream, delegates to parent', function () {
            // No manifest loaded; updateDefendedStreamInfo was not called.
            const result = override.getNextSegmentRequestIdempotent({}, rep);
            expect(mockParent.getNextSegmentRequestIdempotent.calledOnce).to.be.true; // jshint ignore:line
            expect(result).to.deep.equal({ idempotent: true });
        });

        it('with defended stream, returns null to suppress CMCD nor/nrr leak', function () {
            defenseController.addExtendedManifest(makeManifest());
            override.updateDefendedStreamInfo(rep);
            override.getNextSegmentRequest({}, rep); // cycle 0

            const result = override.getNextSegmentRequestIdempotent({}, rep);
            expect(mockParent.getNextSegmentRequestIdempotent.called).to.be.false; // jshint ignore:line
            expect(result).to.be.null; // jshint ignore:line
        });

        it('with defended stream, returns null consistently across multiple calls', function () {
            defenseController.addExtendedManifest(makeManifest());
            override.updateDefendedStreamInfo(rep);
            override.getNextSegmentRequest({}, rep); // cycle 0

            for (let i = 0; i < 5; i++) {
                expect(override.getNextSegmentRequestIdempotent({}, rep)).to.be.null; // jshint ignore:line
            }
            expect(mockParent.getNextSegmentRequestIdempotent.called).to.be.false; // jshint ignore:line
        });

        it('transitions from defended to undefended after reset restore parent delegation', function () {
            const settings = Settings(context).getInstance();
            settings.update({ dodge: { strictMode: false } });

            defenseController.addExtendedManifest(makeManifest());
            override.updateDefendedStreamInfo(rep);
            override.getNextSegmentRequest({}, rep);
            expect(override.getNextSegmentRequestIdempotent({}, rep)).to.be.null; // jshint ignore:line

            override.resetInitialSettings();
            const result = override.getNextSegmentRequestIdempotent({}, rep);
            expect(mockParent.getNextSegmentRequestIdempotent.calledOnce).to.be.true; // jshint ignore:line
            expect(result).to.deep.equal({ idempotent: true });

            settings.update({ dodge: { strictMode: 'representation' } });
        });
    });

    // getSegmentRequestForTime during trailing phase

    describe('getSegmentRequestForTime during trailing phase', function () {
        let trailingOverride, timeSinceStreamEndStub;

        beforeEach(function () {
            timeSinceStreamEndStub = sinon.stub().returns(1); // stream has ended

            trailingOverride = DodgeDashHandlerOverride.call(
                { context, parent: mockParent, factory: {} },
                {
                    adapter: { getVoRepresentations: sinon.stub().returns([]) },
                    debug: Debug(context).getInstance(),
                    urlUtils: URLUtils(context).getInstance(),
                    segmentsController: {
                        getSegmentByIndex: sinon.stub().callsFake((r, idx) => makeSegment(r, idx)),
                        getSegmentByTime: sinon.stub().callsFake((r, time) => makeSegment(r, Math.floor(time / 4))),
                    },
                    baseURLController: objectsHelper.getDummyBaseURLController(),
                    timelineConverter: objectsHelper.getDummyTimelineConverter(),
                    playbackController: {
                        getTimeSinceStreamEnd: timeSinceStreamEndStub,
                        getStreamEndTime: sinon.stub().returns(100),
                    },
                }
            );

            defenseController.addExtendedManifest(makeManifest());
            trailingOverride.updateDefendedStreamInfo(rep);

            // Advance to trailing: maxNoPad = 1, consume cycles 0 and 1.
            trailingOverride.getNextSegmentRequest({}, rep); // cycle 0, lastCycleIndex = 0
            trailingOverride.getNextSegmentRequest({}, rep); // cycle 1, lastCycleIndex = 1 = maxNoPad, trailing
        });

        it('seek near stream end during trailing returns next padding cycle, not vanilla parent request', function () {
            // timeSinceStreamEnd > 0 AND streamEndTime(100) - time(97) = 3 < segmentDuration(4)
            // routes to getNextSegmentRequest, which advances to cycle 2 (padding)
            const request = trailingOverride.getSegmentRequestForTime({}, rep, 97);
            expect(request).to.exist; // jshint ignore:line
            expect(request.padding).to.be.true; // jshint ignore:line
            expect(mockParent.getSegmentRequestForTime.called).to.be.false; // jshint ignore:line
        });
    });

    // getLastSegment during defended playback

    describe('getLastSegment during defended playback', function () {

        it('before any cycles consumed, returns null', function () {
            defenseController.addExtendedManifest(makeManifest());
            override.updateDefendedStreamInfo(rep);
            expect(override.getLastSegment()).to.be.null; // jshint ignore:line
        });

        it('after non-padding cycle, returns that cycle\'s segment', function () {
            defenseController.addExtendedManifest(makeManifest());
            override.updateDefendedStreamInfo(rep);
            override.getNextSegmentRequest({}, rep); // cycle 0, non-padding, index 0
            const segment = override.getLastSegment();
            expect(segment).to.exist; // jshint ignore:line
            expect(segment.index).to.equal(0);
        });

        it('after padding cycle, returns the last non-padding segment', function () {
            defenseController.addExtendedManifest(makeManifest());
            override.updateDefendedStreamInfo(rep);
            override.getNextSegmentRequest({}, rep); // cycle 0, non-padding, index 0
            override.getNextSegmentRequest({}, rep); // cycle 1, non-padding, index 1
            override.getNextSegmentRequest({}, rep); // cycle 2, padding, index 2
            const segment = override.getLastSegment();
            expect(segment).to.exist; // jshint ignore:line
            expect(segment.index).to.equal(1); // padding cycles don't update lastSegment
        });
    });

    // Multi-period support

    describe('Multi-period support', function () {

        it('updateDefendedStreamInfo resolves correct stream for each period', function () {
            const manifest = {
                start: { mpd: '<MPD/>', base_uri: 'https://example.com/' },
                streams: [
                    { label: 'rep0', period: 0, init: [{}], data: [{ index: 0, buffer: true }] },
                    { label: 'rep0', period: 1, init: [{}], data: [{ index: 5, buffer: true }] },
                ]
            };
            defenseController.addExtendedManifest(manifest);

            // Period 0 representation.
            const repP0 = makeRepresentation();
            repP0.adaptation.period.index = 0;
            override.updateDefendedStreamInfo(repP0);
            const r0 = override.getNextSegmentRequest({}, repP0);
            expect(r0).to.exist; // jshint ignore:line
            expect(r0.index).to.equal(0); // from period 0 stream data

            // Period 1 representation (same label, different period).
            // In dash.js, each period gets its own DashHandler instance;
            // simulate by resetting cycle state.
            override.resetInitialSettings();
            const repP1 = makeRepresentation();
            repP1.adaptation.period.index = 1;
            override.updateDefendedStreamInfo(repP1);
            const r1 = override.getNextSegmentRequest({}, repP1);
            expect(r1).to.exist; // jshint ignore:line
            expect(r1.index).to.equal(5); // from period 1 stream data
        });

        it('updateDefendedStreamInfo returns false for unmatched period', function () {
            const manifest = {
                start: { mpd: '<MPD/>', base_uri: 'https://example.com/' },
                streams: [
                    { label: 'rep0', period: 0, init: [{}], data: [{ index: 0, buffer: true }] },
                ]
            };
            defenseController.addExtendedManifest(manifest);

            const repP5 = makeRepresentation();
            repP5.adaptation.period.index = 5;
            const result = override.updateDefendedStreamInfo(repP5);
            expect(result).to.be.false; // jshint ignore:line
        });

        it('stream without period field matches any period', function () {
            defenseController.addExtendedManifest(makeManifest()); // no period field
            const repP3 = makeRepresentation();
            repP3.adaptation.period.index = 3;
            const result = override.updateDefendedStreamInfo(repP3);
            expect(result).to.be.true; // jshint ignore:line
        });
    });

    // ABR home representation switch resets cycle counters

    describe('ABR home representation switch', function () {

        it('preserves cycle counters across same-label re-queries', function () {
            defenseController.addExtendedManifest({
                start: { mpd: '<MPD/>', base_uri: 'https://example.com/' },
                streams: [{ label: 'rep0', init: [{ buffer: true }], data: [{ index: 0, buffer: true }, { index: 1, buffer: true }] }]
            });
            const rep = makeRepresentation();
            override.updateDefendedStreamInfo(rep);
            override.getNextSegmentRequest({}, rep); // lastCycleIndex -> 0

            override.updateDefendedStreamInfo(rep); // same label, no reset
            const next = override.getNextSegmentRequest({}, rep);
            expect(next.index).to.equal(1); // advances, does not restart
        });

        it('resets cycle counters when the representation label changes', function () {
            defenseController.addExtendedManifest({
                start: { mpd: '<MPD/>', base_uri: 'https://example.com/' },
                streams: [
                    { label: 'rep_low', init: [{ buffer: true }], data: [{ index: 0, buffer: true }, { index: 1, buffer: true }] },
                    { label: 'rep_high', init: [{ buffer: true }], data: [{ index: 0, buffer: true }, { index: 1, buffer: true }] }
                ]
            });
            const repLow = makeRepresentation();
            repLow.id = 'rep_low';
            override.updateDefendedStreamInfo(repLow);
            override.getNextSegmentRequest({}, repLow); // lastCycleIndex -> 0

            const repHigh = makeRepresentation();
            repHigh.id = 'rep_high';
            override.updateDefendedStreamInfo(repHigh); // label changed, reset
            const next = override.getNextSegmentRequest({}, repHigh);
            expect(next.index).to.equal(0); // restarted from cycle 0
        });
    });

    // SegmentBase / byte-range content (WebM, single-file MP4)

    describe('SegmentBase (byte-range) content', function () {

        let segBaseRep, segBaseOverride, segBaseSegmentsController;

        function makeSegmentBaseSegment(rep, index) {
            return {
                index,
                media: null, // SegmentBase: no per-segment URL
                presentationStartTime: index * 4,
                duration: 4,
                representation: rep,
                replacementNumber: index,
                replacementTime: 0,
                mediaRange: (index * 100000) + '-' + ((index + 1) * 100000 - 1), // byte range in monolithic file
                availabilityStartTime: 0,
                availabilityEndTime: Infinity,
                wallStartTime: 0,
                mediaStartTime: 0,
                replacements: null
            };
        }

        function makeSegmentBaseRepresentation() {
            return {
                id: 'rep0',
                index: 0,
                bandwidth: 1000000,
                initialization: null, // SegmentBase: init comes from BaseURL + range
                segmentInfoType: 'SegmentBase',
                segmentDuration: 4,
                timescale: 1,
                range: '0-855', // init segment byte range
                path: '',
                mediaInfo: { type: 'video', streamInfo: { id: 'stream-1' } },
                adaptation: {
                    index: 0,
                    period: { index: 0, start: 0, duration: 100 }
                }
            };
        }

        function makeSegmentBaseManifest() {
            return {
                start: { mpd: '<MPD/>', base_uri: 'https://example.com/' },
                streams: [{
                    label: 'rep0',
                    init: [{ range: '0-400' }, { range: '401-855' }],
                    data: [
                        { index: 0, buffer: false },
                        { index: 1, buffer: true },
                        { index: 2, padding: true },
                    ]
                }]
            };
        }

        beforeEach(function () {
            segBaseRep = makeSegmentBaseRepresentation();

            segBaseSegmentsController = {
                getSegmentByIndex: sinon.stub().callsFake((r, idx) => makeSegmentBaseSegment(r, idx)),
                getSegmentByTime: sinon.stub().callsFake((r, time) => {
                    const idx = Math.floor(time / 4);
                    return makeSegmentBaseSegment(r, idx);
                }),
            };

            const segBaseURLController = {
                resolve: () => ({
                    url: 'https://example.com/video.webm',
                    serviceLocation: 'example.com',
                    queryParams: {}
                })
            };

            segBaseOverride = DodgeDashHandlerOverride.call(
                { context, parent: mockParent, factory: {} },
                {
                    adapter,
                    debug: Debug(context).getInstance(),
                    urlUtils: URLUtils(context).getInstance(),
                    segmentsController: segBaseSegmentsController,
                    baseURLController: segBaseURLController,
                    timelineConverter: objectsHelper.getDummyTimelineConverter(),
                    playbackController: {
                        getTimeSinceStreamEnd: sinon.stub().returns(0),
                        getStreamEndTime: sinon.stub().returns(100),
                    },
                }
            );
        });

        it('getInitRequest() resolves URL from BaseURL when initialization is null', function () {
            defenseController.addExtendedManifest(makeSegmentBaseManifest());
            segBaseOverride.updateDefendedStreamInfo(segBaseRep);
            const request = segBaseOverride.getInitRequest({}, segBaseRep);
            expect(request).to.exist; // jshint ignore:line
            expect(request.url).to.equal('https://example.com/video.webm');
            expect(request.range).to.equal('0-400');
            expect(request.partial).to.be.true; // jshint ignore:line
            expect(request.originalRange).to.equal('0-855');
        });

        it('getInitRequest() full init cycle uses representation.range when no explicit range', function () {
            const manifest = makeSegmentBaseManifest();
            manifest.streams[0].init = [{}]; // single init cycle, no range
            defenseController.addExtendedManifest(manifest);
            segBaseOverride.updateDefendedStreamInfo(segBaseRep);
            const request = segBaseOverride.getInitRequest({}, segBaseRep);
            expect(request).to.exist; // jshint ignore:line
            expect(request.range).to.equal('0-855'); // falls back to representation.range
            expect(request.partial).to.be.false; // jshint ignore:line
            expect(request.full).to.be.true; // jshint ignore:line
        });

        it('getNextSegmentRequest() produces correct URL and byte range for SegmentBase', function () {
            defenseController.addExtendedManifest(makeSegmentBaseManifest());
            segBaseOverride.updateDefendedStreamInfo(segBaseRep);
            // Consume init cycles first.
            segBaseOverride.getInitRequest({}, segBaseRep);
            segBaseOverride.getInitRequest({}, segBaseRep);
            // First data cycle.
            const request = segBaseOverride.getNextSegmentRequest({}, segBaseRep);
            expect(request).to.exist; // jshint ignore:line
            expect(request.url).to.equal('https://example.com/video.webm');
            // No cycle.range override, so uses segment.mediaRange.
            expect(request.range).to.equal('0-99999');
            expect(request.originalRange).to.equal('0-99999');
            expect(request.partial).to.be.false; // jshint ignore:line
        });

        it('getNextSegmentRequest() with cycle.range overrides segment.mediaRange', function () {
            const manifest = makeSegmentBaseManifest();
            manifest.streams[0].data[0] = { index: 0, range: '0-50000', buffer: false };
            defenseController.addExtendedManifest(manifest);
            segBaseOverride.updateDefendedStreamInfo(segBaseRep);
            segBaseOverride.getInitRequest({}, segBaseRep);
            segBaseOverride.getInitRequest({}, segBaseRep);
            const request = segBaseOverride.getNextSegmentRequest({}, segBaseRep);
            expect(request).to.exist; // jshint ignore:line
            expect(request.range).to.equal('0-50000');
            expect(request.originalRange).to.equal('0-99999');
            expect(request.partial).to.be.true; // jshint ignore:line
        });

        it('getNextSegmentRequest() URL has padding query parameter', function () {
            defenseController.addExtendedManifest(makeSegmentBaseManifest());
            segBaseOverride.updateDefendedStreamInfo(segBaseRep);
            segBaseOverride.getInitRequest({}, segBaseRep);
            segBaseOverride.getInitRequest({}, segBaseRep);
            const request = segBaseOverride.getNextSegmentRequest({}, segBaseRep);
            expect(request).to.exist; // jshint ignore:line
            expect(request.queryParams).to.have.property('padding');
            expect(request.queryParams.padding).to.be.a('string');
            expect(request.queryParams.padding.length).to.be.greaterThan(0);
        });

        it('getSegmentRequestForTime() works with SegmentBase segments', function () {
            defenseController.addExtendedManifest(makeSegmentBaseManifest());
            segBaseOverride.updateDefendedStreamInfo(segBaseRep);
            const request = segBaseOverride.getSegmentRequestForTime({}, segBaseRep, 0);
            expect(request).to.exist; // jshint ignore:line
            expect(request.url).to.equal('https://example.com/video.webm');
            expect(request.range).to.equal('0-99999');
        });

        it('getNextSegmentRequest() sets full/buffer/trail flags correctly for SegmentBase', function () {
            defenseController.addExtendedManifest(makeSegmentBaseManifest());
            segBaseOverride.updateDefendedStreamInfo(segBaseRep);
            segBaseOverride.getInitRequest({}, segBaseRep);
            segBaseOverride.getInitRequest({}, segBaseRep);
            const r0 = segBaseOverride.getNextSegmentRequest({}, segBaseRep); // cycle 0
            expect(r0.full).to.be.true; // jshint ignore:line
            expect(r0.buffer).to.be.false; // jshint ignore:line
            expect(r0.trail).to.be.false; // jshint ignore:line
            const r1 = segBaseOverride.getNextSegmentRequest({}, segBaseRep); // cycle 1
            expect(r1.full).to.be.true; // jshint ignore:line
            expect(r1.buffer).to.be.true; // jshint ignore:line
            expect(r1.trail).to.be.false; // jshint ignore:line
            const r2 = segBaseOverride.getNextSegmentRequest({}, segBaseRep); // cycle 2, trailing
            expect(r2.trail).to.be.true; // jshint ignore:line
            expect(r2.padding).to.be.true; // jshint ignore:line
        });

        it('fallback to parent when no defense is active on SegmentBase representation', function () {
            // No extended manifest loaded.
            const result = segBaseOverride.getNextSegmentRequest({}, segBaseRep);
            expect(mockParent.getNextSegmentRequest.calledOnce).to.be.true; // jshint ignore:line
            expect(result).to.deep.equal({ parentNext: true });
        });
    });

    describe('_generateInitRequest construction', function () {

        it('SegmentTemplate init: request has correct type, mediaType, and representation', function () {
            defenseController.addExtendedManifest({
                start: { mpd: '<MPD/>', base_uri: 'https://example.com/' },
                streams: [{
                    label: 'rep0',
                    init: [{ range: '0-855', buffer: true }],
                    data: [{ index: 0, buffer: true }]
                }]
            });
            override.updateDefendedStreamInfo(rep);

            const request = override.getInitRequest({}, rep);
            expect(request).to.exist; // jshint ignore:line
            expect(request.type).to.equal('InitializationSegment');
            expect(request.mediaType).to.equal('video');
            expect(request.representation.id).to.equal('rep0');
        });

        it('init cycle with range override: sets request.range and partial = true', function () {
            defenseController.addExtendedManifest({
                start: { mpd: '<MPD/>', base_uri: 'https://example.com/' },
                streams: [{
                    label: 'rep0',
                    init: [{ range: '100-200', buffer: true }],
                    data: [{ index: 0, buffer: true }]
                }]
            });
            override.updateDefendedStreamInfo(rep);

            const request = override.getInitRequest({}, rep);
            expect(request.range).to.equal('100-200');
            expect(request.partial).to.be.true; // jshint ignore:line
        });

        it('init cycle without range: uses representation.range and partial = false', function () {
            defenseController.addExtendedManifest({
                start: { mpd: '<MPD/>', base_uri: 'https://example.com/' },
                streams: [{
                    label: 'rep0',
                    init: [{ buffer: true }],
                    data: [{ index: 0, buffer: true }]
                }]
            });
            override.updateDefendedStreamInfo(rep);

            const request = override.getInitRequest({}, rep);
            expect(request.range).to.equal(rep.range); // null for SegmentTemplate
            expect(request.partial).to.be.false; // jshint ignore:line
        });

        it('SegmentBase init (initialization = null): still returns a valid request', function () {
            const segBaseRep = Object.assign({}, rep, {
                initialization: null,
                segmentInfoType: 'SegmentBase',
                range: '0-855',
            });

            const segBaseURLController = {
                resolve: () => ({ url: 'https://example.com/video.webm', serviceLocation: 'example.com', queryParams: {} })
            };
            const segBaseOverride = DodgeDashHandlerOverride.call(
                { context, parent: mockParent, factory: {} },
                {
                    adapter,
                    debug: Debug(context).getInstance(),
                    urlUtils: URLUtils(context).getInstance(),
                    segmentsController,
                    baseURLController: segBaseURLController,
                    timelineConverter: objectsHelper.getDummyTimelineConverter(),
                    playbackController: { getTimeSinceStreamEnd: sinon.stub().returns(0), getStreamEndTime: sinon.stub().returns(100) },
                }
            );

            defenseController.addExtendedManifest({
                start: { mpd: '<MPD/>', base_uri: 'https://example.com/' },
                streams: [{
                    label: 'rep0',
                    init: [{ range: '0-855', buffer: true }],
                    data: [{ index: 0, buffer: true }]
                }]
            });
            segBaseOverride.updateDefendedStreamInfo(segBaseRep);

            const request = segBaseOverride.getInitRequest({}, segBaseRep);
            expect(request).to.exist; // jshint ignore:line
            expect(request.type).to.equal('InitializationSegment');
        });

        it('init cycle with padding flag: sets request.padding = true', function () {
            defenseController.addExtendedManifest({
                start: { mpd: '<MPD/>', base_uri: 'https://example.com/' },
                streams: [{
                    label: 'rep0',
                    init: [
                        { range: '0-855', padding: true },
                        { buffer: true }
                    ],
                    data: [{ index: 0, buffer: true }]
                }]
            });
            override.updateDefendedStreamInfo(rep);

            const request = override.getInitRequest({}, rep);
            expect(request.padding).to.be.true; // jshint ignore:line
        });
    });

    describe('_getRequestForSegment construction', function () {

        it('data request has correct type and mediaType', function () {
            defenseController.addExtendedManifest(makeManifest());
            override.updateDefendedStreamInfo(rep);

            const request = override.getNextSegmentRequest({}, rep); // cycle 0
            expect(request).to.exist; // jshint ignore:line
            expect(request.type).to.equal('MediaSegment');
            expect(request.mediaType).to.equal('video');
        });

        it('null segment returns null', function () {
            segmentsController.getSegmentByIndex.returns(null);
            defenseController.addExtendedManifest(makeManifest());
            override.updateDefendedStreamInfo(rep);

            const request = override.getNextSegmentRequest({}, rep);
            expect(request).to.be.null; // jshint ignore:line
        });

        it('SegmentBase data request (segment.media = null): still returns valid request', function () {
            const segBaseRep = Object.assign({}, rep, {
                initialization: null,
                segmentInfoType: 'SegmentBase',
                range: '0-855',
            });

            const segBaseURLController = {
                resolve: () => ({ url: 'https://example.com/video.webm', serviceLocation: 'example.com', queryParams: {} })
            };
            const segBaseSegCtrl = {
                getSegmentByIndex: sinon.stub().callsFake((r, idx) => ({
                    index: idx,
                    media: null,
                    presentationStartTime: idx * 4,
                    duration: 4,
                    representation: r,
                    replacementNumber: idx,
                    replacementTime: 0,
                    mediaRange: '856-999',
                    availabilityStartTime: 0,
                    availabilityEndTime: Infinity,
                    wallStartTime: 0,
                    mediaStartTime: 0,
                    replacements: null,
                })),
                getSegmentByTime: sinon.stub().returns(null),
            };
            const segBaseOverride = DodgeDashHandlerOverride.call(
                { context, parent: mockParent, factory: {} },
                {
                    adapter,
                    debug: Debug(context).getInstance(),
                    urlUtils: URLUtils(context).getInstance(),
                    segmentsController: segBaseSegCtrl,
                    baseURLController: segBaseURLController,
                    timelineConverter: objectsHelper.getDummyTimelineConverter(),
                    playbackController: { getTimeSinceStreamEnd: sinon.stub().returns(0), getStreamEndTime: sinon.stub().returns(100) },
                }
            );

            defenseController.addExtendedManifest({
                start: { mpd: '<MPD/>', base_uri: 'https://example.com/' },
                streams: [{
                    label: 'rep0',
                    init: [{ range: '0-855', buffer: true }],
                    data: [{ index: 0, buffer: true }]
                }]
            });
            segBaseOverride.updateDefendedStreamInfo(segBaseRep);

            const request = segBaseOverride.getNextSegmentRequest({}, segBaseRep);
            expect(request).to.exist; // jshint ignore:line
            expect(request.type).to.equal('MediaSegment');
        });

        it('homeRepresentation provided: sets homeRepresentationId on request', function () {
            const siblings = [
                Object.assign({}, rep, { id: 'rep_low', bandwidth: 250000, initialization: 'https://example.com/init_low.m4s', mediaInfo: rep.mediaInfo, adaptation: rep.adaptation }),
                rep
            ];
            adapter.getVoRepresentations.withArgs(rep.mediaInfo).returns(siblings);

            defenseController.addExtendedManifest({
                start: { mpd: '<MPD/>', base_uri: 'https://example.com/' },
                streams: [{
                    label: 'rep0',
                    init: [{ range: '0-855', buffer: true }],
                    data: [{ index: 0, quality: 'rep_low', buffer: true }]
                }]
            });
            override.updateDefendedStreamInfo(rep);

            const request = override.getNextSegmentRequest({}, rep);
            expect(request).to.exist; // jshint ignore:line
            expect(request.homeRepresentationId).to.equal('rep0');
        });

        it('no homeRepresentation: homeRepresentationId not set', function () {
            defenseController.addExtendedManifest(makeManifest());
            override.updateDefendedStreamInfo(rep);

            const request = override.getNextSegmentRequest({}, rep);
            expect(request).to.exist; // jshint ignore:line
            expect(request.homeRepresentationId).to.be.undefined; // jshint ignore:line
        });

        it('data request with range override: sets range and partial = true', function () {
            defenseController.addExtendedManifest({
                start: { mpd: '<MPD/>', base_uri: 'https://example.com/' },
                streams: [{
                    label: 'rep0',
                    init: [{ range: '0-855', buffer: true }],
                    data: [{ index: 0, range: '100-200', buffer: true }]
                }]
            });
            override.updateDefendedStreamInfo(rep);

            const request = override.getNextSegmentRequest({}, rep);
            expect(request.range).to.equal('100-200');
            expect(request.partial).to.be.true; // jshint ignore:line
        });
    });
});
