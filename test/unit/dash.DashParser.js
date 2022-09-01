import DashParser from '../../src/dash/parser/DashParser';
import DebugMock from './mocks/DebugMock';
import DashManifestModel from '../../src/dash/models/DashManifestModel';

import ErrorHandlerMock from './mocks/ErrorHandlerMock';

const expect = require('chai').expect;
const fs = require('fs');
const jsdom = require('jsdom').JSDOM;

const context = {};

let dashParser = DashParser(context).create({debug: new DebugMock()});
const errorHandlerMock = new ErrorHandlerMock();
const dashManifestModel = DashManifestModel(context).getInstance();

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
        let manifest = fs.readFileSync(__dirname + '/data/dash/manifest_error.xml', 'utf8');
        expect(dashParser.parse.bind(manifest)).to.be.throw('parsing the manifest failed');
    });

    it('should return an Object when parse is called with correct data', function () {
        let manifest = fs.readFileSync(__dirname + '/data/dash/manifest.xml', 'utf8');
        expect(dashParser.parse.bind(manifest)).to.be.instanceOf(Object);   // jshint ignore:line
    });

    describe('DashParser matchers', function () {
        beforeEach(function () {
            dashManifestModel.setConfig({
                errHandler: errorHandlerMock
            });
        });

        let manifest = fs.readFileSync(__dirname + '/data/dash/manifest.xml', 'utf8');

        it('should return normalized language tag', function () {
            let parsedMpd = dashParser.parse(manifest);
            let audioAdaptationsArray = dashManifestModel.getAdaptationsForType(parsedMpd, 0, 'audio');

            expect(audioAdaptationsArray).to.be.instanceOf(Array);      // jshint ignore:line
            expect(audioAdaptationsArray.length).to.equal(1);           // jshint ignore:line
            expect(dashManifestModel.getLanguageForAdaptation(audioAdaptationsArray[0])).to.equal('es');  // jshint ignore:line
        });

        it('should return normalized language tages for labels on AdaptationSets', function () {
            let parsedMpd = dashParser.parse(manifest);
            let audioAdaptation = dashManifestModel.getAdaptationsForType(parsedMpd, 0, 'audio')[0];
            let labelArray = dashManifestModel.getLabelsForAdaptation(audioAdaptation);

            expect(labelArray).to.be.instanceOf(Array);      // jshint ignore:line
            expect(labelArray.length).to.equal(2);           // jshint ignore:line
            expect(labelArray[1].lang).to.equal('fr');       // jshint ignore:line
        });
    });
});
