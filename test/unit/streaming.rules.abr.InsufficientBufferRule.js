import InsufficientBufferRule from '../../src/streaming/rules/abr/InsufficientBufferRule.js';
import SwitchRequest from '../../src/streaming/rules/SwitchRequest.js';
import EventBus from '../../src/core/EventBus.js';
import Events from '../../src/core/events/Events.js';
import DashMetricsMock from './mocks/DashMetricsMock.js';
import Settings from '../../src/core/Settings.js';
import {expect} from 'chai';

const context = {};
let insufficientBufferRule;
const eventBus = EventBus(context).getInstance();
const settings = Settings(context).getInstance();

describe('InsufficientBufferRule', function () {
    beforeEach(function () {
        settings.reset();
        insufficientBufferRule = InsufficientBufferRule(context).create({
            settings
        });
    });

    it('should return an empty switchRequest when getSwitchRequest function is called with an empty parameter', function () {
        const maxIndexRequest = insufficientBufferRule.getSwitchRequest();

        expect(maxIndexRequest.representation).to.be.equal(SwitchRequest.NO_CHANGE);
    });

    it('should return an empty switchRequest when getSwitchRequest function is called with an malformed parameter', function () {
        const maxIndexRequest = insufficientBufferRule.getSwitchRequest({});

        expect(maxIndexRequest.representation).to.be.equal(SwitchRequest.NO_CHANGE);
    });


    it('should return an empty switch request when bufferState is empty', function () {
        const dashMetricsMock = new DashMetricsMock();
        const rulesContextMock = {
            getMediaInfo: function () {
            },
            getMediaType: function () {
                return 'video';
            },
            getAbrController: function () {
            },
            getStreamInfo: function () {
                return {
                    id: 'DUMMY_STREAM-01'
                };
            },
            getRepresentation: function () {
                return { fragmentDuration: 4 };
            },
            getScheduleController: function () {
                return {
                    getPlaybackController: function () {
                        return {
                            getLowLatencyModeEnabled: function () {
                                return false;
                            }
                        }
                    }
                }
            }
        };
        const rule = InsufficientBufferRule(context).create({
            dashMetrics: dashMetricsMock,
            settings
        });

        const maxIndexRequest = rule.getSwitchRequest(rulesContextMock);
        expect(maxIndexRequest.representation).to.be.equal(SwitchRequest.NO_CHANGE);
    });

    it('should return an empty switch request when first call is done with a buffer in state bufferStalled', function () {
        const dashMetricsMock = new DashMetricsMock();
        let bufferState = {
            state: 'bufferStalled'
        };
        const rulesContextMock = {
            getMediaInfo: function () {
            },
            getMediaType: function () {
                return 'video';
            },
            getAbrController: function () {
            },
            getStreamInfo: function () {
                return {
                    id: 'DUMMY_STREAM-01'
                };
            },
            getRepresentation: function () {
                return { fragmentDuration: 4 };
            },
            getScheduleController: function () {
                return {
                    getPlaybackController: function () {
                        return {
                            getLowLatencyModeEnabled: function () {
                                return false;
                            }
                        }
                    }
                }
            }
        };
        const rule = InsufficientBufferRule(context).create({
            dashMetrics: dashMetricsMock,
            settings
        });
        dashMetricsMock.addBufferState('video', bufferState);
        let maxIndexRequest = rule.getSwitchRequest(rulesContextMock);
        expect(maxIndexRequest.representation).to.be.equal(SwitchRequest.NO_CHANGE);
    });

    it('should return an empty switch request with a buffer in state bufferLoaded and fragmentDuration is NaN', function () {
        const dashMetricsMock = new DashMetricsMock();
        let bufferState = {
            state: 'bufferLoaded'
        };
        const rulesContextMock = {
            getMediaInfo: function () {
            },
            getMediaType: function () {
                return 'video';
            },
            getAbrController: function () {
            },
            getStreamInfo: function () {
                return {
                    id: 'DUMMY_STREAM-01'
                };
            },
            getRepresentation: function () {
                return { fragmentDuration: NaN };
            },
            getScheduleController: function () {
                return {
                    getPlaybackController: function () {
                        return {
                            getLowLatencyModeEnabled: function () {
                                return false;
                            }
                        }
                    }
                }
            }
        };
        const rule = InsufficientBufferRule(context).create({
            dashMetrics: dashMetricsMock,
            settings
        });
        dashMetricsMock.addBufferState('video', bufferState);
        const maxIndexRequest = rule.getSwitchRequest(rulesContextMock);
        expect(maxIndexRequest.representation).to.be.equal(SwitchRequest.NO_CHANGE);
    });

    it('should return index 0 after two fragments appended with a buffer in state bufferLoaded and fragmentDuration is NaN and then bufferStalled with fragmentDuration > 0', function () {
        let bufferState = {
            state: 'bufferLoaded'
        };
        let voRepresentation = { fragmentDuration: NaN, id: 1 };
        const dashMetricsMock = new DashMetricsMock();
        const rulesContextMock = {
            getMediaInfo: function () {
            },
            getMediaType: function () {
                return 'video';
            },
            getAbrController: function () {
                return {
                    getOptimalRepresentationForBitrate: function () {
                        return voRepresentation
                    }
                }
            },
            getStreamInfo: function () {
                return {
                    id: 'DUMMY_STREAM-01'
                };
            },
            getRepresentation: function () {
                return voRepresentation;
            },
            getScheduleController: function () {
                return {
                    getPlaybackController: function () {
                        return {
                            getLowLatencyModeEnabled: function () {
                                return false;
                            }
                        }
                    }
                }
            }
        };

        dashMetricsMock.addBufferState('video', bufferState);

        const rule = InsufficientBufferRule(context).create({
            dashMetrics: dashMetricsMock,
            settings
        });

        let e = { mediaType: 'video', startTime: 0 };
        eventBus.trigger(Events.BYTES_APPENDED_END_FRAGMENT, e);

        e = { mediaType: 'video', startTime: 4 };//Event objects can't be reused because they get annotated by eventBus.
        eventBus.trigger(Events.BYTES_APPENDED_END_FRAGMENT, e);

        bufferState.state = 'bufferStalled';
        dashMetricsMock.addBufferState('video', bufferState);
        voRepresentation.fragmentDuration = 4;
        const maxIndexRequest = rule.getSwitchRequest(rulesContextMock);
        expect(maxIndexRequest.representation.id).to.be.equal(1);
    });

    it('should return index -1 for zero and one fragments appended after a seek, then index 0 afterwards when bufferStalled', function () {
        const bufferState = {
            state: 'bufferStalled'
        };
        const voRepresentation = { fragmentDuration: 4, id: 1 };
        const dashMetricsMock = new DashMetricsMock();
        dashMetricsMock.addBufferState('video', bufferState);

        const rulesContextMock = {
            getMediaInfo: function () {
            },
            getMediaType: function () {
                return 'video';
            },
            getAbrController: function () {
                return {
                    getOptimalRepresentationForBitrate: function () {
                        return voRepresentation
                    }
                }
            },
            getRepresentation: function () {
                return voRepresentation;
            },
            getStreamInfo: function () {
                return {
                    id: 'DUMMY_STREAM-01'
                };
            },
            getScheduleController: function () {
                return {
                    getPlaybackController: function () {
                        return {
                            getLowLatencyModeEnabled: function () {
                                return false;
                            }
                        }
                    }
                }
            }
        };

        const rule = InsufficientBufferRule(context).create({
            dashMetrics: dashMetricsMock,
            settings
        });

        let maxIndexRequest = rule.getSwitchRequest(rulesContextMock);
        expect(maxIndexRequest.representation).to.be.equal(SwitchRequest.NO_CHANGE);

        let e = { mediaType: 'video', startTime: 0 };
        eventBus.trigger(Events.BYTES_APPENDED_END_FRAGMENT, e);
        maxIndexRequest = rule.getSwitchRequest(rulesContextMock);
        expect(maxIndexRequest.representation).to.be.equal(SwitchRequest.NO_CHANGE);

        e = { mediaType: 'video', startTime: 4 };
        eventBus.trigger(Events.BYTES_APPENDED_END_FRAGMENT, e);
        maxIndexRequest = rule.getSwitchRequest(rulesContextMock);
        expect(maxIndexRequest.representation.id).to.be.equal(1);
    });
});
