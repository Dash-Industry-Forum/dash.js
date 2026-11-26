/**
 * What the settings UI cannot infer from the default values in src/core/Settings.js.
 *
 * A new setting needs no entry here: it shows up in the UI with a control chosen from the type
 * of its default value. Add an entry only to
 *   - give a setting a fixed list of choices (`options`),
 *   - declare the type of a setting whose default is null, or an array that is empty or does
 *     not hold strings (`types`),
 *   - list it in the "Common" view (`common`),
 *   - fix the spelling of a category name (`categoryLabels`).
 */

const TRACK_SWITCH_MODES = [
    { value: 'alwaysReplace', label: 'alwaysReplace' },
    { value: 'neverReplace', label: 'neverReplace' }
];

const SETTINGS_OVERRIDES = {

    types: {
        'streaming.buffer.fastSwitchEnabled': 'nullableBoolean',
        'streaming.liveCatchup.enabled': 'nullableBoolean',
        'streaming.cmcd.sid': 'string',
        'streaming.cmcd.cid': 'string',
        'streaming.cmcd.rtp': 'number',
        'streaming.cmcd.eventTargets': 'json',
        'streaming.cmcd.customKeys': 'json',
        'streaming.dvbReporting.reportingUrl': 'string',
        // Holds regular expressions, which a text field cannot represent
        'streaming.capabilities.supportedEssentialProperties': 'readonly'
    },

    options: {
        'debug.logLevel': [
            { value: 0, label: 'NONE' },
            { value: 1, label: 'FATAL' },
            { value: 2, label: 'ERROR' },
            { value: 3, label: 'WARNING' },
            { value: 4, label: 'INFO' },
            { value: 5, label: 'DEBUG' }
        ],
        'streaming.liveCatchup.mode': [
            { value: 'liveCatchupModeDefault', label: 'Default' },
            { value: 'liveCatchupModeLoLP', label: 'LoL+ based' },
            { value: 'liveCatchupModeStep', label: 'Step based' }
        ],
        'streaming.trackSwitchMode.audio': TRACK_SWITCH_MODES,
        'streaming.trackSwitchMode.video': TRACK_SWITCH_MODES,
        'streaming.selectionModeForInitialTrack': [
            { value: 'lowestStartupDelay', label: 'lowestStartupDelay' },
            { value: 'highestBitrate', label: 'highestBitrate' },
            { value: 'firstTrack', label: 'firstTrack' },
            { value: 'highestEfficiency', label: 'highestEfficiency' },
            { value: 'widestRange', label: 'widestRange' }
        ],
        'streaming.abr.throughput.averageCalculationMode': [
            { value: 'throughputCalculationModeEwma', label: 'EWMA' },
            { value: 'throughputCalculationModeZlema', label: 'ZLEMA' },
            { value: 'throughputCalculationModeArithmeticMean', label: 'Arithmetic mean' },
            { value: 'throughputCalculationModeByteSizeWeightedArithmeticMean', label: 'Arithmetic mean, byte size weighted' },
            { value: 'throughputCalculationModeDateWeightedArithmeticMean', label: 'Arithmetic mean, date weighted' },
            { value: 'throughputCalculationModeHarmonicMean', label: 'Harmonic mean' },
            { value: 'throughputCalculationModeByteSizeWeightedHarmonicMean', label: 'Harmonic mean, byte size weighted' },
            { value: 'throughputCalculationModeDateWeightedHarmonicMean', label: 'Harmonic mean, date weighted' }
        ],
        'streaming.abr.throughput.lowLatencyDownloadTimeCalculationMode': [
            { value: 'lowLatencyDownloadTimeCalculationModeMoofParsing', label: 'Moof parsing' },
            { value: 'lowLatencyDownloadTimeCalculationModeDownloadedData', label: 'Downloaded data' },
            { value: 'lowLatencyDownloadTimeCalculationModeAast', label: 'AAST' }
        ],
        'streaming.cmcd.mode': [
            { value: 'query', label: 'query' },
            { value: 'headers', label: 'headers' }
        ],
        'streaming.cmcd.version': [
            { value: 1, label: '1' },
            { value: 2, label: '2' }
        ]
    },

    // The settings the previous options panel exposed
    common: [
        'debug.logLevel',
        'streaming.applyServiceDescription',
        'streaming.applyContentSteering',
        'streaming.saveLastMediaSettingsForCurrentStreamingSession',
        'streaming.timeShiftBuffer.calcFromSegmentTimeline',
        'streaming.delay.liveDelay',
        'streaming.delay.liveDelayFragmentCount',
        'streaming.delay.useSuggestedPresentationDelay',
        'streaming.buffer.fastSwitchEnabled',
        'streaming.buffer.reuseExistingSourceBuffers',
        'streaming.buffer.mediaSourceDurationInfinity',
        'streaming.buffer.resetSourceBuffersForTrackSwitch',
        'streaming.buffer.stallThreshold',
        'streaming.buffer.lowLatencyStallThreshold',
        'streaming.gaps.jumpGaps',
        'streaming.utcSynchronization.artificialTimeOffsetToApply',
        'streaming.scheduling.scheduleWhilePaused',
        'streaming.text.defaultEnabled',
        'streaming.text.imsc.enableRollUp',
        'streaming.text.imsc.displayForcedOnlyMode',
        'streaming.liveCatchup.enabled',
        'streaming.liveCatchup.mode',
        'streaming.liveCatchup.maxDrift',
        'streaming.liveCatchup.liveThreshold',
        'streaming.liveCatchup.step.start.min',
        'streaming.liveCatchup.step.start.max',
        'streaming.liveCatchup.step.stop.min',
        'streaming.liveCatchup.step.stop.max',
        'streaming.lastBitrateCachingInfo.enabled',
        'streaming.lastMediaSettingsCachingInfo.enabled',
        'streaming.trackSwitchMode.audio',
        'streaming.trackSwitchMode.video',
        'streaming.abr.autoSwitchBitrate.video',
        'streaming.abr.initialBitrate.video',
        'streaming.abr.minBitrate.video',
        'streaming.abr.maxBitrate.video',
        'streaming.abr.rules.throughputRule.active',
        'streaming.abr.rules.bolaRule.active',
        'streaming.abr.rules.insufficientBufferRule.active',
        'streaming.abr.rules.switchHistoryRule.active',
        'streaming.abr.rules.droppedFramesRule.active',
        'streaming.abr.rules.abandonRequestsRule.active',
        'streaming.abr.rules.l2ARule.active',
        'streaming.abr.rules.loLPRule.active',
        'streaming.cmcd.enabled',
        'streaming.cmcd.version',
        'streaming.cmcd.mode',
        'streaming.cmcd.sid',
        'streaming.cmcd.cid',
        'streaming.cmcd.rtp',
        'streaming.cmcd.rtpSafetyFactor',
        'streaming.cmcd.enabledKeys',
        'streaming.cmcd.includeInRequests',
        'streaming.cmsd.enabled',
        'streaming.cmsd.abr.applyMb',
        'streaming.cmsd.abr.etpWeightRatio',
        'streaming.enhancement.enabled'
    ],

    categoryLabels: {
        abr: 'ABR',
        cmcd: 'CMCD',
        cmsd: 'CMSD',
        dvbReporting: 'DVB Reporting',
        defaultSchemeIdUri: 'Default Scheme ID URI',
        utcSynchronization: 'UTC Synchronization'
    }
};

export default SETTINGS_OVERRIDES;
