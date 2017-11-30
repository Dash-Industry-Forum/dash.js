import MssParser from '../../src/mss/parser/MssParser';
import MediaPlayerModel from '../../src/streaming/models/MediaPlayerModel';
import Debug from '../../src/core/Debug';

const expect = require('chai').expect;
const fs = require('fs');
const domParser = require('xmldom').DOMParser;
const context = {};

describe('MssParser', function () {

    let mssParser;
    const mediaPlayerModel = MediaPlayerModel().getInstance();

    beforeEach(function () {
        if (typeof window === 'undefined') {
            global.window = {
                performance: {
                    now: function () {
                        return Date.now();
                    }
                },
                DOMParser: domParser
            };
        }
    });

    afterEach(function () {
        delete global.window;
    });

    beforeEach(function () {
        mssParser = MssParser().create({
            mediaPlayerModel: mediaPlayerModel,
            log: Debug(context).getInstance().log
        });

        expect(mssParser).to.exist; // jshint ignore:line
    });
    it('should parse a smooth streaming manifest', function () {
        let xml = fs.readFileSync(__dirname + '/data/mss/manifest.xml', 'utf8');
        let manifest = mssParser.parse(xml);
        expect(manifest).to.exist; // jshint ignore:line
        expect(manifest.protocol).to.equal('MSS');
        expect(manifest.Period.AdaptationSet_asArray).to.be.an.instanceof(Array);

        let adaptation;
        for (let i = 0; i < manifest.Period.AdaptationSet_asArray.length; i++) {

            adaptation = manifest.Period.AdaptationSet_asArray[i];
            expect(adaptation.id).to.exist; // jshint ignore:line
            expect(adaptation.id).not.to.be.empty; // jshint ignore:line
            expect(adaptation.Representation_asArray).to.exist; // jshint ignore:line

            for (let j = 0; j < adaptation.Representation_asArray.length; j++) {
                let representation = adaptation.Representation_asArray[j];

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
        let adaptations = manifest.Period.AdaptationSet_asArray;
        expect(manifest).to.exist; // jshint ignore:line
        expect(manifest.protocol).to.equal('MSS');
        expect(adaptations).to.be.an.instanceof(Array);
        expect(adaptations).to.have.lengthOf(1);
        expect(adaptations[0].contentType).to.equal('audio');
    });
});
