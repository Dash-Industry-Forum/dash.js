import SpecHelper from './helpers/SpecHelper';
import VoHelper from './helpers/VOHelper';
import EventBus from '../../src/core/EventBus';
import Events from '../../src/core/events/Events';
import FragmentModel from '../../src/streaming/models/FragmentModel';
import {HTTPRequest} from '../../src/streaming/vo/metrics/HTTPRequest';
import Debug from '../../src/core/Debug';

import DashMetricsMock from './mocks/DashMetricsMock';

const chai = require('chai');
const spies = require('chai-spies');
const sinon = require('sinon');
const expect = chai.expect;

chai.use(spies);

describe('FragmentModel', function () {
    const specHelper = new SpecHelper();
    const voHelper = new VoHelper();
    const initRequest = voHelper.getInitRequest();
    const mediaRequest = voHelper.getMediaRequest();
    const completeInitRequest = voHelper.getCompleteRequest(HTTPRequest.INIT_SEGMENT_TYPE);
    const context = {};
    const debug = Debug(context).getInstance();
    const eventBus = EventBus(context).getInstance();
    let fragmentModel = FragmentModel(context).create({
        streamInfo: { id: 'streamId' },
        type: 'video',
        dashMetrics: new DashMetricsMock(),
        eventBus: eventBus,
        events: Events,
        debug: debug
    });

    it('should not have any loading, executed, canceled or failed requests', function () {
        const expectedValue = 0;

        expect(fragmentModel.getRequests().length).to.be.equal(expectedValue);
        expect(fragmentModel.getRequests({ state: FragmentModel.FRAGMENT_MODEL_LOADING }).length).to.be.equal(expectedValue);
        expect(fragmentModel.getRequests({ state: FragmentModel.FRAGMENT_MODEL_EXECUTED }).length).to.be.equal(expectedValue);
        expect(fragmentModel.getRequests({ state: FragmentModel.FRAGMENT_MODEL_CANCELED }).length).to.be.equal(expectedValue);
        expect(fragmentModel.getRequests({ state: FragmentModel.FRAGMENT_MODEL_FAILED }).length).to.be.equal(expectedValue);
    });

    it('should return false when isFragmentLoaded is called and request is undefined', () => {
        const isFragmentLoaded = fragmentModel.isFragmentLoaded();

        expect(isFragmentLoaded).to.be.false;  // jshint ignore:line
    });

    it('should return false when isFragmentLoaded is called and request is undefined but executedRequests is not empty', () => {
        fragmentModel.executeRequest(completeInitRequest);
        const isFragmentLoaded = fragmentModel.isFragmentLoaded();

        expect(isFragmentLoaded).to.be.false;  // jshint ignore:line
        fragmentModel.reset();
    });


    describe('when a request has been passed for executing', function () {
        const loader = {
            load: () => {
            }, abort: () => {
            }, reset: () => {
            }
        };
        const delay = specHelper.getExecutionDelay();
        let clock;

        beforeEach(function () {
            fragmentModel = FragmentModel(context).create({
                streamInfo: { id: 'streamId' },
                type: 'video',
                dashMetrics: new DashMetricsMock(),
                fragmentLoader: loader,
                eventBus: eventBus,
                events: Events,
                debug: debug
            });
            clock = sinon.useFakeTimers();

            setTimeout(function () {
                fragmentModel.executeRequest(initRequest);
                fragmentModel.executeRequest(mediaRequest);
            }, delay);
        });

        afterEach(function () {
            clock.restore();
            fragmentModel.reset();
        });

        it('should fire loadingStarted event a request', function () {
            const spy = chai.spy();

            eventBus.on(Events.FRAGMENT_LOADING_STARTED, spy);

            clock.tick(delay + 1);
            eventBus.off(Events.FRAGMENT_LOADING_STARTED, spy);

            expect(spy).to.have.been.called();
        });

        it('should add the request to loading requests', function () {
            clock.tick(delay + 1);

            const loadingRequests = fragmentModel.getRequests({ state: FragmentModel.FRAGMENT_MODEL_LOADING });

            expect(loadingRequests.length).to.be.equal(2);
        });

        it('should be able to abort loading requests', function () {
            clock.tick(delay + 1);

            fragmentModel.abortRequests();
            const loadingRequests = fragmentModel.getRequests({ state: FragmentModel.FRAGMENT_MODEL_LOADING });

            expect(loadingRequests.length).to.be.equal(0);
        });

    });

});
