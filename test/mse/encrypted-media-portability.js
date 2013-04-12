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

/* The code tries to wrapper the EME versions with or without webkit prefix */

(function() {

var dlog = function() {
  var forward = window.dlog || console.log.bind(console);
  forward.apply(this, arguments);
};

var proto = window.HTMLMediaElement.prototype;

if (proto.addKey)
  return;  // Non-prefix version, needn't wrap.

if (!proto.webkitAddKey) {
  dlog(1, 'EME is not available');
  return;  // EME is not available at all.
}

proto.generateKeyRequest = function(keySystem, initData) {
  if (keySystem === 'org.w3.clearkey')
    keySystem = 'webkit-org.w3.clearkey';
  return proto.webkitGenerateKeyRequest.call(this, keySystem, initData);
};

proto.addKey = function(keySystem, key, initData, sessionId) {
  if (keySystem === 'org.w3.clearkey')
    keySystem = 'webkit-org.w3.clearkey';
  return proto.webkitAddKey.call(this, keySystem, key, initData, sessionId);
};

proto.cancelKeyRequest = function(keySystem, sessionId) {
  if (keySystem === 'org.w3.clearkey')
    keySystem = 'webkit-org.w3.clearkey';
  return proto.webkitCancelKeyRequest.call(this, keySystem, sessionId);
};

var ael = proto.addEventListener;
var eventWrapper = function(listener, e) {
  if (e.keySystem === 'webkit-org.w3.clearkey')
    e.keySystem = 'org.w3.clearkey';
  listener.call(this, e);
};

proto.addEventListener =
    function(type, listener, useCaptures) {
      var re = /^(keyadded|keyerror|keymessage|needkey)$/;
      var match = re.exec(type);
      if (match) {
        ael.call(this, 'webkit' + type, eventWrapper.bind(this, listener),
                 useCaptures);
      } else {
        ael.call(this, type, listener, useCaptures);
      }
    };

})();
