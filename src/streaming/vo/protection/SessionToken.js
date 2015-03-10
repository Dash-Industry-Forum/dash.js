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
/**
 * All session tokens returns by ProtectionModel implementations
 * are guaranteed to contain initialization data and optionally
 * session IDs
 *
 * @constructor
 */
MediaPlayer.models.SessionToken = function () {
    "use strict";
};

MediaPlayer.models.SessionToken.prototype = {

    /**
     * The initialization data used to create this session
     *
     * {Uint8Array} initialization data
     */
    initData: null,

    /**
     * The unique session ID designated to this session
     *
     * @return {string} the session ID or the empty string if the implementation
     * does not support session IDs or the sessionID has not yet been established
     */
    getSessionID: function() { return ""; },

    /**
     * The time, in milliseconds since 01 January, 1970 UTC, after which
     * the key(s) in the session will no longer be usable to decrypt
     * media data, or NaN if no such time exists
     *
     * @returns {Number} the expiration time
     */
    getExpirationTime: function() { return NaN; },

    /**
     * Returns a read-only map of key IDs known to the session to the
     * current status of the associated key.
     *
     * @returns {maplike<BufferSource,MediaKeyStatus>}
     */
    getKeyStatuses: function() { return null; }
};



