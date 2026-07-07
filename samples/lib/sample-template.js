/**
 * sample-template.js - Shared page generator for dash.js samples
 *
 * Generates the common page shell (header, description, video wrapper,
 * code output, footer) so individual samples only provide their unique content.
 *
 * Usage:
 *   import { initSamplePage } from '../lib/sample-template.js';
 *
 *   initSamplePage({
 *       title: 'My Sample',
 *       description: 'What this sample demonstrates...',
 *       category: 'Getting Started',
 *       onInit: (videoElement) => { ... }
 *   });
 */

/**
 * Resolve a relative path from the current HTML page to the samples/lib/ directory.
 * Works by counting how deep the sample is relative to samples/.
 */
function resolveLibPath() {
    var scripts = document.getElementsByTagName('script');
    for (var i = 0; i < scripts.length; i++) {
        var src = scripts[i].getAttribute('src') || '';
        if (src.indexOf('sample-template.js') !== -1) {
            return src.replace('sample-template.js', '');
        }
    }
    // Fallback: assume one level deep (e.g., samples/getting-started/foo.html)
    return '../lib/';
}

var libPath = resolveLibPath();

/**
 * Apply the saved theme from localStorage or default to 'light'.
 */
function applyTheme() {
    var saved = null;
    try {
        saved = localStorage.getItem('rp-theme');
    } catch (e) {
        // localStorage may be unavailable
    }
    var theme = (saved === 'dark') ? 'dark' : 'light';
    document.documentElement.setAttribute('data-bs-theme', theme);
    return theme;
}

/**
 * Create an HTML element with attributes and optional children.
 */
function el(tag, attrs) {
    var element = document.createElement(tag);
    if (attrs) {
        for (var key in attrs) {
            if (!attrs.hasOwnProperty(key)) continue;
            if (key === 'className') {
                element.className = attrs[key];
            } else if (key === 'textContent') {
                element.textContent = attrs[key];
            } else if (key === 'innerHTML') {
                element.innerHTML = attrs[key];
            } else {
                element.setAttribute(key, attrs[key]);
            }
        }
    }
    // Append remaining arguments as children
    for (var i = 2; i < arguments.length; i++) {
        var child = arguments[i];
        if (typeof child === 'string') {
            element.appendChild(document.createTextNode(child));
        } else if (child) {
            element.appendChild(child);
        }
    }
    return element;
}

/**
 * Build the header bar.
 */
function buildHeader(opts) {
    var header = el('div', { className: 'sample-header' });

    // Left side: logo (links back to the samples overview) + title
    var left = el('div', { className: 'sample-header-left' });
    var logoLink = el('a', {
        href: libPath + '../index.html',
        className: 'sample-header-logo-link',
        title: 'Back to samples overview'
    });
    var logo = el('img', {
        src: libPath + 'img/dashjs-logo.png',
        alt: 'dash.js',
        height: '40'
    });
    logoLink.appendChild(logo);
    left.appendChild(logoLink);

    var title = el('h1', { className: 'sample-header-title', textContent: opts.title || 'dash.js Sample' });
    left.appendChild(title);

    header.appendChild(left);

    // Right side: breadcrumb + theme toggle
    var right = el('div', { className: 'sample-header-right' });

    // Breadcrumb
    var breadcrumb = el('div', { className: 'sample-breadcrumb' });
    var samplesLink = el('a', { href: libPath + '../index.html', textContent: 'Samples' });
    breadcrumb.appendChild(samplesLink);

    if (opts.category) {
        breadcrumb.appendChild(el('span', { className: 'separator', textContent: '/' }));
        breadcrumb.appendChild(document.createTextNode(opts.category));
    }

    breadcrumb.appendChild(el('span', { className: 'separator', textContent: '/' }));
    breadcrumb.appendChild(document.createTextNode(opts.title || ''));

    right.appendChild(breadcrumb);

    // Theme toggle
    var themeSelect = el('select', {
        className: 'sample-theme-select',
        id: 'sample-theme-select'
    });
    themeSelect.innerHTML = '<option value="light">Light</option><option value="dark">Dark</option>';

    var currentTheme = document.documentElement.getAttribute('data-bs-theme') || 'light';
    themeSelect.value = currentTheme;

    themeSelect.addEventListener('change', function () {
        var theme = themeSelect.value;
        document.documentElement.setAttribute('data-bs-theme', theme);
        try {
            localStorage.setItem('rp-theme', theme);
        } catch (e) {
            // ignore
        }
    });

    right.appendChild(themeSelect);
    header.appendChild(right);

    return header;
}

