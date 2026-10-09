import LocationSelector from '../../../../src/streaming/utils/LocationSelector.js';
import BaseURL from '../../../../src/dash/vo/BaseURL.js';
import EventBus from '../../../../src/core/EventBus.js';
import Events from '../../../../src/core/events/Events.js';
import Settings from '../../../../src/core/Settings.js';

import {expect} from 'chai';

describe('LocationSelector', function () {
    it('should listen to blacklist add events again after reset', function () {
        const context = {};
        const settings = Settings(context).getInstance();
        settings.update({ streaming: { applyContentSteering: true } });

        const eventBus = EventBus(context).getInstance();
        const locationSelector = LocationSelector(context).create();
        locationSelector.setConfig({
            contentSteeringController: {
                getCurrentSteeringResponseData: () => {
                    return {
                        pathwayPriority: ['a', 'b']
                    };
                }
            }
        });
        const mpdLocations = [
            new BaseURL('http://www.example.com/', 'a'),
            new BaseURL('http://www2.example.com/', 'b')
        ];

        locationSelector.initialize();

        let selected = locationSelector.select(mpdLocations);
        expect(selected.serviceLocation).to.equal('a');

        eventBus.trigger(Events.SERVICE_LOCATION_LOCATION_BLACKLIST_ADD, {
            entry: 'a'
        });
        selected = locationSelector.select(mpdLocations);
        expect(selected.serviceLocation).to.equal('b');

        locationSelector.reset();
        eventBus.trigger(Events.SERVICE_LOCATION_LOCATION_BLACKLIST_ADD, {
            entry: 'b'
        });
        selected = locationSelector.select(mpdLocations);
        expect(selected.serviceLocation).to.equal('a');

        locationSelector.initialize();
        eventBus.trigger(Events.SERVICE_LOCATION_LOCATION_BLACKLIST_ADD, {
            entry: 'a'
        });
        selected = locationSelector.select(mpdLocations);
        expect(selected.serviceLocation).to.equal('b');
    });
});