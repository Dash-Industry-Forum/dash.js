/******/ var __webpack_modules__ = ({

/***/ "./node_modules/fast-deep-equal/index.js":
/*!***********************************************!*\
  !*** ./node_modules/fast-deep-equal/index.js ***!
  \***********************************************/
/***/ (function(module) {



// do not edit .js files directly - edit src/index.jst
module.exports = function equal(a, b) {
  if (a === b) return true;
  if (a && b && typeof a == 'object' && typeof b == 'object') {
    if (a.constructor !== b.constructor) return false;
    var length, i, keys;
    if (Array.isArray(a)) {
      length = a.length;
      if (length != b.length) return false;
      for (i = length; i-- !== 0;) if (!equal(a[i], b[i])) return false;
      return true;
    }
    if (a.constructor === RegExp) return a.source === b.source && a.flags === b.flags;
    if (a.valueOf !== Object.prototype.valueOf) return a.valueOf() === b.valueOf();
    if (a.toString !== Object.prototype.toString) return a.toString() === b.toString();
    keys = Object.keys(a);
    length = keys.length;
    if (length !== Object.keys(b).length) return false;
    for (i = length; i-- !== 0;) if (!Object.prototype.hasOwnProperty.call(b, keys[i])) return false;
    for (i = length; i-- !== 0;) {
      var key = keys[i];
      if (!equal(a[key], b[key])) return false;
    }
    return true;
  }

  // true if both NaN, false otherwise
  return a !== a && b !== b;
};

/***/ }),

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

/***/ "./node_modules/@svta/cml-cmsd/dist/index.js":
/*!***************************************************!*\
  !*** ./node_modules/@svta/cml-cmsd/dist/index.js ***!
  \***************************************************/
/***/ (function(__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   CMSD_DYNAMIC: function() { return /* binding */ CMSD_DYNAMIC; },
/* harmony export */   CMSD_STATIC: function() { return /* binding */ CMSD_STATIC; },
/* harmony export */   CMSD_V1: function() { return /* binding */ CMSD_V1; },
/* harmony export */   CmsdHeaderField: function() { return /* binding */ CmsdHeaderField; },
/* harmony export */   CmsdObjectType: function() { return /* binding */ CmsdObjectType; },
/* harmony export */   CmsdStreamType: function() { return /* binding */ CmsdStreamType; },
/* harmony export */   CmsdStreamingFormat: function() { return /* binding */ CmsdStreamingFormat; },
/* harmony export */   decodeCmsdDynamic: function() { return /* binding */ decodeCmsdDynamic; },
/* harmony export */   decodeCmsdStatic: function() { return /* binding */ decodeCmsdStatic; },
/* harmony export */   encodeCmsdDynamic: function() { return /* binding */ encodeCmsdDynamic; },
/* harmony export */   encodeCmsdStatic: function() { return /* binding */ encodeCmsdStatic; }
/* harmony export */ });
/* harmony import */ var _svta_cml_cta__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @svta/cml-cta */ "./node_modules/@svta/cml-cta/dist/index.js");
/* harmony import */ var _svta_cml_structured_field_values__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @svta/cml-structured-field-values */ "./node_modules/@svta/cml-structured-field-values/dist/index.js");



//#region src/CMSD_DYNAMIC.ts
/**
* CMSD dynamic header name.
*
* @public
*/
const CMSD_DYNAMIC = "CMSD-Dynamic";

//#endregion
//#region src/CMSD_STATIC.ts
/**
* CMSD static header name.
*
* @public
*/
const CMSD_STATIC = "CMSD-Static";

//#endregion
//#region src/CMSD_V1.ts
/**
* CMSD Version 1
*
* @public
*/
const CMSD_V1 = 1;

//#endregion
//#region src/CmsdHeaderField.ts
/**
* CMSD header fields.
*
*
* @enum
*
* @public
*/
const CmsdHeaderField = {
  STATIC: CMSD_STATIC,
  DYNAMIC: CMSD_DYNAMIC
};

//#endregion
//#region src/CmsdObjectType.ts
/**
* Common Media Server Data Object Type
*
*
* @enum
*
* @public
*/
const CmsdObjectType = _svta_cml_cta__WEBPACK_IMPORTED_MODULE_0__.CmObjectType;

//#endregion
//#region src/CmsdStreamingFormat.ts
/**
* Common Media Server Data Streaming Format
*
*
* @enum
*
* @public
*/
const CmsdStreamingFormat = _svta_cml_cta__WEBPACK_IMPORTED_MODULE_0__.CmStreamingFormat;

//#endregion
//#region src/CmsdStreamType.ts
/**
* Common Media Server Data Stream Type
*
*
* @enum
*
* @public
*/
const CmsdStreamType = _svta_cml_cta__WEBPACK_IMPORTED_MODULE_0__.CmStreamType;

//#endregion
//#region src/decodeCmsdDynamic.ts
/**
* Decode a CMSD dynamic string to an object.
*
* @param cmsd - The CMSD string to decode.
*
* @returns The decoded CMSD object.
*
* @public
*/
function decodeCmsdDynamic(cmsd) {
  if (!cmsd) return [];
  return (0,_svta_cml_structured_field_values__WEBPACK_IMPORTED_MODULE_1__.decodeSfList)(cmsd);
}

//#endregion
//#region src/decodeCmsdStatic.ts
/**
* Decode a CMSD Static dict string to an object.
*
* @param cmsd - The CMSD string to decode.
*
* @returns The decoded CMSD object.
*
* @public
*/
function decodeCmsdStatic(cmsd) {
  if (!cmsd) return {};
  return Object.entries((0,_svta_cml_structured_field_values__WEBPACK_IMPORTED_MODULE_1__.decodeSfDict)(cmsd)).reduce((acc, [key, item]) => {
    const {
      value
    } = item;
    acc[key] = typeof value === "symbol" ? (0,_svta_cml_structured_field_values__WEBPACK_IMPORTED_MODULE_1__.symbolToStr)(value) : value;
    return acc;
  }, {});
}

//#endregion
//#region src/encodeCmsdDynamic.ts
function encodeCmsdDynamic(value, cmsd) {
  if (!value) return "";
  if (typeof value === "string") {
    if (!cmsd) return "";
    value = [new _svta_cml_structured_field_values__WEBPACK_IMPORTED_MODULE_1__.SfItem(value, cmsd)];
  }
  return (0,_svta_cml_structured_field_values__WEBPACK_IMPORTED_MODULE_1__.encodeSfList)(value, {
    whitespace: false
  });
}

//#endregion
//#region src/utils/processCmsd.ts
function processCmsd(obj, options) {
  const results = {};
  if (obj == null || typeof obj !== "object") return results;
  const keys = Object.keys(obj);
  const useSymbol = options?.useSymbol !== false;
  keys.forEach(key => {
    let value = obj[key];
    if (key === "v" && value === 1) return;
    if (!(0,_svta_cml_cta__WEBPACK_IMPORTED_MODULE_0__.isValid)(value)) return;
    if ((0,_svta_cml_cta__WEBPACK_IMPORTED_MODULE_0__.isTokenField)(key) && typeof value === "string") value = useSymbol ? Symbol.for(value) : new _svta_cml_structured_field_values__WEBPACK_IMPORTED_MODULE_1__.SfToken(value);
    results[key] = value;
  });
  return results;
}

//#endregion
//#region src/encodeCmsdStatic.ts
/**
* Encode a CMSD Static object.
*
* @param cmsd - The CMSD object to encode.
* @param options - Encoding options
*
* @returns The encoded CMSD string.
*
* @public
*/
function encodeCmsdStatic(cmsd, options) {
  if (!cmsd) return "";
  return (0,_svta_cml_structured_field_values__WEBPACK_IMPORTED_MODULE_1__.encodeSfDict)(processCmsd(cmsd, options), {
    whitespace: false
  });
}

//#endregion


/***/ }),

/***/ "./node_modules/@svta/cml-cta/dist/index.js":
/*!**************************************************!*\
  !*** ./node_modules/@svta/cml-cta/dist/index.js ***!
  \**************************************************/
/***/ (function(__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   CmObjectType: function() { return /* binding */ CmObjectType; },
/* harmony export */   CmStreamType: function() { return /* binding */ CmStreamType; },
/* harmony export */   CmStreamingFormat: function() { return /* binding */ CmStreamingFormat; },
/* harmony export */   isTokenField: function() { return /* binding */ isTokenField; },
/* harmony export */   isValid: function() { return /* binding */ isValid; }
/* harmony export */ });
//#region src/CmObjectType.ts
/**
* Common Media Object Type
*
* @internal
*/
const CmObjectType = {
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
//#region src/CmStreamingFormat.ts
/**
* Common Media Streaming Format
*
* @internal
*/
const CmStreamingFormat = {
  DASH: "d",
  HLS: "h",
  SMOOTH: "s",
  OTHER: "o"
};

//#endregion
//#region src/CmStreamType.ts
/**
* Common Media Stream Type
*
* @internal
*/
const CmStreamType = {
  VOD: "v",
  LIVE: "l"
};

//#endregion
//#region src/isTokenField.ts
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
  return ["ot", "sf", "st", "e", "sta"].includes(key);
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

/***/ "./src/core/Debug.js":
/*!***************************!*\
  !*** ./src/core/Debug.js ***!
  \***************************/
/***/ (function(__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony import */ var _EventBus_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./EventBus.js */ "./src/core/EventBus.js");
/* harmony import */ var _events_Events_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./events/Events.js */ "./src/core/events/Events.js");
/* harmony import */ var _FactoryMaker_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./FactoryMaker.js */ "./src/core/FactoryMaker.js");
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



const LOG_LEVEL_NONE = 0;
const LOG_LEVEL_FATAL = 1;
const LOG_LEVEL_ERROR = 2;
const LOG_LEVEL_WARNING = 3;
const LOG_LEVEL_INFO = 4;
const LOG_LEVEL_DEBUG = 5;

/**
 * @module Debug
 * @param {object} config
 * @ignore
 */
function Debug(config) {
  config = config || {};
  const context = this.context;
  const eventBus = (0,_EventBus_js__WEBPACK_IMPORTED_MODULE_0__["default"])(context).getInstance();
  const settings = config.settings;
  const logFn = [];
  let instance, showLogTimestamp, showCalleeName, startTime;
  function setup() {
    showLogTimestamp = true;
    showCalleeName = true;
    startTime = new Date().getTime();
    if (typeof window !== 'undefined' && window.console) {
      logFn[LOG_LEVEL_FATAL] = getLogFn(window.console.error);
      logFn[LOG_LEVEL_ERROR] = getLogFn(window.console.error);
      logFn[LOG_LEVEL_WARNING] = getLogFn(window.console.warn);
      logFn[LOG_LEVEL_INFO] = getLogFn(window.console.info);
      logFn[LOG_LEVEL_DEBUG] = getLogFn(window.console.debug);
    }
  }
  function getLogFn(fn) {
    if (fn && fn.bind) {
      return fn.bind(window.console);
    }
    // if not define, return the default function for reporting logs
    return window.console.log.bind(window.console);
  }

  /**
   * Retrieves a logger which can be used to write logging information in browser console.
   * @param {object} instance Object for which the logger is created. It is used
   * to include calle object information in log messages.
   * @memberof module:Debug
   * @returns {Logger}
   * @instance
   */
  function getLogger(instance) {
    return {
      fatal: fatal.bind(instance),
      error: error.bind(instance),
      warn: warn.bind(instance),
      info: info.bind(instance),
      debug: debug.bind(instance)
    };
  }

  /**
   * Prepends a timestamp in milliseconds to each log message.
   * @param {boolean} value Set to true if you want to see a timestamp in each log message.
   * @default LOG_LEVEL_WARNING
   * @memberof module:Debug
   * @instance
   */
  function setLogTimestampVisible(value) {
    showLogTimestamp = value;
  }

  /**
   * Prepends the callee object name, and media type if available, to each log message.
   * @param {boolean} value Set to true if you want to see the callee object name and media type in each log message.
   * @default true
   * @memberof module:Debug
   * @instance
   */
  function setCalleeNameVisible(value) {
    showCalleeName = value;
  }
  function fatal(...params) {
    doLog(LOG_LEVEL_FATAL, this, ...params);
  }
  function error(...params) {
    doLog(LOG_LEVEL_ERROR, this, ...params);
  }
  function warn(...params) {
    doLog(LOG_LEVEL_WARNING, this, ...params);
  }
  function info(...params) {
    doLog(LOG_LEVEL_INFO, this, ...params);
  }
  function debug(...params) {
    doLog(LOG_LEVEL_DEBUG, this, ...params);
  }
  function doLog(level, _this, ...params) {
    let message = '';
    let logTime = null;
    if (showLogTimestamp) {
      logTime = new Date().getTime();
      message += '[' + (logTime - startTime) + ']';
    }
    if (showCalleeName && _this && _this.getClassName) {
      message += '[' + _this.getClassName() + ']';
      if (_this.getType) {
        message += '[' + _this.getType() + ']';
      }
    }
    if (message.length > 0) {
      message += ' ';
    }
    Array.apply(null, params).forEach(function (item) {
      message += item + ' ';
    });

    // log to console if the log level is high enough
    if (logFn[level] && settings && settings.get().debug.logLevel >= level) {
      logFn[level](message);
    }

    // send log event regardless of log level
    if (settings && settings.get().debug.dispatchEvent) {
      eventBus.trigger(_events_Events_js__WEBPACK_IMPORTED_MODULE_1__["default"].LOG, {
        message: message,
        level: level
      });
    }
  }
  instance = {
    getLogger: getLogger,
    setLogTimestampVisible: setLogTimestampVisible,
    setCalleeNameVisible: setCalleeNameVisible
  };
  setup();
  return instance;
}
Debug.__dashjs_factory_name = 'Debug';
const factory = _FactoryMaker_js__WEBPACK_IMPORTED_MODULE_2__["default"].getSingletonFactory(Debug);
factory.LOG_LEVEL_NONE = LOG_LEVEL_NONE;
factory.LOG_LEVEL_FATAL = LOG_LEVEL_FATAL;
factory.LOG_LEVEL_ERROR = LOG_LEVEL_ERROR;
factory.LOG_LEVEL_WARNING = LOG_LEVEL_WARNING;
factory.LOG_LEVEL_INFO = LOG_LEVEL_INFO;
factory.LOG_LEVEL_DEBUG = LOG_LEVEL_DEBUG;
_FactoryMaker_js__WEBPACK_IMPORTED_MODULE_2__["default"].updateSingletonFactory(Debug.__dashjs_factory_name, factory);
/* harmony default export */ __webpack_exports__["default"] = (factory);

/***/ }),

/***/ "./src/core/EventBus.js":
/*!******************************!*\
  !*** ./src/core/EventBus.js ***!
  \******************************/
/***/ (function(__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony import */ var _FactoryMaker_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./FactoryMaker.js */ "./src/core/FactoryMaker.js");
/* harmony import */ var _streaming_MediaPlayerEvents_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../streaming/MediaPlayerEvents.js */ "./src/streaming/MediaPlayerEvents.js");
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


const EVENT_PRIORITY_LOW = 0;
const EVENT_PRIORITY_HIGH = 5000;
function EventBus() {
  let handlers = {};
  function _commonOn(type, listener, scope, options = {}, executeOnlyOnce = false) {
    if (!type) {
      throw new Error('event type cannot be null or undefined');
    }
    if (!listener || typeof listener !== 'function') {
      throw new Error('listener must be a function: ' + listener);
    }
    let priority = options.priority || EVENT_PRIORITY_LOW;
    if (getHandlerIdx(type, listener, scope) >= 0) {
      return;
    }
    handlers[type] = handlers[type] || [];
    const handler = {
      callback: listener,
      scope,
      priority,
      executeOnlyOnce
    };
    if (scope && scope.getStreamId) {
      handler.streamId = scope.getStreamId();
    }
    if (scope && scope.getType) {
      handler.mediaType = scope.getType();
    }
    if (options && options.mode) {
      handler.mode = options.mode;
    }
    const inserted = handlers[type].some((item, idx) => {
      if (item && priority > item.priority) {
        handlers[type].splice(idx, 0, handler);
        return true;
      }
    });
    if (!inserted) {
      handlers[type].push(handler);
    }
  }
  function on(type, listener, scope, options = {}) {
    _commonOn(type, listener, scope, options);
  }
  function once(type, listener, scope, options = {}) {
    _commonOn(type, listener, scope, options, true);
  }
  function off(type, listener, scope) {
    if (!type || !listener || !handlers[type]) {
      return;
    }
    const idx = getHandlerIdx(type, listener, scope);
    if (idx < 0) {
      return;
    }
    handlers[type].splice(idx, 1);
  }
  function trigger(type, payload = {}, filters = {}) {
    if (!type || !handlers[type]) {
      return;
    }
    payload = payload || {};
    if (payload.hasOwnProperty('type')) {
      throw new Error('\'type\' is a reserved word for event dispatching');
    }
    payload.type = type;
    if (filters.streamId) {
      payload.streamId = filters.streamId;
    }
    if (filters.mediaType) {
      payload.mediaType = filters.mediaType;
    }
    const handlersToRemove = [];
    handlers[type].filter(handler => {
      if (!handler) {
        return false;
      }
      if (filters.streamId && handler.streamId && handler.streamId !== filters.streamId) {
        return false;
      }
      if (filters.mediaType && handler.mediaType && handler.mediaType !== filters.mediaType) {
        return false;
      }
      // This is used for dispatching DASH events. By default we use the onStart mode. Consequently we filter everything that has a non matching mode and the onReceive events for handlers that did not specify a mode.
      if (filters.mode && handler.mode && handler.mode !== filters.mode || !handler.mode && filters.mode && filters.mode === _streaming_MediaPlayerEvents_js__WEBPACK_IMPORTED_MODULE_1__["default"].EVENT_MODE_ON_RECEIVE) {
        return false;
      }
      return true;
    }).forEach(handler => {
      handler && handler.callback.call(handler.scope, payload);
      if (handler.executeOnlyOnce) {
        handlersToRemove.push(handler);
      }
    });
    handlersToRemove.forEach(handler => {
      off(type, handler.callback, handler.scope);
    });
  }
  function getHandlerIdx(type, listener, scope) {
    let idx = -1;
    if (!handlers[type]) {
      return idx;
    }
    handlers[type].some((item, index) => {
      if (item && item.callback === listener && (!scope || scope === item.scope)) {
        idx = index;
        return true;
      }
    });
    return idx;
  }
  function reset() {
    handlers = {};
  }
  const instance = {
    on,
    once,
    off,
    trigger,
    reset
  };
  return instance;
}
EventBus.__dashjs_factory_name = 'EventBus';
const factory = _FactoryMaker_js__WEBPACK_IMPORTED_MODULE_0__["default"].getSingletonFactory(EventBus);
factory.EVENT_PRIORITY_LOW = EVENT_PRIORITY_LOW;
factory.EVENT_PRIORITY_HIGH = EVENT_PRIORITY_HIGH;
_FactoryMaker_js__WEBPACK_IMPORTED_MODULE_0__["default"].updateSingletonFactory(EventBus.__dashjs_factory_name, factory);
/* harmony default export */ __webpack_exports__["default"] = (factory);

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

/***/ "./src/core/Settings.js":
/*!******************************!*\
  !*** ./src/core/Settings.js ***!
  \******************************/
/***/ (function(__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony import */ var _FactoryMaker_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./FactoryMaker.js */ "./src/core/FactoryMaker.js");
/* harmony import */ var _Utils_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./Utils.js */ "./src/core/Utils.js");
/* harmony import */ var _core_Debug_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../core/Debug.js */ "./src/core/Debug.js");
/* harmony import */ var _streaming_constants_Constants_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../streaming/constants/Constants.js */ "./src/streaming/constants/Constants.js");
/* harmony import */ var _streaming_vo_metrics_HTTPRequest_js__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ../streaming/vo/metrics/HTTPRequest.js */ "./src/streaming/vo/metrics/HTTPRequest.js");
/* harmony import */ var _EventBus_js__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ./EventBus.js */ "./src/core/EventBus.js");
/* harmony import */ var _events_Events_js__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! ./events/Events.js */ "./src/core/events/Events.js");
/* harmony import */ var _streaming_rules_SwitchRequest_js__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(/*! ../streaming/rules/SwitchRequest.js */ "./src/streaming/rules/SwitchRequest.js");
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









/** @module Settings
 * @description Define the configuration parameters of Dash.js MediaPlayer.
 * @see {@link module:Settings~PlayerSettings PlayerSettings} for further information about the supported configuration properties.
 */

/**
 * @typedef {Object} PlayerSettings
 * @property {module:Settings~DebugSettings} [debug]
 * Debug related settings.
 * @property {module:Settings~ErrorSettings} [errors]
 * Error related settings
 * @property {module:Settings~StreamingSettings} [streaming]
 * Streaming related settings.
 * @example
 *
 * // Full settings object
 * settings = {
 *        debug: {
 *            logLevel: Debug.LOG_LEVEL_WARNING,
 *            dispatchEvent: false
 *        },
 *        streaming: {
 *            abandonLoadTimeout: 10000,
 *            wallclockTimeUpdateInterval: 100,
 *            manifestUpdateRetryInterval: 100,
 *            liveUpdateTimeThresholdInMilliseconds: 0,
 *            cacheInitSegments: false,
 *            cacheInitSegmentsLimit: 50,
 *            applyServiceDescription: true,
 *            applyProducerReferenceTime: true,
 *            applyContentSteering: true,
 *            enableManifestDurationMismatchFix: true,
 *            parseInbandPrft: false,
 *            enableManifestTimescaleMismatchFix: false,
 *            capabilities: {
 *               filterUnsupportedEssentialProperties: true,
 *               supportedEssentialProperties: [
 *                   { schemeIdUri: Constants.FONT_DOWNLOAD_DVB_SCHEME },
 *                   { schemeIdUri: Constants.COLOUR_PRIMARIES_SCHEME_ID_URI, value: /1|5|6|7/ },
 *                   { schemeIdUri: Constants.URL_QUERY_INFO_SCHEME },
 *                   { schemeIdUri: Constants.EXT_URL_QUERY_INFO_SCHEME },
 *                   { schemeIdUri: Constants.MATRIX_COEFFICIENTS_SCHEME_ID_URI, value: /0|1|5|6/ },
 *                   { schemeIdUri: Constants.TRANSFER_CHARACTERISTICS_SCHEME_ID_URI, value: /1|6|13|14|15/ },
 *                   ...Constants.THUMBNAILS_SCHEME_ID_URIS.map(ep => { return { 'schemeIdUri': ep }; })
 *               ],
 *               useMediaCapabilitiesApi: true,
 *               filterVideoColorimetryEssentialProperties: true,
 *               filterHDRMetadataFormatEssentialProperties: true,
 *               filterAudioChannelConfiguration: false
 *            },
 *            events: {
 *              eventControllerRefreshDelay: 100,
 *              deleteEventMessageDataTimeout: 10000
 *            }
 *            timeShiftBuffer: {
 *                calcFromSegmentTimeline: false,
 *                fallbackToSegmentTimeline: true
 *            },
 *            metrics: {
 *              maxListDepth: 100
 *            },
 *            delay: {
 *                liveDelayFragmentCount: NaN,
 *                liveDelay: NaN,
 *                useSuggestedPresentationDelay: true
 *            },
 *            protection: {
 *                keepProtectionMediaKeys: false,
 *                keepProtectionMediaKeysMaximumOpenSessions: -1,
 *                ignoreEmeEncryptedEvent: false,
 *                detectPlayreadyMessageFormat: true,
 *                ignoreKeyStatuses: false,
 *            },
 *            buffer: {
 *                enableSeekDecorrelationFix: false,
 *                fastSwitchEnabled: true,
 *                flushBufferAtTrackSwitch: false,
 *                reuseExistingSourceBuffers: true,
 *                bufferPruningInterval: 10,
 *                bufferToKeep: 20,
 *                bufferTimeAtTopQuality: 30,
 *                bufferTimeAtTopQualityLongForm: 60,
 *                initialBufferLevel: NaN,
 *                bufferTimeDefault: 18,
 *                longFormContentDurationThreshold: 600,
 *                stallThreshold: 0.3,
 *                lowLatencyStallThreshold: 0.3,
 *                useAppendWindow: true,
 *                setStallState: true,
 *                avoidCurrentTimeRangePruning: false,
 *                useChangeType: true,
 *                mediaSourceDurationInfinity: true,
 *                resetSourceBuffersForTrackSwitch: false,
 *                syntheticStallEvents: {
 *                    enabled: false,
 *                    ignoreReadyState: false
 *                }
 *            },
 *            gaps: {
 *                jumpGaps: true,
 *                jumpLargeGaps: true,
 *                smallGapLimit: 1.5,
 *                threshold: 0.3,
 *                enableSeekFix: true,
 *                enableStallFix: false,
 *                stallSeek: 0.1,
 *                seekOffset: 0
 *            },
 *            utcSynchronization: {
 *                enabled: true,
 *                useManifestDateHeaderTimeSource: true,
 *                backgroundAttempts: 2,
 *                timeBetweenSyncAttempts: 30,
 *                maximumTimeBetweenSyncAttempts: 600,
 *                minimumTimeBetweenSyncAttempts: 2,
 *                timeBetweenSyncAttemptsAdjustmentFactor: 2,
 *                maximumAllowedDrift: 100,
 *                enableBackgroundSyncAfterSegmentDownloadError: true,
 *                defaultTimingSource: {
 *                    scheme: 'urn:mpeg:dash:utc:http-xsdate:2014',
 *                    value: 'http://time.akamai.com/?iso&ms'
 *                },
 *                artificialTimeOffsetToApply: 0
 *            },
 *            scheduling: {
 *                defaultTimeout: 500,
 *                lowLatencyTimeout: 0,
 *                scheduleWhilePaused: true
 *            },
 *            text: {
 *                defaultEnabled: true,
 *                dispatchForManualRendering: false,
 *                extendSegmentedCues: true,
 *                imsc: {
 *                    displayForcedOnlyMode: false,
 *                    enableRollUp: true
 *                },
 *                webvtt: {
 *                    customRenderingEnabled: false
 *                }
 *            },
 *            liveCatchup: {
 *                maxDrift: NaN,
 *                playbackRate: {min: NaN, max: NaN},
 *                step: {
 *                  start: { min: NaN, max: NaN },
 *                  stop: { min: NaN, max: NaN }
 *                },
 *                liveThreshold: -1,
 *                playbackBufferMin: 0.5,
 *                enabled: null,
 *                mode: Constants.LIVE_CATCHUP_MODE_DEFAULT
 *            },
 *            lastBitrateCachingInfo: { enabled: true, ttl: 360000 },
 *            lastMediaSettingsCachingInfo: { enabled: true, ttl: 360000 },
 *            saveLastMediaSettingsForCurrentStreamingSession: true,
 *            cacheLoadThresholds: { video: 10, audio: 5 },
 *            trackSwitchMode: {
 *                audio: Constants.TRACK_SWITCH_MODE_ALWAYS_REPLACE,
 *                video: Constants.TRACK_SWITCH_MODE_NEVER_REPLACE
 *            },
 *            includePreselectionsInMediainfoArray: true,
 *            includePreselectionsForInitialTrackSelection: false,
 *            ignoreSelectionPriority: false,
 *            prioritizeRoleMain: true,
 *            assumeDefaultRoleAsMain: true,
 *            selectionModeForInitialTrack: Constants.TRACK_SELECTION_MODE_LOWEST_STARTUP_DELAY,
 *            blacklistExpiryTime: -1,
 *            fragmentRequestTimeout: 20000,
 *            fragmentRequestProgressTimeout: -1,
 *            manifestRequestTimeout: 10000,
 *            retryIntervals: {
 *                [HTTPRequest.MPD_TYPE]: 500,
 *                [HTTPRequest.XLINK_EXPANSION_TYPE]: 500,
 *                [HTTPRequest.MEDIA_SEGMENT_TYPE]: 1000,
 *                [HTTPRequest.INIT_SEGMENT_TYPE]: 1000,
 *                [HTTPRequest.BITSTREAM_SWITCHING_SEGMENT_TYPE]: 1000,
 *                [HTTPRequest.INDEX_SEGMENT_TYPE]: 1000,
 *                [HTTPRequest.MSS_FRAGMENT_INFO_SEGMENT_TYPE]: 1000,
 *                [HTTPRequest.LICENSE]: 1000,
 *                [HTTPRequest.LICENSE_CERTIFICATE]: 1000,
 *                [HTTPRequest.OTHER_TYPE]: 1000,
 *                lowLatencyReductionFactor: 10
 *            },
 *            retryAttempts: {
 *                [HTTPRequest.MPD_TYPE]: 3,
 *                [HTTPRequest.XLINK_EXPANSION_TYPE]: 1,
 *                [HTTPRequest.MEDIA_SEGMENT_TYPE]: 3,
 *                [HTTPRequest.INIT_SEGMENT_TYPE]: 3,
 *                [HTTPRequest.BITSTREAM_SWITCHING_SEGMENT_TYPE]: 3,
 *                [HTTPRequest.INDEX_SEGMENT_TYPE]: 3,
 *                [HTTPRequest.MSS_FRAGMENT_INFO_SEGMENT_TYPE]: 3,
 *                [HTTPRequest.LICENSE]: 3,
 *                [HTTPRequest.LICENSE_CERTIFICATE]: 3,
 *                [HTTPRequest.OTHER_TYPE]: 3,
 *                lowLatencyMultiplyFactor: 5
 *            },
 *             abr: {
 *                 limitBitrateByPortal: false,
 *                 usePixelRatioInLimitBitrateByPortal: false,
 *                rules: {
 *                     throughputRule: {
 *                         active: true
 *                     },
 *                     bolaRule: {
 *                         active: true
 *                     },
 *                     insufficientBufferRule: {
 *                         active: true,
 *                         parameters: {
 *                             throughputSafetyFactor: 0.7,
 *                             segmentIgnoreCount: 2
 *                         }
 *                     },
 *                     switchHistoryRule: {
 *                         active: true,
 *                         parameters: {
 *                             sampleSize: 8,
 *                             switchPercentageThreshold: 0.075
 *                         }
 *                     },
 *                     droppedFramesRule: {
 *                         active: true,
 *                         parameters: {
 *                             minimumSampleSize: 375,
 *                             droppedFramesPercentageThreshold: 0.15
 *                         }
 *                     },
 *                     abandonRequestsRule: {
 *                         active: true,
 *                         parameters: {
 *                             abandonDurationMultiplier: 1.8,
 *                             minSegmentDownloadTimeThresholdInMs: 500,
 *                             minThroughputSamplesThreshold: 6
 *                         }
 *                     },
 *                     l2ARule: {
 *                         active: false
 *                     },
 *                     loLPRule: {
 *                         active: false
 *                     }
 *                 },
 *                 throughput: {
 *                     averageCalculationMode: Constants.THROUGHPUT_CALCULATION_MODES.EWMA,
 *                     lowLatencyDownloadTimeCalculationMode: Constants.LOW_LATENCY_DOWNLOAD_TIME_CALCULATION_MODE.MOOF_PARSING,
 *                     useResourceTimingApi: true,
 *                     useNetworkInformationApi: {
 *                         xhr: false,
 *                         fetch: false
 *                     },
 *                     useDeadTimeLatency: true,
 *                     bandwidthSafetyFactor: 0.9,
 *                     sampleSettings: {
 *                         live: 3,
 *                         vod: 4,
 *                         enableSampleSizeAdjustment: true,
 *                         decreaseScale: 0.7,
 *                         increaseScale: 1.3,
 *                         maxMeasurementsToKeep: 20,
 *                         averageLatencySampleAmount: 4,
 *                     },
 *                     ewma: {
 *                         throughputSlowHalfLifeSeconds: 8,
 *                         throughputFastHalfLifeSeconds: 3,
 *                         latencySlowHalfLifeCount: 2,
 *                         latencyFastHalfLifeCount: 1,
 *                         weightDownloadTimeMultiplicationFactor: 0.0015
 *                     }
 *                 },
 *                 maxBitrate: {
 *                     audio: -1,
 *                     video: -1
 *                 },
 *                 minBitrate: {
 *                     audio: -1,
 *                     video: -1
 *                 },
 *                 initialBitrate: {
 *                     audio: -1,
 *                     video: -1
 *                 },
 *                 autoSwitchBitrate: {
 *                     audio: true,
 *                     video: true
 *                 }
 *             },
 *            cmcd: {
 *                applyParametersFromMpd: true,
 *                enabled: false,
 *                sid: null,
 *                cid: null,
 *                rtp: null,
 *                rtpSafetyFactor: 5,
 *                mode: Constants.CMCD_MODE_QUERY,
 *                enabledKeys: ['br', 'd', 'ot', 'tb' , 'bl', 'dl', 'mtp', 'nor', 'nrr', 'su' , 'bs', 'rtp' , 'cid', 'pr', 'sf', 'sid', 'st', 'v']
 *                includeInRequests: ['segment', 'mpd'],
 *                version: 1,
 *                eventTargets: []
 *            },
 *            cmsd: {
 *                enabled: false,
 *                abr: {
 *                    applyMb: false,
 *                    etpWeightRatio: 0
 *                }
 *            },
 *            enhancement: {
 *                enabled: false,
 *                codecs: ['lvc1']
 *            },
 *            defaultSchemeIdUri: {
 *                viewpoint: '',
 *                audioChannelConfiguration: 'urn:mpeg:mpegB:cicp:ChannelConfiguration',
 *                role: 'urn:mpeg:dash:role:2011',
 *                accessibility: 'urn:mpeg:dash:role:2011'
 *            },
 *            dvbReporting: {
 *                reportingUrl: null,
 *            },
 *          },
 *          errors: {
 *            recoverAttempts: {
 *                mediaErrorDecode: 5
 *             }
 *          }
 * }
 */

/**
 * @typedef {Object} TimeShiftBuffer
 * @property {boolean} [calcFromSegmentTimeline=false]
 * Enable calculation of the DVR window for SegmentTimeline manifests based on the entries in \<SegmentTimeline\>.
 * @property {boolean} [fallbackToSegmentTimeline=true]
 * In case the MPD uses \<SegmentTimeline\ and no segment is found within the DVR window the DVR window is calculated based on the entries in \<SegmentTimeline\>.
 */

/**
 * @typedef {Object} EventSettings
 * @property {number} [eventControllerRefreshDelay=100]
 * Interval timer used by the EventController to check if events need to be triggered or removed.
 * @property {number} [deleteEventMessageDataTimeout=10000]
 * If this value is larger than -1 the EventController will delete the message data attributes of events after they have been started and dispatched to the application.
 * This is to save memory in case events have a long duration and need to be persisted in the EventController.
 * This parameter defines the time in milliseconds between the start of an event and when the message data is deleted.
 * If an event is dispatched for the second time (e.g. when the user seeks back) the message data will not be included in the dispatched event if it has been deleted already.
 * Set this value to -1 to not delete any message data.
 */

/**
 * @typedef {Object} LiveDelay
 * @property {number} [liveDelayFragmentCount=NaN]
 * Changing this value will lower or increase live stream latency.
 *
 * The detected segment duration will be multiplied by this value to define a time in seconds to delay a live stream from the live edge.
 *
 * Lowering this value will lower latency but may decrease the player's ability to build a stable buffer.
 * @property {number} [liveDelay=NaN]
 * Equivalent in seconds of setLiveDelayFragmentCount.
 *
 * Lowering this value will lower latency but may decrease the player's ability to build a stable buffer.
 *
 * This value should be less than the manifest duration by a couple of segment durations to avoid playback issues.
 *
 * If set, this parameter will take precedence over setLiveDelayFragmentCount and manifest info.
 * @property {boolean} [useSuggestedPresentationDelay=true]
 * Set to true if you would like to overwrite the default live delay and honor the SuggestedPresentationDelay attribute in by the manifest.
 */

/**
 * @typedef {Object} Buffer
 * @property {boolean} [enableSeekDecorrelationFix=false]
 * Enables a workaround for playback start on some devices, e.g. WebOS 4.9.
 * It is necessary because some browsers do not support setting currentTime on video element to a value that is outside of current buffer.
 *
 * If you experience unexpected seeking triggered by BufferController, you can try setting this value to false.

 * @property {boolean} [fastSwitchEnabled=null]
 * When enabled, after an ABR up-switch in quality, instead of requesting and appending the next fragment at the end of the current buffer range it is requested and appended closer to the current time.
 *
 * When enabled, The maximum time to render a higher quality is current time + (1.5 * fragment duration).
 *
 * If this value is set to null we will automatically enable fast switches for non low-latency playback
 *
 * Note, When ABR down-switch is detected, we appended the lower quality at the end of the buffer range to preserve the
 * higher quality media for as long as possible.
 *
 * If enabled, it should be noted there are a few cases when the client will not replace inside buffer range but rather just append at the end.
 * 1. When the buffer level is less than one fragment duration.
 * 2. The client is in an Abandonment State due to recent fragment abandonment event.
 *
 * Known issues:
 * 1. In IE11 with auto switching off, if a user switches to a quality they can not download in time the fragment may be appended in the same range as the playhead or even in the past, in IE11 it may cause a stutter or stall in playback.
 * @property {boolean} [flushBufferAtTrackSwitch=false]
 * When enabled, after a track switch and in case buffer is being replaced, the video element is flushed (seek at current playback time) once a segment of the new track is appended in buffer in order to force video decoder to play new track.
 *
 * This can be required on some devices like GoogleCast devices to make track switching functional.
 *
 * Otherwise, track switching will be effective only once after previous buffered track is fully consumed.
 * @property {boolean} [reuseExistingSourceBuffers=true]
 * Enable reuse of existing MediaSource Sourcebuffers during period transition.
 * @property {number} [bufferPruningInterval=10]
 * The interval of pruning buffer in seconds.
 * @property {number} [bufferToKeep=20]
 * This value influences the buffer pruning logic.
 *
 * Allows you to modify the buffer that is kept in source buffer in seconds.
 * 0|-----------bufferToPrune-----------|-----bufferToKeep-----|currentTime|
 * @property {number} [bufferTimeDefault=18]
 * The time that the internal buffer target will be set to when not playing at the top quality.
 * @property {number} [bufferTimeAtTopQuality=30]
 * The time that the internal buffer target will be set to once playing the top quality.
 *
 * If there are multiple bitrates in your adaptation, and the media is playing at the highest bitrate, then we try to build a larger buffer at the top quality to increase stability and to maintain media quality.
 * @property {number} [bufferTimeAtTopQualityLongForm=60]
 * The time that the internal buffer target will be set to once playing the top quality for long form content.
 * @property {number} [longFormContentDurationThreshold=600]
 * The threshold which defines if the media is considered long form content.
 *
 * This will directly affect the buffer targets when playing back at the top quality.
 * @property {number} [initialBufferLevel=NaN]
 * Initial buffer level before playback starts
 * @property {number} [stallThreshold=0.3]
 * Stall threshold used in BufferController.js to determine whether a track should still be changed and which buffer range to prune.
 * @property {number} [lowLatencyStallThreshold=0.3]
 * Low Latency stall threshold used in BufferController.js to determine whether a track should still be changed and which buffer range to prune.
 * @property {boolean} [useAppendWindow=true]
 * Specifies if the appendWindow attributes of the MSE SourceBuffers should be set according to content duration from manifest.
 * @property {boolean} [setStallState=true]
 * Specifies if we fire manual waiting events once the stall threshold is reached.
 * @property {module:Settings~SyntheticStallSettings} [syntheticStallEvents]
 * Specifies if manual stall events are to be fired once the stall threshold is reached.
 * @property {boolean} [avoidCurrentTimeRangePruning=false]
 * Avoids pruning of the buffered range that contains the current playback time.
 *
 * That buffered range is likely to have been enqueued for playback. Pruning it causes a flush and reenqueue in WPE and WebKitGTK based browsers. This stresses the video decoder and can cause stuttering on embedded platforms.
 * @property {boolean} [useChangeType=true]
 * If this flag is set to true then dash.js will use the MSE v.2 API call "changeType()" before switching to a different codec family.
 * Note that some platforms might not implement the changeType function. dash.js is checking for the availability before trying to call it.
 * @property {boolean} [mediaSourceDurationInfinity=true]
 * If this flag is set to true then dash.js will allow `Infinity` to be set as the MediaSource duration otherwise the duration will be set to `Math.pow(2,32)` instead of `Infinity` to allow appending segments indefinitely.
 * Some platforms such as WebOS 4.x have issues with seeking when duration is set to `Infinity`, setting this flag to false resolve this.
 * @property {boolean} [resetSourceBuffersForTrackSwitch=false]
 * When switching to a track that is not compatible with the currently active MSE SourceBuffers, MSE will be reset. This happens when we switch codecs on a system
 * that does not properly implement "changeType()", such as webOS 4.0 and before.
 */

/**
 * @typedef {Object} module:Settings~AudioVideoSettings
 * @property {number|boolean|string} [audio]
 * Configuration for audio media type of tracks.
 * @property {number|boolean|string} [video]
 * Configuration for video media type of tracks.
 */

/**
 * @typedef {Object} module:Settings~SyntheticStallSettings
 * @property {boolean} [enabled]
 * Enables manual stall events and sets the playback rate to 0 once the stall threshold is reached.
 * @property {boolean} [ignoreReadyState]
 * Ignore the media element's ready state when entering or exiting a stall.
 * Enable this when either of these scenarios still occur with synthetic stalls enabled:
 * - If the buffer is empty, but playback is not stalled.
 * - If playback resumes, but a playing event isn't reported.
 */

/**
 * @typedef {Object} DebugSettings
 * @property {number} [logLevel=dashjs.Debug.LOG_LEVEL_WARNING]
 * Sets up the log level. The levels are cumulative.
 *
 * For example, if you set the log level to dashjs.Debug.LOG_LEVEL_WARNING all warnings, errors and fatals will be logged.
 *
 * Possible values.
 *
 * - dashjs.Debug.LOG_LEVEL_NONE
 * No message is written in the browser console.
 *
 * - dashjs.Debug.LOG_LEVEL_FATAL
 * Log fatal errors.
 * An error is considered fatal when it causes playback to fail completely.
 *
 * - dashjs.Debug.LOG_LEVEL_ERROR
 * Log error messages.
 *
 * - dashjs.Debug.LOG_LEVEL_WARNING
 * Log warning messages.
 *
 * - dashjs.Debug.LOG_LEVEL_INFO
 * Log info messages.
 *
 * - dashjs.Debug.LOG_LEVEL_DEBUG
 * Log debug messages.
 * @property {boolean} [dispatchEvent=false]
 * Enable to trigger a Events.LOG event whenever log output is generated.
 *
 * Note this will be dispatched regardless of log level.
 */

/**
 * @typedef {Object} module:Settings~ErrorSettings
 * @property {object} [recoverAttempts={mediaErrorDecode: 5}]
 * Defines the maximum number of recover attempts for specific media errors.
 *
 * For mediaErrorDecode the player will reset the MSE and skip the blacklisted segment that caused the decode error. The resulting gap will be handled by the GapController.
 */

/**
 * @typedef {Object} CachingInfoSettings
 * @property {boolean} [enable]
 * Enable or disable the caching feature.
 * @property {number} [ttl]
 * Time to live.
 *
 * A value defined in milliseconds representing how log to cache the settings for.
 */

/**
 * @typedef {Object} Gaps
 * @property {boolean} [jumpGaps=true]
 * Sets whether player should jump small gaps (discontinuities) in the buffer.
 * @property {boolean} [jumpLargeGaps=true]
 * Sets whether player should jump large gaps (discontinuities) in the buffer.
 * @property {number} [smallGapLimit=1.5]
 * Time in seconds for a gap to be considered small.
 * @property {number} [threshold=0.3]
 * Threshold at which the gap handling is executed. If currentRangeEnd - currentTime < threshold the gap jump will be triggered.
 * For live stream the jump might be delayed to keep a consistent live edge.
 * Note that the amount of buffer at which platforms automatically stall might differ.
 * @property {boolean} [enableSeekFix=true]
 * Enables the adjustment of the seek target once no valid segment request could be generated for a specific seek time. This can happen if the user seeks to a position for which there is a gap in the timeline.
 * @property {boolean} [enableStallFix=false]
 * If playback stalled in a buffered range this fix will perform a seek by the value defined in stallSeek to trigger playback again.
 * @property {number} [stallSeek=0.1]
 * Value to be used in case enableStallFix is set to true
 * @property {number} [seekOffset=0]
 * An additional offset in seconds that is applied when performing a seek to jump a gap.
 * @property {number} [checkInterval=250]
 * The interval in milliseconds at which the gap handler checks for gaps in the buffer. Lower values detect gaps faster but increase CPU usage. Default is 250ms.
 */

/**
 * @typedef {Object} UtcSynchronizationSettings
 * @property {boolean} [enabled=true]
 * Enables or disables the UTC clock synchronization
 * @property {boolean} [useManifestDateHeaderTimeSource=true]
 * Allows you to enable the use of the Date Header, if exposed with CORS, as a timing source for live edge detection.
 *
 * The use of the date header will happen only after the other timing source that take precedence fail or are omitted as described.
 * @property {number} [backgroundAttempts=2]
 * Number of synchronization attempts to perform in the background after an initial synchronization request has been done. This is used to verify that the derived client-server offset is correct.
 *
 * The background requests are async and done in parallel to the start of the playback.
 *
 * This value is also used to perform a resync after 404 errors on segments.
 * @property {number} [timeBetweenSyncAttempts=30]
 * The time in seconds between two consecutive sync attempts.
 *
 * Note: This value is used as an initial starting value. The internal value of the TimeSyncController is adjusted during playback based on the drift between two consecutive synchronization attempts.
 *
 * Note: A sync is only performed after an MPD update. In case the @minimumUpdatePeriod is larger than this value the sync will be delayed until the next MPD update.
 * @property {number} [maximumTimeBetweenSyncAttempts=600]
 * The maximum time in seconds between two consecutive sync attempts.
 *
 * @property {number} [minimumTimeBetweenSyncAttempts=2]
 * The minimum time in seconds between two consecutive sync attempts.
 *
 * @property {number} [timeBetweenSyncAttemptsAdjustmentFactor=2]
 * The factor used to multiply or divide the timeBetweenSyncAttempts parameter after a sync. The maximumAllowedDrift defines whether this value is used as a factor or a dividend.
 *
 * @property {number} [maximumAllowedDrift=100]
 * The maximum allowed drift specified in milliseconds between two consecutive synchronization attempts.
 *
 * @property {boolean} [enableBackgroundSyncAfterSegmentDownloadError=true]
 * Enables or disables the background sync after the player ran into a segment download error.
 *
 * @property {object} [defaultTimingSource={scheme:'urn:mpeg:dash:utc:http-xsdate:2014',value: 'http://time.akamai.com/?iso&ms'}]
 * The default timing source to be used. The timing sources in the MPD take precedence over this one.
 *
 * @property {number} [artificialTimeOffsetToApply=0]
 * The offset defined in milliseconds that is applied on top of the offset that was derived after the time synchronization.
 *
 * /

/**
 * @typedef {Object} Scheduling
 * @property {number} [defaultTimeout=500]
 * Default timeout between two consecutive segment scheduling attempts
 * @property {number} [lowLatencyTimeout=0]
 * Default timeout between two consecutive low-latency segment scheduling attempts
 * @property {boolean} [scheduleWhilePaused=true]
 * Set to true if you would like dash.js to keep downloading fragments in the background when the video element is paused.
 */

/**
 * @typedef {Object} Text
 * @property {boolean} [defaultEnabled=true]
 * Enable/disable subtitle rendering by default.
 * @property {boolean} [dispatchForManualRendering=false]
 * Enable/disable firing of CueEnter/CueExt events. This will disable the display of subtitles and should be used when you want to have full control about rendering them.
 * @property {boolean} [extendSegmentedCues=true]
 * Enable/disable patching of segmented cues in order to merge as a single cue by extending cue end time.
 * @property {boolean} [imsc.displayForcedOnlyMode=false]
 * Enable/disable forced only mode in IMSC captions.
 * When true, only those captions where itts:forcedDisplay="true" will be displayed.
 * @property {boolean} [imsc.enableRollUp=true]
 * Enable/disable rollUp style display of IMSC captions.
 * @property {object} [webvtt.customRenderingEnabled=false]
 * Enables the custom rendering for WebVTT captions. For details refer to the "Subtitles and Captions" sample section of dash.js.
 * Custom WebVTT rendering requires the external library vtt.js that can be found in the contrib folder.
 */

/**
 * @typedef {Object} LiveCatchupSettings
 * @property {number} [maxDrift=NaN]
 * Use this method to set the maximum latency deviation allowed before dash.js to do a seeking to live position.
 *
 * In low latency mode, when the difference between the measured latency and the target one, as an absolute number, is higher than the one sets with this method, then dash.js does a seek to live edge position minus the target live delay.
 *
 * LowLatencyMaxDriftBeforeSeeking should be provided in seconds.
 *
 * If a value less than zero is set (-1), then seeking operations won't be used for fixing latency deviations.
 *
 * Note: Catch-up mechanism is only applied when playing low latency live streams.
 * @property {number} [step={start:{min: NaN, max: NaN},stop:{min: NaN, max: NaN}}]
 * This object is used for setting the window parameters for "step" mode.
 *
 * It is only applicable if the Catchup mechanism used is of mode "step".
 *
 * The parameters are all percentages of the target latency. Where 1 is on target.
 *
 * The start object sets the window within which catchup should begin. In the range of (0-2) (0% to 200% of the target latency).
 *
 * The stop window is only applicable if a non-unity playback speed is in use. Again in the range of (0-2) (0% to 200% of the target latency). It sets the point at which playback should return to unity (or stop catching up). This parameter prevents instability when using higher min and max playback rates and should be tuned to prevent overshooting the target.
 *
 * Note: Catch-up mechanism is only applied when playing low latency live streams.
 * @property {number} [playbackRate={min: NaN, max: NaN}]
 * Use this parameter to set the minimum and maximum catch up rates, as percentages, for low latency live streams.
 *
 * In low latency mode, when measured latency is higher/lower than the target one, dash.js increases/decreases playback rate respectively up to (+/-) the percentage defined with this method until target is reached.
 *
 * Valid values for min catch up rate are in the range -0.5 to 0 (-50% to 0% playback rate decrease)
 *
 * Valid values for max catch up rate are in the range 0 to 1 (0% to 100% playback rate increase).
 *
 * Set min and max to NaN to turn off live catch up feature.
 *
 * These playback rate limits take precedence over any PlaybackRate values in ServiceDescription elements in an MPD. If only one of the min/max properties is given a value, the property without a value will not fall back to a ServiceDescription value. Its default value of NaN will be used.
 *
 * Note: Catch-up mechanism is only applied when playing low latency live streams.
 * @property {number} [playbackBufferMin=0.5]
 * Use this parameter to specify the minimum buffer which is used for LoL+ based playback rate reduction.
 *
 * @property {boolean} [liveThreshold=-1]
 * Accelerated playback is reset to 1.0 (no speed-up) once the latency difference (currentLatency - initiallyDefinedTargetLatency) is above the configured liveThreshold value. liveThreshold is disabled by setting the value to -1
 *
 * @property {boolean} [enabled=null]
 * Use this parameter to enable the catchup mode for non low-latency streams.
 *
 * @property {string} [mode="liveCatchupModeDefault"]
 * Use this parameter to switch between different catchup modes.
 *
 * Options: One of "liveCatchupModeDefault", "liveCatchupModeLOLP" or "liveCatchupModeStep".
 *
 * Note: Catch-up mechanism is automatically applied when playing low latency live streams.
 */

/**
 * @typedef {Object} RequestTypeSettings
 * @property {number} [MPD]
 * Manifest type of requests.
 * @property {number} [XLinkExpansion]
 * XLink expansion type of requests.
 * @property {number} [InitializationSegment]
 * Request to retrieve an initialization segment.
 * @property {number} [IndexSegment]
 * Request to retrieve an index segment (SegmentBase).
 * @property {number} [MediaSegment]
 * Request to retrieve a media segment (video/audio/image/text chunk).
 * @property {number} [BitstreamSwitchingSegment]
 * Bitrate stream switching type of request.
 * @property {number} [FragmentInfoSegment]
 * Request to retrieve a FragmentInfo segment (specific to Smooth Streaming live streams).
 * @property {number} [other]
 * Other type of request.
 * @property {number} [lowLatencyReductionFactor]
 * For low latency mode, values of type of request are divided by lowLatencyReductionFactor.
 *
 * Note: It's not type of request.
 * @property {number} [lowLatencyMultiplyFactor]
 * For low latency mode, values of type of request are multiplied by lowLatencyMultiplyFactor.
 *
 * Note: It's not type of request.
 */

/**
 * @typedef {Object} Protection
 * @property {boolean} [keepProtectionMediaKeys=false]
 * Set the value for the ProtectionController and MediaKeys life cycle.
 * If true, the ProtectionController and then created MediaKeys and MediaKeySessions will be preserved during the MediaPlayer lifetime.
 *
 * @property {number} [keepProtectionMediaKeysMaximumOpenSessions=-1]
 * Maximum number of open MediaKeySessions, when keepProtectionMediaKeys is enabled. If set, dash.js will close the oldest sessions when the limit is exceeded. -1 means unlimited.
 *
 * @property {boolean} [ignoreEmeEncryptedEvent=false]
 * If set to true the player will ignore "encrypted" and "needkey" events thrown by the EME.
 *
 * @property {boolean} [detectPlayreadyMessageFormat=true]
 * If set to true the player will use the raw unwrapped message from the Playready CDM
 *
 * @property {boolean} [ignoreKeyStatuses=false]
 * If set to true the player will ignore the status of a key and try to play the corresponding track regardless whether the key is usable or not.
 *

/**
 * @typedef {Object} Capabilities
 * @property {boolean} [filterUnsupportedEssentialProperties=true]
 * Enable to filter all the AdaptationSets and Representations which contain an unsupported \<EssentialProperty\> element.
 * @property {Array.<string>} [supportedEssentialProperties]
 * List of supported \<EssentialProperty\> elements
 * @property {boolean} [useMediaCapabilitiesApi=true]
 * Enable to use the MediaCapabilities API to check whether codecs are supported. If disabled MSE.isTypeSupported will be used instead.
 * @property {boolean} [filterVideoColorimetryEssentialProperties=true]
 * Enable dash.js to query MediaCapabilities API for signalled Colorimetry EssentialProperties (per schemeIdUris: 'urn:mpeg:mpegB:cicp:ColourPrimaries', 'urn:mpeg:mpegB:cicp:TransferCharacteristics').
 * If disabled, registered properties per supportedEssentialProperties will be allowed without any further checking (including 'urn:mpeg:mpegB:cicp:MatrixCoefficients').
 * @property {boolean} [filterHDRMetadataFormatEssentialProperties=true]
 * Enable dash.js to query MediaCapabilities API for signalled HDR-MetadataFormat EssentialProperty (per schemeIdUri:'urn:dvb:dash:hdr-dmi').
 * @property {boolean} [filterAudioChannelConfiguration=false]
 * Enable dash.js to query MediaCapabilities API for signalled AudioChannelConfiguration.
 */

/**
 * @typedef {Object} AbrSettings
 * @property {boolean} [limitBitrateByPortal=false]
 * If true, the size of the video portal will limit the max chosen video resolution.
 * @property {boolean} [usePixelRatioInLimitBitrateByPortal=false]
 * Sets whether to take into account the device's pixel ratio when defining the portal dimensions.
 * @property {number} [limitBitrateByPortalMinimum=0]
 * Sets a minimum bitrate in kbps for limitBitrateByPortal. Representations at this bitrate or below it will not be limited by the portal size. Useful if the player can be resized.
 *
 * Useful on, for example, retina displays.
 * @property {module:Settings~AbrRules} [rules]
 * Enable/Disable individual ABR rules. Note that if the throughputRule and the bolaRule are activated at the same time we switch to a dynamic mode.
 * In the dynamic mode either ThroughputRule or BolaRule are active but not both at the same time.
 *
 * l2ARule and loLPRule are ABR rules that are designed for low latency streams. They are tested as standalone rules meaning the other rules should be deactivated when choosing these rules.
 * @property {module:Settings~ThroughputSettings} [throughput]
 * Settings related to throughput calculation
 * @property {module:Settings~AudioVideoSettings} [maxBitrate={audio: -1, video: -1}]
 * The maximum bitrate that the ABR algorithms will choose. This value is specified in kbps.
 *
 * Use -1 for no limit.
 * @property {module:Settings~AudioVideoSettings} [minBitrate={audio: -1, video: -1}]
 * The minimum bitrate that the ABR algorithms will choose. This value is specified in kbps.
 *
 * Use -1 for no limit.
 * @property {module:Settings~AudioVideoSettings} [initialBitrate={audio: -1, video: -1}]
 * Explicitly set the starting bitrate for audio or video. This value is specified in kbps.
 *
 * Use -1 to let the player decide.
 * @property {module:Settings~AudioVideoSettings} [autoSwitchBitrate={audio: true, video: true}]
 * Indicates whether the player should enable ABR algorithms to switch the bitrate.
 */

/**
 * @typedef {Object} AbrRules
 * @property {module:Settings~ThroughputRule} [throughputRule]
 * Configuration of the Throughput rule
 * @property {module:Settings~BolaRule} [bolaRule]
 * Configuration of the BOLA rule
 * @property {module:Settings~InsufficientBufferRule} [insufficientBufferRule]
 * Configuration of the Insufficient Buffer rule
 * @property {module:Settings~SwitchHistoryRule} [switchHistoryRule]
 * Configuration of the Switch History rule
 * @property {module:Settings~DroppedFramesRule} [droppedFramesRule]
 * Configuration of the Dropped Frames rule
 * @property {module:Settings~AbandonRequestsRule} [abandonRequestsRule]
 * Configuration of the Abandon Requests rule
 * @property {module:Settings~L2ARule} [l2ARule]
 * Configuration of the L2A rule
 * @property {module:Settings~LoLPRule} [loLPRule]
 * Configuration of the LoLP rule
 */

/**
 * @typedef {Object} ThroughputRule
 * @property {boolean} [active=true]
 * Enable or disable the rule
 */

/**
 * @typedef {Object} BolaRule
 * @property {boolean} [active=true]
 * Enable or disable the rule
 */

/**
 * @typedef {Object} InsufficientBufferRule
 * @property {boolean} [active=true]
 * Enable or disable the rule
 * @property {object} [parameters={throughputSafetyFactor=0.7, segmentIgnoreCount=2}]
 * Configures the rule specific parameters.
 *
 * - `throughputSafetyFactor`: The safety factor that is applied to the derived throughput, see example in the Description.
 * - `segmentIgnoreCount`: This rule is not taken into account until the first segmentIgnoreCount media segments have been appended to the buffer.
 */

/**
 * @typedef {Object} SwitchHistoryRule
 * @property {boolean} [active=true]
 * Enable or disable the rule
 * @property {object} [parameters={sampleSize=8, switchPercentageThreshold=0.075}]
 * Configures the rule specific parameters.
 *
 * - `sampleSize`: Number of switch requests ("no switch", because of the selected Representation is already playing or "actual switches") required before the rule is applied
 * - `switchPercentageThreshold`: Ratio of actual quality drops compared to no drops before a quality down-switch is triggered
 */

/**
 * @typedef {Object} DroppedFramesRule
 * @property {boolean} [active=true]
 * Enable or disable the rule
 * @property {object} [parameters={minimumSampleSize=375, droppedFramesPercentageThreshold=0.15}]
 * Configures the rule specific parameters.
 *
 * - `minimumSampleSize`: Sum of rendered and dropped frames required for each Representation before the rule kicks in.
 * - `droppedFramesPercentageThreshold`: Minimum percentage of dropped frames to trigger a quality down switch. Values are defined in the range of 0 - 1.
 */

/**
 * @typedef {Object} AbandonRequestsRule
 * @property {boolean} [active=true]
 * Enable or disable the rule
 * @property {object} [parameters={abandonDurationMultiplier=1.8, minSegmentDownloadTimeThresholdInMs=500, minThroughputSamplesThreshold=6}]
 * Configures the rule specific parameters.
 *
 * - `abandonDurationMultiplier`: Factor to multiply with the segment duration to compare against the estimated remaining download time of the current segment. See code example above.
 * - `minSegmentDownloadTimeThresholdInMs`: The AbandonRequestRule only kicks if the download time of the current segment exceeds this value.
 * - `minThroughputSamplesThreshold`: Minimum throughput samples (equivalent to number of progress events) required before the AbandonRequestRule kicks in.
 */

/**
 * @typedef {Object} L2ARule
 * @property {boolean} [active=true]
 * Enable or disable the rule
 */

/**
 * @typedef {Object} LoLPRule
 * @property {boolean} [active=true]
 * Enable or disable the rule
 */

/**
 * @typedef {Object} ThroughputSettings
 * @property {string} [averageCalculationMode=Constants.THROUGHPUT_CALCULATION_MODES.EWMA]
 * Defines the default mode for calculating the throughput based on the samples collected during playback.
 *
 * For arithmetic and harmonic mean calculations we use a sliding window with the values defined in "sampleSettings"
 *
 * For exponential weighted moving average calculation the default values can be changed in "ewma"
 * @property {string} [lowLatencyDownloadTimeCalculationMode=Constants.LOW_LATENCY_DOWNLOAD_TIME_CALCULATION_MODE.MOOF_PARSING]
 * Defines the effective download time estimation method we use for low latency streams that utilize the Fetch API and chunked transfer coding
 * @property {boolean} [useResourceTimingApi=true]
 * If set to true the ResourceTimingApi is used to derive the download time and the number of downloaded bytes.
 * This option has no effect for low latency streaming as the download time equals the segment duration in most of the cases and therefor does not provide reliable values
 * @property {object} [useNetworkInformationApi = { xhr=false, fetch=false}]
 * If set to true the NetworkInformationApi is used to derive the current throughput. Browser support is limited, only available in Chrome and Edge.
 * Applies to standard (XHR requests) and/or low latency streaming (Fetch API requests).
 * @property {boolean} [useDeadTimeLatency=true]
 * If true, only the download portion will be considered part of the download bitrate and latency will be regarded as static.
 *
 * If false, the reciprocal of the whole transfer time will be used.
 * @property {number} [bandwidthSafetyFactor=0.9]
 * Standard ABR throughput rules multiply the throughput by this value.
 *
 * It should be between 0 and 1, with lower values giving less rebuffering (but also lower quality)
 * @property {object} [sampleSettings = {live=3,vod=4,enableSampleSizeAdjustment=true,decreaseScale=0.7,increaseScale=1.3,maxMeasurementsToKeep=20,averageLatencySampleAmount=4}]
 * When deriving the throughput based on the arithmetic or harmonic mean these settings define:
 * - `live`: Number of throughput samples to use (sample size) for live streams
 * - `vod`: Number of throughput samples to use (sample size) for VoD streams
 * - `enableSampleSizeAdjustment`: Adjust the sample sizes if throughput samples vary a lot
 * - `decreaseScale`: Increase sample size by one if the ratio of current and previous sample is below or equal this value
 * - `increaseScale`: Increase sample size by one if the ratio of current and previous sample is higher or equal this value
 * - `maxMeasurementsToKeep`: Number of samples to keep before sliding samples out of the window
 * - `averageLatencySampleAmount`: Number of latency samples to use (sample size)
 * @property {object} [ewma={throughputSlowHalfLifeSeconds=8,throughputFastHalfLifeSeconds=3,latencySlowHalfLifeCount=2,latencyFastHalfLifeCount=1, weightDownloadTimeMultiplicationFactor=0.0015}]
 * When deriving the throughput based on the exponential weighted moving average these settings define:
 * - `throughputSlowHalfLifeSeconds`: Number by which the weight of the current throughput measurement is divided, see ThroughputModel._updateEwmaValues
 * - `throughputFastHalfLifeSeconds`: Number by which the weight of the current throughput measurement is divided, see ThroughputModel._updateEwmaValues
 * - `latencySlowHalfLifeCount`: Number by which the weight of the current latency is divided, see ThroughputModel._updateEwmaValues
 * - `latencyFastHalfLifeCount`: Number by which the weight of the current latency is divided, see ThroughputModel._updateEwmaValues
 * - `weightDownloadTimeMultiplicationFactor`: This value is multiplied with the download time in milliseconds to derive the weight for the EWMA calculation.
 */

/**
 * @typedef {Object} CmcdSettings
 * @property {boolean} [applyParametersFromMpd=true]
 * Set to true if dash.js should use the CMCD parameters defined in the MPD.
 * @property {boolean} [enable=false]
 * Enable or disable the CMCD reporting.
 * @property {string} [sid]
 * GUID identifying the current playback session.
 *
 * Should be in UUID format.
 *
 * If not specified a UUID will be automatically generated.
 * @property {string} [cid]
 * A unique string to identify the current content.
 *
 * If not specified it will be a hash of the MPD url.
 * @property {number} [rtp]
 * The requested maximum throughput that the client considers sufficient for delivery of the asset.
 *
 * If not specified this value will be dynamically calculated in the CMCDModel based on the current buffer level.
 * @property {number} [rtpSafetyFactor=5]
 * This value is used as a factor for the rtp value calculation: rtp = minBandwidth * rtpSafetyFactor
 *
 * If not specified this value defaults to 5. Note that this value is only used when no static rtp value is defined.
 * @property {number} [mode="query"]
 * The method to use to attach cmcd metrics to the requests. 'query' to use query parameters, 'header' to use http headers.
 *
 * If not specified this value defaults to 'query'.
 * @property {Array.<string>} [enabledKeys]
 * This value is used to specify the desired CMCD parameters. Parameters not included in this list are not reported.
 * @property {Array.<string>} [includeInRequests]
 * Specifies which HTTP GET requests shall carry parameters.
 *
 * If not specified this value defaults to ['segment', 'mpd].
 * @property {number} [version=1]
 * The version of the CMCD to use.
 *
 * If not specified this value defaults to 1.
 * @property {Array.<CmcdEventTarget>} [eventTargets]
 * List of CMCD reporting targets.
 */

/**
 * @typedef {Object} CmcdEventTarget
 * @property {boolean} [enabled]
 * Whether the CMCD reporting is enabled for this target.
 * @property {string} [url]
 * The reporting endpoint URL.
 * @property {string} [events]
 * The events that should trigger the CMCD reporting.
 * @property {number} [interval]
 * The time interval for the CMCD reporting in event mode. The 't' event should be set in the events array to use this parameter.
 * @property {Array.<string>} [enabledKeys]
 * CMCD keys to include in the report.
 * @property {Array.<string>} [includeInRequests]
 * Types of requests CMCD should be included on (e.g., 'mpd', 'segment').
 * @property {number} [batchSize]
 * The batch size for the CMCD reporting.
 */

/**
 * @typedef {Object} module:Settings~CmsdSettings
 * @property {boolean} [enabled=false]
 * Enable or disable the CMSD response headers parsing.
 * @property {module:Settings~CmsdAbrSettings} [abr]
 * Sets additional ABR rules based on CMSD response headers.
 */

/**
 * @typedef {Object} CmsdAbrSettings
 * @property {boolean} [applyMb=false]
 * Set to true if dash.js should apply CMSD maximum suggested bitrate in ABR logic.
 * @property {number} [etpWeightRatio=0]
 * Sets the weight ratio (between 0 and 1) that shall be applied on CMSD estimated throuhgput compared to measured throughput when calculating throughput.
 */

/**
 * @typedef {Object} module:Settings~DvbReportingSettings
 * @property {string} [reportingUrl]
 * Override DVB reporting url in manifest with a custom one
 */

/**
 * @typedef {Object} EnhancementSettings
 * @property {boolean} [enabled=false]
 * Enable or disable the scalable enhancement playback (e.g. LCEVC).
 * @property {Array.<string>} [codecs]
 * Specifies which scalable enhancement codecs are supported by the player.
 *
 * If not specified this value defaults to ['lvc1'].
 */

/**
 * @typedef {Object} Metrics
 * @property {number} [metricsMaxListDepth=100]
 * Maximum number of metrics that are persisted per type.
 */

/**
 * @typedef {Object} StreamingSettings
 * @property {number} [abandonLoadTimeout=10000]
 * A timeout value in seconds, which during the ABRController will block switch-up events.
 *
 * This will only take effect after an abandoned fragment event occurs.
 * @property {number} [wallclockTimeUpdateInterval=100]
 * How frequently the wallclockTimeUpdated internal event is triggered (in milliseconds).
 * @property {number} [manifestUpdateRetryInterval=100]
 * For live streams, set the interval-frequency in milliseconds at which dash.js will check if the current manifest is still processed before downloading the next manifest once the minimumUpdatePeriod time has.
 * @property {number} [liveUpdateTimeThresholdInMilliseconds=0]
 * For live streams, postpone syncing time updates until the threshold is passed. Increase if problems occurs during live streams on low end devices.
 * @property {boolean} [cacheInitSegments=false]
 * Enables the caching of init segments to avoid requesting the init segments before each representation switch.
 * @property {number} [cacheInitSegmentsLimit=50]
 * Maximum number of entries to keep in the init segment cache. When the cache exceeds this limit, the least recently used entries are evicted.
 * @property {boolean} [applyServiceDescription=true]
 * Set to true if dash.js should use the parameters defined in ServiceDescription elements
 * @property {boolean} [applyProducerReferenceTime=true]
 * Set to true if dash.js should use the parameters defined in ProducerReferenceTime elements in combination with ServiceDescription elements.
 * @property {boolean} [applyContentSteering=true]
 * Set to true if dash.js should apply content steering during playback.
 * @property {boolean} [enableManifestDurationMismatchFix=true]
 * For multi-period streams, overwrite the manifest mediaPresentationDuration attribute with the sum of period durations if the manifest mediaPresentationDuration is greater than the sum of period durations
 * @property {boolean} [enableManifestTimescaleMismatchFix=false]
 * Overwrite the manifest segments base information timescale attributes with the timescale set in initialization segments
 * @property {boolean} [parseInbandPrft=false]
 * Set to true if dash.js should parse inband prft boxes (ProducerReferenceTime) and trigger events.
 * @property {module:Settings~Metrics} metrics Metric settings
 * @property {module:Settings~LiveDelay} delay Live Delay settings
 * @property {module:Settings~EventSettings} events Event settings
 * @property {module:Settings~TimeShiftBuffer} timeShiftBuffer TimeShiftBuffer settings
 * @property {module:Settings~Protection} protection DRM related settings
 * @property {module:Settings~Capabilities} capabilities Capability related settings
 * @property {module:Settings~Buffer}  buffer Buffer related settings
 * @property {module:Settings~Gaps}  gaps Gap related settings
 * @property {module:Settings~UtcSynchronizationSettings} utcSynchronization Settings related to UTC clock synchronization
 * @property {module:Settings~Scheduling} scheduling Settings related to segment scheduling
 * @property {module:Settings~Text} text Settings related to Subtitles and captions
 * @property {module:Settings~LiveCatchupSettings} liveCatchup  Settings related to live catchup.
 * @property {module:Settings~CachingInfoSettings} [lastBitrateCachingInfo={enabled: true, ttl: 360000}]
 * Set to false if you would like to disable the last known bit rate from being stored during playback and used to set the initial bit rate for subsequent playback within the expiration window.
 *
 * The default expiration is one hour, defined in milliseconds.
 *
 * If expired, the default initial bit rate (closest to 1000 kbps) will be used for that session and a new bit rate will be stored during that session.
 * @property {module:Settings~CachingInfoSettings} [lastMediaSettingsCachingInfo={enabled: true, ttl: 360000}]
 * Set to false if you would like to disable the last media settings from being stored to localStorage during playback and used to set the initial track for subsequent playback within the expiration window.
 *
 * The default expiration is one hour, defined in milliseconds.
 * @property {boolean} [saveLastMediaSettingsForCurrentStreamingSession=true]
 * Set to true if dash.js should save media settings from last selected track for incoming track selection during current streaming session.
 * @property {module:Settings~AudioVideoSettings} [cacheLoadThresholds={video: 10, audio: 5}]
 * For a given media type, the threshold which defines if the response to a fragment request is coming from browser cache or not.
 * @property {module:Settings~AudioVideoSettings} [trackSwitchMode={video: "neverReplace", audio: "alwaysReplace"}]
 * For a given media type defines if existing segments in the buffer should be overwritten once the track is switched. For instance if the user switches the audio language the existing segments in the audio buffer will be replaced when setting this value to "alwaysReplace".
 *
 * Possible values
 *
 * - Constants.TRACK_SWITCH_MODE_ALWAYS_REPLACE
 * Replace existing segments in the buffer
 *
 * - Constants.TRACK_SWITCH_MODE_NEVER_REPLACE
 * Do not replace existing segments in the buffer
 *
 * @property {} [includePreselectionsInMediainfoArray: true]
 * provides the option to include Preselections in the MediaInfo object
 *
 * @property {} [includePreselectionsForInitialTrackSelection: false]
 * provides the option to include Preselections for initial track selection
 *
 * @property {} [ignoreSelectionPriority: false]
 * provides the option to disregard any signalled selectionPriority attribute. If disabled and if no initial media settings are set, track selection is accomplished as defined by selectionModeForInitialTrack.
 *
 * @property {} [prioritizeRoleMain: true]
 * provides the option to disable prioritization of AdaptationSets with their Role set to Main
 *
 * @property {} [assumeDefaultRoleAsMain: true]
 * when no Role descriptor is present, assume main per default
 *
 * @property {string} [selectionModeForInitialTrack="lowestStartupDelay"]
 * Sets the selection mode for the initial track. This mode defines how the initial track will be selected if no initial media settings are set. If initial media settings are set this parameter will be ignored. Available options are:
 *
 * Possible values
 *
 * - Constants.TRACK_SELECTION_MODE_HIGHEST_BITRATE
 * This mode makes the player select the track with a highest bitrate.
 *
 * - Constants.TRACK_SELECTION_MODE_FIRST_TRACK
 * This mode makes the player select the first track found in the manifest.
 *
 * - Constants.TRACK_SELECTION_MODE_HIGHEST_EFFICIENCY
 * This mode makes the player select the track with the lowest bitrate per pixel average.
 *
 * - Constants.TRACK_SELECTION_MODE_WIDEST_RANGE
 * This mode makes the player select the track with a widest range of bitrates.
 *
 * @property {number} [blacklistExpiryTime=-1]
 * The time in seconds that a Service Location remains on the blacklist.
 * After this period expires, the Service Location becomes eligible for selection again during a subsequent failover. However, the system will not proactively switch back to it on its own.
 * When Content Steering is enabled, this setting is ignored: the blacklist duration is automatically set to the steering response’s TTL, and the steering algorithm may actively switch back to that Service Location as needed.
 *
 * @property {number} [fragmentRequestTimeout=20000]
 * Time in milliseconds before timing out on loading a media fragment.
 *
 * @property {number} [fragmentRequestProgressTimeout=-1]
 * Time in milliseconds before timing out on loading progress of a media fragment.
 *
 * @property {number} [manifestRequestTimeout=10000]
 * Time in milliseconds before timing out on loading a manifest.
 *
 * Fragments that timeout are retried as if they failed.
 * @property {module:Settings~RequestTypeSettings} [retryIntervals]
 * Time in milliseconds of which to reload a failed file load attempt.
 *
 * For low latency mode these values are divided by lowLatencyReductionFactor.
 * @property {module:Settings~RequestTypeSettings} [retryAttempts]
 * Total number of retry attempts that will occur on a file load before it fails.
 *
 * For low latency mode these values are multiplied by lowLatencyMultiplyFactor.
 * @property {module:Settings~AbrSettings} abr
 * Adaptive Bitrate algorithm related settings.
 * @property {module:Settings~CmcdSettings} cmcd
 * Settings related to Common Media Client Data reporting.
 * @property {module:Settings~CmsdSettings} cmsd
 * Settings related to Common Media Server Data parsing.
 * @property {module:Settings~EnhancementSettings} enhancement
 * Settings related to scalable enhancement playback (e.g. LCEVC).
 * @property {module:Settings~defaultSchemeIdUri} defaultSchemeIdUri
 * Default schemeIdUri for descriptor type elements
 * These strings are used when not provided with setInitialMediaSettingsFor()
 * @property {module:Settings~DvbReportingSettings} dvbReporting
 * Settings related to DVB metrics reporting.
 */

/**
 * @class
 * @ignore
 */
function Settings() {
  let instance;
  const context = this.context;
  const eventBus = (0,_EventBus_js__WEBPACK_IMPORTED_MODULE_5__["default"])(context).getInstance();
  const DISPATCH_KEY_MAP = {
    'streaming.delay.liveDelay': _events_Events_js__WEBPACK_IMPORTED_MODULE_6__["default"].SETTING_UPDATED_LIVE_DELAY,
    'streaming.delay.liveDelayFragmentCount': _events_Events_js__WEBPACK_IMPORTED_MODULE_6__["default"].SETTING_UPDATED_LIVE_DELAY_FRAGMENT_COUNT,
    'streaming.liveCatchup.enabled': _events_Events_js__WEBPACK_IMPORTED_MODULE_6__["default"].SETTING_UPDATED_CATCHUP_ENABLED,
    'streaming.liveCatchup.playbackRate.min': _events_Events_js__WEBPACK_IMPORTED_MODULE_6__["default"].SETTING_UPDATED_PLAYBACK_RATE_MIN,
    'streaming.liveCatchup.playbackRate.max': _events_Events_js__WEBPACK_IMPORTED_MODULE_6__["default"].SETTING_UPDATED_PLAYBACK_RATE_MAX,
    'streaming.abr.rules.throughputRule.active': _events_Events_js__WEBPACK_IMPORTED_MODULE_6__["default"].SETTING_UPDATED_ABR_ACTIVE_RULES,
    'streaming.abr.rules.bolaRule.active': _events_Events_js__WEBPACK_IMPORTED_MODULE_6__["default"].SETTING_UPDATED_ABR_ACTIVE_RULES,
    'streaming.abr.rules.insufficientBufferRule.active': _events_Events_js__WEBPACK_IMPORTED_MODULE_6__["default"].SETTING_UPDATED_ABR_ACTIVE_RULES,
    'streaming.abr.rules.switchHistoryRule.active': _events_Events_js__WEBPACK_IMPORTED_MODULE_6__["default"].SETTING_UPDATED_ABR_ACTIVE_RULES,
    'streaming.abr.rules.droppedFramesRule.active': _events_Events_js__WEBPACK_IMPORTED_MODULE_6__["default"].SETTING_UPDATED_ABR_ACTIVE_RULES,
    'streaming.abr.rules.abandonRequestsRule.active': _events_Events_js__WEBPACK_IMPORTED_MODULE_6__["default"].SETTING_UPDATED_ABR_ACTIVE_RULES,
    'streaming.abr.rules.l2ARule.active': _events_Events_js__WEBPACK_IMPORTED_MODULE_6__["default"].SETTING_UPDATED_ABR_ACTIVE_RULES,
    'streaming.abr.rules.loLPRule.active': _events_Events_js__WEBPACK_IMPORTED_MODULE_6__["default"].SETTING_UPDATED_ABR_ACTIVE_RULES,
    'streaming.abr.maxBitrate.video': _events_Events_js__WEBPACK_IMPORTED_MODULE_6__["default"].SETTING_UPDATED_MAX_BITRATE,
    'streaming.abr.maxBitrate.audio': _events_Events_js__WEBPACK_IMPORTED_MODULE_6__["default"].SETTING_UPDATED_MAX_BITRATE,
    'streaming.abr.minBitrate.video': _events_Events_js__WEBPACK_IMPORTED_MODULE_6__["default"].SETTING_UPDATED_MIN_BITRATE,
    'streaming.abr.minBitrate.audio': _events_Events_js__WEBPACK_IMPORTED_MODULE_6__["default"].SETTING_UPDATED_MIN_BITRATE
  };

  /**
   * @const {PlayerSettings} defaultSettings
   * @ignore
   */
  const defaultSettings = {
    debug: {
      logLevel: _core_Debug_js__WEBPACK_IMPORTED_MODULE_2__["default"].LOG_LEVEL_WARNING,
      dispatchEvent: false
    },
    streaming: {
      abandonLoadTimeout: 10000,
      wallclockTimeUpdateInterval: 100,
      manifestUpdateRetryInterval: 100,
      liveUpdateTimeThresholdInMilliseconds: 0,
      cacheInitSegments: false,
      cacheInitSegmentsLimit: 50,
      applyServiceDescription: true,
      applyProducerReferenceTime: true,
      applyContentSteering: true,
      enableManifestDurationMismatchFix: true,
      parseInbandPrft: false,
      enableManifestTimescaleMismatchFix: false,
      capabilities: {
        filterUnsupportedEssentialProperties: true,
        supportedEssentialProperties: [{
          schemeIdUri: _streaming_constants_Constants_js__WEBPACK_IMPORTED_MODULE_3__["default"].FONT_DOWNLOAD_DVB_SCHEME
        }, {
          schemeIdUri: _streaming_constants_Constants_js__WEBPACK_IMPORTED_MODULE_3__["default"].COLOUR_PRIMARIES_SCHEME_ID_URI,
          value: /1|5|6|7/
        }, {
          schemeIdUri: _streaming_constants_Constants_js__WEBPACK_IMPORTED_MODULE_3__["default"].URL_QUERY_INFO_SCHEME
        }, {
          schemeIdUri: _streaming_constants_Constants_js__WEBPACK_IMPORTED_MODULE_3__["default"].EXT_URL_QUERY_INFO_SCHEME
        }, {
          schemeIdUri: _streaming_constants_Constants_js__WEBPACK_IMPORTED_MODULE_3__["default"].MATRIX_COEFFICIENTS_SCHEME_ID_URI,
          value: /0|1|5|6/
        }, {
          schemeIdUri: _streaming_constants_Constants_js__WEBPACK_IMPORTED_MODULE_3__["default"].TRANSFER_CHARACTERISTICS_SCHEME_ID_URI,
          value: /1|6|13|14|15/
        }, {
          schemeIdUri: _streaming_constants_Constants_js__WEBPACK_IMPORTED_MODULE_3__["default"].SEGMENT_SEQUENCE_REPRESENTATION_SCHEME_ID_URI
        }, ..._streaming_constants_Constants_js__WEBPACK_IMPORTED_MODULE_3__["default"].THUMBNAILS_SCHEME_ID_URIS.map(ep => {
          return {
            'schemeIdUri': ep
          };
        })],
        useMediaCapabilitiesApi: true,
        filterVideoColorimetryEssentialProperties: true,
        filterHDRMetadataFormatEssentialProperties: true,
        filterAudioChannelConfiguration: false
      },
      events: {
        eventControllerRefreshDelay: 100,
        deleteEventMessageDataTimeout: 10000
      },
      timeShiftBuffer: {
        calcFromSegmentTimeline: false,
        fallbackToSegmentTimeline: true
      },
      metrics: {
        maxListDepth: 100
      },
      delay: {
        liveDelayFragmentCount: NaN,
        liveDelay: NaN,
        useSuggestedPresentationDelay: true
      },
      protection: {
        keepProtectionMediaKeys: false,
        keepProtectionMediaKeysMaximumOpenSessions: -1,
        ignoreEmeEncryptedEvent: false,
        detectPlayreadyMessageFormat: true,
        ignoreKeyStatuses: false
      },
      buffer: {
        enableSeekDecorrelationFix: false,
        fastSwitchEnabled: null,
        flushBufferAtTrackSwitch: false,
        reuseExistingSourceBuffers: true,
        bufferPruningInterval: 10,
        bufferToKeep: 20,
        bufferTimeAtTopQuality: 30,
        bufferTimeAtTopQualityLongForm: 60,
        initialBufferLevel: NaN,
        bufferTimeDefault: 18,
        longFormContentDurationThreshold: 600,
        stallThreshold: 0.3,
        lowLatencyStallThreshold: 0.3,
        useAppendWindow: true,
        setStallState: true,
        avoidCurrentTimeRangePruning: false,
        useChangeType: true,
        mediaSourceDurationInfinity: true,
        resetSourceBuffersForTrackSwitch: false,
        syntheticStallEvents: {
          enabled: false,
          ignoreReadyState: false
        }
      },
      gaps: {
        jumpGaps: true,
        jumpLargeGaps: true,
        smallGapLimit: 1.5,
        threshold: 0.3,
        enableSeekFix: true,
        enableStallFix: false,
        stallSeek: 0.1,
        seekOffset: 0,
        checkInterval: 250
      },
      utcSynchronization: {
        enabled: true,
        useManifestDateHeaderTimeSource: true,
        backgroundAttempts: 2,
        timeBetweenSyncAttempts: 30,
        maximumTimeBetweenSyncAttempts: 600,
        minimumTimeBetweenSyncAttempts: 2,
        timeBetweenSyncAttemptsAdjustmentFactor: 2,
        maximumAllowedDrift: 100,
        enableBackgroundSyncAfterSegmentDownloadError: true,
        defaultTimingSource: {
          scheme: 'urn:mpeg:dash:utc:http-xsdate:2014',
          value: 'https://time.akamai.com/?iso&ms'
        },
        artificialTimeOffsetToApply: 0
      },
      scheduling: {
        defaultTimeout: 500,
        lowLatencyTimeout: 0,
        scheduleWhilePaused: true
      },
      text: {
        defaultEnabled: true,
        dispatchForManualRendering: false,
        extendSegmentedCues: true,
        imsc: {
          displayForcedOnlyMode: false,
          enableRollUp: true
        },
        webvtt: {
          customRenderingEnabled: false
        }
      },
      liveCatchup: {
        maxDrift: NaN,
        playbackRate: {
          min: NaN,
          max: NaN
        },
        step: {
          start: {
            min: NaN,
            max: NaN
          },
          stop: {
            min: NaN,
            max: NaN
          }
        },
        liveThreshold: -1,
        playbackBufferMin: 0.5,
        enabled: null,
        mode: _streaming_constants_Constants_js__WEBPACK_IMPORTED_MODULE_3__["default"].LIVE_CATCHUP_MODE_DEFAULT
      },
      lastBitrateCachingInfo: {
        enabled: true,
        ttl: 360000
      },
      lastMediaSettingsCachingInfo: {
        enabled: true,
        ttl: 360000
      },
      saveLastMediaSettingsForCurrentStreamingSession: true,
      cacheLoadThresholds: {
        video: 10,
        audio: 5
      },
      trackSwitchMode: {
        audio: _streaming_constants_Constants_js__WEBPACK_IMPORTED_MODULE_3__["default"].TRACK_SWITCH_MODE_ALWAYS_REPLACE,
        video: _streaming_constants_Constants_js__WEBPACK_IMPORTED_MODULE_3__["default"].TRACK_SWITCH_MODE_NEVER_REPLACE
      },
      includePreselectionsInMediainfoArray: true,
      includePreselectionsForInitialTrackSelection: false,
      ignoreSelectionPriority: false,
      prioritizeRoleMain: true,
      assumeDefaultRoleAsMain: true,
      selectionModeForInitialTrack: _streaming_constants_Constants_js__WEBPACK_IMPORTED_MODULE_3__["default"].TRACK_SELECTION_MODE_LOWEST_STARTUP_DELAY,
      blacklistExpiryTime: -1,
      fragmentRequestTimeout: 20000,
      fragmentRequestProgressTimeout: -1,
      manifestRequestTimeout: 10000,
      retryIntervals: {
        [_streaming_vo_metrics_HTTPRequest_js__WEBPACK_IMPORTED_MODULE_4__.HTTPRequest.MPD_TYPE]: 500,
        [_streaming_vo_metrics_HTTPRequest_js__WEBPACK_IMPORTED_MODULE_4__.HTTPRequest.XLINK_EXPANSION_TYPE]: 500,
        [_streaming_vo_metrics_HTTPRequest_js__WEBPACK_IMPORTED_MODULE_4__.HTTPRequest.MEDIA_SEGMENT_TYPE]: 1000,
        [_streaming_vo_metrics_HTTPRequest_js__WEBPACK_IMPORTED_MODULE_4__.HTTPRequest.INIT_SEGMENT_TYPE]: 1000,
        [_streaming_vo_metrics_HTTPRequest_js__WEBPACK_IMPORTED_MODULE_4__.HTTPRequest.BITSTREAM_SWITCHING_SEGMENT_TYPE]: 1000,
        [_streaming_vo_metrics_HTTPRequest_js__WEBPACK_IMPORTED_MODULE_4__.HTTPRequest.INDEX_SEGMENT_TYPE]: 1000,
        [_streaming_vo_metrics_HTTPRequest_js__WEBPACK_IMPORTED_MODULE_4__.HTTPRequest.MSS_FRAGMENT_INFO_SEGMENT_TYPE]: 1000,
        [_streaming_vo_metrics_HTTPRequest_js__WEBPACK_IMPORTED_MODULE_4__.HTTPRequest.LICENSE]: 1000,
        [_streaming_vo_metrics_HTTPRequest_js__WEBPACK_IMPORTED_MODULE_4__.HTTPRequest.LICENSE_CERTIFICATE]: 1000,
        [_streaming_vo_metrics_HTTPRequest_js__WEBPACK_IMPORTED_MODULE_4__.HTTPRequest.OTHER_TYPE]: 1000,
        lowLatencyReductionFactor: 10
      },
      retryAttempts: {
        [_streaming_vo_metrics_HTTPRequest_js__WEBPACK_IMPORTED_MODULE_4__.HTTPRequest.MPD_TYPE]: 3,
        [_streaming_vo_metrics_HTTPRequest_js__WEBPACK_IMPORTED_MODULE_4__.HTTPRequest.XLINK_EXPANSION_TYPE]: 1,
        [_streaming_vo_metrics_HTTPRequest_js__WEBPACK_IMPORTED_MODULE_4__.HTTPRequest.MEDIA_SEGMENT_TYPE]: 3,
        [_streaming_vo_metrics_HTTPRequest_js__WEBPACK_IMPORTED_MODULE_4__.HTTPRequest.INIT_SEGMENT_TYPE]: 3,
        [_streaming_vo_metrics_HTTPRequest_js__WEBPACK_IMPORTED_MODULE_4__.HTTPRequest.BITSTREAM_SWITCHING_SEGMENT_TYPE]: 3,
        [_streaming_vo_metrics_HTTPRequest_js__WEBPACK_IMPORTED_MODULE_4__.HTTPRequest.INDEX_SEGMENT_TYPE]: 3,
        [_streaming_vo_metrics_HTTPRequest_js__WEBPACK_IMPORTED_MODULE_4__.HTTPRequest.MSS_FRAGMENT_INFO_SEGMENT_TYPE]: 3,
        [_streaming_vo_metrics_HTTPRequest_js__WEBPACK_IMPORTED_MODULE_4__.HTTPRequest.LICENSE]: 3,
        [_streaming_vo_metrics_HTTPRequest_js__WEBPACK_IMPORTED_MODULE_4__.HTTPRequest.LICENSE_CERTIFICATE]: 3,
        [_streaming_vo_metrics_HTTPRequest_js__WEBPACK_IMPORTED_MODULE_4__.HTTPRequest.OTHER_TYPE]: 3,
        lowLatencyMultiplyFactor: 5
      },
      abr: {
        limitBitrateByPortal: false,
        usePixelRatioInLimitBitrateByPortal: false,
        limitBitrateByPortalMinimum: 0,
        enableSupplementalPropertyAdaptationSetSwitching: true,
        rules: {
          throughputRule: {
            active: true,
            priority: _streaming_rules_SwitchRequest_js__WEBPACK_IMPORTED_MODULE_7__["default"].PRIORITY.DEFAULT
          },
          bolaRule: {
            active: true,
            priority: _streaming_rules_SwitchRequest_js__WEBPACK_IMPORTED_MODULE_7__["default"].PRIORITY.DEFAULT
          },
          insufficientBufferRule: {
            active: true,
            priority: _streaming_rules_SwitchRequest_js__WEBPACK_IMPORTED_MODULE_7__["default"].PRIORITY.DEFAULT,
            parameters: {
              throughputSafetyFactor: 0.7,
              segmentIgnoreCount: 2
            }
          },
          switchHistoryRule: {
            active: true,
            priority: _streaming_rules_SwitchRequest_js__WEBPACK_IMPORTED_MODULE_7__["default"].PRIORITY.DEFAULT,
            parameters: {
              sampleSize: 8,
              switchPercentageThreshold: 0.075
            }
          },
          droppedFramesRule: {
            active: false,
            priority: _streaming_rules_SwitchRequest_js__WEBPACK_IMPORTED_MODULE_7__["default"].PRIORITY.DEFAULT,
            parameters: {
              minimumSampleSize: 375,
              droppedFramesPercentageThreshold: 0.15
            }
          },
          abandonRequestsRule: {
            active: true,
            priority: _streaming_rules_SwitchRequest_js__WEBPACK_IMPORTED_MODULE_7__["default"].PRIORITY.DEFAULT,
            parameters: {
              abandonDurationMultiplier: 1.8,
              minSegmentDownloadTimeThresholdInMs: 500,
              minThroughputSamplesThreshold: 6
            }
          },
          l2ARule: {
            active: false,
            priority: _streaming_rules_SwitchRequest_js__WEBPACK_IMPORTED_MODULE_7__["default"].PRIORITY.DEFAULT
          },
          loLPRule: {
            active: false,
            priority: _streaming_rules_SwitchRequest_js__WEBPACK_IMPORTED_MODULE_7__["default"].PRIORITY.DEFAULT
          }
        },
        throughput: {
          averageCalculationMode: _streaming_constants_Constants_js__WEBPACK_IMPORTED_MODULE_3__["default"].THROUGHPUT_CALCULATION_MODES.EWMA,
          lowLatencyDownloadTimeCalculationMode: _streaming_constants_Constants_js__WEBPACK_IMPORTED_MODULE_3__["default"].LOW_LATENCY_DOWNLOAD_TIME_CALCULATION_MODE.MOOF_PARSING,
          useResourceTimingApi: true,
          useNetworkInformationApi: {
            xhr: false,
            fetch: false
          },
          useDeadTimeLatency: true,
          bandwidthSafetyFactor: 0.9,
          sampleSettings: {
            live: 3,
            vod: 4,
            enableSampleSizeAdjustment: true,
            decreaseScale: 0.7,
            increaseScale: 1.3,
            maxMeasurementsToKeep: 20,
            averageLatencySampleAmount: 4
          },
          ewma: {
            throughputSlowHalfLifeSeconds: 8,
            throughputFastHalfLifeSeconds: 3,
            latencySlowHalfLifeCount: 2,
            latencyFastHalfLifeCount: 1,
            weightDownloadTimeMultiplicationFactor: 0.0015
          }
        },
        maxBitrate: {
          audio: -1,
          video: -1
        },
        minBitrate: {
          audio: -1,
          video: -1
        },
        initialBitrate: {
          audio: -1,
          video: -1
        },
        autoSwitchBitrate: {
          audio: true,
          video: true
        }
      },
      cmcd: {
        applyParametersFromMpd: true,
        enabled: false,
        sid: null,
        cid: null,
        rtp: null,
        rtpSafetyFactor: 5,
        mode: _streaming_constants_Constants_js__WEBPACK_IMPORTED_MODULE_3__["default"].CMCD_MODE_QUERY,
        enabledKeys: _streaming_constants_Constants_js__WEBPACK_IMPORTED_MODULE_3__["default"].CMCD_KEYS,
        includeInRequests: ['segment', 'mpd'],
        version: 1,
        eventTargets: []
      },
      cmsd: {
        enabled: false,
        abr: {
          applyMb: false,
          etpWeightRatio: 0
        }
      },
      enhancement: {
        enabled: false,
        codecs: ['lvc1']
      },
      defaultSchemeIdUri: {
        viewpoint: '',
        audioChannelConfiguration: 'urn:mpeg:mpegB:cicp:ChannelConfiguration',
        role: 'urn:mpeg:dash:role:2011',
        accessibility: 'urn:mpeg:dash:role:2011'
      },
      dvbReporting: {
        reportingUrl: null
      }
    },
    errors: {
      recoverAttempts: {
        mediaErrorDecode: 5
      }
    }
  };
  let settings = _Utils_js__WEBPACK_IMPORTED_MODULE_1__["default"].clone(defaultSettings);

  //Merge in the settings. If something exists in the new config that doesn't match the schema of the default config,
  //regard it as an error and log it.
  function mixinSettings(source, dest, path) {
    for (let n in source) {
      if (source.hasOwnProperty(n)) {
        if (dest.hasOwnProperty(n)) {
          if (typeof source[n] === 'object' && !(source[n] instanceof RegExp) && !(source[n] instanceof Array) && source[n] !== null) {
            mixinSettings(source[n], dest[n], path.slice() + n + '.');
          } else {
            dest[n] = _Utils_js__WEBPACK_IMPORTED_MODULE_1__["default"].clone(source[n]);
            if (DISPATCH_KEY_MAP[path + n]) {
              eventBus.trigger(DISPATCH_KEY_MAP[path + n]);
            }
          }
        } else {
          console.error('Settings parameter ' + path + n + ' is not supported');
        }
      }
    }
  }

  /**
   * Return the settings object. Don't copy/store this object, you won't get updates.
   * @func
   * @instance
   */
  function get() {
    return settings;
  }

  /**
   * @func
   * @instance
   * @param {object} settingsObj - This should be a partial object of the Settings.Schema type. That is, fields defined should match the path (e.g.
   * settingsObj.streaming.abr.autoSwitchBitrate.audio -> defaultSettings.streaming.abr.autoSwitchBitrate.audio). Where an element's path does
   * not match it is ignored, and a warning is logged.
   *
   * Use to change the settings object. Any new values defined will overwrite the settings and anything undefined will not change.
   * Implementers of new settings should add it in an approriate namespace to the defaultSettings object and give it a default value (that is not undefined).
   *
   */
  function update(settingsObj) {
    if (typeof settingsObj === 'object') {
      mixinSettings(settingsObj, settings, '');
    }
  }

  /**
   * Resets the settings object. Everything is set to its default value.
   * @func
   * @instance
   *
   */
  function reset() {
    settings = _Utils_js__WEBPACK_IMPORTED_MODULE_1__["default"].clone(defaultSettings);
  }
  instance = {
    get,
    update,
    reset
  };
  return instance;
}
Settings.__dashjs_factory_name = 'Settings';
let factory = _FactoryMaker_js__WEBPACK_IMPORTED_MODULE_0__["default"].getSingletonFactory(Settings);
/* harmony default export */ __webpack_exports__["default"] = (factory);

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

/***/ "./src/core/errors/Errors.js":
/*!***********************************!*\
  !*** ./src/core/errors/Errors.js ***!
  \***********************************/
/***/ (function(__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony import */ var _ErrorsBase_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./ErrorsBase.js */ "./src/core/errors/ErrorsBase.js");
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
 * Errors declaration
 * @class
 */
class Errors extends _ErrorsBase_js__WEBPACK_IMPORTED_MODULE_0__["default"] {
  constructor() {
    super();

    /**
     * Error code returned when a manifest parsing error occurs
     */
    this.MANIFEST_LOADER_PARSING_FAILURE_ERROR_CODE = 10;

    /**
     * Error code returned when a manifest loading error occurs
     */
    this.MANIFEST_LOADER_LOADING_FAILURE_ERROR_CODE = 11;

    /**
     * Error code returned when a xlink loading error occurs
     */
    this.XLINK_LOADER_LOADING_FAILURE_ERROR_CODE = 12;

    /**
     * Error code returned when no segment ranges could be determined from the sidx box
     */
    this.SEGMENT_BASE_LOADER_ERROR_CODE = 15;

    /**
     * Error code returned when the time synchronization failed
     */
    this.TIME_SYNC_FAILED_ERROR_CODE = 16;

    /**
     * Error code returned when loading a fragment failed
     */
    this.FRAGMENT_LOADER_LOADING_FAILURE_ERROR_CODE = 17;

    /**
     * Error code returned when the FragmentLoader did not receive a request object
     */
    this.FRAGMENT_LOADER_NULL_REQUEST_ERROR_CODE = 18;

    /**
     * Error code returned when the BaseUrl resolution failed
     */
    this.URL_RESOLUTION_FAILED_GENERIC_ERROR_CODE = 19;

    /**
     * Error code returned when the append operation in the SourceBuffer failed
     */
    this.APPEND_ERROR_CODE = 20;

    /**
     * Error code returned when the remove operation in the SourceBuffer failed
     */
    this.REMOVE_ERROR_CODE = 21;

    /**
     * Error code returned when updating the internal objects after loading an MPD failed
     */
    this.DATA_UPDATE_FAILED_ERROR_CODE = 22;

    /**
     * Error code returned when MediaSource is not supported by the browser
     */
    this.CAPABILITY_MEDIASOURCE_ERROR_CODE = 23;

    /**
     * Error code returned when Protected contents are not supported
     */
    this.CAPABILITY_MEDIAKEYS_ERROR_CODE = 24;

    /**
     * Error code returned when loading the manifest failed
     */
    this.DOWNLOAD_ERROR_ID_MANIFEST_CODE = 25;

    /**
     * Error code returned when loading the sidx failed
     */
    this.DOWNLOAD_ERROR_ID_SIDX_CODE = 26;

    /**
     * Error code returned when loading the media content failed
     */
    this.DOWNLOAD_ERROR_ID_CONTENT_CODE = 27;

    /**
     * Error code returned when loading the init segment failed
     */
    this.DOWNLOAD_ERROR_ID_INITIALIZATION_CODE = 28;

    /**
     * Error code returned when loading the XLink content failed
     */
    this.DOWNLOAD_ERROR_ID_XLINK_CODE = 29;

    /**
     * Error code returned when parsing the MPD resulted in a logical error
     */
    this.MANIFEST_ERROR_ID_PARSE_CODE = 31;

    /**
     * Error code returned when no stream (period) has been detected in the manifest
     */
    this.MANIFEST_ERROR_ID_NOSTREAMS_CODE = 32;

    /**
     * Error code returned when something wrong has happened during parsing and appending subtitles (TTML or VTT)
     */
    this.TIMED_TEXT_ERROR_ID_PARSE_CODE = 33;

    /**
     * Error code returned when a 'muxed' media type has been detected in the manifest. This type is not supported
     */

    this.MANIFEST_ERROR_ID_MULTIPLEXED_CODE = 34;

    /**
     * Error code returned when a media source type is not supported
     */
    this.MEDIASOURCE_TYPE_UNSUPPORTED_CODE = 35;

    /**
     * Error code returned when the available Adaptation Sets can not be selected because the corresponding key ids have an invalid key status
     * @type {number}
     */
    this.NO_SUPPORTED_KEY_IDS = 36;
    this.MANIFEST_LOADER_PARSING_FAILURE_ERROR_MESSAGE = 'parsing failed for ';
    this.MANIFEST_LOADER_LOADING_FAILURE_ERROR_MESSAGE = 'Failed loading manifest: ';
    this.XLINK_LOADER_LOADING_FAILURE_ERROR_MESSAGE = 'Failed loading Xlink element: ';
    this.SEGMENTS_UPDATE_FAILED_ERROR_MESSAGE = 'Segments update failed';
    this.SEGMENTS_UNAVAILABLE_ERROR_MESSAGE = 'no segments are available yet';
    this.SEGMENT_BASE_LOADER_ERROR_MESSAGE = 'error loading segment ranges from sidx';
    this.TIME_SYNC_FAILED_ERROR_MESSAGE = 'Failed to synchronize client and server time';
    this.FRAGMENT_LOADER_NULL_REQUEST_ERROR_MESSAGE = 'request is null';
    this.URL_RESOLUTION_FAILED_GENERIC_ERROR_MESSAGE = 'Failed to resolve a valid URL';
    this.APPEND_ERROR_MESSAGE = 'chunk is not defined';
    this.REMOVE_ERROR_MESSAGE = 'Removing data from the SourceBuffer';
    this.DATA_UPDATE_FAILED_ERROR_MESSAGE = 'Data update failed';
    this.CAPABILITY_MEDIASOURCE_ERROR_MESSAGE = 'mediasource is not supported';
    this.CAPABILITY_MEDIAKEYS_ERROR_MESSAGE = 'mediakeys is not supported';
    this.TIMED_TEXT_ERROR_MESSAGE_PARSE = 'parsing error :';
    this.MEDIASOURCE_TYPE_UNSUPPORTED_MESSAGE = 'Error creating source buffer of type : ';
    this.NO_SUPPORTED_KEY_IDS_MESSAGE = 'All possible Adaptation Sets have an invalid key status';
  }
}
let errors = new Errors();
/* harmony default export */ __webpack_exports__["default"] = (errors);

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

/***/ "./src/core/events/CoreEvents.js":
/*!***************************************!*\
  !*** ./src/core/events/CoreEvents.js ***!
  \***************************************/
/***/ (function(__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony import */ var _EventsBase_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./EventsBase.js */ "./src/core/events/EventsBase.js");
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
 * These are internal events that should not be needed at the player level.
 * If you find and event in here that you would like access to from MediaPlayer level
 * please add an issue at https://github.com/Dash-Industry-Forum/dash.js/issues/new
 * @class
 * @ignore
 */
class CoreEvents extends _EventsBase_js__WEBPACK_IMPORTED_MODULE_0__["default"] {
  constructor() {
    super();
    this.ATTEMPT_BACKGROUND_SYNC = 'attemptBackgroundSync';
    this.BUFFERING_COMPLETED = 'bufferingCompleted';
    this.BUFFER_CLEARED = 'bufferCleared';
    this.BUFFER_REPLACEMENT_STARTED = 'bufferReplacementStarted';
    this.BYTES_APPENDED_END_FRAGMENT = 'bytesAppendedEndFragment';
    this.CHECK_FOR_EXISTENCE_COMPLETED = 'checkForExistenceCompleted';
    this.CMSD_STATIC_HEADER = 'cmsdStaticHeader';
    this.CURRENT_TRACK_CHANGED = 'currentTrackChanged';
    this.DATA_UPDATE_COMPLETED = 'dataUpdateCompleted';
    this.INBAND_EVENTS = 'inbandEvents';
    this.INITIAL_STREAM_SWITCH = 'initialStreamSwitch';
    this.INIT_FRAGMENT_LOADED = 'initFragmentLoaded';
    this.INIT_FRAGMENT_NEEDED = 'initFragmentNeeded';
    this.INTERNAL_MANIFEST_LOADED = 'internalManifestLoaded';
    this.LOADING_ABANDONED = 'loadingAborted';
    this.LOADING_COMPLETED = 'loadingCompleted';
    this.LOADING_DATA_PROGRESS = 'loadingDataProgress';
    this.LOADING_PROGRESS = 'loadingProgress';
    this.MANIFEST_UPDATED = 'manifestUpdated';
    this.MEDIAINFO_UPDATED = 'mediaInfoUpdated';
    this.MEDIA_FRAGMENT_LOADED = 'mediaFragmentLoaded';
    this.MEDIA_FRAGMENT_NEEDED = 'mediaFragmentNeeded';
    this.ORIGINAL_MANIFEST_LOADED = 'originalManifestLoaded';
    this.QUOTA_EXCEEDED = 'quotaExceeded';
    this.SEEK_TARGET = 'seekTarget';
    this.SEGMENT_LOCATION_BLACKLIST_ADD = 'segmentLocationBlacklistAdd';
    this.SEGMENT_LOCATION_BLACKLIST_CHANGED = 'segmentLocationBlacklistChanged';
    this.SERVICE_LOCATION_BASE_URL_BLACKLIST_ADD = 'serviceLocationBlacklistAdd';
    this.SERVICE_LOCATION_BASE_URL_BLACKLIST_CHANGED = 'serviceLocationBlacklistChanged';
    this.SERVICE_LOCATION_LOCATION_BLACKLIST_ADD = 'serviceLocationLocationBlacklistAdd';
    this.SERVICE_LOCATION_LOCATION_BLACKLIST_CHANGED = 'serviceLocationLocationBlacklistChanged';
    this.SETTING_UPDATED_ABR_ACTIVE_RULES = 'settingUpdatedAbrActiveRules';
    this.SETTING_UPDATED_CATCHUP_ENABLED = 'settingUpdatedCatchupEnabled';
    this.SETTING_UPDATED_LIVE_DELAY = 'settingUpdatedLiveDelay';
    this.SETTING_UPDATED_LIVE_DELAY_FRAGMENT_COUNT = 'settingUpdatedLiveDelayFragmentCount';
    this.SETTING_UPDATED_MAX_BITRATE = 'settingUpdatedMaxBitrate';
    this.SETTING_UPDATED_MIN_BITRATE = 'settingUpdatedMinBitrate';
    this.SETTING_UPDATED_PLAYBACK_RATE_MAX = 'settingUpdatedPlaybackRateMax';
    this.SETTING_UPDATED_PLAYBACK_RATE_MIN = 'settingUpdatedPlaybackRateMin';
    this.SET_FRAGMENTED_TEXT_AFTER_DISABLED = 'setFragmentedTextAfterDisabled';
    this.SET_NON_FRAGMENTED_TEXT = 'setNonFragmentedText';
    this.SOURCE_BUFFER_ERROR = 'sourceBufferError';
    this.STREAMS_COMPOSED = 'streamsComposed';
    this.STREAM_BUFFERING_COMPLETED = 'streamBufferingCompleted';
    this.STREAM_REQUESTING_COMPLETED = 'streamRequestingCompleted';
    this.TEXT_TRACKS_QUEUE_INITIALIZED = 'textTracksQueueInitialized';
    this.TIME_SYNCHRONIZATION_COMPLETED = 'timeSynchronizationComplete';
    this.UPDATE_TIME_SYNC_OFFSET = 'updateTimeSyncOffset';
    this.URL_RESOLUTION_FAILED = 'urlResolutionFailed';
    this.VIDEO_CHUNK_RECEIVED = 'videoChunkReceived';
    this.VIDEO_ELEMENT_RESIZED = 'videoElementResized';
    this.WALLCLOCK_TIME_UPDATED = 'wallclockTimeUpdated';
    this.XLINK_ELEMENT_LOADED = 'xlinkElementLoaded';
    this.XLINK_READY = 'xlinkReady';
  }
}
/* harmony default export */ __webpack_exports__["default"] = (CoreEvents);

/***/ }),

/***/ "./src/core/events/Events.js":
/*!***********************************!*\
  !*** ./src/core/events/Events.js ***!
  \***********************************/
/***/ (function(__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony import */ var _CoreEvents_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./CoreEvents.js */ "./src/core/events/CoreEvents.js");
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

class Events extends _CoreEvents_js__WEBPACK_IMPORTED_MODULE_0__["default"] {}
let events = new Events();
/* harmony default export */ __webpack_exports__["default"] = (events);

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

/***/ "./src/dash/models/DashManifestModel.js":
/*!**********************************************!*\
  !*** ./src/dash/models/DashManifestModel.js ***!
  \**********************************************/
/***/ (function(__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony import */ var _vo_AdaptationSet_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../vo/AdaptationSet.js */ "./src/dash/vo/AdaptationSet.js");
/* harmony import */ var _vo_BaseURL_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../vo/BaseURL.js */ "./src/dash/vo/BaseURL.js");
/* harmony import */ var _vo_CMCDParameters_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../vo/CMCDParameters.js */ "./src/dash/vo/CMCDParameters.js");
/* harmony import */ var _vo_ClientDataReporting_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../vo/ClientDataReporting.js */ "./src/dash/vo/ClientDataReporting.js");
/* harmony import */ var _streaming_constants_Constants_js__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ../../streaming/constants/Constants.js */ "./src/streaming/constants/Constants.js");
/* harmony import */ var _vo_ContentProtection_js__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ../vo/ContentProtection.js */ "./src/dash/vo/ContentProtection.js");
/* harmony import */ var _vo_ContentSteering_js__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! ../vo/ContentSteering.js */ "./src/dash/vo/ContentSteering.js");
/* harmony import */ var _constants_DashConstants_js__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(/*! ../constants/DashConstants.js */ "./src/dash/constants/DashConstants.js");
/* harmony import */ var _streaming_vo_DashJSError_js__WEBPACK_IMPORTED_MODULE_8__ = __webpack_require__(/*! ../../streaming/vo/DashJSError.js */ "./src/streaming/vo/DashJSError.js");
/* harmony import */ var _core_Debug_js__WEBPACK_IMPORTED_MODULE_9__ = __webpack_require__(/*! ../../core/Debug.js */ "./src/core/Debug.js");
/* harmony import */ var _vo_DescriptorType_js__WEBPACK_IMPORTED_MODULE_10__ = __webpack_require__(/*! ../vo/DescriptorType.js */ "./src/dash/vo/DescriptorType.js");
/* harmony import */ var _core_errors_Errors_js__WEBPACK_IMPORTED_MODULE_11__ = __webpack_require__(/*! ../../core/errors/Errors.js */ "./src/core/errors/Errors.js");
/* harmony import */ var _vo_Event_js__WEBPACK_IMPORTED_MODULE_12__ = __webpack_require__(/*! ../vo/Event.js */ "./src/dash/vo/Event.js");
/* harmony import */ var _vo_EventStream_js__WEBPACK_IMPORTED_MODULE_13__ = __webpack_require__(/*! ../vo/EventStream.js */ "./src/dash/vo/EventStream.js");
/* harmony import */ var _core_FactoryMaker_js__WEBPACK_IMPORTED_MODULE_14__ = __webpack_require__(/*! ../../core/FactoryMaker.js */ "./src/core/FactoryMaker.js");
/* harmony import */ var _vo_Mpd_js__WEBPACK_IMPORTED_MODULE_15__ = __webpack_require__(/*! ../vo/Mpd.js */ "./src/dash/vo/Mpd.js");
/* harmony import */ var _vo_MpdLocation_js__WEBPACK_IMPORTED_MODULE_16__ = __webpack_require__(/*! ../vo/MpdLocation.js */ "./src/dash/vo/MpdLocation.js");
/* harmony import */ var _streaming_utils_ObjectUtils_js__WEBPACK_IMPORTED_MODULE_17__ = __webpack_require__(/*! ../../streaming/utils/ObjectUtils.js */ "./src/streaming/utils/ObjectUtils.js");
/* harmony import */ var _vo_PatchLocation_js__WEBPACK_IMPORTED_MODULE_18__ = __webpack_require__(/*! ../vo/PatchLocation.js */ "./src/dash/vo/PatchLocation.js");
/* harmony import */ var _vo_Period_js__WEBPACK_IMPORTED_MODULE_19__ = __webpack_require__(/*! ../vo/Period.js */ "./src/dash/vo/Period.js");
/* harmony import */ var _vo_Preselection_js__WEBPACK_IMPORTED_MODULE_20__ = __webpack_require__(/*! ../vo/Preselection.js */ "./src/dash/vo/Preselection.js");
/* harmony import */ var _vo_ProducerReferenceTime_js__WEBPACK_IMPORTED_MODULE_21__ = __webpack_require__(/*! ../vo/ProducerReferenceTime.js */ "./src/dash/vo/ProducerReferenceTime.js");
/* harmony import */ var _vo_Representation_js__WEBPACK_IMPORTED_MODULE_22__ = __webpack_require__(/*! ../vo/Representation.js */ "./src/dash/vo/Representation.js");
/* harmony import */ var _streaming_utils_URLUtils_js__WEBPACK_IMPORTED_MODULE_23__ = __webpack_require__(/*! ../../streaming/utils/URLUtils.js */ "./src/streaming/utils/URLUtils.js");
/* harmony import */ var _vo_UTCTiming_js__WEBPACK_IMPORTED_MODULE_24__ = __webpack_require__(/*! ../vo/UTCTiming.js */ "./src/dash/vo/UTCTiming.js");
/* harmony import */ var _core_Utils_js__WEBPACK_IMPORTED_MODULE_25__ = __webpack_require__(/*! ../../core/Utils.js */ "./src/core/Utils.js");
/* harmony import */ var _vo_SegmentSequenceProperties_js__WEBPACK_IMPORTED_MODULE_26__ = __webpack_require__(/*! ../vo/SegmentSequenceProperties.js */ "./src/dash/vo/SegmentSequenceProperties.js");
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



























function DashManifestModel() {
  let instance, logger, errHandler, BASE64;
  const context = this.context;
  const urlUtils = (0,_streaming_utils_URLUtils_js__WEBPACK_IMPORTED_MODULE_23__["default"])(context).getInstance();
  const isInteger = Number.isInteger || function (value) {
    return typeof value === 'number' && isFinite(value) && Math.floor(value) === value;
  };
  function setup() {
    logger = (0,_core_Debug_js__WEBPACK_IMPORTED_MODULE_9__["default"])(context).getInstance().getLogger(instance);
  }
  function getIsTypeOf(adaptation, type) {
    if (!adaptation) {
      throw new Error('adaptation is not defined');
    }
    if (!type) {
      throw new Error('type is not defined');
    }

    // Check for thumbnail images
    if (adaptation.Representation && adaptation.Representation.length) {
      const essentialProperties = getEssentialProperties(adaptation.Representation[0]);
      if (essentialProperties && essentialProperties.some(essentialProperty => _streaming_constants_Constants_js__WEBPACK_IMPORTED_MODULE_4__["default"].THUMBNAILS_SCHEME_ID_URIS.indexOf(essentialProperty.schemeIdUri) >= 0)) {
        return type === _streaming_constants_Constants_js__WEBPACK_IMPORTED_MODULE_4__["default"].IMAGE;
      }
    }

    // Check ContentComponent.contentType
    if (adaptation.ContentComponent && adaptation.ContentComponent.length > 0) {
      if (adaptation.ContentComponent.length > 1) {
        return type === _streaming_constants_Constants_js__WEBPACK_IMPORTED_MODULE_4__["default"].MUXED;
      } else if (adaptation.ContentComponent[0].contentType === type) {
        return true;
      }
    }
    const mimeTypeRegEx = type === _streaming_constants_Constants_js__WEBPACK_IMPORTED_MODULE_4__["default"].TEXT ? new RegExp('(ttml|vtt|wvtt|stpp)') : new RegExp(type);

    // Check codecs
    if (adaptation.Representation && adaptation.Representation.length) {
      const codecs = adaptation.Representation[0].codecs;
      if (mimeTypeRegEx.test(codecs)) {
        return true;
      }
    }

    // Check Adaptation's mimeType
    if (adaptation.hasOwnProperty(_constants_DashConstants_js__WEBPACK_IMPORTED_MODULE_7__["default"].MIME_TYPE)) {
      return mimeTypeRegEx.test(adaptation.mimeType);
    }

    // Check Representation's mimeType
    if (adaptation.Representation) {
      let representation;
      for (let i = 0; i < adaptation.Representation.length; i++) {
        representation = adaptation.Representation[i];
        if (representation.hasOwnProperty(_constants_DashConstants_js__WEBPACK_IMPORTED_MODULE_7__["default"].MIME_TYPE)) {
          return mimeTypeRegEx.test(representation.mimeType);
        }
      }
    }
    return false;
  }
  function getPreselectionIsTypeOf(preselection, adaptations, type) {
    if (!preselection) {
      throw new Error('preselection is not defined');
    }
    if (!adaptations) {
      throw new Error('adaptations is not defined');
    }
    if (!type) {
      throw new Error('type is not defined');
    }
    const mainAdaptationSet = getMainAdaptationSetForPreselection(preselection, adaptations);
    return mainAdaptationSet ? getIsTypeOf(mainAdaptationSet, type) : false;
  }
  function getIsFragmented(adaptation) {
    if (!adaptation) {
      throw new Error('adaptation is not defined');
    }
    if (adaptation.hasOwnProperty(_constants_DashConstants_js__WEBPACK_IMPORTED_MODULE_7__["default"].SEGMENT_TEMPLATE) || adaptation.hasOwnProperty(_constants_DashConstants_js__WEBPACK_IMPORTED_MODULE_7__["default"].SEGMENT_TIMELINE) || adaptation.hasOwnProperty(_constants_DashConstants_js__WEBPACK_IMPORTED_MODULE_7__["default"].SEGMENT_LIST) || adaptation.hasOwnProperty(_constants_DashConstants_js__WEBPACK_IMPORTED_MODULE_7__["default"].SEGMENT_BASE)) {
      return true;
    }
    if (adaptation.Representation && adaptation.Representation.length > 0) {
      const representation = adaptation.Representation[0];
      if (representation.hasOwnProperty(_constants_DashConstants_js__WEBPACK_IMPORTED_MODULE_7__["default"].SEGMENT_TEMPLATE) || representation.hasOwnProperty(_constants_DashConstants_js__WEBPACK_IMPORTED_MODULE_7__["default"].SEGMENT_TIMELINE) || representation.hasOwnProperty(_constants_DashConstants_js__WEBPACK_IMPORTED_MODULE_7__["default"].SEGMENT_LIST) || representation.hasOwnProperty(_constants_DashConstants_js__WEBPACK_IMPORTED_MODULE_7__["default"].SEGMENT_BASE)) {
        return true;
      }
    }
    return false;
  }
  function getIsAudio(adaptation) {
    return getIsTypeOf(adaptation, _streaming_constants_Constants_js__WEBPACK_IMPORTED_MODULE_4__["default"].AUDIO);
  }
  function getIsVideo(adaptation) {
    return getIsTypeOf(adaptation, _streaming_constants_Constants_js__WEBPACK_IMPORTED_MODULE_4__["default"].VIDEO);
  }
  function getIsText(adaptation) {
    return getIsTypeOf(adaptation, _streaming_constants_Constants_js__WEBPACK_IMPORTED_MODULE_4__["default"].TEXT);
  }
  function getIsMuxed(adaptation) {
    return getIsTypeOf(adaptation, _streaming_constants_Constants_js__WEBPACK_IMPORTED_MODULE_4__["default"].MUXED);
  }
  function getIsImage(adaptation) {
    return getIsTypeOf(adaptation, _streaming_constants_Constants_js__WEBPACK_IMPORTED_MODULE_4__["default"].IMAGE);
  }
  function getProducerReferenceTimesForAdaptation(adaptation) {
    const prtArray = adaptation && adaptation.hasOwnProperty(_constants_DashConstants_js__WEBPACK_IMPORTED_MODULE_7__["default"].PRODUCER_REFERENCE_TIME) ? adaptation[_constants_DashConstants_js__WEBPACK_IMPORTED_MODULE_7__["default"].PRODUCER_REFERENCE_TIME] : [];

    // ProducerReferenceTime elements can also be contained in Representations
    const representationsArray = adaptation && adaptation.hasOwnProperty(_constants_DashConstants_js__WEBPACK_IMPORTED_MODULE_7__["default"].REPRESENTATION) ? adaptation[_constants_DashConstants_js__WEBPACK_IMPORTED_MODULE_7__["default"].REPRESENTATION] : [];
    representationsArray.forEach(rep => {
      if (rep.hasOwnProperty(_constants_DashConstants_js__WEBPACK_IMPORTED_MODULE_7__["default"].PRODUCER_REFERENCE_TIME)) {
        prtArray.push(...rep[_constants_DashConstants_js__WEBPACK_IMPORTED_MODULE_7__["default"].PRODUCER_REFERENCE_TIME]);
      }
    });
    const prtsForAdaptation = [];

    // Unlikely to have multiple ProducerReferenceTimes.
    prtArray.forEach(prt => {
      const entry = new _vo_ProducerReferenceTime_js__WEBPACK_IMPORTED_MODULE_21__["default"]();
      if (prt.hasOwnProperty(_constants_DashConstants_js__WEBPACK_IMPORTED_MODULE_7__["default"].ID)) {
        entry[_constants_DashConstants_js__WEBPACK_IMPORTED_MODULE_7__["default"].ID] = parseInt(prt[_constants_DashConstants_js__WEBPACK_IMPORTED_MODULE_7__["default"].ID]);
      } else {
        // Ignore. Missing mandatory attribute
        return;
      }
      if (prt.hasOwnProperty(_constants_DashConstants_js__WEBPACK_IMPORTED_MODULE_7__["default"].WALL_CLOCK_TIME)) {
        entry[_constants_DashConstants_js__WEBPACK_IMPORTED_MODULE_7__["default"].WALL_CLOCK_TIME] = prt[_constants_DashConstants_js__WEBPACK_IMPORTED_MODULE_7__["default"].WALL_CLOCK_TIME];
      } else {
        // Ignore. Missing mandatory attribute
        return;
      }
      if (prt.hasOwnProperty(_constants_DashConstants_js__WEBPACK_IMPORTED_MODULE_7__["default"].PRESENTATION_TIME)) {
        entry[_constants_DashConstants_js__WEBPACK_IMPORTED_MODULE_7__["default"].PRESENTATION_TIME] = prt[_constants_DashConstants_js__WEBPACK_IMPORTED_MODULE_7__["default"].PRESENTATION_TIME];
      } else {
        // Ignore. Missing mandatory attribute
        return;
      }
      if (prt.hasOwnProperty(_constants_DashConstants_js__WEBPACK_IMPORTED_MODULE_7__["default"].INBAND)) {
        entry[_constants_DashConstants_js__WEBPACK_IMPORTED_MODULE_7__["default"].INBAND] = prt[_constants_DashConstants_js__WEBPACK_IMPORTED_MODULE_7__["default"].INBAND] !== 'false';
      }
      if (prt.hasOwnProperty(_constants_DashConstants_js__WEBPACK_IMPORTED_MODULE_7__["default"].TYPE)) {
        entry[_constants_DashConstants_js__WEBPACK_IMPORTED_MODULE_7__["default"].TYPE] = prt[_constants_DashConstants_js__WEBPACK_IMPORTED_MODULE_7__["default"].TYPE];
      }

      // Not interested in other attributes for now
      // UTC element contained must be same as that in the MPD
      prtsForAdaptation.push(entry);
    });
    return prtsForAdaptation;
  }
  function getLanguageForAdaptation(adaptation) {
    let lang = '';
    if (adaptation && adaptation.hasOwnProperty(_constants_DashConstants_js__WEBPACK_IMPORTED_MODULE_7__["default"].LANG)) {
      lang = adaptation.lang;
    }
    return lang;
  }
  function getViewpointForAdaptation(adaptation) {
    if (!adaptation || !adaptation.hasOwnProperty(_constants_DashConstants_js__WEBPACK_IMPORTED_MODULE_7__["default"].VIEWPOINT) || !adaptation[_constants_DashConstants_js__WEBPACK_IMPORTED_MODULE_7__["default"].VIEWPOINT].length) {
      return [];
    }
    return adaptation[_constants_DashConstants_js__WEBPACK_IMPORTED_MODULE_7__["default"].VIEWPOINT].map(viewpoint => {
      const vp = new _vo_DescriptorType_js__WEBPACK_IMPORTED_MODULE_10__["default"]();
      vp.init(viewpoint);
      return vp;
    });
  }
  function getRolesForAdaptation(adaptation) {
    if (!adaptation || !adaptation.hasOwnProperty(_constants_DashConstants_js__WEBPACK_IMPORTED_MODULE_7__["default"].ROLE) || !adaptation[_constants_DashConstants_js__WEBPACK_IMPORTED_MODULE_7__["default"].ROLE].length) {
      return [];
    }
    return adaptation[_constants_DashConstants_js__WEBPACK_IMPORTED_MODULE_7__["default"].ROLE].map(role => {
      // conceal misspelled "Main" from earlier MPEG-DASH editions (fixed with 6th edition)
      if (role.schemeIdUri === _streaming_constants_Constants_js__WEBPACK_IMPORTED_MODULE_4__["default"].DASH_ROLE_SCHEME_ID && role.value === 'Main') {
        role.value = _constants_DashConstants_js__WEBPACK_IMPORTED_MODULE_7__["default"].MAIN;
      }
      const r = new _vo_DescriptorType_js__WEBPACK_IMPORTED_MODULE_10__["default"]();
      r.init(role);
      return r;
    });
  }
  function getAccessibilityForAdaptation(adaptation) {
    if (!adaptation || !adaptation.hasOwnProperty(_constants_DashConstants_js__WEBPACK_IMPORTED_MODULE_7__["default"].ACCESSIBILITY) || !adaptation[_constants_DashConstants_js__WEBPACK_IMPORTED_MODULE_7__["default"].ACCESSIBILITY].length) {
      return [];
    }
    return adaptation[_constants_DashConstants_js__WEBPACK_IMPORTED_MODULE_7__["default"].ACCESSIBILITY].map(accessibility => {
      const a = new _vo_DescriptorType_js__WEBPACK_IMPORTED_MODULE_10__["default"]();
      a.init(accessibility);
      return a;
    });
  }
  function getAudioChannelConfigurationForAdaptation(adaptation) {
    if (!adaptation || !adaptation.hasOwnProperty(_constants_DashConstants_js__WEBPACK_IMPORTED_MODULE_7__["default"].AUDIO_CHANNEL_CONFIGURATION) || !adaptation[_constants_DashConstants_js__WEBPACK_IMPORTED_MODULE_7__["default"].AUDIO_CHANNEL_CONFIGURATION].length) {
      return [];
    }
    return adaptation[_constants_DashConstants_js__WEBPACK_IMPORTED_MODULE_7__["default"].AUDIO_CHANNEL_CONFIGURATION].map(audioChanCfg => {
      const acc = new _vo_DescriptorType_js__WEBPACK_IMPORTED_MODULE_10__["default"]();
      acc.init(audioChanCfg);
      return acc;
    });
  }
  function getAudioChannelConfigurationForRepresentation(representation) {
    if (!representation || !representation.hasOwnProperty(_constants_DashConstants_js__WEBPACK_IMPORTED_MODULE_7__["default"].AUDIO_CHANNEL_CONFIGURATION) || !representation[_constants_DashConstants_js__WEBPACK_IMPORTED_MODULE_7__["default"].AUDIO_CHANNEL_CONFIGURATION].length) {
      return [];
    }
    return representation[_constants_DashConstants_js__WEBPACK_IMPORTED_MODULE_7__["default"].AUDIO_CHANNEL_CONFIGURATION].map(audioChanCfg => {
      const acc = new _vo_DescriptorType_js__WEBPACK_IMPORTED_MODULE_10__["default"]();
      acc.init(audioChanCfg);
      return acc;
    });
  }
  function getRepresentationSortFunction() {
    return (a, b) => a.bandwidth - b.bandwidth;
  }
  function processAdaptation(realAdaptation) {
    if (realAdaptation && realAdaptation.Representation) {
      realAdaptation.Representation.sort(getRepresentationSortFunction());
    }
    return realAdaptation;
  }
  function getRealAdaptations(manifest, periodIndex) {
    return manifest && manifest.Period && isInteger(periodIndex) ? manifest.Period[periodIndex] ? manifest.Period[periodIndex].AdaptationSet : [] : [];
  }
  function getRealPeriods(manifest) {
    return manifest && manifest.Period ? manifest.Period : [];
  }
  function getRealPeriodForIndex(index, manifest) {
    const realPeriods = getRealPeriods(manifest);
    if (realPeriods.length > 0 && isInteger(index)) {
      return realPeriods[index];
    } else {
      return null;
    }
  }
  function getAdaptationForId(id, manifest, periodIndex) {
    const realAdaptations = getRealAdaptations(manifest, periodIndex);
    let i, len;
    for (i = 0, len = realAdaptations.length; i < len; i++) {
      if (realAdaptations[i].hasOwnProperty(_constants_DashConstants_js__WEBPACK_IMPORTED_MODULE_7__["default"].ID) && realAdaptations[i].id === id) {
        return realAdaptations[i];
      }
    }
    return null;
  }
  function getAdaptationForIndex(index, manifest, periodIndex) {
    const realAdaptations = getRealAdaptations(manifest, periodIndex);
    if (realAdaptations.length > 0 && isInteger(index)) {
      return realAdaptations[index];
    } else {
      return null;
    }
  }
  function getIndexForAdaptation(realAdaptation, manifest, periodIndex) {
    if (!realAdaptation) {
      return -1;
    }
    const realAdaptations = getRealAdaptations(manifest, periodIndex);
    for (let i = 0; i < realAdaptations.length; i++) {
      let objectUtils = (0,_streaming_utils_ObjectUtils_js__WEBPACK_IMPORTED_MODULE_17__["default"])(context).getInstance();
      if (objectUtils.areEqual(realAdaptations[i], realAdaptation)) {
        return i;
      }
    }
    return -1;
  }
  function getAdaptationsForType(manifest, periodIndex, type) {
    const realAdaptations = getRealAdaptations(manifest, periodIndex);
    let i, len;
    const adaptations = [];
    for (i = 0, len = realAdaptations.length; i < len; i++) {
      if (getIsTypeOf(realAdaptations[i], type)) {
        adaptations.push(processAdaptation(realAdaptations[i]));
      }
    }
    return adaptations;
  }
  function getCodec(adaptation, representationIndex, addResolutionInfo) {
    let codec = null;
    if (adaptation && adaptation.Representation && adaptation.Representation.length > 0) {
      const representation = isInteger(representationIndex) && representationIndex >= 0 && representationIndex < adaptation.Representation.length ? adaptation.Representation[representationIndex] : adaptation.Representation[0];
      if (representation) {
        codec = representation.mimeType + ';codecs="' + representation.codecs + '"';
        if (addResolutionInfo && representation.width !== undefined) {
          codec += ';width="' + representation.width + '";height="' + representation.height + '"';
        }
      }
    }

    // If the codec contains a profiles parameter we remove it. Otherwise, it will cause problems when checking for codec capabilities of the platform
    if (codec) {
      codec = codec.replace(/\sprofiles=[^;]*/g, '');
    }
    return codec;
  }
  function getCodecForPreselection(preselection, adaptations, addResolutionInfo) {
    let codec = null;
    if (preselection && adaptations) {
      const mainAdaptationSet = getMainAdaptationSetForPreselection(preselection, adaptations);
      let mainAsCodec = getCodec(mainAdaptationSet, 0, addResolutionInfo);
      // we just take the subparameters from the first Representation of the main AdaptationSet

      if (preselection.hasOwnProperty(_constants_DashConstants_js__WEBPACK_IMPORTED_MODULE_7__["default"].CODECS)) {
        let sCodecs = preselection.codecs;

        // Since Preselection elements don't get the @mimeType attribute assigned, this
        // copies the media type from the main adaptationSet but takes the codec from
        // the preselection.
        codec = mainAsCodec.replace(/(codecs=")[^"]*(")/, `$1${sCodecs}$2`);
        logger.info('Preselection has own codecs-attribute: replacing in MainAdaptationSet (was: ' + mainAsCodec + '), new Preselection codec is: ' + codec);
      } else {
        codec = mainAsCodec;
      }
    }
    return codec;
  }
  function getMimeType(adaptation) {
    return adaptation && adaptation.Representation && adaptation.Representation.length > 0 ? adaptation.Representation[0].mimeType : null;
  }
  function getSegmentAlignment(adaptation) {
    if (adaptation && adaptation.hasOwnProperty(_constants_DashConstants_js__WEBPACK_IMPORTED_MODULE_7__["default"].SEGMENT_ALIGNMENT)) {
      return adaptation[_constants_DashConstants_js__WEBPACK_IMPORTED_MODULE_7__["default"].SEGMENT_ALIGNMENT] === 'true';
    }
    return false;
  }
  function getSubSegmentAlignment(adaptation) {
    if (adaptation && adaptation.hasOwnProperty(_constants_DashConstants_js__WEBPACK_IMPORTED_MODULE_7__["default"].SUB_SEGMENT_ALIGNMENT)) {
      return adaptation[_constants_DashConstants_js__WEBPACK_IMPORTED_MODULE_7__["default"].SUB_SEGMENT_ALIGNMENT] === 'true';
    }
    return false;
  }
  function getLabelsForAdaptation(adaptation) {
    if (!adaptation || !adaptation.Label) {
      return [];
    }
    const labelArray = [];
    for (let i = 0; i < adaptation.Label.length; i++) {
      labelArray.push({
        lang: adaptation.Label[i].lang,
        text: adaptation.Label[i].__text || adaptation.Label[i]
      });
    }
    return labelArray;
  }
  function isPeriodEncrypted(period) {
    const contentProtectionElements = getContentProtectionByPeriod(period);
    return contentProtectionElements && contentProtectionElements.length > 0;
  }
  function getContentProtectionByManifest(manifest) {
    let protectionElements = [];
    if (!manifest) {
      return protectionElements;
    }
    const mpdElements = _getContentProtectionFromElement(manifest);
    protectionElements = protectionElements.concat(mpdElements);
    if (manifest.hasOwnProperty(_constants_DashConstants_js__WEBPACK_IMPORTED_MODULE_7__["default"].PERIOD) && manifest[_constants_DashConstants_js__WEBPACK_IMPORTED_MODULE_7__["default"].PERIOD].length > 0) {
      manifest[_constants_DashConstants_js__WEBPACK_IMPORTED_MODULE_7__["default"].PERIOD].forEach(period => {
        const curr = getContentProtectionByPeriod(period);
        protectionElements = protectionElements.concat(curr);
      });
    }
    return protectionElements;
  }
  function getContentProtectionByPeriod(period) {
    let protectionElements = [];
    if (!period) {
      return protectionElements;
    }
    const periodProtectionElements = _getContentProtectionFromElement(period);
    protectionElements = protectionElements.concat(periodProtectionElements);
    if (period.hasOwnProperty(_constants_DashConstants_js__WEBPACK_IMPORTED_MODULE_7__["default"].ADAPTATION_SET) && period[_constants_DashConstants_js__WEBPACK_IMPORTED_MODULE_7__["default"].ADAPTATION_SET].length > 0) {
      period[_constants_DashConstants_js__WEBPACK_IMPORTED_MODULE_7__["default"].ADAPTATION_SET].forEach(adaptation => {
        const curr = _getContentProtectionFromElement(adaptation);
        protectionElements = protectionElements.concat(curr);
      });
    }
    return protectionElements;
  }
  function getContentProtectionByAdaptation(adaptation) {
    return _getContentProtectionFromElement(adaptation);
  }
  function _getContentProtectionFromElement(element) {
    if (!element || !element.hasOwnProperty(_constants_DashConstants_js__WEBPACK_IMPORTED_MODULE_7__["default"].CONTENT_PROTECTION) || element.ContentProtection.length === 0) {
      return [];
    }
    return element[_constants_DashConstants_js__WEBPACK_IMPORTED_MODULE_7__["default"].CONTENT_PROTECTION].map(contentProtectionData => {
      const contentProtection = new _vo_ContentProtection_js__WEBPACK_IMPORTED_MODULE_5__["default"]();
      contentProtection.init(contentProtectionData);
      return contentProtection;
    });
  }
  function getIsDynamic(manifest) {
    let isDynamic = false;
    if (manifest && manifest.hasOwnProperty('type')) {
      isDynamic = manifest.type === _constants_DashConstants_js__WEBPACK_IMPORTED_MODULE_7__["default"].DYNAMIC;
    }
    return isDynamic;
  }
  function getId(manifest) {
    return manifest && manifest[_constants_DashConstants_js__WEBPACK_IMPORTED_MODULE_7__["default"].ID] || null;
  }
  function hasProfile(manifest, profile) {
    let has = false;
    if (manifest && manifest.profiles && manifest.profiles.length > 0) {
      has = manifest.profiles.indexOf(profile) !== -1;
    }
    return has;
  }
  function getDuration(manifest) {
    let mpdDuration;
    //@mediaPresentationDuration specifies the duration of the entire Media Presentation.
    //If the attribute is not present, the duration of the Media Presentation is unknown.
    if (manifest && manifest.hasOwnProperty(_constants_DashConstants_js__WEBPACK_IMPORTED_MODULE_7__["default"].MEDIA_PRESENTATION_DURATION)) {
      mpdDuration = manifest.mediaPresentationDuration;
    } else if (manifest && manifest.type === 'dynamic') {
      mpdDuration = Number.POSITIVE_INFINITY;
    } else {
      mpdDuration = Number.MAX_SAFE_INTEGER || Number.MAX_VALUE;
    }
    return mpdDuration;
  }
  function getBandwidth(representation) {
    return representation && representation.bandwidth ? representation.bandwidth : NaN;
  }
  function getFramerate(realRepresentation) {
    if (!realRepresentation) {
      return null;
    }
    const frameRate = realRepresentation[_constants_DashConstants_js__WEBPACK_IMPORTED_MODULE_7__["default"].FRAMERATE];
    if (!frameRate) {
      return null;
    }
    if (typeof frameRate === 'string' && frameRate.includes('/')) {
      const [numerator, denominator] = frameRate.split('/').map(value => parseInt(value, 10));
      if (!isNaN(numerator) && !isNaN(denominator) && denominator !== 0) {
        return numerator / denominator;
      }
    }
    return parseInt(frameRate);
  }
  function getManifestUpdatePeriod(manifest, latencyOfLastUpdate = 0) {
    let delay = NaN;
    if (manifest && manifest.hasOwnProperty(_constants_DashConstants_js__WEBPACK_IMPORTED_MODULE_7__["default"].MINIMUM_UPDATE_PERIOD)) {
      delay = manifest.minimumUpdatePeriod;
    }
    return isNaN(delay) ? delay : Math.max(delay - latencyOfLastUpdate, 1);
  }
  function getPublishTime(manifest) {
    return manifest && manifest.hasOwnProperty(_constants_DashConstants_js__WEBPACK_IMPORTED_MODULE_7__["default"].PUBLISH_TIME) ? new Date(manifest[_constants_DashConstants_js__WEBPACK_IMPORTED_MODULE_7__["default"].PUBLISH_TIME]) : null;
  }
  function getRepresentationCount(adaptation) {
    return adaptation && adaptation.Representation ? adaptation.Representation.length : 0;
  }
  function getBitrateListForAdaptation(realAdaptation) {
    const processedRealAdaptation = processAdaptation(realAdaptation);
    const realRepresentations = processedRealAdaptation && processedRealAdaptation.Representation ? processedRealAdaptation.Representation : [];
    return realRepresentations.map(realRepresentation => {
      return {
        bandwidth: realRepresentation.bandwidth,
        width: realRepresentation.width || 0,
        height: realRepresentation.height || 0,
        scanType: realRepresentation.scanType || null,
        id: realRepresentation.id || null
      };
    });
  }
  function getSelectionPriority(realAdaption) {
    try {
      const priority = realAdaption && typeof realAdaption.selectionPriority !== 'undefined' ? parseInt(realAdaption.selectionPriority) : 1;
      return isNaN(priority) ? 1 : priority;
    } catch (e) {
      return 1;
    }
  }

  // propertyType is one of { DashConstants.ESSENTIAL_PROPERTY, DashConstants.SUPPLEMENTAL_PROPERTY }
  function _getProperties(propertyType, element) {
    if (!element || !element.hasOwnProperty(propertyType) || !element[propertyType].length) {
      return [];
    }
    return element[propertyType].map(property => {
      const s = new _vo_DescriptorType_js__WEBPACK_IMPORTED_MODULE_10__["default"]();
      s.init(property);
      return s;
    });
  }
  function _getPropertiesCommonToAllRepresentations(propertyType, repr) {
    if (!repr || !repr.length) {
      return [];
    }
    let propertiesOfFirstRepresentation = repr[0][propertyType] || [];
    if (propertiesOfFirstRepresentation.length === 0) {
      return [];
    }
    if (repr.length === 1) {
      return propertiesOfFirstRepresentation;
    }

    // now, only return properties present on all Representations
    // repr.length is always >= 2
    return propertiesOfFirstRepresentation.filter(prop => {
      return repr.slice(1).every(currRep => {
        return currRep.hasOwnProperty(propertyType) && currRep[propertyType].some(e => {
          return e.schemeIdUri === prop.schemeIdUri && e.value === prop.value;
        });
      });
    });
  }
  function _getCombinedPropertiesForAdaptationSet(propertyType, adaptation) {
    if (!adaptation) {
      return [];
    }
    let allProperties = _getPropertiesCommonToAllRepresentations(propertyType, adaptation[_constants_DashConstants_js__WEBPACK_IMPORTED_MODULE_7__["default"].REPRESENTATION]);

    // now, only take those Properties from AdaptationSet which we didn't already get from Representations
    if (adaptation.hasOwnProperty(propertyType) && adaptation[propertyType].length) {
      adaptation[propertyType].forEach(adaptationProp => {
        const alreadyPresent = allProperties.some(d => {
          return d.schemeIdUri === adaptationProp.schemeIdUri && d.value === adaptationProp.value;
        });
        if (!alreadyPresent) {
          allProperties.push(adaptationProp);
        }
      });
    }
    return allProperties.map(essentialProperty => {
      const s = new _vo_DescriptorType_js__WEBPACK_IMPORTED_MODULE_10__["default"]();
      s.init(essentialProperty);
      return s;
    });
  }
  function getEssentialProperties(element) {
    return _getProperties(_constants_DashConstants_js__WEBPACK_IMPORTED_MODULE_7__["default"].ESSENTIAL_PROPERTY, element);
  }
  function getCombinedEssentialPropertiesForAdaptationSet(adaptation) {
    return _getCombinedPropertiesForAdaptationSet(_constants_DashConstants_js__WEBPACK_IMPORTED_MODULE_7__["default"].ESSENTIAL_PROPERTY, adaptation);
  }
  function getSupplementalProperties(element) {
    return _getProperties(_constants_DashConstants_js__WEBPACK_IMPORTED_MODULE_7__["default"].SUPPLEMENTAL_PROPERTY, element);
  }
  function getCombinedSupplementalPropertiesForAdaptationSet(adaptation) {
    return _getCombinedPropertiesForAdaptationSet(_constants_DashConstants_js__WEBPACK_IMPORTED_MODULE_7__["default"].SUPPLEMENTAL_PROPERTY, adaptation);
  }
  function getSegmentSequencePropertiesForAdaptationSet(adaptation) {
    const segmentSequenceProperties = [];
    if (!adaptation) {
      return segmentSequenceProperties;
    }
    segmentSequenceProperties.push(..._getSegmentSequencePropertiesForElement(adaptation));
    if (adaptation.Representation && adaptation.Representation.length) {
      adaptation.Representation.forEach(representation => {
        segmentSequenceProperties.push(..._getSegmentSequencePropertiesForElement(representation));
      });
    }
    return segmentSequenceProperties;
  }
  function _getSegmentSequencePropertiesForElement(element) {
    if (!element || !element.hasOwnProperty(_constants_DashConstants_js__WEBPACK_IMPORTED_MODULE_7__["default"].SEGMENT_SEQUENCE_PROPERTIES) || !element[_constants_DashConstants_js__WEBPACK_IMPORTED_MODULE_7__["default"].SEGMENT_SEQUENCE_PROPERTIES].length) {
      return [];
    }
    return element[_constants_DashConstants_js__WEBPACK_IMPORTED_MODULE_7__["default"].SEGMENT_SEQUENCE_PROPERTIES].map(property => {
      const segmentSequenceProperties = new _vo_SegmentSequenceProperties_js__WEBPACK_IMPORTED_MODULE_26__["default"](property);
      segmentSequenceProperties.init(property);
      return segmentSequenceProperties;
    });
  }
  function getRepresentationFor(index, adaptation) {
    return adaptation && adaptation.Representation && adaptation.Representation.length > 0 && isInteger(index) ? adaptation.Representation[index] : null;
  }
  function getRealAdaptationFor(voAdaptation) {
    if (voAdaptation && voAdaptation.period && isInteger(voAdaptation.period.index)) {
      const periodArray = voAdaptation.period.mpd.manifest.Period[voAdaptation.period.index];
      if (periodArray && periodArray.AdaptationSet && isInteger(voAdaptation.index)) {
        return processAdaptation(periodArray.AdaptationSet[voAdaptation.index]);
      }
    }
  }
  function getRepresentationsForAdaptation(voAdaptation, mediaInfo) {
    const voRepresentations = [];
    const processedRealAdaptation = getRealAdaptationFor(voAdaptation);
    let baseUrl;
    if (processedRealAdaptation && processedRealAdaptation.Representation) {
      // TODO: TO BE REMOVED. We should get just the baseUrl elements that affects to the representations
      // that we are processing. Making it works properly will require much further changes and given
      // parsing base Urls parameters is needed for our ultra low latency examples, we will
      // keep this "tricky" code until the real (and good) solution comes
      if (voAdaptation && voAdaptation.period && isInteger(voAdaptation.period.index)) {
        const baseUrls = getBaseURLsFromElement(voAdaptation.period.mpd.manifest);
        if (baseUrls) {
          baseUrl = baseUrls[0];
        }
      }
      for (let i = 0, len = processedRealAdaptation.Representation.length; i < len; ++i) {
        const realRepresentation = processedRealAdaptation.Representation[i];
        const voRepresentation = _createVoRepresentation(mediaInfo, realRepresentation, voAdaptation, processedRealAdaptation, baseUrl, i);
        voRepresentations.push(voRepresentation);
      }
    }
    return voRepresentations;
  }
  function _createVoRepresentation(mediaInfo, realRepresentation, voAdaptation, processedRealAdaptation, baseUrl, index) {
    const voRepresentation = new _vo_Representation_js__WEBPACK_IMPORTED_MODULE_22__["default"]();
    _assignDefaultAttributesToVoRepresentation(voRepresentation, realRepresentation, voAdaptation, mediaInfo, index);
    const {
      segmentInfo,
      segmentInfoType
    } = _deriveSegmentInfo(realRepresentation);
    voRepresentation.segmentInfoType = segmentInfoType;
    _processSegmentInfo(segmentInfo, segmentInfoType, voRepresentation, processedRealAdaptation, realRepresentation, baseUrl);
    _assignPixelValues(voRepresentation);
    return voRepresentation;
  }
  function _assignDefaultAttributesToVoRepresentation(voRepresentation, realRepresentation, voAdaptation, mediaInfo, index) {
    voRepresentation.index = index;
    voRepresentation.adaptation = voAdaptation;
    voRepresentation.mediaInfo = mediaInfo;
    if (realRepresentation.hasOwnProperty(_constants_DashConstants_js__WEBPACK_IMPORTED_MODULE_7__["default"].ID)) {
      voRepresentation.id = realRepresentation.id;
    }
    if (realRepresentation.hasOwnProperty(_constants_DashConstants_js__WEBPACK_IMPORTED_MODULE_7__["default"].CODECS)) {
      voRepresentation.codecs = realRepresentation.codecs;
      voRepresentation.codecFamily = _core_Utils_js__WEBPACK_IMPORTED_MODULE_25__["default"].getCodecFamily(voRepresentation.codecs);
    }
    if (realRepresentation.hasOwnProperty(_constants_DashConstants_js__WEBPACK_IMPORTED_MODULE_7__["default"].DEPENDENCY_ID)) {
      // According to spec, the DEPENDENCY_ID attribute is a space-separated list of ID values
      // Only using the first ID from this list as the handling of multiple IDs is not supported yet
      const dependencyIdListString = realRepresentation[_constants_DashConstants_js__WEBPACK_IMPORTED_MODULE_7__["default"].DEPENDENCY_ID].toString();
      const dependencyIds = dependencyIdListString.split(' ');
      const dependencyId = dependencyIds[0];
      voRepresentation.dependencyId = dependencyId;
      voRepresentation.dependentRepresentation = new _vo_Representation_js__WEBPACK_IMPORTED_MODULE_22__["default"]();
      voRepresentation.dependentRepresentation.id = dependencyId;
    }
    if (realRepresentation.hasOwnProperty(_constants_DashConstants_js__WEBPACK_IMPORTED_MODULE_7__["default"].MIME_TYPE)) {
      voRepresentation.mimeType = realRepresentation[_constants_DashConstants_js__WEBPACK_IMPORTED_MODULE_7__["default"].MIME_TYPE];
    }
    if (realRepresentation.hasOwnProperty(_constants_DashConstants_js__WEBPACK_IMPORTED_MODULE_7__["default"].CODEC_PRIVATE_DATA)) {
      voRepresentation.codecPrivateData = realRepresentation.codecPrivateData;
    }
    if (realRepresentation.hasOwnProperty(_constants_DashConstants_js__WEBPACK_IMPORTED_MODULE_7__["default"].BANDWITH)) {
      voRepresentation.bandwidth = realRepresentation.bandwidth;
      voRepresentation.bitrateInKbit = realRepresentation.bandwidth / 1000;
    }
    if (realRepresentation.hasOwnProperty(_constants_DashConstants_js__WEBPACK_IMPORTED_MODULE_7__["default"].WIDTH)) {
      voRepresentation.width = realRepresentation.width;
    }
    if (realRepresentation.hasOwnProperty(_constants_DashConstants_js__WEBPACK_IMPORTED_MODULE_7__["default"].HEIGHT)) {
      voRepresentation.height = realRepresentation.height;
    }
    if (realRepresentation.hasOwnProperty(_constants_DashConstants_js__WEBPACK_IMPORTED_MODULE_7__["default"].SCAN_TYPE)) {
      voRepresentation.scanType = realRepresentation.scanType;
    }
    if (realRepresentation.hasOwnProperty(_constants_DashConstants_js__WEBPACK_IMPORTED_MODULE_7__["default"].FRAMERATE)) {
      voRepresentation.frameRate = getFramerate(realRepresentation);
    }
    if (realRepresentation.hasOwnProperty(_constants_DashConstants_js__WEBPACK_IMPORTED_MODULE_7__["default"].QUALITY_RANKING)) {
      voRepresentation.qualityRanking = realRepresentation[_constants_DashConstants_js__WEBPACK_IMPORTED_MODULE_7__["default"].QUALITY_RANKING];
    }
    if (realRepresentation.hasOwnProperty(_constants_DashConstants_js__WEBPACK_IMPORTED_MODULE_7__["default"].MAX_PLAYOUT_RATE)) {
      voRepresentation.maxPlayoutRate = realRepresentation.maxPlayoutRate;
    }
    voRepresentation.essentialProperties = getEssentialProperties(realRepresentation);
    voRepresentation.supplementalProperties = getSupplementalProperties(realRepresentation);
    voRepresentation.segmentSequenceProperties = _getSegmentSequencePropertiesForElement(realRepresentation);
    voRepresentation.path = [voAdaptation.period.index, voAdaptation.index, index];
  }
  function _deriveSegmentInfo(realRepresentation) {
    let segmentInfo;
    let segmentInfoType;
    if (realRepresentation.hasOwnProperty(_constants_DashConstants_js__WEBPACK_IMPORTED_MODULE_7__["default"].SEGMENT_BASE)) {
      segmentInfo = realRepresentation.SegmentBase;
      segmentInfoType = _constants_DashConstants_js__WEBPACK_IMPORTED_MODULE_7__["default"].SEGMENT_BASE;
    } else if (realRepresentation.hasOwnProperty(_constants_DashConstants_js__WEBPACK_IMPORTED_MODULE_7__["default"].SEGMENT_LIST)) {
      segmentInfo = realRepresentation.SegmentList;
      if (segmentInfo.hasOwnProperty(_constants_DashConstants_js__WEBPACK_IMPORTED_MODULE_7__["default"].SEGMENT_TIMELINE)) {
        segmentInfoType = _constants_DashConstants_js__WEBPACK_IMPORTED_MODULE_7__["default"].SEGMENT_TIMELINE;
      } else {
        segmentInfoType = _constants_DashConstants_js__WEBPACK_IMPORTED_MODULE_7__["default"].SEGMENT_LIST;
      }
    } else if (realRepresentation.hasOwnProperty(_constants_DashConstants_js__WEBPACK_IMPORTED_MODULE_7__["default"].SEGMENT_TEMPLATE)) {
      segmentInfo = realRepresentation.SegmentTemplate;
      if (segmentInfo.hasOwnProperty(_constants_DashConstants_js__WEBPACK_IMPORTED_MODULE_7__["default"].SEGMENT_TIMELINE)) {
        segmentInfoType = _constants_DashConstants_js__WEBPACK_IMPORTED_MODULE_7__["default"].SEGMENT_TIMELINE;
      } else {
        segmentInfoType = _constants_DashConstants_js__WEBPACK_IMPORTED_MODULE_7__["default"].SEGMENT_TEMPLATE;
      }
    } else {
      segmentInfoType = _constants_DashConstants_js__WEBPACK_IMPORTED_MODULE_7__["default"].BASE_URL;
    }
    return {
      segmentInfo,
      segmentInfoType
    };
  }
  function _processSegmentInfo(segmentInfo, segmentInfoType, voRepresentation, processedRealAdaptation, realRepresentation, baseUrl) {
    if (!segmentInfo) {
      return;
    }
    if (segmentInfo.hasOwnProperty(_constants_DashConstants_js__WEBPACK_IMPORTED_MODULE_7__["default"].INITIALIZATION_MINUS)) {
      voRepresentation.initialization = segmentInfo.initialization.split('$Bandwidth$').join(realRepresentation.bandwidth).split('$RepresentationID$').join(realRepresentation.id);
    }
    if (segmentInfo.hasOwnProperty(_constants_DashConstants_js__WEBPACK_IMPORTED_MODULE_7__["default"].INITIALIZATION)) {
      const initialization = segmentInfo.Initialization;
      if (initialization.hasOwnProperty(_constants_DashConstants_js__WEBPACK_IMPORTED_MODULE_7__["default"].SOURCE_URL)) {
        voRepresentation.initialization = initialization.sourceURL;
      }
      if (initialization.hasOwnProperty(_constants_DashConstants_js__WEBPACK_IMPORTED_MODULE_7__["default"].RANGE)) {
        voRepresentation.range = initialization.range;
        // initialization source url will be determined from
        // BaseURL when resolved at load time.
      }
    } else if (getIsText(processedRealAdaptation) && getIsFragmented(processedRealAdaptation) && processedRealAdaptation.mimeType && processedRealAdaptation.mimeType.indexOf('application/mp4') === -1) {
      voRepresentation.range = 0;
    }
    if (segmentInfo.hasOwnProperty(_constants_DashConstants_js__WEBPACK_IMPORTED_MODULE_7__["default"].TIMESCALE)) {
      voRepresentation.timescale = segmentInfo.timescale;
    }
    if (segmentInfo.hasOwnProperty(_constants_DashConstants_js__WEBPACK_IMPORTED_MODULE_7__["default"].DURATION)) {
      // TODO according to the spec @maxSegmentDuration specifies the maximum duration of any Segment in any Representation in the Media Presentation
      // It is also said that for a SegmentTimeline any @d value shall not exceed the value of MPD@maxSegmentDuration, but nothing is said about
      // SegmentTemplate @duration attribute. We need to find out if @maxSegmentDuration should be used instead of calculated duration if the the duration
      // exceeds @maxSegmentDuration
      voRepresentation.segmentDuration = segmentInfo.duration / voRepresentation.timescale;
    } else if (segmentInfoType === _constants_DashConstants_js__WEBPACK_IMPORTED_MODULE_7__["default"].SEGMENT_TIMELINE) {
      voRepresentation.segmentDuration = calcSegmentDuration(segmentInfo.SegmentTimeline) / voRepresentation.timescale;
      voRepresentation.k = _getKValue(segmentInfo.SegmentTimeline);
    }
    if (segmentInfo.hasOwnProperty(_constants_DashConstants_js__WEBPACK_IMPORTED_MODULE_7__["default"].MEDIA)) {
      voRepresentation.media = segmentInfo.media;
    }
    if (segmentInfo.hasOwnProperty(_constants_DashConstants_js__WEBPACK_IMPORTED_MODULE_7__["default"].K)) {
      voRepresentation.k = segmentInfo.k || 1;
    }
    if (segmentInfo.hasOwnProperty(_constants_DashConstants_js__WEBPACK_IMPORTED_MODULE_7__["default"].START_NUMBER)) {
      voRepresentation.startNumber = parseInt(segmentInfo.startNumber);
    }
    if (segmentInfo.hasOwnProperty(_constants_DashConstants_js__WEBPACK_IMPORTED_MODULE_7__["default"].INDEX_RANGE)) {
      voRepresentation.indexRange = segmentInfo.indexRange;
    }
    if (segmentInfo.hasOwnProperty(_constants_DashConstants_js__WEBPACK_IMPORTED_MODULE_7__["default"].PRESENTATION_TIME_OFFSET)) {
      voRepresentation.presentationTimeOffset = segmentInfo.presentationTimeOffset / voRepresentation.timescale;
    }
    if (segmentInfo.hasOwnProperty(_constants_DashConstants_js__WEBPACK_IMPORTED_MODULE_7__["default"].AVAILABILITY_TIME_OFFSET)) {
      voRepresentation.availabilityTimeOffset = segmentInfo.availabilityTimeOffset;
    } else if (baseUrl && baseUrl.availabilityTimeOffset !== undefined) {
      voRepresentation.availabilityTimeOffset = baseUrl.availabilityTimeOffset;
    }
    if (segmentInfo.hasOwnProperty(_constants_DashConstants_js__WEBPACK_IMPORTED_MODULE_7__["default"].AVAILABILITY_TIME_COMPLETE)) {
      voRepresentation.availabilityTimeComplete = segmentInfo.availabilityTimeComplete !== 'false';
    } else if (baseUrl && baseUrl.availabilityTimeComplete !== undefined) {
      voRepresentation.availabilityTimeComplete = baseUrl.availabilityTimeComplete;
    }
    if (segmentInfo.hasOwnProperty(_constants_DashConstants_js__WEBPACK_IMPORTED_MODULE_7__["default"].END_NUMBER)) {
      voRepresentation.endNumber = segmentInfo[_constants_DashConstants_js__WEBPACK_IMPORTED_MODULE_7__["default"].END_NUMBER];
    }
    voRepresentation.mseTimeOffset = _calcMseTimeOffset(voRepresentation);
  }
  function _assignPixelValues(voRepresentation) {
    if (!isNaN(voRepresentation.width) && !isNaN(voRepresentation.height) && !isNaN(voRepresentation.frameRate)) {
      voRepresentation.pixelsPerSecond = Math.max(1, voRepresentation.width * voRepresentation.height * voRepresentation.frameRate);
      if (!isNaN(voRepresentation.bandwidth)) {
        voRepresentation.bitsPerPixel = voRepresentation.bandwidth / voRepresentation.pixelsPerSecond;
      }
    }
  }
  function calcSegmentDuration(segmentTimeline) {
    if (!segmentTimeline || !segmentTimeline.S) {
      return NaN;
    }
    let s0 = segmentTimeline.S[0];
    let s1 = segmentTimeline.S[1];
    return s0.hasOwnProperty('d') ? s0.d : s1.t - s0.t;
  }
  function _getKValue(segmentTimeline) {
    if (!segmentTimeline || !segmentTimeline.S) {
      return 1;
    }
    const s0 = segmentTimeline.S[0];
    return s0.hasOwnProperty(_constants_DashConstants_js__WEBPACK_IMPORTED_MODULE_7__["default"].K) ? s0.k : 1;
  }
  function _calcMseTimeOffset(representation) {
    // The MSEOffset is offset from AST for media. It is Period@start - presentationTimeOffset
    const presentationOffset = representation.presentationTimeOffset;
    const periodStart = representation.adaptation.period.start;
    return periodStart - presentationOffset;
  }
  function _convertType(element) {
    if (getIsMuxed(element)) {
      return _streaming_constants_Constants_js__WEBPACK_IMPORTED_MODULE_4__["default"].MUXED;
    } else if (getIsAudio(element)) {
      return _streaming_constants_Constants_js__WEBPACK_IMPORTED_MODULE_4__["default"].AUDIO;
    } else if (getIsVideo(element)) {
      return _streaming_constants_Constants_js__WEBPACK_IMPORTED_MODULE_4__["default"].VIDEO;
    } else if (getIsText(element)) {
      return _streaming_constants_Constants_js__WEBPACK_IMPORTED_MODULE_4__["default"].TEXT;
    } else if (getIsImage(element)) {
      return _streaming_constants_Constants_js__WEBPACK_IMPORTED_MODULE_4__["default"].IMAGE;
    } else {
      logger.warn('Unknown Preselection stream type');
    }
    return null;
  }
  function getAdaptationsForPeriod(voPeriod) {
    const realPeriod = voPeriod && isInteger(voPeriod.index) ? voPeriod.mpd.manifest.Period[voPeriod.index] : null;
    const voAdaptations = [];
    let voAdaptationSet, realAdaptationSet, i;
    if (realPeriod && realPeriod.AdaptationSet) {
      for (i = 0; i < realPeriod.AdaptationSet.length; i++) {
        realAdaptationSet = realPeriod.AdaptationSet[i];
        voAdaptationSet = new _vo_AdaptationSet_js__WEBPACK_IMPORTED_MODULE_0__["default"]();
        if (realAdaptationSet.hasOwnProperty(_constants_DashConstants_js__WEBPACK_IMPORTED_MODULE_7__["default"].ID)) {
          voAdaptationSet.id = realAdaptationSet.id;
        }
        voAdaptationSet.index = i;
        voAdaptationSet.period = voPeriod;
        voAdaptationSet.type = _convertType(realAdaptationSet);
        voAdaptations.push(voAdaptationSet);
      }
    }
    return voAdaptations;
  }
  function _getAllAdaptationSetsForPreselection(preselection, adaptations) {
    if (!preselection || !preselection.hasOwnProperty(_constants_DashConstants_js__WEBPACK_IMPORTED_MODULE_7__["default"].PRESELECTION_COMPONENTS) || !Array.isArray(adaptations)) {
      return undefined;
    }
    const preselectionComponentIds = String(preselection.preselectionComponents).split(' ');
    return preselectionComponentIds.map(c => adaptations.find(adaptation => adaptation.id === c));
  }
  function getMainAdaptationSetForPreselection(preselection, adaptations) {
    if (!preselection || !preselection.hasOwnProperty(_constants_DashConstants_js__WEBPACK_IMPORTED_MODULE_7__["default"].PRESELECTION_COMPONENTS) || !Array.isArray(adaptations)) {
      return undefined;
    }
    const preselectionComponentIds = String(preselection.preselectionComponents).split(' ');
    return adaptations.find(adaptation => adaptation.id === preselectionComponentIds[0]);
  }
  function getCommonRepresentationForPreselection(preselection, adaptations) {
    if (!preselection || !Array.isArray(adaptations)) {
      return undefined;
    }
    const mainAS = getMainAdaptationSetForPreselection(preselection, adaptations);
    return mainAS ? mainAS.Representation[0] : undefined;
  }
  function getPreselectionsForPeriod(voPeriod) {
    const realPeriod = voPeriod && isInteger(voPeriod.index) ? voPeriod.mpd.manifest.Period[voPeriod.index] : null;
    const voPreselections = [];
    let voPreselection, realPreselection, i;
    if (realPeriod && realPeriod.Preselection) {
      for (i = 0; i < realPeriod.Preselection.length; i++) {
        realPreselection = realPeriod.Preselection[i];
        voPreselection = new _vo_Preselection_js__WEBPACK_IMPORTED_MODULE_20__["default"]();
        const preselectionAdaptationSets = _getAllAdaptationSetsForPreselection(realPreselection, realPeriod.AdaptationSet);
        let allComponentsAvailable = preselectionAdaptationSets.every(adaptation => !!adaptation);

        // up to now, we only support single-representation preselections, not multi-representation
        if (allComponentsAvailable && preselectionAdaptationSets.length === 1) {
          if (realPreselection.hasOwnProperty(_constants_DashConstants_js__WEBPACK_IMPORTED_MODULE_7__["default"].ID)) {
            voPreselection.id = realPreselection.id;
          }
          voPreselection.index = i;
          voPreselection.period = voPeriod;
          if (realPreselection.hasOwnProperty(_constants_DashConstants_js__WEBPACK_IMPORTED_MODULE_7__["default"].TAG)) {
            voPreselection.tag = realPreselection.tag;
          }
          if (realPreselection.hasOwnProperty(_constants_DashConstants_js__WEBPACK_IMPORTED_MODULE_7__["default"].PRESELECTION_COMPONENTS)) {
            voPreselection.preselectionComponents = preselectionAdaptationSets;
          } else {
            logger.warn('Preselection (index: ' + voPreselection.index + ') missing component(s)');
          }
          if (realPreselection.hasOwnProperty(_constants_DashConstants_js__WEBPACK_IMPORTED_MODULE_7__["default"].ORDER)) {
            voPreselection.order = realPreselection.order;
          }
          voPreselection.type = _convertType(preselectionAdaptationSets[0]);
          voPreselections.push(voPreselection);
        } else {
          logger.warn('Preselection removed because we don\'t support multi-representation preselections or not all components available.');
        }
      }
    }
    return voPreselections;
  }
  function getRegularPeriods(mpd) {
    const isDynamic = mpd ? getIsDynamic(mpd.manifest) : false;
    const voPeriods = [];
    let realPreviousPeriod = null;
    let realPeriod = null;
    let voPreviousPeriod = null;
    let voPeriod = null;
    let len, i;
    for (i = 0, len = mpd && mpd.manifest && mpd.manifest.Period ? mpd.manifest.Period.length : 0; i < len; i++) {
      realPeriod = mpd.manifest.Period[i];

      // If the attribute @start is present in the Period, then the
      // Period is a regular Period and the PeriodStart is equal
      // to the value of this attribute.
      if (realPeriod.hasOwnProperty(_constants_DashConstants_js__WEBPACK_IMPORTED_MODULE_7__["default"].START)) {
        voPeriod = new _vo_Period_js__WEBPACK_IMPORTED_MODULE_19__["default"]();
        voPeriod.start = realPeriod.start;
      }
      // If the @start attribute is absent, but the previous Period element contains a @duration attribute then this new Period is also a regular Period. The start time of the new Period PeriodStart is the sum of the start time of the previous Period PeriodStart and the value of the attribute @duration of the previous Period.
      else if (realPreviousPeriod !== null && realPreviousPeriod.hasOwnProperty(_constants_DashConstants_js__WEBPACK_IMPORTED_MODULE_7__["default"].DURATION) && voPreviousPeriod !== null) {
        voPeriod = new _vo_Period_js__WEBPACK_IMPORTED_MODULE_19__["default"]();
        voPeriod.start = parseFloat((voPreviousPeriod.start + voPreviousPeriod.duration).toFixed(5));
      }
      // If (i) @start attribute is absent, and (ii) the Period element is the first in the MPD, and (iii) the MPD@type is 'static', then the PeriodStart time shall be set to zero.
      else if (i === 0 && !isDynamic) {
        voPeriod = new _vo_Period_js__WEBPACK_IMPORTED_MODULE_19__["default"]();
        voPeriod.start = 0;
      }

      // The Period extends until the PeriodStart of the next Period.
      // The difference between the PeriodStart time of a Period and
      // the PeriodStart time of the following Period.
      if (voPreviousPeriod !== null && isNaN(voPreviousPeriod.duration)) {
        if (voPeriod !== null) {
          voPreviousPeriod.duration = parseFloat((voPeriod.start - voPreviousPeriod.start).toFixed(5));
        } else {
          logger.warn('First period duration could not be calculated because lack of start and duration period properties. This will cause timing issues during playback');
        }
      }
      if (voPeriod !== null) {
        voPeriod.id = getPeriodId(realPeriod, i);
        voPeriod.index = i;
        voPeriod.mpd = mpd;
        voPeriod.isEncrypted = isPeriodEncrypted(realPeriod);
        if (realPeriod.hasOwnProperty(_constants_DashConstants_js__WEBPACK_IMPORTED_MODULE_7__["default"].DURATION)) {
          voPeriod.duration = realPeriod.duration;
        }
        if (voPreviousPeriod) {
          voPreviousPeriod.nextPeriodId = voPeriod.id;
        }
        voPeriods.push(voPeriod);
        realPreviousPeriod = realPeriod;
        voPreviousPeriod = voPeriod;
      }
      realPeriod = null;
      voPeriod = null;
    }
    if (voPeriods.length === 0) {
      return voPeriods;
    }

    // The last Period extends until the end of the Media Presentation.
    // The difference between the PeriodStart time of the last Period
    // and the mpd duration
    if (voPreviousPeriod !== null && isNaN(voPreviousPeriod.duration)) {
      voPreviousPeriod.duration = parseFloat((getEndTimeForLastPeriod(voPreviousPeriod) - voPreviousPeriod.start).toFixed(5));
    }
    return voPeriods;
  }
  function getPeriodId(realPeriod, i) {
    if (!realPeriod) {
      throw new Error('Period cannot be null or undefined');
    }
    let id = _vo_Period_js__WEBPACK_IMPORTED_MODULE_19__["default"].DEFAULT_ID + '_' + i;
    if (realPeriod.hasOwnProperty(_constants_DashConstants_js__WEBPACK_IMPORTED_MODULE_7__["default"].ID) && realPeriod.id.toString().length > 0 && realPeriod.id !== '__proto__') {
      id = realPeriod.id.toString();
    }
    return id;
  }
  function getMpd(manifest) {
    const mpd = new _vo_Mpd_js__WEBPACK_IMPORTED_MODULE_15__["default"]();
    if (manifest) {
      mpd.manifest = manifest;
      if (manifest.hasOwnProperty(_constants_DashConstants_js__WEBPACK_IMPORTED_MODULE_7__["default"].AVAILABILITY_START_TIME)) {
        mpd.availabilityStartTime = new Date(manifest.availabilityStartTime.getTime());
      } else {
        if (manifest.loadedTime) {
          mpd.availabilityStartTime = new Date(manifest.loadedTime.getTime());
        }
      }
      if (manifest.hasOwnProperty(_constants_DashConstants_js__WEBPACK_IMPORTED_MODULE_7__["default"].AVAILABILITY_END_TIME)) {
        mpd.availabilityEndTime = new Date(manifest.availabilityEndTime.getTime());
      }
      if (manifest.hasOwnProperty(_constants_DashConstants_js__WEBPACK_IMPORTED_MODULE_7__["default"].MINIMUM_UPDATE_PERIOD)) {
        mpd.minimumUpdatePeriod = manifest.minimumUpdatePeriod;
      }
      if (manifest.hasOwnProperty(_constants_DashConstants_js__WEBPACK_IMPORTED_MODULE_7__["default"].MEDIA_PRESENTATION_DURATION)) {
        mpd.mediaPresentationDuration = manifest.mediaPresentationDuration;
      }
      if (manifest.hasOwnProperty(_constants_DashConstants_js__WEBPACK_IMPORTED_MODULE_7__["default"].SUGGESTED_PRESENTATION_DELAY)) {
        mpd.suggestedPresentationDelay = manifest.suggestedPresentationDelay;
      }
      if (manifest.hasOwnProperty(_constants_DashConstants_js__WEBPACK_IMPORTED_MODULE_7__["default"].TIMESHIFT_BUFFER_DEPTH)) {
        mpd.timeShiftBufferDepth = manifest.timeShiftBufferDepth;
      }
      if (manifest.hasOwnProperty(_constants_DashConstants_js__WEBPACK_IMPORTED_MODULE_7__["default"].MAX_SEGMENT_DURATION)) {
        mpd.maxSegmentDuration = manifest.maxSegmentDuration;
      }
      if (manifest.hasOwnProperty(_constants_DashConstants_js__WEBPACK_IMPORTED_MODULE_7__["default"].PUBLISH_TIME)) {
        mpd.publishTime = new Date(manifest.publishTime);
      }
    }
    return mpd;
  }
  function checkConfig() {
    if (!errHandler || !errHandler.hasOwnProperty('error')) {
      throw new Error(_streaming_constants_Constants_js__WEBPACK_IMPORTED_MODULE_4__["default"].MISSING_CONFIG_ERROR);
    }
  }
  function getEndTimeForLastPeriod(voPeriod) {
    checkConfig();
    const isDynamic = getIsDynamic(voPeriod.mpd.manifest);
    let periodEnd;
    if (voPeriod.mpd.manifest.mediaPresentationDuration) {
      periodEnd = voPeriod.mpd.manifest.mediaPresentationDuration;
    } else if (voPeriod.duration) {
      periodEnd = voPeriod.duration;
    } else if (isDynamic) {
      periodEnd = Number.POSITIVE_INFINITY;
    } else {
      errHandler.error(new _streaming_vo_DashJSError_js__WEBPACK_IMPORTED_MODULE_8__["default"](_core_errors_Errors_js__WEBPACK_IMPORTED_MODULE_11__["default"].MANIFEST_ERROR_ID_PARSE_CODE, 'Must have @mediaPresentationDuration on MPD or an explicit @duration on the last period.', voPeriod));
    }
    return periodEnd;
  }
  function getEventsForPeriod(period) {
    const manifest = period && period.mpd && period.mpd.manifest ? period.mpd.manifest : null;
    const periodArray = manifest ? manifest.Period : null;
    const eventStreams = periodArray && period && isInteger(period.index) ? periodArray[period.index].EventStream : null;
    const events = [];
    let i, j;
    if (eventStreams) {
      for (i = 0; i < eventStreams.length; i++) {
        const eventStream = new _vo_EventStream_js__WEBPACK_IMPORTED_MODULE_13__["default"]();
        eventStream.period = period;
        eventStream.timescale = 1;
        if (eventStreams[i].hasOwnProperty(_streaming_constants_Constants_js__WEBPACK_IMPORTED_MODULE_4__["default"].SCHEME_ID_URI)) {
          eventStream.schemeIdUri = eventStreams[i][_streaming_constants_Constants_js__WEBPACK_IMPORTED_MODULE_4__["default"].SCHEME_ID_URI];
        } else {
          throw new Error('Invalid EventStream. SchemeIdUri has to be set');
        }
        if (eventStreams[i].hasOwnProperty(_constants_DashConstants_js__WEBPACK_IMPORTED_MODULE_7__["default"].TIMESCALE)) {
          eventStream.timescale = eventStreams[i][_constants_DashConstants_js__WEBPACK_IMPORTED_MODULE_7__["default"].TIMESCALE];
        }
        if (eventStreams[i].hasOwnProperty(_constants_DashConstants_js__WEBPACK_IMPORTED_MODULE_7__["default"].VALUE)) {
          eventStream.value = eventStreams[i][_constants_DashConstants_js__WEBPACK_IMPORTED_MODULE_7__["default"].VALUE];
        }
        if (eventStreams[i].hasOwnProperty(_constants_DashConstants_js__WEBPACK_IMPORTED_MODULE_7__["default"].PRESENTATION_TIME_OFFSET)) {
          eventStream.presentationTimeOffset = eventStreams[i][_constants_DashConstants_js__WEBPACK_IMPORTED_MODULE_7__["default"].PRESENTATION_TIME_OFFSET];
        }
        for (j = 0; eventStreams[i].Event && j < eventStreams[i].Event.length; j++) {
          const currentMpdEvent = eventStreams[i].Event[j];
          const event = new _vo_Event_js__WEBPACK_IMPORTED_MODULE_12__["default"]();
          event.presentationTime = 0;
          event.eventStream = eventStream;
          if (currentMpdEvent.hasOwnProperty(_constants_DashConstants_js__WEBPACK_IMPORTED_MODULE_7__["default"].PRESENTATION_TIME)) {
            event.presentationTime = currentMpdEvent.presentationTime;
          }
          const presentationTimeOffset = eventStream.presentationTimeOffset ? eventStream.presentationTimeOffset / eventStream.timescale : 0;
          event.calculatedPresentationTime = event.presentationTime / eventStream.timescale + period.start - presentationTimeOffset;
          if (currentMpdEvent.hasOwnProperty(_constants_DashConstants_js__WEBPACK_IMPORTED_MODULE_7__["default"].DURATION)) {
            event.duration = currentMpdEvent.duration / eventStream.timescale;
          }
          if (currentMpdEvent.hasOwnProperty(_constants_DashConstants_js__WEBPACK_IMPORTED_MODULE_7__["default"].ID)) {
            event.id = parseInt(currentMpdEvent.id);
          } else {
            event.id = null;
          }
          if (currentMpdEvent.Signal && currentMpdEvent.Signal.Binary && currentMpdEvent.Signal.Binary.__text) {
            // toString is used to manage both regular and namespaced tags
            event.messageData = BASE64.decodeArray(currentMpdEvent.Signal.Binary.__text.toString());
          } else {
            // From Cor.1: 'NOTE: this attribute is an alternative
            // to specifying a complete XML element(s) in the Event.
            // It is useful when an event leans itself to a compact
            // string representation'.
            event.messageData = currentMpdEvent.messageData || currentMpdEvent.__cdata || currentMpdEvent.__text;
          }
          events.push(event);
        }
      }
    }
    return events;
  }
  function getEventStreams(inbandStreams, representation, period) {
    const eventStreams = [];
    let i;
    if (!inbandStreams) {
      return eventStreams;
    }
    for (i = 0; i < inbandStreams.length; i++) {
      const eventStream = new _vo_EventStream_js__WEBPACK_IMPORTED_MODULE_13__["default"]();
      eventStream.timescale = 1;
      eventStream.representation = representation;
      if (inbandStreams[i].hasOwnProperty(_streaming_constants_Constants_js__WEBPACK_IMPORTED_MODULE_4__["default"].SCHEME_ID_URI)) {
        eventStream.schemeIdUri = inbandStreams[i].schemeIdUri;
      } else {
        throw new Error('Invalid EventStream. SchemeIdUri has to be set');
      }
      if (inbandStreams[i].hasOwnProperty(_constants_DashConstants_js__WEBPACK_IMPORTED_MODULE_7__["default"].TIMESCALE)) {
        eventStream.timescale = inbandStreams[i].timescale;
      }
      if (inbandStreams[i].hasOwnProperty(_constants_DashConstants_js__WEBPACK_IMPORTED_MODULE_7__["default"].VALUE)) {
        eventStream.value = inbandStreams[i].value;
      }
      eventStreams.push(eventStream);
      eventStream.period = period;
    }
    return eventStreams;
  }
  function getEventStreamForAdaptationSet(manifest, adaptation, period) {
    let inbandStreams, periodArray, adaptationArray;
    if (manifest && manifest.Period && adaptation && adaptation.period && isInteger(adaptation.period.index)) {
      periodArray = manifest.Period[adaptation.period.index];
      if (periodArray && periodArray.AdaptationSet && isInteger(adaptation.index)) {
        adaptationArray = periodArray.AdaptationSet[adaptation.index];
        if (adaptationArray) {
          inbandStreams = adaptationArray.InbandEventStream;
        }
      }
    }
    return getEventStreams(inbandStreams, null, period);
  }
  function getEventStreamForRepresentation(manifest, representation, period) {
    let inbandStreams, periodArray, adaptationArray, representationArray;
    if (manifest && manifest.Period && representation && representation.adaptation && representation.adaptation.period && isInteger(representation.adaptation.period.index)) {
      periodArray = manifest.Period[representation.adaptation.period.index];
      if (periodArray && periodArray.AdaptationSet && isInteger(representation.adaptation.index)) {
        adaptationArray = periodArray.AdaptationSet[representation.adaptation.index];
        if (adaptationArray && adaptationArray.Representation && isInteger(representation.index)) {
          representationArray = adaptationArray.Representation[representation.index];
          if (representationArray) {
            inbandStreams = representationArray.InbandEventStream;
          }
        }
      }
    }
    return getEventStreams(inbandStreams, representation, period);
  }
  function getUTCTimingSources(manifest) {
    const isDynamic = getIsDynamic(manifest);
    const hasAST = manifest ? manifest.hasOwnProperty(_constants_DashConstants_js__WEBPACK_IMPORTED_MODULE_7__["default"].AVAILABILITY_START_TIME) : false;
    const utcTimingsArray = manifest ? manifest.UTCTiming : null;
    const utcTimingEntries = [];

    // do not bother synchronizing the clock unless MPD is live,
    // or it is static and has availabilityStartTime attribute
    if (isDynamic || hasAST) {
      if (utcTimingsArray) {
        // the order is important here - 23009-1 states that the order
        // in the manifest "indicates relative preference, first having
        // the highest, and the last the lowest priority".
        utcTimingsArray.forEach(function (utcTiming) {
          const entry = new _vo_UTCTiming_js__WEBPACK_IMPORTED_MODULE_24__["default"]();
          if (utcTiming.hasOwnProperty(_streaming_constants_Constants_js__WEBPACK_IMPORTED_MODULE_4__["default"].SCHEME_ID_URI)) {
            entry.schemeIdUri = utcTiming.schemeIdUri;
          } else {
            // entries of type DescriptorType with no schemeIdUri
            // are meaningless. let's just ignore this entry and
            // move on.
            return;
          }

          // this is (incorrectly) interpreted as a number - schema
          // defines it as a string
          if (utcTiming.hasOwnProperty(_constants_DashConstants_js__WEBPACK_IMPORTED_MODULE_7__["default"].VALUE)) {
            entry.value = utcTiming.value.toString();
          } else {
            // without a value, there's not a lot we can do with
            // this entry. let's just ignore this one and move on
            return;
          }

          // we're not interested in the optional id or any other
          // attributes which might be attached to the entry

          utcTimingEntries.push(entry);
        });
      }
    }
    return utcTimingEntries;
  }
  function getBaseURLsFromElement(node) {
    const baseUrls = [];
    // if node.BaseURL and node.baseUri are undefined entries
    // will be [undefined] which entries.some will just skip
    const entries = node.BaseURL || [node.baseUri];
    let earlyReturn = false;
    entries.some(entry => {
      if (entry) {
        const baseUrl = new _vo_BaseURL_js__WEBPACK_IMPORTED_MODULE_1__["default"]();
        let text = entry.__text || entry;
        if (urlUtils.isRelative(text)) {
          // it doesn't really make sense to have relative and
          // absolute URLs at the same level, or multiple
          // relative URLs at the same level, so assume we are
          // done from this level of the MPD
          earlyReturn = true;

          // deal with the specific case where the MPD@BaseURL
          // is specified and is relative. when no MPD@BaseURL
          // entries exist, that case is handled by the
          // [node.baseUri] in the entries definition.
          if (node.baseUri) {
            text = urlUtils.resolve(text, node.baseUri);
          }
        }
        baseUrl.url = text;

        // serviceLocation is optional, but we need it in order
        // to blacklist correctly. if it's not available, use
        // anything unique since there's no relationship to any
        // other BaseURL and, in theory, the url should be
        // unique so use this instead.
        if (entry.hasOwnProperty(_constants_DashConstants_js__WEBPACK_IMPORTED_MODULE_7__["default"].SERVICE_LOCATION) && entry.serviceLocation.length) {
          baseUrl.serviceLocation = entry.serviceLocation;
        } else {
          baseUrl.serviceLocation = text;
        }
        if (entry.hasOwnProperty(_constants_DashConstants_js__WEBPACK_IMPORTED_MODULE_7__["default"].DVB_PRIORITY)) {
          baseUrl.dvbPriority = entry[_constants_DashConstants_js__WEBPACK_IMPORTED_MODULE_7__["default"].DVB_PRIORITY];
        }
        if (entry.hasOwnProperty(_constants_DashConstants_js__WEBPACK_IMPORTED_MODULE_7__["default"].DVB_WEIGHT)) {
          baseUrl.dvbWeight = entry[_constants_DashConstants_js__WEBPACK_IMPORTED_MODULE_7__["default"].DVB_WEIGHT];
        }
        if (entry.hasOwnProperty(_constants_DashConstants_js__WEBPACK_IMPORTED_MODULE_7__["default"].AVAILABILITY_TIME_OFFSET)) {
          baseUrl.availabilityTimeOffset = entry[_constants_DashConstants_js__WEBPACK_IMPORTED_MODULE_7__["default"].AVAILABILITY_TIME_OFFSET];
        }
        if (entry.hasOwnProperty(_constants_DashConstants_js__WEBPACK_IMPORTED_MODULE_7__["default"].AVAILABILITY_TIME_COMPLETE)) {
          baseUrl.availabilityTimeComplete = entry[_constants_DashConstants_js__WEBPACK_IMPORTED_MODULE_7__["default"].AVAILABILITY_TIME_COMPLETE] !== 'false';
        }
        /* NOTE: byteRange currently unused
         */

        baseUrls.push(baseUrl);
        return earlyReturn;
      }
    });
    return baseUrls;
  }
  function getContentSteering(manifest) {
    if (manifest && manifest.hasOwnProperty(_constants_DashConstants_js__WEBPACK_IMPORTED_MODULE_7__["default"].CONTENT_STEERING)) {
      // Only one ContentSteering element is supported on MPD level
      const element = manifest[_constants_DashConstants_js__WEBPACK_IMPORTED_MODULE_7__["default"].CONTENT_STEERING][0];
      return _createContentSteeringInstance(element);
    }
    return undefined;
  }
  function _createContentSteeringInstance(element) {
    const entry = new _vo_ContentSteering_js__WEBPACK_IMPORTED_MODULE_6__["default"]();
    entry.serverUrl = element.__text;
    if (element.hasOwnProperty(_constants_DashConstants_js__WEBPACK_IMPORTED_MODULE_7__["default"].DEFAULT_SERVICE_LOCATION)) {
      entry.defaultServiceLocation = element[_constants_DashConstants_js__WEBPACK_IMPORTED_MODULE_7__["default"].DEFAULT_SERVICE_LOCATION];
      entry.defaultServiceLocationArray = entry.defaultServiceLocation.split(' ');
    }
    if (element.hasOwnProperty(_constants_DashConstants_js__WEBPACK_IMPORTED_MODULE_7__["default"].QUERY_BEFORE_START)) {
      entry.queryBeforeStart = element[_constants_DashConstants_js__WEBPACK_IMPORTED_MODULE_7__["default"].QUERY_BEFORE_START].toLowerCase() === 'true';
    }
    if (element.hasOwnProperty(_constants_DashConstants_js__WEBPACK_IMPORTED_MODULE_7__["default"].CLIENT_REQUIREMENT)) {
      entry.clientRequirement = element[_constants_DashConstants_js__WEBPACK_IMPORTED_MODULE_7__["default"].CLIENT_REQUIREMENT].toLowerCase() !== 'false';
    }
    return entry;
  }
  function _createClientDataReportingInstance(element) {
    const entry = new _vo_ClientDataReporting_js__WEBPACK_IMPORTED_MODULE_3__["default"]();

    // Check if schemeIdUri is either in ClientDataReporting (v2) or CMCDParameters (v1)
    const schemeIdUri = element.schemeIdUri || element[_constants_DashConstants_js__WEBPACK_IMPORTED_MODULE_7__["default"].CMCD_PARAMETERS]?.schemeIdUri;
    const isCmcdSupported = [_streaming_constants_Constants_js__WEBPACK_IMPORTED_MODULE_4__["default"].CTA_5004_2023_SCHEME, _streaming_constants_Constants_js__WEBPACK_IMPORTED_MODULE_4__["default"].CTA_5004_2025_SCHEME].includes(schemeIdUri);
    if (element.hasOwnProperty(_constants_DashConstants_js__WEBPACK_IMPORTED_MODULE_7__["default"].CMCD_PARAMETERS) && isCmcdSupported) {
      entry.cmcdParameters = new _vo_CMCDParameters_js__WEBPACK_IMPORTED_MODULE_2__["default"]();
      entry.cmcdParameters.init(element[_constants_DashConstants_js__WEBPACK_IMPORTED_MODULE_7__["default"].CMCD_PARAMETERS]);
    }
    if (element.hasOwnProperty(_constants_DashConstants_js__WEBPACK_IMPORTED_MODULE_7__["default"].SERVICE_LOCATIONS) && element[_constants_DashConstants_js__WEBPACK_IMPORTED_MODULE_7__["default"].SERVICE_LOCATIONS] !== '') {
      entry.serviceLocations = element[_constants_DashConstants_js__WEBPACK_IMPORTED_MODULE_7__["default"].SERVICE_LOCATIONS];
      entry.serviceLocationsArray = entry.serviceLocations.toString().split(' ');
    }
    if (element.hasOwnProperty(_constants_DashConstants_js__WEBPACK_IMPORTED_MODULE_7__["default"].ADAPTATION_SETS) && element[_constants_DashConstants_js__WEBPACK_IMPORTED_MODULE_7__["default"].ADAPTATION_SETS] !== '') {
      entry.adaptationSets = element[_constants_DashConstants_js__WEBPACK_IMPORTED_MODULE_7__["default"].ADAPTATION_SETS];
      entry.adaptationSetsArray = entry.adaptationSets.toString().split(' ');
    }
    return entry;
  }
  function getLocation(manifest) {
    if (manifest && manifest.hasOwnProperty(_constants_DashConstants_js__WEBPACK_IMPORTED_MODULE_7__["default"].LOCATION)) {
      return manifest[_constants_DashConstants_js__WEBPACK_IMPORTED_MODULE_7__["default"].LOCATION].map(entry => {
        const text = entry.__text || entry;
        const serviceLocation = entry.hasOwnProperty(_constants_DashConstants_js__WEBPACK_IMPORTED_MODULE_7__["default"].SERVICE_LOCATION) ? entry[_constants_DashConstants_js__WEBPACK_IMPORTED_MODULE_7__["default"].SERVICE_LOCATION] : null;
        return new _vo_MpdLocation_js__WEBPACK_IMPORTED_MODULE_16__["default"](text, serviceLocation);
      });
    }
    return [];
  }
  function getPatchLocation(manifest) {
    if (manifest && manifest.hasOwnProperty(_constants_DashConstants_js__WEBPACK_IMPORTED_MODULE_7__["default"].PATCH_LOCATION)) {
      return manifest[_constants_DashConstants_js__WEBPACK_IMPORTED_MODULE_7__["default"].PATCH_LOCATION].map(entry => {
        const text = entry.__text || entry;
        const serviceLocation = entry.hasOwnProperty(_constants_DashConstants_js__WEBPACK_IMPORTED_MODULE_7__["default"].SERVICE_LOCATION) ? entry[_constants_DashConstants_js__WEBPACK_IMPORTED_MODULE_7__["default"].SERVICE_LOCATION] : null;
        let ttl = entry.hasOwnProperty(_constants_DashConstants_js__WEBPACK_IMPORTED_MODULE_7__["default"].TTL) ? parseFloat(entry[_constants_DashConstants_js__WEBPACK_IMPORTED_MODULE_7__["default"].TTL]) * 1000 : NaN;
        return new _vo_PatchLocation_js__WEBPACK_IMPORTED_MODULE_18__["default"](text, serviceLocation, ttl);
      });
    }
    return [];
  }
  function getSuggestedPresentationDelay(mpd) {
    return mpd && mpd.hasOwnProperty(_constants_DashConstants_js__WEBPACK_IMPORTED_MODULE_7__["default"].SUGGESTED_PRESENTATION_DELAY) ? mpd.suggestedPresentationDelay : null;
  }
  function getAvailabilityStartTime(mpd) {
    return mpd && mpd.hasOwnProperty(_constants_DashConstants_js__WEBPACK_IMPORTED_MODULE_7__["default"].AVAILABILITY_START_TIME) && mpd.availabilityStartTime !== null ? mpd.availabilityStartTime.getTime() : null;
  }
  function getServiceDescriptions(manifest) {
    const serviceDescriptions = [];
    if (manifest && manifest.hasOwnProperty(_constants_DashConstants_js__WEBPACK_IMPORTED_MODULE_7__["default"].SERVICE_DESCRIPTION)) {
      for (const sd of manifest.ServiceDescription) {
        // Convert each of the properties defined in
        let id = null,
          schemeIdUri = null,
          latency = null,
          playbackRate = null,
          operatingQuality = null,
          operatingBandwidth = null,
          contentSteering = null,
          clientDataReporting = null;
        for (const prop in sd) {
          if (sd.hasOwnProperty(prop)) {
            if (prop === _constants_DashConstants_js__WEBPACK_IMPORTED_MODULE_7__["default"].ID) {
              id = sd[prop];
            } else if (prop === _constants_DashConstants_js__WEBPACK_IMPORTED_MODULE_7__["default"].SERVICE_DESCRIPTION_SCOPE) {
              schemeIdUri = sd[prop].schemeIdUri;
            } else if (prop === _constants_DashConstants_js__WEBPACK_IMPORTED_MODULE_7__["default"].SERVICE_DESCRIPTION_LATENCY) {
              latency = {
                target: parseInt(sd[prop].target),
                max: parseInt(sd[prop].max),
                min: parseInt(sd[prop].min),
                referenceId: parseInt(sd[prop].referenceId)
              };
            } else if (prop === _constants_DashConstants_js__WEBPACK_IMPORTED_MODULE_7__["default"].SERVICE_DESCRIPTION_PLAYBACK_RATE) {
              playbackRate = {
                max: parseFloat(sd[prop].max),
                min: parseFloat(sd[prop].min)
              };
            } else if (prop === _constants_DashConstants_js__WEBPACK_IMPORTED_MODULE_7__["default"].SERVICE_DESCRIPTION_OPERATING_QUALITY) {
              operatingQuality = {
                mediaType: sd[prop].mediaType,
                max: parseInt(sd[prop].max),
                min: parseInt(sd[prop].min),
                target: parseInt(sd[prop].target),
                type: sd[prop].type,
                maxQualityDifference: parseInt(sd[prop].maxQualityDifference)
              };
            } else if (prop === _constants_DashConstants_js__WEBPACK_IMPORTED_MODULE_7__["default"].SERVICE_DESCRIPTION_OPERATING_BANDWIDTH) {
              operatingBandwidth = {
                mediaType: sd[prop].mediaType,
                max: parseInt(sd[prop].max),
                min: parseInt(sd[prop].min),
                target: parseInt(sd[prop].target)
              };
            } else if (prop === _constants_DashConstants_js__WEBPACK_IMPORTED_MODULE_7__["default"].CONTENT_STEERING) {
              let element = sd[prop];
              element = Array.isArray(element) ? element.at(element.length - 1) : element;
              contentSteering = _createContentSteeringInstance(element);
            } else if (prop === _constants_DashConstants_js__WEBPACK_IMPORTED_MODULE_7__["default"].CLIENT_DATA_REPORTING) {
              clientDataReporting = _createClientDataReportingInstance(sd[prop]);
            }
          }
        }
        serviceDescriptions.push({
          id,
          schemeIdUri,
          latency,
          playbackRate,
          operatingQuality,
          operatingBandwidth,
          contentSteering,
          clientDataReporting
        });
      }
    }
    return serviceDescriptions;
  }
  function setConfig(config) {
    if (!config) {
      return;
    }
    if (config.errHandler) {
      errHandler = config.errHandler;
    }
    if (config.BASE64) {
      BASE64 = config.BASE64;
    }
  }
  instance = {
    getAccessibilityForAdaptation,
    getAdaptationForId,
    getAdaptationForIndex,
    getAdaptationsForPeriod,
    getAdaptationsForType,
    getAudioChannelConfigurationForAdaptation,
    getAudioChannelConfigurationForRepresentation,
    getAvailabilityStartTime,
    getBandwidth,
    getBaseURLsFromElement,
    getBitrateListForAdaptation,
    getCodec,
    getCodecForPreselection,
    getCombinedEssentialPropertiesForAdaptationSet,
    getCombinedSupplementalPropertiesForAdaptationSet,
    getContentProtectionByAdaptation,
    getContentProtectionByManifest,
    getContentProtectionByPeriod,
    getContentSteering,
    getDuration,
    getEssentialProperties,
    getEventStreamForAdaptationSet,
    getEventStreamForRepresentation,
    getEventsForPeriod,
    getFramerate,
    getId,
    getIndexForAdaptation,
    getIsDynamic,
    getIsFragmented,
    getIsText,
    getIsTypeOf,
    getLabelsForAdaptation,
    getLanguageForAdaptation,
    getLocation,
    getMainAdaptationSetForPreselection,
    getCommonRepresentationForPreselection,
    getManifestUpdatePeriod,
    getMimeType,
    getMpd,
    getPatchLocation,
    getPreselectionIsTypeOf,
    getPreselectionsForPeriod,
    getProducerReferenceTimesForAdaptation,
    getPublishTime,
    getRealPeriodForIndex,
    getRealPeriods,
    getRegularPeriods,
    getRepresentationCount,
    getRepresentationFor,
    getRepresentationSortFunction,
    getRepresentationsForAdaptation,
    getRolesForAdaptation,
    getSegmentAlignment,
    getSegmentSequencePropertiesForAdaptationSet,
    getSelectionPriority,
    getServiceDescriptions,
    getSubSegmentAlignment,
    getSuggestedPresentationDelay,
    getSupplementalProperties,
    getUTCTimingSources,
    getViewpointForAdaptation,
    hasProfile,
    isPeriodEncrypted,
    setConfig
  };
  setup();
  return instance;
}
DashManifestModel.__dashjs_factory_name = 'DashManifestModel';
/* harmony default export */ __webpack_exports__["default"] = (_core_FactoryMaker_js__WEBPACK_IMPORTED_MODULE_14__["default"].getSingletonFactory(DashManifestModel));

/***/ }),

/***/ "./src/dash/vo/AdaptationSet.js":
/*!**************************************!*\
  !*** ./src/dash/vo/AdaptationSet.js ***!
  \**************************************/
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
class AdaptationSet {
  constructor() {
    this.period = null;
    this.index = -1;
    this.id = null;
    this.type = null;
  }
}
/* harmony default export */ __webpack_exports__["default"] = (AdaptationSet);

/***/ }),

/***/ "./src/dash/vo/BaseURL.js":
/*!********************************!*\
  !*** ./src/dash/vo/BaseURL.js ***!
  \********************************/
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

const DEFAULT_DVB_PRIORITY = 1;
const DEFAULT_DVB_WEIGHT = 1;
class BaseURL {
  constructor(url, serviceLocation, priority, weight) {
    this.url = url || '';
    this.serviceLocation = serviceLocation || url || '';

    // DVB extensions
    this.dvbPriority = priority || DEFAULT_DVB_PRIORITY;
    this.dvbWeight = weight || DEFAULT_DVB_WEIGHT;
    this.availabilityTimeOffset = 0;
    this.availabilityTimeComplete = true;
    this.queryParams = {}; // This is an attribute that might be set when synthesizing BaseURLs with content steering

    /* currently unused:
     * byteRange,
     */
  }
}
BaseURL.DEFAULT_DVB_PRIORITY = DEFAULT_DVB_PRIORITY;
BaseURL.DEFAULT_DVB_WEIGHT = DEFAULT_DVB_WEIGHT;
/* harmony default export */ __webpack_exports__["default"] = (BaseURL);

/***/ }),

/***/ "./src/dash/vo/CMCDParameters.js":
/*!***************************************!*\
  !*** ./src/dash/vo/CMCDParameters.js ***!
  \***************************************/
/***/ (function(__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony import */ var _DescriptorType_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./DescriptorType.js */ "./src/dash/vo/DescriptorType.js");
/* harmony import */ var _streaming_constants_Constants_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../../streaming/constants/Constants.js */ "./src/streaming/constants/Constants.js");
/**
 * The copyright in this software is being made available under the BSD License,
 * included below. This software may be subject to other third party and contributor
 * rights, including patent rights, and no such rights are granted under this license.
 *
 * Copyright (c) 2024, Dash Industry Forum.
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
class CMCDParameters extends _DescriptorType_js__WEBPACK_IMPORTED_MODULE_0__["default"] {
  constructor() {
    super();
    this.version = null;
    this.sessionID = null;
    this.contentID = null;
    this.mode = null;
    this.keys = null;
    this.includeInRequests = null;
  }
  init(data) {
    super.init(data);
    if (data) {
      this.version = data.version ? parseInt(data.version) : null;
      this.sessionID = data.sessionID;
      this.contentID = data.contentID;
      this.mode = data.mode ?? 'query';
      this.keys = data.keys ? data.keys.split(' ') : null;
      this.includeInRequests = data.includeInRequests ? data.includeInRequests.split(' ') : [_streaming_constants_Constants_js__WEBPACK_IMPORTED_MODULE_1__["default"].CMCD_DEFAULT_INCLUDE_IN_REQUESTS];
      this.schemeIdUri = data.schemeIdUri;
    }
  }
}
/* harmony default export */ __webpack_exports__["default"] = (CMCDParameters);

/***/ }),

/***/ "./src/dash/vo/ClientDataReporting.js":
/*!********************************************!*\
  !*** ./src/dash/vo/ClientDataReporting.js ***!
  \********************************************/
/***/ (function(__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/**
 * The copyright in this software is being made available under the BSD License,
 * included below. This software may be subject to other third party and contributor
 * rights, including patent rights, and no such rights are granted under this license.
 *
 * Copyright (c) 2024, Dash Industry Forum.
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
class ClientDataReporting {
  constructor() {
    this.adaptationSets = null;
    this.adaptationSetsArray = [];
    this.cmcdParameters = null;
    this.serviceLocations = null;
    this.serviceLocationsArray = [];
  }
}
/* harmony default export */ __webpack_exports__["default"] = (ClientDataReporting);

/***/ }),

/***/ "./src/dash/vo/ContentProtection.js":
/*!******************************************!*\
  !*** ./src/dash/vo/ContentProtection.js ***!
  \******************************************/
/***/ (function(__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony import */ var _streaming_utils_CertUrlUtils_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../../streaming/utils/CertUrlUtils.js */ "./src/streaming/utils/CertUrlUtils.js");
/* harmony import */ var _DescriptorType_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./DescriptorType.js */ "./src/dash/vo/DescriptorType.js");
/* harmony import */ var _constants_DashConstants_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../constants/DashConstants.js */ "./src/dash/constants/DashConstants.js");
/**
 * The copyright in this software is being made available under the BSD License,
 * included below. This software may be subject to other third party and contributor
 * rights, including patent rights, and no such rights are granted under this license.
 *
 * Copyright (c) 2023, Dash Industry Forum.
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
class ContentProtection extends _DescriptorType_js__WEBPACK_IMPORTED_MODULE_1__["default"] {
  constructor() {
    super();
    this.ref = null;
    this.refId = null;
    this.robustness = null;
    this.keyId = null;
    this.cencDefaultKid = null;
    this.pssh = null;
    this.pro = null;
    this.laUrl = null;
    this.certUrls = []; // Array of certificate URL descriptors: [{url: string, certType: string|null}]. dash.js treats certType as an opaque label.
  }
  init(data) {
    super.init(data);
    if (data) {
      this.ref = data.hasOwnProperty(_constants_DashConstants_js__WEBPACK_IMPORTED_MODULE_2__["default"].REF) ? data[_constants_DashConstants_js__WEBPACK_IMPORTED_MODULE_2__["default"].REF] : null;
      this.refId = data.hasOwnProperty(_constants_DashConstants_js__WEBPACK_IMPORTED_MODULE_2__["default"].REF_ID) ? data[_constants_DashConstants_js__WEBPACK_IMPORTED_MODULE_2__["default"].REF_ID] : null;
      this.robustness = data.hasOwnProperty(_constants_DashConstants_js__WEBPACK_IMPORTED_MODULE_2__["default"].ROBUSTNESS) ? data[_constants_DashConstants_js__WEBPACK_IMPORTED_MODULE_2__["default"].ROBUSTNESS] : null;
      this.cencDefaultKid = data.hasOwnProperty(_constants_DashConstants_js__WEBPACK_IMPORTED_MODULE_2__["default"].CENC_DEFAULT_KID) ? data[_constants_DashConstants_js__WEBPACK_IMPORTED_MODULE_2__["default"].CENC_DEFAULT_KID] : null;
      this.pssh = data.hasOwnProperty(_constants_DashConstants_js__WEBPACK_IMPORTED_MODULE_2__["default"].PSSH) ? data[_constants_DashConstants_js__WEBPACK_IMPORTED_MODULE_2__["default"].PSSH] : null;
      this.pro = data.hasOwnProperty(_constants_DashConstants_js__WEBPACK_IMPORTED_MODULE_2__["default"].PRO) ? data[_constants_DashConstants_js__WEBPACK_IMPORTED_MODULE_2__["default"].PRO] : null;
      this.laUrl = data.hasOwnProperty(_constants_DashConstants_js__WEBPACK_IMPORTED_MODULE_2__["default"].LA_URL) ? data[_constants_DashConstants_js__WEBPACK_IMPORTED_MODULE_2__["default"].LA_URL] : data.hasOwnProperty(_constants_DashConstants_js__WEBPACK_IMPORTED_MODULE_2__["default"].LA_URL_LOWER_CASE) ? data[_constants_DashConstants_js__WEBPACK_IMPORTED_MODULE_2__["default"].LA_URL_LOWER_CASE] : null;
      const certKey = Object.keys(data).find(k => k.toLowerCase() === _constants_DashConstants_js__WEBPACK_IMPORTED_MODULE_2__["default"].CERT_URL.toLowerCase());
      const rawCert = certKey ? data[certKey] : null;
      this.certUrls = _streaming_utils_CertUrlUtils_js__WEBPACK_IMPORTED_MODULE_0__["default"].normalizeCertUrls(rawCert);
    }
  }
  mergeAttributesFromReference(reference) {
    let attributesToBeMerged = ['schemeIdUri', 'value', 'id', 'robustness', 'cencDefaultKid', 'pro', 'pssh', 'laUrl'];
    attributesToBeMerged.forEach(attribute => {
      if (this[attribute] === null) {
        this[attribute] = reference[attribute];
      }
    });
    // Merge certUrls: append any from reference that we don't already have (by URL + certType)
    if (reference.certUrls && reference.certUrls.length) {
      const existing = new Set(this.certUrls.map(c => `${c.url}||${c.certType || ''}`));
      reference.certUrls.forEach(c => {
        const key = `${c.url}||${c.certType || ''}`;
        if (!existing.has(key)) {
          this.certUrls.push({
            url: c.url,
            certType: c.certType || null
          });
        }
      });
    }
  }
}
/* harmony default export */ __webpack_exports__["default"] = (ContentProtection);

/***/ }),

/***/ "./src/dash/vo/ContentSteering.js":
/*!****************************************!*\
  !*** ./src/dash/vo/ContentSteering.js ***!
  \****************************************/
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
class ContentSteering {
  constructor() {
    this.defaultServiceLocation = null;
    this.defaultServiceLocationArray = [];
    this.queryBeforeStart = false;
    this.serverUrl = null;
    this.clientRequirement = true;
  }
}
/* harmony default export */ __webpack_exports__["default"] = (ContentSteering);

/***/ }),

/***/ "./src/dash/vo/DescriptorType.js":
/*!***************************************!*\
  !*** ./src/dash/vo/DescriptorType.js ***!
  \***************************************/
/***/ (function(__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony import */ var _constants_DashConstants_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../constants/DashConstants.js */ "./src/dash/constants/DashConstants.js");
/**
 * The copyright in this software is being made available under the BSD License,
 * included below. This software may be subject to other third party and contributor
 * rights, including patent rights, and no such rights are granted under this license.
 *
 * Copyright (c) 2023, Dash Industry Forum.
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

class DescriptorType {
  constructor() {
    this.schemeIdUri = null;
    this.value = null;
    this.id = null;
  }
  init(data) {
    if (data) {
      this.schemeIdUri = data.schemeIdUri ? data.schemeIdUri : null;
      this.value = data.value !== null && data.value !== undefined ? data.value.toString() : null;
      this.id = data.id ? data.id : null;
      // Only add the DVB extensions if they exist
      if (data[_constants_DashConstants_js__WEBPACK_IMPORTED_MODULE_0__["default"].DVB_URL]) {
        this.dvbUrl = data[_constants_DashConstants_js__WEBPACK_IMPORTED_MODULE_0__["default"].DVB_URL];
      }
      if (data[_constants_DashConstants_js__WEBPACK_IMPORTED_MODULE_0__["default"].DVB_MIMETYPE]) {
        this.dvbMimeType = data[_constants_DashConstants_js__WEBPACK_IMPORTED_MODULE_0__["default"].DVB_MIMETYPE];
      }
      if (data[_constants_DashConstants_js__WEBPACK_IMPORTED_MODULE_0__["default"].DVB_FONTFAMILY]) {
        this.dvbFontFamily = data[_constants_DashConstants_js__WEBPACK_IMPORTED_MODULE_0__["default"].DVB_FONTFAMILY];
      }
    }
  }
  inArray(arr) {
    if (arr) {
      return arr.some(entry => {
        return this.schemeIdUri === entry.schemeIdUri && (this.value ? this.value.toString().match(entry.value) :
        // check if provided value matches RegExp
        ''.match(entry.value) // check if RegExp allows absent value
        );
      });
    }
    return false;
  }
}
/* harmony default export */ __webpack_exports__["default"] = (DescriptorType);

/***/ }),

/***/ "./src/dash/vo/Event.js":
/*!******************************!*\
  !*** ./src/dash/vo/Event.js ***!
  \******************************/
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
class Event {
  constructor() {
    this.type = '';
    this.duration = NaN;
    this.presentationTime = NaN;
    this.id = NaN;
    this.messageData = '';
    this.eventStream = null;
    this.presentationTimeDelta = NaN; // Specific EMSG Box parameter
    this.parsedMessageData = null; // Parsed value of the event message
  }
}
/* harmony default export */ __webpack_exports__["default"] = (Event);

/***/ }),

/***/ "./src/dash/vo/EventStream.js":
/*!************************************!*\
  !*** ./src/dash/vo/EventStream.js ***!
  \************************************/
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
class EventStream {
  constructor() {
    this.adaptionSet = null;
    this.representation = null;
    this.period = null;
    this.timescale = 1;
    this.value = '';
    this.schemeIdUri = '';
    this.presentationTimeOffset = 0;
  }
}
/* harmony default export */ __webpack_exports__["default"] = (EventStream);

/***/ }),

/***/ "./src/dash/vo/Mpd.js":
/*!****************************!*\
  !*** ./src/dash/vo/Mpd.js ***!
  \****************************/
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
class Mpd {
  constructor() {
    this.availabilityEndTime = Number.POSITIVE_INFINITY;
    this.availabilityStartTime = null;
    this.manifest = null;
    this.maxSegmentDuration = Number.POSITIVE_INFINITY;
    this.mediaPresentationDuration = NaN;
    this.minimumUpdatePeriod = NaN;
    this.publishTime = null;
    this.suggestedPresentationDelay = 0;
    this.timeShiftBufferDepth = Number.POSITIVE_INFINITY;
  }
}
/* harmony default export */ __webpack_exports__["default"] = (Mpd);

/***/ }),

/***/ "./src/dash/vo/MpdLocation.js":
/*!************************************!*\
  !*** ./src/dash/vo/MpdLocation.js ***!
  \************************************/
/***/ (function(__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/**
 * The copyright in this software is being made available under the BSD License,
 * included below. This software may be subject to other third party and contributor
 * rights, including patent rights, and no such rights are granted under this license.
 *
 * Copyright (c) 2023, Dash Industry Forum.
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
class MpdLocation {
  constructor(url, serviceLocation) {
    this.url = url || '';
    this.serviceLocation = serviceLocation || null;
    this.queryParams = {}; // This is an attribute that might be set when synthesizing Locations with content steering
  }
}
/* harmony default export */ __webpack_exports__["default"] = (MpdLocation);

/***/ }),

/***/ "./src/dash/vo/PatchLocation.js":
/*!**************************************!*\
  !*** ./src/dash/vo/PatchLocation.js ***!
  \**************************************/
/***/ (function(__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/**
 * The copyright in this software is being made available under the BSD License,
 * included below. This software may be subject to other third party and contributor
 * rights, including patent rights, and no such rights are granted under this license.
 *
 * Copyright (c) 2023, Dash Industry Forum.
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
class PatchLocation {
  constructor(url, serviceLocation, ttl) {
    this.url = url || '';
    this.serviceLocation = serviceLocation || null;
    this.ttl = ttl || NaN;
    this.queryParams = {}; // This is an attribute that might be set when synthesizing Locations with content steering
  }
}
/* harmony default export */ __webpack_exports__["default"] = (PatchLocation);

/***/ }),

/***/ "./src/dash/vo/Period.js":
/*!*******************************!*\
  !*** ./src/dash/vo/Period.js ***!
  \*******************************/
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
class Period {
  constructor() {
    this.id = null;
    this.index = -1;
    this.duration = NaN;
    this.start = NaN;
    this.mpd = null;
    this.nextPeriodId = null;
    this.isEncrypted = false;
  }
}
Period.DEFAULT_ID = 'defaultId';
/* harmony default export */ __webpack_exports__["default"] = (Period);

/***/ }),

/***/ "./src/dash/vo/Preselection.js":
/*!*************************************!*\
  !*** ./src/dash/vo/Preselection.js ***!
  \*************************************/
/***/ (function(__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/**
 * The copyright in this software is being made available under the BSD License,
 * included below. This software may be subject to other third party and contributor
 * rights, including patent rights, and no such rights are granted under this license.
 *
 * Copyright (c) 2025, Dash Industry Forum.
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
class Preselection {
  constructor() {
    this.period = null;
    this.index = -1;
    this.id = 1;
    this.type = null;
    this.tag = null;
    this.order = 'undefined';
    this.preselectionComponents = [];
  }
}
/* harmony default export */ __webpack_exports__["default"] = (Preselection);

/***/ }),

/***/ "./src/dash/vo/ProducerReferenceTime.js":
/*!**********************************************!*\
  !*** ./src/dash/vo/ProducerReferenceTime.js ***!
  \**********************************************/
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
class ProducerReferenceTime {
  constructor() {
    this.id = null;
    this.inband = false;
    this.type = 'encoder';
    this.applicationScheme = null;
    this.wallClockTime = null;
    this.presentationTime = NaN;
    this.UTCTiming = null;
  }
}
/* harmony default export */ __webpack_exports__["default"] = (ProducerReferenceTime);

/***/ }),

/***/ "./src/dash/vo/Representation.js":
/*!***************************************!*\
  !*** ./src/dash/vo/Representation.js ***!
  \***************************************/
/***/ (function(__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony import */ var _constants_DashConstants_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../constants/DashConstants.js */ "./src/dash/constants/DashConstants.js");
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


class Representation {
  constructor() {
    this.absoluteIndex = NaN;
    this.adaptation = null;
    this.availabilityTimeComplete = true;
    this.availabilityTimeOffset = 0;
    this.bandwidth = NaN;
    this.bitrateInKbit = NaN;
    this.bitsPerPixel = NaN;
    this.codecFamily = null;
    this.codecPrivateData = null;
    this.codecs = null;
    this.dependencyId = null;
    this.dependentRepresentation = null;
    this.endNumber = null;
    this.essentialProperties = [];
    this.fragmentDuration = null;
    this.frameRate = null;
    this.height = NaN;
    this.id = null;
    this.indexRange = null;
    this.initialization = null;
    this.k = 1;
    this.maxPlayoutRate = NaN;
    this.mediaFinishedInformation = {
      numberOfSegments: 0,
      mediaTimeOfLastSignaledSegment: NaN
    };
    this.mediaInfo = null;
    this.mimeType = null;
    this.mseTimeOffset = NaN;
    this.pixelsPerSecond = NaN;
    this.presentationTimeOffset = 0;
    this.qualityRanking = NaN;
    this.range = null;
    this.scanType = null;
    this.segments = null;
    this.segmentDuration = NaN;
    this.segmentInfoType = null;
    this.segmentSequenceProperties = [];
    this.supplementalProperties = [];
    this.startNumber = 1;
    this.timescale = 1;
    this.width = NaN;
  }
  hasInitialization() {
    return this.initialization !== null || this.range !== null;
  }
  hasSegments() {
    return this.segmentInfoType !== _constants_DashConstants_js__WEBPACK_IMPORTED_MODULE_0__["default"].BASE_URL && this.segmentInfoType !== _constants_DashConstants_js__WEBPACK_IMPORTED_MODULE_0__["default"].SEGMENT_BASE && !this.indexRange;
  }
  isBootstrapRepresentation() {
    if (!this.segmentSequenceProperties || this.segmentSequenceProperties.length === 0) {
      return false;
    }
    return this.segmentSequenceProperties.some(ssp => {
      return ssp.isBootstrapConfiguration();
    });
  }
}
/* harmony default export */ __webpack_exports__["default"] = (Representation);

/***/ }),

/***/ "./src/dash/vo/SegmentSequenceProperties.js":
/*!**************************************************!*\
  !*** ./src/dash/vo/SegmentSequenceProperties.js ***!
  \**************************************************/
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
class SegmentSequenceProperties {
  constructor() {
    this.cadence = 1;
    this.sapType = 0;
    this.event = true;
    this.alignment = null;
  }
  init(data) {
    if (data) {
      this.cadence = data.cadence !== undefined && !isNaN(data.cadence) ? data.cadence : 1;
      this.sapType = data.sapType !== undefined && !isNaN(data.sapType) ? data.sapType : 0;
      this.event = data.event !== undefined ? data.event : true;
      this.alignment = data.alignment !== undefined ? data.alignment : null;
    }
  }
  isBootstrapConfiguration() {
    return this.cadence === 1 && (this.sapType === 0 || this.sapType === 1);
  }
}
/* harmony default export */ __webpack_exports__["default"] = (SegmentSequenceProperties);

/***/ }),

/***/ "./src/dash/vo/UTCTiming.js":
/*!**********************************!*\
  !*** ./src/dash/vo/UTCTiming.js ***!
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
 * @class
 * @ignore
 */
class UTCTiming {
  constructor() {
    // UTCTiming is a DescriptorType and doesn't have any additional fields
    this.schemeIdUri = '';
    this.value = '';
  }
}
/* harmony default export */ __webpack_exports__["default"] = (UTCTiming);

/***/ }),

/***/ "./src/streaming/MediaPlayerEvents.js":
/*!********************************************!*\
  !*** ./src/streaming/MediaPlayerEvents.js ***!
  \********************************************/
/***/ (function(__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony import */ var _core_events_EventsBase_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../core/events/EventsBase.js */ "./src/core/events/EventsBase.js");
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
 * @implements EventsBase
 */
class MediaPlayerEvents extends _core_events_EventsBase_js__WEBPACK_IMPORTED_MODULE_0__["default"] {
  /**
   * @description Public facing external events to be used when developing a player that implements dash.js.
   */
  constructor() {
    super();
    /**
     * Triggered when playback will not start yet
     * as the MPD's availabilityStartTime is in the future.
     * Check delay property in payload to determine time before playback will start.
     * @event MediaPlayerEvents#AST_IN_FUTURE
     */
    this.AST_IN_FUTURE = 'astInFuture';

    /**
     * Triggered when the BaseURLs have been updated.
     * @event MediaPlayerEvents#BASE_URLS_UPDATED
     */
    this.BASE_URLS_UPDATED = 'baseUrlsUpdated';

    /**
     * Triggered when the video element's buffer state changes to stalled.
     * Check mediaType in payload to determine type (Video, Audio, FragmentedText).
     * @event MediaPlayerEvents#BUFFER_EMPTY
     */
    this.BUFFER_EMPTY = 'bufferStalled';

    /**
     * Triggered when the video element's buffer state changes to loaded.
     * Check mediaType in payload to determine type (Video, Audio, FragmentedText).
     * @event MediaPlayerEvents#BUFFER_LOADED
     */
    this.BUFFER_LOADED = 'bufferLoaded';

    /**
     * Triggered when the video element's buffer state changes, either stalled or loaded. Check payload for state.
     * @event MediaPlayerEvents#BUFFER_LEVEL_STATE_CHANGED
     */
    this.BUFFER_LEVEL_STATE_CHANGED = 'bufferStateChanged';

    /**
     * Triggered when the buffer level of a media type has been updated
     * @event MediaPlayerEvents#BUFFER_LEVEL_UPDATED
     */
    this.BUFFER_LEVEL_UPDATED = 'bufferLevelUpdated';

    /**
     * Triggered when a font signalled by a DVB Font Download has been added to the document FontFaceSet interface.
     * @event MediaPlayerEvents#DVB_FONT_DOWNLOAD_ADDED
     */
    this.DVB_FONT_DOWNLOAD_ADDED = 'dvbFontDownloadAdded';

    /**
     * Triggered when a font signalled by a DVB Font Download has successfully downloaded and the FontFace can be used.
     * @event MediaPlayerEvents#DVB_FONT_DOWNLOAD_COMPLETE
     */
    this.DVB_FONT_DOWNLOAD_COMPLETE = 'dvbFontDownloadComplete';

    /**
     * Triggered when a font signalled by a DVB Font Download could not be successfully downloaded, so the FontFace will not be used.
     * @event MediaPlayerEvents#DVB_FONT_DOWNLOAD_FAILED
     */
    this.DVB_FONT_DOWNLOAD_FAILED = 'dvbFontDownloadFailed';

    /**
     * Triggered when a dynamic stream changed to static (transition phase between Live and On-Demand).
     * @event MediaPlayerEvents#DYNAMIC_TO_STATIC
     */
    this.DYNAMIC_TO_STATIC = 'dynamicToStatic';

    /**
     * Triggered when there is an error from the element or MSE source buffer.
     * @event MediaPlayerEvents#ERROR
     */
    this.ERROR = 'error';
    /**
     * Triggered when a fragment download has completed.
     * @event MediaPlayerEvents#FRAGMENT_LOADING_COMPLETED
     */
    this.FRAGMENT_LOADING_COMPLETED = 'fragmentLoadingCompleted';

    /**
     * Triggered when a partial fragment download has completed.
     * @event MediaPlayerEvents#FRAGMENT_LOADING_PROGRESS
     */
    this.FRAGMENT_LOADING_PROGRESS = 'fragmentLoadingProgress';
    /**
     * Triggered when a fragment download has started.
     * @event MediaPlayerEvents#FRAGMENT_LOADING_STARTED
     */
    this.FRAGMENT_LOADING_STARTED = 'fragmentLoadingStarted';

    /**
     * Triggered when a fragment download is abandoned due to detection of slow download base on the ABR abandon rule..
     * @event MediaPlayerEvents#FRAGMENT_LOADING_ABANDONED
     */
    this.FRAGMENT_LOADING_ABANDONED = 'fragmentLoadingAbandoned';

    /**
     * Triggered when {@link module:Debug} logger methods are called.
     * @event MediaPlayerEvents#LOG
     */
    this.LOG = 'log';

    /**
     * Triggered when the manifest load is started
     * @event MediaPlayerEvents#MANIFEST_LOADING_STARTED
     */
    this.MANIFEST_LOADING_STARTED = 'manifestLoadingStarted';

    /**
     * Triggered when the manifest loading is finished, providing the request object information
     * @event MediaPlayerEvents#MANIFEST_LOADING_FINISHED
     */
    this.MANIFEST_LOADING_FINISHED = 'manifestLoadingFinished';

    /**
     * Triggered when the manifest load is complete, providing the payload
     * @event MediaPlayerEvents#MANIFEST_LOADED
     */
    this.MANIFEST_LOADED = 'manifestLoaded';

    /**
     * Triggered anytime there is a change to the overall metrics.
     * @event MediaPlayerEvents#METRICS_CHANGED
     */
    this.METRICS_CHANGED = 'metricsChanged';

    /**
     * Triggered when an individual metric is added, updated or cleared.
     * @event MediaPlayerEvents#METRIC_CHANGED
     */
    this.METRIC_CHANGED = 'metricChanged';

    /**
     * Triggered every time a new metric is added.
     * @event MediaPlayerEvents#METRIC_ADDED
     */
    this.METRIC_ADDED = 'metricAdded';

    /**
     * Triggered every time a metric is updated.
     * @event MediaPlayerEvents#METRIC_UPDATED
     */
    this.METRIC_UPDATED = 'metricUpdated';

    /**
     * Triggered when a new stream (period) starts.
     * @event MediaPlayerEvents#PERIOD_SWITCH_STARTED
     */
    this.PERIOD_SWITCH_STARTED = 'periodSwitchStarted';

    /**
     * Triggered at the stream end of a period.
     * @event MediaPlayerEvents#PERIOD_SWITCH_COMPLETED
     */
    this.PERIOD_SWITCH_COMPLETED = 'periodSwitchCompleted';

    /**
     * Triggered when an ABR up /down switch is initiated; either by user in manual mode or auto mode via ABR rules.
     * @event MediaPlayerEvents#QUALITY_CHANGE_REQUESTED
     */
    this.QUALITY_CHANGE_REQUESTED = 'qualityChangeRequested';

    /**
     * Triggered when the new ABR quality is being rendered on-screen.
     * @event MediaPlayerEvents#QUALITY_CHANGE_RENDERED
     */
    this.QUALITY_CHANGE_RENDERED = 'qualityChangeRendered';

    /**
     * Triggered when the new track is being selected
     * @event MediaPlayerEvents#NEW_TRACK_SELECTED
     */
    this.NEW_TRACK_SELECTED = 'newTrackSelected';

    /**
     * Triggered when the new track is being rendered.
     * @event MediaPlayerEvents#TRACK_CHANGE_RENDERED
     */
    this.TRACK_CHANGE_RENDERED = 'trackChangeRendered';

    /**
     * Triggered when a stream (period) is being loaded
     * @event MediaPlayerEvents#STREAM_INITIALIZING
     */
    this.STREAM_INITIALIZING = 'streamInitializing';

    /**
     * Triggered when a stream (period) is loaded
     * @event MediaPlayerEvents#STREAM_UPDATED
     */
    this.STREAM_UPDATED = 'streamUpdated';

    /**
     * Triggered when a stream (period) is activated
     * @event MediaPlayerEvents#STREAM_ACTIVATED
     */
    this.STREAM_ACTIVATED = 'streamActivated';

    /**
     * Triggered when a stream (period) is deactivated
     * @event MediaPlayerEvents#STREAM_DEACTIVATED
     */
    this.STREAM_DEACTIVATED = 'streamDeactivated';

    /**
     * Triggered when a stream (period) is activated
     * @event MediaPlayerEvents#STREAM_INITIALIZED
     */
    this.STREAM_INITIALIZED = 'streamInitialized';

    /**
     * Triggered when the player has been reset.
     * @event MediaPlayerEvents#STREAM_TEARDOWN_COMPLETE
     */
    this.STREAM_TEARDOWN_COMPLETE = 'streamTeardownComplete';

    /**
     * Triggered once all text tracks detected in the MPD are added to the video element.
     * @event MediaPlayerEvents#TEXT_TRACKS_ADDED
     */
    this.TEXT_TRACKS_ADDED = 'allTextTracksAdded';

    /**
     * Triggered when a text track is added to the video element's TextTrackList
     * @event MediaPlayerEvents#TEXT_TRACK_ADDED
     */
    this.TEXT_TRACK_ADDED = 'textTrackAdded';

    /**
     * Triggered when a text track should be shown
     * @event MediaPlayerEvents#CUE_ENTER
     */
    this.CUE_ENTER = 'cueEnter';

    /**
     * Triggered when a text track should be hidden
     * @event MediaPlayerEvents#CUE_EXIT
     */
    this.CUE_EXIT = 'cueExit';

    /**
     * Triggered when a throughput measurement based on the last segment request has been stored
     * @event MediaPlayerEvents#THROUGHPUT_MEASUREMENT_STORED
     */
    this.THROUGHPUT_MEASUREMENT_STORED = 'throughputMeasurementStored';

    /**
     * Triggered when a ttml chunk is parsed.
     * @event MediaPlayerEvents#TTML_PARSED
     */
    this.TTML_PARSED = 'ttmlParsed';

    /**
     * Triggered when a ttml chunk has to be parsed.
     * @event MediaPlayerEvents#TTML_TO_PARSE
     */
    this.TTML_TO_PARSE = 'ttmlToParse';

    /**
     * Triggered when a caption is rendered.
     * @event MediaPlayerEvents#CAPTION_RENDERED
     */
    this.CAPTION_RENDERED = 'captionRendered';

    /**
     * Triggered when the caption container is resized.
     * @event MediaPlayerEvents#CAPTION_CONTAINER_RESIZE
     */
    this.CAPTION_CONTAINER_RESIZE = 'captionContainerResize';

    /**
     * Sent when enough data is available that the media can be played,
     * at least for a couple of frames.  This corresponds to the
     * HAVE_ENOUGH_DATA readyState.
     * @event MediaPlayerEvents#CAN_PLAY
     */
    this.CAN_PLAY = 'canPlay';

    /**
     * This corresponds to the CAN_PLAY_THROUGH readyState.
     * @event MediaPlayerEvents#CAN_PLAY_THROUGH
     */
    this.CAN_PLAY_THROUGH = 'canPlayThrough';

    /**
     * Sent when playback completes.
     * @event MediaPlayerEvents#PLAYBACK_ENDED
     */
    this.PLAYBACK_ENDED = 'playbackEnded';

    /**
     * Sent when an error occurs.  The element's error
     * attribute contains more information.
     * @event MediaPlayerEvents#PLAYBACK_ERROR
     */
    this.PLAYBACK_ERROR = 'playbackError';

    /**
     * This event is fired once the playback has been initialized by MediaPlayer.js.
     * After that event methods such as setTextTrack() can be used.
     * @event MediaPlayerEvents#PLAYBACK_INITIALIZED
     */
    this.PLAYBACK_INITIALIZED = 'playbackInitialized';

    /**
     * Sent when playback is not allowed (for example if user gesture is needed).
     * @event MediaPlayerEvents#PLAYBACK_NOT_ALLOWED
     */
    this.PLAYBACK_NOT_ALLOWED = 'playbackNotAllowed';

    /**
     * The media's metadata has finished loading; all attributes now
     * contain as much useful information as they're going to.
     * @event MediaPlayerEvents#PLAYBACK_METADATA_LOADED
     */
    this.PLAYBACK_METADATA_LOADED = 'playbackMetaDataLoaded';

    /**
     * The event is fired when the frame at the current playback position of the media has finished loading;
     * often the first frame
     * @event MediaPlayerEvents#PLAYBACK_LOADED_DATA
     */
    this.PLAYBACK_LOADED_DATA = 'playbackLoadedData';

    /**
     * Sent when playback is paused.
     * @event MediaPlayerEvents#PLAYBACK_PAUSED
     */
    this.PLAYBACK_PAUSED = 'playbackPaused';

    /**
     * Sent when the media begins to play (either for the first time, after having been paused,
     * or after ending and then restarting).
     *
     * @event MediaPlayerEvents#PLAYBACK_PLAYING
     */
    this.PLAYBACK_PLAYING = 'playbackPlaying';

    /**
     * Sent periodically to inform interested parties of progress downloading
     * the media. Information about the current amount of the media that has
     * been downloaded is available in the media element's buffered attribute.
     * @event MediaPlayerEvents#PLAYBACK_PROGRESS
     */
    this.PLAYBACK_PROGRESS = 'playbackProgress';

    /**
     * Sent when the playback speed changes.
     * @event MediaPlayerEvents#PLAYBACK_RATE_CHANGED
     */
    this.PLAYBACK_RATE_CHANGED = 'playbackRateChanged';

    /**
     * Sent when a seek operation completes.
     * @event MediaPlayerEvents#PLAYBACK_SEEKED
     */
    this.PLAYBACK_SEEKED = 'playbackSeeked';

    /**
     * Sent when a seek operation begins.
     * @event MediaPlayerEvents#PLAYBACK_SEEKING
     */
    this.PLAYBACK_SEEKING = 'playbackSeeking';

    /**
     * Sent when the video element reports stalled
     * @event MediaPlayerEvents#PLAYBACK_STALLED
     */
    this.PLAYBACK_STALLED = 'playbackStalled';

    /**
     * Sent when playback of the media starts after having been paused;
     * that is, when playback is resumed after a prior pause event.
     *
     * @event MediaPlayerEvents#PLAYBACK_STARTED
     */
    this.PLAYBACK_STARTED = 'playbackStarted';

    /**
     * The time indicated by the element's currentTime attribute has changed.
     * @event MediaPlayerEvents#PLAYBACK_TIME_UPDATED
     */
    this.PLAYBACK_TIME_UPDATED = 'playbackTimeUpdated';

    /**
     * Sent when the video element reports that the volume has changed
     * @event MediaPlayerEvents#PLAYBACK_VOLUME_CHANGED
     */
    this.PLAYBACK_VOLUME_CHANGED = 'playbackVolumeChanged';

    /**
     * Sent when the media playback has stopped because of a temporary lack of data.
     *
     * @event MediaPlayerEvents#PLAYBACK_WAITING
     */
    this.PLAYBACK_WAITING = 'playbackWaiting';

    /**
     * Manifest validity changed - As a result of an MPD validity expiration event.
     * @event MediaPlayerEvents#MANIFEST_VALIDITY_CHANGED
     */
    this.MANIFEST_VALIDITY_CHANGED = 'manifestValidityChanged';

    /**
     * Dash events are triggered at their respective start points on the timeline.
     * @event MediaPlayerEvents#EVENT_MODE_ON_START
     */
    this.EVENT_MODE_ON_START = 'eventModeOnStart';

    /**
     * Dash events are triggered as soon as they were parsed.
     * @event MediaPlayerEvents#EVENT_MODE_ON_RECEIVE
     */
    this.EVENT_MODE_ON_RECEIVE = 'eventModeOnReceive';

    /**
     * Event that is dispatched whenever the player encounters a potential conformance validation that might lead to unexpected/not optimal behavior
     * @event MediaPlayerEvents#CONFORMANCE_VIOLATION
     */
    this.CONFORMANCE_VIOLATION = 'conformanceViolation';

    /**
     * Event that is dispatched whenever the player switches to a different representation
     * @event MediaPlayerEvents#REPRESENTATION_SWITCH
     */
    this.REPRESENTATION_SWITCH = 'representationSwitch';

    /**
     * Event that is dispatched whenever an adaptation set is removed due to all representations not being supported.
     * @event MediaPlayerEvents#ADAPTATION_SET_REMOVED_NO_CAPABILITIES
     */
    this.ADAPTATION_SET_REMOVED_NO_CAPABILITIES = 'adaptationSetRemovedNoCapabilities';

    /**
     * Triggered when a content steering request has completed.
     * @event MediaPlayerEvents#CONTENT_STEERING_REQUEST_COMPLETED
     */
    this.CONTENT_STEERING_REQUEST_COMPLETED = 'contentSteeringRequestCompleted';

    /**
     * Triggered when an inband prft (ProducerReferenceTime) boxes has been received.
     * @event MediaPlayerEvents#INBAND_PRFT
     */
    this.INBAND_PRFT = 'inbandPrft';

    /**
     * The streaming attribute of the Managed Media Source is true
     * @type {string}
     */
    this.MANAGED_MEDIA_SOURCE_START_STREAMING = 'managedMediaSourceStartStreaming';

    /**
     * The streaming attribute of the Managed Media Source is false
     * @type {string}
     */
    this.MANAGED_MEDIA_SOURCE_END_STREAMING = 'managedMediaSourceEndStreaming';
  }
}
let mediaPlayerEvents = new MediaPlayerEvents();
/* harmony default export */ __webpack_exports__["default"] = (mediaPlayerEvents);

/***/ }),

/***/ "./src/streaming/cmcd/config/CmcdConfigAccessor.js":
/*!*********************************************************!*\
  !*** ./src/streaming/cmcd/config/CmcdConfigAccessor.js ***!
  \*********************************************************/
/***/ (function(__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony import */ var _core_FactoryMaker_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../../../core/FactoryMaker.js */ "./src/core/FactoryMaker.js");
/* harmony import */ var _CmcdPropertyMap_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./CmcdPropertyMap.js */ "./src/streaming/cmcd/config/CmcdPropertyMap.js");
/* harmony import */ var _core_Settings_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../../../core/Settings.js */ "./src/core/Settings.js");
/* harmony import */ var _constants_Constants_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../../constants/Constants.js */ "./src/streaming/constants/Constants.js");
/**
 * The copyright in this software is being made available under the BSD License,
 * included below. This software may be subject to other third party and contributor
 * rights, including patent rights, and no such rights are granted under this license.
 *
 * Copyright (c) 2024, Dash Industry Forum.
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
 * @module CmcdConfigAccessor
 * @description Provides unified access to CMCD configuration properties.
 *
 * This accessor abstracts away the differences between:
 * - Player settings (settings.get().streaming.cmcd)
 * - Manifest parameters (CMCDParameters from MPD)
 * - CMCD versions (v1 and v2)
 *
 * It uses CmcdPropertyMap for declarative configuration and provides
 * a version-agnostic API for accessing CMCD properties with automatic
 * fallback resolution.
 *
 * @example
 * const cmcdConfig = CmcdConfigAccessor(context).getInstance();
 * cmcdConfig.setManifestParams(manifestParams);
 *
 * const version = cmcdConfig.getVersion();        // 1 or 2
 * const keys = cmcdConfig.get('keys');            // Resolves with fallback
 * const isEnabled = cmcdConfig.isEnabled();       // Boolean
 *
 * @ignore
 */
function CmcdConfigAccessor() {
  let instance;
  let settings;
  let manifestParams;
  let manifestParamsProviderFunction;
  const context = this.context;

  /**
   * Initialize the accessor
   * @private
   */
  function setup() {
    settings = (0,_core_Settings_js__WEBPACK_IMPORTED_MODULE_2__["default"])(context).getInstance();
    manifestParams = null;
    manifestParamsProviderFunction = null;
  }

  /**
   * Set a provider function for live access to manifest params
   * This enables lazy loading of CMCDParameters, resolving timing issues
   * where params are needed before they're available in the manifest
   *
   * @param {Function} providerFn - Function that returns CMCDParameters object or null
   * @public
   *
   * @example
   * cmcdConfig.setManifestParamsProvider(() => {
   *   return serviceDescriptionController.getServiceDescriptionSettings()
   *     ?.clientDataReporting?.cmcdParameters || null;
   * });
   */
  function setManifestParamsProviderFunction(providerFn) {
    manifestParamsProviderFunction = providerFn;
  }

  /**
   * Get CMCDParameters from the provider function
   * @returns {Object|null} CMCDParameters or null if provider not set or returns nothing
   * @private
   */
  function _getManifestParamsFromProvider() {
    if (typeof manifestParamsProviderFunction !== 'function') {
      return null;
    }
    try {
      return manifestParamsProviderFunction();
    } catch (e) {
      // Provider not ready yet or threw an error
      return null;
    }
  }

  /**
   * Get the effective manifest params (live from provider, or cached)
   * Prefers live access from provider when available
   * @returns {Object|null} CMCDParameters
   * @private
   */
  function _getEffectiveManifestParams() {
    // Try live access first (resolves timing issues)
    const liveParams = _getManifestParamsFromProvider();
    if (liveParams && Object.keys(liveParams).length > 0) {
      return liveParams;
    }
    // Fall back to cached params
    return manifestParams;
  }

  /**
   * Set manifest parameters from MPD CMCDParameters
   * @param {Object} params - CMCDParameters from manifest
   * @public
   */
  function setManifestParams(params) {
    manifestParams = params;
  }

  /**
   * Detect the CMCD version from available sources
   * Priority: manifest > settings > default (1)
   * @returns {number} CMCD version (1 or 2)
   * @private
   */
  function _detectVersion() {
    // Check manifest parameters first (use live access for timing safety)
    const effectiveManifestParams = _getEffectiveManifestParams();
    if (effectiveManifestParams && effectiveManifestParams.version) {
      return parseInt(effectiveManifestParams.version, 10);
    }

    // Check settings (don't cache - settings can change dynamically)
    const cmcdSettings = settings.get().streaming.cmcd;
    if (cmcdSettings && cmcdSettings.version) {
      return parseInt(cmcdSettings.version, 10);
    }

    // Default
    return _constants_Constants_js__WEBPACK_IMPORTED_MODULE_3__["default"].CMCD_DEFAULT_VERSION;
  }

  /**
   * Resolve a dot-notation path in an object with support for array notation and context variables
   * @param {Object} obj - Object to traverse
   * @param {string} path - Dot-notation path (e.g., 'streaming.cmcd.version')
   * @param {Object} pathContext - Context variables for path interpolation (e.g., {targetIndex: 0})
   * @returns {*} Resolved value or undefined
   * @private
   *
   * @example
   * // Simple path
   * _resolvePath(obj, 'settings.streaming.cmcd.version')
   *
   * // Array notation
   * _resolvePath(obj, 'settings.streaming.cmcd.eventTargets[0].url')
   *
   * // Context variables
   * _resolvePath(obj, 'settings.streaming.cmcd.eventTargets[{targetIndex}].url', {targetIndex: 0})
   */
  function _resolvePath(obj, path, pathContext = {}) {
    if (!obj || !path) {
      return undefined;
    }

    // Replace contextual variables in the path
    // Example: 'eventTargets[{targetIndex}].batchSize' with {targetIndex: 0} -> 'eventTargets[0].batchSize'
    let resolvedPath = path;
    for (const [key, value] of Object.entries(pathContext)) {
      resolvedPath = resolvedPath.replace(`{${key}}`, value);
    }

    // Split path by dots
    const parts = resolvedPath.split('.');
    let current = obj;
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      if (current === null || current === undefined) {
        return undefined;
      }

      // Handle array notation: eventTargets[0]
      const arrayMatch = part.match(/^([^\[]+)\[(\d+)\]$/);
      if (arrayMatch) {
        const [, arrayName, arrayIndex] = arrayMatch;

        // First get the array
        current = current[arrayName];

        // Check if it's actually an array
        if (!Array.isArray(current)) {
          return undefined;
        }

        // Then access the specific index
        const index = parseInt(arrayIndex, 10);
        current = current[index];
      } else {
        // Normal property access
        current = current[part];
      }
    }
    return current;
  }

  /**
   * Get the available data context for property resolution
   * @returns {Object} Context object with settings and manifestParams
   * @private
   */
  function _getContext() {
    return {
      settings: settings.get(),
      manifestParams: _getEffectiveManifestParams() || {}
    };
  }

  /**
   * Get a CMCD property value with automatic fallback resolution
   * @param {string} property - Property name from CmcdPropertyMap
   * @param {Object} options - Optional configuration
   * @param {*} options.defaultValue - Override default value
   * @param {number} options.targetIndex - Target index for V2 contextual properties
   * @returns {*} Property value or default
   * @public
   */
  function get(property, options = {}) {
    const propertyMapping = _CmcdPropertyMap_js__WEBPACK_IMPORTED_MODULE_1__["default"][property];
    if (!propertyMapping) {
      return options.defaultValue !== undefined ? options.defaultValue : undefined;
    }
    const version = _detectVersion();
    const dataContext = _getContext();

    // Check if this mapping applies to the current version
    if (propertyMapping.version && !propertyMapping.version.includes(version)) {
      return options.defaultValue !== undefined ? options.defaultValue : undefined;
    }

    // Build path context for interpolation (e.g., {targetIndex: 0})
    const pathContext = {};
    if (options.targetIndex !== undefined) {
      pathContext.targetIndex = options.targetIndex;
    }

    // Check if we should skip manifest params (avoid circular dependency by checking settings directly)
    const applyParametersFromMpd = property === 'applyParametersFromMpd' ? true : dataContext.settings?.streaming?.cmcd?.applyParametersFromMpd ?? true;

    // Sort sources by priority (lower number = higher priority)
    const sortedSources = [...propertyMapping.sources].sort((a, b) => a.priority - b.priority);

    // First pass: Try to find an actual value from any source
    for (const source of sortedSources) {
      // Skip manifestParams sources if applyParametersFromMpd is false
      if (!applyParametersFromMpd && source.path.startsWith('manifestParams')) {
        continue;
      }
      const value = _resolvePath(dataContext, source.path, pathContext);

      // Check if value exists and is not null/undefined
      if (value !== null && value !== undefined) {
        // Apply transformation if provided
        if (typeof source.transform === 'function') {
          return source.transform(value);
        }
        return value;
      }
    }

    // Second pass: If no actual value found, look for the highest-priority default
    for (const source of sortedSources) {
      // Skip manifestParams sources if applyParametersFromMpd is false
      if (!applyParametersFromMpd && source.path.startsWith('manifestParams')) {
        continue;
      }
      if (source.default !== undefined) {
        return source.default;
      }
    }

    // No value or default found in any source, return override default or undefined
    return options.defaultValue !== undefined ? options.defaultValue : undefined;
  }

  /**
   * Check if a property has a non-null/undefined value
   * @param {string} property - Property name from CmcdPropertyMap
   * @returns {boolean} True if property has a value
   * @public
   */
  function has(property) {
    const value = get(property);
    return value !== null && value !== undefined;
  }

  /**
   * Get the detected CMCD version
   * @returns {number} CMCD version (1 or 2)
   * @public
   */
  function getVersion() {
    return _detectVersion();
  }

  /**
   * Check if manifest CMCDParameters are available
   * @returns {boolean} True if manifest params exist with a version
   * @public
   */
  function hasManifestParams() {
    const effectiveManifestParams = _getEffectiveManifestParams();
    return !!(effectiveManifestParams && effectiveManifestParams.version);
  }

  /**
   * Check if CMCD is enabled
   *
   * CMCD is considered enabled if:
   * 1. Manifest has CMCDParameters configured (presence implies enabled), OR
   * 2. Player settings explicitly set enabled: true
   *
   * Note: 'enabled' attribute does not exist in the manifest standard,
   * only in player configuration.
   *
   * @returns {boolean} True if CMCD is enabled
   * @public
   */
  function isEnabled() {
    const cmcdSettings = settings.get().streaming.cmcd;

    // Check if manifest has CMCDParameters (only if applyParametersFromMpd is not false)
    // Manifest CMCDParameters override player settings including enabled: false
    const applyFromMpd = cmcdSettings?.applyParametersFromMpd ?? true;
    if (applyFromMpd) {
      const effectiveManifestParams = _getEffectiveManifestParams();
      if (effectiveManifestParams && effectiveManifestParams.version) {
        return true;
      }
    }

    // No manifest params (or applyParametersFromMpd is false) — use player settings
    if (cmcdSettings && cmcdSettings.enabled === false) {
      return false;
    }

    // Fall back to player settings configuration
    return get('enabled') === true;
  }

  /**
   * Reset the accessor state
   * @public
   */
  function reset() {
    manifestParams = null;
    manifestParamsProviderFunction = null;
  }

  /**
   * Get the array of reporting targets (V2 only)
   * @returns {Array} Array of target objects, empty array if V1 or no targets
   * @public
   *
   * @example
   * const targets = cmcdConfig.getEventTargets();
   * targets.forEach((target, index) => {
   *   const targetAccessor = cmcdConfig.getEventTarget(index);
   *   const keys = targetAccessor.get('targetKeys');
   * });
   */
  function getEventTargets() {
    const version = _detectVersion();

    // Only V2 supports targets
    if (version !== 2) {
      return [];
    }
    const targets = get('eventTargets');
    return Array.isArray(targets) ? targets : [];
  }

  /**
   * Get a target accessor for a specific target index (V2 only)
   * @param {number} index - Target index
   * @returns {Object|null} Target accessor object or null if invalid index
   * @public
   *
   * @example
   * const target = cmcdConfig.getEventTarget(0);
   * if (target) {
   *   const url = target.get('targetUrl');
   *   const keys = target.get('targetKeys');
   *   const events = target.get('targetEvents');
   * }
   */
  function getEventTarget(index) {
    const targets = getEventTargets();

    // Validate index
    if (index < 0 || index >= targets.length) {
      return null;
    }

    // Return accessor object for this specific target
    return {
      /**
       * Get a target-specific property value
       * @param {string} property - Property name (should be target-specific like 'targetUrl', 'targetKeys', etc.)
       * @returns {*} Property value
       */
      get: property => {
        return get(property, {
          targetIndex: index
        });
      },
      /**
       * Check if a target-specific property has a value
       * @param {string} property - Property name
       * @returns {boolean} True if property has a value
       */
      has: property => {
        const value = get(property, {
          targetIndex: index
        });
        return value !== null && value !== undefined;
      },
      /**
       * Target index
       * @type {number}
       */
      index: index,
      /**
       * Raw target object from settings/manifest
       * @type {Object}
       */
      raw: targets[index]
    };
  }
  instance = {
    get,
    getEventTarget,
    getEventTargets,
    getVersion,
    has,
    hasManifestParams,
    isEnabled,
    reset,
    setManifestParams,
    setManifestParamsProviderFunction
  };
  setup();
  return instance;
}
CmcdConfigAccessor.__dashjs_factory_name = 'CmcdConfigAccessor';
/* harmony default export */ __webpack_exports__["default"] = (_core_FactoryMaker_js__WEBPACK_IMPORTED_MODULE_0__["default"].getSingletonFactory(CmcdConfigAccessor));

/***/ }),

/***/ "./src/streaming/cmcd/config/CmcdPropertyMap.js":
/*!******************************************************!*\
  !*** ./src/streaming/cmcd/config/CmcdPropertyMap.js ***!
  \******************************************************/
/***/ (function(__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony import */ var _constants_Constants_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../../constants/Constants.js */ "./src/streaming/constants/Constants.js");
/**
 * The copyright in this software is being made available under the BSD License,
 * included below. This software may be subject to other third party and contributor
 * rights, including patent rights, and no such rights are granted under this license.
 *
 * Copyright (c) 2024, Dash Industry Forum.
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
 * @module CmcdPropertyMap
 * @description Declarative configuration for CMCD property mappings.
 *
 * Maps logical property names to physical paths in different sources (manifest, settings)
 * with version awareness, priority-based fallback, and optional transformations.
 *
 * This centralized configuration allows handling structure changes in CMCD settings
 * without modifying business logic across the codebase.
 *
 * @typedef {Object} PropertySource
 * @property {string} path - Dot-notation path to property (e.g., 'settings.streaming.cmcd.version')
 * @property {number} priority - Order of precedence (1 = highest)
 * @property {string} [type] - Expected data type ('string', 'number', 'boolean', 'array', 'object')
 * @property {Function} [transform] - Optional transformation function
 * @property {*} [default] - Default value if not found
 * @property {boolean} [deprecated] - Mark as deprecated for backward compatibility
 *
 * @typedef {Object} PropertyMapping
 * @property {number[]} [version] - CMCD versions this mapping applies to (omit for all versions)
 * @property {PropertySource[]} sources - Ordered list of sources to check
 */

/**
 * Property mappings for CMCD configuration
 * @type {Object.<string, PropertyMapping>}
 */
const CmcdPropertyMap = {
  /**
   * CMCD version number
   * Priority: manifest > settings > default (1)
   */
  version: {
    version: [1, 2],
    sources: [{
      path: 'manifestParams.version',
      priority: 1,
      type: 'number'
    }, {
      path: 'settings.streaming.cmcd.version',
      priority: 2,
      type: 'number',
      default: _constants_Constants_js__WEBPACK_IMPORTED_MODULE_0__["default"].CMCD_DEFAULT_VERSION
    }]
  },
  /**
   * CMCD enabled flag
   * Note: This only exists in player settings, not in manifest.
   * Manifest presence (CMCDParameters tag) implies enabled=true.
   * Priority: settings > default (false)
   */
  enabled: {
    version: [1, 2],
    sources: [{
      path: 'settings.streaming.cmcd.enabled',
      priority: 1,
      type: 'boolean',
      default: false
    }]
  },
  /**
   * Session ID (sid)
   * Priority: manifest > settings > null
   */
  sessionID: {
    version: [1, 2],
    sources: [{
      path: 'manifestParams.sessionID',
      priority: 1,
      type: 'string'
    }, {
      path: 'settings.streaming.cmcd.sid',
      priority: 2,
      type: 'string',
      default: null
    }]
  },
  /**
   * Content ID (cid)
   * Priority: manifest > settings > null
   */
  contentID: {
    version: [1, 2],
    sources: [{
      path: 'manifestParams.contentID',
      priority: 1,
      type: 'string'
    }, {
      path: 'settings.streaming.cmcd.cid',
      priority: 2,
      type: 'string',
      default: null
    }]
  },
  /**
   * Transmission mode (query, header, body)
   * Priority: manifest > settings > default (query)
   *
   * V1: Single global mode
   * V2: Can be per-target or global
   */
  mode: {
    version: [1, 2],
    sources: [{
      path: 'manifestParams.mode',
      priority: 1,
      type: 'string'
    }, {
      path: 'settings.streaming.cmcd.mode',
      priority: 2,
      type: 'string',
      default: _constants_Constants_js__WEBPACK_IMPORTED_MODULE_0__["default"].CMCD_MODE_QUERY
    }]
  },
  /**
   * Requested throughput (rtp)
   * Priority: settings > null (calculated dynamically if null)
   */
  rtp: {
    version: [1, 2],
    sources: [{
      path: 'settings.streaming.cmcd.rtp',
      priority: 1,
      type: 'number',
      default: null
    }]
  },
  /**
   * RTP safety factor for throughput calculation
   * Priority: settings > default (5)
   */
  rtpSafetyFactor: {
    version: [1, 2],
    sources: [{
      path: 'settings.streaming.cmcd.rtpSafetyFactor',
      priority: 1,
      type: 'number',
      default: 5
    }]
  },
  /**
   * Global enabled CMCD keys
   * Priority: manifest > settings > default (all keys)
   *
   * Note: In V1, this is a global setting.
   * In V2, keys can be per-target (see targetKeys), and this serves as a fallback.
   */
  keys: {
    version: [1, 2],
    sources: [{
      path: 'manifestParams.keys',
      priority: 1,
      type: 'array',
      transform: val => {
        // If string with spaces, split into array
        if (typeof val === 'string') {
          return val.split(' ');
        }
        return val;
      }
    }, {
      path: 'settings.streaming.cmcd.enabledKeys',
      priority: 2,
      type: 'array',
      default: _constants_Constants_js__WEBPACK_IMPORTED_MODULE_0__["default"].CMCD_KEYS
    }]
  },
  /**
   * Request types to include CMCD data in
   * Priority: manifest > settings > default (['segment', 'mpd'])
   */
  includeInRequests: {
    version: [1, 2],
    sources: [{
      path: 'manifestParams.includeInRequests',
      priority: 1,
      type: 'array',
      transform: val => {
        // If string with spaces, split into array
        if (typeof val === 'string') {
          return val.split(' ');
        }
        return val;
      }
    }, {
      path: 'settings.streaming.cmcd.includeInRequests',
      priority: 2,
      type: 'array',
      default: ['segment', 'mpd']
    }]
  },
  /**
   * Apply CMCD parameters from MPD manifest
   * Priority: settings > default (true)
   */
  applyParametersFromMpd: {
    version: [1, 2],
    sources: [{
      path: 'settings.streaming.cmcd.applyParametersFromMpd',
      priority: 1,
      type: 'boolean',
      default: true
    }]
  },
  /**
   * V2: Reporting eventTargets array
   * Priority: settings > default ([])
   */
  eventTargets: {
    version: [2],
    sources: [{
      path: 'settings.streaming.cmcd.eventTargets',
      priority: 1,
      type: 'array',
      default: []
    }]
  },
  /**
   * V2: Target enabled flag
   * Note: This is target-specific, requires context
   */
  targetEnabled: {
    version: [2],
    sources: [{
      path: 'settings.streaming.cmcd.eventTargets[{targetIndex}].enabled',
      priority: 1,
      type: 'boolean',
      default: true
    }]
  },
  /**
   * V2: Target URL for event reporting
   * Note: This is target-specific, requires context
   */
  targetUrl: {
    version: [2],
    sources: [{
      path: 'settings.streaming.cmcd.eventTargets[{targetIndex}].url',
      priority: 1,
      type: 'string',
      default: null
    }]
  },
  /**
   * V2: Target enabled keys (can override global keys)
   * Note: This is target-specific, requires context
   */
  targetKeys: {
    version: [2],
    sources: [{
      path: 'settings.streaming.cmcd.eventTargets[{targetIndex}].enabledKeys',
      priority: 1,
      type: 'array',
      default: []
    }]
  },
  /**
   * V2: Target events to report
   * Note: This is target-specific, requires context
   */
  targetEvents: {
    version: [2],
    sources: [{
      path: 'settings.streaming.cmcd.eventTargets[{targetIndex}].events',
      priority: 1,
      type: 'array',
      default: []
    }]
  },
  /**
   * V2: Target time interval for periodic reporting
   * Note: This is target-specific, requires context
   */
  targetInterval: {
    version: [2],
    sources: [{
      path: 'settings.streaming.cmcd.eventTargets[{targetIndex}].interval',
      priority: 1,
      type: 'number',
      default: _constants_Constants_js__WEBPACK_IMPORTED_MODULE_0__["default"].CMCD_DEFAULT_TIME_INTERVAL
    }]
  },
  /**
   * V2: Target batch size for batched reporting
   * Note: This is target-specific, requires context
   */
  targetBatchSize: {
    version: [2],
    sources: [{
      path: 'settings.streaming.cmcd.eventTargets[{targetIndex}].batchSize',
      priority: 1,
      type: 'number',
      default: 0
    }]
  },
  /**
   * V2: Target includeInRequests filter
   * Note: This is target-specific, requires context
   */
  targetIncludeInRequests: {
    version: [2],
    sources: [{
      path: 'settings.streaming.cmcd.eventTargets[{targetIndex}].includeInRequests',
      priority: 1,
      type: 'array'
    }, {
      path: 'settings.streaming.cmcd.includeInRequests',
      priority: 2,
      type: 'array',
      default: ['segment', 'mpd']
    }]
  }
};
/* harmony default export */ __webpack_exports__["default"] = (CmcdPropertyMap);

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

/***/ "./src/streaming/controllers/CmcdController.js":
/*!*****************************************************!*\
  !*** ./src/streaming/controllers/CmcdController.js ***!
  \*****************************************************/
/***/ (function(__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony import */ var _core_EventBus_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../../core/EventBus.js */ "./src/core/EventBus.js");
/* harmony import */ var _metrics_MetricsReportingEvents_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../metrics/MetricsReportingEvents.js */ "./src/streaming/metrics/MetricsReportingEvents.js");
/* harmony import */ var _core_FactoryMaker_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../../core/FactoryMaker.js */ "./src/core/FactoryMaker.js");
/* harmony import */ var _MediaPlayerEvents_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../MediaPlayerEvents.js */ "./src/streaming/MediaPlayerEvents.js");
/* harmony import */ var _streaming_constants_Constants_js__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ../../streaming/constants/Constants.js */ "./src/streaming/constants/Constants.js");
/* harmony import */ var _vo_metrics_HTTPRequest_js__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ../vo/metrics/HTTPRequest.js */ "./src/streaming/vo/metrics/HTTPRequest.js");
/* harmony import */ var _svta_cml_cmcd__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! @svta/cml-cmcd */ "./node_modules/@svta/cml-cmcd/dist/index.js");
/* harmony import */ var _core_Debug_js__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(/*! ../../core/Debug.js */ "./src/core/Debug.js");
/* harmony import */ var _streaming_vo_CmcdReportRequest_js__WEBPACK_IMPORTED_MODULE_8__ = __webpack_require__(/*! ../../streaming/vo/CmcdReportRequest.js */ "./src/streaming/vo/CmcdReportRequest.js");
/* harmony import */ var _net_URLLoader_js__WEBPACK_IMPORTED_MODULE_9__ = __webpack_require__(/*! ../net/URLLoader.js */ "./src/streaming/net/URLLoader.js");
/* harmony import */ var _models_CmcdModel_js__WEBPACK_IMPORTED_MODULE_10__ = __webpack_require__(/*! ../models/CmcdModel.js */ "./src/streaming/models/CmcdModel.js");
/* harmony import */ var _core_errors_Errors_js__WEBPACK_IMPORTED_MODULE_11__ = __webpack_require__(/*! ../../core/errors/Errors.js */ "./src/core/errors/Errors.js");
/* harmony import */ var _cmcd_config_CmcdConfigAccessor_js__WEBPACK_IMPORTED_MODULE_12__ = __webpack_require__(/*! ../cmcd/config/CmcdConfigAccessor.js */ "./src/streaming/cmcd/config/CmcdConfigAccessor.js");
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













function CmcdController() {
  let cmcdConfigAccessor, cmcdModel, cmcdReporter, dashMetrics, errHandler, instance, logger, mediaPlayerModel, reporterNeedsRebuild, urlLoader;
  let context = this.context;
  let eventBus = (0,_core_EventBus_js__WEBPACK_IMPORTED_MODULE_0__["default"])(context).getInstance();
  let debug = (0,_core_Debug_js__WEBPACK_IMPORTED_MODULE_7__["default"])(context).getInstance();
  const playbackStateMap = {
    [_MediaPlayerEvents_js__WEBPACK_IMPORTED_MODULE_3__["default"].PLAYBACK_INITIALIZED]: _streaming_constants_Constants_js__WEBPACK_IMPORTED_MODULE_4__["default"].CMCD_PLAYER_STATES.STARTING,
    [_MediaPlayerEvents_js__WEBPACK_IMPORTED_MODULE_3__["default"].PLAYBACK_PAUSED]: _streaming_constants_Constants_js__WEBPACK_IMPORTED_MODULE_4__["default"].CMCD_PLAYER_STATES.PAUSED,
    [_MediaPlayerEvents_js__WEBPACK_IMPORTED_MODULE_3__["default"].PLAYBACK_ERROR]: _streaming_constants_Constants_js__WEBPACK_IMPORTED_MODULE_4__["default"].CMCD_PLAYER_STATES.FATAL_ERROR,
    [_MediaPlayerEvents_js__WEBPACK_IMPORTED_MODULE_3__["default"].PLAYBACK_ENDED]: _streaming_constants_Constants_js__WEBPACK_IMPORTED_MODULE_4__["default"].CMCD_PLAYER_STATES.ENDED
  };
  let playbackStateHandlers = {};
  cmcdModel = (0,_models_CmcdModel_js__WEBPACK_IMPORTED_MODULE_10__["default"])(context).getInstance();
  cmcdConfigAccessor = (0,_cmcd_config_CmcdConfigAccessor_js__WEBPACK_IMPORTED_MODULE_12__["default"])(context).getInstance();
  function _setup() {
    logger = debug.getLogger(instance);
    reset();
  }
  function setConfig(config) {
    if (!config) {
      return;
    }
    if (config.dashMetrics) {
      dashMetrics = config.dashMetrics;
    }
    if (config.mediaPlayerModel) {
      mediaPlayerModel = config.mediaPlayerModel;
    }
    if (config.errHandler) {
      errHandler = config.errHandler;
    }
    if (config.urlLoader) {
      urlLoader = config.urlLoader;
    }

    // Set up a provider function for CmcdConfigAccessor to get manifest params
    // This resolves timing issues where CMCDParameters are needed before they're available
    // Using a provider pattern keeps CmcdConfigAccessor decoupled from ServiceDescriptionController
    if (config.serviceDescriptionController) {
      cmcdConfigAccessor.setManifestParamsProviderFunction(() => {
        const serviceDescription = config.serviceDescriptionController.getServiceDescriptionSettings();
        return serviceDescription?.clientDataReporting?.cmcdParameters || null;
      });
    }
    cmcdModel.setConfig(config);
  }
  function initialize(autoPlay) {
    _resetInitialSettings();
    _initializeEventBus(autoPlay);
    if (!urlLoader) {
      urlLoader = (0,_net_URLLoader_js__WEBPACK_IMPORTED_MODULE_9__["default"])(context).create({
        errHandler,
        mediaPlayerModel,
        errors: _core_errors_Errors_js__WEBPACK_IMPORTED_MODULE_11__["default"],
        dashMetrics
      });
    }
    cmcdReporter = _createCmcdReporter();
    cmcdReporter.start();
    _initializePlaybackStateListeners();
  }
  function _resetInitialSettings() {
    reporterNeedsRebuild = false;
  }
  function _initializeEventBus(autoPlay) {
    eventBus.on(_MediaPlayerEvents_js__WEBPACK_IMPORTED_MODULE_3__["default"].PLAYBACK_RATE_CHANGED, _onPlaybackRateChanged, instance);
    eventBus.on(_MediaPlayerEvents_js__WEBPACK_IMPORTED_MODULE_3__["default"].MANIFEST_LOADED, _onManifestLoaded, instance);
    eventBus.on(_MediaPlayerEvents_js__WEBPACK_IMPORTED_MODULE_3__["default"].BUFFER_LEVEL_STATE_CHANGED, _onBufferLevelStateChanged, instance);
    eventBus.on(_MediaPlayerEvents_js__WEBPACK_IMPORTED_MODULE_3__["default"].PLAYBACK_SEEKED, _onPlaybackSeeked, instance);
    eventBus.on(_MediaPlayerEvents_js__WEBPACK_IMPORTED_MODULE_3__["default"].PERIOD_SWITCH_COMPLETED, _onPeriodSwitchComplete, instance);
    if (autoPlay) {
      eventBus.on(_MediaPlayerEvents_js__WEBPACK_IMPORTED_MODULE_3__["default"].MANIFEST_LOADING_STARTED, _onPlaybackStarted, instance);
    } else {
      eventBus.on(_MediaPlayerEvents_js__WEBPACK_IMPORTED_MODULE_3__["default"].PLAYBACK_STARTED, _onPlaybackStarted, instance);
    }
    eventBus.on(_MediaPlayerEvents_js__WEBPACK_IMPORTED_MODULE_3__["default"].ERROR, _onPlayerError, instance);
  }
  function _initializePlaybackStateListeners() {
    eventBus.on(_MediaPlayerEvents_js__WEBPACK_IMPORTED_MODULE_3__["default"].PLAYBACK_PLAYING, _onPlaybackPlaying, instance);
    eventBus.on(_MediaPlayerEvents_js__WEBPACK_IMPORTED_MODULE_3__["default"].PLAYBACK_SEEKING, _onPlaybackSeeking, instance);
    eventBus.on(_MediaPlayerEvents_js__WEBPACK_IMPORTED_MODULE_3__["default"].PLAYBACK_WAITING, _onPlaybackWaiting, instance);
    Object.entries(playbackStateMap).forEach(([event, state]) => {
      if (!playbackStateHandlers[event]) {
        playbackStateHandlers[event] = () => _onPlaybackStateChange(state);
      }
      eventBus.on(event, playbackStateHandlers[event], instance);
    });
  }
  function _onPlaybackStateChange(state) {
    // Update CmcdReporter with the new player state
    if (cmcdReporter) {
      cmcdReporter.update({
        sta: state
      });
    }
    triggerCmcdEventMode(_streaming_constants_Constants_js__WEBPACK_IMPORTED_MODULE_4__["default"].CMCD_REPORTING_EVENTS.PLAY_STATE);
  }
  function _createCmcdReporter() {
    const cmcdConfig = {
      version: cmcdConfigAccessor.getVersion(),
      transmissionMode: cmcdConfigAccessor.get('mode') === _streaming_constants_Constants_js__WEBPACK_IMPORTED_MODULE_4__["default"].CMCD_MODE_HEADERS ? _svta_cml_cmcd__WEBPACK_IMPORTED_MODULE_6__.CMCD_HEADERS : _svta_cml_cmcd__WEBPACK_IMPORTED_MODULE_6__.CMCD_QUERY,
      enabledKeys: cmcdConfigAccessor.get('keys'),
      eventTargets: _buildReporterTargets()
    };

    // Only pass sid/cid if they have actual values, so CmcdReporter
    // uses its own defaults (e.g., auto-generated uuid for sid)
    const sid = cmcdConfigAccessor.get('sessionID');
    if (sid) {
      cmcdConfig.sid = sid;
    }
    const cid = cmcdConfigAccessor.get('contentID');
    if (cid) {
      cmcdConfig.cid = cid;
    }
    return new _svta_cml_cmcd__WEBPACK_IMPORTED_MODULE_6__.CmcdReporter(cmcdConfig, _customRequester);
  }
  function _buildReporterTargets() {
    const targets = cmcdConfigAccessor.getEventTargets();
    return targets.reduce((result, _target, index) => {
      if (!isCmcdEnabled(index)) {
        return result;
      }
      const accessor = cmcdConfigAccessor.getEventTarget(index);
      result.push({
        url: accessor.get('targetUrl'),
        events: accessor.get('targetEvents'),
        interval: accessor.get('targetInterval') ?? _streaming_constants_Constants_js__WEBPACK_IMPORTED_MODULE_4__["default"].CMCD_DEFAULT_TIME_INTERVAL,
        batchSize: accessor.get('targetBatchSize') || 1,
        enabledKeys: accessor.get('targetKeys')
      });
      return result;
    }, []);
  }
  function _customRequester(request) {
    return new Promise(resolve => {
      const httpRequest = new _streaming_vo_CmcdReportRequest_js__WEBPACK_IMPORTED_MODULE_8__["default"]();
      httpRequest.url = request.url;
      httpRequest.method = request.method;
      httpRequest.headers = request.headers;
      httpRequest.body = request.body;
      httpRequest.type = _vo_metrics_HTTPRequest_js__WEBPACK_IMPORTED_MODULE_5__.HTTPRequest.CMCD_EVENT;
      urlLoader.load({
        request: httpRequest,
        success: () => resolve({
          status: 200
        }),
        error: e => resolve({
          status: e?.status || 500
        })
      });
    });
  }
  function _onPeriodSwitchComplete() {
    cmcdModel.onPeriodSwitchComplete();
  }
  function _onPlaybackStarted() {
    cmcdModel.onPlaybackStarted();
  }
  function _onPlaybackPlaying() {
    cmcdModel.onPlaybackPlaying();
    _onPlaybackStateChange(_streaming_constants_Constants_js__WEBPACK_IMPORTED_MODULE_4__["default"].CMCD_PLAYER_STATES.PLAYING);
  }
  function _onPlayerError(errorData) {
    if (errorData.error?.data?.request?.type === _vo_metrics_HTTPRequest_js__WEBPACK_IMPORTED_MODULE_5__.HTTPRequest.CMCD_EVENT) {
      return;
    }
    // Update CmcdReporter with the error code
    if (cmcdReporter) {
      const errorCode = errorData.error?.code || errorData.error?.data?.code;
      if (errorCode) {
        cmcdReporter.update({
          ec: errorCode
        });
      }
    }
    triggerCmcdEventMode(_streaming_constants_Constants_js__WEBPACK_IMPORTED_MODULE_4__["default"].CMCD_REPORTING_EVENTS.ERROR);
  }
  function _rebuildReporterIfNeeded() {
    if (!reporterNeedsRebuild || !cmcdReporter) {
      return;
    }

    // Only rebuild if manifest params are available and enabled.
    // Without manifest params, the reporter config hasn't changed
    // and rebuilding would unnecessarily reset sid and sn.
    // IMPORTANT: Don't reset reporterNeedsRebuild until we actually rebuild,
    // otherwise a race condition can occur where params aren't available yet
    // and we never get another chance to rebuild.
    const applyFromMpd = cmcdConfigAccessor.get('applyParametersFromMpd') ?? true;
    if (!applyFromMpd || !cmcdConfigAccessor.hasManifestParams()) {
      return;
    }

    // Reset flag only after confirming we will rebuild
    reporterNeedsRebuild = false;
    cmcdReporter.stop(true);
    cmcdReporter = _createCmcdReporter();
    cmcdReporter.start();
  }

  /**
   * The handler that is triggered for CMCD event mode events (e.g., play, pause, error). Note that response recevived (rr) events are handled by getCmcdResponseReceivedInterceptors.
   * @param event
   */
  function triggerCmcdEventMode(event) {
    if (!cmcdReporter) {
      return;
    }
    _rebuildReporterIfNeeded();
    const cmcdData = cmcdModel.getEventModeData();

    // Route media start delay (MSD) through update() for the reporter's internal send-once tracking
    const msdData = cmcdModel.calculateMsd();
    if (msdData.msd !== undefined) {
      cmcdReporter.update(msdData);
    }

    // Pass event-mode data as transient per-event data (not persisted)
    cmcdReporter.recordEvent(event, cmcdData);
  }

  /**
   * Applies CMCD data to a request by decorating its URL and/or headers.
   * Delegates to CmcdReporter.createRequestReport() which handles
   * transmission mode (query vs header) internally.
   *
   * @param {object} request - The request object with at least { url, type }.
   *                           Will be mutated with CMCD-decorated url/headers.
   */
  function applyCmcdToRequest(request) {
    if (!cmcdReporter || !isCmcdEnabled()) {
      return;
    }
    _rebuildReporterIfNeeded();
    try {
      const cmcdData = cmcdModel.deriveCmcdDataForRequest(request);

      // Route MSD through update() for the reporter's internal send-once tracking
      const msdData = cmcdModel.calculateMsd();
      if (msdData.msd !== undefined) {
        cmcdReporter.update(msdData);
      }
      const decorated = cmcdReporter.createRequestReport(request, cmcdData);
      request.url = decorated.url;
      request.headers = decorated.headers;
      request.cmcd = decorated.customData?.cmcd || {};
      _triggerCmcdDataGeneratedEvent(request);
    } catch (e) {
      logger.warn(e);
      return null;
    }
  }
  function _triggerCmcdDataGeneratedEvent(request) {
    const effectiveMode = cmcdConfigAccessor.get('mode');
    const eventData = {
      url: request.url,
      mediaType: request.mediaType,
      requestType: request.type,
      cmcdData: request.cmcd,
      mode: effectiveMode
    };
    if (effectiveMode === _streaming_constants_Constants_js__WEBPACK_IMPORTED_MODULE_4__["default"].CMCD_MODE_HEADERS) {
      eventData.headers = request.headers;
    } else {
      try {
        const url = new URL(request.url);
        eventData.cmcdString = url.searchParams.get(_svta_cml_cmcd__WEBPACK_IMPORTED_MODULE_6__.CMCD_PARAM) || '';
      } catch (e) {
        eventData.cmcdString = '';
      }
    }
    eventBus.trigger(_metrics_MetricsReportingEvents_js__WEBPACK_IMPORTED_MODULE_1__["default"].CMCD_DATA_GENERATED, eventData);
  }
  function isCmcdEnabled(targetIndex = null) {
    if (targetIndex !== null) {
      return _targetCanBeEnabled(targetIndex) && _checkTargetIncludeInRequests(targetIndex);
    } else {
      return _canBeEnabled() && _checkIncludeInRequests();
    }
  }
  function _canBeEnabled() {
    const version = cmcdConfigAccessor.getVersion();
    if (version !== 1 && version !== 2) {
      logger.error(`version parameter must be 1 or 2, got ${version}.`);
      return false;
    }
    return cmcdConfigAccessor.isEnabled();
  }
  function _checkIncludeInRequests() {
    const version = cmcdConfigAccessor.getVersion();
    if (version === 2) {
      return true; // Skip this validation for version 2
    }

    // Version 1 validation
    const enabledRequests = cmcdConfigAccessor.get('includeInRequests');
    const defaultAvailableRequests = _streaming_constants_Constants_js__WEBPACK_IMPORTED_MODULE_4__["default"].CMCD_AVAILABLE_REQUESTS;
    const invalidRequests = enabledRequests.filter(k => !defaultAvailableRequests.includes(k));
    if (invalidRequests.length === enabledRequests.length) {
      logger.error(`None of the request types are supported.`);
      return false;
    }
    invalidRequests.forEach(k => {
      logger.warn(`request type ${k} is not supported.`);
    });
    return true;
  }
  function _targetCanBeEnabled(targetIndex) {
    const cmcdVersion = cmcdConfigAccessor.getVersion();
    if (cmcdVersion !== 2) {
      logger.warn('CMCD version 2 is required for target configuration');
      return false;
    }
    const targetAccessor = cmcdConfigAccessor.getEventTarget(targetIndex);
    const enabled = targetAccessor.get('targetEnabled');
    const url = targetAccessor.get('targetUrl');
    if (!url) {
      logger.warn('Target URL is not configured');
      return false;
    }
    return enabled && url;
  }
  function _checkTargetIncludeInRequests(targetIndex) {
    const targetAccessor = cmcdConfigAccessor.getEventTarget(targetIndex);
    let enabledRequests = targetAccessor.get('targetIncludeInRequests');
    if (!enabledRequests) {
      return true;
    }
    const defaultAvailableRequests = _streaming_constants_Constants_js__WEBPACK_IMPORTED_MODULE_4__["default"].CMCD_AVAILABLE_REQUESTS;
    const invalidRequests = enabledRequests.filter(k => !defaultAvailableRequests.includes(k));
    if (invalidRequests.length === enabledRequests.length) {
      logger.error(`None of the request types are supported.`);
      return false;
    }
    invalidRequests.forEach(k => {
      logger.warn(`request type ${k} is not supported.`);
    });
    return true;
  }
  function _onPlaybackRateChanged(data) {
    const prData = cmcdModel.onPlaybackRateChanged(data);
    if (cmcdReporter && prData) {
      cmcdReporter.update(prData);
    }
  }
  function _onManifestLoaded(data) {
    _updateCmcdManifestParamsInCmcdConfigAccessor();

    // Mark reporter for rebuild so it picks up sid, cid, and keys from manifest params.
    // We can't rebuild here because ServiceDescriptionController may not have processed
    // the manifest yet (MANIFEST_LOADED fires before service description is available).
    // The reporter will be rebuilt lazily before the next request or event.
    reporterNeedsRebuild = true;
    if (cmcdReporter) {
      const streamFormatInfo = cmcdModel.onManifestLoaded(data);
      cmcdReporter.update(streamFormatInfo);
    }
  }
  function _onBufferLevelStateChanged(data) {
    cmcdModel.onBufferLevelStateChanged(data);
  }
  function _onPlaybackSeeking() {
    cmcdModel.onPlaybackSeeking();
    _onPlaybackStateChange(_streaming_constants_Constants_js__WEBPACK_IMPORTED_MODULE_4__["default"].CMCD_PLAYER_STATES.SEEKING);
  }
  function _onPlaybackSeeked() {
    cmcdModel.onPlaybackSeeked();
  }
  function _onPlaybackWaiting() {
    if (cmcdModel.wasPlaying()) {
      const mediaType = cmcdModel.getLastMediaTypeRequest();
      cmcdModel.onRebufferingStarted(mediaType);
      _onPlaybackStateChange(_streaming_constants_Constants_js__WEBPACK_IMPORTED_MODULE_4__["default"].CMCD_PLAYER_STATES.REBUFFERING);
    } else {
      _onPlaybackStateChange(_streaming_constants_Constants_js__WEBPACK_IMPORTED_MODULE_4__["default"].CMCD_PLAYER_STATES.WAITING);
    }
  }
  function getCmcdRequestInterceptors() {
    return [_cmcdRequestModeInterceptor];
  }
  function _cmcdRequestModeInterceptor(commonMediaRequest) {
    const requestType = commonMediaRequest.customData.request.type;
    if (!cmcdReporter || !isCmcdEnabled() || !cmcdModel.isIncludedInRequestFilter(requestType)) {
      commonMediaRequest.cmcd = commonMediaRequest.customData.request.cmcd;
      return commonMediaRequest;
    }
    let request = commonMediaRequest.customData.request;
    applyCmcdToRequest(request);
    commonMediaRequest = {
      ...commonMediaRequest,
      url: request.url,
      headers: request.headers,
      cmcd: request.cmcd,
      customData: {
        ...commonMediaRequest.customData,
        cmcd: request.cmcd
      }
    };
    return commonMediaRequest;
  }
  function getCmcdResponseReceivedInterceptors() {
    return [_cmcdResponseReceivedInterceptor];
  }
  function _cmcdResponseReceivedInterceptor(response) {
    const requestType = response.request?.customData?.request?.type;
    if (requestType === _vo_metrics_HTTPRequest_js__WEBPACK_IMPORTED_MODULE_5__.HTTPRequest.CMCD_EVENT) {
      return response;
    }
    _handleResponseReceived(response);
    return response;
  }
  function _handleResponseReceived(response) {
    if (!cmcdReporter) {
      return;
    }
    _rebuildReporterIfNeeded();

    // Collect event-mode data from the model
    const eventData = cmcdModel.getEventModeData();

    // Route MSD through update() for the reporter's internal send-once tracking
    const msdData = cmcdModel.calculateMsd();
    if (msdData.msd !== undefined) {
      cmcdReporter.update(msdData);
    }

    // Collect dash.js-specific additional data
    const additionalData = {};
    if (response.headers) {
      try {
        const cmsdStaticHeader = response.headers['cmsd-static'];
        if (cmsdStaticHeader) {
          additionalData.cmsds = btoa(cmsdStaticHeader);
        }
        const cmsdDynamicHeader = response.headers['cmsd-dynamic'];
        if (cmsdDynamicHeader) {
          additionalData.cmsdd = btoa(cmsdDynamicHeader);
        }
      } catch (e) {
        logger.warn('Failed to base64 encode CMSD headers, ignoring.', e);
      }
    }
    try {
      cmcdReporter.recordResponseReceived(response, {
        ...eventData,
        ...additionalData
      });
    } catch (e) {
      logger.error(e);
    }
  }
  function getCmcdParametersFromManifest() {
    return cmcdModel.getCmcdParametersFromManifest();
  }
  function _updateCmcdManifestParamsInCmcdConfigAccessor() {
    cmcdModel.updateCmcdManifestParamsInCmcdConfigAccessor();
  }
  function reset() {
    eventBus.off(_MediaPlayerEvents_js__WEBPACK_IMPORTED_MODULE_3__["default"].PLAYBACK_RATE_CHANGED, _onPlaybackRateChanged, instance);
    eventBus.off(_MediaPlayerEvents_js__WEBPACK_IMPORTED_MODULE_3__["default"].MANIFEST_LOADED, _onManifestLoaded, instance);
    eventBus.off(_MediaPlayerEvents_js__WEBPACK_IMPORTED_MODULE_3__["default"].BUFFER_LEVEL_STATE_CHANGED, _onBufferLevelStateChanged, instance);
    eventBus.off(_MediaPlayerEvents_js__WEBPACK_IMPORTED_MODULE_3__["default"].PLAYBACK_SEEKED, _onPlaybackSeeked, instance);
    eventBus.off(_MediaPlayerEvents_js__WEBPACK_IMPORTED_MODULE_3__["default"].PERIOD_SWITCH_COMPLETED, _onPeriodSwitchComplete, instance);
    eventBus.off(_MediaPlayerEvents_js__WEBPACK_IMPORTED_MODULE_3__["default"].PLAYBACK_STARTED, _onPlaybackStarted, instance);
    eventBus.off(_MediaPlayerEvents_js__WEBPACK_IMPORTED_MODULE_3__["default"].MANIFEST_LOADING_STARTED, _onPlaybackStarted, instance);
    eventBus.off(_MediaPlayerEvents_js__WEBPACK_IMPORTED_MODULE_3__["default"].ERROR, _onPlayerError, instance);
    eventBus.off(_MediaPlayerEvents_js__WEBPACK_IMPORTED_MODULE_3__["default"].PLAYBACK_PLAYING, _onPlaybackPlaying, instance);
    eventBus.off(_MediaPlayerEvents_js__WEBPACK_IMPORTED_MODULE_3__["default"].PLAYBACK_SEEKING, _onPlaybackSeeking, instance);
    eventBus.off(_MediaPlayerEvents_js__WEBPACK_IMPORTED_MODULE_3__["default"].PLAYBACK_WAITING, _onPlaybackWaiting, instance);
    Object.keys(playbackStateMap).forEach(event => {
      eventBus.off(event, playbackStateHandlers[event], instance);
    });
    if (cmcdReporter) {
      cmcdReporter.stop(true);
      cmcdReporter = null;
    }
    cmcdModel.resetInitialSettings();
  }
  instance = {
    applyCmcdToRequest,
    getCmcdRequestInterceptors,
    getCmcdResponseReceivedInterceptors,
    getCmcdParametersFromManifest,
    initialize,
    isCmcdEnabled,
    reset,
    setConfig
  };
  _setup();
  return instance;
}
CmcdController.__dashjs_factory_name = 'CmcdController';
/* harmony default export */ __webpack_exports__["default"] = (_core_FactoryMaker_js__WEBPACK_IMPORTED_MODULE_2__["default"].getSingletonFactory(CmcdController));

/***/ }),

/***/ "./src/streaming/controllers/CommonAccessTokenController.js":
/*!******************************************************************!*\
  !*** ./src/streaming/controllers/CommonAccessTokenController.js ***!
  \******************************************************************/
/***/ (function(__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony import */ var _core_FactoryMaker_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../../core/FactoryMaker.js */ "./src/core/FactoryMaker.js");
/* harmony import */ var _constants_Constants_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../constants/Constants.js */ "./src/streaming/constants/Constants.js");
/* harmony import */ var _core_Utils_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../../core/Utils.js */ "./src/core/Utils.js");
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




function CommonAccessTokenController() {
  let instance, hostTokenMap;
  function processResponseHeaders(httpResponse) {
    if (!httpResponse || !httpResponse.headers || !httpResponse.request || !httpResponse.request.url) {
      return;
    }
    const commonAccessTokenHeader = httpResponse.headers[_constants_Constants_js__WEBPACK_IMPORTED_MODULE_1__["default"].COMMON_ACCESS_TOKEN_HEADER];
    if (commonAccessTokenHeader) {
      const host = _core_Utils_js__WEBPACK_IMPORTED_MODULE_2__["default"].getHostFromUrl(httpResponse.request.url);
      if (host) {
        hostTokenMap[host] = commonAccessTokenHeader;
      }
    }
  }
  function getCommonAccessTokenForUrl(url) {
    if (!url) {
      return null;
    }
    const host = _core_Utils_js__WEBPACK_IMPORTED_MODULE_2__["default"].getHostFromUrl(url);
    if (host) {
      return hostTokenMap[host] ? hostTokenMap[host] : null;
    }
  }
  function setup() {
    _resetInitialSettings();
  }
  function reset() {
    _resetInitialSettings();
  }
  function _resetInitialSettings() {
    hostTokenMap = {};
  }
  instance = {
    reset,
    processResponseHeaders,
    getCommonAccessTokenForUrl
  };
  setup();
  return instance;
}
CommonAccessTokenController.__dashjs_factory_name = 'CommonAccessTokenController';
/* harmony default export */ __webpack_exports__["default"] = (_core_FactoryMaker_js__WEBPACK_IMPORTED_MODULE_0__["default"].getSingletonFactory(CommonAccessTokenController));

/***/ }),

/***/ "./src/streaming/controllers/ExtUrlQueryInfoController.js":
/*!****************************************************************!*\
  !*** ./src/streaming/controllers/ExtUrlQueryInfoController.js ***!
  \****************************************************************/
/***/ (function(__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony import */ var _core_FactoryMaker_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../../core/FactoryMaker.js */ "./src/core/FactoryMaker.js");
/* harmony import */ var _core_Utils_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../../core/Utils.js */ "./src/core/Utils.js");
/* harmony import */ var _dash_constants_DashConstants_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../../dash/constants/DashConstants.js */ "./src/dash/constants/DashConstants.js");
/* harmony import */ var _constants_Constants_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../constants/Constants.js */ "./src/streaming/constants/Constants.js");
/* harmony import */ var _vo_metrics_HTTPRequest_js__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ../vo/metrics/HTTPRequest.js */ "./src/streaming/vo/metrics/HTTPRequest.js");
/* harmony import */ var _core_Debug_js__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ../../core/Debug.js */ "./src/core/Debug.js");
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







function ExtUrlQueryInfoController() {
  let instance, logger, mpdQueryStringInformation;
  const context = this.context;
  function setup() {
    logger = (0,_core_Debug_js__WEBPACK_IMPORTED_MODULE_5__["default"])(context).getInstance().getLogger(instance);
  }
  function _generateQueryParams(resultObject, manifestObject, mpdUrlQuery, parentLevelInfo, mpdElement) {
    const property = _getDescriptorTypeFromManifestObject(manifestObject, mpdElement);
    _generateInitialQueryString(property, parentLevelInfo.initialQueryString, resultObject, mpdUrlQuery);
    _generateFinalQueryString(property, resultObject, parentLevelInfo.finalQueryString);
    resultObject.sameOriginOnly = property?.ExtUrlQueryInfo?.sameOriginOnly;
    resultObject.queryParams = _core_Utils_js__WEBPACK_IMPORTED_MODULE_1__["default"].parseQueryParams(resultObject?.finalQueryString);
    resultObject.includeInRequests = _getIncludeInRequestFromProperty(property, parentLevelInfo.includeInRequests);
  }
  function _getDescriptorTypeFromManifestObject(manifestObject, mpdElement) {
    let properties = [];
    if (mpdElement === _dash_constants_DashConstants_js__WEBPACK_IMPORTED_MODULE_2__["default"].PERIOD) {
      properties = manifestObject[_dash_constants_DashConstants_js__WEBPACK_IMPORTED_MODULE_2__["default"].SUPPLEMENTAL_PROPERTY] || [];
    } else {
      properties = [...(manifestObject[_dash_constants_DashConstants_js__WEBPACK_IMPORTED_MODULE_2__["default"].ESSENTIAL_PROPERTY] || []), ...(manifestObject[_dash_constants_DashConstants_js__WEBPACK_IMPORTED_MODULE_2__["default"].SUPPLEMENTAL_PROPERTY] || [])];
    }
    return properties.find(prop => prop.schemeIdUri === _constants_Constants_js__WEBPACK_IMPORTED_MODULE_3__["default"].URL_QUERY_INFO_SCHEME && prop.UrlQueryInfo || prop.schemeIdUri === _constants_Constants_js__WEBPACK_IMPORTED_MODULE_3__["default"].EXT_URL_QUERY_INFO_SCHEME && prop.ExtUrlQueryInfo);
  }
  function _generateInitialQueryString(property, defaultInitialString, dst, mpdUrlQuery) {
    dst.initialQueryString = '';
    let initialQueryString = '';
    const queryInfo = property?.ExtUrlQueryInfo || property?.UrlQueryInfo;
    if (queryInfo && queryInfo.queryString) {
      if (defaultInitialString && defaultInitialString.length > 0) {
        initialQueryString = defaultInitialString + '&' + queryInfo.queryString;
      } else {
        initialQueryString = queryInfo.queryString;
      }
    } else {
      initialQueryString = defaultInitialString;
    }
    if (queryInfo?.useMPDUrlQuery === 'true' && mpdUrlQuery) {
      initialQueryString = initialQueryString ? initialQueryString + '&' + mpdUrlQuery : mpdUrlQuery;
    }
    dst.initialQueryString = initialQueryString;
  }

  // The logic for supporting templates with queryTemplate=$query:<param>$ is not in place yet, this only support queryTemplate="$querypart$".
  function _generateFinalQueryString(property, resultObject, parentQueryString) {
    if (!property) {
      resultObject.finalQueryString = parentQueryString;
      return;
    }
    const queryTemplate = property?.ExtUrlQueryInfo?.queryTemplate || property?.UrlQueryInfo?.queryTemplate || '';
    resultObject.finalQueryString = queryTemplate === _dash_constants_DashConstants_js__WEBPACK_IMPORTED_MODULE_2__["default"].QUERY_PART ? resultObject?.initialQueryString : '';
  }
  function _getIncludeInRequestFromProperty(property, parentIncludeInRequests) {
    if (!property) {
      return parentIncludeInRequests;
    }
    if (property.ExtUrlQueryInfo?.includeInRequests) {
      return property.ExtUrlQueryInfo.includeInRequests.split(' ');
    } else {
      return [_dash_constants_DashConstants_js__WEBPACK_IMPORTED_MODULE_2__["default"].SEGMENT_TYPE];
    }
  }
  function createFinalQueryStrings(manifest) {
    mpdQueryStringInformation = {
      origin: new URL(manifest.url).origin,
      period: []
    };
    const mpdUrlQuery = manifest.url.split('?')[1];
    const initialMpdObject = {
      initialQueryString: '',
      includeInRequests: []
    };
    _generateQueryParams(mpdQueryStringInformation, manifest, mpdUrlQuery, initialMpdObject, _dash_constants_DashConstants_js__WEBPACK_IMPORTED_MODULE_2__["default"].MPD);
    manifest.Period.forEach(period => {
      const periodObject = {
        adaptation: []
      };
      _generateQueryParams(periodObject, period, mpdUrlQuery, mpdQueryStringInformation, _dash_constants_DashConstants_js__WEBPACK_IMPORTED_MODULE_2__["default"].PERIOD);
      period.AdaptationSet.forEach(adaptationSet => {
        const adaptationObject = {
          representation: []
        };
        _generateQueryParams(adaptationObject, adaptationSet, mpdUrlQuery, periodObject, _dash_constants_DashConstants_js__WEBPACK_IMPORTED_MODULE_2__["default"].ADAPTATION_SET);
        adaptationSet.Representation.forEach(representation => {
          const representationObject = {};
          _generateQueryParams(representationObject, representation, mpdUrlQuery, adaptationObject, _dash_constants_DashConstants_js__WEBPACK_IMPORTED_MODULE_2__["default"].REPRESENTATION);
          adaptationObject.representation.push(representationObject);
        });
        periodObject.adaptation.push(adaptationObject);
      });
      mpdQueryStringInformation.period.push(periodObject);
    });
  }
  function getFinalQueryString(request) {
    try {
      if (!mpdQueryStringInformation) {
        return null;
      }
      if (request.type === _vo_metrics_HTTPRequest_js__WEBPACK_IMPORTED_MODULE_4__.HTTPRequest.MEDIA_SEGMENT_TYPE || request.type === _vo_metrics_HTTPRequest_js__WEBPACK_IMPORTED_MODULE_4__.HTTPRequest.INIT_SEGMENT_TYPE) {
        const representation = request.representation;
        if (!representation) {
          return null;
        }
        const adaptation = representation.adaptation;
        const period = adaptation.period;
        const queryInfo = mpdQueryStringInformation.period[period.index].adaptation[adaptation.index].representation[representation.index];
        const requestUrl = new URL(request.url);
        const canSendToOrigin = !queryInfo.sameOriginOnly || mpdQueryStringInformation.origin === requestUrl.origin;
        const inRequest = queryInfo.includeInRequests.includes(_dash_constants_DashConstants_js__WEBPACK_IMPORTED_MODULE_2__["default"].SEGMENT_TYPE);
        if (inRequest && canSendToOrigin) {
          return queryInfo.queryParams;
        }
      } else if (request.type === _vo_metrics_HTTPRequest_js__WEBPACK_IMPORTED_MODULE_4__.HTTPRequest.MPD_TYPE) {
        const inRequest = [_dash_constants_DashConstants_js__WEBPACK_IMPORTED_MODULE_2__["default"].MPD_TYPE, _dash_constants_DashConstants_js__WEBPACK_IMPORTED_MODULE_2__["default"].MPD_PATCH_TYPE].some(r => mpdQueryStringInformation.includeInRequests.includes(r));
        if (inRequest) {
          return mpdQueryStringInformation.queryParams;
        }
      } else if (request.type === _vo_metrics_HTTPRequest_js__WEBPACK_IMPORTED_MODULE_4__.HTTPRequest.CONTENT_STEERING_TYPE) {
        const inRequest = mpdQueryStringInformation.includeInRequests.includes(_dash_constants_DashConstants_js__WEBPACK_IMPORTED_MODULE_2__["default"].STEERING_TYPE);
        if (inRequest) {
          return mpdQueryStringInformation.queryParams;
        }
      }
    } catch (e) {
      logger.error(e);
      return null;
    }
  }
  setup();
  instance = {
    getFinalQueryString,
    createFinalQueryStrings
  };
  return instance;
}
ExtUrlQueryInfoController.__dashjs_factory_name = 'ExtUrlQueryInfoController';
/* harmony default export */ __webpack_exports__["default"] = (_core_FactoryMaker_js__WEBPACK_IMPORTED_MODULE_0__["default"].getSingletonFactory(ExtUrlQueryInfoController));

/***/ }),

/***/ "./src/streaming/metrics/MetricsReportingEvents.js":
/*!*********************************************************!*\
  !*** ./src/streaming/metrics/MetricsReportingEvents.js ***!
  \*********************************************************/
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
 * @implements EventsBase
 */
class MetricsReportingEvents extends _core_events_EventsBase_js__WEBPACK_IMPORTED_MODULE_0__["default"] {
  constructor() {
    super();
    this.METRICS_INITIALISATION_COMPLETE = 'internal_metricsReportingInitialized';
    this.BECAME_REPORTING_PLAYER = 'internal_becameReportingPlayer';

    /**
     * Triggered when CMCD data was generated for a HTTP request
     * @event MetricsReportingEvents#CMCD_DATA_GENERATED
     */
    this.CMCD_DATA_GENERATED = 'cmcdDataGenerated';
  }
}
let metricsReportingEvents = new MetricsReportingEvents();
/* harmony default export */ __webpack_exports__["default"] = (metricsReportingEvents);

/***/ }),

/***/ "./src/streaming/metrics/controllers/MetricsCollectionController.js":
/*!**************************************************************************!*\
  !*** ./src/streaming/metrics/controllers/MetricsCollectionController.js ***!
  \**************************************************************************/
/***/ (function(__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony import */ var _MetricsController_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./MetricsController.js */ "./src/streaming/metrics/controllers/MetricsController.js");
/* harmony import */ var _utils_ManifestParsing_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../utils/ManifestParsing.js */ "./src/streaming/metrics/utils/ManifestParsing.js");
/* harmony import */ var _MetricsReportingEvents_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../MetricsReportingEvents.js */ "./src/streaming/metrics/MetricsReportingEvents.js");
/* harmony import */ var _core_FactoryMaker_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../../../core/FactoryMaker.js */ "./src/core/FactoryMaker.js");
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





function MetricsCollectionController(config) {
  config = config || {};
  let instance;
  let metricsControllers = {};
  let context = this.context;
  let eventBus = config.eventBus;
  const events = config.events;
  function update(e) {
    if (e.error) {
      return;
    }

    // start by assuming all existing controllers need removing
    let controllersToRemove = Object.keys(metricsControllers);
    const metrics = (0,_utils_ManifestParsing_js__WEBPACK_IMPORTED_MODULE_1__["default"])(context).getInstance({
      adapter: config.adapter,
      constants: config.constants
    }).getMetrics(e.manifest);
    metrics.forEach(m => {
      const key = JSON.stringify(m);
      if (!metricsControllers.hasOwnProperty(key)) {
        try {
          let controller = (0,_MetricsController_js__WEBPACK_IMPORTED_MODULE_0__["default"])(context).create(config);
          controller.initialize(m);
          metricsControllers[key] = controller;
        } catch (e) {
          // fail quietly
        }
      } else {
        // we still need this controller - delete from removal list
        controllersToRemove.splice(key, 1);
      }
    });

    // now remove the unwanted controllers
    controllersToRemove.forEach(c => {
      metricsControllers[c].reset();
      delete metricsControllers[c];
    });
    eventBus.trigger(_MetricsReportingEvents_js__WEBPACK_IMPORTED_MODULE_2__["default"].METRICS_INITIALISATION_COMPLETE);
  }
  function resetMetricsControllers() {
    Object.keys(metricsControllers).forEach(key => {
      metricsControllers[key].reset();
    });
    metricsControllers = {};
  }
  function setup() {
    eventBus.on(events.MANIFEST_UPDATED, update, instance);
    eventBus.on(events.STREAM_TEARDOWN_COMPLETE, resetMetricsControllers, instance);
  }
  function reset() {
    eventBus.off(events.MANIFEST_UPDATED, update, instance);
    eventBus.off(events.STREAM_TEARDOWN_COMPLETE, resetMetricsControllers, instance);
  }
  instance = {
    reset: reset
  };
  setup();
  return instance;
}
MetricsCollectionController.__dashjs_factory_name = 'MetricsCollectionController';
/* harmony default export */ __webpack_exports__["default"] = (_core_FactoryMaker_js__WEBPACK_IMPORTED_MODULE_3__["default"].getClassFactory(MetricsCollectionController));

/***/ }),

/***/ "./src/streaming/metrics/controllers/MetricsController.js":
/*!****************************************************************!*\
  !*** ./src/streaming/metrics/controllers/MetricsController.js ***!
  \****************************************************************/
/***/ (function(__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony import */ var _RangeController_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./RangeController.js */ "./src/streaming/metrics/controllers/RangeController.js");
/* harmony import */ var _ReportingController_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./ReportingController.js */ "./src/streaming/metrics/controllers/ReportingController.js");
/* harmony import */ var _MetricsHandlersController_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./MetricsHandlersController.js */ "./src/streaming/metrics/controllers/MetricsHandlersController.js");
/* harmony import */ var _core_FactoryMaker_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../../../core/FactoryMaker.js */ "./src/core/FactoryMaker.js");
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





function MetricsController(config) {
  config = config || {};
  let metricsHandlersController, reportingController, rangeController, instance;
  let context = this.context;
  function initialize(metricsEntry) {
    try {
      rangeController = (0,_RangeController_js__WEBPACK_IMPORTED_MODULE_0__["default"])(context).create({
        mediaElement: config.mediaElement
      });
      rangeController.initialize(metricsEntry.Range);
      reportingController = (0,_ReportingController_js__WEBPACK_IMPORTED_MODULE_1__["default"])(context).create({
        debug: config.debug,
        metricsConstants: config.metricsConstants,
        mediaPlayerModel: config.mediaPlayerModel
      });
      reportingController.initialize(metricsEntry.Reporting, rangeController);
      metricsHandlersController = (0,_MetricsHandlersController_js__WEBPACK_IMPORTED_MODULE_2__["default"])(context).create({
        debug: config.debug,
        eventBus: config.eventBus,
        metricsConstants: config.metricsConstants,
        events: config.events
      });
      metricsHandlersController.initialize(metricsEntry.metrics, reportingController);
    } catch (e) {
      reset();
      throw e;
    }
  }
  function reset() {
    if (metricsHandlersController) {
      metricsHandlersController.reset();
    }
    if (reportingController) {
      reportingController.reset();
    }
    if (rangeController) {
      rangeController.reset();
    }
  }
  instance = {
    initialize: initialize,
    reset: reset
  };
  return instance;
}
MetricsController.__dashjs_factory_name = 'MetricsController';
/* harmony default export */ __webpack_exports__["default"] = (_core_FactoryMaker_js__WEBPACK_IMPORTED_MODULE_3__["default"].getClassFactory(MetricsController));

/***/ }),

/***/ "./src/streaming/metrics/controllers/MetricsHandlersController.js":
/*!************************************************************************!*\
  !*** ./src/streaming/metrics/controllers/MetricsHandlersController.js ***!
  \************************************************************************/
/***/ (function(__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony import */ var _metrics_MetricsHandlerFactory_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../metrics/MetricsHandlerFactory.js */ "./src/streaming/metrics/metrics/MetricsHandlerFactory.js");
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



function MetricsHandlersController(config) {
  config = config || {};
  let handlers = [];
  let instance;
  const context = this.context;
  const eventBus = config.eventBus;
  const Events = config.events;
  let metricsHandlerFactory = (0,_metrics_MetricsHandlerFactory_js__WEBPACK_IMPORTED_MODULE_0__["default"])(context).getInstance({
    debug: config.debug,
    eventBus: config.eventBus,
    metricsConstants: config.metricsConstants
  });
  function handle(e) {
    handlers.forEach(handler => {
      handler.handleNewMetric(e.metric, e.value, e.mediaType);
    });
  }
  function initialize(metrics, reportingController) {
    metrics.split(',').forEach((m, midx, ms) => {
      let handler;

      // there is a bug in ISO23009-1 where the metrics attribute
      // is a comma-separated list but HttpList key can contain a
      // comma enclosed by ().
      if (m.indexOf('(') !== -1 && m.indexOf(')') === -1) {
        let nextm = ms[midx + 1];
        if (nextm && nextm.indexOf('(') === -1 && nextm.indexOf(')') !== -1) {
          m += ',' + nextm;

          // delete the next metric so forEach does not visit.
          delete ms[midx + 1];
        }
      }
      handler = metricsHandlerFactory.create(m, reportingController);
      if (handler) {
        handlers.push(handler);
      }
    });
    eventBus.on(Events.METRIC_ADDED, handle, instance);
    eventBus.on(Events.METRIC_UPDATED, handle, instance);
  }
  function reset() {
    eventBus.off(Events.METRIC_ADDED, handle, instance);
    eventBus.off(Events.METRIC_UPDATED, handle, instance);
    handlers.forEach(handler => handler.reset());
    handlers = [];
  }
  instance = {
    initialize: initialize,
    reset: reset
  };
  return instance;
}
MetricsHandlersController.__dashjs_factory_name = 'MetricsHandlersController';
/* harmony default export */ __webpack_exports__["default"] = (_core_FactoryMaker_js__WEBPACK_IMPORTED_MODULE_1__["default"].getClassFactory(MetricsHandlersController));

/***/ }),

/***/ "./src/streaming/metrics/controllers/RangeController.js":
/*!**************************************************************!*\
  !*** ./src/streaming/metrics/controllers/RangeController.js ***!
  \**************************************************************/
/***/ (function(__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony import */ var _utils_CustomTimeRanges_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../../utils/CustomTimeRanges.js */ "./src/streaming/utils/CustomTimeRanges.js");
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



function RangeController(config) {
  config = config || {};
  let useWallClockTime = false;
  let context = this.context;
  let instance, ranges;
  let mediaElement = config.mediaElement;
  function initialize(rs) {
    if (rs && rs.length) {
      rs.forEach(r => {
        let start = r.starttime;
        let end = start + r.duration;
        ranges.add(start, end);
      });
      useWallClockTime = !!rs[0]._useWallClockTime;
    }
  }
  function reset() {
    ranges.clear();
  }
  function setup() {
    ranges = (0,_utils_CustomTimeRanges_js__WEBPACK_IMPORTED_MODULE_0__["default"])(context).create();
  }
  function isEnabled() {
    let numRanges = ranges.length;
    let time;
    if (!numRanges) {
      return true;
    }

    // When not present, DASH Metrics reporting is requested
    // for the whole duration of the content.
    time = useWallClockTime ? new Date().getTime() / 1000 : mediaElement.currentTime;
    for (let i = 0; i < numRanges; i += 1) {
      let start = ranges.start(i);
      let end = ranges.end(i);
      if (start <= time && time < end) {
        return true;
      }
    }
    return false;
  }
  instance = {
    initialize: initialize,
    reset: reset,
    isEnabled: isEnabled
  };
  setup();
  return instance;
}
RangeController.__dashjs_factory_name = 'RangeController';
/* harmony default export */ __webpack_exports__["default"] = (_core_FactoryMaker_js__WEBPACK_IMPORTED_MODULE_1__["default"].getClassFactory(RangeController));

/***/ }),

/***/ "./src/streaming/metrics/controllers/ReportingController.js":
/*!******************************************************************!*\
  !*** ./src/streaming/metrics/controllers/ReportingController.js ***!
  \******************************************************************/
/***/ (function(__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony import */ var _reporting_ReportingFactory_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../reporting/ReportingFactory.js */ "./src/streaming/metrics/reporting/ReportingFactory.js");
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



function ReportingController(config) {
  let reporters = [];
  let instance;
  const reportingFactory = (0,_reporting_ReportingFactory_js__WEBPACK_IMPORTED_MODULE_0__["default"])(this.context).getInstance(config);
  function initialize(reporting, rangeController) {
    // "if multiple Reporting elements are present, it is expected that
    // the client processes one of the recognized reporting schemes."
    // to ignore this, and support multiple Reporting per Metric,
    // simply change the 'some' below to 'forEach'
    reporting.some(r => {
      let reporter = reportingFactory.create(r, rangeController);
      if (reporter) {
        reporters.push(reporter);
        return true;
      }
    });
  }
  function reset() {
    reporters.forEach(r => r.reset());
    reporters = [];
  }
  function report(type, vos) {
    reporters.forEach(r => r.report(type, vos));
  }
  instance = {
    initialize: initialize,
    reset: reset,
    report: report
  };
  return instance;
}
ReportingController.__dashjs_factory_name = 'ReportingController';
/* harmony default export */ __webpack_exports__["default"] = (_core_FactoryMaker_js__WEBPACK_IMPORTED_MODULE_1__["default"].getClassFactory(ReportingController));

/***/ }),

/***/ "./src/streaming/metrics/metrics/MetricsHandlerFactory.js":
/*!****************************************************************!*\
  !*** ./src/streaming/metrics/metrics/MetricsHandlerFactory.js ***!
  \****************************************************************/
/***/ (function(__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony import */ var _handlers_BufferLevelHandler_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./handlers/BufferLevelHandler.js */ "./src/streaming/metrics/metrics/handlers/BufferLevelHandler.js");
/* harmony import */ var _handlers_DVBErrorsHandler_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./handlers/DVBErrorsHandler.js */ "./src/streaming/metrics/metrics/handlers/DVBErrorsHandler.js");
/* harmony import */ var _handlers_HttpListHandler_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./handlers/HttpListHandler.js */ "./src/streaming/metrics/metrics/handlers/HttpListHandler.js");
/* harmony import */ var _handlers_GenericMetricHandler_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./handlers/GenericMetricHandler.js */ "./src/streaming/metrics/metrics/handlers/GenericMetricHandler.js");
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






function MetricsHandlerFactory(config) {
  config = config || {};
  let instance;
  const logger = config.debug ? config.debug.getLogger(instance) : {};

  // group 1: key, [group 3: n [, group 5: type]]
  let keyRegex = /([a-zA-Z]*)(\(([0-9]*)(\,\s*([a-zA-Z]*))?\))?/;
  const context = this.context;
  let knownFactoryProducts = {
    BufferLevel: _handlers_BufferLevelHandler_js__WEBPACK_IMPORTED_MODULE_0__["default"],
    DVBErrors: _handlers_DVBErrorsHandler_js__WEBPACK_IMPORTED_MODULE_1__["default"],
    HttpList: _handlers_HttpListHandler_js__WEBPACK_IMPORTED_MODULE_2__["default"],
    PlayList: _handlers_GenericMetricHandler_js__WEBPACK_IMPORTED_MODULE_3__["default"],
    RepSwitchList: _handlers_GenericMetricHandler_js__WEBPACK_IMPORTED_MODULE_3__["default"],
    TcpList: _handlers_GenericMetricHandler_js__WEBPACK_IMPORTED_MODULE_3__["default"]
  };
  function create(listType, reportingController) {
    var matches = listType.match(keyRegex);
    var handler;
    if (!matches) {
      return;
    }
    try {
      handler = knownFactoryProducts[matches[1]](context).create({
        eventBus: config.eventBus,
        metricsConstants: config.metricsConstants
      });
      handler.initialize(matches[1], reportingController, matches[3], matches[5]);
    } catch (e) {
      handler = null;
      logger.error(`MetricsHandlerFactory: Could not create handler for type ${matches[1]} with args ${matches[3]}, ${matches[5]} (${e.message})`);
    }
    return handler;
  }
  function register(key, handler) {
    knownFactoryProducts[key] = handler;
  }
  function unregister(key) {
    delete knownFactoryProducts[key];
  }
  instance = {
    create: create,
    register: register,
    unregister: unregister
  };
  return instance;
}
MetricsHandlerFactory.__dashjs_factory_name = 'MetricsHandlerFactory';
/* harmony default export */ __webpack_exports__["default"] = (_core_FactoryMaker_js__WEBPACK_IMPORTED_MODULE_4__["default"].getSingletonFactory(MetricsHandlerFactory));

/***/ }),

/***/ "./src/streaming/metrics/metrics/handlers/BufferLevelHandler.js":
/*!**********************************************************************!*\
  !*** ./src/streaming/metrics/metrics/handlers/BufferLevelHandler.js ***!
  \**********************************************************************/
/***/ (function(__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony import */ var _utils_HandlerHelpers_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../../utils/HandlerHelpers.js */ "./src/streaming/metrics/utils/HandlerHelpers.js");
/* harmony import */ var _core_FactoryMaker_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../../../../core/FactoryMaker.js */ "./src/core/FactoryMaker.js");
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



function BufferLevelHandler(config) {
  config = config || {};
  let instance, reportingController, n, name, interval, lastReportedTime;
  let context = this.context;
  let handlerHelpers = (0,_utils_HandlerHelpers_js__WEBPACK_IMPORTED_MODULE_0__["default"])(context).getInstance();
  let storedVOs = [];
  const metricsConstants = config.metricsConstants;
  function getLowestBufferLevelVO() {
    try {
      return Object.keys(storedVOs).map(key => storedVOs[key]).reduce((a, b) => {
        return a.level < b.level ? a : b;
      });
    } catch (e) {
      return;
    }
  }
  function intervalCallback() {
    let vo = getLowestBufferLevelVO();
    if (vo) {
      if (lastReportedTime !== vo.t) {
        lastReportedTime = vo.t;
        reportingController.report(name, vo);
      }
    }
  }
  function initialize(basename, rc, n_ms) {
    if (rc) {
      // this will throw if n is invalid, to be
      // caught by the initialize caller.
      n = handlerHelpers.validateN(n_ms);
      reportingController = rc;
      name = handlerHelpers.reconstructFullMetricName(basename, n_ms);
      interval = setInterval(intervalCallback, n);
    }
  }
  function reset() {
    clearInterval(interval);
    interval = null;
    n = 0;
    reportingController = null;
    lastReportedTime = null;
  }
  function handleNewMetric(metric, vo, type) {
    if (metric === metricsConstants.BUFFER_LEVEL) {
      if (vo.level < 0) {
        delete storedVOs[type];
      } else {
        storedVOs[type] = vo;
      }
    }
  }
  instance = {
    initialize: initialize,
    reset: reset,
    handleNewMetric: handleNewMetric
  };
  return instance;
}
BufferLevelHandler.__dashjs_factory_name = 'BufferLevelHandler';
/* harmony default export */ __webpack_exports__["default"] = (_core_FactoryMaker_js__WEBPACK_IMPORTED_MODULE_1__["default"].getClassFactory(BufferLevelHandler));

/***/ }),

/***/ "./src/streaming/metrics/metrics/handlers/DVBErrorsHandler.js":
/*!********************************************************************!*\
  !*** ./src/streaming/metrics/metrics/handlers/DVBErrorsHandler.js ***!
  \********************************************************************/
/***/ (function(__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony import */ var _MetricsReportingEvents_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../../MetricsReportingEvents.js */ "./src/streaming/metrics/MetricsReportingEvents.js");
/* harmony import */ var _core_FactoryMaker_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../../../../core/FactoryMaker.js */ "./src/core/FactoryMaker.js");
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



function DVBErrorsHandler(config) {
  config = config || {};
  let instance, reportingController;
  let eventBus = config.eventBus;
  const metricsConstants = config.metricsConstants;
  function onInitialisationComplete() {
    // we only want to report this once per call to initialize
    eventBus.off(_MetricsReportingEvents_js__WEBPACK_IMPORTED_MODULE_0__["default"].METRICS_INITIALISATION_COMPLETE, onInitialisationComplete, this);

    // Note: A Player becoming a reporting Player is itself
    // something which is recorded by the DVBErrors metric.
    eventBus.trigger(_MetricsReportingEvents_js__WEBPACK_IMPORTED_MODULE_0__["default"].BECAME_REPORTING_PLAYER);
  }
  function initialize(unused, rc) {
    if (rc) {
      reportingController = rc;
      eventBus.on(_MetricsReportingEvents_js__WEBPACK_IMPORTED_MODULE_0__["default"].METRICS_INITIALISATION_COMPLETE, onInitialisationComplete, this);
    }
  }
  function reset() {
    reportingController = null;
  }
  function handleNewMetric(metric, vo) {
    // simply pass metric straight through
    if (metric === metricsConstants.DVB_ERRORS) {
      if (reportingController) {
        reportingController.report(metric, vo);
      }
    }
  }
  instance = {
    initialize: initialize,
    reset: reset,
    handleNewMetric: handleNewMetric
  };
  return instance;
}
/* harmony default export */ __webpack_exports__["default"] = (_core_FactoryMaker_js__WEBPACK_IMPORTED_MODULE_1__["default"].getClassFactory(DVBErrorsHandler));

/***/ }),

/***/ "./src/streaming/metrics/metrics/handlers/GenericMetricHandler.js":
/*!************************************************************************!*\
  !*** ./src/streaming/metrics/metrics/handlers/GenericMetricHandler.js ***!
  \************************************************************************/
/***/ (function(__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony import */ var _core_FactoryMaker_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../../../../core/FactoryMaker.js */ "./src/core/FactoryMaker.js");
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
function GenericMetricHandler() {
  let instance, metricName, reportingController;
  function initialize(name, rc) {
    metricName = name;
    reportingController = rc;
  }
  function reset() {
    reportingController = null;
    metricName = undefined;
  }
  function handleNewMetric(metric, vo) {
    // simply pass metric straight through
    if (metric === metricName) {
      if (reportingController) {
        reportingController.report(metricName, vo);
      }
    }
  }
  instance = {
    initialize: initialize,
    reset: reset,
    handleNewMetric: handleNewMetric
  };
  return instance;
}
GenericMetricHandler.__dashjs_factory_name = 'GenericMetricHandler';
/* harmony default export */ __webpack_exports__["default"] = (_core_FactoryMaker_js__WEBPACK_IMPORTED_MODULE_0__["default"].getClassFactory(GenericMetricHandler));

/***/ }),

/***/ "./src/streaming/metrics/metrics/handlers/HttpListHandler.js":
/*!*******************************************************************!*\
  !*** ./src/streaming/metrics/metrics/handlers/HttpListHandler.js ***!
  \*******************************************************************/
/***/ (function(__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony import */ var _utils_HandlerHelpers_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../../utils/HandlerHelpers.js */ "./src/streaming/metrics/utils/HandlerHelpers.js");
/* harmony import */ var _core_FactoryMaker_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../../../../core/FactoryMaker.js */ "./src/core/FactoryMaker.js");
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



function HttpListHandler(config) {
  config = config || {};
  let instance, reportingController, n, type, name, interval;
  let storedVos = [];
  let handlerHelpers = (0,_utils_HandlerHelpers_js__WEBPACK_IMPORTED_MODULE_0__["default"])(this.context).getInstance();
  const metricsConstants = config.metricsConstants;
  function intervalCallback() {
    var vos = storedVos;
    if (vos.length) {
      if (reportingController) {
        reportingController.report(name, vos);
      }
    }
    storedVos = [];
  }
  function initialize(basename, rc, n_ms, requestType) {
    if (rc) {
      // this will throw if n is invalid, to be
      // caught by the initialize caller.
      n = handlerHelpers.validateN(n_ms);
      reportingController = rc;
      if (requestType && requestType.length) {
        type = requestType;
      }
      name = handlerHelpers.reconstructFullMetricName(basename, n_ms, requestType);
      interval = setInterval(intervalCallback, n);
    }
  }
  function reset() {
    clearInterval(interval);
    interval = null;
    n = null;
    type = null;
    storedVos = [];
    reportingController = null;
  }
  function handleNewMetric(metric, vo) {
    if (metric === metricsConstants.HTTP_REQUEST) {
      if (!type || type === vo.type) {
        storedVos.push(vo);
      }
    }
  }
  instance = {
    initialize,
    reset,
    handleNewMetric
  };
  return instance;
}
HttpListHandler.__dashjs_factory_name = 'HttpListHandler';
/* harmony default export */ __webpack_exports__["default"] = (_core_FactoryMaker_js__WEBPACK_IMPORTED_MODULE_1__["default"].getClassFactory(HttpListHandler));

/***/ }),

/***/ "./src/streaming/metrics/reporting/ReportingFactory.js":
/*!*************************************************************!*\
  !*** ./src/streaming/metrics/reporting/ReportingFactory.js ***!
  \*************************************************************/
/***/ (function(__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony import */ var _reporters_DVBReporting_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./reporters/DVBReporting.js */ "./src/streaming/metrics/reporting/reporters/DVBReporting.js");
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



function ReportingFactory(config) {
  config = config || {};
  const knownReportingSchemeIdUris = {
    'urn:dvb:dash:reporting:2014': _reporters_DVBReporting_js__WEBPACK_IMPORTED_MODULE_0__["default"]
  };
  const context = this.context;
  let instance;
  const logger = config.debug ? config.debug.getLogger(instance) : {};
  const metricsConstants = config.metricsConstants;
  const mediaPlayerModel = config.mediaPlayerModel || {};
  function create(entry, rangeController) {
    let reporting;
    try {
      reporting = knownReportingSchemeIdUris[entry.schemeIdUri](context).create({
        metricsConstants: metricsConstants,
        mediaPlayerModel: mediaPlayerModel
      });
      reporting.initialize(entry, rangeController);
    } catch (e) {
      reporting = null;
      logger.error(`ReportingFactory: could not create Reporting with schemeIdUri ${entry.schemeIdUri} (${e.message})`);
    }
    return reporting;
  }
  function register(schemeIdUri, moduleName) {
    knownReportingSchemeIdUris[schemeIdUri] = moduleName;
  }
  function unregister(schemeIdUri) {
    delete knownReportingSchemeIdUris[schemeIdUri];
  }
  instance = {
    create: create,
    register: register,
    unregister: unregister
  };
  return instance;
}
ReportingFactory.__dashjs_factory_name = 'ReportingFactory';
/* harmony default export */ __webpack_exports__["default"] = (_core_FactoryMaker_js__WEBPACK_IMPORTED_MODULE_1__["default"].getSingletonFactory(ReportingFactory));

/***/ }),

/***/ "./src/streaming/metrics/reporting/reporters/DVBReporting.js":
/*!*******************************************************************!*\
  !*** ./src/streaming/metrics/reporting/reporters/DVBReporting.js ***!
  \*******************************************************************/
/***/ (function(__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony import */ var _utils_MetricSerialiser_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../../utils/MetricSerialiser.js */ "./src/streaming/metrics/utils/MetricSerialiser.js");
/* harmony import */ var _utils_RNG_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../../utils/RNG.js */ "./src/streaming/metrics/utils/RNG.js");
/* harmony import */ var _models_CustomParametersModel_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../../../models/CustomParametersModel.js */ "./src/streaming/models/CustomParametersModel.js");
/* harmony import */ var _core_FactoryMaker_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../../../../core/FactoryMaker.js */ "./src/core/FactoryMaker.js");
/* harmony import */ var _core_Settings_js__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ../../../../core/Settings.js */ "./src/core/Settings.js");
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






function DVBReporting(config) {
  config = config || {};
  let instance;
  let context = this.context;
  let metricSerialiser, customParametersModel, randomNumberGenerator, reportingPlayerStatusDecided, isReportingPlayer, reportingUrl, rangeController;
  let settings = (0,_core_Settings_js__WEBPACK_IMPORTED_MODULE_4__["default"])(context).getInstance();
  let USE_DRAFT_DVB_SPEC = true;
  let allowPendingRequestsToCompleteOnReset = true;
  let pendingRequests = [];
  const metricsConstants = config.metricsConstants;
  function setup() {
    metricSerialiser = (0,_utils_MetricSerialiser_js__WEBPACK_IMPORTED_MODULE_0__["default"])(context).getInstance();
    randomNumberGenerator = (0,_utils_RNG_js__WEBPACK_IMPORTED_MODULE_1__["default"])(context).getInstance();
    customParametersModel = (0,_models_CustomParametersModel_js__WEBPACK_IMPORTED_MODULE_2__["default"])(context).getInstance();
    resetInitialSettings();
  }
  function doGetRequest(url, successCB, failureCB) {
    let req = new XMLHttpRequest();
    req.withCredentials = customParametersModel.getXHRWithCredentialsForType(metricsConstants.HTTP_REQUEST_DVB_REPORTING_TYPE);
    const oncomplete = function () {
      let reqIndex = pendingRequests.indexOf(req);
      if (reqIndex === -1) {
        return;
      } else {
        pendingRequests.splice(reqIndex, 1);
      }
      if (req.status >= 200 && req.status < 300) {
        if (successCB) {
          successCB();
        }
      } else {
        if (failureCB) {
          failureCB();
        }
      }
    };
    pendingRequests.push(req);
    try {
      req.open('GET', url);
      req.onloadend = oncomplete;
      req.onerror = oncomplete;
      req.send();
    } catch (e) {
      req.onerror();
    }
  }
  function report(type, vos) {
    if (!Array.isArray(vos)) {
      vos = [vos];
    }

    // If the Player is not a reporting Player, then the Player shall
    // not report any errors.
    // ... In addition to any time restrictions specified by a Range
    // element within the Metrics element.
    if (isReportingPlayer && rangeController.isEnabled()) {
      // This reporting mechanism operates by creating one HTTP GET
      // request for every entry in the top level list of the metric.
      vos.forEach(function (vo) {
        let url = metricSerialiser.serialise(vo);

        // this has been proposed for errata
        if (USE_DRAFT_DVB_SPEC && type !== metricsConstants.DVB_ERRORS) {
          url = `metricname=${type}&${url}`;
        }

        // Take the value of the @reportingUrl attribute, append a
        // question mark ('?') character and then append the string
        // created in the previous step.
        url = `${reportingUrl}?${url}`;

        // Make an HTTP GET request to the URL contained within the
        // string created in the previous step.
        doGetRequest(url, null, function () {
          // If the Player is unable to make the report, for
          // example because the @reportingUrl is invalid, the
          // host cannot be reached, or an HTTP status code other
          // than one in the 200 series is received, the Player
          // shall cease being a reporting Player for the
          // duration of the MPD.
          isReportingPlayer = false;
        });
      });
    }
  }
  function initialize(entry, rc) {
    let probability;
    rangeController = rc;
    reportingUrl = settings.get().streaming.dvbReporting.reportingUrl || entry.dvbReportingUrl;

    // If a required attribute is missing, the Reporting descriptor may
    // be ignored by the Player
    if (!reportingUrl) {
      throw new Error('MPD parameter missing "dvb:reportingUrl" or URL not provided in player settings');
    }

    // A Player's status, as a reporting Player or not, shall remain
    // static for the duration of the MPD, regardless of MPD updates.
    // (i.e. only calling reset (or failure) changes this state)
    if (!reportingPlayerStatusDecided) {
      probability = entry.dvbProbability;
      // TS 103 285 Clause 10.12.3.4
      // If the @probability attribute is set to 1000, it shall be a reporting Player.
      // If the @probability attribute is absent it will take the default value of 1000.
      // For any other value of the @probability attribute, it shall decide at random whether to be a
      // reporting Player, such that the probability of being one is @probability/1000.
      if (probability && (probability === 1000 || probability / 1000 >= randomNumberGenerator.random())) {
        isReportingPlayer = true;
      }
      reportingPlayerStatusDecided = true;
    }
  }
  function resetInitialSettings() {
    reportingPlayerStatusDecided = false;
    isReportingPlayer = false;
    reportingUrl = null;
    rangeController = null;
  }
  function reset() {
    if (!allowPendingRequestsToCompleteOnReset) {
      pendingRequests.forEach(req => req.abort());
      pendingRequests = [];
    }
    resetInitialSettings();
  }
  instance = {
    report: report,
    initialize: initialize,
    reset: reset
  };
  setup();
  return instance;
}
DVBReporting.__dashjs_factory_name = 'DVBReporting';
/* harmony default export */ __webpack_exports__["default"] = (_core_FactoryMaker_js__WEBPACK_IMPORTED_MODULE_3__["default"].getClassFactory(DVBReporting));

/***/ }),

/***/ "./src/streaming/metrics/utils/DVBErrorsTranslator.js":
/*!************************************************************!*\
  !*** ./src/streaming/metrics/utils/DVBErrorsTranslator.js ***!
  \************************************************************/
/***/ (function(__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony import */ var _vo_DVBErrors_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../vo/DVBErrors.js */ "./src/streaming/metrics/vo/DVBErrors.js");
/* harmony import */ var _MetricsReportingEvents_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../MetricsReportingEvents.js */ "./src/streaming/metrics/MetricsReportingEvents.js");
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




function DVBErrorsTranslator(config) {
  config = config || {};
  let instance, mpd;
  const eventBus = config.eventBus;
  const dashMetrics = config.dashMetrics;
  const metricsConstants = config.metricsConstants;
  //MediaPlayerEvents have been added to Events in MediaPlayer class
  const Events = config.events;
  function report(vo) {
    let o = new _vo_DVBErrors_js__WEBPACK_IMPORTED_MODULE_0__["default"]();
    if (!mpd) {
      return;
    }
    for (const key in vo) {
      if (vo.hasOwnProperty(key)) {
        o[key] = vo[key];
      }
    }
    if (!o.mpdurl) {
      o.mpdurl = mpd.originalUrl || mpd.url;
    }
    if (!o.terror) {
      o.terror = new Date();
    }
    dashMetrics.addDVBErrors(o);
  }
  function onManifestUpdate(e) {
    if (e.error) {
      return;
    }
    mpd = e.manifest;
  }
  function onServiceLocationChanged(e) {
    report({
      errorcode: _vo_DVBErrors_js__WEBPACK_IMPORTED_MODULE_0__["default"].BASE_URL_CHANGED,
      servicelocation: e.entry
    });
  }
  function onBecameReporter() {
    report({
      errorcode: _vo_DVBErrors_js__WEBPACK_IMPORTED_MODULE_0__["default"].BECAME_REPORTER
    });
  }
  function handleHttpMetric(vo) {
    if (vo.responsecode === 0 ||
    // connection failure - unknown
    vo.responsecode == null ||
    // Generated on .catch() and when uninitialized
    vo.responsecode >= 400 ||
    // HTTP error status code
    vo.responsecode < 100 ||
    // unknown status codes
    vo.responsecode >= 600) {
      // unknown status codes
      report({
        errorcode: vo.responsecode || _vo_DVBErrors_js__WEBPACK_IMPORTED_MODULE_0__["default"].CONNECTION_ERROR,
        url: vo.url,
        terror: vo.tresponse,
        servicelocation: vo._serviceLocation
      });
    }
  }
  function onMetricEvent(e) {
    switch (e.metric) {
      case metricsConstants.HTTP_REQUEST:
        handleHttpMetric(e.value);
        break;
      default:
        break;
    }
  }
  function onPlaybackError(e) {
    let reason = e.error ? e.error.code : 0;
    let errorcode;
    switch (reason) {
      case MediaError.MEDIA_ERR_NETWORK:
        errorcode = _vo_DVBErrors_js__WEBPACK_IMPORTED_MODULE_0__["default"].CONNECTION_ERROR;
        break;
      case MediaError.MEDIA_ERR_DECODE:
        errorcode = _vo_DVBErrors_js__WEBPACK_IMPORTED_MODULE_0__["default"].CORRUPT_MEDIA_OTHER;
        break;
      default:
        return;
    }
    report({
      errorcode: errorcode
    });
  }
  function initialize() {
    eventBus.on(Events.MANIFEST_UPDATED, onManifestUpdate, instance);
    eventBus.on(Events.SERVICE_LOCATION_BASE_URL_BLACKLIST_CHANGED, onServiceLocationChanged, instance);
    eventBus.on(Events.METRIC_ADDED, onMetricEvent, instance);
    eventBus.on(Events.METRIC_UPDATED, onMetricEvent, instance);
    eventBus.on(Events.PLAYBACK_ERROR, onPlaybackError, instance);
    eventBus.on(_MetricsReportingEvents_js__WEBPACK_IMPORTED_MODULE_1__["default"].BECAME_REPORTING_PLAYER, onBecameReporter, instance);
  }
  function reset() {
    eventBus.off(Events.MANIFEST_UPDATED, onManifestUpdate, instance);
    eventBus.off(Events.SERVICE_LOCATION_BASE_URL_BLACKLIST_CHANGED, onServiceLocationChanged, instance);
    eventBus.off(Events.METRIC_ADDED, onMetricEvent, instance);
    eventBus.off(Events.METRIC_UPDATED, onMetricEvent, instance);
    eventBus.off(Events.PLAYBACK_ERROR, onPlaybackError, instance);
    eventBus.off(_MetricsReportingEvents_js__WEBPACK_IMPORTED_MODULE_1__["default"].BECAME_REPORTING_PLAYER, onBecameReporter, instance);
  }
  instance = {
    initialize,
    reset
  };
  return instance;
}
DVBErrorsTranslator.__dashjs_factory_name = 'DVBErrorsTranslator';
/* harmony default export */ __webpack_exports__["default"] = (_core_FactoryMaker_js__WEBPACK_IMPORTED_MODULE_2__["default"].getSingletonFactory(DVBErrorsTranslator));

/***/ }),

/***/ "./src/streaming/metrics/utils/HandlerHelpers.js":
/*!*******************************************************!*\
  !*** ./src/streaming/metrics/utils/HandlerHelpers.js ***!
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



/**
 * @ignore
 */
function HandlerHelpers() {
  return {
    reconstructFullMetricName: function (key, n, type) {
      let mn = key;
      if (n) {
        mn += '(' + n;
        if (type && type.length) {
          mn += ',' + type;
        }
        mn += ')';
      }
      return mn;
    },
    validateN: function (n_ms) {
      if (!n_ms) {
        throw new Error('missing n');
      }
      if (isNaN(n_ms)) {
        throw new Error('n is NaN');
      }

      // n is a positive integer is defined to refer to the metric
      // in which the buffer level is recorded every n ms.
      if (n_ms < 0) {
        throw new Error('n must be positive');
      }
      return n_ms;
    }
  };
}
HandlerHelpers.__dashjs_factory_name = 'HandlerHelpers';
/* harmony default export */ __webpack_exports__["default"] = (_core_FactoryMaker_js__WEBPACK_IMPORTED_MODULE_0__["default"].getSingletonFactory(HandlerHelpers));

/***/ }),

/***/ "./src/streaming/metrics/utils/ManifestParsing.js":
/*!********************************************************!*\
  !*** ./src/streaming/metrics/utils/ManifestParsing.js ***!
  \********************************************************/
/***/ (function(__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony import */ var _vo_Metrics_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../vo/Metrics.js */ "./src/streaming/metrics/vo/Metrics.js");
/* harmony import */ var _vo_Range_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../vo/Range.js */ "./src/streaming/metrics/vo/Range.js");
/* harmony import */ var _vo_Reporting_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../vo/Reporting.js */ "./src/streaming/metrics/vo/Reporting.js");
/* harmony import */ var _core_FactoryMaker_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../../../core/FactoryMaker.js */ "./src/core/FactoryMaker.js");




function ManifestParsing(config) {
  config = config || {};
  let instance;
  let adapter = config.adapter;
  const constants = config.constants;
  function getMetricsRangeStartTime(manifest, dynamic, range) {
    let voPeriods, reportingStartTime;
    let presentationStartTime = 0;
    if (dynamic) {
      // For services with MPD@type='dynamic', the start time is
      // indicated in wall clock time by adding the value of this
      // attribute to the value of the MPD@availabilityStartTime
      // attribute.
      presentationStartTime = adapter.getAvailabilityStartTime(manifest) / 1000;
    } else {
      // For services with MPD@type='static', the start time is indicated
      // in Media Presentation time and is relative to the PeriodStart
      // time of the first Period in this MPD.
      voPeriods = adapter.getRegularPeriods(manifest);
      if (voPeriods.length) {
        presentationStartTime = voPeriods[0].start;
      }
    }

    // When not present, DASH Metrics collection is
    // requested from the beginning of content
    // consumption.
    reportingStartTime = presentationStartTime;
    if (range && range.hasOwnProperty(constants.START_TIME)) {
      reportingStartTime += range.starttime;
    }
    return reportingStartTime;
  }
  function getMetrics(manifest) {
    let metrics = [];
    if (manifest && manifest.Metrics) {
      manifest.Metrics.forEach(metric => {
        var metricEntry = new _vo_Metrics_js__WEBPACK_IMPORTED_MODULE_0__["default"]();
        var isDynamic = adapter.getIsDynamic(manifest);
        if (metric.hasOwnProperty('metrics')) {
          metricEntry.metrics = metric.metrics;
        } else {
          return;
        }
        if (metric.Range) {
          metric.Range.forEach(range => {
            var rangeEntry = new _vo_Range_js__WEBPACK_IMPORTED_MODULE_1__["default"]();
            rangeEntry.starttime = getMetricsRangeStartTime(manifest, isDynamic, range);
            if (range.hasOwnProperty('duration')) {
              rangeEntry.duration = range.duration;
            } else {
              // if not present, the value is identical to the
              // Media Presentation duration.
              rangeEntry.duration = adapter.getDuration(manifest);
            }
            rangeEntry._useWallClockTime = isDynamic;
            metricEntry.Range.push(rangeEntry);
          });
        }
        if (metric.Reporting) {
          metric.Reporting.forEach(reporting => {
            var reportingEntry = new _vo_Reporting_js__WEBPACK_IMPORTED_MODULE_2__["default"]();
            if (reporting.hasOwnProperty(constants.SCHEME_ID_URI)) {
              reportingEntry.schemeIdUri = reporting.schemeIdUri;
            } else {
              // Invalid Reporting. schemeIdUri must be set. Ignore.
              return;
            }
            if (reporting.hasOwnProperty('value')) {
              reportingEntry.value = reporting.value;
            }
            if (reporting.hasOwnProperty(constants.DVB_REPORTING_URL)) {
              reportingEntry.dvbReportingUrl = reporting[constants.DVB_REPORTING_URL];
            }
            if (reporting.hasOwnProperty(constants.DVB_PROBABILITY)) {
              reportingEntry.dvbProbability = reporting[constants.DVB_PROBABILITY];
            }
            metricEntry.Reporting.push(reportingEntry);
          });
        } else {
          // Invalid Metrics. At least one reporting must be present. Ignore
          return;
        }
        metrics.push(metricEntry);
      });
    }
    return metrics;
  }
  instance = {
    getMetrics: getMetrics
  };
  return instance;
}
ManifestParsing.__dashjs_factory_name = 'ManifestParsing';
/* harmony default export */ __webpack_exports__["default"] = (_core_FactoryMaker_js__WEBPACK_IMPORTED_MODULE_3__["default"].getSingletonFactory(ManifestParsing));

/***/ }),

/***/ "./src/streaming/metrics/utils/MetricSerialiser.js":
/*!*********************************************************!*\
  !*** ./src/streaming/metrics/utils/MetricSerialiser.js ***!
  \*********************************************************/
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
function MetricSerialiser() {
  // For each entry in the top level list within the metric (in the case
  // of the DVBErrors metric each entry corresponds to an "error event"
  // described in clause 10.8.4) the Player shall:
  function serialise(metric) {
    let pairs = [];
    let obj = [];
    let key, value;

    // Take each (key, value) pair from the metric entry and create a
    // string consisting of the name of the key, followed by an equals
    // ('=') character, followed by the string representation of the
    // value. The string representation of the value is created based
    // on the type of the value following the instructions in Table 22.
    for (key in metric) {
      if (metric.hasOwnProperty(key) && key.indexOf('_') !== 0) {
        value = metric[key];

        // we want to ensure that keys still end up in the report
        // even if there is no value
        if (value === undefined || value === null) {
          value = '';
        }

        // DVB A168 10.12.4 Table 22
        if (Array.isArray(value)) {
          // if trace or similar is null, do not include in output
          if (!value.length) {
            continue;
          }
          obj = [];
          value.forEach(function (v) {
            let isBuiltIn = Object.prototype.toString.call(v).slice(8, -1) !== 'Object';
            obj.push(isBuiltIn ? v : serialise(v));
          });
          value = obj.map(encodeURIComponent).join(',');
        } else if (typeof value === 'string') {
          value = encodeURIComponent(value);
        } else if (value instanceof Date) {
          value = value.toISOString();
        } else if (typeof value === 'number') {
          value = Math.round(value);
        }
        pairs.push(key + '=' + value);
      }
    }

    // Concatenate the strings created in the previous step with an
    // ampersand ('&') character between each one.
    return pairs.join('&');
  }
  return {
    serialise: serialise
  };
}
MetricSerialiser.__dashjs_factory_name = 'MetricSerialiser';
/* harmony default export */ __webpack_exports__["default"] = (_core_FactoryMaker_js__WEBPACK_IMPORTED_MODULE_0__["default"].getSingletonFactory(MetricSerialiser));

/***/ }),

/***/ "./src/streaming/metrics/utils/RNG.js":
/*!********************************************!*\
  !*** ./src/streaming/metrics/utils/RNG.js ***!
  \********************************************/
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
function RNG() {
  // check whether secure random numbers are available. if not, revert to
  // using Math.random
  let crypto = window.crypto || window.msCrypto;

  // could just as easily use any other array type by changing line below
  let ArrayType = Uint32Array;
  let MAX_VALUE = Math.pow(2, ArrayType.BYTES_PER_ELEMENT * 8) - 1;

  // currently there is only one client for this code, and that only uses
  // a single random number per initialisation. may want to increase this
  // number if more consumers in the future
  let NUM_RANDOM_NUMBERS = 10;
  let randomNumbers, index, instance;
  function initialize() {
    if (crypto) {
      if (!randomNumbers) {
        randomNumbers = new ArrayType(NUM_RANDOM_NUMBERS);
      }
      crypto.getRandomValues(randomNumbers);
      index = 0;
    }
  }
  function rand(min, max) {
    let r;
    if (!min) {
      min = 0;
    }
    if (!max) {
      max = 1;
    }
    if (crypto) {
      if (index === randomNumbers.length) {
        initialize();
      }
      r = randomNumbers[index] / MAX_VALUE;
      index += 1;
    } else {
      r = Math.random();
    }
    return r * (max - min) + min;
  }
  instance = {
    random: rand
  };
  initialize();
  return instance;
}
RNG.__dashjs_factory_name = 'RNG';
/* harmony default export */ __webpack_exports__["default"] = (_core_FactoryMaker_js__WEBPACK_IMPORTED_MODULE_0__["default"].getSingletonFactory(RNG));

/***/ }),

/***/ "./src/streaming/metrics/vo/DVBErrors.js":
/*!***********************************************!*\
  !*** ./src/streaming/metrics/vo/DVBErrors.js ***!
  \***********************************************/
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
class DVBErrors {
  constructor() {
    this.mpdurl = null;
    // String - Absolute URL from which the MPD was originally
    // retrieved (MPD updates will not change this value).

    this.errorcode = null;
    // String - The value of errorcode depends upon the type
    // of error being reported. For an error listed in the
    // ErrorType column below the value is as described in the
    // Value column.
    //
    // ErrorType                                            Value
    // ---------                                            -----
    // HTTP error status code                               HTTP status code
    // Unknown HTTP status code                             HTTP status code
    // SSL connection failed                                "SSL" followed by SSL alert value
    // DNS resolution failed                                "C00"
    // Host unreachable                                     "C01"
    // Connection refused                                   "C02"
    // Connection error – Not otherwise specified           "C03"
    // Corrupt media – ISO BMFF container cannot be parsed  "M00"
    // Corrupt media – Not otherwise specified              "M01"
    // Changing Base URL in use due to errors               "F00"
    // Becoming an error reporting Player                   "S00"

    this.terror = null;
    // Real-Time - Date and time at which error occurred in UTC,
    // formatted as a combined date and time according to ISO 8601.

    this.url = null;
    // String - Absolute URL from which data was being requested
    // when this error occurred. If the error report is in relation
    // to corrupt media or changing BaseURL, this may be a null
    // string if the URL from which the media was obtained or
    // which led to the change of BaseURL is no longer known.

    this.ipaddress = null;
    // String - IP Address which the host name in "url" resolved to.
    // If the error report is in relation to corrupt media or
    // changing BaseURL, this may be a null string if the URL
    // from which the media was obtained or which led to the
    // change of BaseURL is no longer known.

    this.servicelocation = null;
    // String - The value of the serviceLocation field in the
    // BaseURL being used. In the event of this report indicating
    // a change of BaseURL this is the value from the BaseURL
    // being moved from.
  }
}
DVBErrors.SSL_CONNECTION_FAILED_PREFIX = 'SSL';
DVBErrors.DNS_RESOLUTION_FAILED = 'C00';
DVBErrors.HOST_UNREACHABLE = 'C01';
DVBErrors.CONNECTION_REFUSED = 'C02';
DVBErrors.CONNECTION_ERROR = 'C03';
DVBErrors.CORRUPT_MEDIA_ISOBMFF = 'M00';
DVBErrors.CORRUPT_MEDIA_OTHER = 'M01';
DVBErrors.BASE_URL_CHANGED = 'F00';
DVBErrors.BECAME_REPORTER = 'S00';
/* harmony default export */ __webpack_exports__["default"] = (DVBErrors);

/***/ }),

/***/ "./src/streaming/metrics/vo/Metrics.js":
/*!*********************************************!*\
  !*** ./src/streaming/metrics/vo/Metrics.js ***!
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
 * @class
 * @ignore
 */
class Metrics {
  constructor() {
    this.metrics = '';
    this.Range = [];
    this.Reporting = [];
  }
}
/* harmony default export */ __webpack_exports__["default"] = (Metrics);

/***/ }),

/***/ "./src/streaming/metrics/vo/Range.js":
/*!*******************************************!*\
  !*** ./src/streaming/metrics/vo/Range.js ***!
  \*******************************************/
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
class Range {
  constructor() {
    // as defined in ISO23009-1
    this.starttime = 0;
    this.duration = Infinity;

    // for internal use
    this._useWallClockTime = false;
  }
}
/* harmony default export */ __webpack_exports__["default"] = (Range);

/***/ }),

/***/ "./src/streaming/metrics/vo/Reporting.js":
/*!***********************************************!*\
  !*** ./src/streaming/metrics/vo/Reporting.js ***!
  \***********************************************/
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

// TS 103 285 Clause 10.12.3.3
const DEFAULT_DVB_PROBABILITY = 1000;
class Reporting {
  constructor() {
    this.schemeIdUri = '';
    this.value = '';

    // DVB Extensions
    this.dvbReportingUrl = '';
    this.dvbProbability = DEFAULT_DVB_PROBABILITY;
  }
}
/* harmony default export */ __webpack_exports__["default"] = (Reporting);

/***/ }),

/***/ "./src/streaming/models/CmcdModel.js":
/*!*******************************************!*\
  !*** ./src/streaming/models/CmcdModel.js ***!
  \*******************************************/
/***/ (function(__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony import */ var _svta_cml_cmcd__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @svta/cml-cmcd */ "./node_modules/@svta/cml-cmcd/dist/index.js");
/* harmony import */ var _vo_metrics_HTTPRequest_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../vo/metrics/HTTPRequest.js */ "./src/streaming/vo/metrics/HTTPRequest.js");
/* harmony import */ var _MediaPlayerEvents_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../MediaPlayerEvents.js */ "./src/streaming/MediaPlayerEvents.js");
/* harmony import */ var _core_Utils_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../../core/Utils.js */ "./src/core/Utils.js");
/* harmony import */ var _streaming_constants_Constants_js__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ../../streaming/constants/Constants.js */ "./src/streaming/constants/Constants.js");
/* harmony import */ var _core_FactoryMaker_js__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ../../core/FactoryMaker.js */ "./src/core/FactoryMaker.js");
/* harmony import */ var _dash_models_DashManifestModel_js__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! ../../dash/models/DashManifestModel.js */ "./src/dash/models/DashManifestModel.js");
/* harmony import */ var _cmcd_config_CmcdConfigAccessor_js__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(/*! ../cmcd/config/CmcdConfigAccessor.js */ "./src/streaming/cmcd/config/CmcdConfigAccessor.js");
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









const RTP_SAFETY_FACTOR = 5;
const REQUEST_TYPE_TO_CMCD_FILTER = {
  [_vo_metrics_HTTPRequest_js__WEBPACK_IMPORTED_MODULE_1__.HTTPRequest.INIT_SEGMENT_TYPE]: 'segment',
  [_vo_metrics_HTTPRequest_js__WEBPACK_IMPORTED_MODULE_1__.HTTPRequest.MEDIA_SEGMENT_TYPE]: 'segment',
  [_vo_metrics_HTTPRequest_js__WEBPACK_IMPORTED_MODULE_1__.HTTPRequest.XLINK_EXPANSION_TYPE]: 'xlink',
  [_vo_metrics_HTTPRequest_js__WEBPACK_IMPORTED_MODULE_1__.HTTPRequest.MPD_TYPE]: 'mpd',
  [_vo_metrics_HTTPRequest_js__WEBPACK_IMPORTED_MODULE_1__.HTTPRequest.CONTENT_STEERING_TYPE]: 'steering',
  [_vo_metrics_HTTPRequest_js__WEBPACK_IMPORTED_MODULE_1__.HTTPRequest.OTHER_TYPE]: 'other'
};
function CmcdModel() {
  let instance,
    dashMetrics,
    serviceDescriptionController,
    playbackController,
    abrController,
    throughputController,
    cmcdConfigAccessor,
    _lastMediaTypeRequest,
    _isStartup,
    _bufferLevelStarved,
    _initialMediaRequestsDone,
    _playbackStartedTime,
    _isSeeking,
    streamProcessors,
    _rebufferingStartTime = {},
    _rebufferingDuration = {},
    _streamType,
    _streamingFormat;
  let context = this.context;
  function setup() {
    cmcdConfigAccessor = (0,_cmcd_config_CmcdConfigAccessor_js__WEBPACK_IMPORTED_MODULE_7__["default"])(context).getInstance();
    resetInitialSettings();
  }
  function setConfig(config) {
    if (!config) {
      return;
    }
    if (config.abrController) {
      abrController = config.abrController;
    }
    if (config.dashMetrics) {
      dashMetrics = config.dashMetrics;
    }
    if (config.playbackController) {
      playbackController = config.playbackController;
    }
    if (config.throughputController) {
      throughputController = config.throughputController;
    }
    if (config.serviceDescriptionController) {
      serviceDescriptionController = config.serviceDescriptionController;
    }
  }
  function _isValidValue(value) {
    return value !== null && value !== undefined && !isNaN(value) && isFinite(value);
  }
  function _toInnerList(videoValue, audioValue) {
    const values = [];
    if (_isValidValue(videoValue)) {
      values.push((0,_svta_cml_cmcd__WEBPACK_IMPORTED_MODULE_0__.toCmcdValue)(videoValue, {
        v: true
      }));
    }
    if (_isValidValue(audioValue)) {
      values.push((0,_svta_cml_cmcd__WEBPACK_IMPORTED_MODULE_0__.toCmcdValue)(audioValue, {
        a: true
      }));
    }
    return values.length > 0 ? values : null;
  }
  function _calculateCmcdDataForRequestForMediaSegment(request, mediaType) {
    _initForMediaType(mediaType);
    const data = getGenericCmcdData(mediaType);
    const encodedBitrate = _getBitrateByRequest(request);
    const d = _getObjectDurationByRequest(request);
    const mtp = _getMeasuredThroughputByType(mediaType);
    const dl = _getDeadlineByType(mediaType);
    const bl = _getBufferLevelByType(mediaType);
    const tb = _getTopBitrateByType(request.representation?.mediaInfo);
    const tpb = _getTopPlayableBitrate(mediaType);
    const pb = _getPlayheadBitrate(mediaType);
    const nextRequest = _probeNextRequest(mediaType);
    let ot;
    if (mediaType === _streaming_constants_Constants_js__WEBPACK_IMPORTED_MODULE_4__["default"].VIDEO) {
      ot = _svta_cml_cmcd__WEBPACK_IMPORTED_MODULE_0__.CmcdObjectType.VIDEO;
    }
    if (mediaType === _streaming_constants_Constants_js__WEBPACK_IMPORTED_MODULE_4__["default"].AUDIO) {
      ot = _svta_cml_cmcd__WEBPACK_IMPORTED_MODULE_0__.CmcdObjectType.AUDIO;
    }
    if (request.mediaType === _streaming_constants_Constants_js__WEBPACK_IMPORTED_MODULE_4__["default"].ENHANCEMENT) {
      ot = _svta_cml_cmcd__WEBPACK_IMPORTED_MODULE_0__.CmcdObjectType.OTHER;
    }
    if (mediaType === _streaming_constants_Constants_js__WEBPACK_IMPORTED_MODULE_4__["default"].TEXT) {
      if (request.representation.mediaInfo.mimeType === 'application/mp4') {
        ot = _svta_cml_cmcd__WEBPACK_IMPORTED_MODULE_0__.CmcdObjectType.TIMED_TEXT;
      } else {
        ot = _svta_cml_cmcd__WEBPACK_IMPORTED_MODULE_0__.CmcdObjectType.CAPTION;
      }
    }
    const rtp = cmcdConfigAccessor.has('rtp') ? cmcdConfigAccessor.get('rtp') : _calculateRtp(request);
    if (!isNaN(rtp)) {
      data.rtp = rtp;
    }
    if (nextRequest) {
      if (request.url !== nextRequest.url) {
        const relativeUrl = _core_Utils_js__WEBPACK_IMPORTED_MODULE_3__["default"].getRelativeUrl(request.url, nextRequest.url);
        const params = nextRequest.range ? {
          r: nextRequest.range
        } : undefined;
        data.nor = [(0,_svta_cml_cmcd__WEBPACK_IMPORTED_MODULE_0__.toCmcdValue)(relativeUrl, params)];
      }
    }
    if (encodedBitrate) {
      const videoBr = mediaType === _streaming_constants_Constants_js__WEBPACK_IMPORTED_MODULE_4__["default"].VIDEO ? encodedBitrate : null;
      const audioBr = mediaType === _streaming_constants_Constants_js__WEBPACK_IMPORTED_MODULE_4__["default"].AUDIO ? encodedBitrate : null;
      data.br = _toInnerList(videoBr, audioBr) || [(0,_svta_cml_cmcd__WEBPACK_IMPORTED_MODULE_0__.toCmcdValue)(encodedBitrate, {})];
    }
    if (ot) {
      data.ot = ot;
    }
    if (!isNaN(d)) {
      data.d = d;
    }
    if (!isNaN(mtp)) {
      const videoMtp = mediaType === _streaming_constants_Constants_js__WEBPACK_IMPORTED_MODULE_4__["default"].VIDEO ? mtp : null;
      const audioMtp = mediaType === _streaming_constants_Constants_js__WEBPACK_IMPORTED_MODULE_4__["default"].AUDIO ? mtp : null;
      data.mtp = _toInnerList(videoMtp, audioMtp) || [(0,_svta_cml_cmcd__WEBPACK_IMPORTED_MODULE_0__.toCmcdValue)(mtp, {})];
    }
    if (!isNaN(dl)) {
      data.dl = dl;
    }
    if (!isNaN(bl)) {
      const videoBl = mediaType === _streaming_constants_Constants_js__WEBPACK_IMPORTED_MODULE_4__["default"].VIDEO ? bl : null;
      const audioBl = mediaType === _streaming_constants_Constants_js__WEBPACK_IMPORTED_MODULE_4__["default"].AUDIO ? bl : null;
      data.bl = _toInnerList(videoBl, audioBl) || [(0,_svta_cml_cmcd__WEBPACK_IMPORTED_MODULE_0__.toCmcdValue)(bl, {})];
    }
    if (!isNaN(tb) && isFinite(tb)) {
      const videoTb = mediaType === _streaming_constants_Constants_js__WEBPACK_IMPORTED_MODULE_4__["default"].VIDEO ? tb : null;
      const audioTb = mediaType === _streaming_constants_Constants_js__WEBPACK_IMPORTED_MODULE_4__["default"].AUDIO ? tb : null;
      data.tb = _toInnerList(videoTb, audioTb) || [(0,_svta_cml_cmcd__WEBPACK_IMPORTED_MODULE_0__.toCmcdValue)(tb, {})];
    }
    if (tpb !== null && !isNaN(tpb)) {
      const videoTpb = mediaType === _streaming_constants_Constants_js__WEBPACK_IMPORTED_MODULE_4__["default"].VIDEO ? tpb : null;
      const audioTpb = mediaType === _streaming_constants_Constants_js__WEBPACK_IMPORTED_MODULE_4__["default"].AUDIO ? tpb : null;
      data.tpb = _toInnerList(videoTpb, audioTpb) || [(0,_svta_cml_cmcd__WEBPACK_IMPORTED_MODULE_0__.toCmcdValue)(tpb, {})];
    }
    if (pb !== null && !isNaN(pb)) {
      const videoPb = mediaType === _streaming_constants_Constants_js__WEBPACK_IMPORTED_MODULE_4__["default"].VIDEO ? pb : null;
      const audioPb = mediaType === _streaming_constants_Constants_js__WEBPACK_IMPORTED_MODULE_4__["default"].AUDIO ? pb : null;
      data.pb = _toInnerList(videoPb, audioPb) || [(0,_svta_cml_cmcd__WEBPACK_IMPORTED_MODULE_0__.toCmcdValue)(pb, {})];
    }
    if (_bufferLevelStarved[mediaType]) {
      data.bs = true;
      _bufferLevelStarved[mediaType] = false;
    }
    if (_rebufferingDuration[mediaType]) {
      const videoBsd = mediaType === _streaming_constants_Constants_js__WEBPACK_IMPORTED_MODULE_4__["default"].VIDEO ? _rebufferingDuration[mediaType] : null;
      const audioBsd = mediaType === _streaming_constants_Constants_js__WEBPACK_IMPORTED_MODULE_4__["default"].AUDIO ? _rebufferingDuration[mediaType] : null;
      data.bsd = _toInnerList(videoBsd, audioBsd) || [(0,_svta_cml_cmcd__WEBPACK_IMPORTED_MODULE_0__.toCmcdValue)(_rebufferingDuration[mediaType], {})];
      delete _rebufferingDuration[mediaType];
    }
    if (_isStartup[mediaType] || !_initialMediaRequestsDone[mediaType]) {
      data.su = true;
      _isStartup[mediaType] = false;
      _initialMediaRequestsDone[mediaType] = true;
    }
    Object.assign(data, _getAggregatedBitrateData());
    return data;
  }
  function _initForMediaType(mediaType) {
    if (!_initialMediaRequestsDone.hasOwnProperty(mediaType)) {
      _initialMediaRequestsDone[mediaType] = false;
    }
    if (!_isStartup.hasOwnProperty(mediaType)) {
      _isStartup[mediaType] = false;
    }
    if (!_bufferLevelStarved.hasOwnProperty(mediaType)) {
      _bufferLevelStarved[mediaType] = false;
    }
  }
  function _calculateCmcdDataForRequestForInitSegment() {
    const data = getGenericCmcdData();
    data.ot = _svta_cml_cmcd__WEBPACK_IMPORTED_MODULE_0__.CmcdObjectType.INIT;
    data.su = true;
    return data;
  }
  function _calculateCmcdDataForRequestForOther() {
    const data = getGenericCmcdData();
    data.ot = _svta_cml_cmcd__WEBPACK_IMPORTED_MODULE_0__.CmcdObjectType.OTHER;
    return data;
  }
  function _getEncodedBitrateData() {
    const data = {};
    const activeStream = playbackController.getStreamController()?.getActiveStream();
    if (!activeStream) {
      return data;
    }
    const videoRep = activeStream.getCurrentRepresentationForType(_streaming_constants_Constants_js__WEBPACK_IMPORTED_MODULE_4__["default"].VIDEO);
    const audioRep = activeStream.getCurrentRepresentationForType(_streaming_constants_Constants_js__WEBPACK_IMPORTED_MODULE_4__["default"].AUDIO);
    const videoBr = videoRep ? Math.round(videoRep.bitrateInKbit) : null;
    const audioBr = audioRep ? Math.round(audioRep.bitrateInKbit) : null;
    const brValues = _toInnerList(videoBr, audioBr);
    if (brValues) {
      data.br = brValues;
    }
    return data;
  }
  function _getBitrateByRequest(request) {
    try {
      return parseInt(request.bandwidth / 1000);
    } catch (e) {
      return null;
    }
  }
  function _getTopBitrateByType(mediaInfo) {
    try {
      const bitrates = abrController.getPossibleVoRepresentationsFilteredBySettings(mediaInfo).map(rep => {
        return rep.bitrateInKbit;
      });
      return Math.max(...bitrates);
    } catch (e) {
      return null;
    }
  }
  function _getPlayheadBitrate(mediaType) {
    try {
      if (!streamProcessors || streamProcessors.length === 0) {
        return null;
      }
      const streamProcessor = streamProcessors.find(sp => sp.getType() === mediaType);
      const bitrate = streamProcessor?.getRepresentationController()?.getCurrentRepresentation()?.bitrateInKbit;
      if (bitrate !== undefined && !isNaN(bitrate)) {
        return Math.round(bitrate);
      }
      return null;
    } catch (e) {
      return null;
    }
  }
  function _getPlayheadBitrateData() {
    const data = {};
    const videoPb = _getPlayheadBitrate(_streaming_constants_Constants_js__WEBPACK_IMPORTED_MODULE_4__["default"].VIDEO);
    const audioPb = _getPlayheadBitrate(_streaming_constants_Constants_js__WEBPACK_IMPORTED_MODULE_4__["default"].AUDIO);
    const pbValues = _toInnerList(videoPb, audioPb);
    if (pbValues) {
      data.pb = pbValues;
    }
    return data;
  }
  function _getTopBitrateDataForType(mediaType) {
    if (!streamProcessors || streamProcessors.length === 0) {
      return null;
    }
    const sp = streamProcessors.find(p => p.getType() === mediaType);
    if (!sp) {
      return null;
    }
    const mediaInfo = sp.getMediaInfo();
    const tb = _getTopBitrateByType(mediaInfo);
    return isFinite(tb) && tb > 0 ? tb : null;
  }
  function _getTopBitrateData() {
    const data = {};
    const videoTb = _getTopBitrateDataForType(_streaming_constants_Constants_js__WEBPACK_IMPORTED_MODULE_4__["default"].VIDEO);
    const audioTb = _getTopBitrateDataForType(_streaming_constants_Constants_js__WEBPACK_IMPORTED_MODULE_4__["default"].AUDIO);
    const tbValues = _toInnerList(videoTb, audioTb);
    if (tbValues) {
      data.tb = tbValues;
    }
    const videoTpb = _getTopPlayableBitrate(_streaming_constants_Constants_js__WEBPACK_IMPORTED_MODULE_4__["default"].VIDEO);
    const audioTpb = _getTopPlayableBitrate(_streaming_constants_Constants_js__WEBPACK_IMPORTED_MODULE_4__["default"].AUDIO);
    const tpbValues = _toInnerList(videoTpb, audioTpb);
    if (tpbValues) {
      data.tpb = tpbValues;
    }
    return data;
  }
  function _getTopPlayableBitrate(mediaType) {
    try {
      if (!streamProcessors || streamProcessors.length === 0) {
        return null;
      }
      const streamProcessor = streamProcessors.find(p => p.getType() === mediaType);
      if (streamProcessor) {
        const mediaInfo = streamProcessor.getMediaInfo();
        const topBitrate = _getTopBitrateByType(mediaInfo);

        // _getTopBitrateByType can return -Infinity for empty arrays, which is not a valid bitrate.
        return isFinite(topBitrate) && topBitrate > 0 ? topBitrate : null;
      }
      return null;
    } catch (e) {
      return null;
    }
  }
  function _getObjectDurationByRequest(request) {
    try {
      return !isNaN(request.duration) ? Math.round(request.duration * 1000) : NaN;
    } catch (e) {
      return null;
    }
  }
  function _getMeasuredThroughputByType(mediaType) {
    try {
      return parseInt(throughputController.getSafeAverageThroughput(mediaType) / 100) * 100;
    } catch (e) {
      return null;
    }
  }
  function _getMeasuredThroughputData() {
    const data = {};
    const videoMtp = _getMeasuredThroughputByType(_streaming_constants_Constants_js__WEBPACK_IMPORTED_MODULE_4__["default"].VIDEO);
    const audioMtp = _getMeasuredThroughputByType(_streaming_constants_Constants_js__WEBPACK_IMPORTED_MODULE_4__["default"].AUDIO);
    const mtpValues = _toInnerList(videoMtp, audioMtp);
    if (mtpValues) {
      data.mtp = mtpValues;
    }
    return data;
  }
  function _getDeadlineByType(mediaType) {
    try {
      const playbackRate = playbackController ? playbackController.getPlaybackRate() : 1;
      const bufferLevel = dashMetrics.getCurrentBufferLevel(mediaType);
      if (!isNaN(playbackRate) && !isNaN(bufferLevel)) {
        return parseInt(bufferLevel / playbackRate * 10) * 100;
      }
      return null;
    } catch (e) {
      return null;
    }
  }
  function _getBufferLevelByType(mediaType) {
    try {
      const bufferLevel = dashMetrics.getCurrentBufferLevel(mediaType);
      if (!isNaN(bufferLevel)) {
        return parseInt(bufferLevel * 10) * 100;
      }
      return null;
    } catch (e) {
      return null;
    }
  }
  function _getBufferLevelData() {
    const data = {};
    const videoBl = _getBufferLevelByType(_streaming_constants_Constants_js__WEBPACK_IMPORTED_MODULE_4__["default"].VIDEO);
    const audioBl = _getBufferLevelByType(_streaming_constants_Constants_js__WEBPACK_IMPORTED_MODULE_4__["default"].AUDIO);
    const blValues = _toInnerList(videoBl, audioBl);
    if (blValues) {
      data.bl = blValues;
    }
    return data;
  }
  function onBufferLevelStateChanged(data) {
    try {
      if (data.state && data.mediaType) {
        if (data.state === _MediaPlayerEvents_js__WEBPACK_IMPORTED_MODULE_2__["default"].BUFFER_EMPTY) {
          if (!_bufferLevelStarved[data.mediaType]) {
            _bufferLevelStarved[data.mediaType] = true;
          }
          if (!_isStartup[data.mediaType]) {
            _isStartup[data.mediaType] = true;
          }
        }
      }
    } catch (e) {}
  }
  function onPlaybackSeeking() {
    _isSeeking = true;
  }
  function onPlaybackSeeked() {
    _isSeeking = false;
    for (let key in _bufferLevelStarved) {
      if (_bufferLevelStarved.hasOwnProperty(key)) {
        _bufferLevelStarved[key] = true;
      }
    }
    for (let key in _isStartup) {
      if (_isStartup.hasOwnProperty(key)) {
        _isStartup[key] = true;
      }
    }
  }
  function wasPlaying() {
    return !_isSeeking && _playbackStartedTime;
  }
  function _probeNextRequest(mediaType) {
    if (!streamProcessors || streamProcessors.length === 0) {
      return;
    }
    for (let streamProcessor of streamProcessors) {
      if (streamProcessor.getType() === mediaType) {
        return streamProcessor.probeNextRequest();
      }
    }
  }
  function onPeriodSwitchComplete() {
    _updateStreamProcessors();
  }
  function onPlaybackStarted() {
    if (!_playbackStartedTime) {
      _playbackStartedTime = Date.now();
    }
  }
  function onPlaybackPlaying() {
    for (const mediaType in _rebufferingStartTime) {
      if (_rebufferingStartTime.hasOwnProperty(mediaType)) {
        onRebufferingCompleted(mediaType);
      }
    }
  }
  function onRebufferingStarted(mediaType) {
    if (mediaType && !_rebufferingStartTime[mediaType]) {
      _rebufferingStartTime[mediaType] = Date.now();
    }
  }
  function onRebufferingCompleted(mediaType) {
    if (_rebufferingStartTime[mediaType] != null) {
      _rebufferingDuration[mediaType] = Date.now() - _rebufferingStartTime[mediaType];
      delete _rebufferingStartTime[mediaType];
    }
  }
  function _calculateMsd() {
    if (!_playbackStartedTime) {
      return null;
    }
    return Date.now() - _playbackStartedTime;
  }
  function getGenericCmcdData(mediaType) {
    const data = {};

    // Note: ts, st, sf, pr are handled by CmcdReporter:
    // - ts: auto-generated by recordEvent() / recordResponseReceived()
    // - st, sf: persisted via cmcdReporter.update() in _onManifestLoaded
    // - pr: persisted via cmcdReporter.update() in _onPlaybackRateChanged

    let ltc = playbackController.getCurrentLiveLatency() * 1000;
    if (!isNaN(ltc)) {
      data.ltc = ltc;
    }
    if (typeof document !== 'undefined' && document.hidden) {
      data.bg = true;
    }
    if (mediaType && _shouldIncludeDroppedFrames(mediaType)) {
      const droppedFrames = dashMetrics.getCurrentDroppedFrames()?.droppedFrames;
      if (droppedFrames > 0) {
        data.df = droppedFrames;
      }
    }
    return data;
  }
  function _shouldIncludeDroppedFrames(mediaType) {
    return mediaType === _streaming_constants_Constants_js__WEBPACK_IMPORTED_MODULE_4__["default"].VIDEO || mediaType === _streaming_constants_Constants_js__WEBPACK_IMPORTED_MODULE_4__["default"].AUDIO || mediaType === _streaming_constants_Constants_js__WEBPACK_IMPORTED_MODULE_4__["default"].OTHER;
  }
  function getEventModeData() {
    const cmcdData = {
      ...getGenericCmcdData(),
      ..._getAggregatedBitrateData(),
      ..._getEncodedBitrateData(),
      ..._getBufferLevelData(),
      ..._getMeasuredThroughputData(),
      ..._getPlayheadBitrateData(),
      ..._getTopBitrateData()
    };
    return cmcdData;
  }
  function resetInitialSettings() {
    _bufferLevelStarved = {};
    _isStartup = {};
    _initialMediaRequestsDone = {};
    _isSeeking = false;
    _lastMediaTypeRequest = undefined;
    _playbackStartedTime = undefined;
    _rebufferingStartTime = {};
    _rebufferingDuration = {};
    _streamType = undefined;
    _streamingFormat = undefined;
    _updateStreamProcessors();
  }
  function _updateStreamProcessors() {
    if (!playbackController) {
      return;
    }
    const streamController = playbackController.getStreamController();
    if (!streamController) {
      return;
    }
    if (typeof streamController.getActiveStream !== 'function') {
      return;
    }
    const activeStream = streamController.getActiveStream();
    if (!activeStream) {
      return;
    }
    streamProcessors = activeStream.getStreamProcessors();
  }
  function _calculateRtp(request) {
    try {
      let playbackRate = playbackController.getPlaybackRate();
      if (!playbackRate) {
        playbackRate = 1;
      }
      let {
        bandwidth,
        mediaType,
        representation,
        duration
      } = request;
      const mediaInfo = representation.mediaInfo;
      if (!mediaInfo) {
        return NaN;
      }
      let currentBufferLevel = _getBufferLevelByType(mediaType);
      if (currentBufferLevel === 0) {
        currentBufferLevel = 500;
      }

      // Calculate RTP
      let segmentSize = bandwidth * duration / 1000; // Calculate file size in kilobits
      let timeToLoad = currentBufferLevel / playbackRate / 1000; // Calculate time available to load file in seconds
      let minBandwidth = segmentSize / timeToLoad; // Calculate the exact bandwidth required
      const rtpSafetyFactor = cmcdConfigAccessor.get('rtpSafetyFactor', {
        defaultValue: RTP_SAFETY_FACTOR
      });
      let maxBandwidth = minBandwidth * rtpSafetyFactor; // Include a safety buffer

      // Round to the next multiple of 100
      return (parseInt(maxBandwidth / 100) + 1) * 100;
    } catch (e) {
      return NaN;
    }
  }
  function calculateMsd() {
    const data = {};
    const msd = _calculateMsd();
    if (msd !== null && !isNaN(msd)) {
      data.msd = msd;
    }
    return data;
  }
  function onPlaybackRateChanged(data) {
    if (data.playbackRate !== undefined) {
      return {
        pr: data.playbackRate
      };
    }
    return null;
  }
  function onManifestLoaded(data) {
    try {
      const dashManifestModel = (0,_dash_models_DashManifestModel_js__WEBPACK_IMPORTED_MODULE_6__["default"])(context).getInstance();
      const isDynamic = dashManifestModel.getIsDynamic(data.data);
      _streamType = isDynamic ? `${_svta_cml_cmcd__WEBPACK_IMPORTED_MODULE_0__.CmcdStreamType.LIVE}` : `${_svta_cml_cmcd__WEBPACK_IMPORTED_MODULE_0__.CmcdStreamType.VOD}`;
      _streamingFormat = data.protocol && data.protocol === 'MSS' ? `${_svta_cml_cmcd__WEBPACK_IMPORTED_MODULE_0__.CmcdStreamingFormat.SMOOTH}` : `${_svta_cml_cmcd__WEBPACK_IMPORTED_MODULE_0__.CmcdStreamingFormat.DASH}`;
      return {
        st: _streamType,
        sf: _streamingFormat
      };
    } catch (e) {
      return {};
    }
  }
  function getCmcdParametersFromManifest() {
    let cmcdParametersFromManifest = {};
    if (serviceDescriptionController) {
      const serviceDescription = serviceDescriptionController.getServiceDescriptionSettings();
      if (serviceDescription.clientDataReporting && serviceDescription.clientDataReporting.cmcdParameters) {
        cmcdParametersFromManifest = serviceDescription.clientDataReporting.cmcdParameters;
      }
    }
    return cmcdParametersFromManifest;
  }
  function updateCmcdManifestParamsInCmcdConfigAccessor() {
    const cmcdParametersFromManifest = getCmcdParametersFromManifest();

    // Update CmcdConfigAccessor with manifest parameters if available
    // Note: Always update accessor when params exist, regardless of applyParametersFromMpd
    // The accessor uses priority-based resolution, so manifest params will only be used
    // when they have higher priority in the PropertyMap configuration
    if (cmcdConfigAccessor && Object.keys(cmcdParametersFromManifest).length > 0) {
      cmcdConfigAccessor.setManifestParams(cmcdParametersFromManifest);
    } else if (cmcdConfigAccessor) {
      // Clear manifest params if none are available
      cmcdConfigAccessor.setManifestParams(null);
    }
  }
  function deriveCmcdDataForRequest(request) {
    try {
      _updateLastMediaTypeRequest(request.type, request.mediaType);
      let cmcdData = {};
      if (isIncludedInRequestFilter(request.type)) {
        if (request.type === _vo_metrics_HTTPRequest_js__WEBPACK_IMPORTED_MODULE_1__.HTTPRequest.MPD_TYPE) {
          return _calculateCmcdDataForRequestForMpd(request);
        } else if (request.type === _vo_metrics_HTTPRequest_js__WEBPACK_IMPORTED_MODULE_1__.HTTPRequest.MEDIA_SEGMENT_TYPE) {
          _initForMediaType(request.mediaType);
          return _calculateCmcdDataForRequestForMediaSegment(request, request.mediaType);
        } else if (request.type === _vo_metrics_HTTPRequest_js__WEBPACK_IMPORTED_MODULE_1__.HTTPRequest.INIT_SEGMENT_TYPE) {
          return _calculateCmcdDataForRequestForInitSegment(request);
        } else if (request.type === _vo_metrics_HTTPRequest_js__WEBPACK_IMPORTED_MODULE_1__.HTTPRequest.OTHER_TYPE || request.type === _vo_metrics_HTTPRequest_js__WEBPACK_IMPORTED_MODULE_1__.HTTPRequest.XLINK_EXPANSION_TYPE) {
          return _calculateCmcdDataForRequestForOther(request);
        } else if (request.type === _vo_metrics_HTTPRequest_js__WEBPACK_IMPORTED_MODULE_1__.HTTPRequest.LICENSE) {
          return _calculateCmcdDataForRequestForLicense(request);
        } else if (request.type === _vo_metrics_HTTPRequest_js__WEBPACK_IMPORTED_MODULE_1__.HTTPRequest.CONTENT_STEERING_TYPE) {
          return _calculateCmcdDataForRequestForSteering(request);
        }
      }
      return cmcdData;
    } catch (e) {
      return null;
    }
  }
  function isIncludedInRequestFilter(type, includeInRequests) {
    const includeInRequestsArray = includeInRequests ?? cmcdConfigAccessor.get('includeInRequests');
    const filterType = REQUEST_TYPE_TO_CMCD_FILTER[type];
    return filterType !== undefined && includeInRequestsArray.includes(filterType);
  }
  function reset() {
    resetInitialSettings();
  }
  function _updateLastMediaTypeRequest(type, mediatype) {
    // Video > Audio > None
    if (mediatype === _streaming_constants_Constants_js__WEBPACK_IMPORTED_MODULE_4__["default"].VIDEO || mediatype === _streaming_constants_Constants_js__WEBPACK_IMPORTED_MODULE_4__["default"].AUDIO) {
      if (!_lastMediaTypeRequest || _lastMediaTypeRequest === _streaming_constants_Constants_js__WEBPACK_IMPORTED_MODULE_4__["default"].AUDIO) {
        _lastMediaTypeRequest = mediatype;
      }
    }
  }
  function _calculateCmcdDataForRequestForSteering(request) {
    const data = !_lastMediaTypeRequest ? getGenericCmcdData() : _calculateCmcdDataForRequestForMediaSegment(request, _lastMediaTypeRequest);
    data.ot = _svta_cml_cmcd__WEBPACK_IMPORTED_MODULE_0__.CmcdObjectType.OTHER;
    return data;
  }
  function _calculateCmcdDataForRequestForLicense() {
    const data = getGenericCmcdData();
    data.ot = _svta_cml_cmcd__WEBPACK_IMPORTED_MODULE_0__.CmcdObjectType.KEY;
    return data;
  }
  function _calculateCmcdDataForRequestForMpd() {
    const data = getGenericCmcdData();
    data.ot = _svta_cml_cmcd__WEBPACK_IMPORTED_MODULE_0__.CmcdObjectType.MANIFEST;
    return data;
  }
  function _getAggregatedBitrateData() {
    // defining data to return
    const data = {};
    // accessing active stream
    const activeStream = playbackController.getStreamController()?.getActiveStream();
    if (!activeStream) {
      return data;
    }

    // Get current representations
    const videoRep = activeStream.getCurrentRepresentationForType(_streaming_constants_Constants_js__WEBPACK_IMPORTED_MODULE_4__["default"].VIDEO);
    const audioRep = activeStream.getCurrentRepresentationForType(_streaming_constants_Constants_js__WEBPACK_IMPORTED_MODULE_4__["default"].AUDIO);
    const currentVideoBitrate = videoRep ? videoRep.bitrateInKbit : 0;
    const currentAudioBitrate = audioRep ? audioRep.bitrateInKbit : 0;

    // Calculate aggregated bitrate
    const abValues = _toInnerList(currentVideoBitrate > 0 ? Math.round(currentVideoBitrate) : null, currentAudioBitrate > 0 ? Math.round(currentAudioBitrate) : null);
    if (abValues) {
      data.ab = abValues;
    }

    // Calculate top aggregated bitrate
    const allVideoReps = activeStream.getRepresentationsByType(_streaming_constants_Constants_js__WEBPACK_IMPORTED_MODULE_4__["default"].VIDEO) || [];
    const allAudioReps = activeStream.getRepresentationsByType(_streaming_constants_Constants_js__WEBPACK_IMPORTED_MODULE_4__["default"].AUDIO) || [];
    const topVideoBitrate = allVideoReps.reduce((max, rep) => Math.max(max, rep.bitrateInKbit), 0);
    const topAudioBitrate = allAudioReps.reduce((max, rep) => Math.max(max, rep.bitrateInKbit), 0);
    const tabValues = _toInnerList(topVideoBitrate > 0 ? Math.round(topVideoBitrate) : null, topAudioBitrate > 0 ? Math.round(topAudioBitrate) : null);
    if (tabValues) {
      data.tab = tabValues;
    }

    // Calculate lowest aggregated bitrate
    const lowestVideoBitrate = allVideoReps.length > 0 ? Math.min(...allVideoReps.map(rep => rep.bitrateInKbit)) : 0;
    const lowestAudioBitrate = allAudioReps.length > 0 ? Math.min(...allAudioReps.map(rep => rep.bitrateInKbit)) : 0;
    const labValues = _toInnerList(lowestVideoBitrate > 0 ? Math.round(lowestVideoBitrate) : null, lowestAudioBitrate > 0 ? Math.round(lowestAudioBitrate) : null);
    if (labValues) {
      data.lab = labValues;
    }
    return data;
  }
  function getLastMediaTypeRequest() {
    return _lastMediaTypeRequest;
  }
  instance = {
    calculateMsd,
    deriveCmcdDataForRequest,
    getCmcdParametersFromManifest,
    getEventModeData,
    getLastMediaTypeRequest,
    isIncludedInRequestFilter,
    onBufferLevelStateChanged,
    onManifestLoaded,
    onPeriodSwitchComplete,
    onPlaybackPlaying,
    onPlaybackRateChanged,
    onPlaybackSeeked,
    onPlaybackSeeking,
    onPlaybackStarted,
    onRebufferingCompleted,
    onRebufferingStarted,
    reset,
    resetInitialSettings,
    setConfig,
    setup,
    updateCmcdManifestParamsInCmcdConfigAccessor,
    wasPlaying
  };
  setup();
  return instance;
}
CmcdModel.__dashjs_factory_name = 'CmcdModel';
/* harmony default export */ __webpack_exports__["default"] = (_core_FactoryMaker_js__WEBPACK_IMPORTED_MODULE_5__["default"].getSingletonFactory(CmcdModel));

/***/ }),

/***/ "./src/streaming/models/CmsdModel.js":
/*!*******************************************!*\
  !*** ./src/streaming/models/CmsdModel.js ***!
  \*******************************************/
/***/ (function(__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony import */ var _core_FactoryMaker_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../../core/FactoryMaker.js */ "./src/core/FactoryMaker.js");
/* harmony import */ var _core_EventBus_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../../core/EventBus.js */ "./src/core/EventBus.js");
/* harmony import */ var _core_events_Events_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../../core/events/Events.js */ "./src/core/events/Events.js");
/* harmony import */ var _core_Debug_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../../core/Debug.js */ "./src/core/Debug.js");
/* harmony import */ var _svta_cml_cmsd__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! @svta/cml-cmsd */ "./node_modules/@svta/cml-cmsd/dist/index.js");
/**
 * The copyright in this software is being made available under the BSD License,
 * included below. This software may be subject to other third party and contributor
 * rights, including patent rights, and no such rights are granted under this license.
 *
 * Copyright (c) 2022, Dash Industry Forum.
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






// Note: in modern browsers, the header names are returned in all lower case
const CMSD_STATIC_RESPONSE_FIELD_NAME = _svta_cml_cmsd__WEBPACK_IMPORTED_MODULE_4__.CMSD_STATIC.toLowerCase();
const CMSD_DYNAMIC_RESPONSE_FIELD_NAME = _svta_cml_cmsd__WEBPACK_IMPORTED_MODULE_4__.CMSD_DYNAMIC.toLowerCase();
const CMSD_KEYS = {
  AVAILABILITY_TIME: 'at',
  DURESS: 'du',
  ENCODED_BITRATE: 'br',
  ESTIMATED_THROUGHPUT: 'etp',
  HELD_TIME: 'ht',
  INTERMEDIARY_IDENTIFIER: 'n',
  MAX_SUGGESTED_BITRATE: 'mb',
  NEXT_OBJECT_RESPONSE: 'nor',
  NEXT_RANGE_RESPONSE: 'nrr',
  OBJECT_DURATION: 'd',
  OBJECT_TYPE: 'ot',
  RESPONSE_DELAY: 'rd',
  ROUND_TRIP_TIME: 'rtt',
  STARTUP: 'su',
  STREAM_TYPE: 'st',
  STREAMING_FORMAT: 'sf',
  VERSION: 'v'
};
const PERSISTENT_PARAMS = [CMSD_KEYS.MAX_SUGGESTED_BITRATE, CMSD_KEYS.STREAM_TYPE, CMSD_KEYS.STREAMING_FORMAT, CMSD_KEYS.VERSION];
const STREAM = 'stream';
const MEDIATYPE_TO_OBJECTTYPE = {
  'video': _svta_cml_cmsd__WEBPACK_IMPORTED_MODULE_4__.CmsdObjectType.VIDEO,
  'audio': _svta_cml_cmsd__WEBPACK_IMPORTED_MODULE_4__.CmsdObjectType.AUDIO,
  'text': _svta_cml_cmsd__WEBPACK_IMPORTED_MODULE_4__.CmsdObjectType.TIMED_TEXT,
  'stream': STREAM // Specific value for parameters without object type, which apply for all media/objects
};
function CmsdModel() {
  const context = this.context;
  const eventBus = (0,_core_EventBus_js__WEBPACK_IMPORTED_MODULE_1__["default"])(context).getInstance();
  let instance, logger, _staticParamsDict, _dynamicParamsDict;
  function setup() {
    logger = (0,_core_Debug_js__WEBPACK_IMPORTED_MODULE_3__["default"])(context).getInstance().getLogger(instance);
    _resetInitialSettings();
  }
  function initialize() {}
  function setConfig(/*config*/) {}
  function _resetInitialSettings() {
    _staticParamsDict = {};
    _dynamicParamsDict = {};
  }
  function _clearParams(params) {
    if (!params) {
      return;
    }
    Object.keys(params).forEach(key => {
      if (!PERSISTENT_PARAMS.includes(key)) {
        delete params[key];
      }
    });
  }
  function _parseCMSDStatic(value) {
    try {
      return (0,_svta_cml_cmsd__WEBPACK_IMPORTED_MODULE_4__.decodeCmsdStatic)(value);
    } catch (e) {
      logger.error('Failed to parse CMSD-Static response header value:', e);
    }
  }
  function _parseCMSDDynamic(value) {
    try {
      const items = (0,_svta_cml_cmsd__WEBPACK_IMPORTED_MODULE_4__.decodeCmsdDynamic)(value);
      const last = items[items.length - 1];
      return last?.params || {};
    } catch (e) {
      logger.error('Failed to parse CMSD-Dynamic response header value:', e);
      return {};
    }
  }
  function _mediaTypetoObjectType(mediaType) {
    return MEDIATYPE_TO_OBJECTTYPE[mediaType] || _svta_cml_cmsd__WEBPACK_IMPORTED_MODULE_4__.CmsdObjectType.OTHER;
  }
  function _getParamValueForObjectType(paramsType, ot, key) {
    const params = paramsType === _svta_cml_cmsd__WEBPACK_IMPORTED_MODULE_4__.CMSD_STATIC ? _staticParamsDict : _dynamicParamsDict;
    const otParams = params[ot] || {};
    const streamParams = params[STREAM] || {};
    const value = otParams[key] || streamParams[key];
    return value;
  }
  function parseResponseHeaders(responseHeaders, mediaType) {
    let staticParams = null;
    let dynamicParams = null;

    // Note: responseHeaders as a record of key:value
    for (const key in responseHeaders) {
      const value = responseHeaders[key];
      switch (key) {
        case CMSD_STATIC_RESPONSE_FIELD_NAME:
          staticParams = _parseCMSDStatic(value);
          eventBus.trigger(_core_events_Events_js__WEBPACK_IMPORTED_MODULE_2__["default"].CMSD_STATIC_HEADER, staticParams);
          break;
        case CMSD_DYNAMIC_RESPONSE_FIELD_NAME:
          if (!dynamicParams) {
            dynamicParams = _parseCMSDDynamic(value);
          }
          break;
        default:
          break;
      }
    }

    // Get object type
    let ot = STREAM;
    if (staticParams && staticParams[CMSD_KEYS.OBJECT_TYPE]) {
      ot = staticParams[CMSD_KEYS.OBJECT_TYPE];
    } else if (mediaType) {
      ot = _mediaTypetoObjectType(mediaType);
    }

    // Clear previously received params except persistent ones
    _clearParams(_staticParamsDict[ot]);
    _clearParams(_dynamicParamsDict[ot]);

    // Merge params with previously received params
    if (staticParams) {
      _staticParamsDict[ot] = Object.assign(_staticParamsDict[ot] || {}, staticParams);
    }
    if (dynamicParams) {
      _dynamicParamsDict[ot] = Object.assign(_dynamicParamsDict[ot] || {}, dynamicParams);
    }
    return {
      static: staticParams,
      dynamic: dynamicParams
    };
  }
  function getMaxBitrate(type) {
    let ot = _mediaTypetoObjectType(type);
    let mb = _getParamValueForObjectType(_svta_cml_cmsd__WEBPACK_IMPORTED_MODULE_4__.CMSD_DYNAMIC, ot, CMSD_KEYS.MAX_SUGGESTED_BITRATE);
    return mb ? mb : -1;
  }
  function getEstimatedThroughput(type) {
    let ot = _mediaTypetoObjectType(type);
    let etp = _getParamValueForObjectType(_svta_cml_cmsd__WEBPACK_IMPORTED_MODULE_4__.CMSD_DYNAMIC, ot, CMSD_KEYS.ESTIMATED_THROUGHPUT);
    return etp ? etp : null;
  }
  function getResponseDelay(type) {
    let ot = _mediaTypetoObjectType(type);
    let rd = _getParamValueForObjectType(_svta_cml_cmsd__WEBPACK_IMPORTED_MODULE_4__.CMSD_DYNAMIC, ot, CMSD_KEYS.RESPONSE_DELAY);
    return rd ? rd : null;
  }
  function getRoundTripTime(type) {
    let ot = _mediaTypetoObjectType(type);
    let rd = _getParamValueForObjectType(_svta_cml_cmsd__WEBPACK_IMPORTED_MODULE_4__.CMSD_DYNAMIC, ot, CMSD_KEYS.ROUND_TRIP_TIME);
    return rd ? rd : null;
  }
  function reset() {
    _resetInitialSettings();
  }
  instance = {
    setConfig,
    initialize,
    reset,
    parseResponseHeaders,
    getMaxBitrate,
    getEstimatedThroughput,
    getResponseDelay,
    getRoundTripTime
  };
  setup();
  return instance;
}
CmsdModel.__dashjs_factory_name = 'CmsdModel';
/* harmony default export */ __webpack_exports__["default"] = (_core_FactoryMaker_js__WEBPACK_IMPORTED_MODULE_0__["default"].getSingletonFactory(CmsdModel));

/***/ }),

/***/ "./src/streaming/models/CustomParametersModel.js":
/*!*******************************************************!*\
  !*** ./src/streaming/models/CustomParametersModel.js ***!
  \*******************************************************/
/***/ (function(__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony import */ var _dash_vo_UTCTiming_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../../dash/vo/UTCTiming.js */ "./src/dash/vo/UTCTiming.js");
/* harmony import */ var _core_FactoryMaker_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../../core/FactoryMaker.js */ "./src/core/FactoryMaker.js");
/* harmony import */ var _core_Settings_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../../core/Settings.js */ "./src/core/Settings.js");
/* harmony import */ var _utils_SupervisorTools_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../utils/SupervisorTools.js */ "./src/streaming/utils/SupervisorTools.js");
/* harmony import */ var _constants_Constants_js__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ../constants/Constants.js */ "./src/streaming/constants/Constants.js");
/* harmony import */ var _controllers_CmcdController_js__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ../controllers/CmcdController.js */ "./src/streaming/controllers/CmcdController.js");
/* harmony import */ var _vo_ExternalSubtitle_js__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! ../vo/ExternalSubtitle.js */ "./src/streaming/vo/ExternalSubtitle.js");
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







const DEFAULT_XHR_WITH_CREDENTIALS = false;
function CustomParametersModel() {
  let instance, utcTimingSources, xhrWithCredentials, requestInterceptors, responseInterceptors, licenseRequestFilters, certificateRequestFilters, certificateResponseFilters, licenseResponseFilters, customCapabilitiesFilters, customInitialTrackSelectionFunction, externalSubtitles, customAbrRules, cmcdController;
  const context = this.context;
  const settings = (0,_core_Settings_js__WEBPACK_IMPORTED_MODULE_2__["default"])(context).getInstance();
  function setup() {
    xhrWithCredentials = {
      default: DEFAULT_XHR_WITH_CREDENTIALS
    };
    cmcdController = (0,_controllers_CmcdController_js__WEBPACK_IMPORTED_MODULE_5__["default"])(context).getInstance();
    _resetInitialSettings();
  }
  function _resetInitialSettings() {
    licenseRequestFilters = [];
    licenseResponseFilters = [];
    certificateRequestFilters = [];
    certificateResponseFilters = [];
    customCapabilitiesFilters = [];
    customAbrRules = [];
    customInitialTrackSelectionFunction = null;
    utcTimingSources = [];

    // Initialize request interceptors with default CMCD interceptors
    requestInterceptors = cmcdController.getCmcdRequestInterceptors();
    responseInterceptors = cmcdController.getCmcdResponseReceivedInterceptors();
    externalSubtitles = new Set();
  }
  function reset() {
    _resetInitialSettings();
  }
  function resetPlaybackSessionSpecificSettings() {
    externalSubtitles = new Set();
  }
  function setConfig() {}

  /**
   * Registers a custom initial track selection function. Only one function is allowed. Calling this method will overwrite a potentially existing function.
   * @param {function} customFunc - the custom function that returns the initial track
   */
  function setCustomInitialTrackSelectionFunction(customFunc) {
    customInitialTrackSelectionFunction = customFunc;
  }

  /**
   * Resets the custom initial track selection
   */
  function resetCustomInitialTrackSelectionFunction() {
    customInitialTrackSelectionFunction = null;
  }

  /**
   * Returns the initial track selection function
   * @return {function}
   */
  function getCustomInitialTrackSelectionFunction() {
    return customInitialTrackSelectionFunction;
  }

  /**
   * Returns all certificate request filters
   * @return {array}
   */
  function getCertificateRequestFilters() {
    return certificateRequestFilters;
  }

  /**
   * Returns all certificate response filters
   * @return {array}
   */
  function getCertificateResponseFilters() {
    return certificateResponseFilters;
  }

  /**
   * Registers a certificate request filter. This enables application to manipulate/overwrite any request parameter and/or request data.
   * The provided callback function shall return a promise that shall be resolved once the filter process is completed.
   * The filters are applied in the order they are registered.
   * @param {function} filter - the license request filter callback
   */
  function registerCertificateRequestFilter(filter) {
    certificateRequestFilters.push(filter);
  }

  /**
   * Registers a certificate response filter. This enables application to manipulate/overwrite the response data
   * The provided callback function shall return a promise that shall be resolved once the filter process is completed.
   * The filters are applied in the order they are registered.
   * @param {function} filter - the license response filter callback
   */
  function registerCertificateResponseFilter(filter) {
    certificateResponseFilters.push(filter);
  }

  /**
   * Unregisters a certificate request filter.
   * @param {function} filter - the license request filter callback
   */
  function unregisterCertificateRequestFilter(filter) {
    _unregisterFilter(certificateRequestFilters, filter);
  }

  /**
   * Unregisters a certificate response filter.
   * @param {function} filter - the license response filter callback
   */
  function unregisterCertificateResponseFilter(filter) {
    _unregisterFilter(certificateResponseFilters, filter);
  }

  /**
   * Returns all license request filters
   * @return {array}
   */
  function getLicenseRequestFilters() {
    return licenseRequestFilters;
  }

  /**
   * Returns all license response filters
   * @return {array}
   */
  function getLicenseResponseFilters() {
    return licenseResponseFilters;
  }

  /**
   * Registers a license request filter. This enables application to manipulate/overwrite any request parameter and/or request data.
   * The provided callback function shall return a promise that shall be resolved once the filter process is completed.
   * The filters are applied in the order they are registered.
   * @param {function} filter - the license request filter callback
   */
  function registerLicenseRequestFilter(filter) {
    licenseRequestFilters.push(filter);
  }

  /**
   * Registers a license response filter. This enables application to manipulate/overwrite the response data
   * The provided callback function shall return a promise that shall be resolved once the filter process is completed.
   * The filters are applied in the order they are registered.
   * @param {function} filter - the license response filter callback
   */
  function registerLicenseResponseFilter(filter) {
    licenseResponseFilters.push(filter);
  }

  /**
   * Unregisters a license request filter.
   * @param {function} filter - the license request filter callback
   */
  function unregisterLicenseRequestFilter(filter) {
    _unregisterFilter(licenseRequestFilters, filter);
  }

  /**
   * Unregisters a license response filter.
   * @param {function} filter - the license response filter callback
   */
  function unregisterLicenseResponseFilter(filter) {
    _unregisterFilter(licenseResponseFilters, filter);
  }

  /**
   * Returns all custom capabilities filter
   * @return {array}
   */
  function getCustomCapabilitiesFilters() {
    return customCapabilitiesFilters;
  }

  /**
   * Registers a custom capabilities filter. This enables application to filter representations to use.
   * The provided callback function shall return a boolean or promise resolving to a boolean based on whether or not to use the representation.
   * The filters are applied in the order they are registered.
   * @param {function} filter - the custom capabilities filter callback
   */
  function registerCustomCapabilitiesFilter(filter) {
    customCapabilitiesFilters.push(filter);
  }

  /**
   * Unregisters a custom capabilities filter.
   * @param {function} filter - the custom capabilities filter callback
   */
  function unregisterCustomCapabilitiesFilter(filter) {
    _unregisterFilter(customCapabilitiesFilters, filter);
  }

  /**
   * Unregister a filter from the list of existing filers.
   * @param {array} filters
   * @param {function} filter
   * @private
   */
  function _unregisterFilter(filters, filter) {
    let index = -1;
    filters.some((item, i) => {
      if (item === filter) {
        index = i;
        return true;
      }
    });
    if (index < 0) {
      return;
    }
    filters.splice(index, 1);
  }

  /**
   * Iterate through the list of custom ABR rules and find the right rule by name
   * @param {string} rulename
   * @return {number} rule number
   */
  function _findAbrCustomRuleIndex(rulename) {
    let i;
    for (i = 0; i < customAbrRules.length; i++) {
      if (customAbrRules[i].rulename === rulename) {
        return i;
      }
    }
    return -1;
  }

  /**
   * Add a custom ABR Rule
   * Rule will be apply on next stream if a stream is being played
   *
   * @param {string} type - rule type (one of ['qualitySwitchRules','abandonFragmentRules'])
   * @param {string} rulename - name of rule (used to identify custom rule). If one rule of same name has been added, then existing rule will be updated
   * @param {object} rule - the rule object instance
   * @throws {@link Constants#BAD_ARGUMENT_ERROR BAD_ARGUMENT_ERROR} if called with invalid arguments.
   */
  function addAbrCustomRule(type, rulename, rule) {
    if (typeof type !== 'string' || type !== _constants_Constants_js__WEBPACK_IMPORTED_MODULE_4__["default"].RULES_TYPES.ABANDON_FRAGMENT_RULES && type !== _constants_Constants_js__WEBPACK_IMPORTED_MODULE_4__["default"].RULES_TYPES.QUALITY_SWITCH_RULES || typeof rulename !== 'string') {
      throw _constants_Constants_js__WEBPACK_IMPORTED_MODULE_4__["default"].BAD_ARGUMENT_ERROR;
    }
    let index = _findAbrCustomRuleIndex(rulename);
    if (index === -1) {
      // add rule
      customAbrRules.push({
        type: type,
        rulename: rulename,
        rule: rule
      });
    } else {
      // update rule
      customAbrRules[index].type = type;
      customAbrRules[index].rule = rule;
    }
  }

  /**
   * Remove a custom ABR Rule
   *
   * @param {string} rulename - name of the rule to be removed
   */
  function removeAbrCustomRule(rulename) {
    if (rulename) {
      let index = _findAbrCustomRuleIndex(rulename);
      //if no rulename custom rule has been found, do nothing
      if (index !== -1) {
        // remove rule
        customAbrRules.splice(index, 1);
      }
    } else {
      //if no rulename is defined, remove all ABR custome rules
      customAbrRules = [];
    }
  }

  /**
   * Remove all custom rules
   */
  function removeAllAbrCustomRule() {
    customAbrRules = [];
  }

  /**
   * Return all ABR custom rules
   * @return {array}
   */
  function getAbrCustomRules() {
    return customAbrRules;
  }

  /**
   * Adds a request interceptor. This enables application to monitor, manipulate, overwrite any request parameter and/or request data.
   * The provided callback function shall return a promise with updated request that shall be resolved once the process of the request is completed.
   * The interceptors are applied in the order they are added.
   * @param {function} interceptor - the request interceptor callback
   */
  function addRequestInterceptor(interceptor) {
    requestInterceptors.push(interceptor);
  }

  /**
   * Adds a response interceptor. This enables application to monitor, manipulate, overwrite the response data
   * The provided callback function shall return a promise with updated response that shall be resolved once the process of the response is completed.
   * The interceptors are applied in the order they are added.
   * @param {function} interceptor - the response interceptor callback
   */
  function addResponseInterceptor(interceptor) {
    responseInterceptors.push(interceptor);
  }

  /**
   * Unregisters a request interceptor.
   * @param {function} interceptor - the request interceptor callback
   */
  function removeRequestInterceptor(interceptor) {
    _unregisterFilter(requestInterceptors, interceptor);
  }

  /**
   * Unregisters a response interceptor.
   * @param {function} interceptor - the request interceptor callback
   */
  function removeResponseInterceptor(interceptor) {
    _unregisterFilter(responseInterceptors, interceptor);
  }

  /**
   * Returns all request interceptors
   * @return {array}
   */
  function getRequestInterceptors() {
    return requestInterceptors;
  }

  /**
   * Returns all response interceptors
   * @return {array}
   */
  function getResponseInterceptors() {
    return responseInterceptors;
  }
  function addExternalSubtitle(externalSubtitleObj) {
    if (!externalSubtitleObj || typeof externalSubtitleObj.id === 'undefined' || !externalSubtitleObj.url || !externalSubtitleObj.language || !externalSubtitleObj.mimeType || typeof externalSubtitleObj.bandwidth === 'undefined') {
      return;
    }
    const externalSubtitle = new _vo_ExternalSubtitle_js__WEBPACK_IMPORTED_MODULE_6__["default"](externalSubtitleObj);
    if (!_hasExternalSubtitleByKeyValue('url', externalSubtitle.url) && !_hasExternalSubtitleByKeyValue('id', externalSubtitle.id)) {
      externalSubtitles.add(externalSubtitle);
    }
  }
  function removeExternalSubtitleByUrl(url) {
    externalSubtitles.forEach(externalSubtitle => {
      if (externalSubtitle.url === url) {
        externalSubtitles.delete(externalSubtitle);
      }
    });
  }
  function removeExternalSubtitleById(id) {
    externalSubtitles.forEach(externalSubtitle => {
      if (externalSubtitle.id === id) {
        externalSubtitles.delete(externalSubtitle);
      }
    });
  }
  function _hasExternalSubtitleByKeyValue(key, value) {
    let found = false;
    externalSubtitles.forEach(externalSubtitle => {
      if (externalSubtitle[key] === value) {
        found = true;
      }
    });
    return found;
  }
  function getExternalSubtitles() {
    return externalSubtitles;
  }

  /**
   * Add a UTC timing source at the top of the list
   * @param {string} schemeIdUri
   * @param {string} value
   */
  function addUTCTimingSource(schemeIdUri, value) {
    removeUTCTimingSource(schemeIdUri, value); //check if it already exists and remove if so.
    let vo = new _dash_vo_UTCTiming_js__WEBPACK_IMPORTED_MODULE_0__["default"]();
    vo.schemeIdUri = schemeIdUri;
    vo.value = value;
    utcTimingSources.push(vo);
  }

  /**
   * Return all UTC timing sources
   * @return {array}
   */
  function getUTCTimingSources() {
    return utcTimingSources;
  }

  /**
   * Remove a specific timing source from the array
   * @param {string} schemeIdUri
   * @param {string} value
   */
  function removeUTCTimingSource(schemeIdUri, value) {
    (0,_utils_SupervisorTools_js__WEBPACK_IMPORTED_MODULE_3__.checkParameterType)(schemeIdUri, 'string');
    (0,_utils_SupervisorTools_js__WEBPACK_IMPORTED_MODULE_3__.checkParameterType)(value, 'string');
    utcTimingSources.forEach(function (obj, idx) {
      if (obj.schemeIdUri === schemeIdUri && obj.value === value) {
        utcTimingSources.splice(idx, 1);
      }
    });
  }

  /**
   * Remove all timing sources
   */
  function clearDefaultUTCTimingSources() {
    utcTimingSources = [];
  }

  /**
   * Add the default timing source to the list
   */
  function restoreDefaultUTCTimingSources() {
    let defaultUtcTimingSource = settings.get().streaming.utcSynchronization.defaultTimingSource;
    addUTCTimingSource(defaultUtcTimingSource.scheme, defaultUtcTimingSource.value);
  }
  function setXHRWithCredentialsForType(type, value) {
    if (!type) {
      Object.keys(xhrWithCredentials).forEach(key => {
        setXHRWithCredentialsForType(key, value);
      });
    } else {
      xhrWithCredentials[type] = !!value;
    }
  }
  function getXHRWithCredentialsForType(type) {
    const useCreds = xhrWithCredentials[type];
    return useCreds === undefined ? xhrWithCredentials.default : useCreds;
  }
  instance = {
    addAbrCustomRule,
    addExternalSubtitle,
    addRequestInterceptor,
    addResponseInterceptor,
    addUTCTimingSource,
    clearDefaultUTCTimingSources,
    getAbrCustomRules,
    getCertificateRequestFilters,
    getCertificateResponseFilters,
    getCustomCapabilitiesFilters,
    getCustomInitialTrackSelectionFunction,
    getExternalSubtitles,
    getLicenseRequestFilters,
    getLicenseResponseFilters,
    getRequestInterceptors,
    getResponseInterceptors,
    getUTCTimingSources,
    getXHRWithCredentialsForType,
    registerCertificateRequestFilter,
    registerCertificateResponseFilter,
    registerCustomCapabilitiesFilter,
    registerLicenseRequestFilter,
    registerLicenseResponseFilter,
    removeAbrCustomRule,
    removeAllAbrCustomRule,
    removeExternalSubtitleById,
    removeExternalSubtitleByUrl,
    removeRequestInterceptor,
    removeResponseInterceptor,
    removeUTCTimingSource,
    reset,
    resetCustomInitialTrackSelectionFunction,
    resetPlaybackSessionSpecificSettings,
    restoreDefaultUTCTimingSources,
    setConfig,
    setCustomInitialTrackSelectionFunction,
    setXHRWithCredentialsForType,
    unregisterCertificateRequestFilter,
    unregisterCertificateResponseFilter,
    unregisterCustomCapabilitiesFilter,
    unregisterLicenseRequestFilter,
    unregisterLicenseResponseFilter
  };
  setup();
  return instance;
}
CustomParametersModel.__dashjs_factory_name = 'CustomParametersModel';
/* harmony default export */ __webpack_exports__["default"] = (_core_FactoryMaker_js__WEBPACK_IMPORTED_MODULE_1__["default"].getSingletonFactory(CustomParametersModel));

/***/ }),

/***/ "./src/streaming/net/FetchLoader.js":
/*!******************************************!*\
  !*** ./src/streaming/net/FetchLoader.js ***!
  \******************************************/
/***/ (function(__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony import */ var _core_FactoryMaker_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../../core/FactoryMaker.js */ "./src/core/FactoryMaker.js");
/* harmony import */ var _core_Settings_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../../core/Settings.js */ "./src/core/Settings.js");
/* harmony import */ var _constants_Constants_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../constants/Constants.js */ "./src/streaming/constants/Constants.js");
/* harmony import */ var _core_Debug_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../../core/Debug.js */ "./src/core/Debug.js");
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
 * @module FetchLoader
 * @ignore
 * @description Manages download of resources via HTTP using fetch.
 */
function FetchLoader() {
  const context = this.context;
  const settings = (0,_core_Settings_js__WEBPACK_IMPORTED_MODULE_1__["default"])(context).getInstance();
  let instance, boxParser, logger;
  function setConfig(cfg) {
    boxParser = cfg.boxParser;
  }
  function setup() {
    logger = (0,_core_Debug_js__WEBPACK_IMPORTED_MODULE_3__["default"])(context).getInstance().getLogger(instance);
  }

  /**
   * Load request
   * With HTTP responses that use chunked transfer encoding, the promise returned by fetch will resolve as soon as the response's headers are received.
   * @param {CommonMediaRequest} commonMediaRequest
   * @param {CommonMediaResponse} commonMediaResponse
   */
  function load(commonMediaRequest, commonMediaResponse) {
    const headers = _getHeaders(commonMediaRequest);
    const abortController = _setupAbortMechanism(commonMediaRequest);
    const fetchResourceRequestObject = _getFetchResourceRequestObject(commonMediaRequest, headers, abortController);
    fetch(fetchResourceRequestObject).then(fetchResponse => {
      _handleFetchResponse(fetchResponse, commonMediaRequest, commonMediaResponse);
    }).catch(() => {
      _handleFetchError(commonMediaRequest);
    });
  }
  function _handleFetchResponse(fetchResponse, commonMediaRequest, commonMediaResponse) {
    _updateCommonMediaResponseInstance(commonMediaResponse, fetchResponse);
    let totalBytesReceived = 0;
    let signaledFirstByte = false;
    let receivedData = new Uint8Array();
    let endPositionOfLastProcessedBoxInReceivedData = 0;
    commonMediaRequest.customData.reader = fetchResponse.body.getReader();
    let downloadedData = [];
    let moofStartTimeData = [];
    let mdatEndTimeData = [];
    let lastChunkWasFinished = true;
    const calculationMode = settings.get().streaming.abr.throughput.lowLatencyDownloadTimeCalculationMode;

    /**
     * Callback function for ReadableStreamDefaultReader
     * @param value - chunk data. Always undefined when done is true.
     * @param done - true if the stream has already given you all its data.
     */
    const _processResult = ({
      value,
      done
    }) => {
      if (done) {
        _handleRequestComplete();
        return;
      }
      if (value && value.length > 0) {
        _handleReceivedChunkData(value);
      }
      _readResponseBody(commonMediaRequest, commonMediaResponse, _processResult);
    };

    /**
     * Once a request is completed throw final progress event with the calculated bytes and download time
     * @private
     */
    function _handleRequestComplete() {
      if (receivedData) {
        const calculatedDownloadTime = _calculateDownloadTime();

        // In this case we push an entry to the traces.
        // This is the only entry we push as the other calls to onprogress use noTrace = true
        commonMediaRequest.customData.onprogress({
          loaded: totalBytesReceived,
          total: totalBytesReceived,
          lengthComputable: true,
          time: calculatedDownloadTime
        });
        commonMediaResponse.data = receivedData.buffer;
      }
      commonMediaRequest.customData.onloadend();
    }
    function _calculateDownloadTime() {
      // If there is pending data, call progress so network metrics
      // are correctly generated
      // Same structure as https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequestEventTarget/
      let downloadTime = null;
      if (calculationMode === _constants_Constants_js__WEBPACK_IMPORTED_MODULE_2__["default"].LOW_LATENCY_DOWNLOAD_TIME_CALCULATION_MODE.MOOF_PARSING) {
        downloadTime = _getDownloadTimeForMoofParsing();
      } else if (calculationMode === _constants_Constants_js__WEBPACK_IMPORTED_MODULE_2__["default"].LOW_LATENCY_DOWNLOAD_TIME_CALCULATION_MODE.DOWNLOADED_DATA) {
        downloadTime = _getDownloadTimeForDownloadedData();
      }
      return downloadTime;
    }
    function _getDownloadTimeForMoofParsing() {
      const calculatedThroughput = _calculateThroughputByMoofMdatTimes(moofStartTimeData, mdatEndTimeData);
      if (calculatedThroughput) {
        return totalBytesReceived * 8 / calculatedThroughput;
      }
      return null;
    }
    function _getDownloadTimeForDownloadedData() {
      return calculateDownloadedTime(downloadedData, totalBytesReceived);
    }

    /**
     * Called every time we received data if the request is not completed
     * @param value
     * @private
     */
    function _handleReceivedChunkData(value) {
      receivedData = _concatTypedArray(receivedData, value);
      totalBytesReceived += value.length;
      downloadedData.push({
        timestamp: _getCurrentTimestamp(),
        bytes: value.length
      });
      if (calculationMode === _constants_Constants_js__WEBPACK_IMPORTED_MODULE_2__["default"].LOW_LATENCY_DOWNLOAD_TIME_CALCULATION_MODE.MOOF_PARSING && lastChunkWasFinished) {
        _findMoofBoxInChunkData();
      }
      const boxesInfo = boxParser.findLastTopIsoBoxCompleted(['moov', 'mdat'], receivedData, endPositionOfLastProcessedBoxInReceivedData);
      if (boxesInfo.found) {
        _handleTopIsoBoxCompleted(boxesInfo);
      } else {
        _handleNoCompletedTopIsoBox(boxesInfo);
      }
    }
    function _findMoofBoxInChunkData() {
      const boxesInfo = boxParser.findLastTopIsoBoxCompleted(['moof'], receivedData, endPositionOfLastProcessedBoxInReceivedData);
      if (boxesInfo.found) {
        lastChunkWasFinished = false;
        moofStartTimeData.push({
          timestamp: _getCurrentTimestamp()
        });
      }
    }
    function _handleTopIsoBoxCompleted(boxesInfo) {
      const endPositionOfLastTargetBox = boxesInfo.startOffsetOfLastFoundTargetBox + boxesInfo.sizeOfLastFoundTargetBox;
      const data = _getDataForMediaSourceBufferAndAdjustReceivedData(endPositionOfLastTargetBox);

      // Store the end time of each chunk download  with its size in array EndTimeData
      if (calculationMode === _constants_Constants_js__WEBPACK_IMPORTED_MODULE_2__["default"].LOW_LATENCY_DOWNLOAD_TIME_CALCULATION_MODE.MOOF_PARSING && !lastChunkWasFinished) {
        lastChunkWasFinished = true;
        mdatEndTimeData.push({
          timestamp: _getCurrentTimestamp(),
          bytes: data.length
        });
      }

      // Announce progress but don't track traces. Throughput measures are quite unstable
      // when they are based in small amount of data
      commonMediaRequest.customData.onprogress({
        data: data.buffer,
        lengthComputable: false,
        noTrace: true
      });
      endPositionOfLastProcessedBoxInReceivedData = 0;
    }

    /**
     * Make the data that we received available for playback
     * If we are going to pass full buffer, avoid copying it and pass
     * complete buffer. Otherwise, clone the part of the buffer that is completed
     * and adjust remaining buffer. A clone is needed because ArrayBuffer of a typed-array
     * keeps a reference to the original data
     * @param endPositionOfLastTargetBox
     * @returns {Uint8Array}
     * @private
     */
    function _getDataForMediaSourceBufferAndAdjustReceivedData(endPositionOfLastTargetBox) {
      let data;
      if (endPositionOfLastTargetBox === receivedData.length) {
        data = receivedData;
        receivedData = new Uint8Array();
      } else {
        data = new Uint8Array(receivedData.subarray(0, endPositionOfLastTargetBox));
        receivedData = receivedData.subarray(endPositionOfLastTargetBox);
      }
      return data;
    }
    function _handleNoCompletedTopIsoBox(boxesInfo) {
      endPositionOfLastProcessedBoxInReceivedData = boxesInfo.startOffsetOfLastCompletedBox + boxesInfo.sizeOfLastCompletedBox;
      // Call progress, so it generates traces that will be later used to know when the first byte
      // were received
      if (!signaledFirstByte) {
        commonMediaRequest.customData.onprogress({
          lengthComputable: false,
          noTrace: true
        });
        signaledFirstByte = true;
      }
    }
    _readResponseBody(commonMediaRequest, commonMediaResponse, _processResult);
  }

  /**
   * Reads the response of the request. For details refer to https://developer.mozilla.org/en-US/docs/Web/API/ReadableStreamDefaultReader/read
   * @param {CommonMediaRequest} commonMediaRequest
   * @param {CommonMediaResponse} commonMediaResponse
   * @param processResult
   * @private
   */
  function _readResponseBody(commonMediaRequest, commonMediaResponse, processResult) {
    commonMediaRequest.customData.reader.read().then(processResult).catch(function () {
      _handleFetchError(commonMediaRequest);
    });
  }
  function _handleFetchError(commonMediaRequest) {
    if (commonMediaRequest.customData.onloadend) {
      commonMediaRequest.customData.onloadend();
    }
  }
  function _updateCommonMediaResponseInstance(commonMediaResponse, fetchResponse) {
    commonMediaResponse.status = fetchResponse.status;
    commonMediaResponse.statusText = fetchResponse.statusText;
    commonMediaResponse.url = fetchResponse.url;
    const responseHeaders = {};
    for (const key of fetchResponse.headers.keys()) {
      responseHeaders[key] = fetchResponse.headers.get(key);
    }
    commonMediaResponse.headers = responseHeaders;
  }
  function _getHeaders(commonMediaRequest) {
    const headers = new Headers();
    if (commonMediaRequest.headers) {
      for (let header in commonMediaRequest.headers) {
        let value = commonMediaRequest.headers[header];
        if (value) {
          headers.append(header, value);
        }
      }
    }
    return headers;
  }
  function _setupAbortMechanism(commonMediaRequest) {
    let abortController;
    if (typeof window.AbortController === 'function') {
      abortController = new AbortController();
      commonMediaRequest.customData.abortController = abortController;
      abortController.signal.onabort = commonMediaRequest.customData.onabort;
    }
    commonMediaRequest.customData.abort = abort.bind(commonMediaRequest);
    return abortController;
  }
  function _getFetchResourceRequestObject(commonMediaRequest, headers, abortController) {
    const fetchResourceRequestObject = new Request(commonMediaRequest.url, {
      method: commonMediaRequest.method,
      headers: headers,
      credentials: commonMediaRequest.credentials,
      signal: abortController ? abortController.signal : undefined
    });
    return fetchResourceRequestObject;
  }
  function _getCurrentTimestamp() {
    if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
      return performance.now();
    } else {
      return Date.now();
    }
  }

  /**
   * Creates a new Uint8 array and adds the existing data as well as new data
   * @param receivedData
   * @param data
   * @returns {Uint8Array|*}
   * @private
   */
  function _concatTypedArray(receivedData, data) {
    if (receivedData.length === 0) {
      return data;
    }
    const result = new Uint8Array(receivedData.length + data.length);
    result.set(receivedData);

    // set(typedarray, targetOffset)
    result.set(data, receivedData.length);
    return result;
  }

  /**
   * Use the AbortController to abort a request
   * @param request
   */
  function abort() {
    // this = httpRequest (CommonMediaRequest)
    if (this.customData.abortController) {
      // For firefox and edge
      this.customData.abortController.abort();
    } else if (this.customData.reader) {
      // For Chrome
      try {
        this.customData.reader.cancel();
        this.onabort();
      } catch (e) {
        // throw exceptions (TypeError) when reader was previously closed,
        // for example, because a network issue
      }
    }
  }
  function reset() {}

  /**
   * Default throughput calculation
   * @param downloadedData
   * @param bytesReceived
   * @returns {number|null}
   * @private
   */
  function calculateDownloadedTime(downloadedData, bytesReceived) {
    try {
      downloadedData = downloadedData.filter(data => data.bytes > bytesReceived / 4 / downloadedData.length);
      if (downloadedData.length > 1) {
        let time = 0;
        const avgTimeDistance = (downloadedData[downloadedData.length - 1].timestamp - downloadedData[0].timestamp) / downloadedData.length;
        downloadedData.forEach((data, index) => {
          // To be counted the data has to be over a threshold
          const next = downloadedData[index + 1];
          if (next) {
            const distance = next.timestamp - data.timestamp;
            time += distance < avgTimeDistance ? distance : 0;
          }
        });
        return time;
      }
      return null;
    } catch (e) {
      return null;
    }
  }
  function _calculateThroughputByMoofMdatTimes(moofStartTimeData, mdatEndTimeData) {
    try {
      let filteredMoofStartTimeData, filteredMdatEndTimeData;

      // Filter the last chunks in a segment in both arrays [StartTimeData and EndTimeData]
      filteredMoofStartTimeData = moofStartTimeData.slice(0, -1);
      filteredMdatEndTimeData = mdatEndTimeData.slice(0, -1);
      if (filteredMoofStartTimeData.length !== filteredMdatEndTimeData.length) {
        logger.warn(`[FetchLoader] Moof and Mdat data arrays have different lengths. Moof: ${filteredMoofStartTimeData.length}, Mdat: ${filteredMdatEndTimeData.length}`);
      }
      if (filteredMoofStartTimeData.length <= 1) {
        return null;
      }
      let chunkThroughputValues = [];
      let shortDurationBytesReceived = 0;
      let shortDurationStartTime = 0;
      for (let i = 0; i < filteredMoofStartTimeData.length; i++) {
        if (filteredMoofStartTimeData[i] && filteredMdatEndTimeData[i]) {
          let chunkDownloadTime = filteredMdatEndTimeData[i].timestamp - filteredMoofStartTimeData[i].timestamp;
          if (chunkDownloadTime > 1) {
            const throughput = _getThroughputInBitPerMs(filteredMdatEndTimeData[i].bytes, chunkDownloadTime);
            chunkThroughputValues.push(throughput);
            shortDurationStartTime = 0;
          } else {
            if (shortDurationStartTime === 0) {
              shortDurationStartTime = filteredMoofStartTimeData[i].timestamp;
              shortDurationBytesReceived = 0;
            }
            let cumulatedChunkDownloadTime = filteredMdatEndTimeData[i].timestamp - shortDurationStartTime;
            if (cumulatedChunkDownloadTime > 1) {
              shortDurationBytesReceived += filteredMdatEndTimeData[i].bytes;
              const throughput = _getThroughputInBitPerMs(shortDurationBytesReceived, cumulatedChunkDownloadTime);
              chunkThroughputValues.push(throughput);
              shortDurationStartTime = 0;
            } else {
              // continue cumulating short duration data
              shortDurationBytesReceived += filteredMdatEndTimeData[i].bytes;
            }
          }
        }
      }
      if (chunkThroughputValues.length > 0) {
        const sumOfChunkThroughputValues = chunkThroughputValues.reduce((a, b) => a + b, 0);
        return sumOfChunkThroughputValues / chunkThroughputValues.length;
      }
      return null;
    } catch (e) {
      return null;
    }
  }
  function _getThroughputInBitPerMs(bytes, timeInMs) {
    return 8 * bytes / timeInMs;
  }
  setup();
  instance = {
    abort,
    calculateDownloadedTime,
    load,
    reset,
    setConfig
  };
  return instance;
}
FetchLoader.__dashjs_factory_name = 'FetchLoader';
const factory = _core_FactoryMaker_js__WEBPACK_IMPORTED_MODULE_0__["default"].getClassFactory(FetchLoader);
/* harmony default export */ __webpack_exports__["default"] = (factory);

/***/ }),

/***/ "./src/streaming/net/HTTPLoader.js":
/*!*****************************************!*\
  !*** ./src/streaming/net/HTTPLoader.js ***!
  \*****************************************/
/***/ (function(__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony import */ var _XHRLoader_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./XHRLoader.js */ "./src/streaming/net/XHRLoader.js");
/* harmony import */ var _FetchLoader_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./FetchLoader.js */ "./src/streaming/net/FetchLoader.js");
/* harmony import */ var _vo_metrics_HTTPRequest_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../vo/metrics/HTTPRequest.js */ "./src/streaming/vo/metrics/HTTPRequest.js");
/* harmony import */ var _core_FactoryMaker_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../../core/FactoryMaker.js */ "./src/core/FactoryMaker.js");
/* harmony import */ var _vo_DashJSError_js__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ../vo/DashJSError.js */ "./src/streaming/vo/DashJSError.js");
/* harmony import */ var _models_CmsdModel_js__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ../models/CmsdModel.js */ "./src/streaming/models/CmsdModel.js");
/* harmony import */ var _core_Utils_js__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! ../../core/Utils.js */ "./src/core/Utils.js");
/* harmony import */ var _core_Debug_js__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(/*! ../../core/Debug.js */ "./src/core/Debug.js");
/* harmony import */ var _core_EventBus_js__WEBPACK_IMPORTED_MODULE_8__ = __webpack_require__(/*! ../../core/EventBus.js */ "./src/core/EventBus.js");
/* harmony import */ var _core_events_Events_js__WEBPACK_IMPORTED_MODULE_9__ = __webpack_require__(/*! ../../core/events/Events.js */ "./src/core/events/Events.js");
/* harmony import */ var _core_Settings_js__WEBPACK_IMPORTED_MODULE_10__ = __webpack_require__(/*! ../../core/Settings.js */ "./src/core/Settings.js");
/* harmony import */ var _constants_Constants_js__WEBPACK_IMPORTED_MODULE_11__ = __webpack_require__(/*! ../constants/Constants.js */ "./src/streaming/constants/Constants.js");
/* harmony import */ var _models_CustomParametersModel_js__WEBPACK_IMPORTED_MODULE_12__ = __webpack_require__(/*! ../models/CustomParametersModel.js */ "./src/streaming/models/CustomParametersModel.js");
/* harmony import */ var _controllers_CommonAccessTokenController_js__WEBPACK_IMPORTED_MODULE_13__ = __webpack_require__(/*! ../controllers/CommonAccessTokenController.js */ "./src/streaming/controllers/CommonAccessTokenController.js");
/* harmony import */ var _controllers_ExtUrlQueryInfoController_js__WEBPACK_IMPORTED_MODULE_14__ = __webpack_require__(/*! ../controllers/ExtUrlQueryInfoController.js */ "./src/streaming/controllers/ExtUrlQueryInfoController.js");
/* harmony import */ var _vo_CommonMediaRequest_js__WEBPACK_IMPORTED_MODULE_15__ = __webpack_require__(/*! ../vo/CommonMediaRequest.js */ "./src/streaming/vo/CommonMediaRequest.js");
/* harmony import */ var _vo_CommonMediaResponse_js__WEBPACK_IMPORTED_MODULE_16__ = __webpack_require__(/*! ../vo/CommonMediaResponse.js */ "./src/streaming/vo/CommonMediaResponse.js");
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
 * @module HTTPLoader
 * @ignore
 * @description Manages download of resources via HTTP.
 * @param {Object} cfg - dependencies from parent
 */
function HTTPLoader(cfg) {
  cfg = cfg || {};
  const context = this.context;
  const errHandler = cfg.errHandler;
  const dashMetrics = cfg.dashMetrics;
  const mediaPlayerModel = cfg.mediaPlayerModel;
  const boxParser = cfg.boxParser;
  const errors = cfg.errors;
  const eventBus = (0,_core_EventBus_js__WEBPACK_IMPORTED_MODULE_8__["default"])(context).getInstance();
  const settings = (0,_core_Settings_js__WEBPACK_IMPORTED_MODULE_10__["default"])(context).getInstance();
  let instance, httpRequests, delayedRequests, retryRequests, downloadErrorToRequestTypeMap, cmsdModel, xhrLoader, fetchLoader, customParametersModel, commonAccessTokenController, extUrlQueryInfoController, logger;
  function setup() {
    logger = (0,_core_Debug_js__WEBPACK_IMPORTED_MODULE_7__["default"])(context).getInstance().getLogger(instance);
    httpRequests = [];
    delayedRequests = [];
    retryRequests = [];
    cmsdModel = (0,_models_CmsdModel_js__WEBPACK_IMPORTED_MODULE_5__["default"])(context).getInstance();
    customParametersModel = (0,_models_CustomParametersModel_js__WEBPACK_IMPORTED_MODULE_12__["default"])(context).getInstance();
    commonAccessTokenController = (0,_controllers_CommonAccessTokenController_js__WEBPACK_IMPORTED_MODULE_13__["default"])(context).getInstance();
    extUrlQueryInfoController = (0,_controllers_ExtUrlQueryInfoController_js__WEBPACK_IMPORTED_MODULE_14__["default"])(context).getInstance();
    downloadErrorToRequestTypeMap = {
      [_vo_metrics_HTTPRequest_js__WEBPACK_IMPORTED_MODULE_2__.HTTPRequest.MPD_TYPE]: errors.DOWNLOAD_ERROR_ID_MANIFEST_CODE,
      [_vo_metrics_HTTPRequest_js__WEBPACK_IMPORTED_MODULE_2__.HTTPRequest.XLINK_EXPANSION_TYPE]: errors.DOWNLOAD_ERROR_ID_XLINK_CODE,
      [_vo_metrics_HTTPRequest_js__WEBPACK_IMPORTED_MODULE_2__.HTTPRequest.INIT_SEGMENT_TYPE]: errors.DOWNLOAD_ERROR_ID_INITIALIZATION_CODE,
      [_vo_metrics_HTTPRequest_js__WEBPACK_IMPORTED_MODULE_2__.HTTPRequest.MEDIA_SEGMENT_TYPE]: errors.DOWNLOAD_ERROR_ID_CONTENT_CODE,
      [_vo_metrics_HTTPRequest_js__WEBPACK_IMPORTED_MODULE_2__.HTTPRequest.INDEX_SEGMENT_TYPE]: errors.DOWNLOAD_ERROR_ID_CONTENT_CODE,
      [_vo_metrics_HTTPRequest_js__WEBPACK_IMPORTED_MODULE_2__.HTTPRequest.BITSTREAM_SWITCHING_SEGMENT_TYPE]: errors.DOWNLOAD_ERROR_ID_CONTENT_CODE,
      [_vo_metrics_HTTPRequest_js__WEBPACK_IMPORTED_MODULE_2__.HTTPRequest.OTHER_TYPE]: errors.DOWNLOAD_ERROR_ID_CONTENT_CODE
    };
  }
  function setConfig(config) {
    if (!config) {
      return;
    }
    if (config.commonAccessTokenController) {
      commonAccessTokenController = config.commonAccessTokenController;
    }
    if (config.extUrlQueryInfoController) {
      extUrlQueryInfoController = config.extUrlQueryInfoController;
    }
  }

  /**
   * Initiates a download of the resource described by config.request.
   * @param {Object} config - contains request (FragmentRequest or derived type), and callbacks
   * @memberof module:HTTPLoader
   * @instance
   */
  function load(config) {
    if (config.request) {
      const retryAttempts = mediaPlayerModel.getRetryAttemptsForType(config.request.type);
      return _internalLoad(config, retryAttempts);
    } else {
      if (config.error) {
        config.error(config.request, 'error');
      }
      return Promise.resolve();
    }
  }

  /**
   * Initiates or re-initiates a download of the resource
   * @param {object} config
   * @param {number} remainingAttempts
   * @private
   */
  function _internalLoad(config, remainingAttempts) {
    /**
     * Fired when a request has completed, whether successfully (after load) or unsuccessfully (after abort, timeout or error).
     */
    const _onloadend = function () {
      _onRequestEnd();
    };

    /**
     * Fired when a request has started to load data.
     * @param event
     */
    const _onprogress = function (event) {
      const currentTime = new Date();

      // If we did not transfer all data yet and this is the first time we are getting a progress event we use this time as firstByteDate.
      if (firstProgress) {
        firstProgress = false;
        // event.loaded: the amount of data currently transferred
        // event.total: the total amount of data to be transferred.
        // If lengthComputable is false within the XMLHttpRequestProgressEvent, that means the server never sent a Content-Length header in the response.
        if (!event.lengthComputable || event.lengthComputable && event.total !== event.loaded) {
          requestObject.firstByteDate = currentTime;
          commonMediaResponse.resourceTiming.responseStart = currentTime.getTime();
        }
      }

      // lengthComputable indicating if the resource concerned by the ProgressEvent has a length that can be calculated. If not, the ProgressEvent.total property has no significant value.
      if (event.lengthComputable) {
        requestObject.bytesLoaded = commonMediaResponse.length = event.loaded;
        requestObject.bytesTotal = commonMediaResponse.resourceTiming.encodedBodySize = event.total;
        commonMediaResponse.length = event.total;
        commonMediaResponse.resourceTiming.encodedBodySize = event.loaded;
      }
      if (!event.noTrace) {
        traces.push({
          s: lastTraceTime,
          d: event.time ? event.time : currentTime.getTime() - lastTraceTime.getTime(),
          b: [event.loaded ? event.loaded - lastTraceReceivedCount : 0],
          // event.loaded: When downloading a resource using HTTP, this value is specified in bytes (not bits), and only represents the part of the content itself, not headers and other overhead
          t: event.throughput
        });
        requestObject.traces = traces;
        lastTraceTime = currentTime;
        lastTraceReceivedCount = event.loaded;
      }
      if (progressTimeout) {
        clearTimeout(progressTimeout);
        progressTimeout = null;
      }
      if (settings.get().streaming.fragmentRequestProgressTimeout > 0) {
        progressTimeout = setTimeout(function () {
          // No more progress => abort request and treat as an error
          logger.warn('Abort request ' + commonMediaRequest.url + ' due to progress timeout');
          loader.abort(commonMediaRequest);
          _onloadend();
        }, settings.get().streaming.fragmentRequestProgressTimeout);
      }
      if (config.progress && event) {
        config.progress(event);
      }
    };

    /**
     * Fired when a request has been aborted, for example because the program called XMLHttpRequest.abort().
     */
    const _onabort = function () {
      _onRequestEnd(true);
    };

    /**
     * Fired when progress is terminated due to preset time expiring.
     * @param event
     */
    const _ontimeout = function (event) {
      let timeoutMessage;
      // We know how much we already downloaded by looking at the timeout event
      if (event.lengthComputable) {
        let percentageComplete = event.loaded / event.total * 100;
        timeoutMessage = 'Request timeout: loaded: ' + event.loaded + ', out of: ' + event.total + ' : ' + percentageComplete.toFixed(3) + '% Completed';
      } else {
        timeoutMessage = 'Request timeout: non-computable download size';
      }
      logger.warn(timeoutMessage);
    };
    const _onRequestEnd = function (aborted = false) {
      // Remove the request from our list of requests
      if (httpRequests.indexOf(commonMediaRequest) !== -1) {
        httpRequests.splice(httpRequests.indexOf(commonMediaRequest), 1);
      }
      if (progressTimeout) {
        clearTimeout(progressTimeout);
        progressTimeout = null;
      }
      commonAccessTokenController.processResponseHeaders(commonMediaResponse);
      _updateRequestTimingInfo();
      _updateResourceTimingInfo();
      _applyResponseInterceptors(commonMediaResponse).then(_httpResponse => {
        commonMediaResponse = _httpResponse;
        _addHttpRequestMetric(commonMediaRequest, commonMediaResponse, traces);

        // Ignore aborted requests
        if (aborted) {
          if (config.abort) {
            config.abort(requestObject);
          }
          return;
        }
        if (requestObject.type === _vo_metrics_HTTPRequest_js__WEBPACK_IMPORTED_MODULE_2__.HTTPRequest.MPD_TYPE) {
          dashMetrics.addManifestUpdate(requestObject);
          eventBus.trigger(_core_events_Events_js__WEBPACK_IMPORTED_MODULE_9__["default"].MANIFEST_LOADING_FINISHED, {
            requestObject
          });
        }

        // POST requests are allowed to have empty response bodies (e.g. CMCD event reporting endpoints).
        // GET requests still need a body since dash.js consumes it (manifests, segments).
        const hasUsableBody = !!commonMediaResponse.data || requestObject.method === _vo_metrics_HTTPRequest_js__WEBPACK_IMPORTED_MODULE_2__.HTTPRequest.POST;
        if (commonMediaResponse.status >= 200 && commonMediaResponse.status <= 299 && hasUsableBody) {
          if (config.success) {
            config.success(commonMediaResponse.data, commonMediaResponse.statusText, commonMediaResponse.url);
          }
          if (config.complete) {
            config.complete(requestObject, commonMediaResponse.statusText);
          }
        } else {
          // If we get a 404 to a media segment we should check the client clock again and perform a UTC sync in the background.
          try {
            if (commonMediaResponse.status === 404 && settings.get().streaming.utcSynchronization.enableBackgroundSyncAfterSegmentDownloadError && requestObject.type === _vo_metrics_HTTPRequest_js__WEBPACK_IMPORTED_MODULE_2__.HTTPRequest.MEDIA_SEGMENT_TYPE) {
              // Only trigger a sync if the loading failed for the first time
              const initialNumberOfAttempts = mediaPlayerModel.getRetryAttemptsForType(_vo_metrics_HTTPRequest_js__WEBPACK_IMPORTED_MODULE_2__.HTTPRequest.MEDIA_SEGMENT_TYPE);
              if (initialNumberOfAttempts === remainingAttempts) {
                eventBus.trigger(_core_events_Events_js__WEBPACK_IMPORTED_MODULE_9__["default"].ATTEMPT_BACKGROUND_SYNC);
              }
            }
          } catch (e) {}
          _retriggerRequest();
        }
      });
    };
    const _updateRequestTimingInfo = function () {
      requestObject.startDate = requestStartTime;
      requestObject.endDate = new Date();
      requestObject.firstByteDate = requestObject.firstByteDate || requestStartTime;
    };
    const _updateResourceTimingInfo = function () {
      commonMediaResponse.resourceTiming.responseEnd = performance.now();
      commonMediaResponse.resourceTiming.duration = commonMediaResponse.resourceTiming.responseEnd - commonMediaResponse.resourceTiming.startTime;

      // If enabled the ResourceTimingApi we add the corresponding information to the request object.
      // These values are more accurate and can be used by the ThroughputController later
      _addResourceTimingValues(commonMediaRequest, commonMediaResponse);
    };
    const _loadRequest = function (loader, httpRequest, httpResponse) {
      return new Promise(resolve => {
        _applyRequestInterceptors(httpRequest).then(_httpRequest => {
          httpRequest = _httpRequest;
          httpResponse.request = httpRequest;
          httpRequest.customData.onloadend = _onloadend;
          httpRequest.customData.onprogress = _onprogress;
          httpRequest.customData.onabort = _onabort;
          httpRequest.customData.ontimeout = _ontimeout;
          httpResponse.resourceTiming.startTime = performance.now();
          loader.load(httpRequest, httpResponse);
          resolve();
        });
      });
    };

    /**
     * Retriggers the request in case we did not exceed the number of retry attempts
     * @private
     */
    const _retriggerRequest = function () {
      if (remainingAttempts > 0) {
        remainingAttempts--;
        if (config && config.request) {
          config.request.retryAttempts += 1;
        }
        let retryRequest = {
          config: config
        };
        retryRequests.push(retryRequest);
        retryRequest.timeout = setTimeout(function () {
          if (retryRequests.indexOf(retryRequest) === -1) {
            return;
          } else {
            retryRequests.splice(retryRequests.indexOf(retryRequest), 1);
          }
          _internalLoad(config, remainingAttempts);
        }, mediaPlayerModel.getRetryIntervalsForType(requestObject.type));
      } else {
        if (requestObject.type === _vo_metrics_HTTPRequest_js__WEBPACK_IMPORTED_MODULE_2__.HTTPRequest.MSS_FRAGMENT_INFO_SEGMENT_TYPE) {
          return;
        }
        errHandler.error(new _vo_DashJSError_js__WEBPACK_IMPORTED_MODULE_4__["default"](downloadErrorToRequestTypeMap[requestObject.type], requestObject.url + ' is not available', {
          request: requestObject,
          response: commonMediaResponse
        }));
        if (config.error) {
          config.error(requestObject, 'error', commonMediaResponse.statusText, commonMediaResponse);
        }
        if (config.complete) {
          config.complete(requestObject, commonMediaResponse.statusText);
        }
      }
    };

    /**
     * Returns the request timeout value from Settings based on the request type.
     * This reads the value dynamically so that runtime changes via updateSettings() take effect.
     * @param {Object} requestObject
     * @returns {number}
     * @private
     */
    function _getRequestTimeout(requestObject) {
      if (requestObject.type === _vo_metrics_HTTPRequest_js__WEBPACK_IMPORTED_MODULE_2__.HTTPRequest.MPD_TYPE) {
        return settings.get().streaming.manifestRequestTimeout || 0;
      }
      if (_isFragmentRequest(requestObject)) {
        return settings.get().streaming.fragmentRequestTimeout || 0;
      }
      return 0;
    }

    // Main code after inline functions
    const requestObject = config.request;
    const traces = [];
    let firstProgress, requestStartTime, lastTraceTime, lastTraceReceivedCount, progressTimeout;
    let commonMediaRequest;
    let commonMediaResponse;
    requestObject.bytesLoaded = NaN;
    requestObject.bytesTotal = NaN;
    requestObject.firstByteDate = null;
    requestObject.traces = [];
    firstProgress = true;
    requestStartTime = new Date();
    lastTraceTime = requestStartTime;
    lastTraceReceivedCount = 0;
    progressTimeout = null;
    if (!dashMetrics || !errHandler) {
      throw new Error('config object is not correct or missing');
    }
    const loaderInformation = _getLoader(requestObject);
    const loader = loaderInformation.loader;
    requestObject.fileLoaderType = loaderInformation.fileLoaderType;
    requestObject.headers = requestObject.headers || {};
    _updateRequestUrlAndHeaders(requestObject);
    if (requestObject.range) {
      requestObject.headers['Range'] = 'bytes=' + requestObject.range;
    }
    const withCredentials = customParametersModel.getXHRWithCredentialsForType(requestObject.type);
    commonMediaRequest = new _vo_CommonMediaRequest_js__WEBPACK_IMPORTED_MODULE_15__["default"]({
      url: requestObject.url,
      method: requestObject.method || _vo_metrics_HTTPRequest_js__WEBPACK_IMPORTED_MODULE_2__.HTTPRequest.GET,
      responseType: requestObject.responseType,
      headers: requestObject.headers,
      credentials: withCredentials ? 'include' : 'omit',
      timeout: _getRequestTimeout(requestObject),
      body: requestObject.body,
      customData: {
        request: requestObject
      }
    });
    commonMediaResponse = new _vo_CommonMediaResponse_js__WEBPACK_IMPORTED_MODULE_16__["default"]({
      request: commonMediaRequest,
      resourceTiming: {
        startTime: performance.now(),
        encodedBodySize: 0
      },
      status: 0
    });

    // Adds the ability to delay single fragment loading time to control buffer.
    let now = new Date().getTime();
    if (isNaN(requestObject.delayLoadingTime) || now >= requestObject.delayLoadingTime) {
      // no delay - just send
      httpRequests.push(commonMediaRequest);
      return _loadRequest(loader, commonMediaRequest, commonMediaResponse);
    } else {
      // delay
      let delayedRequest = {
        httpRequest: commonMediaRequest,
        httpResponse: commonMediaResponse
      };
      delayedRequests.push(delayedRequest);
      delayedRequest.delayTimeout = setTimeout(function () {
        if (delayedRequests.indexOf(delayedRequest) === -1) {
          return;
        } else {
          delayedRequests.splice(delayedRequests.indexOf(delayedRequest), 1);
        }
        try {
          requestStartTime = new Date();
          lastTraceTime = requestStartTime;
          httpRequests.push(delayedRequest.httpRequest);
          _loadRequest(loader, delayedRequest.httpRequest, delayedRequest.httpResponse);
        } catch (e) {
          delayedRequest.httpRequest.onloadend();
        }
      }, requestObject.delayLoadingTime - now);
      return Promise.resolve();
    }
  }
  function _isFragmentRequest(request) {
    return request && request.type === _vo_metrics_HTTPRequest_js__WEBPACK_IMPORTED_MODULE_2__.HTTPRequest.INIT_SEGMENT_TYPE || request.type === _vo_metrics_HTTPRequest_js__WEBPACK_IMPORTED_MODULE_2__.HTTPRequest.INDEX_SEGMENT_TYPE || request.type === _vo_metrics_HTTPRequest_js__WEBPACK_IMPORTED_MODULE_2__.HTTPRequest.MEDIA_SEGMENT_TYPE || request.type === _vo_metrics_HTTPRequest_js__WEBPACK_IMPORTED_MODULE_2__.HTTPRequest.BITSTREAM_SWITCHING_SEGMENT_TYPE || request.type === _vo_metrics_HTTPRequest_js__WEBPACK_IMPORTED_MODULE_2__.HTTPRequest.MSS_FRAGMENT_INFO_SEGMENT_TYPE;
  }
  function _applyRequestInterceptors(httpRequest) {
    const interceptors = customParametersModel.getRequestInterceptors();
    if (!interceptors) {
      return Promise.resolve(httpRequest);
    }
    return interceptors.reduce((prev, next) => {
      return prev.then(request => {
        return next(request);
      });
    }, Promise.resolve(httpRequest));
  }
  function _applyResponseInterceptors(response) {
    const interceptors = customParametersModel.getResponseInterceptors();
    if (!interceptors) {
      return Promise.resolve(response);
    }
    return interceptors.reduce((prev, next) => {
      return prev.then(resp => {
        return next(resp);
      });
    }, Promise.resolve(response));
  }
  function _addHttpRequestMetric(httpRequest, httpResponse, traces) {
    const requestObject = httpRequest.customData.request;
    const cmsd = settings.get().streaming.cmsd && settings.get().streaming.cmsd.enabled ? cmsdModel.parseResponseHeaders(httpResponse.headers, requestObject.mediaType) : null;
    dashMetrics.addHttpRequest(requestObject, httpResponse.url, httpResponse.status, httpResponse.headers, traces, cmsd);
  }

  /**
   * Adds the values from the Resource Timing API, see https://developer.mozilla.org/en-US/docs/Web/API/Resource_Timing_API/Using_the_Resource_Timing_API
   * @param requestObject
   * @private
   */
  function _addResourceTimingValues(httpRequest, httpResponse) {
    if (!settings.get().streaming.abr.throughput.useResourceTimingApi) {
      return;
    }
    // Check performance support. We do not support range requests, needs to figure out how to find the right resource here.
    if (typeof performance === 'undefined' || httpRequest.range) {
      return;
    }

    // Get a list of "resource" performance entries
    const resources = performance.getEntriesByType?.('resource');
    if (resources === undefined || resources.length <= 0) {
      return;
    }

    // Find the right resource
    let i = 0;
    let resource = null;
    while (i < resources.length) {
      if (resources[i].name === httpRequest.url) {
        resource = resources[i];
        break;
      }
      i += 1;
    }

    // Check if PerformanceResourceTiming values are usable
    // Note: to allow seeing cross-origin timing information, the Timing-Allow-Origin HTTP response header needs to be set
    // See https://developer.mozilla.org/en-US/docs/Web/API/PerformanceResourceTiming#cross-origin_timing_information
    if (!_areResourceTimingValuesUsable(resource)) {
      return;
    }
    httpRequest.customData.request.resourceTimingValues = resource;

    // Update CommonMediaResponse Resource Timing info
    httpResponse.resourceTiming.startTime = resource.startTime;
    httpResponse.resourceTiming.encodedBodySize = resource.encodedBodySize;
    httpResponse.resourceTiming.responseStart = resource.responseStart;
    httpResponse.resourceTiming.responseEnd = resource.responseEnd;
    httpResponse.resourceTiming.duration = resource.duration;
  }

  /**
   * Checks if we got usable ResourceTimingAPI values
   * @param httpRequest
   * @returns {boolean}
   * @private
   */
  function _areResourceTimingValuesUsable(resource) {
    return resource && !isNaN(resource.responseStart) && resource.responseStart > 0 && !isNaN(resource.responseEnd) && resource.responseEnd > 0 && !isNaN(resource.transferSize) && resource.transferSize > 0;
  }

  /**
   * Returns either the FetchLoader or the XHRLoader depending on the request type and playback mode.
   * @param {object} request
   * @return {*}
   * @private
   */
  function _getLoader(request) {
    let loader;
    let fileLoaderType;
    if (!request.isPartialSegmentRequest && request.hasOwnProperty('availabilityTimeComplete') && request.availabilityTimeComplete === false && window.fetch && request.responseType === 'arraybuffer' && request.type === _vo_metrics_HTTPRequest_js__WEBPACK_IMPORTED_MODULE_2__.HTTPRequest.MEDIA_SEGMENT_TYPE) {
      if (!fetchLoader) {
        fetchLoader = (0,_FetchLoader_js__WEBPACK_IMPORTED_MODULE_1__["default"])(context).create();
        fetchLoader.setConfig({
          dashMetrics,
          boxParser
        });
      }
      loader = fetchLoader;
      fileLoaderType = _constants_Constants_js__WEBPACK_IMPORTED_MODULE_11__["default"].FILE_LOADER_TYPES.FETCH;
    } else {
      if (!xhrLoader) {
        xhrLoader = (0,_XHRLoader_js__WEBPACK_IMPORTED_MODULE_0__["default"])(context).create();
      }
      loader = xhrLoader;
      fileLoaderType = _constants_Constants_js__WEBPACK_IMPORTED_MODULE_11__["default"].FILE_LOADER_TYPES.XHR;
    }
    return {
      loader,
      fileLoaderType
    };
  }

  /**
   * Updates the request url and headers according to CMCD and content steering (pathway cloning)
   * @param request
   * @private
   */
  function _updateRequestUrlAndHeaders(request) {
    if (request.retryAttempts === 0) {
      _addExtUrlQueryParameters(request);
    }
    _addPathwayCloningParameters(request);
    _addCommonAccessToken(request);
  }
  function _addExtUrlQueryParameters(request) {
    // Add ExtUrlQueryInfo parameters
    let finalQueryString = extUrlQueryInfoController.getFinalQueryString(request);
    if (finalQueryString) {
      request.url = _core_Utils_js__WEBPACK_IMPORTED_MODULE_6__["default"].addAdditionalQueryParameterToUrl(request.url, finalQueryString);
    }
  }
  function _addPathwayCloningParameters(request) {
    // Add queryParams that came from pathway cloning
    if (request.queryParams) {
      const queryParams = [];
      for (const key in request.queryParams) {
        queryParams.push({
          key,
          value: request.queryParams[key]
        });
      }
      request.url = _core_Utils_js__WEBPACK_IMPORTED_MODULE_6__["default"].addAdditionalQueryParameterToUrl(request.url, queryParams);
    }
  }
  function _addCommonAccessToken(request) {
    const commonAccessToken = commonAccessTokenController.getCommonAccessTokenForUrl(request.url);
    if (commonAccessToken) {
      request.headers[_constants_Constants_js__WEBPACK_IMPORTED_MODULE_11__["default"].COMMON_ACCESS_TOKEN_HEADER] = commonAccessToken;
    }
  }

  /**
   * Aborts any inflight downloads
   * @memberof module:HTTPLoader
   * @instance
   */
  function abort() {
    retryRequests.forEach(t => {
      clearTimeout(t.timeout);
      // abort request in order to trigger LOADING_ABANDONED event
      if (t.config.request && t.config.abort) {
        t.config.abort(t.config.request);
      }
    });
    retryRequests = [];
    delayedRequests.forEach(x => clearTimeout(x.delayTimeout));
    delayedRequests = [];
    httpRequests.forEach(req => {
      const reqData = req.customData;
      if (!reqData) {
        return;
      }
      // MSS patch: ignore FragmentInfo requests
      if (reqData.request && reqData.request.type === _vo_metrics_HTTPRequest_js__WEBPACK_IMPORTED_MODULE_2__.HTTPRequest.MSS_FRAGMENT_INFO_SEGMENT_TYPE) {
        return;
      }

      // abort will trigger onloadend which we don't want
      // when deliberately aborting inflight requests -
      // set them to undefined so they are not called
      reqData.onloadend = reqData.onprogress = undefined;
      if (reqData.abort) {
        reqData.abort();
      }
    });
    httpRequests = [];
  }
  function resetInitialSettings() {
    if (xhrLoader) {
      xhrLoader.resetInitialSettings();
    }
  }
  function reset() {
    httpRequests = [];
    delayedRequests = [];
    retryRequests = [];
    if (xhrLoader) {
      xhrLoader.reset();
    }
    if (fetchLoader) {
      fetchLoader.reset();
    }
    xhrLoader = null;
    fetchLoader = null;
  }
  instance = {
    abort,
    load,
    reset,
    resetInitialSettings,
    setConfig
  };
  setup();
  return instance;
}
HTTPLoader.__dashjs_factory_name = 'HTTPLoader';
const factory = _core_FactoryMaker_js__WEBPACK_IMPORTED_MODULE_3__["default"].getClassFactory(HTTPLoader);
/* harmony default export */ __webpack_exports__["default"] = (factory);

/***/ }),

/***/ "./src/streaming/net/SchemeLoaderFactory.js":
/*!**************************************************!*\
  !*** ./src/streaming/net/SchemeLoaderFactory.js ***!
  \**************************************************/
/***/ (function(__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony import */ var _core_FactoryMaker_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../../core/FactoryMaker.js */ "./src/core/FactoryMaker.js");
/* harmony import */ var _streaming_net_HTTPLoader_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../../streaming/net/HTTPLoader.js */ "./src/streaming/net/HTTPLoader.js");
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
 * @module
 * @description Choose right url loader for scheme
 * @ignore
 */
function SchemeLoaderFactory() {
  let instance;
  let schemeLoaderMap;
  function registerLoader(scheme, loader) {
    schemeLoaderMap[scheme] = loader;
  }
  function unregisterLoader(scheme) {
    if (schemeLoaderMap[scheme]) {
      delete schemeLoaderMap[scheme];
    }
  }
  function unregisterAllLoader() {
    schemeLoaderMap = {};
  }
  function getLoader(url) {
    // iterates through schemeLoaderMap to find a loader for the scheme
    for (var scheme in schemeLoaderMap) {
      if (schemeLoaderMap.hasOwnProperty(scheme) && url.startsWith(scheme)) {
        return schemeLoaderMap[scheme];
      }
    }
    return _streaming_net_HTTPLoader_js__WEBPACK_IMPORTED_MODULE_1__["default"];
  }
  function reset() {
    unregisterAllLoader();
  }
  function setup() {
    reset();
  }
  setup();
  instance = {
    getLoader,
    registerLoader,
    unregisterLoader,
    unregisterAllLoader,
    reset
  };
  return instance;
}
SchemeLoaderFactory.__dashjs_factory_name = 'SchemeLoaderFactory';
const factory = _core_FactoryMaker_js__WEBPACK_IMPORTED_MODULE_0__["default"].getSingletonFactory(SchemeLoaderFactory);
/* harmony default export */ __webpack_exports__["default"] = (factory);

/***/ }),

/***/ "./src/streaming/net/URLLoader.js":
/*!****************************************!*\
  !*** ./src/streaming/net/URLLoader.js ***!
  \****************************************/
/***/ (function(__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony import */ var _core_FactoryMaker_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../../core/FactoryMaker.js */ "./src/core/FactoryMaker.js");
/* harmony import */ var _streaming_net_SchemeLoaderFactory_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../../streaming/net/SchemeLoaderFactory.js */ "./src/streaming/net/SchemeLoaderFactory.js");
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
 * @class URLLoader
 * @description  Call Offline Loader or Online Loader depending on URL
 * @param {Object} cfg - dependencies
 * @ignore
 */
function URLLoader(cfg) {
  cfg = cfg || {};
  const context = this.context;
  let instance, schemeLoaderFactory, loader;
  schemeLoaderFactory = (0,_streaming_net_SchemeLoaderFactory_js__WEBPACK_IMPORTED_MODULE_1__["default"])(context).getInstance();
  function load(config) {
    if (!loader) {
      let loaderFactory = schemeLoaderFactory.getLoader(config && config.request ? config.request.url : null);
      loader = loaderFactory(context).create({
        errHandler: cfg.errHandler,
        mediaPlayerModel: cfg.mediaPlayerModel,
        dashMetrics: cfg.dashMetrics,
        boxParser: cfg.boxParser ? cfg.boxParser : null,
        constants: cfg.constants ? cfg.constants : null,
        dashConstants: cfg.dashConstants ? cfg.dashConstants : null,
        urlUtils: cfg.urlUtils ? cfg.urlUtils : null,
        errors: cfg.errors
      });
    }
    loader.load(config);
  }
  function abort() {
    if (loader) {
      loader.abort();
    }
  }
  function resetInitialSettings() {
    if (loader && typeof loader.resetInitialSettings === 'function') {
      loader.resetInitialSettings();
    }
  }
  function reset() {
    if (schemeLoaderFactory) {
      schemeLoaderFactory.reset();
      schemeLoaderFactory = null;
    }
    if (loader && typeof loader.reset === 'function') {
      loader.reset();
    }
    loader = null;
  }
  instance = {
    abort,
    load,
    reset,
    resetInitialSettings
  };
  return instance;
}
URLLoader.__dashjs_factory_name = 'URLLoader';
const factory = _core_FactoryMaker_js__WEBPACK_IMPORTED_MODULE_0__["default"].getClassFactory(URLLoader);
/* harmony default export */ __webpack_exports__["default"] = (factory);

/***/ }),

/***/ "./src/streaming/net/XHRLoader.js":
/*!****************************************!*\
  !*** ./src/streaming/net/XHRLoader.js ***!
  \****************************************/
/***/ (function(__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony import */ var _core_FactoryMaker_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../../core/FactoryMaker.js */ "./src/core/FactoryMaker.js");
/* harmony import */ var _core_Utils_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../../core/Utils.js */ "./src/core/Utils.js");
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
 * @module XHRLoader
 * @ignore
 * @description Manages download of resources via HTTP.
 */
function XHRLoader() {
  let instance;
  let xhr;

  /**
   * Load request
   * @param {CommonMediaRequest} commonMediaRequest
   * @param {CommonMediaResponse} commonMediaResponse
   */
  function load(commonMediaRequest, commonMediaResponse) {
    xhr = null;
    xhr = new XMLHttpRequest();
    xhr.open(commonMediaRequest.method, commonMediaRequest.url, true);
    if (commonMediaRequest.responseType) {
      xhr.responseType = commonMediaRequest.responseType;
    }
    if (commonMediaRequest.headers) {
      for (let header in commonMediaRequest.headers) {
        let value = commonMediaRequest.headers[header];
        if (value) {
          xhr.setRequestHeader(header, value);
        }
      }
    }
    xhr.withCredentials = commonMediaRequest.credentials === 'include';
    xhr.timeout = commonMediaRequest.timeout;
    xhr.onload = function () {
      commonMediaResponse.url = this.responseURL;
      commonMediaResponse.status = this.status;
      commonMediaResponse.statusText = this.statusText;
      commonMediaResponse.headers = _core_Utils_js__WEBPACK_IMPORTED_MODULE_1__["default"].parseHttpHeaders(this.getAllResponseHeaders());
      commonMediaResponse.data = this.response;
    };
    if (commonMediaRequest.customData) {
      xhr.onloadend = commonMediaRequest.customData.onloadend;
      xhr.onprogress = commonMediaRequest.customData.onprogress;
      xhr.onabort = commonMediaRequest.customData.onabort;
      xhr.ontimeout = commonMediaRequest.customData.ontimeout;
    }
    let body = commonMediaRequest.body || null;
    xhr.send(body);
    commonMediaRequest.customData.abort = abort.bind(this);
    return true;
  }
  function abort() {
    if (xhr) {
      // Clear most handlers before abort to prevent unwanted callbacks
      xhr.onloadend = xhr.onerror = xhr.onprogress = xhr.onload = null;
      // Call abort - this will trigger onabort callback if set
      xhr.abort();
      // Clear remaining handlers after abort to prevent memory leaks
      xhr.onabort = xhr.ontimeout = null;
      xhr = null;
    }
  }
  function getXhr() {
    return xhr;
  }
  function resetInitialSettings() {
    abort();
  }
  function reset() {
    abort();
    instance = null;
  }
  instance = {
    load,
    abort,
    getXhr,
    reset,
    resetInitialSettings
  };
  return instance;
}
XHRLoader.__dashjs_factory_name = 'XHRLoader';
const factory = _core_FactoryMaker_js__WEBPACK_IMPORTED_MODULE_0__["default"].getClassFactory(XHRLoader);
/* harmony default export */ __webpack_exports__["default"] = (factory);

/***/ }),

/***/ "./src/streaming/rules/SwitchRequest.js":
/*!**********************************************!*\
  !*** ./src/streaming/rules/SwitchRequest.js ***!
  \**********************************************/
/***/ (function(__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony import */ var _core_FactoryMaker_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../../core/FactoryMaker.js */ "./src/core/FactoryMaker.js");
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


const NO_CHANGE = null;
const PRIORITY = {
  DEFAULT: 0.5,
  STRONG: 1,
  WEAK: 0
};
function SwitchRequest(rep, reas, prio, r) {
  let instance, representation, priority, reason, rule;

  // check priority value
  function getPriority(p) {
    let ret = PRIORITY.DEFAULT;

    // check that p is one of declared priority value
    if (p === PRIORITY.DEFAULT || p === PRIORITY.STRONG || p === PRIORITY.WEAK) {
      ret = p;
    }
    return ret;
  }

  // init attributes
  representation = rep === undefined ? NO_CHANGE : rep;
  priority = getPriority(prio);
  reason = reas === undefined ? null : reas;
  rule = r === undefined ? null : r;
  instance = {
    representation,
    reason,
    rule,
    priority
  };
  return instance;
}
SwitchRequest.__dashjs_factory_name = 'SwitchRequest';
const factory = _core_FactoryMaker_js__WEBPACK_IMPORTED_MODULE_0__["default"].getClassFactory(SwitchRequest);
factory.NO_CHANGE = NO_CHANGE;
factory.PRIORITY = PRIORITY;
_core_FactoryMaker_js__WEBPACK_IMPORTED_MODULE_0__["default"].updateClassFactory(SwitchRequest.__dashjs_factory_name, factory);
/* harmony default export */ __webpack_exports__["default"] = (factory);

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

/***/ "./src/streaming/utils/CustomTimeRanges.js":
/*!*************************************************!*\
  !*** ./src/streaming/utils/CustomTimeRanges.js ***!
  \*************************************************/
/***/ (function(__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony import */ var _core_FactoryMaker_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../../core/FactoryMaker.js */ "./src/core/FactoryMaker.js");
/* harmony import */ var _SupervisorTools_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./SupervisorTools.js */ "./src/streaming/utils/SupervisorTools.js");
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


function CustomTimeRanges(/*config*/
) {
  let customTimeRangeArray = [];
  let length = 0;
  function add(start, end) {
    let i;

    // eslint-disable-next-line curly
    for (i = 0; i < this.customTimeRangeArray.length && start > this.customTimeRangeArray[i].start; i++);
    this.customTimeRangeArray.splice(i, 0, {
      start: start,
      end: end
    });
    for (i = 0; i < this.customTimeRangeArray.length - 1; i++) {
      if (this.mergeRanges(i, i + 1)) {
        i--;
      }
    }
    this.length = this.customTimeRangeArray.length;
  }
  function clear() {
    this.customTimeRangeArray = [];
    this.length = 0;
  }
  function remove(start, end) {
    for (let i = 0; i < this.customTimeRangeArray.length; i++) {
      if (start <= this.customTimeRangeArray[i].start && end >= this.customTimeRangeArray[i].end) {
        //      |--------------Range i-------|
        //|---------------Range to remove ---------------|
        //    or
        //|--------------Range i-------|
        //|--------------Range to remove ---------------|
        //    or
        //                 |--------------Range i-------|
        //|--------------Range to remove ---------------|
        this.customTimeRangeArray.splice(i, 1);
        i--;
      } else if (start > this.customTimeRangeArray[i].start && end < this.customTimeRangeArray[i].end) {
        //|-----------------Range i----------------|
        //        |-------Range to remove -----|
        this.customTimeRangeArray.splice(i + 1, 0, {
          start: end,
          end: this.customTimeRangeArray[i].end
        });
        this.customTimeRangeArray[i].end = start;
        break;
      } else if (start > this.customTimeRangeArray[i].start && start < this.customTimeRangeArray[i].end) {
        //|-----------Range i----------|
        //                    |---------Range to remove --------|
        //    or
        //|-----------------Range i----------------|
        //            |-------Range to remove -----|
        this.customTimeRangeArray[i].end = start;
      } else if (end > this.customTimeRangeArray[i].start && end < this.customTimeRangeArray[i].end) {
        //                     |-----------Range i----------|
        //|---------Range to remove --------|
        //            or
        //|-----------------Range i----------------|
        //|-------Range to remove -----|
        this.customTimeRangeArray[i].start = end;
      }
    }
    this.length = this.customTimeRangeArray.length;
  }
  function mergeRanges(rangeIndex1, rangeIndex2) {
    let range1 = this.customTimeRangeArray[rangeIndex1];
    let range2 = this.customTimeRangeArray[rangeIndex2];
    if (range1.start <= range2.start && range2.start <= range1.end && range1.end <= range2.end) {
      //|-----------Range1----------|
      //                    |-----------Range2----------|
      range1.end = range2.end;
      this.customTimeRangeArray.splice(rangeIndex2, 1);
      return true;
    } else if (range2.start <= range1.start && range1.start <= range2.end && range2.end <= range1.end) {
      //                |-----------Range1----------|
      //|-----------Range2----------|
      range1.start = range2.start;
      this.customTimeRangeArray.splice(rangeIndex2, 1);
      return true;
    } else if (range2.start <= range1.start && range1.start <= range2.end && range1.end <= range2.end) {
      //      |--------Range1-------|
      //|---------------Range2--------------|
      this.customTimeRangeArray.splice(rangeIndex1, 1);
      return true;
    } else if (range1.start <= range2.start && range2.start <= range1.end && range2.end <= range1.end) {
      //|-----------------Range1--------------|
      //        |-----------Range2----------|
      this.customTimeRangeArray.splice(rangeIndex2, 1);
      return true;
    }
    return false;
  }
  function start(index) {
    (0,_SupervisorTools_js__WEBPACK_IMPORTED_MODULE_1__.checkInteger)(index);
    if (index >= this.customTimeRangeArray.length || index < 0) {
      return NaN;
    }
    return this.customTimeRangeArray[index].start;
  }
  function end(index) {
    (0,_SupervisorTools_js__WEBPACK_IMPORTED_MODULE_1__.checkInteger)(index);
    if (index >= this.customTimeRangeArray.length || index < 0) {
      return NaN;
    }
    return this.customTimeRangeArray[index].end;
  }
  return {
    customTimeRangeArray: customTimeRangeArray,
    length: length,
    add: add,
    clear: clear,
    remove: remove,
    mergeRanges: mergeRanges,
    start: start,
    end: end
  };
}
CustomTimeRanges.__dashjs_factory_name = 'CustomTimeRanges';
/* harmony default export */ __webpack_exports__["default"] = (_core_FactoryMaker_js__WEBPACK_IMPORTED_MODULE_0__["default"].getClassFactory(CustomTimeRanges));

/***/ }),

/***/ "./src/streaming/utils/DefaultURLUtils.js":
/*!************************************************!*\
  !*** ./src/streaming/utils/DefaultURLUtils.js ***!
  \************************************************/
/***/ (function(__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony import */ var _core_FactoryMaker_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../../core/FactoryMaker.js */ "./src/core/FactoryMaker.js");
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
 * @module DefaultURLUtils
 * @description Provides utility functions for operating on URLs.
 * Initially this is simply a method to determine the Base URL of a URL, but
 * should probably include other things provided all over the place such as
 * determining whether a URL is relative/absolute, resolving two paths etc.
 * @ignore
 */
function DefaultURLUtils() {
  let resolveFunction;
  const schemeRegex = /^[a-z][a-z0-9+\-_.]*:/i;
  const httpUrlRegex = /^https?:\/\//i;
  const httpsUrlRegex = /^https:\/\//i;
  const originRegex = /^([a-z][a-z0-9+\-_.]*:\/\/[^\/]+)\/?/i;

  /**
   * Resolves a url given an optional base url
   * Uses window.URL to do the resolution.
   *
   * @param {string} url
   * @param {string} [baseUrl]
   * @return {string}
   * @memberof module:DefaultURLUtils
   * @instance
   * @private
   */
  const nativeURLResolver = (url, baseUrl) => {
    try {
      return new window.URL(url, baseUrl).toString();
    } catch (e) {
      return url;
    }
  };

  /**
   * Resolves a url given an optional base url
   * Does not resolve ./, ../ etc but will do enough to construct something
   * which will satisfy XHR etc when window.URL is not available ie
   * IE11/node etc.
   *
   * @param {string} url
   * @param {string} [baseUrl]
   * @return {string}
   * @memberof module:DefaultURLUtils
   * @instance
   * @private
   */
  const dumbURLResolver = (url, baseUrl) => {
    let baseUrlParseFunc = parseBaseUrl;
    if (!baseUrl) {
      return url;
    }
    if (!isRelative(url)) {
      return url;
    }
    if (isPathAbsolute(url)) {
      baseUrlParseFunc = parseOrigin;
    }
    if (isSchemeRelative(url)) {
      baseUrlParseFunc = parseScheme;
    }
    const base = baseUrlParseFunc(baseUrl);
    const joinChar = base.charAt(base.length - 1) !== '/' && url.charAt(0) !== '/' ? '/' : '';
    return [base, url].join(joinChar);
  };
  function setup() {
    try {
      const u = new window.URL('x', 'http://y'); // eslint-disable-line
      resolveFunction = nativeURLResolver;
    } catch (e) {
      // must be IE11/Node etc
    } finally {
      resolveFunction = resolveFunction || dumbURLResolver;
    }
  }

  /**
   * Returns a string that contains the Base URL of a URL, if determinable.
   * @param {string} url - full url
   * @return {string}
   * @memberof module:DefaultURLUtils
   * @instance
   */
  function parseBaseUrl(url) {
    const slashIndex = url.indexOf('/');
    const lastSlashIndex = url.lastIndexOf('/');
    if (slashIndex !== -1) {
      // if there is only '//'
      if (lastSlashIndex === slashIndex + 1) {
        return url;
      }
      if (url.indexOf('?') !== -1) {
        url = url.substring(0, url.indexOf('?'));
      }
      return url.substring(0, lastSlashIndex + 1);
    }
    return '';
  }

  /**
   * Returns a string that contains the scheme and origin of a URL,
   * if determinable.
   * @param {string} url - full url
   * @return {string}
   * @memberof module:DefaultURLUtils
   * @instance
   */
  function parseOrigin(url) {
    const matches = url.match(originRegex);
    if (matches) {
      return matches[1];
    }
    return '';
  }

  /**
   * Returns a string that contains the fragment of a URL without scheme,
   * if determinable.
   * @param {string} url - full url
   * @return {string}
   * @memberof module:DefaultURLUtils
   * @instance
   */
  function removeHostname(url) {
    let urlParts = /^(?:\w+\:\/\/)?([^\/]+)(.*)$/.exec(url); //[1] = host / [2] = path
    return urlParts[2].substring(1);
  }

  /**
   * Returns a string that contains the scheme of a URL, if determinable.
   * @param {string} url - full url
   * @return {string}
   * @memberof module:DefaultURLUtils
   * @instance
   */
  function parseScheme(url) {
    const matches = url.match(schemeRegex);
    if (matches) {
      return matches[0];
    }
    return '';
  }

  /**
   * Determines whether the url is relative.
   * @return {boolean}
   * @param {string} url
   * @memberof module:DefaultURLUtils
   * @instance
   */
  function isRelative(url) {
    return !schemeRegex.test(url);
  }

  /**
   * Determines whether the url is path-absolute.
   * @return {bool}
   * @param {string} url
   * @memberof module:DefaultURLUtils
   * @instance
   */
  function isPathAbsolute(url) {
    return isRelative(url) && url.charAt(0) === '/';
  }

  /**
   * Determines whether the url is scheme-relative.
   * @return {bool}
   * @param {string} url
   * @memberof module:DefaultURLUtils
   * @instance
   */
  function isSchemeRelative(url) {
    return url.indexOf('//') === 0;
  }

  /**
   * Determines whether the url is an HTTP-URL as defined in ISO/IEC
   * 23009-1:2014 3.1.15. ie URL with a fixed scheme of http or https
   * @return {bool}
   * @param {string} url
   * @memberof module:DefaultURLUtils
   * @instance
   */
  function isHTTPURL(url) {
    return httpUrlRegex.test(url);
  }

  /**
   * Determines whether the supplied url has https scheme
   * @return {bool}
   * @param {string} url
   * @memberof module:DefaultURLUtils
   * @instance
   */
  function isHTTPS(url) {
    return httpsUrlRegex.test(url);
  }

  /**
   * Resolves a url given an optional base url
   * @return {string}
   * @param {string} url
   * @param {string} [baseUrl]
   * @memberof module:DefaultURLUtils
   * @instance
   */
  function resolve(url, baseUrl) {
    return resolveFunction(url, baseUrl);
  }
  setup();
  const instance = {
    parseBaseUrl: parseBaseUrl,
    parseOrigin: parseOrigin,
    parseScheme: parseScheme,
    isRelative: isRelative,
    isPathAbsolute: isPathAbsolute,
    isSchemeRelative: isSchemeRelative,
    isHTTPURL: isHTTPURL,
    isHTTPS: isHTTPS,
    removeHostname: removeHostname,
    resolve: resolve
  };
  return instance;
}
DefaultURLUtils.__dashjs_factory_name = 'DefaultURLUtils';
/* harmony default export */ __webpack_exports__["default"] = (_core_FactoryMaker_js__WEBPACK_IMPORTED_MODULE_0__["default"].getSingletonFactory(DefaultURLUtils));

/***/ }),

/***/ "./src/streaming/utils/ObjectUtils.js":
/*!********************************************!*\
  !*** ./src/streaming/utils/ObjectUtils.js ***!
  \********************************************/
/***/ (function(__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony import */ var _core_FactoryMaker_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../../core/FactoryMaker.js */ "./src/core/FactoryMaker.js");
/* harmony import */ var fast_deep_equal__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! fast-deep-equal */ "./node_modules/fast-deep-equal/index.js");
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
 * @module ObjectUtils
 * @ignore
 * @description Provides utility functions for objects
 */
function ObjectUtils() {
  let instance;

  /**
   * Returns true if objects are equal
   * @return {boolean}
   * @param {object} obj1
   * @param {object} obj2
   * @memberof module:ObjectUtils
   * @instance
   */
  function areEqual(obj1, obj2) {
    return fast_deep_equal__WEBPACK_IMPORTED_MODULE_1__(obj1, obj2);
  }
  instance = {
    areEqual
  };
  return instance;
}
ObjectUtils.__dashjs_factory_name = 'ObjectUtils';
/* harmony default export */ __webpack_exports__["default"] = (_core_FactoryMaker_js__WEBPACK_IMPORTED_MODULE_0__["default"].getSingletonFactory(ObjectUtils));

/***/ }),

/***/ "./src/streaming/utils/SupervisorTools.js":
/*!************************************************!*\
  !*** ./src/streaming/utils/SupervisorTools.js ***!
  \************************************************/
/***/ (function(__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   checkInteger: function() { return /* binding */ checkInteger; },
/* harmony export */   checkIsVideoOrAudioType: function() { return /* binding */ checkIsVideoOrAudioType; },
/* harmony export */   checkParameterType: function() { return /* binding */ checkParameterType; },
/* harmony export */   checkRange: function() { return /* binding */ checkRange; }
/* harmony export */ });
/* harmony import */ var _constants_Constants_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../constants/Constants.js */ "./src/streaming/constants/Constants.js");
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

function checkParameterType(parameter, type) {
  if (typeof parameter !== type) {
    throw _constants_Constants_js__WEBPACK_IMPORTED_MODULE_0__["default"].BAD_ARGUMENT_ERROR;
  }
}
function checkInteger(parameter) {
  const isInt = parameter !== null && !isNaN(parameter) && parameter % 1 === 0;
  if (!isInt) {
    throw _constants_Constants_js__WEBPACK_IMPORTED_MODULE_0__["default"].BAD_ARGUMENT_ERROR + ' : argument is not an integer';
  }
}
function checkRange(parameter, min, max) {
  if (parameter < min || parameter > max) {
    throw _constants_Constants_js__WEBPACK_IMPORTED_MODULE_0__["default"].BAD_ARGUMENT_ERROR + ' : argument out of range';
  }
}
function checkIsVideoOrAudioType(type) {
  if (typeof type !== 'string' || type !== _constants_Constants_js__WEBPACK_IMPORTED_MODULE_0__["default"].AUDIO && type !== _constants_Constants_js__WEBPACK_IMPORTED_MODULE_0__["default"].VIDEO) {
    throw _constants_Constants_js__WEBPACK_IMPORTED_MODULE_0__["default"].BAD_ARGUMENT_ERROR;
  }
}

/***/ }),

/***/ "./src/streaming/utils/URLUtils.js":
/*!*****************************************!*\
  !*** ./src/streaming/utils/URLUtils.js ***!
  \*****************************************/
/***/ (function(__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony import */ var _core_FactoryMaker_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../../core/FactoryMaker.js */ "./src/core/FactoryMaker.js");
/* harmony import */ var _DefaultURLUtils_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./DefaultURLUtils.js */ "./src/streaming/utils/DefaultURLUtils.js");
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
 * @module URLUtils
 * @ignore
 * @description Provides utility functions for operating on URLs.
 * Initially this is simply a method to determine the Base URL of a URL, but
 * should probably include other things provided all over the place such as
 * determining whether a URL is relative/absolute, resolving two paths etc.
 */
function URLUtils() {
  let instance;
  let defaultURLUtils;
  let regexUtils = [];
  const context = this.context;
  function getUtils(url) {
    let i;
    for (i = 0; i < regexUtils.length; i++) {
      let regex = regexUtils[i].regex;
      if (regex.test(url)) {
        return regexUtils[i].utils;
      }
    }
    return defaultURLUtils;
  }
  function setup() {
    defaultURLUtils = (0,_DefaultURLUtils_js__WEBPACK_IMPORTED_MODULE_1__["default"])(context).getInstance();
  }

  /**
   * Register a module to handle specific url.
   * @param {regex} regex - url regex
   * @param {object} utils - object that handles the regex
   * @memberof module:URLUtils
   * @instance
   */
  function registerUrlRegex(regex, utils) {
    regexUtils.push({
      regex: regex,
      utils: utils
    });
  }
  function internalCall(functionName, url, baseUrl) {
    let utils = getUtils(baseUrl || url);
    return utils && typeof utils[functionName] === 'function' ? utils[functionName](url, baseUrl) : defaultURLUtils[functionName](url, baseUrl);
  }

  /**
   * Returns a string that contains the Base URL of a URL, if determinable.
   * @param {string} url - full url
   * @return {string}
   * @memberof module:URLUtils
   * @instance
   */
  function parseBaseUrl(url) {
    return internalCall('parseBaseUrl', url);
  }

  /**
   * Returns a string that contains the scheme and origin of a URL,
   * if determinable.
   * @param {string} url - full url
   * @return {string}
   * @memberof module:URLUtils
   * @instance
   */
  function parseOrigin(url) {
    return internalCall('parseOrigin', url);
  }

  /**
   * Returns a string that contains the fragment of a URL without scheme,
   * if determinable.
   * @param {string} url - full url
   * @return {string}
   * @memberof module:URLUtils
   * @instance
   */
  function removeHostname(url) {
    return internalCall('removeHostname', url);
  }

  /**
   * Returns a string that contains the scheme of a URL, if determinable.
   * @param {string} url - full url
   * @return {string}
   * @memberof module:URLUtils
   * @instance
   */
  function parseScheme(url) {
    return internalCall('parseScheme', url);
  }

  /**
   * Determines whether the url is relative.
   * @return {boolean}
   * @param {string} url
   * @memberof module:URLUtils
   * @instance
   */
  function isRelative(url) {
    return internalCall('isRelative', url);
  }

  /**
   * Determines whether the url is path-absolute.
   * @return {bool}
   * @param {string} url
   * @memberof module:URLUtils
   * @instance
   */
  function isPathAbsolute(url) {
    return internalCall('isPathAbsolute', url);
  }

  /**
   * Determines whether the url is scheme-relative.
   * @return {bool}
   * @param {string} url
   * @memberof module:URLUtils
   * @instance
   */
  function isSchemeRelative(url) {
    return internalCall('isSchemeRelative', url);
  }

  /**
   * Determines whether the url is an HTTP-URL as defined in ISO/IEC
   * 23009-1:2014 3.1.15. ie URL with a fixed scheme of http or https
   * @return {bool}
   * @param {string} url
   * @memberof module:URLUtils
   * @instance
   */
  function isHTTPURL(url) {
    return internalCall('isHTTPURL', url);
  }

  /**
   * Determines whether the supplied url has https scheme
   * @return {bool}
   * @param {string} url
   * @memberof module:URLUtils
   * @instance
   */
  function isHTTPS(url) {
    return internalCall('isHTTPS', url);
  }

  /**
   * Resolves a url given an optional base url
   * @return {string}
   * @param {string} url
   * @param {string} [baseUrl]
   * @memberof module:URLUtils
   * @instance
   */
  function resolve(url, baseUrl) {
    return internalCall('resolve', url, baseUrl);
  }
  setup();
  instance = {
    registerUrlRegex: registerUrlRegex,
    parseBaseUrl: parseBaseUrl,
    parseOrigin: parseOrigin,
    parseScheme: parseScheme,
    isRelative: isRelative,
    isPathAbsolute: isPathAbsolute,
    isSchemeRelative: isSchemeRelative,
    isHTTPURL: isHTTPURL,
    isHTTPS: isHTTPS,
    removeHostname: removeHostname,
    resolve: resolve
  };
  return instance;
}
URLUtils.__dashjs_factory_name = 'URLUtils';
const factory = _core_FactoryMaker_js__WEBPACK_IMPORTED_MODULE_0__["default"].getSingletonFactory(URLUtils);
/* harmony default export */ __webpack_exports__["default"] = (factory);

/***/ }),

/***/ "./src/streaming/vo/CmcdReportRequest.js":
/*!***********************************************!*\
  !*** ./src/streaming/vo/CmcdReportRequest.js ***!
  \***********************************************/
/***/ (function(__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony import */ var _FragmentRequest_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./FragmentRequest.js */ "./src/streaming/vo/FragmentRequest.js");
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

class CmcdReportRequest extends _FragmentRequest_js__WEBPACK_IMPORTED_MODULE_0__["default"] {
  constructor(method) {
    super();
    this.method = method || null;
  }
}
/* harmony default export */ __webpack_exports__["default"] = (CmcdReportRequest);

/***/ }),

/***/ "./src/streaming/vo/CommonMediaRequest.js":
/*!************************************************!*\
  !*** ./src/streaming/vo/CommonMediaRequest.js ***!
  \************************************************/
/***/ (function(__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
class CommonMediaRequest {
  /**
   * @param {Object} params
   * @param {string} params.url
   * @param {string} params.method
   * @param {BodyInit} [params.body]
   * @param {string} [params.responseType]
   * @param {Object<string, string>} [params.headers]
   * @param {RequestCredentials} [params.credentials]
   * @param {RequestMode} [params.mode]
   * @param {number} [params.timeout]
   * @param {Object} [params.customData]
   */
  constructor(params) {
    this.url = params.url;
    this.method = params.method;
    this.body = params.body !== undefined ? params.body : null;
    this.responseType = params.responseType !== undefined ? params.responseType : null;
    this.headers = params.headers !== undefined ? params.headers : {};
    this.credentials = params.credentials !== undefined ? params.credentials : null;
    this.mode = params.mode !== undefined ? params.mode : null;
    this.timeout = params.timeout !== undefined ? params.timeout : 0;
    this.customData = params.customData !== undefined ? params.customData : {};
  }
}
/* harmony default export */ __webpack_exports__["default"] = (CommonMediaRequest);

/***/ }),

/***/ "./src/streaming/vo/CommonMediaResponse.js":
/*!*************************************************!*\
  !*** ./src/streaming/vo/CommonMediaResponse.js ***!
  \*************************************************/
/***/ (function(__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
class CommonMediaResponse {
  /**
   * @param {Object} params
   * @param {CommonMediaRequest} params.request
   * @param {string} [params.url]
   * @param {boolean} [params.redirected]
   * @param {number} [params.status]
   * @param {string} [params.statusText]
   * @param {string} [params.type]
   * @param {Object<string, string>} [params.headers]
   * @param {any} [params.data]
   * @param {ResourceTiming} [params.resourceTiming]
   */
  constructor(params) {
    this.request = params.request;
    this.url = params.url !== undefined ? params.url : null;
    this.redirected = params.redirected !== undefined ? params.redirected : false;
    this.status = params.status !== undefined ? params.status : null;
    this.statusText = params.statusText !== undefined ? params.statusText : '';
    this.type = params.type !== undefined ? params.type : '';
    this.headers = params.headers !== undefined ? params.headers : {};
    this.data = params.data !== undefined ? params.data : null;
    this.resourceTiming = params.resourceTiming !== undefined ? params.resourceTiming : null;
  }
}
/* harmony default export */ __webpack_exports__["default"] = (CommonMediaResponse);

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

/***/ "./src/streaming/vo/ExternalSubtitle.js":
/*!**********************************************!*\
  !*** ./src/streaming/vo/ExternalSubtitle.js ***!
  \**********************************************/
/***/ (function(__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony import */ var _dash_constants_DashConstants_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../../dash/constants/DashConstants.js */ "./src/dash/constants/DashConstants.js");
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
class ExternalSubtitle {
  constructor(externalSubtitleObject) {
    this.id = externalSubtitleObject.id;
    this.url = externalSubtitleObject.url;
    this.language = externalSubtitleObject.language;
    this.mimeType = externalSubtitleObject.mimeType;
    this.bandwidth = externalSubtitleObject.bandwidth;
    this.periodId = externalSubtitleObject.periodId || null;
  }
  serializeToMpdParserFormat() {
    return {
      'tagName': _dash_constants_DashConstants_js__WEBPACK_IMPORTED_MODULE_0__["default"].ADAPTATION_SET,
      'mimeType': this.mimeType,
      'lang': this.language,
      'Representation': [{
        'tagName': _dash_constants_DashConstants_js__WEBPACK_IMPORTED_MODULE_0__["default"].REPRESENTATION,
        'id': this.id,
        'bandwidth': this.bandwidth,
        'BaseURL': [{
          'tagName': _dash_constants_DashConstants_js__WEBPACK_IMPORTED_MODULE_0__["default"].BASE_URL,
          '__text': this.url
        }],
        'mimeType': this.mimeType
      }]
    };
  }
}
/* harmony default export */ __webpack_exports__["default"] = (ExternalSubtitle);

/***/ }),

/***/ "./src/streaming/vo/FragmentRequest.js":
/*!*********************************************!*\
  !*** ./src/streaming/vo/FragmentRequest.js ***!
  \*********************************************/
/***/ (function(__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony import */ var _metrics_HTTPRequest_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./metrics/HTTPRequest.js */ "./src/streaming/vo/metrics/HTTPRequest.js");
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
class FragmentRequest {
  constructor(url) {
    this.action = FragmentRequest.ACTION_DOWNLOAD;
    this.availabilityEndTime = null;
    this.availabilityStartTime = null;
    this.bandwidth = NaN;
    this.bytesLoaded = NaN;
    this.bytesTotal = NaN;
    this.delayLoadingTime = NaN;
    this.duration = NaN;
    this.endDate = null;
    this.firstByteDate = null;
    this.index = NaN;
    this.isPartialSegmentRequest = false;
    this.mediaStartTime = NaN;
    this.mediaType = null;
    this.presentationStartTime = NaN;
    this.range = null;
    this.representation = null;
    this.responseType = 'arraybuffer';
    this.retryAttempts = 0;
    this.serviceLocation = null;
    this.startDate = null;
    this.startTime = NaN;
    this.timescale = NaN;
    this.type = null;
    this.url = url || null;
    this.wallStartTime = null;
  }
  isInitializationRequest() {
    return this.type && this.type === _metrics_HTTPRequest_js__WEBPACK_IMPORTED_MODULE_0__.HTTPRequest.INIT_SEGMENT_TYPE;
  }
  setInfo(info) {
    this.type = info && info.init ? _metrics_HTTPRequest_js__WEBPACK_IMPORTED_MODULE_0__.HTTPRequest.INIT_SEGMENT_TYPE : _metrics_HTTPRequest_js__WEBPACK_IMPORTED_MODULE_0__.HTTPRequest.MEDIA_SEGMENT_TYPE;
    this.url = info && info.url ? info.url : null;
    this.range = info && info.range ? info.range.start + '-' + info.range.end : null;
    this.mediaType = info && info.mediaType ? info.mediaType : null;
    this.representation = info && info.representation ? info.representation : null;
  }
}
FragmentRequest.ACTION_DOWNLOAD = 'download';
FragmentRequest.ACTION_COMPLETE = 'complete';
/* harmony default export */ __webpack_exports__["default"] = (FragmentRequest);

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

/******/ });
/************************************************************************/
/******/ // The module cache
/******/ var __webpack_module_cache__ = {};
/******/ 
/******/ // The require function
/******/ function __webpack_require__(moduleId) {
/******/ 	// Check if module is in cache
/******/ 	var cachedModule = __webpack_module_cache__[moduleId];
/******/ 	if (cachedModule !== undefined) {
/******/ 		return cachedModule.exports;
/******/ 	}
/******/ 	// Create a new module (and put it into the cache)
/******/ 	var module = __webpack_module_cache__[moduleId] = {
/******/ 		// no module.id needed
/******/ 		// no module.loaded needed
/******/ 		exports: {}
/******/ 	};
/******/ 
/******/ 	// Execute the module function
/******/ 	__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 
/******/ 	// Return the exports of the module
/******/ 	return module.exports;
/******/ }
/******/ 
/************************************************************************/
/******/ /* webpack/runtime/define property getters */
/******/ !function() {
/******/ 	// define getter functions for harmony exports
/******/ 	__webpack_require__.d = function(exports, definition) {
/******/ 		for(var key in definition) {
/******/ 			if(__webpack_require__.o(definition, key) && !__webpack_require__.o(exports, key)) {
/******/ 				Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
/******/ 			}
/******/ 		}
/******/ 	};
/******/ }();
/******/ 
/******/ /* webpack/runtime/hasOwnProperty shorthand */
/******/ !function() {
/******/ 	__webpack_require__.o = function(obj, prop) { return Object.prototype.hasOwnProperty.call(obj, prop); }
/******/ }();
/******/ 
/******/ /* webpack/runtime/make namespace object */
/******/ !function() {
/******/ 	// define __esModule on exports
/******/ 	__webpack_require__.r = function(exports) {
/******/ 		if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 			Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 		}
/******/ 		Object.defineProperty(exports, '__esModule', { value: true });
/******/ 	};
/******/ }();
/******/ 
/************************************************************************/
var __webpack_exports__ = {};
/*!***************************************************!*\
  !*** ./src/streaming/metrics/MetricsReporting.js ***!
  \***************************************************/
__webpack_require__.r(__webpack_exports__);
/* harmony import */ var _utils_DVBErrorsTranslator_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./utils/DVBErrorsTranslator.js */ "./src/streaming/metrics/utils/DVBErrorsTranslator.js");
/* harmony import */ var _MetricsReportingEvents_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./MetricsReportingEvents.js */ "./src/streaming/metrics/MetricsReportingEvents.js");
/* harmony import */ var _controllers_MetricsCollectionController_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./controllers/MetricsCollectionController.js */ "./src/streaming/metrics/controllers/MetricsCollectionController.js");
/* harmony import */ var _metrics_MetricsHandlerFactory_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./metrics/MetricsHandlerFactory.js */ "./src/streaming/metrics/metrics/MetricsHandlerFactory.js");
/* harmony import */ var _reporting_ReportingFactory_js__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ./reporting/ReportingFactory.js */ "./src/streaming/metrics/reporting/ReportingFactory.js");
/* harmony import */ var _core_FactoryMaker_js__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ../../core/FactoryMaker.js */ "./src/core/FactoryMaker.js");
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







function MetricsReporting() {
  let context = this.context;
  let instance, dvbErrorsTranslator;

  /**
   * Create a MetricsCollectionController, and a DVBErrorsTranslator
   * @param {Object} config - dependancies from owner
   * @return {MetricsCollectionController} Metrics Collection Controller
   */
  function createMetricsReporting(config) {
    dvbErrorsTranslator = (0,_utils_DVBErrorsTranslator_js__WEBPACK_IMPORTED_MODULE_0__["default"])(context).getInstance({
      eventBus: config.eventBus,
      dashMetrics: config.dashMetrics,
      metricsConstants: config.metricsConstants,
      events: config.events
    });
    dvbErrorsTranslator.initialize();
    return (0,_controllers_MetricsCollectionController_js__WEBPACK_IMPORTED_MODULE_2__["default"])(context).create(config);
  }

  /**
   * Get the ReportingFactory to allow new reporters to be registered
   * @return {ReportingFactory} Reporting Factory
   */
  function getReportingFactory() {
    return (0,_reporting_ReportingFactory_js__WEBPACK_IMPORTED_MODULE_4__["default"])(context).getInstance();
  }

  /**
   * Get the MetricsHandlerFactory to allow new handlers to be registered
   * @return {MetricsHandlerFactory} Metrics Handler Factory
   */
  function getMetricsHandlerFactory() {
    return (0,_metrics_MetricsHandlerFactory_js__WEBPACK_IMPORTED_MODULE_3__["default"])(context).getInstance();
  }
  instance = {
    createMetricsReporting,
    getReportingFactory,
    getMetricsHandlerFactory
  };
  return instance;
}
MetricsReporting.__dashjs_factory_name = 'MetricsReporting';
const factory = _core_FactoryMaker_js__WEBPACK_IMPORTED_MODULE_5__["default"].getClassFactory(MetricsReporting);
factory.events = _MetricsReportingEvents_js__WEBPACK_IMPORTED_MODULE_1__["default"];
_core_FactoryMaker_js__WEBPACK_IMPORTED_MODULE_5__["default"].updateClassFactory(MetricsReporting.__dashjs_factory_name, factory);
/* harmony default export */ __webpack_exports__["default"] = (factory);
__webpack_exports__ = __webpack_exports__["default"];
var __webpack_exports__default = __webpack_exports__["default"];
export { __webpack_exports__default as default };

//# sourceMappingURL=dash.reporting.debug.js.map