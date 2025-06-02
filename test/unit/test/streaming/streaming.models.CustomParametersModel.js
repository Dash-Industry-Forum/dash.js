import CustomParametersModel from '../../../../src/streaming/models/CustomParametersModel.js';
import Constants from '../../../../src/streaming/constants/Constants.js';


import chai from 'chai';

const expect = chai.expect;

describe('CustomParametersModel', function () {
    const context = {};

    let customParametersModel = CustomParametersModel(context).getInstance();

    beforeEach(() => {
        customParametersModel.reset();
    });

    it('Method removeUTCTimingSource should throw an exception', () => {
        expect(customParametersModel.removeUTCTimingSource.bind(customParametersModel, true, 'string')).to.throw(Constants.BAD_ARGUMENT_ERROR);
        expect(customParametersModel.removeUTCTimingSource.bind(customParametersModel, 1, 'string')).to.throw(Constants.BAD_ARGUMENT_ERROR);
        expect(customParametersModel.removeUTCTimingSource.bind(customParametersModel, 'string', true)).to.throw(Constants.BAD_ARGUMENT_ERROR);
        expect(customParametersModel.removeUTCTimingSource.bind(customParametersModel, 'string', 1)).to.throw(Constants.BAD_ARGUMENT_ERROR);
        expect(customParametersModel.removeUTCTimingSource.bind(customParametersModel, true, true)).to.throw(Constants.BAD_ARGUMENT_ERROR);
        expect(customParametersModel.removeUTCTimingSource.bind(customParametersModel, 1, 1)).to.throw(Constants.BAD_ARGUMENT_ERROR);
    });

    it('Method addUTCTimingSource should throw an exception', () => {
        expect(customParametersModel.addUTCTimingSource.bind(customParametersModel, true, 'string')).to.throw(Constants.BAD_ARGUMENT_ERROR);
        expect(customParametersModel.addUTCTimingSource.bind(customParametersModel, 1, 'string')).to.throw(Constants.BAD_ARGUMENT_ERROR);
        expect(customParametersModel.addUTCTimingSource.bind(customParametersModel, 'string', true)).to.throw(Constants.BAD_ARGUMENT_ERROR);
        expect(customParametersModel.addUTCTimingSource.bind(customParametersModel, 'string', 1)).to.throw(Constants.BAD_ARGUMENT_ERROR);
        expect(customParametersModel.addUTCTimingSource.bind(customParametersModel, true, true)).to.throw(Constants.BAD_ARGUMENT_ERROR);
        expect(customParametersModel.addUTCTimingSource.bind(customParametersModel, 1, 1)).to.throw(Constants.BAD_ARGUMENT_ERROR);
    });

    it('Should add custom initial track selection function', () => {
        const foo = () => {
            return
        }
        customParametersModel.setCustomInitialTrackSelectionFunction(foo);

        const customInitialTrackSelectionFunction = customParametersModel.getCustomInitialTrackSelectionFunction();
        expect(customInitialTrackSelectionFunction).to.be.a('function');
    })


    it('Should reset custom initial track selection function', () => {
        const foo = () => {
            return
        }
        customParametersModel.setCustomInitialTrackSelectionFunction(foo);

        let customInitialTrackSelectionFunction = customParametersModel.getCustomInitialTrackSelectionFunction();
        expect(customInitialTrackSelectionFunction).to.be.a('function');

        customParametersModel.resetCustomInitialTrackSelectionFunction();
        customInitialTrackSelectionFunction = customParametersModel.getCustomInitialTrackSelectionFunction();
        expect(customInitialTrackSelectionFunction).to.be.null;
    })

    it('Should add license request filters', () => {
        const foo = () => {
            return;
        };
        const bar = () => {
            return;
        }
        customParametersModel.registerLicenseRequestFilter(foo);
        let licenseResponseFilters = customParametersModel.getLicenseRequestFilters();
        expect(licenseResponseFilters).to.have.lengthOf(1);

        customParametersModel.registerLicenseRequestFilter(bar);
        licenseResponseFilters = customParametersModel.getLicenseRequestFilters();
        expect(licenseResponseFilters).to.have.lengthOf(2);
    })

    it('Should remove license request filters', () => {
        const foo = () => {
            return;
        };
        const bar = () => {
            return;
        }
        customParametersModel.registerLicenseRequestFilter(foo);
        let licenseResponseFilters = customParametersModel.getLicenseRequestFilters();
        expect(licenseResponseFilters).to.have.lengthOf(1);

        customParametersModel.registerLicenseRequestFilter(bar);
        licenseResponseFilters = customParametersModel.getLicenseRequestFilters();
        expect(licenseResponseFilters).to.have.lengthOf(2);

        customParametersModel.unregisterLicenseRequestFilter(foo);
        licenseResponseFilters = customParametersModel.getLicenseRequestFilters();
        expect(licenseResponseFilters).to.have.lengthOf(1);

        customParametersModel.unregisterLicenseRequestFilter(foo);
        licenseResponseFilters = customParametersModel.getLicenseRequestFilters();
        expect(licenseResponseFilters).to.have.lengthOf(1);

        customParametersModel.unregisterLicenseRequestFilter(bar);
        licenseResponseFilters = customParametersModel.getLicenseRequestFilters();
        expect(licenseResponseFilters).to.have.lengthOf(0);
    })

    it('Should add license response filters', () => {
        const foo = () => {
            return;
        };
        const bar = () => {
            return;
        }
        customParametersModel.registerLicenseResponseFilter(foo);
        let licenseResponseFilters = customParametersModel.getLicenseResponseFilters();
        expect(licenseResponseFilters).to.have.lengthOf(1);

        customParametersModel.registerLicenseResponseFilter(bar);
        licenseResponseFilters = customParametersModel.getLicenseResponseFilters();
        expect(licenseResponseFilters).to.have.lengthOf(2);
    })

    it('Should remove license response filters', () => {
        const foo = () => {
            return;
        };
        const bar = () => {
            return;
        }
        customParametersModel.registerLicenseResponseFilter(foo);
        let licenseResponseFilters = customParametersModel.getLicenseResponseFilters();
        expect(licenseResponseFilters).to.have.lengthOf(1);

        customParametersModel.registerLicenseResponseFilter(bar);
        licenseResponseFilters = customParametersModel.getLicenseResponseFilters();
        expect(licenseResponseFilters).to.have.lengthOf(2);

        customParametersModel.unregisterLicenseResponseFilter(foo);
        licenseResponseFilters = customParametersModel.getLicenseResponseFilters();
        expect(licenseResponseFilters).to.have.lengthOf(1);

        customParametersModel.unregisterLicenseResponseFilter(foo);
        licenseResponseFilters = customParametersModel.getLicenseResponseFilters();
        expect(licenseResponseFilters).to.have.lengthOf(1);

        customParametersModel.unregisterLicenseResponseFilter(bar);
        licenseResponseFilters = customParametersModel.getLicenseResponseFilters();
        expect(licenseResponseFilters).to.have.lengthOf(0);
    })

    it('Should add custom capabilities filters', () => {
        const foo = () => {
            return;
        };
        const bar = () => {
            return;
        }
        customParametersModel.registerCustomCapabilitiesFilter(foo);
        let licenseResponseFilters = customParametersModel.getCustomCapabilitiesFilters();
        expect(licenseResponseFilters).to.have.lengthOf(1);

        customParametersModel.registerCustomCapabilitiesFilter(bar);
        licenseResponseFilters = customParametersModel.getCustomCapabilitiesFilters();
        expect(licenseResponseFilters).to.have.lengthOf(2);
    })

    it('Should remove custom capability filters', () => {
        const foo = () => {
            return;
        };
        const bar = () => {
            return;
        }
        customParametersModel.registerCustomCapabilitiesFilter(foo);
        let licenseResponseFilters = customParametersModel.getCustomCapabilitiesFilters();
        expect(licenseResponseFilters).to.have.lengthOf(1);

        customParametersModel.registerCustomCapabilitiesFilter(bar);
        licenseResponseFilters = customParametersModel.getCustomCapabilitiesFilters();
        expect(licenseResponseFilters).to.have.lengthOf(2);

        customParametersModel.unregisterCustomCapabilitiesFilter(foo);
        licenseResponseFilters = customParametersModel.getCustomCapabilitiesFilters();
        expect(licenseResponseFilters).to.have.lengthOf(1);

        customParametersModel.unregisterCustomCapabilitiesFilter(foo);
        licenseResponseFilters = customParametersModel.getCustomCapabilitiesFilters();
        expect(licenseResponseFilters).to.have.lengthOf(1);

        customParametersModel.unregisterCustomCapabilitiesFilter(bar);
        licenseResponseFilters = customParametersModel.getCustomCapabilitiesFilters();
        expect(licenseResponseFilters).to.have.lengthOf(0);
    })

    it('should manage custom ABR rules', function () {
        let customRules = customParametersModel.getAbrCustomRules();
        expect(customRules.length).to.equal(0);

        customParametersModel.addAbrCustomRule('qualitySwitchRules', 'testRule', {});

        customRules = customParametersModel.getAbrCustomRules();
        expect(customRules.length).to.equal(1);
        expect(customRules[0].rulename).to.equal('testRule');

        customParametersModel.addAbrCustomRule('qualitySwitchRules', 'testRule2', {});
        customParametersModel.addAbrCustomRule('qualitySwitchRules', 'testRule3', {});
        customRules = customParametersModel.getAbrCustomRules();
        expect(customRules.length).to.equal(3);

        customParametersModel.removeAbrCustomRule('testRule');

        customRules = customParametersModel.getAbrCustomRules();
        expect(customRules.length).to.equal(2);

        customParametersModel.removeAbrCustomRule();

        customRules = customParametersModel.getAbrCustomRules();
        expect(customRules.length).to.equal(0);
    });

    it('should manage UTC timing sources', function () {
        let utcTimingSources = customParametersModel.getUTCTimingSources();
        expect(utcTimingSources.length).to.equal(0);

        customParametersModel.addUTCTimingSource('urn:mpeg:dash:utc:http-head:2014', 'http://time.akamai.com');
        customParametersModel.addUTCTimingSource('urn:mpeg:dash:utc:http-iso:2014', 'http://time.akamai.com');

        utcTimingSources = customParametersModel.getUTCTimingSources();
        expect(utcTimingSources.length).to.equal(2);

        customParametersModel.removeUTCTimingSource('urn:mpeg:dash:utc:http-head:2014', 'http://time.akamai.com');

        utcTimingSources = customParametersModel.getUTCTimingSources();
        expect(utcTimingSources.length).to.equal(1);

        customParametersModel.clearDefaultUTCTimingSources();
        utcTimingSources = customParametersModel.getUTCTimingSources();
        expect(utcTimingSources.length).to.equal(0);

        customParametersModel.restoreDefaultUTCTimingSources();
        utcTimingSources = customParametersModel.getUTCTimingSources();
        expect(utcTimingSources.length).to.equal(1);
    });

    describe('external subtitles', () => {

        it('should add an external subtitle', () => {
            const id = '0';
            const url = 'http://example.com/subtitle.vtt';
            const language = 'en';
            const mimeType = 'text/vtt';
            const bandwidth = 256;
            customParametersModel.addExternalSubtitle({ id, url, language, mimeType, bandwidth });

            const subtitles = customParametersModel.getExternalSubtitles();
            expect(subtitles.size).to.equal(1);
            const element = subtitles.values().next().value;
            expect(element.url).to.equal(url);
            expect(element.language).to.equal(language);
            expect(element.mimeType).to.equal(mimeType);
            expect(element.bandwidth).to.equal(bandwidth);
        })

        it('should not add an external subtitle that has no ID', () => {
            const language = 'en';
            const mimeType = 'text/vtt';
            const bandwidth = 256;
            customParametersModel.addExternalSubtitle({ language, mimeType, bandwidth });
            customParametersModel.addExternalSubtitle({ language: 'fra', mimeType: 'text/ttml', bandwidth: 480 });

            const subtitles = customParametersModel.getExternalSubtitles();
            expect(subtitles.size).to.equal(0);
        })


        it('should not add an external subtitle that has no URL', () => {
            const id = '0';
            const language = 'en';
            const mimeType = 'text/vtt';
            const bandwidth = 256;
            customParametersModel.addExternalSubtitle({ id, language, mimeType, bandwidth });
            customParametersModel.addExternalSubtitle({ language: 'fra', mimeType: 'text/ttml', bandwidth: 480 });

            const subtitles = customParametersModel.getExternalSubtitles();
            expect(subtitles.size).to.equal(0);
        })

        it('should not add an external subtitle that has no language', () => {
            const id = '0';
            const url = 'http://example.com/subtitle.vtt';
            const mimeType = 'text/vtt';
            const bandwidth = 256;
            customParametersModel.addExternalSubtitle({ id, url, mimeType, bandwidth });

            const subtitles = customParametersModel.getExternalSubtitles();
            expect(subtitles.size).to.equal(0);
        })

        it('should not add an external subtitle that has no mimeType', () => {
            const id = '0';
            const url = 'http://example.com/subtitle.vtt';
            const language = 'en';
            const bandwidth = 256;
            customParametersModel.addExternalSubtitle({ id, url, language, bandwidth });

            const subtitles = customParametersModel.getExternalSubtitles();
            expect(subtitles.size).to.equal(0);
        })

        it('should not add an external subtitle that has no bandwidth', () => {
            const id = '0';
            const url = 'http://example.com/subtitle.vtt';
            const mimeType = 'text/vtt';
            const language = 'en';
            customParametersModel.addExternalSubtitle({ id, url, mimeType, language });

            const subtitles = customParametersModel.getExternalSubtitles();
            expect(subtitles.size).to.equal(0);
        })

        it('should not add an external subtitle with the same ID twice', () => {
            const id = '0';
            const url = 'http://example.com/subtitle.vtt';
            const language = 'en';
            const mimeType = 'text/vtt';
            const bandwidth = 256;
            customParametersModel.addExternalSubtitle({ id, url, language, mimeType, bandwidth });
            customParametersModel.addExternalSubtitle({
                id,
                url: url + '_second_url',
                language: 'fra',
                mimeType: 'text/ttml',
                bandwidth: 480
            });

            const subtitles = customParametersModel.getExternalSubtitles();
            expect(subtitles.size).to.equal(1);
            const element = subtitles.values().next().value;
            expect(element.url).to.equal(url);
            expect(element.language).to.equal(language);
            expect(element.mimeType).to.equal(mimeType);
            expect(element.bandwidth).to.equal(bandwidth);
        })

        it('should not add an external subtitle with the same URL twice', () => {
            const id = '0';
            const url = 'http://example.com/subtitle.vtt';
            const language = 'en';
            const mimeType = 'text/vtt';
            const bandwidth = 256;
            customParametersModel.addExternalSubtitle({ id, url, language, mimeType, bandwidth });
            customParametersModel.addExternalSubtitle({
                id: '1',
                url,
                language: 'fra',
                mimeType: 'text/ttml',
                bandwidth: 480
            });

            const subtitles = customParametersModel.getExternalSubtitles();
            expect(subtitles.size).to.equal(1);
            const element = subtitles.values().next().value;
            expect(element.url).to.equal(url);
            expect(element.language).to.equal(language);
            expect(element.mimeType).to.equal(mimeType);
            expect(element.bandwidth).to.equal(bandwidth);
        })

        it('should remove an external subtitle by URL', () => {
            const id = '0';
            const url = 'http://example.com/subtitle.vtt';
            const language = 'en';
            const mimeType = 'text/vtt';
            const bandwidth = 256;
            customParametersModel.addExternalSubtitle({ id, url, language, mimeType, bandwidth });

            let subtitles = customParametersModel.getExternalSubtitles();
            expect(subtitles.size).to.equal(1);
            const element = subtitles.values().next().value;
            expect(element.url).to.equal(url);
            expect(element.language).to.equal(language);
            expect(element.mimeType).to.equal(mimeType);
            expect(element.bandwidth).to.equal(bandwidth);

            customParametersModel.removeExternalSubtitleByUrl(url);
            subtitles = customParametersModel.getExternalSubtitles();
            expect(subtitles.size).to.equal(0);
        })

        it('should not remove any external subtitle if the URL does not match', () => {
            const id = '0';
            const url = 'http://example.com/subtitle.vtt';
            const language = 'en';
            const mimeType = 'text/vtt';
            const bandwidth = 256;
            customParametersModel.addExternalSubtitle({ id, url, language, mimeType, bandwidth });

            let subtitles = customParametersModel.getExternalSubtitles();
            expect(subtitles.size).to.equal(1);
            const element = subtitles.values().next().value;
            expect(element.url).to.equal(url);
            expect(element.language).to.equal(language);
            expect(element.mimeType).to.equal(mimeType);
            expect(element.bandwidth).to.equal(bandwidth);

            customParametersModel.removeExternalSubtitleByUrl('http://example.com/subtitle-invalid.vtt');
            subtitles = customParametersModel.getExternalSubtitles();
            expect(subtitles.size).to.equal(1);
        })

        it('should remove an external subtitle by ID', () => {
            const id = '0';
            const url = 'http://example.com/subtitle.vtt';
            const language = 'en';
            const mimeType = 'text/vtt';
            const bandwidth = 256;
            customParametersModel.addExternalSubtitle({ id, url, language, mimeType, bandwidth });

            let subtitles = customParametersModel.getExternalSubtitles();
            expect(subtitles.size).to.equal(1);
            const element = subtitles.values().next().value;
            expect(element.url).to.equal(url);
            expect(element.language).to.equal(language);
            expect(element.mimeType).to.equal(mimeType);
            expect(element.bandwidth).to.equal(bandwidth);

            customParametersModel.removeExternalSubtitleById(id);
            subtitles = customParametersModel.getExternalSubtitles();
            expect(subtitles.size).to.equal(0);
        })

        it('should not remove any external subtitle if the URL does not match', () => {
            const id = '0';
            const url = 'http://example.com/subtitle.vtt';
            const language = 'en';
            const mimeType = 'text/vtt';
            const bandwidth = 256;
            customParametersModel.addExternalSubtitle({ id, url, language, mimeType, bandwidth });

            let subtitles = customParametersModel.getExternalSubtitles();
            expect(subtitles.size).to.equal(1);
            const element = subtitles.values().next().value;
            expect(element.url).to.equal(url);
            expect(element.language).to.equal(language);
            expect(element.mimeType).to.equal(mimeType);
            expect(element.bandwidth).to.equal(bandwidth);

            customParametersModel.removeExternalSubtitleById('1');
            subtitles = customParametersModel.getExternalSubtitles();
            expect(subtitles.size).to.equal(1);
        })
    })

});
