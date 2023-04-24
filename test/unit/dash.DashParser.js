import DashParser from '../../src/dash/parser/DashParser';
import DebugMock from './mocks/DebugMock';
import DashManifestModel from '../../src/dash/models/DashManifestModel';
import FileLoader from './helpers/FileLoader';

import ErrorHandlerMock from './mocks/ErrorHandlerMock';

const expect = require('chai').expect;

const context = {};

let dashParser = DashParser(context).create({debug: new DebugMock()});
const errorHandlerMock = new ErrorHandlerMock();
const dashManifestModel = DashManifestModel(context).getInstance();

describe('DashParser', function () {

    it('should throw an error when parse is called without data and config object has been set properly', function () {
        expect(dashParser.parse.bind('')).to.be.throw('parsing the manifest failed');
    });

    it('should throw an error when parse is called with invalid data', async () => {
        let manifest = await FileLoader.loadTextFile('/data/dash/manifest_error.xml');
        expect(dashParser.parse.bind(manifest)).to.be.throw('parsing the manifest failed');
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
})



