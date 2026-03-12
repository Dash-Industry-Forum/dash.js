/**
 * Database module for the standalone functional test runner.
 *
 * Uses better-sqlite3 (synchronous SQLite) to persist:
 *   - Test runs and individual test results
 *   - Device registrations with heartbeat tracking
 *
 * Gracefully degrades if better-sqlite3 is unavailable — all methods
 * become no-ops or return empty data, and the server continues to work
 * with file-based result storage only.
 */

import path from 'path';
import fs from 'fs';

const HEARTBEAT_TIMEOUT_MS = 90_000; // 90 seconds

let Database;
try {
    Database = (await import('better-sqlite3')).default;
} catch {
    Database = null;
}

let db = null;
let available = false;

// ---------------------------------------------------------------------------
// Initialisation
// ---------------------------------------------------------------------------

/**
 * Initialise the database. Creates the data directory and tables if needed.
 * Returns true if the database is available, false otherwise.
 *
 * @param {string} dataDir  Absolute path to the data directory
 * @returns {boolean}
 */
function init(dataDir) {
    if (!Database) {
        console.warn('[db] better-sqlite3 not available — dashboard features disabled');
        return false;
    }

    try {
        fs.mkdirSync(dataDir, { recursive: true });
        const dbPath = path.join(dataDir, 'dashjs-tests.db');
        db = new Database(dbPath);

        // WAL mode for better concurrent read/write performance
        db.pragma('journal_mode = WAL');
        db.pragma('foreign_keys = ON');

        createTables();
        available = true;
        console.log(`[db] Database ready at ${dbPath}`);
        return true;
    } catch (err) {
        console.warn('[db] Failed to initialise database:', err.message);
        return false;
    }
}

function createTables() {
    db.exec(`
        CREATE TABLE IF NOT EXISTS devices (
            device_id   TEXT PRIMARY KEY,
            name        TEXT NOT NULL DEFAULT '',
            user_agent  TEXT NOT NULL DEFAULT '',
            status      TEXT NOT NULL DEFAULT 'offline',
            last_seen   INTEGER NOT NULL DEFAULT 0,
            created_at  INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000)
        );

        CREATE TABLE IF NOT EXISTS test_runs (
            id              INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id      TEXT NOT NULL,
            device_id       TEXT,
            config_json     TEXT,
            status          TEXT NOT NULL DEFAULT 'running',
            started_at      INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000),
            completed_at    INTEGER,
            passes          INTEGER NOT NULL DEFAULT 0,
            failures        INTEGER NOT NULL DEFAULT 0,
            pending         INTEGER NOT NULL DEFAULT 0,
            total           INTEGER NOT NULL DEFAULT 0,
            duration        INTEGER NOT NULL DEFAULT 0,
            FOREIGN KEY (device_id) REFERENCES devices(device_id) ON DELETE SET NULL
        );

        CREATE TABLE IF NOT EXISTS test_results (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            run_id      INTEGER NOT NULL,
            title       TEXT NOT NULL,
            full_title  TEXT NOT NULL DEFAULT '',
            suite       TEXT NOT NULL DEFAULT '',
            status      TEXT NOT NULL,
            duration    INTEGER NOT NULL DEFAULT 0,
            error       TEXT,
            FOREIGN KEY (run_id) REFERENCES test_runs(id) ON DELETE CASCADE
        );

        CREATE INDEX IF NOT EXISTS idx_test_results_run_id ON test_results(run_id);
        CREATE INDEX IF NOT EXISTS idx_test_runs_session_id ON test_runs(session_id);
        CREATE INDEX IF NOT EXISTS idx_test_runs_device_id ON test_runs(device_id);
        CREATE INDEX IF NOT EXISTS idx_test_runs_started_at ON test_runs(started_at);
    `);
}

/**
 * Whether the database is available.
 */
function isAvailable() {
    return available;
}

// ---------------------------------------------------------------------------
// Devices
// ---------------------------------------------------------------------------

/**
 * Insert or update a device record. Sets status to 'online' and refreshes
 * last_seen.
 */
function upsertDevice(deviceId, name, userAgent) {
    if (!available) return;
    const now = Date.now();
    const stmt = db.prepare(`
        INSERT INTO devices (device_id, name, user_agent, status, last_seen)
        VALUES (?, ?, ?, 'online', ?)
        ON CONFLICT(device_id) DO UPDATE SET
            name       = excluded.name,
            user_agent = excluded.user_agent,
            status     = 'online',
            last_seen  = excluded.last_seen
    `);
    stmt.run(deviceId, name || '', userAgent || '', now);
}

/**
 * Mark a device as offline.
 */
