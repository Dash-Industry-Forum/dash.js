import MetricsModel from '../../src/streaming/models/MetricsModel';

const chai = require('chai');
const expect = chai.expect;

describe('MetricsModel', function () {
    const context = {};
    const metricsModel = MetricsModel(context).getInstance();

    beforeEach(function () {
        metricsModel.clearAllCurrentMetrics();
    });

    it('should return null when getMetricsFor is called and type is undefined', function () {
        const metrics = metricsModel.getMetricsFor();

        expect(metrics).to.be.null;                // jshint ignore:line
    });

    it('should return an empty MetricsList when getMetricsFor is called and type is defined', function () {
        const metrics = metricsModel.getMetricsFor('video');

        expect(metrics.TcpList).to.be.instanceOf(Array); // jshint ignore:line
        expect(metrics.TcpList).to.be.empty; // jshint ignore:line
    });

    it('should return null when getMetricsFor is called and type is defined and readOnly is true', function () {
        const metrics = metricsModel.getMetricsFor('video', true);

        expect(metrics).to.be.null;                // jshint ignore:line
    });
});