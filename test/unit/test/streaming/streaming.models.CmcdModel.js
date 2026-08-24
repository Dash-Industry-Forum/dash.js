import CmcdModel from '../../../../src/streaming/models/CmcdModel.js';
import Settings from '../../../../src/core/Settings.js';
import {HTTPRequest} from '../../../../src/streaming/vo/metrics/HTTPRequest.js';
import Constants from '../../../../src/streaming/constants/Constants.js';
import AbrControllerMock from '../../mocks/AbrControllerMock.js';
import DashMetricsMock from '../../mocks/DashMetricsMock.js';
import PlaybackControllerMock from '../../mocks/PlaybackControllerMock.js';
import ThroughputControllerMock from '../../mocks/ThroughputControllerMock.js';
import ServiceDescriptionControllerMock from '../../mocks/ServiceDescriptionControllerMock.js';
import { SfItem } from '@svta/cml-structured-field-values';

import {expect} from 'chai';
import sinon from 'sinon';

const context = {};

describe('CmcdModel', function () {
    let cmcdModel;
    let abrControllerMock;
    let dashMetricsMock;
    let playbackControllerMock;
    let throughputControllerMock;
    let serviceDescriptionControllerMock;
    let settings;

    beforeEach(function () {
        settings = Settings(context).getInstance();
        abrControllerMock = new AbrControllerMock();
        dashMetricsMock = new DashMetricsMock();
        playbackControllerMock = new PlaybackControllerMock();
        throughputControllerMock = new ThroughputControllerMock();
        serviceDescriptionControllerMock = new ServiceDescriptionControllerMock();

        cmcdModel = CmcdModel(context).getInstance();
        cmcdModel.setConfig({
            abrController: abrControllerMock,
            dashMetrics: dashMetricsMock,
            playbackController: playbackControllerMock,
            throughputController: throughputControllerMock,
            serviceDescriptionController: serviceDescriptionControllerMock
        });

        settings.update({
            streaming: {
                cmcd: {
                    enabled: true,
                    version: 1,
                    sid: 'test-session-id',
                    cid: 'test-content-id',
                    includeInRequests: ['segment', 'mpd']
                }
            }
        });
    });

    afterEach(function () {
        cmcdModel.reset();
        settings.reset();
    });

    describe('setup and initialization', function () {
        it('should initialize with default values', function () {
            expect(cmcdModel).to.exist;
            expect(typeof cmcdModel.setup).to.equal('function');
            expect(typeof cmcdModel.reset).to.equal('function');
            expect(typeof cmcdModel.deriveCmcdDataForRequest).to.equal('function');
        });

        it('should reset to initial settings', function () {
            cmcdModel.resetInitialSettings();
            // After reset, model should be in clean state
            expect(cmcdModel).to.exist;
        });
    });

    describe('getCmcdData for different request types', function () {
        it('should return CMCD data for MPD requests', function () {
            const request = {
                type: HTTPRequest.MPD_TYPE,
                url: 'http://example.com/manifest.mpd'
            };

            const data = cmcdModel.deriveCmcdDataForRequest(request);
            expect(data).to.exist;
            expect(data.ot).to.equal('m'); // manifest object type
        });

        it('should return CMCD data for media segment requests', function () {
            const request = {
                type: HTTPRequest.MEDIA_SEGMENT_TYPE,
                mediaType: Constants.VIDEO,
                bandwidth: 1000000,
                duration: 4,
                representation: {
                    mediaInfo: {
                        type: Constants.VIDEO
                    }
                }
            };

            const data = cmcdModel.deriveCmcdDataForRequest(request);
            expect(data).to.exist;
            expect(data.ot).to.equal('v'); // video object type
            expect(data.br).to.deep.equal([new SfItem(1000, { v: true })]); // bitrate in kbps
            expect(data.d).to.equal(4000); // duration in ms
        });

        it('should rebuild the top-bitrate list once when tb and tpb share the media info', function () {
            const mediaInfo = { type: Constants.VIDEO };
            let rebuilds = 0;
            abrControllerMock.getPossibleVoRepresentationsFilteredBySettings = () => {
                rebuilds++;
                return [{ bitrateInKbit: 2000 }];
            };
            // A video stream processor whose media info is the same object the request carries, so
            // tb (request media info) and tpb (processor media info) resolve the same list.
            const videoSp = {
                getType: () => Constants.VIDEO,
                getMediaInfo: () => mediaInfo,
                probeNextRequest: () => undefined
            };
            playbackControllerMock.getStreamController().getActiveStream().getStreamProcessors = () => [videoSp];
            cmcdModel.reset(); // repopulates streamProcessors from the configured playback controller

            const request = {
                type: HTTPRequest.MEDIA_SEGMENT_TYPE,
                mediaType: Constants.VIDEO,
                bandwidth: 1000000,
                duration: 4,
                url: 'http://example.com/seg.m4s',
                representation: { mediaInfo }
            };

            const data = cmcdModel.deriveCmcdDataForRequest(request);
            expect(data).to.exist;
            expect(data).to.have.property('tb');
            expect(data).to.have.property('tpb');
            expect(rebuilds).to.equal(1);
        });

        it('should return CMCD data for init segment requests', function () {
            const request = {
                type: HTTPRequest.INIT_SEGMENT_TYPE,
                url: 'http://example.com/init.mp4'
            };

            const data = cmcdModel.deriveCmcdDataForRequest(request);
            expect(data).to.exist;
            expect(data.ot).to.equal('i'); // init object type
            expect(data.su).to.equal(true); // startup
        });

        it('should return an empty object for request types not in the filter', function () {
            const request = {
                type: 'unsupported_type',
                url: 'http://example.com/file'
            };

            const data = cmcdModel.deriveCmcdDataForRequest(request);
            expect(data).to.deep.equal({});
        });
    });

    describe('event handlers', function () {
        it('should handle playback rate changes', function () {
            const rateChangeData = { playbackRate: 2.0 };
            const result = cmcdModel.onPlaybackRateChanged(rateChangeData);

            expect(result).to.deep.equal({ pr: 2.0 });
        });

        it('should return null for playback rate change without playbackRate', function () {
            const result = cmcdModel.onPlaybackRateChanged({});
            expect(result).to.be.null;
        });

        it('should handle manifest loaded events', function () {
            const manifestData = {
                data: {},
                protocol: 'DASH'
            };

            const result = cmcdModel.onManifestLoaded(manifestData);
            expect(result.sf).to.equal('d'); // DASH streaming format
            expect(result.st).to.exist;
        });

        it('should handle playback seeking events', function () {
            cmcdModel.onPlaybackSeeking();
            expect(cmcdModel.wasPlaying()).to.be.false;
        });
    });

    describe('isIncludedInRequestFilter', function () {
        it('should return true for included request types', function () {
            const isIncluded = cmcdModel.isIncludedInRequestFilter(HTTPRequest.MEDIA_SEGMENT_TYPE);
            expect(isIncluded).to.be.true;
        });

        it('should return false for excluded request types', function () {
            settings.update({
                streaming: {
                    cmcd: {
                        enabled: true,
                        includeInRequests: ['mpd'] // only MPD requests
                    }
                }
            });

            const isIncluded = cmcdModel.isIncludedInRequestFilter(HTTPRequest.MEDIA_SEGMENT_TYPE);
            expect(isIncluded).to.be.false;
        });
    });

    describe('calculateMsd', function () {
        it('should return MSD data when playback has started', function () {
            cmcdModel.onPlaybackStarted();
            cmcdModel.onPlaybackPlaying();

            const msdData = cmcdModel.calculateMsd();
            expect(msdData).to.have.property('msd').that.is.a('number');
        });

        it('should return empty object when playback has not started', function () {
            const msdData = cmcdModel.calculateMsd();
            expect(Object.keys(msdData)).to.have.length(0);
        });
    });

    describe('getEventModeData', function () {
        it('should return event mode CMCD data', function () {
            const eventData = cmcdModel.getEventModeData();
            expect(eventData).to.exist;
        });
    });

    describe('bsd key', function () {
        it('should include bsd key when rebuffering has occurred', function () {
            const clock = sinon.useFakeTimers();
            const mediaType = Constants.VIDEO;
            const request = {
                type: HTTPRequest.MEDIA_SEGMENT_TYPE,
                mediaType: mediaType,
                representation: {
                    mediaInfo: {
                        type: mediaType
                    }
                }
            };

            cmcdModel.onRebufferingStarted(mediaType);
            clock.tick(500);
            cmcdModel.onPlaybackPlaying();

            const data = cmcdModel.deriveCmcdDataForRequest(request);
            expect(data.bsd).to.deep.equal([new SfItem(500, { v: true })]);

            const data2 = cmcdModel.deriveCmcdDataForRequest(request);
            expect(data2.bsd).to.not.exist;
            clock.restore();
        });
    });

    describe('CmcdConfigAccessor integration', function () {
        it('should return CMCD parameters from manifest when present', function () {
            // Ensure applyParametersFromMpd is true
            settings.update({
                streaming: {
                    cmcd: {
                        enabled: true,
                        version: 1,
                        applyParametersFromMpd: true,
                        sid: 'test-session-id',
                        cid: 'test-content-id',
                        includeInRequests: ['segment', 'mpd']
                    }
                }
            });

            const cmcdParams = {
                version: 2,
                sessionID: 'manifest-session-id',
                contentID: 'manifest-content-id'
            };

            serviceDescriptionControllerMock.getServiceDescriptionSettings = sinon.stub().returns({
                clientDataReporting: {
                    cmcdParameters: cmcdParams
                }
            });

            const result = cmcdModel.getCmcdParametersFromManifest();

            expect(result).to.deep.equal(cmcdParams);
        });

        it('should return empty object when no CMCD parameters in manifest', function () {
            serviceDescriptionControllerMock.getServiceDescriptionSettings = sinon.stub().returns({
                clientDataReporting: {}
            });

            const result = cmcdModel.getCmcdParametersFromManifest();

            expect(result).to.deep.equal({});
        });
    });
});
