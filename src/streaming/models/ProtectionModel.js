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
 * Defines the public interface for all ProtectionModel implementations.
 *
 * ProtectionModel implementations provide access to particular versions
 * of the Encrypted Media Extensions (EME) APIs that have been implemented
 * in a user agent.  Developers wishing to add support for a new EME version
 * found in a target user-agent should add a new instance of this interface
 * to the
 *
 * Applications should not need direct access to this object.  All interactions with
 * the protection system should be performed with
 * {@link MediaPlayer.dependencies.ProtectionController}
 *
 * @interface MediaPlayer.models.ProtectionModel
 */

MediaPlayer.models.ProtectionModel = function() { };

/**
 * Returns an array of all initialization data currently used by
 * active sessions.
 *
 * @function
 * @name MediaPlayer.models.ProtectionModel#getAllInitData
 * @returns {ArrayBuffer[]} an array of initialization data buffers
 */

/**
 * Determine if the user-agent supports one of the given key systems and
 * content type configurations. Sends ENAME_KEY_SYSTEM_ACCESS_COMPLETE event
 * with a KeySystemAccess object as event data
 *
 * @function
 * @name MediaPlayer.models.ProtectionModel#requestKeySystemAccess
 * @param {Object[]} ksConfigurations array of desired key system
 * configurations in priority order (highest priority first)
 * @param {MediaPlayer.dependencies.protection.KeySystem} ksConfigurations.ks
 * the key system
 * @param {MediaPlayer.vo.protection.KeySystemConfiguration[]} ksConfigurations.configs
 * array of acceptable key system configurations
 * for this key system in priority order (highest priority first)
 */

/**
 * Selects the key system to use for all future operations on this
 * ProtectionModel.  Sends ENAME_KEY_SYSTEM_SELECTED with no data
 *
 * @function
 * @name MediaPlayer.models.ProtectionModel#selectKeySystem
 * @param keySystemAccess {MediaPlayer.vo.protection.KeySystemAccess} the key
 * system access token representing a supported key system
 */

/**
 * Associate this protection model with a HTMLMediaElement
 *
 * @function
 * @name MediaPlayer.models.ProtectionModel#setMediaElement
 * @param mediaElement {HTMLMediaElement} the media element to
 * which we should associate this protection model and all current
 * key sessions
 */

/**
 * Creates a new key session using the given initData and type. Sends
 * ENAME_KEY_SESSION_CREATED event with MediaPlayer.vo.protection.SessionToken
 * as data.
 *
 * @function
 * @name MediaPlayer.models.ProtectionModel#createKeySession
 * @param {ArrayBuffer} initData PSSH box for the currently selected
 * key system.
 * @param {string} sessionType the desired session type.  One of "temporary",
 * "persistent-license", "persistent-release-message".  CDM implementations
 * are not required to support anything except "temporary"
 */

/**
 * Update the given key session with a key (or any other message
 * intended for the CDM)
 *
 * @function
 * @name MediaPlayer.models.ProtectionModel#updateKeySession
 * @param {MediaPlayer.vo.protection.SessionToken} sessionToken the session
 * token
 * @param {ArrayBuffer} message the message that should be delivered to the CDM
 * for this session
 */

/**
 * Loads the persisted key session data associated with the given sessionID
 * into a new session.  Sends ENAME_KEY_SESSION_CREATED event with
 * {@MediaPlayer.vo.protection.SessionToken} as data.
 *
 * @function
 * @name MediaPlayer.models.ProtectionModel#loadKeySession
 * @param {string} sessionID the session ID corresponding to the persisted
 * session data to be loaded
 */

/**
 * Removes any persisted key session data associated with the given session.
 * Also closes the session.  Sends ENAME_KEY_SESSION_REMOVED and
 * ENAME_KEY_SESSION_CLOSED with sessionID as data
 *
 * @function
 * @name MediaPlayer.models.ProtectionModel#removeKeySession
 * @param {MediaPlayer.vo.protection.SessionToken} sessionToken the session
 * token
 */

