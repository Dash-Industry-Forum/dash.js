import DashManifestModel from '../../../../src/dash/models/DashManifestModel.js';
import DashConstants from '../../../../src/dash/constants/DashConstants.js';
import Constants from '../../../../src/streaming/constants/Constants.js';
import BaseURL from '../../../../src/dash/vo/BaseURL.js';
import MpdHelper from '../../helpers/MPDHelper.js';
import VoHelper from '../../helpers/VOHelper.js';
import ErrorHandlerMock from '../../mocks/ErrorHandlerMock.js';
import DescriptorType from '../../../../src/dash/vo/DescriptorType.js';
import {expect} from 'chai';

const context = {};
const errorHandlerMock = new ErrorHandlerMock();
const dashManifestModel = DashManifestModel(context).getInstance();

const TEST_URL = 'http://www.example.com/';
const RELATIVE_TEST_URL = 'test/';
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

            expect(suggestedPresentationDelay).to.be.null;
        });

        it('should return null when getSuggestedPresentationDelay is called and mpd is an empty object', () => {
            const suggestedPresentationDelay = dashManifestModel.getSuggestedPresentationDelay({});

            expect(suggestedPresentationDelay).to.be.null;
        });

        it('should return 5 when getSuggestedPresentationDelay is called and mpd is an object with suggestedPresentationDelay attribute', () => {
            const suggestedPresentationDelay = dashManifestModel.getSuggestedPresentationDelay({ suggestedPresentationDelay: 5 });

            expect(suggestedPresentationDelay).to.be.equal(5);
        });

        it('should return null when getAvailabilityStartTime is called and mpd is undefined', () => {
            const availabilityStartTime = dashManifestModel.getAvailabilityStartTime();

            expect(availabilityStartTime).to.be.null;
        });

        it('should return null when getAvailabilityStartTime is called and mpd is an empty object', () => {
            const availabilityStartTime = dashManifestModel.getAvailabilityStartTime({});

            expect(availabilityStartTime).to.be.null;
        });

        it('should return correct value when getAvailabilityStartTime is called and mpd is object with the availabilityStartTime attribute', () => {
            const now = new Date();
            const availabilityStartTime = dashManifestModel.getAvailabilityStartTime({ availabilityStartTime: now });

            expect(availabilityStartTime).to.be.equal(now.getTime());
        });

        it('should return empty string when getLanguageForAdaptation is called and adaptation is undefined', () => {
            const language = dashManifestModel.getLanguageForAdaptation();

            expect(language).to.equal(EMPTY_STRING);
        });

        it('should return an empty array when getViewpointForAdaptation is called and adaptation is undefined', () => {
            const viewPoint = dashManifestModel.getViewpointForAdaptation();

            expect(viewPoint).to.be.instanceOf(Array);
            expect(viewPoint).to.be.empty;
        });

        it('should return an empty array when getAudioChannelConfigurationForAdaptation is called and adaptation is undefined', () => {
            const AudioChannelConfigurationArray = dashManifestModel.getAudioChannelConfigurationForAdaptation();

            expect(AudioChannelConfigurationArray).to.be.instanceOf(Array);
            expect(AudioChannelConfigurationArray).to.be.empty;
        });

        it('should return an empty array when getAccessibilityForAdaptation is called and adaptation is undefined', () => {
            const accessibilityArray = dashManifestModel.getAccessibilityForAdaptation();

            expect(accessibilityArray).to.be.instanceOf(Array);
            expect(accessibilityArray).to.be.empty;
        });

        it('should return an empty array when getRolesForAdaptation is called and adaptation is undefined', () => {
            const rolesArray = dashManifestModel.getRolesForAdaptation();

            expect(rolesArray).to.be.instanceOf(Array);
            expect(rolesArray).to.be.empty;
        });

        it('should return DescriptorTypes with sanitized value for Role-value set to Main only for MPEG-Role scheme', () => {
            const rolesArray = dashManifestModel.getRolesForAdaptation({
                Role: [
                    {schemeIdUri:Constants.DASH_ROLE_SCHEME_ID, value:'Main'},
                    {schemeIdUri:'my.own.scheme', value:'Main'}]
            });

            expect(rolesArray).to.be.instanceOf(Array);
            expect(rolesArray.length).to.equal(2);
            expect(rolesArray[0]).to.be.instanceOf(DescriptorType);
            expect(rolesArray[0].value).equals(DashConstants.MAIN);
            expect(rolesArray[1].value).equals('Main');
        });

        it('should return an empty array when getEssentialProperties', () => {
            const suppPropArray = dashManifestModel.getEssentialProperties();

            expect(suppPropArray).to.be.instanceOf(Object);
            expect(suppPropArray).to.be.empty;
        });

        it('should return an empty array when getEssentialProperties', () => {
            const suppPropArray = dashManifestModel.getEssentialProperties();

            expect(suppPropArray).to.be.instanceOf(Array);
            expect(suppPropArray).to.be.empty;
        });

        it('should return correct array of DescriptorType when getEssentialProperties is called', () => {
            const essPropArray = dashManifestModel.getEssentialProperties({
                EssentialProperty: [{ schemeIdUri: 'test.scheme', value: 'testVal' }, {
                    schemeIdUri: 'test.scheme',
                    value: 'test2Val'
                }]
            });

            expect(essPropArray).to.be.instanceOf(Array);
            expect(essPropArray.length).to.equal(2);
            expect(essPropArray[0]).to.be.instanceOf(DescriptorType);
            expect(essPropArray[0].schemeIdUri).equals('test.scheme');
            expect(essPropArray[0].value).equals('testVal');
            expect(essPropArray[1].schemeIdUri).equals('test.scheme');
            expect(essPropArray[1].value).equals('test2Val');
        });

        it('should return an empty array when getEssentialProperties', () => {
            const essPropArray = dashManifestModel.getEssentialProperties();

            expect(essPropArray).to.be.instanceOf(Object);
            expect(essPropArray).to.be.empty;
        });

        it('should return an empty array when getEssentialProperties', () => {
            const essPropArray = dashManifestModel.getEssentialProperties();

            expect(essPropArray).to.be.instanceOf(Array);
            expect(essPropArray).to.be.empty;
        });

        it('should return correct array of DescriptorType when getEssentialProperties is called', () => {
            const essPropArray = dashManifestModel.getEssentialProperties({
                EssentialProperty: [{ schemeIdUri: 'test.scheme', value: 'testVal' }]
            });

            expect(essPropArray).to.be.instanceOf(Array);
            expect(essPropArray[0]).to.be.instanceOf(DescriptorType);
            expect(essPropArray[0].schemeIdUri).equals('test.scheme');
            expect(essPropArray[0].value).equals('testVal');
        });

        it('should return null when getAdaptationForId is called and id, manifest and periodIndex are undefined', () => {
            const adaptation = dashManifestModel.getAdaptationForId(undefined, undefined, undefined);

            expect(adaptation).to.be.null;
        });

        it('should return null when getAdaptationForId is called and id and periodIndex are undefined', () => {
            const manifest = { Period: [] };
            const adaptation = dashManifestModel.getAdaptationForId(undefined, manifest, undefined);

            expect(adaptation).to.be.null;
        });

        it('should return null when getAdaptationForId is called and id is undefined', () => {
            const manifest = { Period: [] };
            const adaptation = dashManifestModel.getAdaptationForId(undefined, manifest, 2);

            expect(adaptation).to.be.null;
        });

        it('should return null when getAdaptationForId is called and id is undefined and periodIndex = 0', () => {
            const manifest = { Period: [{ AdaptationSet: [{ id: 0 }] }] };
            const adaptation = dashManifestModel.getAdaptationForId(undefined, manifest, 0);

            expect(adaptation).to.be.null;
        });

        it('should return valid value when getAdaptationForId is called and id is 0 and periodIndex = 0', () => {
            const manifest = { Period: [{ AdaptationSet: [{ id: 0 }] }] };
            const adaptation = dashManifestModel.getAdaptationForId(0, manifest, 0);

            expect(adaptation.id).to.equal(0);
        });

        it('should return null when getAdaptationForIndex is called and index, manifest and periodIndex are undefined', () => {
            const adaptation = dashManifestModel.getAdaptationForIndex(undefined, undefined, undefined);

            expect(adaptation).to.be.null;
        });

        it('should return null when getAdaptationForIndex is called and id and periodIndex are undefined', () => {
            const manifest = { Period: [] };
            const adaptation = dashManifestModel.getAdaptationForIndex(undefined, manifest, undefined);

            expect(adaptation).to.be.null;
        });

        it('should return null when getAdaptationForIndex is called and id is undefined', () => {
            const manifest = { Period: [] };
            const adaptation = dashManifestModel.getAdaptationForIndex(undefined, manifest, 2);

            expect(adaptation).to.be.null;
        });

        it('should return null when getAdaptationForIndex is called and id is undefined and periodIndex = 0', () => {
            const manifest = { Period: [{ AdaptationSet: [{ id: 0 }] }] };
            const adaptation = dashManifestModel.getAdaptationForIndex(undefined, manifest, 0);

            expect(adaptation).to.be.null;
        });

        it('should return valid value when getAdaptationForIndex is called and id is 0 and periodIndex = 0', () => {
            const manifest = { Period: [{ AdaptationSet: [{ id: 0 }] }] };
            const adaptation = dashManifestModel.getAdaptationForIndex(0, manifest, 0);

            expect(adaptation.id).to.equal(0);
        });

        it('should return -1 when getIndexForAdaptation is called and adaptation, manifest and periodIndex are undefined', () => {
            const index = dashManifestModel.getIndexForAdaptation(undefined, undefined, undefined);

            expect(index).to.equal(-1);
        });

        it('should return -1 when getIndexForAdaptation is called and manifest and periodIndex are undefined', () => {
            const manifest = { Period: [] };
            var adaptation = mpdHelper.composeAdaptation('video');
            const index = dashManifestModel.getIndexForAdaptation(adaptation, manifest, undefined);

            expect(index).to.equal(-1);
        });

        it('should return -1 when getIndexForAdaptation is called and periodIndex are undefined', () => {
            var adaptation = mpdHelper.composeAdaptation('video');
            const index = dashManifestModel.getIndexForAdaptation(adaptation, undefined, undefined);

            expect(index).to.equal(-1);
        });

        it('should return an empty array when getAdaptationsForType is called and manifest, periodIndex and type are undefined', () => {
            const adaptationsArray = dashManifestModel.getAdaptationsForType();

            expect(adaptationsArray).to.be.instanceOf(Array);
            expect(adaptationsArray).to.be.empty;
        });

        it('should return an empty array when getAdaptationsForType is called and periodIndex and type are undefined', () => {
            const manifest = { Period: [] };
            const adaptationsArray = dashManifestModel.getAdaptationsForType(manifest, undefined, undefined);

            expect(adaptationsArray).to.be.instanceOf(Array);
            expect(adaptationsArray).to.be.empty;
        });

        it('should return an empty array when getAdaptationsForType is called and type is undefined', () => {
            const manifest = { Period: [{ AdaptationSet: [{ id: 0 }] }] };

            expect(dashManifestModel.getAdaptationsForType.bind(dashManifestModel, manifest, 0, undefined)).to.throw('type is not defined');
        });

        it('should return null when getCodec is called and adaptation is undefined', () => {
            const codec = dashManifestModel.getCodec();

            expect(codec).to.be.null;
        });

        it('should return null when getCodec is called and adaptation.Representation is undefined', () => {
            const codec = dashManifestModel.getCodec({});

            expect(codec).to.be.null;
        });

        it('should return null when getCodec is called and adaptation.Representation.length is -1', () => {
            const codec = dashManifestModel.getCodec({ Representation: { length: -1 } });

            expect(codec).to.be.null;
        });

        it('should return null when getCodec is called and representationId is not an integer', () => {
            const codec = dashManifestModel.getCodec({ Representation: { length: 1 } }, true);

            expect(codec).to.be.null;
        });

        it('should return correct codec when getCodec is called and representationId is an integer and addResolutionInfo is true', () => {
            const codec = dashManifestModel.getCodec({
                Representation: [{
                    mimeType: 'video/mp4',
                    codecs: 'avc1.4D400D',
                    width: 1080,
                    height: 960
                }]
            }, 0, true);

            expect(codec).to.be.equal('video/mp4;codecs="avc1.4D400D";width="1080";height="960"');
        });

        it('should return correct codec when getCodec is called and representationId is an integer and addResolutionInfo is false', () => {
            const codec = dashManifestModel.getCodec({
                Representation: [{
                    mimeType: 'video/mp4',
                    codecs: 'avc1.4D400D',
                    width: 1080,
                    height: 960
                }]
            }, 0, false);

            expect(codec).to.be.equal('video/mp4;codecs="avc1.4D400D"');
        });

        it('should return correct codec without a correct mime type profile when getCodec is called and representationId is an integer and addResolutionInfo is false', () => {
            const codec = dashManifestModel.getCodec({
                Representation: [{
                    mimeType: 'video/mp4 profiles="cmfc,cfhd"',
                    codecs: 'avc1.4D400D',
                    width: 1080,
                    height: 960
                }]
            }, 0, false);

            expect(codec).to.be.equal('video/mp4;codecs="avc1.4D400D"');
        });

        it('should return correct codec without an invalid mime type profile when getCodec is called and representationId is an integer and addResolutionInfo is false', () => {
            const codec = dashManifestModel.getCodec({
                Representation: [{
                    mimeType: 'video/mp4 profiles="cmfc,cf',
                    codecs: 'avc1.4D400D',
                    width: 1080,
                    height: 960
                }]
            }, 0, false);

            expect(codec).to.be.equal('video/mp4;codecs="avc1.4D400D"');
        });

        it('should return null when getMimeType is called and adaptation is undefined', () => {
            const mimeType = dashManifestModel.getMimeType();

            expect(mimeType).to.be.null;
        });

        it('should return null when getMimeType is called and adaptation.Representation is undefined', () => {
            const mimeType = dashManifestModel.getMimeType({});

            expect(mimeType).to.be.null;
        });

        it('should return null when getMimeType is called and adaptation.Representation.length is -1', () => {
            const mimeType = dashManifestModel.getMimeType({ Representation: { length: -1 } });

            expect(mimeType).to.be.null;
        });

        it('should return empty array when getLabelsForAdaptation is called and adaptation is undefined', () => {
            const labels = dashManifestModel.getLabelsForAdaptation();

            expect(labels).to.be.instanceOf(Array);
            expect(labels).to.be.empty;
        });

        it('should return empty array when getLabelsForAdaptation is called and adaptation is not well defined', () => {
            const labels = dashManifestModel.getLabelsForAdaptation({});

            expect(labels).to.be.instanceOf(Array);
            expect(labels).to.be.empty;
        });

        it('should return empty array when getLabelsForAdaptation is called and adaptation is not well defined', () => {
            const labels = dashManifestModel.getLabelsForAdaptation({ Label: true });

            expect(labels).to.be.instanceOf(Array);
            expect(labels).to.be.empty;
        });

        it('should return empty array when getLabelsForAdaptation is called and adaptation is well defined with an empty Label', () => {
            const labels = dashManifestModel.getLabelsForAdaptation({ Label: [] });

            expect(labels).to.be.instanceOf(Array);
            expect(labels).to.be.empty;
        });

        it('should return correct array when getLabelsForAdaptation() is called and adaptation is well defined', () => {
            const labels = dashManifestModel.getLabelsForAdaptation({
                Label: [{
                    lang: 'fre',
                    __text: 'french'
                }, { lang: 'eng', __text: 'english' }]
            });

            expect(labels).to.be.instanceOf(Array);
            expect(labels.length).to.equal(2);
            expect(labels[0].lang).to.equal('fre');
        });

        it('should return an empty array when getContentProtectionByAdaptation() is called and adaptation is undefined', () => {
            const contentProtection = dashManifestModel.getContentProtectionByAdaptation();

            expect(contentProtection).to.be.empty;
        });

        it('should return an empty array when getContentProtectionByAdaptation() is called and adaptation is defined, but ContentProtection is an empty array', () => {
            const adaptation = { ContentProtection: [] };
            const contentProtection = dashManifestModel.getContentProtectionByAdaptation(adaptation);

            expect(contentProtection).to.be.empty;
        });

        it('should return an empty array when getContentProtectionByManifest() is called and manifest is undefined', () => {
            const contentProtection = dashManifestModel.getContentProtectionByManifest();

            expect(contentProtection).to.be.empty;
        });

        it('should return an empty array when getContentProtectionByManifest() is called and manifest is defined, but ContentProtection is an empty array', () => {
            const manifest = { ContentProtection: [] };
            const contentProtection = dashManifestModel.getContentProtectionByManifest(manifest);

            expect(contentProtection).to.be.empty;
        });

        it('should return all content protection elements when getContentProtectionByManifest() is called and manifest is defined', () => {
            const manifest = {
                ContentProtection: [{
                    'value': 'manifest_value',
                    'schemeIdUri': 'manifest_scheme'
                }],
                Period: [{
                    ContentProtection: [{
                        'value': 'period_value',
                        'schemeIdUri': 'period_scheme'
                    }, {
                        'value': 'period_value_2',
                        'schemeIdUri': 'period_scheme_2'
                    }],
                    AdaptationSet: [{
                        ContentProtection: [{
                            'value': 'as_value',
                            'schemeIdUri': 'as_scheme'
                        }, {
                            'value': 'as_value_2',
                            'schemeIdUri': 'as_scheme_2'
                        }]
                    }]
                }]
            };
            const contentProtection = dashManifestModel.getContentProtectionByManifest(manifest);

            expect(contentProtection).to.have.lengthOf(5);
        });

        it('should return an empty array when getContentProtectionByPeriod() is called and period is undefined', () => {
            const contentProtection = dashManifestModel.getContentProtectionByPeriod();

            expect(contentProtection).to.be.empty;
        });

        it('should return an empty array when getContentProtectionByPeriod() is called and period is defined, but ContentProtection is an empty array', () => {
            const period = { ContentProtection: [] };
            const contentProtection = dashManifestModel.getContentProtectionByManifest(period);

            expect(contentProtection).to.be.empty;
        });

        it('should return an empty array when getContentProtectionByPeriod() is called and period is defined, but ContentProtection in all child entities is an empty array', () => {
            const period = { ContentProtection: [], AdaptationSet: { ContentProtection: [] } };
            const contentProtection = dashManifestModel.getContentProtectionByManifest(period);

            expect(contentProtection).to.be.empty;
        });

        it('should return all content protection elements when getContentProtectionByPeriod() is called and period is defined', () => {
            const period = {
                ContentProtection: [{
                    'value': 'period_value',
                    'schemeIdUri': 'period_scheme'
                }],
                AdaptationSet: [{
                    ContentProtection: [{
                        'value': 'as_value',
                        'schemeIdUri': 'as_scheme'
                    }, {
                        'value': 'as_value_2',
                        'schemeIdUri': 'as_scheme_2'
                    }]
                }]
            };
            const contentProtection = dashManifestModel.getContentProtectionByPeriod(period);

            expect(contentProtection).to.have.lengthOf(3);
        });

        it('should return true when isPeriodEncrypted() is called and content protection is defined', () => {
            const period = {
                ContentProtection: [{
                    'value': 'period_value',
                    'schemeIdUri': 'period_scheme'
                }],
                AdaptationSet: [{
                    ContentProtection: [{
                        'value': 'as_value',
                        'schemeIdUri': 'as_scheme'
                    }, {
                        'value': 'as_value_2',
                        'schemeIdUri': 'as_scheme_2'
                    }]
                }]
            };
            const contentProtection = dashManifestModel.isPeriodEncrypted(period);

            expect(contentProtection).to.be.true
        });

        it('should return false when isPeriodEncrypted() is called and content protection is empty', () => {
            const period = {
                ContentProtection: [],
                AdaptationSet: [{
                    ContentProtection: []
                }]
            };
            const contentProtection = dashManifestModel.isPeriodEncrypted(period);

            expect(contentProtection).to.be.false
        });

        it('should return false when isPeriodEncrypted() is called and content protection is not defined', () => {
            const period = {
                AdaptationSet: [{}]
            };
            const contentProtection = dashManifestModel.isPeriodEncrypted(period);

            expect(contentProtection).to.be.false
        });

        it('should return false when getIsDynamic is called and manifest is undefined', () => {
            const isDynamic = dashManifestModel.getIsDynamic();

            expect(isDynamic).to.be.false;
        });

        it('should return Number.MAX_SAFE_NUMBER (or Number.MAX_VALUE in case MAX_SAFE_NUMBER is not defined) when getDuration is called and manifest is undefined', () => {
            const duration = dashManifestModel.getDuration();

            expect(duration).to.equal(Number.MAX_SAFE_INTEGER || Number.MAX_VALUE);
        });

        it('should return duration when getDuration is called and manifest has a defined mediaPresentationDuration', () => {
            const duration = dashManifestModel.getDuration({ mediaPresentationDuration: 50 });

            expect(duration).to.equal(50);
        });

        it('should return infinity when getDuration is called and manifest is a dynamic one', () => {
            const duration = dashManifestModel.getDuration({ type: DashConstants.DYNAMIC });

            expect(duration).to.equal(Infinity);
        });

        it('should return 0 when getRepresentationCount is called and adaptation is undefined', () => {
            const representationCount = dashManifestModel.getRepresentationCount();

            expect(representationCount).to.equal(0);
        });

        it('should return NaN when getBandwidth is called and representation is undefined', () => {
            const bdtw = dashManifestModel.getBandwidth();

            expect(bdtw).to.be.NaN;
        });

        it('should return correct value when getBandwidth is called and representation is defined', () => {
            const bdtw = dashManifestModel.getBandwidth({ bandwidth: 9600 });

            expect(bdtw).to.equal(9600);
        });

        it('should return empty array when getBitrateListForAdaptation is called and adaptation is undefined', () => {
            const bitrateList = dashManifestModel.getBitrateListForAdaptation();

            expect(bitrateList).to.be.instanceOf(Array);
            expect(bitrateList).to.be.empty;
        });

        it('should not return empty array when getBitrateListForAdaptation is called and adaptation is defined', () => {
            const realAdaptation = { Representation: [{}] };

            const bitrateList = dashManifestModel.getBitrateListForAdaptation(realAdaptation);

            expect(bitrateList).to.be.instanceOf(Array);
            expect(bitrateList).not.to.be.empty;
        });

        it('should return null when getRepresentationFor is called and index and adaptation are undefined', () => {
            const representation = dashManifestModel.getRepresentationFor();

            expect(representation).to.be.null;
        });

        it('should return null when getRepresentationFor is called and index and andadaptation.Representation are undefined', () => {
            const adaptation = {};
            const representation = dashManifestModel.getRepresentationFor(undefined, adaptation);

            expect(representation).to.be.null;
        });

        it('should return null when getRepresentationFor is called and index is undefined', () => {
            var adaptation = mpdHelper.composeAdaptation('video');
            const representation = dashManifestModel.getRepresentationFor(undefined, adaptation);

            expect(representation).to.be.null;
        });

        it('should return representation.id = video20 when getRepresentationFor is called', () => {
            var adaptation = mpdHelper.composeAdaptation('video');
            const representation = dashManifestModel.getRepresentationFor(0, adaptation);

            expect(representation.id).equal('video20');
        });

        it('should return undefined when getLocation is called and manifest is undefined', () => {
            const location = dashManifestModel.getLocation();

            expect(location).to.be.empty;
        });

        it('should return undefined when getLocation is called and manifest is an empty object', () => {
            const location = dashManifestModel.getLocation({});

            expect(location).to.be.empty;
        });

        it('should return valid location when getLocation is called and manifest is a valid object', () => {
            const location = dashManifestModel.getLocation({ Location: ['location_1'] });

            expect(location[0].url).to.be.equal('location_1');
        });

        it('should return undefined when getPatchLocation is called and manifest is undefined', () => {
            const location = dashManifestModel.getPatchLocation();

            expect(location).to.be.empty;
        });

        it('should return undefined when getPatchLocation is called and one is not present', () => {
            const location = dashManifestModel.getPatchLocation({});

            expect(location).to.be.empty;
        });

        it('should return valid patch location when getLocation is called and manifest contains complex location', () => {
            const patchLocation = {
                __text: 'http://example.com',
                ttl: 60
            };
            const manifest = {
                [DashConstants.PATCH_LOCATION]: patchLocation,
                PatchLocation: [patchLocation]
            };

            const location = dashManifestModel.getPatchLocation(manifest);

            expect(location[0].url).to.equal(patchLocation.__text);
            expect(location[0].ttl).to.equal(patchLocation.ttl * 1000);
        });

        it('should return an empty Array when getUTCTimingSources is called and manifest is undefined', () => {
            const utcSourceArray = dashManifestModel.getUTCTimingSources();

            expect(utcSourceArray).to.be.instanceOf(Array);
            expect(utcSourceArray).to.be.empty;
        });

        it('should return an empty Array when getEventStreamForRepresentation is called and manifest and representation are undefined', () => {
            const eventsStream = dashManifestModel.getEventStreamForRepresentation();

            expect(eventsStream).to.be.instanceOf(Array);
            expect(eventsStream).to.be.empty;
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
                'type': 'static'
            };
            const representation = { adaptation: { index: 0, period: { index: 0 } }, index: 0 };
            const eventsStream = dashManifestModel.getEventStreamForRepresentation(manifest, representation);

            expect(eventsStream).to.be.instanceOf(Array);
            expect(eventsStream).to.be.empty;
        });

        it('should return an empty Array when getEventStreamForAdaptationSet is called and manifest and adaptation are undefined', () => {
            const eventsStream = dashManifestModel.getEventStreamForAdaptationSet();

            expect(eventsStream).to.be.instanceOf(Array);
            expect(eventsStream).to.be.empty;
        });

        it('should return an empty Array when getEventsForPeriod is called and manifest and period are undefined', () => {
            const eventsStream = dashManifestModel.getEventsForPeriod();

            expect(eventsStream).to.be.instanceOf(Array);
            expect(eventsStream).to.be.empty;
        });

        it('should return mpd.manifest = null when getMpd is called and manifest is undefined', () => {
            const mpd = dashManifestModel.getMpd();

            expect(mpd.manifest).to.be.null;
        });

        it('should return mpd.manifest not null when getMpd is called and manifest is defined', () => {
            const mpd = dashManifestModel.getMpd({});

            expect(mpd.manifest).not.to.be.null;
            expect(mpd.manifest.availabilityStartTime).to.be.undefined;
        });

        it('should return an error when getRegularPeriods and getEndTimeForLastPeriod are called and duration is undefined', () => {
            dashManifestModel.getRegularPeriods(mpd_sample);

            expect(errorHandlerMock.errorValue).to.equal('Must have @mediaPresentationDuration on MPD or an explicit @duration on the last period.');
        });

        it('should return an empty array when getRegularPeriods is called and mpd is undefined', () => {
            const periodsArray = dashManifestModel.getRegularPeriods();

            expect(periodsArray).to.be.instanceOf(Array);
            expect(periodsArray).to.be.empty;
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
                    'type': 'static',
                    'mediaPresentationDuration': 300.0
                },
                'maxSegmentDuration': 4.5,
                'mediaPresentationDuration': 300.0
            };

            const periodsArray = dashManifestModel.getRegularPeriods(mpd);

            expect(periodsArray).to.be.instanceOf(Array);
            expect(periodsArray).to.have.lengthOf(1);
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
                    'type': 'static',
                    'mediaPresentationDuration': 320.0
                },
                'maxSegmentDuration': 4.5,
                'mediaPresentationDuration': 320.0
            };
            const periodsArray = dashManifestModel.getRegularPeriods(manifest);

            expect(periodsArray).to.be.instanceOf(Array);
            expect(periodsArray).to.have.lengthOf(3);

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
                    'type': 'static',
                    'mediaPresentationDuration': 300.0
                },
                'maxSegmentDuration': 4.5,
                'mediaPresentationDuration': 300.0
            };
            const periodsArray = dashManifestModel.getRegularPeriods(manifest);

            expect(periodsArray).to.be.instanceOf(Array);
            expect(periodsArray).to.have.lengthOf(3);

            expect(periodsArray[0].start).to.equals(0);
            expect(periodsArray[0].duration).to.equals(80);

            expect(periodsArray[1].start).to.equals(80);
            expect(periodsArray[1].duration).to.equals(40);

            expect(periodsArray[2].start).to.equals(120);
            expect(periodsArray[2].duration).to.equals(180);
        });

        it('should return an empty array when getAdaptationsForPeriod is called and period is undefined', () => {
            const adaptationArray = dashManifestModel.getAdaptationsForPeriod();

            expect(adaptationArray).to.be.instanceOf(Array);
            expect(adaptationArray).to.be.empty;
        });

        it('should not return an empty array when getAdaptationsForPeriod is called and period is defined', () => {
            const period = voHelper.getDummyPeriod();
            const adaptationArray = dashManifestModel.getAdaptationsForPeriod(period);

            expect(adaptationArray).to.be.instanceOf(Array);
            expect(adaptationArray).not.to.be.empty;
            expect(adaptationArray[0].index).to.equals(0);
        });

        it('should return null when getId is called and manifest undefined', () => {
            const id = dashManifestModel.getId();

            expect(id).to.be.null;
        });

        it('should return null when getId is called and manifest is missing id', () => {
            const id = dashManifestModel.getId({});

            expect(id).to.be.null;
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

            expect(IsDVB).to.be.false;
        });

        it('should return true when hasProfile is called and manifest contains a valid DVB profile', () => {
            const manifest = {
                profiles: 'urn:dvb:dash:profile:dvb-dash:2014,urn:dvb:dash:profile:dvb-dash:isoff-ext-live:2014'
            };

            const isDVB = dashManifestModel.hasProfile(manifest, 'urn:dvb:dash:profile:dvb-dash:2014');

            expect(isDVB).to.be.true;
        });

        it('should return false when hasProfile is called and manifest does not contain a valid DVB profile', () => {
            const manifest = {
                profiles: 'urn:mpeg:dash:profile:isoff-on-demand:2011, http://dashif.org/guildelines/dash264'
            };

            const isDVB = dashManifestModel.hasProfile(manifest, 'urn:dvb:dash:profile:dvb-dash:2014');

            expect(isDVB).to.be.false;
        });

        it('should return null when getPublishTime is called and manifest is undefined', () => {
            const publishTime = dashManifestModel.getPublishTime();

            expect(publishTime).to.be.null;
        });

        it('should return valid date object when getPublishTime is called with manifest with valid date', () => {
            const manifest = {
                [DashConstants.PUBLISH_TIME]: '2020-11-11T05:13:19.514676331Z'
            };

            const publishTime = dashManifestModel.getPublishTime(manifest);

            expect(publishTime).to.be.instanceOf(Date);
            expect(publishTime.getTime()).to.not.be.NaN;
        });

        it('should return invalid date object when getPublishTime is called with manifest with invalid date', () => {
            const manifest = {
                [DashConstants.PUBLISH_TIME]: '<invalid-date-time>'
            };

            const publishTime = dashManifestModel.getPublishTime(manifest);

            expect(publishTime).to.be.instanceOf(Date);
            expect(publishTime.getTime()).to.be.NaN;
        });

        it('should return NaN when getManifestUpdatePeriod is called and manifest is undefined', () => {
            const updatePeriod = dashManifestModel.getManifestUpdatePeriod();
            expect(updatePeriod).to.be.NaN;
        });

        it('should return NaN when minimumUpdatePeriod is not present in manifest', () => {
            const manifest = {};
            const updatePeriod = dashManifestModel.getManifestUpdatePeriod(manifest);
            expect(updatePeriod).to.be.NaN;
        });

        it('should return valid value when minimumUpdatePeriod is present in manifest and latencyOfLastUpdate is defined', () => {
            const minimumUpdatePeriod = 30;
            const latencyOfLastUpdate = 0.5;
            const manifest = { minimumUpdatePeriod: minimumUpdatePeriod };
            const expectedResult = minimumUpdatePeriod - latencyOfLastUpdate;
            const updatePeriod = dashManifestModel.getManifestUpdatePeriod(manifest, latencyOfLastUpdate);
            expect(updatePeriod).to.equal(expectedResult);
        });

        it('should return valid value when minimumUpdatePeriod is present in manifest and latencyOfLastUpdate is not defined', () => {
            const minimumUpdatePeriod = 30;
            const manifest = { minimumUpdatePeriod: minimumUpdatePeriod };
            const expectedResult = minimumUpdatePeriod;
            const updatePeriod = dashManifestModel.getManifestUpdatePeriod(manifest);
            expect(updatePeriod).to.equal(expectedResult);
        });

        describe('getBaseUrlsFromElement', () => {
            it('returns an empty Array when no BaseURLs or baseUri are present on a node', () => {
                const node = {};

                const obj = dashManifestModel.getBaseURLsFromElement(node);

                expect(obj).to.be.instanceOf(Array);
                expect(obj).to.be.empty;

            });

            it('returns an Array of BaseURLs when no BaseURLs are present on a node, but there is a baseUri', () => {
                const node = {
                    baseUri: TEST_URL
                };

                const obj = dashManifestModel.getBaseURLsFromElement(node);

                expect(obj).to.be.instanceOf(Array);
                expect(obj).to.have.lengthOf(1);
                expect(obj[0]).to.be.instanceOf(BaseURL);
                expect(obj[0].url).to.equal(TEST_URL);
            });

            it('returns an Array of BaseURLs with BaseURL[0] serviceLocation set to URL when no serviceLocation was specified', () => {
                const node = {
                    BaseURL: [{
                        __text: TEST_URL
                    }]
                };

                const obj = dashManifestModel.getBaseURLsFromElement(node);

                expect(obj).to.be.instanceOf(Array);
                expect(obj).to.have.lengthOf(1);
                expect(obj[0]).to.be.instanceOf(BaseURL);
                expect(obj[0].url).to.equal(TEST_URL);
                expect(obj[0].serviceLocation).to.equal(TEST_URL);
            });

            it('returns an Array of BaseURLs with length 1 when multiple relative BaseUrls were specified', () => {
                const node = {
                    BaseURL: [
                        {
                            __text: RELATIVE_TEST_URL + '0'
                        },
                        {
                            __text: RELATIVE_TEST_URL + '1'
                        }
                    ]
                };

                const obj = dashManifestModel.getBaseURLsFromElement(node);

                expect(obj).to.be.instanceOf(Array);
                expect(obj).to.have.lengthOf(1);
                expect(obj[0]).to.be.instanceOf(BaseURL);
                expect(obj[0].url).to.equal(RELATIVE_TEST_URL + '0');
            });

            it('returns an Array of BaseURLs when multiple BaseUrls were specified', () => {
                const node = {
                    BaseURL: [
                        {
                            __text: TEST_URL + '0'
                        },
                        {
                            __text: TEST_URL + '1'
                        }
                    ]
                };

                const obj = dashManifestModel.getBaseURLsFromElement(node);

                expect(obj).to.be.instanceOf(Array);
                expect(obj).to.have.lengthOf(2);
                obj.forEach((o, i) => {
                    expect(o).to.be.instanceOf(BaseURL);
                    expect(o.url).to.equal(TEST_URL + i);
                });
            });

            it('returns an Array of BaseURLs with BaseURL[0] serviceLocation set when serviceLocation was specified', () => {
                const node = {
                    BaseURL: [{
                        __text: TEST_URL,
                        serviceLocation: SERVICE_LOCATION
                    }]
                };

                const obj = dashManifestModel.getBaseURLsFromElement(node);

                expect(obj).to.be.instanceOf(Array);
                expect(obj).to.have.lengthOf(1);
                expect(obj[0]).to.be.instanceOf(BaseURL);
                expect(obj[0].url).to.equal(TEST_URL);
                expect(obj[0].serviceLocation).to.equal(SERVICE_LOCATION);
            });

            it('returns an Array of BaseURLs with BaseURL[0] having correct defaults for DVB extensions when not specified', () => {
                const node = {
                    BaseURL: [{
                        __text: TEST_URL
                    }]
                };

                const obj = dashManifestModel.getBaseURLsFromElement(node);

                expect(obj).to.be.instanceOf(Array);
                expect(obj).to.have.lengthOf(1);
                expect(obj[0].dvbPriority).to.equal(BaseURL.DEFAULT_DVB_PRIORITY);
                expect(obj[0].dvbWeight).to.equal(BaseURL.DEFAULT_DVB_WEIGHT);
            });

            it('returns an Array of BaseURLs with BaseURL[0] having correct priority and weight for DVB extensions when specified', () => {
                const TEST_PRIORITY = 3;
                const TEST_WEIGHT = 2;
                const node = {
                    BaseURL: [{
                        __text: TEST_URL,
                        'dvb:priority': TEST_PRIORITY,
                        'dvb:weight': TEST_WEIGHT
                    }]
                };

                const obj = dashManifestModel.getBaseURLsFromElement(node);

                expect(obj).to.be.instanceOf(Array);
                expect(obj).to.have.lengthOf(1);
                expect(obj[0].dvbPriority).to.equal(TEST_PRIORITY);
                expect(obj[0].dvbWeight).to.equal(TEST_WEIGHT);
            });

            it('returns an Array of BaseURLs with BaseURL[0] resolved to the document base uri when the base uri is specified and the input url is relative', () => {
                const node = {
                    baseUri: TEST_URL,
                    BaseURL: [{
                        __text: RELATIVE_TEST_URL
                    }]
                };

                const obj = dashManifestModel.getBaseURLsFromElement(node);

                expect(obj).to.be.instanceOf(Array);
                expect(obj).to.have.lengthOf(1);
                expect(obj[0].url).to.equal(TEST_URL + RELATIVE_TEST_URL);
            });

            it('returns an Array of BaseURLs with BaseURL[0] resolved to the document base uri when the base uri is the mpd and the input url is relative', () => {
                const node = {
                    baseUri: TEST_URL + 'example.mpd',
                    BaseURL: [{
                        __text: RELATIVE_TEST_URL
                    }]
                };

                const obj = dashManifestModel.getBaseURLsFromElement(node);

                expect(obj).to.be.instanceOf(Array);
                expect(obj).to.have.lengthOf(1);
                expect(obj[0].url).to.equal(TEST_URL + RELATIVE_TEST_URL);
            });

            it('returns an Array of BaseURLs with BaseURL[0] ignoring the document base uri when the base uri is specified and the input url is absolute', () => {
                const node = {
                    baseUri: TEST_URL,
                    BaseURL: [{
                        __text: TEST_URL
                    }]
                };

                const obj = dashManifestModel.getBaseURLsFromElement(node);

                expect(obj).to.be.instanceOf(Array);
                expect(obj).to.have.lengthOf(1);
                expect(obj[0].url).to.equal(TEST_URL);
            });

            it('returns an Array of BaseURLs with BaseURL[0] resolved to the document base uri when the base uri is specified but no other urls', () => {
                const node = {
                    baseUri: TEST_URL
                };

                const obj = dashManifestModel.getBaseURLsFromElement(node);

                expect(obj).to.be.instanceOf(Array);
                expect(obj).to.have.lengthOf(1);
                expect(obj[0].url).to.equal(TEST_URL);
            });
        });

        describe('getProducerReferenceTimesForAdaptation', () => {
            it('returns an empty Array when no ProducerReferenceTimes are present on a node', () => {
                const node = {};

                const obj = dashManifestModel.getProducerReferenceTimesForAdaptation(node);

                expect(obj).to.be.instanceOf(Array);
                expect(obj).to.be.empty;
            });

            it('returns an empty Array where a single ProducerReferenceTime element on a node has missing mandatory attributes', () => {
                const node = {
                    [DashConstants.PRODUCER_REFERENCE_TIME]: [
                        {
                            [DashConstants.ID]: 4,
                            [DashConstants.WALL_CLOCK_TIME]: '1970-01-01T00:00:00Z'
                            // missing presentationTime
                        }
                    ]
                };

                const obj = dashManifestModel.getProducerReferenceTimesForAdaptation(node);

                expect(obj).to.be.instanceOf(Array);
                expect(obj).to.be.empty;
            });

            it('returns an Array of ProducerReferenceTime elements with mandatory attributes', () => {
                const node = {
                    [DashConstants.PRODUCER_REFERENCE_TIME]: [
                        {
                            [DashConstants.ID]: 4,
                            [DashConstants.WALL_CLOCK_TIME]: '1970-01-01T00:00:04Z',
                            [DashConstants.PRESENTATION_TIME]: 0
                        },
                        {
                            [DashConstants.ID]: 5,
                            [DashConstants.WALL_CLOCK_TIME]: '1970-01-01T00:00:05Z',
                            [DashConstants.PRESENTATION_TIME]: 1
                        }
                    ]
                };
                const obj = dashManifestModel.getProducerReferenceTimesForAdaptation(node);

                /* jshint ignore:start */
                expect(obj).to.be.instanceOf(Array);
                expect(obj).to.have.lengthOf(2);
                expect(obj[0][DashConstants.ID]).to.equal(4);
                expect(obj[0][DashConstants.WALL_CLOCK_TIME]).to.equal('1970-01-01T00:00:04Z');
                expect(obj[0][DashConstants.PRESENTATION_TIME]).to.equal(0);
                expect(obj[1][DashConstants.ID]).to.equal(5);
                expect(obj[1][DashConstants.WALL_CLOCK_TIME]).to.equal('1970-01-01T00:00:05Z');
                expect(obj[1][DashConstants.PRESENTATION_TIME]).to.equal(1);
                /* jshint ignore:end */
            });

            it('returns ProducerReferenceTimes with correct default attribute values', () => {
                const node = {
                    [DashConstants.PRODUCER_REFERENCE_TIME]: [
                        {
                            [DashConstants.ID]: 4,
                            [DashConstants.WALL_CLOCK_TIME]: '1970-01-01T00:00:04Z',
                            [DashConstants.PRESENTATION_TIME]: 0
                        }
                    ]
                };
                const obj = dashManifestModel.getProducerReferenceTimesForAdaptation(node);

                expect(obj).to.be.instanceOf(Array);
                expect(obj).to.have.lengthOf(1);
                expect(obj[0].type).to.equal('encoder');
            });

            it('returns ProducerReferenceTimes within representations', () => {
                const node = {
                    [DashConstants.REPRESENTATION]: [
                        {
                            [DashConstants.PRODUCER_REFERENCE_TIME]: [
                                {
                                    [DashConstants.ID]: 1,
                                    [DashConstants.WALL_CLOCK_TIME]: '1970-01-01T00:00:01Z',
                                    [DashConstants.PRESENTATION_TIME]: 0
                                }
                            ]
                        },
                        {
                            [DashConstants.PRODUCER_REFERENCE_TIME]: [
                                {
                                    [DashConstants.ID]: 2,
                                    [DashConstants.WALL_CLOCK_TIME]: '1970-01-01T00:00:02Z',
                                    [DashConstants.PRESENTATION_TIME]: 1
                                }
                            ]
                        },
                    ]
                };
                const obj = dashManifestModel.getProducerReferenceTimesForAdaptation(node);
                /* jshint ignore:start */
                expect(obj).to.be.instanceOf(Array);
                expect(obj).to.have.lengthOf(2);
                expect(obj[0][DashConstants.ID]).to.equal(1);
                expect(obj[0][DashConstants.WALL_CLOCK_TIME]).to.equal('1970-01-01T00:00:01Z');
                expect(obj[0][DashConstants.PRESENTATION_TIME]).to.equal(0);
                expect(obj[1][DashConstants.ID]).to.equal(2);
                expect(obj[1][DashConstants.WALL_CLOCK_TIME]).to.equal('1970-01-01T00:00:02Z');
                expect(obj[1][DashConstants.PRESENTATION_TIME]).to.equal(1);
                /* jshint ignore:end */

            });

            it('returns ProducerReferenceTimes at both AdaptationSet and Representation level', () => {
                const node = {
                    [DashConstants.PRODUCER_REFERENCE_TIME]: [
                        {
                            [DashConstants.ID]: 1,
                            [DashConstants.WALL_CLOCK_TIME]: '1970-01-01T00:00:01Z',
                            [DashConstants.PRESENTATION_TIME]: 1
                        }
                    ],
                    [DashConstants.REPRESENTATION]: [
                        {
                            [DashConstants.PRODUCER_REFERENCE_TIME]: [
                                {
                                    [DashConstants.ID]: 2,
                                    [DashConstants.WALL_CLOCK_TIME]: '1970-01-01T00:00:02Z',
                                    [DashConstants.PRESENTATION_TIME]: 2
                                }
                            ]
                        }
                    ]
                };
                const obj = dashManifestModel.getProducerReferenceTimesForAdaptation(node);
                /* jshint ignore:start */
                expect(obj).to.be.instanceOf(Array);
                expect(obj).to.have.lengthOf(2);
                expect(obj[0][DashConstants.ID]).to.equal(1);
                expect(obj[0][DashConstants.WALL_CLOCK_TIME]).to.equal('1970-01-01T00:00:01Z');
                expect(obj[0][DashConstants.PRESENTATION_TIME]).to.equal(1);
                expect(obj[1][DashConstants.ID]).to.equal(2);
                expect(obj[1][DashConstants.WALL_CLOCK_TIME]).to.equal('1970-01-01T00:00:02Z');
                expect(obj[1][DashConstants.PRESENTATION_TIME]).to.equal(2);
                /* jshint ignore:end */
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

        describe('getContentSteering', () => {

            it('should return undefined if no manifest is given', () => {
                expect(dashManifestModel.getContentSteering()).to.be.undefined;
            })

            it('should return undefined if manifest is given but no content steering data is present', () => {
                expect(dashManifestModel.getContentSteering({})).to.be.undefined;
            })

            it('should return content steering data from manifest', () => {
                const manifestData = {
                    ContentSteering: [
                        {
                            'defaultServiceLocation': 'beta',
                            'queryBeforeStart': 'true',
                            'clientRequirement': 'false',
                            'proxyServerURL': 'http://someUrl',
                            '__text': 'http://localhost:3333/content-steering'
                        }
                    ]
                }
                const data = dashManifestModel.getContentSteering(manifestData);
                expect(data.defaultServiceLocation).to.be.equal('beta');
                expect(data.queryBeforeStart).to.be.true;
                expect(data.clientRequirement).to.be.false;
                expect(data.serverUrl).to.be.equal('http://localhost:3333/content-steering');
            })

            it('should return first content steering element from manifest if multiple elements are present', () => {
                const manifestData = {
                    ContentSteering: [
                        {
                            'defaultServiceLocation': 'beta',
                            'queryBeforeStart': 'true',
                            'clientRequirement': 'false',
                            '__text': 'http://localhost:3333/content-steering'
                        },
                        {
                            'defaultServiceLocation': 'alpha',
                            'queryBeforeStart': 'false',
                            'clientRequirement': 'true',
                            '__text': 'http://localhost:3333/content-steering/2'
                        }
                    ]
                }
                const data = dashManifestModel.getContentSteering(manifestData);
                expect(data.defaultServiceLocation).to.be.equal('beta');
                expect(data.queryBeforeStart).to.be.true;
                expect(data.clientRequirement).to.be.false;
                expect(data.serverUrl).to.be.equal('http://localhost:3333/content-steering');
            })

        })

        describe('get CMCD data from Manifest', () => {

            it('should return client data reporting from manifest', () => {
                const manifestData = {
                    ServiceDescription: [{
                        'ClientDataReporting': {
                            'CMCDParameters': { schemeIdUri: 'urn:mpeg:dash:cta-5004:2023' },
                            'serviceLocations': 'cdn-a cdn-b',
                            'adaptationSets': 'test1 test2'
                        },
                    }],
                }
                const data = dashManifestModel.getServiceDescriptions(manifestData);
                const clientDataReporting = data[0].clientDataReporting;

                expect(clientDataReporting.cmcdParameters.mode).to.be.equal('query');
                expect(clientDataReporting.cmcdParameters.includeInRequests.length).to.be.equal(1);
                expect(clientDataReporting.cmcdParameters.includeInRequests[0]).to.be.equal('segment');

                expect(clientDataReporting.serviceLocations).to.be.equal('cdn-a cdn-b');
                expect(clientDataReporting.serviceLocationsArray.length).to.be.equal(2);
                expect(clientDataReporting.serviceLocationsArray[0]).to.be.equal('cdn-a');
                expect(clientDataReporting.serviceLocationsArray[1]).to.be.equal('cdn-b');

                expect(clientDataReporting.adaptationSets).to.be.equal('test1 test2');
                expect(clientDataReporting.adaptationSetsArray.length).to.be.equal(2);
                expect(clientDataReporting.adaptationSetsArray[0]).to.be.equal('test1');
                expect(clientDataReporting.adaptationSetsArray[1]).to.be.equal('test2');
            })

            it('should NOT return client data reporting if schemeIdUri is missed in manifest', () => {
                const manifestData = {
                    ServiceDescription: [{
                        'ClientDataReporting': {
                            'CMCDParameters': {},
                            'serviceLocations': 'cdn-a cdn-b',
                            'adaptationSets': 'test1 test2'
                        },
                    }],
                }
                const data = dashManifestModel.getServiceDescriptions(manifestData);
                const clientDataReporting = data[0].clientDataReporting;

                expect(clientDataReporting.cmcdParameters).to.be.null;

                expect(clientDataReporting.serviceLocations).to.be.equal('cdn-a cdn-b');
                expect(clientDataReporting.serviceLocationsArray.length).to.be.equal(2);
                expect(clientDataReporting.serviceLocationsArray[0]).to.be.equal('cdn-a');
                expect(clientDataReporting.serviceLocationsArray[1]).to.be.equal('cdn-b');

                expect(clientDataReporting.adaptationSets).to.be.equal('test1 test2');
                expect(clientDataReporting.adaptationSetsArray.length).to.be.equal(2);
                expect(clientDataReporting.adaptationSetsArray[0]).to.be.equal('test1');
                expect(clientDataReporting.adaptationSetsArray[1]).to.be.equal('test2');
            })

            it('should NOT return client data reporting if schemeIdUri is invalid in manifest', () => {
                const manifestData = {
                    ServiceDescription: [{
                        'ClientDataReporting': {
                            'CMCDParameters': { schemeIdUri: 'urn:mpeg:daaash:ctaa-5003:2003' },
                            'serviceLocations': 'cdn-a cdn-b',
                            'adaptationSets': 'test1 test2'
                        },
                    }],
                }
                const data = dashManifestModel.getServiceDescriptions(manifestData);
                const clientDataReporting = data[0].clientDataReporting;

                expect(clientDataReporting.cmcdParameters).to.be.null;

                expect(clientDataReporting.serviceLocations).to.be.equal('cdn-a cdn-b');
                expect(clientDataReporting.serviceLocationsArray.length).to.be.equal(2);
                expect(clientDataReporting.serviceLocationsArray[0]).to.be.equal('cdn-a');
                expect(clientDataReporting.serviceLocationsArray[1]).to.be.equal('cdn-b');

                expect(clientDataReporting.adaptationSets).to.be.equal('test1 test2');
                expect(clientDataReporting.adaptationSetsArray.length).to.be.equal(2);
                expect(clientDataReporting.adaptationSetsArray[0]).to.be.equal('test1');
                expect(clientDataReporting.adaptationSetsArray[1]).to.be.equal('test2');
            })

            it('should return cmcd data from manifest', () => {
                const contentID = 1;
                const includeInRequests = '*';
                const keys = 'br sid cid';
                const mode = 'query';
                const sessionID = 2;
                const manifestData = {
                    ServiceDescription: [{
                        'ClientDataReporting': {
                            'CMCDParameters': {
                                'contentID': contentID,
                                'includeInRequests': includeInRequests,
                                'keys': keys,
                                'mode': mode,
                                'sessionID': sessionID,
                                'version': 1,
                                'schemeIdUri': 'urn:mpeg:dash:cta-5004:2023'
                            },
                            'serviceLocations': 'cdn-a cdn-b',
                            'adaptationSets': 'test1 test2'
                        },
                    }],
                }
                const data = dashManifestModel.getServiceDescriptions(manifestData);
                const cmcdParameters = data[0].clientDataReporting.cmcdParameters;
                expect(cmcdParameters.contentID).to.be.equal(contentID);
                expect(cmcdParameters.includeInRequests).to.have.length(1);
                expect(cmcdParameters.includeInRequests[0]).to.be.equal(includeInRequests);
                expect(cmcdParameters.keys).to.have.same.members(keys.split(' '));
                expect(cmcdParameters.mode).to.be.equal(mode);
                expect(cmcdParameters.sessionID).to.be.equal(sessionID);
            })

            it('should return client data reporting and cmcd data from manifest', () => {
                const contentID = 1;
                const includeInRequests = '*';
                const keys = 'br sid cid';
                const mode = 'query';
                const sessionID = 2;
                const serviceLocations = 'cdn-a cdn-b';
                const adaptationSets = 'test1 test2';
                const manifestData = {
                    ServiceDescription: [{
                        'ClientDataReporting': {
                            'CMCDParameters': {
                                'contentID': contentID,
                                'includeInRequests': includeInRequests,
                                'keys': keys,
                                'mode': mode,
                                'sessionID': sessionID,
                                'schemeIdUri': 'urn:mpeg:dash:cta-5004:2023'
                            },
                            'serviceLocations': serviceLocations,
                            'adaptationSets': adaptationSets
                        },
                    }],
                }
                const data = dashManifestModel.getServiceDescriptions(manifestData);
                const cmcdParameters = data[0].clientDataReporting.cmcdParameters;
                const clientDataReporting = data[0].clientDataReporting;
                expect(clientDataReporting.serviceLocations).to.be.equal(serviceLocations);
                expect(clientDataReporting.adaptationSets).to.be.equal(adaptationSets);
                expect(cmcdParameters.contentID).to.be.equal(contentID);
                expect(cmcdParameters.includeInRequests).to.have.length(1);
                expect(cmcdParameters.includeInRequests[0]).to.be.equal(includeInRequests);
                expect(cmcdParameters.keys).to.have.same.members(keys.split(' '));
                expect(cmcdParameters.mode).to.be.equal(mode);
                expect(cmcdParameters.sessionID).to.be.equal(sessionID);
            })

        })

        describe('getFramerate()', () => {

            it('Should be null when no Representation is provided', () => {
                const framerate = dashManifestModel.getFramerate();
                expect(framerate).to.be.null;
            })

            it('Should be null when not defined', () => {
                const framerate = dashManifestModel.getFramerate({});
                expect(framerate).to.be.null;
            })

            it('Should parse single integer', () => {
                const framerate = dashManifestModel.getFramerate({frameRate: '24'});
                expect(framerate).to.be.equal(24);
            })

            it('Should parse two separated Integers', () => {
                const framerate = dashManifestModel.getFramerate({frameRate: '48/2'});
                expect(framerate).to.be.equal(24);
            })
        })
    });
});
