/**
 * Landing page logic for the standalone test runner.
 *
 * - Theme persistence (localStorage 'rp-theme')
 * - Loads stream configs and test categories from the server
 * - Renders testvector details for the selected config
 * - Options panel toggle (test category cards)
 * - QR code for remote device pairing
 * - WebSocket for remote control
 */

(function () {
    'use strict';

    // ---- State ----
    var sessionId = generateSessionId();
    var ws = null;
    var selectedStreamConfig = '';

    // ---- DOM elements ----
    var themeSelect = document.getElementById('theme-select');
    var streamConfigSelect = document.getElementById('stream-config');
    var btnOptions = document.getElementById('btn-options');
    var optionsPanel = document.getElementById('options-panel');
    var optionsScroll = document.getElementById('options-scroll');
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
    loadTestCategories();
    connectWebSocket();
    generateQRCode();

    // ---- Event listeners ----
    themeSelect.addEventListener('change', function () {
        applyTheme(this.value);
    });

    streamConfigSelect.addEventListener('change', function () {
        selectedStreamConfig = this.value;
        btnStart.disabled = !selectedStreamConfig;
        loadTestvectorDetails(selectedStreamConfig);
    });

    btnOptions.addEventListener('click', function () {
        optionsPanel.classList.toggle('collapsed');
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
            .then(function (r) { return r.json(); })
            .then(function (configs) {
                streamConfigSelect.innerHTML = '<option value="">Select a stream configuration...</option>';
                configs.forEach(function (name) {
                    var opt = document.createElement('option');
                    opt.value = name;
                    opt.textContent = name;
                    streamConfigSelect.appendChild(opt);
                });
            })
            .catch(function () {
                streamConfigSelect.innerHTML = '<option value="">Error loading configs</option>';
            });
    }

    function loadTestCategories() {
        fetch('/api/test-categories')
            .then(function (r) { return r.json(); })
            .then(function (categories) {
                optionsScroll.innerHTML = '';
                categories.forEach(function (cat) {
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

                    check.appendChild(cb);
                    check.appendChild(label);
                    optionsScroll.appendChild(check);
                });
            })
            .catch(function () {
                // Silently fail
            });
    }

    function loadTestvectorDetails(name) {
        if (!name) {
            testvectorList.innerHTML = '<div class="empty-state"><i class="bi bi-collection-play"></i>Select a stream configuration above to see available testvectors.</div>';
            testvectorCount.textContent = '';
            return;
        }

        fetch('/api/stream-config/' + encodeURIComponent(name))
            .then(function (r) { return r.json(); })
            .then(function (config) {
                var vectors = config.testvectors || [];
                testvectorCount.textContent = vectors.length + ' stream' + (vectors.length !== 1 ? 's' : '');

                if (vectors.length === 0) {
                    testvectorList.innerHTML = '<div class="empty-state"><i class="bi bi-exclamation-circle"></i>No testvectors in this configuration.</div>';
                    return;
                }

                testvectorList.innerHTML = '';
                vectors.forEach(function (tv) {
                    var item = document.createElement('div');
                    item.className = 'stream-item';

                    var nameSpan = document.createElement('span');
                    nameSpan.className = 'stream-name';
                    nameSpan.textContent = tv.name;
                    nameSpan.title = tv.url;
                    item.appendChild(nameSpan);

                    // Type tag
                    var typeTag = document.createElement('span');
                    typeTag.className = 'stream-tag ' + (tv.type === 'live' ? 'stream-tag-live' : 'stream-tag-vod');
                    typeTag.textContent = tv.type === 'live' ? 'LIVE' : 'VOD';
                    item.appendChild(typeTag);

                    // DRM tag
                    if (tv.drm) {
                        var drmTag = document.createElement('span');
                        drmTag.className = 'stream-tag stream-tag-drm';
                        drmTag.textContent = 'DRM';
                        item.appendChild(drmTag);
                    }

                    // MSS detection: URL contains .ism and does NOT end with .mpd
                    if (tv.url && tv.url.indexOf('.ism') >= 0 && !tv.url.match(/\.mpd(\?|$)/i)) {
                        var mssTag = document.createElement('span');
                        mssTag.className = 'stream-tag stream-tag-mss';
                        mssTag.textContent = 'MSS';
                        item.appendChild(mssTag);
                    }

                    testvectorList.appendChild(item);
                });
            })
            .catch(function () {
                testvectorList.innerHTML = '<div class="empty-state"><i class="bi bi-exclamation-triangle"></i>Error loading configuration.</div>';
                testvectorCount.textContent = '';
            });
    }

    // ---- Start tests ----

    function startTests() {
        var categories = getSelectedCategories();
        var params = new URLSearchParams();
        params.set('session', sessionId);
        params.set('streams', selectedStreamConfig);
        if (categories.length > 0) {
            params.set('categories', categories.join(','));
        }
        window.location.href = '/standalone/runner.html?' + params.toString();
    }

    function getSelectedCategories() {
        var categories = [];
        var checkboxes = optionsScroll.querySelectorAll('input[type="checkbox"]');
        checkboxes.forEach(function (cb) {
            if (cb.checked) {
                categories.push(cb.value);
            }
        });
        return categories;
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
                        btnStart.disabled = false;
                        loadTestvectorDetails(msg.data.streams);
                    }
                    if (msg.data && msg.data.categories) {
                        var cats = msg.data.categories;
                        var checkboxes = optionsScroll.querySelectorAll('input[type="checkbox"]');
                        checkboxes.forEach(function (cb) {
                            cb.checked = cats.indexOf(cb.value) >= 0;
                        });
                    }
                    showToast('Configuration received from remote', 'info');
                    break;

                case 'start':
                    if (msg.data && msg.data.streams) {
                        selectedStreamConfig = msg.data.streams;
                    }
                    if (selectedStreamConfig) {
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
            .then(function (r) { return r.json(); })
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
