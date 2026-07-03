import BaseURLController from '../../../../src/streaming/controllers/BaseURLController.js';
import BasicSelector from '../../../../src/streaming/utils/baseUrlResolution/BasicSelector.js';
import BaseURLSelector from '../../../../src/streaming/utils/BaseURLSelector.js';
import BaseURL from '../../../../src/dash/vo/BaseURL.js';
import ContentSteeringSelectorMock from '../../mocks/ContentSteeringSelectorMock.js';
import EventBus from '../../../../src/core/EventBus.js';
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
    getBaseUrls: () => {
        return [];
    }
};

const contentSteeringControllerMock = {
    getSynthesizedBaseUrlElements: () => []
};

const dummyBlacklistController = {
    contains: sl => sl == SERVICE_LOCATION_B
};

describe('BaseURLController', function () {

    beforeEach(() => {
        eventBus.reset();
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
            getBaseUrls: sinon.stub().withArgs(manifest).returns([new BaseURL('https://example.com/manifest.mpd', 'https://example.com/manifest.mpd')])
        };
        const baseURLSelector = {
            chooseSelector: sinon.spy()
        };
        const adapter = {
            getIsDVB: sinon.stub().withArgs(manifest).returns(false),
            getBaseURLsFromElement: sinon.stub()
        };
        const baseURLController = BaseURLController(context).create();

        adapter.getBaseURLsFromElement.withArgs(manifest.Period[0]).returns(baseUrls);

        eventBus.on(MediaPlayerEvents.BASE_URLS_UPDATED, spy);
        baseURLController.setConfig({
            baseURLTreeModel,
            baseURLSelector,
            adapter,
            contentSteeringController: contentSteeringControllerMock
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
            getBaseUrls: sinon.stub()
        };
        const adapter = {
            getIsDVB: sinon.stub(),
            getBaseURLsFromElement: sinon.stub()
        };
        const baseURLController = BaseURLController(context).create();
        const spy = sinon.spy();

        eventBus.on(MediaPlayerEvents.BASE_URLS_UPDATED, spy);
        baseURLTreeModel.getBaseUrls.withArgs(firstManifest).returns([rootBaseUrl]);
        baseURLTreeModel.getBaseUrls.withArgs(secondManifest).returns([rootBaseUrl]);
        adapter.getIsDVB.withArgs(firstManifest).returns(false);
        adapter.getIsDVB.withArgs(secondManifest).returns(false);
        adapter.getBaseURLsFromElement.withArgs(firstManifest.Period[0]).returns([periodBaseUrl]);
        baseURLController.setConfig({
            baseURLTreeModel,
            baseURLSelector: {
                chooseSelector: () => {}
            },
            adapter,
            contentSteeringController: contentSteeringControllerMock
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
        getBaseUrls: sinon.stub().withArgs(manifest).returns([rootBaseUrl])
    };
    const baseURLSelector = {
        chooseSelector: () => {}
    };
    const adapter = {
        getIsDVB: sinon.stub().withArgs(manifest).returns(false),
        getBaseURLsFromElement: sinon.stub()
    };
    const baseURLController = BaseURLController(context).create();
    const spy = sinon.spy();

    eventBus.on(MediaPlayerEvents.BASE_URLS_UPDATED, spy);
    adapter.getBaseURLsFromElement.withArgs(manifest.Period[0]).returns(periodBaseUrls);
    if (manifest.Period[1]) {
        adapter.getBaseURLsFromElement.withArgs(manifest.Period[1]).returns([]);
    }
    baseURLController.setConfig({
        baseURLTreeModel,
        baseURLSelector,
        adapter,
        contentSteeringController: contentSteeringControllerMock
    });
    baseURLController.update(manifest);

    return spy.firstCall.args[0];
}
