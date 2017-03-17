import ObjectsHelper from './helpers/ObjectsHelper';
import BasicSelector from '../src/streaming/utils/baseUrlResolution/BasicSelector';

const chai = require('chai');
const expect = chai.expect;

const objectsHelper = new ObjectsHelper();

const defaultConfig = {
    blacklistController: objectsHelper.getDummyBlacklistController()
};

const context = {};

const SERVICE_LOCATION_A = 'A';
const SERVICE_LOCATION_B = 'B';

const entryA = { serviceLocation: SERVICE_LOCATION_A };
const entryB = { serviceLocation: SERVICE_LOCATION_B };

describe('BaseURLResolution/BasicSelector', function () {

    it('should return undefined when the input is undefined', () => {
        const basicSelector = BasicSelector(context).create(defaultConfig);
        const selected = basicSelector.select(undefined);

        expect(selected).to.be.undefined; // jshint ignore:line
    });

    it('should return undefined when the input is empty', () => {
        const basicSelector = BasicSelector(context).create(defaultConfig);
        const selected = basicSelector.select([]);

        expect(selected).to.be.undefined; // jshint ignore:line
    });

    it('should return undefined when the blacklist contains the requested serviceLocation', () => {
        const containsServiceLocationABlacklistController = {
            contains: input => input === SERVICE_LOCATION_A
        };
        const config = {
            blacklistController: containsServiceLocationABlacklistController
        };

        const basicSelector = BasicSelector(context).create(config);

        const selected = basicSelector.select([entryA]);

        expect(selected).to.be.undefined; // jshint ignore:line
    });

    it('should return the first entry in the list when the blacklist does not contain the requested serviceLocation', () => {

        const containsServiceLocationBBlacklistController = {
            contains: input => input === SERVICE_LOCATION_B
        };
        const config = {
            blacklistController: containsServiceLocationBBlacklistController
        };

        const basicSelector = BasicSelector(context).create(config);

        const selected = basicSelector.select([
            entryA,
            entryB
        ]);

        expect(selected).to.equal(entryA); // jshint ignore:line
    });

    it('should return the next entry in the list when the blacklist contains the serviceLocation of the first', () => {
        const containsServiceLocationABlacklistController = {
            contains: input => input === SERVICE_LOCATION_A
        };
        const config = {
            blacklistController: containsServiceLocationABlacklistController
        };

        const basicSelector = BasicSelector(context).create(config);

        const selected = basicSelector.select([
            entryA,
            entryB
        ]);

        expect(selected).to.equal(entryB); // jshint ignore:line
    });

    it('should return undefined when the blacklist contains all the serviceLocations', () => {
        const containsServiceLocationAAndBBlacklistController = {
            contains: input => input === SERVICE_LOCATION_A || input === SERVICE_LOCATION_B
        };
        const config = {
            blacklistController: containsServiceLocationAAndBBlacklistController
        };

        const basicSelector = BasicSelector(context).create(config);

        const selected = basicSelector.select([
            entryA,
            entryB
        ]);

        expect(selected).to.be.undefined; // jshint ignore:line
    });
});
