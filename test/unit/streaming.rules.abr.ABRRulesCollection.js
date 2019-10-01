import ABRRulesCollection from '../../src/streaming/rules/abr/ABRRulesCollection';
import Settings from '../../src/core/Settings';
import SwitchRequest from '../../src/streaming/rules/SwitchRequest';

import DashMetricsMock from './mocks/DashMetricsMock';
import MediaPlayerModelMock from './mocks/MediaPlayerModelMock';

const expect = require('chai').expect;

const context = {};
let abrRulesCollection;


beforeEach(function () {
    abrRulesCollection = ABRRulesCollection(context).create({
        dashMetrics: new DashMetricsMock(),
        mediaPlayerModel: new MediaPlayerModelMock(),
        settings: Settings(context).getInstance()
    });
    abrRulesCollection.initialize();
});

afterEach(function () {
    abrRulesCollection.reset();
});

describe('ABRRulesCollection', function () {
    it('should return an empty SwitchRequest when getMaxQuality function is called and rulesContext is undefined', function () {
        const maxQuality = abrRulesCollection.getMaxQuality();

        expect(maxQuality.quality).to.be.equal(SwitchRequest.NO_CHANGE);  // jshint ignore:line
    });

    it('should return an empty SwitchRequest when shouldAbandonFragment function is called and rulesContext is undefined', function () {
        const shouldAbandonFragment = abrRulesCollection.shouldAbandonFragment();

        expect(shouldAbandonFragment.quality).to.be.equal(SwitchRequest.NO_CHANGE);  // jshint ignore:line
    });
});
