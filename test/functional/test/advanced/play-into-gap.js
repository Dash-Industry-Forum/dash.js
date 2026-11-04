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
import Constants from '../../src/Constants.js';
import Utils from '../../src/Utils.js';
import {expect} from 'chai'
import {checkNoCriticalErrors, initializeDashJsAdapterWithoutAttachSource} from '../common/common.js';

const TESTCASE = Constants.TESTCASES.ADVANCED.PLAY_INTO_GAP
const START_OFFSET_BEFORE_GAP = 4;
// The test content has a single representation, so the top quality buffer targets apply.
// Audio follows the appended video data behind a gap only up to its own buffer target, so the target needs to be larger than the video gap.
const BUFFER_TARGET = 16;
// The request that is still in flight may exceed the buffer target by one segment
const SEGMENT_DURATION_TOLERANCE = 4;
const CHECK_OFFSET_BEFORE_GAP = 1;

function createPlayer(item, mpd, gap, settings) {
    // Use a fresh player to make sure that no media from a previous test is buffered behind the gap
    const playerAdapter = initializeDashJsAdapterWithoutAttachSource(item, settings);
    playerAdapter.attachSource(mpd, Math.max(gap.start - START_OFFSET_BEFORE_GAP, 0));

    return playerAdapter;
}

Utils.getTestvectorsForTestcase(TESTCASE).forEach((item) => {
    const mpd = item.url;

    if (item && item.testdata && item.testdata.gaps && item.testdata.gaps.length > 0) {
        item.testdata.gaps.forEach((gap) => {
            describe(`${TESTCASE} - ${item.name} - gap from ${gap.start} to ${gap.end} - ${mpd}`, function () {

                describe(`Gap jump${gap.bufferTarget ? ` with a buffer target of ${gap.bufferTarget}s` : ''}`, () => {
                    let playerAdapter;

                    before(() => {
                        // Chrome plays over a gap in the video buffer as long as there is audio. Synthetic stall events make it stall like other browsers, see https://github.com/Dash-Industry-Forum/dash.js/issues/5115
                        const buffer = {
                            syntheticStallEvents: {
                                enabled: true
                            }
                        };
                        // A small buffer target makes video stop right behind the gap, e.g. before it overlaps with audio
                        if (gap.bufferTarget) {
                            buffer.bufferTimeAtTopQuality = gap.bufferTarget;
                            buffer.bufferTimeAtTopQualityLongForm = gap.bufferTarget;
                        }
                        playerAdapter = createPlayer(item, mpd, gap, { streaming: { buffer } });
                    })

                    after(() => {
                        if (playerAdapter) {
                            playerAdapter.destroy();
                        }
                    })

                    it(`Playing into the gap and jumping to ${gap.end}`, async () => {
                        const reachedTargetTime = await playerAdapter.reachedPlaybackPosition(Constants.TEST_TIMEOUT_THRESHOLDS.TO_REACH_TARGET_OFFSET, gap.end + Constants.TEST_INPUTS.SEEK_IN_GAPS.MAXIMUM_ALLOWED_PLAYING_DIFFERENCE_TO_GAP_END);
                        expect(reachedTargetTime).to.be.true;
                    });

                    it(`Expect no critical errors to be thrown`, () => {
                        checkNoCriticalErrors(playerAdapter)
                    })
                })

                describe(`Buffer target of ${BUFFER_TARGET}s`, () => {
                    let playerAdapter;

                    before(() => {
                        playerAdapter = createPlayer(item, mpd, gap, {
                            streaming: {
                                buffer: {
                                    bufferTimeAtTopQuality: BUFFER_TARGET,
                                    bufferTimeAtTopQualityLongForm: BUFFER_TARGET
                                }
                            }
                        });
                    })

                    after(() => {
                        if (playerAdapter) {
                            playerAdapter.destroy();
                        }
                    })

                    it(`Video stops buffering at the buffer target in front of the gap`, async () => {
                        const reachedCheckTime = await playerAdapter.reachedPlaybackPosition(Constants.TEST_TIMEOUT_THRESHOLDS.TO_REACH_TARGET_OFFSET, gap.start - CHECK_OFFSET_BEFORE_GAP);
                        expect(reachedCheckTime).to.be.true;

                        // The gap itself is not buffered, so the video data in front of and behind the gap adds up to the buffer target
                        const currentTime = playerAdapter.getCurrentTime();
                        const maxVideoEnd = currentTime + (gap.end - gap.start) + BUFFER_TARGET + SEGMENT_DURATION_TOLERANCE;
                        const requestedVideoEnd = playerAdapter.getRequestedMediaEnd('video');
                        expect(requestedVideoEnd, `expected video to be requested up to at most ${maxVideoEnd}s at currentTime ${currentTime}`).to.be.at.most(maxVideoEnd);
                    });

                    it(`Expect no critical errors to be thrown`, () => {
                        checkNoCriticalErrors(playerAdapter)
                    })
                })
            })
        })
    }
})
