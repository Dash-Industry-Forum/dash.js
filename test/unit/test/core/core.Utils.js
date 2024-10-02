import Utils from '../../../../src/core/Utils.js'
import {expect} from 'chai';
import {Constants} from '../../../../index.js';

describe('Utils', () => {
    describe('getRelativeUrl', () => {

        it('Should return complete url if no original url is given', () => {
            const b = 'https://localhost:3000/d/e/f.mp4';

            expect(Utils.getRelativeUrl(undefined, b)).to.be.equal('https://localhost:3000/d/e/f.mp4');
        })

        it('Should return relative url if strings are different after server name', () => {
            const a = 'https://localhost:3000/a/b/c.mp4';
            const b = 'https://localhost:3000/d/e/f.mp4';

            expect(Utils.getRelativeUrl(a, b)).to.be.equal('/d/e/f.mp4');
        })

        it('Should return relative url if strings are similar up to one element before filename', () => {
            const a = 'https://localhost:3000/a/b/c.mp4';
            const b = 'https://localhost:3000/a/c/f.mp4';

            expect(Utils.getRelativeUrl(a, b)).to.be.equal('../c/f.mp4');
        })

        it('Should return relative url if strings are similar up to filename', () => {
            const a = 'https://localhost:3000/a/b/c.mp4';
            const b = 'https://localhost:3000/a/b/f.mp4';

            expect(Utils.getRelativeUrl(a, b)).to.be.equal('f.mp4');
        })

        it('Should return complete url if origin is different', () => {
            const a = 'https://localhost:3000/a/b/c.mp4';
            const b = 'https://loca:3000/a/b/f.mp4';

            expect(Utils.getRelativeUrl(a, b)).to.be.equal('https://loca:3000/a/b/f.mp4');
        })

        it('Should return filename if origin differs in terms of SSL', () => {
            const a = 'https://localhost:3000/a/b/c.mp4';
            const b = 'http://localhost:3000/a/b/e.mp4';

            expect(Utils.getRelativeUrl(a, b)).to.be.equal('e.mp4');
        })

        it('Should return relative url if part of the pathnames are not equal', () => {
            const a = 'https://localhost:3000/a/b/c.mp4';
            const b = 'https://localhost:3000/ab/b/f.mp4';

            expect(Utils.getRelativeUrl(a, b)).to.be.equal('/ab/b/f.mp4');
        })

        it('Should return relative url if target pathname is longer than source pathname ', () => {
            const a = 'https://localhost:3000/a/b/f.mp4';
            const b = 'https://localhost:3000/a/b/f/e/c.mp4';

            expect(Utils.getRelativeUrl(a, b)).to.be.equal('f/e/c.mp4');
        })

        it('Should return relative url if source pathname is longer than target pathname ', () => {
            const a = 'https://localhost:3000/a/b/f/e/c.mp4';
            const b = 'https://localhost:3000/a/b/f.mp4';

            expect(Utils.getRelativeUrl(a, b)).to.be.equal('/a/b/f.mp4');
        })

        it('Should return relative url if source contains slash in the end ', () => {
            const a = 'https://localhost:3000/a/';
            const b = 'https://localhost:3000/a/b.mp4';

            expect(Utils.getRelativeUrl(a, b)).to.be.equal('b.mp4');
        })

        it('Should return relative url if source pathnames are exceptionally long ', () => {
            const a = 'https://localhost:3000/a/b/c/d/e/f/g/h/1.mp4';
            const b = 'https://localhost:3000/a/b/c/d/e/change/i/j/k/l/m/n/2.mp4';

            expect(Utils.getRelativeUrl(a, b)).to.be.equal('../../../change/i/j/k/l/m/n/2.mp4');
        })

        it('Should return relative url if source contains slash in the end and multiple elements in the path', () => {
            const a = 'https://localhost:3000/a/b/c/';
            const b = 'https://localhost:3000/a/b/x/c.mp4';

            expect(Utils.getRelativeUrl(a, b)).to.be.equal('../x/c.mp4');
        })
    })

    describe('parseHttpHeaders', () => {

        it('Should handle null header', () => {
            expect(Utils.parseHttpHeaders(null)).to.be.empty;
        })
    })

    describe('stringHasProtocol', () => {

        it('Should return true for valid http url', () => {
            expect(Utils.stringHasProtocol('http://dash.akamaized.net')).to.be.true;
        })

        it('Should return true for valid https url', () => {
            expect(Utils.stringHasProtocol('https://dash.akamaized.net')).to.be.true;
        })

        it('Should return false if url has no protocol', () => {
            expect(Utils.stringHasProtocol('dash.akamaized.net')).to.be.false;
        })
    })

    describe('addAditionalQueryParameterToUrl', () => {

        it('Should escape URL with whitespaces correctly', () => {
            const url = 'https://dash.akamaized.net/akamai/bbb_30fps/bbb_30fps.mpd?a=something with spaces';
            const modifiedUrl = Utils.addAditionalQueryParameterToUrl(url, [{ key: 'test', value: 'testvalue' }]);
            expect(modifiedUrl).to.be.equal('https://dash.akamaized.net/akamai/bbb_30fps/bbb_30fps.mpd?a=something with spaces&test=testvalue');
        })

        it('Should escape URL with CMCD parameters correctly', () => {
            const params = [{
                key: 'CMCD',
                value: 'bl=4000,br=14932,d=4000,dl=4000,mtp=84100,nor="bbb_30fps_3840x2160_12000k_3.m4v",ot=v,rtp=74700,sf=d,sid="4dba0bf4-e517-4b7c-b34a-d1a75206cd53",st=v,tb=14932'
            }];
            const url = 'https://dash.akamaized.net/akamai/bbb_30fps/bbb_30fps.mpd?a=something with spaces';
            const modifiedUrl = Utils.addAditionalQueryParameterToUrl(url, params);
            expect(modifiedUrl).to.be.equal('https://dash.akamaized.net/akamai/bbb_30fps/bbb_30fps.mpd?a=something with spaces&CMCD=bl%3D4000%2Cbr%3D14932%2Cd%3D4000%2Cdl%3D4000%2Cmtp%3D84100%2Cnor%3D%22bbb_30fps_3840x2160_12000k_3.m4v%22%2Cot%3Dv%2Crtp%3D74700%2Csf%3Dd%2Csid%3D%224dba0bf4-e517-4b7c-b34a-d1a75206cd53%22%2Cst%3Dv%2Ctb%3D14932');
        })

        it('Should return the original URL if no query parameters are provided', () => {
            const url = 'https://dash.akamaized.net/akamai/bbb_30fps/bbb_30fps.mpd?a=something with spaces';
            const modifiedUrl = Utils.addAditionalQueryParameterToUrl(url);
            expect(modifiedUrl).to.be.equal('https://dash.akamaized.net/akamai/bbb_30fps/bbb_30fps.mpd?a=something with spaces');
        })

        it('Should not change capitalization of existing query parameters', () => {
            const url = 'https://dash.akamaized.net/akamai/bbb_30fps/bbb_30fps.mpd?a=%3d';
            const params = [{
                key: 'CMCD',
                value: 'bl=4000,br=14932,d=4000,dl=4000,mtp=84100,nor="bbb_30fps_3840x2160_12000k_3.m4v",ot=v,rtp=74700,sf=d,sid="4dba0bf4-e517-4b7c-b34a-d1a75206cd53",st=v,tb=14932'
            }];
            const modifiedUrl = Utils.addAditionalQueryParameterToUrl(url, params);
            expect(modifiedUrl).to.be.equal('https://dash.akamaized.net/akamai/bbb_30fps/bbb_30fps.mpd?a=%3d&CMCD=bl%3D4000%2Cbr%3D14932%2Cd%3D4000%2Cdl%3D4000%2Cmtp%3D84100%2Cnor%3D%22bbb_30fps_3840x2160_12000k_3.m4v%22%2Cot%3Dv%2Crtp%3D74700%2Csf%3Dd%2Csid%3D%224dba0bf4-e517-4b7c-b34a-d1a75206cd53%22%2Cst%3Dv%2Ctb%3D14932');

        })
    })

    describe('getHostFromUrl', () => {

        it('Should return a valid host for an http URL', () => {
            expect(Utils.getHostFromUrl('http://dash.akamaized.net')).to.be.equal('dash.akamaized.net');
        })

        it('Should return a valid host for an http URL', () => {
            expect(Utils.getHostFromUrl('https://dash.akamaized.net')).to.be.equal('dash.akamaized.net');
        })
    })

    describe('getCodecFamily', () => {

        it('should return AAC codec family', () => {
            expect(Utils.getCodecFamily('mp4a.40.2')).to.be.equal(Constants.CODEC_FAMILIES.AAC);
        })

        it('should return default base for unknown family', () => {
            expect(Utils.getCodecFamily('vp09.00.10.08.00.02.02.02.00')).to.be.equal('vp09');
        })
    })
})
