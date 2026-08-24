import DashParser from '../../../../src/dash/parser/DashParser.js';
import DebugMock from '../../mocks/DebugMock.js';
import DashManifestModel from '../../../../src/dash/models/DashManifestModel.js';
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


