import DashAdapter from '../../src/dash/DashAdapter';
import MediaInfo from '../../src/dash/vo/MediaInfo';
import Constants from '../../src/streaming/constants/Constants';
import DashConstants from '../../src/dash/constants/DashConstants';
import cea608parser from '../../externals/cea608-parser';

import VoHelper from './helpers/VOHelper';
import PatchHelper from './helpers/PatchHelper.js';
import ErrorHandlerMock from './mocks/ErrorHandlerMock';
import DescriptorType from '../../src/dash/vo/DescriptorType';

const expect = require('chai').expect;

const context = {};
const voHelper = new VoHelper();
const dashAdapter = DashAdapter(context).getInstance();
const errorHandlerMock = new ErrorHandlerMock();
const manifest_with_audio = {
    loadedTime: new Date(),
    mediaPresentationDuration: 10,
    Period_asArray: [{
        AdaptationSet_asArray: [
            {
                id: undefined, mimeType: Constants.AUDIO,
                lang: 'eng', Role_asArray: [{ value: 'main' }]
            }, {
                id: undefined, mimeType: Constants.AUDIO,
                lang: 'deu', Role_asArray: [{ value: 'main' }]
            }
        ]
    }]
};
const manifest_with_video_with_embedded_subtitles = {
    loadedTime: new Date(),
    mediaPresentationDuration: 10,
    Period_asArray: [{
        AdaptationSet_asArray: [
            {
                id: 0, mimeType: Constants.VIDEO,
                Accessibility_asArray: [{ schemeIdUri: 'urn:scte:dash:cc:cea-608:2015', value: 'CC1=eng;CC3=swe' }]
            }, {
                id: 1, mimeType: Constants.VIDEO
            }
        ]
    }]
};
const manifest_with_ll_service_description = {
    loadedTime: new Date(),
    mediaPresentationDuration: 10,
    ServiceDescription: {},
    ServiceDescription_asArray: [{
        Scope: { schemeIdUri: 'urn:dvb:dash:lowlatency:scope:2019' },
        Latency: { target: 3000, max: 5000, min: 2000, referenceId: 7 },
        PlaybackRate: { max: 1.5, min: 0.5 }
    }],
    Period_asArray: [{
        AdaptationSet_asArray: [{
            id: 0, mimeType: Constants.VIDEO,
            SupplementalProperty_asArray: [{ schemeIdUri: 'urn:dvb:dash:lowlatency:critical:2019', value: 'true' }]
        }]
    }]
};
const manifest_without_supplemental_properties = {
    loadedTime: new Date(),
    mediaPresentationDuration: 10,
    Period_asArray: [{ AdaptationSet_asArray: [{ id: 0, mimeType: Constants.VIDEO }] }]
};
const manifest_with_supplemental_properties = {
    loadedTime: new Date(),
    mediaPresentationDuration: 10,
    Period_asArray: [{
        AdaptationSet_asArray: [{
            id: 0, mimeType: Constants.VIDEO,
            SupplementalProperty_asArray: [{
                schemeIdUri: 'test:scheme',
                value: 'value1'
            }, { schemeIdUri: 'test:scheme', value: 'value2' }]
        }]
    }]
};
const manifest_with_supplemental_properties_on_repr = {
    loadedTime: new Date(),
    mediaPresentationDuration: 10,
    Period_asArray: [{
        AdaptationSet_asArray: [{
            id: 0, mimeType: Constants.VIDEO,
            // SupplementalProperty_asArray: [{schemeIdUri: 'test:scheme', value: 'value1'},{schemeIdUri: 'test:scheme', value: 'value2'},{schemeIdUri: 'test:scheme', value: 'value3'}],
            [DashConstants.REPRESENTATION_ASARRAY]: [
                {
                    id: 10, bandwidth: 128000,
                    [DashConstants.SUPPLEMENTAL_PROPERTY_ASARRAY]: [
                        { schemeIdUri: 'test:scheme', value: 'value1' },
                        { schemeIdUri: 'test:scheme', value: 'value2' },
                        { schemeIdUri: 'test:scheme', value: 'value3' }
                    ]
                },
                {
                    id: 11, bandwidth: 160000,
                    [DashConstants.SUPPLEMENTAL_PROPERTY_ASARRAY]: [
                        { schemeIdUri: 'test:scheme', value: 'value1' },
                        { schemeIdUri: 'test:scheme', value: 'value2' },
                        { schemeIdUri: 'test:scheme', value: 'value3' }
                    ]
                }
            ]
        }]
    }]
};
const manifest_with_supplemental_properties_on_only_one_repr = {
    loadedTime: new Date(),
    mediaPresentationDuration: 10,
    Period_asArray: [{
        AdaptationSet_asArray: [{
            id: 0, mimeType: Constants.VIDEO,
            [DashConstants.REPRESENTATION_ASARRAY]: [
                {
                    id: 10, bandwidth: 128000,
                    [DashConstants.SUPPLEMENTAL_PROPERTY_ASARRAY]: [
                        { schemeIdUri: 'test:scheme', value: 'value1' },
                        { schemeIdUri: 'test:scheme', value: 'value2' }
                    ]
                },
                {
                    id: 11, bandwidth: 160000
                },
                {
                    id: 12, bandwidth: 96000
                }
            ]
        }]
    }]
};
const manifest_with_audioChanCfg = {
    loadedTime: new Date(),
    mediaPresentationDuration: 10,
    Period_asArray: [{
        AdaptationSet_asArray: [{
            id: 0, mimeType: Constants.AUDIO,
            [DashConstants.AUDIOCHANNELCONFIGURATION_ASARRAY]: [
                { schemeIdUri: 'urn:mpeg:mpegB:cicp:ChannelConfiguration', value: '6' },
                { schemeIdUri: 'tag:dolby.com,2014:dash:audio_channel_configuration:2011', value: '0xF801' }
            ]
        }]
    }]
};
const manifest_with_audioChanCfg_Repr = {
    loadedTime: new Date(),
    mediaPresentationDuration: 10,
    Period_asArray: [{
        AdaptationSet_asArray: [{
            id: 0, mimeType: Constants.AUDIO,
            [DashConstants.REPRESENTATION_ASARRAY]: [
                {
                    id: 11, bandwidth: 128000,
                    [DashConstants.AUDIOCHANNELCONFIGURATION_ASARRAY]: [
                        { schemeIdUri: 'urn:mpeg:mpegB:cicp:ChannelConfiguration', value: '6' },
                        { schemeIdUri: 'urn:mpeg:dash:23003:3:audio_channel_configuration:2011', value: '6' },
                        { schemeIdUri: 'tag:dolby.com,2014:dash:audio_channel_configuration:2011', value: '0xF801' }
                    ]
                }, {
                    id: 12, bandwidth: 96000,
                    [DashConstants.AUDIOCHANNELCONFIGURATION_ASARRAY]: [
                        { schemeIdUri: 'urn:mpeg:mpegB:cicp:ChannelConfiguration', value: '21' },
                        { schemeIdUri: 'urn:mpeg:mpegB:cicp:ChannelConfiguration', value: '2' },
                        { schemeIdUri: 'urn:mpeg:dash:23003:3:audio_channel_configuration:2011', value: '2' },
                        { schemeIdUri: 'tag:dolby.com,2014:dash:audio_channel_configuration:2011', value: '0xA000' }
                    ]
                }
            ],
            [DashConstants.VIEWPOINT_ASARRAY]: [
                { schemeIdUri: 'urn:scheme:viewpoint', value: 'VP1' },
                { schemeIdUri: 'urn:scheme:viewpoint', value: 'VP2' }
            ]
        }]
    }]
};

