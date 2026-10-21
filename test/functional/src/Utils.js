import CoreUtils from '../../../src/core/Utils.js'

class Utils {

    static getTestvectorsForTestcase(testcase) {
        const testvectors = window.__karma__.config.testvectors

        if (!testvectors || testvectors.length === 0) {
            return []
        }

        const targetTestvectors = [];
        const lastIndex = testcase.lastIndexOf('/')
        const category = lastIndex >= 0 ? testcase.substring(0, lastIndex) + '/*' : ''

        testvectors.forEach((rawTestvector) => {

            if (Utils._shouldPlatformBeExcluded(rawTestvector.excludedPlatforms)) {
                return
            }

            const testvector = Utils._applyPlatformOverrides(rawTestvector)
            const includedTestfiles = testvector.includedTestfiles || []
            const excludedTestfiles = testvector.excludedTestfiles || []

            const isIncluded = includedTestfiles.length === 0 ||
                includedTestfiles.indexOf('all') >= 0 ||
                includedTestfiles.indexOf(testcase) >= 0 ||
                includedTestfiles.indexOf(category) >= 0
            const isExcluded = excludedTestfiles.indexOf(testcase) >= 0

            if (isIncluded && !isExcluded) {
                targetTestvectors.push(testvector)
            }
        })

        return targetTestvectors
    }

    /**
     * Applies per-browser overrides defined in a testvector's "platformOverrides" array.
     * Each entry has a "browser" name and the attributes to override, e.g. a "drm" block
     * that is deep-merged into the testvector's protection data.
     * Returns a clone when an override matches so the shared karma config is not mutated.
     */
    static _applyPlatformOverrides(testvector) {
        if (!testvector.platformOverrides || testvector.platformOverrides.length <= 0) {
            return testvector
        }

        const userAgent = CoreUtils.parseUserAgent(navigator.userAgent)
        const matchingOverrides = testvector.platformOverrides.filter((override) => {
            return override && override.browser && override.browser.toLowerCase() === userAgent.browser.name.toLowerCase()
        })

        if (matchingOverrides.length === 0) {
            return testvector
        }

        const overriddenTestvector = CoreUtils.clone(testvector)
        matchingOverrides.forEach((override) => {
            if (override.drm) {
                overriddenTestvector.drm = CoreUtils.mixin(overriddenTestvector.drm || {}, override.drm, CoreUtils.clone)
            }
            if (override.settings) {
                overriddenTestvector.settings = CoreUtils.mixin(overriddenTestvector.settings || {}, override.settings, CoreUtils.clone)
            }
        })

        return overriddenTestvector
    }

    static _shouldPlatformBeExcluded(excludedPlatforms) {
        if (!excludedPlatforms || excludedPlatforms.length <= 0) {
            return false
        }

        const userAgent = CoreUtils.parseUserAgent(navigator.userAgent)
        return excludedPlatforms.some((platform) => {
            return platform && platform.browser && platform.browser.toLowerCase() === userAgent.browser.name.toLowerCase()
        })

    }
}

export default Utils
