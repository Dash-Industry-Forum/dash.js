/*
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * copyright Digital Primates 2012
 */
window["streaming"] = window["streaming"] || {};

streaming.PlayerUI = function (rootEl) {
	var me=this;
	me.playPauseButton = rootEl.querySelector(".button-play-pause");
	me.playPauseButton.addEventListener("click",me.onPlayPauseClick.bind(me),false);
	me.timeCurrent = rootEl.querySelector(".time-current");
	me.timeTotal = rootEl.querySelector(".time-total");
	me.progressIndicator = rootEl.querySelector(".progress-indicator");
	me.bufferIndicator = rootEl.querySelector(".buffer-indicator");
	me.progress = rootEl.querySelector(".progress");
	me.progress.addEventListener("mousedown",me.onProgressDown.bind(me),false);
	me.videoEl = rootEl.querySelector("video");
	me.videoEl.addEventListener("play",me.onPlay.bind(me),false);
	me.videoEl.addEventListener("pause",me.onPause.bind(me),false);
	me.videoEl.addEventListener("seeked",me.onSeeked.bind(me),false);
	me.videoEl.addEventListener("timeupdate",me.onProgress.bind(me),false);
};

streaming.PlayerUI.prototype = {
	onProgressDown: function(e) {
	}
	,onPlayPauseClick: function(e) {
		if(this.videoEl.paused) this.videoEl.play(); else this.videoEl.pause();
	}
	,formatTime: function(time) {
		var hr = Math.floor(time / 3600);
		var min = Math.floor((time - hr * 3600) / 60);
		var sec = Math.round(time - hr * 3600 - min * 60);
		var result = "";
		if(hr > 0) {
			if(hr < 10) result += "0";
			result += hr;
			result += ":";
		}
		if(min < 10) result += "0";
		result += min;
		result += ":";
		if(sec < 10) result += "0";
		result += sec;
		return result;
	}
	,getCurrentBufferRangeIndex: function(ranges,currentTime) {
		var len = ranges.length;
		for(var i=0;i<len;i++)
		{
			if(currentTime >= ranges.start(i) && currentTime < ranges.end(i)) return i;
		}
		return -1;
	}
	,onProgress: function(e) {
		var currentTime = this.videoEl.currentTime;
		var duration = this.videoEl.duration;
		var buffered = this.videoEl.buffered;
		var bufferedIndex = this.getCurrentBufferRangeIndex(buffered,currentTime);
		this.timeCurrent.innerHTML = this.formatTime(currentTime);
		this.timeTotal.innerHTML = this.formatTime(duration);
		if(bufferedIndex != -1) {
			var maxBufferedTime = buffered.end(bufferedIndex);
			this.bufferIndicator.style.width = maxBufferedTime * 100 / duration + "%";
		}
		this.progressIndicator.style.width = currentTime * 100 / duration + "%";
	}
	,onSeeked: function(e) {
		//console.log(this.videoEl.buffered.length);
	}
	,onPause: function(e) {
		this.playPauseButton.style.backgroundImage = "url('images/play.png')";
	}
	,onPlay: function(e) {
		this.playPauseButton.style.backgroundImage = "url('images/pause.png')";
	}
	,progress: null
	,bufferIndicator: null
	,progressIndicator: null
	,timeTotal: null
	,timeCurrent: null
	,playPauseButton: null
	,videoEl: null
	,rootEl: null
	
};