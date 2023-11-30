import Constants from '../helper/Constants.js';

const NETWORK_CODE = '51636543';
const CUSTOM_ASSET_KEY = 'dash-pod-serving-manifest-1';
const SCHEME_ID_URI = 'https://developer.apple.com/streaming/emsg-id3';
const POD_DURATION = 90000;
const VAST_EVENTS_TO_VERIFY = {}

try {
    VAST_EVENTS_TO_VERIFY[google.ima.dai.api.StreamEvent.Type.STARTED] = {
        position: 0
    };
    VAST_EVENTS_TO_VERIFY[google.ima.dai.api.StreamEvent.Type.FIRST_QUARTILE] = {
        position: 1
    };
    VAST_EVENTS_TO_VERIFY[google.ima.dai.api.StreamEvent.Type.MIDPOINT] = {
        position: 2
    };
    VAST_EVENTS_TO_VERIFY[google.ima.dai.api.StreamEvent.Type.THIRD_QUARTILE] = {
        position: 3
    };
    VAST_EVENTS_TO_VERIFY[google.ima.dai.api.StreamEvent.Type.COMPLETE] = {
        position: 4
    };
}
catch(e) {
    console.log(e);
}


class GoogleAdManagerAdapter {
    constructor(playerAdapter) {
        this.playerAdapter = playerAdapter;
        this.adUiElement = document.getElementById('ad-ui');
        this.streamManager = null;
        this.streamData = null;
        this.adData = {}
        this._onEmsgEvent = this._onEmsgEvent.bind(this);
        this._onVastEvent = this._onVastEvent.bind(this);
    }

    reset() {
        this.streamManager = null;
        this.streamData = null;
        this.playerAdapter.unregisterEvent(SCHEME_ID_URI, this._onEmsgEvent);
        this.adData = {}
    }

    init() {
        const videoElement = this.playerAdapter.getVideoElement();
        this.streamManager = new google.ima.dai.api.StreamManager(videoElement, this.adUiElement);
        this.playerAdapter.registerEvent(SCHEME_ID_URI, this._onEmsgEvent);
    }

    registerVastEventListener() {
        this.streamManager.addEventListener(Object.keys(VAST_EVENTS_TO_VERIFY),
            this._onVastEvent, false);
    }

    _onVastEvent(event) {
        console.log(`Received ${event.type} event at playback time ${this.playerAdapter.getCurrentTime()}`);
        switch (event.type) {
            case google.ima.dai.api.StreamEvent.Type.STARTED:
            case google.ima.dai.api.StreamEvent.Type.FIRST_QUARTILE:
            case google.ima.dai.api.StreamEvent.Type.MIDPOINT:
            case google.ima.dai.api.StreamEvent.Type.THIRD_QUARTILE:
            case google.ima.dai.api.StreamEvent.Type.COMPLETE:
                const ad = event.getAd();
                const adId = ad.getAdId();
                const adPodInfo = ad.getAdPodInfo();
                if (!this.adData[adId]) {
                    this.adData[adId] = {
                        events: {},
                        adPodInfo,
                        ad,
                        eventCounter: 0
                    };
                }
                this.adData[adId].events[event.type] = {
                    time: this.playerAdapter.getCurrentTime(),
                    position: this.adData[adId].eventCounter
                }
                this.adData[adId].eventCounter += 1;
            //console.log(`Ad ID ${adId}, Ad ${adPodInfo.getAdPosition()} / ${adPodInfo.getTotalAds()}, Duration: ${ad.getDuration()}s`)
            default:
                break;
        }
    }

    _onEmsgEvent(event) {
        const data = event.event.messageData;
        const pts = event.event.calculatedPresentationTime;
        if ((data instanceof Uint8Array) && data.byteLength > 0) {
            console.log(`Called streamManager.processMetadata using EMSG event at playback time ${this.playerAdapter.getCurrentTime()}`)
            this.streamManager.processMetadata('ID3', data, pts);
        }
    }

    requestStream() {
        return new Promise((resolve, reject) => {
            const streamRequest = new google.ima.dai.api.PodStreamRequest();
            streamRequest.networkCode = NETWORK_CODE;
            streamRequest.customAssetKey = CUSTOM_ASSET_KEY;
            const _onStreamInitialized = (event) => {
                this.streamData = event.getStreamData();
                this.streamManager.removeEventListener(google.ima.dai.api.StreamEvent.Type.STREAM_INITIALIZED, _onStreamInitialized);
                resolve();
            }

            this.streamManager.addEventListener(google.ima.dai.api.StreamEvent.Type.STREAM_INITIALIZED, _onStreamInitialized, false);

            this.streamManager.requestStream(streamRequest);
        })
    }

    getAdData() {
        return this.adData;
    }

    getVastEventsToVerify() {
        return VAST_EVENTS_TO_VERIFY;
    }


    getAdPodManifest() {
        if (!this.streamData) {
            console.log('No stream Data');
            return;
        }

        return this.streamData.getStandalonePodManifestUrl(this._getPodId(),
            POD_DURATION);

    }

    _getPodId() {
        return Math.trunc(new Date().getTime() / 60000);
    }

}

export default GoogleAdManagerAdapter
