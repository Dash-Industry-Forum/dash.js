import Settings from '../../src/core/Settings';
import Constants from '../../src/streaming/constants/Constants';

const chai = require('chai');
const expect = chai.expect;
const context = {};


let settings = Settings(context).getInstance();
describe('Settings', function () {


    beforeEach(function () {
        settings.reset();
    });

    describe('get()', function () {

        it('get settings object', function () {
            const set = settings.get();

            expect(set).to.have.property('streaming');
            expect(set).to.have.property('debug');
        })

        it('get default settings object', function () {
            const set = settings.get(Constants.SETTINGS_TYPES.DEFAULT);

            expect(set).to.have.property('streaming');
            expect(set).to.have.property('debug');
        })

        it('get application settings object', function () {
            const set = settings.get(Constants.SETTINGS_TYPES.APP);

            expect(set).to.not.have.property('streaming');
            expect(set).to.not.have.property('debug');
        })

        it('get MPD settings object', function () {
            const set = settings.get(Constants.SETTINGS_TYPES.MPD);

            expect(set).to.not.have.property('streaming');
            expect(set).to.not.have.property('debug');
        })

        it('return default settings object if invalid type is specified', function () {
            const set = settings.get('invalidType');

            expect(set).to.have.property('streaming');
            expect(set).to.have.property('debug');
        })

    })

    describe('update() and get()', function () {

        it('should update a simple attribute', function () {
            settings.update({ streaming: { abandonLoadTimeout: 5 } })

            expect(settings.get().streaming.abandonLoadTimeout).to.equal(5);
        })

        it('should update a nested attribute', function () {
            settings.update({ streaming: { capabilities: { filterUnsupportedEssentialProperties: false } } })

            expect(settings.get().streaming.capabilities.filterUnsupportedEssentialProperties).to.equal(false);
        })

        it('should set a nested attribute to null', function () {
            settings.update({ streaming: { capabilities: { filterUnsupportedEssentialProperties: null } } })

            expect(settings.get().streaming.capabilities.filterUnsupportedEssentialProperties).to.be.null
        })

        it('should not overwrite an object with a single value', function () {
            settings.update({ streaming: 1 })

            expect(settings.get().streaming).to.have.property('capabilities');
        })

        it('should overwrite MPD settings', function () {
            settings.update({ streaming: { abandonLoadTimeout: 5 } }, Constants.SETTINGS_TYPES.MPD);

            expect(settings.get().streaming.abandonLoadTimeout).to.equal(5);
        })

        it('should return undefined if type is set to app and only MPD settings are defined', function () {
            settings.update({ streaming: {} }, Constants.SETTINGS_TYPES.MPD);

            expect(settings.get(Constants.SETTINGS_TYPES.APP).streaming).to.be.undefined;
        })

        it('should return undefined if type is set to MPD and only app settings are defined', function () {
            settings.update({ streaming: {} }, Constants.SETTINGS_TYPES.APP);

            expect(settings.get(Constants.SETTINGS_TYPES.MPD).streaming).to.be.undefined;
        })

        it('should return undefined for both MPD and APP types if no value defined', function () {
            expect(settings.get(Constants.SETTINGS_TYPES.APP).streaming).to.be.undefined;
            expect(settings.get(Constants.SETTINGS_TYPES.MPD).streaming).to.be.undefined;
        })

        it('should overwrite MPD and app settings and prefer app settings', function () {
            settings.update({ streaming: { abandonLoadTimeout: 5 } }, Constants.SETTINGS_TYPES.MPD);
            settings.update({ streaming: { abandonLoadTimeout: 10 } }, Constants.SETTINGS_TYPES.APP);

            expect(settings.get().streaming.abandonLoadTimeout).to.equal(10);
        })

        it('should overwrite MPD and app settings and prefer app settings for multi nested object', function () {
            settings.update({ streaming: { delay: {liveDelay: 5}  } }, Constants.SETTINGS_TYPES.MPD);
            settings.update({ streaming: { delay: {liveDelay: 10}  } }, Constants.SETTINGS_TYPES.APP);

            expect(settings.get().streaming.delay.liveDelay).to.equal(10);
        })

        it('should not add an attribute that is missing in the default config', function () {
            settings.update({ streaming: { customAttribute: 5 } }, Constants.SETTINGS_TYPES.MPD);
            settings.update({ streaming: { customAttribute: 10 } }, Constants.SETTINGS_TYPES.APP);
            settings.update({ streaming: { customAttribute: 15 } });

            expect(settings.get().streaming.customAttribute).to.be.undefined;
        })
    })

    describe('reset()', function () {

        it('Should reset settings for app and MPD', function () {
            settings.update({ streaming: { abandonLoadTimeout: 5 } }, Constants.SETTINGS_TYPES.MPD);
            settings.update({ streaming: { abandonLoadTimeout: 10 } }, Constants.SETTINGS_TYPES.APP);
            settings.reset();

            expect(settings.get().streaming.abandonLoadTimeout).to.not.equal(10);
            expect(settings.get().streaming.abandonLoadTimeout).to.not.equal(5);
        })
    })

});
