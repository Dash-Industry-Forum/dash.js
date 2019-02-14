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
    const representation = voHelper.getDummyRepresentation(testType);
    const timelineConverter = TimelineConverter(context).getInstance();

    timelineConverter.initialize();

    it('should set an expected live edge', function () {
        const expectedValue = 10;

        timelineConverter.setExpectedLiveEdge(expectedValue);
        expect(timelineConverter.getExpectedLiveEdge()).to.be.equal(expectedValue);
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

    it('should calculate availability window for static mpd', function () {

        representation.adaptation.period.start = 0;
        representation.adaptation.period.duration = 100;
        representation.adaptation.period.mpd.manifest.type = 'static';
        const range = timelineConverter.calcSegmentAvailabilityRange(representation, false);
        expect(range.start).to.be.equal(representation.adaptation.period.start);
        expect(range.end).to.be.equal(representation.adaptation.period.duration);
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

        it('should calculate availability window for dynamic mpd', function () {

            var clock = sinon.useFakeTimers(new Date().getTime());
            representation.adaptation.period.mpd.availabilityStartTime = new Date(new Date().getTime() - representation.adaptation.period.mpd.timeShiftBufferDepth * 1000);
            timelineConverter.setExpectedLiveEdge(100);

            const range = timelineConverter.calcSegmentAvailabilityRange(representation, true);
            expect(range.start).to.be.equal(0);
            expect(range.end).to.be.equal(49);
            clock.restore();
        });
    });
});
