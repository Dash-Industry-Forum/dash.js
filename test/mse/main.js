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

// This file create the main interface of the app.
'use strict';

(function(){

var timestamp;
var command;
var viewType;
var timeout;
var testsMask;

var loadTests = function(testType) {
  currentTestType = testType;

  // We have to make it compatible to the legacy url format.
  var testName = testType.substr(0, testType.indexOf('-'));
  testName = util.MakeCapitalName(testName) + 'Test';
  return window[testName]();
};

var parseParam = function(param, defaultValue) {
  var regex = new RegExp('(\\?|\\&)' + param + '=([-,\\w]+)', 'g');
  var value = regex.exec(document.URL);
  return value ? value[2] : defaultValue;
};

var parseParams = function() {
  var testType = parseParam('test_type', kDefaultTestType);

  if (!testTypes[testType]) {
    alert('Cannot find test type ' + testType);
    throw 'Cannot find test type ' + testType;
  }

  timestamp = parseParam('timestamp');
  if (!timestamp) return;

  command = parseParam('command');
  viewType = parseParam('view_type');
  TestBase.timeout = parseParam('timeout', TestBase.timeout);

  var disableLog = parseParam('disable_log', 'false');
  window.logging = disableLog !== 'true';
  var loop = parseParam('loop', 'false');
  window.loop = loop === 'true';
  var stoponfailure = parseParam('stoponfailure', 'false');
  window.stoponfailure = stoponfailure === 'true';

  var tests = parseParam('tests');
  var exclude = parseParam('exclude');

  if (tests) {
    testsMask = '';
    tests = tests.split(',').map(function(x) {return parseInt(x);}).
        sort(function(a,b){return a-b;});
    for (var i = 0; i < tests.length; ++i) {
      var index = tests[i] * 1 - 1;
      if (index < 0)
        continue;
      testsMask = util.resize(testsMask, index, '0');
      testsMask += '1';
    }
    testsMask += '0';
  } else if (exclude) {
    exclude = exclude.split(',').map(function(x) {return parseInt(x);}).
        sort(function(a,b){return a-b;});
    testsMask = '';
    for (var i = 0; i < exclude.length; ++i) {
      var index = exclude[i] * 1 - 1;
      if (index < 0)
        continue;
      testsMask = util.resize(testsMask, index, '1');
      testsMask += '0';
    }
    testsMask += '1';
  } else {
    testsMask = parseParam('tests_mask');
    if (!testsMask)
      testsMask = '1';
  }

  var testSuite = loadTests(testType);
  if (viewType)
    testSuite.viewType = viewType;
  return testSuite;
}

var startRunner = function(testSuite) {
  var id = 0;
  var runner = new TestRunner(testSuite, testsMask);

  runner.getNewVideoTag = function() {
    var testarea = document.getElementById('testarea');
    var vid = 'v' + id;
    if (recycleVideoTag)
      ++id;
    if (!document.getElementById(vid)) {
      testarea.innerHTML = '';
      testarea.appendChild(util.createElement('video', vid,  'box-right'));
      document.getElementById(vid).controls = true;
    }
    return document.getElementById(vid);
  }

  runner.getControlContainer = function() {
    return document.getElementById('control');
  }

  window.LOG = function() {
    if (!window.logging)
      return;
    var output = document.getElementById('output');
    var text = '';

    for (var i = 0; i < arguments.length; ++i)
      text += arguments[i].toString() + ' ';

    console.log(text);
    output.value += text + '\n';
  }

  runner.initialize();
  if (command === 'run')
    runner.startTest(0, runner.testList.length);
};

window.startMseTest = function() {
  var testSuite = parseParams();
  if (!timestamp) {
    if (!/\?/.test(document.URL))
      window.location = document.URL + '?timestamp=' + (new Date()).getTime();
    else
      window.location = document.URL + '&timestamp=' + (new Date()).getTime();
    return;
  }
  startRunner(testSuite);
};

})();

