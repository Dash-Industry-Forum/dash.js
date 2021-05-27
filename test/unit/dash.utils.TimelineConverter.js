import TimelineConverter from '../../src/dash/utils/TimelineConverter';
import SpecHelper from './helpers/SpecHelper';
import VoHelper from './helpers/VOHelper';
import Settings from '../../src/core/Settings';
import StreamMock from './mocks/StreamMock';

const expect = require('chai').expect;
const sinon = require('sinon');

describe('TimelineConverter', function () {
    const context = {};
    const testType = 'video';
    const voHelper = new VoHelper();
    const specHelper = new SpecHelper();
    const timelineConverter = TimelineConverter(context).getInstance();
    const settings = Settings(context).getInstance();
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

    describe('should calcAvailabilityStartTimeFromPresentationTime() for a segment and ', () => {

        describe('a static MPD and ', () => {

            before(() => {
                settings.update({
                    streaming: {
                        timeShiftBuffer: {
                            calcFromSegmentTimeline: false
                        }
                    }
                });
            });

            beforeEach(() => {
                representation.adaptation.period.mpd.manifest.type = 'static';

            });

            it('an init segment', function () {
                representation.adaptation.period.start = 0;
                representation.adaptation.period.duration = 100;
                const presentationStartTime = representation.adaptation.period.start;

                const ast = timelineConverter.calcAvailabilityStartTimeFromPresentationTime(presentationStartTime, representation, false);
                expect(ast.getTime()).to.be.equal(new Date(representation.adaptation.period.mpd.availabilityStartTime).getTime());
            });

            it('an init segment and period@start > 0', function () {
                representation.adaptation.period.start = 10;
                representation.adaptation.period.duration = 100;
                const presentationStartTime = representation.adaptation.period.start;

                const ast = timelineConverter.calcAvailabilityStartTimeFromPresentationTime(presentationStartTime, representation, false);
                expect(ast.getTime()).to.be.equal(new Date(representation.adaptation.period.mpd.availabilityStartTime).getTime());
            });

            it('media segment with presentationEndTime inside period boundary and period start set to 0', function () {
                representation.adaptation.period.start = 0;
                representation.adaptation.period.duration = 100;
                const presentationEndTime = 8;

                const ast = timelineConverter.calcAvailabilityStartTimeFromPresentationTime(presentationEndTime, representation, false);
                expect(ast.getTime()).to.be.equal(new Date(representation.adaptation.period.mpd.availabilityStartTime).getTime());
            });

            it('media segment with presentationEndTime inside period boundary and period start > 0', function () {
                representation.adaptation.period.start = 10;
                representation.adaptation.period.duration = 100;
                const presentationEndTime = 20;

                const ast = timelineConverter.calcAvailabilityStartTimeFromPresentationTime(presentationEndTime, representation, false);
                expect(ast.getTime()).to.be.equal(new Date(representation.adaptation.period.mpd.availabilityStartTime).getTime());
            });


        });

        describe('a dynamic MPD and ', () => {

            before(() => {
                settings.update({
                    streaming: {
                        timeShiftBuffer: {
                            calcFromSegmentTimeline: false
                        }
                    }
                });
            });

            beforeEach(function () {
                representation.adaptation.period.mpd.manifest.type = 'dynamic';
            });


            describe('SegmentTemplate and ', function () {

                it('an init segment', function () {
                    representation.adaptation.period.mpd.availabilityStartTime = new Date(new Date().getTime() - representation.adaptation.period.mpd.timeShiftBufferDepth * 1000);
                    const presentationStartTime = representation.adaptation.period.start;

                    const ast = timelineConverter.calcAvailabilityStartTimeFromPresentationTime(presentationStartTime, representation, true);
                    expect(ast.getTime()).to.be.equal(new Date(representation.adaptation.period.mpd.availabilityStartTime).getTime());
                });

                it('an init segment and period@start > 0', function () {
                    representation.adaptation.period.start = 10;
                    representation.adaptation.period.duration = 100;
                    representation.adaptation.period.mpd.availabilityStartTime = new Date(new Date().getTime() - representation.adaptation.period.mpd.timeShiftBufferDepth * 1000);
                    const presentationStartTime = representation.adaptation.period.start;

                    const ast = timelineConverter.calcAvailabilityStartTimeFromPresentationTime(presentationStartTime, representation, true);
                    const targetDate = new Date(representation.adaptation.period.mpd.availabilityStartTime);
                    targetDate.setSeconds(targetDate.getSeconds() + presentationStartTime);
                    expect(ast.getTime()).to.be.equal(targetDate.getTime());
                });

                it('a media segment and period@start > 0', function () {
                    representation.adaptation.period.start = 10;
                    representation.adaptation.period.duration = 100;
                    representation.adaptation.period.mpd.availabilityStartTime = new Date(new Date().getTime() - representation.adaptation.period.mpd.timeShiftBufferDepth * 1000);
                    const presentationEndTime = representation.adaptation.period.start + 8;

                    const ast = timelineConverter.calcAvailabilityStartTimeFromPresentationTime(presentationEndTime, representation, true);
                    const targetDate = new Date(representation.adaptation.period.mpd.availabilityStartTime);
                    targetDate.setSeconds(targetDate.getSeconds() + presentationEndTime);
                    expect(ast.getTime()).to.be.equal(targetDate.getTime());
                });

                it('a media segment and period@start > 0 and availabilityTimeOffset > 0', function () {
                    representation.adaptation.period.start = 10;
                    representation.adaptation.period.duration = 100;
                    representation.availabilityTimeOffset = 10;
                    representation.adaptation.period.mpd.availabilityStartTime = new Date(new Date().getTime() - representation.adaptation.period.mpd.timeShiftBufferDepth * 1000);
                    const presentationEndTime = representation.adaptation.period.start + 8;

                    const ast = timelineConverter.calcAvailabilityStartTimeFromPresentationTime(presentationEndTime, representation, true);
                    const targetDate = new Date(representation.adaptation.period.mpd.availabilityStartTime);
                    targetDate.setSeconds(targetDate.getSeconds() + presentationEndTime - representation.availabilityTimeOffset);
                    expect(ast.getTime()).to.be.equal(targetDate.getTime());
                });


            });

            describe('with SegmentTimeline and shouldCalculateFromTimeline is true', function () {

                before(() => {
                    settings.update({
                        streaming: {
                            timeShiftBuffer: {
                                calcFromSegmentTimeline: true
                            }
                        }
                    });
                });
            });
        });
    });

    describe('should calcAvailabilityEndTimeFromPresentationTime() for a segment and ', () => {

        describe('a static MPD and ', () => {

            before(() => {
                settings.update({
                    streaming: {
                        timeShiftBuffer: {
                            calcFromSegmentTimeline: false
                        }
                    }
                });
            });

            beforeEach(() => {
                representation.adaptation.period.mpd.manifest.type = 'static';
            });

            it('an init segment', function () {
                representation.adaptation.period.start = 0;
                representation.adaptation.period.duration = 100;
                const presentationEndTime = representation.adaptation.period.start + representation.adaptation.period.start;

                const aet = timelineConverter.calcAvailabilityEndTimeFromPresentationTime(presentationEndTime, representation, false);
                expect(aet).to.be.equal(representation.adaptation.period.mpd.availabilityEndTime);
            });

            it('an init segment and period@start > 0', function () {
                representation.adaptation.period.start = 10;
                representation.adaptation.period.duration = 100;
                const presentationEndTime = representation.adaptation.period.start + representation.adaptation.period.start;

                const aet = timelineConverter.calcAvailabilityEndTimeFromPresentationTime(presentationEndTime, representation, false);
                expect(aet).to.be.equal(representation.adaptation.period.mpd.availabilityEndTime);
            });

            it('media segment with presentationEndTime inside period boundary and period start set to 0', function () {
                representation.adaptation.period.start = 0;
                representation.adaptation.period.duration = 100;
                const presentationEndTime = 8;

                const aet = timelineConverter.calcAvailabilityEndTimeFromPresentationTime(presentationEndTime, representation, false);
                expect(aet).to.be.equal(representation.adaptation.period.mpd.availabilityEndTime);
            });

            it('media segment with presentationEndTime inside period boundary and period start > 0', function () {
                representation.adaptation.period.start = 10;
                representation.adaptation.period.duration = 100;
                const presentationEndTime = 20;

                const aet = timelineConverter.calcAvailabilityEndTimeFromPresentationTime(presentationEndTime, representation, false);
                expect(aet).to.be.equal(representation.adaptation.period.mpd.availabilityEndTime);
            });


        });

        describe('a dynamic MPD and ', () => {

            before(() => {
                settings.update({
                    streaming: {
                        timeShiftBuffer: {
                            calcFromSegmentTimeline: false
                        }
                    }
                });
            });


            describe('SegmentTemplate and ', function () {

                it('an init segment', function () {
                    representation.adaptation.period.mpd.availabilityStartTime = new Date(new Date().getTime() - representation.adaptation.period.mpd.timeShiftBufferDepth * 1000);
                    const presentationEndTime = representation.adaptation.period.start + representation.adaptation.period.duration;

                    const aet = timelineConverter.calcAvailabilityEndTimeFromPresentationTime(presentationEndTime, representation, true);
                    const targetDate = new Date(representation.adaptation.period.mpd.availabilityStartTime);
                    targetDate.setSeconds(targetDate.getSeconds() + presentationEndTime + representation.adaptation.period.mpd.timeShiftBufferDepth);
                    expect(aet.getTime()).to.be.equal(targetDate.getTime());
                });

                it('an init segment and period@start > 0', function () {
                    representation.adaptation.period.start = 10;
                    representation.adaptation.period.duration = 100;
                    representation.adaptation.period.mpd.availabilityStartTime = new Date(new Date().getTime() - representation.adaptation.period.mpd.timeShiftBufferDepth * 1000);
                    const presentationEndTime = representation.adaptation.period.start + representation.adaptation.period.duration;

                    const aet = timelineConverter.calcAvailabilityEndTimeFromPresentationTime(presentationEndTime, representation, true);
                    const targetDate = new Date(representation.adaptation.period.mpd.availabilityStartTime);
                    targetDate.setSeconds(targetDate.getSeconds() + presentationEndTime + representation.adaptation.period.mpd.timeShiftBufferDepth);
                    expect(aet.getTime()).to.be.equal(targetDate.getTime());
                });

                it('a media segment and period@start > 0', function () {
                    representation.adaptation.period.start = 10;
                    representation.adaptation.period.duration = 100;
                    representation.adaptation.period.mpd.availabilityStartTime = new Date(new Date().getTime() - representation.adaptation.period.mpd.timeShiftBufferDepth * 1000);
                    const presentationEndTime = representation.adaptation.period.start + 8;

                    const aet = timelineConverter.calcAvailabilityEndTimeFromPresentationTime(presentationEndTime, representation, true);
                    const targetDate = new Date(representation.adaptation.period.mpd.availabilityStartTime);
                    targetDate.setSeconds(targetDate.getSeconds() + presentationEndTime + representation.adaptation.period.mpd.timeShiftBufferDepth);
                    expect(aet.getTime()).to.be.equal(targetDate.getTime());
                });

                it('a media segment and period@start > 0 and availabilityTimeOffset > 0', function () {
                    representation.adaptation.period.start = 10;
                    representation.adaptation.period.duration = 100;
                    representation.availabilityTimeOffset = 10;
                    representation.adaptation.period.mpd.availabilityStartTime = new Date(new Date().getTime() - representation.adaptation.period.mpd.timeShiftBufferDepth * 1000);
                    const presentationEndTime = representation.adaptation.period.start + 8;

                    const aet = timelineConverter.calcAvailabilityEndTimeFromPresentationTime(presentationEndTime, representation, true);
                    const targetDate = new Date(representation.adaptation.period.mpd.availabilityStartTime);
                    targetDate.setSeconds(targetDate.getSeconds() + presentationEndTime + representation.adaptation.period.mpd.timeShiftBufferDepth);
                    expect(aet.getTime()).to.be.equal(targetDate.getTime());
                });


            });

            describe('with SegmentTimeline and shouldCalculateFromTimeline is true', function () {

                before(() => {
                    settings.update({
                        streaming: {
                            timeShiftBuffer: {
                                calcFromSegmentTimeline: true
                            }
                        }
                    });
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
                        timeShiftBuffer: {
                            calcFromSegmentTimeline: true
                        }
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
                        timeShiftBuffer: {
                            calcFromSegmentTimeline: true
                        }
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

                before(() => {
                    settings.update({
                        streaming: {
                            timeShiftBuffer: {
                                calcFromSegmentTimeline: false
                            }
                        }
                    });
                });

                it('with single period and period covering whole tsbd', function () {
                    const clock = sinon.useFakeTimers(new Date().getTime());
                    const tsbd = 30;

                    streamOneMock.setRegularPeriods([{
                        mpd: {
                            availabilityStartTime: new Date(new Date().getTime() - tsbd * 1000),
                            timeShiftBufferDepth: tsbd
                        }
                    }]);
                    streams.push(streamOneMock);

                    const range = timelineConverter.calcTimeShiftBufferWindow(streams, true);
                    expect(range.start).to.be.equal(0);
                    expect(range.end).to.be.equal(30);
                    clock.restore();
                });

                it('with single period and period start larger than AST', function () {
                    const clock = sinon.useFakeTimers(new Date().getTime());
                    const tsbd = 30;

                    streamOneMock.setStreamInfo({
                        start: 10,
                        duration: 50
                    });
                    streamOneMock.setRegularPeriods([{
                        mpd: {
                            availabilityStartTime: new Date(new Date().getTime() - tsbd * 1000),
                            timeShiftBufferDepth: tsbd
                        }
                    }]);
                    streams.push(streamOneMock);

                    const range = timelineConverter.calcTimeShiftBufferWindow(streams, true);
                    expect(range.start).to.be.equal(10);
                    expect(range.end).to.be.equal(30);
                    clock.restore();
                });

                it('with single period and period end smaller than now', function () {
                    const clock = sinon.useFakeTimers(new Date().getTime());
                    const tsbd = 30;

                    streamOneMock.setStreamInfo({
                        start: 0,
                        duration: 20
                    });
                    streamOneMock.setRegularPeriods([{
                        mpd: {
                            availabilityStartTime: new Date(new Date().getTime() - tsbd * 1000),
                            timeShiftBufferDepth: tsbd
                        }
                    }]);
                    streams.push(streamOneMock);

                    const range = timelineConverter.calcTimeShiftBufferWindow(streams, true);
                    expect(range.start).to.be.equal(0);
                    expect(range.end).to.be.equal(20);
                    clock.restore();
                });

                it('with single period and period end infinite', function () {
                    const clock = sinon.useFakeTimers(new Date().getTime());
                    const tsbd = 30;

                    streamOneMock.setStreamInfo({
                        start: 0,
                        duration: Number.POSITIVE_INFINITY
                    });
                    streamOneMock.setRegularPeriods([{
                        mpd: {
                            availabilityStartTime: new Date(new Date().getTime() - tsbd * 1000),
                            timeShiftBufferDepth: tsbd
                        }
                    }]);
                    streams.push(streamOneMock);

                    const range = timelineConverter.calcTimeShiftBufferWindow(streams, true);
                    expect(range.start).to.be.equal(0);
                    expect(range.end).to.be.equal(30);
                    clock.restore();
                });

                it('with single period AST larger than now', function () {
                    const clock = sinon.useFakeTimers(new Date().getTime());
                    const tsbd = 30;

                    streamOneMock.setStreamInfo({
                        start: 0,
                        duration: Number.POSITIVE_INFINITY
                    });
                    streamOneMock.setRegularPeriods([{
                        mpd: {
                            availabilityStartTime: new Date(new Date().getTime() + tsbd * 1000),
                            timeShiftBufferDepth: tsbd
                        }
                    }]);
                    streams.push(streamOneMock);

                    const range = timelineConverter.calcTimeShiftBufferWindow(streams, true);
                    expect(range.start).to.be.equal(0);
                    expect(range.end).to.be.equal(-30);
                    clock.restore();
                });

                it('with single period start larger than now', function () {
                    const clock = sinon.useFakeTimers(new Date().getTime());
                    const tsbd = 30;

                    streamOneMock.setStreamInfo({
                        start: 40,
                        duration: Number.POSITIVE_INFINITY
                    });
                    streamOneMock.setRegularPeriods([{
                        mpd: {
                            availabilityStartTime: new Date(new Date().getTime() - tsbd * 1000),
                            timeShiftBufferDepth: tsbd
                        }
                    }]);
                    streams.push(streamOneMock);

                    const range = timelineConverter.calcTimeShiftBufferWindow(streams, true);
                    expect(range.start).to.be.equal(40);
                    expect(range.end).to.be.equal(30);
                    clock.restore();
                });

                it('with single period end smaller than now minus tsbd', function () {
                    const clock = sinon.useFakeTimers(new Date().getTime());
                    const tsbd = 5;

                    streamOneMock.setStreamInfo({
                        start: 0,
                        duration: 10
                    });
                    streamOneMock.setRegularPeriods([{
                        mpd: {
                            availabilityStartTime: new Date(new Date().getTime() - 30 * 1000),
                            timeShiftBufferDepth: tsbd
                        }
                    }]);
                    streams.push(streamOneMock);

                    const range = timelineConverter.calcTimeShiftBufferWindow(streams, true);
                    expect(range.start).to.be.NaN; // jshint ignore:line
                    expect(range.end).to.be.NaN; // jshint ignore:line
                    clock.restore();
                });

                it('with two periods covering whole tsbd', function () {
                    const clock = sinon.useFakeTimers(new Date().getTime());
                    const tsbd = 100;

                    streamOneMock.setRegularPeriods([{
                        mpd: {
                            availabilityStartTime: new Date(new Date().getTime() - tsbd * 1000),
                            timeShiftBufferDepth: tsbd
                        }
                    }]);
                    streams.push(streamOneMock);
                    streams.push(streamTwoMock);

                    const range = timelineConverter.calcTimeShiftBufferWindow(streams, true);
                    expect(range.start).to.be.equal(0);
                    expect(range.end).to.be.equal(100);
                    clock.restore();
                });

                it('with two periods and period start larger than AST', function () {
                    const clock = sinon.useFakeTimers(new Date().getTime());
                    const tsbd = 100;

                    streamOneMock.setStreamInfo({
                        start: 10,
                        duration: 40
                    });
                    streamOneMock.setRegularPeriods([{
                        mpd: {
                            availabilityStartTime: new Date(new Date().getTime() - tsbd * 1000),
                            timeShiftBufferDepth: tsbd
                        }
                    }]);
                    streams.push(streamOneMock);
                    streams.push(streamTwoMock);

                    const range = timelineConverter.calcTimeShiftBufferWindow(streams, true);
                    expect(range.start).to.be.equal(10);
                    expect(range.end).to.be.equal(100);
                    clock.restore();
                });

                it('with two periods and second period end smaller than tsbd', function () {
                    const clock = sinon.useFakeTimers(new Date().getTime());
                    const tsbd = 80;

                    streamTwoMock.setStreamInfo({
                        start: 50,
                        duration: 20
                    });
                    streamOneMock.setRegularPeriods([{
                        mpd: {
                            availabilityStartTime: new Date(new Date().getTime() - tsbd * 1000),
                            timeShiftBufferDepth: tsbd
                        }
                    }]);
                    streams.push(streamOneMock);
                    streams.push(streamTwoMock);

                    const range = timelineConverter.calcTimeShiftBufferWindow(streams, true);
                    expect(range.start).to.be.equal(0);
                    expect(range.end).to.be.equal(70);
                    clock.restore();
                });

                it('with two periods and second period end infinite', function () {
                    const clock = sinon.useFakeTimers(new Date().getTime());
                    const tsbd = 120;

                    streamTwoMock.setStreamInfo({
                        start: 50,
                        duration: Number.POSITIVE_INFINITY
                    });
                    streamOneMock.setRegularPeriods([{
                        mpd: {
                            availabilityStartTime: new Date(new Date().getTime() - tsbd * 1000),
                            timeShiftBufferDepth: tsbd
                        }
                    }]);
                    streams.push(streamOneMock);
                    streams.push(streamTwoMock);

                    const range = timelineConverter.calcTimeShiftBufferWindow(streams, true);
                    expect(range.start).to.be.equal(0);
                    expect(range.end).to.be.equal(120);
                    clock.restore();
                });

                it('with two periods, both start times larger than now', function () {
                    const clock = sinon.useFakeTimers(new Date().getTime());
                    const tsbd = 30;

                    streamOneMock.setStreamInfo({
                        start: 40,
                        duration: 10
                    });
                    streamOneMock.setRegularPeriods([{
                        mpd: {
                            availabilityStartTime: new Date(new Date().getTime() - tsbd * 1000),
                            timeShiftBufferDepth: tsbd
                        }
                    }]);
                    streams.push(streamOneMock);
                    streams.push(streamTwoMock);

                    const range = timelineConverter.calcTimeShiftBufferWindow(streams, true);
                    expect(range.start).to.be.equal(40);
                    expect(range.end).to.be.equal(30);
                    clock.restore();
                });

                it('with two periods, end time of second period larger than now', function () {
                    const clock = sinon.useFakeTimers(new Date().getTime());
                    const tsbd = 30;

                    streamOneMock.setStreamInfo({
                        start: 0,
                        duration: 10
                    });
                    streamTwoMock.setStreamInfo({
                        start: 80,
                        duration: 10
                    });
                    streamOneMock.setRegularPeriods([{
                        mpd: {
                            availabilityStartTime: new Date(new Date().getTime() - tsbd * 1000),
                            timeShiftBufferDepth: tsbd
                        }
                    }]);
                    streams.push(streamOneMock);
                    streams.push(streamTwoMock);

                    const range = timelineConverter.calcTimeShiftBufferWindow(streams, true);
                    expect(range.start).to.be.equal(0);
                    expect(range.end).to.be.equal(10);
                    clock.restore();
                });

                it('with two periods both ending before tsbd', function () {
                    const clock = sinon.useFakeTimers(new Date().getTime());
                    const tsbd = 5;

                    streamOneMock.setStreamInfo({
                        start: 0,
                        duration: 10
                    });
                    streamTwoMock.setStreamInfo({
                        start: 10,
                        duration: 10
                    });
                    streamOneMock.setRegularPeriods([{
                        mpd: {
                            availabilityStartTime: new Date(new Date().getTime() - 30 * 1000),
                            timeShiftBufferDepth: tsbd
                        }
                    }]);
                    streams.push(streamOneMock);
                    streams.push(streamTwoMock);

                    const range = timelineConverter.calcTimeShiftBufferWindow(streams, true);
                    expect(range.start).to.be.NaN; // jshint ignore:line
                    expect(range.end).to.be.NaN; // jshint ignore:line
                    clock.restore();
                });
            });
            describe('with SegmentTimeline and calcFromSegmentTimeline set to true', function () {

                before(() => {
                    settings.update({
                        streaming: {
                            timeShiftBuffer: {
                                calcFromSegmentTimeline: true
                            }
                        }
                    });
                });

                beforeEach(() => {
                    streamOneMock.setRepresentation(voHelper.getDummyTimelineRepresentation(testType));
                    streamTwoMock.setRepresentation(voHelper.getDummyTimelineRepresentation(testType));
                });

                it('with single period and period covering whole tsbd', function () {
                    const clock = sinon.useFakeTimers(new Date().getTime());
                    const tsbd = 30;

                    streamOneMock.setRegularPeriods([{
                        mpd: {
                            availabilityStartTime: new Date(new Date().getTime() - tsbd * 1000),
                            timeShiftBufferDepth: tsbd
                        }
                    }]);
                    streams.push(streamOneMock);

                    const range = timelineConverter.calcTimeShiftBufferWindow(streams, true);
                    expect(range.start).to.be.equal(0);
                    expect(range.end).to.be.equal(30);
                    clock.restore();
                });

                it('with single period and period start greater than 0', function () {
                    const clock = sinon.useFakeTimers(new Date().getTime());
                    const tsbd = 30;
                    const dummyRep = voHelper.getDummyTimelineRepresentation(testType);

                    dummyRep.adaptation.period.start = 10;
                    dummyRep.adaptation.period.duration = 50;
                    streamOneMock.setRepresentation(dummyRep);

                    streamOneMock.setStreamInfo({
                        start: 10,
                        duration: 50
                    });
                    streamOneMock.setRegularPeriods([{
                        mpd: {
                            availabilityStartTime: new Date(new Date().getTime() - tsbd * 1000),
                            timeShiftBufferDepth: tsbd
                        }
                    }]);
                    streams.push(streamOneMock);

                    const range = timelineConverter.calcTimeShiftBufferWindow(streams, true);
                    expect(range.start).to.be.equal(10);
                    expect(range.end).to.be.equal(30);
                    clock.restore();
                });

                it('with single period and period start greater than 0 and end infinite', function () {
                    const clock = sinon.useFakeTimers(new Date().getTime());
                    const tsbd = 30;
                    const dummyRep = voHelper.getDummyTimelineRepresentation(testType);

                    dummyRep.adaptation.period.start = 10;
                    dummyRep.adaptation.period.duration = Number.POSITIVE_INFINITY;
                    streamOneMock.setRepresentation(dummyRep);

                    streamOneMock.setStreamInfo({
                        start: 10,
                        duration: Number.POSITIVE_INFINITY
                    });
                    streamOneMock.setRegularPeriods([{
                        mpd: {
                            availabilityStartTime: new Date(new Date().getTime() - tsbd * 1000),
                            timeShiftBufferDepth: tsbd
                        }
                    }]);
                    streams.push(streamOneMock);

                    const range = timelineConverter.calcTimeShiftBufferWindow(streams, true);
                    expect(range.start).to.be.equal(10);
                    expect(range.end).to.be.equal(30);
                    clock.restore();
                });

                it('with single period and period end smaller than now', function () {
                    const clock = sinon.useFakeTimers(new Date().getTime());
                    const tsbd = 30;
                    const dummyRep = voHelper.getDummyTimelineRepresentation(testType);

                    dummyRep.adaptation.period.start = 0;
                    dummyRep.adaptation.period.duration = 20;
                    streamOneMock.setRepresentation(dummyRep);

                    streamOneMock.setStreamInfo({
                        start: 0,
                        duration: 20
                    });
                    streamOneMock.setRegularPeriods([{
                        mpd: {
                            availabilityStartTime: new Date(new Date().getTime() - tsbd * 1000),
                            timeShiftBufferDepth: tsbd
                        }
                    }]);
                    streams.push(streamOneMock);

                    const range = timelineConverter.calcTimeShiftBufferWindow(streams, true);
                    expect(range.start).to.be.equal(0);
                    expect(range.end).to.be.equal(20);
                    clock.restore();
                });

                it('with single period and period end out of the "normal" TSBD', function () {
                    const clock = sinon.useFakeTimers(new Date().getTime());
                    const tsbd = 30;
                    const dummyRep = voHelper.getDummyTimelineRepresentation(testType);

                    dummyRep.adaptation.period.start = 0;
                    dummyRep.adaptation.period.duration = 20;
                    streamOneMock.setRepresentation(dummyRep);

                    streamOneMock.setStreamInfo({
                        start: 0,
                        duration: 20
                    });
                    streamOneMock.setRegularPeriods([{
                        mpd: {
                            availabilityStartTime: new Date(new Date().getTime() - 2000 * 1000),
                            timeShiftBufferDepth: tsbd
                        }
                    }]);
                    streams.push(streamOneMock);

                    const range = timelineConverter.calcTimeShiftBufferWindow(streams, true);
                    expect(range.start).to.be.equal(0);
                    expect(range.end).to.be.equal(20);
                    clock.restore();
                });

                it('with single period and last segments out of the "normal" TSBD', function () {
                    const clock = sinon.useFakeTimers(new Date().getTime());
                    const tsbd = 30;
                    const dummyRep = voHelper.getDummyTimelineRepresentation(testType);

                    dummyRep.adaptation.period.start = 0;
                    dummyRep.adaptation.period.duration = 300;
                    streamOneMock.setRepresentation(dummyRep);

                    streamOneMock.setStreamInfo({
                        start: 0,
                        duration: 300
                    });
                    streamOneMock.setRegularPeriods([{
                        mpd: {
                            availabilityStartTime: new Date(new Date().getTime() - 2000 * 1000),
                            timeShiftBufferDepth: tsbd
                        }
                    }]);
                    streams.push(streamOneMock);

                    const range = timelineConverter.calcTimeShiftBufferWindow(streams, true);
                    expect(range.start).to.be.equal(20);
                    expect(range.end).to.be.equal(50);
                    clock.restore();
                });

                it('with single period and last segments out of the "normal" large TSBD', function () {
                    const clock = sinon.useFakeTimers(new Date().getTime());
                    const tsbd = 300;
                    const dummyRep = voHelper.getDummyTimelineRepresentation(testType);

                    dummyRep.adaptation.period.start = 0;
                    dummyRep.adaptation.period.duration = 300;
                    streamOneMock.setRepresentation(dummyRep);

                    streamOneMock.setStreamInfo({
                        start: 0,
                        duration: 300
                    });
                    streamOneMock.setRegularPeriods([{
                        mpd: {
                            availabilityStartTime: new Date(new Date().getTime() - 2000 * 1000),
                            timeShiftBufferDepth: tsbd
                        }
                    }]);
                    streams.push(streamOneMock);

                    const range = timelineConverter.calcTimeShiftBufferWindow(streams, true);
                    expect(range.start).to.be.equal(0);
                    expect(range.end).to.be.equal(50);
                    clock.restore();
                });

                it('with single period and period end infinite', function () {
                    const clock = sinon.useFakeTimers(new Date().getTime());
                    const tsbd = 300;
                    const dummyRep = voHelper.getDummyTimelineRepresentation(testType);

                    dummyRep.adaptation.period.start = 0;
                    dummyRep.adaptation.period.duration = Number.POSITIVE_INFINITY;
                    streamOneMock.setRepresentation(dummyRep);

                    streamOneMock.setStreamInfo({
                        start: 0,
                        duration: Number.POSITIVE_INFINITY
                    });
                    streamOneMock.setRegularPeriods([{
                        mpd: {
                            availabilityStartTime: new Date(new Date().getTime() - tsbd * 1000),
                            timeShiftBufferDepth: tsbd
                        }
                    }]);
                    streams.push(streamOneMock);

                    const range = timelineConverter.calcTimeShiftBufferWindow(streams, true);
                    expect(range.start).to.be.equal(0);
                    expect(range.end).to.be.equal(50);
                    clock.restore();
                });

                it('with single period start larger than now', function () {
                    const clock = sinon.useFakeTimers(new Date().getTime());
                    const tsbd = 30;
                    const dummyRep = voHelper.getDummyTimelineRepresentation(testType);

                    dummyRep.adaptation.period.start = 40;
                    dummyRep.adaptation.period.duration = Number.POSITIVE_INFINITY;
                    streamOneMock.setRepresentation(dummyRep);

                    streamOneMock.setStreamInfo({
                        start: 40,
                        duration: Number.POSITIVE_INFINITY
                    });
                    streamOneMock.setRegularPeriods([{
                        mpd: {
                            availabilityStartTime: new Date(new Date().getTime() - tsbd * 1000),
                            timeShiftBufferDepth: tsbd
                        }
                    }]);
                    streams.push(streamOneMock);

                    const range = timelineConverter.calcTimeShiftBufferWindow(streams, true);
                    expect(range.start).to.be.equal(40);
                    expect(range.end).to.be.equal(30);
                    clock.restore();
                });

                it('with single period end smaller than now minus tsbd', function () {
                    const clock = sinon.useFakeTimers(new Date().getTime());
                    const tsbd = 5;
                    const dummyRep = voHelper.getDummyTimelineRepresentation(testType);

                    dummyRep.adaptation.period.start = 0;
                    dummyRep.adaptation.period.duration = 10;
                    streamOneMock.setRepresentation(dummyRep);

                    streamOneMock.setStreamInfo({
                        start: 0,
                        duration: 10
                    });
                    streamOneMock.setRegularPeriods([{
                        mpd: {
                            availabilityStartTime: new Date(new Date().getTime() - 30 * 1000),
                            timeShiftBufferDepth: tsbd
                        }
                    }]);
                    streams.push(streamOneMock);

                    const range = timelineConverter.calcTimeShiftBufferWindow(streams, true);
                    expect(range.start).to.be.equal(5);
                    expect(range.end).to.be.equal(10);
                    clock.restore();
                });

                it('with two periods covering whole tsbd', function () {
                    const clock = sinon.useFakeTimers(new Date().getTime());
                    const tsbd = 30;
                    const dummyRep = voHelper.getDummyTimelineRepresentation(testType);
                    dummyRep.adaptation.period.start = 0;
                    dummyRep.adaptation.period.duration = 10;
                    streamOneMock.setRepresentation(dummyRep);
                    const dummyRepTwo = voHelper.getDummyTimelineRepresentation(testType);
                    dummyRepTwo.adaptation.period.start = 10;
                    dummyRepTwo.adaptation.period.duration = 20;
                    streamTwoMock.setRepresentation(dummyRepTwo);


                    streamOneMock.setRegularPeriods([{
                        mpd: {
                            availabilityStartTime: new Date(new Date().getTime() - tsbd * 1000),
                            timeShiftBufferDepth: tsbd
                        }
                    }]);

                    streamOneMock.setStreamInfo({
                        start: 0,
                        duration: 10
                    });
                    streamTwoMock.setStreamInfo({
                        start: 10,
                        duration: 20
                    });

                    streams.push(streamOneMock, streamTwoMock);

                    const range = timelineConverter.calcTimeShiftBufferWindow(streams, true);
                    expect(range.start).to.be.equal(0);
                    expect(range.end).to.be.equal(30);
                    clock.restore();
                });

                it('with two periods and period start greater than 0', function () {
                    const clock = sinon.useFakeTimers(new Date().getTime());
                    const tsbd = 30;
                    const dummyRep = voHelper.getDummyTimelineRepresentation(testType);
                    dummyRep.adaptation.period.start = 10;
                    dummyRep.adaptation.period.duration = 10;
                    streamOneMock.setRepresentation(dummyRep);
                    const dummyRepTwo = voHelper.getDummyTimelineRepresentation(testType);
                    dummyRepTwo.adaptation.period.start = 20;
                    dummyRepTwo.adaptation.period.duration = 20;
                    streamTwoMock.setRepresentation(dummyRepTwo);

                    streamOneMock.setStreamInfo({
                        start: 10,
                        duration: 10
                    });
                    streamTwoMock.setStreamInfo({
                        start: 20,
                        duration: 20
                    });

                    streamOneMock.setRegularPeriods([{
                        mpd: {
                            availabilityStartTime: new Date(new Date().getTime() - tsbd * 1000),
                            timeShiftBufferDepth: tsbd
                        }
                    }]);
                    streams.push(streamOneMock, streamTwoMock);

                    const range = timelineConverter.calcTimeShiftBufferWindow(streams, true);
                    expect(range.start).to.be.equal(10);
                    expect(range.end).to.be.equal(30);
                    clock.restore();
                });

                it('with two periods and period start greater than 0 and end infinite', function () {
                    const clock = sinon.useFakeTimers(new Date().getTime());
                    const tsbd = 50;
                    const dummyRep = voHelper.getDummyTimelineRepresentation(testType);
                    dummyRep.adaptation.period.start = 10;
                    dummyRep.adaptation.period.duration = 10;
                    streamOneMock.setRepresentation(dummyRep);
                    const dummyRepTwo = voHelper.getDummyTimelineRepresentation(testType);
                    dummyRepTwo.adaptation.period.start = 20;
                    dummyRepTwo.adaptation.period.duration = Number.POSITIVE_INFINITY;
                    streamTwoMock.setRepresentation(dummyRepTwo);

                    streamOneMock.setStreamInfo({
                        start: 10,
                        duration: 10
                    });
                    streamTwoMock.setStreamInfo({
                        start: 20,
                        duration: Number.POSITIVE_INFINITY
                    });

                    streamOneMock.setRegularPeriods([{
                        mpd: {
                            availabilityStartTime: new Date(new Date().getTime() - tsbd * 1000),
                            timeShiftBufferDepth: tsbd
                        }
                    }]);
                    streams.push(streamOneMock, streamTwoMock);

                    const range = timelineConverter.calcTimeShiftBufferWindow(streams, true);
                    expect(range.start).to.be.equal(10);
                    expect(range.end).to.be.equal(50);
                    clock.restore();
                });

                it('with two periods and period end smaller than now', function () {
                    const clock = sinon.useFakeTimers(new Date().getTime());
                    const tsbd = 30;
                    const dummyRep = voHelper.getDummyTimelineRepresentation(testType);
                    dummyRep.adaptation.period.start = 0;
                    dummyRep.adaptation.period.duration = 10;
                    streamOneMock.setRepresentation(dummyRep);
                    const dummyRepTwo = voHelper.getDummyTimelineRepresentation(testType);
                    dummyRepTwo.adaptation.period.start = 10;
                    dummyRepTwo.adaptation.period.duration = 10;
                    streamTwoMock.setRepresentation(dummyRepTwo);

                    streamOneMock.setStreamInfo({
                        start: 0,
                        duration: 10
                    });
                    streamTwoMock.setStreamInfo({
                        start: 10,
                        duration: 10
                    });

                    streamOneMock.setRegularPeriods([{
                        mpd: {
                            availabilityStartTime: new Date(new Date().getTime() - tsbd * 1000),
                            timeShiftBufferDepth: tsbd
                        }
                    }]);
                    streams.push(streamOneMock, streamTwoMock);

                    const range = timelineConverter.calcTimeShiftBufferWindow(streams, true);
                    expect(range.start).to.be.equal(0);
                    expect(range.end).to.be.equal(20);
                    clock.restore();
                });

                it('with two periods and period end out of the "normal" TSBD', function () {
                    const clock = sinon.useFakeTimers(new Date().getTime());
                    const tsbd = 30;
                    const dummyRep = voHelper.getDummyTimelineRepresentation(testType);
                    dummyRep.adaptation.period.start = 0;
                    dummyRep.adaptation.period.duration = 10;
                    streamOneMock.setRepresentation(dummyRep);
                    const dummyRepTwo = voHelper.getDummyTimelineRepresentation(testType);
                    dummyRepTwo.adaptation.period.start = 10;
                    dummyRepTwo.adaptation.period.duration = 20;
                    streamTwoMock.setRepresentation(dummyRepTwo);

                    streamOneMock.setStreamInfo({
                        start: 0,
                        duration: 10
                    });
                    streamTwoMock.setStreamInfo({
                        start: 10,
                        duration: 20
                    });

                    streamOneMock.setRegularPeriods([{
                        mpd: {
                            availabilityStartTime: new Date(new Date().getTime() - 2000 * 1000),
                            timeShiftBufferDepth: tsbd
                        }
                    }]);
                    streams.push(streamOneMock, streamTwoMock);

                    const range = timelineConverter.calcTimeShiftBufferWindow(streams, true);
                    expect(range.start).to.be.equal(0);
                    expect(range.end).to.be.equal(30);
                    clock.restore();
                });

                it('with two periods and last segments out of the "normal" TSBD', function () {
                    const clock = sinon.useFakeTimers(new Date().getTime());
                    const tsbd = 30;
                    const dummyRep = voHelper.getDummyTimelineRepresentation(testType);
                    dummyRep.adaptation.period.start = 0;
                    dummyRep.adaptation.period.duration = 10;
                    streamOneMock.setRepresentation(dummyRep);
                    const dummyRepTwo = voHelper.getDummyTimelineRepresentation(testType);
                    dummyRepTwo.adaptation.period.start = 10;
                    dummyRepTwo.adaptation.period.duration = 300;
                    streamTwoMock.setRepresentation(dummyRepTwo);

                    streamOneMock.setStreamInfo({
                        start: 0,
                        duration: 10
                    });
                    streamTwoMock.setStreamInfo({
                        start: 10,
                        duration: 300
                    });

                    streamOneMock.setRegularPeriods([{
                        mpd: {
                            availabilityStartTime: new Date(new Date().getTime() - 2000 * 1000),
                            timeShiftBufferDepth: tsbd
                        }
                    }]);
                    streams.push(streamOneMock, streamTwoMock);

                    const range = timelineConverter.calcTimeShiftBufferWindow(streams, true);
                    expect(range.start).to.be.equal(30);
                    expect(range.end).to.be.equal(60);
                    clock.restore();
                });

                it('with two periods and last segments out of the "normal" large TSBD', function () {
                    const clock = sinon.useFakeTimers(new Date().getTime());
                    const tsbd = 300;
                    const dummyRep = voHelper.getDummyTimelineRepresentation(testType);
                    dummyRep.adaptation.period.start = 0;
                    dummyRep.adaptation.period.duration = 10;
                    streamOneMock.setRepresentation(dummyRep);
                    const dummyRepTwo = voHelper.getDummyTimelineRepresentation(testType);
                    dummyRepTwo.adaptation.period.start = 10;
                    dummyRepTwo.adaptation.period.duration = 300;
                    streamTwoMock.setRepresentation(dummyRepTwo);

                    streamOneMock.setStreamInfo({
                        start: 0,
                        duration: 10
                    });
                    streamTwoMock.setStreamInfo({
                        start: 10,
                        duration: 300
                    });

                    streamOneMock.setRegularPeriods([{
                        mpd: {
                            availabilityStartTime: new Date(new Date().getTime() - 2000 * 1000),
                            timeShiftBufferDepth: tsbd
                        }
                    }]);
                    streams.push(streamOneMock, streamTwoMock);
                    const range = timelineConverter.calcTimeShiftBufferWindow(streams, true);
                    expect(range.start).to.be.equal(0);
                    expect(range.end).to.be.equal(60);
                    clock.restore();
                });

                it('with two periods no tsbd', function () {
                    const clock = sinon.useFakeTimers(new Date().getTime());
                    const dummyRep = voHelper.getDummyTimelineRepresentation(testType);
                    dummyRep.adaptation.period.start = 0;
                    dummyRep.adaptation.period.duration = 10;
                    streamOneMock.setRepresentation(dummyRep);
                    const dummyRepTwo = voHelper.getDummyTimelineRepresentation(testType);
                    dummyRepTwo.adaptation.period.start = 10;
                    dummyRepTwo.adaptation.period.duration = 300;
                    streamTwoMock.setRepresentation(dummyRepTwo);

                    streamOneMock.setStreamInfo({
                        start: 0,
                        duration: 10
                    });
                    streamTwoMock.setStreamInfo({
                        start: 10,
                        duration: 300
                    });
                    streamOneMock.setRegularPeriods([{
                        mpd: {
                            availabilityStartTime: new Date(new Date().getTime() - 300 * 1000),
                            timeShiftBufferDepth: NaN
                        }
                    }]);
                    streams.push(streamOneMock, streamTwoMock);

                    const range = timelineConverter.calcTimeShiftBufferWindow(streams, true);
                    expect(range.start).to.be.equal(0);
                    expect(range.end).to.be.equal(60);
                    clock.restore();
                });

                it('with two periods start larger than now', function () {
                    const clock = sinon.useFakeTimers(new Date().getTime());
                    const tsbd = 30;
                    const dummyRep = voHelper.getDummyTimelineRepresentation(testType);
                    dummyRep.adaptation.period.start = 40;
                    dummyRep.adaptation.period.duration = 10;
                    streamOneMock.setRepresentation(dummyRep);
                    const dummyRepTwo = voHelper.getDummyTimelineRepresentation(testType);
                    dummyRepTwo.adaptation.period.start = 50;
                    dummyRepTwo.adaptation.period.duration = 300;
                    streamTwoMock.setRepresentation(dummyRepTwo);

                    streamOneMock.setStreamInfo({
                        start: 40,
                        duration: 10
                    });
                    streamTwoMock.setStreamInfo({
                        start: 50,
                        duration: 300
                    });
                    streamOneMock.setRegularPeriods([{
                        mpd: {
                            availabilityStartTime: new Date(new Date().getTime() - tsbd * 1000),
                            timeShiftBufferDepth: tsbd
                        }
                    }]);
                    streams.push(streamOneMock);

                    const range = timelineConverter.calcTimeShiftBufferWindow(streams, true);
                    expect(range.start).to.be.equal(40);
                    expect(range.end).to.be.equal(30);
                    clock.restore();
                });

                it('with two periods end smaller than now minus tsbd', function () {
                    const clock = sinon.useFakeTimers(new Date().getTime());
                    const tsbd = 5;
                    const dummyRep = voHelper.getDummyTimelineRepresentation(testType);
                    dummyRep.adaptation.period.start = 0;
                    dummyRep.adaptation.period.duration = 10;
                    streamOneMock.setRepresentation(dummyRep);
                    const dummyRepTwo = voHelper.getDummyTimelineRepresentation(testType);
                    dummyRepTwo.adaptation.period.start = 10;
                    dummyRepTwo.adaptation.period.duration = 10;
                    streamTwoMock.setRepresentation(dummyRepTwo);

                    streamOneMock.setStreamInfo({
                        start: 0,
                        duration: 10
                    });
                    streamTwoMock.setStreamInfo({
                        start: 10,
                        duration: 10
                    });
                    streamOneMock.setRegularPeriods([{
                        mpd: {
                            availabilityStartTime: new Date(new Date().getTime() - 30 * 1000),
                            timeShiftBufferDepth: tsbd
                        }
                    }]);
                    streams.push(streamOneMock, streamTwoMock);

                    const range = timelineConverter.calcTimeShiftBufferWindow(streams, true);
                    expect(range.start).to.be.equal(15);
                    expect(range.end).to.be.equal(20);
                    clock.restore();
                });
            });
        });
    });
});

