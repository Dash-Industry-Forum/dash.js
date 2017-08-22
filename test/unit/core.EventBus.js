import EventBus from '../../src/core/EventBus';

const chai = require('chai');
const spies = require('chai-spies');
const expect = chai.expect;

chai.use(spies);

const context = {};
const eventBus = EventBus(context).getInstance();

describe('EventBus', function () {

    it("should throw an exception when attempting to register the on callback with an undefined type", function () {
        expect(eventBus.on.bind(eventBus)).to.throw('event type cannot be null or undefined');
    });

    it("should throw an exception when attempting to register the on callback with an undefined listener", function () {
        expect(eventBus.on.bind(eventBus, 'EVENT_TEST')).to.throw('listener must be a function: undefined');
    });

    it("should throw an exception when attempting to trigger a 'type' payload parameter", function () {
        const spy = chai.spy();

        eventBus.on('EVENT_TEST', spy);

        expect(eventBus.trigger.bind(eventBus, 'EVENT_TEST', { type:{}})).to.throw('\'type\' is a reserved word for event dispatching');
    });
    
});
