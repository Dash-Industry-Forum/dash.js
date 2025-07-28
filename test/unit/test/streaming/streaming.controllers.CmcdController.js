import CmcdController from '../../../../src/streaming/controllers/CmcdController.js';
import Settings from '../../../../src/core/Settings.js';
import {HTTPRequest} from '../../../../src/streaming/vo/metrics/HTTPRequest.js';
import EventBus from '../../../../src/core/EventBus.js';
import MediaPlayerEvents from '../../../../src/streaming/MediaPlayerEvents.js';
import DashConstants from '../../../../src/dash/constants/DashConstants.js';
import AbrControllerMock from '../../mocks/AbrControllerMock.js';
import DashMetricsMock from '../../mocks/DashMetricsMock.js';
import PlaybackControllerMock from '../../mocks/PlaybackControllerMock.js';
import ThroughputControllerMock from '../../mocks/ThroughputControllerMock.js';
import ServiceDescriptionControllerMock from '../../mocks/ServiceDescriptionControllerMock.js';
import {decodeCmcd} from '@svta/common-media-library/cmcd/decodeCmcd';

import {expect} from 'chai';
import sinon from 'sinon';

const context = {};

const eventBus = EventBus(context).getInstance();

const SESSION_HEADER_NAME = 'CMCD-Session';
const STATUS_HEADER_NAME = 'CMCD-Status';
const OBJECT_HEADER_NAME = 'CMCD-Object';
const REQUEST_HEADER_NAME = 'CMCD-Request';

