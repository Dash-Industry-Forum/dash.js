import EventBus from '../../src/core/EventBus';
import TimelineConverter from '../../src/dash/utils/TimelineConverter';
import Events from '../../src/core/events/Events';

import SpecHelper from './helpers/SpecHelper';
import VoHelper from './helpers/VOHelper';
import DashConstants from "../../src/dash/constants/DashConstants";
import Settings from '../../src/core/Settings';
import StreamMock from './mocks/StreamMock';

const expect = require('chai').expect;
const sinon = require('sinon');

describe('TimelineConverter', function () {
    const context = {};
    const testType = 'video';
    const voHelper = new VoHelper();
    const specHelper = new SpecHelper();
    const eventBus = EventBus(context).getInstance();
    const timelineConverter = TimelineConverter(context).getInstance();
    const settings = Settings(context).getInstance();
    let representation;
    let timelineRepresentation;

    timelineConverter.initialize();

    beforeEach(() => {
        representation = voHelper.getDummyRepresentation(testType);
        timelineRepresentation = voHelper.getDummyTimelineRepresentation(testType);
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

    describe('should calculate availability window for', () => {

        describe('a static MPD', () => {

            before(() => {
                representation.adaptation.period.mpd.manifest.type = 'static';
                timelineRepresentation.adaptation.period.mpd.manifest.type = 'static';
            });

            beforeEach(() => {
                settings.update({
                    streaming: {
                        calcSegmentAvailabilityRangeFromTimeline: false
                    }
                });
            });

            it('with SegmentTemplate', function () {
                representation.adaptation.period.start = 0;
                representation.adaptation.period.duration = 100;

                const range = timelineConverter.calcAvailabilityWindow(representation, false);
                expect(range.start).to.be.equal(representation.adaptation.period.start);
                expect(range.end).to.be.equal(representation.adaptation.period.duration);
            });

            it('with SegmentTimeline and shouldCalculateFromTimeline set to false', function () {
                timelineRepresentation.adaptation.period.start = 0;
                timelineRepresentation.adaptation.period.duration = 100;
                const range = timelineConverter.calcAvailabilityWindow(representation, false);
                expect(range.start).to.be.equal(representation.adaptation.period.start);
                expect(range.end).to.be.equal(representation.adaptation.period.duration);
            });

            it('with SegmentTimeline and shouldCalculateFromTimeline set to true', function () {
                settings.update({
                    streaming: {
                        calcSegmentAvailabilityRangeFromTimeline: true
                    }
                });
                timelineRepresentation.adaptation.period.start = 0;
                timelineRepresentation.adaptation.period.duration = 100;
                const range = timelineConverter.calcAvailabilityWindow(representation, false);
                expect(range.start).to.be.equal(representation.adaptation.period.start);
                expect(range.end).to.be.equal(representation.adaptation.period.duration);
            });

        });

        describe('a dynamic MPD', () => {

            before(() => {
                representation.adaptation.period.mpd.manifest.type = 'dynamic';
                timelineRepresentation.adaptation.period.mpd.manifest.type = 'dynamic';
                settings.update({
                    streaming: {
                        calcSegmentAvailabilityRangeFromTimeline: false
                    }
                });
            });

            beforeEach(function (done) {
                setTimeout(() => {
                    eventBus.trigger(Events.TIME_SYNCHRONIZATION_COMPLETED, {offset: 0});
                    done();
                }, specHelper.getExecutionDelay());
            });

            it('should set isTimeSyncCompleted', function () {
                expect(timelineConverter.isTimeSyncCompleted()).to.be.ok; // jshint ignore:line
            });

            describe('with SegmentTemplate', function () {

                it('with period duration matching tsbd', function () {
                    const clock = sinon.useFakeTimers(new Date().getTime());
                    representation.adaptation.period.mpd.availabilityStartTime = new Date(new Date().getTime() - representation.adaptation.period.mpd.timeShiftBufferDepth * 1000);

                    const range = timelineConverter.calcAvailabilityWindow(representation, true);
                    expect(range.start).to.be.equal(0);
                    expect(range.end).to.be.equal(50);
                    clock.restore();
                });

                it('with period duration smaller than tsbd', function () {
                    const clock = sinon.useFakeTimers(new Date().getTime());
                    representation.adaptation.period.mpd.availabilityStartTime = new Date(new Date().getTime() - representation.adaptation.period.mpd.timeShiftBufferDepth * 1000);
                    representation.adaptation.period.start = 0;
                    representation.adaptation.period.duration = 30;

                    const range = timelineConverter.calcAvailabilityWindow(representation, true);
                    expect(range.start).to.be.equal(0);
                    expect(range.end).to.be.equal(30);
                    clock.restore();
                });

                it('with period duration greater than tsbd', function () {
                    const clock = sinon.useFakeTimers(new Date().getTime());
                    representation.adaptation.period.mpd.availabilityStartTime = new Date(new Date().getTime() - representation.adaptation.period.mpd.timeShiftBufferDepth * 1000);
                    representation.adaptation.period.start = 0;
                    representation.adaptation.period.duration = 80;

                    const range = timelineConverter.calcAvailabilityWindow(representation, true);
                    expect(range.start).to.be.equal(0);
                    expect(range.end).to.be.equal(50);
                    clock.restore();
                });

                it('with period start greater 0 and duration smaller than tsbd', function () {
                    const clock = sinon.useFakeTimers(new Date().getTime());
                    representation.adaptation.period.mpd.availabilityStartTime = new Date(new Date().getTime() - representation.adaptation.period.mpd.timeShiftBufferDepth * 1000);
                    representation.adaptation.period.start = 20;
                    representation.adaptation.period.duration = 20;

                    const range = timelineConverter.calcAvailabilityWindow(representation, true);
                    expect(range.start).to.be.equal(20);
                    expect(range.end).to.be.equal(40);
                    clock.restore();
                });

                it('with period start greater 0 and duration greater than tsbd', function () {
                    const clock = sinon.useFakeTimers(new Date().getTime());
                    representation.adaptation.period.mpd.availabilityStartTime = new Date(new Date().getTime() - representation.adaptation.period.mpd.timeShiftBufferDepth * 1000);
                    representation.adaptation.period.start = 20;
                    representation.adaptation.period.duration = 100;

                    const range = timelineConverter.calcAvailabilityWindow(representation, true);
                    expect(range.start).to.be.equal(20);
                    expect(range.end).to.be.equal(50);
                    clock.restore();
                });

                it('with period start out of the availability window', function () {
                    const clock = sinon.useFakeTimers(new Date().getTime());
                    representation.adaptation.period.mpd.availabilityStartTime = new Date(new Date().getTime() - representation.adaptation.period.mpd.timeShiftBufferDepth * 1000);
                    representation.adaptation.period.start = 100;
                    representation.adaptation.period.duration = 20;

                    const range = timelineConverter.calcAvailabilityWindow(representation, true);
                    expect(range.end).to.be.below(range.start);
                    clock.restore();
                });

                it('with period infinite duration ', function () {
                    const clock = sinon.useFakeTimers(new Date().getTime());
                    representation.adaptation.period.mpd.availabilityStartTime = new Date(new Date().getTime() - representation.adaptation.period.mpd.timeShiftBufferDepth * 1000);
                    representation.adaptation.period.start = 10;
                    representation.adaptation.period.duration = Number.POSITIVE_INFINITY;
                    representation.segmentInfoType = DashConstants.SEGMENT_TEMPLATE;

                    const range = timelineConverter.calcAvailabilityWindow(representation, true);
                    expect(range.start).to.be.equal(10);
                    expect(range.end).to.be.equal(50);
                    clock.restore();
                });

                it('with an ATO present', function () {
                    const clock = sinon.useFakeTimers(new Date().getTime());
                    representation.adaptation.period.mpd.availabilityStartTime = new Date(new Date().getTime() - representation.adaptation.period.mpd.timeShiftBufferDepth * 1000);
                    representation.adaptation.period.start = 10;
                    representation.adaptation.period.duration = 100;
                    representation.availabilityTimeOffset = 100;

                    const range = timelineConverter.calcAvailabilityWindow(representation, true);
                    expect(range.start).to.be.equal(10);
                    expect(range.end).to.be.equal(110);
                    clock.restore();
                });

                it('with an ATO present but not covering the whole period', function () {
                    const clock = sinon.useFakeTimers(new Date().getTime());
                    representation.adaptation.period.mpd.availabilityStartTime = new Date(new Date().getTime() - representation.adaptation.period.mpd.timeShiftBufferDepth * 1000);
                    representation.adaptation.period.start = 10;
                    representation.adaptation.period.duration = 100;
                    representation.availabilityTimeOffset = 40;

                    const range = timelineConverter.calcAvailabilityWindow(representation, true);
                    expect(range.start).to.be.equal(10);
                    expect(range.end).to.be.equal(90);
                    clock.restore();
                });

            });

            describe('with SegmentTimeline and shouldCalculateFromTimeline is true', function () {

                before(() => {
                    settings.update({
                        streaming: {
                            calcSegmentAvailabilityRangeFromTimeline: true
                        }
                    });
                });

                it('with period duration matching tsbd', function () {
                    const clock = sinon.useFakeTimers(new Date().getTime());
                    timelineRepresentation.adaptation.period.mpd.availabilityStartTime = new Date(new Date().getTime() - representation.adaptation.period.mpd.timeShiftBufferDepth * 1000);

                    const range = timelineConverter.calcAvailabilityWindow(timelineRepresentation, true);
                    expect(range.start).to.be.equal(0);
                    expect(range.end).to.be.equal(50);
                    clock.restore();
                });

                it('with period duration smaller than tsbd', function () {
                    const clock = sinon.useFakeTimers(new Date().getTime());
                    timelineRepresentation.adaptation.period.mpd.availabilityStartTime = new Date(new Date().getTime() - representation.adaptation.period.mpd.timeShiftBufferDepth * 1000);
                    timelineRepresentation.adaptation.period.start = 0;
                    timelineRepresentation.adaptation.period.duration = 30;

                    const range = timelineConverter.calcAvailabilityWindow(timelineRepresentation, true);
                    expect(range.start).to.be.equal(0);
                    expect(range.end).to.be.equal(30);
                    clock.restore();
                });

                it('with period duration greater than tsbd', function () {
                    const clock = sinon.useFakeTimers(new Date().getTime());
                    timelineRepresentation.adaptation.period.mpd.availabilityStartTime = new Date(new Date().getTime() - representation.adaptation.period.mpd.timeShiftBufferDepth * 1000);
                    timelineRepresentation.adaptation.period.start = 0;
                    timelineRepresentation.adaptation.period.duration = 80;

                    const range = timelineConverter.calcAvailabilityWindow(timelineRepresentation, true);
                    expect(range.start).to.be.equal(0);
                    expect(range.end).to.be.equal(50);
                    clock.restore();
                });

                it('with period start greater 0 and duration smaller than tsbd', function () {
                    const clock = sinon.useFakeTimers(new Date().getTime());
                    timelineRepresentation.adaptation.period.mpd.availabilityStartTime = new Date(new Date().getTime() - representation.adaptation.period.mpd.timeShiftBufferDepth * 1000);
                    timelineRepresentation.adaptation.period.start = 20;
                    timelineRepresentation.adaptation.period.duration = 20;

                    const range = timelineConverter.calcAvailabilityWindow(timelineRepresentation, true);
                    expect(range.start).to.be.equal(20);
                    expect(range.end).to.be.equal(40);
                    clock.restore();
                });

                it('with period start greater 0 and duration greater than tsbd', function () {
                    const clock = sinon.useFakeTimers(new Date().getTime());
                    timelineRepresentation.adaptation.period.mpd.availabilityStartTime = new Date(new Date().getTime() - representation.adaptation.period.mpd.timeShiftBufferDepth * 1000);
                    timelineRepresentation.adaptation.period.start = 20;
                    timelineRepresentation.adaptation.period.duration = 100;

                    const range = timelineConverter.calcAvailabilityWindow(timelineRepresentation, true);
                    expect(range.start).to.be.equal(20);
                    expect(range.end).to.be.equal(50);
                    clock.restore();
                });

                it('with period start out of the availability window', function () {
                    const clock = sinon.useFakeTimers(new Date().getTime());
                    timelineRepresentation.adaptation.period.mpd.availabilityStartTime = new Date(new Date().getTime() - representation.adaptation.period.mpd.timeShiftBufferDepth * 1000);
                    timelineRepresentation.adaptation.period.start = 100;
                    timelineRepresentation.adaptation.period.duration = 20;

                    const range = timelineConverter.calcAvailabilityWindow(timelineRepresentation, true);
                    expect(range.end).to.be.below(range.start);
                    clock.restore();
                });

                it('with period infinite duration ', function () {
                    const clock = sinon.useFakeTimers(new Date().getTime());
                    timelineRepresentation.adaptation.period.mpd.availabilityStartTime = new Date(new Date().getTime() - representation.adaptation.period.mpd.timeShiftBufferDepth * 1000);
                    timelineRepresentation.adaptation.period.start = 10;
                    timelineRepresentation.adaptation.period.duration = Number.POSITIVE_INFINITY;

                    const range = timelineConverter.calcAvailabilityWindow(timelineRepresentation, true);
                    expect(range.start).to.be.equal(10);
                    expect(range.end).to.be.equal(50);
                    clock.restore();
                });

                it('with an ATO present', function () {
                    const clock = sinon.useFakeTimers(new Date().getTime());
                    timelineRepresentation.adaptation.period.mpd.availabilityStartTime = new Date(new Date().getTime() - representation.adaptation.period.mpd.timeShiftBufferDepth * 1000);
                    timelineRepresentation.adaptation.period.start = 10;
                    timelineRepresentation.adaptation.period.duration = 100;
                    timelineRepresentation.availabilityTimeOffset = 100;

                    const range = timelineConverter.calcAvailabilityWindow(timelineRepresentation, true);
                    expect(range.start).to.be.equal(10);
                    expect(range.end).to.be.equal(60);
                    clock.restore();
                });

                it('with an ATO present but not covering the whole period', function () {
                    const clock = sinon.useFakeTimers(new Date().getTime());
                    timelineRepresentation.adaptation.period.mpd.availabilityStartTime = new Date(new Date().getTime() - representation.adaptation.period.mpd.timeShiftBufferDepth * 1000);
                    timelineRepresentation.adaptation.period.start = 10;
                    timelineRepresentation.adaptation.period.duration = 100;
                    timelineRepresentation.availabilityTimeOffset = 4;

                    const range = timelineConverter.calcAvailabilityWindow(timelineRepresentation, true);
                    expect(range.start).to.be.equal(10);
                    expect(range.end).to.be.equal(54);
                    clock.restore();
                });
            });
        });


    });

    describe('should calculate the time shift buffer window', () => {

        let streamOneMock;
        let streamTwoMock;
        let streams;

        beforeEach(() => {
            streamOneMock = new StreamMock();
            streamOneMock.setStreamInfo({
                start: 0,
                duration: 50
            });
            streamTwoMock = new StreamMock();
            streamTwoMock.setStreamInfo({
                start: 50,
                duration: 50
            });
            streams = [];
        });

        describe('for a static MPD', () => {

            it('with SegmentTemplate and one period', function () {
                streams.push(streamOneMock);
                const range = timelineConverter.calcTimeShiftBufferWindow(streams, false);
                expect(range.start).to.be.equal(0);
                expect(range.end).to.be.equal(50);
            });

            it('with SegmentTemplate and two periods', function () {
                streams.push(streamOneMock, streamTwoMock);
                const range = timelineConverter.calcTimeShiftBufferWindow(streams, false);
                expect(range.start).to.be.equal(0);
                expect(range.end).to.be.equal(100);
            });

            it('with SegmentTimeline and one period and shouldCalculateFromTimeline set to true', function () {
                settings.update({
                    streaming: {
                        calcSegmentAvailabilityRangeFromTimeline: true
                    }
                });
                streams.push(streamOneMock);
                const range = timelineConverter.calcTimeShiftBufferWindow(streams, false);
                expect(range.start).to.be.equal(0);
                expect(range.end).to.be.equal(50);
            });

            it('with SegmentTimeline and two periods and shouldCalculateFromTimeline set to true', function () {
                settings.update({
                    streaming: {
                        calcSegmentAvailabilityRangeFromTimeline: true
                    }
                });
                streams.push(streamOneMock, streamTwoMock);
                const range = timelineConverter.calcTimeShiftBufferWindow(streams, false);
                expect(range.start).to.be.equal(0);
                expect(range.end).to.be.equal(100);
            });
        });

        describe('for a dynamic MPD', () => {

            describe('with SegmentTemplate', function () {

                it('with single period and period duration matching tsbd', function () {
                    const clock = sinon.useFakeTimers(new Date().getTime());
                    streams.push(streamOneMock);
                    representation.adaptation.period.mpd.availabilityStartTime = new Date(new Date().getTime() - representation.adaptation.period.mpd.timeShiftBufferDepth * 1000);

                    const range = timelineConverter.calcTimeShiftBufferWindow(streams, true);
                    expect(range.start).to.be.equal(0);
                    expect(range.end).to.be.equal(50);
                    clock.restore();
                });

                it('with single period and period duration larger than "now"', function () {
                    const clock = sinon.useFakeTimers(new Date().getTime());
                    streamOneMock.setStreamInfo({
                        start: 0,
                        end: 100
                    });
                    streams.push(streamOneMock);
                    representation.adaptation.period.mpd.availabilityStartTime = new Date(new Date().getTime() - representation.adaptation.period.mpd.timeShiftBufferDepth * 1000);

                    const range = timelineConverter.calcTimeShiftBufferWindow(streams, true);
                    expect(range.start).to.be.equal(0);
                    expect(range.end).to.be.equal(50);
                    clock.restore();
                });
            });
        });
    });
});

