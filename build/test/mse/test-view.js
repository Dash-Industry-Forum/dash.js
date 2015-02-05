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

var TestView = (function() {

var createElement = util.createElement;

var createAnchor = function(text, id) {
  return util.createElement('a', id, 'rightmargin20', text);
};

function TestView(runner) {
  this.runner = runner;
  this.test_list = null;

  var switches = [];
  var commands = [];
  var links = [];

  this.addSwitch = function(text, id) {
    switches.push({text: text, id: id});
  };

  this.addCommand = function(text, id, title, onclick) {
    commands.push({text: text, id: id, title: title, onclick: onclick});
  };

  this.addLink = function(text, href) {
    links.push({text: text, href: href});
  };

  this.generate = function() {
    var TITLE = 'MSE and EME ' + testTypes[currentTestType].name +
        ' (v REVISION)';
    document.body.appendChild(createElement('h3', 'title', null, TITLE));
    document.body.appendChild(createElement('h4', 'info'));
    document.body.appendChild(createElement('h4', 'usage'));
    document.body.appendChild(createElement('div', 'testview'));

    var div = document.getElementById(this.divid);
    div.innerHTML = '';
    div.appendChild(createElement('div', 'control', 'container'));

    var testContainer = createElement('div', null, 'container');
    testContainer.appendChild(createElement('div', 'testlist', 'box-left'));
    testContainer.appendChild(createElement('div', 'testarea'));
    div.appendChild(testContainer);

    var outputArea = createElement('div', 'outputarea');
    var textArea = createElement('textarea', 'output');
    textArea.rows = 10;
    textArea.cols = 80;
    outputArea.appendChild(textArea);
    div.appendChild(outputArea);

    var control = document.getElementById('control');

    for (var i = 0; i < switches.length; ++i) {
      var id = switches[i].id;
      control.appendChild(document.createTextNode(switches[i].text));
      control.appendChild(createAnchor(window[id] ? 'on' : 'off', id));
      control.lastChild.href = 'javascript:;';
      control.lastChild.onclick = (function(id) {
        return function(e) {
          var wasOff = e.target.innerHTML === 'off';
          e.target.innerHTML = wasOff ? 'on' : 'off';
          window[id] = wasOff;
        };
      })(id);
    }

    for (var i = 0; i < commands.length; ++i) {
      control.appendChild(createAnchor(commands[i].text, commands[i].id));
      control.lastChild.href = 'javascript:;';
      control.lastChild.onclick = commands[i].onclick;
      control.lastChild.title = commands[i].title;
    }

    for (var i = 0; i < links.length; ++i) {
      control.appendChild(createAnchor(links[i].text));
      control.lastChild.href = links[i].href;
    }

    control.appendChild(
        createElement('span', 'finish-count', null, '0 tests finished'));

    this.test_list.generate(document.getElementById('testlist'));
  };

  this.addTest = function(desc) {
    return this.test_list.addTest(desc);
  };

  this.anySelected = function() {
    return this.test_list.anySelected();
  };
};

return {create: function() { return new TestView(); }};

})();
