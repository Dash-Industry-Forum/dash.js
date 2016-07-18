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
 * Implementation of the EME APIs as of the 3 Feb 2014 state of the specification.
 *
 * Implemented by Internet Explorer 11 (Windows 8.1)
 *
 * @implements ProtectionModel
 * @class
 */

import ProtectionKeyController from '../controllers/ProtectionKeyController';
import NeedKey from '../vo/NeedKey';
import KeyError from '../vo/KeyError';
import KeyMessage from '../vo/KeyMessage';
import KeySystemConfiguration from '../vo/KeySystemConfiguration';
import KeySystemAccess from '../vo/KeySystemAccess';
import Events from '../../../core/events/Events';
import FactoryMaker from '../../../core/FactoryMaker';

function ProtectionModel_3Feb2014(config) {

    let context = this.context;
    let eventBus = config.eventBus;//Need to pass in here so we can use same instance since this is optional module
    let log = config.log;
    let api = config.api;


    let instance,
        videoElement,
        keySystem,
        mediaKeys,
        keySystemAccess,
        sessions,
        eventHandler,
        protectionKeyController;

    function setup() {
        videoElement = null;
        keySystem = null;
        mediaKeys = null;
        keySystemAccess = null;
        sessions = [];
        protectionKeyController = ProtectionKeyController(context).getInstance();
        eventHandler = createEventHandler();
    }

    function reset() {
        try {
            for (var i = 0; i < sessions.length; i++) {
                closeKeySession(sessions[i]);
            }
            if (videoElement) {
                videoElement.removeEventListener(api.needkey, eventHandler);
            }
            eventBus.trigger(Events.TEARDOWN_COMPLETE);
        } catch (error) {
            eventBus.trigger(Events.TEARDOWN_COMPLETE, {error: 'Error tearing down key sessions and MediaKeys! -- ' + error.message});
        }
    }

    function getKeySystem() {
        return keySystem;
    }

    function getAllInitData() {
        var retVal = [];
        for (var i = 0; i < sessions.length; i++) {
            retVal.push(sessions[i].initData);
        }
        return retVal;
    }

    function requestKeySystemAccess(ksConfigurations) {

        // Try key systems in order, first one with supported key system configuration
        // is used
        var found = false;
        for (var ksIdx = 0; ksIdx < ksConfigurations.length; ksIdx++) {
            var systemString = ksConfigurations[ksIdx].ks.systemString;
            var configs = ksConfigurations[ksIdx].configs;
            var supportedAudio = null;
            var supportedVideo = null;

            // Try key system configs in order, first one with supported audio/video
            // is used
            for (var configIdx = 0; configIdx < configs.length; configIdx++) {
                var audios = configs[configIdx].audioCapabilities;
                var videos = configs[configIdx].videoCapabilities;

                // Look for supported audio container/codecs
                if (audios && audios.length !== 0) {
                    supportedAudio = []; // Indicates that we have a requested audio config
                    for (var audioIdx = 0; audioIdx < audios.length; audioIdx++) {
                        if (window[api.MediaKeys].isTypeSupported(systemString, audios[audioIdx].contentType)) {
                            supportedAudio.push(audios[audioIdx]);
                        }
                    }
                }

                // Look for supported video container/codecs
                if (videos && videos.length !== 0) {
                    supportedVideo = []; // Indicates that we have a requested video config
                    for (var videoIdx = 0; videoIdx < videos.length; videoIdx++) {
                        if (window[api.MediaKeys].isTypeSupported(systemString, videos[videoIdx].contentType)) {
                            supportedVideo.push(videos[videoIdx]);
                        }
                    }
                }

                // No supported audio or video in this configuration OR we have
                // requested audio or video configuration that is not supported
                if ((!supportedAudio && !supportedVideo) ||
                    (supportedAudio && supportedAudio.length === 0) ||
                    (supportedVideo && supportedVideo.length === 0)) {
                    continue;
                }

                // This configuration is supported
                found = true;
                var ksConfig = new KeySystemConfiguration(supportedAudio, supportedVideo);
                var ks = protectionKeyController.getKeySystemBySystemString(systemString);
                eventBus.trigger(Events.KEY_SYSTEM_ACCESS_COMPLETE, {data: new KeySystemAccess(ks, ksConfig)});
                break;
            }
        }
        if (!found) {
            eventBus.trigger(Events.KEY_SYSTEM_ACCESS_COMPLETE, {error: 'Key system access denied! -- No valid audio/video content configurations detected!'});
        }
    }

    function selectKeySystem(ksAccess) {
        try {
            mediaKeys = ksAccess.mediaKeys = new window[api.MediaKeys](ksAccess.keySystem.systemString);
            keySystem = ksAccess.keySystem;
            keySystemAccess = ksAccess;
            if (videoElement) {
                setMediaKeys();
            }
            eventBus.trigger(Events.INTERNAL_KEY_SYSTEM_SELECTED);
        } catch (error) {
            eventBus.trigger(Events.INTERNAL_KEY_SYSTEM_SELECTED, {error: 'Error selecting keys system (' + keySystem.systemString + ')! Could not create MediaKeys -- TODO'});
        }
    }

    function setMediaElement(mediaElement) {
        if (videoElement === mediaElement)
            return;

        // Replacing the previous element
        if (videoElement) {
            videoElement.removeEventListener(api.needkey, eventHandler);
        }

        videoElement = mediaElement;

        // Only if we are not detaching from the existing element
        if (videoElement) {
            videoElement.addEventListener(api.needkey, eventHandler);
            if (mediaKeys) {
                setMediaKeys();
            }
        }
    }

    function createKeySession(initData /*, keySystemType */) {

        if (!keySystem || !mediaKeys || !keySystemAccess) {
            throw new Error('Can not create sessions until you have selected a key system');
        }

        // Use the first video capability for the contentType.
        // TODO:  Not sure if there is a way to concatenate all capability data into a RFC6386-compatible format

        // If player is trying to playback Audio only stream - don't error out.
        var capabilities = null;

        if (keySystemAccess.ksConfiguration.videoCapabilities !== null && keySystemAccess.ksConfiguration.videoCapabilities.length > 0)
          capabilities = keySystemAccess.ksConfiguration.videoCapabilities[0];

        if (capabilities === null && keySystemAccess.ksConfiguration.audioCapabilities !== null && keySystemAccess.ksConfiguration.audioCapabilities.length > 0)
          capabilities = keySystemAccess.ksConfiguration.audioCapabilities[0];

        if (capabilities === null)
          throw new Error('Can not create sessions for unknown content types.');

        var contentType = capabilities.contentType;
        var session = mediaKeys.createSession(contentType, new Uint8Array(initData));
        var sessionToken = createSessionToken(session, initData);

        // Add all event listeners
        session.addEventListener(api.error, sessionToken);
        session.addEventListener(api.message, sessionToken);
        session.addEventListener(api.ready, sessionToken);
        session.addEventListener(api.close, sessionToken);

        // Add to our session list
        sessions.push(sessionToken);
        log('DRM: Session created.  SessionID = ' + sessionToken.getSessionID());
        eventBus.trigger(Events.KEY_SESSION_CREATED, {data: sessionToken});
    }

    function updateKeySession(sessionToken, message) {

        var session = sessionToken.session;

        if (!protectionKeyController.isClearKey(keySystem)) {
            // Send our request to the key session
            session.update(new Uint8Array(message));
        } else {
            // For clearkey, message is a ClearKeyKeySet
            session.update(new Uint8Array(message.toJWK()));
        }
    }

    /**
     * Close the given session and release all associated keys.  Following
     * this call, the sessionToken becomes invalid
     *
     * @param {Object} sessionToken - the session token
     */
    function closeKeySession(sessionToken) {

        var session = sessionToken.session;

        // Remove event listeners
        session.removeEventListener(api.error, sessionToken);
        session.removeEventListener(api.message, sessionToken);
        session.removeEventListener(api.ready, sessionToken);
        session.removeEventListener(api.close, sessionToken);

        // Remove from our session list
        for (var i = 0; i < sessions.length; i++) {
            if (sessions[i] === sessionToken) {
                sessions.splice(i,1);
                break;
            }
        }

        // Send our request to the key session
        session[api.release]();
    }

    function setServerCertificate(/*serverCertificate*/) { /* Not supported */ }
    function loadKeySession(/*sessionID*/) { /* Not supported */ }
    function removeKeySession(/*sessionToken*/) { /* Not supported */ }


    function createEventHandler() {
        return {
            handleEvent: function (event) {
                switch (event.type) {

                    case api.needkey:
                        if (event.initData) {
                            var initData = ArrayBuffer.isView(event.initData) ? event.initData.buffer : event.initData;
                            eventBus.trigger(Events.NEED_KEY, {key: new NeedKey(initData, 'cenc')});
                        }
                        break;
                }
            }
        };
    }


    // IE11 does not let you set MediaKeys until it has entered a certain
    // readyState, so we need this logic to ensure we don't set the keys
    // too early
    function setMediaKeys() {
        var boundDoSetKeys = null;
        var doSetKeys = function () {
            videoElement.removeEventListener('loadedmetadata', boundDoSetKeys);
            videoElement[api.setMediaKeys](mediaKeys);
            eventBus.trigger(Events.VIDEO_ELEMENT_SELECTED);
        };
        if (videoElement.readyState >= 1) {
            doSetKeys();
        } else {
            boundDoSetKeys = doSetKeys.bind(this);
            videoElement.addEventListener('loadedmetadata', boundDoSetKeys);
        }

    }

    // Function to create our session token objects which manage the EME
    // MediaKeySession and session-specific event handler
    function createSessionToken(keySession, initData) {
        return {
            // Implements SessionToken
            session: keySession,
            initData: initData,

            getSessionID: function () {
                return this.session.sessionId;
            },

            getExpirationTime: function () {
                return NaN;
            },

            getSessionType: function () {
                return 'temporary';
            },
            // This is our main event handler for all desired MediaKeySession events
            // These events are translated into our API-independent versions of the
            // same events
            handleEvent: function (event) {
                switch (event.type) {

                    case api.error:
                        var errorStr = 'KeyError'; // TODO: Make better string from event
                        eventBus.trigger(Events.KEY_ERROR, { data: new KeyError(this, errorStr) });
                        break;
                    case api.message:
                        var message = ArrayBuffer.isView(event.message) ? event.message.buffer : event.message;
                        eventBus.trigger(Events.INTERNAL_KEY_MESSAGE, { data: new KeyMessage(this, message, event.destinationURL) });
                        break;
                    case api.ready:
                        log('DRM: Key added.');
                        eventBus.trigger(Events.KEY_ADDED);
                        break;

                    case api.close:
                        log('DRM: Session closed.  SessionID = ' + this.getSessionID());
                        eventBus.trigger(Events.KEY_SESSION_CLOSED, { data: this.getSessionID() });
                        break;
                }
            }
        };
    }

    instance = {
        getAllInitData: getAllInitData,
        requestKeySystemAccess: requestKeySystemAccess,
        getKeySystem: getKeySystem,
        selectKeySystem: selectKeySystem,
        setMediaElement: setMediaElement,
        createKeySession: createKeySession,
        updateKeySession: updateKeySession,
        closeKeySession: closeKeySession,
        setServerCertificate: setServerCertificate,
        loadKeySession: loadKeySession,
        removeKeySession: removeKeySession,
        reset: reset
    };

    setup();

    return instance;
}

ProtectionModel_3Feb2014.__dashjs_factory_name = 'ProtectionModel_3Feb2014';
export default FactoryMaker.getClassFactory(ProtectionModel_3Feb2014);
