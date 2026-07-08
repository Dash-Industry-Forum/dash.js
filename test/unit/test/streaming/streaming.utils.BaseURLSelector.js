import BaseURLSelector from '../../../../src/streaming/utils/BaseURLSelector.js';
import BaseURL from '../../../../src/dash/vo/BaseURL.js';
import Constants from '../../../../src/streaming/constants/Constants.js';
import EventBus from '../../../../src/core/EventBus.js';
import Events from '../../../../src/core/events/Events.js';
import Settings from '../../../../src/core/Settings.js';

import {expect} from 'chai';

const context = {};
const baseURLSelector = BaseURLSelector(context).create();

describe('BaseURLSelector', function () {
    it('should throw an error when chooseSelector is called and parameter is not a boolean', function () {
        expect(baseURLSelector.chooseSelector.bind()).to.be.throw(Constants.BAD_ARGUMENT_ERROR);
    });

    it('should return an undefined selector when select is called with no data parameter', function () {
        const selector = baseURLSelector.select();

        expect(selector).to.be.undefined; // jshint ignore:line
    });

    it('should clear and re-add event handlers on reset and initialize', function () {
        const localContext = {};
        const localSettings = Settings(localContext).getInstance();
        localSettings.update({ streaming: { applyContentSteering: false } });
        const localBaseURLSelector = BaseURLSelector(localContext).create();
        const localEventBus = EventBus(localContext).getInstance();
        const data = {
            baseUrls: [
                new BaseURL('http://www.example.com/', 'a'),
                new BaseURL('http://www2.example.com/', 'b')
            ],
            selectedIdx: NaN
        };

        localBaseURLSelector.initialize();

        let selected = localBaseURLSelector.select(data);
        expect(selected.serviceLocation).to.equal('a');

        localEventBus.trigger(Events.SERVICE_LOCATION_BASE_URL_BLACKLIST_ADD, {
            entry: 'a'
        });
        data.selectedIdx = NaN;
        selected = localBaseURLSelector.select(data);
        expect(selected.serviceLocation).to.equal('b');

        localBaseURLSelector.reset();
        localEventBus.trigger(Events.SERVICE_LOCATION_BASE_URL_BLACKLIST_ADD, {
            entry: 'b'
        });
        data.selectedIdx = NaN;
        selected = localBaseURLSelector.select(data);
        expect(selected.serviceLocation).to.equal('a');

        localBaseURLSelector.initialize();
        localEventBus.trigger(Events.SERVICE_LOCATION_BASE_URL_BLACKLIST_ADD, {
            entry: 'a'
        });
        data.selectedIdx = NaN;
        selected = localBaseURLSelector.select(data);
        expect(selected.serviceLocation).to.equal('b');
    });
});
