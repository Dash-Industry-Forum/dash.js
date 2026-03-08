/**
 * ESM runner — loads dash.js and bundled test files via dynamic import().
 *
 * Requires a browser that supports <script type="module"> and import().
 * For older browsers (Smart TVs, etc.), use runner-legacy.js instead.
 *
 * Depends on runner-core.js being loaded first (provides all shared
 * globals: params, counts, DOM refs, WebSocket, UI functions, etc.).
 */

async function run() {
    try {
        currentTestEl.textContent = 'Connecting to server...';
        await connectWebSocket();

        // Step 1: Load testvectors
        currentTestEl.textContent = 'Loading testvectors...';
        if (mode === 'custom') {
            // Custom config mode: fetch from session API
            var configResponse = await fetch('/api/custom-config/' + encodeURIComponent(sessionId));
            if (!configResponse.ok) {
                currentTestEl.textContent = 'Error: Custom config not found for session';
                statusIcon.className = 'bi bi-exclamation-triangle';
                return;
            }
            var customCfg = await configResponse.json();
            window.__testvectors__ = customCfg.testvectors;
        } else {
            // Preset mode: load via testvectors.js script
            var tvResponse = await fetch('/testvectors.js?streams=' + encodeURIComponent(streamsName));
            var tvScript = await tvResponse.text();
            var scriptEl = document.createElement('script');
            scriptEl.textContent = tvScript;
            document.head.appendChild(scriptEl);
        }

        if (!window.__testvectors__ || window.__testvectors__.length === 0) {
            currentTestEl.textContent = 'Error: No testvectors loaded' + (mode === 'custom' ? '' : ' for "' + streamsName + '"');
            statusIcon.className = 'bi bi-exclamation-triangle';
            return;
        }

        if (mode === 'custom') {
            detailStreams.textContent = 'Custom (' + window.__testvectors__.length + ' streams)';
        }
        currentTestEl.textContent = 'Loaded ' + window.__testvectors__.length + ' testvectors. Loading dash.js...';

        // Step 2: Import dash.js ESM
        await import('/dist/modern/esm/dash.all.min.js');
        await import('/dist/modern/esm/dash.mss.min.js');

        if (!window.dashjs) {
            currentTestEl.textContent = 'Error: dash.js did not initialize. Run npm run build first.';
            statusIcon.className = 'bi bi-exclamation-triangle';
            return;
        }

        currentTestEl.textContent = 'dash.js loaded. Loading test files...';

        // Step 3: Get test files
        var testFilesResponse = await fetch('/api/test-files?streams=' + encodeURIComponent(streamsName));
        var testFiles = await testFilesResponse.json();

        if (selectedCategories.length > 0) {
            testFiles = testFiles.filter(function (f) {
                return selectedCategories.indexOf(f.split('/')[0]) >= 0;
            });
        }

        detailFiles.textContent = testFiles.length;
        currentTestEl.textContent = 'Loading ' + testFiles.length + ' test files...';

        // Step 4: Import bundled test files (ESM)
        var loadedCount = 0;
        for (var i = 0; i < testFiles.length; i++) {
            try {
                await import('/bundled-tests/' + testFiles[i]);
            } catch (err) {
                console.error('Failed to load:', testFiles[i], err);
            }
            loadedCount++;
            if (loadedCount % 5 === 0 || loadedCount === testFiles.length) {
                currentTestEl.textContent = 'Loaded ' + loadedCount + '/' + testFiles.length + ' test files...';
            }
        }

        // Step 5: Run Mocha
        currentTestEl.textContent = 'Starting Mocha...';
        runMocha();

    } catch (err) {
        statusIcon.className = 'bi bi-exclamation-triangle';
        currentTestEl.textContent = 'Error: ' + err.message;
        console.error('Runner error:', err);
    }
}

run();
