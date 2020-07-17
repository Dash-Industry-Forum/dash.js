import DashAdapter from '../../src/dash/DashAdapter';
import MediaInfo from '../../src/dash/vo/MediaInfo';
import Constants from '../../src/streaming/constants/Constants';
import cea608parser from '../../externals/cea608-parser';

import VoHelper from './helpers/VOHelper';
import ErrorHandlerMock from './mocks/ErrorHandlerMock';

const expect = require('chai').expect;

const context = {};
const voHelper = new VoHelper();
const dashAdapter = DashAdapter(context).getInstance();
const errorHandlerMock = new ErrorHandlerMock();
const manifest_with_audio = { loadedTime: new Date(), mediaPresentationDuration: 10, Period_asArray: [{ AdaptationSet_asArray: [{ id: undefined, mimeType: Constants.AUDIO, lang: 'eng', Role_asArray: [{ value: 'main' }] }, { id: undefined, mimeType: Constants.AUDIO, lang: 'deu', Role_asArray: [{ value: 'main' }] }] }] };
const manifest_with_video_with_embedded_subtitles = { loadedTime: new Date(), mediaPresentationDuration: 10, Period_asArray: [{ AdaptationSet_asArray: [{ id: 0, mimeType: Constants.VIDEO, Accessibility: {schemeIdUri: 'urn:scte:dash:cc:cea-608:2015', value: 'CC1=eng;CC3=swe'}, Accessibility_asArray: [{schemeIdUri: 'urn:scte:dash:cc:cea-608:2015', value: 'CC1=eng;CC3=swe'}]}, { id: 1, mimeType: Constants.VIDEO}] }] };
const manifest_with_ll_service_description = { loadedTime: new Date(), mediaPresentationDuration: 10, ServiceDescription: {}, ServiceDescription_asArray: [{ Scope: { schemeIdUri: 'urn:dvb:dash:lowlatency:scope:2019' }, Latency: { target: 3000, max: 5000, min: 2000}, PlaybackRate: { max: 1.5, min: 0.5 } }], Period_asArray: [{ AdaptationSet_asArray: [{ id: 0, mimeType: Constants.VIDEO, SupplementalProperty: {}, SupplementalProperty_asArray: [{ schemeIdUri: 'urn:dvb:dash:lowlatency:critical:2019', value: 'true' }] }] }] };
const manifest_without_supplemental_properties = { loadedTime: new Date(), mediaPresentationDuration: 10, Period_asArray: [{ AdaptationSet_asArray: [{ id: 0, mimeType: Constants.VIDEO }] }] };


