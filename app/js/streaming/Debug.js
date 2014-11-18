/**
 * @copyright The copyright in this software is being made available under the BSD License, included below. This software may be subject to other third party and contributor rights, including patent rights, and no such rights are granted under this license.
 *
 * Copyright (c) 2013, Digital Primates
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met:
 * •  Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer.
 * •  Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or other materials provided with the distribution.
 * •  Neither the name of the Digital Primates nor the names of its contributors may be used to endorse or promote products derived from this software without specific prior written permission.
 *
 * @license THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS “AS IS” AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 * @namespace MediaPlayer.utils.Debug
 *
 */
MediaPlayer.utils.Debug = function () {
    "use strict";

    var logToBrowserConsole = true

    return {
        eventBus: undefined,
        /**
         * Toggles logging to the browser's javascript console.  If you set to false you will still receive a log event with the same message.
         * @param {boolean} value Set to false if you want to turn off logging to the browser's console.
         * @default true
         * @memberof MediaPlayer.utils.Debug#
         */
        setLogToBrowserConsole: function(value) {
            logToBrowserConsole = value;
        },
        /**
         * Use this method to get the state of logToBrowserConsole.
         * @returns {boolean} The current value of logToBrowserConsole
         * @memberof MediaPlayer.utils.Debug#
         */
        getLogToBrowserConsole: function() {
            return logToBrowserConsole;
        },
        /**
         * This method will allow you send log messages to either the browser's console and/or dispatch an event to capture at the media player level.
         * @param {string} message The message you want to log. (Does not currently support comma separated values.)
         * @memberof MediaPlayer.utils.Debug#
         * @todo - add args... and allow comma separated logging values that will auto concat.
         */
        log: function (message) {
            if (logToBrowserConsole){
                console.log(message);
            }

            this.eventBus.dispatchEvent({
                type: "log",
                message: message
            });
        }
    };
};
