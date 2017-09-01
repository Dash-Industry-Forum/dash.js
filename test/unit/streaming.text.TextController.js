import TextController from '../../src/streaming/text/TextController';
import TextTracks from '../../src/streaming/text/TextTracks';
import TextSourceBuffer from '../../src/streaming/text/TextSourceBuffer';
import ObjectUtils from '../../src/streaming/utils/ObjectUtils';
import Events from '../../src/core/events/Events';
import EventBus from '../../src/core/EventBus';

import VideoModelMock from './mocks/VideoModelMock';
import VideoElementMock from './mocks/VideoElementMock';

const expect = require('chai').expect;
const context = {};

const eventBus = EventBus(context).getInstance();
const objectUtils = ObjectUtils(context).getInstance();

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
            videoMock = new VideoElementMock();

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
