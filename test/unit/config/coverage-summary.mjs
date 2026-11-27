/**
 * The copyright in this software is being made available under the BSD License,
 * included below. This software may be subject to other third party and contributor
 * rights, including patent rights, and no such rights are granted under this license.
 *
 * Copyright (c) 2013, Dash Industry Forum.
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without modification,
 * are permitted provided that the following conditions are met:
 *  * Redistributions of source code must retain the above copyright notice, this
 *  list of conditions and the following disclaimer.
 *  * Redistributions in binary form must reproduce the above copyright notice,
 *  this list of conditions and the following disclaimer in the documentation and/or
 *  other materials provided with the distribution.
 *  * Neither the name of Dash Industry Forum nor the names of its
 *  contributors may be used to endorse or promote products derived from this software
 *  without specific prior written permission.
 *
 *  THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS AS IS AND ANY
 *  EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 *  WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED.
 *  IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT,
 *  INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT
 *  NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
 *  PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY,
 *  WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
 *  ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
 *  POSSIBILITY OF SUCH DAMAGE.
 */

/**
 * Turns the unit test coverage report (npm run test:coverage) into a Markdown summary:
 * overall totals, coverage of the lines changed against a base commit, and the source
 * files no test covers at all. Written to $GITHUB_STEP_SUMMARY when set, to stdout otherwise.
 *
 * Exits with code 0, unless --min-changed=<percent> is given: then it exits with code 1 when
 * less than that share of the changed executable lines is covered, or when the coverage of the
 * changed lines cannot be computed (no or unreadable report, no base ref, git error).
 *
 * Usage: node test/unit/config/coverage-summary.mjs [--min-changed=<percent>] [coverageDir]
 *   COVERAGE_BASE  git ref to diff against. Defaults to HEAD^1 when HEAD is a merge
 *                  commit (what actions/checkout provides on pull_request events).
 */
