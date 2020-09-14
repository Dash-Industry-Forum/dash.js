import EventBus from '../../src/core/EventBus';
import TimelineConverter from '../../src/dash/utils/TimelineConverter';
import Events from '../../src/core/events/Events';

import SpecHelper from './helpers/SpecHelper';
import VoHelper from './helpers/VOHelper';

const expect = require('chai').expect;
const sinon = require('sinon');

describe('TimelineConverter', function () {
    const context = {};
    const testType = 'video';
    const voHelper = new VoHelper();
    const specHelper = new SpecHelper();
    const eventBus = EventBus(context).getInstance();
    const timelineConverter = TimelineConverter(context).getInstance();
    let representation;

    timelineConverter.initialize();

    beforeEach(() => {
        representation = voHelper.getDummyRepresentation(testType);
    });

    it('should calculate presentation time from media time', function () {
        const expectedValue = 0;
        const mediaTime = 10;

        expect(timelineConverter.calcPresentationTimeFromMediaTime(mediaTime, representation)).to.be.equal(expectedValue);
    });

    it('should calculate media time from representation time', function () {
        const expectedValue = 10;
        const representationTime = 0;

        expect(timelineConverter.calcMediaTimeFromPresentationTime(representationTime, representation)).to.be.equal(expectedValue);
    });

    it('should calculate presentation time from wall-clock time', function () {
        const expectedValue = 10;
        const wallClock = new Date(specHelper.getUnixTime().getTime() + expectedValue * 1000);
        expect(timelineConverter.calcPresentationTimeFromWallTime(wallClock, representation.adaptation.period)).to.be.equal(expectedValue);
    });

    it('should calculate availability window for static mpd and a single representation', function () {

        representation.adaptation.period.start = 0;
        representation.adaptation.period.duration = 100;
        representation.adaptation.period.mpd.manifest.type = 'static';
        const range = timelineConverter.calcSegmentAvailabilityRangeForRepresentation(representation, false);
        expect(range.start).to.be.equal(representation.adaptation.period.start);
        expect(range.end).to.be.equal(representation.adaptation.period.duration);
    });

    it('should calculate availability window for static mpd with a single period', function () {
        const stream = _getStream({start: 0, duration: 50});
        const range = timelineConverter.calcSegmentAvailabilityRangeForAllPeriods([stream], representation, false);
        expect(range.start).to.be.equal(0);
        expect(range.end).to.be.equal(50);
    });

    it('should calculate availability window for static mpd with multiple periods', function () {
        const streams = [_getStream({start: 0, duration: 50}), _getStream({start: 50, duration: 100})];
        const range = timelineConverter.calcSegmentAvailabilityRangeForAllPeriods(streams, representation, false);
        expect(range.start).to.be.equal(0);
        expect(range.end).to.be.equal(150);
    });

    it('should calculate availability window for static mpd with multiple periods and a gap', function () {
        const streams = [_getStream({start: 0, duration: 50}), _getStream({start: 51, duration: 100})];
        const range = timelineConverter.calcSegmentAvailabilityRangeForAllPeriods(streams, representation, false);
        expect(range.start).to.be.equal(0);
        expect(range.end).to.be.equal(150);
    });

    describe('when time sync is complete', function () {
        let updateCompleted;

        beforeEach(function (done) {
            updateCompleted = false;
            setTimeout(() => {
                eventBus.trigger(Events.TIME_SYNCHRONIZATION_COMPLETED, {offset: 0});
                updateCompleted = true;
                done();
            }, specHelper.getExecutionDelay());
        });

        it('should set isTimeSyncCompleted', function () {
            expect(timelineConverter.isTimeSyncCompleted()).to.be.ok; // jshint ignore:line
        });

        it('should calculate availability window for dynamic mpd and a single representation', function () {

            var clock = sinon.useFakeTimers(new Date().getTime());
            representation.adaptation.period.mpd.availabilityStartTime = new Date(new Date().getTime() - representation.adaptation.period.mpd.timeShiftBufferDepth * 1000);

            const range = timelineConverter.calcSegmentAvailabilityRangeForRepresentation(representation, true);
            expect(range.start).to.be.equal(0);
            expect(range.end).to.be.equal(49);
            clock.restore();
        });

        it('should calculate availability window for dynamic multiperiod mpd with combined duration greater than tsbd ', function () {

            var clock = sinon.useFakeTimers(new Date().getTime());
            representation.adaptation.period.mpd.availabilityStartTime = new Date(new Date().getTime() - representation.adaptation.period.mpd.timeShiftBufferDepth * 1000);

            const streams = [_getStream({start: 0, duration: 10}), _getStream({
                start: 10,
                duration: 40
            }), _getStream({start: 50, duration: 10})];

            const range = timelineConverter.calcSegmentAvailabilityRangeForAllPeriods(streams, representation, true);
            expect(range.start).to.be.equal(0);
            expect(range.end).to.be.equal(49);
            clock.restore();
        });

        it('should calculate availability window for dynamic multiperiod mpd with combined available duration smaller than tsbd ', function () {

            var clock = sinon.useFakeTimers(new Date().getTime());
            representation.adaptation.period.mpd.availabilityStartTime = new Date(new Date().getTime() - representation.adaptation.period.mpd.timeShiftBufferDepth * 1000);

            const streams = [_getStream({start: 20, duration: 10}), _getStream({
                start: 30,
                duration: 10
            }), _getStream({start: 40, duration: 30})];
            const range = timelineConverter.calcSegmentAvailabilityRangeForAllPeriods(streams, representation, true);
            expect(range.start).to.be.equal(20);
            expect(range.end).to.be.equal(49);
            clock.restore();
        });
    });
});

function _getStream(initData = {}) {
    const start = !isNaN(initData.start) ? initData.start : 0;
    const duration = !isNaN(initData.duration) ? initData.duration : 30;

    return {
        getStreamInfo: () => {
            return {
                start,
                duration
            };
        }
    };
}
