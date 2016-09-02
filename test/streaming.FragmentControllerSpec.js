import VoHelper from './helpers/VOHelper';
import Events from '../src/core/events/Events';
import MediaPlayerEvents from '../src/streaming/MediaPlayerEvents';
import FragmentController from '../src/streaming/controllers/FragmentController';

const expect = require('chai').expect;

describe("FragmentController", function () {
    const context = {};
    const voHelper = new VoHelper();
    const fragmentController = FragmentController(context).create();
    
    Events.extend(MediaPlayerEvents);

    it("should process bytes array", function () {
        const bytes = new ArrayBuffer(612);
        const expectedValue = new Uint8Array(bytes);
        const result = fragmentController.process(bytes);
        expect(result).to.be.eql(expectedValue);
    });

    it("should create or return model for a given media type", function () {
        const model = fragmentController.getModel('video');
        expect(model).to.exist;
    });

    it("should always return the same model for the context", function () {
        const context1 = 1;
        const context2 = 2;

        const model1 = fragmentController.getModel(context1);
        const model2 = fragmentController.getModel(context2);

        expect(fragmentController.getModel(context1)).to.be.equal(model1);
        expect(fragmentController.getModel(context2)).to.be.equal(model2);
    });

    it("should identify an initialization segment", function () {
        var request = voHelper.getInitRequest();
        expect(fragmentController.isInitializationRequest(request)).to.be.ok;

        request.type = "unknown";
        expect(fragmentController.isInitializationRequest(request)).to.not.be.ok;

        request.type = undefined;
        expect(fragmentController.isInitializationRequest(request)).to.not.be.ok;

        expect(fragmentController.isInitializationRequest(null)).to.not.be.ok;
    });
});