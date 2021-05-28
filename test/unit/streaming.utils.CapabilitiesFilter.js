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
        adapterMock.getIsTypeOf = function (as, type) {
            return type === 'audio' && as.mimeType === 'audio/mp4';
        };

        settings = Settings({}).getInstance();
        capabilitiesMock = new CapabilitiesMock();

        capabilitiesFilter = CapabilitiesFilter({}).getInstance();
        capabilitiesFilter.setConfig({
            adapter: adapterMock,
            capabilities: capabilitiesMock,
            settings: settings
        });
    });

    describe('filterUnsupportedFeatures', function () {

        describe('filter codecs', function () {

            beforeEach(function () {
                settings.update({ streaming: { capabilities: { filterUnsupportedEssentialProperties: false } } });
            });

            it('should not filter AdaptationSets and Representations', function (done) {
                const manifest = {
                    Period_asArray: [{
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
                    }]
                };

                capabilitiesFilter.filterUnsupportedFeatures(manifest)
                    .then(() => {
                        expect(manifest.Period_asArray[0].AdaptationSet_asArray).to.have.lengthOf(1);
                        expect(manifest.Period_asArray[0].AdaptationSet_asArray[0].Representation_asArray).to.have.lengthOf(2);
                        done();
                    })
                    .catch((e) => {
                        done(e);
                    });

            });

            it('should filter AdaptationSets', function (done) {
                const manifest = {
                    Period_asArray: [{
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
                    }]
                };

                prepareCapabilitiesMock({
                    name: 'supportsCodec', definition: function () {
                        return false;
                    }
                });
                capabilitiesFilter.filterUnsupportedFeatures(manifest)
                    .then(() => {
                        expect(manifest.Period_asArray[0].AdaptationSet_asArray).to.have.lengthOf(0);
                        done();
                    })
                    .catch((e) => {
                        done(e);
                    });
            });

            it('should filter Representations', function (done) {
                const manifest = {
                    Period_asArray: [{
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
                    }]
                };

                prepareCapabilitiesMock({
                    name: 'supportsCodec', definition: function (config) {
                        return config.codec === 'audio/mp4;codecs="mp4a.40.2"';
                    }
                });

                capabilitiesFilter.filterUnsupportedFeatures(manifest)
                    .then(() => {
                        expect(manifest.Period_asArray[0].AdaptationSet_asArray).to.have.lengthOf(1);
                        expect(manifest.Period_asArray[0].AdaptationSet_asArray[0].Representation_asArray).to.have.lengthOf(1);
                        done();
                    })
                    .catch((e) => {
                        done(e);
                    });
            });
        });

        describe('filter EssentialProperty values', function () {

            beforeEach(function () {
                settings.update({ streaming: { capabilities: { filterUnsupportedEssentialProperties: true }} });
            });

            it('should not filter AdaptationSets and Representations if filterUnsupportedEssentialProperties is disabled', function (done) {
                settings.update({ streaming: { capabilities: {filterUnsupportedEssentialProperties: false }} });
                const manifest = {
                    Period_asArray: [{
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
                    }]
                };

                prepareCapabilitiesMock({
                    name: 'supportsEssentialProperty', definition: function () {
                        return true;
                    }
                });

                capabilitiesFilter.filterUnsupportedFeatures(manifest)
                    .then(() => {
                        expect(manifest.Period_asArray[0].AdaptationSet_asArray).to.have.lengthOf(1);
                        expect(manifest.Period_asArray[0].AdaptationSet_asArray[0].Representation_asArray).to.have.lengthOf(2);
                        done();
                    })
                    .catch((e) => {
                        done(e);
                    });

            });

            it('should not filter AdaptationSets and Representations if EssentialProperties value is supported', function (done) {
                const manifest = {
                    Period_asArray: [{
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
                    }]
                };
                prepareCapabilitiesMock({
                    name: 'supportsEssentialProperty', definition: function () {
                        return true;
                    }
                });

                capabilitiesFilter.filterUnsupportedFeatures(manifest)
                    .then(() => {
                        expect(manifest.Period_asArray[0].AdaptationSet_asArray).to.have.lengthOf(1);
                        expect(manifest.Period_asArray[0].AdaptationSet_asArray[0].Representation_asArray).to.have.lengthOf(2);
                        done();
                    })
                    .catch((e) => {
                        done(e);
                    });

            });

            it('should filter AdaptationSets if EssentialProperty value is not supported', function (done) {
                const manifest = {
                    Period_asArray: [{
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
                    }]
                };

                prepareCapabilitiesMock({
                    name: 'supportsEssentialProperty', definition: function () {
                        return false;
                    }
                });
                capabilitiesFilter.filterUnsupportedFeatures(manifest)
                    .then(() => {
                        expect(manifest.Period_asArray[0].AdaptationSet_asArray).to.have.lengthOf(0);
                        done();
                    })
                    .catch((e) => {
                        done(e);
                    });


            });

            it('should filter a single Representation if EssentialProperty value is not supported', function (done) {
                const manifest = {
                    Period_asArray: [{
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
                    }]
                };

                prepareCapabilitiesMock({
                    name: 'supportsEssentialProperty', definition: function () {
                        return false;
                    }
                });
                capabilitiesFilter.filterUnsupportedFeatures(manifest)
                    .then(() => {
                        expect(manifest.Period_asArray[0].AdaptationSet_asArray).to.have.lengthOf(1);
                        expect(manifest.Period_asArray[0].AdaptationSet_asArray[0].Representation_asArray).to.have.lengthOf(1);
                        done();
                    })
                    .catch((e) => {
                        done(e);
                    });
            });
        });

        describe('custom filters', function () {

            it('should use provided custom filters', function (done) {
                const manifest = {
                    Period_asArray: [{
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
                    }]
                };

                capabilitiesFilter.setCustomCapabilitiesFilters([function (representation) {
                    return representation.height <= 720;
                }]);

                capabilitiesFilter.filterUnsupportedFeatures(manifest)
                    .then(() => {
                        expect(manifest.Period_asArray[0].AdaptationSet_asArray).to.have.lengthOf(1);
                        expect(manifest.Period_asArray[0].AdaptationSet_asArray[0].Representation_asArray).to.have.lengthOf(2);
                        done();
                    })
                    .catch((e) => {
                        done(e);
                    });


            });
        });


    });
});

function prepareCapabilitiesMock(data) {
    capabilitiesMock[data.name] = data.definition;
}
