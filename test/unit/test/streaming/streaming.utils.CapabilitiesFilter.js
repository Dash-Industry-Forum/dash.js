import CapabilitiesFilter from '../../../../src/streaming/utils/CapabilitiesFilter.js';
import AdapterMock from '../../mocks/AdapterMock.js';
import CapabilitiesMock from '../../mocks/CapabilitiesMock.js';
import Settings from '../../../../src/core/Settings.js';
import CustomParametersModel from '../../../../src/streaming/models/CustomParametersModel.js';

import {expect} from 'chai';

let adapterMock;
let capabilitiesFilter;
let settings;
let capabilitiesMock;
let customParametersModel = CustomParametersModel({}).getInstance();

describe('CapabilitiesFilter', function () {
    beforeEach(function () {
        adapterMock = new AdapterMock();
        adapterMock.getIsTypeOf = function (as, type) {
            return (type === 'audio' && as.mimeType === 'audio/mp4') || (type === 'video' && as.mimeType === 'video/mp4');
        };

        settings = Settings({}).getInstance();
        capabilitiesMock = new CapabilitiesMock();
        customParametersModel.reset();

        capabilitiesFilter = CapabilitiesFilter({}).getInstance();

        capabilitiesFilter.setConfig({
            adapter: adapterMock,
            capabilities: capabilitiesMock,
            settings: settings,
            customParametersModel
        });
    });

    describe('filterUnsupportedFeatures', function () {

        describe('filter codecs', function () {

            beforeEach(function () {
                settings.update({ streaming: { capabilities: { filterUnsupportedEssentialProperties: false } } });
            });

            it('should not filter AdaptationSets and Representations', function (done) {
                const manifest = {
                    Period: [{
                        AdaptationSet: [{
                            mimeType: 'audio/mp4',
                            Representation: [
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
                        expect(manifest.Period[0].AdaptationSet).to.have.lengthOf(1);
                        expect(manifest.Period[0].AdaptationSet[0].Representation).to.have.lengthOf(2);
                        done();
                    })
                    .catch((e) => {
                        done(e);
                    });

            });

            it('should filter AdaptationSets', function (done) {
                const manifest = {
                    Period: [{
                        AdaptationSet: [{
                            mimeType: 'audio/mp4',
                            Representation: [
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
                    name: 'isCodecSupportedBasedOnTestedConfigurations', definition: function () {
                        return false;
                    }
                });

                capabilitiesFilter.filterUnsupportedFeatures(manifest)
                    .then(() => {
                        expect(manifest.Period[0].AdaptationSet).to.have.lengthOf(0);
                        done();
                    })
                    .catch((e) => {
                        done(e);
                    });
            });

            it('should filter Representations', function (done) {
                const manifest = {
                    Period: [{
                        AdaptationSet: [{
                            mimeType: 'audio/mp4',
                            Representation: [
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
                    name: 'isCodecSupportedBasedOnTestedConfigurations', definition: function (config) {
                        return config.codec === 'audio/mp4;codecs="mp4a.40.2"';
                    }
                });

                capabilitiesFilter.filterUnsupportedFeatures(manifest)
                    .then(() => {
                        expect(manifest.Period[0].AdaptationSet).to.have.lengthOf(1);
                        expect(manifest.Period[0].AdaptationSet[0].Representation).to.have.lengthOf(1);
                        done();
                    })
                    .catch((e) => {
                        done(e);
                    });
            });

            it('should filter Representations with unsupported main codec and unsupported supplemental codec', function (done) {
                const manifest = {
                    Period: [{
                        AdaptationSet: [{
                            mimeType: 'audio/mp4',
                            Representation: [
                                {
                                    mimeType: 'audio/mp4',
                                    codecs: 'mp4a.40.1',
                                    audioSamplingRate: '48000',
                                    'scte214:supplementalCodecs': 'dvh1.08.01'
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
                    name: 'isCodecSupportedBasedOnTestedConfigurations', definition: function (config) {
                        return config.codec === 'audio/mp4;codecs="mp4a.40.2"';
                    }
                });

                capabilitiesFilter.filterUnsupportedFeatures(manifest)
                    .then(() => {
                        expect(manifest.Period[0].AdaptationSet).to.have.lengthOf(1);
                        expect(manifest.Period[0].AdaptationSet[0].Representation).to.have.lengthOf(1);
                        done();
                    })
                    .catch((e) => {
                        done(e);
                    });
            });

            it('should keep Representations with unsupported main codec but supported supplemental codec', function (done) {
                const manifest = {
                    Period: [{
                        AdaptationSet: [{
                            mimeType: 'audio/mp4',
                            Representation: [
                                {
                                    mimeType: 'audio/mp4',
                                    codecs: 'mp4a.40.1',
                                    audioSamplingRate: '48000',
                                    'scte214:supplementalCodecs': 'dvh1.08.01'
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
                    name: 'isCodecSupportedBasedOnTestedConfigurations', definition: function (config) {
                        return config.codec === 'audio/mp4;codecs="mp4a.40.2"' || config.codec === 'audio/mp4;codecs="dvh1.08.01"';
                    }
                });

                capabilitiesFilter.filterUnsupportedFeatures(manifest)
                    .then(() => {
                        expect(manifest.Period[0].AdaptationSet).to.have.lengthOf(1);
                        expect(manifest.Period[0].AdaptationSet[0].Representation).to.have.lengthOf(2);
                        expect(manifest.Period[0].AdaptationSet[0].Representation[0].codecs).to.be.equal(manifest.Period[0].AdaptationSet[0].Representation[0]['scte214:supplementalCodecs']);
                        done();
                    })
                    .catch((e) => {
                        done(e);
                    });
            });

            it('should keep Representations with supported main codec but unsupported supplemental codec', function (done) {
                const manifest = {
                    Period: [{
                        AdaptationSet: [{
                            mimeType: 'audio/mp4',
                            Representation: [
                                {
                                    mimeType: 'audio/mp4',
                                    codecs: 'mp4a.40.1',
                                    audioSamplingRate: '48000',
                                    'scte214:supplementalCodecs': 'dvh1.08.01'
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
                    name: 'isCodecSupportedBasedOnTestedConfigurations', definition: function (config) {
                        return config.codec === 'audio/mp4;codecs="mp4a.40.2"' || config.codec === 'audio/mp4;codecs="mp4a.40.1"';
                    }
                });

                capabilitiesFilter.filterUnsupportedFeatures(manifest)
                    .then(() => {
                        expect(manifest.Period[0].AdaptationSet).to.have.lengthOf(1);
                        expect(manifest.Period[0].AdaptationSet[0].Representation).to.have.lengthOf(2);
                        done();
                    })
                    .catch((e) => {
                        done(e);
                    });
            });

            it('should filter AdaptationSets with preselection override', function (done) {
                const manifest = {
                    Period: [{
                        Preselection: [
                            {
                                id: '10',
                                codecs: 'iamf.000.000.mp4a.40.2',
                                preselectionComponents: '1',
                                tagName: 'Preselection',
                            },
                            {
                                id: '11',
                                codecs: 'iamf.000.001.mp4a.40.2',
                                preselectionComponents: '2',
                                tagName: 'Preselection',
                            },
                        ],
                        AdaptationSet: [
                            {
                                id: '1',
                                mimeType: 'audio/mp4',
                                Representation: [
                                    {
                                        mimeType: 'audio/mp4',
                                        codecs: 'mp4a.40.2',
                                        audioSamplingRate: '48000',
                                        AudioChannelConfiguration: [
                                            {
                                                schemeIdUri: 'urn:mpeg:mpegB:cicp:ChannelConfiguration',
                                                value: 6
                                            }
                                        ],
                                    }
                                ],
                                EssentialProperty: [ { schemeIdUri: 'urn:mpeg:dash:preselection:2016' } ],
                            },
                            {
                                id: '2',
                                mimeType: 'audio/mp4',
                                Representation: [
                                    {
                                        mimeType: 'audio/mp4',
                                        codecs: 'mp4a.40.2',
                                        audioSamplingRate: '48000',
                                        AudioChannelConfiguration: [
                                            {
                                                schemeIdUri: 'urn:mpeg:mpegB:cicp:ChannelConfiguration',
                                                value: 6
                                            }
                                        ],
                                    }
                                ],
                                EssentialProperty: [ { schemeIdUri: 'urn:mpeg:dash:preselection:2016' } ],
                            }
                        ]
                    }]
                };

                settings.update({ streaming: { capabilities: { filterAudioChannelConfiguration: true } } });

                prepareCapabilitiesMock({
                    name: 'isCodecSupportedBasedOnTestedConfigurations', definition: function (config) {
                        console.log('CONFIG', JSON.stringify(config))
                        return config.contentType == 'audio/mp4;codecs="iamf.000.000.mp4a.40.2"';
                    }
                });

                capabilitiesFilter.filterUnsupportedFeatures(manifest)
                    .then(() => {
                        expect(manifest.Period[0].Preselection).to.have.lengthOf(2);
                        expect(manifest.Period[0].Preselection[0].id).to.be.equal('10');
                        expect(manifest.Period[0].Preselection[1].id).to.be.equal('11');
                        expect(manifest.Period[0].AdaptationSet).to.have.lengthOf(1);
                        expect(manifest.Period[0].AdaptationSetp[0].id).to.be.equal(1);
                        done();
                    })
                    .catch((e) => {
                        done(e);
                    });

            });

        });

        describe('filter codecs using codec properties', function () {

            it('should filter AdaptationSets, ignoring channels', function (done) {
                const manifest = {
                    Period: [{
                        AdaptationSet: [{
                            mimeType: 'audio/mp4',
                            Representation: [
                                {
                                    mimeType: 'audio/mp4',
                                    codecs: 'mp4a.40.2',
                                    audioSamplingRate: '48000',
                                    AudioChannelConfiguration: [
                                        {
                                            schemeIdUri: 'urn:mpeg:dash:23003:3:audio_channel_configuration:2011',
                                            value: '2'
                                        }
                                    ]
                                }
                            ]
                        }, {
                            mimeType: 'audio/mp4',
                            Representation: [
                                {
                                    mimeType: 'audio/mp4',
                                    codecs: 'mp4a.40.2',
                                    audioSamplingRate: '48000',
                                    AudioChannelConfiguration: [
                                        {
                                            schemeIdUri: 'urn:mpeg:dash:23003:3:audio_channel_configuration:2011',
                                            value: '6'
                                        }
                                    ]
                                }
                            ]
                        }]
                    }]
                };

                settings.update({ streaming: { capabilities: { filterAudioChannelConfiguration: false } } });

                prepareCapabilitiesMock({
                    name: 'isCodecSupportedBasedOnTestedConfigurations', definition: function (config) {
                        return config.channels === undefined;
                    }
                });

                capabilitiesFilter.filterUnsupportedFeatures(manifest)
                    .then(() => {
                        expect(manifest.Period[0].AdaptationSet).to.have.lengthOf(2);
                        expect(manifest.Period[0].AdaptationSet[0].Representation).to.have.lengthOf(1);
                        expect(manifest.Period[0].AdaptationSet[1].Representation).to.have.lengthOf(1);
                        done();
                    })
                    .catch((e) => {
                        done(e);
                    });

            });

            it('should filter AdaptationSets, using channels', function (done) {
                const manifest = {
                    Period: [{
                        AdaptationSet: [{
                            mimeType: 'audio/mp4',
                            Representation: [
                                {
                                    mimeType: 'audio/mp4',
                                    codecs: 'mp4a.40.2',
                                    audioSamplingRate: '48000',
                                    AudioChannelConfiguration: [
                                        {
                                            schemeIdUri: 'urn:mpeg:dash:23003:3:audio_channel_configuration:2011',
                                            value: 2
                                        }
                                    ]
                                }
                            ]
                        }, {
                            mimeType: 'audio/mp4',
                            Representation: [
                                {
                                    mimeType: 'audio/mp4',
                                    codecs: 'mp4a.40.2',
                                    audioSamplingRate: '48000',
                                    AudioChannelConfiguration: [
                                        {
                                            schemeIdUri: 'urn:mpeg:dash:23003:3:audio_channel_configuration:2011',
                                            value: 6
                                        }
                                    ]
                                }
                            ]
                        }]
                    }]
                };

                settings.update({ streaming: { capabilities: { filterAudioChannelConfiguration: true } } });

                prepareCapabilitiesMock({
                    name: 'isCodecSupportedBasedOnTestedConfigurations', definition: function (config) {
                        return config.channels === 2;
                    }
                });

                capabilitiesFilter.filterUnsupportedFeatures(manifest)
                    .then(() => {
                        expect(manifest.Period[0].AdaptationSet).to.have.lengthOf(1);
                        expect(manifest.Period[0].AdaptationSet[0].Representation).to.have.lengthOf(1);
                        done();
                    })
                    .catch((e) => {
                        done(e);
                    });

            });

            it('should filter AdaptationSets, using channels but missing AudioChannelConfiguration', function (done) {
                const manifest = {
                    Period: [{
                        AdaptationSet: [{
                            mimeType: 'audio/mp4',
                            Representation: [
                                {
                                    mimeType: 'audio/mp4',
                                    codecs: 'mp4a.40.2',
                                    audioSamplingRate: '48000',
                                }
                            ]
                        }]
                    }]
                };

                settings.update({ streaming: { capabilities: { filterAudioChannelConfiguration: true } } });

                prepareCapabilitiesMock({
                    name: 'isCodecSupportedBasedOnTestedConfigurations', definition: function (config) {
                        return config.channel === undefined;
                    }
                });

                capabilitiesFilter.filterUnsupportedFeatures(manifest)
                    .then(() => {
                        expect(manifest.Period[0].AdaptationSet).to.have.lengthOf(1);
                        expect(manifest.Period[0].AdaptationSet[0].Representation).to.have.lengthOf(1);
                        done();
                    })
                    .catch((e) => {
                        done(e);
                    });

            });

            it('should filter AdaptationSets, using consistent channel configurations', function (done) {
                const manifest = {
                    Period: [{
                        AdaptationSet: [{
                            mimeType: 'audio/mp4',
                            Representation: [
                                {
                                    mimeType: 'audio/mp4',
                                    codecs: 'mp4a.40.2',
                                    audioSamplingRate: '48000',
                                    AudioChannelConfiguration: [
                                        {
                                            schemeIdUri: 'urn:mpeg:dash:23003:3:audio_channel_configuration:2011',
                                            value: 2
                                        },
                                        {
                                            schemeIdUri: 'urn:mpeg:mpegB:cicp:ChannelConfiguration',
                                            value: 2
                                        }
                                    ]
                                }
                            ]
                        }]
                    }]
                };

                settings.update({ streaming: { capabilities: { filterAudioChannelConfiguration: true } } });

                prepareCapabilitiesMock({
                    name: 'isCodecSupportedBasedOnTestedConfigurations', definition: function (config) {
                        expect(config.channels).to.be.equal(2)
                        return config.channels === 2;
                    }
                });

                capabilitiesFilter.filterUnsupportedFeatures(manifest)
                    .then(() => {
                        expect(manifest.Period[0].AdaptationSet).to.have.lengthOf(1);
                        expect(manifest.Period[0].AdaptationSet[0].Representation).to.have.lengthOf(1);
                        done();
                    })
                    .catch((e) => {
                        done(e);
                    });

            });

            it('should filter AdaptationSets, ignoring inconsistent channel configurations', function (done) {
                const manifest = {
                    Period: [{
                        AdaptationSet: [{
                            mimeType: 'audio/mp4',
                            Representation: [
                                {
                                    mimeType: 'audio/mp4',
                                    codecs: 'mhm1.0x0C',
                                    audioSamplingRate: '48000',
                                    AudioChannelConfiguration: [
                                        {
                                            schemeIdUri: 'urn:mpeg:mpegB:cicp:ChannelConfiguration',
                                            value: 2
                                        },
                                        {
                                            schemeIdUri: 'urn:mpeg:mpegB:cicp:ChannelConfiguration',
                                            value: 0
                                        }
                                    ]
                                }
                            ]
                        }]
                    }]
                };

                settings.update({ streaming: { capabilities: { filterAudioChannelConfiguration: true } } });

                prepareCapabilitiesMock({
                    name: 'isCodecSupportedBasedOnTestedConfigurations', definition: function (config) {
                        expect(config.channels).to.be.equal(undefined)
                        return config.channels === undefined;
                    }
                });

                capabilitiesFilter.filterUnsupportedFeatures(manifest)
                    .then(() => {
                        expect(manifest.Period[0].AdaptationSet).to.have.lengthOf(1);
                        expect(manifest.Period[0].AdaptationSet[0].Representation).to.have.lengthOf(1);
                        done();
                    })
                    .catch((e) => {
                        done(e);
                    });

            });

            it('should filter AdaptationSets, channels with preselections', function (done) {
                const manifest = {
                    Period: [{
                        Preselection: [
                            {
                                id: '10',
                                preselectionComponents: '1',
                                tagName: 'Preselection',
                                AudioChannelConfiguration: [{
                                    schemeIdUri: 'urn:mpeg:mpegB:cicp:ChannelConfiguration',
                                    value: 6
                                }],
                            },
                            {
                                id: '11',
                                preselectionComponents: '2',
                                AudioChannelConfiguration: [{
                                    schemeIdUri: 'urn:mpeg:mpegB:cicp:ChannelConfiguration',
                                    value: 7
                                }],
                                tagName: 'Preselection',
                            },
                        ],
                        AdaptationSet: [
                            {
                                id: '1',
                                mimeType: 'audio/mp4',
                                Representation: [
                                    {
                                        mimeType: 'audio/mp4',
                                        codecs: 'mp4a.40.2',
                                        audioSamplingRate: '48000',
                                    }
                                ],
                                EssentialProperty: [ { schemeIdUri: 'urn:mpeg:dash:preselection:2016' } ],
                            }, {
                                id: '2',
                                mimeType: 'audio/mp4',
                                Representation: [
                                    {
                                        mimeType: 'audio/mp4',
                                        codecs: 'mp4a.40.2',
                                        audioSamplingRate: '48000',
                                    }
                                ],
                                EssentialProperty: [ { schemeIdUri: 'urn:mpeg:dash:preselection:2016' } ],
                            }
                        ]
                    }]
                };

                settings.update({ streaming: { capabilities: { filterAudioChannelConfiguration: true } } });

                // only accept the preselection track with 6 channels
                prepareCapabilitiesMock({
                    name: 'isCodecSupportedBasedOnTestedConfigurations', definition: function (config) {
                        return config.channels === 6 || config.channels === undefined;
                    }
                });

                capabilitiesFilter.filterUnsupportedFeatures(manifest)
                    .then(() => {
                        expect(manifest.Period[0].Preselection).to.have.lengthOf(1);
                        expect(manifest.Period[0].Preselection[0].id).to.be.equal('10');
                        expect(manifest.Period[0].AdaptationSet).to.have.lengthOf(2);
                        expect(manifest.Period[0].AdaptationSet[0].Representation).to.have.lengthOf(1);
                        done();
                    })
                    .catch((e) => {
                        done(e);
                    });

            });

            it('should filter AdaptationSets, channels with preselection override', function (done) {
                const manifest = {
                    Period: [{
                        Preselection: [
                            {
                                id: '10',
                                preselectionComponents: '1',
                                tagName: 'Preselection',
                            },
                            {
                                id: '11',
                                preselectionComponents: '2',
                                AudioChannelConfiguration: [{
                                    schemeIdUri: 'urn:mpeg:mpegB:cicp:ChannelConfiguration',
                                    value: 7
                                }],
                                tagName: 'Preselection',
                            },
                        ],
                        AdaptationSet: [
                            {
                                id: '1',
                                mimeType: 'audio/mp4',
                                Representation: [
                                    {
                                        mimeType: 'audio/mp4',
                                        codecs: 'mp4a.40.2',
                                        audioSamplingRate: '48000',
                                        AudioChannelConfiguration: [
                                            {
                                                schemeIdUri: 'urn:mpeg:mpegB:cicp:ChannelConfiguration',
                                                value: 6
                                            }
                                        ],
                                    }
                                ],
                                EssentialProperty: [ { schemeIdUri: 'urn:mpeg:dash:preselection:2016' } ],
                            }, {
                                id: '2',
                                mimeType: 'audio/mp4',
                                Representation: [
                                    {
                                        mimeType: 'audio/mp4',
                                        codecs: 'mp4a.40.2',
                                        audioSamplingRate: '48000',
                                        AudioChannelConfiguration: [
                                            {
                                                schemeIdUri: 'urn:mpeg:mpegB:cicp:ChannelConfiguration',
                                                value: 2
                                            }
                                        ],
                                    }
                                ],
                                EssentialProperty: [ { schemeIdUri: 'urn:mpeg:dash:preselection:2016' } ],
                            }
                        ]
                    }]
                };

                settings.update({ streaming: { capabilities: { filterAudioChannelConfiguration: true } } });

                prepareCapabilitiesMock({
                    name: 'isCodecSupportedBasedOnTestedConfigurations', definition: function (config) {
                        // the Each AdapationSet and Preselection is checked
                        return [8].includes(config.channels)
                    }
                });

                capabilitiesFilter.filterUnsupportedFeatures(manifest)
                    .then(() => {
                        console.log('after manifest', JSON.stringify(manifest))
                        expect(manifest.Period[0].Preselection).to.have.lengthOf(2);
                        expect(manifest.Period[0].Preselection[0].id).to.be.equal('10');
                        expect(manifest.Period[0].Preselection[1].id).to.be.equal('11');
                        expect(manifest.Period[0].AdaptationSet).to.have.lengthOf(1);
                        expect(manifest.Period[0].AdaptationSetp[0].id).to.be.equal(2);
                        done();
                    })
                    .catch((e) => {
                        done(e);
                    });

            });

        });

        describe('filter codecs using essentialProperties', function () {

            beforeEach(function () {
                settings.update({ streaming: { capabilities: { useMediaCapabilitiesApi: true } } });
                settings.update({ streaming: { capabilities: { filterVideoColorimetryEssentialProperties: true } } });
            });

            it('should set sRGB in config from EssentialProperties', function (done) {
                const manifest = {
                    Period: [{
                        AdaptationSet: [{
                            mimeType: 'video/mp4',
                            Representation: [
                                {
                                    mimeType: 'video/mp4',
                                    codecs: 'hvc1.2.4.L90.B0',
                                    EssentialProperty: [
                                        {
                                            schemeIdUri: 'urn:mpeg:mpegB:cicp:ColourPrimaries',
                                            value: '1'
                                        },
                                        {
                                            schemeIdUri: 'urn:mpeg:mpegB:cicp:TransferCharacteristics',
                                            value: '1'
                                        }]
                                }
                            ]
                        }]
                    }]
                };

                prepareCapabilitiesMock({
                    name: 'isCodecSupportedBasedOnTestedConfigurations', definition: function (config) {
                        return config.colorGamut === 'srgb' && config.transferFunction === 'srgb';
                    }
                });

                capabilitiesFilter.filterUnsupportedFeatures(manifest)
                    .then(() => {
                        expect(manifest.Period[0].AdaptationSet).to.have.lengthOf(1);
                        expect(manifest.Period[0].AdaptationSet[0].Representation).to.have.lengthOf(1);
                        done();
                    })
                    .catch((e) => {
                        done(e);
                    });
            })

            it('should set sRGB in config from EssentialProperties', function (done) {
                const manifest = {
                    Period: [{
                        AdaptationSet: [{
                            mimeType: 'video/mp4',
                            Representation: [
                                {
                                    mimeType: 'video/mp4',
                                    codecs: 'hvc1.2.4.L90.B0',
                                    EssentialProperty: [
                                        {
                                            schemeIdUri: 'urn:mpeg:mpegB:cicp:ColourPrimaries',
                                            value: '9'
                                        },
                                        {
                                            schemeIdUri: 'urn:mpeg:mpegB:cicp:TransferCharacteristics',
                                            value: '16'
                                        }]
                                }
                            ]
                        }]
                    }]
                };

                prepareCapabilitiesMock({
                    name: 'isCodecSupportedBasedOnTestedConfigurations', definition: function (config) {
                        return config.colorGamut === 'rec2020' && config.transferFunction === 'pq';
                    }
                });

                capabilitiesFilter.filterUnsupportedFeatures(manifest)
                    .then(() => {
                        expect(manifest.Period[0].AdaptationSet).to.have.lengthOf(1);
                        expect(manifest.Period[0].AdaptationSet[0].Representation).to.have.lengthOf(1);
                        done();
                    })
                    .catch((e) => {
                        done(e);
                    });
            })

            it('should flag unknown EssentialProperty-values as not supported', function (done) {
                const manifest = {
                    Period: [{
                        AdaptationSet: [{
                            mimeType: 'video/mp4',
                            Representation: [
                                {
                                    mimeType: 'video/mp4',
                                    codecs: 'hvc1.2.4.L90.B0',
                                    EssentialProperty: [
                                        {
                                            schemeIdUri: 'urn:mpeg:mpegB:cicp:ColourPrimaries',
                                            value: '1'
                                        },
                                        {
                                            schemeIdUri: 'urn:mpeg:mpegB:cicp:TransferCharacteristics',
                                            value: '1'
                                        }]
                                },
                                {
                                    mimeType: 'video/mp4',
                                    codecs: 'hvc1.2.4.L120.B0',
                                    EssentialProperty: [{
                                        schemeIdUri: 'urn:mpeg:mpegB:cicp:TransferCharacteristics',
                                        value: '2'
                                    }]
                                },
                                {
                                    mimeType: 'video/mp4',
                                    codecs: 'hvc1.2.4.L120.B0',
                                    EssentialProperty: [
                                        {
                                            schemeIdUri: 'urn:mpeg:mpegB:cicp:ColourPrimaries',
                                            value: '1'
                                        },
                                        {
                                            schemeIdUri: 'urn:mpeg:mpegB:cicp:TransferCharacteristics',
                                            value: '99'
                                        }]
                                },
                                {
                                    mimeType: 'video/mp4',
                                    codecs: 'hvc1.2.4.L120.B0',
                                    EssentialProperty: [
                                        {
                                            schemeIdUri: 'urn:mpeg:mpegB:cicp:ColourPrimaries',
                                            value: '99'
                                        },
                                        {
                                            schemeIdUri: 'urn:mpeg:mpegB:cicp:TransferCharacteristics',
                                            value: '1'
                                        }]
                                }
                            ]
                        }]
                    }]
                };

                prepareCapabilitiesMock({
                    name: 'isCodecSupportedBasedOnTestedConfigurations', definition: function (config) {
                        return config.isSupported;
                    }
                });

                capabilitiesFilter.filterUnsupportedFeatures(manifest)
                    .then(() => {
                        expect(manifest.Period[0].AdaptationSet).to.have.lengthOf(1);
                        expect(manifest.Period[0].AdaptationSet[0].Representation).to.have.lengthOf(2);
                        done();
                    })
                    .catch((e) => {
                        done(e);
                    });
            })

            it('should filter AdaptationSet from ColourPrimaries and HDRMetadataFormat', function (done) {
                const manifest = {
                    Period: [{
                        AdaptationSet: [{
                            mimeType: 'video/mp4',
                            Representation: [
                                {
                                    mimeType: 'video/mp4',
                                    codecs: 'hvc1.2.4.L90.B0',
                                    EssentialProperty: [
                                        {
                                            schemeIdUri: 'urn:mpeg:mpegB:cicp:ColourPrimaries',
                                            value: '1'
                                        },
                                        {
                                            schemeIdUri: 'urn:dvb:dash:hdr-dmi',
                                            value: 'ST2094-10'
                                        }]
                                }]
                        }, {
                            mimeType: 'video/mp4',
                            Representation: [{
                                mimeType: 'video/mp4',
                                codecs: 'hvc1.2.4.L90.B0',
                                EssentialProperty: [
                                    {
                                        schemeIdUri: 'urn:mpeg:mpegB:cicp:ColourPrimaries',
                                        value: '99'
                                    },
                                    {
                                        schemeIdUri: 'urn:dvb:dash:hdr-dmi',
                                        value: 'ST2094-10'
                                    }]
                            }]
                        }, {
                            mimeType: 'video/mp4',
                            Representation: [{
                                mimeType: 'video/mp4',
                                codecs: 'hvc1.2.4.L90.B0',
                                EssentialProperty: [
                                    {
                                        schemeIdUri: 'urn:mpeg:mpegB:cicp:ColourPrimaries',
                                        value: '18'
                                    },
                                    {
                                        schemeIdUri: 'urn:dvb:dash:hdr-dmi',
                                        value: 'ST2094-40'
                                    }]
                            }]
                        }, {
                            mimeType: 'video/mp4',
                            Representation: [{
                                mimeType: 'video/mp4',
                                codecs: 'hvc1.2.4.L90.B0',
                                EssentialProperty: [
                                    {
                                        schemeIdUri: 'urn:mpeg:mpegB:cicp:ColourPrimaries',
                                        value: '1'
                                    },
                                    {
                                        schemeIdUri: 'urn:dvb:dash:hdr-dmi',
                                        value: 'ST2094-40'
                                    }]
                            }]
                        }]
                    }]
                };

                settings.update({ streaming: { capabilities: { filterHDRMetadataFormatEssentialProperties: true } } });

                prepareCapabilitiesMock({
                    name: 'isCodecSupportedBasedOnTestedConfigurations', definition: function (config) {
                        return config.colorGamut === 'srgb' && config.hdrMetadataType === 'smpteSt2094-10';
                    }
                });

                capabilitiesFilter.filterUnsupportedFeatures(manifest)
                    .then(() => {
                        expect(manifest.Period[0].AdaptationSet).to.have.lengthOf(1);
                        expect(manifest.Period[0].AdaptationSet[0].Representation).to.have.lengthOf(1);
                        done();
                    })
                    .catch((e) => {
                        done(e);
                    });
            })
        });

        describe('filter EssentialProperty values', function () {

            beforeEach(function () {
                settings.update({ streaming: { capabilities: { filterUnsupportedEssentialProperties: true } } });
            });

            it('should not filter AdaptationSets and Representations if filterUnsupportedEssentialProperties is disabled', function (done) {
                settings.update({ streaming: { capabilities: { filterUnsupportedEssentialProperties: false } } });
                const manifest = {
                    Period: [{
                        AdaptationSet: [{
                            mimeType: 'audio/mp4',
                            Representation: [
                                {
                                    mimeType: 'audio/mp4',
                                    codecs: 'mp4a.40.2',
                                    audioSamplingRate: '48000',
                                    EssentialProperty: [{
                                        schemeIdUri: 'http://dashif.org/thumbnail_tile',
                                        value: 'somevalue'
                                    }]
                                },
                                {
                                    mimeType: 'audio/mp4',
                                    codecs: 'mp4a.40.2',
                                    audioSamplingRate: '48000',
                                    EssentialProperty: [{
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
                        expect(manifest.Period[0].AdaptationSet).to.have.lengthOf(1);
                        expect(manifest.Period[0].AdaptationSet[0].Representation).to.have.lengthOf(2);
                        done();
                    })
                    .catch((e) => {
                        done(e);
                    });

            });

            it('should not filter AdaptationSets and Representations if EssentialProperties value is supported', function (done) {
                const manifest = {
                    Period: [{
                        AdaptationSet: [
                            {
                                mimeType: 'audio/mp4',
                                Representation: [
                                    {
                                        mimeType: 'audio/mp4',
                                        codecs: 'mp4a.40.2',
                                        audioSamplingRate: '48000',
                                        EssentialProperty: [
                                            {
                                                schemeIdUri: 'http://dashif.org/thumbnail_tile',
                                                value: 'somevalue'
                                            }]
                                    },
                                    {
                                        mimeType: 'audio/mp4',
                                        codecs: 'mp4a.40.2',
                                        audioSamplingRate: '48000',
                                        EssentialProperty: [{
                                            schemeIdUri: 'http://dashif.org/thumbnail_tile',
                                            value: 'somevalue'
                                        }]
                                    }
                                ]
                            },
                            {
                                mimeType: 'application/mp4',
                                Representation_asArray: [
                                    {
                                        mimeType: 'application/mp4',
                                        codecs: 'stpp.ttml.etd1|im1t',
                                        EssentialProperty_asArray: [{
                                            schemeIdUri: 'urn:dvb:dash:fontdownload:2014',
                                            value: '1',
                                            // dvb extension properties...
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
                        expect(manifest.Period[0].AdaptationSet).to.have.lengthOf(1);
                        expect(manifest.Period[0].AdaptationSet[0].Representation).to.have.lengthOf(2);
                        done();
                    })
                    .catch((e) => {
                        done(e);
                    });

            });

            it('should filter AdaptationSets if EssentialProperty value in Representation is not supported', function (done) {
                const manifest = {
                    Period: [{
                        AdaptationSet: [{
                            mimeType: 'audio/mp4',
                            Representation: [
                                {
                                    mimeType: 'audio/mp4',
                                    codecs: 'mp4a.40.2',
                                    audioSamplingRate: '48000',
                                    EssentialProperty: [{
                                        schemeIdUri: 'http://dashif.org/thumbnail_tile',
                                        value: 'somevalue'
                                    }]
                                },
                                {
                                    mimeType: 'audio/mp4',
                                    codecs: 'mp4a.40.2',
                                    audioSamplingRate: '48000',
                                    EssentialProperty: [{
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
                        expect(manifest.Period[0].AdaptationSet).to.have.lengthOf(0);
                        done();
                    })
                    .catch((e) => {
                        done(e);
                    });


            });

            it('should filter AdaptationSets if EssentialProperty value in AdaptationSet is not supported', function (done) {
                const manifest = {
                    Period: [{
                        AdaptationSet: [{
                            mimeType: 'audio/mp4',
                            EssentialProperty: [{
                                schemeIdUri: 'http://dashif.org/thumbnail_tile',
                                value: 'somevalue'
                            }],
                            Representation: [
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
                    name: 'supportsEssentialProperty', definition: function () {
                        return false;
                    }
                });
                capabilitiesFilter.filterUnsupportedFeatures(manifest)
                    .then(() => {
                        expect(manifest.Period[0].AdaptationSet).to.have.lengthOf(0);
                        done();
                    })
                    .catch((e) => {
                        done(e);
                    });


            });

            it('should filter a single Representation if EssentialProperty value is not supported', function (done) {
                const manifest = {
                    Period: [{
                        AdaptationSet: [{
                            mimeType: 'audio/mp4',
                            Representation: [
                                {
                                    mimeType: 'audio/mp4',
                                    codecs: 'mp4a.40.2',
                                    audioSamplingRate: '48000',
                                    EssentialProperty: [{
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
                        expect(manifest.Period[0].AdaptationSet).to.have.lengthOf(1);
                        expect(manifest.Period[0].AdaptationSet[0].Representation).to.have.lengthOf(1);
                        done();
                    })
                    .catch((e) => {
                        done(e);
                    });
            });
        });

        describe('custom filters', function () {
            let manifest = {};

            const repHeightFilterFn = function (representation) {
                return representation.height >= 720;
            };
            const repHeightFilterAsync = function (representation) {
                return new Promise(resolve => {
                    resolve(representation.height <= 720)
                });
            };
            const customFilterRejects = function () {
                return Promise.reject('always rejected');
            }

            beforeEach(function () {
                manifest = {
                    Period: [{
                        AdaptationSet: [{
                            mimeType: 'video/mp4',
                            Representation: [
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
            });

            it('should keep manifest unchanged when no custom filter is provided', function (done) {

                capabilitiesFilter.filterUnsupportedFeatures(manifest)
                    .then(() => {
                        expect(manifest.Period[0].AdaptationSet).to.have.lengthOf(1);
                        expect(manifest.Period[0].AdaptationSet[0].Representation).to.have.lengthOf(3);
                        done();
                    })
                    .catch((e) => {
                        done(e);
                    });
            });

            it('should use provided custom boolean filter', function (done) {

                customParametersModel.registerCustomCapabilitiesFilter(repHeightFilterFn);

                capabilitiesFilter.filterUnsupportedFeatures(manifest)
                    .then(() => {
                        expect(manifest.Period[0].AdaptationSet).to.have.lengthOf(1);
                        expect(manifest.Period[0].AdaptationSet[0].Representation).to.have.lengthOf(2);
                        done();
                    })
                    .catch((e) => {
                        done(e);
                    });
            });

            it('should use provided custom promise filter', function (done) {

                customParametersModel.registerCustomCapabilitiesFilter(repHeightFilterAsync);

                capabilitiesFilter.filterUnsupportedFeatures(manifest)
                    .then(() => {
                        expect(manifest.Period[0].AdaptationSet).to.have.lengthOf(1);
                        expect(manifest.Period[0].AdaptationSet[0].Representation).to.have.lengthOf(2);
                        done();
                    })
                    .catch((e) => {
                        done(e);
                    });
            });

            it('should use provided custom filters - boolean + promise', function (done) {

                customParametersModel.registerCustomCapabilitiesFilter(repHeightFilterAsync);
                customParametersModel.registerCustomCapabilitiesFilter(repHeightFilterFn);

                capabilitiesFilter.filterUnsupportedFeatures(manifest)
                    .then(() => {
                        expect(manifest.Period[0].AdaptationSet).to.have.lengthOf(1);
                        expect(manifest.Period[0].AdaptationSet[0].Representation).to.have.lengthOf(1);
                        done();
                    })
                    .catch((e) => {
                        done(e);
                    });
            });

            it('should handle rejected promises', function (done) {

                customParametersModel.registerCustomCapabilitiesFilter(repHeightFilterFn); // this function resolves
                customParametersModel.registerCustomCapabilitiesFilter(customFilterRejects); // this function rejects

                capabilitiesFilter.filterUnsupportedFeatures(manifest)
                    .then(() => {
                        expect(manifest.Period[0].AdaptationSet).to.have.lengthOf(1);
                        // when one promise is rejected, all filters are not applied
                        expect(manifest.Period[0].AdaptationSet[0].Representation).to.have.lengthOf(3);

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
