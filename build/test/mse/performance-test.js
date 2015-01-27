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

var PerformanceTest = function() {

var tests = [];
var info = 'These tests can evaluate the quality of the implementation.';
var fields = ['times', 'min', 'max', 'average', 'baseline PC',
    'baseline device'];

function Profiler() {
  var start = Date.now();
  var last = Date.now();
  var times = 0;

  this.min = Infinity;
  this.max = -Infinity;
  this.average = 0;

  this.tick = function() {
    var curr = Date.now();
    var elapsed = (curr - last) / 1000.;
    last = curr;
    ++times;
    if (elapsed > this.max) this.max = elapsed;
    if (elapsed < this.min) this.min = elapsed;
    this.average = (curr - start) / times / 1000.;
  };
};

var CreatePerformanceTest = function(name) {
  var t = CreateMSTest(name);
  t.prototype.index = tests.length;
  t.prototype.times = 0;
  t.prototype.min = 0;
  t.prototype.max = 0;
  t.prototype.average = 0;
  t.prototype.baseline_PC = 'N/A';
  t.prototype.baseline_device = 'N/A';
  t.prototype.timeout = 2147483647;
  tests.push(t);
  return t;
};


var CreateCreateUint8ArrayTest = function(size, times, refPC, refDevice) {
  var test = CreatePerformanceTest(
      'Create Uint8Array in ' + util.SizeToText(size));
  test.prototype.baseline_PC = refPC;
  test.prototype.baseline_device = refDevice;
  test.prototype.title = 'Measure Uint8Array creation performance.';
  test.prototype.start = function(runner, video) {
    var profiler = new Profiler;
    test.prototype.times = 0;
    var array;
    for (var i = 0; i < times; ++i) {
      array = new Uint8Array(new ArrayBuffer(size));
      array = new Uint8Array(array);
      profiler.tick();
      ++test.prototype.times;
      test.prototype.min = profiler.min;
      test.prototype.max = profiler.max;
      test.prototype.average = util.Round(profiler.average, 3);
      runner.updateStatus();
    }
    runner.succeed();
  };
};

CreateCreateUint8ArrayTest(1024 * 1024, 1, 0.001, 0.002);


var CreateXHRRequestTest = function(size, times) {
  var test = CreatePerformanceTest('XHR Request in ' + util.SizeToText(size));
  test.prototype.title = 'Measure XHR request performance.';
  test.prototype.start = function(runner, video) {
    var startTime = Date.now();
    var profiler = new Profiler;
    test.prototype.times = 0;
    function startXHR(i) {
      var xhr = runner.XHRManager.createRequest(
          'media/car-20120827-85.mp4?x=' + Date.now() + '.' + i,
          function() {
            xhr.getResponseData();
            profiler.tick();
            ++test.prototype.times;
            test.prototype.min = profiler.min;
            test.prototype.max = profiler.max;
            test.prototype.average = util.Round(profiler.average, 3);
            runner.updateStatus();
            if (i < times)
              runner.timeouts.setTimeout(startXHR.bind(null, i + 1), 10);
            else
              runner.succeed();
          }, 0, size);
      xhr.send();
    };
    startXHR(1);
  };
};

CreateXHRRequestTest(4096, 32);
CreateXHRRequestTest(1024 * 1024, 16);
CreateXHRRequestTest(4 * 1024 * 1024, 16);


var CreateXHRAbortTest = function(size, times, refPC, refDevice) {
  var test = CreatePerformanceTest('Abort XHR Request in ' +
                                   util.SizeToText(size));
  test.prototype.baseline_PC = refPC;
  test.prototype.baseline_device = refDevice;
  test.prototype.title = 'Measure how fast to abort XHR request.';
  test.prototype.start = function(runner, video) {
    var startTime = Date.now();
    var profiler = new Profiler;
    test.prototype.times = 0;
    function startXHR(i) {
      var xhr = runner.XHRManager.createRequest(
          'media/car-20120827-85.mp4?x=' + Date.now() + '.' + i,
          function() {});
      xhr.send();
      runner.timeouts.setTimeout(function() {
        xhr.abort();
        profiler.tick();
        ++test.prototype.times;
        test.prototype.min = profiler.min;
        test.prototype.max = profiler.max;
        test.prototype.average = util.Round(profiler.average, 3);
        runner.updateStatus();
        if (i < times)
          startXHR(i + 1);
        else
          runner.succeed();
      }, 0, size);
    };
    startXHR(1);
  };
};

CreateXHRAbortTest(4096, 64, 0.098, 0.125);
CreateXHRAbortTest(1024 * 1024, 64, 0.116, 0.14);
CreateXHRAbortTest(4 * 1024 * 1024, 64, 0.126, 0.15);


var CreateAppendTest = function(stream, size, times, refPC, refDevice) {
  var test = CreatePerformanceTest('Append ' + util.SizeToText(size) +
                                   ' to ' + stream.name + ' source buffer');
  test.prototype.baseline_PC = refPC;
  test.prototype.baseline_device = refDevice;
  test.prototype.title = 'Measure source buffer append performance.';
  test.prototype.onsourceopen = function() {
    var runner = this.runner;
    var sb = this.ms.addSourceBuffer(stream.type);
    var xhr = runner.XHRManager.createRequest(stream.src,
      function(e) {
        var profiler = new Profiler;
        var responseData = xhr.getResponseData();
        test.prototype.times = 0;
        for (var i = 0; i < times; ++i) {
          sb.append(responseData);
          sb.abort();
          sb.timestampOffset = sb.buffered.end(sb.buffered.length - 1);
          profiler.tick();
          ++test.prototype.times;
          test.prototype.min = profiler.min;
          test.prototype.max = profiler.max;
          test.prototype.average = util.Round(profiler.average, 3);
          runner.updateStatus();
        }
        runner.succeed();
      }, 0, size);
    xhr.send();
  };
};

CreateAppendTest(StreamDef.AudioNormal, 16384, 1024, 0.002, 0.12);
CreateAppendTest(StreamDef.AudioNormal, 2 * 1024 * 1024, 128, 0.098, 0.19);
CreateAppendTest(StreamDef.VideoNormal, 16384, 1024, 0.002, 0.1);
CreateAppendTest(StreamDef.VideoNormal, 4 * 1024 * 1024, 64, 0.015, 0.15);


var CreateSeekAccuracyTest = function(stream, size, times, step) {
  var test = CreatePerformanceTest('Video Seek Accuracy Test');
  test.prototype.baseline_PC = 0;
  test.prototype.baseline_device = 0;
  test.prototype.title = 'Measure video seeking accuracy.';
  test.prototype.onsourceopen = function() {
    var runner = this.runner;
    var media = this.video;
    var sb = this.ms.addSourceBuffer(stream.type);
    var seekTime = 0;
    var minimumTimeAfterSeek = Infinity;
    var totalDiff = 0;
    var xhr = runner.XHRManager.createRequest(stream.src,
      function(e) {
        test.prototype.times = 0;
        test.prototype.min = Infinity;
        test.prototype.max = 0;
        sb.append(xhr.getResponseData());
        sb.abort();
        media.addEventListener('timeupdate', function(e) {
          if (media.currentTime < minimumTimeAfterSeek)
            minimumTimeAfterSeek = media.currentTime;
        });
        media.addEventListener('seeked', function(e) {
          if (media.currentTime < minimumTimeAfterSeek)
            minimumTimeAfterSeek = media.currentTime;
          var diff = minimumTimeAfterSeek - seekTime;
          totalDiff += diff;
          ++test.prototype.times;
          if (diff < test.prototype.min) test.prototype.min = diff;
          if (diff > test.prototype.max) test.prototype.max = diff;
          test.prototype.average =
            util.Round(totalDiff / test.prototype.times, 3);
          seekTime += step;
          minimumTimeAfterSeek = Infinity;
          runner.updateStatus();
          if (seekTime < times)
            media.currentTime = seekTime;
          else
            runner.succeed();
        });
        callAfterLoadedMetaData(media, function() {
          media.play();
          media.currentTime = seekTime;
        });
      }, 0, size);
    xhr.send();
  };
};

CreateSeekAccuracyTest(StreamDef.VideoNormal, 12 * 1024 * 1024, 100, 1);


var CreateSeekBackwardsTest = function(audio, video) {
  var test = CreatePerformanceTest('Seek Backwards Test');
  test.prototype.baseline_PC = 0;
  test.prototype.baseline_device = 0;
  test.prototype.title = 'Measure seeking accuracy while seeking backwards.';
  test.prototype.onsourceopen = function() {
    var runner = this.runner;
    var media = this.video;
    var audio_chain = new ResetInit(
        new FileSource(audio.src, runner.XHRManager, runner.timeouts));
    var video_chain = new ResetInit(
        new FileSource(video.src, runner.XHRManager, runner.timeouts));
    var audio_src = this.ms.addSourceBuffer(audio.type);
    var video_src = this.ms.addSourceBuffer(video.type);
    var seekTime = video.duration - 5;
    var minimumTimeAfterSeek = Infinity;
    var totalDiff = 0;
    var doingSeek = false;

    test.prototype.times = 0;
    test.prototype.min = 0;
    test.prototype.max = 0;
    runner.updateStatus();

    var ontimeupdate = function() {
      media.removeEventListener('timeupdate', ontimeupdate);
      if (seekTime > 5) {
        seekTime -= 1;
        doSeek();
      } else {
        runner.succeed();
      }
    };

    var onseeked = function() {
      media.removeEventListener('seeked', onseeked);
      media.addEventListener('timeupdate', ontimeupdate);
    };

    var doSeek = function() {
      if (doingSeek) {
        runner.timeouts.setTimeout(doSeek, 100);
        return;
      }
      doingSeek = true;
      media.addEventListener('seeked', onseeked);
      audio_chain.seek(Math.max(seekTime, 0), audio_src);
      video_chain.seek(seekTime, video_src);
      media.currentTime = seekTime;

      audio_chain.pull(function(data) {
        audio_src.append(data);
        audio_chain.pull(function(data) {
          audio_src.append(data);
          video_chain.pull(function(data) {
            video_src.append(data);
            video_chain.pull(function(data) {
              video_src.append(data);
              video_chain.pull(function(data) {
                video_src.append(data);
                doingSeek = false;
              });
            });
          });
        });
      });
    };

    this.ms.duration = 100000000;  // Ensure that we can seek to any position.
    audio_chain.init(0, function(data) {
      audio_src.append(data);
      video_chain.init(0, function(data) {
        video_src.append(data);
        media.play();
        callAfterLoadedMetaData(media, doSeek);
      });
    });
  };
};

CreateSeekBackwardsTest(StreamDef.AudioNormal, StreamDef.VideoNormal);


var CreateBufferSizeTest = function(stream, refPC, refDevice) {
  var test = CreatePerformanceTest(
      'Buffer Size for ' + stream.name + ' in ' +
      util.SizeToText(stream.bps) + ' bps');
  test.prototype.baseline_PC = refPC;
  test.prototype.baseline_device = refDevice;
  test.prototype.title = 'Determines buffer sizes for different stream '
      'types and qualites.';
  test.prototype.onsourceopen = function() {
    var runner = this.runner;
    var sb = this.ms.addSourceBuffer(stream.type);
    function startXHR() {
      var size = Math.min(stream.size, 1024 * 1024);
      var xhr = runner.XHRManager.createRequest(
          stream.src,
          function() {
            var buf = xhr.getResponseData();
            while (true) {
              var old_end = sb.buffered.length ? sb.buffered.end(0) : 0;
              sb.timestampOffset = old_end;
              sb.append(buf);
              sb.abort();
              var new_end = sb.buffered.length ? sb.buffered.end(0) : 0;
              test.prototype.min = Math.floor(new_end);
              test.prototype.max = Math.floor(new_end);
              test.prototype.average = Math.floor(new_end);
              runner.updateStatus();
              if (new_end <= old_end && new_end !== 0)
                break;
            }
            runner.succeed();
          }, 0, size);
      xhr.send();
    };
    startXHR();
  };
};

CreateBufferSizeTest(StreamDef.AudioTiny, 3147, 512);
CreateBufferSizeTest(StreamDef.AudioNormal, 786, 128);
CreateBufferSizeTest(StreamDef.AudioHuge, 393, 64);

CreateBufferSizeTest(StreamDef.VideoTiny, 4610, 784);
CreateBufferSizeTest(StreamDef.VideoNormal, 1062, 182);
CreateBufferSizeTest(StreamDef.VideoHuge, 281, 47);


var CreatePrerollSizeTest = function(stream, refPC, refDevice) {
  var test = CreatePerformanceTest(
      'Preroll Size for ' + stream.name + ' in ' +
      util.SizeToText(stream.bps) + ' bps');
  test.prototype.baseline_PC = refPC;
  test.prototype.baseline_device = refDevice;
  test.prototype.title = 'Determines preroll sizes for different stream '
      'types and qualites.';
  test.prototype.onsourceopen = function() {
    var runner = this.runner;
    var sb = this.ms.addSourceBuffer(stream.type);
    var end = 0;

    test.prototype.times = 0;
    test.prototype.min = 0;
    test.prototype.max = 0;
    test.prototype.average = 0;
    runner.updateStatus();

    function timeupdate(e) {
      if (this.currentTime) {
        runner.succeed();
      }
    };

    function append(buf) {
      var size = buf.length;
      while (buf.length) {
        var appendSize = Math.min(1, buf.length);
        sb.append(buf.subarray(0, appendSize));
        buf = buf.subarray(appendSize);
        ++test.prototype.times;
        if (sb.buffered.length && sb.buffered.end(0) - end > 0.1) {
          end = sb.buffered.end(0);
          break;
        }
      }

      test.prototype.min = util.Round(end, 3);
      test.prototype.max = util.Round(end, 3);
      test.prototype.average = util.Round(end, 3);
      runner.updateStatus();
      runner.timeouts.setTimeout(append.bind(null, buf), 500);
    };

    function startXHR() {
      var size = Math.min(stream.size, 5 * 1024 * 1024);
      var xhr = runner.XHRManager.createRequest(
          stream.src,
          function() {
            var buf = new Uint8Array(size);
            buf.set(xhr.getResponseData());
            append(buf);
          }, 0, size);
      xhr.send();
    };

    this.video.addEventListener('timeupdate', timeupdate);
    this.video.play();
    startXHR();
  };
};

CreatePrerollSizeTest(StreamDef.AudioTiny, 1.486, 0.557);
CreatePrerollSizeTest(StreamDef.AudioNormal, 0.418, 0.209);
CreatePrerollSizeTest(StreamDef.AudioHuge, 0.418, 0.209);

CreatePrerollSizeTest(StreamDef.VideoTiny, 0.25, 0.751);
CreatePrerollSizeTest(StreamDef.VideoNormal, 0.25, 0.667);
CreatePrerollSizeTest(StreamDef.VideoHuge, 0.25, 0.584);


var CreateSizeToPauseTest = function(stream, refPC, refDevice) {
  var test = CreatePerformanceTest(
      'Buffer Size Before Pausing ' + stream.name + ' in ' +
      util.SizeToText(stream.bps) + ' bps');
  test.prototype.baseline_PC = refPC;
  test.prototype.baseline_device = refDevice;
  test.prototype.title = 'Determines preroll sizes for different stream '
      'types and qualites.';
  test.prototype.onsourceopen = function() {
    var runner = this.runner;
    var media = this.video;
    var chain = new ResetInit(new FileSource(stream.src, runner.XHRManager,
                                             runner.timeouts));
    var src = this.ms.addSourceBuffer(stream.type);

    test.prototype.times = 0;
    test.prototype.min = 0;
    test.prototype.max = 0;
    test.prototype.average = 0;
    runner.updateStatus();

    appendUntil(runner.timeouts, media, src, chain, 10, function() {
      function timeupdate(e) {
        if (this.currentTime) {
          runner.timeouts.setTimeout(function() {
            var gap = src.buffered.end(0) - media.currentTime;
            gap = util.Round(gap, 3);
            test.prototype.times = 1;
            test.prototype.min = gap;
            test.prototype.max = gap;
            test.prototype.average = gap;
            runner.updateStatus();
            runner.succeed();
          }, (src.buffered.end(0) + 3)* 1000);
        }
      };
      media.addEventListener('timeupdate', timeupdate);
      media.play();
    });
  };
};

CreateSizeToPauseTest(StreamDef.AudioTiny, 0, 0.094);
CreateSizeToPauseTest(StreamDef.AudioNormal, 0, 0.047);
CreateSizeToPauseTest(StreamDef.AudioHuge, 0, 0.047);

CreateSizeToPauseTest(StreamDef.VideoTiny, 0.083, 0.043);
CreateSizeToPauseTest(StreamDef.VideoNormal, 0.125, 0.084);
CreateSizeToPauseTest(StreamDef.VideoHuge, 0.083, 0.043);

var CreateSourceAbortTest = function(stream) {
  var test = CreatePerformanceTest('Source Abort Test');
  test.prototype.title = 'Source Abort Test.';
  test.prototype.onsourceopen = function() {
    var runner = this.runner;
    var media = this.video;
    var chain = new ResetInit(new FileSource(stream.src, runner.XHRManager,
                                             runner.timeouts));
    var src = this.ms.addSourceBuffer(stream.type);

    test.prototype.times = 0;
    test.prototype.min = 0;
    test.prototype.max = 0;
    test.prototype.average = 0;
    runner.updateStatus();

    var segs = [];

    function doTest() {
      src.append(segs[0]);
      var times = 0;
      for (var i = 0; i < segs[1].length; i++) {
        for (var j = 0; j < segs[2].length; j++) {
          for (var k = 0; k < segs[3].length; k++) {
            runner.log('***** ' + times);
            ++times;
            src.append(segs[1].subarray(0, i));
            src.abort();
            src.append(segs[2].subarray(0, j));
            src.abort();
            src.append(segs[3].subarray(0, k));
            src.abort();
            test.prototype.times++;
            runner.updateStatus();
          }
        }
      }
    }

    chain.pull(function(data) {
      segs.push(data);
      chain.pull(function(data) {
        segs.push(data);
        chain.pull(function(data) {
          segs.push(data);
          chain.pull(function(data) {
            segs.push(data);
            doTest();
          });
        });
      });
    });
  }
};

CreateSourceAbortTest(StreamDef.VideoHuge);

return {tests: tests, info: info, fields: fields, viewType: 'full'};

};
