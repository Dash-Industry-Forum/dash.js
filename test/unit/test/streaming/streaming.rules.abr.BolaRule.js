import BolaRule from '../../../../src/streaming/rules/abr/BolaRule.js';
import SwitchRequest from '../../../../src/streaming/rules/SwitchRequest.js';
import RulesContextMock from '../../mocks/RulesContextMock.js';
import {expect} from 'chai';

const context = {};
const bolaRule = BolaRule(context).create({});
const rulesContextMock = new RulesContextMock();

describe('BolaRule', function () {
    it('should return an empty switchRequest when getSwitchRequest function is called with an empty parameter', function () {
        const maxIndexRequest = bolaRule.getSwitchRequest();

        expect(maxIndexRequest.representation).to.be.equal(SwitchRequest.NO_CHANGE);
    });

    it('should return an empty switchRequest when getSwitchRequest function is called with an malformed parameter', function () {
        const maxIndexRequest = bolaRule.getSwitchRequest({});

        expect(maxIndexRequest.representation).to.be.equal(SwitchRequest.NO_CHANGE);
    });

    it('should return an empty switchRequest when getSwitchRequest function is called with an well formed parameter', function () {
        const maxIndexRequest = bolaRule.getSwitchRequest(rulesContextMock);

        expect(maxIndexRequest.representation).to.be.equal(SwitchRequest.NO_CHANGE);
    });
});
