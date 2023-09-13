import Constants from '../helper/Constants';

export default [
    {
        'url': 'https://dash.akamaized.net/akamai/test/caption_test/ElephantsDream/elephants_dream_480p_heaac5_1_https.mpd',
        'name': 'External VTT subtitle file',
        'provider': 'dashif',
        type: 'vod',
        testcases: [Constants.TESTCASES.SIMPLE.SWITCH_TEXT],
    },
    {
        'name': 'TTML Segmented Subtitles VoD',
        'url': 'https://livesim2.dashif.org/dash/vod/testpic_2s/multi_subs.mpd',
        'provider': 'dashif',
        type: 'vod',
        testcases: [Constants.TESTCASES.SIMPLE.SWITCH_TEXT],
    },
    {
        'name': 'TTML Segmented Subtitles Live (livesim2)',
        'url': 'https://livesim2.dashif.org/livesim2/testpic_2s/multi_subs.mpd',
        'provider': 'dashif',
        type: 'live',
        testcases: [Constants.TESTCASES.SIMPLE.SWITCH_TEXT],
    },
    {
        'name': 'TTML Sideloaded XML Subtitles',
        'url': 'https://livesim2.dashif.org/dash/vod/testpic_2s/xml_subs.mpd',
        'provider': 'dashif',
        type: 'vod',
        testcases: [Constants.TESTCASES.SIMPLE.SWITCH_TEXT],
    },
    {
        'name': 'Embedded CEA-608 Closed Captions',
        'url': 'https://livesim2.dashif.org/dash/vod/testpic_2s/cea608.mpd',
        'provider': 'dashif',
        type: 'vod',
        testcases: [Constants.TESTCASES.SIMPLE.SWITCH_TEXT],
    },
    {
        'name': 'Embedded CEA-608 Closed Captions (livesim2)',
        'url': 'https://livesim2.dashif.org/livesim2/testpic_2s/cea608.mpd',
        'provider': 'dashif',
        type: 'live',
        testcases: [Constants.TESTCASES.SIMPLE.SWITCH_TEXT],
    },
    {
        'name': 'Embedded CEA-608 Closed Captions and TTML segments VoD',
        'url': 'https://livesim2.dashif.org/dash/vod/testpic_2s/cea608_and_segs.mpd',
        'provider': 'dashif',
        type: 'vod',
        testcases: [Constants.TESTCASES.SIMPLE.SWITCH_TEXT],
    },
    {
        'name': 'Embedded CEA-608 Closed Captions and TTML segments Live (livesim2)',
        'url': 'https://livesim2.dashif.org/livesim2/testpic_2s/cea608_and_segs.mpd',
        'provider': 'dashif',
        type: 'live',
        testcases: [Constants.TESTCASES.SIMPLE.SWITCH_TEXT],
    },
    {
        'url': 'https://livesim2.dashif.org/dash/vod/testpic_2s/imsc1_img.mpd',
        'name': 'IMSC1 (CMAF) Image Subtitles',
        'moreInfo': 'https://livesim2.dashif.org/dash/vod/testpic_2s/imsc1_img_subs_info.html',
        'provider': 'dashif',
        type: 'vod',
        testcases: [Constants.TESTCASES.SIMPLE.SWITCH_TEXT],
    },
    {
        'name': 'TTML Image Subtitles embedded (VoD)',
        'url': 'https://livesim2.dashif.org/dash/vod/testpic_2s/img_subs.mpd',
        'moreInfo': 'https://livesim2.dashif.org/dash/vod/testpic_2s/img_subs_info.html',
        'provider': 'dashif',
        type: 'vod',
        testcases: [Constants.TESTCASES.SIMPLE.SWITCH_TEXT],
    },
    {
        'name': 'TTML Segmented \'snaking\' subtitles (with random text) (Ondemand)',
        'url': 'https://rdmedia.bbc.co.uk/elephants_dream/1/client_manifest-snake.mpd',
        'moreInfo': 'https://rdmedia.bbc.co.uk/elephants_dream/',
        'provider': 'bbc',
        type: 'vod',
        testcases: [Constants.TESTCASES.SIMPLE.SWITCH_TEXT],
    },
    {
        'name': 'BBC R&D EBU-TT-D Subtitling Test',
        'url': 'https://rdmedia.bbc.co.uk/elephants_dream/1/client_manifest-all.mpd',
        'moreInfo': 'https://rdmedia.bbc.co.uk/elephants_dream/',
        'provider': 'bbc',
        type: 'vod',
        testcases: [Constants.TESTCASES.SIMPLE.SWITCH_TEXT],
    },
    {
        'url': 'https://dash.akamaized.net/dash264/CTA/imsc1/IT1-20171027_dash.mpd',
        'name': 'IMSC1 Text Subtitles via sidecar file',
        'provider': 'cta',
        type: 'vod',
        testcases: [Constants.TESTCASES.SIMPLE.SWITCH_TEXT],
    },
    {
        'url': 'https://storage.googleapis.com/shaka-demo-assets/sintel-many-subs/dash.mpd',
        'name': 'Shaka 44 different subtitles',
        type: 'vod',
        testcases: [Constants.TESTCASES.SIMPLE.SWITCH_TEXT],
    }
]


