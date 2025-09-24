import DashManifestModel from '../../../../src/dash/models/DashManifestModel.js';
import DashConstants from '../../../../src/dash/constants/DashConstants.js';
import {expect} from 'chai';

const context = {};
const dashManifestModel = DashManifestModel(context).getInstance();

describe('getRepresentationsForAdaptation', function () {
    beforeEach(function () {
        dashManifestModel.setConfig({});
    });

    it('should return empty array if adaptation is undefined', () => {
        const reps = dashManifestModel.getRepresentationsForAdaptation();
        expect(reps).to.be.an('array').that.is.empty;
    });

    it('should assign all basic properties from realRepresentation', () => {
        const voAdaptation = {
            period: {
                index: 0,
                mpd: {
                    manifest: {
                        Period: [{
                            AdaptationSet: [{
                                Representation: [{
                                    id: 'id1',
                                    codecs: 'avc1.4D401F',
                                    mimeType: 'video/mp4',
                                    codecPrivateData: 'private',
                                    bandwidth: 123456,
                                    width: 1920,
                                    height: 1080,
                                    scanType: 'progressive',
                                    frameRate: '30',
                                    qualityRanking: 2,
                                    maxPlayoutRate: 1,
                                    EssentialProperty: [{ schemeIdUri: 'urn:foo', value: 'bar' }],
                                    SupplementalProperty: [{ schemeIdUri: 'urn:supp', value: 'suppval' }],
                                    SegmentSequenceProperties: [{
                                        cadence: 2,
                                        type: 1,
                                        event: false,
                                        alignment: 'id1'
                                    }],
                                    SegmentTemplate: {
                                        initialization: 'init-$RepresentationID$-$Bandwidth$.mp4',
                                        timescale: 1000,
                                        duration: 2000,
                                        startNumber: 5,
                                        media: 'seg-$Number$.m4s',
                                        availabilityTimeOffset: 2,
                                        availabilityTimeComplete: 'false',
                                        presentationTimeOffset: 10000,
                                        indexRange: '100-200',
                                        endNumber: 99
                                    }
                                }]
                            }]
                        }],
                        BaseURL: [{ availabilityTimeOffset: 5, availabilityTimeComplete: true }]
                    }
                }
            },
            index: 0,
            type: 'video'
        };
        const mediaInfo = { type: 'video' };
        const processedRealAdaptation = {
            Representation: [{
                id: 'id1',
                codecs: 'avc1.4D401F',
                mimeType: 'video/mp4',
                codecPrivateData: 'private',
                bandwidth: 123456,
                width: 1920,
                height: 1080,
                scanType: 'progressive',
                frameRate: '30',
                qualityRanking: 2,
                maxPlayoutRate: 1,
                EssentialProperty: [{ schemeIdUri: 'urn:foo', value: 'bar' }],
                SupplementalProperty: [{ schemeIdUri: 'urn:supp', value: 'suppval' }],
                SegmentSequenceProperties: [{ cadence: 2, type: 1, event: false, alignment: 'id1' }],
                SegmentTemplate: {
                    initialization: 'init-$RepresentationID$-$Bandwidth$.mp4',
                    timescale: 1000,
                    duration: 2000,
                    startNumber: 5,
                    media: 'seg-$Number$.m4s',
                    availabilityTimeOffset: 2,
                    availabilityTimeComplete: 'false',
                    presentationTimeOffset: 10000,
                    indexRange: '100-200',
                    endNumber: 99
                }
            }]
        };
        // Mock getRealAdaptationFor
        dashManifestModel.getRealAdaptationFor = () => processedRealAdaptation;

        const reps = dashManifestModel.getRepresentationsForAdaptation(voAdaptation, mediaInfo);
        expect(reps).to.have.lengthOf(1);
        const r = reps[0];
        expect(r.id).to.equal('id1');
        expect(r.codecs).to.equal('avc1.4D401F');
        expect(r.codecFamily).to.exist;
        expect(r.mimeType).to.equal('video/mp4');
        expect(r.codecPrivateData).to.equal('private');
        expect(r.bandwidth).to.equal(123456);
        expect(r.bitrateInKbit).to.equal(123.456);
        expect(r.width).to.equal(1920);
        expect(r.height).to.equal(1080);
        expect(r.scanType).to.equal('progressive');
        expect(r.frameRate).to.equal(30);
        expect(r.qualityRanking).to.equal(2);
        expect(r.maxPlayoutRate).to.equal(1);
        expect(r.essentialProperties[0].schemeIdUri).to.equal('urn:foo');
        expect(r.supplementalProperties[0].schemeIdUri).to.equal('urn:supp');
        expect(r.segmentSequenceProperties[0].cadence).to.equal(2);
        expect(r.segmentSequenceProperties[0].type).to.equal(1);
        expect(r.segmentSequenceProperties[0].event).to.equal(false);
        expect(r.segmentSequenceProperties[0].alignment).to.equal('id1');
        expect(r.index).to.equal(0);
        expect(r.adaptation).to.equal(voAdaptation);
        expect(r.mediaInfo).to.equal(mediaInfo);
        expect(r.segmentInfoType).to.equal(DashConstants.SEGMENT_TEMPLATE);
        expect(r.initialization).to.equal('init-id1-123456.mp4');
        expect(r.timescale).to.equal(1000);
        expect(r.segmentDuration).to.equal(2); // duration / timescale
        expect(r.media).to.equal('seg-$Number$.m4s');
        expect(r.startNumber).to.equal(5);
        expect(r.indexRange).to.equal('100-200');
        expect(r.presentationTimeOffset).to.equal(10); // 10000 / 1000
        expect(r.availabilityTimeOffset).to.equal(2); // from SegmentTemplate
        expect(r.availabilityTimeComplete).to.be.false;
        expect(r.endNumber).to.equal(99);
        expect(r.mseTimeOffset).to.be.a('number');
        expect(r.path).to.deep.equal([0, 0, 0]);
        expect(r.pixelsPerSecond).to.equal(1920 * 1080 * 30);
        expect(r.bitsPerPixel).to.be.closeTo(123456 / (1920 * 1080 * 30), 1e-6);
    });

    it('should assign segmentInfoType BASE_URL if no segment info present', () => {
        const voAdaptation = {
            period: {
                index: 0,
                mpd: {
                    manifest: {
                        Period: [{
                            AdaptationSet: [{
                                Representation: [{ id: 'id2', bandwidth: 1000 }]
                            }]
                        }],
                        BaseURL: [{ availabilityTimeOffset: 5, availabilityTimeComplete: true }]
                    }
                }
            },
            index: 0,
            type: 'video'
        };
        // Use real getRealAdaptationFor
        const reps = dashManifestModel.getRepresentationsForAdaptation(voAdaptation);
        expect(reps).to.have.lengthOf(1);
        expect(reps[0].segmentInfoType).to.equal(DashConstants.BASE_URL);
    });

    it('should assign segmentInfoType SEGMENT_BASE if SegmentBase present', () => {
        const voAdaptation = {
            period: {
                index: 0,
                mpd: {
                    manifest: {
                        Period: [{
                            AdaptationSet: [{
                                Representation: [{
                                    id: 'id1',
                                    codecs: 'avc1.4D401F',
                                    mimeType: 'video/mp4',
                                    codecPrivateData: 'private',
                                    bandwidth: 123456,
                                    width: 1920,
                                    height: 1080,
                                    scanType: 'progressive',
                                    frameRate: '30',
                                    qualityRanking: 2,
                                    maxPlayoutRate: 1,
                                    EssentialProperty: [{ schemeIdUri: 'urn:foo', value: 'bar' }],
                                    SupplementalProperty: [{ schemeIdUri: 'urn:supp', value: 'suppval' }],
                                    SegmentBase: { Initialization: { sourceURL: 'baseinit.mp4' } }
                                }]
                            }]
                        }],
                        BaseURL: [{ availabilityTimeOffset: 5, availabilityTimeComplete: true }]
                    }
                }
            },
            index: 0,
            type: 'video'
        };

        const processedRealAdaptation = {
            Representation: [{ id: 'id3', SegmentBase: { Initialization: { sourceURL: 'baseinit.mp4' } } }]
        };
        dashManifestModel.getRealAdaptationFor = () => processedRealAdaptation;

        const reps = dashManifestModel.getRepresentationsForAdaptation(voAdaptation);
        expect(reps).to.have.lengthOf(1);
        expect(reps[0].segmentInfoType).to.equal(DashConstants.SEGMENT_BASE);
        expect(reps[0].initialization).to.equal('baseinit.mp4');
    });

    it('should assign segmentInfoType SEGMENT_LIST and handle SegmentTimeline', () => {
        const voAdaptation = {
            period: {
                index: 0,
                mpd: {
                    manifest: {
                        Period: [{
                            AdaptationSet: [{
                                Representation: [{
                                    id: 'id1',
                                    codecs: 'avc1.4D401F',
                                    mimeType: 'video/mp4',
                                    codecPrivateData: 'private',
                                    bandwidth: 123456,
                                    width: 1920,
                                    height: 1080,
                                    scanType: 'progressive',
                                    frameRate: '30',
                                    qualityRanking: 2,
                                    maxPlayoutRate: 1,
                                    EssentialProperty: [{ schemeIdUri: 'urn:foo', value: 'bar' }],
                                    SupplementalProperty: [{ schemeIdUri: 'urn:supp', value: 'suppval' }],
                                    SegmentList: {
                                        SegmentTimeline: { S: [{ d: 100 }] },
                                        Initialization: { sourceURL: 'listinit.mp4' },
                                        timescale: 10,
                                        duration: 100
                                    }
                                }]
                            }]
                        }],
                        BaseURL: [{ availabilityTimeOffset: 5, availabilityTimeComplete: true }]
                    }
                }
            },
            index: 0,
            type: 'video'
        };

        const processedRealAdaptation = {
            Representation: [{
                id: 'id4',
                SegmentList: {
                    SegmentTimeline: { S: [{ d: 100 }] },
                    Initialization: { sourceURL: 'listinit.mp4' },
                    timescale: 10,
                    duration: 100
                }
            }]
        };
        dashManifestModel.getRealAdaptationFor = () => processedRealAdaptation;

        const reps = dashManifestModel.getRepresentationsForAdaptation(voAdaptation);
        expect(reps).to.have.lengthOf(1);
        expect(reps[0].segmentInfoType).to.equal(DashConstants.SEGMENT_TIMELINE);
        expect(reps[0].initialization).to.equal('listinit.mp4');
        expect(reps[0].segmentDuration).to.equal(10);
    });

    it('should fallback to baseUrl for availabilityTimeOffset and availabilityTimeComplete', () => {
        const voAdaptation = {
            period: {
                index: 0,
                mpd: {
                    manifest: {
                        Period: [{
                            AdaptationSet: [{
                                Representation: [{
                                    id: 'id1',
                                    codecs: 'avc1.4D401F',
                                    mimeType: 'video/mp4',
                                    codecPrivateData: 'private',
                                    bandwidth: 123456,
                                    width: 1920,
                                    height: 1080,
                                    scanType: 'progressive',
                                    frameRate: '30',
                                    qualityRanking: 2,
                                    maxPlayoutRate: 1,
                                    EssentialProperty: [{ schemeIdUri: 'urn:foo', value: 'bar' }],
                                    SupplementalProperty: [{ schemeIdUri: 'urn:supp', value: 'suppval' }],
                                    SegmentTemplate: {
                                        initialization: 'init-$RepresentationID$-$Bandwidth$.mp4',
                                        timescale: 1000,
                                        duration: 2000,
                                        startNumber: 5,
                                        media: 'seg-$Number$.m4s',
                                        availabilityTimeOffset: 7,
                                        availabilityTimeComplete: 'false',
                                        presentationTimeOffset: 10000,
                                        indexRange: '100-200',
                                        endNumber: 99
                                    }
                                }]
                            }]
                        }],
                    }
                }
            },
            index: 0,
            type: 'video'
        };

        const processedRealAdaptation = {
            Representation: [{
                id: 'id5',
                SegmentTemplate: {
                    timescale: 1000,
                    duration: 4000,
                    media: 'low-$Number$.m4s'
                }
            }]
        };
        dashManifestModel.getRealAdaptationFor = () => processedRealAdaptation;

        const reps = dashManifestModel.getRepresentationsForAdaptation(voAdaptation);
        expect(reps).to.have.lengthOf(1);
        expect(reps[0].availabilityTimeOffset).to.equal(7);
        expect(reps[0].availabilityTimeComplete).to.equal(false);
    });

    it('should return an empty array when getRepresentationsForAdaptation is called and adaptation is undefined', () => {
        const representationArray = dashManifestModel.getRepresentationsForAdaptation();

        expect(representationArray).to.be.instanceOf(Array);
        expect(representationArray).to.be.empty;
    });

    it('should not return an empty array when getRepresentationsForAdaptation is called and adaptation is defined', () => {
        const voAdaptation = {
            period: {
                index: 0,
                mpd: {
                    manifest: {
                        Period: [{
                            AdaptationSet: [{
                                Representation: [{
                                    SegmentTemplate: {
                                        SegmentTimeline: {
                                            S: [{
                                                d: 2,
                                                r: 2
                                            }]
                                        }
                                    }
                                }]
                            }]
                        }]
                    }
                }
            }, index: 0, type: 'video'
        };
        const representationArray = dashManifestModel.getRepresentationsForAdaptation(voAdaptation);

        expect(representationArray).to.be.instanceOf(Array);
        expect(representationArray).not.to.be.empty;
        expect(representationArray[0].index).to.equals(0);
    });


});
