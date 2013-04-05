/*
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * 
 * author Digital Primates
 * copyright dash-if 2012
 */
MediaPlayer.vo.metrics.TCPConnection = function () {
    "use strict";

    this.tcpid = null;      // Identifier of the TCP connection on which the HTTP request was sent.
    this.dest = null;       // IP Address of the interface over which the client is receiving the TCP data.
    this.topen = null;      // Real-Time | The time at which the connection was opened (sending time of the initial SYN or connect socket operation).
    this.tclose = null;     // Real-Time | The time at which the connection was closed (sending or reception time of FIN or RST or close socket operation).
    this.tconnect = null;   // Connect time in ms (time from sending the initial SYN to receiving the ACK or completion of the connect socket operation).
};

MediaPlayer.vo.metrics.TCPConnection.prototype = {
    constructor: MediaPlayer.vo.metrics.TCPConnection
};