"use strict";
/* Copyright 2012 Google Inc.
 *
 * Modified 11/12/12
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * 0.2-130-g0e02ffd
 */
(function() {

// Given an array buffer, return a slice of that buffer which contains the
// initialization segment. Assumes initialization segment *starts* at beginning.
function extractInit(ab) {
  var d = new DataView(ab);
  var pos = 0;
  while (pos < ab.byteLength) {
    var type = d.getUint32(pos+4, false);
    if (type == 0x73696478 || type == 0x6d6f6f66)
      break;
    pos += d.getUint32(pos, false);
  }
  return new Uint8Array(ab.slice(0, pos));
}
window.extractInit = extractInit;

// Parse a 'sidx' atom from data in an array buffer. 'ab_first_byte_offset'
// should be the offset of the first byte of the array buffer with respect to
// whatever mechanism for retrieving byte offsets is in use.
function parseSIDX(ab, ab_first_byte_offset) {
  var d = new DataView(ab);
  var pos = 0;
  while (d.getUint32(pos+4, false) != 0x73696478) {
    pos += d.getUint32(pos, false);
    if (pos >= ab.byteLength) throw "Could not find sidx";
  }

  var sidxEnd = d.getUint32(pos, false) + pos;
  if (sidxEnd > ab.byteLength) throw "sidx terminates after array buffer";
  var version = d.getUint8(pos+8);
  pos += 12;

  // skipped reference_ID(32)
  var timescale = d.getUint32(pos+4, false);
  pos += 8;

  var earliest_presentation_time, first_offset;
  if (version == 0) {
    earliest_presentation_time = d.getUint32(pos, false);
    first_offset = d.getUint32(pos+4, false);
    pos += 8;
  } else {
    // TODO(strobe): Overflow checks
    earliest_presentation_time =
        (d.getUint32(pos, false) << 32) + d.getUint32(pos+4, false);
    first_offset =
        (d.getUint32(pos+8, false) << 32) + d.getUint32(pos+12, false);
    pos += 16;
  }
  first_offset += sidxEnd + (ab_first_byte_offset || 0);

  // skipped reserved(16)
  var reference_count = d.getUint16(pos+2, false);
  pos += 4;

  var offset = first_offset;
  var time = earliest_presentation_time;
  var references = [];
  for (var i = 0; i < reference_count; i++) {
    var ref_size = d.getUint32(pos, false);
    var ref_type = ref_size & 0x80000000;
    if (ref_type) throw "Unhandled indirect reference";
    ref_size = ref_size & 0x7fffffff;
    var ref_dur = d.getUint32(pos+4, false);
    pos += 12;
    references.push({'size': ref_size, 'offset': offset,
                     'duration': ref_dur,
                     'time': time,
                     'timescale':timescale
                    });
    offset += ref_size;
    time += ref_dur;
  }
  if (pos != sidxEnd)
    throw "Error: final pos " + pos + " differs from SIDX end " + sidxEnd;
  return references;
}
window.parseSIDX = parseSIDX;

})();
