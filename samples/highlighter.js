var head = document.head || document.getElementsByTagName('head')[0];
var codeOutput = document.getElementById('code-output');
var style = document.createElement('link');
style.setAttribute('rel', 'stylesheet');
style.setAttribute('href', '//cdnjs.cloudflare.com/ajax/libs/highlight.js/9.12.0/styles/tomorrow.min.css');
var script = document.createElement('script');
script.setAttribute('src', '//cdnjs.cloudflare.com/ajax/libs/highlight.js/9.12.0/highlight.min.js');

head.append(style);
head.append(script);

codeOutput.innerHTML += '<div style="margin-top: 30px; display: block; width: 100%;"><p style=" font-weight: bold; font-size: 1.1em">Source code<button id="clipboard-copy" style="float: right; margin: 10px 10px 0 0">Copy to clipboard</button></p><pre style="border: solid 1px #ddd"><code class="html javascript" id="code"></code></pre></div>';

/**
 * This helper functions checks how many whitespaces preceed the last tag, which should have 0
 * @param html
 */
function calculateStartingWhitespacesCount(html) {
    var lines = html.split(/\r?\n/);
    var lastLine = lines[lines.length - 1];
    return lastLine.search(/\S|$/);
}

function waitForElement() {
    if (typeof hljs !== 'undefined'){
        hljs.initHighlighting();
    }
    else {
        setTimeout(waitForElement, 100);
    }
}

function copyToClipboard() {
    var copyText = document.getElementById('code');

    if (document.selection) {
        var range = document.body.createTextRange();
        range.moveToElementText(document.getElementById('code'));
        range.select().createTextRange();
        document.execCommand("copy");

    } else if (window.getSelection) {
        var range = document.createRange();
        range.selectNode(document.getElementById('code'));
        window.getSelection().addRange(range);
        document.execCommand("copy");
    }
    if (window.getSelection) {
        window.getSelection().removeAllRanges();
    } else if (document.selection) {
        document.selection.empty();
    }

    document.getElementById('clipboard-copy').innerText = 'Copied!';
    setTimeout(function() {
        document.getElementById('clipboard-copy').innerText = 'Copy to clipboard';
    }, 2000);
}

var codeElements = document.getElementsByClassName('code');
for (var i = 0; i < codeElements.length; i++) {
    var tag = codeElements[i].cloneNode(true);
    var classes = tag.className.replace('code', '');
    if (classes === '') {
        tag.removeAttribute('class');
    } else {
        tag.className = classes;
    }

    // fix indentation
    var startingWhitespaces = calculateStartingWhitespacesCount(tag.outerHTML);
    var regex = new RegExp('^ {' + startingWhitespaces + '}', 'mg');
    document.getElementById('code').innerText += tag.outerHTML.replace(regex, '') + '\n';
}

document.getElementById('clipboard-copy').addEventListener('click', copyToClipboard);

waitForElement();


