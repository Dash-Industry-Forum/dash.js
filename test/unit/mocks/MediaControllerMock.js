class MediaControllerMock {

    constructor() {
        this.setup();
    }

    setup() {
        this.initialSettings = {};
        this.switchMode = {};
        this.selectionMode = undefined;
        this.track  = undefined;
    }

    /**
     * @param {string} type
     * @param {StreamInfo} streamInfo
     * @memberof MediaController#
     */
    checkInitialMediaSettingsForType(type, streamInfo) {}

    /**
     * @param {MediaInfo} track
     * @memberof MediaController#
     */
    addTrack(track) {}

    /**
     * @param {string} type
     * @param {StreamInfo} streamInfo
     * @returns {Array}
     * @memberof MediaController#
     */
    getTracksFor() {
        return ['track1', 'track2'];
    }

    /**
     * @param {string} type
     * @param {StreamInfo} streamInfo
     * @returns {Object|null}
     * @memberof MediaController#
     */
    getCurrentTrackFor() {
        return 'track';
    }

    /**
     * @param {MediaInfo} track
     * @returns {boolean}
     * @memberof MediaController#
     */
    isCurrentTrack(track) {
        return (track === this.track);
    }

    /**
     * @param {MediaInfo} track
     * @memberof MediaController#
     */
    setTrack(track) {
        if (!track) return;
        this.track = track;
    }

    /**
     * @param {string} type
     * @param {Object} value
     * @memberof MediaController#
     */
    setInitialSettings(type, value) {
        if (!type || !value) return;

        this.initialSettings[type] = value;
    }

    /**
     * @param {string} type
     * @returns {Object|null}
     * @memberof MediaController#
     */
    getInitialSettings(type) {
        if (!type) return null;

        return this.initialSettings[type];
    }

    /**
     * @param {string} type
     * @param {string} mode
     * @memberof MediaController#
     */
    setSwitchMode(type, mode) {
        this.switchMode[type] = mode;
    }

    /**
     * @param {string} type
     * @returns {string} mode
     * @memberof MediaController#
     */
    getSwitchMode(type) {
        return this.switchMode[type];
    }

    /**
     * @param {string} mode
     * @memberof MediaController#
     */
    setSelectionModeForInitialTrack(mode) {
        this.selectionMode = mode;
    }

    getSelectionModeForInitialTrack() {
        return this.selectionMode;
    }

    isMultiTrackSupportedByType(type) {
        return (type === 'audio' || type === 'video' || type === 'text' || type === 'fragmentedText');
    }

    isTracksEqual() {
        return false;
    }

    setConfig() {}

    reset() {
        this.setup();
    }

}
export default MediaControllerMock;
