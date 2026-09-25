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

    // With dispatchForManualRendering the cues of every track are added to their native
    // TextTrack (all of them hidden, none disabled), so the native enter/exit events keep
    // firing for tracks that are not selected anymore.
    describe('Cue events with streaming.text.dispatchForManualRendering', function () {
        const enterEvents = [];
        const exitEvents = [];

        const onCueEnter = (cue) => enterEvents.push(cue.cueID);
        const onCueExit = (e) => exitEvents.push(e.cueID);

        beforeEach(function () {
            enterEvents.length = 0;
            exitEvents.length = 0;
            eventBus.on(MediaPlayerEvents.CUE_ENTER, onCueEnter);
            eventBus.on(MediaPlayerEvents.CUE_EXIT, onCueExit);

            settings.update({ streaming: { text: { dispatchForManualRendering: true } } });
        });

        afterEach(function () {
            eventBus.off(MediaPlayerEvents.CUE_ENTER, onCueEnter);
            eventBus.off(MediaPlayerEvents.CUE_EXIT, onCueExit);
        });

        // Returns the native TextTracks of a selected English and a non selected German track
        const addTwoTracks = () => {
            textTracks.addTextTrackInfo({
                index: 0,
                kind: 'subtitles',
                id: 'eng',
                defaultTrack: true,
                isTTML: true}, 1);
            textTracks.addTextTrackInfo({
                index: 1,
                kind: 'subtitles',
                id: 'deu',
                defaultTrack: false,
                isTTML: true}, 1);
            textTracks.createTracks();

            return [
                videoModelMock.getTextTrack('subtitles', 'eng'),
                videoModelMock.getTextTrack('subtitles', 'deu')
            ];
        };

        it('should dispatch CUE_ENTER and CUE_EXIT for cues of the selected track', function () {
            const [engTrack] = addTwoTracks();

            textTracks.addCaptions(0, 0, [{type: 'noHtml', data: SUBTITLE_DATA, start: 0, end: 2}]);
            textTracks.updateTextTrackWindow(0, true);

            const cue = engTrack.cues[0];
            cue.onenter();
            cue.onexit();

            expect(enterEvents.length).to.equal(1);
            expect(exitEvents).to.deep.equal([cue.cueID]);
        });

        it('should not dispatch CUE_ENTER for cues of a track that is not selected', function () {
            const [, deuTrack] = addTwoTracks();

            textTracks.addCaptions(1, 0, [{type: 'noHtml', data: 'German subtitle', start: 0, end: 2}]);
            textTracks.updateTextTrackWindow(0, true);

            deuTrack.cues[0].onenter();

            expect(enterEvents.length).to.equal(0);
        });

        it('should not dispatch CUE_EXIT for cues of a track that is not selected', function () {
            const [, deuTrack] = addTwoTracks();

            textTracks.addCaptions(1, 0, [{type: 'noHtml', data: 'German subtitle', start: 0, end: 2}]);
            textTracks.updateTextTrackWindow(0, true);

            const cue = deuTrack.cues[0];
            cue.onenter();
            // Cue ids are only unique within a track, so an exit event here would remove a cue
            // of the selected track in the application
            cue.onexit();

            expect(exitEvents.length).to.equal(0);
        });

        it('should stop dispatching cue events for a track once another track has been selected', function () {
            const [engTrack] = addTwoTracks();

            textTracks.addCaptions(0, 0, [{type: 'noHtml', data: SUBTITLE_DATA, start: 0, end: 2}]);
            textTracks.updateTextTrackWindow(0, true);

            textTracks.setCurrentTrackIdx(1);

            const cue = engTrack.cues[0];
            cue.onenter();
            cue.onexit();

            expect(enterEvents.length).to.equal(0);
            expect(exitEvents.length).to.equal(0);
        });

        it('should dispatch CUE_EXIT only once per dispatched CUE_ENTER', function () {
            const [engTrack] = addTwoTracks();

            textTracks.addCaptions(0, 0, [{type: 'noHtml', data: SUBTITLE_DATA, start: 0, end: 2}]);
            textTracks.updateTextTrackWindow(0, true);

            const cue = engTrack.cues[0];
            cue.onenter();
            cue.onexit();
            cue.onexit();

            expect(exitEvents.length).to.equal(1);
        });

        // The rendered content of an HTML cue lives in its isd, which is what the cue
        // equality check compares. Without distinct content the adjacent cues below would
        // be merged into a single one.
        const makeHtmlItem = (cueID, text, start, end) => ({
            type: 'html',
            cueID,
            start,
            end,
            isd: { contents: [{ kind: 'text', text }] }
        });

        it('should keep track of the current HTML cue when a stale cue exits', function () {
            const [engTrack] = addTwoTracks();

            // HTML tracks don't trigger the exit event of the previous cue when a new cue is
            // entered, so entering a cue exits the one currently dispatched. The late native
            // exit event of that already exited cue must not clear the cue that is displayed
            // now, otherwise the following cue never exits it.
            textTracks.addCaptions(0, 0, [
                makeHtmlItem('cue-1', 'First cue', 0, 2),
                makeHtmlItem('cue-2', 'Second cue', 2, 4),
                makeHtmlItem('cue-3', 'Third cue', 4, 6)
            ]);
            textTracks.updateTextTrackWindow(0, true);

            const [firstCue, secondCue, thirdCue] = engTrack.cues;
            firstCue.onenter();
            secondCue.onenter();
            firstCue.onexit();
            thirdCue.onenter();

            expect(enterEvents).to.deep.equal(['cue-1', 'cue-2', 'cue-3']);
            expect(exitEvents[exitEvents.length - 1]).to.equal('cue-2');
        });

        it('should still dispatch CUE_EXIT for a cue that entered before another track was selected', function () {
            const [, deuTrack] = addTwoTracks();

            textTracks.addCaptions(1, 0, [{type: 'noHtml', data: 'German subtitle', start: 0, end: 2}]);
            textTracks.updateTextTrackWindow(0, true);

            textTracks.setCurrentTrackIdx(1);

            const cue = deuTrack.cues[0];
            cue.onenter();

            textTracks.setCurrentTrackIdx(0);

            // The application is rendering this cue, so it has to be told to remove it even
            // though its track is not selected anymore
            cue.onexit();

            expect(enterEvents.length).to.equal(1);
            expect(exitEvents).to.deep.equal([cue.cueID]);
        });

        it('should exit the HTML cue of the previous track when a cue of the newly selected track enters', function () {
            const [engTrack, deuTrack] = addTwoTracks();

            textTracks.addCaptions(0, 0, [makeHtmlItem('eng-cue', 'English subtitle', 2, 4)]);
            textTracks.addCaptions(1, 0, [makeHtmlItem('deu-cue', 'German subtitle', 0, 2)]);
            textTracks.updateTextTrackWindow(0, true);

            textTracks.setCurrentTrackIdx(1);
            deuTrack.cues[0].onenter();

            // Switching the track does not exit the cue that is on screen, the cue of the
            // newly selected track replaces it
            textTracks.setCurrentTrackIdx(0);
            expect(exitEvents.length).to.equal(0);

            engTrack.cues[0].onenter();

            expect(enterEvents).to.deep.equal(['deu-cue', 'eng-cue']);
            expect(exitEvents).to.deep.equal(['deu-cue']);
        });

        it('should not dispatch cue events for cues that outlive their text track', function () {
            const [engTrack] = addTwoTracks();

            textTracks.addCaptions(0, 0, [{type: 'noHtml', data: SUBTITLE_DATA, start: 0, end: 2}]);
            textTracks.updateTextTrackWindow(0, true);

            const cue = engTrack.cues[0];
            textTracks.deleteAllTextTracks();

            cue.onenter();
            cue.onexit();

            expect(enterEvents.length).to.equal(0);
            expect(exitEvents.length).to.equal(0);
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
