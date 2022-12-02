import IsoFile from '../../src/streaming/utils/IsoFile';
import ISOBoxer from 'codem-isoboxer';

const expect = require('chai').expect;
const fs = require('fs');

const context = {};
const isoFile = IsoFile(context).create();

describe('IsoFile', function () {
    describe('when no parsed file has been set', () => {
        it('should return null when getBoxes is called and no parsed file has been set', () => {
            const boxes = isoFile.getBoxes('test');

            expect(boxes).to.be.instanceOf(Array);    // jshint ignore:line
            expect(boxes).to.be.empty;                // jshint ignore:line
        });

        it('should return null when getBox is called and no parsed file has been set', () => {
            const box = isoFile.getBox('test');

            expect(box).to.be.null;  // jshint ignore:line
        });

        it('should return null when getLastBox is called and no parsed file has been set', () => {
            const lastBox = isoFile.getLastBox();

            expect(lastBox).to.be.null;  // jshint ignore:line
        });

        it('should return null when getBox is called and type is undefined', () => {
            const box = isoFile.getBox();

            expect(box).to.be.null;                // jshint ignore:line
        });
    });
    describe('when incorrect parsed file has been set', () => {
        it('should return an empty array when getBoxes is called and type is undefined', () => {
            const parsedFile = ISOBoxer.parseBuffer(new ArrayBuffer(10));
            isoFile.setData(parsedFile);
            const boxes = isoFile.getBoxes();

            expect(boxes).to.be.instanceOf(Array);
            expect(boxes).to.be.empty;                // jshint ignore:line
        });

        it('should return null when getLastBox is called', () => {
            isoFile.setData({boxes: [{type: 'typeA'}, {type: 'typeB'}]});
            const box = isoFile.getLastBox();

            expect(box).to.be.null;                // jshint ignore:line
        });

        it('should return an empty array when getBoxes is called', () => {
            const parsedFile = ISOBoxer.parseBuffer(new ArrayBuffer(10));
            isoFile.setData(parsedFile);
            const boxes = isoFile.getBoxes('typeA');

            expect(boxes).to.be.instanceOf(Array);
            expect(boxes).to.be.empty;                // jshint ignore:line
        });

        it('should return null when getBox is called and parsedFile has no boxes attribute', () => {
            isoFile.setData({});
            const box = isoFile.getBox('typeA');

            expect(box).to.be.null;                // jshint ignore:line
        });

        it('should return null when getBox is called and parsedFile has an empty boxes array attribute', () => {
            isoFile.setData({boxes: []});
            const box = isoFile.getBox('typeA');

            expect(box).to.be.null;                // jshint ignore:line
        });

        it('should return null when getBox is called and parsedFile is incorrect', () => {
            isoFile.setData({boxes: [{type: 'typeA'}, {type: 'typeB'}]});
            const box = isoFile.getBox('typeA');

            expect(box).to.be.null;                // jshint ignore:line
        });
    });

    describe('when a correct parsed file has been set', () => {
        before(function () {
            const file = fs.readFileSync(__dirname + '/data/mss/mss_moof.mp4');
            const arrayBuffer = new Uint8Array(file).buffer;
            const parsedFile = ISOBoxer.parseBuffer(arrayBuffer);
            isoFile.setData(parsedFile);
        });

        it('should return null when getBox is called and type is not present in boxes array', () => {
            const box = isoFile.getBox('emsg');

            expect(box).to.be.null;                // jshint ignore:line
        });

        it('should return the good box when getBox is called and type is present in boxes array', () => {
            const box = isoFile.getBox('mfhd');

            expect(box).not.to.be.null;                // jshint ignore:line
            expect(box.type).to.equal('mfhd');
        });

        it('should return the good box when getLastBox is called', () => {
            const box = isoFile.getLastBox();

            expect(box).not.to.be.null;                // jshint ignore:line
            expect(box.type).to.equal('mdat');
        });
    });
});