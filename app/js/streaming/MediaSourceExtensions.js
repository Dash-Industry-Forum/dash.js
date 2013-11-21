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
MediaPlayer.dependencies.MediaSourceExtensions = function () {
    "use strict";
};

MediaPlayer.dependencies.MediaSourceExtensions.prototype = {
    constructor: MediaPlayer.dependencies.MediaSourceExtensions,

    createMediaSource: function () {
        "use strict";

        var hasWebKit = ("WebKitMediaSource" in window),
            hasMediaSource = ("MediaSource" in window);

        if (hasMediaSource) {
            return Q.when(new MediaSource());
        } else if (hasWebKit) {
            return Q.when(new WebKitMediaSource());
        }

        return null;
    },

    attachMediaSource: function (source, videoModel) {
        "use strict";

        videoModel.setSource(window.URL.createObjectURL(source));
        return Q.when(true);
    },

    detachMediaSource: function (videoModel) {
        "use strict";
        // it seems that any value passed to the setSource is cast to a sting when setting element.src,
        // so we cannot use null or undefined to reset the element. Use empty string instead.
        videoModel.setSource("");
        return Q.when(true);
    },

    setDuration: function (source, value) {
        "use strict";

        source.duration = value;
        return Q.when(source.duration);
    },

    signalEndOfStream: function(source) {
        "use strict";

        source.endOfStream();
        return Q.when(true);
    }
};