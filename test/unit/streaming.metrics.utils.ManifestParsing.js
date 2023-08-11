import ManifestParsing from '../../src/streaming/metrics/utils/ManifestParsing.js';
import AdapterMock from './mocks/AdapterMock.js';

import {expect} from 'chai';

const context = {};
const manifestParsing = ManifestParsing(context).getInstance({
    adapter: new AdapterMock()
});

describe('ManifestParsing', function () {

    describe('getMetrics', () => {
        it('should return an empty array if no manifest is used', () => {
            const metrics = manifestParsing.getMetrics();

            expect(metrics).to.be.instanceOf(Array);
            expect(metrics).to.be.empty;
        });
    });
});
