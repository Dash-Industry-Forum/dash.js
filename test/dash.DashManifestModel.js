import DashManifestModel from '../src/dash/models/DashManifestModel';
import BaseURL from '../src/dash/vo/BaseURL';

const expect = require('chai').expect;

const context = {};
const dashManifestModel = DashManifestModel(context).getInstance();

const TEST_URL = 'http://www.example.com/';
const RELATIVE_TEST_URL = './';
const SERVICE_LOCATION = 'testServiceLocation';

describe('DashManifestModel', function () {

    it('should return true when getIsDVB is called and manifest contains a valid DVB profile', () => {
        const manifest = {
            profiles: 'urn:dvb:dash:profile:dvb-dash:2014,urn:dvb:dash:profile:dvb-dash:isoff-ext-live:2014'
        };

        const isDVB = dashManifestModel.getIsDVB(manifest);

        expect(isDVB).to.be.true; // jshint ignore:line
    });

    it('should return false when getIsDVB is called and manifest does not contain a valid DVB profile', () => {
        const manifest = {
            profiles: 'urn:mpeg:dash:profile:isoff-on-demand:2011, http://dashif.org/guildelines/dash264'
        };

        const isDVB = dashManifestModel.getIsDVB(manifest);

        expect(isDVB).to.be.false; // jshint ignore:line
    });

    it('should return true when getIsOnDemand is called and manifest contains the on-demand profile', () => {
        const manifest = {
            profiles: 'urn:dvb:dash:profile:dvb-dash:2014,urn:mpeg:dash:profile:isoff-on-demand:2011'
        };

        const isOnDemand = dashManifestModel.getIsOnDemand(manifest);

        expect(isOnDemand).to.be.true; // jshint ignore:line
    });

    it('should return NaN when minimumUpdatePeriod is not present in manifest', () => {
        const manifest = {};
        const updatePeriod = dashManifestModel.getManifestUpdatePeriod(manifest);
        expect(updatePeriod).to.be.NaN; // jshint ignore:line
    });

    it('should return valid value when minimumUpdatePeriod is present in manifest and latencyOfLastUpdate is defined', () => {
        const minimumUpdatePeriod = 30;
        const latencyOfLastUpdate = 0.5;
        const manifest = { minimumUpdatePeriod:minimumUpdatePeriod };
        const expectedResult = minimumUpdatePeriod - latencyOfLastUpdate;
        const updatePeriod = dashManifestModel.getManifestUpdatePeriod(manifest, latencyOfLastUpdate);
        expect(updatePeriod).to.equal(expectedResult); // jshint ignore:line
    });

    it('should return valid value when minimumUpdatePeriod is present in manifest and latencyOfLastUpdate is not defined', () => {
        const minimumUpdatePeriod = 30;
        const manifest = { minimumUpdatePeriod:minimumUpdatePeriod };
        const expectedResult = minimumUpdatePeriod
        const updatePeriod = dashManifestModel.getManifestUpdatePeriod(manifest);
        expect(updatePeriod).to.equal(expectedResult); // jshint ignore:line
    });

    describe('getBaseUrlsFromElement', () => {
        it('returns an empty Array when no BaseURLs or baseUri are present on a node', () => {
            const node = {};

            const obj = dashManifestModel.getBaseURLsFromElement(node);

            expect(obj).to.be.instanceOf(Array);    // jshint ignore:line
            expect(obj).to.be.empty;                // jshint ignore:line

        });

        it('returns an Array of BaseURLs when no BaseURLs are present on a node, but there is a baseUri', () => {
            const node = {
                baseUri: TEST_URL
            };

            const obj = dashManifestModel.getBaseURLsFromElement(node);

            expect(obj).to.be.instanceOf(Array);        // jshint ignore:line
            expect(obj).to.have.lengthOf(1);            // jshint ignore:line
            expect(obj[0]).to.be.instanceOf(BaseURL);   // jshint ignore:line
            expect(obj[0].url).to.equal(TEST_URL);      // jshint ignore:line
        });

        it('returns an Array of BaseURLs with BaseURL[0] serviceLocation set to URL when no serviceLocation was specified', () => {
            const node = {
                BaseURL_asArray: [{
                    __text: TEST_URL
                }]
            };

            const obj = dashManifestModel.getBaseURLsFromElement(node);

            expect(obj).to.be.instanceOf(Array);                // jshint ignore:line
            expect(obj).to.have.lengthOf(1);                    // jshint ignore:line
            expect(obj[0]).to.be.instanceOf(BaseURL);           // jshint ignore:line
            expect(obj[0].url).to.equal(TEST_URL);              // jshint ignore:line
            expect(obj[0].serviceLocation).to.equal(TEST_URL);  // jshint ignore:line
        });

        it('returns an Array of BaseURLs with length 1 when multiple relative BaseUrls were specified', () => {
            const node = {
                BaseURL_asArray: [
                    {
                        __text: RELATIVE_TEST_URL + '0'
                    },
                    {
                        __text: RELATIVE_TEST_URL + '1'
                    }
                ]
            };

            const obj = dashManifestModel.getBaseURLsFromElement(node);

            expect(obj).to.be.instanceOf(Array);                    // jshint ignore:line
            expect(obj).to.have.lengthOf(1);                        // jshint ignore:line
            expect(obj[0]).to.be.instanceOf(BaseURL);               // jshint ignore:line
            expect(obj[0].url).to.equal(RELATIVE_TEST_URL + '0');   // jshint ignore:line
        });

        it('returns an Array of BaseURLs when multiple BaseUrls were specified', () => {
            const node = {
                BaseURL_asArray: [
                    {
                        __text: TEST_URL + '0'
                    },
                    {
                        __text: TEST_URL + '1'
                    }
                ]
            };

            const obj = dashManifestModel.getBaseURLsFromElement(node);

            expect(obj).to.be.instanceOf(Array);        // jshint ignore:line
            expect(obj).to.have.lengthOf(2);            // jshint ignore:line
            obj.forEach((o, i) => {
                expect(o).to.be.instanceOf(BaseURL);    // jshint ignore:line
                expect(o.url).to.equal(TEST_URL + i);   // jshint ignore:line
            });
        });

        it('returns an Array of BaseURLs with BaseURL[0] serviceLocation set when serviceLocation was specified', () => {
            const node = {
                BaseURL_asArray: [{
                    __text: TEST_URL,
                    serviceLocation: SERVICE_LOCATION
                }]
            };

            const obj = dashManifestModel.getBaseURLsFromElement(node);

            expect(obj).to.be.instanceOf(Array);                        // jshint ignore:line
            expect(obj).to.have.lengthOf(1);                            // jshint ignore:line
            expect(obj[0]).to.be.instanceOf(BaseURL);                   // jshint ignore:line
            expect(obj[0].url).to.equal(TEST_URL);                      // jshint ignore:line
            expect(obj[0].serviceLocation).to.equal(SERVICE_LOCATION);  // jshint ignore:line
        });

        it('returns an Array of BaseURLs with BaseURL[0] having correct defaults for DVB extensions when not specified', () => {
            const node = {
                BaseURL_asArray: [{
                    __text: TEST_URL
                }]
            };

            const obj = dashManifestModel.getBaseURLsFromElement(node);

            expect(obj).to.be.instanceOf(Array);                                // jshint ignore:line
            expect(obj).to.have.lengthOf(1);                                    // jshint ignore:line
            expect(obj[0].dvb_priority).to.equal(BaseURL.DEFAULT_DVB_PRIORITY); // jshint ignore:line
            expect(obj[0].dvb_weight).to.equal(BaseURL.DEFAULT_DVB_WEIGHT);     // jshint ignore:line
        });

        it('returns an Array of BaseURLs with BaseURL[0] having correct priority and weight for DVB extensions when specified', () => {
            const TEST_PRIORITY = 3;
            const TEST_WEIGHT = 2;
            const node = {
                BaseURL_asArray: [{
                    __text:         TEST_URL,
                    'dvb:priority': TEST_PRIORITY,
                    'dvb:weight':   TEST_WEIGHT
                }]
            };

            const obj = dashManifestModel.getBaseURLsFromElement(node);

            expect(obj).to.be.instanceOf(Array);                                // jshint ignore:line
            expect(obj).to.have.lengthOf(1);                                    // jshint ignore:line
            expect(obj[0].dvb_priority).to.equal(TEST_PRIORITY);                // jshint ignore:line
            expect(obj[0].dvb_weight).to.equal(TEST_WEIGHT);                    // jshint ignore:line
        });

        it('returns an Array of BaseURLs with BaseURL[0] resolved to the document base uri when the base uri is specified and the input url is relative', () => {
            const node = {
                baseUri: TEST_URL,
                BaseURL_asArray: [{
                    __text: RELATIVE_TEST_URL
                }]
            };

            const obj = dashManifestModel.getBaseURLsFromElement(node);

            expect(obj).to.be.instanceOf(Array);                                // jshint ignore:line
            expect(obj).to.have.lengthOf(1);                                    // jshint ignore:line
            expect(obj[0].url).to.equal(TEST_URL + RELATIVE_TEST_URL);          // jshint ignore:line
        });

        it('returns an Array of BaseURLs with BaseURL[0] ignoring the document base uri when the base uri is specified and the input url is absolute', () => {
            const node = {
                baseUri: TEST_URL,
                BaseURL_asArray: [{
                    __text: TEST_URL
                }]
            };

            const obj = dashManifestModel.getBaseURLsFromElement(node);

            expect(obj).to.be.instanceOf(Array);                                // jshint ignore:line
            expect(obj).to.have.lengthOf(1);                                    // jshint ignore:line
            expect(obj[0].url).to.equal(TEST_URL);                              // jshint ignore:line
        });

        it('returns an Array of BaseURLs with BaseURL[0] resolved to the document base uri when the base uri is specified but no other urls', () => {
            const node = {
                baseUri: TEST_URL
            };

            const obj = dashManifestModel.getBaseURLsFromElement(node);

            expect(obj).to.be.instanceOf(Array);                                // jshint ignore:line
            expect(obj).to.have.lengthOf(1);                                    // jshint ignore:line
            expect(obj[0].url).to.equal(TEST_URL);                              // jshint ignore:line
        });
    });
});