function setDeviceOffline(deviceId) {
    if (!available) return;
    db.prepare('UPDATE devices SET status = ? WHERE device_id = ?')
        .run('offline', deviceId);
}

/**
 * Update the heartbeat timestamp for a device.
 */
function updateDeviceHeartbeat(deviceId) {
    if (!available) return;
    const now = Date.now();
    db.prepare('UPDATE devices SET last_seen = ?, status = ? WHERE device_id = ?')
        .run(now, 'online', deviceId);
}

/**
 * Get all devices with computed online/offline status and run count.
 */
function getDevices() {
    if (!available) return [];
    const now = Date.now();
    const rows = db.prepare(`
        SELECT d.*,
               COUNT(r.id) AS run_count
        FROM devices d
        LEFT JOIN test_runs r ON r.device_id = d.device_id
        GROUP BY d.device_id
        ORDER BY d.last_seen DESC
    `).all();

    return rows.map((row) => ({
        deviceId: row.device_id,
        name: row.name,
        userAgent: row.user_agent,
        status: (now - row.last_seen) <= HEARTBEAT_TIMEOUT_MS ? 'online' : 'offline',
        lastSeen: row.last_seen,
        createdAt: row.created_at,
        runCount: row.run_count,
    }));
}

// ---------------------------------------------------------------------------
// Test Runs
// ---------------------------------------------------------------------------

/**
 * Insert a new test run. Returns the run ID.
 */
function insertRun(sessionId, deviceId, configJson, status) {
    if (!available) return null;
    const result = db.prepare(`
        INSERT INTO test_runs (session_id, device_id, config_json, status, started_at)
        VALUES (?, ?, ?, ?, ?)
    `).run(sessionId, deviceId || null, configJson || null, status || 'running', Date.now());
    return result.lastInsertRowid;
}

/**
 * Complete a run — update summary counts and status.
 */
function completeRun(runId, summary) {
    if (!available || !runId) return;
    db.prepare(`
        UPDATE test_runs
        SET status       = 'completed',
            completed_at = ?,
            passes       = ?,
            failures     = ?,
            pending      = ?,
            total        = ?,
            duration     = ?
        WHERE id = ?
    `).run(
        Date.now(),
        summary.passes || 0,
        summary.failures || 0,
        summary.pending || 0,
        summary.total || 0,
        summary.duration || 0,
        runId
    );
}

/**
 * Update run status (e.g. dispatched → running).
 */
function updateRunStatus(runId, status) {
    if (!available || !runId) return;
    db.prepare('UPDATE test_runs SET status = ? WHERE id = ?').run(status, runId);
}

/**
 * Get runs with pagination and optional filters.
 *
 * @param {Object} opts
 * @param {number} opts.page      Page number (1-based)
 * @param {number} opts.limit     Items per page
 * @param {string} [opts.deviceId]  Filter by device
 * @param {string} [opts.from]      ISO date string (start)
 * @param {string} [opts.to]        ISO date string (end)
 * @param {string} [opts.status]    Filter by run status
 * @returns {{ runs: Array, total: number, page: number, limit: number }}
 */
function getRuns(opts) {
    if (!available) return { runs: [], total: 0, page: 1, limit: 20 };

    const page = Math.max(1, opts.page || 1);
    const limit = Math.min(100, Math.max(1, opts.limit || 20));
    const offset = (page - 1) * limit;

    const conditions = [];
    const params = [];

    if (opts.deviceId) {
        conditions.push('r.device_id = ?');
        params.push(opts.deviceId);
    }
    if (opts.from) {
        conditions.push('r.started_at >= ?');
        params.push(new Date(opts.from).getTime());
    }
    if (opts.to) {
        conditions.push('r.started_at <= ?');
        params.push(new Date(opts.to).getTime());
    }
    if (opts.status) {
        if (opts.status === 'failed') {
            conditions.push('r.failures > 0');
        } else if (opts.status === 'passed') {
            conditions.push('r.failures = 0 AND r.status = ?');
            params.push('completed');
        } else {
            conditions.push('r.status = ?');
            params.push(opts.status);
        }
    }

    const where = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

    const total = db.prepare(`SELECT COUNT(*) AS cnt FROM test_runs r ${where}`).get(...params).cnt;

    const runs = db.prepare(`
        SELECT r.*, d.name AS device_name
        FROM test_runs r
        LEFT JOIN devices d ON d.device_id = r.device_id
        ${where}
        ORDER BY r.started_at DESC
        LIMIT ? OFFSET ?
    `).all(...params, limit, offset);

    return {
        runs: runs.map(formatRun),
        total,
        page,
        limit,
    };
}

