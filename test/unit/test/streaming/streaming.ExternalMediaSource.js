import ExternalMediaSource from '../../../../src/streaming/ExternalMediaSource.js';
import ExternalSourceBuffer from '../../../../src/streaming/ExternalSourceBuffer.js';
import EventBus from '../../../../src/core/EventBus.js';

import {expect} from 'chai';

describe('ExternalMediaSource', () => {
    let mediaSource;

    beforeEach(() => {
        const eventBus = EventBus().getInstance();
        mediaSource = new ExternalMediaSource(eventBus);
    });

    it('should initialize with the correct default values', () => {
        expect(mediaSource.sourceBuffers).to.be.an.instanceof(Map).and.to.have.property('size', 0);
        expect(mediaSource.duration).to.be.NaN;
        expect(mediaSource.readyState).to.equal('closed');
    });

    it('addSourceBuffer should add a new source buffer', () => {
        mediaSource.onsourceopen = (done) => {
            const mimeType = 'video/mp4; codecs="lvc1"';
            const sourceBuffer = mediaSource.addSourceBuffer(mimeType);
            expect(mediaSource.sourceBuffers).to.have.property('size', 1);
            expect(sourceBuffer).to.be.instanceOf(ExternalSourceBuffer);
            expect(sourceBuffer.mimeType).to.equal(mimeType);
            done();
        }
        mediaSource.open();
    });

    it('removeSourceBuffer should remove an existing source buffer', () => {
        mediaSource.onsourceopen = (done) => {
            const mimeType = 'video/mp4; codecs="lvc1"';
            const sourceBuffer = mediaSource.addSourceBuffer(mimeType);
            mediaSource.removeSourceBuffer(sourceBuffer);
            expect(mediaSource.sourceBuffers).to.have.property('size', 0);
            done();
        }
        mediaSource.open();
    });

    it('should set and get duration correctly', () => {
        mediaSource.onsourceopen = (done) => {
            mediaSource.duration = 120.5;
            expect(mediaSource.duration).to.equal(120.5);
            done();
        }
        mediaSource.open();
    });

    it('setting duration should throw an error if readyState is not "open"', () => {
        expect(() => {
            mediaSource.duration = 100;
        }).to.throw('ExternalMediaSource is not open');
    });

    it('setting duration should update the duration when readyState is "open"', () => {
        mediaSource.onsourceopen = (done) => {
            mediaSource.duration = 100;
            expect(mediaSource.duration).to.equal(100);
            done();
        }
        mediaSource.open();
    });

    it('should transition readyState correctly', () => {
        expect(mediaSource.readyState).to.equal('closed');
        mediaSource.onsourceopen = (done) => {
            expect(mediaSource.readyState).to.equal('open');
            mediaSource.onsourceended = (done) => {
                expect(mediaSource.readyState).to.equal('ended');
                done();
            }
            mediaSource.endOfStream();
            done();
        }
        mediaSource.open();
    });
});
