/*
 * The copyright in this software is being made available under the BSD License, included below. This software may be subject to other third party and contributor rights, including patent rights, and no such rights are granted under this license.
 *
 * Copyright (c) 2013, Akamai Technologies
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met:
 * •  Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer.
 * •  Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or other materials provided with the distribution.
 * •  Neither the name of the Akamai Technologies nor the names of its contributors may be used to endorse or promote products derived from this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS “AS IS” AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */
MediaPlayer.utils.TextTrackExtensions = function () {
    "use strict";
    var Cue;

    return {
        setup: function() {
            Cue = window.VTTCue || window.TextTrackCue;
        },

        addTextTrack: function(video, captionData,  label, scrlang, isDefaultTrack) {

            //TODO: Ability to define the KIND in the MPD - ie subtitle vs caption....
            var track = video.addTextTrack("captions", label, scrlang);
            // track.default is an object property identifier that is a reserved word
            // The following jshint directive is used to suppressed the warning "Expected an identifier and instead saw 'default' (a reserved word)"
            /*jshint -W024 */
            track.default = isDefaultTrack;
            track.mode = "showing";

            for(var item in captionData) {
                var currentItem = captionData[item];
                var cue = new Cue(currentItem.start, currentItem.end, currentItem.data);
                if (currentItem.styles.align !== undefined && cue.hasOwnProperty("align")) {
                    cue.align = currentItem.styles.align;
                }
                if (currentItem.styles.line !== undefined && cue.hasOwnProperty("line")) {
                    cue.line = currentItem.styles.line;
                }
                if (currentItem.styles.position !== undefined && cue.hasOwnProperty("position")) {
                    cue.position = currentItem.styles.position ;
                }
                if (currentItem.styles.size !== undefined && cue.hasOwnProperty("size")) {
                    cue.size = currentItem.styles.size;
                }
                track.addCue(cue);
            }

            return track;
        },
        deleteCues: function(video) {
            //when multiple tracks are supported - iterate through and delete all cues from all tracks.

            var i = 0,
                firstValidTrack = false;

            while (!firstValidTrack)
            {
                if (video.textTracks[i].cues !== null)
                {
                    firstValidTrack = true;
                    break;
                }
                i++;
            }

            var track = video.textTracks[i],
                cues = track.cues,
                lastIdx = cues.length - 1;

            for (i = lastIdx; i >= 0 ; i--) {
                track.removeCue(cues[i]);
            }

            track.mode = "disabled";
            // The following jshint directive is used to suppressed the warning "Expected an identifier and instead saw 'default' (a reserved word)"
            /*jshint -W024 */
            track.default = false;
        }

    };
};