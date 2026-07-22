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

const BUFFER_END_THRESHOLD = 0.5;
const DEFAULT_RANGE_TOLERANCE = 0.15;

function isValidTargetTime(time) {
    return typeof time === 'number' && !isNaN(time);
}

function getRangeBehindForPruning(ranges, targetTime, bufferToKeepBehind, currentTimeRequest) {
    const startOfBuffer = ranges.start(0);

    if (targetTime - startOfBuffer > bufferToKeepBehind) {
        let rangeEnd = Math.max(0, targetTime - bufferToKeepBehind);

        if (currentTimeRequest) {
            rangeEnd = Math.min(currentTimeRequest.startTime, rangeEnd);
        }

        if (rangeEnd > 0) {
            return {
                start: startOfBuffer,
                end: rangeEnd
            };
        }
    }

    return null;
}

function getRangeAheadForPruning(ranges, targetTime, options) {
    const endOfLastRange = ranges.end(ranges.length - 1);
    const {
        bufferToKeepAhead,
        continuousBufferTime,
        currentTimeRequest,
        avoidCurrentTimeRangePruning,
        logger
    } = options;

    let rangeStart = !isNaN(continuousBufferTime) ? Math.min(continuousBufferTime, targetTime + bufferToKeepAhead) : targetTime;

    if (rangeStart >= endOfLastRange) {
        return null;
    }

    if (currentTimeRequest) {
        rangeStart = Math.max(currentTimeRequest.startTime + currentTimeRequest.duration, rangeStart);
    }

    if (avoidCurrentTimeRangePruning) {
        for (let i = 0; i < ranges.length; i++) {
            if (ranges.start(i) <= targetTime && targetTime <= ranges.end(i)
                && ranges.start(i) <= rangeStart && rangeStart <= ranges.end(i)) {
                const oldRangeStart = rangeStart;
                rangeStart = i + 1 < ranges.length ? ranges.start(i + 1) : ranges.end(i) + 1;
                if (logger) {
                    const endOfBuffer = endOfLastRange + BUFFER_END_THRESHOLD;
                    logger.debug('Buffered range [' + ranges.start(i) + ', ' + ranges.end(i) + '] overlaps with targetTime ' + targetTime + ' and range to be pruned [' + oldRangeStart + ', ' + endOfBuffer + '], using [' + rangeStart + ', ' + endOfBuffer + '] instead' + ((rangeStart < endOfBuffer) ? '' : ' (no actual pruning)'));
                }
                break;
            }
        }
    }

    if (rangeStart < endOfLastRange) {
        return {
            start: rangeStart,
            end: endOfLastRange + BUFFER_END_THRESHOLD
        };
    }

    return null;
}

function getPruningRanges(ranges, seekTime, options) {
    const clearRanges = [];

    if (!ranges || ranges.length === 0) {
        return clearRanges;
    }

    if (!isValidTargetTime(seekTime)) {
        clearRanges.push({
            start: ranges.start(0),
            end: ranges.end(ranges.length - 1) + BUFFER_END_THRESHOLD
        });
        return clearRanges;
    }

    const pruningOptions = options || {};
    if (!Number.isFinite(pruningOptions.bufferToKeepBehind) || !Number.isFinite(pruningOptions.bufferToKeepAhead)) {
        throw new Error('getPruningRanges requires numeric bufferToKeepBehind and bufferToKeepAhead options when a valid seek time is provided');
    }

    const behindPruningRange = getRangeBehindForPruning(
        ranges,
        seekTime,
        pruningOptions.bufferToKeepBehind,
        pruningOptions.currentTimeRequest
    );
    const aheadPruningRange = getRangeAheadForPruning(ranges, seekTime, pruningOptions);

    if (behindPruningRange) {
        clearRanges.push(behindPruningRange);
    }

    if (aheadPruningRange) {
        clearRanges.push(aheadPruningRange);
    }

    return clearRanges;
}

function hasBufferAtTime(ranges, time) {
    if (!ranges || ranges.length === 0) {
        return false;
    }

    for (let i = 0; i < ranges.length; i++) {
        if (time >= ranges.start(i) && time <= ranges.end(i)) {
            return true;
        }
    }

    return false;
}

function getRangeAt(ranges, time, tolerance) {
    let firstStart = null;
    let lastEnd = null;
    const actualTolerance = typeof tolerance === 'number' && !isNaN(tolerance) ? tolerance : DEFAULT_RANGE_TOLERANCE;

    if (ranges !== null && ranges !== undefined) {
        for (let i = 0; i < ranges.length; i++) {
            const start = ranges.start(i);
            const end = ranges.end(i);

            if (firstStart === null) {
                const gap = Math.abs(start - time);
                if ((time >= start && time < end) || gap <= actualTolerance) {
                    firstStart = start;
                    lastEnd = end;
                }
            } else if (start - lastEnd <= actualTolerance) {
                lastEnd = end;
            } else {
                break;
            }
        }
    }

    return firstStart === null ? null : {
        start: firstStart,
        end: lastEnd
    };
}

function getBufferLength(ranges, time, tolerance) {
    const range = getRangeAt(ranges, time, tolerance);
    return range === null ? 0 : range.end - time;
}

export {
    getBufferLength,
    getPruningRanges,
    getRangeAt,
    hasBufferAtTime,
    isValidTargetTime
};
