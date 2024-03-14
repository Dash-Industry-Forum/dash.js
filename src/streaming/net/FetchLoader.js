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

import FactoryMaker from '../../core/FactoryMaker.js';
import Settings from '../../core/Settings.js';
import Constants from '../constants/Constants.js';
import AastLowLatencyThroughputModel from '../models/AastLowLatencyThroughputModel.js';

/**
 * @module FetchLoader
 * @ignore
 * @description Manages download of resources via HTTP using fetch.
 */
function FetchLoader() {

    const context = this.context;
    const aastLowLatencyThroughputModel = AastLowLatencyThroughputModel(context).getInstance();
    const settings = Settings(context).getInstance();
    let instance, dashMetrics, boxParser;

    function setConfig(cfg) {
        dashMetrics = cfg.dashMetrics;
        boxParser = cfg.boxParser
    }

    /**
     * Load request
     * @param {CommonMediaLibrary.request.CommonMediaRequest} httpRequest
     * @param {CommonMediaLibrary.request.CommonMediaResponse} httpResponse
     */
    function load(httpRequest, httpResponse) {
        // Variables will be used in the callback functions
        const fragmentRequest = httpRequest.customData.request;

        const headers = new Headers();
        if (httpRequest.headers) {
            for (let header in httpRequest.headers) {
                let value = httpRequest.headers[header];
                if (value) {
                    headers.append(header, value);
                }
            }
        }

        let abortController;
        if (typeof window.AbortController === 'function') {
            abortController = new AbortController(); /*jshint ignore:line*/
            httpRequest.customData.abortController = abortController;
            abortController.signal.onabort = httpRequest.customData.onabort;
        }

        httpRequest.customData.abort = abort.bind(httpRequest);

        const reqOptions = {
            method: httpRequest.method,
            headers: headers,
            credentials: httpRequest.credentials,
            signal: abortController ? abortController.signal : undefined
        };

        const calculationMode = settings.get().streaming.abr.throughput.lowLatencyDownloadTimeCalculationMode;
        const requestTime = performance.now();
        let throughputCapacityDelayMS = 0;

        new Promise((resolve) => {
            if (calculationMode === Constants.LOW_LATENCY_DOWNLOAD_TIME_CALCULATION_MODE.AAST && aastLowLatencyThroughputModel) {
                throughputCapacityDelayMS = aastLowLatencyThroughputModel.getThroughputCapacityDelayMS(fragmentRequest, dashMetrics.getCurrentBufferLevel(fragmentRequest.mediaType) * 1000);
                if (throughputCapacityDelayMS) {
                    // safely delay the "fetch" call a bit to be able to measure the throughput capacity of the line.
                    // this will lead to first few chunks downloaded at max network speed
                    return setTimeout(resolve, throughputCapacityDelayMS);
                }
            }
            resolve();
        })
            .then(() => {
                let markBeforeFetch = performance.now();

                fetch(httpRequest.url, reqOptions)
                    .then((response) => {
                        httpResponse.status = response.status;
                        httpResponse.statusText = response.statusText;
                        httpResponse.url = response.url;

                        if (!response.ok) {
                            httpRequest.customData.onloadend();
                        }

                        const responseHeaders = {};
                        for (const key of response.headers.keys()) {
                            responseHeaders[key] = response.headers.get(key);
                        }
                        httpResponse.headers = responseHeaders;

                        const totalBytes = parseInt(response.headers.get('Content-Length'), 10);
                        let bytesReceived = 0;
                        let signaledFirstByte = false;
                        let receivedData = new Uint8Array();
                        let offset = 0;

                        if (calculationMode === Constants.LOW_LATENCY_DOWNLOAD_TIME_CALCULATION_MODE.AAST && aastLowLatencyThroughputModel) {
                            _aastProcessResponse(markBeforeFetch, httpRequest, requestTime, throughputCapacityDelayMS, responseHeaders, response);
                        } else {
                            httpRequest.customData.reader = response.body.getReader();
                        }

                        let downloadedData = [];
                        let moofStartTimeData = [];
                        let mdatEndTimeData = [];
                        let lastChunkWasFinished = true;

                        /**
                         * Callback function for the reader.
                         * @param value - some data. Always undefined when done is true.
                         * @param done - true if the stream has already given you all its data.
                         */
                        const _processResult = ({ value, done }) => { // Bug fix Parse whenever data is coming [value] better than 1ms looking that increase CPU

                            if (done) {
                                _handleRequestComplete()
                                return;
                            }

                            if (value && value.length > 0) {
                                _handleDataReceived(value)
                            }

                            _read(httpRequest, httpResponse, _processResult);
                        };

                        /**
                         * Once a request is completed throw final progress event with the calculated bytes and download time
                         * @private
                         */
                        function _handleRequestComplete() {
                            if (receivedData) {
                                if (calculationMode !== Constants.LOW_LATENCY_DOWNLOAD_TIME_CALCULATION_MODE.AAST) {
                                    // If there is pending data, call progress so network metrics
                                    // are correctly generated
                                    // Same structure as https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequestEventTarget/
                                    let calculatedThroughput = null;
                                    let calculatedTime = null;
                                    if (calculationMode === Constants.LOW_LATENCY_DOWNLOAD_TIME_CALCULATION_MODE.MOOF_PARSING) {
                                        calculatedThroughput = _calculateThroughputByChunkData(moofStartTimeData, mdatEndTimeData);
                                        if (calculatedThroughput) {
                                            calculatedTime = bytesReceived * 8 / calculatedThroughput;
                                        }
                                    } else if (calculationMode === Constants.LOW_LATENCY_DOWNLOAD_TIME_CALCULATION_MODE.DOWNLOADED_DATA) {
                                        calculatedTime = calculateDownloadedTime(downloadedData, bytesReceived);
                                    }

                                    httpRequest.customData.onprogress({
                                        loaded: bytesReceived,
                                        total: isNaN(totalBytes) ? bytesReceived : totalBytes,
                                        lengthComputable: true,
                                        time: calculatedTime
                                    });
                                }

                                httpResponse.data = receivedData.buffer;
                            }
                            httpRequest.customData.onloadend();
                        }

                        /**
                         * Called every time we received data
                         * @param value
                         * @private
                         */
                        function _handleDataReceived(value) {
                            receivedData = _concatTypedArray(receivedData, value);
                            bytesReceived += value.length;

                            downloadedData.push({
                                ts: performance.now(),
                                bytes: value.length
                            });

                            if (calculationMode === Constants.LOW_LATENCY_DOWNLOAD_TIME_CALCULATION_MODE.MOOF_PARSING && lastChunkWasFinished) {
                                // Parse the payload and capture  the 'moof' box
                                const boxesInfo = boxParser.findLastTopIsoBoxCompleted(['moof'], receivedData, offset);
                                if (boxesInfo.found) {
                                    // Store the beginning time of each chunk download in array StartTimeData
                                    lastChunkWasFinished = false;
                                    moofStartTimeData.push({
                                        ts: performance.now(),
                                        bytes: value.length
                                    });
                                }
                            }

                            const boxesInfo = boxParser.findLastTopIsoBoxCompleted(['moov', 'mdat'], receivedData, offset);
                            if (boxesInfo.found) {
                                const endOfLastBox = boxesInfo.lastCompletedOffset + boxesInfo.size;

                                // Store the end time of each chunk download  with its size in array EndTimeData
                                if (calculationMode === Constants.LOW_LATENCY_DOWNLOAD_TIME_CALCULATION_MODE.MOOF_PARSING && !lastChunkWasFinished) {
                                    lastChunkWasFinished = true;
                                    mdatEndTimeData.push({
                                        ts: performance.now(),
                                        bytes: receivedData.length
                                    });
                                }

                                // Make the data that we received available for playback
                                // If we are going to pass full buffer, avoid copying it and pass
                                // complete buffer. Otherwise, clone the part of the buffer that is completed
                                // and adjust remaining buffer. A clone is needed because ArrayBuffer of a typed-array
                                // keeps a reference to the original data
                                let data;
                                if (endOfLastBox === receivedData.length) {
                                    data = receivedData;
                                    receivedData = new Uint8Array();
                                } else {
                                    data = new Uint8Array(receivedData.subarray(0, endOfLastBox));
                                    receivedData = receivedData.subarray(endOfLastBox);
                                }

                                // Announce progress but don't track traces. Throughput measures are quite unstable
                                // when they are based in small amount of data
                                httpRequest.customData.onprogress({
                                    data: data.buffer,
                                    lengthComputable: false,
                                    noTrace: true
                                });

                                offset = 0;
                            } else {
                                offset = boxesInfo.lastCompletedOffset;
                                // Call progress, so it generates traces that will be later used to know when the first byte
                                // were received
                                if (!signaledFirstByte) {
                                    httpRequest.customData.onprogress({
                                        lengthComputable: false,
                                        noTrace: true
                                    });
                                    signaledFirstByte = true;
                                }
                            }
                        }

                        _read(httpRequest, httpResponse, _processResult);
                    })
                    .catch(function (e) {
                        httpRequest.customData.onloadend(e);
                    });
            });
    }


    function _aastProcessResponse(markBeforeFetch, httpRequest, requestTime, throughputCapacityDelayMS, responseHeaders, response) {
        let markA = markBeforeFetch;
        let markB = 0;

        function fetchMeassurement(stream) {
            const reader = stream.getReader();
            const measurement = [];
            const fragmentRequest = httpRequest.customData.request;

            reader.read()
                .then(function processFetch(args) {
                    const value = args.value;
                    const done = args.done;
                    markB = performance.now();

                    if (value && value.length) {
                        const chunkDownloadDurationMS = markB - markA;
                        const chunkBytes = value.length;
                        measurement.push({
                            chunkDownloadTimeRelativeMS: markB - markBeforeFetch,
                            chunkDownloadDurationMS,
                            chunkBytes,
                            kbps: Math.round(8 * chunkBytes / (chunkDownloadDurationMS / 1000)),
                            bufferLevel: dashMetrics.getCurrentBufferLevel(fragmentRequest.mediaType)
                        });
                    }

                    if (done) {

                        const fetchDuration = markB - markBeforeFetch;
                        const bytesAllChunks = measurement.reduce((prev, curr) => prev + curr.chunkBytes, 0);

                        aastLowLatencyThroughputModel.addMeasurement(fragmentRequest, fetchDuration, measurement, requestTime, throughputCapacityDelayMS, responseHeaders);

                        httpRequest.progress({
                            loaded: bytesAllChunks,
                            total: bytesAllChunks,
                            lengthComputable: true,
                            time: aastLowLatencyThroughputModel.getEstimatedDownloadDurationMS(fragmentRequest)
                        });
                        return;
                    }
                    markA = performance.now();
                    return reader.read().then(processFetch);
                });
        }

        // tee'ing streams is supported by all current major browsers
        // https://developer.mozilla.org/en-US/docs/Web/API/ReadableStream/tee
        const [forMeasure, forConsumer] = response.body.tee();
        fetchMeassurement(forMeasure);
        httpRequest.customData.reader = forConsumer.getReader();
    }

    /**
     * Reads the response of the request. For details refer to https://developer.mozilla.org/en-US/docs/Web/API/ReadableStreamDefaultReader/read
     * @param httpRequest
     * @param processResult
     * @private
     */
    function _read(httpRequest, httpResponse, processResult) {
        httpRequest.customData.reader.read()
            .then(processResult)
            .catch(function () {
                if (httpRequest.customData.onloadend) {
                    httpRequest.customData.onloadend();
                }
            });
    }

    /**
     * Creates a new Uint8 array and adds the existing data as well as new data
     * @param receivedData
     * @param data
     * @returns {Uint8Array|*}
     * @private
     */
    function _concatTypedArray(receivedData, data) {
        if (receivedData.length === 0) {
            return data;
        }
        const result = new Uint8Array(receivedData.length + data.length);
        result.set(receivedData);

        // set(typedarray, targetOffset)
        result.set(data, receivedData.length);

        return result;
    }

    /**
     * Use the AbortController to abort a request
     * @param request
     */
    function abort() {
        // this = httpRequest (CommonMediaRequest)
        if (this.customData.abortController) {
            // For firefox and edge
            this.customData.abortController.abort();
        } else if (this.customData.reader) {
            // For Chrome
            try {
                this.customData.reader.cancel();
                this.onabort();
            } catch (e) {
                // throw exceptions (TypeError) when reader was previously closed,
                // for example, because a network issue
            }
        }
    }

    /**
     * Default throughput calculation
     * @param downloadedData
     * @param bytesReceived
     * @returns {number|null}
     * @private
     */
    function calculateDownloadedTime(downloadedData, bytesReceived) {
        try {
            downloadedData = downloadedData.filter(data => data.bytes > ((bytesReceived / 4) / downloadedData.length));
            if (downloadedData.length > 1) {
                let time = 0;
                const avgTimeDistance = (downloadedData[downloadedData.length - 1].ts - downloadedData[0].ts) / downloadedData.length;
                downloadedData.forEach((data, index) => {
                    // To be counted the data has to be over a threshold
                    const next = downloadedData[index + 1];
                    if (next) {
                        const distance = next.ts - data.ts;
                        time += distance < avgTimeDistance ? distance : 0;
                    }
                });
                return time;
            }
            return null;
        } catch (e) {
            return null;
        }
    }

    /**
     * Moof based throughput calculation
     * @param startTimeData
     * @param endTimeData
     * @returns {number|null}
     * @private
     */
    function _calculateThroughputByChunkData(startTimeData, endTimeData) {
        try {
            let datum, datumE;
            // Filter the last chunks in a segment in both arrays [StartTimeData and EndTimeData]
            datum = startTimeData.filter((data, i) => i < startTimeData.length - 1);
            datumE = endTimeData.filter((dataE, i) => i < endTimeData.length - 1);
            let chunkThroughputs = [];
            // Compute the average throughput of the filtered chunk data
            if (datum.length > 1) {
                let shortDurationBytesReceived = 0;
                let shortDurationStartTime = 0;
                for (let i = 0; i < datum.length; i++) {
                    if (datum[i] && datumE[i]) {
                        let chunkDownloadTime = datumE[i].ts - datum[i].ts;
                        if (chunkDownloadTime > 1) {
                            chunkThroughputs.push((8 * datumE[i].bytes) / chunkDownloadTime);
                            shortDurationStartTime = 0;
                        } else {
                            if (shortDurationStartTime === 0) {
                                shortDurationStartTime = datum[i].ts;
                                shortDurationBytesReceived = 0;
                            }
                            let cumulatedChunkDownloadTime = datumE[i].ts - shortDurationStartTime;
                            if (cumulatedChunkDownloadTime > 1) {
                                shortDurationBytesReceived += datumE[i].bytes;
                                chunkThroughputs.push((8 * shortDurationBytesReceived) / cumulatedChunkDownloadTime);
                                shortDurationStartTime = 0;
                            } else {
                                // continue cumulating short duration data
                                shortDurationBytesReceived += datumE[i].bytes;
                            }
                        }
                    }
                }

                if (chunkThroughputs.length > 0) {
                    const sumOfChunkThroughputs = chunkThroughputs.reduce((a, b) => a + b, 0);
                    return sumOfChunkThroughputs / chunkThroughputs.length;
                }
            }

            return null;
        } catch (e) {
            return null;
        }
    }

    instance = {
        load,
        abort,
        setConfig,
        calculateDownloadedTime
    };

    return instance;
}

FetchLoader.__dashjs_factory_name = 'FetchLoader';

const factory = FactoryMaker.getClassFactory(FetchLoader);
export default factory;
