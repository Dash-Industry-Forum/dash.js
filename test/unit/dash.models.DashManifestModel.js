import DashManifestModel from '../../src/dash/models/DashManifestModel';
import DashConstants from '../../src/dash/constants/DashConstants';
import Constants from '../../src/streaming/constants/Constants';
import BaseURL from '../../src/dash/vo/BaseURL';

import MpdHelper from './helpers/MPDHelper';
import VoHelper from './helpers/VOHelper';

import ErrorHandlerMock from './mocks/ErrorHandlerMock';

const expect = require('chai').expect;

const context = {};
const errorHandlerMock = new ErrorHandlerMock();
const dashManifestModel = DashManifestModel(context).getInstance();

const TEST_URL = 'http://www.example.com/';
const RELATIVE_TEST_URL = './';
const SERVICE_LOCATION = 'testServiceLocation';
const EMPTY_STRING = '';

const mpd_sample = {
    'manifest': {
        'Period': [
            {
                'id': '153199'
            },
            {
                'id': '153202'
            }
        ],
        'Period_asArray': [
            {
                'id': '153199'
            },
            {
                'id': '153202'
            }
        ],
        'type': 'static'
    },
    'maxSegmentDuration': 4.5,
    'mediaPresentationDuration': 300.0
};

describe('DashManifestModel', function () {
    describe('SetConfig not previously called', function () {
        it('should throw an exception when attempting to call getEndTimeForLastPeriod while setConfig has not been called', function () {
            expect(dashManifestModel.getRegularPeriods.bind(dashManifestModel, mpd_sample)).to.throw(Constants.MISSING_CONFIG_ERROR);
        });
    });

    describe('SetConfig previously called', function () {
        beforeEach(function () {
            dashManifestModel.setConfig({
                errHandler: errorHandlerMock
            });
        });

        const mpdHelper = new MpdHelper();
        const voHelper = new VoHelper();

        it('should throw an exception when attempting to call getIsTypeOf with undefined parameters', function () {
            expect(dashManifestModel.getIsTypeOf.bind(dashManifestModel)).to.throw('adaptation is not defined');

            const adaptation = mpdHelper.composeAdaptation('video');
            expect(dashManifestModel.getIsTypeOf.bind(dashManifestModel, adaptation)).to.throw('type is not defined');

            expect(dashManifestModel.getIsTypeOf.bind(dashManifestModel, adaptation, EMPTY_STRING)).to.throw('type is not defined');
        });

        it('should return null when getSuggestedPresentationDelay is called and mpd is undefined', () => {
            const suggestedPresentationDelay = dashManifestModel.getSuggestedPresentationDelay();

            expect(suggestedPresentationDelay).to.be.null;  // jshint ignore:line
        });

        it('should return null when getSuggestedPresentationDelay is called and mpd is an empty object', () => {
            const suggestedPresentationDelay = dashManifestModel.getSuggestedPresentationDelay({});

            expect(suggestedPresentationDelay).to.be.null;  // jshint ignore:line
        });

        it('should return 5 when getSuggestedPresentationDelay is called and mpd is an object with suggestedPresentationDelay attribute', () => {
            const suggestedPresentationDelay = dashManifestModel.getSuggestedPresentationDelay({ suggestedPresentationDelay: 5 });

            expect(suggestedPresentationDelay).to.be.equal(5);  // jshint ignore:line
        });

        it('should return null when getAvailabilityStartTime is called and mpd is undefined', () => {
            const availabilityStartTime = dashManifestModel.getAvailabilityStartTime();

            expect(availabilityStartTime).to.be.null;  // jshint ignore:line
        });

        it('should return null when getAvailabilityStartTime is called and mpd is an empty object', () => {
            const availabilityStartTime = dashManifestModel.getAvailabilityStartTime({});

            expect(availabilityStartTime).to.be.null;  // jshint ignore:line
        });

        it('should return correct value when getAvailabilityStartTime is called and mpd is object with the availabilityStartTime attribute', () => {
            const now = new Date();
            const availabilityStartTime = dashManifestModel.getAvailabilityStartTime({ availabilityStartTime: now });

            expect(availabilityStartTime).to.be.equal(now.getTime());  // jshint ignore:line
        });

        it('should return empty string when getLanguageForAdaptation is called and adaptation is undefined', () => {
            const language = dashManifestModel.getLanguageForAdaptation();

            expect(language).to.equal(EMPTY_STRING);  // jshint ignore:line
        });

        it('should return null when getViewpointForAdaptation is called and adaptation is undefined', () => {
            const viewPoint = dashManifestModel.getViewpointForAdaptation();

            expect(viewPoint).to.be.null;     // jshint ignore:line
        });

        it('should return an empty array when getAudioChannelConfigurationForAdaptation is called and adaptation is undefined', () => {
            const AudioChannelConfigurationArray = dashManifestModel.getAudioChannelConfigurationForAdaptation();

            expect(AudioChannelConfigurationArray).to.be.instanceOf(Array);    // jshint ignore:line
            expect(AudioChannelConfigurationArray).to.be.empty;                // jshint ignore:line
        });

        it('should return an empty array when getAccessibilityForAdaptation is called and adaptation is undefined', () => {
            const accessibilityArray = dashManifestModel.getAccessibilityForAdaptation();

            expect(accessibilityArray).to.be.instanceOf(Array);    // jshint ignore:line
            expect(accessibilityArray).to.be.empty;                // jshint ignore:line
        });

        it('should return an empty array when getRolesForAdaptation is called and adaptation is undefined', () => {
            const rolesArray = dashManifestModel.getRolesForAdaptation();

            expect(rolesArray).to.be.instanceOf(Array);    // jshint ignore:line
            expect(rolesArray).to.be.empty;                // jshint ignore:line
        });

        it('should return null when getAdaptationForId is called and id, manifest and periodIndex are undefined', () => {
            const adaptation = dashManifestModel.getAdaptationForId(undefined, undefined, undefined);

            expect(adaptation).to.be.null;    // jshint ignore:line
        });

        it('should return null when getAdaptationForId is called and id and periodIndex are undefined', () => {
            const manifest = { Period_asArray: [] };
            const adaptation = dashManifestModel.getAdaptationForId(undefined, manifest, undefined);

            expect(adaptation).to.be.null;    // jshint ignore:line
        });

        it('should return null when getAdaptationForId is called and id is undefined', () => {
            const manifest = { Period_asArray: [] };
            const adaptation = dashManifestModel.getAdaptationForId(undefined, manifest, 2);

            expect(adaptation).to.be.null;    // jshint ignore:line
        });

        it('should return null when getAdaptationForId is called and id is undefined and periodIndex = 0', () => {
            const manifest = { Period_asArray: [{ AdaptationSet_asArray: [{ id: 0 }] }] };
            const adaptation = dashManifestModel.getAdaptationForId(undefined, manifest, 0);

            expect(adaptation).to.be.null;    // jshint ignore:line
        });

        it('should return valid value when getAdaptationForId is called and id is 0 and periodIndex = 0', () => {
            const manifest = { Period_asArray: [{ AdaptationSet_asArray: [{ id: 0 }] }] };
            const adaptation = dashManifestModel.getAdaptationForId(0, manifest, 0);

            expect(adaptation.id).to.equal(0); // jshint ignore:line
        });

        it('should return null when getAdaptationForIndex is called and index, manifest and periodIndex are undefined', () => {
            const adaptation = dashManifestModel.getAdaptationForIndex(undefined, undefined, undefined);

            expect(adaptation).to.be.null;    // jshint ignore:line
        });

        it('should return null when getAdaptationForIndex is called and id and periodIndex are undefined', () => {
            const manifest = { Period_asArray: [] };
            const adaptation = dashManifestModel.getAdaptationForIndex(undefined, manifest, undefined);

            expect(adaptation).to.be.null;    // jshint ignore:line
        });

        it('should return null when getAdaptationForIndex is called and id is undefined', () => {
            const manifest = { Period_asArray: [] };
            const adaptation = dashManifestModel.getAdaptationForIndex(undefined, manifest, 2);

            expect(adaptation).to.be.null;    // jshint ignore:line
        });

        it('should return null when getAdaptationForIndex is called and id is undefined and periodIndex = 0', () => {
            const manifest = { Period_asArray: [{ AdaptationSet_asArray: [{ id: 0 }] }] };
            const adaptation = dashManifestModel.getAdaptationForIndex(undefined, manifest, 0);

            expect(adaptation).to.be.null;    // jshint ignore:line
        });

        it('should return valid value when getAdaptationForIndex is called and id is 0 and periodIndex = 0', () => {
            const manifest = { Period_asArray: [{ AdaptationSet_asArray: [{ id: 0 }] }] };
            const adaptation = dashManifestModel.getAdaptationForIndex(0, manifest, 0);

            expect(adaptation.id).to.equal(0); // jshint ignore:line
        });

        it('should return -1 when getIndexForAdaptation is called and adaptation, manifest and periodIndex are undefined', () => {
            const index = dashManifestModel.getIndexForAdaptation(undefined, undefined, undefined);

            expect(index).to.equal(-1); // jshint ignore:line
        });

        it('should return -1 when getIndexForAdaptation is called and manifest and periodIndex are undefined', () => {
            const manifest = { Period_asArray: [] };
            var adaptation = mpdHelper.composeAdaptation('video');
            const index = dashManifestModel.getIndexForAdaptation(adaptation, manifest, undefined);

            expect(index).to.equal(-1); // jshint ignore:line
        });

        it('should return -1 when getIndexForAdaptation is called and periodIndex are undefined', () => {
            var adaptation = mpdHelper.composeAdaptation('video');
            const index = dashManifestModel.getIndexForAdaptation(adaptation, undefined, undefined);

            expect(index).to.equal(-1); // jshint ignore:line
        });

        it('should return an empty array when getAdaptationsForType is called and manifest, periodIndex and type are undefined', () => {
            const adaptationsArray = dashManifestModel.getAdaptationsForType();

            expect(adaptationsArray).to.be.instanceOf(Array);    // jshint ignore:line
            expect(adaptationsArray).to.be.empty;                // jshint ignore:line
        });

        it('should return an empty array when getAdaptationsForType is called and periodIndex and type are undefined', () => {
            const manifest = { Period_asArray: [] };
            const adaptationsArray = dashManifestModel.getAdaptationsForType(manifest, undefined, undefined);

            expect(adaptationsArray).to.be.instanceOf(Array);    // jshint ignore:line
            expect(adaptationsArray).to.be.empty;                // jshint ignore:line
        });

        it('should return an empty array when getAdaptationsForType is called and type is undefined', () => {
            const manifest = { Period_asArray: [{ AdaptationSet_asArray: [{ id: 0 }] }] };

            expect(dashManifestModel.getAdaptationsForType.bind(dashManifestModel, manifest, 0, undefined)).to.throw('type is not defined');
        });

        it('should return null when getCodec is called and adaptation is undefined', () => {
            const codec = dashManifestModel.getCodec();

            expect(codec).to.be.null;    // jshint ignore:line
        });

        it('should return null when getCodec is called and adaptation.Representation_asArray is undefined', () => {
            const codec = dashManifestModel.getCodec({});

            expect(codec).to.be.null;    // jshint ignore:line
        });

        it('should return null when getCodec is called and adaptation.Representation_asArray.length is -1', () => {
            const codec = dashManifestModel.getCodec({ Representation_asArray: { length: -1 } });

            expect(codec).to.be.null;    // jshint ignore:line
        });

        it('should return null when getCodec is called and representationId is not an integer', () => {
            const codec = dashManifestModel.getCodec({ Representation_asArray: { length: 1 } }, true);

            expect(codec).to.be.null;    // jshint ignore:line
        });

        it('should return correct codec when getCodec is called and representationId is an integer and addResolutionInfo is true', () => {
            const codec = dashManifestModel.getCodec({
                Representation_asArray: [{
                    mimeType: 'video/mp4',
                    codecs: 'avc1.4D400D',
                    width: 1080,
                    height: 960
                }]
            }, 0, true);

            expect(codec).to.be.equal('video/mp4;codecs="avc1.4D400D";width="1080";height="960"');    // jshint ignore:line
        });

        it('should return correct codec when getCodec is called and representationId is an integer and addResolutionInfo is false', () => {
            const codec = dashManifestModel.getCodec({
                Representation_asArray: [{
                    mimeType: 'video/mp4',
                    codecs: 'avc1.4D400D',
                    width: 1080,
                    height: 960
                }]
            }, 0, false);

            expect(codec).to.be.equal('video/mp4;codecs="avc1.4D400D"');    // jshint ignore:line
        });

        it('should return correct codec without a correct mime type profile when getCodec is called and representationId is an integer and addResolutionInfo is false', () => {
            const codec = dashManifestModel.getCodec({
                Representation_asArray: [{
                    mimeType: 'video/mp4 profiles="cmfc,cfhd"',
                    codecs: 'avc1.4D400D',
                    width: 1080,
                    height: 960
                }]
            }, 0, false);

            expect(codec).to.be.equal('video/mp4;codecs="avc1.4D400D"');    // jshint ignore:line
        });

        it('should return correct codec without an invalid mime type profile when getCodec is called and representationId is an integer and addResolutionInfo is false', () => {
            const codec = dashManifestModel.getCodec({
                Representation_asArray: [{
                    mimeType: 'video/mp4 profiles="cmfc,cf',
                    codecs: 'avc1.4D400D',
                    width: 1080,
                    height: 960
                }]
            }, 0, false);

            expect(codec).to.be.equal('video/mp4;codecs="avc1.4D400D"');    // jshint ignore:line
        });

        it('should return null when getMimeType is called and adaptation is undefined', () => {
            const mimeType = dashManifestModel.getMimeType();

            expect(mimeType).to.be.null;    // jshint ignore:line
        });

        it('should return null when getMimeType is called and adaptation.Representation_asArray is undefined', () => {
            const mimeType = dashManifestModel.getMimeType({});

            expect(mimeType).to.be.null;    // jshint ignore:line
        });

        it('should return null when getMimeType is called and adaptation.Representation_asArray.length is -1', () => {
            const mimeType = dashManifestModel.getMimeType({ Representation_asArray: { length: -1 } });

            expect(mimeType).to.be.null;    // jshint ignore:line
        });

        it('should return null when getKID is called and adaptation is undefined', () => {
            const kid = dashManifestModel.getKID();

            expect(kid).to.be.null;    // jshint ignore:line
        });

        it('should return kid value when getKID is called and adaptation is well defined', () => {
            const kid = dashManifestModel.getKID({ 'cenc:default_KID': 'testKid' });

            expect(kid).to.equal('testKid');    // jshint ignore:line
        });

        it('should return empty array when getLabelsForAdaptation is called and adaptation is undefined', () => {
            const labels = dashManifestModel.getLabelsForAdaptation();

            expect(labels).to.be.instanceOf(Array);    // jshint ignore:line
            expect(labels).to.be.empty;                // jshint ignore:line
        });

        it('should return empty array when getLabelsForAdaptation is called and adaptation is not well defined', () => {
            const labels = dashManifestModel.getLabelsForAdaptation({});

            expect(labels).to.be.instanceOf(Array);    // jshint ignore:line
            expect(labels).to.be.empty;                // jshint ignore:line
        });

        it('should return empty array when getLabelsForAdaptation is called and adaptation is not well defined', () => {
            const labels = dashManifestModel.getLabelsForAdaptation({ Label_asArray: true });

            expect(labels).to.be.instanceOf(Array);    // jshint ignore:line
            expect(labels).to.be.empty;                // jshint ignore:line
        });

        it('should return empty array when getLabelsForAdaptation is called and adaptation is well defined with an empty Label_asArray', () => {
            const labels = dashManifestModel.getLabelsForAdaptation({ Label_asArray: [] });

            expect(labels).to.be.instanceOf(Array);    // jshint ignore:line
            expect(labels).to.be.empty;                // jshint ignore:line
        });

        it('should return correct array when getLabelsForAdaptation is called and adaptation is well defined', () => {
            const labels = dashManifestModel.getLabelsForAdaptation({
                Label_asArray: [{
                    lang: 'fre',
                    __text: 'french'
                }, { lang: 'eng', __text: 'english' }]
            });

            expect(labels).to.be.instanceOf(Array);    // jshint ignore:line
            expect(labels.length).to.equal(2);         // jshint ignore:line
            expect(labels[0].lang).to.equal('fre');        // jshint ignore:line
        });

        it('should return null when getContentProtectionData is called and adaptation is undefined', () => {
            const contentProtection = dashManifestModel.getContentProtectionData();

            expect(contentProtection).to.be.null;    // jshint ignore:line
        });

        it('should return null when getContentProtectionData is called and adaptation is defined, but ContentProtection_asArray is an empty array', () => {
            const adaptation = { ContentProtection_asArray: [] };
            const contentProtection = dashManifestModel.getContentProtectionData(adaptation);

            expect(contentProtection).to.be.null;    // jshint ignore:line
        });

        it('should return false when getIsDynamic is called and manifest is undefined', () => {
            const isDynamic = dashManifestModel.getIsDynamic();

            expect(isDynamic).to.be.false;    // jshint ignore:line
        });

        it('should return Number.MAX_SAFE_NUMBER (or Number.MAX_VALUE in case MAX_SAFE_NUMBER is not defined) when getDuration is called and manifest is undefined', () => {
            const duration = dashManifestModel.getDuration();

            expect(duration).to.equal(Number.MAX_SAFE_INTEGER || Number.MAX_VALUE); // jshint ignore:line
        });

        it('should return duration when getDuration is called and manifest has a defined mediaPresentationDuration', () => {
            const duration = dashManifestModel.getDuration({ mediaPresentationDuration: 50 });

            expect(duration).to.equal(50); // jshint ignore:line
        });

        it('should return infinity when getDuration is called and manifest is a dynamic one', () => {
            const duration = dashManifestModel.getDuration({ type: DashConstants.DYNAMIC });

            expect(duration).to.equal(Infinity); // jshint ignore:line
        });

        it('should return 0 when getRepresentationCount is called and adaptation is undefined', () => {
            const representationCount = dashManifestModel.getRepresentationCount();

            expect(representationCount).to.equal(0); // jshint ignore:line
        });

        it('should return NaN when getBandwidth is called and representation is undefined', () => {
            const bdtw = dashManifestModel.getBandwidth();

            expect(bdtw).to.be.NaN; // jshint ignore:line
        });

        it('should return correct value when getBandwidth is called and representation is defined', () => {
            const bdtw = dashManifestModel.getBandwidth({ bandwidth: 9600 });

            expect(bdtw).to.equal(9600); // jshint ignore:line
        });

        it('should return empty array when getBitrateListForAdaptation is called and adaptation is undefined', () => {
            const bitrateList = dashManifestModel.getBitrateListForAdaptation();

            expect(bitrateList).to.be.instanceOf(Array); // jshint ignore:line
            expect(bitrateList).to.be.empty; // jshint ignore:line
        });

        it('should not return empty array when getBitrateListForAdaptation is called and adaptation is defined', () => {
            const realAdaptation = { Representation_asArray: [{}] };

            const bitrateList = dashManifestModel.getBitrateListForAdaptation(realAdaptation);

            expect(bitrateList).to.be.instanceOf(Array); // jshint ignore:line
            expect(bitrateList).not.to.be.empty; // jshint ignore:line
        });

        it('should return null when getRepresentationFor is called and index and adaptation are undefined', () => {
            const representation = dashManifestModel.getRepresentationFor();

            expect(representation).to.be.null; // jshint ignore:line
        });

        it('should return null when getRepresentationFor is called and index and andadaptation.Representation_asArray are undefined', () => {
            const adaptation = {};
            const representation = dashManifestModel.getRepresentationFor(undefined, adaptation);

            expect(representation).to.be.null; // jshint ignore:line
        });

        it('should return null when getRepresentationFor is called and index is undefined', () => {
            var adaptation = mpdHelper.composeAdaptation('video');
            const representation = dashManifestModel.getRepresentationFor(undefined, adaptation);

            expect(representation).to.be.null; // jshint ignore:line
        });

        it('should return representation.id = video20 when getRepresentationFor is called', () => {
            var adaptation = mpdHelper.composeAdaptation('video');
            const representation = dashManifestModel.getRepresentationFor(0, adaptation);

            expect(representation.id).equal('video20'); // jshint ignore:line
        });

        it('should return undefined when getLocation is called and manifest is undefined', () => {
            const location = dashManifestModel.getLocation();

            expect(location).to.be.undefined; // jshint ignore:line
        });

        it('should return undefined when getLocation is called and manifest is an empty object', () => {
            const location = dashManifestModel.getLocation({});

            expect(location).to.be.undefined; // jshint ignore:line
        });

        it('should return valid location when getLocation is called and manifest is a valid object', () => {
            const location = dashManifestModel.getLocation({ Location: '', Location_asArray: ['location_1'] });

            expect(location).to.be.equal('location_1'); // jshint ignore:line
        });

        it('should return undefined when getPatchLocation is called and manifest is undefined', () => {
            const location = dashManifestModel.getPatchLocation();

            expect(location).to.be.undefined; // jshint ignore:line
        });

        it('should return undefined when getPatchLocation is called and one is not present', () => {
            const location = dashManifestModel.getPatchLocation({});

            expect(location).to.be.undefined; // jshint ignore:line
        });

        it('should return valid patch location when getLocation is called and manifest contains complex location', () => {
            const patchLocation = {
                __text: 'http://example.com',
                ttl: 60
            };
            const manifest = {
                [DashConstants.PATCH_LOCATION]: patchLocation,
                PatchLocation_asArray: [patchLocation]
            };

            const location = dashManifestModel.getPatchLocation(manifest);

            expect(location).to.equal(patchLocation);
        });

        it('should return an empty Array when getUTCTimingSources is called and manifest is undefined', () => {
            const utcSourceArray = dashManifestModel.getUTCTimingSources();

            expect(utcSourceArray).to.be.instanceOf(Array);    // jshint ignore:line
            expect(utcSourceArray).to.be.empty;                // jshint ignore:line
        });

        it('should return an empty Array when getEventStreamForRepresentation is called and manifest and representation are undefined', () => {
            const eventsStream = dashManifestModel.getEventStreamForRepresentation();

            expect(eventsStream).to.be.instanceOf(Array);    // jshint ignore:line
            expect(eventsStream).to.be.empty;                // jshint ignore:line
        });

        it('should not return an empty Array when getEventStreamForRepresentation is called and manifest and representation are well defined', () => {
            const manifest = {
                Period: [
                    {
                        'id': '153199',
                        AdaptationSet: [{ Representation: [{ InbandEventStream: [] }] }]
                    },
                    {
                        'id': '153202',
                        AdaptationSet: [{ Representation: [{ InbandEventStream: [] }] }]
                    }
                ],
                Period_asArray: [
                    {
                        'id': '153199',
                        AdaptationSet_asArray: [{ Representation_asArray: [{ InbandEventStream_asArray: [] }] }]
                    },
                    {
                        'id': '153202',
                        AdaptationSet_asArray: [{ Representation_asArray: [{ InbandEventStream_asArray: [] }] }]
                    }
                ],
                'type': 'static'
            };
            const representation = { adaptation: { index: 0, period: { index: 0 } }, index: 0 };
            const eventsStream = dashManifestModel.getEventStreamForRepresentation(manifest, representation);

            expect(eventsStream).to.be.instanceOf(Array);    // jshint ignore:line
            expect(eventsStream).to.be.empty;                // jshint ignore:line
        });

        it('should return an empty Array when getEventStreamForAdaptationSet is called and manifest and adaptation are undefined', () => {
            const eventsStream = dashManifestModel.getEventStreamForAdaptationSet();

            expect(eventsStream).to.be.instanceOf(Array);    // jshint ignore:line
            expect(eventsStream).to.be.empty;                // jshint ignore:line
        });

        it('should return an empty Array when getEventsForPeriod is called and manifest and period are undefined', () => {
            const eventsStream = dashManifestModel.getEventsForPeriod();

            expect(eventsStream).to.be.instanceOf(Array);    // jshint ignore:line
            expect(eventsStream).to.be.empty;                // jshint ignore:line
        });

        it('should return mpd.manifest = null when getMpd is called and manifest is undefined', () => {
            const mpd = dashManifestModel.getMpd();

            expect(mpd.manifest).to.be.null;                // jshint ignore:line
        });

        it('should return mpd.manifest not null when getMpd is called and manifest is defined', () => {
            const mpd = dashManifestModel.getMpd({});

            expect(mpd.manifest).not.to.be.null;                // jshint ignore:line
            expect(mpd.manifest.availabilityStartTime).to.be.undefined;                // jshint ignore:line
        });

        it('should return an error when getRegularPeriods and getEndTimeForLastPeriod are called and duration is undefined', () => {
            dashManifestModel.getRegularPeriods(mpd_sample);

            expect(errorHandlerMock.errorValue).to.equal('Must have @mediaPresentationDuration on MPD or an explicit @duration on the last period.');
        });

        it('should return an empty array when getRegularPeriods is called and mpd is undefined', () => {
            const periodsArray = dashManifestModel.getRegularPeriods();

            expect(periodsArray).to.be.instanceOf(Array);    // jshint ignore:line
            expect(periodsArray).to.be.empty;                // jshint ignore:line
        });

        it('should return just the first period when type is static and neither start nor duration period attributes are provided', () => {
            const mpd = {
                'manifest': {
                    'Period': [
                        {
                            'id': '153199'
                        },
                        {
                            'id': '153202'
                        }
                    ],
                    'Period_asArray': [
                        {
                            'id': '153199'
                        },
                        {
                            'id': '153202'
                        }
                    ],
                    'type': 'static',
                    'mediaPresentationDuration': 300.0
                },
                'maxSegmentDuration': 4.5,
                'mediaPresentationDuration': 300.0
            };

            const periodsArray = dashManifestModel.getRegularPeriods(mpd);

            expect(periodsArray).to.be.instanceOf(Array);    // jshint ignore:line
            expect(periodsArray).to.have.lengthOf(1);        // jshint ignore:line
            expect(periodsArray[0].start).to.equals(0);
            expect(periodsArray[0].duration).to.equals(300);
        });

        it('should calculate period start and duration properties of periods when duration properties are provided for all but the latest', () => {
            const manifest = {
                'manifest': {
                    'Period': [
                        {
                            'id': '153199',
                            'duration': 100
                        },
                        {
                            'id': '153200',
                            'duration': 50
                        },
                        {
                            'id': '153201'
                        }
                    ],
                    'Period_asArray': [
                        {
                            'id': '153199',
                            'duration': 100
                        },
                        {
                            'id': '153200',
                            'duration': 50
                        },
                        {
                            'id': '153201'
                        }
                    ],
                    'type': 'static',
                    'mediaPresentationDuration': 320.0
                },
                'maxSegmentDuration': 4.5,
                'mediaPresentationDuration': 320.0
            };
            const periodsArray = dashManifestModel.getRegularPeriods(manifest);

            expect(periodsArray).to.be.instanceOf(Array);    // jshint ignore:line
            expect(periodsArray).to.have.lengthOf(3);        // jshint ignore:line

            expect(periodsArray[0].start).to.equals(0);
            expect(periodsArray[0].duration).to.equals(100);

            expect(periodsArray[1].start).to.equals(100);
            expect(periodsArray[1].duration).to.equals(50);

            expect(periodsArray[2].start).to.equals(150);
            expect(periodsArray[2].duration).to.equals(170);
        });

        it('should calculate period start and duration properties of periods when start properties are provided for all but the first', () => {
            const manifest = {
                'manifest': {
                    'Period': [
                        {
                            'id': '153199'
                        },
                        {
                            'id': '153200',
                            'start': 80
                        },
                        {
                            'id': '153201',
                            'start': 120
                        }
                    ],
                    'Period_asArray': [
                        {
                            'id': '153199'
                        },
                        {
                            'id': '153200',
                            'start': 80
                        },
                        {
                            'id': '153201',
                            'start': 120
                        }
                    ],
                    'type': 'static',
                    'mediaPresentationDuration': 300.0
                },
                'maxSegmentDuration': 4.5,
                'mediaPresentationDuration': 300.0
            };
            const periodsArray = dashManifestModel.getRegularPeriods(manifest);

            expect(periodsArray).to.be.instanceOf(Array);    // jshint ignore:line
            expect(periodsArray).to.have.lengthOf(3);        // jshint ignore:line

            expect(periodsArray[0].start).to.equals(0);
            expect(periodsArray[0].duration).to.equals(80);

            expect(periodsArray[1].start).to.equals(80);
            expect(periodsArray[1].duration).to.equals(40);

            expect(periodsArray[2].start).to.equals(120);
            expect(periodsArray[2].duration).to.equals(180);
        });

        it('should return an empty array when getAdaptationsForPeriod is called and period is undefined', () => {
            const adaptationArray = dashManifestModel.getAdaptationsForPeriod();

            expect(adaptationArray).to.be.instanceOf(Array);    // jshint ignore:line
            expect(adaptationArray).to.be.empty;                // jshint ignore:line
        });

        it('should not return an empty array when getAdaptationsForPeriod is called and period is defined', () => {
            const period = voHelper.getDummyPeriod();
            const adaptationArray = dashManifestModel.getAdaptationsForPeriod(period);

            expect(adaptationArray).to.be.instanceOf(Array);    // jshint ignore:line
            expect(adaptationArray).not.to.be.empty;                // jshint ignore:line
            expect(adaptationArray[0].index).to.equals(0);                // jshint ignore:line
        });

        it('should return an empty array when getRepresentationsForAdaptation is called and adaptation is undefined', () => {
            const representationArray = dashManifestModel.getRepresentationsForAdaptation();

            expect(representationArray).to.be.instanceOf(Array);    // jshint ignore:line
            expect(representationArray).to.be.empty;                // jshint ignore:line
        });

        it('should not return an empty array when getRepresentationsForAdaptation is called and adaptation is defined', () => {
            const voAdaptation = {
                period: {
                    index: 0,
                    mpd: {
                        manifest: {
                            Period_asArray: [{
                                AdaptationSet_asArray: [{
                                    Representation_asArray: [{
                                        SegmentTemplate: {
                                            SegmentTimeline: {
                                                S_asArray: [{
                                                    d: 2,
                                                    r: 2
                                                }]
                                            }
                                        }
                                    }]
                                }]
                            }]
                        }
                    }
                }, index: 0, type: 'video'
            };
            const representationArray = dashManifestModel.getRepresentationsForAdaptation(voAdaptation);

            expect(representationArray).to.be.instanceOf(Array);    // jshint ignore:line
            expect(representationArray).not.to.be.empty;                // jshint ignore:line
            expect(representationArray[0].index).to.equals(0);                // jshint ignore:line
        });

        it('should return null when getId is called and manifest undefined', () => {
            const id = dashManifestModel.getId();

            expect(id).to.be.null; // jshint ignore:line
        });

        it('should return null when getId is called and manifest is missing id', () => {
            const id = dashManifestModel.getId({});

            expect(id).to.be.null; // jshint ignore:line
        });

        it('should return id when getId is called and manifest contains id', () => {
            const manifest = {
                [DashConstants.ID]: 'foobar'
            };

            const id = dashManifestModel.getId(manifest);

            expect(id).to.equal('foobar');
        });

        it('should return false when hasProfile is called and manifest is undefined', () => {
            const IsDVB = dashManifestModel.hasProfile();

            expect(IsDVB).to.be.false;    // jshint ignore:line
        });

        it('should return true when hasProfile is called and manifest contains a valid DVB profile', () => {
            const manifest = {
                profiles: 'urn:dvb:dash:profile:dvb-dash:2014,urn:dvb:dash:profile:dvb-dash:isoff-ext-live:2014'
            };

            const isDVB = dashManifestModel.hasProfile(manifest, 'urn:dvb:dash:profile:dvb-dash:2014');

            expect(isDVB).to.be.true; // jshint ignore:line
        });

        it('should return false when hasProfile is called and manifest does not contain a valid DVB profile', () => {
            const manifest = {
                profiles: 'urn:mpeg:dash:profile:isoff-on-demand:2011, http://dashif.org/guildelines/dash264'
            };

            const isDVB = dashManifestModel.hasProfile(manifest, 'urn:dvb:dash:profile:dvb-dash:2014');

            expect(isDVB).to.be.false; // jshint ignore:line
        });

        it('should return null when getPublishTime is called and manifest is undefined', () => {
            const publishTime = dashManifestModel.getPublishTime();

            expect(publishTime).to.be.null; // jshint ignore:line
        });

        it('should return valid date object when getPublishTime is called with manifest with valid date', () => {
            const manifest = {
                [DashConstants.PUBLISH_TIME]: '2020-11-11T05:13:19.514676331Z'
            };

            const publishTime = dashManifestModel.getPublishTime(manifest);

            expect(publishTime).to.be.instanceOf(Date);
            expect(publishTime.getTime()).to.not.be.NaN; // jshint ignore:line
        });

        it('should return invalid date object when getPublishTime is called with manifest with invalid date', () => {
            const manifest = {
                [DashConstants.PUBLISH_TIME]: '<invalid-date-time>'
            };

            const publishTime = dashManifestModel.getPublishTime(manifest);

            expect(publishTime).to.be.instanceOf(Date);
            expect(publishTime.getTime()).to.be.NaN; // jshint ignore:line
        });

        it('should return NaN when getManifestUpdatePeriod is called and manifest is undefined', () => {
            const updatePeriod = dashManifestModel.getManifestUpdatePeriod();
            expect(updatePeriod).to.be.NaN; // jshint ignore:line
        });

        it('should return NaN when minimumUpdatePeriod is not present in manifest', () => {
            const manifest = {};
            const updatePeriod = dashManifestModel.getManifestUpdatePeriod(manifest);
            expect(updatePeriod).to.be.NaN; // jshint ignore:line
        });

        it('should return valid value when minimumUpdatePeriod is present in manifest and latencyOfLastUpdate is defined', () => {
            const minimumUpdatePeriod = 30;
            const latencyOfLastUpdate = 0.5;
            const manifest = { minimumUpdatePeriod: minimumUpdatePeriod };
            const expectedResult = minimumUpdatePeriod - latencyOfLastUpdate;
            const updatePeriod = dashManifestModel.getManifestUpdatePeriod(manifest, latencyOfLastUpdate);
            expect(updatePeriod).to.equal(expectedResult); // jshint ignore:line
        });

        it('should return valid value when minimumUpdatePeriod is present in manifest and latencyOfLastUpdate is not defined', () => {
            const minimumUpdatePeriod = 30;
            const manifest = { minimumUpdatePeriod: minimumUpdatePeriod };
            const expectedResult = minimumUpdatePeriod;
            const updatePeriod = dashManifestModel.getManifestUpdatePeriod(manifest);
            expect(updatePeriod).to.equal(expectedResult); // jshint ignore:line
        });

        describe('getBaseUrlsFromElement', () => {
            it('returns an empty Array when no BaseURLs or baseUri are present on a node', () => {
                const node = {};

                const obj = dashManifestModel.getBaseURLsFromElement(node);

                expect(obj).to.be.instanceOf(Array);    // jshint ignore:line
                expect(obj).to.be.empty;                // jshint ignore:line

            });

            it('returns an Array of BaseURLs when no BaseURLs are present on a node, but there is a baseUri', () => {
                const node = {
                    baseUri: TEST_URL
                };

                const obj = dashManifestModel.getBaseURLsFromElement(node);

                expect(obj).to.be.instanceOf(Array);        // jshint ignore:line
                expect(obj).to.have.lengthOf(1);            // jshint ignore:line
                expect(obj[0]).to.be.instanceOf(BaseURL);   // jshint ignore:line
                expect(obj[0].url).to.equal(TEST_URL);      // jshint ignore:line
            });

            it('returns an Array of BaseURLs with BaseURL[0] serviceLocation set to URL when no serviceLocation was specified', () => {
                const node = {
                    BaseURL_asArray: [{
                        __text: TEST_URL
                    }]
                };

                const obj = dashManifestModel.getBaseURLsFromElement(node);

                expect(obj).to.be.instanceOf(Array);                // jshint ignore:line
                expect(obj).to.have.lengthOf(1);                    // jshint ignore:line
                expect(obj[0]).to.be.instanceOf(BaseURL);           // jshint ignore:line
                expect(obj[0].url).to.equal(TEST_URL);              // jshint ignore:line
                expect(obj[0].serviceLocation).to.equal(TEST_URL);  // jshint ignore:line
            });

            it('returns an Array of BaseURLs with length 1 when multiple relative BaseUrls were specified', () => {
                const node = {
                    BaseURL_asArray: [
                        {
                            __text: RELATIVE_TEST_URL + '0'
                        },
                        {
                            __text: RELATIVE_TEST_URL + '1'
                        }
                    ]
                };

                const obj = dashManifestModel.getBaseURLsFromElement(node);

                expect(obj).to.be.instanceOf(Array);                    // jshint ignore:line
                expect(obj).to.have.lengthOf(1);                        // jshint ignore:line
                expect(obj[0]).to.be.instanceOf(BaseURL);               // jshint ignore:line
                expect(obj[0].url).to.equal(RELATIVE_TEST_URL + '0');   // jshint ignore:line
            });

            it('returns an Array of BaseURLs when multiple BaseUrls were specified', () => {
                const node = {
                    BaseURL_asArray: [
                        {
                            __text: TEST_URL + '0'
                        },
                        {
                            __text: TEST_URL + '1'
                        }
                    ]
                };

                const obj = dashManifestModel.getBaseURLsFromElement(node);

                expect(obj).to.be.instanceOf(Array);        // jshint ignore:line
                expect(obj).to.have.lengthOf(2);            // jshint ignore:line
                obj.forEach((o, i) => {
                    expect(o).to.be.instanceOf(BaseURL);    // jshint ignore:line
                    expect(o.url).to.equal(TEST_URL + i);   // jshint ignore:line
                });
            });

            it('returns an Array of BaseURLs with BaseURL[0] serviceLocation set when serviceLocation was specified', () => {
                const node = {
                    BaseURL_asArray: [{
                        __text: TEST_URL,
                        serviceLocation: SERVICE_LOCATION
                    }]
                };

                const obj = dashManifestModel.getBaseURLsFromElement(node);

                expect(obj).to.be.instanceOf(Array);                        // jshint ignore:line
                expect(obj).to.have.lengthOf(1);                            // jshint ignore:line
                expect(obj[0]).to.be.instanceOf(BaseURL);                   // jshint ignore:line
                expect(obj[0].url).to.equal(TEST_URL);                      // jshint ignore:line
                expect(obj[0].serviceLocation).to.equal(SERVICE_LOCATION);  // jshint ignore:line
            });

            it('returns an Array of BaseURLs with BaseURL[0] having correct defaults for DVB extensions when not specified', () => {
                const node = {
                    BaseURL_asArray: [{
                        __text: TEST_URL
                    }]
                };

                const obj = dashManifestModel.getBaseURLsFromElement(node);

                expect(obj).to.be.instanceOf(Array);                                // jshint ignore:line
                expect(obj).to.have.lengthOf(1);                                    // jshint ignore:line
                expect(obj[0].dvb_priority).to.equal(BaseURL.DEFAULT_DVB_PRIORITY); // jshint ignore:line
                expect(obj[0].dvb_weight).to.equal(BaseURL.DEFAULT_DVB_WEIGHT);     // jshint ignore:line
            });

            it('returns an Array of BaseURLs with BaseURL[0] having correct priority and weight for DVB extensions when specified', () => {
                const TEST_PRIORITY = 3;
                const TEST_WEIGHT = 2;
                const node = {
                    BaseURL_asArray: [{
                        __text: TEST_URL,
                        'dvb:priority': TEST_PRIORITY,
                        'dvb:weight': TEST_WEIGHT
                    }]
                };

                const obj = dashManifestModel.getBaseURLsFromElement(node);

                expect(obj).to.be.instanceOf(Array);                                // jshint ignore:line
                expect(obj).to.have.lengthOf(1);                                    // jshint ignore:line
                expect(obj[0].dvb_priority).to.equal(TEST_PRIORITY);                // jshint ignore:line
                expect(obj[0].dvb_weight).to.equal(TEST_WEIGHT);                    // jshint ignore:line
            });

            it('returns an Array of BaseURLs with BaseURL[0] resolved to the document base uri when the base uri is specified and the input url is relative', () => {
                const node = {
                    baseUri: TEST_URL,
                    BaseURL_asArray: [{
                        __text: RELATIVE_TEST_URL
                    }]
                };

                const obj = dashManifestModel.getBaseURLsFromElement(node);

                expect(obj).to.be.instanceOf(Array);                                // jshint ignore:line
                expect(obj).to.have.lengthOf(1);                                    // jshint ignore:line
                expect(obj[0].url).to.equal(TEST_URL + RELATIVE_TEST_URL);          // jshint ignore:line
            });

            it('returns an Array of BaseURLs with BaseURL[0] resolved to the document base uri when the base uri is the mpd and the input url is relative', () => {
                const node = {
                    baseUri: TEST_URL + 'example.mpd',
                    BaseURL_asArray: [{
                        __text: RELATIVE_TEST_URL
                    }]
                };

                const obj = dashManifestModel.getBaseURLsFromElement(node);

                expect(obj).to.be.instanceOf(Array);                                // jshint ignore:line
                expect(obj).to.have.lengthOf(1);                                    // jshint ignore:line
                expect(obj[0].url).to.equal(TEST_URL + RELATIVE_TEST_URL);          // jshint ignore:line
            });

            it('returns an Array of BaseURLs with BaseURL[0] ignoring the document base uri when the base uri is specified and the input url is absolute', () => {
                const node = {
                    baseUri: TEST_URL,
                    BaseURL_asArray: [{
                        __text: TEST_URL
                    }]
                };

                const obj = dashManifestModel.getBaseURLsFromElement(node);

                expect(obj).to.be.instanceOf(Array);                                // jshint ignore:line
                expect(obj).to.have.lengthOf(1);                                    // jshint ignore:line
                expect(obj[0].url).to.equal(TEST_URL);                              // jshint ignore:line
            });

            it('returns an Array of BaseURLs with BaseURL[0] resolved to the document base uri when the base uri is specified but no other urls', () => {
                const node = {
                    baseUri: TEST_URL
                };

                const obj = dashManifestModel.getBaseURLsFromElement(node);

                expect(obj).to.be.instanceOf(Array);                                // jshint ignore:line
                expect(obj).to.have.lengthOf(1);                                    // jshint ignore:line
                expect(obj[0].url).to.equal(TEST_URL);                              // jshint ignore:line
            });
        });

        describe('getSelectionPriority', () => {

            it('should return 1 when adaptation is not defined', () => {
                const priority = dashManifestModel.getSelectionPriority();

                expect(priority).to.equal(1);
            })

            it('should return 1 when adaptation does not have field selectionPriority', () => {
                const priority = dashManifestModel.getSelectionPriority({});

                expect(priority).to.equal(1);
            })

            it('should return 1 when selectionPriority is not a number', () => {
                const priority = dashManifestModel.getSelectionPriority({ selectionPriority: 'xy' });

                expect(priority).to.equal(1);
            })

            it('should return valid selectionPriority', () => {
                const priority = dashManifestModel.getSelectionPriority({ selectionPriority: '5' });

                expect(priority).to.equal(5);
            })
        })
    });
});
