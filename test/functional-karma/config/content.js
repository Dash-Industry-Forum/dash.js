import Constants from '../helper/Constants';

export default [
    {
        name: 'Segment Base',
        type: 'vod',
        url: 'https://dash.akamaized.net/dash264/TestCases/1a/sony/SNE_DASH_SD_CASE1A_REVISED.mpd',
        testcases: [Constants.TESTCASES.GENERIC.ALL]
    },
    {
        name: 'Segment Template, number based',
        type: 'vod',
        url: 'https://dash.akamaized.net/akamai/bbb_30fps/bbb_30fps.mpd',
        testcases: [Constants.TESTCASES.GENERIC.ALL]
    },
    {
        name: 'Segment Timeline, time based',
        type: 'vod',
        url: 'https://dash.akamaized.net/dash264/TestCases/2c/qualcomm/1/MultiResMPEG2.mpd',
        testcases: [Constants.TESTCASES.GENERIC.ALL]
    },
    {
        name: 'TTML segmented subtitles',
        type: 'vod',
        url: 'https://livesim2.dashif.org/vod/testpic_2s/multi_subs.mpd',
        testcases: [Constants.TESTCASES.GENERIC.ALL]
    },
    {
        name: 'Multi audio',
        type: 'vod',
        url: 'http://refapp.hbbtv.org/videos/02_gran_dillama_1080p_ma_25f75g6sv5/manifest.mpd',
        testcases: [Constants.TESTCASES.GENERIC.ALL]
    },
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
        testcases: [Constants.TESTCASES.GENERIC.ALL]
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
        testcases: [Constants.TESTCASES.GENERIC.ALL]
    },
    {
        name: 'Big Buck Bunny',
        type: 'vod',
        url: 'https://dash.akamaized.net/akamai/bbb_30fps/bbb_30fps.mpd',
        testcases: [Constants.TESTCASES.GENERIC.ALL]
    },
    {
        name: 'External VTT',
        type: 'vod',
        url: 'https://dash.akamaized.net/akamai/test/caption_test/ElephantsDream/elephants_dream_480p_heaac5_1_https.mpd',
        testcases: [Constants.TESTCASES.GENERIC.ALL],
    },
    {
        name: 'CEA-608 + TTML',
        type: 'vod',
        url: 'https://livesim2.dashif.org/vod/testpic_2s/cea608_and_segs.mpd',
        testcases: [Constants.TESTCASES.GENERIC.ALL],
    },
    {
        name: 'Shaka Demo Assets: Angel-One Widevine',
        type: 'vod',
        url: 'https://storage.googleapis.com/shaka-demo-assets/angel-one-widevine/dash.mpd',
        testcases: [Constants.TESTCASES.GENERIC.ALL],
        drm: {
            'com.widevine.alpha': {
                serverURL: 'https://cwip-shaka-proxy.appspot.com/no_auth'
            }
        }
    },
    {
        name: 'MSS',
        type: 'vod',
        url: 'http://playready.directtaps.net/smoothstreaming/SSWSS720H264/SuperSpeedway_720.ism/Manifest',
        testcases: [Constants.TESTCASES.GENERIC.ALL]
    },
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
    },
    {
        name: 'Axinom 3 Audio 3 Text',
        type: 'vod',
        url: 'https://media.axprod.net/TestVectors/Cmaf/clear_1080p_h264/manifest.mpd',
        testcases: [Constants.TESTCASES.GENERIC.ALL]
    },
    {
        name: 'BBC Testcard',
        type: 'vod',
        url: 'https://rdmedia.bbc.co.uk/testcard/vod/manifests/avc-full.mpd',
        testcases: [Constants.TESTCASES.GENERIC.ALL]
    },
    {
        name: 'DASH-IF Live Sim - Segment Template without manifest updates',
        type: 'live',
        url: 'https://livesim2.dashif.org/livesim2/testpic_2s/Manifest.mpd',
        testcases: [Constants.TESTCASES.GENERIC.ALL]
    },
    {
        url: 'https://livesim2.dashif.org/livesim2/segtimeline_1/testpic_2s/Manifest.mpd',
        name: 'Segment Timeline with $time$',
        type: 'live',
        testcases: [Constants.TESTCASES.GENERIC.ALL]
    },
    {
        url: 'https://livesim2.dashif.org/livesim2/segtimelinenr_1/testpic_2s/Manifest.mpd',
        name: 'Segment Timeline with $number$',
        type: 'live',
        testcases: [Constants.TESTCASES.GENERIC.ALL]
    },
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
    {
        name: 'CEA-608 + TTML - Live',
        type: 'live',
        url: 'https://livesim2.dashif.org/livesim2/testpic_2s/cea608_and_segs.mpd',
        testcases: [Constants.TESTCASES.GENERIC.ALL],
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

