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

        it('should return true for a path-absolute url', () => {
            const pathAbsoluteUrl = '/path/to/some/file';

            const result = urlUtils.isRelative(pathAbsoluteUrl);

            expect(result).to.be.true; // jshint ignore:line
        });

        it('should return true for a protocol-relative url', () => {
            const protocolRelativeUrl = '//path/to/some/file';

            const result = urlUtils.isRelative(protocolRelativeUrl);

            expect(result).to.be.true; // jshint ignore:line
        });
    });

    describe('isSchemeRelative', () => {
        it('should return false for a non-scheme-relative url', () => {
            const absoluteUrl = 'https://www.example.com';

            const result = urlUtils.isSchemeRelative(absoluteUrl);

            expect(result).to.be.false; // jshint ignore:line
        });

        it('should return true for a protocol-relative url', () => {
            const protocolRelativeUrl = '//path/to/some/file';

            const result = urlUtils.isSchemeRelative(protocolRelativeUrl);

            expect(result).to.be.true; // jshint ignore:line
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
            const baseUrl = 'http://www.example.com/blah/something/or/another/';
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

        it('should return the base url if scheme-relative and origin only', () => {
            const baseUrl = '//www.example.com/';
            const relative = 'example.html';
            const url = baseUrl + relative;

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

        it('should return the original url if scheme and origin only', () => {
            const baseUrl = 'http://www.example.com';

            const result = urlUtils.parseOrigin(baseUrl);

            expect(result).to.equal(baseUrl); // jshint ignore:line
        });

        it('should return an empty string if url is scheme-relative', () => {
            const baseUrl = '//www.example.com';

            const result = urlUtils.parseOrigin(baseUrl);

            expect(result).to.be.empty; // jshint ignore:line
        });

        it('should return an empty string if argument is not a url', () => {
            const arg = 'skjdlkasdhflkhasdlkfhl';

            const result = urlUtils.parseOrigin(arg);

            expect(result).to.be.empty; // jshint ignore:line
        });
    });

    describe('parseScheme', () => {
        it('should return the scheme of a valid url', () => {
            const origin = '//www.example.com';
            const scheme = 'http:';

            const result = urlUtils.parseScheme(scheme + origin);

            expect(result).to.equal(scheme); // jshint ignore:line
        });

        it('should return an empty string if url is scheme-relative', () => {
            const baseUrl = '//www.example.com';

            const result = urlUtils.parseOrigin(baseUrl);

            expect(result).to.be.empty; // jshint ignore:line
        });

        it('should return an empty string if argument is not a url', () => {
            const arg = 'skjdlkasdhflkhasdlkfhl';

            const result = urlUtils.parseOrigin(arg);

            expect(result).to.be.empty; // jshint ignore:line
        });
    });

    describe('resolve (fallback path)', () => {
        it('should resolve a baseurl and relative url', () => {
            const baseUrl = 'http://www.example.com/path/index.html';
            const url = 'MPDs/example.mpd';
            const expected = 'http://www.example.com/path/MPDs/example.mpd';

            const result = urlUtils.resolve(url, baseUrl);

            expect(result).to.equal(expected); // jshint ignore:line
        });

        it('should resolve a baseurl and path absolute url', () => {
            const baseUrl = 'http://www.example.com/path/index.html';
            const url = '/MPDs/example.mpd';
            const expected = 'http://www.example.com/MPDs/example.mpd';

            const result = urlUtils.resolve(url, baseUrl);

            expect(result).to.equal(expected); // jshint ignore:line
        });

        it('should just return url if absolute', () => {
            const baseUrl = 'http://www.example.com/path/index.html';
            const absoluteUrl = 'http://www.anotherexample.com/path/index.html';

            const result = urlUtils.resolve(absoluteUrl, baseUrl);

            expect(result).to.equal(absoluteUrl); // jshint ignore:line
        });

        it('should resolve a baseurl with no slash and relative url', () => {
            const baseUrl = 'http://www.example.com';
            const url = 'MPDs/example.mpd';
            const expected = 'http://www.example.com/MPDs/example.mpd';

            const result = urlUtils.resolve(url, baseUrl);

            expect(result).to.equal(expected); // jshint ignore:line
        });

        it('should return url if baseurl is undefined', () => {
            const url = 'MPDs/example.mpd';

            const result = urlUtils.resolve(url);

            expect(result).to.equal(url); // jshint ignore:line
        });

        it('should resolve a baseurl and scheme-relative url', () => {
            const baseUrl = 'https://www.example.com';
            const url = '//www.anotherexample.com/example.mpd';
            const expected = 'https://www.anotherexample.com/example.mpd';

            const result = urlUtils.resolve(url, baseUrl);

            expect(result).to.equal(expected); // jshint ignore:line
        });
    });

    describe('resolve (native path)', () => {

        if (typeof window === 'undefined') {
            global.window = {
                URL: (a, b) => {
                    if (!a || !b) {
                        throw new Error();
                    }

                    return {
                        toString: () => {
                            return b + a;
                        }
                    };
                }
            };
        }

        // new instance on new context to pick up window.URL
        const instance = URLUtils({}).getInstance();

        it('should return url when baseurl is invalid', () => {
            const url = 'test/index.html';
            const result = instance.resolve(url);

            expect(result).to.equal(url); // jshint ignore:line
        });

        it('should resolve correctly when input is valid', () => {
            const baseUrl = 'http://www.example.com/';
            const url = 'MPDs/example.mpd';
            const expected = baseUrl + url;

            const result = instance.resolve(url, baseUrl);

            expect(result).to.equal(expected); // jshint ignore:line
        });
    });
});
