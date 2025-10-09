import DVBSelector from '../../../../src/streaming/utils/baseUrlResolution/DVBSelector.js';
import ObjectsHelper from '../../helpers/ObjectsHelper.js';

import chai from 'chai';
const expect = chai.expect;
import sinon from 'sinon';

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

        expect(selected).to.be.undefined;
    });

    it('should return undefined when the input is empty', () => {
        const dvbSelector = DVBSelector(context).create(defaultConfig);
        const selected = dvbSelector.select([]);

        expect(selected).to.be.undefined;
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

        expect(selected).to.be.undefined;
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

        expect(selected).to.equal(entryA);
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

        expect(selected).to.equal(entryB);
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

        expect(selected).to.be.undefined;
    });

    it('should select baseUrls as defined in the example in DVB A168 10.8.2.4', () => {
        const baseUrls = [
            { dvbPriority: 1, dvbWeight: 10, serviceLocation: 'A' },
            { dvbPriority: 1, dvbWeight: 30, serviceLocation: 'B' },
            { dvbPriority: 1, dvbWeight: 60, serviceLocation: 'C' },
            { dvbPriority: 3, dvbWeight: 1, serviceLocation: 'C' },
            { dvbPriority: 4, dvbWeight: 1, serviceLocation: 'B' },
            { dvbPriority: 5, dvbWeight: 1, serviceLocation: 'D' },
            { dvbPriority: 5, dvbWeight: 1, serviceLocation: 'E' }
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
        expect(firstSelection.dvbPriority).to.equal(1);
        expect(firstSelection.serviceLocation).to.equal('B');

        blacklist.push(firstSelection.serviceLocation);

        const secondSelection = dvbSelector.select(baseUrls);
        expect(secondSelection.dvbPriority).to.equal(3);
        expect(secondSelection.serviceLocation).to.equal('C');

        // Math.random (called in select()) will return 1
        stub.returns(1);

        blacklist.push(secondSelection.serviceLocation);

        const thirdSelection = dvbSelector.select(baseUrls);
        expect(thirdSelection.dvbPriority).to.equal(5);
        expect(thirdSelection.serviceLocation).to.equal('E');

        blacklist.push(thirdSelection.serviceLocation);

        const fourthSelection = dvbSelector.select(baseUrls);
        expect(fourthSelection).to.be.undefined;
    });

    it('should not select baseUrls with invalid priority when there is another option', () => {
        const baseUrls = [
            { serviceLocation: 'A', dvbPriority: 1, dvbWeight: 1 },
            { serviceLocation: 'B', dvbPriority: 'STRING', dvbWeight: 100000000 }
        ];

        const dvbSelector = DVBSelector(context).create(defaultConfig);
        const firstSelection = dvbSelector.select(baseUrls);

        expect(firstSelection.serviceLocation).to.equal('A');
    });

    it('should select baseUrls with invalid priority if there is no other option', () => {
        const baseUrls = [
            { serviceLocation: 'B', dvbPriority: 'STRING', dvbWeight: 1 }
        ];

        const dvbSelector = DVBSelector(context).create(defaultConfig);
        const firstSelection = dvbSelector.select(baseUrls);

        expect(firstSelection.serviceLocation).to.equal('B');
    });
});
