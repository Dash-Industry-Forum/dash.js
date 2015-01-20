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

var ConformanceTest = function() {

var tests = [];
var info = "No MSE Support!";
if (window.MediaSource)
  info = 'MSE Version: ' + MediaSource.prototype.version;
info += ' / Default Timeout: ' + TestBase.timeout + 'ms';

var fields = ['passes', 'failures', 'timeouts'];

var CreateConformanceTest = function(name) {
  var t = CreateMSTest(name);
  t.prototype.index = tests.length;
  t.prototype.passes = 0;
  t.prototype.failures = 0;
  t.prototype.timeouts = 0;
  tests.push(t);
  return t;
};


var TestPresence = CreateConformanceTest('Presence');
TestPresence.prototype.title = 'Test if MediaSource object is present.';
TestPresence.prototype.start = function(runner, video) {
  if (!window.MediaSource)
    return runner.fail('No MediaSource object available.');
  var ms = new MediaSource();
  if (!ms)
    return runner.fail('Found MediaSource but could not create one');
  if (ms.version) {
    this.log('Media source version reported as ' + ms.version);
  } else {
    this.log('No media source version reported');
  }
  runner.succeed();
};
TestPresence.prototype.teardown = function() {};


var TestAttach = CreateConformanceTest('Attach');
TestAttach.prototype.timeout = 2000;
TestAttach.prototype.title =
    'Test if MediaSource object can be attached to video.';
TestAttach.prototype.start = function(runner, video) {
  this.ms = new MediaSource();
  this.ms.addEventListener('sourceopen', function() {
    runner.succeed();
  });
  if (this.ms.isWrapper)
    this.ms.attachTo(video);
  else
    video.src = window.URL.createObjectURL(this.ms);
  video.load();
};
TestAttach.prototype.teardown = function() {};


var TestAddSourceBuffer = CreateConformanceTest('addSourceBuffer');
TestAddSourceBuffer.prototype.title =
    'Test if we can add source buffer';
TestAddSourceBuffer.prototype.onsourceopen = function() {
  this.runner.checkEq(this.ms.sourceBuffers.length, 0, 'Source buffer number');
  this.ms.addSourceBuffer(StreamDef.AudioType);
  this.runner.checkEq(this.ms.sourceBuffers.length, 1, 'Source buffer number');
  this.ms.addSourceBuffer(StreamDef.VideoType);
  this.runner.checkEq(this.ms.sourceBuffers.length, 2, 'Source buffer number');
  this.runner.succeed();
};


var TestSupportedFormats = CreateConformanceTest('SupportedFormats');
TestSupportedFormats.prototype.title =
    'Test if we support mp4 video (video/mp4; codecs="avc1.640008") and ' +
    'audio (audio/mp4; codecs="mp4a.40.5") formats.';
// TODO(strobe): removeSourceBuffer doesn't "really" work in Chrome, so this
// needs to be split over multiple test runs using parameterized tagged tests,
// but I'm not implementing that just yet
TestSupportedFormats.prototype.formats = [
  'audio/mp4; codecs="mp4a.40.5"',
  'video/mp4; codecs="avc1.640008"',
];
TestSupportedFormats.prototype.onsourceopen = function() {
  for (var i = 0; i < this.formats.length; i++) {
    try {
        this.log('Trying format ' + this.formats[i]);
        var src = this.ms.addSourceBuffer(this.formats[i]);
    } catch (e) {
        return this.runner.fail(e);
    }
  }
  this.runner.succeed();
};


var TestAddSourceBufferException = CreateConformanceTest('AddSBException');
TestAddSourceBufferException.prototype.title =
    'Test if add incorrect source buffer type will fire the correct exceptions.';
TestAddSourceBufferException.prototype.onsourceopen = function() {
  var runner = this.runner;
  var self = this;
  runner.checkException(function() {
    self.ms.addSourceBuffer('^^^');
  }, DOMException.NOT_SUPPORTED_ERR);
  if (this.ms.isWrapper) {
    runner.checkException(function() {
      var video = document.createElement('video');
      video.webkitSourceAddId('id', StreamDef.AudioType);
    }, DOMException.INVALID_STATE_ERR);
  } else {
    runner.checkException(function() {
      var ms = new MediaSource;
      ms.addSourceBuffer(StreamDef.AudioType);
    }, DOMException.INVALID_STATE_ERR);
  }
  runner.succeed();
};


var CreateInitialMediaStateTest = function(state, value, check) {
  var test = CreateConformanceTest('InitialMedia' + util.MakeCapitalName(state));

  check = typeof(check) === 'undefined' ? 'checkEq' : check;
  test.prototype.title = 'Test if the state ' + state +
      ' is correct when onsourceopen is called';
  test.prototype.onsourceopen = function() {
    this.runner[check](this.video[state], value, state);
    this.runner.succeed();
  };
};

CreateInitialMediaStateTest('duration', NaN);
CreateInitialMediaStateTest('videoWidth', 0);
CreateInitialMediaStateTest('videoHeight', 0);
CreateInitialMediaStateTest('readyState', HTMLMediaElement.HAVE_NOTHING);
CreateInitialMediaStateTest('src', '', 'checkNE');
CreateInitialMediaStateTest('currentSrc', '', 'checkNE');


var CreateInitialMSStateTest = function(state, value, check) {
  var test = CreateConformanceTest('InitialMS' + util.MakeCapitalName(state));

  check = typeof(check) === 'undefined' ? 'checkEq' : check;
  test.prototype.title = 'Test if the state ' + state +
      ' is correct when onsourceopen is called';
  test.prototype.onsourceopen = function() {
    this.runner[check](this.ms[state], value, state);
    this.runner.succeed();
  };
};

CreateInitialMSStateTest('duration', NaN);
CreateInitialMSStateTest('readyState', 'open');


var CreateAppendTest = function(stream) {
  var test = CreateConformanceTest('Append' + util.MakeCapitalName(stream.name));
  test.prototype.title = 'Test if we can append a whole ' + stream.name
      + ' file whose size is 1MB.';
  test.prototype.onsourceopen = function() {
    var runner = this.runner;
    var sb = this.ms.addSourceBuffer(stream.type);
    var xhr = runner.XHRManager.createRequest(stream.src,
      function(e) {
        sb.append(xhr.getResponseData());
        runner.checkEq(sb.buffered.length, 1, 'Source buffer number');
        runner.checkEq(sb.buffered.start(0), 0, 'Range start');
        runner.checkApproxEq(sb.buffered.end(0), stream.duration, 'Range end');
        runner.succeed();
      });
    xhr.send();
  };
};

CreateAppendTest(StreamDef.Audio1MB);
CreateAppendTest(StreamDef.Video1MB);


var CreateAbortTest = function(stream) {
  var test = CreateConformanceTest('Abort' + util.MakeCapitalName(stream.name));
  test.prototype.title = 'Test if we can abort the current segment.';
  test.prototype.onsourceopen = function() {
    var runner = this.runner;
    var sb = this.ms.addSourceBuffer(stream.type);
    var xhr = runner.XHRManager.createRequest(stream.src,
      function(e) {
        sb.append(xhr.getResponseData());
        sb.abort();
        sb.append(xhr.getResponseData());
        runner.checkEq(sb.buffered.length, 1, 'Source buffer number');
        runner.checkEq(sb.buffered.start(0), 0, 'Range start');
        runner.checkGr(sb.buffered.end(0), 0, 'Range end');
        runner.succeed();
      }, 0, 200000);
    xhr.send();
  };
};

CreateAbortTest(StreamDef.Audio1MB);
CreateAbortTest(StreamDef.Video1MB);


var CreateTimestampOffsetTest = function(stream) {
  var test = CreateConformanceTest('TimestampOffset' +
                            util.MakeCapitalName(stream.name));
  test.prototype.title = 'Test if we can set timestamp offset.';
  test.prototype.onsourceopen = function() {
    var runner = this.runner;
    var sb = this.ms.addSourceBuffer(stream.type);
    var xhr = runner.XHRManager.createRequest(stream.src,
      function(e) {
        sb.timestampOffset = 5;
        sb.append(xhr.getResponseData());
        runner.checkEq(sb.buffered.length, 1, 'Source buffer number');
        runner.checkEq(sb.buffered.start(0), 5, 'Range start');
        runner.checkApproxEq(sb.buffered.end(0), stream.duration + 5, 'Range end');
        runner.succeed();
      });
    xhr.send();
  };
};

CreateTimestampOffsetTest(StreamDef.Audio1MB);
CreateTimestampOffsetTest(StreamDef.Video1MB);


var TestDuration = CreateConformanceTest('Duration');
TestDuration.prototype.title =
    'Test if we can set duration.';
TestDuration.prototype.onsourceopen = function() {
  this.ms.duration = 10;
  this.runner.checkEq(this.ms.duration, 10, 'ms.duration');
  this.runner.succeed();
};


var TestSourceRemove = CreateConformanceTest('SourceRemove');
TestSourceRemove.prototype.title =
    'Test if we can add/remove source buffer and do it for more than once';
TestSourceRemove.prototype.onsourceopen = function() {
  var sb = this.ms.addSourceBuffer(StreamDef.AudioType);
  this.ms.removeSourceBuffer(sb);
  this.runner.checkEq(this.ms.sourceBuffers.length, 0, 'Source buffer number');
  this.ms.addSourceBuffer(StreamDef.AudioType);
  this.runner.checkEq(this.ms.sourceBuffers.length, 1, 'Source buffer number');
  for (var i = 0; i < 10; ++i) {
    try {
      sb = this.ms.addSourceBuffer(StreamDef.VideoType);
      this.runner.checkEq(this.ms.sourceBuffers.length, 2, 'Source buffer number');
      this.ms.removeSourceBuffer(sb);
      this.runner.checkEq(this.ms.sourceBuffers.length, 1, 'Source buffer number');
    } catch (e) {
      return this.runner.fail(e);
    }
  }
  this.runner.succeed();
};


var CreateDurationAfterAppendTest = function(type, stream) {
  var test = CreateConformanceTest('DurationAfterAppend' + util.MakeCapitalName(type));
  test.prototype.title = 'Test if the duration expands after appending data.';
  test.prototype.onsourceopen = function() {
    var runner = this.runner;
    var media = this.video;
    var ms = this.ms;
    var sb = ms.addSourceBuffer(stream.type);
    var self = this;
    var ondurationchange = function() {
      self.log('ondurationchange called');
      media.removeEventListener('durationchange', ondurationchange);
      runner.checkApproxEq(ms.duration, sb.buffered.end(0), 'ms.duration');
      runner.succeed();
    };
    var xhr = runner.XHRManager.createRequest(stream.src,
      function(e) {
        var data = xhr.getResponseData();
        sb.append(data);
        sb.abort();
        ms.duration = sb.buffered.end(0) / 2;
        media.addEventListener('durationchange', ondurationchange);
        sb.append(data);
      });
    xhr.send();
  };
};

CreateDurationAfterAppendTest('audio', StreamDef.Audio1MB);
CreateDurationAfterAppendTest('video', StreamDef.Video1MB);


var CreatePausedTest = function(type, stream) {
  var test = CreateConformanceTest('PausedStateWith' + util.MakeCapitalName(type));
  test.prototype.title = 'Test if the paused state is correct before or ' +
      ' after appending data.';
  test.prototype.onsourceopen = function() {
    var runner = this.runner;
    var media = this.video;
    var ms = this.ms;
    var sb = ms.addSourceBuffer(stream.type);

    runner.checkEq(media.paused, true, 'media.paused');

    var xhr = runner.XHRManager.createRequest(stream.src,
      function(e) {
        runner.checkEq(media.paused, true, 'media.paused');
        sb.append(xhr.getResponseData());
        runner.checkEq(media.paused, true, 'media.paused');
        runner.succeed();
      });
    xhr.send();
  };
};

CreatePausedTest('audio', StreamDef.Audio1MB);
CreatePausedTest('video', StreamDef.Video1MB);


var CreateMediaElementEventsTest = function(type, stream) {
  var test = CreateConformanceTest('MediaElementEvents' + util.MakeCapitalName(type));
  test.prototype.title = 'Test if the events on HTMLMediaElement are correct.';
  test.prototype.onsourceopen = function() {
    var runner = this.runner;
    var media = this.video;
    var ms = this.ms;
    var sb = this.ms.addSourceBuffer(stream.type);
    var self = this;
    var xhr = runner.XHRManager.createRequest(stream.src,
      function(e) {
        self.log('onload called');
        sb.append(xhr.getResponseData());
        sb.abort();
        ms.duration = 1;
        ms.endOfStream();
        if (type === 'video')
          media.play();
        else
          runner.succeed();
      });

    media.addEventListener('ended', function() {
      self.log('onended called');
      runner.succeed();
    });

    xhr.send();
  };
};

CreateMediaElementEventsTest('audio', StreamDef.Audio1MB);
CreateMediaElementEventsTest('video', StreamDef.Video1MB);

var CreateMediaSourceEventsTest = function(type, stream) {
  var test = CreateConformanceTest('MediaSourceEvents' + util.MakeCapitalName(type));
  test.prototype.title = 'Test if the events on MediaSource are correct.';
  test.prototype.onsourceopen = function() {
    var runner = this.runner;
    var media = this.video;
    var ms = this.ms;
    var sb = this.ms.addSourceBuffer(StreamDef.AudioType);
    var lastState = 'open';
    var self = this;
    var xhr = runner.XHRManager.createRequest('media/car-audio-1MB-trunc.mp4',
      function(e) {
        self.log('onload called');
        sb.append(xhr.getResponseData());
        sb.abort();
        ms.endOfStream();
      });

    ms.addEventListener('sourceclose', function() {
      self.log('onsourceclose called');
      runner.checkEq(lastState, 'ended', 'The previous state');
      runner.succeed();
    });

    ms.addEventListener('sourceended', function() {
      self.log('onsourceended called');
      runner.checkEq(lastState, 'open', 'The previous state');
      lastState = 'ended';
      media.removeAttribute('src');
      media.load();
    });

    xhr.send();
  };
};

CreateMediaSourceEventsTest('audio', StreamDef.Audio1MB);
CreateMediaSourceEventsTest('video', StreamDef.Video1MB);

var TestBufferSize = CreateConformanceTest('VideoBufferSize');
TestBufferSize.prototype.title = 'Determines video buffer sizes by ' +
    'appending incrementally until discard occurs, and tests that it meets ' +
    'the minimum requirements for streaming.';
TestBufferSize.prototype.onsourceopen = function() {
  var runner = this.runner;
  var sb = this.ms.addSourceBuffer(StreamDef.VideoType);
  var self = this;
  var xhr = runner.XHRManager.createRequest('media/test-video-1MB.mp4',
    function(e) {
      // The test clip has a bitrate which is nearly exactly 1MB/sec, and
      // lasts 1s. We start appending it repeatedly until we get eviction.
      var expected_time = 0;
      while (true) {
        sb.append(xhr.getResponseData());
        runner.checkEq(sb.buffered.start(0), 0, 'Range start');
        if (expected_time > sb.buffered.end(0) + 0.1) break;
        expected_time++;
        sb.timestampOffset = expected_time;
      }
      var MIN_SIZE = 12;
      runner.checkGE(expected_time, MIN_SIZE, 'Estimated source buffer size');
      runner.succeed();
    });
  xhr.send();
};


var TestSourceChain = CreateConformanceTest('SourceChain');
TestSourceChain.prototype.title =
    'Test if Source Chain works properly. Source Chain is a stack of ' +
    'classes that help with common tasks like appending init segment or ' +
    'append data in random size.';
TestSourceChain.prototype.onsourceopen = function() {
  var runner = this.runner;
  var media = this.video;
  var video_chain = new RandomAppendSize(new ResetInit(
      new FileSource('media/car-20120827-85.mp4', runner.XHRManager,
                     runner.timeouts)));
  var video_src = this.ms.addSourceBuffer(StreamDef.VideoType);
  var audio_chain = new FixedAppendSize(new ResetInit(
      new FileSource('media/car-20120827-8b.mp4', runner.XHRManager,
                     runner.timeouts)));
  var audio_src = this.ms.addSourceBuffer(StreamDef.AudioType);

  appendUntil(runner.timeouts, media, video_src, video_chain, 1, function() {
    appendUntil(runner.timeouts, media, audio_src, audio_chain, 1, function() {
      media.play();
      playThrough(
          runner.timeouts, media, 1, 2, video_src, video_chain, audio_src, audio_chain,
          function() {
            runner.checkGE(media.currentTime,  2, 'currentTime');
            runner.succeed();
          }
      );
    });
  });
};


var TestVideoDimension = CreateConformanceTest('VideoDimension');
TestVideoDimension.prototype.title =
    'Test if the readyState transition is correct.';
TestVideoDimension.prototype.onsourceopen = function() {
  var runner = this.runner;
  var media = this.video;
  var video_chain = new ResetInit(new FixedAppendSize(
      new FileSource('media/car-20120827-86.mp4', runner.XHRManager,
                     runner.timeouts), 65536));
  var video_src = this.ms.addSourceBuffer(StreamDef.VideoType);
  var self = this;

  runner.checkEq(media.videoWidth, 0, 'video width');
  runner.checkEq(media.videoHeight, 0, 'video height');

  media.addEventListener('loadedmetadata', function(e) {
    self.log('loadedmetadata called');
    runner.checkEq(media.videoWidth, 640, 'video width');
    runner.checkEq(media.videoHeight, 360, 'video height');
    runner.succeed();
  });

  runner.checkEq(media.readyState, media.HAVE_NOTHING, 'readyState');
  appendInit(media, video_src, video_chain, 0, function() {});
};


var TestPlaybackState = CreateConformanceTest('PlaybackState');
TestPlaybackState.prototype.title =
    'Test if the playback state transition is correct.';
TestPlaybackState.prototype.onsourceopen = function() {
  var runner = this.runner;
  var media = this.video;
  var video_chain = new ResetInit(new FixedAppendSize(
      new FileSource('media/car-20120827-86.mp4', runner.XHRManager,
                     runner.timeouts), 65536));
  var video_src = this.ms.addSourceBuffer(StreamDef.VideoType);
  var self = this;

  media.play();
  runner.checkEq(media.currentTime, 0, 'media.currentTime');
  media.pause();
  runner.checkEq(media.currentTime, 0, 'media.currentTime');

  appendInit(media, video_src, video_chain, 0, function() {});
  callAfterLoadedMetaData(media, function() {
    media.play();
    runner.checkEq(media.currentTime, 0, 'media.currentTime');
    media.pause();
    runner.checkEq(media.currentTime, 0, 'media.currentTime');
    media.play();
    playThrough(runner.timeouts, media, 1, 2, video_src, video_chain,
                null, null, function() {
                  var time = media.currentTime;
                  media.pause();
                  runner.checkApproxEq(media.currentTime, time,
                                       'media.currentTime');
                  runner.succeed();
                });
  });
};


var TestStartPlayWithoutData = CreateConformanceTest('StartPlayWithoutData');
TestStartPlayWithoutData.prototype.title =
    'Test if we can start play before feeding any data. The play should ' +
    'start automatically after data is appended';
TestStartPlayWithoutData.prototype.onsourceopen = function() {
  var runner = this.runner;
  var media = this.video;
  var video_chain = new ResetInit(
      new FileSource('media/car-20120827-89.mp4', runner.XHRManager,
                     runner.timeouts));
  var video_src = this.ms.addSourceBuffer(StreamDef.VideoType);
  var audio_chain = new ResetInit(
      new FileSource('media/car-20120827-8d.mp4', runner.XHRManager,
                     runner.timeouts));
  var audio_src = this.ms.addSourceBuffer(StreamDef.AudioType);

  media.play();
  appendUntil(runner.timeouts, media, video_src, video_chain, 1, function() {
    appendUntil(runner.timeouts, media, audio_src, audio_chain, 1, function() {
      playThrough(
          runner.timeouts, media, 1, 2, video_src, video_chain, audio_src, audio_chain,
          function() {
            runner.checkGE(media.currentTime, 2, 'currentTime');
            runner.succeed();
          }
      );
    });
  });
};


var TestPlayPartialSegment = CreateConformanceTest('PlayPartialSegment');
TestPlayPartialSegment.prototype.title =
    'Test if we can play a partially appended video segment.';
TestPlayPartialSegment.prototype.onsourceopen = function() {
  var runner = this.runner;
  var video = this.video;
  var sb = this.ms.addSourceBuffer(StreamDef.VideoType);
  var xhr = runner.XHRManager.createRequest('media/car-20120827-85.mp4',
    function(e) {
      sb.append(this.getResponseData());
      video.addEventListener('timeupdate', function(e) {
        if (!video.paused && video.currentTime >= 2) {
          runner.succeed();
        }
      });
      video.play();
    }, 0, 500000);
  xhr.send();
};


var TestIncrementalAudio = CreateConformanceTest('IncrementalAudio');
TestIncrementalAudio.prototype.title =
    'Test if we can append audio not in the unit of segment.';
TestIncrementalAudio.prototype.onsourceopen = function() {
  var runner = this.runner;
  var sb = this.ms.addSourceBuffer(StreamDef.AudioType);
  var xhr = runner.XHRManager.createRequest('media/car-20120827-8c.mp4',
    function(e) {
      sb.append(xhr.getResponseData());
      runner.checkEq(sb.buffered.length, 1, 'Source buffer number');
      runner.checkEq(sb.buffered.start(0), 0, 'Range start');
      runner.checkApproxEq(sb.buffered.end(0), 12.42, 'Range end');
      runner.succeed();
    }, 0, 200000);
  xhr.send();
};


var TestAppendAudioOffset = CreateConformanceTest('AppendAudioOffset');
TestAppendAudioOffset.prototype.title =
    'Test if we can append audio data with an explicit offset.';
TestAppendAudioOffset.prototype.onsourceopen = function() {
  var runner = this.runner;
  var video = this.video;
  var sb = this.ms.addSourceBuffer(StreamDef.AudioType);
  var xhr = runner.XHRManager.createRequest('media/car-20120827-8c.mp4',
    function(e) {
      sb.timestampOffset = 5;
      sb.append(this.getResponseData());
      xhr2.send();
    }, 0, 200000);
  var xhr2 = runner.XHRManager.createRequest('media/car-20120827-8d.mp4',
    function(e) {
      sb.abort();
      sb.timestampOffset = 0;
      sb.append(this.getResponseData());
      runner.checkEq(sb.buffered.length, 1, 'Source buffer number');
      runner.checkEq(sb.buffered.start(0), 0, 'Range start');
      runner.checkApproxEq(sb.buffered.end(0), 17.42, 'Range end');
      runner.succeed();
    }, 0, 200000);
  xhr.send();
};


var TestVideoChangeRate = CreateConformanceTest('VideoChangeRate');
TestVideoChangeRate.prototype.title =
    'Test if we can change the format of video on the fly.';
TestVideoChangeRate.prototype.onsourceopen = function() {
  var self = this;
  var runner = this.runner;
  var video = this.video;
  var sb = this.ms.addSourceBuffer(StreamDef.VideoType);
  var xhr = runner.XHRManager.createRequest('media/car-20120827-86.mp4',
    function(e) {
      sb.timestampOffset = 5;
      sb.append(this.getResponseData());
      xhr2.send();
    }, 0, 200000);
  var xhr2 = runner.XHRManager.createRequest('media/car-20120827-85.mp4',
    function(e) {
      sb.abort();
      sb.timestampOffset = 0;
      sb.append(this.getResponseData());
      runner.checkEq(sb.buffered.length, 1, 'Source buffer number');
      runner.checkEq(sb.buffered.start(0), 0, 'Range start');
      runner.checkApproxEq(sb.buffered.end(0), 11.47, 'Range end');
      callAfterLoadedMetaData(video, function() {
        video.currentTime = 3;
        video.addEventListener('seeked', function(e) {
          self.log('seeked called');
          video.addEventListener('timeupdate', function(e) {
            self.log('timeupdate called with ' + video.currentTime);
            if (!video.paused && video.currentTime >= 2) {
              runner.succeed();
            }
          });
        });
      });
      video.play();
    }, 0, 400000);
  this.ms.duration = 100000000;  // Ensure that we can seek to any position.
  xhr.send();
};


var CreateAppendMultipleInitTest = function(type, stream) {
  var test = CreateConformanceTest('AppendMultipleInit' + util.MakeCapitalName(type));
  test.prototype.title = 'Test if we can append multiple init segments.';
  test.prototype.onsourceopen = function() {
    var runner = this.runner;
    var media = this.video;
    var chain = new FileSource(stream.src, runner.XHRManager, runner.timeouts);
    var src = this.ms.addSourceBuffer(stream.type);
    var init;

    chain.init(0, function(buf) {
      init = buf;
      chain.pull(function(buf) {
        for (var i = 0; i < 10; ++i)
          src.append(init);
        src.append(buf);
        src.abort();
        var end = src.buffered.end(0);
        for (var i = 0; i < 10; ++i)
          src.append(init);
        runner.checkEq(src.buffered.end(0), end, 'Range end');
        runner.succeed();
      });
    });
  };
};

CreateAppendMultipleInitTest('audio', StreamDef.Audio1MB);
CreateAppendMultipleInitTest('video', StreamDef.Video1MB);


var TestAppendOutOfOrder = CreateConformanceTest('AppendOutOfOrder');
TestAppendOutOfOrder.prototype.title =
    'Test if we can append segments out of order. This is valid according' +
    ' to MSE v0.6 section 2.3.';
TestAppendOutOfOrder.prototype.onsourceopen = function() {
  var runner = this.runner;
  var media = this.video;
  var audio_chain = new FileSource('media/car-20120827-8c.mp4',
                                   runner.XHRManager,
                                   runner.timeouts);
  var audio_src = this.ms.addSourceBuffer(StreamDef.AudioType);
  var bufs = [];

  audio_chain.init(0, function(buf) {
    bufs.push(buf);
    audio_chain.pull(function(buf) {
      bufs.push(buf);
      audio_chain.pull(function(buf) {
        bufs.push(buf);
        audio_chain.pull(function(buf) {
          bufs.push(buf);
          audio_chain.pull(function(buf) {
            bufs.push(buf);
            audio_src.append(bufs[0]);
            runner.checkEq(audio_src.buffered.length, 0, 'Source buffer number');
            audio_src.append(bufs[2]);
            runner.checkEq(audio_src.buffered.length, 1, 'Source buffer number');
            runner.checkGr(audio_src.buffered.start(0), 0, 'Range start');
            audio_src.append(bufs[1]);
            runner.checkEq(audio_src.buffered.length, 1, 'Source buffer number');
            runner.checkEq(audio_src.buffered.start(0), 0, 'Range start');
            audio_src.append(bufs[4]);
            runner.checkEq(audio_src.buffered.length, 2, 'Source buffer number');
            runner.checkEq(audio_src.buffered.start(0), 0, 'Range start');
            audio_src.append(bufs[3]);
            runner.checkEq(audio_src.buffered.length, 1, 'Source buffer number');
            runner.checkEq(audio_src.buffered.start(0), 0, 'Range start');
            runner.succeed();
          });
        });
      });
    });
  });
};


var TestBufferedRange = CreateConformanceTest('BufferedRange');
TestBufferedRange.prototype.title =
    'Test if SourceBuffer.buffered get updated correctly after feeding data.';
TestBufferedRange.prototype.onsourceopen = function() {
  var runner = this.runner;
  var media = this.video;
  var video_chain = new ResetInit(
      new FileSource('media/car-20120827-86.mp4', runner.XHRManager,
                     runner.timeouts));
  var video_src = this.ms.addSourceBuffer(StreamDef.VideoType);
  var audio_chain = new ResetInit(
      new FileSource('media/car-20120827-8c.mp4', runner.XHRManager,
                     runner.timeouts));
  var audio_src = this.ms.addSourceBuffer(StreamDef.AudioType);

  runner.checkEq(video_src.buffered.length, 0, 'Source buffer number');
  runner.checkEq(audio_src.buffered.length, 0, 'Source buffer number');
  appendInit(media, video_src, video_chain, 0, function() {
    appendInit(media, audio_src, audio_chain, 0, function() {
      runner.checkEq(video_src.buffered.length, 0, 'Source buffer number');
      runner.checkEq(audio_src.buffered.length, 0, 'Source buffer number');
      appendUntil(runner.timeouts, media, video_src, video_chain, 5, function() {
        runner.checkEq(video_src.buffered.length, 1, 'Source buffer number');
        runner.checkEq(video_src.buffered.start(0), 0, 'Source buffer number');
        runner.checkGE(video_src.buffered.end(0), 5, 'Range end');
        appendUntil(runner.timeouts, media, audio_src, audio_chain, 5, function() {
          runner.checkEq(audio_src.buffered.length, 1, 'Source buffer number');
          runner.checkEq(audio_src.buffered.start(0), 0, 'Source buffer number');
          runner.checkGE(audio_src.buffered.end(0), 5, 'Range end');
          runner.succeed();
        });
      });
    });
  });
};


var TestMediaSourceDuration = CreateConformanceTest('MediaSourceDuration');
TestMediaSourceDuration.prototype.title =
    'Test if the duration on MediaSource can be set and got sucessfully.';
TestMediaSourceDuration.prototype.onsourceopen = function() {
  var runner = this.runner;
  var media = this.video;
  var ms = this.ms;
  var video_chain = new ResetInit(
      new FileSource('media/car-20120827-86.mp4', runner.XHRManager,
                     runner.timeouts));
  var video_src = this.ms.addSourceBuffer(StreamDef.VideoType);
  var self = this;
  var onsourceclose = function() {
    self.log('onsourceclose called');
    runner.assert(isNaN(ms.duration));
    runner.succeed();
  };

  runner.assert(isNaN(media.duration), 'Initial media duration not NaN');
  media.play();
  appendInit(media, video_src, video_chain, 0, function() {
    appendUntil(runner.timeouts, media, video_src, video_chain, 10, function() {
      runner.checkEq(ms.duration, Infinity, 'ms.duration');
      ms.duration = 5;
      runner.checkEq(ms.duration, 5, 'ms.duration');
      runner.checkEq(media.duration, 5, 'media.duration');
      runner.checkLE(video_src.buffered.end(0), 5.1, 'Range end');
      video_src.abort();
      video_chain.seek(0);
      appendInit(media, video_src, video_chain, 0, function() {
        appendUntil(runner.timeouts, media, video_src, video_chain, 10, function() {
          runner.checkApproxEq(ms.duration, 10, 'ms.duration');
          ms.duration = 5;
          var duration = video_src.buffered.end(0);
          ms.endOfStream();
          runner.checkEq(ms.duration, duration, 'ms.duration');
          media.play();
          ms.addEventListener('sourceended', function() {
            runner.checkEq(ms.duration, duration, 'ms.duration');
            runner.checkEq(media.duration, duration, 'media.duration');
            ms.addEventListener('sourceclose', onsourceclose);
            media.removeAttribute('src');
            media.load();
          });
        });
      });
    });
  });
};


var TestAudioWithOverlap = CreateConformanceTest('AudioWithOverlap');
TestAudioWithOverlap.prototype.title =
    'Test if audio data with overlap will be merged into one range.';
TestAudioWithOverlap.prototype.onsourceopen = function() {
  var runner = this.runner;
  var media = this.video;
  var audio_chain = new ResetInit(
      new FileSource('media/car-20120827-8c.mp4', runner.XHRManager,
                     runner.timeouts));
  var audio_src = this.ms.addSourceBuffer(StreamDef.AudioType);
  var GAP = 0.1;

  appendInit(media, audio_src, audio_chain, 0, function() {
    audio_chain.pull(function(buf) {
      runner.assert(safeAppend(audio_src, buf), 'safeAppend failed');
      runner.checkEq(audio_src.buffered.length, 1, 'Source buffer number');
      var seg_duration = audio_src.buffered.end(0);
      audio_src.timestampOffset = seg_duration - GAP;
      audio_chain.seek(0);
      audio_chain.pull(function(buf) {
        runner.assert(safeAppend(audio_src, buf), 'safeAppend failed');
        audio_chain.pull(function(buf) {
          runner.assert(safeAppend(audio_src, buf), 'safeAppend failed');
          runner.checkEq(audio_src.buffered.length, 1, 'Source buffer number');
          runner.checkApproxEq(audio_src.buffered.end(0),
                               seg_duration * 2 - GAP, 'Range end');
          runner.succeed();
        });
      });
    });
  });
};


var TestAudioWithSmallGap = CreateConformanceTest('AudioWithSmallGap');
TestAudioWithSmallGap.prototype.title =
    'Test if audio data with a gap smaller than an audio frame size ' +
    'will be merged into one buffered range.';
TestAudioWithSmallGap.prototype.onsourceopen = function() {
  var runner = this.runner;
  var media = this.video;
  var audio_chain = new ResetInit(
      new FileSource('media/car-20120827-8c.mp4', runner.XHRManager,
                     runner.timeouts));
  var audio_src = this.ms.addSourceBuffer(StreamDef.AudioType);
  var GAP = 0.01;  // The audio frame size of this file is 0.0232

  appendInit(media, audio_src, audio_chain, 0, function() {
    audio_chain.pull(function(buf) {
      runner.assert(safeAppend(audio_src, buf), 'safeAppend failed');
      runner.checkEq(audio_src.buffered.length, 1, 'Source buffer number');
      var seg_duration = audio_src.buffered.end(0);
      audio_src.timestampOffset = seg_duration + GAP;
      audio_chain.seek(0);
      audio_chain.pull(function(buf) {
        runner.assert(safeAppend(audio_src, buf, 'safeAppend failed'));
        audio_chain.pull(function(buf) {
          runner.assert(safeAppend(audio_src, buf), 'safeAppend failed');
          runner.checkEq(audio_src.buffered.length, 1, 'Source buffer number');
          runner.checkApproxEq(audio_src.buffered.end(0),
                               seg_duration * 2 + GAP, 'Range end');
          runner.succeed();
        });
      });
    });
  });
};


var TestAudioWithLargeGap = CreateConformanceTest('AudioWithLargeGap');
TestAudioWithLargeGap.prototype.title =
    'Test if audio data with a gap larger than an audio frame size ' +
    'will not be merged into one buffered range.';
TestAudioWithLargeGap.prototype.onsourceopen = function() {
  var runner = this.runner;
  var media = this.video;
  var audio_chain = new ResetInit(
      new FileSource('media/car-20120827-8c.mp4', runner.XHRManager,
                     runner.timeouts));
  var audio_src = this.ms.addSourceBuffer(StreamDef.AudioType);
  var GAP = 0.03;  // The audio frame size of this file is 0.0232

  appendInit(media, audio_src, audio_chain, 0, function() {
    audio_chain.pull(function(buf) {
      runner.assert(safeAppend(audio_src, buf), 'safeAppend failed');
      runner.checkEq(audio_src.buffered.length, 1, 'Source buffer number');
      var seg_duration = audio_src.buffered.end(0);
      audio_src.timestampOffset = seg_duration + GAP;
      audio_chain.seek(0);
      audio_chain.pull(function(buf) {
        runner.assert(safeAppend(audio_src, buf), 'safeAppend failed');
        audio_chain.pull(function(buf) {
          runner.assert(safeAppend(audio_src, buf), 'safeAppend failed');
          runner.checkEq(audio_src.buffered.length, 2, 'Source buffer number');
          runner.succeed();
        });
      });
    });
  });
};


var TestCanPlayClearKey = CreateConformanceTest('CanPlayClearKey');
TestCanPlayClearKey.prototype.title =
    'Test if canPlay return is correct for clear key.';
TestCanPlayClearKey.prototype.onsourceopen = function() {
  var video = this.video;
  this.runner.assert(
      video.canPlayType(StreamDef.VideoType, 'org.w3.clearkey') === "probably" ||
      video.canPlayType(StreamDef.VideoType, 'webkit-org.w3.clearkey') === "probably",
      "canPlay doesn't support video and clearkey properly");
  this.runner.assert(
      video.canPlayType(StreamDef.AudioType, 'org.w3.clearkey') === "probably" ||
      video.canPlayType(StreamDef.AudioType, 'webkit-org.w3.clearkey') === "probably",
      "canPlay doesn't support audio and clearkey properly");
  this.runner.succeed();
};


var TestCanPlayPlayReady = CreateConformanceTest('CanPlayPlayReady');
TestCanPlayPlayReady.prototype.title =
    'Test if canPlay return is correct for PlayReady.';
TestCanPlayPlayReady.prototype.onsourceopen = function() {
  var video = this.video;
  this.runner.checkEq(
      video.canPlayType(StreamDef.VideoType, 'com.youtube.playready'), "probably",
      'canPlayType result');
  this.runner.checkEq(
      video.canPlayType(StreamDef.AudioType, 'com.youtube.playready'), "probably",
      'canPlayType result');
  this.runner.succeed();
};


var TestCannotPlayWidevine = CreateConformanceTest('CannotPlayWidevine');
TestCannotPlayWidevine.prototype.title =
    'Test if canPlay return is correct for Widevine.';
TestCannotPlayWidevine.prototype.onsourceopen = function() {
  var video = this.video;
  this.runner.checkEq(
      video.canPlayType(StreamDef.VideoType, 'com.widevine.alpha'), '',
      'canPlayType result');
  this.runner.checkEq(
      video.canPlayType(StreamDef.AudioType, 'com.widevine.alpha'), '',
      'canPlayType result');
  this.runner.succeed();
};


var TestWebM = CreateConformanceTest('WebMHandling');
TestWebM.prototype.title = 'Ensure that WebM is either supported or ' +
    'that attempting to add a WebM SourceBuffer results in an error.';
TestWebM.prototype.onsourceopen = function() {
  var mime = 'video/webm; codecs="vorbis,vp8"';
  var runner = this.runner;
  try {
    this.log('Add sourceBuffer typed webm');
    var webm_src = this.ms.addSourceBuffer(mime);
  } catch (e) {
    runner.checkEq(e.code, DOMException.NOT_SUPPORTED_ERR,
                          'exception code');
    this.log('Add sourceBuffer typed webm to closed MediaSource');
    try {
      (new MediaSource).addSourceBuffer(mime);
    } catch (e) {
      LOG("WebM with mime '" + mime + "' not supported. (This is okay.)");
      runner.succeed();
      return;
    }
    runner.fail('Add sourceBuffer typed webm to closed MediaSource hasn\'t' +
                ' thrown any exception.');
    return;
  }
  var xhr = runner.XHRManager.createRequest('media/test.webm',
    function(e) {
      try {
        webm_src.append(xhr.getResponseData());
      } catch (e) {
        LOG('WebM support claimed but error on appending data!');
        runner.fail();
        return;
      }
      runner.checkEq(webm_src.buffered.length, 1, 'buffered.length');
      runner.checkApproxEq(webm_src.buffered.end(0), 6.04, 'buffered.end(0)');
      runner.succeed();
    });
  xhr.send();
};


var TestClearKeyAudio = CreateConformanceTest('ClearKeyAudio');
TestClearKeyAudio.prototype.title =
    'Test if we can play audio encrypted with ClearKey encryption.';
TestClearKeyAudio.prototype.onsourceopen = function() {
  var runner = this.runner;
  var media = this.video;
  var video_chain = new ResetInit(
      new FileSource('media/car-20120827-86.mp4', runner.XHRManager,
                     runner.timeouts));
  var video_src = this.ms.addSourceBuffer(StreamDef.VideoType);
  var audio_chain = new ResetInit(
      new FileSource('media/car_cenc-20120827-8c.mp4', runner.XHRManager,
                     runner.timeouts));
  var audio_src = this.ms.addSourceBuffer(StreamDef.AudioType);

  media.addEventListener('needkey', function(e) {
    e.target.generateKeyRequest('org.w3.clearkey', e.initData);
  });

  media.addEventListener('keymessage', function(e) {
    var key = new Uint8Array([
        0x1a, 0x8a, 0x20, 0x95, 0xe4, 0xde, 0xb2, 0xd2,
        0x9e, 0xc8, 0x16, 0xac, 0x7b, 0xae, 0x20, 0x82]);
    var key_id = new Uint8Array([
        0x60, 0x06, 0x1e, 0x01, 0x7e, 0x47, 0x7e, 0x87,
        0x7e, 0x57, 0xd0, 0x0d, 0x1e, 0xd0, 0x0d, 0x1e]);
    e.target.addKey('org.w3.clearkey', key, key_id, e.sessionId);
  });

  appendUntil(runner.timeouts, media, video_src, video_chain, 5, function() {
    appendUntil(runner.timeouts, media, audio_src, audio_chain, 5, function() {
      media.play();
      playThrough(
          runner.timeouts, media, 10, 5, video_src, video_chain, audio_src, audio_chain,
          function() {
            runner.checkGE(media.currentTime, 5, 'currentTime');
            runner.succeed();
          }
      );
    });
  });
};

var TestClearKeyVideo = CreateConformanceTest('ClearKeyVideo');
TestClearKeyVideo.prototype.title =
    'Test if we can play video encrypted with ClearKey encryption.';
TestClearKeyVideo.prototype.onsourceopen = function() {
  var runner = this.runner;
  var media = this.video;
  var video_chain = new ResetInit(
      new FileSource('media/car_cenc-20120827-86.mp4', runner.XHRManager,
                     runner.timeouts));
  var video_src = this.ms.addSourceBuffer(StreamDef.VideoType);
  var audio_chain = new ResetInit(
      new FileSource('media/car-20120827-8c.mp4', runner.XHRManager,
                     runner.timeouts));
  var audio_src = this.ms.addSourceBuffer(StreamDef.AudioType);

  media.addEventListener('needkey', function(e) {
    e.target.generateKeyRequest('org.w3.clearkey', e.initData);
  });

  media.addEventListener('keymessage', function(e) {
    var key = new Uint8Array([
        0x1a, 0x8a, 0x20, 0x95, 0xe4, 0xde, 0xb2, 0xd2,
        0x9e, 0xc8, 0x16, 0xac, 0x7b, 0xae, 0x20, 0x82]);
    var key_id = new Uint8Array([
        0x60, 0x06, 0x1e, 0x01, 0x7e, 0x47, 0x7e, 0x87,
        0x7e, 0x57, 0xd0, 0x0d, 0x1e, 0xd0, 0x0d, 0x1e]);
    e.target.addKey('org.w3.clearkey', key, key_id, e.sessionId);
  });

  appendUntil(runner.timeouts, media, video_src, video_chain, 5, function() {
    appendUntil(runner.timeouts, media, audio_src, audio_chain, 5, function() {
      media.play();
      playThrough(
          runner.timeouts, media, 10, 5, video_src, video_chain, audio_src, audio_chain,
          function() {
            runner.checkGE(media.currentTime, 5, 'currentTime');
            runner.succeed();
          }
      );
    });
  });
};


var TestSeekTimeUpdate = CreateConformanceTest('SeekTimeUpdate');
TestSeekTimeUpdate.prototype.title =
  'Timeupdate event fired with correct currentTime after seeking.';
TestSeekTimeUpdate.prototype.onsourceopen = function() {
  var runner = this.runner;
  var media = this.video;
  var video_src = this.ms.addSourceBuffer(StreamDef.VideoType);
  var audio_src = this.ms.addSourceBuffer(StreamDef.AudioType);
  var lastTime = 0;
  var updateCount = 0;
  var xhr = runner.XHRManager.createRequest('media/car-20120827-86.mp4',
    function() {
      video_src.append(xhr.getResponseData());
      var xhr2 = runner.XHRManager.createRequest('media/car-20120827-8c.mp4',
        function() {
          audio_src.append(xhr2.getResponseData());
          callAfterLoadedMetaData(media, function() {
            media.addEventListener('timeupdate', function(e) {
              if (!media.paused) {
                ++updateCount;
                runner.checkGE(media.currentTime, lastTime,
                               'media.currentTime');
                if (updateCount > 3) {
                  updateCount = 0;
                  lastTime += 10;
                  if (lastTime >= 35)
                    runner.succeed();
                  else
                    media.currentTime = lastTime + 6;
                }
              }
            });
            media.play();
          });
        }, 0, 1000000);
      xhr2.send();
    }, 0, 5000000);
  this.ms.duration = 100000000;  // Ensure that we can seek to any position.
  xhr.send();
};


var TestSourceSeek = CreateConformanceTest('Seek');
TestSourceSeek.prototype.title = 'Test if we can seek during playing. It' +
    ' also tests if the implementation properly supports seek operation' +
    ' fired immediately after another seek that hasn\'t been completed.';
TestSourceSeek.prototype.onsourceopen = function() {
  var runner = this.runner;
  var media = this.video;
  var video_chain = new ResetInit(new FileSource(
      'media/car-20120827-86.mp4', runner.XHRManager, runner.timeouts));
  var video_src = this.ms.addSourceBuffer(StreamDef.VideoType);
  var audio_chain = new ResetInit(new FileSource(
      'media/car-20120827-8c.mp4', runner.XHRManager, runner.timeouts));
  var audio_src = this.ms.addSourceBuffer(StreamDef.AudioType);
  var self = this;

  this.ms.duration = 100000000;  // Ensure that we can seek to any position.

  appendUntil(runner.timeouts, media, video_src, video_chain, 20, function() {
    appendUntil(runner.timeouts, media, audio_src, audio_chain, 20, function() {
      self.log('Seek to 17s');
      callAfterLoadedMetaData(media, function() {
        media.currentTime = 17;
        media.play();
        playThrough(
            runner.timeouts, media, 10, 19, video_src, video_chain, audio_src, audio_chain,
            function() {
              runner.checkGE(media.currentTime, 19, 'currentTime');
              self.log('Seek to 28s');
              media.currentTime = 53;
              media.currentTime = 58;
              playThrough(
                  runner.timeouts, media, 10, 60, video_src, video_chain, audio_src, audio_chain,
                  function() {
                    runner.checkGE(media.currentTime, 60, 'currentTime');
                    self.log('Seek to 7s');
                    media.currentTime = 0;
                    media.currentTime = 7;
                    video_chain.seek(7, video_src);
                    audio_chain.seek(7, audio_src);
                    playThrough(runner.timeouts, media, 10, 9, video_src, video_chain,
                                audio_src, audio_chain, function() {
                                  runner.checkGE(media.currentTime, 9,
                                                 'currentTime');
                                  runner.succeed();
                                });
                  }
              );
            }
        );
      });
    });
  });
};


var TestBufUnbufSeek = CreateConformanceTest('BufUnbufSeek');
TestBufUnbufSeek.prototype.title = 'Seek into and out of a buffered region.';
TestBufUnbufSeek.prototype.onsourceopen = function() {
  var runner = this.runner;
  var media = this.video;
  var video_src = this.ms.addSourceBuffer(StreamDef.VideoType);
  var audio_src = this.ms.addSourceBuffer(StreamDef.AudioType);
  var xhr = runner.XHRManager.createRequest('media/car-20120827-86.mp4',
    function() {
      video_src.append(xhr.getResponseData());
      var xhr2 = runner.XHRManager.createRequest('media/car-20120827-8c.mp4',
        function() {
          audio_src.append(xhr2.getResponseData());
          callAfterLoadedMetaData(media, function() {
            var N = 30;
            function loop(i) {
              if (i > N) {
                media.currentTime = 1.005;
                media.addEventListener('timeupdate', function(e) {
                  if (!media.paused && media.currentTime > 3)
                    runner.succeed();
                });
                return;
              }
              // bored of shitty test scripts now => test scripts get shittier
              media.currentTime = (i++ % 2) * 1.0e6 + 1;
              runner.timeouts.setTimeout(loop.bind(null, i), 50);
            }
            media.play();
            media.addEventListener('play', loop.bind(null, 0));
          });
        }, 0, 100000);
      xhr2.send();
    }, 0, 1000000);
  this.ms.duration = 100000000;  // Ensure that we can seek to any position.
  xhr.send();
};


var CreateDelayedTest = function(delayed, nonDelayed) {
  var test = CreateConformanceTest('Delayed' + util.MakeCapitalName(delayed.name));
  test.prototype.title = 'Test if we can play properly when there' +
    ' is not enough ' + name + ' data. The play should resume once ' +
    name + ' data is appended.';
  test.prototype.onsourceopen = function() {
    var runner = this.runner;
    var media = this.video;
    var chain = new FixedAppendSize(new ResetInit(
        new FileSource(nonDelayed.src, runner.XHRManager, runner.timeouts)),
                       65536);
    var src = this.ms.addSourceBuffer(nonDelayed.type);
    var delayedChain = new FixedAppendSize(new ResetInit(
        new FileSource(delayed.src, runner.XHRManager, runner.timeouts)),
                       65536);
    var delayedSrc = this.ms.addSourceBuffer(delayed.type);
    var self = this;
    var ontimeupdate = function(e) {
      if (!media.paused) {
        var end = delayedSrc.buffered.end(0);
        runner.checkLE(media.currentTime, end + 1.0, 'media.currentTime');
      }
    }
    appendUntil(runner.timeouts, media, src, chain, 15, function() {
      appendUntil(runner.timeouts, media, delayedSrc, delayedChain, 8,
                  function() {
        var end = delayedSrc.buffered.end(0);
        self.log('Start play when there is only ' + end + ' seconds of ' +
                 name + ' data.');
        media.play();
        media.addEventListener('timeupdate', ontimeupdate);
        waitUntil(runner.timeouts, media, delayedSrc.buffered.end(0) + 3,
          function() {
            runner.checkLE(media.currentTime, end + 1.0, 'media.currentTime');
            runner.checkGr(media.currentTime, end - 1.0, 'media.currentTime');
            runner.succeed();
          });
      });
    });
  };
};


CreateDelayedTest(StreamDef.AudioNormal, StreamDef.VideoNormal);
CreateDelayedTest(StreamDef.VideoNormal, StreamDef.AudioNormal);

var TestXHRUint8Array = CreateConformanceTest('XHRUint8Array');
TestXHRUint8Array.prototype.title = 'Ensure that XHR can send an Uint8Array';
TestXHRUint8Array.prototype.timeout = 10000;
TestXHRUint8Array.prototype.start = function(runner, video) {
  var s = "XHR DATA";
  var buf = new ArrayBuffer(s.length);
  var view = new Uint8Array(buf);
  for (var i = 0; i < s.length; i++) {
    view[i] = s.charCodeAt(i);
  }

  var xhr = runner.XHRManager.createPostRequest(
    "https://drmproxy.appspot.com/echo",
    function(e) {
      runner.checkEq(String.fromCharCode.apply(null, xhr.getResponseData()),
                     s, 'XHR response');
      runner.succeed();
    },
    view.length);
  xhr.send(view);
};


var TestXHRAbort = CreateConformanceTest('XHRAbort');
TestXHRAbort.prototype.title = 'Ensure that XHR aborts actually abort by ' +
    'issuing an absurd number of them and then aborting all but one.';
TestXHRAbort.prototype.start = function(runner, video) {
  var N = 100;
  var startTime = Date.now();
  var lastAbortTime;
  function startXHR(i) {
    var xhr = runner.XHRManager.createRequest(
        'media/car-20120827-85.mp4?x=' + Date.now() + '.' + i,
        function() {
          if (i >= N) {
            xhr.getResponseData();  // This will verify status internally.
            runner.succeed();
          }
        });
    if (i < N) {
      runner.timeouts.setTimeout(xhr.abort.bind(xhr), 10);
      runner.timeouts.setTimeout(startXHR.bind(null, i + 1), 1);
      lastAbortTime = Date.now();
    }
    xhr.send();
  };
  startXHR(0);
};


var TestXHROpenState = CreateConformanceTest('XHROpenState');
TestXHROpenState.prototype.title = 'Ensure XMLHttpRequest.open does not ' +
    'reset XMLHttpRequest.responseType';
TestXHROpenState.prototype.start = function(runner, video) {
  var xhr = new XMLHttpRequest;
  // It should not be an error to set responseType before calling open
  xhr.responseType = 'arraybuffer';
  xhr.open('GET', 'http://google.com', true);
  runner.checkEq(xhr.responseType, 'arraybuffer', 'XHR responseType');
  runner.succeed();
}

var TestFrameGaps = CreateConformanceTest('FrameGaps');
TestFrameGaps.prototype.title = 'Test media with frame durations of 24FPS ' +
    'but segment timing corresponding to 23.976FPS';
TestFrameGaps.prototype.filename = 'media/nq-frames24-tfdt23.mp4';
TestFrameGaps.prototype.onsourceopen = function() {
  var runner = this.runner;
  var media = this.video;
  var video_chain = new FixedAppendSize(new ResetInit(
      new FileSource(this.filename, runner.XHRManager,
                     runner.timeouts)));
  var video_src = this.ms.addSourceBuffer(StreamDef.VideoType);
  var audio_chain = new FixedAppendSize(new ResetInit(
      new FileSource('media/car-20120827-8c.mp4', runner.XHRManager,
                     runner.timeouts)));
  var audio_src = this.ms.addSourceBuffer(StreamDef.AudioType);
  media.play();
  playThrough(runner.timeouts, media, 5, 18, video_src, video_chain,
              audio_src, audio_chain, runner.succeed.bind(runner));
}


var TestFrameOverlaps = CreateConformanceTest('FrameOverlaps');
TestFrameOverlaps.prototype.title = 'Test media with frame durations of ' +
    '23.976FPS but segment timing corresponding to 24FPS';
TestFrameOverlaps.prototype.filename = 'media/nq-frames23-tfdt24.mp4';
TestFrameOverlaps.prototype.onsourceopen = TestFrameGaps.prototype.onsourceopen;


var TestAAC51 = CreateConformanceTest('AAC51');
TestAAC51.prototype.title = 'Test 5.1-channel AAC';
TestAAC51.prototype.audioFilename = 'media/sintel-trunc.mp4';
TestAAC51.prototype.onsourceopen = function() {
  var runner = this.runner;
  var media = this.video;
  var audio_src = this.ms.addSourceBuffer(StreamDef.AudioType);
  var video_src = this.ms.addSourceBuffer(StreamDef.VideoType);
  var xhr = runner.XHRManager.createRequest(this.audioFilename,
    function(e) {
      audio_src.append(xhr.getResponseData());
      var xhr2 = runner.XHRManager.createRequest('media/car-20120827-86.mp4',
        function(e) {
          video_src.append(xhr2.getResponseData());
          media.play();
          media.addEventListener('timeupdate', function(e) {
            if (!media.paused && media.currentTime > 2)
              runner.succeed();
          });
        }, 0, 3000000);
      xhr2.send();
    });
  xhr.send();
};

return {tests: tests, info: info, fields: fields, viewType: 'compact'};

};
