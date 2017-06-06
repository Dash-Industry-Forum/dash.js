import DashConstants from '../src/dash/constants/DashConstants';

const expect = require('chai').expect;

describe('DashConstants', function () {
    it('DashConstants should exist', () => {
        expect(DashConstants).to.exist; // jshint ignore:line
        expect(DashConstants.BASE_URL).to.equal('BaseURL');
        expect(DashConstants.SEGMENT_BASE).to.equal('SegmentBase');
        expect(DashConstants.SEGMENT_TEMPLATE).to.equal('SegmentTemplate');
        expect(DashConstants.SEGMENT_LIST).to.equal('SegmentList');
        expect(DashConstants.ADAPTATION_SET).to.equal('AdaptationSet');
        expect(DashConstants.REPRESENTATION).to.equal('Representation');
        expect(DashConstants.SUB_REPRESENTATION).to.equal('SubRepresentation');
    });
});
