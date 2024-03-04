import Constants from '../helper/Constants.js';

export default [
    {
        name: 'Multi audio',
        type: 'vod',
        url: 'http://refapp.hbbtv.org/videos/02_gran_dillama_1080p_ma_25f75g6sv5/manifest.mpd',
        testcases: [Constants.TESTCASES.GENERIC.ALL]
    },
    {
        name: 'Shaka Demo Assets: Angel-One Widevine',
        type: 'vod',
        url: 'https://storage.googleapis.com/shaka-demo-assets/angel-one-widevine/dash.mpd',
        testcases: [Constants.TESTCASES.SIMPLE.SWITCH_AUDIO],
        drm: {
            'com.widevine.alpha': {
                serverURL: 'https://cwip-shaka-proxy.appspot.com/no_auth'
            }
        }
    },
]


