/* Copyright 2013 Google Inc.
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are
 * met:
 *
 *     * Redistributions of source code must retain the above copyright
 * notice, this list of conditions and the following disclaimer.
 *     * Redistributions in binary form must reproduce the above
 * copyright notice, this list of conditions and the following disclaimer
 * in the documentation and/or other materials provided with the
 * distribution.
 *     * Neither the name of Google Inc. nor the names of its
 * contributors may be used to endorse or promote products derived from
 * this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */
'use strict';

(function() {

var TimeoutManager = function(logger) {
  var timers = [];
  var intervals = [];

  var getUniqueItem = function(container) {
    var id = 0;
    while (typeof(container[id]) != 'undefined')
      ++id;
    container[id] = {id: id};
    return container[id];
  };

  var timeoutHandler = function(id) {
    var func = timers[id].func;
    delete timers[id];
    func();
  };

  var intervalHandler = function(id) {
    var func = intervals[id].func;
    func();
  };

  this.setTimeout = function(func, timeout) {
    var timer = getUniqueItem(timers);
    timer.func = func;
    timer.id = window.setTimeout(timeoutHandler, timeout, timer.id);
  };

  this.setInterval = function(func, timeout) {
    var interval = getUniqueItem(intervals);
    interval.func = func;
    interval.id = window.setInterval(intervalHandler, timeout, interval.id);
  };

  this.clearAll = function() {
    for (var id = 0; id < timers.length; ++id)
      if (typeof(timers[id]) != 'undefined')
        window.clearTimeout(timers[id].id);
    timers = [];

    for (var id = 0; id < intervals.length; ++id)
      if (typeof(intervals[id]) != 'undefined')
        window.clearInterval(intervals[id].id);
    intervals = [];
  };
};

window.createTimeoutManager = function(logger) {
  return new TimeoutManager(logger);
};

})();
