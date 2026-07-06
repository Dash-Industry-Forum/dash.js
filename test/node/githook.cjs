const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const projectRoot = path.resolve(__dirname, '..', '..');
const sourceHookScript = path.join(projectRoot, 'githook.cjs');
const expectedHookContent = '#!/bin/sh\nnpm run lint\n';

function run(command, args, cwd) {
    return execFileSync(command, args, {
        cwd,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe']
    }).trim();
}

function runNodeGithook(cwd) {
    execFileSync(process.execPath, ['githook.cjs'], {
        cwd,
        stdio: ['ignore', 'pipe', 'pipe']
    });
}

function getPreCommitPath(cwd) {
    const gitPath = run('git', ['rev-parse', '--git-path', 'hooks/pre-commit'], cwd);
    return path.resolve(cwd, gitPath);
}

function assertPreCommitHook(cwd) {
    const preCommitPath = getPreCommitPath(cwd);
    assert.strictEqual(fs.readFileSync(preCommitPath, 'utf8'), expectedHookContent);
    assert.strictEqual((fs.statSync(preCommitPath).mode & 0o777), 0o755);
}

function setupRepo(tmpDir) {
    const repoPath = path.join(tmpDir, 'repo');
    fs.mkdirSync(repoPath);
    fs.copyFileSync(sourceHookScript, path.join(repoPath, 'githook.cjs'));
    run('git', ['init'], repoPath);
    run('git', ['config', 'user.email', 'test@example.com'], repoPath);
    run('git', ['config', 'user.name', 'Test User'], repoPath);
    run('git', ['add', 'githook.cjs'], repoPath);
    run('git', ['-c', 'core.hooksPath=/dev/null', 'commit', '--no-gpg-sign', '-m', 'init'], repoPath);
    return repoPath;
}

function main() {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dashjs-githook-'));

    try {
        const repoPath = setupRepo(tmpDir);

        runNodeGithook(repoPath);
        assertPreCommitHook(repoPath);

        const worktreePath = path.join(tmpDir, 'worktree');
        run('git', ['worktree', 'add', worktreePath, 'HEAD'], repoPath);
        fs.rmSync(getPreCommitPath(worktreePath));

        runNodeGithook(worktreePath);
        assertPreCommitHook(worktreePath);
    } finally {
        fs.rmSync(tmpDir, { recursive: true, force: true });
    }
}

main();
