import BaseURLTreeModel from '../../src/streaming/models/BaseURLTreeModel';

const chai = require('chai');
const expect = chai.expect;

describe('BaseURLTreeModel', function () {
    const context = {};
    const baseURLTreeModel = BaseURLTreeModel(context).create();

    it('should throw an error if setConfig has not been called', function () {
        expect(baseURLTreeModel.update.bind()).to.throw('setConfig function has to be called previously');
    });
});