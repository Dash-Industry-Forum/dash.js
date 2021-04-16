/**
* The MIT License (MIT)
*
* Copyright (c) 2015 Tobias Nickel
*
* Permission is hereby granted, free of charge, to any person obtaining a copy
* of this software and associated documentation files (the "Software"), to deal
* in the Software without restriction, including without limitation the rights
* to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
* copies of the Software, and to permit persons to whom the Software is
* furnished to do so, subject to the following conditions:
*
* The above copyright notice and this permission notice shall be included in all
* copies or substantial portions of the Software.
*
* THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
* IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
* FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
* AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
* LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
* OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
* SOFTWARE.

/**
 * @author: Tobias Nickel
 * @created: 06.04.2015
 * I needed a small xmlparser chat can be used in a worker.
 */

/**
 * @typedef tNode
 * @property {string} tagName
 * @property {object} attributes
 * @property {tNode|string|number[]} children
 **/

/**
 * parseXML / html into a DOM Object. with no validation and some failur tolerance
 * @param {string} S your XML to parse
 * @param options {object} all other options:
 * searchId {string} the id of a single element, that should be returned. using this will increase the speed rapidly
 * filter {function} filter method, as you know it from Array.filter. but is goes throw the DOM.

 * @return {tNode[]}
 */
function tXml(S, options, attrMatchers, arrayChildNames) {
    "use strict";
    options = options || {};
    attrMatchers = attrMatchers || [];
    arrayChildNames = arrayChildNames || [];

    var pos = options.pos || 0;

    var openBracket = "<";
    var openBracketCC = "<".charCodeAt(0);
    var closeBracket = ">";
    var closeBracketCC = ">".charCodeAt(0);
    var minus = "-";
    var minusCC = "-".charCodeAt(0);
    var slash = "/";
    var slashCC = "/".charCodeAt(0);
    var exclamation = '!';
    var exclamationCC = '!'.charCodeAt(0);
    var singleQuote = "'";
    var singleQuoteCC = "'".charCodeAt(0);
    var doubleQuote = '"';
    var doubleQuoteCC = '"'.charCodeAt(0);
    var openCornerBracket = '[';
    var openCornerBracketCC = '['.charCodeAt(0);
    var closeCornerBracket = ']';
    var closeCornerBracketCC = ']'.charCodeAt(0);


    /**
     * parsing a list of entries
     */
    function parseChildren(parent) {
        var children = [];
        while (S[pos]) {
            if (S.charCodeAt(pos) == openBracketCC) {
                if (S.charCodeAt(pos + 1) === slashCC) {
                    pos = S.indexOf(closeBracket, pos);
                    if (pos + 1) pos += 1
                    return children;
                } else if (S.charCodeAt(pos + 1) === exclamationCC) {
                    if (S.charCodeAt(pos + 2) == minusCC) {
                        //comment support
                        while (pos !== -1 && !(S.charCodeAt(pos) === closeBracketCC && S.charCodeAt(pos - 1) == minusCC && S.charCodeAt(pos - 2) == minusCC && pos != -1)) {
                            pos = S.indexOf(closeBracket, pos + 1);
                        }
                        if (pos === -1) {
                            pos = S.length
                        }
                    }else if(
                        S.charCodeAt(pos + 2) === openCornerBracketCC
                        && S.charCodeAt(pos + 8) === openCornerBracketCC
                        && S.substr(pos+3, 5).toLowerCase() === 'cdata'
                    ){
                        // cdata
                        var cdataEndIndex = S.indexOf(']]>',pos)
                        if (cdataEndIndex==-1) {
                            children.push(S.substr(pos+8));
                            pos=S.length;
                        } else {
                            children.push(S.substring(pos+9, cdataEndIndex));
                            pos = cdataEndIndex + 3;
                        }
                        continue
                    } else {
                        // doctypesupport
                        pos += 2;
                        while (S.charCodeAt(pos) !== closeBracketCC && S[pos]) {
                            pos++;
                        }
                    }
                    pos++;
                    continue;
                }
                // if parent is provided then add children as object(s)
                var child = parseNode();
                if (parent) {
                    let tagName = child.tagName;
                    delete child.tagName;
                    if (arrayChildNames.indexOf(tagName) !== -1) {
                        if (!parent[tagName]) {
                            parent[tagName] = [];
                        }
                        parent[tagName].push(child);
                    } else {
                        parent[tagName] = child;
                    }
                }
                children.push(child);
            } else {
                var text = parseText()
                if (text.trim().length > 0)
                    if (parent) parent.__text = text;
                    else children.push(text);
                pos++;
            }
        }
        return children;
    }

    function processAttr(tagName, attrName, value) {

        // Specific use case for SegmentTimeline <S> tag
        if (tagName === 'S') {
            return parseInt(value);
        }

        let attrValue = value;
        attrMatchers.forEach(matcher => {
            if (matcher.test(tagName, attrName, value)) {
                attrValue = matcher.converter(value);
            }
        });
        return attrValue;
    }

    /**
     *    returns the text outside of texts until the first '<'
     */
    function parseText() {
        var start = pos;
        pos = S.indexOf(openBracket, pos) - 1;
        if (pos === -2)
            pos = S.length;
        return S.slice(start, pos + 1);
    }
    /**
     *    returns text until the first nonAlphebetic letter
     */
    var nameSpacer = '\r\n\t>/= ';

    function parseName() {
        var start = pos;
        while (nameSpacer.indexOf(S[pos]) === -1 && S[pos]) {
            pos++;
        }
        return S.slice(start, pos);
    }
    /**
     *    is parsing a node, including tagName, Attributes and its children,
     * to parse children it uses the parseChildren again, that makes the parsing recursive
     */

    function parseNode() {
        pos++;
        let node = {
            tagName: parseName()
        };

        // parsing attributes
        while (S.charCodeAt(pos) !== closeBracketCC && S[pos]) {
            var c = S.charCodeAt(pos);
            if ((c > 64 && c < 91) || (c > 96 && c < 123)) {
                //if('abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'.indexOf(S[pos])!==-1 ){
                var name = parseName();
                // search beginning of the string
                var code = S.charCodeAt(pos);
                while (code && code !== singleQuoteCC && code !== doubleQuoteCC && !((code > 64 && code < 91) || (code > 96 && code < 123)) && code !== closeBracketCC) {
                    pos++;
                    code = S.charCodeAt(pos);
                }
                if (code === singleQuoteCC || code === doubleQuoteCC) {
                    var value = parseString();
                    if (pos === -1) {
                        return node;
                    }
                } else {
                    value = null;
                    pos--;
                }
                value = processAttr(node.tagName, name, value);
                node[name] = value;
            }
            pos++;
        }
        // optional parsing of children
        if (S.charCodeAt(pos - 1) !== slashCC) {
            pos++;
            parseChildren(node);
        } else {
            pos++;
        }
        return node;
    }

    /**
     *    is parsing a string, that starts with a char and with the same usually  ' or "
     */

    function parseString() {
        var startChar = S[pos];
        var startpos = pos+1;
        pos = S.indexOf(startChar, startpos)
        return S.slice(startpos, pos);
    }

    /**
     *
     */
    function findElements() {
        var r = new RegExp('\\s' + options.attrName + '\\s*=[\'"]' + options.attrValue + '[\'"]').exec(S)
        if (r) {
            return r.index;
        } else {
            return -1;
        }
    }

    var out = null;
    if (options.attrValue !== undefined) {
        options.attrName = options.attrName || 'id';
        var out = [];

        while ((pos = findElements()) !== -1) {
            pos = S.lastIndexOf('<', pos);
            if (pos !== -1) {
                out.push(parseNode());
            }
            S = S.substr(pos);
            pos = 0;
        }
    } else if (options.parseNode) {
        out = parseNode()
    } else {
        out = parseChildren();
    }

    if (options.setPos) {
        out.pos = pos;
    }

    return out;
}


if ('object' === typeof module) {
    module.exports = tXml;
    tXml.xml = tXml;
}

