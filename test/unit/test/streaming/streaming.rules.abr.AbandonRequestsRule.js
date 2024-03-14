import AbandonRequestsRule from '../../../../src/streaming/rules/abr/AbandonRequestsRule.js';
import SwitchRequest from '../../../../src/streaming/rules/SwitchRequest.js';
import MediaPlayerModelMock from '../../mocks/MediaPlayerModelMock.js';
import DashMetricsMock from '../../mocks/DashMetricsMock.js';
import RulesContextMock from '../../mocks/RulesContextMock.js';
import Settings from '../../../../src/core/Settings.js';
import {expect} from 'chai';

const context = {};

describe('AbandonRequestsRule', function () {
    const settings = Settings(context).getInstance();

    it('should return an empty switchRequest when shouldAbandon function is called with an empty parameter', function () {
        const abandonRequestsRule = AbandonRequestsRule(context).create({});
        const abandonRequest = abandonRequestsRule.shouldAbandon();

        expect(abandonRequest.representation).to.be.equal(SwitchRequest.NO_CHANGE);
    });

    it('should return an empty switchRequest when shouldAbandon function is called with a mock parameter', function () {
        let rulesContextMock = new RulesContextMock();
        let dashMetricsMock = new DashMetricsMock();
        let mediaPlayerModelMock = new MediaPlayerModelMock();

        const abandonRequestsRule = AbandonRequestsRule(context).create({
            dashMetrics: dashMetricsMock,
            mediaPlayerModel: mediaPlayerModelMock,
            settings: settings
        });

        const abandonRequest = abandonRequestsRule.shouldAbandon(rulesContextMock);

        expect(abandonRequest.representation).to.be.equal(SwitchRequest.NO_CHANGE);
    });
});