/**
 * Build the description callout.
 */
function buildDescription(opts) {
    var desc = el('div', { className: 'sample-description' });
    if (typeof opts.description === 'string') {
        desc.innerHTML = '<p>' + opts.description + '</p>';
    } else if (opts.description instanceof HTMLElement) {
        desc.appendChild(opts.description);
    }
    return desc;
}

/**
 * Build a video wrapper with optional TTML overlay div.
 */
function buildVideoWrapper(opts) {
    var wrapper = el('div', {
        className: 'sample-video-wrapper',
        id: opts.wrapperId || 'video-wrapper'
    });

    var videoAttrs = {};
    if (opts.videoAttributes) {
        for (var key in opts.videoAttributes) {
            if (opts.videoAttributes.hasOwnProperty(key)) {
                videoAttrs[key] = opts.videoAttributes[key];
            }
        }
    }

    var video = el('video', videoAttrs);
    wrapper.appendChild(video);

    // TTML rendering div (for caption samples)
    if (opts.ttmlRenderingDiv) {
        var ttmlDiv = el('div', {
            id: opts.ttmlRenderingDivId || 'ttml-rendering-div',
            style: 'position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:1;'
        });
        wrapper.appendChild(ttmlDiv);
    }

    return wrapper;
}

/**
 * Build the code output container.
 */
function buildCodeOutput(opts) {
    var div = el('div', { id: 'code-output' });
    if (opts && opts.codeExpanded) {
        div.setAttribute('data-code-expanded', 'true');
    }
    return div;
}

/**
 * Build the footer.
 */
function buildFooter() {
    return el('div', {
        className: 'sample-footer',
        innerHTML: '&copy; <a href="https://www.svta.org/working-group/dash-if-dash-js/" target="_blank" rel="noopener">Streaming Video Technology Alliance (SVTA)</a>'
    });
}

/**
 * Load and initialize the highlighter script.
 */
function loadHighlighter() {
    var script = document.createElement('script');
    script.src = libPath + '../highlighter.js';
    document.body.appendChild(script);
}

/**
 * Main entry point. Generates the page shell and calls the user's onInit callback.
 *
 * @param {Object} opts
 * @param {string} opts.title - Page/sample title
 * @param {string|HTMLElement} opts.description - Description text or element
 * @param {string} [opts.category] - Category name for breadcrumb
 * @param {string} [opts.layout='side-by-side'] - Layout mode:
 *   'side-by-side' - Description callout + video (default)
 *   'full-width'   - Full-width description, then video below
 *   'custom'       - Only header/footer/code-output; user defines body via opts.content or existing DOM
 * @param {boolean} [opts.useControlBar=false] - Auto-create the new ControlBar
 * @param {boolean} [opts.ttmlRenderingDiv=false] - Add a TTML caption overlay div
 * @param {string} [opts.ttmlRenderingDivId='ttml-rendering-div'] - ID for the TTML div
 * @param {Object} [opts.videoAttributes={}] - Extra attributes for the <video> element
 * @param {HTMLElement|string} [opts.sidePanel] - Content for right-side panel
 * @param {HTMLElement|string} [opts.content] - Content for 'custom' layout
 * @param {boolean} [opts.showCodeOutput=true] - Show source code section
 * @param {boolean} [opts.codeExpanded=false] - Expand the source code section by default
 * @param {boolean} [opts.httpWarning=false] - Show a warning when loaded over http (for DRM samples)
 * @param {Function} [opts.onInit] - Callback(videoElement, containerElement) on DOMContentLoaded
 */
