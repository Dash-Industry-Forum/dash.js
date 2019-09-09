import MetricsModel from '../../src/streaming/models/MetricsModel';
import Events from '../../src/core/events/Events';
import EventBus from '../../src/core/EventBus';
import Settings from '../../src/core/Settings';
import Constants from '../../src/streaming/constants/Constants';

const chai = require('chai');
const expect = chai.expect;

describe('MetricsModel', function () {
    const context = {};
    const settings = Settings(context).getInstance();
    const metricsModel = MetricsModel(context).getInstance({settings: settings});
    const eventBus = EventBus(context).getInstance();

    beforeEach(function () {
        metricsModel.clearAllCurrentMetrics();
    });

    it('should return null when getMetricsFor is called and type is undefined', function () {
        const metrics = metricsModel.getMetricsFor();

        expect(metrics).to.be.null;                // jshint ignore:line
    });

    it('should return an empty MetricsList when getMetricsFor is called and type is defined', function () {
        const metrics = metricsModel.getMetricsFor(Constants.VIDEO);

        expect(metrics.TcpList).to.be.instanceOf(Array); // jshint ignore:line
        expect(metrics.TcpList).to.be.empty; // jshint ignore:line
    });

    it('should return null when getMetricsFor is called and type is defined and readOnly is true', function () {
        const metrics = metricsModel.getMetricsFor(Constants.VIDEO, true);

        expect(metrics).to.be.null;                // jshint ignore:line
    });

    it('should not trigger METRIC_ADDED event when addDroppedFrames is called and quality is undefined', function () {
        let spy = chai.spy();
        eventBus.on(Events.METRIC_ADDED, spy);

        metricsModel.addDroppedFrames(Constants.VIDEO);
        expect(spy).to.have.not.been.called; // jshint ignore:line

        eventBus.off(Events.METRIC_ADDED, spy);
    });

    it('should trigger METRIC_ADDED event when addDroppedFrames is called and quality is defined', function () {
        let spy = chai.spy();
        eventBus.on(Events.METRIC_ADDED, spy);

        metricsModel.addDroppedFrames(Constants.VIDEO, {});
        expect(spy).to.have.been.called.exactly(1); // jshint ignore:line

        eventBus.off(Events.METRIC_ADDED, spy);
    });

    it('should trigger METRIC_CHANGED event when clearCurrentMetricsForType is called and type is undefined', function () {
        let spy = chai.spy();
        eventBus.on(Events.METRIC_CHANGED, spy);

        metricsModel.clearCurrentMetricsForType();
        expect(spy).to.have.been.called.exactly(1); // jshint ignore:line

        eventBus.off(Events.METRIC_CHANGED, spy);
    });
});