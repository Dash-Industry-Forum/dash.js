import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';
import { hasOwnProperty } from '../../assets/hasownproperty';
import { Metrics, MetricsAVG } from '../types/metric-types';
import {HTTPRequest, Period} from '../types/dashjs-types';

declare var ControlBar: any;
declare var dashjs: any;

/*
 * This service provides a dashjs player object and some helper methods that can be accessed from every component where
 * needed
 */

@Injectable({
  providedIn: 'any'
})
export class PlayerService {

  // tslint:disable-next-line:variable-name
  private readonly _player: any;
  // tslint:disable-next-line:variable-name
  private _defaultSettings: any;
  // tslint:disable-next-line:variable-name
  private _controlBar: any;
  private streamInfo: dashjs.StreamInfo | null | undefined;
  private pendingIndex: { [index: string]: number } = {
    audio: NaN,
    video: NaN
  };
  // tslint:disable-next-line:variable-name
  private _protectionData = {};
  private lastStreamAddr = '';
  // tslint:disable-next-line:variable-name
  private _videoQualities: dashjs.BitrateInfo[] | undefined;
  private metrics: Metrics = {};

  // Observable sources
  private updateProtectionDataCallSource = new Subject<any>();

  // Observable streams
  updateProtectionDataCalled$ = this.updateProtectionDataCallSource.asObservable();

  constructor() {

    // Create player instance and setup listeners for player events
    this._player = dashjs.MediaPlayer().create();
    this._defaultSettings = JSON.parse(JSON.stringify(this._player.getSettings()));
    this._player.on(dashjs.MediaPlayer.events.PERIOD_SWITCH_COMPLETED, (e: any) => {
      this.streamInfo = e.toStreamInfo;
    });
    this._player.on(dashjs.MediaPlayer.events.QUALITY_CHANGE_REQUESTED, (e: any) => {
      this.pendingIndex[e.mediaType] = e.newQuality + 1;
    });
    this._player.on(dashjs.MediaPlayer.events.STREAM_INITIALIZED, () => {
      this._videoQualities = this._player.getBitrateInfoListFor('video');
    });
  }

  /** Getter for dashjs player object */
  get player(): any {
    return this._player;
  }

  /** Getter for dashjs default settings */
  get defaultSettings(): any {
    return this._defaultSettings;
  }

  /** Getter for control bar object */
  get controlBar(): {} {
    return this._controlBar;
  }

  /** Get video qualities array */
  get videoQualities(): dashjs.BitrateInfo[] | undefined {
    return this._videoQualities;
  }

  /** Get protection data */
  get protectionData(): object {
    return this._protectionData;
  }

  /** Initialize player and akamai toolbar */
  initialize(view?: HTMLElement, source?: string, autoPlay?: boolean): void {
    this._player.initialize(view, source, autoPlay);
    this._controlBar = new ControlBar(this._player);
    this._controlBar.initialize();
  }

  /** Attach view to player and initialize akamai toolbar */
  attachView(element: HTMLElement): void {
    this._player.attachView(element);
    this._controlBar = new ControlBar(this._player);
    this._controlBar.initialize();
  }

  /** Stop player by unloading source */
  stop(): void {
    this._player.attachSource('');
    this._controlBar.reset();
    this._videoQualities = undefined;
  }

  /** Load source */
  load(streamAddr?: string): void {
    if (!streamAddr) {
      streamAddr = this.lastStreamAddr;
    }
    else {
      this.lastStreamAddr = streamAddr;
    }

    this._player.attachSource(streamAddr);
  }

  /** Set Protection Data */
  setProtectionData(data: object): void {
    this._player.setProtectionData(data as dashjs.ProtectionDataSet);
    this._protectionData = data;
    this.updateProtectionDataCallSource.next(this._protectionData);
  }

