/**
 * Landing page logic for the standalone test runner.
 *
 * - Theme persistence (localStorage 'rp-theme')
 * - Loads stream configs and all testcase identifiers from the server
 * - Preset selection populates an editable custom config
 * - Per-testvector test selection (expandable inline panels)
 * - Global category toggle (bulk-toggles across all testvectors)
 * - Add custom streams (URL + name + type + DRM)
 * - QR code for remote device pairing
 * - WebSocket for remote control
 */

(function () {
    'use strict';

    // ---- State ----
    var sessionId = generateSessionId();
    var ws = null;
    var selectedStreamConfig = '';
    var allTestcases = {};       // { category: [testcaseId, ...] } from /api/all-testcases
    var customConfig = [];       // editable testvector array
    var expandedIndex = -1;      // which testvector row is expanded (-1 = none)

    // ---- DOM elements ----
    var themeSelect = document.getElementById('theme-select');
    var streamConfigSelect = document.getElementById('stream-config');
    var optionsPanel = document.getElementById('options-panel');
    var optionsScroll = document.getElementById('options-scroll');
    var btnAddStream = document.getElementById('btn-add-stream');
    var addStreamPanel = document.getElementById('add-stream-panel');
    var btnConfirmAdd = document.getElementById('btn-confirm-add');
    var btnCancelAdd = document.getElementById('btn-cancel-add');
    var btnAddClearkey = document.getElementById('btn-add-clearkey');
    var btnStart = document.getElementById('btn-start');
    var sessionIdSpan = document.getElementById('session-id');
    var testvectorList = document.getElementById('testvector-list');
    var testvectorCount = document.getElementById('testvector-count');
    var qrCanvas = document.getElementById('qr-canvas');
    var qrUrlDiv = document.getElementById('qr-url');
    var statusDot = document.getElementById('status-dot');
    var statusText = document.getElementById('status-text');
    var toastContainer = document.getElementById('toast-container');

    // ---- Init ----
    sessionIdSpan.textContent = sessionId;
    initTheme();
    loadStreamConfigs();
    loadAllTestcases();
    connectWebSocket();
    generateQRCode();

    // ---- Event listeners ----
    themeSelect.addEventListener('change', function () {
        applyTheme(this.value);
    });

    streamConfigSelect.addEventListener('change', function () {
        selectedStreamConfig = this.value;
        if (!selectedStreamConfig) {
            customConfig = [];
            expandedIndex = -1;
            renderTestvectorList();
            btnStart.disabled = true;
            return;
        }
        loadPresetConfig(selectedStreamConfig);
    });

    btnAddStream.addEventListener('click', function () {
        addStreamPanel.classList.toggle('d-none');
    });

    btnCancelAdd.addEventListener('click', function () {
        addStreamPanel.classList.add('d-none');
        clearAddStreamForm();
    });

    btnConfirmAdd.addEventListener('click', function () {
        addCustomStream();
    });

    btnAddClearkey.addEventListener('click', function () {
        var pairs = document.getElementById('clearkey-pairs');
        var row = document.createElement('div');
        row.className = 'clearkey-row';
        row.innerHTML =
            '<input type="text" class="form-control form-control-sm" placeholder="Key ID">' +
            '<input type="text" class="form-control form-control-sm" placeholder="Key">';
        pairs.appendChild(row);
    });

    btnStart.addEventListener('click', function () {
        startTests();
    });

    // ---- Theme ----

    function initTheme() {
        var saved = localStorage.getItem('rp-theme');
        if (saved) {
            applyTheme(saved);
            themeSelect.value = saved;
        }
    }

    function applyTheme(theme) {
        document.documentElement.setAttribute('data-bs-theme', theme);
        localStorage.setItem('rp-theme', theme);
    }

    // ---- Session ----

    function generateSessionId() {
        return 'xxxx-xxxx-xxxx'.replace(/x/g, function () {
            return Math.floor(Math.random() * 16).toString(16);
        });
    }

    // ---- API calls ----

    function loadStreamConfigs() {
        fetch('/api/streams')
            .then(function (r) {
                if (!r.ok) { throw new Error('HTTP ' + r.status); }
                return r.json();
            })
            .then(function (configs) {
                streamConfigSelect.innerHTML = '<option value="">Select a stream configuration...</option>';
                configs.forEach(function (name) {
                    var opt = document.createElement('option');
                    opt.value = name;
                    opt.textContent = name;
                    streamConfigSelect.appendChild(opt);
                });
            })
            .catch(function (err) {
                console.error('Failed to load stream configs:', err);
                streamConfigSelect.innerHTML = '<option value="">Error loading configs</option>';
            });
    }

    function loadAllTestcases() {
        fetch('/api/all-testcases')
            .then(function (r) {
                if (!r.ok) { throw new Error('HTTP ' + r.status); }
                return r.json();
            })
            .then(function (data) {
                allTestcases = data;
                renderGlobalCategories();
            })
            .catch(function (err) {
                console.error('Failed to load testcases:', err);
                optionsScroll.innerHTML =
                    '<span style="color:var(--rp-text-muted);font-size:0.8rem;">' +
                    'Failed to load test categories. Check server connection.' +
                    '</span>';
            });
    }

    function loadPresetConfig(name) {
        fetch('/api/stream-config/' + encodeURIComponent(name))
            .then(function (r) {
                if (!r.ok) { throw new Error('HTTP ' + r.status); }
                return r.json();
            })
            .then(function (config) {
                var vectors = config.testvectors || [];
                customConfig = vectors.map(function (tv) {
                    return {
                        enabled: true,
                        name: tv.name,
                        url: tv.url,
                        type: tv.type || 'vod',
                        drm: tv.drm || null,
                        testdata: tv.testdata || null,
                        includedTestfiles: resolveIncludedTests(tv),
                        excludedTestfiles: tv.excludedTestfiles
                            ? tv.excludedTestfiles.slice()
                            : [],
                        isCustom: false,
                    };
                });
                expandedIndex = -1;
                renderTestvectorList();
                updateGlobalCategoryCheckboxes();
                btnStart.disabled = customConfig.length === 0;
            })
            .catch(function (err) {
                console.error('Failed to load preset config:', err);
                customConfig = [];
                expandedIndex = -1;
                renderTestvectorList();
                showToast('Failed to load stream config', 'danger');
            });
    }

    // ---- Test resolution helpers ----

    function getAllTestcasesList() {
        var list = [];
        Object.keys(allTestcases).forEach(function (cat) {
            allTestcases[cat].forEach(function (tc) {
                list.push(tc);
            });
        });
        return list;
    }

    function resolveIncludedTests(tv) {
        var allTests = getAllTestcasesList();

        // No filters = all tests
        if ((!tv.includedTestfiles || tv.includedTestfiles.length === 0)
            && (!tv.excludedTestfiles || tv.excludedTestfiles.length === 0)) {
            return allTests.slice();
        }

        // "all" with possible exclusions
        if (tv.includedTestfiles && tv.includedTestfiles.indexOf('all') >= 0) {
            var excluded = tv.excludedTestfiles || [];
            return allTests.filter(function (t) {
                return excluded.indexOf(t) < 0;
            });
        }

        // Explicit includes (may contain category wildcards like "playback/*")
        if (tv.includedTestfiles && tv.includedTestfiles.length > 0) {
            var result = [];
            tv.includedTestfiles.forEach(function (pattern) {
                if (pattern.endsWith('/*')) {
                    var cat = pattern.replace('/*', '');
                    (allTestcases[cat] || []).forEach(function (tc) {
                        if (result.indexOf(tc) < 0) { result.push(tc); }
                    });
                } else {
                    if (result.indexOf(pattern) < 0) { result.push(pattern); }
                }
            });
            return result;
        }

        return allTests.slice();
    }

    // ---- Global category rendering ----

    function renderGlobalCategories() {
        optionsScroll.innerHTML = '';
        Object.keys(allTestcases).sort().forEach(function (cat) {
            var check = document.createElement('div');
            check.className = 'form-check form-check-inline';

            var cb = document.createElement('input');
            cb.className = 'form-check-input';
            cb.type = 'checkbox';
            cb.id = 'cat-' + cat;
            cb.value = cat;
            cb.checked = true;

            var label = document.createElement('label');
            label.className = 'form-check-label';
            label.htmlFor = 'cat-' + cat;
            label.textContent = cat;

            cb.addEventListener('change', function () {
                applyGlobalCategoryToggle(cat, this.checked);
            });

            check.appendChild(cb);
            check.appendChild(label);
            optionsScroll.appendChild(check);
        });
    }

    function applyGlobalCategoryToggle(category, checked) {
        var testsInCategory = allTestcases[category] || [];
        customConfig.forEach(function (tv) {
            testsInCategory.forEach(function (testcase) {
                var idx = tv.includedTestfiles.indexOf(testcase);
                if (checked && idx < 0) {
                    tv.includedTestfiles.push(testcase);
                } else if (!checked && idx >= 0) {
                    tv.includedTestfiles.splice(idx, 1);
                }
            });
        });
        // Re-render test counts and expanded detail
        updateAllTestCountBadges();
        if (expandedIndex >= 0) {
            renderTestvectorDetail(expandedIndex);
        }
    }

    function updateGlobalCategoryCheckboxes() {
        var enabledTvs = customConfig.filter(function (tv) { return tv.enabled; });
        Object.keys(allTestcases).forEach(function (cat) {
            var cb = document.getElementById('cat-' + cat);
            if (!cb) { return; }
            var tests = allTestcases[cat];
            var allChecked = enabledTvs.length > 0 && enabledTvs.every(function (tv) {
                return tests.every(function (t) { return tv.includedTestfiles.indexOf(t) >= 0; });
            });
            var someChecked = enabledTvs.some(function (tv) {
                return tests.some(function (t) { return tv.includedTestfiles.indexOf(t) >= 0; });
            });
            cb.checked = allChecked;
            cb.indeterminate = someChecked && !allChecked;
        });
    }

    // ---- Testvector list rendering ----

    function renderTestvectorList() {
        testvectorList.innerHTML = '';
        var enabledCount = customConfig.filter(function (tv) { return tv.enabled; }).length;
        testvectorCount.textContent = enabledCount + ' / ' + customConfig.length + ' streams';

        if (customConfig.length === 0) {
            testvectorList.innerHTML =
                '<div class="empty-state">' +
                '<i class="bi bi-collection-play"></i>' +
                'Select a stream configuration or add a custom stream to start.' +
                '</div>';
            return;
        }

        customConfig.forEach(function (tv, index) {
            var item = document.createElement('div');
            item.className = 'testvector-item' + (tv.enabled ? '' : ' disabled');
            item.setAttribute('data-index', index);

            // ---- Header row ----
            var row = document.createElement('div');
            row.className = 'testvector-row';

            // Enable checkbox
            var cb = document.createElement('input');
            cb.type = 'checkbox';
            cb.className = 'form-check-input testvector-checkbox';
            cb.checked = tv.enabled;
            cb.addEventListener('change', function () {
                customConfig[index].enabled = this.checked;
                item.classList.toggle('disabled', !this.checked);
                updateTestvectorCount();
                updateGlobalCategoryCheckboxes();
            });

            // Name
            var nameSpan = document.createElement('span');
            nameSpan.className = 'stream-name';
            nameSpan.textContent = tv.name || tv.url;
            nameSpan.title = tv.url;

            // Test count badge
            var testCountBadge = document.createElement('span');
            testCountBadge.className = 'testvector-test-count';
            testCountBadge.id = 'tv-count-' + index;
            testCountBadge.textContent = tv.includedTestfiles.length + ' tests';

            row.appendChild(cb);
            row.appendChild(nameSpan);
            row.appendChild(testCountBadge);

            // Tags
            var typeTag = document.createElement('span');
            typeTag.className = 'stream-tag ' + (tv.type === 'live' ? 'stream-tag-live' : 'stream-tag-vod');
            typeTag.textContent = tv.type === 'live' ? 'LIVE' : 'VOD';
            row.appendChild(typeTag);

            if (tv.drm) {
                var drmTag = document.createElement('span');
                drmTag.className = 'stream-tag stream-tag-drm';
                drmTag.textContent = 'DRM';
                row.appendChild(drmTag);
            }

            if (tv.url && tv.url.indexOf('.ism') >= 0 && !tv.url.match(/\.mpd(\?|$)/i)) {
                var mssTag = document.createElement('span');
                mssTag.className = 'stream-tag stream-tag-mss';
                mssTag.textContent = 'MSS';
                row.appendChild(mssTag);
            }

            if (tv.isCustom) {
                var customTag = document.createElement('span');
                customTag.className = 'stream-tag stream-tag-custom';
                customTag.textContent = 'CUSTOM';
                row.appendChild(customTag);
            }

            // Expand chevron
            var chevron = document.createElement('i');
            chevron.className = 'bi bi-chevron-down testvector-chevron';
            if (expandedIndex === index) {
                chevron.classList.add('expanded');
            }
            row.appendChild(chevron);

            // Click to expand (but not on the checkbox)
            row.addEventListener('click', function (e) {
                if (e.target === cb || e.target.closest('.testvector-checkbox')) { return; }
                toggleTestvectorExpand(index, item);
            });

            // ---- Detail panel (initially hidden) ----
            var detail = document.createElement('div');
            detail.className = 'testvector-detail d-none';
            detail.id = 'tv-detail-' + index;

            item.appendChild(row);
            item.appendChild(detail);
            testvectorList.appendChild(item);

            // If this was the expanded one, re-expand it
            if (expandedIndex === index) {
                detail.classList.remove('d-none');
                renderTestvectorDetail(index);
            }
        });
    }

    function updateTestvectorCount() {
        var enabledCount = customConfig.filter(function (tv) { return tv.enabled; }).length;
        testvectorCount.textContent = enabledCount + ' / ' + customConfig.length + ' streams';
        btnStart.disabled = enabledCount === 0;
    }

    function updateAllTestCountBadges() {
        customConfig.forEach(function (tv, index) {
            var badge = document.getElementById('tv-count-' + index);
            if (badge) {
                badge.textContent = tv.includedTestfiles.length + ' tests';
            }
        });
    }

    function updateTestvectorTestCount(index) {
        var badge = document.getElementById('tv-count-' + index);
        if (badge) {
            badge.textContent = customConfig[index].includedTestfiles.length + ' tests';
        }
    }

    // ---- Expand/collapse ----

    function toggleTestvectorExpand(index, itemEl) {
        var detail = document.getElementById('tv-detail-' + index);
        var chevron = itemEl.querySelector('.testvector-chevron');

        if (expandedIndex === index) {
            // Collapse
            detail.classList.add('d-none');
            chevron.classList.remove('expanded');
            expandedIndex = -1;
            return;
        }

        // Collapse previously expanded
        if (expandedIndex >= 0) {
            var prevDetail = document.getElementById('tv-detail-' + expandedIndex);
            if (prevDetail) { prevDetail.classList.add('d-none'); }
            var prevItems = testvectorList.querySelectorAll('.testvector-chevron');
            if (prevItems[expandedIndex]) {
                prevItems[expandedIndex].classList.remove('expanded');
            }
        }

        // Expand new
        expandedIndex = index;
        detail.classList.remove('d-none');
        chevron.classList.add('expanded');
        renderTestvectorDetail(index);
    }

    // ---- Per-testvector detail rendering ----

    function renderTestvectorDetail(index) {
        var tv = customConfig[index];
        var detail = document.getElementById('tv-detail-' + index);
        detail.innerHTML = '';

        // URL row
        var urlRow = document.createElement('div');
        urlRow.className = 'testvector-url';
        urlRow.textContent = tv.url;
        detail.appendChild(urlRow);

        // Delete button for custom streams
        if (tv.isCustom) {
            var deleteBtn = document.createElement('button');
            deleteBtn.className = 'btn btn-outline-danger btn-sm';
            deleteBtn.style.marginBottom = '0.5rem';
            deleteBtn.innerHTML = '<i class="bi bi-trash"></i> Remove';
            deleteBtn.addEventListener('click', function () {
                customConfig.splice(index, 1);
                if (expandedIndex === index) { expandedIndex = -1; }
                else if (expandedIndex > index) { expandedIndex--; }
                renderTestvectorList();
                updateTestvectorCount();
                updateGlobalCategoryCheckboxes();
            });
            detail.appendChild(deleteBtn);
        }

        // Test selection grouped by category
        var categories = Object.keys(allTestcases).sort();
        categories.forEach(function (cat) {
            var tests = allTestcases[cat];
            var group = document.createElement('div');
            group.className = 'test-category-group';

            // Category header with select-all checkbox
            var header = document.createElement('div');
            header.className = 'test-category-header';

            var catCb = document.createElement('input');
            catCb.type = 'checkbox';
            catCb.className = 'form-check-input';
            var allInCat = tests.every(function (t) {
                return tv.includedTestfiles.indexOf(t) >= 0;
            });
            var someInCat = tests.some(function (t) {
                return tv.includedTestfiles.indexOf(t) >= 0;
            });
            catCb.checked = allInCat;
            catCb.indeterminate = someInCat && !allInCat;

            var catLabel = document.createElement('span');
            catLabel.className = 'test-category-label';
            catLabel.textContent = cat;

            var catCount = document.createElement('span');
            catCount.className = 'test-category-count';
            var enabledInCat = tests.filter(function (t) {
                return tv.includedTestfiles.indexOf(t) >= 0;
            }).length;
            catCount.textContent = enabledInCat + '/' + tests.length;

            catCb.addEventListener('change', function () {
                tests.forEach(function (t) {
                    var idx = tv.includedTestfiles.indexOf(t);
                    if (catCb.checked && idx < 0) {
                        tv.includedTestfiles.push(t);
                    } else if (!catCb.checked && idx >= 0) {
                        tv.includedTestfiles.splice(idx, 1);
                    }
                });
                renderTestvectorDetail(index);
                updateTestvectorTestCount(index);
                updateGlobalCategoryCheckboxes();
            });

            header.appendChild(catCb);
            header.appendChild(catLabel);
            header.appendChild(catCount);

            // Individual test checkboxes
            var items = document.createElement('div');
            items.className = 'test-category-items';

            tests.forEach(function (testcase) {
                var testCheck = document.createElement('label');
                testCheck.className = 'test-item-label';

                var testCb = document.createElement('input');
                testCb.type = 'checkbox';
                testCb.className = 'form-check-input';
                testCb.checked = tv.includedTestfiles.indexOf(testcase) >= 0;

                var testName = document.createElement('span');
                testName.textContent = testcase.split('/').pop();

                testCb.addEventListener('change', function () {
                    var idx = tv.includedTestfiles.indexOf(testcase);
                    if (this.checked && idx < 0) {
                        tv.includedTestfiles.push(testcase);
                    } else if (!this.checked && idx >= 0) {
                        tv.includedTestfiles.splice(idx, 1);
                    }
                    renderTestvectorDetail(index);
                    updateTestvectorTestCount(index);
                    updateGlobalCategoryCheckboxes();
                });

                testCheck.appendChild(testCb);
                testCheck.appendChild(testName);
                items.appendChild(testCheck);
            });

            group.appendChild(header);
            group.appendChild(items);
            detail.appendChild(group);
        });
    }

    // ---- Add custom stream ----

    function addCustomStream() {
        var url = document.getElementById('custom-url').value.trim();
        if (!url) {
            showToast('Please enter a stream URL', 'warning');
            return;
        }
        var name = document.getElementById('custom-name').value.trim() || url;
        var type = document.getElementById('custom-type').value;

        // Build DRM config
        var drm = null;
        var widevine = document.getElementById('drm-widevine').value.trim();
        var playready = document.getElementById('drm-playready').value.trim();
        var clearkeys = getClearKeyPairs();
        if (widevine || playready || Object.keys(clearkeys).length > 0) {
            drm = {};
            if (widevine) { drm['com.widevine.alpha'] = { serverURL: widevine }; }
            if (playready) { drm['com.microsoft.playready'] = { serverURL: playready }; }
            if (Object.keys(clearkeys).length > 0) {
                drm['org.w3.clearkey'] = { clearkeys: clearkeys };
            }
        }

        var newTv = {
            enabled: true,
            name: name,
            url: url,
            type: type,
            drm: drm,
            testdata: null,
            includedTestfiles: getAllTestcasesList(),
            excludedTestfiles: [],
            isCustom: true,
        };

        customConfig.push(newTv);
        expandedIndex = -1;
        renderTestvectorList();
        updateTestvectorCount();
        updateGlobalCategoryCheckboxes();
        addStreamPanel.classList.add('d-none');
        clearAddStreamForm();
        btnStart.disabled = false;
        showToast('Custom stream added', 'success');
    }

    function getClearKeyPairs() {
        var pairs = {};
        var rows = document.querySelectorAll('#clearkey-pairs .clearkey-row');
        rows.forEach(function (row) {
            var inputs = row.querySelectorAll('input');
            var keyId = inputs[0] ? inputs[0].value.trim() : '';
            var key = inputs[1] ? inputs[1].value.trim() : '';
            if (keyId && key) {
                pairs[keyId] = key;
            }
        });
        return pairs;
    }

    function clearAddStreamForm() {
        document.getElementById('custom-url').value = '';
        document.getElementById('custom-name').value = '';
        document.getElementById('custom-type').value = 'vod';
        document.getElementById('drm-widevine').value = '';
        document.getElementById('drm-playready').value = '';
        document.getElementById('clearkey-pairs').innerHTML =
            '<div class="clearkey-row">' +
            '<input type="text" class="form-control form-control-sm" placeholder="Key ID">' +
            '<input type="text" class="form-control form-control-sm" placeholder="Key">' +
            '</div>';
        var drmSection = document.getElementById('drm-section');
        if (drmSection.open) { drmSection.open = false; }
    }

    // ---- Start tests ----

    function startTests() {
        var enabledTvs = customConfig.filter(function (tv) { return tv.enabled; });
        if (enabledTvs.length === 0) {
            showToast('No streams enabled', 'warning');
            return;
        }

        // Build the config to send
        var config = {
            testvectors: enabledTvs.map(function (tv) {
                var obj = {
                    name: tv.name,
                    url: tv.url,
                    type: tv.type,
                    includedTestfiles: tv.includedTestfiles.slice(),
                };
                if (tv.drm) { obj.drm = tv.drm; }
                if (tv.testdata) { obj.testdata = tv.testdata; }
                if (tv.excludedTestfiles && tv.excludedTestfiles.length > 0) {
                    obj.excludedTestfiles = tv.excludedTestfiles;
                }
                return obj;
            }),
        };

        // Compute which test file categories to load (union of all included tests)
        var allIncluded = {};
        config.testvectors.forEach(function (tv) {
            (tv.includedTestfiles || []).forEach(function (tc) {
                var cat = tc.split('/')[0];
                allIncluded[cat] = true;
            });
        });
        var categories = Object.keys(allIncluded);

        // POST to server
        fetch('/api/custom-config/' + sessionId, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(config),
        })
        .then(function () {
            var params = new URLSearchParams();
            params.set('session', sessionId);
            params.set('mode', 'custom');
            if (categories.length > 0) {
                params.set('categories', categories.join(','));
            }
            window.location.href = '/standalone/runner.html?' + params.toString();
        })
        .catch(function (err) {
            showToast('Error saving config: ' + err.message, 'danger');
        });
    }

    // ---- WebSocket ----

    function connectWebSocket() {
        var protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
        ws = new WebSocket(protocol + '//' + location.host + '/ws');

        ws.onopen = function () {
            ws.send(JSON.stringify({ type: 'tv', sessionId: sessionId }));
        };

        ws.onmessage = function (event) {
            var msg;
            try { msg = JSON.parse(event.data); } catch (e) { return; }

            switch (msg.action) {
                case 'remote-connected':
                    statusDot.className = 'status-dot status-connected';
                    statusText.textContent = 'Remote device connected';
                    showToast('Remote device connected', 'success');
                    break;

                case 'configure':
                    if (msg.data && msg.data.streams) {
                        streamConfigSelect.value = msg.data.streams;
                        selectedStreamConfig = msg.data.streams;
                        loadPresetConfig(msg.data.streams);
                    }
                    showToast('Configuration received from remote', 'info');
                    break;

                case 'start':
                    if (msg.data && msg.data.streams) {
                        selectedStreamConfig = msg.data.streams;
                        loadPresetConfig(msg.data.streams);
                    }
                    if (customConfig.length > 0) {
                        startTests();
                    }
                    break;
            }
        };

        ws.onclose = function () {
            setTimeout(connectWebSocket, 3000);
        };
    }

    // ---- QR Code ----

    function generateQRCode() {
        fetch('/api/server-info')
            .then(function (r) {
                if (!r.ok) { throw new Error('HTTP ' + r.status); }
                return r.json();
            })
            .then(function (info) {
                var qrHost;
                if (info.interfaces && info.interfaces.length > 0) {
                    qrHost = info.interfaces[0] + ':' + info.port;
                } else {
                    qrHost = location.host;
                }
                var remoteUrl = location.protocol + '//' + qrHost + '/standalone/remote.html?session=' + sessionId;
                renderQRCode(remoteUrl);
            })
            .catch(function () {
                var remoteUrl = location.protocol + '//' + location.host + '/standalone/remote.html?session=' + sessionId;
                renderQRCode(remoteUrl);
            });
    }

    function renderQRCode(remoteUrl) {
        qrUrlDiv.textContent = remoteUrl;

        if (typeof qrcode !== 'undefined') {
            var qr = qrcode(0, 'M');
            qr.addData(remoteUrl);
            qr.make();

            var cellSize = 4;
            var margin = 8;
            var size = qr.getModuleCount() * cellSize + margin * 2;

            qrCanvas.width = size;
            qrCanvas.height = size;

            var ctx = qrCanvas.getContext('2d');
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, size, size);
            ctx.fillStyle = '#000000';

            for (var row = 0; row < qr.getModuleCount(); row++) {
                for (var col = 0; col < qr.getModuleCount(); col++) {
                    if (qr.isDark(row, col)) {
                        ctx.fillRect(col * cellSize + margin, row * cellSize + margin, cellSize, cellSize);
                    }
                }
            }
        } else {
            qrCanvas.style.display = 'none';
        }
    }

    // ---- Toast ----

    function showToast(message, type) {
        var el = document.createElement('div');
        el.className = 'copy-notification alert alert-' + (type || 'info') + ' py-2 px-3';
        el.style.fontSize = '0.8rem';
        el.innerHTML = '<i class="bi bi-check-circle"></i> ' + message;
        toastContainer.appendChild(el);
        el.addEventListener('animationend', function () {
            el.remove();
        });
    }

})();
