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

var DLOG_LEVEL = 3;

// Log a debug message. Only logs if the given level is less than the current
// value of the global variable DLOG_LEVEL.
window.dlog = function(level) {
  if (typeof(level) !== 'number')
    throw 'level has to be an non-negative integer!';
  // Comment this to prevent debug output
  if (arguments.length > 1 && level <= DLOG_LEVEL) {
    var args = [];
    for (var i = 1; i < arguments.length; ++i)
      args.push(arguments[i]);
    if (window.LOG)
      window.LOG.apply(null, args);
    else
      console.log(args);
  }
}

var ensureUID = (function() {
  var uid = 0;

  return function(sb) {
    if (!sb.uid) sb.uid = uid++;
  };
})();

var elementInBody = function(element) {
  while (element && element !== document.body)
    element = element.parentNode;
  return Boolean(element);
};

// A version of 'SourceBuffer.append()' that automatically handles EOS
// (indicated by the 'null' values. Returns true if append succeeded,
// false if EOS.
window.safeAppend = function(sb, buf) {
  ensureUID(sb);

  if (!buf)
    dlog(2, 'EOS appended to ' + sb.uid);
  else
    sb.append(buf);

  return Boolean(buf);
};

// Convert a 4-byte array into a signed 32-bit int.
function btoi(data, offset) {
  offset = offset || 0;
  var result = data[offset] >>> 0;
  result = (result << 8) + (data[offset + 1] >>> 0);
  result = (result << 8) + (data[offset + 2] >>> 0);
  result = (result << 8) + (data[offset + 3] >>> 0);
  return result;
}

// Convert a 4-byte array into a fourcc.
function btofourcc(data, offset) {
  offset = offset || 0;
  return String.fromCharCode(data[offset], data[offset + 1],
                             data[offset + 2], data[offset + 3]);
}

// Convert a signed 32-bit int into a 4-byte array.
function itob(value) {
  return [value >>> 24, (value >>> 16) & 0xff, (value >>> 8) & 0xff,
         value & 0xff];
}

// Return the offset of sidx box
function getSIDXOffset(data) {
  var length = data.length;
  var pos = 0;

  while (pos + 8 <= length) {
    var size = [];

    for (var i = 0; i < 4; ++i)
      size.push(data[pos + i]);

    size = btoi(size);
    if (size < 8) throw 'Unexpectedly small size';
    if (pos + size >= data.length) break;

    if (btofourcc(data, pos + 4) === 'sidx')
      return pos;

    pos += size;
  }

  throw 'Cannot find sidx box in first ' + data.length + ' bytes of file';
}

// Given a buffer contains the first 32k of a file, return a list of tables
// containing `time`, 'duration', `offset`, and `size` properties for each
// subsegment.
function parseSIDX(data) {
  var sidx_start_bytes = getSIDXOffset(data);
  var curr_pos = sidx_start_bytes;

  function read(bytes) {
    if (curr_pos + bytes > data.length) throw 'sidx box is incomplete.';
    var result = [];
    for (var i = 0; i < bytes; ++i) result.push(data[curr_pos + i]);
    curr_pos += bytes;
    return result;
  }

  var size = btoi(read(4));
  var sidx_end = sidx_start_bytes + size;
  var box_type = read(4);
  box_type = btofourcc(box_type);
  if (box_type !== 'sidx') throw 'Unrecognized box type ' + box_type;

  var ver_flags = btoi(read(4));
  var ref_id = read(4);
  var timescale = btoi(read(4));

  var earliest_pts, offset;
  if (ver_flags === 0) {
    earliest_pts = btoi(read(4));
    offset = btoi(read(4));
  } else {
    dlog(2, 'Warning: may be truncating sidx values');
    read(4);
    earliest_pts = btoi(read(4));
    read(4);
    offset = btoi(read(4));
  }
  offset = offset + sidx_end;

  var count = btoi(read(4));
  var time = earliest_pts;

  var res = [];
  for (var i = 0; i < count; ++i) {
    var size = btoi(read(4));
    var duration = btoi(read(4));
    var sap_stuff = read(4);
    res.push({time : time / timescale, duration : duration / timescale,
              offset : offset, size : size});
    time = time + duration;
    offset = offset + size;
  }
  if (curr_pos !== sidx_end) throw 'Bad end point' + curr_pos + sidx_end;
  return res;
}

