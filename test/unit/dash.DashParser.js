import DashParser from '../../src/dash/parser/DashParser';

const expect = require('chai').expect;
const jsdom = require('jsdom').JSDOM;

const context = {};

let dashParser = DashParser(context).create();

describe('DashParser', function () {

    beforeEach(function () {
        if (typeof window === 'undefined') {
            global.window = {
                performance: {
                    now: function () {
                        return Date.now();
                    }
                },
                DOMParser:  new jsdom().window.DOMParser
            };
        }
    });

    afterEach(function () {
        delete global.window;
    });

    it('should throw an error when parse is called without data and config object has been set properly', function () {
        expect(dashParser.parse.bind('')).to.be.throw('parsing the manifest failed');
    });

    it('should throw an error when parse is called with invalid data', function () {
        expect(dashParser.parse.bind('<MPD')).to.be.throw('parsing the manifest failed');
    });
});