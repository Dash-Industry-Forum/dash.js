import DashManifestModel from '../../../../src/dash/models/DashManifestModel.js';
import DashParser from '../../../../src/dash/parser/DashParser.js';
import DebugMock from '../../mocks/DebugMock.js';

import {expect} from 'chai';

const context = {};
const dashManifestModel = DashManifestModel(context).getInstance();
const dashParser = DashParser(context).create({ debug: new DebugMock() });

const MPD_OPEN = '<MPD xmlns="urn:mpeg:dash:schema:mpd:2011" type="dynamic" minimumUpdatePeriod="PT2S">';

function videoAdaptationSet(segmentTimeline, id = '1') {
    return `<AdaptationSet id="${id}" contentType="video" mimeType="video/mp4" codecs="avc1.64001f">
            <SegmentTemplate timescale="15360" initialization="$RepresentationID$/init.mp4" media="$RepresentationID$/$Time$.m4s">
                ${segmentTimeline}
            </SegmentTemplate>
            <Representation id="v${id}" bandwidth="500000" width="640" height="360"/>
        </AdaptationSet>`;
}

function parse(periodContent) {
    return dashParser.parse(`${MPD_OPEN}<Period id="0" start="PT0S">${periodContent}</Period></MPD>`);
}

describe('DashManifestModel - getIsContentPending', function () {

    it('should return false when no manifest is given', function () {
        expect(dashManifestModel.getIsContentPending()).to.be.false;
    });

    it('should return true for a dynamic MPD without a Period', function () {
        const manifest = dashParser.parse(`${MPD_OPEN}</MPD>`);

        expect(dashManifestModel.getIsContentPending(manifest)).to.be.true;
    });

    it('should return true for a Period without AdaptationSet', function () {
        expect(dashManifestModel.getIsContentPending(parse(''))).to.be.true;
    });

    it('should return true for an AdaptationSet without Representation', function () {
        const manifest = parse('<AdaptationSet id="1" contentType="video" mimeType="video/mp4"/>');

        expect(dashManifestModel.getIsContentPending(manifest)).to.be.true;
    });

    it('should return true for a SegmentTimeline without S element', function () {
        expect(dashManifestModel.getIsContentPending(parse(videoAdaptationSet('<SegmentTimeline/>')))).to.be.true;
    });

    it('should return false if one AdaptationSet has segments and another has an empty SegmentTimeline', function () {
        const manifest = parse(
            videoAdaptationSet('<SegmentTimeline><S t="0" d="30720"/></SegmentTimeline>', '1') +
            videoAdaptationSet('<SegmentTimeline/>', '2')
        );

        expect(dashManifestModel.getIsContentPending(manifest)).to.be.false;
    });

    it('should return false for a multi-period MPD whose newest Period has no content yet', function () {
        const manifest = dashParser.parse(`${MPD_OPEN}
            <Period id="0" start="PT0S">
                ${videoAdaptationSet('<SegmentTimeline><S t="0" d="30720"/></SegmentTimeline>')}
            </Period>
            <Period id="1" start="PT2S"/>
        </MPD>`);

        expect(dashManifestModel.getIsContentPending(manifest)).to.be.false;
    });

    it('should return true for a multi-period MPD in which no Period has content yet', function () {
        const manifest = dashParser.parse(`${MPD_OPEN}
            <Period id="0" start="PT0S">${videoAdaptationSet('<SegmentTimeline/>')}</Period>
            <Period id="1" start="PT2S"/>
        </MPD>`);

        expect(dashManifestModel.getIsContentPending(manifest)).to.be.true;
    });

    it('should return false for a SegmentTimeline with segments', function () {
        const manifest = parse(videoAdaptationSet('<SegmentTimeline><S t="0" d="30720" r="2"/></SegmentTimeline>'));

        expect(dashManifestModel.getIsContentPending(manifest)).to.be.false;
    });

    it('should return false for a SegmentTemplate with duration and no SegmentTimeline', function () {
        const manifest = parse(`<AdaptationSet id="1" contentType="video" mimeType="video/mp4">
            <SegmentTemplate timescale="1000" duration="2000" startNumber="1" media="$RepresentationID$/$Number$.m4s"/>
            <Representation id="v1" bandwidth="500000"/>
        </AdaptationSet>`);

        expect(dashManifestModel.getIsContentPending(manifest)).to.be.false;
    });

    it('should return true for an empty video SegmentTimeline next to a sidecar subtitle', function () {
        const manifest = parse(videoAdaptationSet('<SegmentTimeline/>') +
            `<AdaptationSet id="2" contentType="text" mimeType="text/vtt" lang="en">
                <Representation id="t1" bandwidth="256"><BaseURL>subs/en.vtt</BaseURL></Representation>
            </AdaptationSet>`);

        expect(dashManifestModel.getIsContentPending(manifest)).to.be.true;
    });

    it('should return true for an empty video SegmentTimeline next to a SegmentBase subtitle', function () {
        const manifest = parse(videoAdaptationSet('<SegmentTimeline/>') +
            `<AdaptationSet id="2" contentType="text" mimeType="application/mp4" codecs="stpp">
                <Representation id="t1" bandwidth="256"><BaseURL>subs.mp4</BaseURL><SegmentBase indexRange="0-100"/></Representation>
            </AdaptationSet>`);

        expect(dashManifestModel.getIsContentPending(manifest)).to.be.true;
    });

    it('should return false for a Period that only has a subtitle with content', function () {
        const manifest = parse(`<AdaptationSet id="1" contentType="text" mimeType="text/vtt">
                <Representation id="t1" bandwidth="256"><BaseURL>subs/en.vtt</BaseURL></Representation>
            </AdaptationSet>`);

        expect(dashManifestModel.getIsContentPending(manifest)).to.be.false;
    });

    it('should return false for a static MPD without AdaptationSet', function () {
        const manifest = dashParser.parse('<MPD type="static"><Period id="0"/></MPD>');

        expect(dashManifestModel.getIsContentPending(manifest)).to.be.false;
    });
});