import { execFileSync } from 'node:child_process';
import { appendFileSync, existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const args = process.argv.slice(2);
const minChangedArg = args.find((arg) => arg.startsWith('--min-changed='));
const MIN_CHANGED_PCT = minChangedArg ? Number(minChangedArg.split('=')[1]) : null;
if (MIN_CHANGED_PCT !== null && !(MIN_CHANGED_PCT >= 0 && MIN_CHANGED_PCT <= 100)) {
    console.error(`Invalid ${minChangedArg}: expected a percentage between 0 and 100`);
    process.exit(2);
}
const COVERAGE_DIR = path.resolve(REPO_ROOT, args.find((arg) => !arg.startsWith('--')) || 'test/unit/results/coverage');

// Set by render(); read by the --min-changed check. changedComputed is only set once the coverage of
// the changed lines is known, so every failure on the way leaves the check failing.
const gate = { changedComputed: false, changedCovered: 0, changedTotal: 0, failure: 'no coverage report found' };
const SOURCE_DIR = 'src';
const MAX_UNCOVERED_RANGES = 12;

function toRepoPath(file) {
    return path.relative(REPO_ROOT, path.resolve(REPO_ROOT, file)).split(path.sep).join('/');
}

function git(args) {
    return execFileSync('git', args, { cwd: REPO_ROOT, encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 });
}

function formatPct(covered, total) {
    return total === 0 ? 'n/a' : `${(covered / total * 100).toFixed(2)}%`;
}

/**
 * @return {Map<string, Map<number, number>>} repo relative file -> (line -> hit count)
 */
function parseLcov(file) {
    const result = new Map();
    let lines = null;

    readFileSync(file, 'utf8').split('\n').forEach((row) => {
        if (row.startsWith('SF:')) {
            lines = new Map();
            result.set(toRepoPath(row.slice(3).trim()), lines);
        } else if (row.startsWith('DA:') && lines) {
            const [line, hits] = row.slice(3).split(',');
            lines.set(Number(line), Number(hits));
        }
    });

    return result;
}

function getBaseRef() {
    if (process.env.COVERAGE_BASE) {
        return process.env.COVERAGE_BASE;
    }
    try {
        git(['rev-parse', '--verify', '--quiet', 'HEAD^2']);
        return 'HEAD^1';
    } catch (e) {
        return null;
    }
}

/**
 * Lines added or modified since the merge base of baseRef and HEAD, so changes that exist only on
 * the base side are not reported.
 *
 * @return {Map<string, {lines: number[]}>} repo relative file -> changed line numbers
 */
function getChangedLines(baseRef) {
    const args = ['diff', '-U0', '--no-color', '--no-ext-diff', '--src-prefix=a/', '--dst-prefix=b/',
        `${baseRef}...HEAD`, '--', SOURCE_DIR];
    const result = new Map();
    let inHeader = false;
    let current = null;
    let nextLine = 0;

    git(args).split('\n').forEach((row) => {
        if (row.startsWith('diff --git ')) {
            inHeader = true;
            current = null;
        } else if (inHeader && row.startsWith('+++ ')) {
            // Only a header line here; in a hunk, "+++ " is an added line that starts with "++ "
            if (row.startsWith('+++ b/') && row.endsWith('.js')) {
                current = { lines: [] };
                result.set(row.slice(6), current);
            }
        } else if (row.startsWith('@@')) {
            inHeader = false;
            const match = /^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/.exec(row);
            nextLine = match ? Number(match[1]) : 0;
        } else if (!inHeader && current && row.startsWith('+')) {
            current.lines.push(nextLine);
            nextLine++;
        }
    });

    return result;
}

function toRanges(lines) {
    const ranges = [];
    lines.forEach((line) => {
        const last = ranges[ranges.length - 1];
        if (last && line === last[1] + 1) {
            last[1] = line;
        } else {
            ranges.push([line, line]);
        }
    });

    const text = ranges.slice(0, MAX_UNCOVERED_RANGES).map(([from, to]) => from === to ? `${from}` : `${from}-${to}`);
    if (ranges.length > MAX_UNCOVERED_RANGES) {
        text.push('…');
    }
    return text.join(', ');
}

function listSourceFiles(dir) {
    return readdirSync(path.join(REPO_ROOT, dir), { withFileTypes: true }).flatMap((entry) => {
        const entryPath = `${dir}/${entry.name}`;
        if (entry.isDirectory()) {
            return listSourceFiles(entryPath);
        }
        return entry.name.endsWith('.js') ? [entryPath] : [];
    });
}

function renderTotals(total) {
    const rows = ['statements', 'branches', 'functions', 'lines'].map((metric) => {
        const { covered, total: count } = total[metric];
        return `| ${metric[0].toUpperCase()}${metric.slice(1)} | ${formatPct(covered, count)} | ${covered} / ${count} |`;
    });

    return ['| Metric | Coverage | Covered / Total |', '| --- | ---: | ---: |', ...rows];
}

function renderPatch(baseRef, lcov) {
    const out = ['', '### Changed lines'];
    const changed = getChangedLines(baseRef);
    const rows = [];
    let executableTotal = 0;
    let coveredTotal = 0;

    [...changed.keys()].sort().forEach((file) => {
        const fileCoverage = lcov.get(file);
        if (!fileCoverage) {
            // The report includes every source file, also the ones no test loads. A file that is
            // missing has no executable code (only declarations, constants or JSDoc).
            return;
        }
        const executable = changed.get(file).lines.filter((line) => fileCoverage.has(line));
        if (executable.length === 0) {
            // Only comments, whitespace or declarations changed
            return;
        }
        const uncovered = executable.filter((line) => fileCoverage.get(line) === 0);
        const covered = executable.length - uncovered.length;
        executableTotal += executable.length;
        coveredTotal += covered;
        rows.push(`| \`${file}\` | ${covered} / ${executable.length} (${formatPct(covered, executable.length)})` +
            ` | ${toRanges(uncovered)} |`);
    });

    gate.changedComputed = true;
    gate.changedCovered = coveredTotal;
    gate.changedTotal = executableTotal;

    if (rows.length === 0) {
        out.push('', `No executable lines changed under \`${SOURCE_DIR}/\`.`);
        return out;
    }

    out.push(
        '',
        `**${coveredTotal} of ${executableTotal}** changed executable lines are covered` +
        ` (${formatPct(coveredTotal, executableTotal)}).`,
        '',
        '| File | Changed lines covered | Uncovered changed lines |',
        '| --- | ---: | --- |',
        ...rows
    );
    return out;
}

function renderUnloaded(summary) {
    const sources = listSourceFiles(SOURCE_DIR);
    // The report includes every source file, so a file without a single covered line is one no test loads
    const unloaded = Object.entries(summary)
        .filter(([key, value]) => key !== 'total' && value.lines.total > 0 && value.lines.covered === 0)
        .map(([key]) => toRepoPath(key))
        .sort();

    if (unloaded.length === 0) {
        return [];
    }
    return [
        '',
        '<details>',
        `<summary>${unloaded.length} of ${sources.length} source files have no covered line` +
        ' (no unit test loads them)</summary>',
        '',
        ...unloaded.map((file) => `- \`${file}\``),
        '',
        '</details>'
    ];
}

function render() {
    const summaryFile = path.join(COVERAGE_DIR, 'coverage-summary.json');
    const lcovFile = path.join(COVERAGE_DIR, 'lcov.info');
    const out = ['## Unit test coverage', ''];

    if (!existsSync(summaryFile) || !existsSync(lcovFile)) {
        out.push(`No coverage report found in \`${toRepoPath(COVERAGE_DIR)}\`. The unit tests probably did not complete.`);
        return out;
    }

    const summary = JSON.parse(readFileSync(summaryFile, 'utf8'));
    out.push(...renderTotals(summary.total));

    const baseRef = getBaseRef();
    if (baseRef) {
        try {
            out.push(...renderPatch(baseRef, parseLcov(lcovFile)));
        } catch (e) {
            gate.failure = `coverage of changed lines is unavailable: ${String(e.message).split('\n')[0]}`;
            out.push('', `Coverage of changed lines is unavailable: ${String(e.message).split('\n')[0]}`);
        }
    } else {
        gate.failure = 'no base ref to diff against (HEAD is not a merge commit and COVERAGE_BASE is not set)';
    }

    out.push(...renderUnloaded(summary));
    return out;
}

let markdown;
try {
    markdown = render().join('\n');
} catch (e) {
    markdown = `## Unit test coverage\n\nFailed to create the coverage summary: ${String(e.message).split('\n')[0]}`;
    gate.changedComputed = false;
    gate.failure = `failed to create the coverage summary: ${String(e.message).split('\n')[0]}`;
}

if (process.env.GITHUB_STEP_SUMMARY) {
    appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${markdown}\n`);
} else {
    console.log(markdown);
}

function checkChangedLines() {
    if (!gate.changedComputed) {
        return gate.failure;
    }
    if (gate.changedTotal === 0) {
        return null;
    }
    const pct = (gate.changedCovered / gate.changedTotal) * 100;
    if (pct < MIN_CHANGED_PCT) {
        return `${gate.changedCovered} of ${gate.changedTotal} changed executable lines are covered ` +
            `(${pct.toFixed(2)}%), at least ${MIN_CHANGED_PCT}% are required`;
    }
    return null;
}

if (MIN_CHANGED_PCT !== null) {
    const failure = checkChangedLines();
    if (failure) {
        console.error(`Changed lines coverage check failed: ${failure}`);
        process.exitCode = 1;
    }
}
