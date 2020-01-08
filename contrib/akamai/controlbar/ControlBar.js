/**
 * The copyright in this software is being made available under the BSD License,
 * included below. This software may be subject to other third party and contributor
 * rights, including patent rights, and no such rights are granted under this license.
 *
 * Copyright (c) 2013, Dash Industry Forum.
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without modification,
 * are permitted provided that the following conditions are met:
 *  * Redistributions of source code must retain the above copyright notice, this
 *  list of conditions and the following disclaimer.
 *  * Redistributions in binary form must reproduce the above copyright notice,
 *  this list of conditions and the following disclaimer in the documentation and/or
 *  other materials provided with the distribution.
 *  * Neither the name of Dash Industry Forum nor the names of its
 *  contributors may be used to endorse or promote products derived from this software
 *  without specific prior written permission.
 *
 *  THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS AS IS AND ANY
 *  EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 *  WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED.
 *  IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT,
 *  INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT
 *  NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
 *  PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY,
 *  WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
 *  ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
 *  POSSIBILITY OF SUCH DAMAGE.
 */

/**
 * @module ControlBar
 * @param {object=} dashjsMediaPlayer - dashjs reference
 * @param {boolean=} displayUTCTimeCodes - true if time is displayed in UTC format, false otherwise
 */
