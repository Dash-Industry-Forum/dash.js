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
import EventBus from './EventBus';
import Events from './events/Events';
import FactoryMaker from './FactoryMaker';

const LOG_LEVEL_NONE = 0;
const LOG_LEVEL_FATAL = 1;
const LOG_LEVEL_ERROR = 2;
const LOG_LEVEL_WARNING = 3;
const LOG_LEVEL_INFO = 4;
const LOG_LEVEL_DEBUG = 5;

/**
 * @module Debug
 */
function Debug() {

    const context = this.context;
    const eventBus = EventBus(context).getInstance();

    const logFn = [];

    let instance,
        showLogTimestamp,
        showCalleeName,
        startTime,
        logLevel;

    function setup() {
        showLogTimestamp = true;
        showCalleeName = true;
        logLevel = LOG_LEVEL_WARNING;
        startTime = new Date().getTime();

        if (typeof window !== 'undefined' && window.console) {
            logFn[LOG_LEVEL_FATAL] = getLogFn(window.console.error);
            logFn[LOG_LEVEL_ERROR] = getLogFn(window.console.error);
            logFn[LOG_LEVEL_WARNING] = getLogFn(window.console.warn);
            logFn[LOG_LEVEL_INFO] = getLogFn(window.console.info);
            logFn[LOG_LEVEL_DEBUG] = getLogFn(window.console.debug);
        }
    }

    function getLogFn(fn) {
        if (fn && fn.bind) {
            return fn.bind(window.console);
        }
        // if not define, return the default function for reporting logs
        return window.console.log.bind(window.console);
    }

    /**
     * Retrieves a logger which can be used to write logging information in browser console.
     * @param {object} instance Object for which the logger is created. It is used
     * to include calle object information in log messages.
     * @memberof module:Debug
     * @returns {Logger}
     * @instance
     */
    function getLogger(instance) {
        return {
            fatal: fatal.bind(instance),
            error: error.bind(instance),
            warn: warn.bind(instance),
            info: info.bind(instance),
            debug: debug.bind(instance)
        };
    }

    /**
     * Sets up the log level. The levels are cumulative. For example, if you set the log level
     * to dashjs.Debug.LOG_LEVEL_WARNING all warnings, errors and fatals will be logged. Possible values
     *
     * <ul>
     * <li>dashjs.Debug.LOG_LEVEL_NONE<br/>
     * No message is written in the browser console.
     *
     * <li>dashjs.Debug.LOG_LEVEL_FATAL<br/>
     * Log fatal errors. An error is considered fatal when it causes playback to fail completely.
     *
     * <li>dashjs.Debug.LOG_LEVEL_ERROR<br/>
     * Log error messages.
     *
     * <li>dashjs.Debug.LOG_LEVEL_WARNING<br/>
     * Log warning messages.
     *
     * <li>dashjs.Debug.LOG_LEVEL_INFO<br/>
     * Log info messages.
     *
     * <li>dashjs.Debug.LOG_LEVEL_DEBUG<br/>
     * Log debug messages.
     * </ul>
     * @param {number} value Log level
     * @default true
     * @memberof module:Debug
     * @instance
     */
    function setLogLevel(value) {
        logLevel = value;
    }

    /**
     * Use this method to get the current log level.
     * @memberof module:Debug
     * @instance
     */
    function getLogLevel() {
        return logLevel;
    }

    /**
     * Prepends a timestamp in milliseconds to each log message.
     * @param {boolean} value Set to true if you want to see a timestamp in each log message.
     * @default LOG_LEVEL_WARNING
     * @memberof module:Debug
     * @instance
     */
    function setLogTimestampVisible(value) {
        showLogTimestamp = value;
    }
    /**
     * Prepends the callee object name, and media type if available, to each log message.
     * @param {boolean} value Set to true if you want to see the callee object name and media type in each log message.
     * @default true
     * @memberof module:Debug
     * @instance
     */
    function setCalleeNameVisible(value) {
        showCalleeName = value;
    }
    /**
     * Toggles logging to the browser's javascript console.  If you set to false you will still receive a log event with the same message.
     * @param {boolean} value Set to false if you want to turn off logging to the browser's console.
     * @default true
     * @memberof module:Debug
     * @instance
     * @deprecated
     */
    function setLogToBrowserConsole(value) {
        // Replicate functionality previous to log levels feature
        if (value) {
            logLevel = LOG_LEVEL_DEBUG;
        } else {
            logLevel = LOG_LEVEL_NONE;
        }
    }
    /**
     * Use this method to get the state of logToBrowserConsole.
     * @returns {boolean} The current value of logToBrowserConsole
     * @memberof module:Debug
     * @instance
     * @deprecated
     */
    function getLogToBrowserConsole() {
        return logLevel !== LOG_LEVEL_NONE;
    }

    function fatal(...params) {
        doLog(LOG_LEVEL_FATAL, this, ...params);
    }

    function error(...params) {
        doLog(LOG_LEVEL_ERROR, this, ...params);
    }

    function warn(...params) {
        doLog(LOG_LEVEL_WARNING, this, ...params);
    }

    function info(...params) {
        doLog(LOG_LEVEL_INFO, this, ...params);
    }

    function debug(...params) {
        doLog(LOG_LEVEL_DEBUG, this, ...params);
    }

    function doLog(level, _this, ...params) {
        if (logLevel < level) {
            return;
        }

        let message = '';
        let logTime = null;

        if (showLogTimestamp) {
            logTime = new Date().getTime();
            message += '[' + (logTime - startTime) + ']';
        }

        if (showCalleeName && _this && _this.getClassName) {
            message += '[' + _this.getClassName() + ']';
            if (_this.getType) {
                message += '[' + _this.getType() + ']';
            }
        }

        if (message.length > 0) {
            message += ' ';
        }

        Array.apply(null, params).forEach(function (item) {
            message += item + ' ';
        });

        if (logFn[level]) {
            logFn[level](message);
        }

        // TODO: To be removed
        eventBus.trigger(Events.LOG, {message: message});
    }

    instance = {
        getLogger: getLogger,
        setLogTimestampVisible: setLogTimestampVisible,
        setCalleeNameVisible: setCalleeNameVisible,
        setLogToBrowserConsole: setLogToBrowserConsole,
        getLogToBrowserConsole: getLogToBrowserConsole,
        setLogLevel: setLogLevel,
        getLogLevel: getLogLevel
    };

    setup();

    return instance;
}

Debug.__dashjs_factory_name = 'Debug';

const factory = FactoryMaker.getSingletonFactory(Debug);
factory.LOG_LEVEL_NONE = LOG_LEVEL_NONE;
factory.LOG_LEVEL_FATAL = LOG_LEVEL_FATAL;
factory.LOG_LEVEL_ERROR = LOG_LEVEL_ERROR;
factory.LOG_LEVEL_WARNING = LOG_LEVEL_WARNING;
factory.LOG_LEVEL_INFO = LOG_LEVEL_INFO;
factory.LOG_LEVEL_DEBUG = LOG_LEVEL_DEBUG;
FactoryMaker.updateSingletonFactory(Debug.__dashjs_factory_name, factory);
export default factory;
