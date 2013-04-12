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

var ITEM_IN_COLUMN = 25;  // Test item count in a column
var CATEGORY_SPACE = 1;  // Row between the end of the last category and the
                         // beginning of the next category
var MIN_ROW_AT_THE_BOTTOM = 2;  // If at the bottom of the table and the row
                                // count is less than this, start a new column.

var createElement = util.createElement;

function Category(categoryName) {
  this.createElement = function(name, status) {
    name.className = 'cell-category';
    name.innerText = categoryName;
  }
}

function Test(desc) {
  var self = this;
  this.index = desc.index;
  this.nameId = 'test-item-name-' + this.index;
  this.statusId = 'test-item-status-' + this.index;
  this.desc = desc;
  this.steps = [];

  this.createElement = function(name, status) {
    name.id = this.nameId;
    status.id = this.statusId;
    var link = createElement('a', null, null,
                             this.index + 1 + '. ' + this.desc.desc);
    link.href = 'javascript:;';
    link.onclick = desc.onclick;
    link.title = desc.title;
    name.appendChild(link);
    this.updateStatus(status);
  }

  this.updateStatus = function(status) {
    var text = this.desc.status;
    if (text && text.length > 5) text = '';
    status = status ? status : document.getElementById(this.statusId);

    if (this.desc.running) {
      status.innerHTML = '&nbsp;...&nbsp;';
      status.className = 'cell-status-running';
    } else if (this.desc.failures) {
      status.innerHTML = text || '&nbsp;Fail&nbsp;';
      status.className = 'cell-status-fail';
    } else if (this.desc.timeouts) {
      status.innerHTML = text || '&nbsp;Fail&nbsp;';
      status.className = 'cell-status-fail';
    } else if (this.desc.passes) {
      status.innerHTML = text || '&nbsp;Pass&nbsp;';
      status.className = 'cell-status-pass';
    } else {
      status.innerHTML = ' ';
      status.className = 'cell-status-normal';
    }
  };

  this.selected = function() {
    return true;
  };

  this.getElement = function() {
    return document.getElementById(this.nameId).childNodes[0];
  };
}

function TestList() {
  var self = this;
  var tests = [];

  // returns array [row, column]
  var getTableDimension = function() {
    var lastCategory = '';
    var cells = 0;
    var rowLeft;

    for (var i = 0; i < tests.length; ++i) {
      if (lastCategory !== tests[i].desc.category) {
        rowLeft = ITEM_IN_COLUMN - cells % ITEM_IN_COLUMN;
        if (rowLeft < MIN_ROW_AT_THE_BOTTOM)
          cells += rowLeft;
        if (cells % ITEM_IN_COLUMN !== 0)
          cells += CATEGORY_SPACE;
        cells++;
        lastCategory = tests[i].desc.category;
      } else if (cells % ITEM_IN_COLUMN === 0) {
        cells++;  // category (continued)
      }
      cells++;
    }

    return [Math.min(cells, ITEM_IN_COLUMN),
            Math.floor((cells + ITEM_IN_COLUMN - 1) / ITEM_IN_COLUMN)];
  };

  this.addTest = function(desc) {
    var test = new Test(desc);
    tests.push(test);
    return test;
  };

  this.generate = function(div) {
    var table = createElement('table', null, 'compact-list');
    var tr;
    var dim = getTableDimension();
    var lastCategory = '';
    var row;
    var column;

    for (row = 0; row < dim[0]; ++row) {
      tr = createElement('tr');
      table.appendChild(tr);
      for (column = 0; column < dim[1]; ++column) {
        tr.appendChild(createElement('td', null, 'cell-name', '&nbsp;'));
        tr.appendChild(createElement('td', null, 'cell-divider'));
        tr.appendChild(createElement('td', null, 'cell-status-normal'));
      }
    }

    div.innerHTML = '';
    div.appendChild(table);

    row = column = 0;

    for (var i = 0; i < tests.length; ++i) {
      if (lastCategory !== tests[i].desc.category) {
        if (ITEM_IN_COLUMN - row < MIN_ROW_AT_THE_BOTTOM) {
          row = 0;
          column++;
        }
        if (row % ITEM_IN_COLUMN !== 0)
          row += CATEGORY_SPACE;
        lastCategory = tests[i].desc.category;
        (new Category(lastCategory)).createElement(
            table.childNodes[row].childNodes[column * 3],
            table.childNodes[row].childNodes[column * 3 + 2]);
        row++;
      } else if (row === 0) {
        (new Category(lastCategory)).createElement(
            table.childNodes[row].childNodes[column * 3],
            table.childNodes[row].childNodes[column * 3 + 2]);
        row++;
      }
      tests[i].createElement(
          table.childNodes[row].childNodes[column * 3],
          table.childNodes[row].childNodes[column * 3 + 2]);
      row++;
      if (row === ITEM_IN_COLUMN) {
        row = 0;
        column++;
      }
    }
  };

  this.getTest = function(index) {
    return tests[index];
  };

  this.anySelected = function() {
    return tests.length !== 0;
  };
};

window.createCompactTestList = function() {
  return new TestList();
}

})();
