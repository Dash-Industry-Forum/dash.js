import TextController from '../../src/streaming/text/TextController';
import TextTracks from '../../src/streaming/text/TextTracks';
import TextSourceBuffer from '../../src/streaming/text/TextSourceBuffer';
import ObjectUtils from '../../src/streaming/utils/ObjectUtils';
import EventBus from '../../src/core/EventBus';
import Events from '../../src/core/events/Events';

import VideoModelMock from './mocks/VideoModelMock';

const expect = require('chai').expect;
const context = {};

const objectUtils = ObjectUtils(context).getInstance();
const eventBus = EventBus(context).getInstance();

describe('TextController', function () {

    let videoModelMock = new VideoModelMock();
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
        textTracks.deleteAllTextTracks();
    });

    it('should return TextSourceBuffer instance', function () {
        let textSourceBuffer = textController.getTextSourceBuffer();
        let textSourceBufferSingleton = TextSourceBuffer(context).getInstance();

        expect(objectUtils.areEqual(textSourceBuffer, textSourceBufferSingleton)).to.be.true; // jshint ignore:line
    });

    describe('Method setTextDefaultLanguage', function () {
        it('should not set text default language if language is not a string', function () {
            textController.setTextDefaultLanguage(-1);
            expect(textController.getTextDefaultLanguage()).to.equal(''); // jshint ignore:line

            textController.setTextDefaultLanguage();
            expect(textController.getTextDefaultLanguage()).to.equal(''); // jshint ignore:line
        });

        it('should set text default language if language is a string', function () {
            textController.setTextDefaultLanguage('lang');
            expect(textController.getTextDefaultLanguage()).to.equal('lang'); // jshint ignore:line
        });

    });

    describe('Method setTextDefaultEnabled', function () {
        it('should not set text default enabled if enable is not a boolean', function () {
            textController.setTextDefaultEnabled(-1);
            expect(textController.getTextDefaultEnabled()).to.equal(true); // jshint ignore:line

            textController.setTextDefaultEnabled();
            expect(textController.getTextDefaultEnabled()).to.equal(true); // jshint ignore:line
        });

        it('should set text default enabled if enable is a boolean', function () {
            textController.setTextDefaultEnabled(false);
            expect(textController.getTextDefaultEnabled()).to.equal(false); // jshint ignore:line

            textController.setTextDefaultEnabled(true);
            expect(textController.getTextDefaultEnabled()).to.equal(true); // jshint ignore:line
        });

    });

    describe('Method enableText', function () {
        beforeEach(function () {
            textTracks.addTextTrack({
                index: 0,
                kind: 'subtitles',
                label: 'eng',
                defaultTrack: true,
                isTTML: true
            }, 2);

            textTracks.addTextTrack({
                index: 1,
                kind: 'subtitles',
                label: 'fr',
                defaultTrack: false,
                isTTML: true
            }, 2);
        });

        it('should not enable text if enable is not a boolean', function () {

            let textEnabled = textController.isTextEnabled();

            textController.enableText(-1);
            expect(textController.isTextEnabled()).to.equal(textEnabled); // jshint ignore:line

            textController.enableText();
            expect(textController.isTextEnabled()).to.equal(textEnabled); // jshint ignore:line

            textController.enableText('toto');
            expect(textController.isTextEnabled()).to.equal(textEnabled); // jshint ignore:line
        });

        it('should do nothing trying to enable/disbale text if text is already enabled/disbaled', function () {

            let textEnabled = textController.isTextEnabled();

            textController.enableText(textEnabled);
            expect(textController.isTextEnabled()).to.equal(textEnabled); // jshint ignore:line
        });

        it('should enable/disable text', function () {

            let textEnabled = textController.isTextEnabled();
            expect(textEnabled).to.equal(true); // jshint ignore:line

            textController.enableText(false);
            expect(textController.isTextEnabled()).to.equal(false); // jshint ignore:line

            textController.enableText(true);
            expect(textController.isTextEnabled()).to.equal(true); // jshint ignore:line
        });
    });

    describe('Method setTextTrack', function () {

        beforeEach(function () {
            textTracks.addTextTrack({
                index: 0,
                kind: 'subtitles',
                label: 'eng',
                defaultTrack: true,
                isTTML: true
            }, 2);

            textTracks.addTextTrack({
                index: 1,
                kind: 'subtitles',
                label: 'fr',
                defaultTrack: false,
                isTTML: true
            }, 2);
        });

        it('should set text tracks - no track showing', function () {
            videoModelMock.tracks = [{
                id: 'track1'
            }, {
                id: 'track2'
            }];

            textController.setTextTrack(-1);
            expect(textController.getAllTracksAreDisabled()).to.be.true; // jshint ignore:line
        });

        it('should set text tracks - one track showing', function () {
            videoModelMock.tracks = [{
                id: 'track1',
                mode: 'showing'
            }, {
                id: 'track2'
            }];

            textController.setTextTrack(0);
            expect(textController.getAllTracksAreDisabled()).to.be.false; // jshint ignore:line
        });
    });

    describe('Handle event TEXT_TRACKS_QUEUE_INITIALIZED', function () {
        var textTracksQueue;
        var initialIndex;

        beforeEach(function () {
            textTracksQueue = [];
            initialIndex = 0;

            textTracksQueue.push({
                index: 0,
                kind: 'subtitles',
                label: 'sub_en',
                lang: 'eng'
            });

            textTracksQueue.push({
                index: 1,
                kind: 'subtitles',
                label: 'sub_fr',
                lang: 'fr'
            });
        });

        it('should send TEXT_TRACKS_ADDED event', function (done) {
            // init test
            textController.setTextDefaultLanguage('');

            const event = {
                index: initialIndex,
                tracks: textTracksQueue
            };
            const onTracksAdded = function (e) {
                expect(e.index).to.equal(initialIndex); // jshint ignore:line
                expect(e.tracks.length).to.equal(textTracksQueue.length); // jshint ignore:line

                eventBus.off(Events.TEXT_TRACKS_ADDED, onTracksAdded, this);
                done();
            };
            eventBus.on(Events.TEXT_TRACKS_ADDED, onTracksAdded, this);

            // send event
            eventBus.trigger(Events.TEXT_TRACKS_QUEUE_INITIALIZED, event);
        });

        it('should choose langauge according to default language', function (done) {
            // init test
            textController.setTextDefaultLanguage('fr');

            const event = {
                index: initialIndex,
                tracks: textTracksQueue
            };
            const onTracksAdded = function (e) {
                expect(e.index).to.equal(1); // jshint ignore:line
                expect(e.tracks.length).to.equal(textTracksQueue.length); // jshint ignore:line
                eventBus.off(Events.TEXT_TRACKS_ADDED, onTracksAdded, this);
                done();
            };
            eventBus.on(Events.TEXT_TRACKS_ADDED, onTracksAdded, this);

            // send event
            eventBus.trigger(Events.TEXT_TRACKS_QUEUE_INITIALIZED, event);
        });

        it('should enable text according to default enable', function (done) {
            // init test
            textController.setTextDefaultEnabled(false);

            const event = {
                index: initialIndex,
                tracks: textTracksQueue
            };
            const onTracksAdded = function (e) {
                expect(e.index).to.equal(1); // jshint ignore:line
                expect(e.tracks.length).to.equal(textTracksQueue.length); // jshint ignore:line
                expect(e.enabled).to.equal(false);
                eventBus.off(Events.TEXT_TRACKS_ADDED, onTracksAdded, this);
                done();
            };
            eventBus.on(Events.TEXT_TRACKS_ADDED, onTracksAdded, this);

            // send event
            eventBus.trigger(Events.TEXT_TRACKS_QUEUE_INITIALIZED, event);
        });
    });

});
