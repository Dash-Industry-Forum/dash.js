import Constants from '../src/Constants.js';

class Utils {

    static getTestvectorsForTestcase(testcase) {
        console.log(window.__karma__.config.metadata)
        const content = [];
        return content.filter((item) => {
            return Utils._filterNonIncluded(item, testcase)
        })
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
