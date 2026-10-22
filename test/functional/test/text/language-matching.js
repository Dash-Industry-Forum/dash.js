import Constants from '../../src/Constants.js';
import Utils from '../../src/Utils.js';
import {expect} from 'chai'
import {
    checkIsProgressing,
    checkNoCriticalErrors,
    initializeDashJsAdapterWithoutAttachSource
} from '../common/common.js';

const TESTCASE = Constants.TESTCASES.TEXT.LANGUAGE_MATCHING;
const {AUDIO, TEXT} = Constants.DASH_JS.MEDIA_TYPES;

// Language preferences and the track language they are expected to select, per stream.
// Streams not listed here are skipped, the expectations depend on the available @lang values.
const CASES = {
    // audio: en, en-AU, et-ET; text: en, zh-Hant-CN, nl, ru, es
    'https://media.axprod.net/TestVectors/v7-MultiDRM-SingleKey/Manifest_1080p_ClearKey.mpd': [
        {type: AUDIO, lang: 'en-AU', expected: 'en-AU', step: 'exact match'},
        {type: AUDIO, lang: 'et', expected: 'et-ET', step: 'more specific track'},
        {type: AUDIO, lang: 'est', expected: 'et-ET', step: 'normalization'},
        {type: AUDIO, lang: 'en-GB', expected: 'en', step: 'less specific track'},
        {type: AUDIO, lang: 'et-EE', expected: 'et-ET', step: 'same primary language'},
        {type: AUDIO, lang: ['et', 'fr'], expected: 'et-ET', step: 'array'},
        {type: AUDIO, lang: /^et/, expected: 'et-ET', step: 'RegExp'},
        {type: TEXT, lang: 'zh', expected: 'zh-Hant-CN', step: 'more specific track'},
        {type: TEXT, lang: 'nl-NL', expected: 'nl', step: 'less specific track'},
        {type: TEXT, lang: 'spa', expected: 'es', step: 'normalization'}
    ],
    // text: 44 languages including zh-Hans, zh-Hant, nb-NO, no
    'https://storage.googleapis.com/shaka-demo-assets/sintel-many-subs/dash.mpd': [
        {type: TEXT, lang: 'zh-Hant-TW', expected: 'zh-Hant', step: 'longest less specific track'},
        {type: TEXT, lang: 'zh-Hans-CN', expected: 'zh-Hans', step: 'longest less specific track'},
        {type: TEXT, lang: 'nb', expected: 'nb-NO', step: 'more specific track'},
        {type: TEXT, lang: 'nor', expected: 'no', step: 'normalization'}
    ]
};

Utils.getTestvectorsForTestcase(TESTCASE).filter((item) => CASES[item.url]).forEach((item) => {
    const mpd = item.url;

    describe(`${TESTCASE} - ${item.name} - ${mpd}`, () => {

        let playerAdapter;

        afterEach(() => {
            if (playerAdapter) {
                try {
                    checkNoCriticalErrors(playerAdapter);
                } finally {
                    playerAdapter.destroy();
                    playerAdapter = null;
                }
            }
        })

        CASES[mpd].forEach(({type, lang, expected, step}) => {
            it(`${type} lang ${lang} selects ${expected} (${step})`, async () => {
                playerAdapter = initializeDashJsAdapterWithoutAttachSource(item);
                playerAdapter.setInitialMediaSettingsFor(type, {lang});
                playerAdapter.attachSource(mpd);
                await checkIsProgressing(playerAdapter);
                expect(playerAdapter.getCurrentTrackFor(type).lang).to.be.equal(expected);
            });
        });
    })
})
