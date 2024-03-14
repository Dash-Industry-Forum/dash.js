import Constants from '../src/Constants.js';
import fullConfig from '../config/test-configurations/full.conf.js'
import singleConfig from '../config/test-configurations/single.conf.js'
import smokeConfig from '../config/test-configurations/smoke.conf.js'
import fullConfigPartOne from '../config/test-configurations/full_part_1.conf.js'
import fullConfigPartTwo from '../config/test-configurations/full_part_2.conf.js'
import fullConfigPartThree from '../config/test-configurations/full_part_3.conf.js'

class Utils {

    static getTestvectorsForTestcase(testcaseCategory, testcase) {
        if (!testcaseCategory || !testcase) {
            throw new Error('Wrong input data provided for getTestvectorsForTestcase, testcaseCategory or testcase missing')
        }

        if (testcase.indexOf(testcaseCategory) === -1) {
            throw new Error(`Probably wrong testcase category defined for testcase ${testcase}`)
        }

        const content = Utils.getTestConfig();
        return content.filter((testConfig) => {
            return Utils._filterNonIncluded(testConfig, testcaseCategory, testcase)
        })
    }

    static getTestConfig() {
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
            case 'full_part_1':
                return fullConfigPartOne()
            case 'full_part_2':
                return fullConfigPartTwo()
            case 'full_part_3':
                return fullConfigPartThree()
            default:
                return []
        }
    }

    static _filterNonIncluded(item, testcaseCategory, testcase) {
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
            if (item.testcases && item.testcases.indexOf(category) !== -1 && testcaseCategory === category && testcase.includes(category)) {
                return true
            }
        });
    }

}

export default Utils
