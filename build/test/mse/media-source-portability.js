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

/* The code tries to wrap the following four cases: MediaSource ver 0.6 with or
 * without Webkit prefix and MediaSource ver 0,5 with or without Webkit prefix.
 */
(function() {

var dlog = function() {
  var forward = window.dlog || console.log.bind(console);
  forward.apply(this, arguments);
};

// Check if we have MSE 0.6 WITHOUT webkit prefix
if (window.MediaSource) {
  window.MediaSource.prototype.version = 'MSE-live';
  return;
}

// Check if we have MSE 0.6 WITH webkit prefix
if (window.WebKitMediaSource) {
  window.MediaSource = window.WebKitMediaSource;
  window.MediaSource.prototype.version = 'MSE-live-webkit';

  var cou = window.URL.createObjectURL;
  var creatingURL = false;
  window.URL.createObjectURL = function(obj) {
    if (!creatingURL) {
      creatingURL = true;
      var url = window.URL.createObjectURL(obj);
      creatingURL = false;
      return url;
    }
    return cou.call(this, obj);
  };

  var ael = window.MediaSource.prototype.addEventListener;
  window.MediaSource.prototype.addEventListener = function(type, listener, useCaptures) {
    var re = /^source(open|close|ended)$/;
    var match = re.exec(type);
    if (match) {
      ael.call(this, 'webkit' + type, listener, useCaptures);
    } else {
      ael.call(this, type, listener, useCaptures);
    }
  };

  return;
}

var v = document.createElement('video');

// Do we have any forms of MSE 0.5?
// NOTE: We will only support MSE 0.5 with webkit prefix.
if (!v.webkitSourceAddId)
  return;

function MediaSource() {
  this.sourceBuffers = [];
  this.activeSourceBuffers = this.sourceBuffers;
  this.readyState = "closed";

  this.msWrapperVideo = null;
  this.msWrapperDuration = NaN;
  this.msWrapperSourceIdCount = 1;
  this.msWrapperHandlers = {};
  this.msWrapperAppended = false;

  this.isWrapper = true;
}

MediaSource.prototype.version = 'MSE-v0.5-wrapped-webkit';
var missingFeature = 'Missing:';
if (!v.webkitSourceSetDuration)
  missingFeature += ' webkitSourceSetDuration';
if (!v.webkitSourceTimestampOffset)
  missingFeature += ' webkitSourceTimestampOffset';
if (missingFeature !== 'Missing:')
  MediaSource.prototype.version += '(' + missingFeature + ')';

MediaSource.prototype.msWrapperHandler = function(name, evt) {
  var handlers = this.msWrapperHandlers[name] || [];
  dlog(4, "In msWrapperHandler");
  if (name === 'close') {
    this.readyState = 'closed';
    this.msWrapperDuration = NaN;
  } else {
    this.readyState = name;
  }
  for (var i = 0; i < handlers.length; i++) {
    handlers[i].call(evt, evt);
  }
}

MediaSource.prototype.attachTo = function(video) {
  dlog(4, "In msWrapperAttach");
  var names = ['open', 'close', 'ended'];
  for (var i = 0; i < names.length; i++) {
    var h = this.msWrapperHandler.bind(this, names[i]);
    video.addEventListener('webkitsource' + names[i], h);
  }
  this.msWrapperVideo = video;
  var self = this;
  video.addEventListener('durationchange', function() {
    LOG(video.duration);
    self.msWrapperDuration = video.duration;
  });
  video.src = video.webkitMediaSourceURL;
}

MediaSource.prototype.addSourceBuffer = function(type) {
  if (!this.msWrapperVideo) throw "Unattached";
  var id = '' + this.msWrapperSourceIdCount;
  this.msWrapperSourceIdCount += 1;
  this.msWrapperVideo.webkitSourceAddId(id, type);

  var buf = new SourceBuffer(this.msWrapperVideo, id);
  this.sourceBuffers.push(buf);
  return buf;
}

MediaSource.prototype.removeSourceBuffer = function(buf) {
  for (var i = 0; i < this.sourceBuffers.length; ++i) {
    if (buf === this.sourceBuffers[i]) {
      this.msWrapperVideo.webkitSourceRemoveId(buf.msWrapperSourceId);
      delete this.sourceBuffers.splice(i, 1)[0];
      break;
    }
  }
}

MediaSource.prototype.endOfStream = function(opt_error) {
  var v = this.msWrapperVideo;

  // TODO: are these prefixed in M21?
  var err;
  if (opt_error === "network") {
    err = v.EOS_NETWORK_ERR;
  } else if (opt_error === "decode") {
    err = v.EOS_DECODE_ERR;
  } else if (!opt_error) {
    err = v.EOS_NO_ERROR;
  } else {
    throw 'Unrecognized endOfStream error type: ' + opt_error;
  }

  v.webkitSourceEndOfStream(err);
}

// The 'setDuration' method of the media element is an extension to the
// MSE-v0.5 spec, which will be implemented on some devices.
// Calling this method is defined to have the same semantics as setting
// the duration property of the Media Source object in the current spec.
// Getting it is undefined, although clearly here we just return the last
// value that we set.
Object.defineProperty(MediaSource.prototype, "duration",
    { get: function() {
          if (this.readyState === 'closed')
            return NaN;
          return this.msWrapperDuration;
        }
    , set: function(duration) {
        this.msWrapperDuration = duration;
        if (this.msWrapperVideo.webkitSourceSetDuration) {
          this.msWrapperVideo.webkitSourceSetDuration(duration);
        } else {
          dlog(1, 'webkitSourceSetDuration() missing (ignored)');
        }
      }
    });

MediaSource.prototype.addEventListener = function(name, handler) {
  var re = /^source(open|close|ended)$/;
  var match = re.exec(name);
  if (match && match[1]) {
    name = match[1];
    var l = this.msWrapperHandlers[name] || [];
    l.push(handler);
    this.msWrapperHandlers[name] = l;
  } else {
    throw "Unrecognized event name: " + name;
  }
}

function SourceBuffer(video, id) {
  this.msWrapperVideo = video;
  this.msWrapperSourceId = id;
  this.msWrapperTimestampOffset = 0;
}

function FakeSourceBufferedRanges() {
  this.length = 0;
}

SourceBuffer.prototype.msWrapperGetBuffered = function() {
  dlog(4, "In msWrapperGetBuffered");

  // Chrome 22 doesn't like calling sourceBuffered() before initialization
  // segment gets appended.
  if (!this.msWrapperAppended) return new FakeSourceBufferedRanges();

  var v = this.msWrapperVideo;
  var id = this.msWrapperSourceId;
  return v.webkitSourceBuffered(id);
}

SourceBuffer.prototype.append = function(bytes) {
  dlog(4, "In append");
  var v = this.msWrapperVideo;
  var id = this.msWrapperSourceId;
  v.webkitSourceAppend(id, bytes);
  this.msWrapperAppended = true;
}

SourceBuffer.prototype.abort = function() {
  dlog(4, "In abort");
  var v = this.msWrapperVideo;
  var id = this.msWrapperSourceId;
  v.webkitSourceAbort(id);
}

// The 'setTimestampOffset' method of the media element is an extension to the
// MSE-v0.5 spec, which will be implemented on some devices.
// Calling this method is defined to have the same semantics as setting
// the timestampOffset property of the Media Source object in the current spec.
Object.defineProperty(SourceBuffer.prototype, "timestampOffset",
    { get: function() { return this.msWrapperTimestampOffset; }
    , set: function(o) {
        this.msWrapperTimestampOffset = o;
        if (this.msWrapperVideo.webkitSourceTimestampOffset) {
          this.msWrapperVideo.webkitSourceTimestampOffset(
              this.msWrapperSourceId, o);
        } else {
          dlog(1, 'webkitSourceTimestampOffset() missing (ignored)');
        }
      }
    });

Object.defineProperty(SourceBuffer.prototype, "buffered",
    { get: SourceBuffer.prototype.msWrapperGetBuffered
    });

window.MediaSource = MediaSource;
})();
