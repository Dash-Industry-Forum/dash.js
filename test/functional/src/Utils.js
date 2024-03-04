import Constants from '../src/Constants.js';
import fullConfig from '../config/test-configurations/full.conf.js'
import singleConfig from '../config/test-configurations/single.conf.js'
import smokeConfig from '../config/test-configurations/smoke.conf.js'

class Utils {

    static getTestvectorsForTestcase(testcase) {
        const content = Utils.getContent();
        return content.filter((item) => {
            return Utils._filterNonIncluded(item, testcase)
        })
    }

    static getContent() {
        const settings = window.__karma__.config.settings

        if (!settings || !settings.testconfig) {
            return []
        }

        switch (settings.testconfig) {
            case 'full':
                return fullConfig()
            case 'single':
                return singleConfig()
            case 'smoke':
                return smokeConfig()
            default:
                return []
        }
    }

    static _filterNonIncluded(item, testcase) {
        if (!item.testcases) {
            return false;
        }

        if (item.excludedTestcases && item.excludedTestcases.indexOf(testcase) !== -1) {
            return false;
        }

        if (item.testcases.indexOf(Constants.TESTCASES.CATEGORIES.ALL) !== -1) {
            return true;
        }

        if (item.testcases && item.testcases.indexOf(testcase) !== -1) {
            return true
        }

        return Object.values(Constants.TESTCASES.CATEGORIES).some((category) => {
            if (item.testcases && item.testcases.indexOf(category) !== -1 && testcase.includes(category)) {
                return true
            }
        });
    }

}

export default Utils
