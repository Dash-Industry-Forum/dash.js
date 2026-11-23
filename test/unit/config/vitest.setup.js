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

import Events from '../../../src/core/events/Events.js';
import MediaPlayerEvents from '../../../src/streaming/MediaPlayerEvents.js';

// Production code extends Events with MediaPlayerEvents when a MediaPlayer is created
// (src/streaming/mediaplayer/MediaPlayerWiring.js). Many tests trigger media player events
// without creating a MediaPlayer, so apply the same wiring once for every test file.
Events.extend(MediaPlayerEvents);

// Mocha compatibility, kept until the remaining tests are converted (tracked in #5210):
// - before/after are Mocha's names for beforeAll/afterAll
// - tests and hooks that take a done callback are turned into promises; Vitest does not
//   support done callbacks
globalThis.before = globalThis.beforeAll;
globalThis.after = globalThis.afterAll;

function withDoneCallback(fn) {
    if (typeof fn !== 'function' || fn.length === 0) {
        return fn;
    }
    return function () {
        return new Promise((resolve, reject) => {
            const done = (err) => (err ? reject(err) : resolve());
            try {
                fn.call(this, done);
            } catch (e) {
                reject(e);
            }
        });
    };
}

function wrapTest(original) {
    const wrapped = (name, fn, ...rest) => original(name, withDoneCallback(fn), ...rest);
    Object.assign(wrapped, original);
    wrapped.only = (name, fn, ...rest) => original.only(name, withDoneCallback(fn), ...rest);
    wrapped.skip = (name, fn, ...rest) => original.skip(name, withDoneCallback(fn), ...rest);
    return wrapped;
}

function wrapHook(original) {
    return (fn, ...rest) => original(withDoneCallback(fn), ...rest);
}

globalThis.it = wrapTest(globalThis.it);
globalThis.test = globalThis.it;
for (const hook of ['beforeEach', 'afterEach', 'beforeAll', 'afterAll']) {
    globalThis[hook] = wrapHook(globalThis[hook]);
}
globalThis.before = globalThis.beforeAll;
globalThis.after = globalThis.afterAll;
