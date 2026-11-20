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
import EventBus from '../../../../src/core/EventBus.js';
import Events from '../../../../src/core/events/Events.js';
import Settings from '../../../../src/core/Settings.js';
import chai from 'chai';
import sinon from 'sinon';

const expect = chai.expect;

const DISPATCH_CASES = [
    ['streaming.delay.liveDelay', Events.SETTING_UPDATED_LIVE_DELAY],
    ['streaming.delay.liveDelayFragmentCount', Events.SETTING_UPDATED_LIVE_DELAY_FRAGMENT_COUNT],
    ['streaming.liveCatchup.enabled', Events.SETTING_UPDATED_CATCHUP_ENABLED],
    ['streaming.liveCatchup.playbackRate.min', Events.SETTING_UPDATED_PLAYBACK_RATE_MIN],
    ['streaming.liveCatchup.playbackRate.max', Events.SETTING_UPDATED_PLAYBACK_RATE_MAX],
    ['streaming.abr.rules.throughputRule.active', Events.SETTING_UPDATED_ABR_ACTIVE_RULES],
    ['streaming.abr.rules.bolaRule.active', Events.SETTING_UPDATED_ABR_ACTIVE_RULES],
    ['streaming.abr.rules.insufficientBufferRule.active', Events.SETTING_UPDATED_ABR_ACTIVE_RULES],
    ['streaming.abr.rules.switchHistoryRule.active', Events.SETTING_UPDATED_ABR_ACTIVE_RULES],
    ['streaming.abr.rules.droppedFramesRule.active', Events.SETTING_UPDATED_ABR_ACTIVE_RULES],
    ['streaming.abr.rules.abandonRequestsRule.active', Events.SETTING_UPDATED_ABR_ACTIVE_RULES],
    ['streaming.abr.rules.l2ARule.active', Events.SETTING_UPDATED_ABR_ACTIVE_RULES],
    ['streaming.abr.rules.loLPRule.active', Events.SETTING_UPDATED_ABR_ACTIVE_RULES],
    ['streaming.abr.maxBitrate.video', Events.SETTING_UPDATED_MAX_BITRATE],
    ['streaming.abr.maxBitrate.audio', Events.SETTING_UPDATED_MAX_BITRATE],
    ['streaming.abr.minBitrate.video', Events.SETTING_UPDATED_MIN_BITRATE],
    ['streaming.abr.minBitrate.audio', Events.SETTING_UPDATED_MIN_BITRATE]
];

function getValueAtPath(object, path) {
    return path.split('.').reduce((value, key) => value[key], object);
}

function createUpdateAtPath(path, value) {
    return path.split('.').reverse().reduce((result, key) => ({ [key]: result }), value);
}

function getDifferentValue(value) {
    if (typeof value === 'boolean') {
        return !value;
    }

    return Number.isNaN(value) ? 1 : value + 1;
}

describe('Settings', function () {
    let context;
    let eventBus;
    let settings;

    beforeEach(function () {
        context = {};
        eventBus = EventBus(context).getInstance();
        settings = Settings(context).getInstance();
    });

    afterEach(function () {
        eventBus.reset();
        settings.reset();
    });

    it('updates supported settings and restores defaults on reset', function () {
        settings.update({ streaming: { delay: { liveDelay: 12 } } });

        expect(settings.get().streaming.delay.liveDelay).to.equal(12);

        settings.reset();

        expect(settings.get().streaming.delay.liveDelay).to.be.NaN;
    });

    it('ignores unsupported setting paths', function () {
        const originalConsoleError = console.error;
        console.error = () => {};

        try {
            settings.update({ unsupportedSetting: true });
        } finally {
            console.error = originalConsoleError;
        }

        expect(settings.get()).not.to.have.property('unsupportedSetting');
    });

    it('rejects nested values below a scalar setting without throwing', function () {
        const originalConsoleError = console.error;
        let errorMessage;
        console.error = (message) => {
            errorMessage = message;
        };

        try {
            expect(() => settings.update({
                streaming: {
                    buffer: {
                        fastSwitchEnabled: { unsupportedSetting: true }
                    }
                }
            })).not.to.throw();
        } finally {
            console.error = originalConsoleError;
        }

        expect(settings.get().streaming.buffer.fastSwitchEnabled).to.be.null;
        expect(errorMessage).to.equal('Settings parameter streaming.buffer.fastSwitchEnabled is not supported');
    });

    DISPATCH_CASES.forEach(([path, event]) => {
        it(`dispatches ${event} when ${path} is updated`, function () {
            const listener = sinon.spy();
            const currentValue = getValueAtPath(settings.get(), path);
            const updatedValue = getDifferentValue(currentValue);

            expect(currentValue).not.to.equal(undefined);
            eventBus.on(event, listener);

            settings.update(createUpdateAtPath(path, updatedValue));

            expect(getValueAtPath(settings.get(), path)).to.equal(updatedValue);
            expect(listener.calledOnce).to.be.true;
        });
    });
});
