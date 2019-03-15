import DOMStorage from '../../src/streaming/utils/DOMStorage';
import Constants from '../../src/streaming/constants/Constants';
import Settings from '../../src/core/Settings';

const expect = require('chai').expect;

let context = {};
let domStorage;
const settings = Settings(context).getInstance();

describe('DOMStorage', function () {
    describe('Not well initialized', function () {
        beforeEach(function () {
            domStorage = DOMStorage(context).getInstance({});
        });

        afterEach(function () {
            domStorage = null;
            context = {};
        });

        it('should throw an error when getSavedBitrateSettings is called and config object has not been set properly', function () {
            expect(domStorage.getSavedBitrateSettings.bind('video')).to.be.throw(Constants.MISSING_CONFIG_ERROR);
        });

        it('should throw an error when getSavedMediaSettings is called and config object has not been set properly', function () {
            expect(domStorage.getSavedMediaSettings.bind('video')).to.be.throw(Constants.MISSING_CONFIG_ERROR);
        });
    });

    describe('Well initialized and window is unknown', function () {
        beforeEach(function () {
            domStorage = DOMStorage(context).getInstance({settings: settings});
        });

        afterEach(function () {
            domStorage = null;
            context = {};
        });

        it('should return NaN when getSavedBitrateSettings is called and config object has been set properly', function () {
            const savedBitrateSettings = domStorage.getSavedBitrateSettings('video');
            expect(savedBitrateSettings).to.be.NaN; // jshint ignore:line
        });

        it('should return null when getSavedMediaSettings is called and config object has been set properly', function () {
            const savedMediaSettings = domStorage.getSavedMediaSettings('video');
            expect(savedMediaSettings).to.be.null; // jshint ignore:line
        });
    });

    describe('Well initialized and window is defined', function () {
        beforeEach(function () {
            if (typeof window === 'undefined') {
                global.window = {
                    localStorage: {setItem() {},
                                   removeItem() {},
                                   getItem() {return null;}}
                };

                global.localStorage = {setItem() {},
                    removeItem() {},
                    getItem() {return null;}
                };
            }
            domStorage = DOMStorage(context).getInstance({settings: settings});
        });

        afterEach(function () {
            domStorage = null;
            context = {};
        });

        it('should return NaN when getSavedBitrateSettings is called and config object has been set properly', function () {
            const savedBitrateSettings = domStorage.getSavedBitrateSettings('video');
            expect(savedBitrateSettings).to.be.NaN; // jshint ignore:line
        });

        it('should return null when getSavedMediaSettings is called and config object has been set properly', function () {
            const savedMediaSettings = domStorage.getSavedMediaSettings('video');
            expect(savedMediaSettings).to.be.undefined; // jshint ignore:line
        });
    });
});