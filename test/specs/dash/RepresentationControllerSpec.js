import ObjectsHelper from '../../helpers/ObjectsHelper.js'
import VoHelper from '../../helpers/VOHelper.js';
import MpdHelper from '../../helpers/MPDHelper.js';
import EventBus from '../../../src/streaming/utils/EventBus.js';
import RepresentationControler from '../../../src/dash/controllers/RepresentationController.js';
import ManifestModel from '../../../src/streaming/models/ManifestModel.js';
import Events from '../../../src/streaming/Events.js';
import SpecHelper from '../../helpers/SpecHelper.js';

const chai = require('chai'),
      spies = require('chai-spies');

chai.use(spies);

const expect = chai.expect;
const voHelper = new VoHelper();
const objectsHelper = new ObjectsHelper();

describe("RepresentationController", function () {
    // Arrange
    const context = {};
    const testType = 'video';
    const specHelper = new SpecHelper();
    const mpdHelper = new MpdHelper();
    const mpd = mpdHelper.getMpd('static');
    const data = mpd.Period_asArray[0].AdaptationSet_asArray[0];
    const adaptation = voHelper.getDummyRepresentation(testType).adaptation;
    const streamProcessor = objectsHelper.getDummyStreamProcessor(testType);
    const eventBus = EventBus(context).getInstance();
    const manifestModel = ManifestModel(context).getInstance();

    manifestModel.setValue(mpd);

    const representationControler = RepresentationControler(context).create();
    representationControler.initialize(streamProcessor);

    it("should not contain data before it is set", function () {
        // Act
        const data = representationControler.getData();

        // Assert
        expect(data).not.exist;
    });

    describe("when data update started", function () {
        let spy;

        beforeEach(function() {
            spy = chai.spy();
            eventBus.on(Events.DATA_UPDATE_STARTED, spy);
        });

        afterEach(function() {
            eventBus.off(Events.DATA_UPDATE_STARTED, spy);
        });

        it("should fire dataUpdateStarted event when new data is set", function () {
            // Act
            representationControler.updateData(data, adaptation, testType);

            // Assert
            expect(spy).to.have.been.called.exactly(1);
        });
    });

    describe("when data update completed", function () {
        beforeEach(function (done) {
            representationControler.updateData(data, adaptation, testType);
            setTimeout(function(){
                done();
            }, specHelper.getExecutionDelay());
        });

        it("should return the data that was set", function () {
            expect(representationControler.getData()).to.equal(data);
        });

        it("should return correct data index", function () {
            var expectedValue = 0;

            expect(representationControler.getDataIndex()).to.equal(expectedValue);
        });

        it("should return correct representation for quality", function () {
            var quality = 0,
                expectedValue = 0;

            expect(representationControler.getRepresentationForQuality(quality).index).to.equal(expectedValue);
        });
    });
});