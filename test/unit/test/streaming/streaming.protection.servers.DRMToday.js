import DRMToday from '../../../../src/streaming/protection/servers/DRMToday.js';
import {expect} from 'chai';

const context = {};
let drmToday;

describe('DRMToday', function () {
    it('should throw an exception when attempting to call getLicenseMessage While the config attribute has not been set properly', function () {
        drmToday = DRMToday(context).getInstance();
        expect(drmToday.getLicenseMessage.bind(drmToday)).to.throw('Missing config parameter(s)');
    });
});
