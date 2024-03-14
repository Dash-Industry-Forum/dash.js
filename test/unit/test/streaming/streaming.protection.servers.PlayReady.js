import PlayReady from '../../../../src/streaming/protection/servers/PlayReady.js';
import FileLoader from '../../helpers/FileLoader.js';
import {expect} from 'chai';

describe('PlayReady', function () {

    let licenseServerData;
    const context = {};

    it('PlayReady should exist', () => {
        expect(PlayReady).to.exist; // jshint ignore:line
    });

    describe('Response', function () {
        beforeEach(function () {
            licenseServerData = PlayReady(context).getInstance();
        });

        afterEach(function () {
            licenseServerData = null;
        });

        it('should return the SOAP licenser response message', async () => {
            const buf = await FileLoader.loadArrayBufferFile('/data/licence/playreadySoapOKLicence.txt')
            const response = licenseServerData.getLicenseMessage(buf);
            expect(response).to.be.equal(buf);
        });

        it('should return an error object from the SOAP licenser error messsage', async () => {
            const buf = await FileLoader.loadArrayBufferFile('/data/licence/playreadySoapErrorLicence.txt')
            const response = licenseServerData.getErrorResponse(buf);
            expect(response).to.be.equal('code: 0x8004C600, name: PFS_LICENSE_CREATION_FAILURE, message: Problème lors de l\'acquisition de la licence. Merci de réessayer ultérieurement.');
        });

        it('should return the response unchanged when the SOAP licenser response is incorrect', async () => {
            const buf = await FileLoader.loadArrayBufferFile('/data/licence/playreadyInvalidLicence.txt')
            const response = licenseServerData.getLicenseMessage(buf);
            expect(response).to.be.equal(buf);
        });
    });

})
;
