/**
 * dash.js Samples - Player Utilities
 *
 * Shared helper functions for creating and configuring dash.js player instances.
 * Eliminates duplicated player setup code and ControlBar HTML across samples.
 *
 * Usage:
 *   <script src="../common/player-utils.js"></script>
 *   <script data-sample>
 *       const { player, video } = DashjsSamples.createPlayer('video', url);
 *   </script>
 */

// eslint-disable-next-line no-unused-vars
const DashjsSamples = (function () {
    'use strict';

    /**
     * Create a basic dash.js player attached to a video/audio element.
     *
     * @param {string} selector - CSS selector for the video/audio element
     * @param {string} url - MPD URL to load
     * @param {boolean} [autoplay=true] - Whether to autoplay
     * @param {object} [settings={}] - Optional dash.js settings to apply
     * @returns {{ player: object, video: HTMLMediaElement }}
     */
    function createPlayer(selector, url, autoplay = true, settings = {}) {
        const video = document.querySelector(selector);
        const player = dashjs.MediaPlayer().create();

        if (Object.keys(settings).length > 0) {
            player.updateSettings(settings);
        }

        player.initialize(video, url, autoplay);
        return { player, video };
    }

    /**
     * Create a dash.js player with the Akamai ControlBar UI.
     *
     * This injects the ControlBar HTML markup into the specified container,
     * initializes the player, and sets up the ControlBar widget.
     *
     * Requires:
     *   - ControlBar.js loaded via <script> tag
     *   - controlbar.css loaded via <link> tag
     *
     * @param {string} containerSelector - CSS selector for the player container
     * @param {string} url - MPD URL to load
     * @param {object} [options={}] - Configuration options
     * @param {boolean} [options.autoplay=true] - Whether to autoplay
     * @param {boolean} [options.thumbnails=false] - Include thumbnail container
     * @param {boolean} [options.ttmlRenderingDiv=false] - Include TTML rendering div
     * @param {object} [options.settings={}] - dash.js settings to apply
     * @returns {{ player: object, video: HTMLVideoElement, controlbar: object }}
     */
    function createPlayerWithControlBar(containerSelector, url, options = {}) {
        const container = document.querySelector(containerSelector);
        const {
            autoplay = true,
            thumbnails = false,
            ttmlRenderingDiv = false,
            settings = {}
        } = options;

        container.innerHTML = getControlBarMarkup({ thumbnails, ttmlRenderingDiv });

        const video = container.querySelector('video');
        const player = dashjs.MediaPlayer().create();

        if (ttmlRenderingDiv) {
            const ttmlDiv = container.querySelector('#ttml-rendering-div');
            if (ttmlDiv) {
                player.attachTTMLRenderingDiv(ttmlDiv);
            }
        }

        if (Object.keys(settings).length > 0) {
            player.updateSettings(settings);
        }

        player.initialize(video, url, autoplay);

        const controlbar = new ControlBar(player);
        controlbar.initialize();

        return { player, video, controlbar };
    }

    /**
     * Generate the ControlBar HTML markup.
     * This replaces the ~25 lines of HTML that was duplicated across samples.
     *
     * @param {object} [options={}]
     * @param {boolean} [options.thumbnails=false]
     * @param {boolean} [options.ttmlRenderingDiv=false]
     * @returns {string} HTML string
     */
    function getControlBarMarkup({ thumbnails = false, ttmlRenderingDiv = false } = {}) {
        const ttmlHtml = ttmlRenderingDiv
            ? '<div id="ttml-rendering-div"></div>'
            : '';

        const thumbnailHtml = thumbnails
            ? `<div id="thumbnail-container" class="thumbnail-container">
                   <div id="thumbnail-elem" class="thumbnail-elem"></div>
                   <div id="thumbnail-time-label" class="thumbnail-time-label"></div>
               </div>`
            : '';

        return `
            <div class="videoContainer" id="videoContainer">
                <video preload="auto" autoplay></video>
                ${ttmlHtml}
                <div id="videoController" class="video-controller unselectable">
                    <div id="playPauseBtn" class="btn-play-pause" title="Play/Pause">
                        <span id="iconPlayPause" class="icon-play"></span>
                    </div>
                    <span id="videoTime" class="time-display">00:00:00</span>
                    <div id="fullscreenBtn" class="btn-fullscreen control-icon-layout" title="Fullscreen">
                        <span class="icon-fullscreen-enter"></span>
                    </div>
                    <div id="bitrateListBtn" class="control-icon-layout" title="Bitrate List">
                        <span class="icon-bitrate"></span>
                    </div>
                    <input type="range" id="volumebar" class="volumebar" value="1" min="0" max="1" step=".01"/>
                    <div id="muteBtn" class="btn-mute control-icon-layout" title="Mute">
                        <span id="iconMute" class="icon-mute-off"></span>
                    </div>
                    <div id="trackSwitchBtn" class="control-icon-layout" title="A/V Tracks">
                        <span class="icon-tracks"></span>
                    </div>
                    <div id="captionBtn" class="btn-caption control-icon-layout" title="Closed Caption">
                        <span class="icon-caption"></span>
                    </div>
                    <span id="videoDuration" class="duration-display">00:00:00</span>
                    <div class="seekContainer">
                        <div id="seekbar" class="seekbar seekbar-complete">
                            <div id="seekbar-buffer" class="seekbar seekbar-buffer"></div>
                            <div id="seekbar-play" class="seekbar seekbar-play"></div>
                        </div>
                    </div>
                    ${thumbnailHtml}
                </div>
            </div>`;
    }

    // Public API
    return {
        createPlayer,
        createPlayerWithControlBar,
        getControlBarMarkup
    };
})();
