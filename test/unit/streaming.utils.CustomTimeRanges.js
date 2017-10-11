import CustomTimeRanges from '../../src/streaming/utils/CustomTimeRanges';

const expect = require('chai').expect;

const context = {};
const customTimeRanges = CustomTimeRanges(context).create();

describe('CustomTimeRanges', function () {
    it('should return an empty array called customTimeRangeArray when CustomTimeRanges instance is created', function () {
        const customTimeRangeArray = customTimeRanges.customTimeRangeArray;

        expect(customTimeRangeArray).to.be.instanceOf(Array);    // jshint ignore:line
        expect(customTimeRangeArray).to.be.empty;                // jshint ignore:line
    });

    it('should throw an exception when attempting to call start with a parameter which is not an integer', function () {
        expect(customTimeRanges.start.bind(customTimeRanges,'t')).to.throw('index argument is not an integer');
    });

    it('should throw an exception when attempting to call end with a parameter which is not an integer', function () {
        expect(customTimeRanges.end.bind(customTimeRanges,'t')).to.throw('index argument is not an integer');
    });

    it('should return NaN when start function is called with an index bigger than customTimeRangeArray.length', function () {
        const start = customTimeRanges.start(2);

        expect(start).to.be.NaN;                // jshint ignore:line
    });

    it('should return NaN when end function is called with an index bigger than customTimeRangeArray.length', function () {
        const end = customTimeRanges.end(2);

        expect(end).to.be.NaN;                // jshint ignore:line
    });
});