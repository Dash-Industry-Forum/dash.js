import AbandonRequestsRule from '../../src/streaming/rules/abr/AbandonRequestsRule';
import SwitchRequest from '../../src/streaming/rules/SwitchRequest';
import MetricsModelMock from './mocks/MetricsModelMock';
import MediaPlayerModelMock from './mocks/MediaPlayerModelMock';
import DashMetricsMock from './mocks/DashMetricsMock';
import RulesContextMock from './mocks/RulesContextMock';

const expect = require('chai').expect;

const context = {};

describe('AbandonRequestsRule', function () {
    it('should return an empty switchRequest when shouldAbandon function is called with an empty parameter', function () {
        const abandonRequestsRule = AbandonRequestsRule(context).create({});
        const abandonRequest = abandonRequestsRule.shouldAbandon();

        expect(abandonRequest.quality).to.be.equal(SwitchRequest.NO_CHANGE);  // jshint ignore:line
    });

    it('should return an empty switchRequest when shouldAbandon function is called with a mock parameter', function () {
        let rulesContextMock = new RulesContextMock();
        let dashMetricsMock = new DashMetricsMock();
        let metricsModelMock = new MetricsModelMock();
        let mediaPlayerModelMock = new MediaPlayerModelMock();

        const abandonRequestsRule = AbandonRequestsRule(context).create({metricsModel: metricsModelMock,
                                                                         dashMetrics: dashMetricsMock,
                                                                         mediaPlayerModel: mediaPlayerModelMock});


        const abandonRequest = abandonRequestsRule.shouldAbandon(rulesContextMock);

        expect(abandonRequest.quality).to.be.equal(SwitchRequest.NO_CHANGE);  // jshint ignore:line
    });
});