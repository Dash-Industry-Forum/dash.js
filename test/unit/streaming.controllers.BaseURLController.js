import BaseURLController from '../../src/streaming/controllers/BaseURLController';
import BasicSelector from '../../src/streaming/utils/baseUrlResolution/BasicSelector';
import BaseURLSelector from '../../src/streaming/utils/BaseURLSelector';
import BaseURL from '../../src/dash/vo/BaseURL';

const chai = require('chai');
const expect = chai.expect;

const context = {};

const SERVICE_LOCATION_A = 'a';
const SERVICE_LOCATION_B = 'b';

const dummyBaseURLTreeModel = {
    getForPath: () => {
        return [{
            baseUrls: [
                new BaseURL('http://www.example.com/', SERVICE_LOCATION_A)
            ],
            selectedIdx: NaN
        }, {
            baseUrls: [
                new BaseURL('http://www2.example.com/', SERVICE_LOCATION_B)
            ],
            selectedIdx: NaN
        }];
    }
};

const dummyBlacklistController = {
    contains: sl => sl == SERVICE_LOCATION_B
};

describe('BaseURLController', function () {

    it('should return undefined if resolution fails at any level', () => {

        const basicSelector = BasicSelector(context).create({
            blacklistController: dummyBlacklistController
        });

        const baseURLSelector = BaseURLSelector(context).create();
        baseURLSelector.setConfig({
            selector: basicSelector
        });

        const baseURLController = BaseURLController(context).getInstance();
        baseURLController.setConfig({
            baseURLTreeModel: dummyBaseURLTreeModel,
            baseURLSelector: baseURLSelector
        });

        const selected = baseURLController.resolve();

        expect(selected).to.be.undefined; // jshint ignore:line
    });
});
