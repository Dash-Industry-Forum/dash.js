import ManifestLoader from '../../../../src/streaming/ManifestLoader.js';
import Events from '../../../../src/core/events/Events.js';
import EventBus from '../../../../src/core/EventBus.js';
import Errors from '../../../../src/core/errors/Errors.js';
import Settings from '../../../../src/core/Settings.js';
import ErrorHandlerMock from '../../mocks/ErrorHandlerMock.js';
import ManifestModelMock from '../../mocks/ManifestModelMock.js';
import DashMetricsMock from '../../mocks/DashMetricsMock.js';
import MediaPlayerModelMock from '../../mocks/MediaPlayerModelMock.js';
import DebugMock from '../../mocks/DebugMock.js';

import {expect} from 'chai';
import sinon from 'sinon';

describe('ManifestLoader', function () {
    const context = {};
    const eventBus = EventBus(context).getInstance();
    let manifestLoader;
    let errorHandlerMock;
    let manifestModelMock;
    let dashMetricsMock;
    let mediaPlayerModelMock;
    let debugMock;
    let settings;

    beforeEach(function () {
        errorHandlerMock = new ErrorHandlerMock();
        manifestModelMock = new ManifestModelMock();
        dashMetricsMock = new DashMetricsMock();
        mediaPlayerModelMock = new MediaPlayerModelMock();
        debugMock = new DebugMock();
        settings = Settings(context).getInstance();

        manifestModelMock.setValue({
            url: 'http://example.com/manifest.mpd',
            originalUrl: 'http://example.com/manifest.mpd'
        });

        manifestLoader = ManifestLoader(context).create({
            errHandler: errorHandlerMock,
            manifestModel: manifestModelMock,
            dashMetrics: dashMetricsMock,
            mediaPlayerModel: mediaPlayerModelMock,
            debug: debugMock,
            settings: settings
        });
    });

    afterEach(function () {
        manifestLoader.reset();
        eventBus.reset();
        settings.reset();
    });

    describe('when MPD_EXPIRE_UPDATE event is triggered', function () {

        it('should trigger INTERNAL_MANIFEST_LOADED with MANIFEST_LOADER_PARSING_FAILURE_ERROR_CODE when parser.parse() throws an exception', function (done) {
            const errorHandler = function (event) {
                try {
                    expect(event.manifest).to.be.null;
                    expect(event.error).to.exist;
                    expect(event.error.code).to.equal(Errors.MANIFEST_LOADER_PARSING_FAILURE_ERROR_CODE);

                    eventBus.off(Events.INTERNAL_MANIFEST_LOADED, errorHandler);
                    done();
                } catch (error) {
                    done(error);
                }
            };

            eventBus.on(Events.INTERNAL_MANIFEST_LOADED, errorHandler, this);

            const malformedXml = '<?xml version="1.0" encoding="UTF-8"?><MPD xmlns="urn:mpeg:dash:schema:mpd:2011"><InvalidTag></MPD>';

            eventBus.trigger(Events.MPD_EXPIRE_UPDATE, {
                xmlString: malformedXml
            });
        });

        it('should trigger INTERNAL_MANIFEST_LOADED with MANIFEST_LOADER_PARSING_FAILURE_ERROR_CODE when createParser returns null', function (done) {
            const errorHandler = function (event) {
                try {
                    expect(event.manifest).to.be.null;
                    expect(event.error).to.exist;
                    expect(event.error.code).to.equal(Errors.MANIFEST_LOADER_PARSING_FAILURE_ERROR_CODE);

                    eventBus.off(Events.INTERNAL_MANIFEST_LOADED, errorHandler);
                    done();
                } catch (error) {
                    done(error);
                }
            };

            eventBus.on(Events.INTERNAL_MANIFEST_LOADED, errorHandler, this);

            const unrecognizedFormat = 'This is not a valid manifest format';

            eventBus.trigger(Events.MPD_EXPIRE_UPDATE, {
                xmlString: unrecognizedFormat
            });
        });

        it('should not trigger INTERNAL_MANIFEST_LOADED when _updateManifest is called but xlinkController is null', function () {
            // Reset manifest loader to simulate xlinkController being null
            manifestLoader.reset();

            const spy = sinon.spy();
            eventBus.on(Events.INTERNAL_MANIFEST_LOADED, spy);

            eventBus.trigger(Events.MPD_EXPIRE_UPDATE, {
                xmlString: '<?xml version="1.0" encoding="UTF-8"?><MPD xmlns="urn:mpeg:dash:schema:mpd:2011"></MPD>'
            });

            // Assert: No event should be triggered
            sinon.assert.notCalled(spy);

            eventBus.off(Events.INTERNAL_MANIFEST_LOADED, spy);
        });

        it('should successfully process valid DASH manifest and trigger INTERNAL_MANIFEST_LOADED without error', function (done) {
            const successHandler = function (event) {
                try {
                    expect(event.manifest).to.exist;
                    expect(event.error).to.be.undefined;

                    eventBus.off(Events.INTERNAL_MANIFEST_LOADED, successHandler);
                    done();
                } catch (error) {
                    done(error);
                }
            };

            eventBus.on(Events.INTERNAL_MANIFEST_LOADED, successHandler, this);

            const validDashManifest = `<?xml version="1.0" encoding="UTF-8"?>
                <MPD xmlns="urn:mpeg:dash:schema:mpd:2011"
                     profiles="urn:mpeg:dash:profile:isoff-live:2011"
                     type="dynamic"
                     minimumUpdatePeriod="PT10S"
                     publishTime="2023-01-01T00:00:00Z">
                    <Period id="1" start="PT0S">
                        <AdaptationSet mimeType="video/mp4">
                            <Representation id="1" bandwidth="1000000">
                                <SegmentTemplate media="segment-$Number$.m4s"
                                               initialization="init.m4s"
                                               timescale="1000"
                                               startNumber="1">
                                    <SegmentTimeline>
                                        <S t="0" d="10000" r="5"/>
                                    </SegmentTimeline>
                                </SegmentTemplate>
                            </Representation>
                        </AdaptationSet>
                    </Period>
                </MPD>`;

            eventBus.trigger(Events.MPD_EXPIRE_UPDATE, {
                xmlString: validDashManifest
            });
        });
    });
});