import C2paSequenceTracker, { MAX_REPORTED_MISSING_SEGMENTS } from '../../../../src/streaming/c2pa/C2paSequenceTracker.js';
import {expect} from 'chai';

const context = {};

describe('C2paSequenceTracker', function () {

    let tracker;

    beforeEach(() => {
        tracker = C2paSequenceTracker(context).create();
    });

    it('should treat the first observed sequence number as a fresh baseline', () => {
        const result = tracker.check('stream3', 10);

        expect(result).to.deep.equal({status: 'ok', missing: [], missingCount: 0});
    });

    it('should detect a replay', () => {
        tracker.check('stream3', 10);

        expect(tracker.check('stream3', 10)).to.deep.equal({status: 'replayed', missing: [], missingCount: 0});
    });

    it('should detect a reorder', () => {
        tracker.check('stream3', 10);

        expect(tracker.check('stream3', 9)).to.deep.equal({status: 'reordered', missing: [], missingCount: 0});
    });

    it('should enumerate a small gap', () => {
        tracker.check('stream3', 10);

        expect(tracker.check('stream3', 13)).to.deep.equal({status: 'ok', missing: [11, 12], missingCount: 2});
    });

    it('should not enumerate a gap larger than the reported limit, but still report its size', () => {
        tracker.check('stream3', 10);

        const result = tracker.check('stream3', 10 + MAX_REPORTED_MISSING_SEGMENTS + 2);

        expect(result.status).to.equal('ok');
        expect(result.missing).to.deep.equal([]);
        expect(result.missingCount).to.equal(MAX_REPORTED_MISSING_SEGMENTS + 1);
    });

    it('should keep state independent per track', () => {
        tracker.check('stream3', 10);
        tracker.check('stream4', 500);

        expect(tracker.check('stream3', 10)).to.deep.equal({status: 'replayed', missing: [], missingCount: 0});
        expect(tracker.check('stream4', 500)).to.deep.equal({status: 'replayed', missing: [], missingCount: 0});
    });

    it('should not sequence-check a NaN segment number', () => {
        expect(tracker.check('stream3', NaN)).to.deep.equal({status: 'ok', missing: [], missingCount: 0});
        // A real number afterwards still reads as a fresh baseline, since NaN was never recorded.
        expect(tracker.check('stream3', 10)).to.deep.equal({status: 'ok', missing: [], missingCount: 0});
    });

    it('should read as a fresh baseline after resetForTrack', () => {
        tracker.check('stream3', 10);

        tracker.resetForTrack('stream3');

        expect(tracker.check('stream3', 10)).to.deep.equal({status: 'ok', missing: [], missingCount: 0});
    });

    it('should clear every track after reset', () => {
        tracker.check('stream3', 10);
        tracker.check('stream4', 500);

        tracker.reset();

        expect(tracker.check('stream3', 10)).to.deep.equal({status: 'ok', missing: [], missingCount: 0});
        expect(tracker.check('stream4', 500)).to.deep.equal({status: 'ok', missing: [], missingCount: 0});
    });
});
