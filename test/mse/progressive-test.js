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

var ProgressiveTest = function() {

var tests = [];
var info = 'Default Timeout: ' + TestBase.timeout + 'ms';

var fields = ['passes', 'failures', 'timeouts'];

var CreateProgressiveTest = function(category, name) {
  var t = CreateTest(name);
  t.prototype.category = category;
  t.prototype.index = tests.length;
  t.prototype.passes = 0;
  t.prototype.failures = 0;
  t.prototype.timeouts = 0;
  tests.push(t);
  return t;
};


var CreateInitialMediaStateTest = function(state, value, check) {
  var test = CreateProgressiveTest('state before initial', state);

  check = typeof(check) === 'undefined' ? 'checkEq' : check;
  test.prototype.title = 'Test if the state ' + state +
      ' is correct when media element is just created';
  test.prototype.start = function(runner, video) {
    test.prototype.status = util.formatStatus(util.getAttr(video, state));
    runner[check](util.getAttr(video, state), value, state);
    runner.succeed();
  };
};

CreateInitialMediaStateTest('src', '');  // can actually be undefined
CreateInitialMediaStateTest('currentSrc', '');
CreateInitialMediaStateTest('defaultPlaybackRate', 1);
CreateInitialMediaStateTest('playbackRate', 1);
CreateInitialMediaStateTest('duration', NaN);
CreateInitialMediaStateTest('paused', true);
CreateInitialMediaStateTest('seeking', false);
CreateInitialMediaStateTest('ended', false);
CreateInitialMediaStateTest('videoWidth', 0);
CreateInitialMediaStateTest('videoHeight', 0);
CreateInitialMediaStateTest('buffered.length', 0);
CreateInitialMediaStateTest('played.length', 0);
CreateInitialMediaStateTest('seekable.length', 0);
CreateInitialMediaStateTest('networkState', HTMLMediaElement.NETWORK_EMPTY);
CreateInitialMediaStateTest('readyState', HTMLMediaElement.HAVE_NOTHING);


var CreateMediaStateAfterSrcAssignedTest = function(state, value, check) {
  var test = CreateProgressiveTest('state after src assigned', state);

  check = typeof(check) === 'undefined' ? 'checkEq' : check;
  test.prototype.title = 'Test if the state ' + state +
      ' is correct when media element is a src has been assigned';
  test.prototype.start = function(runner, video) {
    video.src = StreamDef.ProgressiveLow.src;
    test.prototype.status = util.formatStatus(util.getAttr(video, state));
    runner[check](util.getAttr(video, state), value, state);
    runner.succeed();
  };
};

CreateMediaStateAfterSrcAssignedTest('networkState',
                                     HTMLMediaElement.NETWORK_NO_SOURCE);
CreateMediaStateAfterSrcAssignedTest('readyState',
                                     HTMLMediaElement.HAVE_NOTHING);
CreateMediaStateAfterSrcAssignedTest('src', '', 'checkNE');


var CreateMediaStateInLoadStart = function(state, value, check) {
  var test = CreateProgressiveTest('state in loadstart', state);

  check = typeof(check) === 'undefined' ? 'checkEq' : check;
  test.prototype.title = 'Test if the state ' + state +
      ' is correct when media element is a src has been assigned';
  test.prototype.start = function(runner, video) {
    video.addEventListener('loadstart', function() {
      test.prototype.status = util.formatStatus(util.getAttr(video, state));
      runner[check](util.getAttr(video, state), value, state);
      runner.succeed();
    });
    video.src = StreamDef.ProgressiveLow.src;
  };
};

CreateMediaStateInLoadStart('networkState', HTMLMediaElement.NETWORK_LOADING);
CreateMediaStateInLoadStart('readyState', HTMLMediaElement.HAVE_NOTHING);
CreateMediaStateInLoadStart('currentSrc', '', 'checkNE');


var CreateProgressTest = function() {
  var test = CreateProgressiveTest('event', 'onprogress');

  test.prototype.title = 'Test if there is progress event.';
  test.prototype.start = function(runner, video) {
    var self = this;
    video.src = StreamDef.ProgressiveLow.src + '?' + Date.now();
    video.addEventListener('progress', function() {
      self.log('onprogress called');
      runner.succeed();
    });
  };
};

CreateProgressTest();


var CreateTimeUpdateTest = function() {
  var test = CreateProgressiveTest('event', 'ontimeupdate');

  test.prototype.title = 'Test if there is timeupdate event.';
  test.prototype.start = function(runner, video) {
    var self = this;
    video.src = StreamDef.ProgressiveLow.src;
    video.addEventListener('timeupdate', function() {
      self.log('ontimeupdate called');
      runner.succeed();
    });
    video.play();
  };
};

CreateTimeUpdateTest();


var CreateCanPlayTest = function() {
  var test = CreateProgressiveTest('event', 'canplay');

  test.prototype.title = 'Test if there is canplay event.';
  test.prototype.start = function(runner, video) {
    var self = this;
    video.src = StreamDef.ProgressiveLow.src;
    video.addEventListener('canplay', function() {
      self.log('canplay called');
      runner.succeed();
    });
  };
};

CreateCanPlayTest();


var CreateAutoPlayTest = function() {
  var test = CreateProgressiveTest('control', 'autoplay');

  test.prototype.title = 'Test if autoplay works';
  test.prototype.start = function(runner, video) {
    var self = this;
    video.autoplay = true;
    video.src = StreamDef.ProgressiveLow.src;
    video.addEventListener('timeupdate', function() {
      self.log('ontimeupdate called');
      runner.succeed();
    });
  };
};

CreateAutoPlayTest();


var CreateNetworkStateTest = function() {
  var test = CreateProgressiveTest('state', 'networkState');

  test.prototype.title = 'Test if the network state is correct';
  test.prototype.start = function(runner, video) {
    var self = this;
    video.src = StreamDef.ProgressiveLow.src;
    video.addEventListener('suspend', function() {
      self.log('onsuspend called');
      runner.checkEq(video.networkState, HTMLMediaElement.NETWORK_IDLE,
                     'networkState');
      runner.succeed();
    });
  };
};

CreateNetworkStateTest();


var CreateOnLoadedMetadataTest = function() {
  var test = CreateProgressiveTest('event', 'onloadedmetadata');

  test.prototype.title = 'Test if the onloadedmetadata is called correctly';
  test.prototype.start = function(runner, video) {
    video.addEventListener('loadedmetadata', function() {
      runner.succeed();
    });
    video.src = 'getvideo.py';
  };
};


// getvideo.py is not supported by AppEngine.
// CreateOnLoadedMetadataTest();


var CreatePlayingWithoutDataPaused = function() {
  var test = CreateProgressiveTest('play without data', 'paused');

  test.prototype.title = 'Test if we can play without any data';
  test.prototype.start = function(runner, video) {
    video.src = 'hang.py';
    video.play();
    test.prototype.status = util.formatStatus(video.paused);
    runner.checkEq(video.paused, false, 'video.paused');
    runner.succeed();
  };
};

CreatePlayingWithoutDataPaused();


var CreatePlayingWithoutDataWaiting = function() {
  var test = CreateProgressiveTest('play without data', 'onwaiting');

  test.prototype.title = 'Test if we can play without any data';
  test.prototype.start = function(runner, video) {
    video.addEventListener('waiting', function() {
      runner.checkEq(video.currentTime, 0, 'video.currentTime');
      runner.succeed();
    });
    video.src = 'hang.py';
    video.play();
  };
};

CreatePlayingWithoutDataWaiting();


var CreateTimeUpdateMaxGranularity = function() {
  var test = CreateProgressiveTest('timeupdate', 'max granularity');

  test.prototype.title = 'Test the time update granularity.';
  test.prototype.start = function(runner, video) {
    var maxGranularity = 0;
    var times = 0;
    var last = 0;
    video.addEventListener('suspend', function() {
      video.play();
      video.addEventListener('timeupdate', function() {
        if (times !== 0) {
          var interval = Date.now() - last;
          if (interval > maxGranularity)
            maxGranularity = interval;
        }
        if (times === 50) {
          maxGranularity = maxGranularity / 1000.0;
          test.prototype.status = util.Round(maxGranularity, 2);
          runner.checkLE(maxGranularity, 0.26, 'maxGranularity');
          runner.succeed();
        }
        last = Date.now();
        ++times;
      });
    });
    video.src = StreamDef.ProgressiveLow.src;
  };
};

CreateTimeUpdateMaxGranularity();


var CreateTimeUpdateMinGranularity = function() {
  var test = CreateProgressiveTest('timeupdate', 'min granularity');

  test.prototype.title = 'Test the time update granularity.';
  test.prototype.start = function(runner, video) {
    var minGranularity = Infinity;
    var times = 0;
    var last = 0;
    video.addEventListener('suspend', function() {
      video.play();
      video.addEventListener('timeupdate', function() {
        if (times !== 0) {
          var interval = Date.now() - last;
          if (interval > 1 && interval < minGranularity)
            minGranularity = interval;
        }
        if (times === 50) {
          minGranularity = minGranularity / 1000.0;
          test.prototype.status = util.Round(minGranularity, 2);
          runner.checkGE(minGranularity, 0.015, 'minGranularity');
          runner.succeed();
        }
        last = Date.now();
        ++times;
      });
    });
    video.src = StreamDef.ProgressiveLow.src;
  };
};

CreateTimeUpdateMinGranularity();


var CreateTimeUpdateAccuracy = function() {
  var test = CreateProgressiveTest('timeupdate', 'accuracy');

  test.prototype.title = 'Test the time update granularity.';
  test.prototype.start = function(runner, video) {
    var maxTimeDiff = 0;
    var baseTimeDiff = 0;
    var times = 0;
    video.addEventListener('suspend', function() {
      video.play();
      video.addEventListener('timeupdate', function() {
        if (times === 0) {
          baseTimeDiff = Date.now() / 1000.0 - video.currentTime;
        } else {
          var timeDiff = Date.now() / 1000.0 - video.currentTime;
          maxTimeDiff = Math.max(Math.abs(timeDiff - baseTimeDiff),
                                 maxTimeDiff);
        }

        if (times > 500 || video.currentTime > 10) {
          test.prototype.status = util.Round(maxTimeDiff, 2);
          runner.checkLE(maxTimeDiff, 0.5, 'maxTimeDiff');
          runner.succeed();
        }
        ++times;
      });
    });
    video.src = StreamDef.ProgressiveLow.src;
  };
};
CreateTimeUpdateAccuracy();


var CreateTimeUpdateProgressing = function() {
  var test = CreateProgressiveTest('timeupdate', 'progressing');

  test.prototype.title = 'Test if the time updates progress.';
  test.prototype.start = function(runner, video) {
    var last = 0;
    var times = 0;
    video.addEventListener('timeupdate', function() {
      if (times === 0) {
        last = video.currentTime;
      } else {
        runner.checkGE(video.currentTime, last, 'video.currentTime');
        last = video.currentTime;
      }

      if (video.currentTime > 10) {
        test.prototype.status = util.Round(video.currentTime, 2);
        runner.succeed();
      }
      ++times;
    });
    video.src = StreamDef.ProgressiveLow.src;
    video.play();
  };
};

CreateTimeUpdateProgressing();


var CreateTimeUpdateProgressingWithInitialSeek = function() {
  var test = CreateProgressiveTest('timeupdate', 'progressing after seek');

  test.prototype.title = 'Test if the time updates progress.';
  test.prototype.start = function(runner, video) {
    var last = 0;
    var times = 0;
    video.addEventListener('canplay', function() {
      video.currentTime = 0.001;
      video.play();
      video.addEventListener('timeupdate', function() {
        if (times === 0) {
          last = video.currentTime;
        } else {
          runner.checkGE(video.currentTime, last, 'video.currentTime');
          last = video.currentTime;
        }

        if (video.currentTime > 10) {
          test.prototype.status = util.Round(video.currentTime, 2);
          runner.succeed();
        }
        ++times;
      });
    });
    video.src = StreamDef.ProgressiveLow.src;
  };
};

CreateTimeUpdateProgressingWithInitialSeek();


return {tests: tests, info: info, fields: fields, viewType: 'compact'};

};

