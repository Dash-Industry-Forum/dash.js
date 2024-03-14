import SwitchHistoryRule from '../../../../src/streaming/rules/abr/SwitchHistoryRule.js';
import SwitchRequest from '../../../../src/streaming/rules/SwitchRequest.js';
import RulesContextMock from '../../mocks/RulesContextMock.js';
import {expect} from 'chai';

const context = {};
const switchHistoryRule = SwitchHistoryRule(context).create();

describe('SwitchHistoryRule', function () {
    it('should return an empty switchRequest when getSwitchRequest function is called with an empty parameter', function () {
        const switchRequest = switchHistoryRule.getSwitchRequest();

        expect(switchRequest.representation).to.be.equal(SwitchRequest.NO_CHANGE);
    });

    it('should return an switchRequest with quality equals 0 when one switchRequest equals to {drops: 10, noDrops: 0, dropSize: 4}, a division by zero occurs', function () {
        let rulesContextMock = new RulesContextMock();
        const switchRequest = switchHistoryRule.getSwitchRequest(rulesContextMock);

        expect(switchRequest.representation.id).to.be.equal(1);
    });
});
