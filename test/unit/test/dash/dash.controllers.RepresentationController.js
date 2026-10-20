import ObjectsHelper from '../../helpers/ObjectsHelper.js';
import VoHelper from '../../helpers/VOHelper.js';
import EventBus from '../../../../src/core/EventBus.js';
import RepresentationController from '../../../../src/dash/controllers/RepresentationController.js';
import Settings from '../../../../src/core/Settings.js';
import Events from '../../../../src/core/events/Events.js';
import MediaPlayerEvents from '../../../../src/streaming/MediaPlayerEvents.js';
import DashConstants from '../../../../src/dash/constants/DashConstants.js';
import SpecHelper from '../../helpers/SpecHelper.js';
import AbrControllerMock from '../../mocks/AbrControllerMock.js';
import PlaybackControllerMock from '../../mocks/PlaybackControllerMock.js';
import DashMetricsMock from '../../mocks/DashMetricsMock.js';
import AdapterMock from '../../mocks/AdapterMock.js';
import SegmentsControllerMock from '../../mocks/SegmentsControllerMock.js';

import chai from 'chai';
import spies from 'chai-spies';
import sinon from 'sinon';

chai.use(spies);

const expect = chai.expect;
const voHelper = new VoHelper();
const objectsHelper = new ObjectsHelper();