describe('DashAdapter', function () {
    describe('SetConfig not previously called', function () {

        it('should throw an exception when attempting to call getStreamsInfo While the setConfig function was not called, and externalManifest parameter is defined', function () {
            expect(dashAdapter.getStreamsInfo.bind(dashAdapter, {})).to.throw('setConfig function has to be called previously');
        });

        it('should throw an exception when attempting to call getAllMediaInfoForType While the setConfig function was not called, and externalManifest parameter is defined', function () {
            expect(dashAdapter.getAllMediaInfoForType.bind(dashAdapter, null, null, {})).to.throw('setConfig function has to be called previously');
        });

        it('should return an empty array when getEventsFor is called and voPeriods is an empty array', function () {
            dashAdapter.reset();
            const eventsArray = dashAdapter.getEventsFor();

            expect(eventsArray).to.be.instanceOf(Array);
            expect(eventsArray).to.be.empty;
        });

        it('should return an empty array when getAllMediaInfoForType is called and voPeriods is an empty array', function () {
            const mediaInfoArray = dashAdapter.getAllMediaInfoForType();

            expect(mediaInfoArray).to.be.instanceOf(Array);
            expect(mediaInfoArray).to.be.empty;
        });

        it('should return null when updatePeriods is called and newManifest is undefined', function () {
            const returnValue = dashAdapter.updatePeriods();

            expect(returnValue).to.be.null;
        });

        it('should throw an error when updatePeriods is called and newManifest parameter is defined, while setConfig has not been called', function () {
            expect(dashAdapter.updatePeriods.bind(dashAdapter, {})).to.be.throw('setConfig function has to be called previously');
        });

        it('should return null when getMediaInfoForType is called and voPeriods is an empty array', function () {
            const mediaInfo = dashAdapter.getMediaInfoForType();

            expect(mediaInfo).to.be.null;
        });

        it('should return null when getEvent is called and no parameter is set', function () {
            const event = dashAdapter.getEvent();

            expect(event).to.be.null;
        });

        it('should return null when getEvent is called and an empty eventBox parameter is set and eventStreams is undefined', function () {
            const event = dashAdapter.getEvent({});

            expect(event).to.be.null;
        });

        it('should return null when getEvent is called and an empty eventBox and eventStreams parameters are set', function () {
            const event = dashAdapter.getEvent({}, []);

            expect(event).to.be.null;
        });

        it('should return null when getEvent is called and no media start time is set', function () {
            const event = dashAdapter.getEvent({ scheme_id_uri: 'id', value: 'value' }, { 'id/value': {} });

            expect(event).to.be.null;
        });

        it('should return null when getEvent is called and no representation is set', function () {
            const event = dashAdapter.getEvent({ scheme_id_uri: 'id', value: 'value' }, { 'id/value': {} }, 0);

            expect(event).to.be.null;
        });

        it('should return null when getEvent is called and no period is set in the representation', function () {
            const event = dashAdapter.getEvent({ scheme_id_uri: 'id', value: 'value' }, { 'id/value': {} }, 0, {});

            expect(event).to.be.null;
        });

        it('should return an empty event object when getEvent is called and parameters are set', function () {
            const representation = { presentationTimeOffset: 0, adaptation: { period: { start: 0 } } };
            const event = dashAdapter.getEvent({
                scheme_id_uri: 'id',
                value: 'value'
            }, { 'id/value': {} }, 0, representation);

            expect(event).to.be.an('object');
        });

        it('should calculate correct start time for a version 0 event without PTO', function () {
            const representation = { adaptation: { period: { start: 10 } } };
            const eventBox = { scheme_id_uri: 'id', value: 'value', presentation_time_delta: 12, version: 0 };
            const eventStreams = { 'id/value': {} };
            const mediaTime = 5;
            const event = dashAdapter.getEvent(eventBox, eventStreams, mediaTime, representation);

            expect(event).to.be.an('object');
            expect(event.calculatedPresentationTime).to.be.equal(27);
        });

        it('should calculate correct start time for a version 0 event with PTO', function () {
            const representation = { presentationTimeOffset: 5, adaptation: { period: { start: 10 } } };
            const eventBox = { scheme_id_uri: 'id', value: 'value', presentation_time_delta: 12, version: 0 };
            const eventStreams = { 'id/value': {} };
            const mediaTime = 5;
            const event = dashAdapter.getEvent(eventBox, eventStreams, mediaTime, representation);

            expect(event).to.be.an('object');
            expect(event.calculatedPresentationTime).to.be.equal(22);
        });

        it('should calculate correct start time for a version 1 event without PTO', function () {
            const representation = { adaptation: { period: { start: 10 } } };
            const eventBox = { scheme_id_uri: 'id', value: 'value', presentation_time_delta: 12, version: 1 };
            const eventStreams = { 'id/value': {} };
            const mediaTime = 5;
            const event = dashAdapter.getEvent(eventBox, eventStreams, mediaTime, representation);

            expect(event).to.be.an('object');
            expect(event.calculatedPresentationTime).to.be.equal(22);
        });

        it('should calculate correct start time for a version 1 event with PTO in representation', function () {
            const representation = { presentationTimeOffset: 10, adaptation: { period: { start: 10 } } };
            const eventBox = { scheme_id_uri: 'id', value: 'value', presentation_time_delta: 12, version: 1 };
            const eventStreams = { 'id/value': {} };
            const mediaTime = 5;
            const event = dashAdapter.getEvent(eventBox, eventStreams, mediaTime, representation);

            expect(event).to.be.an('object');
            expect(event.calculatedPresentationTime).to.be.equal(12);
        });

        it('should calculate correct start time for a version 1 event with PTO in eventStream and representation', function () {
            const representation = { presentationTimeOffset: 10, adaptation: { period: { start: 10 } } };
            const eventBox = { scheme_id_uri: 'id', value: 'value', presentation_time_delta: 12, version: 1 };
            const eventStreams = { 'id/value': { presentationTimeOffset: 5 } };
            const mediaTime = 5;
            const event = dashAdapter.getEvent(eventBox, eventStreams, mediaTime, representation);

            expect(event).to.be.an('object');
            expect(event.calculatedPresentationTime).to.be.equal(12);
        });

        it('should calculate correct start time for a version 1 event with timescale > 1 and PTO in eventStream', function () {
            const representation = { adaptation: { period: { start: 10 } } };
            const eventBox = {
                scheme_id_uri: 'id',
                value: 'value',
                presentation_time_delta: 90000,
                version: 1,
                timescale: 45000
            };
            const eventStreams = { 'id/value': { presentationTimeOffset: 5 } };
            const mediaTime = 5;
            const event = dashAdapter.getEvent(eventBox, eventStreams, mediaTime, representation);

            expect(event).to.be.an('object');
            expect(event.calculatedPresentationTime).to.be.equal(7);
        });

        it('should return undefined when getRealAdaptation is called and streamInfo parameter is null or undefined', function () {
            const realAdaptation = dashAdapter.getRealAdaptation(null, voHelper.getDummyMediaInfo(Constants.VIDEO));

            expect(realAdaptation).to.be.undefined;
        });

        it('should return undefined when getRealAdaptation is called and mediaInfo parameter is null or undefined', function () {
            const realAdaptation = dashAdapter.getRealAdaptation(voHelper.getDummyStreamInfo(), null);

            expect(realAdaptation).to.be.undefined;
        });

        it('should return empty array when getProducerReferenceTimes is called and streamInfo parameter is null or undefined', () => {
            const producerReferenceTimes = dashAdapter.getProducerReferenceTimes(null, voHelper.getDummyMediaInfo());

            expect(producerReferenceTimes).to.be.instanceOf(Array);
            expect(producerReferenceTimes).to.be.empty;
        });

        it('should return empty array when getProducerReferenceTimes is called and mediaInfo parameter is null or undefined', () => {
            const producerReferenceTimes = dashAdapter.getProducerReferenceTimes(voHelper.getDummyStreamInfo(), null);

            expect(producerReferenceTimes).to.be.instanceOf(Array);
            expect(producerReferenceTimes).to.be.empty;
        });

        it('should return empty array when getUTCTimingSources is called and no period is defined', function () {
            const timingSources = dashAdapter.getUTCTimingSources();

            expect(timingSources).to.be.instanceOf(Array);
            expect(timingSources).to.be.empty;
        });

        it('should return null when getSuggestedPresentationDelay is called and no period is defined', function () {
            const suggestedPresentationDelay = dashAdapter.getSuggestedPresentationDelay();

            expect(suggestedPresentationDelay).to.be.null;
        });

        it('should return false when getIsDynamic is called and no period is defined', function () {
            const isDynamic = dashAdapter.getIsDynamic();

            expect(isDynamic).to.be.false;
        });

        it('should return Number.MAX_SAFE_INTEGER || Number.MAX_VALUE when getDuration is called and no period is defined', function () {
            const duration = dashAdapter.getDuration();

            expect(duration).to.equal(Number.MAX_SAFE_INTEGER || Number.MAX_VALUE);
        });

        it('should return null when getAvailabilityStartTime is called and no period is defined', function () {
            const availabilityStartTime = dashAdapter.getAvailabilityStartTime();

            expect(availabilityStartTime).to.be.null;
        });

        it('should return empty array when getRegularPeriods is called and no period is defined', function () {
            const regularPeriods = dashAdapter.getRegularPeriods();

            expect(regularPeriods).to.be.instanceOf(Array);
            expect(regularPeriods).to.be.empty;
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

        it('should return null when convertRepresentationToRepresentationInfo is called and voRepresentation parameter is null or undefined', function () {
            const representationInfo = dashAdapter.convertRepresentationToRepresentationInfo();

            expect(representationInfo).to.be.null;
        });

        it('should return correct representationInfo when convertRepresentationToRepresentationInfo is called and voRepresentation parameter is well defined', function () {
            const voRepresentation = voHelper.getDummyRepresentation(Constants.VIDEO, 0);
            const representationInfo = dashAdapter.convertRepresentationToRepresentationInfo(voRepresentation);

            expect(representationInfo).not.to.be.null;
            expect(representationInfo.quality).to.equal(0);
        });

        it('should return undefined when getVoRepresentations is called and mediaInfo parameter is null or undefined', function () {
            const voRepresentations = dashAdapter.getVoRepresentations();

            expect(voRepresentations).to.be.instanceOf(Array);
            expect(voRepresentations).to.be.empty;
        });

        it('should return the first adaptation when getAdaptationForType is called and streamInfo is undefined', () => {
            const manifest_with_video = {
                loadedTime: new Date(),
                mediaPresentationDuration: 10,
                Period_asArray: [{
                    AdaptationSet_asArray: [{ id: 0, mimeType: Constants.VIDEO }, {
                        id: 1,
                        mimeType: Constants.VIDEO
                    }]
                }]
            };
            dashAdapter.updatePeriods(manifest_with_video);
            const adaptation = dashAdapter.getAdaptationForType(0, Constants.VIDEO);

            expect(adaptation.id).to.equal(0);
        });

        it('should return an empty array getStreamsInfo externalManifest is an empty object and maxStreamsInfo is undefined', function () {
            const streamInfos = dashAdapter.getStreamsInfo({});

            expect(streamInfos).to.be.instanceOf(Array);
            expect(streamInfos).to.be.empty;
        });

        it('should return an empty array getStreamsInfo externalManifest is not an empty object and maxStreamsInfo is defined', function () {
            const streamInfos = dashAdapter.getStreamsInfo(manifest_with_audio, 10);

            expect(streamInfos).to.be.instanceOf(Array);
            expect(streamInfos.length).to.equal(1);
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

                expect(mediaInfo).to.be.null;
            });

            it('should return null when getMediaInfoForType is called and voPeriods is not an empty array, and streamInfo is defined but not in the current manifest', function () {
                const streamInfo = voHelper.getDummyStreamInfo();

                streamInfo.index = 0;
                const mediaInfo = dashAdapter.getMediaInfoForType(streamInfo, Constants.AUDIO);

                expect(mediaInfo).to.be.null;
            });

            it('should return null when getMediaInfoForType is called and voPeriods is not an empty array, and streamInfo is defined', function () {
                const streamInfo = voHelper.getDummyStreamInfo();

                streamInfo.id = 'defaultId_0';
                streamInfo.index = 0;
                const mediaInfo = dashAdapter.getMediaInfoForType(streamInfo, Constants.AUDIO);

                expect(mediaInfo).not.to.be.null;
            });

            it('should return null when getBandwidthForRepresentation is called and representationId and periodId are undefined', () => {
                const bdwth = dashAdapter.getBandwidthForRepresentation();

                expect(bdwth).to.be.null;
            });

            it('should return -1 when getIndexForRepresentation is called and representationId and periodIdx are undefined', () => {
                const index = dashAdapter.getIndexForRepresentation();

                expect(index).to.be.equal(-1);
            });

            it('should return -1 when getMaxIndexForBufferType is called and bufferType and periodIdx are undefined', () => {
                const index = dashAdapter.getMaxIndexForBufferType();

                expect(index).to.be.equal(-1);
            });

            it('should return undefined when getRealAdaptation is called and streamInfo parameter is null or undefined', function () {
                const realAdaptation = dashAdapter.getRealAdaptation(null, voHelper.getDummyMediaInfo(Constants.VIDEO));

                expect(realAdaptation).to.be.undefined;
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
                track.rolesWithSchemeIdUri = [{ schemeIdUri: 'aScheme', value: 'main' }];
                track.codec = 'audio/mp4;codecs="mp4a.40.2"';
                track.mimeType = 'audio/mp4';

                dashAdapter.setCurrentMediaInfo(streamInfo.id, Constants.AUDIO, track);
                const adaptation = dashAdapter.getAdaptationForType(0, Constants.AUDIO, streamInfo);

                expect(adaptation.lang).to.equal('eng');
            });

            it('should return an empty array when getEventsFor is called and info parameter is undefined', function () {
                const eventsArray = dashAdapter.getEventsFor();

                expect(eventsArray).to.be.instanceOf(Array);
                expect(eventsArray).to.be.empty;
            });

            it('should return an empty array when getAllMediaInfoForType is called and voPeriods is not an empty array', function () {
                const mediaInfoArray = dashAdapter.getAllMediaInfoForType();

                expect(mediaInfoArray).to.be.instanceOf(Array);
                expect(mediaInfoArray).to.be.empty;
            });

            it('should return an empty array when getAllMediaInfoForType is called and voPeriods is not an empty array, and streamInfo parameter is set', function () {
                const mediaInfoArray = dashAdapter.getAllMediaInfoForType({
                    id: 'defaultId_0',
                    index: 0
                }, Constants.AUDIO);

                expect(mediaInfoArray).to.be.instanceOf(Array);
                expect(mediaInfoArray).to.not.be.empty;
            });

            it('should return an empty array when getAllMediaInfoForType is called and externalManifest is set', function () {
                const mediaInfoArray = dashAdapter.getAllMediaInfoForType(null, null, manifest_with_audio);

                expect(mediaInfoArray).to.be.instanceOf(Array);
                expect(mediaInfoArray).to.be.empty;
            });

            it('should return an empty array when getAllMediaInfoForType is called and, text type and externalManifest are set', function () {
                const mediaInfoArray = dashAdapter.getAllMediaInfoForType({
                    id: 'defaultId_0',
                    index: 0
                }, Constants.TEXT, manifest_with_video_with_embedded_subtitles);

                expect(mediaInfoArray).to.be.instanceOf(Array);
                expect(mediaInfoArray.length).equals(2);
            });

            it('should read service description attributes', function () {
                const streamInfos = dashAdapter.getStreamsInfo(manifest_with_ll_service_description, 10);

                expect(streamInfos).to.be.instanceOf(Array);
                expect(streamInfos.length).equals(1);

                expect(streamInfos[0].manifestInfo).not.to.be.null;
                expect(streamInfos[0].manifestInfo.serviceDescriptions).to.be.instanceOf(Array);
                expect(streamInfos[0].manifestInfo.serviceDescriptions.length).equals(1);

                expect(streamInfos[0].manifestInfo.serviceDescriptions[0].schemeIdUri).equals('urn:dvb:dash:lowlatency:scope:2019');
                expect(streamInfos[0].manifestInfo.serviceDescriptions[0].latency.target).equals(3000);
                expect(streamInfos[0].manifestInfo.serviceDescriptions[0].latency.max).equals(5000);
                expect(streamInfos[0].manifestInfo.serviceDescriptions[0].latency.min).equals(2000);
                expect(streamInfos[0].manifestInfo.serviceDescriptions[0].latency.referenceId).equals(7);
                expect(streamInfos[0].manifestInfo.serviceDescriptions[0].playbackRate.max).equals(1.5);
                expect(streamInfos[0].manifestInfo.serviceDescriptions[0].playbackRate.min).equals(0.5);
            });

            describe('mediainfo populated from manifest', function () {
                it('supplemental properties should be empty if not defined', function () {
                    const mediaInfoArray = dashAdapter.getAllMediaInfoForType({
                        id: 'defaultId_0',
                        index: 0
                    }, Constants.VIDEO, manifest_without_supplemental_properties);

                    expect(mediaInfoArray).to.be.instanceOf(Array);
                    expect(mediaInfoArray.length).equals(1);

                    expect(mediaInfoArray[0].supplementalProperties).not.to.be.null;
                    expect(Object.keys(mediaInfoArray[0].supplementalProperties).length).equals(0);

                    expect(mediaInfoArray[0].supplementalPropertiesAsArray).to.be.instanceOf(Array);
                    expect(mediaInfoArray[0].supplementalPropertiesAsArray.length).equals(0);
                });

                it('supplemental properties should be filled if correctly defined', function () {
                    const mediaInfoArray = dashAdapter.getAllMediaInfoForType({
                        id: 'defaultId_0',
                        index: 0
                    }, Constants.VIDEO, manifest_with_supplemental_properties);

                    expect(mediaInfoArray).to.be.instanceOf(Array);
                    expect(mediaInfoArray.length).equals(1);

                    expect(mediaInfoArray[0].codec).to.be.null;

                    expect(mediaInfoArray[0].supplementalProperties).not.to.be.null;
                    expect(Object.keys(mediaInfoArray[0].supplementalProperties).length).equals(1);

                    expect(mediaInfoArray[0].supplementalPropertiesAsArray).to.be.instanceOf(Array);
                    expect(mediaInfoArray[0].supplementalPropertiesAsArray.length).equals(2);
                });

                it('supplemental properties should be filled if set on all representations', function () {
                    const mediaInfoArray = dashAdapter.getAllMediaInfoForType({
                        id: 'defaultId_0',
                        index: 0
                    }, Constants.VIDEO, manifest_with_supplemental_properties_on_repr);

                    expect(mediaInfoArray).to.be.instanceOf(Array);
                    expect(mediaInfoArray.length).equals(1);

                    expect(mediaInfoArray[0].representationCount).equals(2);
                    expect(mediaInfoArray[0].codec).not.to.be.null;

                    expect(mediaInfoArray[0].supplementalProperties).not.to.be.null;
                    expect(Object.keys(mediaInfoArray[0].supplementalProperties).length).equals(1);

                    expect(mediaInfoArray[0].supplementalPropertiesAsArray).to.be.instanceOf(Array);
                    expect(mediaInfoArray[0].supplementalPropertiesAsArray.length).equals(3);
                });

                it('supplemental properties should not be filled if not set on all representations', function () {
                    const mediaInfoArray = dashAdapter.getAllMediaInfoForType({
                        id: 'defaultId_0',
                        index: 0
                    }, Constants.VIDEO, manifest_with_supplemental_properties_on_only_one_repr);

                    expect(mediaInfoArray).to.be.instanceOf(Array);
                    expect(mediaInfoArray.length).equals(1);

                    expect(mediaInfoArray[0].representationCount).equals(3);

                    expect(mediaInfoArray[0].supplementalProperties).not.to.be.null;
                    expect(Object.keys(mediaInfoArray[0].supplementalProperties).length).equals(0);

                    expect(mediaInfoArray[0].supplementalPropertiesAsArray).to.be.instanceOf(Array);
                    expect(mediaInfoArray[0].supplementalPropertiesAsArray.length).equals(0);
                });

                it('audio channel config should be filled', function () {
                    const mediaInfoArray = dashAdapter.getAllMediaInfoForType({
                        id: 'defaultId_0',
                        index: 0
                    }, Constants.AUDIO, manifest_with_audioChanCfg);

                    expect(mediaInfoArray).to.be.instanceOf(Array);
                    expect(mediaInfoArray.length).equals(1);

                    expect(mediaInfoArray[0].audioChannelConfiguration).to.be.instanceOf(Array);
                    expect(mediaInfoArray[0].audioChannelConfiguration.length).equals(2);
                    expect(mediaInfoArray[0].audioChannelConfiguration[0]).equals('6');

                    expect(mediaInfoArray[0].audioChannelConfigurationsWithSchemeIdUri).to.be.instanceOf(Array);
                    expect(mediaInfoArray[0].audioChannelConfigurationsWithSchemeIdUri.length).equals(2);
                    expect(mediaInfoArray[0].audioChannelConfigurationsWithSchemeIdUri[0]).to.be.instanceOf(DescriptorType);
                    expect(mediaInfoArray[0].audioChannelConfigurationsWithSchemeIdUri[1].value).equals('0xF801');
                });

                it('audio channel config should be filled when present on Representation', function () {
                    const mediaInfoArray = dashAdapter.getAllMediaInfoForType({
                        id: 'defaultId_0',
                        index: 0
                    }, Constants.AUDIO, manifest_with_audioChanCfg_Repr);

                    expect(mediaInfoArray).to.be.instanceOf(Array);
                    expect(mediaInfoArray.length).equals(1);

                    // Note: MediaInfo picks those AudioChannelConfig descriptor present on that Representation with lowest bandwidth
                    expect(mediaInfoArray[0].audioChannelConfiguration).to.be.instanceOf(Array);
                    expect(mediaInfoArray[0].audioChannelConfiguration.length).equals(4);
                    expect(mediaInfoArray[0].audioChannelConfiguration[0]).equals('21');

                    expect(mediaInfoArray[0].audioChannelConfigurationsWithSchemeIdUri).to.be.instanceOf(Array);
                    expect(mediaInfoArray[0].audioChannelConfigurationsWithSchemeIdUri.length).equals(4);
                    expect(mediaInfoArray[0].audioChannelConfigurationsWithSchemeIdUri[0]).to.be.instanceOf(DescriptorType);
                    expect(mediaInfoArray[0].audioChannelConfigurationsWithSchemeIdUri[3].value).equals('0xA000');
                });

                it('role, accessibility and viewpoint should be empty if not defined', function () {
                    const mediaInfoArray = dashAdapter.getAllMediaInfoForType({
                        id: 'defaultId_0',
                        index: 0
                    }, Constants.AUDIO, manifest_with_audioChanCfg);

                    expect(mediaInfoArray).to.be.instanceOf(Array);
                    expect(mediaInfoArray.length).equals(1);

                    expect(mediaInfoArray[0].roles).to.be.instanceOf(Array);
                    expect(mediaInfoArray[0].roles.length).equals(0);
                    expect(mediaInfoArray[0].accessibility).to.be.instanceOf(Array);
                    expect(mediaInfoArray[0].accessibility.length).equals(0);
                    expect(mediaInfoArray[0].viewpoint).to.be.undefined;

                    expect(mediaInfoArray[0].rolesWithSchemeIdUri).to.be.instanceOf(Array);
                    expect(mediaInfoArray[0].rolesWithSchemeIdUri.length).equals(0);
                    expect(mediaInfoArray[0].accessibilitiesWithSchemeIdUri).to.be.instanceOf(Array);
                    expect(mediaInfoArray[0].accessibilitiesWithSchemeIdUri.length).equals(0);
                    expect(mediaInfoArray[0].accessibilitiesWithSchemeIdUri).to.be.instanceOf(Array);
                    expect(mediaInfoArray[0].viewpointsWithSchemeIdUri).to.be.instanceOf(Array);
                    expect(mediaInfoArray[0].viewpointsWithSchemeIdUri.length).equals(0);
                });

                it('role should be filled', function () {
                    const mediaInfoArray = dashAdapter.getAllMediaInfoForType({
                        id: 'defaultId_0',
                        index: 0
                    }, Constants.AUDIO, manifest_with_audio);

                    expect(mediaInfoArray).to.be.instanceOf(Array);
                    expect(mediaInfoArray.length).equals(2);

                    expect(mediaInfoArray[0].roles).to.be.instanceOf(Array);
                    expect(mediaInfoArray[0].roles.length).equals(1);
                    expect(mediaInfoArray[0].roles[0]).equals('main');

                    expect(mediaInfoArray[0].rolesWithSchemeIdUri).to.be.instanceOf(Array);
                    expect(mediaInfoArray[0].rolesWithSchemeIdUri.length).equals(1);
                    expect(mediaInfoArray[0].rolesWithSchemeIdUri[0]).to.be.instanceOf(DescriptorType);
                    expect(mediaInfoArray[0].rolesWithSchemeIdUri[0].value).equals('main');
                });

                it('accessibility should be filled', function () {
                    const mediaInfoArray = dashAdapter.getAllMediaInfoForType({
                        id: 'defaultId_0',
                        index: 0
                    }, Constants.VIDEO, manifest_with_video_with_embedded_subtitles);

                    expect(mediaInfoArray).to.be.instanceOf(Array);
                    expect(mediaInfoArray.length).equals(2);

                    expect(mediaInfoArray[0].roles).to.be.instanceOf(Array);
                    expect(mediaInfoArray[0].roles.length).equals(0);

                    expect(mediaInfoArray[0].accessibility).to.be.instanceOf(Array);
                    expect(mediaInfoArray[0].accessibility.length).equals(1);
                    expect(mediaInfoArray[0].accessibility[0]).equals('cea-608:CC1=eng;CC3=swe');
                    expect(mediaInfoArray[1].accessibility.length).equals(0);

                    expect(mediaInfoArray[0].rolesWithSchemeIdUri).to.be.instanceOf(Array);
                    expect(mediaInfoArray[0].rolesWithSchemeIdUri.length).equals(0);

                    expect(mediaInfoArray[0].accessibilitiesWithSchemeIdUri).to.be.instanceOf(Array);
                    expect(mediaInfoArray[0].accessibilitiesWithSchemeIdUri.length).equals(1);
                    expect(mediaInfoArray[0].accessibilitiesWithSchemeIdUri[0]).to.be.instanceOf(DescriptorType);
                    expect(mediaInfoArray[0].accessibilitiesWithSchemeIdUri[0].schemeIdUri).equals('urn:scte:dash:cc:cea-608:2015');
                    expect(mediaInfoArray[0].accessibilitiesWithSchemeIdUri[0].value).equals('CC1=eng;CC3=swe');
                    expect(mediaInfoArray[1].accessibilitiesWithSchemeIdUri.length).equals(0);
                });

                it('viewpoint should be filled', function () {
                    const mediaInfoArray = dashAdapter.getAllMediaInfoForType({
                        id: 'defaultId_0',
                        index: 0
                    }, Constants.AUDIO, manifest_with_audioChanCfg_Repr);

                    expect(mediaInfoArray).to.be.instanceOf(Array);
                    expect(mediaInfoArray.length).equals(1);

                    expect(mediaInfoArray[0].viewpoint).equals('VP1');

                    expect(mediaInfoArray[0].viewpointsWithSchemeIdUri).to.be.instanceOf(Array);
                    expect(mediaInfoArray[0].viewpointsWithSchemeIdUri.length).equals(2);

                    expect(mediaInfoArray[0].viewpointsWithSchemeIdUri[0]).to.be.instanceOf(DescriptorType);
                    expect(mediaInfoArray[0].viewpointsWithSchemeIdUri[0].schemeIdUri).equals('urn:scheme:viewpoint');
                    expect(mediaInfoArray[0].viewpointsWithSchemeIdUri[0].value).equals('VP1');
                    expect(mediaInfoArray[0].viewpointsWithSchemeIdUri[0].id).to.be.null;

                    expect(mediaInfoArray[0].viewpointsWithSchemeIdUri[1]).to.be.instanceOf(DescriptorType);
                    expect(mediaInfoArray[0].viewpointsWithSchemeIdUri[1].schemeIdUri).equals('urn:scheme:viewpoint');
                    expect(mediaInfoArray[0].viewpointsWithSchemeIdUri[1].value).equals('VP2');
                    expect(mediaInfoArray[0].viewpointsWithSchemeIdUri[1].id).to.be.null;
                });

            });

        });

        describe('getPatchLocation', function () {

            // example patch location element with ttl
            const patchLocationElementTTL = {
                __children: [{ '#text': 'foobar' }],
                '__text': 'foobar',
                ttl: 60 * 5 // 5 minute validity period
            };

            // example patch location element that never expires
            const patchLocationElementEvergreen = {
                __children: [{ '#text': 'foobar' }],
                '__text': 'foobar'
            };

            it('should provide patch location if present and not expired', function () {
                // simulated 1 minute old manifest
                let publishTime = new Date();
                publishTime.setMinutes(publishTime.getMinutes() - 1);
                const manifest = {
                    [DashConstants.PUBLISH_TIME]: (publishTime.toISOString()),
                    PatchLocation: patchLocationElementTTL,
                    PatchLocation_asArray: [patchLocationElementTTL]
                };

                let patchLocation = dashAdapter.getPatchLocation(manifest);
                expect(patchLocation[0].url).equals('foobar');
            });

            it('should not provide patch location if present and expired', function () {
                // simulated 10 minute old manifest
                let publishTime = new Date();
                publishTime.setMinutes(publishTime.getMinutes() - 10);
                const manifest = {
                    [DashConstants.PUBLISH_TIME]: (publishTime.toISOString()),
                    PatchLocation: patchLocationElementTTL,
                    PatchLocation_asArray: [patchLocationElementTTL]
                };

                let patchLocation = dashAdapter.getPatchLocation(manifest);
                expect(patchLocation).to.be.empty;
            });

            it('should provide patch location if present and never expires', function () {
                // simulated 120 minute old manifest
                let publishTime = new Date();
                publishTime.setMinutes(publishTime.getMinutes() - 120);
                const manifest = {
                    [DashConstants.PUBLISH_TIME]: (publishTime.toISOString()),
                    PatchLocation: patchLocationElementEvergreen,
                    PatchLocation_asArray: [patchLocationElementEvergreen]
                };

                let patchLocation = dashAdapter.getPatchLocation(manifest);
                expect(patchLocation[0].url).equals('foobar');
            });

            it('should not provide patch location if not present', function () {
                const manifest = {
                    [DashConstants.PUBLISH_TIME]: (new Date().toISOString())
                };

                let patchLocation = dashAdapter.getPatchLocation(manifest);
                expect(patchLocation).to.be.empty;
            });

            it('should not provide patch location if present in manifest without publish time', function () {
                const manifest = {
                    PatchLocation: patchLocationElementTTL,
                    PatchLocation_asArray: [patchLocationElementTTL]
                };

                let patchLocation = dashAdapter.getPatchLocation(manifest);
                expect(patchLocation).to.be.empty;
            });
        });

        describe('isPatchValid', function () {
            it('considers patch invalid if no patch given', function () {
                let publishTime = new Date();
                let manifest = {
                    [DashConstants.ID]: 'foobar',
                    [DashConstants.PUBLISH_TIME]: publishTime.toISOString()
                };
                let isValid = dashAdapter.isPatchValid(manifest);

                expect(isValid).to.be.false;
            });

            it('considers patch invalid if no manifest given', function () {
                let publishTime = new Date();
                let publishTime2 = new Date(publishTime.getTime() + 100);
                let patch = {
                    [DashConstants.ORIGINAL_MPD_ID]: 'foobar',
                    [DashConstants.ORIGINAL_PUBLISH_TIME]: publishTime.toISOString(),
                    [DashConstants.PUBLISH_TIME]: publishTime2.toISOString()
                };
                let isValid = dashAdapter.isPatchValid(undefined, patch);

                expect(isValid).to.be.false;
            });

            it('considers patch invalid if manifest has no id', function () {
                let publishTime = new Date();
                let publishTime2 = new Date(publishTime.getTime() + 100);
                let manifest = {
                    [DashConstants.PUBLISH_TIME]: publishTime
                };
                let patch = {
                    [DashConstants.ORIGINAL_MPD_ID]: 'foobar',
                    [DashConstants.ORIGINAL_PUBLISH_TIME]: publishTime.toISOString(),
                    [DashConstants.PUBLISH_TIME]: publishTime2.toISOString()
                };
                let isValid = dashAdapter.isPatchValid(manifest, patch);

                expect(isValid).to.be.false;
            });

            it('considers patch invalid if patch has no manifest id', function () {
                let publishTime = new Date();
                let publishTime2 = new Date(publishTime.getTime() + 100);
                let manifest = {
                    [DashConstants.ID]: 'foobar',
                    [DashConstants.PUBLISH_TIME]: publishTime.toISOString()
                };
                let patch = {
                    [DashConstants.ORIGINAL_PUBLISH_TIME]: publishTime.toISOString(),
                    [DashConstants.PUBLISH_TIME]: publishTime2.toISOString()
                };
                let isValid = dashAdapter.isPatchValid(manifest, patch);

                expect(isValid).to.be.false;
            });

            it('considers patch invalid if manifest has no publish time', function () {
                let publishTime = new Date();
                let publishTime2 = new Date(publishTime.getTime() + 100);
                let manifest = {
                    [DashConstants.ID]: 'foobar'
                };
                let patch = {
                    [DashConstants.ORIGINAL_MPD_ID]: 'foobar',
                    [DashConstants.ORIGINAL_PUBLISH_TIME]: publishTime.toISOString(),
                    [DashConstants.PUBLISH_TIME]: publishTime2.toISOString()
                };
                let isValid = dashAdapter.isPatchValid(manifest, patch);

                expect(isValid).to.be.false;
            });

            it('considers patch invalid if patch has no original publish time', function () {
                let publishTime = new Date();
                let publishTime2 = new Date(publishTime.getTime() + 100);
                let manifest = {
                    [DashConstants.ID]: 'foobar',
                    [DashConstants.PUBLISH_TIME]: publishTime.toISOString()
                };
                let patch = {
                    [DashConstants.ORIGINAL_MPD_ID]: 'foobar',
                    [DashConstants.PUBLISH_TIME]: publishTime2.toISOString()
                };
                let isValid = dashAdapter.isPatchValid(manifest, patch);

                expect(isValid).to.be.false;
            });

            it('considers patch invalid if both objects missing ids', function () {
                let publishTime = new Date();
                let publishTime2 = new Date(publishTime.getTime() + 100);
                let manifest = {
                    [DashConstants.PUBLISH_TIME]: publishTime.toISOString()
                };
                let patch = {
                    [DashConstants.ORIGINAL_PUBLISH_TIME]: publishTime.toISOString(),
                    [DashConstants.PUBLISH_TIME]: publishTime2.toISOString()
                };
                let isValid = dashAdapter.isPatchValid(manifest, patch);

                expect(isValid).to.be.false;
            });

            it('considers patch invalid if both objects missing mpd publish times', function () {
                let publishTime = new Date();
                let manifest = {
                    [DashConstants.ID]: 'foobar'
                };
                let patch = {
                    [DashConstants.ORIGINAL_MPD_ID]: 'foobar',
                    [DashConstants.PUBLISH_TIME]: publishTime.toISOString()
                };
                let isValid = dashAdapter.isPatchValid(manifest, patch);

                expect(isValid).to.be.false;
            });

            it('considers patch invalid if patch missing new publish time', function () {
                let publishTime = new Date();
                let manifest = {
                    [DashConstants.ID]: 'foobar',
                    [DashConstants.PUBLISH_TIME]: publishTime.toISOString()
                };
                let patch = {
                    [DashConstants.ORIGINAL_MPD_ID]: 'foobar',
                    [DashConstants.ORIGINAL_PUBLISH_TIME]: publishTime.toISOString()
                };
                let isValid = dashAdapter.isPatchValid(manifest, patch);

                expect(isValid).to.be.false;
            });

            it('considers patch invalid if ids do not match', function () {
                let publishTime = new Date();
                let publishTime2 = new Date(publishTime.getTime() + 100);
                let manifest = {
                    [DashConstants.ID]: 'foobar',
                    [DashConstants.PUBLISH_TIME]: publishTime.toISOString()
                };
                let patch = {
                    [DashConstants.ORIGINAL_MPD_ID]: 'bazqux',
                    [DashConstants.ORIGINAL_PUBLISH_TIME]: publishTime.toISOString(),
                    [DashConstants.PUBLISH_TIME]: publishTime2.toISOString()
                };
                let isValid = dashAdapter.isPatchValid(manifest, patch);

                expect(isValid).to.be.false;
            });

            it('considers patch invalid if publish times do not match', function () {
                let publishTime = new Date();
                let publishTime2 = new Date(publishTime.getTime() + 100);
                let publishTime3 = new Date(publishTime.getTime() + 200);
                let manifest = {
                    [DashConstants.ID]: 'foobar',
                    [DashConstants.PUBLISH_TIME]: publishTime.toISOString()
                };
                let patch = {
                    [DashConstants.ORIGINAL_MPD_ID]: 'foobar',
                    [DashConstants.ORIGINAL_PUBLISH_TIME]: publishTime2.toISOString(),
                    [DashConstants.PUBLISH_TIME]: publishTime3.toISOString()
                };
                let isValid = dashAdapter.isPatchValid(manifest, patch);

                expect(isValid).to.be.false;
            });

            it('considers patch invalid if new publish time is not later than previous', function () {
                let publishTime = new Date();
                let manifest = {
                    [DashConstants.ID]: 'foobar',
                    [DashConstants.PUBLISH_TIME]: publishTime.toISOString()
                };
                let patch = {
                    [DashConstants.ORIGINAL_MPD_ID]: 'foobar',
                    [DashConstants.ORIGINAL_PUBLISH_TIME]: publishTime.toISOString(),
                    [DashConstants.PUBLISH_TIME]: publishTime.toISOString()
                };
                let isValid = dashAdapter.isPatchValid(manifest, patch);

                expect(isValid).to.be.false;
            });

            it('considers patch valid if ids, publish times match, and new publish time is later than previous', function () {
                let publishTime = new Date();
                let publishTime2 = new Date(publishTime.getTime() + 100);
                let manifest = {
                    [DashConstants.ID]: 'foobar',
                    [DashConstants.PUBLISH_TIME]: publishTime.toISOString()
                };
                let patch = {
                    [DashConstants.ORIGINAL_MPD_ID]: 'foobar',
                    [DashConstants.ORIGINAL_PUBLISH_TIME]: publishTime.toISOString(),
                    [DashConstants.PUBLISH_TIME]: publishTime2.toISOString()
                };
                let isValid = dashAdapter.isPatchValid(manifest, patch);

                expect(isValid).to.be.true;
            });
        });

        describe('applyPatchToManifest', function () {
            const patchHelper = new PatchHelper();

            it('applies add operation to structure with no siblings', function () {
                let manifest = {};
                let addedPeriod = { id: 'foo' };
                let patch = patchHelper.generatePatch('foobar', [{
                    action: 'add',
                    selector: '/MPD',
                    children: [{
                        Period: addedPeriod
                    }]
                }]);

                dashAdapter.applyPatchToManifest(manifest, patch);

                expect(manifest.Period).to.equal(addedPeriod);
                expect(manifest.Period_asArray).to.deep.equal([addedPeriod]);
            });

            it('applies add operation to structure with single sibling', function () {
                let originalPeriod = { id: 'foo' };
                let addedPeriod = { id: 'bar' };
                // special case x2js object which omits the _asArray variant
                let manifest = {
                    Period: originalPeriod
                };
                let patch = patchHelper.generatePatch('foobar', [{
                    action: 'add',
                    selector: '/MPD',
                    children: [{
                        Period: addedPeriod
                    }]
                }]);

                dashAdapter.applyPatchToManifest(manifest, patch);

                expect(manifest.Period).to.deep.equal([originalPeriod, addedPeriod]);
                expect(manifest.Period).to.deep.equal(manifest.Period_asArray);
            });

            it('applies add implicit append operation with siblings', function () {
                let originalPeriods = [{ id: 'foo' }, { id: 'bar' }];
                let addedPeriod = { id: 'baz' };
                let manifest = {
                    Period: originalPeriods.slice(),
                    Period_asArray: originalPeriods.slice()
                };
                let patch = patchHelper.generatePatch('foobar', [{
                    action: 'add',
                    selector: '/MPD',
                    children: [{
                        Period: addedPeriod
                    }]
                }]);

                dashAdapter.applyPatchToManifest(manifest, patch);

                expect(manifest.Period).to.deep.equal([originalPeriods[0], originalPeriods[1], addedPeriod]);
                expect(manifest.Period).to.deep.equal(manifest.Period_asArray);
            });

            it('applies add prepend operation with siblings', function () {
                let originalPeriods = [{ id: 'foo' }, { id: 'bar' }];
                let addedPeriod = { id: 'baz' };
                let manifest = {
                    Period: originalPeriods.slice(),
                    Period_asArray: originalPeriods.slice()
                };
                let patch = patchHelper.generatePatch('foobar', [{
                    action: 'add',
                    selector: '/MPD',
                    position: 'prepend',
                    children: [{
                        Period: addedPeriod
                    }]
                }]);

                dashAdapter.applyPatchToManifest(manifest, patch);

                expect(manifest.Period).to.deep.equal([addedPeriod, originalPeriods[0], originalPeriods[1]]);
                expect(manifest.Period).to.deep.equal(manifest.Period_asArray);
            });

            it('applies add before operation with siblings', function () {
                let originalPeriods = [{ id: 'foo' }, { id: 'bar' }, { id: 'baz' }];
                let addedPeriod = { id: 'qux' };
                let manifest = {
                    Period: originalPeriods.slice(),
                    Period_asArray: originalPeriods.slice()
                };
                let patch = patchHelper.generatePatch('foobar', [{
                    action: 'add',
                    selector: '/MPD/Period[2]',
                    position: 'before',
                    children: [{
                        Period: addedPeriod
                    }]
                }]);

                dashAdapter.applyPatchToManifest(manifest, patch);

                expect(manifest.Period).to.deep.equal([originalPeriods[0], addedPeriod, originalPeriods[1], originalPeriods[2]]);
                expect(manifest.Period).to.deep.equal(manifest.Period_asArray);
            });

            it('applies add after operation with siblings', function () {
                let originalPeriods = [{ id: 'foo' }, { id: 'bar' }, { id: 'baz' }];
                let addedPeriod = { id: 'qux' };
                let manifest = {
                    Period: originalPeriods.slice(),
                    Period_asArray: originalPeriods.slice()
                };
                let patch = patchHelper.generatePatch('foobar', [{
                    action: 'add',
                    selector: '/MPD/Period[2]',
                    position: 'after',
                    children: [{
                        Period: addedPeriod
                    }]
                }]);

                dashAdapter.applyPatchToManifest(manifest, patch);

                expect(manifest.Period).to.deep.equal([originalPeriods[0], originalPeriods[1], addedPeriod, originalPeriods[2]]);
                expect(manifest.Period).to.deep.equal(manifest.Period_asArray);
            });

            it('applies add attribute operation', function () {
                let originalPeriod = {};
                let manifest = {
                    Period: originalPeriod,
                    Period_asArray: [originalPeriod]
                };
                let patch = patchHelper.generatePatch('foobar', [{
                    action: 'add',
                    selector: '/MPD/Period[1]',
                    type: '@id',
                    text: 'foo'
                }]);

                dashAdapter.applyPatchToManifest(manifest, patch);

                expect(originalPeriod.id).to.equal('foo');
            });

            it('applies add attribute operation on existing attribute, should act as replace', function () {
                let originalPeriod = { id: 'foo' };
                let manifest = {
                    Period: originalPeriod,
                    Period_asArray: [originalPeriod]
                };
                let patch = patchHelper.generatePatch('foobar', [{
                    action: 'add',
                    selector: '/MPD/Period[1]',
                    type: '@id',
                    text: 'bar'
                }]);

                dashAdapter.applyPatchToManifest(manifest, patch);

                expect(originalPeriod.id).to.equal('bar');
            });

            it('applies replace operation with siblings', function () {
                let originalPeriods = [{ id: 'foo' }, { id: 'bar' }, { id: 'baz' }];
                let replacementPeriod = { id: 'qux' };
                let manifest = {
                    Period: originalPeriods.slice(),
                    Period_asArray: originalPeriods.slice()
                };
                let patch = patchHelper.generatePatch('foobar', [{
                    action: 'replace',
                    selector: '/MPD/Period[2]',
                    children: [{
                        Period: replacementPeriod
                    }]
                }]);

                dashAdapter.applyPatchToManifest(manifest, patch);

                expect(manifest.Period).to.deep.equal([originalPeriods[0], replacementPeriod, originalPeriods[2]]);
                expect(manifest.Period).to.deep.equal(manifest.Period_asArray);
            });

            it('applies replace operation without siblings', function () {
                let originalPeriod = { id: 'foo' };
                let replacementPeriod = { id: 'bar' };
                let manifest = {
                    Period: originalPeriod,
                    Period_asArray: [originalPeriod]
                };
                let patch = patchHelper.generatePatch('foobar', [{
                    action: 'replace',
                    selector: '/MPD/Period[1]',
                    children: [{
                        Period: replacementPeriod
                    }]
                }]);

                dashAdapter.applyPatchToManifest(manifest, patch);

                expect(manifest.Period).to.deep.equal(replacementPeriod);
                expect(manifest.Period_asArray).to.deep.equal([replacementPeriod]);
            });

            it('applies replace operation to attribute', function () {
                let originalPeriod = { id: 'foo' };
                let manifest = {
                    Period: originalPeriod,
                    Period_asArray: [originalPeriod]
                };
                let patch = patchHelper.generatePatch('foobar', [{
                    action: 'replace',
                    selector: '/MPD/Period[1]/@id',
                    text: 'bar'
                }]);

                dashAdapter.applyPatchToManifest(manifest, patch);

                expect(originalPeriod.id).to.equal('bar');
            });

            it('applies remove operation leaving multiple siblings', function () {
                let originalPeriods = [{ id: 'foo' }, { id: 'bar' }, { id: 'baz' }];
                let manifest = {
                    Period: originalPeriods.slice(),
                    Period_asArray: originalPeriods.slice()
                };
                let patch = patchHelper.generatePatch('foobar', [{
                    action: 'remove',
                    selector: '/MPD/Period[2]'
                }]);

                dashAdapter.applyPatchToManifest(manifest, patch);

                expect(manifest.Period).to.deep.equal([originalPeriods[0], originalPeriods[2]]);
                expect(manifest.Period).to.deep.equal(manifest.Period_asArray);
            });

            it('applies remove operation leaving one sibling', function () {
                let originalPeriods = [{ id: 'foo' }, { id: 'bar' }];
                let manifest = {
                    Period: originalPeriods.slice(),
                    Period_asArray: originalPeriods.slice()
                };
                let patch = patchHelper.generatePatch('foobar', [{
                    action: 'remove',
                    selector: '/MPD/Period[2]'
                }]);

                dashAdapter.applyPatchToManifest(manifest, patch);

                expect(manifest.Period).to.equal(originalPeriods[0]);
                expect(manifest.Period_asArray).to.deep.equal([originalPeriods[0]]);
            });

            it('applies remove operation leaving no siblings', function () {
                let originalPeriod = { id: 'foo' };
                let manifest = {
                    Period: originalPeriod,
                    Period_asArray: [originalPeriod]
                };
                let patch = patchHelper.generatePatch('foobar', [{
                    action: 'remove',
                    selector: '/MPD/Period[1]'
                }]);

                dashAdapter.applyPatchToManifest(manifest, patch);

                expect(manifest).to.not.have.property('Period');
                expect(manifest).to.not.have.property('Period_asArray');
            });

            it('applies remove attribute operation', function () {
                let originalPeriod = { id: 'foo', start: 'bar' };
                let manifest = {
                    Period: originalPeriod,
                    Period_asArray: [originalPeriod]
                };
                let patch = patchHelper.generatePatch('foobar', [{
                    action: 'remove',
                    selector: '/MPD/Period[1]/@start'
                }]);

                dashAdapter.applyPatchToManifest(manifest, patch);

                expect(originalPeriod).to.not.have.property('start');
                expect(manifest.Period).to.deep.equal(originalPeriod);
                expect(manifest.Period_asArray).to.deep.equal([originalPeriod]);
            });

            it('applies multiple operations respecting order', function () {
                let originalPeriods = [{ id: 'foo' }, { id: 'bar' }];
                let newPeriod = { id: 'baz' };
                let manifest = {
                    Period: originalPeriods.slice(),
                    Period_asArray: originalPeriods.slice()
                };
                let patch = patchHelper.generatePatch('foobar', [
                    {
                        action: 'add',
                        selector: '/MPD/Period[1]',
                        type: '@start',
                        text: 'findme'
                    },
                    {
                        action: 'add',
                        selector: '/MPD/Period[2]',
                        position: 'before',
                        children: [{
                            Period: newPeriod
                        }]
                    },
                    {
                        action: 'replace',
                        selector: '/MPD/Period[3]/@id',
                        text: 'qux'
                    },
                    {
                        action: 'remove',
                        selector: '/MPD/Period[@start="findme"]'
                    }
                ]);

                dashAdapter.applyPatchToManifest(manifest, patch);

                // check attribute changes
                expect(originalPeriods[0].start).to.equal('findme');
                expect(originalPeriods[1].id).to.equal('qux');

                // check insertion and ordering based on application
                expect(manifest.Period).to.deep.equal([newPeriod, originalPeriods[1]]);
                expect(manifest.Period).to.deep.equal(manifest.Period_asArray);
            });

            it('invalid operations are ignored', function () {
                let originalPeriods = [{ id: 'foo' }, { id: 'bar' }];
                let manifest = {
                    Period: originalPeriods.slice(),
                    Period_asArray: originalPeriods.slice()
                };
                let patch = patchHelper.generatePatch('foobar', [
                    {
                        action: 'add',
                        selector: '/MPD/Period[1]',
                        type: '@start',
                        text: 'findme'
                    },
                    {
                        action: 'replace',
                        selector: '/MPD/Period[@id="nothere"]/@id',
                        text: 'nochange'
                    },
                    {
                        action: 'replace',
                        selector: '/MPD/Period[2]/@id',
                        text: 'baz'
                    }
                ]);

                dashAdapter.applyPatchToManifest(manifest, patch);

                // check updates executed
                expect(originalPeriods[0]).to.have.property('start');
                expect(originalPeriods[0].start).to.equal('findme');
                expect(originalPeriods[1].id).to.equal('baz');

                // check ordering proper
                expect(manifest.Period).to.deep.equal(originalPeriods);
                expect(manifest.Period).to.deep.equal(manifest.Period_asArray);
            });
        });
    });

    describe('areMediaInfosEqual', function () {
        var mediaInfo1;

        beforeEach(function () {
            var manifest_1 = {
                loadedTime: new Date(),
                mediaPresentationDuration: 10,
                Period_asArray: [{
                    AdaptationSet_asArray: [
                        {
                            id: 0, mimeType: Constants.VIDEO,
                            Role_asArray: [],
                            Accessibility_asArray: [{ schemeIdUri: 'urn:mpeg:dash:role:2011', value: 'description' }],
                            SupplementalProperty_asArray: [{
                                schemeIdUri: 'test:scheme',
                                value: 'value1'
                            }, { schemeIdUri: 'test:scheme', value: 'value2' }],
                            [DashConstants.AUDIOCHANNELCONFIGURATION_ASARRAY]: [
                                {
                                    schemeIdUri: 'tag:dolby.com,2014:dash:audio_channel_configuration:2011',
                                    value: '0xF801'
                                }
                            ]
                        }, {
                            id: 1, mimeType: Constants.VIDEO,
                            Role_asArray: [{ schemeIdUri: 'urn:mpeg:dash:role:2011', value: 'main' }],
                            Accessibility_asArray: [],
                            SupplementalProperty_asArray: [{
                                schemeIdUri: 'test:scheme',
                                value: 'value1'
                            }, { schemeIdUri: 'test:scheme', value: 'value4' }],
                            [DashConstants.AUDIOCHANNELCONFIGURATION_ASARRAY]: [
                                { schemeIdUri: 'urn:mpeg:mpegB:cicp:ChannelConfiguration', value: '6' }
                            ]
                        }
                    ]
                }]
            };
            mediaInfo1 = dashAdapter.getAllMediaInfoForType(
                { id: 'defaultId_0', index: 0 }, Constants.VIDEO,
                manifest_1);
        });

        it('should return false if 1st MediaInfo is not set', function () {
            var result = dashAdapter.areMediaInfosEqual(null, mediaInfo1[0]);
            expect(result).to.be.false;
        });
        it('should return false if 2nd MediaInfo is not set', function () {
            var result = dashAdapter.areMediaInfosEqual(mediaInfo1[0], null);
            expect(result).to.be.false;
        });

        it('should return true if MediaInfos are equal', function () {
            var result = dashAdapter.areMediaInfosEqual(mediaInfo1[0], mediaInfo1[0]);
            expect(result).to.be.true;
        });
        it('should return false if MediaInfos are not equal', function () {
            var result = dashAdapter.areMediaInfosEqual(mediaInfo1[0], mediaInfo1[1]);
            expect(result).to.be.false;
        });
    });

});
