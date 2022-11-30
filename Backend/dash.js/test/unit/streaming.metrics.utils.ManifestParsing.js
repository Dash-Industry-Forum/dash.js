import ManifestParsing from '../../src/streaming/metrics/utils/ManifestParsing';
import AdapterMock from './mocks/AdapterMock';

const expect = require('chai').expect;

const context = {};
const manifestParsing = ManifestParsing(context).getInstance({
    adapter: new AdapterMock()
});

describe('ManifestParsing', function () {

    describe('getMetrics', () => {
        it('should return an empty array if no manifest is used', () => {
            const metrics = manifestParsing.getMetrics();

            expect(metrics).to.be.instanceOf(Array);    // jshint ignore:line
            expect(metrics).to.be.empty;                // jshint ignore:line
        });
    });
});
