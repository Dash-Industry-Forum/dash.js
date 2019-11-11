import ThumbnailController from '../../src/streaming/thumbnail/ThumbnailController';
import ThumbnailTracks from '../../src/streaming/thumbnail/ThumbnailTracks';

import ObjectsHelper from './helpers/ObjectsHelper';
import AdapterMock from './mocks/AdapterMock';
import StreamMock from './mocks/StreamMock';

const expect = require('chai').expect;
const context = {};

const sampleRepresentation = {
    id: 'rep_id',
    segmentInfoType: 'SegmentTemplate',
    bandwidth: 2000,
    width: 3200,
    height: 180,
    startNumber: 1,
    segmentDuration: 100,
    timescale: 1,
    media: 'http://media/$RepresentationID$/$Number$.jpg',
    essentialProperties: [{
        schemeIdUri: 'http://dashif.org/guidelines/thumbnail_tile',
        value: '10x1'
    }]
};

const sampleRepresentation2 = {
    id: 'rep_id',
    segmentInfoType: 'SegmentTemplate',
    bandwidth: 2000,
    width: 1024,
    height: 1152,
    startNumber: 1,
    segmentDuration: 634.566,
    timescale: 1,
    media: 'http://media/$RepresentationID$/$Number$.jpg',
    essentialProperties: [{
        schemeIdUri: 'http://dashif.org/guidelines/thumbnail_tile',
        value: '10x20'
    }]
};

const sampleRepresentation3 = {
    id: 'rep_id',
    segmentInfoType: 'SegmentTemplate',
    bandwidth: 2000,
    width: 1024,
    height: 1152,
    startNumber: 1,
    segmentDuration: 634.566,
    timescale: 1,
    media: 'http://media/$RepresentationID$/$Number$.jpg',
    essentialProperties: [{
        schemeIdUri: 'http://dashif.org/thumbnail_tile',
        value: '50x10'
    }]
};

