import BaseURLController from '../../../../src/streaming/controllers/BaseURLController.js';
import BasicSelector from '../../../../src/streaming/utils/baseUrlResolution/BasicSelector.js';
import BaseURLSelector from '../../../../src/streaming/utils/BaseURLSelector.js';
import BaseURL from '../../../../src/dash/vo/BaseURL.js';
import EventBus from '../../../../src/core/EventBus.js';
import Events from '../../../../src/core/events/Events.js';
import ContentSteeringSelectorMock from '../../mocks/ContentSteeringSelectorMock.js';
import MediaPlayerEvents from '../../../../src/streaming/MediaPlayerEvents.js';
import chai from 'chai';
import sinon from 'sinon';

const expect = chai.expect;
const context = {};
const eventBus = EventBus(context).getInstance();
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
    },
    getAvailableBaseUrlsForElement: () => {
        return [];
    }
};

const dummyBlacklistController = {
    contains: sl => sl == SERVICE_LOCATION_B
};

describe('BaseURLController', function () {

    beforeEach(() => {
        eventBus.reset();
    });

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
            getBaseUrlsForPayload: () => ({ rootBaseUrls: [], childBaseUrls: [] })
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

    it('should emit all BaseURLs from the current manifest when BaseURLs are updated', () => {
        const spy = sinon.spy();
        const manifest = {
            Period: [
                {
                    BaseURL: true
                }
            ]
        };
        const baseUrls = [
            new BaseURL('https://example.com/cdn_alpha/', 'alpha'),
            new BaseURL('https://example.com/cdn_beta/', 'beta'),
            new BaseURL('https://example.com/cdn_gamma/', 'gamma')
        ];
        const baseURLTreeModel = {
            update: sinon.spy(),
            getBaseUrlsForPayload: sinon.stub()
        };
        const baseURLSelector = {
            chooseSelector: sinon.spy()
        };
        const adapter = {
            getIsDVB: sinon.stub().withArgs(manifest).returns(false)
        };
        const baseURLController = BaseURLController(context).create();

        baseURLTreeModel.getBaseUrlsForPayload.returns({
            rootBaseUrls: [new BaseURL('https://example.com/manifest.mpd', 'https://example.com/manifest.mpd')],
            childBaseUrls: baseUrls
        });

        eventBus.on(MediaPlayerEvents.BASE_URLS_UPDATED, spy);
        baseURLController.setConfig({
            baseURLTreeModel,
            baseURLSelector,
            adapter
        });

        baseURLController.update(manifest);

        expect(spy.calledOnce).to.be.true; // jshint ignore:line
        expect(spy.firstCall.args[0].baseUrls).to.deep.equal(baseUrls);
        expect(baseURLTreeModel.update.calledOnceWithExactly(manifest)).to.be.true; // jshint ignore:line
        expect(baseURLSelector.chooseSelector.calledOnceWithExactly(false)).to.be.true; // jshint ignore:line
    });

    it('should keep manifest baseUri fallback when some periods inherit BaseURL resolution', () => {
        const manifest = {
            Period: [
                {
                    BaseURL: true
                },
                {}
            ]
        };
        const rootBaseUrl = new BaseURL('https://example.com/manifest.mpd', 'https://example.com/manifest.mpd');
        const periodBaseUrl = new BaseURL('https://example.com/cdn_alpha/', 'alpha');
        const event = _updateAndGetBaseUrlsUpdatedEvent(manifest, rootBaseUrl, [periodBaseUrl]);

        const baseUrls = event.baseUrls;

        expect(baseUrls).to.have.lengthOf(2);
        expect(baseUrls.map((baseUrl) => baseUrl.serviceLocation)).to.deep.equal([rootBaseUrl.serviceLocation, 'alpha']);
    });

    it('should keep manifest baseUri fallback when child BaseURLs are relative', () => {
        const manifest = {
            Period: [
                {
                    BaseURL: true
                }
            ]
        };
        const rootBaseUrl = new BaseURL('https://example.com/manifest.mpd', 'https://example.com/manifest.mpd');
        const periodBaseUrl = new BaseURL('cdn_alpha/', 'alpha');
        const event = _updateAndGetBaseUrlsUpdatedEvent(manifest, rootBaseUrl, [periodBaseUrl]);

        const baseUrls = event.baseUrls;

        expect(baseUrls).to.have.lengthOf(2);
        expect(baseUrls.map((baseUrl) => baseUrl.serviceLocation)).to.deep.equal([rootBaseUrl.serviceLocation, 'alpha']);
    });

    it('should not return stale BaseURLs from previous manifest updates', () => {
        const firstManifest = {
            Period: [
                {
                    BaseURL: true
                }
            ]
        };
        const secondManifest = {};
        const rootBaseUrl = new BaseURL('https://example.com/manifest.mpd', 'https://example.com/manifest.mpd');
        const periodBaseUrl = new BaseURL('https://example.com/cdn_alpha/', 'alpha');
        const baseURLTreeModel = {
            update: () => {},
            getBaseUrlsForPayload: sinon.stub()
        };
        const adapter = {
            getIsDVB: sinon.stub()
        };
        const baseURLController = BaseURLController(context).create();
        const spy = sinon.spy();

        eventBus.on(MediaPlayerEvents.BASE_URLS_UPDATED, spy);
        baseURLTreeModel.getBaseUrlsForPayload.onFirstCall().returns({ rootBaseUrls: [rootBaseUrl], childBaseUrls: [periodBaseUrl] });
        baseURLTreeModel.getBaseUrlsForPayload.onSecondCall().returns({ rootBaseUrls: [rootBaseUrl], childBaseUrls: [] });
        adapter.getIsDVB.withArgs(firstManifest).returns(false);
        adapter.getIsDVB.withArgs(secondManifest).returns(false);
        baseURLController.setConfig({
            baseURLTreeModel,
            baseURLSelector: {
                chooseSelector: () => {}
            },
            adapter
        });

        baseURLController.update(firstManifest);
        baseURLController.update(secondManifest);
        const baseUrls = spy.secondCall.args[0].baseUrls;

        expect(baseUrls).to.have.lengthOf(1);
        expect(baseUrls[0].serviceLocation).to.equal(rootBaseUrl.serviceLocation);
    });
});

function _updateAndGetBaseUrlsUpdatedEvent(manifest, rootBaseUrl, periodBaseUrls) {
    const baseURLTreeModel = {
        update: () => {},
        getBaseUrlsForPayload: sinon.stub()
    };
    const baseURLSelector = {
        chooseSelector: () => {}
    };
    const adapter = {
        getIsDVB: sinon.stub().withArgs(manifest).returns(false)
    };
    const baseURLController = BaseURLController(context).create();
    const spy = sinon.spy();

    eventBus.on(MediaPlayerEvents.BASE_URLS_UPDATED, spy);
    baseURLTreeModel.getBaseUrlsForPayload.returns({ rootBaseUrls: [rootBaseUrl], childBaseUrls: periodBaseUrls });
    baseURLController.setConfig({
        baseURLTreeModel,
        baseURLSelector,
        adapter
    });
    baseURLController.update(manifest);

    return spy.firstCall.args[0];
}
