import MetricSerialiser from '../../src/streaming/metrics/utils/MetricSerialiser.js';

const expect = require('chai').expect;

const context = {};
const metricSerialiser = MetricSerialiser(context).getInstance();

describe('MetricSerialiser', function () {

    describe('serialise', () => {
        it('should correctly serialise a List', () => {
            const list = {'key': [{'a': 'x'}, {'b': 'y'}]};
            const expected = 'key=a%3Dx,b%3Dy';

            const actual = metricSerialiser.serialise(list);

            expect(actual).to.equal(expected); // jshint ignore:line
        });

        it('should not serialise keys starting with _', () => {
            const entry = {'_key': 'value'};
            const expected = '';

            const actual = metricSerialiser.serialise(entry);

            expect(actual).to.equal(expected); // jshint ignore:line
        });
    });
});
