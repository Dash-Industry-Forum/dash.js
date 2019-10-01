import BaseURLSelector from '../../src/streaming/utils/BaseURLSelector';
import Constants from '../../src/streaming/constants/Constants';

const expect = require('chai').expect;

const context = {};
const baseURLSelector = BaseURLSelector(context).create();

describe('BaseURLSelector', function () {
    it('should throw an error when chooseSelector is called and parameter is not a boolean', function () {
        expect(baseURLSelector.chooseSelector.bind()).to.be.throw(Constants.BAD_ARGUMENT_ERROR);
    });

    it('should return an undefined selector when select is called with no data parameter', function () {
        const selector = baseURLSelector.select();

        expect(selector).to.be.undefined; // jshint ignore:line
    });
});