  /** Provide metrics to be displayed in live chart */
  getMetrics(recalculate: boolean = false): Metrics {

    if (!recalculate) {
      return this.metrics;
    }

    if (!this.streamInfo) {
      this.metrics = {};
      return this.metrics;
    }

    const dashMetrics: dashjs.DashMetrics = this._player.getDashMetrics();
    const dashAdapter: dashjs.DashAdapter = this._player.getDashAdapter();
    const period: (Period | null) = dashAdapter.getPeriodById(this.streamInfo.id);
    const periodIndex = period ? period.index : this.streamInfo.index;

    // Define metricsMediaTypes with const assertion to get type safe object keys
    const metricsMediaTypes = ['audio', 'video'] as const;

    // Iterate over metrics media types
    for (const type of metricsMediaTypes) {

      const repSwitch = dashMetrics.getCurrentRepresentationSwitch(type);

      // Buffer Length
      if (!this.metrics.bufferLevel) {
        this.metrics.bufferLevel = {};
      }
      this.metrics.bufferLevel[type] = dashMetrics.getCurrentBufferLevel(type);
      ////

      // Bitrate Downloading
      if (repSwitch && typeof repSwitch === 'object' && hasOwnProperty(repSwitch, 'to')
        && typeof repSwitch.to === 'string') {

        if (!this.metrics.bitrateDownload) {
          this.metrics.bitrateDownload = {};
        }
        this.metrics.bitrateDownload[type] = Math.round(dashAdapter.getBandwidthForRepresentation(repSwitch.to,
          periodIndex) / 1000);
      }
      ////

      // Quality Index
      if (!this.metrics.qualityIndex) {
        this.metrics.qualityIndex = {};
      }
      this.metrics.qualityIndex[type] = {
        current: this._player.getQualityFor(type),
        max: dashAdapter.getMaxIndexForBufferType(type, periodIndex)
      };
      ////

      // Quality Index Pending
      if (!this.metrics.qualityIndexPending) {
        this.metrics.qualityIndexPending = {};
      }
      this.metrics.qualityIndexPending[type] = this.pendingIndex[type];
      ////

      // Dropped Frames (video only)
      if (type === 'video') {
        if (!this.metrics.droppedFrames) {
          this.metrics.droppedFrames = {};
        }
        this.metrics.droppedFrames[type] = dashMetrics.getCurrentDroppedFrames()?.droppedFrames ?? 0;
      }
      ////

      // HTTP Metrics
      const httpRequests = dashMetrics.getHttpRequests(type) as Array<HTTPRequest>;
      const httpMetrics = this.calculateHTTPMetrics(type, httpRequests);

      if (httpMetrics) {

        if (!this.metrics.latency) {
          this.metrics.latency = {};
        }
        this.metrics.latency[type] = httpMetrics.latency;

        if (!this.metrics.segDownloadTime) {
          this.metrics.segDownloadTime = {};
        }
        this.metrics.segDownloadTime[type] = httpMetrics.segDownloadTime;

        if (!this.metrics.playbackDownloadTimeRatio) {
          this.metrics.playbackDownloadTimeRatio = {};
        }
        this.metrics.playbackDownloadTimeRatio[type] = httpMetrics.playbackDownloadTimeRatio;
      }
      ////
    }

    // Live Latency (stream)
    if (!this.metrics.liveLatency) {
      this.metrics.liveLatency = {};
    }
    this.metrics.liveLatency.stream = this._player.getCurrentLiveLatency();
    ////

    return this.metrics;
  }