describe('RepresentationController', function () {
    // Arrange
    const context = {};
    const testType = 'video';
    const enhancementType = 'enhancement';
    const specHelper = new SpecHelper();
    const voRepresentations = [];
    voRepresentations.push(
        voHelper.getDummyRepresentation(testType, 0),
        voHelper.getDummyRepresentation(testType, 1),
        voHelper.getDummyRepresentation(testType, 2),
        voHelper.getDummyRepresentation(enhancementType, 3)
    );
    const streamProcessor = objectsHelper.getDummyStreamProcessor(testType);
    const eventBus = EventBus(context).getInstance();
    const timelineConverter = objectsHelper.getDummyTimelineConverter();

    // Representation 3 is an enhancement representation that has a dependent representation 1.
    voRepresentations[3].dependentRepresentation = voRepresentations[1];

    Events.extend(MediaPlayerEvents);

    const abrControllerMock = new AbrControllerMock();
    const playbackControllerMock = new PlaybackControllerMock();
    const dashMetricsMock = new DashMetricsMock();
    const adapterMock = new AdapterMock();
    const segmentsController = new SegmentsControllerMock();

    let representationController;


    describe('Config correctly passed', function () {
        beforeEach(function () {
            representationController = RepresentationController(context).create({
                streamInfo: streamProcessor.getStreamInfo(),
                abrController: abrControllerMock,
                segmentsController,
                timelineConverter: timelineConverter,
                playbackController: playbackControllerMock,
                dashMetrics: dashMetricsMock,
                type: testType,
                events: Events,
                eventBus: eventBus,
                dashConstants: DashConstants,
                adapter: adapterMock
            });
        });

        afterEach(function () {
            representationController.reset();
            representationController = null;
        });


        describe('when data update completed', function () {
            beforeEach(function (done) {
                representationController.updateData(voRepresentations, true, voRepresentations[0].id);
                setTimeout(function () {
                    done();
                }, specHelper.getExecutionDelay());
            });


            it('should return current selected representation', function () {
                const expectedValue = voRepresentations[0].id;

                expect(representationController.getCurrentRepresentation().id).to.equal(expectedValue);
            });

            it('should return null if id is undefined', function () {
                expect(representationController.getRepresentationById()).to.equal(null);
            });


            it('should update current representation when preparing a quality change', function () {
                let currentRepresentation = representationController.getCurrentRepresentation();
                expect(currentRepresentation.id).to.equal(voRepresentations[0].id); // jshint ignore:line

                representationController.prepareQualityChange(voRepresentations[1]);

                currentRepresentation = representationController.getCurrentRepresentation();
                expect(currentRepresentation.id).to.equal(voRepresentations[1].id); // jshint ignore:line
            });

            it('when a MANIFEST_VALIDITY_CHANGED event occurs, should update current representation', function () {
                let currentRepresentation = representationController.getCurrentRepresentation();
                expect(currentRepresentation.adaptation.period.duration).to.equal(100); // jshint ignore:line
                eventBus.trigger(Events.MANIFEST_VALIDITY_CHANGED, { sender: {}, newDuration: 150 });

                expect(currentRepresentation.adaptation.period.duration).to.equal(150); // jshint ignore:line
            });

            it('should switch correctly when prepareQualityChange is called with an enhancement representation', function () {
                let representation = representationController.getCurrentRepresentation();

                expect(representation.id).to.equal(voRepresentations[0].id)
                
                // switch to an enchancement representation 3 with dependentRepresentation 1.
                representationController.prepareQualityChange(voRepresentations[3]);
                representation = representationController.getCurrentRepresentation();

                expect(representation.id).to.equal(voRepresentations[1].id);
            });

        });

        describe('when a call to reset is done', function () {
            it('should not contain representation after a call to reset', function () {
                representationController.reset();
                // Act
                const data = representationController.getCurrentRepresentation();

                // Assert
                expect(data).not.exist; // jshint ignore:line
            });
        });
    });

    describe('SegmentBase segment lists are loaded lazily', function () {
        let segmentBaseRepresentations;
        let segmentDataLoadedFor;
        let lazyRepresentationController;

        // Mirrors SegmentsController.updateSegmentData: the list is fetched once per Representation
        // and populated the way _onSegmentDataUpdated does for a real response.
        const segmentsControllerMock = Object.assign(new SegmentsControllerMock(), {
            updateSegmentData(representation, hasSegments) {
                if (!hasSegments && !representation.segments) {
                    segmentDataLoadedFor.push(representation.id);
                    representation.segments = [{ index: 0 }];
                }
                return Promise.resolve();
            }
        });

        beforeEach(function () {
            segmentDataLoadedFor = [];
            segmentBaseRepresentations = [0, 1, 2]
                .map((index) => voHelper.createSegmentBaseRepresentation(testType, index));
            lazyRepresentationController = RepresentationController(context).create({
                streamInfo: streamProcessor.getStreamInfo(),
                abrController: abrControllerMock,
                segmentsController: segmentsControllerMock,
                timelineConverter: timelineConverter,
                playbackController: playbackControllerMock,
                dashMetrics: dashMetricsMock,
                type: testType,
                events: Events,
                eventBus: eventBus,
                dashConstants: DashConstants,
                adapter: adapterMock
            });
        });

        afterEach(function () {
            lazyRepresentationController.reset();
            lazyRepresentationController = null;
        });

        it('should only load the segment list of the selected Representation at startup', function () {
            return lazyRepresentationController
                .updateData(segmentBaseRepresentations, true, segmentBaseRepresentations[0].id)
                .then(function () {
                    expect(segmentDataLoadedFor).to.deep.equal([segmentBaseRepresentations[0].id]);
                });
        });

        it('should not load a segment list for non-fragmented text', function () {
            const textRepresentationController = RepresentationController(context).create({
                streamInfo: streamProcessor.getStreamInfo(),
                abrController: abrControllerMock,
                segmentsController: segmentsControllerMock,
                timelineConverter: timelineConverter,
                playbackController: playbackControllerMock,
                dashMetrics: dashMetricsMock,
                type: 'text',
                events: Events,
                eventBus: eventBus,
                dashConstants: DashConstants,
                adapter: adapterMock
            });
            // A single WebVTT file only referenced by a BaseURL
            const textRepresentation = voHelper.createRepresentation('text', 0);
            textRepresentation.segmentInfoType = DashConstants.BASE_URL;

            return textRepresentationController
                .updateData([textRepresentation], false, textRepresentation.id)
                .then(function () {
                    expect(textRepresentationController.loadSegmentList(textRepresentation)).to.be.null;
                    expect(segmentDataLoadedFor).to.be.empty;
                })
                .finally(function () {
                    textRepresentationController.reset();
                });
        });

        it('should also load the segment list of the dependent Representation of the selected one at startup', function () {
            const [base, , enhancement] = segmentBaseRepresentations;
            enhancement.dependentRepresentation = base;

            return lazyRepresentationController
                .updateData(segmentBaseRepresentations, true, enhancement.id)
                .then(function () {
                    expect(segmentDataLoadedFor).to.have.members([base.id, enhancement.id]);
                });
        });

        it('should load the segment list of each Representation only once across repeated quality switches', function () {
            const [repA, repB] = segmentBaseRepresentations;

            function switchTo(rep) {
                return Promise.resolve(lazyRepresentationController.loadSegmentList(rep))
                    .then(function () {
                        lazyRepresentationController.prepareQualityChange(rep);
                    });
            }

            return lazyRepresentationController
                .updateData(segmentBaseRepresentations, true, repA.id)
                .then(function () {
                    return switchTo(repB);
                })
                .then(function () {
                    return switchTo(repA);
                })
                .then(function () {
                    return switchTo(repB);
                })
                .then(function () {
                    // A is loaded at startup, B on the first switch to it. Switching back must
                    // reuse both lists rather than fetching and rebuilding them again.
                    expect(segmentDataLoadedFor).to.deep.equal([repA.id, repB.id]);
                    expect(lazyRepresentationController.getCurrentRepresentation().id).to.equal(repB.id);
                });
        });

        it('should start loading the segment list of the new Representation and its dependent one on a quality change', function () {
            const [repA, repB, enhancement] = segmentBaseRepresentations;
            enhancement.dependentRepresentation = repB;

            return lazyRepresentationController
                .updateData(segmentBaseRepresentations, true, repA.id)
                .then(function () {
                    lazyRepresentationController.prepareQualityChange(enhancement);
                    expect(segmentDataLoadedFor).to.have.members([repA.id, enhancement.id, repB.id]);
                });
        });

        it('should share the segment list load of the selected Representation started by updateData()', function () {
            const [repA] = segmentBaseRepresentations;
            const originalUpdateSegmentData = segmentsControllerMock.updateSegmentData;
            let releaseSegmentData;
            // Hold the request and count every call, so a second request for the same Representation shows up
            segmentsControllerMock.updateSegmentData = function (representation, hasSegments) {
                if (hasSegments) {
                    return Promise.resolve();
                }
                segmentDataLoadedFor.push(representation.id);
                return new Promise(function (resolve) {
                    releaseSegmentData = function () {
                        representation.segments = [{ index: 0 }];
                        resolve();
                    };
                });
            };

            const update = lazyRepresentationController.updateData(segmentBaseRepresentations, true, repA.id);
            const load = lazyRepresentationController.loadSegmentList(repA);
            expect(load).to.not.be.null;
            releaseSegmentData();

            return Promise.all([update, load])
                .then(function () {
                    expect(segmentDataLoadedFor).to.deep.equal([repA.id]);
                })
                .finally(function () {
                    segmentsControllerMock.updateSegmentData = originalUpdateSegmentData;
                });
        });

        it('should keep the current Representation while the segment list of another one loads', function () {
            const [repA, repB] = segmentBaseRepresentations;

            return lazyRepresentationController
                .updateData(segmentBaseRepresentations, true, repA.id)
                .then(function () {
                    const load = lazyRepresentationController.loadSegmentList(repB);
                    expect(lazyRepresentationController.getCurrentRepresentation().id).to.equal(repA.id);
                    return load;
                })
                .then(function (loadedRep) {
                    expect(loadedRep).to.equal(repB);
                    expect(repB.segments).to.not.be.empty;
                });
        });

        it('should load a failing segment list only once and exclude the Representation from ABR', function () {
            const [repA, repB] = segmentBaseRepresentations;
            const excluded = [];
            const originalExcludeRepresentation = abrControllerMock.excludeRepresentation;
            const originalUpdateSegmentData = segmentsControllerMock.updateSegmentData;
            abrControllerMock.excludeRepresentation = (rep) => excluded.push(rep.id);

            return lazyRepresentationController
                .updateData(segmentBaseRepresentations, true, repA.id)
                .then(function () {
                    // The sidx request failed, nothing is stored on the Representation
                    segmentsControllerMock.updateSegmentData = () => Promise.resolve({ error: 'sidx request failed' });
                    return lazyRepresentationController.loadSegmentList(repB);
                })
                .then(function () {
                    // A second request for the same Representation reuses the failed load
                    return lazyRepresentationController.loadSegmentList(repB);
                })
                .then(function () {
                    expect(excluded).to.deep.equal([repB.id]);
                })
                .finally(function () {
                    abrControllerMock.excludeRepresentation = originalExcludeRepresentation;
                    segmentsControllerMock.updateSegmentData = originalUpdateSegmentData;
                });
        });

        it('should not exclude a Representation whose failing load outlived a reset', function () {
            const [repA, repB] = segmentBaseRepresentations;
            const excluded = [];
            const originalExcludeRepresentation = abrControllerMock.excludeRepresentation;
            const originalUpdateSegmentData = segmentsControllerMock.updateSegmentData;
            abrControllerMock.excludeRepresentation = (rep) => excluded.push(rep.id);

            return lazyRepresentationController
                .updateData(segmentBaseRepresentations, true, repA.id)
                .then(function () {
                    segmentsControllerMock.updateSegmentData = () => Promise.resolve({ error: 'sidx request failed' });
                    const load = lazyRepresentationController.loadSegmentList(repB);
                    lazyRepresentationController.reset();
                    return load;
                })
                .then(function () {
                    expect(excluded).to.be.empty;
                })
                .finally(function () {
                    abrControllerMock.excludeRepresentation = originalExcludeRepresentation;
                    segmentsControllerMock.updateSegmentData = originalUpdateSegmentData;
                });
        });

        it('should retry a failed segment list load once the retry delay passed', function () {
            const [repA, repB] = segmentBaseRepresentations;
            const excluded = [];
            const originalExcludeRepresentation = abrControllerMock.excludeRepresentation;
            const originalUpdateSegmentData = segmentsControllerMock.updateSegmentData;
            abrControllerMock.excludeRepresentation = (rep, duration) => excluded.push({ id: rep.id, duration });
            const settings = Settings(context).getInstance();
            settings.update({ streaming: { scheduling: { segmentListRetryDelay: 5000 } } });
            let clock;

            return lazyRepresentationController
                .updateData(segmentBaseRepresentations, true, repA.id)
                .then(function () {
                    clock = sinon.useFakeTimers({ now: Date.now(), toFake: ['Date'] });
                    segmentsControllerMock.updateSegmentData = () => Promise.resolve({ error: 'sidx request failed' });
                    return lazyRepresentationController.loadSegmentList(repB);
                })
                .then(function () {
                    expect(excluded).to.deep.equal([{ id: repB.id, duration: 5000 }]);
                    // Within the retry delay the failed load is neither waited for nor retried
                    expect(lazyRepresentationController.loadSegmentList(repB)).to.be.null;
                    expect(lazyRepresentationController.isSegmentListMissing(repB)).to.be.true;

                    clock.tick(4999);
                    expect(lazyRepresentationController.loadSegmentList(repB)).to.be.null;
                    clock.tick(1);
                    segmentsControllerMock.updateSegmentData = originalUpdateSegmentData;
                    const retry = lazyRepresentationController.loadSegmentList(repB);
                    expect(retry).to.not.be.null;
                    return retry;
                })
                .then(function () {
                    expect(segmentDataLoadedFor).to.deep.equal([repA.id, repB.id]);
                    expect(lazyRepresentationController.isSegmentListMissing(repB)).to.be.false;
                })
                .finally(function () {
                    settings.reset();
                    if (clock) {
                        clock.restore();
                    }
                    abrControllerMock.excludeRepresentation = originalExcludeRepresentation;
                    segmentsControllerMock.updateSegmentData = originalUpdateSegmentData;
                });
        });

        it('should double the retry delay with every failed segment list load in a row up to eight times the setting', function () {
            const [repA, repB] = segmentBaseRepresentations;
            const exclusions = [];
            const originalExcludeRepresentation = abrControllerMock.excludeRepresentation;
            const originalUpdateSegmentData = segmentsControllerMock.updateSegmentData;
            abrControllerMock.excludeRepresentation = (rep, duration) => exclusions.push(duration);
            const settings = Settings(context).getInstance();
            settings.update({ streaming: { scheduling: { segmentListRetryDelay: 1000 } } });
            let clock;

            // Fails, then checks the load is not retried before the expected delay passed
            function failAndWait(expectedDelay) {
                return lazyRepresentationController.loadSegmentList(repB)
                    .then(function () {
                        expect(exclusions[exclusions.length - 1]).to.equal(expectedDelay);
                        clock.tick(expectedDelay - 1);
                        expect(lazyRepresentationController.loadSegmentList(repB)).to.be.null;
                        clock.tick(1);
                    });
            }

            return lazyRepresentationController
                .updateData(segmentBaseRepresentations, true, repA.id)
                .then(function () {
                    clock = sinon.useFakeTimers({ now: Date.now(), toFake: ['Date'] });
                    segmentsControllerMock.updateSegmentData = () => Promise.resolve({ error: 'sidx request failed' });
                    return failAndWait(1000);
                })
                .then(() => failAndWait(2000))
                .then(() => failAndWait(4000))
                .then(() => failAndWait(8000))
                .then(() => failAndWait(8000))
                .then(function () {
                    expect(exclusions).to.deep.equal([1000, 2000, 4000, 8000, 8000]);
                })
                .finally(function () {
                    settings.reset();
                    if (clock) {
                        clock.restore();
                    }
                    abrControllerMock.excludeRepresentation = originalExcludeRepresentation;
                    segmentsControllerMock.updateSegmentData = originalUpdateSegmentData;
                });
        });

        it('should exclude the selected Representation if its segment list fails to load at startup', function () {
            const [repA] = segmentBaseRepresentations;
            const excluded = [];
            const originalExcludeRepresentation = abrControllerMock.excludeRepresentation;
            const originalUpdateSegmentData = segmentsControllerMock.updateSegmentData;
            abrControllerMock.excludeRepresentation = (rep) => excluded.push(rep.id);
            segmentsControllerMock.updateSegmentData = () => Promise.resolve({ error: 'sidx request failed' });

            const update = lazyRepresentationController.updateData(segmentBaseRepresentations, true, repA.id);
            const load = lazyRepresentationController.loadSegmentList(repA);

            return Promise.all([update, load])
                .then(function () {
                    expect(excluded).to.deep.equal([repA.id]);
                })
                .finally(function () {
                    abrControllerMock.excludeRepresentation = originalExcludeRepresentation;
                    segmentsControllerMock.updateSegmentData = originalUpdateSegmentData;
                });
        });

        it('should share one segment list request between concurrent loads of the same Representation', function () {
            const [repA, repB] = segmentBaseRepresentations;
            let releaseSegmentData;
            const originalUpdateSegmentData = segmentsControllerMock.updateSegmentData;

            return lazyRepresentationController
                .updateData(segmentBaseRepresentations, true, repA.id)
                .then(function () {
                    // Hold the request so the second call arrives while the first one is in flight.
                    segmentsControllerMock.updateSegmentData = function (representation) {
                        segmentDataLoadedFor.push(representation.id);
                        return new Promise(function (resolve) {
                            releaseSegmentData = function () {
                                representation.segments = [{ index: 0 }];
                                resolve();
                            };
                        });
                    };

                    const first = lazyRepresentationController.loadSegmentList(repB);
                    const second = lazyRepresentationController.loadSegmentList(repB);
                    expect(second).to.equal(first);

                    releaseSegmentData();
                    return first;
                })
                .then(function () {
                    expect(segmentDataLoadedFor).to.deep.equal([repA.id, repB.id]);
                    expect(lazyRepresentationController.loadSegmentList(repB)).to.be.null;
                })
                .finally(function () {
                    segmentsControllerMock.updateSegmentData = originalUpdateSegmentData;
                });
        });
    });
});