// Given a BufferedRange object, find the one that contains the given time
// `t`. Returns the end time of the buffered range. If a suitable buffered
// range is not found, returns `null`.
function findBufferedRangeEndForTime(sb, t) {
  var buf = sb.buffered;
  ensureUID(sb);
  for (var i = 0; i < buf.length; ++i) {
    var s = buf.start(i), e = buf.end(i);
    dlog(4, 'findBuf: uid=' + sb.uid + ' index=' + i + ' time=' + t +
         ' start=' + s + ' end=' + e);
    if (t >= s && t <= e)
      return e;
  }

  return null;
}

// This part defines the... source, for the, erm... media. But it's not the
// Media Source. No. No way.
//
// Let's call it "source chain" instead.
//
// At the end of a source chain is a file source. File sources implement the
// following methods:
//
//  init(t, cb): Gets the (cached) initialization segment buffer for t.
//  Current position is not affected. If cb is null, it will return the init
//  segment, otherwise it will call cb with the asynchronously received init
//  segment. If will throw is init segment is not ready and cb is null.
//
//  seek(t): Sets the maximum time of the next segment to be appended. Will
//  likely round down to the nearest segment start time. (To reset a source
//  after EOF, seek to 0.)
//
//  pull(cb): Call the cb with the next media segment.
//  return value of EOS('null') indicates that the chain has been exhausted.
//
// Most source chain elements will return entire media segments, and many will
// expect incoming data to begin on a media segment boundary. Those elements
// that either do not require this property, or return output that doesn't
// follow it, will be noted.
//
// All source chain elements will forward messages that are not handled to the
// upstream element until they reach the file source.

// Produces a FileSource table.
window.FileSource = function(path, XHRManager, timeoutManager,
                             start_index, end_index) {
  this.path = path;
  this.start_index = start_index;
  this.end_index = end_index;
  this.segs = null;
  this.seg_idx = 0;
  this.init_buf = null;

  this.init = function(t, cb) {
    if (!cb) {
      if (!this.init_buf)
        throw 'Calling init synchronusly when the init seg is not ready';
      return this.init_buf;
    }
    self = this;
    if (this.init_buf) {
      timeoutManager.setTimeout(cb.bind(this, this.init_buf), 1);
    } else {
      var self = this;
      var xhr = XHRManager.createRequest(this.path, function(e) {
        self.segs = parseSIDX(this.getResponseData());

        self.start_index = self.start_index || 0;
        self.end_index = self.end_index || self.segs.length - 1;
        self.end_index = Math.min(self.end_index, self.segs.length - 1);
        self.start_index = Math.min(self.start_index, self.end_index);
        self.seg_idx = self.start_index;

        xhr = XHRManager.createRequest(self.path, function(e) {
          self.init_buf = this.getResponseData();
          cb.call(self, self.init_buf);
        }, 0, self.segs[0].offset);
        xhr.send();
      }, 0, 32 * 1024);
      xhr.send();
    }
  };
  this.seek = function(t, src_buf) {
    if (!this.init_buf)
      throw 'Seek must be called after init';

    if (src_buf)
      src_buf.abort();
    else if (t !== 0)
      throw 'You can only seek to the beginning without providing a src_buf';

    t += this.segs[this.start_index].time;
    var i = this.start_index;
    while (i <= this.end_index && this.segs[i].time <= t)
      ++i;
    this.seg_idx = i - 1;
    dlog(2, 'Seeking to segment index=' + this.seg_idx + ' time=' + t +
         ' start=' + this.segs[this.seg_idx].time +
         ' length='  + this.segs[this.seg_idx].duration);
  };
  this.pull = function(cb) {
    if (this.seg_idx > this.end_index) {
      timeoutManager.setTimeout(cb.bind(this, null), 1);
      return;
    }
    var seg = this.segs[this.seg_idx];
    ++this.seg_idx;
    var self = this;
    var xhr = XHRManager.createRequest(this.path, function(e) {
      cb.call(self, this.getResponseData());
    }, seg.offset, seg.size);
    xhr.send();
  };
  this.duration = function() {
    var last = this.segs[this.segs.length - 1];
    return last.time + last.duration;
  };
  this.currSegDuration = function() {
    if (!this.segs || !this.segs[this.seg_idx])
      return 0;
    return this.segs[this.seg_idx].duration;
  };
}

