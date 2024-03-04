import Constants from '../../src/Constants.js';

export default [
    {
        name: 'Segment Timeline with missing audio segment in MPD for time 0',
        type: 'vod',
        url: '/base/content/gap/audio_gap_at_start_timeline.mpd',
        testcases: [Constants.TESTCASES.ADVANCED.SEEK_IN_GAPS],
        testdata: {
            gaps: [
                {
                    start: 0,
                    end: 5.97
                }]
        }
    },
    {
        name: 'Segment Timeline with missing video segment in MPD for time 0',
        type: 'vod',
        url: '/base/content/gap/video_gap_at_start_timeline.mpd',
        testcases: [Constants.TESTCASES.ADVANCED.SEEK_IN_GAPS],
        testdata: {
            gaps: [
                {
                    start: 0,
                    end: 6
                }]
        }
    },
]


