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
import Debug from '../core/Debug';
import DashJSError from './vo/DashJSError';
import EventBus from '../core/EventBus';
import Events from '../core/events/Events';
import FactoryMaker from '../core/FactoryMaker';
import TextController from './text/TextController';
import Errors from '../core/errors/Errors';
import Settings from '../core/Settings';


/**
 * @class SourceBufferSink
 * @ignore
 * @implements FragmentSink
 */

const CHECK_INTERVAL = 50;

function SourceBufferSink(mSource) {
    const context = this.context;
    const eventBus = EventBus(context).getInstance();
    const settings = Settings(context).getInstance();

    let instance,
        type,
        logger,
        buffer,
        mediaInfo,
        intervalId;

    let callbacks = [];
    let appendQueue = [];
    let isAppendingInProgress = false;
    let mediaSource = mSource;

    function setup() {
        logger = Debug(context).getInstance().getLogger(instance);
    }

    function initializeForStreamSwitch(mInfo, selectedRepresentation) {
        mediaInfo = mInfo;
        type = mediaInfo.type;
        const codec = mediaInfo.codec;

        if (settings.get().streaming.useAppendWindow) {
            updateAppendWindow(mediaInfo.streamInfo);
        }

        _abortBeforeAppend();

        if (buffer.changeType) {
            buffer.changeType(codec);
        }

        if (selectedRepresentation && selectedRepresentation.MSETimeOffset !== undefined) {
            updateTimestampOffset(selectedRepresentation.MSETimeOffset);
        }

    }

    function initializeForFirstUse(mInfo, selectedRepresentation) {
        mediaInfo = mInfo;
        type = mediaInfo.type;
        const codec = mediaInfo.codec;
        try {
            // Safari claims to support anything starting 'application/mp4'.
            // it definitely doesn't understand 'application/mp4;codecs="stpp"'
            // - currently no browser does, so check for it and use our own
            // implementation. The same is true for codecs="wvtt".
            if (codec.match(/application\/mp4;\s*codecs="(stpp|wvtt).*"/i)) {
                throw new Error('not really supported');
            }

            buffer = mediaSource.addSourceBuffer(codec);

            _addEventListeners();

            if (settings.get().streaming.useAppendWindow) {
                updateAppendWindow(mediaInfo.streamInfo);
            }

            if (selectedRepresentation && selectedRepresentation.MSETimeOffset !== undefined) {
                updateTimestampOffset(selectedRepresentation.MSETimeOffset);
            }

        } catch (ex) {
            // Note that in the following, the quotes are open to allow for extra text after stpp and wvtt
            if ((mediaInfo.isText) || (codec.indexOf('codecs="stpp') !== -1) || (codec.indexOf('codecs="wvtt') !== -1)) {
                const textController = TextController(context).getInstance();
                buffer = textController.getTextSourceBuffer();
            } else {
                throw ex;
            }
        }
    }

    function _addEventListeners() {
        // use updateend event if possible
        if (typeof buffer.addEventListener === 'function') {
            try {
                buffer.addEventListener('updateend', updateEndHandler, false);
                buffer.addEventListener('error', errHandler, false);
                buffer.addEventListener('abort', errHandler, false);

            } catch (err) {
                // use setInterval to periodically check if updating has been completed
                intervalId = setInterval(checkIsUpdateEnded, CHECK_INTERVAL);
            }
        } else {
            // use setInterval to periodically check if updating has been completed
            intervalId = setInterval(checkIsUpdateEnded, CHECK_INTERVAL);
        }
    }

    function getType() {
        return type;
    }

    function _removeEventListeners() {
        try {
            if (typeof buffer.removeEventListener === 'function') {
                buffer.removeEventListener('updateend', updateEndHandler, false);
                buffer.removeEventListener('error', errHandler, false);
                buffer.removeEventListener('abort', errHandler, false);
            }
            clearInterval(intervalId);
        } catch (e) {
            logger.error(e);
        }
    }

    function updateAppendWindow(sInfo) {
        waitForUpdateEnd(() => {
            try {
                if (!buffer) {
                    return;
                }

                let appendWindowEnd = mediaSource.duration;
                let appendWindowStart = 0;
                if (sInfo && !isNaN(sInfo.start) && !isNaN(sInfo.duration) && isFinite(sInfo.duration)) {
                    appendWindowEnd = sInfo.start + sInfo.duration;
                }
                if (sInfo && !isNaN(sInfo.start)) {
                    appendWindowStart = sInfo.start;
                }
                if (buffer.appendWindowEnd !== appendWindowEnd || buffer.appendWindowStart !== appendWindowStart) {
                    buffer.appendWindowStart = 0;
                    buffer.appendWindowEnd = appendWindowEnd;
                    buffer.appendWindowStart = Math.max(appendWindowStart, 0);
                    logger.debug(`Updated append window for ${mediaInfo.type}. Set start to ${buffer.appendWindowStart} and end to ${buffer.appendWindowEnd}`);
                }
            } catch (e) {
                logger.warn(`Failed to set append window`);
            }
        });
    }

    function updateTimestampOffset(MSETimeOffset) {
        waitForUpdateEnd(() => {
            if (buffer.timestampOffset !== MSETimeOffset && !isNaN(MSETimeOffset)) {
                buffer.timestampOffset = MSETimeOffset;
                logger.debug(`Set MSE timestamp offset to ${MSETimeOffset}`);
            }
        });
    }


    function reset(keepBuffer) {
        if (buffer) {
            if (!keepBuffer) {
                try {
                    callbacks = [];
                    _removeEventListeners();
                    isAppendingInProgress = false;
                    appendQueue = [];
                    if (!buffer.getClassName || buffer.getClassName() !== 'TextSourceBuffer') {
                        logger.debug(`Removing sourcebuffer from media source`);
                        mediaSource.removeSourceBuffer(buffer);
                    }
                } catch (e) {
                    logger.error('Failed to remove source buffer from media source.');
                }
                buffer = null;
            }
        }
    }

    function getBuffer() {
        return buffer;
    }

    function getAllBufferRanges() {
        try {
            return buffer.buffered;
        } catch (e) {
            logger.error('getAllBufferRanges exception: ' + e.message);
            return null;
        }
    }

    function append(chunk) {
        if (!chunk) {
            _triggerEvent(Events.BYTES_APPENDED_IN_SINK, {
                chunk: chunk,
                error: new DashJSError(Errors.APPEND_ERROR_CODE, Errors.APPEND_ERROR_MESSAGE)
            });
        }
        appendQueue.push(chunk);
        if (!isAppendingInProgress) {
            waitForUpdateEnd(appendNextInQueue.bind(this));
        }
    }

    function _abortBeforeAppend() {
        waitForUpdateEnd(() => {
            // Save the append window, which is reset on abort().
            const appendWindowStart = buffer.appendWindowStart;
            const appendWindowEnd = buffer.appendWindowEnd;

            buffer.abort();

            // Restore the append window.
            buffer.appendWindowStart = appendWindowStart;
            buffer.appendWindowEnd = appendWindowEnd;
        });
    }

    function remove(start, end, forceRemoval) {
        const sourceBufferSink = this;
        // make sure that the given time range is correct. Otherwise we will get InvalidAccessError
        waitForUpdateEnd(function () {
            try {
                if ((start >= 0) && (end > start) && (forceRemoval || mediaSource.readyState !== 'ended')) {
                    buffer.remove(start, end);
                }
                // updating is in progress, we should wait for it to complete before signaling that this operation is done
                waitForUpdateEnd(function () {
                    _triggerEvent(Events.SOURCEBUFFER_REMOVE_COMPLETED, {
                        buffer: sourceBufferSink,
                        from: start,
                        to: end,
                        unintended: false
                    });
                });
            } catch (err) {
                _triggerEvent(Events.SOURCEBUFFER_REMOVE_COMPLETED, {
                    buffer: sourceBufferSink,
                    from: start,
                    to: end,
                    unintended: false,
                    error: new DashJSError(err.code, err.message)
                });
            }
        });
    }

    function appendNextInQueue() {

        if (appendQueue.length > 0) {
            isAppendingInProgress = true;
            const nextChunk = appendQueue[0];
            appendQueue.splice(0, 1);
            const afterSuccess = function () {
                // Safari sometimes drops a portion of a buffer after appending. Handle these situations here
                const ranges = buffer.buffered;
                for (let i = 0; i < ranges.length; i++) {
                    //console.log(`${mediaInfo.type} Buffered from ${ranges.start(i)} - ${ranges.end(i)}`);
                }
                if (appendQueue.length > 0) {
                    appendNextInQueue.call(this);
                } else {
                    isAppendingInProgress = false;
                    _triggerEvent(Events.BYTES_APPENDED_IN_SINK, {
                        chunk: nextChunk
                    });
                }
            };

            try {
                if (nextChunk.bytes.length === 0) {
                    afterSuccess.call(this);
                } else {
                    if (buffer.appendBuffer) {
                        buffer.appendBuffer(nextChunk.bytes);
                    } else {
                        buffer.append(nextChunk.bytes, nextChunk);
                    }
                    // updating is in progress, we should wait for it to complete before signaling that this operation is done
                    waitForUpdateEnd(afterSuccess.bind(this));
                }
            } catch (err) {
                logger.fatal('SourceBuffer append failed "' + err + '"');
                if (appendQueue.length > 0) {
                    appendNextInQueue();
                } else {
                    isAppendingInProgress = false;
                }

                _triggerEvent(Events.BYTES_APPENDED_IN_SINK, {
                    chunk: nextChunk,
                    error: new DashJSError(err.code, err.message)
                });
            }
        }
    }

    function abort() {
        try {
            if (mediaSource.readyState === 'open') {
                waitForUpdateEnd(() => {
                    buffer.abort();
                });
            } else if (buffer.setTextTrack && mediaSource.readyState === 'ended') {
                buffer.abort(); //The cues need to be removed from the TextSourceBuffer via a call to abort()
            }
        } catch (ex) {
            logger.error('SourceBuffer append abort failed: "' + ex + '"');
        }
        appendQueue = [];
    }

    function executeCallback() {
        if (callbacks.length > 0) {
            const cb = callbacks.shift();
            if (buffer.updating) {
                waitForUpdateEnd(cb);
            } else {
                cb();
                // Try to execute next callback if still not updating
                executeCallback();
            }
        }
    }

    function checkIsUpdateEnded() {
        // if updating is still in progress do nothing and wait for the next check again.
        if (buffer.updating) {
            return;
        }
        // updating is completed, now we can stop checking and resolve the promise
        executeCallback();
    }

    function updateEndHandler() {
        if (buffer.updating) {
            return;
        }

        executeCallback();
    }

    function errHandler() {
        logger.error('SourceBufferSink error');
    }

    function waitForUpdateEnd(callback) {
        callbacks.push(callback);

        if (!buffer.updating) {
            executeCallback();
        }
    }

    function _triggerEvent(type, payload) {
        payload.streamId = mediaInfo.streamInfo.id;
        payload.mediaType = mediaInfo.type;
        eventBus.trigger(type, payload);
    }

    instance = {
        getType: getType,
        getAllBufferRanges: getAllBufferRanges,
        getBuffer: getBuffer,
        append: append,
        remove: remove,
        abort: abort,
        reset: reset,
        updateTimestampOffset: updateTimestampOffset,
        waitForUpdateEnd: waitForUpdateEnd,
        initializeForStreamSwitch,
        initializeForFirstUse,
        updateAppendWindow
    };

    setup();

    return instance;
}

SourceBufferSink.__dashjs_factory_name = 'SourceBufferSink';
const factory = FactoryMaker.getClassFactory(SourceBufferSink);
export default factory;
