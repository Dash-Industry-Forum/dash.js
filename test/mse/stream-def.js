/* Copyright 2013 Google Inc.
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are
 * met:
 *
 *     * Redistributions of source code must retain the above copyright
 * notice, this list of conditions and the following disclaimer.
 *     * Redistributions in binary form must reproduce the above
 * copyright notice, this list of conditions and the following disclaimer
 * in the documentation and/or other materials provided with the
 * distribution.
 *     * Neither the name of Google Inc. nor the names of its
 * contributors may be used to endorse or promote products derived from
 * this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */
'use strict';

var StreamDef = (function() {

var d = {};

d.AudioType = 'audio/mp4; codecs="mp4a.40.2"';
d.VideoType = 'video/mp4; codecs="avc1.640028"';

var CreateAudioDef = function(src, size, duration) {
  return {name: 'audio', type: d.AudioType, size: size,
          src: src, duration: duration, bps: Math.floor(size / duration)};
};

var CreateVideoDef = function(src, size, duration) {
  return {name: 'video', type: d.VideoType, size: size,
          src: src, duration: duration, bps: Math.floor(size / duration)};
};

d.AudioTiny = CreateAudioDef('media/car-20120827-8b.mp4', 717502, 181.62);
d.AudioNormal = CreateAudioDef('media/car-20120827-8c.mp4', 2884572, 181.58);
d.AudioHuge = CreateAudioDef('media/car-20120827-8d.mp4', 5789853, 181.58);
d.VideoTiny = CreateVideoDef('media/car-20120827-85.mp4', 6015001, 181.44);
d.VideoNormal = CreateVideoDef('media/car-20120827-86.mp4', 15593225, 181.44);
d.VideoHuge = CreateVideoDef('media/car-20120827-89.mp4', 95286345, 181.44);

d.AudioTinyClearKey = CreateAudioDef(
    'media/car_cenc-20120827-8b.mp4', 783470, 181.62);
d.AudioNormalClearKey = CreateAudioDef(
    'media/car_cenc-20120827-8c.mp4', 3013084, 181.58);
d.AudioHugeClearKey = CreateAudioDef(
    'media/car_cenc-20120827-8d.mp4', 5918365, 181.58);

d.VideoTinyClearKey = CreateVideoDef(
    'media/car_cenc-20120827-85.mp4', 6217017, 181.44);
d.VideoNormalClearKey = CreateVideoDef(
    'media/car_cenc-20120827-86.mp4', 15795193, 181.44);
d.VideoHugeClearKey = CreateVideoDef(
    'media/car_cenc-20120827-89.mp4', 95488313, 181.44);

d.VideoStreamYTCenc = CreateVideoDef(
    'media/oops_cenc-20121114-145-no-clear-start.mp4', 39980507, 13180000);

d.Audio1MB = CreateAudioDef('media/car-audio-1MB-trunc.mp4', 1048576, 65.875);
d.Video1MB = CreateVideoDef('media/test-video-1MB.mp4', 1031034, 1.04);

d.ProgressiveLow = CreateVideoDef('media/car_20130125_18.mp4', 15477531,
                                  181.55);
d.ProgressiveNormal = CreateVideoDef('media/car_20130125_22.mp4', 55163609,
                                  181.55);
d.ProgressiveHigh = CreateVideoDef('media/car_20130125_37.mp4', 106389491,
                                  181.55);

return d;

})();
