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

    let settings = Settings(context).getInstance();
    let customParametersModel = CustomParametersModel(context).getInstance();

    beforeEach(() => {
        settings.reset();
    });


    describe('should initialize correctly', function () {
        it('should contain all quality switch rules that are enabled', function () {
            settings.update({
                streaming: {
                    abr: {
                        activeRules: {
                            throughputRule: true,
                            bolaRule: true,
                            insufficientBufferRule: true,
                            switchHistoryRule: true,
                            droppedFramesRule: true,
                            abandonRequestsRule: true,
                            l2ARule: false,
                            loLPRule: false
                        }
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
            expect(qualitySwitchRules).to.have.lengthOf(5);

            const expectedRules = [
                Constants.QUALITY_SWITCH_RULES.BOLA_RULE,
                Constants.QUALITY_SWITCH_RULES.THROUGHPUT_RULE,
                Constants.QUALITY_SWITCH_RULES.INSUFFICIENT_BUFFER_RULE,
                Constants.QUALITY_SWITCH_RULES.SWITCH_HISTORY_RULE,
                Constants.QUALITY_SWITCH_RULES.DROPPED_FRAMES_RULE]
            qualitySwitchRules.forEach((rule) => {
                expect(rule.getClassName()).to.be.oneOf(expectedRules)
            })
        });

        it('should contain all abandon fragment rules that are enabled', function () {
            settings.update({
                streaming: {
                    abr: {
                        activeRules: {
                            throughputRule: true,
                            bolaRule: true,
                            insufficientBufferRule: true,
                            switchHistoryRule: true,
                            droppedFramesRule: true,
                            abandonRequestsRule: true,
                            l2ARule: false,
                            loLPRule: false
                        }
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

            const abandonFragmentRules = abrRulesCollection.getAbandonFragmentRules();
            expect(abandonFragmentRules).to.have.lengthOf(1);

            const expectedRules = [
                Constants.ABANDON_FRAGMENT_RULES.ABANDON_REQUEST_RULE]
            abandonFragmentRules.forEach((rule) => {
                expect(rule.getClassName()).to.be.oneOf(expectedRules)
            })

        });

        it('should contain BOLA and Throughput rule if no rules are selected', function () {
            settings.update({
                streaming: {
                    abr: {
                        activeRules: {
                            throughputRule: false,
                            bolaRule: false,
                            insufficientBufferRule: false,
                            switchHistoryRule: false,
                            droppedFramesRule: false,
                            abandonRequestsRule: true,
                            l2ARule: false,
                            loLPRule: false
                        }
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
            const expectedRules = [
                Constants.QUALITY_SWITCH_RULES.BOLA_RULE,
                Constants.QUALITY_SWITCH_RULES.THROUGHPUT_RULE]
            qualitySwitchRules.forEach((rule) => {
                expect(rule.getClassName()).to.be.oneOf(expectedRules)
            })

        });

    });

    describe('should update the rules ones settings object is changed', function () {

        it('should update quality switch rules once settings object is changed', function () {
            settings.update({
                streaming: {
                    abr: {
                        activeRules: {
                            throughputRule: false,
                            bolaRule: false,
                            insufficientBufferRule: true,
                            switchHistoryRule: true,
                            droppedFramesRule: false,
                            abandonRequestsRule: true,
                            l2ARule: false,
                            loLPRule: false
                        }
                    }
                }
            });

            abrRulesCollection = ABRRulesCollection(context).create({
                dashMetrics: new DashMetricsMock(),
                mediaPlayerModel: new MediaPlayerModelMock(),
                settings,
                customParametersModel
            });
            abrRulesCollection.initialize();

            let qualitySwitchRules = abrRulesCollection.getQualitySwitchRules();
            let expectedRules = [
                Constants.QUALITY_SWITCH_RULES.INSUFFICIENT_BUFFER_RULE,
                Constants.QUALITY_SWITCH_RULES.SWITCH_HISTORY_RULE]

            qualitySwitchRules.forEach((rule) => {
                expect(rule.getClassName()).to.be.oneOf(expectedRules)
            })

            settings.update({
                streaming: {
                    abr: {
                        activeRules: {
                            throughputRule: true,
                            bolaRule: true,
                            insufficientBufferRule: false,
                            switchHistoryRule: false,
                            droppedFramesRule: false,
                            abandonRequestsRule: true,
                            l2ARule: false,
                            loLPRule: false
                        }
                    }
                }
            });

            qualitySwitchRules = abrRulesCollection.getQualitySwitchRules();
            expect(qualitySwitchRules).to.have.lengthOf(2);
            expectedRules = [
                Constants.QUALITY_SWITCH_RULES.BOLA_RULE,
                Constants.QUALITY_SWITCH_RULES.THROUGHPUT_RULE]

            qualitySwitchRules.forEach((rule) => {
                expect(rule.getClassName()).to.be.oneOf(expectedRules)
            })


        });

        it('should update abandon fragment rules once settings object is changed', function () {
            settings.update({
                streaming: {
                    abr: {
                        activeRules: {
                            throughputRule: false,
                            bolaRule: false,
                            insufficientBufferRule: true,
                            switchHistoryRule: true,
                            droppedFramesRule: false,
                            abandonRequestsRule: false,
                            l2ARule: false,
                            loLPRule: false
                        }
                    }
                }
            });

            abrRulesCollection = ABRRulesCollection(context).create({
                dashMetrics: new DashMetricsMock(),
                mediaPlayerModel: new MediaPlayerModelMock(),
                settings,
                customParametersModel
            });
            abrRulesCollection.initialize();

            let rules = abrRulesCollection.getAbandonFragmentRules();
            expect(rules).to.have.lengthOf(0);

            settings.update({
                streaming: {
                    abr: {
                        activeRules: {
                            throughputRule: true,
                            bolaRule: true,
                            insufficientBufferRule: false,
                            switchHistoryRule: false,
                            droppedFramesRule: false,
                            abandonRequestsRule: true,
                            l2ARule: false,
                            loLPRule: false
                        }
                    }
                }
            });

            rules = abrRulesCollection.getAbandonFragmentRules();
            expect(rules).to.have.lengthOf(1);
            const expectedRules = [
                Constants.ABANDON_FRAGMENT_RULES.ABANDON_REQUEST_RULE]

            rules.forEach((rule) => {
                expect(rule.getClassName()).to.be.oneOf(expectedRules)
            })


        });
    })


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

            expect(maxQuality.quality).to.be.equal(SwitchRequest.NO_CHANGE);
        });

        it('should return an empty SwitchRequest when shouldAbandonFragment function is called and rulesContext is undefined', function () {
            const shouldAbandonFragment = abrRulesCollection.shouldAbandonFragment();

            expect(shouldAbandonFragment.quality).to.be.equal(SwitchRequest.NO_CHANGE);
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
            expect(sr.reason).to.be.null;
        });

    });


});