var ControlBar = function (dashjsMediaPlayer, displayUTCTimeCodes) {

    var player = dashjsMediaPlayer;
    var captionMenu = null;
    var bitrateListMenu = null;
    var trackSwitchMenu = null;
    var menuHandlersList = [];
    var lastVolumeLevel = NaN;
    var seeking = false;
    var videoControllerVisibleTimeout = 0;
    var liveThresholdSecs = 12;
    var video,
        videoContainer,
        videoController,
        playPauseBtn,
        bitrateListBtn,
        captionBtn,
        trackSwitchBtn,
        seekbar,
        seekbarPlay,
        seekbarBuffer,
        muteBtn,
        volumebar,
        fullscreenBtn,
        timeDisplay,
        durationDisplay,
        thumbnailContainer,
        thumbnailElem,
        thumbnailTimeLabel,
        idSuffix,
        startedPlaying;

    //************************************************************************************
    // THUMBNAIL CONSTANTS
    //************************************************************************************
    // Maximum percentage of player height that the thumbnail will fill
    var maxPercentageThumbnailScreen = 0.15;
    // Separation between the control bar and the thumbnail (in px)
    var bottomMarginThumbnail = 10;
    // Maximum scale so small thumbs are not scaled too high
    var maximumScale = 2;

    var initControls = function (suffix) {
        idSuffix = suffix;
        videoController = document.getElementById(getControlId('videoController'));
        playPauseBtn = document.getElementById(getControlId('playPauseBtn'));
        bitrateListBtn = document.getElementById(getControlId('bitrateListBtn'));
        captionBtn = document.getElementById(getControlId('captionBtn'));
        trackSwitchBtn = document.getElementById(getControlId('trackSwitchBtn'));
        seekbar = document.getElementById(getControlId('seekbar'));
        seekbarPlay = document.getElementById(getControlId('seekbar-play'));
        seekbarBuffer = document.getElementById(getControlId('seekbar-buffer'));
        muteBtn = document.getElementById(getControlId('muteBtn'));
        volumebar = document.getElementById(getControlId('volumebar'));
        fullscreenBtn = document.getElementById(getControlId('fullscreenBtn'));
        timeDisplay = document.getElementById(getControlId('videoTime'));
        durationDisplay = document.getElementById(getControlId('videoDuration'));
        thumbnailContainer = document.getElementById(getControlId('thumbnail-container'));
        thumbnailElem = document.getElementById(getControlId('thumbnail-elem'));
        thumbnailTimeLabel = document.getElementById(getControlId('thumbnail-time-label'));
    };

    var getControlId = function (id) {
        return id + (idSuffix ? idSuffix : '');
    };

    //************************************************************************************
    // PLAYBACK
    //************************************************************************************

    var togglePlayPauseBtnState = function () {
        if (player.isPaused()) {
            setPlayBtn();
        } else {
            setPauseBtn();
        }
    };

    var setPlayBtn = function () {
        var span = document.getElementById(getControlId('iconPlayPause'));
        if (span !== null) {
            span.classList.remove('icon-pause');
            span.classList.add('icon-play');
        }
    };

    var setPauseBtn = function () {
        var span = document.getElementById(getControlId('iconPlayPause'));
        if (span !== null) {
            span.classList.remove('icon-play');
            span.classList.add('icon-pause');
        }
    };

    var onPlayPauseClick = function (/*e*/) {
        togglePlayPauseBtnState.call(this);
        player.isPaused() ? player.play() : player.pause();
    };

    var onPlaybackPaused = function (/*e*/) {
        togglePlayPauseBtnState();
    };

    var onPlayStart = function (/*e*/) {
        setTime(displayUTCTimeCodes ? player.timeAsUTC() : player.time());
        updateDuration();
        togglePlayPauseBtnState();
    };

    var onPlayTimeUpdate = function (/*e*/) {
        updateDuration();
        if (!seeking) {
            setTime(displayUTCTimeCodes ? player.timeAsUTC() : player.time());
            if (seekbarPlay) {
                if (player.isDynamic() && (player.duration() - player.time() < liveThresholdSecs)) {
                    seekbarPlay.style.width = '100%';
                } else {
                    seekbarPlay.style.width = (player.time() / player.duration() * 100) + '%';
                }
            }
            if (seekbarBuffer) {
                seekbarBuffer.style.width = ((player.time() + getBufferLevel()) / player.duration() * 100) + '%';
            }

            if (seekbar.getAttribute('type') === 'range') {
                seekbar.value = player.time();
            }

        }
    };

    var getBufferLevel = function () {
        var dashMetrics = player.getDashMetrics();
        var bufferLevel = 0;
        if (dashMetrics) {
            bufferLevel = dashMetrics.getCurrentBufferLevel('video', true);
            if (!bufferLevel) {
                bufferLevel = dashMetrics.getCurrentBufferLevel('audio', true);
            }
        }
        return bufferLevel;
    };

    //************************************************************************************
    // VOLUME
    //************************************************************************************

    var toggleMuteBtnState = function () {
        var span = document.getElementById(getControlId('iconMute'));
        if (player.isMuted()) {
            span.classList.remove('icon-mute-off');
            span.classList.add('icon-mute-on');
        } else {
            span.classList.remove('icon-mute-on');
            span.classList.add('icon-mute-off');
        }
    };

    var onMuteClick = function (/*e*/) {
        if (player.isMuted() && !isNaN(lastVolumeLevel)) {
            setVolume(lastVolumeLevel);
        } else {
            lastVolumeLevel = parseFloat(volumebar.value);
            setVolume(0);
        }
        player.setMute(player.getVolume() === 0);
        toggleMuteBtnState();
    };

    var setVolume = function (value) {
        if (typeof value === 'number') {
            volumebar.value = value;
        }
        player.setVolume(parseFloat(volumebar.value));
        player.setMute(player.getVolume() === 0);
        if (isNaN(lastVolumeLevel)) {
            lastVolumeLevel = player.getVolume();
        }
        toggleMuteBtnState();
    };

    //************************************************************************************
    // SEEKING
    // ************************************************************************************

    var calculateTimeByEvent = function (event) {
        var seekbarRect = seekbar.getBoundingClientRect();
        return Math.floor(player.duration() * (event.clientX - seekbarRect.left) / seekbarRect.width);
    };

    var onSeeking = function (event) {
        //TODO Add call to seek in trick-mode once implemented. Preview Frames.
        seeking = true;
        var mouseTime = calculateTimeByEvent(event);
        if (seekbarPlay) {
            seekbarPlay.style.width = (mouseTime / player.duration() * 100) + '%';
        }
        setTime(mouseTime);
        document.addEventListener('mousemove', onSeekBarMouseMove, true);
        document.addEventListener('mouseup', onSeeked, true);
    };

    var onSeeked = function (event) {
        seeking = false;
        document.removeEventListener('mousemove', onSeekBarMouseMove, true);
        document.removeEventListener('mouseup', onSeeked, true);

        // seeking
        var mouseTime = calculateTimeByEvent(event);
        if (!isNaN(mouseTime)) {
            mouseTime = mouseTime < 0 ? 0 : mouseTime;
            player.seek(mouseTime);
        }

        onSeekBarMouseMoveOut(event);

        if (seekbarPlay) {
            seekbarPlay.style.width = (mouseTime / player.duration() * 100) + '%';
        }
    };

    var onSeekBarMouseMove = function (event) {
        if (!thumbnailContainer || !thumbnailElem) return;

        // Take into account page offset and seekbar position
        var elem = videoContainer || video;
        var videoContainerRect = elem.getBoundingClientRect();
        var seekbarRect = seekbar.getBoundingClientRect();
        var videoControllerRect = videoController.getBoundingClientRect();

        // Calculate time position given mouse position
        var left = event.clientX - seekbarRect.left;
        var mouseTime = calculateTimeByEvent(event);
        if (isNaN(mouseTime)) return;

        // Update timer and play progress bar if mousedown (mouse click down)
        if (seeking) {
            setTime(mouseTime);
            if (seekbarPlay) {
                seekbarPlay.style.width = (mouseTime / player.duration() * 100) + '%';
            }
        }

        // Get thumbnail information
        player.getThumbnail(mouseTime, function (thumbnail) {
            if (!thumbnail) return;

            // Adjust left variable for positioning thumbnail with regards to its viewport
            left += (seekbarRect.left - videoContainerRect.left);
            // Take into account thumbnail control
            var ctrlWidth = parseInt(window.getComputedStyle(thumbnailElem).width);
            if (!isNaN(ctrlWidth)) {
                left -= ctrlWidth / 2;
            }

            var scale = (videoContainerRect.height * maxPercentageThumbnailScreen) / thumbnail.height;
            if (scale > maximumScale) {
                scale = maximumScale;
            }

            // Set thumbnail control position
            thumbnailContainer.style.left = left + 'px';
            thumbnailContainer.style.display = '';
            thumbnailContainer.style.bottom += Math.round(videoControllerRect.height + bottomMarginThumbnail) + 'px';
            thumbnailContainer.style.height = Math.round(thumbnail.height) + 'px';

            var backgroundStyle = 'url("' + thumbnail.url + '") ' + (thumbnail.x > 0 ? '-' + thumbnail.x : '0') +
                'px ' + (thumbnail.y > 0 ? '-' + thumbnail.y : '0') + 'px';
            thumbnailElem.style.background = backgroundStyle;
            thumbnailElem.style.width = thumbnail.width + 'px';
            thumbnailElem.style.height = thumbnail.height + 'px';
            thumbnailElem.style.transform = 'scale(' + scale + ',' + scale + ')';

            if (thumbnailTimeLabel) {
                thumbnailTimeLabel.textContent = displayUTCTimeCodes ? player.formatUTC(mouseTime) : player.convertToTimeCode(mouseTime);
            }
        });
    };

    var onSeekBarMouseMoveOut = function (/*e*/) {
        if (!thumbnailContainer) return;
        thumbnailContainer.style.display = 'none';
    };

    var getScrollOffset = function () {
        if (window.pageXOffset) {
            return {
                x: window.pageXOffset,
                y: window.pageYOffset
            };
        }
        return {
            x: document.documentElement.scrollLeft,
            y: document.documentElement.scrollTop
        };
    };

    var seekLive = function () {
        player.seek(player.duration());
    };

    //************************************************************************************
    // TIME/DURATION
    //************************************************************************************
    var setDuration = function (value) {
        if (player.isDynamic()) {
            durationDisplay.textContent = '● LIVE';
            if (!durationDisplay.onclick) {
                durationDisplay.onclick = seekLive;
                durationDisplay.classList.add('live-icon');
            }
        } else if (!isNaN(value)) {
            durationDisplay.textContent = displayUTCTimeCodes ? player.formatUTC(value) : player.convertToTimeCode(value);
            durationDisplay.classList.remove('live-icon');
        }
    };

    var setTime = function (value) {
        if (value < 0) {
            return;
        }
        if (player.isDynamic() && player.duration()) {
            var liveDelay = player.duration() - value;
            if (liveDelay < liveThresholdSecs) {
                durationDisplay.classList.add('live');
                timeDisplay.textContent = '';
            } else {
                durationDisplay.classList.remove('live');
                timeDisplay.textContent = '- ' + player.convertToTimeCode(liveDelay);
            }
        } else if (!isNaN(value)) {
            timeDisplay.textContent = displayUTCTimeCodes ? player.formatUTC(value) : player.convertToTimeCode(value);
        }
    };

    var updateDuration = function () {
        var duration = player.duration();
        if (duration !== parseFloat(seekbar.max)) { //check if duration changes for live streams..
            setDuration(displayUTCTimeCodes ? player.durationAsUTC() : duration);
            seekbar.max = duration;
        }
    };

    //************************************************************************************
    // FULLSCREEN
    //************************************************************************************

    var onFullScreenChange = function (/*e*/) {
        var icon;
        if (isFullscreen()) {
            enterFullscreen();
            icon = fullscreenBtn.querySelector('.icon-fullscreen-enter');
            icon.classList.remove('icon-fullscreen-enter');
            icon.classList.add('icon-fullscreen-exit');
        } else {
            exitFullscreen();
            icon = fullscreenBtn.querySelector('.icon-fullscreen-exit');
            icon.classList.remove('icon-fullscreen-exit');
            icon.classList.add('icon-fullscreen-enter');
        }
    };

    var isFullscreen = function () {
        return document.fullscreenElement || document.msFullscreenElement || document.mozFullScreen || document.webkitIsFullScreen;
    };

    var enterFullscreen = function () {
        var element = videoContainer || video;

        if (element.requestFullscreen) {
            element.requestFullscreen();
        } else if (element.msRequestFullscreen) {
            element.msRequestFullscreen();
        } else if (element.mozRequestFullScreen) {
            element.mozRequestFullScreen();
        } else {
            element.webkitRequestFullScreen();
        }
        videoController.classList.add('video-controller-fullscreen');
        window.addEventListener('mousemove', onFullScreenMouseMove);
        onFullScreenMouseMove();
    };

    var onFullScreenMouseMove = function () {
        clearFullscreenState();
        videoControllerVisibleTimeout = setTimeout(function () {
            videoController.classList.add('hide');
        }, 4000);
    };

    var clearFullscreenState = function () {
        clearTimeout(videoControllerVisibleTimeout);
        videoController.classList.remove('hide');
    };

    var exitFullscreen = function () {
        window.removeEventListener('mousemove', onFullScreenMouseMove);
        clearFullscreenState();

        if (document.exitFullscreen) {
            document.exitFullscreen();
        } else if (document.mozCancelFullScreen) {
            document.mozCancelFullScreen();
        } else if (document.msExitFullscreen) {
            document.msExitFullscreen();
        } else {
            document.webkitCancelFullScreen();
        }
        videoController.classList.remove('video-controller-fullscreen');
    };

    var onFullscreenClick = function (/*e*/) {
        if (!isFullscreen()) {
            enterFullscreen();
        } else {
            exitFullscreen();
        }
        if (captionMenu) {
            captionMenu.classList.add('hide');
        }
        if (bitrateListMenu) {
            bitrateListMenu.classList.add('hide');
        }
        if (trackSwitchMenu) {
            trackSwitchMenu.classList.add('hide');
        }
    };

    //************************************************************************************
    // Audio Video MENU
    //************************************************************************************

    var onTracksAdded = function (e) {
        // Subtitles/Captions Menu //XXX we need to add two layers for captions & subtitles if present.
        if (!captionMenu) {
            var contentFunc = function (element, index) {
                if (isNaN(index)) {
                    return 'OFF';
                }

                var label = getLabelForLocale(element.labels);
                if (label) {
                    return label + ' : ' + element.kind;
                }

                return element.lang + ' : ' + element.kind;
            };
            captionMenu = createMenu({ menuType: 'caption', arr: e.tracks }, contentFunc);

            var func = function () {
                onMenuClick(captionMenu, captionBtn);
            }
            menuHandlersList.push(func);
            captionBtn.addEventListener('click', func);
            captionBtn.classList.remove('hide');
        }
    };

    var onSourceInitialized = function () {
        startedPlaying = false;
    };

    var onStreamInitialized = function (/*e*/) {
        updateDuration();
        var contentFunc;
        //Bitrate Menu
        if (bitrateListBtn) {
            destroyBitrateMenu();
            var availableBitrates = { menuType: 'bitrate' };
            availableBitrates.audio = player.getBitrateInfoListFor('audio') || [];
            availableBitrates.video = player.getBitrateInfoListFor('video') || [];
            if (availableBitrates.audio.length > 1 || availableBitrates.video.length > 1) {
                contentFunc = function (element, index) {
                    var result = isNaN(index) ? ' Auto Switch' : Math.floor(element.bitrate / 1000) + ' kbps';
                    result += element && element.width && element.height ? ' (' + element.width + 'x' + element.height + ')' : '';
                    return result;
                };

                bitrateListMenu = createMenu(availableBitrates, contentFunc);
                var func = function () {
                    onMenuClick(bitrateListMenu, bitrateListBtn);
                };
                menuHandlersList.push(func);
                bitrateListBtn.addEventListener('click', func);
                bitrateListBtn.classList.remove('hide');

            } else {
                bitrateListBtn.classList.add('hide');
            }
        }
        //Track Switch Menu
        if (!trackSwitchMenu && trackSwitchBtn) {
            var availableTracks = { menuType: 'track' };
            availableTracks.audio = player.getTracksFor('audio');
            availableTracks.video = player.getTracksFor('video'); // these return empty arrays so no need to check for null

            if (availableTracks.audio.length > 1 || availableTracks.video.length > 1) {
                contentFunc = function (element) {
                    return getLabelForLocale(element.labels) || 'Language: ' + element.lang + ' - Role: ' + element.roles[0];
                };
                trackSwitchMenu = createMenu(availableTracks, contentFunc);
                var func = function () {
                    onMenuClick(trackSwitchMenu, trackSwitchBtn);
                };
                menuHandlersList.push(func);
                trackSwitchBtn.addEventListener('click', func);
                trackSwitchBtn.classList.remove('hide');
            }
        }
    };

    var onStreamTeardownComplete = function (/*e*/) {
        setPlayBtn();
        timeDisplay.textContent = '00:00';
    };

    var createMenu = function (info, contentFunc) {
        var menuType = info.menuType;
        var el = document.createElement('div');
        el.id = menuType + 'Menu';
        el.classList.add('menu');
        el.classList.add('hide');
        el.classList.add('unselectable');
        el.classList.add('menu-item-unselected');
        videoController.appendChild(el);

        switch (menuType) {
            case 'caption':
                el.appendChild(document.createElement('ul'));
                el = createMenuContent(el, getMenuContent(menuType, info.arr, contentFunc), 'caption', menuType + '-list');
                setMenuItemsState(getMenuInitialIndex(info, menuType), menuType + '-list');
                break;
            case 'track':
            case 'bitrate':
                if (info.video.length > 1) {
                    el.appendChild(createMediaTypeMenu('video'));
                    el = createMenuContent(el, getMenuContent(menuType, info.video, contentFunc), 'video', 'video-' + menuType + '-list');
                    setMenuItemsState(getMenuInitialIndex(info.video, menuType, 'video'), 'video-' + menuType + '-list');
                }
                if (info.audio.length > 1) {
                    el.appendChild(createMediaTypeMenu('audio'));
                    el = createMenuContent(el, getMenuContent(menuType, info.audio, contentFunc), 'audio', 'audio-' + menuType + '-list');
                    setMenuItemsState(getMenuInitialIndex(info.audio, menuType, 'audio'), 'audio-' + menuType + '-list');
                }
                break;
        }

        window.addEventListener('resize', handleMenuPositionOnResize, true);
        return el;
    };

    var getMenuInitialIndex = function (info, menuType, mediaType) {
        if (menuType === 'track') {
            var mediaInfo = player.getCurrentTrackFor(mediaType);
            var idx = 0;
            info.some(function (element, index) {
                if (isTracksEqual(element, mediaInfo)) {
                    idx = index;
                    return true;
                }
            });
            return idx;

        } else if (menuType === 'bitrate') {
            var cfg = player.getSettings();
            if (cfg.streaming && cfg.streaming.abr && cfg.streaming.abr.initialBitrate) {
                return cfg.streaming.abr.initialBitrate['mediaType'] | 0;
            }
            return 0;
        } else if (menuType === 'caption') {
            return player.getCurrentTextTrackIndex() + 1;
        }
    };

    var isTracksEqual = function (t1, t2) {
        var sameId = t1.id === t2.id;
        var sameViewpoint = t1.viewpoint === t2.viewpoint;
        var sameLang = t1.lang === t2.lang;
        var sameRoles = t1.roles.toString() === t2.roles.toString();
        var sameAccessibility = t1.accessibility.toString() === t2.accessibility.toString();
        var sameAudioChannelConfiguration = t1.audioChannelConfiguration.toString() === t2.audioChannelConfiguration.toString();

        return (sameId && sameViewpoint && sameLang && sameRoles && sameAccessibility && sameAudioChannelConfiguration);
    };

    var getMenuContent = function (type, arr, contentFunc) {
        var content = [];
        arr.forEach(function (element, index) {
            content.push(contentFunc(element, index));
        });
        if (type !== 'track') {
            content.unshift(contentFunc(null, NaN));
        }
        return content;
    };

    var getBrowserLocale = function () {
        return (navigator.languages && navigator.languages.length) ? navigator.languages : [navigator.language];
    };

    var getLabelForLocale = function (labels) {
        var locales = getBrowserLocale();

        for (var i = 0; i < labels.length; i++) {
            for (var j = 0; j < locales.length; j++) {
                if (labels[i].lang && locales[j] && locales[j].indexOf(labels[i].lang) > -1) {
                    return labels[i].text;
                }
            }
        }

        return labels.length === 1 ? labels[0].text : null;
    };

    var createMediaTypeMenu = function (type) {
        var div = document.createElement('div');
        var title = document.createElement('div');
        var content = document.createElement('ul');

        div.id = type;

        title.textContent = type === 'video' ? 'Video' : 'Audio';
        title.classList.add('menu-sub-menu-title');

        content.id = type + 'Content';
        content.classList.add(type + '-menu-content');

        div.appendChild(title);
        div.appendChild(content);

        return div;
    };

    var createMenuContent = function (menu, arr, mediaType, name) {
        for (var i = 0; i < arr.length; i++) {
            var item = document.createElement('li');
            item.id = name + 'Item_' + i;
            item.index = i;
            item.mediaType = mediaType;
            item.name = name;
            item.selected = false;
            item.textContent = arr[i];

            item.onmouseover = function (/*e*/) {
                if (this.selected !== true) {
                    this.classList.add('menu-item-over');
                }
            };
            item.onmouseout = function (/*e*/) {
                this.classList.remove('menu-item-over');
            };
            item.onclick = setMenuItemsState.bind(item);

            var el;
            if (mediaType === 'caption') {
                el = menu.querySelector('ul');
            } else {
                el = menu.querySelector('.' + mediaType + '-menu-content');
            }

            el.appendChild(item);
        }

        return menu;
    };

    var onMenuClick = function (menu, btn) {
        if (menu.classList.contains('hide')) {
            menu.classList.remove('hide');
            menu.onmouseleave = function (/*e*/) {
                this.classList.add('hide');
            };
        } else {
            menu.classList.add('hide');
        }
        menu.style.position = isFullscreen() ? 'fixed' : 'absolute';
        positionMenu(menu, btn);
    };

    var setMenuItemsState = function (value, type) {
        var self = typeof value === 'number' ? document.getElementById(type + 'Item_' + value) : this;
        var nodes = self.parentElement.children;

        for (var i = 0; i < nodes.length; i++) {
            nodes[i].selected = false;
            nodes[i].classList.remove('menu-item-selected');
            nodes[i].classList.add('menu-item-unselected');
        }
        self.selected = true;
        self.classList.remove('menu-item-over');
        self.classList.remove('menu-item-unselected');
        self.classList.add('menu-item-selected');

        if (type === undefined) { // User clicked so type is part of item binding.
            switch (self.name) {
                case 'video-bitrate-list':
                case 'audio-bitrate-list':
                    var cfg = {
                        'streaming': {
                            'abr': {
                                'autoSwitchBitrate': {
                                }
                            }
                        }
                    };

                    if (self.index > 0) {
                        cfg.streaming.abr.autoSwitchBitrate[self.mediaType] = false;
                        player.updateSettings(cfg);
                        player.setQualityFor(self.mediaType, self.index - 1);
                    } else {
                        cfg.streaming.abr.autoSwitchBitrate[self.mediaType] = true;
                        player.updateSettings(cfg);
                    }
                    break;
                case 'caption-list':
                    player.setTextTrack(self.index - 1);
                    break;
                case 'video-track-list':
                case 'audio-track-list':
                    player.setCurrentTrack(player.getTracksFor(self.mediaType)[self.index]);
                    break;
            }
        }
    };

    var handleMenuPositionOnResize = function (/*e*/) {
        if (captionMenu) {
            positionMenu(captionMenu, captionBtn);
        }
        if (bitrateListMenu) {
            positionMenu(bitrateListMenu, bitrateListBtn);
        }
        if (trackSwitchMenu) {
            positionMenu(trackSwitchMenu, trackSwitchBtn);
        }
    };

    var positionMenu = function (menu, btn) {
        if (btn.offsetLeft + menu.clientWidth >= videoController.clientWidth) {
            menu.style.right = '0px';
            menu.style.left = '';
        } else {
            menu.style.left = btn.offsetLeft + 'px';
        }
        var menu_y = videoController.offsetTop - menu.offsetHeight;
        menu.style.top = menu_y + 'px';
    };

    var destroyBitrateMenu = function () {
        if (bitrateListMenu) {
            menuHandlersList.forEach(function (item) {
                bitrateListBtn.removeEventListener('click', item);
            });
            videoController.removeChild(bitrateListMenu);
            bitrateListMenu = null;
        }
    };

    //************************************************************************************
    //IE FIX
    //************************************************************************************

    var coerceIEInputAndChangeEvents = function (slider, addChange) {
        var fireChange = function (/*e*/) {
            var changeEvent = document.createEvent('Event');
            changeEvent.initEvent('change', true, true);
            changeEvent.forceChange = true;
            slider.dispatchEvent(changeEvent);
        };

        this.addEventListener('change', function (e) {
            var inputEvent;
            if (!e.forceChange && e.target.getAttribute('type') === 'range') {
                e.stopPropagation();
                inputEvent = document.createEvent('Event');
                inputEvent.initEvent('input', true, true);
                e.target.dispatchEvent(inputEvent);
                if (addChange) {
                    e.target.removeEventListener('mouseup', fireChange);//TODO can not clean up this event on destroy. refactor needed!
                    e.target.addEventListener('mouseup', fireChange);
                }
            }

        }, true);
    };

    var isIE = function () {
        return !!navigator.userAgent.match(/Trident.*rv[ :]*11\./);
    };


    //************************************************************************************
    // PUBLIC API
    //************************************************************************************

    return {
        setVolume: setVolume,
        setDuration: setDuration,
        setTime: setTime,

        initialize: function (suffix) {

            if (!player) {
                throw new Error('Please pass an instance of MediaPlayer.js when instantiating the ControlBar Object');
            }
            video = player.getVideoElement();
            if (!video) {
                throw new Error('Please call initialize after you have called attachView on MediaPlayer.js');
            }

            displayUTCTimeCodes = displayUTCTimeCodes === undefined ? false : displayUTCTimeCodes;

            initControls(suffix);
            video.controls = false;
            videoContainer = video.parentNode;
            captionBtn.classList.add('hide');
            if (trackSwitchBtn) {
                trackSwitchBtn.classList.add('hide');
            }

            player.on(dashjs.MediaPlayer.events.PLAYBACK_STARTED, onPlayStart, this);
            player.on(dashjs.MediaPlayer.events.PLAYBACK_PAUSED, onPlaybackPaused, this);
            player.on(dashjs.MediaPlayer.events.PLAYBACK_TIME_UPDATED, onPlayTimeUpdate, this);
            player.on(dashjs.MediaPlayer.events.TEXT_TRACKS_ADDED, onTracksAdded, this);
            player.on(dashjs.MediaPlayer.events.STREAM_INITIALIZED, onStreamInitialized, this);
            player.on(dashjs.MediaPlayer.events.STREAM_TEARDOWN_COMPLETE, onStreamTeardownComplete, this);
            player.on(dashjs.MediaPlayer.events.SOURCE_INITIALIZED, onSourceInitialized, this);

            playPauseBtn.addEventListener('click', onPlayPauseClick);
            muteBtn.addEventListener('click', onMuteClick);
            fullscreenBtn.addEventListener('click', onFullscreenClick);
            seekbar.addEventListener('mousedown', onSeeking, true);
            seekbar.addEventListener('mousemove', onSeekBarMouseMove, true);
            // set passive to true for scroll blocking listeners (https://www.chromestatus.com/feature/5745543795965952)
            seekbar.addEventListener('touchmove', onSeekBarMouseMove, { passive: true });
            seekbar.addEventListener('mouseout', onSeekBarMouseMoveOut, true);
            seekbar.addEventListener('touchcancel', onSeekBarMouseMoveOut, true);
            seekbar.addEventListener('touchend', onSeekBarMouseMoveOut, true);
            volumebar.addEventListener('input', setVolume, true);
            document.addEventListener('fullscreenchange', onFullScreenChange, false);
            document.addEventListener('MSFullscreenChange', onFullScreenChange, false);
            document.addEventListener('mozfullscreenchange', onFullScreenChange, false);
            document.addEventListener('webkitfullscreenchange', onFullScreenChange, false);

            //IE 11 Input Fix.
            if (isIE()) {
                coerceIEInputAndChangeEvents(seekbar, true);
                coerceIEInputAndChangeEvents(volumebar, false);
            }
        },

        show: function () {
            videoController.classList.remove('hide');
        },

        hide: function () {
            videoController.classList.add('hide');
        },

        disable: function () {
            videoController.classList.add('disable');
        },

        enable: function () {
            videoController.classList.remove('disable');
        },

        reset: function () {
            window.removeEventListener('resize', handleMenuPositionOnResize);
            destroyBitrateMenu();
            menuHandlersList.forEach(function (item) {
                if (trackSwitchBtn) trackSwitchBtn.removeEventListener('click', item);
                if (captionBtn) captionBtn.removeEventListener('click', item);
            });
            if (captionMenu) {
                videoController.removeChild(captionMenu);
                captionMenu = null;
                captionBtn.classList.add('hide');
            }
            if (trackSwitchMenu) {
                videoController.removeChild(trackSwitchMenu);
                trackSwitchMenu = null;
                trackSwitchBtn.classList.add('hide');
            }
            menuHandlersList = [];
            seeking = false;

            if (seekbarPlay) {
                seekbarPlay.style.width = '0%';
            }

            if (seekbarBuffer) {
                seekbarBuffer.style.width = '0%';
            }
        },

        destroy: function () {
            this.reset();

            playPauseBtn.removeEventListener('click', onPlayPauseClick);
            muteBtn.removeEventListener('click', onMuteClick);
            fullscreenBtn.removeEventListener('click', onFullscreenClick);
            seekbar.removeEventListener('mousedown', onSeeking);
            volumebar.removeEventListener('input', setVolume);
            seekbar.removeEventListener('mousemove', onSeekBarMouseMove);
            seekbar.removeEventListener('touchmove', onSeekBarMouseMove);
            seekbar.removeEventListener('mouseout', onSeekBarMouseMoveOut);
            seekbar.removeEventListener('touchcancel', onSeekBarMouseMoveOut);
            seekbar.removeEventListener('touchend', onSeekBarMouseMoveOut);

            player.off(dashjs.MediaPlayer.events.PLAYBACK_STARTED, onPlayStart, this);
            player.off(dashjs.MediaPlayer.events.PLAYBACK_PAUSED, onPlaybackPaused, this);
            player.off(dashjs.MediaPlayer.events.PLAYBACK_TIME_UPDATED, onPlayTimeUpdate, this);
            player.off(dashjs.MediaPlayer.events.TEXT_TRACKS_ADDED, onTracksAdded, this);
            player.off(dashjs.MediaPlayer.events.STREAM_INITIALIZED, onStreamInitialized, this);
            player.off(dashjs.MediaPlayer.events.STREAM_TEARDOWN_COMPLETE, onStreamTeardownComplete, this);
            player.off(dashjs.MediaPlayer.events.SOURCE_INITIALIZED, onSourceInitialized, this);

            document.removeEventListener('fullscreenchange', onFullScreenChange);
            document.removeEventListener('MSFullscreenChange', onFullScreenChange);
            document.removeEventListener('mozfullscreenchange', onFullScreenChange);
            document.removeEventListener('webkitfullscreenchange', onFullScreenChange);
        }
    };
};
