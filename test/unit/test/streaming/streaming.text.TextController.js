import TextController from '../../../../src/streaming/text/TextController.js';
import VoHelper from '../../helpers/VOHelper.js';
import Constants from '../../../../src/streaming/constants/Constants.js';
import VideoModelMock from '../../mocks/VideoModelMock.js';
import MediaControllerMock from '../../mocks/MediaControllerMock.js';
import BaseURLControllerMock from '../../mocks/BaseURLControllerMock.js';
import AdapterMock from '../../mocks/AdapterMock.js';
import Settings from '../../../../src/core/Settings.js';
import FactoryMaker from '../../../../src/core/FactoryMaker.js';

import {expect} from 'chai';
const context = {};

describe('TextController', function () {

    let videoModelMock = new VideoModelMock();
    const voHelper = new VoHelper();
    const streamInfo = voHelper.getDummyStreamInfo();
    let mediaControllerMock = new MediaControllerMock();
    let dashAdapterMock = new AdapterMock();
    let baseURLControllerMock = new BaseURLControllerMock();
    const settings = Settings(context).getInstance();
    let textController;

    afterEach(function () {
        settings.reset();
    });

    beforeEach(function () {
        textController = TextController(context).create({
            videoModel: videoModelMock,
            mediaController: mediaControllerMock,
            baseURLController: baseURLControllerMock,
            adapter: dashAdapterMock,
            streamInfo,
            settings
        });

        textController.initialize();

        textController.initializeForStream(streamInfo);

        const mediaInfo = {
            lang: 'ger',
            label: 'ger',
            labels: '',
            roles: ['main'],
            id: 'track1',
            mimeType: 'codecs="stpp',
            isFragmented: true,
            isEmbedded: false
        };
        const mediaInfo2 = {
            lang: 'eng',
            label: 'eng',
            labels: '',
            roles: ['alternate'],
            id: 'track2',
            mimeType: 'codecs="stpp',
            isFragmented: true,
            isEmbedded: false
        };

        textController.addMediaInfosToBuffer(streamInfo, [mediaInfo, mediaInfo2], mediaInfo.mimeType, null);
        textController.createTracks(streamInfo);
    });

    afterEach(function () {
        textController.reset();
    });


    describe('Method enableText', function () {

        it('should not enable text if enable is not a boolean', function () {

            let textEnabled = textController.isTextEnabled();

            expect(textController.enableText.bind(textController, -1)).to.throw(Constants.BAD_ARGUMENT_ERROR);
            expect(textController.isTextEnabled()).to.equal(textEnabled); // jshint ignore:line

            expect(textController.enableText.bind(textController)).to.throw(Constants.BAD_ARGUMENT_ERROR);
            expect(textController.isTextEnabled()).to.equal(textEnabled); // jshint ignore:line

            expect(textController.enableText.bind(textController, 'toto')).to.throw(Constants.BAD_ARGUMENT_ERROR);
            expect(textController.isTextEnabled()).to.equal(textEnabled); // jshint ignore:line
        });

        it('should do nothing trying to enable/disbale text if text is already enabled/disbaled', function () {

            let textEnabled = textController.isTextEnabled();

            textController.enableText(streamInfo.id, textEnabled);
            expect(textController.isTextEnabled()).to.equal(textEnabled); // jshint ignore:line
        });
    });

    describe('Method setTextTrack', function () {

        it('should set text tracks - no track showing', function () {
            videoModelMock.tracks = [{
                id: 'track1'
            }, {
                id: 'track2'
            }];

            textController.setTextTrack(streamInfo.id, -1);
            expect(textController.getAllTracksAreDisabled()).to.be.true; // jshint ignore:line
        });

        it('should set text tracks - one track showing', function () {
            videoModelMock.tracks = [{
                id: 'track1',
                mode: 'showing'
            }, {
                id: 'track2'
            }];

            textController.setTextTrack(streamInfo.id, 0);
            expect(textController.getAllTracksAreDisabled()).to.be.false; // jshint ignore:line
        });
    });

});

describe('TextController setTextTrack switching to a fragmented track', function () {
    const videoModelMock = new VideoModelMock();
    const streamInfo = new VoHelper().getDummyStreamInfo();
    const mediaControllerMock = new MediaControllerMock();
    const dashAdapterMock = new AdapterMock();
    const baseURLControllerMock = new BaseURLControllerMock();
    const settings = Settings(context).getInstance();

    const fragmentedTrack = { lang: 'ger', id: 'track1', isFragmented: true, isEmbedded: false };
    const otherFragmentedTrack = { lang: 'eng', id: 'track2', isFragmented: true, isEmbedded: false };
    const embeddedTrack = { lang: 'eng', id: 'CC1', isFragmented: true, isEmbedded: true };
    const sideloadedTrack = { lang: 'fre', id: 'side', isFragmented: false, isEmbedded: false };
    let switchingController;
    let deleteCalls;

    // Selects oldTrack first, then switches to the fragmented track
    const switchFrom = (oldTrack) => {
        const textTrackInfos = [oldTrack, fragmentedTrack];
        let currentTrackIdx = 0;
        deleteCalls = [];

        FactoryMaker.extend('TextTracks', () => ({
            initialize: () => {},
            addTextTrackInfo: () => {},
            createTracks: () => {},
            deleteAllTextTracks: () => {},
            disableManualTracks: () => {},
            invalidateCueWindow: () => {},
            setModeForTrackIdx: () => {},
            getTextTrackInfos: () => textTrackInfos,
            getCurrentTrackIdx: () => currentTrackIdx,
            setCurrentTrackIdx: (idx) => {
                currentTrackIdx = idx;
            },
            getCurrentTextTrackInfo: () => textTrackInfos[currentTrackIdx],
            deleteCuesFromTrackIdx: (idx) => deleteCalls.push(idx)
        }), false, context);
        try {
            switchingController = TextController(context).create({
                videoModel: videoModelMock,
                mediaController: mediaControllerMock,
                baseURLController: baseURLControllerMock,
                adapter: dashAdapterMock,
                streamInfo,
                settings
            });
            switchingController.initialize();
            switchingController.initializeForStream(streamInfo);
        } finally {
            delete context.TextTracks;
        }
        mediaControllerMock.tracks = [fragmentedTrack, otherFragmentedTrack];
        switchingController.addMediaInfosToBuffer(streamInfo, Constants.TEXT, [fragmentedTrack, otherFragmentedTrack]);
        // The fragmented track loaded before the switch
        mediaControllerMock.track = otherFragmentedTrack;

        switchingController.setTextTrack(streamInfo.id, 1);
    };

    afterEach(function () {
        switchingController.reset();
        mediaControllerMock.track = undefined;
        mediaControllerMock.tracks = [];
    });

    it('should delete the cues of the previous fragmented track', function () {
        switchFrom(otherFragmentedTrack);

        expect(deleteCalls).to.deep.equal([0]);
    });

    it('should keep the cues of a previous embedded track', function () {
        switchFrom(embeddedTrack);

        expect(deleteCalls).to.be.empty;
    });

    it('should keep the cues of a previous non-fragmented track', function () {
        switchFrom(sideloadedTrack);

        expect(deleteCalls).to.be.empty;
    });
});
