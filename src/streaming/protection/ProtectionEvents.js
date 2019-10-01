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
import EventsBase from '../../core/events/EventsBase';
/**
 * @class
  */
class ProtectionEvents extends EventsBase {
    /**
     * @description Public facing external events to be used when including protection package.
     * All public events will be aggregated into the MediaPlayerEvents Class and can be accessed
     * via MediaPlayer.events.  public_ is the prefix that we use to move event names to MediaPlayerEvents.
     */
    constructor () {
        super();

        /**
         * Event ID for events delivered when the protection set receives
         * a key message from the CDM
         *
         * @ignore
         */
        this.INTERNAL_KEY_MESSAGE = 'internalKeyMessage';

        /**
         * Event ID for events delivered when a key system selection procedure
         * completes
         * @ignore
         */
        this.INTERNAL_KEY_SYSTEM_SELECTED = 'internalKeySystemSelected';

        /**
         * Event ID for events delivered when the status of one decryption keys has changed
         * @ignore
         */
        this.INTERNAL_KEY_STATUS_CHANGED = 'internalkeyStatusChanged';

        /**
         * Event ID for events delivered when a new key has been added
         *
         * @constant
         * @deprecated The latest versions of the EME specification no longer
         * use this event.  {@MediaPlayer.models.protectionModel.eventList.KEY_STATUSES_CHANGED}
         * is preferred.
         * @event ProtectionEvents#KEY_ADDED
         */
        this.KEY_ADDED = 'public_keyAdded';
        /**
         * Event ID for events delivered when an error is encountered by the CDM
         * while processing a license server response message
         * @event ProtectionEvents#KEY_ERROR
         */
        this.KEY_ERROR = 'public_keyError';

        /**
         * Event ID for events delivered when the protection set receives
         * a key message from the CDM
         * @event ProtectionEvents#KEY_MESSAGE
         */
        this.KEY_MESSAGE = 'public_keyMessage';

        /**
         * Event ID for events delivered when a key session close
         * process has completed
         * @event ProtectionEvents#KEY_SESSION_CLOSED
         */
        this.KEY_SESSION_CLOSED = 'public_keySessionClosed';

        /**
         * Event ID for events delivered when a new key sessions creation
         * process has completed
         * @event ProtectionEvents#KEY_SESSION_CREATED
         */
        this.KEY_SESSION_CREATED = 'public_keySessionCreated';

        /**
         * Event ID for events delivered when a key session removal
         * process has completed
         * @event ProtectionEvents#KEY_SESSION_REMOVED
         */
        this.KEY_SESSION_REMOVED = 'public_keySessionRemoved';

        /**
         * Event ID for events delivered when the status of one or more
         * decryption keys has changed
         * @event ProtectionEvents#KEY_STATUSES_CHANGED
         */
        this.KEY_STATUSES_CHANGED = 'public_keyStatusesChanged';

        /**
         * Event ID for events delivered when a key system access procedure
         * has completed
         * @ignore
         */
        this.KEY_SYSTEM_ACCESS_COMPLETE = 'public_keySystemAccessComplete';

        /**
         * Event ID for events delivered when a key system selection procedure
         * completes
         * @event ProtectionEvents#KEY_SYSTEM_SELECTED
         */
        this.KEY_SYSTEM_SELECTED = 'public_keySystemSelected';

        /**
         * Event ID for events delivered when a license request procedure
         * has completed
         * @event ProtectionEvents#LICENSE_REQUEST_COMPLETE
         */
        this.LICENSE_REQUEST_COMPLETE = 'public_licenseRequestComplete';

        /**
         * Event ID for needkey/encrypted events
         * @ignore
         */
        this.NEED_KEY = 'needkey';

        /**
         * Event ID for events delivered when the Protection system is detected and created.
         * @event ProtectionEvents#PROTECTION_CREATED
         */
        this.PROTECTION_CREATED = 'public_protectioncreated';

        /**
         * Event ID for events delivered when the Protection system is destroyed.
         * @event ProtectionEvents#PROTECTION_DESTROYED
         */
        this.PROTECTION_DESTROYED = 'public_protectiondestroyed';

        /**
         * Event ID for events delivered when a new server certificate has
         * been delivered to the CDM
         * @ignore
         */
        this.SERVER_CERTIFICATE_UPDATED = 'serverCertificateUpdated';

        /**
         * Event ID for events delivered when the process of shutting down
         * a protection set has completed
         * @ignore
         */
        this.TEARDOWN_COMPLETE =  'protectionTeardownComplete';

        /**
         * Event ID for events delivered when a HTMLMediaElement has been
         * associated with the protection set
         * @ignore
         */
        this.VIDEO_ELEMENT_SELECTED = 'videoElementSelected';
    }
}

let protectionEvents = new ProtectionEvents();
export default protectionEvents;
