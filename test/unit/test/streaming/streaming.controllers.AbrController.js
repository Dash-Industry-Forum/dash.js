import VoHelper from '../../helpers/VOHelper.js';
import ObjectsHelper from '../../helpers/ObjectsHelper.js';
import AbrController from '../../../../src/streaming/controllers/AbrController.js';
import Constants from '../../../../src/streaming/constants/Constants.js';
import Settings from '../../../../src/core/Settings.js';
import VideoModelMock from '../../mocks/VideoModelMock.js';
import DomStorageMock from '../../mocks/DomStorageMock.js';
import DashMetricsMock from '../../mocks/DashMetricsMock.js';
import AdapterMock from '../../mocks/AdapterMock.js';
import StreamControllerMock from '../../mocks/StreamControllerMock.js';
import CustomParametersModel from '../../../../src/streaming/models/CustomParametersModel.js';
import MediaPlayerModel from '../../../../src/streaming/models/MediaPlayerModel.js';
import CmsdModel from '../../../../src/streaming/models/CmsdModel.js';
import ServiceDescriptionController from '../../../../src/dash/controllers/ServiceDescriptionController.js';
import PlaybackControllerMock from '../../mocks/PlaybackControllerMock.js';
import ThroughputControllerMock from '../../mocks/ThroughputControllerMock.js';
import {expect, assert} from 'chai';
import EventBus from '../../../../src/core/EventBus.js';
import MediaPlayerEvents from '../../../../src/streaming/MediaPlayerEvents.js';
import sinon from 'sinon';
import CapabilitiesMock from '../../mocks/CapabilitiesMock.js';
import SegmentSequenceProperties from '../../../../src/dash/vo/SegmentSequenceProperties.js';

