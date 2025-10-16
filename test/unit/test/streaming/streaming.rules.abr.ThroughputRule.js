import ThroughputRule from '../../../../src/streaming/rules/abr/ThroughputRule.js';
import SwitchRequest from '../../../../src/streaming/rules/SwitchRequest.js';
import {expect} from 'chai';
import DashMetricsMock from '../../mocks/DashMetricsMock.js';
import AbrControllerMock from '../../mocks/AbrControllerMock.js';
import Settings from '../../../../src/core/Settings.js';

const context = {};

describe('ThroughputRule', function () {

    let throughputRule;
    let rulesContextMock;
    let dashMetricsMock;
    let abrControllerMock;
    let settings;

    beforeEach(function () {
        settings = Settings(context).getInstance();
        dashMetricsMock = new DashMetricsMock();
        dashMetricsMock.bufferState = {state: 'bufferLoaded'};
        abrControllerMock = new AbrControllerMock();
        throughputRule = ThroughputRule(context).create({
            dashMetrics: dashMetricsMock
        })
        rulesContextMock = {}
        rulesContextMock.getThroughputController = function () {
            return null;
        }
        rulesContextMock.getAbrController = function () {
            return abrControllerMock
        }
        rulesContextMock.getMediaInfo = function () {}
        rulesContextMock.getMediaType = function () {}
        rulesContextMock.getStreamInfo = function () {}
        rulesContextMock.getScheduleController = function () {
            return {
                setTimeToLoadDelay: function () {
                }
            }
        }
    });

    it('should return an empty switchRequest when getSwitchRequest function is called with an empty parameter', function () {
        const maxIndexRequest = throughputRule.getSwitchRequest();

        expect(maxIndexRequest.representation).to.be.equal(SwitchRequest.NO_CHANGE);
    });

    it('should return an empty switchRequest when getSwitchRequest function is called with an malformed parameter', function () {
        const maxIndexRequest = throughputRule.getSwitchRequest({});

        expect(maxIndexRequest.representation).to.be.equal(SwitchRequest.NO_CHANGE);
    });

    it('should return NO_CHANGE with RulesContextMock when there are no throughput samples', function () {
        const req = throughputRule.getSwitchRequest(rulesContextMock);
        expect(req.representation).to.equal(SwitchRequest.NO_CHANGE);
    });



    it('should return NO_CHANGE with RulesContextMock when there is no buffer state', function () {
        dashMetricsMock.bufferState = null;
        rulesContextMock.getThroughputController = function () {
            return {
                getSafeAverageThroughput: function () {
                    return 3000000;
                },
                getAverageLatency: function () {
                    return 0
                }
            }
        }
        const req = throughputRule.getSwitchRequest(rulesContextMock);
        expect(req.representation).to.equal(SwitchRequest.NO_CHANGE);
    });

    it('should switch and provide correct throughput and priority', function () {
        // Current quality = 1 (1 Mbps). Provide throughput ~3 Mbps => should go to index 3 (3.5 Mbps) if safetyFactor * throughput > 3.5M? 3 Mbps * 0.9 = 2.7 < 3.5 so expect index 2 (2 Mbps).
        const throughput = 3000000;
        settings.update({
            streaming: {
                abr: {
                    rules: {
                        throughputRule: {
                            priority: 5
                        }
                    }
                }
            }
        })
        rulesContextMock.getThroughputController = function () {
            return {
                getSafeAverageThroughput: function () {
                    return throughput;
                },
                getAverageLatency: function () {
                    return 0
                }
            }
        }
        rulesContextMock.getAbrController = function () {
            return {
                getAbandonmentStateFor: function () {
                    return 'allowload'
                },
                getOptimalRepresentationForBitrate: function (mediaInfo, throughput) {
                    return {
                        id: 1,
                        throughput
                    }
                }
            }
        }
        const switchRequest = throughputRule.getSwitchRequest(rulesContextMock);
        expect(switchRequest.representation.id).to.equal(1);
        expect(switchRequest.reason.throughput).to.equal(throughput);
        expect(switchRequest.priority).to.equal(5);
    });

});
