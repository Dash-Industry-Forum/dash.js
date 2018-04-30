import Round10 from '../../src/dash/utils/Round10';

const expect = require('chai').expect;

describe('Round10', () => {
    it('should round numbers as expected', () => {

        /*
         * These examples modified from CC0-licenced code sample at:
         * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/round
         */
        expect(Round10.round10(55.55, -1)).to.equal(55.6);
        expect(Round10.round10(55.549, -1)).to.equal(55.5);
        expect(Round10.round10(55, 1)).to.equal(60);
        expect(Round10.round10(54.9, 1)).to.equal(50);
        expect(Round10.round10(-55.55, -1)).to.equal(-55.5);
        expect(Round10.round10(-55.551, -1)).to.equal(-55.6);
        expect(Round10.round10(-55, 1)).to.equal(-50);
        expect(Round10.round10(-55.1, 1)).to.equal(-60);
        expect(Round10.round10(1.005, -2)).to.equal(1.01);
        expect(Round10.round10(-1.005, -2)).to.equal(-1.0);

        // some real-world examples of how we actually use the method
        expect(Round10.round10(21.782228000000003, -3)).to.equal(21.782);
        expect(Round10.round10(23.193893000000003, -3)).to.equal(23.194);
    });
});