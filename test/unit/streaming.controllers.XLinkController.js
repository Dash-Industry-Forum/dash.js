import DashParser from '../../src/dash/parser/DashParser';
import URLUtils from '../../src/streaming/utils/URLUtils';
import XLinkController from '../../src/streaming/controllers/XLinkController';
import Events from '../../src/core/events/Events';
import EventBus from '../../src/core/EventBus';

const fs = require('fs');
const domParser = require('xmldom').DOMParser;
const chai = require('chai');
const expect = chai.expect;

const context = {};
const eventBus = EventBus(context).getInstance();

describe('XLinkController', function () {
    let xLinkController;


    function parseManifest(url, xml, xlinkController) {
        let urlUtils = URLUtils(context).getInstance();
        let baseUri = urlUtils.parseBaseUrl(url);
        let parser = DashParser(context).create({});
        const manifest = parser.parse(xml, xlinkController);

        if (manifest) {
            manifest.url = url;

            // URL from which the MPD was originally retrieved (MPD updates will not change this value)
            if (!manifest.originalUrl) {
                manifest.originalUrl = manifest.url;
            }

            manifest.baseUri = baseUri;
            return manifest;
        }
        return null;
    }

    beforeEach(function () {
        if (typeof window === 'undefined') {
            global.window = {
                performance: {
                    now: function () {
                        return Date.now();
                    }
                },
                DOMParser: domParser
            };
        }
    });

    afterEach(function () {
        delete global.window;
    });

    beforeEach(function () {
        xLinkController = XLinkController(context).create({});
    });

    afterEach(function () {
        xLinkController.reset();
        xLinkController = null;
    });

    it('should resolve manifest on load', function(done) {
        let manifest;
        function onXLinkReady(e) {
            eventBus.off(Events.XLINK_READY, onXLinkReady, this);
            expect(e.manifest.url).to.equal('https://dash.akamaized.net/akamai/bbb_30fps/bbb_30fps.mpd');
            done();
        }
        eventBus.on(Events.XLINK_READY, onXLinkReady, this);

        let xml = fs.readFileSync(__dirname + '/data/dash/manifest.xml', 'utf8');

        manifest = parseManifest('https://dash.akamaized.net/akamai/bbb_30fps/bbb_30fps.mpd', xml, xLinkController);
        xLinkController.resolveManifestOnLoad(manifest);
    });
});
