const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

// Runs in the worktree being committed, so it lints that worktree.
const preCommitHook = `#!/bin/sh

npm run lint
`;

let hooksDir;
try {
    // Resolves to the shared hooks directory from the main checkout as well as from any linked
    // worktree, and honours core.hooksPath.
    hooksDir = execFileSync('git', ['rev-parse', '--git-path', 'hooks'], { cwd: __dirname, encoding: 'utf8' }).trim();
} catch (e) {
    // Not a git checkout (e.g. installed from a tarball): nothing to install.
    process.exit(0);
}
hooksDir = path.resolve(__dirname, hooksDir);

fs.mkdirSync(hooksDir, { recursive: true });
fs.writeFileSync(path.join(hooksDir, 'pre-commit'), preCommitHook, { mode: 0o755 });
// Left behind by earlier versions of this script.
fs.rmSync(path.join(hooksDir, 'pre-commit.cjs'), { force: true });
console.log(`${path.join(hooksDir, 'pre-commit')} created.`);
