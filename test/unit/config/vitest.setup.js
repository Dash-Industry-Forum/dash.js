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
// - tests and hooks whose first parameter is named `done` are turned into promises; Vitest does
//   not support done callbacks. Functions with any other first parameter (for example Vitest's
//   test context) are passed through unchanged.
const DONE_PARAMETER = /^(?:async\s+)?(?:function\b[^(]*\(\s*done\b|\(\s*done\b|done\s*=>)/;

// Captured before any test can install fake timers
const realSetTimeout = globalThis.setTimeout.bind(globalThis);

function usesDoneCallback(fn) {
    return typeof fn === 'function' && fn.length > 0 && DONE_PARAMETER.test(fn.toString());
}

function withDoneCallback(fn) {
    if (!usesDoneCallback(fn)) {
        return fn;
    }
    return function () {
        return new Promise((resolve, reject) => {
            let returned = false;
            let settled = false;
            let doneCalls = 0;
            let pendingResult = null;
            const settle = (err) => {
                if (!settled) {
                    settled = true;
                    err ? reject(err) : resolve();
                }
            };
            const done = (err) => {
                doneCalls++;
                if (doneCalls > 1) {
                    const error = new Error('done() called multiple times');
                    if (settled) {
                        // The test already finished; report as an unhandled error, like Mocha does.
                        // Use the real setTimeout: under sinon's fake timers the error would be lost
                        // or thrown during a later test's clock.tick().
                        realSetTimeout(() => {
                            throw error;
                        });
                    } else {
                        settle(error);
                    }
                    return;
                }
                // Like Mocha, a synchronous done() only counts once the test function has returned,
                // so an exception thrown after it still fails the test
                if (returned) {
                    settle(err);
                } else {
                    pendingResult = { err };
                }
            };
            let result;
            try {
                result = fn.call(this, done);
            } catch (e) {
                settle(e);
                return;
            }
            returned = true;
            if (result && typeof result.then === 'function') {
                // An async function that also takes done: a rejection fails the test
                result.then(null, settle);
            }
            if (pendingResult) {
                settle(pendingResult.err);
            }
        });
    };
}

// Wraps the test function in both call forms, it(name, fn, options) and it(name, options, fn)
function wrapTestArguments([name, ...rest]) {
    return [name, ...rest.map(withDoneCallback)];
}

// A Proxy keeps every Vitest modifier (each, for, skipIf, runIf, extend, todo, concurrent, fails,
// ...) working: they are non-enumerable getters that need the original chainable context.
// Every modifier returns another test function (it.only, it.skipIf(c), it.concurrent.fails, ...),
// so each function it returns is wrapped as well; Function.prototype methods are left alone.
function wrapTest(original) {
    return new Proxy(original, {
        apply(target, thisArg, args) {
            const result = Reflect.apply(target, thisArg, wrapTestArguments(args));
            return typeof result === 'function' ? wrapTest(result) : result;
        },
        get(target, property) {
            const value = Reflect.get(target, property);
            return typeof value === 'function' && !(property in Function.prototype) ? wrapTest(value) : value;
        }
    });
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
