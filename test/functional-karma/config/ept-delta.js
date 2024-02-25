import Constants from '../helper/Constants.js';

export default [
    {
        name: 'Segment Timeline with negative video EPT Delta',
        type: 'vod',
        url: '/base/content/gap/video_negative_ept_delta.mpd',
        testcases: [Constants.TESTCASES.GENERIC.ALL],
        excludedTestcases: [Constants.TESTCASES.SIMPLE.SEEK, Constants.TESTCASES.SIMPLE.ATTACH_AT_NON_ZERO],
    },
    {
        name: 'Segment Timeline with negative audio EPT Delta',
        type: 'vod',
        url: '/base/content/gap/audio_negative_ept_delta.mpd',
        testcases: [Constants.TESTCASES.GENERIC.ALL],
        excludedTestcases: [Constants.TESTCASES.SIMPLE.SEEK, Constants.TESTCASES.SIMPLE.ATTACH_AT_NON_ZERO],
    },
    {
        name: 'Segment Timeline with positive video EPT Delta',
        type: 'vod',
        url: '/base/content/gap/video_negative_ept_delta.mpd',
        testcases: [Constants.TESTCASES.GENERIC.ALL],
        excludedTestcases: [Constants.TESTCASES.SIMPLE.SEEK, Constants.TESTCASES.SIMPLE.ATTACH_AT_NON_ZERO],
    },
    {
        name: 'Segment Timeline with positive audio EPT Delta',
        type: 'vod',
        url: '/base/content/gap/audio_negative_ept_delta.mpd',
        testcases: [Constants.TESTCASES.GENERIC.ALL],
        excludedTestcases: [Constants.TESTCASES.SIMPLE.SEEK, Constants.TESTCASES.SIMPLE.ATTACH_AT_NON_ZERO],
    }
]


