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
 * {@link module:ProtectionController}
 *
 * @interface ProtectionModel
 * @ignore
 */

const ProtectionModel = function () { };

/**
 * Returns an array of all initialization data currently used by
 * active sessions.
 * @function
 * @instance
 * @name getAllInitData
 * @memberof ProtectionModel
 * @returns {Array.<ArrayBuffer>} an array of initialization data buffers
 */

/**
 * Determine if the user-agent supports one of the given key systems and
 * content type configurations. Sends ENAME_KEY_SYSTEM_ACCESS_COMPLETE event
 * with a KeySystemAccess object as event data
 *
 * @function
 * @instance
 * @name requestKeySystemAccess
 * @memberof ProtectionModel
 *
 * @param {Array.<Object>} ksConfigurations array of desired key system
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
 * @instance
 * @name selectKeySystem
 * @memberof ProtectionModel
 * @param keySystemAccess {MediaPlayer.vo.protection.KeySystemAccess} the key
 * system access token representing a supported key system
 */

/**
 * Associate this protection model with a HTMLMediaElement
 *
 * @function
 * @instance
 * @name setMediaElement
 * @memberof ProtectionModel
 * @param mediaElement {HTMLMediaElement} the media element to
 * which we should associate this protection model and all current
 * key sessions
 */

/**
 * Creates a new key session using the given initData and type. Sends
 * KEY_SESSION_CREATED event with MediaPlayer.vo.protection.SessionToken
 * as data.
 *
 * @function
 * @instance
 * @name createKeySession
 * @memberof ProtectionModel
 * @param {ArrayBuffer} initData PSSH box for the currently selected
 * key system.
 * @param {ProtectionData} protData Protection data for the currently selected
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
 * @instance
 * @name updateKeySession
 * @memberof ProtectionModel
 * @param {MediaPlayer.vo.protection.SessionToken} sessionToken the session
 * token
 * @param {ArrayBuffer} message the message that should be delivered to the CDM
 * for this session
 */

/**
 * Loads the persisted key session data associated with the given sessionID
 * into a new session.  Sends KEY_SESSION_CREATED event with
 * {@MediaPlayer.vo.protection.SessionToken} as data.
 *
 * @function
 * @instance
 * @name loadKeySession
 * @memberof ProtectionModel
 * @param {string} sessionID the session ID corresponding to the persisted
 * session data to be loaded
 * @param {ArrayBuffer} the corresponding initData PSSH box for the currently
 * selected key system.
 */

/**
 * Removes any persisted key session data associated with the given session.
 * Also closes the session.  Sends KEY_SESSION_REMOVED and
 * ENAME_KEY_SESSION_CLOSED with sessionID as data
 *
 * @function
 * @instance
 * @name removeKeySession
 * @memberof ProtectionModel
 * @param {SessionToken} sessionToken the session
 * token
 */

/**
 * Close the given session and release all associated keys.  Following
 * this call, the sessionToken becomes invalid.  Sends KEY_SESSION_CLOSED
 * with sessionID as data
 *
 * @function
 * @instance
 * @name closeKeySession
 * @memberof ProtectionModel
 * @param sessionToken the session token
 */

/**
 * Sets the certificate to be used by the CDM for encrypting messages
 *
 * @function
 * @instance
 * @name setServerCertificate
 * @memberof ProtectionModel
 * @param {ArrayBuffer} serverCertificate
 */

/**
 * Currently selected key system.  Will be null or undefined if no key
 * system has yet been selected
 *
 * @instance
 * @name keySystem
 * @memberof ProtectionModel
 * @readonly
 * @type MediaPlayer.dependencies.protection.KeySystem
 */

export default ProtectionModel;
