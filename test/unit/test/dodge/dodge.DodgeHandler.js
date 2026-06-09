import { DodgeHandler } from '../../../../src/dodge/index.js';
import DefenseRegistry from '../../../../src/dodge/DefenseRegistry.js';
import DodgeErrors from '../../../../src/dodge/errors/DodgeErrors.js';
import DodgeEvents from '../../../../src/dodge/events/DodgeEvents.js';
import EventBus from '../../../../src/core/EventBus.js';
import Events from '../../../../src/core/events/Events.js';
import MediaPlayerEvents from '../../../../src/streaming/MediaPlayerEvents.js';
import Settings from '../../../../src/core/Settings.js';
import Debug from '../../../../src/core/Debug.js';

import sinon from 'sinon';
import { expect } from 'chai';

Events.extend(DodgeEvents);
Events.extend(MediaPlayerEvents);

function makeValidManifest() {
    return {
        start: {
            mpd: '<MPD/>',
            base_uri: 'https://example.com/'
        },
        streams: [{
            label: 'video_1000k',
            init: [{ range: '-855' }],
            data: [
                { index: 0, range: '-43999' },
                { index: 0, range: '44000-', buffer: true }
            ]
        }]
    };
}

// ************************************************************************
// TESTS
// ************************************************************************

describe('DodgeHandler', function () {
    let context, dodgeHandler;

    beforeEach(function () {
        context = {};

        const eventBus = EventBus(context).getInstance();
        const settings = Settings(context).getInstance();

        dodgeHandler = DodgeHandler(context).create({
            eventBus,
            events: Events,
            settings,
            streamController: null,
            mediaPlayer: { extend: () => {} }
        });
    });

    afterEach(function () {
        dodgeHandler.reset();
    });

    // tryProcessExtendedManifest

    describe('tryProcessExtendedManifest', function () {

        it('input that is not valid JSON returns null', function () {
            expect(dodgeHandler.tryProcessExtendedManifest('<MPD/>')).to.be.null; // jshint ignore:line
        });

        it('valid JSON with invalid extended manifest returns null', function () {
            // Missing streams array
            const bad = JSON.stringify({ start: { mpd: '<MPD/>', base_uri: 'https://example.com/' } });
            expect(dodgeHandler.tryProcessExtendedManifest(bad)).to.be.null; // jshint ignore:line
        });

        it('valid extended manifest JSON returns { mpd, baseUri } matching embedded values', function () {
            const manifest = makeValidManifest();
            const result = dodgeHandler.tryProcessExtendedManifest(JSON.stringify(manifest));

            expect(result).to.exist; // jshint ignore:line
            expect(result.mpd).to.equal('<MPD/>');
            expect(result.baseUri).to.equal('https://example.com/');
        });

        it('two successive valid manifests: each returns its own mpd and baseUri independently', function () {
            const m1 = {
                start: { mpd: '<MPD1/>', base_uri: 'https://server1.example.com/' },
                streams: [{
                    label: 'video_1000k',
                    init: [{ range: '-855' }],
                    data: [{ index: 0, buffer: true }]
                }]
            };
            const m2 = {
                start: { mpd: '<MPD2/>', base_uri: 'https://server2.example.com/' },
                streams: [{
                    label: 'video_2000k',
                    init: [{ range: '-855' }],
                    data: [{ index: 0, buffer: true }]
                }]
            };

            const r1 = dodgeHandler.tryProcessExtendedManifest(JSON.stringify(m1));
            const r2 = dodgeHandler.tryProcessExtendedManifest(JSON.stringify(m2));

            expect(r1.mpd).to.equal('<MPD1/>');
            expect(r1.baseUri).to.equal('https://server1.example.com/');
            expect(r2.mpd).to.equal('<MPD2/>');
            expect(r2.baseUri).to.equal('https://server2.example.com/');
        });

        it('strictMode false: warns that strict mode is disabled', function () {
            const ctx = {};
            const eventBus = EventBus(ctx).getInstance();
            const settings = Settings(ctx).getInstance();
            settings.update({ debug: { dispatchEvent: true, logLevel: Debug.LOG_LEVEL_WARNING } });
            Debug(ctx).getInstance({ settings: settings });
            settings.update({ dodge: { strictMode: false } });
            const logMessages = [];
            const testListener = {};
            eventBus.on(Events.LOG, (e) => { logMessages.push(e); }, testListener);

            const handler = DodgeHandler(ctx).create({
                eventBus,
                events: Events,
                settings,
                streamController: null,
                mediaPlayer: { extend: () => {}, updateSettings: () => {} }
            });
            handler.tryProcessExtendedManifest(JSON.stringify(makeValidManifest()), 'test.exmfst.json');
            expect(logMessages.some(m => m.level === Debug.LOG_LEVEL_WARNING && m.message.includes('strictMode is disabled'))).to.be.true; // jshint ignore:line
            handler.reset();
        });
    });

    // Strict mode

    describe('tryProcessExtendedManifest with strictMode = manifest', function () {
        let eventBus, settings, errorSpy, listener;

        beforeEach(function () {
            eventBus = EventBus(context).getInstance();
            settings = Settings(context).getInstance();
            settings.update({ dodge: { strictMode: 'manifest' } });

            listener = {};
            errorSpy = sinon.spy();
            eventBus.on(Events.INTERNAL_MANIFEST_LOADED, errorSpy, listener);
        });

        afterEach(function () {
            eventBus.off(Events.INTERNAL_MANIFEST_LOADED, errorSpy, listener);
            settings.update({ dodge: { strictMode: false } });
        });

        it('non-JSON input: returns false and fires INTERNAL_MANIFEST_LOADED with error', function () {
            const result = dodgeHandler.tryProcessExtendedManifest('<MPD/>', 'http://example.com/video.mpd');
            expect(result).to.be.false; // jshint ignore:line
            expect(errorSpy.calledOnce).to.be.true; // jshint ignore:line
            const payload = errorSpy.firstCall.args[0];
            expect(payload.manifest).to.be.null; // jshint ignore:line
            expect(payload.error).to.exist; // jshint ignore:line
            expect(payload.error.code).to.equal(DodgeErrors.DODGE_STRICT_MODE_ERROR_CODE);
        });

        it('invalid extended manifest JSON: returns false and fires INTERNAL_MANIFEST_LOADED with error', function () {
            const bad = JSON.stringify({ start: { mpd: '<MPD/>', base_uri: 'https://example.com/' } });
            const result = dodgeHandler.tryProcessExtendedManifest(bad, 'http://example.com/video.exmfst.json');
            expect(result).to.be.false; // jshint ignore:line
            expect(errorSpy.calledOnce).to.be.true; // jshint ignore:line
            expect(errorSpy.firstCall.args[0].error.code).to.equal(DodgeErrors.DODGE_STRICT_MODE_ERROR_CODE);
        });

        it('error message includes the URL', function () {
            const url = 'http://example.com/test.exmfst.json';
            dodgeHandler.tryProcessExtendedManifest('<not-json>', url);
            const msg = errorSpy.firstCall.args[0].error.message;
            expect(msg).to.include(url);
        });

        it('valid extended manifest: returns { mpd, baseUri } and does not fire error', function () {
            const result = dodgeHandler.tryProcessExtendedManifest(JSON.stringify(makeValidManifest()), 'http://example.com/valid.exmfst.json');
            expect(result).to.exist; // jshint ignore:line
            expect(result.mpd).to.equal('<MPD/>');
            expect(errorSpy.called).to.be.false; // jshint ignore:line
        });
    });

    describe('tryProcessExtendedManifest without strictMode = manifest', function () {
        it('non-JSON input: returns null (no error)', function () {
            const eventBus = EventBus(context).getInstance();
            const errorSpy = sinon.spy();
            const listener = {};
            eventBus.on(Events.INTERNAL_MANIFEST_LOADED, errorSpy, listener);

            const result = dodgeHandler.tryProcessExtendedManifest('<MPD/>');
            expect(result).to.be.null; // jshint ignore:line
            expect(errorSpy.called).to.be.false; // jshint ignore:line

            eventBus.off(Events.INTERNAL_MANIFEST_LOADED, errorSpy, listener);
        });
    });

    // Partial segment combination

    describe('Partial segment combination, _onFragmentLoadingCompleted', function () {
        let handler, testListener;
        let mediaLoadedSpy, partialSegmentSpy, paddingLoadedSpy;

        function makeRequest(overrides) {
            return Object.assign({
                full: true,
                padding: false,
                buffer: true,
                trail: false,
                index: 0,
                mediaType: 'video',
                type: 'MediaSegment',
                quality: 0,
                duration: 4,
                startTime: 0,
                mediaStartTime: 0,
                originalRange: null,
                range: null,
                bandwidth: 1000,
                adaptationIndex: 0,
                timescale: 1,
                availabilityStartTime: 0,
                availabilityEndTime: Infinity,
                availabilityTimeComplete: true,
                wallStartTime: 0,
                replacementNumber: 0,
                replacementTime: 0,
                representation: {
                    id: 'rep0',
                    bandwidth: 1000,
                    adaptation: { index: 0, period: { index: 0, start: 0, duration: 100 } },
                    mediaInfo: { type: 'video', streamInfo: { id: 'stream-1' } }
                },
                isInitializationRequest: () => false,
            }, overrides || {});
        }

        let eventBus, settings;

        function triggerFragmentLoaded(request, error) {
            const e = {
                sender: { context: 'test' },
                request,
                response: new ArrayBuffer(8),
                error: error || null,
            };
            eventBus.trigger(Events.FRAGMENT_LOADING_COMPLETED, e, { streamId: 'stream-1' });
            return e;
        }

        beforeEach(function () {
            eventBus = EventBus(context).getInstance();
            settings = Settings(context).getInstance();

            handler = DodgeHandler(context).create({
                eventBus,
                events: Events,
                settings,
                streamController: null,
                mediaPlayer: { extend: () => {} }
            });
            handler.registerEvents();

            testListener = {};
            mediaLoadedSpy = sinon.spy();
            partialSegmentSpy = sinon.spy();
            paddingLoadedSpy = sinon.spy();

            eventBus.on(Events.MEDIA_FRAGMENT_LOADED, mediaLoadedSpy, testListener);
            eventBus.on(Events.MEDIA_FRAGMENT_PARTIAL, partialSegmentSpy, testListener);
            eventBus.on(Events.PADDING_LOADED, paddingLoadedSpy, testListener);
        });

        afterEach(function () {
            eventBus.off(Events.MEDIA_FRAGMENT_LOADED, mediaLoadedSpy, testListener);
            eventBus.off(Events.MEDIA_FRAGMENT_PARTIAL, partialSegmentSpy, testListener);
            eventBus.off(Events.PADDING_LOADED, paddingLoadedSpy, testListener);
            handler.reset();
        });

        it('vanilla request: sender stays non-null, no Dodge events fired', function () {
            const e = triggerFragmentLoaded(makeRequest({ full: undefined, padding: undefined }));
            expect(e.sender).to.not.be.null; // jshint ignore:line
            expect(mediaLoadedSpy.called).to.be.false; // jshint ignore:line
            expect(partialSegmentSpy.called).to.be.false; // jshint ignore:line
            expect(paddingLoadedSpy.called).to.be.false; // jshint ignore:line
        });

        it('errored Dodge request: sender set to null to prevent corrupted retry, no Dodge events fired', function () {
            const e = triggerFragmentLoaded(makeRequest({ full: true }), new Error('test error'));
            expect(e.sender).to.be.null; // jshint ignore:line
            expect(mediaLoadedSpy.called).to.be.false; // jshint ignore:line
            expect(partialSegmentSpy.called).to.be.false; // jshint ignore:line
            expect(paddingLoadedSpy.called).to.be.false; // jshint ignore:line
        });

        it('errored vanilla request: sender stays non-null', function () {
            const e = triggerFragmentLoaded(makeRequest({ full: undefined, padding: undefined }), new Error('test error'));
            expect(e.sender).to.not.be.null; // jshint ignore:line
        });

        it('full segment with buffer flag: MEDIA_FRAGMENT_LOADED fires', function () {
            const e = triggerFragmentLoaded(makeRequest({ full: true, buffer: true }));
            expect(e.sender).to.be.null; // jshint ignore:line
            expect(mediaLoadedSpy.calledOnce).to.be.true; // jshint ignore:line
            expect(partialSegmentSpy.called).to.be.false; // jshint ignore:line
            expect(paddingLoadedSpy.called).to.be.false; // jshint ignore:line

            const stats = handler.getStreamStats('stream-1');
            expect(stats.partialSegments).to.equal(0); // jshint ignore:line
            expect(stats.pendingInit).to.equal(0); // jshint ignore:line
            expect(stats.pendingMedia).to.equal(0); // jshint ignore:line
        });

        it('full segment without buffer flag: MEDIA_FRAGMENT_PARTIAL fires, MEDIA_FRAGMENT_LOADED queued', function () {
            const e = triggerFragmentLoaded(makeRequest({ full: true, buffer: false }));
            expect(e.sender).to.be.null; // jshint ignore:line
            expect(mediaLoadedSpy.called).to.be.false; // jshint ignore:line
            expect(partialSegmentSpy.calledOnce).to.be.true; // jshint ignore:line
            expect(paddingLoadedSpy.called).to.be.false; // jshint ignore:line

            const stats = handler.getStreamStats('stream-1');
            expect(stats.partialSegments).to.equal(0); // jshint ignore:line
            expect(stats.pendingInit).to.equal(0); // jshint ignore:line
            expect(stats.pendingMedia).to.equal(1); // jshint ignore:line
        });

        it('partial segment: MEDIA_FRAGMENT_PARTIAL fires, segment data queued', function () {
            const e = triggerFragmentLoaded(makeRequest({ full: false, buffer: false }));
            expect(e.sender).to.be.null; // jshint ignore:line
            expect(mediaLoadedSpy.called).to.be.false; // jshint ignore:line
            expect(partialSegmentSpy.calledOnce).to.be.true; // jshint ignore:line
            expect(paddingLoadedSpy.called).to.be.false; // jshint ignore:line

            const stats = handler.getStreamStats('stream-1');
            expect(stats.partialSegments).to.equal(1); // jshint ignore:line
            expect(stats.pendingInit).to.equal(0); // jshint ignore:line
            expect(stats.pendingMedia).to.equal(0); // jshint ignore:line
        });

        it('padding cycle: PADDING_LOADED fires', function () {
            const e = triggerFragmentLoaded(makeRequest({ full: false, padding: true }));
            expect(e.sender).to.be.null; // jshint ignore:line
            expect(mediaLoadedSpy.calledOnce).to.be.false; // jshint ignore:line
            expect(partialSegmentSpy.called).to.be.false; // jshint ignore:line
            expect(paddingLoadedSpy.called).to.be.true; // jshint ignore:line

            const stats = handler.getStreamStats('stream-1');
            expect(stats.partialSegments).to.equal(0); // jshint ignore:line
            expect(stats.pendingInit).to.equal(0); // jshint ignore:line
            expect(stats.pendingMedia).to.equal(0); // jshint ignore:line
        });

        it('buffer with two full segments: flushes pending as secondary, then fires primary', function () {
            // Cycle A: full without buffer flag, queued in pendingMedia
            triggerFragmentLoaded(makeRequest({ full: true, buffer: false }));
            expect(partialSegmentSpy.calledOnce).to.be.true; // jshint ignore:line

            mediaLoadedSpy.resetHistory();

            // Cycle B: full with buffer flag, flushes cycle A (suppressed) + fires cycle B (primary)
            triggerFragmentLoaded(makeRequest({ full: true, buffer: true }));
            // MEDIA_FRAGMENT_LOADED should fire twice: once for A (suppressed), once for B (primary)
            expect(mediaLoadedSpy.callCount).to.equal(2);
        });

        // Selective buffer (array buffer)

        it('selective buffer [0]: flushes only pending index 0, leaves index 1 queued; current segment (not in array) also queued', function () {
            // Queue two full segments without buffer
            triggerFragmentLoaded(makeRequest({ full: true, buffer: false, index: 0 }));
            triggerFragmentLoaded(makeRequest({ full: true, buffer: false, index: 1 }));
            expect(handler.getStreamStats('stream-1').pendingMedia).to.equal(2);

            mediaLoadedSpy.resetHistory();
            partialSegmentSpy.resetHistory();

            // Selective buffer [0]: flushes pending index 0, current segment index 2 not in array so queued
            triggerFragmentLoaded(makeRequest({ full: true, buffer: [0], index: 2 }));
            expect(mediaLoadedSpy.callCount).to.equal(1); // secondary for index 0 only
            expect(partialSegmentSpy.calledOnce).to.be.true; // jshint ignore:line
            expect(handler.getStreamStats('stream-1').pendingMedia).to.equal(2); // index 1 + index 2
        });

        it('selective buffer [1]: flushes only pending index 1, leaves index 0 queued; current segment (not in array) also queued', function () {
            triggerFragmentLoaded(makeRequest({ full: true, buffer: false, index: 0 }));
            triggerFragmentLoaded(makeRequest({ full: true, buffer: false, index: 1 }));
            expect(handler.getStreamStats('stream-1').pendingMedia).to.equal(2);

            mediaLoadedSpy.resetHistory();
            partialSegmentSpy.resetHistory();

            triggerFragmentLoaded(makeRequest({ full: true, buffer: [1], index: 2 }));
            expect(mediaLoadedSpy.callCount).to.equal(1); // secondary for index 1 only
            expect(partialSegmentSpy.calledOnce).to.be.true; // jshint ignore:line
            expect(handler.getStreamStats('stream-1').pendingMedia).to.equal(2); // index 0 + index 2
        });

        it('selective buffer [0, 1]: flushes both pending segments; current segment index 2 (not in array) queued', function () {
            triggerFragmentLoaded(makeRequest({ full: true, buffer: false, index: 0 }));
            triggerFragmentLoaded(makeRequest({ full: true, buffer: false, index: 1 }));
            expect(handler.getStreamStats('stream-1').pendingMedia).to.equal(2);

            mediaLoadedSpy.resetHistory();
            partialSegmentSpy.resetHistory();

            triggerFragmentLoaded(makeRequest({ full: true, buffer: [0, 1], index: 2 }));
            expect(mediaLoadedSpy.callCount).to.equal(2); // 2 secondary
            expect(partialSegmentSpy.calledOnce).to.be.true; // jshint ignore:line
            expect(handler.getStreamStats('stream-1').pendingMedia).to.equal(1); // index 2
        });

        it('selective buffer [0, 2]: current segment index 2 is in array, so it is buffered', function () {
            triggerFragmentLoaded(makeRequest({ full: true, buffer: false, index: 0 }));
            expect(handler.getStreamStats('stream-1').pendingMedia).to.equal(1);

            mediaLoadedSpy.resetHistory();
            partialSegmentSpy.resetHistory();

            // buffer: [0, 2], current segment index 2 is in the array
            triggerFragmentLoaded(makeRequest({ full: true, buffer: [0, 2], index: 2 }));
            expect(mediaLoadedSpy.callCount).to.equal(2); // secondary for index 0 + primary for index 2
            expect(partialSegmentSpy.called).to.be.false; // jshint ignore:line
            expect(handler.getStreamStats('stream-1').pendingMedia).to.equal(0);
        });

        it('selective buffer [99]: no pending segments match, current segment not in array, queued', function () {
            triggerFragmentLoaded(makeRequest({ full: true, buffer: false, index: 0 }));
            expect(handler.getStreamStats('stream-1').pendingMedia).to.equal(1);

            mediaLoadedSpy.resetHistory();
            partialSegmentSpy.resetHistory();

            // buffer: [99] matches nothing in pending and current index 1 is not in array
            triggerFragmentLoaded(makeRequest({ full: true, buffer: [99], index: 1 }));
            expect(mediaLoadedSpy.called).to.be.false; // jshint ignore:line
            expect(partialSegmentSpy.calledOnce).to.be.true; // jshint ignore:line
            expect(handler.getStreamStats('stream-1').pendingMedia).to.equal(2); // index 0 + index 1
        });

        it('selective buffer []: empty array behaves as buffer = false', function () {
            triggerFragmentLoaded(makeRequest({ full: true, buffer: false, index: 0 }));
            expect(handler.getStreamStats('stream-1').pendingMedia).to.equal(1);

            mediaLoadedSpy.resetHistory();
            partialSegmentSpy.resetHistory();

            // Empty array = no flush, full segment queued
            triggerFragmentLoaded(makeRequest({ full: true, buffer: [], index: 1 }));
            expect(mediaLoadedSpy.called).to.be.false; // jshint ignore:line
            expect(partialSegmentSpy.calledOnce).to.be.true; // jshint ignore:line
            expect(handler.getStreamStats('stream-1').pendingMedia).to.equal(2);
        });

        it('selective buffer: padding event has bufferFlag false and buffer false (array buffer is not boolean true)', function () {
            // Fire a padding request with array buffer and no pending segments.
            // bufferFlag is only true for boolean buffer = true, not arrays.
            triggerFragmentLoaded(makeRequest({ full: false, padding: true, buffer: [0] }));
            expect(paddingLoadedSpy.calledOnce).to.be.true; // jshint ignore:line
            expect(paddingLoadedSpy.firstCall.args[0].bufferFlag).to.be.false; // jshint ignore:line
            expect(paddingLoadedSpy.firstCall.args[0].buffer).to.be.false; // jshint ignore:line
        });

        it('selective buffer: padding event has bufferFlag true when data secondary flushed, buffer false', function () {
            // Queue a pending segment
            triggerFragmentLoaded(makeRequest({ full: true, buffer: false, index: 0 }));
            expect(handler.getStreamStats('stream-1').pendingMedia).to.equal(1);

            paddingLoadedSpy.resetHistory();
            mediaLoadedSpy.resetHistory();

            // Fire padding with selective buffer [0] - flushes pending index 0
            triggerFragmentLoaded(makeRequest({ full: false, padding: true, buffer: [0] }));
            expect(mediaLoadedSpy.calledOnce).to.be.true; // jshint ignore:line (secondary flush)
            expect(paddingLoadedSpy.calledOnce).to.be.true; // jshint ignore:line
            expect(paddingLoadedSpy.firstCall.args[0].bufferFlag).to.be.true; // jshint ignore:line
            expect(paddingLoadedSpy.firstCall.args[0].buffer).to.be.false; // jshint ignore:line
        });

        it('selective buffer: pending init events are not flushed', function () {
            // Queue a full init segment without buffer
            triggerFragmentLoaded(makeRequest({
                full: true, buffer: false, index: 0,
                isInitializationRequest: () => true,
            }));
            expect(handler.getStreamStats('stream-1').pendingInit).to.equal(1);

            mediaLoadedSpy.resetHistory();

            // Selective buffer on a data request should not flush pending init
            triggerFragmentLoaded(makeRequest({ full: true, buffer: [0], index: 0 }));
            expect(handler.getStreamStats('stream-1').pendingInit).to.equal(1);
        });

        it('boolean buffer true flushes all pending segments', function () {
            triggerFragmentLoaded(makeRequest({ full: true, buffer: false, index: 0 }));
            triggerFragmentLoaded(makeRequest({ full: true, buffer: false, index: 1 }));
            expect(handler.getStreamStats('stream-1').pendingMedia).to.equal(2);

            mediaLoadedSpy.resetHistory();

            triggerFragmentLoaded(makeRequest({ full: true, buffer: true, index: 2 }));
            expect(mediaLoadedSpy.callCount).to.equal(3); // 2 secondary + 1 primary
            expect(handler.getStreamStats('stream-1').pendingMedia).to.equal(0);
        });
    });

    // ABR rule disabling in registerExtensions

    describe('ABR rule disabling in registerExtensions', function () {
        let handler, updateSettingsSpy;

        beforeEach(function () {
            const eventBus = EventBus(context).getInstance();
            const settings = Settings(context).getInstance();
            updateSettingsSpy = sinon.spy();

            handler = DodgeHandler(context).create({
                eventBus,
                events: Events,
                settings,
                streamController: null,
                mediaPlayer: { extend: () => {}, updateSettings: updateSettingsSpy }
            });
        });

        afterEach(function () {
            handler.reset();
        });

        it('calls updateSettings once', function () {
            handler.registerExtensions();
            expect(updateSettingsSpy.calledOnce).to.be.true; // jshint ignore:line
        });

        it('disables l2ARule, loLPRule, and abandonRequestsRule', function () {
            handler.registerExtensions();
            const rules = updateSettingsSpy.firstCall.args[0].streaming.abr.rules;
            expect(rules.l2ARule).to.deep.equal({ active: false });
            expect(rules.loLPRule).to.deep.equal({ active: false });
            expect(rules.abandonRequestsRule).to.deep.equal({ active: false });
        });

        it('does not disable supported rules', function () {
            handler.registerExtensions();
            const rules = updateSettingsSpy.firstCall.args[0].streaming.abr.rules;
            expect(rules.bolaRule).to.be.undefined; // jshint ignore:line
            expect(rules.throughputRule).to.be.undefined; // jshint ignore:line
            expect(rules.insufficientBufferRule).to.be.undefined; // jshint ignore:line
            expect(rules.switchHistoryRule).to.be.undefined; // jshint ignore:line
            expect(rules.droppedFramesRule).to.be.undefined; // jshint ignore:line
        });
    });

    // Scheduling logic

    describe('Scheduling logic, _onPartialSegment and _onPaddingLoaded', function () {
        let handler, eventBus, settings, startTimerSpy, setQualitySpy, onPaddingLoadedSpy;

        beforeEach(function () {
            eventBus = EventBus(context).getInstance();
            settings = Settings(context).getInstance();

            startTimerSpy = sinon.spy();
            setQualitySpy = sinon.spy();
            onPaddingLoadedSpy = sinon.spy();

            const mockStreamController = {
                getActiveStreamProcessors: () => [{
                    getScheduleController: () => ({
                        startScheduleTimer: startTimerSpy,
                        setShouldCheckPlaybackQuality: setQualitySpy,
                    }),
                    getType: () => 'video',
                    getBufferController: () => ({ onPaddingLoaded: onPaddingLoadedSpy }),
                }]
            };

            handler = DodgeHandler(context).create({
                eventBus,
                events: Events,
                settings,
                streamController: mockStreamController,
                mediaPlayer: { extend: () => {} }
            });
            handler.registerEvents();
        });

        afterEach(function () {
            handler.reset();
        });

        it('MEDIA_FRAGMENT_PARTIAL: startScheduleTimer called, quality check disabled', function () {
            eventBus.trigger(Events.MEDIA_FRAGMENT_PARTIAL,
                { index: 0, suppress: false, representation: {}, quality: 0, byteLength: 100, trail: false, buffer: false },
                { streamId: 'stream-1', mediaType: 'video' }
            );
            expect(startTimerSpy.calledOnce).to.be.true; // jshint ignore:line
            expect(setQualitySpy.calledOnceWith(false)).to.be.true; // jshint ignore:line
        });

        it('MEDIA_FRAGMENT_PARTIAL (suppressed): startScheduleTimer not called', function () {
            eventBus.trigger(Events.MEDIA_FRAGMENT_PARTIAL,
                { index: 0, suppress: true, representation: {}, quality: 0, byteLength: 100, trail: false, buffer: false },
                { streamId: 'stream-1', mediaType: 'video' }
            );
            expect(startTimerSpy.called).to.be.false; // jshint ignore:line
        });

        it('PADDING_LOADED with bufferFlag = true (data secondary flushed): quality check enabled', function () {
            eventBus.trigger(Events.PADDING_LOADED,
                { index: 0, suppress: false, representation: { segmentDuration: 4 }, quality: 0, byteLength: 100, trail: true, buffer: true, bufferFlag: true },
                { streamId: 'stream-1', mediaType: 'video' }
            );
            expect(startTimerSpy.calledOnce).to.be.true; // jshint ignore:line
            expect(setQualitySpy.calledOnceWith(true)).to.be.true; // jshint ignore:line
        });

        it('PADDING_LOADED with bufferFlag = false: startScheduleTimer called, quality check disabled', function () {
            eventBus.trigger(Events.PADDING_LOADED,
                { index: 0, suppress: false, representation: { segmentDuration: 4 }, quality: 0, byteLength: 100, trail: true, buffer: false, bufferFlag: false },
                { streamId: 'stream-1', mediaType: 'video' }
            );
            expect(startTimerSpy.calledOnce).to.be.true; // jshint ignore:line
            expect(setQualitySpy.calledOnceWith(false)).to.be.true; // jshint ignore:line
        });

        it('PADDING_LOADED (suppressed): startScheduleTimer not called', function () {
            eventBus.trigger(Events.PADDING_LOADED,
                { index: 0, suppress: true, representation: { segmentDuration: 4 }, quality: 0, byteLength: 100, trail: true, buffer: false },
                { streamId: 'stream-1', mediaType: 'video' }
            );
            expect(startTimerSpy.called).to.be.false; // jshint ignore:line
        });

        it('PADDING_LOADED: routes event to buffer controller onPaddingLoaded', function () {
            const e = {
                index: 0,
                suppress: false,
                representation: { segmentDuration: 4 },
                quality: 0,
                byteLength: 100,
                trail: true,
                buffer: true,
                mediaType: 'video',
            };
            eventBus.trigger(Events.PADDING_LOADED, e, { streamId: 'stream-1', mediaType: 'video' });
            expect(onPaddingLoadedSpy.calledOnce).to.be.true; // jshint ignore:line
        });

        it('PADDING_LOADED: routes event with all expected fields to buffer controller', function () {
            const e = {
                index: 3,
                suppress: false,
                representation: { segmentDuration: 4 },
                quality: 0,
                byteLength: 200,
                trail: true,
                buffer: false,
                bufferFlag: true,
                mediaType: 'video',
            };
            eventBus.trigger(Events.PADDING_LOADED, e, { streamId: 'stream-1', mediaType: 'video' });
            expect(onPaddingLoadedSpy.calledOnce).to.be.true; // jshint ignore:line
            const passedEvent = onPaddingLoadedSpy.firstCall.args[0];
            expect(passedEvent.trail).to.be.true; // jshint ignore:line
            expect(passedEvent.buffer).to.be.false; // jshint ignore:line
            expect(passedEvent.representation).to.deep.equal({ segmentDuration: 4 });
        });

        it('vanilla request: startScheduleTimer is never called', function () {
            // A vanilla FRAGMENT_LOADING_COMPLETED request has full = undefined and
            // padding = undefined. DodgeHandler must pass it through without triggering
            // random walk scheduling.
            eventBus.trigger(Events.FRAGMENT_LOADING_COMPLETED, {
                sender: { context: 'test' },
                request: {
                    full: undefined,
                    padding: undefined,
                    type: 'MediaSegment',
                    mediaType: 'video',
                    representation: {
                        id: 'rep0',
                        mediaInfo: { type: 'video', streamInfo: { id: 'stream-1' } }
                    },
                    isInitializationRequest: () => false,
                },
                response: new ArrayBuffer(8),
                error: null,
            }, { streamId: 'stream-1' });

            expect(startTimerSpy.called).to.be.false; // jshint ignore:line
        });

        it('INIT_FRAGMENT_PARTIAL: startScheduleTimer called, quality check disabled', function () {
            // Init partial cycles (non-buffer init downloads) are events emitted
            // by DodgeHandler when full = false on an init segment. _onPartialSegment
            // is registered for INIT_FRAGMENT_PARTIAL just as it is for
            // MEDIA_FRAGMENT_PARTIAL, and must disable quality checks.
            eventBus.trigger(Events.INIT_FRAGMENT_PARTIAL,
                { index: NaN, suppress: false, representation: {}, quality: 0, byteLength: 100, trail: false, buffer: false },
                { streamId: 'stream-1', mediaType: 'video' }
            );
            expect(startTimerSpy.calledOnce).to.be.true; // jshint ignore:line
            expect(setQualitySpy.calledOnceWith(false)).to.be.true; // jshint ignore:line
        });

        it('INIT_FRAGMENT_LOADED: startScheduleTimer not called by Dodge, quality check disabled', function () {
            // When the last init cycle fires (full = true, buffer = true),
            // DodgeHandler emits INIT_FRAGMENT_LOADED, not INIT_FRAGMENT_PARTIAL.
            // _scheduleAll is not called. Quality checks are only enabled for
            // MEDIA_FRAGMENT_LOADED with buffer=true, not for init fragments.
            eventBus.trigger(Events.FRAGMENT_LOADING_COMPLETED, {
                sender: { context: 'test' },
                request: {
                    full: true,
                    buffer: true,
                    padding: false,
                    trail: false,
                    index: NaN,
                    mediaType: 'video',
                    quality: 0,
                    duration: 0,
                    startTime: 0,
                    mediaStartTime: 0,
                    originalRange: null,
                    range: null,
                    bandwidth: 1000,
                    adaptationIndex: 0,
                    timescale: 1,
                    availabilityStartTime: 0,
                    availabilityEndTime: Infinity,
                    availabilityTimeComplete: true,
                    wallStartTime: 0,
                    replacementNumber: 0,
                    replacementTime: 0,
                    representation: {
                        id: 'rep0',
                        bandwidth: 1000,
                        adaptation: { index: 0, period: { index: 0, start: 0, duration: 100 } },
                        mediaInfo: { type: 'video', streamInfo: { id: 'stream-1' } }
                    },
                    isInitializationRequest: () => true,
                },
                response: new ArrayBuffer(8),
                error: null,
            }, { streamId: 'stream-1' });

            expect(startTimerSpy.called).to.be.false; // jshint ignore:line
            expect(setQualitySpy.calledOnceWith(false)).to.be.true; // jshint ignore:line
        });

        it('MEDIA_FRAGMENT_LOADED: startScheduleTimer not called by Dodge, quality check enabled', function () {
            // When a full cycle with buffer completes (full = true, buffer = true),
            // DodgeHandler emits MEDIA_FRAGMENT_LOADED, not MEDIA_FRAGMENT_PARTIAL.
            // _scheduleAll is not called (scheduling is left to the vanilla path),
            // but quality checks are enabled via _setQualityCheckAll(true).
            eventBus.trigger(Events.FRAGMENT_LOADING_COMPLETED, {
                sender: { context: 'test' },
                request: {
                    full: true,
                    buffer: true,
                    padding: false,
                    trail: false,
                    index: 0,
                    mediaType: 'video',
                    type: 'MediaSegment',
                    quality: 0,
                    duration: 4,
                    startTime: 0,
                    mediaStartTime: 0,
                    originalRange: null,
                    range: null,
                    bandwidth: 1000,
                    adaptationIndex: 0,
                    timescale: 1,
                    availabilityStartTime: 0,
                    availabilityEndTime: Infinity,
                    availabilityTimeComplete: true,
                    wallStartTime: 0,
                    replacementNumber: 0,
                    replacementTime: 0,
                    representation: {
                        id: 'rep0',
                        bandwidth: 1000,
                        adaptation: { index: 0, period: { index: 0, start: 0, duration: 100 } },
                        mediaInfo: { type: 'video', streamInfo: { id: 'stream-1' } }
                    },
                    isInitializationRequest: () => false,
                },
                response: new ArrayBuffer(8),
                error: null,
            }, { streamId: 'stream-1' });

            expect(startTimerSpy.called).to.be.false; // jshint ignore:line
            expect(setQualitySpy.calledOnceWith(true)).to.be.true; // jshint ignore:line
        });

        it('full = true, buffer = false: fires MEDIA_FRAGMENT_PARTIAL', function () {
            // A full cycle without buffer queues the assembled segment and fires
            // a PARTIAL event. Quality checks are disabled by _onPartialSegment.
            // Verify the LOADED path (which enables quality checks) isn't taken.
            const mediaLoadedSpy = sinon.spy();
            const mediaPartialSpy = sinon.spy();
            eventBus.on(Events.MEDIA_FRAGMENT_LOADED, mediaLoadedSpy, {});
            eventBus.on(Events.MEDIA_FRAGMENT_PARTIAL, mediaPartialSpy, {});

            eventBus.trigger(Events.FRAGMENT_LOADING_COMPLETED, {
                sender: { context: 'test' },
                request: {
                    full: true,
                    buffer: false,
                    padding: false,
                    trail: false,
                    index: 0,
                    mediaType: 'video',
                    type: 'MediaSegment',
                    quality: 0,
                    duration: 4,
                    startTime: 0,
                    mediaStartTime: 0,
                    originalRange: null,
                    range: null,
                    bandwidth: 1000,
                    adaptationIndex: 0,
                    timescale: 1,
                    availabilityStartTime: 0,
                    availabilityEndTime: Infinity,
                    availabilityTimeComplete: true,
                    wallStartTime: 0,
                    replacementNumber: 0,
                    replacementTime: 0,
                    representation: {
                        id: 'rep0',
                        bandwidth: 1000,
                        adaptation: { index: 0, period: { index: 0, start: 0, duration: 100 } },
                        mediaInfo: { type: 'video', streamInfo: { id: 'stream-1' } }
                    },
                    isInitializationRequest: () => false,
                },
                response: new ArrayBuffer(8),
                error: null,
            }, { streamId: 'stream-1' });

            expect(mediaLoadedSpy.called).to.be.false; // jshint ignore:line
            expect(mediaPartialSpy.calledOnce).to.be.true; // jshint ignore:line
            expect(setQualitySpy.calledOnceWith(false)).to.be.true; // jshint ignore:line

            eventBus.off(Events.MEDIA_FRAGMENT_LOADED, mediaLoadedSpy, {});
            eventBus.off(Events.MEDIA_FRAGMENT_PARTIAL, mediaPartialSpy, {});
        });
    });

    // Random walk scheduling

    describe('Random walk scheduling, _getScheduleWait and _scheduleAll', function () {
        let handler, eventBus, settings;

        function makeHandler(streamProcessors) {
            eventBus = EventBus(context).getInstance();
            settings = Settings(context).getInstance();

            handler = DodgeHandler(context).create({
                eventBus: eventBus,
                events: Events,
                settings: settings,
                streamController: { getActiveStreamProcessors: () => streamProcessors },
                mediaPlayer: { extend: () => {} }
            });
            handler.registerEvents();
        }

        afterEach(function () {
            handler.reset();
        });

        it('delay passed to startScheduleTimer is within [scheduleWaitBase, scheduleWaitBase + scheduleWaitRandom]', function () {
            const timerSpy = sinon.spy();
            makeHandler([{
                getScheduleController: () => ({ startScheduleTimer: timerSpy, setShouldCheckPlaybackQuality: sinon.spy() }),
                getType: () => 'video',
                getBufferController: () => ({ onPaddingLoaded: sinon.spy() }),
            }]);

            settings.update({ dodge: { scheduleWaitBase: 100, scheduleWaitRandom: 50 } });
            eventBus.trigger(Events.MEDIA_FRAGMENT_PARTIAL,
                { index: 0, suppress: false, representation: {}, quality: 0, byteLength: 100, trail: false, buffer: false },
                { streamId: 'stream-1', mediaType: 'video' }
            );

            const delay = timerSpy.firstCall.args[0];
            expect(delay).to.be.at.least(100);
            expect(delay).to.be.at.most(150);
        });

        it('with scheduleWaitRandom = 0, delay is always exactly scheduleWaitBase', function () {
            const timerSpy = sinon.spy();
            makeHandler([{
                getScheduleController: () => ({ startScheduleTimer: timerSpy, setShouldCheckPlaybackQuality: sinon.spy() }),
                getType: () => 'video',
                getBufferController: () => ({ onPaddingLoaded: sinon.spy() }),
            }]);

            settings.update({ dodge: { scheduleWaitBase: 200, scheduleWaitRandom: 0 } });
            for (let i = 0; i < 5; i++) {
                timerSpy.resetHistory();
                eventBus.trigger(Events.MEDIA_FRAGMENT_PARTIAL,
                    { index: i, suppress: false, representation: {}, quality: 0, byteLength: 100, trail: false, buffer: false },
                    { streamId: 'stream-1', mediaType: 'video' }
                );
                expect(timerSpy.firstCall.args[0]).to.equal(200);
            }
        });

        it('with scheduleWaitRandom < 0, delay is clamped to scheduleWaitBase and warns exactly once', function () {
            const loggerSpy = { fatal: sinon.spy(), error: sinon.spy(), warn: sinon.spy(), info: sinon.spy(), debug: sinon.spy() };
            sinon.stub(Debug(context).getInstance(), 'getLogger').returns(loggerSpy);

            const timerSpy = sinon.spy();
            makeHandler([{
                getScheduleController: () => ({ startScheduleTimer: timerSpy, setShouldCheckPlaybackQuality: sinon.spy() }),
                getType: () => 'video',
                getBufferController: () => ({ onPaddingLoaded: sinon.spy() }),
            }]);

            settings.update({ dodge: { scheduleWaitBase: 200, scheduleWaitRandom: -100 } });
            for (let i = 0; i < 10; i++) {
                timerSpy.resetHistory();
                eventBus.trigger(Events.MEDIA_FRAGMENT_PARTIAL,
                    { index: i, suppress: false, representation: {}, quality: 0, byteLength: 100, trail: false, buffer: false },
                    { streamId: 'stream-1', mediaType: 'video' }
                );
                // Clamped: delay is exactly the base on every call (no downward jitter).
                expect(timerSpy.firstCall.args[0]).to.equal(200);
            }

            const negativeWarnings = loggerSpy.warn.getCalls().filter(
                c => c.args[0] && c.args[0].indexOf('scheduleWaitRandom is negative') !== -1
            );
            expect(negativeWarnings.length).to.equal(1);
        });

        it('with scheduleWaitBase < 0, delay is clamped to 0 + random and warns exactly once', function () {
            const loggerSpy = { fatal: sinon.spy(), error: sinon.spy(), warn: sinon.spy(), info: sinon.spy(), debug: sinon.spy() };
            sinon.stub(Debug(context).getInstance(), 'getLogger').returns(loggerSpy);

            const timerSpy = sinon.spy();
            makeHandler([{
                getScheduleController: () => ({ startScheduleTimer: timerSpy, setShouldCheckPlaybackQuality: sinon.spy() }),
                getType: () => 'video',
                getBufferController: () => ({ onPaddingLoaded: sinon.spy() }),
            }]);

            settings.update({ dodge: { scheduleWaitBase: -100, scheduleWaitRandom: 50 } });
            for (let i = 0; i < 20; i++) {
                timerSpy.resetHistory();
                eventBus.trigger(Events.MEDIA_FRAGMENT_PARTIAL,
                    { index: i, suppress: false, representation: {}, quality: 0, byteLength: 100, trail: false, buffer: false },
                    { streamId: 'stream-1', mediaType: 'video' }
                );
                // Clamped base = 0, so delay is exactly the random jitter in [0, 50].
                const delay = timerSpy.firstCall.args[0];
                expect(delay).to.be.at.least(0);
                expect(delay).to.be.at.most(50);
            }

            const negativeWarnings = loggerSpy.warn.getCalls().filter(
                c => c.args[0] && c.args[0].indexOf('scheduleWaitBase is negative') !== -1
            );
            expect(negativeWarnings.length).to.equal(1);
        });

        it('_schedule only targets the stream processor matching the event mediaType', function () {
            const timerSpy1 = sinon.spy();
            const timerSpy2 = sinon.spy();

            makeHandler([
                {
                    getScheduleController: () => ({ startScheduleTimer: timerSpy1, setShouldCheckPlaybackQuality: sinon.spy() }),
                    getType: () => 'video',
                    getBufferController: () => ({ onPaddingLoaded: sinon.spy() }),
                },
                {
                    getScheduleController: () => ({ startScheduleTimer: timerSpy2, setShouldCheckPlaybackQuality: sinon.spy() }),
                    getType: () => 'audio',
                    getBufferController: () => ({ onPaddingLoaded: sinon.spy() }),
                },
            ]);

            eventBus.trigger(Events.MEDIA_FRAGMENT_PARTIAL,
                { index: 0, suppress: false, representation: {}, quality: 0, byteLength: 100, trail: false, buffer: false },
                { streamId: 'stream-1', mediaType: 'video' }
            );

            expect(timerSpy1.calledOnce).to.be.true; // jshint ignore:line
            expect(timerSpy2.called).to.be.false; // jshint ignore:line
        });

        it('audio event targets audio SP, does not affect video SP', function () {
            const videoTimerSpy = sinon.spy();
            const audioTimerSpy = sinon.spy();
            const videoQualitySpy = sinon.spy();
            const audioQualitySpy = sinon.spy();

            makeHandler([
                {
                    getScheduleController: () => ({ startScheduleTimer: videoTimerSpy, setShouldCheckPlaybackQuality: videoQualitySpy }),
                    getType: () => 'video',
                    getBufferController: () => ({ onPaddingLoaded: sinon.spy() }),
                },
                {
                    getScheduleController: () => ({ startScheduleTimer: audioTimerSpy, setShouldCheckPlaybackQuality: audioQualitySpy }),
                    getType: () => 'audio',
                    getBufferController: () => ({ onPaddingLoaded: sinon.spy() }),
                },
            ]);

            eventBus.trigger(Events.MEDIA_FRAGMENT_PARTIAL,
                { index: 0, suppress: false, representation: {}, quality: 0, byteLength: 100, trail: false, buffer: false },
                { streamId: 'stream-1', mediaType: 'audio' }
            );

            expect(audioTimerSpy.calledOnce).to.be.true; // jshint ignore:line
            expect(audioQualitySpy.calledOnceWith(false)).to.be.true; // jshint ignore:line
            expect(videoTimerSpy.called).to.be.false; // jshint ignore:line
            expect(videoQualitySpy.called).to.be.false; // jshint ignore:line
        });

        it('padding event for video does not route to audio buffer controller', function () {
            const videoPaddingSpy = sinon.spy();
            const audioPaddingSpy = sinon.spy();

            makeHandler([
                {
                    getScheduleController: () => ({ startScheduleTimer: sinon.spy(), setShouldCheckPlaybackQuality: sinon.spy() }),
                    getType: () => 'video',
                    getBufferController: () => ({ onPaddingLoaded: videoPaddingSpy }),
                },
                {
                    getScheduleController: () => ({ startScheduleTimer: sinon.spy(), setShouldCheckPlaybackQuality: sinon.spy() }),
                    getType: () => 'audio',
                    getBufferController: () => ({ onPaddingLoaded: audioPaddingSpy }),
                },
            ]);

            eventBus.trigger(Events.PADDING_LOADED,
                { index: 0, suppress: false, representation: { segmentDuration: 4 }, quality: 0, byteLength: 100, trail: true, buffer: true, bufferFlag: true },
                { streamId: 'stream-1', mediaType: 'video' }
            );

            expect(videoPaddingSpy.calledOnce).to.be.true; // jshint ignore:line
            expect(audioPaddingSpy.called).to.be.false; // jshint ignore:line
        });
    });

    // isDodgeActive / isDodgeTrailing

    describe('isDodgeActive and isDodgeTrailing', function () {
        let handler;

        function makeSP(defended, trailing) {
            return {
                getDashHandler: () => ({
                    getIsDefended: () => defended,
                    getIsTrailing: () => trailing,
                }),
                getType: () => 'video',
            };
        }

        function createHandlerWithSPs(streamProcessors) {
            const eventBus = EventBus(context).getInstance();
            const settings = Settings(context).getInstance();
            return DodgeHandler(context).create({
                eventBus,
                events: Events,
                settings,
                streamController: {
                    getActiveStreamProcessors: () => streamProcessors,
                },
                mediaPlayer: { extend: () => {} }
            });
        }

        afterEach(function () {
            if (handler) { handler.reset(); handler = null; }
        });

        it('isDodgeActive returns false when no stream processors are active', function () {
            handler = createHandlerWithSPs([]);
            expect(handler.isDodgeActive()).to.be.false; // jshint ignore:line
        });

        it('isDodgeTrailing returns false when no stream processors are active', function () {
            handler = createHandlerWithSPs([]);
            expect(handler.isDodgeTrailing()).to.be.false; // jshint ignore:line
        });

        it('isDodgeActive returns false when no SP is defended', function () {
            handler = createHandlerWithSPs([makeSP(false, false)]);
            expect(handler.isDodgeActive()).to.be.false; // jshint ignore:line
        });

        it('isDodgeActive returns true when any SP is defended', function () {
            handler = createHandlerWithSPs([
                makeSP(false, false), // audio, not defended
                makeSP(true, false), // video, defended
            ]);
            expect(handler.isDodgeActive()).to.be.true; // jshint ignore:line
        });

        it('isDodgeTrailing returns false when no SP is trailing', function () {
            handler = createHandlerWithSPs([makeSP(true, false)]);
            expect(handler.isDodgeTrailing()).to.be.false; // jshint ignore:line
        });

        it('isDodgeTrailing returns true when any SP is trailing', function () {
            handler = createHandlerWithSPs([
                makeSP(false, false), // audio, not trailing
                makeSP(true, true), // video, trailing
            ]);
            expect(handler.isDodgeTrailing()).to.be.true; // jshint ignore:line
        });

        it('isDodgeActive returns false when streamController is null', function () {
            const eventBus = EventBus(context).getInstance();
            const settings = Settings(context).getInstance();
            handler = DodgeHandler(context).create({
                eventBus,
                events: Events,
                settings,
                streamController: null,
                mediaPlayer: { extend: () => {} }
            });
            expect(handler.isDodgeActive()).to.be.false; // jshint ignore:line
            expect(handler.isDodgeTrailing()).to.be.false; // jshint ignore:line
        });
    });

    // Progressive append / finalize delegation to DefenseRegistry

    describe('progressive append and finalize delegation', function () {

        function makeProgressiveManifest(data) {
            return {
                start: { mpd: '<MPD/>', base_uri: 'https://example.com/' },
                streams: [{
                    label: 'video_1000k',
                    progressive: true,
                    init: [{ range: '-855' }],
                    data: data
                }]
            };
        }

        function loadProgressive(data) {
            dodgeHandler.tryProcessExtendedManifest(JSON.stringify(makeProgressiveManifest(data)));
            return DefenseRegistry(context).getInstance();
        }

        it('appendDataCycles appends a self-contained batch and returns true', function () {
            const registry = loadProgressive([{ index: 0, range: '0-100', buffer: true }]);
            expect(registry.getDefendedStreamInfo('video_1000k', null).data.length).to.equal(1);

            const ok = dodgeHandler.appendDataCycles('video_1000k', null, [{ index: 1, range: '0-100', buffer: true }]);
            expect(ok).to.be.true; // jshint ignore:line
            expect(registry.getDefendedStreamInfo('video_1000k', null).data.length).to.equal(2);
        });

        it('appendDataCycles returns false for an unknown label', function () {
            loadProgressive([{ index: 0, range: '0-100', buffer: true }]);
            expect(dodgeHandler.appendDataCycles('nonexistent', null, [{ index: 1, range: '0-100', buffer: true }])).to.be.false; // jshint ignore:line
        });

        it('appendDataCycles returns false for a non-progressive stream', function () {
            // makeValidManifest has no progressive flag
            dodgeHandler.tryProcessExtendedManifest(JSON.stringify(makeValidManifest()));
            expect(dodgeHandler.appendDataCycles('video_1000k', null, [{ index: 1, range: '0-100', buffer: true }])).to.be.false; // jshint ignore:line
        });

        it('finalizeStream clears the progressive flag and returns true', function () {
            const registry = loadProgressive([{ index: 0, range: '0-100', buffer: true }]);
            expect(registry.getDefendedStreamInfo('video_1000k', null).progressive).to.be.true; // jshint ignore:line

            expect(dodgeHandler.finalizeStream('video_1000k', null)).to.be.true; // jshint ignore:line
            expect(registry.getDefendedStreamInfo('video_1000k', null).progressive).to.be.false; // jshint ignore:line
        });

        it('finalizeStream appends trailing padding cycles', function () {
            const registry = loadProgressive([{ index: 0, range: '0-100', buffer: true }]);
            expect(dodgeHandler.finalizeStream('video_1000k', null, [{ index: 5, range: '0-100', padding: true }])).to.be.true; // jshint ignore:line
            expect(registry.getDefendedStreamInfo('video_1000k', null).data.length).to.equal(2);
        });

        it('appendDataCycles returns false after finalizeStream', function () {
            loadProgressive([{ index: 0, range: '0-100', buffer: true }]);
            dodgeHandler.finalizeStream('video_1000k', null);
            expect(dodgeHandler.appendDataCycles('video_1000k', null, [{ index: 1, range: '0-100', buffer: true }])).to.be.false; // jshint ignore:line
        });
    });

    // DRM NEED_KEY interception (warn only)

    describe('DRM NEED_KEY interception', function () {

        let eventBus, settings, logMessages, testListener;

        beforeEach(function () {
            context = {};
            eventBus = EventBus(context).getInstance();
            settings = Settings(context).getInstance();
            settings.update({ debug: { dispatchEvent: true, logLevel: Debug.LOG_LEVEL_WARNING } });
            Debug(context).getInstance({ settings: settings });
            testListener = {};
            logMessages = [];
            eventBus.on(Events.LOG, (e) => { logMessages.push(e); }, testListener);
            if (!Events.NEED_KEY) {
                Events.NEED_KEY = 'needkey';
            }
            if (!Events.KEY_SESSION_CREATED) {
                Events.KEY_SESSION_CREATED = 'public_keySessionCreated';
            }
        });

        function createDodgeHandler(strictMode) {
            if (strictMode !== undefined) {
                settings.update({ dodge: { strictMode: strictMode } });
            }
            const handler = DodgeHandler(context).create({
                eventBus,
                events: Events,
                settings,
                streamController: null,
                mediaPlayer: { extend: () => {}, updateSettings: () => {} }
            });
            handler.registerEvents();
            return handler;
        }

        it('does not fire ERROR on NEED_KEY during defended playback', function () {
            const handler = createDodgeHandler('representation');
            handler.tryProcessExtendedManifest(JSON.stringify(makeValidManifest()), 'test.exmfst.json');

            let errorFired = false;
            eventBus.on(Events.ERROR, function () {
                errorFired = true;
            }, this);

            eventBus.trigger(Events.NEED_KEY, { key: {} });
            expect(errorFired).to.be.false; // jshint ignore:line
            expect(logMessages.some(m => m.level === Debug.LOG_LEVEL_WARNING && m.message.includes('DRM key request'))).to.be.true; // jshint ignore:line
            handler.reset();
        });

        it('no extended manifest loaded: ignores NEED_KEY', function () {
            const handler = createDodgeHandler('representation');

            let errorFired = false;
            eventBus.on(Events.ERROR, function () {
                errorFired = true;
            }, this);

            eventBus.trigger(Events.NEED_KEY, { key: {} });
            expect(errorFired).to.be.false; // jshint ignore:line
            expect(logMessages.filter(m => m.level === Debug.LOG_LEVEL_WARNING && m.message.includes('DRM key request')).length).to.equal(0);
            handler.reset();
        });
    });

    // DRM key session detection (warn-only diagnostic)

    describe('DRM key session detection', function () {

        let eventBus, settings;

        beforeEach(function () {
            context = {};
            eventBus = EventBus(context).getInstance();
            settings = Settings(context).getInstance();
            if (!Events.KEY_SESSION_CREATED) {
                Events.KEY_SESSION_CREATED = 'public_keySessionCreated';
            }
        });

        function createDodgeHandler(strictMode) {
            if (strictMode !== undefined) {
                settings.update({ dodge: { strictMode: strictMode } });
            }
            const handler = DodgeHandler(context).create({
                eventBus,
                events: Events,
                settings,
                streamController: null,
                mediaPlayer: { extend: () => {}, updateSettings: () => {} }
            });
            handler.registerEvents();
            return handler;
        }

        it('does not fire ERROR when key session created during defended playback (warn only)', function () {
            const handler = createDodgeHandler('representation');
            handler.tryProcessExtendedManifest(JSON.stringify(makeValidManifest()), 'test.exmfst.json');

            let errorFired = false;
            eventBus.on(Events.ERROR, function () {
                errorFired = true;
            }, this);

            eventBus.trigger(Events.KEY_SESSION_CREATED, { data: {} });
            expect(errorFired).to.be.false; // jshint ignore:line
            handler.reset();
        });

        it('no extended manifest loaded: ignores key session event', function () {
            const handler = createDodgeHandler('representation');

            let errorFired = false;
            eventBus.on(Events.ERROR, function () {
                errorFired = true;
            }, this);

            eventBus.trigger(Events.KEY_SESSION_CREATED, { data: {} });
            expect(errorFired).to.be.false; // jshint ignore:line
            handler.reset();
        });

        it('key session error events are ignored', function () {
            const handler = createDodgeHandler('representation');
            handler.tryProcessExtendedManifest(JSON.stringify(makeValidManifest()), 'test.exmfst.json');

            let errorFired = false;
            eventBus.on(Events.ERROR, function () {
                errorFired = true;
            }, this);

            eventBus.trigger(Events.KEY_SESSION_CREATED, { data: null, error: { code: 113 } });
            expect(errorFired).to.be.false; // jshint ignore:line
            handler.reset();
        });
    });

    // DRM content detection in extended manifest

    describe('DRM content detection in tryProcessExtendedManifest', function () {

        let eventBus, settings, logMessages, testListener;

        beforeEach(function () {
            context = {};
            eventBus = EventBus(context).getInstance();
            settings = Settings(context).getInstance();
            settings.update({ debug: { dispatchEvent: true, logLevel: Debug.LOG_LEVEL_WARNING } });
            Debug(context).getInstance({ settings: settings });
            testListener = {};
            logMessages = [];
            eventBus.on(Events.LOG, (e) => { logMessages.push(e); }, testListener);
        });

        function createDodgeHandler(strictMode) {
            if (strictMode !== undefined) {
                settings.update({ dodge: { strictMode: strictMode } });
            }
            return DodgeHandler(context).create({
                eventBus,
                events: Events,
                settings,
                streamController: null,
                mediaPlayer: { extend: () => {}, updateSettings: () => {} }
            });
        }

        function makeDrmManifest() {
            return {
                start: {
                    mpd: '<MPD><Period><AdaptationSet><ContentProtection schemeIdUri="urn:uuid:edef8ba9-79d6-4ace-a3c8-27dcd51d21ed"/><Representation id="v" bandwidth="1000000"/></AdaptationSet></Period></MPD>',
                    base_uri: 'https://example.com/'
                },
                streams: [{
                    label: 'v',
                    init: [{}],
                    data: [{ index: 0, buffer: true }]
                }]
            };
        }

        it('accepts manifest containing DRM in all strict modes', function () {
            const handler = createDodgeHandler('representation');
            const result = handler.tryProcessExtendedManifest(JSON.stringify(makeDrmManifest()), 'test.exmfst.json');
            expect(result).to.exist; // jshint ignore:line
            expect(result.mpd).to.include('ContentProtection');
            expect(logMessages.some(m => m.level === Debug.LOG_LEVEL_WARNING && m.message.includes('DRM'))).to.be.true; // jshint ignore:line
            handler.reset();
        });

        it('strict mode off: no DRM warning', function () {
            const handler = createDodgeHandler(false);
            handler.tryProcessExtendedManifest(JSON.stringify(makeDrmManifest()), 'test.exmfst.json');
            expect(logMessages.filter(m => m.level === Debug.LOG_LEVEL_WARNING && m.message.includes('DRM')).length).to.equal(0);
            handler.reset();
        });

        it('manifest without DRM: accepted in all modes', function () {
            const handler = createDodgeHandler('representation');
            const result = handler.tryProcessExtendedManifest(JSON.stringify(makeValidManifest()), 'test.exmfst.json');
            expect(result).to.exist; // jshint ignore:line
            expect(result.mpd).to.equal('<MPD/>');
            handler.reset();
        });
    });

    // Thumbnail track detection in extended manifest

    describe('Thumbnail track detection in tryProcessExtendedManifest', function () {

        let eventBus, settings, logMessages, testListener;

        beforeEach(function () {
            context = {};
            eventBus = EventBus(context).getInstance();
            settings = Settings(context).getInstance();
            settings.update({ debug: { dispatchEvent: true, logLevel: Debug.LOG_LEVEL_WARNING } });
            Debug(context).getInstance({ settings: settings });
            testListener = {};
            logMessages = [];
            eventBus.on(Events.LOG, (e) => { logMessages.push(e); }, testListener);
        });

        function createDodgeHandler(strictMode) {
            if (strictMode !== undefined) {
                settings.update({ dodge: { strictMode: strictMode } });
            }
            return DodgeHandler(context).create({
                eventBus,
                events: Events,
                settings,
                streamController: null,
                mediaPlayer: { extend: () => {}, updateSettings: () => {} }
            });
        }

        function makeThumbnailManifest() {
            return {
                start: {
                    mpd: '<MPD><Period><AdaptationSet mimeType="image/jpeg"><EssentialProperty schemeIdUri="http://dashif.org/guidelines/thumbnail_tile" value="10x1"/><Representation id="thumb" bandwidth="2000" width="3200" height="180"/></AdaptationSet></Period></MPD>',
                    base_uri: 'https://example.com/'
                },
                streams: [{
                    label: 'thumb',
                    init: [{}],
                    data: [{ index: 0, buffer: true }]
                }]
            };
        }

        it('strict mode representation: accepts manifest containing thumbnail tracks with warning', function () {
            const handler = createDodgeHandler('representation');
            const result = handler.tryProcessExtendedManifest(JSON.stringify(makeThumbnailManifest()), 'test.exmfst.json');
            expect(result).to.exist; // jshint ignore:line
            expect(result.mpd).to.include('thumbnail_tile');
            expect(logMessages.some(m => m.level === Debug.LOG_LEVEL_WARNING && m.message.includes('thumbnail'))).to.be.true; // jshint ignore:line
            handler.reset();
        });

        it('strict mode manifest: accepts manifest containing thumbnail tracks with warning', function () {
            const handler = createDodgeHandler('manifest');
            const result = handler.tryProcessExtendedManifest(JSON.stringify(makeThumbnailManifest()), 'test.exmfst.json');
            expect(result).to.exist; // jshint ignore:line
            expect(result.mpd).to.include('thumbnail_tile');
            expect(logMessages.some(m => m.level === Debug.LOG_LEVEL_WARNING && m.message.includes('thumbnail'))).to.be.true; // jshint ignore:line
            handler.reset();
        });

        it('strict mode max: rejects manifest containing thumbnail tracks', function () {
            const handler = createDodgeHandler('max');
            const result = handler.tryProcessExtendedManifest(JSON.stringify(makeThumbnailManifest()), 'test.exmfst.json');
            expect(result).to.be.false; // jshint ignore:line
            handler.reset();
        });

        it('strict mode off: accepts manifest containing thumbnail tracks without warning', function () {
            const handler = createDodgeHandler(false);
            const result = handler.tryProcessExtendedManifest(JSON.stringify(makeThumbnailManifest()), 'test.exmfst.json');
            expect(result).to.exist; // jshint ignore:line
            expect(result.mpd).to.include('thumbnail_tile');
            expect(logMessages.filter(m => m.level === Debug.LOG_LEVEL_WARNING && m.message.includes('thumbnail')).length).to.equal(0);
            handler.reset();
        });

        it('manifest without thumbnails: accepted in all modes', function () {
            const handler = createDodgeHandler('representation');
            const result = handler.tryProcessExtendedManifest(JSON.stringify(makeValidManifest()), 'test.exmfst.json');
            expect(result).to.exist; // jshint ignore:line
            handler.reset();
        });
    });

    // Content Steering detection in extended manifest

    describe('Content Steering detection in tryProcessExtendedManifest', function () {

        let eventBus, settings, logMessages, testListener;

        beforeEach(function () {
            context = {};
            eventBus = EventBus(context).getInstance();
            settings = Settings(context).getInstance();
            settings.update({ debug: { dispatchEvent: true, logLevel: Debug.LOG_LEVEL_WARNING } });
            Debug(context).getInstance({ settings: settings });
            testListener = {};
            logMessages = [];
            eventBus.on(Events.LOG, (e) => { logMessages.push(e); }, testListener);
        });

        function createDodgeHandler(strictMode) {
            if (strictMode !== undefined) {
                settings.update({ dodge: { strictMode: strictMode } });
            }
            return DodgeHandler(context).create({
                eventBus,
                events: Events,
                settings,
                streamController: null,
                mediaPlayer: { extend: () => {}, updateSettings: () => {} }
            });
        }

        function makeContentSteeringManifest() {
            return {
                start: {
                    mpd: '<MPD><ContentSteering defaultServiceLocation="cdn1" queryBeforeStart="true">https://steering.example.com/dash</ContentSteering><Period><AdaptationSet><Representation id="v" bandwidth="1000000"/></AdaptationSet></Period></MPD>',
                    base_uri: 'https://example.com/'
                },
                streams: [{
                    label: 'v',
                    init: [{}],
                    data: [{ index: 0, buffer: true }]
                }]
            };
        }

        it('accepts manifest containing ContentSteering in all strict modes', function () {
            const handler = createDodgeHandler('representation');
            const result = handler.tryProcessExtendedManifest(JSON.stringify(makeContentSteeringManifest()), 'test.exmfst.json');
            expect(result).to.exist; // jshint ignore:line
            expect(result.mpd).to.include('ContentSteering');
            expect(logMessages.some(m => m.level === Debug.LOG_LEVEL_WARNING && m.message.includes('ContentSteering'))).to.be.true; // jshint ignore:line
            handler.reset();
        });

        it('strict mode off: no ContentSteering warning', function () {
            const handler = createDodgeHandler(false);
            handler.tryProcessExtendedManifest(JSON.stringify(makeContentSteeringManifest()), 'test.exmfst.json');
            expect(logMessages.filter(m => m.level === Debug.LOG_LEVEL_WARNING && m.message.includes('ContentSteering')).length).to.equal(0);
            handler.reset();
        });

        it('manifest without ContentSteering: accepted in all modes', function () {
            const handler = createDodgeHandler('representation');
            const result = handler.tryProcessExtendedManifest(JSON.stringify(makeValidManifest()), 'test.exmfst.json');
            expect(result).to.exist; // jshint ignore:line
            handler.reset();
        });
    });

    // XLink detection in extended manifest

    describe('XLink detection in tryProcessExtendedManifest', function () {

        let eventBus, settings, logMessages, testListener;

        beforeEach(function () {
            context = {};
            eventBus = EventBus(context).getInstance();
            settings = Settings(context).getInstance();
            settings.update({ debug: { dispatchEvent: true, logLevel: Debug.LOG_LEVEL_WARNING } });
            Debug(context).getInstance({ settings: settings });
            testListener = {};
            logMessages = [];
            eventBus.on(Events.LOG, (e) => { logMessages.push(e); }, testListener);
        });

        function createDodgeHandler(strictMode) {
            if (strictMode !== undefined) {
                settings.update({ dodge: { strictMode: strictMode } });
            }
            return DodgeHandler(context).create({
                eventBus,
                events: Events,
                settings,
                streamController: null,
                mediaPlayer: { extend: () => {}, updateSettings: () => {} }
            });
        }

        function makeXLinkManifest() {
            return {
                start: {
                    mpd: '<MPD><Period xlink:href="https://example.com/period.xml" xlink:actuate="onLoad"><AdaptationSet><Representation id="v" bandwidth="1000000"/></AdaptationSet></Period></MPD>',
                    base_uri: 'https://example.com/'
                },
                streams: [{
                    label: 'v',
                    init: [{}],
                    data: [{ index: 0, buffer: true }]
                }]
            };
        }

        it('strict mode representation: accepts manifest containing XLink with warning', function () {
            const handler = createDodgeHandler('representation');
            const result = handler.tryProcessExtendedManifest(JSON.stringify(makeXLinkManifest()), 'test.exmfst.json');
            expect(result).to.exist; // jshint ignore:line
            expect(result.mpd).to.include('xlink:href');
            expect(logMessages.some(m => m.level === Debug.LOG_LEVEL_WARNING && m.message.includes('XLink'))).to.be.true; // jshint ignore:line
            handler.reset();
        });

        it('strict mode manifest: accepts manifest containing XLink with warning', function () {
            const handler = createDodgeHandler('manifest');
            const result = handler.tryProcessExtendedManifest(JSON.stringify(makeXLinkManifest()), 'test.exmfst.json');
            expect(result).to.exist; // jshint ignore:line
            expect(result.mpd).to.include('xlink:href');
            expect(logMessages.some(m => m.level === Debug.LOG_LEVEL_WARNING && m.message.includes('XLink'))).to.be.true; // jshint ignore:line
            handler.reset();
        });

        it('strict mode max: rejects manifest containing XLink', function () {
            const handler = createDodgeHandler('max');
            const result = handler.tryProcessExtendedManifest(JSON.stringify(makeXLinkManifest()), 'test.exmfst.json');
            expect(result).to.be.false; // jshint ignore:line
            handler.reset();
        });

        it('strict mode off: accepts manifest containing XLink without warning', function () {
            const handler = createDodgeHandler(false);
            const result = handler.tryProcessExtendedManifest(JSON.stringify(makeXLinkManifest()), 'test.exmfst.json');
            expect(result).to.exist; // jshint ignore:line
            expect(result.mpd).to.include('xlink:href');
            expect(logMessages.filter(m => m.level === Debug.LOG_LEVEL_WARNING && m.message.includes('XLink')).length).to.equal(0);
            handler.reset();
        });

        it('manifest without XLink: accepted in all modes', function () {
            const handler = createDodgeHandler('representation');
            const result = handler.tryProcessExtendedManifest(JSON.stringify(makeValidManifest()), 'test.exmfst.json');
            expect(result).to.exist; // jshint ignore:line
            handler.reset();
        });
    });

    // DVB Reporting detection in extended manifest

    describe('DVB Reporting detection in tryProcessExtendedManifest', function () {

        let eventBus, settings, logMessages, testListener;

        beforeEach(function () {
            context = {};
            eventBus = EventBus(context).getInstance();
            settings = Settings(context).getInstance();
            settings.update({ debug: { dispatchEvent: true, logLevel: Debug.LOG_LEVEL_WARNING } });
            Debug(context).getInstance({ settings: settings });
            testListener = {};
            logMessages = [];
            eventBus.on(Events.LOG, (e) => { logMessages.push(e); }, testListener);
        });

        function createDodgeHandler(strictMode) {
            if (strictMode !== undefined) {
                settings.update({ dodge: { strictMode: strictMode } });
            }
            return DodgeHandler(context).create({
                eventBus,
                events: Events,
                settings,
                streamController: null,
                mediaPlayer: { extend: () => {}, updateSettings: () => {} }
            });
        }

        function makeDvbReportingManifest() {
            return {
                start: {
                    mpd: '<MPD><Period><AdaptationSet><Representation id="v" bandwidth="1000000"/></AdaptationSet></Period><Metrics metrics="DVBErrors"><Reporting schemeIdUri="urn:dvb:dash:reporting:2014" value="1" dvb:reportingUrl="https://report.example.com/"/></Metrics></MPD>',
                    base_uri: 'https://example.com/'
                },
                streams: [{
                    label: 'v',
                    init: [{}],
                    data: [{ index: 0, buffer: true }]
                }]
            };
        }

        it('accepts manifest containing DVB Reporting in all strict modes', function () {
            const handler = createDodgeHandler('representation');
            const result = handler.tryProcessExtendedManifest(JSON.stringify(makeDvbReportingManifest()), 'test.exmfst.json');
            expect(result).to.exist; // jshint ignore:line
            expect(result.mpd).to.include('<Reporting');
            expect(logMessages.some(m => m.level === Debug.LOG_LEVEL_WARNING && m.message.includes('Reporting'))).to.be.true; // jshint ignore:line
            handler.reset();
        });

        it('strict mode off: no DVB Reporting warning', function () {
            const handler = createDodgeHandler(false);
            handler.tryProcessExtendedManifest(JSON.stringify(makeDvbReportingManifest()), 'test.exmfst.json');
            expect(logMessages.filter(m => m.level === Debug.LOG_LEVEL_WARNING && m.message.includes('Reporting')).length).to.equal(0);
            handler.reset();
        });

        it('manifest without DVB Reporting: accepted in all modes', function () {
            const handler = createDodgeHandler('representation');
            const result = handler.tryProcessExtendedManifest(JSON.stringify(makeValidManifest()), 'test.exmfst.json');
            expect(result).to.exist; // jshint ignore:line
            handler.reset();
        });
    });

    // Non-fragmented text detection in extended manifest

    describe('Non-fragmented text detection in tryProcessExtendedManifest', function () {

        let eventBus, settings, logMessages, testListener;

        beforeEach(function () {
            context = {};
            eventBus = EventBus(context).getInstance();
            settings = Settings(context).getInstance();
            settings.update({ debug: { dispatchEvent: true, logLevel: Debug.LOG_LEVEL_WARNING } });
            Debug(context).getInstance({ settings: settings });
            testListener = {};
            logMessages = [];
            eventBus.on(Events.LOG, (e) => { logMessages.push(e); }, testListener);
        });

        function createDodgeHandler(strictMode) {
            if (strictMode !== undefined) {
                settings.update({ dodge: { strictMode: strictMode } });
            }
            return DodgeHandler(context).create({
                eventBus,
                events: Events,
                settings,
                streamController: null,
                mediaPlayer: { extend: () => {}, updateSettings: () => {} }
            });
        }

        function makeNonFragmentedTextManifest() {
            return {
                start: {
                    mpd: '<MPD><Period><AdaptationSet mimeType="application/ttml+xml"><Representation id="sub" bandwidth="1000"/></AdaptationSet><AdaptationSet><Representation id="v" bandwidth="1000000"/></AdaptationSet></Period></MPD>',
                    base_uri: 'https://example.com/'
                },
                streams: [{
                    label: 'v',
                    init: [{}],
                    data: [{ index: 0, buffer: true }]
                }]
            };
        }

        it('strict mode representation: accepts manifest containing non-fragmented text with warning', function () {
            const handler = createDodgeHandler('representation');
            const result = handler.tryProcessExtendedManifest(JSON.stringify(makeNonFragmentedTextManifest()), 'test.exmfst.json');
            expect(result).to.exist; // jshint ignore:line
            expect(result.mpd).to.include('application/ttml+xml');
            expect(logMessages.some(m => m.level === Debug.LOG_LEVEL_WARNING && m.message.includes('non-fragmented text'))).to.be.true; // jshint ignore:line
            handler.reset();
        });

        it('strict mode manifest: accepts manifest containing non-fragmented text with warning', function () {
            const handler = createDodgeHandler('manifest');
            const result = handler.tryProcessExtendedManifest(JSON.stringify(makeNonFragmentedTextManifest()), 'test.exmfst.json');
            expect(result).to.exist; // jshint ignore:line
            expect(result.mpd).to.include('application/ttml+xml');
            expect(logMessages.some(m => m.level === Debug.LOG_LEVEL_WARNING && m.message.includes('non-fragmented text'))).to.be.true; // jshint ignore:line
            handler.reset();
        });

        it('strict mode max: rejects manifest containing non-fragmented text', function () {
            const handler = createDodgeHandler('max');
            const result = handler.tryProcessExtendedManifest(JSON.stringify(makeNonFragmentedTextManifest()), 'test.exmfst.json');
            expect(result).to.be.false; // jshint ignore:line
            handler.reset();
        });

        it('strict mode off: accepts manifest containing non-fragmented text without warning', function () {
            const handler = createDodgeHandler(false);
            const result = handler.tryProcessExtendedManifest(JSON.stringify(makeNonFragmentedTextManifest()), 'test.exmfst.json');
            expect(result).to.exist; // jshint ignore:line
            expect(result.mpd).to.include('application/ttml+xml');
            expect(logMessages.filter(m => m.level === Debug.LOG_LEVEL_WARNING && m.message.includes('non-fragmented text')).length).to.equal(0);
            handler.reset();
        });

        it('manifest without non-fragmented text: accepted in all modes', function () {
            const handler = createDodgeHandler('max');
            const result = handler.tryProcessExtendedManifest(JSON.stringify(makeValidManifest()), 'test.exmfst.json');
            expect(result).to.exist; // jshint ignore:line
            handler.reset();
        });
    });

    // CMCD warning in tryProcessExtendedManifest

    describe('CMCD warning in tryProcessExtendedManifest', function () {

        let eventBus, settings, logMessages, testListener;

        beforeEach(function () {
            context = {};
            eventBus = EventBus(context).getInstance();
            settings = Settings(context).getInstance();
            settings.update({ debug: { dispatchEvent: true, logLevel: Debug.LOG_LEVEL_WARNING } });
            Debug(context).getInstance({ settings: settings });
            testListener = {};
            logMessages = [];
            eventBus.on(Events.LOG, (e) => { logMessages.push(e); }, testListener);
        });

        function createDodgeHandler(strictMode, cmcdEnabled) {
            if (strictMode !== undefined) {
                settings.update({ dodge: { strictMode: strictMode } });
            }
            if (cmcdEnabled !== undefined) {
                settings.update({ streaming: { cmcd: { enabled: cmcdEnabled } } });
            }
            return DodgeHandler(context).create({
                eventBus,
                events: Events,
                settings,
                streamController: null,
                mediaPlayer: { extend: () => {}, updateSettings: () => {} }
            });
        }

        it('CMCD enabled with strict mode off: no CMCD warning', function () {
            const handler = createDodgeHandler(false, true);
            const result = handler.tryProcessExtendedManifest(JSON.stringify(makeValidManifest()), 'test.exmfst.json');
            expect(result).to.exist; // jshint ignore:line
            expect(logMessages.filter(m => m.level === Debug.LOG_LEVEL_WARNING && m.message.includes('CMCD')).length).to.equal(0);
            handler.reset();
        });

        it('CMCD enabled with strict mode representation: warns about CMCD', function () {
            const handler = createDodgeHandler('representation', true);
            const result = handler.tryProcessExtendedManifest(JSON.stringify(makeValidManifest()), 'test.exmfst.json');
            expect(result).to.exist; // jshint ignore:line
            expect(logMessages.some(m => m.level === Debug.LOG_LEVEL_WARNING && m.message.includes('CMCD'))).to.be.true; // jshint ignore:line
            handler.reset();
        });

        it('CMCD disabled: no warning', function () {
            const handler = createDodgeHandler('representation', false);
            const result = handler.tryProcessExtendedManifest(JSON.stringify(makeValidManifest()), 'test.exmfst.json');
            expect(result).to.exist; // jshint ignore:line
            expect(logMessages.filter(m => m.level === Debug.LOG_LEVEL_WARNING && m.message.includes('CMCD')).length).to.equal(0);
            handler.reset();
        });
    });

    // cacheInitSegments warning in tryProcessExtendedManifest

    describe('cacheInitSegments warning in tryProcessExtendedManifest', function () {

        const MULTI_REP_MPD = '<MPD xmlns="urn:mpeg:dash:schema:mpd:2011"><Period><AdaptationSet mimeType="video/mp4"><Representation id="video_500k" bandwidth="500000"/><Representation id="video_1000k" bandwidth="1000000"/></AdaptationSet></Period></MPD>';
        const SINGLE_REP_MPD = '<MPD xmlns="urn:mpeg:dash:schema:mpd:2011"><Period><AdaptationSet mimeType="video/mp4"><Representation id="video_1000k" bandwidth="1000000"/></AdaptationSet></Period></MPD>';

        function makeManifest(mpd) {
            return { start: { mpd, base_uri: 'https://example.com/' },
                streams: [{ label: 'video_1000k', init: [{ range: '-855' }], data: [{ index: 0, buffer: true }] }] };
        }

        let eventBus, settings, logMessages, testListener;

        beforeEach(function () {
            context = {};
            eventBus = EventBus(context).getInstance();
            settings = Settings(context).getInstance();
            settings.update({ debug: { dispatchEvent: true, logLevel: Debug.LOG_LEVEL_WARNING } });
            Debug(context).getInstance({ settings: settings });
            testListener = {};
            logMessages = [];
            eventBus.on(Events.LOG, (e) => { logMessages.push(e); }, testListener);
        });

        function createDodgeHandler(cacheInitSegments, strictMode) {
            settings.update({ streaming: { cacheInitSegments }, dodge: { strictMode } });
            return DodgeHandler(context).create({
                eventBus, events: Events, settings,
                streamController: null,
                mediaPlayer: { extend: () => {}, updateSettings: () => {} }
            });
        }

        function hasCacheWarn() {
            return logMessages.some(m => m.level === Debug.LOG_LEVEL_WARNING && m.message.includes('cacheInitSegments'));
        }

        it('cacheInitSegments enabled, multiple representations, strict: warns', function () {
            const handler = createDodgeHandler(true, 'representation');
            handler.tryProcessExtendedManifest(JSON.stringify(makeManifest(MULTI_REP_MPD)), 'test.exmfst.json');
            expect(hasCacheWarn()).to.be.true; // jshint ignore:line
            handler.reset();
        });

        it('cacheInitSegments enabled, single representation, strict: still warns', function () {
            const handler = createDodgeHandler(true, 'representation');
            handler.tryProcessExtendedManifest(JSON.stringify(makeManifest(SINGLE_REP_MPD)), 'test.exmfst.json');
            expect(hasCacheWarn()).to.be.true; // jshint ignore:line
            handler.reset();
        });

        it('cacheInitSegments disabled, multiple representations: no warning', function () {
            const handler = createDodgeHandler(false, 'representation');
            handler.tryProcessExtendedManifest(JSON.stringify(makeManifest(MULTI_REP_MPD)), 'test.exmfst.json');
            expect(hasCacheWarn()).to.be.false; // jshint ignore:line
            handler.reset();
        });

        it('strictMode off: no warning even with cache enabled', function () {
            const handler = createDodgeHandler(true, false);
            handler.tryProcessExtendedManifest(JSON.stringify(makeManifest(MULTI_REP_MPD)), 'test.exmfst.json');
            expect(hasCacheWarn()).to.be.false; // jshint ignore:line
            handler.reset();
        });
    });

    describe('_concatPartialSegments via _onFragmentLoadingCompleted', function () {
        let handler, eventBus, settings;
        let loadedSpy, testListener;

        function makeRequest(overrides) {
            return Object.assign({
                full: false, padding: false, buffer: false, trail: false,
                index: 0, mediaType: 'video', type: 'MediaSegment', quality: 0,
                duration: 4, startTime: 0, mediaStartTime: 0,
                originalRange: null, range: null, bandwidth: 1000,
                adaptationIndex: 0, timescale: 1,
                availabilityStartTime: 0, availabilityEndTime: Infinity,
                availabilityTimeComplete: true, wallStartTime: 0,
                replacementNumber: 0, replacementTime: 0,
                representation: {
                    id: 'rep0', bandwidth: 1000,
                    adaptation: { index: 0, period: { index: 0, start: 0, duration: 100 } },
                    mediaInfo: { type: 'video', streamInfo: { id: 'stream-1' } }
                },
                isInitializationRequest: () => false,
            }, overrides || {});
        }

        function triggerFragmentLoaded(request, responseBytes) {
            const e = {
                sender: { context: 'test' },
                request,
                response: responseBytes || new ArrayBuffer(8),
                error: null,
            };
            eventBus.trigger(Events.FRAGMENT_LOADING_COMPLETED, e, { streamId: 'stream-1' });
            return e;
        }

        beforeEach(function () {
            eventBus = EventBus(context).getInstance();
            settings = Settings(context).getInstance();

            handler = DodgeHandler(context).create({
                eventBus, events: Events, settings,
                streamController: null,
                mediaPlayer: { extend: () => {} }
            });
            handler.registerEvents();

            testListener = {};
            loadedSpy = sinon.spy();
            eventBus.on(Events.MEDIA_FRAGMENT_LOADED, loadedSpy, testListener);
        });

        afterEach(function () {
            eventBus.off(Events.MEDIA_FRAGMENT_LOADED, loadedSpy, testListener);
            handler.reset();
        });

        it('single piece without range info: assembles using 0 to byteLength - 1', function () {
            // A single full+buffer request with no range info: rangeEnd = 0 + byteLength - 1
            const bytes = new Uint8Array([10, 20, 30]).buffer;
            triggerFragmentLoaded(makeRequest({ full: true, buffer: true, range: null, originalRange: null }), bytes);

            expect(loadedSpy.calledOnce).to.be.true; // jshint ignore:line
            const chunk = loadedSpy.firstCall.args[0].chunk;
            expect(chunk.bytes.length).to.equal(3);
            expect(Array.from(chunk.bytes)).to.deep.equal([10, 20, 30]);
        });

        it('multiple pieces with contiguous ranges: merged correctly', function () {
            // Piece 1: range 0-3 (4 bytes)
            const bytes1 = new Uint8Array([1, 2, 3, 4]).buffer;
            triggerFragmentLoaded(makeRequest({ full: false, buffer: false, range: '0-3' }), bytes1);

            // Piece 2: range 4-7 (4 bytes), full + buffer to trigger assembly
            const bytes2 = new Uint8Array([5, 6, 7, 8]).buffer;
            triggerFragmentLoaded(makeRequest({ full: true, buffer: true, range: '4-7' }), bytes2);

            expect(loadedSpy.calledOnce).to.be.true; // jshint ignore:line
            const chunk = loadedSpy.firstCall.args[0].chunk;
            expect(chunk.bytes.length).to.equal(8);
            expect(Array.from(chunk.bytes)).to.deep.equal([1, 2, 3, 4, 5, 6, 7, 8]);
        });

        it('multiple pieces with non-contiguous ranges: gap filled with zeros', function () {
            // Piece 1: range 0-1
            const bytes1 = new Uint8Array([10, 20]).buffer;
            triggerFragmentLoaded(makeRequest({ full: false, buffer: false, range: '0-1' }), bytes1);

            // Piece 2: range 4-5 (gap at 2-3)
            const bytes2 = new Uint8Array([50, 60]).buffer;
            triggerFragmentLoaded(makeRequest({ full: true, buffer: true, range: '4-5' }), bytes2);

            expect(loadedSpy.calledOnce).to.be.true; // jshint ignore:line
            const chunk = loadedSpy.firstCall.args[0].chunk;
            expect(chunk.bytes.length).to.equal(6);
            expect(Array.from(chunk.bytes)).to.deep.equal([10, 20, 0, 0, 50, 60]);
        });

        it('pieces placed by range offset regardless of insertion order', function () {
            // Insert range 4-7 first, then 0-3
            const bytes1 = new Uint8Array([5, 6, 7, 8]).buffer;
            triggerFragmentLoaded(makeRequest({ full: false, buffer: false, range: '4-7' }), bytes1);

            const bytes2 = new Uint8Array([1, 2, 3, 4]).buffer;
            triggerFragmentLoaded(makeRequest({ full: true, buffer: true, range: '0-3' }), bytes2);

            expect(loadedSpy.calledOnce).to.be.true; // jshint ignore:line
            const chunk = loadedSpy.firstCall.args[0].chunk;
            expect(Array.from(chunk.bytes)).to.deep.equal([1, 2, 3, 4, 5, 6, 7, 8]);
        });

        it('NaN index matching for init segments', function () {
            const initLoadedSpy = sinon.spy();
            eventBus.on(Events.INIT_FRAGMENT_LOADED, initLoadedSpy, testListener);

            const bytes1 = new Uint8Array([0xAA, 0xBB]).buffer;
            triggerFragmentLoaded(makeRequest({
                full: false, buffer: false, range: '0-1',
                index: NaN, isInitializationRequest: () => true,
            }), bytes1);

            const bytes2 = new Uint8Array([0xCC, 0xDD]).buffer;
            triggerFragmentLoaded(makeRequest({
                full: true, buffer: true, range: '2-3',
                index: NaN, isInitializationRequest: () => true,
            }), bytes2);

            expect(initLoadedSpy.calledOnce).to.be.true; // jshint ignore:line
            const chunk = initLoadedSpy.firstCall.args[0].chunk;
            expect(chunk.bytes.length).to.equal(4);
            expect(Array.from(chunk.bytes)).to.deep.equal([0xAA, 0xBB, 0xCC, 0xDD]);

            eventBus.off(Events.INIT_FRAGMENT_LOADED, initLoadedSpy, testListener);
        });

        it('unmatched pieces are not consumed: different mediaType is not assembled', function () {
            // Partial for audio
            triggerFragmentLoaded(makeRequest({
                full: false, buffer: false, range: '0-3', mediaType: 'audio',
                representation: {
                    id: 'rep0', bandwidth: 1000,
                    adaptation: { index: 0, period: { index: 0, start: 0, duration: 100 } },
                    mediaInfo: { type: 'audio', streamInfo: { id: 'stream-1' } }
                },
            }), new Uint8Array([1, 2, 3, 4]).buffer);

            // Full+buffer for video should not pick up the audio partial
            triggerFragmentLoaded(makeRequest({ full: true, buffer: true, range: '0-1' }), new Uint8Array([9, 10]).buffer);

            expect(loadedSpy.calledOnce).to.be.true; // jshint ignore:line
            const chunk = loadedSpy.firstCall.args[0].chunk;
            expect(chunk.bytes.length).to.equal(2);
            expect(Array.from(chunk.bytes)).to.deep.equal([9, 10]);

            // The audio partial should still be in the queue
            expect(handler.getStreamStats('stream-1').partialSegments).to.equal(1);
        });

        it('originalRange is used when available, range overrides it', function () {
            // The code first parses originalRange, then range. The range values override.
            // originalRange: '100-199', range: '0-3' -> rangeStart = 0, rangeEnd = 3
            const bytes1 = new Uint8Array([1, 2, 3, 4]).buffer;
            triggerFragmentLoaded(makeRequest({
                full: false, buffer: false, originalRange: '100-199', range: '0-3',
            }), bytes1);

            const bytes2 = new Uint8Array([5, 6, 7, 8]).buffer;
            triggerFragmentLoaded(makeRequest({
                full: true, buffer: true, originalRange: '200-299', range: '4-7',
            }), bytes2);

            expect(loadedSpy.calledOnce).to.be.true; // jshint ignore:line
            const chunk = loadedSpy.firstCall.args[0].chunk;
            expect(chunk.bytes.length).to.equal(8);
            expect(Array.from(chunk.bytes)).to.deep.equal([1, 2, 3, 4, 5, 6, 7, 8]);
        });

        it('matched pieces are removed from partialSegments array', function () {
            // Add two partials for index 0
            triggerFragmentLoaded(makeRequest({ full: false, buffer: false, index: 0, range: '0-3' }), new Uint8Array(4).buffer);
            triggerFragmentLoaded(makeRequest({ full: false, buffer: false, index: 0, range: '4-7' }), new Uint8Array(4).buffer);
            expect(handler.getStreamStats('stream-1').partialSegments).to.equal(2);

            // Assemble with full+buffer
            triggerFragmentLoaded(makeRequest({ full: true, buffer: true, index: 0, range: '8-11' }), new Uint8Array(4).buffer);
            expect(handler.getStreamStats('stream-1').partialSegments).to.equal(0);
        });
    });

    describe('_createDataChunk via _onFragmentLoadingCompleted', function () {
        let handler, eventBus, settings;
        let loadedSpy, testListener;

        function makeRequest(overrides) {
            return Object.assign({
                full: true, padding: false, buffer: true, trail: false,
                index: 5, mediaType: 'video', type: 'MediaSegment', quality: 3,
                duration: 4, startTime: 20, mediaStartTime: 20,
                originalRange: null, range: null, bandwidth: 1000,
                adaptationIndex: 0, timescale: 1,
                availabilityStartTime: 0, availabilityEndTime: Infinity,
                availabilityTimeComplete: true, wallStartTime: 0,
                replacementNumber: 5, replacementTime: 0,
                representation: {
                    id: 'rep0', bandwidth: 1000,
                    adaptation: { index: 0, period: { index: 0, start: 0, duration: 100 } },
                    mediaInfo: { type: 'video', streamInfo: { id: 'stream-1' } }
                },
                isInitializationRequest: () => false,
            }, overrides || {});
        }

        function triggerFragmentLoaded(request, responseBytes) {
            const e = {
                sender: { context: 'test' },
                request,
                response: responseBytes || new ArrayBuffer(8),
                error: null,
            };
            eventBus.trigger(Events.FRAGMENT_LOADING_COMPLETED, e, { streamId: 'stream-1' });
            return e;
        }

        beforeEach(function () {
            eventBus = EventBus(context).getInstance();
            settings = Settings(context).getInstance();

            handler = DodgeHandler(context).create({
                eventBus, events: Events, settings,
                streamController: null,
                mediaPlayer: { extend: () => {} }
            });
            handler.registerEvents();

            testListener = {};
            loadedSpy = sinon.spy();
            eventBus.on(Events.MEDIA_FRAGMENT_LOADED, loadedSpy, testListener);
        });

        afterEach(function () {
            eventBus.off(Events.MEDIA_FRAGMENT_LOADED, loadedSpy, testListener);
            handler.reset();
        });

        it('populates chunk fields from request properties', function () {
            triggerFragmentLoaded(makeRequest());
            expect(loadedSpy.calledOnce).to.be.true; // jshint ignore:line
            const chunk = loadedSpy.firstCall.args[0].chunk;
            expect(chunk.streamId).to.equal('stream-1');
            expect(chunk.segmentType).to.equal('MediaSegment');
            expect(chunk.start).to.equal(20);
            expect(chunk.duration).to.equal(4);
            expect(chunk.end).to.equal(24);
            expect(chunk.index).to.equal(5);
            expect(chunk.quality).to.equal(3);
            expect(chunk.representation.id).to.equal('rep0');
        });

        it('homeRepresentationId defaults to null when not set on request', function () {
            triggerFragmentLoaded(makeRequest());
            const chunk = loadedSpy.firstCall.args[0].chunk;
            expect(chunk.homeRepresentationId).to.be.null; // jshint ignore:line
        });

        it('homeRepresentationId is set when present on request', function () {
            triggerFragmentLoaded(makeRequest({ homeRepresentationId: 'video_500k' }));
            const chunk = loadedSpy.firstCall.args[0].chunk;
            expect(chunk.homeRepresentationId).to.equal('video_500k');
        });

        it('endFragment is true for full buffered segments', function () {
            triggerFragmentLoaded(makeRequest({ full: true, buffer: true }));
            const chunk = loadedSpy.firstCall.args[0].chunk;
            expect(chunk.endFragment).to.be.true; // jshint ignore:line
        });
    });

    describe('getStreamStats', function () {
        let handler, eventBus, settings;

        function makeRequest(overrides) {
            return Object.assign({
                full: false, padding: false, buffer: false, trail: false,
                index: 0, mediaType: 'video', type: 'MediaSegment', quality: 0,
                duration: 4, startTime: 0, mediaStartTime: 0,
                originalRange: null, range: null, bandwidth: 1000,
                adaptationIndex: 0, timescale: 1,
                availabilityStartTime: 0, availabilityEndTime: Infinity,
                availabilityTimeComplete: true, wallStartTime: 0,
                replacementNumber: 0, replacementTime: 0,
                representation: {
                    id: 'rep0', bandwidth: 1000,
                    adaptation: { index: 0, period: { index: 0, start: 0, duration: 100 } },
                    mediaInfo: { type: 'video', streamInfo: { id: 'stream-1' } }
                },
                isInitializationRequest: () => false,
            }, overrides || {});
        }

        function triggerFragmentLoaded(request, streamId) {
            eventBus.trigger(Events.FRAGMENT_LOADING_COMPLETED, {
                sender: { context: 'test' },
                request,
                response: new ArrayBuffer(8),
                error: null,
            }, { streamId: streamId || 'stream-1' });
        }

        beforeEach(function () {
            eventBus = EventBus(context).getInstance();
            settings = Settings(context).getInstance();

            handler = DodgeHandler(context).create({
                eventBus, events: Events, settings,
                streamController: null,
                mediaPlayer: { extend: () => {} }
            });
            handler.registerEvents();
        });

        afterEach(function () {
            handler.reset();
        });

        it('returns zeros for unknown streamId', function () {
            const stats = handler.getStreamStats('nonexistent-stream');
            expect(stats.partialSegments).to.equal(0);
            expect(stats.pendingInit).to.equal(0);
            expect(stats.pendingMedia).to.equal(0);
        });

        it('returns correct counts after partials and pending segments accumulate', function () {
            // Add a partial (non-full, non-padding)
            triggerFragmentLoaded(makeRequest({ full: false, padding: false }));
            expect(handler.getStreamStats('stream-1').partialSegments).to.equal(1);

            // Add a pending media (full without buffer) - this also consumes the partial
            triggerFragmentLoaded(makeRequest({ full: true, buffer: false, index: 0 }));
            expect(handler.getStreamStats('stream-1').pendingMedia).to.equal(1);
            // The partial was consumed during assembly, so partialSegments should be 0
            expect(handler.getStreamStats('stream-1').partialSegments).to.equal(0);
        });

        it('tracks streams independently by streamId', function () {
            triggerFragmentLoaded(makeRequest({ full: false, padding: false }), 'stream-1');

            // stream-2 needs its own representation with matching streamInfo
            triggerFragmentLoaded(makeRequest({
                full: false, padding: false,
                representation: {
                    id: 'rep0', bandwidth: 1000,
                    adaptation: { index: 0, period: { index: 0, start: 0, duration: 100 } },
                    mediaInfo: { type: 'video', streamInfo: { id: 'stream-2' } }
                },
            }), 'stream-2');

            expect(handler.getStreamStats('stream-1').partialSegments).to.equal(1);
            expect(handler.getStreamStats('stream-2').partialSegments).to.equal(1);
        });
    });
    
    describe('Error fragment stalling, _onFragmentLoadingCompleted', function () {
        let handler, eventBus, settings;
        let mediaLoadedSpy, partialSpy, paddingSpy, initLoadedSpy, testListener;

        function makeRequest(overrides) {
            return Object.assign({
                full: true, padding: false, buffer: true, trail: false,
                index: 0, mediaType: 'video', type: 'MediaSegment', quality: 0,
                duration: 4, startTime: 0, mediaStartTime: 0,
                originalRange: null, range: null, bandwidth: 1000,
                adaptationIndex: 0, timescale: 1,
                availabilityStartTime: 0, availabilityEndTime: Infinity,
                availabilityTimeComplete: true, wallStartTime: 0,
                replacementNumber: 0, replacementTime: 0,
                url: 'https://example.com/seg.m4s',
                representation: {
                    id: 'rep0', bandwidth: 1000,
                    adaptation: { index: 0, period: { index: 0, start: 0, duration: 100 } },
                    mediaInfo: { type: 'video', streamInfo: { id: 'stream-1' } }
                },
                isInitializationRequest: () => false,
            }, overrides || {});
        }

        function triggerFragmentLoaded(request, error) {
            const e = {
                sender: { context: 'test' },
                request,
                response: new ArrayBuffer(8),
                error: error || null,
            };
            eventBus.trigger(Events.FRAGMENT_LOADING_COMPLETED, e, { streamId: 'stream-1' });
            return e;
        }

        beforeEach(function () {
            eventBus = EventBus(context).getInstance();
            settings = Settings(context).getInstance();

            handler = DodgeHandler(context).create({
                eventBus, events: Events, settings,
                streamController: null,
                mediaPlayer: { extend: () => {} }
            });
            handler.registerEvents();

            testListener = {};
            mediaLoadedSpy = sinon.spy();
            partialSpy = sinon.spy();
            paddingSpy = sinon.spy();
            initLoadedSpy = sinon.spy();
            eventBus.on(Events.MEDIA_FRAGMENT_LOADED, mediaLoadedSpy, testListener);
            eventBus.on(Events.MEDIA_FRAGMENT_PARTIAL, partialSpy, testListener);
            eventBus.on(Events.PADDING_LOADED, paddingSpy, testListener);
            eventBus.on(Events.INIT_FRAGMENT_LOADED, initLoadedSpy, testListener);
        });

        afterEach(function () {
            eventBus.off(Events.MEDIA_FRAGMENT_LOADED, mediaLoadedSpy, testListener);
            eventBus.off(Events.MEDIA_FRAGMENT_PARTIAL, partialSpy, testListener);
            eventBus.off(Events.PADDING_LOADED, paddingSpy, testListener);
            eventBus.off(Events.INIT_FRAGMENT_LOADED, initLoadedSpy, testListener);
            handler.reset();
        });

        it('errored Dodge request does not fire any Dodge events', function () {
            triggerFragmentLoaded(makeRequest({ full: true, buffer: true }), new Error('network'));
            expect(mediaLoadedSpy.called).to.be.false; // jshint ignore:line
            expect(partialSpy.called).to.be.false; // jshint ignore:line
            expect(paddingSpy.called).to.be.false; // jshint ignore:line
            expect(initLoadedSpy.called).to.be.false; // jshint ignore:line
        });

        it('errored Dodge request does not accumulate partial segments', function () {
            triggerFragmentLoaded(makeRequest({ full: false, buffer: false }), new Error('network'));
            expect(handler.getStreamStats('stream-1').partialSegments).to.equal(0);
        });

        it('errored vanilla request passes through without sender nulling', function () {
            const e = triggerFragmentLoaded(makeRequest({ full: undefined, padding: undefined }), new Error('network'));
            expect(e.sender).to.not.be.null; // jshint ignore:line
            expect(mediaLoadedSpy.called).to.be.false; // jshint ignore:line
        });
    });

});
