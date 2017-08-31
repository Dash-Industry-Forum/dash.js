import DOMStorage from '../../src/streaming/utils/DOMStorage';

const expect = require('chai').expect;

const context = {};
const domStorage = DOMStorage(context).getInstance({});

describe('DOMStorage', function () {
    it('should throw an error when getSavedBitrateSettings is called and config object has not been set properly', function () {
        expect(domStorage.getSavedBitrateSettings.bind('video')).to.be.throw('Missing config parameter(s)');
    });

    it('should throw an error when getSavedMediaSettings is called and config object has not been set properly', function () {
        expect(domStorage.getSavedMediaSettings.bind('video')).to.be.throw('Missing config parameter(s)');
    });
});