describe('DashAdapter', function () {
    describe('SetConfig not previously called', function () {

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

        it('should return undefined when getRealAdaptation is called and streamInfo parameter is null or undefined', function () {
            const realAdaptation = dashAdapter.getRealAdaptation(null,voHelper.getDummyMediaInfo(Constants.VIDEO));

            expect(realAdaptation).to.be.undefined; // jshint ignore:line
        });

        it('should return undefined when getRealAdaptation is called and mediaInfo parameter is null or undefined', function () {
            const realAdaptation = dashAdapter.getRealAdaptation(voHelper.getDummyStreamInfo(), null);

            expect(realAdaptation).to.be.undefined; // jshint ignore:line
        });

        it('should return empty array when getUTCTimingSources is called and no period is defined', function () {
            const timingSources = dashAdapter.getUTCTimingSources();

            expect(timingSources).to.be.instanceOf(Array);    // jshint ignore:line
            expect(timingSources).to.be.empty;                // jshint ignore:line
        });

        it('should return null when getSuggestedPresentationDelay is called and no period is defined', function () {
            const suggestedPresentationDelay = dashAdapter.getSuggestedPresentationDelay();

            expect(suggestedPresentationDelay).to.be.null;   // jshint ignore:line
        });

        it('should return false when getIsDynamic is called and no period is defined', function () {
            const isDynamic = dashAdapter.getIsDynamic();

            expect(isDynamic).to.be.false;   // jshint ignore:line
        });

        it('should return Number.MAX_SAFE_INTEGER || Number.MAX_VALUE when getDuration is called and no period is defined', function () {
            const duration = dashAdapter.getDuration();

            expect(duration).to.equal(Number.MAX_SAFE_INTEGER || Number.MAX_VALUE); // jshint ignore:line
        });

        it('should return null when getAvailabilityStartTime is called and no period is defined', function () {
            const availabilityStartTime = dashAdapter.getAvailabilityStartTime();

            expect(availabilityStartTime).to.be.null; // jshint ignore:line
        });

        it('should return empty array when getRegularPeriods is called and no period is defined', function () {
            const regularPeriods = dashAdapter.getRegularPeriods();

            expect(regularPeriods).to.be.instanceOf(Array);    // jshint ignore:line
            expect(regularPeriods).to.be.empty;                // jshint ignore:line
        });
    });

    describe('SetConfig previously called', function () {
        beforeEach(function () {
            dashAdapter.setConfig({
                constants: Constants,
                errHandler: errorHandlerMock,
                cea608parser: cea608parser
            });
        });

        it('should return null when convertDataToRepresentationInfo is called and voRepresentation parameter is null or undefined', function () {
            const representationInfo = dashAdapter.convertDataToRepresentationInfo();

            expect(representationInfo).to.be.null;                // jshint ignore:line
        });

        it('should return correct representationInfo when convertDataToRepresentationInfo is called and voRepresentation parameter is well defined', function () {
            const voRepresentation = voHelper.getDummyRepresentation(Constants.VIDEO, 0);
            const representationInfo = dashAdapter.convertDataToRepresentationInfo(voRepresentation);

            expect(representationInfo).not.to.be.null;            // jshint ignore:line
            expect(representationInfo.quality).to.equal(0);         // jshint ignore:line
        });

        it('should return undefined when getVoRepresentations is called and mediaInfo parameter is null or undefined', function () {
            const voRepresentations = dashAdapter.getVoRepresentations();

            expect(voRepresentations).to.be.instanceOf(Array);    // jshint ignore:line
            expect(voRepresentations).to.be.empty;                // jshint ignore:line
        });

        it('should return the first adaptation when getAdaptationForType is called and streamInfo is undefined', () => {
            const manifest_with_video = { loadedTime: new Date(), mediaPresentationDuration: 10, Period_asArray: [{ AdaptationSet_asArray: [{ id: 0, mimeType: Constants.VIDEO}, { id: 1, mimeType: Constants.VIDEO}] }] };
            dashAdapter.updatePeriods(manifest_with_video);
            const adaptation = dashAdapter.getAdaptationForType(0, Constants.VIDEO);

            expect(adaptation.id).to.equal(0); // jshint ignore:line
        });

        it('should return an empty array getStreamsInfo externalManifest is an empty object and maxStreamsInfo is undefined', function () {
            const streamInfos = dashAdapter.getStreamsInfo({});

            expect(streamInfos).to.be.instanceOf(Array);    // jshint ignore:line
            expect(streamInfos).to.be.empty;                // jshint ignore:line
        });

        it('should return an empty array getStreamsInfo externalManifest is not an empty object and maxStreamsInfo is defined', function () {
            const streamInfos = dashAdapter.getStreamsInfo(manifest_with_audio, 10);

            expect(streamInfos).to.be.instanceOf(Array);    // jshint ignore:line
            expect(streamInfos.length).to.equal(1);                // jshint ignore:line
        });

        describe('updatePeriods previously called', function () {
            beforeEach(function () {
                dashAdapter.updatePeriods(manifest_with_audio);
            });

            afterEach(function () {
                dashAdapter.reset();
            });

            it('should return null when getMediaInfoForType is called and voPeriods is not an empty array, but streamInfo is undefined', function () {
                const mediaInfo = dashAdapter.getMediaInfoForType();

                expect(mediaInfo).to.be.null;  // jshint ignore:line
            });

            it('should return null when getMediaInfoForType is called and voPeriods is not an empty array, and streamInfo is defined but not in the current manifest', function () {
                const streamInfo = voHelper.getDummyStreamInfo();

                streamInfo.index = 0;
                const mediaInfo = dashAdapter.getMediaInfoForType(streamInfo, Constants.AUDIO);

                expect(mediaInfo).to.be.null;  // jshint ignore:line
            });

            it('should return null when getMediaInfoForType is called and voPeriods is not an empty array, and streamInfo is defined', function () {
                const streamInfo = voHelper.getDummyStreamInfo();

                streamInfo.id = 'defaultId_0';
                streamInfo.index = 0;
                const mediaInfo = dashAdapter.getMediaInfoForType(streamInfo, Constants.AUDIO);

                expect(mediaInfo).not.to.be.null;  // jshint ignore:line
            });

            it('should return null when getBandwidthForRepresentation is called and representationId and periodId are undefined', () => {
                const bdwth = dashAdapter.getBandwidthForRepresentation();

                expect(bdwth).to.be.null;  // jshint ignore:line
            });

            it('should return -1 when getIndexForRepresentation is called and representationId and periodIdx are undefined', () => {
                const index = dashAdapter.getIndexForRepresentation();

                expect(index).to.be.equal(-1);  // jshint ignore:line
            });

            it('should return -1 when getMaxIndexForBufferType is called and bufferType and periodIdx are undefined', () => {
                const index = dashAdapter.getMaxIndexForBufferType();

                expect(index).to.be.equal(-1);  // jshint ignore:line
            });

            it('should return undefined when getRealAdaptation is called and streamInfo parameter is null or undefined', function () {
                const realAdaptation = dashAdapter.getRealAdaptation(null,voHelper.getDummyMediaInfo(Constants.VIDEO));

                expect(realAdaptation).to.be.undefined; // jshint ignore:line
            });

            it('should return the correct adaptation when getAdaptationForType is called', () => {
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

                dashAdapter.setCurrentMediaInfo(streamInfo.id, Constants.AUDIO, track);
                const adaptation = dashAdapter.getAdaptationForType(0, Constants.AUDIO, streamInfo);

                expect(adaptation.lang).to.equal('eng'); // jshint ignore:line
            });

            it('should return an empty array when getEventsFor is called and info parameter is undefined', function () {
                const eventsArray = dashAdapter.getEventsFor();

                expect(eventsArray).to.be.instanceOf(Array);    // jshint ignore:line
                expect(eventsArray).to.be.empty;                // jshint ignore:line
            });

            it('should return an empty array when getAllMediaInfoForType is called and voPeriods is not an empty array', function () {
                const mediaInfoArray = dashAdapter.getAllMediaInfoForType();

                expect(mediaInfoArray).to.be.instanceOf(Array);    // jshint ignore:line
                expect(mediaInfoArray).to.be.empty;                // jshint ignore:line
            });

            it('should return an empty array when getAllMediaInfoForType is called and voPeriods is not an empty array, and streamInfo parameter is set', function () {
                const mediaInfoArray = dashAdapter.getAllMediaInfoForType({id: 'defaultId_0', index: 0}, Constants.AUDIO);

                expect(mediaInfoArray).to.be.instanceOf(Array);    // jshint ignore:line
                expect(mediaInfoArray).to.not.be.empty;                // jshint ignore:line
            });

            it('should return an empty array when getAllMediaInfoForType is called and externalManifest is set', function () {
                const mediaInfoArray = dashAdapter.getAllMediaInfoForType(null, null, manifest_with_audio);

                expect(mediaInfoArray).to.be.instanceOf(Array);    // jshint ignore:line
                expect(mediaInfoArray).to.be.empty;                // jshint ignore:line
            });

            it('should return an empty array when getAllMediaInfoForType is called and, embeddedText type and externalManifest are set', function () {
                const mediaInfoArray = dashAdapter.getAllMediaInfoForType({id: 'defaultId_0', index: 0}, Constants.EMBEDDED_TEXT, manifest_with_video_with_embedded_subtitles);

                expect(mediaInfoArray).to.be.instanceOf(Array);    // jshint ignore:line
                expect(mediaInfoArray.length).equals(2);           // jshint ignore:line
            });

            it('should read service description attributes', function () {
                const streamInfos = dashAdapter.getStreamsInfo(manifest_with_ll_service_description, 10);

                expect(streamInfos).to.be.instanceOf(Array);    // jshint ignore:line
                expect(streamInfos.length).equals(1);           // jshint ignore:line

                expect(streamInfos[0].manifestInfo).not.to.be.null; ;    // jshint ignore:line
                expect(streamInfos[0].manifestInfo.serviceDescriptions).to.be.instanceOf(Array);    // jshint ignore:line
                expect(streamInfos[0].manifestInfo.serviceDescriptions.length).equals(1);           // jshint ignore:line

                expect(streamInfos[0].manifestInfo.serviceDescriptions[0].schemeIdUri).equals('urn:dvb:dash:lowlatency:scope:2019');           // jshint ignore:line
                expect(streamInfos[0].manifestInfo.serviceDescriptions[0].latency.target).equals(3000);        // jshint ignore:line
                expect(streamInfos[0].manifestInfo.serviceDescriptions[0].latency.max).equals(5000);           // jshint ignore:line
                expect(streamInfos[0].manifestInfo.serviceDescriptions[0].latency.min).equals(2000);           // jshint ignore:line
                expect(streamInfos[0].manifestInfo.serviceDescriptions[0].playbackRate.max).equals(1.5);       // jshint ignore:line
                expect(streamInfos[0].manifestInfo.serviceDescriptions[0].playbackRate.min).equals(0.5);       // jshint ignore:line
            });

            it('supplemental properties should be empty if not defined', function () {
                const mediaInfoArray = dashAdapter.getAllMediaInfoForType({id: 'defaultId_0', index: 0}, Constants.VIDEO, manifest_without_supplemental_properties);

                expect(mediaInfoArray).to.be.instanceOf(Array);    // jshint ignore:line
                expect(mediaInfoArray.length).equals(1);           // jshint ignore:line

                expect(mediaInfoArray[0].supplementalProperties).not.to.be.null;                   // jshint ignore:line
                expect(Object.keys(mediaInfoArray[0].supplementalProperties).length).equals(0);    // jshint ignore:line
            });
        });
    });
});
