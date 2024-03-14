const TESTCASES = {
    CATEGORIES: {
        ALL: 'category_all',
        ADVANCED: 'category_advanced',
        AUDIO: 'category_audio',
        BUFFER: 'category_buffer',
        FEATURE_SUPPORT: 'category_feature_support',
        LIVE: 'category_live',
        PLAYBACK: 'category_playback',
        PLAYBACK_ADVANCED: 'category_playback_advanced',
        TEXT: 'category_text',
        VENDOR: 'category_vendor',
        VIDEO: 'category_video'
    },
    ADVANCED: {},
    AUDIO: {},
    BUFFER: {},
    FEATURE_SUPPORT: {},
    LIVE: {},
    PLAYBACK: {},
    PLAYBACK_ADVANCED: {},
    TEXT: {},
    VENDOR: {},
    VIDEO: {},
    REQUIRED_CAPABILITIES: {}
};

const TEST_TIMEOUT_THRESHOLDS = {
    IS_PLAYING: 5000,
    IS_PROGRESSING: 10000,
    IS_NOT_PROGRESSING: 3000,
    TO_REACH_TARGET_OFFSET: 10000,
    EVENT_WAITING_TIME: 10000,
    BUFFER_CLEANUP: 45000,
    TARGET_DELAY_REACHED: 20000,
    ENDED_EVENT_OFFSET: 2000,
    IS_FINISHED_OFFSET_TO_DURATION: 5000
};

const TEST_INPUTS = {
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
    MPD_ANCHOR: {
        NUMBER_OF_RANDOM_ATTACHES: 3,
        VOD_RANDOM_SUBTRACT_OFFSET: 5,
        LIVE_RANDOM_POSIX_DELAY: 20,
        LIVE_TOLERANCE: 5
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
};

const CONTENT_TYPES = {
    VOD: 'vod',
    LIVE: 'live'
};

const SEGMENT_TYPES = {
    INIT: 'InitializationSegment',
    MEDIA: 'MediaSegment'
};

const DRM_SYSTEMS = {
    WIDEVINE: 'com.widevine.alpha',
    PLAYREADY: 'com.microsoft.playready'
};

const exportedObject = {
    DASH_JS: {
        MEDIA_TYPES: {
            AUDIO: 'audio',
            VIDEO: 'video',
            TEXT: 'text'
        }
    },
    TESTCASES: TESTCASES,
    TEST_TIMEOUT_THRESHOLDS: TEST_TIMEOUT_THRESHOLDS,
    TEST_INPUTS: TEST_INPUTS,
    CONTENT_TYPES: CONTENT_TYPES,
    SEGMENT_TYPES: SEGMENT_TYPES,
    DRM_SYSTEMS: DRM_SYSTEMS
};

TESTCASES.ADVANCED.NO_RELOAD_AFTER_SEEK = TESTCASES.CATEGORIES.ADVANCED + '_no_reload_after_seek';
TESTCASES.ADVANCED.SEEK_IN_GAPS = TESTCASES.CATEGORIES.ADVANCED + '_seek_in_gaps';

TESTCASES.AUDIO.INITIAL = TESTCASES.CATEGORIES.AUDIO + '_initial';
TESTCASES.AUDIO.SWITCH = TESTCASES.CATEGORIES.AUDIO + '_switch';

TESTCASES.BUFFER.CLEANUP = TESTCASES.CATEGORIES.BUFFER + '_cleanup';
TESTCASES.BUFFER.INITIAL_TARGET = TESTCASES.CATEGORIES.BUFFER + '_initial_target';
TESTCASES.BUFFER.TARGET = TESTCASES.CATEGORIES.BUFFER + '_target';

TESTCASES.FEATURE_SUPPORT.EMSG_TRIGGERED = TESTCASES.CATEGORIES.FEATURE_SUPPORT + '_emsg_triggered';

TESTCASES.LIVE.CATCHUP = TESTCASES.CATEGORIES.LIVE + '_catchup';
TESTCASES.LIVE.DELAY = TESTCASES.CATEGORIES.LIVE + '_delay';


TESTCASES.PLAYBACK.ENDED = TESTCASES.CATEGORIES.PLAYBACK + '_ended';
TESTCASES.PLAYBACK.PAUSE = TESTCASES.CATEGORIES.PLAYBACK + '_pause';
TESTCASES.PLAYBACK.PLAY = TESTCASES.CATEGORIES.PLAYBACK + '_play';
TESTCASES.PLAYBACK.SEEK = TESTCASES.CATEGORIES.PLAYBACK + '_seek';

TESTCASES.PLAYBACK_ADVANCED.ATTACH_AT_NON_ZERO = TESTCASES.CATEGORIES.PLAYBACK_ADVANCED + '_attach_at_non_zero';
TESTCASES.PLAYBACK_ADVANCED.ATTACH_WITH_POSIX = TESTCASES.CATEGORIES.PLAYBACK_ADVANCED + '_simple_attach_with_posix';
TESTCASES.PLAYBACK_ADVANCED.MPD_ANCHOR = TESTCASES.CATEGORIES.PLAYBACK_ADVANCED + '_mpd_anchor';
TESTCASES.PLAYBACK_ADVANCED.MULTIPERIOD_PLAYBACK = TESTCASES.CATEGORIES.PLAYBACK_ADVANCED + '_multiperiod_playback';

TESTCASES.TEXT.SWITCH = TESTCASES.CATEGORIES.TEXT + '_switch_text';

TESTCASES.VENDOR.GOOGLE_AD_MANAGER_EMSG = TESTCASES.CATEGORIES.VENDOR + '_google_ad_manager_emsg';

TESTCASES.VIDEO.SWITCH = TESTCASES.CATEGORIES.VIDEO + '_switch_video';

export default exportedObject;