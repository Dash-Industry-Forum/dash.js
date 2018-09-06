import BaseURLTreeModel from '../../src/streaming/models/BaseURLTreeModel';

import DashManifestModelMock from './mocks/DashManifestModelMock';

const chai = require('chai');
const expect = chai.expect;

describe('BaseURLTreeModel', function () {
    const context = {};
    const baseURLTreeModel = BaseURLTreeModel(context).create();
    const dashManifestModelMock = new DashManifestModelMock();

    it('should throw an error if setConfig has not been called', function () {
        expect(baseURLTreeModel.update.bind(baseURLTreeModel)).to.throw('setConfig function has to be called previously');
    });

    it('should not throw an error if manifest is undefined', function () {
        baseURLTreeModel.setConfig({dashManifestModel: dashManifestModelMock});
        expect(baseURLTreeModel.update.bind(baseURLTreeModel)).to.not.throw();
    });
});