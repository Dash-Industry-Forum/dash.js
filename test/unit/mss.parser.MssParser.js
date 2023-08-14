import MssParser from '../../src/mss/parser/MssParser.js';
import BASE64 from '../../externals/base64.js';
import Constants from '../../src/streaming/constants/Constants.js';
import DebugMock from './mocks/DebugMock.js';
import ManifestModelMock from './mocks/ManifestModelMock.js';
import MediaPlayerModelMock from './mocks/MediaPlayerModelMock.js';
import FileLoader from './helpers/FileLoader.js';
import {expect} from 'chai';

describe('MssParser', function () {

    let mssParser;

    beforeEach(function () {
        mssParser = MssParser().create({
            mediaPlayerModel: new MediaPlayerModelMock(),
            manifestModel: new ManifestModelMock(),
            debug: new DebugMock(),
            BASE64: BASE64,
            constants: Constants
        });

        expect(mssParser).to.exist; // jshint ignore:line
    });

    it('should parse a smooth streaming manifest', async () => {
        let xml = await FileLoader.loadTextFile('/data/mss/manifest.xml');
        let manifest = mssParser.parse(xml);
        expect(manifest).to.exist; // jshint ignore:line
        expect(manifest.protocol).to.equal('MSS');
        expect(manifest.Period[0].AdaptationSet).to.be.an.instanceof(Array);

        let adaptation;
        for (let i = 0; i < manifest.Period[0].AdaptationSet.length; i++) {
            adaptation = manifest.Period[0].AdaptationSet[i];
            expect(adaptation.id).to.exist; // jshint ignore:line
            expect(adaptation.id).not.to.be.empty; // jshint ignore:line
            expect(adaptation.Representation).to.exist; // jshint ignore:line

            for (let j = 0; j < adaptation.Representation.length; j++) {
                let representation = adaptation.Representation[j];

                // representation.id should be "type_index", because there is no name in StreamIndex node
                expect(representation.id).to.exist; // jshint ignore:line
                let expectedId = adaptation.id + '_' + j;
                expect(representation.id).to.equal(expectedId);
            }
        }
    });
    it('should skip video adaptations if fourCC attribute is not found', async () => {
        let xml = await FileLoader.loadTextFile('/data/mss/manifestFourCCError.xml');
        let manifest = mssParser.parse(xml);
        let adaptations = manifest.Period[0].AdaptationSet;
        expect(manifest).to.exist; // jshint ignore:line
        expect(manifest.protocol).to.equal('MSS');
        expect(adaptations).to.be.an.instanceof(Array);
        expect(adaptations).to.have.lengthOf(1);
        expect(adaptations[0].contentType).to.equal('audio');
    });

    it('should throw an error when parse is called with invalid smooth data', function () {
        expect(mssParser.parse.bind('<SmoothStreamingMedia')).to.be.throw('parsing the manifest failed');
    });

    it('should map mss subtype to dash role', async () => {
        let xml = await FileLoader.loadTextFile('/data/mss/manifestSubtype.xml');
        let manifest = mssParser.parse(xml);
        expect(manifest).to.exist; // jshint ignore:line
        expect(manifest.protocol).to.equal('MSS');
        expect(manifest.Period[0].AdaptationSet).to.be.an.instanceof(Array);

        let adaptation;
        for (let i = 0; i < manifest.Period[0].AdaptationSet.length; i++) {
            adaptation = manifest.Period[0].AdaptationSet[i];
            if (adaptation.subType === 'CAPT') {
                expect(adaptation.Role).to.exist; // jshint ignore:line
                expect(adaptation.Role).to.be.an.instanceof(Array);
                expect(adaptation.Role).to.have.lengthOf(1);
                expect(adaptation.Role[0].schemeIdUri).to.equal('urn:mpeg:dash:role:2011');
                expect(adaptation.Role[0].value).to.equal('main');
            }
        }
    });
});
