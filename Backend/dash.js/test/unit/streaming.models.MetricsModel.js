import MetricsModel from '../../src/streaming/models/MetricsModel';
import Events from '../../src/core/events/Events';
import EventBus from '../../src/core/EventBus';
import Settings from '../../src/core/Settings';
import Constants from '../../src/streaming/constants/Constants';
import MetricsConstants from '../../src/streaming/constants/MetricsConstants';

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

    it('should trigger conform METRIC_ADDED event when addBufferLevel is called with correct parameters', function (done) {
        let onMetricAdded = function (e) {

            let type = e.mediaType;
            let metric_type = e.metric;
            let vo = e.value;

            expect(type).to.equal(Constants.VIDEO); // jshint ignore:line
            expect(metric_type).to.equal(MetricsConstants.BUFFER_LEVEL); // jshint ignore:line
            expect(vo.t).to.equal(50);
            expect(vo.level).to.equal(25);

            eventBus.off(Events.METRIC_ADDED, onMetricAdded);
            done();
        };
        eventBus.on(Events.METRIC_ADDED, onMetricAdded, this);
        metricsModel.addBufferLevel(Constants.VIDEO, 50, 25);
    });

    it('should trigger conform METRIC_UPDATED event when addManifestUpdateRepresentationInfo is called with correct parameters', function (done) {
        let onMetricUpdated = function (e) {

            let type = e.mediaType;
            let metric_type = e.metric;

            expect(type).to.equal(Constants.VIDEO); // jshint ignore:line
            expect(metric_type).to.equal(MetricsConstants.MANIFEST_UPDATE_TRACK_INFO); // jshint ignore:line

            eventBus.off(Events.METRIC_UPDATED, onMetricUpdated);
            done();
        };
        eventBus.on(Events.METRIC_UPDATED, onMetricUpdated, this);
        metricsModel.addManifestUpdateRepresentationInfo({representationInfo: [], mediaType: Constants.VIDEO});
    });

    it('should trigger conform METRIC_ADDED event when addRepresentationSwitch is called with correct parameters', function (done) {
        let onMetricAdded = function (e) {

            let type = e.mediaType;
            let metric_type = e.metric;

            expect(type).to.equal(Constants.VIDEO); // jshint ignore:line
            expect(metric_type).to.equal(MetricsConstants.TRACK_SWITCH); // jshint ignore:line
            expect(e.value.lto).to.be.undefined; // jshint ignore:line

            eventBus.off(Events.METRIC_ADDED, onMetricAdded);
            done();
        };
        eventBus.on(Events.METRIC_ADDED, onMetricAdded, this);
        metricsModel.addRepresentationSwitch(Constants.VIDEO, '', '', '');
    });
});