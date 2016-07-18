import SpecHelper from './helpers/SpecHelper';
import VoHelper from './helpers/VOHelper';
import EventBus from '../src/core/EventBus';
import Events from '../src/core/events/Events';
import FragmentModel from '../src/streaming/models/FragmentModel';

const chai = require('chai');
const spies = require('chai-spies');
const sinon = require('sinon');
const expect = chai.expect;

chai.use(spies);

describe("FragmentModel", function () {
    const specHelper = new SpecHelper();
    const voHelper = new VoHelper();
    const initRequest = voHelper.getInitRequest();
    const mediaRequest = voHelper.getMediaRequest();
    const completeRequest = voHelper.getCompleteRequest();
    const context = {};
    const eventBus = EventBus(context).getInstance();
    const metricsModel = {
        addSchedulingInfo: () => {},
        addRequestsQueue: () => {}
    }
    let fragmentModel = FragmentModel(context).create({metricsModel: metricsModel});

    it("should not have any loading, executed, canceled or failed requests", function () {
        const expectedValue = 0;

        expect(fragmentModel.getRequests({state: FragmentModel.FRAGMENT_MODEL_LOADING}).length).to.be.equal(expectedValue);
        expect(fragmentModel.getRequests({state: FragmentModel.FRAGMENT_MODEL_EXECUTED}).length).to.be.equal(expectedValue);
        expect(fragmentModel.getRequests({state: FragmentModel.FRAGMENT_MODEL_CANCELED}).length).to.be.equal(expectedValue);
        expect(fragmentModel.getRequests({state: FragmentModel.FRAGMENT_MODEL_FAILED}).length).to.be.equal(expectedValue);
    });

    describe("when a request has been added", function () {
        it("should fire streamCompleted event for a complete request", function () {
            const spy = chai.spy();

            eventBus.on(Events.STREAM_COMPLETED, spy);

            fragmentModel.executeRequest(completeRequest);
            expect(fragmentModel.getRequests({state: FragmentModel.FRAGMENT_MODEL_LOADING}).length).to.be.equal(0);
            expect(fragmentModel.getRequests({state: FragmentModel.FRAGMENT_MODEL_EXECUTED}).length).to.be.equal(1);
            expect(spy).to.have.been.called.exactly(1);

            eventBus.off(Events.STREAM_COMPLETED, spy);
        });

        describe("when a request has been passed for executing", function () {
            const loader = { load: () => {}, abort: () => {} };
            const delay = specHelper.getExecutionDelay();
            let clock;

            beforeEach(function () {
                fragmentModel = FragmentModel(context).create({metricsModel: metricsModel});
                fragmentModel.setLoader(loader);
                clock = sinon.useFakeTimers();

                setTimeout(function(){
                    fragmentModel.executeRequest(initRequest);
                    fragmentModel.executeRequest(mediaRequest);
                }, delay);
            });

            afterEach(function(){
                clock.restore();
            });

            it("should fire loadingStarted event a request", function () {
                const spy = chai.spy();

                eventBus.on(Events.FRAGMENT_LOADING_STARTED, spy);

                clock.tick(delay + 1);
                eventBus.off(Events.FRAGMENT_LOADING_STARTED, spy);

                expect(spy).to.have.been.called();
            });

            it("should add the request to loading requests", function () {
                clock.tick(delay + 1);

                const loadingRequests = fragmentModel.getRequests({state: FragmentModel.FRAGMENT_MODEL_LOADING});

                expect(loadingRequests.length).to.be.equal(2);
            });

            it("should be able to abort loading requests", function () {
                clock.tick(delay + 1);

                fragmentModel.abortRequests();
                const loadingRequests = fragmentModel.getRequests({state: FragmentModel.FRAGMENT_MODEL_LOADING});

                expect(loadingRequests.length).to.be.equal(0);
            });
        });
    });
});
