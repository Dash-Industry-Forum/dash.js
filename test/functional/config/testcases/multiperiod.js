import Constants from '../../src/Constants.js';

export default [
    {
        name: 'AWS Multiperiod unencrypted',
        type: 'live',
        url: 'https://d24rwxnt7vw9qb.cloudfront.net/v1/dash/e6d234965645b411ad572802b6c9d5a10799c9c1/All_Reference_Streams/4577dca5f8a44756875ab5cc913cd1f1/index.mpd',
        testdata: {
            periods: {
                waitingTimeForPeriodSwitches: 70000,
                minimumNumberOfPeriodSwitches: 1,
                maximumNumberOfPeriodSwitches: 15,
            }
        },
        testcases: [Constants.TESTCASES.GENERIC.ALL],
        excludedTestcases: [Constants.TESTCASES.ADVANCED.NO_RELOAD_AFTER_SEEK]
    },

    {
        name: 'Multiperiod - Number + Timeline - Compact manifest - Thumbnails (1 track) - Encryption (2 keys : audio + video) - No key rotation',
        type: 'live',
        url: 'https://d24rwxnt7vw9qb.cloudfront.net/v1/dash/e6d234965645b411ad572802b6c9d5a10799c9c1/All_Reference_Streams//6e16c26536564c2f9dbc5f725a820cff/index.mpd',
        drm: {
            'com.widevine.alpha': {
                'serverURL': 'https://lic.staging.drmtoday.com/license-proxy-widevine/cenc/?specConform=true',
                'httpRequestHeaders': {
                    'x-dt-custom-data': 'ewogICAgInVzZXJJZCI6ICJhd3MtZWxlbWVudGFsOjpzcGVrZS10ZXN0aW5nIiwKICAgICJzZXNzaW9uSWQiOiAiZWxlbWVudGFsLXJlZnN0cmVhbSIsCiAgICAibWVyY2hhbnQiOiAiYXdzLWVsZW1lbnRhbCIKfQo='
                }
            },
            'com.microsoft.playready': {
                'serverURL': 'https://lic.staging.drmtoday.com/license-proxy-headerauth/drmtoday/RightsManager.asmx',
                'httpRequestHeaders': {
                    'x-dt-custom-data': 'ewogICAgInVzZXJJZCI6ICJhd3MtZWxlbWVudGFsOjpzcGVrZS10ZXN0aW5nIiwKICAgICJzZXNzaW9uSWQiOiAiZWxlbWVudGFsLXJlZnN0cmVhbSIsCiAgICAibWVyY2hhbnQiOiAiYXdzLWVsZW1lbnRhbCIKfQo='
                }
            }
        },
        testdata: {
            periods: {
                waitingTimeForPeriodSwitches: 70000,
                minimumNumberOfPeriodSwitches: 1,
                maximumNumberOfPeriodSwitches: 15,
            }
        },
        testcases: [Constants.TESTCASES.GENERIC.ALL],
        excludedTestcases: [Constants.TESTCASES.ADVANCED.NO_RELOAD_AFTER_SEEK],
    },
    {
        name: 'Multiperiod DASH-IF livesim2',
        type: 'live',
        url: 'https://livesim2.dashif.org/livesim2/periods_60/continuous_1/testpic_2s/Manifest.mpd',
        testdata: {
            periods: {
                waitingTimeForPeriodSwitches: 60000,
                minimumNumberOfPeriodSwitches: 1,
                maximumNumberOfPeriodSwitches: 2,
            }
        },
        testcases: [Constants.TESTCASES.GENERIC.ALL],
        excludedTestcases: [Constants.TESTCASES.ADVANCED.NO_RELOAD_AFTER_SEEK],
    }
]


