import {getCodecsParameter, getTextFormat, isTextCodecSupported} from '../../../../src/streaming/utils/TextFormatUtils.js';
import Constants from '../../../../src/streaming/constants/Constants.js';

import {expect} from 'chai';

describe('TextFormatUtils', function () {

    describe('getCodecsParameter', () => {

        it('should return the codecs parameter of a content type', () => {
            expect(getCodecsParameter('application/mp4;codecs="stpp.ttml.im1t"')).to.equal('stpp.ttml.im1t');
            expect(getCodecsParameter('application/mp4; codecs=wvtt')).to.equal('wvtt');
        });

        it('should return an empty string when there is no codecs parameter', () => {
            expect(getCodecsParameter('application/mp4')).to.equal('');
            expect(getCodecsParameter('application/mp4;codecs="undefined"')).to.equal('');
            expect(getCodecsParameter(undefined)).to.equal('');
        });
    });

    describe('getTextFormat', () => {

        it('should take the format from the sample entry first', () => {
            expect(getTextFormat('application/mp4;codecs="wvtt"', 'application/mp4', 'stpp')).to.equal(Constants.TTML);
        });

        it('should match the sample entry of an ISOBMFF codecs parameter in full', () => {
            expect(getTextFormat('application/mp4;codecs="stpp.ttml.im1t"', 'application/mp4')).to.equal(Constants.TTML);
            expect(getTextFormat('application/mp4;codecs="wvtt"', 'application/mp4')).to.equal(Constants.WVTT);
            expect(getTextFormat('application/mp4;codecs="stpc"', 'application/mp4')).to.be.null;
            expect(getTextFormat('application/mp4;codecs="wvtt2"', 'application/mp4')).to.be.null;
        });

        it('should not read the codecs parameter of side-loaded text as a sample entry', () => {
            expect(getTextFormat('application/ttml+xml;codecs="im1t"', 'application/ttml+xml')).to.equal(Constants.TTML);
            expect(getTextFormat('text/vtt;codecs="undefined"', 'text/vtt')).to.equal(Constants.WVTT);
        });
    });

    describe('isTextCodecSupported', () => {

        it('should accept ISOBMFF text with a known sample entry', () => {
            expect(isTextCodecSupported('application/mp4;codecs="stpp"')).to.be.true;
            expect(isTextCodecSupported('application/mp4;codecs="stpp.ttml.im1t"')).to.be.true;
            expect(isTextCodecSupported('application/mp4;codecs="wvtt"')).to.be.true;
        });

        it('should reject ISOBMFF text with an unknown sample entry', () => {
            expect(isTextCodecSupported('application/mp4;codecs="stpc"')).to.be.false;
            expect(isTextCodecSupported('application/mp4;codecs="wvtc"')).to.be.false;
        });

        it('should accept text that names no sample entry', () => {
            expect(isTextCodecSupported('application/mp4;codecs="undefined"')).to.be.true;
            expect(isTextCodecSupported('text/vtt;codecs="undefined"')).to.be.true;
            expect(isTextCodecSupported('application/ttml+xml;codecs="im1t"')).to.be.true;
        });
    });
});
