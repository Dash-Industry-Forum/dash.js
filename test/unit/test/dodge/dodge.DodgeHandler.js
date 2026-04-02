import { DodgeHandler } from '../../../../src/dodge/index.js';
import DodgeErrors from '../../../../src/dodge/errors/DodgeErrors.js';
import DodgeEvents from '../../../../src/dodge/events/DodgeEvents.js';
import EventBus from '../../../../src/core/EventBus.js';
import Events from '../../../../src/core/events/Events.js';
import MediaPlayerEvents from '../../../../src/streaming/MediaPlayerEvents.js';
import Settings from '../../../../src/core/Settings.js';

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

        it('errored request: sender stays non-null, no Dodge events fired', function () {
            const e = triggerFragmentLoaded(makeRequest({ full: true }), new Error('test error'));
            expect(e.sender).to.not.be.null; // jshint ignore:line
            expect(mediaLoadedSpy.called).to.be.false; // jshint ignore:line
            expect(partialSegmentSpy.called).to.be.false; // jshint ignore:line
            expect(paddingLoadedSpy.called).to.be.false; // jshint ignore:line
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

        it('PADDING_LOADED with buffer flag: startScheduleTimer called, quality check enabled', function () {
            eventBus.trigger(Events.PADDING_LOADED,
                { index: 0, suppress: false, representation: { segmentDuration: 4 }, quality: 0, byteLength: 100, trail: true, buffer: true },
                { streamId: 'stream-1', mediaType: 'video' }
            );
            expect(startTimerSpy.calledOnce).to.be.true; // jshint ignore:line
            expect(setQualitySpy.calledOnceWith(true)).to.be.true; // jshint ignore:line
        });

        it('PADDING_LOADED without buffer flag: startScheduleTimer called, quality check disabled', function () {
            eventBus.trigger(Events.PADDING_LOADED,
                { index: 0, suppress: false, representation: { segmentDuration: 4 }, quality: 0, byteLength: 100, trail: true, buffer: false },
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
    });
});
