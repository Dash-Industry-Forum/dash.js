(function(definition) {
    Q = definition();
})(function() {
    "use strict";
    var qStartingLine = captureLine();
    var qFileName;
    var noop = function() {};
    var nextTick;
    if (typeof process !== "undefined") {
        nextTick = process.nextTick;
    } else if (typeof setImmediate === "function") {
        if (typeof window !== "undefined") {
            nextTick = setImmediate.bind(window);
        } else {
            nextTick = setImmediate;
        }
    } else {
        (function() {
            var head = {
                task: void 0,
                next: null
            }, tail = head, maxPendingTicks = 2, pendingTicks = 0, queuedTasks = 0, usedTicks = 0, requestTick;
            function onTick() {
                --pendingTicks;
                if (++usedTicks >= maxPendingTicks) {
                    usedTicks = 0;
                    maxPendingTicks *= 4;
                    var expectedTicks = queuedTasks && Math.min(queuedTasks - 1, maxPendingTicks);
                    while (pendingTicks < expectedTicks) {
                        ++pendingTicks;
                        requestTick();
                    }
                }
                while (queuedTasks) {
                    --queuedTasks;
                    head = head.next;
                    var task = head.task;
                    head.task = void 0;
                    task();
                }
                usedTicks = 0;
            }
            nextTick = function(task) {
                tail = tail.next = {
                    task: task,
                    next: null
                };
                if (pendingTicks < ++queuedTasks && pendingTicks < maxPendingTicks) {
                    ++pendingTicks;
                    requestTick();
                }
            };
            if (typeof MessageChannel !== "undefined") {
                var channel = new MessageChannel();
                channel.port1.onmessage = onTick;
                requestTick = function() {
                    channel.port2.postMessage(0);
                };
            } else {
                requestTick = function() {
                    setTimeout(onTick, 0);
                };
            }
        })();
    }
    function uncurryThis(f) {
        var call = Function.call;
        return function() {
            return call.apply(f, arguments);
        };
    }
    var array_slice = uncurryThis(Array.prototype.slice);
    var array_reduce = uncurryThis(Array.prototype.reduce || function(callback, basis) {
        var index = 0, length = this.length;
        if (arguments.length === 1) {
            do {
                if (index in this) {
                    basis = this[index++];
                    break;
                }
                if (++index >= length) {
                    throw new TypeError();
                }
            } while (1);
        }
        for (;index < length; index++) {
            if (index in this) {
                basis = callback(basis, this[index], index);
            }
        }
        return basis;
    });
    var array_indexOf = uncurryThis(Array.prototype.indexOf || function(value) {
        for (var i = 0; i < this.length; i++) {
            if (this[i] === value) {
                return i;
            }
        }
        return -1;
    });
    var array_map = uncurryThis(Array.prototype.map || function(callback, thisp) {
        var self = this;
        var collect = [];
        array_reduce(self, function(undefined, value, index) {
            collect.push(callback.call(thisp, value, index, self));
        }, void 0);
        return collect;
    });
    var object_create = Object.create || function(prototype) {
        function Type() {}
        Type.prototype = prototype;
        return new Type();
    };
    var object_hasOwnProperty = uncurryThis(Object.prototype.hasOwnProperty);
    var object_keys = Object.keys || function(object) {
        var keys = [];
        for (var key in object) {
            if (object_hasOwnProperty(object, key)) {
                keys.push(key);
            }
        }
        return keys;
    };
    var object_toString = uncurryThis(Object.prototype.toString);
    function isStopIteration(exception) {
        return object_toString(exception) === "[object StopIteration]" || exception instanceof QReturnValue;
    }
    var QReturnValue;
    if (typeof ReturnValue !== "undefined") {
        QReturnValue = ReturnValue;
    } else {
        QReturnValue = function(value) {
            this.value = value;
        };
    }
    Q.longStackJumpLimit = 1;
    var STACK_JUMP_SEPARATOR = "From previous event:";
    function makeStackTraceLong(error, promise) {
        if (promise.stack && typeof error === "object" && error !== null && error.stack && error.stack.indexOf(STACK_JUMP_SEPARATOR) === -1) {
            error.stack = filterStackString(error.stack) + "\n" + STACK_JUMP_SEPARATOR + "\n" + filterStackString(promise.stack);
        }
    }
    function filterStackString(stackString) {
        var lines = stackString.split("\n");
        var desiredLines = [];
        for (var i = 0; i < lines.length; ++i) {
            var line = lines[i];
            if (!isInternalFrame(line) && !isNodeFrame(line)) {
                desiredLines.push(line);
            }
        }
        return desiredLines.join("\n");
    }
    function isNodeFrame(stackLine) {
        return stackLine.indexOf("(module.js:") !== -1 || stackLine.indexOf("(node.js:") !== -1;
    }
    function isInternalFrame(stackLine) {
        var pieces = /at .+ \((.*):(\d+):\d+\)/.exec(stackLine);
        if (!pieces) {
            return false;
        }
        var fileName = pieces[1];
        var lineNumber = pieces[2];
        return fileName === qFileName && lineNumber >= qStartingLine && lineNumber <= qEndingLine;
    }
    function captureLine() {
        if (Error.captureStackTrace) {
            var fileName, lineNumber;
            var oldPrepareStackTrace = Error.prepareStackTrace;
            Error.prepareStackTrace = function(error, frames) {
                fileName = frames[1].getFileName();
                lineNumber = frames[1].getLineNumber();
            };
            new Error().stack;
            Error.prepareStackTrace = oldPrepareStackTrace;
            qFileName = fileName;
            return lineNumber;
        }
    }
    function deprecate(callback, name, alternative) {
        return function() {
            if (typeof console !== "undefined" && typeof console.warn === "function") {
                console.warn(name + " is deprecated, use " + alternative + " instead.", new Error("").stack);
            }
            return callback.apply(callback, arguments);
        };
    }
    function Q(value) {
        return resolve(value);
    }
    Q.nextTick = nextTick;
    Q.defer = defer;
    function defer() {
        var pending = [], progressListeners = [], value;
        var deferred = object_create(defer.prototype);
        var promise = object_create(makePromise.prototype);
        promise.promiseDispatch = function(resolve, op, operands) {
            var args = array_slice(arguments);
            if (pending) {
                pending.push(args);
                if (op === "when" && operands[1]) {
                    progressListeners.push(operands[1]);
                }
            } else {
                nextTick(function() {
                    value.promiseDispatch.apply(value, args);
                });
            }
        };
        promise.valueOf = function() {
            if (pending) {
                return promise;
            }
            value = valueOf(value);
            return value;
        };
        if (Error.captureStackTrace && Q.longStackJumpLimit > 0) {
            Error.captureStackTrace(promise, defer);
            promise.stack = promise.stack.substring(promise.stack.indexOf("\n") + 1);
        }
        function become(resolvedValue) {
            if (!pending) {
                return;
            }
            value = resolve(resolvedValue);
            array_reduce(pending, function(undefined, pending) {
                nextTick(function() {
                    value.promiseDispatch.apply(value, pending);
                });
            }, void 0);
            pending = void 0;
            progressListeners = void 0;
        }
        deferred.promise = promise;
        deferred.resolve = become;
        deferred.fulfill = function(value) {
            become(fulfill(value));
        };
        deferred.reject = function(exception) {
            become(reject(exception));
        };
        deferred.notify = function(progress) {
            if (pending) {
                array_reduce(progressListeners, function(undefined, progressListener) {
                    nextTick(function() {
                        progressListener(progress);
                    });
                }, void 0);
            }
        };
        return deferred;
    }
    defer.prototype.makeNodeResolver = function() {
        var self = this;
        return function(error, value) {
            if (error) {
                self.reject(error);
            } else if (arguments.length > 2) {
                self.resolve(array_slice(arguments, 1));
            } else {
                self.resolve(value);
            }
        };
    };
    Q.promise = promise;
    function promise(makePromise) {
        var deferred = defer();
        fcall(makePromise, deferred.resolve, deferred.reject, deferred.notify).fail(deferred.reject);
        return deferred.promise;
    }
    Q.makePromise = makePromise;
    function makePromise(descriptor, fallback, valueOf, exception, isException) {
        if (fallback === void 0) {
            fallback = function(op) {
                return reject(new Error("Promise does not support operation: " + op));
            };
        }
        var promise = object_create(makePromise.prototype);
        promise.promiseDispatch = function(resolve, op, args) {
            var result;
            try {
                if (descriptor[op]) {
                    result = descriptor[op].apply(promise, args);
                } else {
                    result = fallback.call(promise, op, args);
                }
            } catch (exception) {
                result = reject(exception);
            }
            if (resolve) {
                resolve(result);
            }
        };
        if (valueOf) {
            promise.valueOf = valueOf;
        }
        if (isException) {
            promise.exception = exception;
        }
        return promise;
    }
    makePromise.prototype.then = function(fulfilled, rejected, progressed) {
        return when(this, fulfilled, rejected, progressed);
    };
    makePromise.prototype.thenResolve = function(value) {
        return when(this, function() {
            return value;
        });
    };
    array_reduce([ "isFulfilled", "isRejected", "isPending", "dispatch", "when", "spread", "get", "put", "set", "del", "delete", "post", "send", "invoke", "keys", "fapply", "fcall", "fbind", "all", "allResolved", "timeout", "delay", "catch", "finally", "fail", "fin", "progress", "done", "nfcall", "nfapply", "nfbind", "denodeify", "nbind", "ncall", "napply", "nbind", "npost", "nsend", "ninvoke", "nodeify" ], function(undefined, name) {
        makePromise.prototype[name] = function() {
            return Q[name].apply(Q, [ this ].concat(array_slice(arguments)));
        };
    }, void 0);
    makePromise.prototype.toSource = function() {
        return this.toString();
    };
    makePromise.prototype.toString = function() {
        return "[object Promise]";
    };
    Q.nearer = valueOf;
    function valueOf(value) {
        if (isPromise(value)) {
            return value.valueOf();
        }
        return value;
    }
    Q.isPromise = isPromise;
    function isPromise(object) {
        return object && typeof object.promiseDispatch === "function";
    }
    Q.isPromiseAlike = isPromiseAlike;
    function isPromiseAlike(object) {
        return object && typeof object.then === "function";
    }
    Q.isPending = isPending;
    function isPending(object) {
        return !isFulfilled(object) && !isRejected(object);
    }
    Q.isFulfilled = isFulfilled;
    function isFulfilled(object) {
        return !isPromiseAlike(valueOf(object));
    }
    Q.isRejected = isRejected;
    function isRejected(object) {
        object = valueOf(object);
        return isPromise(object) && "exception" in object;
    }
    var rejections = [];
    var errors = [];
    var errorsDisplayed;
    function displayErrors() {
        if (!errorsDisplayed && typeof window !== "undefined" && !window.Touch && window.console) {
            console.log("Should be empty:", errors);
        }
        errorsDisplayed = true;
    }
    if (typeof process !== "undefined" && process.on) {
        process.on("exit", function() {
            for (var i = 0; i < errors.length; i++) {
                var error = errors[i];
                if (error && typeof error.stack !== "undefined") {
                    console.warn("Unhandled rejected promise:", error.stack);
                } else {
                    console.warn("Unhandled rejected promise (no stack):", error);
                }
            }
        });
    }
    Q.reject = reject;
    function reject(exception) {
        var rejection = makePromise({
            when: function(rejected) {
                if (rejected) {
                    var at = array_indexOf(rejections, this);
                    if (at !== -1) {
                        errors.splice(at, 1);
                        rejections.splice(at, 1);
                    }
                }
                return rejected ? rejected(exception) : this;
            }
        }, function fallback() {
            return reject(exception);
        }, function valueOf() {
            return this;
        }, exception, true);
        displayErrors();
        rejections.push(rejection);
        errors.push(exception);
        return rejection;
    }
    Q.fulfill = fulfill;
    function fulfill(object) {
        return makePromise({
            when: function() {
                return object;
            },
            get: function(name) {
                return object[name];
            },
            set: function(name, value) {
                object[name] = value;
            },
            "delete": function(name) {
                delete object[name];
            },
            post: function(name, args) {
                if (name == null) {
                    return object.apply(void 0, args);
                } else {
                    return object[name].apply(object, args);
                }
            },
            apply: function(thisP, args) {
                return object.apply(thisP, args);
            },
            keys: function() {
                return object_keys(object);
            }
        }, void 0, function valueOf() {
            return object;
        });
    }
    Q.resolve = resolve;
    function resolve(value) {
        if (isPromise(value)) {
            return value;
        }
        value = valueOf(value);
        if (isPromiseAlike(value)) {
            return coerce(value);
        } else {
            return fulfill(value);
        }
    }
    function coerce(promise) {
        var deferred = defer();
        nextTick(function() {
            try {
                promise.then(deferred.resolve, deferred.reject, deferred.notify);
            } catch (exception) {
                deferred.reject(exception);
            }
        });
        return deferred.promise;
    }
    Q.master = master;
    function master(object) {
        return makePromise({
            isDef: function() {}
        }, function fallback(op, args) {
            return dispatch(object, op, args);
        }, function() {
            return valueOf(object);
        });
    }
    Q.when = when;
    function when(value, fulfilled, rejected, progressed) {
        var deferred = defer();
        var done = false;
        function _fulfilled(value) {
            try {
                return typeof fulfilled === "function" ? fulfilled(value) : value;
            } catch (exception) {
                return reject(exception);
            }
        }
        function _rejected(exception) {
            if (typeof rejected === "function") {
                makeStackTraceLong(exception, resolvedValue);
                try {
                    return rejected(exception);
                } catch (newException) {
                    return reject(newException);
                }
            }
            return reject(exception);
        }
        function _progressed(value) {
            return typeof progressed === "function" ? progressed(value) : value;
        }
        var resolvedValue = resolve(value);
        nextTick(function() {
            resolvedValue.promiseDispatch(function(value) {
                if (done) {
                    return;
                }
                done = true;
                deferred.resolve(_fulfilled(value));
            }, "when", [ function(exception) {
                if (done) {
                    return;
                }
                done = true;
                deferred.resolve(_rejected(exception));
            } ]);
        });
        resolvedValue.promiseDispatch(void 0, "when", [ void 0, function(value) {
            var newValue;
            var threw = false;
            try {
                newValue = _progressed(value);
            } catch (e) {
                threw = true;
                if (Q.onerror) {
                    Q.onerror(e);
                } else {
                    throw e;
                }
            }
            if (!threw) {
                deferred.notify(newValue);
            }
        } ]);
        return deferred.promise;
    }
    Q.spread = spread;
    function spread(promise, fulfilled, rejected) {
        return when(promise, function(valuesOrPromises) {
            return all(valuesOrPromises).then(function(values) {
                return fulfilled.apply(void 0, values);
            }, rejected);
        }, rejected);
    }
    Q.async = async;
    function async(makeGenerator) {
        return function() {
            function continuer(verb, arg) {
                var result;
                try {
                    result = generator[verb](arg);
                } catch (exception) {
                    if (isStopIteration(exception)) {
                        return exception.value;
                    } else {
                        return reject(exception);
                    }
                }
                return when(result, callback, errback);
            }
            var generator = makeGenerator.apply(this, arguments);
            var callback = continuer.bind(continuer, "send");
            var errback = continuer.bind(continuer, "throw");
            return callback();
        };
    }
    Q["return"] = _return;
    function _return(value) {
        throw new QReturnValue(value);
    }
    Q.promised = promised;
    function promised(callback) {
        return function() {
            return spread([ this, all(arguments) ], function(self, args) {
                return callback.apply(self, args);
            });
        };
    }
    Q.dispatch = dispatch;
    function dispatch(object, op, args) {
        var deferred = defer();
        nextTick(function() {
            resolve(object).promiseDispatch(deferred.resolve, op, args);
        });
        return deferred.promise;
    }
    Q.dispatcher = dispatcher;
    function dispatcher(op) {
        return function(object) {
            var args = array_slice(arguments, 1);
            return dispatch(object, op, args);
        };
    }
    Q.get = dispatcher("get");
    Q.set = dispatcher("set");
    Q["delete"] = Q.del = dispatcher("delete");
    var post = Q.post = dispatcher("post");
    Q.send = send;
    Q.invoke = send;
    function send(value, name) {
        var args = array_slice(arguments, 2);
        return post(value, name, args);
    }
    Q.fapply = fapply;
    function fapply(value, args) {
        return dispatch(value, "apply", [ void 0, args ]);
    }
    Q["try"] = fcall;
    Q.fcall = fcall;
    function fcall(value) {
        var args = array_slice(arguments, 1);
        return fapply(value, args);
    }
    Q.fbind = fbind;
    function fbind(value) {
        var args = array_slice(arguments, 1);
        return function fbound() {
            var allArgs = args.concat(array_slice(arguments));
            return dispatch(value, "apply", [ this, allArgs ]);
        };
    }
    Q.keys = dispatcher("keys");
    Q.all = all;
    function all(promises) {
        return when(promises, function(promises) {
            var countDown = promises.length;
            if (countDown === 0) {
                return resolve(promises);
            }
            var deferred = defer();
            array_reduce(promises, function(undefined, promise, index) {
                if (isFulfilled(promise)) {
                    promises[index] = valueOf(promise);
                    if (--countDown === 0) {
                        deferred.resolve(promises);
                    }
                } else {
                    when(promise, function(value) {
                        promises[index] = value;
                        if (--countDown === 0) {
                            deferred.resolve(promises);
                        }
                    }).fail(deferred.reject);
                }
            }, void 0);
            return deferred.promise;
        });
    }
    Q.allResolved = allResolved;
    function allResolved(promises) {
        return when(promises, function(promises) {
            promises = array_map(promises, resolve);
            return when(all(array_map(promises, function(promise) {
                return when(promise, noop, noop);
            })), function() {
                return promises;
            });
        });
    }
    Q["catch"] = Q.fail = fail;
    function fail(promise, rejected) {
        return when(promise, void 0, rejected);
    }
    Q.progress = progress;
    function progress(promise, progressed) {
        return when(promise, void 0, void 0, progressed);
    }
    Q["finally"] = Q.fin = fin;
    function fin(promise, callback) {
        return when(promise, function(value) {
            return when(callback(), function() {
                return value;
            });
        }, function(exception) {
            return when(callback(), function() {
                return reject(exception);
            });
        });
    }
    Q.done = done;
    function done(promise, fulfilled, rejected, progress) {
        var onUnhandledError = function(error) {
            nextTick(function() {
                makeStackTraceLong(error, promise);
                if (Q.onerror) {
                    Q.onerror(error);
                } else {
                    throw error;
                }
            });
        };
        var promiseToHandle = fulfilled || rejected || progress ? when(promise, fulfilled, rejected, progress) : promise;
        if (typeof process === "object" && process && process.domain) {
            onUnhandledError = process.domain.bind(onUnhandledError);
        }
        fail(promiseToHandle, onUnhandledError);
    }
    Q.timeout = timeout;
    function timeout(promise, ms) {
        var deferred = defer();
        var timeoutId = setTimeout(function() {
            deferred.reject(new Error("Timed out after " + ms + " ms"));
        }, ms);
        when(promise, function(value) {
            clearTimeout(timeoutId);
            deferred.resolve(value);
        }, function(exception) {
            clearTimeout(timeoutId);
            deferred.reject(exception);
        });
        return deferred.promise;
    }
    Q.delay = delay;
    function delay(promise, timeout) {
        if (timeout === void 0) {
            timeout = promise;
            promise = void 0;
        }
        var deferred = defer();
        setTimeout(function() {
            deferred.resolve(promise);
        }, timeout);
        return deferred.promise;
    }
    Q.nfapply = nfapply;
    function nfapply(callback, args) {
        var nodeArgs = array_slice(args);
        var deferred = defer();
        nodeArgs.push(deferred.makeNodeResolver());
        fapply(callback, nodeArgs).fail(deferred.reject);
        return deferred.promise;
    }
    Q.nfcall = nfcall;
    function nfcall(callback) {
        var nodeArgs = array_slice(arguments, 1);
        var deferred = defer();
        nodeArgs.push(deferred.makeNodeResolver());
        fapply(callback, nodeArgs).fail(deferred.reject);
        return deferred.promise;
    }
    Q.nfbind = nfbind;
    Q.denodeify = Q.nfbind;
    function nfbind(callback) {
        var baseArgs = array_slice(arguments, 1);
        return function() {
            var nodeArgs = baseArgs.concat(array_slice(arguments));
            var deferred = defer();
            nodeArgs.push(deferred.makeNodeResolver());
            fapply(callback, nodeArgs).fail(deferred.reject);
            return deferred.promise;
        };
    }
    Q.nbind = nbind;
    function nbind(callback) {
        var baseArgs = array_slice(arguments, 1);
        return function() {
            var nodeArgs = baseArgs.concat(array_slice(arguments));
            var deferred = defer();
            nodeArgs.push(deferred.makeNodeResolver());
            var thisArg = this;
            function bound() {
                return callback.apply(thisArg, arguments);
            }
            fapply(bound, nodeArgs).fail(deferred.reject);
            return deferred.promise;
        };
    }
    Q.npost = npost;
    function npost(object, name, args) {
        var nodeArgs = array_slice(args || []);
        var deferred = defer();
        nodeArgs.push(deferred.makeNodeResolver());
        post(object, name, nodeArgs).fail(deferred.reject);
        return deferred.promise;
    }
    Q.nsend = nsend;
    Q.ninvoke = Q.nsend;
    function nsend(object, name) {
        var nodeArgs = array_slice(arguments, 2);
        var deferred = defer();
        nodeArgs.push(deferred.makeNodeResolver());
        post(object, name, nodeArgs).fail(deferred.reject);
        return deferred.promise;
    }
    Q.nodeify = nodeify;
    function nodeify(promise, nodeback) {
        if (nodeback) {
            promise.then(function(value) {
                nextTick(function() {
                    nodeback(null, value);
                });
            }, function(error) {
                nextTick(function() {
                    nodeback(error);
                });
            });
        } else {
            return promise;
        }
    }
    var qEndingLine = captureLine();
    return Q;
});

function X2JS(matchers, attrPrefix, ignoreRoot) {
    if (attrPrefix === null || attrPrefix === undefined) {
        attrPrefix = "_";
    }
    if (ignoreRoot === null || ignoreRoot === undefined) {
        ignoreRoot = false;
    }
    var VERSION = "1.0.11";
    var escapeMode = false;
    var DOMNodeTypes = {
        ELEMENT_NODE: 1,
        TEXT_NODE: 3,
        CDATA_SECTION_NODE: 4,
        COMMENT_NODE: 8,
        DOCUMENT_NODE: 9
    };
    function getNodeLocalName(node) {
        var nodeLocalName = node.localName;
        if (nodeLocalName == null) nodeLocalName = node.baseName;
        if (nodeLocalName == null || nodeLocalName == "") nodeLocalName = node.nodeName;
        return nodeLocalName;
    }
    function getNodePrefix(node) {
        return node.prefix;
    }
    function escapeXmlChars(str) {
        if (typeof str == "string") return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#x27;").replace(/\//g, "&#x2F;"); else return str;
    }
    function unescapeXmlChars(str) {
        return str.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#x27;/g, "'").replace(/&#x2F;/g, "/");
    }
    function parseDOMChildren(node) {
        if (node.nodeType == DOMNodeTypes.DOCUMENT_NODE) {
            var result, child = node.firstChild, i, len;
            for (i = 0, len = node.childNodes.length; i < len; i += 1) {
                if (node.childNodes[i].nodeType !== DOMNodeTypes.COMMENT_NODE) {
                    child = node.childNodes[i];
                    break;
                }
            }
            if (ignoreRoot) {
                result = parseDOMChildren(child);
            } else {
                result = {};
                var childName = getNodeLocalName(child);
                result[childName] = parseDOMChildren(child);
            }
            return result;
        } else if (node.nodeType == DOMNodeTypes.ELEMENT_NODE) {
            var result = new Object();
            result.__cnt = 0;
            var nodeChildren = node.childNodes;
            for (var cidx = 0; cidx < nodeChildren.length; cidx++) {
                var child = nodeChildren.item(cidx);
                var childName = getNodeLocalName(child);
                result.__cnt++;
                if (result[childName] == null) {
                    result[childName] = parseDOMChildren(child);
                    result[childName + "_asArray"] = new Array(1);
                    result[childName + "_asArray"][0] = result[childName];
                } else {
                    if (result[childName] != null) {
                        if (!(result[childName] instanceof Array)) {
                            var tmpObj = result[childName];
                            result[childName] = new Array();
                            result[childName][0] = tmpObj;
                            result[childName + "_asArray"] = result[childName];
                        }
                    }
                    var aridx = 0;
                    while (result[childName][aridx] != null) aridx++;
                    result[childName][aridx] = parseDOMChildren(child);
                }
            }
            for (var aidx = 0; aidx < node.attributes.length; aidx++) {
                var attr = node.attributes.item(aidx);
                result.__cnt++;
                var value2 = attr.value;
                for (var m = 0, ml = matchers.length; m < ml; m++) {
                    var matchobj = matchers[m];
                    if (matchobj.test.call(this, attr.value)) value2 = matchobj.converter.call(this, attr.value);
                }
                result[attrPrefix + attr.name] = value2;
            }
            var nodePrefix = getNodePrefix(node);
            if (nodePrefix != null && nodePrefix != "") {
                result.__cnt++;
                result.__prefix = nodePrefix;
            }
            if (result.__cnt == 1 && result["#text"] != null) {
                result = result["#text"];
            }
            if (result["#text"] != null) {
                result.__text = result["#text"];
                if (escapeMode) result.__text = unescapeXmlChars(result.__text);
                delete result["#text"];
                delete result["#text_asArray"];
            }
            if (result["#cdata-section"] != null) {
                result.__cdata = result["#cdata-section"];
                delete result["#cdata-section"];
                delete result["#cdata-section_asArray"];
            }
            if (result.__text != null || result.__cdata != null) {
                result.toString = function() {
                    return (this.__text != null ? this.__text : "") + (this.__cdata != null ? this.__cdata : "");
                };
            }
            return result;
        } else if (node.nodeType == DOMNodeTypes.TEXT_NODE || node.nodeType == DOMNodeTypes.CDATA_SECTION_NODE) {
            return node.nodeValue;
        } else if (node.nodeType == DOMNodeTypes.COMMENT_NODE) {
            return null;
        }
    }
    function startTag(jsonObj, element, attrList, closed) {
        var resultStr = "<" + (jsonObj != null && jsonObj.__prefix != null ? jsonObj.__prefix + ":" : "") + element;
        if (attrList != null) {
            for (var aidx = 0; aidx < attrList.length; aidx++) {
                var attrName = attrList[aidx];
                var attrVal = jsonObj[attrName];
                resultStr += " " + attrName.substr(1) + "='" + attrVal + "'";
            }
        }
        if (!closed) resultStr += ">"; else resultStr += "/>";
        return resultStr;
    }
    function endTag(jsonObj, elementName) {
        return "</" + (jsonObj.__prefix != null ? jsonObj.__prefix + ":" : "") + elementName + ">";
    }
    function endsWith(str, suffix) {
        return str.indexOf(suffix, str.length - suffix.length) !== -1;
    }
    function jsonXmlSpecialElem(jsonObj, jsonObjField) {
        if (endsWith(jsonObjField.toString(), "_asArray") || jsonObjField.toString().indexOf("_") == 0 || jsonObj[jsonObjField] instanceof Function) return true; else return false;
    }
    function jsonXmlElemCount(jsonObj) {
        var elementsCnt = 0;
        if (jsonObj instanceof Object) {
            for (var it in jsonObj) {
                if (jsonXmlSpecialElem(jsonObj, it)) continue;
                elementsCnt++;
            }
        }
        return elementsCnt;
    }
    function parseJSONAttributes(jsonObj) {
        var attrList = [];
        if (jsonObj instanceof Object) {
            for (var ait in jsonObj) {
                if (ait.toString().indexOf("__") == -1 && ait.toString().indexOf("_") == 0) {
                    attrList.push(ait);
                }
            }
        }
        return attrList;
    }
    function parseJSONTextAttrs(jsonTxtObj) {
        var result = "";
        if (jsonTxtObj.__cdata != null) {
            result += "<![CDATA[" + jsonTxtObj.__cdata + "]]>";
        }
        if (jsonTxtObj.__text != null) {
            if (escapeMode) result += escapeXmlChars(jsonTxtObj.__text); else result += jsonTxtObj.__text;
        }
        return result;
    }
    function parseJSONTextObject(jsonTxtObj) {
        var result = "";
        if (jsonTxtObj instanceof Object) {
            result += parseJSONTextAttrs(jsonTxtObj);
        } else if (jsonTxtObj != null) {
            if (escapeMode) result += escapeXmlChars(jsonTxtObj); else result += jsonTxtObj;
        }
        return result;
    }
    function parseJSONArray(jsonArrRoot, jsonArrObj, attrList) {
        var result = "";
        if (jsonArrRoot.length == 0) {
            result += startTag(jsonArrRoot, jsonArrObj, attrList, true);
        } else {
            for (var arIdx = 0; arIdx < jsonArrRoot.length; arIdx++) {
                result += startTag(jsonArrRoot[arIdx], jsonArrObj, parseJSONAttributes(jsonArrRoot[arIdx]), false);
                result += parseJSONObject(jsonArrRoot[arIdx]);
                result += endTag(jsonArrRoot[arIdx], jsonArrObj);
            }
        }
        return result;
    }
    function parseJSONObject(jsonObj) {
        var result = "";
        var elementsCnt = jsonXmlElemCount(jsonObj);
        if (elementsCnt > 0) {
            for (var it in jsonObj) {
                if (jsonXmlSpecialElem(jsonObj, it)) continue;
                var subObj = jsonObj[it];
                var attrList = parseJSONAttributes(subObj);
                if (subObj == null || subObj == undefined) {
                    result += startTag(subObj, it, attrList, true);
                } else if (subObj instanceof Object) {
                    if (subObj instanceof Array) {
                        result += parseJSONArray(subObj, it, attrList);
                    } else {
                        var subObjElementsCnt = jsonXmlElemCount(subObj);
                        if (subObjElementsCnt > 0 || subObj.__text != null || subObj.__cdata != null) {
                            result += startTag(subObj, it, attrList, false);
                            result += parseJSONObject(subObj);
                            result += endTag(subObj, it);
                        } else {
                            result += startTag(subObj, it, attrList, true);
                        }
                    }
                } else {
                    result += startTag(subObj, it, attrList, false);
                    result += parseJSONTextObject(subObj);
                    result += endTag(subObj, it);
                }
            }
        }
        result += parseJSONTextObject(jsonObj);
        return result;
    }
    this.parseXmlString = function(xmlDocStr) {
        var xmlDoc;
        if (window.DOMParser) {
            var parser = new window.DOMParser();
            xmlDoc = parser.parseFromString(xmlDocStr, "text/xml");
        } else {
            if (xmlDocStr.indexOf("<?") == 0) {
                xmlDocStr = xmlDocStr.substr(xmlDocStr.indexOf("?>") + 2);
            }
            xmlDoc = new ActiveXObject("Microsoft.XMLDOM");
            xmlDoc.async = "false";
            xmlDoc.loadXML(xmlDocStr);
        }
        return xmlDoc;
    };
    this.xml2json = function(xmlDoc) {
        return parseDOMChildren(xmlDoc);
    };
    this.xml_str2json = function(xmlDocStr) {
        var xmlDoc = this.parseXmlString(xmlDocStr);
        return this.xml2json(xmlDoc);
    };
    this.json2xml_str = function(jsonObj) {
        return parseJSONObject(jsonObj);
    };
    this.json2xml = function(jsonObj) {
        var xmlDocStr = this.json2xml_str(jsonObj);
        return this.parseXmlString(xmlDocStr);
    };
    this.getVersion = function() {
        return VERSION;
    };
    this.escapeMode = function(enabled) {
        escapeMode = enabled;
    };
}

function ObjectIron(map) {
    var lookup;
    lookup = [];
    for (i = 0, len = map.length; i < len; i += 1) {
        if (map[i].isRoot) {
            lookup.push("root");
        } else {
            lookup.push(map[i].name);
        }
    }
    var mergeValues = function(parentItem, childItem) {
        var name, parentValue, childValue;
        if (parentItem === null || childItem === null) {
            return;
        }
        for (name in parentItem) {
            if (parentItem.hasOwnProperty(name)) {
                if (!childItem.hasOwnProperty(name)) {
                    childItem[name] = parentItem[name];
                }
            }
        }
    }, mapProperties = function(properties, parent, child) {
        var i, len, property, parentValue, childValue;
        if (properties === null || properties.length === 0) {
            return;
        }
        for (i = 0, len = properties.length; i < len; i += 1) {
            property = properties[i];
            if (parent.hasOwnProperty(property.name)) {
                if (child.hasOwnProperty(property.name)) {
                    if (property.merge) {
                        parentValue = parent[property.name];
                        childValue = child[property.name];
                        if (typeof parentValue === "object" && typeof childValue === "object") {
                            mergeValues(parentValue, childValue);
                        } else {
                            if (property.mergeFunction != null) {
                                child[property.name] = property.mergeFunction(parentValue, childValue);
                            } else {
                                child[property.name] = parentValue + childValue;
                            }
                        }
                    }
                } else {
                    child[property.name] = parent[property.name];
                }
            }
        }
    }, mapItem = function(obj, node) {
        var item = obj, i, len, v, len2, array, childItem, childNode, property;
        if (item.children === null || item.children.length === 0) {
            return;
        }
        for (i = 0, len = item.children.length; i < len; i += 1) {
            childItem = item.children[i];
            if (node.hasOwnProperty(childItem.name)) {
                if (childItem.isArray) {
                    array = node[childItem.name + "_asArray"];
                    for (v = 0, len2 = array.length; v < len2; v += 1) {
                        childNode = array[v];
                        mapProperties(item.properties, node, childNode);
                        mapItem(childItem, childNode);
                    }
                } else {
                    childNode = node[childItem.name];
                    mapProperties(item.properties, node, childNode);
                    mapItem(childItem, childNode);
                }
            }
        }
    }, performMapping = function(source) {
        var i, len, pi, pp, item, node, array;
        if (source === null) {
            return source;
        }
        if (typeof source !== "object") {
            return source;
        }
        for (i = 0, len = lookup.length; i < len; i += 1) {
            if (lookup[i] === "root") {
                item = map[i];
                node = source;
                mapItem(item, node);
            }
        }
        for (pp in source) {
            if (source.hasOwnProperty(pp)) {
                pi = lookup.indexOf(pp);
                if (pi !== -1) {
                    item = map[pi];
                    if (item.isArray) {
                        array = source[pp + "_asArray"];
                        for (i = 0, len = array.length; i < len; i += 1) {
                            node = array[i];
                            mapItem(item, node);
                        }
                    } else {
                        node = source[pp];
                        mapItem(item, node);
                    }
                }
                performMapping(source[pp]);
            }
        }
        return source;
    };
    return {
        run: performMapping
    };
}

(function(scope) {
    "use strict";
    var dijon = {
        VERSION: "0.5.3"
    };
    dijon.System = function() {
        this._mappings = {};
        this._outlets = {};
        this._handlers = {};
        this.strictInjections = true;
        this.autoMapOutlets = false;
        this.postInjectionHook = "setup";
    };
    dijon.System.prototype = {
        _createAndSetupInstance: function(key, Clazz) {
            var instance = new Clazz();
            this.injectInto(instance, key);
            return instance;
        },
        _retrieveFromCacheOrCreate: function(key, overrideRules) {
            if (typeof overrideRules === "undefined") {
                overrideRules = false;
            }
            var output;
            if (this._mappings.hasOwnProperty(key)) {
                var config = this._mappings[key];
                if (!overrideRules && config.isSingleton) {
                    if (config.object == null) {
                        config.object = this._createAndSetupInstance(key, config.clazz);
                    }
                    output = config.object;
                } else {
                    if (config.clazz) {
                        output = this._createAndSetupInstance(key, config.clazz);
                    } else {
                        output = config.object;
                    }
                }
            } else {
                throw new Error(1e3);
            }
            return output;
        },
        mapOutlet: function(sourceKey, targetKey, outletName) {
            if (typeof sourceKey === "undefined") {
                throw new Error(1010);
            }
            targetKey = targetKey || "global";
            outletName = outletName || sourceKey;
            if (!this._outlets.hasOwnProperty(targetKey)) {
                this._outlets[targetKey] = {};
            }
            this._outlets[targetKey][outletName] = sourceKey;
            return this;
        },
        getObject: function(key) {
            if (typeof key === "undefined") {
                throw new Error(1020);
            }
            return this._retrieveFromCacheOrCreate(key);
        },
        mapValue: function(key, useValue) {
            if (typeof key === "undefined") {
                throw new Error(1030);
            }
            this._mappings[key] = {
                clazz: null,
                object: useValue,
                isSingleton: true
            };
            if (this.autoMapOutlets) {
                this.mapOutlet(key);
            }
            if (this.hasMapping(key)) {
                this.injectInto(useValue, key);
            }
            return this;
        },
        hasMapping: function(key) {
            if (typeof key === "undefined") {
                throw new Error(1040);
            }
            return this._mappings.hasOwnProperty(key);
        },
        mapClass: function(key, clazz) {
            if (typeof key === "undefined") {
                throw new Error(1050);
            }
            if (typeof clazz === "undefined") {
                throw new Error(1051);
            }
            this._mappings[key] = {
                clazz: clazz,
                object: null,
                isSingleton: false
            };
            if (this.autoMapOutlets) {
                this.mapOutlet(key);
            }
            return this;
        },
        mapSingleton: function(key, clazz) {
            if (typeof key === "undefined") {
                throw new Error(1060);
            }
            if (typeof clazz === "undefined") {
                throw new Error(1061);
            }
            this._mappings[key] = {
                clazz: clazz,
                object: null,
                isSingleton: true
            };
            if (this.autoMapOutlets) {
                this.mapOutlet(key);
            }
            return this;
        },
        instantiate: function(key) {
            if (typeof key === "undefined") {
                throw new Error(1070);
            }
            return this._retrieveFromCacheOrCreate(key, true);
        },
        injectInto: function(instance, key) {
            if (typeof instance === "undefined") {
                throw new Error(1080);
            }
            if (typeof instance === "object") {
                var o = [];
                if (this._outlets.hasOwnProperty("global")) {
                    o.push(this._outlets["global"]);
                }
                if (typeof key !== "undefined" && this._outlets.hasOwnProperty(key)) {
                    o.push(this._outlets[key]);
                }
                for (var i in o) {
                    var l = o[i];
                    for (var outlet in l) {
                        var source = l[outlet];
                        if (!this.strictInjections || outlet in instance) {
                            instance[outlet] = this.getObject(source);
                        }
                    }
                }
                if ("setup" in instance) {
                    instance.setup.call(instance);
                }
            }
            return this;
        },
        unmap: function(key) {
            if (typeof key === "undefined") {
                throw new Error(1090);
            }
            delete this._mappings[key];
            return this;
        },
        unmapOutlet: function(target, outlet) {
            if (typeof target === "undefined") {
                throw new Error(1100);
            }
            if (typeof outlet === "undefined") {
                throw new Error(1101);
            }
            delete this._outlets[target][outlet];
            return this;
        },
        mapHandler: function(eventName, key, handler, oneShot, passEvent) {
            if (typeof eventName === "undefined") {
                throw new Error(1110);
            }
            key = key || "global";
            handler = handler || eventName;
            if (typeof oneShot === "undefined") {
                oneShot = false;
            }
            if (typeof passEvent === "undefined") {
                passEvent = false;
            }
            if (!this._handlers.hasOwnProperty(eventName)) {
                this._handlers[eventName] = {};
            }
            if (!this._handlers[eventName].hasOwnProperty(key)) {
                this._handlers[eventName][key] = [];
            }
            this._handlers[eventName][key].push({
                handler: handler,
                oneShot: oneShot,
                passEvent: passEvent
            });
            return this;
        },
        unmapHandler: function(eventName, key, handler) {
            if (typeof eventName === "undefined") {
                throw new Error(1120);
            }
            key = key || "global";
            handler = handler || eventName;
            if (this._handlers.hasOwnProperty(eventName) && this._handlers[eventName].hasOwnProperty(key)) {
                var handlers = this._handlers[eventName][key];
                for (var i in handlers) {
                    var config = handlers[i];
                    if (config.handler === handler) {
                        handlers.splice(i, 1);
                        break;
                    }
                }
            }
            return this;
        },
        notify: function(eventName) {
            if (typeof eventName === "undefined") {
                throw new Error(1130);
            }
            var argsWithEvent = Array.prototype.slice.call(arguments);
            var argsClean = argsWithEvent.slice(1);
            if (this._handlers.hasOwnProperty(eventName)) {
                var handlers = this._handlers[eventName];
                for (var key in handlers) {
                    var configs = handlers[key];
                    var instance;
                    if (key !== "global") {
                        instance = this.getObject(key);
                    }
                    var toBeDeleted = [];
                    var i, n;
                    for (i = 0, n = configs.length; i < n; i++) {
                        var handler;
                        var config = configs[i];
                        if (instance && typeof config.handler === "string") {
                            handler = instance[config.handler];
                        } else {
                            handler = config.handler;
                        }
                        if (config.oneShot) {
                            toBeDeleted.unshift(i);
                        }
                        if (config.passEvent) {
                            handler.apply(instance, argsWithEvent);
                        } else {
                            handler.apply(instance, argsClean);
                        }
                    }
                    for (i = 0, n = toBeDeleted.length; i < n; i++) {
                        configs.splice(toBeDeleted[i], 1);
                    }
                }
            }
            return this;
        }
    };
    scope.dijon = dijon;
})(this);

if (typeof utils == "undefined") {
    var utils = {};
}

if (typeof utils.Math == "undefined") {
    utils.Math = {};
}

utils.Math.to64BitNumber = function(low, high) {
    var highNum, lowNum, expected;
    highNum = new goog.math.Long(0, high);
    lowNum = new goog.math.Long(low, 0);
    expected = highNum.add(lowNum);
    return expected.toNumber();
};

goog = {};

goog.math = {};

goog.math.Long = function(low, high) {
    this.low_ = low | 0;
    this.high_ = high | 0;
};

goog.math.Long.IntCache_ = {};

goog.math.Long.fromInt = function(value) {
    if (-128 <= value && value < 128) {
        var cachedObj = goog.math.Long.IntCache_[value];
        if (cachedObj) {
            return cachedObj;
        }
    }
    var obj = new goog.math.Long(value | 0, value < 0 ? -1 : 0);
    if (-128 <= value && value < 128) {
        goog.math.Long.IntCache_[value] = obj;
    }
    return obj;
};

goog.math.Long.fromNumber = function(value) {
    if (isNaN(value) || !isFinite(value)) {
        return goog.math.Long.ZERO;
    } else if (value <= -goog.math.Long.TWO_PWR_63_DBL_) {
        return goog.math.Long.MIN_VALUE;
    } else if (value + 1 >= goog.math.Long.TWO_PWR_63_DBL_) {
        return goog.math.Long.MAX_VALUE;
    } else if (value < 0) {
        return goog.math.Long.fromNumber(-value).negate();
    } else {
        return new goog.math.Long(value % goog.math.Long.TWO_PWR_32_DBL_ | 0, value / goog.math.Long.TWO_PWR_32_DBL_ | 0);
    }
};

goog.math.Long.fromBits = function(lowBits, highBits) {
    return new goog.math.Long(lowBits, highBits);
};

goog.math.Long.fromString = function(str, opt_radix) {
    if (str.length == 0) {
        throw Error("number format error: empty string");
    }
    var radix = opt_radix || 10;
    if (radix < 2 || 36 < radix) {
        throw Error("radix out of range: " + radix);
    }
    if (str.charAt(0) == "-") {
        return goog.math.Long.fromString(str.substring(1), radix).negate();
    } else if (str.indexOf("-") >= 0) {
        throw Error('number format error: interior "-" character: ' + str);
    }
    var radixToPower = goog.math.Long.fromNumber(Math.pow(radix, 8));
    var result = goog.math.Long.ZERO;
    for (var i = 0; i < str.length; i += 8) {
        var size = Math.min(8, str.length - i);
        var value = parseInt(str.substring(i, i + size), radix);
        if (size < 8) {
            var power = goog.math.Long.fromNumber(Math.pow(radix, size));
            result = result.multiply(power).add(goog.math.Long.fromNumber(value));
        } else {
            result = result.multiply(radixToPower);
            result = result.add(goog.math.Long.fromNumber(value));
        }
    }
    return result;
};

goog.math.Long.TWO_PWR_16_DBL_ = 1 << 16;

goog.math.Long.TWO_PWR_24_DBL_ = 1 << 24;

goog.math.Long.TWO_PWR_32_DBL_ = goog.math.Long.TWO_PWR_16_DBL_ * goog.math.Long.TWO_PWR_16_DBL_;

goog.math.Long.TWO_PWR_31_DBL_ = goog.math.Long.TWO_PWR_32_DBL_ / 2;

goog.math.Long.TWO_PWR_48_DBL_ = goog.math.Long.TWO_PWR_32_DBL_ * goog.math.Long.TWO_PWR_16_DBL_;

goog.math.Long.TWO_PWR_64_DBL_ = goog.math.Long.TWO_PWR_32_DBL_ * goog.math.Long.TWO_PWR_32_DBL_;

goog.math.Long.TWO_PWR_63_DBL_ = goog.math.Long.TWO_PWR_64_DBL_ / 2;

goog.math.Long.ZERO = goog.math.Long.fromInt(0);

goog.math.Long.ONE = goog.math.Long.fromInt(1);

goog.math.Long.NEG_ONE = goog.math.Long.fromInt(-1);

goog.math.Long.MAX_VALUE = goog.math.Long.fromBits(4294967295 | 0, 2147483647 | 0);

goog.math.Long.MIN_VALUE = goog.math.Long.fromBits(0, 2147483648 | 0);

goog.math.Long.TWO_PWR_24_ = goog.math.Long.fromInt(1 << 24);

goog.math.Long.prototype.toInt = function() {
    return this.low_;
};

goog.math.Long.prototype.toNumber = function() {
    return this.high_ * goog.math.Long.TWO_PWR_32_DBL_ + this.getLowBitsUnsigned();
};

goog.math.Long.prototype.toString = function(opt_radix) {
    var radix = opt_radix || 10;
    if (radix < 2 || 36 < radix) {
        throw Error("radix out of range: " + radix);
    }
    if (this.isZero()) {
        return "0";
    }
    if (this.isNegative()) {
        if (this.equals(goog.math.Long.MIN_VALUE)) {
            var radixLong = goog.math.Long.fromNumber(radix);
            var div = this.div(radixLong);
            var rem = div.multiply(radixLong).subtract(this);
            return div.toString(radix) + rem.toInt().toString(radix);
        } else {
            return "-" + this.negate().toString(radix);
        }
    }
    var radixToPower = goog.math.Long.fromNumber(Math.pow(radix, 6));
    var rem = this;
    var result = "";
    while (true) {
        var remDiv = rem.div(radixToPower);
        var intval = rem.subtract(remDiv.multiply(radixToPower)).toInt();
        var digits = intval.toString(radix);
        rem = remDiv;
        if (rem.isZero()) {
            return digits + result;
        } else {
            while (digits.length < 6) {
                digits = "0" + digits;
            }
            result = "" + digits + result;
        }
    }
};

goog.math.Long.prototype.getHighBits = function() {
    return this.high_;
};

goog.math.Long.prototype.getLowBits = function() {
    return this.low_;
};

goog.math.Long.prototype.getLowBitsUnsigned = function() {
    return this.low_ >= 0 ? this.low_ : goog.math.Long.TWO_PWR_32_DBL_ + this.low_;
};

goog.math.Long.prototype.getNumBitsAbs = function() {
    if (this.isNegative()) {
        if (this.equals(goog.math.Long.MIN_VALUE)) {
            return 64;
        } else {
            return this.negate().getNumBitsAbs();
        }
    } else {
        var val = this.high_ != 0 ? this.high_ : this.low_;
        for (var bit = 31; bit > 0; bit--) {
            if ((val & 1 << bit) != 0) {
                break;
            }
        }
        return this.high_ != 0 ? bit + 33 : bit + 1;
    }
};

goog.math.Long.prototype.isZero = function() {
    return this.high_ == 0 && this.low_ == 0;
};

goog.math.Long.prototype.isNegative = function() {
    return this.high_ < 0;
};

goog.math.Long.prototype.isOdd = function() {
    return (this.low_ & 1) == 1;
};

goog.math.Long.prototype.equals = function(other) {
    return this.high_ == other.high_ && this.low_ == other.low_;
};

goog.math.Long.prototype.notEquals = function(other) {
    return this.high_ != other.high_ || this.low_ != other.low_;
};

goog.math.Long.prototype.lessThan = function(other) {
    return this.compare(other) < 0;
};

goog.math.Long.prototype.lessThanOrEqual = function(other) {
    return this.compare(other) <= 0;
};

goog.math.Long.prototype.greaterThan = function(other) {
    return this.compare(other) > 0;
};

goog.math.Long.prototype.greaterThanOrEqual = function(other) {
    return this.compare(other) >= 0;
};

goog.math.Long.prototype.compare = function(other) {
    if (this.equals(other)) {
        return 0;
    }
    var thisNeg = this.isNegative();
    var otherNeg = other.isNegative();
    if (thisNeg && !otherNeg) {
        return -1;
    }
    if (!thisNeg && otherNeg) {
        return 1;
    }
    if (this.subtract(other).isNegative()) {
        return -1;
    } else {
        return 1;
    }
};

goog.math.Long.prototype.negate = function() {
    if (this.equals(goog.math.Long.MIN_VALUE)) {
        return goog.math.Long.MIN_VALUE;
    } else {
        return this.not().add(goog.math.Long.ONE);
    }
};

goog.math.Long.prototype.add = function(other) {
    var a48 = this.high_ >>> 16;
    var a32 = this.high_ & 65535;
    var a16 = this.low_ >>> 16;
    var a00 = this.low_ & 65535;
    var b48 = other.high_ >>> 16;
    var b32 = other.high_ & 65535;
    var b16 = other.low_ >>> 16;
    var b00 = other.low_ & 65535;
    var c48 = 0, c32 = 0, c16 = 0, c00 = 0;
    c00 += a00 + b00;
    c16 += c00 >>> 16;
    c00 &= 65535;
    c16 += a16 + b16;
    c32 += c16 >>> 16;
    c16 &= 65535;
    c32 += a32 + b32;
    c48 += c32 >>> 16;
    c32 &= 65535;
    c48 += a48 + b48;
    c48 &= 65535;
    return goog.math.Long.fromBits(c16 << 16 | c00, c48 << 16 | c32);
};

goog.math.Long.prototype.subtract = function(other) {
    return this.add(other.negate());
};

goog.math.Long.prototype.multiply = function(other) {
    if (this.isZero()) {
        return goog.math.Long.ZERO;
    } else if (other.isZero()) {
        return goog.math.Long.ZERO;
    }
    if (this.equals(goog.math.Long.MIN_VALUE)) {
        return other.isOdd() ? goog.math.Long.MIN_VALUE : goog.math.Long.ZERO;
    } else if (other.equals(goog.math.Long.MIN_VALUE)) {
        return this.isOdd() ? goog.math.Long.MIN_VALUE : goog.math.Long.ZERO;
    }
    if (this.isNegative()) {
        if (other.isNegative()) {
            return this.negate().multiply(other.negate());
        } else {
            return this.negate().multiply(other).negate();
        }
    } else if (other.isNegative()) {
        return this.multiply(other.negate()).negate();
    }
    if (this.lessThan(goog.math.Long.TWO_PWR_24_) && other.lessThan(goog.math.Long.TWO_PWR_24_)) {
        return goog.math.Long.fromNumber(this.toNumber() * other.toNumber());
    }
    var a48 = this.high_ >>> 16;
    var a32 = this.high_ & 65535;
    var a16 = this.low_ >>> 16;
    var a00 = this.low_ & 65535;
    var b48 = other.high_ >>> 16;
    var b32 = other.high_ & 65535;
    var b16 = other.low_ >>> 16;
    var b00 = other.low_ & 65535;
    var c48 = 0, c32 = 0, c16 = 0, c00 = 0;
    c00 += a00 * b00;
    c16 += c00 >>> 16;
    c00 &= 65535;
    c16 += a16 * b00;
    c32 += c16 >>> 16;
    c16 &= 65535;
    c16 += a00 * b16;
    c32 += c16 >>> 16;
    c16 &= 65535;
    c32 += a32 * b00;
    c48 += c32 >>> 16;
    c32 &= 65535;
    c32 += a16 * b16;
    c48 += c32 >>> 16;
    c32 &= 65535;
    c32 += a00 * b32;
    c48 += c32 >>> 16;
    c32 &= 65535;
    c48 += a48 * b00 + a32 * b16 + a16 * b32 + a00 * b48;
    c48 &= 65535;
    return goog.math.Long.fromBits(c16 << 16 | c00, c48 << 16 | c32);
};

goog.math.Long.prototype.div = function(other) {
    if (other.isZero()) {
        throw Error("division by zero");
    } else if (this.isZero()) {
        return goog.math.Long.ZERO;
    }
    if (this.equals(goog.math.Long.MIN_VALUE)) {
        if (other.equals(goog.math.Long.ONE) || other.equals(goog.math.Long.NEG_ONE)) {
            return goog.math.Long.MIN_VALUE;
        } else if (other.equals(goog.math.Long.MIN_VALUE)) {
            return goog.math.Long.ONE;
        } else {
            var halfThis = this.shiftRight(1);
            var approx = halfThis.div(other).shiftLeft(1);
            if (approx.equals(goog.math.Long.ZERO)) {
                return other.isNegative() ? goog.math.Long.ONE : goog.math.Long.NEG_ONE;
            } else {
                var rem = this.subtract(other.multiply(approx));
                var result = approx.add(rem.div(other));
                return result;
            }
        }
    } else if (other.equals(goog.math.Long.MIN_VALUE)) {
        return goog.math.Long.ZERO;
    }
    if (this.isNegative()) {
        if (other.isNegative()) {
            return this.negate().div(other.negate());
        } else {
            return this.negate().div(other).negate();
        }
    } else if (other.isNegative()) {
        return this.div(other.negate()).negate();
    }
    var res = goog.math.Long.ZERO;
    var rem = this;
    while (rem.greaterThanOrEqual(other)) {
        var approx = Math.max(1, Math.floor(rem.toNumber() / other.toNumber()));
        var log2 = Math.ceil(Math.log(approx) / Math.LN2);
        var delta = log2 <= 48 ? 1 : Math.pow(2, log2 - 48);
        var approxRes = goog.math.Long.fromNumber(approx);
        var approxRem = approxRes.multiply(other);
        while (approxRem.isNegative() || approxRem.greaterThan(rem)) {
            approx -= delta;
            approxRes = goog.math.Long.fromNumber(approx);
            approxRem = approxRes.multiply(other);
        }
        if (approxRes.isZero()) {
            approxRes = goog.math.Long.ONE;
        }
        res = res.add(approxRes);
        rem = rem.subtract(approxRem);
    }
    return res;
};

goog.math.Long.prototype.modulo = function(other) {
    return this.subtract(this.div(other).multiply(other));
};

goog.math.Long.prototype.not = function() {
    return goog.math.Long.fromBits(~this.low_, ~this.high_);
};

goog.math.Long.prototype.and = function(other) {
    return goog.math.Long.fromBits(this.low_ & other.low_, this.high_ & other.high_);
};

goog.math.Long.prototype.or = function(other) {
    return goog.math.Long.fromBits(this.low_ | other.low_, this.high_ | other.high_);
};

goog.math.Long.prototype.xor = function(other) {
    return goog.math.Long.fromBits(this.low_ ^ other.low_, this.high_ ^ other.high_);
};

goog.math.Long.prototype.shiftLeft = function(numBits) {
    numBits &= 63;
    if (numBits == 0) {
        return this;
    } else {
        var low = this.low_;
        if (numBits < 32) {
            var high = this.high_;
            return goog.math.Long.fromBits(low << numBits, high << numBits | low >>> 32 - numBits);
        } else {
            return goog.math.Long.fromBits(0, low << numBits - 32);
        }
    }
};

goog.math.Long.prototype.shiftRight = function(numBits) {
    numBits &= 63;
    if (numBits == 0) {
        return this;
    } else {
        var high = this.high_;
        if (numBits < 32) {
            var low = this.low_;
            return goog.math.Long.fromBits(low >>> numBits | high << 32 - numBits, high >> numBits);
        } else {
            return goog.math.Long.fromBits(high >> numBits - 32, high >= 0 ? 0 : -1);
        }
    }
};

goog.math.Long.prototype.shiftRightUnsigned = function(numBits) {
    numBits &= 63;
    if (numBits == 0) {
        return this;
    } else {
        var high = this.high_;
        if (numBits < 32) {
            var low = this.low_;
            return goog.math.Long.fromBits(low >>> numBits | high << 32 - numBits, high >>> numBits);
        } else if (numBits == 32) {
            return goog.math.Long.fromBits(high, 0);
        } else {
            return goog.math.Long.fromBits(high >>> numBits - 32, 0);
        }
    }
};

var UTF8 = {};

UTF8.encode = function(s) {
    var u = [];
    for (var i = 0; i < s.length; ++i) {
        var c = s.charCodeAt(i);
        if (c < 128) {
            u.push(c);
        } else if (c < 2048) {
            u.push(192 | c >> 6);
            u.push(128 | 63 & c);
        } else if (c < 65536) {
            u.push(224 | c >> 12);
            u.push(128 | 63 & c >> 6);
            u.push(128 | 63 & c);
        } else {
            u.push(240 | c >> 18);
            u.push(128 | 63 & c >> 12);
            u.push(128 | 63 & c >> 6);
            u.push(128 | 63 & c);
        }
    }
    return u;
};

UTF8.decode = function(u) {
    var a = [];
    var i = 0;
    while (i < u.length) {
        var v = u[i++];
        if (v < 128) {} else if (v < 224) {
            v = (31 & v) << 6;
            v |= 63 & u[i++];
        } else if (v < 240) {
            v = (15 & v) << 12;
            v |= (63 & u[i++]) << 6;
            v |= 63 & u[i++];
        } else {
            v = (7 & v) << 18;
            v |= (63 & u[i++]) << 12;
            v |= (63 & u[i++]) << 6;
            v |= 63 & u[i++];
        }
        a.push(String.fromCharCode(v));
    }
    return a.join("");
};

var BASE64 = {};

(function(T) {
    var encodeArray = function(u) {
        var i = 0;
        var a = [];
        var n = 0 | u.length / 3;
        while (0 < n--) {
            var v = (u[i] << 16) + (u[i + 1] << 8) + u[i + 2];
            i += 3;
            a.push(T.charAt(63 & v >> 18));
            a.push(T.charAt(63 & v >> 12));
            a.push(T.charAt(63 & v >> 6));
            a.push(T.charAt(63 & v));
        }
        if (2 == u.length - i) {
            var v = (u[i] << 16) + (u[i + 1] << 8);
            a.push(T.charAt(63 & v >> 18));
            a.push(T.charAt(63 & v >> 12));
            a.push(T.charAt(63 & v >> 6));
            a.push("=");
        } else if (1 == u.length - i) {
            var v = u[i] << 16;
            a.push(T.charAt(63 & v >> 18));
            a.push(T.charAt(63 & v >> 12));
            a.push("==");
        }
        return a.join("");
    };
    var R = function() {
        var a = [];
        for (var i = 0; i < T.length; ++i) {
            a[T.charCodeAt(i)] = i;
        }
        a["=".charCodeAt(0)] = 0;
        return a;
    }();
    var decodeArray = function(s) {
        var i = 0;
        var u = [];
        var n = 0 | s.length / 4;
        while (0 < n--) {
            var v = (R[s.charCodeAt(i)] << 18) + (R[s.charCodeAt(i + 1)] << 12) + (R[s.charCodeAt(i + 2)] << 6) + R[s.charCodeAt(i + 3)];
            u.push(255 & v >> 16);
            u.push(255 & v >> 8);
            u.push(255 & v);
            i += 4;
        }
        if (u) {
            if ("=" == s.charAt(i - 2)) {
                u.pop();
                u.pop();
            } else if ("=" == s.charAt(i - 1)) {
                u.pop();
            }
        }
        return u;
    };
    var ASCII = {};
    ASCII.encode = function(s) {
        var u = [];
        for (var i = 0; i < s.length; ++i) {
            u.push(s.charCodeAt(i));
        }
        return u;
    };
    ASCII.decode = function(u) {
        for (var i = 0; i < s.length; ++i) {
            a[i] = String.fromCharCode(a[i]);
        }
        return a.join("");
    };
    BASE64.decodeArray = function(s) {
        var u = decodeArray(s);
        return new Uint8Array(u);
    };
    BASE64.encodeASCII = function(s) {
        var u = ASCII.encode(s);
        return encodeArray(u);
    };
    BASE64.decodeASCII = function(s) {
        var a = decodeArray(s);
        return ASCII.decode(a);
    };
    BASE64.encode = function(s) {
        var u = UTF8.encode(s);
        return encodeArray(u);
    };
    BASE64.decode = function(s) {
        var u = decodeArray(s);
        return UTF8.decode(u);
    };
})("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/");

if (undefined === btoa) {
    var btoa = BASE64.encode;
}

if (undefined === atob) {
    var atob = BASE64.decode;
}

MediaPlayer = function(aContext) {
    "use strict";
    var VERSION = "1.2.0", context = aContext, system, element, source, streamController, videoModel, initialized = false, playing = false, autoPlay = true, scheduleWhilePaused = false, bufferMax = MediaPlayer.dependencies.BufferExtensions.BUFFER_SIZE_REQUIRED, isReady = function() {
        return !!element && !!source;
    }, play = function() {
        if (!initialized) {
            throw "MediaPlayer not initialized!";
        }
        if (!this.capabilities.supportsMediaSource()) {
            this.errHandler.capabilityError("mediasource");
            return;
        }
        if (!element || !source) {
            throw "Missing view or source.";
        }
        playing = true;
        streamController = system.getObject("streamController");
        streamController.setVideoModel(videoModel);
        streamController.setAutoPlay(autoPlay);
        streamController.load(source);
        system.mapValue("scheduleWhilePaused", scheduleWhilePaused);
        system.mapOutlet("scheduleWhilePaused", "stream");
        system.mapOutlet("scheduleWhilePaused", "bufferController");
        system.mapValue("bufferMax", bufferMax);
        system.injectInto(this.bufferExt, "bufferMax");
    }, doAutoPlay = function() {
        if (isReady()) {
            play.call(this);
        }
    }, getDVRInfoMetric = function() {
        var metric = this.metricsModel.getReadOnlyMetricsFor("video") || this.metricsModel.getReadOnlyMetricsFor("audio");
        return this.metricsExt.getCurrentDVRInfo(metric);
    }, getDVRWindowSize = function() {
        return getDVRInfoMetric.call(this).mpd.timeShiftBufferDepth;
    }, getDVRSeekOffset = function(value) {
        var metric = getDVRInfoMetric.call(this), val = metric.range.start + parseInt(value);
        if (val > metric.range.end) {
            val = metric.range.end;
        }
        return val;
    }, seek = function(value) {
        videoModel.getElement().currentTime = this.getDVRSeekOffset(value);
    }, time = function() {
        var metric = getDVRInfoMetric.call(this);
        return metric === null ? 0 : Math.round(this.duration() - (metric.range.end - metric.time));
    }, duration = function() {
        var metric = getDVRInfoMetric.call(this), range;
        if (metric === null) {
            return 0;
        }
        range = metric.range.end - metric.range.start;
        return Math.round(range < metric.mpd.timeShiftBufferDepth ? range : metric.mpd.timeShiftBufferDepth);
    }, timeAsUTC = function() {
        var metric = getDVRInfoMetric.call(this), availabilityStartTime, currentUTCTime;
        if (metric === null) {
            return 0;
        }
        availabilityStartTime = metric.mpd.availabilityStartTime.getTime() / 1e3;
        currentUTCTime = this.time() + (availabilityStartTime + metric.range.start);
        return Math.round(currentUTCTime);
    }, durationAsUTC = function() {
        var metric = getDVRInfoMetric.call(this), availabilityStartTime, currentUTCDuration;
        if (metric === null) {
            return 0;
        }
        availabilityStartTime = metric.mpd.availabilityStartTime.getTime() / 1e3;
        currentUTCDuration = availabilityStartTime + metric.range.start + this.duration();
        return Math.round(currentUTCDuration);
    }, formatUTC = function(time, locales, hour12) {
        var dt = new Date(time * 1e3);
        var d = dt.toLocaleDateString(locales);
        var t = dt.toLocaleTimeString(locales, {
            hour12: hour12
        });
        return t + " " + d;
    }, convertToTimeCode = function(value) {
        value = Math.max(value, 0);
        var h = Math.floor(value / 3600);
        var m = Math.floor(value % 3600 / 60);
        var s = Math.floor(value % 3600 % 60);
        return (h === 0 ? "" : h < 10 ? "0" + h.toString() + ":" : h.toString() + ":") + (m < 10 ? "0" + m.toString() : m.toString()) + ":" + (s < 10 ? "0" + s.toString() : s.toString());
    };
    system = new dijon.System();
    system.mapValue("system", system);
    system.mapOutlet("system");
    system.injectInto(context);
    return {
        debug: undefined,
        eventBus: undefined,
        capabilities: undefined,
        abrController: undefined,
        metricsModel: undefined,
        metricsExt: undefined,
        bufferExt: undefined,
        errHandler: undefined,
        tokenAuthentication: undefined,
        uriQueryFragModel: undefined,
        addEventListener: function(type, listener, useCapture) {
            this.eventBus.addEventListener(type, listener, useCapture);
        },
        removeEventListener: function(type, listener, useCapture) {
            this.eventBus.removeEventListener(type, listener, useCapture);
        },
        getVersion: function() {
            return VERSION;
        },
        startup: function() {
            if (!initialized) {
                system.injectInto(this);
                initialized = true;
            }
        },
        getDebug: function() {
            return this.debug;
        },
        getVideoModel: function() {
            return videoModel;
        },
        setAutoPlay: function(value) {
            autoPlay = value;
        },
        getAutoPlay: function() {
            return autoPlay;
        },
        setScheduleWhilePaused: function(value) {
            scheduleWhilePaused = value;
        },
        getScheduleWhilePaused: function() {
            return scheduleWhilePaused;
        },
        setTokenAuthentication: function(name, type) {
            this.tokenAuthentication.setTokenAuthentication({
                name: name,
                type: type
            });
        },
        setBufferMax: function(value) {
            bufferMax = value;
        },
        getBufferMax: function() {
            return bufferMax;
        },
        getMetricsExt: function() {
            return this.metricsExt;
        },
        getMetricsFor: function(type) {
            var metrics = this.metricsModel.getReadOnlyMetricsFor(type);
            return metrics;
        },
        getQualityFor: function(type) {
            return this.abrController.getQualityFor(type);
        },
        setQualityFor: function(type, value) {
            this.abrController.setPlaybackQuality(type, value);
        },
        getAutoSwitchQuality: function() {
            return this.abrController.getAutoSwitchBitrate();
        },
        setAutoSwitchQuality: function(value) {
            this.abrController.setAutoSwitchBitrate(value);
        },
        attachView: function(view) {
            if (!initialized) {
                throw "MediaPlayer not initialized!";
            }
            element = view;
            videoModel = null;
            if (element) {
                videoModel = system.getObject("videoModel");
                videoModel.setElement(element);
            }
            if (playing && streamController) {
                streamController.reset();
                streamController = null;
                playing = false;
            }
            if (isReady.call(this)) {
                doAutoPlay.call(this);
            }
        },
        attachSource: function(url) {
            if (!initialized) {
                throw "MediaPlayer not initialized!";
            }
            this.uriQueryFragModel.reset();
            source = this.uriQueryFragModel.parseURI(url);
            this.setQualityFor("video", 0);
            this.setQualityFor("audio", 0);
            if (playing && streamController) {
                streamController.reset();
                streamController = null;
                playing = false;
            }
            if (isReady.call(this)) {
                doAutoPlay.call(this);
            }
        },
        reset: function() {
            this.attachSource(null);
            this.attachView(null);
        },
        play: play,
        isReady: isReady,
        seek: seek,
        time: time,
        duration: duration,
        timeAsUTC: timeAsUTC,
        durationAsUTC: durationAsUTC,
        getDVRWindowSize: getDVRWindowSize,
        getDVRSeekOffset: getDVRSeekOffset,
        formatUTC: formatUTC,
        convertToTimeCode: convertToTimeCode
    };
};

MediaPlayer.prototype = {
    constructor: MediaPlayer
};

MediaPlayer.dependencies = {};

MediaPlayer.utils = {};

MediaPlayer.models = {};

MediaPlayer.vo = {};

MediaPlayer.vo.metrics = {};

MediaPlayer.rules = {};

MediaPlayer.di = {};

MediaPlayer.di.Context = function() {
    "use strict";
    return {
        system: undefined,
        setup: function() {
            this.system.autoMapOutlets = true;
            this.system.mapSingleton("debug", MediaPlayer.utils.Debug);
            this.system.mapSingleton("tokenAuthentication", MediaPlayer.utils.TokenAuthentication);
            this.system.mapSingleton("eventBus", MediaPlayer.utils.EventBus);
            this.system.mapSingleton("capabilities", MediaPlayer.utils.Capabilities);
            this.system.mapSingleton("textTrackExtensions", MediaPlayer.utils.TextTrackExtensions);
            this.system.mapSingleton("vttParser", MediaPlayer.utils.VTTParser);
            this.system.mapSingleton("ttmlParser", MediaPlayer.utils.TTMLParser);
            this.system.mapClass("videoModel", MediaPlayer.models.VideoModel);
            this.system.mapSingleton("manifestModel", MediaPlayer.models.ManifestModel);
            this.system.mapSingleton("metricsModel", MediaPlayer.models.MetricsModel);
            this.system.mapSingleton("uriQueryFragModel", MediaPlayer.models.URIQueryAndFragmentModel);
            this.system.mapClass("protectionModel", MediaPlayer.models.ProtectionModel);
            this.system.mapSingleton("textSourceBuffer", MediaPlayer.dependencies.TextSourceBuffer);
            this.system.mapSingleton("mediaSourceExt", MediaPlayer.dependencies.MediaSourceExtensions);
            this.system.mapSingleton("sourceBufferExt", MediaPlayer.dependencies.SourceBufferExtensions);
            this.system.mapSingleton("bufferExt", MediaPlayer.dependencies.BufferExtensions);
            this.system.mapSingleton("abrController", MediaPlayer.dependencies.AbrController);
            this.system.mapSingleton("errHandler", MediaPlayer.dependencies.ErrorHandler);
            this.system.mapSingleton("protectionExt", MediaPlayer.dependencies.ProtectionExtensions);
            this.system.mapSingleton("videoExt", MediaPlayer.dependencies.VideoModelExtensions);
            this.system.mapClass("protectionController", MediaPlayer.dependencies.ProtectionController);
            this.system.mapClass("metrics", MediaPlayer.models.MetricsList);
            this.system.mapClass("downloadRatioRule", MediaPlayer.rules.DownloadRatioRule);
            this.system.mapClass("insufficientBufferRule", MediaPlayer.rules.InsufficientBufferRule);
            this.system.mapClass("limitSwitchesRule", MediaPlayer.rules.LimitSwitchesRule);
            this.system.mapClass("abrRulesCollection", MediaPlayer.rules.BaseRulesCollection);
            this.system.mapClass("eventController", MediaPlayer.dependencies.EventController);
            this.system.mapClass("textController", MediaPlayer.dependencies.TextController);
            this.system.mapClass("bufferController", MediaPlayer.dependencies.BufferController);
            this.system.mapClass("manifestLoader", MediaPlayer.dependencies.ManifestLoader);
            this.system.mapSingleton("manifestUpdater", MediaPlayer.dependencies.ManifestUpdater);
            this.system.mapClass("fragmentController", MediaPlayer.dependencies.FragmentController);
            this.system.mapClass("fragmentLoader", MediaPlayer.dependencies.FragmentLoader);
            this.system.mapClass("fragmentModel", MediaPlayer.dependencies.FragmentModel);
            this.system.mapSingleton("streamController", MediaPlayer.dependencies.StreamController);
            this.system.mapClass("stream", MediaPlayer.dependencies.Stream);
            this.system.mapClass("requestScheduler", MediaPlayer.dependencies.RequestScheduler);
            this.system.mapSingleton("schedulerExt", MediaPlayer.dependencies.SchedulerExtensions);
            this.system.mapClass("schedulerModel", MediaPlayer.dependencies.SchedulerModel);
        }
    };
};

Dash = function() {
    "use strict";
    return {
        modules: {},
        dependencies: {},
        vo: {},
        di: {}
    };
}();

Dash.di.DashContext = function() {
    "use strict";
    return {
        system: undefined,
        setup: function() {
            Dash.di.DashContext.prototype.setup.call(this);
            this.system.mapClass("parser", Dash.dependencies.DashParser);
            this.system.mapClass("indexHandler", Dash.dependencies.DashHandler);
            this.system.mapClass("baseURLExt", Dash.dependencies.BaseURLExtensions);
            this.system.mapClass("fragmentExt", Dash.dependencies.FragmentExtensions);
            this.system.mapSingleton("manifestExt", Dash.dependencies.DashManifestExtensions);
            this.system.mapSingleton("metricsExt", Dash.dependencies.DashMetricsExtensions);
            this.system.mapSingleton("timelineConverter", Dash.dependencies.TimelineConverter);
        }
    };
};

Dash.di.DashContext.prototype = new MediaPlayer.di.Context();

Dash.di.DashContext.prototype.constructor = Dash.di.DashContext;

Dash.dependencies.BaseURLExtensions = function() {
    "use strict";
    var parseSIDX = function(ab, ab_first_byte_offset) {
        var d = new DataView(ab), sidx = {}, pos = 0, offset, time, sidxEnd, i, ref_type, ref_size, ref_dur, type, size, charCode;
        while (type !== "sidx" && pos < d.byteLength) {
            size = d.getUint32(pos);
            pos += 4;
            type = "";
            for (i = 0; i < 4; i += 1) {
                charCode = d.getInt8(pos);
                type += String.fromCharCode(charCode);
                pos += 1;
            }
            if (type !== "moof" && type !== "traf" && type !== "sidx") {
                pos += size - 8;
            } else if (type === "sidx") {
                pos -= 8;
            }
        }
        sidxEnd = d.getUint32(pos, false) + pos;
        if (sidxEnd > ab.byteLength) {
            throw "sidx terminates after array buffer";
        }
        sidx.version = d.getUint8(pos + 8);
        pos += 12;
        sidx.timescale = d.getUint32(pos + 4, false);
        pos += 8;
        if (sidx.version === 0) {
            sidx.earliest_presentation_time = d.getUint32(pos, false);
            sidx.first_offset = d.getUint32(pos + 4, false);
            pos += 8;
        } else {
            sidx.earliest_presentation_time = utils.Math.to64BitNumber(d.getUint32(pos + 4, false), d.getUint32(pos, false));
            sidx.first_offset = (d.getUint32(pos + 8, false) << 32) + d.getUint32(pos + 12, false);
            pos += 16;
        }
        sidx.first_offset += sidxEnd + (ab_first_byte_offset || 0);
        sidx.reference_count = d.getUint16(pos + 2, false);
        pos += 4;
        sidx.references = [];
        offset = sidx.first_offset;
        time = sidx.earliest_presentation_time;
        for (i = 0; i < sidx.reference_count; i += 1) {
            ref_size = d.getUint32(pos, false);
            ref_type = ref_size >>> 31;
            ref_size = ref_size & 2147483647;
            ref_dur = d.getUint32(pos + 4, false);
            pos += 12;
            sidx.references.push({
                size: ref_size,
                type: ref_type,
                offset: offset,
                duration: ref_dur,
                time: time,
                timescale: sidx.timescale
            });
            offset += ref_size;
            time += ref_dur;
        }
        if (pos !== sidxEnd) {
            throw "Error: final pos " + pos + " differs from SIDX end " + sidxEnd;
        }
        return sidx;
    }, parseSegments = function(data, media, offset) {
        var parsed, ref, segments, segment, i, len, start, end;
        parsed = parseSIDX.call(this, data, offset);
        ref = parsed.references;
        segments = [];
        for (i = 0, len = ref.length; i < len; i += 1) {
            segment = new Dash.vo.Segment();
            segment.duration = ref[i].duration;
            segment.media = media;
            segment.startTime = ref[i].time;
            segment.timescale = ref[i].timescale;
            start = ref[i].offset;
            end = ref[i].offset + ref[i].size - 1;
            segment.mediaRange = start + "-" + end;
            segments.push(segment);
        }
        this.debug.log("Parsed SIDX box: " + segments.length + " segments.");
        return Q.when(segments);
    }, findInit = function(data, info) {
        var deferred = Q.defer(), ftyp, moov, start, end, d = new DataView(data), pos = 0, type = "", size = 0, bytesAvailable, i, c, request, loaded = false, irange, self = this;
        self.debug.log("Searching for initialization.");
        while (type !== "moov" && pos < d.byteLength) {
            size = d.getUint32(pos);
            pos += 4;
            type = "";
            for (i = 0; i < 4; i += 1) {
                c = d.getInt8(pos);
                type += String.fromCharCode(c);
                pos += 1;
            }
            if (type === "ftyp") {
                ftyp = pos - 8;
            }
            if (type === "moov") {
                moov = pos - 8;
            }
            if (type !== "moov") {
                pos += size - 8;
            }
        }
        bytesAvailable = d.byteLength - pos;
        if (type !== "moov") {
            self.debug.log("Loading more bytes to find initialization.");
            info.range.start = 0;
            info.range.end = info.bytesLoaded + info.bytesToLoad;
            request = new XMLHttpRequest();
            request.onloadend = function() {
                if (!loaded) {
                    deferred.reject("Error loading initialization.");
                }
            };
            request.onload = function() {
                loaded = true;
                info.bytesLoaded = info.range.end;
                findInit.call(self, request.response).then(function(segments) {
                    deferred.resolve(segments);
                });
            };
            request.onerror = function() {
                deferred.reject("Error loading initialization.");
            };
            request.open("GET", self.tokenAuthentication.addTokenAsQueryArg(info.url));
            request.responseType = "arraybuffer";
            request.setRequestHeader("Range", "bytes=" + info.range.start + "-" + info.range.end);
            request = self.tokenAuthentication.setTokenInRequestHeader(request);
            request.send(null);
        } else {
            start = ftyp === undefined ? moov : ftyp;
            end = moov + size - 1;
            irange = start + "-" + end;
            self.debug.log("Found the initialization.  Range: " + irange);
            deferred.resolve(irange);
        }
        return deferred.promise;
    }, loadInit = function(media) {
        var deferred = Q.defer(), request = new XMLHttpRequest(), needFailureReport = true, self = this, info = {
            url: media,
            range: {},
            searching: false,
            bytesLoaded: 0,
            bytesToLoad: 1500,
            request: request
        };
        self.debug.log("Start searching for initialization.");
        info.range.start = 0;
        info.range.end = info.bytesToLoad;
        request.onload = function() {
            if (request.status < 200 || request.status > 299) {
                return;
            }
            needFailureReport = false;
            info.bytesLoaded = info.range.end;
            findInit.call(self, request.response, info).then(function(range) {
                deferred.resolve(range);
            });
        };
        request.onloadend = request.onerror = function() {
            if (!needFailureReport) {
                return;
            }
            needFailureReport = false;
            self.errHandler.downloadError("initialization", info.url, request);
            deferred.reject(request);
        };
        request.open("GET", self.tokenAuthentication.addTokenAsQueryArg(info.url));
        request.responseType = "arraybuffer";
        request.setRequestHeader("Range", "bytes=" + info.range.start + "-" + info.range.end);
        request = self.tokenAuthentication.setTokenInRequestHeader(request);
        request.send(null);
        self.debug.log("Perform init search: " + info.url);
        return deferred.promise;
    }, findSIDX = function(data, info) {
        var deferred = Q.defer(), d = new DataView(data), request = new XMLHttpRequest(), pos = 0, type = "", size = 0, bytesAvailable, sidxBytes, sidxSlice, sidxOut, i, c, needFailureReport = true, parsed, ref, loadMultiSidx = false, self = this;
        self.debug.log("Searching for SIDX box.");
        self.debug.log(info.bytesLoaded + " bytes loaded.");
        while (type !== "sidx" && pos < d.byteLength) {
            size = d.getUint32(pos);
            pos += 4;
            type = "";
            for (i = 0; i < 4; i += 1) {
                c = d.getInt8(pos);
                type += String.fromCharCode(c);
                pos += 1;
            }
            if (type !== "sidx") {
                pos += size - 8;
            }
        }
        bytesAvailable = d.byteLength - pos;
        if (type !== "sidx") {
            deferred.reject();
        } else if (bytesAvailable < size - 8) {
            self.debug.log("Found SIDX but we don't have all of it.");
            info.range.start = 0;
            info.range.end = info.bytesLoaded + (size - bytesAvailable);
            request.onload = function() {
                if (request.status < 200 || request.status > 299) {
                    return;
                }
                needFailureReport = false;
                info.bytesLoaded = info.range.end;
                findSIDX.call(self, request.response, info).then(function(segments) {
                    deferred.resolve(segments);
                });
            };
            request.onloadend = request.onerror = function() {
                if (!needFailureReport) {
                    return;
                }
                needFailureReport = false;
                self.errHandler.downloadError("SIDX", info.url, request);
                deferred.reject(request);
            };
            request.open("GET", self.tokenAuthentication.addTokenAsQueryArg(info.url));
            request.responseType = "arraybuffer";
            request.setRequestHeader("Range", "bytes=" + info.range.start + "-" + info.range.end);
            request = self.tokenAuthentication.setTokenInRequestHeader(request);
            request.send(null);
        } else {
            info.range.start = pos - 8;
            info.range.end = info.range.start + size;
            self.debug.log("Found the SIDX box.  Start: " + info.range.start + " | End: " + info.range.end);
            sidxBytes = new ArrayBuffer(info.range.end - info.range.start);
            sidxOut = new Uint8Array(sidxBytes);
            sidxSlice = new Uint8Array(data, info.range.start, info.range.end - info.range.start);
            sidxOut.set(sidxSlice);
            parsed = this.parseSIDX.call(this, sidxBytes, info.range.start);
            ref = parsed.references;
            if (ref !== null && ref !== undefined && ref.length > 0) {
                loadMultiSidx = ref[0].type === 1;
            }
            if (loadMultiSidx) {
                self.debug.log("Initiate multiple SIDX load.");
                var j, len, ss, se, r, funcs = [], segs;
                for (j = 0, len = ref.length; j < len; j += 1) {
                    ss = ref[j].offset;
                    se = ref[j].offset + ref[j].size - 1;
                    r = ss + "-" + se;
                    funcs.push(this.loadSegments.call(self, info.url, r));
                }
                Q.all(funcs).then(function(results) {
                    segs = [];
                    for (j = 0, len = results.length; j < len; j += 1) {
                        segs = segs.concat(results[j]);
                    }
                    deferred.resolve(segs);
                }, function(httprequest) {
                    deferred.reject(httprequest);
                });
            } else {
                self.debug.log("Parsing segments from SIDX.");
                parseSegments.call(self, sidxBytes, info.url, info.range.start).then(function(segments) {
                    deferred.resolve(segments);
                });
            }
        }
        return deferred.promise;
    }, loadSegments = function(media, theRange) {
        var deferred = Q.defer(), request = new XMLHttpRequest(), parts, needFailureReport = true, self = this, info = {
            url: media,
            range: {},
            searching: false,
            bytesLoaded: 0,
            bytesToLoad: 1500,
            request: request
        };
        if (theRange === null) {
            self.debug.log("No known range for SIDX request.");
            info.searching = true;
            info.range.start = 0;
            info.range.end = info.bytesToLoad;
        } else {
            parts = theRange.split("-");
            info.range.start = parseFloat(parts[0]);
            info.range.end = parseFloat(parts[1]);
        }
        request.onload = function() {
            if (request.status < 200 || request.status > 299) {
                return;
            }
            needFailureReport = false;
            if (info.searching) {
                info.bytesLoaded = info.range.end;
                findSIDX.call(self, request.response, info).then(function(segments) {
                    deferred.resolve(segments);
                });
            } else {
                parseSegments.call(self, request.response, info.url, info.range.start).then(function(segments) {
                    deferred.resolve(segments);
                });
            }
        };
        request.onloadend = request.onerror = function() {
            if (!needFailureReport) {
                return;
            }
            needFailureReport = false;
            self.errHandler.downloadError("SIDX", info.url, request);
            deferred.reject(request);
        };
        request.open("GET", self.tokenAuthentication.addTokenAsQueryArg(info.url));
        request.responseType = "arraybuffer";
        request.setRequestHeader("Range", "bytes=" + info.range.start + "-" + info.range.end);
        request = self.tokenAuthentication.setTokenInRequestHeader(request);
        request.send(null);
        self.debug.log("Perform SIDX load: " + info.url);
        return deferred.promise;
    };
    return {
        debug: undefined,
        errHandler: undefined,
        tokenAuthentication: undefined,
        loadSegments: loadSegments,
        loadInitialization: loadInit,
        parseSegments: parseSegments,
        parseSIDX: parseSIDX,
        findSIDX: findSIDX
    };
};

Dash.dependencies.BaseURLExtensions.prototype = {
    constructor: Dash.dependencies.BaseURLExtensions
};

Dash.dependencies.DashHandler = function() {
    "use strict";
    var index = -1, requestedTime, isDynamic, type, offset = null, zeroPadToLength = function(numStr, minStrLength) {
        while (numStr.length < minStrLength) {
            numStr = "0" + numStr;
        }
        return numStr;
    }, replaceTokenForTemplate = function(url, token, value) {
        var startPos = 0, endPos = 0, tokenLen = token.length, formatTag = "%0", formatTagLen = formatTag.length, formatTagPos, specifier, width, paddedValue;
        while (true) {
            startPos = url.indexOf("$" + token);
            if (startPos < 0) {
                return url;
            }
            endPos = url.indexOf("$", startPos + tokenLen);
            if (endPos < 0) {
                return url;
            }
            formatTagPos = url.indexOf(formatTag, startPos + tokenLen);
            if (formatTagPos > startPos && formatTagPos < endPos) {
                specifier = url.charAt(endPos - 1);
                width = parseInt(url.substring(formatTagPos + formatTagLen, endPos - 1), 10);
                switch (specifier) {
                  case "d":
                  case "i":
                  case "u":
                    paddedValue = zeroPadToLength(value.toString(), width);
                    break;

                  case "x":
                    paddedValue = zeroPadToLength(value.toString(16), width);
                    break;

                  case "X":
                    paddedValue = zeroPadToLength(value.toString(16), width).toUpperCase();
                    break;

                  case "o":
                    paddedValue = zeroPadToLength(value.toString(8), width);
                    break;

                  default:
                    this.debug.log("Unsupported/invalid IEEE 1003.1 format identifier string in URL");
                    return url;
                }
            } else {
                paddedValue = value;
            }
            url = url.substring(0, startPos) + paddedValue + url.substring(endPos + 1);
        }
    }, unescapeDollarsInTemplate = function(url) {
        return url.split("$$").join("$");
    }, replaceIDForTemplate = function(url, value) {
        if (value === null || url.indexOf("$RepresentationID$") === -1) {
            return url;
        }
        var v = value.toString();
        return url.split("$RepresentationID$").join(v);
    }, getNumberForSegment = function(segment, segmentIndex) {
        return segment.representation.startNumber + segmentIndex;
    }, getRequestUrl = function(destination, representation) {
        var baseURL = representation.adaptation.period.mpd.manifest.Period_asArray[representation.adaptation.period.index].AdaptationSet_asArray[representation.adaptation.index].Representation_asArray[representation.index].BaseURL, url;
        if (destination === baseURL) {
            url = destination;
        } else if (destination.indexOf("http://") !== -1) {
            url = destination;
        } else {
            url = baseURL + destination;
        }
        return url;
    }, generateInitRequest = function(representation, streamType) {
        var self = this, period, request = new MediaPlayer.vo.SegmentRequest(), presentationStartTime;
        period = representation.adaptation.period;
        request.streamType = streamType;
        request.type = "Initialization Segment";
        request.url = getRequestUrl(representation.initialization, representation);
        request.range = representation.range;
        presentationStartTime = period.start;
        request.availabilityStartTime = self.timelineConverter.calcAvailabilityStartTimeFromPresentationTime(presentationStartTime, representation.adaptation.period.mpd, isDynamic);
        request.availabilityEndTime = self.timelineConverter.calcAvailabilityEndTimeFromPresentationTime(presentationStartTime + period.duration, period.mpd, isDynamic);
        request.quality = representation.index;
        return request;
    }, getInit = function(representation) {
        var deferred = Q.defer(), request = null, url = null, self = this;
        if (!representation) {
            return Q.reject("no represenation");
        }
        if (representation.initialization) {
            request = generateInitRequest.call(self, representation, type);
            deferred.resolve(request);
        } else {
            url = representation.adaptation.period.mpd.manifest.Period_asArray[representation.adaptation.period.index].AdaptationSet_asArray[representation.adaptation.index].Representation_asArray[representation.index].BaseURL;
            self.baseURLExt.loadInitialization(url).then(function(theRange) {
                representation.range = theRange;
                representation.initialization = url;
                request = generateInitRequest.call(self, representation, type);
                deferred.resolve(request);
            }, function(httprequest) {
                deferred.reject(httprequest);
            });
        }
        return deferred.promise;
    }, isMediaFinished = function(representation) {
        var sDuration, period = representation.adaptation.period, isFinished = false, seg, fTime;
        if (offset === null || offset > representation.segments[0].availabilityIdx) {
            offset = representation.segments[0].availabilityIdx;
        }
        if (isDynamic) {
            isFinished = false;
        } else {
            if (index < 0) {
                isFinished = false;
            } else if (index < representation.availableSegmentsNumber + offset) {
                seg = getSegmentByIndex(index, representation);
                if (seg) {
                    fTime = seg.presentationStartTime - period.start;
                    sDuration = representation.adaptation.period.duration;
                    this.debug.log(representation.segmentInfoType + ": " + fTime + " / " + sDuration);
                    isFinished = fTime >= sDuration;
                }
            } else {
                isFinished = true;
            }
        }
        return Q.when(isFinished);
    }, getIndexBasedSegment = function(representation, index) {
        var self = this, seg, duration, presentationStartTime, presentationEndTime;
        duration = representation.segmentDuration;
        presentationStartTime = representation.adaptation.period.start + index * duration;
        presentationEndTime = presentationStartTime + duration;
        seg = new Dash.vo.Segment();
        seg.representation = representation;
        seg.duration = duration;
        seg.presentationStartTime = presentationStartTime;
        seg.mediaStartTime = self.timelineConverter.calcMediaTimeFromPresentationTime(seg.presentationStartTime, representation);
        seg.availabilityStartTime = self.timelineConverter.calcAvailabilityStartTimeFromPresentationTime(seg.presentationStartTime, representation.adaptation.period.mpd, isDynamic);
        seg.availabilityEndTime = self.timelineConverter.calcAvailabilityEndTimeFromPresentationTime(presentationEndTime, representation.adaptation.period.mpd, isDynamic);
        seg.wallStartTime = self.timelineConverter.calcWallTimeForSegment(seg, isDynamic);
        seg.replacementNumber = getNumberForSegment(seg, index);
        seg.availabilityIdx = index;
        return seg;
    }, getSegmentsFromTimeline = function(representation) {
        var self = this, template = representation.adaptation.period.mpd.manifest.Period_asArray[representation.adaptation.period.index].AdaptationSet_asArray[representation.adaptation.index].Representation_asArray[representation.index].SegmentTemplate, timeline = template.SegmentTimeline, isAvailableSegmentNumberCalculated = representation.availableSegmentsNumber > 0, maxSegmentsAhead = 10, segments = [], fragments, frag, i, len, j, repeat, repeatEndTime, nextFrag, time = 0, availabilityIdx = -1, calculatedRange, hasEnoughSegments, requiredMediaTime, startIdx, endIdx, fTimescale, createSegment = function(s) {
            return getTimeBasedSegment.call(self, representation, time, s.d, fTimescale, template.media, s.mediaRange, availabilityIdx);
        };
        fTimescale = representation.timescale;
        fragments = timeline.S_asArray;
        calculatedRange = decideSegmentListRangeForTimeline.call(self, representation);
        if (calculatedRange) {
            startIdx = calculatedRange.start;
            endIdx = calculatedRange.end;
        } else {
            requiredMediaTime = self.timelineConverter.calcMediaTimeFromPresentationTime(requestedTime || 0, representation);
        }
        for (i = 0, len = fragments.length; i < len; i += 1) {
            frag = fragments[i];
            repeat = 0;
            if (frag.hasOwnProperty("r")) {
                repeat = frag.r;
            }
            if (frag.hasOwnProperty("t")) {
                time = frag.t;
            }
            if (repeat < 0) {
                nextFrag = fragments[i + 1];
                repeatEndTime = nextFrag && nextFrag.hasOwnProperty("t") ? nextFrag.t / fTimescale : representation.adaptation.period.duration;
                repeat = Math.ceil((repeatEndTime - time / fTimescale) / (frag.d / fTimescale)) - 1;
            }
            if (hasEnoughSegments) {
                if (isAvailableSegmentNumberCalculated) break;
                availabilityIdx += repeat + 1;
                continue;
            }
            for (j = 0; j <= repeat; j += 1) {
                availabilityIdx += 1;
                if (calculatedRange) {
                    if (availabilityIdx > endIdx) {
                        hasEnoughSegments = true;
                        if (isAvailableSegmentNumberCalculated) break;
                        continue;
                    }
                    if (availabilityIdx >= startIdx) {
                        segments.push(createSegment.call(self, frag));
                    }
                } else {
                    if (segments.length > maxSegmentsAhead) {
                        hasEnoughSegments = true;
                        if (isAvailableSegmentNumberCalculated) break;
                        continue;
                    }
                    if (time / fTimescale >= requiredMediaTime - frag.d / fTimescale) {
                        segments.push(createSegment.call(self, frag));
                    }
                }
                time += frag.d;
            }
        }
        if (!isAvailableSegmentNumberCalculated) {
            var availabilityStartTime, availabilityEndTime, f = fragments[0];
            availabilityStartTime = f.t === undefined ? 0 : self.timelineConverter.calcPresentationTimeFromMediaTime(f.t / fTimescale, representation);
            availabilityEndTime = self.timelineConverter.calcPresentationTimeFromMediaTime((time - frag.d) / fTimescale, representation);
            representation.segmentAvailabilityRange = {
                start: availabilityStartTime,
                end: availabilityEndTime
            };
            representation.availableSegmentsNumber = availabilityIdx + 1;
        }
        return Q.when(segments);
    }, getSegmentsFromTemplate = function(representation) {
        var segments = [], self = this, deferred = Q.defer(), template = representation.adaptation.period.mpd.manifest.Period_asArray[representation.adaptation.period.index].AdaptationSet_asArray[representation.adaptation.index].Representation_asArray[representation.index].SegmentTemplate, duration = representation.segmentDuration, segmentRange = null, periodStartIdx = Math.floor(representation.adaptation.period.start / duration), i, startIdx, endIdx, seg = null, start, url = null;
        start = representation.startNumber;
        waitForAvailabilityWindow.call(self, representation).then(function(availabilityWindow) {
            representation.segmentAvailabilityRange = availabilityWindow;
            segmentRange = decideSegmentListRangeForTemplate.call(self, representation);
            startIdx = segmentRange.start;
            endIdx = segmentRange.end;
            for (i = startIdx; i <= endIdx; i += 1) {
                seg = getIndexBasedSegment.call(self, representation, i - (isDynamic ? periodStartIdx : 0));
                seg.replacementTime = (start + i - 1) * representation.segmentDuration;
                url = template.media;
                url = replaceTokenForTemplate(url, "Number", seg.replacementNumber);
                url = replaceTokenForTemplate(url, "Time", seg.replacementTime);
                seg.media = url;
                segments.push(seg);
                seg = null;
            }
            representation.availableSegmentsNumber = periodStartIdx + Math.ceil((availabilityWindow.end - availabilityWindow.start) / duration);
            deferred.resolve(segments);
        });
        return deferred.promise;
    }, decideSegmentListRangeForTemplate = function(representation) {
        var self = this, periodStart = representation.adaptation.period.start, duration = representation.segmentDuration, minBufferTime = representation.adaptation.period.mpd.manifest.minBufferTime, availabilityWindow = representation.segmentAvailabilityRange, originAvailabilityTime = NaN, originSegment = null, currentSegmentList = representation.segments, availabilityLowerLimit = 2 * duration, availabilityUpperLimit = Math.max(2 * minBufferTime, 10 * duration), start, end, range;
        if (!availabilityWindow) {
            availabilityWindow = self.timelineConverter.calcSegmentAvailabilityRange(representation, isDynamic);
        }
        if (isDynamic && !representation.adaptation.period.mpd.isClientServerTimeSyncCompleted) {
            start = Math.floor(availabilityWindow.start / duration);
            end = Math.floor(availabilityWindow.end / duration);
            range = {
                start: start,
                end: end
            };
            return range;
        }
        if (currentSegmentList) {
            originSegment = getSegmentByIndex(index, representation);
            originAvailabilityTime = originSegment ? originSegment.presentationStartTime - periodStart : index > 0 ? index * duration : requestedTime - periodStart || currentSegmentList[0].presentationStartTime - periodStart;
        } else {
            originAvailabilityTime = index > 0 ? index * duration : isDynamic ? availabilityWindow.end : availabilityWindow.start;
        }
        start = Math.floor(Math.max(originAvailabilityTime - availabilityLowerLimit, availabilityWindow.start) / duration);
        end = Math.floor(Math.min(start + availabilityUpperLimit / duration, availabilityWindow.end / duration));
        range = {
            start: start,
            end: end
        };
        return range;
    }, decideSegmentListRangeForTimeline = function(representation) {
        var originAvailabilityIdx = NaN, currentSegmentList = representation.segments, availabilityLowerLimit = 2, availabilityUpperLimit = 10, firstIdx = 0, lastIdx = Number.POSITIVE_INFINITY, start, end, range;
        if (isDynamic && !representation.adaptation.period.mpd.isClientServerTimeSyncCompleted) {
            range = {
                start: firstIdx,
                end: lastIdx
            };
            return range;
        }
        if (!isDynamic && requestedTime) return null;
        if (currentSegmentList) {
            if (index < 0) return null;
            originAvailabilityIdx = index;
        } else {
            originAvailabilityIdx = index > 0 ? index : isDynamic ? lastIdx : firstIdx;
        }
        start = Math.max(originAvailabilityIdx - availabilityLowerLimit, firstIdx);
        end = Math.min(originAvailabilityIdx + availabilityUpperLimit, lastIdx);
        range = {
            start: start,
            end: end
        };
        return range;
    }, waitForAvailabilityWindow = function(representation) {
        var self = this, deferred = Q.defer(), range, waitingTime, getRange = function() {
            range = self.timelineConverter.calcSegmentAvailabilityRange(representation, isDynamic);
            if (range.end > 0) {
                deferred.resolve(range);
            } else {
                waitingTime = Math.abs(range.end) * 1e3;
                setTimeout(getRange, waitingTime);
            }
        };
        getRange();
        return deferred.promise;
    }, getTimeBasedSegment = function(representation, time, duration, fTimescale, url, range, index) {
        var self = this, scaledTime = time / fTimescale, scaledDuration = Math.min(duration / fTimescale, representation.adaptation.period.mpd.maxSegmentDuration), presentationStartTime, presentationEndTime, seg;
        presentationStartTime = self.timelineConverter.calcPresentationTimeFromMediaTime(scaledTime, representation);
        presentationEndTime = presentationStartTime + scaledDuration;
        seg = new Dash.vo.Segment();
        seg.representation = representation;
        seg.duration = scaledDuration;
        seg.mediaStartTime = scaledTime;
        seg.presentationStartTime = presentationStartTime;
        seg.availabilityStartTime = representation.adaptation.period.mpd.manifest.mpdLoadedTime;
        seg.availabilityEndTime = self.timelineConverter.calcAvailabilityEndTimeFromPresentationTime(presentationEndTime, representation.adaptation.period.mpd, isDynamic);
        seg.wallStartTime = self.timelineConverter.calcWallTimeForSegment(seg, isDynamic);
        seg.replacementTime = time;
        seg.replacementNumber = getNumberForSegment(seg, index);
        url = replaceTokenForTemplate(url, "Number", seg.replacementNumber);
        url = replaceTokenForTemplate(url, "Time", seg.replacementTime);
        seg.media = url;
        seg.mediaRange = range;
        seg.availabilityIdx = index;
        return seg;
    }, getSegmentsFromList = function(representation) {
        var self = this, segments = [], deferred = Q.defer(), list = representation.adaptation.period.mpd.manifest.Period_asArray[representation.adaptation.period.index].AdaptationSet_asArray[representation.adaptation.index].Representation_asArray[representation.index].SegmentList, len = list.SegmentURL_asArray.length, i, seg, s, range, startIdx = 0, endIdx = list.SegmentURL_asArray.length, start;
        start = representation.startNumber;
        waitForAvailabilityWindow.call(self, representation).then(function(availabilityWindow) {
            if (!isDynamic) {
                range = decideSegmentListRangeForTemplate.call(self, representation);
                startIdx = range.start;
                endIdx = range.end;
            }
            for (i = startIdx; i < endIdx; i += 1) {
                s = list.SegmentURL_asArray[i];
                seg = getIndexBasedSegment.call(self, representation, i);
                seg.replacementTime = (start + i - 1) * representation.segmentDuration;
                seg.media = s.media;
                seg.mediaRange = s.mediaRange;
                seg.index = s.index;
                seg.indexRange = s.indexRange;
                segments.push(seg);
                seg = null;
            }
            representation.segmentAvailabilityRange = availabilityWindow;
            representation.availableSegmentsNumber = len;
            deferred.resolve(segments);
        });
        return deferred.promise;
    }, getSegmentsFromSource = function(representation) {
        var self = this, baseURL = representation.adaptation.period.mpd.manifest.Period_asArray[representation.adaptation.period.index].AdaptationSet_asArray[representation.adaptation.index].Representation_asArray[representation.index].BaseURL, deferred = Q.defer(), segments = [], count = 0, range = null, s, i, len, seg;
        if (representation.indexRange) {
            range = representation.indexRange;
        }
        this.baseURLExt.loadSegments(baseURL, range).then(function(fragments) {
            for (i = 0, len = fragments.length; i < len; i += 1) {
                s = fragments[i];
                seg = getTimeBasedSegment.call(self, representation, s.startTime, s.duration, s.timescale, s.media, s.mediaRange, count);
                segments.push(seg);
                seg = null;
                count += 1;
            }
            representation.segmentAvailabilityRange = {
                start: segments[0].presentationStartTime,
                end: segments[len - 1].presentationStartTime
            };
            representation.availableSegmentsNumber = len;
            deferred.resolve(segments);
        });
        return deferred.promise;
    }, getSegments = function(representation) {
        var segmentPromise, deferred = Q.defer(), self = this, lastIdx;
        if (!isSegmentListUpdateRequired.call(self, representation)) {
            return Q.when(representation.segments);
        } else {
            if (representation.segmentInfoType === "SegmentTimeline") {
                segmentPromise = getSegmentsFromTimeline.call(self, representation);
            } else if (representation.segmentInfoType === "SegmentTemplate") {
                segmentPromise = getSegmentsFromTemplate.call(self, representation);
            } else if (representation.segmentInfoType === "SegmentList") {
                segmentPromise = getSegmentsFromList.call(self, representation);
            } else {
                segmentPromise = getSegmentsFromSource.call(self, representation);
            }
            Q.when(segmentPromise).then(function(segments) {
                representation.segments = segments;
                lastIdx = segments.length - 1;
                if (isDynamic && isNaN(representation.adaptation.period.liveEdge)) {
                    var metrics = self.metricsModel.getMetricsFor("stream"), liveEdge = segments[lastIdx].presentationStartTime;
                    representation.adaptation.period.liveEdge = liveEdge;
                    self.metricsModel.updateManifestUpdateInfo(self.metricsExt.getCurrentManifestUpdate(metrics), {
                        presentationStartTime: liveEdge
                    });
                }
                deferred.resolve(segments);
            });
        }
        return deferred.promise;
    }, updateSegmentList = function(representation) {
        var self = this, deferred = Q.defer();
        representation.segments = null;
        getSegments.call(self, representation).then(function(segments) {
            representation.segments = segments;
            deferred.resolve();
        });
        return deferred.promise;
    }, getIndexForSegments = function(time, representation) {
        var segments = representation.segments, segmentLastIdx = segments.length - 1, idx = -1, frag, ft, fd, i, self = this;
        if (segments && segments.length > 0) {
            for (i = segmentLastIdx; i >= 0; i--) {
                frag = segments[i];
                ft = frag.presentationStartTime;
                fd = frag.duration;
                if (time + Dash.dependencies.DashHandler.EPSILON >= ft && time - Dash.dependencies.DashHandler.EPSILON <= ft + fd) {
                    idx = frag.availabilityIdx;
                    break;
                } else if (idx === -1 && time - Dash.dependencies.DashHandler.EPSILON > ft + fd) {
                    idx = isNaN(representation.segmentDuration) ? frag.availabilityIdx + 1 : Math.floor((time - representation.adaptation.period.start) / representation.segmentDuration);
                }
            }
        }
        if (idx === -1) {
            if (!isNaN(representation.segmentDuration)) {
                idx = Math.floor((time - representation.adaptation.period.start) / representation.segmentDuration);
            } else {
                self.debug.log("Couldn't figure out a time!");
                self.debug.log("Time: " + time);
                self.debug.log(segments);
            }
        }
        return Q.when(idx);
    }, getSegmentByIndex = function(index, representation) {
        if (!representation || !representation.segments) return null;
        var ln = representation.segments.length, seg, i;
        for (i = 0; i < ln; i += 1) {
            seg = representation.segments[i];
            if (seg.availabilityIdx === index) {
                return seg;
            }
        }
        return null;
    }, isSegmentListUpdateRequired = function(representation) {
        var updateRequired = false, segments = representation.segments, upperIdx, lowerIdx;
        if (!segments) {
            updateRequired = true;
        } else {
            lowerIdx = segments[0].availabilityIdx;
            upperIdx = segments[segments.length - 1].availabilityIdx;
            updateRequired = index < lowerIdx || index > upperIdx;
        }
        return updateRequired;
    }, getRequestForSegment = function(segment) {
        if (segment === null || segment === undefined) {
            return Q.when(null);
        }
        var request = new MediaPlayer.vo.SegmentRequest(), representation = segment.representation, bandwidth = representation.adaptation.period.mpd.manifest.Period_asArray[representation.adaptation.period.index].AdaptationSet_asArray[representation.adaptation.index].Representation_asArray[representation.index].bandwidth, url;
        url = getRequestUrl(segment.media, representation);
        url = replaceTokenForTemplate(url, "Number", segment.replacementNumber);
        url = replaceTokenForTemplate(url, "Time", segment.replacementTime);
        url = replaceTokenForTemplate(url, "Bandwidth", bandwidth);
        url = replaceIDForTemplate(url, representation.id);
        url = unescapeDollarsInTemplate(url);
        request.streamType = type;
        request.type = "Media Segment";
        request.url = url;
        request.range = segment.mediaRange;
        request.startTime = segment.presentationStartTime;
        request.duration = segment.duration;
        request.timescale = representation.timescale;
        request.availabilityStartTime = segment.availabilityStartTime;
        request.availabilityEndTime = segment.availabilityEndTime;
        request.wallStartTime = segment.wallStartTime;
        request.quality = representation.index;
        request.index = segment.availabilityIdx;
        return Q.when(request);
    }, getForTime = function(representation, time) {
        var deferred, request, segment, self = this;
        if (!representation) {
            return Q.reject("no represenation");
        }
        requestedTime = time;
        self.debug.log("Getting the request for time: " + time);
        deferred = Q.defer();
        getSegments.call(self, representation).then(function() {
            var segmentsPromise;
            segmentsPromise = getIndexForSegments.call(self, time, representation);
            return segmentsPromise;
        }).then(function(newIndex) {
            self.debug.log("Index for time " + time + " is " + newIndex);
            index = newIndex;
            return isMediaFinished.call(self, representation);
        }).then(function(finished) {
            var requestPromise = null;
            if (finished) {
                request = new MediaPlayer.vo.SegmentRequest();
                request.action = request.ACTION_COMPLETE;
                request.index = index;
                self.debug.log("Signal complete.");
                self.debug.log(request);
                deferred.resolve(request);
            } else {
                segment = getSegmentByIndex(index, representation);
                requestPromise = getRequestForSegment.call(self, segment);
            }
            return requestPromise;
        }).then(function(request) {
            deferred.resolve(request);
        });
        return deferred.promise;
    }, getNext = function(representation) {
        var deferred, request, segment, self = this;
        if (!representation) {
            return Q.reject("no represenation");
        }
        if (index === -1) {
            throw "You must call getSegmentRequestForTime first.";
        }
        requestedTime = null;
        index += 1;
        deferred = Q.defer();
        isMediaFinished.call(self, representation).then(function(finished) {
            if (finished) {
                request = new MediaPlayer.vo.SegmentRequest();
                request.action = request.ACTION_COMPLETE;
                request.index = index;
                self.debug.log("Signal complete.");
                deferred.resolve(request);
            } else {
                getSegments.call(self, representation).then(function() {
                    var segmentsPromise;
                    segment = getSegmentByIndex(index, representation);
                    segmentsPromise = getRequestForSegment.call(self, segment);
                    return segmentsPromise;
                }).then(function(request) {
                    deferred.resolve(request);
                });
            }
        });
        return deferred.promise;
    }, getSegmentCountForDuration = function(representation, requiredDuration, bufferedDuration) {
        var self = this, remainingDuration = Math.max(requiredDuration - bufferedDuration, 0), deferred = Q.defer(), segmentDuration, segmentCount = 0;
        if (!representation) {
            return Q.reject("no represenation");
        }
        getSegments.call(self, representation).then(function(segments) {
            segmentDuration = segments[0].duration;
            segmentCount = Math.ceil(remainingDuration / segmentDuration);
            deferred.resolve(segmentCount);
        }, function() {
            deferred.resolve(0);
        });
        return deferred.promise;
    }, getCurrentTime = function(representation) {
        var self = this, time, bufferedIndex, deferred = Q.defer();
        if (!representation) {
            return Q.reject("no represenation");
        }
        bufferedIndex = index;
        getSegments.call(self, representation).then(function(segments) {
            if (bufferedIndex < 0) {
                time = self.timelineConverter.calcPresentationStartTime(representation.adaptation.period);
            } else {
                bufferedIndex = bufferedIndex < segments[0].availabilityIdx ? segments[0].availabilityIdx : Math.min(segments[segments.length - 1].availabilityIdx, bufferedIndex);
                time = getSegmentByIndex(bufferedIndex, representation).presentationStartTime;
            }
            deferred.resolve(time);
        }, function() {
            deferred.reject();
        });
        return deferred.promise;
    };
    return {
        debug: undefined,
        baseURLExt: undefined,
        metricsModel: undefined,
        metricsExt: undefined,
        manifestModel: undefined,
        manifestExt: undefined,
        errHandler: undefined,
        timelineConverter: undefined,
        getType: function() {
            return type;
        },
        setType: function(value) {
            type = value;
        },
        getIsDynamic: function() {
            return isDynamic;
        },
        setIsDynamic: function(value) {
            isDynamic = value;
        },
        getInitRequest: getInit,
        getSegmentRequestForTime: getForTime,
        getNextSegmentRequest: getNext,
        getCurrentTime: getCurrentTime,
        getSegmentCountForDuration: getSegmentCountForDuration,
        updateSegmentList: updateSegmentList
    };
};

Dash.dependencies.DashHandler.EPSILON = .003;

Dash.dependencies.DashHandler.prototype = {
    constructor: Dash.dependencies.DashHandler
};

Dash.dependencies.DashManifestExtensions = function() {
    "use strict";
    this.timelineConverter = undefined;
};

Dash.dependencies.DashManifestExtensions.prototype = {
    constructor: Dash.dependencies.DashManifestExtensions,
    getIsAudio: function(adaptation) {
        "use strict";
        var i, len, col = adaptation.ContentComponent_asArray, representation, result = false, found = false;
        if (col) {
            for (i = 0, len = col.length; i < len; i += 1) {
                if (col[i].contentType === "audio") {
                    result = true;
                    found = true;
                }
            }
        }
        if (adaptation.hasOwnProperty("mimeType")) {
            result = adaptation.mimeType.indexOf("audio") !== -1;
            found = true;
        }
        if (!found) {
            i = 0;
            len = adaptation.Representation_asArray.length;
            while (!found && i < len) {
                representation = adaptation.Representation_asArray[i];
                if (representation.hasOwnProperty("mimeType")) {
                    result = representation.mimeType.indexOf("audio") !== -1;
                    found = true;
                }
                i += 1;
            }
        }
        if (result) {
            adaptation.type = "audio";
        }
        return Q.when(result);
    },
    getIsVideo: function(adaptation) {
        "use strict";
        var i, len, col = adaptation.ContentComponent_asArray, representation, result = false, found = false;
        if (col) {
            for (i = 0, len = col.length; i < len; i += 1) {
                if (col[i].contentType === "video") {
                    result = true;
                    found = true;
                }
            }
        }
        if (adaptation.hasOwnProperty("mimeType")) {
            result = adaptation.mimeType.indexOf("video") !== -1;
            found = true;
        }
        if (!found) {
            i = 0;
            len = adaptation.Representation_asArray.length;
            while (!found && i < len) {
                representation = adaptation.Representation_asArray[i];
                if (representation.hasOwnProperty("mimeType")) {
                    result = representation.mimeType.indexOf("video") !== -1;
                    found = true;
                }
                i += 1;
            }
        }
        if (result) {
            adaptation.type = "video";
        }
        return Q.when(result);
    },
    getIsText: function(adaptation) {
        "use strict";
        var i, len, col = adaptation.ContentComponent_asArray, representation, result = false, found = false;
        if (col) {
            for (i = 0, len = col.length; i < len; i += 1) {
                if (col[i].contentType === "text") {
                    result = true;
                    found = true;
                }
            }
        }
        if (adaptation.hasOwnProperty("mimeType")) {
            result = adaptation.mimeType.indexOf("vtt") !== -1 || adaptation.mimeType.indexOf("ttml") !== -1;
            found = true;
        }
        if (!found) {
            i = 0;
            len = adaptation.Representation_asArray.length;
            while (!found && i < len) {
                representation = adaptation.Representation_asArray[i];
                if (representation.hasOwnProperty("mimeType")) {
                    result = representation.mimeType.indexOf("vtt") !== -1 || representation.mimeType.indexOf("ttml") !== -1;
                    found = true;
                }
                i += 1;
            }
        }
        return Q.when(result);
    },
    getIsTextTrack: function(type) {
        return type === "text/vtt" || type === "application/ttml+xml";
    },
    getIsMain: function() {
        "use strict";
        return Q.when(false);
    },
    processAdaptation: function(adaptation) {
        "use strict";
        if (adaptation.Representation_asArray !== undefined && adaptation.Representation_asArray !== null) {
            adaptation.Representation_asArray.sort(function(a, b) {
                return a.bandwidth - b.bandwidth;
            });
        }
        return adaptation;
    },
    getDataForId: function(id, manifest, periodIndex) {
        "use strict";
        var adaptations = manifest.Period_asArray[periodIndex].AdaptationSet_asArray, i, len;
        for (i = 0, len = adaptations.length; i < len; i += 1) {
            if (adaptations[i].hasOwnProperty("id") && adaptations[i].id === id) {
                return Q.when(adaptations[i]);
            }
        }
        return Q.when(null);
    },
    getDataForIndex: function(index, manifest, periodIndex) {
        "use strict";
        var adaptations = manifest.Period_asArray[periodIndex].AdaptationSet_asArray;
        return Q.when(adaptations[index]);
    },
    getDataIndex: function(data, manifest, periodIndex) {
        "use strict";
        var adaptations = manifest.Period_asArray[periodIndex].AdaptationSet_asArray, i, len;
        for (i = 0, len = adaptations.length; i < len; i += 1) {
            if (adaptations[i] === data) {
                return Q.when(i);
            }
        }
        return Q.when(-1);
    },
    getVideoData: function(manifest, periodIndex) {
        "use strict";
        var adaptations = manifest.Period_asArray[periodIndex].AdaptationSet_asArray, i, len, deferred = Q.defer(), funcs = [];
        for (i = 0, len = adaptations.length; i < len; i += 1) {
            funcs.push(this.getIsVideo(adaptations[i]));
        }
        Q.all(funcs).then(function(results) {
            var found = false;
            for (i = 0, len = results.length; i < len; i += 1) {
                if (results[i] === true) {
                    found = true;
                    deferred.resolve(adaptations[i]);
                }
            }
            if (!found) {
                deferred.resolve(null);
            }
        });
        return deferred.promise;
    },
    getTextData: function(manifest, periodIndex) {
        "use strict";
        var adaptations = manifest.Period_asArray[periodIndex].AdaptationSet_asArray, i, len, deferred = Q.defer(), funcs = [];
        for (i = 0, len = adaptations.length; i < len; i += 1) {
            funcs.push(this.getIsText(adaptations[i]));
        }
        Q.all(funcs).then(function(results) {
            var found = false;
            for (i = 0, len = results.length; i < len && !found; i += 1) {
                if (results[i] === true) {
                    found = true;
                    deferred.resolve(adaptations[i]);
                }
            }
            if (!found) {
                deferred.resolve(null);
            }
        });
        return deferred.promise;
    },
    getAudioDatas: function(manifest, periodIndex) {
        "use strict";
        var adaptations = manifest.Period_asArray[periodIndex].AdaptationSet_asArray, i, len, deferred = Q.defer(), funcs = [];
        for (i = 0, len = adaptations.length; i < len; i += 1) {
            funcs.push(this.getIsAudio(adaptations[i]));
        }
        Q.all(funcs).then(function(results) {
            var datas = [];
            for (i = 0, len = results.length; i < len; i += 1) {
                if (results[i] === true) {
                    datas.push(adaptations[i]);
                }
            }
            deferred.resolve(datas);
        });
        return deferred.promise;
    },
    getPrimaryAudioData: function(manifest, periodIndex) {
        "use strict";
        var i, len, deferred = Q.defer(), funcs = [], self = this;
        this.getAudioDatas(manifest, periodIndex).then(function(datas) {
            if (!datas || datas.length === 0) {
                deferred.resolve(null);
            }
            for (i = 0, len = datas.length; i < len; i += 1) {
                funcs.push(self.getIsMain(datas[i]));
            }
            Q.all(funcs).then(function(results) {
                var found = false;
                for (i = 0, len = results.length; i < len; i += 1) {
                    if (results[i] === true) {
                        found = true;
                        deferred.resolve(self.processAdaptation(datas[i]));
                    }
                }
                if (!found) {
                    deferred.resolve(datas[0]);
                }
            });
        });
        return deferred.promise;
    },
    getCodec: function(data) {
        "use strict";
        var representation = data.Representation_asArray[0], codec = representation.mimeType + ';codecs="' + representation.codecs + '"';
        return Q.when(codec);
    },
    getMimeType: function(data) {
        "use strict";
        return Q.when(data.Representation_asArray[0].mimeType);
    },
    getKID: function(data) {
        "use strict";
        if (!data || !data.hasOwnProperty("cenc:default_KID")) {
            return null;
        }
        return data["cenc:default_KID"];
    },
    getContentProtectionData: function(data) {
        "use strict";
        if (!data || !data.hasOwnProperty("ContentProtection_asArray") || data.ContentProtection_asArray.length === 0) {
            return Q.when(null);
        }
        return Q.when(data.ContentProtection_asArray);
    },
    getIsDynamic: function(manifest) {
        "use strict";
        var isDynamic = false, LIVE_TYPE = "dynamic";
        if (manifest.hasOwnProperty("type")) {
            isDynamic = manifest.type === LIVE_TYPE;
        }
        return isDynamic;
    },
    getIsDVR: function(manifest) {
        "use strict";
        var isDynamic = this.getIsDynamic(manifest), containsDVR, isDVR;
        containsDVR = !isNaN(manifest.timeShiftBufferDepth);
        isDVR = isDynamic && containsDVR;
        return Q.when(isDVR);
    },
    getIsOnDemand: function(manifest) {
        "use strict";
        var isOnDemand = false;
        if (manifest.profiles && manifest.profiles.length > 0) {
            isOnDemand = manifest.profiles.indexOf("urn:mpeg:dash:profile:isoff-on-demand:2011") !== -1;
        }
        return Q.when(isOnDemand);
    },
    getDuration: function(manifest) {
        var mpdDuration;
        if (manifest.hasOwnProperty("mediaPresentationDuration")) {
            mpdDuration = manifest.mediaPresentationDuration;
        } else {
            mpdDuration = Number.POSITIVE_INFINITY;
        }
        return Q.when(mpdDuration);
    },
    getBandwidth: function(representation) {
        "use strict";
        return Q.when(representation.bandwidth);
    },
    getRefreshDelay: function(manifest) {
        "use strict";
        var delay = NaN, minDelay = 2;
        if (manifest.hasOwnProperty("minimumUpdatePeriod")) {
            delay = Math.max(parseFloat(manifest.minimumUpdatePeriod), minDelay);
        }
        return Q.when(delay);
    },
    getRepresentationCount: function(adaptation) {
        "use strict";
        return Q.when(adaptation.Representation_asArray.length);
    },
    getRepresentationFor: function(index, data) {
        "use strict";
        return Q.when(data.Representation_asArray[index]);
    },
    getRepresentationsForAdaptation: function(manifest, adaptation) {
        var self = this, a = self.processAdaptation(manifest.Period_asArray[adaptation.period.index].AdaptationSet_asArray[adaptation.index]), representations = [], deferred = Q.defer(), representation, initialization, segmentInfo, r;
        for (var i = 0; i < a.Representation_asArray.length; i += 1) {
            r = a.Representation_asArray[i];
            representation = new Dash.vo.Representation();
            representation.index = i;
            representation.adaptation = adaptation;
            if (r.hasOwnProperty("id")) {
                representation.id = r.id;
            }
            if (r.hasOwnProperty("SegmentBase")) {
                segmentInfo = r.SegmentBase;
                representation.segmentInfoType = "SegmentBase";
            } else if (r.hasOwnProperty("SegmentList")) {
                segmentInfo = r.SegmentList;
                representation.segmentInfoType = "SegmentList";
                representation.useCalculatedLiveEdgeTime = true;
            } else if (r.hasOwnProperty("SegmentTemplate")) {
                segmentInfo = r.SegmentTemplate;
                if (segmentInfo.hasOwnProperty("SegmentTimeline")) {
                    representation.segmentInfoType = "SegmentTimeline";
                } else {
                    representation.segmentInfoType = "SegmentTemplate";
                }
                if (segmentInfo.hasOwnProperty("initialization")) {
                    representation.initialization = segmentInfo.initialization.split("$Bandwidth$").join(r.bandwidth).split("$RepresentationID$").join(r.id);
                }
            } else {
                segmentInfo = r.BaseURL;
                representation.segmentInfoType = "BaseURL";
            }
            if (segmentInfo.hasOwnProperty("Initialization")) {
                initialization = segmentInfo.Initialization;
                if (initialization.hasOwnProperty("sourceURL")) {
                    representation.initialization = initialization.sourceURL;
                } else if (initialization.hasOwnProperty("range")) {
                    representation.initialization = r.BaseURL;
                    representation.range = initialization.range;
                }
            } else if (r.hasOwnProperty("mimeType") && self.getIsTextTrack(r.mimeType)) {
                representation.initialization = r.BaseURL;
                representation.range = 0;
            }
            if (segmentInfo.hasOwnProperty("timescale")) {
                representation.timescale = segmentInfo.timescale;
            }
            if (segmentInfo.hasOwnProperty("duration")) {
                representation.segmentDuration = segmentInfo.duration / representation.timescale;
            }
            if (segmentInfo.hasOwnProperty("startNumber")) {
                representation.startNumber = segmentInfo.startNumber;
            }
            if (segmentInfo.hasOwnProperty("indexRange")) {
                representation.indexRange = segmentInfo.indexRange;
            }
            if (segmentInfo.hasOwnProperty("presentationTimeOffset")) {
                representation.presentationTimeOffset = segmentInfo.presentationTimeOffset / representation.timescale;
            }
            representation.MSETimeOffset = self.timelineConverter.calcMSETimeOffset(representation);
            representations.push(representation);
        }
        deferred.resolve(representations);
        return deferred.promise;
    },
    getAdaptationsForPeriod: function(manifest, period) {
        var p = manifest.Period_asArray[period.index], adaptations = [], adaptationSet;
        for (var i = 0; i < p.AdaptationSet_asArray.length; i += 1) {
            adaptationSet = new Dash.vo.AdaptationSet();
            adaptationSet.index = i;
            adaptationSet.period = period;
            adaptations.push(adaptationSet);
        }
        return Q.when(adaptations);
    },
    getRegularPeriods: function(manifest, mpd) {
        var self = this, deferred = Q.defer(), periods = [], isDynamic = self.getIsDynamic(manifest), i, len, p1 = null, p = null, vo1 = null, vo = null;
        for (i = 0, len = manifest.Period_asArray.length; i < len; i += 1) {
            p = manifest.Period_asArray[i];
            if (p.hasOwnProperty("start")) {
                vo = new Dash.vo.Period();
                vo.start = p.start;
            } else if (p1 !== null && p.hasOwnProperty("duration")) {
                vo = new Dash.vo.Period();
                vo.start = vo1.start + vo1.duration;
                vo.duration = p.duration;
            } else if (i === 0 && !isDynamic) {
                vo = new Dash.vo.Period();
                vo.start = 0;
            }
            if (vo1 !== null && isNaN(vo1.duration)) {
                vo1.duration = vo.start - vo1.start;
            }
            if (vo !== null && p.hasOwnProperty("id")) {
                vo.id = p.id;
            }
            if (vo !== null && p.hasOwnProperty("duration")) {
                vo.duration = p.duration;
            }
            if (vo !== null) {
                vo.index = i;
                vo.mpd = mpd;
                periods.push(vo);
            }
            p1 = p;
            p = null;
            vo1 = vo;
            vo = null;
        }
        if (periods.length === 0) {
            return Q.when(periods);
        }
        self.getCheckTime(manifest, periods[0]).then(function(checkTime) {
            mpd.checkTime = checkTime;
            if (vo1 !== null && isNaN(vo1.duration)) {
                self.getEndTimeForLastPeriod(mpd).then(function(periodEndTime) {
                    vo1.duration = periodEndTime - vo1.start;
                    deferred.resolve(periods);
                });
            } else {
                deferred.resolve(periods);
            }
        });
        return Q.when(deferred.promise);
    },
    getMpd: function(manifest) {
        var mpd = new Dash.vo.Mpd();
        mpd.manifest = manifest;
        if (manifest.hasOwnProperty("availabilityStartTime")) {
            mpd.availabilityStartTime = new Date(manifest.availabilityStartTime.getTime());
        } else {
            mpd.availabilityStartTime = new Date(manifest.mpdLoadedTime.getTime());
        }
        if (manifest.hasOwnProperty("availabilityEndTime")) {
            mpd.availabilityEndTime = new Date(manifest.availabilityEndTime.getTime());
        }
        if (manifest.hasOwnProperty("suggestedPresentationDelay")) {
            mpd.suggestedPresentationDelay = manifest.suggestedPresentationDelay;
        }
        if (manifest.hasOwnProperty("timeShiftBufferDepth")) {
            mpd.timeShiftBufferDepth = manifest.timeShiftBufferDepth;
        }
        if (manifest.hasOwnProperty("maxSegmentDuration")) {
            mpd.maxSegmentDuration = manifest.maxSegmentDuration;
        }
        return Q.when(mpd);
    },
    getFetchTime: function(manifest, period) {
        var fetchTime = this.timelineConverter.calcPresentationTimeFromWallTime(manifest.mpdLoadedTime, period);
        return Q.when(fetchTime);
    },
    getCheckTime: function(manifest, period) {
        var self = this, deferred = Q.defer(), checkTime = NaN;
        if (manifest.hasOwnProperty("minimumUpdatePeriod")) {
            self.getFetchTime(manifest, period).then(function(fetchTime) {
                checkTime = fetchTime + manifest.minimumUpdatePeriod;
                deferred.resolve(checkTime);
            });
        } else {
            deferred.resolve(checkTime);
        }
        return deferred.promise;
    },
    getEndTimeForLastPeriod: function(mpd) {
        var periodEnd;
        if (mpd.manifest.mediaPresentationDuration) {
            periodEnd = mpd.manifest.mediaPresentationDuration;
        } else if (!isNaN(mpd.checkTime)) {
            periodEnd = mpd.checkTime;
        } else {
            return Q.fail(new Error("Must have @mediaPresentationDuration or @minimumUpdatePeriod on MPD or an explicit @duration on the last period."));
        }
        return Q.when(periodEnd);
    },
    getEventsForPeriod: function(manifest, period) {
        var periodArray = manifest.Period_asArray, eventStreams = periodArray[period.index].EventStream_asArray, events = [];
        if (eventStreams) {
            for (var i = 0; i < eventStreams.length; i += 1) {
                var eventStream = new Dash.vo.EventStream();
                eventStream.period = period;
                eventStream.timescale = 1;
                if (eventStreams[i].hasOwnProperty("schemeIdUri")) {
                    eventStream.schemeIdUri = eventStreams[i].schemeIdUri;
                } else {
                    throw "Invalid EventStream. SchemeIdUri has to be set";
                }
                if (eventStreams[i].hasOwnProperty("timescale")) {
                    eventStream.timescale = eventStreams[i].timescale;
                }
                if (eventStreams[i].hasOwnProperty("value")) {
                    eventStream.value = eventStreams[i].value;
                }
                for (var j = 0; j < eventStreams[i].Event_asArray.length; j += 1) {
                    var event = new Dash.vo.Event();
                    event.presentationTime = 0;
                    event.eventStream = eventStream;
                    if (eventStreams[i].Event_asArray[j].hasOwnProperty("presentationTime")) {
                        event.presentationTime = eventStreams[i].Event_asArray[j].presentationTime;
                    }
                    if (eventStreams[i].Event_asArray[j].hasOwnProperty("duration")) {
                        event.duration = eventStreams[i].Event_asArray[j].duration;
                    }
                    if (eventStreams[i].Event_asArray[j].hasOwnProperty("id")) {
                        event.id = eventStreams[i].Event_asArray[j].id;
                    }
                    events.push(event);
                }
            }
        }
        return Q.when(events);
    },
    getEventStreamForAdaptationSet: function(data) {
        var eventStreams = [], inbandStreams = data.InbandEventStream_asArray;
        if (inbandStreams) {
            for (var i = 0; i < inbandStreams.length; i += 1) {
                var eventStream = new Dash.vo.EventStream();
                eventStream.timescale = 1;
                if (inbandStreams[i].hasOwnProperty("schemeIdUri")) {
                    eventStream.schemeIdUri = inbandStreams[i].schemeIdUri;
                } else {
                    throw "Invalid EventStream. SchemeIdUri has to be set";
                }
                if (inbandStreams[i].hasOwnProperty("timescale")) {
                    eventStream.timescale = inbandStreams[i].timescale;
                }
                if (inbandStreams[i].hasOwnProperty("value")) {
                    eventStream.value = inbandStreams[i].value;
                }
                eventStreams.push(eventStream);
            }
        }
        return eventStreams;
    },
    getEventStreamForRepresentation: function(data, representation) {
        var eventStreams = [], inbandStreams = data.Representation_asArray[representation.index].InbandEventStream_asArray;
        if (inbandStreams) {
            for (var i = 0; i < inbandStreams.length; i++) {
                var eventStream = new Dash.vo.EventStream();
                eventStream.timescale = 1;
                eventStream.representation = representation;
                if (inbandStreams[i].hasOwnProperty("schemeIdUri")) {
                    eventStream.schemeIdUri = inbandStreams[i].schemeIdUri;
                } else {
                    throw "Invalid EventStream. SchemeIdUri has to be set";
                }
                if (inbandStreams[i].hasOwnProperty("timescale")) {
                    eventStream.timescale = inbandStreams[i].timescale;
                }
                if (inbandStreams[i].hasOwnProperty("value")) {
                    eventStream.value = inbandStreams[i].value;
                }
                eventStreams.push(eventStream);
            }
        }
        return eventStreams;
    }
};

Dash.dependencies.DashMetricsExtensions = function() {
    "use strict";
    var findRepresentationIndexInPeriodArray = function(periodArray, representationId) {
        var period, adaptationSet, adaptationSetArray, representation, representationArray, periodArrayIndex, adaptationSetArrayIndex, representationArrayIndex;
        for (periodArrayIndex = 0; periodArrayIndex < periodArray.length; periodArrayIndex = periodArrayIndex + 1) {
            period = periodArray[periodArrayIndex];
            adaptationSetArray = period.AdaptationSet_asArray;
            for (adaptationSetArrayIndex = 0; adaptationSetArrayIndex < adaptationSetArray.length; adaptationSetArrayIndex = adaptationSetArrayIndex + 1) {
                adaptationSet = adaptationSetArray[adaptationSetArrayIndex];
                representationArray = adaptationSet.Representation_asArray;
                for (representationArrayIndex = 0; representationArrayIndex < representationArray.length; representationArrayIndex = representationArrayIndex + 1) {
                    representation = representationArray[representationArrayIndex];
                    if (representationId === representation.id) {
                        return representationArrayIndex;
                    }
                }
            }
        }
        return -1;
    }, findRepresentionInPeriodArray = function(periodArray, representationId) {
        var period, adaptationSet, adaptationSetArray, representation, representationArray, periodArrayIndex, adaptationSetArrayIndex, representationArrayIndex;
        for (periodArrayIndex = 0; periodArrayIndex < periodArray.length; periodArrayIndex = periodArrayIndex + 1) {
            period = periodArray[periodArrayIndex];
            adaptationSetArray = period.AdaptationSet_asArray;
            for (adaptationSetArrayIndex = 0; adaptationSetArrayIndex < adaptationSetArray.length; adaptationSetArrayIndex = adaptationSetArrayIndex + 1) {
                adaptationSet = adaptationSetArray[adaptationSetArrayIndex];
                representationArray = adaptationSet.Representation_asArray;
                for (representationArrayIndex = 0; representationArrayIndex < representationArray.length; representationArrayIndex = representationArrayIndex + 1) {
                    representation = representationArray[representationArrayIndex];
                    if (representationId === representation.id) {
                        return representation;
                    }
                }
            }
        }
        return null;
    }, adaptationIsType = function(adaptation, bufferType) {
        var found = false;
        if (bufferType === "video") {
            this.manifestExt.getIsVideo(adaptation);
            if (adaptation.type === "video") {
                found = true;
            }
        } else if (bufferType === "audio") {
            this.manifestExt.getIsAudio(adaptation);
            if (adaptation.type === "audio") {
                found = true;
            }
        } else {
            found = false;
        }
        return found;
    }, findMaxBufferIndex = function(periodArray, bufferType) {
        var period, adaptationSet, adaptationSetArray, representationArray, periodArrayIndex, adaptationSetArrayIndex;
        for (periodArrayIndex = 0; periodArrayIndex < periodArray.length; periodArrayIndex = periodArrayIndex + 1) {
            period = periodArray[periodArrayIndex];
            adaptationSetArray = period.AdaptationSet_asArray;
            for (adaptationSetArrayIndex = 0; adaptationSetArrayIndex < adaptationSetArray.length; adaptationSetArrayIndex = adaptationSetArrayIndex + 1) {
                adaptationSet = adaptationSetArray[adaptationSetArrayIndex];
                representationArray = adaptationSet.Representation_asArray;
                if (adaptationIsType.call(this, adaptationSet, bufferType)) {
                    return representationArray.length;
                }
            }
        }
        return -1;
    }, getBandwidthForRepresentation = function(representationId) {
        var self = this, manifest = self.manifestModel.getValue(), representation, periodArray = manifest.Period_asArray;
        representation = findRepresentionInPeriodArray.call(self, periodArray, representationId);
        if (representation === null) {
            return null;
        }
        return representation.bandwidth;
    }, getIndexForRepresentation = function(representationId) {
        var self = this, manifest = self.manifestModel.getValue(), representationIndex, periodArray = manifest.Period_asArray;
        representationIndex = findRepresentationIndexInPeriodArray.call(self, periodArray, representationId);
        return representationIndex;
    }, getMaxIndexForBufferType = function(bufferType) {
        var self = this, manifest = self.manifestModel.getValue(), maxIndex, periodArray = manifest.Period_asArray;
        maxIndex = findMaxBufferIndex.call(this, periodArray, bufferType);
        return maxIndex;
    }, getCurrentRepresentationSwitch = function(metrics) {
        if (metrics === null) {
            return null;
        }
        var repSwitch = metrics.RepSwitchList, repSwitchLength, repSwitchLastIndex, currentRepSwitch;
        if (repSwitch === null || repSwitch.length <= 0) {
            return null;
        }
        repSwitchLength = repSwitch.length;
        repSwitchLastIndex = repSwitchLength - 1;
        currentRepSwitch = repSwitch[repSwitchLastIndex];
        return currentRepSwitch;
    }, getCurrentBufferLevel = function(metrics) {
        if (metrics === null) {
            return null;
        }
        var bufferLevel = metrics.BufferLevel, bufferLevelLength, bufferLevelLastIndex, currentBufferLevel;
        if (bufferLevel === null || bufferLevel.length <= 0) {
            return null;
        }
        bufferLevelLength = bufferLevel.length;
        bufferLevelLastIndex = bufferLevelLength - 1;
        currentBufferLevel = bufferLevel[bufferLevelLastIndex];
        return currentBufferLevel;
    }, getCurrentHttpRequest = function(metrics) {
        if (metrics === null) {
            return null;
        }
        var httpList = metrics.HttpList, httpListLength, httpListLastIndex, currentHttpList = null;
        if (httpList === null || httpList.length <= 0) {
            return null;
        }
        httpListLength = httpList.length;
        httpListLastIndex = httpListLength - 1;
        while (httpListLastIndex > 0) {
            if (httpList[httpListLastIndex].responsecode) {
                currentHttpList = httpList[httpListLastIndex];
                break;
            }
            httpListLastIndex -= 1;
        }
        return currentHttpList;
    }, getHttpRequests = function(metrics) {
        if (metrics === null) {
            return [];
        }
        return !!metrics.HttpList ? metrics.HttpList : [];
    }, getCurrentDroppedFrames = function(metrics) {
        if (metrics === null) {
            return null;
        }
        var droppedFrames = metrics.DroppedFrames, droppedFramesLength, droppedFramesLastIndex, currentDroppedFrames;
        if (droppedFrames === null || droppedFrames.length <= 0) {
            return null;
        }
        droppedFramesLength = droppedFrames.length;
        droppedFramesLastIndex = droppedFramesLength - 1;
        currentDroppedFrames = droppedFrames[droppedFramesLastIndex];
        return currentDroppedFrames;
    }, getCurrentDVRInfo = function(metrics) {
        if (metrics === null) {
            return null;
        }
        var dvrInfo = metrics.DVRInfo, dvrInfoLastIndex, curentDVRInfo = null;
        if (dvrInfo === null || dvrInfo.length <= 0) {
            return null;
        }
        dvrInfoLastIndex = dvrInfo.length - 1;
        curentDVRInfo = dvrInfo[dvrInfoLastIndex];
        return curentDVRInfo;
    }, getCurrentManifestUpdate = function(metrics) {
        if (metrics === null) return null;
        var manifestUpdate = metrics.ManifestUpdate, ln, lastIdx, currentManifestUpdate;
        if (manifestUpdate === null || manifestUpdate.length <= 0) {
            return null;
        }
        ln = manifestUpdate.length;
        lastIdx = ln - 1;
        currentManifestUpdate = manifestUpdate[lastIdx];
        return currentManifestUpdate;
    };
    return {
        manifestModel: undefined,
        manifestExt: undefined,
        getBandwidthForRepresentation: getBandwidthForRepresentation,
        getIndexForRepresentation: getIndexForRepresentation,
        getMaxIndexForBufferType: getMaxIndexForBufferType,
        getCurrentRepresentationSwitch: getCurrentRepresentationSwitch,
        getCurrentBufferLevel: getCurrentBufferLevel,
        getCurrentHttpRequest: getCurrentHttpRequest,
        getHttpRequests: getHttpRequests,
        getCurrentDroppedFrames: getCurrentDroppedFrames,
        getCurrentDVRInfo: getCurrentDVRInfo,
        getCurrentManifestUpdate: getCurrentManifestUpdate
    };
};

Dash.dependencies.DashMetricsExtensions.prototype = {
    constructor: Dash.dependencies.DashMetricsExtensions
};

Dash.dependencies.DashParser = function() {
    "use strict";
    var SECONDS_IN_YEAR = 365 * 24 * 60 * 60, SECONDS_IN_MONTH = 30 * 24 * 60 * 60, SECONDS_IN_DAY = 24 * 60 * 60, SECONDS_IN_HOUR = 60 * 60, SECONDS_IN_MIN = 60, MINUTES_IN_HOUR = 60, MILLISECONDS_IN_SECONDS = 1e3, durationRegex = /^P(([\d.]*)Y)?(([\d.]*)M)?(([\d.]*)D)?T?(([\d.]*)H)?(([\d.]*)M)?(([\d.]*)S)?/, datetimeRegex = /^([0-9]{4})-([0-9]{2})-([0-9]{2})T([0-9]{2}):([0-9]{2})(?::([0-9]*)(\.[0-9]*)?)?(?:([+-])([0-9]{2})([0-9]{2}))?/, numericRegex = /^[-+]?[0-9]+[.]?[0-9]*([eE][-+]?[0-9]+)?$/, matchers = [ {
        type: "duration",
        test: function(str) {
            return durationRegex.test(str);
        },
        converter: function(str) {
            var match = durationRegex.exec(str);
            return parseFloat(match[2] || 0) * SECONDS_IN_YEAR + parseFloat(match[4] || 0) * SECONDS_IN_MONTH + parseFloat(match[6] || 0) * SECONDS_IN_DAY + parseFloat(match[8] || 0) * SECONDS_IN_HOUR + parseFloat(match[10] || 0) * SECONDS_IN_MIN + parseFloat(match[12] || 0);
        }
    }, {
        type: "datetime",
        test: function(str) {
            return datetimeRegex.test(str);
        },
        converter: function(str) {
            var match = datetimeRegex.exec(str), utcDate;
            utcDate = Date.UTC(parseInt(match[1], 10), parseInt(match[2], 10) - 1, parseInt(match[3], 10), parseInt(match[4], 10), parseInt(match[5], 10), match[6] && parseInt(match[6], 10) || 0, match[7] && parseFloat(match[7]) * MILLISECONDS_IN_SECONDS || 0);
            if (match[9] && match[10]) {
                var timezoneOffset = parseInt(match[9], 10) * MINUTES_IN_HOUR + parseInt(match[10], 10);
                utcDate += (match[8] === "+" ? -1 : +1) * timezoneOffset * SECONDS_IN_MIN * MILLISECONDS_IN_SECONDS;
            }
            return new Date(utcDate);
        }
    }, {
        type: "numeric",
        test: function(str) {
            return numericRegex.test(str);
        },
        converter: function(str) {
            return parseFloat(str);
        }
    } ], getCommonValuesMap = function() {
        var adaptationSet, representation, subRepresentation, common;
        common = [ {
            name: "profiles",
            merge: false
        }, {
            name: "width",
            merge: false
        }, {
            name: "height",
            merge: false
        }, {
            name: "sar",
            merge: false
        }, {
            name: "frameRate",
            merge: false
        }, {
            name: "audioSamplingRate",
            merge: false
        }, {
            name: "mimeType",
            merge: false
        }, {
            name: "segmentProfiles",
            merge: false
        }, {
            name: "codecs",
            merge: false
        }, {
            name: "maximumSAPPeriod",
            merge: false
        }, {
            name: "startsWithSap",
            merge: false
        }, {
            name: "maxPlayoutRate",
            merge: false
        }, {
            name: "codingDependency",
            merge: false
        }, {
            name: "scanType",
            merge: false
        }, {
            name: "FramePacking",
            merge: true
        }, {
            name: "AudioChannelConfiguration",
            merge: true
        }, {
            name: "ContentProtection",
            merge: true
        } ];
        adaptationSet = {};
        adaptationSet.name = "AdaptationSet";
        adaptationSet.isRoot = false;
        adaptationSet.isArray = true;
        adaptationSet.parent = null;
        adaptationSet.children = [];
        adaptationSet.properties = common;
        representation = {};
        representation.name = "Representation";
        representation.isRoot = false;
        representation.isArray = true;
        representation.parent = adaptationSet;
        representation.children = [];
        representation.properties = common;
        adaptationSet.children.push(representation);
        subRepresentation = {};
        subRepresentation.name = "SubRepresentation";
        subRepresentation.isRoot = false;
        subRepresentation.isArray = true;
        subRepresentation.parent = representation;
        subRepresentation.children = [];
        subRepresentation.properties = common;
        representation.children.push(subRepresentation);
        return adaptationSet;
    }, getSegmentValuesMap = function() {
        var period, adaptationSet, representation, common;
        common = [ {
            name: "SegmentBase",
            merge: true
        }, {
            name: "SegmentTemplate",
            merge: true
        }, {
            name: "SegmentList",
            merge: true
        } ];
        period = {};
        period.name = "Period";
        period.isRoot = false;
        period.isArray = true;
        period.parent = null;
        period.children = [];
        period.properties = common;
        adaptationSet = {};
        adaptationSet.name = "AdaptationSet";
        adaptationSet.isRoot = false;
        adaptationSet.isArray = true;
        adaptationSet.parent = period;
        adaptationSet.children = [];
        adaptationSet.properties = common;
        period.children.push(adaptationSet);
        representation = {};
        representation.name = "Representation";
        representation.isRoot = false;
        representation.isArray = true;
        representation.parent = adaptationSet;
        representation.children = [];
        representation.properties = common;
        adaptationSet.children.push(representation);
        return period;
    }, getBaseUrlValuesMap = function() {
        var mpd, period, adaptationSet, representation, common;
        common = [ {
            name: "BaseURL",
            merge: true,
            mergeFunction: function(parentValue, childValue) {
                var mergedValue;
                if (childValue.indexOf("http://") === 0) {
                    mergedValue = childValue;
                } else {
                    mergedValue = parentValue + childValue;
                }
                return mergedValue;
            }
        } ];
        mpd = {};
        mpd.name = "mpd";
        mpd.isRoot = true;
        mpd.isArray = true;
        mpd.parent = null;
        mpd.children = [];
        mpd.properties = common;
        period = {};
        period.name = "Period";
        period.isRoot = false;
        period.isArray = true;
        period.parent = null;
        period.children = [];
        period.properties = common;
        mpd.children.push(period);
        adaptationSet = {};
        adaptationSet.name = "AdaptationSet";
        adaptationSet.isRoot = false;
        adaptationSet.isArray = true;
        adaptationSet.parent = period;
        adaptationSet.children = [];
        adaptationSet.properties = common;
        period.children.push(adaptationSet);
        representation = {};
        representation.name = "Representation";
        representation.isRoot = false;
        representation.isArray = true;
        representation.parent = adaptationSet;
        representation.children = [];
        representation.properties = common;
        adaptationSet.children.push(representation);
        return mpd;
    }, getDashMap = function() {
        var result = [];
        result.push(getCommonValuesMap());
        result.push(getSegmentValuesMap());
        result.push(getBaseUrlValuesMap());
        return result;
    }, internalParse = function(data, baseUrl) {
        var manifest, converter = new X2JS(matchers, "", true), iron = new ObjectIron(getDashMap()), start = new Date(), json = null, ironed = null;
        try {
            manifest = converter.xml_str2json(data);
            json = new Date();
            if (!manifest.hasOwnProperty("BaseURL")) {
                manifest.BaseURL = baseUrl;
            } else {
                manifest.BaseURL = manifest.BaseURL_asArray[0];
                if (manifest.BaseURL.toString().indexOf("http") !== 0) {
                    manifest.BaseURL = baseUrl + manifest.BaseURL;
                }
            }
            iron.run(manifest);
            ironed = new Date();
            this.debug.log("Parsing complete: ( xml2json: " + (json.getTime() - start.getTime()) + "ms, objectiron: " + (ironed.getTime() - json.getTime()) + "ms, total: " + (ironed.getTime() - start.getTime()) / 1e3 + "s)");
        } catch (err) {
            this.errHandler.manifestError("parsing the manifest failed", "parse", data);
            return Q.reject(err);
        }
        return Q.when(manifest);
    };
    return {
        debug: undefined,
        errHandler: undefined,
        parse: internalParse
    };
};

Dash.dependencies.DashParser.prototype = {
    constructor: Dash.dependencies.DashParser
};

Dash.dependencies.FragmentExtensions = function() {
    "use strict";
    var parseTFDT = function(ab) {
        var deferred = Q.defer(), d = new DataView(ab), pos = 0, base_media_decode_time, version, size, type, i, c;
        while (type !== "tfdt" && pos < d.byteLength) {
            size = d.getUint32(pos);
            pos += 4;
            type = "";
            for (i = 0; i < 4; i += 1) {
                c = d.getInt8(pos);
                type += String.fromCharCode(c);
                pos += 1;
            }
            if (type !== "moof" && type !== "traf" && type !== "tfdt") {
                pos += size - 8;
            }
        }
        if (pos === d.byteLength) {
            throw "Error finding live offset.";
        }
        version = d.getUint8(pos);
        this.debug.log("position: " + pos);
        if (version === 0) {
            pos += 4;
            base_media_decode_time = d.getUint32(pos, false);
        } else {
            pos += size - 16;
            base_media_decode_time = utils.Math.to64BitNumber(d.getUint32(pos + 4, false), d.getUint32(pos, false));
        }
        deferred.resolve({
            version: version,
            base_media_decode_time: base_media_decode_time
        });
        return deferred.promise;
    }, parseSIDX = function(ab) {
        var d = new DataView(ab), pos = 0, version, timescale, earliest_presentation_time, i, type, size, charCode;
        while (type !== "sidx" && pos < d.byteLength) {
            size = d.getUint32(pos);
            pos += 4;
            type = "";
            for (i = 0; i < 4; i += 1) {
                charCode = d.getInt8(pos);
                type += String.fromCharCode(charCode);
                pos += 1;
            }
            if (type !== "moof" && type !== "traf" && type !== "sidx") {
                pos += size - 8;
            } else if (type === "sidx") {
                pos -= 8;
            }
        }
        version = d.getUint8(pos + 8);
        pos += 12;
        timescale = d.getUint32(pos + 4, false);
        pos += 8;
        if (version === 0) {
            earliest_presentation_time = d.getUint32(pos, false);
        } else {
            earliest_presentation_time = utils.Math.to64BitNumber(d.getUint32(pos + 4, false), d.getUint32(pos, false));
        }
        return Q.when({
            earliestPresentationTime: earliest_presentation_time,
            timescale: timescale
        });
    }, loadFragment = function(media) {
        var deferred = Q.defer(), request = new XMLHttpRequest(), url, loaded = false, errorStr, parsed;
        url = media;
        request.onloadend = function() {
            if (!loaded) {
                errorStr = "Error loading fragment: " + url;
                deferred.reject(errorStr);
            }
        };
        request.onload = function() {
            loaded = true;
            parsed = parseTFDT(request.response);
            deferred.resolve(parsed);
        };
        request.onerror = function() {
            errorStr = "Error loading fragment: " + url;
            deferred.reject(errorStr);
        };
        request.responseType = "arraybuffer";
        request.open("GET", url);
        request.send(null);
        return deferred.promise;
    };
    return {
        debug: undefined,
        loadFragment: loadFragment,
        parseTFDT: parseTFDT,
        parseSIDX: parseSIDX
    };
};

Dash.dependencies.FragmentExtensions.prototype = {
    constructor: Dash.dependencies.FragmentExtensions
};

Dash.dependencies.TimelineConverter = function() {
    "use strict";
    var clientServerTimeShift = 0, calcAvailabilityTimeFromPresentationTime = function(presentationTime, mpd, isDynamic, calculateEnd) {
        var availabilityTime = NaN;
        if (calculateEnd) {
            if (isDynamic && mpd.timeShiftBufferDepth != Number.POSITIVE_INFINITY) {
                availabilityTime = new Date(mpd.availabilityStartTime.getTime() + (presentationTime + mpd.timeShiftBufferDepth) * 1e3);
            } else {
                availabilityTime = mpd.availabilityEndTime;
            }
        } else {
            if (isDynamic) {
                availabilityTime = new Date(mpd.availabilityStartTime.getTime() + presentationTime * 1e3);
            } else {
                availabilityTime = mpd.availabilityStartTime;
            }
        }
        return availabilityTime;
    }, calcAvailabilityStartTimeFromPresentationTime = function(presentationTime, mpd, isDynamic) {
        return calcAvailabilityTimeFromPresentationTime.call(this, presentationTime, mpd, isDynamic);
    }, calcAvailabilityEndTimeFromPresentationTime = function(presentationTime, mpd, isDynamic) {
        return calcAvailabilityTimeFromPresentationTime.call(this, presentationTime, mpd, isDynamic, true);
    }, calcPresentationStartTime = function(period) {
        var presentationStartTime, isDynamic = period.mpd.manifest.type === "dynamic", startTimeOffset = parseInt(this.uriQueryFragModel.getURIFragmentData.s);
        if (isDynamic) {
            if (!isNaN(startTimeOffset) && startTimeOffset > 1262304e3) {
                presentationStartTime = startTimeOffset - period.mpd.availabilityStartTime.getTime() / 1e3;
                if (presentationStartTime > period.liveEdge || presentationStartTime < period.liveEdge - period.mpd.timeShiftBufferDepth) {
                    presentationStartTime = null;
                }
            }
            presentationStartTime = presentationStartTime || period.liveEdge;
        } else {
            if (!isNaN(startTimeOffset) && startTimeOffset < period.duration && startTimeOffset >= 0) {
                presentationStartTime = startTimeOffset;
            } else {
                presentationStartTime = period.start;
            }
        }
        return presentationStartTime;
    }, calcPresentationTimeFromWallTime = function(wallTime, period) {
        return (wallTime.getTime() - period.mpd.availabilityStartTime.getTime()) / 1e3;
    }, calcPresentationTimeFromMediaTime = function(mediaTime, representation) {
        var presentationOffset = representation.presentationTimeOffset;
        return mediaTime - presentationOffset;
    }, calcMediaTimeFromPresentationTime = function(presentationTime, representation) {
        var presentationOffset = representation.presentationTimeOffset;
        return presentationOffset + presentationTime;
    }, calcWallTimeForSegment = function(segment, isDynamic) {
        var suggestedPresentationDelay, displayStartTime, wallTime;
        if (isDynamic) {
            suggestedPresentationDelay = segment.representation.adaptation.period.mpd.suggestedPresentationDelay;
            displayStartTime = segment.presentationStartTime + suggestedPresentationDelay;
            wallTime = new Date(segment.availabilityStartTime.getTime() + displayStartTime * 1e3);
        }
        return wallTime;
    }, calcActualPresentationTime = function(representation, currentTime, isDynamic) {
        var self = this, periodStart = representation.adaptation.period.start, availabilityWindow = self.calcSegmentAvailabilityRange(representation, isDynamic), actualTime;
        if (currentTime >= availabilityWindow.start + periodStart && currentTime <= availabilityWindow.end + periodStart) {
            return currentTime;
        }
        actualTime = Math.max(availabilityWindow.end - representation.adaptation.period.mpd.manifest.minBufferTime * 2, availabilityWindow.start);
        return actualTime;
    }, calcSegmentAvailabilityRange = function(representation, isDynamic) {
        var duration = representation.segmentDuration, start = 0, end = representation.adaptation.period.duration, range = {
            start: start,
            end: end
        }, checkTime, now;
        if (!isDynamic) return range;
        if ((!representation.adaptation.period.mpd.isClientServerTimeSyncCompleted || isNaN(duration)) && representation.segmentAvailabilityRange) {
            return representation.segmentAvailabilityRange;
        }
        checkTime = representation.adaptation.period.mpd.checkTime;
        now = calcPresentationTimeFromWallTime(new Date(new Date().getTime() + clientServerTimeShift), representation.adaptation.period);
        start = Math.max(now - representation.adaptation.period.mpd.timeShiftBufferDepth, 0);
        checkTime += clientServerTimeShift / 1e3;
        end = isNaN(checkTime) ? now : Math.min(checkTime, now);
        range = {
            start: start,
            end: end
        };
        return range;
    }, liveEdgeFound = function(expectedLiveEdge, actualLiveEdge, period) {
        if (period.mpd.isClientServerTimeSyncCompleted) return;
        period.mpd.clientServerTimeShift = actualLiveEdge - expectedLiveEdge;
        period.mpd.isClientServerTimeSyncCompleted = true;
        clientServerTimeShift = period.mpd.clientServerTimeShift * 1e3;
    }, calcMSETimeOffset = function(representation) {
        var presentationOffset = representation.presentationTimeOffset;
        return -presentationOffset;
    };
    return {
        system: undefined,
        debug: undefined,
        uriQueryFragModel: undefined,
        setup: function() {
            this.system.mapHandler("liveEdgeFound", undefined, liveEdgeFound.bind(this));
        },
        calcAvailabilityStartTimeFromPresentationTime: calcAvailabilityStartTimeFromPresentationTime,
        calcAvailabilityEndTimeFromPresentationTime: calcAvailabilityEndTimeFromPresentationTime,
        calcPresentationTimeFromWallTime: calcPresentationTimeFromWallTime,
        calcPresentationTimeFromMediaTime: calcPresentationTimeFromMediaTime,
        calcPresentationStartTime: calcPresentationStartTime,
        calcActualPresentationTime: calcActualPresentationTime,
        calcMediaTimeFromPresentationTime: calcMediaTimeFromPresentationTime,
        calcSegmentAvailabilityRange: calcSegmentAvailabilityRange,
        calcWallTimeForSegment: calcWallTimeForSegment,
        calcMSETimeOffset: calcMSETimeOffset
    };
};

Dash.dependencies.TimelineConverter.prototype = {
    constructor: Dash.dependencies.TimelineConverter
};

Dash.vo.AdaptationSet = function() {
    "use strict";
    this.period = null;
    this.index = -1;
};

Dash.vo.AdaptationSet.prototype = {
    constructor: Dash.vo.AdaptationSet
};

Dash.vo.Event = function() {
    "use strict";
    this.duration = NaN;
    this.presentationTime = NaN;
    this.id = NaN;
    this.messageData = "";
    this.eventStream = null;
    this.presentationTimeDelta = NaN;
};

Dash.vo.Event.prototype = {
    constructor: Dash.vo.Event
};

Dash.vo.EventStream = function() {
    "use strict";
    this.adaptionSet = null;
    this.representation = null;
    this.period = null;
    this.timescale = 1;
    this.value = "";
    this.schemeIdUri = "";
};

Dash.vo.EventStream.prototype = {
    constructor: Dash.vo.EventStream
};

Dash.vo.Mpd = function() {
    "use strict";
    this.manifest = null;
    this.suggestedPresentationDelay = 0;
    this.availabilityStartTime = null;
    this.availabilityEndTime = Number.POSITIVE_INFINITY;
    this.timeShiftBufferDepth = Number.POSITIVE_INFINITY;
    this.maxSegmentDuration = Number.POSITIVE_INFINITY;
    this.checkTime = NaN;
    this.clientServerTimeShift = 0;
    this.isClientServerTimeSyncCompleted = false;
};

Dash.vo.Mpd.prototype = {
    constructor: Dash.vo.Mpd
};

Dash.vo.Period = function() {
    "use strict";
    this.id = null;
    this.index = -1;
    this.duration = NaN;
    this.start = NaN;
    this.mpd = null;
    this.liveEdge = NaN;
};

Dash.vo.Period.prototype = {
    constructor: Dash.vo.Period
};

Dash.vo.Representation = function() {
    "use strict";
    this.id = null;
    this.index = -1;
    this.adaptation = null;
    this.segmentInfoType = null;
    this.initialization = null;
    this.segmentDuration = NaN;
    this.timescale = 1;
    this.startNumber = 1;
    this.indexRange = null;
    this.range = null;
    this.presentationTimeOffset = 0;
    this.MSETimeOffset = NaN;
    this.segmentAvailabilityRange = null;
    this.availableSegmentsNumber = 0;
};

Dash.vo.Representation.prototype = {
    constructor: Dash.vo.Representation
};

Dash.vo.Segment = function() {
    "use strict";
    this.indexRange = null;
    this.index = null;
    this.mediaRange = null;
    this.media = null;
    this.duration = NaN;
    this.replacementTime = null;
    this.replacementNumber = NaN;
    this.mediaStartTime = NaN;
    this.presentationStartTime = NaN;
    this.availabilityStartTime = NaN;
    this.availabilityEndTime = NaN;
    this.availabilityIdx = NaN;
    this.wallStartTime = NaN;
    this.representation = null;
};

Dash.vo.Segment.prototype = {
    constructor: Dash.vo.Segment
};

MediaPlayer.dependencies.AbrController = function() {
    "use strict";
    var autoSwitchBitrate = true, qualityDict = {}, confidenceDict = {}, getInternalQuality = function(type) {
        var quality;
        if (!qualityDict.hasOwnProperty(type)) {
            qualityDict[type] = 0;
        }
        quality = qualityDict[type];
        return quality;
    }, setInternalQuality = function(type, value) {
        qualityDict[type] = value;
    }, getInternalConfidence = function(type) {
        var confidence;
        if (!confidenceDict.hasOwnProperty(type)) {
            confidenceDict[type] = 0;
        }
        confidence = confidenceDict[type];
        return confidence;
    }, setInternalConfidence = function(type, value) {
        confidenceDict[type] = value;
    };
    return {
        debug: undefined,
        abrRulesCollection: undefined,
        manifestExt: undefined,
        metricsModel: undefined,
        getAutoSwitchBitrate: function() {
            return autoSwitchBitrate;
        },
        setAutoSwitchBitrate: function(value) {
            autoSwitchBitrate = value;
        },
        getMetricsFor: function(data) {
            var deferred = Q.defer(), self = this;
            self.manifestExt.getIsVideo(data).then(function(isVideo) {
                if (isVideo) {
                    deferred.resolve(self.metricsModel.getMetricsFor("video"));
                } else {
                    self.manifestExt.getIsAudio(data).then(function(isAudio) {
                        if (isAudio) {
                            deferred.resolve(self.metricsModel.getMetricsFor("audio"));
                        } else {
                            deferred.resolve(self.metricsModel.getMetricsFor("stream"));
                        }
                    });
                }
            });
            return deferred.promise;
        },
        getPlaybackQuality: function(type, data) {
            var self = this, deferred = Q.defer(), newQuality = MediaPlayer.rules.SwitchRequest.prototype.NO_CHANGE, newConfidence = MediaPlayer.rules.SwitchRequest.prototype.NO_CHANGE, i, len, funcs = [], req, values, quality, confidence;
            quality = getInternalQuality(type);
            confidence = getInternalConfidence(type);
            if (autoSwitchBitrate) {
                self.getMetricsFor(data).then(function(metrics) {
                    self.abrRulesCollection.getRules().then(function(rules) {
                        for (i = 0, len = rules.length; i < len; i += 1) {
                            funcs.push(rules[i].checkIndex(quality, metrics, data));
                        }
                        Q.all(funcs).then(function(results) {
                            values = {};
                            values[MediaPlayer.rules.SwitchRequest.prototype.STRONG] = MediaPlayer.rules.SwitchRequest.prototype.NO_CHANGE;
                            values[MediaPlayer.rules.SwitchRequest.prototype.WEAK] = MediaPlayer.rules.SwitchRequest.prototype.NO_CHANGE;
                            values[MediaPlayer.rules.SwitchRequest.prototype.DEFAULT] = MediaPlayer.rules.SwitchRequest.prototype.NO_CHANGE;
                            for (i = 0, len = results.length; i < len; i += 1) {
                                req = results[i];
                                if (req.quality !== MediaPlayer.rules.SwitchRequest.prototype.NO_CHANGE) {
                                    values[req.priority] = Math.min(values[req.priority], req.quality);
                                }
                            }
                            if (values[MediaPlayer.rules.SwitchRequest.prototype.WEAK] !== MediaPlayer.rules.SwitchRequest.prototype.NO_CHANGE) {
                                newConfidence = MediaPlayer.rules.SwitchRequest.prototype.WEAK;
                                newQuality = values[MediaPlayer.rules.SwitchRequest.prototype.WEAK];
                            }
                            if (values[MediaPlayer.rules.SwitchRequest.prototype.DEFAULT] !== MediaPlayer.rules.SwitchRequest.prototype.NO_CHANGE) {
                                newConfidence = MediaPlayer.rules.SwitchRequest.prototype.DEFAULT;
                                newQuality = values[MediaPlayer.rules.SwitchRequest.prototype.DEFAULT];
                            }
                            if (values[MediaPlayer.rules.SwitchRequest.prototype.STRONG] !== MediaPlayer.rules.SwitchRequest.prototype.NO_CHANGE) {
                                newConfidence = MediaPlayer.rules.SwitchRequest.prototype.STRONG;
                                newQuality = values[MediaPlayer.rules.SwitchRequest.prototype.STRONG];
                            }
                            if (newQuality !== MediaPlayer.rules.SwitchRequest.prototype.NO_CHANGE && newQuality !== undefined) {
                                quality = newQuality;
                            }
                            if (newConfidence !== MediaPlayer.rules.SwitchRequest.prototype.NO_CHANGE && newConfidence !== undefined) {
                                confidence = newConfidence;
                            }
                            self.manifestExt.getRepresentationCount(data).then(function(max) {
                                if (quality < 0) {
                                    quality = 0;
                                }
                                if (quality >= max) {
                                    quality = max - 1;
                                }
                                if (confidence != MediaPlayer.rules.SwitchRequest.prototype.STRONG && confidence != MediaPlayer.rules.SwitchRequest.prototype.WEAK) {
                                    confidence = MediaPlayer.rules.SwitchRequest.prototype.DEFAULT;
                                }
                                setInternalQuality(type, quality);
                                setInternalConfidence(type, confidence);
                                deferred.resolve({
                                    quality: quality,
                                    confidence: confidence
                                });
                            });
                        });
                    });
                });
            } else {
                self.debug.log("Unchanged quality of " + quality);
                deferred.resolve({
                    quality: quality,
                    confidence: confidence
                });
            }
            return deferred.promise;
        },
        setPlaybackQuality: function(type, newPlaybackQuality) {
            var quality = getInternalQuality(type);
            if (newPlaybackQuality !== quality) {
                setInternalQuality(type, newPlaybackQuality);
            }
        },
        getQualityFor: function(type) {
            return getInternalQuality(type);
        }
    };
};

MediaPlayer.dependencies.AbrController.prototype = {
    constructor: MediaPlayer.dependencies.AbrController
};

MediaPlayer.dependencies.BufferController = function() {
    "use strict";
    var STALL_THRESHOLD = .5, QUOTA_EXCEEDED_ERROR_CODE = 22, WAITING = "WAITING", READY = "READY", VALIDATING = "VALIDATING", LOADING = "LOADING", state = WAITING, ready = false, started = false, waitingForBuffer = false, initialPlayback = true, initializationData = [], seeking = false, seekTarget = -1, dataChanged = true, availableRepresentations, currentRepresentation, playingTime, requiredQuality = -1, currentQuality = -1, stalled = false, isDynamic = false, isBufferingCompleted = false, deferredAppends = [], deferredInitAppend = null, deferredStreamComplete = Q.defer(), deferredRejectedDataAppend = null, deferredBuffersFlatten = null, periodInfo = null, fragmentsToLoad = 0, fragmentModel = null, bufferLevel = 0, isQuotaExceeded = false, rejectedBytes = null, fragmentDuration = 0, appendingRejectedData = false, mediaSource, timeoutId = null, liveEdgeSearchRange = null, liveEdgeInitialSearchPosition = null, liveEdgeSearchStep = null, deferredLiveEdge, useBinarySearch = false, type, data = null, buffer = null, minBufferTime, playListMetrics = null, playListTraceMetrics = null, playListTraceMetricsClosed = true, inbandEventFound = false, setState = function(value) {
        var self = this;
        state = value;
        if (fragmentModel !== null) {
            self.fragmentController.onBufferControllerStateChange();
        }
    }, clearPlayListTraceMetrics = function(endTime, stopreason) {
        var duration = 0, startTime = null;
        if (playListTraceMetricsClosed === false) {
            startTime = playListTraceMetrics.start;
            duration = endTime.getTime() - startTime.getTime();
            playListTraceMetrics.duration = duration;
            playListTraceMetrics.stopreason = stopreason;
            playListTraceMetricsClosed = true;
        }
    }, startPlayback = function() {
        if (!ready || !started) {
            return;
        }
        setState.call(this, READY);
        this.requestScheduler.startScheduling(this, validate);
        fragmentModel = this.fragmentController.attachBufferController(this);
    }, doStart = function() {
        var currentTime;
        if (this.requestScheduler.isScheduled(this)) {
            return;
        }
        if (seeking === false) {
            currentTime = new Date();
            clearPlayListTraceMetrics(currentTime, MediaPlayer.vo.metrics.PlayList.Trace.USER_REQUEST_STOP_REASON);
            playListMetrics = this.metricsModel.addPlayList(type, currentTime, 0, MediaPlayer.vo.metrics.PlayList.INITIAL_PLAY_START_REASON);
        }
        this.debug.log("BufferController " + type + " start.");
        started = true;
        waitingForBuffer = true;
        startPlayback.call(this);
    }, doSeek = function(time) {
        var currentTime;
        this.debug.log("BufferController " + type + " seek: " + time);
        seeking = true;
        seekTarget = time;
        currentTime = new Date();
        clearPlayListTraceMetrics(currentTime, MediaPlayer.vo.metrics.PlayList.Trace.USER_REQUEST_STOP_REASON);
        playListMetrics = this.metricsModel.addPlayList(type, currentTime, seekTarget, MediaPlayer.vo.metrics.PlayList.SEEK_START_REASON);
        doStart.call(this);
    }, doStop = function() {
        if (state === WAITING) return;
        this.debug.log("BufferController " + type + " stop.");
        setState.call(this, isBufferingCompleted ? READY : WAITING);
        this.requestScheduler.stopScheduling(this);
        this.fragmentController.cancelPendingRequestsForModel(fragmentModel);
        started = false;
        waitingForBuffer = false;
        clearPlayListTraceMetrics(new Date(), MediaPlayer.vo.metrics.PlayList.Trace.USER_REQUEST_STOP_REASON);
    }, updateRepresentations = function(data, periodInfo) {
        var self = this, deferred = Q.defer(), manifest = self.manifestModel.getValue();
        self.manifestExt.getDataIndex(data, manifest, periodInfo.index).then(function(idx) {
            self.manifestExt.getAdaptationsForPeriod(manifest, periodInfo).then(function(adaptations) {
                self.manifestExt.getRepresentationsForAdaptation(manifest, adaptations[idx]).then(function(representations) {
                    deferred.resolve(representations);
                });
            });
        });
        return deferred.promise;
    }, getRepresentationForQuality = function(quality) {
        return availableRepresentations[quality];
    }, finishValidation = function() {
        var self = this;
        if (state === LOADING) {
            if (stalled) {
                stalled = false;
                this.videoModel.stallStream(type, stalled);
            }
            setState.call(self, READY);
        }
    }, onBytesLoadingStart = function(request) {
        if (this.fragmentController.isInitializationRequest(request)) {
            setState.call(this, READY);
        } else {
            setState.call(this, LOADING);
            var self = this, time = self.fragmentController.getLoadingTime(self);
            if (timeoutId !== null) return;
            timeoutId = setTimeout(function() {
                if (!hasData()) return;
                setState.call(self, READY);
                requestNewFragment.call(self);
                timeoutId = null;
            }, time);
        }
    }, onBytesLoaded = function(request, response) {
        if (this.fragmentController.isInitializationRequest(request)) {
            onInitializationLoaded.call(this, request, response);
        } else {
            onMediaLoaded.call(this, request, response);
        }
    }, onMediaLoaded = function(request, response) {
        var self = this, currentRepresentation = getRepresentationForQuality.call(self, request.quality), eventStreamAdaption = this.manifestExt.getEventStreamForAdaptationSet(self.getData()), eventStreamRepresentation = this.manifestExt.getEventStreamForRepresentation(self.getData(), currentRepresentation);
        if (!fragmentDuration && !isNaN(request.duration)) {
            fragmentDuration = request.duration;
        }
        self.fragmentController.process(response.data).then(function(data) {
            if (data !== null && deferredInitAppend !== null) {
                if (eventStreamAdaption.length > 0 || eventStreamRepresentation.length > 0) {
                    handleInbandEvents.call(self, data, request, eventStreamAdaption, eventStreamRepresentation).then(function(events) {
                        self.eventController.addInbandEvents(events);
                    });
                }
                Q.when(deferredInitAppend.promise).then(function() {
                    deleteInbandEvents.call(self, data).then(function(data) {
                        appendToBuffer.call(self, data, request.quality, request.index).then(function() {
                            deferredStreamComplete.promise.then(function(lastRequest) {
                                if (lastRequest.index - 1 === request.index && !isBufferingCompleted) {
                                    isBufferingCompleted = true;
                                    if (stalled) {
                                        stalled = false;
                                        self.videoModel.stallStream(type, stalled);
                                    }
                                    setState.call(self, READY);
                                    self.system.notify("bufferingCompleted");
                                }
                            });
                        });
                    });
                });
            } else {
                self.debug.log("No " + type + " bytes to push.");
            }
        });
    }, appendToBuffer = function(data, quality, index) {
        var self = this, req, isInit = index === undefined, isAppendingRejectedData = rejectedBytes && data == rejectedBytes.data, deferred = isAppendingRejectedData ? deferredRejectedDataAppend : Q.defer(), ln = isAppendingRejectedData ? deferredAppends.length : deferredAppends.push(deferred), currentVideoTime = self.videoModel.getCurrentTime(), currentTime = new Date();
        if (playListTraceMetricsClosed === true && state !== WAITING && requiredQuality !== -1) {
            playListTraceMetricsClosed = false;
            playListTraceMetrics = self.metricsModel.appendPlayListTrace(playListMetrics, currentRepresentation.id, null, currentTime, currentVideoTime, null, 1, null);
        }
        Q.when(isAppendingRejectedData || ln < 2 || deferredAppends[ln - 2].promise).then(function() {
            if (!hasData()) return;
            hasEnoughSpaceToAppend.call(self).then(function() {
                if (quality !== requiredQuality && isInit || quality !== currentQuality && !isInit) {
                    req = fragmentModel.getExecutedRequestForQualityAndIndex(quality, index);
                    if (req) {
                        window.removed = req;
                        fragmentModel.removeExecutedRequest(req);
                        if (!isInit) {
                            self.indexHandler.getSegmentRequestForTime(currentRepresentation, req.startTime).then(onFragmentRequest.bind(self));
                        }
                    }
                    deferred.resolve();
                    if (isAppendingRejectedData) {
                        deferredRejectedDataAppend = null;
                        rejectedBytes = null;
                    }
                    return;
                }
                Q.when(deferredBuffersFlatten ? deferredBuffersFlatten.promise : true).then(function() {
                    if (!hasData()) return;
                    self.sourceBufferExt.append(buffer, data, self.videoModel).then(function() {
                        if (isAppendingRejectedData) {
                            deferredRejectedDataAppend = null;
                            rejectedBytes = null;
                        }
                        if (isInit) {
                            currentQuality = quality;
                        }
                        if (!self.requestScheduler.isScheduled(self) && isSchedulingRequired.call(self)) {
                            doStart.call(self);
                        }
                        isQuotaExceeded = false;
                        updateBufferLevel.call(self).then(function() {
                            deferred.resolve();
                        });
                        self.sourceBufferExt.getAllRanges(buffer).then(function(ranges) {
                            if (ranges) {
                                if (ranges.length > 0) {
                                    var i, len;
                                    for (i = 0, len = ranges.length; i < len; i += 1) {
                                        self.debug.log("Buffered " + type + " Range: " + ranges.start(i) + " - " + ranges.end(i));
                                    }
                                }
                            }
                        });
                    }, function(result) {
                        if (result.err.code === QUOTA_EXCEEDED_ERROR_CODE) {
                            rejectedBytes = {
                                data: data,
                                quality: quality,
                                index: index
                            };
                            deferredRejectedDataAppend = deferred;
                            isQuotaExceeded = true;
                            fragmentsToLoad = 0;
                            doStop.call(self);
                        }
                    });
                });
            });
        });
        return deferred.promise;
    }, updateBufferLevel = function() {
        if (!hasData()) return Q.when(false);
        var self = this, deferred = Q.defer(), currentTime = getWorkingTime.call(self);
        self.manifestExt.getMpd(self.manifestModel.getValue()).then(function(mpd) {
            var range = self.timelineConverter.calcSegmentAvailabilityRange(currentRepresentation, isDynamic);
            self.metricsModel.addDVRInfo(type, currentTime, mpd, range);
        });
        self.sourceBufferExt.getBufferLength(buffer, currentTime).then(function(bufferLength) {
            if (!hasData()) {
                deferred.reject();
                return;
            }
            bufferLevel = bufferLength;
            self.metricsModel.addBufferLevel(type, new Date(), bufferLevel);
            checkGapBetweenBuffers.call(self);
            checkIfSufficientBuffer.call(self);
            deferred.resolve();
        });
        return deferred.promise;
    }, handleInbandEvents = function(data, request, adaptionSetInbandEvents, representationInbandEvents) {
        var events = [], i = 0, identifier, size, expTwo = Math.pow(256, 2), expThree = Math.pow(256, 3), segmentStarttime = Math.max(isNaN(request.startTime) ? 0 : request.startTime, 0), eventStreams = [], inbandEvents;
        inbandEventFound = false;
        inbandEvents = adaptionSetInbandEvents.concat(representationInbandEvents);
        for (var loop = 0; loop < inbandEvents.length; loop++) {
            eventStreams[inbandEvents[loop].schemeIdUri] = inbandEvents[loop];
        }
        while (i < data.length) {
            identifier = String.fromCharCode(data[i + 4], data[i + 5], data[i + 6], data[i + 7]);
            size = data[i] * expThree + data[i + 1] * expTwo + data[i + 2] * 256 + data[i + 3] * 1;
            if (identifier == "moov" || identifier == "moof") {
                break;
            } else if (identifier == "emsg") {
                inbandEventFound = true;
                var eventBox = [ "", "", 0, 0, 0, 0, "" ], arrIndex = 0, j = i + 12;
                while (j < size + i) {
                    if (arrIndex === 0 || arrIndex == 1 || arrIndex == 6) {
                        if (data[j] !== 0) {
                            eventBox[arrIndex] += String.fromCharCode(data[j]);
                        } else {
                            arrIndex += 1;
                        }
                        j += 1;
                    } else {
                        eventBox[arrIndex] = data[j] * expThree + data[j + 1] * expTwo + data[j + 2] * 256 + data[j + 3] * 1;
                        j += 4;
                        arrIndex += 1;
                    }
                }
                var schemeIdUri = eventBox[0], value = eventBox[1], timescale = eventBox[2], presentationTimeDelta = eventBox[3], duration = eventBox[4], id = eventBox[5], messageData = eventBox[6], presentationTime = segmentStarttime * timescale + presentationTimeDelta;
                if (eventStreams[schemeIdUri]) {
                    var event = new Dash.vo.Event();
                    event.eventStream = eventStreams[schemeIdUri];
                    event.eventStream.value = value;
                    event.eventStream.timescale = timescale;
                    event.duration = duration;
                    event.id = id;
                    event.presentationTime = presentationTime;
                    event.messageData = messageData;
                    event.presentationTimeDelta = presentationTimeDelta;
                    events.push(event);
                }
            }
            i += size;
        }
        return Q.when(events);
    }, deleteInbandEvents = function(data) {
        if (!inbandEventFound) {
            return Q.when(data);
        }
        var length = data.length, i = 0, j = 0, identifier, size, expTwo = Math.pow(256, 2), expThree = Math.pow(256, 3), modData = new Uint8Array(data.length);
        while (i < length) {
            identifier = String.fromCharCode(data[i + 4], data[i + 5], data[i + 6], data[i + 7]);
            size = data[i] * expThree + data[i + 1] * expTwo + data[i + 2] * 256 + data[i + 3] * 1;
            if (identifier != "emsg") {
                for (var l = i; l < i + size; l++) {
                    modData[j] = data[l];
                    j += 1;
                }
            }
            i += size;
        }
        return Q.when(modData.subarray(0, j));
    }, checkGapBetweenBuffers = function() {
        var leastLevel = this.bufferExt.getLeastBufferLevel(), acceptableGap = fragmentDuration * 2, actualGap = bufferLevel - leastLevel;
        if (actualGap > acceptableGap && !deferredBuffersFlatten) {
            fragmentsToLoad = 0;
            deferredBuffersFlatten = Q.defer();
        } else if (actualGap < acceptableGap && deferredBuffersFlatten) {
            deferredBuffersFlatten.resolve();
            deferredBuffersFlatten = null;
        }
    }, hasEnoughSpaceToAppend = function() {
        var self = this, deferred = Q.defer(), removedTime = 0, startClearing;
        if (!isQuotaExceeded) {
            return Q.when(true);
        }
        startClearing = function() {
            clearBuffer.call(self).then(function(removedTimeValue) {
                removedTime += removedTimeValue;
                if (removedTime >= fragmentDuration) {
                    deferred.resolve();
                } else {
                    setTimeout(startClearing, fragmentDuration * 1e3);
                }
            });
        };
        startClearing.call(self);
        return deferred.promise;
    }, clearBuffer = function() {
        var self = this, deferred = Q.defer(), currentTime = self.videoModel.getCurrentTime(), removeStart = 0, removeEnd, req;
        req = self.fragmentController.getExecutedRequestForTime(fragmentModel, currentTime);
        removeEnd = req && !isNaN(req.startTime) ? req.startTime : Math.floor(currentTime);
        fragmentDuration = req && !isNaN(req.duration) ? req.duration : 1;
        self.sourceBufferExt.getBufferRange(buffer, currentTime).then(function(range) {
            if (range === null && seekTarget === currentTime && buffer.buffered.length > 0) {
                removeEnd = buffer.buffered.end(buffer.buffered.length - 1);
            }
            removeStart = buffer.buffered.start(0);
            self.sourceBufferExt.remove(buffer, removeStart, removeEnd, periodInfo.duration, mediaSource).then(function() {
                self.fragmentController.removeExecutedRequestsBeforeTime(fragmentModel, removeEnd);
                deferred.resolve(removeEnd - removeStart);
            });
        });
        return deferred.promise;
    }, onInitializationLoaded = function(request, response) {
        var self = this, initData = response.data, quality = request.quality;
        self.debug.log("Initialization finished loading: " + request.streamType);
        self.fragmentController.process(initData).then(function(data) {
            if (data !== null) {
                initializationData[quality] = data;
                if (quality === requiredQuality) {
                    appendToBuffer.call(self, data, request.quality).then(function() {
                        deferredInitAppend.resolve();
                    });
                }
            } else {
                self.debug.log("No " + type + " bytes to push.");
            }
        });
    }, onBytesError = function() {
        if (state === LOADING) {
            setState.call(this, READY);
        }
        this.system.notify("segmentLoadingFailed");
    }, searchForLiveEdge = function() {
        var self = this, availabilityRange = currentRepresentation.segmentAvailabilityRange, searchTimeSpan = 12 * 60 * 60;
        liveEdgeInitialSearchPosition = availabilityRange.end;
        liveEdgeSearchRange = {
            start: Math.max(0, liveEdgeInitialSearchPosition - searchTimeSpan),
            end: liveEdgeInitialSearchPosition + searchTimeSpan
        };
        liveEdgeSearchStep = Math.floor((availabilityRange.end - availabilityRange.start) / 2);
        deferredLiveEdge = Q.defer();
        if (currentRepresentation.useCalculatedLiveEdgeTime) {
            deferredLiveEdge.resolve(liveEdgeInitialSearchPosition);
        } else {
            self.indexHandler.getSegmentRequestForTime(currentRepresentation, liveEdgeInitialSearchPosition).then(findLiveEdge.bind(self, liveEdgeInitialSearchPosition, onSearchForSegmentSucceeded, onSearchForSegmentFailed));
        }
        return deferredLiveEdge.promise;
    }, findLiveEdge = function(searchTime, onSuccess, onError, request) {
        var self = this;
        if (request === null) {
            currentRepresentation.segments = null;
            currentRepresentation.segmentAvailabilityRange = {
                start: searchTime - liveEdgeSearchStep,
                end: searchTime + liveEdgeSearchStep
            };
            self.indexHandler.getSegmentRequestForTime(currentRepresentation, searchTime).then(findLiveEdge.bind(self, searchTime, onSuccess, onError));
        } else {
            self.fragmentController.isFragmentExists(request).then(function(isExist) {
                if (isExist) {
                    onSuccess.call(self, request, searchTime);
                } else {
                    onError.call(self, request, searchTime);
                }
            });
        }
    }, onSearchForSegmentFailed = function(request, lastSearchTime) {
        var searchTime, searchInterval;
        if (useBinarySearch) {
            binarySearch.call(this, false, lastSearchTime);
            return;
        }
        searchInterval = lastSearchTime - liveEdgeInitialSearchPosition;
        searchTime = searchInterval > 0 ? liveEdgeInitialSearchPosition - searchInterval : liveEdgeInitialSearchPosition + Math.abs(searchInterval) + liveEdgeSearchStep;
        if (searchTime < liveEdgeSearchRange.start && searchTime > liveEdgeSearchRange.end) {
            this.system.notify("segmentLoadingFailed");
        } else {
            setState.call(this, READY);
            this.indexHandler.getSegmentRequestForTime(currentRepresentation, searchTime).then(findLiveEdge.bind(this, searchTime, onSearchForSegmentSucceeded, onSearchForSegmentFailed));
        }
    }, onSearchForSegmentSucceeded = function(request, lastSearchTime) {
        var startTime = request.startTime, self = this, searchTime;
        if (!useBinarySearch) {
            if (fragmentDuration === 0) {
                deferredLiveEdge.resolve(startTime);
                return;
            }
            useBinarySearch = true;
            liveEdgeSearchRange.end = startTime + 2 * liveEdgeSearchStep;
            if (lastSearchTime === liveEdgeInitialSearchPosition) {
                searchTime = lastSearchTime + fragmentDuration;
                this.indexHandler.getSegmentRequestForTime(currentRepresentation, searchTime).then(findLiveEdge.bind(self, searchTime, function() {
                    binarySearch.call(self, true, searchTime);
                }, function() {
                    deferredLiveEdge.resolve(searchTime);
                }));
                return;
            }
        }
        binarySearch.call(this, true, lastSearchTime);
    }, binarySearch = function(lastSearchSucceeded, lastSearchTime) {
        var isSearchCompleted, searchTime;
        if (lastSearchSucceeded) {
            liveEdgeSearchRange.start = lastSearchTime;
        } else {
            liveEdgeSearchRange.end = lastSearchTime;
        }
        isSearchCompleted = Math.floor(liveEdgeSearchRange.end - liveEdgeSearchRange.start) <= fragmentDuration;
        if (isSearchCompleted) {
            deferredLiveEdge.resolve(lastSearchSucceeded ? lastSearchTime : lastSearchTime - fragmentDuration);
        } else {
            searchTime = (liveEdgeSearchRange.start + liveEdgeSearchRange.end) / 2;
            this.indexHandler.getSegmentRequestForTime(currentRepresentation, searchTime).then(findLiveEdge.bind(this, searchTime, onSearchForSegmentSucceeded, onSearchForSegmentFailed));
        }
    }, signalStreamComplete = function(request) {
        this.debug.log(type + " Stream is complete.");
        clearPlayListTraceMetrics(new Date(), MediaPlayer.vo.metrics.PlayList.Trace.END_OF_CONTENT_STOP_REASON);
        doStop.call(this);
        deferredStreamComplete.resolve(request);
    }, loadInitialization = function() {
        var initializationPromise = null;
        if (initialPlayback) {
            this.debug.log("Marking a special seek for initial " + type + " playback.");
            if (!seeking) {
                seeking = true;
                seekTarget = 0;
            }
            initialPlayback = false;
        }
        if (dataChanged) {
            if (deferredInitAppend && Q.isPending(deferredInitAppend.promise)) {
                deferredInitAppend.resolve();
            }
            deferredInitAppend = Q.defer();
            initializationData = [];
            initializationPromise = this.indexHandler.getInitRequest(availableRepresentations[requiredQuality]);
        } else {
            initializationPromise = Q.when(null);
            if (currentQuality !== requiredQuality || currentQuality === -1) {
                if (deferredInitAppend && Q.isPending(deferredInitAppend.promise)) return Q.when(null);
                deferredInitAppend = Q.defer();
                if (initializationData[requiredQuality]) {
                    appendToBuffer.call(this, initializationData[requiredQuality], requiredQuality).then(function() {
                        deferredInitAppend.resolve();
                    });
                } else {
                    initializationPromise = this.indexHandler.getInitRequest(availableRepresentations[requiredQuality]);
                }
            }
        }
        return initializationPromise;
    }, loadNextFragment = function() {
        var promise, self = this;
        if (dataChanged && !seeking) {
            self.debug.log("Data changed - loading the " + type + " fragment for time: " + playingTime);
            promise = self.indexHandler.getSegmentRequestForTime(currentRepresentation, playingTime);
        } else {
            var deferred = Q.defer(), segmentTime;
            promise = deferred.promise;
            Q.when(seeking ? seekTarget : self.indexHandler.getCurrentTime(currentRepresentation)).then(function(time) {
                self.sourceBufferExt.getBufferRange(buffer, time).then(function(range) {
                    if (seeking) currentRepresentation.segments = null;
                    seeking = false;
                    segmentTime = range ? range.end : time;
                    self.indexHandler.getSegmentRequestForTime(currentRepresentation, segmentTime).then(function(request) {
                        deferred.resolve(request);
                    }, function() {
                        deferred.reject();
                    });
                }, function() {
                    deferred.reject();
                });
            }, function() {
                deferred.reject();
            });
        }
        return promise;
    }, onFragmentRequest = function(request) {
        var self = this;
        if (request !== null) {
            if (self.fragmentController.isFragmentLoadedOrPending(self, request)) {
                if (request.action !== "complete") {
                    self.indexHandler.getNextSegmentRequest(currentRepresentation).then(onFragmentRequest.bind(self));
                } else {
                    doStop.call(self);
                    setState.call(self, READY);
                }
            } else {
                Q.when(deferredBuffersFlatten ? deferredBuffersFlatten.promise : true).then(function() {
                    self.fragmentController.prepareFragmentForLoading(self, request, onBytesLoadingStart, onBytesLoaded, onBytesError, signalStreamComplete).then(function() {
                        setState.call(self, READY);
                    });
                });
            }
        } else {
            setState.call(self, READY);
        }
    }, checkIfSufficientBuffer = function() {
        if (waitingForBuffer) {
            var timeToEnd = getTimeToEnd.call(this);
            if (bufferLevel < minBufferTime && (minBufferTime < timeToEnd || minBufferTime >= timeToEnd && !isBufferingCompleted)) {
                if (!stalled) {
                    this.debug.log("Waiting for more " + type + " buffer before starting playback.");
                    stalled = true;
                    this.videoModel.stallStream(type, stalled);
                }
            } else {
                this.debug.log("Got enough " + type + " buffer to start.");
                waitingForBuffer = false;
                stalled = false;
                this.videoModel.stallStream(type, stalled);
            }
        }
    }, isSchedulingRequired = function() {
        var isPaused = this.videoModel.isPaused();
        return !isPaused || isPaused && this.scheduleWhilePaused;
    }, hasData = function() {
        return !!data && !!buffer;
    }, getTimeToEnd = function() {
        var currentTime = this.videoModel.getCurrentTime();
        return periodInfo.start + periodInfo.duration - currentTime;
    }, getWorkingTime = function() {
        var time = -1;
        time = this.videoModel.getCurrentTime();
        return time;
    }, getRequiredFragmentCount = function() {
        var self = this, playbackRate = self.videoModel.getPlaybackRate(), actualBufferedDuration = bufferLevel / Math.max(playbackRate, 1), deferred = Q.defer();
        self.bufferExt.getRequiredBufferLength(waitingForBuffer, self.requestScheduler.getExecuteInterval(self) / 1e3, isDynamic, periodInfo.duration).then(function(requiredBufferLength) {
            self.indexHandler.getSegmentCountForDuration(currentRepresentation, requiredBufferLength, actualBufferedDuration).then(function(count) {
                deferred.resolve(count);
            });
        });
        return deferred.promise;
    }, requestNewFragment = function() {
        var self = this, pendingRequests = self.fragmentController.getPendingRequests(self), loadingRequests = self.fragmentController.getLoadingRequests(self), ln = (pendingRequests ? pendingRequests.length : 0) + (loadingRequests ? loadingRequests.length : 0);
        if (fragmentsToLoad - ln > 0) {
            fragmentsToLoad--;
            loadNextFragment.call(self).then(onFragmentRequest.bind(self));
        } else {
            if (state === VALIDATING) {
                setState.call(self, READY);
            }
            finishValidation.call(self);
        }
    }, validate = function() {
        var self = this, newQuality, qualityChanged = false, now = new Date(), currentVideoTime = self.videoModel.getCurrentTime();
        checkIfSufficientBuffer.call(self);
        if (!isSchedulingRequired.call(self) && !initialPlayback && !dataChanged) {
            doStop.call(self);
            return;
        }
        if (bufferLevel < STALL_THRESHOLD && !stalled) {
            self.debug.log("Stalling " + type + " Buffer: " + type);
            clearPlayListTraceMetrics(new Date(), MediaPlayer.vo.metrics.PlayList.Trace.REBUFFERING_REASON);
            stalled = true;
            waitingForBuffer = true;
            self.videoModel.stallStream(type, stalled);
        }
        if (state === READY) {
            setState.call(self, VALIDATING);
            var manifestMinBufferTime = self.manifestModel.getValue().minBufferTime;
            self.bufferExt.decideBufferLength(manifestMinBufferTime, periodInfo.duration, waitingForBuffer).then(function(time) {
                self.setMinBufferTime(time);
                self.requestScheduler.adjustExecuteInterval();
            });
            self.abrController.getPlaybackQuality(type, data).then(function(result) {
                var quality = result.quality;
                if (quality !== undefined) {
                    newQuality = quality;
                }
                qualityChanged = quality !== requiredQuality;
                if (qualityChanged === true) {
                    requiredQuality = newQuality;
                    self.fragmentController.cancelPendingRequestsForModel(fragmentModel);
                    currentRepresentation = getRepresentationForQuality.call(self, newQuality);
                    if (currentRepresentation === null || currentRepresentation === undefined) {
                        throw "Unexpected error!";
                    }
                    if (buffer.timestampOffset !== currentRepresentation.MSETimeOffset) {
                        buffer.timestampOffset = currentRepresentation.MSETimeOffset;
                    }
                    clearPlayListTraceMetrics(new Date(), MediaPlayer.vo.metrics.PlayList.Trace.REPRESENTATION_SWITCH_STOP_REASON);
                    self.metricsModel.addRepresentationSwitch(type, now, currentVideoTime, currentRepresentation.id);
                }
                return getRequiredFragmentCount.call(self, quality);
            }).then(function(count) {
                fragmentsToLoad = count;
                loadInitialization.call(self).then(function(request) {
                    if (request !== null) {
                        self.fragmentController.prepareFragmentForLoading(self, request, onBytesLoadingStart, onBytesLoaded, onBytesError, signalStreamComplete).then(function() {
                            setState.call(self, READY);
                        });
                        dataChanged = false;
                    }
                });
                requestNewFragment.call(self);
            });
        } else if (state === VALIDATING) {
            setState.call(self, READY);
        }
    };
    return {
        videoModel: undefined,
        metricsModel: undefined,
        metricsExt: undefined,
        manifestExt: undefined,
        manifestModel: undefined,
        bufferExt: undefined,
        sourceBufferExt: undefined,
        abrController: undefined,
        fragmentExt: undefined,
        indexHandler: undefined,
        debug: undefined,
        system: undefined,
        errHandler: undefined,
        scheduleWhilePaused: undefined,
        eventController: undefined,
        timelineConverter: undefined,
        initialize: function(type, periodInfo, data, buffer, videoModel, scheduler, fragmentController, source, eventController) {
            var self = this, manifest = self.manifestModel.getValue();
            isDynamic = self.manifestExt.getIsDynamic(manifest);
            self.setMediaSource(source);
            self.setVideoModel(videoModel);
            self.setType(type);
            self.setBuffer(buffer);
            self.setScheduler(scheduler);
            self.setFragmentController(fragmentController);
            self.setEventController(eventController);
            self.updateData(data, periodInfo).then(function() {
                if (!isDynamic) {
                    ready = true;
                    startPlayback.call(self);
                    return;
                }
                searchForLiveEdge.call(self).then(function(liveEdgeTime) {
                    var startTime = Math.max(liveEdgeTime - minBufferTime, currentRepresentation.segmentAvailabilityRange.start), metrics = self.metricsModel.getMetricsFor("stream"), manifestUpdateInfo = self.metricsExt.getCurrentManifestUpdate(metrics), duration, actualStartTime, segmentStart;
                    self.indexHandler.getSegmentRequestForTime(currentRepresentation, startTime).then(function(request) {
                        self.system.notify("liveEdgeFound", periodInfo.liveEdge, liveEdgeTime, periodInfo);
                        duration = request ? request.duration : fragmentDuration;
                        segmentStart = request ? request.startTime : currentRepresentation.adaptation.period.end - fragmentDuration;
                        actualStartTime = segmentStart + duration / 2;
                        periodInfo.liveEdge = actualStartTime;
                        self.metricsModel.updateManifestUpdateInfo(manifestUpdateInfo, {
                            currentTime: actualStartTime,
                            presentationStartTime: liveEdgeTime,
                            latency: liveEdgeTime - actualStartTime,
                            clientTimeOffset: currentRepresentation.adaptation.period.mpd.clientServerTimeShift
                        });
                        ready = true;
                        startPlayback.call(self);
                        doSeek.call(self, segmentStart);
                    });
                });
            });
            self.indexHandler.setIsDynamic(isDynamic);
            self.bufferExt.decideBufferLength(manifest.minBufferTime, periodInfo, waitingForBuffer).then(function(time) {
                self.setMinBufferTime(time);
            });
        },
        getType: function() {
            return type;
        },
        setType: function(value) {
            type = value;
            if (this.indexHandler !== undefined) {
                this.indexHandler.setType(value);
            }
        },
        getPeriodInfo: function() {
            return periodInfo;
        },
        getVideoModel: function() {
            return this.videoModel;
        },
        setVideoModel: function(value) {
            this.videoModel = value;
        },
        getScheduler: function() {
            return this.requestScheduler;
        },
        setScheduler: function(value) {
            this.requestScheduler = value;
        },
        getFragmentController: function() {
            return this.fragmentController;
        },
        setFragmentController: function(value) {
            this.fragmentController = value;
        },
        setEventController: function(value) {
            this.eventController = value;
        },
        getAutoSwitchBitrate: function() {
            var self = this;
            return self.abrController.getAutoSwitchBitrate();
        },
        setAutoSwitchBitrate: function(value) {
            var self = this;
            self.abrController.setAutoSwitchBitrate(value);
        },
        getData: function() {
            return data;
        },
        updateData: function(dataValue, periodInfoValue) {
            var self = this, deferred = Q.defer(), metrics = self.metricsModel.getMetricsFor("stream"), manifestUpdateInfo = self.metricsExt.getCurrentManifestUpdate(metrics), from = data, quality, ln, r;
            if (!from) {
                from = dataValue;
            }
            doStop.call(self);
            updateRepresentations.call(self, dataValue, periodInfoValue).then(function(representations) {
                availableRepresentations = representations;
                periodInfo = periodInfoValue;
                ln = representations.length;
                for (var i = 0; i < ln; i += 1) {
                    r = representations[i];
                    self.metricsModel.addManifestUpdateRepresentationInfo(manifestUpdateInfo, r.id, r.index, r.adaptation.period.index, type, r.presentationTimeOffset, r.startNumber, r.segmentInfoType);
                }
                quality = self.abrController.getQualityFor(type);
                if (!currentRepresentation) {
                    currentRepresentation = getRepresentationForQuality.call(self, quality);
                }
                self.indexHandler.getCurrentTime(currentRepresentation).then(function(time) {
                    dataChanged = true;
                    playingTime = time;
                    requiredQuality = quality;
                    currentRepresentation = getRepresentationForQuality.call(self, quality);
                    buffer.timestampOffset = currentRepresentation.MSETimeOffset;
                    if (currentRepresentation.segmentDuration) {
                        fragmentDuration = currentRepresentation.segmentDuration;
                    }
                    data = dataValue;
                    self.bufferExt.updateData(data, type);
                    self.seek(time);
                    self.indexHandler.updateSegmentList(currentRepresentation).then(function() {
                        self.metricsModel.updateManifestUpdateInfo(manifestUpdateInfo, {
                            latency: currentRepresentation.segmentAvailabilityRange.end - self.videoModel.getCurrentTime()
                        });
                        deferred.resolve();
                    });
                });
            });
            return deferred.promise;
        },
        getCurrentRepresentation: function() {
            return currentRepresentation;
        },
        getBuffer: function() {
            return buffer;
        },
        setBuffer: function(value) {
            buffer = value;
        },
        getMinBufferTime: function() {
            return minBufferTime;
        },
        setMinBufferTime: function(value) {
            minBufferTime = value;
        },
        setMediaSource: function(value) {
            mediaSource = value;
        },
        isReady: function() {
            return state === READY;
        },
        isBufferingCompleted: function() {
            return isBufferingCompleted;
        },
        clearMetrics: function() {
            var self = this;
            if (type === null || type === "") {
                return;
            }
            self.metricsModel.clearCurrentMetricsForType(type);
        },
        updateBufferState: function() {
            var self = this;
            if (isQuotaExceeded && rejectedBytes && !appendingRejectedData) {
                appendingRejectedData = true;
                appendToBuffer.call(self, rejectedBytes.data, rejectedBytes.quality, rejectedBytes.index).then(function() {
                    appendingRejectedData = false;
                });
            } else {
                return updateBufferLevel.call(self);
            }
        },
        updateStalledState: function() {
            stalled = this.videoModel.isStalled();
            checkIfSufficientBuffer.call(this);
        },
        reset: function(errored) {
            var self = this, cancel = function cancelDeferred(d) {
                if (d) {
                    d.reject();
                    d = null;
                }
            };
            doStop.call(self);
            cancel(deferredLiveEdge);
            cancel(deferredInitAppend);
            cancel(deferredRejectedDataAppend);
            cancel(deferredBuffersFlatten);
            deferredAppends.forEach(cancel);
            deferredAppends = [];
            cancel(deferredStreamComplete);
            deferredStreamComplete = Q.defer();
            self.clearMetrics();
            self.fragmentController.abortRequestsForModel(fragmentModel);
            self.fragmentController.detachBufferController(fragmentModel);
            fragmentModel = null;
            initializationData = [];
            initialPlayback = true;
            liveEdgeSearchRange = null;
            liveEdgeInitialSearchPosition = null;
            useBinarySearch = false;
            liveEdgeSearchStep = null;
            isQuotaExceeded = false;
            rejectedBytes = null;
            appendingRejectedData = false;
            if (!errored) {
                self.sourceBufferExt.abort(mediaSource, buffer);
                self.sourceBufferExt.removeSourceBuffer(mediaSource, buffer);
            }
            data = null;
            buffer = null;
        },
        start: doStart,
        seek: doSeek,
        stop: doStop
    };
};

MediaPlayer.dependencies.BufferController.prototype = {
    constructor: MediaPlayer.dependencies.BufferController
};

MediaPlayer.dependencies.BufferExtensions = function() {
    "use strict";
    var minBufferTarget, currentBufferTarget, topAudioQualityIndex = 0, topVideoQualityIndex = 0, audioData = null, videoData = null, getCurrentHttpRequestLatency = function(metrics) {
        var httpRequest = this.metricsExt.getCurrentHttpRequest(metrics);
        if (httpRequest !== null) {
            return (httpRequest.tresponse.getTime() - httpRequest.trequest.getTime()) / 1e3;
        }
        return 0;
    }, isPlayingAtTopQuality = function() {
        var self = this, audioQuality, videoQuality, isAtTop;
        audioQuality = audioData ? self.abrController.getQualityFor("audio") : topAudioQualityIndex;
        videoQuality = videoData ? self.abrController.getQualityFor("video") : topVideoQualityIndex;
        isAtTop = audioQuality === topAudioQualityIndex && videoQuality === topVideoQualityIndex;
        return isAtTop;
    };
    return {
        system: undefined,
        videoModel: undefined,
        manifestExt: undefined,
        metricsExt: undefined,
        metricsModel: undefined,
        abrController: undefined,
        bufferMax: undefined,
        updateData: function(data, type) {
            var topIndex = data.Representation_asArray.length - 1;
            if (type === "audio") {
                topAudioQualityIndex = topIndex;
                audioData = data;
            } else if (type === "video") {
                topVideoQualityIndex = topIndex;
                videoData = data;
            }
        },
        getTopQualityIndex: function(type) {
            var topQualityIndex = null;
            if (type === "audio") {
                topQualityIndex = topAudioQualityIndex;
            } else if (type === "video") {
                topQualityIndex = topVideoQualityIndex;
            }
            return topQualityIndex;
        },
        decideBufferLength: function(minBufferTime, duration) {
            if (isNaN(duration) || MediaPlayer.dependencies.BufferExtensions.DEFAULT_MIN_BUFFER_TIME < duration && minBufferTime < duration) {
                minBufferTarget = Math.max(MediaPlayer.dependencies.BufferExtensions.DEFAULT_MIN_BUFFER_TIME, minBufferTime);
            } else if (minBufferTime >= duration) {
                minBufferTarget = Math.min(duration, MediaPlayer.dependencies.BufferExtensions.DEFAULT_MIN_BUFFER_TIME);
            } else {
                minBufferTarget = Math.min(duration, minBufferTime);
            }
            return Q.when(minBufferTarget);
        },
        getLeastBufferLevel: function() {
            var videoMetrics = this.metricsModel.getReadOnlyMetricsFor("video"), videoBufferLevel = this.metricsExt.getCurrentBufferLevel(videoMetrics), audioMetrics = this.metricsModel.getReadOnlyMetricsFor("audio"), audioBufferLevel = this.metricsExt.getCurrentBufferLevel(audioMetrics), leastLevel = null;
            if (videoBufferLevel === null || audioBufferLevel === null) {
                leastLevel = audioBufferLevel !== null ? audioBufferLevel.level : videoBufferLevel !== null ? videoBufferLevel.level : null;
            } else {
                leastLevel = Math.min(audioBufferLevel.level, videoBufferLevel.level);
            }
            return leastLevel;
        },
        getRequiredBufferLength: function(waitingForBuffer, delay, isDynamic, duration) {
            var self = this, vmetrics = self.metricsModel.getReadOnlyMetricsFor("video"), ametrics = self.metricsModel.getReadOnlyMetricsFor("audio"), isLongFormContent = duration >= MediaPlayer.dependencies.BufferExtensions.LONG_FORM_CONTENT_DURATION_THRESHOLD, deferred = Q.defer(), isAtTop = false, requiredBufferLength;
            if (self.bufferMax === MediaPlayer.dependencies.BufferExtensions.BUFFER_SIZE_MIN) {
                requiredBufferLength = minBufferTarget;
                deferred.resolve(requiredBufferLength);
            } else if (self.bufferMax === MediaPlayer.dependencies.BufferExtensions.BUFFER_SIZE_INFINITY) {
                requiredBufferLength = duration;
                deferred.resolve(requiredBufferLength);
            } else if (self.bufferMax === MediaPlayer.dependencies.BufferExtensions.BUFFER_SIZE_REQUIRED) {
                currentBufferTarget = minBufferTarget;
                if (!isDynamic) {
                    if (!waitingForBuffer) {
                        isAtTop = isPlayingAtTopQuality.call(self);
                    }
                }
                if (isAtTop) {
                    currentBufferTarget = isLongFormContent ? MediaPlayer.dependencies.BufferExtensions.BUFFER_TIME_AT_TOP_QUALITY_LONG_FORM : MediaPlayer.dependencies.BufferExtensions.BUFFER_TIME_AT_TOP_QUALITY;
                }
                requiredBufferLength = currentBufferTarget + delay + Math.max(getCurrentHttpRequestLatency.call(self, vmetrics), getCurrentHttpRequestLatency.call(self, ametrics));
                deferred.resolve(requiredBufferLength);
            } else {
                deferred.reject("invalid bufferMax value: " + self.bufferMax);
            }
            return deferred.promise;
        },
        getBufferTarget: function() {
            return currentBufferTarget === undefined ? minBufferTarget : currentBufferTarget;
        }
    };
};

MediaPlayer.dependencies.BufferExtensions.BUFFER_SIZE_REQUIRED = "required";

MediaPlayer.dependencies.BufferExtensions.BUFFER_SIZE_MIN = "min";

MediaPlayer.dependencies.BufferExtensions.BUFFER_SIZE_INFINITY = "infinity";

MediaPlayer.dependencies.BufferExtensions.BUFFER_TIME_AT_STARTUP = 1;

MediaPlayer.dependencies.BufferExtensions.DEFAULT_MIN_BUFFER_TIME = 8;

MediaPlayer.dependencies.BufferExtensions.BUFFER_TIME_AT_TOP_QUALITY = 30;

MediaPlayer.dependencies.BufferExtensions.BUFFER_TIME_AT_TOP_QUALITY_LONG_FORM = 300;

MediaPlayer.dependencies.BufferExtensions.LONG_FORM_CONTENT_DURATION_THRESHOLD = 600;

MediaPlayer.dependencies.BufferExtensions.prototype.constructor = MediaPlayer.dependencies.BufferExtensions;

MediaPlayer.utils.Capabilities = function() {
    "use strict";
};

MediaPlayer.utils.Capabilities.prototype = {
    constructor: MediaPlayer.utils.Capabilities,
    supportsMediaSource: function() {
        "use strict";
        var hasWebKit = "WebKitMediaSource" in window, hasMediaSource = "MediaSource" in window;
        return hasWebKit || hasMediaSource;
    },
    supportsMediaKeys: function() {
        "use strict";
        var hasWebKit = "WebKitMediaKeys" in window, hasMs = "MSMediaKeys" in window, hasMediaSource = "MediaKeys" in window;
        return hasWebKit || hasMs || hasMediaSource;
    },
    supportsCodec: function(element, codec) {
        "use strict";
        if (!(element instanceof HTMLMediaElement)) {
            throw "element must be of type HTMLMediaElement.";
        }
        var canPlay = element.canPlayType(codec);
        return canPlay === "probably";
    }
};

MediaPlayer.utils.Debug = function() {
    "use strict";
    var logToBrowserConsole = true;
    return {
        eventBus: undefined,
        setLogToBrowserConsole: function(value) {
            logToBrowserConsole = value;
        },
        getLogToBrowserConsole: function() {
            return logToBrowserConsole;
        },
        log: function(message) {
            if (logToBrowserConsole) {
                console.log(message);
            }
            this.eventBus.dispatchEvent({
                type: "log",
                message: message
            });
        }
    };
};

MediaPlayer.dependencies.ErrorHandler = function() {
    "use strict";
    return {
        eventBus: undefined,
        capabilityError: function(err) {
            this.eventBus.dispatchEvent({
                type: "error",
                error: "capability",
                event: err
            });
        },
        downloadError: function(id, url, request) {
            this.eventBus.dispatchEvent({
                type: "error",
                error: "download",
                event: {
                    id: id,
                    url: url,
                    request: request
                }
            });
        },
        manifestError: function(message, id, manifest) {
            this.eventBus.dispatchEvent({
                type: "error",
                error: "manifestError",
                event: {
                    message: message,
                    id: id,
                    manifest: manifest
                }
            });
        },
        closedCaptionsError: function(message, id, ccContent) {
            this.eventBus.dispatchEvent({
                type: "error",
                error: "cc",
                event: {
                    message: message,
                    id: id,
                    cc: ccContent
                }
            });
        },
        mediaSourceError: function(err) {
            this.eventBus.dispatchEvent({
                type: "error",
                error: "mediasource",
                event: err
            });
        },
        mediaKeySessionError: function(err) {
            this.eventBus.dispatchEvent({
                type: "error",
                error: "key_session",
                event: err
            });
        },
        mediaKeyMessageError: function(err) {
            this.eventBus.dispatchEvent({
                type: "error",
                error: "key_message",
                event: err
            });
        },
        mediaKeySystemSelectionError: function(err) {
            this.eventBus.dispatchEvent({
                type: "error",
                error: "key_system_selection",
                event: err
            });
        }
    };
};

MediaPlayer.dependencies.ErrorHandler.prototype = {
    constructor: MediaPlayer.dependencies.ErrorHandler
};

MediaPlayer.utils.EventBus = function() {
    "use strict";
    var registrations, getListeners = function(type, useCapture) {
        var captype = (useCapture ? "1" : "0") + type;
        if (!(captype in registrations)) {
            registrations[captype] = [];
        }
        return registrations[captype];
    }, init = function() {
        registrations = {};
    };
    init();
    return {
        addEventListener: function(type, listener, useCapture) {
            var listeners = getListeners(type, useCapture);
            var idx = listeners.indexOf(listener);
            if (idx === -1) {
                listeners.push(listener);
            }
        },
        removeEventListener: function(type, listener, useCapture) {
            var listeners = getListeners(type, useCapture);
            var idx = listeners.indexOf(listener);
            if (idx !== -1) {
                listeners.splice(idx, 1);
            }
        },
        dispatchEvent: function(evt) {
            var listeners = getListeners(evt.type, false).slice();
            for (var i = 0; i < listeners.length; i++) {
                listeners[i].call(this, evt);
            }
            return !evt.defaultPrevented;
        }
    };
};

MediaPlayer.dependencies.EventController = function() {
    "use strict";
    var inlineEvents = [], inbandEvents = [], activeEvents = [], eventInterval = null, refreshDelay = 100, presentationTimeThreshold = refreshDelay / 1e3, MPD_RELOAD_SCHEME = "urn:mpeg:dash:event:2012", MPD_RELOAD_VALUE = 1, reset = function() {
        if (eventInterval !== null) {
            clearInterval(eventInterval);
            eventInterval = null;
        }
        inlineEvents = null;
        inbandEvents = null;
        activeEvents = null;
    }, clear = function() {
        if (eventInterval !== null) {
            clearInterval(eventInterval);
            eventInterval = null;
        }
    }, start = function() {
        var self = this;
        self.debug.log("Start Event Controller");
        if (!isNaN(refreshDelay)) {
            eventInterval = setInterval(onEventTimer.bind(this), refreshDelay);
        }
    }, addInlineEvents = function(values) {
        var self = this;
        inlineEvents = [];
        if (values && values.length > 0) {
            inlineEvents = values;
        }
        self.debug.log("Added " + values.length + " inline events");
    }, addInbandEvents = function(values) {
        var self = this;
        for (var i = 0; i < values.length; i++) {
            var event = values[i];
            inbandEvents[event.id] = event;
            self.debug.log("Add inband event with id " + event.id);
        }
    }, onEventTimer = function() {
        triggerEvents.call(this, inbandEvents);
        triggerEvents.call(this, inlineEvents);
        removeEvents.call(this);
    }, triggerEvents = function(events) {
        var self = this, currentVideoTime = this.videoModel.getCurrentTime(), presentationTime;
        if (events) {
            for (var j = 0; j < events.length; j++) {
                var curr = events[j];
                if (curr !== undefined) {
                    presentationTime = curr.presentationTime / curr.eventStream.timescale;
                    if (presentationTime === 0 || presentationTime <= currentVideoTime && presentationTime + presentationTimeThreshold > currentVideoTime) {
                        self.debug.log("Start Event at " + currentVideoTime);
                        if (curr.duration > 0) activeEvents.push(curr);
                        if (curr.eventStream.schemeIdUri == MPD_RELOAD_SCHEME && curr.eventStream.value == MPD_RELOAD_VALUE) refreshManifest.call(this);
                        events.splice(j, 1);
                    }
                }
            }
        }
    }, removeEvents = function() {
        var self = this;
        if (activeEvents) {
            var currentVideoTime = this.videoModel.getCurrentTime();
            for (var i = 0; i < activeEvents.length; i++) {
                var curr = activeEvents[i];
                if (curr !== null && (curr.duration + curr.presentationTime) / curr.eventStream.timescale < currentVideoTime) {
                    self.debug.log("Remove Event at time " + currentVideoTime);
                    curr = null;
                    activeEvents.splice(i, 1);
                }
            }
        }
    }, refreshManifest = function() {
        var self = this, manifest = self.manifestModel.getValue(), url = manifest.mpdUrl;
        if (manifest.hasOwnProperty("Location")) {
            url = manifest.Location;
        }
        self.debug.log("Refresh manifest @ " + url);
        self.manifestLoader.load(url).then(function(manifestResult) {
            self.manifestModel.setValue(manifestResult);
        });
    };
    return {
        manifestModel: undefined,
        manifestExt: undefined,
        manifestLoader: undefined,
        debug: undefined,
        system: undefined,
        errHandler: undefined,
        videoModel: undefined,
        addInlineEvents: addInlineEvents,
        addInbandEvents: addInbandEvents,
        reset: reset,
        clear: clear,
        start: start,
        getVideoModel: function() {
            return this.videoModel;
        },
        setVideoModel: function(value) {
            this.videoModel = value;
        },
        initialize: function(videoModel) {
            this.setVideoModel(videoModel);
        }
    };
};

MediaPlayer.dependencies.EventController.prototype = {
    constructor: MediaPlayer.dependencies.EventController
};

MediaPlayer.dependencies.FragmentController = function() {
    "use strict";
    var fragmentModels = [], findModel = function(bufferController) {
        var ln = fragmentModels.length;
        for (var i = 0; i < ln; i++) {
            if (fragmentModels[i].getContext() == bufferController) {
                return fragmentModels[i];
            }
        }
        return null;
    }, isReadyToLoadNextFragment = function() {
        var isReady = true, ln = fragmentModels.length;
        for (var i = 0; i < ln; i++) {
            if (!fragmentModels[i].isReady()) {
                isReady = false;
                break;
            }
        }
        return isReady;
    }, executeRequests = function() {
        for (var i = 0; i < fragmentModels.length; i++) {
            fragmentModels[i].executeCurrentRequest();
        }
    };
    return {
        system: undefined,
        debug: undefined,
        fragmentLoader: undefined,
        process: function(bytes) {
            var result = null;
            if (bytes !== null && bytes !== undefined && bytes.byteLength > 0) {
                result = new Uint8Array(bytes);
            }
            return Q.when(result);
        },
        attachBufferController: function(bufferController) {
            if (!bufferController) return null;
            var model = findModel(bufferController);
            if (!model) {
                model = this.system.getObject("fragmentModel");
                model.setContext(bufferController);
                fragmentModels.push(model);
            }
            return model;
        },
        detachBufferController: function(bufferController) {
            var idx = fragmentModels.indexOf(bufferController);
            if (idx > -1) {
                fragmentModels.splice(idx, 1);
            }
        },
        onBufferControllerStateChange: function() {
            if (isReadyToLoadNextFragment()) {
                executeRequests.call(this);
            }
        },
        isFragmentLoadedOrPending: function(bufferController, request) {
            var fragmentModel = findModel(bufferController), isLoaded;
            if (!fragmentModel) {
                return false;
            }
            isLoaded = fragmentModel.isFragmentLoadedOrPending(request);
            return isLoaded;
        },
        getPendingRequests: function(bufferController) {
            var fragmentModel = findModel(bufferController);
            if (!fragmentModel) {
                return null;
            }
            return fragmentModel.getPendingRequests();
        },
        getLoadingRequests: function(bufferController) {
            var fragmentModel = findModel(bufferController);
            if (!fragmentModel) {
                return null;
            }
            return fragmentModel.getLoadingRequests();
        },
        isInitializationRequest: function(request) {
            return request && request.type && request.type.toLowerCase() === "initialization segment";
        },
        getLoadingTime: function(bufferController) {
            var fragmentModel = findModel(bufferController);
            if (!fragmentModel) {
                return null;
            }
            return fragmentModel.getLoadingTime();
        },
        getExecutedRequestForTime: function(model, time) {
            if (model) {
                return model.getExecutedRequestForTime(time);
            }
            return null;
        },
        removeExecutedRequest: function(model, request) {
            if (model) {
                model.removeExecutedRequest(request);
            }
        },
        removeExecutedRequestsBeforeTime: function(model, time) {
            if (model) {
                model.removeExecutedRequestsBeforeTime(time);
            }
        },
        cancelPendingRequestsForModel: function(model) {
            if (model) {
                model.cancelPendingRequests();
            }
        },
        abortRequestsForModel: function(model) {
            if (model) {
                model.abortRequests();
            }
        },
        isFragmentExists: function(request) {
            var deferred = Q.defer();
            this.fragmentLoader.checkForExistence(request).then(function() {
                deferred.resolve(true);
            }, function() {
                deferred.resolve(false);
            });
            return deferred.promise;
        },
        prepareFragmentForLoading: function(bufferController, request, startLoadingCallback, successLoadingCallback, errorLoadingCallback, streamEndCallback) {
            var fragmentModel = findModel(bufferController);
            if (!fragmentModel || !request) {
                return Q.when(null);
            }
            fragmentModel.addRequest(request);
            fragmentModel.setCallbacks(startLoadingCallback, successLoadingCallback, errorLoadingCallback, streamEndCallback);
            return Q.when(true);
        }
    };
};

MediaPlayer.dependencies.FragmentController.prototype = {
    constructor: MediaPlayer.dependencies.FragmentController
};

MediaPlayer.dependencies.FragmentLoader = function() {
    "use strict";
    var RETRY_ATTEMPTS = 3, RETRY_INTERVAL = 500, xhrs = [], doLoad = function(request, remainingAttempts) {
        var req = new XMLHttpRequest(), httpRequestMetrics = null, firstProgress = true, needFailureReport = true, lastTraceTime = null, self = this;
        xhrs.push(req);
        request.requestStartDate = new Date();
        httpRequestMetrics = self.metricsModel.addHttpRequest(request.streamType, null, request.type, request.url, null, request.range, request.requestStartDate, null, null, null, null, request.duration);
        self.metricsModel.appendHttpTrace(httpRequestMetrics, request.requestStartDate, request.requestStartDate.getTime() - request.requestStartDate.getTime(), [ 0 ]);
        lastTraceTime = request.requestStartDate;
        req.open("GET", self.tokenAuthentication.addTokenAsQueryArg(request.url), true);
        req.responseType = "arraybuffer";
        req = self.tokenAuthentication.setTokenInRequestHeader(req);
        if (request.range) {
            req.setRequestHeader("Range", "bytes=" + request.range);
        }
        req.onprogress = function(event) {
            var currentTime = new Date();
            if (firstProgress) {
                firstProgress = false;
                if (!event.lengthComputable || event.lengthComputable && event.total != event.loaded) {
                    request.firstByteDate = currentTime;
                    httpRequestMetrics.tresponse = currentTime;
                }
            }
            self.metricsModel.appendHttpTrace(httpRequestMetrics, currentTime, currentTime.getTime() - lastTraceTime.getTime(), [ req.response ? req.response.byteLength : 0 ]);
            lastTraceTime = currentTime;
        };
        req.onload = function() {
            if (req.status < 200 || req.status > 299) {
                return;
            }
            needFailureReport = false;
            var currentTime = new Date(), bytes = req.response, latency, download;
            if (!request.firstByteDate) {
                request.firstByteDate = request.requestStartDate;
            }
            request.requestEndDate = currentTime;
            latency = request.firstByteDate.getTime() - request.requestStartDate.getTime();
            download = request.requestEndDate.getTime() - request.firstByteDate.getTime();
            self.debug.log("loaded " + request.streamType + ":" + request.type + ":" + request.startTime + " (" + req.status + ", " + latency + "ms, " + download + "ms)");
            httpRequestMetrics.tresponse = request.firstByteDate;
            httpRequestMetrics.tfinish = request.requestEndDate;
            httpRequestMetrics.responsecode = req.status;
            self.metricsModel.appendHttpTrace(httpRequestMetrics, currentTime, currentTime.getTime() - lastTraceTime.getTime(), [ bytes ? bytes.byteLength : 0 ]);
            lastTraceTime = currentTime;
            request.deferred.resolve({
                data: bytes,
                request: request
            });
        };
        req.onloadend = req.onerror = function() {
            if (xhrs.indexOf(req) === -1) {
                return;
            } else {
                xhrs.splice(xhrs.indexOf(req), 1);
            }
            if (!needFailureReport) {
                return;
            }
            needFailureReport = false;
            var currentTime = new Date(), bytes = req.response, latency, download;
            if (!request.firstByteDate) {
                request.firstByteDate = request.requestStartDate;
            }
            request.requestEndDate = currentTime;
            latency = request.firstByteDate.getTime() - request.requestStartDate.getTime();
            download = request.requestEndDate.getTime() - request.firstByteDate.getTime();
            self.debug.log("failed " + request.streamType + ":" + request.type + ":" + request.startTime + " (" + req.status + ", " + latency + "ms, " + download + "ms)");
            httpRequestMetrics.tresponse = request.firstByteDate;
            httpRequestMetrics.tfinish = request.requestEndDate;
            httpRequestMetrics.responsecode = req.status;
            self.metricsModel.appendHttpTrace(httpRequestMetrics, currentTime, currentTime.getTime() - lastTraceTime.getTime(), [ bytes ? bytes.byteLength : 0 ]);
            lastTraceTime = currentTime;
            if (remainingAttempts > 0) {
                self.debug.log("Failed loading segment: " + request.streamType + ":" + request.type + ":" + request.startTime + ", retry in " + RETRY_INTERVAL + "ms" + " attempts: " + remainingAttempts);
                remainingAttempts--;
                setTimeout(function() {
                    doLoad.call(self, request, remainingAttempts);
                }, RETRY_INTERVAL);
            } else {
                self.debug.log("Failed loading segment: " + request.streamType + ":" + request.type + ":" + request.startTime + " no retry attempts left");
                self.errHandler.downloadError("content", request.url, req);
                request.deferred.reject(req);
            }
        };
        req.send();
    }, checkForExistence = function(request) {
        var req = new XMLHttpRequest(), isSuccessful = false;
        req.open("HEAD", request.url, true);
        req.onload = function() {
            if (req.status < 200 || req.status > 299) return;
            isSuccessful = true;
            request.deferred.resolve(request);
        };
        req.onloadend = req.onerror = function() {
            if (isSuccessful) return;
            request.deferred.reject(req);
        };
        req.send();
    };
    return {
        metricsModel: undefined,
        errHandler: undefined,
        debug: undefined,
        tokenAuthentication: undefined,
        load: function(req) {
            if (!req) {
                return Q.when(null);
            }
            req.deferred = Q.defer();
            doLoad.call(this, req, RETRY_ATTEMPTS);
            return req.deferred.promise;
        },
        checkForExistence: function(req) {
            if (!req) {
                return Q.when(null);
            }
            req.deferred = Q.defer();
            checkForExistence.call(this, req);
            return req.deferred.promise;
        },
        abort: function() {
            var i, req, ln = xhrs.length;
            for (i = 0; i < ln; i += 1) {
                req = xhrs[i];
                xhrs[i] = null;
                req.abort();
                req = null;
            }
            xhrs = [];
        }
    };
};

MediaPlayer.dependencies.FragmentLoader.prototype = {
    constructor: MediaPlayer.dependencies.FragmentLoader
};

MediaPlayer.dependencies.FragmentModel = function() {
    "use strict";
    var context, executedRequests = [], pendingRequests = [], loadingRequests = [], startLoadingCallback, successLoadingCallback, errorLoadingCallback, streamEndCallback, LOADING_REQUEST_THRESHOLD = 2, loadCurrentFragment = function(request) {
        var onSuccess, onError, self = this;
        startLoadingCallback.call(context, request);
        onSuccess = function(request, response) {
            loadingRequests.splice(loadingRequests.indexOf(request), 1);
            executedRequests.push(request);
            successLoadingCallback.call(context, request, response);
            request.deferred = null;
        };
        onError = function(request) {
            loadingRequests.splice(loadingRequests.indexOf(request), 1);
            errorLoadingCallback.call(context, request);
            request.deferred = null;
        };
        self.fragmentLoader.load(request).then(onSuccess.bind(context, request), onError.bind(context, request));
    }, sortRequestsByProperty = function(requestsArray, sortProp) {
        var compare = function(req1, req2) {
            if (req1[sortProp] < req2[sortProp]) return -1;
            if (req1[sortProp] > req2[sortProp]) return 1;
            return 0;
        };
        requestsArray.sort(compare);
    }, removeExecutedRequest = function(request) {
        var idx = executedRequests.indexOf(request);
        if (idx !== -1) {
            executedRequests.splice(idx, 1);
        }
    };
    return {
        system: undefined,
        debug: undefined,
        fragmentLoader: undefined,
        setContext: function(value) {
            context = value;
        },
        getContext: function() {
            return context;
        },
        addRequest: function(value) {
            if (value) {
                if (this.isFragmentLoadedOrPending(value)) return;
                pendingRequests.push(value);
                sortRequestsByProperty.call(this, pendingRequests, "index");
            }
        },
        setCallbacks: function(onLoadingStart, onLoadingSuccess, onLoadingError, onStreamEnd) {
            startLoadingCallback = onLoadingStart;
            streamEndCallback = onStreamEnd;
            errorLoadingCallback = onLoadingError;
            successLoadingCallback = onLoadingSuccess;
        },
        isFragmentLoadedOrPending: function(request) {
            var isLoaded = false, ln = executedRequests.length, req;
            for (var i = 0; i < ln; i++) {
                req = executedRequests[i];
                if (request.startTime === req.startTime || req.action === "complete" && request.action === req.action) {
                    if (request.url === req.url) {
                        isLoaded = true;
                        break;
                    } else {
                        removeExecutedRequest(request);
                    }
                }
            }
            if (!isLoaded) {
                for (i = 0, ln = pendingRequests.length; i < ln; i += 1) {
                    req = pendingRequests[i];
                    if (request.url === req.url && request.startTime === req.startTime) {
                        isLoaded = true;
                    }
                }
            }
            if (!isLoaded) {
                for (i = 0, ln = loadingRequests.length; i < ln; i += 1) {
                    req = loadingRequests[i];
                    if (request.url === req.url && request.startTime === req.startTime) {
                        isLoaded = true;
                    }
                }
            }
            return isLoaded;
        },
        isReady: function() {
            return context.isReady();
        },
        getPendingRequests: function() {
            return pendingRequests;
        },
        getLoadingRequests: function() {
            return loadingRequests;
        },
        getLoadingTime: function() {
            var loadingTime = 0, req, i;
            for (i = executedRequests.length - 1; i >= 0; i -= 1) {
                req = executedRequests[i];
                if (req.requestEndDate instanceof Date && req.firstByteDate instanceof Date) {
                    loadingTime = req.requestEndDate.getTime() - req.firstByteDate.getTime();
                    break;
                }
            }
            return loadingTime;
        },
        getExecutedRequestForTime: function(time) {
            var lastIdx = executedRequests.length - 1, start = NaN, end = NaN, req = null, i;
            for (i = lastIdx; i >= 0; i -= 1) {
                req = executedRequests[i];
                start = req.startTime;
                end = start + req.duration;
                if (!isNaN(start) && !isNaN(end) && time > start && time < end) {
                    return req;
                }
            }
            return null;
        },
        getExecutedRequestForQualityAndIndex: function(quality, index) {
            var lastIdx = executedRequests.length - 1, req = null, i;
            for (i = lastIdx; i >= 0; i -= 1) {
                req = executedRequests[i];
                if (req.quality === quality && req.index === index) {
                    return req;
                }
            }
            return null;
        },
        removeExecutedRequest: function(request) {
            removeExecutedRequest.call(this, request);
        },
        removeExecutedRequestsBeforeTime: function(time) {
            var lastIdx = executedRequests.length - 1, start = NaN, req = null, i;
            for (i = lastIdx; i >= 0; i -= 1) {
                req = executedRequests[i];
                start = req.startTime;
                if (!isNaN(start) && start < time) {
                    removeExecutedRequest.call(this, req);
                }
            }
        },
        cancelPendingRequests: function() {
            pendingRequests = [];
        },
        abortRequests: function() {
            this.fragmentLoader.abort();
            loadingRequests = [];
        },
        executeCurrentRequest: function() {
            var self = this, currentRequest;
            if (pendingRequests.length === 0) return;
            if (loadingRequests.length >= LOADING_REQUEST_THRESHOLD) {
                return;
            }
            currentRequest = pendingRequests.shift();
            switch (currentRequest.action) {
              case "complete":
                executedRequests.push(currentRequest);
                streamEndCallback.call(context, currentRequest);
                break;

              case "download":
                loadingRequests.push(currentRequest);
                loadCurrentFragment.call(self, currentRequest);
                break;

              default:
                this.debug.log("Unknown request action.");
                if (currentRequest.deferred) {
                    currentRequest.deferred.reject();
                    currentRequest.deferred = null;
                } else {
                    errorLoadingCallback.call(context, currentRequest);
                }
            }
        }
    };
};

MediaPlayer.dependencies.FragmentModel.prototype = {
    constructor: MediaPlayer.dependencies.FragmentModel
};

MediaPlayer.dependencies.ManifestLoader = function() {
    "use strict";
    var RETRY_ATTEMPTS = 3, RETRY_INTERVAL = 500, deferred = null, parseBaseUrl = function(url) {
        var base = null;
        if (url.indexOf("/") !== -1) {
            if (url.indexOf("?") !== -1) {
                url = url.substring(0, url.indexOf("?"));
            }
            base = url.substring(0, url.lastIndexOf("/") + 1);
        }
        return base;
    }, doLoad = function(url, remainingAttempts) {
        var baseUrl = parseBaseUrl(url), request = new XMLHttpRequest(), requestTime = new Date(), mpdLoadedTime = null, needFailureReport = true, onload = null, report = null, self = this;
        onload = function() {
            if (request.status < 200 || request.status > 299) {
                return;
            }
            needFailureReport = false;
            mpdLoadedTime = new Date();
            self.tokenAuthentication.checkRequestHeaderForToken(request);
            self.metricsModel.addHttpRequest("stream", null, "MPD", url, null, null, requestTime, mpdLoadedTime, request.status, null, null);
            self.parser.parse(request.responseText, baseUrl).then(function(manifest) {
                manifest.mpdUrl = url;
                manifest.mpdLoadedTime = mpdLoadedTime;
                self.metricsModel.addManifestUpdate("stream", manifest.type, requestTime, mpdLoadedTime, manifest.availabilityStartTime);
                deferred.resolve(manifest);
            }, function() {
                deferred.reject(request);
            });
        };
        report = function() {
            if (!needFailureReport) {
                return;
            }
            needFailureReport = false;
            self.metricsModel.addHttpRequest("stream", null, "MPD", url, null, null, requestTime, new Date(), request.status, null, null);
            if (remainingAttempts > 0) {
                self.debug.log("Failed loading manifest: " + url + ", retry in " + RETRY_INTERVAL + "ms" + " attempts: " + remainingAttempts);
                remainingAttempts--;
                setTimeout(function() {
                    doLoad.call(self, url, remainingAttempts);
                }, RETRY_INTERVAL);
            } else {
                self.debug.log("Failed loading manifest: " + url + " no retry attempts left");
                self.errHandler.downloadError("manifest", url, request);
                deferred.reject(request);
            }
        };
        try {
            request.onload = onload;
            request.onloadend = report;
            request.onerror = report;
            request.open("GET", url, true);
            request.send();
        } catch (e) {
            request.onerror();
        }
    };
    return {
        debug: undefined,
        parser: undefined,
        errHandler: undefined,
        metricsModel: undefined,
        tokenAuthentication: undefined,
        load: function(url) {
            deferred = Q.defer();
            doLoad.call(this, url, RETRY_ATTEMPTS);
            return deferred.promise;
        }
    };
};

MediaPlayer.dependencies.ManifestLoader.prototype = {
    constructor: MediaPlayer.dependencies.ManifestLoader
};

MediaPlayer.models.ManifestModel = function() {
    "use strict";
    var manifest;
    return {
        system: undefined,
        eventBus: undefined,
        getValue: function() {
            return manifest;
        },
        setValue: function(value) {
            manifest = value;
            this.system.notify("manifestUpdated");
            this.eventBus.dispatchEvent({
                type: "manifestLoaded",
                data: value
            });
        }
    };
};

MediaPlayer.models.ManifestModel.prototype = {
    constructor: MediaPlayer.models.ManifestModel
};

MediaPlayer.dependencies.ManifestUpdater = function() {
    "use strict";
    var refreshDelay = NaN, refreshTimer = null, isStopped = false, deferredUpdate, clear = function() {
        if (refreshTimer !== null) {
            clearInterval(refreshTimer);
            refreshTimer = null;
        }
    }, start = function() {
        clear.call(this);
        if (!isNaN(refreshDelay)) {
            this.debug.log("Refresh manifest in " + refreshDelay + " seconds.");
            refreshTimer = setTimeout(onRefreshTimer.bind(this), Math.min(refreshDelay * 1e3, Math.pow(2, 31) - 1), this);
        }
    }, update = function() {
        var self = this, manifest = self.manifestModel.getValue(), timeSinceLastUpdate;
        if (manifest !== undefined && manifest !== null) {
            self.manifestExt.getRefreshDelay(manifest).then(function(t) {
                timeSinceLastUpdate = (new Date().getTime() - manifest.mpdLoadedTime.getTime()) / 1e3;
                refreshDelay = Math.max(t - timeSinceLastUpdate, 0);
                start.call(self);
            });
        }
    }, onRefreshTimer = function() {
        var self = this, manifest, url;
        Q.when(deferredUpdate ? deferredUpdate.promise : true).then(function() {
            deferredUpdate = Q.defer();
            manifest = self.manifestModel.getValue();
            url = manifest.mpdUrl;
            if (manifest.hasOwnProperty("Location")) {
                url = manifest.Location;
            }
            self.manifestLoader.load(url).then(function(manifestResult) {
                self.manifestModel.setValue(manifestResult);
                self.debug.log("Manifest has been refreshed.");
                if (isStopped) return;
                update.call(self);
            });
        });
    }, onStreamsComposed = function() {
        if (deferredUpdate) {
            deferredUpdate.resolve();
        }
    };
    return {
        debug: undefined,
        system: undefined,
        manifestModel: undefined,
        manifestExt: undefined,
        manifestLoader: undefined,
        setup: function() {
            update.call(this);
            this.system.mapHandler("streamsComposed", undefined, onStreamsComposed.bind(this));
        },
        start: function() {
            isStopped = false;
            update.call(this);
        },
        stop: function() {
            isStopped = true;
            clear.call(this);
        }
    };
};

MediaPlayer.dependencies.ManifestUpdater.prototype = {
    constructor: MediaPlayer.dependencies.ManifestUpdater
};

MediaPlayer.dependencies.MediaSourceExtensions = function() {
    "use strict";
};

MediaPlayer.dependencies.MediaSourceExtensions.prototype = {
    constructor: MediaPlayer.dependencies.MediaSourceExtensions,
    createMediaSource: function() {
        "use strict";
        var hasWebKit = "WebKitMediaSource" in window, hasMediaSource = "MediaSource" in window;
        if (hasMediaSource) {
            return Q.when(new MediaSource());
        } else if (hasWebKit) {
            return Q.when(new WebKitMediaSource());
        }
        return null;
    },
    attachMediaSource: function(source, videoModel) {
        "use strict";
        videoModel.setSource(window.URL.createObjectURL(source));
        return Q.when(true);
    },
    detachMediaSource: function(videoModel) {
        "use strict";
        videoModel.setSource("");
        return Q.when(true);
    },
    setDuration: function(source, value) {
        "use strict";
        source.duration = value;
        return Q.when(source.duration);
    },
    signalEndOfStream: function(source) {
        "use strict";
        source.endOfStream();
        return Q.when(true);
    }
};

MediaPlayer.models.MetricsModel = function() {
    "use strict";
    return {
        system: undefined,
        eventBus: undefined,
        streamMetrics: {},
        metricsChanged: function() {
            this.eventBus.dispatchEvent({
                type: "metricsChanged",
                data: {}
            });
        },
        metricChanged: function(streamType) {
            this.eventBus.dispatchEvent({
                type: "metricChanged",
                data: {
                    stream: streamType
                }
            });
            this.metricsChanged();
        },
        metricUpdated: function(streamType, metricType, vo) {
            this.eventBus.dispatchEvent({
                type: "metricUpdated",
                data: {
                    stream: streamType,
                    metric: metricType,
                    value: vo
                }
            });
            this.metricChanged(streamType);
        },
        metricAdded: function(streamType, metricType, vo) {
            this.eventBus.dispatchEvent({
                type: "metricAdded",
                data: {
                    stream: streamType,
                    metric: metricType,
                    value: vo
                }
            });
            this.metricChanged(streamType);
        },
        clearCurrentMetricsForType: function(type) {
            delete this.streamMetrics[type];
            this.metricChanged(type);
        },
        clearAllCurrentMetrics: function() {
            var self = this;
            this.streamMetrics = {};
            this.metricsChanged.call(self);
        },
        getReadOnlyMetricsFor: function(type) {
            if (this.streamMetrics.hasOwnProperty(type)) {
                return this.streamMetrics[type];
            }
            return null;
        },
        getMetricsFor: function(type) {
            var metrics;
            if (this.streamMetrics.hasOwnProperty(type)) {
                metrics = this.streamMetrics[type];
            } else {
                metrics = this.system.getObject("metrics");
                this.streamMetrics[type] = metrics;
            }
            return metrics;
        },
        addTcpConnection: function(streamType, tcpid, dest, topen, tclose, tconnect) {
            var vo = new MediaPlayer.vo.metrics.TCPConnection();
            vo.tcpid = tcpid;
            vo.dest = dest;
            vo.topen = topen;
            vo.tclose = tclose;
            vo.tconnect = tconnect;
            this.getMetricsFor(streamType).TcpList.push(vo);
            this.metricAdded(streamType, "TcpConnection", vo);
            return vo;
        },
        addHttpRequest: function(streamType, tcpid, type, url, actualurl, range, trequest, tresponse, tfinish, responsecode, interval, mediaduration) {
            var vo = new MediaPlayer.vo.metrics.HTTPRequest();
            vo.stream = streamType;
            vo.tcpid = tcpid;
            vo.type = type;
            vo.url = url;
            vo.actualurl = actualurl;
            vo.range = range;
            vo.trequest = trequest;
            vo.tresponse = tresponse;
            vo.tfinish = tfinish;
            vo.responsecode = responsecode;
            vo.interval = interval;
            vo.mediaduration = mediaduration;
            this.getMetricsFor(streamType).HttpList.push(vo);
            this.metricAdded(streamType, "HttpRequest", vo);
            return vo;
        },
        appendHttpTrace: function(httpRequest, s, d, b) {
            var vo = new MediaPlayer.vo.metrics.HTTPRequest.Trace();
            vo.s = s;
            vo.d = d;
            vo.b = b;
            httpRequest.trace.push(vo);
            this.metricUpdated(httpRequest.stream, "HttpRequestTrace", httpRequest);
            return vo;
        },
        addRepresentationSwitch: function(streamType, t, mt, to, lto) {
            var vo = new MediaPlayer.vo.metrics.RepresentationSwitch();
            vo.t = t;
            vo.mt = mt;
            vo.to = to;
            vo.lto = lto;
            this.getMetricsFor(streamType).RepSwitchList.push(vo);
            this.metricAdded(streamType, "RepresentationSwitch", vo);
            return vo;
        },
        addBufferLevel: function(streamType, t, level) {
            var vo = new MediaPlayer.vo.metrics.BufferLevel();
            vo.t = t;
            vo.level = level;
            this.getMetricsFor(streamType).BufferLevel.push(vo);
            this.metricAdded(streamType, "BufferLevel", vo);
            return vo;
        },
        addDVRInfo: function(streamType, currentTime, mpd, range) {
            var vo = new MediaPlayer.vo.metrics.DVRInfo();
            vo.time = currentTime;
            vo.range = range;
            vo.mpd = mpd;
            this.getMetricsFor(streamType).DVRInfo.push(vo);
            this.metricAdded(streamType, "DVRInfo", vo);
            return vo;
        },
        addDroppedFrames: function(streamType, quality) {
            var vo = new MediaPlayer.vo.metrics.DroppedFrames(), list = this.getMetricsFor(streamType).DroppedFrames;
            vo.time = quality.creationTime;
            vo.droppedFrames = quality.droppedVideoFrames;
            if (list.length > 0 && list[list.length - 1] == vo) {
                return list[list.length - 1];
            }
            list.push(vo);
            this.metricAdded(streamType, "DroppedFrames", vo);
            return vo;
        },
        addManifestUpdate: function(streamType, type, requestTime, fetchTime, availabilityStartTime, presentationStartTime, clientTimeOffset, currentTime, buffered, latency) {
            var vo = new MediaPlayer.vo.metrics.ManifestUpdate(), metrics = this.getMetricsFor("stream");
            vo.streamType = streamType;
            vo.type = type;
            vo.requestTime = requestTime;
            vo.fetchTime = fetchTime;
            vo.availabilityStartTime = availabilityStartTime;
            vo.presentationStartTime = presentationStartTime;
            vo.clientTimeOffset = clientTimeOffset;
            vo.currentTime = currentTime;
            vo.buffered = buffered;
            vo.latency = latency;
            metrics.ManifestUpdate.push(vo);
            this.metricAdded(streamType, "ManifestUpdate", vo);
            return vo;
        },
        updateManifestUpdateInfo: function(manifestUpdate, updatedFields) {
            for (var field in updatedFields) {
                manifestUpdate[field] = updatedFields[field];
            }
            this.metricUpdated(manifestUpdate.streamType, "ManifestUpdate", manifestUpdate);
        },
        addManifestUpdatePeriodInfo: function(manifestUpdate, id, index, start, duration) {
            var vo = new MediaPlayer.vo.metrics.ManifestUpdate.PeriodInfo();
            vo.id = id;
            vo.index = index;
            vo.start = start;
            vo.duration = duration;
            manifestUpdate.periodInfo.push(vo);
            this.metricUpdated(manifestUpdate.streamType, "ManifestUpdatePeriodInfo", manifestUpdate);
            return vo;
        },
        addManifestUpdateRepresentationInfo: function(manifestUpdate, id, index, periodIndex, streamType, presentationTimeOffset, startNumber, segmentInfoType) {
            var vo = new MediaPlayer.vo.metrics.ManifestUpdate.RepresentationInfo();
            vo.id = id;
            vo.index = index;
            vo.periodIndex = periodIndex;
            vo.streamType = streamType;
            vo.startNumber = startNumber;
            vo.segmentInfoType = segmentInfoType;
            vo.presentationTimeOffset = presentationTimeOffset;
            manifestUpdate.representationInfo.push(vo);
            this.metricUpdated(manifestUpdate.streamType, "ManifestUpdateRepresentationInfo", manifestUpdate);
            return vo;
        },
        addPlayList: function(streamType, start, mstart, starttype) {
            var vo = new MediaPlayer.vo.metrics.PlayList();
            vo.stream = streamType;
            vo.start = start;
            vo.mstart = mstart;
            vo.starttype = starttype;
            this.getMetricsFor(streamType).PlayList.push(vo);
            this.metricAdded(streamType, "PlayList", vo);
            return vo;
        },
        appendPlayListTrace: function(playList, representationid, subreplevel, start, mstart, duration, playbackspeed, stopreason) {
            var vo = new MediaPlayer.vo.metrics.PlayList.Trace();
            vo.representationid = representationid;
            vo.subreplevel = subreplevel;
            vo.start = start;
            vo.mstart = mstart;
            vo.duration = duration;
            vo.playbackspeed = playbackspeed;
            vo.stopreason = stopreason;
            playList.trace.push(vo);
            this.metricUpdated(playList.stream, "PlayListTrace", playList);
            return vo;
        }
    };
};

MediaPlayer.models.MetricsModel.prototype = {
    constructor: MediaPlayer.models.MetricsModel
};

MediaPlayer.dependencies.ProtectionController = function() {
    "use strict";
    var element = null, keySystems = null, teardownKeySystem = function(kid) {
        var self = this;
        self.protectionModel.removeKeySystem(kid);
    }, selectKeySystem = function(codec, contentProtection, initData) {
        var self = this;
        for (var ks = 0; ks < keySystems.length; ++ks) {
            for (var cp = 0; cp < contentProtection.length; ++cp) {
                if (keySystems[ks].isSupported(contentProtection[cp]) && self.protectionExt.supportsCodec(keySystems[ks].keysTypeString, codec)) {
                    var kid = self.manifestExt.getKID(contentProtection[cp]);
                    if (!kid) {
                        kid = "unknown";
                    }
                    self.protectionModel.addKeySystem(kid, contentProtection[cp], keySystems[ks], initData);
                    self.debug.log("DRM: Selected Key System: " + keySystems[ks].keysTypeString + " For KID: " + kid);
                    return kid;
                }
            }
        }
        throw new Error("DRM: The protection system for this content is not supported.");
    }, ensureKeySession = function(kid, codec, eventInitData) {
        var self = this, session = null, initData = null;
        if (!self.protectionModel.needToAddKeySession(kid)) {
            return;
        }
        initData = self.protectionModel.getInitData(kid);
        if (!initData && !!eventInitData) {
            initData = eventInitData;
            self.debug.log("DRM: Using initdata from needskey event. length: " + initData.length);
        } else if (!!initData) {
            self.debug.log("DRM: Using initdata from prheader in mpd. length: " + initData.length);
        }
        if (!!initData) {
            session = self.protectionModel.addKeySession(kid, codec, initData);
            self.debug.log("DRM: Added Key Session [" + session.sessionId + "] for KID: " + kid + " type: " + codec + " initData length: " + initData.length);
        } else {
            self.debug.log("DRM: initdata is null.");
        }
    }, updateFromMessage = function(kid, session, sessionId, msg, laURL) {
        var self = this, result;
        result = self.protectionModel.updateFromMessage(kid, sessionId, msg, laURL, element);
        result.then(function(data) {
            session.update(data);
        });
        return result;
    };
    return {
        system: undefined,
        debug: undefined,
        manifestExt: undefined,
        capabilities: undefined,
        videoModel: undefined,
        protectionModel: undefined,
        protectionExt: undefined,
        setup: function() {
            keySystems = this.protectionExt.getKeySystems();
        },
        init: function(videoModel, protectionModel) {
            this.videoModel = videoModel;
            this.protectionModel = protectionModel;
            element = this.videoModel.getElement();
        },
        selectKeySystem: selectKeySystem,
        ensureKeySession: ensureKeySession,
        updateFromMessage: updateFromMessage,
        teardownKeySystem: teardownKeySystem
    };
};

MediaPlayer.dependencies.ProtectionController.prototype = {
    constructor: MediaPlayer.dependencies.ProtectionController
};

MediaPlayer.dependencies.ProtectionExtensions = function() {
    "use strict";
};

MediaPlayer.dependencies.ProtectionExtensions.prototype = {
    constructor: MediaPlayer.dependencies.ProtectionExtensions,
    supportsCodec: function(mediaKeysString, codec) {
        "use strict";
        var hasWebKit = "WebKitMediaKeys" in window, hasMs = "MSMediaKeys" in window, hasMediaSource = "MediaKeys" in window;
        if (hasMediaSource) {
            return MediaKeys.isTypeSupported(mediaKeysString, codec);
        } else if (hasWebKit) {
            return WebKitMediaKeys.isTypeSupported(mediaKeysString, codec);
        } else if (hasMs) {
            return MSMediaKeys.isTypeSupported(mediaKeysString, codec);
        }
        return false;
    },
    createMediaKeys: function(mediaKeysString) {
        "use strict";
        var hasWebKit = "WebKitMediaKeys" in window, hasMs = "MSMediaKeys" in window, hasMediaSource = "MediaKeys" in window;
        if (hasMediaSource) {
            return new MediaKeys(mediaKeysString);
        } else if (hasWebKit) {
            return new WebKitMediaKeys(mediaKeysString);
        } else if (hasMs) {
            return new MSMediaKeys(mediaKeysString);
        }
        return null;
    },
    setMediaKey: function(element, mediaKeys, initData) {
        var hasWebKit = "WebKitSetMediaKeys" in element, hasMs = "msSetMediaKeys" in element, hasStd = "SetMediaKeys" in element, hasWebkitGenerateKeyRequest = "webkitGenerateKeyRequest" in element;
        if (hasStd) {
            return element.SetMediaKeys(mediaKeys);
        } else if (hasWebkitGenerateKeyRequest) {
            return element.webkitGenerateKeyRequest(mediaKeys.keySystem, initData);
        } else if (hasWebKit) {
            return element.WebKitSetMediaKeys(mediaKeys);
        } else if (hasMs) {
            return element.msSetMediaKeys(mediaKeys);
        } else {
            this.debug.log("no setmediakeys function in element");
        }
    },
    createSession: function(mediaKeys, mediaCodec, initData) {
        return mediaKeys.createSession(mediaCodec, initData);
    },
    getKeySystems: function() {
        var playreadyGetUpdate = function(sessionId, rawMessage, uint16Message, laURL, element) {
            var deferred = Q.defer(), decodedChallenge = null, headers = [], parser = new DOMParser(), xmlDoc = parser.parseFromString(uint16Message, "application/xml");
            if (xmlDoc.getElementsByTagName("Challenge")[0]) {
                var Challenge = xmlDoc.getElementsByTagName("Challenge")[0].childNodes[0].nodeValue;
                if (Challenge) {
                    decodedChallenge = BASE64.decode(Challenge);
                }
            } else {
                deferred.reject("DRM: playready update, can not find Challenge in keyMessage");
                return deferred.promise;
            }
            var headerNameList = xmlDoc.getElementsByTagName("name");
            var headerValueList = xmlDoc.getElementsByTagName("value");
            if (headerNameList.length != headerValueList.length) {
                deferred.reject("DRM: playready update, invalid header name/value pair in keyMessage");
                return deferred.promise;
            }
            for (var i = 0; i < headerNameList.length; i++) {
                headers[i] = {
                    name: headerNameList[i].childNodes[0].nodeValue,
                    value: headerValueList[i].childNodes[0].nodeValue
                };
            }
            var xhr = new XMLHttpRequest();
            xhr.onload = function() {
                if (xhr.status == 200) {
                    deferred.resolve(new Uint8Array(xhr.response));
                } else {
                    deferred.reject('DRM: playready update, XHR status is "' + xhr.statusText + '" (' + xhr.status + "), expected to be 200. readyState is " + xhr.readyState);
                }
            };
            xhr.onabort = function() {
                deferred.reject('DRM: playready update, XHR aborted. status is "' + xhr.statusText + '" (' + xhr.status + "), readyState is " + xhr.readyState);
            };
            xhr.onerror = function() {
                deferred.reject('DRM: playready update, XHR error. status is "' + xhr.statusText + '" (' + xhr.status + "), readyState is " + xhr.readyState);
            };
            xhr.open("POST", laURL);
            xhr.responseType = "arraybuffer";
            if (headers) {
                headers.forEach(function(hdr) {
                    xhr.setRequestHeader(hdr.name, hdr.value);
                });
            }
            xhr.send(decodedChallenge);
            return deferred.promise;
        }, playReadyNeedToAddKeySession = function(initData, keySessions) {
            return initData === null && keySessions.length === 0;
        }, playreadyGetInitData = function(data) {
            var byteCursor = 0, PROSize = 0, PSSHSize = 0, PSSHBoxType = new Uint8Array([ 112, 115, 115, 104, 0, 0, 0, 0 ]), playreadySystemID = new Uint8Array([ 154, 4, 240, 121, 152, 64, 66, 134, 171, 146, 230, 91, 224, 136, 95, 149 ]), uint8arraydecodedPROHeader = null, PSSHBoxBuffer = null, PSSHBox = null, PSSHData = null;
            if ("pro" in data) {
                uint8arraydecodedPROHeader = BASE64.decodeArray(data.pro.__text);
            } else if ("prheader" in data) {
                uint8arraydecodedPROHeader = BASE64.decodeArray(data.prheader.__text);
            } else {
                return null;
            }
            PROSize = uint8arraydecodedPROHeader.length;
            PSSHSize = 4 + PSSHBoxType.length + playreadySystemID.length + 4 + PROSize;
            PSSHBoxBuffer = new ArrayBuffer(PSSHSize);
            PSSHBox = new Uint8Array(PSSHBoxBuffer);
            PSSHData = new DataView(PSSHBoxBuffer);
            PSSHData.setUint32(byteCursor, PSSHSize);
            byteCursor += 4;
            PSSHBox.set(PSSHBoxType, byteCursor);
            byteCursor += PSSHBoxType.length;
            PSSHBox.set(playreadySystemID, byteCursor);
            byteCursor += playreadySystemID.length;
            PSSHData.setUint32(byteCursor, PROSize);
            byteCursor += 4;
            PSSHBox.set(uint8arraydecodedPROHeader, byteCursor);
            byteCursor += PROSize;
            return PSSHBox;
        };
        return [ {
            schemeIdUri: "urn:uuid:9a04f079-9840-4286-ab92-e65be0885f95",
            keysTypeString: "com.microsoft.playready",
            isSupported: function(data) {
                return this.schemeIdUri === data.schemeIdUri.toLowerCase();
            },
            needToAddKeySession: playReadyNeedToAddKeySession,
            getInitData: playreadyGetInitData,
            getUpdate: playreadyGetUpdate
        }, {
            schemeIdUri: "urn:mpeg:dash:mp4protection:2011",
            keysTypeString: "com.microsoft.playready",
            isSupported: function(data) {
                return this.schemeIdUri === data.schemeIdUri.toLowerCase() && data.value.toLowerCase() === "cenc";
            },
            needToAddKeySession: playReadyNeedToAddKeySession,
            getInitData: function() {
                return null;
            },
            getUpdate: playreadyGetUpdate
        }, {
            schemeIdUri: "urn:uuid:00000000-0000-0000-0000-000000000000",
            keysTypeString: "webkit-org.w3.clearkey",
            isSupported: function(data) {
                return this.schemeIdUri === data.schemeIdUri.toLowerCase();
            },
            needToAddKeySession: function() {
                return true;
            },
            getInitData: function() {
                return null;
            },
            getUpdate: function(sessionId, rawMessage, uint16Message, laURL, element) {
                return Q.when(uint16Message);
            }
        }, {
            schemeIdUri: "urn:uuid:edef8ba9-79d6-4ace-a3c8-27dcd51d21ed",
            keysTypeString: "com.widevine.alpha",
            isSupported: function(data) {
                return this.schemeIdUri === data.schemeIdUri.toLowerCase();
            },
            needToAddKeySession: function() {
                return false;
            },
            getInitData: function() {
                return null;
            },
            getUpdate: function(sessionId, rawMessage, uint16Message, laURL, element) {
                var deferred = Q.defer();
                var xhr = new XMLHttpRequest();
                xhr.open("POST", "http://10.51.1.90/", true);
                xhr.responseType = "arraybuffer";
                xhr.onload = function(e) {
                    if (xhr.status == 200) {
                        var key = new Uint8Array(xhr.response);
                        element.webkitAddKey("com.widevine.alpha", key, null, sessionId);
                        deferred.resolve(key);
                    } else {
                        deferred.reject('DRM: Widevine update, XHR status is "' + xhr.statusText + '" (' + xhr.status + "), expected to be 200. readyState is " + xhr.readyState);
                    }
                };
                xhr.onabort = function() {
                    deferred.reject('DRM: Widevine update, XHR aborted. status is "' + xhr.statusText + '" (' + xhr.status + "), readyState is " + xhr.readyState);
                };
                xhr.onerror = function() {
                    deferred.reject('DRM: Widevine update, XHR error. status is "' + xhr.statusText + '" (' + xhr.status + "), readyState is " + xhr.readyState);
                };
                xhr.send(rawMessage);
                return deferred.promise;
            }
        } ];
    },
    addKey: function(element, type, key, data, id) {
        element.webkitAddKey(type, key, data, id);
    },
    generateKeyRequest: function(element, type, data) {
        element.webkitGenerateKeyRequest(type, data);
    },
    listenToNeedKey: function(videoModel, listener) {
        videoModel.listen("webkitneedkey", listener);
        videoModel.listen("msneedkey", listener);
        videoModel.listen("needKey", listener);
    },
    listenToKeyError: function(source, listener) {
        source.addEventListener("webkitkeyerror", listener, false);
        source.addEventListener("mskeyerror", listener, false);
        source.addEventListener("keyerror", listener, false);
    },
    listenToVideoModelKeyMessage: function(videoModel, listener) {
        videoModel.listen("webkitkeymessage", listener);
        videoModel.listen("mskeymessage", listener);
        videoModel.listen("keymessage", listener);
    },
    listenToKeyMessage: function(source, listener) {
        source.addEventListener("webkitkeymessage", listener, false);
        source.addEventListener("mskeymessage", listener, false);
        source.addEventListener("keymessage", listener, false);
    },
    listenToKeyAdded: function(source, listener) {
        source.addEventListener("webkitkeyadded", listener, false);
        source.addEventListener("mskeyadded", listener, false);
        source.addEventListener("keyadded", listener, false);
    },
    unlistenToKeyError: function(source, listener) {
        source.removeEventListener("webkitkeyerror", listener);
        source.removeEventListener("mskeyerror", listener);
        source.removeEventListener("keyerror", listener);
    },
    unlistenToKeyMessage: function(source, listener) {
        source.removeEventListener("webkitkeymessage", listener);
        source.removeEventListener("mskeymessage", listener);
        source.removeEventListener("keymessage", listener);
    },
    unlistenToKeyAdded: function(source, listener) {
        source.removeEventListener("webkitkeyadded", listener);
        source.removeEventListener("mskeyadded", listener);
        source.removeEventListener("keyadded", listener);
    }
};

MediaPlayer.models.ProtectionModel = function() {
    "use strict";
    var element = null, keyAddedListener = null, keyErrorListener = null, keyMessageListener = null, keySystems = [];
    return {
        system: undefined,
        videoModel: undefined,
        protectionExt: undefined,
        setup: function() {
            element = this.videoModel.getElement();
        },
        init: function(videoModel) {
            this.videoModel = videoModel;
            element = this.videoModel.getElement();
        },
        addKeySession: function(kid, mediaCodec, initData) {
            var session = null;
            session = this.protectionExt.createSession(keySystems[kid].keys, mediaCodec, initData);
            this.protectionExt.listenToKeyAdded(session, keyAddedListener);
            this.protectionExt.listenToKeyError(session, keyErrorListener);
            this.protectionExt.listenToKeyMessage(session, keyMessageListener);
            keySystems[kid].initData = initData;
            keySystems[kid].keySessions.push(session);
            return session;
        },
        addKeySystem: function(kid, contentProtectionData, keySystemDesc, initData) {
            var keysLocal = null;
            keysLocal = this.protectionExt.createMediaKeys(keySystemDesc.keysTypeString);
            this.protectionExt.setMediaKey(element, keysLocal, initData);
            keySystems[kid] = {
                kID: kid,
                contentProtection: contentProtectionData,
                keySystem: keySystemDesc,
                keys: keysLocal,
                initData: null,
                keySessions: []
            };
        },
        removeKeySystem: function(kid) {
            if (kid !== null && keySystems[kid] !== undefined && keySystems[kid].keySessions.length !== 0) {
                var keySessions = keySystems[kid].keySessions;
                for (var kss = 0; kss < keySessions.length; ++kss) {
                    this.protectionExt.unlistenToKeyError(keySessions[kss], keyErrorListener);
                    this.protectionExt.unlistenToKeyAdded(keySessions[kss], keyAddedListener);
                    this.protectionExt.unlistenToKeyMessage(keySessions[kss], keyMessageListener);
                    keySessions[kss].close();
                }
                keySystems[kid] = undefined;
            }
        },
        needToAddKeySession: function(kid) {
            var keySystem = null;
            keySystem = keySystems[kid];
            return keySystem.keySystem.needToAddKeySession(keySystem.initData, keySystem.keySessions);
        },
        getInitData: function(kid) {
            var keySystem = null;
            keySystem = keySystems[kid];
            return keySystem.keySystem.getInitData(keySystem.contentProtection);
        },
        updateFromMessage: function(kid, sessionId, rawMessage, uint16Message, laURL) {
            return keySystems[kid].keySystem.getUpdate(sessionId, rawMessage, uint16Message, laURL, element);
        },
        listenToNeedKey: function(listener) {
            this.protectionExt.listenToNeedKey(this.videoModel, listener);
        },
        listenToKeyError: function(listener) {
            keyErrorListener = listener;
            for (var ks = 0; ks < keySystems.length; ++ks) {
                var keySessions = keySystems[ks].keySessions;
                for (var kss = 0; kss < keySessions.length; ++kss) {
                    this.protectionExt.listenToKeyError(keySessions[kss], listener);
                }
            }
        },
        listenToKeyMessage: function(listener) {
            keyMessageListener = listener;
            this.protectionExt.listenToVideoModelKeyMessage(this.videoModel, listener);
            for (var ks = 0; ks < keySystems.length; ++ks) {
                var keySessions = keySystems[ks].keySessions;
                for (var kss = 0; kss < keySessions.length; ++kss) {
                    this.protectionExt.listenToKeyMessage(keySessions[kss], listener);
                }
            }
        },
        listenToKeyAdded: function(listener) {
            keyAddedListener = listener;
            for (var ks = 0; ks < keySystems.length; ++ks) {
                var keySessions = keySystems[ks].keySessions;
                for (var kss = 0; kss < keySessions.length; ++kss) {
                    this.protectionExt.listenToKeyAdded(keySessions[kss], listener);
                }
            }
        }
    };
};

MediaPlayer.models.ProtectionModel.prototype = {
    constructor: MediaPlayer.models.ProtectionModel
};

MediaPlayer.dependencies.RequestScheduler = function() {
    "use strict";
    var schedulerModels = [], periodicExecuteInterval = null, periodicExecuteId = null, isCheckingForVideoTimeTriggersStarted = false, PERIODICALLY_TRIGGERED_TASK = 0, WALL_TIME_TRIGGERED_TASK = 1, VIDEO_TIME_TRIGGERED_TASK = 2, setVideoTimeTrigger = function(executeContext, executeFunction, dueTime) {
        if (!executeContext || !executeFunction) return;
        var schedulerModel;
        schedulerModel = registerSchedulerModel.call(this, executeContext, VIDEO_TIME_TRIGGERED_TASK);
        schedulerModel.setScheduledTask(executeFunction);
        schedulerModel.setIsScheduled(true);
        schedulerModel.setExecuteTime(dueTime);
        if (!isCheckingForVideoTimeTriggersStarted) {
            startCheckingDueTimeForVideoTimeTrigger.call(this);
        }
    }, startCheckingDueTimeForVideoTimeTrigger = function() {
        var element = this.videoModel.getElement();
        this.schedulerExt.attachScheduleListener(element, checkDueTimeForVideoTimeTriggers.bind(this));
        this.schedulerExt.attachUpdateScheduleListener(element, onUpdateSchedule.bind(this));
        isCheckingForVideoTimeTriggersStarted = true;
    }, checkDueTimeForVideoTimeTriggers = function() {
        var videoTimeTriggers = getAllModelsForType.call(this, VIDEO_TIME_TRIGGERED_TASK), ln = videoTimeTriggers.length, now = this.videoModel.getCurrentTime(), model, due, i;
        for (i = 0; i < ln; i += 1) {
            model = videoTimeTriggers[i];
            due = model.getExecuteTime();
            if (model.getIsScheduled() && now > due) {
                model.executeScheduledTask();
                model.setIsScheduled(false);
            }
        }
    }, removeVideoTimeTrigger = function(executeContext) {
        var schedulerModel = findSchedulerModel(executeContext, VIDEO_TIME_TRIGGERED_TASK), videoTimeTriggers;
        if (schedulerModel) {
            unregisterSchedulerModel(schedulerModel);
            videoTimeTriggers = getAllModelsForType.call(this, VIDEO_TIME_TRIGGERED_TASK);
            if (videoTimeTriggers.length === 0) {
                stopCheckingDueTimeForVideoTimeTrigger.call(this);
            }
        }
    }, stopCheckingDueTimeForVideoTimeTrigger = function() {
        var element = this.videoModel.getElement();
        this.schedulerExt.detachScheduleListener(element, checkDueTimeForVideoTimeTriggers.bind(this));
        this.schedulerExt.detachUpdateScheduleListener(element, onUpdateSchedule.bind(this));
        isCheckingForVideoTimeTriggersStarted = false;
    }, onUpdateSchedule = function() {
        rescheduleVideoTimeTriggers.call(this);
        checkDueTimeForVideoTimeTriggers.call(this);
    }, rescheduleVideoTimeTriggers = function() {
        var videoTimeTriggers = getAllModelsForType.call(this, VIDEO_TIME_TRIGGERED_TASK), ln = videoTimeTriggers.length, i;
        for (i = 0; i < ln; i += 1) {
            videoTimeTriggers[i].setIsScheduled(true);
        }
    }, setTriggerForWallTime = function(executeContext, executeFunction, wallTime) {
        if (!executeContext || !executeFunction) return;
        var executeTimeout = wallTime.getTime() - new Date().getTime(), executeId, schedulerModel;
        schedulerModel = registerSchedulerModel.call(this, executeContext, WALL_TIME_TRIGGERED_TASK);
        schedulerModel.setScheduledTask(executeFunction);
        executeId = setTimeout(function() {
            schedulerModel.executeScheduledTask();
            unregisterSchedulerModel(schedulerModel);
        }, executeTimeout);
        schedulerModel.setExecuteId(executeId);
    }, removeTriggerForWallTime = function(executeContext) {
        var schedulerModel = findSchedulerModel(executeContext, WALL_TIME_TRIGGERED_TASK);
        if (schedulerModel) {
            clearTimeout(schedulerModel.getExecuteId());
            unregisterSchedulerModel(schedulerModel);
        }
    }, startScheduling = function(executeContext, executeFunction) {
        if (!executeContext || !executeFunction) return;
        var schedulerModel = findSchedulerModel(executeContext, PERIODICALLY_TRIGGERED_TASK);
        if (!schedulerModel) {
            schedulerModel = registerSchedulerModel.call(this, executeContext, PERIODICALLY_TRIGGERED_TASK);
        }
        schedulerModel.setIsScheduled(true);
        schedulerModel.setScheduledTask(executeFunction);
        startPeriodicScheduleListener.call(this);
        executeFunction.call(executeContext);
    }, onScheduledTimeOccurred = function() {
        runScheduledTasks.call(this);
    }, runScheduledTasks = function() {
        var self = this, schedulerModel, periodicModels = getAllModelsForType.call(self, PERIODICALLY_TRIGGERED_TASK), ln = periodicModels.length, i;
        for (i = 0; i < ln; i += 1) {
            schedulerModel = periodicModels[i];
            if (schedulerModel.getIsScheduled()) {
                schedulerModel.executeScheduledTask();
            }
        }
    }, startPeriodicScheduleListener = function() {
        if (periodicExecuteId !== null) return;
        this.adjustExecuteInterval();
        periodicExecuteId = setInterval(onScheduledTimeOccurred.bind(this), periodicExecuteInterval);
    }, stopPeriodicScheduling = function(executeContext) {
        var schedulerModel = findSchedulerModel(executeContext, PERIODICALLY_TRIGGERED_TASK), periodicModels = getAllModelsForType.call(this, PERIODICALLY_TRIGGERED_TASK);
        if (schedulerModel) {
            unregisterSchedulerModel(schedulerModel);
            if (periodicModels.length === 0) {
                stopPeriodicScheduleListener.call(this);
            }
        }
    }, stopPeriodicScheduleListener = function() {
        clearInterval(periodicExecuteId);
        periodicExecuteId = null;
    }, registerSchedulerModel = function(executeContext, type) {
        if (!executeContext) return null;
        var model = this.system.getObject("schedulerModel");
        model.setContext(executeContext);
        model.setType(type);
        schedulerModels.push(model);
        return model;
    }, getAllModelsForType = function(type) {
        var models = [], model, i;
        for (i = 0; i < schedulerModels.length; i += 1) {
            model = schedulerModels[i];
            if (model.getType() === type) {
                models.push(model);
            }
        }
        return models;
    }, unregisterSchedulerModel = function(schedulerModel) {
        var index = schedulerModels.indexOf(schedulerModel);
        if (index !== -1) {
            schedulerModels.splice(index, 1);
        }
    }, findSchedulerModel = function(executeContext, type) {
        for (var i = 0; i < schedulerModels.length; i++) {
            if (schedulerModels[i].getContext() === executeContext && schedulerModels[i].getType() === type) {
                return schedulerModels[i];
            }
        }
        return null;
    };
    return {
        system: undefined,
        videoModel: undefined,
        debug: undefined,
        schedulerExt: undefined,
        isScheduled: function(executeContext) {
            var schedulerModel = findSchedulerModel(executeContext, PERIODICALLY_TRIGGERED_TASK);
            return !!schedulerModel && schedulerModel.getIsScheduled();
        },
        getExecuteInterval: function() {
            return periodicExecuteInterval;
        },
        adjustExecuteInterval: function() {
            if (schedulerModels.length < 1) return;
            var newExecuteInterval = this.schedulerExt.getExecuteInterval(schedulerModels[0].getContext());
            if (periodicExecuteInterval !== newExecuteInterval) {
                periodicExecuteInterval = newExecuteInterval;
                if (periodicExecuteId !== null) {
                    this.debug.log("Changing execute interval: " + periodicExecuteInterval);
                    clearInterval(periodicExecuteId);
                    periodicExecuteId = setInterval(onScheduledTimeOccurred.bind(this), periodicExecuteInterval);
                }
            }
        },
        startScheduling: startScheduling,
        stopScheduling: stopPeriodicScheduling,
        setTriggerForVideoTime: setVideoTimeTrigger,
        setTriggerForWallTime: setTriggerForWallTime,
        removeTriggerForVideoTime: removeVideoTimeTrigger,
        removeTriggerForWallTime: removeTriggerForWallTime
    };
};

MediaPlayer.dependencies.RequestScheduler.prototype = {
    constructor: MediaPlayer.dependencies.RequestScheduler
};

MediaPlayer.dependencies.SchedulerExtensions = function() {
    "use strict";
};

MediaPlayer.dependencies.SchedulerExtensions.prototype = {
    constructor: MediaPlayer.dependencies.SchedulerExtensions,
    getExecuteInterval: function(context) {
        var interval = 1e3;
        if (typeof context.getMinBufferTime !== "undefined") {
            interval = context.getMinBufferTime() * 1e3 / 4;
            interval = Math.max(interval, 1e3);
        }
        return interval;
    },
    attachScheduleListener: function(element, scheduleListener) {
        element.addEventListener("timeupdate", scheduleListener);
    },
    detachScheduleListener: function(element, scheduleListener) {
        element.removeEventListener("timeupdate", scheduleListener);
    },
    attachUpdateScheduleListener: function(element, updateScheduleListener) {
        element.addEventListener("seeking", updateScheduleListener);
    },
    detachUpdateScheduleListener: function(element, updateScheduleListener) {
        element.removeEventListener("seeking", updateScheduleListener);
    }
};

MediaPlayer.dependencies.SchedulerModel = function() {
    "use strict";
    var context, scheduledTask, type, executeTime, executeId, isScheduled = false;
    return {
        system: undefined,
        debug: undefined,
        schedulerExt: undefined,
        setContext: function(value) {
            context = value;
        },
        getContext: function() {
            return context;
        },
        setScheduledTask: function(value) {
            scheduledTask = value;
        },
        executeScheduledTask: function() {
            scheduledTask.call(context);
        },
        setExecuteTime: function(value) {
            executeTime = value;
        },
        getExecuteTime: function() {
            return executeTime;
        },
        setExecuteId: function(value) {
            executeId = value;
        },
        getExecuteId: function() {
            return executeId;
        },
        setType: function(value) {
            type = value;
        },
        getType: function() {
            return type;
        },
        setIsScheduled: function(value) {
            isScheduled = value;
        },
        getIsScheduled: function() {
            return isScheduled;
        }
    };
};

MediaPlayer.dependencies.SchedulerModel.prototype = {
    constructor: MediaPlayer.dependencies.SchedulerModel
};

MediaPlayer.dependencies.SourceBufferExtensions = function() {
    "use strict";
    this.system = undefined;
    this.manifestExt = undefined;
};

MediaPlayer.dependencies.SourceBufferExtensions.prototype = {
    constructor: MediaPlayer.dependencies.SourceBufferExtensions,
    createSourceBuffer: function(mediaSource, codec) {
        "use strict";
        var deferred = Q.defer(), self = this;
        try {
            deferred.resolve(mediaSource.addSourceBuffer(codec));
        } catch (ex) {
            if (!self.manifestExt.getIsTextTrack(codec)) {
                deferred.reject(ex.description);
            } else {
                deferred.resolve(self.system.getObject("textSourceBuffer"));
            }
        }
        return deferred.promise;
    },
    removeSourceBuffer: function(mediaSource, buffer) {
        "use strict";
        var deferred = Q.defer();
        try {
            deferred.resolve(mediaSource.removeSourceBuffer(buffer));
        } catch (ex) {
            if (buffer && typeof buffer.getTextTrackExtensions === "function") {
                deferred.resolve();
            } else {
                deferred.reject(ex.description);
            }
        }
        return deferred.promise;
    },
    getBufferRange: function(buffer, time, tolerance) {
        "use strict";
        var ranges = null, start = 0, end = 0, firstStart = null, lastEnd = null, gap = 0, toler = tolerance || .15, len, i;
        try {
            ranges = buffer.buffered;
        } catch (ex) {
            return Q.when(null);
        }
        if (ranges !== null) {
            for (i = 0, len = ranges.length; i < len; i += 1) {
                start = ranges.start(i);
                end = ranges.end(i);
                if (firstStart === null) {
                    gap = Math.abs(start - time);
                    if (time >= start && time < end) {
                        firstStart = start;
                        lastEnd = end;
                        continue;
                    } else if (gap <= toler) {
                        firstStart = start;
                        lastEnd = end;
                        continue;
                    }
                } else {
                    gap = start - lastEnd;
                    if (gap <= toler) {
                        lastEnd = end;
                    } else {
                        break;
                    }
                }
            }
            if (firstStart !== null) {
                return Q.when({
                    start: firstStart,
                    end: lastEnd
                });
            }
        }
        return Q.when(null);
    },
    getAllRanges: function(buffer) {
        var ranges = null;
        try {
            ranges = buffer.buffered;
            return Q.when(ranges);
        } catch (ex) {
            return Q.when(null);
        }
    },
    getBufferLength: function(buffer, time, tolerance) {
        "use strict";
        var self = this, deferred = Q.defer();
        self.getBufferRange(buffer, time, tolerance).then(function(range) {
            if (range === null) {
                deferred.resolve(0);
            } else {
                deferred.resolve(range.end - time);
            }
        });
        return deferred.promise;
    },
    waitForUpdateEnd: function(buffer) {
        "use strict";
        var defer = Q.defer(), intervalId, CHECK_INTERVAL = 50, checkIsUpdateEnded = function() {
            if (buffer.updating) return;
            clearInterval(intervalId);
            defer.resolve(true);
        }, updateEndHandler = function() {
            if (buffer.updating) return;
            buffer.removeEventListener("updateend", updateEndHandler, false);
            defer.resolve(true);
        };
        if (typeof buffer.addEventListener === "function") {
            try {
                buffer.addEventListener("updateend", updateEndHandler, false);
            } catch (err) {
                intervalId = setInterval(checkIsUpdateEnded, CHECK_INTERVAL);
            }
        } else {
            intervalId = setInterval(checkIsUpdateEnded, CHECK_INTERVAL);
        }
        return defer.promise;
    },
    append: function(buffer, bytes) {
        var deferred = Q.defer();
        try {
            if ("append" in buffer) {
                buffer.append(bytes);
            } else if ("appendBuffer" in buffer) {
                buffer.appendBuffer(bytes);
            }
            this.waitForUpdateEnd(buffer).then(function() {
                deferred.resolve();
            });
        } catch (err) {
            deferred.reject({
                err: err,
                data: bytes
            });
        }
        return deferred.promise;
    },
    remove: function(buffer, start, end, duration, mediaSource) {
        var deferred = Q.defer();
        try {
            if (start >= 0 && start < duration && end > start && mediaSource.readyState !== "ended") {
                buffer.remove(start, end);
            }
            this.waitForUpdateEnd(buffer).then(function() {
                deferred.resolve();
            });
        } catch (err) {
            deferred.reject(err);
        }
        return deferred.promise;
    },
    abort: function(mediaSource, buffer) {
        "use strict";
        var deferred = Q.defer();
        try {
            if (mediaSource.readyState === "open") {
                buffer.abort();
            }
            deferred.resolve();
        } catch (ex) {
            deferred.reject(ex.description);
        }
        return deferred.promise;
    }
};

MediaPlayer.dependencies.Stream = function() {
    "use strict";
    var manifest, mediaSource, videoCodec = null, audioCodec = null, contentProtection = null, videoController = null, videoTrackIndex = -1, audioController = null, audioTrackIndex = -1, textController = null, textTrackIndex = -1, autoPlay = true, initialized = false, load, errored = false, kid = null, initData = [], loadedListener, playListener, pauseListener, errorListener, seekingListener, seekedListener, timeupdateListener, progressListener, ratechangeListener, periodInfo = null, needKeyListener, keyMessageListener, keyAddedListener, keyErrorListener, eventController = null, play = function() {
        if (!initialized) {
            return;
        }
        this.videoModel.play();
    }, pause = function() {
        this.videoModel.pause();
    }, seek = function(time) {
        if (!initialized) {
            return;
        }
        this.debug.log("Do seek: " + time);
        this.system.notify("setCurrentTime");
        this.videoModel.setCurrentTime(time);
        startBuffering(time);
    }, onMediaSourceNeedsKey = function(event) {
        var self = this;
        initData.push({
            type: event.type,
            initData: event.initData
        });
        this.debug.log("DRM: Key required for - " + event.type);
        if (!!contentProtection && !!videoCodec && !kid) {
            try {
                kid = self.protectionController.selectKeySystem(videoCodec, contentProtection, event.initData);
            } catch (error) {
                pause.call(self);
                self.debug.log(error);
                self.errHandler.mediaKeySystemSelectionError(error);
            }
        }
        if (!!kid) {
            self.protectionController.ensureKeySession(kid, event.type !== "msneedkey" ? event.type : videoCodec, event.initData);
        }
    }, onMediaSourceKeyMessage = function(event) {
        var self = this, session = null, sessionId = null, bytes = null, uint16Message = null, laURL = null;
        this.debug.log("DRM: Got a key message...");
        session = event.target;
        sessionId = event.sessionId;
        bytes = new Uint16Array(event.message.buffer);
        uint16Message = String.fromCharCode.apply(null, bytes);
        laURL = event.destinationURL;
        self.protectionController.updateFromMessage(kid, session, sessionId, event.message, uint16Message, laURL).fail(function(error) {
            pause.call(self);
            self.debug.log(error);
            self.errHandler.mediaKeyMessageError(error);
        });
    }, onMediaSourceKeyAdded = function() {
        this.debug.log("DRM: Key added.");
    }, onMediaSourceKeyError = function() {
        var session = event.target, msg;
        msg = "DRM: MediaKeyError - sessionId: " + session.sessionId + " errorCode: " + session.error.code + " systemErrorCode: " + session.error.systemCode + " [";
        switch (session.error.code) {
          case 1:
            msg += "MEDIA_KEYERR_UNKNOWN - An unspecified error occurred. This value is used for errors that don't match any of the other codes.";
            break;

          case 2:
            msg += "MEDIA_KEYERR_CLIENT - The Key System could not be installed or updated.";
            break;

          case 3:
            msg += "MEDIA_KEYERR_SERVICE - The message passed into update indicated an error from the license service.";
            break;

          case 4:
            msg += "MEDIA_KEYERR_OUTPUT - There is no available output device with the required characteristics for the content protection system.";
            break;

          case 5:
            msg += "MEDIA_KEYERR_HARDWARECHANGE - A hardware configuration change caused a content protection error.";
            break;

          case 6:
            msg += "MEDIA_KEYERR_DOMAIN - An error occurred in a multi-device domain licensing configuration. The most common error is a failure to join the domain.";
            break;
        }
        msg += "]";
        this.debug.log(msg);
        this.errHandler.mediaKeySessionError(msg);
    }, setUpMediaSource = function(mediaSourceArg) {
        var deferred = Q.defer(), self = this, onMediaSourceOpen = function(e) {
            self.debug.log("MediaSource is open!");
            self.debug.log(e);
            mediaSourceArg.removeEventListener("sourceopen", onMediaSourceOpen);
            mediaSourceArg.removeEventListener("webkitsourceopen", onMediaSourceOpen);
            deferred.resolve(mediaSourceArg);
        };
        mediaSourceArg.addEventListener("sourceopen", onMediaSourceOpen, false);
        mediaSourceArg.addEventListener("webkitsourceopen", onMediaSourceOpen, false);
        self.mediaSourceExt.attachMediaSource(mediaSourceArg, self.videoModel);
        return deferred.promise;
    }, tearDownMediaSource = function() {
        var self = this;
        if (!!videoController) {
            videoController.reset(errored);
        }
        if (!!audioController) {
            audioController.reset(errored);
        }
        if (!!textController) {
            textController.reset(errored);
        }
        if (!!eventController) {
            eventController.reset();
        }
        if (!!mediaSource) {
            self.mediaSourceExt.detachMediaSource(self.videoModel);
        }
        initialized = false;
        kid = null;
        initData = [];
        contentProtection = null;
        videoController = null;
        audioController = null;
        textController = null;
        videoCodec = null;
        audioCodec = null;
        mediaSource = null;
        manifest = null;
    }, checkIfInitialized = function(videoReady, audioReady, textTrackReady, deferred) {
        if (videoReady && audioReady && textTrackReady) {
            if (videoController === null && audioController === null && textController === null) {
                var msg = "No streams to play.";
                this.errHandler.manifestError(msg, "nostreams", manifest);
                this.debug.log(msg);
                deferred.reject();
            } else {
                deferred.resolve(true);
            }
        }
    }, initializeMediaSource = function() {
        var initialize = Q.defer(), videoReady = false, audioReady = false, textTrackReady = false, self = this;
        eventController = self.system.getObject("eventController");
        eventController.initialize(self.videoModel);
        self.manifestExt.getDuration(manifest, periodInfo).then(function() {
            self.manifestExt.getVideoData(manifest, periodInfo.index).then(function(videoData) {
                if (videoData !== null) {
                    self.manifestExt.getDataIndex(videoData, manifest, periodInfo.index).then(function(index) {
                        videoTrackIndex = index;
                    });
                    self.manifestExt.getCodec(videoData).then(function(codec) {
                        self.debug.log("Video codec: " + codec);
                        videoCodec = codec;
                        return self.manifestExt.getContentProtectionData(videoData).then(function(contentProtectionData) {
                            if (!!contentProtectionData && !self.capabilities.supportsMediaKeys()) {
                                self.errHandler.capabilityError("mediakeys");
                                return Q.when(null);
                            }
                            contentProtection = contentProtectionData;
                            if (!self.capabilities.supportsCodec(self.videoModel.getElement(), codec)) {
                                var msg = "Video Codec (" + codec + ") is not supported.";
                                self.errHandler.manifestError(msg, "codec", manifest);
                                self.debug.log(msg);
                                return Q.when(null);
                            }
                            return self.sourceBufferExt.createSourceBuffer(mediaSource, codec);
                        });
                    }).then(function(buffer) {
                        if (buffer === null) {
                            self.debug.log("No buffer was created, skipping video stream.");
                        } else {
                            videoController = self.system.getObject("bufferController");
                            videoController.initialize("video", periodInfo, videoData, buffer, self.videoModel, self.requestScheduler, self.fragmentController, mediaSource, eventController);
                        }
                        videoReady = true;
                        checkIfInitialized.call(self, videoReady, audioReady, textTrackReady, initialize);
                    }, function() {
                        self.errHandler.mediaSourceError("Error creating video source buffer.");
                        videoReady = true;
                        checkIfInitialized.call(self, videoReady, audioReady, textTrackReady, initialize);
                    });
                } else {
                    self.debug.log("No video data.");
                    videoReady = true;
                    checkIfInitialized.call(self, videoReady, audioReady, textTrackReady, initialize);
                }
                return self.manifestExt.getAudioDatas(manifest, periodInfo.index);
            }).then(function(audioDatas) {
                if (audioDatas !== null && audioDatas.length > 0) {
                    self.manifestExt.getPrimaryAudioData(manifest, periodInfo.index).then(function(primaryAudioData) {
                        self.manifestExt.getDataIndex(primaryAudioData, manifest, periodInfo.index).then(function(index) {
                            audioTrackIndex = index;
                        });
                        self.manifestExt.getCodec(primaryAudioData).then(function(codec) {
                            self.debug.log("Audio codec: " + codec);
                            audioCodec = codec;
                            return self.manifestExt.getContentProtectionData(primaryAudioData).then(function(contentProtectionData) {
                                if (!!contentProtectionData && !self.capabilities.supportsMediaKeys()) {
                                    self.errHandler.capabilityError("mediakeys");
                                    return Q.when(null);
                                }
                                contentProtection = contentProtectionData;
                                if (!self.capabilities.supportsCodec(self.videoModel.getElement(), codec)) {
                                    var msg = "Audio Codec (" + codec + ") is not supported.";
                                    self.errHandler.manifestError(msg, "codec", manifest);
                                    self.debug.log(msg);
                                    return Q.when(null);
                                }
                                return self.sourceBufferExt.createSourceBuffer(mediaSource, codec);
                            });
                        }).then(function(buffer) {
                            if (buffer === null) {
                                self.debug.log("No buffer was created, skipping audio stream.");
                            } else {
                                audioController = self.system.getObject("bufferController");
                                audioController.initialize("audio", periodInfo, primaryAudioData, buffer, self.videoModel, self.requestScheduler, self.fragmentController, mediaSource, eventController);
                            }
                            audioReady = true;
                            checkIfInitialized.call(self, videoReady, audioReady, textTrackReady, initialize);
                        }, function() {
                            self.errHandler.mediaSourceError("Error creating audio source buffer.");
                            audioReady = true;
                            checkIfInitialized.call(self, videoReady, audioReady, textTrackReady, initialize);
                        });
                    });
                } else {
                    self.debug.log("No audio streams.");
                    audioReady = true;
                    checkIfInitialized.call(self, videoReady, audioReady, textTrackReady, initialize);
                }
                return self.manifestExt.getTextData(manifest, periodInfo.index);
            }).then(function(textData) {
                var mimeType;
                if (textData !== null) {
                    self.manifestExt.getDataIndex(textData, manifest, periodInfo.index).then(function(index) {
                        textTrackIndex = index;
                    });
                    self.manifestExt.getMimeType(textData).then(function(type) {
                        mimeType = type;
                        return self.sourceBufferExt.createSourceBuffer(mediaSource, mimeType);
                    }).then(function(buffer) {
                        if (buffer === null) {
                            self.debug.log("Source buffer was not created for text track");
                        } else {
                            textController = self.system.getObject("textController");
                            textController.initialize(periodInfo, textData, buffer, self.videoModel, mediaSource);
                            if (buffer.hasOwnProperty("initialize")) {
                                buffer.initialize(mimeType, textController);
                            }
                            textTrackReady = true;
                            checkIfInitialized.call(self, videoReady, audioReady, textTrackReady, initialize);
                        }
                    }, function(error) {
                        self.debug.log("Error creating text source buffer:");
                        self.debug.log(error);
                        self.errHandler.mediaSourceError("Error creating text source buffer.");
                        textTrackReady = true;
                        checkIfInitialized.call(self, videoReady, audioReady, textTrackReady, initialize);
                    });
                } else {
                    self.debug.log("No text tracks.");
                    textTrackReady = true;
                    checkIfInitialized.call(self, videoReady, audioReady, textTrackReady, initialize);
                }
                return self.manifestExt.getEventsForPeriod(manifest, periodInfo);
            }).then(function(events) {
                eventController.addInlineEvents(events);
            });
        });
        return initialize.promise;
    }, initializePlayback = function() {
        var self = this, initialize = Q.defer();
        self.manifestExt.getDuration(self.manifestModel.getValue(), periodInfo).then(function(duration) {
            return self.mediaSourceExt.setDuration(mediaSource, duration);
        }).then(function(value) {
            self.debug.log("Duration successfully set to: " + value);
            initialized = true;
            initialize.resolve(true);
        });
        return initialize.promise;
    }, onLoad = function() {
        this.debug.log("Got loadmetadata event.");
        var initialSeekTime = this.timelineConverter.calcPresentationStartTime(periodInfo);
        this.debug.log("Starting playback at offset: " + initialSeekTime);
        this.videoModel.setCurrentTime(initialSeekTime);
        load.resolve(null);
    }, onPlay = function() {
        updateCurrentTime.call(this);
    }, onPause = function() {
        suspend.call(this);
    }, onError = function(event) {
        var error = event.srcElement.error, code = error.code, msg = "";
        if (code === -1) {
            return;
        }
        switch (code) {
          case 1:
            msg = "MEDIA_ERR_ABORTED";
            break;

          case 2:
            msg = "MEDIA_ERR_NETWORK";
            break;

          case 3:
            msg = "MEDIA_ERR_DECODE";
            break;

          case 4:
            msg = "MEDIA_ERR_SRC_NOT_SUPPORTED";
            break;

          case 5:
            msg = "MEDIA_ERR_ENCRYPTED";
            break;
        }
        errored = true;
        this.debug.log("Video Element Error: " + msg);
        this.debug.log(error);
        this.errHandler.mediaSourceError(msg);
        this.reset();
    }, onSeeking = function() {
        var time = this.videoModel.getCurrentTime();
        updateBuffer.call(this).then(function() {
            startBuffering(time);
        });
    }, onSeeked = function() {
        this.videoModel.listen("seeking", seekingListener);
        this.videoModel.unlisten("seeked", seekedListener);
    }, onProgress = function() {
        updateBuffer.call(this);
    }, onTimeupdate = function() {
        updateBuffer.call(this);
    }, onRatechange = function() {
        if (videoController) {
            videoController.updateStalledState();
        }
        if (audioController) {
            audioController.updateStalledState();
        }
    }, updateBuffer = function() {
        var promises = [];
        if (videoController) {
            promises.push(videoController.updateBufferState());
        }
        if (audioController) {
            promises.push(audioController.updateBufferState());
        }
        return Q.all(promises);
    }, startBuffering = function(time) {
        if (videoController) {
            if (time === undefined) {
                videoController.start();
            } else {
                videoController.seek(time);
            }
        }
        if (audioController) {
            if (time === undefined) {
                audioController.start();
            } else {
                audioController.seek(time);
            }
        }
    }, stopBuffering = function() {
        if (videoController) {
            videoController.stop();
        }
        if (audioController) {
            audioController.stop();
        }
    }, suspend = function() {
        if (!this.scheduleWhilePaused || this.manifestExt.getIsDynamic(manifest)) {
            stopBuffering.call(this);
        }
    }, updateCurrentTime = function() {
        if (this.videoModel.isPaused()) return;
        var currentTime = this.videoModel.getCurrentTime(), representation = videoController ? videoController.getCurrentRepresentation() : audioController.getCurrentRepresentation(), actualTime = this.timelineConverter.calcActualPresentationTime(representation, currentTime, this.manifestExt.getIsDynamic(manifest)), timeChanged = !isNaN(actualTime) && actualTime !== currentTime;
        if (timeChanged) {
            this.videoModel.setCurrentTime(actualTime);
            startBuffering(actualTime);
        } else {
            startBuffering();
        }
    }, doLoad = function(manifestResult) {
        var self = this;
        manifest = manifestResult;
        return self.mediaSourceExt.createMediaSource().then(function(mediaSourceResult) {
            return setUpMediaSource.call(self, mediaSourceResult);
        }).then(function(mediaSourceResult) {
            mediaSource = mediaSourceResult;
            return initializeMediaSource.call(self);
        }).then(function() {
            return initializePlayback.call(self);
        }).then(function() {
            return load.promise;
        }).then(function() {
            self.debug.log("element loaded!");
            if (periodInfo.index === 0) {
                eventController.start();
                if (autoPlay) {
                    play.call(self);
                }
            }
        });
    }, currentTimeChanged = function() {
        this.debug.log("Current time has changed, block programmatic seek.");
        this.videoModel.unlisten("seeking", seekingListener);
        this.videoModel.listen("seeked", seekedListener);
    }, bufferingCompleted = function() {
        if (videoController && !videoController.isBufferingCompleted() || audioController && !audioController.isBufferingCompleted()) {
            return;
        }
        if (mediaSource) {
            this.mediaSourceExt.signalEndOfStream(mediaSource);
        }
    }, segmentLoadingFailed = function() {
        stopBuffering.call(this);
    }, updateData = function(updatedPeriodInfo) {
        var self = this, videoData, audioData, textData, deferredVideoData, deferredAudioData, deferredTextData, deferred = Q.defer(), deferredVideoUpdate = Q.defer(), deferredAudioUpdate = Q.defer(), deferredTextUpdate = Q.defer(), deferredEventUpdate = Q.defer();
        manifest = self.manifestModel.getValue();
        periodInfo = updatedPeriodInfo;
        self.debug.log("Manifest updated... set new data on buffers.");
        if (videoController) {
            videoData = videoController.getData();
            if (!!videoData && videoData.hasOwnProperty("id")) {
                deferredVideoData = self.manifestExt.getDataForId(videoData.id, manifest, periodInfo.index);
            } else {
                deferredVideoData = self.manifestExt.getDataForIndex(videoTrackIndex, manifest, periodInfo.index);
            }
            deferredVideoData.then(function(data) {
                videoController.updateData(data, periodInfo).then(function() {
                    deferredVideoUpdate.resolve();
                });
            });
        } else {
            deferredVideoUpdate.resolve();
        }
        if (audioController) {
            audioData = audioController.getData();
            if (!!audioData && audioData.hasOwnProperty("id")) {
                deferredAudioData = self.manifestExt.getDataForId(audioData.id, manifest, periodInfo.index);
            } else {
                deferredAudioData = self.manifestExt.getDataForIndex(audioTrackIndex, manifest, periodInfo.index);
            }
            deferredAudioData.then(function(data) {
                audioController.updateData(data, periodInfo).then(function() {
                    deferredAudioUpdate.resolve();
                });
            });
        } else {
            deferredAudioUpdate.resolve();
        }
        if (textController) {
            textData = textController.getData();
            if (!!textData && textData.hasOwnProperty("id")) {
                deferredTextData = self.manifestExt.getDataForId(textData.id, manifest, periodInfo.index);
            } else {
                deferredTextData = self.manifestExt.getDataForIndex(textTrackIndex, manifest, periodInfo.index);
            }
            deferredTextData.then(function(data) {
                textController.updateData(data, periodInfo).then(function() {
                    deferredTextUpdate.resolve();
                });
            });
        }
        if (eventController) {
            self.manifestExt.getEventsForPeriod(manifest, periodInfo).then(function(events) {
                eventController.addInlineEvents(events);
                deferredEventUpdate.resolve();
            });
        }
        Q.when(deferredVideoUpdate.promise, deferredAudioUpdate.promise, deferredTextUpdate.promise).then(function() {
            updateCurrentTime.call(self);
            deferred.resolve();
        });
        return deferred.promise;
    };
    return {
        system: undefined,
        videoModel: undefined,
        manifestLoader: undefined,
        manifestModel: undefined,
        mediaSourceExt: undefined,
        sourceBufferExt: undefined,
        bufferExt: undefined,
        manifestExt: undefined,
        fragmentController: undefined,
        abrController: undefined,
        fragmentExt: undefined,
        protectionModel: undefined,
        protectionController: undefined,
        protectionExt: undefined,
        capabilities: undefined,
        debug: undefined,
        metricsExt: undefined,
        errHandler: undefined,
        timelineConverter: undefined,
        requestScheduler: undefined,
        scheduleWhilePaused: undefined,
        setup: function() {
            this.system.mapHandler("setCurrentTime", undefined, currentTimeChanged.bind(this));
            this.system.mapHandler("bufferingCompleted", undefined, bufferingCompleted.bind(this));
            this.system.mapHandler("segmentLoadingFailed", undefined, segmentLoadingFailed.bind(this));
            load = Q.defer();
            playListener = onPlay.bind(this);
            pauseListener = onPause.bind(this);
            errorListener = onError.bind(this);
            seekingListener = onSeeking.bind(this);
            seekedListener = onSeeked.bind(this);
            progressListener = onProgress.bind(this);
            ratechangeListener = onRatechange.bind(this);
            timeupdateListener = onTimeupdate.bind(this);
            loadedListener = onLoad.bind(this);
        },
        load: function(manifest, periodInfoValue) {
            periodInfo = periodInfoValue;
            doLoad.call(this, manifest);
        },
        setVideoModel: function(value) {
            this.videoModel = value;
            this.videoModel.listen("play", playListener);
            this.videoModel.listen("pause", pauseListener);
            this.videoModel.listen("error", errorListener);
            this.videoModel.listen("seeking", seekingListener);
            this.videoModel.listen("timeupdate", timeupdateListener);
            this.videoModel.listen("progress", progressListener);
            this.videoModel.listen("ratechange", ratechangeListener);
            this.videoModel.listen("loadedmetadata", loadedListener);
            this.requestScheduler.videoModel = value;
        },
        initProtection: function() {
            needKeyListener = onMediaSourceNeedsKey.bind(this);
            keyMessageListener = onMediaSourceKeyMessage.bind(this);
            keyAddedListener = onMediaSourceKeyAdded.bind(this);
            keyErrorListener = onMediaSourceKeyError.bind(this);
            this.protectionModel = this.system.getObject("protectionModel");
            this.protectionModel.init(this.getVideoModel());
            this.protectionController = this.system.getObject("protectionController");
            this.protectionController.init(this.videoModel, this.protectionModel);
            this.protectionModel.listenToNeedKey(needKeyListener);
            this.protectionModel.listenToKeyMessage(keyMessageListener);
            this.protectionModel.listenToKeyError(keyErrorListener);
            this.protectionModel.listenToKeyAdded(keyAddedListener);
        },
        getVideoModel: function() {
            return this.videoModel;
        },
        getManifestExt: function() {
            var self = this;
            return self.manifestExt;
        },
        setAutoPlay: function(value) {
            autoPlay = value;
        },
        getAutoPlay: function() {
            return autoPlay;
        },
        reset: function() {
            pause.call(this);
            this.videoModel.unlisten("play", playListener);
            this.videoModel.unlisten("pause", pauseListener);
            this.videoModel.unlisten("error", errorListener);
            this.videoModel.unlisten("seeking", seekingListener);
            this.videoModel.unlisten("timeupdate", timeupdateListener);
            this.videoModel.unlisten("progress", progressListener);
            this.videoModel.unlisten("loadedmetadata", loadedListener);
            tearDownMediaSource.call(this);
            if (!!this.protectionController) {
                this.protectionController.teardownKeySystem(kid);
            }
            this.protectionController = undefined;
            this.protectionModel = undefined;
            this.fragmentController = undefined;
            this.requestScheduler = undefined;
            load = Q.defer();
        },
        getDuration: function() {
            return periodInfo.duration;
        },
        getStartTime: function() {
            return periodInfo.start;
        },
        getPeriodIndex: function() {
            return periodInfo.index;
        },
        getId: function() {
            return periodInfo.id;
        },
        getPeriodInfo: function() {
            return periodInfo;
        },
        startEventController: function() {
            eventController.start();
        },
        resetEventController: function() {
            eventController.reset();
        },
        updateData: updateData,
        play: play,
        seek: seek,
        pause: pause
    };
};

MediaPlayer.dependencies.Stream.prototype = {
    constructor: MediaPlayer.dependencies.Stream
};

MediaPlayer.dependencies.StreamController = function() {
    "use strict";
    var streams = [], activeStream, STREAM_BUFFER_END_THRESHOLD = 6, STREAM_END_THRESHOLD = .2, autoPlay = true, isPeriodSwitchingInProgress = false, timeupdateListener, seekingListener, progressListener, pauseListener, playListener, play = function() {
        activeStream.play();
    }, pause = function() {
        activeStream.pause();
    }, seek = function(time) {
        activeStream.seek(time);
    }, switchVideoModel = function(fromVideoModel, toVideoModel) {
        var activeVideoElement = fromVideoModel.getElement(), newVideoElement = toVideoModel.getElement();
        if (!newVideoElement.parentNode) {
            activeVideoElement.parentNode.insertBefore(newVideoElement, activeVideoElement);
        }
        activeVideoElement.style.width = "0px";
        newVideoElement.style.width = "100%";
        copyVideoProperties(activeVideoElement, newVideoElement);
        detachVideoEvents.call(this, fromVideoModel);
        attachVideoEvents.call(this, toVideoModel);
        return Q.when(true);
    }, attachVideoEvents = function(videoModel) {
        videoModel.listen("seeking", seekingListener);
        videoModel.listen("progress", progressListener);
        videoModel.listen("timeupdate", timeupdateListener);
        videoModel.listen("pause", pauseListener);
        videoModel.listen("play", playListener);
    }, detachVideoEvents = function(videoModel) {
        videoModel.unlisten("seeking", seekingListener);
        videoModel.unlisten("progress", progressListener);
        videoModel.unlisten("timeupdate", timeupdateListener);
        videoModel.unlisten("pause", pauseListener);
        videoModel.unlisten("play", playListener);
    }, copyVideoProperties = function(fromVideoElement, toVideoElement) {
        [ "controls", "loop", "muted", "playbackRate", "volume" ].forEach(function(prop) {
            toVideoElement[prop] = fromVideoElement[prop];
        });
    }, onProgress = function() {
        var ranges = activeStream.getVideoModel().getElement().buffered;
        if (!ranges.length) {
            return;
        }
        var lastRange = ranges.length - 1, bufferEndTime = ranges.end(lastRange), remainingBufferDuration = activeStream.getStartTime() + activeStream.getDuration() - bufferEndTime;
        if (remainingBufferDuration < STREAM_BUFFER_END_THRESHOLD) {
            activeStream.getVideoModel().unlisten("progress", progressListener);
            onStreamBufferingEnd();
        }
    }, onTimeupdate = function() {
        var streamEndTime = activeStream.getStartTime() + activeStream.getDuration(), currentTime = activeStream.getVideoModel().getCurrentTime(), self = this;
        self.metricsModel.addDroppedFrames("video", self.videoExt.getPlaybackQuality(activeStream.getVideoModel().getElement()));
        if (!getNextStream()) return;
        if (activeStream.getVideoModel().getElement().seeking) return;
        if (streamEndTime - currentTime < STREAM_END_THRESHOLD) {
            switchStream.call(this, activeStream, getNextStream());
        }
    }, onSeeking = function() {
        var seekingTime = activeStream.getVideoModel().getCurrentTime(), seekingStream = getStreamForTime(seekingTime);
        if (seekingStream && seekingStream !== activeStream) {
            switchStream.call(this, activeStream, seekingStream, seekingTime);
        }
    }, onPause = function() {
        this.manifestUpdater.stop();
    }, onPlay = function() {
        this.manifestUpdater.start();
    }, onStreamBufferingEnd = function() {
        var nextStream = getNextStream();
        if (nextStream) {
            nextStream.seek(nextStream.getStartTime());
        }
    }, getNextStream = function() {
        var nextIndex = activeStream.getPeriodIndex() + 1;
        return nextIndex < streams.length ? streams[nextIndex] : null;
    }, getStreamForTime = function(time) {
        var duration = 0, stream = null, ln = streams.length;
        if (ln > 0) {
            duration += streams[0].getStartTime();
        }
        for (var i = 0; i < ln; i++) {
            stream = streams[i];
            duration += stream.getDuration();
            if (time < duration) {
                return stream;
            }
        }
    }, createVideoModel = function() {
        var model = this.system.getObject("videoModel"), video = document.createElement("video");
        model.setElement(video);
        return model;
    }, removeVideoElement = function(element) {
        if (element.parentNode) {
            element.parentNode.removeChild(element);
        }
    }, switchStream = function(from, to, seekTo) {
        if (isPeriodSwitchingInProgress || !from || !to || from === to) return;
        isPeriodSwitchingInProgress = true;
        from.pause();
        activeStream = to;
        switchVideoModel.call(this, from.getVideoModel(), to.getVideoModel());
        if (seekTo) {
            seek(from.getVideoModel().getCurrentTime());
        } else {
            seek(to.getStartTime());
        }
        play();
        from.resetEventController();
        activeStream.startEventController();
        isPeriodSwitchingInProgress = false;
    }, composeStreams = function() {
        var self = this, manifest = self.manifestModel.getValue(), metrics = self.metricsModel.getMetricsFor("stream"), manifestUpdateInfo = self.metricsExt.getCurrentManifestUpdate(metrics), periodInfo, deferred = Q.defer(), updatedStreams = [], pLen, sLen, pIdx, sIdx, period, stream;
        if (!manifest) {
            return Q.when(false);
        }
        self.manifestExt.getMpd(manifest).then(function(mpd) {
            if (activeStream) {
                periodInfo = activeStream.getPeriodInfo();
                mpd.isClientServerTimeSyncCompleted = periodInfo.mpd.isClientServerTimeSyncCompleted;
                mpd.clientServerTimeShift = periodInfo.mpd.clientServerTimeShift;
            }
            self.manifestExt.getRegularPeriods(manifest, mpd).then(function(periods) {
                if (periods.length === 0) {
                    return deferred.reject("There are no regular periods");
                }
                self.metricsModel.updateManifestUpdateInfo(manifestUpdateInfo, {
                    currentTime: self.videoModel.getCurrentTime(),
                    buffered: self.videoModel.getElement().buffered,
                    presentationStartTime: periods[0].start,
                    clientTimeOffset: mpd.clientServerTimeShift
                });
                for (pIdx = 0, pLen = periods.length; pIdx < pLen; pIdx += 1) {
                    period = periods[pIdx];
                    for (sIdx = 0, sLen = streams.length; sIdx < sLen; sIdx += 1) {
                        if (streams[sIdx].getId() === period.id) {
                            stream = streams[sIdx];
                            updatedStreams.push(stream.updateData(period));
                        }
                    }
                    if (!stream) {
                        stream = self.system.getObject("stream");
                        stream.setVideoModel(pIdx === 0 ? self.videoModel : createVideoModel.call(self));
                        stream.initProtection();
                        stream.setAutoPlay(autoPlay);
                        stream.load(manifest, period);
                        streams.push(stream);
                    }
                    self.metricsModel.addManifestUpdatePeriodInfo(manifestUpdateInfo, period.id, period.index, period.start, period.duration);
                    stream = null;
                }
                if (!activeStream) {
                    activeStream = streams[0];
                    attachVideoEvents.call(self, activeStream.getVideoModel());
                }
                Q.all(updatedStreams).then(function() {
                    deferred.resolve();
                });
            });
        });
        return deferred.promise;
    }, manifestHasUpdated = function() {
        var self = this;
        composeStreams.call(self).then(function() {
            self.system.notify("streamsComposed");
        }, function(errMsg) {
            self.errHandler.manifestError(errMsg, "nostreamscomposed", self.manifestModel.getValue());
            self.reset();
        });
    };
    return {
        system: undefined,
        videoModel: undefined,
        manifestLoader: undefined,
        manifestUpdater: undefined,
        manifestModel: undefined,
        mediaSourceExt: undefined,
        sourceBufferExt: undefined,
        bufferExt: undefined,
        manifestExt: undefined,
        fragmentController: undefined,
        abrController: undefined,
        fragmentExt: undefined,
        capabilities: undefined,
        debug: undefined,
        metricsModel: undefined,
        metricsExt: undefined,
        videoExt: undefined,
        errHandler: undefined,
        setup: function() {
            this.system.mapHandler("manifestUpdated", undefined, manifestHasUpdated.bind(this));
            timeupdateListener = onTimeupdate.bind(this);
            progressListener = onProgress.bind(this);
            seekingListener = onSeeking.bind(this);
            pauseListener = onPause.bind(this);
            playListener = onPlay.bind(this);
        },
        getManifestExt: function() {
            return activeStream.getManifestExt();
        },
        setAutoPlay: function(value) {
            autoPlay = value;
        },
        getAutoPlay: function() {
            return autoPlay;
        },
        getVideoModel: function() {
            return this.videoModel;
        },
        setVideoModel: function(value) {
            this.videoModel = value;
        },
        load: function(url) {
            var self = this;
            self.manifestLoader.load(url).then(function(manifest) {
                self.manifestModel.setValue(manifest);
                self.debug.log("Manifest has loaded.");
                self.manifestUpdater.start();
            }, function() {
                self.reset();
            });
        },
        reset: function() {
            if (!!activeStream) {
                detachVideoEvents.call(this, activeStream.getVideoModel());
            }
            for (var i = 0, ln = streams.length; i < ln; i++) {
                var stream = streams[i];
                stream.reset();
                if (stream !== activeStream) {
                    removeVideoElement(stream.getVideoModel().getElement());
                }
            }
            streams = [];
            this.manifestUpdater.stop();
            this.manifestModel.setValue(null);
            this.metricsModel.clearAllCurrentMetrics();
            isPeriodSwitchingInProgress = false;
            activeStream = null;
        },
        play: play,
        seek: seek,
        pause: pause
    };
};

MediaPlayer.dependencies.StreamController.prototype = {
    constructor: MediaPlayer.dependencies.StreamController
};

MediaPlayer.utils.TokenAuthentication = function() {
    "use strict";
    var tokenAuthentication = {
        type: MediaPlayer.utils.TokenAuthentication.TYPE_QUERY
    };
    return {
        debug: undefined,
        getTokenAuthentication: function() {
            return tokenAuthentication;
        },
        setTokenAuthentication: function(object) {
            tokenAuthentication = object;
        },
        checkRequestHeaderForToken: function(request) {
            if (tokenAuthentication.name !== undefined && request.getResponseHeader(tokenAuthentication.name) !== null) {
                tokenAuthentication.token = request.getResponseHeader(tokenAuthentication.name);
                this.debug.log(tokenAuthentication.name + " received: " + tokenAuthentication.token);
            }
        },
        addTokenAsQueryArg: function(url) {
            if (tokenAuthentication.name !== undefined && tokenAuthentication.token !== undefined) {
                if (tokenAuthentication.type === MediaPlayer.utils.TokenAuthentication.TYPE_QUERY) {
                    var modifier = url.indexOf("?") === -1 ? "?" : "&";
                    url += modifier + tokenAuthentication.name + "=" + tokenAuthentication.token;
                    this.debug.log(tokenAuthentication.name + " is being appended on the request url with a value of : " + tokenAuthentication.token);
                }
            }
            return url;
        },
        setTokenInRequestHeader: function(request) {
            if (tokenAuthentication.type === MediaPlayer.utils.TokenAuthentication.TYPE_HEADER) {
                request.setRequestHeader(tokenAuthentication.name, tokenAuthentication.token);
                this.debug.log(tokenAuthentication.name + " is being set in the request header with a value of : " + tokenAuthentication.token);
            }
            return request;
        }
    };
};

MediaPlayer.utils.TokenAuthentication.TYPE_QUERY = "query";

MediaPlayer.utils.TokenAuthentication.TYPE_HEADER = "header";

MediaPlayer.models.URIQueryAndFragmentModel = function() {
    "use strict";
    var URIFragmentDataVO = new MediaPlayer.vo.URIFragmentData(), URIQueryData = [], reset = function() {
        URIFragmentDataVO = new MediaPlayer.vo.URIFragmentData();
        URIQueryData = [];
    }, parseURI = function(uri) {
        var URIFragmentData = [], testQuery = new RegExp(/[?]/), testFragment = new RegExp(/[#]/), isQuery = testQuery.test(uri), isFragment = testFragment.test(uri), mappedArr;
        function reduceArray(previousValue, currentValue, index, array) {
            var arr = array[0].split(/[=]/);
            array.push({
                key: arr[0],
                value: arr[1]
            });
            array.shift();
            return array;
        }
        function mapArray(currentValue, index, array) {
            if (index > 0) {
                if (isQuery && URIQueryData.length === 0) {
                    URIQueryData = array[index].split(/[&]/);
                } else if (isFragment) {
                    URIFragmentData = array[index].split(/[&]/);
                }
            }
            return array;
        }
        mappedArr = uri.split(/[?#]/).map(mapArray);
        if (URIQueryData.length > 0) {
            URIQueryData = URIQueryData.reduce(reduceArray, null);
        }
        if (URIFragmentData.length > 0) {
            URIFragmentData = URIFragmentData.reduce(reduceArray, null);
            URIFragmentData.forEach(function(object) {
                URIFragmentDataVO[object.key] = object.value;
            });
        }
        return uri;
    };
    return {
        parseURI: parseURI,
        reset: reset,
        getURIFragmentData: URIFragmentDataVO,
        getURIQueryData: URIQueryData
    };
};

MediaPlayer.models.URIQueryAndFragmentModel.prototype = {
    constructor: MediaPlayer.models.URIQueryAndFragmentModel
};

MediaPlayer.models.VideoModel = function() {
    "use strict";
    var element, stalledStreams = [], isStalled = function() {
        return stalledStreams.length > 0;
    }, addStalledStream = function(type) {
        if (type === null) {
            return;
        }
        element.playbackRate = 0;
        if (stalledStreams[type] === true) {
            return;
        }
        stalledStreams.push(type);
        stalledStreams[type] = true;
    }, removeStalledStream = function(type) {
        if (type === null) {
            return;
        }
        stalledStreams[type] = false;
        var index = stalledStreams.indexOf(type);
        if (index !== -1) {
            stalledStreams.splice(index, 1);
        }
        if (isStalled() === false) {
            element.playbackRate = 1;
        }
    }, stallStream = function(type, isStalled) {
        if (isStalled) {
            addStalledStream(type);
        } else {
            removeStalledStream(type);
        }
    };
    return {
        system: undefined,
        setup: function() {},
        play: function() {
            element.play();
        },
        pause: function() {
            element.pause();
        },
        isPaused: function() {
            return element.paused;
        },
        getPlaybackRate: function() {
            return element.playbackRate;
        },
        setPlaybackRate: function(value) {
            element.playbackRate = value;
        },
        getCurrentTime: function() {
            return element.currentTime;
        },
        setCurrentTime: function(currentTime) {
            if (element.currentTime == currentTime) return;
            element.currentTime = currentTime;
        },
        listen: function(type, callback) {
            element.addEventListener(type, callback, false);
        },
        unlisten: function(type, callback) {
            element.removeEventListener(type, callback, false);
        },
        getElement: function() {
            return element;
        },
        setElement: function(value) {
            element = value;
        },
        setSource: function(source) {
            element.src = source;
        },
        isStalled: function() {
            return element.playbackRate === 0;
        },
        stallStream: stallStream
    };
};

MediaPlayer.models.VideoModel.prototype = {
    constructor: MediaPlayer.models.VideoModel
};

MediaPlayer.dependencies.VideoModelExtensions = function() {
    "use strict";
    return {
        getPlaybackQuality: function(videoElement) {
            var hasWebKit = "webkitDroppedFrameCount" in videoElement, hasQuality = "getVideoPlaybackQuality" in videoElement, result = null;
            if (hasQuality) {
                result = videoElement.getVideoPlaybackQuality();
            } else if (hasWebKit) {
                result = {
                    droppedVideoFrames: videoElement.webkitDroppedFrameCount,
                    creationTime: new Date()
                };
            }
            return result;
        }
    };
};

MediaPlayer.dependencies.VideoModelExtensions.prototype = {
    constructor: MediaPlayer.dependencies.VideoModelExtensions
};

MediaPlayer.utils.TTMLParser = function() {
    "use strict";
    var SECONDS_IN_HOUR = 60 * 60, SECONDS_IN_MIN = 60, timingRegex = /^(0[0-9]|1[0-9]|2[0-3]):([0-5][0-9]):([0-5][0-9])((\.[0-9][0-9][0-9])|(:[0-9][0-9]))$/, ttml, parseTimings = function(timingStr) {
        var test = timingRegex.test(timingStr), timeParts, parsedTime, frameRate;
        if (!test) {
            return NaN;
        }
        timeParts = timingStr.split(":");
        parsedTime = parseFloat(timeParts[0]) * SECONDS_IN_HOUR + parseFloat(timeParts[1]) * SECONDS_IN_MIN + parseFloat(timeParts[2]);
        if (timeParts[3]) {
            frameRate = ttml.tt.frameRate;
            if (frameRate && !isNaN(frameRate)) {
                parsedTime += parseFloat(timeParts[3]) / frameRate;
            } else {
                return NaN;
            }
        }
        return parsedTime;
    }, passStructuralConstraints = function() {
        var passed = false, hasTt = ttml.hasOwnProperty("tt"), hasHead = hasTt ? ttml.tt.hasOwnProperty("head") : false, hasLayout = hasHead ? ttml.tt.head.hasOwnProperty("layout") : false, hasStyling = hasHead ? ttml.tt.head.hasOwnProperty("styling") : false, hasBody = hasTt ? ttml.tt.hasOwnProperty("body") : false, hasProfile = hasHead ? ttml.tt.head.hasOwnProperty("profile") : false;
        if (hasTt && hasHead && hasLayout && hasStyling && hasBody) {
            passed = true;
        }
        if (passed) {
            passed = hasProfile && ttml.tt.head.profile.use === "http://www.w3.org/ns/ttml/profile/sdp-us";
        }
        return passed;
    }, getNamespacePrefix = function(json, ns) {
        var r = Object.keys(json).filter(function(k) {
            return k.split(":")[0] === "xmlns" && json[k] === ns;
        }).map(function(k) {
            return k.split(":")[1];
        });
        if (r.length != 1) {
            return null;
        }
        return r[0];
    }, internalParse = function(data) {
        var captionArray = [], converter = new X2JS([], "", false), errorMsg, cues, cue, startTime, endTime, nsttp, i;
        try {
            ttml = converter.xml_str2json(data);
            if (!passStructuralConstraints()) {
                errorMsg = "TTML document has incorrect structure";
                return Q.reject(errorMsg);
            }
            nsttp = getNamespacePrefix(ttml.tt, "http://www.w3.org/ns/ttml#parameter");
            if (ttml.tt.hasOwnProperty(nsttp + ":frameRate")) {
                ttml.tt.frameRate = parseInt(ttml.tt[nsttp + ":frameRate"], 10);
            }
            cues = ttml.tt.body.div_asArray[0].p_asArray;
            if (!cues || cues.length === 0) {
                errorMsg = "TTML document does not contain any cues";
                return Q.reject(errorMsg);
            }
            for (i = 0; i < cues.length; i += 1) {
                cue = cues[i];
                startTime = parseTimings(cue.begin);
                endTime = parseTimings(cue.end);
                if (isNaN(startTime) || isNaN(endTime)) {
                    errorMsg = "TTML document has incorrect timing value";
                    return Q.reject(errorMsg);
                }
                captionArray.push({
                    start: startTime,
                    end: endTime,
                    data: cue.__text
                });
            }
            return Q.when(captionArray);
        } catch (err) {
            errorMsg = err.message;
            return Q.reject(errorMsg);
        }
    };
    return {
        parse: internalParse
    };
};

MediaPlayer.dependencies.TextController = function() {
    var LOADING = "LOADING", READY = "READY", initialized = false, periodInfo = null, mediaSource, data, buffer, availableRepresentations, state = READY, setState = function(value) {
        this.debug.log("TextController setState to:" + value);
        state = value;
    }, startPlayback = function() {
        if (!initialized || state !== READY) {
            return;
        }
        var self = this;
        self.indexHandler.getInitRequest(availableRepresentations[0]).then(function(request) {
            self.fragmentLoader.load(request).then(onBytesLoaded.bind(self, request), onBytesError.bind(self, request));
            setState.call(self, LOADING);
        });
    }, doStart = function() {
        startPlayback.call(this);
    }, updateRepresentations = function(data, periodInfo) {
        var self = this, deferred = Q.defer(), manifest = self.manifestModel.getValue();
        self.manifestExt.getDataIndex(data, manifest, periodInfo.index).then(function(idx) {
            self.manifestExt.getAdaptationsForPeriod(manifest, periodInfo).then(function(adaptations) {
                self.manifestExt.getRepresentationsForAdaptation(manifest, adaptations[idx]).then(function(representations) {
                    deferred.resolve(representations);
                });
            });
        });
        return deferred.promise;
    }, onBytesLoaded = function(request, response) {
        var self = this;
        self.fragmentController.process(response.data).then(function(data) {
            if (data !== null) {
                self.sourceBufferExt.append(buffer, data, self.videoModel);
            }
        });
    }, onBytesError = function() {};
    return {
        videoModel: undefined,
        fragmentLoader: undefined,
        fragmentController: undefined,
        indexHandler: undefined,
        sourceBufferExt: undefined,
        manifestModel: undefined,
        manifestExt: undefined,
        debug: undefined,
        initialize: function(periodInfo, data, buffer, videoModel, source) {
            var self = this;
            self.setVideoModel(videoModel);
            self.setBuffer(buffer);
            self.setMediaSource(source);
            self.updateData(data, periodInfo).then(function() {
                initialized = true;
                startPlayback.call(self);
            });
        },
        setPeriodInfo: function(value) {
            periodInfo = value;
        },
        getPeriodIndex: function() {
            return periodInfo.index;
        },
        getVideoModel: function() {
            return this.videoModel;
        },
        setVideoModel: function(value) {
            this.videoModel = value;
        },
        getData: function() {
            return data;
        },
        setData: function(value) {
            data = value;
        },
        getBuffer: function() {
            return buffer;
        },
        setBuffer: function(value) {
            buffer = value;
        },
        setMediaSource: function(value) {
            mediaSource = value;
        },
        updateData: function(dataValue, periodInfoValue) {
            var self = this, deferred = Q.defer();
            data = dataValue;
            periodInfo = periodInfoValue;
            updateRepresentations.call(self, data, periodInfo).then(function(representations) {
                availableRepresentations = representations;
                setState.call(self, READY);
                startPlayback.call(self);
                deferred.resolve();
            });
            return deferred.promise;
        },
        reset: function(errored) {
            if (!errored) {
                this.sourceBufferExt.abort(mediaSource, buffer);
                this.sourceBufferExt.removeSourceBuffer(mediaSource, buffer);
            }
        },
        start: doStart
    };
};

MediaPlayer.dependencies.TextController.prototype = {
    constructor: MediaPlayer.dependencies.TextController
};

MediaPlayer.dependencies.TextSourceBuffer = function() {
    var video, data, mimeType;
    return {
        system: undefined,
        eventBus: undefined,
        errHandler: undefined,
        initialize: function(type, bufferController) {
            mimeType = type;
            video = bufferController.getVideoModel().getElement();
            data = bufferController.getData();
        },
        append: function(bytes) {
            var self = this, ccContent = String.fromCharCode.apply(null, new Uint16Array(bytes));
            self.getParser().parse(ccContent).then(function(result) {
                var label = data.Representation_asArray[0].id, lang = data.lang;
                self.getTextTrackExtensions().addTextTrack(video, result, label, lang, true).then(function() {
                    self.eventBus.dispatchEvent({
                        type: "updateend"
                    });
                });
            }, function(errMsg) {
                self.errHandler.closedCaptionsError(errMsg, "parse", ccContent);
            });
        },
        abort: function() {
            this.getTextTrackExtensions().deleteCues(video);
        },
        getParser: function() {
            var parser;
            if (mimeType === "text/vtt") {
                parser = this.system.getObject("vttParser");
            } else if (mimeType === "application/ttml+xml") {
                parser = this.system.getObject("ttmlParser");
            }
            return parser;
        },
        getTextTrackExtensions: function() {
            return this.system.getObject("textTrackExtensions");
        },
        addEventListener: function(type, listener, useCapture) {
            this.eventBus.addEventListener(type, listener, useCapture);
        },
        removeEventListener: function(type, listener, useCapture) {
            this.eventBus.removeEventListener(type, listener, useCapture);
        }
    };
};

MediaPlayer.dependencies.TextSourceBuffer.prototype = {
    constructor: MediaPlayer.dependencies.TextSourceBuffer
};

MediaPlayer.utils.TextTrackExtensions = function() {
    "use strict";
    var Cue;
    return {
        setup: function() {
            Cue = window.VTTCue || window.TextTrackCue;
        },
        addTextTrack: function(video, captionData, label, scrlang, isDefaultTrack) {
            var track = video.addTextTrack("captions", label, scrlang);
            track.default = isDefaultTrack;
            track.mode = "showing";
            for (var item in captionData) {
                var currentItem = captionData[item];
                track.addCue(new Cue(currentItem.start, currentItem.end, currentItem.data));
            }
            return Q.when(track);
        },
        deleteCues: function(video) {
            var track = video.textTracks[0], cues = track.cues, lastIdx = cues.length - 1;
            for (var i = lastIdx; i >= 0; i -= 1) {
                track.removeCue(cues[i]);
            }
            track.mode = "disabled";
        }
    };
};

MediaPlayer.utils.VTTParser = function() {
    "use strict";
    var convertCuePointTimes = function(time) {
        var timeArray = time.split(":"), len = timeArray.length - 1;
        time = parseInt(timeArray[len - 1], 10) * 60 + parseFloat(timeArray[len], 10);
        if (len === 2) {
            time += parseInt(timeArray[0], 10) * 3600;
        }
        return time;
    };
    return {
        parse: function(data) {
            var regExNewLine = /(?:\r\n|\r|\n)/gm, regExToken = /-->/, regExWhiteSpace = /(^[\s]+|[\s]+$)/g, captionArray = [], len;
            data = data.split(regExNewLine);
            len = data.length;
            for (var i = 0; i < len; i++) {
                var item = data[i];
                if (item.length > 0 && item !== "WEBVTT") {
                    if (item.match(regExToken)) {
                        var cuePoints = item.split(regExToken);
                        var sublines = data[i + 1];
                        captionArray.push({
                            start: convertCuePointTimes(cuePoints[0].replace(regExWhiteSpace, "")),
                            end: convertCuePointTimes(cuePoints[1].replace(regExWhiteSpace, "")),
                            data: sublines
                        });
                    }
                }
            }
            return Q.when(captionArray);
        }
    };
};

MediaPlayer.rules.BaseRulesCollection = function() {
    "use strict";
    var rules = [];
    return {
        downloadRatioRule: undefined,
        insufficientBufferRule: undefined,
        getRules: function() {
            return Q.when(rules);
        },
        setup: function() {
            var self = this;
            self.getRules().then(function(r) {
                r.push(self.downloadRatioRule);
                r.push(self.insufficientBufferRule);
            });
        }
    };
};

MediaPlayer.rules.BaseRulesCollection.prototype = {
    constructor: MediaPlayer.rules.BaseRulesCollection
};

MediaPlayer.rules.DownloadRatioRule = function() {
    "use strict";
    var checkRatio = function(newIdx, currentBandwidth, data) {
        var self = this, deferred = Q.defer();
        self.manifestExt.getRepresentationFor(newIdx, data).then(function(rep) {
            self.manifestExt.getBandwidth(rep).then(function(newBandwidth) {
                deferred.resolve(newBandwidth / currentBandwidth);
            });
        });
        return deferred.promise;
    };
    return {
        debug: undefined,
        manifestExt: undefined,
        metricsExt: undefined,
        checkIndex: function(current, metrics, data) {
            var self = this, lastRequest = self.metricsExt.getCurrentHttpRequest(metrics), downloadTime, totalTime, downloadRatio, totalRatio, switchRatio, deferred, funcs, i, len, DOWNLOAD_RATIO_SAFETY_FACTOR = .75;
            if (!metrics) {
                return Q.when(new MediaPlayer.rules.SwitchRequest());
            }
            if (lastRequest === null) {
                return Q.when(new MediaPlayer.rules.SwitchRequest());
            }
            totalTime = (lastRequest.tfinish.getTime() - lastRequest.trequest.getTime()) / 1e3;
            downloadTime = (lastRequest.tfinish.getTime() - lastRequest.tresponse.getTime()) / 1e3;
            if (totalTime <= 0) {
                return Q.when(new MediaPlayer.rules.SwitchRequest());
            }
            if (lastRequest.mediaduration === null || lastRequest.mediaduration === undefined || lastRequest.mediaduration <= 0 || isNaN(lastRequest.mediaduration)) {
                return Q.when(new MediaPlayer.rules.SwitchRequest());
            }
            deferred = Q.defer();
            totalRatio = lastRequest.mediaduration / totalTime;
            downloadRatio = lastRequest.mediaduration / downloadTime * DOWNLOAD_RATIO_SAFETY_FACTOR;
            if (isNaN(downloadRatio) || isNaN(totalRatio)) {
                self.debug.log("The ratios are NaN, bailing.");
                return Q.when(new MediaPlayer.rules.SwitchRequest());
            }
            if (isNaN(downloadRatio)) {
                deferred.resolve(new MediaPlayer.rules.SwitchRequest());
            } else if (downloadRatio < 4) {
                if (current > 0) {
                    self.debug.log("We are not at the lowest bitrate, so switch down.");
                    self.manifestExt.getRepresentationFor(current - 1, data).then(function(representation1) {
                        self.manifestExt.getBandwidth(representation1).then(function(oneDownBandwidth) {
                            self.manifestExt.getRepresentationFor(current, data).then(function(representation2) {
                                self.manifestExt.getBandwidth(representation2).then(function(currentBandwidth) {
                                    switchRatio = oneDownBandwidth / currentBandwidth;
                                    if (downloadRatio < switchRatio) {
                                        self.debug.log("Things must be going pretty bad, switch all the way down.");
                                        deferred.resolve(new MediaPlayer.rules.SwitchRequest(0));
                                    } else {
                                        self.debug.log("Things could be better, so just switch down one index.");
                                        deferred.resolve(new MediaPlayer.rules.SwitchRequest(current - 1));
                                    }
                                });
                            });
                        });
                    });
                } else {
                    deferred.resolve(new MediaPlayer.rules.SwitchRequest(current));
                }
            } else {
                self.manifestExt.getRepresentationCount(data).then(function(max) {
                    max -= 1;
                    if (current < max) {
                        self.manifestExt.getRepresentationFor(current + 1, data).then(function(representation1) {
                            self.manifestExt.getBandwidth(representation1).then(function(oneUpBandwidth) {
                                self.manifestExt.getRepresentationFor(current, data).then(function(representation2) {
                                    self.manifestExt.getBandwidth(representation2).then(function(currentBandwidth) {
                                        switchRatio = oneUpBandwidth / currentBandwidth;
                                        if (downloadRatio >= switchRatio) {
                                            if (downloadRatio > 100) {
                                                self.debug.log("Tons of bandwidth available, go all the way up.");
                                                deferred.resolve(new MediaPlayer.rules.SwitchRequest(max - 1));
                                            } else if (downloadRatio > 10) {
                                                self.debug.log("Just enough bandwidth available, switch up one.");
                                                deferred.resolve(new MediaPlayer.rules.SwitchRequest(current + 1));
                                            } else {
                                                i = -1;
                                                funcs = [];
                                                while ((i += 1) < max) {
                                                    funcs.push(checkRatio.call(self, i, currentBandwidth, data));
                                                }
                                                Q.all(funcs).then(function(results) {
                                                    for (i = 0, len = results.length; i < len; i += 1) {
                                                        if (downloadRatio < results[i]) {
                                                            break;
                                                        }
                                                    }
                                                    self.debug.log("Calculated ideal new quality index is: " + i);
                                                    deferred.resolve(new MediaPlayer.rules.SwitchRequest(i));
                                                });
                                            }
                                        } else {
                                            deferred.resolve(new MediaPlayer.rules.SwitchRequest());
                                        }
                                    });
                                });
                            });
                        });
                    } else {
                        deferred.resolve(new MediaPlayer.rules.SwitchRequest(max));
                    }
                });
            }
            return deferred.promise;
        }
    };
};

MediaPlayer.rules.DownloadRatioRule.prototype = {
    constructor: MediaPlayer.rules.DownloadRatioRule
};

MediaPlayer.rules.InsufficientBufferRule = function() {
    "use strict";
    var dryBufferHits = 0, DRY_BUFFER_LIMIT = 3;
    return {
        debug: undefined,
        checkIndex: function(current, metrics) {
            var self = this, playlist, trace, shift = false, p = MediaPlayer.rules.SwitchRequest.prototype.DEFAULT;
            if (metrics.PlayList === null || metrics.PlayList === undefined || metrics.PlayList.length === 0) {
                return Q.when(new MediaPlayer.rules.SwitchRequest());
            }
            playlist = metrics.PlayList[metrics.PlayList.length - 1];
            if (playlist === null || playlist === undefined || playlist.trace.length === 0) {
                return Q.when(new MediaPlayer.rules.SwitchRequest());
            }
            trace = playlist.trace[playlist.trace.length - 2];
            if (trace === null || trace === undefined || trace.stopreason === null || trace.stopreason === undefined) {
                return Q.when(new MediaPlayer.rules.SwitchRequest());
            }
            if (trace.stopreason === MediaPlayer.vo.metrics.PlayList.Trace.REBUFFERING_REASON) {
                shift = true;
                dryBufferHits += 1;
                self.debug.log("Number of times the buffer has run dry: " + dryBufferHits);
            }
            if (dryBufferHits > DRY_BUFFER_LIMIT) {
                p = MediaPlayer.rules.SwitchRequest.prototype.STRONG;
                self.debug.log("Apply STRONG to buffer rule.");
            }
            if (shift) {
                self.debug.log("The buffer ran dry recently, switch down.");
                return Q.when(new MediaPlayer.rules.SwitchRequest(current - 1, p));
            } else if (dryBufferHits > DRY_BUFFER_LIMIT) {
                self.debug.log("Too many dry buffer hits, quit switching bitrates.");
                return Q.when(new MediaPlayer.rules.SwitchRequest(current, p));
            } else {
                return Q.when(new MediaPlayer.rules.SwitchRequest(MediaPlayer.rules.SwitchRequest.prototype.NO_CHANGE, p));
            }
        }
    };
};

MediaPlayer.rules.InsufficientBufferRule.prototype = {
    constructor: MediaPlayer.rules.InsufficientBufferRule
};

MediaPlayer.rules.LimitSwitchesRule = function() {
    "use strict";
    var MAX_SWITCHES = 10, VALIDATION_TIME = 2e4, WAIT_COUNT = 5, waiting = 0;
    return {
        debug: undefined,
        checkIndex: function(current, metrics) {
            if (waiting > 0) {
                waiting -= 1;
                return Q.when(new MediaPlayer.rules.SwitchRequest(current, MediaPlayer.rules.SwitchRequest.prototype.STRONG));
            }
            var self = this, panic = false, rs, now = new Date().getTime(), delay, i, numSwitches = metrics.RepSwitchList.length;
            for (i = numSwitches - 1; i >= 0; i -= 1) {
                rs = metrics.RepSwitchList[i];
                delay = now - rs.t.getTime();
                if (delay >= VALIDATION_TIME) {
                    self.debug.log("Reached time limit, bailing.");
                    break;
                }
                if (i >= MAX_SWITCHES) {
                    self.debug.log("Found too many switches within validation time, force the stream to not change.");
                    panic = true;
                    break;
                }
            }
            if (panic) {
                self.debug.log("Wait some time before allowing another switch.");
                waiting = WAIT_COUNT;
                return Q.when(new MediaPlayer.rules.SwitchRequest(current, MediaPlayer.rules.SwitchRequest.prototype.STRONG));
            } else {
                return Q.when(new MediaPlayer.rules.SwitchRequest(MediaPlayer.rules.SwitchRequest.prototype.NO_CHANGE, MediaPlayer.rules.SwitchRequest.prototype.STRONG));
            }
        }
    };
};

MediaPlayer.rules.LimitSwitchesRule.prototype = {
    constructor: MediaPlayer.rules.LimitSwitchesRule
};

MediaPlayer.rules.SwitchRequest = function(q, p) {
    "use strict";
    this.quality = q;
    this.priority = p;
    if (this.quality === undefined) {
        this.quality = 999;
    }
    if (this.priority === undefined) {
        this.priority = .5;
    }
};

MediaPlayer.rules.SwitchRequest.prototype = {
    constructor: MediaPlayer.rules.SwitchRequest,
    NO_CHANGE: 999,
    DEFAULT: .5,
    STRONG: 1,
    WEAK: 0
};

MediaPlayer.models.MetricsList = function() {
    "use strict";
    return {
        TcpList: [],
        HttpList: [],
        RepSwitchList: [],
        BufferLevel: [],
        PlayList: [],
        DroppedFrames: [],
        DVRInfo: [],
        ManifestUpdate: []
    };
};

MediaPlayer.models.MetricsList.prototype = {
    constructor: MediaPlayer.models.MetricsList
};

MediaPlayer.vo.SegmentRequest = function() {
    "use strict";
    this.action = "download";
    this.startTime = NaN;
    this.streamType = null;
    this.type = null;
    this.duration = NaN;
    this.timescale = NaN;
    this.range = null;
    this.url = null;
    this.requestStartDate = null;
    this.firstByteDate = null;
    this.requestEndDate = null;
    this.deferred = null;
    this.quality = NaN;
    this.index = NaN;
    this.availabilityStartTime = null;
    this.availabilityEndTime = null;
    this.wallStartTime = null;
};

MediaPlayer.vo.SegmentRequest.prototype = {
    constructor: MediaPlayer.vo.SegmentRequest,
    ACTION_DOWNLOAD: "download",
    ACTION_COMPLETE: "complete"
};

MediaPlayer.vo.URIFragmentData = function() {
    "use strict";
    this.t = null;
    this.xywh = null;
    this.track = null;
    this.id = null;
    this.s = null;
};

MediaPlayer.vo.URIFragmentData.prototype = {
    constructor: MediaPlayer.vo.URIFragmentData
};

MediaPlayer.vo.metrics.BufferLevel = function() {
    "use strict";
    this.t = null;
    this.level = null;
};

MediaPlayer.vo.metrics.BufferLevel.prototype = {
    constructor: MediaPlayer.vo.metrics.BufferLevel
};

MediaPlayer.vo.metrics.DVRInfo = function() {
    "use strict";
    this.time = null;
    this.range = null;
    this.mpd = null;
};

MediaPlayer.vo.metrics.DVRInfo.prototype = {
    constructor: MediaPlayer.vo.metrics.DVRInfo
};

MediaPlayer.vo.metrics.DroppedFrames = function() {
    "use strict";
    this.time = null;
    this.droppedFrames = null;
};

MediaPlayer.vo.metrics.DroppedFrames.prototype = {
    constructor: MediaPlayer.vo.metrics.DroppedFrames
};

MediaPlayer.vo.metrics.HTTPRequest = function() {
    "use strict";
    this.stream = null;
    this.tcpid = null;
    this.type = null;
    this.url = null;
    this.actualurl = null;
    this.range = null;
    this.trequest = null;
    this.tresponse = null;
    this.tfinish = null;
    this.responsecode = null;
    this.interval = null;
    this.mediaduration = null;
    this.trace = [];
};

MediaPlayer.vo.metrics.HTTPRequest.prototype = {
    constructor: MediaPlayer.vo.metrics.HTTPRequest
};

MediaPlayer.vo.metrics.HTTPRequest.Trace = function() {
    "use strict";
    this.s = null;
    this.d = null;
    this.b = [];
};

MediaPlayer.vo.metrics.HTTPRequest.Trace.prototype = {
    constructor: MediaPlayer.vo.metrics.HTTPRequest.Trace
};

MediaPlayer.vo.metrics.ManifestUpdate = function() {
    "use strict";
    this.streamType = null;
    this.type = null;
    this.requestTime = null;
    this.fetchTime = null;
    this.availabilityStartTime = null;
    this.presentationStartTime = 0;
    this.clientTimeOffset = 0;
    this.currentTime = null;
    this.buffered = null;
    this.latency = 0;
    this.periodInfo = [];
    this.representationInfo = [];
};

MediaPlayer.vo.metrics.ManifestUpdate.PeriodInfo = function() {
    "use strict";
    this.id = null;
    this.index = null;
    this.start = null;
    this.duration = null;
};

MediaPlayer.vo.metrics.ManifestUpdate.RepresentationInfo = function() {
    "use strict";
    this.id = null;
    this.index = null;
    this.streamType = null;
    this.periodIndex = null;
    this.presentationTimeOffset = null;
    this.startNumber = null;
    this.segmentInfoType = null;
};

MediaPlayer.vo.metrics.ManifestUpdate.prototype = {
    constructor: MediaPlayer.vo.metrics.ManifestUpdate
};

MediaPlayer.vo.metrics.ManifestUpdate.PeriodInfo.prototype = {
    constructor: MediaPlayer.vo.metrics.ManifestUpdate.PeriodInfo
};

MediaPlayer.vo.metrics.ManifestUpdate.RepresentationInfo.prototype = {
    constructor: MediaPlayer.vo.metrics.ManifestUpdate.RepresentationInfo
};

MediaPlayer.vo.metrics.PlayList = function() {
    "use strict";
    this.stream = null;
    this.start = null;
    this.mstart = null;
    this.starttype = null;
    this.trace = [];
};

MediaPlayer.vo.metrics.PlayList.Trace = function() {
    "use strict";
    this.representationid = null;
    this.subreplevel = null;
    this.start = null;
    this.mstart = null;
    this.duration = null;
    this.playbackspeed = null;
    this.stopreason = null;
};

MediaPlayer.vo.metrics.PlayList.prototype = {
    constructor: MediaPlayer.vo.metrics.PlayList
};

MediaPlayer.vo.metrics.PlayList.INITIAL_PLAY_START_REASON = "initial_start";

MediaPlayer.vo.metrics.PlayList.SEEK_START_REASON = "seek";

MediaPlayer.vo.metrics.PlayList.Trace.prototype = {
    constructor: MediaPlayer.vo.metrics.PlayList.Trace()
};

MediaPlayer.vo.metrics.PlayList.Trace.USER_REQUEST_STOP_REASON = "user_request";

MediaPlayer.vo.metrics.PlayList.Trace.REPRESENTATION_SWITCH_STOP_REASON = "representation_switch";

MediaPlayer.vo.metrics.PlayList.Trace.END_OF_CONTENT_STOP_REASON = "end_of_content";

MediaPlayer.vo.metrics.PlayList.Trace.REBUFFERING_REASON = "rebuffering";

MediaPlayer.vo.metrics.RepresentationSwitch = function() {
    "use strict";
    this.t = null;
    this.mt = null;
    this.to = null;
    this.lto = null;
};

MediaPlayer.vo.metrics.RepresentationSwitch.prototype = {
    constructor: MediaPlayer.vo.metrics.RepresentationSwitch
};

MediaPlayer.vo.metrics.TCPConnection = function() {
    "use strict";
    this.tcpid = null;
    this.dest = null;
    this.topen = null;
    this.tclose = null;
    this.tconnect = null;
};

MediaPlayer.vo.metrics.TCPConnection.prototype = {
    constructor: MediaPlayer.vo.metrics.TCPConnection
};