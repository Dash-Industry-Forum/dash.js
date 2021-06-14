import MediaController from '../../src/streaming/controllers/MediaController';
import ObjectUtils from '../../src/streaming/utils/ObjectUtils';
import EventBus from '../../src/core/EventBus';
import Constants from '../../src/streaming/constants/Constants';
import Events from '../../src/core/events/Events';
import Settings from '../../src/core/Settings';

import DomStorageMock from './mocks/DomStorageMock';

const expect = require('chai').expect;
const context = {};
const eventBus = EventBus(context).getInstance();
const objectUtils = ObjectUtils(context).getInstance();

describe('MediaController', function () {
    let mediaController;
    let domStorageMock;
    const trackType = Constants.AUDIO;
    const settings = Settings(context).getInstance();

    beforeEach(function () {

        domStorageMock = new DomStorageMock();
        mediaController = MediaController(context).getInstance();
        mediaController.setConfig({
            domStorage: domStorageMock,
            settings: settings
        });

    });

    afterEach(function () {
        settings.reset();
        mediaController.reset();
        mediaController = null;
    });

    describe('Initial Settings', function () {
        it('should not set initial settings - type undefined', function () {
            let settings = mediaController.getInitialSettings(undefined);
            expect(settings).to.not.exist; // jshint ignore:line

            mediaController.setInitialSettings(undefined);

            settings = mediaController.getInitialSettings(undefined);
            expect(settings).to.not.exist; // jshint ignore:line
        });

        it('should not set initial settings - value undefined', function () {
            let settings = mediaController.getInitialSettings('test');
            expect(settings).to.not.exist; // jshint ignore:line

            mediaController.setInitialSettings('test');

            settings = mediaController.getInitialSettings('test');
            expect(settings).to.not.exist; // jshint ignore:line
        });

        it('should set and get initial settings', function () {
            let settings = mediaController.getInitialSettings('test');
            expect(settings).to.not.exist; // jshint ignore:line

            mediaController.setInitialSettings('test', 'testvalue');

            settings = mediaController.getInitialSettings('test');
            expect(settings).to.equal('testvalue');
        });
    });

    describe('Track Equality', function () {
        it('should return false if track are not equals', function () {

            let track1 = {
                id: 'id',
                viewpoint: 'viewpoint',
                lang: 'lang',
                roles: 1,
                accessibility: 1,
                audioChannelConfiguration: 1
            };

            let track2 = {
                id: 'id2',
                viewpoint: 'viewpoint',
                lang: 'lang',
                roles: 1,
                accessibility: 1,
                audioChannelConfiguration: 1

            };
            let equal = mediaController.isTracksEqual(track1, track2);
            expect(equal).to.be.false; // jshint ignore:line

        });

        it('should return true if track are equals', function () {

            let track1 = {
                id: 'id',
                viewpoint: 'viewpoint',
                lang: 'lang',
                roles: 1,
                accessibility: 1,
                audioChannelConfiguration: 1
            };

            let track2 = {
                id: 'id',
                viewpoint: 'viewpoint',
                lang: 'lang',
                roles: 1,
                accessibility: 1,
                audioChannelConfiguration: 1
            };
            let equal = mediaController.isTracksEqual(track1, track2);
            expect(equal).to.be.true; // jshint ignore:line
        });

        it('should return false if track1 is undefined or null', function () {

            let track1 = null;

            let track2 = {
                id: 'id',
                viewpoint: 'viewpoint',
                lang: 'lang',
                roles: 1,
                accessibility: 1,
                audioChannelConfiguration: 1
            };
            let equal = mediaController.isTracksEqual(track1, track2);
            expect(equal).to.be.false; // jshint ignore:line
        });

        it('should return false if track2 is undefined or null', function () {

            let track1 = {
                id: 'id',
                viewpoint: 'viewpoint',
                lang: 'lang',
                roles: 1,
                accessibility: 1,
                audioChannelConfiguration: 1
            };

            let track2 = null;

            let equal = mediaController.isTracksEqual(track1, track2);
            expect(equal).to.be.false; // jshint ignore:line
        });

        it('should return true if both tracks are undefined or null', function () {

            let track1 = null;

            let track2 = null;
            let equal = mediaController.isTracksEqual(track1, track2);
            expect(equal).to.be.true; // jshint ignore:line
        });

    });

    describe('Track Management', function () {
        it('getTracksFor should return an empty array if parameters are not defined', function () {
            const trackArray = mediaController.getTracksFor();

            expect(trackArray).to.be.instanceOf(Array);    // jshint ignore:line
            expect(trackArray).to.be.empty;                // jshint ignore:line
        });

        it('getTracksFor should return an empty array if parameters are defined, but internal tracks array is empty', function () {
            const trackArray = mediaController.getTracksFor(Constants.VIDEO, {id: 'id'});

            expect(trackArray).to.be.instanceOf(Array);    // jshint ignore:line
            expect(trackArray).to.be.empty;                // jshint ignore:line
        });

        it('getCurrentTrackFor should return null if parameters are not defined', function () {
            const currentTrack = mediaController.getCurrentTrackFor();

            expect(currentTrack).to.be.null;    // jshint ignore:line
        });

        it('should add and retrieve track', function () {
            let streamInfo = {
                id: 'id'
            };
            let track = {
                type: trackType,
                streamInfo: streamInfo
            };

            mediaController.addTrack(track);

            // check that track has been added

            let trackList = mediaController.getTracksFor(trackType, streamInfo.id);
            expect(trackList).to.have.lengthOf(1);
            expect(objectUtils.areEqual(trackList[0], track)).to.be.true; // jshint ignore:line
        });

        it('should not set uncorrect track', function () {
            let track = {};
            let streamInfo = {
                id: 'id'
            };

            mediaController.setTrack(track);
            let currentTrack = mediaController.getCurrentTrackFor(trackType, streamInfo);
            expect(objectUtils.areEqual(currentTrack, track)).to.be.false; // jshint ignore:line
        });

        it('should add and set current track', function () {
            let streamInfo = {
                id: 'id'
            };
            let track = {
                type: trackType,
                streamInfo: streamInfo
            };

            mediaController.addTrack(track);
            mediaController.setTrack(track);

            // check that track has been added
            let currentTrack = mediaController.getCurrentTrackFor(trackType, streamInfo.id);
            expect(objectUtils.areEqual(currentTrack, track)).to.be.true; // jshint ignore:line
        });

        it('should check current track', function () {
            let streamInfo = {
                id: 'id'
            };
            let track = {
                type: trackType,
                streamInfo: streamInfo,
                lang: 'fr',
                viewpoint: 'viewpoint',
                roles: 1,
                accessibility: 1,
                audioChannelConfiguration: 1
            };

            mediaController.addTrack(track);
            mediaController.setTrack(track);

            // check that track has been added
            let currentTrack = mediaController.isCurrentTrack(track);
            expect(currentTrack).to.be.true; // jshint ignore:line
        });

        it('should check current track', function () {
            let streamInfo = {
                id: 'id'
            };
            let track = {
                type: trackType,
                streamInfo: streamInfo,
                lang: 'fr',
                viewpoint: 'viewpoint',
                roles: 1,
                accessibility: 1,
                audioChannelConfiguration: 1
            };

            mediaController.addTrack(track);
            mediaController.setTrack(track);

            // check that track has been added
            let currentTrack = mediaController.isCurrentTrack(null);
            expect(currentTrack).to.be.false; // jshint ignore:line
        });

        it('should emit Events.CURRENT_TRACK_CHANGED when track has changed', function (done) {
            let streamInfo = {
                id: 'id'
            };

            let track1 = {
                type: trackType,
                streamInfo: streamInfo,
                lang: 'fr',
                viewpoint: 'viewpoint',
                roles: 1,
                accessibility: 1,
                audioChannelConfiguration: 1,
                isFragmented: true
            };

            let track2 = {
                type: trackType,
                streamInfo: streamInfo,
                lang: 'en',
                viewpoint: 'viewpoint',
                roles: 1,
                accessibility: 1,
                audioChannelConfiguration: 1,
                isFragmented: true
            };

            // add tracks
            mediaController.addTrack(track1);
            mediaController.addTrack(track2);

            // set track1 as current track
            mediaController.setTrack(track1);

            // check that track has been added
            let currentTrack = mediaController.getCurrentTrackFor(trackType, streamInfo.id);
            expect(objectUtils.areEqual(currentTrack, track1)).to.be.true; // jshint ignore:line

            let onTrackChanged = function (e) {

                let old = e.oldMediaInfo;
                let current = e.newMediaInfo;
                let switchMode = e.switchMode;

                expect(objectUtils.areEqual(old, track1)).to.be.true; // jshint ignore:line
                expect(objectUtils.areEqual(current, track2)).to.be.true; // jshint ignore:line
                expect(switchMode).to.equal(Constants.TRACK_SWITCH_MODE_ALWAYS_REPLACE);

                eventBus.off(Events.CURRENT_TRACK_CHANGED, onTrackChanged);
                done();
            };
            eventBus.on(Events.CURRENT_TRACK_CHANGED, onTrackChanged, this);

            // set track1 as current track
            mediaController.setTrack(track2);

        });
    });

    describe('Initial Track Management', function () {

        it('should check initial media settings to choose initial track', function () {
            let streamInfo = {
                id: 'id'
            };
            let track = {
                type: trackType,
                streamInfo: streamInfo,
                lang: 'fr',
                viewpoint: 'viewpoint',
                roles: 1,
                accessibility: 1,
                audioChannelConfiguration: 1
            };

            mediaController.addTrack(track);

            let trackList = mediaController.getTracksFor(trackType, streamInfo.id);
            expect(trackList).to.have.lengthOf(1);
            expect(objectUtils.areEqual(trackList[0], track)).to.be.true; // jshint ignore:line

            let currentTrack = mediaController.getCurrentTrackFor(trackType, streamInfo.id);
            expect(objectUtils.areEqual(currentTrack, track)).to.be.false; // jshint ignore:line

            // call to setInitialMediaSettingsForType
            mediaController.setInitialSettings(trackType, {
                lang: 'fr',
                viewpoint: 'viewpoint'
            });
            mediaController.setInitialMediaSettingsForType(trackType, streamInfo);

            currentTrack = mediaController.getCurrentTrackFor(trackType, streamInfo.id);
            expect(objectUtils.areEqual(currentTrack, track)).to.be.true; // jshint ignore:line

        });

        it('should check initial media settings to choose initial track with a string/regex lang', function () {
            const streamInfo = {
                id: 'id'
            };
            const track = {
                type: trackType,
                streamInfo: streamInfo,
                lang: 'fr',
                viewpoint: 'viewpoint',
                roles: 1,
                accessibility: 1,
                audioChannelConfiguration: 1
            };

            mediaController.addTrack(track);

            let trackList = mediaController.getTracksFor(trackType, streamInfo.id);
            expect(trackList).to.have.lengthOf(1);
            expect(objectUtils.areEqual(trackList[0], track)).to.be.true; // jshint ignore:line

            let currentTrack = mediaController.getCurrentTrackFor(trackType, streamInfo.id);
            expect(objectUtils.areEqual(currentTrack, track)).to.be.false; // jshint ignore:line

            // call to setInitialMediaSettingsForType
            mediaController.setInitialSettings(trackType, {
                lang: 'fr|en|qtz',
                viewpoint: 'viewpoint'
            });
            mediaController.setInitialMediaSettingsForType(trackType, streamInfo);

            currentTrack = mediaController.getCurrentTrackFor(trackType, streamInfo.id);
            expect(objectUtils.areEqual(currentTrack, track)).to.be.true; // jshint ignore:line
        });

        it('should check initial media settings to choose initial track with a regex lang', function () {
            const streamInfo = {
                id: 'id'
            };
            const frTrack = {
                type: trackType,
                streamInfo: streamInfo,
                lang: 'fr',
                viewpoint: 'viewpoint',
                roles: 1,
                accessibility: 1,
                audioChannelConfiguration: 1
            };
            const qtzTrack = {
                type: trackType,
                streamInfo: streamInfo,
                lang: 'qtz',
                viewpoint: 'viewpoint',
                roles: 1,
                accessibility: 1,
                audioChannelConfiguration: 1
            };

            mediaController.addTrack(frTrack);
            mediaController.addTrack(qtzTrack);

            let trackList = mediaController.getTracksFor(trackType, streamInfo.id);
            expect(trackList).to.have.lengthOf(2);
            expect(objectUtils.areEqual(trackList[0], frTrack)).to.be.true; // jshint ignore:line
            expect(objectUtils.areEqual(trackList[1], qtzTrack)).to.be.true; // jshint ignore:line

            let currentTrack = mediaController.getCurrentTrackFor(trackType, streamInfo.id);
            expect(objectUtils.areEqual(currentTrack, frTrack)).to.be.false; // jshint ignore:line
            expect(objectUtils.areEqual(currentTrack, qtzTrack)).to.be.false; // jshint ignore:line

            // call to setInitialMediaSettingsForType
            mediaController.setInitialSettings(trackType, {
                lang: /qtz|mis/,
                viewpoint: 'viewpoint'
            });
            mediaController.setInitialMediaSettingsForType(trackType, streamInfo);

            currentTrack = mediaController.getCurrentTrackFor(trackType, streamInfo.id);
            expect(objectUtils.areEqual(currentTrack, qtzTrack)).to.be.true; // jshint ignore:line
        });
    });

    describe('Initial Track Selection', function () {

        function testSelectInitialTrack(type, expectedBitrateList, otherBitrateList) {
            const tracks = [ expectedBitrateList, otherBitrateList ].map(function (bitrateList) {
                return {
                    bitrateList: bitrateList,
                    representationCount: bitrateList.length
                };
            });
            const selection = mediaController.selectInitialTrack(type, tracks);
            expect(objectUtils.areEqual(selection.bitrateList, expectedBitrateList)).to.be.true; // jshint ignore:line
        }

        describe('"highestBitrate" mode', function () {
            beforeEach(function () {
                settings.update({ streaming: { selectionModeForInitialTrack: Constants.TRACK_SELECTION_MODE_HIGHEST_BITRATE }});
            });

            it('should select track with highest bitrate', function () {
                testSelectInitialTrack(
                    'video',
                    [ { bandwidth: 2000 } ],
                    [ { bandwidth: 1000 } ]
                );
            });

            it('should tie break using "widestRange"', function () {
                testSelectInitialTrack(
                    'video',
                    [ { bandwidth: 2000 }, { bandwidth: 1000 } ],
                    [ { bandwidth: 2000 } ]
                );
            });

            it('should select track with highest bitrate, expected list only one entry"', function () {
                testSelectInitialTrack(
                    'video',
                    [ { bandwidth: 2100 } ],
                    [ { bandwidth: 2000 }, { bandwidth: 1000 } ]
                );
            });
        });

        describe('"firstTrack" mode', function () {
            beforeEach(function () {
                settings.update({ streaming: { selectionModeForInitialTrack: Constants.TRACK_SELECTION_MODE_FIRST_TRACK }});
            });

            it('should select first track', function () {
                testSelectInitialTrack(
                    'video',
                    [ { bandwidth: 1000 } ],
                    [ { bandwidth: 2000 } ]
                );
            });

            it('should select first track, other bitrate list more than one entry"', function () {
                testSelectInitialTrack(
                    'video',
                    [ { bandwidth: 2000 }],
                    [ { bandwidth: 3000 }, { bandwidth: 1000 } ]
                );
            });

            it('should select first track, expected bitrate list more than one entry"', function () {
                testSelectInitialTrack(
                    'video',
                    [{ bandwidth: 3000 }, { bandwidth: 1000 }],
                    [ { bandwidth: 2000 } ]
                );
            });
        });

        describe('"highestEfficiency" mode', function () {
            beforeEach(function () {
                settings.update({ streaming: { selectionModeForInitialTrack: Constants.TRACK_SELECTION_MODE_HIGHEST_EFFICIENCY }});
            });

            it('should select video track with lowest bitrate among equal resolutions', function () {
                testSelectInitialTrack(
                    'video',
                    [ { bandwidth: 1000, width: 1920, height: 1280 } ],
                    [ { bandwidth: 2000, width: 1920, height: 1280 } ]
                );
            });

            it('should select video track with lowest bitrate among different resolutions', function () {
                testSelectInitialTrack(
                    'video',
                    [ { bandwidth: 1000, width: 1920, height: 1280 } ],
                    [ { bandwidth: 1000, width: 1080, height: 720 } ]
                );
            });

            it('should select audio track with lowest avg bitrate', function () {
                testSelectInitialTrack(
                    'audio',
                    [ { bandwidth: 1000, width: 0, height: 0 } ],
                    [ { bandwidth: 2000, width: 0, height: 0 } ]
                );
            });

            it('should tie break using "highestBitrate"', function () {
                testSelectInitialTrack(
                    'video',
                    [ { bandwidth: 1500, width: 1920, height: 1280 }, { bandwidth: 1000, width: 1080, height: 720 } ],
                    [ { bandwidth: 1000, width: 1080, height: 720 } ]
                );
            });
        });

        describe('"widestRange" mode', function () {
            beforeEach(function () {
                settings.update({ streaming: { selectionModeForInitialTrack: Constants.TRACK_SELECTION_MODE_WIDEST_RANGE }});
            });

            it('should select track with most bitrates', function () {
                testSelectInitialTrack(
                    'video',
                    [ { bandwidth: 2000 }, { bandwidth: 1000 } ],
                    [ { bandwidth: 2000 } ]
                );
            });

            it('should tie break using "highestBitrate"', function () {
                testSelectInitialTrack(
                    'video',
                    [ { bandwidth: 3000 }, { bandwidth: 2000 } ],
                    [ { bandwidth: 2000 }, { bandwidth: 1000 } ]
                );
            });
        });
    });

});
