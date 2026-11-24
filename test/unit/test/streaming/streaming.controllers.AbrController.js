import VoHelper from '../../helpers/VOHelper.js';
import ObjectsHelper from '../../helpers/ObjectsHelper.js';
import AbrController from '../../../../src/streaming/controllers/AbrController.js';
import Constants from '../../../../src/streaming/constants/Constants.js';
import MetricsConstants from '../../../../src/streaming/constants/MetricsConstants.js';
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
import FactoryMaker from '../../../../src/core/FactoryMaker.js';
import MediaPlayerEvents from '../../../../src/streaming/MediaPlayerEvents.js';
import sinon from 'sinon';
import CapabilitiesMock from '../../mocks/CapabilitiesMock.js';
import SegmentSequenceProperties from '../../../../src/dash/vo/SegmentSequenceProperties.js';
import Representation from '../../../../src/dash/vo/Representation.js';

describe('AbrController', function () {
    const context = {};
    const voHelper = new VoHelper();
    const objectsHelper = new ObjectsHelper();

    const eventBus = EventBus(context).getInstance();
    const settings = Settings(context).getInstance();
    const abrCtrl = AbrController(context).getInstance();
    const dummyMediaInfo = voHelper.getDummyMediaInfo(Constants.VIDEO);
    const enhancementMediaInfo = voHelper.getDummyMediaInfo(Constants.ENHANCEMENT);
    const dummyRepresentations = [voHelper.getDummyRepresentation(Constants.VIDEO, 0),
        voHelper.getDummyRepresentation(Constants.VIDEO, 1),
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
        dummyRepresentations[0].segmentSequenceProperties = undefined;
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

            let optimalRepresentationForBitrate = abrCtrl.getOptimalRepresentationForBitrate(
                mediaInfo,
                bitrateList[2].bandwidth / 1000
            );
            expect(optimalRepresentationForBitrate.id).to.be.equal(3);
        });
    })

    describe('excludeRepresentation()', function () {

        it('should drop the Representation from the candidates and switch to the best one below it', function () {
            const mediaInfo = streamProcessor.getMediaInfo();
            mediaInfo.streamInfo = streamProcessor.getStreamInfo();
            mediaInfo.type = Constants.VIDEO;
            const representations = [
                { bitrateInKbit: 10, bandwidth: 10000, mediaInfo, id: 'high' },
                { bitrateInKbit: 5, bandwidth: 5000, mediaInfo, id: 'low' }
            ];
            adapterMock.getVoRepresentations = () => representations;
            adapterMock.areMediaInfosEqual = () => true;
            streamProcessor.getRepresentationController = () => ({
                getCurrentCompositeRepresentation: () => representations[0]
            });

            const requested = [];
            const onQualityChangeRequested = (e) => requested.push(e.newRepresentation.id);
            eventBus.on(MediaPlayerEvents.QUALITY_CHANGE_REQUESTED, onQualityChangeRequested);

            abrCtrl.excludeRepresentation(representations[0]);
            eventBus.off(MediaPlayerEvents.QUALITY_CHANGE_REQUESTED, onQualityChangeRequested);

            expect(abrCtrl.getPossibleVoRepresentationsFilteredBySettings(mediaInfo).map((rep) => rep.id)).to.deep.equal(['low']);
            expect(abrCtrl.getPossibleVoRepresentations(mediaInfo).map((rep) => rep.id)).to.have.members(['high', 'low']);
            expect(requested).to.deep.equal(['low']);
        });

        it('should include an excluded Representation again once the exclusion expired', function () {
            const clock = sinon.useFakeTimers();
            try {
                const mediaInfo = streamProcessor.getMediaInfo();
                mediaInfo.streamInfo = streamProcessor.getStreamInfo();
                mediaInfo.type = Constants.VIDEO;
                const representations = [
                    { bitrateInKbit: 10, bandwidth: 10000, mediaInfo, id: 'high' },
                    { bitrateInKbit: 5, bandwidth: 5000, mediaInfo, id: 'low' }
                ];
                adapterMock.getVoRepresentations = () => representations;
                adapterMock.areMediaInfosEqual = () => true;

                abrCtrl.excludeRepresentation(representations[0], 10000);
                expect(abrCtrl.getPossibleVoRepresentationsFilteredBySettings(mediaInfo).map((rep) => rep.id)).to.deep.equal(['low']);

                clock.tick(10000);
                expect(abrCtrl.getPossibleVoRepresentationsFilteredBySettings(mediaInfo).map((rep) => rep.id)).to.have.members(['high', 'low']);
            } finally {
                clock.restore();
            }
        });

        it('should also drop Representations that depend on an excluded one', function () {
            const mediaInfo = streamProcessor.getMediaInfo();
            mediaInfo.streamInfo = streamProcessor.getStreamInfo();
            mediaInfo.type = Constants.VIDEO;
            const base = { bitrateInKbit: 5, bandwidth: 5000, mediaInfo, id: 'base' };
            const representations = [
                { bitrateInKbit: 10, bandwidth: 10000, mediaInfo, id: 'enhancement', dependentRepresentation: base },
                { bitrateInKbit: 7, bandwidth: 7000, mediaInfo, id: 'other' },
                base
            ];
            adapterMock.getVoRepresentations = () => representations;
            adapterMock.areMediaInfosEqual = () => true;

            abrCtrl.excludeRepresentation(base);

            expect(abrCtrl.getPossibleVoRepresentationsFilteredBySettings(mediaInfo).map((rep) => rep.id)).to.deep.equal(['other']);
        });

        it('should keep Representations whose dependentRepresentation could not be resolved', function () {
            const mediaInfo = streamProcessor.getMediaInfo();
            mediaInfo.streamInfo = streamProcessor.getStreamInfo();
            mediaInfo.type = Constants.VIDEO;
            // Placeholder created by DashManifestModel for a dependencyId, without mediaInfo
            const placeholder = { id: 'missing-base', mediaInfo: null };
            const representations = [
                { bitrateInKbit: 10, bandwidth: 10000, mediaInfo, id: 'enhancement', dependentRepresentation: placeholder },
                { bitrateInKbit: 5, bandwidth: 5000, mediaInfo, id: 'low' }
            ];
            adapterMock.getVoRepresentations = () => representations;
            adapterMock.areMediaInfosEqual = () => true;

            abrCtrl.excludeRepresentation(representations[1]);

            expect(abrCtrl.getPossibleVoRepresentationsFilteredBySettings(mediaInfo).map((rep) => rep.id)).to.deep.equal(['enhancement']);
        });

        it('should only exclude the Representation of the given media type if ids are reused across types', function () {
            const mediaInfo = streamProcessor.getMediaInfo();
            mediaInfo.streamInfo = streamProcessor.getStreamInfo();
            mediaInfo.type = Constants.VIDEO;
            const audioMediaInfo = { streamInfo: mediaInfo.streamInfo, type: Constants.AUDIO };
            const videoRepresentations = [
                { bitrateInKbit: 10, bandwidth: 10000, mediaInfo, id: '1' },
                { bitrateInKbit: 5, bandwidth: 5000, mediaInfo, id: '2' }
            ];
            const audioRepresentations = [
                { bitrateInKbit: 2, bandwidth: 2000, mediaInfo: audioMediaInfo, id: '1' },
                { bitrateInKbit: 1, bandwidth: 1000, mediaInfo: audioMediaInfo, id: '2' }
            ];
            adapterMock.getVoRepresentations = (info) => info === audioMediaInfo ?
                audioRepresentations : videoRepresentations;
            adapterMock.areMediaInfosEqual = () => true;

            abrCtrl.excludeRepresentation(videoRepresentations[0]);

            expect(abrCtrl.getPossibleVoRepresentationsFilteredBySettings(mediaInfo).map((rep) => rep.id)).to.deep.equal(['2']);
            expect(abrCtrl.getPossibleVoRepresentationsFilteredBySettings(audioMediaInfo).map((rep) => rep.id)).to.have.members(['1', '2']);
        });

        it('should not override a newer selection when a Representation that is no longer selected is excluded', function () {
            const mediaInfo = streamProcessor.getMediaInfo();
            mediaInfo.streamInfo = streamProcessor.getStreamInfo();
            mediaInfo.type = Constants.VIDEO;
            const representations = [
                { bitrateInKbit: 15, bandwidth: 15000, mediaInfo, id: 'C' },
                { bitrateInKbit: 10, bandwidth: 10000, mediaInfo, id: 'B' },
                { bitrateInKbit: 5, bandwidth: 5000, mediaInfo, id: 'A' }
            ];
            adapterMock.getVoRepresentations = () => representations;
            adapterMock.areMediaInfosEqual = () => true;
            // B's segment list load failed after we already switched to C
            streamProcessor.getRepresentationController = () => ({
                getCurrentCompositeRepresentation: () => representations[0]
            });

            const requested = [];
            const onQualityChangeRequested = (e) => requested.push(e.newRepresentation.id);
            eventBus.on(MediaPlayerEvents.QUALITY_CHANGE_REQUESTED, onQualityChangeRequested);

            abrCtrl.excludeRepresentation(representations[1]);
            eventBus.off(MediaPlayerEvents.QUALITY_CHANGE_REQUESTED, onQualityChangeRequested);

            expect(abrCtrl.getPossibleVoRepresentationsFilteredBySettings(mediaInfo).map((rep) => rep.id)).to.have.members(['C', 'A']);
            expect(requested).to.be.empty;
        });

        it('should switch away if the current Representation depends on the excluded one', function () {
            const mediaInfo = streamProcessor.getMediaInfo();
            mediaInfo.streamInfo = streamProcessor.getStreamInfo();
            mediaInfo.type = Constants.VIDEO;
            const representations = [
                { bitrateInKbit: 10, bandwidth: 10000, mediaInfo, id: 'base' },
                { bitrateInKbit: 5, bandwidth: 5000, mediaInfo, id: 'low' }
            ];
            adapterMock.getVoRepresentations = () => representations;
            adapterMock.areMediaInfosEqual = () => true;
            const enhancement = { id: 'enhancement', dependentRepresentation: representations[0] };
            streamProcessor.getRepresentationController = () => ({
                getCurrentCompositeRepresentation: () => enhancement
            });

            const requested = [];
            const onQualityChangeRequested = (e) => requested.push(e.newRepresentation.id);
            eventBus.on(MediaPlayerEvents.QUALITY_CHANGE_REQUESTED, onQualityChangeRequested);

            abrCtrl.excludeRepresentation(representations[0]);
            eventBus.off(MediaPlayerEvents.QUALITY_CHANGE_REQUESTED, onQualityChangeRequested);

            expect(requested).to.deep.equal(['low']);
        });

        it('should keep the excluded Representation as a candidate if no other one is left', function () {
            const mediaInfo = streamProcessor.getMediaInfo();
            mediaInfo.streamInfo = streamProcessor.getStreamInfo();
            mediaInfo.type = Constants.VIDEO;
            const representations = [{ bitrateInKbit: 10, bandwidth: 10000, mediaInfo, id: 'only' }];
            adapterMock.getVoRepresentations = () => representations;
            adapterMock.areMediaInfosEqual = () => true;

            const requested = [];
            const onQualityChangeRequested = (e) => requested.push(e.newRepresentation.id);
            eventBus.on(MediaPlayerEvents.QUALITY_CHANGE_REQUESTED, onQualityChangeRequested);

            abrCtrl.excludeRepresentation(representations[0]);
            eventBus.off(MediaPlayerEvents.QUALITY_CHANGE_REQUESTED, onQualityChangeRequested);

            expect(abrCtrl.getPossibleVoRepresentationsFilteredBySettings(mediaInfo).map((rep) => rep.id)).to.deep.equal(['only']);
            expect(abrCtrl.getOptimalRepresentationForBitrate(mediaInfo, 10).id).to.equal('only');
            expect(requested).to.be.empty;
        });

        it('should apply the bitrate settings to the Representations that are not excluded', function () {
            const mediaInfo = streamProcessor.getMediaInfo();
            mediaInfo.streamInfo = streamProcessor.getStreamInfo();
            mediaInfo.type = Constants.VIDEO;
            const representations = [
                { bitrateInKbit: 10, bandwidth: 10000, mediaInfo, id: 'high' },
                { bitrateInKbit: 5, bandwidth: 5000, mediaInfo, id: 'low' }
            ];
            adapterMock.getVoRepresentations = () => representations;
            adapterMock.areMediaInfosEqual = () => true;
            settings.update({ streaming: { abr: { maxBitrate: { video: 7 } } } });

            abrCtrl.excludeRepresentation(representations[1]);

            expect(abrCtrl.getPossibleVoRepresentationsFilteredBySettings(mediaInfo).map((rep) => rep.id)).to.deep.equal(['high']);
        });
    });

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

        it('should return true if the current Representation declares a cadence aligned access point, regardless of its SAP type', function() {
            // The SAP type describes where we may switch into a Representation, so it is only evaluated against the
            // target Representation
            const ssp = new SegmentSequenceProperties();
            ssp.sapType = 2
            expect(abrCtrl.canPerformQualitySwitch({
                isPartialSegment: true,
                totalNumberOfPartialSegments: 4,
                replacementSubNumber: 1
            }, {
                segmentSequenceProperties: [ssp]
            })).to.be.true;
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


        describe('with a target Representation', function () {

            const lastSegment = {
                isPartialSegment: true,
                totalNumberOfPartialSegments: 16,
                replacementSubNumber: 0
            };

            function _representation(sapType, mediaInfo, cadence = 1) {
                const ssp = new SegmentSequenceProperties();
                ssp.sapType = sapType;
                ssp.cadence = cadence;
                return { segmentSequenceProperties: [ssp], mediaInfo };
            }

            beforeEach(function () {
                // The AdapterMock unconditionally reports all MediaInfos as equal, which would defeat the switching set
                // check
                adapterMock.areMediaInfosEqual = (a, b) => a === b;
            });

            it('should return true for an S-Frame target in the same AdaptationSet', function () {
                const mediaInfo = { id: '0', adaptationSetSwitchingCompatibleIds: [] };
                expect(abrCtrl.canPerformQualitySwitch(
                    lastSegment, _representation(7, mediaInfo), _representation(7, mediaInfo)
                )).to.be.true;
            });

            it('should return true for an S-Frame target in an AdaptationSet of the same switching set', function () {
                const bootstrapMediaInfo = { id: '1', adaptationSetSwitchingCompatibleIds: ['0'] };
                const ssrMediaInfo = { id: '0', adaptationSetSwitchingCompatibleIds: ['1'] };
                expect(abrCtrl.canPerformQualitySwitch(
                    lastSegment, _representation(1, bootstrapMediaInfo), _representation(7, ssrMediaInfo)
                )).to.be.true;
            });

            it('should return false for an S-Frame target that is not part of the same switching set', function () {
                const bootstrapMediaInfo = { id: '1', adaptationSetSwitchingCompatibleIds: [] };
                const ssrMediaInfo = { id: '0', adaptationSetSwitchingCompatibleIds: [] };
                expect(abrCtrl.canPerformQualitySwitch(
                    lastSegment, _representation(1, bootstrapMediaInfo), _representation(7, ssrMediaInfo)
                )).to.be.false;
            });

            it('should return false for an S-Frame target of the same switching set with a different codec family', function () {
                const avcMediaInfo = { id: '1', adaptationSetSwitchingCompatibleIds: ['0'] };
                const av1MediaInfo = { id: '0', adaptationSetSwitchingCompatibleIds: ['1'] };
                const current = Object.assign(_representation(1, avcMediaInfo), { codecFamily: 'avc' });
                const target = Object.assign(_representation(7, av1MediaInfo), { codecFamily: 'av01' });
                expect(abrCtrl.canPerformQualitySwitch(lastSegment, current, target)).to.be.false;
            });

            it('should return true for an S-Frame target of the same switching set with the same codec family', function () {
                const bootstrapMediaInfo = { id: '1', adaptationSetSwitchingCompatibleIds: ['0'] };
                const ssrMediaInfo = { id: '0', adaptationSetSwitchingCompatibleIds: ['1'] };
                const current = Object.assign(_representation(1, bootstrapMediaInfo), { codecFamily: 'av01' });
                const target = Object.assign(_representation(7, ssrMediaInfo), { codecFamily: 'av01' });
                expect(abrCtrl.canPerformQualitySwitch(lastSegment, current, target)).to.be.true;
            });

            it('should return false for a target that splits its segments into a different number of partial segments',
                function () {
                    const mediaInfo = { id: '0', adaptationSetSwitchingCompatibleIds: [] };
                    const target = Object.assign(_representation(1, mediaInfo), { k: 8 });
                    expect(abrCtrl.canPerformQualitySwitch(lastSegment, _representation(7, mediaInfo), target))
                        .to.be.false;
                });

            it('should return false for a target with a different segment duration', function () {
                const mediaInfo = { id: '0', adaptationSetSwitchingCompatibleIds: [] };
                const partial = Object.assign({}, lastSegment, { duration: 0.5 });
                const target = Object.assign(_representation(1, mediaInfo), { k: 16, segmentDuration: 4 });
                expect(abrCtrl.canPerformQualitySwitch(partial, _representation(7, mediaInfo), target)).to.be.false;
            });

            it('should return true for a target with the same partial segment boundaries', function () {
                const mediaInfo = { id: '0', adaptationSetSwitchingCompatibleIds: [] };
                const partial = Object.assign({}, lastSegment, { duration: 0.5 });
                const target = Object.assign(_representation(1, mediaInfo), { k: 16, segmentDuration: 8 });
                expect(abrCtrl.canPerformQualitySwitch(partial, _representation(7, mediaInfo), target)).to.be.true;
            });

            it('should return true for a closed GOP target that is not part of the same switching set', function () {
                const currentMediaInfo = { id: '1', adaptationSetSwitchingCompatibleIds: [] };
                const targetMediaInfo = { id: '0', adaptationSetSwitchingCompatibleIds: [] };
                expect(abrCtrl.canPerformQualitySwitch(
                    lastSegment, _representation(1, currentMediaInfo), _representation(1, targetMediaInfo)
                )).to.be.true;
            });

            it('should return true for a SAP type 2 target that is not part of the same switching set', function () {
                const currentMediaInfo = { id: '1', adaptationSetSwitchingCompatibleIds: [] };
                const targetMediaInfo = { id: '0', adaptationSetSwitchingCompatibleIds: [] };
                expect(abrCtrl.canPerformQualitySwitch(
                    lastSegment, _representation(1, currentMediaInfo), _representation(2, targetMediaInfo)
                )).to.be.true;
            });

            it('should return false for a target with a SAP type we can not switch into', function () {
                const mediaInfo = { id: '0', adaptationSetSwitchingCompatibleIds: [] };
                expect(abrCtrl.canPerformQualitySwitch(
                    lastSegment, _representation(1, mediaInfo), _representation(4, mediaInfo)
                )).to.be.false;
            });

            it('should return false for an open GOP target in the same switching set, as only SAP type 7 signals a switching frame', function () {
                const mediaInfo = { id: '0', adaptationSetSwitchingCompatibleIds: [] };
                expect(abrCtrl.canPerformQualitySwitch(
                    lastSegment, _representation(7, mediaInfo), _representation(3, mediaInfo)
                )).to.be.false;
            });

            it('should return false for an S-Frame target in the same switching set whose cadence does not line up', function () {
                const mediaInfo = { id: '0', adaptationSetSwitchingCompatibleIds: [] };
                expect(abrCtrl.canPerformQualitySwitch(
                    lastSegment, _representation(7, mediaInfo), _representation(7, mediaInfo, 4)
                )).to.be.false;
            });

            it('should return false if the target does not declare any segmentSequenceProperties', function () {
                const mediaInfo = { id: '0', adaptationSetSwitchingCompatibleIds: [] };
                expect(abrCtrl.canPerformQualitySwitch(
                    lastSegment, _representation(1, mediaInfo), { segmentSequenceProperties: [], mediaInfo }
                )).to.be.false;
            });

        })

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
            // Provide segmentSequenceProperties so canPerformQualitySwitch returns true; but because
            // replacementSubNumber === totalNumber-1 it already allows
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

    describe('noInitSegmentRequired in QUALITY_CHANGE_REQUESTED', function () {

        const streamInfo = dummyMediaInfo.streamInfo;
        let rep0, rep1;
        let originalMediaInfos;
        let capturedEvent;

        function _onQualityChange(e) {
            capturedEvent = e;
        }

        function _ssp(sapType, cadence = 1) {
            const ssp = new SegmentSequenceProperties();
            ssp.sapType = sapType;
            ssp.cadence = cadence;
            return ssp;
        }

        beforeEach(function () {
            rep0 = dummyRepresentations[0];
            rep1 = dummyRepresentations[1];
            originalMediaInfos = [rep0.mediaInfo, rep1.mediaInfo];
            rep0.segmentSequenceProperties = [_ssp(7)];
            rep1.segmentSequenceProperties = [_ssp(7)];
            capturedEvent = null;

            streamProcessor.getRepresentationController = () => {
                return {
                    getCurrentCompositeRepresentation: () => rep0
                }
            }
            // Mid-sequence partial segment, next sub-number is 4
            streamProcessor.getLastSegment = () => ({
                isPartialSegment: true,
                totalNumberOfPartialSegments: 16,
                replacementSubNumber: 3
            });

            eventBus.on(MediaPlayerEvents.QUALITY_CHANGE_REQUESTED, _onQualityChange, this);
        });

        afterEach(function () {
            eventBus.off(MediaPlayerEvents.QUALITY_CHANGE_REQUESTED, _onQualityChange, this);
            rep0.segmentSequenceProperties = [];
            rep1.segmentSequenceProperties = [];
            rep0.mediaInfo = originalMediaInfos[0];
            rep1.mediaInfo = originalMediaInfos[1];
        });

        it('should be true when entering an S-Frame partial segment of the same switching set', function () {
            abrCtrl.setPlaybackQuality(Constants.VIDEO, streamInfo, rep1);
            expect(capturedEvent.noInitSegmentRequired).to.be.true;
        });

        it('should be false when the switch happens at a segment boundary', function () {
            streamProcessor.getLastSegment = () => ({
                isPartialSegment: true,
                totalNumberOfPartialSegments: 16,
                replacementSubNumber: 15
            });
            abrCtrl.setPlaybackQuality(Constants.VIDEO, streamInfo, rep1);
            expect(capturedEvent.noInitSegmentRequired).to.be.false;
        });

        it('should be false when the target enters at an IDR', function () {
            rep1.segmentSequenceProperties = [_ssp(1)];
            abrCtrl.setPlaybackQuality(Constants.VIDEO, streamInfo, rep1);
            expect(capturedEvent.noInitSegmentRequired).to.be.false;
        });

        it('should be false when the target also signals an aligned IDR next to the S-Frame', function () {
            rep1.segmentSequenceProperties = [_ssp(1, 4), _ssp(7)];
            abrCtrl.setPlaybackQuality(Constants.VIDEO, streamInfo, rep1);
            expect(capturedEvent.noInitSegmentRequired).to.be.false;
        });

        it('should be false when the target is not part of the same switching set', function () {
            adapterMock.areMediaInfosEqual = (a, b) => a === b;
            rep0.mediaInfo = { id: '0', adaptationSetSwitchingCompatibleIds: [], streamInfo };
            rep1.mediaInfo = { id: '1', adaptationSetSwitchingCompatibleIds: [], streamInfo };
            abrCtrl.setPlaybackQuality(Constants.VIDEO, streamInfo, rep1);
            expect(capturedEvent.noInitSegmentRequired).to.be.false;
        });

        it('should be false when the switch replaces or abandons instead of continuing at the next partial segment', function () {
            abrCtrl.setPlaybackQuality(Constants.VIDEO, streamInfo, rep1, { forceReplace: true });
            expect(capturedEvent.noInitSegmentRequired).to.be.false;

            capturedEvent = null;
            abrCtrl.setPlaybackQuality(Constants.VIDEO, streamInfo, rep1, { forceAbandon: true });
            expect(capturedEvent.noInitSegmentRequired).to.be.false;
        });

        it('should be false when the last segment is not a partial segment', function () {
            streamProcessor.getLastSegment = () => undefined;
            abrCtrl.setPlaybackQuality(Constants.VIDEO, streamInfo, rep1);
            expect(capturedEvent.noInitSegmentRequired).to.be.false;
        });

    })

    describe('bootstrap Representation exit', function () {

        const streamInfo = dummyMediaInfo.streamInfo;
        let bootstrapMediaInfo, mainMediaInfo, bootstrapRepresentation, capturedEvent;

        function _onQualityChange(e) {
            capturedEvent = e;
        }

        function _ssp(sapType, cadence = 1) {
            const ssp = new SegmentSequenceProperties();
            ssp.sapType = sapType;
            ssp.cadence = cadence;
            return ssp;
        }

        function _mediaInfo(id, compatibleIds) {
            return { id, type: Constants.VIDEO, adaptationSetSwitchingCompatibleIds: compatibleIds, streamInfo };
        }

        function _representation(id, bandwidth, segmentSequenceProperties, mediaInfo, codecs = 'av01.0.05M.08') {
            const representation = new Representation();
            representation.id = id;
            representation.bandwidth = bandwidth;
            representation.bitrateInKbit = bandwidth / 1000;
            representation.pixelsPerSecond = 100;
            representation.codecs = codecs;
            representation.segmentSequenceProperties = segmentSequenceProperties;
            representation.mediaInfo = mediaInfo;
            // Matches the partial segments of _setLastSegment
            representation.k = 16;
            return representation;
        }

        function _setAvailableRepresentations(representations) {
            adapterMock.getVoRepresentations = (mediaInfo) => {
                return representations.filter((representation) => representation.mediaInfo === mediaInfo);
            }
        }

        function _setLastSegment(replacementSubNumber) {
            streamProcessor.getLastSegment = () => ({
                isPartialSegment: true,
                totalNumberOfPartialSegments: 16,
                replacementSubNumber
            });
        }

        beforeEach(function () {
            capturedEvent = null;
            bootstrapMediaInfo = _mediaInfo('bootstrapAs', ['mainAs']);
            mainMediaInfo = _mediaInfo('mainAs', ['bootstrapAs']);
            // Only Representations of the current MediaInfo are resolved directly, the compatible ones come from the
            // StreamProcessor
            streamProcessor.getAllMediaInfos = () => [bootstrapMediaInfo, mainMediaInfo];
            adapterMock.areMediaInfosEqual = (a, b) => a === b;

            bootstrapRepresentation = _representation('bootstrap', 1048302, [_ssp(1)], bootstrapMediaInfo);
            streamProcessor.getRepresentationController = () => {
                return {
                    getCurrentCompositeRepresentation: () => bootstrapRepresentation
                }
            }
            _setLastSegment(0);

            eventBus.on(MediaPlayerEvents.QUALITY_CHANGE_REQUESTED, _onQualityChange, this);
        });

        afterEach(function () {
            eventBus.off(MediaPlayerEvents.QUALITY_CHANGE_REQUESTED, _onQualityChange, this);
        });

        it('should switch to the S-Frame Representation after the first partial segment', function () {
            const main = _representation('main', 1048302, [_ssp(7)], mainMediaInfo);
            _setAvailableRepresentations([bootstrapRepresentation, main]);

            expect(abrCtrl.checkPlaybackQuality(Constants.VIDEO, streamInfo.id)).to.be.true;
            expect(capturedEvent.newRepresentation.id).to.equal('main');
            expect(capturedEvent.oldRepresentation.id).to.equal('bootstrap');
            expect(capturedEvent.noInitSegmentRequired).to.be.true;
        });

        it('should switch even when resolution and bitrate are identical', function () {
            const main = _representation('main', 1048302, [_ssp(7)], mainMediaInfo);
            main.width = bootstrapRepresentation.width;
            main.height = bootstrapRepresentation.height;
            _setAvailableRepresentations([bootstrapRepresentation, main]);

            expect(abrCtrl.checkPlaybackQuality(Constants.VIDEO, streamInfo.id)).to.be.true;
            expect(capturedEvent.newRepresentation.id).to.equal('main');
        });

        it('should switch even when ABR is disabled', function () {
            settings.update({ streaming: { abr: { autoSwitchBitrate: { video: false } } } });
            const main = _representation('main', 1048302, [_ssp(7)], mainMediaInfo);
            _setAvailableRepresentations([bootstrapRepresentation, main]);

            expect(abrCtrl.checkPlaybackQuality(Constants.VIDEO, streamInfo.id)).to.be.true;
            expect(capturedEvent.newRepresentation.id).to.equal('main');
        });

        it('should not switch before the first partial segment has been requested', function () {
            const main = _representation('main', 1048302, [_ssp(7)], mainMediaInfo);
            _setAvailableRepresentations([bootstrapRepresentation, main]);
            streamProcessor.getLastSegment = () => null;

            abrCtrl.checkPlaybackQuality(Constants.VIDEO, streamInfo.id);
            expect(capturedEvent).to.be.null;
        });

        it('should pick the non-bootstrap Representation closest in bitrate if no resolution is signaled', function () {
            const low = _representation('low', 300000, [_ssp(7)], mainMediaInfo);
            const closest = _representation('closest', 1000000, [_ssp(7)], mainMediaInfo);
            const high = _representation('high', 2470736, [_ssp(7)], mainMediaInfo);
            _setAvailableRepresentations([bootstrapRepresentation, low, closest, high]);

            expect(abrCtrl.checkPlaybackQuality(Constants.VIDEO, streamInfo.id)).to.be.true;
            expect(capturedEvent.newRepresentation.id).to.equal('closest');
        });

        describe('exit Representation by resolution', function () {

            function _withResolution(representation, width, height) {
                representation.width = width;
                representation.height = height;
                return representation;
            }

            it('should pick the Representation with the resolution of the bootstrap Representation', function () {
                // The bootstrap bitrate is inflated by the IDRs, it is closer to main720p than to main360p
                _withResolution(bootstrapRepresentation, 640, 360).bandwidth = 2098762;
                const main360 = _withResolution(_representation('main360p', 458001, [_ssp(7)], mainMediaInfo), 640, 360);
                const main720 = _withResolution(_representation('main720p', 1415602, [_ssp(7)], mainMediaInfo), 1280, 720);
                _setAvailableRepresentations([bootstrapRepresentation, main360, main720]);

                expect(abrCtrl.checkPlaybackQuality(Constants.VIDEO, streamInfo.id)).to.be.true;
                expect(capturedEvent.newRepresentation.id).to.equal('main360p');
                expect(capturedEvent.noInitSegmentRequired).to.be.true;
            });

            it('should pick the lowest bitrate if several Representations share the resolution', function () {
                _withResolution(bootstrapRepresentation, 1280, 720).bandwidth = 6000000;
                const crf28 = _withResolution(_representation('720p-crf28', 2060000, [_ssp(7)], mainMediaInfo), 1280, 720);
                const crf23 = _withResolution(_representation('720p-crf23', 3137000, [_ssp(7)], mainMediaInfo), 1280, 720);
                const top = _withResolution(_representation('1080p', 5757000, [_ssp(7)], mainMediaInfo), 1920, 1080);
                _setAvailableRepresentations([bootstrapRepresentation, crf23, top, crf28]);

                expect(abrCtrl.checkPlaybackQuality(Constants.VIDEO, streamInfo.id)).to.be.true;
                expect(capturedEvent.newRepresentation.id).to.equal('720p-crf28');
            });

            it('should pick the closest resolution if no Representation matches it', function () {
                _withResolution(bootstrapRepresentation, 960, 540).bandwidth = 3000000;
                const main360 = _withResolution(_representation('main360p', 458001, [_ssp(7)], mainMediaInfo), 640, 360);
                const main720 = _withResolution(_representation('main720p', 1415602, [_ssp(7)], mainMediaInfo), 1280, 720);
                const main1080 = _withResolution(_representation('main1080p', 2900000, [_ssp(7)], mainMediaInfo), 1920, 1080);
                _setAvailableRepresentations([bootstrapRepresentation, main360, main720, main1080]);

                expect(abrCtrl.checkPlaybackQuality(Constants.VIDEO, streamInfo.id)).to.be.true;
                expect(capturedEvent.newRepresentation.id).to.equal('main360p');
            });
        });

        it('should allow a target with a different codecs string of the same switching set', function () {
            const main = _representation('main', 1048302, [_ssp(7)], mainMediaInfo, 'av01.0.31M.08');
            bootstrapRepresentation.codecs = 'av01.0.01M.08';
            _setAvailableRepresentations([bootstrapRepresentation, main]);

            expect(abrCtrl.checkPlaybackQuality(Constants.VIDEO, streamInfo.id)).to.be.true;
            expect(capturedEvent.newRepresentation.id).to.equal('main');
            expect(capturedEvent.noInitSegmentRequired).to.be.true;
        });

        it('should not switch into a target that declares an access point we can not splice into', function () {
            // SAP type 3 is neither a closed GOP nor a switching frame
            const main = _representation('main', 1048302, [_ssp(3)], mainMediaInfo);
            _setAvailableRepresentations([bootstrapRepresentation, main]);

            abrCtrl.checkPlaybackQuality(Constants.VIDEO, streamInfo.id);
            expect(capturedEvent).to.be.null;
        });

        it('should keep the init segment when the target is entered at an IDR', function () {
            // An IDR every fourth partial segment, so the target is not a bootstrap configuration itself
            const main = _representation('main', 1048302, [_ssp(1, 4)], mainMediaInfo);
            _setAvailableRepresentations([bootstrapRepresentation, main]);
            _setLastSegment(3);

            expect(abrCtrl.checkPlaybackQuality(Constants.VIDEO, streamInfo.id)).to.be.true;
            expect(capturedEvent.newRepresentation.id).to.equal('main');
            expect(capturedEvent.noInitSegmentRequired).to.be.false;
        });

        it('should wait for a partial segment the target declares an access point at', function () {
            const main = _representation('main', 1048302, [_ssp(7, 4)], mainMediaInfo);
            _setAvailableRepresentations([bootstrapRepresentation, main]);

            // Next sub-number is 1, the target only offers an entry point every 4th partial segment
            _setLastSegment(0);
            abrCtrl.checkPlaybackQuality(Constants.VIDEO, streamInfo.id);
            expect(capturedEvent).to.be.null;

            // Next sub-number is 4
            _setLastSegment(3);
            expect(abrCtrl.checkPlaybackQuality(Constants.VIDEO, streamInfo.id)).to.be.true;
            expect(capturedEvent.newRepresentation.id).to.equal('main');
        });

        it('should not switch when every Representation is a bootstrap configuration', function () {
            const otherBootstrap = _representation('otherBootstrap', 2470736, [_ssp(1)], mainMediaInfo);
            _setAvailableRepresentations([bootstrapRepresentation, otherBootstrap]);

            abrCtrl.checkPlaybackQuality(Constants.VIDEO, streamInfo.id);
            expect(capturedEvent).to.be.null;
        });

        it('should not interfere when the current Representation is not a bootstrap Representation', function () {
            const main = _representation('main', 1048302, [_ssp(7)], mainMediaInfo);
            bootstrapRepresentation = main;
            _setAvailableRepresentations([main]);

            abrCtrl.checkPlaybackQuality(Constants.VIDEO, streamInfo.id);
            expect(capturedEvent).to.be.null;
        });

        it('should not switch for content without segmentSequenceProperties', function () {
            bootstrapRepresentation.segmentSequenceProperties = [];
            const main = _representation('main', 2470736, [], mainMediaInfo);
            _setAvailableRepresentations([bootstrapRepresentation, main]);
            streamProcessor.getLastSegment = () => null;

            abrCtrl.checkPlaybackQuality(Constants.VIDEO, streamInfo.id);
            expect(capturedEvent).to.be.null;
        });
    })

    describe('S-Frame switching during playback', function () {

        const streamInfo = dummyMediaInfo.streamInfo;
        let mainMediaInfo, bootstrap360MediaInfo, bootstrap540MediaInfo;
        let main360, main540, main720, main1080, bootstrap360, bootstrap540;
        let currentRepresentation, capturedEvents;

        function _onQualityChange(e) {
            capturedEvents.push(e);
        }

        function _ssp(sapType, cadence = 1) {
            const ssp = new SegmentSequenceProperties();
            ssp.sapType = sapType;
            ssp.cadence = cadence;
            return ssp;
        }

        function _mediaInfo(id, compatibleIds) {
            return { id, type: Constants.VIDEO, adaptationSetSwitchingCompatibleIds: compatibleIds, streamInfo };
        }

        function _representation(id, bandwidth, width, height, segmentSequenceProperties, mediaInfo) {
            const representation = new Representation();
            representation.id = id;
            representation.bandwidth = bandwidth;
            representation.bitrateInKbit = bandwidth / 1000;
            representation.width = width;
            representation.height = height;
            representation.pixelsPerSecond = width * height * 60;
            representation.codecs = 'av01.0.09M.08';
            representation.segmentSequenceProperties = segmentSequenceProperties;
            representation.mediaInfo = mediaInfo;
            // Matches the partial segments of _setLastSegment
            representation.k = 8;
            return representation;
        }

        // Partial segment 3 of 8 has been requested, the next partial segment starts with an S-Frame
        function _setLastSegment(replacementSubNumber, totalNumberOfPartialSegments = 8, index = 0,
            representation = undefined) {
            streamProcessor.getLastSegment = () => ({
                index,
                isPartialSegment: true,
                totalNumberOfPartialSegments,
                replacementSubNumber,
                representation
            });
        }

        function _setCurrentRepresentation(representation) {
            currentRepresentation = representation;
        }

        function _stubRuleTarget(target) {
            FactoryMaker.extend('ABRRulesCollection', function () {
                return {
                    getBestPossibleSwitchRequest: () => ({ representation: target, reason: { message: 'test rule' } })
                };
            }, true, context);
            abrCtrl.reset();
            abrCtrl.initialize();
            abrCtrl.registerStreamType(Constants.VIDEO, streamProcessor);
        }

        beforeEach(function () {
            capturedEvents = [];
            mainMediaInfo = _mediaInfo('mainAs', ['bootstrap360As', 'bootstrap540As']);
            bootstrap360MediaInfo = _mediaInfo('bootstrap360As', ['mainAs']);
            bootstrap540MediaInfo = _mediaInfo('bootstrap540As', ['mainAs']);
            streamProcessor.getAllMediaInfos = () => [mainMediaInfo, bootstrap360MediaInfo, bootstrap540MediaInfo];
            adapterMock.areMediaInfosEqual = (a, b) => a === b;

            // IDR at the first partial segment of each segment, S-Frame at every other partial segment
            const mainSsps = () => [_ssp(1, 8), _ssp(7, 1)];
            main360 = _representation('main360p', 356513, 640, 360, mainSsps(), mainMediaInfo);
            main540 = _representation('main540p', 560449, 960, 540, mainSsps(), mainMediaInfo);
            main720 = _representation('main720p', 885997, 1280, 720, mainSsps(), mainMediaInfo);
            main1080 = _representation('main1080p', 1203835, 1920, 1080, mainSsps(), mainMediaInfo);
            bootstrap360 = _representation('bootstrap360p', 972253, 640, 360, [_ssp(1)], bootstrap360MediaInfo);
            bootstrap540 = _representation('bootstrap540p', 1544145, 960, 540, [_ssp(1)], bootstrap540MediaInfo);
            const all = [main360, main540, main720, main1080, bootstrap360, bootstrap540];
            adapterMock.getVoRepresentations = (mediaInfo) =>
                all.filter((representation) => representation.mediaInfo === mediaInfo);

            _setCurrentRepresentation(main1080);
            // Required by the RulesContext the ABR rules are evaluated with
            streamProcessor.getScheduleController = () => ({});
            streamProcessor.getRepresentation = () => currentRepresentation;
            streamProcessor.getRepresentationController = () => {
                return {
                    getCurrentCompositeRepresentation: () => currentRepresentation
                }
            }
            _setLastSegment(3);

            eventBus.on(MediaPlayerEvents.QUALITY_CHANGE_REQUESTED, _onQualityChange, this);
        });

        afterEach(function () {
            eventBus.off(MediaPlayerEvents.QUALITY_CHANGE_REQUESTED, _onQualityChange, this);
            delete context.ABRRulesCollection;
        });

        describe('scaled reference limits', function () {

            it('should not allow an S-Frame down-switch below half the resolution', function () {
                expect(abrCtrl.canPerformQualitySwitch(
                    streamProcessor.getLastSegment(), main1080, main360
                )).to.be.false;
            });

            it('should allow an S-Frame down-switch to exactly half the resolution', function () {
                expect(abrCtrl.canPerformQualitySwitch(streamProcessor.getLastSegment(), main1080, main540)).to.be.true;
            });

            it('should allow a large S-Frame up-switch', function () {
                expect(abrCtrl.canPerformQualitySwitch(streamProcessor.getLastSegment(), main360, main1080)).to.be.true;
            });

            it('should allow any switch at the end of a segment sequence as the target enters at an IDR', function () {
                _setLastSegment(7);
                expect(abrCtrl.canPerformQualitySwitch(streamProcessor.getLastSegment(), main1080, main360)).to.be.true;
            });

            it('should skip the check if a Representation does not signal its dimensions', function () {
                main360.width = NaN;
                main360.height = NaN;
                expect(abrCtrl.canPerformQualitySwitch(streamProcessor.getLastSegment(), main1080, main360)).to.be.true;
            });

            it('should not skip the init segment when the S-Frame target violates the downscale limit', function () {
                abrCtrl.setPlaybackQuality(Constants.VIDEO, streamInfo, main360);
                expect(capturedEvents[0].newRepresentation.id).to.equal('main360p');
                expect(capturedEvents[0].noInitSegmentRequired).to.be.false;
            });

            it('should skip the init segment when the S-Frame target is within the downscale limit', function () {
                abrCtrl.setPlaybackQuality(Constants.VIDEO, streamInfo, main540);
                expect(capturedEvents[0].noInitSegmentRequired).to.be.true;
            });
        });

        describe('bootstrap Representations as ABR candidates', function () {

            it('should not offer bootstrap Representations to the ABR rules', function () {
                const ids = abrCtrl.getPossibleVoRepresentationsFilteredBySettings(mainMediaInfo, true)
                    .map((representation) => representation.id);
                expect(ids).to.have.members(['main360p', 'main540p', 'main720p', 'main1080p']);
            });

            it('should keep bootstrap Representations if nothing else is available, as during startup', function () {
                const ids = abrCtrl.getPossibleVoRepresentationsFilteredBySettings(bootstrap360MediaInfo, false)
                    .map((representation) => representation.id);
                expect(ids).to.deep.equal(['bootstrap360p']);
            });

            it('should not select a bootstrap Representation for a high bitrate', function () {
                expect(abrCtrl.getOptimalRepresentationForBitrate(mainMediaInfo, 5000, true).id).to.equal('main1080p');
            });

            describe('with the same codec family in all AdaptationSets', function () {

                beforeEach(function () {
                    [main360, main540, main720, main1080, bootstrap360, bootstrap540].forEach((representation) => {
                        representation.codecFamily = 'av01';
                    });
                });

                it('should give the ABR candidates absolute indices that match their position in the list', function () {
                    // Rules like BOLA and L2A index their per-Representation arrays by the absolute index
                    const representations = abrCtrl.getPossibleVoRepresentationsFilteredBySettings(mainMediaInfo, true);
                    expect(representations.map((representation) => representation.id))
                        .to.deep.equal(['main360p', 'main540p', 'main720p', 'main1080p']);
                    expect(representations.map((representation) => representation.absoluteIndex))
                        .to.deep.equal([0, 1, 2, 3]);
                    expect(abrCtrl.getRepresentationByAbsoluteIndex(0, mainMediaInfo, true).id).to.equal('main360p');
                });

                it('should list bootstrap Representations after all other Representations', function () {
                    const ids = abrCtrl.getPossibleVoRepresentations(mainMediaInfo, true)
                        .map((representation) => representation.id);
                    expect(ids.slice(0, 4)).to.deep.equal(['main360p', 'main540p', 'main720p', 'main1080p']);
                    expect(ids.slice(4)).to.have.members(['bootstrap360p', 'bootstrap540p']);
                });
            });

            it('should not treat a Representation with a random access point at every partial segment as bootstrap if its AdaptationSet is not linked',
                function () {
                    const unlinkedMediaInfo = _mediaInfo('unlinkedAs', []);
                    const frequentRap = _representation('frequentRap', 3000000, 1280, 720, [_ssp(1)], unlinkedMediaInfo);
                    const regular = _representation('regular', 1000000, 640, 360, [_ssp(1, 8), _ssp(7)],
                        unlinkedMediaInfo);
                    adapterMock.getVoRepresentations = () => [frequentRap, regular];

                    const ids = abrCtrl.getPossibleVoRepresentationsFilteredBySettings(unlinkedMediaInfo, true)
                        .map((representation) => representation.id);
                    expect(ids).to.have.members(['regular', 'frequentRap']);
                });

            it('should not treat a Representation as bootstrap if its AdaptationSet contains other Representations',
                function () {
                    const mixedMediaInfo = _mediaInfo('mixedAs', ['mainAs']);
                    const frequentRap = _representation('frequentRap', 3000000, 1280, 720, [_ssp(1)], mixedMediaInfo);
                    const regular = _representation('regular', 1000000, 640, 360, [_ssp(1, 8), _ssp(7)],
                        mixedMediaInfo);
                    adapterMock.getVoRepresentations = (mediaInfo) =>
                        mediaInfo === mixedMediaInfo ? [frequentRap, regular] : [];

                    const ids = abrCtrl.getPossibleVoRepresentationsFilteredBySettings(mixedMediaInfo, false)
                        .map((representation) => representation.id);
                    expect(ids).to.have.members(['regular', 'frequentRap']);
                });

            it('should not leave a Representation that is not a bootstrap Representation', function () {
                const unlinkedMediaInfo = _mediaInfo('unlinkedAs', []);
                const frequentRap = _representation('frequentRap', 3000000, 1280, 720, [_ssp(1)], unlinkedMediaInfo);
                frequentRap.k = 8;
                const regular = _representation('regular', 1000000, 1280, 720, [_ssp(1, 8), _ssp(7)],
                    unlinkedMediaInfo);
                regular.k = 8;
                adapterMock.getVoRepresentations = () => [frequentRap, regular];
                streamProcessor.getAllMediaInfos = () => [unlinkedMediaInfo];
                settings.update({ streaming: { abr: { autoSwitchBitrate: { video: false } } } });
                _setCurrentRepresentation(frequentRap);

                expect(abrCtrl.checkPlaybackQuality(Constants.VIDEO, streamInfo.id)).to.be.false;
                expect(capturedEvents).to.have.lengthOf(0);
            });

            it('should include bootstrap Representations if requested, e.g. for the public API', function () {
                const ids = abrCtrl.getPossibleVoRepresentationsFilteredBySettings(mainMediaInfo, true, true)
                    .map((representation) => representation.id);
                expect(ids).to.have.members(
                    ['main360p', 'main540p', 'main720p', 'main1080p', 'bootstrap360p', 'bootstrap540p']
                );
            });
        });

        describe('hopping towards an unreachable target', function () {

            it('should hop to the closest reachable Representation when the ABR rules request a switch below the downscale limit', function () {
                _stubRuleTarget(main360);

                expect(abrCtrl.checkPlaybackQuality(Constants.VIDEO, streamInfo.id)).to.be.true;
                expect(capturedEvents).to.have.lengthOf(1);
                expect(capturedEvents[0].oldRepresentation.id).to.equal('main1080p');
                expect(capturedEvents[0].newRepresentation.id).to.equal('main540p');
                expect(capturedEvents[0].noInitSegmentRequired).to.be.true;
            });

            it('should not switch again before a partial segment of the current Representation has been requested',
                function () {
                    // A hop from main1080p to main540p has just been applied, the last requested partial segment still
                    // belongs to main1080p. Switching to main360p now would append it directly after main1080p.
                    _stubRuleTarget(main360);
                    _setCurrentRepresentation(main540);
                    _setLastSegment(3, 8, 0, main1080);

                    expect(abrCtrl.checkPlaybackQuality(Constants.VIDEO, streamInfo.id)).to.be.false;
                    expect(capturedEvents).to.have.lengthOf(0);

                    _setLastSegment(4, 8, 0, main540);
                    expect(abrCtrl.checkPlaybackQuality(Constants.VIDEO, streamInfo.id)).to.be.true;
                    expect(capturedEvents[0].oldRepresentation.id).to.equal('main540p');
                    expect(capturedEvents[0].newRepresentation.id).to.equal('main360p');
                });

            it('should switch straight to the target requested by the ABR rules when it enters at an IDR', function () {
                _stubRuleTarget(main360);
                _setLastSegment(7);

                expect(abrCtrl.checkPlaybackQuality(Constants.VIDEO, streamInfo.id)).to.be.true;
                expect(capturedEvents[0].newRepresentation.id).to.equal('main360p');
                expect(capturedEvents[0].noInitSegmentRequired).to.be.false;
            });

            it('should switch straight to a reachable target requested by the ABR rules', function () {
                _stubRuleTarget(main720);

                expect(abrCtrl.checkPlaybackQuality(Constants.VIDEO, streamInfo.id)).to.be.true;
                expect(capturedEvents[0].newRepresentation.id).to.equal('main720p');
                expect(capturedEvents[0].noInitSegmentRequired).to.be.true;
            });

            it('should complete a manual switch in two hops and keep it queued in between', function () {
                abrCtrl.manuallySetPlaybackQuality(Constants.VIDEO, streamInfo, main360, { message: 'manual' });
                expect(capturedEvents).to.have.lengthOf(0);

                expect(abrCtrl.handlePendingManualQualitySwitch(streamInfo.id, Constants.VIDEO)).to.be.true;
                expect(capturedEvents).to.have.lengthOf(1);
                expect(capturedEvents[0].newRepresentation.id).to.equal('main540p');
                expect(capturedEvents[0].noInitSegmentRequired).to.be.true;

                // The hop has been applied, the next partial segment is requested for the intermediate Representation
                _setCurrentRepresentation(main540);
                _setLastSegment(4);

                expect(abrCtrl.handlePendingManualQualitySwitch(streamInfo.id, Constants.VIDEO)).to.be.true;
                expect(capturedEvents).to.have.lengthOf(2);
                expect(capturedEvents[1].oldRepresentation.id).to.equal('main540p');
                expect(capturedEvents[1].newRepresentation.id).to.equal('main360p');
                expect(capturedEvents[1].noInitSegmentRequired).to.be.true;

                // Nothing left in the queue
                _setCurrentRepresentation(main360);
                expect(abrCtrl.handlePendingManualQualitySwitch(streamInfo.id, Constants.VIDEO)).to.be.false;
            });

            it('should not hop again before a partial segment of the intermediate Representation has been requested',
                function () {
                    _setLastSegment(3, 8, 0, main1080);
                    abrCtrl.manuallySetPlaybackQuality(Constants.VIDEO, streamInfo, main360, { message: 'manual' });

                    expect(abrCtrl.handlePendingManualQualitySwitch(streamInfo.id, Constants.VIDEO)).to.be.true;
                    expect(capturedEvents).to.have.lengthOf(1);
                    expect(capturedEvents[0].newRepresentation.id).to.equal('main540p');

                    // The hop has been applied, but the last requested partial segment still belongs to main1080p.
                    // Hopping again now would append main360p directly after main1080p, beyond the downscale limit.
                    _setCurrentRepresentation(main540);

                    expect(abrCtrl.handlePendingManualQualitySwitch(streamInfo.id, Constants.VIDEO)).to.be.false;
                    expect(capturedEvents).to.have.lengthOf(1);

                    // Once a partial segment of main540p has been requested the switch completes
                    _setLastSegment(4, 8, 0, main540);

                    expect(abrCtrl.handlePendingManualQualitySwitch(streamInfo.id, Constants.VIDEO)).to.be.true;
                    expect(capturedEvents).to.have.lengthOf(2);
                    expect(capturedEvents[1].oldRepresentation.id).to.equal('main540p');
                    expect(capturedEvents[1].newRepresentation.id).to.equal('main360p');
                    expect(capturedEvents[1].noInitSegmentRequired).to.be.true;
                });
        });

        describe('manual switches', function () {

            it('should switch straight to the target of a forceReplace switch without hopping', function () {
                _setLastSegment(3, 8, 0, main1080);
                abrCtrl.manuallySetPlaybackQuality(Constants.VIDEO, streamInfo, main360, { forceReplace: true });

                expect(capturedEvents).to.have.lengthOf(1);
                expect(capturedEvents[0].newRepresentation.id).to.equal('main360p');
                expect(capturedEvents[0].reason.forceReplace).to.be.true;
                expect(capturedEvents[0].noInitSegmentRequired).to.be.false;
                expect(abrCtrl.handlePendingManualQualitySwitch(streamInfo.id, Constants.VIDEO)).to.be.false;
            });

            it('should queue a switch while no partial segment of the current Representation has been requested',
                function () {
                    // A hop to main540p has been applied, the last requested partial segment still belongs to main1080p
                    _setCurrentRepresentation(main540);
                    _setLastSegment(3, 8, 0, main1080);

                    abrCtrl.manuallySetPlaybackQuality(Constants.VIDEO, streamInfo, main360, { message: 'manual' });
                    expect(capturedEvents).to.have.lengthOf(0);

                    _setLastSegment(4, 8, 0, main540);
                    expect(abrCtrl.handlePendingManualQualitySwitch(streamInfo.id, Constants.VIDEO)).to.be.true;
                    expect(capturedEvents).to.have.lengthOf(1);
                    expect(capturedEvents[0].newRepresentation.id).to.equal('main360p');
                    expect(capturedEvents[0].noInitSegmentRequired).to.be.true;
                });

            it('should replace a queued switch with a newer one', function () {
                _setLastSegment(3, 8, 0, main1080);
                abrCtrl.manuallySetPlaybackQuality(Constants.VIDEO, streamInfo, main360, { message: 'manual' });
                abrCtrl.manuallySetPlaybackQuality(Constants.VIDEO, streamInfo, main720, { message: 'manual' });
                expect(capturedEvents).to.have.lengthOf(1);
                expect(capturedEvents[0].newRepresentation.id).to.equal('main720p');

                _setCurrentRepresentation(main720);
                _setLastSegment(4, 8, 0, main720);
                expect(abrCtrl.handlePendingManualQualitySwitch(streamInfo.id, Constants.VIDEO)).to.be.false;
                expect(capturedEvents).to.have.lengthOf(1);
            });

            it('should let the scheduling continue if the queued target is already the current Representation',
                function () {
                    _setLastSegment(3, 8, 0, main1080);
                    abrCtrl.manuallySetPlaybackQuality(Constants.VIDEO, streamInfo, main360, { message: 'manual' });

                    // The ABR rules switched to the target in the meantime
                    _setCurrentRepresentation(main360);
                    _setLastSegment(4, 8, 0, main360);
                    expect(abrCtrl.handlePendingManualQualitySwitch(streamInfo.id, Constants.VIDEO)).to.be.false;
                });
        });

        describe('excluding the current Representation', function () {

            function _register() {
                [main360, main540, main720, main1080].forEach((representation) => {
                    representation.mediaInfo.streamInfo = streamInfo;
                });
            }

            it('should switch to the fallback via an S-Frame if it can be entered at the next partial segment',
                function () {
                    _register();
                    abrCtrl.excludeRepresentation(main1080);

                    expect(capturedEvents).to.have.lengthOf(1);
                    expect(capturedEvents[0].newRepresentation.id).to.equal('main720p');
                    expect(capturedEvents[0].noInitSegmentRequired).to.be.true;
                });

            it('should replace the buffer if the fallback can not be reached at the next partial segment', function () {
                _register();
                abrCtrl.excludeRepresentation(main720);
                abrCtrl.excludeRepresentation(main540);
                abrCtrl.excludeRepresentation(main1080);

                // main360p is below the downscale limit and there is no Representation left to hop through
                expect(capturedEvents).to.have.lengthOf(1);
                expect(capturedEvents[0].newRepresentation.id).to.equal('main360p');
                expect(capturedEvents[0].reason.forceReplace).to.be.true;
                expect(capturedEvents[0].noInitSegmentRequired).to.be.false;
            });
        });

        describe('segment sequence switching settings', function () {

            let ruleTarget;

            // Unlike _stubRuleTarget the rules collection is only replaced once, so the switch state of the segment
            // sequence survives target changes
            function _stubRuleTargets() {
                FactoryMaker.extend('ABRRulesCollection', function () {
                    return {
                        getBestPossibleSwitchRequest: () => ({ representation: ruleTarget, reason: { message: 'test rule' } })
                    };
                }, true, context);
                abrCtrl.reset();
                abrCtrl.initialize();
                abrCtrl.registerStreamType(Constants.VIDEO, streamProcessor);
            }

            // Requests the ABR decision for the partial segment following replacementSubNumber and applies a resulting
            // switch
            function _checkAt(replacementSubNumber, target, index = 0) {
                ruleTarget = target;
                _setLastSegment(replacementSubNumber, 8, index);
                const hasSwitched = abrCtrl.checkPlaybackQuality(Constants.VIDEO, streamInfo.id);
                if (hasSwitched) {
                    _setCurrentRepresentation(capturedEvents[capturedEvents.length - 1].newRepresentation);
                }
                return hasSwitched;
            }

            beforeEach(function () {
                _setCurrentRepresentation(main360);
                _stubRuleTargets();
            });

            it('should only switch up once within a segment sequence', function () {
                expect(_checkAt(2, main540)).to.be.true;
                expect(_checkAt(3, main720)).to.be.false;
                expect(currentRepresentation.id).to.equal('main540p');
            });

            it('should allow another up-switch in the next segment sequence', function () {
                expect(_checkAt(2, main540)).to.be.true;
                expect(_checkAt(3, main720)).to.be.false;
                expect(_checkAt(0, main720, 1)).to.be.true;
                expect(currentRepresentation.id).to.equal('main720p');
            });

            it('should start a new segment sequence when the index repeats in a sliding SegmentTimeline', function () {
                // After an MPD update removed an old S element the next segment has the same index as the previous one
                const checkAt = (segmentStartTime, replacementSubNumber, target) => {
                    ruleTarget = target;
                    streamProcessor.getLastSegment = () => ({
                        index: 5,
                        isPartialSegment: true,
                        totalNumberOfPartialSegments: 8,
                        replacementSubNumber,
                        duration: 0.5,
                        presentationStartTime: segmentStartTime + replacementSubNumber * 0.5
                    });
                    const hasSwitched = abrCtrl.checkPlaybackQuality(Constants.VIDEO, streamInfo.id);
                    if (hasSwitched) {
                        _setCurrentRepresentation(capturedEvents[capturedEvents.length - 1].newRepresentation);
                    }
                    return hasSwitched;
                };

                expect(checkAt(100, 2, main540)).to.be.true;
                expect(checkAt(100, 3, main720)).to.be.false;
                expect(checkAt(104, 2, main720)).to.be.true;
            });

            it('should not limit switches at the start of a segment sequence', function () {
                expect(_checkAt(2, main540)).to.be.true;
                expect(_checkAt(7, main720)).to.be.true;
                expect(capturedEvents[1].noInitSegmentRequired).to.be.false;
            });

            it('should allow multiple up-switches if maxUpSwitchesPerSequence is -1', function () {
                settings.update({ streaming: { abr: { segmentSequenceSwitching: { maxUpSwitchesPerSequence: -1 } } } });
                expect(_checkAt(2, main540)).to.be.true;
                expect(_checkAt(3, main720)).to.be.true;
                expect(_checkAt(4, main1080)).to.be.true;
            });

            it('should not switch up within a segment sequence if maxUpSwitchesPerSequence is 0', function () {
                settings.update({ streaming: { abr: { segmentSequenceSwitching: { maxUpSwitchesPerSequence: 0 } } } });
                expect(_checkAt(2, main540)).to.be.false;
                expect(_checkAt(7, main540)).to.be.true;
            });

            it('should not switch up again after a down-switch within a segment sequence', function () {
                _setCurrentRepresentation(main720);
                expect(_checkAt(2, main540)).to.be.true;
                expect(_checkAt(3, main720)).to.be.false;
                expect(currentRepresentation.id).to.equal('main540p');
            });

            it('should switch up after a down-switch if allowUpSwitchAfterDownSwitch is enabled', function () {
                settings.update({
                    streaming: {
                        abr: {
                            segmentSequenceSwitching: {
                                allowUpSwitchAfterDownSwitch: true
                            }
                        }
                    }
                });
                _setCurrentRepresentation(main720);
                expect(_checkAt(2, main540)).to.be.true;
                expect(_checkAt(3, main720)).to.be.true;
            });

            it('should allow a down-switch after an up-switch by default', function () {
                expect(_checkAt(2, main540)).to.be.true;
                expect(_checkAt(3, main360)).to.be.true;
            });

            it('should not switch down after an up-switch if allowDownSwitchAfterUpSwitch is disabled', function () {
                settings.update({
                    streaming: {
                        abr: {
                            segmentSequenceSwitching: {
                                allowDownSwitchAfterUpSwitch: false
                            }
                        }
                    }
                });
                expect(_checkAt(2, main540)).to.be.true;
                expect(_checkAt(3, main360)).to.be.false;
            });

            it('should hop down multiple times within a segment sequence by default', function () {
                _setCurrentRepresentation(main1080);
                expect(_checkAt(2, main360)).to.be.true;
                expect(currentRepresentation.id).to.equal('main540p');
                expect(_checkAt(3, main360)).to.be.true;
                expect(currentRepresentation.id).to.equal('main360p');
            });

            it('should limit the down hops to maxDownSwitchesPerSequence', function () {
                settings.update({
                    streaming: {
                        abr: {
                            segmentSequenceSwitching: {
                                maxDownSwitchesPerSequence: 1
                            }
                        }
                    }
                });
                _setCurrentRepresentation(main1080);
                expect(_checkAt(2, main360)).to.be.true;
                expect(_checkAt(3, main360)).to.be.false;
                expect(currentRepresentation.id).to.equal('main540p');
            });

            it('should neither limit nor count manual quality switches', function () {
                expect(_checkAt(2, main540)).to.be.true;

                _setLastSegment(3);
                abrCtrl.manuallySetPlaybackQuality(Constants.VIDEO, streamInfo, main720, { message: 'manual' });
                expect(capturedEvents[capturedEvents.length - 1].newRepresentation.id).to.equal('main720p');
            });

            it('should not count leaving a bootstrap Representation as an up-switch', function () {
                _setCurrentRepresentation(bootstrap360);
                // The exit picks the main Representation with the bootstrap resolution, independent of the ABR rules
                expect(_checkAt(2, main1080)).to.be.true;
                expect(currentRepresentation.id).to.equal('main360p');
                expect(_checkAt(3, main1080)).to.be.true;
                expect(currentRepresentation.id).to.equal('main1080p');
            });
        });
    })

    describe('Additional Tests', function () {
        it('should apply hybridSwitchBufferTime thresholds when toggling dynamic ABR strategy', function () {
            let capturedAbrRulesCollection = null;

            FactoryMaker.extend('ABRRulesCollection', function () {
                capturedAbrRulesCollection = this.parent;
                return {};
            }, true, context);

            try {
                settings.update({
                    streaming: {
                        abr: {
                            hybridSwitchBufferTime: 10,
                            rules: {
                                bolaRule: {
                                    active: true
                                },
                                throughputRule: {
                                    active: true
                                }
                            }
                        }
                    }
                });

                abrCtrl.reset();
                abrCtrl.initialize();
                abrCtrl.registerStreamType(Constants.VIDEO, streamProcessor);

                expect(capturedAbrRulesCollection).to.exist;
                expect(capturedAbrRulesCollection.getBolaState(Constants.VIDEO)).to.be.false;

                eventBus.trigger(MediaPlayerEvents.METRIC_ADDED, {
                    metric: MetricsConstants.BUFFER_LEVEL,
                    mediaType: Constants.VIDEO,
                    value: {
                        level: 10000
                    }
                });
                expect(capturedAbrRulesCollection.getBolaState(Constants.VIDEO)).to.be.true;

                // With BOLA already active, switch-off threshold is 0.5 * hybridSwitchBufferTime.
                eventBus.trigger(MediaPlayerEvents.METRIC_ADDED, {
                    metric: MetricsConstants.BUFFER_LEVEL,
                    mediaType: Constants.VIDEO,
                    value: {
                        level: 6000
                    }
                });
                expect(capturedAbrRulesCollection.getBolaState(Constants.VIDEO)).to.be.true;

                eventBus.trigger(MediaPlayerEvents.METRIC_ADDED, {
                    metric: MetricsConstants.BUFFER_LEVEL,
                    mediaType: Constants.VIDEO,
                    value: {
                        level: 4000
                    }
                });
                expect(capturedAbrRulesCollection.getBolaState(Constants.VIDEO)).to.be.false;
            } finally {
                delete context.ABRRulesCollection;
            }
        });

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

        it('should allow representations with a bandwidth below limitBitrateByPortalMinimum', function () {
            videoModelMock.getVideoElementSize = () => {
                return { elementWidth: 200 }
            };
            const s = {
                streaming: {
                    abr: {
                        limitBitrateByPortal: true,
                        limitBitrateByPortalMinimum: 2100
                    }
                }
            };
            settings.update(s);

            const mediaInfo = streamProcessor.getMediaInfo();
            const bitrateList = mediaInfo.bitrateList;

            adapterMock.getVoRepresentations = () => {
                return [
                    {
                        bitrateInKbit: bitrateList[0].bandwidth / 1000,
                        bandwidth: 1000000,
                        mediaInfo,
                        id: 1,
                        width: 640
                    },
                    {
                        bitrateInKbit: bitrateList[1].bandwidth / 1000,
                        bandwidth: 2000000,
                        mediaInfo,
                        id: 2,
                        width: 720
                    },
                    {
                        bitrateInKbit: bitrateList[2].bandwidth / 1000,
                        bandwidth: 3000000,
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
            expect(possibleVoRepresentations[0].id).to.be.equal(1);
            expect(possibleVoRepresentations[1].id).to.be.equal(2);
        });
    });
});
