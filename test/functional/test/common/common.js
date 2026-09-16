import Constants from '../../src/Constants.js';
import {expect} from 'chai';
import DashJsAdapter from '../../adapter/DashJsAdapter.js';
import MediaPlayerEvents from '../../../../src/streaming/MediaPlayerEvents.js';

export async function checkIsPlaying(playerAdapter, expectedState) {
    const isPlaying = await playerAdapter.isInPlayingState(Constants.TEST_TIMEOUT_THRESHOLDS.IS_PLAYING);
    expect(isPlaying, `expected isPlaying to be ${expectedState}, currentTime is ${playerAdapter.getCurrentTime()}`).to.equal(expectedState);
}

export async function checkIsProgressing(playerAdapter) {
    const isProgressing = await playerAdapter.isProgressing(Constants.TEST_TIMEOUT_THRESHOLDS.IS_PROGRESSING, Constants.TEST_INPUTS.GENERAL.MINIMUM_PROGRESS_WHEN_PLAYING);
    expect(isProgressing, `expected playback to progress by at least ${Constants.TEST_INPUTS.GENERAL.MINIMUM_PROGRESS_WHEN_PLAYING}s within ${Constants.TEST_TIMEOUT_THRESHOLDS.IS_PROGRESSING}ms, currentTime is ${playerAdapter.getCurrentTime()}`).to.be.true;
}

export async function checkIsNotProgressing(playerAdapter) {
    const isProgressing = await playerAdapter.isProgressing(Constants.TEST_TIMEOUT_THRESHOLDS.IS_NOT_PROGRESSING, Constants.TEST_INPUTS.GENERAL.MINIMUM_PROGRESS_WHEN_PLAYING);
    expect(isProgressing, `expected playback to not progress, currentTime is ${playerAdapter.getCurrentTime()}`).to.be.false;
}

export function checkNoCriticalErrors(playerAdapter) {
    const sanitizeUrl = (url) => {
        if (!url) {
            return url;
        }

        try {
            const parsedUrl = new URL(url);
            return `${parsedUrl.origin}${parsedUrl.pathname}${parsedUrl.search ? '?[redacted]' : ''}`;
        } catch (e) {
            return url.split('?')[0];
        }
    };
    const logEvents = playerAdapter.getLogEvents();
    const errorEvents = playerAdapter.getErrorEvents();
    const errorLogs = logEvents[dashjs.Debug.LOG_LEVEL_ERROR];
    const diagnostics = JSON.stringify({
        errorEvents: errorEvents.map((event) => {
            const error = event.error || event;
            const data = error.data || {};
            const request = data.request || {};
            const response = data.response || {};

            return {
                code: error.code,
                message: error.message,
                request: {
                    mediaType: request.mediaType,
                    range: request.range,
                    type: request.type,
                    url: sanitizeUrl(request.url)
                },
                response: {
                    status: response.status,
                    statusText: response.statusText,
                    url: sanitizeUrl(response.url)
                }
            };
        }),
        errorLogs
    }, null, 2);
    expect(errorLogs, diagnostics).to.be.empty;
    expect(errorEvents, diagnostics).to.be.empty;
}

export function checkEventHasBeenTriggered(playerAdapter, eventName) {
    const hasBeenTriggered = playerAdapter.hasEventBeenTriggered(eventName)
    expect(hasBeenTriggered).to.be.true;
}

export async function checkForEndedEvent(playerAdapter) {
    const ended = await playerAdapter.waitForEvent(playerAdapter.getDuration() * 1000 + Constants.TEST_TIMEOUT_THRESHOLDS.IS_FINISHED_OFFSET_TO_DURATION, dashjs.MediaPlayer.events.PLAYBACK_ENDED)
    expect(ended).to.be.true;
}

export async function seekAndEndedEvent(playerAdapter, seekOffset) {
    const targetTime = playerAdapter.getDuration() + seekOffset;
    const endedPromise = playerAdapter.waitForEvent(Constants.TEST_INPUTS.SEEK_ENDED.EVENT_WAITING_TIME, MediaPlayerEvents.PLAYBACK_ENDED);
    playerAdapter.seek(targetTime);
    const endedEventThrown = await endedPromise;
    expect(endedEventThrown).to.be.true;
}

