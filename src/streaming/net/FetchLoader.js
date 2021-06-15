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

import FactoryMaker from '../../core/FactoryMaker';
import Settings from '../../core/Settings';
import Constants from '../constants/Constants';

/**
 * @module FetchLoader
 * @ignore
 * @description Manages download of resources via HTTP using fetch.
 * @param {Object} cfg - dependencies from parent
 */
function FetchLoader(cfg) {

    cfg = cfg || {};
    const context = this.context;
    const requestModifier = cfg.requestModifier;
    const lowLatencyThroughputModel = cfg.lowLatencyThroughputModel;
    const boxParser = cfg.boxParser;
    const settings = Settings(context).getInstance();
    let instance, dashMetrics;

    function setup(cfg) {
        dashMetrics = cfg.dashMetrics;
    }

    function load(httpRequest) {

        // Variables will be used in the callback functions
        const requestStartTime = new Date();
        const request = httpRequest.request;

        const headers = new Headers(); /*jshint ignore:line*/
        if (request.range) {
            headers.append('Range', 'bytes=' + request.range);
        }

        if (httpRequest.headers) {
            for (let header in httpRequest.headers) {
                let value = httpRequest.headers[header];
                if (value) {
                    headers.append(header, value);
                }
            }
        }

        if (!request.requestStartDate) {
            request.requestStartDate = requestStartTime;
        }

        if (requestModifier) {
            // modifyRequestHeader expects a XMLHttpRequest object so,
            // to keep backward compatibility, we should expose a setRequestHeader method
            // TODO: Remove RequestModifier dependency on XMLHttpRequest object and define
            // a more generic way to intercept/modify requests
            requestModifier.modifyRequestHeader({
                setRequestHeader: function (header, value) {
                    headers.append(header, value);
                }
            });
        }

        let abortController;
        if (typeof window.AbortController === 'function') {
            abortController = new AbortController(); /*jshint ignore:line*/
            httpRequest.abortController = abortController;
            abortController.signal.onabort = httpRequest.onabort;
        }

        const reqOptions = {
            method: httpRequest.method,
            headers: headers,
            credentials: httpRequest.withCredentials ? 'include' : undefined,
            signal: abortController ? abortController.signal : undefined
        };

        const calculationMode = settings.get().streaming.abr.fetchThroughputCalculationMode;
        const requestTime = Date.now();
        let throughputCapacityDelayMS = 0;

        new Promise((resolve) => {
            if (calculationMode === Constants.ABR_FETCH_THROUGHPUT_CALCULATION_AAST && lowLatencyThroughputModel) {
                throughputCapacityDelayMS = lowLatencyThroughputModel.getThroughputCapacityDelayMS(request, dashMetrics.getCurrentBufferLevel(request.mediaType) * 1000);
                if (throughputCapacityDelayMS) {
                    // safely delay the "fetch" call a bit to be able to meassure the throughput capacity of the line.
                    // this will lead to first few chunks downloaded at max network speed
                    return setTimeout(resolve, throughputCapacityDelayMS);
                }
            }
            resolve();
        })
            .then(() => {
                let markBeforeFetch = Date.now();

                fetch(httpRequest.url, reqOptions).then(function (response) {
                    if (!httpRequest.response) {
                        httpRequest.response = {};
                    }
                    httpRequest.response.status = response.status;
                    httpRequest.response.statusText = response.statusText;
                    httpRequest.response.responseURL = response.url;

                    if (!response.ok) {
                        httpRequest.onerror();
                    }

                    let responseHeaders = '';
                    for (const key of response.headers.keys()) {
                        responseHeaders += key + ': ' + response.headers.get(key) + '\r\n';
                    }
                    httpRequest.response.responseHeaders = responseHeaders;

                    if (!response.body) {
                        // Fetch returning a ReadableStream response body is not currently supported by all browsers.
                        // Browser compatibility: https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API
                        // If it is not supported, returning the whole segment when it's ready (as xhr)
                        return response.arrayBuffer().then(function (buffer) {
                            httpRequest.response.response = buffer;
                            const event = {
                                loaded: buffer.byteLength,
                                total: buffer.byteLength,
                                stream: false
                            };
                            httpRequest.progress(event);
                            httpRequest.onload();
                            httpRequest.onend();
                            return;
                        });
                    }

                    const totalBytes = parseInt(response.headers.get('Content-Length'), 10);
                    let bytesReceived = 0;
                    let signaledFirstByte = false;
                    let remaining = new Uint8Array();
                    let offset = 0;

                    if (calculationMode === Constants.ABR_FETCH_THROUGHPUT_CALCULATION_AAST && lowLatencyThroughputModel) {
                        let markA = markBeforeFetch;
                        let markB = 0;

                        function fetchMeassurement(stream) {
                            const reader = stream.getReader();
                            const measurement = [];

                            reader.read().then(function processFetch(args) {
                                const value = args.value;
                                const done = args.done;
                                markB = Date.now()

                                if (value && value.length) {
                                    const chunkDownloadDurationMS = markB - markA;
                                    const chunkBytes = value.length;
                                    measurement.push({
                                        chunkDownloadTimeRelativeMS: markB - markBeforeFetch,
                                        chunkDownloadDurationMS,
                                        chunkBytes,
                                        kbps: Math.round(8 * chunkBytes / (chunkDownloadDurationMS / 1000)),
                                        bufferLevel: dashMetrics.getCurrentBufferLevel(request.mediaType)
                                    });
                                }

                                if (done) {

                                    const fetchDuration = markB - markBeforeFetch;
                                    const bytesAllChunks = measurement.reduce((prev, curr) => prev + curr.chunkBytes, 0);

                                    lowLatencyThroughputModel.addMeasurement(request, fetchDuration, measurement, requestTime, throughputCapacityDelayMS, responseHeaders);

                                    httpRequest.progress({
                                        loaded: bytesAllChunks,
                                        total: bytesAllChunks,
                                        lengthComputable: true,
                                        time: lowLatencyThroughputModel.getEstimatedDownloadDurationMS(request),
                                        stream: true
                                    });
                                    return;
                                }
                                markA = Date.now();
                                return reader.read().then(processFetch);
                            });
                        }
                        // tee'ing streams is supported by all current major browsers
                        // https://developer.mozilla.org/en-US/docs/Web/API/ReadableStream/tee
                        const [forMeasure, forConsumer] = response.body.tee();
                        fetchMeassurement(forMeasure);
                        httpRequest.reader = forConsumer.getReader();
                    } else {
                        httpRequest.reader = response.body.getReader();
                    }

                    let downloadedData = [];
                    let startTimeData = [];
                    let endTimeData = [];
                    let lastChunkWasFinished = true;


                    const processResult = function ({ value, done }) { // Bug fix Parse whenever data is coming [value] better than 1ms looking that increase CPU
                        if (done) {
                            if (remaining) {
                                if (calculationMode !== Constants.ABR_FETCH_THROUGHPUT_CALCULATION_AAST) {
                                    // If there is pending data, call progress so network metrics
                                    // are correctly generated
                                    // Same structure as https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequestEventTarget/
                                    let calculatedThroughput = null;
                                    if (calculationMode === Constants.ABR_FETCH_THROUGHPUT_CALCULATION_MOOF_PARSING) {
                                        calculatedThroughput = calculateThroughputByChunkData(startTimeData, endTimeData);
                                    }

                                    httpRequest.progress({
                                        loaded: bytesReceived,
                                        total: isNaN(totalBytes) ? bytesReceived : totalBytes,
                                        lengthComputable: true,
                                        time: calculateDownloadedTime(downloadedData, bytesReceived),
                                        throughput: calculatedThroughput,
                                        stream: true
                                    });
                                }

                                httpRequest.response.response = remaining.buffer;
                            }
                            httpRequest.onload();
                            httpRequest.onend();
                            return;
                        }

                        if (value && value.length > 0) {
                            remaining = concatTypedArray(remaining, value);
                            bytesReceived += value.length;

                            downloadedData.push({
                                ts: Date.now(),
                                bytes: value.length
                            });

                            if (calculationMode === Constants.ABR_FETCH_THROUGHPUT_CALCULATION_MOOF_PARSING && lastChunkWasFinished) {
                                // Parse the payload and capture the the 'moof' box
                                const boxesInfo = boxParser.findLastTopIsoBoxCompleted(['moof'], remaining, offset);
                                if (boxesInfo.found) {
                                    // Store the beginning time of each chunk download in array StartTimeData
                                    lastChunkWasFinished = false;
                                    startTimeData.push({
                                        ts: performance.now(), /* jshint ignore:line */
                                        bytes: value.length
                                    });
                                }
                            }

                            const boxesInfo = boxParser.findLastTopIsoBoxCompleted(['moov', 'mdat'], remaining, offset);
                            if (boxesInfo.found) {
                                const end = boxesInfo.lastCompletedOffset + boxesInfo.size;

                                // Store the end time of each chunk download  with its size in array EndTimeData
                                if (calculationMode === Constants.ABR_FETCH_THROUGHPUT_CALCULATION_MOOF_PARSING && !lastChunkWasFinished) {
                                    lastChunkWasFinished = true;
                                    endTimeData.push({
                                        ts: performance.now(), /* jshint ignore:line */
                                        bytes: remaining.length
                                    });
                                }

                                // If we are going to pass full buffer, avoid copying it and pass
                                // complete buffer. Otherwise clone the part of the buffer that is completed
                                // and adjust remaining buffer. A clone is needed because ArrayBuffer of a typed-array
                                // keeps a reference to the original data
                                let data;
                                if (end === remaining.length) {
                                    data = remaining;
                                    remaining = new Uint8Array();
                                } else {
                                    data = new Uint8Array(remaining.subarray(0, end));
                                    remaining = remaining.subarray(end);
                                }
                                // Announce progress but don't track traces. Throughput measures are quite unstable
                                // when they are based in small amount of data
                                httpRequest.progress({
                                    data: data.buffer,
                                    lengthComputable: false,
                                    noTrace: true
                                });

                                offset = 0;
                            } else {
                                offset = boxesInfo.lastCompletedOffset;
                                // Call progress so it generates traces that will be later used to know when the first byte
                                // were received
                                if (!signaledFirstByte) {
                                    httpRequest.progress({
                                        lengthComputable: false,
                                        noTrace: true
                                    });
                                    signaledFirstByte = true;
                                }
                            }
                        }
                        read(httpRequest, processResult);
                    };
                    read(httpRequest, processResult);
                })
                    .catch(function (e) {
                        if (httpRequest.onerror) {
                            httpRequest.onerror(e);
                        }
                    });
            });
    }

    function read(httpRequest, processResult) {
        httpRequest.reader.read()
            .then(processResult)
            .catch(function (e) {
                if (httpRequest.onerror && httpRequest.response.status === 200) {
                    // Error, but response code is 200, trigger error
                    httpRequest.onerror(e);
                }
            });
    }

    function concatTypedArray(remaining, data) {
        if (remaining.length === 0) {
            return data;
        }
        const result = new Uint8Array(remaining.length + data.length);
        result.set(remaining);
        result.set(data, remaining.length);
        return result;
    }

    function abort(request) {
        if (request.abortController) {
            // For firefox and edge
            request.abortController.abort();
        } else if (request.reader) {
            // For Chrome
            try {
                request.reader.cancel();
                request.onabort();
            } catch (e) {
                // throw exceptions (TypeError) when reader was previously closed,
                // for example, because a network issue
            }
        }
    }

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

    function calculateThroughputByChunkData(startTimeData, endTimeData) {
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
                        } else {
                            if (shortDurationStartTime === 0) {
                                shortDurationStartTime = datum[i].ts;
                            }
                            let cumulatedChunkDownloadTime = datumE[i].ts - shortDurationStartTime;
                            if (cumulatedChunkDownloadTime > 1) {
                                chunkThroughputs.push((8 * shortDurationBytesReceived) / cumulatedChunkDownloadTime);
                                shortDurationBytesReceived = 0;
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
        load: load,
        abort: abort,
        calculateDownloadedTime: calculateDownloadedTime,
        setup
    };

    return instance;
}

FetchLoader.__dashjs_factory_name = 'FetchLoader';

const factory = FactoryMaker.getClassFactory(FetchLoader);
export default factory;
