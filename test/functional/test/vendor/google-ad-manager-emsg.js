import DashJsAdapter from '../../adapter/DashJsAdapter.js';
import GoogleAdManagerAdapter from '../../adapter/GoogleAdManagerAdapter.js';
import {expect} from 'chai'
import {checkForEndedEvent, checkIsPlaying, checkIsProgressing, checkNoCriticalErrors} from '../common/common.js';

let playerAdapter;
let googleAdManagerAdapter;
let mpd;

describe(`Google Ad Manager`, function () {

    before(() => {
        playerAdapter = new DashJsAdapter();
        googleAdManagerAdapter = new GoogleAdManagerAdapter(playerAdapter)
        playerAdapter.init(true);
        googleAdManagerAdapter.init()
    })

    after(() => {
        mpd = null;
        googleAdManagerAdapter.reset();
        if (playerAdapter) {
            playerAdapter.destroy();
        }
    })

    it('Register DAI pod session', async () => {
        await googleAdManagerAdapter.requestStream()
    })


    it('Request Ad Manifest and start playback', () => {
        mpd = googleAdManagerAdapter.getAdPodManifest();
        expect(mpd).to.be.a('string');
        expect(mpd).to.not.be.empty;
    })

    it('Register for ID3 events', () => {
        googleAdManagerAdapter.registerVastEventListener()
    });

    it(' Wait for playback to be finished', async () => {
        playerAdapter.attachSource(mpd);

        await checkIsPlaying(playerAdapter, true);
        await checkIsProgressing(playerAdapter);
        await checkForEndedEvent(playerAdapter);
    })

    it(`Expect all events to be triggered`, () => {
        const adData = googleAdManagerAdapter.getAdData();
        const vastEventsToVerify = googleAdManagerAdapter.getVastEventsToVerify();
        const adIds = Object.keys(adData);

        adIds.forEach((adId) => {
            const entry = adData[adId];
            const events = Object.keys(entry.events);
            expect(Object.keys(vastEventsToVerify).every(v => events.includes(v))).to.be.true
        })
    })


    it(`Expect all events to have the right order`, () => {
        const adData = googleAdManagerAdapter.getAdData();
        const vastEventsToVerify = googleAdManagerAdapter.getVastEventsToVerify();
        const adIds = Object.keys(adData);

        adIds.forEach((adId) => {
            const entry = adData[adId];
            const events = Object.keys(entry.events);

            events.forEach((event) => {
                console.log(`event ${event} with position ${entry.events[event].position} should be at position ${vastEventsToVerify[event].position}`);
                expect(entry.events[event].position).to.be.equal(vastEventsToVerify[event].position)
            })
        })
    })

    it(`Expect no critical errors to be thrown`, () => {
        checkNoCriticalErrors(playerAdapter)
    })
});


