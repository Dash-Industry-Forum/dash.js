// The copyright in this software is being made available under the BSD License, included below. This software may be subject to other third party and contributor rights, including patent rights, and no such rights are granted under this license.
//
// Copyright (c) 2013, Microsoft Open Technologies, Inc. 
//
// All rights reserved.
// Redistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met:
//     -             Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer.
//     -             Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or other materials provided with the distribution.
//     -             Neither the name of the Microsoft Open Technologies, Inc. nor the names of its contributors may be used to endorse or promote products derived from this software without specific prior written permission.
//
// THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.

/**
 * Defines the public interface for all ProtectionModel implementations.
 *
 * ProtectionModel implementations provide access to particular versions
 * of the Encrypted Media Extensions (EME) APIs that have been implemented
 * in a user agent
 */
MediaPlayer.models.ProtectionModel = {
    /**
     * Determine if the user-agent supports the given key system and
     * content type
     *
     * @param keySystem {KeySystem} the key system of interest
     * @param contentType {String} content description string (MIME type; codec)
     * @return {boolean} true if the given combination of keySystem/contentType
     * is supported by the user-agent, false otherwise
     *
     isSupported: function(keySystem, contentType) { return false; },
     */

    /**
     * Selects the desired key system to use for this MediaPlayer
     *
     * @param keySystem {KeySystem} the desired key system to use for
     * all license requests
     *
     selectKeySystem: function(keySystem) { },
     */

    /**
     * Associate this protection model with a HTMLMediaElement
     *
     * @param mediaElement {HTMLMediaElement} the media element to
     * which we should associate this protection model and all current
     * key sessions
     *
     setMediaElement: function(mediaElement) { },
     */

    /**
     * Creates a new key session using the given initData and type
     *
     * @param initData {ArrayBuffer} CDM initialization data
     * @param contentType {String} Content MIME type and codec
     * @param [initDataType] {String} the type of the initData
     * @return {*} an opaque session token that can be used
     * for future operations on the session or null if a session
     * already exists for the given initialization data
     *
     createKeySession: function(initData, contentType, initDataType) { return null; },
     */

    /**
     * Update the given key session with a key (or any other message
     * intended for the CDM)
     *
     * @param sessionToken the session token
     * @param message the message that should be delivered to the CDM
     * for this session
     *
     updateKeySession: function(sessionToken, message) { },
     */

    /**
     * Close the given session and release all associated keys.  Following
     * this call, the sessionToken becomes invalid
     *
     * @param sessionToken the session token
     *
     closeKeySession: function(sessionToken) {},
     */

    /**
     * Sets the certificate to be used by the CDM for encrypting messages
     *
     * @param serverCertificate
     *
     setServerCertificate: function(serverCertificate) {},
     */

    /**
     * Selected key system
     *
     keySystem: undefined
     */
};

MediaPlayer.models.ProtectionModel.eventList = {
    ENAME_NEED_KEY: "needkey",
    ENAME_KEY_MESSAGE: "keyMessage",
    ENAME_KEY_ADDED: "keyAdded",
    ENAME_KEY_ERROR: "keyError",
    ENAME_KEY_SESSION_CREATED: "keySessionCreated",
    ENAME_KEY_SESSION_LOADED: "keySessionLoaded",
    ENAME_KEY_SESSION_UNLOADED: "keySessionUnloaded",
    ENAME_KEY_SESSION_CLOSED: "keySessionClosed"
};
