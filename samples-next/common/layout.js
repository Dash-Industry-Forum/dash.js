/**
 * dash.js Samples - Layout Engine
 *
 * Builds the page shell (header, breadcrumb, description, content area, code viewer, footer)
 * dynamically so individual sample files only need to provide their unique content.
 *
 * Usage in a sample HTML file:
 *
 *   <script src="../common/layout.js"
 *           data-title="My Sample"
 *           data-description="What this sample demonstrates."
 *           data-section="Getting Started"
 *           data-layout="default">
 *   </script>
 *
 * Supported data attributes on the layout.js script tag:
 *   data-title        - Sample title (also used for <h3> in description card)
 *   data-description  - Sample description text (supports HTML)
 *   data-section      - Section name for breadcrumb (e.g. "Getting Started")
 *   data-layout       - "default" (side-by-side) or "full-width" (stacked)
 *
 * The sample page must contain:
 *   <template id="sample-content"> ... </template>   (the main content)
 *
 * Optionally:
 *   <template id="sample-description-extra"> ... </template>  (extra description HTML)
 *   <script data-sample> ... </script>  (code shown in code viewer)
 */

(function () {
    'use strict';

    let cachedTemplateHtml = '';

    const scriptEl = document.currentScript;
    const basePath = scriptEl.src.substring(0, scriptEl.src.lastIndexOf('/'));

    const title = scriptEl.getAttribute('data-title') || document.title || 'dash.js Sample';
    const description = scriptEl.getAttribute('data-description') || '';
    const section = scriptEl.getAttribute('data-section') || '';
    const layout = scriptEl.getAttribute('data-layout') || 'default';

    /**
     * Resolve a path relative to the samples-next/ root,
     * regardless of how deeply nested the current sample is.
     */
    function resolveFromSample(relativePath) {
        const samplePath = window.location.pathname;
        const samplesNextIdx = samplePath.indexOf('samples-next/');
        if (samplesNextIdx === -1) {
            return relativePath;
        }
        const afterSamplesNext = samplePath.substring(samplesNextIdx + 'samples-next/'.length);
        const depth = (afterSamplesNext.match(/\//g) || []).length;
        const prefix = '../'.repeat(depth);
        return prefix + relativePath;
    }

    const cssFiles = [
        resolveFromSample('lib/bootstrap/bootstrap.min.css'),
        resolveFromSample('lib/bootstrap-icons/bootstrap-icons.min.css'),
        resolveFromSample('lib/highlight/github.min.css'),
        resolveFromSample('common/base.css')
    ];

    const jsFiles = [
        resolveFromSample('lib/bootstrap/bootstrap.bundle.min.js'),
        resolveFromSample('lib/highlight/highlight.min.js')
    ];

    // Inject CSS into <head>
    const head = document.head;
    if (!head.querySelector('meta[name="viewport"]')) {
        const metaViewport = document.createElement('meta');
        metaViewport.name = 'viewport';
        metaViewport.content = 'width=device-width, initial-scale=1';
        head.appendChild(metaViewport);
    }

    for (const href of cssFiles) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = href;
        head.appendChild(link);
    }

    // Build the page shell once DOM is ready
    document.addEventListener('DOMContentLoaded', () => {
        injectScripts(jsFiles, () => {
            buildPageShell();
            initCodeViewer();
            if (typeof window.init === 'function') {
                window.init();
            }
        });
    });

    function injectScripts(urls, callback) {
        let loaded = 0;
        if (urls.length === 0) {
            callback();
            return;
        }
        for (const src of urls) {
            const script = document.createElement('script');
            script.src = src;
            script.onload = () => { if (++loaded === urls.length) callback(); };
            script.onerror = () => { if (++loaded === urls.length) callback(); };
            document.body.appendChild(script);
        }
    }

    /* ------------------------------------------------------------------
     *  Breadcrumb builder
     * ------------------------------------------------------------------ */
    function buildBreadcrumb() {
        const indexHref = resolveFromSample('index.html');
        const sectionId = section.replace(/[^a-z0-9]/gmi, '');
        const sectionHref = section ? `${indexHref}#${sectionId}` : '';

        let items = `<li class="breadcrumb-item"><a href="${indexHref}">Samples</a></li>`;
        if (section) {
            items += `<li class="breadcrumb-item"><a href="${sectionHref}">${section}</a></li>`;
        }
        items += `<li class="breadcrumb-item active" aria-current="page">${title}</li>`;

        return `
            <nav class="sample-breadcrumb" aria-label="breadcrumb">
                <ol class="breadcrumb">${items}</ol>
            </nav>`;
    }

    /* ------------------------------------------------------------------
     *  Footer builder
     * ------------------------------------------------------------------ */
    function buildFooter() {
        return `
            <footer class="sample-footer">
                <div class="d-flex flex-wrap justify-content-between align-items-center">
                    <span>&copy; DASH Industry Forum</span>
                    <div class="footer-links">
                        <a href="https://github.com/Dash-Industry-Forum/dash.js" target="_blank">
                            <i class="bi bi-github"></i> GitHub
                        </a>
                        <a href="https://cdn.dashjs.org/latest/jsdoc/index.html" target="_blank">
                            <i class="bi bi-book"></i> API Docs
                        </a>
                        <a href="${resolveFromSample('../samples/dash-if-reference-player/index.html')}" target="_blank">
                            <i class="bi bi-play-circle"></i> Reference Player
                        </a>
                    </div>
                </div>
            </footer>`;
    }

    /* ------------------------------------------------------------------
     *  Page shell builder
     * ------------------------------------------------------------------ */
    function buildPageShell() {
        const template = document.getElementById('sample-content');
        const extraDescTemplate = document.getElementById('sample-description-extra');

        cachedTemplateHtml = template ? template.innerHTML : '';
        const contentHtml = cachedTemplateHtml;
        const extraDescHtml = extraDescTemplate ? extraDescTemplate.innerHTML : '';
        const logoPath = resolveFromSample('lib/img/dashjs-logo.png');
        const breadcrumbHtml = buildBreadcrumb();
        const footerHtml = buildFooter();

        const descriptionBlock = `
            <div class="sample-description">
                <div class="desc-header">
                    <i class="bi bi-info-circle"></i>
                    <h3>${title}</h3>
                </div>
                <p>${description}</p>
                ${extraDescHtml}
            </div>`;

        let shellHtml;
        if (layout === 'full-width') {
            shellHtml = `
                <main>
                    <div class="container py-3">
                        <header class="sample-header">
                            <a href="${resolveFromSample('index.html')}">
                                <img src="${logoPath}" alt="dash.js logo">
                            </a>
                            ${breadcrumbHtml}
                        </header>
                        <div class="row">
                            <div class="col-12">${descriptionBlock}</div>
                        </div>
                        <div class="row mt-3">
                            <div class="col-12" id="sample-content-target">${contentHtml}</div>
                        </div>
                        <div class="row">
                            <div class="col-12" id="code-output"></div>
                        </div>
                        ${footerHtml}
                    </div>
                </main>`;
        } else {
            shellHtml = `
                <main>
                    <div class="container py-3">
                        <header class="sample-header">
                            <a href="${resolveFromSample('index.html')}">
                                <img src="${logoPath}" alt="dash.js logo">
                            </a>
                            ${breadcrumbHtml}
                        </header>
                        <div class="row g-4">
                            <div class="col-md-4">${descriptionBlock}</div>
                            <div class="col-md-8" id="sample-content-target">${contentHtml}</div>
                        </div>
                        <div class="row">
                            <div class="col-12" id="code-output"></div>
                        </div>
                        ${footerHtml}
                    </div>
                </main>`;
        }

        // Preserve data-sample scripts so the code viewer can read them
        const scriptsToKeep = [];
        document.body.querySelectorAll('script[data-sample], script[data-keep]').forEach(s => {
            scriptsToKeep.push(s.cloneNode(true));
        });

        document.body.innerHTML = shellHtml;

        for (const s of scriptsToKeep) {
            document.body.appendChild(s);
        }
    }

    /* ------------------------------------------------------------------
     *  Tabbed code viewer with line numbers
     * ------------------------------------------------------------------ */
    function initCodeViewer() {
        const codeOutput = document.getElementById('code-output');
        if (!codeOutput) return;

        const codeBlocks = [];

        // Collect JavaScript from <script data-sample> elements
        document.querySelectorAll('script[data-sample]').forEach(script => {
            const code = dedent(script.textContent).trim();
            if (code) {
                codeBlocks.push({ label: 'JavaScript', icon: 'bi-filetype-js', language: 'javascript', code });
            }
        });

        // Collect HTML from the original template (still in DOM but hidden)
        const templateHtml = cachedTemplateHtml || '';
        if (templateHtml) {
            const code = dedent(templateHtml).trim();
            if (code) {
                codeBlocks.push({ label: 'HTML', icon: 'bi-filetype-html', language: 'xml', code });
            }
        }

        if (codeBlocks.length === 0) return;

        const viewerId = 'code-viewer-panel';
        const useTabs = codeBlocks.length > 1;

        // Outer wrapper
        let html = '<div class="code-viewer">';

        // Collapsible header
        html += `
            <div class="code-viewer-header" data-bs-toggle="collapse" data-bs-target="#${viewerId}"
                 aria-expanded="true" aria-controls="${viewerId}">
                <h6><i class="bi bi-code-slash"></i> Source Code</h6>
                <i class="bi bi-chevron-down toggle-icon"></i>
            </div>`;

        // Collapsible body
        html += `<div class="collapse show" id="${viewerId}">`;

        if (useTabs) {
            // Tab nav
            html += '<ul class="nav nav-tabs" role="tablist">';
            codeBlocks.forEach((block, i) => {
                const active = i === 0 ? ' active' : '';
                html += `
                    <li class="nav-item" role="presentation">
                        <button class="nav-link${active}" data-bs-toggle="tab"
                                data-bs-target="#code-tab-${i}" type="button" role="tab"
                                aria-selected="${i === 0}">
                            <i class="bi ${block.icon}"></i> ${block.label}
                        </button>
                    </li>`;
            });
            html += '</ul>';

            // Tab panes
            html += '<div class="tab-content">';
            codeBlocks.forEach((block, i) => {
                const active = i === 0 ? ' show active' : '';
                html += `
                    <div class="tab-pane fade${active}" id="code-tab-${i}" role="tabpanel">
                        <pre><code class="language-${block.language}">${escapeHtml(block.code)}</code></pre>
                        <button class="btn btn-sm btn-outline-secondary copy-btn" type="button"
                                data-code-index="${i}">
                            <i class="bi bi-clipboard"></i> Copy
                        </button>
                    </div>`;
            });
            html += '</div>';
        } else {
            // Single block, no tabs
            const block = codeBlocks[0];
            html += `
                <div style="position:relative;">
                    <pre><code class="language-${block.language}">${escapeHtml(block.code)}</code></pre>
                    <button class="btn btn-sm btn-outline-secondary copy-btn" type="button"
                            data-code-index="0">
                        <i class="bi bi-clipboard"></i> Copy
                    </button>
                </div>`;
        }

        html += '</div></div>';
        codeOutput.innerHTML = html;

        // Apply syntax highlighting
        const codeEls = codeOutput.querySelectorAll('pre code');
        if (typeof hljs !== 'undefined') {
            codeEls.forEach(el => {
                hljs.highlightElement(el);
            });
        }

        codeEls.forEach(el => applyLineNumbers(el));

        // Collapse header toggle icon
        const collapseEl = document.getElementById(viewerId);
        if (collapseEl) {
            const headerEl = codeOutput.querySelector('.code-viewer-header');
            collapseEl.addEventListener('hidden.bs.collapse', () => headerEl.classList.add('collapsed'));
            collapseEl.addEventListener('shown.bs.collapse', () => headerEl.classList.remove('collapsed'));
        }

        // Copy buttons
        codeOutput.querySelectorAll('.copy-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const idx = parseInt(btn.getAttribute('data-code-index'), 10);
                const rawCode = codeBlocks[idx].code;
                navigator.clipboard.writeText(rawCode).then(() => {
                    btn.innerHTML = '<i class="bi bi-check-lg"></i> Copied!';
                    setTimeout(() => {
                        btn.innerHTML = '<i class="bi bi-clipboard"></i> Copy';
                    }, 2000);
                });
            });
        });
    }

    /* ------------------------------------------------------------------
     *  Utility functions
     * ------------------------------------------------------------------ */

    /**
     * Wrap each line in a <span class="line-number"> for CSS counter line numbers.
     */
    function applyLineNumbers(codeEl) {
        const html = codeEl.innerHTML;
        const lines = html.split('\n');
        const wrapped = lines.map(line => {
            const safeLine = line === '' ? '&nbsp;' : line;
            return `<span class="line-number">${safeLine}</span>`;
        });
        codeEl.innerHTML = wrapped.join('\n');
    }

    /**
     * Remove common leading whitespace from a block of text.
     */
    function dedent(text) {
        const lines = text.split('\n');
        const nonEmptyLines = lines.filter(l => l.trim().length > 0);
        if (nonEmptyLines.length === 0) return text;
        const minIndent = Math.min(
            ...nonEmptyLines.map(l => l.match(/^(\s*)/)[1].length)
        );
        if (minIndent === 0) return text;
        return lines.map(l => l.substring(minIndent)).join('\n');
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
})();
