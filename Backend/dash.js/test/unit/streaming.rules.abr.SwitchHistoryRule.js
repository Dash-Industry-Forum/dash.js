import SwitchHistoryRule from '../../src/streaming/rules/abr/SwitchHistoryRule';
import SwitchRequest from '../../src/streaming/rules/SwitchRequest';

import RulesContextMock from './mocks/RulesContextMock';

const expect = require('chai').expect;
const context = {};
const switchHistoryRule = SwitchHistoryRule(context).create();

describe('SwitchHistoryRule', function () {
    it('should return an empty switchRequest when getMaxIndex function is called with an empty parameter', function () {
        const switchRequest = switchHistoryRule.getMaxIndex();

        expect(switchRequest.quality).to.be.equal(SwitchRequest.NO_CHANGE);  // jshint ignore:line
    });

    it('should return an switchRequest with quality equals 0 when one switchRequest equals to {drops: 7, noDrops: 0, dropSize: 4}, a division by zero occurs', function () {
        let rulesContextMock = new RulesContextMock();
        const switchRequest = switchHistoryRule.getMaxIndex(rulesContextMock);

        expect(switchRequest.quality).to.be.equal(0);  // jshint ignore:line
    });
});