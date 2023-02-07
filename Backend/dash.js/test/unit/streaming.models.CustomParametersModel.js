import CustomParametersModel from '../../src/streaming/models/CustomParametersModel';
import Constants from '../../src/streaming/constants/Constants';


const chai = require('chai');
const expect = chai.expect;

describe('CustomParametersModel', function () {
    const context = {};

    let customParametersModel = CustomParametersModel(context).getInstance();

    beforeEach(() => {
        customParametersModel.reset();
    });

    it('Method removeUTCTimingSource should throw an exception',  () => {
        expect(customParametersModel.removeUTCTimingSource.bind(customParametersModel, true, 'string')).to.throw(Constants.BAD_ARGUMENT_ERROR);
        expect(customParametersModel.removeUTCTimingSource.bind(customParametersModel, 1, 'string')).to.throw(Constants.BAD_ARGUMENT_ERROR);
        expect(customParametersModel.removeUTCTimingSource.bind(customParametersModel, 'string', true)).to.throw(Constants.BAD_ARGUMENT_ERROR);
        expect(customParametersModel.removeUTCTimingSource.bind(customParametersModel, 'string', 1)).to.throw(Constants.BAD_ARGUMENT_ERROR);
        expect(customParametersModel.removeUTCTimingSource.bind(customParametersModel, true, true)).to.throw(Constants.BAD_ARGUMENT_ERROR);
        expect(customParametersModel.removeUTCTimingSource.bind(customParametersModel, 1, 1)).to.throw(Constants.BAD_ARGUMENT_ERROR);
    });

    it('Method addUTCTimingSource should throw an exception',  () => {
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

});
