class MediaControllerMock {

    constructor() {
        this.setup();
    }

    setup() {
        this.initialSettings = {};
        this.switchMode = {};
        this.selectionMode = undefined;
        this.track  = undefined;
        this.tracks = [];
    }

    checkInitialMediaSettingsForType() {}

    addTrack(track) {
        this.tracks.push(track);
    }

    getTracksFor() {
        return this.tracks;
    }

    getCurrentTrackFor() {
        return this.track;
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

    isMultiTrackSupportedByType(type) {
        return (type === 'audio' || type === 'video' || type === 'text');
    }

    isTracksEqual(currentTrack, mediaInfoForType) {
        return (mediaInfoForType.lang === 'deu');
    }

    matchSettings(settings, track) {
        const matchRole = !settings.role || !!track.roles.filter(function (item) {
            return item === settings.role;
        })[0];
        return settings.lang === track.lang && matchRole;
    }

    setConfig() {}

    saveTextSettingsDisabled() {}

    reset() {
        this.setup();
    }

}
export default MediaControllerMock;