/**
 * Close the given session and release all associated keys.  Following
 * this call, the sessionToken becomes invalid.  Sends ENAME_KEY_SESSION_CLOSED
 * with sessionID as data
 *
 * @function
 * @name MediaPlayer.models.ProtectionModel#closeKeySession
 * @param sessionToken the session token
 */

/**
 * Sets the certificate to be used by the CDM for encrypting messages
 *
 * @function
 * @name MediaPlayer.models.ProtectionModel#setServerCertificate
 * @param {ArrayBuffer} serverCertificate
 */

/**
 * Currently selected key system.  Will be null or undefined if no key
 * system has yet been selected
 *
 * @instance
 * @name keySystem
 * @memberof MediaPlayer.models.ProtectionModel
 * @readonly
 * @type MediaPlayer.dependencies.protection.KeySystem
 */


/**
 * Event IDs for events sent by ProtectionModel implementations. Use these
 * event names when subscribing or unsubscribing from ProtectionModel events.
 *
 * @enum {String}
 */
MediaPlayer.models.ProtectionModel.eventList = {
    /**
     * Event ID for needkey/encrypted events
     *
     * @constant
     */
    ENAME_NEED_KEY: "needkey",
    /**
     * Event ID for events delivered when a key system access procedure
     * has completed
     *
     * @constant
     */
    ENAME_KEY_SYSTEM_ACCESS_COMPLETE: "keySystemAccessComplete",
    /**
     * Event ID for events delivered when a key system selection procedure
     * completes
     *
     * @constant
     */
    ENAME_KEY_SYSTEM_SELECTED: "keySystemSelected",
    /**
     * Event ID for events delivered when a HTMLMediaElement has been
     * associated with the protection set
     *
     * @constant
     */
    ENAME_VIDEO_ELEMENT_SELECTED: "videoElementSelected",
    /**
     * Event ID for events delivered when a new server certificate has
     * been delivered to the CDM
     *
     * @constant
     */
    ENAME_SERVER_CERTIFICATE_UPDATED: "serverCertificateUpdated",
    /**
     * Event ID for events delivered when the protection set receives
     * a key message from the CDM
     *
     * @constant
     */
    ENAME_KEY_MESSAGE: "keyMessage",
    /**
     * Event ID for events delivered when a new key has been added
     *
     * @constant
     * @deprecated The latest versions of the EME specification no longer
     * use this event.  {@MediaPlayer.models.protectionModel.eventList.ENAME_KEY_STATUSES_CHANGED}
     * is preferred.
     */
    ENAME_KEY_ADDED: "keyAdded",
    /**
     * Event ID for events delivered when an error is encountered by the CDM
     * while processing a license server response message
     *
     * @constant
     */
    ENAME_KEY_ERROR: "keyError",
    /**
     * Event ID for events delivered when a new key sessions creation
     * process has completed
     *
     * @constant
     */
    ENAME_KEY_SESSION_CREATED: "keySessionCreated",
    /**
     * Event ID for events delivered when a key session removal
     * process has completed
     *
     * @constant
     */
    ENAME_KEY_SESSION_REMOVED: "keySessionRemoved",
    /**
     * Event ID for events delivered when a key session close
     * process has completed
     *
     * @constant
     */
    ENAME_KEY_SESSION_CLOSED: "keySessionClosed",
    /**
     * Event ID for events delivered when the status of one or more
     * decryption keys has changed
     *
     * @constant
     */
    ENAME_KEY_STATUSES_CHANGED: "keyStatusesChanged",
    /**
     * Event ID for events delivered when the process of shutting down
     * a protection set has completed
     *
     * @constant
     */
    ENAME_TEARDOWN_COMPLETE: "protectionTeardownComplete",
};

/**
 * needkey/encrypted event
 */
