import PreBufferSink from '../../../../src/streaming/PreBufferSink.js';

import {expect} from 'chai';
const context = {};

describe('PreBufferSink', function () {
    function makeInit(representation) {
        const init = {
            data: 'init segment',
            segmentType: 'InitializationSegment',
            representation: representation || { id: 'representation1' }
        };

        return init;
    }

    function makeChunk(start, end, representation) {
        const chunk = {
            start: start || 0,
            end: end || 4,
            data: 'chickens',
            segmentType: 'data',
            representation: representation || { id: 'representation1' }
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

        it('should take a series of chunks and corresponding inits and return them in chronological order on discharge', function () {
            const representation2 = { id: 'representation2' };
            sink.append(makeInit());
            sink.append(makeChunk(4, 8));
            sink.append(makeInit(representation2));
            sink.append(makeChunk(12, 16, representation2));
            sink.append(makeChunk(16, 20, representation2));
            sink.append(makeInit());
            sink.append(makeChunk(0, 4));
            sink.append(makeChunk(8, 12));

            const chunkList = sink.discharge();
            expect(chunkList).to.have.length(7);

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

            expect(chunkList[0].segmentType).to.equal('InitializationSegment');
            expect(chunkList[0].representation.id).to.equal('representation1');

            expect(chunkList[4].segmentType).to.equal('InitializationSegment');
            expect(chunkList[4].representation.id).to.equal('representation2');
        });

        it('should return an init segment if it is the last segment that is passed in', function () {
            sink.append(makeInit());
            sink.append(makeChunk());
            sink.append(makeInit({ id: 'representation2' }));

            const chunkList = sink.discharge();
            expect(chunkList).to.have.length(3);
        });

        it('should not return an init segment last if other media segments are passed in afterwards', function () {
            const init = makeInit();

            sink.append(init);
            sink.append(makeChunk(0, 4));

            const chunkList = sink.discharge();
            expect(chunkList).to.have.length(2);
            expect(chunkList[0].segmentType).to.equal('InitializationSegment');
            expect(chunkList[1].segmentType).to.equal('data');
        });

        it('should remove chunks after they have been discharged', function () {
            sink.append(makeInit());
            sink.append(makeChunk(0, 4));
            sink.append(makeChunk(4, 8));
            sink.append(makeChunk(8, 12));
            sink.append(makeChunk(12, 16));
            sink.append(makeChunk(16, 20));

            const chunkList = sink.discharge();
            expect(chunkList).to.have.length(6);
            expect(sink.getAllBufferRanges().length).to.equal(0);
        });
    });

    describe('getAllBufferRanges', function () {
        it('should report the buffer ranges of the chunks that have been added', function () {
            sink.append(makeInit());
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
            sink.append(makeInit());
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
