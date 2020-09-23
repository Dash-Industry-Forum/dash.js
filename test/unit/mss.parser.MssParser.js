import MssParser from '../../src/mss/parser/MssParser';
import BASE64 from '../../externals/base64';
import Constants from '../../src/streaming/constants/Constants';

import DebugMock from './mocks/DebugMock';
import ManifestModelMock from './mocks/ManifestModelMock';
import MediaPlayerModelMock from './mocks/MediaPlayerModelMock';

const expect = require('chai').expect;
const fs = require('fs');
const jsdom = require('jsdom').JSDOM;

describe('MssParser', function () {

    let mssParser;

    beforeEach(function () {
        if (typeof window === 'undefined') {
            global.window = {
                performance: {
                    now: function () {
                        return Date.now();
                    }
                },
                DOMParser:  new jsdom().window.DOMParser
            };
        }
    });

    afterEach(function () {
        delete global.window;
    });

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

    it('should parse a smooth streaming manifest', function () {
        let xml = fs.readFileSync(__dirname + '/data/mss/manifest.xml', 'utf8');
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
    it('should skip video adaptations if fourCC attribute is not found', function () {
        let xml = fs.readFileSync(__dirname + '/data/mss/manifestFourCCError.xml', 'utf8');
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

    it('should map mss subtype to dash role', function () {
        let xml = fs.readFileSync(__dirname + '/data/mss/manifestSubtype.xml', 'utf8');
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
