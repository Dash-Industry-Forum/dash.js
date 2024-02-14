import DashJsAdapter from '../../adapter/DashJsAdapter';
import Constants from '../../helper/Constants';
import Utils from '../../helper/Utils';
import GoogleAdManagerAdapter from '../../adapter/GoogleAdManagerAdapter';
import {expect} from 'chai'

const TESTCASE = Constants.TESTCASES.VENDOR.GOOGLE_AD_MANAGER_EMSG;

Utils.getTestvectorsForTestcase(TESTCASE).forEach((item) => {
    const mpd = item.url;

    describe(`Vendor - Google Ad Manager EMSG - ${item.name} - ${mpd}`, () => {

        let playerAdapter;
        let googleAdManagerAdapter;
        let mpd;

        before(() => {
            playerAdapter = new DashJsAdapter();
            googleAdManagerAdapter = new GoogleAdManagerAdapter(playerAdapter)
            playerAdapter.init(true);
            googleAdManagerAdapter.init()
        })

        after(() => {
            mpd = null;
            playerAdapter.destroy();
            googleAdManagerAdapter.reset();
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
            console.log(`MPD URL ${mpd}`);

            const isProgressing = await playerAdapter.isProgressing(Constants.TEST_TIMEOUT_THRESHOLDS.IS_PROGRESSING, Constants.TEST_INPUTS.GENERAL.MINIMUM_PROGRESS_WHEN_PLAYING);
            expect(isProgressing).to.be.true;

            const isPlaying = await playerAdapter.isInPlayingState(Constants.TEST_TIMEOUT_THRESHOLDS.IS_PLAYING);
            expect(isPlaying).to.be.true;

            const isFinished = await playerAdapter.waitForEvent(playerAdapter.getDuration() * 1000 + Constants.TEST_TIMEOUT_THRESHOLDS.IS_FINISHED_OFFSET_TO_DURATION, dashjs.MediaPlayer.events.PLAYBACK_ENDED)
            expect(isFinished).to.be.true;
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
            const logEvents = playerAdapter.getLogEvents();
            expect(logEvents[dashjs.Debug.LOG_LEVEL_ERROR]).to.be.empty;
        })

    })
})

