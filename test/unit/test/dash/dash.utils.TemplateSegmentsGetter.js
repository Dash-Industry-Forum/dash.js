import TimelineConverter from '../../../../src/dash/utils/TimelineConverter.js';
import TemplateSegmentsGetter from '../../../../src/dash/utils/TemplateSegmentsGetter.js';
import Constants from '../../../../src/streaming/constants/Constants.js';
import VoHelper from '../../helpers/VOHelper.js';
import {expect} from 'chai';

describe('TemplateSegmentsGetter', () => {
    const context = {};
    const voHelper = new VoHelper();
    const timelineConverter = TimelineConverter(context).getInstance();
    timelineConverter.initialize();

    const templateSegmentsGetter = TemplateSegmentsGetter(context).create({
        timelineConverter: timelineConverter
    });

    it('should expose segments getter interface', () => {
        expect(templateSegmentsGetter.getSegmentByIndex).to.exist; // jshint ignore:line
        expect(templateSegmentsGetter.getSegmentByTime).to.exist; // jshint ignore:line
    });

    describe('initialization', () => {
        it('should throw an error if representation parameter has not been properly set', function () {
            const getter = TemplateSegmentsGetter(context).create({timelineConverter: timelineConverter});
            const segment = getter.getSegmentByIndex();

            expect(segment).to.be.null; // jshint ignore:line
        });
    });

    describe('availableSegmentsNumber calculation', () => {
        it('should set availableSegmentsNumber as 1 if duration is not defined', () => {
            const representation = voHelper.getDummyRepresentation(Constants.VIDEO);
            representation.segmentAvailabilityWindow = {start: 0, end: 100};
            representation.segmentDuration = undefined;

            const mediaFinishedInformation = templateSegmentsGetter.getMediaFinishedInformation(representation);
            expect(mediaFinishedInformation.numberOfSegments).to.equal(1);
        });

        it('should calculate availableSegmentsNumber correctly', () => {
            const representation = voHelper.getDummyRepresentation(Constants.VIDEO);
            representation.segmentDuration = 5;

            representation.segmentAvailabilityWindow = {start: 0, end: 100};
            let mediaFinishedInformation = templateSegmentsGetter.getMediaFinishedInformation(representation);
            expect(mediaFinishedInformation.numberOfSegments).to.equal(20);

            representation.segmentAvailabilityWindow = {start: 0, end: 101};
            representation.adaptation.period.duration = 101;
            mediaFinishedInformation = templateSegmentsGetter.getMediaFinishedInformation(representation);
            expect(mediaFinishedInformation.numberOfSegments).to.equal(21);
        });


    });

    describe('getSegmentByIndex', () => {
        it('should return segment given an index', () => {
            const representation = voHelper.getDummyRepresentation(Constants.VIDEO);
            representation.segmentAvailabilityWindow = {start: 0, end: 100};
            representation.segmentDuration = 1;

            let seg = templateSegmentsGetter.getSegmentByIndex(representation, 0);
            expect(seg.index).to.equal(0);
            expect(seg.presentationStartTime).to.equal(0);
            expect(seg.duration).to.equal(1);

            seg = templateSegmentsGetter.getSegmentByIndex(representation, 1);
            expect(seg.index).to.equal(1);
            expect(seg.presentationStartTime).to.equal(1);
            expect(seg.duration).to.equal(1);

            seg = templateSegmentsGetter.getSegmentByIndex(representation, 2);
            expect(seg.index).to.equal(2);
            expect(seg.presentationStartTime).to.equal(2);
            expect(seg.duration).to.equal(1);
        });

        it('should return null if segment is out of range', () => {
            const representation = voHelper.getDummyRepresentation(Constants.VIDEO);
            representation.segmentAvailabilityWindow = {start: 0, end: 100};
            representation.segmentDuration = 5;

            let seg = templateSegmentsGetter.getSegmentByIndex(representation, 1 + 100 / 5);
            expect(seg).to.be.null; // jshint ignore:line
        });

        it('should not return null if segment is equal to endNumber', () => {
            const representation = voHelper.getDummyRepresentation(Constants.VIDEO);
            representation.segmentAvailabilityWindow = {start: 0, end: 100};
            representation.segmentDuration = 1;
            representation.startNumber = 0;
            representation.endNumber = 3;

            let seg = templateSegmentsGetter.getSegmentByIndex(representation, 3);
            expect(seg.index).to.equal(3);
            expect(seg.replacementNumber).to.equal(3);
        })

        it('should not return null if segment is equal to endNumber and startNumber is 2', () => {
            const representation = voHelper.getDummyRepresentation(Constants.VIDEO);
            representation.segmentAvailabilityWindow = {start: 0, end: 100};
            representation.segmentDuration = 1;
            representation.startNumber = 2;
            representation.endNumber = 5;

            let seg = templateSegmentsGetter.getSegmentByIndex(representation, 3);
            expect(seg.index).to.equal(3);
            expect(seg.replacementNumber).to.equal(5);
        })

        it('should return null if segment is after endNumber', () => {
            const representation = voHelper.getDummyRepresentation(Constants.VIDEO);
            representation.segmentAvailabilityWindow = {start: 0, end: 100};
            representation.segmentDuration = 1;
            representation.startNumber = 0;
            representation.endNumber = 2;

            let seg = templateSegmentsGetter.getSegmentByIndex(representation, 3);
            expect(seg).to.be.null;
        })

        it('should return null if segment is after endNumber and startNumber is 2', () => {
            const representation = voHelper.getDummyRepresentation(Constants.VIDEO);
            representation.segmentAvailabilityWindow = {start: 0, end: 100};
            representation.segmentDuration = 1;
            representation.startNumber = 2;
            representation.endNumber = 5;

            let seg = templateSegmentsGetter.getSegmentByIndex(representation, 4);
            expect(seg).to.be.null;
        })
    });

    describe('getSegmentByTime', () => {
        it('should return null if segment duration is not defined', () => {
            const representation = voHelper.getDummyRepresentation(Constants.VIDEO);
            representation.segmentAvailabilityWindow = {start: 0, end: 100};
            representation.segmentDuration = undefined;

            let seg = templateSegmentsGetter.getSegmentByTime(representation, 0);
            expect(seg).to.be.null; // jshint ignore:line
        });

        it('should return segment by time', () => {
            const representation = voHelper.getDummyRepresentation(Constants.VIDEO);
            representation.segmentAvailabilityWindow = {start: 0, end: 100};
            representation.segmentDuration = 5;

            let seg = templateSegmentsGetter.getSegmentByTime(representation, 0);
            expect(seg.index).to.equal(0);
            expect(seg.presentationStartTime).to.equal(0);
            expect(seg.duration).to.equal(5);

            seg = templateSegmentsGetter.getSegmentByTime(representation, 3);
            expect(seg.index).to.equal(0);
            expect(seg.presentationStartTime).to.equal(0);
            expect(seg.duration).to.equal(5);

            seg = templateSegmentsGetter.getSegmentByTime(representation, 12);
            expect(seg.index).to.equal(2);
            expect(seg.presentationStartTime).to.equal(10);
            expect(seg.duration).to.equal(5);

            seg = templateSegmentsGetter.getSegmentByTime(representation, 17);
            expect(seg.index).to.equal(3);
            expect(seg.presentationStartTime).to.equal(15);
            expect(seg.duration).to.equal(5);
        });

        it('should return null if segment is out of range', () => {
            const representation = voHelper.getDummyRepresentation(Constants.VIDEO);
            representation.segmentAvailabilityWindow = {start: 0, end: 100};
            representation.segmentDuration = 5;

            let seg = templateSegmentsGetter.getSegmentByTime(representation, 110);
            expect(seg).to.be.null; // jshint ignore:line
        });
    });

    describe('partial segments', () => {
        function attachSegmentTemplate(representation, overrides = {}) {
            const template = Object.assign({
                media: 'video-$RepresentationID$-$Number$-$SubNumber$.m4s',
                k: 3 // three partial segments
            }, overrides);
            representation.SegmentTemplate = template;
            representation.adaptation.period.mpd.manifest.Period[representation.adaptation.period.index]
                .AdaptationSet[representation.adaptation.index]
                .Representation[representation.index]
                .SegmentTemplate = template;
            return template;
        }

        it('should return partial segment starting at provided sub-number (getSegmentByIndex)', () => {
            const representation = voHelper.getDummyRepresentation(Constants.VIDEO);
            representation.segmentAvailabilityWindow = { start: 0, end: 100 };
            representation.segmentDuration = 6;
            representation.timescale = 1;
            attachSegmentTemplate(representation);

            const seg = templateSegmentsGetter.getSegmentByIndex(representation, 2, 1); // segment index 2, start with partial 1
            expect(seg).to.exist; // jshint ignore:line
            expect(seg.isPartialSegment).to.be.true;
            expect(seg.index).to.equal(2);
            expect(seg.replacementSubNumber).to.equal(1);
        });

        it('should clamp negative indexWithoutStartNumber to 0', () => {
            const representation = voHelper.getDummyRepresentation(Constants.VIDEO);
            representation.segmentAvailabilityWindow = { start: 0, end: 50 };
            representation.segmentDuration = 5;
            representation.timescale = 1;
            attachSegmentTemplate(representation);

            const seg = templateSegmentsGetter.getSegmentByIndex(representation, -3, 0);
            expect(seg.index).to.equal(0);
        });

        it('should return null for dynamic unavailable segment (future availabilityStartTime)', () => {
            const dynamicContext = {};
            const dynamicTimelineConverter = TimelineConverter(dynamicContext).getInstance();
            dynamicTimelineConverter.initialize();
            const dynamicGetter = TemplateSegmentsGetter(dynamicContext).create({ timelineConverter: dynamicTimelineConverter }, true);

            const representation = voHelper.getDummyRepresentation(Constants.VIDEO);
            const future = new Date(Date.now() + 60000); // 60s in future
            representation.adaptation.period.mpd.availabilityStartTime = future;
            representation.segmentAvailabilityWindow = { start: 0, end: 100 };
            representation.segmentDuration = 4;
            representation.timescale = 1;
            attachSegmentTemplate(representation, { k: 0, media: 'f-$Number$.m4s' });

            const seg = dynamicGetter.getSegmentByIndex(representation, 0);
            expect(seg).to.be.null; // jshint ignore:line
        });
    });
});
