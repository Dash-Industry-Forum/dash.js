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

var BYPASS_CACHE = false;

(function() {

if (document.location.host === 'media-element-test.appspot.com') {
  window.testTypes = {
    'progressive-test': {name: 'Progressive Tests', public: false}
  };
  window.kDefaultTestType = 'progressive-test';

} else {
  window.testTypes = {
    'conformance-test': {name: 'Conformance Tests', public: true},
    'performance-test': {name: 'Performance Tests', public: true},
    'endurance-test': {name: 'Endurance Tests', public: true},
    'progressive-test': {name: 'Progressive Tests', public: false}
  };
  window.kDefaultTestType = 'conformance-test';
}


window.currentTestType = null;
window.recycleVideoTag = true;

if (!window.LOG) {
  window.LOG = console.log.bind(console);
}

var TestBase = {};

TestBase.onsourceopen = function() {
  this.log('default onsourceopen()');
};

TestBase.start = function(runner, video) {
  this.log('Test started');
};

TestBase.teardown = function() {
  if (this.video != null) {
    this.video.removeAllEventListeners();
    this.video.pause();
    this.video.src = '';
    if (recycleVideoTag)
      this.video.parentNode.removeChild(this.video);
  }
  this.ms = null;
  this.video = null;
  this.runner = null;
};

TestBase.log = function() {
  var args = Array.prototype.slice.call(arguments, 0);
  args.splice(0, 0, this.desc + ': ');
  LOG.apply(this, args);
};

TestBase.dump = function() {
  if (this.video) {
    this.log('video.currentTime =', this.video.currentTime);
    this.log('video.readyState =', this.video.readyState);
    this.log('video.networkState =', this.video.networkState);
  }
  if (this.ms) {
    this.log('ms.sb count =', this.ms.sourceBuffers.length);
    for (var i = 0; i < this.ms.sourceBuffers.length; ++i) {
      if (this.ms.sourceBuffers[i].buffered) {
        var buffered = this.ms.sourceBuffers[i].buffered;
        this.log('sb' + i + '.buffered.length', buffered.length);
        for (var j = 0; j < buffered.length; ++j) {
          this.log('  ' + j +': (' + buffered.start(j) + ', '
                   + buffered.end(j) + ')');
        }
      } else {
        this.log('sb', i, 'invalid buffered range');
      }
    }
  }
};

TestBase.timeout = 30000;

window.CreateTest = function(name) {
  var t = function() {};
  t.prototype.__proto__ = TestBase;
  t.prototype.desc = name;
  t.prototype.running = false;
  t.prototype.category = '';

  return t;
};

window.CreateMSTest = function(name) {
  var t = CreateTest(name);
  t.prototype.start = function(runner, video) {
    this.ms = new MediaSource();
    this.ms.addEventListener('sourceopen', this.onsourceopen.bind(this));
    if (this.ms.isWrapper)
      this.ms.attachTo(video);
    else
      this.video.src = window.URL.createObjectURL(this.ms);
    this.log('MS test started');
  };
  return t;
};

var TestRunner = function(testSuite, testsMask) {
  this.testView = null;
  this.currentTest = null;
  this.currentTestIdx = 0;
  this.assertThrowsError = true;
  this.XHRManager = createXHRManager(createLogger(this.log.bind(this)));
  this.timeouts = createTimeoutManager(createLogger(this.log.bind(this)));
  this.lastResult = 'pass';

  if (testsMask) {
    this.testList = [];
    testsMask = util.resize(testsMask, testSuite.tests.length,
                            testsMask.substr(-1));
    for (var i = 0; i < testSuite.tests.length; ++i)
      if (testsMask[i] === '1')
        this.testList.push(testSuite.tests[i]);
  } else {
    this.testList = testSuite.tests;
  }
  this.fields = testSuite.fields;
  this.info = testSuite.info;
  this.viewType = testSuite.viewType;
};

TestRunner.prototype.log = function() {
  var args = Array.prototype.slice.call(arguments, 0);
  args.splice(0, 0, 'TestRunner: ');
  LOG.apply(this, args);
};

TestRunner.prototype.assert = function(cond, msg) {
  if (!cond) {
    ++this.testList[this.currentTestIdx].prototype.failures;
    this.updateStatus();
    this.error('Assert failed: ' + msg, false);
  }
}

TestRunner.prototype.checkException = function(testFunc, exceptionCode) {
  try {
    testFunc();
    this.fail('Expect exception ' + exceptionCode);
  }
  catch(err) {
    this.checkEq(err.code, exceptionCode, 'Exception');
  }
}

TestRunner.prototype.check = function(condition, passMsg, failMsg) {
  if (condition)
    this.log(passMsg);
  else
    this.assert(false, failMsg);
}

TestRunner.prototype.checkType = function(x, y, name) {
  var t = typeof(x);
  var result = t === y;
  this.check(result, 'checkType passed: type of ' + name + ' is (' + t + ').',
             'Type of ' + name + ' is (' + t + ') which should be (' + y + ')');
}

TestRunner.prototype.checkEq = function(x, y, name) {
  var result = (x == y) ||
      (typeof(x) === 'number' && typeof(y) === 'number' && isNaN(x) && isNaN(y));
  this.check(result, 'checkEq passed: ' + name + ' is (' + x + ').',
             name + ' is (' + x + ') which should be (' + y + ')');
}

TestRunner.prototype.checkNE = function(x, y, name) {
  var result = (x != y) &&
      !((typeof(x) === 'number' && typeof(y) === 'number' && isNaN(x) && isNaN(y)));
  this.check(result, 'checkNE passed: ' + name + ' is (' + x + ').',
             name + ' is (' + x + ') which shouldn\'t.');
}

TestRunner.prototype.checkApproxEq = function(x, y, name) {
  var diff = Math.abs(x - y);
  var eps = 0.5;
  this.check(diff < eps, 'checkApproxEq passed: ' + name + ' is (' + x + ').',
             name + ' is (' + x + ') which should between [' +
                (y - eps) + ', ' + (y + eps) + ']');
}

TestRunner.prototype.checkGr = function(x, y, name) {
  this.check(x > y, 'checkGr passed: ' + name + ' is (' + x + ').',
             name + ' is (' + x +
                 ') which should be greater than (' + y + ')');
}

TestRunner.prototype.checkGE = function(x, y, name) {
  this.check(x >= y, 'checkGE passed: ' + name + ' is (' + x + ').',
             name + ' is (' + x +
                 ') which should be greater than or equal to (' + y + ')');
}

TestRunner.prototype.checkLE = function(x, y, name) {
  this.check(x <= y, 'checkLE passed: ' + name + ' is (' + x + ').',
             name + ' is (' + x +
                 ') which should be less than or equal to (' + y + ')');
}

TestRunner.prototype.getControlContainer = function() {
  // Override this function to anchor one to the DOM.
  return document.createElement('div');
};

TestRunner.prototype.getNewVideoTag = function() {
  // Override this function to anchor one to the DOM.
  return document.createElement('video');
};

TestRunner.prototype.getOutputArea = function() {
  // Override this function to anchor one to the DOM.
  return document.createElement('textarea');
};

TestRunner.prototype.updateStatus = function() {
  this.testView.getTest(this.currentTestIdx).updateStatus();
}

TestRunner.prototype.initialize = function() {
  var self = this;
  if (this.viewType === 'compact')
    this.testView = CompactTestView.create(this.fields);
  else
    this.testView = FullTestView.create(this.fields);

  this.testView.onrunselected = function() {
    self.startTest(0, self.testList.length);
  };

  for (var i = 0; i < this.testList.length; ++i) {
    this.testList[i].prototype.onclick = this.startTest.bind(this, i, 1);
    this.testView.addTest(this.testList[i].prototype);
  }

  this.testView.generate();

  document.getElementById('info').innerText = this.info;
  this.log('Media Source and Encrypted Media Conformance Tests (version REVISION)');

  this.longestTimeRatio = -1;
  this.longestTest = null;
};

TestRunner.prototype.onfinished = function() {
  this.log('Finished!');
  if (this.longestTest && this.longestTimeRatio > 0) {
    this.log('Longest test is ' + this.longestTest + ', it takes ' +
             this.longestTimeRatio + ' of its timeout.');
  }

  var keepRunning = (!stoponfailure || this.lastResult === 'pass') &&
      loop && (this.testView.anySelected() || this.numOfTestToRun === 1);
  if (keepRunning) {
    this.testToRun = this.numOfTestToRun;
    this.currentTestIdx = this.startIndex;
    this.startNextTest();
  } else {
    this.lastResult = 'pass';
    this.getNewVideoTag();
  }
};

TestRunner.prototype.startTest = function(startIndex, numOfTestToRun) {
  if (!this.currentTest) {
    this.startIndex = startIndex;
    this.numOfTestToRun = numOfTestToRun;
    this.testToRun = numOfTestToRun;
    this.currentTestIdx = startIndex;
    this.startNextTest();
  }
};

TestRunner.prototype.startNextTest = function() {
  if (this.numOfTestToRun != 1) {
    while (this.testToRun > 0 &&
           !this.testView.getTest(this.currentTestIdx).selected()) {
      this.testToRun--;
      this.currentTestIdx++;
    }
  }

  if (this.testToRun <= 0 || (stoponfailure && this.lastResult != 'pass')) {
    this.onfinished();
    return;
  }

  this.currentTest = new this.testList[this.currentTestIdx];
  this.log('Starting test ' + (this.currentTest.index + 1) + ':' +
           this.currentTest.desc + ' with timeout ' +
           this.currentTest.timeout);
  this.timeouts.setTimeout(this.timeout.bind(this),
                                 this.currentTest.timeout);
  this.testList[this.currentTestIdx].prototype.running = true;
  this.updateStatus();

  this.startTime = Date.now();
  this.currentTest.runner = this;
  this.currentTest.video = this.getNewVideoTag();

  var addEventListener = this.currentTest.video.addEventListener;
  this.currentTest.video.eventsAdded = [];
  this.currentTest.video.addEventListener =
      function(type, listener, useCapture) {
        addEventListener.call(this, type, listener, useCapture);
        this.eventsAdded.push([type, listener]);
      };
  this.currentTest.video.removeAllEventListeners = function() {
    for (var i = 0; i < this.eventsAdded.length; ++i) {
      this.removeEventListener(this.eventsAdded[i][0],
                               this.eventsAdded[i][1]);
    }
  };

  this.currentTest.start(this, this.currentTest.video);
};

TestRunner.prototype.succeed = function() {
  this.lastResult = 'pass';
  ++this.testList[this.currentTestIdx].prototype.passes;
  this.updateStatus();
  this.log('Test ' + this.currentTest.desc + ' succeeded.');
  this.teardownCurrentTest(false);
}

TestRunner.prototype.error = function(msg, isTimeout) {
  this.lastResult = isTimeout ? 'timeout' : 'failure';
  var test = this.currentTest;
  this.log(msg);
  try {
    test.dump();
  } catch (e) {
  }
  try {
    var x = y.z.u.v.w;
  } catch (e) {
    if (e && e.stack)
      this.log(e.stack);
  }
  this.teardownCurrentTest(isTimeout);
  if (this.assertThrowsError) throw msg;
}

TestRunner.prototype.fail = function(msg) {
  ++this.testList[this.currentTestIdx].prototype.failures;
  this.updateStatus();
  this.error('Test ' + this.currentTest.desc + ' FAILED: ' + msg, false);
}

TestRunner.prototype.timeout = function() {
  ++this.testList[this.currentTestIdx].prototype.timeouts;
  this.updateStatus();
  this.error('Test ' + this.currentTest.desc + ' TIMED OUT!', true);
}

TestRunner.prototype.teardownCurrentTest = function(isTimeout) {
  if (!isTimeout) {
    var time = Date.now() - this.startTime;
    var ratio = time / this.currentTest.timeout;
    if (ratio >= this.longestTimeRatio) {
      this.longestTimeRatio = ratio;
      this.longestTest = this.currentTest.desc;
      this.log('New longest test ' + this.currentTest.desc +
               ' with timeout ' + this.currentTest.timeout + ' takes '
               + time);
    }
  }

  this.testList[this.currentTestIdx].prototype.running = false;
  this.updateStatus();

  this.timeouts.clearAll();
  this.XHRManager.abortAll();
  this.testView.finishedOneTest();
  this.currentTest.teardown();
  this.currentTest = null;
  this.testToRun--;
  this.currentTestIdx++;
  window.setTimeout(this.startNextTest.bind(this), 1);
};

window.TestBase = TestBase;
window.TestRunner = TestRunner;

window.createSimpleTest = function() {
  window.ms = new MediaSource;
  ms.addEventListener('sourceopen', function() {
    window.vsrc = ms.addSourceBuffer(StreamDef.VideoType);
    window.asrc = ms.addSourceBuffer(StreamDef.AudioType);
    console.log("Objects has been created:\n" +
                "They are video, ms, logger, XHMManager, timeouts, " +
                "vchain, vsrc, achain, asrc");
  });
  window.video = document.createElement('video');
  window.logger = createLogger();
  window.XHRManager = createXHRManager(logger);
  window.timeouts = createTimeoutManager(logger);
  video.src = window.URL.createObjectURL(ms);
  window.vchain = new ResetInit(new FileSource(
      'media/car-20120827-85.mp4', XHRManager, timeouts));
  window.achain = new ResetInit(new FileSource(
      'media/car-20120827-8b.mp4', XHRManager, timeouts));
};

})();

