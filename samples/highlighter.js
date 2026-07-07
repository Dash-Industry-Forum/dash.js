/**
 * highlighter.js - Source Code Display for dash.js Samples
 *
 * Extracts elements marked with class="code" from the current page,
 * renders them as syntax-highlighted source code, and provides a
 * copy-to-clipboard button.
 *
 * This script is loaded by sample-template.js or directly by sample pages.
 * It expects:
 *   - Elements with class="code" in the DOM
 *   - A #code-output container (created by sample-template.js or the page)
 *   - highlight.min.js loaded from lib/highlight/
 */
(function () {
    'use strict';

    var codeOutput = document.getElementById('code-output');
    if (!codeOutput) return;

    // Determine the base path to lib/ relative to this script
    var scripts = document.getElementsByTagName('script');
    var basePath = '';
    for (var i = 0; i < scripts.length; i++) {
        var src = scripts[i].getAttribute('src') || '';
        if (src.indexOf('highlighter.js') !== -1) {
            basePath = src.replace('highlighter.js', '');
            break;
        }
    }

    // Build the code output UI (collapsed by default via <details>).
    // Pages can opt in to an expanded section via data-code-expanded on #code-output.
    var section = document.createElement('details');
    section.className = 'sample-code-section';
    if (codeOutput.hasAttribute('data-code-expanded')) {
        section.setAttribute('open', '');
    }
    section.innerHTML =
        '<summary class="sample-code-header">' +
        '  <span class="sample-code-title"><i class="bi bi-chevron-right sample-code-chevron"></i> <span class="sample-code-title-text">Source Code</span></span>' +
        '  <button class="sample-code-copy-btn" id="clipboard-copy">' +
        '    <i class="bi bi-clipboard"></i> <span>Copy</span>' +
        '  </button>' +
        '</summary>' +
        '<div class="sample-code-body">' +
        '  <pre><code class="html javascript" id="code"></code></pre>' +
        '</div>';
    codeOutput.appendChild(section);

    // Extract code from elements with class="code"
    var codeElements = document.getElementsByClassName('code');
    var codeEl = document.getElementById('code');
    var extractedCode = '';

    for (var j = 0; j < codeElements.length; j++) {
        var el = codeElements[j];
        // Skip elements that are part of the code output itself
        if (section.contains(el)) continue;

        var tag = el.cloneNode(true);
        var classes = tag.className.replace(/\bcode\b/g, '').trim();
        if (classes === '') {
            tag.removeAttribute('class');
        } else {
            tag.className = classes;
        }

        // Fix indentation: calculate leading whitespace of the last line
        var html = tag.outerHTML;
        var lines = html.split(/\r?\n/);
        var lastLine = lines[lines.length - 1];
        var startingWhitespaces = lastLine.search(/\S|$/);
        if (startingWhitespaces > 0) {
            var regex = new RegExp('^ {' + startingWhitespaces + '}', 'mg');
            html = html.replace(regex, '');
        }

        extractedCode += html + '\n';
    }

    codeEl.textContent = extractedCode;

    // Copy to clipboard
    var copyBtn = document.getElementById('clipboard-copy');
    if (copyBtn) {
        copyBtn.addEventListener('click', function (event) {
            // Prevent the click from toggling the surrounding <details> element.
            event.preventDefault();
            event.stopPropagation();
            var text = codeEl.textContent;

            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(text).then(function () {
                    showCopied();
                }).catch(function () {
                    fallbackCopy(text);
                });
            } else {
                fallbackCopy(text);
            }
        });
    }

    function fallbackCopy(text) {
        var textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        try {
            document.execCommand('copy');
            showCopied();
        } catch (e) {
            // silently fail
        }
        document.body.removeChild(textarea);
    }

    function showCopied() {
        var span = copyBtn.querySelector('span');
        var icon = copyBtn.querySelector('i');
        if (span) span.textContent = 'Copied!';
        if (icon) {
            icon.className = 'bi bi-check2';
        }
        copyBtn.classList.add('copied');
        setTimeout(function () {
            if (span) span.textContent = 'Copy';
            if (icon) icon.className = 'bi bi-clipboard';
            copyBtn.classList.remove('copied');
        }, 2000);
    }

    // Load highlight.js and apply syntax highlighting
    var hlScript = document.createElement('script');
    hlScript.src = basePath + 'lib/highlight/highlight.min.js';
    hlScript.onload = function () {
        if (typeof hljs !== 'undefined') {
            hljs.highlightElement(codeEl);
        }
    };
    document.head.appendChild(hlScript);
})();