  calculateHTTPMetrics(type: 'audio' | 'video', requests: Array<HTTPRequest>): { latency: MetricsAVG,
                                                                        segDownloadTime: MetricsAVG,
                                                                        playbackDownloadTimeRatio: MetricsAVG } | null {

    let latency: MetricsAVG;
    let segDownloadTime: MetricsAVG;
    let playbackDownloadTimeRatio: MetricsAVG;

    const requestWindow = requests.slice(-20).filter( req => req.responsecode >= 200 && req.responsecode < 300
                                                              && req.type === 'MediaSegment' && req._stream === type
                                                              && !!req._mediaduration ).slice(-4);

    if (requestWindow.length > 0) {

      // latency times in ms
      const latencyTimes = requestWindow.map( req => Math.abs(req.tresponse.getTime() - req.trequest.getTime()));

      latency = {
        min: latencyTimes.reduce((l, r) => l < r ? l : r),
        avg: latencyTimes.reduce((l, r) => l + r) / latencyTimes.length,
        max: latencyTimes.reduce((l, r) => l < r ? r : l)
      };

      // download times in ms
      const downloadTimes = requestWindow.map(req => Math.abs(req._tfinish.getTime() - req.tresponse.getTime()));

      segDownloadTime = {
        min: downloadTimes.reduce((l, r) => l < r ? l : r),
        avg: downloadTimes.reduce((l, r) => l + r) / downloadTimes.length,
        max: downloadTimes.reduce((l, r) => l < r ? r : l)
      };

      // duration times in ms
      const durationTimes = requestWindow.map(req => req._mediaduration * 1000);

      playbackDownloadTimeRatio = {
        min: durationTimes.reduce((l, r) => l < r ? l : r) / segDownloadTime.max,
        avg: (durationTimes.reduce((l, r) => l + r) / downloadTimes.length) / segDownloadTime.avg,
        max: durationTimes.reduce((l, r) => l < r ? r : l) / segDownloadTime.min
      };

      return {
        latency,
        segDownloadTime,
        playbackDownloadTimeRatio
      };

    }

    return null;
  }

  toggleFullscreen(): void{
    const video = document.getElementById('videoPlayer');
    const videoContainer = video?.parentNode;
    // tslint:disable-next-line: prefer-const
    let altBrowserEnterFullscreen = videoContainer as HTMLVideoElement & {
      msRequestFullscreen(): Promise<void>;
      mozRequestFullscreen(): Promise<void>;
      webkitRequestFullscreen(): Promise<void>;
    };

    const altBrowserExitFullscreen = document as Document & {
      msExitFullscreen(): Promise<void>;
      mozCancelFullscreen(): Promise<void>;
      webkitExitFullscreen(): Promise<void>;
    };

    // let videoController = document.getElementById('videoPlayer');


    // LOOK UP WHAT THE CONTROLBAR FULLSCREEN METHOD IS DOING DIFFERENT!

    if (!document.fullscreenElement){
      if (altBrowserEnterFullscreen.requestFullscreen){
        altBrowserEnterFullscreen.requestFullscreen();
      }
      else if (altBrowserEnterFullscreen.msRequestFullscreen){
        altBrowserEnterFullscreen.msRequestFullscreen();
      }
      else if (altBrowserEnterFullscreen.mozRequestFullscreen){
        altBrowserEnterFullscreen.mozRequestFullscreen();
      }
      else if (altBrowserEnterFullscreen.webkitRequestFullscreen){
        altBrowserEnterFullscreen.webkitRequestFullscreen();
      }
      // videoController?.classList.add('video-controller-fullscreen');
    }

    else {
      if (altBrowserExitFullscreen.exitFullscreen){
        altBrowserExitFullscreen.exitFullscreen();
      }
      else if (altBrowserExitFullscreen.msExitFullscreen){
        altBrowserExitFullscreen.msExitFullscreen();
      }
      else if (altBrowserExitFullscreen.mozCancelFullscreen){
        altBrowserExitFullscreen.mozCancelFullscreen();
      }
      else if (altBrowserExitFullscreen.webkitExitFullscreen){
        altBrowserExitFullscreen.webkitExitFullscreen();
      }
      // videoController?.classList.remove('video-controller-fullscreen');
    }

  }

  muteVideo(): void{
      // trigger onMuteClick from assets/akamai\controlbar/controlbar.js
      document.getElementById('muteBtn')?.click();
  }

  toggleMuteBtnState = () => {
        const span = document.getElementById('iconMute');
        if (span !== null) {
        if (this.player.isMuted()) {
            span.classList.remove('icon-mute-off');
            span.classList.add('icon-mute-on');
        } else {
            span.classList.remove('icon-mute-on');
            span.classList.add('icon-mute-off');
        }
        }
    }
}