function attachChain(downstream, upstream) {
  downstream.upstream = upstream;
  downstream.init = function(t, cb) {
    return upstream.init(t, cb);
  };
  downstream.seek = function(t, src_buf) {
    return upstream.seek(t, src_buf);
  };
  downstream.pull = function(cb) {
    return upstream.pull(cb);
  };
  downstream.duration = function() {
    return upstream.duration();
  };
  downstream.currSegDuration = function() {
    return upstream.currSegDuration();
  };
}

window.ResetInit = function(upstream) {
  this.init_sent = false;
  attachChain(this, upstream);

  this.init = function(t, cb) {
    this.init_sent = true;
    return this.upstream.init(t, cb);
  };
  this.seek = function(t, src_buf) {
    this.init_sent = false;
    return this.upstream.seek(t, src_buf);
  }
  this.pull = function(cb) {
    if (!this.init_sent) {
      this.init_sent = true;
      this.upstream.init(0, function(init_seg) {
        cb(init_seg);
      });
      return;
    }
    var self = this;
    this.upstream.pull(function(rsp) {
      if (!rsp)
        self.init_sent = false;
      cb(rsp);
    });
  };
}

// This function _blindly_ parses the mdhd header in the segment to find the
// timescale. It doesn't take any box hierarchy into account.
function parseTimeScale(data) {
  for (var i = 0; i < data.length - 3; ++i) {
    if (btofourcc(data, i) !== 'mdhd')
      continue;
    var off = i + 16;
    if (data[i + 4] != 0)
      off = i + 28;

    return btoi(data, off);
  }

  throw 'Failed to find mdhd box in the segment provided';
}

function replaceTFDT(data, tfdt) {
  for (var i = 0; i < data.length - 3; ++i) {
    if (btofourcc(data, i) !== 'tfdt')
      continue;
    tfdt = itob(tfdt);  // convert it into array
    var off = i + 8;
    if (data[i + 4] === 0) {
      data[off] = tfdt[0];
      data[off + 1] = tfdt[1];
      data[off + 2] = tfdt[2];
      data[off + 3] = tfdt[3];
    } else {
      data[off] = 0;
      data[off + 1] = 0;
      data[off + 2] = 0;
      data[off + 3] = 0;
      data[off + 4] = tfdt[0];
      data[off + 5] = tfdt[1];
      data[off + 6] = tfdt[2];
      data[off + 7] = tfdt[3];
    }

    return true;
  }
  // the init segment doesn't have tfdt box.
  return false;
}

