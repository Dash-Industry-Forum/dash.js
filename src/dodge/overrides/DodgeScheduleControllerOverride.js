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
 * Dodge override for ScheduleController:
 *
 * 1. Keeps the schedule timer running during the trailing phase (padding
 *    cycles after all playable content).
 * 2. Enforces a random-walk delay on every schedule timer start when a
 *    Dodge defense is active, so that buffered-segment loads (which go
 *    through the normal dash.js _onBytesAppended → startScheduleTimer(0)
 *    path) still get the same random delay as partial and padding events.
 *
 * Registered via mediaPlayer.extend('ScheduleController', DodgeScheduleControllerOverride, true).
 */

import Debug from '../../core/Debug.js';

function DodgeScheduleControllerOverride(config) {
    config = config || {};
    const context = this.context;
    const parent = this.parent;
    const _parentShouldClearScheduleTimer = parent._shouldClearScheduleTimer;
    const _parentStartScheduleTimer = parent.startScheduleTimer;

    const dashHandler = config.dashHandler;
    const settings = config.settings;

    const logger = Debug(context).getInstance().getLogger({ __dashjs_factory_name: 'DodgeScheduleControllerOverride' });
    let warnedNegativeScheduleRandom = false;
    let warnedNegativeScheduleBase = false;

    function _getScheduleWait() {
        const dodgeSettings = (settings.get().dodge) || {};
        const rawRandom = dodgeSettings.scheduleWaitRandom || 0;
        if (rawRandom < 0 && !warnedNegativeScheduleRandom) {
            logger.warn('dodge.scheduleWaitRandom is negative (' + rawRandom + '), treating as 0');
            warnedNegativeScheduleRandom = true;
        }
        const random = Math.max(0, rawRandom);
        const rawBase = dodgeSettings.scheduleWaitBase || 0;
        if (rawBase < 0 && !warnedNegativeScheduleBase) {
            logger.warn('dodge.scheduleWaitBase is negative (' + rawBase + '), treating as 0');
            warnedNegativeScheduleBase = true;
        }
        const base = Math.max(0, rawBase);
        return base + Math.round(Math.random() * random);
    }

    function _shouldClearScheduleTimer() {
        const parentResult = _parentShouldClearScheduleTimer.call(parent);
        if (!parentResult) {
            return false;
        }

        // Keep scheduling during trailing phase even if the parent would stop.
        if (dashHandler && dashHandler.getIsTrailing && dashHandler.getIsTrailing()) {
            return false;
        }
        return true;
    }

    function startScheduleTimer(value) {
        if (dashHandler && dashHandler.getIsDefended && dashHandler.getIsDefended()) {
            const minDelay = _getScheduleWait();
            _parentStartScheduleTimer.call(parent, Math.max(value || 0, minDelay));
        } else {
            _parentStartScheduleTimer.call(parent, value);
        }
    }

    return {
        _shouldClearScheduleTimer,
        startScheduleTimer,
    };
}

export default DodgeScheduleControllerOverride;
