import EventBus from '../../src/core/EventBus';
import { EVENT_MODE_ON_START, EVENT_MODE_ON_RECEIVE } from '../../src/streaming/MediaPlayerEvents';

const chai = require('chai');
const sinon = require('sinon');
const expect = chai.expect;
const assert = chai.assert;

const context = {};
const eventBus = EventBus(context).getInstance();

describe('EventBus', function () {

    beforeEach(() => {
        eventBus.reset();
    });

    it('should throw an exception when attempting to register the on callback with an undefined type', function () {
        expect(eventBus.on.bind(eventBus)).to.throw('event type cannot be null or undefined');
    });

    it('should throw an exception when attempting to register the on callback with an undefined listener', function () {
        expect(eventBus.on.bind(eventBus, 'EVENT_TEST')).to.throw('listener must be a function: undefined');
    });

    it('should throw an exception when attempting to trigger a \'type\' payload parameter', function () {
        const spy = sinon.spy();

        eventBus.on('EVENT_TEST', spy);

        expect(eventBus.trigger.bind(eventBus, 'EVENT_TEST', { type: {}})).to.throw('\'type\' is a reserved word for event dispatching');
    });

    it('should respect priority parameter in order to notify the different listeners', function () {
        const spy = sinon.spy();
        const spy2 = sinon.spy();

        eventBus.on('EVENT_TEST', spy);
        eventBus.on('EVENT_TEST', spy2, this, { priority: EventBus.EVENT_PRIORITY_HIGH });

        eventBus.trigger('EVENT_TEST', {});

        assert.equal(spy.calledOnce, true);
        assert.equal(spy2.calledOnce, true);
        assert.equal(spy2.calledBefore(spy), true);
    });

    it('should respect mode parameter in the on function in order to trigger events according to isEventStart option in trigger function', function () {
        const spy = sinon.spy();
        const spy2 = sinon.spy();

        eventBus.on('EVENT_TEST', spy, null, { mode: EVENT_MODE_ON_START });
        eventBus.on('EVENT_TEST', spy2, null, { mode: EVENT_MODE_ON_RECEIVE });

        eventBus.trigger('EVENT_TEST', {}, { mode: EVENT_MODE_ON_START });
        eventBus.trigger('EVENT_TEST', {}, { mode: EVENT_MODE_ON_RECEIVE });

        assert.equal(spy.calledOnce, true);
        assert.equal(spy2.calledOnce, true);
    });

    it('should ignore onReceive events if no mode was specified in the callback handler', function () {
        const spy = sinon.spy();

        eventBus.on('EVENT_TEST', spy, null);

        eventBus.trigger('EVENT_TEST', {}, { mode: EVENT_MODE_ON_RECEIVE });

        assert.equal(spy.notCalled, true);
    });

    it('should trigger onStart event if no mode was specified in the callback handler', function () {
        const spy = sinon.spy();

        eventBus.on('EVENT_TEST', spy, null);

        eventBus.trigger('EVENT_TEST', {}, { mode: EVENT_MODE_ON_START });
        eventBus.trigger('EVENT_TEST', {}, { mode: EVENT_MODE_ON_RECEIVE });

        assert.equal(spy.calledOnce, true);
    });
});
