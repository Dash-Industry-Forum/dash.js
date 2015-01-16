/* The copyright in this software is being made available under the BSD License, included below. This software may be subject to other third party and contributor rights, including patent rights, and no such rights are granted under this license.
*
* Copyright (c) 2014, Akamai Technologies
* All rights reserved.
*
* Redistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met:
    * •  Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer.
* •  Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or other materials provided with the distribution.
* •  Neither the name of the Akamai Technologies nor the names of its contributors may be used to endorse or promote products derived from this software without specific prior written permission.
*
* THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS “AS IS” AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
*/
/*jshint unused:false*/

var MANIFEST_TYPE = "application/dash+xml";
var aPlayers;

/**
 *  A new MediaPlayer is instantiated for the supplied videoElement and the appropriate source is assigned.
 * The autoplay property of the videoElement is preserved. Any preload attribute is ignored. This method should be called after the page onLoad event is dispatched.
 * @param video
 * @returns {MediaPlayer}
 */
var createDashPlayer = function(video)
{
    var player, sources = video.querySelectorAll("source");
    for (var j = 0; j < sources.length; j++)
    {
        var source = sources[j];
        if (source.type == MANIFEST_TYPE) {
            var context = new Dash.di.DashContext();
            player = new MediaPlayer(context);
            player.startup();
            player.attachView(video);
            player.setAutoPlay(video.autoplay);
            player.attachSource(source.src);
            player.getDebug().log("Converted videoElement to dash.js player and added content: " + source.src);
            break;
        }
    }
    return player;
};

/**
 * Searches the DOM for all instances of the class 'dashjs-player'. It then looks for those which have a source element defined with a type matching 'application/dash+xml'.
 * A new MediaPlayer is instantiated for each matching videoElement and the appropriate source is assigned.
 * The autoplay property of the videoElement is preserved. Any preload attribute is ignored. This method should be called after the page onLoad event is dispatched.
 * Returns an array holding all the MediaPlayers that were added by this method.
 * @returns [MediaPlayer]
 */
var createDashPlayers = function()

{
    "use strict";
    aPlayers = [];
    var videos = document.querySelectorAll(".dashjs-player");
    for (var i = 0; i < videos.length; i++) {
        var player = createDashPlayer(videos[i]);
        aPlayers.push(player);
    }
    return aPlayers;
};
