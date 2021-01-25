export default {
    LEVELS: {
        SUGGESTION: 'Suggestion',
        WARNING: 'Warning',
        ERROR: 'Error'
    },
    EVENTS: {
        NO_UTC_TIMING_ELEMENT: {
            key: 'NO_UTC_TIMING_ELEMENT',
            message: 'No UTCTiming element is present in the manifest. You may experience playback failures. For a detailed validation use https://conformance.dashif.org/'
        },
        NON_COMPLIANT_SMPTE_IMAGE_ATTRIBUTE: {
            key: 'NON_COMPLIANT_SMPTE_IMAGE_ATTRIBUTE',
            message: 'SMPTE 2052-1:2013 defines the attribute name as "imageType" and does not define "imagetype"'
        }
    }
};
