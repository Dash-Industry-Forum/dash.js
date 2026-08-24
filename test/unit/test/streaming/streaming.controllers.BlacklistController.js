import BlacklistController from '../../../../src/streaming/controllers/BlacklistController.js';
import ContentSteeringController from '../../../../src/dash/controllers/ContentSteeringController.js';
import EventBus from '../../../../src/core/EventBus.js';
import Settings from '../../../../src/core/Settings.js';
import chai from 'chai';
import spies from 'chai-spies';
import sinon from 'sinon';

const expect = chai.expect;

chai.use(spies);

describe('BlacklistController', function () {
    const context = {};
    const settings = Settings(context).getInstance();
    const eventBus = EventBus(context).getInstance();

    const SERVICE_LOCATION = 'testServiceLocation';
    const EVENT_NAME = 'blacklistControllerTestEvent';

    const defaultConfig = { updateEventName: '' };

    let clock;
    let contentSteeringResponseStub;

    this.beforeEach(() => {
        clock = sinon.useFakeTimers();
    });

    this.afterEach(() => {
        if (contentSteeringResponseStub) {
            contentSteeringResponseStub.restore();
            contentSteeringResponseStub = null;
        }
        if (clock) {
            clock.restore();
            clock = null;
        }
        settings.reset();
    });

    it('should return false when calling contains after initialisation', () => {
        const blacklistController = BlacklistController(context).create(defaultConfig);

        const contains = blacklistController.contains('test');

        expect(contains).to.be.false; // jshint ignore:line
    });

    it('should return false when calling contains with undefined', () => {
        const blacklistController = BlacklistController(context).create(defaultConfig);

        const contains = blacklistController.contains(undefined);

        expect(contains).to.be.false; // jshint ignore:line
    });

    it('should return false when calling contains with zero-length string', () => {
        const blacklistController = BlacklistController(context).create(defaultConfig);

        const contains = blacklistController.contains('');

        expect(contains).to.be.false; // jshint ignore:line
    });

    it('should return true when calling contains after calling add with same string', () => {
        const blacklistController = BlacklistController(context).create(defaultConfig);

        blacklistController.add(SERVICE_LOCATION);

        const contains = blacklistController.contains(SERVICE_LOCATION);

        expect(contains).to.be.true; // jshint ignore:line
    });

    it('should trigger an update event after calling add', () => {
        const spy = chai.spy();
        const config = { updateEventName: EVENT_NAME };
        const blacklistController = BlacklistController(context).create(config);

        eventBus.on(EVENT_NAME, spy);

        blacklistController.add(SERVICE_LOCATION);

        expect(spy).to.have.been.called.once; // jshint ignore:line

        eventBus.off(EVENT_NAME, spy);
    });

    it('should add an entry to the blacklist on receiving load failed event', () => {
        const config = {
            updateEventName: '',
            addBlacklistEventName: EVENT_NAME
        };
        const blacklistController = BlacklistController(context).create(config);
        blacklistController.initialize();

        eventBus.trigger(EVENT_NAME, {
            entry: SERVICE_LOCATION
        });

        const contains = blacklistController.contains(SERVICE_LOCATION);

        expect(contains).to.be.true; // jshint ignore:line
    });

    it('should add event handlers again after reset', () => {
        const config = {
            updateEventName: '',
            addBlacklistEventName: EVENT_NAME
        };
        const blacklistController = BlacklistController(context).create(config);
        blacklistController.initialize();

        eventBus.trigger(EVENT_NAME, {
            entry: SERVICE_LOCATION
        });
        expect(blacklistController.contains(SERVICE_LOCATION)).to.be.true;

        blacklistController.reset();
        expect(blacklistController.contains(SERVICE_LOCATION)).to.be.false;

        // Listener has been removed by reset(), so this event should be ignored.
        eventBus.trigger(EVENT_NAME, {
            entry: SERVICE_LOCATION
        });
        expect(blacklistController.contains(SERVICE_LOCATION)).to.be.false;

        blacklistController.initialize();
        eventBus.trigger(EVENT_NAME, {
            entry: SERVICE_LOCATION
        });
        expect(blacklistController.contains(SERVICE_LOCATION)).to.be.true;
    });

    it('should not trigger an update event if a duplicate entry is added', () => {
        const spy = chai.spy();
        const config = { updateEventName: EVENT_NAME };
        const blacklistController = BlacklistController(context).create(config);

        eventBus.on(EVENT_NAME, spy);

        blacklistController.add(SERVICE_LOCATION);
        blacklistController.add(SERVICE_LOCATION);

        expect(spy).to.have.been.called.once; // jshint ignore:line

        eventBus.off(EVENT_NAME, spy);
    });

    it('should not contain an entry after reset', () => {
        const config = { updateEventName: '' };
        const blacklistController = BlacklistController(context).create(config);

        blacklistController.add(SERVICE_LOCATION);
        const containsBeforeReset = blacklistController.contains(SERVICE_LOCATION);
        blacklistController.reset();
        const containsAfterReset = blacklistController.contains(SERVICE_LOCATION);

        expect(containsBeforeReset).to.be.true; // jshint ignore:line
        expect(containsAfterReset).to.be.false; // jshint ignore:line
    });

    it('should remove an entry after a content steering TTL blacklist expiry time has passed', () => {
        const config = { updateEventName: '', enableExpiry: true };
        const contentSteeringController = ContentSteeringController(context).getInstance();
        contentSteeringResponseStub = sinon.stub(contentSteeringController, 'getCurrentSteeringResponseData').returns({ ttl: 60 });

        const blacklistController = BlacklistController(context).create(config);

        blacklistController.add(SERVICE_LOCATION);
        clock.tick(30 * 1000);
        expect(blacklistController.contains(SERVICE_LOCATION)).to.be.true;

        clock.tick(30 * 1000);
        expect(blacklistController.contains(SERVICE_LOCATION)).to.be.false;
    });

    it('should remove an entry after a blacklist expiry time from settings has passed', () => {
        const config = { updateEventName: '', enableExpiry: true };
        const blacklistController = BlacklistController(context).create(config);
        settings.update({streaming: { blacklistExpiryTime: 60 }});

        blacklistController.add(SERVICE_LOCATION);
        clock.tick(30 * 1000);
        expect(blacklistController.contains(SERVICE_LOCATION)).to.be.true;

        clock.tick(30 * 1000);
        expect(blacklistController.contains(SERVICE_LOCATION)).to.be.false;
    });

    it('should not remove any entry if enableExpiry is not set', () => {
        const config = { updateEventName: '' };
        const blacklistController = BlacklistController(context).create(config);
        settings.update({streaming: { blacklistExpiryTime: 60 }});

        blacklistController.add(SERVICE_LOCATION);
        clock.tick(60 * 1000);
        expect(blacklistController.contains(SERVICE_LOCATION)).to.be.true;
    });
});
