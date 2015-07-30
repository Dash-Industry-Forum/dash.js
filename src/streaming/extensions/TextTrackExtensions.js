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
MediaPlayer.utils.TextTrackExtensions = function () {
    "use strict";
    var Cue,
        textTrackQueue = [];

    return {
        setup: function() {
            Cue = window.VTTCue || window.TextTrackCue;
        },

        addTextTrack: function(textTrackInfoVO, totalTextTracks) {

            textTrackQueue.push(textTrackInfoVO);

            if(textTrackQueue.length === totalTextTracks) {

                if (totalTextTracks > 1) { // sort multi text tracks alphabetically.
                    textTrackQueue.sort(function(a,b) {
                        return a.lang > b.lang;
                    });
                }

                for(var item in textTrackQueue) {
                    this.video = textTrackQueue[item].video;

                    //TODO: Ability to define the KIND in the MPD - ie subtitle vs caption....Use role ? //<Role schemeIdUri="urn:mpeg:dash:role" value="subtitle"/>
                    this.track = this.video.addTextTrack("captions", textTrackQueue[item].label, textTrackQueue[item].lang);
                    // track.default is an object property identifier that is a reserved word
                    // The following jshint directive is used to suppressed the warning "Expected an identifier and instead saw 'default' (a reserved word)"
                    /*jshint -W024 */
                    this.track.default = textTrackQueue[item].defaultTrack;
                    this.track.mode = textTrackQueue[item].defaultTrack ? "showing" : "hidden";
                    this.addCaptions(0, textTrackQueue[item].captionData);
                }
            }
        },

        addCaptions: function(timeOffset, captionData) {
            for(var item in captionData) {
                var cue;
                var currentItem = captionData[item];
                var video=this.video;

                //image subtitle extracted from TTML
                if(currentItem.type=="image"){
                    cue = new Cue(currentItem.start-timeOffset, currentItem.end-timeOffset, "");
                    cue.image=currentItem.data;
                    cue.id=currentItem.id;
                    cue.size=0; //discard the native display for this subtitles
                    cue.type="image"; // active image overlay
                    cue.onenter =  function () {
                        var img = new Image();
                        img.id = 'ttmlImage_'+this.id;
                        img.src = this.image;
                        img.className = 'cue-image';
                        video.parentNode.appendChild(img);
                    };

                    cue.onexit =  function () {
                        var imgs = video.parentNode.childNodes;
                        var i;
                        for(i=0;i<imgs.length;i++){
                            if(imgs[i].id=='ttmlImage_'+this.id){
                                video.parentNode.removeChild(imgs[i]);
                            }
                        }
                    };
                }
                else{
                    cue = new Cue(currentItem.start-timeOffset, currentItem.end-timeOffset, currentItem.data);
                    if(currentItem.styles){
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
                    }
                }
                this.track.addCue(cue);
            }
        },
        deleteCues: function(video) {
            //when multiple tracks are supported - iterate through and delete all cues from all tracks.
            var i = 0,
                firstValidTrack = false,
                totalTracks = textTrackQueue.length;

            //Find the first track in the TextTrackList that has valid cues.
            // The reason for this step is there is no API on video to removeTextTrack once added, just cues inside of track and to mark track as disabled.
            // Since there may be disable tracks with no cues
            while (!firstValidTrack)
            {
                var t = video.textTracks[i];
                t.mode = "showing";// If track mode = disabled track.cue has no length so put mode to showing to get cues.length.
                if (t.cues.length > 0)
                {
                    firstValidTrack = true;
                    break;
                } else {
                    t.mode = "disabled";
                }
                i++;
            }

            for(var j = i; j < i+totalTracks; j++) {

                var track = video.textTracks[j],
                    cues = track.cues,
                    lastIdx = cues.length - 1;

                for (var r = lastIdx; r >= 0 ; r--) {
                    track.removeCue(cues[r]);
                }

                track.mode = "disabled";
                // The following jshint directive is used to suppressed the warning "Expected an identifier and instead saw 'default' (a reserved word)"
                /*jshint -W024 */
                track.default = false;
            }

            textTrackQueue = [];
        }

    };
};