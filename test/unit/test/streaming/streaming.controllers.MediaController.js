import MediaController from '../../../../src/streaming/controllers/MediaController.js';
import ObjectUtils from '../../../../src/streaming/utils/ObjectUtils.js';
import EventBus from '../../../../src/core/EventBus.js';
import Constants from '../../../../src/streaming/constants/Constants.js';
import Events from '../../../../src/core/events/Events.js';
import Settings from '../../../../src/core/Settings.js';
import DomStorageMock from '../../mocks/DomStorageMock.js';
import CustomParametersModel from '../../../../src/streaming/models/CustomParametersModel.js';

import {expect} from 'chai';
const context = {};
const eventBus = EventBus(context).getInstance();
const objectUtils = ObjectUtils(context).getInstance();

describe('MediaController', function () {
    let mediaController;
    let domStorageMock;
    const trackType = Constants.AUDIO;
    const settings = Settings(context).getInstance();
    const customParametersModel = CustomParametersModel(context).getInstance();

    beforeEach(function () {

        domStorageMock = new DomStorageMock();
        mediaController = MediaController(context).getInstance();
        mediaController.setConfig({
            domStorage: domStorageMock,
            settings: settings,
            customParametersModel
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
            expect(settings).to.not.exist;

            mediaController.setInitialSettings(undefined);

            settings = mediaController.getInitialSettings(undefined);
            expect(settings).to.not.exist;
        });

        it('should not set initial settings - value undefined', function () {
            let settings = mediaController.getInitialSettings('test');
            expect(settings).to.not.exist;

            mediaController.setInitialSettings('test');

            settings = mediaController.getInitialSettings('test');
            expect(settings).to.not.exist;
        });

        it('should set and get initial settings', function () {
            let settings = mediaController.getInitialSettings('test');
            expect(settings).to.not.exist;

            mediaController.setInitialSettings('test', 'testvalue');

            settings = mediaController.getInitialSettings('test');
            expect(settings).to.equal('testvalue');
        });
    });

    describe('Track Equality', function () {
        it('should return false if track are not equals', function () {

            let track1 = {
                id: 'id',
                viewpoint: null,
                lang: 'lang',
                roles: [{ schemeIdUri: 'urn:mpeg:dash:role:2011', value: 'main' }],
                accessibility: [{ schemeIdUri: 'urn:mpeg:dash:role:2011', value: 'description' }],
                audioChannelConfiguration: [{ schemeIdUri: 'urn:mpeg:mpegB:cicp:ChannelConfiguration', value: '2' }]
            };

            let track2 = {
                id: 'id2',
                viewpoint: null,
                lang: 'lang',
                roles: [{ schemeIdUri: 'urn:mpeg:dash:role:2011', value: 'main' }],
                accessibility: [{ schemeIdUri: 'urn:mpeg:dash:role:2011', value: 'description' }],
                audioChannelConfiguration: [{ schemeIdUri: 'urn:mpeg:mpegB:cicp:ChannelConfiguration', value: '2' }]

            };
            let equal = mediaController.areTracksEqual(track1, track2);
            expect(equal).to.be.false;

        });

        it('should return false if track are not equals (DescriptorType)', function () {

            let track1 = {
                id: 'id',
                viewpoint: null,
                lang: 'lang',
                roles: [{ schemeIdUri: 'urn:mpeg:dash:role:2011', value: 'main' }],
                accessibility: { schemeIdUri: 'urn:scheme:test:1:2023', value: 'description' },
                audioChannelConfiguration: [{ schemeIdUri: 'urn:mpeg:mpegB:cicp:ChannelConfiguration', value: '2' }]
            };

            let track2 = {
                id: 'id',
                viewpoint: null,
                lang: 'lang',
                roles: [{ schemeIdUri: 'urn:mpeg:dash:role:2011', value: 'main' }],
                accessibility: { schemeIdUri: 'urn:scheme:test:2:2023', value: 'description' },
                audioChannelConfiguration: [{ schemeIdUri: 'urn:mpeg:mpegB:cicp:ChannelConfiguration', value: '2' }]
            };
            let equal = mediaController.areTracksEqual(track1, track2);
            expect(equal).to.be.false;

        });

        it('should return false if track are not equals (DescriptorType), case 2', function () {

            let track1 = {
                id: 'id',
                viewpoint: [{ schemeIdUri: 'test:scheme:2023', value: 'vp1' }],
                lang: 'lang',
                roles: [{ schemeIdUri: 'urn:mpeg:dash:role:2011', value: 'main' }],
                accessibility: { schemeIdUri: 'urn:scheme:test:2023', value: 'description' },
                audioChannelConfiguration: [{ schemeIdUri: 'urn:mpeg:mpegB:cicp:ChannelConfiguration', value: '2' }]
            };

            let track2 = {
                id: 'id',
                viewpoint: [{ schemeIdUri: 'test:scheme:2023', value: 'vp2' }],
                lang: 'lang',
                roles: [{ schemeIdUri: 'urn:mpeg:dash:role:2011', value: 'main' }],
                accessibility: { schemeIdUri: 'urn:scheme:test:2023', value: 'description' },
                audioChannelConfiguration: [{ schemeIdUri: 'urn:mpeg:mpegB:cicp:ChannelConfiguration', value: '2' }]
            };
            let equal = mediaController.areTracksEqual(track1, track2);
            expect(equal).to.be.false;

        });

        it('should return true if track are equals', function () {

            let track1 = {
                id: 'id',
                viewpoint: [{ schemeIdUri: 'test:scheme:2023', value: 'vp1' }],
                lang: 'lang',
                roles: [{ schemeIdUri: 'urn:mpeg:dash:role:2011', value: 'main' }],
                accessibility: [{ schemeIdUri: 'urn:mpeg:dash:role:2011', value: 'caption' }],
                audioChannelConfiguration: [{ schemeIdUri: 'urn:mpeg:mpegB:cicp:ChannelConfiguration', value: '2' }]
            };

            let track2 = {
                id: 'id',
                viewpoint: [{ schemeIdUri: 'test:scheme:2023', value: 'vp1' }],
                lang: 'lang',
                roles: [{ schemeIdUri: 'urn:mpeg:dash:role:2011', value: 'main' }],
                accessibility: [{ schemeIdUri: 'urn:mpeg:dash:role:2011', value: 'caption' }],
                audioChannelConfiguration: [{ schemeIdUri: 'urn:mpeg:mpegB:cicp:ChannelConfiguration', value: '2' }]
            };
            let equal = mediaController.areTracksEqual(track1, track2);
            expect(equal).to.be.true;
        });

        it('should return false if track1 is undefined or null', function () {

            let track1 = null;

            let track2 = {
                id: 'id',
                viewpoint: null,
                lang: 'lang',
                roles: [{ schemeIdUri: 'urn:mpeg:dash:role:2011', value: 'main' }],
                accessibility: [{ schemeIdUri: 'urn:mpeg:dash:role:2011', value: 'caption' }],
                audioChannelConfiguration: [{ schemeIdUri: 'urn:mpeg:mpegB:cicp:ChannelConfiguration', value: '2' }]
            };
            let equal = mediaController.areTracksEqual(track1, track2);
            expect(equal).to.be.false;
        });

        it('should return false if track2 is undefined or null', function () {

            let track1 = {
                id: 'id',
                viewpoint: null,
                lang: 'lang',
                roles: [{ schemeIdUri: 'urn:mpeg:dash:role:2011', value: 'main' }],
                accessibility: [{ schemeIdUri: 'urn:mpeg:dash:role:2011', value: 'caption' }],
                audioChannelConfiguration: [{ schemeIdUri: 'urn:mpeg:mpegB:cicp:ChannelConfiguration', value: '2' }]
            };

            let track2 = null;

            let equal = mediaController.areTracksEqual(track1, track2);
            expect(equal).to.be.false;
        });

        it('should return true if both tracks are undefined or null', function () {

            let track1 = null;

            let track2 = null;
            let equal = mediaController.areTracksEqual(track1, track2);
            expect(equal).to.be.true;
        });
    });

    describe('Track Management', function () {
        it('getTracksFor should return an empty array if parameters are not defined', function () {
            const trackArray = mediaController.getTracksFor();

            expect(trackArray).to.be.instanceOf(Array);
            expect(trackArray).to.be.empty;
        });

        it('getTracksFor should return an empty array if parameters are defined, but internal tracks array is empty', function () {
            const trackArray = mediaController.getTracksFor(Constants.VIDEO, { id: 'id' });

            expect(trackArray).to.be.instanceOf(Array);
            expect(trackArray).to.be.empty;
        });

        it('getCurrentTrackFor should return null if parameters are not defined', function () {
            const currentTrack = mediaController.getCurrentTrackFor();

            expect(currentTrack).to.be.null;
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
            expect(objectUtils.areEqual(trackList[0], track)).to.be.true;
        });

        it('should not set uncorrect track', function () {
            let track = {};
            let streamInfo = {
                id: 'id'
            };

            mediaController.setTrack(track);
            let currentTrack = mediaController.getCurrentTrackFor(trackType, streamInfo);
            expect(objectUtils.areEqual(currentTrack, track)).to.be.false;
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
            expect(objectUtils.areEqual(currentTrack, track)).to.be.true;
        });

        it('should check current track', function () {
            let streamInfo = {
                id: 'id'
            };
            let track = {
                type: trackType,
                streamInfo: streamInfo,
                lang: 'fr',
                viewpoint: null,
                roles: [{ schemeIdUri: 'urn:mpeg:dash:role:2011', value: 'main' }],
                accessibility: [{ schemeIdUri: 'urn:mpeg:dash:role:2011', value: 'description' }],
                audioChannelConfiguration: [{ schemeIdUri: 'urn:mpeg:mpegB:cicp:ChannelConfiguration', value: '2' }]
            };

            mediaController.addTrack(track);
            mediaController.setTrack(track);

            // check that track has been added
            let currentTrack = mediaController.isCurrentTrack(track);
            expect(currentTrack).to.be.true;
        });

        it('should check current track', function () {
            let streamInfo = {
                id: 'id'
            };
            let track = {
                type: trackType,
                streamInfo: streamInfo,
                lang: 'fr',
                viewpoint: null,
                roles: [{ schemeIdUri: 'urn:mpeg:dash:role:2011', value: 'main' }],
                accessibility: [],
                audioChannelConfiguration: [{ schemeIdUri: 'urn:mpeg:mpegB:cicp:ChannelConfiguration', value: '2' }]
            };

            mediaController.addTrack(track);
            mediaController.setTrack(track);

            // check that track has been added
            let currentTrack = mediaController.isCurrentTrack(null);
            expect(currentTrack).to.be.false;
        });

        it('should emit Events.CURRENT_TRACK_CHANGED when track has changed', function (done) {
            let streamInfo = {
                id: 'id'
            };

            let track1 = {
                type: trackType,
                streamInfo: streamInfo,
                lang: 'fr',
                viewpoint: null,
                roles: [{ schemeIdUri: 'urn:mpeg:dash:role:2011', value: 'main' }],
                accessibility: [],
                audioChannelConfiguration: [{ schemeIdUri: 'urn:mpeg:mpegB:cicp:ChannelConfiguration', value: '2' }],
                isFragmented: true
            };

            let track2 = {
                type: trackType,
                streamInfo: streamInfo,
                lang: 'en',
                viewpoint: null,
                roles: [{ schemeIdUri: 'urn:mpeg:dash:role:2011', value: 'main' }],
                accessibility: [],
                audioChannelConfiguration: [{ schemeIdUri: 'urn:mpeg:mpegB:cicp:ChannelConfiguration', value: '2' }],
                isFragmented: true
            };

            // add tracks
            mediaController.addTrack(track1);
            mediaController.addTrack(track2);

            // set track1 as current track
            mediaController.setTrack(track1);

            // check that track has been added
            let currentTrack = mediaController.getCurrentTrackFor(trackType, streamInfo.id);
            expect(objectUtils.areEqual(currentTrack, track1)).to.be.true;

            let onTrackChanged = function (e) {

                let old = e.oldMediaInfo;
                let current = e.newMediaInfo;
                let switchMode = e.switchMode;

                expect(objectUtils.areEqual(old, track1)).to.be.true;
                expect(objectUtils.areEqual(current, track2)).to.be.true;
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
        const streamInfo = {
            id: 'id'
        };
        const frTrack = {
            id: 0,
            type: trackType,
            streamInfo: streamInfo,
            lang: 'fr',
            viewpoint: [{ schemeIdUri: 'test:scheme:2023', value: 'vp1' }],
            roles: [{ schemeIdUri: 'urn:mpeg:dash:role:2011', value: 'main' }],
            accessibility: 1,
            audioChannelConfiguration: [{ schemeIdUri: 'urn:mpeg:mpegB:cicp:ChannelConfiguration', value: '2' }]
        };
        const qtzTrack = {
            id: 'qtz',
            type: trackType,
            streamInfo: streamInfo,
            lang: 'qtz',
            viewpoint: [{ schemeIdUri: 'test:scheme:2023', value: 'vp2' }],
            roles: [{ schemeIdUri: 'urn:mpeg:dash:role:2011', value: 'main' }],
            accessibility: 1,
            audioChannelConfiguration: [{ schemeIdUri: 'urn:mpeg:mpegB:cicp:ChannelConfiguration', value: '2' }]
        };
        const enTrack = {
            id: 2,
            type: trackType,
            streamInfo: streamInfo,
            lang: 'en',
            viewpoint: null,
            roles: [{ schemeIdUri: 'urn:mpeg:dash:role:2011', value: 'main' }],
            accessibility: [],
            audioChannelConfiguration: [{ schemeIdUri: 'urn:mpeg:mpegB:cicp:ChannelConfiguration', value: '6' }],
            selectionPriority: 5
        };
        const enADTrack = {
            id: 3,
            type: trackType,
            streamInfo: streamInfo,
            lang: 'en',
            viewpoint: null,
            roles: [{ schemeIdUri: 'urn:mpeg:dash:role:2011', value: 'alternate' }],
            accessibility: [{ schemeIdUri: 'urn:mpeg:dash:role:2011', value: 'description'}],
            audioChannelConfiguration: [{ schemeIdUri: 'urn:mpeg:mpegB:cicp:ChannelConfiguration', value: '6' }],
            selectionPriority: 3
        };
        const esTrack = {
            id: 'esTrack',
            type: trackType,
            streamInfo: streamInfo,
            lang: 'es',
            viewpoint: null,
            roles: [{ schemeIdUri: 'urn:mpeg:dash:role:2011', value: 'dub' }],
            accessibility: [],
            audioChannelConfiguration: [{ schemeIdUri: 'urn:mpeg:mpegB:cicp:ChannelConfiguration', value: '2' }],
            selectionPriority: 4
        };

        it('should check initial media settings to choose initial track', function () {
            mediaController.addTrack(frTrack);
            mediaController.addTrack(qtzTrack);

            let trackList = mediaController.getTracksFor(trackType, streamInfo.id);
            expect(trackList).to.have.lengthOf(2);
            expect(objectUtils.areEqual(trackList[0], frTrack)).to.be.true;
            expect(objectUtils.areEqual(trackList[1], qtzTrack)).to.be.true;

            let currentTrack = mediaController.getCurrentTrackFor(trackType, streamInfo.id);
            expect(objectUtils.areEqual(currentTrack, frTrack)).to.be.false;

            // call to setInitialMediaSettingsForType
            mediaController.setInitialSettings(trackType, {
                lang: 'qtz',
                viewpoint: { schemeIdUri: 'test:scheme:2023', value: 'vp1' }
            });
            mediaController.setInitialMediaSettingsForType(trackType, streamInfo);

            currentTrack = mediaController.getCurrentTrackFor(trackType, streamInfo.id);
            expect(objectUtils.areEqual(currentTrack, qtzTrack)).to.be.true;

        });

        it('should check initial media settings to choose initial track via integer-id', function () {
            mediaController.addTrack(qtzTrack);
            mediaController.addTrack(esTrack);
            mediaController.addTrack(frTrack);
            mediaController.addTrack(enTrack);
            mediaController.addTrack(enADTrack);

            let trackList = mediaController.getTracksFor(trackType, streamInfo.id);
            expect(trackList).to.have.lengthOf(5);

            mediaController.setInitialSettings(trackType, {
                id: 2,
                lang: 'es'
            });
            mediaController.setInitialMediaSettingsForType(trackType, streamInfo);

            let currentTrack = mediaController.getCurrentTrackFor(trackType, streamInfo.id);
            expect(objectUtils.areEqual(currentTrack, enTrack)).to.be.true;
        });

        it('should check initial media settings to choose initial track via string-id', function () {
            mediaController.addTrack(qtzTrack);
            mediaController.addTrack(esTrack);
            mediaController.addTrack(frTrack);
            mediaController.addTrack(enTrack);
            mediaController.addTrack(enADTrack);
            
            let trackList = mediaController.getTracksFor(trackType, streamInfo.id);
            expect(trackList).to.have.lengthOf(5);
            
            mediaController.setInitialSettings(trackType, {
                id: 'esTrack',
                lang: 'en'
            });
            mediaController.setInitialMediaSettingsForType(trackType, streamInfo);
            
            let currentTrack = mediaController.getCurrentTrackFor(trackType, streamInfo.id);
            expect(objectUtils.areEqual(currentTrack, esTrack)).to.be.true;
        });

        it('should check initial media settings to choose initial track with 639-2 3-letter code', function () {
            mediaController.addTrack(qtzTrack);
            mediaController.addTrack(frTrack);

            let trackList = mediaController.getTracksFor(trackType, streamInfo.id);
            expect(trackList).to.have.lengthOf(2);
            expect(objectUtils.areEqual(trackList[0], qtzTrack)).to.be.true;
            expect(objectUtils.areEqual(trackList[1], frTrack)).to.be.true;

            let currentTrack = mediaController.getCurrentTrackFor(trackType, streamInfo.id);
            expect(objectUtils.areEqual(currentTrack, frTrack)).to.be.false;

            // call to setInitialMediaSettingsForType
            mediaController.setInitialSettings(trackType, {
                lang: 'fre',
                viewpoint: null
            });
            mediaController.setInitialMediaSettingsForType(trackType, streamInfo);

            currentTrack = mediaController.getCurrentTrackFor(trackType, streamInfo.id);
            expect(objectUtils.areEqual(currentTrack, frTrack)).to.be.true;
        });

        it('should check initial media settings to choose initial track with a string/regex lang', function () {
            mediaController.addTrack(frTrack);
            mediaController.addTrack(qtzTrack);

            let trackList = mediaController.getTracksFor(trackType, streamInfo.id);
            expect(trackList).to.have.lengthOf(2);
            expect(objectUtils.areEqual(trackList[0], frTrack)).to.be.true;
            expect(objectUtils.areEqual(trackList[1], qtzTrack)).to.be.true;

            let currentTrack = mediaController.getCurrentTrackFor(trackType, streamInfo.id);
            expect(objectUtils.areEqual(currentTrack, frTrack)).to.be.false;

            // call to setInitialMediaSettingsForType
            mediaController.setInitialSettings(trackType, {
                lang: /fr|en|qtz/,
                viewpoint: null
            });
            mediaController.setInitialMediaSettingsForType(trackType, streamInfo);

            currentTrack = mediaController.getCurrentTrackFor(trackType, streamInfo.id);
            expect(objectUtils.areEqual(currentTrack, frTrack)).to.be.true;
        });

        it('should check initial media settings to choose initial track with a regex lang', function () {
            mediaController.addTrack(frTrack);
            mediaController.addTrack(qtzTrack);

            let trackList = mediaController.getTracksFor(trackType, streamInfo.id);
            expect(trackList).to.have.lengthOf(2);
            expect(objectUtils.areEqual(trackList[0], frTrack)).to.be.true;
            expect(objectUtils.areEqual(trackList[1], qtzTrack)).to.be.true;

            let currentTrack = mediaController.getCurrentTrackFor(trackType, streamInfo.id);
            expect(objectUtils.areEqual(currentTrack, frTrack)).to.be.false;
            expect(objectUtils.areEqual(currentTrack, qtzTrack)).to.be.false;

            // call to setInitialMediaSettingsForType
            mediaController.setInitialSettings(trackType, {
                lang: /qtz|mis/,
                viewpoint: null
            });
            mediaController.setInitialMediaSettingsForType(trackType, streamInfo);

            currentTrack = mediaController.getCurrentTrackFor(trackType, streamInfo.id);
            expect(objectUtils.areEqual(currentTrack, qtzTrack)).to.be.true;
        });

        it('should check initial media settings to choose initial track with a lang and absent accessibility setting', function () {
            mediaController.addTrack(enTrack);
            mediaController.addTrack(enADTrack);
            mediaController.addTrack(esTrack);

            let trackList = mediaController.getTracksFor(trackType, streamInfo.id);
            expect(trackList).to.have.lengthOf(3);
            expect(objectUtils.areEqual(trackList[0], enTrack)).to.be.true;
            expect(objectUtils.areEqual(trackList[1], enADTrack)).to.be.true;
            expect(objectUtils.areEqual(trackList[2], esTrack)).to.be.true;

            let currentTrack = mediaController.getCurrentTrackFor(trackType, streamInfo.id);
            expect(objectUtils.areEqual(currentTrack, enTrack)).to.be.false;
            expect(objectUtils.areEqual(currentTrack, enADTrack)).to.be.false;
            expect(objectUtils.areEqual(currentTrack, esTrack)).to.be.false;

            // call to setInitialMediaSettingsForType
            mediaController.setInitialSettings(trackType, {
                lang: 'en'
            });
            mediaController.setInitialMediaSettingsForType(trackType, streamInfo);

            currentTrack = mediaController.getCurrentTrackFor(trackType, streamInfo.id);
            expect(objectUtils.areEqual(currentTrack, enTrack)).to.be.true;
        });

        it('should check initial media settings to choose initial track with a lang and empty accessibility setting', function () {
            mediaController.addTrack(enTrack);
            mediaController.addTrack(enADTrack);
            mediaController.addTrack(esTrack);

            let trackList = mediaController.getTracksFor(trackType, streamInfo.id);
            expect(trackList).to.have.lengthOf(3);
            expect(objectUtils.areEqual(trackList[0], enTrack)).to.be.true;
            expect(objectUtils.areEqual(trackList[1], enADTrack)).to.be.true;
            expect(objectUtils.areEqual(trackList[2], esTrack)).to.be.true;

            let currentTrack = mediaController.getCurrentTrackFor(trackType, streamInfo.id);
            expect(objectUtils.areEqual(currentTrack, enTrack)).to.be.false;
            expect(objectUtils.areEqual(currentTrack, enADTrack)).to.be.false;
            expect(objectUtils.areEqual(currentTrack, esTrack)).to.be.false;

            // call to setInitialMediaSettingsForType
            mediaController.setInitialSettings(trackType, {
                lang: 'en',
                accessibility: []
            });
            mediaController.setInitialMediaSettingsForType(trackType, streamInfo);

            currentTrack = mediaController.getCurrentTrackFor(trackType, streamInfo.id);
            expect(objectUtils.areEqual(currentTrack, enTrack)).to.be.true;
        });

        it('should check initial media settings to choose initial track with a lang and accessibility', function () {
            mediaController.addTrack(enTrack);
            mediaController.addTrack(enADTrack);
            mediaController.addTrack(esTrack);

            let trackList = mediaController.getTracksFor(trackType, streamInfo.id);
            expect(trackList).to.have.lengthOf(3);
            expect(objectUtils.areEqual(trackList[0], enTrack)).to.be.true;
            expect(objectUtils.areEqual(trackList[1], enADTrack)).to.be.true;
            expect(objectUtils.areEqual(trackList[2], esTrack)).to.be.true;

            let currentTrack = mediaController.getCurrentTrackFor(trackType, streamInfo.id);
            expect(objectUtils.areEqual(currentTrack, enTrack)).to.be.false;
            expect(objectUtils.areEqual(currentTrack, enADTrack)).to.be.false;
            expect(objectUtils.areEqual(currentTrack, esTrack)).to.be.false;

            // call to setInitialMediaSettingsForType
            mediaController.setInitialSettings(trackType, {
                lang: 'en',
                accessibility: {schemeIdUri:'urn:mpeg:dash:role:2011', value:'description'}
            });
            mediaController.setInitialMediaSettingsForType(trackType, streamInfo);

            currentTrack = mediaController.getCurrentTrackFor(trackType, streamInfo.id);
            expect(objectUtils.areEqual(currentTrack, enADTrack)).to.be.true;
        });

        it('should check initial media settings to choose initial accessibility track where media has no accessibility for requested language', function () {
            mediaController.addTrack(enTrack);
            mediaController.addTrack(enADTrack);
            mediaController.addTrack(esTrack);

            let trackList = mediaController.getTracksFor(trackType, streamInfo.id);
            expect(trackList).to.have.lengthOf(3);
            expect(objectUtils.areEqual(trackList[0], enTrack)).to.be.true;
            expect(objectUtils.areEqual(trackList[1], enADTrack)).to.be.true;
            expect(objectUtils.areEqual(trackList[2], esTrack)).to.be.true;

            let currentTrack = mediaController.getCurrentTrackFor(trackType, streamInfo.id);
            expect(objectUtils.areEqual(currentTrack, enTrack)).to.be.false;
            expect(objectUtils.areEqual(currentTrack, enADTrack)).to.be.false;
            expect(objectUtils.areEqual(currentTrack, esTrack)).to.be.false;

            // call to setInitialMediaSettingsForType
            mediaController.setInitialSettings(trackType, {
                lang: 'es',
                accessibility: [{schemeIdUri:'urn:mpeg:dash:role:2011',value:'description'}]
            });
            mediaController.setInitialMediaSettingsForType(trackType, streamInfo);

            currentTrack = mediaController.getCurrentTrackFor(trackType, streamInfo.id);
            expect(objectUtils.areEqual(currentTrack, esTrack)).to.be.true;
        });

        it('should check initial media settings to choose initial track based on viewpoint', function () {
            mediaController.addTrack(frTrack);
            mediaController.addTrack(qtzTrack);

            let trackList = mediaController.getTracksFor(trackType, streamInfo.id);
            expect(trackList).to.have.lengthOf(2);
            expect(objectUtils.areEqual(trackList[0], frTrack)).to.be.true;
            expect(objectUtils.areEqual(trackList[1], qtzTrack)).to.be.true;

            let currentTrack = mediaController.getCurrentTrackFor(trackType, streamInfo.id);
            expect(objectUtils.areEqual(currentTrack, frTrack)).to.be.false;

            // call to setInitialMediaSettingsForType
            mediaController.setInitialSettings(trackType, {
                viewpoint: [{ schemeIdUri: 'test:scheme:2023', value: 'vp1' }]
            });
            mediaController.setInitialMediaSettingsForType(trackType, streamInfo);

            currentTrack = mediaController.getCurrentTrackFor(trackType, streamInfo.id);
            expect(objectUtils.areEqual(currentTrack, frTrack)).to.be.true;
        });

        it('should check initial media settings to choose initial track based on role', function () {
            mediaController.addTrack(enTrack);
            mediaController.addTrack(esTrack);
            mediaController.addTrack(enADTrack);

            mediaController.setInitialSettings(trackType, {
                role: { schemeIdUri: 'urn:mpeg:dash:role:2011', value: 'dub' }
            });
            mediaController.setInitialMediaSettingsForType(trackType, streamInfo);

            let currentTrack = mediaController.getCurrentTrackFor(trackType, streamInfo.id);
            expect(objectUtils.areEqual(currentTrack, esTrack)).to.be.true;
        });

        it('should not check initial media settings to choose initial track when it has already selected a track', function () {
            mediaController.addTrack(frTrack);
            mediaController.addTrack(qtzTrack);

            let trackList = mediaController.getTracksFor(trackType, streamInfo.id);
            expect(trackList).to.have.lengthOf(2);
            expect(objectUtils.areEqual(trackList[0], frTrack)).to.be.true;
            expect(objectUtils.areEqual(trackList[1], qtzTrack)).to.be.true;

            let currentTrack = mediaController.getCurrentTrackFor(trackType, streamInfo.id);
            expect(objectUtils.areEqual(currentTrack, frTrack)).to.be.false;
            expect(objectUtils.areEqual(currentTrack, qtzTrack)).to.be.false;

            mediaController.setInitialSettings(trackType, {
                lang: 'fr'
            });
            mediaController.setInitialMediaSettingsForType(trackType, streamInfo);

            currentTrack = mediaController.getCurrentTrackFor(trackType, streamInfo.id);
            expect(objectUtils.areEqual(currentTrack, frTrack)).to.be.true;

            // pretend we're switching period, which will call setInitialMediaSettingsForType again
            mediaController.setInitialSettings(trackType, {
                lang: 'qtz'
            });
            mediaController.setInitialMediaSettingsForType(trackType, streamInfo);

            currentTrack = mediaController.getCurrentTrackFor(trackType, streamInfo.id);
            expect(objectUtils.areEqual(currentTrack, frTrack)).to.be.true;
        });

        it('should always check initial media settings to choose initial track when saveLastMediaSettingsForCurrentStreamingSession is disabled', function () {
            settings.update({ streaming: { saveLastMediaSettingsForCurrentStreamingSession: false } });

            mediaController.addTrack(frTrack);
            mediaController.addTrack(qtzTrack);

            let trackList = mediaController.getTracksFor(trackType, streamInfo.id);
            expect(trackList).to.have.lengthOf(2);
            expect(objectUtils.areEqual(trackList[0], frTrack)).to.be.true;
            expect(objectUtils.areEqual(trackList[1], qtzTrack)).to.be.true;

            let currentTrack = mediaController.getCurrentTrackFor(trackType, streamInfo.id);
            expect(objectUtils.areEqual(currentTrack, frTrack)).to.be.false;
            expect(objectUtils.areEqual(currentTrack, qtzTrack)).to.be.false;

            mediaController.setInitialSettings(trackType, {
                lang: 'fr'
            });
            mediaController.setInitialMediaSettingsForType(trackType, streamInfo);

            currentTrack = mediaController.getCurrentTrackFor(trackType, streamInfo.id);
            expect(objectUtils.areEqual(currentTrack, frTrack)).to.be.true;

            // pretend we're switching period, which will call setInitialMediaSettingsForType again
            mediaController.setInitialSettings(trackType, {
                lang: 'qtz'
            });
            mediaController.setInitialMediaSettingsForType(trackType, streamInfo);

            currentTrack = mediaController.getCurrentTrackFor(trackType, streamInfo.id);
            expect(objectUtils.areEqual(currentTrack, qtzTrack)).to.be.true;
        });
    });

    describe('Initial Track Selection', function () {

        function testSelectInitialTrack(type, expectedTrack, otherTrack) {
            const tracks = [expectedTrack, otherTrack].map(function (track) {
                return {
                    type: type,
                    bitrateList: track.bitrateList,
                    representationCount: track.bitrateList.length,
                    audioChannelConfiguration: track.audioChannelConfiguration ? track.audioChannelConfiguration : [],
                    selectionPriority: !isNaN(track.selectionPriority) ? track.selectionPriority : 1,
                    supplementalProperties: track.supplementalProperties ? track.supplementalProperties : [],
                    roles: track.roles ? track.roles : []
                };
            });
            const selection = mediaController.selectInitialTrack(type, tracks);
            expect(objectUtils.areEqual(selection.bitrateList, expectedTrack.bitrateList)).to.be.true;
        }

        describe('selectionPriority flag', function () {
            beforeEach(function () {
                settings.update({ streaming: { selectionModeForInitialTrack: Constants.TRACK_SELECTION_MODE_HIGHEST_BITRATE } });
            });

            it('should select track with highest priority per default', function () {
                testSelectInitialTrack(
                    'video',
                    { bitrateList: [{ bandwidth: 1000 }], selectionPriority: 2 },
                    { bitrateList: [{ bandwidth: 2000 }], selectionPriority: 1 }
                );
            });

            it('should select track with highest bitrate if selectionPriority is to be ignored', function () {
                settings.update({ streaming: { ignoreSelectionPriority: true } });
                testSelectInitialTrack(
                    'video',
                    { bitrateList: [{ bandwidth: 2000 }], selectionPriority: 1 },
                    { bitrateList: [{ bandwidth: 1000 }], selectionPriority: 2 }
                );
            });
        })

        describe('roleMain flag' ,function () {
            beforeEach(function () {
                settings.update({ 
                    streaming: { 
                        selectionModeForInitialTrack: Constants.TRACK_SELECTION_MODE_HIGHEST_BITRATE,
                        prioritizeRoleMain: true
                    }
                });
            });

            it('should select track with role set to main if no selectionPriority is provided', function () {
                testSelectInitialTrack(
                    'video',
                    { bitrateList: [{ bandwidth: 1000 }], roles: [{ schemeIdUri: 'urn:mpeg:dash:role:2011', value: 'main' }] },
                    { bitrateList: [{ bandwidth: 2000 }], roles: [{ schemeIdUri: 'urn:mpeg:dash:role:2011', value: 'dub' }] }
                );
            });

            it('should select track with role set to main if other tracks have no role', function () {
                testSelectInitialTrack(
                    'video',
                    { bitrateList: [{ bandwidth: 1000 }], roles: [{ schemeIdUri: 'urn:mpeg:dash:role:2011', value: 'main' }] },
                    { bitrateList: [{ bandwidth: 2000 }], roles: [] }
                );
            });

            it('should select track with role set to main with multiple role descriptors', function () {
                testSelectInitialTrack(
                    'video',
                    { bitrateList: [{ bandwidth: 1000 }], roles: [{ schemeIdUri: 'urn:mpeg:dash:role:2011', value: 'main' },{ schemeIdUri: 'urn:mpeg:dash:role:2011', value: 'dub' }] },
                    { bitrateList: [{ bandwidth: 2000 }], roles: [{ schemeIdUri: 'urn:mpeg:dash:role:2011', value: 'dub' }] }
                );
            });

            it('should select track with no role if other tracks have role not main', function () {
                testSelectInitialTrack(
                    'video',
                    { bitrateList: [{ bandwidth: 1000 }], roles: [] },
                    { bitrateList: [{ bandwidth: 2000 }], roles: [{ schemeIdUri: 'urn:mpeg:dash:role:2011', value: 'dub' }] }
                );
            });

            it('should not select track with no role if other tracks have role not main, when disabled in Settings', function () {
                settings.update({ 
                    streaming: { 
                        assumeDefaultRoleAsMain: false
                    }
                });
                testSelectInitialTrack(
                    'video',
                    { bitrateList: [{ bandwidth: 2000 }], roles: [{ schemeIdUri: 'urn:mpeg:dash:role:2011', value: 'dub' }] },
                    { bitrateList: [{ bandwidth: 1000 }], roles: [] }
                );
            });

            it('should select track based on selectionPriority, if provided, and disregard role main', function () {
                testSelectInitialTrack(
                    'video',
                    { bitrateList: [{ bandwidth: 1000 }], roles: [{ schemeIdUri: 'urn:mpeg:dash:role:2011', value: 'dub' }], selectionPriority: 2 },
                    { bitrateList: [{ bandwidth: 2000 }], roles: [{ schemeIdUri: 'urn:mpeg:dash:role:2011', value: 'main' }], selectionPriority: 1 }
                );
            });

            it('should select track based on selectionModeForInitialTrack if roleMain flag is false', function () {
                settings.update({ streaming: { 
                    prioritizeRoleMain: false, 
                    selectionModeForInitialTrack: Constants.TRACK_SELECTION_MODE_HIGHEST_BITRATE } 
                });
                
                testSelectInitialTrack(
                    'video',
                    { bitrateList: [{ bandwidth: 2000 }], roles: [{ schemeIdUri: 'urn:mpeg:dash:role:2011', value: 'dub' }] },
                    { bitrateList: [{ bandwidth: 1000 }], roles: [{ schemeIdUri: 'urn:mpeg:dash:role:2011', value: 'main' }] }
                );
            });
        })

        describe('"highestSelectionPriority" mode', function () {
            beforeEach(function () {
                settings.update({ streaming: { selectionModeForInitialTrack: Constants.TRACK_SELECTION_MODE_HIGHEST_EFFICIENCY } });
            });

            it('should select track with highest priority', function () {
                testSelectInitialTrack(
                    'video',
                    { bitrateList: [{ bandwidth: 1000 }], selectionPriority: 2 },
                    { bitrateList: [{ bandwidth: 2000 }], selectionPriority: 1 }
                );
            });

            it('should select track with highest bitrate if both tracks have same priority', function () {
                testSelectInitialTrack(
                    'video',
                    { bitrateList: [{ bandwidth: 1000 }, { bandwidth: 3000 }], selectionPriority: 1 },
                    { bitrateList: [{ bandwidth: 2000 }], selectionPriority: 1 }
                );
            });

            it('should select track with highest bitrate if no priority is given', function () {
                testSelectInitialTrack(
                    'video',
                    { bitrateList: [{ bandwidth: 1000 }, { bandwidth: 3000 }] },
                    { bitrateList: [{ bandwidth: 2000 }] }
                );
            });

            it('should tie break using "widestRange"', function () {
                testSelectInitialTrack(
                    'video',
                    { bitrateList: [{ bandwidth: 2000 }, { bandwidth: 1000 }] },
                    { bitrateList: [{ bandwidth: 2000 }] }
                );
            });

        });

        describe('"highestBitrate" mode', function () {
            beforeEach(function () {
                settings.update({ streaming: { selectionModeForInitialTrack: Constants.TRACK_SELECTION_MODE_HIGHEST_BITRATE } });
            });

            it('should select track with highest bitrate', function () {
                testSelectInitialTrack(
                    'video',
                    { bitrateList: [{ bandwidth: 2000 }] },
                    { bitrateList: [{ bandwidth: 1000 }] }
                );
            });

            it('should tie break using "widestRange"', function () {
                testSelectInitialTrack(
                    'video',
                    { bitrateList: [{ bandwidth: 2000 }, { bandwidth: 1000 }] },
                    { bitrateList: [{ bandwidth: 2000 }] }
                );
            });

            it('should select track with highest bitrate, expected list only one entry"', function () {
                testSelectInitialTrack(
                    'video',
                    { bitrateList: [{ bandwidth: 2100 }] },
                    { bitrateList: [{ bandwidth: 2000 }, { bandwidth: 1000 }] },
                );
            });
        });

        describe('"firstTrack" mode', function () {
            beforeEach(function () {
                settings.update({ streaming: { selectionModeForInitialTrack: Constants.TRACK_SELECTION_MODE_FIRST_TRACK } });
            });

            it('should select first track', function () {
                testSelectInitialTrack(
                    'video',
                    { bitrateList: [{ bandwidth: 1000 }] },
                    { bitrateList: [{ bandwidth: 2000 }] }
                );
            });

            it('should select first track, other bitrate list more than one entry"', function () {
                testSelectInitialTrack(
                    'video',
                    { bitrateList: [{ bandwidth: 2000 }] },
                    { bitrateList: [{ bandwidth: 3000 }, { bandwidth: 1000 }] }
                );
            });

            it('should select first track, expected bitrate list more than one entry"', function () {
                testSelectInitialTrack(
                    'video',
                    { bitrateList: [{ bandwidth: 3000 }, { bandwidth: 1000 }] },
                    { bitrateList: [{ bandwidth: 2000 }] }
                );
            });
        });

        describe('"highestEfficiency" mode', function () {
            beforeEach(function () {
                settings.update({ streaming: { selectionModeForInitialTrack: Constants.TRACK_SELECTION_MODE_HIGHEST_EFFICIENCY } });
            });

            it('should select track with highest priority', function () {
                testSelectInitialTrack(
                    'video',
                    { bitrateList: [{ bandwidth: 2000, width: 1920, height: 1280 }], selectionPriority: 2 },
                    { bitrateList: [{ bandwidth: 1000, width: 1920, height: 1280 }], selectionPriority: 1 }
                );
            });

            it('should select video track with lowest bitrate among equal resolutions', function () {
                testSelectInitialTrack(
                    'video',
                    { bitrateList: [{ bandwidth: 1000, width: 1920, height: 1280 }] },
                    { bitrateList: [{ bandwidth: 2000, width: 1920, height: 1280 }] }
                );
            });

            it('should select video track with lowest bitrate among different resolutions', function () {
                testSelectInitialTrack(
                    'video',
                    { bitrateList: [{ bandwidth: 1000, width: 1920, height: 1280 }] },
                    { bitrateList: [{ bandwidth: 1000, width: 1280, height: 720 }] }
                );
            });

            it('should not prioritize audio tracks where audioChannelConfig is absent', function () {
                testSelectInitialTrack(
                    'audio',
                    { bitrateList: [{ bandwidth: 128 }], audioChannelConfiguration: [{schemeIdUri: 'urn:mpeg:mpegB:cicp:ChannelConfiguration', value: '2'}] },
                    { bitrateList: [{ bandwidth: 96 }] }
                );
            });

            it('should select audio track with lowest bitrate per full channels (equal channel config)', function () {
                testSelectInitialTrack(
                    'audio',
                    { bitrateList: [{ bandwidth: 96 }], audioChannelConfiguration: [{schemeIdUri: 'urn:mpeg:mpegB:cicp:ChannelConfiguration', value: '2'}] },
                    { bitrateList: [{ bandwidth: 128 }], audioChannelConfiguration: [{schemeIdUri: 'urn:mpeg:mpegB:cicp:ChannelConfiguration', value: '2'}] }
                );
            });

            it('should select audio track with lowest bitrate per full channels (different channel config)', function () {
                testSelectInitialTrack(
                    'audio',
                    { bitrateList: [{ bandwidth: 2000 }], audioChannelConfiguration: [{schemeIdUri: 'urn:mpeg:mpegB:cicp:ChannelConfiguration', value: '6'}] },
                    { bitrateList: [{ bandwidth: 1000 }], audioChannelConfiguration: [{schemeIdUri: 'urn:mpeg:mpegB:cicp:ChannelConfiguration', value: '2'}] }
                );
            });

            it('should select audio track with lowest bitrate per full channels (JOC extension)', function () {
                testSelectInitialTrack(
                    'audio',
                    {
                        bitrateList: [{ bandwidth: 768 }],
                        audioChannelConfiguration: [{schemeIdUri: 'tag:dolby.com,2014:dash:audio_channel_configuration:2011', value: 'F8016'}],
                        supplementalProperties: [{schemeIdUri: 'tag:dolby.com,2018:dash:EC3_ExtensionType:2018', value: 'JOC'}]
                    },
                    { bitrateList: [{ bandwidth: 128 }], audioChannelConfiguration: [{schemeIdUri: 'urn:mpeg:mpegB:cicp:ChannelConfiguration', value: '2'}] }
                );
            });

            it('should tie break using "highestBitrate"', function () {
                testSelectInitialTrack(
                    'video',
                    {
                        bitrateList: [{ bandwidth: 1500, width: 1920, height: 1280 }, {
                            bandwidth: 1000,
                            width: 1080,
                            height: 720
                        }]
                    },
                    { bitrateList: [{ bandwidth: 1000, width: 1080, height: 720 }] }
                );
            });
        });

        describe('"widestRange" mode', function () {
            beforeEach(function () {
                settings.update({ streaming: { selectionModeForInitialTrack: Constants.TRACK_SELECTION_MODE_WIDEST_RANGE } });
            });

            it('should select track with most bitrates', function () {
                testSelectInitialTrack(
                    'video',
                    { bitrateList: [{ bandwidth: 2000 }, { bandwidth: 1000 }] },
                    { bitrateList: [{ bandwidth: 2000 }] }
                );
            });

            it('should tie break using "highestBitrate"', function () {
                testSelectInitialTrack(
                    'video',
                    { bitrateList: [{ bandwidth: 3000 }, { bandwidth: 2000 }] },
                    { bitrateList: [{ bandwidth: 2000 }, { bandwidth: 1000 }] }
                );
            });
        });

        describe('custom initial track selection function', function () {
            beforeEach(function () {

            });

            it('should return the track with the lowest bitrate', function () {
                settings.update({ streaming: { selectionModeForInitialTrack: Constants.TRACK_SELECTION_MODE_HIGHEST_BITRATE } });

                function getTrackWithLowestBitrate(trackArr) {
                    let min = Infinity;
                    let result = [];
                    let tmp;

                    trackArr.forEach(function (track) {
                        tmp = Math.min.apply(Math, track.bitrateList.map(function (obj) {
                            return obj.bandwidth;
                        }));

                        if (tmp < min) {
                            min = tmp;
                            result = [track];
                        }
                    });

                    return result;
                }

                customParametersModel.setCustomInitialTrackSelectionFunction(getTrackWithLowestBitrate);
                testSelectInitialTrack(
                    'video',
                    { bitrateList: [{ bandwidth: 1000 }, { bandwidth: 5000 }] },
                    { bitrateList: [{ bandwidth: 2000 }, { bandwidth: 8000 }] }
                )
            });
        });
    });

});
