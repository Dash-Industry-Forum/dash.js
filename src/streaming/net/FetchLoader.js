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

/**
 * @module FetchLoader
 * @ignore
 * @description Manages download of resources via HTTP using fetch.
 */
function FetchLoader() {

    const context = this.context;
    const settings = Settings(context).getInstance();
    let instance, boxParser;

    function setConfig(cfg) {
        boxParser = cfg.boxParser
    }

    /**
     * Load request
     * With HTTP responses that use chunked transfer encoding, the promise returned by fetch will resolve as soon as the response's headers are received.
     * @param {CommonMediaRequest} commonMediaRequest
     * @param {CommonMediaResponse} commonMediaResponse
     */
    function load(commonMediaRequest, commonMediaResponse) {
        const headers = _getHeaders(commonMediaRequest);
        const abortController = _setupAbortMechanism(commonMediaRequest);
        const fetchResourceRequestObject = _getFetchResourceRequestObject(commonMediaRequest, headers, abortController);

        fetch(fetchResourceRequestObject)
            .then((fetchResponse) => {
                _handleFetchResponse(fetchResponse, commonMediaRequest, commonMediaResponse);
            })
            .catch(() => {
                _handleFetchError(commonMediaRequest);
            })
    }

    function _handleFetchResponse(fetchResponse, commonMediaRequest, commonMediaResponse) {
        _updateCommonMediaResponseInstance(commonMediaResponse, fetchResponse);

        if (!fetchResponse.ok) {
            commonMediaRequest.customData.onloadend();
        }

        const totalBytes = parseInt(fetchResponse.headers.get('Content-Length'), 10);
        let bytesReceived = 0;
        let signaledFirstByte = false;
        let receivedData = new Uint8Array();
        let offset = 0;

        commonMediaRequest.customData.reader = fetchResponse.body.getReader();
        let downloadedData = [];
        let moofStartTimeData = [];
        let mdatEndTimeData = [];
        let lastChunkWasFinished = true;

        const calculationMode = settings.get().streaming.abr.throughput.lowLatencyDownloadTimeCalculationMode;

        /**
         * Callback function for ReadableStreamDefaultReader
         * @param value - chunk data. Always undefined when done is true.
         * @param done - true if the stream has already given you all its data.
         */
        const _processResult = ({ value, done }) => { // Bug fix Parse whenever data is coming [value] better than 1ms looking that increase CPU

            if (done) {
                _handleRequestComplete()
                return;
            }

            if (value && value.length > 0) {
                _handleReceivedChunkData(value)
            }

            _readResponseBody(commonMediaRequest, commonMediaResponse, _processResult);
        };

        /**
         * Once a request is completed throw final progress event with the calculated bytes and download time
         * @private
         */
        function _handleRequestComplete() {
            if (receivedData) {
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

                commonMediaRequest.customData.onprogress({
                    loaded: bytesReceived,
                    total: isNaN(totalBytes) ? bytesReceived : totalBytes,
                    lengthComputable: true,
                    time: calculatedTime
                });

                commonMediaResponse.data = receivedData.buffer;
            }
            commonMediaRequest.customData.onloadend();
        }

        function _getDownloadTimeForMoofParsing() {

        }

        /**
         * Called every time we received data if the request is not completed
         * @param value
         * @private
         */
        function _handleReceivedChunkData(value) {
            receivedData = _concatTypedArray(receivedData, value);
            bytesReceived += value.length;

            downloadedData.push({
                timestamp: _getCurrentTimestamp(),
                bytes: value.length
            });

            if (calculationMode === Constants.LOW_LATENCY_DOWNLOAD_TIME_CALCULATION_MODE.MOOF_PARSING && lastChunkWasFinished) {
                _handleFinishedChunkForMoofParsing(value);
            }

            const boxesInfo = boxParser.findLastTopIsoBoxCompleted(['moov', 'mdat'], receivedData, offset);
            if (boxesInfo.found) {
                _handleTopIsoBoxCompleted(boxesInfo);
            } else {
                _handleNoCompletedTopIsoBox(boxesInfo);
            }
        }

        function _handleFinishedChunkForMoofParsing(value) {
            // Parse the payload and capture  the 'moof' box
            const boxesInfo = boxParser.findLastTopIsoBoxCompleted(['moof'], receivedData, offset);
            if (boxesInfo.found) {
                // Store the beginning time of each chunk download in array StartTimeData
                lastChunkWasFinished = false;
                moofStartTimeData.push({
                    timestamp: _getCurrentTimestamp(),
                    bytes: value.length
                });
            }
        }

        function _handleTopIsoBoxCompleted(boxesInfo) {
            const endOfLastBox = boxesInfo.lastCompletedOffset + boxesInfo.size;

            // Store the end time of each chunk download  with its size in array EndTimeData
            if (calculationMode === Constants.LOW_LATENCY_DOWNLOAD_TIME_CALCULATION_MODE.MOOF_PARSING && !lastChunkWasFinished) {
                lastChunkWasFinished = true;
                mdatEndTimeData.push({
                    timestamp: _getCurrentTimestamp(),
                    bytes: receivedData.length
                });
            }


            const data = _handleReceivedData(endOfLastBox);

            // Announce progress but don't track traces. Throughput measures are quite unstable
            // when they are based in small amount of data
            commonMediaRequest.customData.onprogress({
                data: data.buffer,
                lengthComputable: false,
                noTrace: true
            });

            offset = 0;
        }

        /**
         * Make the data that we received available for playback
         * If we are going to pass full buffer, avoid copying it and pass
         * complete buffer. Otherwise, clone the part of the buffer that is completed
         * and adjust remaining buffer. A clone is needed because ArrayBuffer of a typed-array
         * keeps a reference to the original data
         * @param endOfLastBox
         * @returns {Uint8Array}
         * @private
         */
        function _handleReceivedData(endOfLastBox) {
            let data;

            if (endOfLastBox === receivedData.length) {
                data = receivedData;
                receivedData = new Uint8Array();
            } else {
                data = new Uint8Array(receivedData.subarray(0, endOfLastBox));
                receivedData = receivedData.subarray(endOfLastBox);
            }

            return data
        }

        function _handleNoCompletedTopIsoBox(boxesInfo) {
            offset = boxesInfo.lastCompletedOffset;
            // Call progress, so it generates traces that will be later used to know when the first byte
            // were received
            if (!signaledFirstByte) {
                commonMediaRequest.customData.onprogress({
                    lengthComputable: false,
                    noTrace: true
                });
                signaledFirstByte = true;
            }
        }

        _readResponseBody(commonMediaRequest, commonMediaResponse, _processResult);
    }

    /**
     * Reads the response of the request. For details refer to https://developer.mozilla.org/en-US/docs/Web/API/ReadableStreamDefaultReader/read
     * @param {CommonMediaRequest} commonMediaRequest
     * @param {CommonMediaResponse} commonMediaResponse
     * @param processResult
     * @private
     */
    function _readResponseBody(commonMediaRequest, commonMediaResponse, processResult) {
        commonMediaRequest.customData.reader.read()
            .then(processResult)
            .catch(function () {
                _handleFetchError(commonMediaRequest);
            });
    }

    function _handleFetchError(commonMediaRequest) {
        if (commonMediaRequest.customData.onloadend) {
            commonMediaRequest.customData.onloadend();
        }
    }

    function _updateCommonMediaResponseInstance(commonMediaResponse, fetchResponse) {
        commonMediaResponse.status = fetchResponse.status;
        commonMediaResponse.statusText = fetchResponse.statusText;
        commonMediaResponse.url = fetchResponse.url;

        const responseHeaders = {};
        for (const key of fetchResponse.headers.keys()) {
            responseHeaders[key] = fetchResponse.headers.get(key);
        }
        commonMediaResponse.headers = responseHeaders;
    }

    function _getHeaders(commonMediaRequest) {
        const headers = new Headers();

        if (commonMediaRequest.headers) {
            for (let header in commonMediaRequest.headers) {
                let value = commonMediaRequest.headers[header];
                if (value) {
                    headers.append(header, value);
                }
            }
        }

        return headers
    }

    function _setupAbortMechanism(commonMediaRequest) {
        let abortController;

        if (typeof window.AbortController === 'function') {
            abortController = new AbortController();
            commonMediaRequest.customData.abortController = abortController;
            abortController.signal.onabort = commonMediaRequest.customData.onabort;
        }

        commonMediaRequest.customData.abort = abort.bind(commonMediaRequest);

        return abortController
    }

    function _getFetchResourceRequestObject(commonMediaRequest, headers, abortController) {
        const fetchResourceRequestObject = new Request(commonMediaRequest.url, {
            method: commonMediaRequest.method,
            headers: headers,
            credentials: commonMediaRequest.credentials,
            signal: abortController ? abortController.signal : undefined
        });

        return fetchResourceRequestObject
    }

    function _getCurrentTimestamp() {
        if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
            return performance.now();
        } else {
            return Date.now();
        }
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

    function reset() {

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
                const avgTimeDistance = (downloadedData[downloadedData.length - 1].timestamp - downloadedData[0].timestamp) / downloadedData.length;
                downloadedData.forEach((data, index) => {
                    // To be counted the data has to be over a threshold
                    const next = downloadedData[index + 1];
                    if (next) {
                        const distance = next.timestamp - data.timestamp;
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
                        let chunkDownloadTime = datumE[i].timestamp - datum[i].timestamp;
                        if (chunkDownloadTime > 1) {
                            chunkThroughputs.push((8 * datumE[i].bytes) / chunkDownloadTime);
                            shortDurationStartTime = 0;
                        } else {
                            if (shortDurationStartTime === 0) {
                                shortDurationStartTime = datum[i].timestamp;
                                shortDurationBytesReceived = 0;
                            }
                            let cumulatedChunkDownloadTime = datumE[i].timestamp - shortDurationStartTime;
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
        abort,
        calculateDownloadedTime,
        load,
        reset,
        setConfig,
    };

    return instance;
}

FetchLoader.__dashjs_factory_name = 'FetchLoader';

const factory = FactoryMaker.getClassFactory(FetchLoader);
export default factory;
