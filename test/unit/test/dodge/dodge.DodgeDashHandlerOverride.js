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
            init: [{ range: '0-855' }, { range: '856-1711' }],
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

    let context, defenseController, override, mockParent, segmentsController, rep;

    beforeEach(function () {
        context = {};
        defenseController = DefenseRegistry(context).getInstance();
        defenseController.reset();

        rep = makeRepresentation();

        mockParent = {
            getInitRequest: sinon.stub().returns({ parentInit: true }),
            getNextSegmentRequest: sinon.stub().returns({ parentNext: true }),
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

        override = DodgeDashHandlerOverride.call(
            { context, parent: mockParent, factory: {} },
            {
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

        it('resetInitialSettings() clears state; with strictMode=false, subsequent getInitRequest() falls back to parent', function () {
            // Explicitly disable strict mode so fallback-to-parent behavior is exercised.
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

        it('with extended manifest loaded and known label, defense still works normally', function () {
            defenseController.addExtendedManifest(makeManifest());
            override.updateDefendedStreamInfo(rep);
            const request = override.getInitRequest({}, rep);
            expect(mockParent.getInitRequest.called).to.be.false; // jshint ignore:line
            expect(request).to.exist; // jshint ignore:line
        });
    });
});
