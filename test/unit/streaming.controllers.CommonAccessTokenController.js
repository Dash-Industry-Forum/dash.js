import {expect} from 'chai';
import CommonAccessTokenController from '../../src/streaming/controllers/CommonAccessTokenController.js';
import Constants from '../../src/streaming/constants/Constants.js'

describe('CommonAccessTokenController', () => {

    let commonAccessTokenController;

    beforeEach(() => {
        commonAccessTokenController = CommonAccessTokenController({}).getInstance();
    })

    it('getCommonAccessTokenForUrl should return null if no url is provided', () => {
        expect(commonAccessTokenController.getCommonAccessTokenForUrl()).to.be.null
    })

    it('getCommonAccessTokenForUrl should return null if no value was added', () => {
        const url = 'http://someurl.com'
        expect(commonAccessTokenController.getCommonAccessTokenForUrl(url)).to.be.null
    })

    it('getCommonAccessTokenForUrl should return null if the added response does not contain the right header', () => {
        const httpResponse = {
            headers: {
                'someheader': 'someheadervalue'
            },
            request: {
                url: 'http://someurl.com'
            }
        }
        commonAccessTokenController.processResponseHeaders(httpResponse);
        expect(commonAccessTokenController.getCommonAccessTokenForUrl(httpResponse.request.url)).to.be.null
    })

    it('getCommonAccessTokenForUrl should return a CAT if the added response does contain the right header', () => {
        const httpResponse = {
            request: {
                url: 'http://someurl.com'
            }
        }
        httpResponse.headers = {};
        httpResponse.headers[Constants.COMMON_ACCESS_TOKEN_HEADER] = 'cat';
        commonAccessTokenController.processResponseHeaders(httpResponse);
        expect(commonAccessTokenController.getCommonAccessTokenForUrl(httpResponse.request.url)).to.be.equal('cat')
    })
})