// It will repeat a normal stream to turn it into an infinite stream.
// This type of stream cannot be seeked.
window.InfiniteStream = function(upstream) {
  this.upstream = upstream;
  this.timescale = null;
  this.elapsed = 0;
  attachChain(this, upstream);

  this.seek = function(t, src_buf) {
    throw 'InfiniteStream cannot be seeked';
  }
  this.pull = function(cb) {
    var self = this;
    var currSegDuration = self.upstream.currSegDuration();
    function onPull(buf) {
      if (!buf) {
        self.upstream.seek(0, null);
        self.upstream.pull(onPull);
        return;
      }
      if (!self.timescale) {
        var init_buf = self.upstream.init(0);
        self.timescale = parseTimeScale(init_buf);
      }
      var tfdt = Math.floor(self.timescale * self.elapsed);
      if (tfdt === 1) tfdt = 0;
      dlog(3, 'TFDT: time=' + self.elapsed + ' timescale=' + self.timescale +
           ' tfdt=' + tfdt);
      if (replaceTFDT(buf, tfdt))
        self.elapsed = self.elapsed + currSegDuration;
      cb(buf);
    }
    this.upstream.pull(onPull);
  }
  return this;
}

// Pull 'len' bytes from upstream chain element 'elem'. 'cache'
// is a temporary buffer of bytes left over from the last pull.
//
// This function will send exactly 0 or 1 pull messages upstream. If 'len' is
// greater than the number of bytes in the combined values of 'cache' and the
// pulled buffer, it will be capped to the available bytes. This avoids a
// number of nasty edge cases.
//
// Returns 'rsp, new_cache'. 'new_cache' should be passed as 'cache' to the
// next invocation.
function pullBytes(elem, len, cache, cb) {
  if (!cache) {
    // always return EOS if cache is EOS, the caller should call seek before
    // reusing the source chain.
    cb(cache, null);
    return;
  }

  if (len <= cache.length) {
    var buf = cache.subarray(0, len);
    cache = cache.subarray(len);
    cb(buf, cache);
    return;
  }

  elem.pull(function(buf) {
    if (!buf) {  // EOS
      cb(cache, buf);
      return;
    }
    var new_cache = new Uint8Array(cache.length + buf.length);
    new_cache.set(cache);
    new_cache.set(buf, cache.length);
    cache = new_cache;

    if (cache.length <= len) {
      cb(cache, new Uint8Array());
    } else {
      buf = cache.subarray(0, len);
      cache = cache.subarray(len);
      cb(buf, cache);
    }
  });
}

window.FixedAppendSize = function(upstream, size) {
  this.cache = new Uint8Array(0);
  attachChain(this, upstream);
  this.appendSize = function() {
    return size || 512 * 1024;
  };
  this.seek = function(t, src_buf) {
    this.cache = new Uint8Array(0);
    return this.upstream.seek(t, src_buf);
  };
  this.pull = function(cb) {
    var len = this.appendSize();
    var self = this;
    pullBytes(this.upstream, len, this.cache, function(buf, cache) {
      self.cache = cache;
      cb(buf);
    });
  };
}

window.RandomAppendSize = function(upstream, min, max) {
  FixedAppendSize.apply(this, arguments);
  this.appendSize = function() {
    min = min || 100;
    max = max || 10000;
    return Math.floor(Math.random() * (max - min + 1) + min);
  }
}

window.RandomAppendSize.prototype = new window.FixedAppendSize;
window.RandomAppendSize.prototype.constructor = window.RandomAppendSize;

// This function appends the init segment to media source
window.appendInit = function(mp, src_buf, chain, t, cb) {
  chain.init(t, function(init_seg) {
    src_buf.append(init_seg);
    cb();
  });
}

