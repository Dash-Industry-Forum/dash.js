import TextController from '../../src/streaming/text/TextController';
import TextTracks from '../../src/streaming/text/TextTracks';
import TextSourceBuffer from '../../src/streaming/text/TextSourceBuffer';
import ObjectUtils from '../../src/streaming/utils/ObjectUtils';
import Events from '../../src/core/events/Events';
import EventBus from '../../src/core/EventBus';

const expect = require('chai').expect;
const context = {};

const eventBus = EventBus(context).getInstance();
const objectUtils = ObjectUtils(context).getInstance();

class TextTrackMock {
    constructor() {
        this.kind = null;
        this.label = null;
    }
}

class VideoMock {

    constructor() {
        this.reset();
    }

    reset() {
        this.textTracks = [];
    }

    addTextTrack(kind, label) {
        let textTrack = new TextTrackMock();
        textTrack.kind = kind;
        textTrack.label = label;
        this.textTracks.push(textTrack);

        return textTrack;
    }
}

class VideoModelMock {
    constructor() {
        this.tracks = [];
    }

    getTextTracks() {
        return this.tracks;
    }

    getTTMLRenderingDiv() {
        return {};
    }
}
describe('TextController', function () {

    let videoModelMock = new VideoModelMock();
    let videoMock;
    let textTracks;
    let textController;

    beforeEach(function () {
        textTracks = TextTracks(context).getInstance();
        textTracks.setConfig({
            videoModel: videoModelMock
        });

        textController = TextController(context).getInstance();
        textController.setConfig({
            videoModel: videoModelMock
        });
    });

    afterEach(function () {
        textController.reset();
    });

    it('should return TextSourceBuffer instance', function () {
        let textSourceBuffer = textController.getTextSourceBuffer();
        let textSourceBufferSingleton = TextSourceBuffer(context).getInstance();

        expect(objectUtils.areEqual(textSourceBuffer, textSourceBufferSingleton)).to.be.true;
    });

    describe('Method setTextTrack', function () {

        beforeEach( function() {
            videoMock = new VideoMock();

            textTracks.addTextTrack({
                index : 0,
                kind : "subtitles",
                label : 'eng',
                defaultTrack : true,
                video: videoMock,
                isTTML : true
            }, 2);

            textTracks.addTextTrack({
                index : 1,
                kind : "subtitles",
                label : 'fr',
                defaultTrack : false,
                video: videoMock,
                isTTML : true
            }, 2);
        });

        it('should set text tracks - no track showing', function () {
            videoModelMock.tracks = [{
                id: 'track1'
            }, {
                id: 'track2'
            }];

            textController.setTextTrack();
            expect(textController.getAllTracksAreDisabled()).to.be.true;

        });

        it('should set text tracks - one track showing', function () {
            videoModelMock.tracks = [{
                id: 'track1',
                mode: 'showing'
            }, {
                id: 'track2'
            }];

            textController.setTextTrack();
            expect(textController.getAllTracksAreDisabled()).to.be.false;

        });
    });
});
