import Constants from '../../src/Constants.js';

export default function getConfig() {
    return [
        {
            name: '1080p with PlayReady and Widevine DRM, single key',
            type: 'vod',
            url: 'https://media.axprod.net/TestVectors/v7-MultiDRM-SingleKey/Manifest_1080p.mpd',
            drm: {
                'com.widevine.alpha': {
                    'serverURL': 'https://drm-widevine-licensing.axtest.net/AcquireLicense',
                    'httpRequestHeaders': {
                        'X-AxDRM-Message': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ2ZXJzaW9uIjoxLCJjb21fa2V5X2lkIjoiYjMzNjRlYjUtNTFmNi00YWUzLThjOTgtMzNjZWQ1ZTMxYzc4IiwibWVzc2FnZSI6eyJ0eXBlIjoiZW50aXRsZW1lbnRfbWVzc2FnZSIsImtleXMiOlt7ImlkIjoiOWViNDA1MGQtZTQ0Yi00ODAyLTkzMmUtMjdkNzUwODNlMjY2IiwiZW5jcnlwdGVkX2tleSI6ImxLM09qSExZVzI0Y3Iya3RSNzRmbnc9PSJ9XX19.4lWwW46k-oWcah8oN18LPj5OLS5ZU-_AQv7fe0JhNjA'
                    },
                    'httpTimeout': 5000
                },
                'com.microsoft.playready': {
                    'serverURL': 'https://drm-playready-licensing.axtest.net/AcquireLicense',
                    'httpRequestHeaders': {
                        'X-AxDRM-Message': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ2ZXJzaW9uIjoxLCJjb21fa2V5X2lkIjoiYjMzNjRlYjUtNTFmNi00YWUzLThjOTgtMzNjZWQ1ZTMxYzc4IiwibWVzc2FnZSI6eyJ0eXBlIjoiZW50aXRsZW1lbnRfbWVzc2FnZSIsImtleXMiOlt7ImlkIjoiOWViNDA1MGQtZTQ0Yi00ODAyLTkzMmUtMjdkNzUwODNlMjY2IiwiZW5jcnlwdGVkX2tleSI6ImxLM09qSExZVzI0Y3Iya3RSNzRmbnc9PSJ9XX19.4lWwW46k-oWcah8oN18LPj5OLS5ZU-_AQv7fe0JhNjA'
                    },
                    'httpTimeout': 5000
                }
            },
            testcases: [Constants.TESTCASES.CATEGORIES.PLAYBACK]
        },
        {
            name: '1080p with W3C Clear Key, single key',
            type: 'vod',
            url: 'https://media.axprod.net/TestVectors/v7-MultiDRM-SingleKey/Manifest_1080p_ClearKey.mpd',
            drm: {
                'org.w3.clearkey': {
                    'clearkeys': {
                        'nrQFDeRLSAKTLifXUIPiZg': 'FmY0xnWCPCNaSpRG-tUuTQ'
                    }
                }
            },
            testcases: [Constants.TESTCASES.CATEGORIES.PLAYBACK]
        },
        {
            name: 'livesim2 SCTE35',
            type: 'live',
            url: 'https://livesim2.dashif.org/livesim2/scte35_2/testpic_2s/Manifest.mpd',
            testcases: [Constants.TESTCASES.FEATURE_SUPPORT.EMSG_TRIGGERED],
            testdata: {
                emsg: {
                    minimumNumberOfEvents: 2,
                    runtime: 65000,
                    schemeIdUri: 'urn:scte:scte35:2013:bin'
                }
            }
        },
        {
            name: 'DASH-IF Live Sim - Segment Template without manifest updates',
            type: 'live',
            url: 'https://livesim2.dashif.org/livesim2/testpic_2s/Manifest.mpd',
            testcases: [Constants.TESTCASES.CATEGORIES.PLAYBACK]
        },
        {
            name: 'Segment Timeline with $time$',
            url: 'https://livesim2.dashif.org/livesim2/segtimeline_1/testpic_2s/Manifest.mpd',
            type: 'live',
            testcases: [Constants.TESTCASES.CATEGORIES.PLAYBACK]
        },
        {
            name: 'Segment Timeline with $number$',
            url: 'https://livesim2.dashif.org/livesim2/segtimelinenr_1/testpic_2s/Manifest.mpd',
            type: 'live',
            testcases: [Constants.TESTCASES.CATEGORIES.PLAYBACK]
        },
        {
            name: 'Audio only live',
            url: 'https://livesim2.dashif.org/livesim2/testpic_2s/audio.mpd',
            type: 'live',
            testcases: [Constants.TESTCASES.CATEGORIES.PLAYBACK],
        },
        {
            name: 'MSS',
            type: 'vod',
            url: 'https://playready.directtaps.net/smoothstreaming/SSWSS720H264/SuperSpeedway_720.ism/Manifest',
            testcases: [Constants.TESTCASES.CATEGORIES.PLAYBACK]
        },
        {
            name: 'Shaka Demo Assets: Angel-One Widevine',
            type: 'vod',
            url: 'https://storage.googleapis.com/shaka-demo-assets/angel-one-widevine/dash.mpd',
            testcases: [Constants.TESTCASES.AUDIO.SWITCH],
            drm: {
                'com.widevine.alpha': {
                    serverURL: 'https://cwip-shaka-proxy.appspot.com/no_auth'
                }
            }
        },
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
            testcases: [Constants.TESTCASES.PLAYBACK_ADVANCED.MULTIPERIOD_PLAYBACK],
            excludedTestcases: [Constants.TESTCASES.ADVANCED.NO_RELOAD_AFTER_SEEK]
        },
        {
            'name': 'TTML Segmented Subtitles Live (livesim2)',
            'url': 'https://livesim2.dashif.org/livesim2/testpic_2s/multi_subs.mpd',
            'provider': 'dashif',
            type: 'live',
            testcases: [Constants.TESTCASES.TEXT.SWITCH],
        },
        {
            name: 'Segment Base',
            type: 'vod',
            url: 'https://dash.akamaized.net/dash264/TestCases/1a/sony/SNE_DASH_SD_CASE1A_REVISED.mpd',
            testcases: [Constants.TESTCASES.CATEGORIES.ALL]
        },
    ]
}
