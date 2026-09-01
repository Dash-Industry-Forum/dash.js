import TextTracks from '../../../../src/streaming/text/TextTracks.js';
import EventBus from '../../../../src/core/EventBus.js';
import Events from '../../../../src/core/events/Events.js';
import MediaPlayerEvents from '../../../../src/streaming/MediaPlayerEvents.js';
import VoHelper from '../../helpers/VOHelper.js';
import VideoModelMock from '../../mocks/VideoModelMock.js';
import Settings from '../../../../src/core/Settings.js';
import chai, {expect} from 'chai';
import spies from 'chai-spies';
import sinon from 'sinon';

chai.use(spies);
Events.extend(MediaPlayerEvents);

const SUBTITLE_DATA = 'subtitle line 1';

const context = {};
const eventBus = EventBus(context).getInstance();

describe('TextTracks', function () {

    const voHelper = new VoHelper();
    const streamInfo = voHelper.getDummyStreamInfo();
    const settings = Settings(context).getInstance();
    let textTracks;
    let videoModelMock;

    beforeEach(function () {
    });

    afterEach(function () {
        settings.reset();
    });

    beforeEach(function () {
        videoModelMock = new VideoModelMock();
        textTracks = TextTracks(context).create({
            videoModel: videoModelMock,
            streamInfo,
            settings
        });
        textTracks.initialize();

        // Explicitly configure buffer settings, for testing virtual scrolling
        settings.update({
            streaming: {
                buffer: {
                    bufferToKeep: 20,
                    bufferPruningInterval: 10
                }
            }
        });
    });

    afterEach(function () {
        textTracks.deleteAllTextTracks();
    });

    describe('Method getTrackIdxForId', function () {
        it('should return -1 if getTrackIdxForId is called but textTrackQueue is empty', function () {
            const trackId = textTracks.getTrackIdxForId(0);

            expect(trackId).to.equal(-1); // jshint ignore:line
        });
    });

    describe('Method addTextTrackInfo', function () {
        it('should trigger TEXT_TRACK_ADDED and TEXT_TRACKS_QUEUE_INITIALIZED events when a call to addTextTrackInfo function is made', function () {
            const spyTrackAdded = chai.spy();
            const spyTracksQueueInit = chai.spy();

            eventBus.on(Events.TEXT_TRACK_ADDED, spyTrackAdded);
            eventBus.on(Events.TEXT_TRACKS_QUEUE_INITIALIZED, spyTracksQueueInit);

            textTracks.addTextTrackInfo({
                index: 0,
                kind: 'subtitles',
                label: 'eng',
                defaultTrack: true,
                isTTML: true}, 1);

            textTracks.createTracks();
            const currrentTrackIdx = textTracks.getCurrentTrackIdx();
            expect(currrentTrackIdx).to.equal(0); // jshint ignore:line
            expect(spyTrackAdded).to.have.been.called();
            expect(spyTracksQueueInit).to.have.been.called();

            eventBus.off(Events.TEXT_TRACK_ADDED, spyTrackAdded);
            eventBus.off(Events.TEXT_TRACKS_QUEUE_INITIALIZED, spyTracksQueueInit);
        });
    });

    describe('Method addCaptions', function () {
        it('should call addCue function when a call to addCaptions is made', function () {
            textTracks.addTextTrackInfo({
                index: 0,
                kind: 'subtitles',
                id: 'eng',
                defaultTrack: true,
                isTTML: true}, 1);

            textTracks.createTracks();
            let track = videoModelMock.getTextTrack('subtitles', 'eng');

            textTracks.addCaptions(0, 0, [{type: 'noHtml', data: SUBTITLE_DATA, start: 0, end: 2}]);

            // Update the TextTrack window so that the test cue is added to the TextTrack
            textTracks.updateTextTrackWindow(0);

            expect(videoModelMock.getCurrentCue(track).text).to.equal(SUBTITLE_DATA);
        });

        it('should add the timeOffset to non-html cue times', function () {
            textTracks.addTextTrackInfo({
                index: 0,
                kind: 'subtitles',
                id: 'eng',
                defaultTrack: true,
                isTTML: true}, 1);

            textTracks.createTracks();
            let track = videoModelMock.getTextTrack('subtitles', 'eng');

            // Period-local cue times plus the MSE timestamp offset of a later period
            textTracks.addCaptions(0, 100, [{type: 'noHtml', data: SUBTITLE_DATA, start: 5, end: 7}]);
            textTracks.updateTextTrackWindow(105);

            const cue = videoModelMock.getCurrentCue(track);
            expect(cue.startTime).to.equal(105);
            expect(cue.endTime).to.equal(107);
        });

        it('should eliminate duplicates', function () {
            textTracks.addTextTrackInfo({
                index: 0,
                kind: 'subtitles',
                id: 'eng',
                defaultTrack: true,
                isTTML: true}, 1);

            textTracks.createTracks();
            let track = videoModelMock.getTextTrack('subtitles', 'eng');

            textTracks.addCaptions(0, 0, [
                {type: 'noHtml', data: 'unique cue', start: 0, end: 2},
                {type: 'noHtml', data: 'duplicated cue', start: 2, end: 4},
                {type: 'noHtml', data: 'duplicated cue', start: 2, end: 4},
            ]);

            textTracks.addCaptions(0, 0, [
                {type: 'noHtml', data: 'duplicated cue', start: 2, end: 4},
                {type: 'noHtml', data: 'another unique cue', start: 4, end: 6},
            ]);

            // Update the TextTrack window so that all test cues are added to the TextTrack
            textTracks.updateTextTrackWindow(0);

            expect(track.cues.length).to.equal(3);
        });

        it('should support multiple cues with same timing, but different text', function () {
            textTracks.addTextTrackInfo({
                index: 0,
                kind: 'subtitles',
                id: 'eng',
                defaultTrack: true,
                isTTML: true}, 1);

            textTracks.createTracks();
            let track = videoModelMock.getTextTrack('subtitles', 'eng');

            const cues = [
                {type: 'noHtml', data: 'First cue', start: 0, end: 2},
                {type: 'noHtml', data: 'Second cue', start: 0, end: 2}
            ];

            textTracks.addCaptions(0, 0, cues);

            // Update the TextTrack window so that all test cues are added to the TextTrack
            textTracks.updateTextTrackWindow(0);

            const allCues = track.cues
            expect(allCues.length).to.equal(2);
            expect(allCues[0].text).to.equal('First cue');
            expect(allCues[1].text).to.equal('Second cue');
            expect(allCues[0].cueID).to.not.equal(allCues[1].cueID);
        });

        it('should extend adjacent cues with identical content when streaming.text.extendSegmentedCues is enabled', function () {
            // Enable cue extension
            settings.update({ streaming: { text: { extendSegmentedCues: true } } });

            textTracks.addTextTrackInfo({
                index: 0,
                kind: 'subtitles',
                id: 'eng',
                defaultTrack: true,
                isTTML: true}, 1);
            textTracks.createTracks();

            const track = videoModelMock.getTextTrack('subtitles', 'eng');

            // Add cues with adjacent timing and identical content
            textTracks.addCaptions(0, 0, [
                {type: 'noHtml', data: 'Same text', start: 0, end: 2},
                {type: 'noHtml', data: 'Same text', start: 2, end: 4},
                {type: 'noHtml', data: 'Same text', start: 4, end: 6},
                {type: 'noHtml', data: 'Different text', start: 6, end: 8},
                {type: 'noHtml', data: 'Same text', start: 8, end: 10},
                {type: 'noHtml', data: 'Same text', start: 10, end: 12}
            ]);

            // Update window to include all cues
            textTracks.updateTextTrackWindow(0, true);

            expect(track.cues.length).to.equal(3);

            // First cue should be extended from 0-6 (merged 0-2, 2-4, 4-6)
            expect(track.cues[0].text).to.equal('Same text');
            expect(track.cues[0].startTime).to.equal(0);
            expect(track.cues[0].endTime).to.equal(6);

            // Second cue should be the different content
            expect(track.cues[1].text).to.equal('Different text');
            expect(track.cues[1].startTime).to.equal(6);
            expect(track.cues[1].endTime).to.equal(8);

            // Third cue should be the non-adjacent same content
            expect(track.cues[2].text).to.equal('Same text');
            expect(track.cues[2].startTime).to.equal(8);
            expect(track.cues[2].endTime).to.equal(12);
        });

        // CEA-608 uses a paint-on model: every screen is a self-contained,
        // explicitly-timed caption that was never split across segments, so the
        // extendSegmentedCues logic must never coalesce 608 cues. Previously it
        // did, because the rendered content of a 608 cue lives in cueHTMLElement
        // (a DOM node the cue-equality check does not inspect), so all 608 cues
        // compared as equal and only the first caption of each segment was shown.
        const makeCea608Item = (html, cueID, start, end) => {
            const cueHTMLElement = document.createElement('div');
            cueHTMLElement.innerHTML = html;
            return {
                type: 'html',
                start,
                end,
                cueHTMLElement,
                cueID,
                cellResolution: [32, 15],
                isFromCEA608: true,
                fontSize: { bodyStyle: ['%', 90] },
                lineHeight: {},
                linePadding: {}
            };
        };

        const addCea608Track = () => {
            // A real DOM container is required for the HTML caption path.
            videoModelMock.getTTMLRenderingDiv = () => document.createElement('div');
            textTracks.addTextTrackInfo({
                index: 0,
                kind: 'captions',
                id: 'eng',
                defaultTrack: true,
                isEmbedded: true}, 1);
            textTracks.createTracks();
            return videoModelMock.getTextTrack('captions', 'eng');
        };

        it('should not merge adjacent CEA-608 cues with different content even when extendSegmentedCues is enabled', function () {
            settings.update({ streaming: { text: { extendSegmentedCues: true } } });
            const track = addCea608Track();

            textTracks.addCaptions(0, 0, [
                makeCea608Item('<span>00:00:00.000</span><br><span>SEG 0</span>', 'sub_cea608_0', 0, 1),
                makeCea608Item('<span>00:00:01.000</span><br><span>SEG 0</span>', 'sub_cea608_1', 1, 2),
                makeCea608Item('<span>00:00:02.000</span><br><span>SEG 1</span>', 'sub_cea608_2', 2, 3)
            ]);

            textTracks.updateTextTrackWindow(0, true);

            // All three captions are distinct and must be preserved.
            expect(track.cues.length).to.equal(3);
        });

        it('should not merge adjacent CEA-608 cues with identical content even when extendSegmentedCues is enabled', function () {
            settings.update({ streaming: { text: { extendSegmentedCues: true } } });
            const track = addCea608Track();

            // Same rendered content in adjacent slots. TTML/WebVTT would coalesce
            // these, but 608 is paint-on so each screen stays its own caption.
            textTracks.addCaptions(0, 0, [
                makeCea608Item('<span>Same caption</span>', 'sub_cea608_0', 0, 2),
                makeCea608Item('<span>Same caption</span>', 'sub_cea608_1', 2, 4)
            ]);

            textTracks.updateTextTrackWindow(0, true);

            expect(track.cues.length).to.equal(2);
        });

        it('should deduplicate a re-appended CEA-608 caption with identical timing and content but a fresh cueID', function () {
            const track = addCea608Track();

            // Seeking back past the buffer re-downloads the text segment; the
            // 608 parser re-emits the same caption with a new cueID. Only one
            // copy may live in the track or it renders stacked.
            textTracks.addCaptions(0, 0, [
                makeCea608Item('<span>Same caption</span>', 'sub_cea608_0', 0, 2)
            ]);
            textTracks.addCaptions(0, 0, [
                makeCea608Item('<span>Same caption</span>', 'sub_cea608_5', 0, 2)
            ]);

            textTracks.updateTextTrackWindow(0, true);

            expect(track.cues.length).to.equal(1);
        });

        it('should not extend adjacent cues when streaming.text.extendSegmentedCues is disabled', function () {
            // Ensure cue extension is disabled
            settings.update({ streaming: { text: { extendSegmentedCues: false } } });

            textTracks.addTextTrackInfo({
                index: 0,
                kind: 'subtitles',
                id: 'eng',
                defaultTrack: true,
                isTTML: true}, 1);
            textTracks.createTracks();

            const track = videoModelMock.getTextTrack('subtitles', 'eng');

            // Add cues with adjacent timing and identical content
            textTracks.addCaptions(0, 0, [
                {type: 'noHtml', data: 'Same text', start: 0, end: 2},
                {type: 'noHtml', data: 'Same text', start: 2, end: 4}
            ]);

            // Update window to include all cues
            textTracks.updateTextTrackWindow(0, true);

            expect(track.cues.length).to.equal(2);

            expect(track.cues[0].text).to.equal('Same text');
            expect(track.cues[0].startTime).to.equal(0);
            expect(track.cues[0].endTime).to.equal(2);

            expect(track.cues[1].text).to.equal('Same text');
            expect(track.cues[1].startTime).to.equal(2);
            expect(track.cues[1].endTime).to.equal(4);
        });
    });

    describe('Method updateTextTrackWindow', function () {
        it('should only add to the TextTrack cues within a window around current time', function () {
            textTracks.addTextTrackInfo({
                index: 0,
                kind: 'subtitles',
                id: 'eng',
                defaultTrack: true,
                isTTML: true}, 1);
            textTracks.createTracks();

            const track = videoModelMock.getTextTrack('subtitles', 'eng');

            textTracks.addCaptions(0, 0, [
                {type: 'noHtml', data: 'Cue at 0s', start: 0, end: 2},
                {type: 'noHtml', data: 'Cue at 30s', start: 30, end: 32},
                {type: 'noHtml', data: 'Cue at 40s', start: 40, end: 42},
                {type: 'noHtml', data: 'Cue at 60s', start: 60, end: 62},
                {type: 'noHtml', data: 'Cue at 100s', start: 100, end: 102},
                {type: 'noHtml', data: 'Cue at 120s', start: 120, end: 122}
            ]);

            // Update window at time 0 - window is [0, 20)
            textTracks.updateTextTrackWindow(0, true);
            expect(track.cues.length).to.equal(1);
            expect(track.cues[0].text).to.equal('Cue at 0s');

            // Update window at time 20 - window is [0, 40)
            textTracks.updateTextTrackWindow(20, true);
            expect(track.cues.length).to.equal(2);
            expect(track.cues[0].text).to.equal('Cue at 0s');
            expect(track.cues[1].text).to.equal('Cue at 30s');

            // Update window at time 30 - window is [10, 50)
            textTracks.updateTextTrackWindow(30, true);
            expect(track.cues.length).to.equal(2);
            expect(track.cues[0].text).to.equal('Cue at 30s');
            expect(track.cues[1].text).to.equal('Cue at 40s');

            // Update window at time 60 - window is [40, 80)
            textTracks.updateTextTrackWindow(60, true);
            expect(track.cues.length).to.equal(2);
            expect(track.cues[0].text).to.equal('Cue at 40s');
            expect(track.cues[1].text).to.equal('Cue at 60s');

            // Update window at time 100 - window is [80, 120)
            textTracks.updateTextTrackWindow(100, true);
            expect(track.cues.length).to.equal(1);
            expect(track.cues[0].text).to.equal('Cue at 100s');
        });

        it('should only update the TextTrack if enough time has passed since the last update', function () {
            textTracks.addTextTrackInfo({
                index: 0,
                kind: 'subtitles',
                id: 'eng',
                defaultTrack: true,
                isTTML: true}, 1);

            textTracks.createTracks();
            const track = videoModelMock.getTextTrack('subtitles', 'eng');

            // Mock Date.now to test different time intervals
            const nowStub = sinon.stub(Date, 'now');
            nowStub.returns(0);

            const clearTrack = () => {
                while (track.cues.length > 0) {
                    track.removeCue(track.cues[0]);
                }
            };

            textTracks.addCaptions(0, 0, [
                {type: 'noHtml', data: 'Test cue', start: 0, end: 10}
            ]);

            // First update should work
            textTracks.updateTextTrackWindow(5);
            expect(track.cues.length).to.equal(1);

            clearTrack();

            // Calling updateTextTrackWindow again doesn't affect a TextTrack that has been updated in the last 10 seconds
            textTracks.updateTextTrackWindow(5);
            expect(track.cues.length).to.equal(0);

            // At 9999ms - still within the interval, should not do anything
            nowStub.returns(9999);
            textTracks.updateTextTrackWindow(5);
            expect(track.cues.length).to.equal(0);

            // At 10000ms (exactly at the interval) - should update the TextTrack
            nowStub.returns(10000);
            textTracks.updateTextTrackWindow(5);
            expect(track.cues.length).to.equal(1);

            // Restore original Date.now
            nowStub.restore();
        });

        it('should always update the TextTrack when force parameter is true', function () {
            textTracks.addTextTrackInfo({
                index: 0,
                kind: 'subtitles',
                id: 'eng',
                defaultTrack: true,
                isTTML: true}, 1);
            textTracks.createTracks();
            const track = videoModelMock.getTextTrack('subtitles', 'eng');

            textTracks.addCaptions(0, 0, [
                {type: 'noHtml', data: 'Test cue', start: 0, end: 10}
            ]);

            // First update should work
            textTracks.updateTextTrackWindow(5);
            expect(track.cues.length).to.equal(1);

            // Clear the track
            while (track.cues.length > 0) {
                track.removeCue(track.cues[0]);
            }

            // Normal update should be ignored, since not enough time has passed
            textTracks.updateTextTrackWindow(5);
            expect(track.cues.length).to.equal(0);

            // Force update should always update the TextTrack
            textTracks.updateTextTrackWindow(5, true);
            expect(track.cues.length).to.equal(1);
        });
    });
});
