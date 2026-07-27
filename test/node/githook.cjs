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

function runNodeGithook(cwd, env) {
    execFileSync(process.execPath, ['githook.cjs'], {
        cwd,
        env: { ...process.env, ...env },
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

function assertHookRunsOnCommit(cwd) {
    const marker = path.join(cwd, '.lint-ran');
    fs.rmSync(marker, { force: true });
    fs.writeFileSync(path.join(cwd, 'trigger.txt'), '');
    run('git', ['add', '-A'], cwd);

    // Point core.hooksPath at the generated hook so the commit fires it
    // regardless of any global hooksPath the contributor may have configured.
    const hooksDir = path.dirname(getPreCommitPath(cwd));
    run('git', ['-c', `core.hooksPath=${hooksDir}`, 'commit', '--no-gpg-sign', '-m', 'trigger pre-commit'], cwd);

    assert.ok(fs.existsSync(marker),
        'git commit did not run the generated pre-commit hook in the working tree');
}

function assertSkippedOutsideGitRepo(tmpDir) {
    const nonRepoPath = path.join(tmpDir, 'not-a-repo');
    fs.mkdirSync(nonRepoPath);
    fs.copyFileSync(sourceHookScript, path.join(nonRepoPath, 'githook.cjs'));

    // GIT_CEILING_DIRECTORIES stops git's upward repo search at tmpDir, so the
    // result does not depend on whether os.tmpdir() happens to sit in a repo.
    runNodeGithook(nonRepoPath, { GIT_CEILING_DIRECTORIES: fs.realpathSync(tmpDir) });

    assert.ok(!fs.existsSync(path.join(nonRepoPath, '.git')),
        'githook.cjs must not create a .git directory outside a repository');
}

function setupRepo(tmpDir) {
    const repoPath = path.join(tmpDir, 'repo');
    fs.mkdirSync(repoPath);
    fs.copyFileSync(sourceHookScript, path.join(repoPath, 'githook.cjs'));
    // A dependency-free `lint` script the generated hook can run; it drops a
    // marker so a commit can prove the hook actually fired.
    fs.writeFileSync(path.join(repoPath, 'package.json'),
        JSON.stringify({ name: 'githook-fixture', scripts: { lint: 'node lint-marker.cjs' } }));
    fs.writeFileSync(path.join(repoPath, 'lint-marker.cjs'),
        "require('fs').writeFileSync('.lint-ran', '');\n");
    run('git', ['init'], repoPath);
    run('git', ['config', 'user.email', 'test@example.com'], repoPath);
    run('git', ['config', 'user.name', 'Test User'], repoPath);
    run('git', ['add', '-A'], repoPath);
    // os.devNull neutralises any global core.hooksPath during setup, portably.
    run('git', ['-c', `core.hooksPath=${os.devNull}`, 'commit', '--no-gpg-sign', '-m', 'init'], repoPath);
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
        assertHookRunsOnCommit(worktreePath);

        assertSkippedOutsideGitRepo(tmpDir);
    } finally {
        fs.rmSync(tmpDir, { recursive: true, force: true });
    }
}

main();
