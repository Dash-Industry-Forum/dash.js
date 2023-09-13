import Constants from '../helper/Constants';

export default [
    {
        name: 'Livesim SCTE35',
        type: 'live',
        url: 'https://livesim2.dashif.org/livesim2/scte35_2/testpic_2s/Manifest.mpd',
        testcases: [Constants.TESTCASES.GENERIC.SIMPLE_ALL],
        testdata: {
            emsg: {
                minimumNumberOfEvents: 2,
                runtime: 65000,
                schemeIdUri: 'urn:scte:scte35:2013:xml'
            }
        },
        excludedTestcases: []
    },
]


