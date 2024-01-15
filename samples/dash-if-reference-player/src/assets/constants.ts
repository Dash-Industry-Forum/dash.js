
export const constants = {
  logLevel : {
    NONE: false,
    FATAL: false,
    ERROR: false,
    WARNING: true,
    INFO: false,
    DEBUG: false
  },

  movingAverageMethod : {
    slidingWindow: true,
    ewma: false
  },

  aBRStrategy : {
    abrDynamic: true,
    abrBola: false,
    abrL2A: false,
    abrLoLP: false,
    abrThroughput: false
  },

  fetchThroughputCalculationMode : {
    abrFetchThroughputCalculationDownloadedData: true,
    abrFetchThroughputCalculationMoofParsing: false
  },

  liveCatchup: {
    mode : {
      liveCatchupModeDefault: true,
      liveCatchupModeLoLP: false
    },
  },

  trackSwitchMode : {
    audio: {
      alwaysReplace: true,
      neverReplace: false
    },
    video: {
      alwaysReplace: false,
      neverReplace: true
    }
  },

  selectionModeForInitialTrack : {
    highestBitrate: true,
    widestRange: false
  },

  audio: {
    alwaysReplace: true,
    neverReplace: false
  },
};