export function initSamplePage(opts) {
    opts = opts || {};
    var layout = opts.layout || 'side-by-side';
    var showCode = opts.showCodeOutput !== false;

    // Apply theme immediately
    applyTheme();

    // Build the page
    var container = el('div', { className: 'sample-container' });

    // Header
    container.appendChild(buildHeader(opts));

    // Description (rendered for all layouts, including 'custom')
    if (opts.description) {
        container.appendChild(buildDescription(opts));
    }

    // HTTP/DRM warning (for DRM samples loaded over http)
    if (opts.httpWarning) {
        var warning = el('div', {
            className: 'sample-warning',
            id: 'http-warning',
            style: 'display:none'
        });
        if (location.protocol === 'http:' && location.hostname !== 'localhost') {
            warning.innerHTML = 'This page has been loaded under http. This might result in the EME APIs not being available to the player and any DRM-protected content will fail to play. ' +
                'If you wish to test manifest URLs that require EME support, then <a href="https:' + window.location.href.substring(window.location.protocol.length) + '">reload this page under https</a>.';
            warning.style.display = '';
        }
        container.appendChild(warning);
    }

    var videoElement = null;
    var wrapperElement = null;

    if (layout === 'side-by-side' || layout === 'full-width') {
        // Build content area
        var content = el('div', { className: 'sample-content' });
        var main = el('div', { className: 'sample-content-main' });

        wrapperElement = buildVideoWrapper(opts);
        videoElement = wrapperElement.querySelector('video');
        main.appendChild(wrapperElement);

        content.appendChild(main);

        // Side panel
        if (opts.sidePanel) {
            var side = el('div', { className: 'sample-content-side' });
            if (typeof opts.sidePanel === 'string') {
                side.innerHTML = opts.sidePanel;
            } else if (opts.sidePanel instanceof HTMLElement) {
                side.appendChild(opts.sidePanel);
            }
            content.appendChild(side);
        }

        container.appendChild(content);

    } else if (layout === 'custom') {
        // Custom layout: insert user-provided content
        if (opts.content) {
            if (typeof opts.content === 'string') {
                var div = el('div');
                div.innerHTML = opts.content;
                container.appendChild(div);
            } else if (opts.content instanceof HTMLElement) {
                container.appendChild(opts.content);
            }
        } else {
            // No opts.content provided – adopt existing body children
            // (everything except <script> tags) into the container so they
            // appear between the header/description and the code-output/footer.
            var adoptable = [];
            for (var ci = 0; ci < document.body.childNodes.length; ci++) {
                var node = document.body.childNodes[ci];
                if (node.nodeType === 1 && node.tagName !== 'SCRIPT') {
                    adoptable.push(node);
                }
            }
            for (var ai = 0; ai < adoptable.length; ai++) {
                container.appendChild(adoptable[ai]);
            }
        }

        // Look for video element in custom content or existing DOM
        videoElement = container.querySelector('video');
        wrapperElement = container.querySelector('.sample-video-wrapper');
    }

    // Code output
    if (showCode) {
        container.appendChild(buildCodeOutput(opts));
    }

    // Footer
    container.appendChild(buildFooter());

    // Insert into page
    document.body.insertBefore(container, document.body.firstChild);

    // Load highlighter after DOM is built
    if (showCode) {
        // Small delay to ensure all code elements are in DOM
        setTimeout(loadHighlighter, 0);
    }

    // Call onInit when DOM is ready
    if (typeof opts.onInit === 'function') {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', function () {
                opts.onInit(videoElement, container, wrapperElement);
            });
        } else {
            // DOM already loaded (module scripts are deferred)
            opts.onInit(videoElement, container, wrapperElement);
        }
    }

    // Return references for advanced usage
    return {
        container: container,
        videoElement: videoElement,
        wrapperElement: wrapperElement
    };
}

/**
 * Helper: initialize the new ControlBar from contrib/controlbar/.
 * Returns a Promise that resolves to the ControlBar instance.
 *
 * @param {Object} player - dash.js MediaPlayer instance
 * @param {HTMLVideoElement} videoElement
 * @param {HTMLElement} wrapperElement - The .sample-video-wrapper element
 * @returns {Promise<Object>} ControlBar instance
 */
export async function createControlBar(player, videoElement, wrapperElement) {
    var module = await import('../../contrib/controlbar/ControlBar.js');
    var ControlBar = module.ControlBar || module.default;
    var cb = new ControlBar(player, videoElement);
    cb.init(wrapperElement);
    cb.enable();
    return cb;
}

// Expose on window so plain <script class="code"> blocks can access it
window.createControlBar = createControlBar;
