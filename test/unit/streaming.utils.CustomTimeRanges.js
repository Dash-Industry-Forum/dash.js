import CustomTimeRanges from '../../src/streaming/utils/CustomTimeRanges';

const expect = require('chai').expect;

const context = {};
const customTimeRanges = CustomTimeRanges(context).create();

describe('CustomTimeRanges', function () {
	it("should return an empty array called customTimeRangeArray when CustomTimeRanges instance is created", function () {
        const customTimeRangeArray = customTimeRanges.customTimeRangeArray;

        expect(customTimeRangeArray).to.be.instanceOf(Array);    // jshint ignore:line
        expect(customTimeRangeArray).to.be.empty;                // jshint ignore:line
    });
}); 