describe('AbrController', function () {
    const context = {};
    const voHelper = new VoHelper();
    const objectsHelper = new ObjectsHelper();

    const eventBus = EventBus(context).getInstance();
    const settings = Settings(context).getInstance();
    const abrCtrl = AbrController(context).getInstance();
    const dummyMediaInfo = voHelper.getDummyMediaInfo(Constants.VIDEO);
    const enhancementMediaInfo = voHelper.getDummyMediaInfo(Constants.ENHANCEMENT);
    const dummyRepresentations = [voHelper.getDummyRepresentation(Constants.VIDEO, 0), voHelper.getDummyRepresentation(Constants.VIDEO, 1),
        voHelper.getDummyRepresentation(Constants.ENHANCEMENT, 2)];

    // Representation 2 has a dependentRepresentation with id 0
    dummyRepresentations[2].dependentRepresentation = dummyRepresentations[0];

    const domStorageMock = new DomStorageMock();
    const dashMetricsMock = new DashMetricsMock();
    const streamControllerMock = new StreamControllerMock();
    const customParametersModel = CustomParametersModel(context).getInstance();
    const mediaPlayerModel = MediaPlayerModel(context).getInstance();
    const cmsdModel = CmsdModel(context).getInstance();
    const serviceDescriptionController = ServiceDescriptionController(context).getInstance();
    const playbackControllerMock = new PlaybackControllerMock();
    const throughputControllerMock = new ThroughputControllerMock();
    const capabilitiesMock = new CapabilitiesMock();

    let streamProcessor;
    let adapterMock;
    let videoModelMock;

    mediaPlayerModel.setConfig({
        serviceDescriptionController,
        playbackController: playbackControllerMock
    })

    beforeEach(function () {
        adapterMock = new AdapterMock();
        videoModelMock = new VideoModelMock();
        abrCtrl.setConfig({
            dashMetrics: dashMetricsMock,
            videoModel: videoModelMock,
            adapter: adapterMock,
            domStorage: domStorageMock,
            mediaPlayerModel,
            cmsdModel,
            settings: settings,
            capabilities: capabilitiesMock,
            streamController: streamControllerMock,
            throughputController: throughputControllerMock,
            customParametersModel
        });
        streamProcessor = objectsHelper.getDummyStreamProcessor(Constants.VIDEO);
        abrCtrl.initialize();
        abrCtrl.registerStreamType(Constants.VIDEO, streamProcessor);
    });

    afterEach(function () {
        abrCtrl.reset();
        settings.reset();
        eventBus.reset();
    });

    describe('getOptimalRepresentationForBitrate()', function () {

        it('Should return Representation with lowest bitrate when 0 target bitrate provided', function () {
            const mediaInfo = streamProcessor.getMediaInfo();
            adapterMock.getVoRepresentations = () => {
                return [
                    {
                        bitrateInKbit: 10,
                        bandwidth: 10000,
                        mediaInfo,
                        id: 1
                    },
                    {
                        bitrateInKbit: 5,
                        bandwidth: 5000,
                        mediaInfo,
                        id: 3
                    }
                ]
            }

            adapterMock.areMediaInfosEqual = () => {
                return true
            }

            mediaInfo.streamInfo = streamProcessor.getStreamInfo();
            mediaInfo.type = Constants.VIDEO;

            let optimalRepresentationForBitrate = abrCtrl.getOptimalRepresentationForBitrate(mediaInfo, 0);
            expect(optimalRepresentationForBitrate.id).to.be.equal(3);
        })

        it('Should return Representation with lowest bitrate when all Representations have a higher bitrate than the target bitrate', function () {
            const mediaInfo = streamProcessor.getMediaInfo();
            adapterMock.getVoRepresentations = () => {
                return [
                    {
                        bitrateInKbit: 10,
                        bandwidth: 10000,
                        mediaInfo,
                        id: 1
                    },
                    {
                        bitrateInKbit: 5,
                        bandwidth: 5000,
                        mediaInfo,
                        id: 3
                    }
                ]
            }

            adapterMock.areMediaInfosEqual = () => {
                return true
            }

            mediaInfo.streamInfo = streamProcessor.getStreamInfo();
            mediaInfo.type = Constants.VIDEO;

            let optimalRepresentationForBitrate = abrCtrl.getOptimalRepresentationForBitrate(mediaInfo, 4);
            expect(optimalRepresentationForBitrate.id).to.be.equal(3);
        })

        it('Should return Representation with suitable bitrate if only one option matches', function () {
            const mediaInfo = streamProcessor.getMediaInfo();
            adapterMock.getVoRepresentations = () => {
                return [
                    {
                        bitrateInKbit: 10,
                        bandwidth: 10000,
                        mediaInfo,
                        id: 1
                    },
                    {
                        bitrateInKbit: 5,
                        bandwidth: 5000,
                        mediaInfo,
                        id: 3
                    }
                ]
            }

            adapterMock.areMediaInfosEqual = () => {
                return true
            }

            mediaInfo.streamInfo = streamProcessor.getStreamInfo();
            mediaInfo.type = Constants.VIDEO;

            let optimalRepresentationForBitrate = abrCtrl.getOptimalRepresentationForBitrate(mediaInfo, 8);
            expect(optimalRepresentationForBitrate.id).to.be.equal(3);
        })

        it('Should return Representation with suitable bitrate if both options match', function () {
            const mediaInfo = streamProcessor.getMediaInfo();
            adapterMock.getVoRepresentations = () => {
                return [
                    {
                        bitrateInKbit: 10,
                        bandwidth: 10000,
                        mediaInfo,
                        id: 1
                    },
                    {
                        bitrateInKbit: 5,
                        bandwidth: 5000,
                        mediaInfo,
                        id: 3
                    }
                ]
            }

            adapterMock.areMediaInfosEqual = () => {
                return true
            }

            mediaInfo.streamInfo = streamProcessor.getStreamInfo();
            mediaInfo.type = Constants.VIDEO;

            let optimalRepresentationForBitrate = abrCtrl.getOptimalRepresentationForBitrate(mediaInfo, 15);
            expect(optimalRepresentationForBitrate.id).to.be.equal(1);
        })

        it('Should return the Representation with the highest absolute index defined by qualityRanking', function () {
            const mediaInfo = streamProcessor.getMediaInfo();
            adapterMock.getVoRepresentations = () => {
                return [
                    {
                        bitrateInKbit: 10,
                        bandwidth: 10000,
                        mediaInfo,
                        id: 1,
                        qualityRanking: 1
                    },
                    {
                        bitrateInKbit: 5,
                        bandwidth: 5000,
                        mediaInfo,
                        id: 3,
                        qualityRanking: 0
                    }
                ]
            }

            adapterMock.areMediaInfosEqual = () => {
                return true
            }

            mediaInfo.streamInfo = streamProcessor.getStreamInfo();
            mediaInfo.type = Constants.VIDEO;

            let optimalRepresentationForBitrate = abrCtrl.getOptimalRepresentationForBitrate(mediaInfo, 15);
            expect(optimalRepresentationForBitrate.id).to.be.equal(3);
        })

        it('Should return the Representation with the highest pixels per second for same MediaInfo', function () {
            const mediaInfo = streamProcessor.getMediaInfo();
            adapterMock.getVoRepresentations = () => {
                return [
                    {
                        bitrateInKbit: 10,
                        bandwidth: 10000,
                        mediaInfo,
                        id: 1,
                        pixelsPerSecond: 100
                    },
                    {
                        bitrateInKbit: 5,
                        bandwidth: 5000,
                        mediaInfo,
                        id: 3,
                        pixelsPerSecond: 200
                    }
                ]
            }

            adapterMock.areMediaInfosEqual = () => {
                return true
            }

            mediaInfo.streamInfo = streamProcessor.getStreamInfo();
            mediaInfo.type = Constants.VIDEO;

            let optimalRepresentationForBitrate = abrCtrl.getOptimalRepresentationForBitrate(mediaInfo, 15);
            expect(optimalRepresentationForBitrate.id).to.be.equal(3);
        })

        it('Should return the Representation with the highest bandwidth per second for same pixels per second and same MediaInfo ', function () {
            const mediaInfo = streamProcessor.getMediaInfo();
            adapterMock.getVoRepresentations = () => {
                return [
                    {
                        bitrateInKbit: 10,
                        bandwidth: 10000,
                        mediaInfo,
                        id: 1,
                        pixelsPerSecond: 200
                    },
                    {
                        bitrateInKbit: 5,
                        bandwidth: 5000,
                        mediaInfo,
                        id: 3,
                        pixelsPerSecond: 200
                    }
                ]
            }

            adapterMock.areMediaInfosEqual = () => {
                return true
            }

            mediaInfo.streamInfo = streamProcessor.getStreamInfo();
            mediaInfo.type = Constants.VIDEO;

            let optimalRepresentationForBitrate = abrCtrl.getOptimalRepresentationForBitrate(mediaInfo, 15);
            expect(optimalRepresentationForBitrate.id).to.be.equal(1);
        })

        it('Should return the Representation with the highest pixels per second for different MediaInfo', function () {
            const mediaInfo = streamProcessor.getMediaInfo();
            adapterMock.getVoRepresentations = () => {
                return [
                    {
                        bitrateInKbit: 10,
                        bandwidth: 10000,
                        mediaInfo,
                        id: 1,
                        pixelsPerSecond: 100
                    },
                    {
                        bitrateInKbit: 5,
                        bandwidth: 5000,
                        mediaInfo,
                        id: 3,
                        pixelsPerSecond: 200
                    }
                ]
            }

            adapterMock.areMediaInfosEqual = () => {
                return false
            }

            mediaInfo.streamInfo = streamProcessor.getStreamInfo();
            mediaInfo.type = Constants.VIDEO;

            let optimalRepresentationForBitrate = abrCtrl.getOptimalRepresentationForBitrate(mediaInfo, 15);
            expect(optimalRepresentationForBitrate.id).to.be.equal(3);
        })


        it('Should return the Representation with the lowest bits per pixel for same pixels per second and different MediaInfo ', function () {
            const mediaInfo = streamProcessor.getMediaInfo();
            adapterMock.getVoRepresentations = () => {
                return [
                    {
                        bitrateInKbit: 10,
                        bandwidth: 2000,
                        mediaInfo,
                        id: 1,
                        bitsPerPixel: 10,
                        pixelsPerSecond: 200
                    },
                    {
                        bitrateInKbit: 5,
                        bandwidth: 5000,
                        mediaInfo,
                        id: 3,
                        bitsPerPixel: 20,
                        pixelsPerSecond: 200
                    }
                ]
            }

            adapterMock.areMediaInfosEqual = () => {
                return false
            }

            mediaInfo.streamInfo = streamProcessor.getStreamInfo();
            mediaInfo.type = Constants.VIDEO;

            let optimalRepresentationForBitrate = abrCtrl.getOptimalRepresentationForBitrate(mediaInfo, 15);
            expect(optimalRepresentationForBitrate.id).to.be.equal(1);
        })

        it('Should return the Representation with the highest bandwidth when having the same bits per pixel and same pixels per second and different MediaInfo ', function () {
            const mediaInfo = streamProcessor.getMediaInfo();
            adapterMock.getVoRepresentations = () => {
                return [
                    {
                        bitrateInKbit: 10,
                        bandwidth: 2000,
                        mediaInfo,
                        id: 1,
                        bitsPerPixel: 10,
                        pixelsPerSecond: 200
                    },
                    {
                        bitrateInKbit: 5,
                        bandwidth: 5000,
                        mediaInfo,
                        id: 3,
                        bitsPerPixel: 10,
                        pixelsPerSecond: 200
                    }
                ]
            }

            adapterMock.areMediaInfosEqual = () => {
                return false
            }

            mediaInfo.streamInfo = streamProcessor.getStreamInfo();
            mediaInfo.type = Constants.VIDEO;

            let optimalRepresentationForBitrate = abrCtrl.getOptimalRepresentationForBitrate(mediaInfo, 15);
            expect(optimalRepresentationForBitrate.id).to.be.equal(3);
        })

        it('should return the right Representation in case only bitrate is given', function () {
            const mediaInfo = streamProcessor.getMediaInfo();
            const bitrateList = mediaInfo.bitrateList;

            adapterMock.getVoRepresentations = () => {
                return [
                    {
                        bitrateInKbit: bitrateList[0].bandwidth / 1000,
                        bandwidth: bitrateList[0].bandwidth,
                        mediaInfo,
                        id: 1
                    },
                    {
                        bitrateInKbit: bitrateList[1].bandwidth / 1000,
                        bandwidth: bitrateList[1].bandwidth,
                        mediaInfo,
                        id: 2
                    },
                    {
                        bitrateInKbit: bitrateList[2].bandwidth / 1000,
                        bandwidth: bitrateList[2].bandwidth,
                        mediaInfo,
                        id: 3
                    }
                ]
            }

            adapterMock.areMediaInfosEqual = () => {
                return true
            }

            mediaInfo.streamInfo = streamProcessor.getStreamInfo();
            mediaInfo.type = Constants.VIDEO;

            let optimalRepresentationForBitrate = abrCtrl.getOptimalRepresentationForBitrate(mediaInfo, bitrateList[2].bandwidth / 1000);
            expect(optimalRepresentationForBitrate.id).to.be.equal(3);
        });
    })

    describe('canPerformQualitySwitch()', function () {

        it('should return true if lastSegment is undefined', function() {
            expect(abrCtrl.canPerformQualitySwitch(undefined, {})).to.be.true;
        });

        it('should return true if lastSegment is not a partial segment', function() {
            expect(abrCtrl.canPerformQualitySwitch({ isPartialSegment: false }, {})).to.be.true;
        });

        it('should return true if lastSegment has no information about total number of segments', function() {
            expect(abrCtrl.canPerformQualitySwitch({
                isPartialSegment: true,
                totalNumberOfPartialSegments: NaN,
                replacementSubNumber: 0
            }, {})).to.be.true;
        });

        it('should return true if lastSegment has no information about replacementSubNumber', function() {
            expect(abrCtrl.canPerformQualitySwitch({
                isPartialSegment: true,
                totalNumberOfPartialSegments: 2,
                replacementSubNumber: NaN
            }, {})).to.be.true;
        });

        it('should return true if replacementSubNumber is at the end of the sequence', function() {
            expect(abrCtrl.canPerformQualitySwitch({
                isPartialSegment: true,
                totalNumberOfPartialSegments: 3,
                replacementSubNumber: 2
            }, {})).to.be.true;
        });

        it('should return false if no segmentSequenceProperties are defined', function() {
            expect(abrCtrl.canPerformQualitySwitch({
                isPartialSegment: true,
                totalNumberOfPartialSegments: 3,
                replacementSubNumber: 1
            }, {
                segmentSequenceProperties: []
            })).to.be.false;
        });

        it('should return false if segmentSequenceProperties are defined but no segmentSequenceProperties with SAP type 0 or 1 are available', function() {
            const ssp = new SegmentSequenceProperties();
            ssp.sapType = 2
            expect(abrCtrl.canPerformQualitySwitch({
                isPartialSegment: true,
                totalNumberOfPartialSegments: 4,
                replacementSubNumber: 1
            }, {
                segmentSequenceProperties: [ssp]
            })).to.be.false;
        });

        it('should return false if next partial segment number does not have the right SAP type', function() {
            const ssp = new SegmentSequenceProperties();
            ssp.sapType = 1;
            ssp.cadence = 10
            expect(abrCtrl.canPerformQualitySwitch({
                isPartialSegment: true,
                totalNumberOfPartialSegments: 4,
                replacementSubNumber: 0
            }, {
                segmentSequenceProperties: [ssp]
            })).to.be.false;
        });

        it('should return true if all partial segments have the right SAP type', function() {
            const ssp = new SegmentSequenceProperties();
            expect(abrCtrl.canPerformQualitySwitch({
                isPartialSegment: true,
                totalNumberOfPartialSegments: 4,
                replacementSubNumber: 2
            }, {
                segmentSequenceProperties: [ssp]
            })).to.be.true;
        });

        it('should return true if next partial segment number has the right SAP type', function() {
            const ssp = new SegmentSequenceProperties();
            ssp.sapType = 1;
            ssp.cadence = 2;
            expect(abrCtrl.canPerformQualitySwitch({
                isPartialSegment: true,
                totalNumberOfPartialSegments: 4,
                replacementSubNumber: 1
            }, {
                segmentSequenceProperties: [ssp]
            })).to.be.true;
        });

        it('should return false if next partial segment number has not the right SAP type for high number of partial segments', function() {
            const ssp = new SegmentSequenceProperties();
            ssp.sapType = 1;
            ssp.cadence = 16;
            expect(abrCtrl.canPerformQualitySwitch({
                isPartialSegment: true,
                totalNumberOfPartialSegments: 16,
                replacementSubNumber: 14
            }, {
                segmentSequenceProperties: [ssp]
            })).to.be.false;
        });

        it('should return true if next partial segment number has the right SAP type for high number of partial segments', function() {
            const ssp = new SegmentSequenceProperties();
            ssp.sapType = 1;
            ssp.cadence = 16;
            expect(abrCtrl.canPerformQualitySwitch({
                isPartialSegment: true,
                totalNumberOfPartialSegments: 32,
                replacementSubNumber: 15
            }, {
                segmentSequenceProperties: [ssp]
            })).to.be.true;
        });

    })

    describe('manuallySetPlaybackQuality', function () {

        it('should immediately switch quality when canPerformQualitySwitch returns true', function (done) {
            // Override streamProcessor to simulate current representation and last segment allowing switch
            const rep0 = dummyRepresentations[0];
            const rep1 = dummyRepresentations[1];
            const streamInfo = dummyMediaInfo.streamInfo;

            streamProcessor.getRepresentation = () => rep0; // current representation
            streamProcessor.getRepresentationController = () => {
                return {
                    getCurrentCompositeRepresentation: () => rep0
                }
            }
            streamProcessor.getLastSegment = () => undefined;

            const onQualityChange = function (e) {
                expect(e.oldRepresentation.id).to.be.equal(rep0.id);
                expect(e.newRepresentation.id).to.be.equal(rep1.id);
                eventBus.off(MediaPlayerEvents.QUALITY_CHANGE_REQUESTED, onQualityChange);
                done();
            };
            eventBus.on(MediaPlayerEvents.QUALITY_CHANGE_REQUESTED, onQualityChange, this);

            // First set current quality manually to rep0 so subsequent switch has oldRepresentation
            abrCtrl.setPlaybackQuality(Constants.VIDEO, streamInfo, rep0);
            // Now manually trigger switch to rep1
            abrCtrl.manuallySetPlaybackQuality(Constants.VIDEO, streamInfo, rep1, { reason: 'manual-test' });
        });


        it('should queue manual quality switch when canPerformQualitySwitch returns false', function () {
            const rep0 = dummyRepresentations[0];
            const rep1 = dummyRepresentations[1];
            const streamInfo = dummyMediaInfo.streamInfo;

            // Set current representation
            streamProcessor.getRepresentation = () => rep0;
            streamProcessor.getRepresentationController = () => {
                return {
                    getCurrentCompositeRepresentation: () => rep0
                }
            }
            // Simulate a last segment that blocks switching (partial segment with unsuitable properties)
            streamProcessor.getLastSegment = () => ({
                isPartialSegment: true,
                totalNumberOfPartialSegments: 4,
                replacementSubNumber: 1
            });
            // Current representation missing segmentSequenceProperties => canPerformQualitySwitch should be false
            rep0.segmentSequenceProperties = [];

            const spy = sinon.spy();
            eventBus.on(MediaPlayerEvents.QUALITY_CHANGE_REQUESTED, spy, this);

            abrCtrl.manuallySetPlaybackQuality(Constants.VIDEO, streamInfo, rep1, { reason: 'manual-test' });

            // No immediate quality change event emitted
            expect(spy.notCalled).to.be.true;
        });

        it('should execute queued manual quality switch when handlePendingManualQualitySwitch is called and conditions allow switching', function (done) {
            const rep0 = dummyRepresentations[0];
            const rep1 = dummyRepresentations[1];
            const streamInfo = dummyMediaInfo.streamInfo;

            // First block switching so it gets queued
            streamProcessor.getRepresentation = () => rep0;
            streamProcessor.getRepresentationController = () => {
                return {
                    getCurrentCompositeRepresentation: () => rep0
                }
            }
            streamProcessor.getLastSegment = () => ({
                isPartialSegment: true,
                totalNumberOfPartialSegments: 4,
                replacementSubNumber: 1
            });
            rep0.segmentSequenceProperties = [];

            abrCtrl.manuallySetPlaybackQuality(Constants.VIDEO, streamInfo, rep1, { reason: 'queue-test' });

            // Now allow switching by changing last segment to end of sequence
            streamProcessor.getLastSegment = () => ({
                isPartialSegment: true,
                totalNumberOfPartialSegments: 4,
                replacementSubNumber: 3 // end of sequence -> allows switch
            });
            // Provide segmentSequenceProperties so canPerformQualitySwitch returns true; but because replacementSubNumber === totalNumber-1 it already allows
            rep0.segmentSequenceProperties = [new SegmentSequenceProperties()];

            const onQualityChange = (e) => {
                expect(e.oldRepresentation.id).to.be.equal(rep0.id);
                expect(e.newRepresentation.id).to.be.equal(rep1.id);
                eventBus.off(MediaPlayerEvents.QUALITY_CHANGE_REQUESTED, onQualityChange);
                done();
            };
            eventBus.on(MediaPlayerEvents.QUALITY_CHANGE_REQUESTED, onQualityChange, this);

            // Trigger handling of queued switch
            const handled = abrCtrl.handlePendingManualQualitySwitch(streamInfo.id, Constants.VIDEO);
            expect(handled).to.be.true;
        });
    })

    describe('Additional Tests', function () {
        it('should return null when attempting to get abandonment state when abandonmentStateDict array is empty', function () {
            const state = abrCtrl.getAbandonmentStateFor('1', Constants.AUDIO);
            expect(state).to.be.null;
        });

        it('should return null when calling getQualityForBitrate with no mediaInfo', function () {
            const quality = abrCtrl.getOptimalRepresentationForBitrate(undefined, undefined, true);
            expect(quality).to.not.exist;
        });

        it('should return true if isPlayingAtTopQuality function is called without parameter', function () {
            let isPlayingTopQuality = abrCtrl.isPlayingAtTopQuality();
            expect(isPlayingTopQuality).to.be.true;
        });

        it('should switch to a new Representation', function (done) {
            const onQualityChange = (e) => {
                expect(e.oldRepresentation).to.not.exist;
                expect(e.newRepresentation.id).to.be.equal(dummyRepresentations[0].id)
                eventBus.off(MediaPlayerEvents.QUALITY_CHANGE_REQUESTED, onQualityChange)
                done()
            }

            eventBus.on(MediaPlayerEvents.QUALITY_CHANGE_REQUESTED, onQualityChange, this);

            abrCtrl.setPlaybackQuality(Constants.VIDEO, dummyMediaInfo.streamInfo, dummyRepresentations[0]);
        });

        it('should switch to a new enhancement Representation and have the correct dependentRep', function (done) {
            const enhancementRepresentation = dummyRepresentations[2];
            const dependentRepresentation = dummyRepresentations[0];

            const onQualityChange = (e) => {
                expect(e.oldRepresentation).to.not.exist;

                // Representation 2 should have dependentRepresentation with id 0
                expect(e.newRepresentation.id).to.be.equal(enhancementRepresentation.id);
                expect(e.newRepresentation.dependentRepresentation.id).to.be.equal(dependentRepresentation.id);

                eventBus.off(MediaPlayerEvents.QUALITY_CHANGE_REQUESTED, onQualityChange);
                done();
            }

            eventBus.on(MediaPlayerEvents.QUALITY_CHANGE_REQUESTED, onQualityChange, this);

            abrCtrl.setPlaybackQuality(Constants.VIDEO, enhancementMediaInfo.streamInfo, enhancementRepresentation);
        });

        it('should ignore an attempt to set a quality value if no streamInfo is provided', function () {
            const spy = sinon.spy();

            assert.equal(spy.notCalled, true);
            eventBus.on(MediaPlayerEvents.QUALITY_CHANGE_REQUESTED, spy, this);
            abrCtrl.setPlaybackQuality(Constants.VIDEO, null, dummyRepresentations[0]);
        });

        it('should ignore an attempt to set a quality value if no Representation is provided', function () {
            const spy = sinon.spy();

            assert.equal(spy.notCalled, true);
            eventBus.on(MediaPlayerEvents.QUALITY_CHANGE_REQUESTED, spy, this);
            abrCtrl.setPlaybackQuality(Constants.VIDEO, dummyMediaInfo.streamInfo, null);
        });

        it('should return the right Representations for maxBitrate values', function () {
            const mediaInfo = streamProcessor.getMediaInfo();
            const bitrateList = mediaInfo.bitrateList;

            adapterMock.getVoRepresentations = () => {
                return [
                    {
                        bitrateInKbit: bitrateList[0].bandwidth / 1000,
                        mediaInfo,
                        id: 1
                    },
                    {
                        bitrateInKbit: bitrateList[1].bandwidth / 1000,
                        mediaInfo,
                        id: 2
                    },
                    {
                        bitrateInKbit: bitrateList[2].bandwidth / 1000,
                        mediaInfo,
                        id: 3
                    }
                ]
            }

            adapterMock.areMediaInfosEqual = () => {
                return true
            }

            mediaInfo.streamInfo = streamProcessor.getStreamInfo();
            mediaInfo.type = Constants.VIDEO;

            // Max allowed bitrate in kbps, bandwidth is in bps
            const s = { streaming: { abr: { maxBitrate: {} } } };
            s.streaming.abr.maxBitrate[Constants.VIDEO] = bitrateList[0].bandwidth / 1000;
            settings.update(s);
            let possibleVoRepresentations = abrCtrl.getPossibleVoRepresentationsFilteredBySettings(mediaInfo, false);
            expect(possibleVoRepresentations.length).to.be.equal(1);
            expect(possibleVoRepresentations[0].id).to.be.equal(1);

            s.streaming.abr.maxBitrate[Constants.VIDEO] = bitrateList[1].bandwidth / 1000;
            settings.update(s);
            possibleVoRepresentations = abrCtrl.getPossibleVoRepresentationsFilteredBySettings(mediaInfo);
            expect(possibleVoRepresentations.length).to.be.equal(2);
            expect(possibleVoRepresentations[1].id).to.be.equal(2);

            s.streaming.abr.maxBitrate[Constants.VIDEO] = bitrateList[2].bandwidth / 1000;
            settings.update(s);
            possibleVoRepresentations = abrCtrl.getPossibleVoRepresentationsFilteredBySettings(mediaInfo);
            expect(possibleVoRepresentations.length).to.be.equal(3);
            expect(possibleVoRepresentations[2].id).to.be.equal(3);

            s.streaming.abr.maxBitrate[Constants.VIDEO] = (bitrateList[0].bandwidth / 1000) + 1;
            settings.update(s);
            possibleVoRepresentations = abrCtrl.getPossibleVoRepresentationsFilteredBySettings(mediaInfo);
            expect(possibleVoRepresentations.length).to.be.equal(1);
            expect(possibleVoRepresentations[0].id).to.be.equal(1);

            s.streaming.abr.maxBitrate[Constants.VIDEO] = (bitrateList[1].bandwidth / 1000) + 1;
            settings.update(s);
            possibleVoRepresentations = abrCtrl.getPossibleVoRepresentationsFilteredBySettings(mediaInfo);
            expect(possibleVoRepresentations.length).to.be.equal(2);
            expect(possibleVoRepresentations[1].id).to.be.equal(2);

            s.streaming.abr.maxBitrate[Constants.VIDEO] = (bitrateList[2].bandwidth / 1000) + 1;
            settings.update(s);
            possibleVoRepresentations = abrCtrl.getPossibleVoRepresentationsFilteredBySettings(mediaInfo);
            expect(possibleVoRepresentations.length).to.be.equal(3);
            expect(possibleVoRepresentations[2].id).to.be.equal(3);

            s.streaming.abr.maxBitrate[Constants.VIDEO] = (bitrateList[0].bandwidth / 1000) - 1;
            settings.update(s);
            possibleVoRepresentations = abrCtrl.getPossibleVoRepresentationsFilteredBySettings(mediaInfo);
            expect(possibleVoRepresentations.length).to.be.equal(3);
            expect(possibleVoRepresentations[2].id).to.be.equal(3);
        });

        it('should return the right Representations for minBitrate values', function () {
            const mediaInfo = streamProcessor.getMediaInfo();
            const bitrateList = mediaInfo.bitrateList;

            adapterMock.getVoRepresentations = () => {
                return [
                    {
                        bitrateInKbit: bitrateList[0].bandwidth / 1000,
                        mediaInfo,
                        id: 1
                    },
                    {
                        bitrateInKbit: bitrateList[1].bandwidth / 1000,
                        mediaInfo,
                        id: 2
                    },
                    {
                        bitrateInKbit: bitrateList[2].bandwidth / 1000,
                        mediaInfo,
                        id: 3
                    }
                ]
            }

            adapterMock.areMediaInfosEqual = () => {
                return true
            }

            mediaInfo.streamInfo = streamProcessor.getStreamInfo();
            mediaInfo.type = Constants.VIDEO;

            // Min allowed bitrate in kbps, bandwidth is in bps
            const s = { streaming: { abr: { minBitrate: {} } } };
            s.streaming.abr.minBitrate[Constants.VIDEO] = bitrateList[0].bandwidth / 1000;
            settings.update(s);
            let possibleVoRepresentations = abrCtrl.getPossibleVoRepresentationsFilteredBySettings(mediaInfo);
            expect(possibleVoRepresentations.length).to.be.equal(3);

            s.streaming.abr.minBitrate[Constants.VIDEO] = bitrateList[1].bandwidth / 1000;
            settings.update(s);
            possibleVoRepresentations = abrCtrl.getPossibleVoRepresentationsFilteredBySettings(mediaInfo);
            expect(possibleVoRepresentations.length).to.be.equal(2);

            s.streaming.abr.minBitrate[Constants.VIDEO] = bitrateList[2].bandwidth / 1000;
            settings.update(s);
            possibleVoRepresentations = abrCtrl.getPossibleVoRepresentationsFilteredBySettings(mediaInfo);
            expect(possibleVoRepresentations.length).to.be.equal(1);

            s.streaming.abr.minBitrate[Constants.VIDEO] = (bitrateList[0].bandwidth / 1000) + 1;
            settings.update(s);
            possibleVoRepresentations = abrCtrl.getPossibleVoRepresentationsFilteredBySettings(mediaInfo);
            expect(possibleVoRepresentations.length).to.be.equal(2);

            s.streaming.abr.minBitrate[Constants.VIDEO] = (bitrateList[1].bandwidth / 1000) + 1;
            settings.update(s);
            possibleVoRepresentations = abrCtrl.getPossibleVoRepresentationsFilteredBySettings(mediaInfo);
            expect(possibleVoRepresentations.length).to.be.equal(1);

            s.streaming.abr.minBitrate[Constants.VIDEO] = (bitrateList[2].bandwidth / 1000) + 1;
            settings.update(s);
            possibleVoRepresentations = abrCtrl.getPossibleVoRepresentationsFilteredBySettings(mediaInfo);
            expect(possibleVoRepresentations.length).to.be.equal(3);

            s.streaming.abr.minBitrate[Constants.VIDEO] = (bitrateList[0].bandwidth / 1000) - 1;
            settings.update(s);
            possibleVoRepresentations = abrCtrl.getPossibleVoRepresentationsFilteredBySettings(mediaInfo);
            expect(possibleVoRepresentations.length).to.be.equal(3);
        });

        it('should configure initial bitrate for video type', function () {
            domStorageMock.setSavedBitrateSettings(Constants.VIDEO, 50);

            let initialBitrateFor = abrCtrl.getInitialBitrateFor(Constants.VIDEO);
            expect(initialBitrateFor).to.equal(50);
        });

        it('should configure initial bitrate for text type', function () {
            let initialBitrateFor = abrCtrl.getInitialBitrateFor(Constants.TEXT);
            expect(initialBitrateFor).to.be.NaN;
        });

        it('should return the appropriate possible Representations if limitBitrateByPortal is enabled', function () {
            videoModelMock.getVideoElementSize = () => {
                return { elementWidth: 800 }
            };
            const s = { streaming: { abr: { limitBitrateByPortal: true } } };
            settings.update(s);

            const mediaInfo = streamProcessor.getMediaInfo();
            const bitrateList = mediaInfo.bitrateList;

            adapterMock.getVoRepresentations = () => {
                return [
                    {
                        bitrateInKbit: bitrateList[0].bandwidth / 1000,
                        bandwidth: bitrateList[0].bandwidth,
                        mediaInfo,
                        id: 1,
                        width: 640
                    },
                    {
                        bitrateInKbit: bitrateList[1].bandwidth / 1000,
                        bandwidth: bitrateList[1].bandwidth,
                        mediaInfo,
                        id: 2,
                        width: 720
                    },
                    {
                        bitrateInKbit: bitrateList[2].bandwidth / 1000,
                        bandwidth: bitrateList[2].bandwidth,
                        mediaInfo,
                        id: 3,
                        width: 1920
                    }
                ]
            }

            adapterMock.areMediaInfosEqual = () => {
                return true
            }

            mediaInfo.streamInfo = streamProcessor.getStreamInfo();
            mediaInfo.type = Constants.VIDEO;

            let possibleVoRepresentations = abrCtrl.getPossibleVoRepresentationsFilteredBySettings(mediaInfo);
            expect(possibleVoRepresentations.length).to.be.equal(2);
        });
    })
});
