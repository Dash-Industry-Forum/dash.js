/**
 * @copyright The copyright in this software is being made available under the BSD License, included below. This software may be subject to other third party and contributor rights, including patent rights, and no such rights are granted under this license.
 *
 * Copyright (c) 2014, British Broadcasting Corporation
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met:
 * - Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer.
 * - Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or other materials provided with the distribution.
 * - Neither the name of the British Broadcasting Corporation nor the names of its contributors may be used to endorse or promote products derived from this software without specific prior written permission.
 *
 * @license THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 *
 * @param $ - jquery
 * @param d - the document
 *
 */

/*global $, jQuery, Dash, MediaPlayer, document */

var emsg = (function ($, d) {
    "use strict";

    // keep these global to emsg to save passing them around all over the place
    var canvas,
        ctx,

        /**
         * clear the canvas by drawing a rectangle over the whole canvas
         */
        clear = function () {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        },

        /**
         * Draw an X shape made up of two stroked paths
         * note the coordinates provided are based on the origin at bottom left
         * @param data - the contents of the emsg message_data
         */
        drawCross = function (data) {
            ctx.strokeStyle = data.colour;
            ctx.beginPath();
            ctx.moveTo(data.x1, canvas.height - data.y1);
            ctx.lineTo(data.x2, canvas.height - data.y2);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(data.x2, canvas.height - data.y1);
            ctx.lineTo(data.x1, canvas.height - data.y2);
            ctx.stroke();
        },

        /**
         * Draw a stroked rectangle
         * note the coordinates provided are based on the origin at bottom left
         * @param data - the contents of the emsg message_data
         */
        drawSquare = function (data) {
            ctx.strokeStyle = data.colour;
            ctx.strokeRect(
                data.x1,
                canvas.height - data.y2,
                data.x2 - data.x1,
                data.y2 - data.y1
            );
        },

        // LUT for known shape drawing methods
        shapeMethods = {
            "cross":    drawCross,
            "square":   drawSquare
        },

        /**
         * callback is called on cuechange by the track on the video
         * @param event - a js Event object
         */
        cueChangeHandler = function (event) {
            var track = event.target,
                cues = track.activeCues,
                numCues = cues.length,
                cue,
                messageData,
                method,
                i;

            // clear everything and redraw the active shapes each time
            // not the most efficient way, but probably the easiest
            clear();

            // loop through the active cues and make sense of them
            for (i = 0; i < numCues; i += 1) {
                cue = JSON.parse(cues[i].text);
                messageData = JSON.parse(cue.messageData);
                method = shapeMethods[messageData.shape];

                if (method) {
                    method(messageData);
                }
            }
        },

        /**
         * listen for TrackEvent-like events signalling that new tracks have
         * been added to the player.
         * @param event - a JS Event object
         */
        tracksChanged = function (event) {
            var type = event.type,
                track = event.track,
                siu = event.track.label.split(" ")[0],
                val = event.track.label.split(" ")[1];

            // is the track for a schemeIdUri and value we are interested in?
            if (siu === "tag:rdmedia.bbc.co.uk,2014:events/ballposition" &&
                    val === "1") {
                // yes, so add a cuechange event handler
                if (type === "addtrack") {
                    track.addEventListener("cuechange", cueChangeHandler);
                }
                // it's no longer around so don't listen for cuechanges
                if (type === "removetrack") {
                    track.removeEventListener("cuechange", cueChangeHandler);
                }
            }
        },

        /**
         * configure the canvas for drawing
         */
        setupOverlay = function () {
            // the canvas is in front of the video
            canvas = d.getElementById("overlay");
            ctx = canvas.getContext("2d");

            // set the actual height to the styled height
            canvas.width = $("#overlay").width();
            canvas.height = $("#overlay").height();
        };

    return {

        /**
         * create the player object and attach video and manifest
         */
        start: function () {
            var useEventBus = false,
                dashCtx = new Dash.di.DashContext(),
                player = new MediaPlayer(dashCtx),
                video = d.getElementById("v"),
                url = "http://rdmedia.bbc.co.uk/dash/ondemand/testcard/1/client_manifest-events.mpd";

            setupOverlay();

            // configure the DASH player
            player.startup();
            player.debug.setLogToBrowserConsole(false);
            player.setAutoPlay(true);

            // track events are dispatched on both eventBus and the
            // mediaelement. the main reason is that this does not require
            // knowledge of the video element if you have access to the
            // eventBus - this is good for internal use. it doesn't really
            // matter which is used. this demo uses the Video.TextTrackList.
            if (!useEventBus) {
                video.textTracks.addEventListener("addtrack", tracksChanged);
                video.textTracks.addEventListener("removetrack", tracksChanged);
            } else {
                player.addEventListener("addtrack", tracksChanged);
                player.addEventListener("removetrack", tracksChanged);
            }

            // the test content contains a high (8Mbps) representation and is
            // "longform" and on-demand. that combination makes this a problem:
            // https://code.google.com/p/chromium/issues/detail?id=421694
            // this can cause the buffer to stall when the top rate is selected
            // https://github.com/Dash-Industry-Forum/dash.js/issues/283 gives
            // more info - see my comments there if you are interested.
            // work around: forcably limit buffer size to minimum.
            player.setBufferMax("min");

            player.attachView(video);
            player.attachSource(url);
        }
    };
}(jQuery, document));

$(function () {
    "use strict";

    // once the page has loaded, start the player
    emsg.start();
});
