import CmcdModel from '../../../../src/streaming/models/CmcdModel.js';
import Settings from '../../../../src/core/Settings.js';
import {HTTPRequest} from '../../../../src/streaming/vo/metrics/HTTPRequest.js';
import Constants from '../../../../src/streaming/constants/Constants.js';
import AbrControllerMock from '../../mocks/AbrControllerMock.js';
import DashMetricsMock from '../../mocks/DashMetricsMock.js';
import PlaybackControllerMock from '../../mocks/PlaybackControllerMock.js';
import ThroughputControllerMock from '../../mocks/ThroughputControllerMock.js';
import ServiceDescriptionControllerMock from '../../mocks/ServiceDescriptionControllerMock.js';

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
            expect(typeof cmcdModel.getCmcdData).to.equal('function');
        });

        it('should reset to initial settings', function () {
            cmcdModel.resetInitialSettings();
            const genericData = cmcdModel.getGenericCmcdData();
            expect(genericData.sid).to.exist;
            expect(genericData.pr).to.not.exist; // pr should not be included if it equals 1
        });
    });

    describe('getGenericCmcdData', function () {
        it('should return basic CMCD data', function () {
            const data = cmcdModel.getGenericCmcdData();
            
            expect(data.v).to.equal(1);
            expect(data.sid).to.equal('test-session-id');
            expect(data.cid).to.equal('test-content-id');
            expect(data.ts).to.be.a('number');
        });

        it('should not include pr when playback rate is 1', function () {
            const data = cmcdModel.getGenericCmcdData();
            expect(data.pr).to.not.exist;
        });

        it('should include pr when playback rate is not 1', function () {
            cmcdModel.onPlaybackRateChanged({ playbackRate: 1.5 });
            const data = cmcdModel.getGenericCmcdData();
            expect(data.pr).to.equal(1.5);
        });
    });

    describe('getCmcdData for different request types', function () {
        it('should return CMCD data for MPD requests', function () {
            const request = {
                type: HTTPRequest.MPD_TYPE,
                url: 'http://example.com/manifest.mpd'
            };

            const data = cmcdModel.getCmcdData(request);
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

            const data = cmcdModel.getCmcdData(request);
            expect(data).to.exist;
            expect(data.ot).to.equal('v'); // video object type
            expect(data.br).to.equal(1000); // bitrate in kbps
            expect(data.d).to.equal(4000); // duration in ms
        });

        it('should return CMCD data for init segment requests', function () {
            const request = {
                type: HTTPRequest.INIT_SEGMENT_TYPE,
                url: 'http://example.com/init.mp4'
            };

            const data = cmcdModel.getCmcdData(request);
            expect(data).to.exist;
            expect(data.ot).to.equal('i'); // init object type
            expect(data.su).to.equal(true); // startup
        });

        it('should return an empty object for request types not in the filter', function () {
            const request = {
                type: 'unsupported_type',
                url: 'http://example.com/file'
            };

            const data = cmcdModel.getCmcdData(request);
            expect(data).to.deep.equal({});
        });
    });

    describe('event handlers', function () {
        it('should handle playback rate changes', function () {
            const rateChangeData = { playbackRate: 2.0 };
            cmcdModel.onPlaybackRateChanged(rateChangeData);
            
            const data = cmcdModel.getGenericCmcdData();
            expect(data.pr).to.equal(2.0);
        });

        it('should handle manifest loaded events', function () {
            const manifestData = {
                data: {},
                protocol: 'DASH'
            };
            
            dashMetricsMock.getCurrentManifestMetrics = sinon.stub().returns({ 
                DVRWindowSize: 60000 
            });
            
            cmcdModel.onManifestLoaded(manifestData);
            const data = cmcdModel.getGenericCmcdData();
            expect(data.sf).to.equal('d'); // DASH streaming format
        });

        it('should handle playback seeking events', function () {
            cmcdModel.onPlaybackSeeking();
            expect(cmcdModel.wasPlaying()).to.be.false;
        });

        it('should handle player error events', function () {
            const errorData = {
                error: {
                    code: 500
                }
            };
            
            cmcdModel.onPlayerError(errorData);
            const eventData = cmcdModel.triggerCmcdEventMode('e');
            expect(eventData.ec).to.equal(500);
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

    describe('updateMsdData', function () {
        it('should return MSD data for version 2', function () {
            settings.update({
                streaming: {
                    cmcd: {
                        version: 2
                    }
                }
            });
            
            cmcdModel.onPlaybackStarted();
            cmcdModel.onPlaybackPlaying();
            
            const msdData = cmcdModel.updateMsdData(Constants.CMCD_REPORTING_MODE.REQUEST);
            expect(msdData).to.have.property('msd').that.is.a('number');
        });

        it('should not return MSD data for version 1', function () {
            settings.update({
                streaming: {
                    cmcd: {
                        version: 1
                    }
                }
            });
            
            const msdData = cmcdModel.updateMsdData(Constants.CMCD_REPORTING_MODE.REQUEST);
            expect(Object.keys(msdData)).to.have.length(0);
        });
    });

    describe('triggerCmcdEventMode', function () {
        it('should return event mode CMCD data', function () {
            const eventData = cmcdModel.triggerCmcdEventMode('s');
            expect(eventData).to.exist;
            expect(eventData.e).to.equal('s');
        });

        it('should include error code for error events', function () {
            cmcdModel.onPlayerError({ error: { code: 404 } });
            const eventData = cmcdModel.triggerCmcdEventMode('e');
            expect(eventData.e).to.equal('e');
            expect(eventData.ec).to.equal(404);
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

            const data = cmcdModel.getCmcdData(request);
            expect(data.bsd).to.equal(500);

            const data2 = cmcdModel.getCmcdData(request);
            expect(data2.bsd).to.not.exist;
            clock.restore();
        });
    });
});