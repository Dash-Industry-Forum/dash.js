import Constants from '../../src/Constants.js';

export default [
    {
        name: 'Segment Timeline with negative video EPT Delta',
        type: 'vod',
        url: '/base/test/functional/content/gap/video_negative_ept_delta.mpd',
        testcases: [Constants.TESTCASES.CATEGORIES.PLAYBACK],
        excludedTestcases: [Constants.TESTCASES.PLAYBACK.SEEK],
    },
    {
        name: 'Segment Timeline with negative audio EPT Delta',
        type: 'vod',
        url: '/base/test/functional/content/gap/audio_negative_ept_delta.mpd',
        testcases: [Constants.TESTCASES.CATEGORIES.PLAYBACK],
        excludedTestcases: [Constants.TESTCASES.PLAYBACK.SEEK],
    },
    {
        name: 'Segment Timeline with positive video EPT Delta',
        type: 'vod',
        url: '/base/test/functional/content/gap/video_negative_ept_delta.mpd',
        testcases: [Constants.TESTCASES.CATEGORIES.PLAYBACK],
        excludedTestcases: [Constants.TESTCASES.PLAYBACK.SEEK],
    },
    {
        name: 'Segment Timeline with positive audio EPT Delta',
        type: 'vod',
        url: '/base/test/functional/content/gap/audio_negative_ept_delta.mpd',
        testcases: [Constants.TESTCASES.CATEGORIES.PLAYBACK],
        excludedTestcases: [Constants.TESTCASES.PLAYBACK.SEEK],
    }
]


