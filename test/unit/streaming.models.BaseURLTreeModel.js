import BaseURLTreeModel from '../../src/streaming/models/BaseURLTreeModel';
import DashParser from '../../src/dash/parser/DashParser';

import AdapterMock from './mocks/AdapterMock';
import ContentSteeringControllerMock from './mocks/ContentSteeringControllerMock';
import DebugMock from './mocks/DebugMock';
import FileLoader from './helpers/FileLoader';

const chai = require('chai');
const expect = chai.expect;

describe('BaseURLTreeModel', function () {
    const context = {};
    const baseURLTreeModel = BaseURLTreeModel(context).create();
    const adapterMock = new AdapterMock();
    const contentSteeringControllerMock = new ContentSteeringControllerMock();

    it('should throw an error if setConfig has not been called', function () {
        expect(baseURLTreeModel.update.bind(baseURLTreeModel)).to.throw('setConfig function has to be called previously');
    });

    it('should not throw an error if manifest is undefined', function () {
        baseURLTreeModel.setConfig({adapter: adapterMock, contentSteeringController: contentSteeringControllerMock});
        expect(baseURLTreeModel.update.bind(baseURLTreeModel)).to.not.throw();
    });

    it('should not throw an error if manifest is not well defined', function () {
        baseURLTreeModel.setConfig({adapter: adapterMock, contentSteeringController: contentSteeringControllerMock});
        expect(baseURLTreeModel.update.bind(baseURLTreeModel, {})).to.not.throw();
    });

    it('should return an empty array if a test manifest is well defined', async () => {
        baseURLTreeModel.setConfig({adapter: adapterMock, contentSteeringController: contentSteeringControllerMock});
        let parser = DashParser(context).create({debug: new DebugMock()});
        let xml = await FileLoader.loadTextFile('/data/dash/manifest.xml');
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
