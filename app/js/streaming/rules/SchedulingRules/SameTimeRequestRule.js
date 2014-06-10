MediaPlayer.rules.SameTimeRequestRule = function () {
    "use strict";

    var LOADING_REQUEST_THRESHOLD = 2,

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
                model,
                sameTimeReq,
                mIdx = 0,
                loadingReqs,
                req = current,
                mLength = fragmentModels.length,
                shouldWait = false,
                firstReq,
                reqsToExecute = [],
                isLoadingPostponed,
                pendingReqs,
                executedRecs,
                loadingLength;

            for (mIdx; mIdx < mLength; mIdx += 1) {
                model = fragmentModels[mIdx];
                isLoadingPostponed = model.getIsPostponed();
                loadingReqs = model.getLoadingRequests();
                pendingReqs = model.getPendingRequests();
                executedRecs = model.getExecutedRequests();
                loadingLength = loadingReqs.length;

                if (isLoadingPostponed) continue;

                if (loadingLength > LOADING_REQUEST_THRESHOLD) return new MediaPlayer.rules.SwitchRequest([], p);

                sortRequestsByProperty.call(this, pendingReqs, "index");

                firstReq = pendingReqs[0];
                if (!req || (firstReq && (isNaN(firstReq.startTime) || (firstReq.startTime < req.startTime)))) {
                    req = pendingReqs[0];
                }

                if (!req) return new MediaPlayer.rules.SwitchRequest([], p);

                if (pendingReqs.indexOf(req) !== -1) {
                    reqsToExecute.push(req);
                    continue;
                }

                sameTimeReq = model.getPendingRequestForTime(req.startTime);

                if (sameTimeReq) {
                    reqsToExecute.push(sameTimeReq);
                    continue;
                }

                sameTimeReq = model.getLoadingRequestForTime(req.startTime) || model.getExecutedRequestForTime(req.startTime);

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