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
        expect(dashParser.parse.bind('')).to.be.throw('failed to parse the manifest');
    });

    it('should throw an error when parse is called with invalid data', async () => {
        let manifest = await FileLoader.loadTextFile('/data/dash/manifest_error.xml');
        expect(dashParser.parse.bind(manifest)).to.be.throw('failed to parse the manifest');
    });

    it('should return an Object when parse is called with correct data', async () => {
        let manifest = await FileLoader.loadTextFile('/data/dash/manifest.xml');
        expect(dashParser.parse.bind(manifest)).to.be.instanceOf(Object);
    });

    describe('DashParser matchers', async () => {
        beforeEach(function () {
            dashManifestModel.setConfig({
                errHandler: errorHandlerMock
            });
        });

        let manifest = await FileLoader.loadTextFile('/data/dash/manifest.xml');

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

    describe('DashParser - ObjectIron', async () => {
        beforeEach(function () {
            dashManifestModel.setConfig({
                errHandler: errorHandlerMock
            });
        });

        let manifest_prop = await FileLoader.loadTextFile('/data/dash/manifest_properties.xml');

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

    });
})



