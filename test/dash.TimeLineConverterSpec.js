import EventBus from '../src/core/EventBus';
import VoHelper from './helpers/VOHelper';
import TimeLineConverter from '../src/dash/utils/TimelineConverter';
import Events from '../src/core/events/Events';
import SpecHelper from './helpers/SpecHelper';

const expect = require('chai').expect;
const sinon = require('sinon');

describe("TimelineConverter", function () {
    const context = {},
        testType = "video",
        voHelper = new VoHelper(),
        specHelper = new SpecHelper(),
        eventBus = EventBus(context).getInstance(),
        representation = voHelper.getDummyRepresentation(testType),
        timeLineConverter = TimeLineConverter(context).getInstance();

    timeLineConverter.initialize();

    it("should calculate timestamp offset", function () {
        var expectedValue = -10;

        expect(timeLineConverter.calcMSETimeOffset(representation)).to.be.equal(expectedValue);
    });

    it("should set an expected live edge", function () {
        var expectedValue = 10;

        timeLineConverter.setExpectedLiveEdge(expectedValue);
        expect(timeLineConverter.getExpectedLiveEdge()).to.be.equal(expectedValue);
    });

    it("should calculate presentation time from media time", function () {
        var expectedValue = 0,
            mediaTime = 10;

        expect(timeLineConverter.calcPresentationTimeFromMediaTime(mediaTime, representation)).to.be.equal(expectedValue);
    });

    it("should calculate media time from representation time", function () {
        var expectedValue = 10,
            representationTime = 0;

        expect(timeLineConverter.calcMediaTimeFromPresentationTime(representationTime, representation)).to.be.equal(expectedValue);
    });

    it("should calculate presentation time from wall-clock time", function () {
        var expectedValue = 10,
            wallClock = new Date(specHelper.getUnixTime().getTime() + expectedValue * 1000);
        expect(timeLineConverter.calcPresentationTimeFromWallTime(wallClock, representation.adaptation.period)).to.be.equal(expectedValue);
    });

    it("should calculate availability window for static mpd", function () {

        representation.adaptation.period.start = 0;
        representation.adaptation.period.duration = 100;
        representation.adaptation.period.mpd.manifest.type = "static";
        const range = timeLineConverter.calcSegmentAvailabilityRange(representation, false);
        expect(range.start).to.be.equal(representation.adaptation.period.start);
        expect(range.end).to.be.equal(representation.adaptation.period.duration);
    });

    describe("when time sync is complete", function () {
        let updateCompleted;

        beforeEach(function (done) {
            updateCompleted = false;
            setTimeout(() => {
                eventBus.trigger(Events.TIME_SYNCHRONIZATION_COMPLETED, {offset:0});
                updateCompleted = true;
                done();
            }, specHelper.getExecutionDelay());
        });

        it("should set isTimeSyncCompleted", function () {
            expect(timeLineConverter.isTimeSyncCompleted()).to.be.ok;
        });

        it("should calculate availability window for dynamic mpd", function () {

            var clock = sinon.useFakeTimers(new Date().getTime());
            representation.adaptation.period.mpd.availabilityStartTime = new Date(new Date().getTime() - representation.adaptation.period.mpd.timeShiftBufferDepth * 1000);
            timeLineConverter.setExpectedLiveEdge(100);

            const range = timeLineConverter.calcSegmentAvailabilityRange(representation, true);
            expect(range.start).to.be.equal(0);
            expect(range.end).to.be.equal(49);
            clock.restore();
        });
    });
});
