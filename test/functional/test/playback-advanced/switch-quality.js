import Constants from '../../src/Constants.js';
import Utils from '../../src/Utils.js';
import {expect} from 'chai'
import {checkIsPlaying, checkIsProgressing, checkNoCriticalErrors, initializeDashJsAdapter} from '../common/common.js';

const TESTCASE = Constants.TESTCASES.PLAYBACK_ADVANCED.SWITCH_QUALITY;
let playerAdapter;

Utils.getTestvectorsForTestcase(TESTCASE).forEach((item) => {
    const mpd = item.url;

    describe(`${TESTCASE} - ${item.name} -${mpd}`, () => {


        before(() => {
            playerAdapter = initializeDashJsAdapter(item, mpd);
        })

        after(() => {
            playerAdapter.destroy();
        })

        it(`Checking playing state`, async () => {
            await checkIsPlaying(playerAdapter, true)
        })

        it(`Checking progressing state`, async () => {
            await checkIsProgressing(playerAdapter)
        });


        it(`Switch video qualities`, async () => {
            await _executeSwitchesForMediaType(Constants.DASH_JS.MEDIA_TYPES.VIDEO);
        });

        it(`Switch audio qualities`, async () => {
            await _executeSwitchesForMediaType(Constants.DASH_JS.MEDIA_TYPES.AUDIO);
        });

        it(`Expect no critical errors to be thrown`, () => {
            checkNoCriticalErrors(playerAdapter)
        })
    })
})

async function _executeSwitchesForMediaType(type) {
    const availableRepresentations = playerAdapter.getRepresentationsByType(type);
    for (let testrun = 0; testrun < Constants.TEST_INPUTS.SWITCH_QUALITY.TESTRUNS_PER_TYPE; testrun++) {
        for (let i = 0; i < availableRepresentations.length; i++) {
            const representation = availableRepresentations[i];

            playerAdapter.setRepresentationForTypeById(representation.mediaInfo.type, representation.id);

            const currentRepresentation = playerAdapter.getCurrentRepresentationForType(type);
            expect(currentRepresentation.id).to.be.equal(representation.id);

            await checkIsProgressing(playerAdapter)
        }
    }

}
