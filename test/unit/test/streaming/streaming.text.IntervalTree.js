import {IntervalTree} from '../../../../src/streaming/text/IntervalTree.js';
import {expect} from 'chai';

describe('IntervalTree', function () {

    let intervalTree;

    beforeEach(function () {
        intervalTree = new IntervalTree();
    });

    describe('Constructor', function () {
        it('should create an empty interval tree', function () {
            expect(intervalTree.getSize()).to.equal(0);
            expect(intervalTree.getAllCues()).to.deep.equal([]);
        });
    });

    describe('Method addCue', function () {
        it('should add a single cue to the tree', function () {
            const cue = {
                startTime: 0,
                endTime: 2,
                text: 'Test cue'
            };

            intervalTree.addCue(cue);

            expect(intervalTree.getSize()).to.equal(1);
            const allCues = intervalTree.getAllCues();
            expect(allCues).to.have.length(1);
            expect(allCues[0]).to.equal(cue);
        });

        it('should add multiple cues in order', function () {
            const cues = [
                { startTime: 0, endTime: 2, text: 'First cue' },
                { startTime: 2, endTime: 4, text: 'Second cue' },
                { startTime: 4, endTime: 6, text: 'Third cue' }
            ];

            cues.forEach(cue => intervalTree.addCue(cue));

            expect(intervalTree.getSize()).to.equal(3);
            const allCues = intervalTree.getAllCues();
            expect(allCues).to.have.length(3);
            expect(allCues[0].text).to.equal('First cue');
            expect(allCues[1].text).to.equal('Second cue');
            expect(allCues[2].text).to.equal('Third cue');
        });

        it('should add multiple cues out of order', function () {
            const cues = [
                { startTime: 4, endTime: 6, text: 'Third cue' },
                { startTime: 0, endTime: 2, text: 'First cue' },
                { startTime: 2, endTime: 4, text: 'Second cue' }
            ];

            cues.forEach(cue => intervalTree.addCue(cue));

            expect(intervalTree.getSize()).to.equal(3);
            const allCues = intervalTree.getAllCues();
            expect(allCues).to.have.length(3);
            // Should be sorted by start time
            expect(allCues[0].text).to.equal('First cue');
            expect(allCues[1].text).to.equal('Second cue');
            expect(allCues[2].text).to.equal('Third cue');
        });

        it('should handle overlapping cues', function () {
            const cues = [
                { startTime: 0, endTime: 4, text: 'Long cue' },
                { startTime: 2, endTime: 3, text: 'Overlapping cue' },
                { startTime: 1, endTime: 5, text: 'Another overlapping cue' }
            ];

            cues.forEach(cue => intervalTree.addCue(cue));

            expect(intervalTree.getSize()).to.equal(3);
        });

        it('should handle cues with same start time but different end times', function () {
            const cues = [
                { startTime: 0, endTime: 2, text: 'Short cue' },
                { startTime: 0, endTime: 4, text: 'Long cue' }
            ];

            cues.forEach(cue => intervalTree.addCue(cue));

            expect(intervalTree.getSize()).to.equal(2);
            const allCues = intervalTree.getAllCues();
            expect(allCues[0].text).to.equal('Short cue'); // Should come first (shorter end time)
            expect(allCues[1].text).to.equal('Long cue');
        });

        it('should handle cues with same timing but different text', function () {
            const cues = [
                { startTime: 0, endTime: 2, text: 'First cue' },
                { startTime: 0, endTime: 2, text: 'Second cue' }
            ];

            cues.forEach(cue => intervalTree.addCue(cue));

            expect(intervalTree.getSize()).to.equal(2);
            const allCues = intervalTree.getAllCues();
            expect(allCues[0].text).to.equal('First cue'); // Alphabetical order
            expect(allCues[1].text).to.equal('Second cue');
        });

        it('should skip duplicate cues with identical timing and text', function () {
            const cue = { startTime: 0, endTime: 2, text: 'Test cue' };

            intervalTree.addCue(cue);
            intervalTree.addCue(cue);

            expect(intervalTree.getSize()).to.equal(1);
        });
    });

    describe('Method findCuesInRange', function () {
        beforeEach(function () {
            const cues = [
                { startTime: 0, endTime: 2, text: 'First cue' },
                { startTime: 2, endTime: 4, text: 'Second cue' },
                { startTime: 4, endTime: 6, text: 'Third cue' },
                { startTime: 6, endTime: 8, text: 'Fourth cue' }
            ];
            cues.forEach(cue => intervalTree.addCue(cue));
        });

        it('should find cues in exact range', function () {
            const cues = intervalTree.findCuesInRange(2, 4);
            expect(cues).to.have.length(1);
            expect(cues[0].text).to.equal('Second cue');
        });

        it('should find overlapping cues', function () {
            const cues = intervalTree.findCuesInRange(1, 3);
            expect(cues).to.have.length(2);
            expect(cues.some(c => c.text === 'First cue')).to.be.true;
            expect(cues.some(c => c.text === 'Second cue')).to.be.true;
        });

        it('should find multiple overlapping cues', function () {
            const cues = intervalTree.findCuesInRange(1, 5);
            expect(cues).to.have.length(3);
            expect(cues.some(c => c.text === 'First cue')).to.be.true;
            expect(cues.some(c => c.text === 'Second cue')).to.be.true;
            expect(cues.some(c => c.text === 'Third cue')).to.be.true;
        });

        it('should return empty array for non-overlapping range', function () {
            const cues = intervalTree.findCuesInRange(10, 12);
            expect(cues).to.deep.equal([]);
        });

        it('should handle point queries', function () {
            const cues = intervalTree.findCuesAtTime(2);
            expect(cues).to.have.length(1);
            expect(cues[0].text).to.equal('Second cue');
        });

        it('should handle overlapping cues with same start time', function () {
            // Add overlapping cues
            intervalTree.addCue({ startTime: 2, endTime: 5, text: 'Overlapping cue' });

            const cues = intervalTree.findCuesInRange(2, 4);
            expect(cues).to.have.length(2);
            expect(cues.some(c => c.text === 'Second cue')).to.be.true;
            expect(cues.some(c => c.text === 'Overlapping cue')).to.be.true;
        });
    });

    describe('Method findCuesAtTime', function () {
        beforeEach(function () {
            const cues = [
                { startTime: 0, endTime: 2, text: 'First cue' },
                { startTime: 2, endTime: 4, text: 'Second cue' },
                { startTime: 4, endTime: 6, text: 'Third cue' }
            ];
            cues.forEach(cue => intervalTree.addCue(cue));
        });

        it('should find cue at exact start time', function () {
            const cues = intervalTree.findCuesAtTime(2);
            expect(cues).to.have.length(1);
            expect(cues[0].text).to.equal('Second cue');
        });

        it('should find cue at middle time', function () {
            const cues = intervalTree.findCuesAtTime(3);
            expect(cues).to.have.length(1);
            expect(cues[0].text).to.equal('Second cue');
        });

        it('should return empty array for time outside all cues', function () {
            const cues = intervalTree.findCuesAtTime(10);
            expect(cues).to.deep.equal([]);
        });
    });
});
