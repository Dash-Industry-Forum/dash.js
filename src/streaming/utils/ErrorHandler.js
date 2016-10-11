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
import EventBus from '../../core/EventBus';
import Events from '../../core/events/Events';
import FactoryMaker from '../../core/FactoryMaker';

const CAPABILITY_ERROR_MEDIASOURCE      = 'mediasource';
const CAPABILITY_ERROR_MEDIAKEYS        = 'mediakeys';

const DOWNLOAD_ERROR_ID_MANIFEST        = 'manifest';
const DOWNLOAD_ERROR_ID_SIDX            = 'SIDX';
const DOWNLOAD_ERROR_ID_CONTENT         = 'content';
const DOWNLOAD_ERROR_ID_INITIALIZATION  = 'initialization';
const DOWNLOAD_ERROR_ID_XLINK           = 'xlink';

const MANIFEST_ERROR_ID_CODEC           = 'codec';
const MANIFEST_ERROR_ID_PARSE           = 'parse';
const MANIFEST_ERROR_ID_NOSTREAMS       = 'nostreams';

const TIMED_TEXT_ERROR_ID_PARSE         = 'parse';

function ErrorHandler() {

    let instance;
    let context = this.context;
    let eventBus = EventBus(context).getInstance();

    // "mediasource"|"mediakeys"
    function capabilityError(err) {
        eventBus.trigger(Events.ERROR, {error: 'capability', event: err});
    }

    // {id: "manifest"|"SIDX"|"content"|"initialization"|"xlink", url: "", request: {XMLHttpRequest instance}}
    function downloadError(id, url, request) {
        eventBus.trigger(Events.ERROR, {error: 'download', event: {id: id, url: url, request: request}});
    }

    // {message: "", id: "codec"|"parse"|"nostreams", manifest: {parsed manifest}}
    function manifestError(message, id, manifest, err) {
        eventBus.trigger(Events.ERROR, {error: 'manifestError', event: {message: message, id: id, manifest: manifest, event: err}});
    }

    // {message: '', id: 'parse', cc: ''}
    function timedTextError(message, id, ccContent) {
        eventBus.trigger(Events.ERROR, {error: 'cc', event: {message: message, id: id, cc: ccContent}});
    }

    function mediaSourceError(err) {
        eventBus.trigger(Events.ERROR, {error: 'mediasource', event: err});
    }

    function mediaKeySessionError(err) {
        eventBus.trigger(Events.ERROR, {error: 'key_session', event: err});
    }

    function mediaKeyMessageError(err) {
        eventBus.trigger(Events.ERROR, {error: 'key_message', event: err});
    }

    instance = {
        capabilityError: capabilityError,
        downloadError: downloadError,
        manifestError: manifestError,
        timedTextError: timedTextError,
        mediaSourceError: mediaSourceError,
        mediaKeySessionError: mediaKeySessionError,
        mediaKeyMessageError: mediaKeyMessageError
    };

    return instance;
}

ErrorHandler.__dashjs_factory_name = 'ErrorHandler';

const factory = FactoryMaker.getSingletonFactory(ErrorHandler);

factory.CAPABILITY_ERROR_MEDIASOURCE        = CAPABILITY_ERROR_MEDIASOURCE;
factory.CAPABILITY_ERROR_MEDIAKEYS          = CAPABILITY_ERROR_MEDIAKEYS;
factory.DOWNLOAD_ERROR_ID_MANIFEST          = DOWNLOAD_ERROR_ID_MANIFEST;
factory.DOWNLOAD_ERROR_ID_SIDX              = DOWNLOAD_ERROR_ID_SIDX;
factory.DOWNLOAD_ERROR_ID_CONTENT           = DOWNLOAD_ERROR_ID_CONTENT;
factory.DOWNLOAD_ERROR_ID_INITIALIZATION    = DOWNLOAD_ERROR_ID_INITIALIZATION;
factory.DOWNLOAD_ERROR_ID_XLINK             = DOWNLOAD_ERROR_ID_XLINK;
factory.MANIFEST_ERROR_ID_CODEC             = MANIFEST_ERROR_ID_CODEC;
factory.MANIFEST_ERROR_ID_PARSE             = MANIFEST_ERROR_ID_PARSE;
factory.MANIFEST_ERROR_ID_NOSTREAMS         = MANIFEST_ERROR_ID_NOSTREAMS;
factory.TIMED_TEXT_ERROR_ID_PARSE           = TIMED_TEXT_ERROR_ID_PARSE;

export default factory;
