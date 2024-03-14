import BaseURLSelector from '../../src/streaming/utils/BaseURLSelector.js';
import Constants from '../../src/streaming/constants/Constants.js';

import {expect} from 'chai';

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
