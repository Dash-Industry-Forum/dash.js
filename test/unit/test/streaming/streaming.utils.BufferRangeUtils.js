import {
    getBufferLength,
    getPruningRanges,
    getRangeAt,
    hasBufferAtTime
} from '../../../../src/streaming/utils/BufferRangeUtils.js';
import CustomTimeRanges from '../../../../src/streaming/utils/CustomTimeRanges.js';

import {expect} from 'chai';

const context = {};

function createTimeRanges(ranges = []) {
    const timeRanges = CustomTimeRanges(context).create();
    ranges.forEach((range) => timeRanges.add(range.start, range.end));
    return timeRanges;
}

describe('BufferRangeUtils', function () {

    describe('getPruningRanges', function () {
        const pruningOptions = {
            bufferToKeepBehind: 20,
            bufferToKeepAhead: 30,
            continuousBufferTime: 100,
            currentTimeRequest: null,
            avoidCurrentTimeRangePruning: false
        };

        it('should return no ranges when the buffer is empty', function () {
            expect(getPruningRanges(createTimeRanges(), 10, pruningOptions)).to.deep.equal([]);
            expect(getPruningRanges(null, 10, pruningOptions)).to.deep.equal([]);
        });

        it('should clear the full buffer when the seek time is missing or not a number', function () {
            const ranges = createTimeRanges([{ start: 2, end: 5 }, { start: 8, end: 11 }]);
            const expected = [{ start: 2, end: 11.5 }];

            expect(getPruningRanges(ranges)).to.deep.equal(expected);
            expect(getPruningRanges(ranges, NaN)).to.deep.equal(expected);
            expect(getPruningRanges(ranges, 'invalid')).to.deep.equal(expected);
            expect(getPruningRanges(ranges, '50')).to.deep.equal(expected);
        });

        it('should reject a valid seek time without pruning options', function () {
            const ranges = createTimeRanges([{ start: 0, end: 100 }]);

            expect(() => getPruningRanges(ranges, 50)).to.throw('getPruningRanges requires numeric bufferToKeepBehind and bufferToKeepAhead');
        });

        it('should reject partial pruning options', function () {
            const ranges = createTimeRanges([{ start: 0, end: 100 }]);

            expect(() => getPruningRanges(ranges, 50, { bufferToKeepBehind: 20 })).to.throw('getPruningRanges requires numeric bufferToKeepBehind and bufferToKeepAhead');
            expect(() => getPruningRanges(ranges, 50, { bufferToKeepAhead: 30 })).to.throw('getPruningRanges requires numeric bufferToKeepBehind and bufferToKeepAhead');
        });

        it('should treat seek time zero as a valid pruning target', function () {
            const ranges = createTimeRanges([{ start: 0, end: 100 }]);

            expect(getPruningRanges(ranges, 0, pruningOptions)).to.deep.equal([
                { start: 30, end: 100.5 }
            ]);
        });

        it('should calculate the ranges behind and ahead of the target time', function () {
            const ranges = createTimeRanges([{ start: 0, end: 100 }]);

            expect(getPruningRanges(ranges, 50, pruningOptions)).to.deep.equal([
                { start: 0, end: 30 },
                { start: 80, end: 100.5 }
            ]);
        });

        it('should keep the full range of the current fragment', function () {
            const ranges = createTimeRanges([{ start: 0, end: 100 }]);
            const options = {
                ...pruningOptions,
                currentTimeRequest: { startTime: 25, duration: 60 }
            };

            expect(getPruningRanges(ranges, 50, options)).to.deep.equal([
                { start: 0, end: 25 },
                { start: 85, end: 100.5 }
            ]);
        });

        it('should start ahead pruning at the next range when the current range is protected', function () {
            const ranges = createTimeRanges([{ start: 0, end: 60 }, { start: 70, end: 120 }]);
            const options = {
                ...pruningOptions,
                continuousBufferTime: 60,
                avoidCurrentTimeRangePruning: true
            };

            expect(getPruningRanges(ranges, 50, options)).to.deep.equal([
                { start: 0, end: 30 },
                { start: 70, end: 120.5 }
            ]);
        });

        it('should log the protected range when a logger is provided', function () {
            const ranges = createTimeRanges([{ start: 0, end: 60 }, { start: 70, end: 120 }]);
            const messages = [];
            const options = {
                ...pruningOptions,
                continuousBufferTime: 60,
                avoidCurrentTimeRangePruning: true,
                logger: { debug: (message) => messages.push(message) }
            };

            getPruningRanges(ranges, 50, options);

            expect(messages).to.deep.equal([
                'Buffered range [0, 60] overlaps with targetTime 50 and range to be pruned [60, 120.5], using [70, 120.5] instead'
            ]);
        });

        it('should start ahead pruning at the end of the continuous range', function () {
            const ranges = createTimeRanges([{ start: 0, end: 60 }, { start: 70, end: 120 }]);
            const options = {
                ...pruningOptions,
                continuousBufferTime: 60
            };

            expect(getPruningRanges(ranges, 50, options)).to.deep.equal([
                { start: 0, end: 30 },
                { start: 60, end: 120.5 }
            ]);
        });

        it('should start ahead pruning at the target when it is outside the buffer', function () {
            const ranges = createTimeRanges([{ start: 0, end: 10 }, { start: 50, end: 100 }]);
            const options = {
                ...pruningOptions,
                continuousBufferTime: NaN
            };

            expect(getPruningRanges(ranges, 20, options)).to.deep.equal([
                { start: 20, end: 100.5 }
            ]);
        });

        it('should not prune ahead when the protected range is the last range', function () {
            const ranges = createTimeRanges([{ start: 0, end: 100 }]);
            const options = {
                ...pruningOptions,
                avoidCurrentTimeRangePruning: true
            };

            expect(getPruningRanges(ranges, 50, options)).to.deep.equal([
                { start: 0, end: 30 }
            ]);
        });

        it('should not prune behind when the retained duration equals bufferToKeepBehind', function () {
            const ranges = createTimeRanges([{ start: 0, end: 100 }]);
            const options = {
                ...pruningOptions,
                bufferToKeepBehind: 50,
                bufferToKeepAhead: 100
            };

            expect(getPruningRanges(ranges, 50, options)).to.deep.equal([]);
        });
    });

    describe('hasBufferAtTime', function () {
        it('should return false for missing or empty ranges', function () {
            expect(hasBufferAtTime(null, 10)).to.be.false;
            expect(hasBufferAtTime(createTimeRanges(), 10)).to.be.false;
        });

        it('should find the time in any range and include both boundaries', function () {
            const ranges = createTimeRanges([{ start: 2, end: 5 }, { start: 8, end: 11 }]);

            expect(hasBufferAtTime(ranges, 2)).to.be.true;
            expect(hasBufferAtTime(ranges, 11)).to.be.true;
            expect(hasBufferAtTime(ranges, 7)).to.be.false;
        });
    });

    describe('getRangeAt', function () {
        it('should return null for missing or empty ranges', function () {
            expect(getRangeAt(null, 10)).to.be.null;
            expect(getRangeAt(createTimeRanges(), 10)).to.be.null;
        });

        it('should return the range containing the time', function () {
            const ranges = createTimeRanges([{ start: 2, end: 5 }, { start: 8, end: 11 }]);

            expect(getRangeAt(ranges, 10)).to.deep.equal({ start: 8, end: 11 });
        });

        it('should merge following ranges separated by a tolerated gap', function () {
            const ranges = createTimeRanges([{ start: 9, end: 10.05 }, { start: 10.1, end: 11 }]);

            expect(getRangeAt(ranges, 10, 0.15)).to.deep.equal({ start: 9, end: 11 });
        });

        it('should use the default tolerance when the time is just before a range', function () {
            const ranges = createTimeRanges([{ start: 10.14, end: 11 }]);

            expect(getRangeAt(ranges, 10)).to.deep.equal({ start: 10.14, end: 11 });
        });

        it('should use the default tolerance when the tolerance is null', function () {
            const ranges = createTimeRanges([{ start: 10.14, end: 11 }]);

            expect(getRangeAt(ranges, 10, null)).to.deep.equal({ start: 10.14, end: 11 });
        });

        it('should return null when the closest range exceeds the tolerance', function () {
            const ranges = createTimeRanges([{ start: 10.2, end: 11 }]);

            expect(getRangeAt(ranges, 10, 0.15)).to.be.null;
        });

        it('should exclude the end boundary when the tolerance is zero', function () {
            const ranges = createTimeRanges([{ start: 2, end: 5 }]);

            expect(getRangeAt(ranges, 5, 0)).to.be.null;
        });
    });

    describe('getBufferLength', function () {
        it('should return zero when no range matches', function () {
            expect(getBufferLength(createTimeRanges(), 10, 0)).to.equal(0);
        });

        it('should return the remaining length of the merged range', function () {
            const ranges = createTimeRanges([{ start: 9, end: 10.05 }, { start: 10.1, end: 11 }]);

            expect(getBufferLength(ranges, 10, 0.15)).to.equal(1);
        });
    });
});
