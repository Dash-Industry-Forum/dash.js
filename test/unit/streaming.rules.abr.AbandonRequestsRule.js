import AbandonRequestsRule from '../../src/streaming/rules/abr/AbandonRequestsRule';
import FragmentRequest from '../../src/streaming/vo/FragmentRequest';

const expect = require('chai').expect;

const context = {};

function RulesContextMock () {
    this.getMediaInfo = function() {

    };
    this.getMediaType = function() {
        return 'video';
    };
    this.getCurrentRequest = function() {
        let fragRequest =  new FragmentRequest();
        fragRequest.index = 1;

        return fragRequest;
    };    
    this.getTrackInfo = function() {};
    this.getAbrController = function() {};
}

class MetricsModelMock {
    constructor() {
    }

    getReadOnlyMetricsFor(type) {
        return null;
    }
}

class DashMetricsMock {
    constructor() {
    }

    getCurrentBufferLevel() {
        return 15;
    }
}

class MediaPlayerModelMock {
    constructor() {
    }

    getStableBufferTime() {
        return 10;
    }

}
          
describe('AbandonRequestsRule', function () {
    it("should return an empty switchRequest when shouldAbandon function is called with an empty parameter", function () {
        const abandonRequestsRule = AbandonRequestsRule(context).create({});
        const abandonRequest = abandonRequestsRule.shouldAbandon();

        expect(abandonRequest.quality).to.be.equal(-1);  // jshint ignore:line 
    });

    it("should return an empty switchRequest when shouldAbandon function is called with a mock parameter", function () {
        let rulesContextMock = new RulesContextMock();
        let dashMetricsMock = new DashMetricsMock();
        let metricsModelMock = new MetricsModelMock();
        let mediaPlayerModelMock = new MediaPlayerModelMock();

        const abandonRequestsRule = AbandonRequestsRule(context).create({metricsModel: metricsModelMock, 
                                                                         dashMetrics: dashMetricsMock,
                                                                         mediaPlayerModel: mediaPlayerModelMock});


        const abandonRequest = abandonRequestsRule.shouldAbandon(rulesContextMock);

        expect(abandonRequest.quality).to.be.equal(-1);  // jshint ignore:line 
    });
}); 