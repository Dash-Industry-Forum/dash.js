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
var ControlBar = function(dashjsMediaPlayer) {

    var player = dashjsMediaPlayer,
        video,
        currentCaptionMenuIdx = 0,
        captionMenu = null,
        lastValumeLevel = NaN,
        seeking = false,
        //TODO - CREATE ALL ELEMENTS INSIDE "videoController" AND JUST REQUIRE ONE DIV IN PLAYER TO BE CREATED BELOW VIDEO ELEMENT NAMED "videoController"
        videoController = document.getElementById("videoController"),
        playPauseBtn = document.getElementById("playPauseBtn"),
        captionBtn = document.getElementById("captionBtn"),
        seekbar = document.getElementById("seekbar"),
        muteBtn = document.getElementById("muteBtn"),
        volumebar = document.getElementById("volumebar"),
        fullscreenBtn = document.getElementById("fullscreenBtn"),
        timeDisplay = document.getElementById("videoTime"),
        durationDisplay = document.getElementById("videoDuration"),

//************************************************************************************
// PLAYBACK
//************************************************************************************

        togglePlayPauseBtnState = function(){
            var span = document.getElementById('iconPlayPause');
            if(video.paused) {
                span.classList.remove('icon-pause')
                span.classList.add('icon-play');
            } else {
                span.classList.remove('icon-play');
                span.classList.add('icon-pause');
            }
        },

        onPlayPauseClick = function(e){
            togglePlayPauseBtnState.call(this);
            video.paused ? video.play() : video.pause();
        },

        onPlaybackPaused = function(e){
            togglePlayPauseBtnState();
        },

        onPlayStart = function(e){
            setTime(player.time());
            updateDuration();
            togglePlayPauseBtnState();
        },

        onPlayTimeUpdate = function(e){
            updateDuration();
            if (!seeking) {
                setTime(player.time());
                seekbar.value = player.time();
            }
        },

//************************************************************************************
// VOLUME
//************************************************************************************

        toggleMuteBtnState = function(){
            var span = document.getElementById('iconMute');
            if(video.volume === 0) {
                span.classList.remove('icon-mute-off');
                span.classList.add('icon-mute-on');
            } else {
                span.classList.remove('icon-mute-on')
                span.classList.add('icon-mute-off');
            }
        },

        onMuteClick = function(e) {
            if(video.muted && !isNaN(lastValumeLevel)){
                setVolume(lastValumeLevel);
            }else{
                lastValumeLevel = parseFloat(volumebar.value);
                setVolume(0);
            }
            video.muted = video.volume === 0;
            toggleMuteBtnState();
        },

        setVolume = function(value){
            if (typeof value === "number"){
                volumebar.value = value;
            }
            video.volume = volumebar.value;
            video.muted = video.volume === 0;
            if (isNaN(lastValumeLevel)) {
                lastValumeLevel = video.volume;
            }
            toggleMuteBtnState();
        },

//************************************************************************************
// SEEKING
// ************************************************************************************

        onSeekBarChange = function(e){
            player.seek(parseFloat(seekbar.value));
        },

        onSeeking = function(e){
            seeking = true;
            setTime(parseFloat(seekbar.value));
        },

        onSeeked = function(e){
            seeking = false;
        },

//************************************************************************************
// TIME/DURATION
//************************************************************************************

        setDuration = function(value){
            durationDisplay.innerHTML = player.convertToTimeCode(value);
        },

        setTime = function(value){
            timeDisplay.innerHTML = player.convertToTimeCode(value);
        },

        updateDuration = function(){
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
            if(isFullscreen()) {
                enterFullscreen();
            } else {
                exitFullscreen();
            }
        },

        isFullscreen = function (){
            return document.fullscreenElement || document.msFullscreenElement || document.mozFullScreen || document.webkitIsFullScreen;
        },

        enterFullscreen = function () {
            if (video.requestFullscreen) {
                video.requestFullscreen();
            } else if (video.msRequestFullscreen) {
                video.msRequestFullscreen();
            } else if (video.mozRequestFullScreen) {
                video.mozRequestFullScreen();
            } else {
                video.webkitRequestFullScreen();
            }
            videoController.classList.add('video-controller-fullscreen');
        },

        exitFullscreen = function () {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            } else if (document.mozCancelFullScreen){
                document.mozCancelFullScreen();
            } else if (document.msExitFullscreen) {
                document.msExitFullscreen();
            } else {
                document.webkitCancelFullScreen();
            }
            videoController.classList.remove('video-controller-fullscreen');
        }

        onFullscreenClick = function(e){
            if(!isFullscreen()) {
                enterFullscreen();
            } else {
                exitFullscreen();
            }
        },

