import Capabilities from '../../../../src/streaming/utils/Capabilities.js';
import Settings from '../../../../src/core/Settings.js';
import DescriptorType from '../../../../src/dash/vo/DescriptorType.js';

import {expect} from 'chai';
import Constants from '../../../../src/streaming/constants/Constants.js';
//import {UAParser} from 'ua-parser-js';

let settings;
let capabilities;

//const uaString = typeof navigator !== 'undefined' ? navigator.userAgent.toLowerCase() : '';
//const ua = UAParser(uaString);

// The Media Capabilities API seems to return wrong values on Linux with Firefox. Deactivate some tests for now
//const isLinuxFirefox = ua.browser.name.toLowerCase() === 'firefox' && ua.os.name.toLowerCase().includes('linux');


let EssentialPropertyThumbNail = new DescriptorType;
EssentialPropertyThumbNail.init({
    schemeIdUri: 'http://dashif.org/thumbnail_tile',
    value: 'myvalue'
});

const EssentialPropertyThumbNailnoVal = {
    schemeIdUri: 'http://dashif.org/thumbnail_tile'
};

let EssentialPropertyThumbNailemptyVal = new DescriptorType;
EssentialPropertyThumbNailemptyVal.init({
    schemeIdUri: 'http://dashif.org/thumbnail_tile',
    value: ''
});

let EssentialPropertyOwn = new DescriptorType;
EssentialPropertyOwn.init({
    schemeIdUri: 'tag:dashif.org:myOwnFeature',
    value: 'somevalue'
});

let EssentialPropertyOwnSecond = new DescriptorType;
EssentialPropertyOwnSecond.init({
    schemeIdUri: 'tag:dashif.org:mySecondOwnFeature',
    value: 'somevalue'
});

let EssentialPropertySDR = new DescriptorType;
EssentialPropertySDR.init({
    schemeIdUri: 'urn:mpeg:mpegB:cicp:ColourPrimaries',
    value: '5'
});

let EssentialPropertynoVal = new DescriptorType;
EssentialPropertynoVal.init({
    schemeIdUri: 'urn:mpeg:mpegB:cicp:ColourPrimaries'
});

let EssentialPropertyemptyVal = new DescriptorType;
EssentialPropertyemptyVal.init({
    schemeIdUri: 'urn:mpeg:mpegB:cicp:ColourPrimaries',
    value: ''
});

let EssentialPropertyHDR = new DescriptorType;
EssentialPropertyHDR.init({
    schemeIdUri: 'urn:mpeg:mpegB:cicp:ColourPrimaries',
    value: '9'
});

let EssentialPropertyHDRFormat = new DescriptorType;
EssentialPropertyHDRFormat.init({
    schemeIdUri: 'urn:dvb:dash:hdr-dmi',
    value: 'ST2094-10'
});

let EssentialPropertyPrivateTransferFunction = new DescriptorType;
EssentialPropertyPrivateTransferFunction.init({
    schemeIdUri: 'urn:mpeg:mpegB:cicp:TransferCharacteristics',
    value: '2'
});

