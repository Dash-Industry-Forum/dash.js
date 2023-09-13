export default {
    DASH_JS: {
        MEDIA_TYPES: {
            AUDIO: 'audio',
            VIDEO: 'video',
            TEXT: 'text'
        }
    },
    TESTCASES: {
        ADVANCED: {
            NO_RELOAD_AFTER_SEEK: 'advanced_no_reload_after_seek',
            SEEK_IN_GAPS: 'advanced_seek_in_gaps',
            PREFIX: 'advanced_'
        },
        SIMPLE: {
            PLAY: 'simple_play',
            PAUSE: 'simple_pause',
            SEEK: 'simple_seek',
            ENDED: 'simple_ended',
            SWITCH_AUDIO: 'simple_switch_audio',
            SWITCH_VIDEO: 'simple_switch_video',
            SWITCH_TEXT: 'simple_switch_text',
            ATTACH_AT_NON_ZERO: 'simple_attach_at_non_zero',
            MULTIPERIOD_PLAYBACK: 'simple_multiperiod_playback',
            EMSG_TRIGGERED: 'simple_emsg_triggered',
            INITIAL_BUFFER_TARGET: 'simple_initial_buffer_target',
            BUFFER_CLEANUP: 'simple_buffer_cleanup',
            LIVE_DELAY: 'simple_live_delay',
            LIVE_CATCHUP: 'simple_live_catchup',
            ATTACH_WITH_POSIX: 'simple_attach_with_posix',
            PREFIX: 'simple_'
        },
        VENDOR: {
            GOOGLE_AD_MANAGER_EMSG: 'vendor_google_ad_manager_emsg',
            PREFIX: 'vendor_'
        },
        GENERIC: {
            ALL: 'all_testcases',
            SIMPLE_ALL: 'all_simple_testcases',
            ADVANCED_ALL: 'all_advanced_testcases',
            VENDOR_ALL: 'all_vendor_testcases'
        },
        REQUIRED_CAPABILITIES: {}
    },
    TEST_TIMEOUT_THRESHOLDS: {
        IS_PLAYING: 5000,
        IS_PROGRESSING: 10000,
        IS_NOT_PROGRESSING: 3000,
        TO_REACH_TARGET_OFFSET: 10000,
        EVENT_WAITING_TIME: 10000,
        BUFFER_CLEANUP: 45000,
        TARGET_DELAY_REACHED: 20000,
        ENDED_EVENT_OFFSET: 2000,
        IS_FINISHED_OFFSET_TO_DURATION: 5000
    },
    TEST_INPUTS: {
        GENERAL: {
            MINIMUM_PROGRESS_WHEN_PLAYING: 0.5,
            MAXIMUM_PROGRESS_WHEN_PAUSED: 0,
            MAXIMUM_ALLOWED_SEEK_DIFFERENCE: 0.5,
            MAXIMUM_ALLOWED_SEEK_DIFFERENCE_LIVE_EDGE: 2,
        },
        SEEK: {
            NUMBER_OF_RANDOM_SEEKS: 3,
            VOD_RANDOM_SEEK_DURATION_SUBTRACT_OFFSET: 5
        },
        ENDED: {
            SEEK_END_OFFSET: 8,
        },
        NO_RELOAD_AFTER_SEEK: {
            TIME_TO_REACH_FOR_REDUNDANT_SEGMENT_FETCH: 10,
            TIME_TO_SEEK_BACK_FOR_REDUNDANT_SEGMENT_FETCH: 2,
            OFFSET_TO_REACH_WHEN_PLAYING: 2
        },
        SEEK_IN_GAPS: {
            OFFSET_BEFORE_GAP: 0.1,
            OFFSET_BEFORE_END_GAP: 0.1,
            MAXIMUM_ALLOWED_PLAYING_DIFFERENCE_TO_GAP_END: 0.5,
        },
        ATTACH_AT_NON_ZERO: {
            NUMBER_OF_RANDOM_ATTACHES: 3,
            VOD_RANDOM_ATTACH_SUBTRACT_OFFSET: 5,
            LIVE_RANDOM_ATTACH_SUBTRACT_OFFSET: 5
        },
        INITIAL_BUFFER_TARGET: {
            VALUE: 10,
            TOLERANCE: 1,
        },
        BUFFER_CLEANUP: {
            INTERVAL: 2,
            TO_KEEP: 10,
            TOLERANCE: 3
        },
        LIVE_DELAY: {
            VALUE: 10,
            TOLERANCE: 2
        },
        LATENCY_CATCHUP: {
            DELAY: 12,
            TOLERANCE: 0.1
        },
        ATTACH_WITH_POSIX: {
            DELAY: 30,
            TOLERANCE: 5
        }
    },
    CONTENT_TYPES: {
        VOD: 'vod',
        LIVE: 'live'
    },
    SEGMENT_TYPES: {
        INIT: 'InitializationSegment',
        MEDIA: 'MediaSegment'
    },
    DRM_SYSTEMS: {
        WIDEVINE: 'com.widevine.alpha',
        PLAYREADY: 'com.microsoft.playready'
    }
}
