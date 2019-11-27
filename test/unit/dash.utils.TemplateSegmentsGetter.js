import TimelineConverter from '../../src/dash/utils/TimelineConverter';
import TemplateSegmentsGetter from '../../src/dash/utils/TemplateSegmentsGetter';
import Constants from '../../src/streaming/constants/Constants';
import VoHelper from './helpers/VOHelper';

const expect = require('chai').expect;

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
        it('should throw an error if config object is not defined', function () {
            const getter = TemplateSegmentsGetter(context).create();
            expect(getter.getSegmentByIndex.bind(getter)).to.be.throw(Constants.MISSING_CONFIG_ERROR);
        });

        it('should throw an error if config object has not been properly passed', function () {
            const getter = TemplateSegmentsGetter(context).create({});
            expect(getter.getSegmentByIndex.bind(getter)).to.be.throw(Constants.MISSING_CONFIG_ERROR);
        });

        it('should throw an error if representation parameter has not been properly set', function () {
            const getter = TemplateSegmentsGetter(context).create({timelineConverter: timelineConverter});
            const segment = getter.getSegmentByIndex();

            expect(segment).to.be.null; // jshint ignore:line
        });
    });

    describe('availableSegmentsNumber calculation', () => {
        it('should set availableSegmentsNumber as 1 if duration is not defined', () => {
            const representation = voHelper.getDummyRepresentation(Constants.VIDEO);
            representation.segmentAvailabilityRange = {start: 0, end: 100};
            representation.segmentDuration = undefined;

            templateSegmentsGetter.getSegmentByIndex(representation, 0);
            expect(representation.availableSegmentsNumber).to.equal(1);
        });

        it('should calculate representation segment range correctly', () => {
            const representation = voHelper.getDummyRepresentation(Constants.VIDEO);
            representation.segmentAvailabilityRange = {start: 0, end: 100};
            representation.segmentDuration = 5;

            templateSegmentsGetter.getSegmentByIndex(representation, 0);
            expect(representation.availableSegmentsNumber).to.equal(20);
        });
    });

    describe('getSegmentByIndex', () => {
        it('should return segment given an index', () => {
            const representation = voHelper.getDummyRepresentation(Constants.VIDEO);
            representation.segmentAvailabilityRange = {start: 0, end: 100};
            representation.segmentDuration = 1;

            let seg = templateSegmentsGetter.getSegmentByIndex(representation, 0);
            expect(seg.availabilityIdx).to.equal(0);
            expect(seg.presentationStartTime).to.equal(0);
            expect(seg.duration).to.equal(1);

            seg = templateSegmentsGetter.getSegmentByIndex(representation, 1);
            expect(seg.availabilityIdx).to.equal(1);
            expect(seg.presentationStartTime).to.equal(1);
            expect(seg.duration).to.equal(1);

            seg = templateSegmentsGetter.getSegmentByIndex(representation, 2);
            expect(seg.availabilityIdx).to.equal(2);
            expect(seg.presentationStartTime).to.equal(2);
            expect(seg.duration).to.equal(1);
        });

        it('should return null if segment is out of range', () => {
            const representation = voHelper.getDummyRepresentation(Constants.VIDEO);
            representation.segmentAvailabilityRange = {start: 0, end: 100};
            representation.segmentDuration = 5;

            let seg = templateSegmentsGetter.getSegmentByIndex(representation, 1 + 100 / 5);
            expect(seg).to.be.null; // jshint ignore:line
        });
    });

    describe('getSegmentByTime', () => {
        it('should return null if segment duration is not defined', () => {
            const representation = voHelper.getDummyRepresentation(Constants.VIDEO);
            representation.segmentAvailabilityRange = {start: 0, end: 100};
            representation.segmentDuration = undefined;

            let seg = templateSegmentsGetter.getSegmentByTime(representation, 0);
            expect(seg).to.be.null; // jshint ignore:line
        });

        it('should return segment by time', () => {
            const representation = voHelper.getDummyRepresentation(Constants.VIDEO);
            representation.segmentAvailabilityRange = {start: 0, end: 100};
            representation.segmentDuration = 5;

            let seg = templateSegmentsGetter.getSegmentByTime(representation, 0);
            expect(seg.availabilityIdx).to.equal(0);
            expect(seg.presentationStartTime).to.equal(0);
            expect(seg.duration).to.equal(5);

            seg = templateSegmentsGetter.getSegmentByTime(representation, 3);
            expect(seg.availabilityIdx).to.equal(0);
            expect(seg.presentationStartTime).to.equal(0);
            expect(seg.duration).to.equal(5);

            seg = templateSegmentsGetter.getSegmentByTime(representation, 12);
            expect(seg.availabilityIdx).to.equal(2);
            expect(seg.presentationStartTime).to.equal(10);
            expect(seg.duration).to.equal(5);

            seg = templateSegmentsGetter.getSegmentByTime(representation, 17);
            expect(seg.availabilityIdx).to.equal(3);
            expect(seg.presentationStartTime).to.equal(15);
            expect(seg.duration).to.equal(5);
        });

        it('should return null if segment is out of range', () => {
            const representation = voHelper.getDummyRepresentation(Constants.VIDEO);
            representation.segmentAvailabilityRange = {start: 0, end: 100};
            representation.segmentDuration = 5;

            let seg = templateSegmentsGetter.getSegmentByTime(representation, 110);
            expect(seg).to.be.null; // jshint ignore:line
        });
    });
});
