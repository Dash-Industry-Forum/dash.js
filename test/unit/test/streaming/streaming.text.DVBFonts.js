import DVBFonts from '../../../../src/streaming/text/DVBFonts.js';
import BaseURLControllerMock from '../../mocks/BaseURLControllerMock.js';
import AdapterMock from '../../mocks/AdapterMock.js';
import MediaPlayerEvents from '../../../../src/streaming/MediaPlayerEvents.js';
import EventBus from '../../../../src/core/EventBus.js';

import {expect} from 'chai';
import chai from 'chai';
import spies from 'chai-spies';

chai.use(spies);

const context = {};
const eventBus = EventBus(context).getInstance();


const mockNoFontsTracks = [{
    codec: 'application/mp4;codecs="stpp.ttml.etd1|im1t"',
    id: 888,
    index: 5,
    supplementalProperties: [],
    essentialProperties: []
}];
const mockSupplementalDownloadTracks = [
    {
        codec: 'application/mp4;codecs="stpp.ttml.etd1|im1t"',
        id: 888,
        index: 5,
        supplementalProperties: [
            {
                dvbFontFamily: 'UnitTestFont',
                dvbMimeType: 'application/font-sfnt',
                dvbUrl: 'https://notARealUrl/fonts/unitTestFont.otf',
                id: null,
                schemeIdUri: 'urn:dvb:dash:fontdownload:2014',
                value: '1'
            },
        ],
        essentialProperties: [],
    }
];
const mockEssentialDownloadTracks = [
    {
        codec: 'application/mp4;codecs="stpp.ttml.etd1|im1t"',
        id: 887,
        index: 10,
        supplementalProperties: [],
        essentialProperties: [
            {
                dvbFontFamily: 'UnitTestFont2',
                dvbMimeType: 'application/font-woff',
                dvbUrl: 'https://notARealUrl/fonts/unitTestFont2.woff',
                id: null,
                schemeIdUri: 'urn:dvb:dash:fontdownload:2014',
                value: '1'
            }
        ]
    }
];
const mockBothDownloadTracks = [
    {
        codec: 'application/mp4;codecs="stpp.ttml.etd1|im1t"',
        id: 888,
        index: 5,
        supplementalProperties: [
            {
                dvbFontFamily: 'UnitTestFont',
                dvbMimeType: 'application/font-woff',
                dvbUrl: 'https://notARealUrl/fonts/unitTestFont.woff',
                id: null,
                schemeIdUri: 'urn:dvb:dash:fontdownload:2014',
                value: '1'
            }
        ],
        essentialProperties: [
            {
                dvbFontFamily: 'UnitTestFont2',
                dvbMimeType: 'application/font-woff',
                dvbUrl: 'https://notARealUrl/fonts/unitTestFont2.woff',
                id: null,
                schemeIdUri: 'urn:dvb:dash:fontdownload:2014',
                value: '1'
            }
        ]
    }
];
const combinedTracks = mockSupplementalDownloadTracks.concat(mockEssentialDownloadTracks);

describe('DVBFonts', function () {

    let dashAdapterMock = new AdapterMock();
    let baseURLControllerMock = new BaseURLControllerMock();
    let dvbFonts;

    beforeEach(function () {
        dvbFonts = DVBFonts(context).create({
            baseURLController: baseURLControllerMock,
            adapter: dashAdapterMock,
        });

    });

    afterEach(function () {
        dvbFonts.reset();
    });

    describe('addFontsFromTracks()', () => {
        it('does not attempt to add fonts if no tracks', () => {
            dvbFonts.addFontsFromTracks(null, 'id');
            const currentFonts = dvbFonts.getFonts();
            expect(currentFonts).to.be.instanceOf(Array);
            expect(currentFonts).to.be.empty;
        });

        it('does not add fonts if none are present on tracks', () => {
            dvbFonts.addFontsFromTracks(mockNoFontsTracks, 'id');
            const currentFonts = dvbFonts.getFonts();
            expect(currentFonts).to.be.instanceOf(Array);
            expect(currentFonts).to.be.empty;
        });

        it('should add a font from a supplemental property descriptor', () => {
            dvbFonts.addFontsFromTracks(mockSupplementalDownloadTracks, 'id');
            const currentFonts = dvbFonts.getFonts();
            expect(currentFonts).to.be.instanceOf(Array);
            expect(currentFonts.length).to.equal(1);
            expect(currentFonts[0].trackId).to.equal(888);
            expect(currentFonts[0].status).to.equal('unloaded');
        });

        it('should add a font from a essential property descriptor', () => {
            dvbFonts.addFontsFromTracks(mockEssentialDownloadTracks, 'id');
            const currentFonts = dvbFonts.getFonts();
            expect(currentFonts).to.be.instanceOf(Array);
            expect(currentFonts.length).to.equal(1);
            expect(currentFonts[0].trackId).to.equal(887);
        });

        it('should prioritise essential property descriptors', () => {
            dvbFonts.addFontsFromTracks(mockBothDownloadTracks, 'id');
            const currentFonts = dvbFonts.getFonts();
            expect(currentFonts).to.be.instanceOf(Array);
            expect(currentFonts.length).to.equal(1);
            expect(currentFonts[0].trackId).to.equal(888);
            expect(currentFonts[0].url).to.equal('https://notARealUrl/fonts/unitTestFont2.woff');
        });

    });

    describe('downloadFonts()', () => {

        it('should trigger font added event', () => {
            let spy = chai.spy();
            eventBus.on(MediaPlayerEvents.DVB_FONT_DOWNLOAD_ADDED, spy);
            dvbFonts.addFontsFromTracks(mockSupplementalDownloadTracks, 'id');
            dvbFonts.downloadFonts();
            expect(spy).to.have.been.called.exactly(1);
            eventBus.off(MediaPlayerEvents.DVB_FONT_DOWNLOAD_ADDED, spy);
        });

    });

    describe('getFonts()', () => {

        it('should return entire font list', () => {
            dvbFonts.addFontsFromTracks(combinedTracks, 'id');
            const currentFonts = dvbFonts.getFonts();
            expect(currentFonts).to.be.instanceOf(Array);
            expect(currentFonts.length).to.equal(2);
        });
    });

    describe('getFontsForTrackId()', () => {

        it('should return fonts associated with a matching trackId', () => {
            dvbFonts.addFontsFromTracks(combinedTracks, 'id');
            const trackFonts = dvbFonts.getFontsForTrackId(887);
            expect(trackFonts[0].url).to.equal('https://notARealUrl/fonts/unitTestFont2.woff');
        });

        it('should return an empty array if no fonts match the trackId', () => {
            dvbFonts.addFontsFromTracks(combinedTracks, 'id');
            const trackFonts = dvbFonts.getFontsForTrackId(123);
            expect(trackFonts).to.be.instanceOf(Array);
            expect(trackFonts.length).to.equal(0);
        });
    });

    describe('reset()', () => {

        it('should correctly reset the list of fonts', () => {
            // resets after each test
            const currentFonts = dvbFonts.getFonts();
            expect(currentFonts).to.be.instanceOf(Array);
            expect(currentFonts.length).to.equal(0);
        });

    });

});
