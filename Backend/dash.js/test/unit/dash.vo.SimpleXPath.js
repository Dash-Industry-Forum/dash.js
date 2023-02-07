import SimpleXPath from '../../src/dash/vo/SimpleXPath';

import PatchHelper from './helpers/PatchHelper';

const expect = require('chai').expect;

describe('SimpleXPath', function () {
    describe('construction', function () {
        it('simple valid path properly parsed', function () {
            let xpath = new SimpleXPath('/MPD/Period');
            expect(xpath.isValid()).to.be.true; // jshint ignore:line
            expect(xpath.path).to.deep.equal([
                {name: 'MPD'},
                {name: 'Period'}
            ]);
        });

        it('path with positional selectors parsed', function () {
            let xpath = new SimpleXPath('/MPD/Period[1]/AdaptationSet');
            expect(xpath.isValid()).to.be.true; // jshint ignore:line
            expect(xpath.path).to.deep.equal([
                {name: 'MPD'},
                {name: 'Period', position: 0}, // xpath positions are 1 based, we compute in 0 based
                {name: 'AdaptationSet'}
            ]);
        });

        it('path with attribute selectors no quoting parsed', function () {
            let xpath = new SimpleXPath('/MPD/Period[@id=foobar]/AdaptationSet');
            expect(xpath.isValid()).to.be.true; // jshint ignore:line
            expect(xpath.path).to.deep.equal([
                {name: 'MPD'},
                {name: 'Period', attribute: {name: 'id', value: 'foobar'}},
                {name: 'AdaptationSet'}
            ]);
        });

        it('path with attribute selector single quote parsed', function () {
            let xpath = new SimpleXPath('/MPD/Period[@id=\'foobar\']/AdaptationSet');
            expect(xpath.isValid()).to.be.true; // jshint ignore:line
            expect(xpath.path).to.deep.equal([
                {name: 'MPD'},
                {name: 'Period', attribute: {name: 'id', value: 'foobar'}},
                {name: 'AdaptationSet'}
            ]);
        });

        it('path with attribute selector double quote parsed', function () {
            let xpath = new SimpleXPath('/MPD/Period[@id="foobar"]/AdaptationSet');
            expect(xpath.isValid()).to.be.true; // jshint ignore:line
            expect(xpath.path).to.deep.equal([
                {name: 'MPD'},
                {name: 'Period', attribute: {name: 'id', value: 'foobar'}},
                {name: 'AdaptationSet'}
            ]);
        });

        it('non-absolute path marked invalid', function () {
            let xpath = new SimpleXPath('Period/AdaptationSet');
            expect(xpath.isValid()).to.be.false; // jshint ignore:line
        });

        it('path with mixture of selectors marked invalid', function () {
            let xpath = new SimpleXPath('/MPD/Period[@start=foo][@id=bar]/AdaptationSet');
            expect(xpath.isValid()).to.be.false; // jshint ignore:line
        });
    });

    describe('findsElement/findsAttribute', function () {
        it('should properly identify element endpoint', function () {
            let xpath = new SimpleXPath('/MPD/Period');
            expect(xpath.findsElement()).to.be.true; // jshint ignore:line
            expect(xpath.findsAttribute()).to.be.false; // jshint ignore:line
        });

        it('should properly identify attribute endpoint', function () {
            let xpath = new SimpleXPath('/MPD/Period/@id');
            expect(xpath.findsElement()).to.be.false; // jshint ignore:line
            expect(xpath.findsAttribute()).to.be.true; // jshint ignore:line
        });
    });

    describe('getMpdTarget', function () {
        // basic MPD that has all search cases:
        const patchHelper = new PatchHelper();
        const mpd = patchHelper.getStaticBaseMPD();


        it('should find node with basic path', function () {
            let xpath = new SimpleXPath('/MPD/UTCTiming');
            let result = xpath.getMpdTarget(mpd);
            expect(result.name).to.equal('UTCTiming');
            expect(result.leaf).to.equal('timetime');
            expect(result.target).to.equal(result.leaf);
        });

        it('should find node parent with basic path and sibling search', function () {
            let xpath = new SimpleXPath('/MPD/UTCTiming');
            let result = xpath.getMpdTarget(mpd, true);
            expect(result.name).to.equal('UTCTiming');
            expect(result.leaf).to.equal('timetime');
            expect(result.target).to.equal(mpd);
        });

        it('should find node when using position search with one child', function () {
            let xpath = new SimpleXPath('/MPD/Period[1]/BaseURL');
            let result = xpath.getMpdTarget(mpd);
            expect(result.name).to.equal('BaseURL');
            expect(result.leaf).to.equal(mpd.Period.BaseURL);
        });

        it('should find node when using implicit position search with one child', function () {
            let xpath = new SimpleXPath('/MPD/Period/BaseURL');
            let result = xpath.getMpdTarget(mpd);
            expect(result.name).to.equal('BaseURL');
            expect(result.leaf).to.equal(mpd.Period.BaseURL);
        });

        it('should find node when using position search with multiple children', function () {
            let xpath = new SimpleXPath('/MPD/Period/AdaptationSet[2]/SegmentTemplate');
            let result = xpath.getMpdTarget(mpd);
            expect(result.name).to.equal('SegmentTemplate');
            expect(result.leaf).to.equal(mpd.Period.AdaptationSet[1].SegmentTemplate);
        });

        it('should find node when ending with positional search of one child', function () {
            let xpath = new SimpleXPath('/MPD/Period[1]');
            let result = xpath.getMpdTarget(mpd);
            expect(result.name).to.equal('Period');
            expect(result.leaf).to.equal(mpd.Period);
        });

        it('should find node when ending with positional search of multiple children', function () {
            let xpath = new SimpleXPath('/MPD/Period/AdaptationSet[2]');
            let result = xpath.getMpdTarget(mpd);
            expect(result.name).to.equal('AdaptationSet');
            expect(result.leaf).to.equal(mpd.Period.AdaptationSet[1]);
        });

        it('should find node when attribute search used for one child', function () {
            let xpath = new SimpleXPath('/MPD/Period[@id="foo"]/BaseURL');
            let result = xpath.getMpdTarget(mpd);
            expect(result.name).to.equal('BaseURL');
            expect(result.leaf).to.equal(mpd.Period.BaseURL);
        });

        it('should find node when attribute search used for multiple children', function () {
            let xpath = new SimpleXPath('/MPD/Period/AdaptationSet[@id=20]/SegmentTemplate');
            let result = xpath.getMpdTarget(mpd);
            expect(result.name).to.equal('SegmentTemplate');
            expect(result.leaf).to.equal(mpd.Period.AdaptationSet[1].SegmentTemplate);
        });

        it('should find node when path ends in attributes search with one child', function () {
            let xpath = new SimpleXPath('/MPD/Period[@id="foo"]');
            let result = xpath.getMpdTarget(mpd);
            expect(result.name).to.equal('Period');
            expect(result.leaf).to.equal(mpd.Period);
        });

        it('should find node when path ends in attributes search with multiple children', function () {
            let xpath = new SimpleXPath('/MPD/Period/AdaptationSet[@id=20]');
            let result = xpath.getMpdTarget(mpd);
            expect(result.name).to.equal('AdaptationSet');
            expect(result.leaf).to.equal(mpd.Period.AdaptationSet[1]);
        });

        it('should find node when path targets attribute', function () {
            let xpath = new SimpleXPath('/MPD/BaseURL/@serviceLocation');
            let result = xpath.getMpdTarget(mpd);
            expect(result.name).to.equal('serviceLocation');
            expect(result.leaf).to.equal(mpd.BaseURL);
        });

        it('should fail to find positional search that does not exist', function () {
            let xpath = new SimpleXPath('/MPD/Period[5]/BaseURL');
            let result = xpath.getMpdTarget(mpd);
            expect(result).to.be.null; // jshint ignore:line
        });

        it('should fail to find positional search end that does not exist', function () {
            let xpath = new SimpleXPath('/MPD/Period[5]');
            let result = xpath.getMpdTarget(mpd);
            expect(result).to.be.null; // jshint ignore:line
        });

        it('should fail to find attribute search that does not exist', function () {
            let xpath = new SimpleXPath('/MPD/Period[@id="bar"]/BaseURL');
            let result = xpath.getMpdTarget(mpd);
            expect(result).to.be.null; // jshint ignore:line
        });

        it('should fail to find attribute search end that does not exist', function () {
            let xpath = new SimpleXPath('/MPD/Period[@id="bar"]');
            let result = xpath.getMpdTarget(mpd);
            expect(result).to.be.null; // jshint ignore:line
        });

        it('should find node in typical segment append case', function () {
            let xpath = new SimpleXPath('/MPD/Period[@id="foo"]/AdaptationSet[@id="20"]/SegmentTemplate/SegmentTimeline');
            let result = xpath.getMpdTarget(mpd);
            expect(result.name).to.equal('SegmentTimeline');
            expect(result.leaf).to.equal(mpd.Period.AdaptationSet[1].SegmentTemplate.SegmentTimeline);
        });
    });
});
