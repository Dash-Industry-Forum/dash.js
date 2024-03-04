import Constants from '../helper/Constants.js';

export default [
    {
        name: 'DASH-IF Live Sim - Segment Template without manifest updates',
        type: 'live',
        url: 'https://livesim2.dashif.org/livesim2/testpic_2s/Manifest.mpd',
        testcases: [Constants.TESTCASES.GENERIC.ALL]
    },
    {
        name: 'Segment Timeline with $time$',
        url: 'https://livesim2.dashif.org/livesim2/segtimeline_1/testpic_2s/Manifest.mpd',
        type: 'live',
        testcases: [Constants.TESTCASES.GENERIC.ALL]
    },
    {
        name: 'Segment Timeline with $number$',
        url: 'https://livesim2.dashif.org/livesim2/segtimelinenr_1/testpic_2s/Manifest.mpd',
        type: 'live',
        testcases: [Constants.TESTCASES.GENERIC.ALL]
    },
    {
        name: 'AWS Single Period $number$',
        url: 'https://d10gktn8v7end7.cloudfront.net/out/v1/6ee19df3afa24fe190a8ae16c2c88560/index.mpd',
        type: 'live',
        testcases: [Constants.TESTCASES.GENERIC.ALL]
    },
    {
        name: 'Audio only live',
        url: 'https://livesim2.dashif.org/livesim2/testpic_2s/audio.mpd',
        type: 'live',
        testcases: [Constants.TESTCASES.GENERIC.ALL],
        excludedTestcases: [Constants.TESTCASES.SIMPLE.INITIAL_BUFFER_TARGET]
    },
]


