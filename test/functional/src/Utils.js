import {UAParser} from 'ua-parser-js'

class Utils {

    static getTestvectorsForTestcase(testcase) {
        const testvectors = window.__karma__.config.testvectors

        if (!testvectors || testvectors.length === 0) {
            return []
        }

        const targetTestvectors = [];
        testvectors.forEach((testvector) => {

            if (Utils._shouldPlatformBeExcluded(testvector.excludedPlatforms)) {
                return
            }

            // Nothing to be filtered
            if ((!testvector.includedTestfiles || testvector.includedTestfiles.length === 0) && (!testvector.excludedTestfiles || testvector.excludedTestfiles.length === 0)) {
                targetTestvectors.push(testvector)
            }

            // Testvector explicitly included either concretely or per category
            else if (testvector.includedTestfiles && testvector.includedTestfiles.length > 0) {
                if (testvector.includedTestfiles.indexOf(testcase) >= 0) {
                    targetTestvectors.push(testvector);
                } else {
                    const lastIndex = testcase.lastIndexOf('/');
                    const category = testcase.substring(0, lastIndex) + '/*';
                    if (testvector.includedTestfiles.indexOf(category) >= 0) {
                        targetTestvectors.push(testvector);
                    }
                }
            }

            // All testfiles included and the current testcase not explicitly excluded
            else if (
                (testvector.includedTestfiles
                    && testvector.includedTestfiles.length > 0
                    && testvector.includedTestfiles.indexOf('all') >= 0
                )
                &&
                (!testvector.excludedTestfiles
                    || testvector.excludedTestfiles.length === 0
                    || testvector.excludedTestfiles.indexOf(testcase) === -1
                )
            ) {
                targetTestvectors.push(testvector)
            }
        })

        return targetTestvectors
    }

    static _shouldPlatformBeExcluded(excludedPlatforms) {
        if (!excludedPlatforms || excludedPlatforms.length <= 0) {
            return false
        }

        const userAgent = UAParser(navigator.userAgent.toLowerCase())
        return excludedPlatforms.some((platform) => {
            return platform && platform.browser && platform.browser.toLowerCase() === userAgent.browser.name.toLowerCase()
        })

    }
}

export default Utils