//************************************************************************************
// CAPTION MENU
//************************************************************************************

        onCaptionClick = function(e){
            if (!captionMenu) {
                createCaptionMenu();
            }

            if (captionMenu.classList.contains("hide")){
                captionMenu.classList.remove("hide");
                captionMenu.onmouseleave = function(e){
                    this.classList.add("hide");
                };
            }else{
                captionMenu.classList.add("hide");
            }

            captionMenu.style.position = isFullscreen() ? "fixed" : "absolute";
            positionCaptionMenu();
        },

        createCaptionMenu = function() {

            captionMenu = document.createElement("div");
            captionMenu.id = "captionMenu";
            captionMenu.classList.add("caption-menu");
            captionMenu.classList.add("hide");
            captionMenu.classList.add("unselectable"); //IE did not like this as "one line CSV" Do not use classlist.add with CSV
            captionMenu.appendChild(document.createElement("ul"));
            videoController.appendChild(captionMenu);

            var tracks = video.textTracks;
            for(var i = 0; i < tracks.length+1; i++) {

                var captionItem = document.createElement("li");
                captionItem.id = "captionItem_"+i
                captionItem.index = i;
                captionItem.selected = false;
                captionItem.innerHTML = i === 0 ? tracks[i].kind +" off" : tracks[i-1].language.toUpperCase() + " : " + tracks[i-1].kind;
                captionItem.onmouseover = function(e){
                    if (this.selected !== true){
                        this.classList.add("caption-item-over");
                    }
                };
                captionItem.onmouseout = function(e){
                    this.classList.remove("caption-item-over");
                };
                captionItem.onclick = setCaptionItemsState.bind(captionItem);
                captionMenu.querySelector("ul").appendChild(captionItem);
            }
            setCaptionItemsState(1);//TODO add APi to media player to get starting text track idx!
            window.addEventListener("resize", positionCaptionMenu, true);
        },

        positionCaptionMenu = function () {
            var menu_y = videoController.offsetTop - captionMenu.offsetHeight;
            captionMenu.style.top = menu_y+"px";
            captionMenu.style.left = captionBtn.offsetLeft+"px";
        },

        setCaptionItemsState = function (value) {
            var self = typeof value === 'number' ? document.getElementById("captionItem_"+value) : this,
                nodes = self.parentElement.children;

            for(i=0; i < nodes.length; i++)  {
                nodes[i].selected = false;
                nodes[i].classList.remove("caption-item-selected");
                nodes[i].classList.add("caption-item-unselected");
            }
            self.selected = true;
            self.classList.remove("caption-item-over");
            self.classList.remove("caption-item-unselected");
            self.classList.add("caption-item-selected");

            currentCaptionMenuIdx = self.index;
            player.setTextTrack(currentCaptionMenuIdx - 1);
        },

//************************************************************************************
//IE FIX
//************************************************************************************

        coerceIEInputAndChangeEvents = function(slider, addChange) {
            var fireChange = function(e) {
                var changeEvent = document.createEvent('Event');
                changeEvent.initEvent('change', true, true);
                changeEvent.forceChange = true;
                slider.dispatchEvent(changeEvent);
            };

            this.addEventListener('change', function(e) {
                var inputEvent;
                if (!e.forceChange && e.target.getAttribute('type') === 'range') {
                    e.stopPropagation();
                    inputEvent = document.createEvent('Event');
                    inputEvent.initEvent('input', true, true);
                    e.target.dispatchEvent(inputEvent);
                    if (addChange) {
                        e.target.removeEventListener('mouseup', fireChange);
                        e.target.addEventListener('mouseup', fireChange);
                    }
                }

            }, true);
        };

//************************************************************************************
// PUBLIC API
//************************************************************************************

    return {
        setVolume:setVolume,
        setDuration:setDuration,
        setTime:setTime,
        initialize:function(){
            if (!player) {
                throw new Error("Please pass an instance of MediaPlayer.js when instantiating the ControlBar Object");
            }
            video  = player.getVideoModel().getElement();
            if (!video) {
                throw new Error("Please call initialize after you have called attachView on MediaPlayer.js");
            }

            playPauseBtn.addEventListener("click", onPlayPauseClick);
            captionBtn.addEventListener("click", onCaptionClick);
            muteBtn.addEventListener("click", onMuteClick);
            fullscreenBtn.addEventListener("click", onFullscreenClick);
            seekbar.addEventListener("change", onSeekBarChange, true);
            seekbar.addEventListener("input", onSeeking, true);
            volumebar.addEventListener("input", setVolume, true);
            video.controls = false;
            video.addEventListener("play", onPlayStart);
            video.addEventListener("pause", onPlaybackPaused);
            video.addEventListener("timeupdate", onPlayTimeUpdate);
            video.addEventListener("seeked", onSeeked);
            document.addEventListener("fullscreenchange", onFullScreenChange, false);
            document.addEventListener("msfullscreenchange", onFullScreenChange, false);
            document.addEventListener("mozfullscreenchange", onFullScreenChange, false);
            document.addEventListener("webkitfullscreenchange", onFullScreenChange, false);

            //IE 11 Input Fix.
            if (!!navigator.userAgent.match(/Trident.*rv[ :]*11\./)) {
                coerceIEInputAndChangeEvents(seekbar, true);
                coerceIEInputAndChangeEvents(volumebar, false);
            }
        },
        show:function(){
            videoController.classList.remove("hide");
        },
        hide:function(){
            videoController.classList.add("hide");
        },
        disable:function(){
            videoController.classList.add("disable");
        },
        enable:function(){
            videoController.classList.remove("disable");
        },
        reset:function(){
            if (captionMenu) {
                videoController.removeChild(captionMenu);
                captionMenu = null;
            }
            currentCaptionMenuIdx = 0;
            seeking = false;
        },
        destroy: function(){
            reset();
            window.removeEventListener("resize", positionCaptionMenu);
            playPauseBtn.removeEventListener("click", onPlayPauseClick);
            captionBtn.removeEventListener("click", onCaptionClick);
            muteBtn.removeEventListener("click", onMuteClick);
            fullscreenBtn.removeEventListener("click", onFullscreenClick);
            seekbar.removeEventListener("change", onSeekBarChange);
            seekbar.removeEventListener("input", onSeeking);
            volumebar.removeEventListener("input", setVolume);
            video.removeEventListener("play", onPlayStart);
            video.removeEventListener("pause", onPlaybackPaused);
            video.removeEventListener("timeupdate", onPlayTimeUpdate);
            video.removeEventListener("seeked", onSeeked);
            document.removeEventListener("fullscreenchange", onFullScreenChange);
            document.removeEventListener("msfullscreenchange", onFullScreenChange);
            document.removeEventListener("mozfullscreenchange", onFullScreenChange);
            document.removeEventListener("webkitfullscreenchange", onFullScreenChange);
        }
    }
}