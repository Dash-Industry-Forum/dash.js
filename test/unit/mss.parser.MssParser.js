/* jshint expr: true */

import MssParser from '../../src/mss/parser/MssParser.js';
import MediaPlayerModel from '../../src/streaming/models/MediaPlayerModel.js';

const expect = require('chai').expect;
const fs = require('fs');
const domParser = require('xmldom').DOMParser;

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
            mediaPlayerModel: mediaPlayerModel
        });

        expect(mssParser).to.exist;
    });
    it('should parse a smooth streaming manifest', function () {
        let xml = fs.readFileSync(__dirname + '/data/mss/manifest.xml', 'utf8');
        let manifest = mssParser.parse(xml);
        expect(manifest).to.exist;
        expect(manifest.protocol).to.equal('MSS');
        expect(manifest.Period.AdaptationSet_asArray).to.be.an.instanceof(Array);

        let adaptation;
        for (let i = 0; i < manifest.Period.AdaptationSet_asArray.length; i++) {

            adaptation = manifest.Period.AdaptationSet_asArray[i];
            expect(adaptation.id).to.exist;
            expect(adaptation.id).not.to.be.empty;
            expect(adaptation.Representation_asArray).to.exist;

            for (let j = 0; j < adaptation.Representation_asArray.length; j++) {
                let representation = adaptation.Representation_asArray[j];

                // representation.id should be "type_index", because there is no name in StreamIndex node
                expect(representation.id).to.exist;
                let expectedId = adaptation.id + '_' + j;
                expect(representation.id).to.equal(expectedId);
            }
        }
    });
});
