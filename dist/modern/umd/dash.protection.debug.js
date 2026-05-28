(function webpackUniversalModuleDefinition(root, factory) {
	if(typeof exports === 'object' && typeof module === 'object')
		module.exports = factory();
	else if(typeof define === 'function' && define.amd)
		define([], factory);
	else if(typeof exports === 'object')
		exports["dashjs"] = factory();
	else
		root["dashjs"] = factory();
})(self, function() {
return /******/ (function() { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ "./node_modules/path-browserify/index.js":
/*!***********************************************!*\
  !*** ./node_modules/path-browserify/index.js ***!
  \***********************************************/
/***/ (function(module) {

// 'path' module extracted from Node.js v8.11.1 (only the posix part)
// transplited with Babel

// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.



function assertPath(path) {
  if (typeof path !== 'string') {
    throw new TypeError('Path must be a string. Received ' + JSON.stringify(path));
  }
}

// Resolves . and .. elements in a path with directory names
function normalizeStringPosix(path, allowAboveRoot) {
  var res = '';
  var lastSegmentLength = 0;
  var lastSlash = -1;
  var dots = 0;
  var code;
  for (var i = 0; i <= path.length; ++i) {
    if (i < path.length) code = path.charCodeAt(i);else if (code === 47 /*/*/) break;else code = 47 /*/*/;
    if (code === 47 /*/*/) {
      if (lastSlash === i - 1 || dots === 1) {
        // NOOP
      } else if (lastSlash !== i - 1 && dots === 2) {
        if (res.length < 2 || lastSegmentLength !== 2 || res.charCodeAt(res.length - 1) !== 46 /*.*/ || res.charCodeAt(res.length - 2) !== 46 /*.*/) {
          if (res.length > 2) {
            var lastSlashIndex = res.lastIndexOf('/');
            if (lastSlashIndex !== res.length - 1) {
              if (lastSlashIndex === -1) {
                res = '';
                lastSegmentLength = 0;
              } else {
                res = res.slice(0, lastSlashIndex);
                lastSegmentLength = res.length - 1 - res.lastIndexOf('/');
              }
              lastSlash = i;
              dots = 0;
              continue;
            }
          } else if (res.length === 2 || res.length === 1) {
            res = '';
            lastSegmentLength = 0;
            lastSlash = i;
            dots = 0;
            continue;
          }
        }
        if (allowAboveRoot) {
          if (res.length > 0) res += '/..';else res = '..';
          lastSegmentLength = 2;
        }
      } else {
        if (res.length > 0) res += '/' + path.slice(lastSlash + 1, i);else res = path.slice(lastSlash + 1, i);
        lastSegmentLength = i - lastSlash - 1;
      }
      lastSlash = i;
      dots = 0;
    } else if (code === 46 /*.*/ && dots !== -1) {
      ++dots;
    } else {
      dots = -1;
    }
  }
  return res;
}
function _format(sep, pathObject) {
  var dir = pathObject.dir || pathObject.root;
  var base = pathObject.base || (pathObject.name || '') + (pathObject.ext || '');
  if (!dir) {
    return base;
  }
  if (dir === pathObject.root) {
    return dir + base;
  }
  return dir + sep + base;
}
var posix = {
  // path.resolve([from ...], to)
  resolve: function resolve() {
    var resolvedPath = '';
    var resolvedAbsolute = false;
    var cwd;
    for (var i = arguments.length - 1; i >= -1 && !resolvedAbsolute; i--) {
      var path;
      if (i >= 0) path = arguments[i];else {
        if (cwd === undefined) cwd = process.cwd();
        path = cwd;
      }
      assertPath(path);

      // Skip empty entries
      if (path.length === 0) {
        continue;
      }
      resolvedPath = path + '/' + resolvedPath;
      resolvedAbsolute = path.charCodeAt(0) === 47 /*/*/;
    }

    // At this point the path should be resolved to a full absolute path, but
    // handle relative paths to be safe (might happen when process.cwd() fails)

    // Normalize the path
    resolvedPath = normalizeStringPosix(resolvedPath, !resolvedAbsolute);
    if (resolvedAbsolute) {
      if (resolvedPath.length > 0) return '/' + resolvedPath;else return '/';
    } else if (resolvedPath.length > 0) {
      return resolvedPath;
    } else {
      return '.';
    }
  },
  normalize: function normalize(path) {
    assertPath(path);
    if (path.length === 0) return '.';
    var isAbsolute = path.charCodeAt(0) === 47 /*/*/;
    var trailingSeparator = path.charCodeAt(path.length - 1) === 47 /*/*/;

    // Normalize the path
    path = normalizeStringPosix(path, !isAbsolute);
    if (path.length === 0 && !isAbsolute) path = '.';
    if (path.length > 0 && trailingSeparator) path += '/';
    if (isAbsolute) return '/' + path;
    return path;
  },
  isAbsolute: function isAbsolute(path) {
    assertPath(path);
    return path.length > 0 && path.charCodeAt(0) === 47 /*/*/;
  },
  join: function join() {
    if (arguments.length === 0) return '.';
    var joined;
    for (var i = 0; i < arguments.length; ++i) {
      var arg = arguments[i];
      assertPath(arg);
      if (arg.length > 0) {
        if (joined === undefined) joined = arg;else joined += '/' + arg;
      }
    }
    if (joined === undefined) return '.';
    return posix.normalize(joined);
  },
  relative: function relative(from, to) {
    assertPath(from);
    assertPath(to);
    if (from === to) return '';
    from = posix.resolve(from);
    to = posix.resolve(to);
    if (from === to) return '';

    // Trim any leading backslashes
    var fromStart = 1;
    for (; fromStart < from.length; ++fromStart) {
      if (from.charCodeAt(fromStart) !== 47 /*/*/) break;
    }
    var fromEnd = from.length;
    var fromLen = fromEnd - fromStart;

    // Trim any leading backslashes
    var toStart = 1;
    for (; toStart < to.length; ++toStart) {
      if (to.charCodeAt(toStart) !== 47 /*/*/) break;
    }
    var toEnd = to.length;
    var toLen = toEnd - toStart;

    // Compare paths to find the longest common path from root
    var length = fromLen < toLen ? fromLen : toLen;
    var lastCommonSep = -1;
    var i = 0;
    for (; i <= length; ++i) {
      if (i === length) {
        if (toLen > length) {
          if (to.charCodeAt(toStart + i) === 47 /*/*/) {
            // We get here if `from` is the exact base path for `to`.
            // For example: from='/foo/bar'; to='/foo/bar/baz'
            return to.slice(toStart + i + 1);
          } else if (i === 0) {
            // We get here if `from` is the root
            // For example: from='/'; to='/foo'
            return to.slice(toStart + i);
          }
        } else if (fromLen > length) {
          if (from.charCodeAt(fromStart + i) === 47 /*/*/) {
            // We get here if `to` is the exact base path for `from`.
            // For example: from='/foo/bar/baz'; to='/foo/bar'
            lastCommonSep = i;
          } else if (i === 0) {
            // We get here if `to` is the root.
            // For example: from='/foo'; to='/'
            lastCommonSep = 0;
          }
        }
        break;
      }
      var fromCode = from.charCodeAt(fromStart + i);
      var toCode = to.charCodeAt(toStart + i);
      if (fromCode !== toCode) break;else if (fromCode === 47 /*/*/) lastCommonSep = i;
    }
    var out = '';
    // Generate the relative path based on the path difference between `to`
    // and `from`
    for (i = fromStart + lastCommonSep + 1; i <= fromEnd; ++i) {
      if (i === fromEnd || from.charCodeAt(i) === 47 /*/*/) {
        if (out.length === 0) out += '..';else out += '/..';
      }
    }

    // Lastly, append the rest of the destination (`to`) path that comes after
    // the common path parts
    if (out.length > 0) return out + to.slice(toStart + lastCommonSep);else {
      toStart += lastCommonSep;
      if (to.charCodeAt(toStart) === 47 /*/*/) ++toStart;
      return to.slice(toStart);
    }
  },
  _makeLong: function _makeLong(path) {
    return path;
  },
  dirname: function dirname(path) {
    assertPath(path);
    if (path.length === 0) return '.';
    var code = path.charCodeAt(0);
    var hasRoot = code === 47 /*/*/;
    var end = -1;
    var matchedSlash = true;
    for (var i = path.length - 1; i >= 1; --i) {
      code = path.charCodeAt(i);
      if (code === 47 /*/*/) {
        if (!matchedSlash) {
          end = i;
          break;
        }
      } else {
        // We saw the first non-path separator
        matchedSlash = false;
      }
    }
    if (end === -1) return hasRoot ? '/' : '.';
    if (hasRoot && end === 1) return '//';
    return path.slice(0, end);
  },
  basename: function basename(path, ext) {
    if (ext !== undefined && typeof ext !== 'string') throw new TypeError('"ext" argument must be a string');
    assertPath(path);
    var start = 0;
    var end = -1;
    var matchedSlash = true;
    var i;
    if (ext !== undefined && ext.length > 0 && ext.length <= path.length) {
      if (ext.length === path.length && ext === path) return '';
      var extIdx = ext.length - 1;
      var firstNonSlashEnd = -1;
      for (i = path.length - 1; i >= 0; --i) {
        var code = path.charCodeAt(i);
        if (code === 47 /*/*/) {
          // If we reached a path separator that was not part of a set of path
          // separators at the end of the string, stop now
          if (!matchedSlash) {
            start = i + 1;
            break;
          }
        } else {
          if (firstNonSlashEnd === -1) {
            // We saw the first non-path separator, remember this index in case
            // we need it if the extension ends up not matching
            matchedSlash = false;
            firstNonSlashEnd = i + 1;
          }
          if (extIdx >= 0) {
            // Try to match the explicit extension
            if (code === ext.charCodeAt(extIdx)) {
              if (--extIdx === -1) {
                // We matched the extension, so mark this as the end of our path
                // component
                end = i;
              }
            } else {
              // Extension does not match, so our result is the entire path
              // component
              extIdx = -1;
              end = firstNonSlashEnd;
            }
          }
        }
      }
      if (start === end) end = firstNonSlashEnd;else if (end === -1) end = path.length;
      return path.slice(start, end);
    } else {
      for (i = path.length - 1; i >= 0; --i) {
        if (path.charCodeAt(i) === 47 /*/*/) {
          // If we reached a path separator that was not part of a set of path
          // separators at the end of the string, stop now
          if (!matchedSlash) {
            start = i + 1;
            break;
          }
        } else if (end === -1) {
          // We saw the first non-path separator, mark this as the end of our
          // path component
          matchedSlash = false;
          end = i + 1;
        }
      }
      if (end === -1) return '';
      return path.slice(start, end);
    }
  },
  extname: function extname(path) {
    assertPath(path);
    var startDot = -1;
    var startPart = 0;
    var end = -1;
    var matchedSlash = true;
    // Track the state of characters (if any) we see before our first dot and
    // after any path separator we find
    var preDotState = 0;
    for (var i = path.length - 1; i >= 0; --i) {
      var code = path.charCodeAt(i);
      if (code === 47 /*/*/) {
        // If we reached a path separator that was not part of a set of path
        // separators at the end of the string, stop now
        if (!matchedSlash) {
          startPart = i + 1;
          break;
        }
        continue;
      }
      if (end === -1) {
        // We saw the first non-path separator, mark this as the end of our
        // extension
        matchedSlash = false;
        end = i + 1;
      }
      if (code === 46 /*.*/) {
        // If this is our first dot, mark it as the start of our extension
        if (startDot === -1) startDot = i;else if (preDotState !== 1) preDotState = 1;
      } else if (startDot !== -1) {
        // We saw a non-dot and non-path separator before our dot, so we should
        // have a good chance at having a non-empty extension
        preDotState = -1;
      }
    }
    if (startDot === -1 || end === -1 ||
    // We saw a non-dot character immediately before the dot
    preDotState === 0 ||
    // The (right-most) trimmed path component is exactly '..'
    preDotState === 1 && startDot === end - 1 && startDot === startPart + 1) {
      return '';
    }
    return path.slice(startDot, end);
  },
  format: function format(pathObject) {
    if (pathObject === null || typeof pathObject !== 'object') {
      throw new TypeError('The "pathObject" argument must be of type Object. Received type ' + typeof pathObject);
    }
    return _format('/', pathObject);
  },
  parse: function parse(path) {
    assertPath(path);
    var ret = {
      root: '',
      dir: '',
      base: '',
      ext: '',
      name: ''
    };
    if (path.length === 0) return ret;
    var code = path.charCodeAt(0);
    var isAbsolute = code === 47 /*/*/;
    var start;
    if (isAbsolute) {
      ret.root = '/';
      start = 1;
    } else {
      start = 0;
    }
    var startDot = -1;
    var startPart = 0;
    var end = -1;
    var matchedSlash = true;
    var i = path.length - 1;

    // Track the state of characters (if any) we see before our first dot and
    // after any path separator we find
    var preDotState = 0;

    // Get non-dir info
    for (; i >= start; --i) {
      code = path.charCodeAt(i);
      if (code === 47 /*/*/) {
        // If we reached a path separator that was not part of a set of path
        // separators at the end of the string, stop now
        if (!matchedSlash) {
          startPart = i + 1;
          break;
        }
        continue;
      }
      if (end === -1) {
        // We saw the first non-path separator, mark this as the end of our
        // extension
        matchedSlash = false;
        end = i + 1;
      }
      if (code === 46 /*.*/) {
        // If this is our first dot, mark it as the start of our extension
        if (startDot === -1) startDot = i;else if (preDotState !== 1) preDotState = 1;
      } else if (startDot !== -1) {
        // We saw a non-dot and non-path separator before our dot, so we should
        // have a good chance at having a non-empty extension
        preDotState = -1;
      }
    }
    if (startDot === -1 || end === -1 ||
    // We saw a non-dot character immediately before the dot
    preDotState === 0 ||
    // The (right-most) trimmed path component is exactly '..'
    preDotState === 1 && startDot === end - 1 && startDot === startPart + 1) {
      if (end !== -1) {
        if (startPart === 0 && isAbsolute) ret.base = ret.name = path.slice(1, end);else ret.base = ret.name = path.slice(startPart, end);
      }
    } else {
      if (startPart === 0 && isAbsolute) {
        ret.name = path.slice(1, startDot);
        ret.base = path.slice(1, end);
      } else {
        ret.name = path.slice(startPart, startDot);
        ret.base = path.slice(startPart, end);
      }
      ret.ext = path.slice(startDot, end);
    }
    if (startPart > 0) ret.dir = path.slice(0, startPart - 1);else if (isAbsolute) ret.dir = '/';
    return ret;
  },
  sep: '/',
  delimiter: ':',
  win32: null,
  posix: null
};
posix.posix = posix;
module.exports = posix;

/***/ }),

/***/ "./node_modules/@svta/cml-cmcd/dist/index.js":
/*!***************************************************!*\
  !*** ./node_modules/@svta/cml-cmcd/dist/index.js ***!
  \***************************************************/
/***/ (function(__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   CMCD_DEFAULT_TIME_INTERVAL: function() { return /* binding */ CMCD_DEFAULT_TIME_INTERVAL; },
/* harmony export */   CMCD_EVENT_AD_BREAK_END: function() { return /* binding */ CMCD_EVENT_AD_BREAK_END; },
/* harmony export */   CMCD_EVENT_AD_BREAK_START: function() { return /* binding */ CMCD_EVENT_AD_BREAK_START; },
/* harmony export */   CMCD_EVENT_AD_END: function() { return /* binding */ CMCD_EVENT_AD_END; },
/* harmony export */   CMCD_EVENT_AD_START: function() { return /* binding */ CMCD_EVENT_AD_START; },
/* harmony export */   CMCD_EVENT_BACKGROUNDED_MODE: function() { return /* binding */ CMCD_EVENT_BACKGROUNDED_MODE; },
/* harmony export */   CMCD_EVENT_BITRATE_CHANGE: function() { return /* binding */ CMCD_EVENT_BITRATE_CHANGE; },
/* harmony export */   CMCD_EVENT_CONTENT_ID: function() { return /* binding */ CMCD_EVENT_CONTENT_ID; },
/* harmony export */   CMCD_EVENT_CUSTOM_EVENT: function() { return /* binding */ CMCD_EVENT_CUSTOM_EVENT; },
/* harmony export */   CMCD_EVENT_ERROR: function() { return /* binding */ CMCD_EVENT_ERROR; },
/* harmony export */   CMCD_EVENT_KEYS: function() { return /* binding */ CMCD_EVENT_KEYS; },
/* harmony export */   CMCD_EVENT_MODE: function() { return /* binding */ CMCD_EVENT_MODE; },
/* harmony export */   CMCD_EVENT_MUTE: function() { return /* binding */ CMCD_EVENT_MUTE; },
/* harmony export */   CMCD_EVENT_PLAYER_COLLAPSE: function() { return /* binding */ CMCD_EVENT_PLAYER_COLLAPSE; },
/* harmony export */   CMCD_EVENT_PLAYER_EXPAND: function() { return /* binding */ CMCD_EVENT_PLAYER_EXPAND; },
/* harmony export */   CMCD_EVENT_PLAY_STATE: function() { return /* binding */ CMCD_EVENT_PLAY_STATE; },
/* harmony export */   CMCD_EVENT_RESPONSE_RECEIVED: function() { return /* binding */ CMCD_EVENT_RESPONSE_RECEIVED; },
/* harmony export */   CMCD_EVENT_SKIP: function() { return /* binding */ CMCD_EVENT_SKIP; },
/* harmony export */   CMCD_EVENT_TIME_INTERVAL: function() { return /* binding */ CMCD_EVENT_TIME_INTERVAL; },
/* harmony export */   CMCD_EVENT_UNMUTE: function() { return /* binding */ CMCD_EVENT_UNMUTE; },
/* harmony export */   CMCD_FORMATTER_MAP: function() { return /* binding */ CMCD_FORMATTER_MAP; },
/* harmony export */   CMCD_HEADERS: function() { return /* binding */ CMCD_HEADERS; },
/* harmony export */   CMCD_HEADER_FIELDS: function() { return /* binding */ CMCD_HEADER_FIELDS; },
/* harmony export */   CMCD_HEADER_MAP: function() { return /* binding */ CMCD_HEADER_MAP; },
/* harmony export */   CMCD_JSON: function() { return /* binding */ CMCD_JSON; },
/* harmony export */   CMCD_KEYS: function() { return /* binding */ CMCD_KEYS; },
/* harmony export */   CMCD_MIME_TYPE: function() { return /* binding */ CMCD_MIME_TYPE; },
/* harmony export */   CMCD_OBJECT: function() { return /* binding */ CMCD_OBJECT; },
/* harmony export */   CMCD_PARAM: function() { return /* binding */ CMCD_PARAM; },
/* harmony export */   CMCD_QUERY: function() { return /* binding */ CMCD_QUERY; },
/* harmony export */   CMCD_REQUEST: function() { return /* binding */ CMCD_REQUEST; },
/* harmony export */   CMCD_REQUEST_KEYS: function() { return /* binding */ CMCD_REQUEST_KEYS; },
/* harmony export */   CMCD_REQUEST_MODE: function() { return /* binding */ CMCD_REQUEST_MODE; },
/* harmony export */   CMCD_RESPONSE_KEYS: function() { return /* binding */ CMCD_RESPONSE_KEYS; },
/* harmony export */   CMCD_SESSION: function() { return /* binding */ CMCD_SESSION; },
/* harmony export */   CMCD_STATUS: function() { return /* binding */ CMCD_STATUS; },
/* harmony export */   CMCD_V1: function() { return /* binding */ CMCD_V1; },
/* harmony export */   CMCD_V1_KEYS: function() { return /* binding */ CMCD_V1_KEYS; },
/* harmony export */   CMCD_V2: function() { return /* binding */ CMCD_V2; },
/* harmony export */   CMCD_VALIDATION_SEVERITY_ERROR: function() { return /* binding */ CMCD_VALIDATION_SEVERITY_ERROR; },
/* harmony export */   CMCD_VALIDATION_SEVERITY_WARNING: function() { return /* binding */ CMCD_VALIDATION_SEVERITY_WARNING; },
/* harmony export */   CmcdEventType: function() { return /* binding */ CmcdEventType; },
/* harmony export */   CmcdHeaderField: function() { return /* binding */ CmcdHeaderField; },
/* harmony export */   CmcdObjectType: function() { return /* binding */ CmcdObjectType; },
/* harmony export */   CmcdPlayerState: function() { return /* binding */ CmcdPlayerState; },
/* harmony export */   CmcdReporter: function() { return /* binding */ CmcdReporter; },
/* harmony export */   CmcdReportingMode: function() { return /* binding */ CmcdReportingMode; },
/* harmony export */   CmcdStreamType: function() { return /* binding */ CmcdStreamType; },
/* harmony export */   CmcdStreamingFormat: function() { return /* binding */ CmcdStreamingFormat; },
/* harmony export */   CmcdTransmissionMode: function() { return /* binding */ CmcdTransmissionMode; },
/* harmony export */   CmcdValidationSeverity: function() { return /* binding */ CmcdValidationSeverity; },
/* harmony export */   appendCmcdHeaders: function() { return /* binding */ appendCmcdHeaders; },
/* harmony export */   appendCmcdQuery: function() { return /* binding */ appendCmcdQuery; },
/* harmony export */   decodeCmcd: function() { return /* binding */ decodeCmcd; },
/* harmony export */   encodeCmcd: function() { return /* binding */ encodeCmcd; },
/* harmony export */   fromCmcdHeaders: function() { return /* binding */ fromCmcdHeaders; },
/* harmony export */   fromCmcdQuery: function() { return /* binding */ fromCmcdQuery; },
/* harmony export */   fromCmcdUrl: function() { return /* binding */ fromCmcdUrl; },
/* harmony export */   groupCmcdHeaders: function() { return /* binding */ groupCmcdHeaders; },
/* harmony export */   isCmcdCustomKey: function() { return /* binding */ isCmcdCustomKey; },
/* harmony export */   isCmcdEventKey: function() { return /* binding */ isCmcdEventKey; },
/* harmony export */   isCmcdRequestKey: function() { return /* binding */ isCmcdRequestKey; },
/* harmony export */   isCmcdResponseReceivedKey: function() { return /* binding */ isCmcdResponseReceivedKey; },
/* harmony export */   isCmcdV1Data: function() { return /* binding */ isCmcdV1Data; },
/* harmony export */   isCmcdV1Key: function() { return /* binding */ isCmcdV1Key; },
/* harmony export */   isCmcdV2Data: function() { return /* binding */ isCmcdV2Data; },
/* harmony export */   prepareCmcdData: function() { return /* binding */ prepareCmcdData; },
/* harmony export */   toCmcdHeaders: function() { return /* binding */ toCmcdHeaders; },
/* harmony export */   toCmcdQuery: function() { return /* binding */ toCmcdQuery; },
/* harmony export */   toCmcdUrl: function() { return /* binding */ toCmcdUrl; },
/* harmony export */   toCmcdValue: function() { return /* binding */ toCmcdValue; },
/* harmony export */   validateCmcd: function() { return /* binding */ validateCmcd; },
/* harmony export */   validateCmcdEventReport: function() { return /* binding */ validateCmcdEventReport; },
/* harmony export */   validateCmcdEvents: function() { return /* binding */ validateCmcdEvents; },
/* harmony export */   validateCmcdHeaders: function() { return /* binding */ validateCmcdHeaders; },
/* harmony export */   validateCmcdKeys: function() { return /* binding */ validateCmcdKeys; },
/* harmony export */   validateCmcdRequest: function() { return /* binding */ validateCmcdRequest; },
/* harmony export */   validateCmcdStructure: function() { return /* binding */ validateCmcdStructure; },
/* harmony export */   validateCmcdValues: function() { return /* binding */ validateCmcdValues; }
/* harmony export */ });
/* harmony import */ var _svta_cml_structured_field_values__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @svta/cml-structured-field-values */ "./node_modules/@svta/cml-structured-field-values/dist/index.js");
/* harmony import */ var _svta_cml_utils__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @svta/cml-utils */ "./node_modules/@svta/cml-utils/dist/index.js");



//#region src/CMCD_FORMATTER_MAP.ts
const roundValue = value => {
  if (value instanceof _svta_cml_structured_field_values__WEBPACK_IMPORTED_MODULE_0__.SfItem) return new _svta_cml_structured_field_values__WEBPACK_IMPORTED_MODULE_0__.SfItem(Math.round(value.value), value.params);
  return Math.round(value);
};
const toRounded = value => {
  if (Array.isArray(value)) return value.map(roundValue);
  return roundValue(value);
};
const toUrlSafe = (value, options) => {
  if (Array.isArray(value)) return value.map(item => toUrlSafe(item, options));
  if (value instanceof _svta_cml_structured_field_values__WEBPACK_IMPORTED_MODULE_0__.SfItem && typeof value.value === "string") return new _svta_cml_structured_field_values__WEBPACK_IMPORTED_MODULE_0__.SfItem(toUrlSafe(value.value, options), value.params);else {
    if (options.baseUrl) value = (0,_svta_cml_utils__WEBPACK_IMPORTED_MODULE_1__.urlToRelativePath)(value, (0,_svta_cml_utils__WEBPACK_IMPORTED_MODULE_1__.getBaseUrl)(options.baseUrl));
    return options.version === 1 ? encodeURIComponent(value) : value;
  }
};
const hundredValue = value => {
  if (value instanceof _svta_cml_structured_field_values__WEBPACK_IMPORTED_MODULE_0__.SfItem) return new _svta_cml_structured_field_values__WEBPACK_IMPORTED_MODULE_0__.SfItem(Math.round(value.value / 100) * 100, value.params);
  return Math.round(value / 100) * 100;
};
const toHundred = value => {
  if (Array.isArray(value)) return value.map(hundredValue);
  return hundredValue(value);
};
const nor = (value, options) => {
  let norValue = value;
  if (options.version >= 2) {
    if (value instanceof _svta_cml_structured_field_values__WEBPACK_IMPORTED_MODULE_0__.SfItem && typeof value.value === "string") norValue = new _svta_cml_structured_field_values__WEBPACK_IMPORTED_MODULE_0__.SfItem([value]);else if (typeof value === "string") norValue = [value];
  }
  return toUrlSafe(norValue, options);
};
/**
* The default formatters for CMCD values.
*
* @public
*/
const CMCD_FORMATTER_MAP = {
  br: toRounded,
  d: toRounded,
  bl: toHundred,
  dl: toHundred,
  mtp: toHundred,
  nor,
  rtp: toHundred,
  tb: toRounded
};

//#endregion
//#region src/CMCD_V2.ts
/**
* CMCD Version 2
*
* @public
*/
const CMCD_V2 = 2;

//#endregion
//#region src/CmcdEventType.ts
/**
* CMCD event type for the 'bc' key (bitrate change).
*
* @public
*/
const CMCD_EVENT_BITRATE_CHANGE = "bc";
/**
* CMCD event type for the 'ps' key (play state change).
*
* @public
*/
const CMCD_EVENT_PLAY_STATE = "ps";
/**
* CMCD event type for the 'e' key (error).
*
* @public
*/
const CMCD_EVENT_ERROR = "e";
/**
* CMCD event type for the 't' key (time interval).
*
* @public
*/
const CMCD_EVENT_TIME_INTERVAL = "t";
/**
* CMCD event type for the 'c' key (content ID).
*
* @public
*/
const CMCD_EVENT_CONTENT_ID = "c";
/**
* CMCD event type for the 'b' key (backgrounded mode).
*
* @public
*/
const CMCD_EVENT_BACKGROUNDED_MODE = "b";
/**
* CMCD event type for the 'm' key (mute).
*
* @public
*/
const CMCD_EVENT_MUTE = "m";
/**
* CMCD event type for the 'um' key (unmute).
*
* @public
*/
const CMCD_EVENT_UNMUTE = "um";
/**
* CMCD event type for the 'pe' key (player expand).
*
* @public
*/
const CMCD_EVENT_PLAYER_EXPAND = "pe";
/**
* CMCD event type for the 'pc' key (player collapse).
*
* @public
*/
const CMCD_EVENT_PLAYER_COLLAPSE = "pc";
/**
* CMCD event type for the 'rr' key (response received).
*
* @public
*/
const CMCD_EVENT_RESPONSE_RECEIVED = "rr";
/**
* CMCD event type for the 'as' key (ad start).
*
* @public
*/
const CMCD_EVENT_AD_START = "as";
/**
* CMCD event type for the 'ae' key (ad end).
*
* @public
*/
const CMCD_EVENT_AD_END = "ae";
/**
* CMCD event type for the 'abs' key (ad break start).
*
* @public
*/
const CMCD_EVENT_AD_BREAK_START = "abs";
/**
* CMCD event type for the 'abe' key (ad break end).
*
* @public
*/
const CMCD_EVENT_AD_BREAK_END = "abe";
/**
* CMCD event type for the 'sk' key (skip).
*
* @public
*/
const CMCD_EVENT_SKIP = "sk";
/**
* CMCD event type for the 'ce' key (custom event).
*
* @public
*/
const CMCD_EVENT_CUSTOM_EVENT = "ce";
/**
* CMCD event types for the 'e' key (event mode).
*
* @enum
*
* @see {@link https://cta-wave.github.io/Resources/common-media-client-data--cta-5004-b.html#event | CTA-5004-B Event}
*
* @public
*/
const CmcdEventType = {
  BITRATE_CHANGE: CMCD_EVENT_BITRATE_CHANGE,
  PLAY_STATE: CMCD_EVENT_PLAY_STATE,
  ERROR: CMCD_EVENT_ERROR,
  TIME_INTERVAL: CMCD_EVENT_TIME_INTERVAL,
  CONTENT_ID: CMCD_EVENT_CONTENT_ID,
  BACKGROUNDED_MODE: CMCD_EVENT_BACKGROUNDED_MODE,
  MUTE: CMCD_EVENT_MUTE,
  UNMUTE: CMCD_EVENT_UNMUTE,
  PLAYER_EXPAND: CMCD_EVENT_PLAYER_EXPAND,
  PLAYER_COLLAPSE: CMCD_EVENT_PLAYER_COLLAPSE,
  RESPONSE_RECEIVED: CMCD_EVENT_RESPONSE_RECEIVED,
  AD_START: CMCD_EVENT_AD_START,
  AD_END: CMCD_EVENT_AD_END,
  AD_BREAK_START: CMCD_EVENT_AD_BREAK_START,
  AD_BREAK_END: CMCD_EVENT_AD_BREAK_END,
  SKIP: CMCD_EVENT_SKIP,
  CUSTOM_EVENT: CMCD_EVENT_CUSTOM_EVENT
};

//#endregion
//#region src/CmcdReportingMode.ts
/**
* CMCD event mode variable name.
*
* @public
*/
const CMCD_EVENT_MODE = "event";
/**
* CMCD request mode variable name.
*
* @public
*/
const CMCD_REQUEST_MODE = "request";
/**
* CMCD reporting mode types.
*
* @enum
*
* @public
*/
const CmcdReportingMode = {
  REQUEST: CMCD_REQUEST_MODE,
  EVENT: CMCD_EVENT_MODE
};

//#endregion
//#region src/CMCD_EVENT_KEYS.ts
/**
* Defines the event-specific keys for CMCD (Common Media Client Data) version 2.
*
* @public
*/
const CMCD_EVENT_KEYS = ["cen", "e", "h", "ts"];

//#endregion
//#region src/CMCD_REQUEST_KEYS.ts
/**
* Defines the request-specific keys for CMCD (Common Media Client Data) version 2.
*
* @public
*/
const CMCD_REQUEST_KEYS = ["ab", "bg", "bl", "br", "bs", "bsa", "bsd", "bsda", "cdn", "cid", "cs", "d", "dfa", "dl", "ec", "lab", "lb", "ltc", "msd", "mtp", "nor", "nr", "ot", "pb", "pr", "pt", "rtp", "sf", "sid", "sn", "st", "sta", "su", "tab", "tb", "tbl", "tpb", "v"];

//#endregion
//#region src/isCmcdCustomKey.ts
const CUSTOM_KEY_REGEX = /^[a-zA-Z0-9-.]+-[a-zA-Z0-9-.]+$/;
/**
* Check if a key is a custom key.
*
* @param key - The key to check.
*
* @returns `true` if the key is a custom key, `false` otherwise.
*
* @public
*/
function isCmcdCustomKey(key) {
  return CUSTOM_KEY_REGEX.test(key);
}

//#endregion
//#region src/isCmcdRequestKey.ts
const CMCD_REQUEST_KEY_SET = new Set(CMCD_REQUEST_KEYS);
/**
* Check if a key is a valid CMCD request key.
*
* @param key - The key to check.
*
* @returns `true` if the key is a valid CMCD request key, `false` otherwise.
*
* @public
*
* @example
* {@includeCode ../test/isCmcdRequestKey.test.ts#example}
*/
function isCmcdRequestKey(key) {
  return CMCD_REQUEST_KEY_SET.has(key) || isCmcdCustomKey(key);
}

//#endregion
//#region src/CMCD_RESPONSE_KEYS.ts
/**
* CMCD v2 - Response-only and timing keys.
*
* @public
*/
const CMCD_RESPONSE_KEYS = ["cmsdd", "cmsds", "rc", "smrt", "ttfb", "ttfbb", "ttlb", "url"];

//#endregion
//#region src/isCmcdResponseReceivedKey.ts
const CMCD_RESPONSE_KEY_SET = new Set(CMCD_RESPONSE_KEYS);
/**
* Check if a key is a valid CMCD response key.
*
* @param key - The key to check.
*
* @returns `true` if the key is a valid CMCD request key, `false` otherwise.
*
* @public
*
* @example
* {@includeCode ../test/isCmcdResponseReceivedKey.test.ts#example}
*/
function isCmcdResponseReceivedKey(key) {
  return CMCD_RESPONSE_KEY_SET.has(key);
}

//#endregion
//#region src/isCmcdEventKey.ts
const CMCD_EVENT_KEY_SET = new Set(CMCD_EVENT_KEYS);
/**
* Check if a key is a valid CMCD event key.
*
* @param key - The key to check.
*
* @returns `true` if the key is a valid CMCD event key, `false` otherwise.
*
* @public
*
* @example
* {@includeCode ../test/isCmcdEventKey.test.ts#example}
*/
function isCmcdEventKey(key) {
  return isCmcdRequestKey(key) || isCmcdResponseReceivedKey(key) || CMCD_EVENT_KEY_SET.has(key);
}

//#endregion
//#region src/CMCD_INNER_LIST_KEYS.ts
/**
* Keys that are inner lists in V2 but plain scalars in V1.
*
* Used by both encoding (down-conversion) and decoding (up-conversion).
*
* @internal
*/
const CMCD_INNER_LIST_KEYS = new Set(["ab", "bl", "br", "bsa", "bsd", "bsda", "lab", "lb", "mtp", "pb", "tab", "tb", "tbl", "tpb"]);

//#endregion
//#region src/CMCD_V1_KEYS.ts
/**
* Defines the keys for CMCD (Common Media Client Data) version 1.
*
* @public
*/
const CMCD_V1_KEYS = ["bl", "br", "bs", "cid", "d", "dl", "mtp", "nor", "nrr", "ot", "pr", "rtp", "sf", "sid", "st", "su", "tb", "v"];

//#endregion
//#region src/isCmcdV1Key.ts
const CMCD_V1_KEY_SET$1 = new Set(CMCD_V1_KEYS);
/**
* Filter function for CMCD v1 keys.
*
* @param key - The CMCD key to filter.
*
* @returns `true` if the key should be included, `false` otherwise.
*
* @public
*
* @example
* {@includeCode ../test/isCmcdV1Key.test.ts#example}
*/
function isCmcdV1Key(key) {
  return CMCD_V1_KEY_SET$1.has(key) || isCmcdCustomKey(key);
}

//#endregion
//#region src/isTokenField.ts
const TOKEN_FIELDS = new Set(["ot", "sf", "st", "e", "sta"]);
/**
* Checks if the given key is a token field.
*
* @param key - The key to check.
*
* @returns `true` if the key is a token field.
*
* @internal
*/
function isTokenField(key) {
  return TOKEN_FIELDS.has(key);
}

//#endregion
//#region src/isValid.ts
/**
* Checks if the given value is valid
*
* @param value - The value to check.
*
* @returns `true` if the key is a value is valid.
*
* @internal
*/
function isValid(value) {
  if (typeof value === "number") return Number.isFinite(value);
  return value != null && value !== "" && value !== false;
}

//#endregion
//#region src/prepareCmcdData.ts
const filterMap = {
  [CMCD_EVENT_MODE]: isCmcdEventKey,
  [CMCD_REQUEST_MODE]: isCmcdRequestKey
};
/**
* Unwrap an inner list or SfItem value to a plain scalar.
*/
function unwrapValue(value, ot) {
  if (Array.isArray(value)) {
    let item;
    if (ot) item = value.find(item$1 => item$1.params?.ot === ot);
    if (!item) item = value[0];
    return unwrapValue(item);
  }
  if (value instanceof _svta_cml_structured_field_values__WEBPACK_IMPORTED_MODULE_0__.SfItem) return value.value;
  return value;
}
/**
* Down-convert V2 CMCD data to V1 format.
*
* - Extracts `nrr` from `nor` SfItem `r` parameter.
* - Unwraps inner-list values to plain scalars.
*/
function downConvertToV1(obj) {
  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value == null) {
      result[key] = value;
      continue;
    }
    if (key === "nor") {
      const first = (Array.isArray(value) ? value : [value])[0];
      if (first instanceof _svta_cml_structured_field_values__WEBPACK_IMPORTED_MODULE_0__.SfItem) {
        result["nor"] = first.value;
        if (first.params?.r) result["nrr"] = first.params.r;
      } else result["nor"] = first;
    } else if (CMCD_INNER_LIST_KEYS.has(key)) result[key] = unwrapValue(value, obj["ot"]);else result[key] = value;
  }
  return result;
}
/**
* Convert a generic object to CMCD data.
*
* @param obj - The CMCD object to process.
* @param options - Options for encoding.
*
* @public
*/
function prepareCmcdData(obj, options = {}) {
  const results = {};
  if (obj == null || typeof obj !== "object") return results;
  const version = options.version || obj["v"] || CMCD_V2;
  const reportingMode = options.reportingMode || CMCD_REQUEST_MODE;
  const data = version === 1 ? downConvertToV1(obj) : obj;
  const keyFilter = version === 1 ? isCmcdV1Key : filterMap[reportingMode];
  let keys = Object.keys(data).filter(keyFilter);
  if (data["e"] && data["e"] !== CMCD_EVENT_RESPONSE_RECEIVED) keys = keys.filter(key => !isCmcdResponseReceivedKey(key));
  const filter = options.filter;
  if (typeof filter === "function") keys = keys.filter(filter);
  const isEventMode = reportingMode === CMCD_EVENT_MODE;
  if (isEventMode) {
    const eventType = data["e"];
    if (!keys.includes("e") && eventType != null) keys.push("e");
    if (!keys.includes("ts")) keys.push("ts");
    if (!keys.includes("cen") && data["cen"] != null && eventType === CMCD_EVENT_CUSTOM_EVENT) keys.push("cen");
  }
  if (keys.length === 0) return results;
  if (version > 1 && !keys.includes("v")) keys.push("v");
  const formatterOptions = {
    version,
    reportingMode,
    baseUrl: options.baseUrl
  };
  keys.sort();
  for (const key of keys) {
    let value = data[key];
    const formatter = options.formatters?.[key] ?? CMCD_FORMATTER_MAP[key];
    if (typeof formatter === "function") value = formatter(value, formatterOptions);
    if (key === "v") if (version === 1) continue;else value = version;
    if (key === "pr" && value === 1) continue;
    if (isEventMode && key === "ts" && !Number.isFinite(value)) value = Date.now();
    if (!isValid(value)) continue;
    if (isTokenField(key) && typeof value === "string") value = new _svta_cml_structured_field_values__WEBPACK_IMPORTED_MODULE_0__.SfToken(value);
    results[key] = value;
  }
  return results;
}

//#endregion
//#region src/CmcdHeaderField.ts
/**
* CMCD object header name.
*
* @public
*/
const CMCD_OBJECT = "CMCD-Object";
/**
* CMCD request header name.
*
* @public
*/
const CMCD_REQUEST = "CMCD-Request";
/**
* CMCD session header name.
*
* @public
*/
const CMCD_SESSION = "CMCD-Session";
/**
* CMCD status header name.
*
* @public
*/
const CMCD_STATUS = "CMCD-Status";
/**
* CMCD header fields.
*
*
* @enum
*
* @public
*/
const CmcdHeaderField = {
  OBJECT: CMCD_OBJECT,
  REQUEST: CMCD_REQUEST,
  SESSION: CMCD_SESSION,
  STATUS: CMCD_STATUS
};
/**
* All CMCD header fields as an array.
*
* @public
*/
const CMCD_HEADER_FIELDS = [CMCD_OBJECT, CMCD_REQUEST, CMCD_SESSION, CMCD_STATUS];

//#endregion
//#region src/CMCD_HEADER_MAP.ts
/**
* The map of CMCD keys to their appropriate header shard.
*
* Note: Event-only keys (e, ts, cen, h) and response-received keys
* (rc, ttfb, ttlb, url, etc.) are intentionally absent. They are
* transmitted via the event-mode POST body, not HTTP headers.
*
* @public
*/
const CMCD_HEADER_MAP = {
  ab: CMCD_OBJECT,
  br: CMCD_OBJECT,
  d: CMCD_OBJECT,
  lab: CMCD_OBJECT,
  lb: CMCD_OBJECT,
  ot: CMCD_OBJECT,
  tab: CMCD_OBJECT,
  tb: CMCD_OBJECT,
  tpb: CMCD_OBJECT,
  bl: CMCD_REQUEST,
  cs: CMCD_REQUEST,
  dfa: CMCD_REQUEST,
  dl: CMCD_REQUEST,
  ltc: CMCD_REQUEST,
  mtp: CMCD_REQUEST,
  nor: CMCD_REQUEST,
  nrr: CMCD_REQUEST,
  pb: CMCD_REQUEST,
  sn: CMCD_REQUEST,
  sta: CMCD_REQUEST,
  su: CMCD_REQUEST,
  tbl: CMCD_REQUEST,
  cid: CMCD_SESSION,
  msd: CMCD_SESSION,
  sf: CMCD_SESSION,
  sid: CMCD_SESSION,
  st: CMCD_SESSION,
  v: CMCD_SESSION,
  bg: CMCD_STATUS,
  bs: CMCD_STATUS,
  bsa: CMCD_STATUS,
  bsd: CMCD_STATUS,
  bsda: CMCD_STATUS,
  cdn: CMCD_STATUS,
  ec: CMCD_STATUS,
  nr: CMCD_STATUS,
  pr: CMCD_STATUS,
  pt: CMCD_STATUS,
  rtp: CMCD_STATUS
};

//#endregion
//#region src/groupCmcdHeaders.ts
function createHeaderMap(headerMap) {
  return Object.keys(headerMap).reduce((acc, field) => {
    headerMap[field]?.forEach(key => acc[key] = field);
    return acc;
  }, {});
}
/**
* Group a CMCD data object into header shards
*
* @param cmcd - The CMCD data object to convert.
* @param customHeaderMap - A map of CMCD header fields to custom CMCD keys.
*
* @returns The CMCD header shards.
*
* @see {@link https://cta-wave.github.io/Resources/common-media-client-data--cta-5004-b.html#header-field-definition | CTA-5004-B Header Field Definition}
*
* @public
*/
function groupCmcdHeaders(cmcd, customHeaderMap) {
  const result = {};
  if (!cmcd) return result;
  const keys = Object.keys(cmcd);
  const custom = customHeaderMap ? createHeaderMap(customHeaderMap) : {};
  for (const key of keys) {
    const field = CMCD_HEADER_MAP[key] || custom[key] || CmcdHeaderField.REQUEST;
    const data = result[field] ??= {};
    data[key] = cmcd[key];
  }
  return result;
}

//#endregion
//#region src/toPreparedCmcdHeaders.ts
/**
* Encode already-prepared CMCD data to CMCD header shards.
*
* @param data - The prepared CMCD data to encode.
* @param customHeaderMap - A map of CMCD header fields to custom CMCD keys.
* @returns The CMCD header shards.
*
* @internal
*/
function toPreparedCmcdHeaders(data, customHeaderMap) {
  const result = {};
  const shards = groupCmcdHeaders(data, customHeaderMap);
  for (const [field, value] of Object.entries(shards)) {
    const shard = (0,_svta_cml_structured_field_values__WEBPACK_IMPORTED_MODULE_0__.encodeSfDict)(value, {
      whitespace: false
    });
    if (shard) result[field] = shard;
  }
  return result;
}

//#endregion
//#region src/toCmcdHeaders.ts
/**
* Convert a CMCD data object to request headers
*
* @param cmcd - The CMCD data object to convert.
* @param options - Options for encoding the CMCD object.
*
* @returns The CMCD header shards.
*
* @see {@link https://cta-wave.github.io/Resources/common-media-client-data--cta-5004-b.html#header-field-definition | CTA-5004-B Header Field Definition}
*
* @public
*
* @example
* {@includeCode ../test/toCmcdHeaders.test.ts#example}
*/
function toCmcdHeaders(cmcd, options = {}) {
  if (!cmcd) return {};
  return toPreparedCmcdHeaders(prepareCmcdData(cmcd, options), options?.customHeaderMap);
}

//#endregion
//#region src/appendCmcdHeaders.ts
/**
* Append CMCD query args to a header object.
*
* @param headers - The headers to append to.
* @param cmcd - The CMCD object to append.
* @param options - Encode options.
*
* @returns The headers with the CMCD header shards appended.
*
* @public
*
* @example
* {@includeCode ../test/appendCmcdHeaders.test.ts#example}
*
* @see {@link https://cta-wave.github.io/Resources/common-media-client-data--cta-5004-b.html#header-field-definition | CTA-5004-B Header Field Definition}
*/
function appendCmcdHeaders(headers, cmcd, options) {
  return Object.assign(headers, toCmcdHeaders(cmcd, options));
}

//#endregion
//#region src/CMCD_PARAM.ts
/**
* CMCD parameter name.
*
* @public
*/
const CMCD_PARAM = "CMCD";

//#endregion
//#region src/encodePreparedCmcd.ts
/**
* Encode already-prepared CMCD data to a structured field dictionary string.
*
* @param data - The prepared CMCD data to encode.
* @returns The encoded CMCD string.
*
* @internal
*/
function encodePreparedCmcd(data) {
  return (0,_svta_cml_structured_field_values__WEBPACK_IMPORTED_MODULE_0__.encodeSfDict)(data, {
    whitespace: false
  });
}

//#endregion
//#region src/encodeCmcd.ts
/**
* Encode a CMCD object to a string.
*
* @param cmcd - The CMCD object to encode.
* @param options - Options for encoding.
*
* @returns The encoded CMCD string.
*
* @see {@link https://cta-wave.github.io/Resources/common-media-client-data--cta-5004-b.html#payload-definition-for-headers-and-query-argument-transmission | CTA-5004-B Payload Definition}
*
* @public
*
* @example
* {@includeCode ../test/encodeCmcd.test.ts#example}
*/
function encodeCmcd(cmcd, options = {}) {
  if (!cmcd) return "";
  return encodePreparedCmcd(prepareCmcdData(cmcd, options));
}

//#endregion
//#region src/toCmcdUrl.ts
/**
* Convert a CMCD data object to a URL encoded string.
*
* @param cmcd - The CMCD object to convert.
* @param options - Options for encoding the CMCD object.
*
* @returns The URL encoded CMCD data.
*
* @see {@link https://cta-wave.github.io/Resources/common-media-client-data--cta-5004-b.html#query-argument-definition | CTA-5004-B Query Argument Definition}
*
* @public
*/
function toCmcdUrl(cmcd, options = {}) {
  if (!cmcd) return "";
  const params = encodeCmcd(cmcd, options);
  return encodeURIComponent(params);
}

//#endregion
//#region src/toCmcdQuery.ts
/**
* Convert a CMCD data object to a query arg.
*
* @param cmcd - The CMCD object to convert.
* @param options - Options for encoding the CMCD object.
*
* @returns The CMCD query arg.
*
* @see {@link https://cta-wave.github.io/Resources/common-media-client-data--cta-5004-b.html#query-argument-definition | CTA-5004-B Query Argument Definition}
*
* @public
*
* @example
* {@includeCode ../test/toCmcdQuery.test.ts#example}
*/
function toCmcdQuery(cmcd, options = {}) {
  if (!cmcd) return "";
  return `${CMCD_PARAM}=${toCmcdUrl(cmcd, options)}`;
}

//#endregion
//#region src/appendCmcdQuery.ts
const REGEX = /CMCD=[^&#]+/;
/**
* Append CMCD query args to a URL.
*
* @param url - The URL to append to.
* @param cmcd - The CMCD object to append.
* @param options - Options for encoding the CMCD object.
*
* @returns The URL with the CMCD query args appended.
*
* @public
*
* @example
* {@includeCode ../test/appendCmcdQuery.test.ts#example}
*
* @see {@link https://cta-wave.github.io/Resources/common-media-client-data--cta-5004-b.html#query-argument-definition | CTA-5004-B Query Argument Definition}
*/
function appendCmcdQuery(url, cmcd, options) {
  const query = toCmcdQuery(cmcd, options);
  if (!query) return url;
  if (REGEX.test(url)) return url.replace(REGEX, query);
  return `${url}${url.includes("?") ? "&" : "?"}${query}`;
}

//#endregion
//#region src/CMCD_DEFAULT_TIME_INTERVAL.ts
/**
* The default time interval in seconds when using using event mode
*
* @public
*/
const CMCD_DEFAULT_TIME_INTERVAL = 30;

//#endregion
//#region src/CMCD_KEYS.ts
/**
* A list of all CMCD keys.
*
* @public
*/
const CMCD_KEYS = [...CMCD_V1_KEYS, ...CMCD_REQUEST_KEYS, ...CMCD_RESPONSE_KEYS, ...CMCD_EVENT_KEYS].filter((key, index, arr) => arr.indexOf(key) === index);

//#endregion
//#region src/CMCD_MIME_TYPE.ts
/**
* CMCD MIME type for event report payloads.
*
* @public
*/
const CMCD_MIME_TYPE = "application/cmcd";

//#endregion
//#region src/CMCD_V1.ts
/**
* CMCD Version 1
*
* @public
*/
const CMCD_V1 = 1;

//#endregion
//#region src/CmcdObjectType.ts
/**
* Common Media Client Data Object Type
*
* @public
*
* @enum
*
* @see {@link https://cta-wave.github.io/Resources/common-media-client-data--cta-5004-b.html#object-type | CTA-5004-B Object Type}
*/
const CmcdObjectType = {
  MANIFEST: "m",
  AUDIO: "a",
  VIDEO: "v",
  MUXED: "av",
  INIT: "i",
  CAPTION: "c",
  TIMED_TEXT: "tt",
  KEY: "k",
  OTHER: "o"
};

//#endregion
//#region src/CmcdPlayerState.ts
/**
* CMCD v2 player states for the 'sta' key.
*
*
* @enum
*
* @public
*
* @see {@link https://cta-wave.github.io/Resources/common-media-client-data--cta-5004-b.html#state | CTA-5004-B State}
*/
const CmcdPlayerState = {
  STARTING: "s",
  PLAYING: "p",
  SEEKING: "k",
  REBUFFERING: "r",
  PAUSED: "a",
  WAITING: "w",
  ENDED: "e",
  FATAL_ERROR: "f",
  QUIT: "q",
  PRELOADING: "d"
};

//#endregion
//#region src/CmcdTransmissionMode.ts
/**
* CMCD `query` transmission mode.
*
* @public
*/
const CMCD_QUERY = "query";
/**
* CMCD `headers` transmission mode.
*
* @public
*/
const CMCD_HEADERS = "headers";
/**
* CMCD `json` transmission mode.
*
* @public
*
* @deprecated JSON transmission mode is deprecated and will be removed in future versions.
*/
const CMCD_JSON = "json";
/**
* CMCD transmission modes.
*
* @enum
*
* @public
*/
const CmcdTransmissionMode = {
  JSON: CMCD_JSON,
  QUERY: CMCD_QUERY,
  HEADERS: CMCD_HEADERS
};

//#endregion
//#region src/CmcdReporter.ts
function createEncodingOptions(reportingMode, config, baseUrl) {
  const enabledKeySet = new Set(config.enabledKeys ?? []);
  return {
    version: config.version || CMCD_V2,
    reportingMode,
    filter: key => enabledKeySet.has(key),
    baseUrl
  };
}
function defaultRequester(request) {
  const {
    url,
    ...init
  } = request;
  return fetch(url, init);
}
function createCmcdReporterConfig(config) {
  const {
    version = CMCD_V2,
    eventTargets = [],
    sid = (0,_svta_cml_utils__WEBPACK_IMPORTED_MODULE_1__.uuid)(),
    transmissionMode = CMCD_QUERY,
    ...rest
  } = config;
  return {
    ...rest,
    version,
    transmissionMode,
    sid,
    eventTargets: eventTargets.reduce((acc, target) => {
      if (target?.url && target.events?.length) acc.push({
        version: target.version || CMCD_V2,
        enabledKeys: target.enabledKeys?.slice() || [],
        url: target.url,
        events: target.events.slice(),
        interval: target.interval ?? CMCD_DEFAULT_TIME_INTERVAL,
        batchSize: target.batchSize || 1
      });
      return acc;
    }, [])
  };
}
/**
* The CMCD reporter.
*
* @see {@link https://cta-wave.github.io/Resources/common-media-client-data--cta-5004-b.html#reporting-modes-when-we-send-data | CTA-5004-B Reporting Modes}
*
* @public
*/
var CmcdReporter = class {
  /**
  * Creates a new CMCD reporter.
  *
  * @param config - The configuration for the CMCD reporter.
  * @param requester - The function to use to send the request.
  *                    The default is a simple wrapper around the
  *                    native `fetch` API.
  */
  constructor(config, requester = defaultRequester) {
    this.timeOrigin = performance.timeOrigin || performance.timing?.fetchStart || Date.now() - performance.now();
    this.data = {};
    this.msd = NaN;
    this.eventTargets = /* @__PURE__ */new Map();
    this.requestTarget = {
      sn: 0,
      msdSent: false
    };
    this.config = createCmcdReporterConfig(config);
    this.data = {
      cid: this.config.cid,
      sid: this.config.sid,
      v: this.config.version
    };
    this.requester = requester;
    for (const target of this.config.eventTargets) this.eventTargets.set(target, {
      intervalId: void 0,
      sn: 0,
      msdSent: false,
      queue: []
    });
  }
  /**
  * Starts the CMCD reporter. Called by the player when the reporter is enabled.
  *
  * Note: This fires an initial time-interval event immediately (synchronously)
  * before the first interval elapses. Ensure CMCD data (sid, cid, etc.) is
  * populated before calling start().
  */
  start() {
    this.eventTargets.forEach((target, config) => {
      this.disarmInterval(target);
      if (config.interval === 0 || !config.events.includes(CmcdEventType.TIME_INTERVAL)) return;
      const timeIntervalEvent = () => {
        this.recordTargetEvent(target, config, CMCD_EVENT_TIME_INTERVAL);
        this.processEventTargets();
      };
      target.intervalId = setInterval(timeIntervalEvent, config.interval * 1e3);
      timeIntervalEvent();
    });
  }
  /**
  * Stops the CMCD reporter. Called by the player when the reporter is disabled.
  *
  * @param flush - Whether to flush the event targets.
  */
  stop(flush = false) {
    if (flush) this.flush();
    this.eventTargets.forEach(target => {
      this.disarmInterval(target);
    });
  }
  /**
  * Forces the sending of all event reports, regardless of the batch size or interval.
  * Useful for sending outstanding reports when the player is destroyed or a playback
  * session ends.
  */
  flush() {
    this.processEventTargets(true);
  }
  /**
  * Updates the CMCD data. Called by the player when the data changes.
  *
  * @param data - The data to update.
  */
  update(data) {
    if (data.sid && data.sid !== this.data.sid) this.resetSession();
    if (data.msd && !isNaN(data.msd)) this.msd = data.msd;
    this.data = {
      ...this.data,
      ...data,
      msd: void 0
    };
  }
  /**
  * Records an event. Called by the player when an event occurs.
  *
  * @param type - The type of event to record.
  * @param data - Additional data to record with the event. This data
  *               only applies to this event report. Persistent data should
  *               be updated using `update()`.
  */
  recordEvent(type, data = {}) {
    this.eventTargets.forEach((target, config) => {
      this.recordTargetEvent(target, config, type, data);
    });
    this.processEventTargets();
  }
  /**
  * Records an event for a target. Called by the reporter when an event occurs.
  *
  * @param target - The target to record the event for.
  * @param config - The configuration for the target.
  * @param type - The type of event to record.
  * @param data - Additional data to record with the event. This data
  *               only applies to this event report. Persistent data should
  *               be updated using `update()`.
  */
  recordTargetEvent(target, config, type, data = {}) {
    if (!config.events.includes(type)) return;
    const item = {
      ...this.data,
      ...data,
      e: type,
      ts: data.ts ?? Date.now(),
      sn: target.sn++
    };
    if (!isNaN(this.msd) && !target.msdSent) {
      item.msd = this.msd;
      target.msdSent = true;
    }
    target.queue.push(item);
  }
  /**
  * Records a response-received event. Called by the player when a media
  * request response has been fully received.
  *
  * This method automatically derives the `rr` event keys from the
  *
  * - `url` - the original requested URL (before any redirects)
  * - `rc` - the HTTP response status code
  * - `ts` - the request initiation time (from `resourceTiming.startTime`)
  * - `ttfb` - time to first byte (from `resourceTiming.responseStart`)
  * - `ttlb` - time to last byte (from `resourceTiming.duration`)
  *
  * Additional keys like `ttfbb`, `cmsdd`, `cmsds`, and `smrt` can be
  * supplied via the `data` parameter if the player has access to them.
  *
  * @param response - The HTTP response received.
  * @param data - Additional CMCD data to include with the event.
  *               Values provided here override any auto-derived values.
  */
  recordResponseReceived(response, data = {}) {
    const {
      request
    } = response;
    const url = data.url ?? request?.url;
    if (!url) return;
    const urlObj = new URL(url);
    urlObj.searchParams.delete(CMCD_PARAM);
    const derived = {
      url: urlObj.toString(),
      rc: response.status
    };
    const timing = response.resourceTiming;
    if (timing) {
      if (timing.startTime != null) {
        derived.ts = Math.round(this.timeOrigin + timing.startTime);
        if (timing.responseStart != null) derived.ttfb = Math.round(timing.responseStart - timing.startTime);
      }
      if (timing.duration != null) derived.ttlb = Math.round(timing.duration);
    }
    const cmcd = request.customData?.cmcd ?? {};
    this.recordEvent(CMCD_EVENT_RESPONSE_RECEIVED, {
      ...cmcd,
      ...derived,
      ...data
    });
  }
  /**
  * Applies the CMCD request report data to the request. Called by the player
  * before sending the request.
  *
  * @param req - The request to apply the CMCD request report to.
  * @returns The request with the CMCD request report applied.
  *
  * @deprecated Use {@link CmcdReporter.createRequestReport} instead.
  */
  applyRequestReport(req) {
    return this.createRequestReport(req) ?? req;
  }
  /**
  * Checks if the request reporting is enabled.
  *
  * @returns `true` if the request reporting is enabled, `false` otherwise.
  */
  isRequestReportingEnabled() {
    return !!this.config.enabledKeys?.length;
  }
  /**
  * Creates a new request with the CMCD request report data applied. Called by the player
  * before sending the request.
  *
  * @param request - The request to apply the CMCD request report to.
  * @param data - The data to apply to the request. This data only
  *               applies to this request report. Persistent data
  *               should be updated using `update()`.
  * @returns The request with the CMCD request report applied.
  */
  createRequestReport(request, data) {
    const {
      customData = {},
      headers = {},
      ...rest
    } = request;
    const report = {
      ...rest,
      headers: {
        ...headers
      },
      customData: {
        ...customData,
        cmcd: {}
      }
    };
    if (!this.config.enabledKeys?.length || !report.url) return report;
    const url = new URL(report.url);
    const cmcdData = {
      ...this.data,
      ...data,
      sn: this.requestTarget.sn++
    };
    const options = createEncodingOptions(CMCD_REQUEST_MODE, this.config, report.url);
    if (!isNaN(this.msd) && !this.requestTarget.msdSent) {
      cmcdData.msd = this.msd;
      this.requestTarget.msdSent = true;
    }
    const cmcd = report.customData.cmcd = prepareCmcdData(cmcdData, options);
    switch (this.config.transmissionMode) {
      case CMCD_QUERY:
        const param = encodePreparedCmcd(cmcd);
        if (param) {
          url.searchParams.set(CMCD_PARAM, param);
          report.url = url.toString();
        }
        break;
      case CMCD_HEADERS:
        Object.assign(report.headers, toPreparedCmcdHeaders(cmcd, options.customHeaderMap));
        break;
    }
    return report;
  }
  /**
  * Processes the event targets. Called by the reporter when an event occurs.
  *
  * @param flush - Whether to flush the event targets.
  */
  processEventTargets(flush = false) {
    let reprocess = false;
    this.eventTargets.forEach((target, config) => {
      const {
        queue
      } = target;
      if (!queue.length) return;
      if (queue.length < config.batchSize && !flush) return;
      const deleteCount = flush ? queue.length : config.batchSize;
      const events = queue.splice(0, deleteCount);
      this.sendEventReport(config, events).catch(() => {
        target.queue.unshift(...events);
      });
      reprocess ||= queue.length > 0;
    });
    if (reprocess) this.processEventTargets();
  }
  /**
  * Sends an event report. Called by the reporter when a batch is ready to be sent.
  *
  * @param config - The target config to send the event report to.
  * @param data - The data to send in the event report.
  */
  async sendEventReport(config, data) {
    const options = createEncodingOptions(CMCD_EVENT_MODE, config);
    const {
      status
    } = await this.requester({
      url: config.url,
      method: "POST",
      headers: {
        "Content-Type": CMCD_MIME_TYPE
      },
      body: data.map(item => encodeCmcd(item, options)).join("\n") + "\n"
    });
    if (status === 410) this.disposeEventTarget(config);else if (status === 429 || status > 499 && status < 600) throw new Error(`Event report failed with status ${status}`);
  }
  /**
  * Cancels the time-interval timer for an event target and clears the stored id.
  * Safe to call when no timer is armed (clearInterval(undefined) is a no-op).
  */
  disarmInterval(target) {
    clearInterval(target.intervalId);
    target.intervalId = void 0;
  }
  /**
  * Permanently removes an event target: cancels its timer and removes it from the
  * eventTargets map. Used when the collector signals the target is gone (HTTP 410).
  */
  disposeEventTarget(config) {
    const target = this.eventTargets.get(config);
    if (!target) return;
    this.disarmInterval(target);
    this.eventTargets.delete(config);
  }
  /**
  * Resets the session related data. Called when the session ID changes.
  */
  resetSession() {
    this.eventTargets.forEach(target => target.sn = 0);
    this.requestTarget.sn = 0;
  }
};

//#endregion
//#region src/CmcdStreamingFormat.ts
/**
* Common Media Client Data Streaming Format
*
* @enum
*
* @see {@link https://cta-wave.github.io/Resources/common-media-client-data--cta-5004-b.html#streaming-format | CTA-5004-B Streaming Format}
*
* @public
*/
const CmcdStreamingFormat = {
  DASH: "d",
  HLS: "h",
  SMOOTH: "s",
  OTHER: "o"
};

//#endregion
//#region src/CmcdStreamType.ts
/**
* Common Media Client Data Stream Type
*
* @enum
*
* @see {@link https://cta-wave.github.io/Resources/common-media-client-data--cta-5004-b.html#stream-type | CTA-5004-B Stream Type}
*
* @public
*/
const CmcdStreamType = {
  VOD: "v",
  LIVE: "l",
  LOW_LATENCY: "ll"
};

//#endregion
//#region src/CmcdValidationSeverity.ts
/**
* CMCD validation severity level: error.
*
* @public
*/
const CMCD_VALIDATION_SEVERITY_ERROR = "error";
/**
* CMCD validation severity level: warning.
*
* @public
*/
const CMCD_VALIDATION_SEVERITY_WARNING = "warning";
/**
* CMCD validation severity level.
*
* @public
*/
const CmcdValidationSeverity = {
  ERROR: CMCD_VALIDATION_SEVERITY_ERROR,
  WARNING: CMCD_VALIDATION_SEVERITY_WARNING
};

//#endregion
//#region src/upConvertToV2.ts
/**
* Up-convert V1 CMCD data to V2 format.
*
* - Wraps plain scalar values in arrays for inner-list keys.
* - Wraps `nor` string in an array.
*
* If the data is already V2 (has `v: 2`), it is returned unchanged.
*
* @internal
*/
function upConvertToV2(obj) {
  if (obj["v"] === CMCD_V2) return obj;
  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value == null) {
      result[key] = value;
      continue;
    }
    if (CMCD_INNER_LIST_KEYS.has(key) && !Array.isArray(value)) result[key] = [value];else if (key === "nor" && typeof value === "string") result[key] = [value];else result[key] = value;
  }
  return result;
}

//#endregion
//#region src/decodeCmcd.ts
function reduceValue(value) {
  if (Array.isArray(value)) return value.map(reduceValue);
  if (typeof value === "symbol") return (0,_svta_cml_structured_field_values__WEBPACK_IMPORTED_MODULE_0__.symbolToStr)(value);
  if (value instanceof _svta_cml_structured_field_values__WEBPACK_IMPORTED_MODULE_0__.SfItem && !value.params) return reduceValue(value.value);
  if (typeof value === "string") return value;
  return value;
}
function decodeCmcd(cmcd, options) {
  if (!cmcd) return {};
  const sfDict = (0,_svta_cml_structured_field_values__WEBPACK_IMPORTED_MODULE_0__.decodeSfDict)(cmcd);
  const result = {};
  for (const [key, item] of Object.entries(sfDict)) result[key] = reduceValue(item.value);
  if (options?.convertToLatest) return upConvertToV2(result);
  return result;
}

//#endregion
//#region src/ensureHeaders.ts
/**
* Converts a record of header fields to a `Headers` instance if necessary.
*
* @param headers - A `Headers` instance or a plain record of header fields.
* @returns A `Headers` instance.
*
* @internal
*/
function ensureHeaders(headers) {
  return headers instanceof Headers ? headers : new Headers(headers);
}

//#endregion
//#region src/fromCmcdHeaders.ts
function fromCmcdHeaders(headers, options) {
  const h = ensureHeaders(headers);
  const result = {};
  for (const field of CMCD_HEADER_FIELDS) {
    const value = h.get(field);
    if (value) Object.assign(result, decodeCmcd(value));
  }
  if (options?.convertToLatest) return upConvertToV2(result);
  return result;
}

//#endregion
//#region src/fromCmcdQuery.ts
function fromCmcdQuery(query, options) {
  if (typeof query === "string") query = new URLSearchParams(query);
  return decodeCmcd(query.get(CMCD_PARAM) ?? "", options);
}

//#endregion
//#region src/fromCmcdUrl.ts
function fromCmcdUrl(url, options) {
  return decodeCmcd(decodeURIComponent(url.replace(/^CMCD=/, "")), options);
}

//#endregion
//#region src/isCmcdV1Data.ts
/**
* Check if a CMCD data object is version 1.
*
* @param data - The CMCD data object to check.
*
* @returns `true` if the data is version 1, `false` otherwise.
*
* @public
*
* @example
* {@includeCode ../test/isCmcdV1Data.test.ts#example}
*/
function isCmcdV1Data(data) {
  return data.v !== CMCD_V2;
}

//#endregion
//#region src/isCmcdV2Data.ts
/**
* Check if a CMCD data object is version 2.
*
* @param data - The CMCD data object to check.
*
* @returns `true` if the data is version 2, `false` otherwise.
*
* @public
*
* @example
* {@includeCode ../test/isCmcdV2Data.test.ts#example}
*/
function isCmcdV2Data(data) {
  return data.v === CMCD_V2;
}

//#endregion
//#region src/toCmcdValue.ts
/**
* Convert a value to a CMCD value.
*
* @param value - The value to convert to a CMCD value.
* @param params - The parameters to convert to a CMCD value.
* @returns The CMCD value.
*
* @public
*/
function toCmcdValue(value, params) {
  return new _svta_cml_structured_field_values__WEBPACK_IMPORTED_MODULE_0__.SfItem(value, params);
}

//#endregion
//#region src/mergeValidationResults.ts
/**
* Merges multiple validation results into a single result.
*
* @internal
*/
function mergeValidationResults(...results) {
  const issues = results.flatMap(r => r.issues);
  return {
    valid: issues.every(i => i.severity !== CMCD_VALIDATION_SEVERITY_ERROR),
    issues
  };
}

//#endregion
//#region src/resolveVersion.ts
/**
* Resolves the CMCD version from explicit options, the payload's `v` key, or the default (v1).
*
* @internal
*/
function resolveVersion(data, options) {
  if (options?.version === 1 || options?.version === 2) return options.version;
  const payloadVersion = data["v"];
  if (payloadVersion === 1 || payloadVersion === 2) return payloadVersion;
  return CMCD_V1;
}

//#endregion
//#region src/validateCmcdKeys.ts
const CMCD_V1_KEY_SET = new Set(CMCD_V1_KEYS);
const CMCD_KEY_SET = new Set(CMCD_KEYS);
/**
* Validates that all keys in a CMCD payload are recognized spec keys or valid custom keys.
*
* @example
* {@includeCode ../test/validateCmcdKeys.test.ts#example}
*
* @param data - The CMCD payload to validate.
* @param options - Validation options.
* @returns The validation result.
*
* @see {@link https://cta-wave.github.io/Resources/common-media-client-data--cta-5004-b.html#reserved-keys | CTA-5004-B Reserved Keys}
*
* @public
*/
function validateCmcdKeys(data, options) {
  const version = resolveVersion(data, options);
  const validKeySet = version === CMCD_V1 ? CMCD_V1_KEY_SET : CMCD_KEY_SET;
  const issues = [];
  for (const key of Object.keys(data)) {
    if (isCmcdCustomKey(key)) continue;
    if (!validKeySet.has(key)) issues.push({
      key,
      message: `Unknown CMCD key "${key}" for version ${version}.`,
      severity: CMCD_VALIDATION_SEVERITY_ERROR
    });
  }
  return {
    valid: issues.length === 0,
    issues
  };
}

//#endregion
//#region src/validateCmcdStructure.ts
/**
* Validates the structural rules of a CMCD payload.
*
* @example
* {@includeCode ../test/validateCmcdStructure.test.ts#example}
*
* @param data - The CMCD payload to validate.
* @param options - Validation options.
* @returns The validation result.
*
* @see {@link https://cta-wave.github.io/Resources/common-media-client-data--cta-5004-b.html#data-payload-definition-what-data-to-send | CTA-5004-B Data Payload Definition}
*
* @public
*/
function validateCmcdStructure(data, options) {
  const version = resolveVersion(data, options);
  const issues = [];
  if (options?.reportingMode === CMCD_REQUEST_MODE) {
    for (const key of CMCD_EVENT_KEYS) if (key in data) issues.push({
      key,
      message: `Event key "${key}" must not be present in request mode.`,
      severity: CMCD_VALIDATION_SEVERITY_ERROR
    });
    for (const key of CMCD_RESPONSE_KEYS) if (key in data) issues.push({
      key,
      message: `Response key "${key}" must not be present in request mode.`,
      severity: CMCD_VALIDATION_SEVERITY_ERROR
    });
  }
  if (options?.reportingMode === CMCD_EVENT_MODE) {
    if (!("e" in data)) issues.push({
      key: "e",
      message: "Event mode requires the \"e\" key to be present.",
      severity: CMCD_VALIDATION_SEVERITY_ERROR
    });
    if (!("ts" in data)) issues.push({
      key: "ts",
      message: "Event mode requires the \"ts\" key to be present.",
      severity: CMCD_VALIDATION_SEVERITY_ERROR
    });
  }
  if ("e" in data) {
    if (data["e"] === CMCD_EVENT_CUSTOM_EVENT) {
      if (!("cen" in data)) issues.push({
        key: "cen",
        message: "Custom event (e=\"ce\") requires the \"cen\" key to be present.",
        severity: CMCD_VALIDATION_SEVERITY_ERROR
      });
    } else if ("cen" in data) issues.push({
      key: "cen",
      message: "The \"cen\" key must only be present when e=\"ce\".",
      severity: CMCD_VALIDATION_SEVERITY_ERROR
    });
    if (data["e"] === CMCD_EVENT_RESPONSE_RECEIVED) {
      if (!("url" in data)) issues.push({
        key: "url",
        message: "Response received event (e=\"rr\") requires the \"url\" key to be present.",
        severity: CMCD_VALIDATION_SEVERITY_ERROR
      });
    } else for (const key of CMCD_RESPONSE_KEYS) if (key in data) issues.push({
      key,
      message: `Response key "${key}" must only be present when e="rr".`,
      severity: CMCD_VALIDATION_SEVERITY_ERROR
    });
    if (data["e"] === CMCD_EVENT_PLAY_STATE && !("sta" in data)) issues.push({
      key: "sta",
      message: "Play state event (e=\"ps\") requires the \"sta\" key to be present.",
      severity: CMCD_VALIDATION_SEVERITY_ERROR
    });
    if (data["e"] === CMCD_EVENT_ERROR && !("ec" in data)) issues.push({
      key: "ec",
      message: "Error event (e=\"e\") requires the \"ec\" key to be present.",
      severity: CMCD_VALIDATION_SEVERITY_ERROR
    });
  }
  if ("v" in data && data["v"] !== 1 && data["v"] !== 2) issues.push({
    key: "v",
    message: `Unsupported CMCD version "${String(data["v"])}". Expected 1 or 2.`,
    severity: CMCD_VALIDATION_SEVERITY_ERROR
  });else if (version > 1 && !("v" in data)) issues.push({
    key: "v",
    message: "Version 2 payloads require the \"v\" key to be present.",
    severity: CMCD_VALIDATION_SEVERITY_ERROR
  });else if (version === CMCD_V1 && "v" in data) issues.push({
    key: "v",
    message: "Version 1 payloads should omit the \"v\" key (v1 is the default).",
    severity: CMCD_VALIDATION_SEVERITY_WARNING
  });
  return {
    valid: issues.every(i => i.severity !== CMCD_VALIDATION_SEVERITY_ERROR),
    issues
  };
}

//#endregion
//#region src/CMCD_KEY_TYPES.ts
/**
* CMCD key value type: inner list of numbers with token identifiers.
*
* @internal
*/
const CMCD_KEY_TYPE_NUMBER_LIST = "number[]";
/**
* CMCD key value type: inner list of strings.
*
* @internal
*/
const CMCD_KEY_TYPE_STRING_LIST = "string[]";
/**
* CMCD key value type: integer.
*
* @internal
*/
const CMCD_KEY_TYPE_INTEGER = "integer";
/**
* CMCD key value type: number (decimal).
*
* @internal
*/
const CMCD_KEY_TYPE_NUMBER = "number";
/**
* CMCD key value type: boolean.
*
* @internal
*/
const CMCD_KEY_TYPE_BOOLEAN = "boolean";
/**
* CMCD key value type: string.
*
* @internal
*/
const CMCD_KEY_TYPE_STRING = "string";
/**
* CMCD key value type: token.
*
* @internal
*/
const CMCD_KEY_TYPE_TOKEN = "token";
/**
* Maps each CMCD spec key to its expected value type for v2.
* Keys that differ between v1 and v2 are handled by CMCD_V1_KEY_TYPE_OVERRIDES.
*
* @internal
*/
const CMCD_KEY_TYPES = {
  ab: CMCD_KEY_TYPE_NUMBER_LIST,
  bl: CMCD_KEY_TYPE_NUMBER_LIST,
  br: CMCD_KEY_TYPE_NUMBER_LIST,
  bsa: CMCD_KEY_TYPE_NUMBER_LIST,
  bsd: CMCD_KEY_TYPE_NUMBER_LIST,
  bsda: CMCD_KEY_TYPE_NUMBER_LIST,
  lab: CMCD_KEY_TYPE_NUMBER_LIST,
  lb: CMCD_KEY_TYPE_NUMBER_LIST,
  mtp: CMCD_KEY_TYPE_NUMBER_LIST,
  pb: CMCD_KEY_TYPE_NUMBER_LIST,
  tab: CMCD_KEY_TYPE_NUMBER_LIST,
  tb: CMCD_KEY_TYPE_NUMBER_LIST,
  tbl: CMCD_KEY_TYPE_NUMBER_LIST,
  tpb: CMCD_KEY_TYPE_NUMBER_LIST,
  ec: CMCD_KEY_TYPE_STRING_LIST,
  nor: CMCD_KEY_TYPE_STRING_LIST,
  d: CMCD_KEY_TYPE_INTEGER,
  dfa: CMCD_KEY_TYPE_INTEGER,
  dl: CMCD_KEY_TYPE_INTEGER,
  ltc: CMCD_KEY_TYPE_INTEGER,
  msd: CMCD_KEY_TYPE_INTEGER,
  pt: CMCD_KEY_TYPE_INTEGER,
  rc: CMCD_KEY_TYPE_INTEGER,
  rtp: CMCD_KEY_TYPE_INTEGER,
  sn: CMCD_KEY_TYPE_INTEGER,
  ts: CMCD_KEY_TYPE_INTEGER,
  ttfb: CMCD_KEY_TYPE_INTEGER,
  ttfbb: CMCD_KEY_TYPE_INTEGER,
  ttlb: CMCD_KEY_TYPE_INTEGER,
  v: CMCD_KEY_TYPE_INTEGER,
  pr: CMCD_KEY_TYPE_NUMBER,
  bg: CMCD_KEY_TYPE_BOOLEAN,
  bs: CMCD_KEY_TYPE_BOOLEAN,
  nr: CMCD_KEY_TYPE_BOOLEAN,
  su: CMCD_KEY_TYPE_BOOLEAN,
  cdn: CMCD_KEY_TYPE_STRING,
  cen: CMCD_KEY_TYPE_STRING,
  cid: CMCD_KEY_TYPE_STRING,
  cmsdd: CMCD_KEY_TYPE_STRING,
  cmsds: CMCD_KEY_TYPE_STRING,
  cs: CMCD_KEY_TYPE_STRING,
  h: CMCD_KEY_TYPE_STRING,
  nrr: CMCD_KEY_TYPE_STRING,
  sid: CMCD_KEY_TYPE_STRING,
  smrt: CMCD_KEY_TYPE_STRING,
  url: CMCD_KEY_TYPE_STRING,
  e: CMCD_KEY_TYPE_TOKEN,
  ot: CMCD_KEY_TYPE_TOKEN,
  sf: CMCD_KEY_TYPE_TOKEN,
  st: CMCD_KEY_TYPE_TOKEN,
  sta: CMCD_KEY_TYPE_TOKEN
};
/**
* Maps keys to their v1-specific types when they differ from v2.
*
* @internal
*/
const CMCD_V1_KEY_TYPE_OVERRIDES = {
  bl: CMCD_KEY_TYPE_INTEGER,
  br: CMCD_KEY_TYPE_NUMBER,
  mtp: CMCD_KEY_TYPE_INTEGER,
  tb: CMCD_KEY_TYPE_NUMBER,
  nor: CMCD_KEY_TYPE_STRING
};

//#endregion
//#region src/CMCD_STRING_LENGTH_LIMITS.ts
/**
* Maps CMCD keys to their maximum string length.
*
* @internal
*/
const CMCD_STRING_LENGTH_LIMITS = {
  sid: 64,
  cid: 128,
  cdn: 128,
  h: 128,
  cen: 64
};
/**
* Maximum length for custom key values.
*
* @internal
*/
const CMCD_CUSTOM_KEY_VALUE_MAX_LENGTH = 64;

//#endregion
//#region src/CMCD_TOKEN_VALUES.ts
/**
* Maps token keys to their valid values.
*
* @internal
*/
const CMCD_TOKEN_VALUES = {
  e: ["bc", "ps", "e", "t", "c", "b", "m", "um", "pe", "pc", "rr", "as", "ae", "abs", "abe", "sk", "ce"],
  ot: ["m", "a", "v", "av", "i", "c", "tt", "k", "o"],
  sf: ["d", "h", "s", "o"],
  st: ["v", "l", "ll"],
  sta: ["s", "p", "k", "r", "a", "w", "e", "f", "q", "d"]
};

//#endregion
//#region src/validateCmcdValues.ts
const HUNDRED_ROUNDING_KEYS = new Set(["bl", "dl", "mtp", "rtp", "tbl"]);
const INTEGER_ROUNDING_KEYS = new Set(["br", "d", "tb"]);
function isFiniteNumber(value) {
  return typeof value === "number" && Number.isFinite(value);
}
function validateListValue(key, value, issues) {
  if (!Array.isArray(value)) {
    issues.push({
      key,
      message: `Key "${key}" must be an array.`,
      severity: CMCD_VALIDATION_SEVERITY_ERROR
    });
    return;
  }
  for (let i = 0; i < value.length; i++) {
    const element = value[i];
    if (element instanceof _svta_cml_structured_field_values__WEBPACK_IMPORTED_MODULE_0__.SfItem) {
      if (!isFiniteNumber(element.value)) issues.push({
        key,
        message: `Key "${key}" array element [${i}] must be a finite number.`,
        severity: CMCD_VALIDATION_SEVERITY_ERROR
      });
    } else if (!isFiniteNumber(element)) issues.push({
      key,
      message: `Key "${key}" array element [${i}] must be a finite number.`,
      severity: CMCD_VALIDATION_SEVERITY_ERROR
    });
  }
}
function validateStringArrayValue(key, value, issues) {
  if (!Array.isArray(value)) {
    issues.push({
      key,
      message: `Key "${key}" must be an array.`,
      severity: CMCD_VALIDATION_SEVERITY_ERROR
    });
    return;
  }
  for (let i = 0; i < value.length; i++) {
    const element = value[i];
    if (element instanceof _svta_cml_structured_field_values__WEBPACK_IMPORTED_MODULE_0__.SfItem) {
      if (typeof element.value !== "string") issues.push({
        key,
        message: `Key "${key}" array element [${i}] must be a string.`,
        severity: CMCD_VALIDATION_SEVERITY_ERROR
      });
    } else if (typeof element !== "string") issues.push({
      key,
      message: `Key "${key}" array element [${i}] must be a string.`,
      severity: CMCD_VALIDATION_SEVERITY_ERROR
    });
  }
}
/**
* Validates that all values in a CMCD payload conform to the expected types and constraints.
*
* @example
* {@includeCode ../test/validateCmcdValues.test.ts#example}
*
* @param data - The CMCD payload to validate.
* @param options - Validation options.
* @returns The validation result.
*
* @see {@link https://cta-wave.github.io/Resources/common-media-client-data--cta-5004-b.html#reserved-keys | CTA-5004-B Reserved Keys}
*
* @public
*/
function validateCmcdValues(data, options) {
  const version = resolveVersion(data, options);
  const issues = [];
  for (const [key, value] of Object.entries(data)) {
    if (isCmcdCustomKey(key)) {
      if (typeof value !== "string") issues.push({
        key,
        message: `Custom key "${key}" value must be a string or token.`,
        severity: CMCD_VALIDATION_SEVERITY_ERROR
      });else if (value.length > CMCD_CUSTOM_KEY_VALUE_MAX_LENGTH) issues.push({
        key,
        message: `Custom key "${key}" value exceeds maximum length of ${CMCD_CUSTOM_KEY_VALUE_MAX_LENGTH}.`,
        severity: CMCD_VALIDATION_SEVERITY_ERROR
      });
      continue;
    }
    if (key === "v") {
      if (value !== 1 && value !== 2) issues.push({
        key,
        message: `Key "v" must be 1 or 2.`,
        severity: CMCD_VALIDATION_SEVERITY_ERROR
      });
      continue;
    }
    let expectedType = CMCD_KEY_TYPES[key];
    if (!expectedType) continue;
    if (version === CMCD_V1 && key in CMCD_V1_KEY_TYPE_OVERRIDES) expectedType = CMCD_V1_KEY_TYPE_OVERRIDES[key];
    switch (expectedType) {
      case CMCD_KEY_TYPE_INTEGER:
        if (!isFiniteNumber(value) || !Number.isInteger(value)) issues.push({
          key,
          message: `Key "${key}" must be a finite integer.`,
          severity: CMCD_VALIDATION_SEVERITY_ERROR
        });else if (HUNDRED_ROUNDING_KEYS.has(key) && value % 100 !== 0) issues.push({
          key,
          message: `Key "${key}" should be rounded to the nearest 100.`,
          severity: CMCD_VALIDATION_SEVERITY_WARNING
        });
        break;
      case CMCD_KEY_TYPE_NUMBER:
        if (!isFiniteNumber(value)) issues.push({
          key,
          message: `Key "${key}" must be a finite number.`,
          severity: CMCD_VALIDATION_SEVERITY_ERROR
        });else if (HUNDRED_ROUNDING_KEYS.has(key) && value % 100 !== 0) issues.push({
          key,
          message: `Key "${key}" should be rounded to the nearest 100.`,
          severity: CMCD_VALIDATION_SEVERITY_WARNING
        });else if (INTEGER_ROUNDING_KEYS.has(key) && !Number.isInteger(value)) issues.push({
          key,
          message: `Key "${key}" should be rounded to an integer.`,
          severity: CMCD_VALIDATION_SEVERITY_WARNING
        });
        break;
      case CMCD_KEY_TYPE_BOOLEAN:
        if (typeof value !== "boolean") issues.push({
          key,
          message: `Key "${key}" must be a boolean.`,
          severity: CMCD_VALIDATION_SEVERITY_ERROR
        });
        break;
      case CMCD_KEY_TYPE_STRING:
        if (typeof value !== "string") issues.push({
          key,
          message: `Key "${key}" must be a string.`,
          severity: CMCD_VALIDATION_SEVERITY_ERROR
        });else if (key in CMCD_STRING_LENGTH_LIMITS && value.length > CMCD_STRING_LENGTH_LIMITS[key]) issues.push({
          key,
          message: `Key "${key}" exceeds maximum length of ${CMCD_STRING_LENGTH_LIMITS[key]}.`,
          severity: CMCD_VALIDATION_SEVERITY_ERROR
        });
        break;
      case CMCD_KEY_TYPE_TOKEN:
        {
          const validValues = CMCD_TOKEN_VALUES[key];
          if (validValues && !validValues.includes(value)) issues.push({
            key,
            message: `Key "${key}" has invalid token value "${String(value)}". Expected one of: ${validValues.join(", ")}.`,
            severity: CMCD_VALIDATION_SEVERITY_ERROR
          });
          break;
        }
      case CMCD_KEY_TYPE_NUMBER_LIST:
        validateListValue(key, value, issues);
        break;
      case CMCD_KEY_TYPE_STRING_LIST:
        validateStringArrayValue(key, value, issues);
        break;
    }
  }
  return {
    valid: issues.every(i => i.severity !== CMCD_VALIDATION_SEVERITY_ERROR),
    issues
  };
}

//#endregion
//#region src/validateCmcd.ts
/**
* Validates a CMCD payload by checking keys, values, and structure.
*
* @example
* {@includeCode ../test/validateCmcd.test.ts#example}
*
* @param data - The CMCD payload to validate.
* @param options - Validation options.
* @returns The validation result.
*
* @see {@link https://cta-wave.github.io/Resources/common-media-client-data--cta-5004-b.html#data-payload-definition-what-data-to-send | CTA-5004-B Data Payload Definition}
*
* @public
*/
function validateCmcd(data, options) {
  return mergeValidationResults(validateCmcdKeys(data, options), validateCmcdValues(data, options), validateCmcdStructure(data, options));
}

//#endregion
//#region src/validateCmcdEvents.ts
/**
* Validates a raw CMCD string as an event-mode payload.
*
* This function decodes the string internally and validates it with
* `reportingMode` set to `'event'`. The input may contain multiple
* newline-separated events (e.g. an `application/cmcd` POST body), in which
* case each line is validated independently and the results are merged.
*
* @param cmcd - The raw CMCD-encoded string to validate. May contain
*   multiple newline-separated event lines.
* @param options - Validation options (excluding `reportingMode`).
* @returns The validation result including decoded data per event line.
*
* @example
* {@includeCode ../test/validateCmcdEvents.test.ts#example}
*
* @see {@link https://cta-wave.github.io/Resources/common-media-client-data--cta-5004-b.html#body-definition | CTA-5004-B Body Definition}
*
* @public
*/
function validateCmcdEvents(cmcd, options) {
  const opts = {
    ...options,
    reportingMode: CMCD_EVENT_MODE
  };
  const lines = cmcd.split(/\r?\n/).filter(line => line.length > 0);
  if (lines.length === 0) return {
    valid: false,
    issues: [{
      message: "Empty event mode payload. At least one event line is required.",
      severity: CMCD_VALIDATION_SEVERITY_ERROR
    }],
    data: []
  };
  const decodedLines = [];
  const lineResults = [];
  for (let i = 0; i < lines.length; i++) try {
    const data = decodeCmcd(lines[i]);
    decodedLines.push(data);
    lineResults.push(validateCmcd(data, opts));
  } catch {
    decodedLines.push({});
    lineResults.push({
      valid: false,
      issues: [{
        message: `Failed to decode event line ${i + 1}: invalid structured field syntax.`,
        severity: CMCD_VALIDATION_SEVERITY_ERROR
      }]
    });
  }
  return {
    ...mergeValidationResults(...lineResults),
    data: decodedLines
  };
}

//#endregion
//#region src/validateCmcdEventReport.ts
/**
* Validates a full HTTP request as an event-mode payload.
*
* Accepts an {@link @svta/cml-utils!HttpRequest | HttpRequest} object.
*
* This function validates that the request uses the POST method and has
* the correct `Content-Type` header (`application/cmcd`) in addition to
* validating the body content via {@link validateCmcdEvents}.
*
* @param request - An `HttpRequest` to validate.
* @param options - Validation options (excluding `reportingMode`).
* @returns The validation result including decoded data per event line.
*
* @example {@includeCode ../test/validateCmcdEventReport.test.ts#example}
*
* @see {@link https://cta-wave.github.io/Resources/common-media-client-data--cta-5004-b.html#event-mode | CTA-5004-B Event Mode}
*
* @public
*/
function validateCmcdEventReport(request, options) {
  const issues = [];
  if (request.method !== "POST") issues.push({
    message: `Invalid HTTP method '${request.method ?? "GET"}'. Event reports must use POST.`,
    severity: CMCD_VALIDATION_SEVERITY_ERROR
  });
  const contentType = request.headers ? ensureHeaders(request.headers).get("Content-Type") : void 0;
  if (!contentType) issues.push({
    message: `Missing Content-Type header. Event reports must use '${CMCD_MIME_TYPE}'.`,
    severity: CMCD_VALIDATION_SEVERITY_ERROR
  });else {
    const mediaType = contentType.split(";")[0].trim().toLowerCase();
    if (mediaType !== CMCD_MIME_TYPE) issues.push({
      message: `Invalid Content-Type '${mediaType}'. Event reports must use '${CMCD_MIME_TYPE}'.`,
      severity: CMCD_VALIDATION_SEVERITY_ERROR
    });
  }
  const body = request.body;
  if (body === void 0 || body === null) {
    issues.push({
      message: "Missing request body. Event reports must include a body.",
      severity: CMCD_VALIDATION_SEVERITY_ERROR
    });
    return {
      valid: false,
      issues,
      data: []
    };
  }
  if (typeof body !== "string") {
    issues.push({
      message: "Request body must be a string.",
      severity: CMCD_VALIDATION_SEVERITY_ERROR
    });
    return {
      valid: false,
      issues,
      data: []
    };
  }
  const bodyResult = validateCmcdEvents(body, options);
  return {
    valid: issues.length === 0 && bodyResult.valid,
    issues: [...issues, ...bodyResult.issues],
    data: bodyResult.data
  };
}

//#endregion
//#region src/validateCmcdHeaders.ts
/**
* Validates CMCD HTTP headers by checking shard placement and payload validity.
*
* This function accepts raw CMCD header strings, decodes each shard
* internally, verifies that each key is placed in its correct header shard,
* then merges all shards and runs full payload validation (keys, values, and
* structure) on the merged data.
*
* @example
* {@includeCode ../test/validateCmcdHeaders.test.ts#example}
*
* @param headers - A `Headers` instance or a record of CMCD header fields to their raw encoded string values.
* @param options - Validation options (excluding `reportingMode`).
* @returns The validation result including decoded data.
*
* @see {@link https://cta-wave.github.io/Resources/common-media-client-data--cta-5004-b.html#header-field-definition | CTA-5004-B Header Field Definition}
*
* @public
*/
function validateCmcdHeaders(headers, options) {
  const h = ensureHeaders(headers);
  const issues = [];
  const decoded = {};
  for (const headerField of CMCD_HEADER_FIELDS) {
    const raw = h.get(headerField);
    if (!raw) continue;
    let shard;
    try {
      shard = decodeCmcd(raw);
    } catch {
      issues.push({
        key: headerField,
        message: `Failed to decode "${headerField}" header: invalid structured field syntax.`,
        severity: CMCD_VALIDATION_SEVERITY_ERROR
      });
      continue;
    }
    decoded[headerField] = shard;
    for (const key of Object.keys(shard)) {
      if (isCmcdCustomKey(key)) continue;
      const expectedHeader = CMCD_HEADER_MAP[key];
      if (expectedHeader && expectedHeader !== headerField) issues.push({
        key,
        message: `Key "${key}" is in "${headerField}" but should be in "${expectedHeader}".`,
        severity: CMCD_VALIDATION_SEVERITY_ERROR
      });
    }
  }
  const shardResult = {
    valid: issues.length === 0,
    issues
  };
  const merged = Object.assign({}, ...CMCD_HEADER_FIELDS.map(f => decoded[f]).filter(Boolean));
  return {
    ...mergeValidationResults(shardResult, validateCmcd(merged, {
      ...options,
      reportingMode: CMCD_REQUEST_MODE
    })),
    data: merged
  };
}

//#endregion
//#region src/validateCmcdRequest.ts
/**
* Validates CMCD data from a request as a request-mode payload.
*
* Accepts a
* {@link https://developer.mozilla.org/en-US/docs/Web/API/Request | Request}
* object or an {@link @svta/cml-utils!HttpRequest | HttpRequest} object.
*
* The function checks for CMCD data in the HTTP headers first. If CMCD
* headers are found, validation includes shard-placement checks via
* {@link validateCmcdHeaders}. Otherwise, the CMCD query parameter is
* extracted from the URL and validated.
*
* @param request - A `Request` or `HttpRequest` to validate.
* @param options - Validation options (excluding `reportingMode`).
* @returns The validation result including decoded data.
*
* @example
* {@includeCode ../test/validateCmcdRequest.test.ts#example}
*
* @see {@link https://cta-wave.github.io/Resources/common-media-client-data--cta-5004-b.html#request-mode | CTA-5004-B Request Mode}
*
* @public
*/
function validateCmcdRequest(request, options) {
  const headers = extractHeaderRecord(request.headers);
  if (headers) return validateCmcdHeaders(headers, options);
  const param = new URL(request.url).searchParams.get(CMCD_PARAM);
  if (!param) return {
    valid: false,
    issues: [{
      message: "No CMCD data found in request headers or query parameters.",
      severity: CMCD_VALIDATION_SEVERITY_ERROR
    }],
    data: {}
  };
  let data;
  try {
    data = decodeCmcd(param);
  } catch {
    return {
      valid: false,
      issues: [{
        message: "Failed to decode CMCD query parameter: invalid structured field syntax.",
        severity: CMCD_VALIDATION_SEVERITY_ERROR
      }],
      data: {}
    };
  }
  return {
    ...validateCmcd(data, {
      ...options,
      reportingMode: CMCD_REQUEST_MODE
    }),
    data
  };
}
function extractHeaderRecord(headers) {
  if (!headers) return;
  const h = ensureHeaders(headers);
  const result = {};
  let found = false;
  for (const field of CMCD_HEADER_FIELDS) {
    const value = h.get(field);
    if (value) {
      result[field] = value;
      found = true;
    }
  }
  return found ? result : void 0;
}

//#endregion


/***/ }),

/***/ "./node_modules/@svta/cml-structured-field-values/dist/index.js":
/*!**********************************************************************!*\
  !*** ./node_modules/@svta/cml-structured-field-values/dist/index.js ***!
  \**********************************************************************/
/***/ (function(__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   SfItem: function() { return /* binding */ SfItem; },
/* harmony export */   SfToken: function() { return /* binding */ SfToken; },
/* harmony export */   decodeSfDict: function() { return /* binding */ decodeSfDict; },
/* harmony export */   decodeSfItem: function() { return /* binding */ decodeSfItem; },
/* harmony export */   decodeSfList: function() { return /* binding */ decodeSfList; },
/* harmony export */   encodeSfDict: function() { return /* binding */ encodeSfDict; },
/* harmony export */   encodeSfItem: function() { return /* binding */ encodeSfItem; },
/* harmony export */   encodeSfList: function() { return /* binding */ encodeSfList; },
/* harmony export */   parseBareItem: function() { return /* binding */ parseBareItem; },
/* harmony export */   parseBoolean: function() { return /* binding */ parseBoolean; },
/* harmony export */   parseByteSequence: function() { return /* binding */ parseByteSequence; },
/* harmony export */   parseDate: function() { return /* binding */ parseDate; },
/* harmony export */   parseDict: function() { return /* binding */ parseDict; },
/* harmony export */   parseError: function() { return /* binding */ parseError; },
/* harmony export */   parseInnerList: function() { return /* binding */ parseInnerList; },
/* harmony export */   parseIntegerOrDecimal: function() { return /* binding */ parseIntegerOrDecimal; },
/* harmony export */   parseItem: function() { return /* binding */ parseItem; },
/* harmony export */   parseItemOrInnerList: function() { return /* binding */ parseItemOrInnerList; },
/* harmony export */   parseKey: function() { return /* binding */ parseKey; },
/* harmony export */   parseList: function() { return /* binding */ parseList; },
/* harmony export */   parseParameters: function() { return /* binding */ parseParameters; },
/* harmony export */   parseString: function() { return /* binding */ parseString; },
/* harmony export */   parseToken: function() { return /* binding */ parseToken; },
/* harmony export */   serializeBareItem: function() { return /* binding */ serializeBareItem; },
/* harmony export */   serializeBoolean: function() { return /* binding */ serializeBoolean; },
/* harmony export */   serializeByteSequence: function() { return /* binding */ serializeByteSequence; },
/* harmony export */   serializeDate: function() { return /* binding */ serializeDate; },
/* harmony export */   serializeDecimal: function() { return /* binding */ serializeDecimal; },
/* harmony export */   serializeDict: function() { return /* binding */ serializeDict; },
/* harmony export */   serializeError: function() { return /* binding */ serializeError; },
/* harmony export */   serializeInnerList: function() { return /* binding */ serializeInnerList; },
/* harmony export */   serializeInteger: function() { return /* binding */ serializeInteger; },
/* harmony export */   serializeItem: function() { return /* binding */ serializeItem; },
/* harmony export */   serializeKey: function() { return /* binding */ serializeKey; },
/* harmony export */   serializeList: function() { return /* binding */ serializeList; },
/* harmony export */   serializeParams: function() { return /* binding */ serializeParams; },
/* harmony export */   serializeString: function() { return /* binding */ serializeString; },
/* harmony export */   serializeToken: function() { return /* binding */ serializeToken; },
/* harmony export */   symbolToStr: function() { return /* binding */ symbolToStr; }
/* harmony export */ });
/* harmony import */ var _svta_cml_utils__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @svta/cml-utils */ "./node_modules/@svta/cml-utils/dist/index.js");


//#region src/SfItem.ts
/**
* Structured Field Item
*
* @public
*/
var SfItem = class SfItem {
  /**
  * Creates a new structured field item.
  *
  * @param value - The value of the item.
  * @param params - The parameters of the item.
  */
  constructor(value, params) {
    if (Array.isArray(value)) value = value.map(v => v instanceof SfItem ? v : new SfItem(v));
    this.value = value;
    this.params = params;
  }
};

//#endregion
//#region src/utils/DICT.ts
const DICT = "Dict";

//#endregion
//#region src/parse/ParsedValue.ts
/**
* @internal
*/
function parsedValue(value, src) {
  return {
    value,
    src
  };
}

//#endregion
//#region src/utils/throwError.ts
function format(value) {
  if (Array.isArray(value)) return JSON.stringify(value);
  if (value instanceof Map) return "Map{}";
  if (value instanceof Set) return "Set{}";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}
function throwError(action, src, type, cause) {
  return new Error(`failed to ${action} "${format(src)}" as ${type}`, {
    cause
  });
}

//#endregion
//#region src/parse/parseError.ts
/**
* @internal
*/
function parseError(src, type, cause) {
  return throwError("parse", src, type, cause);
}

//#endregion
//#region src/utils/INNER.ts
const INNER = "Inner List";

//#endregion
//#region src/utils/BARE_ITEM.ts
const BARE_ITEM = "Bare Item";

//#endregion
//#region src/utils/BOOLEAN.ts
const BOOLEAN = "Boolean";

//#endregion
//#region src/parse/parseBoolean.ts
/**
* @internal
*/
function parseBoolean(src) {
  let i = 0;
  if (src[i] !== "?") throw parseError(src, BOOLEAN);
  i++;
  if (src[i] === "1") return parsedValue(true, src.substring(++i));
  if (src[i] === "0") return parsedValue(false, src.substring(++i));
  throw parseError(src, BOOLEAN);
}

//#endregion
//#region src/utils/BYTES.ts
const BYTES = "Byte Sequence";

//#endregion
//#region src/parse/parseByteSequence.ts
/**
* @internal
*/
function parseByteSequence(src) {
  if (src[0] !== ":") throw parseError(src, BYTES);
  src = src.substring(1);
  if (src.includes(":") === false) throw parseError(src, BYTES);
  const re = /(^.*?)(:)/g;
  const b64_content = re.exec(src)[1];
  src = src.substring(re.lastIndex);
  return parsedValue((0,_svta_cml_utils__WEBPACK_IMPORTED_MODULE_0__.decodeBase64)(b64_content), src);
}

//#endregion
//#region src/utils/DATE.ts
const DATE = "Date";

//#endregion
//#region src/utils/DECIMAL.ts
const DECIMAL = "Decimal";

//#endregion
//#region src/utils/INTEGER.ts
const INTEGER = "Integer";

//#endregion
//#region src/utils/INTEGER_DECIMAL.ts
const INTEGER_DECIMAL = `${INTEGER} or ${DECIMAL}`;

//#endregion
//#region src/utils/isInvalidInt.ts
function isInvalidInt(value) {
  return value < -999999999999999 || 999999999999999 < value;
}

//#endregion
//#region src/parse/parseIntegerOrDecimal.ts
/**
* @internal
*/
function parseIntegerOrDecimal(src) {
  const orig = src;
  let sign = 1;
  let num = "";
  let value;
  const i = 0;
  const error = parseError(orig, INTEGER_DECIMAL);
  if (src[i] === "-") {
    sign = -1;
    src = src.substring(1);
  }
  if (src.length <= 0) throw error;
  const re_integer = /^(\d+)?/g;
  const result_integer = re_integer.exec(src);
  if (result_integer[0].length === 0) throw error;
  num += result_integer[1];
  src = src.substring(re_integer.lastIndex);
  if (src[0] === ".") {
    if (num.length > 12) throw error;
    const re_decimal = /^(\.\d+)?/g;
    const result_decimal = re_decimal.exec(src);
    src = src.substring(re_decimal.lastIndex);
    if (result_decimal[0].length === 0 || result_decimal[1].length > 4) throw error;
    num += result_decimal[1];
    if (num.length > 16) throw error;
    value = parseFloat(num) * sign;
  } else {
    if (num.length > 15) throw error;
    value = parseInt(num) * sign;
    if (isInvalidInt(value)) throw parseError(num, INTEGER_DECIMAL);
  }
  return parsedValue(value, src);
}

//#endregion
//#region src/parse/parseDate.ts
/**
* @internal
*/
function parseDate(src) {
  let i = 0;
  if (src[i] !== "@") throw parseError(src, DATE);
  i++;
  const date = parseIntegerOrDecimal(src.substring(i));
  if (Number.isInteger(date.value) === false) throw parseError(src, DATE);
  return parsedValue(/* @__PURE__ */new Date(date.value * 1e3), date.src);
}

//#endregion
//#region src/utils/STRING.ts
const STRING = "String";

//#endregion
//#region src/utils/STRING_REGEX.ts
const STRING_REGEX = /[\x00-\x1f\x7f]+/;

//#endregion
//#region src/parse/parseString.ts
/**
* @internal
*/
function parseString(src) {
  let output = "";
  let i = 0;
  if (src[i] !== `"`) throw parseError(src, STRING);
  i++;
  while (src.length > i) {
    if (src[i] === `\\`) {
      if (src.length <= i + 1) throw parseError(src, STRING);
      i++;
      if (src[i] !== `"` && src[i] !== `\\`) throw parseError(src, STRING);
      output += src[i];
    } else if (src[i] === `"`) return parsedValue(output, src.substring(++i));else if (STRING_REGEX.test(src[i])) throw parseError(src, STRING);else output += src[i];
    i++;
  }
  throw parseError(src, STRING);
}

//#endregion
//#region src/SfToken.ts
/**
* A class to represent structured field tokens when `Symbol` is not available.
*
* @public
*/
var SfToken = class {
  constructor(description) {
    this.description = description;
  }
};

//#endregion
//#region src/utils/TOKEN.ts
const TOKEN = "Token";

//#endregion
//#region src/parse/parseToken.ts
/**
* @internal
*/
function parseToken(src, options) {
  if (/^[a-zA-Z*]$/.test(src[0]) === false) throw parseError(src, TOKEN);
  const re = /^([!#$%&'*+\-.^_`|~\w:/]+)/g;
  const value = re.exec(src)[1];
  src = src.substring(re.lastIndex);
  return parsedValue(options?.useSymbol === false ? new SfToken(value) : Symbol.for(value), src);
}

//#endregion
//#region src/parse/parseBareItem.ts
/**
* @internal
*/
function parseBareItem(src, options) {
  const first = src[0];
  if (first === `"`) return parseString(src);
  if (/^[-0-9]/.test(first)) return parseIntegerOrDecimal(src);
  if (first === `?`) return parseBoolean(src);
  if (first === `:`) return parseByteSequence(src);
  if (/^[a-zA-Z*]/.test(first)) return parseToken(src, options);
  if (first === `@`) return parseDate(src);
  throw parseError(src, BARE_ITEM);
}

//#endregion
//#region src/utils/KEY.ts
const KEY = "Key";

//#endregion
//#region src/parse/parseKey.ts
/**
* @internal
*/
function parseKey(src) {
  let i = 0;
  if (/^[a-z*]$/.test(src[i]) === false) throw parseError(src, KEY);
  let value = "";
  while (src.length > i) {
    if (/^[a-z0-9_\-.*]$/.test(src[i]) === false) return parsedValue(value, src.substring(i));
    value += src[i];
    i++;
  }
  return parsedValue(value, src.substring(i));
}

//#endregion
//#region src/parse/parseParameters.ts
/**
* @internal
*/
function parseParameters(src, options) {
  let parameters = void 0;
  while (src.length > 0) {
    if (src[0] !== ";") break;
    src = src.substring(1).trim();
    const parsedKey = parseKey(src);
    const key = parsedKey.value;
    let value = true;
    src = parsedKey.src;
    if (src[0] === "=") {
      src = src.substring(1);
      const parsedBareItem = parseBareItem(src, options);
      value = parsedBareItem.value;
      src = parsedBareItem.src;
    }
    if (parameters == null) parameters = {};
    parameters[key] = value;
  }
  return parsedValue(parameters, src);
}

//#endregion
//#region src/parse/parseItem.ts
/**
* @internal
*/
function parseItem(src, options) {
  const parsedBareItem = parseBareItem(src, options);
  src = parsedBareItem.src;
  const parsedParameters = parseParameters(src, options);
  src = parsedParameters.src;
  return parsedValue(new SfItem(parsedBareItem.value, parsedParameters.value), src);
}

//#endregion
//#region src/parse/parseInnerList.ts
/**
* @internal
*/
function parseInnerList(src, options) {
  if (src[0] !== "(") throw parseError(src, INNER);
  src = src.substring(1);
  const innerList = [];
  while (src.length > 0) {
    src = src.trim();
    if (src[0] === ")") {
      src = src.substring(1);
      const parsedParameters = parseParameters(src, options);
      return parsedValue(new SfItem(innerList, parsedParameters.value), parsedParameters.src);
    }
    const parsedItem = parseItem(src, options);
    innerList.push(parsedItem.value);
    src = parsedItem.src;
    if (src[0] !== " " && src[0] !== ")") throw parseError(src, INNER);
  }
  throw parseError(src, INNER);
}

//#endregion
//#region src/parse/parseItemOrInnerList.ts
/**
* @internal
*/
function parseItemOrInnerList(src, options) {
  if (src[0] === "(") return parseInnerList(src, options);
  return parseItem(src, options);
}

//#endregion
//#region src/parse/parseDict.ts
/**
* @internal
*/
function parseDict(src, options) {
  const value = {};
  while (src.length > 0) {
    let member;
    const parsedKey = parseKey(src);
    const key = parsedKey.value;
    src = parsedKey.src;
    if (src[0] === "=") {
      const parsedItemOrInnerList = parseItemOrInnerList(src.substring(1), options);
      member = parsedItemOrInnerList.value;
      src = parsedItemOrInnerList.src;
    } else {
      const parsedParameters = parseParameters(src, options);
      member = new SfItem(true, parsedParameters.value);
      src = parsedParameters.src;
    }
    value[key] = member;
    src = src.trim();
    if (src.length === 0) return parsedValue(value, src);
    if (src[0] !== ",") throw parseError(src, DICT);
    src = src.substring(1).trim();
    if (src.length === 0 || src[0] === ",") throw parseError(src, DICT);
  }
  return parsedValue(value, src);
}

//#endregion
//#region src/decodeSfDict.ts
/**
* Decode a structured field string into a structured field dictionary
*
* @param input - The structured field string to decode
* @returns The structured field dictionary
*
* @public
*/
function decodeSfDict(input, options) {
  try {
    const {
      src,
      value
    } = parseDict(input.trim(), options);
    if (src !== "") throw parseError(src, DICT);
    return value;
  } catch (cause) {
    throw parseError(input, DICT, cause);
  }
}

//#endregion
//#region src/utils/ITEM.ts
const ITEM = "Item";

//#endregion
//#region src/decodeSfItem.ts
/**
* Decode a structured field string into a structured field item
*
* @param input - The structured field string to decode
* @returns The structured field item
*
* @public
*/
function decodeSfItem(input, options) {
  try {
    const {
      src,
      value
    } = parseItem(input.trim(), options);
    if (src !== "") throw parseError(src, ITEM);
    return value;
  } catch (cause) {
    throw parseError(input, ITEM, cause);
  }
}

//#endregion
//#region src/utils/LIST.ts
const LIST = "List";

//#endregion
//#region src/parse/parseList.ts
/**
* @internal
*/
function parseList(src, options) {
  const value = [];
  while (src.length > 0) {
    const parsedItemOrInnerList = parseItemOrInnerList(src, options);
    value.push(parsedItemOrInnerList.value);
    src = parsedItemOrInnerList.src.trim();
    if (src.length === 0) return parsedValue(value, src);
    if (src[0] !== ",") throw parseError(src, LIST);
    src = src.substring(1).trim();
    if (src.length === 0 || src[0] === ",") throw parseError(src, LIST);
  }
  return parsedValue(value, src);
}

//#endregion
//#region src/decodeSfList.ts
/**
* Decode a structured field string into a structured field list
*
* @param input - The structured field string to decode
* @returns The structured field list
*
* @public
*/
function decodeSfList(input, options) {
  try {
    const {
      src,
      value
    } = parseList(input.trim(), options);
    if (src !== "") throw parseError(src, LIST);
    return value;
  } catch (cause) {
    throw parseError(input, LIST, cause);
  }
}

//#endregion
//#region src/serialize/serializeError.ts
/**
* @internal
*/
function serializeError(src, type, cause) {
  return throwError("serialize", src, type, cause);
}

//#endregion
//#region src/serialize/serializeBoolean.ts
/**
* @internal
*/
function serializeBoolean(value) {
  if (typeof value !== "boolean") throw serializeError(value, BOOLEAN);
  return value ? "?1" : "?0";
}

//#endregion
//#region src/serialize/serializeByteSequence.ts
/**
* @internal
*/
function serializeByteSequence(value) {
  if (ArrayBuffer.isView(value) === false) throw serializeError(value, BYTES);
  return `:${(0,_svta_cml_utils__WEBPACK_IMPORTED_MODULE_0__.encodeBase64)(value)}:`;
}

//#endregion
//#region src/serialize/serializeInteger.ts
/**
* @internal
*/
function serializeInteger(value) {
  if (isInvalidInt(value)) throw serializeError(value, INTEGER);
  return value.toString();
}

//#endregion
//#region src/serialize/serializeDate.ts
/**
* @internal
*/
function serializeDate(value) {
  return `@${serializeInteger(value.getTime() / 1e3)}`;
}

//#endregion
//#region src/serialize/serializeDecimal.ts
/**
* @internal
*/
function serializeDecimal(value) {
  const roundedValue = (0,_svta_cml_utils__WEBPACK_IMPORTED_MODULE_0__.roundToEven)(value, 3);
  if (Math.floor(Math.abs(roundedValue)).toString().length > 12) throw serializeError(value, DECIMAL);
  const stringValue = roundedValue.toString();
  return stringValue.includes(".") ? stringValue : `${stringValue}.0`;
}

//#endregion
//#region src/serialize/serializeString.ts
/**
* @internal
*/
function serializeString(value) {
  if (STRING_REGEX.test(value)) throw serializeError(value, STRING);
  return `"${value.replace(/\\/g, `\\\\`).replace(/"/g, `\\"`)}"`;
}

//#endregion
//#region src/utils/symbolToStr.ts
/**
* Converts a symbol to a string.
*
* @param symbol - The symbol to convert.
*
* @returns The string representation of the symbol.
*
* @public
*/
function symbolToStr(symbol) {
  return symbol.description || symbol.toString().slice(7, -1);
}

//#endregion
//#region src/serialize/serializeToken.ts
/**
* @internal
*/
function serializeToken(token) {
  const value = symbolToStr(token);
  if (/^([a-zA-Z*])([!#$%&'*+\-.^_`|~\w:/]*)$/.test(value) === false) throw serializeError(value, TOKEN);
  return value;
}

//#endregion
//#region src/serialize/serializeBareItem.ts
/**
* @internal
*/
function serializeBareItem(value) {
  switch (typeof value) {
    case "number":
      if (!Number.isFinite(value)) throw serializeError(value, BARE_ITEM);
      if (Number.isInteger(value)) return serializeInteger(value);
      return serializeDecimal(value);
    case "string":
      return serializeString(value);
    case "symbol":
      return serializeToken(value);
    case "boolean":
      return serializeBoolean(value);
    case "object":
      if (value instanceof Date) return serializeDate(value);
      if (value instanceof Uint8Array) return serializeByteSequence(value);
      if (value instanceof SfToken) return serializeToken(value);
    default:
      throw serializeError(value, BARE_ITEM);
  }
}

//#endregion
//#region src/serialize/serializeKey.ts
/**
* @internal
*/
function serializeKey(value) {
  if (/^[a-z*][a-z0-9\-_.*]*$/.test(value) === false) throw serializeError(value, KEY);
  return value;
}

//#endregion
//#region src/serialize/serializeParams.ts
/**
* @internal
*/
function serializeParams(params) {
  if (params == null) return "";
  return Object.entries(params).map(([key, value]) => {
    if (value === true) return `;${serializeKey(key)}`;
    return `;${serializeKey(key)}=${serializeBareItem(value)}`;
  }).join("");
}

//#endregion
//#region src/serialize/serializeItem.ts
/**
* @internal
*/
function serializeItem(value) {
  if (value instanceof SfItem) return `${serializeBareItem(value.value)}${serializeParams(value.params)}`;else return serializeBareItem(value);
}

//#endregion
//#region src/serialize/serializeInnerList.ts
/**
* @internal
*/
function serializeInnerList(value) {
  return `(${value.value.map(serializeItem).join(" ")})${serializeParams(value.params)}`;
}

//#endregion
//#region src/serialize/serializeDict.ts
/**
* @internal
*/
function serializeDict(dict, options = {
  whitespace: true
}) {
  if (typeof dict !== "object" || dict == null) throw serializeError(dict, DICT);
  const entries = dict instanceof Map ? dict.entries() : Object.entries(dict);
  const optionalWhiteSpace = options?.whitespace ? " " : "";
  return Array.from(entries).map(([key, item]) => {
    if (item instanceof SfItem === false) item = new SfItem(item);
    let output = serializeKey(key);
    if (item.value === true) output += serializeParams(item.params);else {
      output += "=";
      if (Array.isArray(item.value)) output += serializeInnerList(item);else output += serializeItem(item);
    }
    return output;
  }).join(`,${optionalWhiteSpace}`);
}

//#endregion
//#region src/encodeSfDict.ts
/**
* Encode an object into a structured field dictionary
*
* @param value - The structured field dictionary to encode
* @param options - Encoding options
*
* @returns The structured field string
*
* @public
*/
function encodeSfDict(value, options) {
  return serializeDict(value, options);
}

//#endregion
//#region src/encodeSfItem.ts
function encodeSfItem(value, params) {
  if (!(value instanceof SfItem)) value = new SfItem(value, params);
  return serializeItem(value);
}

//#endregion
//#region src/serialize/serializeList.ts
/**
* @internal
*/
function serializeList(list, options = {
  whitespace: true
}) {
  if (Array.isArray(list) === false) throw serializeError(list, LIST);
  const optionalWhiteSpace = options?.whitespace ? " " : "";
  return list.map(item => {
    if (item instanceof SfItem === false) item = new SfItem(item);
    const i = item;
    if (Array.isArray(i.value)) return serializeInnerList(i);
    return serializeItem(i);
  }).join(`,${optionalWhiteSpace}`);
}

//#endregion
//#region src/encodeSfList.ts
/**
* Encode a list into a structured field dictionary
*
* @param value - The structured field list to encode
* @param options - Encoding options
*
* @returns The structured field string
*
* @public
*/
function encodeSfList(value, options) {
  return serializeList(value, options);
}

//#endregion


/***/ }),

/***/ "./node_modules/@svta/cml-utils/dist/index.js":
/*!****************************************************!*\
  !*** ./node_modules/@svta/cml-utils/dist/index.js ***!
  \****************************************************/
/***/ (function(__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   Encoding: function() { return /* binding */ Encoding; },
/* harmony export */   RequestResponseType: function() { return /* binding */ RequestResponseType; },
/* harmony export */   UTF_16: function() { return /* binding */ UTF_16; },
/* harmony export */   UTF_16_BE: function() { return /* binding */ UTF_16_BE; },
/* harmony export */   UTF_16_LE: function() { return /* binding */ UTF_16_LE; },
/* harmony export */   UTF_8: function() { return /* binding */ UTF_8; },
/* harmony export */   arrayBufferToHex: function() { return /* binding */ arrayBufferToHex; },
/* harmony export */   arrayBufferToUuid: function() { return /* binding */ arrayBufferToUuid; },
/* harmony export */   base64decode: function() { return /* binding */ base64decode; },
/* harmony export */   base64encode: function() { return /* binding */ base64encode; },
/* harmony export */   convertUint8ToUint16: function() { return /* binding */ convertUint8ToUint16; },
/* harmony export */   decodeBase64: function() { return /* binding */ decodeBase64; },
/* harmony export */   decodeText: function() { return /* binding */ decodeText; },
/* harmony export */   encodeBase64: function() { return /* binding */ encodeBase64; },
/* harmony export */   encodeText: function() { return /* binding */ encodeText; },
/* harmony export */   getBandwidthBps: function() { return /* binding */ getBandwidthBps; },
/* harmony export */   getBaseUrl: function() { return /* binding */ getBaseUrl; },
/* harmony export */   hexToArrayBuffer: function() { return /* binding */ hexToArrayBuffer; },
/* harmony export */   isArrayBufferLike: function() { return /* binding */ isArrayBufferLike; },
/* harmony export */   roundToEven: function() { return /* binding */ roundToEven; },
/* harmony export */   stringToUint16: function() { return /* binding */ stringToUint16; },
/* harmony export */   unescapeHtml: function() { return /* binding */ unescapeHtml; },
/* harmony export */   urlToRelativePath: function() { return /* binding */ urlToRelativePath; },
/* harmony export */   uuid: function() { return /* binding */ uuid; },
/* harmony export */   uuidToArrayBuffer: function() { return /* binding */ uuidToArrayBuffer; }
/* harmony export */ });
//#region src/arrayBufferToHex.ts
/**
* Encodes an ArrayBuffer as a hexadecimal string.
*
* @param buffer - The ArrayBuffer to encode.
* @returns The hexadecimal string representation.
*
* @public
*
* @example
* {@includeCode ../test/arrayBufferToHex.test.ts#example}
*/
function arrayBufferToHex(buffer) {
  return new Uint8Array(buffer).reduce((result, byte) => result + byte.toString(16).padStart(2, "0"), "");
}

//#endregion
//#region src/arrayBufferToUuid.ts
/**
* Converts an ArrayBuffer to a UUID string.
*
* @param buffer - The ArrayBuffer to convert.
* @returns The UUID string representation.
*
* @public
*
* @example
* {@includeCode ../test/arrayBufferToUuid.test.ts#example}
*/
function arrayBufferToUuid(buffer) {
  return arrayBufferToHex(buffer).replace(/(.{8})(.{4})(.{4})(.{4})(.{12})/, "$1-$2-$3-$4-$5");
}

//#endregion
//#region src/decodeBase64.ts
/**
* Decodes a base64 encoded string into binary data
*
* @param str - The base64 encoded string to decode
* @returns The decoded binary data
*
* @public
*/
function decodeBase64(str) {
  return new Uint8Array([...atob(str)].map(a => a.charCodeAt(0)));
}

//#endregion
//#region src/base64decode.ts
/**
* Decodes a base64 encoded string into binary data
*
* @param str - The base64 encoded string to decode
* @returns The decoded binary data
*
* @public
*
* @deprecated Use {@link decodeBase64} instead.
*
* @see {@link decodeBase64}
*/
const base64decode = decodeBase64;

//#endregion
//#region src/encodeBase64.ts
/**
* Encodes binary data to base64
*
* @param binary - The binary data to encode
* @returns The base64 encoded string
*
* @public
*/
function encodeBase64(binary) {
  return btoa(String.fromCharCode(...binary));
}

//#endregion
//#region src/base64encode.ts
/**
* Encodes binary data to base64
*
* @param binary - The binary data to encode
* @returns The base64 encoded string
*
* @public
*
* @deprecated Use {@link encodeBase64} instead.
*
* @see {@link encodeBase64}
*/
const base64encode = encodeBase64;

//#endregion
//#region src/convertUint8ToUint16.ts
/**
* Converts a Uint8Array to a Uint16Array by aligning its buffer.
*
* @param input - The Uint8Array to convert
* @returns A properly aligned Uint16Array
*
* @public
*/
function convertUint8ToUint16(input) {
  if (input.length % 2 !== 0) {
    const padded = new Uint8Array(input.length + 1);
    padded.set(input);
    return new Uint16Array(padded.buffer);
  }
  return new Uint16Array(input.buffer);
}

//#endregion
//#region src/isArrayBufferLike.ts
/**
* Checks if the given value is `ArrayBufferLike` (i.e. an `ArrayBuffer`
* or a `SharedArrayBuffer`).
*
* This function safely handles environments where
* `SharedArrayBuffer` is not defined, such as non-cross-origin
* isolated browser contexts.
*
* @param value - The value to check.
* @returns `true` if the value is an `ArrayBuffer` or `SharedArrayBuffer`.
*
* @public
*
* @example
* {@includeCode ../test/isArrayBufferLike.test.ts#example}
*/
function isArrayBufferLike(value) {
  return value instanceof ArrayBuffer || typeof SharedArrayBuffer !== "undefined" && value instanceof SharedArrayBuffer;
}

//#endregion
//#region src/UTF_16.ts
/**
* UTF-16 Encoding.
*
* @public
*/
const UTF_16 = "utf-16";

//#endregion
//#region src/UTF_16_BE.ts
/**
* UTF-16 Big Endian Encoding.
*
* @public
*/
const UTF_16_BE = "utf-16be";

//#endregion
//#region src/UTF_16_LE.ts
/**
* UTF-16 Little Endian Encoding.
*
* @public
*/
const UTF_16_LE = "utf-16le";

//#endregion
//#region src/UTF_8.ts
/**
* UTF-8 Encoding.
*
* @public
*/
const UTF_8 = "utf-8";

//#endregion
//#region src/decodeText.ts
/**
* Converts an ArrayBuffer or ArrayBufferView to a string. Similar to `TextDecoder.decode`
* but with a fallback for environments that don't support `TextDecoder`.
*
* @param data - The data to decode.
* @param options - The options for the decoding.
* @returns The string representation of the ArrayBuffer.
*
* @public
*
* @example
* {@includeCode ../test/decodeText.test.ts#example}
*/
function decodeText(data, options = {}) {
  let view;
  if (isArrayBufferLike(data)) view = new DataView(data);else view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  let byteOffset = 0;
  let {
    encoding
  } = options;
  if (!encoding) {
    const first = view.getUint8(0);
    const second = view.getUint8(1);
    if (first == 239 && second == 187 && view.getUint8(2) == 191) {
      encoding = UTF_8;
      byteOffset = 3;
    } else if (first == 254 && second == 255) {
      encoding = UTF_16_BE;
      byteOffset = 2;
    } else if (first == 255 && second == 254) {
      encoding = UTF_16_LE;
      byteOffset = 2;
    } else encoding = UTF_8;
  }
  if (typeof TextDecoder !== "undefined") return new TextDecoder(encoding).decode(view);
  const {
    byteLength
  } = view;
  const endian = encoding !== UTF_16_BE;
  let str = "";
  let char;
  while (byteOffset < byteLength) {
    switch (encoding) {
      case UTF_8:
        char = view.getUint8(byteOffset);
        if (char < 128) byteOffset++;else if (char >= 194 && char <= 223) {
          if (byteOffset + 1 < byteLength) {
            const byte2 = view.getUint8(byteOffset + 1);
            if (byte2 >= 128 && byte2 <= 191) {
              char = (char & 31) << 6 | byte2 & 63;
              byteOffset += 2;
            } else byteOffset++;
          } else byteOffset++;
        } else if (char >= 224 && char <= 239) {
          if (byteOffset + 2 <= byteLength - 1) {
            const byte2 = view.getUint8(byteOffset + 1);
            const byte3 = view.getUint8(byteOffset + 2);
            if (byte2 >= 128 && byte2 <= 191 && byte3 >= 128 && byte3 <= 191) {
              char = (char & 15) << 12 | (byte2 & 63) << 6 | byte3 & 63;
              byteOffset += 3;
            } else byteOffset++;
          } else byteOffset++;
        } else if (char >= 240 && char <= 244) {
          if (byteOffset + 3 <= byteLength - 1) {
            const byte2 = view.getUint8(byteOffset + 1);
            const byte3 = view.getUint8(byteOffset + 2);
            const byte4 = view.getUint8(byteOffset + 3);
            if (byte2 >= 128 && byte2 <= 191 && byte3 >= 128 && byte3 <= 191 && byte4 >= 128 && byte4 <= 191) {
              char = (char & 7) << 18 | (byte2 & 63) << 12 | (byte3 & 63) << 6 | byte4 & 63;
              byteOffset += 4;
            } else byteOffset++;
          } else byteOffset++;
        } else byteOffset++;
        break;
      case UTF_16_BE:
      case UTF_16:
      case UTF_16_LE:
        char = view.getUint16(byteOffset, endian);
        byteOffset += 2;
        break;
    }
    str += String.fromCodePoint(char);
  }
  return str;
}

//#endregion
//#region src/encodeText.ts
/**
* Converts a string to a Uint8Array. Similar to `TextEncoder.encode`
* but with a fallback for environments that don't support `TextEncoder`.
*
* @param data - The string to encode.
* @returns The Uint8Array representation of the string.
*
* @public
*
* @example
* {@includeCode ../test/encodeText.test.ts#example}
*/
function encodeText(data) {
  return new TextEncoder().encode(data);
}

//#endregion
//#region src/Encoding.ts
/**
* Text encoding types.
*
* @public
*/
const Encoding = {
  UTF8: UTF_8,
  UTF16: UTF_16,
  UTF16BE: UTF_16_BE,
  UTF16LE: UTF_16_LE
};

//#endregion
//#region src/getBandwidthBps.ts
/**
* Converts a ResourceTiming sample to bandwidth in bits per second (bps).
*
* @param sample - A ResourceTiming sample
* @returns
*
* @public
*/
function getBandwidthBps(sample) {
  const durationSeconds = sample.duration / 1e3;
  return sample.encodedBodySize * 8 / durationSeconds;
}

//#endregion
//#region src/getBaseUrl.ts
/**
* Get the base URL from a full URL or a URL object.
*
* @param fullUrl - The full URL or URL object.
* @returns The base URL.
*
* @public
*
* @example
* {@includeCode ../test/getBaseUrl.test.ts#example}
*/
function getBaseUrl(fullUrl) {
  const url = typeof fullUrl === "string" ? new URL(fullUrl) : fullUrl;
  return url.origin + url.pathname.substring(0, url.pathname.lastIndexOf("/") + 1);
}

//#endregion
//#region src/hexToArrayBuffer.ts
/**
* Decodes a hexadecimal string into an ArrayBuffer.
*
* @param hex - The hexadecimal string to decode.
* @returns The decoded ArrayBuffer.
*
* @public
*
* @example
* {@includeCode ../test/hexToArrayBuffer.test.ts#example}
*/
function hexToArrayBuffer(hex) {
  const buffer = /* @__PURE__ */new ArrayBuffer(hex.length / 2);
  const view = new Uint8Array(buffer);
  for (let i = 0; i < hex.length; i += 2) view[i / 2] = parseInt(hex.slice(i, i + 2), 16);
  return buffer;
}

//#endregion
//#region src/RequestResponseType.ts
/**
* The response type of the request.
*
* @enum
*
* @public
*/
const RequestResponseType = {
  TEXT: "text",
  JSON: "json",
  BLOB: "blob",
  ARRAY_BUFFER: "arrayBuffer",
  DOCUMENT: "document",
  STREAM: "stream"
};

//#endregion
//#region src/roundToEven.ts
/**
* This implements the rounding procedure described in step 2 of the "Serializing a Decimal" specification.
* This rounding style is known as "even rounding", "banker's rounding", or "commercial rounding".
*
* @param value - The value to round
* @param precision - The number of decimal places to round to
* @returns The rounded value
*
* @public
*/
function roundToEven(value, precision) {
  if (value < 0) return -roundToEven(-value, precision);
  const decimalShift = Math.pow(10, precision);
  if (Math.abs(value * decimalShift % 1 - .5) < Number.EPSILON) {
    const flooredValue = Math.floor(value * decimalShift);
    return (flooredValue % 2 === 0 ? flooredValue : flooredValue + 1) / decimalShift;
  } else return Math.round(value * decimalShift) / decimalShift;
}

//#endregion
//#region src/stringToUint16.ts
/**
* Converts a string to a Uint16Array.
*
* @param str - The string to convert
* @returns A Uint16Array representation of the string
*
* @public
*
* @example
* {@includeCode ../test/stringToUint16.test.ts#example}
*/
function stringToUint16(str) {
  const buffer = /* @__PURE__ */new ArrayBuffer(str.length * 2);
  const view = new DataView(buffer);
  for (let i = 0; i < str.length; i++) view.setUint16(i * 2, str.charCodeAt(i), true);
  return new Uint16Array(buffer);
}

//#endregion
//#region src/unescapeHtml.ts
const escapedHtml = /&(?:amp|lt|gt|quot|apos|nbsp|lrm|rlm|#[xX]?[0-9a-fA-F]+);/g;
/**
* Unescapes HTML entities
*
* @param text - The text to unescape
* @returns The unescaped text
*
* @public
*
* @example
* {@includeCode ../test/unescapeHtml.test.ts#example}
*/
function unescapeHtml(text) {
  if (text.indexOf("&") === -1) return text;
  return text.replace(escapedHtml, match => {
    switch (match) {
      case "&amp;":
        return "&";
      case "&lt;":
        return "<";
      case "&gt;":
        return ">";
      case "&quot;":
        return "\"";
      case "&apos;":
        return "'";
      case "&nbsp;":
        return "\xA0";
      case "&lrm;":
        return "‎";
      case "&rlm;":
        return "‏";
      default:
        if (match[1] === "#") {
          const code = match[2] === "x" || match[2] === "X" ? parseInt(match.slice(3), 16) : parseInt(match.slice(2), 10);
          return String.fromCodePoint(code);
        }
        return match;
    }
  });
}

//#endregion
//#region src/urlToRelativePath.ts
/**
* Constructs a relative path from a URL.
*
* If `url` is already a relative path, or its origin differs from `base`, it is returned unchanged.
*
* @param url - The destination URL
* @param base - The base URL
* @returns The relative path
*
* @public
*
* @example
* {@includeCode ../test/urlToRelativePath.test.ts#example}
*/
function urlToRelativePath(url, base) {
  let to;
  try {
    to = new URL(url);
  } catch {
    return url;
  }
  const from = new URL(base);
  if (to.origin !== from.origin) return url;
  const toPath = to.pathname.split("/").slice(1);
  const fromPath = from.pathname.split("/").slice(1, -1);
  const length = Math.min(toPath.length, fromPath.length);
  for (let i = 0; i < length; i++) {
    if (toPath[i] !== fromPath[i]) break;
    toPath.shift();
    fromPath.shift();
  }
  while (fromPath.length) {
    fromPath.shift();
    toPath.unshift("..");
  }
  return toPath.join("/") + to.search + to.hash;
}

//#endregion
//#region src/uuid.ts
/**
* Generate a random v4 UUID
*
* @returns A random v4 UUID
*
* @public
*/
function uuid() {
  try {
    return crypto.randomUUID();
  } catch (error) {
    try {
      const url = URL.createObjectURL(new Blob());
      const uuid$1 = url.toString();
      URL.revokeObjectURL(url);
      return uuid$1.slice(uuid$1.lastIndexOf("/") + 1);
    } catch (error$1) {
      let dt = (/* @__PURE__ */new Date()).getTime();
      return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => {
        const r = (dt + Math.random() * 16) % 16 | 0;
        dt = Math.floor(dt / 16);
        return (c == "x" ? r : r & 3 | 8).toString(16);
      });
    }
  }
}

//#endregion
//#region src/uuidToArrayBuffer.ts
/**
* Converts a UUID string to an ArrayBuffer.
*
* @param uuid - The UUID string to convert.
* @returns The ArrayBuffer representation.
*
* @public
*
* @example
* {@includeCode ../test/uuidToArrayBuffer.test.ts#example}
*/
function uuidToArrayBuffer(uuid$1) {
  return hexToArrayBuffer(uuid$1.replace(/-/g, ""));
}

//#endregion


/***/ }),

/***/ "./src/core/FactoryMaker.js":
/*!**********************************!*\
  !*** ./src/core/FactoryMaker.js ***!
  \**********************************/
/***/ (function(__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/**
 * The copyright in this software is being made available under the BSD License,
 * included below. This software may be subject to other third party and contributor
 * rights, including patent rights, and no such rights are granted under this license.
 *
 * Copyright (c) 2013, Dash Industry Forum.
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without modification,
 * are permitted provided that the following conditions are met:
 *  * Redistributions of source code must retain the above copyright notice, this
 *  list of conditions and the following disclaimer.
 *  * Redistributions in binary form must reproduce the above copyright notice,
 *  this list of conditions and the following disclaimer in the documentation and/or
 *  other materials provided with the distribution.
 *  * Neither the name of Dash Industry Forum nor the names of its
 *  contributors may be used to endorse or promote products derived from this software
 *  without specific prior written permission.
 *
 *  THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS AS IS AND ANY
 *  EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 *  WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED.
 *  IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT,
 *  INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT
 *  NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
 *  PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY,
 *  WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
 *  ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
 *  POSSIBILITY OF SUCH DAMAGE.
 */
/**
 * @module FactoryMaker
 * @ignore
 */
const FactoryMaker = function () {
  let instance;
  let singletonContexts = [];
  const singletonFactories = {};
  const classFactories = {};
  function extend(name, childInstance, override, context) {
    if (!context[name] && childInstance) {
      context[name] = {
        instance: childInstance,
        override: override
      };
    }
  }

  /**
   * Use this method from your extended object.  this.factory is injected into your object.
   * this.factory.getSingletonInstance(this.context, 'VideoModel')
   * will return the video model for use in the extended object.
   *
   * @param {Object} context - injected into extended object as this.context
   * @param {string} className - string name found in all dash.js objects
   * with name __dashjs_factory_name Will be at the bottom. Will be the same as the object's name.
   * @returns {*} Context aware instance of specified singleton name.
   * @memberof module:FactoryMaker
   * @instance
   */
  function getSingletonInstance(context, className) {
    for (const i in singletonContexts) {
      const obj = singletonContexts[i];
      if (obj.context === context && obj.name === className) {
        return obj.instance;
      }
    }
    return null;
  }

  /**
   * Use this method to add an singleton instance to the system.  Useful for unit testing to mock objects etc.
   *
   * @param {Object} context
   * @param {string} className
   * @param {Object} instance
   * @memberof module:FactoryMaker
   * @instance
   */
  function setSingletonInstance(context, className, instance) {
    for (const i in singletonContexts) {
      const obj = singletonContexts[i];
      if (obj.context === context && obj.name === className) {
        singletonContexts[i].instance = instance;
        return;
      }
    }
    singletonContexts.push({
      name: className,
      context: context,
      instance: instance
    });
  }

  /**
   * Use this method to remove all singleton instances associated with a particular context.
   *
   * @param {Object} context
   * @memberof module:FactoryMaker
   * @instance
   */
  function deleteSingletonInstances(context) {
    singletonContexts = singletonContexts.filter(x => x.context !== context);
  }

  /*------------------------------------------------------------------------------------------*/

  // Factories storage Management

  /*------------------------------------------------------------------------------------------*/

  function getFactoryByName(name, factoriesArray) {
    return factoriesArray[name];
  }
  function updateFactory(name, factory, factoriesArray) {
    if (name in factoriesArray) {
      factoriesArray[name] = factory;
    }
  }

  /*------------------------------------------------------------------------------------------*/

  // Class Factories Management

  /*------------------------------------------------------------------------------------------*/

  function updateClassFactory(name, factory) {
    updateFactory(name, factory, classFactories);
  }
  function getClassFactoryByName(name) {
    return getFactoryByName(name, classFactories);
  }
  function getClassFactory(classConstructor) {
    let factory = getFactoryByName(classConstructor.__dashjs_factory_name, classFactories);
    if (!factory) {
      factory = function (context) {
        if (context === undefined) {
          context = {};
        }
        return {
          create: function () {
            return merge(classConstructor, context, arguments);
          }
        };
      };
      classFactories[classConstructor.__dashjs_factory_name] = factory; // store factory
    }
    return factory;
  }

  /*------------------------------------------------------------------------------------------*/

  // Singleton Factory MAangement

  /*------------------------------------------------------------------------------------------*/

  function updateSingletonFactory(name, factory) {
    updateFactory(name, factory, singletonFactories);
  }
  function getSingletonFactoryByName(name) {
    return getFactoryByName(name, singletonFactories);
  }
  function getSingletonFactory(classConstructor) {
    let factory = getFactoryByName(classConstructor.__dashjs_factory_name, singletonFactories);
    if (!factory) {
      factory = function (context) {
        let instance;
        if (context === undefined) {
          context = {};
        }
        return {
          getInstance: function () {
            // If we don't have an instance yet check for one on the context
            if (!instance) {
              instance = getSingletonInstance(context, classConstructor.__dashjs_factory_name);
            }
            // If there's no instance on the context then create one
            if (!instance) {
              instance = merge(classConstructor, context, arguments);
              singletonContexts.push({
                name: classConstructor.__dashjs_factory_name,
                context: context,
                instance: instance
              });
            }
            return instance;
          }
        };
      };
      singletonFactories[classConstructor.__dashjs_factory_name] = factory; // store factory
    }
    return factory;
  }
  function merge(classConstructor, context, args) {
    let classInstance;
    const className = classConstructor.__dashjs_factory_name;
    const extensionObject = context[className];
    if (extensionObject) {
      let extension = extensionObject.instance;
      if (extensionObject.override) {
        //Override public methods in parent but keep parent.

        classInstance = classConstructor.apply({
          context
        }, args);
        extension = extension.apply({
          context,
          factory: instance,
          parent: classInstance
        }, args);
        for (const prop in extension) {
          if (classInstance.hasOwnProperty(prop)) {
            classInstance[prop] = extension[prop];
          }
        }
      } else {
        //replace parent object completely with new object. Same as dijon.

        return extension.apply({
          context,
          factory: instance
        }, args);
      }
    } else {
      // Create new instance of the class
      classInstance = classConstructor.apply({
        context
      }, args);
    }

    // Add getClassName function to class instance prototype (used by Debug)
    classInstance.getClassName = function () {
      return className;
    };
    return classInstance;
  }
  instance = {
    deleteSingletonInstances,
    extend,
    getClassFactory,
    getClassFactoryByName,
    getSingletonFactory,
    getSingletonFactoryByName,
    getSingletonInstance,
    setSingletonInstance,
    updateClassFactory,
    updateSingletonFactory
  };
  return instance;
}();
/* harmony default export */ __webpack_exports__["default"] = (FactoryMaker);

/***/ }),

/***/ "./src/core/Utils.js":
/*!***************************!*\
  !*** ./src/core/Utils.js ***!
  \***************************/
/***/ (function(__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony import */ var path_browserify__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! path-browserify */ "./node_modules/path-browserify/index.js");
/* harmony import */ var _streaming_constants_Constants_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../streaming/constants/Constants.js */ "./src/streaming/constants/Constants.js");
/**
 * The copyright in this software is being made available under the BSD License,
 * included below. This software may be subject to other third party and contributor
 * rights, including patent rights, and no such rights are granted under this license.
 *
 * Copyright (c) 2013, Dash Industry Forum.
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without modification,
 * are permitted provided that the following conditions are met:
 *  * Redistributions of source code must retain the above copyright notice, this
 *  list of conditions and the following disclaimer.
 *  * Redistributions in binary form must reproduce the above copyright notice,
 *  this list of conditions and the following disclaimer in the documentation and/or
 *  other materials provided with the distribution.
 *  * Neither the name of Dash Industry Forum nor the names of its
 *  contributors may be used to endorse or promote products derived from this software
 *  without specific prior written permission.
 *
 *  THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS AS IS AND ANY
 *  EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 *  WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED.
 *  IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT,
 *  INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT
 *  NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
 *  PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY,
 *  WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
 *  ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
 *  POSSIBILITY OF SUCH DAMAGE.
 */

/**
 * @class
 * @ignore
 */



class Utils {
  static mixin(dest, source, copy) {
    let s;
    let empty = {};
    if (dest) {
      for (let name in source) {
        if (source.hasOwnProperty(name)) {
          s = source[name];
          if (!(name in dest) || dest[name] !== s && (!(name in empty) || empty[name] !== s)) {
            if (typeof dest[name] === 'object' && dest[name] !== null) {
              dest[name] = Utils.mixin(dest[name], s, copy);
            } else {
              dest[name] = copy(s);
            }
          }
        }
      }
    }
    return dest;
  }
  static clone(src) {
    if (!src || typeof src !== 'object') {
      return src; // anything
    }
    if (src instanceof RegExp) {
      return new RegExp(src);
    }
    let r;
    if (src instanceof Array) {
      // array
      r = [];
      for (let i = 0, l = src.length; i < l; ++i) {
        if (i in src) {
          r.push(Utils.clone(src[i]));
        }
      }
    } else {
      r = {};
    }
    return Utils.mixin(r, src, Utils.clone);
  }
  static addAdditionalQueryParameterToUrl(url, params) {
    try {
      if (!params || params.length === 0) {
        return url;
      }
      let updatedUrl = url;
      params.forEach(({
        key,
        value
      }) => {
        const separator = updatedUrl.includes('?') ? '&' : '?';
        updatedUrl += `${separator}${encodeURIComponent(key)}=${encodeURIComponent(value)}`;
      });
      return updatedUrl;
    } catch (e) {
      return url;
    }
  }
  static removeQueryParameterFromUrl(url, queryParameter) {
    if (!url || !queryParameter) {
      return url;
    }
    // Parse the URL
    const parsedUrl = new URL(url);

    // Get the search parameters
    const params = new URLSearchParams(parsedUrl.search);
    if (!params || params.size === 0 || !params.has(queryParameter)) {
      return url;
    }

    // Remove the queryParameter
    params.delete(queryParameter);

    // Manually reconstruct the query string without re-encoding
    const queryString = Array.from(params.entries()).map(([key, value]) => `${key}=${value}`).join('&');

    // Reconstruct the URL
    const baseUrl = `${parsedUrl.origin}${parsedUrl.pathname}`;
    return queryString ? `${baseUrl}?${queryString}` : baseUrl;
  }
  static parseHttpHeaders(headerStr) {
    let headers = {};
    if (!headerStr) {
      return headers;
    }

    // Trim headerStr to fix a MS Edge bug with xhr.getAllResponseHeaders method
    // which send a string starting with a "\n" character
    let headerPairs = headerStr.trim().split('\u000d\u000a');
    for (let i = 0, ilen = headerPairs.length; i < ilen; i++) {
      let headerPair = headerPairs[i];
      let index = headerPair.indexOf('\u003a\u0020');
      if (index > 0) {
        headers[headerPair.substring(0, index)] = headerPair.substring(index + 2);
      }
    }
    return headers;
  }

  /**
   * Parses query parameters from a string and returns them as an array of key-value pairs.
   * @param {string} queryParamString - A string containing the query parameters.
   * @return {Array<{key: string, value: string}>} An array of objects representing the query parameters.
   */
  static parseQueryParams(queryParamString) {
    const params = [];
    const searchParams = new URLSearchParams(queryParamString);
    for (const [key, value] of searchParams.entries()) {
      params.push({
        key: decodeURIComponent(key),
        value: decodeURIComponent(value)
      });
    }
    return params;
  }
  static generateUuid() {
    let dt = new Date().getTime();
    const uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      const r = (dt + Math.random() * 16) % 16 | 0;
      dt = Math.floor(dt / 16);
      return (c == 'x' ? r : r & 0x3 | 0x8).toString(16);
    });
    return uuid;
  }
  static generateHashCode(string) {
    let hash = 0;
    if (string.length === 0) {
      return hash;
    }
    for (let i = 0; i < string.length; i++) {
      const chr = string.charCodeAt(i);
      hash = (hash << 5) - hash + chr;
      hash |= 0;
    }
    return hash;
  }

  /**
   * Compares both urls and returns a relative url (target relative to original)
   * @param {string} originalUrl
   * @param {string} targetUrl
   * @return {string|*}
   */
  static getRelativeUrl(originalUrl, targetUrl) {
    try {
      const original = new URL(originalUrl);
      const target = new URL(targetUrl);

      // Unify the protocol to compare the origins
      original.protocol = target.protocol;
      if (original.origin !== target.origin) {
        return targetUrl;
      }

      // Use the relative path implementation of the path library. We need to cut off the actual filename in the end to get the relative path
      let relativePath = path_browserify__WEBPACK_IMPORTED_MODULE_0__.relative(original.pathname.substr(0, original.pathname.lastIndexOf('/')), target.pathname.substr(0, target.pathname.lastIndexOf('/')));

      // In case the relative path is empty (both path are equal) return the filename only. Otherwise add a slash in front of the filename
      const startIndexOffset = relativePath.length === 0 ? 1 : 0;
      relativePath += target.pathname.substr(target.pathname.lastIndexOf('/') + startIndexOffset, target.pathname.length - 1);

      // Build the other candidate, e.g. the 'host relative' path that starts with "/", and return the shortest of the two candidates.
      if (target.pathname.length < relativePath.length) {
        return target.pathname;
      }
      return relativePath;
    } catch (e) {
      return targetUrl;
    }
  }
  static getHostFromUrl(urlString) {
    try {
      const url = new URL(urlString);
      return url.host;
    } catch (e) {
      return null;
    }
  }
  static parseUserAgent(ua = null) {
    try {
      const uaString = typeof ua === 'string' ? ua.toLowerCase() : typeof navigator !== 'undefined' && navigator.userAgent ? navigator.userAgent.toLowerCase() : '';
      const browser = {
        name: ''
      };
      if (/edg/.test(uaString)) {
        browser.name = 'edge';
      } else if (/opr|opios/.test(uaString)) {
        browser.name = 'opera';
      } else if (/chrome|crios/.test(uaString)) {
        browser.name = 'chrome';
      } else if (/firefox|fxios/.test(uaString)) {
        browser.name = 'firefox';
      } else if (/safari/.test(uaString)) {
        browser.name = 'safari';
      }
      return {
        browser
      };
    } catch (e) {
      return {};
    }
  }

  /**
   * Checks for existence of "http" or "https" in a string
   * @param string
   * @returns {boolean}
   */
  static stringHasProtocol(string) {
    return /(http(s?)):\/\//i.test(string);
  }
  static bufferSourceToDataView(bufferSource) {
    return Utils.toDataView(bufferSource, DataView);
  }
  static bufferSourceToInt8(bufferSource) {
    return Utils.toDataView(bufferSource, Uint8Array);
  }
  static uint8ArrayToString(uint8Array) {
    const decoder = new TextDecoder('utf-8');
    return decoder.decode(uint8Array);
  }
  static bufferSourceToHex(data) {
    const arr = Utils.bufferSourceToInt8(data);
    let hex = '';
    for (let value of arr) {
      value = value.toString(16);
      if (value.length === 1) {
        value = '0' + value;
      }
      hex += value;
    }
    return hex;
  }
  static toDataView(bufferSource, Type) {
    const buffer = Utils.getArrayBuffer(bufferSource);
    let bytesPerElement = 1;
    if ('BYTES_PER_ELEMENT' in DataView) {
      bytesPerElement = DataView.BYTES_PER_ELEMENT;
    }
    const dataEnd = ((bufferSource.byteOffset || 0) + bufferSource.byteLength) / bytesPerElement;
    const rawStart = (bufferSource.byteOffset || 0) / bytesPerElement;
    const start = Math.floor(Math.max(0, Math.min(rawStart, dataEnd)));
    const end = Math.floor(Math.min(start + Math.max(Infinity, 0), dataEnd));
    return new Type(buffer, start, end - start);
  }
  static getArrayBuffer(view) {
    if (view instanceof ArrayBuffer) {
      return view;
    } else {
      return view.buffer;
    }
  }
  static getCodecFamily(codecString) {
    const {
      base,
      profile
    } = Utils._getCodecParts(codecString);
    switch (base) {
      case 'mp4a':
        switch (profile) {
          case '69':
          case '6b':
          case '40.34':
            return _streaming_constants_Constants_js__WEBPACK_IMPORTED_MODULE_1__["default"].CODEC_FAMILIES.MP3;
          case '66':
          case '67':
          case '68':
          case '40.2':
          case '40.02':
          case '40.5':
          case '40.05':
          case '40.29':
          case '40.42':
            return _streaming_constants_Constants_js__WEBPACK_IMPORTED_MODULE_1__["default"].CODEC_FAMILIES.AAC;
          case 'a5':
            return _streaming_constants_Constants_js__WEBPACK_IMPORTED_MODULE_1__["default"].CODEC_FAMILIES.AC3;
          case 'e6':
            return _streaming_constants_Constants_js__WEBPACK_IMPORTED_MODULE_1__["default"].CODEC_FAMILIES.EC3;
          case 'b2':
            return _streaming_constants_Constants_js__WEBPACK_IMPORTED_MODULE_1__["default"].CODEC_FAMILIES.DTSX;
          case 'a9':
            return _streaming_constants_Constants_js__WEBPACK_IMPORTED_MODULE_1__["default"].CODEC_FAMILIES.DTSC;
        }
        break;
      case 'avc1':
      case 'avc3':
        return _streaming_constants_Constants_js__WEBPACK_IMPORTED_MODULE_1__["default"].CODEC_FAMILIES.AVC;
      case 'hvc1':
      case 'hvc3':
        return _streaming_constants_Constants_js__WEBPACK_IMPORTED_MODULE_1__["default"].CODEC_FAMILIES.HEVC;
      default:
        return base;
    }
    return base;
  }
  static _getCodecParts(codecString) {
    const [base, ...rest] = codecString.split('.');
    const profile = rest.join('.');
    return {
      base,
      profile
    };
  }
}
/* harmony default export */ __webpack_exports__["default"] = (Utils);

/***/ }),

/***/ "./src/core/errors/ErrorsBase.js":
/*!***************************************!*\
  !*** ./src/core/errors/ErrorsBase.js ***!
  \***************************************/
/***/ (function(__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/**
 * The copyright in this software is being made available under the BSD License,
 * included below. This software may be subject to other third party and contributor
 * rights, including patent rights, and no such rights are granted under this license.
 *
 * Copyright (c) 2013, Dash Industry Forum.
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without modification,
 * are permitted provided that the following conditions are met:
 *  * Redistributions of source code must retain the above copyright notice, this
 *  list of conditions and the following disclaimer.
 *  * Redistributions in binary form must reproduce the above copyright notice,
 *  this list of conditions and the following disclaimer in the documentation and/or
 *  other materials provided with the distribution.
 *  * Neither the name of Dash Industry Forum nor the names of its
 *  contributors may be used to endorse or promote products derived from this software
 *  without specific prior written permission.
 *
 *  THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS AS IS AND ANY
 *  EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 *  WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED.
 *  IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT,
 *  INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT
 *  NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
 *  PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY,
 *  WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
 *  ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
 *  POSSIBILITY OF SUCH DAMAGE.
 */
/**
 * @class
 * @ignore
 */
class ErrorsBase {
  extend(errors, config) {
    if (!errors) {
      return;
    }
    let override = config ? config.override : false;
    let publicOnly = config ? config.publicOnly : false;
    for (const err in errors) {
      if (!errors.hasOwnProperty(err) || this[err] && !override) {
        continue;
      }
      if (publicOnly && errors[err].indexOf('public_') === -1) {
        continue;
      }
      this[err] = errors[err];
    }
  }
}
/* harmony default export */ __webpack_exports__["default"] = (ErrorsBase);

/***/ }),

/***/ "./src/core/events/EventsBase.js":
/*!***************************************!*\
  !*** ./src/core/events/EventsBase.js ***!
  \***************************************/
/***/ (function(__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/**
 * The copyright in this software is being made available under the BSD License,
 * included below. This software may be subject to other third party and contributor
 * rights, including patent rights, and no such rights are granted under this license.
 *
 * Copyright (c) 2013, Dash Industry Forum.
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without modification,
 * are permitted provided that the following conditions are met:
 *  * Redistributions of source code must retain the above copyright notice, this
 *  list of conditions and the following disclaimer.
 *  * Redistributions in binary form must reproduce the above copyright notice,
 *  this list of conditions and the following disclaimer in the documentation and/or
 *  other materials provided with the distribution.
 *  * Neither the name of Dash Industry Forum nor the names of its
 *  contributors may be used to endorse or promote products derived from this software
 *  without specific prior written permission.
 *
 *  THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS AS IS AND ANY
 *  EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 *  WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED.
 *  IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT,
 *  INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT
 *  NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
 *  PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY,
 *  WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
 *  ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
 *  POSSIBILITY OF SUCH DAMAGE.
 */
/**
 * @class
 * @ignore
 */
class EventsBase {
  extend(events, config) {
    if (!events) {
      return;
    }
    let override = config ? config.override : false;
    let publicOnly = config ? config.publicOnly : false;
    for (const evt in events) {
      if (!events.hasOwnProperty(evt) || this[evt] && !override) {
        continue;
      }
      if (publicOnly && events[evt].indexOf('public_') === -1) {
        continue;
      }
      this[evt] = events[evt];
    }
  }
}
/* harmony default export */ __webpack_exports__["default"] = (EventsBase);

/***/ }),

/***/ "./src/dash/constants/DashConstants.js":
/*!*********************************************!*\
  !*** ./src/dash/constants/DashConstants.js ***!
  \*********************************************/
/***/ (function(__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/**
 * The copyright in this software is being made available under the BSD License,
 * included below. This software may be subject to other third party and contributor
 * rights, including patent rights, and no such rights are granted under this license.
 *
 * Copyright (c) 2013, Dash Industry Forum.
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without modification,
 * are permitted provided that the following conditions are met:
 *  * Redistributions of source code must retain the above copyright notice, this
 *  list of conditions and the following disclaimer.
 *  * Redistributions in binary form must reproduce the above copyright notice,
 *  this list of conditions and the following disclaimer in the documentation and/or
 *  other materials provided with the distribution.
 *  * Neither the name of Dash Industry Forum nor the names of its
 *  contributors may be used to endorse or promote products derived from this software
 *  without specific prior written permission.
 *
 *  THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS AS IS AND ANY
 *  EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 *  WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED.
 *  IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT,
 *  INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT
 *  NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES, LOSS OF USE, DATA, OR
 *  PROFITS, OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY,
 *  WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
 *  ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
 *  POSSIBILITY OF SUCH DAMAGE.
 */

/**
 * Dash constants declaration
 * @ignore
 */
/* harmony default export */ __webpack_exports__["default"] = ({
  ACCESSIBILITY: 'Accessibility',
  ADAPTATION_SET: 'AdaptationSet',
  ADAPTATION_SETS: 'adaptationSets',
  ADAPTATION_SET_SWITCHING_SCHEME_ID_URI: 'urn:mpeg:dash:adaptation-set-switching:2016',
  ADD: 'add',
  ASSET_IDENTIFIER: 'AssetIdentifier',
  AUDIO_CHANNEL_CONFIGURATION: 'AudioChannelConfiguration',
  AUDIO_SAMPLING_RATE: 'audioSamplingRate',
  AVAILABILITY_END_TIME: 'availabilityEndTime',
  AVAILABILITY_START_TIME: 'availabilityStartTime',
  AVAILABILITY_TIME_COMPLETE: 'availabilityTimeComplete',
  AVAILABILITY_TIME_OFFSET: 'availabilityTimeOffset',
  BANDWITH: 'bandwidth',
  BASE_URL: 'BaseURL',
  BITSTREAM_SWITCHING: 'BitstreamSwitching',
  BITSTREAM_SWITCHING_MINUS: 'bitstreamSwitching',
  BYTE_RANGE: 'byteRange',
  CAPTION: 'caption',
  CENC_DEFAULT_KID: 'cenc:default_KID',
  CLIENT_DATA_REPORTING: 'ClientDataReporting',
  CLIENT_REQUIREMENT: 'clientRequirement',
  CMCD_PARAMETERS: 'CMCDParameters',
  CODECS: 'codecs',
  CODEC_PRIVATE_DATA: 'codecPrivateData',
  CODING_DEPENDENCY: 'codingDependency',
  CONTENT_COMPONENT: 'ContentComponent',
  CONTENT_PROTECTION: 'ContentProtection',
  CONTENT_STEERING: 'ContentSteering',
  CONTENT_STEERING_RESPONSE: {
    VERSION: 'VERSION',
    TTL: 'TTL',
    RELOAD_URI: 'RELOAD-URI',
    PATHWAY_PRIORITY: 'PATHWAY-PRIORITY',
    PATHWAY_CLONES: 'PATHWAY-CLONES',
    BASE_ID: 'BASE-ID',
    ID: 'ID',
    URI_REPLACEMENT: 'URI-REPLACEMENT',
    HOST: 'HOST',
    PARAMS: 'PARAMS'
  },
  CONTENT_TYPE: 'contentType',
  DEFAULT_SERVICE_LOCATION: 'defaultServiceLocation',
  DEPENDENCY_ID: 'dependencyId',
  DURATION: 'duration',
  DVB_PRIORITY: 'dvb:priority',
  DVB_WEIGHT: 'dvb:weight',
  DVB_URL: 'dvb:url',
  DVB_MIMETYPE: 'dvb:mimeType',
  DVB_FONTFAMILY: 'dvb:fontFamily',
  DYNAMIC: 'dynamic',
  END_NUMBER: 'endNumber',
  ESSENTIAL_PROPERTY: 'EssentialProperty',
  EVENT: 'Event',
  EVENT_STREAM: 'EventStream',
  FORCED_SUBTITLE: 'forced-subtitle',
  FRAMERATE: 'frameRate',
  FRAME_PACKING: 'FramePacking',
  GROUP_LABEL: 'GroupLabel',
  HEIGHT: 'height',
  ID: 'id',
  INBAND: 'inband',
  INBAND_EVENT_STREAM: 'InbandEventStream',
  INDEX: 'index',
  INDEX_RANGE: 'indexRange',
  INITIALIZATION: 'Initialization',
  INITIALIZATION_MINUS: 'initialization',
  K: 'k',
  LA_URL: 'Laurl',
  LA_URL_LOWER_CASE: 'laurl',
  CERT_URL: 'Certurl',
  LABEL: 'Label',
  LANG: 'lang',
  LOCATION: 'Location',
  MAIN: 'main',
  MAXIMUM_SAP_PERIOD: 'maximumSAPPeriod',
  MAX_PLAYOUT_RATE: 'maxPlayoutRate',
  MAX_SEGMENT_DURATION: 'maxSegmentDuration',
  MAX_SUBSEGMENT_DURATION: 'maxSubsegmentDuration',
  MEDIA: 'media',
  MEDIA_PRESENTATION_DURATION: 'mediaPresentationDuration',
  MEDIA_RANGE: 'mediaRange',
  MEDIA_STREAM_STRUCTURE_ID: 'mediaStreamStructureId',
  METRICS: 'Metrics',
  METRICS_MINUS: 'metrics',
  MIME_TYPE: 'mimeType',
  MINIMUM_UPDATE_PERIOD: 'minimumUpdatePeriod',
  MIN_BUFFER_TIME: 'minBufferTime',
  MP4_PROTECTION_SCHEME: 'urn:mpeg:dash:mp4protection:2011',
  MPD: 'MPD',
  MPD_TYPE: 'mpd',
  MPD_PATCH_TYPE: 'mpdpatch',
  ORDER: 'order',
  ORIGINAL_MPD_ID: 'mpdId',
  ORIGINAL_PUBLISH_TIME: 'originalPublishTime',
  PATCH_LOCATION: 'PatchLocation',
  PERIOD: 'Period',
  PRESELECTION: 'Preselection',
  PRESELECTION_COMPONENTS: 'preselectionComponents',
  PRESENTATION_TIME: 'presentationTime',
  PRESENTATION_TIME_OFFSET: 'presentationTimeOffset',
  PRO: 'pro',
  PRODUCER_REFERENCE_TIME: 'ProducerReferenceTime',
  PRODUCER_REFERENCE_TIME_TYPE: {
    ENCODER: 'encoder',
    CAPTURED: 'captured',
    APPLICATION: 'application'
  },
  PROFILES: 'profiles',
  PSSH: 'pssh',
  PUBLISH_TIME: 'publishTime',
  QUALITY_RANKING: 'qualityRanking',
  QUERY_BEFORE_START: 'queryBeforeStart',
  QUERY_PART: '$querypart$',
  RANGE: 'range',
  RATING: 'Rating',
  REF: 'ref',
  REF_ID: 'refId',
  REMOVE: 'remove',
  REPLACE: 'replace',
  REPORTING: 'Reporting',
  REPRESENTATION: 'Representation',
  REPRESENTATION_INDEX: 'RepresentationIndex',
  ROBUSTNESS: 'robustness',
  ROLE: 'Role',
  S: 'S',
  SAR: 'sar',
  SCAN_TYPE: 'scanType',
  SEGMENT_ALIGNMENT: 'segmentAlignment',
  SEGMENT_BASE: 'SegmentBase',
  SEGMENT_LIST: 'SegmentList',
  SEGMENT_PROFILES: 'segmentProfiles',
  SEGMENT_SEQUENCE_PROPERTIES: 'SegmentSequenceProperties',
  SEGMENT_TEMPLATE: 'SegmentTemplate',
  SEGMENT_TIMELINE: 'SegmentTimeline',
  SEGMENT_TYPE: 'segment',
  SEGMENT_URL: 'SegmentURL',
  SERVICE_DESCRIPTION: 'ServiceDescription',
  SERVICE_DESCRIPTION_LATENCY: 'Latency',
  SERVICE_DESCRIPTION_OPERATING_BANDWIDTH: 'OperatingBandwidth',
  SERVICE_DESCRIPTION_OPERATING_QUALITY: 'OperatingQuality',
  SERVICE_DESCRIPTION_PLAYBACK_RATE: 'PlaybackRate',
  SERVICE_DESCRIPTION_SCOPE: 'Scope',
  SERVICE_LOCATION: 'serviceLocation',
  SERVICE_LOCATIONS: 'serviceLocations',
  SOURCE_URL: 'sourceURL',
  START: 'start',
  START_NUMBER: 'startNumber',
  START_WITH_SAP: 'startWithSAP',
  STATIC: 'static',
  STEERING_TYPE: 'steering',
  SUBSET: 'Subset',
  SUBTITLE: 'subtitle',
  SUB_REPRESENTATION: 'SubRepresentation',
  SUB_SEGMENT_ALIGNMENT: 'subsegmentAlignment',
  SUGGESTED_PRESENTATION_DELAY: 'suggestedPresentationDelay',
  SUPPLEMENTAL_PROPERTY: 'SupplementalProperty',
  SUPPLEMENTAL_CODECS: 'scte214:supplementalCodecs',
  TAG: 'tag',
  TIMESCALE: 'timescale',
  TIMESHIFT_BUFFER_DEPTH: 'timeShiftBufferDepth',
  TTL: 'ttl',
  TYPE: 'type',
  UTC_TIMING: 'UTCTiming',
  VALUE: 'value',
  VIEWPOINT: 'Viewpoint',
  WALL_CLOCK_TIME: 'wallClockTime',
  WIDTH: 'width'
});

/***/ }),

/***/ "./src/streaming/constants/Constants.js":
/*!**********************************************!*\
  !*** ./src/streaming/constants/Constants.js ***!
  \**********************************************/
/***/ (function(__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony import */ var _svta_cml_cmcd__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @svta/cml-cmcd */ "./node_modules/@svta/cml-cmcd/dist/index.js");
/**
 * The copyright in this software is being made available under the BSD License,
 * included below. This software may be subject to other third party and contributor
 * rights, including patent rights, and no such rights are granted under this license.
 *
 * Copyright (c) 2013, Dash Industry Forum.
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without modification,
 * are permitted provided that the following conditions are met:
 *  * Redistributions of source code must retain the above copyright notice, this
 *  list of conditions and the following disclaimer.
 *  * Redistributions in binary form must reproduce the above copyright notice,
 *  this list of conditions and the following disclaimer in the documentation and/or
 *  other materials provided with the distribution.
 *  * Neither the name of Dash Industry Forum nor the names of its
 *  contributors may be used to endorse or promote products derived from this software
 *  without specific prior written permission.
 *
 *  THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS AS IS AND ANY
 *  EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 *  WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED.
 *  IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT,
 *  INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT
 *  NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
 *  PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY,
 *  WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
 *  ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
 *  POSSIBILITY OF SUCH DAMAGE.
 */


/**
 * Constants declaration
 */
/* harmony default export */ __webpack_exports__["default"] = ({
  /**
   *  @constant {string} STREAM Stream media type. Mainly used to report metrics relative to the full stream
   *  @memberof Constants#
   *  @static
   */
  STREAM: 'stream',
  /**
   *  @constant {string} VIDEO Video media type
   *  @memberof Constants#
   *  @static
   */
  VIDEO: 'video',
  /**
   *  @constant {string} ENHANCEMENT Enhancement media type
   *  @memberof Constants#
   *  @static
   */
  ENHANCEMENT: 'enhancement',
  /**
   *  @constant {string} AUDIO Audio media type
   *  @memberof Constants#
   *  @static
   */
  AUDIO: 'audio',
  /**
   *  @constant {string} TEXT Text media type
   *  @memberof Constants#
   *  @static
   */
  TEXT: 'text',
  /**
   *  @constant {string} MUXED Muxed (video/audio in the same chunk) media type
   *  @memberof Constants#
   *  @static
   */
  MUXED: 'muxed',
  /**
   *  @constant {string} IMAGE Image media type
   *  @memberof Constants#
   *  @static
   */
  IMAGE: 'image',
  /**
   *  @constant {string} STPP STTP Subtitles format
   *  @memberof Constants#
   *  @static
   */
  STPP: 'stpp',
  /**
   *  @constant {string} TTML STTP Subtitles format
   *  @memberof Constants#
   *  @static
   */
  TTML: 'ttml',
  /**
   *  @constant {string} VTT STTP Subtitles format
   *  @memberof Constants#
   *  @static
   */
  VTT: 'vtt',
  /**
   *  @constant {string} WVTT STTP Subtitles format
   *  @memberof Constants#
   *  @static
   */
  WVTT: 'wvtt',
  /**
   *  @constant {string} Content Steering
   *  @memberof Constants#
   *  @static
   */
  CONTENT_STEERING: 'contentSteering',
  /**
   *  @constant {string} LIVE_CATCHUP_MODE_DEFAULT Throughput calculation based on moof parsing
   *  @memberof Constants#
   *  @static
   */
  LIVE_CATCHUP_MODE_DEFAULT: 'liveCatchupModeDefault',
  /**
   *  @constant {string} LIVE_CATCHUP_MODE_LOLP Throughput calculation based on moof parsing
   *  @memberof Constants#
   *  @static
   */
  LIVE_CATCHUP_MODE_LOLP: 'liveCatchupModeLoLP',
  /**
   *  @constant {string} LIVE_CATCHUP_MODE_STEP Throughput calculation based on moof parsing
   *  @memberof Constants#
   *  @static
   */
  LIVE_CATCHUP_MODE_STEP: 'liveCatchupModeStep',
  /**
   *  @constant {string} MOVING_AVERAGE_SLIDING_WINDOW Moving average sliding window
   *  @memberof Constants#
   *  @static
   */
  MOVING_AVERAGE_SLIDING_WINDOW: 'slidingWindow',
  /**
   *  @constant {string} EWMA Exponential moving average
   *  @memberof Constants#
   *  @static
   */
  MOVING_AVERAGE_EWMA: 'ewma',
  /**
   *  @constant {string} BAD_ARGUMENT_ERROR Invalid Arguments type of error
   *  @memberof Constants#
   *  @static
   */
  BAD_ARGUMENT_ERROR: 'Invalid Arguments',
  /**
   *  @constant {string} MISSING_CONFIG_ERROR Missing configuration parameters type of error
   *  @memberof Constants#
   *  @static
   */
  MISSING_CONFIG_ERROR: 'Missing config parameter(s)',
  /**
   *  @constant {string} TRACK_SWITCH_MODE_ALWAYS_REPLACE used to clear the buffered data (prior to current playback position) after track switch. Default for audio
   *  @memberof Constants#
   *  @static
   */
  TRACK_SWITCH_MODE_ALWAYS_REPLACE: 'alwaysReplace',
  /**
   *  @constant {string} TRACK_SWITCH_MODE_NEVER_REPLACE used to forbid clearing the buffered data (prior to current playback position) after track switch. Defers to fastSwitchEnabled for placement of new data. Default for video
   *  @memberof Constants#
   *  @static
   */
  TRACK_SWITCH_MODE_NEVER_REPLACE: 'neverReplace',
  /**
   *  @constant {string} TRACK_SELECTION_MODE_FIRST_TRACK makes the player select the first track found in the manifest.
   *  @memberof Constants#
   *  @static
   */
  TRACK_SELECTION_MODE_FIRST_TRACK: 'firstTrack',
  /**
   *  @constant {string} TRACK_SELECTION_MODE_HIGHEST_BITRATE makes the player select the track with a highest bitrate. This mode is a default mode.
   *  @memberof Constants#
   *  @static
   */
  TRACK_SELECTION_MODE_HIGHEST_BITRATE: 'highestBitrate',
  /**
   *  @constant {string} TRACK_SELECTION_MODE_HIGHEST_EFFICIENCY makes the player select the track with the lowest bitrate per pixel average.
   *  @memberof Constants#
   *  @static
   */
  TRACK_SELECTION_MODE_HIGHEST_EFFICIENCY: 'highestEfficiency',
  /**
   *  @constant {string} TRACK_SELECTION_MODE_LOWEST_STARTUP_DELAY makes the player select the track that contains partial segments that start with SAP type 0 or 1.
   *  @memberof Constants#
   *  @static
   */
  TRACK_SELECTION_MODE_LOWEST_STARTUP_DELAY: 'lowestStartupDelay',
  /**
   *  @constant {string} TRACK_SELECTION_MODE_WIDEST_RANGE makes the player select the track with a widest range of bitrates.
   *  @memberof Constants#
   *  @static
   */
  TRACK_SELECTION_MODE_WIDEST_RANGE: 'widestRange',
  /**
   *  @constant {string} CMCD_QUERY_KEY specifies the key that is used for the CMCD query parameter.
   *  @memberof Constants#
   *  @static
   */
  CMCD_QUERY_KEY: _svta_cml_cmcd__WEBPACK_IMPORTED_MODULE_0__.CMCD_PARAM,
  /**
   *  @constant {string} CMCD_MODE_QUERY specifies to attach CMCD metrics as query parameters.
   *  @memberof Constants#
   *  @static
   */
  CMCD_MODE_QUERY: _svta_cml_cmcd__WEBPACK_IMPORTED_MODULE_0__.CmcdTransmissionMode.QUERY,
  /**
   *  @constant {string} CMCD_MODE_HEADERS specifies to attach CMCD metrics as HTTP headers.
   *  @memberof Constants#
   *  @static
   */
  CMCD_MODE_HEADERS: _svta_cml_cmcd__WEBPACK_IMPORTED_MODULE_0__.CmcdTransmissionMode.HEADERS,
  /**
   *  @constant {string} CMCD_MODE_BODY specifies to attach CMCD metrics on request body.
   *  @memberof Constants#
   *  @static
   */
  CMCD_MODE_BODY: 'body',
  /**
   *  @constant {string} CMCD_AVAILABLE_REQUESTS specifies all the available requests type for CMCD metrics.
   *  @memberof Constants#
   *  @static
   */
  CMCD_AVAILABLE_REQUESTS: ['segment', 'mpd', 'xlink', 'steering', 'other'],
  /**
   *  @constant {integer} CMCD_DEFAULT_TIME_INTERVAL specifies the default value for time interval in seconds.
   *  @memberof Constants#
   *  @static
   */
  CMCD_DEFAULT_TIME_INTERVAL: _svta_cml_cmcd__WEBPACK_IMPORTED_MODULE_0__.CMCD_DEFAULT_TIME_INTERVAL,
  /**
   *  @constant {string} CMCD_REPORTING_MODE specifies all the available modes for CMCD.
   *  @memberof Constants#
   *  @static
   */
  CMCD_REPORTING_MODE: _svta_cml_cmcd__WEBPACK_IMPORTED_MODULE_0__.CmcdReportingMode,
  /**
   *  @constant {string} CMCD_KEYS specifies all the available keys for CMCD.
   *  @memberof Constants#
   *  @static
   */
  CMCD_KEYS: _svta_cml_cmcd__WEBPACK_IMPORTED_MODULE_0__.CMCD_KEYS,
  /**
   *  @constant {string} CMCD_REPORTING_EVENTS specifies all the available events for CMCD event mode.
   *  @memberof Constants#
   *  @static
   */
  CMCD_REPORTING_EVENTS: _svta_cml_cmcd__WEBPACK_IMPORTED_MODULE_0__.CmcdEventType,
  /**
   *  @constant {string} CMCD_PLAYER_STATES specifies available player states for CMCD sta key.
   *  @memberof Constants#
   *  @static
   */
  CMCD_PLAYER_STATES: _svta_cml_cmcd__WEBPACK_IMPORTED_MODULE_0__.CmcdPlayerState,
  /**
   *  @constant {integer} CMCD_DEFAULT_VERSION specifies default CMCD version.
   *  @memberof Constants#
   *  @static
   */
  CMCD_DEFAULT_VERSION: 1,
  /**
   *  @constant {string} CMCD_DEFAULT_INCLUDE_IN_REQUESTS specifies default requests type to include CMCD data.
   *  @memberof Constants#
   *  @static
  */
  CMCD_DEFAULT_INCLUDE_IN_REQUESTS: 'segment',
  /**
   *  @constant {string} CMCD_CONTENT_TYPE_HEADER specifies content type for cmcd batching
   *  @memberof Constants#
   *  @static
  */
  CMCD_CONTENT_TYPE_HEADER: {
    'Content-Type': 'text/cmcd'
  },
  INITIALIZE: 'initialize',
  TEXT_SHOWING: 'showing',
  TEXT_HIDDEN: 'hidden',
  TEXT_DISABLED: 'disabled',
  ACCESSIBILITY_CEA608_SCHEME: 'urn:scte:dash:cc:cea-608:2015',
  CC1: 'CC1',
  CC3: 'CC3',
  UTF8: 'utf-8',
  SCHEME_ID_URI: 'schemeIdUri',
  START_TIME: 'starttime',
  SERVICE_DESCRIPTION_DVB_LL_SCHEME: 'urn:dvb:dash:lowlatency:scope:2019',
  SUPPLEMENTAL_PROPERTY_DVB_LL_SCHEME: 'urn:dvb:dash:lowlatency:critical:2019',
  CTA_5004_2023_SCHEME: 'urn:mpeg:dash:cta-5004:2023',
  CTA_5004_2025_SCHEME: 'urn:dashif:cta-5004:2025',
  THUMBNAILS_SCHEME_ID_URIS: ['http://dashif.org/thumbnail_tile', 'http://dashif.org/guidelines/thumbnail_tile'],
  FONT_DOWNLOAD_DVB_SCHEME: 'urn:dvb:dash:fontdownload:2014',
  COLOUR_PRIMARIES_SCHEME_ID_URI: 'urn:mpeg:mpegB:cicp:ColourPrimaries',
  URL_QUERY_INFO_SCHEME: 'urn:mpeg:dash:urlparam:2014',
  EXT_URL_QUERY_INFO_SCHEME: 'urn:mpeg:dash:urlparam:2016',
  ADV_URL_QUERY_INFO_SCHEME: 'urn:mpeg:dash:urlparam:2025',
  URL_QUERY_STATE_PREFIX: /urn:mpeg:dash:state:/,
  MATRIX_COEFFICIENTS_SCHEME_ID_URI: 'urn:mpeg:mpegB:cicp:MatrixCoefficients',
  TRANSFER_CHARACTERISTICS_SCHEME_ID_URI: 'urn:mpeg:mpegB:cicp:TransferCharacteristics',
  SEGMENT_SEQUENCE_REPRESENTATION_SCHEME_ID_URI: 'urn:mpeg:dash:ssr:2023',
  HDR_METADATA_FORMAT_SCHEME_ID_URI: 'urn:dvb:dash:hdr-dmi',
  HDR_METADATA_FORMAT_VALUES: {
    ST2094_10: 'ST2094-10',
    SL_HDR2: 'SL-HDR2',
    ST2094_40: 'ST2094-40'
  },
  MEDIA_CAPABILITIES_API: {
    COLORGAMUT: {
      SRGB: 'srgb',
      P3: 'p3',
      REC2020: 'rec2020'
    },
    TRANSFERFUNCTION: {
      SRGB: 'srgb',
      PQ: 'pq',
      HLG: 'hlg'
    },
    HDR_METADATATYPE: {
      SMPTE_ST_2094_10: 'smpteSt2094-10',
      SLHDR2: 'slhdr2',
      SMPTE_ST_2094_40: 'smpteSt2094-40'
    }
  },
  XML: 'XML',
  ARRAY_BUFFER: 'ArrayBuffer',
  DVB_REPORTING_URL: 'dvb:reportingUrl',
  DVB_PROBABILITY: 'dvb:probability',
  OFF_MIMETYPE: 'application/font-sfnt',
  WOFF_MIMETYPE: 'application/font-woff',
  VIDEO_ELEMENT_READY_STATES: {
    HAVE_NOTHING: 0,
    HAVE_METADATA: 1,
    HAVE_CURRENT_DATA: 2,
    HAVE_FUTURE_DATA: 3,
    HAVE_ENOUGH_DATA: 4
  },
  FILE_LOADER_TYPES: {
    FETCH: 'fetch_loader',
    XHR: 'xhr_loader'
  },
  THROUGHPUT_TYPES: {
    LATENCY: 'throughput_type_latency',
    BANDWIDTH: 'throughput_type_bandwidth'
  },
  THROUGHPUT_CALCULATION_MODES: {
    EWMA: 'throughputCalculationModeEwma',
    ZLEMA: 'throughputCalculationModeZlema',
    ARITHMETIC_MEAN: 'throughputCalculationModeArithmeticMean',
    BYTE_SIZE_WEIGHTED_ARITHMETIC_MEAN: 'throughputCalculationModeByteSizeWeightedArithmeticMean',
    DATE_WEIGHTED_ARITHMETIC_MEAN: 'throughputCalculationModeDateWeightedArithmeticMean',
    HARMONIC_MEAN: 'throughputCalculationModeHarmonicMean',
    BYTE_SIZE_WEIGHTED_HARMONIC_MEAN: 'throughputCalculationModeByteSizeWeightedHarmonicMean',
    DATE_WEIGHTED_HARMONIC_MEAN: 'throughputCalculationModeDateWeightedHarmonicMean'
  },
  LOW_LATENCY_DOWNLOAD_TIME_CALCULATION_MODE: {
    MOOF_PARSING: 'lowLatencyDownloadTimeCalculationModeMoofParsing',
    DOWNLOADED_DATA: 'lowLatencyDownloadTimeCalculationModeDownloadedData',
    AAST: 'lowLatencyDownloadTimeCalculationModeAast'
  },
  RULES_TYPES: {
    QUALITY_SWITCH_RULES: 'qualitySwitchRules',
    ABANDON_FRAGMENT_RULES: 'abandonFragmentRules'
  },
  QUALITY_SWITCH_RULES: {
    BOLA_RULE: 'BolaRule',
    THROUGHPUT_RULE: 'ThroughputRule',
    INSUFFICIENT_BUFFER_RULE: 'InsufficientBufferRule',
    SWITCH_HISTORY_RULE: 'SwitchHistoryRule',
    DROPPED_FRAMES_RULE: 'DroppedFramesRule',
    LEARN_TO_ADAPT_RULE: 'L2ARule',
    LOL_PLUS_RULE: 'LoLPRule'
  },
  ABANDON_FRAGMENT_RULES: {
    ABANDON_REQUEST_RULE: 'AbandonRequestsRule'
  },
  /**
   *  @constant {string} ID3_SCHEME_ID_URI specifies scheme ID URI for ID3 timed metadata
   *  @memberof Constants#
   *  @static
   */
  ID3_SCHEME_ID_URI: 'https://aomedia.org/emsg/ID3',
  COMMON_ACCESS_TOKEN_HEADER: 'common-access-token',
  DASH_ROLE_SCHEME_ID: 'urn:mpeg:dash:role:2011',
  CODEC_FAMILIES: {
    MP3: 'mp3',
    AAC: 'aac',
    AC3: 'ac3',
    EC3: 'ec3',
    DTSX: 'dtsx',
    DTSC: 'dtsc',
    AVC: 'avc',
    HEVC: 'hevc'
  }
});

/***/ }),

/***/ "./src/streaming/constants/ProtectionConstants.js":
/*!********************************************************!*\
  !*** ./src/streaming/constants/ProtectionConstants.js ***!
  \********************************************************/
/***/ (function(__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/**
 * The copyright in this software is being made available under the BSD License,
 * included below. This software may be subject to other third party and contributor
 * rights, including patent rights, and no such rights are granted under this license.
 *
 * Copyright (c) 2013, Dash Industry Forum.
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without modification,
 * are permitted provided that the following conditions are met:
 *  * Redistributions of source code must retain the above copyright notice, this
 *  list of conditions and the following disclaimer.
 *  * Redistributions in binary form must reproduce the above copyright notice,
 *  this list of conditions and the following disclaimer in the documentation and/or
 *  other materials provided with the distribution.
 *  * Neither the name of Dash Industry Forum nor the names of its
 *  contributors may be used to endorse or promote products derived from this software
 *  without specific prior written permission.
 *
 *  THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS AS IS AND ANY
 *  EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 *  WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED.
 *  IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT,
 *  INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT
 *  NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES, LOSS OF USE, DATA, OR
 *  PROFITS, OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY,
 *  WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
 *  ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
 *  POSSIBILITY OF SUCH DAMAGE.
 */

/**
 * Protection Constants declaration
 * @ignore
 */
/* harmony default export */ __webpack_exports__["default"] = ({
  CLEARKEY_KEYSTEM_STRING: 'org.w3.clearkey',
  CLEARKEY_UUID: 'e2719d58-a985-b3c9-781a-b030af78d30e',
  ENCRYPTION_SCHEME_CBCS: 'cbcs',
  ENCRYPTION_SCHEME_CENC: 'cenc',
  FAIRPLAY_KEYSTEM_STRING: 'com.apple.fps',
  FAIRPLAY_UUID: '94ce86fb-07ff-4f43-adb8-93d2fa968ca2',
  INITIALIZATION_DATA_TYPE_CENC: 'cenc',
  INITIALIZATION_DATA_TYPE_KEYIDS: 'keyids',
  INITIALIZATION_DATA_TYPE_SINF: 'sinf',
  INITIALIZATION_DATA_TYPE_WEBM: 'webm',
  MEDIA_KEY_MESSAGE_TYPES: {
    LICENSE_REQUEST: 'license-request',
    LICENSE_RENEWAL: 'license-renewal',
    LICENSE_RELEASE: 'license-release',
    INDIVIDUALIZATION_REQUEST: 'individualization-request'
  },
  MEDIA_KEY_STATUSES: {
    USABLE: 'usable',
    EXPIRED: 'expired',
    RELEASED: 'released',
    OUTPUT_RESTRICTED: 'output-restricted',
    OUTPUT_DOWNSCALED: 'output-downscaled',
    STATUS_PENDING: 'status-pending',
    INTERNAL_ERROR: 'internal-error'
  },
  PLAYREADY_KEYSTEM_STRING: 'com.microsoft.playready',
  PLAYREADY_RECOMMENDATION_KEYSTEM_STRING: 'com.microsoft.playready.recommendation',
  PLAYREADY_UUID: '9a04f079-9840-4286-ab92-e65be0885f95',
  ROBUSTNESS_STRINGS: {
    WIDEVINE: {
      SW_SECURE_CRYPTO: 'SW_SECURE_CRYPTO',
      SW_SECURE_DECODE: 'SW_SECURE_DECODE',
      HW_SECURE_CRYPTO: 'HW_SECURE_CRYPTO',
      HW_SECURE_DECODE: 'HW_SECURE_DECODE',
      HW_SECURE_ALL: 'HW_SECURE_ALL'
    }
  },
  W3C_CLEARKEY_UUID: '1077efec-c0b2-4d02-ace3-3c1e52e2fb4b',
  WIDEVINE_KEYSTEM_STRING: 'com.widevine.alpha',
  WIDEVINE_UUID: 'edef8ba9-79d6-4ace-a3c8-27dcd51d21ed'
});

/***/ }),

/***/ "./src/streaming/protection/CommonEncryption.js":
/*!******************************************************!*\
  !*** ./src/streaming/protection/CommonEncryption.js ***!
  \******************************************************/
/***/ (function(__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony import */ var _dash_constants_DashConstants_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../../dash/constants/DashConstants.js */ "./src/dash/constants/DashConstants.js");
/* harmony import */ var _constants_ProtectionConstants_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../constants/ProtectionConstants.js */ "./src/streaming/constants/ProtectionConstants.js");
/**
 * The copyright in this software is being made available under the BSD License,
 * included below. This software may be subject to other third party and contributor
 * rights, including patent rights, and no such rights are granted under this license.
 *
 * Copyright (c) 2013, Dash Industry Forum.
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without modification,
 * are permitted provided that the following conditions are met:
 *  * Redistributions of source code must retain the above copyright notice, this
 *  list of conditions and the following disclaimer.
 *  * Redistributions in binary form must reproduce the above copyright notice,
 *  this list of conditions and the following disclaimer in the documentation and/or
 *  other materials provided with the distribution.
 *  * Neither the name of Dash Industry Forum nor the names of its
 *  contributors may be used to endorse or promote products derived from this software
 *  without specific prior written permission.
 *
 *  THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS AS IS AND ANY
 *  EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 *  WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED.
 *  IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT,
 *  INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT
 *  NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
 *  PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY,
 *  WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
 *  ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
 *  POSSIBILITY OF SUCH DAMAGE.
 */


const LICENSE_SERVER_MANIFEST_CONFIGURATIONS = {
  prefixes: ['clearkey', 'dashif', 'ck']
};

/**
 * @class
 * @ignore
 */
class CommonEncryption {
  /**
   * Find and return the ContentProtection element in the given array
   * that indicates support for MP4 Common Encryption
   *
   * @param {Array} cpArray array of content protection elements
   * @returns {Object|null} the Common Encryption content protection element or
   * null if one was not found
   */
  static findMp4ProtectionElement(cpArray) {
    let retVal = null;
    for (let i = 0; i < cpArray.length; ++i) {
      let cp = cpArray[i];
      if (cp.schemeIdUri && cp.schemeIdUri.toLowerCase() === _dash_constants_DashConstants_js__WEBPACK_IMPORTED_MODULE_0__["default"].MP4_PROTECTION_SCHEME && cp.value && (cp.value.toLowerCase() === _constants_ProtectionConstants_js__WEBPACK_IMPORTED_MODULE_1__["default"].ENCRYPTION_SCHEME_CENC || cp.value.toLowerCase() === _constants_ProtectionConstants_js__WEBPACK_IMPORTED_MODULE_1__["default"].ENCRYPTION_SCHEME_CBCS)) {
        retVal = cp;
      }
    }
    return retVal;
  }

  /**
   * Returns just the data portion of a single PSSH
   *
   * @param {ArrayBuffer} pssh - the PSSH
   * @return {ArrayBuffer} data portion of the PSSH
   */
  static getPSSHData(pssh) {
    let offset = 8; // Box size and type fields
    let view = new DataView(pssh);

    // Read version
    let version = view.getUint8(offset);
    offset += 20; // Version (1), flags (3), system ID (16)

    if (version > 0) {
      offset += 4 + 16 * view.getUint32(offset); // Key ID count (4) and All key IDs (16*count)
    }
    offset += 4; // Data size
    return pssh.slice(offset);
  }

  /**
   * Returns the PSSH associated with the given key system from the concatenated
   * list of PSSH boxes in the given initData
   *
   * @param {KeySystem} keySystem the desired
   * key system
   * @param {ArrayBuffer} initData 'cenc' initialization data.  Concatenated list of PSSH.
   * @returns {ArrayBuffer|null} The PSSH box data corresponding to the given key system, null if not found
   * or null if a valid association could not be found.
   */
  static getPSSHForKeySystem(keySystem, initData) {
    let psshList = CommonEncryption.parsePSSHList(initData);
    if (keySystem && psshList.hasOwnProperty(keySystem.uuid.toLowerCase())) {
      return psshList[keySystem.uuid.toLowerCase()];
    }
    return null;
  }

  /**
   * Parse a standard common encryption PSSH which contains a simple
   * base64-encoding of the init data
   *
   * @param {Object} cpData the ContentProtection element
   * @param {BASE64} BASE64 reference
   * @returns {ArrayBuffer|null} the init data or null if not found
   */
  static parseInitDataFromContentProtection(cpData, BASE64) {
    if ('pssh' in cpData && cpData.pssh) {
      // Remove whitespaces and newlines from pssh text
      cpData.pssh.__text = cpData.pssh.__text.replace(/\r?\n|\r/g, '').replace(/\s+/g, '');
      return BASE64.decodeArray(cpData.pssh.__text).buffer;
    }
    return null;
  }

  /**
   * Parses list of PSSH boxes into keysystem-specific PSSH data
   *
   * @param {ArrayBuffer} data - the concatenated list of PSSH boxes as provided by
   * CDM as initialization data when CommonEncryption content is detected
   * @returns {Object|Array} an object that has a property named according to each of
   * the detected key system UUIDs (e.g. 00000000-0000-0000-0000-0000000000)
   * and a ArrayBuffer (the entire PSSH box) as the property value
   */
  static parsePSSHList(data) {
    if (data === null || data === undefined) {
      return [];
    }
    let dv = new DataView(data.buffer || data); // data.buffer first for Uint8Array support
    let done = false;
    let pssh = {};

    // TODO: Need to check every data read for end of buffer
    let byteCursor = 0;
    while (!done) {
      let size, nextBox, version, systemID;
      let boxStart = byteCursor;
      if (byteCursor >= dv.buffer.byteLength) {
        break;
      }

      /* Box size */
      size = dv.getUint32(byteCursor);
      nextBox = byteCursor + size;
      byteCursor += 4;

      /* Verify PSSH */
      if (dv.getUint32(byteCursor) !== 0x70737368) {
        byteCursor = nextBox;
        continue;
      }
      byteCursor += 4;

      /* Version must be 0 or 1 */
      version = dv.getUint8(byteCursor);
      if (version !== 0 && version !== 1) {
        byteCursor = nextBox;
        continue;
      }
      byteCursor++;
      byteCursor += 3; /* skip flags */

      // 16-byte UUID/SystemID
      systemID = '';
      let i, val;
      for (i = 0; i < 4; i++) {
        val = dv.getUint8(byteCursor + i).toString(16);
        systemID += val.length === 1 ? '0' + val : val;
      }
      byteCursor += 4;
      systemID += '-';
      for (i = 0; i < 2; i++) {
        val = dv.getUint8(byteCursor + i).toString(16);
        systemID += val.length === 1 ? '0' + val : val;
      }
      byteCursor += 2;
      systemID += '-';
      for (i = 0; i < 2; i++) {
        val = dv.getUint8(byteCursor + i).toString(16);
        systemID += val.length === 1 ? '0' + val : val;
      }
      byteCursor += 2;
      systemID += '-';
      for (i = 0; i < 2; i++) {
        val = dv.getUint8(byteCursor + i).toString(16);
        systemID += val.length === 1 ? '0' + val : val;
      }
      byteCursor += 2;
      systemID += '-';
      for (i = 0; i < 6; i++) {
        val = dv.getUint8(byteCursor + i).toString(16);
        systemID += val.length === 1 ? '0' + val : val;
      }
      byteCursor += 6;
      systemID = systemID.toLowerCase();

      /* PSSH Data Size */
      byteCursor += 4;

      /* PSSH Data */
      pssh[systemID] = dv.buffer.slice(boxStart, nextBox);
      byteCursor = nextBox;
    }
    return pssh;
  }
  static getLicenseServerUrlFromMediaInfo(mediaInfoArr, schemeIdUri) {
    try {
      if (!mediaInfoArr || mediaInfoArr.length === 0) {
        return null;
      }
      let i = 0;
      let licenseServer = null;
      while (i < mediaInfoArr.length && !licenseServer) {
        const mediaInfo = mediaInfoArr[i];
        if (mediaInfo && mediaInfo.contentProtection && mediaInfo.contentProtection.length > 0) {
          const targetProtectionData = mediaInfo.contentProtection.filter(cp => {
            return cp.schemeIdUri && cp.schemeIdUri === schemeIdUri;
          });
          if (targetProtectionData && targetProtectionData.length > 0) {
            let j = 0;
            while (j < targetProtectionData.length && !licenseServer) {
              const contentProtection = targetProtectionData[j];
              if (contentProtection.laUrl && contentProtection.laUrl.__prefix && LICENSE_SERVER_MANIFEST_CONFIGURATIONS.prefixes.includes(contentProtection.laUrl.__prefix) && contentProtection.laUrl.__text) {
                licenseServer = contentProtection.laUrl.__text;
              }
              j += 1;
            }
          }
        }
        i += 1;
      }
      return licenseServer;
    } catch (e) {
      return null;
    }
  }
  static hexKidToBufferSource(hexKid) {
    const cleanedHexKid = hexKid.replace(/-/g, '');
    const typedArray = new Uint8Array(cleanedHexKid.match(/[\da-f]{2}/gi).map(function (h) {
      return parseInt(h, 16);
    }));
    return typedArray.buffer;
  }
}
/* harmony default export */ __webpack_exports__["default"] = (CommonEncryption);

/***/ }),

/***/ "./src/streaming/protection/ProtectionEvents.js":
/*!******************************************************!*\
  !*** ./src/streaming/protection/ProtectionEvents.js ***!
  \******************************************************/
/***/ (function(__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony import */ var _core_events_EventsBase_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../../core/events/EventsBase.js */ "./src/core/events/EventsBase.js");
/**
 * The copyright in this software is being made available under the BSD License,
 * included below. This software may be subject to other third party and contributor
 * rights, including patent rights, and no such rights are granted under this license.
 *
 * Copyright (c) 2013, Dash Industry Forum.
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without modification,
 * are permitted provided that the following conditions are met:
 *  * Redistributions of source code must retain the above copyright notice, this
 *  list of conditions and the following disclaimer.
 *  * Redistributions in binary form must reproduce the above copyright notice,
 *  this list of conditions and the following disclaimer in the documentation and/or
 *  other materials provided with the distribution.
 *  * Neither the name of Dash Industry Forum nor the names of its
 *  contributors may be used to endorse or promote products derived from this software
 *  without specific prior written permission.
 *
 *  THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS AS IS AND ANY
 *  EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 *  WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED.
 *  IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT,
 *  INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT
 *  NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
 *  PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY,
 *  WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
 *  ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
 *  POSSIBILITY OF SUCH DAMAGE.
 */


/**
 * @class
 */
class ProtectionEvents extends _core_events_EventsBase_js__WEBPACK_IMPORTED_MODULE_0__["default"] {
  /**
   * @description Public facing external events to be used when including protection package.
   * All public events will be aggregated into the MediaPlayerEvents Class and can be accessed
   * via MediaPlayer.events.  public_ is the prefix that we use to move event names to MediaPlayerEvents.
   */
  constructor() {
    super();

    /**
     * Event ID for events delivered when the protection set receives
     * a key message from the CDM
     *
     * @ignore
     */
    this.INTERNAL_KEY_MESSAGE = 'internalKeyMessage';

    /**
     * Event ID for events delivered when the status of one decryption keys has changed
     * @ignore
     */
    this.INTERNAL_KEY_STATUSES_CHANGED = 'internalkeyStatusesChanged';

    /**
     * Event ID for events delivered when a new key has been added
     *
     * @constant
     * @deprecated The latest versions of the EME specification no longer
     * use this event.  {@MediaPlayer.models.protectionModel.eventList.KEY_STATUSES_CHANGED}
     * is preferred.
     * @event ProtectionEvents#KEY_ADDED
     */
    this.KEY_ADDED = 'public_keyAdded';
    /**
     * Event ID for events delivered when an error is encountered by the CDM
     * while processing a license server response message
     * @event ProtectionEvents#KEY_ERROR
     */
    this.KEY_ERROR = 'public_keyError';

    /**
     * Event ID for events delivered when the protection set receives
     * a key message from the CDM
     * @event ProtectionEvents#KEY_MESSAGE
     */
    this.KEY_MESSAGE = 'public_keyMessage';

    /**
     * Event ID for events delivered when a key session close
     * process has completed
     * @event ProtectionEvents#KEY_SESSION_CLOSED
     */
    this.KEY_SESSION_CLOSED = 'public_keySessionClosed';

    /**
     * Event ID for events delivered when a new key sessions creation
     * process has completed
     * @event ProtectionEvents#KEY_SESSION_CREATED
     */
    this.KEY_SESSION_CREATED = 'public_keySessionCreated';

    /**
     * Event ID for events delivered when a key session removal
     * process has completed
     * @event ProtectionEvents#KEY_SESSION_REMOVED
     */
    this.KEY_SESSION_REMOVED = 'public_keySessionRemoved';

    /**
     * Event ID for events delivered when the status of one or more
     * decryption keys has changed
     * @event ProtectionEvents#KEY_STATUSES_CHANGED
     */
    this.KEY_STATUSES_CHANGED = 'public_keyStatusesChanged';

    /**
     * Triggered when the key statuses Map() of the ProtectionController was updated. This happens after there is a keystatuseschange.
     * The event can be used as an indicator when to refresh the list of possible Representations
     * @event ProtectionEvents#KEY_STATUSES_MAP_UPDATED
     */
    this.KEY_STATUSES_MAP_UPDATED = 'keyStatusesMapUpdated';

    /**
     * Event ID for events delivered when a key system access procedure
     * has completed
     * @event ProtectionEvents#KEY_SYSTEM_ACCESS_COMPLETE
     */
    this.KEY_SYSTEM_ACCESS_COMPLETE = 'public_keySystemAccessComplete';

    /**
     * Event ID for events delivered when a key system selection procedure
     * completes
     * @event ProtectionEvents#KEY_SYSTEM_SELECTED
     */
    this.KEY_SYSTEM_SELECTED = 'public_keySystemSelected';

    /**
     * Event ID for events delivered when a license request procedure
     * has completed
     * @event ProtectionEvents#LICENSE_REQUEST_COMPLETE
     */
    this.LICENSE_REQUEST_COMPLETE = 'public_licenseRequestComplete';

    /**
     * Sending a license rquest
     * @event ProtectionEvents#LICENSE_REQUEST_SENDING
     */
    this.LICENSE_REQUEST_SENDING = 'public_licenseRequestSending';

    /**
     * Event ID for needkey/encrypted events
     * @ignore
     */
    this.NEED_KEY = 'needkey';

    /**
     * Event ID for events delivered when the Protection system is detected and created.
     * @event ProtectionEvents#PROTECTION_CREATED
     */
    this.PROTECTION_CREATED = 'public_protectioncreated';

    /**
     * Event ID for events delivered when the Protection system is destroyed.
     * @event ProtectionEvents#PROTECTION_DESTROYED
     */
    this.PROTECTION_DESTROYED = 'public_protectiondestroyed';

    /**
     * Event ID for events delivered when a new server certificate has
     * been delivered to the CDM
     * @ignore
     */
    this.SERVER_CERTIFICATE_UPDATED = 'serverCertificateUpdated';

    /**
     * Event ID for events delivered when the process of shutting down
     * a protection set has completed
     * @ignore
     */
    this.TEARDOWN_COMPLETE = 'protectionTeardownComplete';

    /**
     * Event ID for events delivered when a HTMLMediaElement has been
     * associated with the protection set
     * @ignore
     */
    this.VIDEO_ELEMENT_SELECTED = 'videoElementSelected';

    /**
     * Triggered when the key session has been updated successfully
     * @ignore
     */
    this.KEY_SESSION_UPDATED = 'public_keySessionUpdated';
  }
}
let protectionEvents = new ProtectionEvents();
/* harmony default export */ __webpack_exports__["default"] = (protectionEvents);

/***/ }),

/***/ "./src/streaming/protection/controllers/ProtectionController.js":
/*!**********************************************************************!*\
  !*** ./src/streaming/protection/controllers/ProtectionController.js ***!
  \**********************************************************************/
/***/ (function(__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony import */ var _CommonEncryption_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../CommonEncryption.js */ "./src/streaming/protection/CommonEncryption.js");
/* harmony import */ var _vo_MediaCapability_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../vo/MediaCapability.js */ "./src/streaming/protection/vo/MediaCapability.js");
/* harmony import */ var _vo_KeySystemConfiguration_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../vo/KeySystemConfiguration.js */ "./src/streaming/protection/vo/KeySystemConfiguration.js");
/* harmony import */ var _errors_ProtectionErrors_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../errors/ProtectionErrors.js */ "./src/streaming/protection/errors/ProtectionErrors.js");
/* harmony import */ var _vo_DashJSError_js__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ../../vo/DashJSError.js */ "./src/streaming/vo/DashJSError.js");
/* harmony import */ var _vo_LicenseRequest_js__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ../vo/LicenseRequest.js */ "./src/streaming/protection/vo/LicenseRequest.js");
/* harmony import */ var _vo_LicenseResponse_js__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! ../vo/LicenseResponse.js */ "./src/streaming/protection/vo/LicenseResponse.js");
/* harmony import */ var _vo_metrics_HTTPRequest_js__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(/*! ../../vo/metrics/HTTPRequest.js */ "./src/streaming/vo/metrics/HTTPRequest.js");
/* harmony import */ var _utils_CertUrlUtils_js__WEBPACK_IMPORTED_MODULE_8__ = __webpack_require__(/*! ../../utils/CertUrlUtils.js */ "./src/streaming/utils/CertUrlUtils.js");
/* harmony import */ var _core_Utils_js__WEBPACK_IMPORTED_MODULE_9__ = __webpack_require__(/*! ../../../core/Utils.js */ "./src/core/Utils.js");
/* harmony import */ var _core_FactoryMaker_js__WEBPACK_IMPORTED_MODULE_10__ = __webpack_require__(/*! ../../../core/FactoryMaker.js */ "./src/core/FactoryMaker.js");
/* harmony import */ var _constants_ProtectionConstants_js__WEBPACK_IMPORTED_MODULE_11__ = __webpack_require__(/*! ../../constants/ProtectionConstants.js */ "./src/streaming/constants/ProtectionConstants.js");
/* harmony import */ var _vo_CertificateRequest_js__WEBPACK_IMPORTED_MODULE_12__ = __webpack_require__(/*! ../vo/CertificateRequest.js */ "./src/streaming/protection/vo/CertificateRequest.js");
/* harmony import */ var _vo_CertificateResponse_js__WEBPACK_IMPORTED_MODULE_13__ = __webpack_require__(/*! ../vo/CertificateResponse.js */ "./src/streaming/protection/vo/CertificateResponse.js");
/**
 * The copyright in this software is being made available under the BSD License,
 * included below. This software may be subject to other third party and contributor
 * rights, including patent rights, and no such rights are granted under this license.
 *
 * Copyright (c) 2013, Dash Industry Forum.
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without modification,
 * are permitted provided that the following conditions are met:
 *  * Redistributions of source code must retain the above copyright notice, this
 *  list of conditions and the following disclaimer.
 *  * Redistributions in binary form must reproduce the above copyright notice,
 *  this list of conditions and the following disclaimer in the documentation and/or
 *  other materials provided with the distribution.
 *  * Neither the name of Dash Industry Forum nor the names of its
 *  contributors may be used to endorse or promote products derived from this software
 *  without specific prior written permission.
 *
 *  THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS AS IS AND ANY
 *  EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 *  WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED.
 *  IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT,
 *  INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT
 *  NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
 *  PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY,
 *  WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
 *  ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
 *  POSSIBILITY OF SUCH DAMAGE.
 */















const NEEDKEY_BEFORE_INITIALIZE_RETRIES = 5;
const NEEDKEY_BEFORE_INITIALIZE_TIMEOUT = 500;
const LICENSE_SERVER_REQUEST_RETRIES = 3;
const LICENSE_SERVER_REQUEST_RETRY_INTERVAL = 1000;
const LICENSE_SERVER_REQUEST_DEFAULT_TIMEOUT = 8000;
const CERTIFICATE_REQUEST_RETRIES = 3;
const CERTIFICATE_REQUEST_RETRY_INTERVAL = 500;
const CERTIFICATE_REQUEST_DEFAULT_TIMEOUT = 8000;

/**
 * @module ProtectionController
 * @description Provides access to media protection information and functionality.  Each
 * ProtectionController manages a single {@link MediaPlayer.models.ProtectionModel}
 * which encapsulates a set of protection information (EME APIs, selected key system,
 * key sessions).  The APIs of ProtectionController mostly align with the latest EME
 * APIs.  Key system selection is mostly automated when combined with app-overrideable
 * functionality provided in {@link ProtectionKeyController}.
 * @todo ProtectionController does almost all of its tasks automatically after init() is
 * called.  Applications might want more control over this process and want to go through
 * each step manually (key system selection, session creation, session maintenance).
 * This module can be accessed using the MediaPlayer API getProtectionController()
 * @param {Object} config
 */

function ProtectionController(config) {
  config = config || {};
  const BASE64 = config.BASE64;
  const cmcdController = config.cmcdController;
  const constants = config.constants;
  const customParametersModel = config.customParametersModel;
  const debug = config.debug;
  const eventBus = config.eventBus;
  const events = config.events;
  const protectionKeyController = config.protectionKeyController;
  const settings = config.settings;
  let protectionModel = config.protectionModel;
  let needkeyRetries = [];
  let applicationProvidedProtectionData, certificateCache, instance, keyStatusMap, keySystemSelectionInProgress, licenseRequestRetryTimeout, licenseXhrRequest, logger, mediaInfoArr, pendingCertificatePromise, pendingMediaTypesToHandle, robustnessLevel, selectedKeySystem, sessionType;
  function setup() {
    logger = debug.getLogger(instance);
    pendingMediaTypesToHandle = [];
    mediaInfoArr = [];
    sessionType = 'temporary';
    robustnessLevel = '';
    licenseXhrRequest = null;
    licenseRequestRetryTimeout = null;
    keyStatusMap = new Map();
    certificateCache = new Map();
    pendingCertificatePromise = null;
    eventBus.on(events.INTERNAL_KEY_MESSAGE, _onKeyMessage, instance);
  }
  function _checkConfig() {
    if (!eventBus || !eventBus.hasOwnProperty('on') || !protectionKeyController || !protectionKeyController.hasOwnProperty('getSupportedKeySystemMetadataFromContentProtection')) {
      throw new Error('Missing config parameter(s)');
    }
  }

  /**
   * Initialize this protection system for a given media type.
   *
   * @param {StreamInfo} [mediaInfo] Media information
   * @memberof module:ProtectionController
   * @instance
   */
  function initializeForMedia(mediaInfo) {
    // Not checking here if a session for similar KS/KID combination is already created
    // because still don't know which keysystem will be selected.
    // Once Keysystem is selected and before creating the session, we will do that check
    // so we create the strictly necessary DRM sessions
    if (!mediaInfo) {
      throw new Error('mediaInfo can not be null or undefined');
    }
    _checkConfig();
    mediaInfoArr.push(mediaInfo);
  }

  /**
   * Once all mediaInfo objects have been added to our mediaInfoArray we can select a key system or check if the kid has changed and we need to trigger a new license request
   * @memberof module:ProtectionController
   * @instance
   */
  function handleKeySystemFromManifest() {
    if (!mediaInfoArr || mediaInfoArr.length === 0) {
      return;
    }
    let supportedKeySystemsMetadata = [];
    mediaInfoArr.forEach(mediaInfo => {
      const keySystemsMetadata = protectionKeyController.getSupportedKeySystemMetadataFromContentProtection(mediaInfo.contentProtection, applicationProvidedProtectionData, sessionType);
      // We assume that the same key systems are signaled for each AS. We can use the first entry we find
      if (keySystemsMetadata.length > 0) {
        if (supportedKeySystemsMetadata.length === 0) {
          supportedKeySystemsMetadata = keySystemsMetadata;
        }
        // Save config for creating key session once we selected a key system
        pendingMediaTypesToHandle.push(keySystemsMetadata);
      }
    });
    if (supportedKeySystemsMetadata && supportedKeySystemsMetadata.length > 0) {
      _selectKeySystemOrUpdateKeySessions(supportedKeySystemsMetadata, true);
    }
  }

  /**
   * Selects a key system if we dont have any one yet. Otherwise we use the existing key system and trigger a new license request if the initdata has changed
   * @param {array} supportedKeySystemsMetadata
   * @private
   */
  function _handleKeySystemFromPssh(supportedKeySystemsMetadata) {
    pendingMediaTypesToHandle.push(supportedKeySystemsMetadata);
    _selectKeySystemOrUpdateKeySessions(supportedKeySystemsMetadata, false);
  }

  /**
   * Select the key system or update one of our existing key sessions
   * @param {array} supportedKeySystemsMetadata
   * @param {boolean} fromManifest
   * @private
   */
  function _selectKeySystemOrUpdateKeySessions(supportedKeySystemsMetadata, fromManifest) {
    // First time, so we need to select a key system
    if (!selectedKeySystem && !keySystemSelectionInProgress) {
      _selectInitialKeySystem(supportedKeySystemsMetadata, fromManifest);
    }

    // We already selected a key system. We only need to trigger a new license exchange if the init data has changed
    else if (selectedKeySystem) {
      // FairPlay: wait for the certificate to be applied before creating sessions
      if (pendingCertificatePromise) {
        pendingCertificatePromise.then(() => {
          _handlePendingMediaTypes();
        });
      } else {
        _handlePendingMediaTypes();
      }
    }
  }

  /**
   * We do not have a key system yet. Select one
   * @param {array} supportedKeySystemsMetadata
   * @param {boolean} fromManifest
   * @private
   */
  function _selectInitialKeySystem(supportedKeySystemsMetadata, fromManifest) {
    if (keySystemSelectionInProgress) {
      return;
    }
    keySystemSelectionInProgress = true;

    // Reorder key systems according to priority order provided in protectionData
    supportedKeySystemsMetadata = _sortKeySystemsByPriority(supportedKeySystemsMetadata);

    // Add all key systems to our request list since we have yet to select a key system
    const keySystemConfigurationsToRequest = _getKeySystemConfigurations(supportedKeySystemsMetadata);
    let keySystemAccess;
    protectionModel.requestKeySystemAccess(keySystemConfigurationsToRequest).then(event => {
      keySystemAccess = event.data;
      return _onKeySystemAccessed(keySystemAccess);
    }).then(keySystem => {
      _onMediaKeysCreated(keySystem, keySystemAccess);
    }).catch(event => {
      _handleKeySystemSelectionError(event, fromManifest);
    });
  }
  function _onKeySystemAccessed(keySystemAccess) {
    let selectedSystemString = keySystemAccess && keySystemAccess.selectedSystemString ? keySystemAccess.selectedSystemString : keySystemAccess.keySystem.systemString;
    logger.info('DRM: KeySystem Access Granted for system string (' + selectedSystemString + ')!  Selecting key system...');
    return protectionModel.selectKeySystem(keySystemAccess);
  }
  function _onMediaKeysCreated(keySystem, keySystemAccess) {
    try {
      selectedKeySystem = keySystem;
      keySystemSelectionInProgress = false;
      eventBus.trigger(events.KEY_SYSTEM_SELECTED, {
        data: keySystemAccess
      });

      // Set server certificate from protData
      const protData = _getProtDataForKeySystem(selectedKeySystem);
      if (protData && protData.serverCertificate && protData.serverCertificate.length > 0) {
        protectionModel.setServerCertificate(BASE64.decodeArray(protData.serverCertificate).buffer);
      }

      // FairPlay requires the server certificate before generateRequest() can succeed.
      // Wait for certificate acquisition to complete before creating key sessions.
      if (selectedKeySystem.systemString === _constants_ProtectionConstants_js__WEBPACK_IMPORTED_MODULE_11__["default"].FAIRPLAY_KEYSTEM_STRING) {
        _handleFairplayCertificateRequired();
      } else {
        // For other key systems cert is optional; fire-and-forget
        _handleCertificateRequired();
      }
    } catch (e) {
      logger.error(e);
    }
  }
  function _handleFairplayCertificateRequired() {
    // Store the promise so _onNeedKey can also wait for it
    pendingCertificatePromise = _acquireCertificateFromManifest().then(() => {
      pendingCertificatePromise = null;
      _handlePendingMediaTypes();
    }).catch(e => {
      // Even if cert acquisition fails, proceed — the app may have set it via protData
      logger.warn('DRM: Certificate acquisition failed for FairPlay: ' + (e && e.message ? e.message : e) + '. Proceeding anyway.');
      pendingCertificatePromise = null;
      _handlePendingMediaTypes();
    });
  }
  function _handleCertificateRequired() {
    _acquireCertificateFromManifest().catch(e => {
      logger.error(e);
    });
    _handlePendingMediaTypes();
  }

  /**
   * Attempt to acquire and set a server certificate using Certurl entries from the manifest
   * Only runs if no certificate already applied via protData
   * @private
   */
  function _acquireCertificateFromManifest() {
    if (!selectedKeySystem) {
      return Promise.resolve();
    }
    const ksString = selectedKeySystem.systemString;
    const cacheEntry = certificateCache.get(ksString);
    if (cacheEntry && (cacheEntry.applied || cacheEntry.inProgress)) {
      return Promise.resolve();
    }
    // Gather certUrls from collected mediaInfoArr contentProtection entries matching this key system
    const certCandidates = _getCertificateUrlsForSelectedKeySystem();
    if (!certCandidates.length) {
      logger.debug('DRM: No Certificate Server URLs found for ' + ksString + '. Skipping certificate acquisition.');
      return Promise.resolve();
    }
    logger.debug('DRM: Found ' + certCandidates.length + ' certificate candidate(s) for ' + ksString + '. Starting acquisition.');
    const protData = _getProtDataForKeySystem(selectedKeySystem) || {};
    const entry = cacheEntry || {
      applied: false,
      inProgress: true,
      attempts: 0
    };
    entry.inProgress = true;
    certificateCache.set(ksString, entry);
    return _fetchAndApplyCertificateSequentially(certCandidates, 0, protData, ksString, entry);
  }

  /**
   * Collect certificate URL objects for the selected key system from mediaInfo content protection data
   * @param {string|null} preferredType
   * @return {Array<{url:string, certType:string|null}>}
   * @private
   */
  function _getCertificateUrlsForSelectedKeySystem() {
    const urls = [];
    // 1. API-provided certUrls (protData) take priority
    const protData = _getProtDataForKeySystem(selectedKeySystem);
    if (protData && Array.isArray(protData.certUrls) && protData.certUrls.length) {
      protData.certUrls.forEach(c => {
        urls.push(c);
      });
    }
    // 2. Manifest-provided certUrls
    mediaInfoArr.forEach(mediaInfo => {
      if (!mediaInfo || !mediaInfo.contentProtection) {
        return;
      }
      mediaInfo.contentProtection.forEach(contentProtection => {
        if (contentProtection && Array.isArray(contentProtection.certUrls) && contentProtection.certUrls.length && contentProtection.schemeIdUri.toLowerCase() === selectedKeySystem.schemeIdURI) {
          contentProtection.certUrls.forEach(c => {
            urls.push(c);
          });
        }
      });
    });
    return _utils_CertUrlUtils_js__WEBPACK_IMPORTED_MODULE_8__["default"].dedupeCertUrls(urls);
  }
  function _fetchAndApplyCertificateSequentially(candidates, index, protData, ksString, cacheEntry) {
    if (index >= candidates.length) {
      return _handleAllCertificateRequestsFailed(cacheEntry, ksString);
    }
    const candidate = candidates[index];
    const retryAttempts = !isNaN(settings.get().streaming.retryAttempts[_vo_metrics_HTTPRequest_js__WEBPACK_IMPORTED_MODULE_7__.HTTPRequest.LICENSE_CERTIFICATE]) ? settings.get().streaming.retryAttempts[_vo_metrics_HTTPRequest_js__WEBPACK_IMPORTED_MODULE_7__.HTTPRequest.LICENSE_CERTIFICATE] : CERTIFICATE_REQUEST_RETRIES;
    logger.debug('DRM: Attempting certificate download (' + (index + 1) + '/' + candidates.length + ') url=' + candidate.url);
    return _buildCertificateRequest(candidate, protData).then(certificateRequest => {
      return _sendCertificateRequest(certificateRequest, protData, retryAttempts);
    }).then(arrayBuffer => {
      return _processCertificateResponse(arrayBuffer, candidate, ksString, cacheEntry);
    }).then(() => {
      _logCertificateSuccess(candidate, ksString, cacheEntry);
    }).catch(err => {
      cacheEntry.attempts++;
      cacheEntry.lastError = err && err.message ? err.message : err;
      logger.warn('DRM: Certificate attempt failed (' + candidate.url + '): ' + cacheEntry.lastError);
      return _fetchAndApplyCertificateSequentially(candidates, index + 1, protData, ksString, cacheEntry);
    });
  }
  function _buildCertificateRequest(candidate, protData) {
    const certificateRequestFilters = customParametersModel.getCertificateRequestFilters();
    let withCredentials = false;
    if (protData && typeof protData.withCredentials === 'boolean') {
      withCredentials = protData.withCredentials;
    }
    const reqHeaders = {};
    if (protData) {
      _updateHeaders(reqHeaders, protData.httpRequestHeaders);
    }
    const certificateRequest = new _vo_CertificateRequest_js__WEBPACK_IMPORTED_MODULE_12__["default"](candidate.url, reqHeaders, withCredentials);
    return _applyFilters(certificateRequestFilters, certificateRequest).then(() => certificateRequest);
  }
  function _processCertificateResponse(arrayBuffer, candidate, ksString, cacheEntry) {
    if (!arrayBuffer || !arrayBuffer.byteLength) {
      throw new Error('Empty certificate response');
    }
    cacheEntry.urlUsed = candidate.url;
    cacheEntry.buffer = arrayBuffer;
    return _applyServerCertificate(arrayBuffer, ksString, cacheEntry).then(applied => {
      if (!applied) {
        throw new Error('CDM rejected certificate');
      }
      cacheEntry.applied = true;
      cacheEntry.inProgress = false;
    });
  }
  function _logCertificateSuccess(candidate, ksString, cacheEntry) {
    const typeSuffix = candidate.certType ? ' certType=' + candidate.certType : '';
    logger.info('DRM: Server certificate applied successfully from ' + cacheEntry.urlUsed + typeSuffix + ' for ' + ksString + '.');
  }
  function _handleAllCertificateRequestsFailed(cacheEntry, ksString) {
    cacheEntry.inProgress = false;
    cacheEntry.error = cacheEntry.error || 'All certificate candidates failed';
    logger.warn('DRM: All certificate candidates failed for ' + ksString + '.');
    return Promise.reject(new Error(cacheEntry.error));
  }

  /**
   * Download a certificate binary with retries.
   * @param {CertificateRequest} certificateRequest
   * @param {object} protData
   * @param {number} retries
   * @return {Promise<ArrayBuffer>}
   * @private
   */
  function _sendCertificateRequest(certificateRequest, protData, retries) {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open(certificateRequest.method, certificateRequest.url, true);
      xhr.responseType = certificateRequest.responseType;
      const timeout = protData && !isNaN(protData.httpTimeout) ? protData.httpTimeout : CERTIFICATE_REQUEST_DEFAULT_TIMEOUT;
      if (timeout > 0) {
        xhr.timeout = timeout;
      }
      xhr.withCredentials = certificateRequest.withCredentials;
      for (const key of Object.keys(certificateRequest.headers)) {
        xhr.setRequestHeader(key, certificateRequest.headers[key]);
      }
      const _attemptFail = reason => {
        if (retries > 0) {
          const remaining = retries - 1;
          const retryInterval = !isNaN(settings.get().streaming.retryIntervals[_vo_metrics_HTTPRequest_js__WEBPACK_IMPORTED_MODULE_7__.HTTPRequest.LICENSE_CERTIFICATE]) ? settings.get().streaming.retryIntervals[_vo_metrics_HTTPRequest_js__WEBPACK_IMPORTED_MODULE_7__.HTTPRequest.LICENSE_CERTIFICATE] : CERTIFICATE_REQUEST_RETRY_INTERVAL;
          logger.debug('DRM: Certificate request failed (' + reason + '). Retrying... remaining=' + remaining);
          setTimeout(() => {
            _sendCertificateRequest(certificateRequest, protData, remaining).then(resolve).catch(reject);
          }, retryInterval);
        } else {
          reject(new Error(reason));
        }
      };
      xhr.onload = function () {
        if (this.status >= 200 && this.status <= 299) {
          const responseHeaders = _core_Utils_js__WEBPACK_IMPORTED_MODULE_9__["default"].parseHttpHeaders(xhr.getAllResponseHeaders ? xhr.getAllResponseHeaders() : null);
          const certificateResponseFilters = customParametersModel.getCertificateResponseFilters();
          const certificateResponse = new _vo_CertificateResponse_js__WEBPACK_IMPORTED_MODULE_13__["default"](xhr.responseURL, responseHeaders, this.response);
          _applyFilters(certificateResponseFilters, certificateResponse).then(() => {
            resolve(this.response);
          }).catch(() => {
            resolve(this.response);
          });
        } else {
          _attemptFail('HTTP ' + this.status);
        }
      };
      xhr.onerror = function () {
        _attemptFail('network error');
      };
      xhr.ontimeout = function () {
        _attemptFail('timeout');
      };
      xhr.onabort = function () {
        _attemptFail('aborted');
      };
      try {
        xhr.send(certificateRequest.body);
      } catch (e) {
        reject(e);
      }
    });
  }

  /**
   * Apply the certificate to the CDM; supports both sync and promise-returning implementations.
   * @param {ArrayBuffer} buffer
   * @param {string} ksString
   * @param {object} cacheEntry
   * @return {Promise<boolean>}
   * @private
   */
  function _applyServerCertificate(buffer, ksString, cacheEntry) {
    return new Promise((resolve, reject) => {
      try {
        const result = protectionModel.setServerCertificate(buffer);
        if (result && typeof result.then === 'function') {
          result.then(val => {
            resolve(typeof val === 'boolean' ? val : true);
          }).catch(e => {
            cacheEntry.error = e && e.message ? e.message : e;
            reject(e);
          });
        } else {
          resolve(true);
        }
      } catch (e) {
        cacheEntry.error = e && e.message ? e.message : e;
        logger.warn('DRM: setServerCertificate threw for ' + ksString + ': ' + cacheEntry.error);
        reject(e);
      }
    });
  }

  /**
   * If we have already selected a key system we only need to create a new key session and issue a new license request if the init data has changed.
   * @private
   */
  function _handlePendingMediaTypes() {
    // Create key sessions for the different AdaptationSets
    let ksIdx;
    for (let i = 0; i < pendingMediaTypesToHandle.length; i++) {
      for (ksIdx = 0; ksIdx < pendingMediaTypesToHandle[i].length; ksIdx++) {
        if (selectedKeySystem === pendingMediaTypesToHandle[i][ksIdx].ks) {
          const keySystemMetadata = pendingMediaTypesToHandle[i][ksIdx];
          _loadOrCreateKeySession(keySystemMetadata);
          break;
        }
      }
    }
    pendingMediaTypesToHandle = [];
  }
  function _handleKeySystemSelectionError(event, fromManifest) {
    selectedKeySystem = null;
    keySystemSelectionInProgress = false;
    if (!fromManifest) {
      eventBus.trigger(events.KEY_SYSTEM_SELECTED, {
        data: null,
        error: new _vo_DashJSError_js__WEBPACK_IMPORTED_MODULE_4__["default"](_errors_ProtectionErrors_js__WEBPACK_IMPORTED_MODULE_3__["default"].KEY_SYSTEM_ACCESS_DENIED_ERROR_CODE, _errors_ProtectionErrors_js__WEBPACK_IMPORTED_MODULE_3__["default"].KEY_SYSTEM_ACCESS_DENIED_ERROR_MESSAGE + 'Error selecting key system! -- ' + event.error)
      });
    }
  }
  function _sortKeySystemsByPriority(supportedKeySystems) {
    return supportedKeySystems.sort((ksA, ksB) => {
      let indexA = applicationProvidedProtectionData && applicationProvidedProtectionData[ksA.ks.systemString] && applicationProvidedProtectionData[ksA.ks.systemString].priority >= 0 ? applicationProvidedProtectionData[ksA.ks.systemString].priority : supportedKeySystems.length;
      let indexB = applicationProvidedProtectionData && applicationProvidedProtectionData[ksB.ks.systemString] && applicationProvidedProtectionData[ksB.ks.systemString].priority >= 0 ? applicationProvidedProtectionData[ksB.ks.systemString].priority : supportedKeySystems.length;
      return indexA - indexB;
    });
  }
  function _getKeySystemConfigurations(supportedKeySystemsMetadata) {
    const keySystemConfigurationsToRequest = [];
    for (let i = 0; i < supportedKeySystemsMetadata.length; i++) {
      const keySystemConfiguration = _getKeySystemConfiguration(supportedKeySystemsMetadata[i]);
      keySystemConfigurationsToRequest.push({
        ks: supportedKeySystemsMetadata[i].ks,
        configs: [keySystemConfiguration],
        protData: supportedKeySystemsMetadata[i].protData
      });
    }
    return keySystemConfigurationsToRequest;
  }

  /**
   * Returns an object corresponding to the EME MediaKeySystemConfiguration dictionary
   * @param {object} keySystem
   * @return {KeySystemConfiguration}
   * @private
   */
  function _getKeySystemConfiguration(keySystemData) {
    const protData = keySystemData.protData;
    const audioCapabilities = [];
    const videoCapabilities = [];
    let defaultInitDataType = _constants_ProtectionConstants_js__WEBPACK_IMPORTED_MODULE_11__["default"].INITIALIZATION_DATA_TYPE_CENC;
    if (keySystemData.ks && keySystemData.ks.systemString === _constants_ProtectionConstants_js__WEBPACK_IMPORTED_MODULE_11__["default"].FAIRPLAY_KEYSTEM_STRING) {
      defaultInitDataType = _constants_ProtectionConstants_js__WEBPACK_IMPORTED_MODULE_11__["default"].INITIALIZATION_DATA_TYPE_SINF;
    }
    const initDataTypes = protData && protData.initDataTypes && protData.initDataTypes.length > 0 ? protData.initDataTypes : [defaultInitDataType];
    const audioRobustness = protData && protData.audioRobustness && protData.audioRobustness.length > 0 ? protData.audioRobustness : robustnessLevel;
    const videoRobustness = protData && protData.videoRobustness && protData.videoRobustness.length > 0 ? protData.videoRobustness : robustnessLevel;
    const ksSessionType = keySystemData.sessionType;
    const distinctiveIdentifier = protData && protData.distinctiveIdentifier ? protData.distinctiveIdentifier : 'optional';
    const persistentState = protData && protData.persistentState ? protData.persistentState : ksSessionType === 'temporary' ? 'optional' : 'required';

    // FairPlay uses CBCS encryption exclusively
    const encryptionScheme = keySystemData.ks && keySystemData.ks.systemString === _constants_ProtectionConstants_js__WEBPACK_IMPORTED_MODULE_11__["default"].FAIRPLAY_KEYSTEM_STRING ? _constants_ProtectionConstants_js__WEBPACK_IMPORTED_MODULE_11__["default"].ENCRYPTION_SCHEME_CBCS : undefined;
    mediaInfoArr.forEach(media => {
      if (media.type === constants.AUDIO) {
        audioCapabilities.push(new _vo_MediaCapability_js__WEBPACK_IMPORTED_MODULE_1__["default"](media.codec, audioRobustness, encryptionScheme));
      } else if (media.type === constants.VIDEO) {
        videoCapabilities.push(new _vo_MediaCapability_js__WEBPACK_IMPORTED_MODULE_1__["default"](media.codec, videoRobustness, encryptionScheme));
      }
    });
    return new _vo_KeySystemConfiguration_js__WEBPACK_IMPORTED_MODULE_2__["default"](audioCapabilities, videoCapabilities, distinctiveIdentifier, persistentState, [ksSessionType], initDataTypes);
  }

  /**
   * Loads an existing key session if we already have a session id. Otherwise we create a new key session
   * @param {object} keySystemMetadata
   * @private
   */
  function _loadOrCreateKeySession(keySystemMetadata) {
    if (protectionKeyController.isClearKey(selectedKeySystem)) {
      _handleClearkeySession(keySystemMetadata);
    }

    // Reuse existing KeySession
    if (keySystemMetadata.sessionId) {
      // Load MediaKeySession with sessionId
      loadKeySession(keySystemMetadata);
    }

    // Create a new KeySession
    else if (keySystemMetadata.initData !== null) {
      // Create new MediaKeySession with initData
      createKeySession(keySystemMetadata);
    }
  }
  function _handleClearkeySession(keySystemMetadata) {
    // For Clearkey: if parameters for generating init data was provided by the user, use them for generating
    // initData and overwrite possible initData indicated in encrypted event (EME)
    if (keySystemMetadata.protData && keySystemMetadata.protData.hasOwnProperty('clearkeys') && Object.keys(keySystemMetadata.protData.clearkeys).length !== 0) {
      const initData = {
        kids: Object.keys(keySystemMetadata.protData.clearkeys)
      };
      keySystemMetadata.initData = new TextEncoder().encode(JSON.stringify(initData));
    }
  }

  /**
   * Loads a key session with the given session ID from persistent storage.  This essentially creates a new key session
   *
   * @param {object} ksInfo
   * @memberof module:ProtectionController
   * @instance
   * @fires ProtectionController#KeySessionCreated
   * @ignore
   */
  function loadKeySession(keySystemMetadata) {
    _checkConfig();
    protectionModel.loadKeySession(keySystemMetadata);
  }

  /**
   * Create a new key session associated with the given initialization data from the MPD or from the PSSH box in the media
   * For the latest version of the EME a request is generated. Once this request is ready we get notified via the INTERNAL_KEY_MESSAGE event
   * @param {ArrayBuffer} initData the initialization data
   * @param {Uint8Array} cdmData the custom data to provide to licenser
   * @memberof module:ProtectionController
   * @instance
   * @fires ProtectionController#KeySessionCreated
   * @ignore
   */
  function createKeySession(keySystemMetadata) {
    // Check for duplicate key id
    if (keySystemMetadata && _doesSessionForKeyIdExists(keySystemMetadata.keyId)) {
      return;
    }

    // Enforce maximum number of open MediaKeySessions, if settings are provided
    _enforceMediaKeySessionLimit();
    const initDataForKS = _CommonEncryption_js__WEBPACK_IMPORTED_MODULE_0__["default"].getPSSHForKeySystem(selectedKeySystem, keySystemMetadata ? keySystemMetadata.initData : null);
    if (initDataForKS) {
      // Check for duplicate initData
      if (_isInitDataDuplicate(initDataForKS)) {
        return;
      }
      try {
        keySystemMetadata.initData = initDataForKS;
        protectionModel.createKeySession(keySystemMetadata);
      } catch (error) {
        eventBus.trigger(events.KEY_SESSION_CREATED, {
          data: null,
          error: new _vo_DashJSError_js__WEBPACK_IMPORTED_MODULE_4__["default"](_errors_ProtectionErrors_js__WEBPACK_IMPORTED_MODULE_3__["default"].KEY_SESSION_CREATED_ERROR_CODE, _errors_ProtectionErrors_js__WEBPACK_IMPORTED_MODULE_3__["default"].KEY_SESSION_CREATED_ERROR_MESSAGE + error.message)
        });
      }
    } else if (keySystemMetadata && keySystemMetadata.initData) {
      protectionModel.createKeySession(keySystemMetadata);
    } else {
      eventBus.trigger(events.KEY_SESSION_CREATED, {
        data: null,
        error: new _vo_DashJSError_js__WEBPACK_IMPORTED_MODULE_4__["default"](_errors_ProtectionErrors_js__WEBPACK_IMPORTED_MODULE_3__["default"].KEY_SESSION_CREATED_ERROR_CODE, _errors_ProtectionErrors_js__WEBPACK_IMPORTED_MODULE_3__["default"].KEY_SESSION_CREATED_ERROR_MESSAGE + 'Selected key system is ' + (selectedKeySystem ? selectedKeySystem.systemString : null) + '.  needkey/encrypted event contains no initData corresponding to that key system!')
      });
    }
  }

  /**
   * Enforces the maximum number of open MediaKeySessions, if settings are provided.
   * @description This method checks the current number of open sessions and closes the oldest session if the limit is reached.
   * @requires keepProtectionMediaKeys is enabled and keepProtectionMediaKeysMaximumOpenSessions is set with a positive value.
   * @private
   */
  function _enforceMediaKeySessionLimit() {
    if (!settings) {
      return;
    }
    const isKeepProtectionMediaKeysEnabled = settings.get().streaming.protection.keepProtectionMediaKeys;
    const maxSessions = settings.get().streaming.protection.keepProtectionMediaKeysMaximumOpenSessions;
    if (typeof maxSessions !== 'number' || maxSessions <= 0) {
      return;
    }
    if (!isKeepProtectionMediaKeysEnabled) {
      logger.warn('DRM: keepProtectionMediaKeysMaximumOpenSessions is set to ' + maxSessions + ', but keepProtectionMediaKeys is not enabled. Therefore, keepProtectionMediaKeysMaximumOpenSessions will be ignored.');
      return;
    }
    // Ensure protectionModel is available before accessing sessions
    if (!protectionModel || typeof protectionModel.getSessionTokens !== 'function') {
      return;
    }
    const sessionTokens = protectionModel.getSessionTokens() || [];
    if (sessionTokens.length < maxSessions) {
      return;
    }
    // Limit reached. Close the oldest session to make room for a new one.
    const oldestSession = sessionTokens[0];
    if (oldestSession) {
      logger.info('DRM: Maximum number of open MediaKeySessions reached (' + maxSessions + '), closing oldest session.');
      closeKeySession(oldestSession);
    }
  }

  /**
   * Returns the protectionData for a specific keysystem as specified by the application.
   * @param {object} keySystem
   * @return {object | null}
   * @private
   */
  function _getProtDataForKeySystem(keySystem) {
    if (keySystem) {
      const keySystemString = keySystem.systemString;
      if (applicationProvidedProtectionData) {
        return keySystemString in applicationProvidedProtectionData ? applicationProvidedProtectionData[keySystemString] : null;
      }
    }
    return null;
  }

  /**
   * Removes all entries from the mediaInfoArr
   */
  function clearMediaInfoArray() {
    mediaInfoArr = [];
  }

  /**
   * Returns a set of supported key systems and CENC initialization data
   * from the given array of ContentProtection elements.  Only
   * key systems that are supported by this player will be returned.
   * Key systems are returned in priority order (highest first).
   *
   * @param {Array.<Object>} cps - array of content protection elements parsed
   * from the manifest
   * @returns {Array.<Object>} array of objects indicating which supported key
   * systems were found.  Empty array is returned if no
   * supported key systems were found
   * @memberof module:ProtectionKeyController
   * @instance
   * @ignore
   */
  function getSupportedKeySystemMetadataFromContentProtection(cps) {
    _checkConfig();
    return protectionKeyController.getSupportedKeySystemMetadataFromContentProtection(cps, applicationProvidedProtectionData, sessionType);
  }

  /**
   * Checks if a session has already created for the provided key id
   * @param {string} keyId
   * @return {boolean}
   * @private
   */
  function _doesSessionForKeyIdExists(keyId) {
    if (!keyId) {
      return false;
    }
    try {
      const sessions = protectionModel.getSessionTokens();
      for (let i = 0; i < sessions.length; i++) {
        if (sessions[i].getKeyId() === keyId) {
          return true;
        }
      }
      return false;
    } catch (e) {
      return false;
    }
  }

  /**
   * Checks if the provided init data is equal to one of the existing init data values
   * @param {any} initDataForKS
   * @return {boolean}
   * @private
   */
  function _isInitDataDuplicate(initDataForKS) {
    if (!initDataForKS) {
      return false;
    }
    try {
      const currentInitData = protectionModel.getAllInitData();
      for (let i = 0; i < currentInitData.length; i++) {
        if (protectionKeyController.initDataEquals(initDataForKS, currentInitData[i])) {
          logger.debug('DRM: Ignoring initData because we have already seen it!');
          return true;
        }
      }
      return false;
    } catch (e) {
      return false;
    }
  }

  /**
   * Removes the given key session from persistent storage and closes the session
   * as if {@link ProtectionController#closeKeySession}
   * was called
   *
   * @param {SessionToken} sessionToken the session
   * token
   * @memberof module:ProtectionController
   * @instance
   * @fires ProtectionController#KeySessionRemoved
   * @fires ProtectionController#KeySessionClosed
   * @ignore
   */
  function removeKeySession(sessionToken) {
    _checkConfig();
    protectionModel.removeKeySession(sessionToken);
  }

  /**
   * Closes the key session and releases all associated decryption keys.  These
   * keys will no longer be available for decrypting media
   *
   * @param {SessionToken} sessionToken the session
   * token
   * @memberof module:ProtectionController
   * @instance
   * @fires ProtectionController#KeySessionClosed
   * @ignore
   */
  function closeKeySession(sessionToken) {
    _checkConfig();
    protectionModel.closeKeySession(sessionToken);
  }

  /**
   * Sets a server certificate for use by the CDM when signing key messages
   * intended for a particular license server.  This will fire
   * an error event if a key system has not yet been selected.
   *
   * @param {ArrayBuffer} serverCertificate a CDM-specific license server
   * certificate
   * @memberof module:ProtectionController
   * @instance
   * @return {Promise}
   * @fires ProtectionController#ServerCertificateUpdated
   */
  function setServerCertificate(serverCertificate) {
    _checkConfig();
    return protectionModel.setServerCertificate(serverCertificate);
  }

  /**
   * Associate this protection system with the given HTMLMediaElement.  This
   * causes the system to register for needkey/encrypted events from the given
   * element and provides a destination for setting of MediaKeys
   *
   * @param {HTMLMediaElement} element the media element to which the protection
   * system should be associated
   * @memberof module:ProtectionController
   * @instance
   */
  function setMediaElement(element) {
    _checkConfig();
    if (element) {
      protectionModel.setMediaElement(element);
      eventBus.on(events.NEED_KEY, _onNeedKey, instance);
    } else if (element === null) {
      protectionModel.setMediaElement(element);
      eventBus.off(events.NEED_KEY, _onNeedKey, instance);
    }
  }

  /**
   * Sets the session type to use when creating key sessions.  Either "temporary" or
   * "persistent-license".  Default is "temporary".
   *
   * @param {string} value the session type
   * @memberof module:ProtectionController
   * @instance
   */
  function setSessionType(value) {
    sessionType = value;
  }

  /**
   * Sets the robustness level for video and audio capabilities. Optional to remove Chrome warnings.
   * Possible values are SW_SECURE_CRYPTO, SW_SECURE_DECODE, HW_SECURE_CRYPTO, HW_SECURE_CRYPTO, HW_SECURE_DECODE, HW_SECURE_ALL.
   *
   * @param {string} level the robustness level
   * @memberof module:ProtectionController
   * @instance
   */
  function setRobustnessLevel(level) {
    robustnessLevel = level;
  }

  /**
   * Attach KeySystem-specific data to use for license acquisition with EME
   *
   * @param {Object} data an object containing property names corresponding to
   * key system name strings (e.g. "org.w3.clearkey") and associated values
   * being instances of {@link ProtectionData}
   * @memberof module:ProtectionController
   * @instance
   * @ignore
   */
  function setProtectionData(data) {
    applicationProvidedProtectionData = data;
    protectionKeyController.setProtectionData(data);
  }

  /**
   * Returns the protection data set by the application for use in license acquisition with EME
   *
   * @memberof module:ProtectionController
   * @instance
   * @ignore
   */
  function getProtectionData() {
    return applicationProvidedProtectionData;
  }

  /**
   * Stop method is called when current playback is stopped/resetted.
   *
   * @memberof module:ProtectionController
   * @instance
   */
  function stop() {
    _abortLicenseRequest();
    if (protectionModel) {
      protectionModel.stop();
    }
  }

  /**
   * Destroys all protection data associated with this protection set.  This includes
   * deleting all key sessions. In the case of persistent key sessions, the sessions
   * will simply be unloaded and not deleted.  Additionally, if this protection set is
   * associated with a HTMLMediaElement, it will be detached from that element.
   *
   * @memberof module:ProtectionController
   * @instance
   * @ignore
   */
  function reset() {
    eventBus.off(events.INTERNAL_KEY_MESSAGE, _onKeyMessage, instance);
    _checkConfig();
    _abortLicenseRequest();
    setMediaElement(null);
    selectedKeySystem = null;
    keySystemSelectionInProgress = false;
    keyStatusMap = new Map();
    certificateCache = new Map();
    if (protectionModel) {
      protectionModel.reset();
      protectionModel = null;
    }
    needkeyRetries.forEach(retryTimeout => clearTimeout(retryTimeout));
    needkeyRetries = [];
    mediaInfoArr = [];
    pendingMediaTypesToHandle = [];
  }

  /**
   * Event handler for the key message event. Once we have a key message we can issue a license request
   * @param {object} e
   * @private
   */
  function _onKeyMessage(e) {
    logger.debug('DRM: onKeyMessage');

    // Dispatch event to applications indicating we received a key message
    const keyMessage = e.data;
    eventBus.trigger(events.KEY_MESSAGE, {
      data: keyMessage
    });
    const messageType = keyMessage.messageType ? keyMessage.messageType : _constants_ProtectionConstants_js__WEBPACK_IMPORTED_MODULE_11__["default"].MEDIA_KEY_MESSAGE_TYPES.LICENSE_REQUEST;
    const message = keyMessage.message;
    const sessionToken = keyMessage.sessionToken;
    const protData = _getProtDataForKeySystem(selectedKeySystem);
    const licenseServerModelInstance = protectionKeyController.getLicenseServerModelInstance(selectedKeySystem, protData, messageType);
    const eventData = {
      sessionToken: sessionToken,
      messageType: messageType
    };

    // Ensure message from CDM is not empty
    if (!message || message.byteLength === 0) {
      _sendLicenseRequestCompleteEvent(eventData, new _vo_DashJSError_js__WEBPACK_IMPORTED_MODULE_4__["default"](_errors_ProtectionErrors_js__WEBPACK_IMPORTED_MODULE_3__["default"].MEDIA_KEY_MESSAGE_NO_CHALLENGE_ERROR_CODE, _errors_ProtectionErrors_js__WEBPACK_IMPORTED_MODULE_3__["default"].MEDIA_KEY_MESSAGE_NO_CHALLENGE_ERROR_MESSAGE));
      return;
    }

    // Message not destined for license server
    if (!licenseServerModelInstance) {
      logger.debug('DRM: License server request not required for this message (type = ' + e.data.messageType + ').  Session ID = ' + sessionToken.getSessionId());
      _sendLicenseRequestCompleteEvent(eventData);
      return;
    }

    // Perform any special handling for ClearKey
    if (protectionKeyController.isClearKey(selectedKeySystem)) {
      const clearkeys = protectionKeyController.processClearKeyLicenseRequest(selectedKeySystem, protData, message);
      if (clearkeys && clearkeys.keyPairs && clearkeys.keyPairs.length > 0) {
        logger.debug('DRM: ClearKey license request handled by application!');
        _sendLicenseRequestCompleteEvent(eventData);
        protectionModel.updateKeySession(sessionToken, clearkeys);
        return;
      }
    }

    // In all other cases we have to make a license request
    _issueLicenseRequest(keyMessage, licenseServerModelInstance, protData);
  }

  /**
   * Notify other classes that the license request was completed
   * @param {object} data
   * @param {object} error
   * @private
   */
  function _sendLicenseRequestCompleteEvent(data, error = null) {
    eventBus.trigger(events.LICENSE_REQUEST_COMPLETE, {
      data: data,
      error: error
    });
  }

  /**
   * Start issuing a license request
   * @param {object} keyMessage
   * @param {object} licenseServerData
   * @param {object} protData
   * @private
   */
  function _issueLicenseRequest(keyMessage, licenseServerData, protData) {
    const sessionToken = keyMessage.sessionToken;
    const messageType = keyMessage.messageType ? keyMessage.messageType : _constants_ProtectionConstants_js__WEBPACK_IMPORTED_MODULE_11__["default"].MEDIA_KEY_MESSAGE_TYPES.LICENSE_REQUEST;
    const eventData = {
      sessionToken: sessionToken,
      messageType: messageType
    };
    const keySystemString = selectedKeySystem ? selectedKeySystem.systemString : null;

    // Determine license server URL
    let url = _getLicenseServerUrl(protData, messageType, sessionToken, keyMessage, licenseServerData);

    // Ensure valid license server URL
    if (!url) {
      _sendLicenseRequestCompleteEvent(eventData, new _vo_DashJSError_js__WEBPACK_IMPORTED_MODULE_4__["default"](_errors_ProtectionErrors_js__WEBPACK_IMPORTED_MODULE_3__["default"].MEDIA_KEY_MESSAGE_NO_LICENSE_SERVER_URL_ERROR_CODE, _errors_ProtectionErrors_js__WEBPACK_IMPORTED_MODULE_3__["default"].MEDIA_KEY_MESSAGE_NO_LICENSE_SERVER_URL_ERROR_MESSAGE));
      return;
    }

    // Set optional XMLHttpRequest headers from protection data and message
    const reqHeaders = {};
    let withCredentials = false;
    if (protData) {
      _updateHeaders(reqHeaders, protData.httpRequestHeaders);
    }
    const message = keyMessage.message;
    const headersFromMessage = selectedKeySystem.getRequestHeadersFromMessage(message);
    _updateHeaders(reqHeaders, headersFromMessage);
    Object.keys(reqHeaders).forEach(key => {
      if ('authorization' === key.toLowerCase()) {
        withCredentials = true;
      }
    });

    // Overwrite withCredentials property from protData if present
    if (protData && typeof protData.withCredentials == 'boolean') {
      withCredentials = protData.withCredentials;
    }
    const onLoad = function (xhr) {
      if (!protectionModel) {
        return;
      }
      if (xhr.status >= 200 && xhr.status <= 299) {
        const responseHeaders = _core_Utils_js__WEBPACK_IMPORTED_MODULE_9__["default"].parseHttpHeaders(xhr.getAllResponseHeaders ? xhr.getAllResponseHeaders() : null);
        let licenseResponse = new _vo_LicenseResponse_js__WEBPACK_IMPORTED_MODULE_6__["default"](xhr.responseURL, responseHeaders, xhr.response);
        const licenseResponseFilters = customParametersModel.getLicenseResponseFilters();
        _applyFilters(licenseResponseFilters, licenseResponse).then(() => {
          const licenseMessage = licenseServerData.getLicenseMessage(licenseResponse.data, keySystemString, messageType);
          if (licenseMessage !== null) {
            _sendLicenseRequestCompleteEvent(eventData);
            protectionModel.updateKeySession(sessionToken, licenseMessage);
          } else {
            _reportError(xhr, eventData, keySystemString, messageType, licenseServerData);
          }
        });
      } else {
        _reportError(xhr, eventData, keySystemString, messageType, licenseServerData);
      }
    };
    const onAbort = function (xhr) {
      _sendLicenseRequestCompleteEvent(eventData, new _vo_DashJSError_js__WEBPACK_IMPORTED_MODULE_4__["default"](_errors_ProtectionErrors_js__WEBPACK_IMPORTED_MODULE_3__["default"].MEDIA_KEY_MESSAGE_LICENSER_ERROR_CODE, _errors_ProtectionErrors_js__WEBPACK_IMPORTED_MODULE_3__["default"].MEDIA_KEY_MESSAGE_LICENSER_ERROR_MESSAGE + keySystemString + ' update, XHR aborted. status is "' + xhr.statusText + '" (' + xhr.status + '), readyState is ' + xhr.readyState));
    };
    const onError = function (xhr) {
      _sendLicenseRequestCompleteEvent(eventData, new _vo_DashJSError_js__WEBPACK_IMPORTED_MODULE_4__["default"](_errors_ProtectionErrors_js__WEBPACK_IMPORTED_MODULE_3__["default"].MEDIA_KEY_MESSAGE_LICENSER_ERROR_CODE, _errors_ProtectionErrors_js__WEBPACK_IMPORTED_MODULE_3__["default"].MEDIA_KEY_MESSAGE_LICENSER_ERROR_MESSAGE + keySystemString + ' update, XHR error. status is "' + xhr.statusText + '" (' + xhr.status + '), readyState is ' + xhr.readyState));
    };
    const reqPayload = selectedKeySystem.getLicenseRequestFromMessage(message);
    const reqMethod = licenseServerData.getHTTPMethod(messageType);
    const responseType = licenseServerData.getResponseType(keySystemString, messageType);
    const timeout = protData && !isNaN(protData.httpTimeout) ? protData.httpTimeout : LICENSE_SERVER_REQUEST_DEFAULT_TIMEOUT;
    const sessionId = sessionToken.getSessionId() || null;
    let licenseRequest = new _vo_LicenseRequest_js__WEBPACK_IMPORTED_MODULE_5__["default"](url, reqMethod, responseType, reqHeaders, withCredentials, messageType, sessionId, reqPayload);
    const retryAttempts = !isNaN(settings.get().streaming.retryAttempts[_vo_metrics_HTTPRequest_js__WEBPACK_IMPORTED_MODULE_7__.HTTPRequest.LICENSE]) ? settings.get().streaming.retryAttempts[_vo_metrics_HTTPRequest_js__WEBPACK_IMPORTED_MODULE_7__.HTTPRequest.LICENSE] : LICENSE_SERVER_REQUEST_RETRIES;
    const licenseRequestFilters = customParametersModel.getLicenseRequestFilters();
    _applyFilters(licenseRequestFilters, licenseRequest).then(() => {
      _doLicenseRequest(licenseRequest, retryAttempts, timeout, onLoad, onAbort, onError);
    });
  }

  /**
   * Implement license requests with a retry mechanism to avoid temporary network issues to affect playback experience
   * @param {object} request
   * @param {number} retriesCount
   * @param {number} timeout
   * @param {function} onLoad
   * @param {function} onAbort
   * @param {function} onError
   * @private
   */
  function _doLicenseRequest(request, retriesCount, timeout, onLoad, onAbort, onError) {
    const xhr = new XMLHttpRequest();

    // Apply CMCD data to the license request (handles both query and header modes)
    const cmcdRequest = {
      url: request.url,
      type: _vo_metrics_HTTPRequest_js__WEBPACK_IMPORTED_MODULE_7__.HTTPRequest.LICENSE,
      method: request.method,
      headers: request.headers || {}
    };
    cmcdController.applyCmcdToRequest(cmcdRequest);
    request.url = cmcdRequest.url;
    request.headers = cmcdRequest.headers;
    xhr.open(request.method, request.url, true);
    xhr.responseType = request.responseType;
    xhr.withCredentials = request.withCredentials;
    if (timeout > 0) {
      xhr.timeout = timeout;
    }
    for (const key in request.headers) {
      xhr.setRequestHeader(key, request.headers[key]);
    }
    const _retryRequest = function () {
      // fail silently and retry
      retriesCount--;
      const retryInterval = !isNaN(settings.get().streaming.retryIntervals[_vo_metrics_HTTPRequest_js__WEBPACK_IMPORTED_MODULE_7__.HTTPRequest.LICENSE]) ? settings.get().streaming.retryIntervals[_vo_metrics_HTTPRequest_js__WEBPACK_IMPORTED_MODULE_7__.HTTPRequest.LICENSE] : LICENSE_SERVER_REQUEST_RETRY_INTERVAL;
      licenseRequestRetryTimeout = setTimeout(function () {
        _doLicenseRequest(request, retriesCount, timeout, onLoad, onAbort, onError);
      }, retryInterval);
    };
    xhr.onload = function () {
      licenseXhrRequest = null;
      if (this.status >= 200 && this.status <= 299 || retriesCount <= 0) {
        onLoad(this);
      } else {
        logger.warn('License request failed (' + this.status + '). Retrying it... Pending retries: ' + retriesCount);
        _retryRequest();
      }
    };
    xhr.ontimeout = xhr.onerror = function () {
      licenseXhrRequest = null;
      if (retriesCount <= 0) {
        onError(this);
      } else {
        logger.warn('License request network request failed . Retrying it... Pending retries: ' + retriesCount);
        _retryRequest();
      }
    };
    xhr.onabort = function () {
      onAbort(this);
    };

    // deprecated, to be removed
    eventBus.trigger(events.LICENSE_REQUEST_SENDING, {
      url: request.url,
      headers: request.headers,
      payload: request.data,
      sessionId: request.sessionId
    });
    licenseXhrRequest = xhr;
    xhr.send(request.data);
  }

  /**
   * Aborts license request
   * @private
   */
  function _abortLicenseRequest() {
    if (licenseXhrRequest) {
      licenseXhrRequest.onloadend = licenseXhrRequest.onerror = licenseXhrRequest.onprogress = undefined; //Ignore events from aborted requests.
      licenseXhrRequest.abort();
      licenseXhrRequest = null;
    }
    if (licenseRequestRetryTimeout) {
      clearTimeout(licenseRequestRetryTimeout);
      licenseRequestRetryTimeout = null;
    }
  }

  /**
   * Returns the url of the license server
   * @param {object} protData
   * @param {string} messageType
   * @param {object} sessionToken
   * @param {object} keyMessage
   * @param {object} licenseServerData
   * @return {*}
   * @private
   */
  function _getLicenseServerUrl(protData, messageType, sessionToken, keyMessage, licenseServerData) {
    let url = null;
    const message = keyMessage.message;

    // Check if the url is defined by the application
    if (protData && protData.serverURL) {
      const serverURL = protData.serverURL;
      if (typeof serverURL === 'string' && serverURL !== '') {
        url = serverURL;
      } else if (typeof serverURL === 'object' && serverURL.hasOwnProperty(messageType)) {
        url = serverURL[messageType];
      }
    }

    // This is the old way of providing the url
    else if (protData && protData.laURL && protData.laURL !== '') {
      url = protData.laURL;
    }

    // No url provided by the app. Check the manifest and the pssh
    else {
      // Check for url defined in the manifest
      url = _CommonEncryption_js__WEBPACK_IMPORTED_MODULE_0__["default"].getLicenseServerUrlFromMediaInfo(mediaInfoArr, selectedKeySystem.schemeIdURI);

      // In case we are not using Clearky we can still get a url from the pssh.
      if (!url && !protectionKeyController.isClearKey(selectedKeySystem)) {
        const psshData = _CommonEncryption_js__WEBPACK_IMPORTED_MODULE_0__["default"].getPSSHData(sessionToken.initData);
        url = selectedKeySystem.getLicenseServerURLFromInitData(psshData);

        // Still no url, check the keymessage
        if (!url) {
          url = keyMessage.laURL;
        }
      }
    }
    // Possibly update or override the URL based on the message
    url = licenseServerData.getServerURLFromMessage(url, message, messageType);
    return url;
  }

  /**
   * Add new headers to the existing ones
   * @param {array} reqHeaders
   * @param {object} headers
   * @private
   */
  function _updateHeaders(reqHeaders, headers) {
    if (headers) {
      for (const key in headers) {
        reqHeaders[key] = headers[key];
      }
    }
  }

  /**
   * Reports an error that might have occured during the license request
   * @param {object} xhr
   * @param {object} eventData
   * @param {string} keySystemString
   * @param {string} messageType
   * @param {object} licenseServerData
   * @private
   */
  function _reportError(xhr, eventData, keySystemString, messageType, licenseServerData) {
    let errorMsg = 'NONE';
    let data = null;
    if (xhr.response) {
      errorMsg = licenseServerData.getErrorResponse(xhr.response, keySystemString, messageType);
      data = {
        serverResponse: xhr.response || null,
        responseCode: xhr.status || null,
        responseText: xhr.statusText || null
      };
    }
    _sendLicenseRequestCompleteEvent(eventData, new _vo_DashJSError_js__WEBPACK_IMPORTED_MODULE_4__["default"](_errors_ProtectionErrors_js__WEBPACK_IMPORTED_MODULE_3__["default"].MEDIA_KEY_MESSAGE_LICENSER_ERROR_CODE, _errors_ProtectionErrors_js__WEBPACK_IMPORTED_MODULE_3__["default"].MEDIA_KEY_MESSAGE_LICENSER_ERROR_MESSAGE + keySystemString + ' update, XHR complete. status is "' + xhr.statusText + '" (' + xhr.status + '), readyState is ' + xhr.readyState + '.  Response is ' + errorMsg, data));
  }

  /**
   * Applies custom filters defined by the application
   * @param {array} filters
   * @param {object} param
   * @return {Promise<void>|*}
   * @private
   */
  function _applyFilters(filters, param) {
    if (!filters) {
      return Promise.resolve();
    }
    return filters.reduce((prev, next) => {
      return prev.then(() => {
        return next(param);
      });
    }, Promise.resolve());
  }

  /**
   * Event handler for "needkey" and "encrypted" events
   * @param {object} event
   * @param {number} retry
   * @private
   */
  function _onNeedKey(event, retry) {
    if (settings.get().streaming.protection.ignoreEmeEncryptedEvent) {
      return;
    }
    logger.debug('DRM: onNeedKey');

    // Ignore unsupported initData types (only cenc and sinf are supported)
    if (event.key.initDataType !== _constants_ProtectionConstants_js__WEBPACK_IMPORTED_MODULE_11__["default"].INITIALIZATION_DATA_TYPE_CENC && event.key.initDataType !== _constants_ProtectionConstants_js__WEBPACK_IMPORTED_MODULE_11__["default"].INITIALIZATION_DATA_TYPE_SINF) {
      logger.warn('DRM:  Only \'cenc\' and \'sinf\' initData are supported!  Ignoring initData of type: ' + event.key.initDataType);
      return;
    }
    if (mediaInfoArr.length === 0) {
      logger.warn('DRM: onNeedKey called before initializeForMedia, wait until initialized');
      retry = typeof retry === 'undefined' ? 1 : retry + 1;
      if (retry < NEEDKEY_BEFORE_INITIALIZE_RETRIES) {
        needkeyRetries.push(setTimeout(() => {
          _onNeedKey(event, retry);
        }, NEEDKEY_BEFORE_INITIALIZE_TIMEOUT));
        return;
      }
    }

    // Some browsers return initData as Uint8Array (IE), some as ArrayBuffer (Chrome).
    // Convert to ArrayBuffer
    let abInitData = event.key.initData;
    if (ArrayBuffer.isView(abInitData)) {
      abInitData = abInitData.buffer;
    }
    const isSinf = event.key.initDataType === _constants_ProtectionConstants_js__WEBPACK_IMPORTED_MODULE_11__["default"].INITIALIZATION_DATA_TYPE_SINF;
    if (selectedKeySystem) {
      const initDataForCheck = isSinf ? abInitData : _CommonEncryption_js__WEBPACK_IMPORTED_MODULE_0__["default"].getPSSHForKeySystem(selectedKeySystem, abInitData);
      if (initDataForCheck && _isInitDataDuplicate(initDataForCheck)) {
        return;
      }
    }
    logger.debug('DRM: initData:', String.fromCharCode.apply(null, new Uint8Array(abInitData)));
    let supportedKeySystemsMetadata;
    if (isSinf) {
      // sinf data is FairPlay-specific; match against the FairPlay key system directly
      supportedKeySystemsMetadata = protectionKeyController.getSupportedKeySystemMetadataForSinf(abInitData, applicationProvidedProtectionData, sessionType);
    } else {
      supportedKeySystemsMetadata = protectionKeyController.getSupportedKeySystemMetadataFromSegmentPssh(abInitData, applicationProvidedProtectionData, sessionType);
    }
    if (supportedKeySystemsMetadata.length === 0) {
      logger.debug('DRM: Received needkey event with initData, but we don\'t support any of the key systems!');
      return;
    }
    _handleKeySystemFromPssh(supportedKeySystemsMetadata);
  }

  /**
   * Returns all available key systems
   * @return {array}
   */
  function getKeySystems() {
    return protectionKeyController ? protectionKeyController.getKeySystems() : [];
  }

  /**
   * Sets all available key systems
   * @param {array} keySystems
   */
  function setKeySystems(keySystems) {
    if (protectionKeyController) {
      protectionKeyController.setKeySystems(keySystems);
    }
  }
  function updateKeyStatusesMap(e) {
    try {
      if (!e || !e.sessionToken || !e.parsedKeyStatuses) {
        return;
      }
      e.sessionToken.hasTriggeredKeyStatusMapUpdate = true;
      const parsedKeyStatuses = e.parsedKeyStatuses;
      const ua = _core_Utils_js__WEBPACK_IMPORTED_MODULE_9__["default"].parseUserAgent();
      const isEdgeBrowser = ua && ua.browser && ua.browser.name && ua.browser.name.toLowerCase() === 'edge';
      parsedKeyStatuses.forEach(keyStatus => {
        if (isEdgeBrowser && selectedKeySystem.uuid === _constants_ProtectionConstants_js__WEBPACK_IMPORTED_MODULE_11__["default"].PLAYREADY_UUID && keyStatus.keyId && keyStatus.keyId.byteLength === 16) {
          _handlePlayreadyKeyId(keyStatus.keyId);
        }
        const keyIdInHex = _core_Utils_js__WEBPACK_IMPORTED_MODULE_9__["default"].bufferSourceToHex(keyStatus.keyId).slice(0, 32);
        if (keyIdInHex && keyIdInHex !== '') {
          keyStatusMap.set(keyIdInHex, keyStatus.status);
        }
      });
      eventBus.trigger(events.KEY_STATUSES_MAP_UPDATED, {
        keyStatusMap
      });
    } catch (e) {
      logger.error(e);
    }
  }
  function _handlePlayreadyKeyId(keyId) {
    const dataView = _core_Utils_js__WEBPACK_IMPORTED_MODULE_9__["default"].bufferSourceToDataView(keyId);
    const part0 = dataView.getUint32(0, /* LE= */true);
    const part1 = dataView.getUint16(4, /* LE= */true);
    const part2 = dataView.getUint16(6, /* LE= */true);
    // Write it back in big-endian:
    dataView.setUint32(0, part0, /* BE= */false);
    dataView.setUint16(4, part1, /* BE= */false);
    dataView.setUint16(6, part2, /* BE= */false);
  }
  function areKeyIdsUsable(normalizedKeyIds) {
    try {
      if (!_shouldCheckKeyStatusMap(normalizedKeyIds, keyStatusMap)) {
        return true;
      }
      return [...normalizedKeyIds].some(normalizedKeyId => {
        const keyStatus = keyStatusMap.get(normalizedKeyId);
        return keyStatus && keyStatus !== _constants_ProtectionConstants_js__WEBPACK_IMPORTED_MODULE_11__["default"].MEDIA_KEY_STATUSES.INTERNAL_ERROR && keyStatus !== _constants_ProtectionConstants_js__WEBPACK_IMPORTED_MODULE_11__["default"].MEDIA_KEY_STATUSES.OUTPUT_RESTRICTED;
      });
    } catch (error) {
      logger.error(error);
      return true;
    }
  }
  function areKeyIdsExpired(normalizedKeyIds) {
    try {
      if (!_shouldCheckKeyStatusMap(normalizedKeyIds, keyStatusMap)) {
        return false;
      }
      return [...normalizedKeyIds].every(normalizedKeyId => {
        const keyStatus = keyStatusMap.get(normalizedKeyId);
        return keyStatus === _constants_ProtectionConstants_js__WEBPACK_IMPORTED_MODULE_11__["default"].MEDIA_KEY_STATUSES.EXPIRED;
      });
    } catch (error) {
      logger.error(error);
      return false;
    }
  }
  function _shouldCheckKeyStatusMap(normalizedKeyIds, keyStatusMap) {
    if (normalizedKeyIds.size <= 0) {
      return false;
    }
    const allHaveStatus = keyStatusMap.size > 0 && [...normalizedKeyIds].every(normalizedKeyId => {
      const keyStatus = keyStatusMap.get(normalizedKeyId);
      return typeof keyStatus !== 'undefined' && keyStatus !== '';
    });
    if (allHaveStatus) {
      return true;
    }
    const sessionTokens = protectionModel.getSessionTokens();
    if (sessionTokens && sessionTokens.length > 0) {
      const targetSessionTokens = sessionTokens.filter(sessionToken => {
        return [...normalizedKeyIds].includes(sessionToken.normalizedKeyId);
      });
      const hasNotTriggeredKeyStatusMapUpdate = targetSessionTokens.some(sessionToken => {
        return !sessionToken.hasTriggeredKeyStatusMapUpdate;
      });
      if (hasNotTriggeredKeyStatusMapUpdate || targetSessionTokens.length === 0) {
        return false;
      }
    }
    return !settings.get().streaming.protection.ignoreKeyStatuses && normalizedKeyIds && normalizedKeyIds.size > 0 && keyStatusMap && keyStatusMap.size > 0;
  }
  instance = {
    areKeyIdsExpired,
    areKeyIdsUsable,
    clearMediaInfoArray,
    closeKeySession,
    createKeySession,
    getKeySystems,
    getProtectionData,
    getSupportedKeySystemMetadataFromContentProtection,
    handleKeySystemFromManifest,
    initializeForMedia,
    loadKeySession,
    removeKeySession,
    reset,
    setKeySystems,
    setMediaElement,
    setProtectionData,
    setRobustnessLevel,
    setServerCertificate,
    setSessionType,
    stop,
    updateKeyStatusesMap
  };
  setup();
  return instance;
}
ProtectionController.__dashjs_factory_name = 'ProtectionController';
/* harmony default export */ __webpack_exports__["default"] = (_core_FactoryMaker_js__WEBPACK_IMPORTED_MODULE_10__["default"].getClassFactory(ProtectionController));

/***/ }),

/***/ "./src/streaming/protection/controllers/ProtectionKeyController.js":
/*!*************************************************************************!*\
  !*** ./src/streaming/protection/controllers/ProtectionKeyController.js ***!
  \*************************************************************************/
/***/ (function(__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony import */ var _CommonEncryption_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./../CommonEncryption.js */ "./src/streaming/protection/CommonEncryption.js");
/* harmony import */ var _drm_KeySystemClearKey_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./../drm/KeySystemClearKey.js */ "./src/streaming/protection/drm/KeySystemClearKey.js");
/* harmony import */ var _drm_KeySystemW3CClearKey_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./../drm/KeySystemW3CClearKey.js */ "./src/streaming/protection/drm/KeySystemW3CClearKey.js");
/* harmony import */ var _drm_KeySystemWidevine_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./../drm/KeySystemWidevine.js */ "./src/streaming/protection/drm/KeySystemWidevine.js");
/* harmony import */ var _drm_KeySystemPlayReady_js__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ./../drm/KeySystemPlayReady.js */ "./src/streaming/protection/drm/KeySystemPlayReady.js");
/* harmony import */ var _drm_KeySystemFairPlay_js__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ./../drm/KeySystemFairPlay.js */ "./src/streaming/protection/drm/KeySystemFairPlay.js");
/* harmony import */ var _servers_DRMToday_js__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! ./../servers/DRMToday.js */ "./src/streaming/protection/servers/DRMToday.js");
/* harmony import */ var _servers_PlayReady_js__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(/*! ./../servers/PlayReady.js */ "./src/streaming/protection/servers/PlayReady.js");
/* harmony import */ var _servers_Widevine_js__WEBPACK_IMPORTED_MODULE_8__ = __webpack_require__(/*! ./../servers/Widevine.js */ "./src/streaming/protection/servers/Widevine.js");
/* harmony import */ var _servers_FairPlay_js__WEBPACK_IMPORTED_MODULE_9__ = __webpack_require__(/*! ./../servers/FairPlay.js */ "./src/streaming/protection/servers/FairPlay.js");
/* harmony import */ var _servers_ClearKey_js__WEBPACK_IMPORTED_MODULE_10__ = __webpack_require__(/*! ./../servers/ClearKey.js */ "./src/streaming/protection/servers/ClearKey.js");
/* harmony import */ var _constants_ProtectionConstants_js__WEBPACK_IMPORTED_MODULE_11__ = __webpack_require__(/*! ../../constants/ProtectionConstants.js */ "./src/streaming/constants/ProtectionConstants.js");
/* harmony import */ var _core_FactoryMaker_js__WEBPACK_IMPORTED_MODULE_12__ = __webpack_require__(/*! ../../../core/FactoryMaker.js */ "./src/core/FactoryMaker.js");
/* harmony import */ var _vo_KeySystemMetadata_js__WEBPACK_IMPORTED_MODULE_13__ = __webpack_require__(/*! ../vo/KeySystemMetadata.js */ "./src/streaming/protection/vo/KeySystemMetadata.js");
/**
 * The copyright in this software is being made available under the BSD License,
 * included below. This software may be subject to other third party and contributor
 * rights, including patent rights, and no such rights are granted under this license.
 *
 * Copyright (c) 2013, Dash Industry Forum.
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without modification,
 * are permitted provided that the following conditions are met:
 *  * Redistributions of source code must retain the above copyright notice, this
 *  list of conditions and the following disclaimer.
 *  * Redistributions in binary form must reproduce the above copyright notice,
 *  this list of conditions and the following disclaimer in the documentation and/or
 *  other materials provided with the distribution.
 *  * Neither the name of Dash Industry Forum nor the names of its
 *  contributors may be used to endorse or promote products derived from this software
 *  without specific prior written permission.
 *
 *  THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS AS IS AND ANY
 *  EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 *  WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED.
 *  IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT,
 *  INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT
 *  NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
 *  PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY,
 *  WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
 *  ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
 *  POSSIBILITY OF SUCH DAMAGE.
 */















/**
 * @module ProtectionKeyController
 * @ignore
 * @description Media protection key system functionality that can be modified/overridden by applications
 */
function ProtectionKeyController() {
  let context = this.context;
  let instance, debug, logger, keySystems, BASE64, settings, clearkeyKeySystem, clearkeyW3CKeySystem;
  function setConfig(config) {
    if (!config) {
      return;
    }
    if (config.debug) {
      debug = config.debug;
      logger = debug.getLogger(instance);
    }
    if (config.BASE64) {
      BASE64 = config.BASE64;
    }
    if (config.settings) {
      settings = config.settings;
    }
  }
  function initialize() {
    keySystems = [];
    let keySystem;

    // PlayReady
    keySystem = (0,_drm_KeySystemPlayReady_js__WEBPACK_IMPORTED_MODULE_4__["default"])(context).getInstance({
      BASE64: BASE64,
      settings: settings
    });
    keySystems.push(keySystem);

    // Widevine
    keySystem = (0,_drm_KeySystemWidevine_js__WEBPACK_IMPORTED_MODULE_3__["default"])(context).getInstance({
      BASE64: BASE64
    });
    keySystems.push(keySystem);

    // FairPlay
    keySystem = (0,_drm_KeySystemFairPlay_js__WEBPACK_IMPORTED_MODULE_5__["default"])(context).getInstance();
    keySystems.push(keySystem);

    // ClearKey
    keySystem = (0,_drm_KeySystemClearKey_js__WEBPACK_IMPORTED_MODULE_1__["default"])(context).getInstance({
      BASE64: BASE64
    });
    keySystems.push(keySystem);
    clearkeyKeySystem = keySystem;

    // W3C ClearKey
    keySystem = (0,_drm_KeySystemW3CClearKey_js__WEBPACK_IMPORTED_MODULE_2__["default"])(context).getInstance({
      BASE64: BASE64,
      debug: debug
    });
    keySystems.push(keySystem);
    clearkeyW3CKeySystem = keySystem;
  }

  /**
   * Returns a prioritized list of key systems supported
   * by this player (not necessarily those supported by the
   * user agent)
   *
   * @returns {Array.<KeySystem>} a prioritized
   * list of key systems
   * @memberof module:ProtectionKeyController
   * @instance
   */
  function getKeySystems() {
    return keySystems;
  }

  /**
   * Sets the prioritized list of key systems to be supported
   * by this player.
   *
   * @param {Array.<KeySystem>} newKeySystems the new prioritized
   * list of key systems
   * @memberof module:ProtectionKeyController
   * @instance
   */
  function setKeySystems(newKeySystems) {
    keySystems = newKeySystems;
  }

  /**
   * Returns the key system associated with the given key system string
   * name (i.e. 'org.w3.clearkey')
   *
   * @param {string} systemString the system string
   * @returns {KeySystem|null} the key system
   * or null if no supported key system is associated with the given key
   * system string
   * @memberof module:ProtectionKeyController
   * @instance
   */
  function getKeySystemBySystemString(systemString) {
    for (let i = 0; i < keySystems.length; i++) {
      if (keySystems[i].systemString === systemString) {
        return keySystems[i];
      }
    }
    return null;
  }

  /**
   * Determines whether the given key system is ClearKey.  This is
   * necessary because the EME spec defines ClearKey and its method
   * for providing keys to the key session; and this method has changed
   * between the various API versions.  Our EME-specific ProtectionModels
   * must know if the system is ClearKey so that it can format the keys
   * according to the particular spec version.
   *
   * @param {Object} keySystem the key
   * @returns {boolean} true if this is the ClearKey key system, false
   * otherwise
   * @memberof module:ProtectionKeyController
   * @instance
   */
  function isClearKey(keySystem) {
    return keySystem === clearkeyKeySystem || keySystem === clearkeyW3CKeySystem;
  }

  /**
   * Check equality of initData array buffers.
   *
   * @param {ArrayBuffer} initData1 - first initData
   * @param {ArrayBuffer} initData2 - second initData
   * @returns {boolean} true if the initData arrays are equal in size and
   * contents, false otherwise
   * @memberof module:ProtectionKeyController
   * @instance
   */
  function initDataEquals(initData1, initData2) {
    if (initData1.byteLength === initData2.byteLength) {
      let data1 = new Uint8Array(initData1);
      let data2 = new Uint8Array(initData2);
      for (let j = 0; j < data1.length; j++) {
        if (data1[j] !== data2[j]) {
          return false;
        }
      }
      return true;
    }
    return false;
  }

  /**
   * Returns a set of supported key systems and CENC initialization data
   * from the given array of ContentProtection elements.  Only
   * key systems that are supported by this player will be returned.
   * Key systems are returned in priority order (highest first).
   *
   * @param {Array.<Object>} contentProtectionElements - array of content protection elements parsed
   * from the manifest
   * @param {ProtectionData} applicationSpecifiedProtectionData user specified protection data - license server url etc
   * supported by the content
   * @param {string} sessionType session type
   * @returns {Array.<Object>} array of objects indicating which supported key
   * systems were found.  Empty array is returned if no supported key systems were found
   * @memberof module:ProtectionKeyController
   * @instance
   */
  function getSupportedKeySystemMetadataFromContentProtection(contentProtectionElements, applicationSpecifiedProtectionData, sessionType) {
    let contentProtectionElement, keySystem, ksIdx, cpIdx;
    let supportedKS = [];
    if (!contentProtectionElements || !contentProtectionElements.length) {
      return supportedKS;
    }
    const mp4ProtectionElement = _CommonEncryption_js__WEBPACK_IMPORTED_MODULE_0__["default"].findMp4ProtectionElement(contentProtectionElements);
    for (ksIdx = 0; ksIdx < keySystems.length; ksIdx++) {
      keySystem = keySystems[ksIdx];

      // Get protection data that applies for current key system
      const protData = _getProtDataForKeySystem(keySystem.systemString, applicationSpecifiedProtectionData);
      for (cpIdx = 0; cpIdx < contentProtectionElements.length; cpIdx++) {
        contentProtectionElement = contentProtectionElements[cpIdx];
        if (contentProtectionElement.schemeIdUri.toLowerCase() === keySystem.schemeIdURI) {
          // Look for DRM-specific ContentProtection
          let initData = keySystem.getInitData(contentProtectionElement, mp4ProtectionElement);
          const keySystemMetadata = new _vo_KeySystemMetadata_js__WEBPACK_IMPORTED_MODULE_13__["default"]({
            ks: keySystems[ksIdx],
            keyId: contentProtectionElement.keyId,
            initData: initData,
            protData: protData,
            cdmData: keySystem.getCDMData(protData ? protData.cdmData : null),
            sessionId: _getSessionId(protData, contentProtectionElement),
            sessionType: _getSessionType(protData, sessionType)
          });
          if (protData) {
            supportedKS.unshift(keySystemMetadata);
          } else {
            supportedKS.push(keySystemMetadata);
          }
        }
      }
    }
    return supportedKS;
  }

  /**
   * Returns key systems supported by this player for the given PSSH
   * initializationData. Key systems are returned in priority order
   * (highest priority first)
   *
   * @param {ArrayBuffer} initData Concatenated PSSH data for all DRMs
   * supported by the content
   * @param {ProtectionData} protDataSet user specified protection data - license server url etc
   * supported by the content
   * @param {string} default session type
   * @returns {Array.<Object>} array of objects indicating which supported key
   * systems were found.  Empty array is returned if no
   * supported key systems were found
   * @memberof module:ProtectionKeyController
   * @instance
   */
  function getSupportedKeySystemMetadataFromSegmentPssh(initData, protDataSet, sessionType) {
    let supportedKS = [];
    let pssh = _CommonEncryption_js__WEBPACK_IMPORTED_MODULE_0__["default"].parsePSSHList(initData);
    let ks, keySystemString;
    for (let ksIdx = 0; ksIdx < keySystems.length; ++ksIdx) {
      ks = keySystems[ksIdx];
      keySystemString = ks.systemString;

      // Get protection data that applies for current key system
      const protData = _getProtDataForKeySystem(keySystemString, protDataSet);
      if (ks.uuid in pssh) {
        supportedKS.push({
          ks: ks,
          initData: pssh[ks.uuid],
          protData: protData,
          cdmData: ks.getCDMData(protData ? protData.cdmData : null),
          sessionId: _getSessionId(protData),
          sessionType: _getSessionType(protData, sessionType)
        });
      }
    }
    return supportedKS;
  }

  /**
   * Build key system metadata for sinf (FairPlay) initData.
   * Since sinf data has no PSSH UUIDs, we match against the FairPlay key system directly.
   * @param {ArrayBuffer} initData
   * @return {Array}
   * @private
   */
  function getSupportedKeySystemMetadataForSinf(initData, applicationProvidedProtectionData, sessionType) {
    const fairplayKs = getKeySystemBySystemString(_constants_ProtectionConstants_js__WEBPACK_IMPORTED_MODULE_11__["default"].FAIRPLAY_KEYSTEM_STRING);
    if (!fairplayKs) {
      return [];
    }
    const keyId = _extractKeyIdFromSinf(initData);
    const protData = applicationProvidedProtectionData ? applicationProvidedProtectionData[_constants_ProtectionConstants_js__WEBPACK_IMPORTED_MODULE_11__["default"].FAIRPLAY_KEYSTEM_STRING] || null : null;
    return [{
      ks: fairplayKs,
      keyId: keyId,
      initData: initData,
      protData: protData,
      cdmData: fairplayKs.getCDMData(protData ? protData.cdmData : null),
      sessionType: sessionType
    }];
  }

  /**
   * Extract the defaultKID from the tenc box inside a sinf initData.
   * Safari sends sinf initData as JSON: {"sinf": ["<base64-encoded sinf box>"]}
   * The sinf box contains: sinf > schi > tenc, where the KID is 12 bytes after the 'tenc' fourcc.
   * @param {ArrayBuffer} initData
   * @return {string|null} key ID as UUID string, or null if not found
   * @private
   */
  function _extractKeyIdFromSinf(initData) {
    if (!initData || initData.byteLength < 12) {
      return null;
    }
    let sinfBytes;
    try {
      // Safari wraps sinf in JSON: {"sinf": ["<base64>"]}
      const text = String.fromCharCode.apply(null, new Uint8Array(initData));
      const json = JSON.parse(text);
      if (json.sinf && json.sinf.length > 0) {
        const binaryString = atob(json.sinf[0]);
        sinfBytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          sinfBytes[i] = binaryString.charCodeAt(i);
        }
      }
    } catch (e) {
      // Not JSON — treat as raw binary sinf
      sinfBytes = new Uint8Array(initData);
    }
    if (!sinfBytes || sinfBytes.length < 12) {
      return null;
    }

    // Search for 'tenc' fourcc (0x74 0x65 0x6E 0x63)
    for (let i = 0; i < sinfBytes.length - 28; i++) {
      if (sinfBytes[i] === 0x74 && sinfBytes[i + 1] === 0x65 && sinfBytes[i + 2] === 0x6E && sinfBytes[i + 3] === 0x63) {
        // tenc found: KID is 12 bytes after the fourcc
        // [tenc fourcc (4)] [version (1) + flags (3)] [reserved/crypt (1) + reserved/skip (1)] [isProtected (1) + ivSize (1)] = 12 bytes
        const kidOffset = i + 12;
        if (kidOffset + 16 > sinfBytes.length) {
          return null;
        }
        const kid = sinfBytes.subarray(kidOffset, kidOffset + 16);
        // Format as UUID: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
        const hex = Array.from(kid).map(b => b.toString(16).padStart(2, '0')).join('');
        return hex.slice(0, 8) + '-' + hex.slice(8, 12) + '-' + hex.slice(12, 16) + '-' + hex.slice(16, 20) + '-' + hex.slice(20, 32);
      }
    }
    return null;
  }

  /**
   * Returns the license server implementation data that should be used for this request.
   *
   * @param {KeySystem} keySystem the key system
   * associated with this license request
   * @param {ProtectionData} protData protection data to use for the
   * request
   * @param {string} [messageType="license-request"] the message type associated with this
   * request.  Supported message types can be found
   * {@link https://w3c.github.io/encrypted-media/#idl-def-MediaKeyMessageType|here}.
   * @returns {LicenseServer|null} the license server
   * implementation that should be used for this request or null if the player should not
   * pass messages of the given type to a license server
   * @memberof module:ProtectionKeyController
   * @instance
   *
   */
  function getLicenseServerModelInstance(keySystem, protData, messageType) {
    // Our default server implementations do not do anything with "license-release" or
    // "individualization-request" messages, so we just send a success event
    if (messageType === _constants_ProtectionConstants_js__WEBPACK_IMPORTED_MODULE_11__["default"].MEDIA_KEY_MESSAGE_TYPES.LICENSE_RELEASE || messageType === _constants_ProtectionConstants_js__WEBPACK_IMPORTED_MODULE_11__["default"].MEDIA_KEY_MESSAGE_TYPES.INDIVIDUALIZATION_REQUEST) {
      return null;
    }
    let licenseServerData = null;
    if (protData && protData.hasOwnProperty('drmtoday')) {
      licenseServerData = (0,_servers_DRMToday_js__WEBPACK_IMPORTED_MODULE_6__["default"])(context).getInstance({
        BASE64: BASE64
      });
    } else if (keySystem.systemString === _constants_ProtectionConstants_js__WEBPACK_IMPORTED_MODULE_11__["default"].WIDEVINE_KEYSTEM_STRING) {
      licenseServerData = (0,_servers_Widevine_js__WEBPACK_IMPORTED_MODULE_8__["default"])(context).getInstance();
    } else if (keySystem.systemString === _constants_ProtectionConstants_js__WEBPACK_IMPORTED_MODULE_11__["default"].FAIRPLAY_KEYSTEM_STRING) {
      licenseServerData = (0,_servers_FairPlay_js__WEBPACK_IMPORTED_MODULE_9__["default"])(context).getInstance();
    } else if (keySystem.systemString === _constants_ProtectionConstants_js__WEBPACK_IMPORTED_MODULE_11__["default"].PLAYREADY_KEYSTEM_STRING) {
      licenseServerData = (0,_servers_PlayReady_js__WEBPACK_IMPORTED_MODULE_7__["default"])(context).getInstance();
    } else if (keySystem.systemString === _constants_ProtectionConstants_js__WEBPACK_IMPORTED_MODULE_11__["default"].CLEARKEY_KEYSTEM_STRING) {
      licenseServerData = (0,_servers_ClearKey_js__WEBPACK_IMPORTED_MODULE_10__["default"])(context).getInstance();
    }
    return licenseServerData;
  }

  /**
   * Allows application-specific retrieval of ClearKey keys.
   *
   * @param {KeySystem} clearkeyKeySystem They exact ClearKey System to be used
   * @param {ProtectionData} protData protection data to use for the
   * request
   * @param {ArrayBuffer} message the key message from the CDM
   * @return {ClearKeyKeySet|null} the clear keys associated with
   * the request or null if no keys can be returned by this function
   * @memberof module:ProtectionKeyController
   * @instance
   */
  function processClearKeyLicenseRequest(clearkeyKeySystem, protData, message) {
    try {
      return clearkeyKeySystem.getClearKeysFromProtectionData(protData, message);
    } catch (error) {
      logger.error('Failed to retrieve clearkeys from ProtectionData');
      return null;
    }
  }
  function setProtectionData(protectionDataSet) {
    var getProtectionData = function (keySystemString) {
      var protData = null;
      if (protectionDataSet) {
        protData = keySystemString in protectionDataSet ? protectionDataSet[keySystemString] : null;
      }
      return protData;
    };
    for (var i = 0; i < keySystems.length; i++) {
      var keySystem = keySystems[i];
      if (keySystem.hasOwnProperty('init')) {
        keySystem.init(getProtectionData(keySystem.systemString));
      }
    }
  }
  function _getProtDataForKeySystem(systemString, protDataSet) {
    if (!protDataSet) {
      return null;
    }
    return systemString in protDataSet ? protDataSet[systemString] : null;
  }
  function _getSessionId(protData, cp) {
    // Get sessionId from protectionData or from manifest (ContentProtection)
    if (protData && protData.sessionId) {
      return protData.sessionId;
    } else if (cp && cp.sessionId) {
      return cp.sessionId;
    }
    return null;
  }
  function _getSessionType(protData, sessionType) {
    return protData && protData.sessionType ? protData.sessionType : sessionType;
  }
  instance = {
    getKeySystemBySystemString,
    getKeySystems,
    getLicenseServerModelInstance,
    getSupportedKeySystemMetadataForSinf,
    getSupportedKeySystemMetadataFromContentProtection,
    getSupportedKeySystemMetadataFromSegmentPssh,
    initDataEquals,
    initialize,
    isClearKey,
    processClearKeyLicenseRequest,
    setConfig,
    setKeySystems,
    setProtectionData
  };
  return instance;
}
ProtectionKeyController.__dashjs_factory_name = 'ProtectionKeyController';
/* harmony default export */ __webpack_exports__["default"] = (_core_FactoryMaker_js__WEBPACK_IMPORTED_MODULE_12__["default"].getSingletonFactory(ProtectionKeyController));

/***/ }),

/***/ "./src/streaming/protection/drm/KeySystemClearKey.js":
/*!***********************************************************!*\
  !*** ./src/streaming/protection/drm/KeySystemClearKey.js ***!
  \***********************************************************/
/***/ (function(__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony import */ var _vo_KeyPair_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../vo/KeyPair.js */ "./src/streaming/protection/vo/KeyPair.js");
/* harmony import */ var _vo_ClearKeyKeySet_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../vo/ClearKeyKeySet.js */ "./src/streaming/protection/vo/ClearKeyKeySet.js");
/* harmony import */ var _CommonEncryption_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../CommonEncryption.js */ "./src/streaming/protection/CommonEncryption.js");
/* harmony import */ var _constants_ProtectionConstants_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../../constants/ProtectionConstants.js */ "./src/streaming/constants/ProtectionConstants.js");
/* harmony import */ var _core_FactoryMaker_js__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ../../../core/FactoryMaker.js */ "./src/core/FactoryMaker.js");
/**
 * The copyright in this software is being made available under the BSD License,
 * included below. This software may be subject to other third party and contributor
 * rights, including patent rights, and no such rights are granted under this license.
 *
 * Copyright (c) 2013, Dash Industry Forum.
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without modification,
 * are permitted provided that the following conditions are met:
 *  * Redistributions of source code must retain the above copyright notice, this
 *  list of conditions and the following disclaimer.
 *  * Redistributions in binary form must reproduce the above copyright notice,
 *  this list of conditions and the following disclaimer in the documentation and/or
 *  other materials provided with the distribution.
 *  * Neither the name of Dash Industry Forum nor the names of its
 *  contributors may be used to endorse or promote products derived from this software
 *  without specific prior written permission.
 *
 *  THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS AS IS AND ANY
 *  EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 *  WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED.
 *  IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT,
 *  INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT
 *  NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
 *  PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY,
 *  WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
 *  ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
 *  POSSIBILITY OF SUCH DAMAGE.
 */






const uuid = _constants_ProtectionConstants_js__WEBPACK_IMPORTED_MODULE_3__["default"].CLEARKEY_UUID;
const systemString = _constants_ProtectionConstants_js__WEBPACK_IMPORTED_MODULE_3__["default"].CLEARKEY_KEYSTEM_STRING;
const schemeIdURI = 'urn:uuid:' + uuid;
function KeySystemClearKey(config) {
  config = config || {};
  let instance;
  const BASE64 = config.BASE64;

  /**
   * Returns desired clearkeys (as specified in the CDM message) from protection data
   *
   * @param {ProtectionData} protectionData the protection data
   * @param {ArrayBuffer} message the ClearKey CDM message
   * @returns {ClearKeyKeySet} the key set or null if none found
   * @throws {Error} if a keyID specified in the CDM message was not found in the
   * protection data
   * @memberof KeySystemClearKey
   */
  function getClearKeysFromProtectionData(protectionData, message) {
    let clearkeySet = null;
    if (protectionData) {
      // ClearKey is the only system that does not require a license server URL, so we
      // handle it here when keys are specified in protection data
      const jsonMsg = JSON.parse(String.fromCharCode.apply(null, new Uint8Array(message)));
      const keyPairs = [];
      for (let i = 0; i < jsonMsg.kids.length; i++) {
        const clearkeyID = jsonMsg.kids[i];
        const clearkey = protectionData.clearkeys && protectionData.clearkeys.hasOwnProperty(clearkeyID) ? protectionData.clearkeys[clearkeyID] : null;
        if (!clearkey) {
          throw new Error('DRM: ClearKey keyID (' + clearkeyID + ') is not known!');
        }
        // KeyIDs from CDM are not base64 padded.  Keys may or may not be padded
        keyPairs.push(new _vo_KeyPair_js__WEBPACK_IMPORTED_MODULE_0__["default"](clearkeyID, clearkey));
      }
      clearkeySet = new _vo_ClearKeyKeySet_js__WEBPACK_IMPORTED_MODULE_1__["default"](keyPairs);
    }
    return clearkeySet;
  }
  function getInitData(cp, cencContentProtection) {
    try {
      let initData = _CommonEncryption_js__WEBPACK_IMPORTED_MODULE_2__["default"].parseInitDataFromContentProtection(cp, BASE64);
      if (!initData && cencContentProtection) {
        const cencDefaultKid = cencDefaultKidToBase64Representation(cencContentProtection.cencDefaultKid);
        const data = {
          kids: [cencDefaultKid]
        };
        initData = new TextEncoder().encode(JSON.stringify(data));
      }
      return initData;
    } catch (e) {
      return null;
    }
  }
  function cencDefaultKidToBase64Representation(cencDefaultKid) {
    try {
      let kid = cencDefaultKid.replace(/-/g, '');
      kid = btoa(kid.match(/\w{2}/g).map(a => {
        return String.fromCharCode(parseInt(a, 16));
      }).join(''));
      return kid.replace(/=/g, '').replace(/\//g, '_').replace(/\+/g, '-');
    } catch (e) {
      return null;
    }
  }
  function getRequestHeadersFromMessage(/*message*/
  ) {
    // Set content type to application/json by default
    return {
      'Content-Type': 'application/json'
    };
  }
  function getLicenseRequestFromMessage(message) {
    return JSON.stringify(JSON.parse(String.fromCharCode.apply(null, new Uint8Array(message))));
  }
  function getLicenseServerURLFromInitData(/*initData*/
  ) {
    return null;
  }
  function getCDMData(/*cdmData*/
  ) {
    return null;
  }
  instance = {
    uuid,
    schemeIdURI,
    systemString,
    getInitData,
    getRequestHeadersFromMessage,
    getLicenseRequestFromMessage,
    getLicenseServerURLFromInitData,
    getCDMData,
    getClearKeysFromProtectionData
  };
  return instance;
}
KeySystemClearKey.__dashjs_factory_name = 'KeySystemClearKey';
/* harmony default export */ __webpack_exports__["default"] = (_core_FactoryMaker_js__WEBPACK_IMPORTED_MODULE_4__["default"].getSingletonFactory(KeySystemClearKey));

/***/ }),

/***/ "./src/streaming/protection/drm/KeySystemFairPlay.js":
/*!***********************************************************!*\
  !*** ./src/streaming/protection/drm/KeySystemFairPlay.js ***!
  \***********************************************************/
/***/ (function(__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony import */ var _constants_ProtectionConstants_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../../constants/ProtectionConstants.js */ "./src/streaming/constants/ProtectionConstants.js");
/* harmony import */ var _core_FactoryMaker_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../../../core/FactoryMaker.js */ "./src/core/FactoryMaker.js");
/**
 * The copyright in this software is being made available under the BSD License,
 * included below. This software may be subject to other third party and contributor
 * rights, including patent rights, and no such rights are granted under this license.
 *
 * Copyright (c) 2026, Dash Industry Forum.
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without modification,
 * are permitted provided that the following conditions are met:
 *  * Redistributions of source code must retain the above copyright notice, this
 *  list of conditions and the following disclaimer.
 *  * Redistributions in binary form must reproduce the above copyright notice,
 *  this list of conditions and the following disclaimer in the documentation and/or
 *  other materials provided with the distribution.
 *  * Neither the name of Dash Industry Forum nor the names of its
 *  contributors may be used to endorse or promote products derived from this software
 *  without specific prior written permission.
 *
 *  THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS AS IS AND ANY
 *  EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 *  WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED.
 *  IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT,
 *  INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT
 *  NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
 *  PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY,
 *  WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
 *  ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
 *  POSSIBILITY OF SUCH DAMAGE.
 */

/**
 * Apple FairPlay Streaming DRM
 *
 * @class
 * @implements MediaPlayer.dependencies.protection.KeySystem
 */



const uuid = _constants_ProtectionConstants_js__WEBPACK_IMPORTED_MODULE_0__["default"].FAIRPLAY_UUID;
const systemString = _constants_ProtectionConstants_js__WEBPACK_IMPORTED_MODULE_0__["default"].FAIRPLAY_KEYSTEM_STRING;
const schemeIdURI = 'urn:uuid:' + uuid;
function KeySystemFairPlay() {
  let instance;

  /**
   * FairPlay has no PSSH in the manifest. Init data comes from the encrypted event with sinf type.
   */
  function getInitData(/*cp*/
  ) {
    return null;
  }
  function getRequestHeadersFromMessage(/*message*/
  ) {
    return {
      'Content-Type': 'application/octet-stream'
    };
  }
  function getLicenseRequestFromMessage(message) {
    return new Uint8Array(message);
  }
  function getLicenseServerURLFromInitData(/*initData*/
  ) {
    return null;
  }
  function getCDMData(/*cdmData*/
  ) {
    return null;
  }
  instance = {
    uuid,
    schemeIdURI,
    systemString,
    getInitData,
    getRequestHeadersFromMessage,
    getLicenseRequestFromMessage,
    getLicenseServerURLFromInitData,
    getCDMData
  };
  return instance;
}
KeySystemFairPlay.__dashjs_factory_name = 'KeySystemFairPlay';
/* harmony default export */ __webpack_exports__["default"] = (_core_FactoryMaker_js__WEBPACK_IMPORTED_MODULE_1__["default"].getSingletonFactory(KeySystemFairPlay));

/***/ }),

/***/ "./src/streaming/protection/drm/KeySystemPlayReady.js":
/*!************************************************************!*\
  !*** ./src/streaming/protection/drm/KeySystemPlayReady.js ***!
  \************************************************************/
/***/ (function(__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony import */ var _CommonEncryption_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../CommonEncryption.js */ "./src/streaming/protection/CommonEncryption.js");
/* harmony import */ var _constants_ProtectionConstants_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../../constants/ProtectionConstants.js */ "./src/streaming/constants/ProtectionConstants.js");
/* harmony import */ var _core_FactoryMaker_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../../../core/FactoryMaker.js */ "./src/core/FactoryMaker.js");
/**
 * The copyright in this software is being made available under the BSD License,
 * included below. This software may be subject to other third party and contributor
 * rights, including patent rights, and no such rights are granted under this license.
 *
 * Copyright (c) 2013, Dash Industry Forum.
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without modification,
 * are permitted provided that the following conditions are met:
 *  * Redistributions of source code must retain the above copyright notice, this
 *  list of conditions and the following disclaimer.
 *  * Redistributions in binary form must reproduce the above copyright notice,
 *  this list of conditions and the following disclaimer in the documentation and/or
 *  other materials provided with the distribution.
 *  * Neither the name of Dash Industry Forum nor the names of its
 *  contributors may be used to endorse or promote products derived from this software
 *  without specific prior written permission.
 *
 *  THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS AS IS AND ANY
 *  EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 *  WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED.
 *  IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT,
 *  INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT
 *  NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
 *  PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY,
 *  WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
 *  ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
 *  POSSIBILITY OF SUCH DAMAGE.
 */

/**
 * Microsoft PlayReady DRM
 *
 * @class
 * @implements KeySystem
 */



const uuid = _constants_ProtectionConstants_js__WEBPACK_IMPORTED_MODULE_1__["default"].PLAYREADY_UUID;
const systemString = _constants_ProtectionConstants_js__WEBPACK_IMPORTED_MODULE_1__["default"].PLAYREADY_KEYSTEM_STRING;
const schemeIdURI = 'urn:uuid:' + uuid;
const PRCDMData = '<PlayReadyCDMData type="LicenseAcquisition"><LicenseAcquisition version="1.0" Proactive="false"><CustomData encoding="base64encoded">%CUSTOMDATA%</CustomData></LicenseAcquisition></PlayReadyCDMData>';
function KeySystemPlayReady(config) {
  config = config || {};
  let instance;
  let messageFormat = 'utf-16';
  const BASE64 = config.BASE64;
  const settings = config.settings;
  function checkConfig() {
    if (!BASE64 || !BASE64.hasOwnProperty('decodeArray') || !BASE64.hasOwnProperty('decodeArray')) {
      throw new Error('Missing config parameter(s)');
    }
  }
  function getRequestHeadersFromMessage(message) {
    let msg, xmlDoc;
    const headers = {};
    const parser = new DOMParser();
    if (settings && settings.get().streaming.protection.detectPlayreadyMessageFormat) {
      // If message format configured/defaulted to utf-16 AND number of bytes is odd, assume 'unwrapped' raw CDM message.
      if (messageFormat === 'utf-16' && message && message.byteLength % 2 === 1) {
        headers['Content-Type'] = 'text/xml; charset=utf-8';
        return headers;
      }
    }
    const dataview = messageFormat === 'utf-16' ? new Uint16Array(message) : new Uint8Array(message);
    msg = String.fromCharCode.apply(null, dataview);
    xmlDoc = parser.parseFromString(msg, 'application/xml');
    const headerNameList = xmlDoc.getElementsByTagName('name');
    const headerValueList = xmlDoc.getElementsByTagName('value');
    for (let i = 0; i < headerNameList.length; i++) {
      headers[headerNameList[i].childNodes[0].nodeValue] = headerValueList[i].childNodes[0].nodeValue;
    }
    // Some versions of the PlayReady CDM return 'Content' instead of 'Content-Type'.
    // this is NOT w3c conform and license servers may reject the request!
    // -> rename it to proper w3c definition!
    if (headers.hasOwnProperty('Content')) {
      headers['Content-Type'] = headers.Content;
      delete headers.Content;
    }
    // Set Content-Type header by default if not provided in the the CDM message (<PlayReadyKeyMessage/>)
    // or if the message contains directly the challenge itself (Ex: LG SmartTVs)
    if (!headers.hasOwnProperty('Content-Type')) {
      headers['Content-Type'] = 'text/xml; charset=utf-8';
    }
    return headers;
  }
  function getLicenseRequestFromMessage(message) {
    let licenseRequest = null;
    const parser = new DOMParser();
    if (settings && settings.get().streaming.protection.detectPlayreadyMessageFormat) {
      // If message format configured/defaulted to utf-16 AND number of bytes is odd, assume 'unwrapped' raw CDM message.
      if (messageFormat === 'utf-16' && message && message.byteLength % 2 === 1) {
        return message;
      }
    }
    const dataview = messageFormat === 'utf-16' ? new Uint16Array(message) : new Uint8Array(message);
    checkConfig();
    const msg = String.fromCharCode.apply(null, dataview);
    const xmlDoc = parser.parseFromString(msg, 'application/xml');
    if (xmlDoc.getElementsByTagName('PlayReadyKeyMessage')[0]) {
      const Challenge = xmlDoc.getElementsByTagName('Challenge')[0].childNodes[0].nodeValue;
      if (Challenge) {
        licenseRequest = BASE64.decode(Challenge);
      }
    } else {
      // The message from CDM is not a wrapped message as on IE11 and Edge,
      // thus it contains direclty the challenge itself
      // (note that the xmlDoc at this point may be unreadable since it may have been interpreted as UTF-16)
      return message;
    }
    return licenseRequest;
  }
  function getLicenseServerURLFromInitData(initData) {
    if (initData) {
      const data = new DataView(initData);
      const numRecords = data.getUint16(4, true);
      let offset = 6;
      const parser = new DOMParser();
      for (let i = 0; i < numRecords; i++) {
        // Parse the PlayReady Record header
        const recordType = data.getUint16(offset, true);
        offset += 2;
        const recordLength = data.getUint16(offset, true);
        offset += 2;
        if (recordType !== 0x0001) {
          offset += recordLength;
          continue;
        }
        const recordData = initData.slice(offset, offset + recordLength);
        const record = String.fromCharCode.apply(null, new Uint16Array(recordData));
        const xmlDoc = parser.parseFromString(record, 'application/xml');

        // First try <LA_URL>
        if (xmlDoc.getElementsByTagName('LA_URL')[0]) {
          const laurl = xmlDoc.getElementsByTagName('LA_URL')[0].childNodes[0].nodeValue;
          if (laurl) {
            return laurl;
          }
        }

        // Optionally, try <LUI_URL>
        if (xmlDoc.getElementsByTagName('LUI_URL')[0]) {
          const luiurl = xmlDoc.getElementsByTagName('LUI_URL')[0].childNodes[0].nodeValue;
          if (luiurl) {
            return luiurl;
          }
        }
      }
    }
    return null;
  }
  function getInitData(cpData) {
    // * desc@ getInitData
    // *   generate PSSH data from PROHeader defined in MPD file
    // *   PSSH format:
    // *   size (4)
    // *   box type(PSSH) (8)
    // *   Protection SystemID (16)
    // *   protection system data size (4) - length of decoded PROHeader
    // *   decoded PROHeader data from MPD file
    const PSSHBoxType = new Uint8Array([0x70, 0x73, 0x73, 0x68, 0x00, 0x00, 0x00, 0x00]); //'PSSH' 8 bytes
    const playreadySystemID = new Uint8Array([0x9a, 0x04, 0xf0, 0x79, 0x98, 0x40, 0x42, 0x86, 0xab, 0x92, 0xe6, 0x5b, 0xe0, 0x88, 0x5f, 0x95]);
    let byteCursor = 0;
    let uint8arraydecodedPROHeader = null;
    let PROSize, PSSHSize, PSSHBoxBuffer, PSSHBox, PSSHData;
    checkConfig();
    if (!cpData) {
      return null;
    }
    // Handle common encryption PSSH
    if ('pssh' in cpData && cpData.pssh) {
      return _CommonEncryption_js__WEBPACK_IMPORTED_MODULE_0__["default"].parseInitDataFromContentProtection(cpData, BASE64);
    }
    // Handle native MS PlayReady ContentProtection elements
    if ('pro' in cpData && cpData.pro) {
      uint8arraydecodedPROHeader = BASE64.decodeArray(cpData.pro.__text);
    } else if ('prheader' in cpData && cpData.prheader) {
      uint8arraydecodedPROHeader = BASE64.decodeArray(cpData.prheader.__text);
    } else {
      return null;
    }
    PROSize = uint8arraydecodedPROHeader.length;
    PSSHSize = 0x4 + PSSHBoxType.length + playreadySystemID.length + 0x4 + PROSize;
    PSSHBoxBuffer = new ArrayBuffer(PSSHSize);
    PSSHBox = new Uint8Array(PSSHBoxBuffer);
    PSSHData = new DataView(PSSHBoxBuffer);
    PSSHData.setUint32(byteCursor, PSSHSize);
    byteCursor += 0x4;
    PSSHBox.set(PSSHBoxType, byteCursor);
    byteCursor += PSSHBoxType.length;
    PSSHBox.set(playreadySystemID, byteCursor);
    byteCursor += playreadySystemID.length;
    PSSHData.setUint32(byteCursor, PROSize);
    byteCursor += 0x4;
    PSSHBox.set(uint8arraydecodedPROHeader, byteCursor);
    byteCursor += PROSize;
    return PSSHBox.buffer;
  }

  /**
   * It seems that some PlayReady implementations return their XML-based CDM
   * messages using UTF16, while others return them as UTF8.  Use this function
   * to modify the message format to expect when parsing CDM messages.
   *
   * @param {string} format the expected message format.  Either "utf-8" or "utf-16".
   * @throws {Error} Specified message format is not one of "utf8" or "utf16"
   */
  function setPlayReadyMessageFormat(format) {
    if (format !== 'utf-8' && format !== 'utf-16') {
      throw new Error('Specified message format is not one of "utf-8" or "utf-16"');
    }
    messageFormat = format;
  }

  /**
   * Get Playready Custom data
   */
  function getCDMData(_cdmData) {
    let customData, cdmData, cdmDataBytes, i;
    checkConfig();
    if (!_cdmData) {
      return null;
    }

    // Convert custom data into multibyte string
    customData = [];
    for (i = 0; i < _cdmData.length; ++i) {
      customData.push(_cdmData.charCodeAt(i));
      customData.push(0);
    }
    customData = String.fromCharCode.apply(null, customData);

    // Encode in Base 64 the custom data string
    customData = BASE64.encode(customData);

    // Initialize CDM data with Base 64 encoded custom data
    // (see https://msdn.microsoft.com/en-us/library/dn457361.aspx)
    cdmData = PRCDMData.replace('%CUSTOMDATA%', customData);

    // Convert CDM data into multibyte characters
    cdmDataBytes = [];
    for (i = 0; i < cdmData.length; ++i) {
      cdmDataBytes.push(cdmData.charCodeAt(i));
      cdmDataBytes.push(0);
    }
    return new Uint8Array(cdmDataBytes).buffer;
  }
  instance = {
    uuid,
    schemeIdURI,
    systemString,
    getInitData,
    getRequestHeadersFromMessage,
    getLicenseRequestFromMessage,
    getLicenseServerURLFromInitData,
    getCDMData,
    setPlayReadyMessageFormat
  };
  return instance;
}
KeySystemPlayReady.__dashjs_factory_name = 'KeySystemPlayReady';
/* harmony default export */ __webpack_exports__["default"] = (_core_FactoryMaker_js__WEBPACK_IMPORTED_MODULE_2__["default"].getSingletonFactory(KeySystemPlayReady));

/***/ }),

/***/ "./src/streaming/protection/drm/KeySystemW3CClearKey.js":
/*!**************************************************************!*\
  !*** ./src/streaming/protection/drm/KeySystemW3CClearKey.js ***!
  \**************************************************************/
/***/ (function(__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony import */ var _vo_KeyPair_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../vo/KeyPair.js */ "./src/streaming/protection/vo/KeyPair.js");
/* harmony import */ var _vo_ClearKeyKeySet_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../vo/ClearKeyKeySet.js */ "./src/streaming/protection/vo/ClearKeyKeySet.js");
/* harmony import */ var _CommonEncryption_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../CommonEncryption.js */ "./src/streaming/protection/CommonEncryption.js");
/* harmony import */ var _constants_ProtectionConstants_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../../constants/ProtectionConstants.js */ "./src/streaming/constants/ProtectionConstants.js");
/* harmony import */ var _core_FactoryMaker_js__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ../../../core/FactoryMaker.js */ "./src/core/FactoryMaker.js");
/**
 * The copyright in this software is being made available under the BSD License,
 * included below. This software may be subject to other third party and contributor
 * rights, including patent rights, and no such rights are granted under this license.
 *
 * Copyright (c) 2013, Dash Industry Forum.
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without modification,
 * are permitted provided that the following conditions are met:
 *  * Redistributions of source code must retain the above copyright notice, this
 *  list of conditions and the following disclaimer.
 *  * Redistributions in binary form must reproduce the above copyright notice,
 *  this list of conditions and the following disclaimer in the documentation and/or
 *  other materials provided with the distribution.
 *  * Neither the name of Dash Industry Forum nor the names of its
 *  contributors may be used to endorse or promote products derived from this software
 *  without specific prior written permission.
 *
 *  THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS AS IS AND ANY
 *  EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 *  WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED.
 *  IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT,
 *  INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT
 *  NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
 *  PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY,
 *  WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
 *  ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
 *  POSSIBILITY OF SUCH DAMAGE.
 */






const uuid = _constants_ProtectionConstants_js__WEBPACK_IMPORTED_MODULE_3__["default"].W3C_CLEARKEY_UUID;
const systemString = _constants_ProtectionConstants_js__WEBPACK_IMPORTED_MODULE_3__["default"].CLEARKEY_KEYSTEM_STRING;
const schemeIdURI = 'urn:uuid:' + uuid;
function KeySystemW3CClearKey(config) {
  let instance;
  const BASE64 = config.BASE64;
  const logger = config.debug.getLogger(instance);
  /**
   * Returns desired clearkeys (as specified in the CDM message) from protection data
   *
   * @param {ProtectionDataSet} protectionData the protection data
   * @param {ArrayBuffer} message the ClearKey CDM message
   * @returns {ClearKeyKeySet} the key set or null if none found
   * @throws {Error} if a keyID specified in the CDM message was not found in the
   * protection data
   * @memberof KeySystemClearKey
   */
  function getClearKeysFromProtectionData(protectionData, message) {
    let clearkeySet = null;
    if (protectionData) {
      // ClearKey is the only system that does not require a license server URL, so we
      // handle it here when keys are specified in protection data
      const jsonMsg = JSON.parse(String.fromCharCode.apply(null, new Uint8Array(message)));
      const keyPairs = [];
      for (let i = 0; i < jsonMsg.kids.length; i++) {
        const clearkeyID = jsonMsg.kids[i];
        const clearkey = protectionData.clearkeys && protectionData.clearkeys.hasOwnProperty(clearkeyID) ? protectionData.clearkeys[clearkeyID] : null;
        if (!clearkey) {
          throw new Error('DRM: ClearKey keyID (' + clearkeyID + ') is not known!');
        }
        // KeyIDs from CDM are not base64 padded.  Keys may or may not be padded
        keyPairs.push(new _vo_KeyPair_js__WEBPACK_IMPORTED_MODULE_0__["default"](clearkeyID, clearkey));
      }
      clearkeySet = new _vo_ClearKeyKeySet_js__WEBPACK_IMPORTED_MODULE_1__["default"](keyPairs);
      logger.warn('ClearKey schemeIdURI is using W3C Common PSSH systemID (1077efec-c0b2-4d02-ace3-3c1e52e2fb4b) in Content Protection. See DASH-IF IOP v4.1 section 7.6.2.4');
    }
    return clearkeySet;
  }
  function getInitData(cp) {
    return _CommonEncryption_js__WEBPACK_IMPORTED_MODULE_2__["default"].parseInitDataFromContentProtection(cp, BASE64);
  }
  function getRequestHeadersFromMessage(/*message*/
  ) {
    return null;
  }
  function getLicenseRequestFromMessage(message) {
    return new Uint8Array(message);
  }
  function getLicenseServerURLFromInitData(/*initData*/
  ) {
    return null;
  }
  function getCDMData(/*cdmData*/
  ) {
    return null;
  }
  instance = {
    uuid: uuid,
    schemeIdURI: schemeIdURI,
    systemString: systemString,
    getInitData: getInitData,
    getRequestHeadersFromMessage: getRequestHeadersFromMessage,
    getLicenseRequestFromMessage: getLicenseRequestFromMessage,
    getLicenseServerURLFromInitData: getLicenseServerURLFromInitData,
    getCDMData: getCDMData,
    getClearKeysFromProtectionData: getClearKeysFromProtectionData
  };
  return instance;
}
KeySystemW3CClearKey.__dashjs_factory_name = 'KeySystemW3CClearKey';
/* harmony default export */ __webpack_exports__["default"] = (_core_FactoryMaker_js__WEBPACK_IMPORTED_MODULE_4__["default"].getSingletonFactory(KeySystemW3CClearKey));

/***/ }),

/***/ "./src/streaming/protection/drm/KeySystemWidevine.js":
/*!***********************************************************!*\
  !*** ./src/streaming/protection/drm/KeySystemWidevine.js ***!
  \***********************************************************/
/***/ (function(__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony import */ var _CommonEncryption_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../CommonEncryption.js */ "./src/streaming/protection/CommonEncryption.js");
/* harmony import */ var _constants_ProtectionConstants_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../../constants/ProtectionConstants.js */ "./src/streaming/constants/ProtectionConstants.js");
/* harmony import */ var _core_FactoryMaker_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../../../core/FactoryMaker.js */ "./src/core/FactoryMaker.js");
/**
 * The copyright in this software is being made available under the BSD License,
 * included below. This software may be subject to other third party and contributor
 * rights, including patent rights, and no such rights are granted under this license.
 *
 * Copyright (c) 2013, Dash Industry Forum.
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without modification,
 * are permitted provided that the following conditions are met:
 *  * Redistributions of source code must retain the above copyright notice, this
 *  list of conditions and the following disclaimer.
 *  * Redistributions in binary form must reproduce the above copyright notice,
 *  this list of conditions and the following disclaimer in the documentation and/or
 *  other materials provided with the distribution.
 *  * Neither the name of Dash Industry Forum nor the names of its
 *  contributors may be used to endorse or promote products derived from this software
 *  without specific prior written permission.
 *
 *  THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS AS IS AND ANY
 *  EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 *  WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED.
 *  IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT,
 *  INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT
 *  NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
 *  PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY,
 *  WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
 *  ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
 *  POSSIBILITY OF SUCH DAMAGE.
 */

/**
 * Google Widevine DRM
 *
 * @class
 * @implements MediaPlayer.dependencies.protection.KeySystem
 */




const uuid = _constants_ProtectionConstants_js__WEBPACK_IMPORTED_MODULE_1__["default"].WIDEVINE_UUID;
const systemString = _constants_ProtectionConstants_js__WEBPACK_IMPORTED_MODULE_1__["default"].WIDEVINE_KEYSTEM_STRING;
const schemeIdURI = 'urn:uuid:' + uuid;
function KeySystemWidevine(config) {
  config = config || {};
  let instance;
  const BASE64 = config.BASE64;
  function getInitData(cp) {
    return _CommonEncryption_js__WEBPACK_IMPORTED_MODULE_0__["default"].parseInitDataFromContentProtection(cp, BASE64);
  }
  function getRequestHeadersFromMessage(/*message*/
  ) {
    return null;
  }
  function getLicenseRequestFromMessage(message) {
    return new Uint8Array(message);
  }
  function getLicenseServerURLFromInitData(/*initData*/
  ) {
    return null;
  }
  function getCDMData(/*cdmData*/
  ) {
    return null;
  }
  instance = {
    uuid,
    schemeIdURI,
    systemString,
    getInitData,
    getRequestHeadersFromMessage,
    getLicenseRequestFromMessage,
    getLicenseServerURLFromInitData,
    getCDMData
  };
  return instance;
}
KeySystemWidevine.__dashjs_factory_name = 'KeySystemWidevine';
/* harmony default export */ __webpack_exports__["default"] = (_core_FactoryMaker_js__WEBPACK_IMPORTED_MODULE_2__["default"].getSingletonFactory(KeySystemWidevine));

/***/ }),

/***/ "./src/streaming/protection/errors/ProtectionErrors.js":
/*!*************************************************************!*\
  !*** ./src/streaming/protection/errors/ProtectionErrors.js ***!
  \*************************************************************/
/***/ (function(__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony import */ var _core_errors_ErrorsBase_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../../../core/errors/ErrorsBase.js */ "./src/core/errors/ErrorsBase.js");
/**
 * The copyright in this software is being made available under the BSD License,
 * included below. This software may be subject to other third party and contributor
 * rights, including patent rights, and no such rights are granted under this license.
 *
 * Copyright (c) 2013, Dash Industry Forum.
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without modification,
 * are permitted provided that the following conditions are met:
 *  * Redistributions of source code must retain the above copyright notice, this
 *  list of conditions and the following disclaimer.
 *  * Redistributions in binary form must reproduce the above copyright notice,
 *  this list of conditions and the following disclaimer in the documentation and/or
 *  other materials provided with the distribution.
 *  * Neither the name of Dash Industry Forum nor the names of its
 *  contributors may be used to endorse or promote products derived from this software
 *  without specific prior written permission.
 *
 *  THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS AS IS AND ANY
 *  EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 *  WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED.
 *  IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT,
 *  INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT
 *  NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
 *  PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY,
 *  WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
 *  ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
 *  POSSIBILITY OF SUCH DAMAGE.
 */


/**
 * @class
 */
class ProtectionErrors extends _core_errors_ErrorsBase_js__WEBPACK_IMPORTED_MODULE_0__["default"] {
  constructor() {
    super();

    /**
     *  Generid key Error code
     */
    this.MEDIA_KEYERR_CODE = 100;
    /**
     *  Error code returned by keyerror api for ProtectionModel_01b
     */
    this.MEDIA_KEYERR_UNKNOWN_CODE = 101;
    /**
     *  Error code returned by keyerror api for ProtectionModel_01b
     */
    this.MEDIA_KEYERR_CLIENT_CODE = 102;
    /**
     *  Error code returned by keyerror api for ProtectionModel_01b
     */
    this.MEDIA_KEYERR_SERVICE_CODE = 103;
    /**
     *  Error code returned by keyerror api for ProtectionModel_01b
     */
    this.MEDIA_KEYERR_OUTPUT_CODE = 104;
    /**
     *  Error code returned by keyerror api for ProtectionModel_01b
     */
    this.MEDIA_KEYERR_HARDWARECHANGE_CODE = 105;
    /**
     *  Error code returned by keyerror api for ProtectionModel_01b
     */
    this.MEDIA_KEYERR_DOMAIN_CODE = 106;

    /**
     *  Error code returned when an error occured in keymessage event for ProtectionModel_01b
     */
    this.MEDIA_KEY_MESSAGE_ERROR_CODE = 107;
    /**
     *  Error code returned when challenge is invalid in keymessage event (event triggered by CDM)
     */
    this.MEDIA_KEY_MESSAGE_NO_CHALLENGE_ERROR_CODE = 108;
    /**
     *  Error code returned when License server certificate has not been successfully updated
     */
    this.SERVER_CERTIFICATE_UPDATED_ERROR_CODE = 109;
    /**
     *  Error code returned when license validity has expired
     */
    this.KEY_STATUS_CHANGED_EXPIRED_ERROR_CODE = 110;
    /**
     *  Error code returned when no licenser url is defined
     */
    this.MEDIA_KEY_MESSAGE_NO_LICENSE_SERVER_URL_ERROR_CODE = 111;
    /**
     *  Error code returned when key system access is denied
     */
    this.KEY_SYSTEM_ACCESS_DENIED_ERROR_CODE = 112;
    /**
     *  Error code returned when key session has not been successfully created
     */
    this.KEY_SESSION_CREATED_ERROR_CODE = 113;
    /**
     *  Error code returned when license request failed after a keymessage event has been triggered
     */
    this.MEDIA_KEY_MESSAGE_LICENSER_ERROR_CODE = 114;
    this.MEDIA_KEYERR_UNKNOWN_MESSAGE = 'An unspecified error occurred. This value is used for errors that don\'t match any of the other codes.';
    this.MEDIA_KEYERR_CLIENT_MESSAGE = 'The Key System could not be installed or updated.';
    this.MEDIA_KEYERR_SERVICE_MESSAGE = 'The message passed into update indicated an error from the license service.';
    this.MEDIA_KEYERR_OUTPUT_MESSAGE = 'There is no available output device with the required characteristics for the content protection system.';
    this.MEDIA_KEYERR_HARDWARECHANGE_MESSAGE = 'A hardware configuration change caused a content protection error.';
    this.MEDIA_KEYERR_DOMAIN_MESSAGE = 'An error occurred in a multi-device domain licensing configuration. The most common error is a failure to join the domain.';
    this.MEDIA_KEY_MESSAGE_ERROR_MESSAGE = 'Multiple key sessions were creates with a user-agent that does not support sessionIDs!! Unpredictable behavior ahead!';
    this.MEDIA_KEY_MESSAGE_NO_CHALLENGE_ERROR_MESSAGE = 'DRM: Empty key message from CDM';
    this.SERVER_CERTIFICATE_UPDATED_ERROR_MESSAGE = 'Error updating server certificate -- ';
    this.KEY_STATUS_CHANGED_EXPIRED_ERROR_MESSAGE = 'DRM: KeyStatusChange error! -- License has expired';
    this.MEDIA_KEY_MESSAGE_NO_LICENSE_SERVER_URL_ERROR_MESSAGE = 'DRM: No license server URL specified!';
    this.KEY_SYSTEM_ACCESS_DENIED_ERROR_MESSAGE = 'DRM: KeySystem Access Denied! -- ';
    this.KEY_SESSION_CREATED_ERROR_MESSAGE = 'DRM: unable to create session! --';
    this.MEDIA_KEY_MESSAGE_LICENSER_ERROR_MESSAGE = 'DRM: licenser error! --';
  }
}
let protectionErrors = new ProtectionErrors();
/* harmony default export */ __webpack_exports__["default"] = (protectionErrors);

/***/ }),

/***/ "./src/streaming/protection/models/DefaultProtectionModel.js":
/*!*******************************************************************!*\
  !*** ./src/streaming/protection/models/DefaultProtectionModel.js ***!
  \*******************************************************************/
/***/ (function(__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony import */ var _controllers_ProtectionKeyController_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../controllers/ProtectionKeyController.js */ "./src/streaming/protection/controllers/ProtectionKeyController.js");
/* harmony import */ var _vo_NeedKey_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../vo/NeedKey.js */ "./src/streaming/protection/vo/NeedKey.js");
/* harmony import */ var _errors_ProtectionErrors_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../errors/ProtectionErrors.js */ "./src/streaming/protection/errors/ProtectionErrors.js");
/* harmony import */ var _vo_DashJSError_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../../vo/DashJSError.js */ "./src/streaming/vo/DashJSError.js");
/* harmony import */ var _vo_KeyMessage_js__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ../vo/KeyMessage.js */ "./src/streaming/protection/vo/KeyMessage.js");
/* harmony import */ var _vo_KeySystemAccess_js__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ../vo/KeySystemAccess.js */ "./src/streaming/protection/vo/KeySystemAccess.js");
/* harmony import */ var _constants_ProtectionConstants_js__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! ../../constants/ProtectionConstants.js */ "./src/streaming/constants/ProtectionConstants.js");
/* harmony import */ var _core_FactoryMaker_js__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(/*! ../../../core/FactoryMaker.js */ "./src/core/FactoryMaker.js");
/**
 * The copyright in this software is being made available under the BSD License,
 * included below. This software may be subject to other third party and contributor
 * rights, including patent rights, and no such rights are granted under this license.
 *
 * Copyright (c) 2013, Dash Industry Forum.
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without modification,
 * are permitted provided that the following conditions are met:
 *  * Redistributions of source code must retain the above copyright notice, this
 *  list of conditions and the following disclaimer.
 *  * Redistributions in binary form must reproduce the above copyright notice,
 *  this list of conditions and the following disclaimer in the documentation and/or
 *  other materials provided with the distribution.
 *  * Neither the name of Dash Industry Forum nor the names of its
 *  contributors may be used to endorse or promote products derived from this software
 *  without specific prior written permission.
 *
 *  THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS AS IS AND ANY
 *  EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 *  WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED.
 *  IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT,
 *  INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT
 *  NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
 *  PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY,
 *  WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
 *  ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
 *  POSSIBILITY OF SUCH DAMAGE.
 */

/**
 * Most recent EME implementation
 *
 * Implemented by Google Chrome v36+ (Windows, OSX, Linux)
 *
 * @implements ProtectionModel
 * @class
 */








const SYSTEM_STRING_PRIORITY = {};
SYSTEM_STRING_PRIORITY[_constants_ProtectionConstants_js__WEBPACK_IMPORTED_MODULE_6__["default"].PLAYREADY_KEYSTEM_STRING] = [_constants_ProtectionConstants_js__WEBPACK_IMPORTED_MODULE_6__["default"].PLAYREADY_KEYSTEM_STRING, _constants_ProtectionConstants_js__WEBPACK_IMPORTED_MODULE_6__["default"].PLAYREADY_RECOMMENDATION_KEYSTEM_STRING];
SYSTEM_STRING_PRIORITY[_constants_ProtectionConstants_js__WEBPACK_IMPORTED_MODULE_6__["default"].WIDEVINE_KEYSTEM_STRING] = [_constants_ProtectionConstants_js__WEBPACK_IMPORTED_MODULE_6__["default"].WIDEVINE_KEYSTEM_STRING];
SYSTEM_STRING_PRIORITY[_constants_ProtectionConstants_js__WEBPACK_IMPORTED_MODULE_6__["default"].FAIRPLAY_KEYSTEM_STRING] = [_constants_ProtectionConstants_js__WEBPACK_IMPORTED_MODULE_6__["default"].FAIRPLAY_KEYSTEM_STRING];
SYSTEM_STRING_PRIORITY[_constants_ProtectionConstants_js__WEBPACK_IMPORTED_MODULE_6__["default"].CLEARKEY_KEYSTEM_STRING] = [_constants_ProtectionConstants_js__WEBPACK_IMPORTED_MODULE_6__["default"].CLEARKEY_KEYSTEM_STRING];
function DefaultProtectionModel(config) {
  config = config || {};
  const context = this.context;
  const eventBus = config.eventBus; //Need to pass in here so we can use same instance since this is optional module
  const events = config.events;
  const debug = config.debug;
  let instance, logger, keySystem, videoElement, mediaKeys, sessionTokens, eventHandler, protectionKeyController;
  function setup() {
    logger = debug.getLogger(instance);
    keySystem = null;
    videoElement = null;
    mediaKeys = null;
    sessionTokens = [];
    protectionKeyController = (0,_controllers_ProtectionKeyController_js__WEBPACK_IMPORTED_MODULE_0__["default"])(context).getInstance();
    eventHandler = createEventHandler();
  }
  function reset() {
    const numSessions = sessionTokens.length;
    let session;
    if (numSessions !== 0) {
      // Called when we are done closing a session.  Success or fail
      const done = function (session) {
        removeSession(session);
        if (sessionTokens.length === 0) {
          if (videoElement) {
            videoElement.removeEventListener('encrypted', eventHandler);
            videoElement.setMediaKeys(null).then(function () {
              eventBus.trigger(events.TEARDOWN_COMPLETE);
            });
          } else {
            eventBus.trigger(events.TEARDOWN_COMPLETE);
          }
        }
      };
      for (let i = 0; i < numSessions; i++) {
        session = sessionTokens[i];
        (function (s) {
          _closeKeySessionInternal(session);
          done(s);
        })(session);
      }
    } else {
      eventBus.trigger(events.TEARDOWN_COMPLETE);
    }
  }
  function stop() {
    // Close and remove not usable sessions
    let session;
    for (let i = 0; i < sessionTokens.length; i++) {
      session = sessionTokens[i];
      if (!session.getUsable()) {
        _closeKeySessionInternal(session);
        removeSession(session);
      }
    }
  }
  function getAllInitData() {
    const retVal = [];
    for (let i = 0; i < sessionTokens.length; i++) {
      if (sessionTokens[i].initData) {
        retVal.push(sessionTokens[i].initData);
      }
    }
    return retVal;
  }
  function getSessionTokens() {
    return sessionTokens;
  }
  function requestKeySystemAccess(keySystemConfigurationsToRequest) {
    return new Promise((resolve, reject) => {
      _requestKeySystemAccessInternal(keySystemConfigurationsToRequest, 0, resolve, reject);
    });
  }

  /**
   * Initializes access to a key system. Once we found a valid configuration we get a mediaKeySystemAccess object
   * @param keySystemConfigurationsToRequest
   * @param idx
   * @param resolve
   * @param reject
   * @private
   */
  function _requestKeySystemAccessInternal(keySystemConfigurationsToRequest, idx, resolve, reject) {
    // In case requestMediaKeySystemAccess is not available we can not proceed and dispatch an error
    if (navigator.requestMediaKeySystemAccess === undefined || typeof navigator.requestMediaKeySystemAccess !== 'function') {
      const msg = 'Insecure origins are not allowed';
      eventBus.trigger(events.KEY_SYSTEM_ACCESS_COMPLETE, {
        error: msg
      });
      reject({
        error: msg
      });
      return;
    }

    // If a systemStringPriority is defined by the application we use these values. Otherwise, we use the default system string
    // This is useful for DRM systems such as Playready for which multiple system strings are possible for instance com.microsoft.playready and com.microsoft.playready.recommendation
    const protDataSystemStringPriority = keySystemConfigurationsToRequest[idx].protData && keySystemConfigurationsToRequest[idx].protData.systemStringPriority ? keySystemConfigurationsToRequest[idx].protData.systemStringPriority : null;
    const configs = keySystemConfigurationsToRequest[idx].configs;
    const currentKeySystem = keySystemConfigurationsToRequest[idx].ks;
    let systemString = currentKeySystem.systemString;

    // Use the default values in case no values are provided by the application
    const systemStringsToApply = protDataSystemStringPriority ? protDataSystemStringPriority : SYSTEM_STRING_PRIORITY[systemString] ? SYSTEM_STRING_PRIORITY[systemString] : [systemString];

    // Check all the available system strings and the available configurations for support
    _checkAccessForKeySystem(systemStringsToApply, configs).then(data => {
      const configuration = data && data.nativeMediaKeySystemAccessObject && typeof data.nativeMediaKeySystemAccessObject.getConfiguration === 'function' ? data.nativeMediaKeySystemAccessObject.getConfiguration() : null;
      const keySystemAccess = new _vo_KeySystemAccess_js__WEBPACK_IMPORTED_MODULE_5__["default"](currentKeySystem, configuration);
      keySystemAccess.selectedSystemString = data.selectedSystemString;
      keySystemAccess.nativeMediaKeySystemAccessObject = data.nativeMediaKeySystemAccessObject;
      eventBus.trigger(events.KEY_SYSTEM_ACCESS_COMPLETE, {
        data: keySystemAccess
      });
      resolve({
        data: keySystemAccess
      });
    }).catch(e => {
      if (idx + 1 < keySystemConfigurationsToRequest.length) {
        _requestKeySystemAccessInternal(keySystemConfigurationsToRequest, idx + 1, resolve, reject);
      } else {
        const errorMessage = 'Key system access denied! ';
        eventBus.trigger(events.KEY_SYSTEM_ACCESS_COMPLETE, {
          error: errorMessage + e.message
        });
        reject({
          error: errorMessage + e.message
        });
      }
    });
  }

  /**
   * For a specific key system: Iterate over the possible system strings and resolve once a valid configuration was found
   * @param {array} systemStringsToApply
   * @param {object} configs
   * @return {Promise}
   * @private
   */
  function _checkAccessForKeySystem(systemStringsToApply, configs) {
    return new Promise((resolve, reject) => {
      _checkAccessForSystemStrings(systemStringsToApply, configs, 0, resolve, reject);
    });
  }

  /**
   * Recursively iterate over the possible system strings until a supported configuration is found or we ran out of options
   * @param {array} systemStringsToApply
   * @param {object} configs
   * @param {number} idx
   * @param {function} resolve
   * @param {function} reject
   * @private
   */
  function _checkAccessForSystemStrings(systemStringsToApply, configs, idx, resolve, reject) {
    const systemString = systemStringsToApply[idx];
    logger.debug(`Requesting key system access for system string ${systemString}`);
    navigator.requestMediaKeySystemAccess(systemString, configs).then(mediaKeySystemAccess => {
      resolve({
        nativeMediaKeySystemAccessObject: mediaKeySystemAccess,
        selectedSystemString: systemString
      });
    }).catch(e => {
      if (idx + 1 < systemStringsToApply.length) {
        _checkAccessForSystemStrings(systemStringsToApply, configs, idx + 1, resolve, reject);
      } else {
        reject(e);
      }
    });
  }

  /**
   * Selects a key system by creating the mediaKeys and adding them to the video element
   * @param keySystemAccess
   * @return {Promise<unknown>}
   */
  function selectKeySystem(keySystemAccess) {
    return new Promise((resolve, reject) => {
      keySystemAccess.nativeMediaKeySystemAccessObject.createMediaKeys().then(mkeys => {
        keySystem = keySystemAccess.keySystem;
        mediaKeys = mkeys;
        if (videoElement) {
          return videoElement.setMediaKeys(mediaKeys);
        } else {
          return Promise.resolve();
        }
      }).then(() => {
        resolve(keySystem);
      }).catch(function () {
        reject({
          error: 'Error selecting keys system (' + keySystemAccess.keySystem.systemString + ')! Could not create MediaKeys -- TODO'
        });
      });
    });
  }
  function setMediaElement(mediaElement) {
    if (videoElement === mediaElement) {
      return;
    }

    // Replacing the previous element
    if (videoElement) {
      videoElement.removeEventListener('encrypted', eventHandler);
      if (videoElement.setMediaKeys) {
        videoElement.setMediaKeys(null);
      }
    }
    videoElement = mediaElement;

    // Only if we are not detaching from the existing element
    if (videoElement) {
      videoElement.addEventListener('encrypted', eventHandler);
      if (videoElement.setMediaKeys && mediaKeys) {
        videoElement.setMediaKeys(mediaKeys);
      }
    }
  }
  function setServerCertificate(serverCertificate) {
    return new Promise((resolve, reject) => {
      mediaKeys.setServerCertificate(serverCertificate).then(function () {
        logger.info('DRM: License server certificate successfully updated.');
        eventBus.trigger(events.SERVER_CERTIFICATE_UPDATED);
        resolve();
      }).catch(error => {
        reject(error);
        eventBus.trigger(events.SERVER_CERTIFICATE_UPDATED, {
          error: new _vo_DashJSError_js__WEBPACK_IMPORTED_MODULE_3__["default"](_errors_ProtectionErrors_js__WEBPACK_IMPORTED_MODULE_2__["default"].SERVER_CERTIFICATE_UPDATED_ERROR_CODE, _errors_ProtectionErrors_js__WEBPACK_IMPORTED_MODULE_2__["default"].SERVER_CERTIFICATE_UPDATED_ERROR_MESSAGE + error.name)
        });
      });
    });
  }

  /**
   * Create a key session, a session token and initialize a request by calling generateRequest
   * @param keySystemMetadata
   */
  function createKeySession(keySystemMetadata) {
    if (!keySystem || !mediaKeys) {
      throw new Error('Can not create sessions until you have selected a key system');
    }
    const mediaKeySession = mediaKeys.createSession(keySystemMetadata.sessionType);
    const sessionToken = _createSessionToken(mediaKeySession, keySystemMetadata);

    // Determine the initDataType for generateRequest():
    // - ClearKey with keys: use 'keyids'
    // - FairPlay: use 'sinf'
    // - All others: use 'cenc'
    let dataType;
    if (keySystem.systemString === _constants_ProtectionConstants_js__WEBPACK_IMPORTED_MODULE_6__["default"].CLEARKEY_KEYSTEM_STRING && (keySystemMetadata.initData || keySystemMetadata.protData && keySystemMetadata.protData.clearkeys)) {
      dataType = _constants_ProtectionConstants_js__WEBPACK_IMPORTED_MODULE_6__["default"].INITIALIZATION_DATA_TYPE_KEYIDS;
    } else if (keySystem.systemString === _constants_ProtectionConstants_js__WEBPACK_IMPORTED_MODULE_6__["default"].FAIRPLAY_KEYSTEM_STRING) {
      dataType = _constants_ProtectionConstants_js__WEBPACK_IMPORTED_MODULE_6__["default"].INITIALIZATION_DATA_TYPE_SINF;
    } else {
      dataType = _constants_ProtectionConstants_js__WEBPACK_IMPORTED_MODULE_6__["default"].INITIALIZATION_DATA_TYPE_CENC;
    }
    mediaKeySession.generateRequest(dataType, keySystemMetadata.initData).then(function () {
      logger.debug('DRM: Session created.  SessionID = ' + sessionToken.getSessionId());
      eventBus.trigger(events.KEY_SESSION_CREATED, {
        data: sessionToken
      });
    }).catch(function (error) {
      removeSession(sessionToken);
      eventBus.trigger(events.KEY_SESSION_CREATED, {
        data: null,
        error: new _vo_DashJSError_js__WEBPACK_IMPORTED_MODULE_3__["default"](_errors_ProtectionErrors_js__WEBPACK_IMPORTED_MODULE_2__["default"].KEY_SESSION_CREATED_ERROR_CODE, _errors_ProtectionErrors_js__WEBPACK_IMPORTED_MODULE_2__["default"].KEY_SESSION_CREATED_ERROR_MESSAGE + 'Error generating key request -- ' + error.name)
      });
    });
  }
  function updateKeySession(sessionToken, message) {
    const session = sessionToken.session;

    // Send our request to the key session
    if (protectionKeyController.isClearKey(keySystem)) {
      message = message.toJWK();
    }
    session.update(message).then(() => {
      eventBus.trigger(events.KEY_SESSION_UPDATED);
    }).catch(function (error) {
      eventBus.trigger(events.KEY_ERROR, {
        error: new _vo_DashJSError_js__WEBPACK_IMPORTED_MODULE_3__["default"](_errors_ProtectionErrors_js__WEBPACK_IMPORTED_MODULE_2__["default"].MEDIA_KEYERR_CODE, 'Error sending update() message! ' + error.name, sessionToken)
      });
    });
  }
  function loadKeySession(keySystemMetadata) {
    if (!keySystem || !mediaKeys) {
      throw new Error('Can not load sessions until you have selected a key system');
    }
    const sessionId = keySystemMetadata.sessionId;

    // Check if session Id is not already loaded or loading
    for (let i = 0; i < sessionTokens.length; i++) {
      if (sessionId === sessionTokens[i].sessionId) {
        logger.warn('DRM: Ignoring session ID because we have already seen it!');
        return;
      }
    }
    const session = mediaKeys.createSession(keySystemMetadata.sessionType);
    const sessionToken = _createSessionToken(session, keySystemMetadata);
    sessionToken.hasTriggeredKeyStatusMapUpdate = true;

    // Load persisted session data into our newly created session object
    session.load(sessionId).then(function (success) {
      if (success) {
        logger.debug('DRM: Session loaded.  SessionID = ' + sessionToken.getSessionId());
        eventBus.trigger(events.KEY_SESSION_CREATED, {
          data: sessionToken
        });
      } else {
        removeSession(sessionToken);
        eventBus.trigger(events.KEY_SESSION_CREATED, {
          data: null,
          error: new _vo_DashJSError_js__WEBPACK_IMPORTED_MODULE_3__["default"](_errors_ProtectionErrors_js__WEBPACK_IMPORTED_MODULE_2__["default"].KEY_SESSION_CREATED_ERROR_CODE, _errors_ProtectionErrors_js__WEBPACK_IMPORTED_MODULE_2__["default"].KEY_SESSION_CREATED_ERROR_MESSAGE + 'Could not load session! Invalid Session ID (' + sessionId + ')')
        });
      }
    }).catch(function (error) {
      removeSession(sessionToken);
      eventBus.trigger(events.KEY_SESSION_CREATED, {
        data: null,
        error: new _vo_DashJSError_js__WEBPACK_IMPORTED_MODULE_3__["default"](_errors_ProtectionErrors_js__WEBPACK_IMPORTED_MODULE_2__["default"].KEY_SESSION_CREATED_ERROR_CODE, _errors_ProtectionErrors_js__WEBPACK_IMPORTED_MODULE_2__["default"].KEY_SESSION_CREATED_ERROR_MESSAGE + 'Could not load session (' + sessionId + ')! ' + error.name)
      });
    });
  }
  function removeKeySession(sessionToken) {
    const session = sessionToken.session;
    session.remove().then(function () {
      logger.debug('DRM: Session removed.  SessionID = ' + sessionToken.getSessionId());
      eventBus.trigger(events.KEY_SESSION_REMOVED, {
        data: sessionToken.getSessionId()
      });
    }, function (error) {
      eventBus.trigger(events.KEY_SESSION_REMOVED, {
        data: null,
        error: 'Error removing session (' + sessionToken.getSessionId() + '). ' + error.name
      });
    });
  }
  function closeKeySession(sessionToken) {
    // Send our request to the key session
    _closeKeySessionInternal(sessionToken).catch(function (error) {
      removeSession(sessionToken);
      eventBus.trigger(events.KEY_SESSION_CLOSED, {
        data: null,
        error: 'Error closing session (' + sessionToken.getSessionId() + ') ' + error.name
      });
    });
  }
  function _closeKeySessionInternal(sessionToken) {
    if (!sessionToken || !sessionToken.session) {
      return Promise.resolve;
    }
    const session = sessionToken.session;

    // Remove event listeners
    session.removeEventListener('keystatuseschange', sessionToken);
    session.removeEventListener('message', sessionToken);

    // Send our request to the key session
    return session.close();
  }

  // This is our main event handler for all desired HTMLMediaElement events
  // related to EME.  These events are translated into our API-independent
  // versions of the same events
  function createEventHandler() {
    return {
      handleEvent: function (event) {
        switch (event.type) {
          case 'encrypted':
            if (event.initData) {
              let initData = ArrayBuffer.isView(event.initData) ? event.initData.buffer : event.initData;
              eventBus.trigger(events.NEED_KEY, {
                key: new _vo_NeedKey_js__WEBPACK_IMPORTED_MODULE_1__["default"](initData, event.initDataType)
              });
            }
            break;
        }
      }
    };
  }
  function removeSession(token) {
    // Remove from our session list
    for (let i = 0; i < sessionTokens.length; i++) {
      if (sessionTokens[i] === token) {
        sessionTokens.splice(i, 1);
        break;
      }
    }
  }

  // Function to create our session token objects which manage the EME
  // MediaKeySession and session-specific event handler
  function _createSessionToken(session, keySystemMetadata) {
    const token = {
      // Implements SessionToken
      session: session,
      keyId: keySystemMetadata.keyId,
      normalizedKeyId: keySystemMetadata && keySystemMetadata.keyId && typeof keySystemMetadata.keyId === 'string' ? keySystemMetadata.keyId.replace(/-/g, '').toLowerCase() : '',
      initData: keySystemMetadata.initData,
      sessionId: keySystemMetadata.sessionId,
      sessionType: keySystemMetadata.sessionType,
      hasTriggeredKeyStatusMapUpdate: false,
      // This is our main event handler for all desired MediaKeySession events
      // These events are translated into our API-independent versions of the
      // same events
      handleEvent: function (event) {
        switch (event.type) {
          case 'keystatuseschange':
            this._onKeyStatusesChange(event);
            break;
          case 'message':
            this._onKeyMessage(event);
            break;
        }
      },
      _onKeyStatusesChange: function (event) {
        eventBus.trigger(events.KEY_STATUSES_CHANGED, {
          data: this
        });
        const keyStatuses = [];
        event.target.keyStatuses.forEach(function () {
          keyStatuses.push(_parseKeyStatus(arguments));
        });
        eventBus.trigger(events.INTERNAL_KEY_STATUSES_CHANGED, {
          parsedKeyStatuses: keyStatuses,
          sessionToken: token
        });
      },
      _onKeyMessage: function (event) {
        let message = ArrayBuffer.isView(event.message) ? event.message.buffer : event.message;
        eventBus.trigger(events.INTERNAL_KEY_MESSAGE, {
          data: new _vo_KeyMessage_js__WEBPACK_IMPORTED_MODULE_4__["default"](this, message, undefined, event.messageType)
        });
      },
      getKeyId: function () {
        return this.keyId;
      },
      getSessionId: function () {
        return session.sessionId;
      },
      getSessionType: function () {
        return this.sessionType;
      },
      getExpirationTime: function () {
        return session.expiration;
      },
      getKeyStatuses: function () {
        return session.keyStatuses;
      },
      getUsable: function () {
        let usable = false;
        session.keyStatuses.forEach(function () {
          let keyStatus = _parseKeyStatus(arguments);
          if (keyStatus.status === _constants_ProtectionConstants_js__WEBPACK_IMPORTED_MODULE_6__["default"].MEDIA_KEY_STATUSES.USABLE) {
            usable = true;
          }
        });
        return usable;
      }
    };

    // Add all event listeners
    session.addEventListener('keystatuseschange', token);
    session.addEventListener('message', token);

    // Register callback for session closed Promise
    session.closed.then(() => {
      removeSession(token);
      logger.debug('DRM: Session closed.  SessionID = ' + token.getSessionId());
      eventBus.trigger(events.KEY_SESSION_CLOSED, {
        data: token.getSessionId()
      });
    });

    // Add to our session list
    sessionTokens.push(token);
    return token;
  }
  function _parseKeyStatus(args) {
    // Edge and Chrome implement different version of keystatuses, param are not on same order
    let status, keyId;
    if (args && args.length > 0) {
      if (args[0]) {
        if (typeof args[0] === 'string') {
          status = args[0];
        } else {
          keyId = args[0];
        }
      }
      if (args[1]) {
        if (typeof args[1] === 'string') {
          status = args[1];
        } else {
          keyId = args[1];
        }
      }
    }
    return {
      status: status,
      keyId: keyId
    };
  }
  instance = {
    closeKeySession,
    createKeySession,
    getAllInitData,
    getSessionTokens,
    loadKeySession,
    removeKeySession,
    requestKeySystemAccess,
    reset,
    selectKeySystem,
    setMediaElement,
    setServerCertificate,
    stop,
    updateKeySession
  };
  setup();
  return instance;
}
DefaultProtectionModel.__dashjs_factory_name = 'DefaultProtectionModel';
/* harmony default export */ __webpack_exports__["default"] = (_core_FactoryMaker_js__WEBPACK_IMPORTED_MODULE_7__["default"].getClassFactory(DefaultProtectionModel));

/***/ }),

/***/ "./src/streaming/protection/models/ProtectionModel_01b.js":
/*!****************************************************************!*\
  !*** ./src/streaming/protection/models/ProtectionModel_01b.js ***!
  \****************************************************************/
/***/ (function(__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony import */ var _controllers_ProtectionKeyController_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../controllers/ProtectionKeyController.js */ "./src/streaming/protection/controllers/ProtectionKeyController.js");
/* harmony import */ var _vo_NeedKey_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../vo/NeedKey.js */ "./src/streaming/protection/vo/NeedKey.js");
/* harmony import */ var _vo_DashJSError_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../../vo/DashJSError.js */ "./src/streaming/vo/DashJSError.js");
/* harmony import */ var _vo_KeyMessage_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../vo/KeyMessage.js */ "./src/streaming/protection/vo/KeyMessage.js");
/* harmony import */ var _vo_KeySystemConfiguration_js__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ../vo/KeySystemConfiguration.js */ "./src/streaming/protection/vo/KeySystemConfiguration.js");
/* harmony import */ var _vo_KeySystemAccess_js__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ../vo/KeySystemAccess.js */ "./src/streaming/protection/vo/KeySystemAccess.js");
/* harmony import */ var _errors_ProtectionErrors_js__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! ../errors/ProtectionErrors.js */ "./src/streaming/protection/errors/ProtectionErrors.js");
/* harmony import */ var _core_FactoryMaker_js__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(/*! ../../../core/FactoryMaker.js */ "./src/core/FactoryMaker.js");
/* harmony import */ var _constants_ProtectionConstants_js__WEBPACK_IMPORTED_MODULE_8__ = __webpack_require__(/*! ../../constants/ProtectionConstants.js */ "./src/streaming/constants/ProtectionConstants.js");
/**
 * The copyright in this software is being made available under the BSD License,
 * included below. This software may be subject to other third party and contributor
 * rights, including patent rights, and no such rights are granted under this license.
 *
 * Copyright (c) 2013, Dash Industry Forum.
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without modification,
 * are permitted provided that the following conditions are met:
 *  * Redistributions of source code must retain the above copyright notice, this
 *  list of conditions and the following disclaimer.
 *  * Redistributions in binary form must reproduce the above copyright notice,
 *  this list of conditions and the following disclaimer in the documentation and/or
 *  other materials provided with the distribution.
 *  * Neither the name of Dash Industry Forum nor the names of its
 *  contributors may be used to endorse or promote products derived from this software
 *  without specific prior written permission.
 *
 *  THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS AS IS AND ANY
 *  EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 *  WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED.
 *  IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT,
 *  INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT
 *  NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
 *  PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY,
 *  WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
 *  ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
 *  POSSIBILITY OF SUCH DAMAGE.
 */

/**
 * Initial implementation of EME
 *
 * Implemented by Google Chrome prior to v36
 *
 * @implements ProtectionModel
 * @class
 */









function ProtectionModel_01b(config) {
  config = config || {};
  const context = this.context;
  const eventBus = config.eventBus; //Need to pass in here so we can use same instance since this is optional module
  const events = config.events;
  const debug = config.debug;
  const api = config.api;
  const errHandler = config.errHandler;
  let instance, logger, videoElement, keySystem, protectionKeyController,
    // With this version of the EME APIs, sessionIds are not assigned to
    // sessions until the first key message is received.  We are assuming
    // that in the case of multiple sessions, key messages will be received
    // in the order that generateKeyRequest() is called.
    // Holding spot for newly-created sessions until we determine whether or
    // not the CDM supports sessionIds
    pendingSessions,
    // List of sessions that have been initialized.  Only the first position will
    // be used in the case that the CDM does not support sessionIds
    sessionTokens,
    // Not all CDMs support the notion of sessionIds.  Without sessionIds
    // there is no way for us to differentiate between sessions, therefore
    // we must only allow a single session.  Once we receive the first key
    // message we can set this flag to determine if more sessions are allowed
    moreSessionsAllowed,
    // This is our main event handler for all desired HTMLMediaElement events
    // related to EME.  These events are translated into our API-independent
    // versions of the same events
    eventHandler;
  function setup() {
    logger = debug.getLogger(instance);
    videoElement = null;
    keySystem = null;
    pendingSessions = [];
    sessionTokens = [];
    protectionKeyController = (0,_controllers_ProtectionKeyController_js__WEBPACK_IMPORTED_MODULE_0__["default"])(context).getInstance();
    eventHandler = createEventHandler();
  }
  function reset() {
    if (videoElement) {
      removeEventListeners();
    }
    for (let i = 0; i < sessionTokens.length; i++) {
      closeKeySession(sessionTokens[i]);
    }
    eventBus.trigger(events.TEARDOWN_COMPLETE);
  }
  function getAllInitData() {
    const retVal = [];
    for (let i = 0; i < pendingSessions.length; i++) {
      retVal.push(pendingSessions[i].initData);
    }
    for (let i = 0; i < sessionTokens.length; i++) {
      retVal.push(sessionTokens[i].initData);
    }
    return retVal;
  }
  function getSessionTokens() {
    return sessionTokens.concat(pendingSessions);
  }
  function requestKeySystemAccess(ksConfigurations) {
    return new Promise((resolve, reject) => {
      let ve = videoElement;
      if (!ve) {
        // Must have a video element to do this capability tests
        ve = document.createElement('video');
      }

      // Try key systems in order, first one with supported key system configuration
      // is used
      let found = false;
      for (let ksIdx = 0; ksIdx < ksConfigurations.length; ksIdx++) {
        const systemString = ksConfigurations[ksIdx].ks.systemString;
        const configs = ksConfigurations[ksIdx].configs;
        let supportedAudio = null;
        let supportedVideo = null;

        // Try key system configs in order, first one with supported audio/video
        // is used
        for (let configIdx = 0; configIdx < configs.length; configIdx++) {
          //let audios = configs[configIdx].audioCapabilities;
          const videos = configs[configIdx].videoCapabilities;
          // Look for supported video container/codecs
          if (videos && videos.length !== 0) {
            supportedVideo = []; // Indicates that we have a requested video config
            for (let videoIdx = 0; videoIdx < videos.length; videoIdx++) {
              if (ve.canPlayType(videos[videoIdx].contentType, systemString) !== '') {
                supportedVideo.push(videos[videoIdx]);
              }
            }
          }

          // No supported audio or video in this configuration OR we have
          // requested audio or video configuration that is not supported
          if (!supportedAudio && !supportedVideo || supportedAudio && supportedAudio.length === 0 || supportedVideo && supportedVideo.length === 0) {
            continue;
          }

          // This configuration is supported
          found = true;
          const ksConfig = new _vo_KeySystemConfiguration_js__WEBPACK_IMPORTED_MODULE_4__["default"](supportedAudio, supportedVideo);
          const ks = protectionKeyController.getKeySystemBySystemString(systemString);
          const keySystemAccess = new _vo_KeySystemAccess_js__WEBPACK_IMPORTED_MODULE_5__["default"](ks, ksConfig);
          eventBus.trigger(events.KEY_SYSTEM_ACCESS_COMPLETE, {
            data: keySystemAccess
          });
          resolve({
            data: keySystemAccess
          });
          break;
        }
      }
      if (!found) {
        const errorMessage = 'Key system access denied! -- No valid audio/video content configurations detected!';
        eventBus.trigger(events.KEY_SYSTEM_ACCESS_COMPLETE, {
          error: errorMessage
        });
        reject({
          error: errorMessage
        });
      }
    });
  }
  function selectKeySystem(keySystemAccess) {
    keySystem = keySystemAccess.keySystem;
    return Promise.resolve(keySystem);
  }
  function setMediaElement(mediaElement) {
    if (videoElement === mediaElement) {
      return;
    }

    // Replacing the previous element
    if (videoElement) {
      removeEventListeners();

      // Close any open sessions - avoids memory leak on LG webOS 2016/2017 TVs
      for (var i = 0; i < sessionTokens.length; i++) {
        closeKeySession(sessionTokens[i]);
      }
      sessionTokens = [];
    }
    videoElement = mediaElement;

    // Only if we are not detaching from the existing element
    if (videoElement) {
      videoElement.addEventListener(api.keyerror, eventHandler);
      videoElement.addEventListener(api.needkey, eventHandler);
      videoElement.addEventListener(api.keymessage, eventHandler);
      videoElement.addEventListener(api.keyadded, eventHandler);
      eventBus.trigger(events.VIDEO_ELEMENT_SELECTED);
    }
  }
  function createKeySession(ksInfo) {
    if (!keySystem) {
      throw new Error('Can not create sessions until you have selected a key system');
    }

    // Determine if creating a new session is allowed
    if (moreSessionsAllowed || sessionTokens.length === 0) {
      const newSession = {
        // Implements SessionToken
        sessionId: null,
        keyId: ksInfo.keyId,
        normalizedKeyId: ksInfo && ksInfo.keyId && typeof ksInfo.keyId === 'string' ? ksInfo.keyId.replace(/-/g, '').toLowerCase() : '',
        initData: ksInfo.initData,
        hasTriggeredKeyStatusMapUpdate: false,
        getKeyId: function () {
          return this.keyId;
        },
        getSessionId: function () {
          return this.sessionId;
        },
        getExpirationTime: function () {
          return NaN;
        },
        getSessionType: function () {
          return 'temporary';
        },
        getKeyStatuses: function () {
          return {
            size: 0,
            has: () => {
              return false;
            },
            get: () => {
              return undefined;
            }
          };
        }
      };
      pendingSessions.push(newSession);

      // Send our request to the CDM
      videoElement[api.generateKeyRequest](keySystem.systemString, new Uint8Array(ksInfo.initData));
      return newSession;
    } else {
      throw new Error('Multiple sessions not allowed!');
    }
  }
  function updateKeySession(sessionToken, message) {
    const sessionId = sessionToken.sessionId;
    if (!protectionKeyController.isClearKey(keySystem)) {
      // Send our request to the CDM
      videoElement[api.addKey](keySystem.systemString, new Uint8Array(message), new Uint8Array(sessionToken.initData), sessionId);
    } else {
      // For clearkey, message is a ClearKeyKeySet
      for (let i = 0; i < message.keyPairs.length; i++) {
        videoElement[api.addKey](keySystem.systemString, message.keyPairs[i].key, message.keyPairs[i].keyID, sessionId);
      }
    }
    eventBus.trigger(events.KEY_SESSION_UPDATED);
  }
  function closeKeySession(sessionToken) {
    // Send our request to the CDM
    try {
      videoElement[api.cancelKeyRequest](keySystem.systemString, sessionToken.sessionId);
    } catch (error) {
      eventBus.trigger(events.KEY_SESSION_CLOSED, {
        data: null,
        error: 'Error closing session (' + sessionToken.sessionId + ') ' + error.message
      });
    }
  }
  function setServerCertificate(/*serverCertificate*/
  ) {
    return Promise.resolve();
  }
  function loadKeySession(/*ksInfo*/
  ) {/* Not supported */
  }
  function removeKeySession(/*sessionToken*/
  ) {/* Not supported */
  }
  function createEventHandler() {
    return {
      handleEvent: function (event) {
        let sessionToken = null;
        switch (event.type) {
          case api.needkey:
            let initData = ArrayBuffer.isView(event.initData) ? event.initData.buffer : event.initData;
            eventBus.trigger(events.NEED_KEY, {
              key: new _vo_NeedKey_js__WEBPACK_IMPORTED_MODULE_1__["default"](initData, _constants_ProtectionConstants_js__WEBPACK_IMPORTED_MODULE_8__["default"].INITIALIZATION_DATA_TYPE_CENC)
            });
            break;
          case api.keyerror:
            sessionToken = findSessionByID(sessionTokens, event.sessionId);
            if (!sessionToken) {
              sessionToken = findSessionByID(pendingSessions, event.sessionId);
            }
            if (sessionToken) {
              let code = _errors_ProtectionErrors_js__WEBPACK_IMPORTED_MODULE_6__["default"].MEDIA_KEYERR_CODE;
              let msg = '';
              switch (event.errorCode.code) {
                case 1:
                  code = _errors_ProtectionErrors_js__WEBPACK_IMPORTED_MODULE_6__["default"].MEDIA_KEYERR_UNKNOWN_CODE;
                  msg += 'MEDIA_KEYERR_UNKNOWN - ' + _errors_ProtectionErrors_js__WEBPACK_IMPORTED_MODULE_6__["default"].MEDIA_KEYERR_UNKNOWN_MESSAGE;
                  break;
                case 2:
                  code = _errors_ProtectionErrors_js__WEBPACK_IMPORTED_MODULE_6__["default"].MEDIA_KEYERR_CLIENT_CODE;
                  msg += 'MEDIA_KEYERR_CLIENT - ' + _errors_ProtectionErrors_js__WEBPACK_IMPORTED_MODULE_6__["default"].MEDIA_KEYERR_CLIENT_MESSAGE;
                  break;
                case 3:
                  code = _errors_ProtectionErrors_js__WEBPACK_IMPORTED_MODULE_6__["default"].MEDIA_KEYERR_SERVICE_CODE;
                  msg += 'MEDIA_KEYERR_SERVICE - ' + _errors_ProtectionErrors_js__WEBPACK_IMPORTED_MODULE_6__["default"].MEDIA_KEYERR_SERVICE_MESSAGE;
                  break;
                case 4:
                  code = _errors_ProtectionErrors_js__WEBPACK_IMPORTED_MODULE_6__["default"].MEDIA_KEYERR_OUTPUT_CODE;
                  msg += 'MEDIA_KEYERR_OUTPUT - ' + _errors_ProtectionErrors_js__WEBPACK_IMPORTED_MODULE_6__["default"].MEDIA_KEYERR_OUTPUT_MESSAGE;
                  break;
                case 5:
                  code = _errors_ProtectionErrors_js__WEBPACK_IMPORTED_MODULE_6__["default"].MEDIA_KEYERR_HARDWARECHANGE_CODE;
                  msg += 'MEDIA_KEYERR_HARDWARECHANGE - ' + _errors_ProtectionErrors_js__WEBPACK_IMPORTED_MODULE_6__["default"].MEDIA_KEYERR_HARDWARECHANGE_MESSAGE;
                  break;
                case 6:
                  code = _errors_ProtectionErrors_js__WEBPACK_IMPORTED_MODULE_6__["default"].MEDIA_KEYERR_DOMAIN_CODE;
                  msg += 'MEDIA_KEYERR_DOMAIN - ' + _errors_ProtectionErrors_js__WEBPACK_IMPORTED_MODULE_6__["default"].MEDIA_KEYERR_DOMAIN_MESSAGE;
                  break;
              }
              msg += '  System Code = ' + event.systemCode;
              // TODO: Build error string based on key error
              eventBus.trigger(events.KEY_ERROR, {
                error: new _vo_DashJSError_js__WEBPACK_IMPORTED_MODULE_2__["default"](code, msg, sessionToken)
              });
            } else {
              logger.error('No session token found for key error');
            }
            break;
          case api.keyadded:
            sessionToken = findSessionByID(sessionTokens, event.sessionId);
            if (!sessionToken) {
              sessionToken = findSessionByID(pendingSessions, event.sessionId);
            }
            if (sessionToken) {
              logger.debug('DRM: Key added.');
              eventBus.trigger(events.KEY_ADDED, {
                data: sessionToken
              }); //TODO not sure anything is using sessionToken? why there?
            } else {
              logger.debug('No session token found for key added');
            }
            break;
          case api.keymessage:
            // If this CDM does not support session IDs, we will be limited
            // to a single session
            moreSessionsAllowed = event.sessionId !== null && event.sessionId !== undefined;

            // SessionIDs supported
            if (moreSessionsAllowed) {
              // Attempt to find an uninitialized token with this sessionId
              sessionToken = findSessionByID(sessionTokens, event.sessionId);
              if (!sessionToken && pendingSessions.length > 0) {
                // This is the first message for our latest session, so set the
                // sessionId and add it to our list
                sessionToken = pendingSessions.shift();
                sessionTokens.push(sessionToken);
                sessionToken.sessionId = event.sessionId;
                eventBus.trigger(events.KEY_SESSION_CREATED, {
                  data: sessionToken
                });
              }
            } else if (pendingSessions.length > 0) {
              // SessionIDs not supported
              sessionToken = pendingSessions.shift();
              sessionTokens.push(sessionToken);
              if (pendingSessions.length !== 0) {
                errHandler.error(new _vo_DashJSError_js__WEBPACK_IMPORTED_MODULE_2__["default"](_errors_ProtectionErrors_js__WEBPACK_IMPORTED_MODULE_6__["default"].MEDIA_KEY_MESSAGE_ERROR_CODE, _errors_ProtectionErrors_js__WEBPACK_IMPORTED_MODULE_6__["default"].MEDIA_KEY_MESSAGE_ERROR_MESSAGE));
              }
            }
            if (sessionToken) {
              let message = ArrayBuffer.isView(event.message) ? event.message.buffer : event.message;

              // For ClearKey, the spec mandates that you pass this message to the
              // addKey method, so we always save it to the token since there is no
              // way to tell which key system is in use
              sessionToken.keyMessage = message;
              eventBus.trigger(events.INTERNAL_KEY_MESSAGE, {
                data: new _vo_KeyMessage_js__WEBPACK_IMPORTED_MODULE_3__["default"](sessionToken, message, event.defaultURL)
              });
            } else {
              logger.warn('No session token found for key message');
            }
            break;
        }
      }
    };
  }

  /**
   * Helper function to retrieve the stored session token based on a given
   * sessionId value
   *
   * @param {Array} sessionArray - the array of sessions to search
   * @param {*} sessionId - the sessionId to search for
   * @returns {*} the session token with the given sessionId
   */
  function findSessionByID(sessionArray, sessionId) {
    if (!sessionId || !sessionArray) {
      return null;
    } else {
      const len = sessionArray.length;
      for (let i = 0; i < len; i++) {
        if (sessionArray[i].sessionId == sessionId) {
          return sessionArray[i];
        }
      }
      return null;
    }
  }
  function removeEventListeners() {
    videoElement.removeEventListener(api.keyerror, eventHandler);
    videoElement.removeEventListener(api.needkey, eventHandler);
    videoElement.removeEventListener(api.keymessage, eventHandler);
    videoElement.removeEventListener(api.keyadded, eventHandler);
  }
  instance = {
    getAllInitData,
    getSessionTokens,
    requestKeySystemAccess,
    selectKeySystem,
    setMediaElement,
    createKeySession,
    updateKeySession,
    closeKeySession,
    setServerCertificate,
    loadKeySession,
    removeKeySession,
    stop: reset,
    reset
  };
  setup();
  return instance;
}
ProtectionModel_01b.__dashjs_factory_name = 'ProtectionModel_01b';
/* harmony default export */ __webpack_exports__["default"] = (_core_FactoryMaker_js__WEBPACK_IMPORTED_MODULE_7__["default"].getClassFactory(ProtectionModel_01b));

/***/ }),

/***/ "./src/streaming/protection/models/ProtectionModel_3Feb2014.js":
/*!*********************************************************************!*\
  !*** ./src/streaming/protection/models/ProtectionModel_3Feb2014.js ***!
  \*********************************************************************/
/***/ (function(__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony import */ var _controllers_ProtectionKeyController_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../controllers/ProtectionKeyController.js */ "./src/streaming/protection/controllers/ProtectionKeyController.js");
/* harmony import */ var _vo_NeedKey_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../vo/NeedKey.js */ "./src/streaming/protection/vo/NeedKey.js");
/* harmony import */ var _vo_DashJSError_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../../vo/DashJSError.js */ "./src/streaming/vo/DashJSError.js");
/* harmony import */ var _errors_ProtectionErrors_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../errors/ProtectionErrors.js */ "./src/streaming/protection/errors/ProtectionErrors.js");
/* harmony import */ var _vo_KeyMessage_js__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ../vo/KeyMessage.js */ "./src/streaming/protection/vo/KeyMessage.js");
/* harmony import */ var _vo_KeySystemConfiguration_js__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ../vo/KeySystemConfiguration.js */ "./src/streaming/protection/vo/KeySystemConfiguration.js");
/* harmony import */ var _vo_KeySystemAccess_js__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! ../vo/KeySystemAccess.js */ "./src/streaming/protection/vo/KeySystemAccess.js");
/* harmony import */ var _core_FactoryMaker_js__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(/*! ../../../core/FactoryMaker.js */ "./src/core/FactoryMaker.js");
/* harmony import */ var _constants_ProtectionConstants_js__WEBPACK_IMPORTED_MODULE_8__ = __webpack_require__(/*! ../../constants/ProtectionConstants.js */ "./src/streaming/constants/ProtectionConstants.js");
/**
 * The copyright in this software is being made available under the BSD License,
 * included below. This software may be subject to other third party and contributor
 * rights, including patent rights, and no such rights are granted under this license.
 *
 * Copyright (c) 2013, Dash Industry Forum.
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without modification,
 * are permitted provided that the following conditions are met:
 *  * Redistributions of source code must retain the above copyright notice, this
 *  list of conditions and the following disclaimer.
 *  * Redistributions in binary form must reproduce the above copyright notice,
 *  this list of conditions and the following disclaimer in the documentation and/or
 *  other materials provided with the distribution.
 *  * Neither the name of Dash Industry Forum nor the names of its
 *  contributors may be used to endorse or promote products derived from this software
 *  without specific prior written permission.
 *
 *  THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS AS IS AND ANY
 *  EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 *  WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED.
 *  IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT,
 *  INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT
 *  NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
 *  PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY,
 *  WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
 *  ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
 *  POSSIBILITY OF SUCH DAMAGE.
 */

/**
 * Implementation of the EME APIs as of the 3 Feb 2014 state of the specification.
 *
 * Implemented by Internet Explorer 11 (Windows 8.1)
 *
 * @implements ProtectionModel
 * @class
 */










function ProtectionModel_3Feb2014(config) {
  config = config || {};
  const context = this.context;
  const eventBus = config.eventBus; //Need to pass in here so we can use same instance since this is optional module
  const events = config.events;
  const debug = config.debug;
  const api = config.api;
  let instance, logger, videoElement, keySystem, mediaKeys, keySystemAccess, sessionTokens, eventHandler, protectionKeyController;
  function setup() {
    logger = debug.getLogger(instance);
    videoElement = null;
    keySystem = null;
    mediaKeys = null;
    keySystemAccess = null;
    sessionTokens = [];
    protectionKeyController = (0,_controllers_ProtectionKeyController_js__WEBPACK_IMPORTED_MODULE_0__["default"])(context).getInstance();
    eventHandler = createEventHandler();
  }
  function reset() {
    try {
      for (let i = 0; i < sessionTokens.length; i++) {
        closeKeySession(sessionTokens[i]);
      }
      if (videoElement) {
        videoElement.removeEventListener(api.needkey, eventHandler);
      }
      eventBus.trigger(events.TEARDOWN_COMPLETE);
    } catch (error) {
      eventBus.trigger(events.TEARDOWN_COMPLETE, {
        error: 'Error tearing down key sessions and MediaKeys! -- ' + error.message
      });
    }
  }
  function getAllInitData() {
    const retVal = [];
    for (let i = 0; i < sessionTokens.length; i++) {
      retVal.push(sessionTokens[i].initData);
    }
    return retVal;
  }
  function getSessionTokens() {
    return sessionTokens;
  }
  function requestKeySystemAccess(ksConfigurations) {
    return new Promise((resolve, reject) => {
      // Try key systems in order, first one with supported key system configuration
      // is used
      let found = false;
      for (let ksIdx = 0; ksIdx < ksConfigurations.length; ksIdx++) {
        const systemString = ksConfigurations[ksIdx].ks.systemString;
        const configs = ksConfigurations[ksIdx].configs;
        let supportedAudio = null;
        let supportedVideo = null;

        // Try key system configs in order, first one with supported audio/video
        // is used
        for (let configIdx = 0; configIdx < configs.length; configIdx++) {
          const audios = configs[configIdx].audioCapabilities;
          const videos = configs[configIdx].videoCapabilities;

          // Look for supported audio container/codecs
          if (audios && audios.length !== 0) {
            supportedAudio = []; // Indicates that we have a requested audio config
            for (let audioIdx = 0; audioIdx < audios.length; audioIdx++) {
              if (window[api.MediaKeys].isTypeSupported(systemString, audios[audioIdx].contentType)) {
                supportedAudio.push(audios[audioIdx]);
              }
            }
          }

          // Look for supported video container/codecs
          if (videos && videos.length !== 0) {
            supportedVideo = []; // Indicates that we have a requested video config
            for (let videoIdx = 0; videoIdx < videos.length; videoIdx++) {
              if (window[api.MediaKeys].isTypeSupported(systemString, videos[videoIdx].contentType)) {
                supportedVideo.push(videos[videoIdx]);
              }
            }
          }

          // No supported audio or video in this configuration OR we have
          // requested audio or video configuration that is not supported
          if (!supportedAudio && !supportedVideo || supportedAudio && supportedAudio.length === 0 || supportedVideo && supportedVideo.length === 0) {
            continue;
          }

          // This configuration is supported
          found = true;
          const ksConfig = new _vo_KeySystemConfiguration_js__WEBPACK_IMPORTED_MODULE_5__["default"](supportedAudio, supportedVideo);
          const ks = protectionKeyController.getKeySystemBySystemString(systemString);
          const keySystemAccess = new _vo_KeySystemAccess_js__WEBPACK_IMPORTED_MODULE_6__["default"](ks, ksConfig);
          eventBus.trigger(events.KEY_SYSTEM_ACCESS_COMPLETE, {
            data: keySystemAccess
          });
          resolve({
            data: keySystemAccess
          });
          break;
        }
      }
      if (!found) {
        const errorMessage = 'Key system access denied! -- No valid audio/video content configurations detected!';
        eventBus.trigger(events.KEY_SYSTEM_ACCESS_COMPLETE, {
          error: errorMessage
        });
        reject({
          error: errorMessage
        });
      }
    });
  }
  function selectKeySystem(ksAccess) {
    return new Promise((resolve, reject) => {
      try {
        mediaKeys = ksAccess.mediaKeys = new window[api.MediaKeys](ksAccess.keySystem.systemString);
        keySystem = ksAccess.keySystem;
        keySystemAccess = ksAccess;
        if (videoElement) {
          setMediaKeys();
        }
        resolve(keySystem);
      } catch (error) {
        reject({
          error: 'Error selecting keys system (' + keySystem.systemString + ')! Could not create MediaKeys -- TODO'
        });
      }
    });
  }
  function setMediaElement(mediaElement) {
    if (videoElement === mediaElement) {
      return;
    }

    // Replacing the previous element
    if (videoElement) {
      videoElement.removeEventListener(api.needkey, eventHandler);
    }
    videoElement = mediaElement;

    // Only if we are not detaching from the existing element
    if (videoElement) {
      videoElement.addEventListener(api.needkey, eventHandler);
      if (mediaKeys) {
        setMediaKeys();
      }
    }
  }
  function createKeySession(ksInfo) {
    if (!keySystem || !mediaKeys || !keySystemAccess) {
      throw new Error('Can not create sessions until you have selected a key system');
    }

    // Use the first video capability for the contentType.
    // TODO:  Not sure if there is a way to concatenate all capability data into a RFC6386-compatible format

    // If player is trying to playback Audio only stream - don't error out.
    let capabilities = null;
    if (keySystemAccess.ksConfiguration.videoCapabilities && keySystemAccess.ksConfiguration.videoCapabilities.length > 0) {
      capabilities = keySystemAccess.ksConfiguration.videoCapabilities[0];
    }
    if (capabilities === null && keySystemAccess.ksConfiguration.audioCapabilities && keySystemAccess.ksConfiguration.audioCapabilities.length > 0) {
      capabilities = keySystemAccess.ksConfiguration.audioCapabilities[0];
    }
    if (capabilities === null) {
      throw new Error('Can not create sessions for unknown content types.');
    }
    const contentType = capabilities.contentType;
    const session = mediaKeys.createSession(contentType, new Uint8Array(ksInfo.initData), ksInfo.cdmData ? new Uint8Array(ksInfo.cdmData) : null);
    const sessionToken = createSessionToken(session, ksInfo);

    // Add all event listeners
    session.addEventListener(api.error, sessionToken);
    session.addEventListener(api.message, sessionToken);
    session.addEventListener(api.ready, sessionToken);
    session.addEventListener(api.close, sessionToken);

    // Add to our session list
    sessionTokens.push(sessionToken);
    logger.debug('DRM: Session created.  SessionID = ' + sessionToken.getSessionId());
    eventBus.trigger(events.KEY_SESSION_CREATED, {
      data: sessionToken
    });
  }
  function updateKeySession(sessionToken, message) {
    const session = sessionToken.session;
    if (!protectionKeyController.isClearKey(keySystem)) {
      // Send our request to the key session
      session.update(new Uint8Array(message));
    } else {
      // For clearkey, message is a ClearKeyKeySet
      session.update(new Uint8Array(message.toJWK()));
    }
    eventBus.trigger(events.KEY_SESSION_UPDATED);
  }

  /**
   * Close the given session and release all associated keys.  Following
   * this call, the sessionToken becomes invalid
   *
   * @param {Object} sessionToken - the session token
   */
  function closeKeySession(sessionToken) {
    const session = sessionToken.session;

    // Remove event listeners
    session.removeEventListener(api.error, sessionToken);
    session.removeEventListener(api.message, sessionToken);
    session.removeEventListener(api.ready, sessionToken);
    session.removeEventListener(api.close, sessionToken);

    // Remove from our session list
    for (let i = 0; i < sessionTokens.length; i++) {
      if (sessionTokens[i] === sessionToken) {
        sessionTokens.splice(i, 1);
        break;
      }
    }

    // Send our request to the key session
    session[api.release]();
  }
  function setServerCertificate(/*serverCertificate*/
  ) {
    /* Not supported */
    return Promise.resolve();
  }
  function loadKeySession(/*ksInfo*/
  ) {/* Not supported */
  }
  function removeKeySession(/*sessionToken*/
  ) {/* Not supported */
  }
  function createEventHandler() {
    return {
      handleEvent: function (event) {
        switch (event.type) {
          case api.needkey:
            if (event.initData) {
              const initData = ArrayBuffer.isView(event.initData) ? event.initData.buffer : event.initData;
              eventBus.trigger(events.NEED_KEY, {
                key: new _vo_NeedKey_js__WEBPACK_IMPORTED_MODULE_1__["default"](initData, _constants_ProtectionConstants_js__WEBPACK_IMPORTED_MODULE_8__["default"].INITIALIZATION_DATA_TYPE_CENC)
              });
            }
            break;
        }
      }
    };
  }

  // IE11 does not let you set MediaKeys until it has entered a certain
  // readyState, so we need this logic to ensure we don't set the keys
  // too early
  function setMediaKeys() {
    let boundDoSetKeys = null;
    const doSetKeys = function () {
      videoElement.removeEventListener('loadedmetadata', boundDoSetKeys);
      videoElement[api.setMediaKeys](mediaKeys);
      eventBus.trigger(events.VIDEO_ELEMENT_SELECTED);
    };
    if (videoElement.readyState >= 1) {
      doSetKeys();
    } else {
      boundDoSetKeys = doSetKeys.bind(this);
      videoElement.addEventListener('loadedmetadata', boundDoSetKeys);
    }
  }

  // Function to create our session token objects which manage the EME
  // MediaKeySession and session-specific event handler
  function createSessionToken(keySession, ksInfo) {
    return {
      // Implements SessionToken
      session: keySession,
      keyId: ksInfo.keyId,
      normalizedKeyId: ksInfo && ksInfo.keyId && typeof ksInfo.keyId === 'string' ? ksInfo.keyId.replace(/-/g, '').toLowerCase() : '',
      initData: ksInfo.initData,
      hasTriggeredKeyStatusMapUpdate: false,
      getKeyId: function () {
        return this.keyId;
      },
      getSessionId: function () {
        return this.session.sessionId;
      },
      getExpirationTime: function () {
        return NaN;
      },
      getSessionType: function () {
        return 'temporary';
      },
      getKeyStatuses: function () {
        return {
          size: 0,
          has: () => {
            return false;
          },
          get: () => {
            return undefined;
          }
        };
      },
      // This is our main event handler for all desired MediaKeySession events
      // These events are translated into our API-independent versions of the
      // same events
      handleEvent: function (event) {
        switch (event.type) {
          case api.error:
            let errorStr = 'KeyError'; // TODO: Make better string from event
            eventBus.trigger(events.KEY_ERROR, {
              error: new _vo_DashJSError_js__WEBPACK_IMPORTED_MODULE_2__["default"](_errors_ProtectionErrors_js__WEBPACK_IMPORTED_MODULE_3__["default"].MEDIA_KEYERR_CODE, errorStr, this)
            });
            break;
          case api.message:
            let message = ArrayBuffer.isView(event.message) ? event.message.buffer : event.message;
            eventBus.trigger(events.INTERNAL_KEY_MESSAGE, {
              data: new _vo_KeyMessage_js__WEBPACK_IMPORTED_MODULE_4__["default"](this, message, event.destinationURL)
            });
            break;
          case api.ready:
            logger.debug('DRM: Key added.');
            eventBus.trigger(events.KEY_ADDED);
            break;
          case api.close:
            logger.debug('DRM: Session closed.  SessionID = ' + this.getSessionId());
            eventBus.trigger(events.KEY_SESSION_CLOSED, {
              data: this.getSessionId()
            });
            break;
        }
      }
    };
  }
  instance = {
    getAllInitData,
    getSessionTokens,
    requestKeySystemAccess,
    selectKeySystem,
    setMediaElement,
    createKeySession,
    updateKeySession,
    closeKeySession,
    setServerCertificate,
    loadKeySession,
    removeKeySession,
    stop: reset,
    reset
  };
  setup();
  return instance;
}
ProtectionModel_3Feb2014.__dashjs_factory_name = 'ProtectionModel_3Feb2014';
/* harmony default export */ __webpack_exports__["default"] = (_core_FactoryMaker_js__WEBPACK_IMPORTED_MODULE_7__["default"].getClassFactory(ProtectionModel_3Feb2014));

/***/ }),

/***/ "./src/streaming/protection/servers/ClearKey.js":
/*!******************************************************!*\
  !*** ./src/streaming/protection/servers/ClearKey.js ***!
  \******************************************************/
/***/ (function(__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony import */ var _vo_KeyPair_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../vo/KeyPair.js */ "./src/streaming/protection/vo/KeyPair.js");
/* harmony import */ var _vo_ClearKeyKeySet_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../vo/ClearKeyKeySet.js */ "./src/streaming/protection/vo/ClearKeyKeySet.js");
/* harmony import */ var _core_FactoryMaker_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../../../core/FactoryMaker.js */ "./src/core/FactoryMaker.js");
/**
 * The copyright in this software is being made available under the BSD License,
 * included below. This software may be subject to other third party and contributor
 * rights, including patent rights, and no such rights are granted under this license.
 *
 * Copyright (c) 2013, Dash Industry Forum.
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without modification,
 * are permitted provided that the following conditions are met:
 *  * Redistributions of source code must retain the above copyright notice, this
 *  list of conditions and the following disclaimer.
 *  * Redistributions in binary form must reproduce the above copyright notice,
 *  this list of conditions and the following disclaimer in the documentation and/or
 *  other materials provided with the distribution.
 *  * Neither the name of Dash Industry Forum nor the names of its
 *  contributors may be used to endorse or promote products derived from this software
 *  without specific prior written permission.
 *
 *  THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS AS IS AND ANY
 *  EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 *  WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED.
 *  IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT,
 *  INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT
 *  NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
 *  PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY,
 *  WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
 *  ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
 *  POSSIBILITY OF SUCH DAMAGE.
 */

/**
 * CableLabs ClearKey license server implementation
 *
 * For testing purposes and evaluating potential uses for ClearKey, we have developed
 * a dirt-simple API for requesting ClearKey licenses from a remote server.
 *
 * @implements LicenseServer
 * @class
 */



function ClearKey() {
  let instance;
  function getServerURLFromMessage(url /* message, messageType*/) {
    return url;
  }
  function getHTTPMethod(/*messageType*/
  ) {
    return 'POST';
  }
  function getResponseType(/*keySystemStr*/
  ) {
    return 'json';
  }
  function getLicenseMessage(serverResponse /*, keySystemStr, messageType*/) {
    if (!serverResponse.hasOwnProperty('keys')) {
      return null;
    }
    let keyPairs = [];
    for (let i = 0; i < serverResponse.keys.length; i++) {
      let keypair = serverResponse.keys[i];
      let keyid = keypair.kid.replace(/=/g, '');
      let key = keypair.k.replace(/=/g, '');
      keyPairs.push(new _vo_KeyPair_js__WEBPACK_IMPORTED_MODULE_0__["default"](keyid, key));
    }
    return new _vo_ClearKeyKeySet_js__WEBPACK_IMPORTED_MODULE_1__["default"](keyPairs);
  }
  function getErrorResponse(serverResponse /*, keySystemStr, messageType*/) {
    return String.fromCharCode.apply(null, new Uint8Array(serverResponse));
  }
  instance = {
    getServerURLFromMessage,
    getHTTPMethod,
    getResponseType,
    getLicenseMessage,
    getErrorResponse
  };
  return instance;
}
ClearKey.__dashjs_factory_name = 'ClearKey';
/* harmony default export */ __webpack_exports__["default"] = (_core_FactoryMaker_js__WEBPACK_IMPORTED_MODULE_2__["default"].getSingletonFactory(ClearKey));

/***/ }),

/***/ "./src/streaming/protection/servers/DRMToday.js":
/*!******************************************************!*\
  !*** ./src/streaming/protection/servers/DRMToday.js ***!
  \******************************************************/
/***/ (function(__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony import */ var _constants_ProtectionConstants_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../../constants/ProtectionConstants.js */ "./src/streaming/constants/ProtectionConstants.js");
/* harmony import */ var _core_FactoryMaker_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../../../core/FactoryMaker.js */ "./src/core/FactoryMaker.js");
/**
 * The copyright in this software is being made available under the BSD License,
 * included below. This software may be subject to other third party and contributor
 * rights, including patent rights, and no such rights are granted under this license.
 *
 * Copyright (c) 2013, Dash Industry Forum.
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without modification,
 * are permitted provided that the following conditions are met:
 *  * Redistributions of source code must retain the above copyright notice, this
 *  list of conditions and the following disclaimer.
 *  * Redistributions in binary form must reproduce the above copyright notice,
 *  this list of conditions and the following disclaimer in the documentation and/or
 *  other materials provided with the distribution.
 *  * Neither the name of Dash Industry Forum nor the names of its
 *  contributors may be used to endorse or promote products derived from this software
 *  without specific prior written permission.
 *
 *  THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS AS IS AND ANY
 *  EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 *  WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED.
 *  IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT,
 *  INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT
 *  NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
 *  PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY,
 *  WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
 *  ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
 *  POSSIBILITY OF SUCH DAMAGE.
 */

/**
 * CastLabs DRMToday License Server implementation
 *
 * @implements LicenseServer
 * @class
 */



function DRMToday(config) {
  config = config || {};
  const BASE64 = config.BASE64;
  const keySystems = {};
  keySystems[_constants_ProtectionConstants_js__WEBPACK_IMPORTED_MODULE_0__["default"].WIDEVINE_KEYSTEM_STRING] = {
    responseType: 'json',
    getLicenseMessage: function (response) {
      return BASE64.decodeArray(response.license);
    },
    getErrorResponse: function (response) {
      return response;
    }
  };
  keySystems[_constants_ProtectionConstants_js__WEBPACK_IMPORTED_MODULE_0__["default"].PLAYREADY_KEYSTEM_STRING] = {
    responseType: 'arraybuffer',
    getLicenseMessage: function (response) {
      return response;
    },
    getErrorResponse: function (response) {
      return String.fromCharCode.apply(null, new Uint8Array(response));
    }
  };
  let instance;
  function checkConfig() {
    if (!BASE64 || !BASE64.hasOwnProperty('decodeArray')) {
      throw new Error('Missing config parameter(s)');
    }
  }
  function getServerURLFromMessage(url /*, message, messageType*/) {
    return url;
  }
  function getHTTPMethod(/*messageType*/
  ) {
    return 'POST';
  }
  function getResponseType(keySystemStr /*, messageType*/) {
    return keySystems[keySystemStr].responseType;
  }
  function getLicenseMessage(serverResponse, keySystemStr /*, messageType*/) {
    checkConfig();
    return keySystems[keySystemStr].getLicenseMessage(serverResponse);
  }
  function getErrorResponse(serverResponse, keySystemStr /*, messageType*/) {
    return keySystems[keySystemStr].getErrorResponse(serverResponse);
  }
  instance = {
    getServerURLFromMessage,
    getHTTPMethod,
    getResponseType,
    getLicenseMessage,
    getErrorResponse
  };
  return instance;
}
DRMToday.__dashjs_factory_name = 'DRMToday';
/* harmony default export */ __webpack_exports__["default"] = (_core_FactoryMaker_js__WEBPACK_IMPORTED_MODULE_1__["default"].getSingletonFactory(DRMToday));

/***/ }),

/***/ "./src/streaming/protection/servers/FairPlay.js":
/*!******************************************************!*\
  !*** ./src/streaming/protection/servers/FairPlay.js ***!
  \******************************************************/
/***/ (function(__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony import */ var _core_FactoryMaker_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../../../core/FactoryMaker.js */ "./src/core/FactoryMaker.js");
/**
 * The copyright in this software is being made available under the BSD License,
 * included below. This software may be subject to other third party and contributor
 * rights, including patent rights, and no such rights are granted under this license.
 *
 * Copyright (c) 2026, Dash Industry Forum.
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without modification,
 * are permitted provided that the following conditions are met:
 *  * Redistributions of source code must retain the above copyright notice, this
 *  list of conditions and the following disclaimer.
 *  * Redistributions in binary form must reproduce the above copyright notice,
 *  this list of conditions and the following disclaimer in the documentation and/or
 *  other materials provided with the distribution.
 *  * Neither the name of Dash Industry Forum nor the names of its
 *  contributors may be used to endorse or promote products derived from this software
 *  without specific prior written permission.
 *
 *  THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS AS IS AND ANY
 *  EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 *  WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED.
 *  IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT,
 *  INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT
 *  NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
 *  PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY,
 *  WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
 *  ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
 *  POSSIBILITY OF SUCH DAMAGE.
 */



/**
 * @ignore
 */
function FairPlay() {
  let instance;
  function getServerURLFromMessage(url /*, message, messageType*/) {
    return url;
  }
  function getHTTPMethod(/*messageType*/
  ) {
    return 'POST';
  }
  function getResponseType(/*keySystemStr, messageType*/
  ) {
    return 'arraybuffer';
  }

  /**
   * FairPlay license servers may return the CKC in various formats:
   * - Raw binary CKC (ideal, pass through)
   * - Base64-encoded CKC as text
   * - XML-wrapped: <ckc>base64</ckc>
   * - JSON-wrapped: {"ckc": "base64"} or {"CkcMessage": "base64"} or {"License": "base64"}
   *
   * This function detects text-based formats and decodes the base64 CKC.
   */
  function getLicenseMessage(serverResponse /*, keySystemStr, messageType*/) {
    if (!serverResponse || !serverResponse.byteLength) {
      return serverResponse;
    }

    // Try to interpret as text
    let responseText;
    try {
      responseText = String.fromCharCode.apply(null, new Uint8Array(serverResponse));
    } catch (e) {
      // Large responses may fail with apply(); use iterative approach
      const bytes = new Uint8Array(serverResponse);
      let str = '';
      for (let i = 0; i < bytes.length; i++) {
        str += String.fromCharCode(bytes[i]);
      }
      responseText = str;
    }
    if (!responseText) {
      return serverResponse;
    }
    responseText = responseText.trim();

    // Check for <ckc> XML wrapper
    if (responseText.substr(0, 5) === '<ckc>' && responseText.substr(-6) === '</ckc>') {
      return _base64DecodeToArrayBuffer(responseText.slice(5, -6));
    }

    // Check for JSON wrapper
    try {
      const obj = JSON.parse(responseText);
      const ckc = obj['ckc'] || obj['CkcMessage'] || obj['License'];
      if (ckc) {
        return _base64DecodeToArrayBuffer(ckc);
      }
    } catch (e) {
      // Not JSON
    }

    // Check if the entire response looks like base64 (no binary bytes, valid chars)
    if (/^[A-Za-z0-9+/\r\n]+=*$/.test(responseText) && responseText.length > 0) {
      return _base64DecodeToArrayBuffer(responseText);
    }

    // Raw binary CKC — pass through
    return serverResponse;
  }
  function _base64DecodeToArrayBuffer(base64) {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
  }
  function getErrorResponse(serverResponse /*, keySystemStr, messageType*/) {
    return String.fromCharCode.apply(null, new Uint8Array(serverResponse));
  }
  instance = {
    getErrorResponse,
    getHTTPMethod,
    getLicenseMessage,
    getResponseType,
    getServerURLFromMessage
  };
  return instance;
}
FairPlay.__dashjs_factory_name = 'FairPlay';
/* harmony default export */ __webpack_exports__["default"] = (_core_FactoryMaker_js__WEBPACK_IMPORTED_MODULE_0__["default"].getSingletonFactory(FairPlay));

/***/ }),

/***/ "./src/streaming/protection/servers/PlayReady.js":
/*!*******************************************************!*\
  !*** ./src/streaming/protection/servers/PlayReady.js ***!
  \*******************************************************/
/***/ (function(__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony import */ var _core_FactoryMaker_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../../../core/FactoryMaker.js */ "./src/core/FactoryMaker.js");
/**
 * The copyright in this software is being made available under the BSD License,
 * included below. This software may be subject to other third party and contributor
 * rights, including patent rights, and no such rights are granted under this license.
 *
 * Copyright (c) 2013, Dash Industry Forum.
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without modification,
 * are permitted provided that the following conditions are met:
 *  * Redistributions of source code must retain the above copyright notice, this
 *  list of conditions and the following disclaimer.
 *  * Redistributions in binary form must reproduce the above copyright notice,
 *  this list of conditions and the following disclaimer in the documentation and/or
 *  other materials provided with the distribution.
 *  * Neither the name of Dash Industry Forum nor the names of its
 *  contributors may be used to endorse or promote products derived from this software
 *  without specific prior written permission.
 *
 *  THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS AS IS AND ANY
 *  EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 *  WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED.
 *  IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT,
 *  INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT
 *  NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
 *  PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY,
 *  WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
 *  ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
 *  POSSIBILITY OF SUCH DAMAGE.
 */

/* global escape: true */



/**
 * Microsoft PlayReady Test License Server
 *
 * For testing content that uses the PlayReady test server at
 *
 * @implements LicenseServer
 * @class
 * @ignore
 */

function PlayReady() {
  let instance;
  const soap = 'http://schemas.xmlsoap.org/soap/envelope/';
  function uintToString(arrayBuffer) {
    const encodedString = String.fromCharCode.apply(null, new Uint8Array(arrayBuffer));
    const decodedString = decodeURIComponent(escape(encodedString));
    return decodedString;
  }
  function parseServerResponse(serverResponse) {
    if (window.DOMParser) {
      const stringResponse = uintToString(serverResponse);
      const parser = new window.DOMParser();
      const xmlDoc = parser.parseFromString(stringResponse, 'text/xml');
      const envelope = xmlDoc ? xmlDoc.getElementsByTagNameNS(soap, 'Envelope')[0] : null;
      const body = envelope ? envelope.getElementsByTagNameNS(soap, 'Body')[0] : null;
      const fault = body ? body.getElementsByTagNameNS(soap, 'Fault')[0] : null;
      if (fault) {
        return null;
      }
    }
    return serverResponse;
  }
  function parseErrorResponse(serverResponse) {
    let faultstring = '';
    let statusCode = '';
    let message = '';
    let idStart = -1;
    let idEnd = -1;
    if (window.DOMParser) {
      const stringResponse = uintToString(serverResponse);
      const parser = new window.DOMParser();
      const xmlDoc = parser.parseFromString(stringResponse, 'text/xml');
      const envelope = xmlDoc ? xmlDoc.getElementsByTagNameNS(soap, 'Envelope')[0] : null;
      const body = envelope ? envelope.getElementsByTagNameNS(soap, 'Body')[0] : null;
      const fault = body ? body.getElementsByTagNameNS(soap, 'Fault')[0] : null;
      const detail = fault ? fault.getElementsByTagName('detail')[0] : null;
      const exception = detail ? detail.getElementsByTagName('Exception')[0] : null;
      let node = null;
      if (fault === null) {
        return stringResponse;
      }
      node = fault.getElementsByTagName('faultstring')[0].firstChild;
      faultstring = node ? node.nodeValue : null;
      if (exception !== null) {
        node = exception.getElementsByTagName('StatusCode')[0];
        statusCode = node ? node.firstChild.nodeValue : null;
        node = exception.getElementsByTagName('Message')[0];
        message = node ? node.firstChild.nodeValue : null;
        idStart = message ? message.lastIndexOf('[') + 1 : -1;
        idEnd = message ? message.indexOf(']') : -1;
        message = message ? message.substring(idStart, idEnd) : '';
      }
    }
    let errorString = `code: ${statusCode}, name: ${faultstring}`;
    if (message) {
      errorString += `, message: ${message}`;
    }
    return errorString;
  }
  function getServerURLFromMessage(url /*, message, messageType*/) {
    return url;
  }
  function getHTTPMethod(/*messageType*/
  ) {
    return 'POST';
  }
  function getResponseType(/*keySystemStr, messageType*/
  ) {
    return 'arraybuffer';
  }
  function getLicenseMessage(serverResponse /*, keySystemStr, messageType*/) {
    return parseServerResponse.call(this, serverResponse);
  }
  function getErrorResponse(serverResponse /*, keySystemStr, messageType*/) {
    return parseErrorResponse.call(this, serverResponse);
  }
  instance = {
    getServerURLFromMessage,
    getHTTPMethod,
    getResponseType,
    getLicenseMessage,
    getErrorResponse
  };
  return instance;
}
PlayReady.__dashjs_factory_name = 'PlayReady';
/* harmony default export */ __webpack_exports__["default"] = (_core_FactoryMaker_js__WEBPACK_IMPORTED_MODULE_0__["default"].getSingletonFactory(PlayReady));

/***/ }),

/***/ "./src/streaming/protection/servers/Widevine.js":
/*!******************************************************!*\
  !*** ./src/streaming/protection/servers/Widevine.js ***!
  \******************************************************/
/***/ (function(__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony import */ var _core_FactoryMaker_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../../../core/FactoryMaker.js */ "./src/core/FactoryMaker.js");
/**
 * The copyright in this software is being made available under the BSD License,
 * included below. This software may be subject to other third party and contributor
 * rights, including patent rights, and no such rights are granted under this license.
 *
 * Copyright (c) 2013, Dash Industry Forum.
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without modification,
 * are permitted provided that the following conditions are met:
 *  * Redistributions of source code must retain the above copyright notice, this
 *  list of conditions and the following disclaimer.
 *  * Redistributions in binary form must reproduce the above copyright notice,
 *  this list of conditions and the following disclaimer in the documentation and/or
 *  other materials provided with the distribution.
 *  * Neither the name of Dash Industry Forum nor the names of its
 *  contributors may be used to endorse or promote products derived from this software
 *  without specific prior written permission.
 *
 *  THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS AS IS AND ANY
 *  EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 *  WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED.
 *  IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT,
 *  INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT
 *  NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
 *  PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY,
 *  WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
 *  ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
 *  POSSIBILITY OF SUCH DAMAGE.
 */



/**
 * @ignore
 */
function Widevine() {
  let instance;
  function getServerURLFromMessage(url /*, message, messageType*/) {
    return url;
  }
  function getHTTPMethod(/*messageType*/
  ) {
    return 'POST';
  }
  function getResponseType(/*keySystemStr, messageType*/
  ) {
    return 'arraybuffer';
  }
  function getLicenseMessage(serverResponse /*, keySystemStr, messageType*/) {
    return serverResponse;
  }
  function getErrorResponse(serverResponse /*, keySystemStr, messageType*/) {
    return String.fromCharCode.apply(null, new Uint8Array(serverResponse));
  }
  instance = {
    getServerURLFromMessage,
    getHTTPMethod,
    getResponseType,
    getLicenseMessage,
    getErrorResponse
  };
  return instance;
}
Widevine.__dashjs_factory_name = 'Widevine';
/* harmony default export */ __webpack_exports__["default"] = (_core_FactoryMaker_js__WEBPACK_IMPORTED_MODULE_0__["default"].getSingletonFactory(Widevine));

/***/ }),

/***/ "./src/streaming/protection/vo/CertificateRequest.js":
/*!***********************************************************!*\
  !*** ./src/streaming/protection/vo/CertificateRequest.js ***!
  \***********************************************************/
/***/ (function(__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/**
 * The copyright in this software is being made available under the BSD License,
 * included below. This software may be subject to other third party and contributor
 * rights, including patent rights, and no such rights are granted under this license.
 *
 * Copyright (c) 2013, Dash Industry Forum.
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without modification,
 * are permitted provided that the following conditions are met:
 *  * Redistributions of source code must retain the above copyright notice, this
 *  list of conditions and the following disclaimer.
 *  * Redistributions in binary form must reproduce the above copyright notice,
 *  this list of conditions and the following disclaimer in the documentation and/or
 *  other materials provided with the distribution.
 *  * Neither the name of Dash Industry Forum nor the names of its
 *  contributors may be used to endorse or promote products derived from this software
 *  without specific prior written permission.
 *
 *  THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS AS IS AND ANY
 *  EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 *  WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED.
 *  IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT,
 *  INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT
 *  NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
 *  PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY,
 *  WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
 *  ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
 *  POSSIBILITY OF SUCH DAMAGE.
 */
/**
 * @classdesc Defines a Certificate request
 * @ignore
 */
class CertificateRequest {
  /**
   * Defines a certificate request
   *
   * @class
   */
  constructor(url, headers, withCredentials) {
    this.url = url;
    this.method = 'GET';
    this.responseType = 'arraybuffer';
    this.headers = headers;
    this.body = null;
    this.withCredentials = withCredentials;
  }
}
/* harmony default export */ __webpack_exports__["default"] = (CertificateRequest);

/***/ }),

/***/ "./src/streaming/protection/vo/CertificateResponse.js":
/*!************************************************************!*\
  !*** ./src/streaming/protection/vo/CertificateResponse.js ***!
  \************************************************************/
/***/ (function(__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/**
 * The copyright in this software is being made available under the BSD License,
 * included below. This software may be subject to other third party and contributor
 * rights, including patent rights, and no such rights are granted under this license.
 *
 * Copyright (c) 2013, Dash Industry Forum.
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without modification,
 * are permitted provided that the following conditions are met:
 *  * Redistributions of source code must retain the above copyright notice, this
 *  list of conditions and the following disclaimer.
 *  * Redistributions in binary form must reproduce the above copyright notice,
 *  this list of conditions and the following disclaimer in the documentation and/or
 *  other materials provided with the distribution.
 *  * Neither the name of Dash Industry Forum nor the names of its
 *  contributors may be used to endorse or promote products derived from this software
 *  without specific prior written permission.
 *
 *  THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS AS IS AND ANY
 *  EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 *  WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED.
 *  IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT,
 *  INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT
 *  NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
 *  PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY,
 *  WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
 *  ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
 *  POSSIBILITY OF SUCH DAMAGE.
 */
/**
 * @classdesc Defines a license response
 */
class CertificateResponse {
  /**
   * Defines a license response
   *
   * @class
   * @ignore
   */
  constructor(url, headers, data) {
    /**
     * The url that was loaded, that can be redirected from original request url
     */
    this.url = url;

    /**
     * The HTP response headers
     */
    this.headers = headers;

    /**
     * The certificate response data
     */
    this.data = data;
  }
}
/* harmony default export */ __webpack_exports__["default"] = (CertificateResponse);

/***/ }),

/***/ "./src/streaming/protection/vo/ClearKeyKeySet.js":
/*!*******************************************************!*\
  !*** ./src/streaming/protection/vo/ClearKeyKeySet.js ***!
  \*******************************************************/
/***/ (function(__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/**
 * The copyright in this software is being made available under the BSD License,
 * included below. This software may be subject to other third party and contributor
 * rights, including patent rights, and no such rights are granted under this license.
 *
 * Copyright (c) 2013, Dash Industry Forum.
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without modification,
 * are permitted provided that the following conditions are met:
 *  * Redistributions of source code must retain the above copyright notice, this
 *  list of conditions and the following disclaimer.
 *  * Redistributions in binary form must reproduce the above copyright notice,
 *  this list of conditions and the following disclaimer in the documentation and/or
 *  other materials provided with the distribution.
 *  * Neither the name of Dash Industry Forum nor the names of its
 *  contributors may be used to endorse or promote products derived from this software
 *  without specific prior written permission.
 *
 *  THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS AS IS AND ANY
 *  EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 *  WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED.
 *  IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT,
 *  INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT
 *  NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
 *  PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY,
 *  WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
 *  ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
 *  POSSIBILITY OF SUCH DAMAGE.
 */

/**
 * @classdesc A collection of ClearKey encryption keys with an (optional) associated
 *  type
 * @ignore
 */
class ClearKeyKeySet {
  /**
   * @param {Array.<KeyPair>} keyPairs
   * @param {string} type the type of keys in this set.  One of either 'persistent'
   * or 'temporary'.  Can also be null or undefined.
   * @class
   * @ignore
   */
  constructor(keyPairs, type) {
    if (type && type !== 'persistent' && type !== 'temporary') {
      throw new Error('Invalid ClearKey key set type!  Must be one of \'persistent\' or \'temporary\'');
    }
    this.keyPairs = keyPairs;
    this.type = type;
  }

  /**
   * Convert this key set to its JSON Web Key (JWK) representation
   *
   * @return {ArrayBuffer} JWK object UTF-8 encoded as ArrayBuffer
   */
  toJWK() {
    let i;
    let numKeys = this.keyPairs.length;
    let jwk = {
      keys: []
    };
    for (i = 0; i < numKeys; i++) {
      let key = {
        kty: 'oct',
        alg: 'A128KW',
        kid: this.keyPairs[i].keyID,
        k: this.keyPairs[i].key
      };
      jwk.keys.push(key);
    }
    if (this.type) {
      jwk.type = this.type;
    }
    let jwkString = JSON.stringify(jwk);
    const len = jwkString.length;

    // Convert JSON string to ArrayBuffer
    let buf = new ArrayBuffer(len);
    let bView = new Uint8Array(buf);
    for (i = 0; i < len; i++) {
      bView[i] = jwkString.charCodeAt(i);
    }
    return buf;
  }
}
/* harmony default export */ __webpack_exports__["default"] = (ClearKeyKeySet);

/***/ }),

/***/ "./src/streaming/protection/vo/KeyMessage.js":
/*!***************************************************!*\
  !*** ./src/streaming/protection/vo/KeyMessage.js ***!
  \***************************************************/
/***/ (function(__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony import */ var _constants_ProtectionConstants_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../../constants/ProtectionConstants.js */ "./src/streaming/constants/ProtectionConstants.js");
/**
 * The copyright in this software is being made available under the BSD License,
 * included below. This software may be subject to other third party and contributor
 * rights, including patent rights, and no such rights are granted under this license.
 *
 * Copyright (c) 2013, Dash Industry Forum.
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without modification,
 * are permitted provided that the following conditions are met:
 *  * Redistributions of source code must retain the above copyright notice, this
 *  list of conditions and the following disclaimer.
 *  * Redistributions in binary form must reproduce the above copyright notice,
 *  this list of conditions and the following disclaimer in the documentation and/or
 *  other materials provided with the distribution.
 *  * Neither the name of Dash Industry Forum nor the names of its
 *  contributors may be used to endorse or promote products derived from this software
 *  without specific prior written permission.
 *
 *  THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS AS IS AND ANY
 *  EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 *  WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED.
 *  IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT,
 *  INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT
 *  NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
 *  PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY,
 *  WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
 *  ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
 *  POSSIBILITY OF SUCH DAMAGE.
 */


/**
 * @classdesc EME-independent KeyMessage
 * @ignore
 */
class KeyMessage {
  /**
   * @param {SessionToken} sessionToken the session
   * to which the key message is associated
   * @param {ArrayBuffer} message the key message
   * @param {string} defaultURL license acquisition URL provided by the CDM
   * @param {string} messageType Supported message types can be found
   * {@link https://w3c.github.io/encrypted-media/#idl-def-MediaKeyMessageType|here}.
   * @class
   */
  constructor(sessionToken, message, defaultURL, messageType) {
    this.sessionToken = sessionToken;
    this.message = message;
    this.defaultURL = defaultURL;
    this.messageType = messageType ? messageType : _constants_ProtectionConstants_js__WEBPACK_IMPORTED_MODULE_0__["default"].MEDIA_KEY_MESSAGE_TYPES.LICENSE_REQUEST;
  }
}
/* harmony default export */ __webpack_exports__["default"] = (KeyMessage);

/***/ }),

/***/ "./src/streaming/protection/vo/KeyPair.js":
/*!************************************************!*\
  !*** ./src/streaming/protection/vo/KeyPair.js ***!
  \************************************************/
/***/ (function(__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/**
 * The copyright in this software is being made available under the BSD License,
 * included below. This software may be subject to other third party and contributor
 * rights, including patent rights, and no such rights are granted under this license.
 *
 * Copyright (c) 2013, Dash Industry Forum.
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without modification,
 * are permitted provided that the following conditions are met:
 *  * Redistributions of source code must retain the above copyright notice, this
 *  list of conditions and the following disclaimer.
 *  * Redistributions in binary form must reproduce the above copyright notice,
 *  this list of conditions and the following disclaimer in the documentation and/or
 *  other materials provided with the distribution.
 *  * Neither the name of Dash Industry Forum nor the names of its
 *  contributors may be used to endorse or promote products derived from this software
 *  without specific prior written permission.
 *
 *  THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS AS IS AND ANY
 *  EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 *  WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED.
 *  IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT,
 *  INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT
 *  NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
 *  PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY,
 *  WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
 *  ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
 *  POSSIBILITY OF SUCH DAMAGE.
 */
/**
 * @classdesc Represents a 128-bit keyID and 128-bit encryption key
 * @ignore
 */
class KeyPair {
  /**
   * @param {string} keyID 128-bit key ID, base64 encoded, with no padding
   * @param {string} key 128-bit encryption key, base64 encoded, with no padding
   * @class
   * @ignore
   */
  constructor(keyID, key) {
    this.keyID = keyID;
    this.key = key;
  }
}
/* harmony default export */ __webpack_exports__["default"] = (KeyPair);

/***/ }),

/***/ "./src/streaming/protection/vo/KeySystemAccess.js":
/*!********************************************************!*\
  !*** ./src/streaming/protection/vo/KeySystemAccess.js ***!
  \********************************************************/
/***/ (function(__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/**
 * The copyright in this software is being made available under the BSD License,
 * included below. This software may be subject to other third party and contributor
 * rights, including patent rights, and no such rights are granted under this license.
 *
 * Copyright (c) 2013, Dash Industry Forum.
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without modification,
 * are permitted provided that the following conditions are met:
 *  * Redistributions of source code must retain the above copyright notice, this
 *  list of conditions and the following disclaimer.
 *  * Redistributions in binary form must reproduce the above copyright notice,
 *  this list of conditions and the following disclaimer in the documentation and/or
 *  other materials provided with the distribution.
 *  * Neither the name of Dash Industry Forum nor the names of its
 *  contributors may be used to endorse or promote products derived from this software
 *  without specific prior written permission.
 *
 *  THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS AS IS AND ANY
 *  EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 *  WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED.
 *  IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT,
 *  INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT
 *  NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
 *  PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY,
 *  WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
 *  ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
 *  POSSIBILITY OF SUCH DAMAGE.
 */
/**
 * @classdesc Creates a new key system access token.  Represents a valid key system for
 * given piece of content and key system requirements.  Used to initialize license
 * acquisition operations.
 * @ignore
 */
class KeySystemAccess {
  /**
   * @param {MediaPlayer.dependencies.protection.KeySystem} keySystem the key system
   * @param {KeySystemConfiguration} ksConfiguration the
   * subset of configurations passed to the key system access request that are supported
   * by this user agent
   * @class
   * @ignore
   */
  constructor(keySystem, ksConfiguration) {
    this.keySystem = keySystem;
    this.ksConfiguration = ksConfiguration;
    this.nativeMediaKeySystemAccessObject = null;
    this.selectedSystemString = null;
  }
}
/* harmony default export */ __webpack_exports__["default"] = (KeySystemAccess);

/***/ }),

/***/ "./src/streaming/protection/vo/KeySystemConfiguration.js":
/*!***************************************************************!*\
  !*** ./src/streaming/protection/vo/KeySystemConfiguration.js ***!
  \***************************************************************/
/***/ (function(__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony import */ var _constants_ProtectionConstants_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../../constants/ProtectionConstants.js */ "./src/streaming/constants/ProtectionConstants.js");
/**
 * The copyright in this software is being made available under the BSD License,
 * included below. This software may be subject to other third party and contributor
 * rights, including patent rights, and no such rights are granted under this license.
 *
 * Copyright (c) 2013, Dash Industry Forum.
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without modification,
 * are permitted provided that the following conditions are met:
 *  * Redistributions of source code must retain the above copyright notice, this
 *  list of conditions and the following disclaimer.
 *  * Redistributions in binary form must reproduce the above copyright notice,
 *  this list of conditions and the following disclaimer in the documentation and/or
 *  other materials provided with the distribution.
 *  * Neither the name of Dash Industry Forum nor the names of its
 *  contributors may be used to endorse or promote products derived from this software
 *  without specific prior written permission.
 *
 *  THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS AS IS AND ANY
 *  EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 *  WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED.
 *  IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT,
 *  INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT
 *  NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
 *  PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY,
 *  WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
 *  ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
 *  POSSIBILITY OF SUCH DAMAGE.
 */



/**
 * @classdesc Represents a set of configurations that describe the capabilities desired for
 *  support by a given CDM
 * @ignore
 */
class KeySystemConfiguration {
  /**
   * @param {Array.<MediaCapability>} audioCapabilities array of
   * desired audio capabilities.  Higher preference capabilities should be placed earlier
   * in the array.
   * @param {Array.<MediaCapability>} videoCapabilities array of
   * desired video capabilities.  Higher preference capabilities should be placed earlier
   * in the array.
   * @param {string} distinctiveIdentifier desired use of distinctive identifiers.
   * One of "required", "optional", or "not-allowed"
   * @param {string} persistentState desired support for persistent storage of
   * key systems.  One of "required", "optional", or "not-allowed"
   * @param {Array.<string>} sessionTypes List of session types that must
   * be supported by the key system
   * @class
   */
  constructor(audioCapabilities, videoCapabilities, distinctiveIdentifier, persistentState, sessionTypes, initDataTypes) {
    this.initDataTypes = initDataTypes && initDataTypes.length > 0 ? initDataTypes : [_constants_ProtectionConstants_js__WEBPACK_IMPORTED_MODULE_0__["default"].INITIALIZATION_DATA_TYPE_CENC];
    if (audioCapabilities && audioCapabilities.length) {
      this.audioCapabilities = audioCapabilities;
    }
    if (videoCapabilities && videoCapabilities.length) {
      this.videoCapabilities = videoCapabilities;
    }
    this.distinctiveIdentifier = distinctiveIdentifier;
    this.persistentState = persistentState;
    this.sessionTypes = sessionTypes;
  }
}
/* harmony default export */ __webpack_exports__["default"] = (KeySystemConfiguration);

/***/ }),

/***/ "./src/streaming/protection/vo/KeySystemMetadata.js":
/*!**********************************************************!*\
  !*** ./src/streaming/protection/vo/KeySystemMetadata.js ***!
  \**********************************************************/
/***/ (function(__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/**
 * The copyright in this software is being made available under the BSD License,
 * included below. This software may be subject to other third party and contributor
 * rights, including patent rights, and no such rights are granted under this license.
 *
 * Copyright (c) 2013, Dash Industry Forum.
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without modification,
 * are permitted provided that the following conditions are met:
 *  * Redistributions of source code must retain the above copyright notice, this
 *  list of conditions and the following disclaimer.
 *  * Redistributions in binary form must reproduce the above copyright notice,
 *  this list of conditions and the following disclaimer in the documentation and/or
 *  other materials provided with the distribution.
 *  * Neither the name of Dash Industry Forum nor the names of its
 *  contributors may be used to endorse or promote products derived from this software
 *  without specific prior written permission.
 *
 *  THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS AS IS AND ANY
 *  EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 *  WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED.
 *  IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT,
 *  INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT
 *  NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
 *  PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY,
 *  WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
 *  ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
 *  POSSIBILITY OF SUCH DAMAGE.
 */
/**
 * @classdesc A model class to save metadata about a key system
 * @ignore
 */

class KeySystemMetadata {
  constructor(config) {
    this.ks = config.ks;
    this.keyId = config.keyId;
    this.initData = config.initData;
    this.protData = config.protData;
    this.cdmData = config.cdmData;
    this.sessionId = config.sessionId;
    this.sessionType = config.sessionType;
  }
}
/* harmony default export */ __webpack_exports__["default"] = (KeySystemMetadata);

/***/ }),

/***/ "./src/streaming/protection/vo/LicenseRequest.js":
/*!*******************************************************!*\
  !*** ./src/streaming/protection/vo/LicenseRequest.js ***!
  \*******************************************************/
/***/ (function(__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/**
 * The copyright in this software is being made available under the BSD License,
 * included below. This software may be subject to other third party and contributor
 * rights, including patent rights, and no such rights are granted under this license.
 *
 * Copyright (c) 2013, Dash Industry Forum.
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without modification,
 * are permitted provided that the following conditions are met:
 *  * Redistributions of source code must retain the above copyright notice, this
 *  list of conditions and the following disclaimer.
 *  * Redistributions in binary form must reproduce the above copyright notice,
 *  this list of conditions and the following disclaimer in the documentation and/or
 *  other materials provided with the distribution.
 *  * Neither the name of Dash Industry Forum nor the names of its
 *  contributors may be used to endorse or promote products derived from this software
 *  without specific prior written permission.
 *
 *  THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS AS IS AND ANY
 *  EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 *  WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED.
 *  IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT,
 *  INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT
 *  NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
 *  PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY,
 *  WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
 *  ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
 *  POSSIBILITY OF SUCH DAMAGE.
 */
/**
 * @classdesc Defines a license request
 * @ignore
 */
class LicenseRequest {
  /**
   * Defines a license request
   *
   * @class
   */
  constructor(url, method, responseType, headers, withCredentials, messageType, sessionId, data) {
    /**
     * The license request url
     */
    this.url = url;

    /**
     * The HTTP method
     */
    this.method = method;

    /**
     * The HTTP response type
     */
    this.responseType = responseType;

    /**
     * The HTP request headers
     */
    this.headers = headers;

    /**
     * Wether request is done using credentials (cross-site cookies)
     */
    this.withCredentials = withCredentials;

    /**
     * The license request message type (see https://www.w3.org/TR/encrypted-media/#dom-mediakeymessagetype)
     */
    this.messageType = messageType;

    /**
     * The corresponding EME session ID
     */
    this.sessionId = sessionId;

    /**
     * The license request data
     */
    this.data = data;
  }
}
/* harmony default export */ __webpack_exports__["default"] = (LicenseRequest);

/***/ }),

/***/ "./src/streaming/protection/vo/LicenseResponse.js":
/*!********************************************************!*\
  !*** ./src/streaming/protection/vo/LicenseResponse.js ***!
  \********************************************************/
/***/ (function(__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/**
 * The copyright in this software is being made available under the BSD License,
 * included below. This software may be subject to other third party and contributor
 * rights, including patent rights, and no such rights are granted under this license.
 *
 * Copyright (c) 2013, Dash Industry Forum.
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without modification,
 * are permitted provided that the following conditions are met:
 *  * Redistributions of source code must retain the above copyright notice, this
 *  list of conditions and the following disclaimer.
 *  * Redistributions in binary form must reproduce the above copyright notice,
 *  this list of conditions and the following disclaimer in the documentation and/or
 *  other materials provided with the distribution.
 *  * Neither the name of Dash Industry Forum nor the names of its
 *  contributors may be used to endorse or promote products derived from this software
 *  without specific prior written permission.
 *
 *  THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS AS IS AND ANY
 *  EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 *  WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED.
 *  IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT,
 *  INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT
 *  NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
 *  PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY,
 *  WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
 *  ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
 *  POSSIBILITY OF SUCH DAMAGE.
 */
/**
 * @classdesc Defines a license response
 */
class LicenseResponse {
  /**
   * Defines a license response
   *
   * @class
   * @ignore
   */
  constructor(url, headers, data) {
    /**
     * The url that was loaded, that can be redirected from original request url
     */
    this.url = url;

    /**
     * The HTP response headers
     */
    this.headers = headers;

    /**
     * The license response data
     */
    this.data = data;
  }
}
/* harmony default export */ __webpack_exports__["default"] = (LicenseResponse);

/***/ }),

/***/ "./src/streaming/protection/vo/MediaCapability.js":
/*!********************************************************!*\
  !*** ./src/streaming/protection/vo/MediaCapability.js ***!
  \********************************************************/
/***/ (function(__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/**
 * The copyright in this software is being made available under the BSD License,
 * included below. This software may be subject to other third party and contributor
 * rights, including patent rights, and no such rights are granted under this license.
 *
 * Copyright (c) 2013, Dash Industry Forum.
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without modification,
 * are permitted provided that the following conditions are met:
 *  * Redistributions of source code must retain the above copyright notice, this
 *  list of conditions and the following disclaimer.
 *  * Redistributions in binary form must reproduce the above copyright notice,
 *  this list of conditions and the following disclaimer in the documentation and/or
 *  other materials provided with the distribution.
 *  * Neither the name of Dash Industry Forum nor the names of its
 *  contributors may be used to endorse or promote products derived from this software
 *  without specific prior written permission.
 *
 *  THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS AS IS AND ANY
 *  EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 *  WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED.
 *  IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT,
 *  INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT
 *  NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
 *  PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY,
 *  WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
 *  ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
 *  POSSIBILITY OF SUCH DAMAGE.
 */
/**
 * @classdesc A media capability
 * @ignore
 */
class MediaCapability {
  /**
   * @param {string} contentType MIME type and codecs (RFC6386)
   * @param {string} robustness
   * @param {string | null} [encryptionScheme] encryption scheme (e.g. 'cenc', 'cbcs')
   * @class
   * @ignore
   */
  constructor(contentType, robustness, encryptionScheme = null) {
    this.contentType = contentType;
    this.robustness = robustness;
    this.encryptionScheme = encryptionScheme;
  }
}
/* harmony default export */ __webpack_exports__["default"] = (MediaCapability);

/***/ }),

/***/ "./src/streaming/protection/vo/NeedKey.js":
/*!************************************************!*\
  !*** ./src/streaming/protection/vo/NeedKey.js ***!
  \************************************************/
/***/ (function(__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/**
 * The copyright in this software is being made available under the BSD License,
 * included below. This software may be subject to other third party and contributor
 * rights, including patent rights, and no such rights are granted under this license.
 *
 * Copyright (c) 2013, Dash Industry Forum.
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without modification,
 * are permitted provided that the following conditions are met:
 *  * Redistributions of source code must retain the above copyright notice, this
 *  list of conditions and the following disclaimer.
 *  * Redistributions in binary form must reproduce the above copyright notice,
 *  this list of conditions and the following disclaimer in the documentation and/or
 *  other materials provided with the distribution.
 *  * Neither the name of Dash Industry Forum nor the names of its
 *  contributors may be used to endorse or promote products derived from this software
 *  without specific prior written permission.
 *
 *  THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS AS IS AND ANY
 *  EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 *  WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED.
 *  IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT,
 *  INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT
 *  NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
 *  PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY,
 *  WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
 *  ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
 *  POSSIBILITY OF SUCH DAMAGE.
 */
/**
 * @classdesc NeedKey
 * @ignore
 */
class NeedKey {
  /**
   * @param {ArrayBuffer} initData the initialization data
   * @param {string} initDataType initialization data type
   * @class
   */
  constructor(initData, initDataType) {
    this.initData = initData;
    this.initDataType = initDataType;
  }
}
/* harmony default export */ __webpack_exports__["default"] = (NeedKey);

/***/ }),

/***/ "./src/streaming/utils/CertUrlUtils.js":
/*!*********************************************!*\
  !*** ./src/streaming/utils/CertUrlUtils.js ***!
  \*********************************************/
/***/ (function(__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/**
 * The copyright in this software is being made available under the BSD License,
 * included below. This software may be subject to other third party and contributor
 * rights, including patent rights, and no such rights are granted under this license.
 *
 * Copyright (c) 2013, Dash Industry Forum.
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without modification,
 * are permitted provided that the following conditions are met:
 *  * Redistributions of source code must retain the above copyright notice, this
 *  list of conditions and the following disclaimer.
 *  * Redistributions in binary form must reproduce the above copyright notice,
 *  this list of conditions and the following disclaimer in the documentation and/or
 *  other materials provided with the distribution.
 *  * Neither the name of Dash Industry Forum nor the names of its
 *  contributors may be used to endorse or promote products derived from this software
 *  without specific prior written permission.
 *
 *  THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS AS IS AND ANY
 *  EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 *  WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED.
 *  IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT,
 *  INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT
 *  NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
 *  PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY,
 *  WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
 *  ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
 *  POSSIBILITY OF SUCH DAMAGE.
 */

/**
 * Utility functions for DASH Certurl normalization.
 * Shared by ContentProtection parsing and protData handling.
 *
 * A Certurl entry may appear as:
 *  - String: 'https://example.com/cert'
 *  - Object parsed from XML: { __text: 'https://example.com/cert', '@certType': 'primary' }
 *  - Pre-normalized object: { url: 'https://example.com/cert', certType: 'primary' }
 *  - Array of any of the above
 *
 * The normalization returns an array of objects: { url: string, certType: string|null }
 * Empty or invalid entries are filtered out. Whitespace is trimmed.
 */
function normalizeCertUrls(raw) {
  if (!raw) {
    return [];
  }
  const arr = Array.isArray(raw) ? raw : [raw];
  return arr.map(item => {
    if (!item) {
      return null;
    }
    if (typeof item === 'string') {
      const url = item.trim();
      return url ? {
        url,
        certType: null
      } : null;
    }
    if (typeof item === 'object') {
      let url = (item.__text || item.text || '').trim();
      if (!url && typeof item.url === 'string') {
        // fallback if pre-normalized
        url = item.url.trim();
      }
      let certType = item.certType || item['@certType'] || null;
      if (certType && typeof certType === 'string') {
        certType = certType.trim();
        if (certType === '') {
          certType = null;
        }
      } else {
        certType = null;
      }
      return url ? {
        url,
        certType
      } : null;
    }
    return null;
  }).filter(Boolean);
}

/**
 * Deduplicates an array of Certurl descriptor objects by URL + certType combination.
 * Keeps first occurrence order stable.
 * @param {Array<{url:string, certType:string|null}>} list
 * @returns {Array<{url:string, certType:string|null}>}
 */
function dedupeCertUrls(list) {
  if (!Array.isArray(list) || list.length === 0) {
    return [];
  }
  const seen = new Set();
  const result = [];
  for (let i = 0; i < list.length; i++) {
    const item = list[i];
    if (!item || !item.url) {
      continue;
    }
    const key = item.url + '||' + (item.certType || '');
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    result.push(item);
  }
  return result;
}

/**
 * Iterates over a ProtectionDataSet object and normalizes & deduplicates any certUrls arrays in-place.
 * Returns the same object reference for convenience.
 * @param {Object} protData - keySystem -> config object
 * @returns {Object} protData
 */
function sanitizeProtectionDataCertUrls(protData) {
  if (protData && typeof protData === 'object') {
    Object.keys(protData).forEach(keySystem => {
      const entry = protData[keySystem];
      if (entry && Array.isArray(entry.certUrls)) {
        entry.certUrls = dedupeCertUrls(normalizeCertUrls(entry.certUrls));
      }
    });
  }
  return protData;
}
/* harmony default export */ __webpack_exports__["default"] = ({
  normalizeCertUrls,
  dedupeCertUrls,
  sanitizeProtectionDataCertUrls
});

/***/ }),

/***/ "./src/streaming/vo/DashJSError.js":
/*!*****************************************!*\
  !*** ./src/streaming/vo/DashJSError.js ***!
  \*****************************************/
/***/ (function(__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/**
 * The copyright in this software is being made available under the BSD License,
 * included below. This software may be subject to other third party and contributor
 * rights, including patent rights, and no such rights are granted under this license.
 *
 * Copyright (c) 2013, Dash Industry Forum.
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without modification,
 * are permitted provided that the following conditions are met:
 *  * Redistributions of source code must retain the above copyright notice, this
 *  list of conditions and the following disclaimer.
 *  * Redistributions in binary form must reproduce the above copyright notice,
 *  this list of conditions and the following disclaimer in the documentation and/or
 *  other materials provided with the distribution.
 *  * Neither the name of Dash Industry Forum nor the names of its
 *  contributors may be used to endorse or promote products derived from this software
 *  without specific prior written permission.
 *
 *  THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS AS IS AND ANY
 *  EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 *  WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED.
 *  IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT,
 *  INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT
 *  NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
 *  PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY,
 *  WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
 *  ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
 *  POSSIBILITY OF SUCH DAMAGE.
 */
/**
 * @class
 * @ignore
 */
class DashJSError {
  constructor(code, message, data) {
    this.code = code || null;
    this.message = message || null;
    this.data = data || null;
  }
}
/* harmony default export */ __webpack_exports__["default"] = (DashJSError);

/***/ }),

/***/ "./src/streaming/vo/metrics/HTTPRequest.js":
/*!*************************************************!*\
  !*** ./src/streaming/vo/metrics/HTTPRequest.js ***!
  \*************************************************/
/***/ (function(__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   HTTPRequest: function() { return /* binding */ HTTPRequest; },
/* harmony export */   HTTPRequestTrace: function() { return /* binding */ HTTPRequestTrace; }
/* harmony export */ });
/**
 * The copyright in this software is being made available under the BSD License,
 * included below. This software may be subject to other third party and contributor
 * rights, including patent rights, and no such rights are granted under this license.
 *
 * Copyright (c) 2013, Dash Industry Forum.
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without modification,
 * are permitted provided that the following conditions are met:
 *  * Redistributions of source code must retain the above copyright notice, this
 *  list of conditions and the following disclaimer.
 *  * Redistributions in binary form must reproduce the above copyright notice,
 *  this list of conditions and the following disclaimer in the documentation and/or
 *  other materials provided with the distribution.
 *  * Neither the name of Dash Industry Forum nor the names of its
 *  contributors may be used to endorse or promote products derived from this software
 *  without specific prior written permission.
 *
 *  THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS AS IS AND ANY
 *  EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 *  WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED.
 *  IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT,
 *  INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT
 *  NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
 *  PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY,
 *  WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
 *  ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
 *  POSSIBILITY OF SUCH DAMAGE.
 */
/**
 * @classdesc This Object holds reference to the HTTPRequest for manifest, fragment and xlink loading.
 * Members which are not defined in ISO23009-1 Annex D should be prefixed by a _ so that they are ignored
 * by Metrics Reporting code.
 * @ignore
 */
class HTTPRequest {
  /**
   * @class
   */
  constructor() {
    /**
     * Identifier of the TCP connection on which the HTTP request was sent.
     * @public
     */
    this.tcpid = null;
    /**
     * This is an optional parameter and should not be included in HTTP request/response transactions for progressive download.
     * The type of the request:
     * - MPD
     * - XLink expansion
     * - Initialization Fragment
     * - Index Fragment
     * - Media Fragment
     * - Bitstream Switching Fragment
     * - CMCD Response
     * - other
     * @public
     */
    this.type = null;
    /**
     * The original URL (before any redirects or failures)
     * @public
     */
    this.url = null;
    /**
     * The actual URL requested, if different from above
     * @public
     */
    this.actualurl = null;
    /**
     * The contents of the byte-range-spec part of the HTTP Range header.
     * @public
     */
    this.range = null;
    /**
     * Real-Time | The real time at which the request was sent.
     * @public
     */
    this.trequest = null;
    /**
     * Real-Time | The real time at which the first byte of the response was received.
     * @public
     */
    this.tresponse = null;
    /**
     * The HTTP response code.
     * @public
     */
    this.responsecode = null;
    /**
     * The duration of the throughput trace intervals (ms), for successful requests only.
     * @public
     */
    this.interval = null;
    /**
     * Throughput traces, for successful requests only.
     * @public
     */
    this.trace = [];
    /**
     * The CMSD static and dynamic values retrieved from CMSD response headers.
     * @public
     */
    this.cmsd = null;

    /**
     * Type of stream ("audio" | "video" etc..)
     * @public
     */
    this._stream = null;
    /**
     * Real-Time | The real time at which the request finished.
     * @public
     */
    this._tfinish = null;
    /**
     * The duration of the media requests, if available, in seconds.
     * @public
     */
    this._mediaduration = null;
    /**
     * all the response headers from request.
     * @public
     */
    this._responseHeaders = null;
    /**
     * The selected service location for the request. string.
     * @public
     */
    this._serviceLocation = null;
    /**
     * The type of the loader that was used. Distinguish between fetch loader and xhr loader
     */
    this._fileLoaderType = null;
    /**
     * The values derived from the ResourceTimingAPI.
     */
    this._resourceTimingValues = null;
  }
}

/**
 * @classdesc This Object holds reference to the progress of the HTTPRequest.
 * @ignore
 */
class HTTPRequestTrace {
  /**
   * @class
   */
  constructor() {
    /**
     * Real-Time | Measurement stream start.
     * @public
     */
    this.s = null;
    /**
     * Measurement stream duration (ms).
     * @public
     */
    this.d = null;
    /**
     * List of integers counting the bytes received in each trace interval within the measurement stream.
     * @public
     */
    this.b = [];
  }
}
HTTPRequest.BITSTREAM_SWITCHING_SEGMENT_TYPE = 'BitstreamSwitchingSegment';
HTTPRequest.CONTENT_STEERING_TYPE = 'ContentSteering';
HTTPRequest.DVB_REPORTING_TYPE = 'DVBReporting';
HTTPRequest.GET = 'GET';
HTTPRequest.POST = 'POST';
HTTPRequest.HEAD = 'HEAD';
HTTPRequest.INDEX_SEGMENT_TYPE = 'IndexSegment';
HTTPRequest.INIT_SEGMENT_TYPE = 'InitializationSegment';
HTTPRequest.LICENSE = 'license';
HTTPRequest.LICENSE_CERTIFICATE = 'licenseCertificate';
HTTPRequest.MEDIA_SEGMENT_TYPE = 'MediaSegment';
HTTPRequest.MPD_TYPE = 'MPD';
HTTPRequest.MSS_FRAGMENT_INFO_SEGMENT_TYPE = 'FragmentInfoSegment';
HTTPRequest.CMCD_EVENT = 'CmcdEvent';
HTTPRequest.OTHER_TYPE = 'other';
HTTPRequest.XLINK_EXPANSION_TYPE = 'XLinkExpansion';


/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/define property getters */
/******/ 	!function() {
/******/ 		// define getter functions for harmony exports
/******/ 		__webpack_require__.d = function(exports, definition) {
/******/ 			for(var key in definition) {
/******/ 				if(__webpack_require__.o(definition, key) && !__webpack_require__.o(exports, key)) {
/******/ 					Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
/******/ 				}
/******/ 			}
/******/ 		};
/******/ 	}();
/******/ 	
/******/ 	/* webpack/runtime/hasOwnProperty shorthand */
/******/ 	!function() {
/******/ 		__webpack_require__.o = function(obj, prop) { return Object.prototype.hasOwnProperty.call(obj, prop); }
/******/ 	}();
/******/ 	
/******/ 	/* webpack/runtime/make namespace object */
/******/ 	!function() {
/******/ 		// define __esModule on exports
/******/ 		__webpack_require__.r = function(exports) {
/******/ 			if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 				Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 			}
/******/ 			Object.defineProperty(exports, '__esModule', { value: true });
/******/ 		};
/******/ 	}();
/******/ 	
/************************************************************************/
var __webpack_exports__ = {};
/*!************************************************!*\
  !*** ./src/streaming/protection/Protection.js ***!
  \************************************************/
__webpack_require__.r(__webpack_exports__);
/* harmony import */ var _controllers_ProtectionController_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./controllers/ProtectionController.js */ "./src/streaming/protection/controllers/ProtectionController.js");
/* harmony import */ var _controllers_ProtectionKeyController_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./controllers/ProtectionKeyController.js */ "./src/streaming/protection/controllers/ProtectionKeyController.js");
/* harmony import */ var _ProtectionEvents_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./ProtectionEvents.js */ "./src/streaming/protection/ProtectionEvents.js");
/* harmony import */ var _errors_ProtectionErrors_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./errors/ProtectionErrors.js */ "./src/streaming/protection/errors/ProtectionErrors.js");
/* harmony import */ var _models_DefaultProtectionModel_js__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ./models/DefaultProtectionModel.js */ "./src/streaming/protection/models/DefaultProtectionModel.js");
/* harmony import */ var _models_ProtectionModel_3Feb2014_js__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ./models/ProtectionModel_3Feb2014.js */ "./src/streaming/protection/models/ProtectionModel_3Feb2014.js");
/* harmony import */ var _models_ProtectionModel_01b_js__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! ./models/ProtectionModel_01b.js */ "./src/streaming/protection/models/ProtectionModel_01b.js");
/* harmony import */ var _core_FactoryMaker_js__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(/*! ../../core/FactoryMaker.js */ "./src/core/FactoryMaker.js");
/**
 * The copyright in this software is being made available under the BSD License,
 * included below. This software may be subject to other third party and contributor
 * rights, including patent rights, and no such rights are granted under this license.
 *
 * Copyright (c) 2013, Dash Industry Forum.
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without modification,
 * are permitted provided that the following conditions are met:
 *  * Redistributions of source code must retain the above copyright notice, this
 *  list of conditions and the following disclaimer.
 *  * Redistributions in binary form must reproduce the above copyright notice,
 *  this list of conditions and the following disclaimer in the documentation and/or
 *  other materials provided with the distribution.
 *  * Neither the name of Dash Industry Forum nor the names of its
 *  contributors may be used to endorse or promote products derived from this software
 *  without specific prior written permission.
 *
 *  THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS AS IS AND ANY
 *  EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 *  WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED.
 *  IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT,
 *  INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT
 *  NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
 *  PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY,
 *  WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
 *  ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
 *  POSSIBILITY OF SUCH DAMAGE.
 */








const APIS_ProtectionModel_01b = [
// Un-prefixed as per spec
{
  // Video Element
  generateKeyRequest: 'generateKeyRequest',
  addKey: 'addKey',
  cancelKeyRequest: 'cancelKeyRequest',
  // Events
  needkey: 'needkey',
  keyerror: 'keyerror',
  keyadded: 'keyadded',
  keymessage: 'keymessage'
},
// Webkit-prefixed (early Chrome versions and Chrome with EME disabled in chrome://flags)
{
  // Video Element
  generateKeyRequest: 'webkitGenerateKeyRequest',
  addKey: 'webkitAddKey',
  cancelKeyRequest: 'webkitCancelKeyRequest',
  // Events
  needkey: 'webkitneedkey',
  keyerror: 'webkitkeyerror',
  keyadded: 'webkitkeyadded',
  keymessage: 'webkitkeymessage'
}];
const APIS_ProtectionModel_3Feb2014 = [
// Un-prefixed as per spec
// Chrome 38-39 (and some earlier versions) with chrome://flags -- Enable Encrypted Media Extensions
{
  // Video Element
  setMediaKeys: 'setMediaKeys',
  // MediaKeys
  MediaKeys: 'MediaKeys',
  // MediaKeySession
  release: 'close',
  // Events
  needkey: 'needkey',
  error: 'keyerror',
  message: 'keymessage',
  ready: 'keyadded',
  close: 'keyclose'
},
// MS-prefixed (IE11, Windows 8.1)
{
  // Video Element
  setMediaKeys: 'msSetMediaKeys',
  // MediaKeys
  MediaKeys: 'MSMediaKeys',
  // MediaKeySession
  release: 'close',
  // Events
  needkey: 'msneedkey',
  error: 'mskeyerror',
  message: 'mskeymessage',
  ready: 'mskeyadded',
  close: 'mskeyclose'
}];
function Protection() {
  let instance;
  const context = this.context;

  /**
   * Create a ProtectionController and associated ProtectionModel for use with
   * a single piece of content.
   *
   * @param {Object} config
   * @return {ProtectionController} protection controller
   *
   */
  function createProtectionSystem(config) {
    let controller = null;
    const protectionKeyController = (0,_controllers_ProtectionKeyController_js__WEBPACK_IMPORTED_MODULE_1__["default"])(context).getInstance();
    protectionKeyController.setConfig({
      debug: config.debug,
      BASE64: config.BASE64,
      settings: config.settings
    });
    protectionKeyController.initialize();
    let protectionModel = _getProtectionModel(config);
    if (protectionModel) {
      controller = (0,_controllers_ProtectionController_js__WEBPACK_IMPORTED_MODULE_0__["default"])(context).create({
        BASE64: config.BASE64,
        cmcdController: config.cmcdController,
        constants: config.constants,
        customParametersModel: config.customParametersModel,
        debug: config.debug,
        eventBus: config.eventBus,
        events: config.events,
        protectionKeyController: protectionKeyController,
        protectionModel: protectionModel,
        settings: config.settings
      });
      config.capabilities.setEncryptedMediaSupported(true);
    }
    return controller;
  }
  function _getProtectionModel(config) {
    const debug = config.debug;
    const logger = debug.getLogger(instance);
    const eventBus = config.eventBus;
    const errHandler = config.errHandler;
    const videoElement = config.videoModel ? config.videoModel.getElement() : null;
    if ((!videoElement || videoElement.onencrypted !== undefined) && (!videoElement || videoElement.mediaKeys !== undefined)) {
      logger.info('EME detected on this user agent! (DefaultProtectionModel');
      return (0,_models_DefaultProtectionModel_js__WEBPACK_IMPORTED_MODULE_4__["default"])(context).create({
        debug: debug,
        eventBus: eventBus,
        events: config.events
      });
    } else if (_getAPI(videoElement, APIS_ProtectionModel_3Feb2014)) {
      logger.info('EME detected on this user agent! (ProtectionModel_3Feb2014)');
      return (0,_models_ProtectionModel_3Feb2014_js__WEBPACK_IMPORTED_MODULE_5__["default"])(context).create({
        debug: debug,
        eventBus: eventBus,
        events: config.events,
        api: _getAPI(videoElement, APIS_ProtectionModel_3Feb2014)
      });
    } else if (_getAPI(videoElement, APIS_ProtectionModel_01b)) {
      logger.info('EME detected on this user agent! (ProtectionModel_01b)');
      return (0,_models_ProtectionModel_01b_js__WEBPACK_IMPORTED_MODULE_6__["default"])(context).create({
        debug: debug,
        eventBus: eventBus,
        errHandler: errHandler,
        events: config.events,
        api: _getAPI(videoElement, APIS_ProtectionModel_01b)
      });
    } else {
      logger.warn('No supported version of EME detected on this user agent! - Attempts to play encrypted content will fail!');
      return null;
    }
  }
  function _getAPI(videoElement, apis) {
    for (let i = 0; i < apis.length; i++) {
      const api = apis[i];
      // detect if api is supported by browser
      // check only first function in api -> should be fine
      if (typeof videoElement[api[Object.keys(api)[0]]] !== 'function') {
        continue;
      }
      return api;
    }
    return null;
  }
  instance = {
    createProtectionSystem
  };
  return instance;
}
Protection.__dashjs_factory_name = 'Protection';
const factory = _core_FactoryMaker_js__WEBPACK_IMPORTED_MODULE_7__["default"].getClassFactory(Protection);
factory.events = _ProtectionEvents_js__WEBPACK_IMPORTED_MODULE_2__["default"];
factory.errors = _errors_ProtectionErrors_js__WEBPACK_IMPORTED_MODULE_3__["default"];
_core_FactoryMaker_js__WEBPACK_IMPORTED_MODULE_7__["default"].updateClassFactory(Protection.__dashjs_factory_name, factory);
/* harmony default export */ __webpack_exports__["default"] = (factory);
__webpack_exports__ = __webpack_exports__["default"];
/******/ 	return __webpack_exports__;
/******/ })()
;
});
//# sourceMappingURL=dash.protection.debug.js.map