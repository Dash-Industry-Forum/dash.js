import ThumbnailController from '../../src/streaming/thumbnail/ThumbnailController';

const expect = require('chai').expect;
const context = {};

describe('ThumbnailController', function () {

    let thumbnailController;

    beforeEach(function () {
        thumbnailController = ThumbnailController(context).create({
            /*manifestModel: manifestModel,
            dashManifestModel: dashManifestModel,
            baseURLController: config.baseURLController,
            stream: instance*/
        });
    });

    afterEach(function () {
        thumbnailController.reset();
    });

    it('should return null', function () {
        const thumbnail = thumbnailController.get(0, 0);
        expect(thumbnail).to.be.null; // jshint ignore:line
    });
});
