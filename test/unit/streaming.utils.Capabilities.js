import Capabilities from '../../src/streaming/utils/Capabilities.js';
import Settings from '../../src/core/Settings.js';

import {expect} from 'chai';

let settings;
let capabilities;

const EssentialPropertyThumbNail = {
    schemeIdUri: 'http://dashif.org/thumbnail_tile',
    value: 'somevalue'
};
const EssentialPropertyOwn = {
    schemeIdUri: 'tag:dashif.org:myOwnFeature',
    value: 'somevalue'
};
const EssentialPropertyOwnSecond = {
    schemeIdUri: 'tag:dashif.org:mySecondOwnFeature',
    value: 'somevalue'
};

describe('CapabilitiesFilter', function () {
    beforeEach(function () {
        settings = Settings({}).getInstance();
        capabilities = Capabilities({}).getInstance();

        capabilities.setConfig({
            settings: settings
        });
    });

    describe('supports EssentialProperty', function () {
        it('should return true if EssentialProperty value is known', function () {
            let res = capabilities.supportsEssentialProperty(EssentialPropertyThumbNail);
            expect(res).to.be.true;
        });

        it('should return false if EssentialProperty value is not known', function () {
            let res = capabilities.supportsEssentialProperty(EssentialPropertyOwn);
            expect(res).to.be.false;
        });

        it('should return false if EssentialProperty value is not known when new values are registered in settings', function () {
            settings.update({ streaming: { capabilities: { supportedEssentialProperties: [EssentialPropertyOwn.schemeIdUri] }} });
            
            let res = capabilities.supportsEssentialProperty(EssentialPropertyOwnSecond);
            expect(res).to.be.false;
        });

        it('should return true if EssentialProperty value is registered in settings', function () {
            settings.update({ streaming: { capabilities: { supportedEssentialProperties: [EssentialPropertyOwn.schemeIdUri] }} });

            let res = capabilities.supportsEssentialProperty(EssentialPropertyOwn);
            expect(res).to.be.true;
        });

        it('should return true for internally known EssentialPropertiesy when new values are registered in settings', function () {
            settings.update({ streaming: { capabilities: { supportedEssentialProperties: [EssentialPropertyOwn.schemeIdUri] }} });

            let res = capabilities.supportsEssentialProperty(EssentialPropertyThumbNail);
            expect(res).to.be.true;
        });
    });
});
