import TextSourceBuffer from '../../src/streaming/text/TextSourceBuffer';

import StreamControllerMock from './mocks/StreamControllerMock';
import DashManifestModelMock from './mocks/DashManifestModelMock';
import ErrorHandlerMock from './mocks/ErrorHandlerMock';

const chai = require('chai');
const expect = chai.expect;

const context = {};
const streamControllerMock = new StreamControllerMock();
const dashManifestModelMock = new DashManifestModelMock();
const errorHandlerMock = new ErrorHandlerMock();

describe('TextSourceBuffer', function () {

    let textSourceBuffer = TextSourceBuffer(context).getInstance();
    textSourceBuffer.setConfig({streamController: streamControllerMock,
                                dashManifestModel: dashManifestModelMock,
                                errHandler: errorHandlerMock});

    it('call to addEmbeddedTrack function with no mediaInfo parameter should not throw an error', function () {
        expect(textSourceBuffer.addEmbeddedTrack.bind(textSourceBuffer)).to.not.throw();
    });

    it('call to initialize function with no streamProcessor parameter should not throw an error', function () {
        expect(textSourceBuffer.initialize.bind(textSourceBuffer, 'mimeType')).to.not.throw();
    });

    it('call to append function with invalid tttml data should triggered a parse error', function () {
        const buffer = new ArrayBuffer(8);
        textSourceBuffer.append(buffer, {mediaInfo: {type: 'text', mimeType: 'application/ttml+xml', codec: 'application/ttml+xml;codecs=\'undefined\''}});
        expect(errorHandlerMock.error).to.equal('parse');
    });
});