import CapabilitiesFilter from '../../src/streaming/utils/CapabilitiesFilter';
import AdapterMock from './mocks/AdapterMock';
import CapabilitiesMock from './mocks/CapabilitiesMock';
import Settings from '../../src/core/Settings';

const expect = require('chai').expect;

let adapterMock;
let capabilitiesFilter;
let settings;
let capabilitiesMock;

describe('CapabilitiesFilter', function () {


    beforeEach(function () {
        adapterMock = new AdapterMock();
        settings = Settings({}).getInstance();
        capabilitiesMock = new CapabilitiesMock();
        capabilitiesFilter = CapabilitiesFilter({}).getInstance();
        capabilitiesFilter.setConfig({
            adapter: adapterMock,
            capabilities: capabilitiesMock,
            settings: settings
        });
    });

    describe('filterUnsupportedFeaturesOfPeriod', function () {

        describe('filter codecs', function () {

            beforeEach(function () {
                settings.update({ streaming: { filterUnsupportedEssentialProperties: false } });
            });

            it('should not filter AdaptationSets and Representations', function () {
                const periodAsArray = {
                    AdaptationSet_asArray: [{
                        mimeType: 'audio/mp4',
                        Representation_asArray: [
                            {
                                mimeType: 'audio/mp4',
                                codecs: 'mp4a.40.2',
                                audioSamplingRate: '48000'
                            },
                            {
                                mimeType: 'audio/mp4',
                                codecs: 'mp4a.40.2',
                                audioSamplingRate: '48000'
                            }
                        ]
                    }]
                };
                const streamInfo = { index: 0 };

                prepareAdapterMock(periodAsArray);
                capabilitiesFilter.filterUnsupportedFeaturesOfPeriod(streamInfo);

                expect(periodAsArray.AdaptationSet_asArray).to.have.lengthOf(1);
                expect(periodAsArray.AdaptationSet_asArray[0].Representation_asArray).to.have.lengthOf(2);

            });

            it('should filter AdaptationSets', function () {
                const periodAsArray = {
                    AdaptationSet_asArray: [{
                        mimeType: 'audio/mp4',
                        Representation_asArray: [
                            {
                                mimeType: 'audio/mp4',
                                codecs: 'mp4a.40.2',
                                audioSamplingRate: '48000'
                            },
                            {
                                mimeType: 'audio/mp4',
                                codecs: 'mp4a.40.2',
                                audioSamplingRate: '48000'
                            }
                        ]
                    }]
                };
                const streamInfo = { index: 0 };

                prepareAdapterMock(periodAsArray);
                prepareCapabilitiesMock({
                    name: 'supportsCodec', definition: function () {
                        return false;
                    }
                });
                capabilitiesFilter.filterUnsupportedFeaturesOfPeriod(streamInfo);

                expect(periodAsArray.AdaptationSet_asArray).to.have.lengthOf(0);
            });

            it('should filter Representations', function () {
                const periodAsArray = {
                    AdaptationSet_asArray: [{
                        mimeType: 'audio/mp4',
                        Representation_asArray: [
                            {
                                mimeType: 'audio/mp4',
                                codecs: 'mp4a.40.1',
                                audioSamplingRate: '48000'
                            },
                            {
                                mimeType: 'audio/mp4',
                                codecs: 'mp4a.40.2',
                                audioSamplingRate: '48000'
                            }
                        ]
                    }]
                };
                const streamInfo = { index: 0 };

                prepareAdapterMock(periodAsArray);
                prepareCapabilitiesMock({
                    name: 'supportsCodec', definition: function (codec) {
                        return codec === 'audio/mp4;codecs="mp4a.40.2"';
                    }
                });
                capabilitiesFilter.filterUnsupportedFeaturesOfPeriod(streamInfo);

                expect(periodAsArray.AdaptationSet_asArray).to.have.lengthOf(1);
                expect(periodAsArray.AdaptationSet_asArray[0].Representation_asArray).to.have.lengthOf(1);

            });
        });

        describe('filter EssentialProperty values', function () {

            beforeEach(function () {
                settings.update({ streaming: { filterUnsupportedEssentialProperties: true } });
            });

            it('should not filter AdaptationSets and Representations if filterUnsupportedEssentialProperties is disabled', function () {
                settings.update({ streaming: { filterUnsupportedEssentialProperties: false } });
                const periodAsArray = {
                    AdaptationSet_asArray: [{
                        mimeType: 'audio/mp4',
                        Representation_asArray: [
                            {
                                mimeType: 'audio/mp4',
                                codecs: 'mp4a.40.2',
                                audioSamplingRate: '48000',
                                EssentialProperty_asArray: [{
                                    schemeIdUri: 'http://dashif.org/thumbnail_tile',
                                    value: 'somevalue'
                                }]
                            },
                            {
                                mimeType: 'audio/mp4',
                                codecs: 'mp4a.40.2',
                                audioSamplingRate: '48000',
                                EssentialProperty_asArray: [{
                                    schemeIdUri: 'http://dashif.org/thumbnail_tile',
                                    value: 'somevalue'
                                }]
                            }
                        ]
                    }]
                };
                const streamInfo = { index: 0 };

                prepareAdapterMock(periodAsArray);
                prepareCapabilitiesMock({
                    name: 'supportsEssentialProperty', definition: function () {
                        return true;
                    }
                });
                capabilitiesFilter.filterUnsupportedFeaturesOfPeriod(streamInfo);

                expect(periodAsArray.AdaptationSet_asArray).to.have.lengthOf(1);
                expect(periodAsArray.AdaptationSet_asArray[0].Representation_asArray).to.have.lengthOf(2);
            });

            it('should not filter AdaptationSets and Representations if EssentialProperties value is supported', function () {
                const periodAsArray = {
                    AdaptationSet_asArray: [{
                        mimeType: 'audio/mp4',
                        Representation_asArray: [
                            {
                                mimeType: 'audio/mp4',
                                codecs: 'mp4a.40.2',
                                audioSamplingRate: '48000',
                                EssentialProperty_asArray: [{
                                    schemeIdUri: 'http://dashif.org/thumbnail_tile',
                                    value: 'somevalue'
                                }]
                            },
                            {
                                mimeType: 'audio/mp4',
                                codecs: 'mp4a.40.2',
                                audioSamplingRate: '48000',
                                EssentialProperty_asArray: [{
                                    schemeIdUri: 'http://dashif.org/thumbnail_tile',
                                    value: 'somevalue'
                                }]
                            }
                        ]
                    }]
                };
                const streamInfo = { index: 0 };

                prepareAdapterMock(periodAsArray);
                prepareCapabilitiesMock({
                    name: 'supportsEssentialProperty', definition: function () {
                        return true;
                    }
                });
                capabilitiesFilter.filterUnsupportedFeaturesOfPeriod(streamInfo);

                expect(periodAsArray.AdaptationSet_asArray).to.have.lengthOf(1);
                expect(periodAsArray.AdaptationSet_asArray[0].Representation_asArray).to.have.lengthOf(2);
            });

            it('should filter AdaptationSets if EssentialProperty value is not supported', function () {
                const periodAsArray = {
                    AdaptationSet_asArray: [{
                        mimeType: 'audio/mp4',
                        Representation_asArray: [
                            {
                                mimeType: 'audio/mp4',
                                codecs: 'mp4a.40.2',
                                audioSamplingRate: '48000',
                                EssentialProperty_asArray: [{
                                    schemeIdUri: 'http://dashif.org/thumbnail_tile',
                                    value: 'somevalue'
                                }]
                            },
                            {
                                mimeType: 'audio/mp4',
                                codecs: 'mp4a.40.2',
                                audioSamplingRate: '48000',
                                EssentialProperty_asArray: [{
                                    schemeIdUri: 'http://dashif.org/thumbnail_tile',
                                    value: 'somevalue'
                                }]
                            }
                        ]
                    }]
                };
                const streamInfo = { index: 0 };

                prepareAdapterMock(periodAsArray);
                prepareCapabilitiesMock({
                    name: 'supportsEssentialProperty', definition: function () {
                        return false;
                    }
                });
                capabilitiesFilter.filterUnsupportedFeaturesOfPeriod(streamInfo);

                expect(periodAsArray.AdaptationSet_asArray).to.have.lengthOf(0);
            });

            it('should filter a single Representation if EssentialProperty value is not supported', function () {
                const periodAsArray = {
                    AdaptationSet_asArray: [{
                        mimeType: 'audio/mp4',
                        Representation_asArray: [
                            {
                                mimeType: 'audio/mp4',
                                codecs: 'mp4a.40.2',
                                audioSamplingRate: '48000',
                                EssentialProperty_asArray: [{
                                    schemeIdUri: 'http://dashif.org/thumbnail_tile',
                                    value: 'somevalue'
                                }]
                            },
                            {
                                mimeType: 'audio/mp4',
                                codecs: 'mp4a.40.2',
                                audioSamplingRate: '48000'
                            }
                        ]
                    }]
                };
                const streamInfo = { index: 0 };

                prepareAdapterMock(periodAsArray);
                prepareCapabilitiesMock({
                    name: 'supportsEssentialProperty', definition: function () {
                        return false;
                    }
                });
                capabilitiesFilter.filterUnsupportedFeaturesOfPeriod(streamInfo);

                expect(periodAsArray.AdaptationSet_asArray).to.have.lengthOf(1);
                expect(periodAsArray.AdaptationSet_asArray[0].Representation_asArray).to.have.lengthOf(1);
            });
        });

        describe('custom filters', function () {

            it('should use provided custom filters', function () {
                const periodAsArray = {
                    AdaptationSet_asArray: [{
                        mimeType: 'video/mp4',
                        Representation_asArray: [
                            {
                                mimeType: 'video/mp4',
                                height: 1080
                            },
                            {
                                mimeType: 'video/mp4',
                                height: 720
                            },
                            {
                                mimeType: 'video/mp4',
                                height: 480
                            }
                        ]
                    }]
                };
                const streamInfo = { index: 0 };

                prepareAdapterMock(periodAsArray);
                capabilitiesFilter.setCustomCapabilitiesFilters([function (representation) {
                    return representation.height <= 720;
                }]);
                capabilitiesFilter.filterUnsupportedFeaturesOfPeriod(streamInfo);

                expect(periodAsArray.AdaptationSet_asArray).to.have.lengthOf(1);
                expect(periodAsArray.AdaptationSet_asArray[0].Representation_asArray).to.have.lengthOf(2);
            });
        });


    });
});

function prepareAdapterMock(periodAsArray) {
    adapterMock.getRealPeriodByIndex = function () {
        return periodAsArray;
    };
}

function prepareCapabilitiesMock(data) {
    capabilitiesMock[data.name] = data.definition;
}
