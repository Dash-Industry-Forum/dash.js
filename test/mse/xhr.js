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

var BYPASS_CACHE = false;

// Hook the onload event for request that is finished successfully
var Request = function(manager, logger, file, onload, postLength,
                       start, length) {
  var self = this;

  this.open = function() {
    this.xhr = new XMLHttpRequest();

    this.onload = onload;
    this.type = util.isValidArgument(postLength) ? 'POST' : 'GET';

    this.xhr.open(this.type,
                  file + (BYPASS_CACHE ? '?' + (new Date()).getTime() : ''));
    this.xhr.responseType = 'arraybuffer';

    if (start != null && length != null)
      this.xhr.setRequestHeader(
          'Range', 'bytes=' + start + '-' + (start + length - 1));

    this.xhr.addEventListener('error', function(e) {
      if (self.xhr.status === 404)
        alert('Failed to find "' + file +
              '" with error 404. Is it on the server?');
      manager.requestFinished(self);
      logger.log('XHR error with code', self.xhr.status);
      self.open();
      self.send();
    });

    this.xhr.addEventListener('timeout', function(e) {
      manager.requestFinished(self);
      logger.log('XHR timeout');
      self.open();
      self.send();
    });

    this.xhr.addEventListener('load', function(e) {
      manager.requestFinished(self);
      return self.onload(e);
    });
  }

  this.getRawResponse = function() {
    if (this.xhr.status === 404)
      alert('Failed to find "' + file +
            '" with error 404. Is it on the server?');
    logger.assert(this.xhr.status >= 200 && this.xhr.status < 300,
                  'XHR bad status: ' + this.xhr.status);
    return this.xhr.response;
  }

  this.getResponseData = function() {
    if (this.xhr.status === 404)
      alert('Failed to find "' + file +
            '" with error 404. Is it on the server?');
    logger.assert(this.xhr.status >= 200 && this.xhr.status < 300,
                  'XHR bad status: ' + this.xhr.status);
    var result = new Uint8Array(this.xhr.response);
    if (length != null) {
      var rangeHeader = this.xhr.getResponseHeader('Content-Range');
      var lengthHeader = this.xhr.getResponseHeader('Content-Length');
      if (!rangeHeader && lengthHeader) {
        logger.assert(length <= lengthHeader,
                      'Length of response is smaller than request');
        result = result.subarray(start, start + length);
        logger.checkEq(result.length, length, 'XHR length');
        return result;
      }
      logger.checkEq(result.length, length, 'XHR length');
    }
    return result;
  };

  this.send = function(postData) {
    manager.addRequest(this);
    if (postData) {
      logger.checkEq(this.type, 'POST', 'XHR requestType');
      this.xhr.send(postData);
    } else {
      logger.checkEq(this.type, 'GET', 'XHR requestType');
      this.xhr.send();
    }
  };

  this.abort = function() {
    this.xhr.abort();
  };

  this.open();
};

var XHRManager = function(logger) {
  var requests = [];

  this.addRequest = function(request) {
    logger.checkEq(requests.indexOf(request), -1, 'request index');
    requests.push(request);
  };

  this.requestFinished = function(request) {
    logger.checkNE(requests.indexOf(request), -1, 'request index');
    requests.splice(requests.indexOf(request), 1);
  };

  this.abortAll = function() {
    for (var i = 0; i < requests.length; ++i)
      requests[i].abort();
    requests = [];
  };

  this.createRequest = function(file, onload, start, length) {
    return new Request(this, logger, file, onload, null, start, length);
  };

  this.createPostRequest = function(file, onload, postLength, start, length) {
    return new Request(this, logger, file, onload, postLength, start, length);
  };
};

window.createXHRManager = function(logger) {
  return new XHRManager(logger);
};

})();

