import BaseURLTreeModel from '../../src/streaming/models/BaseURLTreeModel';
import DashParser from '../../src/dash/parser/DashParser';

import AdapterMock from './mocks/AdapterMock';

const fs = require('fs');
const chai = require('chai');
const jsdom = require('jsdom').JSDOM;
const expect = chai.expect;

describe('BaseURLTreeModel', function () {
    const context = {};
    const baseURLTreeModel = BaseURLTreeModel(context).create();
    const adapterMock = new AdapterMock();

    beforeEach(function () {
        if (typeof window === 'undefined') {
            global.window = {
                performance: {
                    now: function () {
                        return Date.now();
                    }
                },
                DOMParser: new jsdom().window.DOMParser
            };
        }
    });

    afterEach(function () {
        delete global.window;
    });

    it('should throw an error if setConfig has not been called', function () {
        expect(baseURLTreeModel.update.bind(baseURLTreeModel)).to.throw('setConfig function has to be called previously');
    });

    it('should not throw an error if manifest is undefined', function () {
        baseURLTreeModel.setConfig({adapter: adapterMock});
        expect(baseURLTreeModel.update.bind(baseURLTreeModel)).to.not.throw();
    });

    it('should not throw an error if manifest is not well defined', function () {
        baseURLTreeModel.setConfig({adapter: adapterMock});
        expect(baseURLTreeModel.update.bind(baseURLTreeModel, {})).to.not.throw();
    });

    it('should return an empty array if a test manifest is well defined', function () {
        baseURLTreeModel.setConfig({adapter: adapterMock});
        let parser = DashParser(context).create();
        let xml = fs.readFileSync(__dirname + '/data/dash/manifest.xml', 'utf8');
        const manifest = parser.parse(xml);
        expect(baseURLTreeModel.update.bind(baseURLTreeModel, manifest)).to.not.throw();
        let nodes = baseURLTreeModel.getForPath();
        expect(nodes).to.be.instanceOf(Array);    // jshint ignore:line
        expect(nodes).to.be.empty;                // jshint ignore:line
        nodes = baseURLTreeModel.getForPath(['./']);
        expect(nodes).to.be.instanceOf(Array);    // jshint ignore:line
        expect(nodes).to.be.empty;                // jshint ignore:line
    });
});