// This is a simple append loop. It pulls data from `chain` and appends it to
// `src_buf` until the end of the buffered range contains time `t`.
// It starts from the current playback location.
window.appendUntil = function(timeoutManager, mp, src_buf, chain, t, cb) {
  if (!elementInBody(mp)) {
    cb();
      return;
  }

  var started = src_buf.buffered.length !== 0;
  var current = mp.currentTime;
  var buffered_end = findBufferedRangeEndForTime(src_buf, current);

  if (buffered_end) {
    buffered_end = buffered_end + 0.1;
  } else {
    buffered_end = 0;
    if (started) {
      chain.seek(0, src_buf);
    }
  }

  (function loop(buffer) {
    if (!elementInBody(mp)) {
      cb();
      return;
    }
    if (buffer) {
      if (!safeAppend(src_buf, buffer)) {
        cb();
        return;
      }
      buffered_end = findBufferedRangeEndForTime(src_buf, buffered_end);
      if (buffered_end) {
        buffered_end = buffered_end + 0.1;
      } else {
        buffered_end = 0;
      }
      timeoutManager.setTimeout(loop, 0);
    } else {
      if (t >= buffered_end && !mp.error)
        chain.pull(loop);
      else
        cb();
    }
  })();
}

// This is a simple append loop. It pulls data from `chain` and appends it to
// `src_buf` until the end of the buffered range that contains time `t` is at
// least `gap` seconds beyond `t`. If `t` is not currently in a buffered
// range, it first seeks to a time before `t` and appends until `t` is
// covered.
window.appendAt = function(timeoutManager, mp, src_buf, chain, t, gap, cb) {
  if (!elementInBody(mp)) {
    cb();
      return;
  }

  gap = gap || 3;

  var buffered_end = findBufferedRangeEndForTime(src_buf, t);

  (function loop(buffer) {
    if (!elementInBody(mp)) {
      cb();
      return;
    }
    if (buffer) {
      if (!safeAppend(src_buf, buffer))
        return;
      buffered_end = findBufferedRangeEndForTime(src_buf, t);
      timeoutManager.setTimeout(loop, 0);
    } else {
      if (t + gap >= (buffered_end || 0) && !mp.error) {
        chain.pull(loop);
      } else {
        cb();
      }
    }
  })();
}

// Append data from chains `f1` and `f2` to source buffers `s1` and `s2`,
// maintaining `lead` seconds of time between current playback time and end of
// current buffered range. Continue to do this until the current playback time
// reaches `end_time`.
// It supports play one stream, where `s2` and `f2` are null.
//
// `lead` may be small or negative, which usually triggers some interesting
// fireworks with regard to the network buffer level state machine.
//
// TODO: catch transition to HAVE_CURRENT_DATA or lower and append enough to
// resume in that case
window.playThrough = function(timeoutManager, mp, lead, end_time, s1, f1, s2,
                              f2, cb) {
  var yield_time = 0.03;

  function loop() {
    if (!elementInBody(mp))
      return;
    if (mp.currentTime <= end_time && !mp.error)
      timeoutManager.setTimeout(playThrough.bind(
          null, timeoutManager, mp, lead, end_time, s1, f1, s2, f2, cb),
          yield_time * 1000);
    else
      cb();
  };
  appendAt(timeoutManager, mp, s1, f1, mp.currentTime, yield_time + lead,
           function() {
             if (s2)
               appendAt(timeoutManager, mp, s2, f2, mp.currentTime,
                        yield_time + lead, loop);
             else
               loop();
           });
}

window.waitUntil = function(timeouts, media, target, cb) {
  var initTime = media.currentTime;
  var lastTime = lastTime;
  var check = function() {
    if (media.currentTime === initTime) {
      timeouts.setTimeout(check, 500);
    } else if (media.currentTime === lastTime || media.currentTime > target) {
      cb();
    } else {
      lastTime = media.currentTime;
      timeouts.setTimeout(check, 500);
    }
  }
  timeouts.setTimeout(check, 500);
};

window.callAfterLoadedMetaData = function(media, testFunc) {
  var onLoadedMetadata = function() {
    LOG('onLoadedMetadata called');
    media.removeEventListener('loadedmetadata', onLoadedMetadata);
    testFunc();
  };

  if (media.readyState >= media.HAVE_METADATA) {
    LOG('onLoadedMetadata bypassed');
    testFunc();
  } else {
    media.addEventListener('loadedmetadata', onLoadedMetadata);
  }
};

})();