/**
 * Get a single run by ID with all its test results.
 */
function getRunById(runId) {
    if (!available) return null;
    const row = db.prepare(`
        SELECT r.*, d.name AS device_name
        FROM test_runs r
        LEFT JOIN devices d ON d.device_id = r.device_id
        WHERE r.id = ?
    `).get(runId);

    if (!row) return null;

    const results = db.prepare(`
        SELECT * FROM test_results WHERE run_id = ? ORDER BY id
    `).all(runId);

    return {
        ...formatRun(row),
        results: results.map((r) => ({
            id: r.id,
            title: r.title,
            fullTitle: r.full_title,
            suite: r.suite,
            status: r.status,
            duration: r.duration,
            error: r.error || undefined,
        })),
    };
}

/**
 * Find a run ID by session ID (the most recent running/dispatched run).
 */
function findRunBySession(sessionId) {
    if (!available) return null;
    const row = db.prepare(`
        SELECT id FROM test_runs
        WHERE session_id = ? AND status IN ('running', 'dispatched')
        ORDER BY started_at DESC
        LIMIT 1
    `).get(sessionId);
    return row ? row.id : null;
}

function formatRun(row) {
    return {
        id: row.id,
        sessionId: row.session_id,
        deviceId: row.device_id,
        deviceName: row.device_name || null,
        configJson: row.config_json,
        status: row.status,
        startedAt: row.started_at,
        completedAt: row.completed_at,
        passes: row.passes,
        failures: row.failures,
        pending: row.pending,
        total: row.total,
        duration: row.duration,
    };
}

// ---------------------------------------------------------------------------
// Test Results
// ---------------------------------------------------------------------------

/**
 * Insert an individual test result.
 */
function insertResult(runId, resultData) {
    if (!available || !runId) return;
    db.prepare(`
        INSERT INTO test_results (run_id, title, full_title, suite, status, duration, error)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
        runId,
        resultData.title || '',
        resultData.fullTitle || '',
        resultData.suite || '',
        resultData.status || 'unknown',
        resultData.duration || 0,
        resultData.error || null
    );
}

// ---------------------------------------------------------------------------
// Deletion
// ---------------------------------------------------------------------------

/**
 * Delete a test run and its associated results (via CASCADE).
 * Returns true if the run existed and was deleted.
 */
function deleteRun(runId) {
    if (!available || !runId) return false;
    const result = db.prepare('DELETE FROM test_runs WHERE id = ?').run(runId);
    return result.changes > 0;
}

// ---------------------------------------------------------------------------
// Comparison
// ---------------------------------------------------------------------------

/**
 * Compare two runs side-by-side, matching results by fullTitle.
 */
function compareRuns(runId1, runId2) {
    if (!available) return null;

    const run1 = getRunById(runId1);
    const run2 = getRunById(runId2);
    if (!run1 || !run2) return null;

    // Index results by fullTitle
    const map1 = {};
    for (const r of run1.results) { map1[r.fullTitle] = r; }
    const map2 = {};
    for (const r of run2.results) { map2[r.fullTitle] = r; }

    // Merge all unique fullTitles preserving order from run1 then run2
    const allTitles = [];
    const seen = new Set();
    for (const r of run1.results) {
        if (!seen.has(r.fullTitle)) { allTitles.push(r.fullTitle); seen.add(r.fullTitle); }
    }
    for (const r of run2.results) {
        if (!seen.has(r.fullTitle)) { allTitles.push(r.fullTitle); seen.add(r.fullTitle); }
    }

    const comparison = allTitles.map((title) => ({
        fullTitle: title,
        title: (map1[title] || map2[title]).title,
        suite: (map1[title] || map2[title]).suite,
        run1Status: map1[title] ? map1[title].status : null,
        run2Status: map2[title] ? map2[title].status : null,
        run1Duration: map1[title] ? map1[title].duration : null,
        run2Duration: map2[title] ? map2[title].duration : null,
        run1Error: map1[title] ? map1[title].error : undefined,
        run2Error: map2[title] ? map2[title].error : undefined,
    }));

    return {
        run1: { ...run1, results: undefined },
        run2: { ...run2, results: undefined },
        comparison,
    };
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

export default {
    init,
    isAvailable,
    // Devices
    upsertDevice,
    setDeviceOffline,
    updateDeviceHeartbeat,
    getDevices,
    // Runs
    insertRun,
    completeRun,
    updateRunStatus,
    getRuns,
    getRunById,
    findRunBySession,
    // Results
    insertResult,
    // Deletion
    deleteRun,
    // Comparison
    compareRuns,
};
