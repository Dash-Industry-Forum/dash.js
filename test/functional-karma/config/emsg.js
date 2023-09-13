import Constants from '../helper/Constants';

export default [
    {
        name: 'livesim2 SCTE35',
        type: 'live',
        url: 'https://livesim2.dashif.org/livesim2/scte35_2/testpic_2s/Manifest.mpd',
        testcases: [Constants.TESTCASES.SIMPLE.EMSG_TRIGGERED],
        testdata: {
            emsg: {
                minimumNumberOfEvents: 2,
                runtime: 65000,
                schemeIdUri: 'urn:scte:scte35:2013:bin'
            }
        }
    },
]


