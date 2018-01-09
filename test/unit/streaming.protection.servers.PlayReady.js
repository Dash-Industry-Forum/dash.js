import PlayReady from '../../src/streaming/protection/servers/PlayReady';

const expect = require('chai').expect;
const fs = require('fs');
const jsdom = require('jsdom').JSDOM;

describe('PlayReady', function () {

    let licenseServerData;
    const context = {};

    it('PlayReady should exist', () => {
        expect(PlayReady).to.exist; // jshint ignore:line
    });

    describe('Response', function () {
        beforeEach(function () {
            if (typeof window === 'undefined') {
                global.window = {
                    DOMParser: new jsdom().window.DOMParser
                };
            }
            licenseServerData = PlayReady(context).getInstance();
        });

        afterEach(function () {
            delete global.window;
            licenseServerData = null;
        });

        it('should return the SOAP licenser response message', function (done) {
            fs.readFile(__dirname + '/data/licence/playreadySoapOKLicence.txt', function (err, buf) {
                const response = licenseServerData.getLicenseMessage(buf);
                expect(response).to.be.equal(buf);
                delete global.window;
                done();
            });
        });

        it('should return an error object from the SOAP licenser error messsage', function (done) {
            fs.readFile(__dirname + '/data/licence/playreadySoapErrorLicence.txt', function (err, buf) {
                const response = licenseServerData.getErrorResponse(buf);
                expect(response).to.be.equal('code: 0x8004C600, name: PFS_LICENSE_CREATION_FAILURE, message: Problème lors de l\'acquisition de la licence. Merci de réessayer ultérieurement.');
                delete global.window;
                done();
            });
        });

        it('should return the response unchanged when the SOAP licenser response is incorrect', function (done) {
            fs.readFile(__dirname + '/data/licence/playreadyInvalidLicence.txt', function (err, buf) {
                const response = licenseServerData.getLicenseMessage(buf);
                expect(response).to.be.equal(buf);
                delete global.window;
                done();
            });
        });
    });

});