describe('Thumbnails', function () {
    describe('ThumbnailController not initializeed', function () {
        const objectsHelper = new ObjectsHelper();
        const adapter = new AdapterMock();
        let thumbnailController;

        beforeEach(function () {
            thumbnailController = ThumbnailController(context).create({
                adapter: adapter,
                baseURLController: objectsHelper.getDummyBaseURLController(),
                stream: new StreamMock()
            });
        });

        afterEach(function () {
            thumbnailController.reset();
        });

        it('should return null if not initialized', function () {
            const thumbnail = thumbnailController.get(0);
            expect(thumbnail).to.be.null; // jshint ignore:line

            expect(thumbnailController.getBitrateList()).to.be.empty; // jshint ignore:line
        });
    });

    describe('ThumbnailController initialized with sampleRepresentation', function () {
        const objectsHelper = new ObjectsHelper();
        const adapter = new AdapterMock();
        let thumbnailController;

        beforeEach(function () {
            adapter.setRepresentation(sampleRepresentation);
            thumbnailController = ThumbnailController(context).create({
                adapter: adapter,
                baseURLController: objectsHelper.getDummyBaseURLController(),
                stream: new StreamMock()
            });
        });

        afterEach(function () {
            thumbnailController.reset();
        });

        it('should return a thumbnail', function () {
            let thumbnail = thumbnailController.get();
            expect(thumbnail).to.be.null; // jshint ignore:line

            thumbnailController.get(0, thumbnail => {
                expect(thumbnail).to.be.not.null; // jshint ignore:line
                expect(thumbnail.x).to.equal(0);
                expect(thumbnail.y).to.equal(0);
                expect(thumbnail.width).to.equal(320);
                expect(thumbnail.height).to.equal(180);
                expect(thumbnail.url).to.equal('http://media/rep_id/1.jpg');
            });

            thumbnailController.get(11, thumbnail => {
                expect(thumbnail).to.be.not.null; // jshint ignore:line
                expect(thumbnail.x).to.equal(320);
                expect(thumbnail.y).to.equal(0);
                expect(thumbnail.width).to.equal(320);
                expect(thumbnail.height).to.equal(180);
                expect(thumbnail.url).to.equal('http://media/rep_id/1.jpg');
            });

            thumbnailController.get(101, thumbnail => {
                expect(thumbnail).to.be.not.null; // jshint ignore:line
                expect(thumbnail.x).to.equal(0);
                expect(thumbnail.y).to.equal(0);
                expect(thumbnail.width).to.equal(320);
                expect(thumbnail.height).to.equal(180);
                expect(thumbnail.url).to.equal('http://media/rep_id/2.jpg');
            });
        });

        it('shouldn\'t return any thumbnail after reset', function () {
            thumbnailController.reset();
            thumbnailController.get(0, thumbnail => {
                expect(thumbnail).to.be.null; // jshint ignore:line
            });
        });

        it('should return list of available bitrates', function () {
            const bitrates = thumbnailController.getBitrateList();
            expect(bitrates).to.have.lengthOf(1);
            expect(bitrates[0].mediaType).to.equal('image');
            expect(bitrates[0].bitrate).to.equal(2000);
        });

        it('tracks selection', function () {
            expect(thumbnailController.getCurrentTrackIndex()).to.equal(0);
            thumbnailController.setTrackByIndex(-1);
            expect(thumbnailController.getCurrentTrackIndex()).to.equal(-1);
        });
    });

    describe('ThumbnailController initialized with sampleRepresentation2', function () {
        const objectsHelper = new ObjectsHelper();
        const adapter = new AdapterMock();
        let thumbnailController;

        beforeEach(function () {
            adapter.setRepresentation(sampleRepresentation2);
            thumbnailController = ThumbnailController(context).create({
                adapter: adapter,
                baseURLController: objectsHelper.getDummyBaseURLController(),
                stream: new StreamMock()
            });
        });

        afterEach(function () {
            thumbnailController.reset();
        });

        it('should return a thumbnail when using multiple rows sprites ', function () {
            thumbnailController.get(0, thumbnail => {
                expect(thumbnail).to.be.not.null; // jshint ignore:line
                expect(thumbnail.x).to.equal(0);
                expect(thumbnail.y).to.equal(0);
                expect(thumbnail.width).to.equal(102);
                expect(thumbnail.height).to.equal(57);
                expect(thumbnail.url).to.equal('http://media/rep_id/1.jpg');
            });


            thumbnailController.get(15, thumbnail => {
                expect(thumbnail).to.be.not.null; // jshint ignore:line
                expect(thumbnail.x).to.equal(409.6);
                expect(thumbnail.y).to.equal(0);
                expect(thumbnail.width).to.equal(102);
                expect(thumbnail.height).to.equal(57);
                expect(thumbnail.url).to.equal('http://media/rep_id/1.jpg');
            });

            thumbnailController.get(40, thumbnail => {
                expect(thumbnail).to.be.not.null; // jshint ignore:line
                expect(thumbnail.x).to.equal(204.8);
                expect(thumbnail.y).to.equal(57.6);
                expect(thumbnail.width).to.equal(102);
                expect(thumbnail.height).to.equal(57);
                expect(thumbnail.url).to.equal('http://media/rep_id/1.jpg');
            });
        });
    });

    describe('ThumbnailTracks', function () {
        const objectsHelper = new ObjectsHelper();
        const adapter = new AdapterMock();
        let thumbnailTracks;

        beforeEach(function () {
            thumbnailTracks = ThumbnailTracks(context).create({
                adapter: adapter,
                baseURLController: objectsHelper.getDummyBaseURLController(),
                stream: new StreamMock()
            });
        });

        afterEach(function () {
            thumbnailTracks.reset();
        });

        it('should not select any track when there are no tracks', function () {
            thumbnailTracks.setTrackByIndex(0);
            expect(thumbnailTracks.getCurrentTrackIndex()).to.equal(-1);
            expect(thumbnailTracks.getCurrentTrack()).to.be.null; // jshint ignore:line
        });

        it('should return an empty array when there are no tracks', function () {
            const tracks = thumbnailTracks.getTracks();
            expect(tracks).to.be.empty; // jshint ignore:line
        });

        it('addTracks method doesn\'t add any track if config not set properly', function () {
            thumbnailTracks = ThumbnailTracks(context).create({});
            thumbnailTracks.initialize();
            const tracks = thumbnailTracks.getTracks();
            expect(tracks).to.be.empty; // jshint ignore:line
        });

        it('should parse representations without essential properties and generate thumbnail tracks', function () {
            adapter.setRepresentation({
                id: 'rep_id',
                segmentInfoType: 'SegmentTemplate',
                bandwidth: 2000,
                width: 1000,
                height: 100,
                startNumber: 1,
                segmentDuration: 10,
                timescale: 1,
                media: 'http://media/$RepresentationID$/$Number$.jpg'
            });
            thumbnailTracks.initialize();
            const tracks = thumbnailTracks.getTracks();

            expect(tracks).to.have.lengthOf(1);
            expect(tracks[0].startNumber).to.equal(1);
            expect(tracks[0].segmentDuration).to.equal(10);
            expect(tracks[0].width).to.equal(1000);
            expect(tracks[0].height).to.equal(100);
            expect(tracks[0].tilesHor).to.equal(1);
            expect(tracks[0].tilesVert).to.equal(1);
            expect(tracks[0].templateUrl).to.equal('http://media/rep_id/$Number$.jpg');
        });

        it('should parse representations and its essential properties', function () {
            adapter.setRepresentation(sampleRepresentation);
            thumbnailTracks.initialize();
            const tracks = thumbnailTracks.getTracks();

            expect(tracks).to.have.lengthOf(1);
            expect(tracks[0].startNumber).to.equal(1);
            expect(tracks[0].segmentDuration).to.equal(100);
            expect(tracks[0].width).to.equal(3200);
            expect(tracks[0].height).to.equal(180);
            expect(tracks[0].tilesHor).to.equal(10);
            expect(tracks[0].tilesVert).to.equal(1);
            expect(tracks[0].templateUrl).to.equal('http://media/rep_id/$Number$.jpg');
        });

        it('should empty tracks after a reset', function () {
            adapter.setRepresentation(sampleRepresentation);
            thumbnailTracks.initialize();
            expect(thumbnailTracks.getTracks()).to.have.lengthOf(1);
            thumbnailTracks.reset();
            expect(thumbnailTracks.getTracks()).to.have.lengthOf(0);
        });

        it('tracks selection', function () {
            adapter.setRepresentation(sampleRepresentation);
            thumbnailTracks.initialize();
            thumbnailTracks.setTrackByIndex(0);
            expect(thumbnailTracks.getCurrentTrackIndex()).to.equal(0);
            expect(thumbnailTracks.getCurrentTrack()).to.be.not.null; // jshint ignore:line
            thumbnailTracks.setTrackByIndex(-1);
            expect(thumbnailTracks.getCurrentTrackIndex()).to.equal(-1);
            thumbnailTracks.setTrackByIndex(100);
            expect(thumbnailTracks.getCurrentTrackIndex()).to.equal(0);
        });
    });

    describe('CR URI schema', function () {
        const objectsHelper = new ObjectsHelper();
        const adapter = new AdapterMock();
        let thumbnailController;
        let thumbnailTracks;

        beforeEach(function () {
            thumbnailTracks = ThumbnailTracks(context).create({
                adapter: adapter,
                baseURLController: objectsHelper.getDummyBaseURLController(),
                stream: new StreamMock()
            });
        });

        afterEach(function () {
            thumbnailTracks.reset();
        });

        it('should support CR URI schema', function () {
            adapter.setRepresentation(sampleRepresentation3);
            thumbnailController = ThumbnailController(context).create({
                adapter: new AdapterMock(),
                baseURLController: objectsHelper.getDummyBaseURLController(),
                stream: new StreamMock()
            });

            thumbnailTracks.initialize();
            const tracks = thumbnailTracks.getTracks();

            expect(tracks[0].tilesHor).to.equal(50);
            expect(tracks[0].tilesVert).to.equal(10);
        });
    });
});