describe('Capabilities', function () {
    beforeEach(function () {
        settings = Settings({}).getInstance();
        capabilities = Capabilities({}).getInstance();

        capabilities.setConfig({
            settings: settings
        });
        settings.reset();
    });

    describe('supports EssentialProperty', function () {
        it('should return true if EssentialProperty value is known', function () {
            let res = capabilities.supportsEssentialProperty(EssentialPropertyThumbNail);
            expect(res).to.be.true;
        });

        it('should return true if EssentialProperty value is absent if supported by scheme', function () {
            let res = capabilities.supportsEssentialProperty(EssentialPropertyThumbNailnoVal);
            expect(res).to.be.true;
        });

        it('should return true if EssentialProperty value is empty if supported by scheme', function () {
            let res = capabilities.supportsEssentialProperty(EssentialPropertyThumbNailemptyVal);
            expect(res).to.be.true;
        });

        it('should return false if EssentialProperty value is not known', function () {
            let res = capabilities.supportsEssentialProperty(EssentialPropertyOwn);
            expect(res).to.be.false;
        });

        it('should return false if EssentialProperty value is absent for known schemeId+value', function () {
            let res = capabilities.supportsEssentialProperty(EssentialPropertynoVal);
            expect(res).to.be.false;
        });

        it('should return false if EssentialProperty value is empty for known schemeId+value', function () {
            let res = capabilities.supportsEssentialProperty(EssentialPropertyemptyVal);
            expect(res).to.be.false;
        });

        it('should return false if EssentialProperty value is not known when new values are registered in settings', function () {
            let props = settings.get().streaming.capabilities.supportedEssentialProperties;
            props.push(...[EssentialPropertyOwn]);
            settings.update({ streaming: { capabilities: { supportedEssentialProperties: props } } });

            let res = capabilities.supportsEssentialProperty(EssentialPropertyOwnSecond);
            expect(res).to.be.false;
        });

        it('should return true if EssentialProperty value is registered in settings', function () {
            let props = settings.get().streaming.capabilities.supportedEssentialProperties;
            props.push(...[EssentialPropertyOwn]);
            settings.update({ streaming: { capabilities: { supportedEssentialProperties: props } } });

            let res = capabilities.supportsEssentialProperty(EssentialPropertyOwn);
            expect(res).to.be.true;
        });

        it('should return true for internally known EssentialProperties when new values are registered in settings', function () {
            let props = settings.get().streaming.capabilities.supportedEssentialProperties;
            props.push(...[EssentialPropertyOwn]);
            settings.update({ streaming: { capabilities: { supportedEssentialProperties: props } } });

            let res = capabilities.supportsEssentialProperty(EssentialPropertyThumbNail);
            expect(res).to.be.true;
        });

        it('should return true if schemeIdUri+value pair is registered as known feature', function () {
            let res = capabilities.supportsEssentialProperty(EssentialPropertySDR);
            expect(res).to.be.true;
        });

        it('should return true if schemeIdUri+RegExp-value pair is registered as known feature', function () {
            const newFeature = {
                schemeIdUri: 'urn:mpeg:mpegB:cicp:ColourPrimaries',
                value: /1|5|9/
            };

            let props = settings.get().streaming.capabilities.supportedEssentialProperties;
            props.push(...[newFeature]);
            settings.update({ streaming: { capabilities: { supportedEssentialProperties: props } } });

            let res = capabilities.supportsEssentialProperty(EssentialPropertyHDR);
            expect(res).to.be.true;
        });

        it('should return false if schemeIdUri, but unknown RegExp-value pair is registered as known feature', function () {
            const newFeature = {
                schemeIdUri: 'urn:mpeg:mpegB:cicp:ColourPrimaries',
                value: /1|5|7/
            };

            let props = settings.get().streaming.capabilities.supportedEssentialProperties;
            props.push(...[newFeature]);
            settings.update({ streaming: { capabilities: { supportedEssentialProperties: props } } });

            let res = capabilities.supportsEssentialProperty(EssentialPropertyHDR);
            expect(res).to.be.false;
        });

        it('should return false if schemeIdUri, but different value are registered as known feature', function () {
            let res = capabilities.supportsEssentialProperty(EssentialPropertyHDR);
            expect(res).to.be.false;
        });

        it('should default missing EssentialProp.value in Settings to match-all', function () {
            let props = settings.get().streaming.capabilities.supportedEssentialProperties;
            props.push(...[{ schemeIdUri: 'tag:dashif.org:scheme:value:test' }]);
            settings.update({ streaming: { capabilities: { supportedEssentialProperties: props } } })

            let res = capabilities.supportsEssentialProperty({
                schemeIdUri: 'tag:dashif.org:scheme:value:test',
                value: ''
            });
            expect(res).to.be.true;
            res = capabilities.supportsEssentialProperty({ schemeIdUri: 'tag:dashif.org:scheme:value:test' });
            expect(res).to.be.true;
            res = capabilities.supportsEssentialProperty({
                schemeIdUri: 'tag:dashif.org:scheme:value:test',
                value: '5'
            });
            expect(res).to.be.true;
        });

        it('should return true if MediaCapabilities-check is enabled, even if value is unknown for Colorimetry schemeIdUri', function () {
            let res = capabilities.supportsEssentialProperty(EssentialPropertyHDR);
            expect(res).to.be.false;

            settings.update({
                streaming: {
                    capabilities: {
                        useMediaCapabilitiesApi: true,
                        filterVideoColorimetryEssentialProperties: true
                    }
                }
            });

            res = capabilities.supportsEssentialProperty(EssentialPropertyHDR);
            expect(res).to.be.true;
        });

        it('should return true if MediaCapabilities-check is enabled, even if value is unknown for HDR-Format schemeIdUri', function () {
            let res = capabilities.supportsEssentialProperty(EssentialPropertyHDRFormat);
            expect(res).to.be.false;

            settings.update({
                streaming: {
                    capabilities: {
                        useMediaCapabilitiesApi: true,
                        filterVideoColorimetryEssentialProperties: true
                    }
                }
            });
            res = capabilities.supportsEssentialProperty(EssentialPropertyHDRFormat);
            expect(res).to.be.false;

            settings.update({
                streaming: {
                    capabilities: {
                        useMediaCapabilitiesApi: true,
                        filterHDRMetadataFormatEssentialProperties: true
                    }
                }
            });
            res = capabilities.supportsEssentialProperty(EssentialPropertyHDRFormat);
            expect(res).to.be.true;
        });

        it('should return true for unspecified TransferFunction if MediaCapabilities-check is enabled', function () {
            let res = capabilities.supportsEssentialProperty(EssentialPropertyPrivateTransferFunction);
            expect(res).to.be.false;

            settings.update({
                streaming: {
                    capabilities: {
                        useMediaCapabilitiesApi: true,
                        filterVideoColorimetryEssentialProperties: true
                    }
                }
            });
            res = capabilities.supportsEssentialProperty(EssentialPropertyPrivateTransferFunction);
            expect(res).to.be.true;
        });
    });

    describe('supportsCodec', function () {

        describe('MediaSourceExtensions.isTypeSupported', function () {
            it('should return true for supported codec using MediaSource.isTypeSupported', function (done) {
                const config = {
                    codec: 'video/mp4;codecs="avc1.64001f"',
                    width: 320,
                    height: 180
                }
                settings.update({
                    streaming: {
                        capabilities: {
                            useMediaCapabilitiesApi: false
                        }
                    }
                });

                capabilities.runCodecSupportCheck(config, 'video')
                    .then(() => {
                        const result = capabilities.isCodecSupportedBasedOnTestedConfigurations(config, 'video');
                        expect(result).to.be.true
                        done()
                    })
                    .catch((e) => {
                        done(e)
                    })
            })

            it('should filter unsupported codec using MediaSource.isTypeSupported', function (done) {
                const config = {
                    codec: 'video/mp4;codecs="vvvvc1.64001f"',
                    width: 320,
                    height: 180
                }

                settings.update({
                    streaming: {
                        capabilities: {
                            useMediaCapabilitiesApi: false
                        }
                    }
                });

                capabilities.runCodecSupportCheck(config, 'video')
                    .then(() => {
                        const result = capabilities.isCodecSupportedBasedOnTestedConfigurations(config, 'video');
                        expect(result).to.be.false
                        done()
                    })
                    .catch((e) => {
                        done(e)
                    })
            })
        })

        /*
        describe('MediaCapabilitiesAPI.decodingInfo()', function () {

            before(function () {
                if (isLinuxFirefox) {
                    this.skip();
                }
            });

            it('should return true for supported codec using Media Capabilities API', function (done) {
                const config = {
                    codec: 'video/mp4;codecs="avc1.4D4028"',
                    width: 320,
                    height: 180,
                    bitrate: 5000000,
                    framerate: '25/1',
                    isSupported: true
                }
                settings.update({
                    streaming: {
                        capabilities: {
                            useMediaCapabilitiesApi: true
                        }
                    }
                });

                capabilities.runCodecSupportCheck(config, 'video')
                    .then(() => {
                        const result = capabilities.isCodecSupportedBasedOnTestedConfigurations(config, 'video');
                        expect(result).to.be.true
                        done()
                    })
                    .catch((e) => {
                        done(e)
                    })
            })

            it('should return true when a valid codec string is provided but no other parameters. In this case isTypeSupported shall be used instead of the MediaCapabilitiesAPI', function (done) {
                const config = {
                    codec: 'video/mp4;codecs="avc1.4D4028"',
                }
                settings.update({
                    streaming: {
                        capabilities: {
                            useMediaCapabilitiesApi: true
                        }
                    }
                });

                capabilities.runCodecSupportCheck(config, 'video')
                    .then(() => {
                        const result = capabilities.isCodecSupportedBasedOnTestedConfigurations(config, 'video');
                        expect(result).to.be.true
                        done()
                    })
                    .catch((e) => {
                        done(e)
                    })
            })

            it('should return true when a valid codec string is provided but no width. In this case isTypeSupported shall be used instead of the MediaCapabilitiesAPI', function (done) {
                const config = {
                    codec: 'video/mp4;codecs="avc1.4D4028"',
                    height: 180,
                    bitrate: 5000000,
                    framerate: '25/1',
                    isSupported: true
                }
                settings.update({
                    streaming: {
                        capabilities: {
                            useMediaCapabilitiesApi: true
                        }
                    }
                });

                capabilities.runCodecSupportCheck(config, 'video')
                    .then(() => {
                        const result = capabilities.isCodecSupportedBasedOnTestedConfigurations(config, 'video');
                        expect(result).to.be.true
                        done()
                    })
                    .catch((e) => {
                        done(e)
                    })
            })

            it('should return true when a valid codec string is provided but no height. In this case isTypeSupported shall be used instead of the MediaCapabilitiesAPI', function (done) {
                const config = {
                    codec: 'video/mp4;codecs="avc1.4D4028"',
                    width: 180,
                    bitrate: 5000000,
                    framerate: '25/1',
                    isSupported: true
                }
                settings.update({
                    streaming: {
                        capabilities: {
                            useMediaCapabilitiesApi: true
                        }
                    }
                });

                capabilities.runCodecSupportCheck(config, 'video')
                    .then(() => {
                        const result = capabilities.isCodecSupportedBasedOnTestedConfigurations(config, 'video');
                        expect(result).to.be.true
                        done()
                    })
                    .catch((e) => {
                        done(e)
                    })
            })

            it('should return true when a valid codec string is provided but no bitrate. In this case isTypeSupported shall be used instead of the MediaCapabilitiesAPI', function (done) {
                const config = {
                    codec: 'video/mp4;codecs="avc1.4D4028"',
                    height: 180,
                    width: 320,
                    framerate: '25/1',
                    isSupported: true
                }
                settings.update({
                    streaming: {
                        capabilities: {
                            useMediaCapabilitiesApi: true
                        }
                    }
                });

                capabilities.runCodecSupportCheck(config, 'video')
                    .then(() => {
                        const result = capabilities.isCodecSupportedBasedOnTestedConfigurations(config, 'video');
                        expect(result).to.be.true
                        done()
                    })
                    .catch((e) => {
                        done(e)
                    })
            })

            it('should return true when a valid codec string is provided but no framerate. In this case isTypeSupported shall be used instead of the MediaCapabilitiesAPI', function (done) {
                const config = {
                    codec: 'video/mp4;codecs="avc1.4D4028"',
                    height: 180,
                    bitrate: 5000000,
                    width: 320,
                    isSupported: true
                }
                settings.update({
                    streaming: {
                        capabilities: {
                            useMediaCapabilitiesApi: true
                        }
                    }
                });

                capabilities.runCodecSupportCheck(config, 'video')
                    .then(() => {
                        const result = capabilities.isCodecSupportedBasedOnTestedConfigurations(config, 'video');
                        expect(result).to.be.true
                        done()
                    })
                    .catch((e) => {
                        done(e)
                    })
            })

            it('should return false when no valid codec string is provided', function (done) {
                const config = {
                    height: 180,
                    bitrate: 5000000,
                    framerate: '25/1',
                    isSupported: true
                }
                settings.update({
                    streaming: {
                        capabilities: {
                            useMediaCapabilitiesApi: true
                        }
                    }
                });

                capabilities.runCodecSupportCheck(config, 'video')
                    .then(() => {
                        const result = capabilities.isCodecSupportedBasedOnTestedConfigurations(config, 'video');
                        expect(result).to.be.false
                        done()
                    })
                    .catch((e) => {
                        done(e)
                    })
            })

            it('should filter unsupported codec using Media Capabilities API', function (done) {
                const config = {
                    codec: 'video/mp4;codecs="vvvvc1.64001f"',
                    width: 320,
                    height: 180,
                    bitrate: 5000000,
                    framerate: '25/1',
                    isSupported: true
                }

                settings.update({
                    streaming: {
                        capabilities: {
                            useMediaCapabilitiesApi: true
                        }
                    }
                })
                capabilities.runCodecSupportCheck(config, 'video')
                    .then(() => {
                        const result = capabilities.isCodecSupportedBasedOnTestedConfigurations(config, 'video');
                        expect(result).to.be.false
                        done()
                    })
                    .catch((e) => {
                        done(e)
                    })
            })
        })
        */

        it('should return true for enhancement codecs', function () {
            const res = capabilities.runCodecSupportCheck({ codec: `video/${Constants.ENHANCEMENT_CODECS[0]}` }, Constants.VIDEO);

            return res.then(function (isSupported) {
                expect(isSupported).to.be.true;
            });
        });


    })
});
