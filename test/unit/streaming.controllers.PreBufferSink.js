import PreBufferSink from '../../src/streaming/PreBufferSink';

const expect = require('chai').expect;
const context = {};

describe('PreBufferSink', function () {
    function makeChunk(start, end, data) {
        const chunk = {
            start: start || 0,
            end: end || 4,
            data: data || 'chickens',
            segmentType: 'data'
        };

        return chunk;
    }

    let sink;

    beforeEach(function () {
        sink = PreBufferSink(context).create();
    });

    describe('Append/Discharge functions', function () {
        it('should take a chunk and return it on discharge', function () {
            sink.append(makeChunk());

            const chunkList = sink.discharge();

            expect(chunkList).to.have.length(1);
            const chunk = chunkList[0];
            expect(chunk.start).to.equal(0);
            expect(chunk.end).to.equal(4);
            expect(chunk.data).to.equal('chickens');
        });

        it('should take a series of chunks and return them in chronological order on discharge', function () {
            sink.append(makeChunk(4, 8));
            sink.append(makeChunk(12, 16));
            sink.append(makeChunk(16, 20));
            sink.append(makeChunk(0, 4));
            sink.append(makeChunk(8, 12));

            const chunkList = sink.discharge();
            expect(chunkList).to.have.length(5);

            let lastStart, lastEnd;
            for (let i = 0; i < chunkList.length; i++) {
                const chunk = chunkList[i];
                if (i > 0) {
                    expect(lastStart < chunk.start);
                    expect(lastEnd < chunk.end);
                }
                lastStart = chunk.start;
                lastEnd = chunk.end;
            }
        });

        it('should return an init segment if it is the last segment that is passed in', function () {
            const chunk = makeChunk();
            chunk.segmentType = 'InitializationSegment';

            sink.append(chunk);

            const chunkList = sink.discharge();
            expect(chunkList).to.have.length(1);
        });

        it('should not return an init segment if other media segments are passed in afterwards', function () {
            const chunk = makeChunk();
            chunk.segmentType = 'InitializationSegment';

            sink.append(chunk);
            sink.append(makeChunk(0, 4));

            const chunkList = sink.discharge();
            expect(chunkList).to.have.length(1);
            expect(chunkList[0].segmentType).to.equal('data');
        });

        it('should discharge only over a specified timerange', function () {
            sink.append(makeChunk(0, 4));
            sink.append(makeChunk(4, 8));
            sink.append(makeChunk(8, 12));
            sink.append(makeChunk(12, 16));
            sink.append(makeChunk(16, 20));

            const chunkList = sink.discharge(0, 12);
            expect(chunkList).to.have.length(3);

            expect(chunkList[0].start).to.equal(0);
            expect(chunkList[1].start).to.equal(4);
            expect(chunkList[2].start).to.equal(8);
        });

        it('should remove chunks after they have been discharged', function () {
            sink.append(makeChunk(0, 4));
            sink.append(makeChunk(4, 8));
            sink.append(makeChunk(8, 12));
            sink.append(makeChunk(12, 16));
            sink.append(makeChunk(16, 20));

            const chunkList = sink.discharge(0, 12);
            expect(chunkList).to.have.length(3);

            const emptyChunkList = sink.discharge(0, 12);
            expect(emptyChunkList).to.have.length(0);

            const remainingChunkList = sink.discharge(12, 20);
            expect(remainingChunkList).to.have.length(2);
        });
    });

    describe('getAllBufferRanges', function () {
        it('should report the buffer ranges of the chunks that have been added', function () {
            sink.append(makeChunk(0, 4));
            sink.append(makeChunk(4, 8));
            sink.append(makeChunk(12, 16));
            sink.append(makeChunk(16, 20));

            const timeRanges = sink.getAllBufferRanges();

            expect(timeRanges).to.have.length(2);

            expect(timeRanges.start(0)).to.equal(0);
            expect(timeRanges.end(0)).to.equal(8);
            expect(timeRanges.start(1)).to.equal(12);
            expect(timeRanges.end(1)).to.equal(20);
        });
    });

    describe('Reset', function () {
        it('should have no segments left after it has reset', function () {
            sink.append(makeChunk(0, 4));
            sink.append(makeChunk(4, 8));
            sink.append(makeChunk(8, 12));
            sink.append(makeChunk(12, 16));
            sink.append(makeChunk(16, 20));

            sink.reset();

            const emptyChunkList = sink.discharge();
            expect(emptyChunkList).to.have.length(0);
        });
    });
});
