import C2paController from '../../../../src/streaming/c2pa/C2paController.js';
import Settings from '../../../../src/core/Settings.js';
import EventBus from '../../../../src/core/EventBus.js';
import FactoryMaker from '../../../../src/core/FactoryMaker.js';
import MediaPlayerEvents from '../../../../src/streaming/MediaPlayerEvents.js';
import {expect} from 'chai';

function createCustomParametersModelMock() {
    const interceptors = [];
    return {
        interceptors,
        addResponseInterceptor(interceptor) {
            interceptors.push(interceptor);
        },
        removeResponseInterceptor(interceptor) {
            const index = interceptors.indexOf(interceptor);
            if (index !== -1) {
                interceptors.splice(index, 1);
            }
        }
    };
}

describe('C2paController', function () {

    let context;
    let settings;
    let eventBus;
    let customParametersModel;
    let controller;

    beforeEach(() => {
        context = {};
        settings = Settings(context).getInstance();
        eventBus = EventBus(context).getInstance();
        customParametersModel = createCustomParametersModelMock();
        controller = C2paController(context).getInstance();
        controller.setConfig({settings, eventBus, customParametersModel});
    });

    afterEach(() => {
        controller.reset();
        FactoryMaker.deleteSingletonInstances(context);
    });

    function enableC2pa() {
        settings.update({streaming: {c2pa: {enabled: true}}});
    }

    function disableC2pa() {
        settings.update({streaming: {c2pa: {enabled: false}}});
    }

    it('should not register any interceptor while disabled (the default)', () => {
        controller.initialize();

        expect(customParametersModel.interceptors.length).to.equal(0);
    });

    it('should register the interceptor when initialized already enabled', () => {
        enableC2pa();
        controller.initialize();

        expect(customParametersModel.interceptors.length).to.equal(1);
    });

    it('should register and detach the interceptor when the flag is toggled at runtime', () => {
        controller.initialize();
        expect(customParametersModel.interceptors.length).to.equal(0);

        enableC2pa();
        expect(customParametersModel.interceptors.length).to.equal(1);

        disableC2pa();
        expect(customParametersModel.interceptors.length).to.equal(0);
    });

    it('should not register twice when enabled is set repeatedly', () => {
        controller.initialize();
        enableC2pa();
        enableC2pa();

        expect(customParametersModel.interceptors.length).to.equal(1);
    });

    it('should leave no interceptor registered after reset', () => {
        enableC2pa();
        controller.initialize();
        expect(customParametersModel.interceptors.length).to.equal(1);

        controller.reset();

        expect(customParametersModel.interceptors.length).to.equal(0);
    });

    it('should stop reacting to the flag after reset', () => {
        controller.initialize();
        controller.reset();

        enableC2pa();

        expect(customParametersModel.interceptors.length).to.equal(0);
    });

    it('should clear source state on resetForNewSource without detaching the interceptor', () => {
        enableC2pa();
        controller.initialize();
        expect(customParametersModel.interceptors.length).to.equal(1);

        controller.resetForNewSource();

        expect(customParametersModel.interceptors.length).to.equal(1);
    });

    it('should allow resetForNewSource before C2PA was ever enabled', () => {
        controller.initialize();

        expect(() => controller.resetForNewSource()).to.not.throw();
    });

    it('should not throw on a seek or period switch whether or not C2PA is enabled', () => {
        controller.initialize();
        eventBus.trigger(MediaPlayerEvents.PLAYBACK_SEEKED);
        eventBus.trigger(MediaPlayerEvents.PERIOD_SWITCH_COMPLETED);

        enableC2pa();
        eventBus.trigger(MediaPlayerEvents.PLAYBACK_SEEKED);
        eventBus.trigger(MediaPlayerEvents.PERIOD_SWITCH_COMPLETED);

        expect(customParametersModel.interceptors.length).to.equal(1);
    });

    it('should stop reacting to seek/period events after reset', () => {
        enableC2pa();
        controller.initialize();
        controller.reset();

        expect(() => {
            eventBus.trigger(MediaPlayerEvents.PLAYBACK_SEEKED);
            eventBus.trigger(MediaPlayerEvents.PERIOD_SWITCH_COMPLETED);
        }).to.not.throw();
    });
});
