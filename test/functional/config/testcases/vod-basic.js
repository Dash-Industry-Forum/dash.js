import Constants from '../../src/Constants.js';

export default [
    {
        name: 'Segment Base',
        type: 'vod',
        url: 'https://dash.akamaized.net/dash264/TestCases/1a/sony/SNE_DASH_SD_CASE1A_REVISED.mpd',
        testcases: [Constants.TESTCASES.CATEGORIES.ALL]
    },
    {
        name: 'Segment Template, number based',
        type: 'vod',
        url: 'https://dash.akamaized.net/akamai/bbb_30fps/bbb_30fps.mpd',
        testcases: [Constants.TESTCASES.CATEGORIES.ALL]
    },
    {
        name: 'Segment Timeline, time based',
        type: 'vod',
        url: 'https://dash.akamaized.net/dash264/TestCases/2c/qualcomm/1/MultiResMPEG2.mpd',
        testcases: [Constants.TESTCASES.CATEGORIES.ALL]
    },
]