export async function reachedTargetForwardBuffer(playerAdapter, targetBuffer, tolerance) {
    const reachedBuffer = await playerAdapter.reachedTargetForwardBuffer(Constants.TEST_TIMEOUT_THRESHOLDS.TARGET_BUFFER_REACHED, targetBuffer, tolerance);
    const currentBuffer = playerAdapter.getBufferLengthByType();
    expect(reachedBuffer, `expected forward buffer to reach ${targetBuffer}s (tolerance ${tolerance}s) within ${Constants.TEST_TIMEOUT_THRESHOLDS.TARGET_BUFFER_REACHED}ms, buffer is ${currentBuffer}s`).to.be.true;
}

export async function checkIsKeepingForwardBufferTarget(playerAdapter, timeoutValue, target, tolerance) {
    const isKeepingForwardBufferTarget = await playerAdapter.isKeepingForwardBufferTarget(timeoutValue, target, tolerance);
    const currentBuffer = playerAdapter.getBufferLengthByType();
    expect(isKeepingForwardBufferTarget, `expected forward buffer to stay within ${target}s (tolerance ${tolerance}s) for ${timeoutValue}ms, buffer is ${currentBuffer}s when the check ended`).to.be.true;
}

export async function checkIsKeepingBackwardsBufferTarget(playerAdapter, timeoutValue, target, tolerance) {
    const isKeepingBackwardsBufferTarget = await playerAdapter.isKeepingBackwardsBufferTarget(timeoutValue, target, tolerance);
    const currentTime = playerAdapter.getCurrentTime();
    const bufferStart = playerAdapter.getBufferStartForCurrentTime(currentTime);
    expect(isKeepingBackwardsBufferTarget, `expected backwards buffer to stay within ${target}s (tolerance ${tolerance}s), currentTime is ${currentTime}, bufferStart is ${bufferStart} (behind: ${currentTime - bufferStart}s)`).to.be.true;
}

export function checkLiveDelay(playerAdapter, lowerThreshold, upperThreshold) {
    const liveDelay = playerAdapter.getCurrentLiveLatency();
    expect(liveDelay, `expected live delay to be within [${lowerThreshold}, ${upperThreshold}), actual live delay is ${liveDelay}`).to.be.at.least(lowerThreshold);
    expect(liveDelay, `expected live delay to be within [${lowerThreshold}, ${upperThreshold}), actual live delay is ${liveDelay}`).to.be.below(upperThreshold);
}

export function checkTimeWithinThresholdForDvrWindow(playerAdapter, seekTime, allowedDifference) {
    const currentTime = playerAdapter.getCurrentTimeWithinDvrWindow();
    const timeIsWithinThreshold = playerAdapter.timeWithinThresholdForDvrWindow(seekTime, allowedDifference);
    expect(timeIsWithinThreshold, `expected currentTime (${currentTime}) to be within ${allowedDifference}s of seekTime (${seekTime})`).to.be.true;
}

export function checkTimeWithinThreshold(playerAdapter, seekTime, allowedDifference) {
    const currentTime = playerAdapter.getCurrentTime();
    const timeIsWithinThreshold = playerAdapter.timeWithinThreshold(seekTime, allowedDifference);
    expect(timeIsWithinThreshold, `expected currentTime (${currentTime}) to be within ${allowedDifference}s of seekTime (${seekTime})`).to.be.true;
}

export function initializeDashJsAdapter(item, mpd, settings = null) {
    const playerAdapter = _commonInitialization(item, settings);
    playerAdapter.attachSource(mpd);

    return playerAdapter
}

export function initializeDashJsAdapterWithoutAttachSource(item, settings = null) {
    return _commonInitialization(item, settings)
}

function _commonInitialization(item, settings) {
    let playerAdapter = new DashJsAdapter();
    playerAdapter.init(true);
    playerAdapter.setDrmData(item.drm);
    if (item.settings) {
        playerAdapter.updateSettings(item.settings);
    }
    if (settings) {
        playerAdapter.updateSettings(settings);
    }

    return playerAdapter
}


export function initializeDashJsAdapterForPreload(item, mpd, settings) {
    let playerAdapter = new DashJsAdapter();
    playerAdapter.initForPreload(mpd);
    playerAdapter.setDrmData(item.drm);
    if (item.settings) {
        playerAdapter.updateSettings(item.settings);
    }
    if (settings) {
        playerAdapter.updateSettings(settings);
    }
    playerAdapter.preload();

    return playerAdapter
}

export function playForDuration(durationInMilliseconds) {
    return new Promise(resolve => setTimeout(resolve, durationInMilliseconds));
}

export function isLiveContent(item) {
    return item.type === Constants.CONTENT_TYPES.LIVE
}

export function getRandomNumber(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}
