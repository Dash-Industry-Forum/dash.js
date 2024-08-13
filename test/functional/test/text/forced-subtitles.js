import Constants from '../../src/Constants.js';
import Utils from '../../src/Utils.js';
import {expect} from 'chai'
import {
    checkIsPlaying,
    checkIsProgressing,
    checkNoCriticalErrors,
    initializeDashJsAdapter
} from '../common/common.js';

const TESTCASE = Constants.TESTCASES.TEXT.FORCED_SUBTITLES;

Utils.getTestvectorsForTestcase(TESTCASE).forEach((item) => {
    const mpd = item.url;

    describe(`${TESTCASE} - ${item.name} - ${mpd}`, () => {

        let playerAdapter

        before(function () {
            if (!item.testdata || !item.testdata.forcedSubtitles) {
                this.skip();
            }
            playerAdapter = initializeDashJsAdapter(item, mpd);
        })

        after(() => {
            if (playerAdapter) {
                playerAdapter.destroy();
            }
        })

        it(`Checking playing state`, async () => {
            await checkIsPlaying(playerAdapter, true);
        })

        it(`Checking progressing state`, async () => {
            await checkIsProgressing(playerAdapter);
        });

        it(`Turn off subtitles`, async () => {
            playerAdapter.setTextTrack(-1);
        });

        it(`Switch to audio tracks for which we got a forced subtitle. Expect the forced subtitle to be active`, async () => {
            const availableTextTracks = playerAdapter.getTracksFor(Constants.DASH_JS.MEDIA_TYPES.TEXT);
            const availableAudioTracks = playerAdapter.getTracksFor(Constants.DASH_JS.MEDIA_TYPES.AUDIO);
            const forcedSubtitleTracks = _getForcedSubtitleTracks(availableTextTracks);

            for (let i = 0; i < forcedSubtitleTracks.length; i++) {
                const forcedSubtitleTrack = forcedSubtitleTracks[i];
                const suitableAudioTrack = _getAudioTrackForForcedSubtitleTrack(forcedSubtitleTrack, availableAudioTracks);
                if (suitableAudioTrack) {
                    playerAdapter.setCurrentTrack(suitableAudioTrack);
                    await playerAdapter.sleep(1000);
                    const currentTextTrack = playerAdapter.getCurrentTrackFor(Constants.DASH_JS.MEDIA_TYPES.TEXT);
                    const currentAudioTrack = playerAdapter.getCurrentTrackFor(Constants.DASH_JS.MEDIA_TYPES.AUDIO);
                    expect(currentAudioTrack.lang).to.be.equal(suitableAudioTrack.lang);
                    expect(currentAudioTrack.index).to.be.equal(suitableAudioTrack.index);
                    expect(currentTextTrack.lang).to.be.equal(forcedSubtitleTrack.lang);
                    expect(currentTextTrack.index).to.be.equal(forcedSubtitleTrack.index);
                }
            }
        });

        it(`Switch to audio tracks for which we got no forced subtitle. Expect no subtitle to be active`, async () => {
            playerAdapter.setTextTrack(-1);
            const availableTextTracks = playerAdapter.getTracksFor(Constants.DASH_JS.MEDIA_TYPES.TEXT);
            const availableAudioTracks = playerAdapter.getTracksFor(Constants.DASH_JS.MEDIA_TYPES.AUDIO);
            const forcedSubtitleTracks = _getForcedSubtitleTracks(availableTextTracks);

            for (let i = 0; i < availableAudioTracks.length; i++) {
                const currentAudioTrack = availableAudioTracks[i];
                const suitableForcedSubtitleTrack = _getForcedSubtitleTrackForAudioTrack(currentAudioTrack, forcedSubtitleTracks);
                if (!suitableForcedSubtitleTrack) {
                    playerAdapter.setCurrentTrack(currentAudioTrack);
                    await playerAdapter.sleep(1000);
                    const currentIndex = playerAdapter.getCurrentTextTrackIndex();
                    expect(currentIndex).to.be.equal(-1);
                }
            }
        });

        it(`Expect no critical errors to be thrown`, () => {
            checkNoCriticalErrors(playerAdapter);
        })
    })
})

function _getForcedSubtitleTracks(textTrackInfos) {
    return textTrackInfos.filter((textTrackInfo, index) => {
        textTrackInfo._indexToSelect = index;
        if (textTrackInfo && textTrackInfo.roles && textTrackInfo.roles.length > 0) {
            return _isForcedSubtitleTrack(textTrackInfo);
        }
        return false
    });
}

function _isForcedSubtitleTrack(textTrackInfo) {
    return textTrackInfo.roles.some((role) => {
        return role.schemeIdUri === Constants.ROLES.FORCED_SUBTITLES.SCHEME_ID_URI && role.value === Constants.ROLES.FORCED_SUBTITLES.VALUE
    })
}

function _getAudioTrackForForcedSubtitleTrack(textTrackInfo, availableAudioTracks) {
    return availableAudioTracks.find((audioTrack) => {
        return audioTrack.lang === textTrackInfo.lang
    })
}

function _getForcedSubtitleTrackForAudioTrack(audioTrack, forcedSubtitleTracks) {
    return forcedSubtitleTracks.find((forcedSubtitleTrack) => {
        return audioTrack.lang === forcedSubtitleTrack.lang
    })
}

