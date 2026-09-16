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

// 'dashjs' resolves to the npm pack tarball installed into
// test/compliance/vite-consumer/node_modules - see test/package/verify-package.mjs.
import dashjs from 'dashjs';
// Exercises the './mss' entry of the package exports map.
import { MssHandler } from 'dashjs/mss';

const STREAM_URL = 'https://dash.akamaized.net/dash264/TestCases/1a/sony/SNE_DASH_SD_CASE1A_REVISED.mpd';
const MIN_PLAYBACK_TIME = 3;

describe('npm package smoke test', () => {

    it('exposes MediaPlayer and Version through the package exports', () => {
        expect(dashjs.MediaPlayer).to.be.a('function');
        expect(dashjs.Version).to.be.a('string');
        expect(MssHandler).to.be.a('function');
    });

    it(`plays a stream for at least ${MIN_PLAYBACK_TIME} seconds`, (done) => {
        const videoElement = document.createElement('video');
        videoElement.muted = true;
        document.body.appendChild(videoElement);

        const player = dashjs.MediaPlayer().create();

        // destroy() does not unregister player.on() listeners and the EventBus dispatches
        // synchronously, so a second event (e.g. ERROR followed by PLAYBACK_ERROR for the
        // same failure) would call mocha's done() twice without the latch.
        let finished = false;

        function finish(error) {
            if (finished) {
                return;
            }
            finished = true;
            player.destroy();
            videoElement.remove();
            done(error);
        }

        player.on(dashjs.MediaPlayer.events.ERROR, (e) => {
            finish(new Error(`Player error: ${JSON.stringify(e.error)}`));
        });
        player.on(dashjs.MediaPlayer.events.PLAYBACK_ERROR, (e) => {
            // e.error is a native MediaError whose fields are prototype getters, so
            // JSON.stringify would print '{}'.
            finish(new Error(`Playback error: code=${e.error?.code} message=${e.error?.message}`));
        });
        player.on(dashjs.MediaPlayer.events.PLAYBACK_TIME_UPDATED, (e) => {
            if (e.time >= MIN_PLAYBACK_TIME) {
                finish();
            }
        });

        player.initialize(videoElement, STREAM_URL, true);
    });
});
