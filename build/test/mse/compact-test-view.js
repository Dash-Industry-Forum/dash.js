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

var CompactTestView = (function() {

function CompactTestView() {
  var self = this;
  this.divid = 'testview';
  this.testCount = 0;

  this.initialize = function() {
    this.test_list = createCompactTestList();

    this.addSwitch('Loop: ', 'loop');
    this.addSwitch('Stop on failure: ', 'stoponfailure');
    this.addSwitch('Log: ', 'logging');

    this.addCommand('Run All', 'run-selected', 'Run all tests in order.',
                    function(e) {
                      if (self.onrunselected)
                        self.onrunselected.call(self, e);
                    });

    this.addLink('Links', 'links.html');
    this.addLink('Instructions', 'instructions.html');
    this.addLink('Change Log', 'changelog.html');
    this.addLink('Download', 'download.tar.gz');

    for (var testType in testTypes) {
      if (testType !== currentTestType && testTypes[testType].public) {
        this.addLink(testTypes[testType].name,
                     'main.html?test_type=' + testType);
      }
    }
  };

  this.addTest = function(desc) {
    return this.test_list.addTest(desc);
  };

  this.generate = function() {
    CompactTestView.prototype.generate.call(this);
    document.getElementById('run-selected').focus();

    var USAGE = 'Use &uarr;&darr;&rarr;&larr; to move around, ' +
        'use ENTER to select.';
    document.getElementById('usage').innerHTML = USAGE;
    document.getElementById('run-selected').focus();
  };

  this.getTest = function(index) {
    return this.test_list.getTest(index);
  };

  this.finishedOneTest = function() {
    ++this.testCount;
    document.getElementById('finish-count').innerHTML =
        this.testCount === 1 ? this.testCount + ' test finished' :
                              this.testCount + ' tests finished';
  };

  this.anySelected = function() {
    return this.test_list.anySelected();
  };

  this.initialize();
};

CompactTestView.prototype = TestView.create();
CompactTestView.prototype.constructor = CompactTestView;

return {create: function() { return new CompactTestView(); }};

})();
