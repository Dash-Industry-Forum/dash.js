import TextController from '../../src/streaming/text/TextController';
import VoHelper from './helpers/VOHelper';
import Constants from '../../src/streaming/constants/Constants';
import VideoModelMock from './mocks/VideoModelMock';
import MediaControllerMock from './mocks/MediaControllerMock';
import AdapterMock from './mocks/AdapterMock';


const expect = require('chai').expect;
const context = {};


describe('TextController', function () {

    let videoModelMock = new VideoModelMock();
    const voHelper = new VoHelper();
    const streamInfo = voHelper.getDummyStreamInfo();
    let mediaControllerMock = new MediaControllerMock();
    let dashAdapterMock = new AdapterMock();
    let textController;

    beforeEach(function () {
        if (typeof document === 'undefined') {
            global.document = {
                getElementById: function () {
                    return 1;
                },
                head: {
                    removeChild: function () {
                    }
                }
            };
        }
        if (typeof window === 'undefined') {
            global.window = {};
        }
        if (typeof navigator === 'undefined') {
            global.navigator = {};
        }
    });

    afterEach(function () {
        if (typeof window !== 'undefined' && global !== window) {
            delete global.document;
        }
        delete global.window;
        delete global.navigator;
    });

    beforeEach(function () {
        textController = TextController(context).create({
            videoModel: videoModelMock,
            mediaController: mediaControllerMock,
            adapter: dashAdapterMock,
            streamInfo
        });

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
