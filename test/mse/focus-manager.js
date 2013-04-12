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

var INFINITY = 100000;
var MAX_FUDGE = INFINITY;
var DIRECTION_WEIGHT = 0.5;

var LEFT = {x: -1, y: 0};
var UP = {x: 0, y: -1};
var RIGHT = {x: 1, y: 0};
var DOWN = {x: 0, y: 1};

function Rect(left, top, width, height) {
  this.left = left;
  this.top = top;
  this.width = width;
  this.height = height;
  this.right = this.left + this.width - 1;
  this.bottom = this.top + this.height - 1;

  var rangeDist = function(start, end, startRef, endRef) {
    if (start < startRef) {
      if (end < startRef) return startRef - end;
      return 0;
    }
    if (start <= endRef) return 0;
    return start - endRef;
  };

  this.valid = function() {
    return this.width !== 0 && this.height !== 0;
  };

  this.inside = function(x, y) {
    return x >= this.left && x < this.left + this.width &&
        y >= this.top && y < this.top + this.height;
  };

  this.intersect = function(that) {
    return this.inside(that.left, that.top) ||
        this.inside(that.right, that.top) ||
        this.inside(that.left, that.bottom) ||
        this.inside(that.right, that.bottom) ||
        that.inside(this.left, this.top) ||
        that.inside(this.right, this.top) ||
        that.inside(this.left, this.bottom) ||
        that.inside(this.right, this.bottom);
  };


  this.distanceSquared = function(ref, dir) {
    var x, y;
    if (dir.x === -1) {
      x = (ref.left - this.right) * DIRECTION_WEIGHT;
      y = rangeDist(this.top, this.bottom, ref.top, ref.bottom);
    } else if (dir.x === 1) {
      x = (this.left - ref.right) * DIRECTION_WEIGHT;
      y = rangeDist(this.top, this.bottom, ref.top, ref.bottom);
    } else if (dir.y === -1) {
      x = rangeDist(this.left, this.right, ref.left, ref.right);
      y = (ref.top - this.bottom) * DIRECTION_WEIGHT;
    } else {
      x = rangeDist(this.left, this.right, ref.left, ref.right);
      y = (this.top - ref.bottom) * DIRECTION_WEIGHT;
    }

    return x * x + y * y;
  };

  // Check if this is strictly at the side (defined by dir) of ref, there
  // cannot be any overlap.
  this.atSide = function(ref, dir, fudge) {
    var left, right, top, bottom;

    if (dir === LEFT) {
      left = -INFINITY;
      right = ref.left - 1;
      top = ref.top - fudge;
      bottom = ref.bottom + fudge;
    } else if (dir === RIGHT) {
      left = ref.right + 1;
      right = INFINITY;
      top = ref.top - fudge;
      bottom = ref.bottom + fudge;
    } else if (dir === UP) {
      left = ref.left - fudge;
      right = ref.right + fudge;
      top = -INFINITY;
      bottom = ref.top - 1;
    } else {
      left = ref.left - fudge;
      right = ref.right + fudge;
      top = ref.bottom + 1;
      bottom = INFINITY;
    }

    var rect = new Rect(left, top, right - left, bottom - top);
    var centerX = (this.left + this.right) / 2;
    var centerY = (this.top + this.bottom) / 2;
    return rect.inside(centerX, centerY) && this.intersect(rect);
  };

  this.toString = function() {
    return '(' + this.left + ', ' + this.top + ', ' + this.right + ', ' +
        this.bottom + ')';
  };
};

function createRect(element) {
  var offsetLeft = element.offsetLeft;
  var offsetTop = element.offsetTop;
  var e = element.offsetParent;
  while (e && e !== document.body) {
    offsetLeft += e.offsetLeft;
    offsetTop += e.offsetTop;
    e = e.offsetParent;
  }
  return new Rect(offsetLeft, offsetTop,
                  element.offsetWidth, element.offsetHeight);
};

function FocusManager() {
  var elements = [];
  var handlers = [];

  var pickElement = function(e, dir, fudge) {
    if (!fudge)
      return pickElement(e, dir, 2) || pickElement(e, dir, MAX_FUDGE);

    var rect = createRect(e);
    var bestDistanceSquared = INFINITY * INFINITY;
    var bestElement = null;
    for (var i = 0; i < elements.length; ++i) {
      if (elements[i] !== e) {
        var r = createRect(elements[i]);
        if (r.valid() && r.atSide(rect, dir, fudge)) {
          var distanceSquared = r.distanceSquared(rect, dir);
          if (!bestElement || distanceSquared < bestDistanceSquared) {
            bestElement = elements[i];
            bestDistanceSquared = distanceSquared;
          }
        }
      }
    }

    return bestElement;
  };

  var onkeydown = function(e) {
    if (elements.indexOf(e.target) !== -1) {
      var dir;
      if (e.keyCode === 37) {  // left
        dir = LEFT;
      } else if (e.keyCode === 38) {  // up
        dir = UP;
      } else if (e.keyCode === 39) {  // right
        dir = RIGHT;
      } else if (e.keyCode === 40) {  // down
        dir = DOWN;
      } else {
        return true;
      }
      var element = pickElement(e.target, dir);
      if (element) {
        element.focus();
        e.stopPropagation();
        e.preventDefault();
      }
    }

    return true;
  };

  this.add = function(element) {
    if (elements.indexOf(element) === -1) {
      elements.push(element);
      handlers.push(element.addEventListener('keydown', onkeydown));
    }
  };
};

window.addEventListener('load', function() {
  var focusManager = new FocusManager;
  var elements = document.getElementsByClassName('focusable');
  for (var i = 0; i < elements.length; ++i)
    focusManager.add(elements[i]);

  var links = document.getElementsByTagName('A');
  for (var i = 0; i < links.length; ++i)
    focusManager.add(links[i]);
});

})();
