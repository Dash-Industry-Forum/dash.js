import CustomTimeRanges from '../../src/streaming/utils/CustomTimeRanges';
import Constants from '../../src/streaming/constants/Constants';

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
        expect(customTimeRanges.start.bind(customTimeRanges,'t')).to.throw(Constants.BAD_ARGUMENT_ERROR + ' : argument is not an integer');
    });

    it('should throw an exception when attempting to call end with a parameter which is not an integer', function () {
        expect(customTimeRanges.end.bind(customTimeRanges,'t')).to.throw(Constants.BAD_ARGUMENT_ERROR + ' : argument is not an integer');
    });

    it('should return NaN when start function is called with an index bigger than customTimeRangeArray.length', function () {
        const start = customTimeRanges.start(2);

        expect(start).to.be.NaN;                // jshint ignore:line
    });

    it('should return NaN when end function is called with an index bigger than customTimeRangeArray.length', function () {
        const end = customTimeRanges.end(2);

        expect(end).to.be.NaN;                // jshint ignore:line
    });

    it('should return the correct start and end value', function () {
        customTimeRanges.add(2, 4);

        const end = customTimeRanges.end(0);
        const start = customTimeRanges.start(0);

        expect(start).to.equal(2);                // jshint ignore:line
        expect(end).to.equal(4);                // jshint ignore:line

        customTimeRanges.clear();
        expect(customTimeRanges.length).to.equal(0);                // jshint ignore:line
    });
});