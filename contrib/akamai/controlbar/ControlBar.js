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
var ControlBar = function (dashjsMediaPlayer) {

    var player = dashjsMediaPlayer,
        video,
        videoContainer,
        captionMenu = null,
        bitrateListMenu = null,
        trackSwitchMenu = null,
        menuHandlersList = [],
        lastVolumeLevel = NaN,
        seeking = false,
        videoControllerVisibleTimeout = 0,
        videoController = document.getElementById("videoController"),
        playPauseBtn = document.getElementById("playPauseBtn"),
        bitrateListBtn = document.getElementById("bitrateListBtn"),
        captionBtn = document.getElementById("captionBtn"),
        trackSwitchBtn = document.getElementById("trackSwitchBtn"),
        seekbar = document.getElementById("seekbar"),
        muteBtn = document.getElementById("muteBtn"),
        volumebar = document.getElementById("volumebar"),
        fullscreenBtn = document.getElementById("fullscreenBtn"),
        timeDisplay = document.getElementById("videoTime"),
        durationDisplay = document.getElementById("videoDuration"),

//************************************************************************************
// PLAYBACK
//************************************************************************************

        togglePlayPauseBtnState = function () {
            var span = document.getElementById('iconPlayPause');
            if (player.isPaused()) {
                span.classList.remove('icon-pause')
                span.classList.add('icon-play');
            } else {
                span.classList.remove('icon-play');
                span.classList.add('icon-pause');
            }
        },

        onPlayPauseClick = function (e) {
            togglePlayPauseBtnState.call(this);
            player.isPaused() ? player.play() : player.pause();
        },

        onPlaybackPaused = function (e) {
            togglePlayPauseBtnState();
        },

        onPlayStart = function (e) {
            setTime(player.time());
            updateDuration();
            togglePlayPauseBtnState();
        },

        onPlayTimeUpdate = function (e) {
            updateDuration();
            if (!seeking) {
                setTime(player.time());
                seekbar.value = player.time();
            }
        },

//************************************************************************************
// VOLUME
//************************************************************************************

        toggleMuteBtnState = function () {
            var span = document.getElementById('iconMute');
            if (player.isMuted()) {
                span.classList.remove('icon-mute-off');
                span.classList.add('icon-mute-on');
            } else {
                span.classList.remove('icon-mute-on')
                span.classList.add('icon-mute-off');
            }
        },

        onMuteClick = function (e) {
            if (player.isMuted() && !isNaN(lastVolumeLevel)) {
                setVolume(lastVolumeLevel);
            } else {
                lastVolumeLevel = parseFloat(volumebar.value);
                setVolume(0);
            }
            player.setMute(player.getVolume() === 0);
            toggleMuteBtnState();
        },

        setVolume = function (value) {
            if (typeof value === "number") {
                volumebar.value = value;
            }
            player.setVolume(volumebar.value);
            player.setMute(player.getVolume() === 0);
            if (isNaN(lastVolumeLevel)) {
                lastVolumeLevel = player.getVolume();
            }
            toggleMuteBtnState();
        },

//************************************************************************************
// SEEKING
// ************************************************************************************

        onSeekBarChange = function (e) {
            player.seek(parseFloat(seekbar.value));
        },

        onSeeking = function (e) {
            //TODO Add call to seek in trick-mode once implemented. Preview Frames.
            seeking = true;
            setTime(parseFloat(seekbar.value));
        },

        onSeeked = function (e) {
            seeking = false;
        },

//************************************************************************************
// TIME/DURATION
//************************************************************************************

        setDuration = function (value) {
            if (!isNaN(value)) {
                durationDisplay.textContent = player.convertToTimeCode(value);
            }
        },

        setTime = function (value) {
            if (!isNaN(value)) {
                timeDisplay.textContent = player.convertToTimeCode(value);
            }
        },

        updateDuration = function () {
            var duration = player.duration();
            if (duration !== parseFloat(seekbar.max)) { //check if duration changes for live streams..
                setDuration(duration);
                seekbar.max = duration;
            }
        },

//************************************************************************************
// FULLSCREEN
//************************************************************************************

        onFullScreenChange = function (e) {
            if (isFullscreen()) {
                enterFullscreen();
                var icon = fullscreenBtn.querySelector(".icon-fullscreen-enter")
                icon.classList.remove("icon-fullscreen-enter");
                icon.classList.add("icon-fullscreen-exit");
            } else {
                exitFullscreen();
                var icon = fullscreenBtn.querySelector(".icon-fullscreen-exit")
                icon.classList.remove("icon-fullscreen-exit");
                icon.classList.add("icon-fullscreen-enter");
            }
        },

        isFullscreen = function () {
            return document.fullscreenElement || document.msFullscreenElement || document.mozFullScreen || document.webkitIsFullScreen;
        },

        enterFullscreen = function () {
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
            window.addEventListener("mousemove", onFullScreenMouseMove);
            onFullScreenMouseMove();
        },

        onFullScreenMouseMove = function () {
            clearFullscreenState();
            videoControllerVisibleTimeout = setTimeout(function () {
                videoController.classList.add("hide");
            }, 4000);
        },

        clearFullscreenState = function () {
            clearTimeout(videoControllerVisibleTimeout);
            videoController.classList.remove("hide");
        },

        exitFullscreen = function () {
            window.removeEventListener("mousemove", onFullScreenMouseMove);
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
        },

        onFullscreenClick = function (e) {
            if (!isFullscreen()) {
                enterFullscreen();
            } else {
                exitFullscreen();
            }
            if (captionMenu) {
                captionMenu.classList.add("hide");
            }
            if (bitrateListMenu) {
                bitrateListMenu.classList.add("hide");
            }
            if (trackSwitchMenu) {
                trackSwitchMenu.classList.add("hide");
            }
        },

//************************************************************************************
// Audio Video MENU
//************************************************************************************

        onTracksAdded = function (e) {
            // Subtitles/Captions Menu //XXX we need to add two layers for captions & subtitles if present.
            if (!captionMenu) {
                var contentFunc = function (element, index) {
                    return isNaN(index) ? "OFF" : element.lang + " : " + element.kind;
                }
                captionMenu = createMenu({menuType: 'caption', arr: e.tracks}, contentFunc);

                var func = function () {
                    onMenuClick(captionMenu, captionBtn);
                }
                menuHandlersList.push(func);
                captionBtn.addEventListener("click", func);
                captionBtn.classList.remove("hide");
            }
        },

        onStreamInitialized = function (e) {

            var contentFunc;
            //Bitrate Menu
            if (bitrateListBtn) {
                destroyBitrateMenu();

                var availableBitrates = {menuType: 'bitrate'};
                availableBitrates.audio = player.getBitrateInfoListFor("audio") || [];
                availableBitrates.video = player.getBitrateInfoListFor("video") || [];

                if (availableBitrates.audio.length > 1 || availableBitrates.video.length > 1) {

                    contentFunc = function (element, index) {
                        return isNaN(index) ? " Auto Switch" : Math.floor(element.bitrate / 1000) + " kbps";
                    }
                    bitrateListMenu = createMenu(availableBitrates, contentFunc);
                    var func = function () {
                        onMenuClick(bitrateListMenu, bitrateListBtn);
                    };
                    menuHandlersList.push(func);
                    bitrateListBtn.addEventListener("click", func);
                    bitrateListBtn.classList.remove("hide");

                } else {
                    bitrateListBtn.classList.add("hide");
                }
            }

            //Track Switch Menu
            if (!trackSwitchMenu && trackSwitchBtn) {
                var availableTracks = {menuType: "track"};
                availableTracks.audio = player.getTracksFor("audio");
                availableTracks.video = player.getTracksFor("video"); // these return empty arrays so no need to cehck for null

                if (availableTracks.audio.length > 1 || availableTracks.video.length > 1) {
                    contentFunc = function (element) {
                        return 'Language: ' + element.lang + ' - Role: ' + element.roles[0];
                    }
                    trackSwitchMenu = createMenu(availableTracks, contentFunc);
                    var func = function () {
                        onMenuClick(trackSwitchMenu, trackSwitchBtn);
                    };
                    menuHandlersList.push(func);
                    trackSwitchBtn.addEventListener("click", func);
                    trackSwitchBtn.classList.remove("hide");
                }
            }

        },

        createMenu = function (info, contentFunc) {

            var menuType = info.menuType;
            var el = document.createElement("div");
            el.id = menuType + "Menu";
            el.classList.add("menu");
            el.classList.add("hide");
            el.classList.add("unselectable");
            el.classList.add("menu-item-unselected");
            videoController.appendChild(el);

            switch (menuType) {
                case 'caption' :
                    el.appendChild(document.createElement("ul"));
                    el = createMenuContent(el, getMenuContent(menuType, info.arr, contentFunc), 'caption', menuType + '-list');
                    setMenuItemsState(1, menuType + '-list'); // Should not be harcoded.  get initial index or state from dash.js - not available yet in dash.js
                    break;
                case 'track' :
                case 'bitrate' :
                    if (info.video.length > 1) {
                        el.appendChild(createMediaTypeMenu("video"));
                        el = createMenuContent(el, getMenuContent(menuType, info.video, contentFunc), 'video', 'video-' + menuType + '-list');
                        setMenuItemsState(getMenuInitialIndex(info.video, menuType, 'video'), 'video-' + menuType + '-list');
                    }
                    if (info.audio.length > 1) {
                        el.appendChild(createMediaTypeMenu("audio"));
                        el = createMenuContent(el, getMenuContent(menuType, info.audio, contentFunc), 'audio', 'audio-' + menuType + '-list');
                        setMenuItemsState(getMenuInitialIndex(info.audio, menuType, 'audio'), 'audio-' + menuType + '-list');
                    }
                    break;
            }

            window.addEventListener("resize", handleMenuPositionOnResize, true);
            return el;
        },

        getMenuInitialIndex = function(info, menuType, mediaType) {
            if (menuType === 'track') {

                var mediaInfo = player.getCurrentTrackFor(mediaType);
                var idx = 0
                info.some(function(element, index){
                    if (isTracksEqual(element, mediaInfo)) {
                        idx = index;
                        return true;
                    }
                })
                return idx;

            } else if (menuType === "bitrate") {
                return player.getAutoSwitchQualityFor(mediaType) ? 0 : player.getQualityFor(mediaType);
            }
        },

        isTracksEqual = function (t1, t2) {
            var sameId = t1.id === t2.id;
            var sameViewpoint = t1.viewpoint === t2.viewpoint;
            var sameLang = t1.lang === t2.lang;
            var sameRoles = t1.roles.toString() === t2.roles.toString();
            var sameAccessibility = t1.accessibility.toString() === t2.accessibility.toString();
            var sameAudioChannelConfiguration = t1.audioChannelConfiguration.toString() === t2.audioChannelConfiguration.toString();

            return (sameId && sameViewpoint && sameLang && sameRoles && sameAccessibility && sameAudioChannelConfiguration);
        },

        getMenuContent = function (type, arr, contentFunc) {

            var content = [];
            arr.forEach(function (element, index) {
                content.push(contentFunc(element, index));
            })
            if (type !== 'track') {
                content.unshift(contentFunc(null, NaN));
            }
            return content;
        },

        createMediaTypeMenu = function (type) {

            var div = document.createElement("div");
            var title = document.createElement("div");
            var content = document.createElement("ul");

            div.id = type;

            title.textContent = type === 'video' ? 'Video' : 'Audio';
            title.classList.add('menu-sub-menu-title');

            content.id = type + "Content";
            content.classList.add(type + "-menu-content");

            div.appendChild(title);
            div.appendChild(content);

            return div;
        },

        createMenuContent = function (menu, arr, mediaType, name) {

            for (var i = 0; i < arr.length; i++) {

                var item = document.createElement("li");
                item.id = name + "Item_" + i;
                item.index = i;
                item.mediaType = mediaType;
                item.name = name;
                item.selected = false;
                item.textContent = arr[i];

                item.onmouseover = function (e) {
                    if (this.selected !== true) {
                        this.classList.add("menu-item-over");
                    }
                };
                item.onmouseout = function (e) {
                    this.classList.remove("menu-item-over");
                };
                item.onclick = setMenuItemsState.bind(item);

                var el;
                if (mediaType === 'caption') {
                    el = menu.querySelector("ul");
                } else {
                    el = menu.querySelector('.' + mediaType + "-menu-content");
                }

                el.appendChild(item);
            }

            return menu;
        },


        onMenuClick = function (menu, btn) {

            if (menu.classList.contains("hide")) {
                menu.classList.remove("hide");
                menu.onmouseleave = function (e) {
                    this.classList.add("hide");
                };
            } else {
                menu.classList.add("hide");
            }
            menu.style.position = isFullscreen() ? "fixed" : "absolute";
            positionMenu(menu, btn);
        },


        setMenuItemsState = function (value, type) {

            var self = typeof value === 'number' ? document.getElementById(type + "Item_" + value) : this,
                nodes = self.parentElement.children;

            for (var i = 0; i < nodes.length; i++) {
                nodes[i].selected = false;
                nodes[i].classList.remove("menu-item-selected");
                nodes[i].classList.add("menu-item-unselected");
            }
            self.selected = true;
            self.classList.remove("menu-item-over");
            self.classList.remove("menu-item-unselected");
            self.classList.add("menu-item-selected");


            if (type === undefined) { // User clicked so type is part of item binding.
                switch (self.name) {
                    case 'video-bitrate-list':
                    case 'audio-bitrate-list':
                        if (self.index > 0) {
                            if (player.getAutoSwitchQualityFor(self.mediaType)) {
                                player.setAutoSwitchQualityFor(self.mediaType, false);
                            }
                            player.setQualityFor(self.mediaType, self.index - 1);
                        } else {
                            player.setAutoSwitchQualityFor(self.mediaType, true);
                        }
                        break;
                    case 'caption-list' :
                        player.setTextTrack(self.index - 1);
                        break
                    case 'video-track-list' :
                    case 'audio-track-list' :
                        player.setCurrentTrack(player.getTracksFor(self.mediaType)[self.index]);
                        break;
                }
            }
        },

        handleMenuPositionOnResize = function (e) {
            if (captionMenu) {
                positionMenu(captionMenu, captionBtn);
            }
            if (bitrateListMenu) {
                positionMenu(bitrateListMenu, bitrateListBtn);
            }
            if (trackSwitchMenu) {
                positionMenu(trackSwitchMenu, trackSwitchBtn);
            }
        },

        positionMenu = function (menu, btn) {
            var menu_y = videoController.offsetTop - menu.offsetHeight;
            menu.style.top = menu_y + "px";
            menu.style.left = btn.offsetLeft + "px";
        },

        destroyBitrateMenu = function () {
            if (bitrateListMenu) {
                menuHandlersList.forEach(function (item) {
                    bitrateListBtn.removeEventListener("click", item);
                })
                videoController.removeChild(bitrateListMenu);
                bitrateListMenu = null;
            }
        },

//************************************************************************************
//IE FIX
//************************************************************************************

        coerceIEInputAndChangeEvents = function (slider, addChange) {
            var fireChange = function (e) {
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
        },

        isIE = function () {
            return !!navigator.userAgent.match(/Trident.*rv[ :]*11\./)
        };


//************************************************************************************
// PUBLIC API
//************************************************************************************

    return {
        setVolume: setVolume,
        setDuration: setDuration,
        setTime: setTime,

        initialize: function () {

            if (!player) {
                throw new Error("Please pass an instance of MediaPlayer.js when instantiating the ControlBar Object");
            }
            video = player.getVideoElement();
            if (!video) {
                throw new Error("Please call initialize after you have called attachView on MediaPlayer.js");
            }

            video.controls = false;
            videoContainer = player.getVideoContainer();
            captionBtn.classList.add("hide");
            if (trackSwitchBtn) {
                trackSwitchBtn.classList.add("hide");
            }

            player.on(dashjs.MediaPlayer.events.PLAYBACK_STARTED, onPlayStart, this);
            player.on(dashjs.MediaPlayer.events.PLAYBACK_PAUSED, onPlaybackPaused, this);
            player.on(dashjs.MediaPlayer.events.PLAYBACK_TIME_UPDATED, onPlayTimeUpdate, this);
            player.on(dashjs.MediaPlayer.events.PLAYBACK_SEEKED, onSeeked, this);
            player.on(dashjs.MediaPlayer.events.TEXT_TRACKS_ADDED, onTracksAdded, this);
            player.on(dashjs.MediaPlayer.events.STREAM_INITIALIZED, onStreamInitialized, this);

            playPauseBtn.addEventListener("click", onPlayPauseClick);
            muteBtn.addEventListener("click", onMuteClick);
            fullscreenBtn.addEventListener("click", onFullscreenClick);
            seekbar.addEventListener("change", onSeekBarChange, true);
            seekbar.addEventListener("input", onSeeking, true);
            volumebar.addEventListener("input", setVolume, true);
            document.addEventListener("fullscreenchange", onFullScreenChange, false);
            document.addEventListener("MSFullscreenChange", onFullScreenChange, false);
            document.addEventListener("mozfullscreenchange", onFullScreenChange, false);
            document.addEventListener("webkitfullscreenchange", onFullScreenChange, false);

            //IE 11 Input Fix.
            if (isIE()) {
                coerceIEInputAndChangeEvents(seekbar, true);
                coerceIEInputAndChangeEvents(volumebar, false);
            }
        },

        show: function () {
            videoController.classList.remove("hide");
        },

        hide: function () {
            videoController.classList.add("hide");
        },

        disable: function () {
            videoController.classList.add("disable");
        },

        enable: function () {
            videoController.classList.remove("disable");
        },

        reset: function () {
            window.removeEventListener("resize", handleMenuPositionOnResize);
            destroyBitrateMenu();
            menuHandlersList.forEach(function (item) {
                if (trackSwitchBtn) trackSwitchBtn.removeEventListener("click", item);
                if (captionBtn) captionBtn.removeEventListener("click", item);
            })
            if (captionMenu) {
                videoController.removeChild(captionMenu);
                captionMenu = null;
                captionBtn.classList.add("hide");
            }
            if (trackSwitchMenu) {
                videoController.removeChild(trackSwitchMenu);
                trackSwitchMenu = null;
                trackSwitchBtn.classList.add("hide");
            }
            menuHandlersList = [];
            seeking = false;
        },

        destroy: function () {

            reset();

            playPauseBtn.removeEventListener("click", onPlayPauseClick);
            muteBtn.removeEventListener("click", onMuteClick);
            fullscreenBtn.removeEventListener("click", onFullscreenClick);
            seekbar.removeEventListener("change", onSeekBarChange);
            seekbar.removeEventListener("input", onSeeking);
            volumebar.removeEventListener("input", setVolume);

            player.off(dashjs.MediaPlayer.events.PLAYBACK_STARTED, onPlayStart, this);
            player.off(dashjs.MediaPlayer.events.PLAYBACK_PAUSED, onPlaybackPaused, this);
            player.off(dashjs.MediaPlayer.events.PLAYBACK_TIME_UPDATED, onPlayTimeUpdate, this);
            player.off(dashjs.MediaPlayer.events.PLAYBACK_SEEKED, onSeeked, this);
            player.off(dashjs.MediaPlayer.events.TEXT_TRACKS_ADDED, onTracksAdded, this);
            player.off(dashjs.MediaPlayer.events.STREAM_INITIALIZED, onStreamInitialized, this);

            document.removeEventListener("fullscreenchange", onFullScreenChange);
            document.removeEventListener("MSFullscreenChange", onFullScreenChange);
            document.removeEventListener("mozfullscreenchange", onFullScreenChange);
            document.removeEventListener("webkitfullscreenchange", onFullScreenChange);
        }
    }
}
