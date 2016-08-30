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
        videoMenu = null,
        audioMenu = null,
        menuHandlersList = [];
        lastVolumeLevel = NaN,
        seeking = false,
        videoControllerVisibleTimeout = 0,
    //TODO - CREATE ALL ELEMENTS INSIDE "videoController" AND JUST REQUIRE ONE DIV IN PLAYER TO BE CREATED BELOW VIDEO ELEMENT WITH ID "videoController"
        videoController = document.getElementById("videoController"),
        playPauseBtn = document.getElementById("playPauseBtn"),
        captionBtn = document.getElementById("captionBtn"),
        videoTrackBtn = document.getElementById("videoTrackBtn"),
        audioTrackBtn = document.getElementById("audioTrackBtn"),
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
            } else {
                exitFullscreen();
            }
            if (captionMenu) {
                captionMenu.classList.add("hide");
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
        },


//************************************************************************************
// Audio Video MENU
//************************************************************************************

        onTracksAdded = function (e) {

            if (!captionMenu) {
                var contentFunc = function (index, info) {
                    return index === 0 ? info.tracks[index].kind + " off" : info.tracks[index - 1].lang + " : " + info.tracks[index - 1].kind;
                }
                captionMenu = initMenu(e, contentFunc);
                setMenuItemsState(0, 'caption');
                var func = function () {onMenuClick(captionMenu);}
                menuHandlersList.push(func);
                captionBtn.addEventListener("click", func);
                captionBtn.classList.remove("hide");
            }
        },

        onStreamInitialized = function (e) {

            var contentFunc = function (index, info) {
                return index === 0 ? " Auto Switch" : Math.floor(info[index - 1].bitrate / 1000) + " kbps"
            }

            var videoBitrateInfo = player.getBitrateInfoListFor("video")
            if (videoBitrateInfo.length > 1) {
                videoMenu = initMenu(videoBitrateInfo, contentFunc);
                setMenuItemsState(0, 'video');
                var func = function () {onMenuClick(videoMenu);}
                menuHandlersList.push(func);
                videoTrackBtn.addEventListener("click", func);
                videoTrackBtn.classList.remove("hide");
            }

            var audioBitrateInfo = player.getBitrateInfoListFor("audio")
            if (audioBitrateInfo.length > 1) {
                audioMenu = initMenu(audioBitrateInfo, contentFunc);
                setMenuItemsState(0, 'audio');
                var func = function () { onMenuClick(audioMenu);}
                menuHandlersList.push(func);
                audioTrackBtn.addEventListener("click", func);
                audioTrackBtn.classList.remove("hide");
            }
        },

        initMenu = function (info, contentFunc) {

            var type = info.tracks ? "caption" : info[0].mediaType;
            var el = document.createElement("div");
            el.id = type+"Menu";
            el.classList.add("menu");
            el.classList.add("hide");
            el.classList.add("unselectable");
            el.classList.add("menu-item-unselected");

            el.appendChild(document.createElement("ul"));
            videoController.appendChild(el);

            var ln = info.tracks ? info.tracks.length : info.length;

            for (var i = 0; i < ln + 1; i++) {
                var item = document.createElement("li");
                item.id = type+"Item_" + i
                item.index = i;
                item.type = type;
                item.selected = false;
                item.textContent = contentFunc(i, info);

                item.onmouseover = function (e) {
                    if (this.selected !== true) {
                        this.classList.add("menu-item-over");
                    }
                };
                item.onmouseout = function (e) {
                    this.classList.remove("menu-item-over");
                };
                item.onclick = setMenuItemsState.bind(item);
                el.querySelector("ul").appendChild(item);
            }

            window.addEventListener("resize", function () {
                if (captionMenu) {
                    positionMenu(captionMenu, captionBtn);
                }
                if (videoMenu) {
                    positionMenu(videoMenu, videoTrackBtn);
                }
                if (audioMenu) {
                    positionMenu(audioMenu, audioTrackBtn);
                }
            }, true);

            return el;
        },


        onMenuClick = function (menu) {
            var btn = menu.id === "videoMenu" ? videoTrackBtn : menu.id === "audioMenu" ? audioTrackBtn : captionBtn;

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
            var self = typeof value === 'number' ? document.getElementById(type+"Item_" + value) : this,
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

            if (self.type === 'video' || self.type === 'audio') {
                if (self.index > 0) {
                    player.setAutoSwitchQualityFor(self.type, false);
                    player.setQualityFor(self.type, self.index - 1);
                } else {
                    player.setAutoSwitchQualityFor(self.type, true);
                }
            } else if (self.type === 'caption'){
                player.setTextTrack(self.index - 1);
            }
        },


        positionMenu = function (menu, btn) {
            var menu_y = videoController.offsetTop - menu.offsetHeight;
            menu.style.top = menu_y + "px";
            menu.style.left = btn.offsetLeft + "px";
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
            videoTrackBtn.classList.add("hide");
            audioTrackBtn.classList.add("hide");

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
            menuHandlersList.forEach( function(item) {
                captionBtn.removeEventListener("click", item);
                videoTrackBtn.removeEventListener("click", item);
                audioTrackBtn.removeEventListener("click", item);
            })
            menuHandlersList = [];
            if (captionMenu) {
                videoController.removeChild(captionMenu);
                captionMenu = null;
                captionBtn.classList.add("hide");
            }
            if (videoMenu) {
                videoController.removeChild(videoMenu);
                videoMenu = null;
                videoTrackBtn.classList.add("hide");
            }

            if (audioMenu) {
                videoController.removeChild(audioMenu);
                audioMenu = null;
                audioTrackBtn.classList.add("hide");
            }
            seeking = false;
        },
        destroy: function () {
            reset();
            window.removeEventListener("resize", positionMenu);
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
