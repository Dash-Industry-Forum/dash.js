import ABRRulesCollection from '../../src/streaming/rules/abr/ABRRulesCollection';
import Settings from '../../src/core/Settings';
import SwitchRequest from '../../src/streaming/rules/SwitchRequest';
import Constants from '../../src/streaming/constants/Constants';

import DashMetricsMock from './mocks/DashMetricsMock';
import MediaPlayerModelMock from './mocks/MediaPlayerModelMock';

const expect = require('chai').expect;

const context = {};
let abrRulesCollection;

describe('ABRRulesCollection', function () {

    describe('should initialize correctly', function () {
        let settings = Settings(context).getInstance();

        beforeEach(() => {
            settings.reset();
        });

        it('should only contain L2A rule if ABR strategy is set to ABR_STRATEGY_L2A', function () {
            settings.update({
                streaming: {
                    abr: {
                        ABRStrategy: Constants.ABR_STRATEGY_L2A
                    }
                }
            });

            abrRulesCollection = ABRRulesCollection(context).create({
                dashMetrics: new DashMetricsMock(),
                mediaPlayerModel: new MediaPlayerModelMock(),
                settings: Settings(context).getInstance()
            });
            abrRulesCollection.initialize();
            const qualitySwitchRules = abrRulesCollection.getQualitySwitchRules();
            expect(qualitySwitchRules).to.have.lengthOf(1);  // jshint ignore:line

        });

        it('should contain multiple rules if ABR strategy is set to ABR_STRATEGY_DYNAMIC', function () {
            abrRulesCollection = ABRRulesCollection(context).create({
                dashMetrics: new DashMetricsMock(),
                mediaPlayerModel: new MediaPlayerModelMock(),
                settings: Settings(context).getInstance()
            });
            abrRulesCollection.initialize();
            const qualitySwitchRules = abrRulesCollection.getQualitySwitchRules();
            expect(qualitySwitchRules.length).to.be.above(1);  // jshint ignore:line

        });

    });

    describe('should return correct switch requests', function () {

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

        it('should return an empty SwitchRequest when getMaxQuality function is called and rulesContext is undefined', function () {
            const maxQuality = abrRulesCollection.getMaxQuality();

            expect(maxQuality.quality).to.be.equal(SwitchRequest.NO_CHANGE);  // jshint ignore:line
        });

        it('should return an empty SwitchRequest when shouldAbandonFragment function is called and rulesContext is undefined', function () {
            const shouldAbandonFragment = abrRulesCollection.shouldAbandonFragment();

            expect(shouldAbandonFragment.quality).to.be.equal(SwitchRequest.NO_CHANGE);  // jshint ignore:line
        });

    });
});
