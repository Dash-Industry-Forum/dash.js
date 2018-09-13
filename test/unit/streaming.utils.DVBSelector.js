import DVBSelector from '../../src/streaming/utils/baseUrlResolution/DVBSelector';

import ObjectsHelper from './helpers/ObjectsHelper';

const chai = require('chai');
const expect = chai.expect;
const sinon = require('sinon');

const context = {};
const objectsHelper = new ObjectsHelper();

const defaultConfig = {
    blacklistController: objectsHelper.getDummyBlacklistController()
};

const SERVICE_LOCATION_A = 'A';
const SERVICE_LOCATION_B = 'B';

const entryA = { serviceLocation: SERVICE_LOCATION_A };
const entryB = { serviceLocation: SERVICE_LOCATION_B };

describe('BaseURLResolution/DVBSelector', function () {
    it('should return undefined when the input is undefined', () => {
        const dvbSelector = DVBSelector(context).create(defaultConfig);
        const selected = dvbSelector.select(undefined);

        expect(selected).to.be.undefined; // jshint ignore:line
    });

    it('should return undefined when the input is empty', () => {
        const dvbSelector = DVBSelector(context).create(defaultConfig);
        const selected = dvbSelector.select([]);

        expect(selected).to.be.undefined; // jshint ignore:line
    });

    it('should return undefined when the blacklist contains the requested serviceLocation', () => {
        const containsServiceLocationABlacklistController = {
            contains: input => input === SERVICE_LOCATION_A
        };
        const config = {
            blacklistController: containsServiceLocationABlacklistController
        };

        const dvbSelector = DVBSelector(context).create(config);

        const selected = dvbSelector.select([entryA]);

        expect(selected).to.be.undefined; // jshint ignore:line
    });

    it('should return the first entry in the list when the blacklist does not contain the requested serviceLocation', () => {

        const containsServiceLocationBBlacklistController = {
            contains: input => input === SERVICE_LOCATION_B
        };
        const config = {
            blacklistController: containsServiceLocationBBlacklistController
        };

        const dvbSelector = DVBSelector(context).create(config);

        const selected = dvbSelector.select([
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

        const dvbSelector = DVBSelector(context).create(config);

        const selected = dvbSelector.select([
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

        const dvbSelector = DVBSelector(context).create(config);

        const selected = dvbSelector.select([
            entryA,
            entryB
        ]);

        expect(selected).to.be.undefined; // jshint ignore:line
    });

    it('should select baseUrls as defined in the example in DVB A168 10.8.2.4', () => {
        const baseUrls = [
            { dvb_priority: 1,  dvb_weight: 10, serviceLocation: 'A' },
            { dvb_priority: 1,  dvb_weight: 30, serviceLocation: 'B' },
            { dvb_priority: 1,  dvb_weight: 60, serviceLocation: 'C' },
            { dvb_priority: 3,  dvb_weight: 1,  serviceLocation: 'C' },
            { dvb_priority: 4,  dvb_weight: 1,  serviceLocation: 'B' },
            { dvb_priority: 5,  dvb_weight: 1,  serviceLocation: 'D' },
            { dvb_priority: 5,  dvb_weight: 1,  serviceLocation: 'E' }
        ];

        // we need Math.random to be completely unrandom
        const stub = sinon.stub(Math, 'random');

        const blacklist = [];
        const blacklistController = {
            contains: input => blacklist.indexOf(input) !== -1
        };

        const config = {
            blacklistController: blacklistController
        };

        const dvbSelector = DVBSelector(context).create(config);

        // Math.random (called in select()) will return 0.3
        stub.returns(0.3);

        const firstSelection = dvbSelector.select(baseUrls);
        expect(firstSelection.dvb_priority).to.equal(1);        // jshint ignore:line
        expect(firstSelection.serviceLocation).to.equal('B');   // jshint ignore:line

        blacklist.push(firstSelection.serviceLocation);

        const secondSelection = dvbSelector.select(baseUrls);
        expect(secondSelection.dvb_priority).to.equal(3);       // jshint ignore:line
        expect(secondSelection.serviceLocation).to.equal('C');  // jshint ignore:line

        // Math.random (called in select()) will return 1
        stub.returns(1);

        blacklist.push(secondSelection.serviceLocation);

        const thirdSelection = dvbSelector.select(baseUrls);
        expect(thirdSelection.dvb_priority).to.equal(5);        // jshint ignore:line
        expect(thirdSelection.serviceLocation).to.equal('E');   // jshint ignore:line

        blacklist.push(thirdSelection.serviceLocation);

        const fourthSelection = dvbSelector.select(baseUrls);
        expect(fourthSelection).to.be.undefined;                // jshint ignore:line
    });

    it('should not select baseUrls with invalid priority when there is another option', () => {
        const baseUrls = [
            { serviceLocation: 'A', dvb_priority: 1,        dvb_weight: 1 },
            { serviceLocation: 'B', dvb_priority: 'STRING', dvb_weight: 100000000 }
        ];

        const dvbSelector = DVBSelector(context).create(defaultConfig);
        const firstSelection = dvbSelector.select(baseUrls);

        expect(firstSelection.serviceLocation).to.equal('A');   // jshint ignore:line
    });

    it('should select baseUrls with invalid priority if there is no other option', () => {
        const baseUrls = [
            { serviceLocation: 'B', dvb_priority: 'STRING', dvb_weight: 1 }
        ];

        const dvbSelector = DVBSelector(context).create(defaultConfig);
        const firstSelection = dvbSelector.select(baseUrls);

        expect(firstSelection.serviceLocation).to.equal('B');   // jshint ignore:line
    });
});
