function X2JS(matchers, attrPrefix, ignoreRoot) {
    function getNodeLocalName(node) {
        var nodeLocalName = node.localName;
        return null == nodeLocalName && (nodeLocalName = node.baseName), (null == nodeLocalName || "" == nodeLocalName) && (nodeLocalName = node.nodeName), 
        nodeLocalName;
    }
    function getNodePrefix(node) {
        return node.prefix;
    }
    function escapeXmlChars(str) {
        return "string" == typeof str ? str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#x27;").replace(/\//g, "&#x2F;") : str;
    }
    function unescapeXmlChars(str) {
        return str.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#x27;/g, "'").replace(/&#x2F;/g, "/");
    }
    function parseDOMChildren(node) {
        if (node.nodeType == DOMNodeTypes.DOCUMENT_NODE) {
            var result, i, len, child = node.firstChild;
            for (i = 0, len = node.childNodes.length; len > i; i += 1) if (node.childNodes[i].nodeType !== DOMNodeTypes.COMMENT_NODE) {
                child = node.childNodes[i];
                break;
            }
            if (ignoreRoot) result = parseDOMChildren(child); else {
                result = {};
                var childName = getNodeLocalName(child);
                result[childName] = parseDOMChildren(child);
            }
            return result;
        }
        if (node.nodeType == DOMNodeTypes.ELEMENT_NODE) {
            var result = new Object();
            result.__cnt = 0;
            for (var nodeChildren = node.childNodes, cidx = 0; cidx < nodeChildren.length; cidx++) {
                var child = nodeChildren.item(cidx), childName = getNodeLocalName(child);
                if (result.__cnt++, null == result[childName]) result[childName] = parseDOMChildren(child), 
                result[childName + "_asArray"] = new Array(1), result[childName + "_asArray"][0] = result[childName]; else {
                    if (null != result[childName] && !(result[childName] instanceof Array)) {
                        var tmpObj = result[childName];
                        result[childName] = new Array(), result[childName][0] = tmpObj, result[childName + "_asArray"] = result[childName];
                    }
                    for (var aridx = 0; null != result[childName][aridx]; ) aridx++;
                    result[childName][aridx] = parseDOMChildren(child);
                }
            }
            for (var aidx = 0; aidx < node.attributes.length; aidx++) {
                var attr = node.attributes.item(aidx);
                result.__cnt++;
                for (var value2 = attr.value, m = 0, ml = matchers.length; ml > m; m++) {
                    var matchobj = matchers[m];
                    matchobj.test.call(this, attr) && (value2 = matchobj.converter.call(this, attr.value));
                }
                result[attrPrefix + attr.name] = value2;
            }
            var nodePrefix = getNodePrefix(node);
            return null != nodePrefix && "" != nodePrefix && (result.__cnt++, result.__prefix = nodePrefix), 
            1 == result.__cnt && null != result["#text"] && (result = result["#text"]), null != result["#text"] && (result.__text = result["#text"], 
            escapeMode && (result.__text = unescapeXmlChars(result.__text)), delete result["#text"], 
            delete result["#text_asArray"]), null != result["#cdata-section"] && (result.__cdata = result["#cdata-section"], 
            delete result["#cdata-section"], delete result["#cdata-section_asArray"]), (null != result.__text || null != result.__cdata) && (result.toString = function() {
                return (null != this.__text ? this.__text : "") + (null != this.__cdata ? this.__cdata : "");
            }), result;
        }
        return node.nodeType == DOMNodeTypes.TEXT_NODE || node.nodeType == DOMNodeTypes.CDATA_SECTION_NODE ? node.nodeValue : node.nodeType == DOMNodeTypes.COMMENT_NODE ? null : void 0;
    }
    function startTag(jsonObj, element, attrList, closed) {
        var resultStr = "<" + (null != jsonObj && null != jsonObj.__prefix ? jsonObj.__prefix + ":" : "") + element;
        if (null != attrList) for (var aidx = 0; aidx < attrList.length; aidx++) {
            var attrName = attrList[aidx], attrVal = jsonObj[attrName];
            resultStr += " " + attrName.substr(1) + "='" + attrVal + "'";
        }
        return resultStr += closed ? "/>" : ">";
    }
    function endTag(jsonObj, elementName) {
        return "</" + (null != jsonObj.__prefix ? jsonObj.__prefix + ":" : "") + elementName + ">";
    }
    function endsWith(str, suffix) {
        return -1 !== str.indexOf(suffix, str.length - suffix.length);
    }
    function jsonXmlSpecialElem(jsonObj, jsonObjField) {
        return endsWith(jsonObjField.toString(), "_asArray") || 0 == jsonObjField.toString().indexOf("_") || jsonObj[jsonObjField] instanceof Function ? !0 : !1;
    }
    function jsonXmlElemCount(jsonObj) {
        var elementsCnt = 0;
        if (jsonObj instanceof Object) for (var it in jsonObj) jsonXmlSpecialElem(jsonObj, it) || elementsCnt++;
        return elementsCnt;
    }
    function parseJSONAttributes(jsonObj) {
        var attrList = [];
        if (jsonObj instanceof Object) for (var ait in jsonObj) -1 == ait.toString().indexOf("__") && 0 == ait.toString().indexOf("_") && attrList.push(ait);
        return attrList;
    }
    function parseJSONTextAttrs(jsonTxtObj) {
        var result = "";
        return null != jsonTxtObj.__cdata && (result += "<![CDATA[" + jsonTxtObj.__cdata + "]]>"), 
        null != jsonTxtObj.__text && (result += escapeMode ? escapeXmlChars(jsonTxtObj.__text) : jsonTxtObj.__text), 
        result;
    }
    function parseJSONTextObject(jsonTxtObj) {
        var result = "";
        return jsonTxtObj instanceof Object ? result += parseJSONTextAttrs(jsonTxtObj) : null != jsonTxtObj && (result += escapeMode ? escapeXmlChars(jsonTxtObj) : jsonTxtObj), 
        result;
    }
    function parseJSONArray(jsonArrRoot, jsonArrObj, attrList) {
        var result = "";
        if (0 == jsonArrRoot.length) result += startTag(jsonArrRoot, jsonArrObj, attrList, !0); else for (var arIdx = 0; arIdx < jsonArrRoot.length; arIdx++) result += startTag(jsonArrRoot[arIdx], jsonArrObj, parseJSONAttributes(jsonArrRoot[arIdx]), !1), 
        result += parseJSONObject(jsonArrRoot[arIdx]), result += endTag(jsonArrRoot[arIdx], jsonArrObj);
        return result;
    }
    function parseJSONObject(jsonObj) {
        var result = "", elementsCnt = jsonXmlElemCount(jsonObj);
        if (elementsCnt > 0) for (var it in jsonObj) if (!jsonXmlSpecialElem(jsonObj, it)) {
            var subObj = jsonObj[it], attrList = parseJSONAttributes(subObj);
            if (null == subObj || void 0 == subObj) result += startTag(subObj, it, attrList, !0); else if (subObj instanceof Object) if (subObj instanceof Array) result += parseJSONArray(subObj, it, attrList); else {
                var subObjElementsCnt = jsonXmlElemCount(subObj);
                subObjElementsCnt > 0 || null != subObj.__text || null != subObj.__cdata ? (result += startTag(subObj, it, attrList, !1), 
                result += parseJSONObject(subObj), result += endTag(subObj, it)) : result += startTag(subObj, it, attrList, !0);
            } else result += startTag(subObj, it, attrList, !1), result += parseJSONTextObject(subObj), 
            result += endTag(subObj, it);
        }
        return result += parseJSONTextObject(jsonObj);
    }
    (null === attrPrefix || void 0 === attrPrefix) && (attrPrefix = "_"), (null === ignoreRoot || void 0 === ignoreRoot) && (ignoreRoot = !1);
    var VERSION = "1.0.11", escapeMode = !1, DOMNodeTypes = {
        ELEMENT_NODE: 1,
        TEXT_NODE: 3,
        CDATA_SECTION_NODE: 4,
        COMMENT_NODE: 8,
        DOCUMENT_NODE: 9
    };
    this.parseXmlString = function(xmlDocStr) {
        var xmlDoc;
        if (window.DOMParser) {
            var parser = new window.DOMParser();
            xmlDoc = parser.parseFromString(xmlDocStr, "text/xml");
        } else 0 == xmlDocStr.indexOf("<?") && (xmlDocStr = xmlDocStr.substr(xmlDocStr.indexOf("?>") + 2)), 
        xmlDoc = new ActiveXObject("Microsoft.XMLDOM"), xmlDoc.async = "false", xmlDoc.loadXML(xmlDocStr);
        return xmlDoc;
    }, this.xml2json = function(xmlDoc) {
        return parseDOMChildren(xmlDoc);
    }, this.xml_str2json = function(xmlDocStr) {
        var xmlDoc = this.parseXmlString(xmlDocStr);
        return this.xml2json(xmlDoc);
    }, this.json2xml_str = function(jsonObj) {
        return parseJSONObject(jsonObj);
    }, this.json2xml = function(jsonObj) {
        var xmlDocStr = this.json2xml_str(jsonObj);
        return this.parseXmlString(xmlDocStr);
    }, this.getVersion = function() {
        return VERSION;
    }, this.escapeMode = function(enabled) {
        escapeMode = enabled;
    };
}

function ObjectIron(map) {
    var lookup;
    for (lookup = [], i = 0, len = map.length; len > i; i += 1) lookup.push(map[i].isRoot ? "root" : map[i].name);
    var mergeValues = function(parentItem, childItem) {
        var name;
        if (null !== parentItem && null !== childItem) for (name in parentItem) parentItem.hasOwnProperty(name) && (childItem.hasOwnProperty(name) || (childItem[name] = parentItem[name]));
    }, mapProperties = function(properties, parent, child) {
        var i, len, property, parentValue, childValue;
        if (null !== properties && 0 !== properties.length) for (i = 0, len = properties.length; len > i; i += 1) property = properties[i], 
        parent.hasOwnProperty(property.name) && (child.hasOwnProperty(property.name) ? property.merge && (parentValue = parent[property.name], 
        childValue = child[property.name], "object" == typeof parentValue && "object" == typeof childValue ? mergeValues(parentValue, childValue) : child[property.name] = null != property.mergeFunction ? property.mergeFunction(parentValue, childValue) : parentValue + childValue) : child[property.name] = parent[property.name]);
    }, mapItem = function(obj, node) {
        var i, len, v, len2, array, childItem, childNode, item = obj;
        if (null !== item.children && 0 !== item.children.length) for (i = 0, len = item.children.length; len > i; i += 1) if (childItem = item.children[i], 
        node.hasOwnProperty(childItem.name)) if (childItem.isArray) for (array = node[childItem.name + "_asArray"], 
        v = 0, len2 = array.length; len2 > v; v += 1) childNode = array[v], mapProperties(item.properties, node, childNode), 
        mapItem(childItem, childNode); else childNode = node[childItem.name], mapProperties(item.properties, node, childNode), 
        mapItem(childItem, childNode);
    }, performMapping = function(source) {
        var i, len, pi, pp, item, node, array;
        if (null === source) return source;
        if ("object" != typeof source) return source;
        for (i = 0, len = lookup.length; len > i; i += 1) "root" === lookup[i] && (item = map[i], 
        node = source, mapItem(item, node));
        for (pp in source) if (source.hasOwnProperty(pp)) {
            if (pi = lookup.indexOf(pp), -1 !== pi) if (item = map[pi], item.isArray) for (array = source[pp + "_asArray"], 
            i = 0, len = array.length; len > i; i += 1) node = array[i], mapItem(item, node); else node = source[pp], 
            mapItem(item, node);
            performMapping(source[pp]);
        }
        return source;
    };
    return {
        run: performMapping
    };
}

if (function(scope) {
    "use strict";
    var dijon = {
        VERSION: "0.5.3"
    };
    dijon.System = function() {
        this._mappings = {}, this._outlets = {}, this._handlers = {}, this.strictInjections = !0, 
        this.autoMapOutlets = !1, this.postInjectionHook = "setup";
    }, dijon.System.prototype = {
        _createAndSetupInstance: function(key, Clazz) {
            var instance = new Clazz();
            return this.injectInto(instance, key), instance;
        },
        _retrieveFromCacheOrCreate: function(key, overrideRules) {
            "undefined" == typeof overrideRules && (overrideRules = !1);
            var output;
            if (!this._mappings.hasOwnProperty(key)) throw new Error(1e3);
            var config = this._mappings[key];
            return !overrideRules && config.isSingleton ? (null == config.object && (config.object = this._createAndSetupInstance(key, config.clazz)), 
            output = config.object) : output = config.clazz ? this._createAndSetupInstance(key, config.clazz) : config.object, 
            output;
        },
        mapOutlet: function(sourceKey, targetKey, outletName) {
            if ("undefined" == typeof sourceKey) throw new Error(1010);
            return targetKey = targetKey || "global", outletName = outletName || sourceKey, 
            this._outlets.hasOwnProperty(targetKey) || (this._outlets[targetKey] = {}), this._outlets[targetKey][outletName] = sourceKey, 
            this;
        },
        getObject: function(key) {
            if ("undefined" == typeof key) throw new Error(1020);
            return this._retrieveFromCacheOrCreate(key);
        },
        mapValue: function(key, useValue) {
            if ("undefined" == typeof key) throw new Error(1030);
            return this._mappings[key] = {
                clazz: null,
                object: useValue,
                isSingleton: !0
            }, this.autoMapOutlets && this.mapOutlet(key), this.hasMapping(key) && this.injectInto(useValue, key), 
            this;
        },
        hasMapping: function(key) {
            if ("undefined" == typeof key) throw new Error(1040);
            return this._mappings.hasOwnProperty(key);
        },
        mapClass: function(key, clazz) {
            if ("undefined" == typeof key) throw new Error(1050);
            if ("undefined" == typeof clazz) throw new Error(1051);
            return this._mappings[key] = {
                clazz: clazz,
                object: null,
                isSingleton: !1
            }, this.autoMapOutlets && this.mapOutlet(key), this;
        },
        mapSingleton: function(key, clazz) {
            if ("undefined" == typeof key) throw new Error(1060);
            if ("undefined" == typeof clazz) throw new Error(1061);
            return this._mappings[key] = {
                clazz: clazz,
                object: null,
                isSingleton: !0
            }, this.autoMapOutlets && this.mapOutlet(key), this;
        },
        instantiate: function(key) {
            if ("undefined" == typeof key) throw new Error(1070);
            return this._retrieveFromCacheOrCreate(key, !0);
        },
        injectInto: function(instance, key) {
            if ("undefined" == typeof instance) throw new Error(1080);
            if ("object" == typeof instance) {
                var o = [];
                this._outlets.hasOwnProperty("global") && o.push(this._outlets.global), "undefined" != typeof key && this._outlets.hasOwnProperty(key) && o.push(this._outlets[key]);
                for (var i in o) {
                    var l = o[i];
                    for (var outlet in l) {
                        var source = l[outlet];
                        (!this.strictInjections || outlet in instance) && (instance[outlet] = this.getObject(source));
                    }
                }
                "setup" in instance && instance.setup.call(instance);
            }
            return this;
        },
        unmap: function(key) {
            if ("undefined" == typeof key) throw new Error(1090);
            return delete this._mappings[key], this;
        },
        unmapOutlet: function(target, outlet) {
            if ("undefined" == typeof target) throw new Error(1100);
            if ("undefined" == typeof outlet) throw new Error(1101);
            return delete this._outlets[target][outlet], this;
        },
        mapHandler: function(eventName, key, handler, oneShot, passEvent) {
            if ("undefined" == typeof eventName) throw new Error(1110);
            return key = key || "global", handler = handler || eventName, "undefined" == typeof oneShot && (oneShot = !1), 
            "undefined" == typeof passEvent && (passEvent = !1), this._handlers.hasOwnProperty(eventName) || (this._handlers[eventName] = {}), 
            this._handlers[eventName].hasOwnProperty(key) || (this._handlers[eventName][key] = []), 
            this._handlers[eventName][key].push({
                handler: handler,
                oneShot: oneShot,
                passEvent: passEvent
            }), this;
        },
        unmapHandler: function(eventName, key, handler) {
            if ("undefined" == typeof eventName) throw new Error(1120);
            if (key = key || "global", handler = handler || eventName, this._handlers.hasOwnProperty(eventName) && this._handlers[eventName].hasOwnProperty(key)) {
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
            if ("undefined" == typeof eventName) throw new Error(1130);
            var argsWithEvent = Array.prototype.slice.call(arguments), argsClean = argsWithEvent.slice(1);
            if (this._handlers.hasOwnProperty(eventName)) {
                var handlers = this._handlers[eventName];
                for (var key in handlers) {
                    var instance, configs = handlers[key];
                    "global" !== key && (instance = this.getObject(key));
                    var i, n, toBeDeleted = [];
                    for (i = 0, n = configs.length; n > i; i++) {
                        var handler, config = configs[i];
                        handler = instance && "string" == typeof config.handler ? instance[config.handler] : config.handler, 
                        config.oneShot && toBeDeleted.unshift(i), config.passEvent ? handler.apply(instance, argsWithEvent) : handler.apply(instance, argsClean);
                    }
                    for (i = 0, n = toBeDeleted.length; n > i; i++) configs.splice(toBeDeleted[i], 1);
                }
            }
            return this;
        }
    }, scope.dijon = dijon;
}(this), "undefined" == typeof utils) var utils = {};

"undefined" == typeof utils.Math && (utils.Math = {}), utils.Math.to64BitNumber = function(low, high) {
    var highNum, lowNum, expected;
    return highNum = new goog.math.Long(0, high), lowNum = new goog.math.Long(low, 0), 
    expected = highNum.add(lowNum), expected.toNumber();
}, goog = {}, goog.math = {}, goog.math.Long = function(low, high) {
    this.low_ = 0 | low, this.high_ = 0 | high;
}, goog.math.Long.IntCache_ = {}, goog.math.Long.fromInt = function(value) {
    if (value >= -128 && 128 > value) {
        var cachedObj = goog.math.Long.IntCache_[value];
        if (cachedObj) return cachedObj;
    }
    var obj = new goog.math.Long(0 | value, 0 > value ? -1 : 0);
    return value >= -128 && 128 > value && (goog.math.Long.IntCache_[value] = obj), 
    obj;
}, goog.math.Long.fromNumber = function(value) {
    return isNaN(value) || !isFinite(value) ? goog.math.Long.ZERO : value <= -goog.math.Long.TWO_PWR_63_DBL_ ? goog.math.Long.MIN_VALUE : value + 1 >= goog.math.Long.TWO_PWR_63_DBL_ ? goog.math.Long.MAX_VALUE : 0 > value ? goog.math.Long.fromNumber(-value).negate() : new goog.math.Long(value % goog.math.Long.TWO_PWR_32_DBL_ | 0, value / goog.math.Long.TWO_PWR_32_DBL_ | 0);
}, goog.math.Long.fromBits = function(lowBits, highBits) {
    return new goog.math.Long(lowBits, highBits);
}, goog.math.Long.fromString = function(str, opt_radix) {
    if (0 == str.length) throw Error("number format error: empty string");
    var radix = opt_radix || 10;
    if (2 > radix || radix > 36) throw Error("radix out of range: " + radix);
    if ("-" == str.charAt(0)) return goog.math.Long.fromString(str.substring(1), radix).negate();
    if (str.indexOf("-") >= 0) throw Error('number format error: interior "-" character: ' + str);
    for (var radixToPower = goog.math.Long.fromNumber(Math.pow(radix, 8)), result = goog.math.Long.ZERO, i = 0; i < str.length; i += 8) {
        var size = Math.min(8, str.length - i), value = parseInt(str.substring(i, i + size), radix);
        if (8 > size) {
            var power = goog.math.Long.fromNumber(Math.pow(radix, size));
            result = result.multiply(power).add(goog.math.Long.fromNumber(value));
        } else result = result.multiply(radixToPower), result = result.add(goog.math.Long.fromNumber(value));
    }
    return result;
}, goog.math.Long.TWO_PWR_16_DBL_ = 65536, goog.math.Long.TWO_PWR_24_DBL_ = 1 << 24, 
goog.math.Long.TWO_PWR_32_DBL_ = goog.math.Long.TWO_PWR_16_DBL_ * goog.math.Long.TWO_PWR_16_DBL_, 
goog.math.Long.TWO_PWR_31_DBL_ = goog.math.Long.TWO_PWR_32_DBL_ / 2, goog.math.Long.TWO_PWR_48_DBL_ = goog.math.Long.TWO_PWR_32_DBL_ * goog.math.Long.TWO_PWR_16_DBL_, 
goog.math.Long.TWO_PWR_64_DBL_ = goog.math.Long.TWO_PWR_32_DBL_ * goog.math.Long.TWO_PWR_32_DBL_, 
goog.math.Long.TWO_PWR_63_DBL_ = goog.math.Long.TWO_PWR_64_DBL_ / 2, goog.math.Long.ZERO = goog.math.Long.fromInt(0), 
goog.math.Long.ONE = goog.math.Long.fromInt(1), goog.math.Long.NEG_ONE = goog.math.Long.fromInt(-1), 
goog.math.Long.MAX_VALUE = goog.math.Long.fromBits(-1, 2147483647), goog.math.Long.MIN_VALUE = goog.math.Long.fromBits(0, -2147483648), 
goog.math.Long.TWO_PWR_24_ = goog.math.Long.fromInt(1 << 24), goog.math.Long.prototype.toInt = function() {
    return this.low_;
}, goog.math.Long.prototype.toNumber = function() {
    return this.high_ * goog.math.Long.TWO_PWR_32_DBL_ + this.getLowBitsUnsigned();
}, goog.math.Long.prototype.toString = function(opt_radix) {
    var radix = opt_radix || 10;
    if (2 > radix || radix > 36) throw Error("radix out of range: " + radix);
    if (this.isZero()) return "0";
    if (this.isNegative()) {
        if (this.equals(goog.math.Long.MIN_VALUE)) {
            var radixLong = goog.math.Long.fromNumber(radix), div = this.div(radixLong), rem = div.multiply(radixLong).subtract(this);
            return div.toString(radix) + rem.toInt().toString(radix);
        }
        return "-" + this.negate().toString(radix);
    }
    for (var radixToPower = goog.math.Long.fromNumber(Math.pow(radix, 6)), rem = this, result = ""; ;) {
        var remDiv = rem.div(radixToPower), intval = rem.subtract(remDiv.multiply(radixToPower)).toInt(), digits = intval.toString(radix);
        if (rem = remDiv, rem.isZero()) return digits + result;
        for (;digits.length < 6; ) digits = "0" + digits;
        result = "" + digits + result;
    }
}, goog.math.Long.prototype.getHighBits = function() {
    return this.high_;
}, goog.math.Long.prototype.getLowBits = function() {
    return this.low_;
}, goog.math.Long.prototype.getLowBitsUnsigned = function() {
    return this.low_ >= 0 ? this.low_ : goog.math.Long.TWO_PWR_32_DBL_ + this.low_;
}, goog.math.Long.prototype.getNumBitsAbs = function() {
    if (this.isNegative()) return this.equals(goog.math.Long.MIN_VALUE) ? 64 : this.negate().getNumBitsAbs();
    for (var val = 0 != this.high_ ? this.high_ : this.low_, bit = 31; bit > 0 && 0 == (val & 1 << bit); bit--) ;
    return 0 != this.high_ ? bit + 33 : bit + 1;
}, goog.math.Long.prototype.isZero = function() {
    return 0 == this.high_ && 0 == this.low_;
}, goog.math.Long.prototype.isNegative = function() {
    return this.high_ < 0;
}, goog.math.Long.prototype.isOdd = function() {
    return 1 == (1 & this.low_);
}, goog.math.Long.prototype.equals = function(other) {
    return this.high_ == other.high_ && this.low_ == other.low_;
}, goog.math.Long.prototype.notEquals = function(other) {
    return this.high_ != other.high_ || this.low_ != other.low_;
}, goog.math.Long.prototype.lessThan = function(other) {
    return this.compare(other) < 0;
}, goog.math.Long.prototype.lessThanOrEqual = function(other) {
    return this.compare(other) <= 0;
}, goog.math.Long.prototype.greaterThan = function(other) {
    return this.compare(other) > 0;
}, goog.math.Long.prototype.greaterThanOrEqual = function(other) {
    return this.compare(other) >= 0;
}, goog.math.Long.prototype.compare = function(other) {
    if (this.equals(other)) return 0;
    var thisNeg = this.isNegative(), otherNeg = other.isNegative();
    return thisNeg && !otherNeg ? -1 : !thisNeg && otherNeg ? 1 : this.subtract(other).isNegative() ? -1 : 1;
}, goog.math.Long.prototype.negate = function() {
    return this.equals(goog.math.Long.MIN_VALUE) ? goog.math.Long.MIN_VALUE : this.not().add(goog.math.Long.ONE);
}, goog.math.Long.prototype.add = function(other) {
    var a48 = this.high_ >>> 16, a32 = 65535 & this.high_, a16 = this.low_ >>> 16, a00 = 65535 & this.low_, b48 = other.high_ >>> 16, b32 = 65535 & other.high_, b16 = other.low_ >>> 16, b00 = 65535 & other.low_, c48 = 0, c32 = 0, c16 = 0, c00 = 0;
    return c00 += a00 + b00, c16 += c00 >>> 16, c00 &= 65535, c16 += a16 + b16, c32 += c16 >>> 16, 
    c16 &= 65535, c32 += a32 + b32, c48 += c32 >>> 16, c32 &= 65535, c48 += a48 + b48, 
    c48 &= 65535, goog.math.Long.fromBits(c16 << 16 | c00, c48 << 16 | c32);
}, goog.math.Long.prototype.subtract = function(other) {
    return this.add(other.negate());
}, goog.math.Long.prototype.multiply = function(other) {
    if (this.isZero()) return goog.math.Long.ZERO;
    if (other.isZero()) return goog.math.Long.ZERO;
    if (this.equals(goog.math.Long.MIN_VALUE)) return other.isOdd() ? goog.math.Long.MIN_VALUE : goog.math.Long.ZERO;
    if (other.equals(goog.math.Long.MIN_VALUE)) return this.isOdd() ? goog.math.Long.MIN_VALUE : goog.math.Long.ZERO;
    if (this.isNegative()) return other.isNegative() ? this.negate().multiply(other.negate()) : this.negate().multiply(other).negate();
    if (other.isNegative()) return this.multiply(other.negate()).negate();
    if (this.lessThan(goog.math.Long.TWO_PWR_24_) && other.lessThan(goog.math.Long.TWO_PWR_24_)) return goog.math.Long.fromNumber(this.toNumber() * other.toNumber());
    var a48 = this.high_ >>> 16, a32 = 65535 & this.high_, a16 = this.low_ >>> 16, a00 = 65535 & this.low_, b48 = other.high_ >>> 16, b32 = 65535 & other.high_, b16 = other.low_ >>> 16, b00 = 65535 & other.low_, c48 = 0, c32 = 0, c16 = 0, c00 = 0;
    return c00 += a00 * b00, c16 += c00 >>> 16, c00 &= 65535, c16 += a16 * b00, c32 += c16 >>> 16, 
    c16 &= 65535, c16 += a00 * b16, c32 += c16 >>> 16, c16 &= 65535, c32 += a32 * b00, 
    c48 += c32 >>> 16, c32 &= 65535, c32 += a16 * b16, c48 += c32 >>> 16, c32 &= 65535, 
    c32 += a00 * b32, c48 += c32 >>> 16, c32 &= 65535, c48 += a48 * b00 + a32 * b16 + a16 * b32 + a00 * b48, 
    c48 &= 65535, goog.math.Long.fromBits(c16 << 16 | c00, c48 << 16 | c32);
}, goog.math.Long.prototype.div = function(other) {
    if (other.isZero()) throw Error("division by zero");
    if (this.isZero()) return goog.math.Long.ZERO;
    if (this.equals(goog.math.Long.MIN_VALUE)) {
        if (other.equals(goog.math.Long.ONE) || other.equals(goog.math.Long.NEG_ONE)) return goog.math.Long.MIN_VALUE;
        if (other.equals(goog.math.Long.MIN_VALUE)) return goog.math.Long.ONE;
        var halfThis = this.shiftRight(1), approx = halfThis.div(other).shiftLeft(1);
        if (approx.equals(goog.math.Long.ZERO)) return other.isNegative() ? goog.math.Long.ONE : goog.math.Long.NEG_ONE;
        var rem = this.subtract(other.multiply(approx)), result = approx.add(rem.div(other));
        return result;
    }
    if (other.equals(goog.math.Long.MIN_VALUE)) return goog.math.Long.ZERO;
    if (this.isNegative()) return other.isNegative() ? this.negate().div(other.negate()) : this.negate().div(other).negate();
    if (other.isNegative()) return this.div(other.negate()).negate();
    for (var res = goog.math.Long.ZERO, rem = this; rem.greaterThanOrEqual(other); ) {
        for (var approx = Math.max(1, Math.floor(rem.toNumber() / other.toNumber())), log2 = Math.ceil(Math.log(approx) / Math.LN2), delta = 48 >= log2 ? 1 : Math.pow(2, log2 - 48), approxRes = goog.math.Long.fromNumber(approx), approxRem = approxRes.multiply(other); approxRem.isNegative() || approxRem.greaterThan(rem); ) approx -= delta, 
        approxRes = goog.math.Long.fromNumber(approx), approxRem = approxRes.multiply(other);
        approxRes.isZero() && (approxRes = goog.math.Long.ONE), res = res.add(approxRes), 
        rem = rem.subtract(approxRem);
    }
    return res;
}, goog.math.Long.prototype.modulo = function(other) {
    return this.subtract(this.div(other).multiply(other));
}, goog.math.Long.prototype.not = function() {
    return goog.math.Long.fromBits(~this.low_, ~this.high_);
}, goog.math.Long.prototype.and = function(other) {
    return goog.math.Long.fromBits(this.low_ & other.low_, this.high_ & other.high_);
}, goog.math.Long.prototype.or = function(other) {
    return goog.math.Long.fromBits(this.low_ | other.low_, this.high_ | other.high_);
}, goog.math.Long.prototype.xor = function(other) {
    return goog.math.Long.fromBits(this.low_ ^ other.low_, this.high_ ^ other.high_);
}, goog.math.Long.prototype.shiftLeft = function(numBits) {
    if (numBits &= 63, 0 == numBits) return this;
    var low = this.low_;
    if (32 > numBits) {
        var high = this.high_;
        return goog.math.Long.fromBits(low << numBits, high << numBits | low >>> 32 - numBits);
    }
    return goog.math.Long.fromBits(0, low << numBits - 32);
}, goog.math.Long.prototype.shiftRight = function(numBits) {
    if (numBits &= 63, 0 == numBits) return this;
    var high = this.high_;
    if (32 > numBits) {
        var low = this.low_;
        return goog.math.Long.fromBits(low >>> numBits | high << 32 - numBits, high >> numBits);
    }
    return goog.math.Long.fromBits(high >> numBits - 32, high >= 0 ? 0 : -1);
}, goog.math.Long.prototype.shiftRightUnsigned = function(numBits) {
    if (numBits &= 63, 0 == numBits) return this;
    var high = this.high_;
    if (32 > numBits) {
        var low = this.low_;
        return goog.math.Long.fromBits(low >>> numBits | high << 32 - numBits, high >>> numBits);
    }
    return 32 == numBits ? goog.math.Long.fromBits(high, 0) : goog.math.Long.fromBits(high >>> numBits - 32, 0);
};

var UTF8 = {};

UTF8.encode = function(s) {
    for (var u = [], i = 0; i < s.length; ++i) {
        var c = s.charCodeAt(i);
        128 > c ? u.push(c) : 2048 > c ? (u.push(192 | c >> 6), u.push(128 | 63 & c)) : 65536 > c ? (u.push(224 | c >> 12), 
        u.push(128 | 63 & c >> 6), u.push(128 | 63 & c)) : (u.push(240 | c >> 18), u.push(128 | 63 & c >> 12), 
        u.push(128 | 63 & c >> 6), u.push(128 | 63 & c));
    }
    return u;
}, UTF8.decode = function(u) {
    for (var a = [], i = 0; i < u.length; ) {
        var v = u[i++];
        128 > v || (224 > v ? (v = (31 & v) << 6, v |= 63 & u[i++]) : 240 > v ? (v = (15 & v) << 12, 
        v |= (63 & u[i++]) << 6, v |= 63 & u[i++]) : (v = (7 & v) << 18, v |= (63 & u[i++]) << 12, 
        v |= (63 & u[i++]) << 6, v |= 63 & u[i++])), a.push(String.fromCharCode(v));
    }
    return a.join("");
};

var BASE64 = {};

if (function(T) {
    var encodeArray = function(u) {
        for (var i = 0, a = [], n = 0 | u.length / 3; 0 < n--; ) {
            var v = (u[i] << 16) + (u[i + 1] << 8) + u[i + 2];
            i += 3, a.push(T.charAt(63 & v >> 18)), a.push(T.charAt(63 & v >> 12)), a.push(T.charAt(63 & v >> 6)), 
            a.push(T.charAt(63 & v));
        }
        if (2 == u.length - i) {
            var v = (u[i] << 16) + (u[i + 1] << 8);
            a.push(T.charAt(63 & v >> 18)), a.push(T.charAt(63 & v >> 12)), a.push(T.charAt(63 & v >> 6)), 
            a.push("=");
        } else if (1 == u.length - i) {
            var v = u[i] << 16;
            a.push(T.charAt(63 & v >> 18)), a.push(T.charAt(63 & v >> 12)), a.push("==");
        }
        return a.join("");
    }, R = function() {
        for (var a = [], i = 0; i < T.length; ++i) a[T.charCodeAt(i)] = i;
        return a["=".charCodeAt(0)] = 0, a;
    }(), decodeArray = function(s) {
        for (var i = 0, u = [], n = 0 | s.length / 4; 0 < n--; ) {
            var v = (R[s.charCodeAt(i)] << 18) + (R[s.charCodeAt(i + 1)] << 12) + (R[s.charCodeAt(i + 2)] << 6) + R[s.charCodeAt(i + 3)];
            u.push(255 & v >> 16), u.push(255 & v >> 8), u.push(255 & v), i += 4;
        }
        return u && ("=" == s.charAt(i - 2) ? (u.pop(), u.pop()) : "=" == s.charAt(i - 1) && u.pop()), 
        u;
    }, ASCII = {};
    ASCII.encode = function(s) {
        for (var u = [], i = 0; i < s.length; ++i) u.push(s.charCodeAt(i));
        return u;
    }, ASCII.decode = function() {
        for (var i = 0; i < s.length; ++i) a[i] = String.fromCharCode(a[i]);
        return a.join("");
    }, BASE64.decodeArray = function(s) {
        var u = decodeArray(s);
        return new Uint8Array(u);
    }, BASE64.encodeASCII = function(s) {
        var u = ASCII.encode(s);
        return encodeArray(u);
    }, BASE64.decodeASCII = function(s) {
        var a = decodeArray(s);
        return ASCII.decode(a);
    }, BASE64.encode = function(s) {
        var u = UTF8.encode(s);
        return encodeArray(u);
    }, BASE64.decode = function(s) {
        var u = decodeArray(s);
        return UTF8.decode(u);
    };
}("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"), void 0 === btoa) var btoa = BASE64.encode;

if (void 0 === atob) var atob = BASE64.decode;

MediaPlayer = function(aContext) {
    "use strict";
    var system, manifestLoader, abrController, element, source, streamController, rulesController, manifestUpdater, protectionController, metricsExt, metricsModel, videoModel, VERSION = "1.3.0 (refactor)", context = aContext, protectionData = null, initialized = !1, playing = !1, autoPlay = !0, scheduleWhilePaused = !1, bufferMax = MediaPlayer.dependencies.BufferController.BUFFER_SIZE_REQUIRED, isReady = function() {
        return !!element && !!source;
    }, play = function() {
        if (!initialized) throw "MediaPlayer not initialized!";
        if (!this.capabilities.supportsMediaSource()) return void this.errHandler.capabilityError("mediasource");
        if (!element || !source) throw "Missing view or source.";
        playing = !0, streamController = system.getObject("streamController"), streamController.subscribe(MediaPlayer.dependencies.StreamController.eventList.ENAME_STREAMS_COMPOSED, manifestUpdater), 
        manifestLoader.subscribe(MediaPlayer.dependencies.ManifestLoader.eventList.ENAME_MANIFEST_LOADED, streamController), 
        manifestLoader.subscribe(MediaPlayer.dependencies.ManifestLoader.eventList.ENAME_MANIFEST_LOADED, manifestUpdater), 
        streamController.setVideoModel(videoModel), streamController.setAutoPlay(autoPlay), 
        streamController.setProtectionData(protectionData), streamController.load(source), 
        system.mapValue("scheduleWhilePaused", scheduleWhilePaused), system.mapOutlet("scheduleWhilePaused", "stream"), 
        system.mapOutlet("scheduleWhilePaused", "scheduleController"), system.mapValue("bufferMax", bufferMax), 
        system.mapOutlet("bufferMax", "bufferController"), rulesController.initialize();
    }, doAutoPlay = function() {
        isReady() && play.call(this);
    }, getDVRInfoMetric = function() {
        var metric = metricsModel.getReadOnlyMetricsFor("video") || metricsModel.getReadOnlyMetricsFor("audio");
        return metricsExt.getCurrentDVRInfo(metric);
    }, getDVRWindowSize = function() {
        return getDVRInfoMetric.call(this).manifestInfo.DVRWindowSize;
    }, getDVRSeekOffset = function(value) {
        var metric = getDVRInfoMetric.call(this), val = metric.range.start + value;
        return val > metric.range.end && (val = metric.range.end), val;
    }, seek = function(value) {
        videoModel.getElement().currentTime = this.getDVRSeekOffset(value);
    }, time = function() {
        var metric = getDVRInfoMetric.call(this);
        return null === metric ? 0 : this.duration() - (metric.range.end - metric.time);
    }, duration = function() {
        var range, metric = getDVRInfoMetric.call(this);
        return null === metric ? 0 : (range = metric.range.end - metric.range.start, range < metric.manifestInfo.DVRWindowSize ? range : metric.manifestInfo.DVRWindowSize);
    }, timeAsUTC = function() {
        var availableFrom, currentUTCTime, metric = getDVRInfoMetric.call(this);
        return null === metric ? 0 : (availableFrom = metric.manifestInfo.availableFrom.getTime() / 1e3, 
        currentUTCTime = this.time() + (availableFrom + metric.range.start));
    }, durationAsUTC = function() {
        var availableFrom, currentUTCDuration, metric = getDVRInfoMetric.call(this);
        return null === metric ? 0 : (availableFrom = metric.manifestInfo.availableFrom.getTime() / 1e3, 
        currentUTCDuration = availableFrom + metric.range.start + this.duration());
    }, formatUTC = function(time, locales, hour12) {
        var dt = new Date(1e3 * time), d = dt.toLocaleDateString(locales), t = dt.toLocaleTimeString(locales, {
            hour12: hour12
        });
        return t + " " + d;
    }, convertToTimeCode = function(value) {
        value = Math.max(value, 0);
        var h = Math.floor(value / 3600), m = Math.floor(value % 3600 / 60), s = Math.floor(value % 3600 % 60);
        return (0 === h ? "" : 10 > h ? "0" + h.toString() + ":" : h.toString() + ":") + (10 > m ? "0" + m.toString() : m.toString()) + ":" + (10 > s ? "0" + s.toString() : s.toString());
    }, updateRules = function(type, rules, override) {
        rules && void 0 !== type && null !== type && (override ? rulesController.setRules(type, rules) : rulesController.addRules(type, rules));
    }, doReset = function() {
        playing && streamController && (streamController.unsubscribe(MediaPlayer.dependencies.StreamController.eventList.ENAME_STREAMS_COMPOSED, manifestUpdater), 
        manifestLoader.unsubscribe(MediaPlayer.dependencies.ManifestLoader.eventList.ENAME_MANIFEST_LOADED, streamController), 
        manifestLoader.unsubscribe(MediaPlayer.dependencies.ManifestLoader.eventList.ENAME_MANIFEST_LOADED, manifestUpdater), 
        streamController.reset(), abrController.reset(), rulesController.reset(), streamController = null, 
        playing = !1);
    };
    return system = new dijon.System(), system.mapValue("system", system), system.mapOutlet("system"), 
    system.injectInto(context), {
        notifier: void 0,
        debug: void 0,
        eventBus: void 0,
        capabilities: void 0,
        adapter: void 0,
        errHandler: void 0,
        uriQueryFragModel: void 0,
        videoElementExt: void 0,
        setup: function() {
            metricsExt = system.getObject("metricsExt"), manifestLoader = system.getObject("manifestLoader"), 
            manifestUpdater = system.getObject("manifestUpdater"), abrController = system.getObject("abrController"), 
            rulesController = system.getObject("rulesController"), metricsModel = system.getObject("metricsModel"), 
            protectionController = system.getObject("protectionController");
        },
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
            initialized || (system.injectInto(this), initialized = !0);
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
        setBearerToken: function(keySystem, value) {
            protectionController.setBearerToken({
                keySystem: keySystem,
                token: value
            });
        },
        setBufferMax: function(value) {
            bufferMax = value;
        },
        getBufferMax: function() {
            return bufferMax;
        },
        getMetricsExt: function() {
            return metricsExt;
        },
        getMetricsFor: function(type) {
            var metrics = metricsModel.getReadOnlyMetricsFor(type);
            return metrics;
        },
        getQualityFor: function(type) {
            return abrController.getQualityFor(type, streamController.getActiveStreamInfo());
        },
        setQualityFor: function(type, value) {
            abrController.setPlaybackQuality(type, streamController.getActiveStreamInfo(), value);
        },
        getAutoSwitchQuality: function() {
            return abrController.getAutoSwitchBitrate();
        },
        setAutoSwitchQuality: function(value) {
            abrController.setAutoSwitchBitrate(value);
        },
        setSchedulingRules: function(newRulesCollection) {
            updateRules.call(this, rulesController.SCHEDULING_RULE, newRulesCollection, !0);
        },
        addSchedulingRules: function(newRulesCollection) {
            updateRules.call(this, rulesController.SCHEDULING_RULE, newRulesCollection, !1);
        },
        setABRRules: function(newRulesCollection) {
            updateRules.call(this, rulesController.ABR_RULE, newRulesCollection, !0);
        },
        addABRRules: function(newRulesCollection) {
            updateRules.call(this, rulesController.ABR_RULE, newRulesCollection, !1);
        },
        attachView: function(view) {
            if (!initialized) throw "MediaPlayer not initialized!";
            element = view, videoModel = null, element && (videoModel = system.getObject("videoModel"), 
            videoModel.setElement(element)), doReset.call(this), isReady.call(this) && doAutoPlay.call(this);
        },
        attachSource: function(url) {
            if (!initialized) throw "MediaPlayer not initialized!";
            this.uriQueryFragModel.reset(), source = this.uriQueryFragModel.parseURI(url), doReset.call(this), 
            isReady.call(this) && doAutoPlay.call(this);
        },
        attachProtectionData: function(data) {
            protectionData = data;
        },
        reset: function() {
            this.attachSource(null), this.attachView(null);
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
}, MediaPlayer.prototype = {
    constructor: MediaPlayer
}, MediaPlayer.dependencies = {}, MediaPlayer.utils = {}, MediaPlayer.models = {}, 
MediaPlayer.vo = {}, MediaPlayer.vo.metrics = {}, MediaPlayer.rules = {}, MediaPlayer.di = {}, 
MediaPlayer.di.Context = function() {
    "use strict";
    return {
        system: void 0,
        setup: function() {
            this.system.autoMapOutlets = !0, this.system.mapSingleton("debug", MediaPlayer.utils.Debug), 
            this.system.mapSingleton("eventBus", MediaPlayer.utils.EventBus), this.system.mapSingleton("capabilities", MediaPlayer.utils.Capabilities), 
            this.system.mapSingleton("textTrackExtensions", MediaPlayer.utils.TextTrackExtensions), 
            this.system.mapSingleton("vttParser", MediaPlayer.utils.VTTParser), this.system.mapSingleton("ttmlParser", MediaPlayer.utils.TTMLParser), 
            this.system.mapClass("videoModel", MediaPlayer.models.VideoModel), this.system.mapSingleton("manifestModel", MediaPlayer.models.ManifestModel), 
            this.system.mapSingleton("metricsModel", MediaPlayer.models.MetricsModel), this.system.mapSingleton("uriQueryFragModel", MediaPlayer.models.URIQueryAndFragmentModel), 
            this.system.mapClass("protectionModel", MediaPlayer.models.ProtectionModel), this.system.mapSingleton("requestModifierExt", MediaPlayer.dependencies.RequestModifierExtensions), 
            this.system.mapSingleton("textSourceBuffer", MediaPlayer.dependencies.TextSourceBuffer), 
            this.system.mapSingleton("mediaSourceExt", MediaPlayer.dependencies.MediaSourceExtensions), 
            this.system.mapSingleton("sourceBufferExt", MediaPlayer.dependencies.SourceBufferExtensions), 
            this.system.mapSingleton("abrController", MediaPlayer.dependencies.AbrController), 
            this.system.mapSingleton("errHandler", MediaPlayer.dependencies.ErrorHandler), this.system.mapSingleton("protectionExt", MediaPlayer.dependencies.ProtectionExtensions), 
            this.system.mapSingleton("videoExt", MediaPlayer.dependencies.VideoModelExtensions), 
            this.system.mapSingleton("protectionController", MediaPlayer.dependencies.ProtectionController), 
            this.system.mapClass("playbackController", MediaPlayer.dependencies.PlaybackController), 
            this.system.mapSingleton("liveEdgeFinder", MediaPlayer.dependencies.LiveEdgeFinder), 
            this.system.mapClass("metrics", MediaPlayer.models.MetricsList), this.system.mapClass("downloadRatioRule", MediaPlayer.rules.DownloadRatioRule), 
            this.system.mapClass("insufficientBufferRule", MediaPlayer.rules.InsufficientBufferRule), 
            this.system.mapClass("limitSwitchesRule", MediaPlayer.rules.LimitSwitchesRule), 
            this.system.mapSingleton("abrRulesCollection", MediaPlayer.rules.ABRRulesCollection), 
            this.system.mapSingleton("rulesController", MediaPlayer.rules.RulesController), 
            this.system.mapClass("liveEdgeBinarySearchRule", MediaPlayer.rules.LiveEdgeBinarySearchRule), 
            this.system.mapClass("liveEdgeBBCSearchRule", MediaPlayer.rules.LiveEdgeBBCSearchRule), 
            this.system.mapClass("bufferLevelRule", MediaPlayer.rules.BufferLevelRule), this.system.mapClass("pendingRequestsRule", MediaPlayer.rules.PendingRequestsRule), 
            this.system.mapClass("playbackTimeRule", MediaPlayer.rules.PlaybackTimeRule), this.system.mapClass("sameTimeRequestRule", MediaPlayer.rules.SameTimeRequestRule), 
            this.system.mapSingleton("scheduleRulesCollection", MediaPlayer.rules.ScheduleRulesCollection), 
            this.system.mapClass("streamProcessor", MediaPlayer.dependencies.StreamProcessor), 
            this.system.mapClass("eventController", MediaPlayer.dependencies.EventController), 
            this.system.mapClass("textController", MediaPlayer.dependencies.TextController), 
            this.system.mapClass("bufferController", MediaPlayer.dependencies.BufferController), 
            this.system.mapSingleton("manifestLoader", MediaPlayer.dependencies.ManifestLoader), 
            this.system.mapSingleton("manifestUpdater", MediaPlayer.dependencies.ManifestUpdater), 
            this.system.mapClass("fragmentController", MediaPlayer.dependencies.FragmentController), 
            this.system.mapClass("fragmentLoader", MediaPlayer.dependencies.FragmentLoader), 
            this.system.mapClass("fragmentModel", MediaPlayer.dependencies.FragmentModel), this.system.mapSingleton("streamController", MediaPlayer.dependencies.StreamController), 
            this.system.mapClass("stream", MediaPlayer.dependencies.Stream), this.system.mapClass("scheduleController", MediaPlayer.dependencies.ScheduleController), 
            this.system.mapSingleton("notifier", MediaPlayer.dependencies.Notifier);
        }
    };
}, Dash = function() {
    "use strict";
    return {
        modules: {},
        dependencies: {},
        vo: {},
        di: {}
    };
}(), Dash.di.DashContext = function() {
    "use strict";
    return {
        system: void 0,
        setup: function() {
            Dash.di.DashContext.prototype.setup.call(this), this.system.mapClass("parser", Dash.dependencies.DashParser), 
            this.system.mapClass("indexHandler", Dash.dependencies.DashHandler), this.system.mapSingleton("baseURLExt", Dash.dependencies.BaseURLExtensions), 
            this.system.mapClass("fragmentExt", Dash.dependencies.FragmentExtensions), this.system.mapClass("trackController", Dash.dependencies.RepresentationController), 
            this.system.mapSingleton("manifestExt", Dash.dependencies.DashManifestExtensions), 
            this.system.mapSingleton("metricsExt", Dash.dependencies.DashMetricsExtensions), 
            this.system.mapSingleton("timelineConverter", Dash.dependencies.TimelineConverter), 
            this.system.mapSingleton("adapter", Dash.dependencies.DashAdapter);
        }
    };
}, Dash.di.DashContext.prototype = new MediaPlayer.di.Context(), Dash.di.DashContext.prototype.constructor = Dash.di.DashContext, 
Dash.dependencies.BaseURLExtensions = function() {
    "use strict";
    var parseSIDX = function(ab, ab_first_byte_offset) {
        for (var offset, time, sidxEnd, i, ref_type, ref_size, ref_dur, type, size, charCode, d = new DataView(ab), sidx = {}, pos = 0; "sidx" !== type && pos < d.byteLength; ) {
            for (size = d.getUint32(pos), pos += 4, type = "", i = 0; 4 > i; i += 1) charCode = d.getInt8(pos), 
            type += String.fromCharCode(charCode), pos += 1;
            "moof" !== type && "traf" !== type && "sidx" !== type ? pos += size - 8 : "sidx" === type && (pos -= 8);
        }
        if (sidxEnd = d.getUint32(pos, !1) + pos, sidxEnd > ab.byteLength) throw "sidx terminates after array buffer";
        for (sidx.version = d.getUint8(pos + 8), pos += 12, sidx.timescale = d.getUint32(pos + 4, !1), 
        pos += 8, 0 === sidx.version ? (sidx.earliest_presentation_time = d.getUint32(pos, !1), 
        sidx.first_offset = d.getUint32(pos + 4, !1), pos += 8) : (sidx.earliest_presentation_time = utils.Math.to64BitNumber(d.getUint32(pos + 4, !1), d.getUint32(pos, !1)), 
        sidx.first_offset = (d.getUint32(pos + 8, !1) << 32) + d.getUint32(pos + 12, !1), 
        pos += 16), sidx.first_offset += sidxEnd + (ab_first_byte_offset || 0), sidx.reference_count = d.getUint16(pos + 2, !1), 
        pos += 4, sidx.references = [], offset = sidx.first_offset, time = sidx.earliest_presentation_time, 
        i = 0; i < sidx.reference_count; i += 1) ref_size = d.getUint32(pos, !1), ref_type = ref_size >>> 31, 
        ref_size = 2147483647 & ref_size, ref_dur = d.getUint32(pos + 4, !1), pos += 12, 
        sidx.references.push({
            size: ref_size,
            type: ref_type,
            offset: offset,
            duration: ref_dur,
            time: time,
            timescale: sidx.timescale
        }), offset += ref_size, time += ref_dur;
        if (pos !== sidxEnd) throw "Error: final pos " + pos + " differs from SIDX end " + sidxEnd;
        return sidx;
    }, parseSegments = function(data, media, offset) {
        var parsed, ref, segments, segment, i, len, start, end;
        for (parsed = parseSIDX.call(this, data, offset), ref = parsed.references, segments = [], 
        i = 0, len = ref.length; len > i; i += 1) segment = new Dash.vo.Segment(), segment.duration = ref[i].duration, 
        segment.media = media, segment.startTime = ref[i].time, segment.timescale = ref[i].timescale, 
        start = ref[i].offset, end = ref[i].offset + ref[i].size - 1, segment.mediaRange = start + "-" + end, 
        segments.push(segment);
        return this.debug.log("Parsed SIDX box: " + segments.length + " segments."), segments;
    }, findInit = function(data, info, callback) {
        var ftyp, moov, start, end, bytesAvailable, i, c, request, irange, d = new DataView(data), pos = 0, type = "", size = 0, loaded = !1, self = this;
        for (self.debug.log("Searching for initialization."); "moov" !== type && pos < d.byteLength; ) {
            for (size = d.getUint32(pos), pos += 4, type = "", i = 0; 4 > i; i += 1) c = d.getInt8(pos), 
            type += String.fromCharCode(c), pos += 1;
            "ftyp" === type && (ftyp = pos - 8), "moov" === type && (moov = pos - 8), "moov" !== type && (pos += size - 8);
        }
        bytesAvailable = d.byteLength - pos, "moov" !== type ? (self.debug.log("Loading more bytes to find initialization."), 
        info.range.start = 0, info.range.end = info.bytesLoaded + info.bytesToLoad, request = new XMLHttpRequest(), 
        request.onloadend = function() {
            loaded || callback.call(self, null, new Error("Error loading initialization."));
        }, request.onload = function() {
            loaded = !0, info.bytesLoaded = info.range.end, findInit.call(self, request.response, function(segments) {
                callback.call(self, segments);
            });
        }, request.onerror = function() {
            callback.call(self, null, new Error("Error loading initialization."));
        }, request.open("GET", self.requestModifierExt.modifyRequestURL(info.url)), request.responseType = "arraybuffer", 
        request.setRequestHeader("Range", "bytes=" + info.range.start + "-" + info.range.end), 
        request = self.requestModifierExt.modifyRequestHeader(request), request.send(null)) : (start = void 0 === ftyp ? moov : ftyp, 
        end = moov + size - 1, irange = start + "-" + end, self.debug.log("Found the initialization.  Range: " + irange), 
        callback.call(self, irange));
    }, loadInit = function(representation) {
        var request = new XMLHttpRequest(), needFailureReport = !0, self = this, media = representation.adaptation.period.mpd.manifest.Period_asArray[representation.adaptation.period.index].AdaptationSet_asArray[representation.adaptation.index].Representation_asArray[representation.index].BaseURL, info = {
            url: media,
            range: {},
            searching: !1,
            bytesLoaded: 0,
            bytesToLoad: 1500,
            request: request
        };
        self.debug.log("Start searching for initialization."), info.range.start = 0, info.range.end = info.bytesToLoad, 
        request.onload = function() {
            request.status < 200 || request.status > 299 || (needFailureReport = !1, info.bytesLoaded = info.range.end, 
            findInit.call(self, request.response, info, function(range) {
                representation.range = range, representation.initialization = media, self.notify(Dash.dependencies.BaseURLExtensions.eventList.ENAME_INITIALIZATION_LOADED, {
                    representation: representation
                });
            }));
        }, request.onloadend = request.onerror = function() {
            needFailureReport && (needFailureReport = !1, self.errHandler.downloadError("initialization", info.url, request), 
            self.notify(Dash.dependencies.BaseURLExtensions.eventList.ENAME_INITIALIZATION_LOADED, {
                representation: representation
            }));
        }, request.open("GET", self.requestModifierExt.modifyRequestURL(info.url)), request.responseType = "arraybuffer", 
        request.setRequestHeader("Range", "bytes=" + info.range.start + "-" + info.range.end), 
        request = self.requestModifierExt.modifyRequestHeader(request), request.send(null), 
        self.debug.log("Perform init search: " + info.url);
    }, findSIDX = function(data, info, representation, callback) {
        var segments, bytesAvailable, sidxBytes, sidxSlice, sidxOut, i, c, parsed, ref, d = new DataView(data), request = new XMLHttpRequest(), pos = 0, type = "", size = 0, needFailureReport = !0, loadMultiSidx = !1, self = this;
        for (self.debug.log("Searching for SIDX box."), self.debug.log(info.bytesLoaded + " bytes loaded."); "sidx" !== type && pos < d.byteLength; ) {
            for (size = d.getUint32(pos), pos += 4, type = "", i = 0; 4 > i; i += 1) c = d.getInt8(pos), 
            type += String.fromCharCode(c), pos += 1;
            "sidx" !== type && (pos += size - 8);
        }
        if (bytesAvailable = d.byteLength - pos, "sidx" !== type) callback.call(self); else if (size - 8 > bytesAvailable) self.debug.log("Found SIDX but we don't have all of it."), 
        info.range.start = 0, info.range.end = info.bytesLoaded + (size - bytesAvailable), 
        request.onload = function() {
            request.status < 200 || request.status > 299 || (needFailureReport = !1, info.bytesLoaded = info.range.end, 
            findSIDX.call(self, request.response, info, representation, callback));
        }, request.onloadend = request.onerror = function() {
            needFailureReport && (needFailureReport = !1, self.errHandler.downloadError("SIDX", info.url, request), 
            callback.call(self));
        }, request.open("GET", self.requestModifierExt.modifyRequestURL(info.url)), request.responseType = "arraybuffer", 
        request.setRequestHeader("Range", "bytes=" + info.range.start + "-" + info.range.end), 
        request = self.requestModifierExt.modifyRequestHeader(request), request.send(null); else if (info.range.start = pos - 8, 
        info.range.end = info.range.start + size, self.debug.log("Found the SIDX box.  Start: " + info.range.start + " | End: " + info.range.end), 
        sidxBytes = new ArrayBuffer(info.range.end - info.range.start), sidxOut = new Uint8Array(sidxBytes), 
        sidxSlice = new Uint8Array(data, info.range.start, info.range.end - info.range.start), 
        sidxOut.set(sidxSlice), parsed = this.parseSIDX.call(this, sidxBytes, info.range.start), 
        ref = parsed.references, null !== ref && void 0 !== ref && ref.length > 0 && (loadMultiSidx = 1 === ref[0].type), 
        loadMultiSidx) {
            self.debug.log("Initiate multiple SIDX load.");
            var j, len, ss, se, r, segs = [], count = 0, tmpCallback = function(segments) {
                segments ? (segs = segs.concat(segments), count += 1, count >= len && callback.call(self, segs)) : callback.call(self);
            };
            for (j = 0, len = ref.length; len > j; j += 1) ss = ref[j].offset, se = ref[j].offset + ref[j].size - 1, 
            r = ss + "-" + se, loadSegments.call(self, representation, null, r, tmpCallback);
        } else self.debug.log("Parsing segments from SIDX."), segments = parseSegments.call(self, sidxBytes, info.url, info.range.start), 
        callback.call(self, segments);
    }, loadSegments = function(representation, type, theRange, callback) {
        var segments, parts, request = new XMLHttpRequest(), media = representation.adaptation.period.mpd.manifest.Period_asArray[representation.adaptation.period.index].AdaptationSet_asArray[representation.adaptation.index].Representation_asArray[representation.index].BaseURL, needFailureReport = !0, self = this, info = {
            url: media,
            range: {},
            searching: !1,
            bytesLoaded: 0,
            bytesToLoad: 1500,
            request: request
        };
        null === theRange ? (self.debug.log("No known range for SIDX request."), info.searching = !0, 
        info.range.start = 0, info.range.end = info.bytesToLoad) : (parts = theRange.split("-"), 
        info.range.start = parseFloat(parts[0]), info.range.end = parseFloat(parts[1])), 
        request.onload = function() {
            request.status < 200 || request.status > 299 || (needFailureReport = !1, info.searching ? (info.bytesLoaded = info.range.end, 
            findSIDX.call(self, request.response, info, representation, function(segments) {
                segments && callback.call(self, segments, representation, type);
            })) : (segments = parseSegments.call(self, request.response, info.url, info.range.start), 
            callback.call(self, segments, representation, type)));
        }, request.onloadend = request.onerror = function() {
            needFailureReport && (needFailureReport = !1, self.errHandler.downloadError("SIDX", info.url, request), 
            callback.call(self, null, representation, type));
        }, request.open("GET", self.requestModifierExt.modifyRequestURL(info.url)), request.responseType = "arraybuffer", 
        request.setRequestHeader("Range", "bytes=" + info.range.start + "-" + info.range.end), 
        request = self.requestModifierExt.modifyRequestHeader(request), request.send(null), 
        self.debug.log("Perform SIDX load: " + info.url);
    }, onLoaded = function(segments, representation, type) {
        var self = this;
        segments ? self.notify(Dash.dependencies.BaseURLExtensions.eventList.ENAME_SEGMENTS_LOADED, {
            segments: segments,
            representation: representation,
            mediaType: type
        }) : self.notify(Dash.dependencies.BaseURLExtensions.eventList.ENAME_SEGMENTS_LOADED, {
            segments: null,
            representation: representation,
            mediaType: type
        }, new MediaPlayer.vo.Error(null, "error loading segments", null));
    };
    return {
        debug: void 0,
        errHandler: void 0,
        requestModifierExt: void 0,
        notify: void 0,
        subscribe: void 0,
        unsubscribe: void 0,
        loadSegments: function(representation, type, range) {
            loadSegments.call(this, representation, type, range, onLoaded.bind(this));
        },
        loadInitialization: loadInit,
        parseSegments: parseSegments,
        parseSIDX: parseSIDX,
        findSIDX: findSIDX
    };
}, Dash.dependencies.BaseURLExtensions.prototype = {
    constructor: Dash.dependencies.BaseURLExtensions
}, Dash.dependencies.BaseURLExtensions.eventList = {
    ENAME_INITIALIZATION_LOADED: "initializationLoaded",
    ENAME_SEGMENTS_LOADED: "segmentsLoaded"
}, Dash.dependencies.DashAdapter = function() {
    "use strict";
    var periods = [], adaptations = {}, getRepresentationForTrackInfo = function(trackInfo, representationController) {
        return representationController.getRepresentationForQuality(trackInfo.quality);
    }, getAdaptationForMediaInfo = function(mediaInfo) {
        return adaptations[mediaInfo.streamInfo.id][mediaInfo.index];
    }, getPeriodForStreamInfo = function(streamInfo) {
        var period, ln = periods.length, i = 0;
        for (i; ln > i; i += 1) if (period = periods[i], streamInfo.id === period.id) return period;
        return null;
    }, convertRepresentationToTrackInfo = function(representation) {
        var trackInfo = new MediaPlayer.vo.TrackInfo(), a = representation.adaptation.period.mpd.manifest.Period_asArray[representation.adaptation.period.index].AdaptationSet_asArray[representation.adaptation.index], r = this.manifestExt.getRepresentationFor(representation.index, a);
        return trackInfo.id = representation.id, trackInfo.quality = representation.index, 
        trackInfo.bandwidth = this.manifestExt.getBandwidth(r), trackInfo.DVRWindow = representation.segmentAvailabilityRange, 
        trackInfo.fragmentDuration = representation.segmentDuration || (representation.segments && representation.segments.length > 0 ? representation.segments[0].duration : 0/0), 
        trackInfo.MSETimeOffset = representation.MSETimeOffset, trackInfo.useCalculatedLiveEdgeTime = representation.useCalculatedLiveEdgeTime, 
        trackInfo.mediaInfo = convertAdaptationToMediaInfo.call(this, representation.adaptation), 
        trackInfo;
    }, convertAdaptationToMediaInfo = function(adaptation) {
        var mediaInfo = new MediaPlayer.vo.MediaInfo(), self = this, a = adaptation.period.mpd.manifest.Period_asArray[adaptation.period.index].AdaptationSet_asArray[adaptation.index];
        return mediaInfo.id = adaptation.id, mediaInfo.index = adaptation.index, mediaInfo.type = adaptation.type, 
        mediaInfo.streamInfo = convertPeriodToStreamInfo.call(this, adaptation.period), 
        mediaInfo.trackCount = this.manifestExt.getRepresentationCount(a), mediaInfo.lang = this.manifestExt.getLanguageForAdaptation(a), 
        mediaInfo.codec = this.manifestExt.getCodec(a), mediaInfo.mimeType = this.manifestExt.getMimeType(a), 
        mediaInfo.contentProtection = this.manifestExt.getContentProtectionData(a), mediaInfo.contentProtection && mediaInfo.contentProtection.forEach(function(item) {
            item.KID = self.manifestExt.getKID(item);
        }), mediaInfo.isText = this.manifestExt.getIsTextTrack(mediaInfo.mimeType), mediaInfo;
    }, convertPeriodToStreamInfo = function(period) {
        var streamInfo = new MediaPlayer.vo.StreamInfo(), THRESHOLD = 1;
        return streamInfo.id = period.id, streamInfo.index = period.index, streamInfo.start = period.start, 
        streamInfo.duration = period.duration, streamInfo.manifestInfo = convertMpdToManifestInfo.call(this, period.mpd), 
        streamInfo.isLast = Math.abs(streamInfo.start + streamInfo.duration - streamInfo.manifestInfo.duration) < THRESHOLD, 
        streamInfo;
    }, convertMpdToManifestInfo = function(mpd) {
        var manifestInfo = new MediaPlayer.vo.ManifestInfo(), manifest = this.manifestModel.getValue();
        return manifestInfo.DVRWindowSize = mpd.timeShiftBufferDepth, manifestInfo.loadedTime = mpd.manifest.loadedTime, 
        manifestInfo.availableFrom = mpd.availabilityStartTime, manifestInfo.minBufferTime = mpd.manifest.minBufferTime, 
        manifestInfo.maxFragmentDuration = mpd.maxSegmentDuration, manifestInfo.duration = this.manifestExt.getDuration(manifest), 
        manifestInfo.isDynamic = this.manifestExt.getIsDynamic(manifest), manifestInfo;
    }, getMediaInfoForType = function(manifest, streamInfo, type) {
        var idx, periodInfo = getPeriodForStreamInfo(streamInfo), periodId = periodInfo.id, data = this.manifestExt.getAdaptationForType(manifest, streamInfo.index, type);
        return data ? (idx = this.manifestExt.getIndexForAdaptation(data, manifest, streamInfo.index), 
        adaptations[periodId] = adaptations[periodId] || this.manifestExt.getAdaptationsForPeriod(manifest, periodInfo), 
        convertAdaptationToMediaInfo.call(this, adaptations[periodId][idx])) : null;
    }, getStreamsInfoFromManifest = function(manifest) {
        var mpd, ln, i, streams = [];
        if (!manifest) return null;
        for (mpd = this.manifestExt.getMpd(manifest), periods = this.manifestExt.getRegularPeriods(manifest, mpd), 
        adaptations = {}, ln = periods.length, i = 0; ln > i; i += 1) streams.push(convertPeriodToStreamInfo.call(this, periods[i]));
        return streams;
    }, getMpdInfo = function(manifest) {
        var mpd = this.manifestExt.getMpd(manifest);
        return convertMpdToManifestInfo.call(this, mpd);
    }, getInitRequest = function(streamProcessor, quality) {
        var representation = streamProcessor.trackController.getRepresentationForQuality(quality);
        return streamProcessor.indexHandler.getInitRequest(representation);
    }, getNextFragmentRequest = function(streamProcessor, trackInfo) {
        var representation = getRepresentationForTrackInfo(trackInfo, streamProcessor.trackController);
        return streamProcessor.indexHandler.getNextSegmentRequest(representation);
    }, getFragmentRequestForTime = function(streamProcessor, trackInfo, time, keepIdx) {
        var representation = getRepresentationForTrackInfo(trackInfo, streamProcessor.trackController);
        return streamProcessor.indexHandler.getSegmentRequestForTime(representation, time, keepIdx);
    }, generateFragmentRequestForTime = function(streamProcessor, trackInfo, time) {
        var representation = getRepresentationForTrackInfo(trackInfo, streamProcessor.trackController), request = streamProcessor.indexHandler.generateSegmentRequestForTime(representation, time);
        return request;
    }, getIndexHandlerTime = function(streamProcessor) {
        return streamProcessor.indexHandler.getCurrentTime();
    }, setIndexHandlerTime = function(streamProcessor, value) {
        return streamProcessor.indexHandler.setCurrentTime(value);
    }, updateData = function(streamProcessor) {
        var id, data, periodInfo = getPeriodForStreamInfo(streamProcessor.getStreamInfo()), mediaInfo = streamProcessor.getMediaInfo(), adaptation = getAdaptationForMediaInfo(mediaInfo), manifest = this.manifestModel.getValue(), type = streamProcessor.getType();
        id = mediaInfo.id, data = id ? this.manifestExt.getAdaptationForId(id, manifest, periodInfo.index) : this.manifestExt.getAdaptationForIndex(mediaInfo.index, manifest, periodInfo.index), 
        streamProcessor.setMediaInfo(mediaInfo), streamProcessor.trackController.updateData(data, adaptation, type);
    }, getTrackInfoForQuality = function(representationController, quality) {
        var representation = representationController.getRepresentationForQuality(quality);
        return representation ? convertRepresentationToTrackInfo.call(this, representation) : null;
    }, getCurrentTrackInfo = function(representationController) {
        var representation = representationController.getCurrentRepresentation();
        return representation ? convertRepresentationToTrackInfo.call(this, representation) : null;
    }, getEvent = function(eventBox, eventStreams, startTime) {
        var event = new Dash.vo.Event(), schemeIdUri = eventBox[0], value = eventBox[1], timescale = eventBox[2], presentationTimeDelta = eventBox[3], duration = eventBox[4], id = eventBox[5], messageData = eventBox[6], presentationTime = startTime * timescale + presentationTimeDelta;
        return eventStreams[schemeIdUri] ? (event.eventStream = eventStreams[schemeIdUri], 
        event.eventStream.value = value, event.eventStream.timescale = timescale, event.duration = duration, 
        event.id = id, event.presentationTime = presentationTime, event.messageData = messageData, 
        event.presentationTimeDelta = presentationTimeDelta, event) : null;
    }, getEventsFor = function(info, streamProcessor) {
        var manifest = this.manifestModel.getValue(), events = [];
        return info instanceof MediaPlayer.vo.StreamInfo ? events = this.manifestExt.getEventsForPeriod(manifest, getPeriodForStreamInfo(info)) : info instanceof MediaPlayer.vo.MediaInfo ? events = this.manifestExt.getEventStreamForAdaptationSet(manifest, getAdaptationForMediaInfo(info)) : info instanceof MediaPlayer.vo.TrackInfo && (events = this.manifestExt.getEventStreamForRepresentation(manifest, getRepresentationForTrackInfo(info, streamProcessor.trackController))), 
        events;
    };
    return {
        system: void 0,
        manifestExt: void 0,
        manifestModel: void 0,
        timelineConverter: void 0,
        metricsList: {
            TCP_CONNECTION: "TcpConnection",
            HTTP_REQUEST: "HttpRequest",
            HTTP_REQUEST_TRACE: "HttpRequestTrace",
            TRACK_SWITCH: "RepresentationSwitch",
            BUFFER_LEVEL: "BufferLevel",
            DVR_INFO: "DVRInfo",
            DROPPED_FRAMES: "DroppedFrames",
            SCHEDULING_INFO: "SchedulingInfo",
            MANIFEST_UPDATE: "ManifestUpdate",
            MANIFEST_UPDATE_STREAM_INFO: "ManifestUpdatePeriodInfo",
            MANIFEST_UPDATE_TRACK_INFO: "ManifestUpdateRepresentationInfo",
            PLAY_LIST: "PlayList",
            PLAY_LIST_TRACE: "PlayListTrace"
        },
        convertDataToTrack: convertRepresentationToTrackInfo,
        convertDataToMedia: convertAdaptationToMediaInfo,
        convertDataToStream: convertPeriodToStreamInfo,
        getDataForTrack: getRepresentationForTrackInfo,
        getDataForMedia: getAdaptationForMediaInfo,
        getDataForStream: getPeriodForStreamInfo,
        getStreamsInfo: getStreamsInfoFromManifest,
        getManifestInfo: getMpdInfo,
        getMediaInfoForType: getMediaInfoForType,
        getCurrentTrackInfo: getCurrentTrackInfo,
        getTrackInfoForQuality: getTrackInfoForQuality,
        updateData: updateData,
        getInitRequest: getInitRequest,
        getNextFragmentRequest: getNextFragmentRequest,
        getFragmentRequestForTime: getFragmentRequestForTime,
        generateFragmentRequestForTime: generateFragmentRequestForTime,
        getIndexHandlerTime: getIndexHandlerTime,
        setIndexHandlerTime: setIndexHandlerTime,
        getEventsFor: getEventsFor,
        getEvent: getEvent,
        reset: function() {
            periods = [], adaptations = {};
        }
    };
}, Dash.dependencies.DashAdapter.prototype = {
    constructor: Dash.dependencies.DashAdapter
}, Dash.dependencies.DashHandler = function() {
    "use strict";
    var requestedTime, isDynamic, type, index = -1, currentTime = 0, absUrl = new RegExp("^(?:(?:[a-z]+:)?/)?/", "i"), zeroPadToLength = function(numStr, minStrLength) {
        for (;numStr.length < minStrLength; ) numStr = "0" + numStr;
        return numStr;
    }, replaceTokenForTemplate = function(url, token, value) {
        for (var formatTagPos, specifier, width, paddedValue, startPos = 0, endPos = 0, tokenLen = token.length, formatTag = "%0", formatTagLen = formatTag.length; ;) {
            if (startPos = url.indexOf("$" + token), 0 > startPos) return url;
            if (endPos = url.indexOf("$", startPos + tokenLen), 0 > endPos) return url;
            if (formatTagPos = url.indexOf(formatTag, startPos + tokenLen), formatTagPos > startPos && endPos > formatTagPos) switch (specifier = url.charAt(endPos - 1), 
            width = parseInt(url.substring(formatTagPos + formatTagLen, endPos - 1), 10), specifier) {
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
                return this.debug.log("Unsupported/invalid IEEE 1003.1 format identifier string in URL"), 
                url;
            } else paddedValue = value;
            url = url.substring(0, startPos) + paddedValue + url.substring(endPos + 1);
        }
    }, unescapeDollarsInTemplate = function(url) {
        return url.split("$$").join("$");
    }, replaceIDForTemplate = function(url, value) {
        if (null === value || -1 === url.indexOf("$RepresentationID$")) return url;
        var v = value.toString();
        return url.split("$RepresentationID$").join(v);
    }, getNumberForSegment = function(segment, segmentIndex) {
        return segment.representation.startNumber + segmentIndex;
    }, getRequestUrl = function(destination, representation) {
        var url, baseURL = representation.adaptation.period.mpd.manifest.Period_asArray[representation.adaptation.period.index].AdaptationSet_asArray[representation.adaptation.index].Representation_asArray[representation.index].BaseURL;
        return url = destination === baseURL ? destination : absUrl.test(destination) ? destination : baseURL + destination;
    }, generateInitRequest = function(representation, mediaType) {
        var period, presentationStartTime, self = this, request = new MediaPlayer.vo.FragmentRequest();
        return period = representation.adaptation.period, request.mediaType = mediaType, 
        request.type = "Initialization Segment", request.url = getRequestUrl(representation.initialization, representation), 
        request.range = representation.range, presentationStartTime = period.start, request.availabilityStartTime = self.timelineConverter.calcAvailabilityStartTimeFromPresentationTime(presentationStartTime, representation.adaptation.period.mpd, isDynamic), 
        request.availabilityEndTime = self.timelineConverter.calcAvailabilityEndTimeFromPresentationTime(presentationStartTime + period.duration, period.mpd, isDynamic), 
        request.quality = representation.index, request;
    }, getInit = function(representation) {
        var request, self = this;
        return representation ? request = generateInitRequest.call(self, representation, type) : null;
    }, isMediaFinished = function(representation) {
        var sDuration, seg, fTime, period = representation.adaptation.period, isFinished = !1;
        return isDynamic ? isFinished = !1 : 0 > index ? isFinished = !1 : index < representation.availableSegmentsNumber ? (seg = getSegmentByIndex(index, representation), 
        seg && (fTime = seg.presentationStartTime - period.start, sDuration = representation.adaptation.period.duration, 
        this.debug.log(representation.segmentInfoType + ": " + fTime + " / " + sDuration), 
        isFinished = fTime >= sDuration)) : isFinished = !0, isFinished;
    }, getIndexBasedSegment = function(representation, index) {
        var seg, duration, presentationStartTime, presentationEndTime, self = this;
        return duration = representation.segmentDuration, presentationStartTime = representation.adaptation.period.start + index * duration, 
        presentationEndTime = presentationStartTime + duration, seg = new Dash.vo.Segment(), 
        seg.representation = representation, seg.duration = duration, seg.presentationStartTime = presentationStartTime, 
        seg.mediaStartTime = self.timelineConverter.calcMediaTimeFromPresentationTime(seg.presentationStartTime, representation), 
        seg.availabilityStartTime = self.timelineConverter.calcAvailabilityStartTimeFromPresentationTime(seg.presentationStartTime, representation.adaptation.period.mpd, isDynamic), 
        seg.availabilityEndTime = self.timelineConverter.calcAvailabilityEndTimeFromPresentationTime(presentationEndTime, representation.adaptation.period.mpd, isDynamic), 
        seg.wallStartTime = self.timelineConverter.calcWallTimeForSegment(seg, isDynamic), 
        seg.replacementNumber = getNumberForSegment(seg, index), seg.availabilityIdx = index, 
        seg;
    }, getSegmentsFromTimeline = function(representation) {
        var fragments, frag, i, len, j, repeat, repeatEndTime, nextFrag, calculatedRange, hasEnoughSegments, requiredMediaTime, startIdx, endIdx, fTimescale, self = this, template = representation.adaptation.period.mpd.manifest.Period_asArray[representation.adaptation.period.index].AdaptationSet_asArray[representation.adaptation.index].Representation_asArray[representation.index].SegmentTemplate, timeline = template.SegmentTimeline, isAvailableSegmentNumberCalculated = representation.availableSegmentsNumber > 0, maxSegmentsAhead = 10, segments = [], time = 0, scaledTime = 0, availabilityIdx = -1, createSegment = function(s) {
            return getTimeBasedSegment.call(self, representation, time, s.d, fTimescale, template.media, s.mediaRange, availabilityIdx);
        };
        for (fTimescale = representation.timescale, fragments = timeline.S_asArray, calculatedRange = decideSegmentListRangeForTimeline.call(self, representation), 
        calculatedRange ? (startIdx = calculatedRange.start, endIdx = calculatedRange.end) : requiredMediaTime = self.timelineConverter.calcMediaTimeFromPresentationTime(requestedTime || 0, representation), 
        i = 0, len = fragments.length; len > i; i += 1) if (frag = fragments[i], repeat = 0, 
        frag.hasOwnProperty("r") && (repeat = frag.r), frag.hasOwnProperty("t") && (time = frag.t, 
        scaledTime = time / fTimescale), 0 > repeat && (nextFrag = fragments[i + 1], nextFrag && nextFrag.hasOwnProperty("t") ? repeatEndTime = nextFrag.t / fTimescale : (repeatEndTime = self.timelineConverter.calcMediaTimeFromPresentationTime(representation.segmentAvailabilityRange.end, representation), 
        representation.segmentDuration = frag.d / fTimescale), repeat = Math.ceil((repeatEndTime - scaledTime) / (frag.d / fTimescale)) - 1), 
        hasEnoughSegments) {
            if (isAvailableSegmentNumberCalculated) break;
            availabilityIdx += repeat + 1;
        } else for (j = 0; repeat >= j; j += 1) {
            if (availabilityIdx += 1, calculatedRange) {
                if (availabilityIdx > endIdx) {
                    if (hasEnoughSegments = !0, isAvailableSegmentNumberCalculated) break;
                    continue;
                }
                availabilityIdx >= startIdx && segments.push(createSegment.call(self, frag));
            } else {
                if (segments.length > maxSegmentsAhead) {
                    if (hasEnoughSegments = !0, isAvailableSegmentNumberCalculated) break;
                    continue;
                }
                scaledTime >= requiredMediaTime - frag.d / fTimescale && segments.push(createSegment.call(self, frag));
            }
            time += frag.d, scaledTime = time / fTimescale;
        }
        return isAvailableSegmentNumberCalculated || (representation.availableSegmentsNumber = availabilityIdx + 1), 
        segments;
    }, getSegmentsFromTemplate = function(representation) {
        var segmentRange, periodSegIdx, startIdx, endIdx, start, segments = [], self = this, template = representation.adaptation.period.mpd.manifest.Period_asArray[representation.adaptation.period.index].AdaptationSet_asArray[representation.adaptation.index].Representation_asArray[representation.index].SegmentTemplate, duration = representation.segmentDuration, availabilityWindow = representation.segmentAvailabilityRange, seg = null, url = null;
        for (start = representation.startNumber, segmentRange = decideSegmentListRangeForTemplate.call(self, representation), 
        startIdx = segmentRange.start, endIdx = segmentRange.end, periodSegIdx = startIdx; endIdx >= periodSegIdx; periodSegIdx += 1) seg = getIndexBasedSegment.call(self, representation, periodSegIdx), 
        seg.replacementTime = (start + periodSegIdx - 1) * representation.segmentDuration, 
        url = template.media, url = replaceTokenForTemplate(url, "Number", seg.replacementNumber), 
        url = replaceTokenForTemplate(url, "Time", seg.replacementTime), seg.media = url, 
        segments.push(seg), seg = null;
        return representation.availableSegmentsNumber = Math.ceil((availabilityWindow.end - availabilityWindow.start) / duration), 
        segments;
    }, decideSegmentListRangeForTemplate = function(representation) {
        {
            var start, end, range, self = this, duration = representation.segmentDuration, minBufferTime = representation.adaptation.period.mpd.manifest.minBufferTime, availabilityWindow = representation.segmentAvailabilityRange, periodRelativeRange = {
                start: self.timelineConverter.calcPeriodRelativeTimeFromMpdRelativeTime(representation, availabilityWindow.start),
                end: self.timelineConverter.calcPeriodRelativeTimeFromMpdRelativeTime(representation, availabilityWindow.end)
            }, originAvailabilityTime = 0/0, originSegment = null, currentSegmentList = representation.segments;
            Math.max(2 * minBufferTime, 10 * duration);
        }
        return periodRelativeRange || (periodRelativeRange = self.timelineConverter.calcSegmentAvailabilityRange(representation, isDynamic)), 
        isDynamic && !self.timelineConverter.isTimeSyncCompleted() ? (start = Math.floor(periodRelativeRange.start / duration), 
        end = Math.floor(periodRelativeRange.end / duration), range = {
            start: start,
            end: end
        }) : (currentSegmentList ? (originSegment = getSegmentByIndex(index, representation), 
        originAvailabilityTime = originSegment ? self.timelineConverter.calcPeriodRelativeTimeFromMpdRelativeTime(representation, originSegment.presentationStartTime) : index > 0 ? index * duration : self.timelineConverter.calcPeriodRelativeTimeFromMpdRelativeTime(representation, requestedTime || currentSegmentList[0].presentationStartTime)) : originAvailabilityTime = index > 0 ? index * duration : isDynamic ? periodRelativeRange.end : periodRelativeRange.start, 
        start = Math.floor(periodRelativeRange.start / duration), end = Math.floor(periodRelativeRange.end / duration), 
        range = {
            start: start,
            end: end
        });
    }, decideSegmentListRangeForTimeline = function() {
        var start, end, range, availabilityLowerLimit = 2, availabilityUpperLimit = 10, firstIdx = 0, lastIdx = Number.POSITIVE_INFINITY;
        return isDynamic && !this.timelineConverter.isTimeSyncCompleted() ? range = {
            start: firstIdx,
            end: lastIdx
        } : !isDynamic && requestedTime || 0 > index ? null : (start = Math.max(index - availabilityLowerLimit, firstIdx), 
        end = Math.min(index + availabilityUpperLimit, lastIdx), range = {
            start: start,
            end: end
        });
    }, getTimeBasedSegment = function(representation, time, duration, fTimescale, url, range, index) {
        var presentationStartTime, presentationEndTime, seg, self = this, scaledTime = time / fTimescale, scaledDuration = Math.min(duration / fTimescale, representation.adaptation.period.mpd.maxSegmentDuration);
        return presentationStartTime = self.timelineConverter.calcPresentationTimeFromMediaTime(scaledTime, representation), 
        presentationEndTime = presentationStartTime + scaledDuration, seg = new Dash.vo.Segment(), 
        seg.representation = representation, seg.duration = scaledDuration, seg.mediaStartTime = scaledTime, 
        seg.presentationStartTime = presentationStartTime, seg.availabilityStartTime = representation.adaptation.period.mpd.manifest.loadedTime, 
        seg.availabilityEndTime = self.timelineConverter.calcAvailabilityEndTimeFromPresentationTime(presentationEndTime, representation.adaptation.period.mpd, isDynamic), 
        seg.wallStartTime = self.timelineConverter.calcWallTimeForSegment(seg, isDynamic), 
        seg.replacementTime = time, seg.replacementNumber = getNumberForSegment(seg, index), 
        url = replaceTokenForTemplate(url, "Number", seg.replacementNumber), url = replaceTokenForTemplate(url, "Time", seg.replacementTime), 
        seg.media = url, seg.mediaRange = range, seg.availabilityIdx = index, seg;
    }, getSegmentsFromList = function(representation) {
        var periodSegIdx, seg, s, range, startIdx, endIdx, start, self = this, segments = [], list = representation.adaptation.period.mpd.manifest.Period_asArray[representation.adaptation.period.index].AdaptationSet_asArray[representation.adaptation.index].Representation_asArray[representation.index].SegmentList, len = list.SegmentURL_asArray.length;
        for (start = representation.startNumber, range = decideSegmentListRangeForTemplate.call(self, representation), 
        startIdx = Math.max(range.start, 0), endIdx = Math.min(range.end, list.SegmentURL_asArray.length - 1), 
        periodSegIdx = startIdx; endIdx >= periodSegIdx; periodSegIdx += 1) s = list.SegmentURL_asArray[periodSegIdx], 
        seg = getIndexBasedSegment.call(self, representation, periodSegIdx), seg.replacementTime = (start + periodSegIdx - 1) * representation.segmentDuration, 
        seg.media = s.media, seg.mediaRange = s.mediaRange, seg.index = s.index, seg.indexRange = s.indexRange, 
        segments.push(seg), seg = null;
        return representation.availableSegmentsNumber = len, segments;
    }, getSegments = function(representation) {
        var segments, self = this, type = representation.segmentInfoType;
        return "SegmentBase" !== type && "BaseURL" !== type && isSegmentListUpdateRequired.call(self, representation) ? ("SegmentTimeline" === type ? segments = getSegmentsFromTimeline.call(self, representation) : "SegmentTemplate" === type ? segments = getSegmentsFromTemplate.call(self, representation) : "SegmentList" === type && (segments = getSegmentsFromList.call(self, representation)), 
        onSegmentListUpdated.call(self, representation, segments)) : segments = representation.segments, 
        segments;
    }, onSegmentListUpdated = function(representation, segments) {
        var lastIdx, liveEdge, metrics, lastSegment;
        representation.segments = segments, lastIdx = segments.length - 1, isDynamic && isNaN(this.timelineConverter.getExpectedLiveEdge()) && (lastSegment = segments[lastIdx], 
        liveEdge = lastSegment.presentationStartTime + lastSegment.duration, metrics = this.metricsModel.getMetricsFor("stream"), 
        this.timelineConverter.setExpectedLiveEdge(liveEdge), this.metricsModel.updateManifestUpdateInfo(this.metricsExt.getCurrentManifestUpdate(metrics), {
            presentationStartTime: liveEdge
        }));
    }, updateSegmentList = function(representation) {
        var self = this;
        if (!representation) throw new Error("no representation");
        return representation.segments = null, getSegments.call(self, representation), representation;
    }, updateRepresentation = function(representation, keepIdx) {
        var error, self = this, hasInitialization = representation.initialization, hasSegments = "BaseURL" !== representation.segmentInfoType && "SegmentBase" !== representation.segmentInfoType;
        return representation.segmentAvailabilityRange = null, representation.segmentAvailabilityRange = self.timelineConverter.calcSegmentAvailabilityRange(representation, isDynamic), 
        representation.segmentAvailabilityRange.end < representation.segmentAvailabilityRange.start && !representation.useCalculatedLiveEdgeTime ? (error = new MediaPlayer.vo.Error(Dash.dependencies.DashHandler.SEGMENTS_UNAVAILABLE_ERROR_CODE, "no segments are available yet", {
            availabilityDelay: Math.abs(representation.segmentAvailabilityRange.end)
        }), void self.notify(Dash.dependencies.DashHandler.eventList.ENAME_REPRESENTATION_UPDATED, {
            representation: representation
        }, error)) : (keepIdx || (index = -1), updateSegmentList.call(self, representation), 
        hasInitialization || self.baseURLExt.loadInitialization(representation), hasSegments || self.baseURLExt.loadSegments(representation, type, representation.indexRange), 
        void (hasInitialization && hasSegments && self.notify(Dash.dependencies.DashHandler.eventList.ENAME_REPRESENTATION_UPDATED, {
            representation: representation
        })));
    }, getIndexForSegments = function(time, representation) {
        time = Math.floor(time);
        var frag, ft, fd, i, segments = representation.segments, ln = segments ? segments.length : null, idx = -1;
        if (segments && ln > 0) for (i = 0; ln > i; i += 1) if (frag = segments[i], ft = frag.presentationStartTime, 
        fd = frag.duration, time + fd / 2 >= ft && ft + fd > time - fd / 2) {
            idx = frag.availabilityIdx;
            break;
        }
        return idx;
    }, getSegmentByIndex = function(index, representation) {
        if (!representation || !representation.segments) return null;
        var seg, i, ln = representation.segments.length;
        for (i = 0; ln > i; i += 1) if (seg = representation.segments[i], seg.availabilityIdx === index) return seg;
        return null;
    }, isSegmentListUpdateRequired = function(representation) {
        var upperIdx, lowerIdx, updateRequired = !1, segments = representation.segments;
        return segments && 0 !== segments.length ? (lowerIdx = segments[0].availabilityIdx, 
        upperIdx = segments[segments.length - 1].availabilityIdx, updateRequired = lowerIdx > index || index > upperIdx) : updateRequired = !0, 
        updateRequired;
    }, getRequestForSegment = function(segment) {
        if (null === segment || void 0 === segment) return null;
        var url, request = new MediaPlayer.vo.FragmentRequest(), representation = segment.representation, bandwidth = representation.adaptation.period.mpd.manifest.Period_asArray[representation.adaptation.period.index].AdaptationSet_asArray[representation.adaptation.index].Representation_asArray[representation.index].bandwidth;
        return url = getRequestUrl(segment.media, representation), url = replaceTokenForTemplate(url, "Number", segment.replacementNumber), 
        url = replaceTokenForTemplate(url, "Time", segment.replacementTime), url = replaceTokenForTemplate(url, "Bandwidth", bandwidth), 
        url = replaceIDForTemplate(url, representation.id), url = unescapeDollarsInTemplate(url), 
        request.mediaType = type, request.type = "Media Segment", request.url = url, request.range = segment.mediaRange, 
        request.startTime = segment.presentationStartTime, request.duration = segment.duration, 
        request.timescale = representation.timescale, request.availabilityStartTime = segment.availabilityStartTime, 
        request.availabilityEndTime = segment.availabilityEndTime, request.wallStartTime = segment.wallStartTime, 
        request.quality = representation.index, request.index = segment.availabilityIdx, 
        request;
    }, getForTime = function(representation, time, keepIdx) {
        var request, segment, finished, idx = index, self = this;
        return representation ? (requestedTime = time, self.debug.log("Getting the request for time: " + time), 
        index = getIndexForSegments.call(self, time, representation), getSegments.call(self, representation), 
        0 > index && (index = getIndexForSegments.call(self, time, representation)), self.debug.log("Index for time " + time + " is " + index), 
        finished = isMediaFinished.call(self, representation), finished ? (request = new MediaPlayer.vo.FragmentRequest(), 
        request.action = request.ACTION_COMPLETE, request.index = index, request.mediaType = type, 
        self.debug.log("Signal complete."), self.debug.log(request)) : (segment = getSegmentByIndex(index, representation), 
        request = getRequestForSegment.call(self, segment)), keepIdx && (index = idx), request) : null;
    }, generateForTime = function(representation, time) {
        var step = (representation.segmentAvailabilityRange.end - representation.segmentAvailabilityRange.start) / 2;
        return representation.segments = null, representation.segmentAvailabilityRange = {
            start: time - step,
            end: time + step
        }, getForTime.call(this, representation, time, !1);
    }, getNext = function(representation) {
        var request, segment, finished, idx, self = this;
        if (!representation) return null;
        if (-1 === index) throw "You must call getSegmentRequestForTime first.";
        return requestedTime = null, index += 1, idx = index, finished = isMediaFinished.call(self, representation), 
        finished ? (request = new MediaPlayer.vo.FragmentRequest(), request.action = request.ACTION_COMPLETE, 
        request.index = idx, request.mediaType = type, self.debug.log("Signal complete.")) : (getSegments.call(self, representation), 
        segment = getSegmentByIndex(idx, representation), request = getRequestForSegment.call(self, segment)), 
        request;
    }, onInitializationLoaded = function(e) {
        var representation = e.data.representation;
        console.log("INIT LOADED"), console.log(representation), representation.segments && this.notify(Dash.dependencies.DashHandler.eventList.ENAME_REPRESENTATION_UPDATED, {
            representation: representation
        });
    }, onSegmentsLoaded = function(e) {
        if (!e.error && type === e.data.mediaType) {
            var i, len, s, seg, self = this, fragments = e.data.segments, representation = e.data.representation, segments = [], count = 0;
            for (i = 0, len = fragments.length; len > i; i += 1) s = fragments[i], seg = getTimeBasedSegment.call(self, representation, s.startTime, s.duration, s.timescale, s.media, s.mediaRange, count), 
            segments.push(seg), seg = null, count += 1;
            representation.segmentAvailabilityRange = {
                start: segments[0].presentationStartTime,
                end: segments[len - 1].presentationStartTime
            }, representation.availableSegmentsNumber = len, onSegmentListUpdated.call(self, representation, segments), 
            representation.initialization && this.notify(Dash.dependencies.DashHandler.eventList.ENAME_REPRESENTATION_UPDATED, {
                representation: representation
            });
        }
    };
    return {
        debug: void 0,
        baseURLExt: void 0,
        timelineConverter: void 0,
        metricsModel: void 0,
        metricsExt: void 0,
        notify: void 0,
        subscribe: void 0,
        unsubscribe: void 0,
        setup: function() {
            this[Dash.dependencies.BaseURLExtensions.eventList.ENAME_INITIALIZATION_LOADED] = onInitializationLoaded, 
            this[Dash.dependencies.BaseURLExtensions.eventList.ENAME_SEGMENTS_LOADED] = onSegmentsLoaded;
        },
        initialize: function(streamProcessor) {
            this.subscribe(Dash.dependencies.DashHandler.eventList.ENAME_REPRESENTATION_UPDATED, streamProcessor.trackController), 
            type = streamProcessor.getType(), isDynamic = streamProcessor.isDynamic(), this.streamProcessor = streamProcessor;
        },
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
        setCurrentTime: function(value) {
            currentTime = value;
        },
        getCurrentTime: function() {
            return currentTime;
        },
        reset: function() {
            currentTime = 0, requestedTime = void 0, index = -1, this.unsubscribe(Dash.dependencies.DashHandler.eventList.ENAME_REPRESENTATION_UPDATED, this.streamProcessor.trackController);
        },
        getInitRequest: getInit,
        getSegmentRequestForTime: getForTime,
        getNextSegmentRequest: getNext,
        generateSegmentRequestForTime: generateForTime,
        updateRepresentation: updateRepresentation
    };
}, Dash.dependencies.DashHandler.prototype = {
    constructor: Dash.dependencies.DashHandler
}, Dash.dependencies.DashHandler.SEGMENTS_UNAVAILABLE_ERROR_CODE = 1, Dash.dependencies.DashHandler.eventList = {
    ENAME_REPRESENTATION_UPDATED: "representationUpdated"
}, Dash.dependencies.DashManifestExtensions = function() {
    "use strict";
    this.timelineConverter = void 0;
}, Dash.dependencies.DashManifestExtensions.prototype = {
    constructor: Dash.dependencies.DashManifestExtensions,
    getIsTypeOf: function(adaptation, type) {
        "use strict";
        var i, len, representation, col = adaptation.ContentComponent_asArray, mimeTypeRegEx = new RegExp("text" !== type ? type : "(vtt|ttml)"), result = !1, found = !1;
        if (col) for (i = 0, len = col.length; len > i; i += 1) col[i].contentType === type && (result = !0, 
        found = !0);
        if (adaptation.hasOwnProperty("mimeType") && (result = mimeTypeRegEx.test(adaptation.mimeType), 
        found = !0), !found) for (i = 0, len = adaptation.Representation_asArray.length; !found && len > i; ) representation = adaptation.Representation_asArray[i], 
        representation.hasOwnProperty("mimeType") && (result = mimeTypeRegEx.test(representation.mimeType), 
        found = !0), i += 1;
        return result;
    },
    getIsAudio: function(adaptation) {
        "use strict";
        return this.getIsTypeOf(adaptation, "audio");
    },
    getIsVideo: function(adaptation) {
        "use strict";
        return this.getIsTypeOf(adaptation, "video");
    },
    getIsText: function(adaptation) {
        "use strict";
        return this.getIsTypeOf(adaptation, "text");
    },
    getIsTextTrack: function(type) {
        return "text/vtt" === type || "application/ttml+xml" === type;
    },
    getLanguageForAdaptation: function(adaptation) {
        var lang = "";
        return adaptation.hasOwnProperty("lang") && (lang = adaptation.lang), lang;
    },
    getIsMain: function() {
        "use strict";
        return !1;
    },
    processAdaptation: function(adaptation) {
        "use strict";
        return void 0 !== adaptation.Representation_asArray && null !== adaptation.Representation_asArray && adaptation.Representation_asArray.sort(function(a, b) {
            return a.bandwidth - b.bandwidth;
        }), adaptation;
    },
    getAdaptationForId: function(id, manifest, periodIndex) {
        "use strict";
        var i, len, adaptations = manifest.Period_asArray[periodIndex].AdaptationSet_asArray;
        for (i = 0, len = adaptations.length; len > i; i += 1) if (adaptations[i].hasOwnProperty("id") && adaptations[i].id === id) return adaptations[i];
        return null;
    },
    getAdaptationForIndex: function(index, manifest, periodIndex) {
        "use strict";
        var adaptations = manifest.Period_asArray[periodIndex].AdaptationSet_asArray;
        return adaptations[index];
    },
    getIndexForAdaptation: function(adaptation, manifest, periodIndex) {
        "use strict";
        var i, len, adaptations = manifest.Period_asArray[periodIndex].AdaptationSet_asArray;
        for (i = 0, len = adaptations.length; len > i; i += 1) if (adaptations[i] === adaptation) return i;
        return -1;
    },
    getAdaptationsForType: function(manifest, periodIndex, type) {
        "use strict";
        var i, len, self = this, adaptationSet = manifest.Period_asArray[periodIndex].AdaptationSet_asArray, adaptations = [];
        for (i = 0, len = adaptationSet.length; len > i; i += 1) this.getIsTypeOf(adaptationSet[i], type) && adaptations.push(self.processAdaptation(adaptationSet[i]));
        return adaptations;
    },
    getAdaptationForType: function(manifest, periodIndex, type) {
        "use strict";
        var i, len, adaptations, self = this;
        if (adaptations = this.getAdaptationsForType(manifest, periodIndex, type), !adaptations || 0 === adaptations.length) return null;
        for (i = 0, len = adaptations.length; len > i; i += 1) if (self.getIsMain(adaptations[i])) return adaptations[i];
        return adaptations[0];
    },
    getCodec: function(adaptation) {
        "use strict";
        var representation = adaptation.Representation_asArray[0], codec = representation.mimeType + ';codecs="' + representation.codecs + '"';
        return codec;
    },
    getMimeType: function(adaptation) {
        "use strict";
        return adaptation.Representation_asArray[0].mimeType;
    },
    getKID: function(adaptation) {
        "use strict";
        return adaptation && adaptation.hasOwnProperty("cenc:default_KID") ? adaptation["cenc:default_KID"] : null;
    },
    getContentProtectionData: function(adaptation) {
        "use strict";
        return adaptation && adaptation.hasOwnProperty("ContentProtection_asArray") && 0 !== adaptation.ContentProtection_asArray.length ? adaptation.ContentProtection_asArray : null;
    },
    getIsDynamic: function(manifest) {
        "use strict";
        var isDynamic = !1, LIVE_TYPE = "dynamic";
        return manifest.hasOwnProperty("type") && (isDynamic = manifest.type === LIVE_TYPE), 
        isDynamic;
    },
    getIsDVR: function(manifest) {
        "use strict";
        var containsDVR, isDVR, isDynamic = this.getIsDynamic(manifest);
        return containsDVR = !isNaN(manifest.timeShiftBufferDepth), isDVR = isDynamic && containsDVR;
    },
    getIsOnDemand: function(manifest) {
        "use strict";
        var isOnDemand = !1;
        return manifest.profiles && manifest.profiles.length > 0 && (isOnDemand = -1 !== manifest.profiles.indexOf("urn:mpeg:dash:profile:isoff-on-demand:2011")), 
        isOnDemand;
    },
    getDuration: function(manifest) {
        var mpdDuration;
        return mpdDuration = manifest.hasOwnProperty("mediaPresentationDuration") ? manifest.mediaPresentationDuration : Number.POSITIVE_INFINITY;
    },
    getBandwidth: function(representation) {
        "use strict";
        return representation.bandwidth;
    },
    getRefreshDelay: function(manifest) {
        "use strict";
        var delay = 0/0, minDelay = 2;
        return manifest.hasOwnProperty("minimumUpdatePeriod") && (delay = Math.max(parseFloat(manifest.minimumUpdatePeriod), minDelay)), 
        delay;
    },
    getRepresentationCount: function(adaptation) {
        "use strict";
        return adaptation.Representation_asArray.length;
    },
    getRepresentationFor: function(index, adaptation) {
        "use strict";
        return adaptation.Representation_asArray[index];
    },
    getRepresentationsForAdaptation: function(manifest, adaptation) {
        for (var representation, initialization, segmentInfo, r, s, self = this, a = self.processAdaptation(manifest.Period_asArray[adaptation.period.index].AdaptationSet_asArray[adaptation.index]), representations = [], i = 0; i < a.Representation_asArray.length; i += 1) r = a.Representation_asArray[i], 
        representation = new Dash.vo.Representation(), representation.index = i, representation.adaptation = adaptation, 
        r.hasOwnProperty("id") && (representation.id = r.id), r.hasOwnProperty("SegmentBase") ? (segmentInfo = r.SegmentBase, 
        representation.segmentInfoType = "SegmentBase") : r.hasOwnProperty("SegmentList") ? (segmentInfo = r.SegmentList, 
        representation.segmentInfoType = "SegmentList", representation.useCalculatedLiveEdgeTime = !0) : r.hasOwnProperty("SegmentTemplate") ? (segmentInfo = r.SegmentTemplate, 
        segmentInfo.hasOwnProperty("SegmentTimeline") ? (representation.segmentInfoType = "SegmentTimeline", 
        s = segmentInfo.SegmentTimeline.S_asArray[segmentInfo.SegmentTimeline.S_asArray.length - 1], 
        (!s.hasOwnProperty("r") || s.r >= 0) && (representation.useCalculatedLiveEdgeTime = !0)) : representation.segmentInfoType = "SegmentTemplate", 
        segmentInfo.hasOwnProperty("initialization") && (representation.initialization = segmentInfo.initialization.split("$Bandwidth$").join(r.bandwidth).split("$RepresentationID$").join(r.id))) : (segmentInfo = r.BaseURL, 
        representation.segmentInfoType = "BaseURL"), segmentInfo.hasOwnProperty("Initialization") && (initialization = segmentInfo.Initialization, 
        initialization.hasOwnProperty("sourceURL") ? representation.initialization = initialization.sourceURL : initialization.hasOwnProperty("range") && (representation.initialization = r.BaseURL, 
        representation.range = initialization.range)), segmentInfo.hasOwnProperty("timescale") && (representation.timescale = segmentInfo.timescale), 
        segmentInfo.hasOwnProperty("duration") && (representation.segmentDuration = segmentInfo.duration / representation.timescale), 
        segmentInfo.hasOwnProperty("startNumber") && (representation.startNumber = segmentInfo.startNumber), 
        segmentInfo.hasOwnProperty("indexRange") && (representation.indexRange = segmentInfo.indexRange), 
        segmentInfo.hasOwnProperty("presentationTimeOffset") && (representation.presentationTimeOffset = segmentInfo.presentationTimeOffset / representation.timescale), 
        representation.MSETimeOffset = self.timelineConverter.calcMSETimeOffset(representation), 
        representations.push(representation);
        return representations;
    },
    getAdaptationsForPeriod: function(manifest, period) {
        for (var adaptationSet, a, p = manifest.Period_asArray[period.index], adaptations = [], i = 0; i < p.AdaptationSet_asArray.length; i += 1) a = p.AdaptationSet_asArray[i], 
        adaptationSet = new Dash.vo.AdaptationSet(), a.hasOwnProperty("id") && (adaptationSet.id = a.id), 
        adaptationSet.index = i, adaptationSet.period = period, adaptationSet.type = this.getIsAudio(a) ? "audio" : this.getIsVideo(a) ? "video" : "text", 
        adaptations.push(adaptationSet);
        return adaptations;
    },
    getRegularPeriods: function(manifest, mpd) {
        var i, len, self = this, periods = [], isDynamic = self.getIsDynamic(manifest), p1 = null, p = null, vo1 = null, vo = null;
        for (i = 0, len = manifest.Period_asArray.length; len > i; i += 1) p = manifest.Period_asArray[i], 
        p.hasOwnProperty("start") ? (vo = new Dash.vo.Period(), vo.start = p.start) : null !== p1 && p.hasOwnProperty("duration") && null !== vo1 ? (vo = new Dash.vo.Period(), 
        vo.start = vo1.start + vo1.duration, vo.duration = p.duration) : 0 !== i || isDynamic || (vo = new Dash.vo.Period(), 
        vo.start = 0), null !== vo1 && isNaN(vo1.duration) && (vo1.duration = vo.start - vo1.start), 
        null !== vo && p.hasOwnProperty("id") && (vo.id = p.id), null !== vo && p.hasOwnProperty("duration") && (vo.duration = p.duration), 
        null !== vo && (vo.index = i, vo.mpd = mpd, periods.push(vo), p1 = p, vo1 = vo), 
        p = null, vo = null;
        return 0 === periods.length ? periods : (mpd.checkTime = self.getCheckTime(manifest, periods[0]), 
        null !== vo1 && isNaN(vo1.duration) && (vo1.duration = self.getEndTimeForLastPeriod(mpd) - vo1.start), 
        periods);
    },
    getMpd: function(manifest) {
        var mpd = new Dash.vo.Mpd();
        return mpd.manifest = manifest, mpd.availabilityStartTime = new Date(manifest.hasOwnProperty("availabilityStartTime") ? manifest.availabilityStartTime.getTime() : manifest.loadedTime.getTime()), 
        manifest.hasOwnProperty("availabilityEndTime") && (mpd.availabilityEndTime = new Date(manifest.availabilityEndTime.getTime())), 
        manifest.hasOwnProperty("suggestedPresentationDelay") && (mpd.suggestedPresentationDelay = manifest.suggestedPresentationDelay), 
        manifest.hasOwnProperty("timeShiftBufferDepth") && (mpd.timeShiftBufferDepth = manifest.timeShiftBufferDepth), 
        manifest.hasOwnProperty("maxSegmentDuration") && (mpd.maxSegmentDuration = manifest.maxSegmentDuration), 
        mpd;
    },
    getFetchTime: function(manifest, period) {
        var fetchTime = this.timelineConverter.calcPresentationTimeFromWallTime(manifest.loadedTime, period);
        return fetchTime;
    },
    getCheckTime: function(manifest, period) {
        var fetchTime, self = this, checkTime = 0/0;
        return manifest.hasOwnProperty("minimumUpdatePeriod") && (fetchTime = self.getFetchTime(manifest, period), 
        checkTime = fetchTime + manifest.minimumUpdatePeriod), checkTime;
    },
    getEndTimeForLastPeriod: function(mpd) {
        var periodEnd;
        if (mpd.manifest.mediaPresentationDuration) periodEnd = mpd.manifest.mediaPresentationDuration; else {
            if (isNaN(mpd.checkTime)) throw new Error("Must have @mediaPresentationDuration or @minimumUpdatePeriod on MPD or an explicit @duration on the last period.");
            periodEnd = mpd.checkTime;
        }
        return periodEnd;
    },
    getEventsForPeriod: function(manifest, period) {
        var periodArray = manifest.Period_asArray, eventStreams = periodArray[period.index].EventStream_asArray, events = [];
        if (eventStreams) for (var i = 0; i < eventStreams.length; i += 1) {
            var eventStream = new Dash.vo.EventStream();
            if (eventStream.period = period, eventStream.timescale = 1, !eventStreams[i].hasOwnProperty("schemeIdUri")) throw "Invalid EventStream. SchemeIdUri has to be set";
            eventStream.schemeIdUri = eventStreams[i].schemeIdUri, eventStreams[i].hasOwnProperty("timescale") && (eventStream.timescale = eventStreams[i].timescale), 
            eventStreams[i].hasOwnProperty("value") && (eventStream.value = eventStreams[i].value);
            for (var j = 0; j < eventStreams[i].Event_asArray.length; j += 1) {
                var event = new Dash.vo.Event();
                event.presentationTime = 0, event.eventStream = eventStream, eventStreams[i].Event_asArray[j].hasOwnProperty("presentationTime") && (event.presentationTime = eventStreams[i].Event_asArray[j].presentationTime), 
                eventStreams[i].Event_asArray[j].hasOwnProperty("duration") && (event.duration = eventStreams[i].Event_asArray[j].duration), 
                eventStreams[i].Event_asArray[j].hasOwnProperty("id") && (event.id = eventStreams[i].Event_asArray[j].id), 
                events.push(event);
            }
        }
        return events;
    },
    getEventStreamForAdaptationSet: function(manifest, adaptation) {
        var eventStreams = [], inbandStreams = manifest.Period_asArray[adaptation.period.index].AdaptationSet_asArray[adaptation.index].InbandEventStream_asArray;
        if (inbandStreams) for (var i = 0; i < inbandStreams.length; i += 1) {
            var eventStream = new Dash.vo.EventStream();
            if (eventStream.timescale = 1, !inbandStreams[i].hasOwnProperty("schemeIdUri")) throw "Invalid EventStream. SchemeIdUri has to be set";
            eventStream.schemeIdUri = inbandStreams[i].schemeIdUri, inbandStreams[i].hasOwnProperty("timescale") && (eventStream.timescale = inbandStreams[i].timescale), 
            inbandStreams[i].hasOwnProperty("value") && (eventStream.value = inbandStreams[i].value), 
            eventStreams.push(eventStream);
        }
        return eventStreams;
    },
    getEventStreamForRepresentation: function(manifest, representation) {
        var eventStreams = [], inbandStreams = manifest.Period_asArray[representation.adaptation.period.index].AdaptationSet_asArray[representation.adaptation.index].Representation_asArray[representation.index].InbandEventStream_asArray;
        if (inbandStreams) for (var i = 0; i < inbandStreams.length; i++) {
            var eventStream = new Dash.vo.EventStream();
            if (eventStream.timescale = 1, eventStream.representation = representation, !inbandStreams[i].hasOwnProperty("schemeIdUri")) throw "Invalid EventStream. SchemeIdUri has to be set";
            eventStream.schemeIdUri = inbandStreams[i].schemeIdUri, inbandStreams[i].hasOwnProperty("timescale") && (eventStream.timescale = inbandStreams[i].timescale), 
            inbandStreams[i].hasOwnProperty("value") && (eventStream.value = inbandStreams[i].value), 
            eventStreams.push(eventStream);
        }
        return eventStreams;
    }
}, Dash.dependencies.DashMetricsExtensions = function() {
    "use strict";
    var findRepresentationIndexInPeriodArray = function(periodArray, representationId) {
        var period, adaptationSet, adaptationSetArray, representation, representationArray, periodArrayIndex, adaptationSetArrayIndex, representationArrayIndex;
        for (periodArrayIndex = 0; periodArrayIndex < periodArray.length; periodArrayIndex += 1) for (period = periodArray[periodArrayIndex], 
        adaptationSetArray = period.AdaptationSet_asArray, adaptationSetArrayIndex = 0; adaptationSetArrayIndex < adaptationSetArray.length; adaptationSetArrayIndex += 1) for (adaptationSet = adaptationSetArray[adaptationSetArrayIndex], 
        representationArray = adaptationSet.Representation_asArray, representationArrayIndex = 0; representationArrayIndex < representationArray.length; representationArrayIndex += 1) if (representation = representationArray[representationArrayIndex], 
        representationId === representation.id) return representationArrayIndex;
        return -1;
    }, findRepresentionInPeriodArray = function(periodArray, representationId) {
        var period, adaptationSet, adaptationSetArray, representation, representationArray, periodArrayIndex, adaptationSetArrayIndex, representationArrayIndex;
        for (periodArrayIndex = 0; periodArrayIndex < periodArray.length; periodArrayIndex += 1) for (period = periodArray[periodArrayIndex], 
        adaptationSetArray = period.AdaptationSet_asArray, adaptationSetArrayIndex = 0; adaptationSetArrayIndex < adaptationSetArray.length; adaptationSetArrayIndex += 1) for (adaptationSet = adaptationSetArray[adaptationSetArrayIndex], 
        representationArray = adaptationSet.Representation_asArray, representationArrayIndex = 0; representationArrayIndex < representationArray.length; representationArrayIndex += 1) if (representation = representationArray[representationArrayIndex], 
        representationId === representation.id) return representation;
        return null;
    }, adaptationIsType = function(adaptation, bufferType) {
        return this.manifestExt.getIsTypeOf(adaptation, bufferType);
    }, findMaxBufferIndex = function(periodArray, bufferType) {
        var period, adaptationSet, adaptationSetArray, representationArray, periodArrayIndex, adaptationSetArrayIndex;
        for (periodArrayIndex = 0; periodArrayIndex < periodArray.length; periodArrayIndex += 1) for (period = periodArray[periodArrayIndex], 
        adaptationSetArray = period.AdaptationSet_asArray, adaptationSetArrayIndex = 0; adaptationSetArrayIndex < adaptationSetArray.length; adaptationSetArrayIndex += 1) if (adaptationSet = adaptationSetArray[adaptationSetArrayIndex], 
        representationArray = adaptationSet.Representation_asArray, adaptationIsType.call(this, adaptationSet, bufferType)) return representationArray.length;
        return -1;
    }, getBandwidthForRepresentation = function(representationId) {
        var representation, self = this, manifest = self.manifestModel.getValue(), periodArray = manifest.Period_asArray;
        return representation = findRepresentionInPeriodArray.call(self, periodArray, representationId), 
        null === representation ? null : representation.bandwidth;
    }, getIndexForRepresentation = function(representationId) {
        var representationIndex, self = this, manifest = self.manifestModel.getValue(), periodArray = manifest.Period_asArray;
        return representationIndex = findRepresentationIndexInPeriodArray.call(self, periodArray, representationId);
    }, getMaxIndexForBufferType = function(bufferType) {
        var maxIndex, self = this, manifest = self.manifestModel.getValue(), periodArray = manifest.Period_asArray;
        return maxIndex = findMaxBufferIndex.call(this, periodArray, bufferType);
    }, getCurrentRepresentationSwitch = function(metrics) {
        if (null === metrics) return null;
        var repSwitchLength, repSwitchLastIndex, currentRepSwitch, repSwitch = metrics.RepSwitchList;
        return null === repSwitch || repSwitch.length <= 0 ? null : (repSwitchLength = repSwitch.length, 
        repSwitchLastIndex = repSwitchLength - 1, currentRepSwitch = repSwitch[repSwitchLastIndex]);
    }, getCurrentBufferLevel = function(metrics) {
        if (null === metrics) return null;
        var bufferLevelLength, bufferLevelLastIndex, currentBufferLevel, bufferLevel = metrics.BufferLevel;
        return null === bufferLevel || bufferLevel.length <= 0 ? null : (bufferLevelLength = bufferLevel.length, 
        bufferLevelLastIndex = bufferLevelLength - 1, currentBufferLevel = bufferLevel[bufferLevelLastIndex]);
    }, getCurrentPlaybackRate = function(metrics) {
        if (null === metrics) return null;
        var trace, currentRate, playList = metrics.PlayList;
        return null === playList || playList.length <= 0 ? null : (trace = playList[playList.length - 1].trace, 
        null === trace || trace.length <= 0 ? null : currentRate = trace[trace.length - 1].playbackspeed);
    }, getCurrentHttpRequest = function(metrics) {
        if (null === metrics) return null;
        var httpListLength, httpListLastIndex, httpList = metrics.HttpList, currentHttpList = null;
        if (null === httpList || httpList.length <= 0) return null;
        for (httpListLength = httpList.length, httpListLastIndex = httpListLength - 1; httpListLastIndex > 0; ) {
            if (httpList[httpListLastIndex].responsecode) {
                currentHttpList = httpList[httpListLastIndex];
                break;
            }
            httpListLastIndex -= 1;
        }
        return currentHttpList;
    }, getHttpRequests = function(metrics) {
        return null === metrics ? [] : metrics.HttpList ? metrics.HttpList : [];
    }, getCurrentDroppedFrames = function(metrics) {
        if (null === metrics) return null;
        var droppedFramesLength, droppedFramesLastIndex, currentDroppedFrames, droppedFrames = metrics.DroppedFrames;
        return null === droppedFrames || droppedFrames.length <= 0 ? null : (droppedFramesLength = droppedFrames.length, 
        droppedFramesLastIndex = droppedFramesLength - 1, currentDroppedFrames = droppedFrames[droppedFramesLastIndex]);
    }, getCurrentSchedulingInfo = function(metrics) {
        if (null === metrics) return null;
        var ln, lastIdx, currentSchedulingInfo, schedulingInfo = metrics.SchedulingInfo;
        return null === schedulingInfo || schedulingInfo.length <= 0 ? null : (ln = schedulingInfo.length, 
        lastIdx = ln - 1, currentSchedulingInfo = schedulingInfo[lastIdx]);
    }, getCurrentManifestUpdate = function(metrics) {
        if (null === metrics) return null;
        var ln, lastIdx, currentManifestUpdate, manifestUpdate = metrics.ManifestUpdate;
        return null === manifestUpdate || manifestUpdate.length <= 0 ? null : (ln = manifestUpdate.length, 
        lastIdx = ln - 1, currentManifestUpdate = manifestUpdate[lastIdx]);
    }, getCurrentDVRInfo = function(metrics) {
        if (null === metrics) return null;
        var dvrInfoLastIndex, dvrInfo = metrics.DVRInfo, curentDVRInfo = null;
        return null === dvrInfo || dvrInfo.length <= 0 ? null : (dvrInfoLastIndex = dvrInfo.length - 1, 
        curentDVRInfo = dvrInfo[dvrInfoLastIndex]);
    }, getLatestMPDRequestHeaderValueByID = function(metrics, id) {
        if (null === metrics) return null;
        var headers, httpRequestList = getHttpRequests(metrics), httpRequest = httpRequestList[httpRequestList.length - 1];
        return "MPD" === httpRequest.type && (headers = parseResponseHeaders(httpRequest.responseHeaders, id)), 
        void 0 === headers[id] ? null : headers[id];
    }, getLatestFragmentRequestHeaderValueByID = function(metrics, id) {
        if (null === metrics) return null;
        var headers, httpRequest = getCurrentHttpRequest(metrics);
        return null === httpRequest || null === httpRequest.responseHeaders ? null : (headers = parseResponseHeaders(httpRequest.responseHeaders, id), 
        void 0 === headers[id] ? null : headers[id]);
    }, parseResponseHeaders = function(headerStr) {
        var headers = {};
        if (!headerStr) return headers;
        for (var headerPairs = headerStr.split("\r\n"), i = 0, ilen = headerPairs.length; ilen > i; i++) {
            var headerPair = headerPairs[i], index = headerPair.indexOf(": ");
            index > 0 && (headers[headerPair.substring(0, index)] = headerPair.substring(index + 2));
        }
        return headers;
    };
    return {
        manifestModel: void 0,
        manifestExt: void 0,
        getBandwidthForRepresentation: getBandwidthForRepresentation,
        getIndexForRepresentation: getIndexForRepresentation,
        getMaxIndexForBufferType: getMaxIndexForBufferType,
        getCurrentRepresentationSwitch: getCurrentRepresentationSwitch,
        getCurrentBufferLevel: getCurrentBufferLevel,
        getCurrentPlaybackRate: getCurrentPlaybackRate,
        getCurrentHttpRequest: getCurrentHttpRequest,
        getHttpRequests: getHttpRequests,
        getCurrentDroppedFrames: getCurrentDroppedFrames,
        getCurrentSchedulingInfo: getCurrentSchedulingInfo,
        getCurrentDVRInfo: getCurrentDVRInfo,
        getCurrentManifestUpdate: getCurrentManifestUpdate,
        getLatestFragmentRequestHeaderValueByID: getLatestFragmentRequestHeaderValueByID,
        getLatestMPDRequestHeaderValueByID: getLatestMPDRequestHeaderValueByID
    };
}, Dash.dependencies.DashMetricsExtensions.prototype = {
    constructor: Dash.dependencies.DashMetricsExtensions
}, Dash.dependencies.DashParser = function() {
    "use strict";
    var SECONDS_IN_YEAR = 31536e3, SECONDS_IN_MONTH = 2592e3, SECONDS_IN_DAY = 86400, SECONDS_IN_HOUR = 3600, SECONDS_IN_MIN = 60, MINUTES_IN_HOUR = 60, MILLISECONDS_IN_SECONDS = 1e3, durationRegex = /^P(([\d.]*)Y)?(([\d.]*)M)?(([\d.]*)D)?T?(([\d.]*)H)?(([\d.]*)M)?(([\d.]*)S)?/, datetimeRegex = /^([0-9]{4})-([0-9]{2})-([0-9]{2})T([0-9]{2}):([0-9]{2})(?::([0-9]*)(\.[0-9]*)?)?(?:([+-])([0-9]{2})([0-9]{2}))?/, numericRegex = /^[-+]?[0-9]+[.]?[0-9]*([eE][-+]?[0-9]+)?$/, matchers = [ {
        type: "duration",
        test: function(attr) {
            for (var attributeList = [ "minBufferTime", "mediaPresentationDuration", "start", "minimumUpdatePeriod", "timeShiftBufferDepth", "maxSegmentDuration", "maxSubsegmentDuration", "suggestedPresentationDelay", "start", "starttime", "duration" ], i = 0; i < attributeList.length - 1; i++) if (attr.nodeName === attributeList[i]) return durationRegex.test(attr.value);
            return !1;
        },
        converter: function(str) {
            var match = durationRegex.exec(str);
            return parseFloat(match[2] || 0) * SECONDS_IN_YEAR + parseFloat(match[4] || 0) * SECONDS_IN_MONTH + parseFloat(match[6] || 0) * SECONDS_IN_DAY + parseFloat(match[8] || 0) * SECONDS_IN_HOUR + parseFloat(match[10] || 0) * SECONDS_IN_MIN + parseFloat(match[12] || 0);
        }
    }, {
        type: "datetime",
        test: function(attr) {
            return datetimeRegex.test(attr.value);
        },
        converter: function(str) {
            var utcDate, match = datetimeRegex.exec(str);
            if (utcDate = Date.UTC(parseInt(match[1], 10), parseInt(match[2], 10) - 1, parseInt(match[3], 10), parseInt(match[4], 10), parseInt(match[5], 10), match[6] && parseInt(match[6], 10) || 0, match[7] && parseFloat(match[7]) * MILLISECONDS_IN_SECONDS || 0), 
            match[9] && match[10]) {
                var timezoneOffset = parseInt(match[9], 10) * MINUTES_IN_HOUR + parseInt(match[10], 10);
                utcDate += ("+" === match[8] ? -1 : 1) * timezoneOffset * SECONDS_IN_MIN * MILLISECONDS_IN_SECONDS;
            }
            return new Date(utcDate);
        }
    }, {
        type: "numeric",
        test: function(attr) {
            return numericRegex.test(attr.value);
        },
        converter: function(str) {
            return parseFloat(str);
        }
    } ], getCommonValuesMap = function() {
        var adaptationSet, representation, subRepresentation, common;
        return common = [ {
            name: "profiles",
            merge: !1
        }, {
            name: "width",
            merge: !1
        }, {
            name: "height",
            merge: !1
        }, {
            name: "sar",
            merge: !1
        }, {
            name: "frameRate",
            merge: !1
        }, {
            name: "audioSamplingRate",
            merge: !1
        }, {
            name: "mimeType",
            merge: !1
        }, {
            name: "segmentProfiles",
            merge: !1
        }, {
            name: "codecs",
            merge: !1
        }, {
            name: "maximumSAPPeriod",
            merge: !1
        }, {
            name: "startsWithSap",
            merge: !1
        }, {
            name: "maxPlayoutRate",
            merge: !1
        }, {
            name: "codingDependency",
            merge: !1
        }, {
            name: "scanType",
            merge: !1
        }, {
            name: "FramePacking",
            merge: !0
        }, {
            name: "AudioChannelConfiguration",
            merge: !0
        }, {
            name: "ContentProtection",
            merge: !0
        } ], adaptationSet = {}, adaptationSet.name = "AdaptationSet", adaptationSet.isRoot = !1, 
        adaptationSet.isArray = !0, adaptationSet.parent = null, adaptationSet.children = [], 
        adaptationSet.properties = common, representation = {}, representation.name = "Representation", 
        representation.isRoot = !1, representation.isArray = !0, representation.parent = adaptationSet, 
        representation.children = [], representation.properties = common, adaptationSet.children.push(representation), 
        subRepresentation = {}, subRepresentation.name = "SubRepresentation", subRepresentation.isRoot = !1, 
        subRepresentation.isArray = !0, subRepresentation.parent = representation, subRepresentation.children = [], 
        subRepresentation.properties = common, representation.children.push(subRepresentation), 
        adaptationSet;
    }, getSegmentValuesMap = function() {
        var period, adaptationSet, representation, common;
        return common = [ {
            name: "SegmentBase",
            merge: !0
        }, {
            name: "SegmentTemplate",
            merge: !0
        }, {
            name: "SegmentList",
            merge: !0
        } ], period = {}, period.name = "Period", period.isRoot = !1, period.isArray = !0, 
        period.parent = null, period.children = [], period.properties = common, adaptationSet = {}, 
        adaptationSet.name = "AdaptationSet", adaptationSet.isRoot = !1, adaptationSet.isArray = !0, 
        adaptationSet.parent = period, adaptationSet.children = [], adaptationSet.properties = common, 
        period.children.push(adaptationSet), representation = {}, representation.name = "Representation", 
        representation.isRoot = !1, representation.isArray = !0, representation.parent = adaptationSet, 
        representation.children = [], representation.properties = common, adaptationSet.children.push(representation), 
        period;
    }, getBaseUrlValuesMap = function() {
        var mpd, period, adaptationSet, representation, common;
        return common = [ {
            name: "BaseURL",
            merge: !0,
            mergeFunction: function(parentValue, childValue) {
                var mergedValue;
                return mergedValue = 0 === childValue.indexOf("http://") || 0 === childValue.indexOf("https://") ? childValue : parentValue + childValue;
            }
        } ], mpd = {}, mpd.name = "mpd", mpd.isRoot = !0, mpd.isArray = !0, mpd.parent = null, 
        mpd.children = [], mpd.properties = common, period = {}, period.name = "Period", 
        period.isRoot = !1, period.isArray = !0, period.parent = null, period.children = [], 
        period.properties = common, mpd.children.push(period), adaptationSet = {}, adaptationSet.name = "AdaptationSet", 
        adaptationSet.isRoot = !1, adaptationSet.isArray = !0, adaptationSet.parent = period, 
        adaptationSet.children = [], adaptationSet.properties = common, period.children.push(adaptationSet), 
        representation = {}, representation.name = "Representation", representation.isRoot = !1, 
        representation.isArray = !0, representation.parent = adaptationSet, representation.children = [], 
        representation.properties = common, adaptationSet.children.push(representation), 
        mpd;
    }, getDashMap = function() {
        var result = [];
        return result.push(getCommonValuesMap()), result.push(getSegmentValuesMap()), result.push(getBaseUrlValuesMap()), 
        result;
    }, internalParse = function(data, baseUrl) {
        var manifest, converter = new X2JS(matchers, "", !0), iron = new ObjectIron(getDashMap()), start = new Date(), json = null, ironed = null;
        try {
            manifest = converter.xml_str2json(data), json = new Date(), manifest.hasOwnProperty("BaseURL") ? (manifest.BaseURL = manifest.BaseURL_asArray[0], 
            0 !== manifest.BaseURL.toString().indexOf("http") && (manifest.BaseURL = baseUrl + manifest.BaseURL)) : manifest.BaseURL = baseUrl, 
            manifest.hasOwnProperty("Location") && (manifest.Location = manifest.Location_asArray[0]), 
            iron.run(manifest), ironed = new Date(), this.debug.log("Parsing complete: ( xml2json: " + (json.getTime() - start.getTime()) + "ms, objectiron: " + (ironed.getTime() - json.getTime()) + "ms, total: " + (ironed.getTime() - start.getTime()) / 1e3 + "s)");
        } catch (err) {
            return this.errHandler.manifestError("parsing the manifest failed", "parse", data), 
            null;
        }
        return manifest;
    };
    return {
        debug: void 0,
        errHandler: void 0,
        parse: internalParse
    };
}, Dash.dependencies.DashParser.prototype = {
    constructor: Dash.dependencies.DashParser
}, Dash.dependencies.FragmentExtensions = function() {
    "use strict";
    var parseTFDT = function(ab) {
        for (var base_media_decode_time, version, size, type, i, c, d = new DataView(ab), pos = 0; "tfdt" !== type && pos < d.byteLength; ) {
            for (size = d.getUint32(pos), pos += 4, type = "", i = 0; 4 > i; i += 1) c = d.getInt8(pos), 
            type += String.fromCharCode(c), pos += 1;
            "moof" !== type && "traf" !== type && "tfdt" !== type && (pos += size - 8);
        }
        if (pos === d.byteLength) throw "Error finding live offset.";
        return version = d.getUint8(pos), this.debug.log("position: " + pos), 0 === version ? (pos += 4, 
        base_media_decode_time = d.getUint32(pos, !1)) : (pos += size - 16, base_media_decode_time = utils.Math.to64BitNumber(d.getUint32(pos + 4, !1), d.getUint32(pos, !1))), 
        {
            version: version,
            base_media_decode_time: base_media_decode_time
        };
    }, parseSIDX = function(ab) {
        for (var version, timescale, earliest_presentation_time, i, type, size, charCode, d = new DataView(ab), pos = 0; "sidx" !== type && pos < d.byteLength; ) {
            for (size = d.getUint32(pos), pos += 4, type = "", i = 0; 4 > i; i += 1) charCode = d.getInt8(pos), 
            type += String.fromCharCode(charCode), pos += 1;
            "moof" !== type && "traf" !== type && "sidx" !== type ? pos += size - 8 : "sidx" === type && (pos -= 8);
        }
        return version = d.getUint8(pos + 8), pos += 12, timescale = d.getUint32(pos + 4, !1), 
        pos += 8, earliest_presentation_time = 0 === version ? d.getUint32(pos, !1) : utils.Math.to64BitNumber(d.getUint32(pos + 4, !1), d.getUint32(pos, !1)), 
        {
            earliestPresentationTime: earliest_presentation_time,
            timescale: timescale
        };
    }, loadFragment = function(media) {
        var parsed, self = this, request = new XMLHttpRequest(), url = media, loaded = !1, errorStr = "Error loading fragment: " + url, error = new MediaPlayer.vo.Error(null, errorStr, null);
        request.onloadend = function() {
            loaded || (errorStr = "Error loading fragment: " + url, self.notify(Dash.dependencies.FragmentExtensions.eventList.ENAME_FRAGMENT_LOADING_COMPLETED, {
                fragment: null
            }, error));
        }, request.onload = function() {
            loaded = !0, parsed = parseTFDT(request.response), self.notify(Dash.dependencies.FragmentExtensions.eventList.ENAME_FRAGMENT_LOADING_COMPLETED, {
                fragment: parsed
            });
        }, request.onerror = function() {
            errorStr = "Error loading fragment: " + url, self.notify(Dash.dependencies.FragmentExtensions.eventList.ENAME_FRAGMENT_LOADING_COMPLETED, {
                fragment: null
            }, error);
        }, request.responseType = "arraybuffer", request.open("GET", url), request.send(null);
    };
    return {
        debug: void 0,
        notify: void 0,
        subscribe: void 0,
        unsubscribe: void 0,
        loadFragment: loadFragment,
        parseTFDT: parseTFDT,
        parseSIDX: parseSIDX
    };
}, Dash.dependencies.FragmentExtensions.prototype = {
    constructor: Dash.dependencies.FragmentExtensions
}, Dash.dependencies.FragmentExtensions.eventList = {
    ENAME_FRAGMENT_LOADING_COMPLETED: "fragmentLoadingCompleted"
}, Dash.dependencies.RepresentationController = function() {
    "use strict";
    var currentRepresentation, data = null, dataIndex = -1, updating = !0, availableRepresentations = [], updateData = function(dataValue, adaptation, type) {
        var self = this;
        if (updating = !0, self.notify(Dash.dependencies.RepresentationController.eventList.ENAME_DATA_UPDATE_STARTED), 
        availableRepresentations = updateRepresentations.call(self, adaptation), currentRepresentation = getRepresentationForQuality.call(self, self.abrController.getQualityFor(type, self.streamProcessor.getStreamInfo())), 
        data = dataValue, "video" !== type && "audio" !== type) return self.notify(Dash.dependencies.RepresentationController.eventList.ENAME_DATA_UPDATE_COMPLETED, {
            data: data,
            currentRepresentation: currentRepresentation
        }), void addRepresentationSwitch.call(self);
        for (var i = 0; i < availableRepresentations.length; i += 1) self.indexHandler.updateRepresentation(availableRepresentations[i], !0);
    }, addRepresentationSwitch = function() {
        var now = new Date(), currentRepresentation = this.getCurrentRepresentation(), currentVideoTime = this.streamProcessor.playbackController.getTime();
        this.metricsModel.addTrackSwitch(currentRepresentation.adaptation.type, now, currentVideoTime, currentRepresentation.id);
    }, addDVRMetric = function() {
        var streamProcessor = this.streamProcessor, range = this.timelineConverter.calcSegmentAvailabilityRange(currentRepresentation, streamProcessor.isDynamic());
        this.metricsModel.addDVRInfo(streamProcessor.getType(), streamProcessor.playbackController.getTime(), streamProcessor.getStreamInfo().manifestInfo, range);
    }, getRepresentationForQuality = function(quality) {
        return availableRepresentations[quality];
    }, isAllRepresentationsUpdated = function() {
        for (var i = 0, ln = availableRepresentations.length; ln > i; i += 1) if (null === availableRepresentations[i].segmentAvailabilityRange || null === availableRepresentations[i].initialization) return !1;
        return !0;
    }, updateRepresentations = function(adaptation) {
        var reps, self = this, manifest = self.manifestModel.getValue();
        return dataIndex = self.manifestExt.getIndexForAdaptation(data, manifest, adaptation.period.index), 
        reps = self.manifestExt.getRepresentationsForAdaptation(manifest, adaptation);
    }, updateAvailabilityWindow = function(isDynamic) {
        for (var rep, self = this, i = 0, ln = availableRepresentations.length; ln > i; i += 1) rep = availableRepresentations[i], 
        rep.segmentAvailabilityRange = self.timelineConverter.calcSegmentAvailabilityRange(rep, isDynamic);
    }, postponeUpdate = function(availabilityDelay) {
        var self = this, delay = 1e3 * (availabilityDelay + 3 * currentRepresentation.segmentDuration), update = function() {
            if (!this.isUpdating()) {
                updating = !0, self.notify(Dash.dependencies.RepresentationController.eventList.ENAME_DATA_UPDATE_STARTED);
                for (var i = 0; i < availableRepresentations.length; i += 1) self.indexHandler.updateRepresentation(availableRepresentations[i], !0);
            }
        };
        updating = !1, setTimeout(update.bind(this), delay);
    }, onRepresentationUpdated = function(e) {
        if (this.isUpdating()) {
            var repInfo, err, self = this, r = e.data.representation, metrics = self.metricsModel.getMetricsFor("stream"), manifestUpdateInfo = self.metricsExt.getCurrentManifestUpdate(metrics), alreadyAdded = !1;
            if (e.error && e.error.code === Dash.dependencies.DashHandler.SEGMENTS_UNAVAILABLE_ERROR_CODE) return addDVRMetric.call(this), 
            postponeUpdate.call(this, e.error.data.availabilityDelay), err = new MediaPlayer.vo.Error(Dash.dependencies.RepresentationController.SEGMENTS_UPDATE_FAILED_ERROR_CODE, "Segments update failed", null), 
            void this.notify(Dash.dependencies.RepresentationController.eventList.ENAME_DATA_UPDATE_COMPLETED, {
                data: data,
                currentRepresentation: currentRepresentation
            }, err);
            for (var i = 0; i < manifestUpdateInfo.trackInfo.length; i += 1) if (repInfo = manifestUpdateInfo.trackInfo[i], 
            repInfo.index === r.index && repInfo.mediaType === self.streamProcessor.getType()) {
                alreadyAdded = !0;
                break;
            }
            alreadyAdded || self.metricsModel.addManifestUpdateTrackInfo(manifestUpdateInfo, r.id, r.index, r.adaptation.period.index, self.streamProcessor.getType(), r.presentationTimeOffset, r.startNumber, r.segmentInfoType), 
            isAllRepresentationsUpdated() && (updating = !1, self.metricsModel.updateManifestUpdateInfo(manifestUpdateInfo, {
                latency: currentRepresentation.segmentAvailabilityRange.end - self.streamProcessor.playbackController.getTime()
            }), this.notify(Dash.dependencies.RepresentationController.eventList.ENAME_DATA_UPDATE_COMPLETED, {
                data: data,
                currentRepresentation: currentRepresentation
            }), addRepresentationSwitch.call(self));
        }
    }, onWallclockTimeUpdated = function(e) {
        updateAvailabilityWindow.call(this, e.data.isDynamic);
    }, onLiveEdgeSearchCompleted = function(e) {
        if (!e.error) {
            updateAvailabilityWindow.call(this, !0), this.indexHandler.updateRepresentation(currentRepresentation, !1);
            var manifest = this.manifestModel.getValue();
            currentRepresentation.adaptation.period.mpd.checkTime = this.manifestExt.getCheckTime(manifest, currentRepresentation.adaptation.period);
        }
    }, onBufferLevelUpdated = function() {
        addDVRMetric.call(this);
    }, onQualityChanged = function(e) {
        var self = this;
        e.data.mediaType === self.streamProcessor.getType() && self.streamProcessor.getStreamInfo().id === e.data.streamInfo.id && (currentRepresentation = self.getRepresentationForQuality(e.data.newQuality), 
        addRepresentationSwitch.call(self));
    };
    return {
        system: void 0,
        debug: void 0,
        manifestExt: void 0,
        manifestModel: void 0,
        metricsModel: void 0,
        metricsExt: void 0,
        abrController: void 0,
        timelineConverter: void 0,
        notify: void 0,
        subscribe: void 0,
        unsubscribe: void 0,
        setup: function() {
            this[MediaPlayer.dependencies.AbrController.eventList.ENAME_QUALITY_CHANGED] = onQualityChanged, 
            this[Dash.dependencies.DashHandler.eventList.ENAME_REPRESENTATION_UPDATED] = onRepresentationUpdated, 
            this[MediaPlayer.dependencies.PlaybackController.eventList.ENAME_WALLCLOCK_TIME_UPDATED] = onWallclockTimeUpdated, 
            this[MediaPlayer.dependencies.LiveEdgeFinder.eventList.ENAME_LIVE_EDGE_SEARCH_COMPLETED] = onLiveEdgeSearchCompleted, 
            this[MediaPlayer.dependencies.BufferController.eventList.ENAME_BUFFER_LEVEL_UPDATED] = onBufferLevelUpdated;
        },
        initialize: function(streamProcessor) {
            this.streamProcessor = streamProcessor, this.indexHandler = streamProcessor.indexHandler;
        },
        getData: function() {
            return data;
        },
        getDataIndex: function() {
            return dataIndex;
        },
        isUpdating: function() {
            return updating;
        },
        updateData: updateData,
        getRepresentationForQuality: getRepresentationForQuality,
        getCurrentRepresentation: function() {
            return currentRepresentation;
        }
    };
}, Dash.dependencies.RepresentationController.prototype = {
    constructor: Dash.dependencies.RepresentationController
}, Dash.dependencies.RepresentationController.SEGMENTS_UPDATE_FAILED_ERROR_CODE = 1, 
Dash.dependencies.RepresentationController.eventList = {
    ENAME_DATA_UPDATE_COMPLETED: "dataUpdateCompleted",
    ENAME_DATA_UPDATE_STARTED: "dataUpdateStarted"
}, Dash.dependencies.TimelineConverter = function() {
    "use strict";
    var clientServerTimeShift = 0, isClientServerTimeSyncCompleted = !1, expectedLiveEdge = 0/0, calcAvailabilityTimeFromPresentationTime = function(presentationTime, mpd, isDynamic, calculateEnd) {
        var availabilityTime = 0/0;
        return availabilityTime = calculateEnd ? isDynamic && mpd.timeShiftBufferDepth != Number.POSITIVE_INFINITY ? new Date(mpd.availabilityStartTime.getTime() + 1e3 * (presentationTime + mpd.timeShiftBufferDepth)) : mpd.availabilityEndTime : isDynamic ? new Date(mpd.availabilityStartTime.getTime() + 1e3 * (presentationTime - clientServerTimeShift)) : mpd.availabilityStartTime;
    }, calcAvailabilityStartTimeFromPresentationTime = function(presentationTime, mpd, isDynamic) {
        return calcAvailabilityTimeFromPresentationTime.call(this, presentationTime, mpd, isDynamic);
    }, calcAvailabilityEndTimeFromPresentationTime = function(presentationTime, mpd, isDynamic) {
        return calcAvailabilityTimeFromPresentationTime.call(this, presentationTime, mpd, isDynamic, !0);
    }, calcPresentationTimeFromWallTime = function(wallTime, period) {
        return (wallTime.getTime() - period.mpd.availabilityStartTime.getTime() + 1e3 * clientServerTimeShift) / 1e3;
    }, calcPresentationTimeFromMediaTime = function(mediaTime, representation) {
        var periodStart = representation.adaptation.period.start, presentationOffset = representation.presentationTimeOffset;
        return mediaTime + (periodStart - presentationOffset);
    }, calcMediaTimeFromPresentationTime = function(presentationTime, representation) {
        var periodStart = representation.adaptation.period.start, presentationOffset = representation.presentationTimeOffset;
        return presentationTime - periodStart + presentationOffset;
    }, calcWallTimeForSegment = function(segment, isDynamic) {
        var suggestedPresentationDelay, displayStartTime, wallTime;
        return isDynamic && (suggestedPresentationDelay = segment.representation.adaptation.period.mpd.suggestedPresentationDelay, 
        displayStartTime = segment.presentationStartTime + suggestedPresentationDelay, wallTime = new Date(segment.availabilityStartTime.getTime() + 1e3 * displayStartTime)), 
        wallTime;
    }, calcSegmentAvailabilityRange = function(representation, isDynamic) {
        var now, start = representation.adaptation.period.start, end = start + representation.adaptation.period.duration, range = {
            start: start,
            end: end
        };
        return isDynamic ? !isClientServerTimeSyncCompleted && representation.segmentAvailabilityRange ? representation.segmentAvailabilityRange : (now = calcPresentationTimeFromWallTime(new Date(new Date().getTime()), representation.adaptation.period), 
        start = Math.max(now - representation.adaptation.period.mpd.timeShiftBufferDepth, 0), 
        end = now, range = {
            start: start,
            end: end
        }) : range;
    }, calcPeriodRelativeTimeFromMpdRelativeTime = function(representation, mpdRelativeTime) {
        var periodStartTime = representation.adaptation.period.start;
        return mpdRelativeTime - periodStartTime;
    }, calcMpdRelativeTimeFromPeriodRelativeTime = function(representation, periodRelativeTime) {
        var periodStartTime = representation.adaptation.period.start;
        return periodRelativeTime + periodStartTime;
    }, onLiveEdgeSearchCompleted = function(e) {
        isClientServerTimeSyncCompleted || e.error || (clientServerTimeShift = e.data.liveEdge - (expectedLiveEdge + e.data.searchTime), 
        isClientServerTimeSyncCompleted = !0);
    }, calcMSETimeOffset = function(representation) {
        var presentationOffset = representation.presentationTimeOffset, periodStart = representation.adaptation.period.start;
        return periodStart - presentationOffset;
    }, reset = function() {
        clientServerTimeShift = 0, isClientServerTimeSyncCompleted = !1, expectedLiveEdge = 0/0;
    };
    return {
        notifier: void 0,
        uriQueryFragModel: void 0,
        setup: function() {
            this[MediaPlayer.dependencies.LiveEdgeFinder.eventList.ENAME_LIVE_EDGE_SEARCH_COMPLETED] = onLiveEdgeSearchCompleted;
        },
        calcAvailabilityStartTimeFromPresentationTime: calcAvailabilityStartTimeFromPresentationTime,
        calcAvailabilityEndTimeFromPresentationTime: calcAvailabilityEndTimeFromPresentationTime,
        calcPresentationTimeFromWallTime: calcPresentationTimeFromWallTime,
        calcPresentationTimeFromMediaTime: calcPresentationTimeFromMediaTime,
        calcPeriodRelativeTimeFromMpdRelativeTime: calcPeriodRelativeTimeFromMpdRelativeTime,
        calcMpdRelativeTimeFromPeriodRelativeTime: calcMpdRelativeTimeFromPeriodRelativeTime,
        calcMediaTimeFromPresentationTime: calcMediaTimeFromPresentationTime,
        calcSegmentAvailabilityRange: calcSegmentAvailabilityRange,
        calcWallTimeForSegment: calcWallTimeForSegment,
        calcMSETimeOffset: calcMSETimeOffset,
        reset: reset,
        isTimeSyncCompleted: function() {
            return isClientServerTimeSyncCompleted;
        },
        getClientTimeOffset: function() {
            return clientServerTimeShift;
        },
        getExpectedLiveEdge: function() {
            return expectedLiveEdge;
        },
        setExpectedLiveEdge: function(value) {
            expectedLiveEdge = value;
        }
    };
}, Dash.dependencies.TimelineConverter.prototype = {
    constructor: Dash.dependencies.TimelineConverter
}, Dash.vo.AdaptationSet = function() {
    "use strict";
    this.period = null, this.index = -1, this.type = null;
}, Dash.vo.AdaptationSet.prototype = {
    constructor: Dash.vo.AdaptationSet
}, Dash.vo.Event = function() {
    "use strict";
    this.duration = 0/0, this.presentationTime = 0/0, this.id = 0/0, this.messageData = "", 
    this.eventStream = null, this.presentationTimeDelta = 0/0;
}, Dash.vo.Event.prototype = {
    constructor: Dash.vo.Event
}, Dash.vo.EventStream = function() {
    "use strict";
    this.adaptionSet = null, this.representation = null, this.period = null, this.timescale = 1, 
    this.value = "", this.schemeIdUri = "";
}, Dash.vo.EventStream.prototype = {
    constructor: Dash.vo.EventStream
}, Dash.vo.Mpd = function() {
    "use strict";
    this.manifest = null, this.suggestedPresentationDelay = 0, this.availabilityStartTime = null, 
    this.availabilityEndTime = Number.POSITIVE_INFINITY, this.timeShiftBufferDepth = Number.POSITIVE_INFINITY, 
    this.maxSegmentDuration = Number.POSITIVE_INFINITY, this.checkTime = 0/0, this.clientServerTimeShift = 0, 
    this.isClientServerTimeSyncCompleted = !1;
}, Dash.vo.Mpd.prototype = {
    constructor: Dash.vo.Mpd
}, Dash.vo.Period = function() {
    "use strict";
    this.id = null, this.index = -1, this.duration = 0/0, this.start = 0/0, this.mpd = null;
}, Dash.vo.Period.prototype = {
    constructor: Dash.vo.Period
}, Dash.vo.Representation = function() {
    "use strict";
    this.id = null, this.index = -1, this.adaptation = null, this.segmentInfoType = null, 
    this.initialization = null, this.segmentDuration = 0/0, this.timescale = 1, this.startNumber = 1, 
    this.indexRange = null, this.range = null, this.presentationTimeOffset = 0, this.MSETimeOffset = 0/0, 
    this.segmentAvailabilityRange = null, this.availableSegmentsNumber = 0;
}, Dash.vo.Representation.prototype = {
    constructor: Dash.vo.Representation
}, Dash.vo.Segment = function() {
    "use strict";
    this.indexRange = null, this.index = null, this.mediaRange = null, this.media = null, 
    this.duration = 0/0, this.replacementTime = null, this.replacementNumber = 0/0, 
    this.mediaStartTime = 0/0, this.presentationStartTime = 0/0, this.availabilityStartTime = 0/0, 
    this.availabilityEndTime = 0/0, this.availabilityIdx = 0/0, this.wallStartTime = 0/0, 
    this.representation = null;
}, Dash.vo.Segment.prototype = {
    constructor: Dash.vo.Segment
}, MediaPlayer.dependencies.AbrController = function() {
    "use strict";
    var autoSwitchBitrate = !0, topQualities = {}, qualityDict = {}, confidenceDict = {}, getInternalQuality = function(type, id) {
        var quality;
        return qualityDict[id] = qualityDict[id] || {}, qualityDict[id].hasOwnProperty(type) || (qualityDict[id][type] = Math.floor(getTopQualityIndex(type, id) / 2)), 
        quality = qualityDict[id][type];
    }, setInternalQuality = function(type, id, value) {
        qualityDict[id] = qualityDict[id] || {}, qualityDict[id][type] = value;
    }, getInternalConfidence = function(type, id) {
        var confidence;
        return confidenceDict[id] = confidenceDict[id] || {}, confidenceDict[id].hasOwnProperty(type) || (confidenceDict[id][type] = 0), 
        confidence = confidenceDict[id][type];
    }, setInternalConfidence = function(type, id, value) {
        confidenceDict[id] = confidenceDict[id] || {}, confidenceDict[id][type] = value;
    }, setTopQualityIndex = function(type, id, value) {
        topQualities[id] = topQualities[id] || {}, topQualities[id][type] = value;
    }, getTopQualityIndex = function(type, id) {
        var idx;
        return topQualities[id] = topQualities[id] || {}, topQualities[id].hasOwnProperty(type) || (topQualities[id][type] = 0), 
        idx = topQualities[id][type];
    }, onDataUpdateCompleted = function(e) {
        if (!e.error) {
            var max, self = this, mediaInfo = this.adapter.convertDataToTrack(e.data.currentRepresentation).mediaInfo, type = mediaInfo.type, streamId = mediaInfo.streamInfo.id;
            max = mediaInfo.trackCount - 1, getTopQualityIndex(type, streamId) !== max && (setTopQualityIndex(type, streamId, max), 
            self.notify(MediaPlayer.dependencies.AbrController.eventList.ENAME_TOP_QUALITY_INDEX_CHANGED, {
                mediaType: type,
                streamInfo: mediaInfo.streamInfo,
                maxIndex: max
            }));
        }
    };
    return {
        debug: void 0,
        adapter: void 0,
        abrRulesCollection: void 0,
        rulesController: void 0,
        notify: void 0,
        subscribe: void 0,
        unsubscribe: void 0,
        setup: function() {
            this[Dash.dependencies.RepresentationController.eventList.ENAME_DATA_UPDATE_COMPLETED] = onDataUpdateCompleted;
        },
        getAutoSwitchBitrate: function() {
            return autoSwitchBitrate;
        },
        setAutoSwitchBitrate: function(value) {
            autoSwitchBitrate = value;
        },
        getPlaybackQuality: function(streamProcessor) {
            var quality, oldQuality, rules, confidence, self = this, type = streamProcessor.getType(), streamId = streamProcessor.getStreamInfo().id, callback = function(res) {
                var topQualityIdx = getTopQualityIndex(type, streamId);
                quality = res.value, confidence = res.confidence, 0 > quality && (quality = 0), 
                quality > topQualityIdx && (quality = topQualityIdx), oldQuality = getInternalQuality(type, streamId), 
                quality !== oldQuality && (setInternalQuality(type, streamId, quality), setInternalConfidence(type, streamId, confidence), 
                self.notify(MediaPlayer.dependencies.AbrController.eventList.ENAME_QUALITY_CHANGED, {
                    mediaType: type,
                    streamInfo: streamProcessor.getStreamInfo(),
                    oldQuality: oldQuality,
                    newQuality: quality
                }));
            };
            quality = getInternalQuality(type, streamId), confidence = getInternalConfidence(type, streamId), 
            autoSwitchBitrate && (self.abrRulesCollection.downloadRatioRule && self.abrRulesCollection.downloadRatioRule.setStreamProcessor(streamProcessor), 
            rules = self.abrRulesCollection.getRules(MediaPlayer.rules.ABRRulesCollection.prototype.QUALITY_SWITCH_RULES), 
            self.rulesController.applyRules(rules, streamProcessor, callback.bind(self), quality, function(currentValue, newValue) {
                return Math.min(currentValue, newValue);
            }));
        },
        setPlaybackQuality: function(type, streamInfo, newPlaybackQuality) {
            var id = streamInfo.id, quality = getInternalQuality(type, id), isInt = null !== newPlaybackQuality && !isNaN(newPlaybackQuality) && newPlaybackQuality % 1 === 0;
            if (!isInt) throw "argument is not an integer";
            newPlaybackQuality !== quality && newPlaybackQuality >= 0 && topQualities[id].hasOwnProperty(type) && newPlaybackQuality <= topQualities[id][type] && (setInternalQuality(type, streamInfo.id, newPlaybackQuality), 
            this.notify(MediaPlayer.dependencies.AbrController.eventList.ENAME_QUALITY_CHANGED, {
                mediaType: type,
                streamInfo: streamInfo,
                oldQuality: quality,
                newQuality: newPlaybackQuality
            }));
        },
        getQualityFor: function(type, streamInfo) {
            return getInternalQuality(type, streamInfo.id);
        },
        getConfidenceFor: function(type, streamInfo) {
            return getInternalConfidence(type, streamInfo.id);
        },
        isPlayingAtTopQuality: function(streamInfo) {
            var isAtTop, self = this, streamId = streamInfo.id, audioQuality = self.getQualityFor("audio", streamInfo), videoQuality = self.getQualityFor("video", streamInfo);
            return isAtTop = audioQuality === getTopQualityIndex("audio", streamId) && videoQuality === getTopQualityIndex("video", streamId);
        },
        reset: function() {
            autoSwitchBitrate = !0, topQualities = {}, qualityDict = {}, confidenceDict = {};
        }
    };
}, MediaPlayer.dependencies.AbrController.prototype = {
    constructor: MediaPlayer.dependencies.AbrController
}, MediaPlayer.dependencies.AbrController.eventList = {
    ENAME_QUALITY_CHANGED: "qualityChanged",
    ENAME_TOP_QUALITY_INDEX_CHANGED: "topQualityIndexChanged"
}, MediaPlayer.dependencies.BufferController = function() {
    "use strict";
    var mediaSource, type, minBufferTime, appendedBytesInfo, STALL_THRESHOLD = .5, initializationData = [], requiredQuality = 0, currentQuality = -1, isBufferingCompleted = !1, bufferLevel = 0, criticalBufferLevel = Number.POSITIVE_INFINITY, maxAppendedIndex = -1, lastIndex = -1, buffer = null, hasSufficientBuffer = null, isBufferLevelOutrun = !1, isAppendingInProgress = !1, pendingMedia = [], inbandEventFound = !1, waitingForInit = function() {
        var loadingReqs = this.streamProcessor.getFragmentModel().getLoadingRequests();
        return currentQuality > requiredQuality && (hasReqsForQuality(pendingMedia, currentQuality) || hasReqsForQuality(loadingReqs, currentQuality)) ? !1 : currentQuality !== requiredQuality;
    }, hasReqsForQuality = function(arr, quality) {
        var i = 0, ln = arr.length;
        for (i; ln > i; i += 1) if (arr[i].quality === quality) return !0;
        return !1;
    }, sortArrayByProperty = function(array, sortProp) {
        var compare = function(obj1, obj2) {
            return obj1[sortProp] < obj2[sortProp] ? -1 : obj1[sortProp] > obj2[sortProp] ? 1 : 0;
        };
        array.sort(compare);
    }, onInitializationLoaded = function(e) {
        var self = this;
        e.data.fragmentModel === self.streamProcessor.getFragmentModel() && (self.debug.log("Initialization finished loading: " + type), 
        initializationData[e.data.quality] = e.data.bytes, e.data.quality === requiredQuality && waitingForInit.call(self) && switchInitData.call(self));
    }, onMediaLoaded = function(e) {
        if (e.data.fragmentModel === this.streamProcessor.getFragmentModel()) {
            var events, bytes = e.data.bytes, quality = e.data.quality, index = e.data.index, request = this.streamProcessor.getFragmentModel().getExecutedRequestForQualityAndIndex(quality, index), currentTrack = this.streamProcessor.getTrackForQuality(quality), eventStreamMedia = this.adapter.getEventsFor(currentTrack.mediaInfo, this.streamProcessor), eventStreamTrack = this.adapter.getEventsFor(currentTrack, this.streamProcessor);
            (eventStreamMedia.length > 0 || eventStreamTrack.length > 0) && (events = handleInbandEvents.call(this, bytes, request, eventStreamMedia, eventStreamTrack), 
            this.streamProcessor.getEventController().addInbandEvents(events)), bytes = deleteInbandEvents.call(this, bytes), 
            pendingMedia.push({
                bytes: bytes,
                quality: quality,
                index: index
            }), sortArrayByProperty(pendingMedia, "index"), appendNext.call(this);
        }
    }, appendToBuffer = function(data, quality, index) {
        isAppendingInProgress = !0, appendedBytesInfo = {
            quality: quality,
            index: index
        };
        var self = this, isInit = isNaN(index);
        return quality !== requiredQuality && isInit || quality !== currentQuality && !isInit ? void onMediaRejected.call(self, quality, index) : void self.sourceBufferExt.append(buffer, data);
    }, onAppended = function(e) {
        if (buffer === e.data.buffer) {
            this.isBufferingCompleted() && this.streamProcessor.getStreamInfo().isLast && this.mediaSourceExt.signalEndOfStream(mediaSource);
            var ranges, self = this;
            if (e.error) return e.error.code === MediaPlayer.dependencies.SourceBufferExtensions.QUOTA_EXCEEDED_ERROR_CODE && (pendingMedia.unshift({
                bytes: e.data.bytes,
                quality: appendedBytesInfo.quality,
                index: appendedBytesInfo.index
            }), criticalBufferLevel = .8 * getTotalBufferedTime.call(self), self.notify(MediaPlayer.dependencies.BufferController.eventList.ENAME_QUOTA_EXCEEDED, {
                criticalBufferLevel: criticalBufferLevel
            }), clearBuffer.call(self)), void (isAppendingInProgress = !1);
            if (updateBufferLevel.call(self), hasEnoughSpaceToAppend.call(self) || (self.notify(MediaPlayer.dependencies.BufferController.eventList.ENAME_QUOTA_EXCEEDED, {
                criticalBufferLevel: criticalBufferLevel
            }), clearBuffer.call(self)), ranges = self.sourceBufferExt.getAllRanges(buffer), 
            ranges && ranges.length > 0) {
                var i, len;
                for (i = 0, len = ranges.length; len > i; i += 1) self.debug.log("Buffered " + type + " Range: " + ranges.start(i) + " - " + ranges.end(i));
            }
            onAppendToBufferCompleted.call(self, appendedBytesInfo.quality, appendedBytesInfo.index), 
            self.notify(MediaPlayer.dependencies.BufferController.eventList.ENAME_BYTES_APPENDED, {
                quality: appendedBytesInfo.quality,
                index: appendedBytesInfo.index,
                bufferedRanges: ranges
            });
        }
    }, updateBufferLevel = function() {
        var self = this, currentTime = self.playbackController.getTime();
        return bufferLevel = self.sourceBufferExt.getBufferLength(buffer, currentTime), 
        self.notify(MediaPlayer.dependencies.BufferController.eventList.ENAME_BUFFER_LEVEL_UPDATED, {
            bufferLevel: bufferLevel
        }), checkGapBetweenBuffers.call(self), checkIfSufficientBuffer.call(self), STALL_THRESHOLD > bufferLevel && notifyIfSufficientBufferStateChanged.call(self, !1), 
        !0;
    }, handleInbandEvents = function(data, request, mediaInbandEvents, trackInbandEvents) {
        var identifier, size, event, inbandEvents, events = [], i = 0, expTwo = Math.pow(256, 2), expThree = Math.pow(256, 3), fragmentStarttime = Math.max(isNaN(request.startTime) ? 0 : request.startTime, 0), eventStreams = [];
        inbandEventFound = !1, inbandEvents = mediaInbandEvents.concat(trackInbandEvents);
        for (var loop = 0; loop < inbandEvents.length; loop++) eventStreams[inbandEvents[loop].schemeIdUri] = inbandEvents[loop];
        for (;i < data.length && (identifier = String.fromCharCode(data[i + 4], data[i + 5], data[i + 6], data[i + 7]), 
        size = data[i] * expThree + data[i + 1] * expTwo + 256 * data[i + 2] + 1 * data[i + 3], 
        "moov" != identifier && "moof" != identifier); ) {
            if ("emsg" == identifier) {
                inbandEventFound = !0;
                for (var eventBox = [ "", "", 0, 0, 0, 0, "" ], arrIndex = 0, j = i + 12; size + i > j; ) 0 === arrIndex || 1 == arrIndex || 6 == arrIndex ? (0 !== data[j] ? eventBox[arrIndex] += String.fromCharCode(data[j]) : arrIndex += 1, 
                j += 1) : (eventBox[arrIndex] = data[j] * expThree + data[j + 1] * expTwo + 256 * data[j + 2] + 1 * data[j + 3], 
                j += 4, arrIndex += 1);
                event = this.adapter.getEvent(eventBox, eventStreams, fragmentStarttime), event && events.push(event);
            }
            i += size;
        }
        return events;
    }, deleteInbandEvents = function(data) {
        if (!inbandEventFound) return data;
        for (var identifier, size, length = data.length, i = 0, j = 0, expTwo = Math.pow(256, 2), expThree = Math.pow(256, 3), modData = new Uint8Array(data.length); length > i; ) {
            if (identifier = String.fromCharCode(data[i + 4], data[i + 5], data[i + 6], data[i + 7]), 
            size = data[i] * expThree + data[i + 1] * expTwo + 256 * data[i + 2] + 1 * data[i + 3], 
            "emsg" != identifier) for (var l = i; i + size > l; l++) modData[j] = data[l], j += 1;
            i += size;
        }
        return modData.subarray(0, j);
    }, checkGapBetweenBuffers = function() {
        var leastLevel = getLeastBufferLevel.call(this), acceptableGap = 2 * minBufferTime, actualGap = bufferLevel - leastLevel;
        actualGap >= acceptableGap && !isBufferLevelOutrun ? (isBufferLevelOutrun = !0, 
        this.notify(MediaPlayer.dependencies.BufferController.eventList.ENAME_BUFFER_LEVEL_OUTRUN)) : acceptableGap / 2 > actualGap && isBufferLevelOutrun && (this.notify(MediaPlayer.dependencies.BufferController.eventList.ENAME_BUFFER_LEVEL_BALANCED), 
        isBufferLevelOutrun = !1, appendNext.call(this));
    }, getLeastBufferLevel = function() {
        var videoMetrics = this.metricsModel.getReadOnlyMetricsFor("video"), videoBufferLevel = this.metricsExt.getCurrentBufferLevel(videoMetrics), audioMetrics = this.metricsModel.getReadOnlyMetricsFor("audio"), audioBufferLevel = this.metricsExt.getCurrentBufferLevel(audioMetrics), leastLevel = null;
        return leastLevel = null === videoBufferLevel || null === audioBufferLevel ? null !== audioBufferLevel ? audioBufferLevel.level : null !== videoBufferLevel ? videoBufferLevel.level : null : Math.min(audioBufferLevel.level, videoBufferLevel.level);
    }, hasEnoughSpaceToAppend = function() {
        var self = this, totalBufferedTime = getTotalBufferedTime.call(self);
        return criticalBufferLevel > totalBufferedTime;
    }, clearBuffer = function() {
        var currentTime, removeStart, removeEnd, range, req, self = this;
        buffer && (currentTime = self.playbackController.getTime(), req = self.fragmentController.getExecutedRequestForTime(self.streamProcessor.getFragmentModel(), currentTime), 
        removeEnd = req && !isNaN(req.startTime) ? req.startTime : Math.floor(currentTime), 
        range = self.sourceBufferExt.getBufferRange(buffer, currentTime), null === range && buffer.buffered.length > 0 && (removeEnd = buffer.buffered.end(buffer.buffered.length - 1)), 
        removeStart = buffer.buffered.start(0), self.sourceBufferExt.remove(buffer, removeStart, removeEnd, mediaSource));
    }, onRemoved = function(e) {
        buffer === e.data.buffer && (updateBufferLevel.call(this), this.notify(MediaPlayer.dependencies.BufferController.eventList.ENAME_BUFFER_CLEARED, {
            from: e.data.from,
            to: e.data.to,
            hasEnoughSpaceToAppend: hasEnoughSpaceToAppend.call(this)
        }), hasEnoughSpaceToAppend.call(this) || setTimeout(clearBuffer.bind(this), 1e3 * minBufferTime));
    }, getTotalBufferedTime = function() {
        var ln, i, self = this, ranges = self.sourceBufferExt.getAllRanges(buffer), totalBufferedTime = 0;
        if (!ranges) return totalBufferedTime;
        for (i = 0, ln = ranges.length; ln > i; i += 1) totalBufferedTime += ranges.end(i) - ranges.start(i);
        return totalBufferedTime;
    }, checkIfBufferingCompleted = function() {
        var isLastIdxAppended = maxAppendedIndex === lastIndex - 1;
        isLastIdxAppended && !isBufferingCompleted && (isBufferingCompleted = !0, this.notify(MediaPlayer.dependencies.BufferController.eventList.ENAME_BUFFERING_COMPLETED));
    }, checkIfSufficientBuffer = function() {
        var timeToEnd = this.playbackController.getTimeToStreamEnd(), minLevel = this.streamProcessor.isDynamic() ? minBufferTime / 2 : minBufferTime;
        minLevel > bufferLevel && (timeToEnd > minBufferTime || minBufferTime >= timeToEnd && !isBufferingCompleted) ? notifyIfSufficientBufferStateChanged.call(this, !1) : notifyIfSufficientBufferStateChanged.call(this, !0);
    }, notifyIfSufficientBufferStateChanged = function(state) {
        hasSufficientBuffer !== state && (hasSufficientBuffer = state, this.debug.log(hasSufficientBuffer ? "Got enough " + type + " buffer to start." : "Waiting for more " + type + " buffer before starting playback."), 
        this.eventBus.dispatchEvent({
            type: hasSufficientBuffer ? "bufferLoaded" : "bufferStalled",
            data: {
                bufferType: type
            }
        }), this.notify(MediaPlayer.dependencies.BufferController.eventList.ENAME_BUFFER_LEVEL_STATE_CHANGED, {
            hasSufficientBuffer: state
        }));
    }, updateBufferTimestampOffset = function(MSETimeOffset) {
        buffer.timestampOffset !== MSETimeOffset && (buffer.timestampOffset = MSETimeOffset);
    }, updateBufferState = function() {
        var self = this;
        updateBufferLevel.call(self), appendNext.call(self);
    }, appendNext = function() {
        waitingForInit.call(this) ? switchInitData.call(this) : appendNextMedia.call(this);
    }, onAppendToBufferCompleted = function(quality, index) {
        isAppendingInProgress = !1, isNaN(index) ? onInitAppended.call(this, quality) : onMediaAppended.call(this, index), 
        appendNext.call(this);
    }, onMediaRejected = function(quality, index) {
        isAppendingInProgress = !1, this.notify(MediaPlayer.dependencies.BufferController.eventList.ENAME_BYTES_REJECTED, {
            quality: quality,
            index: index
        }), appendNext.call(this);
    }, onInitAppended = function(quality) {
        currentQuality = quality;
    }, onMediaAppended = function(index) {
        maxAppendedIndex = Math.max(index, maxAppendedIndex), checkIfBufferingCompleted.call(this);
    }, appendNextMedia = function() {
        var data;
        0 === pendingMedia.length || isBufferLevelOutrun || isAppendingInProgress || waitingForInit.call(this) || !hasEnoughSpaceToAppend.call(this) || (data = pendingMedia.shift(), 
        appendToBuffer.call(this, data.bytes, data.quality, data.index));
    }, onDataUpdateCompleted = function(e) {
        if (!e.error) {
            var bufferLength, self = this;
            updateBufferTimestampOffset.call(self, e.data.currentRepresentation.MSETimeOffset), 
            bufferLength = self.streamProcessor.getStreamInfo().manifestInfo.minBufferTime, 
            minBufferTime !== bufferLength && (self.setMinBufferTime(bufferLength), self.notify(MediaPlayer.dependencies.BufferController.eventList.ENAME_MIN_BUFFER_TIME_UPDATED, {
                minBufferTime: bufferLength
            }));
        }
    }, onStreamCompleted = function(e) {
        var self = this;
        e.data.fragmentModel === self.streamProcessor.getFragmentModel() && (lastIndex = e.data.request.index, 
        checkIfBufferingCompleted.call(self));
    }, onQualityChanged = function(e) {
        if (type === e.data.mediaType && this.streamProcessor.getStreamInfo().id === e.data.streamInfo.id) {
            var self = this, newQuality = e.data.newQuality;
            requiredQuality !== newQuality && (updateBufferTimestampOffset.call(self, self.streamProcessor.getTrackForQuality(newQuality).MSETimeOffset), 
            requiredQuality = newQuality, waitingForInit.call(self) && switchInitData.call(self));
        }
    }, switchInitData = function() {
        var self = this;
        if (initializationData[requiredQuality]) {
            if (isAppendingInProgress) return;
            appendToBuffer.call(self, initializationData[requiredQuality], requiredQuality);
        } else self.notify(MediaPlayer.dependencies.BufferController.eventList.ENAME_INIT_REQUESTED, {
            requiredQuality: requiredQuality
        });
    }, onWallclockTimeUpdated = function() {
        appendNext.call(this);
    }, onPlaybackRateChanged = function() {
        checkIfSufficientBuffer.call(this);
    };
    return {
        manifestModel: void 0,
        sourceBufferExt: void 0,
        eventBus: void 0,
        bufferMax: void 0,
        mediaSourceExt: void 0,
        metricsModel: void 0,
        metricsExt: void 0,
        adapter: void 0,
        debug: void 0,
        system: void 0,
        notify: void 0,
        subscribe: void 0,
        unsubscribe: void 0,
        setup: function() {
            this[Dash.dependencies.RepresentationController.eventList.ENAME_DATA_UPDATE_COMPLETED] = onDataUpdateCompleted, 
            this[MediaPlayer.dependencies.FragmentController.eventList.ENAME_INIT_FRAGMENT_LOADED] = onInitializationLoaded, 
            this[MediaPlayer.dependencies.FragmentController.eventList.ENAME_MEDIA_FRAGMENT_LOADED] = onMediaLoaded, 
            this[MediaPlayer.dependencies.FragmentController.eventList.ENAME_STREAM_COMPLETED] = onStreamCompleted, 
            this[MediaPlayer.dependencies.AbrController.eventList.ENAME_QUALITY_CHANGED] = onQualityChanged, 
            this[MediaPlayer.dependencies.PlaybackController.eventList.ENAME_PLAYBACK_PROGRESS] = updateBufferState, 
            this[MediaPlayer.dependencies.PlaybackController.eventList.ENAME_PLAYBACK_SEEKING] = updateBufferState, 
            this[MediaPlayer.dependencies.PlaybackController.eventList.ENAME_PLAYBACK_TIME_UPDATED] = updateBufferState, 
            this[MediaPlayer.dependencies.PlaybackController.eventList.ENAME_PLAYBACK_RATE_CHANGED] = onPlaybackRateChanged, 
            this[MediaPlayer.dependencies.PlaybackController.eventList.ENAME_WALLCLOCK_TIME_UPDATED] = onWallclockTimeUpdated, 
            onAppended = onAppended.bind(this), onRemoved = onRemoved.bind(this), this.sourceBufferExt.subscribe(MediaPlayer.dependencies.SourceBufferExtensions.eventList.ENAME_SOURCEBUFFER_APPEND_COMPLETED, this, onAppended), 
            this.sourceBufferExt.subscribe(MediaPlayer.dependencies.SourceBufferExtensions.eventList.ENAME_SOURCEBUFFER_REMOVE_COMPLETED, this, onRemoved);
        },
        initialize: function(typeValue, buffer, source, streamProcessor) {
            var self = this;
            type = typeValue, self.setMediaSource(source), self.setBuffer(buffer), self.streamProcessor = streamProcessor, 
            self.fragmentController = streamProcessor.fragmentController, self.scheduleController = streamProcessor.scheduleController, 
            self.playbackController = streamProcessor.playbackController;
        },
        getStreamProcessor: function() {
            return this.streamProcessor;
        },
        setStreamProcessor: function(value) {
            this.streamProcessor = value;
        },
        getBuffer: function() {
            return buffer;
        },
        setBuffer: function(value) {
            buffer = value;
        },
        getBufferLevel: function() {
            return bufferLevel;
        },
        getMinBufferTime: function() {
            return minBufferTime;
        },
        setMinBufferTime: function(value) {
            minBufferTime = value;
        },
        getCriticalBufferLevel: function() {
            return criticalBufferLevel;
        },
        setMediaSource: function(value) {
            mediaSource = value;
        },
        isBufferingCompleted: function() {
            return isBufferingCompleted;
        },
        reset: function(errored) {
            var self = this;
            initializationData = [], criticalBufferLevel = Number.POSITIVE_INFINITY, hasSufficientBuffer = null, 
            minBufferTime = null, currentQuality = -1, requiredQuality = 0, self.sourceBufferExt.unsubscribe(MediaPlayer.dependencies.SourceBufferExtensions.eventList.ENAME_SOURCEBUFFER_APPEND_COMPLETED, self, onAppended), 
            self.sourceBufferExt.unsubscribe(MediaPlayer.dependencies.SourceBufferExtensions.eventList.ENAME_SOURCEBUFFER_REMOVE_COMPLETED, self, onRemoved), 
            appendedBytesInfo = null, isBufferLevelOutrun = !1, isAppendingInProgress = !1, 
            pendingMedia = [], errored || (self.sourceBufferExt.abort(mediaSource, buffer), 
            self.sourceBufferExt.removeSourceBuffer(mediaSource, buffer)), buffer = null;
        }
    };
}, MediaPlayer.dependencies.BufferController.BUFFER_SIZE_REQUIRED = "required", 
MediaPlayer.dependencies.BufferController.BUFFER_SIZE_MIN = "min", MediaPlayer.dependencies.BufferController.BUFFER_SIZE_INFINITY = "infinity", 
MediaPlayer.dependencies.BufferController.DEFAULT_MIN_BUFFER_TIME = 8, MediaPlayer.dependencies.BufferController.BUFFER_TIME_AT_TOP_QUALITY = 30, 
MediaPlayer.dependencies.BufferController.BUFFER_TIME_AT_TOP_QUALITY_LONG_FORM = 300, 
MediaPlayer.dependencies.BufferController.LONG_FORM_CONTENT_DURATION_THRESHOLD = 600, 
MediaPlayer.dependencies.BufferController.prototype = {
    constructor: MediaPlayer.dependencies.BufferController
}, MediaPlayer.dependencies.BufferController.eventList = {
    ENAME_BUFFER_LEVEL_STATE_CHANGED: "bufferLevelStateChanged",
    ENAME_BUFFER_LEVEL_UPDATED: "bufferLevelUpdated",
    ENAME_QUOTA_EXCEEDED: "quotaExceeded",
    ENAME_BYTES_APPENDED: "bytesAppended",
    ENAME_BYTES_REJECTED: "bytesRejected",
    ENAME_BUFFERING_COMPLETED: "bufferingCompleted",
    ENAME_BUFFER_CLEARED: "bufferCleared",
    ENAME_INIT_REQUESTED: "initRequested",
    ENAME_BUFFER_LEVEL_OUTRUN: "bufferLevelOutrun",
    ENAME_BUFFER_LEVEL_BALANCED: "bufferLevelBalanced",
    ENAME_MIN_BUFFER_TIME_UPDATED: "minBufferTimeUpdated"
}, MediaPlayer.utils.Capabilities = function() {
    "use strict";
}, MediaPlayer.utils.Capabilities.prototype = {
    constructor: MediaPlayer.utils.Capabilities,
    supportsMediaSource: function() {
        "use strict";
        var hasWebKit = "WebKitMediaSource" in window, hasMediaSource = "MediaSource" in window;
        return hasWebKit || hasMediaSource;
    },
    supportsMediaKeys: function() {
        "use strict";
        var hasWebKit = "WebKitMediaKeys" in window, hasMs = "MSMediaKeys" in window, hasMediaSource = "MediaKeys" in window, hasWebkitGenerateKeyRequest = "webkitGenerateKeyRequest" in document.createElement("video");
        return hasWebKit || hasMs || hasMediaSource || hasWebkitGenerateKeyRequest;
    },
    supportsCodec: function(element, codec) {
        "use strict";
        if (!(element instanceof HTMLMediaElement)) throw "element must be of type HTMLMediaElement.";
        var canPlay = element.canPlayType(codec);
        return "probably" === canPlay || "maybe" === canPlay;
    }
}, MediaPlayer.utils.Debug = function() {
    "use strict";
    var logToBrowserConsole = !0;
    return {
        eventBus: void 0,
        setLogToBrowserConsole: function(value) {
            logToBrowserConsole = value;
        },
        getLogToBrowserConsole: function() {
            return logToBrowserConsole;
        },
        log: function(message) {
            logToBrowserConsole && console.log(message), this.eventBus.dispatchEvent({
                type: "log",
                message: message
            });
        }
    };
}, MediaPlayer.dependencies.ErrorHandler = function() {
    "use strict";
    return {
        eventBus: void 0,
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
}, MediaPlayer.dependencies.ErrorHandler.prototype = {
    constructor: MediaPlayer.dependencies.ErrorHandler
}, MediaPlayer.utils.EventBus = function() {
    "use strict";
    var registrations, getListeners = function(type, useCapture) {
        var captype = (useCapture ? "1" : "0") + type;
        return captype in registrations || (registrations[captype] = []), registrations[captype];
    }, init = function() {
        registrations = {};
    };
    return init(), {
        addEventListener: function(type, listener, useCapture) {
            var listeners = getListeners(type, useCapture), idx = listeners.indexOf(listener);
            -1 === idx && listeners.push(listener);
        },
        removeEventListener: function(type, listener, useCapture) {
            var listeners = getListeners(type, useCapture), idx = listeners.indexOf(listener);
            -1 !== idx && listeners.splice(idx, 1);
        },
        dispatchEvent: function(evt) {
            for (var listeners = getListeners(evt.type, !1).slice(), i = 0; i < listeners.length; i++) listeners[i].call(this, evt);
            return !evt.defaultPrevented;
        }
    };
}, MediaPlayer.dependencies.EventController = function() {
    "use strict";
    var inlineEvents = [], inbandEvents = [], activeEvents = [], eventInterval = null, refreshDelay = 100, presentationTimeThreshold = refreshDelay / 1e3, MPD_RELOAD_SCHEME = "urn:mpeg:dash:event:2012", MPD_RELOAD_VALUE = 1, reset = function() {
        null !== eventInterval && (clearInterval(eventInterval), eventInterval = null), 
        inlineEvents = null, inbandEvents = null, activeEvents = null;
    }, clear = function() {
        null !== eventInterval && (clearInterval(eventInterval), eventInterval = null);
    }, start = function() {
        var self = this;
        self.debug.log("Start Event Controller"), isNaN(refreshDelay) || (eventInterval = setInterval(onEventTimer.bind(this), refreshDelay));
    }, addInlineEvents = function(values) {
        var self = this;
        inlineEvents = [], values && values.length > 0 && (inlineEvents = values), self.debug.log("Added " + values.length + " inline events");
    }, addInbandEvents = function(values) {
        for (var self = this, i = 0; i < values.length; i++) {
            var event = values[i];
            inbandEvents[event.id] = event, self.debug.log("Add inband event with id " + event.id);
        }
    }, onEventTimer = function() {
        triggerEvents.call(this, inbandEvents), triggerEvents.call(this, inlineEvents), 
        removeEvents.call(this);
    }, triggerEvents = function(events) {
        var presentationTime, self = this, currentVideoTime = this.videoModel.getCurrentTime();
        if (events) for (var j = 0; j < events.length; j++) {
            var curr = events[j];
            void 0 !== curr && (presentationTime = curr.presentationTime / curr.eventStream.timescale, 
            (0 === presentationTime || currentVideoTime >= presentationTime && presentationTime + presentationTimeThreshold > currentVideoTime) && (self.debug.log("Start Event at " + currentVideoTime), 
            curr.duration > 0 && activeEvents.push(curr), curr.eventStream.schemeIdUri == MPD_RELOAD_SCHEME && curr.eventStream.value == MPD_RELOAD_VALUE && refreshManifest.call(this), 
            events.splice(j, 1)));
        }
    }, removeEvents = function() {
        var self = this;
        if (activeEvents) for (var currentVideoTime = this.videoModel.getCurrentTime(), i = 0; i < activeEvents.length; i++) {
            var curr = activeEvents[i];
            null !== curr && (curr.duration + curr.presentationTime) / curr.eventStream.timescale < currentVideoTime && (self.debug.log("Remove Event at time " + currentVideoTime), 
            curr = null, activeEvents.splice(i, 1));
        }
    }, refreshManifest = function() {
        var self = this, manifest = self.manifestModel.getValue(), url = manifest.url;
        manifest.hasOwnProperty("Location") && (url = manifest.Location), self.debug.log("Refresh manifest @ " + url), 
        self.manifestLoader.load(url);
    };
    return {
        manifestModel: void 0,
        manifestLoader: void 0,
        debug: void 0,
        system: void 0,
        errHandler: void 0,
        videoModel: void 0,
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
}, MediaPlayer.dependencies.EventController.prototype = {
    constructor: MediaPlayer.dependencies.EventController
}, MediaPlayer.dependencies.FragmentController = function() {
    "use strict";
    var fragmentModels = [], inProgress = !1, findModel = function(context) {
        for (var ln = fragmentModels.length, i = 0; ln > i; i++) if (fragmentModels[i].getContext() == context) return fragmentModels[i];
        return null;
    }, getRequestsToLoad = function(current, callback) {
        var self = this, streamProcessor = fragmentModels[0].getContext().streamProcessor, streamId = streamProcessor.getStreamInfo().id, rules = self.scheduleRulesCollection.getRules(MediaPlayer.rules.ScheduleRulesCollection.prototype.FRAGMENTS_TO_EXECUTE_RULES);
        -1 !== rules.indexOf(this.scheduleRulesCollection.sameTimeRequestRule) && this.scheduleRulesCollection.sameTimeRequestRule.setFragmentModels(fragmentModels, streamId), 
        self.rulesController.applyRules(rules, streamProcessor, callback, current, function(currentValue, newValue) {
            return newValue;
        });
    }, onFragmentLoadingStart = function(e) {
        var self = this, request = e.data.request;
        self.isInitializationRequest(request) ? self.notify(MediaPlayer.dependencies.FragmentController.eventList.ENAME_INIT_FRAGMENT_LOADING_START, {
            request: request,
            fragmentModel: e.sender
        }) : self.notify(MediaPlayer.dependencies.FragmentController.eventList.ENAME_MEDIA_FRAGMENT_LOADING_START, {
            request: request,
            fragmentModel: e.sender
        });
    }, onFragmentLoadingCompleted = function(e) {
        var self = this, request = e.data.request, bytes = self.process(e.data.response);
        return null === bytes ? void self.debug.log("No " + request.mediaType + " bytes to push.") : (self.isInitializationRequest(request) ? self.notify(MediaPlayer.dependencies.FragmentController.eventList.ENAME_INIT_FRAGMENT_LOADED, {
            bytes: bytes,
            quality: request.quality,
            fragmentModel: e.sender
        }) : self.notify(MediaPlayer.dependencies.FragmentController.eventList.ENAME_MEDIA_FRAGMENT_LOADED, {
            bytes: bytes,
            quality: request.quality,
            index: request.index,
            fragmentModel: e.sender
        }), void executeRequests.call(this));
    }, onStreamCompleted = function(e) {
        this.notify(MediaPlayer.dependencies.FragmentController.eventList.ENAME_STREAM_COMPLETED, {
            request: e.data.request,
            fragmentModel: e.sender
        });
    }, onBufferLevelBalanced = function() {
        executeRequests.call(this);
    }, onGetRequests = function(result) {
        var mediaType, r, m, i, j, reqsToExecute = result.value;
        for (i = 0; i < reqsToExecute.length; i += 1) if (r = reqsToExecute[i]) for (j = 0; j < fragmentModels.length; j += 1) m = fragmentModels[j], 
        mediaType = m.getContext().streamProcessor.getType(), r.mediaType === mediaType && (r instanceof MediaPlayer.vo.FragmentRequest || (r = m.getPendingRequestForTime(r.startTime)), 
        m.executeRequest(r));
        inProgress = !1;
    }, executeRequests = function(request) {
        inProgress || (inProgress = !0, getRequestsToLoad.call(this, request, onGetRequests.bind(this)));
    };
    return {
        system: void 0,
        debug: void 0,
        scheduleRulesCollection: void 0,
        rulesController: void 0,
        fragmentLoader: void 0,
        notify: void 0,
        subscribe: void 0,
        unsubscribe: void 0,
        setup: function() {
            this[MediaPlayer.dependencies.FragmentModel.eventList.ENAME_FRAGMENT_LOADING_STARTED] = onFragmentLoadingStart, 
            this[MediaPlayer.dependencies.FragmentModel.eventList.ENAME_FRAGMENT_LOADING_COMPLETED] = onFragmentLoadingCompleted, 
            this[MediaPlayer.dependencies.FragmentModel.eventList.ENAME_STREAM_COMPLETED] = onStreamCompleted, 
            this[MediaPlayer.dependencies.BufferController.eventList.ENAME_BUFFER_LEVEL_BALANCED] = onBufferLevelBalanced;
        },
        process: function(bytes) {
            var result = null;
            return null !== bytes && void 0 !== bytes && bytes.byteLength > 0 && (result = new Uint8Array(bytes)), 
            result;
        },
        getModel: function(context) {
            if (!context) return null;
            var model = findModel(context);
            return model || (model = this.system.getObject("fragmentModel"), model.setContext(context), 
            fragmentModels.push(model)), model;
        },
        detachModel: function(model) {
            var idx = fragmentModels.indexOf(model);
            idx > -1 && fragmentModels.splice(idx, 1);
        },
        isFragmentLoadedOrPending: function(context, request) {
            var isLoaded, fragmentModel = findModel(context);
            return fragmentModel ? isLoaded = fragmentModel.isFragmentLoadedOrPending(request) : !1;
        },
        getPendingRequests: function(context) {
            var fragmentModel = findModel(context);
            return fragmentModel ? fragmentModel.getPendingRequests() : null;
        },
        getLoadingRequests: function(context) {
            var fragmentModel = findModel(context);
            return fragmentModel ? fragmentModel.getLoadingRequests() : null;
        },
        isInitializationRequest: function(request) {
            return request && request.type && -1 !== request.type.toLowerCase().indexOf("initialization");
        },
        getLoadingTime: function(context) {
            var fragmentModel = findModel(context);
            return fragmentModel ? fragmentModel.getLoadingTime() : null;
        },
        getExecutedRequestForTime: function(model, time) {
            return model ? model.getExecutedRequestForTime(time) : null;
        },
        removeExecutedRequest: function(model, request) {
            model && model.removeExecutedRequest(request);
        },
        removeExecutedRequestsBeforeTime: function(model, time) {
            model && model.removeExecutedRequestsBeforeTime(time);
        },
        cancelPendingRequestsForModel: function(model) {
            model && model.cancelPendingRequests();
        },
        abortRequestsForModel: function(model) {
            model && model.abortRequests(), executeRequests.call(this);
        },
        prepareFragmentForLoading: function(context, request) {
            var fragmentModel = findModel(context);
            fragmentModel && request && fragmentModel.addRequest(request) && executeRequests.call(this, request);
        },
        executePendingRequests: function() {
            executeRequests.call(this);
        },
        resetModel: function(model) {
            this.abortRequestsForModel(model), this.cancelPendingRequestsForModel(model);
        }
    };
}, MediaPlayer.dependencies.FragmentController.prototype = {
    constructor: MediaPlayer.dependencies.FragmentController
}, MediaPlayer.dependencies.FragmentController.eventList = {
    ENAME_STREAM_COMPLETED: "streamCompleted",
    ENAME_INIT_FRAGMENT_LOADING_START: "initFragmentLoadingStart",
    ENAME_MEDIA_FRAGMENT_LOADING_START: "mediaFragmentLoadingStart",
    ENAME_INIT_FRAGMENT_LOADED: "initFragmentLoaded",
    ENAME_MEDIA_FRAGMENT_LOADED: "mediaFragmentLoaded"
}, MediaPlayer.dependencies.FragmentLoader = function() {
    "use strict";
    var RETRY_ATTEMPTS = 10, RETRY_INTERVAL = 750, xhrs = [], doLoad = function(request, remainingAttempts) {
        var req = new XMLHttpRequest(), httpRequestMetrics = null, firstProgress = !0, needFailureReport = !0, lastTraceTime = null, self = this;
        xhrs.push(req), request.requestStartDate = new Date(), httpRequestMetrics = self.metricsModel.addHttpRequest(request.mediaType, null, request.type, request.url, null, request.range, request.requestStartDate, null, null, null, null, request.duration, null), 
        self.metricsModel.appendHttpTrace(httpRequestMetrics, request.requestStartDate, request.requestStartDate.getTime() - request.requestStartDate.getTime(), [ 0 ]), 
        lastTraceTime = request.requestStartDate, req.open("GET", self.requestModifierExt.modifyRequestURL(request.url), !0), 
        req.responseType = "arraybuffer", req = self.requestModifierExt.modifyRequestHeader(req), 
        request.range && req.setRequestHeader("Range", "bytes=" + request.range), req.onprogress = function(event) {
            var currentTime = new Date();
            firstProgress && (firstProgress = !1, (!event.lengthComputable || event.lengthComputable && event.total != event.loaded) && (request.firstByteDate = currentTime, 
            httpRequestMetrics.tresponse = currentTime)), self.metricsModel.appendHttpTrace(httpRequestMetrics, currentTime, currentTime.getTime() - lastTraceTime.getTime(), [ req.response ? req.response.byteLength : 0 ]), 
            lastTraceTime = currentTime;
        }, req.onload = function() {
            if (!(req.status < 200 || req.status > 299)) {
                needFailureReport = !1;
                var latency, download, currentTime = new Date(), bytes = req.response;
                request.firstByteDate || (request.firstByteDate = request.requestStartDate), request.requestEndDate = currentTime, 
                latency = request.firstByteDate.getTime() - request.requestStartDate.getTime(), 
                download = request.requestEndDate.getTime() - request.firstByteDate.getTime(), self.debug.log("loaded " + request.mediaType + ":" + request.type + ":" + request.startTime + " (" + req.status + ", " + latency + "ms, " + download + "ms)"), 
                httpRequestMetrics.tresponse = request.firstByteDate, httpRequestMetrics.tfinish = request.requestEndDate, 
                httpRequestMetrics.responsecode = req.status, httpRequestMetrics.responseHeaders = req.getAllResponseHeaders(), 
                self.metricsModel.appendHttpTrace(httpRequestMetrics, currentTime, currentTime.getTime() - lastTraceTime.getTime(), [ bytes ? bytes.byteLength : 0 ]), 
                lastTraceTime = currentTime, self.notify(MediaPlayer.dependencies.FragmentLoader.eventList.ENAME_LOADING_COMPLETED, {
                    request: request,
                    response: bytes
                });
            }
        }, req.onloadend = req.onerror = function() {
            if (-1 !== xhrs.indexOf(req) && (xhrs.splice(xhrs.indexOf(req), 1), needFailureReport)) {
                needFailureReport = !1;
                var latency, download, currentTime = new Date(), bytes = req.response;
                if (request.firstByteDate || (request.firstByteDate = request.requestStartDate), 
                request.requestEndDate = currentTime, latency = request.firstByteDate.getTime() - request.requestStartDate.getTime(), 
                download = request.requestEndDate.getTime() - request.firstByteDate.getTime(), self.debug.log("failed " + request.mediaType + ":" + request.type + ":" + request.startTime + " (" + req.status + ", " + latency + "ms, " + download + "ms)"), 
                httpRequestMetrics.tresponse = request.firstByteDate, httpRequestMetrics.tfinish = request.requestEndDate, 
                httpRequestMetrics.responsecode = req.status, self.metricsModel.appendHttpTrace(httpRequestMetrics, currentTime, currentTime.getTime() - lastTraceTime.getTime(), [ bytes ? bytes.byteLength : 0 ]), 
                lastTraceTime = currentTime, remainingAttempts > 0) {
                    var interval = RETRY_INTERVAL * (RETRY_ATTEMPTS - remainingAttempts + 1);
                    self.debug.log("Failed loading fragment: " + request.mediaType + ":" + request.type + ":" + request.startTime + ", retry in " + interval + "ms attempts: " + remainingAttempts), 
                    remainingAttempts--, setTimeout(function() {
                        doLoad.call(self, request, remainingAttempts);
                    }, interval);
                } else self.debug.log("Failed loading fragment: " + request.mediaType + ":" + request.type + ":" + request.startTime + " no retry attempts left"), 
                self.errHandler.downloadError("content", request.url, req), self.notify(MediaPlayer.dependencies.FragmentLoader.eventList.ENAME_LOADING_COMPLETED, {
                    request: request,
                    bytes: null
                }, new MediaPlayer.vo.Error(null, "failed loading fragment", null));
            }
        }, req.send();
    }, checkForExistence = function(request) {
        var self = this, req = new XMLHttpRequest(), isSuccessful = !1;
        req.open("HEAD", request.url, !0), req.onload = function() {
            req.status < 200 || req.status > 299 || (isSuccessful = !0, self.notify(MediaPlayer.dependencies.FragmentLoader.eventList.ENAME_CHECK_FOR_EXISTENCE_COMPLETED, {
                request: request,
                exists: !0
            }));
        }, req.onloadend = req.onerror = function() {
            isSuccessful || self.notify(MediaPlayer.dependencies.FragmentLoader.eventList.ENAME_CHECK_FOR_EXISTENCE_COMPLETED, {
                request: request,
                exists: !1
            });
        }, req.send();
    };
    return {
        metricsModel: void 0,
        errHandler: void 0,
        debug: void 0,
        requestModifierExt: void 0,
        notify: void 0,
        subscribe: void 0,
        unsubscribe: void 0,
        load: function(req) {
            req ? doLoad.call(this, req, RETRY_ATTEMPTS) : this.notify(MediaPlayer.dependencies.FragmentLoader.eventList.ENAME_LOADING_COMPLETED, {
                request: req,
                bytes: null
            }, new MediaPlayer.vo.Error(null, "request is null", null));
        },
        checkForExistence: function(req) {
            return req ? void checkForExistence.call(this, req) : void this.notify(MediaPlayer.dependencies.FragmentLoader.eventList.ENAME_CHECK_FOR_EXISTENCE_COMPLETED, {
                request: req,
                exists: !1
            });
        },
        abort: function() {
            var i, req, ln = xhrs.length;
            for (i = 0; ln > i; i += 1) req = xhrs[i], xhrs[i] = null, req.abort(), req = null;
            xhrs = [];
        }
    };
}, MediaPlayer.dependencies.FragmentLoader.prototype = {
    constructor: MediaPlayer.dependencies.FragmentLoader
}, MediaPlayer.dependencies.FragmentLoader.eventList = {
    ENAME_LOADING_COMPLETED: "loadingCompleted",
    ENAME_CHECK_FOR_EXISTENCE_COMPLETED: "checkForExistenceCompleted"
}, MediaPlayer.dependencies.FragmentModel = function() {
    "use strict";
    var context, executedRequests = [], pendingRequests = [], loadingRequests = [], rejectedRequests = [], isLoadingPostponed = !1, loadCurrentFragment = function(request) {
        var self = this;
        self.notify(MediaPlayer.dependencies.FragmentModel.eventList.ENAME_FRAGMENT_LOADING_STARTED, {
            request: request
        }), self.fragmentLoader.load(request);
    }, removeExecutedRequest = function(request) {
        var idx = executedRequests.indexOf(request);
        -1 !== idx && executedRequests.splice(idx, 1);
    }, getRequestForTime = function(arr, time) {
        var i, lastIdx = arr.length - 1, THRESHOLD = .001, start = 0/0, end = 0/0, req = null;
        for (i = lastIdx; i >= 0; i -= 1) if (req = arr[i], start = req.startTime, end = start + req.duration, 
        !isNaN(start) && !isNaN(end) && time + THRESHOLD >= start && end > time || isNaN(start) && isNaN(time)) return req;
        return null;
    }, addSchedulingInfoMetrics = function(request, state) {
        if (request) {
            var mediaType = request.mediaType, now = new Date(), type = request.type, startTime = request.startTime, availabilityStartTime = request.availabilityStartTime, duration = request.duration, quality = request.quality, range = request.range;
            this.metricsModel.addSchedulingInfo(mediaType, now, type, startTime, availabilityStartTime, duration, quality, range, state);
        }
    }, onLoadingCompleted = function(e) {
        var request = e.data.request, response = e.data.response, error = e.error;
        loadingRequests.splice(loadingRequests.indexOf(request), 1), response && !error && executedRequests.push(request), 
        addSchedulingInfoMetrics.call(this, request, error ? MediaPlayer.vo.metrics.SchedulingInfo.FAILED_STATE : MediaPlayer.vo.metrics.SchedulingInfo.EXECUTED_STATE), 
        this.notify(MediaPlayer.dependencies.FragmentModel.eventList.ENAME_FRAGMENT_LOADING_COMPLETED, {
            request: request,
            response: response
        }, error);
    }, onBytesRejected = function(e) {
        var req = this.getExecutedRequestForQualityAndIndex(e.data.quality, e.data.index);
        req && (this.removeExecutedRequest(req), isNaN(e.data.index) || (rejectedRequests.push(req), 
        addSchedulingInfoMetrics.call(this, req, MediaPlayer.vo.metrics.SchedulingInfo.REJECTED_STATE)));
    }, onBufferLevelOutrun = function() {
        isLoadingPostponed = !0;
    }, onBufferLevelBalanced = function() {
        isLoadingPostponed = !1;
    };
    return {
        system: void 0,
        debug: void 0,
        metricsModel: void 0,
        notify: void 0,
        subscribe: void 0,
        unsubscribe: void 0,
        setup: function() {
            this[MediaPlayer.dependencies.BufferController.eventList.ENAME_BUFFER_LEVEL_OUTRUN] = onBufferLevelOutrun, 
            this[MediaPlayer.dependencies.BufferController.eventList.ENAME_BUFFER_LEVEL_BALANCED] = onBufferLevelBalanced, 
            this[MediaPlayer.dependencies.BufferController.eventList.ENAME_BYTES_REJECTED] = onBytesRejected, 
            this[MediaPlayer.dependencies.FragmentLoader.eventList.ENAME_LOADING_COMPLETED] = onLoadingCompleted;
        },
        setLoader: function(value) {
            this.fragmentLoader = value;
        },
        setContext: function(value) {
            context = value;
        },
        getContext: function() {
            return context;
        },
        getIsPostponed: function() {
            return isLoadingPostponed;
        },
        addRequest: function(value) {
            return !value || this.isFragmentLoadedOrPending(value) ? !1 : (pendingRequests.push(value), 
            addSchedulingInfoMetrics.call(this, value, MediaPlayer.vo.metrics.SchedulingInfo.PENDING_STATE), 
            !0);
        },
        isFragmentLoadedOrPending: function(request) {
            var isEqualComplete = function(req1, req2) {
                return "complete" === req1.action && req1.action === req2.action;
            }, isEqualMedia = function(req1, req2) {
                return req1.url === req2.url && req1.startTime === req2.startTime;
            }, isEqualInit = function(req1, req2) {
                return isNaN(req1.index) && isNaN(req2.index) && req1.quality === req2.quality;
            }, check = function(arr) {
                var req, i, isLoaded = !1, ln = arr.length;
                for (i = 0; ln > i; i += 1) if (req = arr[i], isEqualMedia(request, req) || isEqualInit(request, req) || isEqualComplete(request, req)) {
                    isLoaded = !0;
                    break;
                }
                return isLoaded;
            };
            return check(pendingRequests) || check(loadingRequests) || check(executedRequests);
        },
        getPendingRequests: function() {
            return pendingRequests;
        },
        getLoadingRequests: function() {
            return loadingRequests;
        },
        getExecutedRequests: function() {
            return executedRequests;
        },
        getRejectedRequests: function() {
            return rejectedRequests;
        },
        getLoadingTime: function() {
            var req, i, loadingTime = 0;
            for (i = executedRequests.length - 1; i >= 0; i -= 1) if (req = executedRequests[i], 
            req.requestEndDate instanceof Date && req.firstByteDate instanceof Date) {
                loadingTime = req.requestEndDate.getTime() - req.firstByteDate.getTime();
                break;
            }
            return loadingTime;
        },
        getExecutedRequestForTime: function(time) {
            return getRequestForTime(executedRequests, time);
        },
        getPendingRequestForTime: function(time) {
            return getRequestForTime(pendingRequests, time);
        },
        getLoadingRequestForTime: function(time) {
            return getRequestForTime(loadingRequests, time);
        },
        getExecutedRequestForQualityAndIndex: function(quality, index) {
            var i, lastIdx = executedRequests.length - 1, req = null;
            for (i = lastIdx; i >= 0; i -= 1) if (req = executedRequests[i], req.quality === quality && req.index === index) return req;
            return null;
        },
        removeExecutedRequest: function(request) {
            removeExecutedRequest.call(this, request);
        },
        removeExecutedRequestsBeforeTime: function(time) {
            var i, lastIdx = executedRequests.length - 1, start = 0/0, req = null;
            for (i = lastIdx; i >= 0; i -= 1) req = executedRequests[i], start = req.startTime, 
            !isNaN(start) && time > start && removeExecutedRequest.call(this, req);
        },
        cancelPendingRequests: function(quality) {
            var self = this, reqs = pendingRequests, canceled = reqs;
            return pendingRequests = [], void 0 !== quality && (pendingRequests = reqs.filter(function(request) {
                return request.quality === quality ? !1 : (canceled.splice(canceled.indexOf(request), 1), 
                !0);
            })), canceled.forEach(function(request) {
                addSchedulingInfoMetrics.call(self, request, MediaPlayer.vo.metrics.SchedulingInfo.CANCELED_STATE);
            }), canceled;
        },
        abortRequests: function() {
            this.fragmentLoader.abort();
            for (var i = 0, ln = loadingRequests.length; ln > i; i += 1) this.removeExecutedRequest(loadingRequests[i]);
            loadingRequests = [];
        },
        executeRequest: function(request) {
            var self = this, idx = pendingRequests.indexOf(request);
            if (request && -1 !== idx) switch (pendingRequests.splice(idx, 1), request.action) {
              case "complete":
                executedRequests.push(request), addSchedulingInfoMetrics.call(self, request, MediaPlayer.vo.metrics.SchedulingInfo.EXECUTED_STATE), 
                self.notify(MediaPlayer.dependencies.FragmentModel.eventList.ENAME_STREAM_COMPLETED, {
                    request: request
                });
                break;

              case "download":
                loadingRequests.push(request), addSchedulingInfoMetrics.call(self, request, MediaPlayer.vo.metrics.SchedulingInfo.LOADING_STATE), 
                loadCurrentFragment.call(self, request);
                break;

              default:
                this.debug.log("Unknown request action.");
            }
        }
    };
}, MediaPlayer.dependencies.FragmentModel.prototype = {
    constructor: MediaPlayer.dependencies.FragmentModel
}, MediaPlayer.dependencies.FragmentModel.eventList = {
    ENAME_STREAM_COMPLETED: "streamCompleted",
    ENAME_FRAGMENT_LOADING_STARTED: "fragmentLoadingStarted",
    ENAME_FRAGMENT_LOADING_COMPLETED: "fragmentLoadingCompleted"
}, MediaPlayer.dependencies.LiveEdgeFinder = function() {
    "use strict";
    var rules, isSearchStarted = !1, searchStartTime = 0/0, onSearchCompleted = function(req) {
        var liveEdge = req.value, searchTime = (new Date().getTime() - searchStartTime) / 1e3;
        this.notify(MediaPlayer.dependencies.LiveEdgeFinder.eventList.ENAME_LIVE_EDGE_SEARCH_COMPLETED, {
            liveEdge: liveEdge,
            searchTime: searchTime
        }, null === liveEdge ? new MediaPlayer.vo.Error(MediaPlayer.dependencies.LiveEdgeFinder.LIVE_EDGE_NOT_FOUND_ERROR_CODE, "live edge has not been found", null) : null);
    }, onStreamUpdated = function(e) {
        if (this.streamProcessor.isDynamic() && !isSearchStarted && !e.error) {
            var self = this;
            rules = self.scheduleRulesCollection.getRules(MediaPlayer.rules.ScheduleRulesCollection.prototype.LIVE_EDGE_RULES), 
            isSearchStarted = !0, searchStartTime = new Date().getTime(), this.rulesController.applyRules(rules, self.streamProcessor, onSearchCompleted.bind(self), null, function(currentValue, newValue) {
                return newValue;
            });
        }
    };
    return {
        system: void 0,
        scheduleRulesCollection: void 0,
        rulesController: void 0,
        notify: void 0,
        subscribe: void 0,
        unsubscribe: void 0,
        setup: function() {
            this[MediaPlayer.dependencies.Stream.eventList.ENAME_STREAM_UPDATED] = onStreamUpdated;
        },
        initialize: function(streamProcessor) {
            this.streamProcessor = streamProcessor, this.fragmentLoader = streamProcessor.fragmentLoader, 
            this.scheduleRulesCollection.liveEdgeBinarySearchRule && this.scheduleRulesCollection.liveEdgeBinarySearchRule.setFinder(this), 
            this.scheduleRulesCollection.liveEdgeBBCSearchRule && this.scheduleRulesCollection.liveEdgeBBCSearchRule.setFinder(this);
        },
        abortSearch: function() {
            isSearchStarted = !1, searchStartTime = 0/0;
        }
    };
}, MediaPlayer.dependencies.LiveEdgeFinder.prototype = {
    constructor: MediaPlayer.dependencies.LiveEdgeFinder
}, MediaPlayer.dependencies.LiveEdgeFinder.eventList = {
    ENAME_LIVE_EDGE_SEARCH_COMPLETED: "liveEdgeFound"
}, MediaPlayer.dependencies.LiveEdgeFinder.LIVE_EDGE_NOT_FOUND_ERROR_CODE = 1, MediaPlayer.dependencies.ManifestLoader = function() {
    "use strict";
    var RETRY_ATTEMPTS = 3, RETRY_INTERVAL = 500, parseBaseUrl = function(url) {
        var base = null;
        return -1 !== url.indexOf("/") && (-1 !== url.indexOf("?") && (url = url.substring(0, url.indexOf("?"))), 
        base = url.substring(0, url.lastIndexOf("/") + 1)), base;
    }, doLoad = function(url, remainingAttempts) {
        var manifest, baseUrl = parseBaseUrl(url), request = new XMLHttpRequest(), requestTime = new Date(), loadedTime = null, needFailureReport = !0, onload = null, report = null, self = this;
        onload = function() {
            request.status < 200 || request.status > 299 || (needFailureReport = !1, loadedTime = new Date(), 
            self.metricsModel.addHttpRequest("stream", null, "MPD", url, null, null, requestTime, loadedTime, null, request.status, null, null, request.getAllResponseHeaders()), 
            manifest = self.parser.parse(request.responseText, baseUrl), manifest ? (manifest.url = url, 
            manifest.loadedTime = loadedTime, self.metricsModel.addManifestUpdate("stream", manifest.type, requestTime, loadedTime, manifest.availabilityStartTime), 
            self.notify(MediaPlayer.dependencies.ManifestLoader.eventList.ENAME_MANIFEST_LOADED, {
                manifest: manifest
            })) : self.notify(MediaPlayer.dependencies.ManifestLoader.eventList.ENAME_MANIFEST_LOADED, {
                manifest: null
            }, new MediaPlayer.vo.Error(null, "Failed loading manifest: " + url, null)));
        }, report = function() {
            needFailureReport && (needFailureReport = !1, self.metricsModel.addHttpRequest("stream", null, "MPD", url, null, null, requestTime, new Date(), request.status, null, null, request.getAllResponseHeaders()), 
            remainingAttempts > 0 ? (self.debug.log("Failed loading manifest: " + url + ", retry in " + RETRY_INTERVAL + "ms attempts: " + remainingAttempts), 
            remainingAttempts--, setTimeout(function() {
                doLoad.call(self, url, remainingAttempts);
            }, RETRY_INTERVAL)) : (self.debug.log("Failed loading manifest: " + url + " no retry attempts left"), 
            self.errHandler.downloadError("manifest", url, request), self.notify(MediaPlayer.dependencies.ManifestLoader.eventList.ENAME_MANIFEST_LOADED, null, new Error("Failed loading manifest: " + url + " no retry attempts left"))));
        };
        try {
            request.onload = onload, request.onloadend = report, request.onerror = report, request.open("GET", self.requestModifierExt.modifyRequestURL(url), !0), 
            request.send();
        } catch (e) {
            request.onerror();
        }
    };
    return {
        debug: void 0,
        parser: void 0,
        errHandler: void 0,
        metricsModel: void 0,
        requestModifierExt: void 0,
        notify: void 0,
        subscribe: void 0,
        unsubscribe: void 0,
        load: function(url) {
            doLoad.call(this, url, RETRY_ATTEMPTS);
        }
    };
}, MediaPlayer.dependencies.ManifestLoader.prototype = {
    constructor: MediaPlayer.dependencies.ManifestLoader
}, MediaPlayer.dependencies.ManifestLoader.eventList = {
    ENAME_MANIFEST_LOADED: "manifestLoaded"
}, MediaPlayer.models.ManifestModel = function() {
    "use strict";
    var manifest;
    return {
        system: void 0,
        eventBus: void 0,
        notify: void 0,
        subscribe: void 0,
        unsubscribe: void 0,
        getValue: function() {
            return manifest;
        },
        setValue: function(value) {
            manifest = value, this.eventBus.dispatchEvent({
                type: "manifestLoaded",
                data: value
            }), this.notify(MediaPlayer.models.ManifestModel.eventList.ENAME_MANIFEST_UPDATED, {
                manifest: value
            });
        }
    };
}, MediaPlayer.models.ManifestModel.prototype = {
    constructor: MediaPlayer.models.ManifestModel
}, MediaPlayer.models.ManifestModel.eventList = {
    ENAME_MANIFEST_UPDATED: "manifestUpdated"
}, MediaPlayer.dependencies.ManifestUpdater = function() {
    "use strict";
    var refreshDelay = 0/0, refreshTimer = null, isStopped = !1, isUpdating = !1, clear = function() {
        null !== refreshTimer && (clearInterval(refreshTimer), refreshTimer = null);
    }, start = function() {
        clear.call(this), isNaN(refreshDelay) || (this.debug.log("Refresh manifest in " + refreshDelay + " seconds."), 
        refreshTimer = setTimeout(onRefreshTimer.bind(this), Math.min(1e3 * refreshDelay, Math.pow(2, 31) - 1), this));
    }, update = function() {
        var delay, timeSinceLastUpdate, self = this, manifest = self.manifestModel.getValue();
        void 0 !== manifest && null !== manifest && (delay = self.manifestExt.getRefreshDelay(manifest), 
        timeSinceLastUpdate = (new Date().getTime() - manifest.loadedTime.getTime()) / 1e3, 
        refreshDelay = Math.max(delay - timeSinceLastUpdate, 0), start.call(self));
    }, onRefreshTimer = function() {
        var manifest, url, self = this;
        isUpdating || (isUpdating = !0, manifest = self.manifestModel.getValue(), url = manifest.url, 
        manifest.hasOwnProperty("Location") && (url = manifest.Location), self.manifestLoader.load(url));
    }, onManifestLoaded = function(e) {
        e.error || (this.manifestModel.setValue(e.data.manifest), this.debug.log("Manifest has been refreshed."), 
        isStopped || update.call(this));
    }, onPlaybackStarted = function() {
        this.start();
    }, onPlaybackPaused = function() {
        this.stop();
    }, onStreamsComposed = function() {
        isUpdating = !1;
    };
    return {
        debug: void 0,
        system: void 0,
        manifestModel: void 0,
        manifestExt: void 0,
        manifestLoader: void 0,
        setup: function() {
            this[MediaPlayer.dependencies.StreamController.eventList.ENAME_STREAMS_COMPOSED] = onStreamsComposed, 
            this[MediaPlayer.dependencies.ManifestLoader.eventList.ENAME_MANIFEST_LOADED] = onManifestLoaded, 
            this[MediaPlayer.dependencies.PlaybackController.eventList.ENAME_PLAYBACK_STARTED] = onPlaybackStarted, 
            this[MediaPlayer.dependencies.PlaybackController.eventList.ENAME_PLAYBACK_PAUSED] = onPlaybackPaused;
        },
        start: function() {
            isStopped = !1, update.call(this);
        },
        stop: function() {
            isStopped = !0, clear.call(this);
        }
    };
}, MediaPlayer.dependencies.ManifestUpdater.prototype = {
    constructor: MediaPlayer.dependencies.ManifestUpdater
}, MediaPlayer.dependencies.MediaSourceExtensions = function() {
    "use strict";
}, MediaPlayer.dependencies.MediaSourceExtensions.prototype = {
    constructor: MediaPlayer.dependencies.MediaSourceExtensions,
    createMediaSource: function() {
        "use strict";
        var hasWebKit = "WebKitMediaSource" in window, hasMediaSource = "MediaSource" in window;
        return hasMediaSource ? new MediaSource() : hasWebKit ? new WebKitMediaSource() : null;
    },
    attachMediaSource: function(source, videoModel) {
        "use strict";
        videoModel.setSource(window.URL.createObjectURL(source));
    },
    detachMediaSource: function(videoModel) {
        "use strict";
        videoModel.setSource("");
    },
    setDuration: function(source, value) {
        "use strict";
        return source.duration = value, source.duration;
    },
    signalEndOfStream: function(source) {
        "use strict";
        var buffers = source.sourceBuffers, ln = buffers.length, i = 0;
        if ("open" === source.readyState) {
            for (i; ln > i; i += 1) if (buffers[i].updating) return;
            source.endOfStream();
        }
    }
}, MediaPlayer.models.MetricsModel = function() {
    "use strict";
    return {
        system: void 0,
        eventBus: void 0,
        adapter: void 0,
        streamMetrics: {},
        metricsChanged: function() {
            this.eventBus.dispatchEvent({
                type: "metricsChanged",
                data: {}
            });
        },
        metricChanged: function(mediaType) {
            this.eventBus.dispatchEvent({
                type: "metricChanged",
                data: {
                    stream: mediaType
                }
            }), this.metricsChanged();
        },
        metricUpdated: function(mediaType, metricType, vo) {
            this.eventBus.dispatchEvent({
                type: "metricUpdated",
                data: {
                    stream: mediaType,
                    metric: metricType,
                    value: vo
                }
            }), this.metricChanged(mediaType);
        },
        metricAdded: function(mediaType, metricType, vo) {
            this.eventBus.dispatchEvent({
                type: "metricAdded",
                data: {
                    stream: mediaType,
                    metric: metricType,
                    value: vo
                }
            }), this.metricChanged(mediaType);
        },
        clearCurrentMetricsForType: function(type) {
            delete this.streamMetrics[type], this.metricChanged(type);
        },
        clearAllCurrentMetrics: function() {
            var self = this;
            this.streamMetrics = {}, this.metricsChanged.call(self);
        },
        getReadOnlyMetricsFor: function(type) {
            return this.streamMetrics.hasOwnProperty(type) ? this.streamMetrics[type] : null;
        },
        getMetricsFor: function(type) {
            var metrics;
            return this.streamMetrics.hasOwnProperty(type) ? metrics = this.streamMetrics[type] : (metrics = this.system.getObject("metrics"), 
            this.streamMetrics[type] = metrics), metrics;
        },
        addTcpConnection: function(mediaType, tcpid, dest, topen, tclose, tconnect) {
            var vo = new MediaPlayer.vo.metrics.TCPConnection();
            return vo.tcpid = tcpid, vo.dest = dest, vo.topen = topen, vo.tclose = tclose, vo.tconnect = tconnect, 
            this.getMetricsFor(mediaType).TcpList.push(vo), this.metricAdded(mediaType, this.adapter.metricsList.TCP_CONNECTION, vo), 
            vo;
        },
        addHttpRequest: function(mediaType, tcpid, type, url, actualurl, range, trequest, tresponse, tfinish, responsecode, interval, mediaduration, responseHeaders) {
            var vo = new MediaPlayer.vo.metrics.HTTPRequest();
            return vo.stream = mediaType, vo.tcpid = tcpid, vo.type = type, vo.url = url, vo.actualurl = actualurl, 
            vo.range = range, vo.trequest = trequest, vo.tresponse = tresponse, vo.tfinish = tfinish, 
            vo.responsecode = responsecode, vo.interval = interval, vo.mediaduration = mediaduration, 
            vo.responseHeaders = responseHeaders, this.getMetricsFor(mediaType).HttpList.push(vo), 
            this.metricAdded(mediaType, this.adapter.metricsList.HTTP_REQUEST, vo), vo;
        },
        appendHttpTrace: function(httpRequest, s, d, b) {
            var vo = new MediaPlayer.vo.metrics.HTTPRequest.Trace();
            return vo.s = s, vo.d = d, vo.b = b, httpRequest.trace.push(vo), this.metricUpdated(httpRequest.stream, this.adapter.metricsList.HTTP_REQUEST_TRACE, httpRequest), 
            vo;
        },
        addTrackSwitch: function(mediaType, t, mt, to, lto) {
            var vo = new MediaPlayer.vo.metrics.TrackSwitch();
            return vo.t = t, vo.mt = mt, vo.to = to, vo.lto = lto, this.getMetricsFor(mediaType).RepSwitchList.push(vo), 
            this.metricAdded(mediaType, this.adapter.metricsList.TRACK_SWITCH, vo), vo;
        },
        addBufferLevel: function(mediaType, t, level) {
            var vo = new MediaPlayer.vo.metrics.BufferLevel();
            return vo.t = t, vo.level = level, this.getMetricsFor(mediaType).BufferLevel.push(vo), 
            this.metricAdded(mediaType, this.adapter.metricsList.BUFFER_LEVEL, vo), vo;
        },
        addDVRInfo: function(mediaType, currentTime, mpd, range) {
            var vo = new MediaPlayer.vo.metrics.DVRInfo();
            return vo.time = currentTime, vo.range = range, vo.manifestInfo = mpd, this.getMetricsFor(mediaType).DVRInfo.push(vo), 
            this.metricAdded(mediaType, this.adapter.metricsList.DVR_INFO, vo), vo;
        },
        addDroppedFrames: function(mediaType, quality) {
            var vo = new MediaPlayer.vo.metrics.DroppedFrames(), list = this.getMetricsFor(mediaType).DroppedFrames;
            return quality ? (vo.time = quality.creationTime, vo.droppedFrames = quality.droppedVideoFrames, 
            list.length > 0 && list[list.length - 1] == vo ? list[list.length - 1] : (list.push(vo), 
            this.metricAdded(mediaType, this.adapter.metricsList.DROPPED_FRAMES, vo), vo)) : (console.warn("No quality information provided"), 
            vo);
        },
        addSchedulingInfo: function(mediaType, t, type, startTime, availabilityStartTime, duration, quality, range, state) {
            var vo = new MediaPlayer.vo.metrics.SchedulingInfo();
            return vo.mediaType = mediaType, vo.t = t, vo.type = type, vo.startTime = startTime, 
            vo.availabilityStartTime = availabilityStartTime, vo.duration = duration, vo.quality = quality, 
            vo.range = range, vo.state = state, this.getMetricsFor(mediaType).SchedulingInfo.push(vo), 
            this.metricAdded(mediaType, this.adapter.metricsList.SCHEDULING_INFO, vo), vo;
        },
        addManifestUpdate: function(mediaType, type, requestTime, fetchTime, availabilityStartTime, presentationStartTime, clientTimeOffset, currentTime, buffered, latency) {
            var vo = new MediaPlayer.vo.metrics.ManifestUpdate(), metrics = this.getMetricsFor("stream");
            return vo.mediaType = mediaType, vo.type = type, vo.requestTime = requestTime, vo.fetchTime = fetchTime, 
            vo.availabilityStartTime = availabilityStartTime, vo.presentationStartTime = presentationStartTime, 
            vo.clientTimeOffset = clientTimeOffset, vo.currentTime = currentTime, vo.buffered = buffered, 
            vo.latency = latency, metrics.ManifestUpdate.push(vo), this.metricAdded(mediaType, this.adapter.metricsList.MANIFEST_UPDATE, vo), 
            vo;
        },
        updateManifestUpdateInfo: function(manifestUpdate, updatedFields) {
            for (var field in updatedFields) manifestUpdate[field] = updatedFields[field];
            this.metricUpdated(manifestUpdate.mediaType, this.adapter.metricsList.MANIFEST_UPDATE, manifestUpdate);
        },
        addManifestUpdateStreamInfo: function(manifestUpdate, id, index, start, duration) {
            var vo = new MediaPlayer.vo.metrics.ManifestUpdate.StreamInfo();
            return vo.id = id, vo.index = index, vo.start = start, vo.duration = duration, manifestUpdate.streamInfo.push(vo), 
            this.metricUpdated(manifestUpdate.mediaType, this.adapter.metricsList.MANIFEST_UPDATE_STREAM_INFO, manifestUpdate), 
            vo;
        },
        addManifestUpdateTrackInfo: function(manifestUpdate, id, index, streamIndex, mediaType, presentationTimeOffset, startNumber, fragmentInfoType) {
            var vo = new MediaPlayer.vo.metrics.ManifestUpdate.TrackInfo();
            return vo.id = id, vo.index = index, vo.streamIndex = streamIndex, vo.mediaType = mediaType, 
            vo.startNumber = startNumber, vo.fragmentInfoType = fragmentInfoType, vo.presentationTimeOffset = presentationTimeOffset, 
            manifestUpdate.trackInfo.push(vo), this.metricUpdated(manifestUpdate.mediaType, this.adapter.metricsList.MANIFEST_UPDATE_TRACK_INFO, manifestUpdate), 
            vo;
        },
        addPlayList: function(mediaType, start, mstart, starttype) {
            var vo = new MediaPlayer.vo.metrics.PlayList();
            return vo.stream = mediaType, vo.start = start, vo.mstart = mstart, vo.starttype = starttype, 
            this.getMetricsFor(mediaType).PlayList.push(vo), this.metricAdded(mediaType, this.adapter.metricsList.PLAY_LIST, vo), 
            vo;
        },
        appendPlayListTrace: function(playList, trackId, subreplevel, start, mstart, duration, playbackspeed, stopreason) {
            var vo = new MediaPlayer.vo.metrics.PlayList.Trace();
            return vo.representationid = trackId, vo.subreplevel = subreplevel, vo.start = start, 
            vo.mstart = mstart, vo.duration = duration, vo.playbackspeed = playbackspeed, vo.stopreason = stopreason, 
            playList.trace.push(vo), this.metricUpdated(playList.stream, this.adapter.metricsList.PLAY_LIST_TRACE, playList), 
            vo;
        }
    };
}, MediaPlayer.models.MetricsModel.prototype = {
    constructor: MediaPlayer.models.MetricsModel
}, MediaPlayer.dependencies.Notifier = function() {
    "use strict";
    var system, id = 0, getId = function() {
        return this.id || (id += 1, this.id = "_id_" + id), this.id;
    };
    return {
        system: void 0,
        setup: function() {
            system = this.system, system.mapValue("notify", this.notify), system.mapValue("subscribe", this.subscribe), 
            system.mapValue("unsubscribe", this.unsubscribe);
        },
        notify: function() {
            var eventId = arguments[0] + getId.call(this), event = new MediaPlayer.vo.Event();
            event.sender = this, event.type = arguments[0], event.data = arguments[1], event.error = arguments[2], 
            event.timestamp = new Date().getTime(), system.notify.call(system, eventId, event);
        },
        subscribe: function(eventName, observer, handler, oneShot) {
            if (!handler && observer[eventName] && (handler = observer[eventName] = observer[eventName].bind(observer)), 
            !observer) throw "observer object cannot be null or undefined";
            if (!handler) throw "event handler cannot be null or undefined";
            eventName += getId.call(this), system.mapHandler(eventName, void 0, handler, oneShot);
        },
        unsubscribe: function(eventName, observer, handler) {
            handler = handler || observer[eventName], eventName += getId.call(this), system.unmapHandler(eventName, void 0, handler);
        }
    };
}, MediaPlayer.dependencies.Notifier.prototype = {
    constructor: MediaPlayer.dependencies.Notifier
}, MediaPlayer.dependencies.PlaybackController = function() {
    "use strict";
    var wallclockTimeIntervalId, streamInfo, videoModel, trackInfo, isDynamic, WALLCLOCK_TIME_UPDATE_INTERVAL = 1e3, currentTime = 0, liveStartTime = 0/0, commonEarliestTime = null, getStreamStartTime = function(streamInfo) {
        var presentationStartTime, startTimeOffset = parseInt(this.uriQueryFragModel.getURIFragmentData.s);
        return isDynamic ? (!isNaN(startTimeOffset) && startTimeOffset > 1262304e3 && (presentationStartTime = startTimeOffset - streamInfo.manifestInfo.availableFrom.getTime() / 1e3, 
        (presentationStartTime > liveStartTime || presentationStartTime < liveStartTime - streamInfo.manifestInfo.DVRWindowSize) && (presentationStartTime = null)), 
        presentationStartTime = presentationStartTime || liveStartTime) : presentationStartTime = !isNaN(startTimeOffset) && startTimeOffset < streamInfo.duration && startTimeOffset >= 0 ? startTimeOffset : streamInfo.start, 
        presentationStartTime;
    }, getActualPresentationTime = function(currentTime) {
        var actualTime, self = this, metrics = self.metricsModel.getMetricsFor(trackInfo.mediaInfo.type), DVRMetrics = self.metricsExt.getCurrentDVRInfo(metrics), DVRWindow = DVRMetrics ? DVRMetrics.range : null;
        return DVRWindow ? currentTime >= DVRWindow.start && currentTime <= DVRWindow.end ? currentTime : actualTime = Math.max(DVRWindow.end - 2 * streamInfo.manifestInfo.minBufferTime, DVRWindow.start) : 0/0;
    }, startUpdatingWallclockTime = function() {
        var self = this, tick = function() {
            onWallclockTime.call(self);
        };
        null !== wallclockTimeIntervalId && stopUpdatingWallclockTime.call(this), wallclockTimeIntervalId = setInterval(tick, WALLCLOCK_TIME_UPDATE_INTERVAL);
    }, stopUpdatingWallclockTime = function() {
        clearInterval(wallclockTimeIntervalId), wallclockTimeIntervalId = null;
    }, initialStart = function() {
        var initialSeekTime = getStreamStartTime.call(this, streamInfo);
        this.debug.log("Starting playback at offset: " + initialSeekTime), this.seek(initialSeekTime);
    }, updateCurrentTime = function() {
        if (!this.isPaused() && isDynamic) {
            var currentTime = this.getTime(), actualTime = getActualPresentationTime.call(this, currentTime), timeChanged = !isNaN(actualTime) && actualTime !== currentTime;
            timeChanged && this.seek(actualTime);
        }
    }, onDataUpdateCompleted = function(e) {
        e.error || (trackInfo = this.adapter.convertDataToTrack(e.data.currentRepresentation), 
        streamInfo = trackInfo.mediaInfo.streamInfo, isDynamic = e.sender.streamProcessor.isDynamic(), 
        updateCurrentTime.call(this));
    }, onLiveEdgeSearchCompleted = function(e) {
        e.error || 0 === videoModel.getElement().readyState || initialStart.call(this);
    }, removeAllListeners = function() {
        videoModel && (videoModel.unlisten("play", onPlaybackStart), videoModel.unlisten("pause", onPlaybackPaused), 
        videoModel.unlisten("error", onPlaybackError), videoModel.unlisten("seeking", onPlaybackSeeking), 
        videoModel.unlisten("seeked", onPlaybackSeeked), videoModel.unlisten("timeupdate", onPlaybackTimeUpdated), 
        videoModel.unlisten("progress", onPlaybackProgress), videoModel.unlisten("ratechange", onPlaybackRateChanged), 
        videoModel.unlisten("loadedmetadata", onPlaybackMetaDataLoaded));
    }, onPlaybackStart = function() {
        updateCurrentTime.call(this), this.notify(MediaPlayer.dependencies.PlaybackController.eventList.ENAME_PLAYBACK_STARTED, {
            startTime: this.getTime()
        });
    }, onPlaybackPaused = function() {
        this.notify(MediaPlayer.dependencies.PlaybackController.eventList.ENAME_PLAYBACK_PAUSED);
    }, onPlaybackSeeking = function() {
        this.notify(MediaPlayer.dependencies.PlaybackController.eventList.ENAME_PLAYBACK_SEEKING, {
            seekTime: this.getTime()
        });
    }, onPlaybackSeeked = function() {
        this.notify(MediaPlayer.dependencies.PlaybackController.eventList.ENAME_PLAYBACK_SEEKED);
    }, onPlaybackTimeUpdated = function() {
        var time = this.getTime();
        time !== currentTime && (currentTime = time, this.notify(MediaPlayer.dependencies.PlaybackController.eventList.ENAME_PLAYBACK_TIME_UPDATED, {
            timeToEnd: this.getTimeToStreamEnd()
        }));
    }, onPlaybackProgress = function() {
        var lastRange, bufferEndTime, remainingUnbufferedDuration, ranges = videoModel.getElement().buffered;
        ranges.length && (lastRange = ranges.length - 1, bufferEndTime = ranges.end(lastRange), 
        remainingUnbufferedDuration = getStreamStartTime.call(this, streamInfo) + streamInfo.duration - bufferEndTime), 
        this.notify(MediaPlayer.dependencies.PlaybackController.eventList.ENAME_PLAYBACK_PROGRESS, {
            bufferedRanges: videoModel.getElement().buffered,
            remainingUnbufferedDuration: remainingUnbufferedDuration
        });
    }, onPlaybackRateChanged = function() {
        this.notify(MediaPlayer.dependencies.PlaybackController.eventList.ENAME_PLAYBACK_RATE_CHANGED);
    }, onPlaybackMetaDataLoaded = function() {
        this.debug.log("Got loadmetadata event."), (!isDynamic || this.timelineConverter.isTimeSyncCompleted()) && initialStart.call(this), 
        this.notify(MediaPlayer.dependencies.PlaybackController.eventList.ENAME_PLAYBACK_METADATA_LOADED), 
        startUpdatingWallclockTime.call(this);
    }, onPlaybackError = function(event) {
        this.notify(MediaPlayer.dependencies.PlaybackController.eventList.ENAME_PLAYBACK_ERROR, {
            error: event.srcElement.error
        });
    }, onWallclockTime = function() {
        this.notify(MediaPlayer.dependencies.PlaybackController.eventList.ENAME_WALLCLOCK_TIME_UPDATED, {
            isDynamic: isDynamic,
            time: new Date()
        });
    }, onBytesAppended = function(e) {
        var bufferedStart, req, ranges = e.data.bufferedRanges, currentEarliestTime = commonEarliestTime, playbackStart = getStreamStartTime.call(this, streamInfo);
        ranges && ranges.length && (bufferedStart = ranges.start(0), commonEarliestTime = null === commonEarliestTime ? bufferedStart : Math.max(commonEarliestTime, bufferedStart), 
        currentEarliestTime !== commonEarliestTime && (req = this.adapter.getFragmentRequestForTime(e.sender.streamProcessor, trackInfo, playbackStart, !1), 
        req && req.index === e.data.index && this.seek(commonEarliestTime)));
    }, setupVideoModel = function(model) {
        videoModel = model, videoModel.listen("play", onPlaybackStart), videoModel.listen("pause", onPlaybackPaused), 
        videoModel.listen("error", onPlaybackError), videoModel.listen("seeking", onPlaybackSeeking), 
        videoModel.listen("seeked", onPlaybackSeeked), videoModel.listen("timeupdate", onPlaybackTimeUpdated), 
        videoModel.listen("progress", onPlaybackProgress), videoModel.listen("ratechange", onPlaybackRateChanged), 
        videoModel.listen("loadedmetadata", onPlaybackMetaDataLoaded);
    };
    return {
        debug: void 0,
        timelineConverter: void 0,
        uriQueryFragModel: void 0,
        metricsModel: void 0,
        metricsExt: void 0,
        notify: void 0,
        subscribe: void 0,
        unsubscribe: void 0,
        adapter: void 0,
        setup: function() {
            this[Dash.dependencies.RepresentationController.eventList.ENAME_DATA_UPDATE_COMPLETED] = onDataUpdateCompleted, 
            this[MediaPlayer.dependencies.LiveEdgeFinder.eventList.ENAME_LIVE_EDGE_SEARCH_COMPLETED] = onLiveEdgeSearchCompleted, 
            this[MediaPlayer.dependencies.BufferController.eventList.ENAME_BYTES_APPENDED] = onBytesAppended, 
            onPlaybackStart = onPlaybackStart.bind(this), onPlaybackPaused = onPlaybackPaused.bind(this), 
            onPlaybackError = onPlaybackError.bind(this), onPlaybackSeeking = onPlaybackSeeking.bind(this), 
            onPlaybackSeeked = onPlaybackSeeked.bind(this), onPlaybackTimeUpdated = onPlaybackTimeUpdated.bind(this), 
            onPlaybackProgress = onPlaybackProgress.bind(this), onPlaybackRateChanged = onPlaybackRateChanged.bind(this), 
            onPlaybackMetaDataLoaded = onPlaybackMetaDataLoaded.bind(this);
        },
        initialize: function(streamInfoValue, model) {
            streamInfo = streamInfoValue, videoModel !== model && (removeAllListeners.call(this), 
            setupVideoModel.call(this, model));
        },
        getTimeToStreamEnd: function() {
            var currentTime = videoModel.getCurrentTime();
            return getStreamStartTime.call(this, streamInfo) + streamInfo.duration - currentTime;
        },
        getStreamId: function() {
            return streamInfo.id;
        },
        getStreamDuration: function() {
            return streamInfo.duration;
        },
        getTime: function() {
            return videoModel.getCurrentTime();
        },
        getPlaybackRate: function() {
            return videoModel.getPlaybackRate();
        },
        setLiveStartTime: function(value) {
            liveStartTime = value;
        },
        getLiveStartTime: function() {
            return liveStartTime;
        },
        start: function() {
            videoModel.play();
        },
        isPaused: function() {
            return videoModel.isPaused();
        },
        pause: function() {
            videoModel && videoModel.pause();
        },
        isSeeking: function() {
            return videoModel.getElement().seeking;
        },
        seek: function(time) {
            time !== this.getTime() && videoModel.setCurrentTime(time);
        },
        reset: function() {
            stopUpdatingWallclockTime.call(this), removeAllListeners.call(this), videoModel = null, 
            streamInfo = null, currentTime = 0, liveStartTime = 0/0, commonEarliestTime = null;
        }
    };
}, MediaPlayer.dependencies.PlaybackController.prototype = {
    constructor: MediaPlayer.dependencies.PlaybackController
}, MediaPlayer.dependencies.PlaybackController.eventList = {
    ENAME_PLAYBACK_STARTED: "playbackStarted",
    ENAME_PLAYBACK_STOPPED: "playbackStopped",
    ENAME_PLAYBACK_PAUSED: "playbackPaused",
    ENAME_PLAYBACK_SEEKING: "playbackSeeking",
    ENAME_PLAYBACK_SEEKED: "playbackSeeked",
    ENAME_PLAYBACK_TIME_UPDATED: "playbackTimeUpdated",
    ENAME_PLAYBACK_PROGRESS: "playbackProgress",
    ENAME_PLAYBACK_RATE_CHANGED: "playbackRateChanged",
    ENAME_PLAYBACK_METADATA_LOADED: "playbackMetaDataLoaded",
    ENAME_PLAYBACK_ERROR: "playbackError",
    ENAME_WALLCLOCK_TIME_UPDATED: "wallclockTimeUpdated"
}, MediaPlayer.dependencies.ProtectionController = function() {
    "use strict";
    var element = null, keySystems = null, teardownKeySystem = function(kid) {
        var self = this;
        self.protectionModel.removeKeySystem(kid);
    }, selectKeySystem = function(mediaInfo) {
        for (var self = this, codec = mediaInfo.codec, contentProtection = mediaInfo.contentProtection, ks = 0; ks < keySystems.length; ++ks) for (var cp = 0; cp < contentProtection.length; ++cp) if (keySystems[ks].isSupported(contentProtection[cp]) && self.protectionExt.supportsCodec(keySystems[ks].keysTypeString, codec)) {
            var kid = contentProtection[cp].KID;
            return kid || (kid = "unknown"), self.protectionModel.addKeySystem(kid, contentProtection[cp], keySystems[ks]), 
            self.debug.log("DRM: Selected Key System: " + keySystems[ks].keysTypeString + " For KID: " + kid), 
            kid;
        }
        throw new Error("DRM: The protection system for this content is not supported.");
    }, ensureKeySession = function(kid, codec, event) {
        var self = this, session = null, eventInitData = event.initData, initData = null;
        self.protectionModel.needToAddKeySession(kid, event) && (initData = self.protectionModel.getInitData(kid), 
        !initData && eventInitData ? (initData = eventInitData, self.debug.log("DRM: Using initdata from needskey event. length: " + initData.length)) : initData && self.debug.log("DRM: Using initdata from prheader in mpd. length: " + initData.length), 
        initData ? (session = self.protectionModel.addKeySession(kid, codec, initData), 
        self.debug.log(session ? "DRM: Added Key Session [" + session.sessionId + "] for KID: " + kid + " type: " + codec + " initData length: " + initData.length : "DRM: Added Key Session for KID: " + kid + " type: " + codec + " initData length: " + initData.length)) : self.debug.log("DRM: initdata is null."));
    }, updateFromMessage = function(kid, session, event) {
        this.protectionModel.updateFromMessage(kid, session, event);
    };
    return {
        system: void 0,
        debug: void 0,
        capabilities: void 0,
        protectionModel: void 0,
        protectionExt: void 0,
        setup: function() {},
        init: function(videoModel, protectionModel, protectionData) {
            keySystems = this.protectionExt.getKeySystems(protectionData), this.videoModel = videoModel, 
            this.protectionModel = protectionModel, element = this.videoModel.getElement();
        },
        getBearerToken: function(keySystem) {
            var ks, i = 0, ln = keySystems.length;
            for (i; ln > i; i += 1) if (ks = keySystems[i], ks.keysTypeString === keySystem) return ks.bearerToken;
            return null;
        },
        setBearerToken: function(tokenObj) {
            var ks, i = 0, ln = keySystems.length;
            for (i; ln > i; i += 1) ks = keySystems[i], ks.keysTypeString === tokenObj.keySystem && (ks.bearerToken = tokenObj.token);
        },
        selectKeySystem: selectKeySystem,
        ensureKeySession: ensureKeySession,
        updateFromMessage: updateFromMessage,
        teardownKeySystem: teardownKeySystem
    };
}, MediaPlayer.dependencies.ProtectionController.prototype = {
    constructor: MediaPlayer.dependencies.ProtectionController
}, MediaPlayer.dependencies.ProtectionExtensions = function() {
    "use strict";
}, MediaPlayer.dependencies.ProtectionExtensions.prototype = {
    constructor: MediaPlayer.dependencies.ProtectionExtensions,
    notify: void 0,
    subscribe: void 0,
    unsubscribe: void 0,
    supportsCodec: function(mediaKeysString, codec) {
        "use strict";
        var hasWebKit = "WebKitMediaKeys" in window, hasMs = "MSMediaKeys" in window, hasMediaSource = "MediaKeys" in window, hasWebkitGenerateKeyRequest = "webkitGenerateKeyRequest" in document.createElement("video");
        return hasMediaSource ? MediaKeys.isTypeSupported(mediaKeysString, codec) : hasWebKit ? WebKitMediaKeys.isTypeSupported(mediaKeysString, codec) : hasMs ? MSMediaKeys.isTypeSupported(mediaKeysString, codec) : hasWebkitGenerateKeyRequest ? !0 : !1;
    },
    createMediaKeys: function(mediaKeysString) {
        "use strict";
        var hasWebKit = "WebKitMediaKeys" in window, hasMs = "MSMediaKeys" in window, hasMediaSource = "MediaKeys" in window;
        return hasMediaSource ? new MediaKeys(mediaKeysString) : hasWebKit ? new WebKitMediaKeys(mediaKeysString) : hasMs ? new MSMediaKeys(mediaKeysString) : null;
    },
    setMediaKey: function(element, mediaKeys) {
        var hasWebKit = "WebKitSetMediaKeys" in element, hasMs = "msSetMediaKeys" in element, hasStd = "SetMediaKeys" in element, hasWebkitGenerateKeyRequest = "webkitGenerateKeyRequest" in document.createElement("video");
        return hasStd ? element.SetMediaKeys(mediaKeys) : hasWebKit ? element.WebKitSetMediaKeys(mediaKeys) : hasMs ? element.msSetMediaKeys(mediaKeys) : hasWebkitGenerateKeyRequest ? !0 : void this.debug.log("no setmediakeys function in element");
    },
    createSession: function(mediaKeys, mediaCodec, initData, cdmData) {
        return null !== cdmData ? mediaKeys.createSession(mediaCodec, initData, cdmData) : mediaKeys.createSession(mediaCodec, initData);
    },
    getKeySystems: function(protectionData) {
        var self = this, _protectionData = protectionData, getLAUrl = function(laUrl, keysystem) {
            return void 0 !== protectionData[keysystem] && null !== protectionData[keysystem].laUrl && "" !== protectionData[keysystem].laUrl ? protectionData[keysystem].laUrl : laUrl;
        }, playreadyGetUpdate = function(event) {
            var headerName, key, headerOverrides, xmlDoc, msg, laURL, bytes, decodedChallenge = null, headers = {}, parser = new DOMParser();
            if (bytes = new Uint16Array(event.message.buffer), msg = String.fromCharCode.apply(null, bytes), 
            xmlDoc = parser.parseFromString(msg, "application/xml"), laURL = event.destinationURL, 
            xmlDoc.getElementsByTagName("Challenge")[0]) {
                var Challenge = xmlDoc.getElementsByTagName("Challenge")[0].childNodes[0].nodeValue;
                Challenge && (decodedChallenge = BASE64.decode(Challenge));
            } else self.notify(MediaPlayer.dependencies.ProtectionExtensions.eventList.ENAME_KEY_SYSTEM_UPDATE_COMPLETED, null, new MediaPlayer.vo.Error(null, "DRM: playready update, can not find Challenge in keyMessage", null));
            var headerNameList = xmlDoc.getElementsByTagName("name"), headerValueList = xmlDoc.getElementsByTagName("value");
            headerNameList.length != headerValueList.length && self.notify(MediaPlayer.dependencies.ProtectionExtensions.eventList.ENAME_KEY_SYSTEM_UPDATE_COMPLETED, null, new MediaPlayer.vo.Error(null, "DRM: playready update, invalid header name/value pair in keyMessage", null));
            for (var i = 0; i < headerNameList.length; i++) headers[headerNameList[i].childNodes[0].nodeValue] = headerValueList[i].childNodes[0].nodeValue;
            this.bearerToken && headers.push({
                name: "Authorization",
                value: this.bearerToken
            });
            var xhr = new XMLHttpRequest();
            if (xhr.onload = function() {
                200 == xhr.status ? self.notify(MediaPlayer.dependencies.ProtectionExtensions.eventList.ENAME_KEY_SYSTEM_UPDATE_COMPLETED, {
                    data: new Uint8Array(xhr.response)
                }) : self.notify(MediaPlayer.dependencies.ProtectionExtensions.eventList.ENAME_KEY_SYSTEM_UPDATE_COMPLETED, null, new MediaPlayer.vo.Error(null, 'DRM: playready update, XHR status is "' + xhr.statusText + '" (' + xhr.status + "), expected to be 200. readyState is " + xhr.readyState, null));
            }, xhr.onabort = function() {
                self.notify(MediaPlayer.dependencies.ProtectionExtensions.eventList.ENAME_KEY_SYSTEM_UPDATE_COMPLETED, null, new MediaPlayer.vo.Error(null, 'DRM: playready update, XHR aborted. status is "' + xhr.statusText + '" (' + xhr.status + "), readyState is " + xhr.readyState, null));
            }, xhr.onerror = function() {
                self.notify(MediaPlayer.dependencies.ProtectionExtensions.eventList.ENAME_KEY_SYSTEM_UPDATE_COMPLETED, null, new MediaPlayer.vo.Error(null, 'DRM: playready update, XHR error. status is "' + xhr.statusText + '" (' + xhr.status + "), readyState is " + xhr.readyState, null));
            }, xhr.open("POST", getLAUrl(laURL, "com.microsoft.playready")), xhr.responseType = "arraybuffer", 
            headerOverrides = _protectionData["com.microsoft.playready"] ? _protectionData["com.microsoft.playready"].headers : null) for (key in headerOverrides) headers[key] = headerOverrides[key];
            for (headerName in headers) "authorization" === headerName.toLowerCase() && (xhr.withCredentials = !0), 
            xhr.setRequestHeader(headerName, headers[headerName]);
            xhr.send(decodedChallenge);
        }, playReadyNeedToAddKeySession = function(initData, keySessions) {
            return null === initData && 0 === keySessions.length;
        }, playreadyGetInitData = function(data) {
            var byteCursor = 0, PROSize = 0, PSSHSize = 0, PSSHBoxType = new Uint8Array([ 112, 115, 115, 104, 0, 0, 0, 0 ]), playreadySystemID = new Uint8Array([ 154, 4, 240, 121, 152, 64, 66, 134, 171, 146, 230, 91, 224, 136, 95, 149 ]), uint8arraydecodedPROHeader = null, PSSHBoxBuffer = null, PSSHBox = null, PSSHData = null;
            if ("pro" in data) uint8arraydecodedPROHeader = BASE64.decodeArray(data.pro.__text); else {
                if (!("prheader" in data)) return null;
                uint8arraydecodedPROHeader = BASE64.decodeArray(data.prheader.__text);
            }
            return PROSize = uint8arraydecodedPROHeader.length, PSSHSize = 4 + PSSHBoxType.length + playreadySystemID.length + 4 + PROSize, 
            PSSHBoxBuffer = new ArrayBuffer(PSSHSize), PSSHBox = new Uint8Array(PSSHBoxBuffer), 
            PSSHData = new DataView(PSSHBoxBuffer), PSSHData.setUint32(byteCursor, PSSHSize), 
            byteCursor += 4, PSSHBox.set(PSSHBoxType, byteCursor), byteCursor += PSSHBoxType.length, 
            PSSHBox.set(playreadySystemID, byteCursor), byteCursor += playreadySystemID.length, 
            PSSHData.setUint32(byteCursor, PROSize), byteCursor += 4, PSSHBox.set(uint8arraydecodedPROHeader, byteCursor), 
            byteCursor += PROSize, PSSHBox;
        }, playReadyCdmData = function() {
            if (void 0 !== protectionData["com.microsoft.playready"] && null !== protectionData["com.microsoft.playready"].cdmData && "" !== protectionData["com.microsoft.playready"].cdmData) {
                var charCode, cdmDataArray = [], cdmData = protectionData["com.microsoft.playready"].cdmData;
                cdmDataArray.push(239), cdmDataArray.push(187), cdmDataArray.push(191);
                for (var i = 0, j = cdmData.length; j > i; ++i) charCode = cdmData.charCodeAt(i), 
                cdmDataArray.push((65280 & charCode) >> 8), cdmDataArray.push(255 & charCode);
                return new Uint8Array(cdmDataArray);
            }
            return null;
        }, widevineNeedToAddKeySession = function(initData, keySession, event) {
            return event.target.webkitGenerateKeyRequest("com.widevine.alpha", event.initData), 
            !0;
        }, widevineGetUpdate = function(event) {
            var key, headerOverrides, headerName, xhr = new XMLHttpRequest(), headers = {};
            if (xhr.open("POST", getLAUrl("", "com.widevine.alpha"), !0), xhr.responseType = "arraybuffer", 
            xhr.onload = function() {
                if (200 == this.status) {
                    var key = new Uint8Array(this.response);
                    event.target.webkitAddKey("com.widevine.alpha", key, event.initData, event.sessionId), 
                    self.notify(self.eventList.ENAME_KEY_SYSTEM_UPDATE_COMPLETED, key);
                } else self.notify(self.eventList.ENAME_KEY_SYSTEM_UPDATE_COMPLETED, null, new Error('DRM: widevine update, XHR status is "' + xhr.statusText + '" (' + xhr.status + "), expected to be 200. readyState is " + xhr.readyState));
            }, xhr.onabort = function() {
                self.notify(self.eventList.ENAME_KEY_SYSTEM_UPDATE_COMPLETED, null, new Error('DRM: widevine update, XHR aborted. status is "' + xhr.statusText + '" (' + xhr.status + "), readyState is " + xhr.readyState));
            }, xhr.onerror = function() {
                self.notify(self.eventList.ENAME_KEY_SYSTEM_UPDATE_COMPLETED, null, new Error('DRM: widevine update, XHR error. status is "' + xhr.statusText + '" (' + xhr.status + "), readyState is " + xhr.readyState));
            }, headerOverrides = _protectionData["com.widevine.alpha"] ? _protectionData["com.widevine.alpha"].headers : null) for (key in headerOverrides) headers[key] = headerOverrides[key];
            for (headerName in headers) "authorization" === headerName.toLowerCase() && (xhr.withCredentials = !0), 
            xhr.setRequestHeader(headerName, headers[headerName]);
            xhr.send(event.message);
        };
        return [ {
            schemeIdUri: "urn:uuid:9a04f079-9840-4286-ab92-e65be0885f95",
            keysTypeString: "com.microsoft.playready",
            isSupported: function(data) {
                return this.schemeIdUri === data.schemeIdUri.toLowerCase();
            },
            needToAddKeySession: playReadyNeedToAddKeySession,
            getInitData: playreadyGetInitData,
            getUpdate: playreadyGetUpdate,
            cdmData: playReadyCdmData
        }, {
            schemeIdUri: "urn:uuid:edef8ba9-79d6-4ace-a3c8-27dcd51d21ed",
            keysTypeString: "com.widevine.alpha",
            isSupported: function(data) {
                return this.schemeIdUri === data.schemeIdUri.toLowerCase();
            },
            needToAddKeySession: widevineNeedToAddKeySession,
            getInitData: function() {
                return null;
            },
            getUpdate: widevineGetUpdate,
            cdmData: function() {
                return null;
            }
        }, {
            schemeIdUri: "urn:mpeg:dash:mp4protection:2011",
            keysTypeString: "com.microsoft.playready",
            isSupported: function(data) {
                return this.schemeIdUri === data.schemeIdUri.toLowerCase() && "cenc" === data.value.toLowerCase();
            },
            needToAddKeySession: playReadyNeedToAddKeySession,
            getInitData: function() {
                return null;
            },
            getUpdate: playreadyGetUpdate,
            cdmData: playReadyCdmData
        }, {
            schemeIdUri: "urn:mpeg:dash:mp4protection:2011",
            keysTypeString: "com.widevine.alpha",
            isSupported: function(data) {
                return this.schemeIdUri === data.schemeIdUri.toLowerCase() && "cenc" === data.value.toLowerCase();
            },
            needToAddKeySession: widevineNeedToAddKeySession,
            getInitData: function() {
                return null;
            },
            getUpdate: widevineGetUpdate,
            cdmData: function() {
                return null;
            }
        }, {
            schemeIdUri: "urn:uuid:00000000-0000-0000-0000-000000000000",
            keysTypeString: "webkit-org.w3.clearkey",
            isSupported: function(data) {
                return this.schemeIdUri === data.schemeIdUri.toLowerCase();
            },
            needToAddKeySession: function() {
                return !0;
            },
            getInitData: function() {
                return null;
            },
            getUpdate: function(event) {
                var bytes, msg;
                return bytes = new Uint16Array(event.message.buffer), msg = String.fromCharCode.apply(null, bytes);
            },
            cdmData: function() {
                return null;
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
        videoModel.listen("webkitneedkey", listener), videoModel.listen("msneedkey", listener), 
        videoModel.listen("needKey", listener);
    },
    listenToKeyError: function(source, listener) {
        source.addEventListener("webkitkeyerror", listener, !1), source.addEventListener("mskeyerror", listener, !1), 
        source.addEventListener("keyerror", listener, !1);
    },
    listenToKeyMessage: function(source, listener) {
        source.addEventListener("webkitkeymessage", listener, !1), source.addEventListener("mskeymessage", listener, !1), 
        source.addEventListener("keymessage", listener, !1);
    },
    listenToKeyAdded: function(source, listener) {
        source.addEventListener("webkitkeyadded", listener, !1), source.addEventListener("mskeyadded", listener, !1), 
        source.addEventListener("keyadded", listener, !1);
    },
    unlistenToKeyError: function(source, listener) {
        source.removeEventListener("webkitkeyerror", listener), source.removeEventListener("mskeyerror", listener), 
        source.removeEventListener("keyerror", listener);
    },
    unlistenToKeyMessage: function(source, listener) {
        source.removeEventListener("webkitkeymessage", listener), source.removeEventListener("mskeymessage", listener), 
        source.removeEventListener("keymessage", listener);
    },
    unlistenToKeyAdded: function(source, listener) {
        source.removeEventListener("webkitkeyadded", listener), source.removeEventListener("mskeyadded", listener), 
        source.removeEventListener("keyadded", listener);
    }
}, MediaPlayer.dependencies.ProtectionExtensions.eventList = {
    ENAME_KEY_SYSTEM_UPDATE_COMPLETED: "keySystemUpdateCompleted"
}, MediaPlayer.models.ProtectionModel = function() {
    "use strict";
    var session, element = null, keyAddedListener = null, keyErrorListener = null, keyMessageListener = null, keySystems = [], onKeySystemUpdateCompleted = function(e) {
        var hasWebkitGenerateKeyRequest = "webkitGenerateKeyRequest" in document.createElement("video");
        e.error || hasWebkitGenerateKeyRequest || session.update(e.data.data);
    };
    return {
        system: void 0,
        protectionExt: void 0,
        setup: function() {
            this[MediaPlayer.dependencies.ProtectionExtensions.eventList.ENAME_KEY_SYSTEM_UPDATE_COMPLETED] = onKeySystemUpdateCompleted;
        },
        init: function(videoModel) {
            this.videoModel = videoModel, element = this.videoModel.getElement();
        },
        addKeySession: function(kid, mediaCodec, initData) {
            var session = null, hasWebkitGenerateKeyRequest = "webkitGenerateKeyRequest" in document.createElement("video");
            return hasWebkitGenerateKeyRequest ? this.protectionExt.listenToKeyMessage(this.videoModel.getElement(), keyMessageListener) : (session = this.protectionExt.createSession(keySystems[kid].keys, mediaCodec, initData, keySystems[kid].keySystem.cdmData()), 
            this.protectionExt.listenToKeyAdded(session, keyAddedListener), this.protectionExt.listenToKeyError(session, keyErrorListener), 
            this.protectionExt.listenToKeyMessage(session, keyMessageListener)), keySystems[kid].initData = initData, 
            keySystems[kid].keySessions.push(session), session;
        },
        addKeySystem: function(kid, contentProtectionData, keySystemDesc) {
            var keysLocal = null;
            keysLocal = this.protectionExt.createMediaKeys(keySystemDesc.keysTypeString), this.protectionExt.setMediaKey(element, keysLocal), 
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
            if (null !== kid && void 0 !== keySystems[kid] && 0 !== keySystems[kid].keySessions.length) {
                for (var keySessions = keySystems[kid].keySessions, kss = 0; kss < keySessions.length; ++kss) this.protectionExt.unlistenToKeyError(keySessions[kss], keyErrorListener), 
                this.protectionExt.unlistenToKeyAdded(keySessions[kss], keyAddedListener), this.protectionExt.unlistenToKeyMessage(keySessions[kss], keyMessageListener), 
                keySessions[kss].close();
                keySystems[kid] = void 0;
            }
        },
        needToAddKeySession: function(kid, event) {
            var keySystem = null;
            return keySystem = keySystems[kid], keySystem.keySystem.needToAddKeySession(keySystem.initData, keySystem.keySessions, event);
        },
        getInitData: function(kid) {
            var keySystem = null;
            return keySystem = keySystems[kid], keySystem.keySystem.getInitData(keySystem.contentProtection);
        },
        updateFromMessage: function(kid, sessionValue, event) {
            session = sessionValue, keySystems[kid].keySystem.getUpdate(event);
        },
        listenToNeedKey: function(listener) {
            this.protectionExt.listenToNeedKey(this.videoModel, listener);
        },
        listenToKeyError: function(listener) {
            keyErrorListener = listener;
            for (var ks = 0; ks < keySystems.length; ++ks) for (var keySessions = keySystems[ks].keySessions, kss = 0; kss < keySessions.length; ++kss) this.protectionExt.listenToKeyError(keySessions[kss], listener);
        },
        listenToKeyMessage: function(listener) {
            keyMessageListener = listener;
            for (var ks = 0; ks < keySystems.length; ++ks) for (var keySessions = keySystems[ks].keySessions, kss = 0; kss < keySessions.length; ++kss) this.protectionExt.listenToKeyMessage(keySessions[kss], listener);
        },
        listenToKeyAdded: function(listener) {
            keyAddedListener = listener;
            for (var ks = 0; ks < keySystems.length; ++ks) for (var keySessions = keySystems[ks].keySessions, kss = 0; kss < keySessions.length; ++kss) this.protectionExt.listenToKeyAdded(keySessions[kss], listener);
        }
    };
}, MediaPlayer.models.ProtectionModel.prototype = {
    constructor: MediaPlayer.models.ProtectionModel
}, MediaPlayer.dependencies.RequestModifierExtensions = function() {
    "use strict";
    return {
        modifyRequestURL: function(url) {
            return url;
        },
        modifyRequestHeader: function(request) {
            return request;
        }
    };
}, MediaPlayer.dependencies.ScheduleController = function() {
    "use strict";
    var type, ready, fragmentModel, isDynamic, currentTrackInfo, fragmentsToLoad = 0, initialPlayback = !0, lastValidationTime = null, isStopped = !1, playListMetrics = null, playListTraceMetrics = null, playListTraceMetricsClosed = !0, clearPlayListTraceMetrics = function(endTime, stopreason) {
        var duration = 0, startTime = null;
        playListTraceMetricsClosed === !1 && (startTime = playListTraceMetrics.start, duration = endTime.getTime() - startTime.getTime(), 
        playListTraceMetrics.duration = duration, playListTraceMetrics.stopreason = stopreason, 
        playListTraceMetricsClosed = !0);
    }, doStart = function() {
        ready && (isStopped = !1, initialPlayback && (initialPlayback = !1), this.debug.log("ScheduleController " + type + " start."), 
        validate.call(this));
    }, startOnReady = function() {
        initialPlayback && (getInitRequest.call(this, currentTrackInfo.quality), addPlaylistMetrics.call(this, MediaPlayer.vo.metrics.PlayList.INITIAL_PLAY_START_REASON)), 
        doStart.call(this);
    }, doStop = function(cancelPending) {
        isStopped || (isStopped = !0, this.debug.log("ScheduleController " + type + " stop."), 
        cancelPending && this.fragmentController.cancelPendingRequestsForModel(fragmentModel), 
        clearPlayListTraceMetrics(new Date(), MediaPlayer.vo.metrics.PlayList.Trace.USER_REQUEST_STOP_REASON));
    }, getNextFragment = function(callback) {
        var self = this, rules = self.scheduleRulesCollection.getRules(MediaPlayer.rules.ScheduleRulesCollection.prototype.NEXT_FRAGMENT_RULES);
        self.rulesController.applyRules(rules, self.streamProcessor, callback, null, function(currentValue, newValue) {
            return newValue;
        });
    }, getInitRequest = function(quality) {
        var request, self = this;
        return request = self.adapter.getInitRequest(self.streamProcessor, quality), null !== request && self.fragmentController.prepareFragmentForLoading(self, request), 
        request;
    }, getRequiredFragmentCount = function(callback) {
        var self = this, rules = self.scheduleRulesCollection.getRules(MediaPlayer.rules.ScheduleRulesCollection.prototype.FRAGMENTS_TO_SCHEDULE_RULES);
        self.rulesController.applyRules(rules, self.streamProcessor, callback, fragmentsToLoad, function(currentValue, newValue) {
            return Math.min(currentValue, newValue);
        });
    }, replaceCanceledPendingRequests = function(canceledRequests) {
        var request, time, i, ln = canceledRequests.length, EPSILON = .1;
        for (i = 0; ln > i; i += 1) request = canceledRequests[i], time = request.startTime + request.duration / 2 + EPSILON, 
        request = this.adapter.getFragmentRequestForTime(this.streamProcessor, currentTrackInfo, time, !1), 
        this.fragmentController.prepareFragmentForLoading(this, request);
    }, onGetRequiredFragmentCount = function(result) {
        var self = this;
        return fragmentsToLoad = result.value, 0 >= fragmentsToLoad ? void self.fragmentController.executePendingRequests() : (self.abrController.getPlaybackQuality(self.streamProcessor), 
        void getNextFragment.call(self, onNextFragment.bind(self)));
    }, onNextFragment = function(result) {
        var request = result.value;
        null === request || request instanceof MediaPlayer.vo.FragmentRequest || (request = this.adapter.getFragmentRequestForTime(this.streamProcessor, currentTrackInfo, request.startTime)), 
        request ? (fragmentsToLoad--, this.fragmentController.prepareFragmentForLoading(this, request)) : this.fragmentController.executePendingRequests();
    }, validate = function() {
        var now = new Date().getTime(), isEnoughTimeSinceLastValidation = lastValidationTime ? now - lastValidationTime > this.fragmentController.getLoadingTime(this) : !0;
        !isEnoughTimeSinceLastValidation || isStopped || this.playbackController.isPaused() && (!this.scheduleWhilePaused || isDynamic) || (lastValidationTime = now, 
        getRequiredFragmentCount.call(this, onGetRequiredFragmentCount.bind(this)));
    }, clearMetrics = function() {
        var self = this;
        null !== type && "" !== type && self.metricsModel.clearCurrentMetricsForType(type);
    }, onDataUpdateCompleted = function(e) {
        e.error || (currentTrackInfo = this.adapter.convertDataToTrack(e.data.currentRepresentation), 
        isDynamic || (ready = !0), ready && startOnReady.call(this));
    }, onStreamCompleted = function(e) {
        e.data.fragmentModel === this.streamProcessor.getFragmentModel() && (this.debug.log(type + " Stream is complete."), 
        clearPlayListTraceMetrics(new Date(), MediaPlayer.vo.metrics.PlayList.Trace.END_OF_CONTENT_STOP_REASON));
    }, onMediaFragmentLoadingStart = function(e) {
        var self = this;
        e.data.fragmentModel === self.streamProcessor.getFragmentModel() && validate.call(self);
    }, onFragmentLoadingCompleted = function(e) {
        e.error && doStop.call(this);
    }, onBytesAppended = function() {
        addPlaylistTraceMetrics.call(this);
    }, onDataUpdateStarted = function() {
        doStop.call(this, !1);
    }, onInitRequested = function(e) {
        getInitRequest.call(this, e.data.requiredQuality);
    }, onBufferCleared = function(e) {
        this.fragmentController.removeExecutedRequestsBeforeTime(fragmentModel, e.data.to), 
        e.data.hasEnoughSpaceToAppend && doStart.call(this);
    }, onBufferLevelStateChanged = function(e) {
        var self = this;
        e.data.hasSufficientBuffer || self.playbackController.isSeeking() || (self.debug.log("Stalling " + type + " Buffer: " + type), 
        clearPlayListTraceMetrics(new Date(), MediaPlayer.vo.metrics.PlayList.Trace.REBUFFERING_REASON));
    }, onBufferLevelUpdated = function(e) {
        var self = this;
        self.metricsModel.addBufferLevel(type, new Date(), e.data.bufferLevel), validate.call(this);
    }, onQuotaExceeded = function() {
        doStop.call(this, !1);
    }, onQualityChanged = function(e) {
        if (type === e.data.mediaType && this.streamProcessor.getStreamInfo().id === e.data.streamInfo.id) {
            var canceledReqs, self = this;
            if (canceledReqs = fragmentModel.cancelPendingRequests(e.data.oldQuality), currentTrackInfo = self.streamProcessor.getTrackForQuality(e.data.newQuality), 
            null === currentTrackInfo || void 0 === currentTrackInfo) throw "Unexpected error!";
            replaceCanceledPendingRequests.call(self, canceledReqs), clearPlayListTraceMetrics(new Date(), MediaPlayer.vo.metrics.PlayList.Trace.REPRESENTATION_SWITCH_STOP_REASON);
        }
    }, addPlaylistMetrics = function(stopReason) {
        var currentTime = new Date(), presentationTime = this.playbackController.getTime();
        clearPlayListTraceMetrics(currentTime, MediaPlayer.vo.metrics.PlayList.Trace.USER_REQUEST_STOP_REASON), 
        playListMetrics = this.metricsModel.addPlayList(type, currentTime, presentationTime, stopReason);
    }, addPlaylistTraceMetrics = function() {
        var self = this, currentVideoTime = self.playbackController.getTime(), rate = self.playbackController.getPlaybackRate(), currentTime = new Date();
        playListTraceMetricsClosed === !0 && currentTrackInfo && playListMetrics && (playListTraceMetricsClosed = !1, 
        playListTraceMetrics = self.metricsModel.appendPlayListTrace(playListMetrics, currentTrackInfo.id, null, currentTime, currentVideoTime, null, rate, null));
    }, onClosedCaptioningRequested = function(e) {
        var self = this, req = getInitRequest.call(self, e.data.CCIndex);
        fragmentModel.executeRequest(req);
    }, onPlaybackStarted = function() {
        doStart.call(this);
    }, onPlaybackSeeking = function(e) {
        initialPlayback || this.fragmentController.cancelPendingRequestsForModel(fragmentModel);
        var metrics = this.metricsModel.getMetricsFor("stream"), manifestUpdateInfo = this.metricsExt.getCurrentManifestUpdate(metrics);
        this.debug.log("ScheduleController " + type + " seek: " + e.data.seekTime), addPlaylistMetrics.call(this, MediaPlayer.vo.metrics.PlayList.SEEK_START_REASON), 
        this.metricsModel.updateManifestUpdateInfo(manifestUpdateInfo, {
            latency: currentTrackInfo.DVRWindow.end - this.playbackController.getTime()
        });
    }, onPlaybackRateChanged = function() {
        addPlaylistTraceMetrics.call(this);
    }, onWallclockTimeUpdated = function() {
        validate.call(this);
    }, onLiveEdgeSearchCompleted = function(e) {
        if (!e.error) {
            var request, actualStartTime, self = this, liveEdgeTime = e.data.liveEdge, manifestInfo = currentTrackInfo.mediaInfo.streamInfo.manifestInfo, startTime = liveEdgeTime - Math.min(2 * manifestInfo.minBufferTime, manifestInfo.DVRWindowSize / 2), metrics = self.metricsModel.getMetricsFor("stream"), manifestUpdateInfo = self.metricsExt.getCurrentManifestUpdate(metrics), currentLiveStart = self.playbackController.getLiveStartTime();
            request = self.adapter.getFragmentRequestForTime(self.streamProcessor, currentTrackInfo, startTime), 
            actualStartTime = request.startTime, (isNaN(currentLiveStart) || actualStartTime > currentLiveStart) && self.playbackController.setLiveStartTime(actualStartTime), 
            self.metricsModel.updateManifestUpdateInfo(manifestUpdateInfo, {
                currentTime: actualStartTime,
                presentationStartTime: liveEdgeTime,
                latency: liveEdgeTime - actualStartTime,
                clientTimeOffset: self.timelineConverter.getClientTimeOffset()
            }), ready = !0, startOnReady.call(self);
        }
    };
    return {
        debug: void 0,
        system: void 0,
        metricsModel: void 0,
        metricsExt: void 0,
        scheduleWhilePaused: void 0,
        timelineConverter: void 0,
        abrController: void 0,
        adapter: void 0,
        scheduleRulesCollection: void 0,
        rulesController: void 0,
        setup: function() {
            this[MediaPlayer.dependencies.LiveEdgeFinder.eventList.ENAME_LIVE_EDGE_SEARCH_COMPLETED] = onLiveEdgeSearchCompleted, 
            this[MediaPlayer.dependencies.AbrController.eventList.ENAME_QUALITY_CHANGED] = onQualityChanged, 
            this[Dash.dependencies.RepresentationController.eventList.ENAME_DATA_UPDATE_STARTED] = onDataUpdateStarted, 
            this[Dash.dependencies.RepresentationController.eventList.ENAME_DATA_UPDATE_COMPLETED] = onDataUpdateCompleted, 
            this[MediaPlayer.dependencies.FragmentController.eventList.ENAME_MEDIA_FRAGMENT_LOADING_START] = onMediaFragmentLoadingStart, 
            this[MediaPlayer.dependencies.FragmentModel.eventList.ENAME_FRAGMENT_LOADING_COMPLETED] = onFragmentLoadingCompleted, 
            this[MediaPlayer.dependencies.FragmentController.eventList.ENAME_STREAM_COMPLETED] = onStreamCompleted, 
            this[MediaPlayer.dependencies.BufferController.eventList.ENAME_BUFFER_CLEARED] = onBufferCleared, 
            this[MediaPlayer.dependencies.BufferController.eventList.ENAME_BYTES_APPENDED] = onBytesAppended, 
            this[MediaPlayer.dependencies.BufferController.eventList.ENAME_BUFFER_LEVEL_STATE_CHANGED] = onBufferLevelStateChanged, 
            this[MediaPlayer.dependencies.BufferController.eventList.ENAME_BUFFER_LEVEL_UPDATED] = onBufferLevelUpdated, 
            this[MediaPlayer.dependencies.BufferController.eventList.ENAME_INIT_REQUESTED] = onInitRequested, 
            this[MediaPlayer.dependencies.BufferController.eventList.ENAME_QUOTA_EXCEEDED] = onQuotaExceeded, 
            this[MediaPlayer.dependencies.TextController.eventList.ENAME_CLOSED_CAPTIONING_REQUESTED] = onClosedCaptioningRequested, 
            this[MediaPlayer.dependencies.PlaybackController.eventList.ENAME_PLAYBACK_STARTED] = onPlaybackStarted, 
            this[MediaPlayer.dependencies.PlaybackController.eventList.ENAME_PLAYBACK_SEEKING] = onPlaybackSeeking, 
            this[MediaPlayer.dependencies.PlaybackController.eventList.ENAME_PLAYBACK_RATE_CHANGED] = onPlaybackRateChanged, 
            this[MediaPlayer.dependencies.PlaybackController.eventList.ENAME_WALLCLOCK_TIME_UPDATED] = onWallclockTimeUpdated;
        },
        initialize: function(typeValue, streamProcessor) {
            var self = this;
            type = typeValue, self.streamProcessor = streamProcessor, self.playbackController = streamProcessor.playbackController, 
            self.fragmentController = streamProcessor.fragmentController, self.liveEdgeFinder = streamProcessor.liveEdgeFinder, 
            self.bufferController = streamProcessor.bufferController, isDynamic = streamProcessor.isDynamic(), 
            fragmentModel = this.fragmentController.getModel(this), self.scheduleRulesCollection.bufferLevelRule && self.scheduleRulesCollection.bufferLevelRule.setScheduleController(self), 
            self.scheduleRulesCollection.pendingRequestsRule && self.scheduleRulesCollection.pendingRequestsRule.setScheduleController(self), 
            self.scheduleRulesCollection.playbackTimeRule && self.scheduleRulesCollection.playbackTimeRule.setScheduleController(self);
        },
        getFragmentModel: function() {
            return fragmentModel;
        },
        reset: function() {
            var self = this;
            doStop.call(self, !0), self.bufferController.unsubscribe(MediaPlayer.dependencies.BufferController.eventList.ENAME_BUFFER_LEVEL_OUTRUN, self.scheduleRulesCollection.bufferLevelRule), 
            self.bufferController.unsubscribe(MediaPlayer.dependencies.BufferController.eventList.ENAME_BUFFER_LEVEL_BALANCED, self.scheduleRulesCollection.bufferLevelRule), 
            self.fragmentController.abortRequestsForModel(fragmentModel), self.fragmentController.detachModel(fragmentModel), 
            clearMetrics.call(self), fragmentsToLoad = 0;
        },
        start: doStart,
        stop: doStop
    };
}, MediaPlayer.dependencies.ScheduleController.prototype = {
    constructor: MediaPlayer.dependencies.ScheduleController
}, MediaPlayer.dependencies.SourceBufferExtensions = function() {
    "use strict";
    this.system = void 0, this.errHandler = void 0, this.notify = void 0, this.subscribe = void 0, 
    this.unsubscribe = void 0;
}, MediaPlayer.dependencies.SourceBufferExtensions.prototype = {
    constructor: MediaPlayer.dependencies.SourceBufferExtensions,
    createSourceBuffer: function(mediaSource, mediaInfo) {
        "use strict";
        var self = this, codec = mediaInfo.codec, buffer = null;
        try {
            buffer = mediaSource.addSourceBuffer(codec);
        } catch (ex) {
            if (!mediaInfo.isText) throw ex;
            buffer = self.system.getObject("textSourceBuffer");
        }
        return buffer;
    },
    removeSourceBuffer: function(mediaSource, buffer) {
        "use strict";
        try {
            mediaSource.removeSourceBuffer(buffer);
        } catch (ex) {}
    },
    getBufferRange: function(buffer, time, tolerance) {
        "use strict";
        var len, i, ranges = null, start = 0, end = 0, firstStart = null, lastEnd = null, gap = 0, toler = tolerance || .15;
        try {
            ranges = buffer.buffered;
        } catch (ex) {
            return null;
        }
        if (null !== ranges) {
            for (i = 0, len = ranges.length; len > i; i += 1) if (start = ranges.start(i), end = ranges.end(i), 
            null === firstStart) gap = Math.abs(start - time), time >= start && end > time ? (firstStart = start, 
            lastEnd = end) : toler >= gap && (firstStart = start, lastEnd = end); else {
                if (gap = start - lastEnd, !(toler >= gap)) break;
                lastEnd = end;
            }
            if (null !== firstStart) return {
                start: firstStart,
                end: lastEnd
            };
        }
        return null;
    },
    getAllRanges: function(buffer) {
        var ranges = null;
        try {
            return ranges = buffer.buffered;
        } catch (ex) {
            return null;
        }
    },
    getBufferLength: function(buffer, time, tolerance) {
        "use strict";
        var range, length, self = this;
        return range = self.getBufferRange(buffer, time, tolerance), length = null === range ? 0 : range.end - time;
    },
    waitForUpdateEnd: function(buffer, callback) {
        "use strict";
        var intervalId, CHECK_INTERVAL = 50, checkIsUpdateEnded = function() {
            buffer.updating || (clearInterval(intervalId), callback(!0));
        }, updateEndHandler = function() {
            buffer.updating || (buffer.removeEventListener("updateend", updateEndHandler, !1), 
            callback(!0));
        };
        if (!buffer.updating) return void callback(!0);
        if ("function" == typeof buffer.addEventListener) try {
            buffer.addEventListener("updateend", updateEndHandler, !1);
        } catch (err) {
            intervalId = setInterval(checkIsUpdateEnded, CHECK_INTERVAL);
        } else intervalId = setInterval(checkIsUpdateEnded, CHECK_INTERVAL);
    },
    append: function(buffer, bytes) {
        var self = this, appendMethod = "append" in buffer ? "append" : "appendBuffer" in buffer ? "appendBuffer" : null;
        if (appendMethod) try {
            self.waitForUpdateEnd(buffer, function() {
                buffer[appendMethod](bytes), self.waitForUpdateEnd(buffer, function() {
                    self.notify(MediaPlayer.dependencies.SourceBufferExtensions.eventList.ENAME_SOURCEBUFFER_APPEND_COMPLETED, {
                        buffer: buffer,
                        bytes: bytes
                    });
                });
            });
        } catch (err) {
            self.notify(MediaPlayer.dependencies.SourceBufferExtensions.eventList.ENAME_SOURCEBUFFER_APPEND_COMPLETED, {
                buffer: buffer,
                bytes: bytes
            }, new MediaPlayer.vo.Error(err.code, err.message, null));
        }
    },
    remove: function(buffer, start, end, mediaSource) {
        var self = this;
        try {
            start >= 0 && end > start && "ended" !== mediaSource.readyState && buffer.remove(start, end), 
            this.waitForUpdateEnd(buffer, function() {
                self.notify(MediaPlayer.dependencies.SourceBufferExtensions.eventList.ENAME_SOURCEBUFFER_REMOVE_COMPLETED, {
                    buffer: buffer,
                    from: start,
                    to: end
                });
            });
        } catch (err) {
            self.notify(MediaPlayer.dependencies.SourceBufferExtensions.eventList.ENAME_SOURCEBUFFER_REMOVE_COMPLETED, {
                buffer: buffer,
                from: start,
                to: end
            }, new MediaPlayer.vo.Error(err.code, err.message, null));
        }
    },
    abort: function(mediaSource, buffer) {
        "use strict";
        try {
            "open" === mediaSource.readyState && buffer.abort();
        } catch (ex) {}
    }
}, MediaPlayer.dependencies.SourceBufferExtensions.QUOTA_EXCEEDED_ERROR_CODE = 22, 
MediaPlayer.dependencies.SourceBufferExtensions.eventList = {
    ENAME_SOURCEBUFFER_REMOVE_COMPLETED: "sourceBufferRemoveCompleted",
    ENAME_SOURCEBUFFER_APPEND_COMPLETED: "sourceBufferAppendCompleted"
}, MediaPlayer.dependencies.Stream = function() {
    "use strict";
    var manifest, mediaSource, needKeyListener, keyMessageListener, keyAddedListener, keyErrorListener, mediaInfos = {}, streamProcessors = [], autoPlay = !0, initialized = !1, loaded = !1, errored = !1, kid = null, initData = [], updating = !0, streamInfo = null, updateError = {}, eventController = null, play = function() {
        initialized && this.playbackController.start();
    }, pause = function() {
        this.playbackController.pause();
    }, seek = function(time) {
        initialized && (this.debug.log("Do seek: " + time), this.playbackController.seek(time));
    }, onMediaSourceNeedsKey = function(event) {
        var type, self = this, mediaInfo = mediaInfos.video, videoCodec = mediaInfos ? mediaInfos.video.codec : null;
        if (type = "msneedkey" !== event.type ? event.type : videoCodec, initData.push({
            type: type,
            initData: event.initData
        }), this.debug.log("DRM: Key required for - " + type), mediaInfo && videoCodec && !kid) try {
            kid = self.protectionController.selectKeySystem(mediaInfo);
        } catch (error) {
            pause.call(self), self.debug.log(error), self.errHandler.mediaKeySystemSelectionError(error);
        }
        kid && self.protectionController.ensureKeySession(kid, type, event);
    }, onMediaSourceKeyMessage = function(event) {
        var self = this, session = null;
        this.debug.log("DRM: Got a key message..."), session = event.target, self.protectionController.updateFromMessage(kid, session, event);
    }, onMediaSourceKeyAdded = function() {
        this.debug.log("DRM: Key added.");
    }, onMediaSourceKeyError = function() {
        var msg, session = event.target;
        switch (msg = "DRM: MediaKeyError - sessionId: " + session.sessionId + " errorCode: " + session.error.code + " systemErrorCode: " + session.error.systemCode + " [", 
        session.error.code) {
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
        }
        msg += "]", this.debug.log(msg), this.errHandler.mediaKeySessionError(msg);
    }, setUpMediaSource = function(mediaSourceArg, callback) {
        var self = this, onMediaSourceOpen = function(e) {
            self.debug.log("MediaSource is open!"), self.debug.log(e), mediaSourceArg.removeEventListener("sourceopen", onMediaSourceOpen), 
            mediaSourceArg.removeEventListener("webkitsourceopen", onMediaSourceOpen), callback(mediaSourceArg);
        };
        mediaSourceArg.addEventListener("sourceopen", onMediaSourceOpen, !1), mediaSourceArg.addEventListener("webkitsourceopen", onMediaSourceOpen, !1), 
        self.mediaSourceExt.attachMediaSource(mediaSourceArg, self.videoModel);
    }, tearDownMediaSource = function() {
        var processor, self = this, ln = streamProcessors.length, i = 0;
        for (i; ln > i; i += 1) processor = streamProcessors[i], processor.reset(errored), 
        processor = null;
        eventController && eventController.reset(), streamProcessors = [], mediaSource && self.mediaSourceExt.detachMediaSource(self.videoModel), 
        initialized = !1, kid = null, initData = [], mediaInfos = {}, mediaSource = null, 
        manifest = null;
    }, initializeMediaForType = function(type, manifest) {
        var mimeType, codec, processor, self = this, getCodecOrMimeType = function(mediaInfo) {
            return mediaInfo.codec;
        }, mediaInfo = self.adapter.getMediaInfoForType(manifest, streamInfo, type);
        if ("text" === type) return console.log("Skipping"), console.log(type), void console.log(manifest);
        if (null !== mediaInfo) {
            var contentProtectionData, codecOrMime = getCodecOrMimeType.call(self, mediaInfo), buffer = null;
            if (codecOrMime === mimeType) try {
                buffer = self.sourceBufferExt.createSourceBuffer(mediaSource, mediaInfo);
            } catch (e) {
                self.errHandler.mediaSourceError("Error creating " + type + " source buffer.");
            } else if (codec = codecOrMime, self.debug.log(type + " codec: " + codec), mediaInfos[type] = mediaInfo, 
            contentProtectionData = mediaInfo.contentProtection, contentProtectionData && !self.capabilities.supportsMediaKeys()) self.errHandler.capabilityError("mediakeys"); else if (self.capabilities.supportsCodec(self.videoModel.getElement(), codec)) try {
                buffer = self.sourceBufferExt.createSourceBuffer(mediaSource, mediaInfo);
            } catch (e) {
                self.errHandler.mediaSourceError("Error creating " + type + " source buffer.");
            } else {
                var msg = type + "Codec (" + codec + ") is not supported.";
                self.errHandler.manifestError(msg, "codec", manifest), self.debug.log(msg);
            }
            null === buffer ? self.debug.log("No buffer was created, skipping " + type + " data.") : (processor = self.system.getObject("streamProcessor"), 
            streamProcessors.push(processor), processor.initialize(mimeType || type, buffer, self.videoModel, self.fragmentController, self.playbackController, mediaSource, self, eventController), 
            processor.setMediaInfo(mediaInfo), self.adapter.updateData(processor));
        } else self.debug.log("No " + type + " data.");
    }, initializeMediaSource = function() {
        var events, self = this;
        eventController = self.system.getObject("eventController"), eventController.initialize(self.videoModel), 
        events = self.adapter.getEventsFor(streamInfo), eventController.addInlineEvents(events), 
        initializeMediaForType.call(self, "video", manifest), initializeMediaForType.call(self, "audio", manifest), 
        initializeMediaForType.call(self, "text", manifest);
    }, initializePlayback = function() {
        var manifestDuration, mediaDuration, self = this;
        manifestDuration = streamInfo.manifestInfo.duration, mediaDuration = self.mediaSourceExt.setDuration(mediaSource, manifestDuration), 
        self.debug.log("Duration successfully set to: " + mediaDuration), initialized = !0, 
        checkIfInitializationCompleted.call(self);
    }, onLoad = function() {
        this.debug.log("element loaded!"), loaded = !0, startAutoPlay.call(this);
    }, startAutoPlay = function() {
        initialized && loaded && 0 === streamInfo.index && (eventController.start(), autoPlay && play.call(this));
    }, checkIfInitializationCompleted = function() {
        var self = this, ln = streamProcessors.length, hasError = !!updateError.audio || !!updateError.video, error = hasError ? new MediaPlayer.vo.Error(MediaPlayer.dependencies.Stream.DATA_UPDATE_FAILED_ERROR_CODE, "Data update failed", null) : null, i = 0;
        if (initialized) {
            for (i; ln > i; i += 1) if (console.log(streamProcessors[i]), streamProcessors[i].isUpdating()) return;
            updating = !1, self.notify(MediaPlayer.dependencies.Stream.eventList.ENAME_STREAM_UPDATED, null, error);
        }
    }, onError = function(e) {
        var code = e.data.error.code, msg = "";
        if (-1 !== code) {
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
            }
            errored = !0, this.debug.log("Video Element Error: " + msg), this.debug.log(e.error), 
            this.errHandler.mediaSourceError(msg), this.reset();
        }
    }, doLoad = function(manifestResult) {
        var mediaSourceResult, self = this, onMediaSourceSetup = function(mediaSourceResult) {
            if (mediaSource = mediaSourceResult, initializeMediaSource.call(self), 0 === streamProcessors.length) {
                var msg = "No streams to play.";
                self.errHandler.manifestError(msg, "nostreams", manifest), self.debug.log(msg);
            } else console.log("Starting "), console.log(streamProcessors[0].getType()), self.liveEdgeFinder.initialize(streamProcessors[0]), 
            self.liveEdgeFinder.subscribe(MediaPlayer.dependencies.LiveEdgeFinder.eventList.ENAME_LIVE_EDGE_SEARCH_COMPLETED, self.playbackController), 
            initializePlayback.call(self), startAutoPlay.call(self);
        };
        manifest = manifestResult, mediaSourceResult = self.mediaSourceExt.createMediaSource(), 
        setUpMediaSource.call(self, mediaSourceResult, onMediaSourceSetup);
    }, onBufferingCompleted = function() {
        var processors = getAudioVideoProcessors(), ln = processors.length, i = 0;
        for (i; ln > i; i += 1) if (!processors[i].isBufferingCompleted()) return;
        mediaSource && streamInfo.isLast && this.mediaSourceExt.signalEndOfStream(mediaSource);
    }, onDataUpdateCompleted = function(e) {
        var type = e.sender.streamProcessor.getType();
        updateError[type] = e.error, checkIfInitializationCompleted.call(this);
    }, onKeySystemUpdateCompleted = function(e) {
        e.error && (pause.call(this), this.debug.log(e.error), this.errHandler.mediaKeyMessageError(e.error));
    }, getAudioVideoProcessors = function() {
        var type, proc, arr = [], i = 0, ln = streamProcessors.length;
        for (i; ln > i; i += 1) proc = streamProcessors[i], type = proc.getType(), ("audio" === type || "video" === type) && arr.push(proc);
        return arr;
    }, updateData = function(updatedStreamInfo) {
        var mediaInfo, events, processor, self = this, ln = streamProcessors.length, i = 0;
        for (updating = !0, manifest = self.manifestModel.getValue(), streamInfo = updatedStreamInfo, 
        self.debug.log("Manifest updated... set new data on buffers."), eventController && (events = self.adapter.getEventsFor(streamInfo), 
        eventController.addInlineEvents(events)), i; ln > i; i += 1) processor = streamProcessors[i], 
        mediaInfo = self.adapter.getMediaInfoForType(manifest, streamInfo, processor.getType()), 
        processor.setMediaInfo(mediaInfo), this.adapter.updateData(processor);
    };
    return {
        system: void 0,
        manifestModel: void 0,
        mediaSourceExt: void 0,
        sourceBufferExt: void 0,
        adapter: void 0,
        fragmentController: void 0,
        playbackController: void 0,
        protectionModel: void 0,
        protectionController: void 0,
        protectionExt: void 0,
        capabilities: void 0,
        debug: void 0,
        errHandler: void 0,
        liveEdgeFinder: void 0,
        abrController: void 0,
        notify: void 0,
        subscribe: void 0,
        unsubscribe: void 0,
        eventList: {
            ENAME_STREAM_UPDATED: "streamUpdated"
        },
        setup: function() {
            this[MediaPlayer.dependencies.BufferController.eventList.ENAME_BUFFERING_COMPLETED] = onBufferingCompleted, 
            this[Dash.dependencies.RepresentationController.eventList.ENAME_DATA_UPDATE_COMPLETED] = onDataUpdateCompleted, 
            this[MediaPlayer.dependencies.PlaybackController.eventList.ENAME_PLAYBACK_ERROR] = onError, 
            this[MediaPlayer.dependencies.PlaybackController.eventList.ENAME_PLAYBACK_METADATA_LOADED] = onLoad, 
            this[MediaPlayer.dependencies.ProtectionExtensions.eventList.ENAME_KEY_SYSTEM_UPDATE_COMPLETED] = onKeySystemUpdateCompleted;
        },
        load: function(manifest) {
            doLoad.call(this, manifest);
        },
        setVideoModel: function(value) {
            this.videoModel = value;
        },
        initProtection: function(protectionData) {
            needKeyListener = onMediaSourceNeedsKey.bind(this), keyMessageListener = onMediaSourceKeyMessage.bind(this), 
            keyAddedListener = onMediaSourceKeyAdded.bind(this), keyErrorListener = onMediaSourceKeyError.bind(this), 
            this.protectionModel = this.system.getObject("protectionModel"), this.protectionModel.init(this.getVideoModel()), 
            this.protectionController = this.system.getObject("protectionController"), this.protectionController.init(this.videoModel, this.protectionModel, protectionData), 
            this.protectionModel.listenToNeedKey(needKeyListener), this.protectionModel.listenToKeyMessage(keyMessageListener), 
            this.protectionModel.listenToKeyError(keyErrorListener), this.protectionModel.listenToKeyAdded(keyAddedListener), 
            this.protectionExt.subscribe(MediaPlayer.dependencies.ProtectionExtensions.eventList.ENAME_KEY_SYSTEM_UPDATE_COMPLETED, this.protectionModel), 
            this.protectionExt.subscribe(MediaPlayer.dependencies.ProtectionExtensions.eventList.ENAME_KEY_SYSTEM_UPDATE_COMPLETED, this);
        },
        getVideoModel: function() {
            return this.videoModel;
        },
        setAutoPlay: function(value) {
            autoPlay = value;
        },
        getAutoPlay: function() {
            return autoPlay;
        },
        reset: function() {
            pause.call(this), tearDownMediaSource.call(this), this.protectionController && this.protectionController.teardownKeySystem(kid), 
            this.protectionModel && this.protectionExt.unsubscribe(MediaPlayer.dependencies.ProtectionExtensions.eventList.ENAME_KEY_SYSTEM_UPDATE_COMPLETED, this.protectionModel), 
            this.protectionExt.unsubscribe(MediaPlayer.dependencies.ProtectionExtensions.eventList.ENAME_KEY_SYSTEM_UPDATE_COMPLETED, this), 
            this.protectionController = void 0, this.protectionModel = void 0, this.fragmentController = void 0, 
            this.playbackController.unsubscribe(MediaPlayer.dependencies.PlaybackController.eventList.ENAME_PLAYBACK_ERROR, this), 
            this.playbackController.unsubscribe(MediaPlayer.dependencies.PlaybackController.eventList.ENAME_PLAYBACK_METADATA_LOADED, this), 
            this.playbackController.reset(), this.liveEdgeFinder.abortSearch(), this.liveEdgeFinder.unsubscribe(MediaPlayer.dependencies.LiveEdgeFinder.eventList.ENAME_LIVE_EDGE_SEARCH_COMPLETED, this.playbackController), 
            loaded = !1, updateError = {};
        },
        getDuration: function() {
            return streamInfo.duration;
        },
        getStartTime: function() {
            return streamInfo.start;
        },
        getStreamIndex: function() {
            return streamInfo.index;
        },
        getId: function() {
            return streamInfo.id;
        },
        setStreamInfo: function(stream) {
            streamInfo = stream;
        },
        getStreamInfo: function() {
            return streamInfo;
        },
        startEventController: function() {
            eventController.start();
        },
        resetEventController: function() {
            eventController.reset();
        },
        setPlaybackController: function(value) {
            this.playbackController = value, value.initialize(streamInfo, this.videoModel);
        },
        getPlaybackController: function() {
            return this.playbackController;
        },
        isUpdating: function() {
            return updating;
        },
        updateData: updateData,
        play: play,
        seek: seek,
        pause: pause
    };
}, MediaPlayer.dependencies.Stream.prototype = {
    constructor: MediaPlayer.dependencies.Stream
}, MediaPlayer.dependencies.Stream.DATA_UPDATE_FAILED_ERROR_CODE = 1, MediaPlayer.dependencies.Stream.eventList = {
    ENAME_STREAM_UPDATED: "streamUpdated"
}, MediaPlayer.dependencies.StreamController = function() {
    "use strict";
    var activeStream, protectionData, streams = [], STREAM_BUFFER_END_THRESHOLD = 6, STREAM_END_THRESHOLD = .2, autoPlay = !0, isStreamSwitchingInProgress = !1, play = function() {
        activeStream.play();
    }, pause = function() {
        activeStream.pause();
    }, seek = function(time) {
        activeStream.seek(time);
    }, switchVideoModel = function(fromModel, toModel) {
        var activeVideoElement = fromModel.getElement(), newVideoElement = toModel.getElement();
        newVideoElement.parentNode || activeVideoElement.parentNode.insertBefore(newVideoElement, activeVideoElement), 
        activeVideoElement.style.width = "0px", newVideoElement.style.width = "100%", copyVideoProperties(activeVideoElement, newVideoElement);
    }, attachVideoEvents = function(stream) {
        var playbackCtrl = stream.getPlaybackController();
        playbackCtrl.subscribe(MediaPlayer.dependencies.PlaybackController.eventList.ENAME_PLAYBACK_STARTED, this.manifestUpdater), 
        playbackCtrl.subscribe(MediaPlayer.dependencies.PlaybackController.eventList.ENAME_PLAYBACK_PAUSED, this.manifestUpdater), 
        playbackCtrl.subscribe(MediaPlayer.dependencies.PlaybackController.eventList.ENAME_PLAYBACK_SEEKING, this), 
        playbackCtrl.subscribe(MediaPlayer.dependencies.PlaybackController.eventList.ENAME_PLAYBACK_TIME_UPDATED, this), 
        playbackCtrl.subscribe(MediaPlayer.dependencies.PlaybackController.eventList.ENAME_PLAYBACK_PROGRESS, this);
    }, detachVideoEvents = function(stream) {
        var self = this, playbackCtrl = stream.getPlaybackController();
        setTimeout(function() {
            playbackCtrl.unsubscribe(MediaPlayer.dependencies.PlaybackController.eventList.ENAME_PLAYBACK_STARTED, self.manifestUpdater), 
            playbackCtrl.unsubscribe(MediaPlayer.dependencies.PlaybackController.eventList.ENAME_PLAYBACK_PAUSED, self.manifestUpdater), 
            playbackCtrl.unsubscribe(MediaPlayer.dependencies.PlaybackController.eventList.ENAME_PLAYBACK_SEEKING, self), 
            playbackCtrl.unsubscribe(MediaPlayer.dependencies.PlaybackController.eventList.ENAME_PLAYBACK_TIME_UPDATED, self), 
            playbackCtrl.unsubscribe(MediaPlayer.dependencies.PlaybackController.eventList.ENAME_PLAYBACK_PROGRESS, self);
        }, 1);
    }, copyVideoProperties = function(fromVideoElement, toVideoElement) {
        [ "controls", "loop", "muted", "volume" ].forEach(function(prop) {
            toVideoElement[prop] = fromVideoElement[prop];
        });
    }, onProgress = function(e) {
        !e.data.remainingUnbufferedDuration || e.data.remainingUnbufferedDuration >= STREAM_BUFFER_END_THRESHOLD || onStreamBufferingEnd();
    }, onTimeupdate = function(e) {
        var self = this, playbackQuality = self.videoExt.getPlaybackQuality(activeStream.getVideoModel().getElement());
        playbackQuality && self.metricsModel.addDroppedFrames("video", playbackQuality), 
        getNextStream() && (activeStream.getVideoModel().getElement().seeking || e.data.timeToEnd < STREAM_END_THRESHOLD && switchStream.call(this, activeStream, getNextStream()));
    }, onSeeking = function(e) {
        var seekingStream = getStreamForTime(e.data.seekTime);
        seekingStream && seekingStream !== activeStream && switchStream.call(this, activeStream, seekingStream, e.data.seekTime);
    }, onStreamBufferingEnd = function() {
        var nextStream = getNextStream();
        nextStream && nextStream.seek(nextStream.getStartTime());
    }, getNextStream = function() {
        var nextIndex = activeStream.getStreamIndex() + 1;
        return nextIndex < streams.length ? streams[nextIndex] : null;
    }, getStreamForTime = function(time) {
        var duration = 0, stream = null, ln = streams.length;
        ln > 0 && (duration += streams[0].getStartTime());
        for (var i = 0; ln > i; i++) if (stream = streams[i], duration += stream.getDuration(), 
        duration > time) return stream;
        return null;
    }, createVideoModel = function() {
        var model = this.system.getObject("videoModel"), video = document.createElement("video");
        return model.setElement(video), model;
    }, removeVideoElement = function(element) {
        element.parentNode && element.parentNode.removeChild(element);
    }, switchStream = function(from, to, seekTo) {
        !isStreamSwitchingInProgress && from && to && from !== to && (isStreamSwitchingInProgress = !0, 
        from.pause(), activeStream = to, switchVideoModel.call(this, from.getVideoModel(), to.getVideoModel()), 
        detachVideoEvents.call(this, from), attachVideoEvents.call(this, to), seek(seekTo ? from.getPlaybackController().getTime() : to.getStartTime()), 
        play(), from.resetEventController(), activeStream.startEventController(), isStreamSwitchingInProgress = !1);
    }, composeStreams = function() {
        var playbackCtrl, streamInfo, pLen, sLen, pIdx, sIdx, streamsInfo, stream, self = this, manifest = self.manifestModel.getValue(), metrics = self.metricsModel.getMetricsFor("stream"), manifestUpdateInfo = self.metricsExt.getCurrentManifestUpdate(metrics), videoModel = activeStream ? activeStream.getVideoModel() : self.getVideoModel();
        if (manifest) {
            streamsInfo = self.adapter.getStreamsInfo(manifest);
            try {
                if (0 === streamsInfo.length) throw new Error("There are no streams");
                for (self.metricsModel.updateManifestUpdateInfo(manifestUpdateInfo, {
                    currentTime: videoModel.getCurrentTime(),
                    buffered: videoModel.getElement().buffered,
                    presentationStartTime: streamsInfo[0].start,
                    clientTimeOffset: self.timelineConverter.getClientTimeOffset()
                }), pIdx = 0, pLen = streamsInfo.length; pLen > pIdx; pIdx += 1) {
                    for (streamInfo = streamsInfo[pIdx], sIdx = 0, sLen = streams.length; sLen > sIdx; sIdx += 1) streams[sIdx].getId() === streamInfo.id && (stream = streams[sIdx], 
                    stream.updateData(streamInfo));
                    stream || (stream = self.system.getObject("stream"), playbackCtrl = self.system.getObject("playbackController"), 
                    stream.setStreamInfo(streamInfo), stream.setVideoModel(0 === pIdx ? self.videoModel : createVideoModel.call(self)), 
                    stream.setPlaybackController(playbackCtrl), playbackCtrl.subscribe(MediaPlayer.dependencies.PlaybackController.eventList.ENAME_PLAYBACK_ERROR, stream), 
                    playbackCtrl.subscribe(MediaPlayer.dependencies.PlaybackController.eventList.ENAME_PLAYBACK_METADATA_LOADED, stream), 
                    stream.initProtection(protectionData), stream.setAutoPlay(autoPlay), stream.load(manifest), 
                    stream.subscribe(MediaPlayer.dependencies.Stream.eventList.ENAME_STREAM_UPDATED, self), 
                    streams.push(stream)), self.metricsModel.addManifestUpdateStreamInfo(manifestUpdateInfo, streamInfo.id, streamInfo.index, streamInfo.start, streamInfo.duration), 
                    stream = null;
                }
                activeStream || (activeStream = streams[0], attachVideoEvents.call(self, activeStream), 
                activeStream.subscribe(MediaPlayer.dependencies.Stream.eventList.ENAME_STREAM_UPDATED, this.liveEdgeFinder));
            } catch (e) {
                self.errHandler.manifestError(e.message, "nostreamscomposed", self.manifestModel.getValue()), 
                self.reset();
            }
        }
    }, onStreamUpdated = function() {
        var self = this, ln = streams.length, i = 0;
        for (i; ln > i; i += 1) if (streams[i].isUpdating()) return;
        self.notify(MediaPlayer.dependencies.StreamController.eventList.ENAME_STREAMS_COMPOSED);
    }, onManifestLoaded = function(e) {
        e.error ? this.reset() : (this.manifestModel.setValue(e.data.manifest), this.debug.log("Manifest has loaded."), 
        composeStreams.call(this));
    };
    return {
        system: void 0,
        videoModel: void 0,
        manifestLoader: void 0,
        manifestUpdater: void 0,
        manifestModel: void 0,
        adapter: void 0,
        debug: void 0,
        metricsModel: void 0,
        metricsExt: void 0,
        videoExt: void 0,
        liveEdgeFinder: void 0,
        timelineConverter: void 0,
        errHandler: void 0,
        notify: void 0,
        subscribe: void 0,
        unsubscribe: void 0,
        setup: function() {
            this[MediaPlayer.dependencies.ManifestLoader.eventList.ENAME_MANIFEST_LOADED] = onManifestLoaded, 
            this[MediaPlayer.dependencies.Stream.eventList.ENAME_STREAM_UPDATED] = onStreamUpdated, 
            this[MediaPlayer.dependencies.PlaybackController.eventList.ENAME_PLAYBACK_SEEKING] = onSeeking, 
            this[MediaPlayer.dependencies.PlaybackController.eventList.ENAME_PLAYBACK_PROGRESS] = onProgress, 
            this[MediaPlayer.dependencies.PlaybackController.eventList.ENAME_PLAYBACK_TIME_UPDATED] = onTimeupdate;
        },
        setAutoPlay: function(value) {
            autoPlay = value;
        },
        getAutoPlay: function() {
            return autoPlay;
        },
        setProtectionData: function(value) {
            protectionData = value;
        },
        getVideoModel: function() {
            return this.videoModel;
        },
        setVideoModel: function(value) {
            this.videoModel = value;
        },
        getActiveStreamInfo: function() {
            return activeStream ? activeStream.getStreamInfo() : null;
        },
        load: function(url) {
            this.manifestLoader.load(url);
        },
        reset: function() {
            activeStream && (detachVideoEvents.call(this, activeStream), activeStream.getVideoModel() !== this.getVideoModel() && switchVideoModel.call(this, activeStream.getVideoModel(), this.getVideoModel()));
            for (var i = 0, ln = streams.length; ln > i; i++) {
                var stream = streams[i];
                stream.unsubscribe(MediaPlayer.dependencies.Stream.eventList.ENAME_STREAM_UPDATED, this), 
                stream.reset(), stream.getVideoModel() !== this.getVideoModel() && removeVideoElement(stream.getVideoModel().getElement());
            }
            streams = [], this.manifestUpdater.stop(), this.metricsModel.clearAllCurrentMetrics(), 
            this.manifestModel.setValue(null), this.timelineConverter.reset(), this.adapter.reset(), 
            isStreamSwitchingInProgress = !1, activeStream = null;
        },
        play: play,
        seek: seek,
        pause: pause
    };
}, MediaPlayer.dependencies.StreamController.prototype = {
    constructor: MediaPlayer.dependencies.StreamController
}, MediaPlayer.dependencies.StreamController.eventList = {
    ENAME_STREAMS_COMPOSED: "streamsComposed"
}, MediaPlayer.dependencies.StreamProcessor = function() {
    "use strict";
    var isDynamic, stream, mediaInfo, type, eventController, createBufferControllerForType = function(type) {
        var self = this, controllerName = "video" === type || "audio" === type ? "bufferController" : "textController";
        return self.system.getObject(controllerName);
    };
    return {
        system: void 0,
        indexHandler: void 0,
        liveEdgeFinder: void 0,
        timelineConverter: void 0,
        eventList: void 0,
        abrController: void 0,
        baseURLExt: void 0,
        adapter: void 0,
        initialize: function(typeValue, buffer, videoModel, fragmentController, playbackController, mediaSource, streamValue, eventControllerValue) {
            var fragmentModel, self = this, trackController = self.system.getObject("trackController"), scheduleController = self.system.getObject("scheduleController"), liveEdgeFinder = self.liveEdgeFinder, abrController = self.abrController, indexHandler = self.indexHandler, baseUrlExt = self.baseURLExt, fragmentLoader = this.system.getObject("fragmentLoader"), bufferController = createBufferControllerForType.call(self, typeValue);
            stream = streamValue, type = typeValue, eventController = eventControllerValue, 
            isDynamic = stream.getStreamInfo().manifestInfo.isDynamic, self.bufferController = bufferController, 
            self.playbackController = playbackController, self.scheduleController = scheduleController, 
            self.trackController = trackController, self.videoModel = videoModel, self.fragmentController = fragmentController, 
            self.fragmentLoader = fragmentLoader, trackController.subscribe(Dash.dependencies.RepresentationController.eventList.ENAME_DATA_UPDATE_COMPLETED, bufferController), 
            fragmentController.subscribe(MediaPlayer.dependencies.FragmentController.eventList.ENAME_INIT_FRAGMENT_LOADED, bufferController), 
            "video" === type || "audio" === type ? (abrController.subscribe(MediaPlayer.dependencies.AbrController.eventList.ENAME_QUALITY_CHANGED, bufferController), 
            abrController.subscribe(MediaPlayer.dependencies.AbrController.eventList.ENAME_QUALITY_CHANGED, trackController), 
            abrController.subscribe(MediaPlayer.dependencies.AbrController.eventList.ENAME_QUALITY_CHANGED, scheduleController), 
            liveEdgeFinder.subscribe(MediaPlayer.dependencies.LiveEdgeFinder.eventList.ENAME_LIVE_EDGE_SEARCH_COMPLETED, this.timelineConverter), 
            liveEdgeFinder.subscribe(MediaPlayer.dependencies.LiveEdgeFinder.eventList.ENAME_LIVE_EDGE_SEARCH_COMPLETED, trackController), 
            liveEdgeFinder.subscribe(MediaPlayer.dependencies.LiveEdgeFinder.eventList.ENAME_LIVE_EDGE_SEARCH_COMPLETED, scheduleController), 
            trackController.subscribe(Dash.dependencies.RepresentationController.eventList.ENAME_DATA_UPDATE_STARTED, scheduleController), 
            trackController.subscribe(Dash.dependencies.RepresentationController.eventList.ENAME_DATA_UPDATE_COMPLETED, scheduleController), 
            trackController.subscribe(Dash.dependencies.RepresentationController.eventList.ENAME_DATA_UPDATE_COMPLETED, abrController), 
            trackController.subscribe(Dash.dependencies.RepresentationController.eventList.ENAME_DATA_UPDATE_COMPLETED, stream), 
            playbackController.streamProcessor || (playbackController.streamProcessor = self, 
            trackController.subscribe(Dash.dependencies.RepresentationController.eventList.ENAME_DATA_UPDATE_COMPLETED, playbackController)), 
            fragmentController.subscribe(MediaPlayer.dependencies.FragmentController.eventList.ENAME_MEDIA_FRAGMENT_LOADED, bufferController), 
            fragmentController.subscribe(MediaPlayer.dependencies.FragmentController.eventList.ENAME_MEDIA_FRAGMENT_LOADING_START, scheduleController), 
            fragmentController.subscribe(MediaPlayer.dependencies.FragmentController.eventList.ENAME_STREAM_COMPLETED, scheduleController), 
            fragmentController.subscribe(MediaPlayer.dependencies.FragmentController.eventList.ENAME_STREAM_COMPLETED, bufferController), 
            fragmentController.subscribe(MediaPlayer.dependencies.FragmentController.eventList.ENAME_STREAM_COMPLETED, scheduleController.scheduleRulesCollection.bufferLevelRule), 
            bufferController.subscribe(MediaPlayer.dependencies.BufferController.eventList.ENAME_BUFFER_LEVEL_STATE_CHANGED, videoModel), 
            bufferController.subscribe(MediaPlayer.dependencies.BufferController.eventList.ENAME_BUFFER_CLEARED, scheduleController), 
            bufferController.subscribe(MediaPlayer.dependencies.BufferController.eventList.ENAME_BYTES_APPENDED, scheduleController), 
            bufferController.subscribe(MediaPlayer.dependencies.BufferController.eventList.ENAME_BUFFER_LEVEL_UPDATED, scheduleController), 
            bufferController.subscribe(MediaPlayer.dependencies.BufferController.eventList.ENAME_BUFFER_LEVEL_UPDATED, trackController), 
            bufferController.subscribe(MediaPlayer.dependencies.BufferController.eventList.ENAME_BUFFER_LEVEL_STATE_CHANGED, scheduleController), 
            bufferController.subscribe(MediaPlayer.dependencies.BufferController.eventList.ENAME_INIT_REQUESTED, scheduleController), 
            bufferController.subscribe(MediaPlayer.dependencies.BufferController.eventList.ENAME_BUFFERING_COMPLETED, stream), 
            bufferController.subscribe(MediaPlayer.dependencies.BufferController.eventList.ENAME_QUOTA_EXCEEDED, scheduleController), 
            bufferController.subscribe(MediaPlayer.dependencies.BufferController.eventList.ENAME_BUFFER_LEVEL_OUTRUN, scheduleController.scheduleRulesCollection.bufferLevelRule), 
            bufferController.subscribe(MediaPlayer.dependencies.BufferController.eventList.ENAME_BUFFER_LEVEL_BALANCED, scheduleController.scheduleRulesCollection.bufferLevelRule), 
            bufferController.subscribe(MediaPlayer.dependencies.BufferController.eventList.ENAME_BYTES_APPENDED, playbackController), 
            playbackController.subscribe(MediaPlayer.dependencies.PlaybackController.eventList.ENAME_PLAYBACK_PROGRESS, bufferController), 
            playbackController.subscribe(MediaPlayer.dependencies.PlaybackController.eventList.ENAME_PLAYBACK_TIME_UPDATED, bufferController), 
            playbackController.subscribe(MediaPlayer.dependencies.PlaybackController.eventList.ENAME_PLAYBACK_RATE_CHANGED, bufferController), 
            playbackController.subscribe(MediaPlayer.dependencies.PlaybackController.eventList.ENAME_PLAYBACK_RATE_CHANGED, scheduleController), 
            playbackController.subscribe(MediaPlayer.dependencies.PlaybackController.eventList.ENAME_PLAYBACK_SEEKING, bufferController), 
            playbackController.subscribe(MediaPlayer.dependencies.PlaybackController.eventList.ENAME_PLAYBACK_SEEKING, scheduleController), 
            playbackController.subscribe(MediaPlayer.dependencies.PlaybackController.eventList.ENAME_PLAYBACK_STARTED, scheduleController), 
            playbackController.subscribe(MediaPlayer.dependencies.PlaybackController.eventList.ENAME_PLAYBACK_SEEKING, scheduleController.scheduleRulesCollection.playbackTimeRule), 
            isDynamic && playbackController.subscribe(MediaPlayer.dependencies.PlaybackController.eventList.ENAME_WALLCLOCK_TIME_UPDATED, trackController), 
            playbackController.subscribe(MediaPlayer.dependencies.PlaybackController.eventList.ENAME_WALLCLOCK_TIME_UPDATED, bufferController), 
            playbackController.subscribe(MediaPlayer.dependencies.PlaybackController.eventList.ENAME_WALLCLOCK_TIME_UPDATED, scheduleController), 
            baseUrlExt.subscribe(Dash.dependencies.BaseURLExtensions.eventList.ENAME_INITIALIZATION_LOADED, indexHandler), 
            baseUrlExt.subscribe(Dash.dependencies.BaseURLExtensions.eventList.ENAME_SEGMENTS_LOADED, indexHandler)) : bufferController.subscribe(MediaPlayer.dependencies.TextController.eventList.ENAME_CLOSED_CAPTIONING_REQUESTED, scheduleController), 
            indexHandler.initialize(this), bufferController.initialize(type, buffer, mediaSource, self), 
            scheduleController.initialize(type, this), fragmentModel = this.getFragmentModel(), 
            fragmentModel.setLoader(fragmentLoader), fragmentModel.subscribe(MediaPlayer.dependencies.FragmentModel.eventList.ENAME_FRAGMENT_LOADING_STARTED, fragmentController), 
            fragmentModel.subscribe(MediaPlayer.dependencies.FragmentModel.eventList.ENAME_FRAGMENT_LOADING_COMPLETED, fragmentController), 
            fragmentModel.subscribe(MediaPlayer.dependencies.FragmentModel.eventList.ENAME_STREAM_COMPLETED, fragmentController), 
            fragmentModel.subscribe(MediaPlayer.dependencies.FragmentModel.eventList.ENAME_FRAGMENT_LOADING_COMPLETED, scheduleController), 
            fragmentLoader.subscribe(MediaPlayer.dependencies.FragmentLoader.eventList.ENAME_LOADING_COMPLETED, fragmentModel), 
            ("video" === type || "audio" === type) && (bufferController.subscribe(MediaPlayer.dependencies.BufferController.eventList.ENAME_BUFFER_LEVEL_OUTRUN, fragmentModel), 
            bufferController.subscribe(MediaPlayer.dependencies.BufferController.eventList.ENAME_BUFFER_LEVEL_BALANCED, fragmentModel), 
            bufferController.subscribe(MediaPlayer.dependencies.BufferController.eventList.ENAME_BYTES_REJECTED, fragmentModel)), 
            trackController.initialize(this);
        },
        isUpdating: function() {
            return this.trackController.isUpdating();
        },
        getType: function() {
            return type;
        },
        getFragmentModel: function() {
            return this.scheduleController.getFragmentModel();
        },
        getStreamInfo: function() {
            return stream.getStreamInfo();
        },
        setMediaInfo: function(value) {
            mediaInfo = value;
        },
        getMediaInfo: function() {
            return mediaInfo;
        },
        getEventController: function() {
            return eventController;
        },
        start: function() {
            this.scheduleController.start();
        },
        stop: function() {
            this.scheduleController.stop();
        },
        getCurrentTrack: function() {
            return this.adapter.getCurrentTrackInfo(this.trackController);
        },
        getTrackForQuality: function(quality) {
            return this.adapter.getTrackInfoForQuality(this.trackController, quality);
        },
        isBufferingCompleted: function() {
            return this.bufferController.isBufferingCompleted();
        },
        isDynamic: function() {
            return isDynamic;
        },
        reset: function(errored) {
            var self = this, bufferController = self.bufferController, trackController = self.trackController, scheduleController = self.scheduleController, liveEdgeFinder = self.liveEdgeFinder, fragmentController = self.fragmentController, abrController = self.abrController, playbackController = self.playbackController, indexHandler = this.indexHandler, baseUrlExt = this.baseURLExt, fragmentModel = this.getFragmentModel(), fragmentLoader = this.fragmentLoader, videoModel = self.videoModel;
            abrController.unsubscribe(MediaPlayer.dependencies.AbrController.eventList.ENAME_QUALITY_CHANGED, bufferController), 
            abrController.unsubscribe(MediaPlayer.dependencies.AbrController.eventList.ENAME_QUALITY_CHANGED, trackController), 
            abrController.unsubscribe(MediaPlayer.dependencies.AbrController.eventList.ENAME_QUALITY_CHANGED, scheduleController), 
            liveEdgeFinder.unsubscribe(MediaPlayer.dependencies.LiveEdgeFinder.eventList.ENAME_LIVE_EDGE_SEARCH_COMPLETED, this.timelineConverter), 
            liveEdgeFinder.unsubscribe(MediaPlayer.dependencies.LiveEdgeFinder.eventList.ENAME_LIVE_EDGE_SEARCH_COMPLETED, scheduleController), 
            liveEdgeFinder.unsubscribe(MediaPlayer.dependencies.LiveEdgeFinder.eventList.ENAME_LIVE_EDGE_SEARCH_COMPLETED, trackController), 
            trackController.unsubscribe(Dash.dependencies.RepresentationController.eventList.ENAME_DATA_UPDATE_STARTED, scheduleController), 
            trackController.unsubscribe(Dash.dependencies.RepresentationController.eventList.ENAME_DATA_UPDATE_COMPLETED, bufferController), 
            trackController.unsubscribe(Dash.dependencies.RepresentationController.eventList.ENAME_DATA_UPDATE_COMPLETED, scheduleController), 
            trackController.unsubscribe(Dash.dependencies.RepresentationController.eventList.ENAME_DATA_UPDATE_COMPLETED, abrController), 
            trackController.unsubscribe(Dash.dependencies.RepresentationController.eventList.ENAME_DATA_UPDATE_COMPLETED, stream), 
            trackController.unsubscribe(Dash.dependencies.RepresentationController.eventList.ENAME_DATA_UPDATE_COMPLETED, playbackController), 
            fragmentController.unsubscribe(MediaPlayer.dependencies.FragmentController.eventList.ENAME_INIT_FRAGMENT_LOADED, bufferController), 
            fragmentController.unsubscribe(MediaPlayer.dependencies.FragmentController.eventList.ENAME_MEDIA_FRAGMENT_LOADED, bufferController), 
            fragmentController.unsubscribe(MediaPlayer.dependencies.FragmentController.eventList.ENAME_MEDIA_FRAGMENT_LOADING_START, scheduleController), 
            fragmentController.unsubscribe(MediaPlayer.dependencies.FragmentController.eventList.ENAME_STREAM_COMPLETED, scheduleController), 
            fragmentController.unsubscribe(MediaPlayer.dependencies.FragmentController.eventList.ENAME_STREAM_COMPLETED, bufferController), 
            fragmentController.unsubscribe(MediaPlayer.dependencies.FragmentController.eventList.ENAME_STREAM_COMPLETED, scheduleController.scheduleRulesCollection.bufferLevelRule), 
            bufferController.unsubscribe(MediaPlayer.dependencies.BufferController.eventList.ENAME_BUFFER_LEVEL_STATE_CHANGED, videoModel), 
            bufferController.unsubscribe(MediaPlayer.dependencies.BufferController.eventList.ENAME_BUFFER_CLEARED, scheduleController), 
            bufferController.unsubscribe(MediaPlayer.dependencies.BufferController.eventList.ENAME_BYTES_APPENDED, scheduleController), 
            bufferController.unsubscribe(MediaPlayer.dependencies.BufferController.eventList.ENAME_BUFFER_LEVEL_UPDATED, scheduleController), 
            bufferController.unsubscribe(MediaPlayer.dependencies.BufferController.eventList.ENAME_BUFFER_LEVEL_UPDATED, trackController), 
            bufferController.unsubscribe(MediaPlayer.dependencies.BufferController.eventList.ENAME_BUFFER_LEVEL_STATE_CHANGED, scheduleController), 
            bufferController.unsubscribe(MediaPlayer.dependencies.BufferController.eventList.ENAME_INIT_REQUESTED, scheduleController), 
            bufferController.unsubscribe(MediaPlayer.dependencies.BufferController.eventList.ENAME_BUFFERING_COMPLETED, stream), 
            bufferController.unsubscribe(MediaPlayer.dependencies.BufferController.eventList.ENAME_CLOSED_CAPTIONING_REQUESTED, scheduleController), 
            bufferController.unsubscribe(MediaPlayer.dependencies.BufferController.eventList.ENAME_BUFFER_LEVEL_OUTRUN, scheduleController.scheduleRulesCollection.bufferLevelRule), 
            bufferController.unsubscribe(MediaPlayer.dependencies.BufferController.eventList.ENAME_BUFFER_LEVEL_BALANCED, scheduleController.scheduleRulesCollection.bufferLevelRule), 
            bufferController.unsubscribe(MediaPlayer.dependencies.BufferController.eventList.ENAME_BYTES_APPENDED, playbackController), 
            playbackController.unsubscribe(MediaPlayer.dependencies.PlaybackController.eventList.ENAME_PLAYBACK_PROGRESS, bufferController), 
            playbackController.unsubscribe(MediaPlayer.dependencies.PlaybackController.eventList.ENAME_PLAYBACK_TIME_UPDATED, bufferController), 
            playbackController.unsubscribe(MediaPlayer.dependencies.PlaybackController.eventList.ENAME_PLAYBACK_RATE_CHANGED, bufferController), 
            playbackController.unsubscribe(MediaPlayer.dependencies.PlaybackController.eventList.ENAME_PLAYBACK_RATE_CHANGED, scheduleController), 
            playbackController.unsubscribe(MediaPlayer.dependencies.PlaybackController.eventList.ENAME_PLAYBACK_SEEKING, bufferController), 
            playbackController.unsubscribe(MediaPlayer.dependencies.PlaybackController.eventList.ENAME_PLAYBACK_SEEKING, scheduleController), 
            playbackController.unsubscribe(MediaPlayer.dependencies.PlaybackController.eventList.ENAME_PLAYBACK_STARTED, scheduleController), 
            playbackController.unsubscribe(MediaPlayer.dependencies.PlaybackController.eventList.ENAME_WALLCLOCK_TIME_UPDATED, trackController), 
            playbackController.unsubscribe(MediaPlayer.dependencies.PlaybackController.eventList.ENAME_WALLCLOCK_TIME_UPDATED, bufferController), 
            playbackController.unsubscribe(MediaPlayer.dependencies.PlaybackController.eventList.ENAME_WALLCLOCK_TIME_UPDATED, scheduleController), 
            playbackController.unsubscribe(MediaPlayer.dependencies.PlaybackController.eventList.ENAME_PLAYBACK_SEEKING, scheduleController.scheduleRulesCollection.playbackTimeRule), 
            baseUrlExt.unsubscribe(Dash.dependencies.BaseURLExtensions.eventList.ENAME_INITIALIZATION_LOADED, indexHandler), 
            baseUrlExt.unsubscribe(Dash.dependencies.BaseURLExtensions.eventList.ENAME_SEGMENTS_LOADED, indexHandler), 
            bufferController.unsubscribe(MediaPlayer.dependencies.BufferController.eventList.ENAME_BUFFER_LEVEL_OUTRUN, fragmentModel), 
            bufferController.unsubscribe(MediaPlayer.dependencies.BufferController.eventList.ENAME_BUFFER_LEVEL_BALANCED, fragmentModel), 
            bufferController.unsubscribe(MediaPlayer.dependencies.BufferController.eventList.ENAME_BYTES_REJECTED, fragmentModel), 
            fragmentModel.unsubscribe(MediaPlayer.dependencies.FragmentModel.eventList.ENAME_FRAGMENT_LOADING_STARTED, fragmentController), 
            fragmentModel.unsubscribe(MediaPlayer.dependencies.FragmentModel.eventList.ENAME_FRAGMENT_LOADING_COMPLETED, fragmentController), 
            fragmentModel.unsubscribe(MediaPlayer.dependencies.FragmentModel.eventList.ENAME_STREAM_COMPLETED, fragmentController), 
            fragmentModel.unsubscribe(MediaPlayer.dependencies.FragmentModel.eventList.ENAME_FRAGMENT_LOADING_COMPLETED, scheduleController), 
            fragmentLoader.unsubscribe(MediaPlayer.dependencies.FragmentLoader.eventList.ENAME_LOADING_COMPLETED, fragmentModel), 
            fragmentController.resetModel(fragmentModel), indexHandler.reset(), this.bufferController.reset(errored), 
            this.scheduleController.reset(), this.bufferController = null, this.scheduleController = null, 
            this.trackController = null, this.videoModel = null, this.fragmentController = null;
        }
    };
}, MediaPlayer.dependencies.StreamProcessor.prototype = {
    constructor: MediaPlayer.dependencies.StreamProcessor
}, MediaPlayer.models.URIQueryAndFragmentModel = function() {
    "use strict";
    var URIFragmentDataVO = new MediaPlayer.vo.URIFragmentData(), URIQueryData = [], parseURI = function(uri) {
        function reduceArray(previousValue, currentValue, index, array) {
            var arr = array[0].split(/[=]/);
            return array.push({
                key: arr[0],
                value: arr[1]
            }), array.shift(), array;
        }
        function mapArray(currentValue, index, array) {
            return index > 0 && (isQuery && 0 === URIQueryData.length ? URIQueryData = array[index].split(/[&]/) : isFragment && (URIFragmentData = array[index].split(/[&]/))), 
            array;
        }
        if (!uri) return null;
        var mappedArr, URIFragmentData = [], testQuery = new RegExp(/[?]/), testFragment = new RegExp(/[#]/), isQuery = testQuery.test(uri), isFragment = testFragment.test(uri);
        return mappedArr = uri.split(/[?#]/).map(mapArray), URIQueryData.length > 0 && (URIQueryData = URIQueryData.reduce(reduceArray, null)), 
        URIFragmentData.length > 0 && (URIFragmentData = URIFragmentData.reduce(reduceArray, null), 
        URIFragmentData.forEach(function(object) {
            URIFragmentDataVO[object.key] = object.value;
        })), uri;
    };
    return {
        parseURI: parseURI,
        getURIFragmentData: function() {
            return URIFragmentDataVO;
        },
        getURIQueryData: function() {
            return URIQueryData;
        },
        reset: function() {
            URIFragmentDataVO = new MediaPlayer.vo.URIFragmentData(), URIQueryData = [];
        }
    };
}, MediaPlayer.models.URIQueryAndFragmentModel.prototype = {
    constructor: MediaPlayer.models.URIQueryAndFragmentModel
}, MediaPlayer.models.VideoModel = function() {
    "use strict";
    var element, stalledStreams = [], isStalled = function() {
        return stalledStreams.length > 0;
    }, addStalledStream = function(type) {
        null !== type && (element.playbackRate = 0, stalledStreams[type] !== !0 && (stalledStreams.push(type), 
        stalledStreams[type] = !0));
    }, removeStalledStream = function(type) {
        if (null !== type) {
            stalledStreams[type] = !1;
            var index = stalledStreams.indexOf(type);
            -1 !== index && stalledStreams.splice(index, 1), isStalled() === !1 && (element.playbackRate = 1);
        }
    }, stallStream = function(type, isStalled) {
        isStalled ? addStalledStream(type) : removeStalledStream(type);
    }, onBufferLevelStateChanged = function(e) {
        var type = e.sender.streamProcessor.getType();
        stallStream.call(this, type, !e.data.hasSufficientBuffer);
    };
    return {
        system: void 0,
        setup: function() {
            this.bufferLevelStateChanged = onBufferLevelStateChanged;
        },
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
            element.currentTime != currentTime && (element.currentTime = currentTime);
        },
        listen: function(type, callback) {
            element.addEventListener(type, callback, !1);
        },
        unlisten: function(type, callback) {
            element.removeEventListener(type, callback, !1);
        },
        getElement: function() {
            return element;
        },
        setElement: function(value) {
            element = value;
        },
        setSource: function(source) {
            element.src = source;
        }
    };
}, MediaPlayer.models.VideoModel.prototype = {
    constructor: MediaPlayer.models.VideoModel
}, MediaPlayer.dependencies.VideoModelExtensions = function() {
    "use strict";
    return {
        getPlaybackQuality: function(videoElement) {
            var hasWebKit = "webkitDroppedFrameCount" in videoElement, hasQuality = "getVideoPlaybackQuality" in videoElement, result = null;
            return hasQuality ? result = videoElement.getVideoPlaybackQuality() : hasWebKit && (result = {
                droppedVideoFrames: videoElement.webkitDroppedFrameCount,
                creationTime: new Date()
            }), result;
        }
    };
}, MediaPlayer.dependencies.VideoModelExtensions.prototype = {
    constructor: MediaPlayer.dependencies.VideoModelExtensions
}, MediaPlayer.utils.TTMLParser = function() {
    "use strict";
    var ttml, SECONDS_IN_HOUR = 3600, SECONDS_IN_MIN = 60, timingRegex = /^(0[0-9]|1[0-9]|2[0-3]):([0-5][0-9]):([0-5][0-9])((\.[0-9][0-9][0-9])|(:[0-9][0-9]))$/, parseTimings = function(timingStr) {
        var timeParts, parsedTime, frameRate, test = timingRegex.test(timingStr);
        if (!test) return 0/0;
        if (timeParts = timingStr.split(":"), parsedTime = parseFloat(timeParts[0]) * SECONDS_IN_HOUR + parseFloat(timeParts[1]) * SECONDS_IN_MIN + parseFloat(timeParts[2]), 
        timeParts[3]) {
            if (frameRate = ttml.tt.frameRate, !frameRate || isNaN(frameRate)) return 0/0;
            parsedTime += parseFloat(timeParts[3]) / frameRate;
        }
        return parsedTime;
    }, passStructuralConstraints = function() {
        var passed = !1, hasTt = ttml.hasOwnProperty("tt"), hasHead = hasTt ? ttml.tt.hasOwnProperty("head") : !1, hasLayout = hasHead ? ttml.tt.head.hasOwnProperty("layout") : !1, hasStyling = hasHead ? ttml.tt.head.hasOwnProperty("styling") : !1, hasBody = hasTt ? ttml.tt.hasOwnProperty("body") : !1, hasProfile = hasHead ? ttml.tt.head.hasOwnProperty("profile") : !1;
        return hasTt && hasHead && hasLayout && hasStyling && hasBody && (passed = !0), 
        passed && (passed = hasProfile && "http://www.w3.org/ns/ttml/profile/sdp-us" === ttml.tt.head.profile.use), 
        passed;
    }, getNamespacePrefix = function(json, ns) {
        var r = Object.keys(json).filter(function(k) {
            return "xmlns" === k.split(":")[0] && json[k] === ns;
        }).map(function(k) {
            return k.split(":")[1];
        });
        return 1 != r.length ? null : r[0];
    }, internalParse = function(data) {
        var errorMsg, cues, cue, startTime, endTime, nsttp, i, captionArray = [], converter = new X2JS([], "", !1);
        if (ttml = converter.xml_str2json(data), !passStructuralConstraints()) throw errorMsg = "TTML document has incorrect structure";
        if (nsttp = getNamespacePrefix(ttml.tt, "http://www.w3.org/ns/ttml#parameter"), 
        ttml.tt.hasOwnProperty(nsttp + ":frameRate") && (ttml.tt.frameRate = parseInt(ttml.tt[nsttp + ":frameRate"], 10)), 
        cues = ttml.tt.body.div_asArray[0].p_asArray, !cues || 0 === cues.length) throw errorMsg = "TTML document does not contain any cues";
        for (i = 0; i < cues.length; i += 1) {
            if (cue = cues[i], startTime = parseTimings(cue.begin), endTime = parseTimings(cue.end), 
            isNaN(startTime) || isNaN(endTime)) throw errorMsg = "TTML document has incorrect timing value";
            captionArray.push({
                start: startTime,
                end: endTime,
                data: cue.__text
            });
        }
        return captionArray;
    };
    return {
        parse: internalParse
    };
}, MediaPlayer.dependencies.TextController = function() {
    var mediaSource, buffer, type, initialized = !1, onDataUpdateCompleted = function() {
        initialized || (buffer.hasOwnProperty("initialize") && buffer.initialize(type, this), 
        initialized = !0), this.notify(MediaPlayer.dependencies.TextController.eventList.ENAME_CLOSED_CAPTIONING_REQUESTED, {
            CCIndex: 0
        });
    }, onInitFragmentLoaded = function(e) {
        var self = this;
        e.data.fragmentModel === self.streamProcessor.getFragmentModel() && null !== e.data.bytes && self.sourceBufferExt.append(buffer, e.data.bytes, self.videoModel);
    };
    return {
        sourceBufferExt: void 0,
        debug: void 0,
        system: void 0,
        notify: void 0,
        subscribe: void 0,
        unsubscribe: void 0,
        setup: function() {
            this[Dash.dependencies.RepresentationController.eventList.ENAME_DATA_UPDATE_COMPLETED] = onDataUpdateCompleted, 
            this[MediaPlayer.dependencies.FragmentController.eventList.ENAME_INIT_FRAGMENT_LOADED] = onInitFragmentLoaded;
        },
        initialize: function(typeValue, buffer, source, streamProcessor) {
            var self = this;
            type = typeValue, self.setBuffer(buffer), self.setMediaSource(source), self.videoModel = streamProcessor.videoModel, 
            self.trackController = streamProcessor.trackController, self.streamProcessor = streamProcessor;
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
        reset: function(errored) {
            errored || (this.sourceBufferExt.abort(mediaSource, buffer), this.sourceBufferExt.removeSourceBuffer(mediaSource, buffer));
        }
    };
}, MediaPlayer.dependencies.TextController.prototype = {
    constructor: MediaPlayer.dependencies.TextController
}, MediaPlayer.dependencies.TextController.eventList = {
    ENAME_CLOSED_CAPTIONING_REQUESTED: "closedCaptioningRequested"
}, MediaPlayer.dependencies.TextSourceBuffer = function() {
    var mediaInfo, mimeType;
    return {
        system: void 0,
        eventBus: void 0,
        errHandler: void 0,
        initialize: function(type, bufferController) {
            mimeType = type, this.videoModel = bufferController.videoModel, mediaInfo = bufferController.streamProcessor.getCurrentTrack().mediaInfo;
        },
        append: function(bytes) {
            var result, label, lang, self = this, ccContent = String.fromCharCode.apply(null, new Uint16Array(bytes));
            try {
                result = self.getParser().parse(ccContent), label = mediaInfo.id, lang = mediaInfo.lang, 
                self.getTextTrackExtensions().addTextTrack(self.videoModel.getElement(), result, label, lang, !0), 
                self.eventBus.dispatchEvent({
                    type: "updateend"
                });
            } catch (e) {
                self.errHandler.closedCaptionsError(e, "parse", ccContent);
            }
        },
        abort: function() {
            this.getTextTrackExtensions().deleteCues(this.videoModel.getElement());
        },
        getParser: function() {
            var parser;
            return "text/vtt" === mimeType ? parser = this.system.getObject("vttParser") : "application/ttml+xml" === mimeType && (parser = this.system.getObject("ttmlParser")), 
            parser;
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
}, MediaPlayer.dependencies.TextSourceBuffer.prototype = {
    constructor: MediaPlayer.dependencies.TextSourceBuffer
}, MediaPlayer.utils.TextTrackExtensions = function() {
    "use strict";
    var Cue;
    return {
        setup: function() {
            Cue = window.VTTCue || window.TextTrackCue;
        },
        addTextTrack: function(video, captionData, label, scrlang, isDefaultTrack) {
            var track = video.addTextTrack("captions", label, scrlang);
            track.default = isDefaultTrack, track.mode = "showing";
            for (var item in captionData) {
                var currentItem = captionData[item];
                track.addCue(new Cue(currentItem.start, currentItem.end, currentItem.data));
            }
            return track;
        },
        deleteCues: function(video) {
            for (var i = 0, firstValidTrack = !1; !firstValidTrack; ) {
                if (null !== video.textTracks[i].cues) {
                    firstValidTrack = !0;
                    break;
                }
                i++;
            }
            var track = video.textTracks[i], cues = track.cues, lastIdx = cues.length - 1;
            for (i = lastIdx; i >= 0; i--) track.removeCue(cues[i]);
            track.mode = "disabled", track.default = !1;
        }
    };
}, MediaPlayer.utils.VTTParser = function() {
    "use strict";
    var convertCuePointTimes = function(time) {
        var timeArray = time.split(":"), len = timeArray.length - 1;
        return time = 60 * parseInt(timeArray[len - 1], 10) + parseFloat(timeArray[len], 10), 
        2 === len && (time += 3600 * parseInt(timeArray[0], 10)), time;
    };
    return {
        parse: function(data) {
            var len, regExNewLine = /(?:\r\n|\r|\n)/gm, regExToken = /-->/, regExWhiteSpace = /(^[\s]+|[\s]+$)/g, captionArray = [];
            data = data.split(regExNewLine), len = data.length;
            for (var i = 0; len > i; i++) {
                var item = data[i];
                if (item.length > 0 && "WEBVTT" !== item && item.match(regExToken)) {
                    var cuePoints = item.split(regExToken), sublines = data[i + 1];
                    captionArray.push({
                        start: convertCuePointTimes(cuePoints[0].replace(regExWhiteSpace, "")),
                        end: convertCuePointTimes(cuePoints[1].replace(regExWhiteSpace, "")),
                        data: sublines
                    });
                }
            }
            return captionArray;
        }
    };
}, MediaPlayer.rules.ABRRulesCollection = function() {
    "use strict";
    var qualitySwitchRules = [];
    return {
        downloadRatioRule: void 0,
        insufficientBufferRule: void 0,
        limitSwitchesRule: void 0,
        getRules: function(type) {
            switch (type) {
              case MediaPlayer.rules.ABRRulesCollection.prototype.QUALITY_SWITCH_RULES:
                return qualitySwitchRules;

              default:
                return null;
            }
        },
        setup: function() {
            qualitySwitchRules.push(this.downloadRatioRule), qualitySwitchRules.push(this.insufficientBufferRule), 
            qualitySwitchRules.push(this.limitSwitchesRule);
        }
    };
}, MediaPlayer.rules.ABRRulesCollection.prototype = {
    constructor: MediaPlayer.rules.ABRRulesCollection,
    QUALITY_SWITCH_RULES: "qualitySwitchRules"
}, MediaPlayer.rules.DownloadRatioRule = function() {
    "use strict";
    var videoBandwidth, MAX_SCALEDOWNS_FROM_BITRATE = 2, streamProcessors = {}, unhealthyIndexes = {}, checkRatio = function(sp, newIdx, currentBandwidth) {
        var newBandwidth = sp.getTrackForQuality(newIdx).bandwidth;
        return newBandwidth / currentBandwidth;
    }, doSwitch = function(self, mediaType, idx) {
        var reliable = !0;
        if (unhealthyIndexes.hasOwnProperty(mediaType)) for (var key in unhealthyIndexes[mediaType]) if (unhealthyIndexes[mediaType].hasOwnProperty(key) && idx >= key && unhealthyIndexes[mediaType][key] >= MAX_SCALEDOWNS_FROM_BITRATE) {
            reliable = !1;
            break;
        }
        return reliable ? (self.debug.log("!!Switching to index " + (idx + 1) + " for " + mediaType), 
        new MediaPlayer.rules.SwitchRequest(idx)) : (self.debug.log("!!Index " + (idx + 1) + " for " + mediaType + " is unreliable"), 
        idx > 0 ? doSwitch(self, mediaType, idx - 1) : new MediaPlayer.rules.switchRequest());
    }, setUnhealthy = function(self, manifestInfo, mediaType, idx) {
        var reset = 1e3 * Math.max(manifestInfo.minBufferTime, manifestInfo.maxFragmentDuration) * 5;
        unhealthyIndexes.hasOwnProperty(mediaType) || (unhealthyIndexes[mediaType] = []), 
        unhealthyIndexes[mediaType].hasOwnProperty(idx) || (self.debug.log("!!Resetting " + mediaType + " " + (idx + 1)), 
        unhealthyIndexes[mediaType][idx] = 0), unhealthyIndexes[mediaType][idx] += 1, setTimeout(function() {
            unhealthyIndexes[mediaType][idx] < MAX_SCALEDOWNS_FROM_BITRATE && setHealthy(self, mediaType, idx);
        }, reset), self.debug.log("!!" + mediaType + " index " + (idx + 1) + " has unhealthy score of " + unhealthyIndexes[mediaType][idx]);
    }, setHealthy = function(self, mediaType, idx) {
        unhealthyIndexes.hasOwnProperty(mediaType) || (unhealthyIndexes[mediaType] = []), 
        unhealthyIndexes[mediaType].hasOwnProperty(idx) || (self.debug.log("!!Resetting " + mediaType + " " + (idx + 1)), 
        unhealthyIndexes[mediaType][idx] = 0), unhealthyIndexes[mediaType][idx] > 0 && (unhealthyIndexes[mediaType][idx] = 0), 
        self.debug.log("!!" + mediaType + " index " + (idx + 1) + " has unhealthy score of " + unhealthyIndexes[mediaType][idx]);
    };
    return {
        debug: void 0,
        metricsExt: void 0,
        metricsModel: void 0,
        setStreamProcessor: function(streamProcessorValue) {
            var type = streamProcessorValue.getType(), id = streamProcessorValue.getStreamInfo().id;
            streamProcessors[id] = streamProcessors[id] || {}, streamProcessors[id][type] = streamProcessorValue;
        },
        execute: function(context, callback) {
            var downloadTime, totalTime, downloadRatio, totalRatio, switchRatio, oneDownBandwidth, oneUpBandwidth, currentBandwidth, i, switchRequest, self = this, streamId = context.getStreamInfo().id, manifestInfo = context.getManifestInfo(), mediaInfo = context.getMediaInfo(), mediaType = mediaInfo.type, current = context.getCurrentValue(), sp = streamProcessors[streamId][mediaType], metrics = self.metricsModel.getReadOnlyMetricsFor(mediaType), lastRequest = self.metricsExt.getCurrentHttpRequest(metrics), max = mediaInfo.trackCount - 1;
            if (null == lastRequest) return void callback(new MediaPlayer.rules.SwitchRequest(Math.floor(max / 2)));
            if (!metrics) return void callback(new MediaPlayer.rules.SwitchRequest());
            if (totalTime = (lastRequest.tfinish.getTime() - lastRequest.trequest.getTime()) / 1e3, 
            downloadTime = (lastRequest.tfinish.getTime() - lastRequest.tresponse.getTime()) / 1e3, 
            0 >= totalTime) return void callback(new MediaPlayer.rules.SwitchRequest());
            if (null === lastRequest.mediaduration || void 0 === lastRequest.mediaduration || lastRequest.mediaduration <= 0 || isNaN(lastRequest.mediaduration)) return void callback(new MediaPlayer.rules.SwitchRequest());
            if (totalRatio = lastRequest.mediaduration / totalTime, downloadRatio = lastRequest.mediaduration / downloadTime, 
            isNaN(downloadRatio) || isNaN(totalRatio)) return self.debug.log("The ratios are NaN, bailing."), 
            void callback(new MediaPlayer.rules.SwitchRequest());
            if ("video" == mediaType && (self.debug.log("!!Total ratio: " + lastRequest.mediaduration + "/" + totalTime + " = " + totalRatio), 
            self.debug.log("!!Download ratio: " + downloadRatio)), isNaN(totalRatio)) switchRequest = current; else if (4 > totalRatio) current > 0 ? (self.debug.log("We are not at the lowest bitrate, so switch down."), 
            oneDownBandwidth = sp.getTrackForQuality(current - 1).bandwidth, currentBandwidth = sp.getTrackForQuality(current).bandwidth, 
            switchRatio = oneDownBandwidth / currentBandwidth, setUnhealthy(self, manifestInfo, mediaType, current), 
            switchRatio > totalRatio ? (self.debug.log("Things must be going pretty bad, switch all the way down."), 
            switchRequest = Math.max(current - 3, 0), setUnhealthy(self, manifestInfo, mediaType, current)) : (self.debug.log("Things could be better, so just switch down one index."), 
            switchRequest = current - 1)) : switchRequest = current; else if (max > current) if (oneUpBandwidth = sp.getTrackForQuality(current + 1).bandwidth, 
            currentBandwidth = sp.getTrackForQuality(current).bandwidth, switchRatio = oneUpBandwidth / currentBandwidth, 
            totalRatio >= switchRatio) if ("video" == mediaType && self.debug.log("!!Oneup: " + totalRatio * currentBandwidth / oneUpBandwidth), 
            totalRatio * currentBandwidth / oneUpBandwidth >= 5 && setHealthy(self, mediaType, current + 1), 
            totalRatio > 100) self.debug.log("Tons of bandwidth available, go all the way up."), 
            switchRequest = Math.min(current + 3, max); else if (totalRatio > 10) self.debug.log("Just enough bandwidth available, switch up one."), 
            switchRequest = current + 1; else {
                for (i = -1; (i += 1) < max && !(totalRatio < checkRatio.call(self, sp, i, currentBandwidth)); ) ;
                "video" == mediaType && self.debug.log("!!Calculated ideal new quality index is: " + i), 
                switchRequest = i;
            } else switchRequest = current; else switchRequest = max;
            if ("video" === mediaType) videoBandwidth = sp.getTrackForQuality(switchRequest).bandwidth; else if ("audio" === mediaType && videoBandwidth && sp.getTrackForQuality(switchRequest).bandwidth > videoBandwidth) for (self.debug.log("!!Audio bitrate is less than video! Switch down."); switchRequest > 0 && sp.getTrackForQuality(switchRequest).bandwidth > videoBandwidth; ) switchRequest -= 1;
            callback(doSwitch(self, mediaType, switchRequest));
        },
        reset: function() {
            streamProcessors = {};
        }
    };
}, MediaPlayer.rules.DownloadRatioRule.prototype = {
    constructor: MediaPlayer.rules.DownloadRatioRule
}, MediaPlayer.rules.InsufficientBufferRule = function() {
    "use strict";
    var dryBufferHits = 0, DRY_BUFFER_LIMIT = 3;
    return {
        debug: void 0,
        metricsModel: void 0,
        execute: function(context, callback) {
            var playlist, trace, reset, self = this, mediaType = context.getMediaInfo().type, current = context.getCurrentValue(), metrics = self.metricsModel.getReadOnlyMetricsFor(mediaType), shift = !1, p = MediaPlayer.rules.SwitchRequest.prototype.DEFAULT, manifestInfo = context.getManifestInfo();
            return null === metrics.PlayList || void 0 === metrics.PlayList || 0 === metrics.PlayList.length ? void callback(new MediaPlayer.rules.SwitchRequest()) : (playlist = metrics.PlayList[metrics.PlayList.length - 1], 
            null === playlist || void 0 === playlist || 0 === playlist.trace.length ? void callback(new MediaPlayer.rules.SwitchRequest()) : (trace = playlist.trace[playlist.trace.length - 2], 
            null === trace || void 0 === trace || null === trace.stopreason || void 0 === trace.stopreason ? void callback(new MediaPlayer.rules.SwitchRequest()) : (console.log(trace), 
            trace.stopreason === MediaPlayer.vo.metrics.PlayList.Trace.REBUFFERING_REASON && (shift = !0, 
            dryBufferHits += 1, reset = 1e3 * Math.max(manifestInfo.minBufferTime, manifestInfo.maxFragmentDuration), 
            setTimeout(function() {
                dryBufferHits -= 1;
            }, reset), self.debug.log("Number of times the buffer has run dry: " + dryBufferHits)), 
            dryBufferHits > DRY_BUFFER_LIMIT && (p = MediaPlayer.rules.SwitchRequest.prototype.STRONG, 
            self.debug.log("Apply STRONG to buffer rule.")), void (shift && 0 != current ? (self.debug.log("The buffer ran dry recently, switch down."), 
            callback(new MediaPlayer.rules.SwitchRequest(current - 1, p))) : dryBufferHits > DRY_BUFFER_LIMIT ? (self.debug.log("Too many dry buffer hits, quit switching bitrates."), 
            callback(new MediaPlayer.rules.SwitchRequest(current, p))) : callback(new MediaPlayer.rules.SwitchRequest(MediaPlayer.rules.SwitchRequest.prototype.NO_CHANGE, p))))));
        }
    };
}, MediaPlayer.rules.InsufficientBufferRule.prototype = {
    constructor: MediaPlayer.rules.InsufficientBufferRule
}, MediaPlayer.rules.LimitSwitchesRule = function() {
    "use strict";
    var lastCheckTime = 0, qualitySwitchThreshold = 2e3;
    return {
        debug: void 0,
        metricsModel: void 0,
        execute: function(context, callback) {
            var delay, self = this, mediaType = context.getMediaInfo().type, current = context.getCurrentValue(), metrics = this.metricsModel.getReadOnlyMetricsFor(mediaType), manifestInfo = context.getManifestInfo(), lastIdx = metrics.RepSwitchList.length - 1, rs = metrics.RepSwitchList[lastIdx], now = new Date().getTime();
            return qualitySwitchThreshold = 1e3 * Math.min(manifestInfo.minBufferTime, manifestInfo.maxFragmentDuration), 
            delay = now - lastCheckTime, qualitySwitchThreshold > delay && now - rs.t.getTime() < qualitySwitchThreshold ? (self.debug.log("Wait some time before allowing another switch."), 
            void callback(new MediaPlayer.rules.SwitchRequest(current, MediaPlayer.rules.SwitchRequest.prototype.STRONG))) : (lastCheckTime = now, 
            void callback(new MediaPlayer.rules.SwitchRequest(MediaPlayer.rules.SwitchRequest.prototype.NO_CHANGE, MediaPlayer.rules.SwitchRequest.prototype.STRONG)));
        }
    };
}, MediaPlayer.rules.LimitSwitchesRule.prototype = {
    constructor: MediaPlayer.rules.LimitSwitchesRule
}, MediaPlayer.rules.RulesContext = function(streamProcessor, currentValue) {
    "use strict";
    var trackInfo = streamProcessor.getCurrentTrack();
    return {
        getStreamInfo: function() {
            return trackInfo.mediaInfo.streamInfo;
        },
        getMediaInfo: function() {
            return trackInfo.mediaInfo;
        },
        getTrackInfo: function() {
            return trackInfo;
        },
        getCurrentValue: function() {
            return currentValue;
        },
        getManifestInfo: function() {
            return trackInfo.mediaInfo.streamInfo.manifestInfo;
        }
    };
}, MediaPlayer.rules.RulesContext.prototype = {
    constructor: MediaPlayer.rules.RulesContext
}, MediaPlayer.rules.BufferLevelRule = function() {
    "use strict";
    var isBufferLevelOutran = {}, isCompleted = {}, scheduleController = {}, getCurrentHttpRequestLatency = function(metrics) {
        var httpRequest = this.metricsExt.getCurrentHttpRequest(metrics);
        return null !== httpRequest ? (httpRequest.tresponse.getTime() - httpRequest.trequest.getTime()) / 1e3 : 0;
    }, decideBufferLength = function(minBufferTime, duration) {
        var minBufferTarget;
        return minBufferTarget = isNaN(duration) || MediaPlayer.dependencies.BufferController.DEFAULT_MIN_BUFFER_TIME < duration && duration > minBufferTime ? Math.max(5 * MediaPlayer.dependencies.BufferController.DEFAULT_MIN_BUFFER_TIME, 5 * minBufferTime) : minBufferTime >= duration ? Math.min(duration, MediaPlayer.dependencies.BufferController.DEFAULT_MIN_BUFFER_TIME) : Math.min(duration, 5 * minBufferTime);
    }, getRequiredBufferLength = function(isDynamic, duration, scheduleController) {
        var self = this, criticalBufferLevel = scheduleController.bufferController.getCriticalBufferLevel(), minBufferTarget = decideBufferLength.call(this, scheduleController.bufferController.getMinBufferTime(), duration), currentBufferTarget = minBufferTarget, bufferMax = scheduleController.bufferController.bufferMax, vmetrics = self.metricsModel.getReadOnlyMetricsFor("video"), ametrics = self.metricsModel.getReadOnlyMetricsFor("audio"), isLongFormContent = duration >= MediaPlayer.dependencies.BufferController.LONG_FORM_CONTENT_DURATION_THRESHOLD, requiredBufferLength = 0;
        return bufferMax === MediaPlayer.dependencies.BufferController.BUFFER_SIZE_MIN ? requiredBufferLength = minBufferTarget : bufferMax === MediaPlayer.dependencies.BufferController.BUFFER_SIZE_INFINITY ? requiredBufferLength = duration : bufferMax === MediaPlayer.dependencies.BufferController.BUFFER_SIZE_REQUIRED && (!isDynamic && self.abrController.isPlayingAtTopQuality(scheduleController.streamProcessor.getStreamInfo()) && (currentBufferTarget = isLongFormContent ? MediaPlayer.dependencies.BufferController.BUFFER_TIME_AT_TOP_QUALITY_LONG_FORM : MediaPlayer.dependencies.BufferController.BUFFER_TIME_AT_TOP_QUALITY), 
        requiredBufferLength = currentBufferTarget + Math.max(getCurrentHttpRequestLatency.call(self, vmetrics), getCurrentHttpRequestLatency.call(self, ametrics))), 
        requiredBufferLength = Math.min(requiredBufferLength, criticalBufferLevel);
    }, isCompletedT = function(streamId, type) {
        return isCompleted[streamId] && isCompleted[streamId][type];
    }, isBufferLevelOutranT = function(streamId, type) {
        return isBufferLevelOutran[streamId] && isBufferLevelOutran[streamId][type];
    }, onStreamCompleted = function(e) {
        var streamId = e.data.fragmentModel.getContext().streamProcessor.getStreamInfo().id;
        isCompleted[streamId] = isCompleted[streamId] || {}, isCompleted[streamId][e.data.request.mediaType] = !0;
    }, onBufferLevelOutrun = function(e) {
        var streamId = e.sender.streamProcessor.getStreamInfo().id;
        isBufferLevelOutran[streamId] = isBufferLevelOutran[streamId] || {}, isBufferLevelOutran[streamId][e.sender.streamProcessor.getType()] = !0;
    }, onBufferLevelBalanced = function(e) {
        var streamId = e.sender.streamProcessor.getStreamInfo().id;
        isBufferLevelOutran[streamId] = isBufferLevelOutran[streamId] || {}, isBufferLevelOutran[streamId][e.sender.streamProcessor.getType()] = !1;
    };
    return {
        metricsExt: void 0,
        metricsModel: void 0,
        abrController: void 0,
        setup: function() {
            this[MediaPlayer.dependencies.BufferController.eventList.ENAME_BUFFER_LEVEL_OUTRUN] = onBufferLevelOutrun, 
            this[MediaPlayer.dependencies.BufferController.eventList.ENAME_BUFFER_LEVEL_BALANCED] = onBufferLevelBalanced, 
            this[MediaPlayer.dependencies.FragmentController.eventList.ENAME_STREAM_COMPLETED] = onStreamCompleted;
        },
        setScheduleController: function(scheduleControllerValue) {
            var id = scheduleControllerValue.streamProcessor.getStreamInfo().id;
            scheduleController[id] = scheduleController[id] || {}, scheduleController[id][scheduleControllerValue.streamProcessor.getType()] = scheduleControllerValue;
        },
        execute: function(context, callback) {
            var streamInfo = context.getStreamInfo(), streamId = streamInfo.id, mediaType = context.getMediaInfo().type;
            if (isBufferLevelOutranT(streamId, mediaType)) return void callback(new MediaPlayer.rules.SwitchRequest(0, MediaPlayer.rules.SwitchRequest.prototype.STRONG));
            var fragmentCount, metrics = this.metricsModel.getReadOnlyMetricsFor(mediaType), bufferLevel = this.metricsExt.getCurrentBufferLevel(metrics) ? this.metricsExt.getCurrentBufferLevel(metrics).level : 0, scheduleCtrl = scheduleController[streamId][mediaType], track = scheduleCtrl.streamProcessor.getCurrentTrack(), isDynamic = scheduleCtrl.streamProcessor.isDynamic(), rate = this.metricsExt.getCurrentPlaybackRate(metrics), duration = streamInfo.duration, bufferedDuration = bufferLevel / Math.max(rate, 1), fragmentDuration = track.fragmentDuration, currentTime = scheduleCtrl.playbackController.getTime(), timeToEnd = isDynamic ? Number.POSITIVE_INFINITY : duration - currentTime, requiredBufferLength = Math.min(getRequiredBufferLength.call(this, isDynamic, duration, scheduleCtrl), timeToEnd), remainingDuration = Math.max(requiredBufferLength - bufferedDuration, 0);
            fragmentCount = Math.ceil(remainingDuration / fragmentDuration), bufferedDuration >= timeToEnd && !isCompletedT(streamId, mediaType) && (fragmentCount = fragmentCount || 1), 
            callback(new MediaPlayer.rules.SwitchRequest(fragmentCount, MediaPlayer.rules.SwitchRequest.prototype.DEFAULT));
        },
        reset: function() {
            isBufferLevelOutran = {}, isCompleted = {}, scheduleController = {};
        }
    };
}, MediaPlayer.rules.BufferLevelRule.prototype = {
    constructor: MediaPlayer.rules.BufferLevelRule
}, MediaPlayer.rules.LiveEdgeBBCSearchRule = function() {
    "use strict";
    var finder, callback, SEARCH_TIME_SPAN = 600, liveEdgeInitialSearchPosition = 0/0, liveEdgeSearchRange = null, liveEdgeSearchStep = 0/0, trackInfo = null, useBinarySearch = !1, fragmentDuration = 0/0, p = MediaPlayer.rules.SwitchRequest.prototype.DEFAULT, findLiveEdge = function(searchTime, onSuccess, onError, request) {
        var req, self = this;
        if (null === request) req = self.adapter.generateFragmentRequestForTime(finder.streamProcessor, trackInfo, searchTime), 
        findLiveEdge.call(self, searchTime, onSuccess, onError, req); else {
            var handler = function(e) {
                finder.fragmentLoader.unsubscribe(MediaPlayer.dependencies.FragmentLoader.eventList.ENAME_CHECK_FOR_EXISTENCE_COMPLETED, self, handler), 
                e.data.exists ? onSuccess.call(self, e.data.request, searchTime) : onError.call(self, e.data.request, searchTime);
            };
            finder.fragmentLoader.subscribe(MediaPlayer.dependencies.FragmentLoader.eventList.ENAME_CHECK_FOR_EXISTENCE_COMPLETED, self, handler), 
            finder.fragmentLoader.checkForExistence(request);
        }
    }, onSearchForFragmentFailed = function(request, lastSearchTime) {
        var searchTime, req, searchInterval;
        return useBinarySearch ? void binarySearch.call(this, !1, lastSearchTime) : (searchInterval = lastSearchTime - liveEdgeInitialSearchPosition, 
        searchTime = searchInterval > 0 ? liveEdgeInitialSearchPosition - searchInterval : liveEdgeInitialSearchPosition + Math.abs(searchInterval) + liveEdgeSearchStep, 
        void (searchTime < liveEdgeSearchRange.start && searchTime > liveEdgeSearchRange.end ? (console.log("I AM GIVING UP"), 
        callback(new MediaPlayer.rules.SwitchRequest(liveEdgeInitialSearchPosition, p))) : (req = this.adapter.getFragmentRequestForTime(finder.streamProcessor, trackInfo, searchTime), 
        findLiveEdge.call(this, searchTime, onSearchForFragmentSucceeded, onSearchForFragmentFailed, req))));
    }, onSearchForFragmentSucceeded = function(request, lastSearchTime) {
        var req, searchTime, startTime = request.startTime, self = this;
        if (!useBinarySearch) {
            if (!trackInfo.fragmentDuration) return console.log("I THINK IT IS AT (1) " + startTime), 
            void callback(new MediaPlayer.rules.SwitchRequest(startTime, p));
            if (useBinarySearch = !0, liveEdgeSearchRange.end = startTime + 2 * liveEdgeSearchStep, 
            lastSearchTime === liveEdgeInitialSearchPosition) return searchTime = lastSearchTime + fragmentDuration, 
            req = self.adapter.getFragmentRequestForTime(finder.streamProcessor, trackInfo, searchTime), 
            void findLiveEdge.call(self, searchTime, function() {
                binarySearch.call(self, !0, searchTime);
            }, function() {
                console.log("I THINK IT IS AT (2) " + searchTime), callback(new MediaPlayer.rules.SwitchRequest(searchTime, p));
            }, req);
        }
        binarySearch.call(this, !0, lastSearchTime);
    }, binarySearch = function(lastSearchSucceeded, lastSearchTime) {
        var isSearchCompleted, req, searchTime;
        lastSearchSucceeded ? liveEdgeSearchRange.start = lastSearchTime : liveEdgeSearchRange.end = lastSearchTime, 
        isSearchCompleted = Math.floor(liveEdgeSearchRange.end - liveEdgeSearchRange.start) <= fragmentDuration, 
        isSearchCompleted ? (console.log("DID THE LAST SEARCH SUCCEED? " + lastSearchSucceeded), 
        console.log("I THINK IT IS AT (3) " + (lastSearchSucceeded ? lastSearchTime : lastSearchTime - fragmentDuration)), 
        callback(new MediaPlayer.rules.SwitchRequest(lastSearchSucceeded ? lastSearchTime : lastSearchTime - fragmentDuration, p))) : (searchTime = (liveEdgeSearchRange.start + liveEdgeSearchRange.end) / 2, 
        req = this.adapter.getFragmentRequestForTime(finder.streamProcessor, trackInfo, searchTime), 
        findLiveEdge.call(this, searchTime, onSearchForFragmentSucceeded, onSearchForFragmentFailed, req));
    };
    return {
        metricsExt: void 0,
        adapter: void 0,
        setFinder: function(liveEdgeFinder) {
            finder = liveEdgeFinder;
        },
        execute: function(context, callbackFunc) {
            var request, DVRWindow, self = this;
            return callback = callbackFunc, trackInfo = finder.streamProcessor.getCurrentTrack(), 
            fragmentDuration = trackInfo.fragmentDuration, DVRWindow = trackInfo.DVRWindow, 
            liveEdgeInitialSearchPosition = Date.now() / 1e3, console.log("HELLO " + DVRWindow.end), 
            console.log("GOODBYE " + Date.now()), trackInfo.useCalculatedLiveEdgeTime ? void callback(new MediaPlayer.rules.SwitchRequest(liveEdgeInitialSearchPosition, p)) : (liveEdgeSearchRange = {
                start: Math.max(0, liveEdgeInitialSearchPosition - SEARCH_TIME_SPAN),
                end: liveEdgeInitialSearchPosition + SEARCH_TIME_SPAN
            }, liveEdgeSearchStep = Math.floor((DVRWindow.end - DVRWindow.start) / 2), liveEdgeSearchStep > liveEdgeSearchRange.end - liveEdgeSearchRange.start && (liveEdgeSearchStep = (liveEdgeSearchRange.end - liveEdgeSearchRange.start) / 10), 
            request = self.adapter.getFragmentRequestForTime(finder.streamProcessor, trackInfo, liveEdgeInitialSearchPosition), 
            void findLiveEdge.call(self, liveEdgeInitialSearchPosition, onSearchForFragmentSucceeded, onSearchForFragmentFailed, request));
        },
        reset: function() {
            liveEdgeInitialSearchPosition = 0/0, liveEdgeSearchRange = null, liveEdgeSearchStep = 0/0, 
            trackInfo = null, useBinarySearch = !1, fragmentDuration = 0/0, finder = null;
        }
    };
}, MediaPlayer.rules.LiveEdgeBBCSearchRule.prototype = {
    constructor: MediaPlayer.rules.LiveEdgeBBCSearchRule
}, MediaPlayer.rules.LiveEdgeBinarySearchRule = function() {
    "use strict";
    var finder, callback, SEARCH_TIME_SPAN = 43200, liveEdgeInitialSearchPosition = 0/0, liveEdgeSearchRange = null, liveEdgeSearchStep = 0/0, trackInfo = null, useBinarySearch = !1, fragmentDuration = 0/0, p = MediaPlayer.rules.SwitchRequest.prototype.DEFAULT, findLiveEdge = function(searchTime, onSuccess, onError, request) {
        var req, self = this;
        if (null === request) req = self.adapter.generateFragmentRequestForTime(finder.streamProcessor, trackInfo, searchTime), 
        findLiveEdge.call(self, searchTime, onSuccess, onError, req); else {
            var handler = function(e) {
                finder.fragmentLoader.unsubscribe(MediaPlayer.dependencies.FragmentLoader.eventList.ENAME_CHECK_FOR_EXISTENCE_COMPLETED, self, handler), 
                e.data.exists ? onSuccess.call(self, e.data.request, searchTime) : onError.call(self, e.data.request, searchTime);
            };
            finder.fragmentLoader.subscribe(MediaPlayer.dependencies.FragmentLoader.eventList.ENAME_CHECK_FOR_EXISTENCE_COMPLETED, self, handler), 
            finder.fragmentLoader.checkForExistence(request);
        }
    }, onSearchForFragmentFailed = function(request, lastSearchTime) {
        var searchTime, req, searchInterval;
        return useBinarySearch ? void binarySearch.call(this, !1, lastSearchTime) : (searchInterval = lastSearchTime - liveEdgeInitialSearchPosition, 
        searchTime = searchInterval > 0 ? liveEdgeInitialSearchPosition - searchInterval : liveEdgeInitialSearchPosition + Math.abs(searchInterval) + liveEdgeSearchStep, 
        void (searchTime < liveEdgeSearchRange.start && searchTime > liveEdgeSearchRange.end ? callback(new MediaPlayer.rules.SwitchRequest(null, p)) : (req = this.adapter.getFragmentRequestForTime(finder.streamProcessor, trackInfo, searchTime), 
        findLiveEdge.call(this, searchTime, onSearchForFragmentSucceeded, onSearchForFragmentFailed, req))));
    }, onSearchForFragmentSucceeded = function(request, lastSearchTime) {
        var req, searchTime, startTime = request.startTime, self = this;
        if (!useBinarySearch) {
            if (!trackInfo.fragmentDuration) return void callback(new MediaPlayer.rules.SwitchRequest(startTime, p));
            if (useBinarySearch = !0, liveEdgeSearchRange.end = startTime + 2 * liveEdgeSearchStep, 
            lastSearchTime === liveEdgeInitialSearchPosition) return searchTime = lastSearchTime + fragmentDuration, 
            req = self.adapter.getFragmentRequestForTime(finder.streamProcessor, trackInfo, searchTime), 
            void findLiveEdge.call(self, searchTime, function() {
                binarySearch.call(self, !0, searchTime);
            }, function() {
                callback(new MediaPlayer.rules.SwitchRequest(searchTime, p));
            }, req);
        }
        binarySearch.call(this, !0, lastSearchTime);
    }, binarySearch = function(lastSearchSucceeded, lastSearchTime) {
        var isSearchCompleted, req, searchTime;
        lastSearchSucceeded ? liveEdgeSearchRange.start = lastSearchTime : liveEdgeSearchRange.end = lastSearchTime, 
        isSearchCompleted = Math.floor(liveEdgeSearchRange.end - liveEdgeSearchRange.start) <= fragmentDuration, 
        isSearchCompleted ? callback(new MediaPlayer.rules.SwitchRequest(lastSearchSucceeded ? lastSearchTime : lastSearchTime - fragmentDuration, p)) : (searchTime = (liveEdgeSearchRange.start + liveEdgeSearchRange.end) / 2, 
        req = this.adapter.getFragmentRequestForTime(finder.streamProcessor, trackInfo, searchTime), 
        findLiveEdge.call(this, searchTime, onSearchForFragmentSucceeded, onSearchForFragmentFailed, req));
    };
    return {
        metricsExt: void 0,
        adapter: void 0,
        timelineConverter: void 0,
        setFinder: function(liveEdgeFinder) {
            finder = liveEdgeFinder;
        },
        execute: function(context, callbackFunc) {
            var request, DVRWindow, self = this;
            if (callback = callbackFunc, trackInfo = finder.streamProcessor.getCurrentTrack(), 
            fragmentDuration = trackInfo.fragmentDuration, DVRWindow = trackInfo.DVRWindow, 
            liveEdgeInitialSearchPosition = DVRWindow.end, trackInfo.useCalculatedLiveEdgeTime) {
                var actualLiveEdge = self.timelineConverter.getExpectedLiveEdge();
                return self.timelineConverter.setExpectedLiveEdge(liveEdgeInitialSearchPosition), 
                void callback(new MediaPlayer.rules.SwitchRequest(actualLiveEdge, p));
            }
            liveEdgeSearchRange = {
                start: Math.max(0, liveEdgeInitialSearchPosition - SEARCH_TIME_SPAN),
                end: liveEdgeInitialSearchPosition + SEARCH_TIME_SPAN
            }, liveEdgeSearchStep = Math.floor((DVRWindow.end - DVRWindow.start) / 2), request = self.adapter.getFragmentRequestForTime(finder.streamProcessor, trackInfo, liveEdgeInitialSearchPosition), 
            findLiveEdge.call(self, liveEdgeInitialSearchPosition, onSearchForFragmentSucceeded, onSearchForFragmentFailed, request);
        },
        reset: function() {
            liveEdgeInitialSearchPosition = 0/0, liveEdgeSearchRange = null, liveEdgeSearchStep = 0/0, 
            trackInfo = null, useBinarySearch = !1, fragmentDuration = 0/0, finder = null;
        }
    };
}, MediaPlayer.rules.LiveEdgeBinarySearchRule.prototype = {
    constructor: MediaPlayer.rules.LiveEdgeBinarySearchRule
}, MediaPlayer.rules.PendingRequestsRule = function() {
    "use strict";
    var LIMIT = 2, scheduleController = {};
    return {
        metricsExt: void 0,
        setScheduleController: function(scheduleControllerValue) {
            var streamId = scheduleControllerValue.streamProcessor.getStreamInfo().id;
            scheduleController[streamId] = scheduleController[streamId] || {}, scheduleController[streamId][scheduleControllerValue.streamProcessor.getType()] = scheduleControllerValue;
        },
        execute: function(context, callback) {
            var mediaType = context.getMediaInfo().type, streamId = context.getStreamInfo().id, current = context.getCurrentValue(), sc = scheduleController[streamId][mediaType], model = sc.getFragmentModel(), pendingRequests = model.getPendingRequests(), loadingRequests = model.getLoadingRequests(), rejectedRequests = model.getRejectedRequests(), rLn = rejectedRequests.length, ln = pendingRequests.length + loadingRequests.length, count = Math.max(current - ln, 0);
            return rLn > 0 ? void callback(new MediaPlayer.rules.SwitchRequest(rLn, MediaPlayer.rules.SwitchRequest.prototype.DEFAULT)) : ln > LIMIT ? void callback(new MediaPlayer.rules.SwitchRequest(0, MediaPlayer.rules.SwitchRequest.prototype.DEFAULT)) : 0 === current ? void callback(new MediaPlayer.rules.SwitchRequest(count, MediaPlayer.rules.SwitchRequest.prototype.NO_CHANGE)) : void callback(new MediaPlayer.rules.SwitchRequest(count, MediaPlayer.rules.SwitchRequest.prototype.DEFAULT));
        },
        reset: function() {
            scheduleController = {};
        }
    };
}, MediaPlayer.rules.PendingRequestsRule.prototype = {
    constructor: MediaPlayer.rules.PendingRequestsRule
}, MediaPlayer.rules.PlaybackTimeRule = function() {
    "use strict";
    var seekTarget = {}, scheduleController = {}, onPlaybackSeeking = function(e) {
        var streamId = e.sender.getStreamId(), time = e.data.seekTime;
        seekTarget[streamId] = seekTarget[streamId] || {}, seekTarget[streamId].audio = time, 
        seekTarget[streamId].video = time;
    };
    return {
        adapter: void 0,
        sourceBufferExt: void 0,
        setup: function() {
            this[MediaPlayer.dependencies.PlaybackController.eventList.ENAME_PLAYBACK_SEEKING] = onPlaybackSeeking;
        },
        setScheduleController: function(scheduleControllerValue) {
            var streamId = scheduleControllerValue.streamProcessor.getStreamInfo().id;
            scheduleController[streamId] = scheduleController[streamId] || {}, scheduleController[streamId][scheduleControllerValue.streamProcessor.getType()] = scheduleControllerValue;
        },
        execute: function(context, callback) {
            var range, time, request, mediaType = context.getMediaInfo().type, streamId = context.getStreamInfo().id, sc = scheduleController[streamId][mediaType], EPSILON = .1, streamProcessor = scheduleController[streamId][mediaType].streamProcessor, track = streamProcessor.getCurrentTrack(), st = seekTarget[streamId] ? seekTarget[streamId][mediaType] : null, hasSeekTarget = void 0 !== st && null !== st, p = hasSeekTarget ? MediaPlayer.rules.SwitchRequest.prototype.STRONG : MediaPlayer.rules.SwitchRequest.prototype.DEFAULT, rejected = sc.getFragmentModel().getRejectedRequests().shift(), keepIdx = !!rejected && !hasSeekTarget, currentTime = this.adapter.getIndexHandlerTime(streamProcessor), playbackTime = streamProcessor.playbackController.getTime(), rejectedEnd = rejected ? rejected.startTime + rejected.duration : null, useRejected = rejected && (rejectedEnd > playbackTime && rejected.startTime <= currentTime || isNaN(currentTime));
            if (time = hasSeekTarget ? st : useRejected ? rejected.startTime : currentTime, 
            isNaN(time)) return void callback(new MediaPlayer.rules.SwitchRequest(null, p));
            for (seekTarget[streamId] && (seekTarget[streamId][mediaType] = null), range = this.sourceBufferExt.getBufferRange(streamProcessor.bufferController.getBuffer(), time), 
            null !== range && (time = range.end), request = this.adapter.getFragmentRequestForTime(streamProcessor, track, time, keepIdx), 
            useRejected && request && request.index !== rejected.index && (request = this.adapter.getFragmentRequestForTime(streamProcessor, track, rejected.startTime + rejected.duration / 2 + EPSILON, keepIdx)); request && streamProcessor.fragmentController.isFragmentLoadedOrPending(sc, request); ) {
                if ("complete" === request.action) {
                    request = null, this.adapter.setIndexHandlerTime(streamProcessor, 0/0);
                    break;
                }
                request = this.adapter.getNextFragmentRequest(streamProcessor, track);
            }
            request && !useRejected && this.adapter.setIndexHandlerTime(streamProcessor, request.startTime + request.duration), 
            callback(new MediaPlayer.rules.SwitchRequest(request, p));
        },
        reset: function() {
            seekTarget = {}, scheduleController = {};
        }
    };
}, MediaPlayer.rules.PlaybackTimeRule.prototype = {
    constructor: MediaPlayer.rules.PlaybackTimeRule
}, MediaPlayer.rules.RulesController = function() {
    "use strict";
    var rules = {}, ruleMandatoryProperties = [ "execute" ], isRuleTypeSupported = function(ruleType) {
        return ruleType === this.SCHEDULING_RULE || ruleType === this.ABR_RULE;
    }, isRule = function(obj) {
        var ln = ruleMandatoryProperties.length, i = 0;
        for (i; ln > i; i += 1) if (!obj.hasOwnProperty(ruleMandatoryProperties[i])) return !1;
        return !0;
    }, getRulesContext = function(streamProcessor, currentValue) {
        return new MediaPlayer.rules.RulesContext(streamProcessor, currentValue);
    }, normalizeRule = function(rule) {
        var exec = rule.execute.bind(rule);
        return rule.execute = function(context, callback) {
            var normalizedCallback = function(result) {
                callback.call(rule, new MediaPlayer.rules.SwitchRequest(result.value, result.priority));
            };
            exec(context, normalizedCallback);
        }, "function" != typeof rule.reset && (rule.reset = function() {}), rule;
    }, updateRules = function(currentRulesCollection, newRulesCollection, override) {
        var rule, ruleSubType, subTypeRuleSet, ruleArr, ln, i;
        for (ruleSubType in newRulesCollection) if (ruleArr = newRulesCollection[ruleSubType], 
        ln = ruleArr.length) for (i = 0; ln > i; i += 1) rule = ruleArr[i], isRule.call(this, rule) && (rule = normalizeRule.call(this, rule), 
        subTypeRuleSet = currentRulesCollection.getRules(ruleSubType), override && (subTypeRuleSet.length = 0), 
        subTypeRuleSet.push(rule));
    };
    return {
        system: void 0,
        debug: void 0,
        SCHEDULING_RULE: 0,
        ABR_RULE: 1,
        initialize: function() {
            rules[this.ABR_RULE] = this.system.getObject("abrRulesCollection"), rules[this.SCHEDULING_RULE] = this.system.getObject("scheduleRulesCollection");
        },
        setRules: function(ruleType, rulesCollection) {
            isRuleTypeSupported.call(this, ruleType) && rulesCollection && updateRules.call(this, rules[ruleType], rulesCollection, !0);
        },
        addRules: function(ruleType, rulesCollection) {
            isRuleTypeSupported.call(this, ruleType) && rulesCollection && updateRules.call(this, rules[ruleType], rulesCollection, !1);
        },
        applyRules: function(rulesArr, streamProcessor, callback, current, overrideFunc) {
            var rule, i, rulesCount = rulesArr.length, ln = rulesCount, values = {}, rulesContext = getRulesContext.call(this, streamProcessor, current), callbackFunc = function(result) {
                var value, confidence;
                result.value !== MediaPlayer.rules.SwitchRequest.prototype.NO_CHANGE && (values[result.priority] = overrideFunc(values[result.priority], result.value)), 
                --rulesCount || (values[MediaPlayer.rules.SwitchRequest.prototype.WEAK] !== MediaPlayer.rules.SwitchRequest.prototype.NO_CHANGE && (confidence = MediaPlayer.rules.SwitchRequest.prototype.WEAK, 
                value = values[MediaPlayer.rules.SwitchRequest.prototype.WEAK]), values[MediaPlayer.rules.SwitchRequest.prototype.DEFAULT] !== MediaPlayer.rules.SwitchRequest.prototype.NO_CHANGE && (confidence = MediaPlayer.rules.SwitchRequest.prototype.DEFAULT, 
                value = values[MediaPlayer.rules.SwitchRequest.prototype.DEFAULT]), values[MediaPlayer.rules.SwitchRequest.prototype.STRONG] !== MediaPlayer.rules.SwitchRequest.prototype.NO_CHANGE && (confidence = MediaPlayer.rules.SwitchRequest.prototype.STRONG, 
                value = values[MediaPlayer.rules.SwitchRequest.prototype.STRONG]), confidence != MediaPlayer.rules.SwitchRequest.prototype.STRONG && confidence != MediaPlayer.rules.SwitchRequest.prototype.WEAK && (confidence = MediaPlayer.rules.SwitchRequest.prototype.DEFAULT), 
                callback({
                    value: void 0 !== value ? value : current,
                    confidence: confidence
                }));
            };
            for (values[MediaPlayer.rules.SwitchRequest.prototype.STRONG] = MediaPlayer.rules.SwitchRequest.prototype.NO_CHANGE, 
            values[MediaPlayer.rules.SwitchRequest.prototype.WEAK] = MediaPlayer.rules.SwitchRequest.prototype.NO_CHANGE, 
            values[MediaPlayer.rules.SwitchRequest.prototype.DEFAULT] = MediaPlayer.rules.SwitchRequest.prototype.NO_CHANGE, 
            i = 0; ln > i; i += 1) rule = rulesArr[i], isRule.call(this, rule) ? rule.execute(rulesContext, callbackFunc) : rulesCount--;
        },
        reset: function() {
            var rule, i, abrRules = rules[this.ABR_RULE], schedulingRules = rules[this.SCHEDULING_RULE], allRules = (abrRules.getRules(MediaPlayer.rules.ABRRulesCollection.prototype.QUALITY_SWITCH_RULES) || []).concat(schedulingRules.getRules(MediaPlayer.rules.ScheduleRulesCollection.prototype.NEXT_FRAGMENT_RULES) || []).concat(schedulingRules.getRules(MediaPlayer.rules.ScheduleRulesCollection.prototype.FRAGMENTS_TO_SCHEDULE_RULES) || []).concat(schedulingRules.getRules(MediaPlayer.rules.ScheduleRulesCollection.prototype.FRAGMENTS_TO_EXECUTE_RULES) || []).concat(schedulingRules.getRules(MediaPlayer.rules.ScheduleRulesCollection.prototype.LIVE_EDGE_RULES) || []), ln = allRules.length;
            for (i = 0; ln > i; i += 1) rule = allRules[i], "function" == typeof rule.reset && rule.reset();
            rules = {};
        }
    };
}, MediaPlayer.rules.RulesController.prototype = {
    constructor: MediaPlayer.rules.RulesController
}, MediaPlayer.rules.SameTimeRequestRule = function() {
    "use strict";
    var LOADING_REQUEST_THRESHOLD = 4, findClosestToTime = function(fragmentModels, time) {
        var req, r, pendingReqs, j, pln, i = 0, ln = fragmentModels.length;
        for (i; ln > i; i += 1) for (pendingReqs = fragmentModels[i].getPendingRequests(), 
        sortRequestsByProperty.call(this, pendingReqs, "index"), j = 0, pln = pendingReqs.length; pln > j; j++) {
            if (req = pendingReqs[j], isNaN(req.startTime) && "complete" !== req.action) {
                r = req;
                break;
            }
            req.startTime > time && (!r || req.startTime < r.startTime) && (r = req);
        }
        return r || req;
    }, getForTime = function(fragmentModels, currentTime) {
        var req, i, ln = fragmentModels.length, r = null;
        for (i = 0; ln > i; i += 1) req = fragmentModels[i].getPendingRequestForTime(currentTime), 
        req && (!r || req.startTime > r.startTime) && (r = req);
        return r;
    }, sortRequestsByProperty = function(requestsArray, sortProp) {
        var compare = function(req1, req2) {
            return req1[sortProp] < req2[sortProp] || isNaN(req1[sortProp]) && "complete" !== req1.action ? -1 : req1[sortProp] > req2[sortProp] ? 1 : 0;
        };
        requestsArray.sort(compare);
    };
    return {
        setFragmentModels: function(fragmentModels, streamid) {
            this.fragmentModels = this.fragmentModels || {}, this.fragmentModels[streamid] = fragmentModels;
        },
        execute: function(context, callback) {
            var type, model, sameTimeReq, mIdx, req, currentTime, reqForCurrentTime, pendingReqs, loadingLength, streamId = context.getStreamInfo().id, current = context.getCurrentValue(), p = MediaPlayer.rules.SwitchRequest.prototype.DEFAULT, fragmentModels = this.fragmentModels[streamId], wallclockTime = new Date(), time = null, mLength = fragmentModels ? fragmentModels.length : null, shouldWait = !1, reqsToExecute = [];
            if (!fragmentModels || !mLength) return void callback(new MediaPlayer.rules.SwitchRequest([], p));
            if (currentTime = fragmentModels[0].getContext().playbackController.getTime(), reqForCurrentTime = getForTime(fragmentModels, currentTime), 
            req = reqForCurrentTime || findClosestToTime(fragmentModels, currentTime) || current, 
            !req) return void callback(new MediaPlayer.rules.SwitchRequest([], p));
            for (mIdx = 0; mLength > mIdx; mIdx += 1) if (model = fragmentModels[mIdx], type = model.getContext().streamProcessor.getType(), 
            ("video" === type || "audio" === type) && (pendingReqs = model.getPendingRequests(), 
            loadingLength = model.getLoadingRequests().length, !model.getIsPostponed() || isNaN(req.startTime))) {
                if (loadingLength > LOADING_REQUEST_THRESHOLD) return void callback(new MediaPlayer.rules.SwitchRequest([], p));
                if (time = time || (req === reqForCurrentTime ? currentTime : req.startTime), -1 === pendingReqs.indexOf(req)) {
                    if (sameTimeReq = model.getPendingRequestForTime(time), sameTimeReq || 0 !== req.index || (sameTimeReq = pendingReqs.filter(function(r) {
                        return r.index === req.index;
                    })[0]), sameTimeReq) reqsToExecute.push(sameTimeReq); else if (sameTimeReq = model.getLoadingRequestForTime(time) || model.getExecutedRequestForTime(time), 
                    !sameTimeReq) {
                        shouldWait = !0;
                        break;
                    }
                } else reqsToExecute.push(req);
            }
            return reqsToExecute = reqsToExecute.filter(function(req) {
                return "complete" === req.action || wallclockTime.getTime() >= req.availabilityStartTime.getTime();
            }), shouldWait ? void callback(new MediaPlayer.rules.SwitchRequest([], p)) : void callback(new MediaPlayer.rules.SwitchRequest(reqsToExecute, p));
        }
    };
}, MediaPlayer.rules.SameTimeRequestRule.prototype = {
    constructor: MediaPlayer.rules.SameTimeRequestRule
}, MediaPlayer.rules.ScheduleRulesCollection = function() {
    "use strict";
    var fragmentsToScheduleRules = [], fragmentsToExecuteRules = [], liveEdgeRules = [], nextFragmentRules = [];
    return {
        bufferLevelRule: void 0,
        pendingRequestsRule: void 0,
        playbackTimeRule: void 0,
        sameTimeRequestRule: void 0,
        liveEdgeBinarySearchRule: void 0,
        liveEdgeBBCSearchRule: void 0,
        getRules: function(type) {
            switch (type) {
              case MediaPlayer.rules.ScheduleRulesCollection.prototype.FRAGMENTS_TO_SCHEDULE_RULES:
                return fragmentsToScheduleRules;

              case MediaPlayer.rules.ScheduleRulesCollection.prototype.NEXT_FRAGMENT_RULES:
                return nextFragmentRules;

              case MediaPlayer.rules.ScheduleRulesCollection.prototype.FRAGMENTS_TO_EXECUTE_RULES:
                return fragmentsToExecuteRules;

              case MediaPlayer.rules.ScheduleRulesCollection.prototype.LIVE_EDGE_RULES:
                return liveEdgeRules;

              default:
                return null;
            }
        },
        setup: function() {
            fragmentsToScheduleRules.push(this.bufferLevelRule), fragmentsToScheduleRules.push(this.pendingRequestsRule), 
            nextFragmentRules.push(this.playbackTimeRule), fragmentsToExecuteRules.push(this.sameTimeRequestRule), 
            liveEdgeRules.push(this.liveEdgeBBCSearchRule);
        }
    };
}, MediaPlayer.rules.ScheduleRulesCollection.prototype = {
    constructor: MediaPlayer.rules.ScheduleRulesCollection,
    FRAGMENTS_TO_SCHEDULE_RULES: "fragmentsToScheduleRules",
    NEXT_FRAGMENT_RULES: "nextFragmentRules",
    FRAGMENTS_TO_EXECUTE_RULES: "fragmentsToExecuteRules",
    LIVE_EDGE_RULES: "liveEdgeRules"
}, MediaPlayer.rules.SwitchRequest = function(v, p) {
    "use strict";
    this.value = v, this.priority = p, void 0 === this.value && (this.value = 999), 
    void 0 === this.priority && (this.priority = .5);
}, MediaPlayer.rules.SwitchRequest.prototype = {
    constructor: MediaPlayer.rules.SwitchRequest,
    NO_CHANGE: 999,
    DEFAULT: .5,
    STRONG: 1,
    WEAK: 0
}, MediaPlayer.vo.Error = function(code, message, data) {
    "use strict";
    this.code = code || null, this.message = message || null, this.data = data || null;
}, MediaPlayer.vo.Error.prototype = {
    constructor: MediaPlayer.vo.Error
}, MediaPlayer.vo.Event = function() {
    "use strict";
    this.type = null, this.sender = null, this.data = null, this.error = null, this.timestamp = 0/0;
}, MediaPlayer.vo.Event.prototype = {
    constructor: MediaPlayer.vo.Event
}, MediaPlayer.vo.FragmentRequest = function() {
    "use strict";
    this.action = "download", this.startTime = 0/0, this.mediaType = null, this.type = null, 
    this.duration = 0/0, this.timescale = 0/0, this.range = null, this.url = null, this.requestStartDate = null, 
    this.firstByteDate = null, this.requestEndDate = null, this.quality = 0/0, this.index = 0/0, 
    this.availabilityStartTime = null, this.availabilityEndTime = null, this.wallStartTime = null;
}, MediaPlayer.vo.FragmentRequest.prototype = {
    constructor: MediaPlayer.vo.FragmentRequest,
    ACTION_DOWNLOAD: "download",
    ACTION_COMPLETE: "complete"
}, MediaPlayer.vo.ManifestInfo = function() {
    "use strict";
    this.DVRWindowSize = 0/0, this.loadedTime = null, this.availableFrom = null, this.minBufferTime = 0/0, 
    this.duration = 0/0, this.isDynamic = !1, this.maxFragmentDuration = null;
}, MediaPlayer.vo.ManifestInfo.prototype = {
    constructor: MediaPlayer.vo.ManifestInfo
}, MediaPlayer.vo.MediaInfo = function() {
    "use strict";
    this.id = null, this.index = null, this.type = null, this.streamInfo = null, this.trackCount = 0, 
    this.lang = null, this.codec = null, this.mimeType = null, this.contentProtection = null, 
    this.isText = !1, this.KID = null;
}, MediaPlayer.vo.MediaInfo.prototype = {
    constructor: MediaPlayer.vo.MediaInfo
}, MediaPlayer.models.MetricsList = function() {
    "use strict";
    return {
        TcpList: [],
        HttpList: [],
        RepSwitchList: [],
        BufferLevel: [],
        PlayList: [],
        DroppedFrames: [],
        SchedulingInfo: [],
        DVRInfo: [],
        ManifestUpdate: []
    };
}, MediaPlayer.models.MetricsList.prototype = {
    constructor: MediaPlayer.models.MetricsList
}, MediaPlayer.vo.StreamInfo = function() {
    "use strict";
    this.id = null, this.index = null, this.start = 0/0, this.duration = 0/0, this.manifestInfo = null, 
    this.isLast = !0;
}, MediaPlayer.vo.StreamInfo.prototype = {
    constructor: MediaPlayer.vo.StreamInfo
}, MediaPlayer.vo.TrackInfo = function() {
    "use strict";
    this.id = null, this.quality = null, this.DVRWindow = null, this.fragmentDuration = null, 
    this.mediaInfo = null, this.MSETimeOffset = null;
}, MediaPlayer.vo.TrackInfo.prototype = {
    constructor: MediaPlayer.vo.TrackInfo
}, MediaPlayer.vo.URIFragmentData = function() {
    "use strict";
    this.t = null, this.xywh = null, this.track = null, this.id = null, this.s = null;
}, MediaPlayer.vo.URIFragmentData.prototype = {
    constructor: MediaPlayer.vo.URIFragmentData
}, MediaPlayer.vo.metrics.BufferLevel = function() {
    "use strict";
    this.t = null, this.level = null;
}, MediaPlayer.vo.metrics.BufferLevel.prototype = {
    constructor: MediaPlayer.vo.metrics.BufferLevel
}, MediaPlayer.vo.metrics.DVRInfo = function() {
    "use strict";
    this.time = null, this.range = null, this.manifestInfo = null;
}, MediaPlayer.vo.metrics.DVRInfo.prototype = {
    constructor: MediaPlayer.vo.metrics.DVRInfo
}, MediaPlayer.vo.metrics.DroppedFrames = function() {
    "use strict";
    this.time = null, this.droppedFrames = null;
}, MediaPlayer.vo.metrics.DroppedFrames.prototype = {
    constructor: MediaPlayer.vo.metrics.DroppedFrames
}, MediaPlayer.vo.metrics.HTTPRequest = function() {
    "use strict";
    this.stream = null, this.tcpid = null, this.type = null, this.url = null, this.actualurl = null, 
    this.range = null, this.trequest = null, this.tresponse = null, this.tfinish = null, 
    this.responsecode = null, this.interval = null, this.mediaduration = null, this.responseHeaders = null, 
    this.trace = [];
}, MediaPlayer.vo.metrics.HTTPRequest.prototype = {
    constructor: MediaPlayer.vo.metrics.HTTPRequest
}, MediaPlayer.vo.metrics.HTTPRequest.Trace = function() {
    "use strict";
    this.s = null, this.d = null, this.b = [];
}, MediaPlayer.vo.metrics.HTTPRequest.Trace.prototype = {
    constructor: MediaPlayer.vo.metrics.HTTPRequest.Trace
}, MediaPlayer.vo.metrics.ManifestUpdate = function() {
    "use strict";
    this.mediaType = null, this.type = null, this.requestTime = null, this.fetchTime = null, 
    this.availabilityStartTime = null, this.presentationStartTime = 0, this.clientTimeOffset = 0, 
    this.currentTime = null, this.buffered = null, this.latency = 0, this.streamInfo = [], 
    this.trackInfo = [];
}, MediaPlayer.vo.metrics.ManifestUpdate.StreamInfo = function() {
    "use strict";
    this.id = null, this.index = null, this.start = null, this.duration = null;
}, MediaPlayer.vo.metrics.ManifestUpdate.TrackInfo = function() {
    "use strict";
    this.id = null, this.index = null, this.mediaType = null, this.streamIndex = null, 
    this.presentationTimeOffset = null, this.startNumber = null, this.fragmentInfoType = null;
}, MediaPlayer.vo.metrics.ManifestUpdate.prototype = {
    constructor: MediaPlayer.vo.metrics.ManifestUpdate
}, MediaPlayer.vo.metrics.ManifestUpdate.StreamInfo.prototype = {
    constructor: MediaPlayer.vo.metrics.ManifestUpdate.StreamInfo
}, MediaPlayer.vo.metrics.ManifestUpdate.TrackInfo.prototype = {
    constructor: MediaPlayer.vo.metrics.ManifestUpdate.TrackInfo
}, MediaPlayer.vo.metrics.PlayList = function() {
    "use strict";
    this.stream = null, this.start = null, this.mstart = null, this.starttype = null, 
    this.trace = [];
}, MediaPlayer.vo.metrics.PlayList.Trace = function() {
    "use strict";
    this.representationid = null, this.subreplevel = null, this.start = null, this.mstart = null, 
    this.duration = null, this.playbackspeed = null, this.stopreason = null;
}, MediaPlayer.vo.metrics.PlayList.prototype = {
    constructor: MediaPlayer.vo.metrics.PlayList
}, MediaPlayer.vo.metrics.PlayList.INITIAL_PLAY_START_REASON = "initial_start", 
MediaPlayer.vo.metrics.PlayList.SEEK_START_REASON = "seek", MediaPlayer.vo.metrics.PlayList.Trace.prototype = {
    constructor: MediaPlayer.vo.metrics.PlayList.Trace()
}, MediaPlayer.vo.metrics.PlayList.Trace.USER_REQUEST_STOP_REASON = "user_request", 
MediaPlayer.vo.metrics.PlayList.Trace.REPRESENTATION_SWITCH_STOP_REASON = "representation_switch", 
MediaPlayer.vo.metrics.PlayList.Trace.END_OF_CONTENT_STOP_REASON = "end_of_content", 
MediaPlayer.vo.metrics.PlayList.Trace.REBUFFERING_REASON = "rebuffering", MediaPlayer.vo.metrics.TrackSwitch = function() {
    "use strict";
    this.t = null, this.mt = null, this.to = null, this.lto = null;
}, MediaPlayer.vo.metrics.TrackSwitch.prototype = {
    constructor: MediaPlayer.vo.metrics.TrackSwitch
}, MediaPlayer.vo.metrics.SchedulingInfo = function() {
    "use strict";
    this.mediaType = null, this.t = null, this.type = null, this.startTime = null, this.availabilityStartTime = null, 
    this.duration = null, this.quality = null, this.range = null, this.state = null;
}, MediaPlayer.vo.metrics.SchedulingInfo.prototype = {
    constructor: MediaPlayer.vo.metrics.SchedulingInfo
}, MediaPlayer.vo.metrics.SchedulingInfo.PENDING_STATE = "pending", MediaPlayer.vo.metrics.SchedulingInfo.LOADING_STATE = "loading", 
MediaPlayer.vo.metrics.SchedulingInfo.EXECUTED_STATE = "executed", MediaPlayer.vo.metrics.SchedulingInfo.REJECTED_STATE = "rejected", 
MediaPlayer.vo.metrics.SchedulingInfo.CANCELED_STATE = "canceled", MediaPlayer.vo.metrics.SchedulingInfo.FAILED_STATE = "failed", 
MediaPlayer.vo.metrics.TCPConnection = function() {
    "use strict";
    this.tcpid = null, this.dest = null, this.topen = null, this.tclose = null, this.tconnect = null;
}, MediaPlayer.vo.metrics.TCPConnection.prototype = {
    constructor: MediaPlayer.vo.metrics.TCPConnection
};
//# sourceMappingURL=dash.all.js.map