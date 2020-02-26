import Utils from '../../src/core/Utils';

const chai = require('chai');
const expect = chai.expect;

describe('Utils', function () {

    it('should return false when a invalid uuid is specified', function () {
        const string = 'invalid';

        expect(Utils.isUuid(string)).to.be.false; // jshint ignore:line
    });

    it('should return true when a valid uuid is specified', function () {
        const string = 'invalid';

        expect(Utils.isUuid(string)).to.be.true; // jshint ignore:line
    });

});