describe('CmcdController', function () {
    let cmcdController;

    let abrControllerMock;
    let dashMetricsMock = new DashMetricsMock();
    let playbackControllerMock = new PlaybackControllerMock();
    const throughputControllerMock = new ThroughputControllerMock();
    let serviceDescriptionControllerMock = new ServiceDescriptionControllerMock();

    let settings = Settings(context).getInstance();

    beforeEach(function () {
        abrControllerMock = new AbrControllerMock();
        cmcdController = CmcdController(context).getInstance();
        cmcdController.initialize();
        settings.update({ streaming: { cmcd: { enabled: true, cid: null } } });
    });

    afterEach(function () {
        cmcdController.reset();
        cmcdController = null;
        settings.reset();
        serviceDescriptionControllerMock.reset();
    });

    describe('if configured', function () {
        beforeEach(function () {
            cmcdController.setConfig({
                abrController: abrControllerMock,
                dashMetrics: dashMetricsMock,
                playbackController: playbackControllerMock,
                throughputController: throughputControllerMock,
                serviceDescriptionController: serviceDescriptionControllerMock
            });
        });

        describe('getHeaderParameters()', () => {
            it('getHeaderParameters() returns correct metrics for MPD', function () {
                const REQUEST_TYPE = HTTPRequest.MPD_TYPE;
                const MEDIA_TYPE = 'video';
                const MANIFEST_OBJECT_TYPE = 'm';

                let request = {
                    type: REQUEST_TYPE,
                    mediaType: MEDIA_TYPE
                };

                settings.update({
                    streaming: {
                        cmcd: {
                            includeInRequests: ['mpd']
                        }
                    }
                });

                let headers = cmcdController.getHeaderParameters(request);
                expect(headers).to.have.property(SESSION_HEADER_NAME);
                expect(typeof headers[SESSION_HEADER_NAME]).to.equal('string');
                expect(headers).to.have.property(OBJECT_HEADER_NAME);
                expect(typeof headers[OBJECT_HEADER_NAME]).to.equal('string');

                let metrics = decodeCmcd(headers[SESSION_HEADER_NAME]);
                expect(metrics).to.have.property('sid');
                expect(metrics).to.not.have.property('cid');

                metrics = decodeCmcd(headers[OBJECT_HEADER_NAME]);
                expect(metrics).to.have.property('ot');
                expect(metrics.ot).to.equal(MANIFEST_OBJECT_TYPE);
            });

            it('getHeaderParameters() returns correct metrics for init segments', function () {
                const REQUEST_TYPE = HTTPRequest.INIT_SEGMENT_TYPE;
                const MEDIA_TYPE = 'video';
                const MANIFEST_OBJECT_TYPE = 'i';

                let request = {
                    type: REQUEST_TYPE,
                    mediaType: MEDIA_TYPE
                };

                let headers = cmcdController.getHeaderParameters(request);
                expect(headers).to.have.property(SESSION_HEADER_NAME);
                expect(typeof headers[SESSION_HEADER_NAME]).to.equal('string');
                expect(headers).to.have.property(OBJECT_HEADER_NAME);
                expect(typeof headers[OBJECT_HEADER_NAME]).to.equal('string');
                expect(headers).to.have.property(REQUEST_HEADER_NAME);
                expect(typeof headers[REQUEST_HEADER_NAME]).to.equal('string');

                let metrics = decodeCmcd(headers[SESSION_HEADER_NAME]);
                expect(metrics).to.have.property('sid');
                expect(metrics).to.not.have.property('cid');

                metrics = decodeCmcd(headers[OBJECT_HEADER_NAME]);
                expect(metrics).to.have.property('ot');
                expect(metrics.ot).to.equal(MANIFEST_OBJECT_TYPE);

                metrics = decodeCmcd(headers[REQUEST_HEADER_NAME]);
                expect(metrics).to.have.property('su');
                expect(metrics.su).to.equal(true);
            });

            it('getHeaderParameters() returns correct metrics for media segments', function () {
                dashMetricsMock.setCurrentBufferLevel(15.34511);
                const REQUEST_TYPE = HTTPRequest.MEDIA_SEGMENT_TYPE;
                const MEDIA_TYPE = 'video';
                const BITRATE = 10000;
                const DURATION = 987.213;
                const TOP_BITRATE = 20000;
                const MEASURED_THROUGHPUT = 8327641;
                const BUFFER_LEVEL = parseInt(dashMetricsMock.getCurrentBufferLevel() * 10) * 100;
                const VIDEO_OBJECT_TYPE = 'v';
                const NEXT_OBJECT_URL = 'next_object';
                const NEXT_OBJECT_RANGE = '100-500';

                abrControllerMock.getPossibleVoRepresentationsFilteredBySettings = () => {
                    return [
                        {
                            bitrateInKbit: TOP_BITRATE / 1000
                        }
                    ]
                }
                throughputControllerMock.getSafeAverageThroughput = function () {
                    return MEASURED_THROUGHPUT;
                };
                let request = {
                    type: REQUEST_TYPE,
                    mediaType: MEDIA_TYPE,
                    quality: 0,
                    bandwidth: BITRATE,
                    representation: { mediaInfo: { bitrateList: [{ bandwidth: BITRATE }] } },
                    duration: DURATION,
                    url: 'http://test.url/firstRequest'
                };

                let headers = cmcdController.getHeaderParameters(request);
                expect(headers).to.have.property(SESSION_HEADER_NAME);
                expect(typeof headers[SESSION_HEADER_NAME]).to.equal('string');
                expect(headers).to.have.property(OBJECT_HEADER_NAME);
                expect(typeof headers[OBJECT_HEADER_NAME]).to.equal('string');
                expect(headers).to.have.property(REQUEST_HEADER_NAME);
                expect(typeof headers[REQUEST_HEADER_NAME]).to.equal('string');
                expect(headers).to.have.property(STATUS_HEADER_NAME);
                expect(typeof headers[STATUS_HEADER_NAME]).to.equal('string');

                let metrics = decodeCmcd(headers[SESSION_HEADER_NAME]);
                expect(metrics).to.have.property('sid');
                expect(metrics).to.not.have.property('cid');

                metrics = decodeCmcd(headers[OBJECT_HEADER_NAME]);
                expect(metrics).to.have.property('br');
                expect(metrics.br).to.equal(parseInt(BITRATE / 1000));
                expect(metrics).to.have.property('d');
                expect(metrics.d).to.equal(parseInt(DURATION * 1000));
                expect(metrics).to.have.property('ot');
                expect(metrics.ot).to.equal(VIDEO_OBJECT_TYPE);
                expect(metrics).to.have.property('tb');
                expect(metrics.tb).to.equal(parseInt(TOP_BITRATE / 1000));

                metrics = decodeCmcd(headers[REQUEST_HEADER_NAME]);
                expect(metrics).to.have.property('bl');
                expect(metrics.bl).to.equal(BUFFER_LEVEL);
                expect(metrics).to.have.property('dl');
                expect(metrics.dl).to.equal(BUFFER_LEVEL);
                expect(metrics).to.have.property('mtp');
                expect(metrics.mtp).to.equal(parseInt(MEASURED_THROUGHPUT / 100) * 100);
                expect(metrics).to.have.property('nor');
                expect(metrics.nor).to.equal(NEXT_OBJECT_URL);

                metrics = decodeCmcd(headers[STATUS_HEADER_NAME]);
                expect(metrics).to.have.property('rtp');
                expect(typeof metrics.rtp).to.equal('number');
                expect(metrics.rtp % 100).to.equal(0);

                request.url = 'http://test.url/next_object';
                headers = cmcdController.getHeaderParameters(request);
                metrics = decodeCmcd(headers[REQUEST_HEADER_NAME]);
                expect(metrics).to.have.property('nrr');
                expect(metrics.nrr).to.equal(NEXT_OBJECT_RANGE);
            });

            it('getHeaderParameters() returns correct metrics for other type', function () {
                const REQUEST_TYPE = HTTPRequest.OTHER_TYPE;
                const MEDIA_TYPE = 'video';
                const MANIFEST_OBJECT_TYPE = 'o';

                let request = {
                    type: REQUEST_TYPE,
                    mediaType: MEDIA_TYPE
                };

                settings.update({
                    streaming: {
                        cmcd: {
                            includeInRequests: ['other']
                        }
                    }
                });

                let headers = cmcdController.getHeaderParameters(request);
                expect(headers).to.have.property(SESSION_HEADER_NAME);
                expect(typeof headers[SESSION_HEADER_NAME]).to.equal('string');
                expect(headers).to.have.property(OBJECT_HEADER_NAME);
                expect(typeof headers[OBJECT_HEADER_NAME]).to.equal('string');

                let metrics = decodeCmcd(headers[SESSION_HEADER_NAME]);
                expect(metrics).to.have.property('sid');
                expect(metrics).to.not.have.property('cid');
                metrics = decodeCmcd(headers[OBJECT_HEADER_NAME]);
                expect(metrics).to.have.property('ot');
                expect(metrics.ot).to.equal(MANIFEST_OBJECT_TYPE);
            });

            it('getHeaderParameters() recognizes playback rate change through events', function () {
                const REQUEST_TYPE = HTTPRequest.MEDIA_SEGMENT_TYPE;
                const MEDIA_TYPE = 'video';
                const BITRATE = 10000;
                const DURATION = 987.213;
                const CHANGED_PLAYBACK_RATE = 2.4;

                let request = {
                    type: REQUEST_TYPE,
                    mediaType: MEDIA_TYPE,
                    quality: 0,
                    representation: { mediaInfo: { bitrateList: [{ bandwidth: BITRATE }] } },
                    duration: DURATION
                };
                let headers = cmcdController.getHeaderParameters(request);
                let metrics = decodeCmcd(headers[SESSION_HEADER_NAME]);
                expect(metrics).to.not.have.property('pr');

                eventBus.trigger(MediaPlayerEvents.PLAYBACK_RATE_CHANGED, { playbackRate: CHANGED_PLAYBACK_RATE });

                headers = cmcdController.getHeaderParameters(request);
                metrics = decodeCmcd(headers[SESSION_HEADER_NAME]);
                expect(metrics).to.have.property('pr');
                expect(metrics.pr).to.equal(CHANGED_PLAYBACK_RATE);
            });

            it('getHeaderParameters() recognizes playback seek through events', function () {
                const REQUEST_TYPE = HTTPRequest.MEDIA_SEGMENT_TYPE;
                const MEDIA_TYPE = 'video';
                const BITRATE = 10000;
                const DURATION = 987.213;

                let request = {
                    type: REQUEST_TYPE,
                    mediaType: MEDIA_TYPE,
                    quality: 0,
                    representation: { mediaInfo: { bitrateList: [{ bandwidth: BITRATE }] } },
                    duration: DURATION
                };
                cmcdController.getHeaderParameters(request); // first initial request will set startup to true
                let headers = cmcdController.getHeaderParameters(request);
                let metrics = decodeCmcd(headers[STATUS_HEADER_NAME]);
                expect(metrics).to.not.have.property('bs');
                metrics = decodeCmcd(headers[REQUEST_HEADER_NAME]);
                expect(metrics).to.not.have.property('su');

                eventBus.trigger(MediaPlayerEvents.PLAYBACK_SEEKED);

                headers = cmcdController.getHeaderParameters(request);
                metrics = decodeCmcd(headers[STATUS_HEADER_NAME]);
                expect(metrics).to.have.property('bs');
                expect(metrics.bs).to.equal(true);
                metrics = decodeCmcd(headers[REQUEST_HEADER_NAME]);
                expect(metrics).to.have.property('su');
                expect(metrics.su).to.equal(true);
            });

            it('getHeaderParameters() recognizes buffer starvation through events', function () {
                const REQUEST_TYPE = HTTPRequest.MEDIA_SEGMENT_TYPE;
                const MEDIA_TYPE = 'video';
                const BITRATE = 10000;
                const DURATION = 987.213;

                let request = {
                    type: REQUEST_TYPE,
                    mediaType: MEDIA_TYPE,
                    quality: 0,
                    representation: { mediaInfo: { bitrateList: [{ bandwidth: BITRATE }] } },
                    duration: DURATION
                };
                cmcdController.getHeaderParameters(request); // first initial request will set startup to true
                let headers = cmcdController.getHeaderParameters(request);
                let metrics = decodeCmcd(headers[STATUS_HEADER_NAME]);
                expect(metrics).to.not.have.property('bs');
                metrics = decodeCmcd(headers[REQUEST_HEADER_NAME]);
                expect(metrics).to.not.have.property('su');

                eventBus.trigger(MediaPlayerEvents.BUFFER_LEVEL_STATE_CHANGED, {
                    state: MediaPlayerEvents.BUFFER_EMPTY,
                    mediaType: request.mediaType
                });

                headers = cmcdController.getHeaderParameters(request);
                metrics = decodeCmcd(headers[STATUS_HEADER_NAME]);
                expect(metrics).to.have.property('bs');
                expect(metrics.bs).to.equal(true);
                metrics = decodeCmcd(headers[REQUEST_HEADER_NAME]);
                expect(metrics).to.have.property('su');
                expect(metrics.su).to.equal(true);
            });

            it('getHeaderParameters() recognizes manifest load through events', function () {
                const REQUEST_TYPE = HTTPRequest.MEDIA_SEGMENT_TYPE;
                const MEDIA_TYPE = 'video';
                const BITRATE = 10000;
                const DURATION = 987.213;

                let request = {
                    type: REQUEST_TYPE,
                    mediaType: MEDIA_TYPE,
                    quality: 0,
                    representation: { mediaInfo: { bitrateList: [{ bandwidth: BITRATE }] } },
                    duration: DURATION
                };
                let headers = cmcdController.getHeaderParameters(request);
                let metrics = decodeCmcd(headers[SESSION_HEADER_NAME]);
                expect(metrics).to.not.have.property('st');
                expect(metrics).to.not.have.property('sf');

                eventBus.trigger(MediaPlayerEvents.MANIFEST_LOADED, {
                    protocol: 'MSS',
                    data: { type: DashConstants.DYNAMIC }
                });

                headers = cmcdController.getHeaderParameters(request);
                metrics = decodeCmcd(headers[SESSION_HEADER_NAME]);
                expect(metrics).to.have.property('st');
                expect(metrics.st).to.equal('l');
                expect(metrics).to.have.property('sf');
                expect(metrics.sf).to.equal('s');
            });

            it('getHeaderParameters() returns CID in metrics if explicitly set', function () {
                const REQUEST_TYPE = HTTPRequest.MPD_TYPE;
                const MEDIA_TYPE = 'video';
                const CID = 'content_id';

                let request = {
                    type: REQUEST_TYPE,
                    mediaType: MEDIA_TYPE,
                    representation: { mediaInfo: {} },
                };

                settings.update({ streaming: { cmcd: { enabled: true, cid: CID, includeInRequests: ['mpd'] } } });

                let headers = cmcdController.getHeaderParameters(request);
                expect(headers).to.have.property(SESSION_HEADER_NAME);
                expect(typeof headers[SESSION_HEADER_NAME]).to.equal('string');

                let metrics = decodeCmcd(headers[SESSION_HEADER_NAME]);
                expect(metrics).to.have.property('cid');
                expect(metrics.cid).to.equal(CID);
            });

            it('getHeaderParameters() returns correct RTP value if set to static ', function () {
                const REQUEST_TYPE = HTTPRequest.MEDIA_SEGMENT_TYPE;
                const MEDIA_TYPE = 'video';

                let request = {
                    type: REQUEST_TYPE,
                    mediaType: MEDIA_TYPE,
                    representation: { mediaInfo: {} },
                };

                settings.update({ streaming: { cmcd: { enabled: true, rtp: 10000 } } });

                let headers = cmcdController.getHeaderParameters(request);
                expect(headers).to.have.property(STATUS_HEADER_NAME);
                expect(typeof headers[STATUS_HEADER_NAME]).to.equal('string');

                let metrics = decodeCmcd(headers[STATUS_HEADER_NAME]);
                expect(metrics).to.have.property('rtp');
                expect(metrics.rtp).to.equal(10000);
            });

            it('getHeadersParameters() applies enabledKeys filter', function () {
                const REQUEST_TYPE = HTTPRequest.MEDIA_SEGMENT_TYPE;
                const MEDIA_TYPE = 'video';

                let request = {
                    type: REQUEST_TYPE,
                    mediaType: MEDIA_TYPE,
                    representation: { mediaInfo: {} },
                };

                settings.update({
                    streaming: {
                        cmcd: {
                            enabledKeys: ['ot', 'tb', 'mtp', 'nor', 'nrr', 'su', 'pr', 'sf', 'st', 'v'],
                            rtp: 1000
                        }
                    }
                });
                let headers = cmcdController.getHeaderParameters(request);
                expect(headers[OBJECT_HEADER_NAME].split(',').map(e => {
                    return e.split('=')[0]
                })).to.not.include('d');
                expect(headers[REQUEST_HEADER_NAME].split(',').map(e => {
                    return e.split('=')[0]
                })).to.not.include('dl');
                expect(headers[STATUS_HEADER_NAME]).to.be.undefined;
                expect(headers[SESSION_HEADER_NAME]).to.be.undefined;
            });

            it('getHeadersParameters() should return no parameters if enabled keys is empty', function () {
                const REQUEST_TYPE = HTTPRequest.MEDIA_SEGMENT_TYPE;
                const MEDIA_TYPE = 'video';

                let request = {
                    type: REQUEST_TYPE,
                    mediaType: MEDIA_TYPE
                };

                settings.update({
                    streaming: {
                        cmcd: {
                            enabledKeys: [],
                            rtp: 1000
                        }
                    }
                });
                let headers = cmcdController.getHeaderParameters(request);
                expect(headers[OBJECT_HEADER_NAME]).to.be.undefined;
                expect(headers[REQUEST_HEADER_NAME]).to.be.undefined;
                expect(headers[STATUS_HEADER_NAME]).to.be.undefined;
                expect(headers[SESSION_HEADER_NAME]).to.be.undefined;
            });

            describe('getHeadersParameters() return CMCD data correctly', () => {

                it('getHeadersParameters() sould return cmcd data', function () {
                    const REQUEST_TYPE = HTTPRequest.MEDIA_SEGMENT_TYPE;
                    const MEDIA_TYPE = 'video';

                    let request = {
                        type: REQUEST_TYPE,
                        mediaType: MEDIA_TYPE
                    };

                    let headers = cmcdController.getHeaderParameters(request);
                    expect(headers).to.have.property(OBJECT_HEADER_NAME);
                    expect(headers).to.have.property(REQUEST_HEADER_NAME);
                    expect(headers).to.have.property(SESSION_HEADER_NAME);
                });

                describe('getHeadersParameters() return cmcd data if includeInRequests is correctly type', () => {

                    it('should return cmcd data if includeInRequests is empty', function () {
                        const REQUEST_TYPE = HTTPRequest.MEDIA_SEGMENT_TYPE;
                        const MEDIA_TYPE = 'video';

                        let request = {
                            type: REQUEST_TYPE,
                            mediaType: MEDIA_TYPE
                        };

                        let serviceDescriptionSettings = {
                            clientDataReporting: {
                                CMCDParameters: {
                                    version: 1,
                                    keys: ['br', 'd', 'ot', 'tb', 'bl', 'dl', 'mtp', 'nor', 'nrr', 'su', 'bs', 'rtp', 'cid', 'pr', 'sf', 'sid', 'st', 'v'],
                                }
                            }
                        }
                        serviceDescriptionControllerMock.applyServiceDescription(serviceDescriptionSettings);

                        let headers = cmcdController.getHeaderParameters(request);
                        expect(headers).to.have.property(OBJECT_HEADER_NAME);
                        expect(headers).to.have.property(REQUEST_HEADER_NAME);
                        expect(headers).to.have.property(SESSION_HEADER_NAME);
                    });

                    it('should return cmcd data if includeInRequests is any type', function () {
                        const MEDIA_SEMGENT_REQUEST_TYPE = HTTPRequest.MEDIA_SEGMENT_TYPE;
                        const INIT_SEMGENT_REQUEST_TYPE = HTTPRequest.MEDIA_SEGMENT_TYPE;
                        const XLINK_REQUEST_TYPE = HTTPRequest.MEDIA_SEGMENT_TYPE;
                        const MDP_REQUEST_TYPE = HTTPRequest.MEDIA_SEGMENT_TYPE;
                        const STEERING_REQUEST_TYPE = HTTPRequest.MEDIA_SEGMENT_TYPE;
                        let serviceDescriptionSettings,request,headers;

                        serviceDescriptionSettings = {
                            clientDataReporting: {
                                CMCDParameters: {
                                    version: 1,
                                    includeInRequests: ['*'],
                                    keys: ['br', 'd', 'ot', 'tb', 'bl', 'dl', 'mtp', 'nor', 'nrr', 'su', 'bs', 'rtp', 'cid', 'pr', 'sf', 'sid', 'st', 'v'],
                                }
                            }
                        }
                        serviceDescriptionControllerMock.applyServiceDescription(serviceDescriptionSettings);

                        request = {
                            type: MEDIA_SEMGENT_REQUEST_TYPE,
                        };
                        headers = cmcdController.getHeaderParameters(request);
                        expect(headers).to.have.property(REQUEST_HEADER_NAME);
                        expect(headers).to.have.property(SESSION_HEADER_NAME);

                        request = {
                            type: INIT_SEMGENT_REQUEST_TYPE,
                        };
                        headers = cmcdController.getHeaderParameters(request);
                        expect(headers).to.have.property(REQUEST_HEADER_NAME);
                        expect(headers).to.have.property(SESSION_HEADER_NAME);

                        request = {
                            type: XLINK_REQUEST_TYPE,
                        };
                        headers = cmcdController.getHeaderParameters(request);
                        expect(headers).to.have.property(REQUEST_HEADER_NAME);
                        expect(headers).to.have.property(SESSION_HEADER_NAME);

                        request = {
                            type: MDP_REQUEST_TYPE,
                        };
                        headers = cmcdController.getHeaderParameters(request);
                        expect(headers).to.have.property(REQUEST_HEADER_NAME);
                        expect(headers).to.have.property(SESSION_HEADER_NAME);

                        request = {
                            type: STEERING_REQUEST_TYPE,
                        };
                        headers = cmcdController.getHeaderParameters(request);
                        expect(headers).to.have.property(REQUEST_HEADER_NAME);
                        expect(headers).to.have.property(SESSION_HEADER_NAME);

                    });

                    it('should not return cmcd data if type does not included in includeInRequests', function () {
                        const REQUEST_TYPE = HTTPRequest.MEDIA_SEGMENT_TYPE;

                        let request = {
                            type: REQUEST_TYPE,
                        };

                        let serviceDescriptionSettings = {
                            clientDataReporting: {
                                'cmcdParameters': {
                                    version: 1,
                                    includeInRequests: ['mpd', 'xlink', 'steering'],
                                    keys: ['br', 'd', 'ot', 'tb', 'bl', 'dl', 'mtp', 'nor', 'nrr', 'su', 'bs', 'rtp', 'cid', 'pr', 'sf', 'sid', 'st', 'v'],
                                }
                            }
                        }
                        serviceDescriptionControllerMock.applyServiceDescription(serviceDescriptionSettings);

                        let headers = cmcdController.getHeaderParameters(request);
                        expect(headers[OBJECT_HEADER_NAME]).to.be.undefined;
                        expect(headers[REQUEST_HEADER_NAME]).to.be.undefined;
                        expect(headers[STATUS_HEADER_NAME]).to.be.undefined;
                        expect(headers[SESSION_HEADER_NAME]).to.be.undefined;
                    });

                    it('should return cmcd data if includeInRequests include segment and type is segment', function () {
                        const INIT_SGMENT_REQUEST_TYPE = HTTPRequest.INIT_SEGMENT_TYPE;
                        const MEDIA_SEGMENT_REQUEST_TYPE = HTTPRequest.MEDIA_SEGMENT_TYPE;
                        const MEDIA_TYPE = 'video';
                        let serviceDescriptionSettings,request,headers;

                        serviceDescriptionSettings = {
                            clientDataReporting: {
                                'cmcdParameters': {
                                    version: 1,
                                    includeInRequests: ['segment'],
                                    keys: ['br', 'd', 'ot', 'tb', 'bl', 'dl', 'mtp', 'nor', 'nrr', 'su', 'bs', 'rtp', 'cid', 'pr', 'sf', 'sid', 'st', 'v'],
                                }
                            }
                        }
                        serviceDescriptionControllerMock.applyServiceDescription(serviceDescriptionSettings);

                        request = {
                            type: MEDIA_SEGMENT_REQUEST_TYPE,
                            mediaType: MEDIA_TYPE
                        };
                        headers = cmcdController.getHeaderParameters(request);
                        expect(headers).to.have.property(OBJECT_HEADER_NAME);
                        expect(headers).to.have.property(REQUEST_HEADER_NAME);
                        expect(headers).to.have.property(SESSION_HEADER_NAME);

                        request = {
                            type: INIT_SGMENT_REQUEST_TYPE,
                            mediaType: MEDIA_TYPE
                        };
                        headers = cmcdController.getHeaderParameters(request);
                        expect(headers).to.have.property(OBJECT_HEADER_NAME);
                        expect(headers).to.have.property(REQUEST_HEADER_NAME);
                        expect(headers).to.have.property(SESSION_HEADER_NAME);
                    });

                    it('should return cmcd data if includeInRequests includes mpd and type is mpd', function () {
                        const REQUEST_TYPE = HTTPRequest.MPD_TYPE;
                        const MEDIA_TYPE = 'video';

                        let request = {
                            type: REQUEST_TYPE,
                            mediaType: MEDIA_TYPE
                        };

                        let serviceDescriptionSettings = {
                            clientDataReporting: {
                                'cmcdParameters': {
                                    version: 1,
                                    includeInRequests: ['mpd'],
                                    keys: ['br', 'd', 'ot', 'tb', 'bl', 'dl', 'mtp', 'nor', 'nrr', 'su', 'bs', 'rtp', 'cid', 'pr', 'sf', 'sid', 'st', 'v'],
                                }
                            }
                        }
                        serviceDescriptionControllerMock.applyServiceDescription(serviceDescriptionSettings);

                        let headers = cmcdController.getHeaderParameters(request);
                        expect(headers).to.have.property(OBJECT_HEADER_NAME);
                        expect(headers).to.have.property(SESSION_HEADER_NAME);
                    });

                    it('should return cmcd data if includeInRequests include xlink and type is xlink', function () {
                        const REQUEST_TYPE = HTTPRequest.XLINK_EXPANSION_TYPE;
                        const MEDIA_TYPE = 'video';

                        let request = {
                            type: REQUEST_TYPE,
                            mediaType: MEDIA_TYPE
                        };

                        let serviceDescriptionSettings = {
                            clientDataReporting: {
                                'cmcdParameters': {
                                    version: 1,
                                    includeInRequests: ['xlink'],
                                    keys: ['br', 'd', 'ot', 'tb', 'bl', 'dl', 'mtp', 'nor', 'nrr', 'su', 'bs', 'rtp', 'cid', 'pr', 'sf', 'sid', 'st', 'v'],
                                }
                            }
                        }
                        serviceDescriptionControllerMock.applyServiceDescription(serviceDescriptionSettings);

                        let headers = cmcdController.getHeaderParameters(request);
                        expect(headers).to.have.property(OBJECT_HEADER_NAME);
                        expect(headers).to.have.property(SESSION_HEADER_NAME);
                    });
                    it('should return cmcd data if includeInRequests include steering and type is steering', function () {
                        const REQUEST_TYPE = HTTPRequest.CONTENT_STEERING_TYPE;
                        const MEDIA_TYPE = 'video';

                        let request = {
                            type: REQUEST_TYPE,
                            mediaType: MEDIA_TYPE
                        };

                        let serviceDescriptionSettings = {
                            clientDataReporting: {
                                cmcdParameters: {
                                    version: 1,
                                    includeInRequests: ['steering'],
                                    keys: ['br', 'd', 'ot', 'tb', 'bl', 'dl', 'mtp', 'nor', 'nrr', 'su', 'bs', 'rtp', 'cid', 'pr', 'sf', 'sid', 'st', 'v'],
                                }
                            }
                        }
                        serviceDescriptionControllerMock.applyServiceDescription(serviceDescriptionSettings);

                        let headers = cmcdController.getHeaderParameters(request);
                        expect(headers).to.have.property(OBJECT_HEADER_NAME);
                        expect(headers).to.have.property(REQUEST_HEADER_NAME);
                        expect(headers).to.have.property(SESSION_HEADER_NAME);
                    });
                });


                describe('getHeadersParameters() return CMCD v2 data correctly', () => {
                    it('getHeadersParameters() should return cmcd v2 data if version is 2', function () {
                        const REQUEST_TYPE = HTTPRequest.MEDIA_SEGMENT_TYPE;
                        const MEDIA_TYPE = 'video';
                        const TEST_URL = 'http://example.com/segment1.m4s';

                        const request = {
                            type: REQUEST_TYPE,
                            mediaType: MEDIA_TYPE,
                            url: TEST_URL,
                            headers: {}
                        };

                        settings.update({
                            streaming: {
                                cmcd: {
                                    enabled: true,
                                    version: 2,
                                    mode: 'header',
                                    enabledKeys: ['ltc','msd'],
                                    includeInRequests: ['segment'],
                                    targets: []
                                }
                            }
                        });

                        const interceptor = cmcdController.getCmcdRequestInterceptors()[0];
                        expect(interceptor).to.be.a('function');

                        // First request (before playback started): expect ltc but no msd
                        const result1 = interceptor({
                            url: TEST_URL,
                            headers: {},
                            customData: { request: { ...request } }
                        });

                        const reqMetrics1 = decodeCmcd(result1.headers[REQUEST_HEADER_NAME]);
                        expect(reqMetrics1).to.have.property('ltc');

                        eventBus.trigger(MediaPlayerEvents.PLAYBACK_STARTED);
                        eventBus.trigger(MediaPlayerEvents.PLAYBACK_PLAYING);

                        // Second request (after playback): expect msd
                        const result2 = interceptor({
                            url: TEST_URL,
                            headers: {},
                            customData: { request: { ...request } }
                        });

                        const sessMetrics2 = decodeCmcd(result2.headers[SESSION_HEADER_NAME]);
                        const reqMetrics2 = decodeCmcd(result2.headers[REQUEST_HEADER_NAME]);

                        expect(sessMetrics2).to.have.property('msd');
                        expect(reqMetrics2).to.have.property('ltc');
                    });
        
                    it('getHeadersParameters() should not return cmcd v2 data if the cmcd version is 1', function () {
                        const TEST_URL = 'https://example.com/video/segment3.m4s';
                        const CMCD_HEADERS = ['CMCD-Object', 'CMCD-Request', 'CMCD-Session', 'CMCD-Status'];

                        const request = {
                            type: HTTPRequest.MEDIA_SEGMENT_TYPE,
                            mediaType: 'video',
                            url: TEST_URL,
                            serviceLocation: 'cdn-D.example.com',
                            representation: {
                                mediaInfo: {
                                    id: 'videoAdaptationSet_4',
                                    type: 'video'
                                }
                            },
                            headers: {},
                            cmcd: {},
                            customData: {}
                        };

                        settings.update({
                            streaming: {
                                cmcd: {
                                    version: 1,
                                    mode: 'header',
                                    enabled: true,
                                    includeInRequests: ['segment'],
                                    enabledKeys: ['sid', 'msd', 'ltc'], // v2 keys included but should be ignored
                                    targets: []
                                }
                            }
                        });

                        eventBus.trigger(MediaPlayerEvents.PLAYBACK_STARTED);
                        eventBus.trigger(MediaPlayerEvents.PLAYBACK_PLAYING);

                        const interceptor = cmcdController.getCmcdRequestInterceptors()[0];
                        const { headers } = interceptor({
                            url: request.url,
                            headers: { ...request.headers },
                            customData: { request }
                        });

                        expect(headers).to.be.an('object');

                        const hasCmcdHeader = CMCD_HEADERS.some(header => header in headers);
                        expect(hasCmcdHeader).to.be.true;

                        const combinedData = CMCD_HEADERS.reduce((acc, header) => {
                            try {
                                if (headers[header]) {
                                    const decoded = decodeCmcd(headers[header]);
                                    return { ...acc, ...decoded };
                                }
                            } catch (err) {
                                console.warn(`Failed to decode ${header}:`, err);
                            }
                            return acc;
                        }, {});

                        expect(combinedData).to.have.property('sid'); // v1 field should be present
                        expect(combinedData).to.not.have.property('ltc'); // v2-only key
                        expect(combinedData).to.not.have.property('msd'); // v2-only key
                    });
                });

            })
        })

        describe('getQueryParameter()', () => {
            it('getQueryParameter() returns correct metrics for MPD', function () {
                const REQUEST_TYPE = HTTPRequest.MPD_TYPE;
                const MEDIA_TYPE = 'video';
                const MANIFEST_OBJECT_TYPE = 'm';

                let request = {
                    type: REQUEST_TYPE,
                    mediaType: MEDIA_TYPE
                };

                settings.update({
                    streaming: {
                        cmcd: {
                            includeInRequests: ['mpd']
                        }
                    }
                });

                let parameters = cmcdController.getQueryParameter(request);
                expect(parameters).to.have.property('key');
                expect(parameters.key).to.equal('CMCD');
                expect(parameters).to.have.property('value');
                expect(typeof parameters.value).to.equal('string');

                let metrics = decodeCmcd(parameters.value);
                expect(metrics).to.have.property('sid');
                expect(metrics).to.not.have.property('cid');
                expect(metrics).to.have.property('ot');
                expect(metrics.ot).to.equal(MANIFEST_OBJECT_TYPE);
            });

            it('getQueryParameter() returns correct metrics for init segments', function () {
                const REQUEST_TYPE = HTTPRequest.INIT_SEGMENT_TYPE;
                const MEDIA_TYPE = 'video';
                const MANIFEST_OBJECT_TYPE = 'i';

                let request = {
                    type: REQUEST_TYPE,
                    mediaType: MEDIA_TYPE
                };

                let parameters = cmcdController.getQueryParameter(request);
                expect(parameters).to.have.property('key');
                expect(parameters.key).to.equal('CMCD');
                expect(parameters).to.have.property('value');
                expect(typeof parameters.value).to.equal('string');

                let metrics = decodeCmcd(parameters.value);
                expect(metrics).to.have.property('sid');
                expect(metrics).to.not.have.property('cid');
                expect(metrics).to.have.property('ot');
                expect(metrics.ot).to.equal(MANIFEST_OBJECT_TYPE);
                expect(metrics).to.have.property('su');
                expect(metrics.su).to.equal(true);
            });

            it('getQueryParameter() returns correct metrics for media segments', function () {
                dashMetricsMock.setCurrentBufferLevel(15.34511);
                const REQUEST_TYPE = HTTPRequest.MEDIA_SEGMENT_TYPE;
                const MEDIA_TYPE = 'video';
                const BITRATE = 10000;
                const DURATION = 987.213;
                const TOP_BITRATE = 20000;
                const MEASURED_THROUGHPUT = 8327641;
                const BUFFER_LEVEL = parseInt(dashMetricsMock.getCurrentBufferLevel() * 10) * 100;
                const VIDEO_OBJECT_TYPE = 'v';
                const NEXT_OBJECT_URL = 'next_object';
                const NEXT_OBJECT_RANGE = '100-500';

                abrControllerMock.getPossibleVoRepresentationsFilteredBySettings = () => {
                    return [
                        {
                            bitrateInKbit: 20
                        }
                    ]
                }
                throughputControllerMock.getSafeAverageThroughput = function () {
                    return MEASURED_THROUGHPUT;
                };
                let request = {
                    type: REQUEST_TYPE,
                    mediaType: MEDIA_TYPE,
                    quality: 0,
                    bandwidth: BITRATE,
                    representation: { mediaInfo: { bitrateList: [{ bandwidth: BITRATE }] } },
                    duration: DURATION,
                    url: 'http://test.url/firstRequest'
                };

                let parameters = cmcdController.getQueryParameter(request);
                expect(parameters).to.have.property('key');
                expect(parameters.key).to.equal('CMCD');
                expect(parameters).to.have.property('value');
                expect(typeof parameters.value).to.equal('string');

                let metrics = decodeCmcd(parameters.value);
                expect(metrics).to.have.property('sid');
                expect(metrics).to.not.have.property('cid');
                expect(metrics).to.have.property('br');
                expect(metrics.br).to.equal(parseInt(BITRATE / 1000));
                expect(metrics).to.have.property('ot');
                expect(metrics.ot).to.equal(VIDEO_OBJECT_TYPE);
                expect(metrics).to.have.property('d');
                expect(metrics.d).to.equal(parseInt(DURATION * 1000));
                expect(metrics).to.have.property('mtp');
                expect(metrics.mtp).to.equal(parseInt(MEASURED_THROUGHPUT / 100) * 100);
                expect(metrics).to.have.property('dl');
                expect(metrics.dl).to.equal(BUFFER_LEVEL);
                expect(metrics).to.have.property('bl');
                expect(metrics.bl).to.equal(BUFFER_LEVEL);
                expect(metrics).to.have.property('tb');
                expect(metrics.tb).to.equal(parseInt(TOP_BITRATE / 1000));
                expect(metrics).to.have.property('nor');
                expect(metrics.nor).to.equal(NEXT_OBJECT_URL);
                expect(metrics).to.have.property('rtp');
                expect(typeof metrics.rtp).to.equal('number');
                expect(metrics.rtp % 100).to.equal(0);

                request.url = 'http://test.url/next_object';
                parameters = cmcdController.getQueryParameter(request);
                metrics = decodeCmcd(parameters.value);
                expect(metrics).to.have.property('nrr');
                expect(metrics.nrr).to.equal(NEXT_OBJECT_RANGE);
            });

            it('getQueryParameter() returns correct metrics for other type', function () {
                const REQUEST_TYPE = HTTPRequest.OTHER_TYPE;
                const MEDIA_TYPE = 'video';
                const MANIFEST_OBJECT_TYPE = 'o';

                let request = {
                    type: REQUEST_TYPE,
                    mediaType: MEDIA_TYPE
                };

                settings.update({
                    streaming: {
                        cmcd: {
                            includeInRequests: ['other']
                        }
                    }
                });

                let parameters = cmcdController.getQueryParameter(request);
                expect(parameters).to.have.property('key');
                expect(parameters.key).to.equal('CMCD');
                expect(parameters).to.have.property('value');
                expect(typeof parameters.value).to.equal('string');

                let metrics = decodeCmcd(parameters.value);
                expect(metrics).to.have.property('sid');
                expect(metrics).to.not.have.property('cid');
                expect(metrics).to.have.property('ot');
                expect(metrics.ot).to.equal(MANIFEST_OBJECT_TYPE);
            });

            it('getQueryParameter() recognizes playback rate change through events', function () {
                const REQUEST_TYPE = HTTPRequest.MEDIA_SEGMENT_TYPE;
                const MEDIA_TYPE = 'video';
                const BITRATE = 10000;
                const DURATION = 987.213;
                const CHANGED_PLAYBACK_RATE = 2.4;

                abrControllerMock.getPossibleVoRepresentationsFilteredBySettings = () => {
                    return [
                        {
                            bitrateInKbit: BITRATE / 1000
                        }
                    ]
                };
                let request = {
                    type: REQUEST_TYPE,
                    mediaType: MEDIA_TYPE,
                    quality: 0,
                    representation: {
                        mediaInfo: { bitrateList: [{ bandwidth: BITRATE }] },
                        bitrateInKbit: BITRATE / 1000
                    },
                    duration: DURATION
                };
                let parameters = cmcdController.getQueryParameter(request);
                let metrics = decodeCmcd(parameters.value);
                expect(metrics).to.not.have.property('pr');

                eventBus.trigger(MediaPlayerEvents.PLAYBACK_RATE_CHANGED, { playbackRate: CHANGED_PLAYBACK_RATE });

                parameters = cmcdController.getQueryParameter(request);
                metrics = decodeCmcd(parameters.value);
                expect(metrics).to.have.property('pr');
                expect(metrics.pr).to.equal(CHANGED_PLAYBACK_RATE);
            });

            it('getQueryParameter() recognizes playback seek through events', function () {
                const REQUEST_TYPE = HTTPRequest.MEDIA_SEGMENT_TYPE;
                const MEDIA_TYPE = 'video';
                const BITRATE = 10000;
                const DURATION = 987.213;

                abrControllerMock.getPossibleVoRepresentationsFilteredBySettings = () => {
                    return [
                        {
                            bitrateInKbit: BITRATE / 1000
                        }
                    ]
                };
                let request = {
                    type: REQUEST_TYPE,
                    mediaType: MEDIA_TYPE,
                    quality: 0,
                    representation: { mediaInfo: { bitrateList: [{ bandwidth: BITRATE }] } },
                    duration: DURATION
                };
                cmcdController.getQueryParameter(request); // first initial request will set startup to true
                let parameters = cmcdController.getQueryParameter(request);
                let metrics = decodeCmcd(parameters.value);
                expect(metrics).to.not.have.property('bs');
                expect(metrics).to.not.have.property('su');

                eventBus.trigger(MediaPlayerEvents.PLAYBACK_SEEKED);

                parameters = cmcdController.getQueryParameter(request);
                metrics = decodeCmcd(parameters.value);
                expect(metrics).to.have.property('bs');
                expect(metrics.bs).to.equal(true);
                expect(metrics).to.have.property('su');
                expect(metrics.su).to.equal(true);
            });

            it('getQueryParameter() recognizes buffer starvation through events', function () {
                const REQUEST_TYPE = HTTPRequest.MEDIA_SEGMENT_TYPE;
                const MEDIA_TYPE = 'video';
                const BITRATE = 10000;
                const DURATION = 987.213;

                abrControllerMock.getPossibleVoRepresentationsFilteredBySettings = () => {
                    return [
                        {
                            bitrateInKbit: BITRATE / 1000
                        }
                    ]
                };
                let request = {
                    type: REQUEST_TYPE,
                    mediaType: MEDIA_TYPE,
                    quality: 0,
                    representation: { mediaInfo: { bitrateList: [{ bandwidth: BITRATE }] } },
                    duration: DURATION
                };
                cmcdController.getQueryParameter(request); // first initial request will set startup to true
                let parameters = cmcdController.getQueryParameter(request);
                let metrics = decodeCmcd(parameters.value);
                expect(metrics).to.not.have.property('bs');
                expect(metrics).to.not.have.property('su');

                eventBus.trigger(MediaPlayerEvents.BUFFER_LEVEL_STATE_CHANGED, {
                    state: MediaPlayerEvents.BUFFER_EMPTY,
                    mediaType: request.mediaType
                });

                parameters = cmcdController.getQueryParameter(request);
                metrics = decodeCmcd(parameters.value);
                expect(metrics).to.have.property('bs');
                expect(metrics.bs).to.equal(true);
                expect(metrics).to.have.property('su');
                expect(metrics.su).to.equal(true);
            });

            it('getQueryParameter() recognizes manifest load through events', function () {
                const REQUEST_TYPE = HTTPRequest.MEDIA_SEGMENT_TYPE;
                const MEDIA_TYPE = 'video';
                const BITRATE = 10000;
                const DURATION = 987.213;

                abrControllerMock.getPossibleVoRepresentationsFilteredBySettings = () => {
                    return [
                        {
                            bitrateInKbit: BITRATE / 1000
                        }
                    ]
                };
                let request = {
                    type: REQUEST_TYPE,
                    mediaType: MEDIA_TYPE,
                    quality: 0,
                    representation: { mediaInfo: { bitrateList: [{ bandwidth: BITRATE }] } },
                    duration: DURATION
                };
                let parameters = cmcdController.getQueryParameter(request);
                let metrics = decodeCmcd(parameters.value);
                expect(metrics).to.not.have.property('st');
                expect(metrics).to.not.have.property('sf');

                eventBus.trigger(MediaPlayerEvents.MANIFEST_LOADED, {
                    protocol: 'MSS',
                    data: { type: DashConstants.DYNAMIC }
                });

                parameters = cmcdController.getQueryParameter(request);
                metrics = decodeCmcd(parameters.value);
                expect(metrics).to.have.property('st');
                expect(metrics.st).to.equal('l');
                expect(metrics).to.have.property('sf');
                expect(metrics.sf).to.equal('s');
            });

            it('getQueryParameter() returns CID in metrics if explicitly set', function () {
                const REQUEST_TYPE = HTTPRequest.MPD_TYPE;
                const MEDIA_TYPE = 'video';
                const CID = 'content_id';

                let request = {
                    type: REQUEST_TYPE,
                    mediaType: MEDIA_TYPE,
                    representation: { mediaInfo: {} },
                };

                settings.update({ streaming: { cmcd: { enabled: true, cid: CID, includeInRequests: ['mpd'] } } });

                let parameters = cmcdController.getQueryParameter(request);
                expect(parameters).to.have.property('key');
                expect(parameters.key).to.equal('CMCD');
                expect(parameters).to.have.property('value');
                expect(typeof parameters.value).to.equal('string');

                let metrics = decodeCmcd(parameters.value);
                expect(metrics).to.have.property('cid');
                expect(metrics.cid).to.equal(CID);
            });

            it('getQueryParameter() returns correct RTP value if set to static ', function () {
                const REQUEST_TYPE = HTTPRequest.MEDIA_SEGMENT_TYPE;
                const MEDIA_TYPE = 'video';

                abrControllerMock.getPossibleVoRepresentationsFilteredBySettings = () => {
                    return [
                        {}
                    ]
                };
                let request = {
                    type: REQUEST_TYPE,
                    mediaType: MEDIA_TYPE,
                    representation: { mediaInfo: {} },
                };

                settings.update({ streaming: { cmcd: { enabled: true, rtp: 10000 } } });

                let parameters = cmcdController.getQueryParameter(request);
                expect(parameters).to.have.property('key');
                expect(parameters.key).to.equal('CMCD');
                expect(parameters).to.have.property('value');
                expect(typeof parameters.value).to.equal('string');

                let metrics = decodeCmcd(parameters.value);
                expect(metrics).to.have.property('rtp');
                expect(metrics.rtp).to.equal(10000);
            });

            it('getQueryParameter() applies enabledKeys filter', function () {
                const REQUEST_TYPE = HTTPRequest.MEDIA_SEGMENT_TYPE;
                const MEDIA_TYPE = 'video';

                let request = {
                    type: REQUEST_TYPE,
                    mediaType: MEDIA_TYPE
                };

                settings.update({
                    streaming: {
                        cmcd: {
                            enabledKeys: ['br', 'ot', 'tb', 'bl', 'mtp', 'nor', 'nrr', 'su', 'bs', 'cid', 'pr', 'sf', 'st', 'v'],
                            rtp: 1000
                        }
                    }
                });

                let parameters = cmcdController.getQueryParameter(request);
                expect(parameters).to.have.property('key');
                expect(parameters.key).to.equal('CMCD');
                expect(parameters).to.have.property('value');
                expect(typeof parameters.value).to.equal('string');

                let metrics = decodeCmcd(parameters.value);
                expect(metrics).to.not.have.property('d');
                expect(metrics).to.not.have.property('dl');
                expect(metrics).to.not.have.property('rtp');
                expect(metrics).to.not.have.property('sid');
            });

            it('getQueryParameter() should return no parameters if enabled keys is empty', function () {
                const REQUEST_TYPE = HTTPRequest.MEDIA_SEGMENT_TYPE;
                const MEDIA_TYPE = 'video';

                let request = {
                    type: REQUEST_TYPE,
                    mediaType: MEDIA_TYPE
                };

                settings.update({
                    streaming: {
                        cmcd: {
                            enabledKeys: [],
                            rtp: 1000
                        }
                    }
                });

                let parameters = cmcdController.getQueryParameter(request);
                expect(parameters).to.have.property('key');
                expect(parameters.key).to.equal('CMCD');
                expect(parameters).to.have.property('value');
                expect(typeof parameters.value).to.equal('string');

                let metrics = decodeCmcd(parameters.value);
                expect(metrics).to.be.empty
            });

            describe('getQueryParameter() return CMCD data correctly', () => {

it('getQueryParameter() should return cmcd data', function () {
                    const REQUEST_TYPE = HTTPRequest.MEDIA_SEGMENT_TYPE;
                    const MEDIA_TYPE = 'video';

                    let request = {
                        type: REQUEST_TYPE,
                        mediaType: MEDIA_TYPE
                    };

                    let parameters = cmcdController.getQueryParameter(request);
                    expect(parameters).to.have.property('key');
                    expect(parameters.key).to.equal('CMCD');
                    expect(parameters.value).to.not.equal(null);
                });

                describe('getQueryParameter() return cmcd data if includeInRequests is correctly type', () => {

                    it('should return cmcd data if includeInRequests is empty', function () {
                        const REQUEST_TYPE = HTTPRequest.MEDIA_SEGMENT_TYPE;
                        const MEDIA_TYPE = 'video';

                        let request = {
                            type: REQUEST_TYPE,
                            mediaType: MEDIA_TYPE
                        };

                        let serviceDescriptionSettings = {
                            clientDataReporting: {
                                CMCDParameters: {
                                    version: 1,
                                    keys: ['br', 'd', 'ot', 'tb', 'bl', 'dl', 'mtp', 'nor', 'nrr', 'su', 'bs', 'rtp', 'cid', 'pr', 'sf', 'sid', 'st', 'v'],
                                }
                            }
                        }
                        serviceDescriptionControllerMock.applyServiceDescription(serviceDescriptionSettings);

                        let parameters = cmcdController.getQueryParameter(request);
                        expect(parameters).to.have.property('key');
                        expect(parameters.key).to.equal('CMCD');
                    });

                    it('should return cmcd data if includeInRequests is any type', function () {
                        const MEDIA_SEMGENT_REQUEST_TYPE = HTTPRequest.MEDIA_SEGMENT_TYPE;
                        const INIT_SEMGENT_REQUEST_TYPE = HTTPRequest.MEDIA_SEGMENT_TYPE;
                        const XLINK_REQUEST_TYPE = HTTPRequest.MEDIA_SEGMENT_TYPE;
                        const MDP_REQUEST_TYPE = HTTPRequest.MEDIA_SEGMENT_TYPE;
                        const STEERING_REQUEST_TYPE = HTTPRequest.MEDIA_SEGMENT_TYPE;
                        let serviceDescriptionSettings,request,parameters;

                        serviceDescriptionSettings = {
                            clientDataReporting: {
                                CMCDParameters: {
                                    version: 1,
                                    includeInRequests: ['*'],
                                    keys: ['br', 'd', 'ot', 'tb', 'bl', 'dl', 'mtp', 'nor', 'nrr', 'su', 'bs', 'rtp', 'cid', 'pr', 'sf', 'sid', 'st', 'v'],
                                }
                            }
                        }
                        serviceDescriptionControllerMock.applyServiceDescription(serviceDescriptionSettings);

                        request = {
                            type: MEDIA_SEMGENT_REQUEST_TYPE,
                        };
                        parameters = cmcdController.getQueryParameter(request);
                        expect(parameters).to.have.property('key');
                        expect(parameters.key).to.equal('CMCD');

                        request = {
                            type: INIT_SEMGENT_REQUEST_TYPE,
                        };
                        parameters = cmcdController.getQueryParameter(request);
                        expect(parameters).to.have.property('key');
                        expect(parameters.key).to.equal('CMCD');

                        request = {
                            type: XLINK_REQUEST_TYPE,
                        };
                        parameters = cmcdController.getQueryParameter(request);
                        expect(parameters).to.have.property('key');
                        expect(parameters.key).to.equal('CMCD');

                        request = {
                            type: MDP_REQUEST_TYPE,
                        };
                        parameters = cmcdController.getQueryParameter(request);
                        expect(parameters).to.have.property('key');
                        expect(parameters.key).to.equal('CMCD');

                        request = {
                            type: STEERING_REQUEST_TYPE,
                        };
                        parameters = cmcdController.getQueryParameter(request);
                        expect(parameters).to.have.property('key');
                        expect(parameters.key).to.equal('CMCD');
                    });

                    it('should not return cmcd data if type does not included in includeInRequests', function () {
                        const REQUEST_TYPE = HTTPRequest.MEDIA_SEGMENT_TYPE;

                        let request = {
                            type: REQUEST_TYPE,
                        };

                        let serviceDescriptionSettings = {
                            clientDataReporting: {
                                cmcdParameters: {
                                    version: 1,
                                    includeInRequests: ['mpd', 'xlink', 'steering'],
                                    keys: ['br', 'd', 'ot', 'tb', 'bl', 'dl', 'mtp', 'nor', 'nrr', 'su', 'bs', 'rtp', 'cid', 'pr', 'sf', 'sid', 'st', 'v'],
                                }
                            }
                        }
                        serviceDescriptionControllerMock.applyServiceDescription(serviceDescriptionSettings);

                        let parameters = cmcdController.getQueryParameter(request);
                        expect(parameters).to.have.property('key');
                        expect(parameters.key).to.equal('CMCD');
                        expect(parameters.value).to.be.empty;
                    });

                    it('should return cmcd data if includeInRequests include segment and type is segment', function () {
                        const INIT_SGMENT_REQUEST_TYPE = HTTPRequest.INIT_SEGMENT_TYPE;
                        const MEDIA_SEGMENT_REQUEST_TYPE = HTTPRequest.MEDIA_SEGMENT_TYPE;
                        const MEDIA_TYPE = 'video';
                        let serviceDescriptionSettings,request,parameters;

                        serviceDescriptionSettings = {
                            clientDataReporting: {

                                CMCDParameters: {
                                    version: 1,
                                    includeInRequests: ['segment'],
                                    keys: ['br', 'd', 'ot', 'tb', 'bl', 'dl', 'mtp', 'nor', 'nrr', 'su', 'bs', 'rtp', 'cid', 'pr', 'sf', 'sid', 'st', 'v'],
                                }
                            }
                        }
                        serviceDescriptionControllerMock.applyServiceDescription(serviceDescriptionSettings);

                        request = {
                            type: MEDIA_SEGMENT_REQUEST_TYPE,
                            mediaType: MEDIA_TYPE
                        };
                        parameters = cmcdController.getQueryParameter(request);
                        expect(parameters).to.have.property('key');
                        expect(parameters.key).to.equal('CMCD');
                        expect(parameters.value).to.not.equals(null);

                        request = {
                            type: INIT_SGMENT_REQUEST_TYPE,
                            mediaType: MEDIA_TYPE
                        };
                        parameters = cmcdController.getQueryParameter(request);
                        expect(parameters).to.have.property('key');
                        expect(parameters.key).to.equal('CMCD');
                        expect(parameters.value).to.not.equals(null);
                    });

                    it('should return cmcd data if includeInRequests include mpd and type is mpd', function () {
                        const REQUEST_TYPE = HTTPRequest.MPD_TYPE;
                        const MEDIA_TYPE = 'video';

                        let request = {
                            type: REQUEST_TYPE,
                            mediaType: MEDIA_TYPE
                        };

                        let serviceDescriptionSettings = {
                            clientDataReporting: {
                                'CMCDParameters': {
                                    version: 1,
                                    includeInRequests: ['mpd'],
                                    keys: ['br', 'd', 'ot', 'tb', 'bl', 'dl', 'mtp', 'nor', 'nrr', 'su', 'bs', 'rtp', 'cid', 'pr', 'sf', 'sid', 'st', 'v'],
                                }
                            }
                        }
                        serviceDescriptionControllerMock.applyServiceDescription(serviceDescriptionSettings);

                        let parameters = cmcdController.getQueryParameter(request);
                        expect(parameters).to.have.property('key');
                        expect(parameters.key).to.equal('CMCD');
                        expect(parameters.value).to.not.equals(null);
                    });

                    it('should return cmcd data if includeInRequests include xlink and type is xlink', function () {
                        const REQUEST_TYPE = HTTPRequest.XLINK_EXPANSION_TYPE;
                        const MEDIA_TYPE = 'video';

                        let request = {
                            type: REQUEST_TYPE,
                            mediaType: MEDIA_TYPE
                        };

                        let serviceDescriptionSettings = {
                            clientDataReporting: {
                                CMCDParameters: {
                                    version: 1,
                                    includeInRequests: ['xlink'],
                                    keys: ['br', 'd', 'ot', 'tb', 'bl', 'dl', 'mtp', 'nor', 'nrr', 'su', 'bs', 'rtp', 'cid', 'pr', 'sf', 'sid', 'st', 'v'],
                                }
                            }
                        }
                        serviceDescriptionControllerMock.applyServiceDescription(serviceDescriptionSettings);

                        let parameters = cmcdController.getQueryParameter(request);
                        expect(parameters).to.have.property('key');
                        expect(parameters.key).to.equal('CMCD');
                        expect(parameters.value).to.not.equals(null);
                    });

                    it('should return cmcd data if includeInRequests include steering and type is steering', function () {
                        const REQUEST_TYPE = HTTPRequest.CONTENT_STEERING_TYPE;
                        const MEDIA_TYPE = 'video';

                        let request = {
                            type: REQUEST_TYPE,
                            mediaType: MEDIA_TYPE
                        };

                        let serviceDescriptionSettings = {
                            clientDataReporting: {
                                CMCDParameters: {
                                    version: 1,
                                    includeInRequests: ['steering'],
                                    keys: ['br', 'd', 'ot', 'tb', 'bl', 'dl', 'mtp', 'nor', 'nrr', 'su', 'bs', 'rtp', 'cid', 'pr', 'sf', 'sid', 'st', 'v'],
                                }
                            }
                        }
                        serviceDescriptionControllerMock.applyServiceDescription(serviceDescriptionSettings);

                        let parameters = cmcdController.getQueryParameter(request);
                        expect(parameters).to.have.property('key');
                        expect(parameters.key).to.equal('CMCD');
                        expect(parameters.value).to.not.equals(null);
                    });
                })
            });
        });

        describe('getQueryParameter() return CMCD v2 data correctly', () => {
            it('getQueryParameter() should return cmcd v2 data if the cmcd version is 2', function () {
                const CMCD_QUERY_KEY = 'CMCD';
                const CMCD_MODE_QUERY = 'query';
                const TEST_URL = 'https://example.com/video/segment1.m4s';

                const request = {
                    type: HTTPRequest.MEDIA_SEGMENT_TYPE,
                    mediaType: 'video',
                    url: TEST_URL,
                    serviceLocation: 'cdn-B.example.com',
                    representation: {
                        mediaInfo: {
                            id: 'videoAdaptationSet_2',
                            type: 'video'
                        }
                    },
                    headers: {},
                    cmcd: {},
                    customData: {}
                };

                settings.update({
                    streaming: {
                        cmcd: {
                            enabled: true,
                            version: 2,
                            mode: CMCD_MODE_QUERY,
                            includeInRequests: ['segment'],
                            enabledKeys: ['ltc', 'msd', 'v'],
                            targets: []
                        }
                    }
                });

                eventBus.trigger(MediaPlayerEvents.PLAYBACK_STARTED);
                eventBus.trigger(MediaPlayerEvents.PLAYBACK_PLAYING);

                const interceptor = cmcdController.getCmcdRequestInterceptors()[0];
                const updatedRequest = interceptor({
                    url: request.url,
                    headers: { ...request.headers },
                    customData: { request }
                });

                const parsedUrl = new URL(updatedRequest.url);
                const cmcdValue = parsedUrl.searchParams.get(CMCD_QUERY_KEY);

                expect(updatedRequest.url).to.be.a('string').and.not.equal(TEST_URL);
                expect(parsedUrl.searchParams.has(CMCD_QUERY_KEY)).to.be.true;
                expect(cmcdValue).to.be.a('string').and.not.empty;

                const decoded = decodeCmcd(cmcdValue);
                expect(decoded).to.include.all.keys('ltc', 'msd');
            });

            it('getQueryParameter() sould not return cmcd v2 data if the cmcd version is 1', function () {
                const TEST_URL = 'https://example.com/video/segment2.m4s';
                const CMCD_QUERY_KEY = 'CMCD';

                const request = {
                    type: HTTPRequest.MEDIA_SEGMENT_TYPE,
                    mediaType: 'video',
                    url: TEST_URL,
                    serviceLocation: 'cdn-C.example.com',
                    representation: {
                        mediaInfo: {
                            id: 'videoAdaptationSet_3',
                            type: 'video'
                        }
                    },
                    headers: {},
                    cmcd: {},
                    customData: {}
                };

                settings.update({
                    streaming: {
                        cmcd: {
                            version: 1,
                            mode: 'query',
                            enabled: true,
                            includeInRequests: ['segment'],
                            enabledKeys: ['sid', 'msd', 'ltc'], // v2 keys included but should be filtered
                            targets: []
                        }
                    }
                });

                eventBus.trigger(MediaPlayerEvents.PLAYBACK_STARTED);
                eventBus.trigger(MediaPlayerEvents.PLAYBACK_PLAYING);

                const interceptor = cmcdController.getCmcdRequestInterceptors()[0];
                const result = interceptor({
                    url: request.url,
                    headers: { ...request.headers },
                    customData: { request }
                });

                const parsedUrl = new URL(result.url);
                const cmcdValue = parsedUrl.searchParams.get(CMCD_QUERY_KEY);

                expect(result.url).to.be.a('string').and.not.equal(TEST_URL);
                expect(parsedUrl.searchParams.has(CMCD_QUERY_KEY)).to.be.true;
                expect(cmcdValue).to.be.a('string').and.not.empty;

                const decoded = decodeCmcd(cmcdValue);
                expect(decoded).to.have.property('sid');
                expect(decoded).to.not.have.property('ltc');
                expect(decoded).to.not.have.property('msd');
            });
        });

        describe('applyParametersFromMpd', () => {
            it('should ignore service description cmcd configuration when applyParametersFromMpd is false', function () {
                const REQUEST_TYPE = HTTPRequest.MEDIA_SEGMENT_TYPE;
                const MEDIA_TYPE = 'video';

                let request = {
                    type: REQUEST_TYPE,
                    mediaType: MEDIA_TYPE
                };

                settings.update({
                    streaming: {
                        cmcd: {
                            applyParametersFromMpd: false,
                            enabled: true,
                            cid: 'test-cid',
                            sid: 'test-sid',
                            enabledKeys: ['cid'],
                        }
                    }
                });

                let serviceDescriptionSettings = {
                    clientDataReporting: {
                        cmcdParameters: {
                            version: '1',
                            keys: ['sid'],
                            sessionID: 'sid-123',
                        }
                    }
                };
                serviceDescriptionControllerMock.applyServiceDescription(serviceDescriptionSettings);

                let parameters = cmcdController.getQueryParameter(request);
                expect(parameters).to.have.property('key');
                expect(parameters.key).to.equal('CMCD');
                expect(parameters.value).to.equal('cid="test-cid"');
            });

            it('should ignore player cmcd configuration when applyParametersFromMpd is true', function () {
                const REQUEST_TYPE = HTTPRequest.MEDIA_SEGMENT_TYPE;
                const MEDIA_TYPE = 'video';

                let request = {
                    type: REQUEST_TYPE,
                    mediaType: MEDIA_TYPE
                };

                settings.update({
                    streaming: {
                        cmcd: {
                            applyParametersFromMpd: true,
                            enabled: true,
                            cid: 'test-cid',
                            sid: 'test-sid',
                            enabledKeys: ['cid'],
                        }
                    }
                });

                let serviceDescriptionSettings = {
                    clientDataReporting: {
                        cmcdParameters: {
                            version: '1',
                            keys: ['sid'],
                            sessionID: 'sid-123',
                        }
                    }
                };
                serviceDescriptionControllerMock.applyServiceDescription(serviceDescriptionSettings);

                let parameters = cmcdController.getQueryParameter(request);
                expect(parameters).to.have.property('key');
                expect(parameters.key).to.equal('CMCD');
                expect(parameters.value).to.equal('sid="sid-123"');
            });
        });

    });

    describe('Event Mode', () => {
        let urlLoaderMock;

        beforeEach(() => {
            urlLoaderMock = {
                load: sinon.spy()
            };

            cmcdController.setConfig({
                abrController: abrControllerMock,
                dashMetrics: dashMetricsMock,
                playbackController: playbackControllerMock,
                throughputController: throughputControllerMock,
                serviceDescriptionController: serviceDescriptionControllerMock,
                urlLoader: urlLoaderMock
            });
        });

        it('should send a report when a configured event is triggered', () => {
            settings.update({
                streaming: {
                    cmcd: {
                        version: 2,
                        targets: [{
                            url: 'https://cmcd.event.collector/api',
                            enabled: true,
                            cmcdMode: 'event',
                            mode: 'query',
                            enabledKeys: ['e', 'sta'],
                            events: ['ps'],
                            timeInterval: 0
                        }]
                    }
                }
            });

            eventBus.trigger(MediaPlayerEvents.PLAYBACK_PLAYING);
            
            expect(urlLoaderMock.load.calledOnce).to.be.true;
            const requestSent = urlLoaderMock.load.firstCall.args[0].request;
            expect(requestSent.url).to.include('https://cmcd.event.collector/api?');
            
            const url = new URL(requestSent.url);
            const cmcdString = url.searchParams.get('CMCD');
            const metrics = decodeCmcd(cmcdString);
            expect(metrics).to.have.property('e', 'ps');
        });

        it('should send all available keys and events if they are undefined', () => {
            settings.update({
                streaming: {
                    cmcd: {
                        version: 2,
                        targets: [{
                            url: 'https://cmcd.event.collector/api',
                            enabled: true,
                            cmcdMode: 'event',
                            mode: 'query',
                            timeInterval: 0
                        }]
                    }
                }
            });

            eventBus.trigger(MediaPlayerEvents.PLAYBACK_PLAYING);
            
            expect(urlLoaderMock.load.calledOnce).to.be.true;
            const requestSent = urlLoaderMock.load.firstCall.args[0].request;
            expect(requestSent.url).to.include('https://cmcd.event.collector/api?');
            
            const url = new URL(requestSent.url);
            const cmcdString = url.searchParams.get('CMCD');
            const metrics = decodeCmcd(cmcdString);
            expect(metrics).to.have.property('e', 'ps');
            expect(metrics).to.have.property('sta', 'p');
            expect(metrics).to.have.property('ts');
            expect(metrics).to.have.property('sid');
            expect(metrics).to.have.property('v');
        });

        it('should send a report with event mode available keys', () => {
            settings.update({
                streaming: {
                    cmcd: {
                        version: 2,
                        targets: [{
                            url: 'https://cmcd.event.collector/api',
                            enabled: true,
                            cmcdMode: 'event',
                            mode: 'query',
                            enabledKeys: ['e', 'sta', 'ttfb'],
                            events: ['ps'],
                            timeInterval: 0
                        }]
                    }
                }
            });

            eventBus.trigger(MediaPlayerEvents.PLAYBACK_PLAYING);
            
            expect(urlLoaderMock.load.calledOnce).to.be.true;
            const requestSent = urlLoaderMock.load.firstCall.args[0].request;
            expect(requestSent.url).to.include('https://cmcd.event.collector/api?');
            
            const url = new URL(requestSent.url);
            const cmcdString = url.searchParams.get('CMCD');
            const metrics = decodeCmcd(cmcdString);
            expect(metrics).to.have.property('e', 'ps');
            expect(metrics).to.have.property('sta', 'p');
            expect(metrics).to.not.have.property('ttfb');
        });

        it('should send a report when the ERROR event is triggered', () => {
            settings.update({
                streaming: {
                    cmcd: {
                        version: 2,
                        targets: [{
                            url: 'https://cmcd.event.collector/api',
                            enabled: true,
                            cmcdMode: 'event',
                            mode: 'query',
                            enabledKeys: ['e'],
                            events: ['e'],
                            timeInterval: 0
                        }]
                    }
                }
            });

            const errorPayload = {
                error: {
                    code: 123,
                    message: 'Test Error Message',
                    data: {
                        request: {
                            type: 'someOtherRequestType' // Ensure it's not CMCD_EVENT
                        }
                    }
                }
            };

            eventBus.trigger(MediaPlayerEvents.ERROR, errorPayload);
            expect(urlLoaderMock.load.calledOnce).to.be.true;
            const requestSent = urlLoaderMock.load.firstCall.args[0].request;
            expect(requestSent.url).to.include('https://cmcd.event.collector/api?');
            
            const url = new URL(requestSent.url);
            const cmcdString = url.searchParams.get('CMCD');
            const metrics = decodeCmcd(cmcdString);
            expect(metrics).to.have.property('e', 'e');
        });

        it('should not send a report when the ERROR event is triggered by a CMCD_EVENT', () => {
            settings.update({
                streaming: {
                    cmcd: {
                        version: 2,
                        targets: [{
                            url: 'https://cmcd.event.collector/api',
                            enabled: true,
                            cmcdMode: 'event',
                            mode: 'query',
                            enabledKeys: ['e'],
                            events: ['e'],
                            timeInterval: 0
                        }]
                    }
                }
            });

            const errorPayload = {
                error: {
                    code: 456,
                    message: 'CMCD Event Error',
                    data: {
                        request: {
                            type: HTTPRequest.CMCD_EVENT // This should prevent the report
                        }
                    }
                }
            };

            eventBus.trigger(MediaPlayerEvents.ERROR, errorPayload);
            expect(urlLoaderMock.load.called).to.be.false;
        });

        it('should not send a report when version is 1', () => {
            settings.update({
                streaming: {
                    cmcd: {
                        version: 1,
                        targets: [{
                            url: 'https://cmcd.event.collector/api',
                            enabled: true,
                            cmcdMode: 'event',
                            mode: 'query',
                            timeInterval: 0
                        }]
                    }
                }
            });

            eventBus.trigger(MediaPlayerEvents.PLAYBACK_PLAYING);
            expect(urlLoaderMock.load.called).to.be.false;
        });
    });

    describe('Event Mode player state events', () => {
        let urlLoaderMock;

        beforeEach(() => {
            urlLoaderMock = {
                load: sinon.spy()
            };

            cmcdController.reset();
            settings.update({
                streaming: {
                    cmcd: {
                        version: 2,
                        targets: [{
                            url: 'https://cmcd.event.collector/api',
                            enabled: true,
                            cmcdMode: 'event',
                            mode: 'query',
                            enabledKeys: ['e', 'sta'],
                            events: ['ps'],
                        }]
                    }
                }
            });

            cmcdController.setConfig({
                abrController: abrControllerMock,
                dashMetrics: dashMetricsMock,
                playbackController: playbackControllerMock,
                throughputController: throughputControllerMock,
                serviceDescriptionController: serviceDescriptionControllerMock,
                urlLoader: urlLoaderMock
            });

            cmcdController.initialize();
        });

        it('should send a report when the STARTING event is triggered', () => {
            eventBus.trigger(MediaPlayerEvents.PLAYBACK_INITIALIZED);
            expect(urlLoaderMock.load.called).to.be.true;
            const requestSent = urlLoaderMock.load.firstCall.args[0].request;
            expect(requestSent.url).to.include('https://cmcd.event.collector/api?');
            
            const url = new URL(requestSent.url);
            const cmcdString = url.searchParams.get('CMCD');
            const metrics = decodeCmcd(cmcdString);
            expect(metrics).to.have.property('e', 'ps');
            expect(metrics).to.have.property('sta', 's');
        });

        it('should send a report when the PLAYING event is triggered', () => {
            eventBus.trigger(MediaPlayerEvents.PLAYBACK_PLAYING);
            expect(urlLoaderMock.load.calledOnce).to.be.true;
            const requestSent = urlLoaderMock.load.firstCall.args[0].request;
            expect(requestSent.url).to.include('https://cmcd.event.collector/api?');
            
            const url = new URL(requestSent.url);
            const cmcdString = url.searchParams.get('CMCD');
            const metrics = decodeCmcd(cmcdString);
            expect(metrics).to.have.property('e', 'ps');
            expect(metrics).to.have.property('sta', 'p');
        });

        it('should send a report when the REBUFFERING event is triggered', () => {
            eventBus.trigger(MediaPlayerEvents.PLAYBACK_STARTED);
            eventBus.trigger(MediaPlayerEvents.PLAYBACK_WAITING);
            expect(urlLoaderMock.load.called).to.be.true;
            const requestSent = urlLoaderMock.load.firstCall.args[0].request;
            expect(requestSent.url).to.include('https://cmcd.event.collector/api?');
            
            const url = new URL(requestSent.url);
            const cmcdString = url.searchParams.get('CMCD');
            const metrics = decodeCmcd(cmcdString);
            expect(metrics).to.have.property('e', 'ps');
            expect(metrics).to.have.property('sta', 'r');
        });

        it('should send a report when the PAUSED event is triggered', () => {
            eventBus.trigger(MediaPlayerEvents.PLAYBACK_PAUSED);
            expect(urlLoaderMock.load.called).to.be.true;
            const requestSent = urlLoaderMock.load.firstCall.args[0].request;
            expect(requestSent.url).to.include('https://cmcd.event.collector/api?');
            
            const url = new URL(requestSent.url);
            const cmcdString = url.searchParams.get('CMCD');
            const metrics = decodeCmcd(cmcdString);
            expect(metrics).to.have.property('e', 'ps');
            expect(metrics).to.have.property('sta', 'a');
        });

        it('should send a report when the SEEKING event is triggered', () => {
            eventBus.trigger(MediaPlayerEvents.PLAYBACK_SEEKING);
            expect(urlLoaderMock.load.calledOnce).to.be.true;
            const requestSent = urlLoaderMock.load.firstCall.args[0].request;
            expect(requestSent.url).to.include('https://cmcd.event.collector/api?');
            
            const url = new URL(requestSent.url);
            const cmcdString = url.searchParams.get('CMCD');
            const metrics = decodeCmcd(cmcdString);
            expect(metrics).to.have.property('e', 'ps');
            expect(metrics).to.have.property('sta', 'k');
        });

        it('should send a report when the WAITING event is triggered', () => {
            eventBus.trigger(MediaPlayerEvents.PLAYBACK_WAITING);
            expect(urlLoaderMock.load.calledOnce).to.be.true;
            const requestSent = urlLoaderMock.load.firstCall.args[0].request;
            expect(requestSent.url).to.include('https://cmcd.event.collector/api?');
            
            const url = new URL(requestSent.url);
            const cmcdString = url.searchParams.get('CMCD');
            const metrics = decodeCmcd(cmcdString);
            expect(metrics).to.have.property('e', 'ps');
            expect(metrics).to.have.property('sta', 'w');
        });

        it('should send a report when the ENDED event is triggered', () => {
            eventBus.trigger(MediaPlayerEvents.PLAYBACK_ENDED);
            expect(urlLoaderMock.load.called).to.be.true;
            const requestSent = urlLoaderMock.load.firstCall.args[0].request;
            expect(requestSent.url).to.include('https://cmcd.event.collector/api?');
            const url = new URL(requestSent.url);
            const cmcdString = url.searchParams.get('CMCD');
            const metrics = decodeCmcd(cmcdString);
            expect(metrics).to.have.property('e', 'ps');
            expect(metrics).to.have.property('sta', 'e');
        });
    });

    describe('Event Mode - time interval', () => {
        let urlLoaderMock;
        let clock;

        beforeEach(() => {
            clock = sinon.useFakeTimers();
            urlLoaderMock = {
                load: sinon.spy()
            };

            cmcdController.reset();
            settings.update({
                streaming: {
                    cmcd: {
                        version: 2,
                        targets: [{
                            url: 'https://cmcd.event.collector/api',
                            enabled: true,
                            cmcdMode: 'event',
                            mode: 'header',
                            enabledKeys: ['e'],
                            events: ['ps', 't'],
                            timeInterval: 1
                        }]
                    }
                }
            });
            cmcdController.setConfig({
                abrController: abrControllerMock,
                dashMetrics: dashMetricsMock,
                playbackController: playbackControllerMock,
                throughputController: throughputControllerMock,
                serviceDescriptionController: serviceDescriptionControllerMock,
                urlLoader: urlLoaderMock
            });
            cmcdController.initialize();
        });

        afterEach(function() {
            clock.restore();
        });

        it('should send reports periodically according to the timeInterval', () => {
            expect(urlLoaderMock.load.calledOnce).to.be.true;
            let requestSent = urlLoaderMock.load.firstCall.args[0].request;
            let headers = requestSent.headers;
            let metrics = decodeCmcd(headers['CMCD-Status']);
            expect(metrics).to.have.property('e', 't');
            clock.tick(1000);
            expect(urlLoaderMock.load.calledTwice).to.be.true;
        });
    })

    describe('Response Mode', () => {
        let urlLoaderMock;

        beforeEach(() => {
            urlLoaderMock = {
                load: sinon.spy()
            };

            cmcdController.setConfig({
                abrController: abrControllerMock,
                dashMetrics: dashMetricsMock,
                playbackController: playbackControllerMock,
                throughputController: throughputControllerMock,
                serviceDescriptionController: serviceDescriptionControllerMock,
                urlLoader: urlLoaderMock
            });
        });

        it('should send a response report when a media segment response is received', () => {
            settings.update({
                streaming: {
                    cmcd: {
                        version: 2,
                        targets: [{
                            url: 'https://cmcd.response.collector/api',
                            enabled: true,
                            cmcdMode: 'response',
                            mode: 'query',
                            includeOnRequests: ['segment'],
                            enabledKeys: ['rc', 'ttfb', 'ttlb', 'url', 'sid']
                        }]
                    }
                }
            });

            let currentTime = new Date(Date.now());
            const mockResponse = {
                status: 200,
                request: {
                    customData: {
                        request: {
                            type: HTTPRequest.MEDIA_SEGMENT_TYPE,
                            url: 'http://test.url/video.m4s',
                            startDate: currentTime - 1000,
                            firstByteDate: currentTime - 500,
                            endDate: new Date()
                        }
                    },
                    cmcd: { sid: 'session-id' },
                }
            };

            const interceptor = cmcdController.getCmcdResponseInterceptors()[0];
            interceptor(mockResponse);

            expect(urlLoaderMock.load.calledOnce).to.be.true;
            const requestSent = urlLoaderMock.load.firstCall.args[0].request;
            expect(requestSent.url).to.include('https://cmcd.response.collector/api?');

            const url = new URL(requestSent.url);
            const cmcdString = url.searchParams.get('CMCD');
            const metrics = decodeCmcd(cmcdString);
            expect(metrics).to.have.property('rc');
            expect(metrics).to.have.property('sid', 'session-id');
            expect(metrics).to.have.property('url', 'http://test.url/video.m4s');
            expect(metrics).to.have.property('ttfb');
            expect(metrics).to.have.property('ttlb');
        });

        it('should not send a report if enabled keys is empty', () => {
            settings.update({
                streaming: {
                    cmcd: {
                        version: 2,
                        targets: [{
                            url: 'https://cmcd.response.collector/api',
                            enabled: true,
                            cmcdMode: 'response',
                            mode: 'query',
                            enabledKeys: [],
                            includeOnRequests: ['mpd']
                        }]
                    }
                }
            });

            const mockResponse = {
                status: 200,
                request: {
                    customData: {
                        request: {
                            type: HTTPRequest.MEDIA_SEGMENT_TYPE,
                            url: 'http://test.url/video.m4s'
                        }
                    },
                    cmcd: { sid: 'session-id' }
                }
            };

            const interceptor = cmcdController.getCmcdResponseInterceptors()[0];
            interceptor(mockResponse);

            expect(urlLoaderMock.load.called).to.be.false;
        });

        it('should not send a report if the target is disabled', () => {
            settings.update({
                streaming: {
                    cmcd: {
                        version: 2,
                        targets: [{
                            url: 'https://cmcd.response.collector/api',
                            enabled: false,
                            cmcdMode: 'response',
                            mode: 'query',
                            includeOnRequests: ['segment']
                        }]
                    }
                }
            });

            const mockResponse = {
                status: 200,
                request: {
                    customData: {
                        request: {
                            type: HTTPRequest.MEDIA_SEGMENT_TYPE,
                            url: 'http://test.url/video.m4s'
                        }
                    },
                    cmcd: { sid: 'session-id' }
                }
            };

            const interceptor = cmcdController.getCmcdResponseInterceptors()[0];
            interceptor(mockResponse);

            expect(urlLoaderMock.load.called).to.be.false;
        });

        it('should not send a report if version is 1', () => {
            settings.update({
                streaming: {
                    cmcd: {
                        version: 1,
                        targets: [{
                            url: 'https://cmcd.response.collector/api',
                            enabled: true,
                            cmcdMode: 'response',
                            mode: 'query',
                            includeOnRequests: ['segment']
                        }]
                    }
                }
            });

            const mockResponse = {
                status: 200,
                request: {
                    customData: {
                        request: {
                            type: HTTPRequest.MEDIA_SEGMENT_TYPE,
                            url: 'http://test.url/video.m4s'
                        }
                    },
                    cmcd: { sid: 'session-id' }
                }
            };

            const interceptor = cmcdController.getCmcdResponseInterceptors()[0];
            interceptor(mockResponse);

            expect(urlLoaderMock.load.called).to.be.false;
        });

        it('should send a report with headers if mode is "header"', () => {
            settings.update({
                streaming: {
                    cmcd: {
                        version: 2,
                        targets: [{
                            url: 'https://cmcd.response.collector/api',
                            enabled: true,
                            cmcdMode: 'response',
                            mode: 'header',
                            includeOnRequests: ['segment'],
                            enabledKeys: ['rc', 'sid']
                        }]
                    }
                }
            });

            const mockResponse = {
                status: 200,
                request: {
                    customData: {
                        request: {
                            type: HTTPRequest.MEDIA_SEGMENT_TYPE,
                            url: 'http://test.url/video.m4s'
                        }
                    },
                    cmcd: { sid: 'session-id' }
                }
            };

            const interceptor = cmcdController.getCmcdResponseInterceptors()[0];
            interceptor(mockResponse);

            expect(urlLoaderMock.load.calledOnce).to.be.true;
            const requestSent = urlLoaderMock.load.firstCall.args[0].request;
            expect(requestSent.url).to.not.include('?CMCD=');
            expect(requestSent.headers).to.have.property('CMCD-Request');
            expect(requestSent.headers).to.have.property('CMCD-Session');

            const requestMetrics = decodeCmcd(requestSent.headers['CMCD-Request']);
            const sessionMetrics = decodeCmcd(requestSent.headers['CMCD-Session']);

            expect(requestMetrics).to.have.property('rc', 200);
            expect(sessionMetrics).to.have.property('sid', 'session-id');
        });

        it('should send all available keys if enabledKeys is not defined', () => {
            settings.update({
                streaming: {
                    cmcd: {
                        version: 2,
                        targets: [{
                            url: 'https://cmcd.response.collector/api',
                            enabled: true,
                            cmcdMode: 'response',
                            mode: 'query',
                            includeOnRequests: ['segment'],
                        }]
                    }
                }
            });

            let currentTime = new Date(Date.now());
            const mockResponse = {
                status: 200,
                request: {
                    customData: {
                        request: {
                            type: HTTPRequest.MEDIA_SEGMENT_TYPE,
                            url: 'http://test.url/video.m4s',
                            startDate: currentTime - 1000,
                            firstByteDate: currentTime - 500,
                            endDate: new Date()
                        }
                    },
                    cmcd: { sid: 'session-id' },
                }
            };

            const interceptor = cmcdController.getCmcdResponseInterceptors()[0];
            interceptor(mockResponse);

            expect(urlLoaderMock.load.calledOnce).to.be.true;
            const requestSent = urlLoaderMock.load.firstCall.args[0].request;
            expect(requestSent.url).to.include('https://cmcd.response.collector/api?');

            const url = new URL(requestSent.url);
            const cmcdString = url.searchParams.get('CMCD');
            const metrics = decodeCmcd(cmcdString);
            expect(metrics).to.have.property('rc');
            expect(metrics).to.have.property('sid', 'session-id');
            expect(metrics).to.have.property('url', 'http://test.url/video.m4s');
            expect(metrics).to.have.property('ttfb');
            expect(metrics).to.have.property('ttlb');
            expect(metrics).to.have.property('v');
        });

        it('should send a response report with response mode available keys', () => {
            settings.update({
                streaming: {
                    cmcd: {
                        version: 2,
                        targets: [{
                            url: 'https://cmcd.response.collector/api',
                            enabled: true,
                            cmcdMode: 'response',
                            mode: 'query',
                            includeOnRequests: ['segment'],
                            enabledKeys: ['rc', 'e']
                        }]
                    }
                }
            });

            let currentTime = new Date(Date.now());
            const mockResponse = {
                status: 200,
                request: {
                    customData: {
                        request: {
                            type: HTTPRequest.MEDIA_SEGMENT_TYPE,
                            url: 'http://test.url/video.m4s',
                            startDate: currentTime - 1000,
                            firstByteDate: currentTime - 500,
                            endDate: new Date()
                        }
                    },
                    cmcd: { sid: 'session-id' },
                }
            };

            const interceptor = cmcdController.getCmcdResponseInterceptors()[0];
            interceptor(mockResponse);

            expect(urlLoaderMock.load.calledOnce).to.be.true;
            const requestSent = urlLoaderMock.load.firstCall.args[0].request;
            expect(requestSent.url).to.include('https://cmcd.response.collector/api?');

            const url = new URL(requestSent.url);
            const cmcdString = url.searchParams.get('CMCD');
            const metrics = decodeCmcd(cmcdString);
            expect(metrics).to.have.property('rc');
            expect(metrics).to.not.have.property('e');
        });
    });

});
