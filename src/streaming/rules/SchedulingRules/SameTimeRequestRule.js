MediaPlayer.rules.SameTimeRequestRule = function () {
    "use strict";

    var LOADING_REQUEST_THRESHOLD = 4,
        lastMediaRequestIdxs = {},

        findClosestToTime = function(fragmentModels, time) {
            var req,
                r,
                pendingReqs,
                i = 0,
                j,
                pln,
                ln = fragmentModels.length;

            for (i; i < ln; i += 1) {
                pendingReqs = fragmentModels[i].getRequests({state: MediaPlayer.dependencies.FragmentModel.states.PENDING});
                sortRequestsByProperty.call(this, pendingReqs, "index");

                for (j = 0, pln = pendingReqs.length; j < pln; j++) {
                    req = pendingReqs[j];

                    if (isNaN(req.startTime) && (req.action !== "complete")) {
                        r = req;
                        break;
                    }

                    if ((req.startTime > time) && (!r || req.startTime < r.startTime)) {
                        r = req;
                    }
                }
            }

            return r || req;
        },

        getForTime = function(fragmentModels, currentTime) {
            var ln = fragmentModels.length,
                req,
                r = null,
                i;

            for (i = 0; i < ln; i += 1) {
                req = fragmentModels[i].getRequests({state: MediaPlayer.dependencies.FragmentModel.states.PENDING, time: currentTime})[0];

                if (req && (!r || req.startTime > r.startTime)) {
                    r = req;
                }
            }

            return r;
        },

        sortRequestsByProperty = function(requestsArray, sortProp) {
            var compare = function (req1, req2){
                if (req1[sortProp] < req2[sortProp] || (isNaN(req1[sortProp]) && req1.action !== "complete")) return -1;
                if (req1[sortProp] > req2[sortProp]) return 1;
                return 0;
            };

            requestsArray.sort(compare);

        },

        getLastMediaRequestIdx = function(streamId, type) {
            return ((lastMediaRequestIdxs[streamId] && lastMediaRequestIdxs[streamId][type]) ? lastMediaRequestIdxs[streamId][type] : NaN);
        },

        onStreamCompleted = function(e) {
            var model = e.data.fragmentModel,
                req = e.data.request,
                streamId = model.getContext().streamProcessor.getStreamInfo().id,
                type = req.mediaType;

            lastMediaRequestIdxs[streamId] = lastMediaRequestIdxs[streamId] || {};
            lastMediaRequestIdxs[streamId][type] = req.index - 1;
        };

    return {
        setup: function() {
            this[MediaPlayer.dependencies.FragmentController.eventList.ENAME_STREAM_COMPLETED] = onStreamCompleted;
        },

        setFragmentModels: function(fragmentModels, streamid) {
            this.fragmentModels = this.fragmentModels || {};
            this.fragmentModels[streamid] = fragmentModels;
        },

        execute: function(context, callback) {
            var streamId = context.getStreamInfo().id,
                current = context.getCurrentValue(),
                p = MediaPlayer.rules.SwitchRequest.prototype.DEFAULT,
                fragmentModels = this.fragmentModels[streamId],
                type,
                model,
                sameTimeReq,
                mIdx,
                req,
                currentTime,
                wallclockTime = new Date(),
                time = null,
                reqForCurrentTime,
                mLength = fragmentModels ? fragmentModels.length : null,
                shouldWait = false,
                reqsToExecute = [],
                pendingReqs,
                loadingLength;

            if (!fragmentModels || !mLength) {
                callback(new MediaPlayer.rules.SwitchRequest([], p));
                return;
            }

            currentTime = fragmentModels[0].getContext().playbackController.getTime();
            reqForCurrentTime = getForTime(fragmentModels, currentTime);
            req = reqForCurrentTime || findClosestToTime(fragmentModels, currentTime) || current;

            if (!req) {
                callback(new MediaPlayer.rules.SwitchRequest([], p));
                return;
            }

            for (mIdx = 0; mIdx < mLength; mIdx += 1) {
                model = fragmentModels[mIdx];
                type = model.getContext().streamProcessor.getType();

                if (type !== "video" && type !== "audio") continue;

                pendingReqs = model.getRequests({state: MediaPlayer.dependencies.FragmentModel.states.PENDING});
                loadingLength = model.getRequests({state: MediaPlayer.dependencies.FragmentModel.states.LOADING}).length;

                if (model.getIsPostponed() && !isNaN(req.startTime)) continue;

                if (loadingLength > LOADING_REQUEST_THRESHOLD) {
                    callback(new MediaPlayer.rules.SwitchRequest([], p));
                    return;
                }

                time = time || ((req === reqForCurrentTime) ? currentTime : req.startTime);

                if (pendingReqs.indexOf(req) !== -1) {
                    reqsToExecute.push(req);
                    continue;
                }

                sameTimeReq = model.getRequests({state: MediaPlayer.dependencies.FragmentModel.states.PENDING, time: time})[0];

                // if a target fragment is the first fragment in the mpd and we have not found a match fragment for the same time,
                // we need to look for a first fragment by index as well, because there may be a time shift between audio and video,
                // so getRequestS may not detect a corresponding fragment.
                if (!sameTimeReq && req.index === 0) {
                    sameTimeReq = pendingReqs.filter(
                        function(r){
                            return r.index === req.index;
                        })[0];
                }

                if (sameTimeReq) {
                    reqsToExecute.push(sameTimeReq);
                    continue;
                }

                sameTimeReq = model.getRequests({state: MediaPlayer.dependencies.FragmentModel.states.LOADING, time: time})[0] ||
                    model.getRequests({state: MediaPlayer.dependencies.FragmentModel.states.EXECUTED, time: time})[0];

                if (!sameTimeReq && (req.index !== getLastMediaRequestIdx.call(this, streamId, req.mediaType))) {
                    shouldWait = true;
                    break;
                }
            }

            reqsToExecute = reqsToExecute.filter( function(req) {
                return (req.action === "complete") || (wallclockTime.getTime() >= req.availabilityStartTime.getTime());
            });

            if (shouldWait) {
                callback(new MediaPlayer.rules.SwitchRequest([], p));
                return;
            }

            callback(new MediaPlayer.rules.SwitchRequest(reqsToExecute, p));
        },

        reset: function() {
            lastMediaRequestIdxs = {};
        }
    };
};

MediaPlayer.rules.SameTimeRequestRule.prototype = {
    constructor: MediaPlayer.rules.SameTimeRequestRule
};