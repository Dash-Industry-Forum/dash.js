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

var createElement = util.createElement;

function Test(desc, fields) {
  var INDEX = 0;
  var STATUS = INDEX + 1;
  var DESC = STATUS + 1;
  var FIELD = DESC + 1;
  this.index = desc.index;
  this.id = 'test-row' + this.index;
  this.desc = desc;
  this.steps = [];

  this.createElement = function(element) {
    element.id = this.id;
    element.appendChild(createElement('td', null, 'index',
                                      this.index + 1 + '.'));
    element.appendChild(
        createElement('td', null, 'status',
                      '<input type="checkbox" checked="yes"></input> >'));
    element.appendChild(createElement('td', null, 'desc'));

    for (var field = 0; field < fields.length; ++field)
      element.appendChild(createElement('td', null, 'state', 0));

    var link = createElement('a', null, null, desc.desc);
    link.href = 'javascript:;';
    link.onclick = desc.onclick;
    link.title = desc.title;
    element.childNodes[DESC].appendChild(link);
    var explanation_point = createElement('span', null, 'desc-expl-point', '?');
    var explanation = createElement('span', null, 'desc-expl-popup', desc.title);
    explanation_point.appendChild(explanation);
    element.childNodes[DESC].appendChild(explanation_point);
  };

  this.addStep = function(name) {
    var tr = createElement('tr');
    tr.appendChild(createElement('td', null, 'small'));
    tr.appendChild(createElement('td', null, 'small'));
    tr.appendChild(createElement('td', null, 'small',
                                 this.steps.length + 1 + '. ' + name));
    for (var field = 0; field < fields.length; ++field)
      tr.appendChild(createElement('td', null, 'small', 0));

    var element = document.getElementById(this.id);
    if (this.steps.length !== 0)
      element = this.steps[this.steps.length - 1];
    if (element.nextSibling)
      element.parentNode.insertBefore(tr, element.nextSibling);
    else
      element.parentNode.appendChild(tr);
    this.steps.push(tr);
  };

  this.updateStatus = function() {
    var element = document.getElementById(this.id);
    element.childNodes[STATUS].className =
        this.desc.running ? 'status_current' : 'status';
    for (var field = 0; field < fields.length; ++field)
      element.childNodes[FIELD + field].innerHTML =
          this.desc[fields[field].replace(' ', '_')];
  };

  this.selected = function() {
    var element = document.getElementById(this.id);
    return element.childNodes[STATUS].childNodes[0].checked;
  };

  this.select = function() {
    var element = document.getElementById(this.id);
    element.childNodes[STATUS].childNodes[0].checked = true;
  };

  this.deselect = function() {
    var element = document.getElementById(this.id);
    element.childNodes[STATUS].childNodes[0].checked = false;
  };
}

function TestList(fields) {
  var tableid = 'test-list-table';
  var headid = tableid + '-head';
  var bodyid = tableid + '-body';
  var tests = [];

  if (!fields || !fields.length)
    throw 'No test fields';

  this.addColumnHeader = function(class_, text) {
    var head = document.getElementById(headid);
    var th = createElement('th', null, class_, text);
    th.scope = 'col';
    head.appendChild(th);
  };

  this.addTest = function(desc) {
    var test = new Test(desc, fields);
    tests.push(test);
    return test;
  };

  this.generate = function(div) {
    var table = document.createElement('table');
    table.id = tableid;
    div.appendChild(table);

    var thead = createElement('thead');
    table.classList.add('test-table');
    table.innerHTML = '';
    var head = createElement('tr');
    var body = createElement('tbody');

    head.id = headid;
    body.id = bodyid;
    thead.appendChild(head);
    table.appendChild(thead);
    table.appendChild(body);

    this.addColumnHeader('index');
    this.addColumnHeader('status');
    this.addColumnHeader('desc', 'Test');

    for (var i = 0; i < fields.length; ++i)
      this.addColumnHeader('state', util.MakeCapitalName(fields[i]));

    for (var i = 0; i < tests.length; ++i) {
      var tr = createElement('tr');
      body.appendChild(tr);
      tests[i].createElement(tr);
      tests[i].updateStatus();
    }
  };

  this.getTest = function(index) {
    return tests[index];
  };

  this.anySelected = function() {
    for (var i = 0; i < tests.length; ++i)
      if (tests[i].selected())
        return true;
    return false;
  };

  this.selectAll = function() {
    for (var i = 0; i < tests.length; ++i)
      tests[i].select();
  };

  this.deselectAll = function() {
    for (var i = 0; i < tests.length; ++i)
      tests[i].deselect();
  };
};

window.createFullTestList = function(fields) {
  return new TestList(fields);
}

})();
