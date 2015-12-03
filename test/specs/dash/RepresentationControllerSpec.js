import ObjectsHelper from '../../helpers/ObjectsHelper.js'
import VoHelper from '../../helpers/VOHelper.js';
import MpdHelper from '../../helpers/MPDHelper.js';
import EventBus from '../../../src/streaming/utils/EventBus.js';
import RepresentationControler from '../../../src/dash/controllers/RepresentationController.js';
import Events from '../../../src/streaming/Events.js';

const chai = require('chai'),
      spies = require('chai-spies');

chai.use(spies);

const expect = chai.expect;
const voHelper = new VoHelper();
const objectsHelper = new ObjectsHelper();

describe("RepresentationController", function () {

    it("should not contain data before it is set", function () {
        
        // Arrange
        const context = {};
        const instance = RepresentationControler(context).create();

        // Act
        const data = instance.getData();

        // Assert
        expect(data).not.exist;
    });
});

describe("when data update started", function () {

    it("should fire dataUpdateStarted event when new data is set", function () {
        // Arrange
        const context = {};
        const testType = 'video';
        const mpdHelper = new MpdHelper();
        const mpd = mpdHelper.getMpd('static');
        const data = mpd.Period_asArray[0].AdaptationSet_asArray[0];
        const adaptation = voHelper.getDummyRepresentation(testType).adaptation;
        const streamProcessor = objectsHelper.getDummyStreamProcessor(testType);
        const eventBus = EventBus(context).getInstance();

        const spy = chai.spy();
        eventBus.on(Events.DATA_UPDATE_STARTED, spy);

        const representationControler = RepresentationControler(context).create();
        representationControler.initialize(streamProcessor);

        // Act
        representationControler.updateData(data, adaptation, testType);

        // Assert
        expect(spy).to.have.been.called.exactly(1);
    });
});

/*var helper = window.Helpers.getSpecHelper(),
    objHelper = window.Helpers.getObjectsHelper(),
    mpdHelper = window.Helpers.getMpdHelper(),
    testType = "video",
    voHelper = window.Helpers.getVOHelper(),
    adaptation = voHelper.getDummyRepresentation(testType).adaptation,
    mpd = mpdHelper.getMpd("static"),
    data = mpd.Period_asArray[0].AdaptationSet_asArray[0],
    representationCtrl = objHelper.getRepresentationController(),
    indexHandler = objHelper.getIndexHandler(testType),
    onDataUpdateStartedEventName = Dash.dependencies.RepresentationController.eventList.ENAME_DATA_UPDATE_STARTED;

representationCtrl.manifestModel.setValue(mpd);
representationCtrl.indexHandler = indexHandler;




describe("when data update completed", function () {
    beforeEach(function (done) {
        representationCtrl.updateData(data, adaptation, testType);
        setTimeout(function(){
            done();
        }, helper.getExecutionDelay());
    });

    it("should return the data that was set", function () {
        expect(representationCtrl.getData()).toEqual(data);
    });

    it("should return correct data index", function () {
        var expectedValue = 0;

        expect(representationCtrl.getDataIndex()).toEqual(expectedValue);
    });

    it("should return correct representation for quality", function () {
        var quality = 0,
            expectedValue = 0;

        expect(representationCtrl.getRepresentationForQuality(quality).index).toEqual(expectedValue);
    });
});*/