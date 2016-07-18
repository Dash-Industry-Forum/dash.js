import URLUtils from '../src/streaming/utils/URLUtils';

const expect = require('chai').expect;

const context = {};
const urlUtils = URLUtils(context).getInstance();

describe('URLUtils', function () {

    describe('isHTTPURL', () => {
        it('should return true for an url with http scheme', () => {
            const httpUrl = 'http://www.example.com';

            const result = urlUtils.isHTTPURL(httpUrl);

            expect(result).to.be.true; // jshint ignore:line
        });

        it('should return true for an url with https scheme', () => {
            const httpsUrl = 'https://www.example.com';
            const result = urlUtils.isHTTPURL(httpsUrl);

            expect(result).to.be.true; // jshint ignore:line
        });

        it('should return false for a non-HTTP-URL url', () => {
            const ftpUrl = 'ftp://www.example.com';

            const result = urlUtils.isHTTPURL(ftpUrl);

            expect(result).to.be.false; // jshint ignore:line
        });
    });

    describe('isRelative', () => {
        it('should return true for a relative url', () => {
            const relativeUrl = 'path/to/some/file';

            const result = urlUtils.isRelative(relativeUrl);

            expect(result).to.be.true; // jshint ignore:line
        });

        it('should return false for an absolute url', () => {
            const absoluteUrl = 'https://www.example.com';

            const result = urlUtils.isRelative(absoluteUrl);

            expect(result).to.be.false; // jshint ignore:line
        });
    });

    describe('isPathAbsolute', () => {
        it('should return true for a path-absolute url', () => {
            const pathAbsoluteUrl = '/path/to/some/file';

            const result = urlUtils.isPathAbsolute(pathAbsoluteUrl);

            expect(result).to.be.true; // jshint ignore:line
        });

        it('should return false for a relative url', () => {
            const relativeUrl = 'path/to/some/file';

            const result = urlUtils.isPathAbsolute(relativeUrl);

            expect(result).to.be.false; // jshint ignore:line
        });

        it('should return false for an absolute url', () => {
            const absoluteUrl = 'https://www.example.com';

            const result = urlUtils.isPathAbsolute(absoluteUrl);

            expect(result).to.be.false; // jshint ignore:line
        });
    });

    describe('parseBaseUrl', () => {
        it('should return the base url of a valid url', () => {
            const baseUrl = 'http://www.example.com/';
            const pageUrl = 'index.html';
            const url = baseUrl + pageUrl;

            const result = urlUtils.parseBaseUrl(url);

            expect(result).to.equal(baseUrl); // jshint ignore:line
        });

        it('should return the base url if no relative portion', () => {
            const baseUrl = 'http://www.example.com/';

            const result = urlUtils.parseBaseUrl(baseUrl);

            expect(result).to.equal(baseUrl); // jshint ignore:line
        });

        it('should return the base url ignoring any query string', () => {
            const baseUrl = 'http://www.example.com/';
            const pageUrl = 'index.html';
            const queryString = '?hasQueryString=true';
            const url = baseUrl + pageUrl + queryString;

            const result = urlUtils.parseBaseUrl(url);

            expect(result).to.equal(baseUrl); // jshint ignore:line
        });

        it('should return an empty string if argument is not a url', () => {
            const arg = 'skjdlkasdhflkhasdlkfhl';

            const result = urlUtils.parseBaseUrl(arg);

            expect(result).to.be.empty; // jshint ignore:line
        });
    });

    describe('parseOrigin', () => {
        it('should return the scheme and origin url of a valid url', () => {
            const schemeAndOrigin = 'http://www.example.com';
            const pathAbsolute = '/MPDs/index.html';
            const url = schemeAndOrigin + pathAbsolute;

            const result = urlUtils.parseOrigin(url);

            expect(result).to.equal(schemeAndOrigin); // jshint ignore:line
        });

        it('should return the scheme and origin url if no relative portion', () => {
            const baseUrl = 'http://www.example.com';
            const slash = '/';
            const url = baseUrl + slash;

            const result = urlUtils.parseOrigin(url);

            expect(result).to.equal(baseUrl); // jshint ignore:line
        });

        it('should return an empty string if argument is not a url', () => {
            const arg = 'skjdlkasdhflkhasdlkfhl';

            const result = urlUtils.parseOrigin(arg);

            expect(result).to.be.empty; // jshint ignore:line
        });
    });
});
