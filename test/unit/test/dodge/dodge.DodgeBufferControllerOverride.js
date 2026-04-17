import DodgeBufferControllerOverride from '../../../../src/dodge/overrides/DodgeBufferControllerOverride.js';
import Debug from '../../../../src/core/Debug.js';
import EventBus from '../../../../src/core/EventBus.js';
import Settings from '../../../../src/core/Settings.js';
import MediaPlayerEvents from '../../../../src/streaming/MediaPlayerEvents.js';

import sinon from 'sinon';
import { expect } from 'chai';

// ************************************************************************
// TESTS
// ************************************************************************

describe('DodgeBufferControllerOverride', function () {
    let context, override, mockParent, dashHandler, playbackController, capabilities;

    beforeEach(function () {
        context = {};

        // Debug must be present because the override calls Debug(context).getInstance()
        Debug(context).getInstance();

        mockParent = {
            setMockBuffer: sinon.stub(),
            updateBufferLevel: sinon.stub(),
            resetInitialSettings: sinon.stub(),
            _onInitFragmentLoaded: sinon.stub(),
            _onMediaFragmentLoaded: sinon.stub(),
            appendToBuffer: sinon.stub(),
            appendToBufferAndWait: sinon.stub().resolves(),
            changeType: sinon.stub().resolves(),
            prepareForDefaultQualitySwitch: sinon.stub().resolves(),
            getInitChunkFromCache: sinon.stub().returns(null),
            getType: sinon.stub().returns('video'),
        };

        dashHandler = {
            getIsTrailing: sinon.stub().returns(false),
        };

        playbackController = {
            getTimeSinceStreamEnd: sinon.stub().returns(0),
        };

        capabilities = {
            supportsChangeType: sinon.stub().returns(true),
        };

        override = DodgeBufferControllerOverride.call(
            { context, parent: mockParent, factory: {} },
            { dashHandler, playbackController, capabilities }
        );
    });

    // onBufferCycleLoaded

    describe('onBufferCycleLoaded', function () {

        it('increments mockBuffer by (segmentDuration - actualDuration) and syncs to parent', function () {
            override.onBufferCycleLoaded({ representation: { segmentDuration: 4 }, actualDuration: 3.97 });
            expect(mockParent.setMockBuffer.calledOnce).to.be.true; // jshint ignore:line
            expect(mockParent.setMockBuffer.firstCall.args[0]).to.be.closeTo(0.03, 1e-9);
        });

        it('can produce a negative mockBuffer when actualDuration exceeds segmentDuration', function () {
            override.onBufferCycleLoaded({ representation: { segmentDuration: 4 }, actualDuration: 4.03 });
            expect(mockParent.setMockBuffer.firstCall.args[0]).to.be.closeTo(-0.03, 1e-9);
        });

        it('accumulates across multiple calls', function () {
            override.onBufferCycleLoaded({ representation: { segmentDuration: 4 }, actualDuration: 3.97 });
            override.onBufferCycleLoaded({ representation: { segmentDuration: 4 }, actualDuration: 3.97 });
            expect(mockParent.setMockBuffer.lastCall.args[0]).to.be.closeTo(0.06, 1e-9);
        });

    });

    // onPaddingLoaded

    describe('onPaddingLoaded', function () {

        it('e.trail = false, does not call parent.setMockBuffer()', function () {
            override.onPaddingLoaded({ trail: false, buffer: false, representation: { segmentDuration: 4 } });
            expect(mockParent.setMockBuffer.called).to.be.false; // jshint ignore:line
        });

        it('e.trail = true, e.buffer = false, does not increment mockBuffer', function () {
            override.onPaddingLoaded({ trail: true, buffer: false, representation: { segmentDuration: 4 } });
            expect(mockParent.setMockBuffer.called).to.be.false; // jshint ignore:line
        });

        it('e.trail = true, e.buffer = true, increments mockBuffer by segmentDuration and syncs to parent', function () {
            override.onPaddingLoaded({ trail: true, buffer: true, representation: { segmentDuration: 4 } });
            expect(mockParent.setMockBuffer.calledOnceWith(4)).to.be.true; // jshint ignore:line
        });

        it('accumulates mockBuffer across calls', function () {
            override.onPaddingLoaded({ trail: true, buffer: true, representation: { segmentDuration: 4 } });
            override.onPaddingLoaded({ trail: true, buffer: true, representation: { segmentDuration: 4 } });
            expect(mockParent.setMockBuffer.lastCall.args[0]).to.equal(8);
        });

        it('trailing padding cycle where pending real segments were flushed (e.buffer = false due to secondary events): mock buffer is NOT incremented', function () {
            override.onPaddingLoaded({ trail: true, buffer: false, representation: { segmentDuration: 4 } });
            expect(mockParent.setMockBuffer.called).to.be.false; // jshint ignore:line
        });

        it('e.trail = false with non-zero lastTimeSinceStreamEnd, resets mockBuffer to 0', function () {
            // Build up trailing state via updateBufferLevel
            dashHandler.getIsTrailing.returns(true);
            playbackController.getTimeSinceStreamEnd.returns(5);
            override.updateBufferLevel(); // advances lastTimeSinceStreamEnd to 5
            mockParent.setMockBuffer.reset();

            // A non-trailing padding cycle should now trigger the reset
            override.onPaddingLoaded({ trail: false, buffer: false, representation: { segmentDuration: 4 } });
            expect(mockParent.setMockBuffer.calledOnceWith(0)).to.be.true; // jshint ignore:line
        });
    });

    // updateBufferLevel

    describe('updateBufferLevel', function () {

        it('when not trailing, delegates to parent.updateBufferLevel()', function () {
            dashHandler.getIsTrailing.returns(false);
            override.updateBufferLevel();
            expect(mockParent.setMockBuffer.called).to.be.false; // jshint ignore:line
            expect(mockParent.updateBufferLevel.calledOnce).to.be.true; // jshint ignore:line
        });

        it('when trailing, decrements mockBuffer by elapsed time and syncs to parent', function () {
            // Load 8s into mockBuffer via two trailing padding events
            override.onPaddingLoaded({ trail: true, buffer: true, representation: { segmentDuration: 4 } });
            override.onPaddingLoaded({ trail: true, buffer: true, representation: { segmentDuration: 4 } });
            mockParent.setMockBuffer.reset();

            dashHandler.getIsTrailing.returns(true);
            playbackController.getTimeSinceStreamEnd.returns(3);
            override.updateBufferLevel(); // diffInTime = 3; currentMockBuffer = 8 - 3 = 5

            expect(mockParent.setMockBuffer.calledOnceWith(5)).to.be.true; // jshint ignore:line
            expect(mockParent.updateBufferLevel.calledOnce).to.be.true; // jshint ignore:line
        });

        it('when trailing, clamps mockBuffer to 0 when elapsed time exceeds accumulated value', function () {
            override.onPaddingLoaded({ trail: true, buffer: true, representation: { segmentDuration: 4 } });
            mockParent.setMockBuffer.reset();

            dashHandler.getIsTrailing.returns(true);
            playbackController.getTimeSinceStreamEnd.returns(10); // more than the 4s in mockBuffer
            override.updateBufferLevel();

            expect(mockParent.setMockBuffer.calledOnceWith(0)).to.be.true; // jshint ignore:line
        });
    });

    // resetInitialSettings

    describe('resetInitialSettings', function () {

        it('resets internal state and delegates to parent.resetInitialSettings()', function () {
            // Add some state first
            override.onPaddingLoaded({ trail: true, buffer: true, representation: { segmentDuration: 4 } });
            mockParent.setMockBuffer.reset();

            override.resetInitialSettings(false, false);

            expect(mockParent.resetInitialSettings.calledOnceWith(false, false)).to.be.true; // jshint ignore:line
            // After reset, a non-trailing updateBufferLevel should not call setMockBuffer
            dashHandler.getIsTrailing.returns(false);
            override.updateBufferLevel();
            expect(mockParent.setMockBuffer.called).to.be.false; // jshint ignore:line
        });
    });

    // _onMediaFragmentLoaded (init sandwich for quality overrides)

    describe('_onMediaFragmentLoaded', function () {

        it('delegates to parent for non-override chunks', async function () {
            const e = {
                chunk: { representation: { id: 'video_1000k' }, homeRepresentationId: null },
                request: {}
            };
            await override._onMediaFragmentLoaded(e);
            expect(mockParent._onMediaFragmentLoaded.calledOnce).to.be.true; // jshint ignore:line
            expect(mockParent.appendToBuffer.called).to.be.false; // jshint ignore:line
        });

        it('sandwiches quality override chunk with changeType() + init segments when both inits are cached', async function () {
            const alternateRep = { id: 'video_500k' };
            const homeRep = { id: 'video_1000k' };
            const alternateInit = { representation: alternateRep, bytes: new Uint8Array(10) };
            const homeInit = { representation: homeRep, bytes: new Uint8Array(20) };
            mockParent.getInitChunkFromCache.withArgs('video_500k').returns(alternateInit);
            mockParent.getInitChunkFromCache.withArgs('video_1000k').returns(homeInit);

            const chunk = {
                representation: alternateRep,
                homeRepresentationId: 'video_1000k'
            };
            const request = {};
            await override._onMediaFragmentLoaded({ chunk, request });

            // Sequence: changeType(alt), append(altInit), append(chunk, request), changeType(home), append(homeInit)
            expect(mockParent.changeType.callCount).to.equal(2);
            expect(mockParent.appendToBuffer.callCount).to.equal(3);

            expect(mockParent.changeType.getCall(0).args[0]).to.equal(alternateRep);
            expect(mockParent.changeType.getCall(0).calledBefore(mockParent.appendToBuffer.getCall(0))).to.be.true; // jshint ignore:line

            expect(mockParent.appendToBuffer.getCall(0).args[0]).to.equal(alternateInit);
            expect(mockParent.appendToBuffer.getCall(1).args[0]).to.equal(chunk);
            expect(mockParent.appendToBuffer.getCall(1).args[1]).to.equal(request);

            expect(mockParent.changeType.getCall(1).args[0]).to.equal(homeRep);
            expect(mockParent.changeType.getCall(1).calledAfter(mockParent.appendToBuffer.getCall(1))).to.be.true; // jshint ignore:line
            expect(mockParent.changeType.getCall(1).calledBefore(mockParent.appendToBuffer.getCall(2))).to.be.true; // jshint ignore:line

            expect(mockParent.appendToBuffer.getCall(2).args[0]).to.equal(homeInit);
            expect(mockParent._onMediaFragmentLoaded.called).to.be.false; // jshint ignore:line
        });

        it('skips changeType calls when useChangeType is disabled in settings', async function () {
            const alternateRep = { id: 'video_500k' };
            const homeRep = { id: 'video_1000k' };
            const alternateInit = { representation: alternateRep };
            const homeInit = { representation: homeRep };
            mockParent.getInitChunkFromCache.withArgs('video_500k').returns(alternateInit);
            mockParent.getInitChunkFromCache.withArgs('video_1000k').returns(homeInit);

            const settings = Settings(context).getInstance();
            settings.update({ streaming: { buffer: { useChangeType: false } } });
            try {
                const mediaChunk = { representation: alternateRep, homeRepresentationId: 'video_1000k' };
                const request = {};
                await override._onMediaFragmentLoaded({ chunk: mediaChunk, request });
                expect(mockParent.changeType.called).to.be.false; // jshint ignore:line
                expect(mockParent.appendToBuffer.callCount).to.equal(3);
                expect(mockParent.appendToBuffer.getCall(0).args[0]).to.equal(alternateInit);
                expect(mockParent.appendToBuffer.getCall(1).args[0]).to.equal(mediaChunk);
                expect(mockParent.appendToBuffer.getCall(2).args[0]).to.equal(homeInit);
                expect(mockParent._onMediaFragmentLoaded.called).to.be.false; // jshint ignore:line
            } finally {
                settings.update({ streaming: { buffer: { useChangeType: true } } });
            }
        });

        it('skips changeType calls when capability is not supported', async function () {
            const alternateRep = { id: 'video_500k' };
            const homeRep = { id: 'video_1000k' };
            const alternateInit = { representation: alternateRep };
            const homeInit = { representation: homeRep };
            mockParent.getInitChunkFromCache.withArgs('video_500k').returns(alternateInit);
            mockParent.getInitChunkFromCache.withArgs('video_1000k').returns(homeInit);

            capabilities.supportsChangeType.returns(false);
            const mediaChunk = { representation: alternateRep, homeRepresentationId: 'video_1000k' };
            const request = {};
            await override._onMediaFragmentLoaded({ chunk: mediaChunk, request });
            expect(mockParent.changeType.called).to.be.false; // jshint ignore:line
            expect(mockParent.appendToBuffer.callCount).to.equal(3);
            expect(mockParent.appendToBuffer.getCall(0).args[0]).to.equal(alternateInit);
            expect(mockParent.appendToBuffer.getCall(1).args[0]).to.equal(mediaChunk);
            expect(mockParent.appendToBuffer.getCall(2).args[0]).to.equal(homeInit);
        });

        it('stalls when alternate init is not cached', async function () {
            const homeInit = { representation: { id: 'video_1000k' }, bytes: new Uint8Array(20) };
            mockParent.getInitChunkFromCache.withArgs('video_500k').returns(null);
            mockParent.getInitChunkFromCache.withArgs('video_1000k').returns(homeInit);

            await override._onMediaFragmentLoaded({
                chunk: { representation: { id: 'video_500k' }, homeRepresentationId: 'video_1000k' },
                request: {}
            });

            expect(mockParent.appendToBuffer.called).to.be.false; // jshint ignore:line
            expect(mockParent._onMediaFragmentLoaded.called).to.be.false; // jshint ignore:line
        });

        it('stalls when home init is not cached', async function () {
            const alternateInit = { representation: { id: 'video_500k' }, bytes: new Uint8Array(10) };
            mockParent.getInitChunkFromCache.withArgs('video_500k').returns(alternateInit);
            mockParent.getInitChunkFromCache.withArgs('video_1000k').returns(null);

            await override._onMediaFragmentLoaded({
                chunk: { representation: { id: 'video_500k' }, homeRepresentationId: 'video_1000k' },
                request: {}
            });

            expect(mockParent.appendToBuffer.called).to.be.false; // jshint ignore:line
            expect(mockParent._onMediaFragmentLoaded.called).to.be.false; // jshint ignore:line
        });

        it('stalls when both inits are not cached', async function () {
            await override._onMediaFragmentLoaded({
                chunk: { representation: { id: 'video_500k' }, homeRepresentationId: 'video_1000k' },
                request: {}
            });

            expect(mockParent.appendToBuffer.called).to.be.false; // jshint ignore:line
            expect(mockParent._onMediaFragmentLoaded.called).to.be.false; // jshint ignore:line
        });
    });

    // _onInitFragmentLoaded + Dodge-owned alternate init cache

    describe('_onInitFragmentLoaded', function () {

        it('delegates to parent for home init (no homeRepresentationId)', function () {
            const e = { chunk: { representation: { id: 'video_1000k' }, homeRepresentationId: null } };
            override._onInitFragmentLoaded(e);
            expect(mockParent._onInitFragmentLoaded.calledOnce).to.be.true; // jshint ignore:line
            expect(mockParent._onInitFragmentLoaded.firstCall.args[0]).to.equal(e);
        });

        it('alternate init is cached locally and does not delegate to parent', function () {
            const chunk = { representation: { id: 'video_500k' }, homeRepresentationId: 'video_1000k' };
            override._onInitFragmentLoaded({ chunk });
            expect(mockParent._onInitFragmentLoaded.called).to.be.false; // jshint ignore:line
        });

        it('sandwich retrieves alternate init from the local cache (parent cache never consulted for alt)', async function () {
            const alternateInit = { representation: { id: 'video_500k' }, homeRepresentationId: 'video_1000k', bytes: new Uint8Array(10) };
            const homeInit = { representation: { id: 'video_1000k' }, bytes: new Uint8Array(20) };
            // Only home is in the parent cache. Local cache is primed by _onInitFragmentLoaded.
            mockParent.getInitChunkFromCache.withArgs('video_500k').returns(null);
            mockParent.getInitChunkFromCache.withArgs('video_1000k').returns(homeInit);

            override._onInitFragmentLoaded({ chunk: alternateInit });

            const mediaChunk = { representation: { id: 'video_500k' }, homeRepresentationId: 'video_1000k' };
            await override._onMediaFragmentLoaded({ chunk: mediaChunk, request: {} });

            expect(mockParent.appendToBuffer.callCount).to.equal(3);
            expect(mockParent.appendToBuffer.getCall(0).args[0]).to.equal(alternateInit);
            expect(mockParent.appendToBuffer.getCall(1).args[0]).to.equal(mediaChunk);
            expect(mockParent.appendToBuffer.getCall(2).args[0]).to.equal(homeInit);
        });

        it('local cache does not depend on streaming.cacheInitSegments - sandwich succeeds regardless', async function () {
            // No Settings object is involved here; the local cache is unconditional.
            const alternateInit = { representation: { id: 'video_500k' }, homeRepresentationId: 'video_1000k', bytes: new Uint8Array(5) };
            const homeInit = { representation: { id: 'video_1000k' }, bytes: new Uint8Array(8) };
            mockParent.getInitChunkFromCache.withArgs('video_1000k').returns(homeInit);

            override._onInitFragmentLoaded({ chunk: alternateInit });

            await override._onMediaFragmentLoaded({
                chunk: { representation: { id: 'video_500k' }, homeRepresentationId: 'video_1000k' },
                request: {}
            });

            expect(mockParent.appendToBuffer.callCount).to.equal(3);
        });

        it('QUALITY_CHANGE_REQUESTED for this mediaType clears the local cache', async function () {
            const alternateInit = { representation: { id: 'video_500k' }, homeRepresentationId: 'video_1000k' };
            const homeInit = { representation: { id: 'video_1000k' } };
            mockParent.getInitChunkFromCache.withArgs('video_1000k').returns(homeInit);

            override._onInitFragmentLoaded({ chunk: alternateInit });

            EventBus(context).getInstance().trigger(MediaPlayerEvents.QUALITY_CHANGE_REQUESTED, { mediaType: 'video' });

            await override._onMediaFragmentLoaded({
                chunk: { representation: { id: 'video_500k' }, homeRepresentationId: 'video_1000k' },
                request: {}
            });

            // Cache was cleared: stalls (no appends).
            expect(mockParent.appendToBuffer.called).to.be.false; // jshint ignore:line
        });

        it('QUALITY_CHANGE_REQUESTED for a different mediaType does not clear the local cache', async function () {
            const alternateInit = { representation: { id: 'video_500k' }, homeRepresentationId: 'video_1000k' };
            const homeInit = { representation: { id: 'video_1000k' } };
            mockParent.getInitChunkFromCache.withArgs('video_1000k').returns(homeInit);

            override._onInitFragmentLoaded({ chunk: alternateInit });

            EventBus(context).getInstance().trigger(MediaPlayerEvents.QUALITY_CHANGE_REQUESTED, { mediaType: 'audio' });

            await override._onMediaFragmentLoaded({
                chunk: { representation: { id: 'video_500k' }, homeRepresentationId: 'video_1000k' },
                request: {}
            });

            expect(mockParent.appendToBuffer.callCount).to.equal(3);
        });

        it('resetInitialSettings clears the local cache', async function () {
            const alternateInit = { representation: { id: 'video_500k' }, homeRepresentationId: 'video_1000k' };
            const homeInit = { representation: { id: 'video_1000k' } };
            mockParent.getInitChunkFromCache.withArgs('video_1000k').returns(homeInit);

            override._onInitFragmentLoaded({ chunk: alternateInit });
            override.resetInitialSettings();

            await override._onMediaFragmentLoaded({
                chunk: { representation: { id: 'video_500k' }, homeRepresentationId: 'video_1000k' },
                request: {}
            });

            expect(mockParent.appendToBuffer.called).to.be.false; // jshint ignore:line
        });
    });
});
