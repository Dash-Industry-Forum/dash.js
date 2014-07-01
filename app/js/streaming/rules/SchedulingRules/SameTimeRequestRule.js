MediaPlayer.rules.SameTimeRequestRule = function () {
    "use strict";

    var LOADING_REQUEST_THRESHOLD = 2,

        findClosestToTime = function(fragmentModels, time) {
            var req,
                r,
                pendingReqs,
                i = 0,
                j,
                pln,
                ln = fragmentModels.length;

            for (i; i < ln; i += 1) {
                pendingReqs = fragmentModels[i].getPendingRequests();
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
                req = fragmentModels[i].getPendingRequestForTime(currentTime);

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

        };

    return {

        getRequestsToLoad: function(current, fragmentModels) {
            var p = MediaPlayer.rules.SwitchRequest.prototype.DEFAULT,
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

            if (!fragmentModels || !mLength) return new MediaPlayer.rules.SwitchRequest([], p);

            currentTime = Math.round(fragmentModels[0].getContext().playbackController.getTime() * 100) / 100;
            reqForCurrentTime = getForTime(fragmentModels, currentTime);
            req = reqForCurrentTime || findClosestToTime(fragmentModels, currentTime) || current;

            if (!req) return new MediaPlayer.rules.SwitchRequest([], p);

            for (mIdx = 0; mIdx < mLength; mIdx += 1) {
                model = fragmentModels[mIdx];
                type = model.getContext().streamProcessor.getType();

                if (type !== "video" && type !== "audio") continue;

                pendingReqs = model.getPendingRequests();
                loadingLength = model.getLoadingRequests().length;

                if (model.getIsPostponed() && !isNaN(req.startTime)) continue;

                if (loadingLength > LOADING_REQUEST_THRESHOLD) return new MediaPlayer.rules.SwitchRequest([], p);

                time = time || ((req === reqForCurrentTime) ? currentTime : req.startTime);

                if (pendingReqs.indexOf(req) !== -1) {
                    reqsToExecute.push(req);
                    continue;
                }

                sameTimeReq = model.getPendingRequestForTime(time);

                if (sameTimeReq) {
                    reqsToExecute.push(sameTimeReq);
                    continue;
                }

                sameTimeReq = model.getLoadingRequestForTime(time) || model.getExecutedRequestForTime(time);

                if (!sameTimeReq) {
                    shouldWait = true;
                    break;
                }
            }

            reqsToExecute = reqsToExecute.filter( function(req) {
                return wallclockTime.getTime() >= req.availabilityStartTime.getTime();
            });

            if (shouldWait) return new MediaPlayer.rules.SwitchRequest([], p);

            return new MediaPlayer.rules.SwitchRequest(reqsToExecute, p);
        }
    };
};

MediaPlayer.rules.SameTimeRequestRule.prototype = {
    constructor: MediaPlayer.rules.SameTimeRequestRule
};