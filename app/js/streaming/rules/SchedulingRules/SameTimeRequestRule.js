MediaPlayer.rules.SameTimeRequestRule = function () {
    "use strict";

    var LOADING_REQUEST_THRESHOLD = 2,

        findClosestToTime = function(pendingReqs, time) {
            var req,
                i = 0,
                ln = pendingReqs.length;

            for (i; i < ln; i += 1) {
                req = pendingReqs[i];

                if (isNaN(req.startTime)) {
                    break;
                }

                if (req.startTime > time) {
                    break;
                }
            }

            return req || pendingReqs[0];
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
                mIdx = 0,
                loadingReqs,
                req = null,
                currentTime,
                time = null,
                reqForCurrentTime,
                mLength = fragmentModels.length,
                shouldWait = false,
                reqsToExecute = [],
                isLoadingPostponed,
                pendingReqs,
                executedRecs,
                loadingLength;

            for (mIdx; mIdx < mLength; mIdx += 1) {
                model = fragmentModels[mIdx];
                type = model.getContext().streamProcessor.getType();

                if (type !== "video" && type !== "audio") continue;

                currentTime = model.getContext().playbackController.getTime();
                reqForCurrentTime = model.getPendingRequestForTime(currentTime);
                isLoadingPostponed = model.getIsPostponed();
                loadingReqs = model.getLoadingRequests();
                pendingReqs = model.getPendingRequests();
                executedRecs = model.getExecutedRequests();
                loadingLength = loadingReqs.length;

                if (isLoadingPostponed) continue;

                if (loadingLength > LOADING_REQUEST_THRESHOLD) return new MediaPlayer.rules.SwitchRequest([], p);

                sortRequestsByProperty.call(this, pendingReqs, "index");

                req = req || reqForCurrentTime || findClosestToTime(pendingReqs, currentTime) || current;

                if (!req) continue;

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

            if (shouldWait) return new MediaPlayer.rules.SwitchRequest([], p);

            return new MediaPlayer.rules.SwitchRequest(reqsToExecute, p);
        }
    };
};

MediaPlayer.rules.SameTimeRequestRule.prototype = {
    constructor: MediaPlayer.rules.SameTimeRequestRule
};