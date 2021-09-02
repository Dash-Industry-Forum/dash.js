import Utils from '../../src/core/Utils'
import {expect} from 'chai';

describe('Utils', () => {
    describe('getRelativeUrl', () => {

        it('Should return complete url if no original url is given', () => {
            const b = 'https://localhost:3000/d/e/f.mp4';

            expect(Utils.getRelativeUrl(undefined,b)).to.be.equal('https://localhost:3000/d/e/f.mp4');
        })

        it('Should return relative url if strings are different after server name', () => {
            const a = 'https://localhost:3000/a/b/c.mp4';
            const b = 'https://localhost:3000/d/e/f.mp4';

            expect(Utils.getRelativeUrl(a,b)).to.be.equal('/d/e/f.mp4');
        })

        it('Should return relative url if strings are similar up to one element before filename', () => {
            const a = 'https://localhost:3000/a/b/c.mp4';
            const b = 'https://localhost:3000/a/c/f.mp4';

            expect(Utils.getRelativeUrl(a,b)).to.be.equal('../c/f.mp4');
        })

        it('Should return relative url if strings are similar up to filename', () => {
            const a = 'https://localhost:3000/a/b/c.mp4';
            const b = 'https://localhost:3000/a/b/f.mp4';

            expect(Utils.getRelativeUrl(a,b)).to.be.equal('f.mp4');
        })

        it('Should return complete url if origin is different', () => {
            const a = 'https://localhost:3000/a/b/c.mp4';
            const b = 'https://loca:3000/a/b/f.mp4';

            expect(Utils.getRelativeUrl(a,b)).to.be.equal('https://loca:3000/a/b/f.mp4');
        })

        it('Should return filename if origin differs in terms of SSL', () => {
            const a = 'https://localhost:3000/a/b/c.mp4';
            const b = 'http://localhost:3000/a/b/e.mp4';

            expect(Utils.getRelativeUrl(a,b)).to.be.equal('e.mp4');
        })

        it('Should return relative url if part of the pathnames are not equal', () => {
            const a = 'https://localhost:3000/a/b/c.mp4';
            const b = 'https://localhost:3000/ab/b/f.mp4';

            expect(Utils.getRelativeUrl(a,b)).to.be.equal('/ab/b/f.mp4');
        })

        it('Should return relative url if target pathname is longer than source pathname ', () => {
            const a = 'https://localhost:3000/a/b/f.mp4';
            const b = 'https://localhost:3000/a/b/f/e/c.mp4';

            expect(Utils.getRelativeUrl(a,b)).to.be.equal('f/e/c.mp4');
        })

        it('Should return relative url if source pathname is longer than target pathname ', () => {
            const a = 'https://localhost:3000/a/b/f/e/c.mp4';
            const b = 'https://localhost:3000/a/b/f.mp4';

            expect(Utils.getRelativeUrl(a,b)).to.be.equal('/a/b/f.mp4');
        })

        it('Should return relative url if source contains slash in the end ', () => {
            const a = 'https://localhost:3000/a/';
            const b = 'https://localhost:3000/a/b.mp4';

            expect(Utils.getRelativeUrl(a,b)).to.be.equal('b.mp4');
        })

        it('Should return relative url if source pathnames are exceptionally long ', () => {
            const a = 'https://localhost:3000/a/b/c/d/e/f/g/h/1.mp4';
            const b = 'https://localhost:3000/a/b/c/d/e/change/i/j/k/l/m/n/2.mp4';

            expect(Utils.getRelativeUrl(a,b)).to.be.equal('../../../change/i/j/k/l/m/n/2.mp4');
        })

        it('Should return relative url if source contains slash in the end and multiple elements in the path', () => {
            const a = 'https://localhost:3000/a/b/c/';
            const b = 'https://localhost:3000/a/b/x/c.mp4';

            expect(Utils.getRelativeUrl(a,b)).to.be.equal('../x/c.mp4');
        })
    })
})
