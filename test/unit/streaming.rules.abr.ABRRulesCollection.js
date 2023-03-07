import ABRRulesCollection from '../../src/streaming/rules/abr/ABRRulesCollection';
import Settings from '../../src/core/Settings';
import SwitchRequest from '../../src/streaming/rules/SwitchRequest';
import Constants from '../../src/streaming/constants/Constants';

import DashMetricsMock from './mocks/DashMetricsMock';
import MediaPlayerModelMock from './mocks/MediaPlayerModelMock';
import CustomParametersModel from '../../src/streaming/models/CustomParametersModel';

const expect = require('chai').expect;

const context = {};
let abrRulesCollection;

describe('ABRRulesCollection', function () {

    describe('should initialize correctly', function () {
        let settings = Settings(context).getInstance();
        let customParametersModel = CustomParametersModel(context).getInstance();

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
                settings: Settings(context).getInstance(),
                customParametersModel
            });
            abrRulesCollection.initialize();
            const qualitySwitchRules = abrRulesCollection.getQualitySwitchRules();
            expect(qualitySwitchRules).to.have.lengthOf(1);  // jshint ignore:line

        });

        it('should contain multiple rules if ABR strategy is set to ABR_STRATEGY_DYNAMIC', function () {
            abrRulesCollection = ABRRulesCollection(context).create({
                dashMetrics: new DashMetricsMock(),
                mediaPlayerModel: new MediaPlayerModelMock(),
                settings: Settings(context).getInstance(),
                customParametersModel
            });
            abrRulesCollection.initialize();
            const qualitySwitchRules = abrRulesCollection.getQualitySwitchRules();
            expect(qualitySwitchRules.length).to.be.above(1);  // jshint ignore:line

        });

    });

    describe('should return correct switch requests', function () {
        let customParametersModel = CustomParametersModel(context).getInstance();

        beforeEach(function () {
            abrRulesCollection = ABRRulesCollection(context).create({
                dashMetrics: new DashMetricsMock(),
                mediaPlayerModel: new MediaPlayerModelMock(),
                settings: Settings(context).getInstance(),
                customParametersModel
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

        it('should return correct switch request in getMinSwitchRequest for a single item', () => {
            const srArray = [{
                quality: 5,
                priority: SwitchRequest.PRIORITY.WEAK,
                reason: {
                    throughput: 1000
                }
            }];

            const sr = abrRulesCollection.getMinSwitchRequest(srArray);

            expect(sr.quality).to.be.equal(5);
            expect(sr.reason.throughput).to.be.equal(1000);
        });

        it('should return correct switch request in getMinSwitchRequest for multiple items with similar priorities', () => {
            const srArray = [
                {
                    quality: 6,
                    priority: SwitchRequest.PRIORITY.WEAK,
                    reason: {
                        throughput: 60
                    }
                },
                {
                    quality: 4,
                    priority: SwitchRequest.PRIORITY.WEAK,
                    reason: {
                        throughput: 40
                    }
                },
                {
                    quality: 5,
                    priority: SwitchRequest.PRIORITY.WEAK,
                    reason: {
                        throughput: 50
                    }
                }
            ];

            const sr = abrRulesCollection.getMinSwitchRequest(srArray);

            expect(sr.quality).to.be.equal(4);
            expect(sr.reason.throughput).to.be.equal(40);
        });

        it('should return correct switch request in getMinSwitchRequest for multiple items with different priorities', () => {
            const srArray = [
                {
                    quality: 6,
                    priority: SwitchRequest.PRIORITY.DEFAULT,
                    reason: {
                        throughput: 60
                    }
                },
                {
                    quality: 5,
                    priority: SwitchRequest.PRIORITY.STRONG,
                    reason: {
                        throughput: 50
                    }
                },
                {
                    quality: 7,
                    priority: SwitchRequest.PRIORITY.WEAK,
                    reason: {
                        throughput: 70
                    }
                }
            ];

            const sr = abrRulesCollection.getMinSwitchRequest(srArray);

            expect(sr.quality).to.be.equal(5);
            expect(sr.reason.throughput).to.be.equal(50);
        });

        it('should return correct switch request in getMinSwitchRequest for multiple items with different and similar priorities', () => {
            const srArray = [
                {
                    quality: 6,
                    priority: SwitchRequest.PRIORITY.DEFAULT,
                    reason: {
                        throughput: 60
                    }
                },
                {
                    quality: 5,
                    priority: SwitchRequest.PRIORITY.STRONG,
                    reason: {
                        throughput: 50
                    }
                },
                {
                    quality: 4,
                    priority: SwitchRequest.PRIORITY.STRONG,
                    reason: {
                        throughput: 40
                    }
                },
                {
                    quality: 7,
                    priority: SwitchRequest.PRIORITY.WEAK,
                    reason: {
                        throughput: 70
                    }
                }
            ];

            const sr = abrRulesCollection.getMinSwitchRequest(srArray);

            expect(sr.quality).to.be.equal(4);
            expect(sr.reason.throughput).to.be.equal(40);
        });

        it('should return correct switch request in getMinSwitchRequest for a single item without reason', () => {
            const srArray = [{
                quality: 5,
                priority: SwitchRequest.PRIORITY.WEAK
            }];

            const sr = abrRulesCollection.getMinSwitchRequest(srArray);

            expect(sr.quality).to.be.equal(5);
            expect(sr.reason).to.be.null; // jshint ignore:line
        });

    });
});
