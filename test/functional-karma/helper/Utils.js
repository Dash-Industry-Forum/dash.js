import Constants from '../helper/Constants';
import content from '../config/content';


class Utils {

    static getTestvectorsForTestcase(testcase) {
        return content.filter((item) => {
            return Utils._filterNonIncluded(item, testcase)
        })
    }

    static _filterNonIncluded(item, testcase) {
        if (!item.testcases) {
            return false;
        }

        // Vendor Testcases have to be explicitly enabled
        if (testcase.includes(Constants.TESTCASES.VENDOR.PREFIX)) {
            return item.testcases.indexOf(Constants.TESTCASES.GENERIC.VENDOR_ALL) !== -1 || item.testcases.indexOf(testcase) !== -1
        }

        if (item.excludedTestcases && item.excludedTestcases.indexOf(testcase) !== -1) {
            return false;
        }
        if (item.testcases.indexOf(Constants.TESTCASES.GENERIC.ALL) !== -1) {
            return true;
        }
        if ((testcase.includes(Constants.TESTCASES.ADVANCED.PREFIX) && item.testcases.indexOf(Constants.TESTCASES.GENERIC.ADVANCED_ALL) !== -1)
            || (testcase.includes(Constants.TESTCASES.SIMPLE.PREFIX) && item.testcases.indexOf(Constants.TESTCASES.GENERIC.SIMPLE_ALL) !== -1)) {
            return true;
        }
        return item.testcases && item.testcases.indexOf(testcase) !== -1;
    }

    static _filterByRequiredCapabilities() {

    }

}

export default Utils
