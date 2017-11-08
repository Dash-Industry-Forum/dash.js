import DRMToday from '../../src/streaming/protection/servers/DRMToday';

const expect = require('chai').expect;

const context = {};
let drmToday;

describe('DRMToday', function () {
    it('should throw an exception when attempting to call getLicenseMessage While the config attribute has not been set properly', function () {
        drmToday = DRMToday(context).getInstance();
        expect(drmToday.getLicenseMessage.bind(drmToday)).to.throw('Missing config parameter(s)');
    });

    it('should throw an exception when attempting to call getLicenseMessage While the config attribute has not been set properly', function () {
        drmToday = DRMToday(context).getInstance({});
        expect(drmToday.getLicenseMessage.bind(drmToday)).to.throw('Missing config parameter(s)');
    });
});