import Constants from '../../src/Constants.js';

export default function getConfig() {
    return [
        {
            name: 'Segment Base',
            type: 'vod',
            url: 'https://dash.akamaized.net/dash264/TestCases/1a/sony/SNE_DASH_SD_CASE1A_REVISED.mpd',
            testcases: [Constants.TESTCASES.CATEGORIES.PLAYBACK]
        }
    ]
}

