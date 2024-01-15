
/** Interfaces for metrics data provided by player.service */
export interface MetricsAVG { min: number; avg: number; max: number; }

export interface Metrics {
  bufferLevel?: { audio?: number, video?: number };
  bitrateDownload?: { audio?: number, video?: number };
  qualityIndex?: {
    audio?: { current: number, max: number },
    video?: { current: number, max: number }
  };
  qualityIndexPending?: { audio?: number, video?: number };
  droppedFrames?: { video?: number };
  latency?: {
    audio?: MetricsAVG,
    video?: MetricsAVG
  };
  liveLatency?: { stream?: number };
  segDownloadTime?: {
    audio?: MetricsAVG,
    video?: MetricsAVG
  };
  playbackDownloadTimeRatio?: {
    audio?: MetricsAVG,
    video?: MetricsAVG
  };
}


/** Interface for selectable metric options */
export interface MetricOption {
  name: string;                                 // Display name
  description: string;                          // Tooltip description
  type: 'a' | 'v' | 'av' | 'stream';            // Metric can belong to audio only, video only, audio and video, stream
  unit?: 's' | 'ms' | 'kbps'
  key: string;                                  // Key to access metric in Metric object
  chartInfo?: string;                           // Add info to metric name in chart. Eg unit.
}
