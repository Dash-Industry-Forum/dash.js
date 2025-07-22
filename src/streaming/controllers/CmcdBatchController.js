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
        urlLoader;

    function setup() {
        batches = new Map(); // Map<key, { cmcdData, target }>
        timers = new Map(); // Map<key, timeoutRef>
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

    function _sendBatchReport(request) {
        if (!urlLoader) {
            urlLoader = URLLoader(context).create({
                errHandler: errHandler,
                mediaPlayerModel: mediaPlayerModel,
                errors: Errors,
                dashMetrics: dashMetrics,
            });
        }
        urlLoader.load({ request });
    }

    function reset() {
        for (const timeout of timers.values()) {
            clearTimeout(timeout);
        }
        batches.clear();
        timers.clear();
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
