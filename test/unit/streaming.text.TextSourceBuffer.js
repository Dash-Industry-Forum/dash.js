import TextSourceBuffer from '../../src/streaming/text/TextSourceBuffer.js';
import TTMLParser from '../../src/streaming/utils/TTMLParser.js';
import Errors from '../../src/core/errors/Errors.js';
import ErrorHandlerMock from './mocks/ErrorHandlerMock.js';
import AdapterMock from './mocks/AdapterMock.js';

import chai from 'chai';

const expect = chai.expect;

const context = {};
const adapterMock = new AdapterMock();
const errorHandlerMock = new ErrorHandlerMock();
const ttmlParser = TTMLParser(context).getInstance();

describe('TextSourceBuffer', function () {

    let textSourceBuffer = TextSourceBuffer(context).create({
        adapter: adapterMock,
        errHandler: errorHandlerMock,
        ttmlParser: ttmlParser
    });

    it('call to append function with invalid tttml data should triggered a parse error', function () {
        const buffer = new ArrayBuffer(8);
        textSourceBuffer.append(buffer, {
            representation: {
                mediaInfo: {
                    type: 'text',
                    mimeType: 'application/ttml+xml',
                    codec: 'application/ttml+xml;codecs=\'undefined\''
                }
            }
        });
        expect(errorHandlerMock.errorCode).to.equal(Errors.TIMED_TEXT_ERROR_ID_PARSE_CODE);
    });
});
