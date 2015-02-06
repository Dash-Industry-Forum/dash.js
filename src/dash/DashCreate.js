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


/**
 *  A new MediaPlayer is instantiated for the supplied videoElement and optional source and context.  If no context is provided,
 *  a default DashContext is used. If no source is provided, the videoElement is interrogated to extract the first source whose
 *  type is application/dash+xml.
 * The autoplay property of the videoElement is preserved. Any preload attribute is ignored. This method should be called after the page onLoad event is dispatched.
 * @param video
 * @param source
 * @param context
 * @returns {MediaPlayer}
 */
Dash.create = function(video, source, context)
{
    if (typeof video === "undefined" || video.nodeName != "VIDEO") return null;

    var player, videoID = (video.id || video.name || "video element");
    context = context || new Dash.di.DashContext();
    source = source || [].slice.call(video.querySelectorAll("source")).filter(function(s){return s.type == Dash.supportedManifestMimeTypes.mimeType;})[0];

    player = new MediaPlayer(context);
    player.startup();
    player.attachView(video);
    player.setAutoPlay(video.autoplay);
    player.attachSource(source.src);
    player.getDebug().log("Converted " + videoID + " to dash.js player and added content: " + source.src);
    return player;
};

/**
 * Searches the provided scope for all instances of the indicated className. If no scope is provided, document is used. If no className is
 * specified, dashjs-player is used. It then looks for those video elements which have a source element defined with a type matching 'application/dash+xml'.
 * A new MediaPlayer is instantiated for each matching video element and the appropriate source is assigned.
 * The autoplay property of the video element is preserved. Any preload attribute is ignored. This method should be called after the page onLoad event is dispatched.
 * Returns an array holding all the MediaPlayer instances that were added by this method.
 * @param className
 * @param scope
 * @param context
 * @returns {Array} an array of MediaPlayer objects
 */
Dash.createAll = function(className, scope, context)
{
    var aPlayers = [];
    className = className || ".dashjs-player";
    scope = scope || document;
    context = context || new Dash.di.DashContext();
    var videos = scope.querySelectorAll(className);
    for (var i = 0; i < videos.length; i++) {
        var player = Dash.create(videos[i], undefined , context);
        aPlayers.push(player);
    }
    return aPlayers;
};

/**
 * Returns the mime-type identifier for any source content to be accepted as a dash manifest by the Dash.create() method.
 * @type {string}
 */
Dash.supportedManifestMimeTypes = {
    mimeType: "application/dash+xml"
};
