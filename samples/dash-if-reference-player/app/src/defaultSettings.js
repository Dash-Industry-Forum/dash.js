const defaultSettings = {
    debug: {
        logLevel: 3,
        dispatchEvent: false
    },
    streaming: {
        abandonLoadTimeout: 10000,
        wallclockTimeUpdateInterval: 100,
        lowLatencyEnabled: false,
        lowLatencyEnabledByManifest: true,
        manifestUpdateRetryInterval: 100,
        cacheInitSegments: false,
        eventControllerRefreshDelay: 150,
        capabilities: {
            filterUnsupportedEssentialProperties: true,
            useMediaCapabilitiesApi: false
        },
        timeShiftBuffer: {
            calcFromSegmentTimeline: false,
            fallbackToSegmentTimeline: true
        },
        metrics: {
            maxListDepth: 100
        },
        delay: {
            liveDelayFragmentCount: NaN,
            liveDelay: NaN,
            useSuggestedPresentationDelay: true,
            applyServiceDescription: true
        },
        protection: {
            keepProtectionMediaKeys: false,
            ignoreEmeEncryptedEvent: false
        },
        buffer: {
            enableSeekDecorrelationFix: false,
            fastSwitchEnabled: true,
            flushBufferAtTrackSwitch: false,
            reuseExistingSourceBuffers: true,
            bufferPruningInterval: 10,
            bufferToKeep: 20,
            bufferTimeAtTopQuality: 30,
            bufferTimeAtTopQualityLongForm: 60,
            initialBufferLevel: NaN,
            stableBufferTime: 12,
            longFormContentDurationThreshold: 600,
            stallThreshold: 0.3,
            useAppendWindow: true,
            setStallState: true
        },
        gaps: {
            jumpGaps: true,
            jumpLargeGaps: true,
            smallGapLimit: 1.5,
            threshold: 0.3,
            enableSeekFix: true
        },
        utcSynchronization: {
            enabled: true,
            useManifestDateHeaderTimeSource: true,
            backgroundAttempts: 2,
            timeBetweenSyncAttempts: 30,
            maximumTimeBetweenSyncAttempts: 600,
            minimumTimeBetweenSyncAttempts: 2,
            timeBetweenSyncAttemptsAdjustmentFactor: 2,
            maximumAllowedDrift: 100,
            enableBackgroundSyncAfterSegmentDownloadError: true,
            defaultTimingSource: {
                scheme: 'urn:mpeg:dash:utc:http-xsdate:2014',
                value: 'https://time.akamai.com/?iso&ms'
            }
        },
        scheduling: {
            defaultTimeout: 500,
            lowLatencyTimeout: 0,
            scheduleWhilePaused: true
        },
        text: {
            defaultEnabled: true
        },
        liveCatchup: {
            minDrift: 0.02,
            maxDrift: 12,
            playbackRate: 0.5,
            latencyThreshold: 60,
            playbackBufferMin: 0.5,
            enabled: false,
            mode: 'liveCatchupModeDefault'
        },
        lastBitrateCachingInfo: {
            enabled: true,
            ttl: 360000
        },
        lastMediaSettingsCachingInfo: {
            enabled: true,
            ttl: 360000
        },
        cacheLoadThresholds: {
            video: 50,
            audio: 5
        },
        trackSwitchMode: {
            audio: 'alwaysReplace',
            video: 'neverReplace'
        },
        selectionModeForInitialTrack: 'highestSelectionPriority',
        fragmentRequestTimeout: 10000,
        retryIntervals: {
            'MPD': 500,
            'XLinkExpansion': 500,
            'MediaSegment': 1000,
            'InitializationSegment': 1000,
            'BitstreamSwitchingSegment': 1000,
            'IndexSegment': 1000,
            'FragmentInfoSegment': 1000,
            'license': 1000,
            'other': 1000,
            lowLatencyReductionFactor: 10
        },
        retryAttempts: {
            'MPD': 3,
            'XLinkExpansion': 1,  
            'MediaSegment': 3,
            'InitializationSegment': 3,
            'BitstreamSwitchingSegment': 3,
            'IndexSegment': 3,
            'FragmentInfoSegment': 3,
            'license': 3,
            'other': 3,
            lowLatencyMultiplyFactor: 5
        },
        abr: {
            movingAverageMethod: 'slidingWindow',
            ABRStrategy: 'abrDynamic',
            additionalAbrRules: {
                insufficientBufferRule: true,
                switchHistoryRule: true,
                droppedFramesRule: true,
                abandonRequestsRule: false
            },
            bandwidthSafetyFactor: 0.9,
            useDefaultABRRules: true,
            useDeadTimeLatency: true,
            limitBitrateByPortal: false,
            usePixelRatioInLimitBitrateByPortal: false,
            maxBitrate: {
                audio: -1,
                video: -1
            },
            minBitrate: {
                audio: -1,
                video: -1
            },
            maxRepresentationRatio: {
                audio: 1,
                video: 1
            },
            initialBitrate: {
                audio: -1,
                video: -1
            },
            initialRepresentationRatio: {
                audio: -1,
                video: -1
            },
            autoSwitchBitrate: {
                audio: true,
                video: true
            },
            fetchThroughputCalculationMode: 'abrFetchThroughputCalculationMoofParsing'
        },
        cmcd: {
            enabled: false,
            sid: null,
            cid: null,
            rtp: null,
            rtpSafetyFactor: 5,
            mode: 'query'
        }
    },
    errors: {
        recoverAttempts: {
            mediaErrorDecode: 5
        }
    }
};