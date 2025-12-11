import ExternalSourceBuffer from '../../../../src/streaming/ExternalSourceBuffer.js';
import EventBus from '../../../../src/core/EventBus.js';

import {expect} from 'chai';

describe('ExternalSourceBuffer', () => {
    let sourceBuffer;

    beforeEach(() => {
        const eventBus = EventBus().getInstance();
        sourceBuffer = new ExternalSourceBuffer('video/mp4; codecs="lvc1"', eventBus);
    });

    it('should initialize with the correct default values', () => {
        expect(sourceBuffer.mimeType).to.equal('video/mp4; codecs="lvc1"');
        expect(sourceBuffer.updating).to.be.false;
        expect(sourceBuffer.chunks).to.be.an('array').that.is.empty;
        expect(sourceBuffer.appendWindowStart).to.equal(0);
        expect(sourceBuffer.appendWindowEnd).to.equal(Infinity);
        expect(sourceBuffer.timestampOffset).to.equal(0);
        expect(sourceBuffer.mode).to.equal('segments');
    });

    it('appendBuffer should add data to the buffer', () => {
        const data = new Uint8Array([1, 2, 3, 4]);
        const start = 0;
        const end = 5;
        sourceBuffer.onupdateend = (done) => {
            expect(sourceBuffer.chunks).to.have.lengthOf(1);
            expect(sourceBuffer.chunks[0].data).to.eql([1, 2, 3, 4]);
            expect(sourceBuffer.chunks[0].start).to.eql(0);
            expect(sourceBuffer.chunks[0].end).to.eql(5);
            done();
        };
        sourceBuffer.appendBuffer(data, start, end);
    });

    it('should throw an error if appendBuffer is called while updating', () => {
        const data = new Uint8Array([1, 2, 3, 4, 5]);
        const start = 5;
        const end = 10;
        sourceBuffer.updating = true;
        expect(() => sourceBuffer.appendBuffer(data, start, end)).to.throw('SourceBuffer is currently updating');
    });

    it('abort should clear the buffer and set updating to false', () => {
        const data = new Uint8Array([1, 2, 3]);
        const start = 10;
        const end = 15;
        sourceBuffer.onupdateend = (done) => {
            sourceBuffer.onupdateend = (done) => {
                expect(sourceBuffer.chunks).to.be.empty;
                expect(sourceBuffer.updating).to.be.false;    
                done();
            }
            sourceBuffer.abort();
            done();
        }
        sourceBuffer.appendBuffer(data, start, end);
    });

    it('remove should remove data from the buffer', () => {
        const entry_0 = {
            data: new Uint8Array([5, 6, 7]),
            start: 15,
            end: 20,
        };
        const entry_1 = {
            data: new Uint8Array([0, 1, 2]),
            start: 10,
            end: 15,
        };
        sourceBuffer.onupdateend = (done) => {
            sourceBuffer.onupdateend = (done) => {
                sourceBuffer.onupdateend = (done) => {
                    expect(sourceBuffer.chunks[0].data).to.eql([0, 1, 2]);
                    expect(sourceBuffer.chunks[0].start).to.eql(10);
                    expect(sourceBuffer.chunks[0].end).to.eql(15);
                    done();    
                }
                sourceBuffer.remove(15, 20);
                done();
            };
            sourceBuffer.appendBuffer(entry_1.data, entry_1.start, entry_1.end);
            done();
        };
        sourceBuffer.appendBuffer(entry_0.data, entry_0.start, entry_0.end);
    });

    it('should throw an error if remove is called while updating', () => {
        sourceBuffer.updating = true;
        expect(() => sourceBuffer.remove(0, 1)).to.throw('SourceBuffer is currently updating');
    });
});
