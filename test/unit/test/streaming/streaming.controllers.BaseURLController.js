import BaseURLController from '../../../../src/streaming/controllers/BaseURLController.js';
import BasicSelector from '../../../../src/streaming/utils/baseUrlResolution/BasicSelector.js';
import BaseURLSelector from '../../../../src/streaming/utils/BaseURLSelector.js';
import BaseURL from '../../../../src/dash/vo/BaseURL.js';
import EventBus from '../../../../src/core/EventBus.js';
import Events from '../../../../src/core/events/Events.js';
import ContentSteeringSelectorMock from '../../mocks/ContentSteeringSelectorMock.js';
import chai from 'chai';

const expect = chai.expect;
const context = {};
const SERVICE_LOCATION_A = 'a';
const SERVICE_LOCATION_B = 'b';
const contentSteeringSelectorMock = new ContentSteeringSelectorMock();

const dummyBaseURLTreeModel = {
    getForPath: () => {
        return [{
            baseUrls: [
                new BaseURL('http://www.example.com/', SERVICE_LOCATION_A)
            ],
            selectedIdx: NaN
        }, {
            baseUrls: [
                new BaseURL('http://www2.example.com/', SERVICE_LOCATION_B)
            ],
            selectedIdx: NaN
        }];
    }
};

const dummyBlacklistController = {
    contains: sl => sl == SERVICE_LOCATION_B
};

describe('BaseURLController', function () {

    it('should add event handlers again after reset', () => {
        const localContext = {};
        const localEventBus = EventBus(localContext).getInstance();
        const invalidateSpy = chai.spy();
        const localAdapter = {
            getIsDVB: () => false
        };
        const localBaseURLTreeModel = {
            invalidateSelectedIndexes: invalidateSpy,
            setConfig: () => {
            },
            update: () => {
            },
            reset: () => {
            },
            getForPath: () => [],
            getBaseUrls: () => []
        };
        const localBaseURLSelector = {
            chooseSelector: () => {
            },
            initialize: () => {
            },
            reset: () => {
            },
            select: () => {
            }
        };

        const localBaseURLController = BaseURLController(localContext).create();
        localBaseURLController.setConfig({
            adapter: localAdapter,
            baseURLTreeModel: localBaseURLTreeModel,
            baseURLSelector: localBaseURLSelector
        });
        localBaseURLController.initialize({});

        localEventBus.trigger(Events.SERVICE_LOCATION_BASE_URL_BLACKLIST_CHANGED, { entry: 'a' });
        expect(invalidateSpy).to.have.been.called.exactly(1);

        localBaseURLController.reset();
        localEventBus.trigger(Events.SERVICE_LOCATION_BASE_URL_BLACKLIST_CHANGED, { entry: 'b' });
        expect(invalidateSpy).to.have.been.called.exactly(1);

        localBaseURLController.initialize({});
        localEventBus.trigger(Events.SERVICE_LOCATION_BASE_URL_BLACKLIST_CHANGED, { entry: 'c' });
        expect(invalidateSpy).to.have.been.called.exactly(2);

        localBaseURLController.reset();
    });

    it('should return undefined if resolution fails at any level', () => {

        const basicSelector = BasicSelector(context).create({
            blacklistController: dummyBlacklistController
        });

        const baseURLSelector = BaseURLSelector(context).create();
        baseURLSelector.setConfig({
            selector: basicSelector,
            contentSteeringSelector: contentSteeringSelectorMock
        });

        const baseURLController = BaseURLController(context).create();
        baseURLController.setConfig({
            baseURLTreeModel: dummyBaseURLTreeModel,
            baseURLSelector: baseURLSelector
        });

        const selected = baseURLController.resolve();

        expect(selected).to.be.undefined; // jshint ignore:line
    });
});
