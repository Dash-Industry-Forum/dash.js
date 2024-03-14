import Constants from '../../src/Constants.js';

export default function getConfig() {
    return [
        {
            name: 'DASH-IF Live Sim - Segment Template without manifest updates',
            type: 'live',
            url: 'https://livesim2.dashif.org/livesim2/testpic_2s/Manifest.mpd',
            testcases: [Constants.TESTCASES.PLAYBACK.PLAY]
        },
    ]
}

