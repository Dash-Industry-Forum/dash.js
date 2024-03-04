import Constants from '../helper/Constants.js';

export default [
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
]


