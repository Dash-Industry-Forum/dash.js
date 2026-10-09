import DashParser from '../../../../src/dash/parser/DashParser.js';
import DebugMock from '../../mocks/DebugMock.js';
import DashManifestModel from '../../../../src/dash/models/DashManifestModel.js';
import DashAdapter from '../../../../src/dash/DashAdapter.js';
import DescriptorType from '../../../../src/dash/vo/DescriptorType.js';
import FileLoader from '../../helpers/FileLoader.js';
import ErrorHandlerMock from '../../mocks/ErrorHandlerMock.js';

import {expect} from 'chai';

const context = {};

let dashParser = DashParser(context).create({ debug: new DebugMock() });
const errorHandlerMock = new ErrorHandlerMock();
const dashManifestModel = DashManifestModel(context).getInstance();

describe('DashParser', function () {

    it('should throw an error when parse is called without data and config object has been set properly', () => {
        expect(() => dashParser.parse('')).to.throw('failed to parse the manifest');
    });

    it('should throw an error when parse is called with invalid data', async () => {
        let manifest = await FileLoader.loadTextFile('/data/dash/manifest_error.xml');
        expect(() => dashParser.parse(manifest)).to.throw('failed to parse the manifest');
    });

    it('should return an Object when parse is called with correct data', async () => {
        let manifest = await FileLoader.loadTextFile('/data/dash/manifest.xml');
        expect(dashParser.parse(manifest)).to.be.instanceOf(Object);
    });

    it('should parse a single Viewpoint as an array', () => {
        const manifest = `<MPD>
    <Period>
        <AdaptationSet>
            <Viewpoint schemeIdUri="urn:mpeg:dash:viewpoint:2011" value="front"/>
        </AdaptationSet>
    </Period>
</MPD>`;
        const adaptationSet = dashParser.parse(manifest).Period[0].AdaptationSet[0];

        expect(adaptationSet.Viewpoint).to.be.instanceOf(Array);
        expect(adaptationSet.Viewpoint).to.have.lengthOf(1);
        expect(adaptationSet.Viewpoint[0].value).to.equal('front');

        const viewpoints = dashManifestModel.getViewpointForAdaptation(adaptationSet);

        expect(viewpoints).to.have.lengthOf(1);
        expect(viewpoints[0]).to.be.instanceOf(DescriptorType);
        expect(viewpoints[0].schemeIdUri).to.equal('urn:mpeg:dash:viewpoint:2011');
        expect(viewpoints[0].value).to.equal('front');
    });

    it('should preserve multiple Viewpoints in document order', () => {
        const manifest = `<MPD>
    <Period>
        <AdaptationSet>
            <Viewpoint schemeIdUri="urn:mpeg:dash:viewpoint:2011" value="front"/>
            <Viewpoint schemeIdUri="urn:mpeg:dash:viewpoint:2011" value="rear"/>
        </AdaptationSet>
    </Period>
</MPD>`;
        const adaptationSet = dashParser.parse(manifest).Period[0].AdaptationSet[0];

        expect(adaptationSet.Viewpoint).to.be.instanceOf(Array);
        expect(adaptationSet.Viewpoint.map((viewpoint) => viewpoint.value)).to.deep.equal(['front', 'rear']);
        expect(dashManifestModel.getViewpointForAdaptation(adaptationSet).map((viewpoint) => viewpoint.value)).to.deep.equal(['front', 'rear']);
    });

    it('should keep numeric-looking Viewpoint values as strings', () => {
        const manifest = `<MPD>
    <Period>
        <AdaptationSet>
            <Viewpoint schemeIdUri="urn:mpeg:dash:viewpoint:2011" value="01"/>
        </AdaptationSet>
    </Period>
</MPD>`;
        const adaptationSet = dashParser.parse(manifest).Period[0].AdaptationSet[0];

        expect(adaptationSet.Viewpoint[0].value).to.equal('01');
        expect(dashManifestModel.getViewpointForAdaptation(adaptationSet)[0].value).to.equal('01');
    });

    [
        'Accessibility', 'AssetIdentifier', 'AudioChannelConfiguration', 'ClientDataReporting',
        'ContentProtection', 'EssentialProperty', 'FramePacking', 'OutputProtection',
        'Rating', 'Reporting', 'Role', 'Scope', 'SupplementalProperty', 'UTCTiming', 'Viewpoint'
    ].forEach((tag) => {
        it(`should preserve numeric-looking ${tag} descriptor values`, () => {
            ['01', '000003', '1e3', '9007199254740993', '0'].forEach((value) => {
                const raw = dashParser.parseXml(`<${tag} schemeIdUri="test:scheme" value="${value}"/>`)[tag];
                const descriptor = new DescriptorType();
                descriptor.init(raw);

                expect(raw.value).to.equal(value);
                expect(descriptor.value).to.equal(value);
            });
        });
    });

    it('should still parse numeric Representation attributes', () => {
        const representation = dashParser.parseXml('<Representation id="01" bandwidth="1000000" width="1920" height="1080"/>').Representation;

        expect(representation.id).to.equal('01');
        expect(representation.bandwidth).to.equal(1000000);
        expect(representation.width).to.equal(1920);
        expect(representation.height).to.equal(1080);
    });

    it('should return a parsed Patch object when parse is called with valid patch data', () => {
        const patchManifest = `<?xml version="1.0" encoding="UTF-8"?>
<Patch mpdId="foobar"
       publishTime="2020-01-01T00:00:01Z"
       originalPublishTime="2020-01-01T00:00:00Z">
    <replace sel="/MPD/@publishTime">2020-01-01T00:00:01Z</replace>
</Patch>`;
        const parsedPatch = dashParser.parse(patchManifest);

        expect(parsedPatch).to.be.instanceOf(Object);
        expect(parsedPatch.protocol).to.equal('DASH');
        expect(parsedPatch.mpdId).to.equal('foobar');
        expect(parsedPatch.replace).to.be.instanceOf(Array);
        expect(parsedPatch.replace).to.have.lengthOf(1);
    });

    describe('DashParser matchers', function () {
        let manifest;

        before(async function () {
            manifest = await FileLoader.loadTextFile('/data/dash/manifest.xml');
        });

        beforeEach(function () {
            dashManifestModel.setConfig({
                errHandler: errorHandlerMock
            });
        });

        describe('date attributes', () => {
            const timestamp = '2026-09-13T14:34:56.789+02:00';

            [
                ['MPD', 'availabilityStartTime'],
                ['MPD', 'availabilityEndTime'],
                ['MPD', 'publishTime'],
                ['Patch', 'publishTime'],
                ['Patch', 'originalPublishTime'],
                ['LeapSecondInformation', 'nextLeapChangeTime'],
                ['ProducerReferenceTime', 'wallClockTime']
            ].forEach(([tag, attribute]) => {
                it(`should convert ${tag}@${attribute} to a Date, using UTC when no timezone is present`, () => {
                    [timestamp, '2026-09-13T12:34:56.789'].forEach(value => {
                        const parsed = dashParser.parseXml(`<${tag} ${attribute}="${value}"/>`)[tag];

                        expect(parsed[attribute]).to.be.instanceOf(Date);
                        expect(parsed[attribute].toISOString()).to.equal('2026-09-13T12:34:56.789Z');
                    });
                });
            });

            [
                ['MPD', 'id'],
                ['Patch', 'mpdId'],
                ['Viewpoint', 'value'],
                ['EssentialProperty', 'value'],
                ['SupplementalProperty', 'value'],
                ['EventStream', 'value']
            ].forEach(([tag, attribute]) => {
                it(`should preserve date-like strings in ${tag}@${attribute}`, () => {
                    [timestamp, `${timestamp}-camera-B`].forEach(value => {
                        const parsed = dashParser.parseXml(`<${tag} ${attribute}="${value}"/>`)[tag];

                        expect(parsed[attribute]).to.equal(value);
                    });
                });
            });

            it('should preserve milliseconds in direct UTC timing sources', () => {
                const parsed = dashParser.parse(`<MPD type="dynamic">
                    <UTCTiming schemeIdUri="urn:mpeg:dash:utc:direct:2014" value="${timestamp}"/>
                </MPD>`);
                const timingSource = dashManifestModel.getUTCTimingSources(parsed)[0];

                expect(timingSource.value).to.equal(timestamp);
                expect(Date.parse(timingSource.value)).to.equal(Date.parse(timestamp));
            });

            it('should accept patches with matching date-like manifest IDs', () => {
                const id = `${timestamp}-manifest`;
                const parsed = dashParser.parse(`<MPD id="${id}" publishTime="2026-09-13T12:00:00Z"/>`);
                const patch = dashParser.parse(`<Patch mpdId="${id}"
                    originalPublishTime="2026-09-13T12:00:00Z" publishTime="2026-09-13T12:01:00Z"/>`);

                expect(DashAdapter(context).getInstance().isPatchValid(parsed, patch)).to.equal(true);
            });
        });

        it('should return normalized language tag', async () => {
            let parsedMpd = dashParser.parse(manifest);
            let audioAdaptationsArray = dashManifestModel.getAdaptationsForType(parsedMpd, 0, 'audio');

            expect(audioAdaptationsArray).to.be.instanceOf(Array);
            expect(audioAdaptationsArray.length).to.equal(1);
            expect(dashManifestModel.getLanguageForAdaptation(audioAdaptationsArray[0])).to.equal('es');
        });

        it('should return normalized language tages for labels on AdaptationSets', async () => {
            let parsedMpd = dashParser.parse(manifest);
            let audioAdaptation = dashManifestModel.getAdaptationsForType(parsedMpd, 0, 'audio')[0];
            let labelArray = dashManifestModel.getLabelsForAdaptation(audioAdaptation);

            expect(labelArray).to.be.instanceOf(Array);
            expect(labelArray.length).to.equal(2);
            expect(labelArray[1].lang).to.equal('fr');
        });
    });

    describe('DashParser - ObjectIron', () => {
        let manifest_prop;

        before(async () => {
            manifest_prop = await FileLoader.loadTextFile('/data/dash/manifest_properties.xml');
        });

        beforeEach(function () {
            dashManifestModel.setConfig({
                errHandler: errorHandlerMock
            });
        });

        it('should map AudioChannelConfig even if another instance is present on Representation', async () => {
            let parsedMpd = dashParser.parse(manifest_prop);
            let audioAdaptationsArray = dashManifestModel.getAdaptationsForType(parsedMpd, 0, 'audio');
            let audiorepresentation = dashManifestModel.getRepresentationFor(0, audioAdaptationsArray[0]);

            let acc = dashManifestModel.getAudioChannelConfigurationForRepresentation(audiorepresentation);

            expect(acc).to.be.instanceOf(Array);
            expect(acc.length).to.equal(2);
        });

        it('should map allowed SupplementalProperties from AdaptationSet to Representation', async () => {
            let parsedMpd = dashParser.parse(manifest_prop);
            let rawAdaptationSet = parsedMpd.Period[0].AdaptationSet[0];

            expect(rawAdaptationSet.SupplementalProperty).to.be.instanceOf(Array);
            expect(rawAdaptationSet.SupplementalProperty.length).to.equal(3);

            let rawRepresentation = rawAdaptationSet.Representation[0];

            expect(rawRepresentation.SupplementalProperty).to.be.instanceOf(Array);
            expect(rawRepresentation.SupplementalProperty.length).to.equal(4);
        });

        it('should map only allowed non-Array attributes from AdaptationSet to Representation', async () => {
            let parsedMpd = dashParser.parse(manifest_prop);
            let rawAdaptationSet = parsedMpd.Period[0].AdaptationSet[0];
            let rawRepresentation = rawAdaptationSet.Representation[0];

            expect(rawRepresentation.SegmentTemplate).to.be.instanceOf(Object);

            expect(rawRepresentation.SegmentTemplate.initialization).to.equal('$RepresentationID$.m4a');
            expect(rawRepresentation.SegmentTemplate.media).to.equal('$Number$.m4a');
            expect(rawRepresentation.SegmentTemplate.duration).to.equal(300000);
        });

        it('should not map attributes', async () => {
            let parsedMpd = dashParser.parse(manifest_prop);
            let rawAdaptationSet = parsedMpd.Period[0].AdaptationSet[0];
            let rawRepresentation = rawAdaptationSet.Representation[0];

            expect(rawRepresentation.codecs).to.equal('mp4a.40.5');
        });

    });
})


