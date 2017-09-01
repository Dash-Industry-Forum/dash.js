import DashParser from '../../src/dash/parser/DashParser';

const expect = require('chai').expect;

const context = {};
const dashParser = DashParser(context).create({});

describe('DashParser', function () {

	it('should throw an error when parse is called and config object has not been set properly', function () {
        expect(dashParser.parse.bind('')).to.be.throw('Missing config parameter(s)');
    });

});