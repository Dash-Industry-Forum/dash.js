import MediaPlayerModel from '../../src/streaming/models/MediaPlayerModel';

const chai = require('chai');
const expect = chai.expect;

describe('MediaPlayerModel', function () {
    const context = {};
    const mediaPlayerModel = MediaPlayerModel(context).getInstance();

    it('should not set a value to lowLatencyEnabled attribute that is not a boolean type', function () {
        expect(mediaPlayerModel.getLowLatencyEnabled()).to.be.equal(false);
        mediaPlayerModel.setLowLatencyEnabled(undefined);
        expect(mediaPlayerModel.getLowLatencyEnabled()).to.be.equal(false);
        mediaPlayerModel.setLowLatencyEnabled(1);
        expect(mediaPlayerModel.getLowLatencyEnabled()).to.be.equal(false);
        mediaPlayerModel.setLowLatencyEnabled(true);
        expect(mediaPlayerModel.getLowLatencyEnabled()).to.be.equal(true);
    });

    it('should not set a value to fastSwitchEnabled attribute that is not a boolean type', function () {
        expect(mediaPlayerModel.getFastSwitchEnabled()).to.be.equal(false);
        mediaPlayerModel.setFastSwitchEnabled(undefined);
        expect(mediaPlayerModel.getFastSwitchEnabled()).to.be.equal(false);
        mediaPlayerModel.setFastSwitchEnabled(1);
        expect(mediaPlayerModel.getFastSwitchEnabled()).to.be.equal(false);
        mediaPlayerModel.setFastSwitchEnabled(true);
        expect(mediaPlayerModel.getFastSwitchEnabled()).to.be.equal(true);
    });
});