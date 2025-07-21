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
        batches = {};
        timers = {};
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

    function addReport(target, cmcd) {
        const targetUrl = target.url;
        if (!batches[targetUrl]) {
            batches[targetUrl] = {
                cmcdData: [],
                target: target
            };
        }
        batches[targetUrl].cmcdData.push(cmcd[0]);

        if (target.batchTimer && !timers[targetUrl]) {
            timers[targetUrl] = setTimeout(() => {
                flushBatch(targetUrl);
            }, target.batchTimer * 1000);
        }

        if (target.batchSize && batches[targetUrl].cmcdData.length >= target.batchSize) {
            flushBatch(targetUrl);
        }
    }
    
    function flushBatch(targetUrl) {
        const batchInfo = batches[targetUrl];
        if (batchInfo && batchInfo.cmcdData && batchInfo.cmcdData.length > 0) {
            let httpRequest = new CmcdReportRequest();
            httpRequest.url = targetUrl;
            if (batchInfo.target.cmcdMode === Constants.CMCD_MODE.EVENT) {
                httpRequest.type = HTTPRequest.CMCD_EVENT;
            } else if (batchInfo.target.cmcdMode === Constants.CMCD_MODE.RESPONSE) {
                httpRequest.type = HTTPRequest.CMCD_RESPONSE;
            }
            httpRequest.method = HTTPRequest.POST;
            httpRequest.body = batchInfo.cmcdData;
            _sendBatchReport(httpRequest);
            batches[targetUrl].cmcdData = [];
        }

        if (timers[targetUrl]) {
            clearTimeout(timers[targetUrl]);
            delete timers[targetUrl];
        }
    }

    function _sendBatchReport(request){
        if (!urlLoader) {
            urlLoader = URLLoader(context).create({
                errHandler: errHandler,
                mediaPlayerModel: mediaPlayerModel,
                errors: Errors,
                dashMetrics: dashMetrics,
            });
        }
        urlLoader.load({request})
    }
    
    function reset(){
        for (const url in timers) {
            if (Object.prototype.hasOwnProperty.call(timers, url)) {
                clearTimeout(timers[url]);
            }
        }
        batches = {};
        timers = {};
    }
    
    instance = {
        addReport,
        setConfig,
        reset
    };
    
    setup();
    return instance;
}

CmcdBatchController.__dashjs_factory_name = 'CmcdBatchController';
export default FactoryMaker.getSingletonFactory(CmcdBatchController);
