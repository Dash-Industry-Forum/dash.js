import FactoryMaker from '../../core/FactoryMaker.js';
import URLLoader from '../net/URLLoader.js';
import Errors from '../../core/errors/Errors.js';
import { HTTPRequest } from '../vo/metrics/HTTPRequest.js';
import CmcdReportRequest from '../vo/CmcdReportRequest.js';
import Constants from '../constants/Constants.js';

function CmcdBatchController() {
    const context = this.context;
    let instance,
        batches,
        timers,
        dashMetrics,
        mediaPlayerModel,
        errHandler,
        urlLoader,
        retryQueue,
        retryTimers,
        retryDelays;

    function setup() {
        batches = new Map(); // Map<key, { cmcdData, target }>
        timers = new Map(); // Map<key, timeoutRef>
        retryQueue = [];
        retryTimers = new Map();
        retryDelays = [100, 500, 1000, 3000, 5000]; // ms
    }

    function setConfig(config) {
        if (!config) {
            return;
        }

        if (config.dashMetrics) {
            dashMetrics = config.dashMetrics;
        }
        
        if (config.mediaPlayerModel) {
            mediaPlayerModel = config.mediaPlayerModel;
        }
        
        if (config.errHandler) {
            errHandler = config.errHandler;
        }

        if (config.urlLoader) {
            urlLoader = config.urlLoader;
        }
    }

    function _generateTargetKey(target) {
        return JSON.stringify({
            url: target.url,
            cmcdMode: target.cmcdMode,
            batchSize: target.batchSize,
            batchTimer: target.batchTimer
        });
    }

    function addReport(target, cmcd) {
        const key = _generateTargetKey(target);

        if (!batches.has(key)) {
            batches.set(key, {
                cmcdData: [],
                target
            });
        }

        const batch = batches.get(key);
        batch.cmcdData.push(cmcd[0]);

        if (target.batchTimer && !timers.has(key)) {
            const timeout = setTimeout(() => {
                flushByTargetKey(key);
            }, target.batchTimer * 1000);
            timers.set(key, timeout);
        }

        if (target.batchSize && batch.cmcdData.length >= target.batchSize) {
            flushByTargetKey(key);
        }
    }

    function flushByTargetKey(key) {
        const batch = batches.get(key);
        if (batch && batch.cmcdData.length > 0) {
            const { target, cmcdData } = batch;
            let httpRequest = new CmcdReportRequest();
            httpRequest.url = target.url;
            httpRequest.method = HTTPRequest.POST;
            httpRequest.body = cmcdData;

            if (target.cmcdMode === Constants.CMCD_MODE.EVENT) {
                httpRequest.type = HTTPRequest.CMCD_EVENT;
            } else if (target.cmcdMode === Constants.CMCD_MODE.RESPONSE) {
                httpRequest.type = HTTPRequest.CMCD_RESPONSE;
            }

            _sendBatchReport(httpRequest);
            batch.cmcdData = [];
        }

        if (timers.has(key)) {
            clearTimeout(timers.get(key));
            timers.delete(key);
        }
    }

    function flushBatch(url) {
        for (const [key, batch] of batches.entries()) {
            if (batch.target.url === url) {
                flushByTargetKey(key);
            }
        }
    }

    function _processRetryQueue() {
        const now = new Date().getTime();
        const newRetryQueue = [];

        for (let i = 0; i < retryQueue.length; i++) {
            const report = retryQueue[i];
            if (report.sendTime <= now) {
                _sendBatchReport(report.request, (success) => {
                    if (!success) {
                        report.retryCount++;
                        if (report.retryCount < retryDelays.length) {
                            report.sendTime = new Date().getTime() + retryDelays[report.retryCount];
                            newRetryQueue.push(report);
                        } else {
                            // Stop retrying
                        }
                    }
                });
            } else {
                newRetryQueue.push(report);
            }
        }

        retryQueue = newRetryQueue;

        if (retryQueue.length > 0) {
            const nextRetryTime = Math.min(...retryQueue.map(r => r.sendTime));
            const key = 'retry';
            if (retryTimers.has(key)) {
                clearTimeout(retryTimers.get(key));
            }
            retryTimers.set(key, setTimeout(_processRetryQueue, nextRetryTime - new Date().getTime()));
        }
    }

    function _sendBatchReport(request, callback) {
        if (!urlLoader) {
            urlLoader = URLLoader(context).create({
                errHandler: errHandler,
                mediaPlayerModel: mediaPlayerModel,
                errors: Errors,
                dashMetrics: dashMetrics,
            });
        }
        urlLoader.load({ request }).then((response) => {
            if (response.status === 429) {
                if (callback) {
                    callback(false);
                }
                retryQueue.push({ request, retryCount: 0, sendTime: new Date().getTime() + retryDelays[0] });
                if (retryQueue.length === 1) {
                    retryTimers.set('retry', setTimeout(_processRetryQueue, retryDelays[0]));
                }
            } else if (callback) {
                callback(true);
            }
        });
    }

    function reset() {
        for (const timeout of timers.values()) {
            clearTimeout(timeout);
        }
        for (const timeout of retryTimers.values()) {
            clearTimeout(timeout);
        }
        batches.clear();
        timers.clear();
        retryQueue = [];
        retryTimers.clear();
    }

    instance = {
        addReport,
        setConfig,
        flushBatch,
        reset
    };

    setup();
    return instance;
}

CmcdBatchController.__dashjs_factory_name = 'CmcdBatchController';
export default FactoryMaker.getSingletonFactory(CmcdBatchController);
