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

var EnduranceTest = function() {

var tests = [];
var info = 'Please use these tests to check for resource leaks or ' +
    'accumulating issues.';
var fields = ['elapsed'];

var CreateEnduranceTest = function(name) {
  var t = CreateMSTest(name);
  t.prototype.index = tests.length;
  t.prototype.elapsed = 0;
  t.prototype.timeout = 2147483647;
  tests.push(t);
  return t;
};

var EnableProgressUpdate = function(test, runner, media) {
  test.prototype.elapsed = 0;
  runner.updateStatus();

  runner.timeouts.setInterval(function() {
    test.prototype.elapsed = util.Round(media.currentTime, 3);
    runner.updateStatus();
  }, 1000);
}

var CreateOneShotTest = function(stream) {
  var test = CreateEnduranceTest(util.MakeCapitalName(stream.name) + 'OneShot');
  test.prototype.title = 'XHR and Play media once.';
  test.prototype.onsourceopen = function() {
    var runner = this.runner;
    var media = this.video;
    var sb = this.ms.addSourceBuffer(stream.type);

    EnableProgressUpdate(test, runner, media);

    var xhr = runner.XHRManager.createRequest(stream.src,
      function(e) {
        sb.append(xhr.getResponseData());
        var end = util.Round(sb.buffered.end(0), 2);
        media.addEventListener('timeupdate', function(e) {
          if (!media.paused && media.currentTime > end - 1) {
            media.pause();
            runner.succeed();
          }
        });
        media.play();
      });
    xhr.send();
  };
};

CreateOneShotTest(StreamDef.AudioNormal);
CreateOneShotTest(StreamDef.VideoNormal);


var CreateInfiniteLoopTest = function(stream) {
  var test = CreateEnduranceTest('Infinite' +
                                   util.MakeCapitalName(stream.name) + 'Loop');
  test.prototype.title = 'Play in an infinite loop, good way to see if ' +
      'there is any resource leak.';
  test.prototype.onsourceopen = function() {
    var runner = this.runner;
    var media = this.video;
    var chain = new InfiniteStream(new ResetInit(
        new FileSource(stream.src, runner.XHRManager, runner.timeouts)));
    var src = this.ms.addSourceBuffer(stream.type);

    EnableProgressUpdate(test, runner, media);

    appendUntil(runner.timeouts, media, src, chain, 1, function() {
      media.play();
      playThrough(
          runner.timeouts, media, 20, Infinity, src, chain, null, null,
          function() {}
      );
    });
  };
};

CreateInfiniteLoopTest(StreamDef.AudioNormal);
CreateInfiniteLoopTest(StreamDef.VideoNormal);


var CreateInfiniteAVLoopTest = function(audio, video, desc) {
  var test = CreateEnduranceTest('InfiniteAVLoop' + desc);
  test.prototype.times = 'n/a';
  test.prototype.length = 'n/a';
  test.prototype.title =
    'Play in an infinite loop, good way to see if there is any resource leak.';
  test.prototype.onsourceopen = function() {
    var runner = this.runner;
    var timeouts = runner.timeouts;
    var media = this.video;
    var video_chain = new InfiniteStream(new ResetInit(
        new FileSource(video.src, runner.XHRManager, runner.timeouts)));
    var video_src = this.ms.addSourceBuffer(StreamDef.VideoType);
    var audio_chain = new InfiniteStream(new ResetInit(
        new FileSource(audio.src, runner.XHRManager, runner.timeouts)));
    var audio_src = this.ms.addSourceBuffer(StreamDef.AudioType);

    EnableProgressUpdate(test, runner, media);

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
    appendUntil(timeouts, media, video_src, video_chain, 1, function() {
      appendUntil(timeouts, media, audio_src, audio_chain, 1, function() {
        media.play();
        playThrough(
            timeouts, media, 5, Infinity, video_src, video_chain,
            audio_src, audio_chain, function() {}
        );
      });
    });
  };
};

CreateInfiniteAVLoopTest(StreamDef.AudioTiny, StreamDef.VideoTiny, 'Tiny');
CreateInfiniteAVLoopTest(StreamDef.AudioNormal, StreamDef.VideoNormal, 'Normal');
CreateInfiniteAVLoopTest(StreamDef.AudioHuge, StreamDef.VideoHuge, 'Huge');

CreateInfiniteAVLoopTest(StreamDef.AudioTinyClearKey, StreamDef.VideoTinyClearKey,
                         'TinyWithClearKey');
CreateInfiniteAVLoopTest(StreamDef.AudioNormalClearKey, StreamDef.VideoNormalClearKey,
                         'NormalWithClearKey');
CreateInfiniteAVLoopTest(StreamDef.AudioHugeClearKey, StreamDef.VideoHugeClearKey,
                         'HugeWithClearKey');

/*
var CreateInfiniteLoopYTCencTest = function(stream, keysystem, desc) {
  var test = CreateEnduranceTest(
      'Infinite' + util.MakeCapitalName(stream.name) + 'LoopWith' + desc);
  test.prototype.times = '∞';
  test.prototype.length = '∞';
  test.prototype.title =
    'Play in an infinite loop, good way to see if there is any resource leak.';
  var extractBMFFClearKeyID = function(initData) {
    // Accessing the Uint8Array's underlying ArrayBuffer is impossible, so we
    // copy it to a new one for parsing.
    var abuf = new ArrayBuffer(initData.length);
    var view = new Uint8Array(abuf);
    view.set(initData);

    var dv = new DataView(abuf);
    var pos = 0;
    while (pos < abuf.byteLength) {
      var box_size = dv.getUint32(pos, false);
      var type = dv.getUint32(pos + 4, false);

      if (type !== 0x70737368)
        throw 'Box type ' + type.toString(16) + ' not equal to "pssh"';

      if ((dv.getUint32(pos + 12, false) === 0x58147ec8) &&
          (dv.getUint32(pos + 16, false) === 0x04234659) &&
          (dv.getUint32(pos + 20, false) === 0x92e6f52c) &&
          (dv.getUint32(pos + 24, false) === 0x5ce8c3cc)) {
        var size = dv.getUint32(pos + 28, false);
        if (size !== 16) throw 'Unexpected KID size ' + size;
        return new Uint8Array(abuf.slice(pos + 32, pos + 32 + size));
      }
      pos += box_size;
    }
    // Couldn't find it, give up hope.
    return initData;
  };

  test.prototype.onsourceopen = function() {
    var runner = this.runner;
    var timeouts = runner.timeouts;
    var media = this.video;
    var chain = new InfiniteStream(new ResetInit(
        new FileSource(stream.src, runner.XHRManager, runner.timeouts)));
    var src = this.ms.addSourceBuffer(stream.type);
    var self = this;

    media.addEventListener('needkey', function(e) {
      if (keysystem.indexOf('clearkey') !== -1) {
        self.initData = extractBMFFClearKeyID(e.initData);
        console.log(e.initData);
        console.log(self.initData);
      } else {
        self.initData = e.initData;
      }
      e.target.generateKeyRequest(keysystem, self.initData);
    });

    media.addEventListener('keymessage', function(e) {
      var xhr = runner.XHRManager.createPostRequest(
          // TODO: make this universal
          'http://dash-mse-test.appspot.com/api/drm/clearkey?source=YOUTUBE&video_id=03681262dc412c06', function() {
            e.target.addKey('org.w3.clearkey',
                            xhr.getResponseData(),
                            self.initData, e.sessionId);
      }, e.message.length);
      xhr.send(e.message);
    });

    appendUntil(timeouts, media, src, chain, 1, function() {
      media.play();
      playThrough(
          timeouts, media, 5, Infinity, src, chain, null, null, function() {}
      );
    });
  };
};

CreateInfiniteLoopYTCencTest(StreamDef.VideoNormalYTCenc, 'webkit-org.w3.clearkey',
                             'ClearKey');
CreateInfiniteLoopYTCencTest(StreamDef.VideoNormalYTCenc, 'com.youtube.playready',
                             'PlayReady');
*/

return {tests: tests, info: info, fields: fields, viewType: 'full'};

};

