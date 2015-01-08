/*
 * The copyright in this software is being made available under the BSD License, included below. This software may be subject to other third party and contributor rights, including patent rights, and no such rights are granted under this license.
 * 
 * Copyright (c) 2013, Digital Primates
 * All rights reserved.
 * 
 * Redistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met:
 * •  Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer.
 * •  Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or other materials provided with the distribution.
 * •  Neither the name of the Digital Primates nor the names of its contributors may be used to endorse or promote products derived from this software without specific prior written permission.
 * 
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS “AS IS” AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */
MediaPlayer.utils.Capabilities = function () {
    "use strict";
};

MediaPlayer.utils.Capabilities.prototype = {
    constructor: MediaPlayer.utils.Capabilities,
    system: undefined,
    debug: undefined,

    supportsMediaSource: function () {
        "use strict";

        var hasWebKit = ("WebKitMediaSource" in window),
            hasMediaSource = ("MediaSource" in window);

        return (hasWebKit || hasMediaSource);
    },

    /**
     * Returns whether Encrypted Media Extensions are supported on this
     * user agent
     *
     * @param element the video element
     * @return {boolean} true if EME is supported, false otherwise
     */
    supportsEncryptedMedia: function (element) {
        if (this.system.hasMapping('protectionModel')) {
            return true;
        }

        // Detect EME APIs.  Look for newest API versions first
        if (MediaPlayer.models.ProtectionModel_3Feb2014.detect(element)) {
            this.system.mapClass('protectionModel', MediaPlayer.models.ProtectionModel_3Feb2014);
            return true;
        }
        if (MediaPlayer.models.ProtectionModel_01b.detect(element)) {
            this.system.mapClass('protectionModel', MediaPlayer.models.ProtectionModel_01b);
            return true;
        }

        this.debug.log("No supported version of EME detected on this user agent!");
        this.debug.log("Attempts to play encrypted content will fail!");
        return false;
    },

    supportsCodec: function (element, codec) {
        "use strict";

        if (!(element instanceof HTMLMediaElement)) {
            throw "element must be of type HTMLMediaElement.";
        }

        var canPlay = element.canPlayType(codec);
        return (canPlay === "probably" || canPlay === "maybe");
    }
};