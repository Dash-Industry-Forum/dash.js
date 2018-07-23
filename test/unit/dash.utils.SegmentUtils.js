import {
    unescapeDollarsInTemplate,
    replaceIDForTemplate,
    replaceTokenForTemplate,
    decideSegmentListRangeForTemplate
} from '../../src/dash/utils/SegmentsUtils';

import TimelineConverter from '../../src/dash/utils/TimelineConverter';
import VoHelper from './helpers/VOHelper';

const expect = require('chai').expect;

describe('SegmentUtils', function () {
    const context = {};
    const testType = 'fragmentedText';
    const voHelper = new VoHelper();
    const timelineConverter = TimelineConverter(context).getInstance();
    const representation = voHelper.getDummyRepresentation(testType);

    describe('unescapeDollarsInTemplate', function () {
        it('should return undefined when unescapeDollarsInTemplate is called with an undefined url', function () {
            const result = unescapeDollarsInTemplate();
            expect(result).to.be.undefined;  // jshint ignore:line
        });

        it('should unescape $$', function () {
            const result = unescapeDollarsInTemplate('this$$is$$a$$test$$for$$unescape');
            expect(result).to.be.equal('this$is$a$test$for$unescape');
        });
    });

    describe('replaceIDForTemplate', function () {
        it('should return undefined when replaceIDForTemplate is called with an undefined url', function () {
            const result = replaceIDForTemplate();
            expect(result).to.be.undefined;  // jshint ignore:line
        });

        it('should return url when replaceIDForTemplate is called with an undefined value', function () {
            const result = replaceIDForTemplate('a_sample_url');
            expect(result).to.be.equal('a_sample_url');
        });

        it('should return url when value url doesnt contain the string $RepresentationID$', function () {
            const result = replaceIDForTemplate('another_sample_url', 'id_rep');
            expect(result).to.be.equal('another_sample_url');
        });

        it('should replace in url any occurence of $RepresentationID$ string with the string value', function () {
            const result = replaceIDForTemplate('another_sample_url/$RepresentationID$/another_$RepresentationID$', 'id_rep');
            expect(result).to.be.equal('another_sample_url/id_rep/another_id_rep');
        });
    });

    describe('replaceTokenForTemplate', function () {
        it('should return undefined when no url is provided', function () {
            const result = replaceTokenForTemplate(undefined, 'Number', 1);
            expect(result).to.be.undefined;  // jshint ignore:line
        });

        it('should replace tokens', function () {
            const result = replaceTokenForTemplate('/segment_$Number$.m4v', 'Number', 1);
            expect(result).to.be.equal('/segment_1.m4v');
        });
    });

    describe('decideSegmentListRangeForTemplate', function () {
        it('should return a range {start: NaN, end: NaN} if representation object has no availabilityWindow attribute', function () {
            representation.availabilityWindow = null;
            const range = decideSegmentListRangeForTemplate(timelineConverter, true, representation, null, -1);
            expect(range.start).to.be.NaN;  // jshint ignore:line
            expect(range.end).to.be.NaN;  // jshint ignore:line
        });

    });
});
