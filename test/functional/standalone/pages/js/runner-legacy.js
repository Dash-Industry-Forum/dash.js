/**
 * Legacy runner — loads dash.js UMD and IIFE-bundled test files via
 * <script> tags instead of ES module import().
 *
 * Uses only Promise chains (no async/await) for maximum compatibility
 * with older Smart TV browsers.
 *
 * Depends on runner-core.js being loaded first (provides all shared
 * globals: params, counts, DOM refs, WebSocket, UI functions, etc.).
 */

function run() {
    currentTestEl.textContent = 'Connecting to server...';

    connectWebSocket()
    .then(function () {
        // Step 1: Load testvectors
        currentTestEl.textContent = 'Loading testvectors...';

        if (mode === 'custom') {
            return fetch('/api/custom-config/' + encodeURIComponent(sessionId))
                .then(function (r) {
                    if (!r.ok) {
                        currentTestEl.textContent = 'Error: Custom config not found for session';
                        statusIcon.className = 'bi bi-exclamation-triangle';
                        return Promise.reject(new Error('__abort__'));
                    }
                    return r.json();
                })
                .then(function (cfg) {
                    window.__testvectors__ = cfg.testvectors;
                });
        } else {
            return fetch('/testvectors.js?streams=' + encodeURIComponent(streamsName))
                .then(function (r) { return r.text(); })
                .then(function (text) {
                    var el = document.createElement('script');
                    el.textContent = text;
                    document.head.appendChild(el);
                });
        }
    })
    .then(function () {
        // Validate testvectors
        if (!window.__testvectors__ || window.__testvectors__.length === 0) {
            currentTestEl.textContent = 'Error: No testvectors loaded' + (mode === 'custom' ? '' : ' for "' + streamsName + '"');
            statusIcon.className = 'bi bi-exclamation-triangle';
            return Promise.reject(new Error('__abort__'));
        }

        if (mode === 'custom') {
            detailStreams.textContent = 'Custom (' + window.__testvectors__.length + ' streams)';
        }
        currentTestEl.textContent = 'Loaded ' + window.__testvectors__.length + ' testvectors. Loading dash.js...';

        // Step 2: Load dash.js UMD builds via <script> tags
        return loadScript('/dist/modern/umd/dash.all.min.js')
            .then(function () {
                return loadScript('/dist/modern/umd/dash.mss.min.js');
            });
    })
    .then(function () {
        // Validate dash.js loaded
        if (!window.dashjs) {
            currentTestEl.textContent = 'Error: dash.js did not initialize. Run npm run build first.';
            statusIcon.className = 'bi bi-exclamation-triangle';
            return Promise.reject(new Error('__abort__'));
        }

        currentTestEl.textContent = 'dash.js loaded. Loading test files...';

        // Step 3: Get test file list
        return fetch('/api/test-files?streams=' + encodeURIComponent(streamsName))
            .then(function (r) { return r.json(); });
    })
    .then(function (testFiles) {
        // Filter by selected categories
        if (selectedCategories.length > 0) {
            testFiles = testFiles.filter(function (f) {
                return selectedCategories.indexOf(f.split('/')[0]) >= 0;
            });
        }

        detailFiles.textContent = testFiles.length;
        currentTestEl.textContent = 'Loading ' + testFiles.length + ' test files...';

        // Step 4: Load IIFE-bundled test files sequentially via <script> tags
        var loadedCount = 0;
        var chain = Promise.resolve();

        testFiles.forEach(function (file) {
            chain = chain.then(function () {
                return loadScript('/bundled-tests-legacy/' + file)
                    .then(function () {
                        loadedCount++;
                        if (loadedCount % 5 === 0 || loadedCount === testFiles.length) {
                            currentTestEl.textContent = 'Loaded ' + loadedCount + '/' + testFiles.length + ' test files...';
                        }
                    })
                    .then(null, function (err) {
                        console.error('Failed to load:', file, err);
                        loadedCount++;
                    });
            });
        });

        return chain;
    })
    .then(function () {
        // Step 5: Run Mocha
        currentTestEl.textContent = 'Starting Mocha...';
        runMocha();
    })
    .then(null, function (err) {
        // Swallow controlled aborts
        if (err && err.message === '__abort__') { return; }
        statusIcon.className = 'bi bi-exclamation-triangle';
        currentTestEl.textContent = 'Error: ' + (err ? err.message : 'Unknown error');
        console.error('Runner error:', err);
    });
}

run();
