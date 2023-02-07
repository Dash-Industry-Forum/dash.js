import TextTracks from '../../src/streaming/text/TextTracks';
import EventBus from '../../src/core/EventBus';
import Events from '../../src/core/events/Events';
import VoHelper from './helpers/VOHelper';
import VideoModelMock from './mocks/VideoModelMock';

const SUBTITLE_DATA = 'subtitle lign 1';
const chai = require('chai');
const expect = chai.expect;
const context = {};
const eventBus = EventBus(context).getInstance();

describe('TextTracks', function () {

    const voHelper = new VoHelper();
    let videoModelMock = new VideoModelMock();
    const streamInfo = voHelper.getDummyStreamInfo();
    let textTracks;

    beforeEach(function () {
        if (typeof document === 'undefined') {
            global.document = {
                getElementById: function () {
                    return 0;
                },
                createElement: function () {
                    return {sheet: ''};
                },
                head: {
                    removeChild: function () {
                    },
                    appendChild: function () {
                    }
                }
            };
        }

        if (typeof window === 'undefined') {
            global.window = {};
            global.window.TextTrackCue = function (start, end, data) {
                this.start = start;
                this.end = end;
                this.data = data;
            };
        }

        if (typeof navigator === 'undefined') {
            global.navigator = {};
        }
    });

    afterEach(function () {
        delete global.document;
        delete global.window;
        delete global.navigator;
    });

    beforeEach(function () {
        textTracks = TextTracks(context).create({
            videoModel: videoModelMock,
            streamInfo
        });
        textTracks.initialize();
    });

    afterEach(function () {
        textTracks.deleteAllTextTracks();
        videoModelMock.getElement().reset();
    });

    describe('Method getTrackIdxForId', function () {
        it('should return -1 if getTrackIdxForId is called but textTrackQueue is empty', function () {
            const trackId = textTracks.getTrackIdxForId(0);

            expect(trackId).to.equal(-1); // jshint ignore:line
        });
    });

    describe('Method addTextTrack', function () {
        it('should trigger TEXT_TRACK_ADDED and TEXT_TRACKS_QUEUE_INITIALIZED events when a call to addTextTrackfunction is made', function () {
            const spyTrackAdded = chai.spy();
            const spyTracksQueueInit = chai.spy();

            eventBus.on(Events.TEXT_TRACK_ADDED, spyTrackAdded);
            eventBus.on(Events.TEXT_TRACKS_QUEUE_INITIALIZED, spyTracksQueueInit);

            textTracks.addTextTrack({
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
        it('should call addCue function of when a call to addCaptions is made', function () {
            textTracks.addTextTrack({
                index: 0,
                kind: 'subtitles',
                id: 'eng',
                defaultTrack: true,
                isTTML: true}, 1);

            textTracks.createTracks();
            let track = videoModelMock.getTextTrack('subtitles', 'eng');

            textTracks.addCaptions(0, 0, [{type: 'noHtml', data: SUBTITLE_DATA, start: 0, end: 2}]);

            expect(videoModelMock.getCurrentCue(track).data).to.equal(SUBTITLE_DATA);
        });
    });
});
