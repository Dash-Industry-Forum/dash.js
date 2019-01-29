import DashAdapter from '../../src/dash/DashAdapter';
import MediaInfo from '../../src/streaming/vo/MediaInfo';
import Constants from '../../src/streaming/constants/Constants';

import RepresentationControllerMock from './mocks/RepresentationControllerMock';
import StreamProcessorMock from './mocks/StreamProcessorMock';
import DashManifestModelMock from './mocks/DashManifestModelMock';

const expect = require('chai').expect;

const context = {};
const dashManifestModelMock = new DashManifestModelMock();
const dashAdapter = DashAdapter(context).getInstance();
dashAdapter.setConfig({
    dashManifestModel: dashManifestModelMock
});

describe('DashAdapter', function () {

    it('should return the first adaptation when getAdaptationForType is called and streamInfo is undefined', () => {
        const manifest = { Period_asArray: [{ AdaptationSet_asArray: [{ id: 0, mimeType: 'video' }, { id: 1, mimeType: 'video' }] }] };
        const adaptation = dashAdapter.getAdaptationForType(manifest, 0, 'video');

        expect(adaptation.id).to.equal(0); // jshint ignore:line
    });

    it('should return the correct adaptation when getAdaptationForType is called', () => {
        const manifest = { Period_asArray: [{ AdaptationSet_asArray: [{ id: undefined, mimeType: 'audio', lang: 'eng', Role_asArray: [{ value: 'main' }] }, { id: undefined, mimeType: 'audio', lang: 'deu', Role_asArray: [{ value: 'main' }] }] }] };

        const streamInfo = {
            id: 'id'
        };

        const track = new MediaInfo();

        track.id = undefined;
        track.index = 1;
        track.streamInfo = streamInfo;
        track.representationCount = 0;
        track.lang = 'deu';
        track.roles = ['main'];
        track.codec = 'audio/mp4;codecs="mp4a.40.2"';
        track.mimeType = 'audio/mp4';

        dashAdapter.setCurrentMediaInfo(streamInfo.id, 'audio', track);

        const adaptation = dashAdapter.getAdaptationForType(manifest, 0, 'audio', streamInfo);

        expect(adaptation.lang).to.equal('eng'); // jshint ignore:line
    });

    it('should throw an exception when attempting to call getStreamsInfo While the setConfig function was not called, and externalManifest parameter is defined', function () {
        expect(dashAdapter.getStreamsInfo.bind(dashAdapter,{})).to.throw('setConfig function has to be called previously');
    });

    it('should throw an exception when attempting to call getAllMediaInfoForType While the setConfig function was not called, and externalManifest parameter is defined', function () {
        expect(dashAdapter.getAllMediaInfoForType.bind(dashAdapter, null, null, {})).to.throw('setConfig function has to be called previously');
    });

    it('should return an empty array when getEventsFor is called and voPeriods is an empty array', function () {
        dashAdapter.reset();
        const eventsArray = dashAdapter.getEventsFor();

        expect(eventsArray).to.be.instanceOf(Array);    // jshint ignore:line
        expect(eventsArray).to.be.empty;                // jshint ignore:line
    });

    it('should return an empty array when getAllMediaInfoForType is called and voPeriods is an empty array', function () {
        const mediaInfoArray = dashAdapter.getAllMediaInfoForType();

        expect(mediaInfoArray).to.be.instanceOf(Array);    // jshint ignore:line
        expect(mediaInfoArray).to.be.empty;                // jshint ignore:line
    });

    it('should return null when updatePeriods is called and newManifest is undefined', function () {
        const returnValue = dashAdapter.updatePeriods();

        expect(returnValue).to.be.null;                // jshint ignore:line
    });

    it('should throw an error when updatePeriods is called and newManifest parameter is defined, while setConfig has not been called', function () {
        expect(dashAdapter.updatePeriods.bind(dashAdapter,{})).to.be.throw('setConfig function has to be called previously');
    });

    it('should return null when getMediaInfoForType is called and voPeriods is an empty array', function () {
        const mediaInfo = dashAdapter.getMediaInfoForType();

        expect(mediaInfo).to.be.null;                // jshint ignore:line
    });

    it('should return null when getDataForMedia is called and voPeriods is an empty array, mediaInfo parameter is undefined', function () {
        const adaptation = dashAdapter.getDataForMedia();

        expect(adaptation).to.be.null;                // jshint ignore:line
    });

    it('should return null when getDataForMedia is called and voPeriods is an empty array, mediaInfo parameter is an empty object', function () {
        const adaptation = dashAdapter.getDataForMedia({});

        expect(adaptation).to.be.null;                // jshint ignore:line
    });

    it('should return null when getEvent is called and no parameter is set', function () {
        const event = dashAdapter.getEvent();

        expect(event).to.be.null;                // jshint ignore:line
    });

    it('should return null when getEvent is called and an empty eventBox parameter is set and eventStreams is undefined', function () {
        const event = dashAdapter.getEvent({});

        expect(event).to.be.null;                // jshint ignore:line
    });

    it('should return null when getEvent is called and an empty eventBox and eventStreams parameters are set', function () {
        const event = dashAdapter.getEvent({}, []);

        expect(event).to.be.null;                // jshint ignore:line
    });

    it('should return an empty event object when getEvent is called and eventBox and eventStreams parameters are set', function () {
        const event = dashAdapter.getEvent({scheme_id_uri: 'id', value: 'value'}, {'id/value': {}});

        expect(event).to.be.an('object');
    });

    describe('streamProcessor parameter is missing or malformed', () => {
        it('should throw an error when getInitRequest is called and streamProcessor parameter is undefined', function () {
            expect(dashAdapter.getInitRequest.bind(dashAdapter)).to.be.throw('streamProcessor parameter is missing or malformed!');
        });

        it('should throw an error when getFragmentRequest is called and streamProcessor parameter is undefined', function () {
            expect(dashAdapter.getFragmentRequest.bind(dashAdapter)).to.be.throw('streamProcessor parameter is missing or malformed!');
        });

        it('should throw an error when getIndexHandlerTime is called and streamProcessor parameter is undefined', function () {
            expect(dashAdapter.getIndexHandlerTime.bind(dashAdapter)).to.be.throw('streamProcessor parameter is missing or malformed!');
        });

        it('should throw an error when setIndexHandlerTime is called and streamProcessor parameter is undefined', function () {
            expect(dashAdapter.setIndexHandlerTime.bind(dashAdapter)).to.be.throw('streamProcessor parameter is missing or malformed!');
        });

        it('should throw an error when updateData is called and streamProcessor parameter is undefined', function () {
            expect(dashAdapter.updateData.bind(dashAdapter)).to.be.throw('streamProcessor parameter is missing or malformed!');
        });

        it('should throw an error when getInitRequest is called and streamProcessor is an empty object', function () {
            expect(dashAdapter.getInitRequest.bind(dashAdapter, {})).to.be.throw('streamProcessor parameter is missing or malformed!');
        });

        it('should throw an error when getFragmentRequest is called and streamProcessor is an empty object', function () {
            expect(dashAdapter.getFragmentRequest.bind(dashAdapter, {})).to.be.throw('streamProcessor parameter is missing or malformed!');
        });

        it('should throw an error when getIndexHandlerTime is called and streamProcessor is an empty object', function () {
            expect(dashAdapter.getIndexHandlerTime.bind(dashAdapter, {})).to.be.throw('streamProcessor parameter is missing or malformed!');
        });

        it('should throw an error when setIndexHandlerTime is called and streamProcessor is an empty object', function () {
            expect(dashAdapter.setIndexHandlerTime.bind(dashAdapter, {})).to.be.throw('streamProcessor parameter is missing or malformed!');
        });

        it('should throw an error when updateData is called and streamProcessor is an empty object', function () {
            expect(dashAdapter.updateData.bind(dashAdapter, {})).to.be.throw('streamProcessor parameter is missing or malformed!');
        });
    });

    describe('streamProcessor parameter is properly defined, without its attributes', () => {
        const streamProcessorMock = new StreamProcessorMock('video/mp4');

        it('should return null when getInitRequest is called and streamProcessor is defined, without its attributes', function () {
            const initRequest = dashAdapter.getInitRequest(streamProcessorMock, 0);

            expect(initRequest).to.be.null;                // jshint ignore:line
        });

        it('should return null when getFragmentRequest is called and streamProcessor is defined, without its attributes', function () {
            const nextFragRequest = dashAdapter.getFragmentRequest(streamProcessorMock);

            expect(nextFragRequest).to.be.null;                // jshint ignore:line
        });

        it('should return NaN when getIndexHandlerTime is called and streamProcessor is defined, without its attributes', function () {
            const time = dashAdapter.getIndexHandlerTime(streamProcessorMock);

            expect(time).to.be.NaN;                // jshint ignore:line
        });

        it('should not throw an error when setIndexHandlerTime is called and streamProcessor is defined, without its attributes', function () {
            expect(dashAdapter.setIndexHandlerTime.bind(dashAdapter, streamProcessorMock)).to.not.throw();
        });

        it('should not throw an error when updateData is called and streamProcessor is defined, without its attributes', function () {
            expect(dashAdapter.updateData.bind(dashAdapter, streamProcessorMock)).to.not.throw();
        });

        it('should throw an error when getInitRequest is called and streamProcessor is defined, but quality is not a number', function () {
            expect(dashAdapter.getInitRequest.bind(dashAdapter, streamProcessorMock, {})).to.be.throw(Constants.BAD_ARGUMENT_ERROR + ' : argument is not an integer');
        });
    });

    describe('representationController parameter is missing or malformed', () => {
        it('should throw an error when getRepresentationInfo is called and representationController parameter is undefined', function () {
            expect(dashAdapter.getRepresentationInfo.bind(dashAdapter)).to.be.throw('representationController parameter is missing or malformed!');
        });
    });

    describe('representationController parameter is properly defined, without its attributes', () => {
        const representationControllerMock = new RepresentationControllerMock();

        it('should throw an error when getRepresentationInfo is called and representationController parameter is defined, but quality is not a number', function () {
            expect(dashAdapter.getRepresentationInfo.bind(dashAdapter, representationControllerMock, {})).to.be.throw(Constants.BAD_ARGUMENT_ERROR + ' : argument is not an integer');
        });
    });
});
