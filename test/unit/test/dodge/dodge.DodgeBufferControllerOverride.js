import DodgeBufferControllerOverride from '../../../../src/dodge/overrides/DodgeBufferControllerOverride.js';
import Debug from '../../../../src/core/Debug.js';
import EventBus from '../../../../src/core/EventBus.js';
import MediaPlayerEvents from '../../../../src/streaming/MediaPlayerEvents.js';

import sinon from 'sinon';
import { expect } from 'chai';

// ************************************************************************
// TESTS
// ************************************************************************

describe('DodgeBufferControllerOverride', function () {
    let context, override, mockParent, dashHandler, playbackController;

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
            getInitChunkFromCache: sinon.stub().returns(null),
            getType: sinon.stub().returns('video'),
        };

        dashHandler = {
            getIsTrailing: sinon.stub().returns(false),
        };

        playbackController = {
            getTimeSinceStreamEnd: sinon.stub().returns(0),
        };

        override = DodgeBufferControllerOverride.call(
            { context, parent: mockParent, factory: {} },
            { dashHandler, playbackController }
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

        it('delegates to parent for non-override chunks', function () {
            const e = {
                chunk: { representation: { id: 'video_1000k' }, homeRepresentationId: null },
                request: {}
            };
            override._onMediaFragmentLoaded(e);
            expect(mockParent._onMediaFragmentLoaded.calledOnce).to.be.true; // jshint ignore:line
            expect(mockParent.appendToBuffer.called).to.be.false; // jshint ignore:line
        });

        it('sandwiches quality override chunk with init segments when both inits are cached', function () {
            const alternateInit = { representation: { id: 'video_500k' }, bytes: new Uint8Array(10) };
            const homeInit = { representation: { id: 'video_1000k' }, bytes: new Uint8Array(20) };
            mockParent.getInitChunkFromCache.withArgs('video_500k').returns(alternateInit);
            mockParent.getInitChunkFromCache.withArgs('video_1000k').returns(homeInit);

            const chunk = {
                representation: { id: 'video_500k' },
                homeRepresentationId: 'video_1000k'
            };
            const request = {};
            override._onMediaFragmentLoaded({ chunk, request });

            expect(mockParent.appendToBuffer.callCount).to.equal(3);
            expect(mockParent.appendToBuffer.getCall(0).args[0]).to.equal(alternateInit);
            expect(mockParent.appendToBuffer.getCall(1).args[0]).to.equal(chunk);
            expect(mockParent.appendToBuffer.getCall(1).args[1]).to.equal(request);
            expect(mockParent.appendToBuffer.getCall(2).args[0]).to.equal(homeInit);
            expect(mockParent._onMediaFragmentLoaded.called).to.be.false; // jshint ignore:line
        });

        it('stalls when alternate init is not cached', function () {
            const homeInit = { representation: { id: 'video_1000k' }, bytes: new Uint8Array(20) };
            mockParent.getInitChunkFromCache.withArgs('video_500k').returns(null);
            mockParent.getInitChunkFromCache.withArgs('video_1000k').returns(homeInit);

            const chunk = {
                representation: { id: 'video_500k' },
                homeRepresentationId: 'video_1000k'
            };
            override._onMediaFragmentLoaded({ chunk, request: {} });

            expect(mockParent.appendToBuffer.called).to.be.false; // jshint ignore:line
            expect(mockParent._onMediaFragmentLoaded.called).to.be.false; // jshint ignore:line
        });

        it('stalls when home init is not cached', function () {
            const alternateInit = { representation: { id: 'video_500k' }, bytes: new Uint8Array(10) };
            mockParent.getInitChunkFromCache.withArgs('video_500k').returns(alternateInit);
            mockParent.getInitChunkFromCache.withArgs('video_1000k').returns(null);

            const chunk = {
                representation: { id: 'video_500k' },
                homeRepresentationId: 'video_1000k'
            };
            override._onMediaFragmentLoaded({ chunk, request: {} });

            expect(mockParent.appendToBuffer.called).to.be.false; // jshint ignore:line
            expect(mockParent._onMediaFragmentLoaded.called).to.be.false; // jshint ignore:line
        });

        it('stalls when both inits are not cached', function () {
            const chunk = {
                representation: { id: 'video_500k' },
                homeRepresentationId: 'video_1000k'
            };
            override._onMediaFragmentLoaded({ chunk, request: {} });

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

        it('sandwich retrieves alternate init from the local cache (parent cache never consulted for alt)', function () {
            const alternateInit = { representation: { id: 'video_500k' }, homeRepresentationId: 'video_1000k', bytes: new Uint8Array(10) };
            const homeInit = { representation: { id: 'video_1000k' }, bytes: new Uint8Array(20) };
            // Only home is in the parent cache. Local cache is primed by _onInitFragmentLoaded.
            mockParent.getInitChunkFromCache.withArgs('video_500k').returns(null);
            mockParent.getInitChunkFromCache.withArgs('video_1000k').returns(homeInit);

            override._onInitFragmentLoaded({ chunk: alternateInit });

            const mediaChunk = { representation: { id: 'video_500k' }, homeRepresentationId: 'video_1000k' };
            override._onMediaFragmentLoaded({ chunk: mediaChunk, request: {} });

            expect(mockParent.appendToBuffer.callCount).to.equal(3);
            expect(mockParent.appendToBuffer.getCall(0).args[0]).to.equal(alternateInit);
            expect(mockParent.appendToBuffer.getCall(1).args[0]).to.equal(mediaChunk);
            expect(mockParent.appendToBuffer.getCall(2).args[0]).to.equal(homeInit);
        });

        it('local cache does not depend on streaming.cacheInitSegments - sandwich succeeds regardless', function () {
            // No Settings object is involved here; the local cache is unconditional.
            const alternateInit = { representation: { id: 'video_500k' }, homeRepresentationId: 'video_1000k', bytes: new Uint8Array(5) };
            const homeInit = { representation: { id: 'video_1000k' }, bytes: new Uint8Array(8) };
            mockParent.getInitChunkFromCache.withArgs('video_1000k').returns(homeInit);

            override._onInitFragmentLoaded({ chunk: alternateInit });

            override._onMediaFragmentLoaded({
                chunk: { representation: { id: 'video_500k' }, homeRepresentationId: 'video_1000k' },
                request: {}
            });

            expect(mockParent.appendToBuffer.callCount).to.equal(3);
        });

        it('QUALITY_CHANGE_REQUESTED for this mediaType clears the local cache', function () {
            const alternateInit = { representation: { id: 'video_500k' }, homeRepresentationId: 'video_1000k' };
            const homeInit = { representation: { id: 'video_1000k' } };
            mockParent.getInitChunkFromCache.withArgs('video_1000k').returns(homeInit);

            override._onInitFragmentLoaded({ chunk: alternateInit });

            EventBus(context).getInstance().trigger(MediaPlayerEvents.QUALITY_CHANGE_REQUESTED, { mediaType: 'video' });

            override._onMediaFragmentLoaded({
                chunk: { representation: { id: 'video_500k' }, homeRepresentationId: 'video_1000k' },
                request: {}
            });

            // Cache was cleared: stalls (no appends).
            expect(mockParent.appendToBuffer.called).to.be.false; // jshint ignore:line
        });

        it('QUALITY_CHANGE_REQUESTED for a different mediaType does not clear the local cache', function () {
            const alternateInit = { representation: { id: 'video_500k' }, homeRepresentationId: 'video_1000k' };
            const homeInit = { representation: { id: 'video_1000k' } };
            mockParent.getInitChunkFromCache.withArgs('video_1000k').returns(homeInit);

            override._onInitFragmentLoaded({ chunk: alternateInit });

            EventBus(context).getInstance().trigger(MediaPlayerEvents.QUALITY_CHANGE_REQUESTED, { mediaType: 'audio' });

            override._onMediaFragmentLoaded({
                chunk: { representation: { id: 'video_500k' }, homeRepresentationId: 'video_1000k' },
                request: {}
            });

            expect(mockParent.appendToBuffer.callCount).to.equal(3);
        });

        it('resetInitialSettings clears the local cache', function () {
            const alternateInit = { representation: { id: 'video_500k' }, homeRepresentationId: 'video_1000k' };
            const homeInit = { representation: { id: 'video_1000k' } };
            mockParent.getInitChunkFromCache.withArgs('video_1000k').returns(homeInit);

            override._onInitFragmentLoaded({ chunk: alternateInit });
            override.resetInitialSettings();

            override._onMediaFragmentLoaded({
                chunk: { representation: { id: 'video_500k' }, homeRepresentationId: 'video_1000k' },
                request: {}
            });

            expect(mockParent.appendToBuffer.called).to.be.false; // jshint ignore:line
        });
    });
});
