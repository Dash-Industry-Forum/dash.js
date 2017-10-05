import DRMToday from '../../src/streaming/protection/servers/DRMToday';

const expect = require('chai').expect;

const context = {};
const drmToday = DRMToday(context).getInstance({});

describe('DRMToday', function () {
    it('should throw an exception when attempting to call getLicenseMessage While the config attribute has not been set properly', function () {
        expect(drmToday.getLicenseMessage.bind(drmToday)).to.throw('Missing config parameter(s)');
    });
});