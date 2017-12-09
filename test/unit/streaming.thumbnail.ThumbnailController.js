import ThumbnailController from '../../src/streaming/thumbnail/ThumbnailController';
import ThumbnailTracks from '../../src/streaming/thumbnail/ThumbnailTracks';
import ObjectsHelper from './helpers/ObjectsHelper';

const expect = require('chai').expect;
const context = {};

class DashManifestModelMock {
    setRepresentation(res) {
        this.representation = res;
    }
    getRepresentationsForAdaptation() {
        if (this.representation) {
            return [this.representation];
        } else {
            return [];
        }
    }
}

class DashAdapterMock {
    getMediaInfoForType() {
        return {};
    }
    getDataForMedia() {
        return {};
    }
}

class StreamMock {
    getStreamInfo() {
        return {};
    }
}

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
        schemeIdUri: 'http://dashif.org/thumbnail_tile',
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
        schemeIdUri: 'http://dashif.org/thumbnail_tile',
        value: '10x20'
    }]
};

describe('Thumbnails', function () {
    describe('ThumbnailController', function () {
        const objectsHelper = new ObjectsHelper();
        const dashManifestModel = new DashManifestModelMock();
        let thumbnailController;

        beforeEach(function () {
            thumbnailController = ThumbnailController(context).create({
                dashManifestModel: dashManifestModel,
                adapter: new DashAdapterMock(),
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

        it('should return a thumbnail', function () {
            dashManifestModel.setRepresentation(sampleRepresentation);
            thumbnailController = ThumbnailController(context).create({
                dashManifestModel: dashManifestModel,
                adapter: new DashAdapterMock(),
                baseURLController: objectsHelper.getDummyBaseURLController(),
                stream: new StreamMock()
            });
            let thumbnail = thumbnailController.get(0);
            expect(thumbnail).to.be.not.null; // jshint ignore:line
            expect(thumbnail.x).to.equal(0);
            expect(thumbnail.y).to.equal(0);
            expect(thumbnail.width).to.equal(320);
            expect(thumbnail.height).to.equal(180);
            expect(thumbnail.url).to.equal('http://media/rep_id/1.jpg');

            thumbnail = thumbnailController.get(11);
            expect(thumbnail).to.be.not.null; // jshint ignore:line
            expect(thumbnail.x).to.equal(320);
            expect(thumbnail.y).to.equal(0);
            expect(thumbnail.width).to.equal(320);
            expect(thumbnail.height).to.equal(180);
            expect(thumbnail.url).to.equal('http://media/rep_id/1.jpg');

            thumbnail = thumbnailController.get(101);
            expect(thumbnail).to.be.not.null; // jshint ignore:line
            expect(thumbnail.x).to.equal(0);
            expect(thumbnail.y).to.equal(0);
            expect(thumbnail.width).to.equal(320);
            expect(thumbnail.height).to.equal(180);
            expect(thumbnail.url).to.equal('http://media/rep_id/2.jpg');
        });

        it('should return a thumbnail when using multiple rows sprites ', function () {
            dashManifestModel.setRepresentation(sampleRepresentation2);
            thumbnailController = ThumbnailController(context).create({
                dashManifestModel: dashManifestModel,
                adapter: new DashAdapterMock(),
                baseURLController: objectsHelper.getDummyBaseURLController(),
                stream: new StreamMock()
            });
            let thumbnail = thumbnailController.get(0);
            expect(thumbnail).to.be.not.null; // jshint ignore:line
            expect(thumbnail.x).to.equal(0);
            expect(thumbnail.y).to.equal(0);
            expect(thumbnail.width).to.equal(102);
            expect(thumbnail.height).to.equal(57);
            expect(thumbnail.url).to.equal('http://media/rep_id/1.jpg');


            thumbnail = thumbnailController.get(15);
            expect(thumbnail).to.be.not.null; // jshint ignore:line
            expect(thumbnail.x).to.equal(409.6);
            expect(thumbnail.y).to.equal(0);
            expect(thumbnail.width).to.equal(102);
            expect(thumbnail.height).to.equal(57);
            expect(thumbnail.url).to.equal('http://media/rep_id/1.jpg');

            thumbnail = thumbnailController.get(40);
            expect(thumbnail).to.be.not.null; // jshint ignore:line
            expect(thumbnail.x).to.equal(204.8);
            expect(thumbnail.y).to.equal(57.6);
            expect(thumbnail.width).to.equal(102);
            expect(thumbnail.height).to.equal(57);
            expect(thumbnail.url).to.equal('http://media/rep_id/1.jpg');
        });

        it('shouldnt return any thumbnail after reset', function () {
            dashManifestModel.setRepresentation();
            thumbnailController = ThumbnailController(context).create({
                dashManifestModel: dashManifestModel,
                adapter: new DashAdapterMock(),
                baseURLController: objectsHelper.getDummyBaseURLController(),
                stream: new StreamMock()
            });
            thumbnailController.reset();
            const thumbnail = thumbnailController.get(0);
            expect(thumbnail).to.be.null; // jshint ignore:line
        });

        it('should return list of available bitrates', function () {
            dashManifestModel.setRepresentation(sampleRepresentation);
            thumbnailController = ThumbnailController(context).create({
                dashManifestModel: dashManifestModel,
                adapter: new DashAdapterMock(),
                baseURLController: objectsHelper.getDummyBaseURLController(),
                stream: new StreamMock()
            });
            const bitrates = thumbnailController.getBitrateList();
            expect(bitrates).to.have.lengthOf(1);
            expect(bitrates[0].mediaType).to.equal('image');
            expect(bitrates[0].bitrate).to.equal(2000);
        });

        it('tracks selection', function () {
            dashManifestModel.setRepresentation(sampleRepresentation);
            thumbnailController = ThumbnailController(context).create({
                dashManifestModel: dashManifestModel,
                adapter: new DashAdapterMock(),
                baseURLController: objectsHelper.getDummyBaseURLController(),
                stream: new StreamMock()
            });
            expect(thumbnailController.getCurrentTrackIndex()).to.equal(0);
            thumbnailController.setTrackByIndex(-1);
            expect(thumbnailController.getCurrentTrackIndex()).to.equal(-1);
        });
    });


    describe('ThumbnailTracks', function () {
        const objectsHelper = new ObjectsHelper();
        const dashManifestModel = new DashManifestModelMock();
        let thumbnailTracks;

        beforeEach(function () {
            thumbnailTracks = ThumbnailTracks(context).create({
                dashManifestModel: dashManifestModel,
                adapter: new DashAdapterMock(),
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

        it('addTracks method doesnt add any track if config not set properly', function () {
            thumbnailTracks = ThumbnailTracks(context).create({});
            thumbnailTracks.initialize();
            const tracks = thumbnailTracks.getTracks();
            expect(tracks).to.be.empty; // jshint ignore:line
        });

        it('should parse representations without essential properties and generate thumbnail tracks', function () {
            dashManifestModel.setRepresentation({
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
            dashManifestModel.setRepresentation(sampleRepresentation);
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
            dashManifestModel.setRepresentation(sampleRepresentation);
            thumbnailTracks.initialize();
            expect(thumbnailTracks.getTracks()).to.have.lengthOf(1);
            thumbnailTracks.reset();
            expect(thumbnailTracks.getTracks()).to.have.lengthOf(0);
        });

        it('tracks selection', function () {
            dashManifestModel.setRepresentation(sampleRepresentation);
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
});
